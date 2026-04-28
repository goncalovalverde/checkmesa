import { prisma } from "@/lib/prisma";
import { calculateVat } from "@/lib/vat";
import type { Category, VatRate } from "@prisma/client";

// ── Domain errors ──────────────────────────────────────────────────────────

export class CategoryNotFoundError extends Error {
  constructor(message = "Categoria não encontrada") { super(message); this.name = "CategoryNotFoundError"; }
}

export class TargetCategoryNotFoundError extends Error {
  constructor() { super("Categoria de destino não encontrada"); this.name = "TargetCategoryNotFoundError"; }
}

export class VatRateNotFoundError extends Error {
  constructor() { super("Taxa IVA não encontrada"); this.name = "VatRateNotFoundError"; }
}

export class CategoryInUseError extends Error {
  constructor(public readonly count: number) {
    super(`Categoria em uso por ${count} produto${count > 1 ? "s" : ""}`);
    this.name = "CategoryInUseError";
  }
}

export class CategoryNameDuplicateError extends Error {
  constructor() { super("Nome de categoria já existe"); this.name = "CategoryNameDuplicateError"; }
}

export class CategorySelfReassignError extends Error {
  constructor() { super("Categoria de destino não pode ser a mesma"); this.name = "CategorySelfReassignError"; }
}

// ── Types ──────────────────────────────────────────────────────────────────

export type CategoryWithMeta = Category & { vatRate: VatRate; productCount: number };

// ── Service functions ──────────────────────────────────────────────────────

export async function updateCategory(
  id: string,
  data: { name?: string; vatRateId?: string }
): Promise<CategoryWithMeta> {
  const existing = await prisma.category.findUnique({ where: { id }, select: { vatRateId: true } });
  if (!existing) throw new CategoryNotFoundError();

  const update: Record<string, unknown> = {};
  if (data.name !== undefined) update.name = data.name;

  const vatRateChanged = data.vatRateId !== undefined && data.vatRateId !== existing.vatRateId;

  if (vatRateChanged) {
    const newVatRate = await prisma.vatRate.findUnique({ where: { id: data.vatRateId }, select: { rate: true } });
    if (!newVatRate) throw new VatRateNotFoundError();
    update.vatRateId = data.vatRateId;

    const activeProducts = await prisma.product.findMany({
      where: { categoryId: id, active: true },
      select: { id: true, finalPrice: true },
    });

    await prisma.$transaction([
      prisma.category.update({ where: { id }, data: update }),
      ...activeProducts.map((p) =>
        prisma.product.update({ where: { id: p.id }, data: calculateVat(p.finalPrice, newVatRate.rate) })
      ),
    ]);
  } else {
    if (data.vatRateId !== undefined) update.vatRateId = data.vatRateId;
    try {
      await prisma.category.update({ where: { id }, data: update });
    } catch {
      throw new CategoryNameDuplicateError();
    }
  }

  const category = await prisma.category.findUniqueOrThrow({
    where: { id },
    include: { vatRate: true, _count: { select: { products: true } } },
  });
  const { _count, ...rest } = category;
  return { ...rest, productCount: _count.products };
}

export async function deleteCategory(id: string, reassignTo?: string): Promise<void> {
  if (reassignTo && reassignTo === id) throw new CategorySelfReassignError();

  const productCount = await prisma.product.count({ where: { categoryId: id } });

  if (productCount > 0 && !reassignTo) throw new CategoryInUseError(productCount);

  if (productCount > 0 && reassignTo) {
    const target = await prisma.category.findUnique({ where: { id: reassignTo }, select: { id: true } });
    if (!target) throw new TargetCategoryNotFoundError();

    await prisma.$transaction([
      prisma.product.updateMany({ where: { categoryId: id }, data: { categoryId: reassignTo } }),
      prisma.category.delete({ where: { id } }),
    ]);
  } else {
    try {
      await prisma.category.delete({ where: { id } });
    } catch {
      throw new CategoryNotFoundError();
    }
  }
}
