import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateVat } from "@/lib/vat";
import { PatchCategorySchema, validationError } from "@/lib/schemas";
import { requireRole } from "@/lib/auth-guard";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const parsed = PatchCategorySchema.safeParse(await req.json());
  if (!parsed.success) return validationError(parsed.error);
  const { name, vatRateId } = parsed.data;
  if (name === undefined && vatRateId === undefined) {
    return NextResponse.json({ error: "Nenhum campo para atualizar" }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name;

  if (vatRateId !== undefined) {
    const vatRate = await prisma.vatRate.findUnique({ where: { id: vatRateId }, select: { id: true, rate: true } });
    if (!vatRate) return NextResponse.json({ error: "Taxa IVA não encontrada" }, { status: 404 });
    updateData.vatRateId = vatRateId;
  }

  try {
    const existing = await prisma.category.findUnique({ where: { id }, select: { vatRateId: true } });
    if (!existing) return NextResponse.json({ error: "Categoria não encontrada" }, { status: 404 });

    const vatRateChanged = vatRateId !== undefined && vatRateId !== existing.vatRateId;

    if (vatRateChanged) {
      const newVatRate = await prisma.vatRate.findUnique({ where: { id: vatRateId }, select: { rate: true } });
      if (!newVatRate) return NextResponse.json({ error: "Taxa IVA não encontrada" }, { status: 404 });

      // Bulk recalculate all active products in this category with the new rate
      const activeProducts = await prisma.product.findMany({
        where: { categoryId: id, active: true },
        select: { id: true, finalPrice: true },
      });

      await prisma.$transaction([
        prisma.category.update({ where: { id }, data: updateData }),
        ...activeProducts.map((p) => {
          const vat = calculateVat(p.finalPrice, newVatRate.rate);
          return prisma.product.update({ where: { id: p.id }, data: vat });
        }),
      ]);
    } else {
      await prisma.category.update({ where: { id }, data: updateData });
    }

    const category = await prisma.category.findUnique({
      where: { id },
      include: { vatRate: true, _count: { select: { products: true } } },
    });
    return NextResponse.json({ ...category, productCount: category!._count.products });
  } catch {
    return NextResponse.json({ error: "Categoria não encontrada ou nome duplicado" }, { status: 404 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;

  const { id } = await params;

  const body = await req.json().catch(() => ({})) as { reassignTo?: string };
  const { reassignTo } = body;

  if (reassignTo && reassignTo === id) {
    return NextResponse.json({ error: "Categoria de destino não pode ser a mesma que está a ser eliminada." }, { status: 400 });
  }

  const productCount = await prisma.product.count({ where: { categoryId: id } });

  if (productCount > 0 && !reassignTo) {
    return NextResponse.json(
      { error: `Categoria em uso por ${productCount} produto${productCount > 1 ? "s" : ""}. Reatribui ou elimina os produtos antes de continuar.` },
      { status: 409 }
    );
  }

  try {
    if (productCount > 0 && reassignTo) {
      const targetExists = await prisma.category.findUnique({ where: { id: reassignTo }, select: { id: true } });
      if (!targetExists) {
        return NextResponse.json({ error: "Categoria de destino não encontrada." }, { status: 404 });
      }

      await prisma.$transaction([
        prisma.product.updateMany({ where: { categoryId: id }, data: { categoryId: reassignTo } }),
        prisma.category.delete({ where: { id } }),
      ]);
    } else {
      await prisma.category.delete({ where: { id } });
    }

    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Categoria não encontrada" }, { status: 404 });
  }
}
