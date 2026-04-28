import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CreateCategorySchema, validationError } from "@/lib/schemas";
import { requireAuth, requireRole } from "@/lib/auth-guard";

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: {
      vatRate: true,
      _count: { select: { products: true } },
    },
  });

  return NextResponse.json(categories.map(({ _count, ...cat }) => ({
    ...cat,
    productCount: _count.products,
  })));
}

export async function POST(req: NextRequest) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;

  const parsed = CreateCategorySchema.safeParse(await req.json());
  if (!parsed.success) return validationError(parsed.error);
  const { name, vatRateId } = parsed.data;

  const vatRateExists = await prisma.vatRate.findUnique({ where: { id: vatRateId }, select: { id: true } });
  if (!vatRateExists) return NextResponse.json({ error: "Taxa IVA não encontrada" }, { status: 404 });

  try {
    const category = await prisma.category.create({
      data: { name, vatRateId },
      include: { vatRate: true },
    });
    return NextResponse.json(category, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Categoria já existe" }, { status: 409 });
  }
}
