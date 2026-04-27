import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { tableId, consumers } = await req.json();
  if (!tableId || !consumers) {
    return NextResponse.json({ error: "tableId and consumers required" }, { status: 400 });
  }

  const userId = (session.user as { id?: string }).id!;

  const [tableSession] = await prisma.$transaction([
    prisma.tableSession.create({
      data: {
        tableId,
        openedBy: userId,
        consumers: Number(consumers),
      },
      include: { table: true, orderItems: { include: { product: true } } },
    }),
    prisma.table.update({ where: { id: tableId }, data: { status: "OCCUPIED" } }),
  ]);

  return NextResponse.json(tableSession, { status: 201 });
}
