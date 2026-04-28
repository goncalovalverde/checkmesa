import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";

type Params = { params: Promise<{ id: string }> };

/** GET /api/tables/:id/session — returns the active OPEN session for a table, or null */
export async function GET(_: NextRequest, { params }: Params) {
  const { id } = await params;
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const tableSession = await prisma.tableSession.findFirst({
    where: { tableId: id, status: "OPEN" },
    include: {
      orderItems: { include: { product: true }, orderBy: { addedAt: "asc" } },
    },
    orderBy: { openedAt: "desc" },
  });

  return NextResponse.json(tableSession ?? null);
}
