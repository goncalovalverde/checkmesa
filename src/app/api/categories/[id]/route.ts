import { NextRequest, NextResponse } from "next/server";
import { PatchCategorySchema, validationError } from "@/lib/schemas";
import { requireRole } from "@/lib/auth-guard";
import {
  updateCategory, deleteCategory,
  CategoryNotFoundError, TargetCategoryNotFoundError,
  VatRateNotFoundError, CategoryInUseError,
  CategoryNameDuplicateError, CategorySelfReassignError,
} from "@/services/category.service";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const parsed = PatchCategorySchema.safeParse(await req.json());
  if (!parsed.success) return validationError(parsed.error);
  const { name, vatRateId } = parsed.data;

  if (name === undefined && vatRateId === undefined) {
    return NextResponse.json({ error: "Nenhum campo para atualizar" }, { status: 400 });
  }

  try {
    const category = await updateCategory(id, { name, vatRateId });
    return NextResponse.json(category);
  } catch (e) {
    if (e instanceof CategoryNotFoundError) return NextResponse.json({ error: e.message }, { status: 404 });
    if (e instanceof VatRateNotFoundError)  return NextResponse.json({ error: e.message }, { status: 404 });
    if (e instanceof CategoryNameDuplicateError) return NextResponse.json({ error: e.message }, { status: 409 });
    throw e; // unknown errors surface as 500
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await req.json().catch(() => ({})) as { reassignTo?: string };

  try {
    await deleteCategory(id, body.reassignTo);
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    if (e instanceof CategorySelfReassignError)    return NextResponse.json({ error: e.message }, { status: 400 });
    if (e instanceof CategoryInUseError)           return NextResponse.json({ error: e.message }, { status: 409 });
    if (e instanceof CategoryNotFoundError)        return NextResponse.json({ error: e.message }, { status: 404 });
    if (e instanceof TargetCategoryNotFoundError)  return NextResponse.json({ error: e.message }, { status: 404 });
    throw e;
  }
}
