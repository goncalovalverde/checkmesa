import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CreateSessionSchema, validationError } from "@/lib/schemas";
import { requireAuth } from "@/lib/auth-guard";

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const parsed = CreateSessionSchema.safeParse(await req.json());
  if (!parsed.success) return validationError(parsed.error);
  const { tableId, consumers } = parsed.data;

  const userId = auth.session.user.id;

  const [tableSession] = await prisma.$transaction([
    prisma.tableSession.create({
      data: {
        tableId,
        openedBy: userId,
        consumers: consumers,
      },
      include: { table: true, orderItems: { include: { product: true } } },
    }),
    prisma.table.update({ where: { id: tableId }, data: { status: "OCCUPIED" } }),
  ]);

  return NextResponse.json(tableSession, { status: 201 });
}
