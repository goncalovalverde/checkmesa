import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CreateVatRateSchema, validationError } from "@/lib/schemas";
import { requireAuth, requireRole } from "@/lib/auth-guard";

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const vatRates = await prisma.vatRate.findMany({ orderBy: { rate: "asc" } });
  return NextResponse.json(vatRates);
}

export async function POST(req: NextRequest) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;

  const parsed = CreateVatRateSchema.safeParse(await req.json());
  if (!parsed.success) return validationError(parsed.error);
  const { label, rate } = parsed.data;

  try {
    const vatRate = await prisma.vatRate.create({
      data: { label, rate },
    });
    return NextResponse.json(vatRate, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Designação já existe" }, { status: 409 });
  }
}
