import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PatchVatRateSchema, validationError } from "@/lib/schemas";
import { requireRole } from "@/lib/auth-guard";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const parsed = PatchVatRateSchema.safeParse(await req.json());
  if (!parsed.success) return validationError(parsed.error);
  const { label, rate } = parsed.data;

  try {
    const vatRate = await prisma.vatRate.update({
      where: { id },
      data: {
        ...(label !== undefined ? { label } : {}),
        ...(rate !== undefined ? { rate } : {}),
      },
    });
    return NextResponse.json(vatRate);
  } catch {
    return NextResponse.json({ error: "Taxa IVA não encontrada ou designação duplicada" }, { status: 404 });
  }
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;

  const { id } = await params;

  const usageCount = await prisma.category.count({ where: { vatRateId: id } });
  if (usageCount > 0) {
    return NextResponse.json(
      { error: `Taxa em uso por ${usageCount} categoria${usageCount > 1 ? "s" : ""}. Reatribui as categorias antes de eliminar.` },
      { status: 409 }
    );
  }

  try {
    await prisma.vatRate.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Taxa IVA não encontrada" }, { status: 404 });
  }
}
