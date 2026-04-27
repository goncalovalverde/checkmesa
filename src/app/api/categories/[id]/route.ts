import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 });

  try {
    const category = await prisma.category.update({ where: { id }, data: { name: name.trim() } });
    return NextResponse.json(category);
  } catch {
    return NextResponse.json({ error: "Categoria não encontrada ou nome duplicado" }, { status: 404 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  // Optional reassignment target from request body
  const body = await req.json().catch(() => ({})) as { reassignTo?: string };
  const { reassignTo } = body;

  if (reassignTo && reassignTo === id) {
    return NextResponse.json({ error: "Categoria de destino não pode ser a mesma que está a ser eliminada." }, { status: 400 });
  }

  const productCount = await prisma.product.count({ where: { categoryId: id } });

  if (productCount > 0 && !reassignTo) {
    return NextResponse.json(
      { error: `Categoria em uso por ${productCount} produto${productCount > 1 ? "s" : ""}. Reatribui ou elimina os produtos antes de continuar.` },
      { status: 409 }
    );
  }

  try {
    if (productCount > 0 && reassignTo) {
      // Verify the target category exists before touching anything
      const targetExists = await prisma.category.findUnique({ where: { id: reassignTo }, select: { id: true } });
      if (!targetExists) {
        return NextResponse.json({ error: "Categoria de destino não encontrada." }, { status: 404 });
      }

      await prisma.$transaction([
        prisma.product.updateMany({ where: { categoryId: id }, data: { categoryId: reassignTo } }),
        prisma.category.delete({ where: { id } }),
      ]);
    } else {
      await prisma.category.delete({ where: { id } });
    }

    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Categoria não encontrada" }, { status: 404 });
  }
}
