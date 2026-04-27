import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tables = await prisma.table.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(tables);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { name, capacity } = await req.json();
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

  const table = await prisma.table.create({ data: { name, capacity: capacity ?? 4 } });
  return NextResponse.json(table, { status: 201 });
}
