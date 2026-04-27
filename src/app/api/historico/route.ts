import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 25;

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));

  const dateFilter =
    from || to
      ? {
          closedAt: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to + "T23:59:59.999Z") } : {}),
          },
        }
      : {};

  const where = { status: "CLOSED", ...dateFilter };

  const [rawSessions, totalCount] = await Promise.all([
    prisma.tableSession.findMany({
      where,
      include: {
        table: { select: { name: true } },
        user: { select: { name: true } },
        orderItems: {
          include: { product: { select: { name: true, type: true } } },
          orderBy: { addedAt: "asc" },
        },
      },
      orderBy: { closedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.tableSession.count({ where }),
  ]);

  // Revenue requires multiplying quantity × unitPrice — Prisma aggregate can't do this directly
  const allItems = await prisma.orderItem.findMany({
    where: { session: { status: "CLOSED", ...dateFilter } },
    select: { quantity: true, unitPrice: true },
  });

  const totalRevenue = allItems.reduce((acc, i) => acc + i.quantity * i.unitPrice, 0);

  const consumersAgg = await prisma.tableSession.aggregate({
    where,
    _sum: { consumers: true },
  });

  const sessions = rawSessions.map((s) => {
    const total = s.orderItems.reduce((acc, i) => acc + i.quantity * i.unitPrice, 0);
    const durationMs =
      s.closedAt && s.openedAt
        ? new Date(s.closedAt).getTime() - new Date(s.openedAt).getTime()
        : null;
    return {
      id: s.id,
      tableName: s.table.name,
      openedBy: s.user.name,
      openedAt: s.openedAt,
      closedAt: s.closedAt,
      consumers: s.consumers,
      total,
      durationMs,
      items: s.orderItems.map((i) => ({
        id: i.id,
        productName: i.product.name,
        productType: i.product.type,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        subtotal: i.quantity * i.unitPrice,
      })),
    };
  });

  return NextResponse.json({
    sessions,
    pagination: {
      page,
      pageSize: PAGE_SIZE,
      totalCount,
      totalPages: Math.ceil(totalCount / PAGE_SIZE),
    },
    summary: {
      totalRevenue,
      sessionCount: totalCount,
      avgPerSession: totalCount > 0 ? totalRevenue / totalCount : 0,
      totalConsumers: consumersAgg._sum.consumers ?? 0,
    },
  });
}
