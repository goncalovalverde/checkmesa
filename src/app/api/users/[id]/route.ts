import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { PatchUserSchema, validationError } from "@/lib/schemas";
import { requireRole } from "@/lib/auth-guard";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;

  const parsed = PatchUserSchema.safeParse(await req.json());
  if (!parsed.success) return validationError(parsed.error);
  const { password, ...rest } = parsed.data;

  const updateData: Record<string, unknown> = { ...rest };
  if (password) {
    updateData.password = await bcrypt.hash(password, 12);
  }

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });
  return NextResponse.json(user);
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const { id } = await params;
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;

  await prisma.user.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
