import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateVat } from "@/lib/vat";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const products = await prisma.product.findMany({
    where: { active: true },
    include: { category: true },
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

  const { name, type, categoryId, finalPrice } = await req.json();
  if (!name || !type || !categoryId || finalPrice == null) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const vat = calculateVat(Number(finalPrice), type);
  const product = await prisma.product.create({
    data: { name, type, categoryId, ...vat },
    include: { category: true },
  });

  return NextResponse.json({ ...product, category: product.category.name }, { status: 201 });
}
