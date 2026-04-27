import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateVat } from "@/lib/vat";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { finalPrice, type, categoryId, ...rest } = body;
  const updateData: Record<string, unknown> = { ...rest };

  if (categoryId !== undefined) updateData.categoryId = categoryId;

  if (finalPrice != null && type) {
    const vat = calculateVat(Number(finalPrice), type);
    Object.assign(updateData, vat, { finalPrice: Number(finalPrice), type });
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
