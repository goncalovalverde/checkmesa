import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  if (body.status === "CLOSED") {
    const tableSession = await prisma.tableSession.findUnique({ where: { id } });
    if (!tableSession) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const [updated] = await prisma.$transaction([
      prisma.tableSession.update({
        where: { id },
        data: { status: "CLOSED", closedAt: new Date() },
      }),
      prisma.table.update({ where: { id: tableSession.tableId }, data: { status: "FREE" } }),
    ]);
    return NextResponse.json(updated);
  }

  const updated = await prisma.tableSession.update({ where: { id }, data: body });
  return NextResponse.json(updated);
}
