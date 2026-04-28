import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateVat } from "@/lib/vat";
import { CreateProductSchema, validationError } from "@/lib/schemas";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
  const session = await getServerSession(authOptions);
  if (!session || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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
