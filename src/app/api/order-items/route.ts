import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sessionId, productId, quantity } = await req.json();
  if (!sessionId || !productId) {
    return NextResponse.json({ error: "sessionId and productId required" }, { status: 400 });
  }

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  const qty = Number(quantity ?? 1);

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
