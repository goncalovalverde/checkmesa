import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateVat } from "@/lib/vat";
import { CreateProductSchema, validationError } from "@/lib/schemas";
import { requireAuth, requireRole } from "@/lib/auth-guard";

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const products = await prisma.product.findMany({
    where: { active: true },
    include: { category: { include: { vatRate: true } } },
    orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
  });

  return NextResponse.json(products.map(({ category, ...p }) => ({
    ...p,
    categoryId: p.categoryId,
    category: category.name,
  })));
}

export async function POST(req: NextRequest) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;

  const parsed = CreateProductSchema.safeParse(await req.json());
  if (!parsed.success) return validationError(parsed.error);
  const { name, categoryId, finalPrice } = parsed.data;

  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    include: { vatRate: true },
  });
  if (!category) return NextResponse.json({ error: "Categoria não encontrada" }, { status: 404 });

  const vat = calculateVat(finalPrice, category.vatRate.rate);
  const product = await prisma.product.create({
    data: { name, categoryId, ...vat },
    include: { category: true },
  });

  return NextResponse.json({ ...product, category: product.category.name }, { status: 201 });
}
