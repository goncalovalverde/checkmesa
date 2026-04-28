import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CreateSessionSchema, validationError } from "@/lib/schemas";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = CreateSessionSchema.safeParse(await req.json());
  if (!parsed.success) return validationError(parsed.error);
  const { tableId, consumers } = parsed.data;

  const userId = (session.user as { id?: string }).id!;

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
