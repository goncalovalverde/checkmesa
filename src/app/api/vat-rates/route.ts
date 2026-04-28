import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CreateVatRateSchema, validationError } from "@/lib/schemas";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const vatRates = await prisma.vatRate.findMany({ orderBy: { rate: "asc" } });
  return NextResponse.json(vatRates);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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
