import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateVat } from "@/lib/vat";
import { PatchProductSchema, validationError } from "@/lib/schemas";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = PatchProductSchema.safeParse(await req.json());
  if (!parsed.success) return validationError(parsed.error);
  const { finalPrice, categoryId, ...rest } = parsed.data;
  const updateData: Record<string, unknown> = { ...rest };

  // Resolve VAT rate: use new categoryId if provided, otherwise current category
  if (finalPrice != null || categoryId !== undefined) {
    const resolvedCategoryId = categoryId ?? (
      await prisma.product.findUnique({ where: { id }, select: { categoryId: true } })
    )?.categoryId;

    if (!resolvedCategoryId) return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });

    const category = await prisma.category.findUnique({
      where: { id: resolvedCategoryId },
      include: { vatRate: true },
    });
    if (!category) return NextResponse.json({ error: "Categoria não encontrada" }, { status: 404 });

    if (finalPrice != null) {
      const vat = calculateVat(finalPrice, category.vatRate.rate);
      Object.assign(updateData, vat);
    }
    if (categoryId !== undefined) updateData.categoryId = categoryId;
  }

  const product = await prisma.product.update({
    where: { id },
    data: updateData,
    include: { category: true },
  });

  return NextResponse.json({ ...product, category: product.category.name });
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.product.update({ where: { id }, data: { active: false } });
  return new NextResponse(null, { status: 204 });
}
