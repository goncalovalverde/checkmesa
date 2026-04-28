import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PatchSessionSchema, validationError } from "@/lib/schemas";
import { requireAuth } from "@/lib/auth-guard";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, { params }: Params) {
  const { id } = await params;
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const tableSession = await prisma.tableSession.findUnique({
    where: { id },
    include: {
      table: true,
      user: { select: { id: true, name: true } },
      orderItems: { include: { product: true }, orderBy: { addedAt: "asc" } },
    },
  });

  if (!tableSession) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(tableSession);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const parsed = PatchSessionSchema.safeParse(await req.json());
  if (!parsed.success) return validationError(parsed.error);

  const tableSession = await prisma.tableSession.findUnique({ where: { id } });
  if (!tableSession) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (parsed.data.status === "CLOSED") {
    if (tableSession.status === "CLOSED") {
      return NextResponse.json({ error: "Session already closed" }, { status: 409 });
    }
    const [updated] = await prisma.$transaction([
      prisma.tableSession.update({ where: { id }, data: { status: "CLOSED", closedAt: new Date() } }),
      prisma.table.update({ where: { id: tableSession.tableId }, data: { status: "FREE" } }),
    ]);
    return NextResponse.json(updated);
  }

  if (tableSession.status === "CLOSED") {
    return NextResponse.json({ error: "Cannot modify a closed session" }, { status: 409 });
  }

  const updated = await prisma.tableSession.update({
    where: { id },
    data: { ...(parsed.data.consumers !== undefined ? { consumers: parsed.data.consumers } : {}) },
  });
  return NextResponse.json(updated);
}
