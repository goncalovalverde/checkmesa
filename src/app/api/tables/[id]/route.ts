import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PatchTableSchema, validationError } from "@/lib/schemas";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const table = await prisma.table.findUnique({ where: { id } });
  if (!table) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(table);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = PatchTableSchema.safeParse(await req.json());
  if (!parsed.success) return validationError(parsed.error);
  const table = await prisma.table.update({ where: { id }, data: parsed.data });
  return NextResponse.json(table);
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.table.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
