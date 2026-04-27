import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

/** GET /api/tables/:id/session — returns the active OPEN session for a table, or null */
export async function GET(_: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tableSession = await prisma.tableSession.findFirst({
    where: { tableId: id, status: "OPEN" },
    include: {
      orderItems: { include: { product: true }, orderBy: { addedAt: "asc" } },
    },
    orderBy: { openedAt: "desc" },
  });

  return NextResponse.json(tableSession ?? null);
}
