import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CreateOrderItemSchema, validationError } from "@/lib/schemas";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = CreateOrderItemSchema.safeParse(await req.json());
  if (!parsed.success) return validationError(parsed.error);
  const { sessionId, productId, quantity } = parsed.data;

  const tableSession = await prisma.tableSession.findUnique({ where: { id: sessionId }, select: { status: true } });
  if (!tableSession) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  if (tableSession.status !== "OPEN") return NextResponse.json({ error: "Session is closed" }, { status: 409 });

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  const qty = quantity;

  const existing = await prisma.orderItem.findFirst({
    where: { sessionId, productId },
  });

  if (existing) {
    const item = await prisma.orderItem.update({
      where: { id: existing.id },
      data: { quantity: existing.quantity + qty },
      include: { product: true },
    });
    return NextResponse.json(item);
  }

  const item = await prisma.orderItem.create({
    data: {
      sessionId,
      productId,
      quantity: qty,
      unitPrice: product.finalPrice,
    },
    include: { product: true },
  });
  return NextResponse.json(item, { status: 201 });
}
