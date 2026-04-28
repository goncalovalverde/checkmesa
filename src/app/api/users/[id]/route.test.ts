/**
 * @jest-environment node
 *
 * Tests for PATCH and DELETE /api/users/[id]:
 * - self-deletion guard (ADV-02)
 * - Zod 422 on invalid PATCH body
 * - successful update
 * - 403 for non-admin
 */

jest.mock("@/lib/auth-guard", () => ({
  requireRole: jest.fn(),
}));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));
jest.mock("bcryptjs", () => ({
  hash: jest.fn().mockResolvedValue("hashed-password"),
}));

import { NextRequest } from "next/server";
import { PATCH, DELETE } from "./route";
import { requireRole } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

const adminSession = { user: { id: "admin-1", role: "ADMIN" } };

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function patchReq(body: object): NextRequest {
  return new Request("http://localhost/api/users/u-1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

function deleteReq(): NextRequest {
  return new Request("http://localhost/api/users/u-1", {
    method: "DELETE",
  }) as unknown as NextRequest;
}

describe("PATCH /api/users/[id]", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 403 when user is not ADMIN", async () => {
    (requireRole as jest.Mock).mockResolvedValue({
      ok: false,
      response: Response.json({ error: "Forbidden" }, { status: 403 }),
    });
    const res = await PATCH(patchReq({ name: "X" }), makeParams("u-1"));
    expect(res.status).toBe(403);
  });

  it("returns 422 when body contains an unknown field", async () => {
    (requireRole as jest.Mock).mockResolvedValue({ ok: true, session: adminSession });
    const res = await PATCH(patchReq({ isAdmin: true }), makeParams("u-1"));
    expect(res.status).toBe(422);
  });

  it("returns 422 when role is not a valid enum value", async () => {
    (requireRole as jest.Mock).mockResolvedValue({ ok: true, session: adminSession });
    const res = await PATCH(patchReq({ role: "SUPERADMIN" }), makeParams("u-1"));
    expect(res.status).toBe(422);
  });

  it("updates user name successfully", async () => {
    (requireRole as jest.Mock).mockResolvedValue({ ok: true, session: adminSession });
    const updated = { id: "u-1", name: "Alice Updated", email: "a@b.com", role: "STAFF", createdAt: new Date() };
    (prisma.user.update as jest.Mock).mockResolvedValue(updated);

    const res = await PATCH(patchReq({ name: "Alice Updated" }), makeParams("u-1"));

    expect(res.status).toBe(200);
    expect((await res.json()).name).toBe("Alice Updated");
  });

  it("hashes password when included in update", async () => {
    (requireRole as jest.Mock).mockResolvedValue({ ok: true, session: adminSession });
    (prisma.user.update as jest.Mock).mockResolvedValue({ id: "u-1", name: "Alice", email: "a@b.com", role: "STAFF", createdAt: new Date() });

    await PATCH(patchReq({ password: "newPassword1!" }), makeParams("u-1"));

    const updateCall = (prisma.user.update as jest.Mock).mock.calls[0][0];
    expect(updateCall.data.password).toBe("hashed-password");
  });
});

describe("DELETE /api/users/[id]", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 403 when user is not ADMIN", async () => {
    (requireRole as jest.Mock).mockResolvedValue({
      ok: false,
      response: Response.json({ error: "Forbidden" }, { status: 403 }),
    });
    const res = await DELETE(deleteReq(), makeParams("u-1"));
    expect(res.status).toBe(403);
  });

  it("returns 400 when admin tries to delete their own account (ADV-02)", async () => {
    (requireRole as jest.Mock).mockResolvedValue({ ok: true, session: adminSession });

    // Target ID matches the session user ID
    const res = await DELETE(deleteReq(), makeParams("admin-1"));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Não é possível eliminar a sua própria conta" });
    expect(prisma.user.delete).not.toHaveBeenCalled();
  });

  it("deletes a different user successfully (204)", async () => {
    (requireRole as jest.Mock).mockResolvedValue({ ok: true, session: adminSession });
    (prisma.user.delete as jest.Mock).mockResolvedValue({});

    const res = await DELETE(deleteReq(), makeParams("other-user-99"));

    expect(res.status).toBe(204);
    expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: "other-user-99" } });
  });
});
