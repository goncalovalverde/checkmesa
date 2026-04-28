import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CreateTableSchema, validationError } from "@/lib/schemas";
import { requireAuth, requireRole } from "@/lib/auth-guard";

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const tables = await prisma.table.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(tables);
}

export async function POST(req: NextRequest) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;

  const parsed = CreateTableSchema.safeParse(await req.json());
  if (!parsed.success) return validationError(parsed.error);
  const { name, capacity } = parsed.data;

  const table = await prisma.table.create({ data: { name, capacity } });
  return NextResponse.json(table, { status: 201 });
}
