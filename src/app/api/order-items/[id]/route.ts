import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PatchOrderItemSchema, validationError } from "@/lib/schemas";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = PatchOrderItemSchema.safeParse(await req.json());
  if (!parsed.success) return validationError(parsed.error);
  const { quantity } = parsed.data;

  const existing = await prisma.orderItem.findUnique({ where: { id }, include: { session: { select: { status: true } } } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.session.status !== "OPEN") return NextResponse.json({ error: "Session is closed" }, { status: 409 });

  if (quantity === 0) {
    await prisma.orderItem.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  }

  const item = await prisma.orderItem.update({
    where: { id },
    data: { quantity },
    include: { product: true },
  });
  return NextResponse.json(item);
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.orderItem.findUnique({ where: { id }, include: { session: { select: { status: true } } } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.session.status !== "OPEN") return NextResponse.json({ error: "Session is closed" }, { status: 409 });
  await prisma.orderItem.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
