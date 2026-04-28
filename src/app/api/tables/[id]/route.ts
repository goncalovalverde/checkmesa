import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PatchTableSchema, validationError } from "@/lib/schemas";
import { requireAuth, requireRole } from "@/lib/auth-guard";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, { params }: Params) {
  const { id } = await params;
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const table = await prisma.table.findUnique({ where: { id } });
  if (!table) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(table);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;

  const parsed = PatchTableSchema.safeParse(await req.json());
  if (!parsed.success) return validationError(parsed.error);
  const table = await prisma.table.update({ where: { id }, data: parsed.data });
  return NextResponse.json(table);
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const { id } = await params;
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;

  await prisma.table.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
