import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { quantity } = await req.json();
  if (quantity == null || Number(quantity) < 0) {
    return NextResponse.json({ error: "Invalid quantity" }, { status: 400 });
  }

  if (Number(quantity) === 0) {
    await prisma.orderItem.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  }

  const item = await prisma.orderItem.update({
    where: { id },
    data: { quantity: Number(quantity) },
    include: { product: true },
  });
  return NextResponse.json(item);
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.orderItem.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
