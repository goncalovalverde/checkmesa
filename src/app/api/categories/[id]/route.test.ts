/**
 * @jest-environment node
 *
 * Tests for PATCH /api/categories/[id] — HTTP layer only.
 * Business logic (VAT cascade) is tested in category.service.test.ts.
 */

jest.mock("@/lib/auth-guard", () => ({
  requireRole: jest.fn(),
}));
jest.mock("@/services/category.service", () => {
  // Classes must be defined inside the factory — jest.mock() is hoisted above
  // class declarations, so outer-scope references are not yet initialised.
  class CategoryNotFoundError extends Error {
    constructor() { super("Categoria não encontrada"); this.name = "CategoryNotFoundError"; }
  }
  class VatRateNotFoundError extends Error {
    constructor() { super("Taxa IVA não encontrada"); this.name = "VatRateNotFoundError"; }
  }
  class CategoryNameDuplicateError extends Error {
    constructor() { super("Nome de categoria já existe"); this.name = "CategoryNameDuplicateError"; }
  }
  return {
    updateCategory: jest.fn(),
    CategoryNotFoundError,
    VatRateNotFoundError,
    CategoryNameDuplicateError,
  };
});

import { NextRequest } from "next/server";
import { PATCH } from "./route";
import { requireRole } from "@/lib/auth-guard";
import { updateCategory, CategoryNotFoundError, VatRateNotFoundError, CategoryNameDuplicateError } from "@/services/category.service";

const adminSession = { user: { id: "admin-1", role: "ADMIN" } };

function patchReq(body: object): NextRequest {
  return new Request("http://localhost/api/categories/cat-1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

const params = { params: Promise.resolve({ id: "cat-1" }) };

describe("PATCH /api/categories/[id]", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 403 when user is not ADMIN", async () => {
    (requireRole as jest.Mock).mockResolvedValue({
      ok: false,
      response: Response.json({ error: "Forbidden" }, { status: 403 }),
    });
    const res = await PATCH(patchReq({ name: "X" }), params);
    expect(res.status).toBe(403);
    expect(updateCategory).not.toHaveBeenCalled();
  });

  it("returns 422 when body is invalid", async () => {
    (requireRole as jest.Mock).mockResolvedValue({ ok: true, session: adminSession });
    const res = await PATCH(patchReq({ unknownField: true }), params);
    expect(res.status).toBe(422);
  });

  it("returns 400 when no fields are provided", async () => {
    (requireRole as jest.Mock).mockResolvedValue({ ok: true, session: adminSession });
    const res = await PATCH(patchReq({}), params);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Nenhum campo para atualizar" });
  });

  it("returns 404 when category does not exist", async () => {
    (requireRole as jest.Mock).mockResolvedValue({ ok: true, session: adminSession });
    (updateCategory as jest.Mock).mockRejectedValue(new CategoryNotFoundError());
    const res = await PATCH(patchReq({ name: "New" }), params);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Categoria não encontrada" });
  });

  it("returns 404 when VAT rate does not exist", async () => {
    (requireRole as jest.Mock).mockResolvedValue({ ok: true, session: adminSession });
    (updateCategory as jest.Mock).mockRejectedValue(new VatRateNotFoundError());
    const res = await PATCH(patchReq({ vatRateId: "vr-missing" }), params);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Taxa IVA não encontrada" });
  });

  it("returns 409 on duplicate category name", async () => {
    (requireRole as jest.Mock).mockResolvedValue({ ok: true, session: adminSession });
    (updateCategory as jest.Mock).mockRejectedValue(new CategoryNameDuplicateError());
    const res = await PATCH(patchReq({ name: "Bebidas" }), params);
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "Nome de categoria já existe" });
  });

  it("returns 200 with updated category on success", async () => {
    (requireRole as jest.Mock).mockResolvedValue({ ok: true, session: adminSession });
    const updatedCat = {
      id: "cat-1", name: "Drinks", vatRateId: "vr-normal",
      vatRate: { id: "vr-normal", label: "Normal (23%)", rate: 0.23 },
      productCount: 5,
    };
    (updateCategory as jest.Mock).mockResolvedValue(updatedCat);

    const res = await PATCH(patchReq({ name: "Drinks" }), params);

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ name: "Drinks", productCount: 5 });
    expect(updateCategory).toHaveBeenCalledWith("cat-1", { name: "Drinks", vatRateId: undefined });
  });

  it("re-throws unexpected errors", async () => {
    (requireRole as jest.Mock).mockResolvedValue({ ok: true, session: adminSession });
    (updateCategory as jest.Mock).mockRejectedValue(new Error("DB connection lost"));

    await expect(PATCH(patchReq({ name: "X" }), params)).rejects.toThrow("DB connection lost");
  });
});
