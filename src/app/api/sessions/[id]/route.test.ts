/**
 * @jest-environment node
 *
 * Tests for PATCH /api/sessions/[id]:
 * - session close (OPEN → CLOSED) with table status update
 * - double-close guard (409 if already CLOSED)
 * - modification guard (409 if trying to update consumers on CLOSED session)
 * - consumers update on OPEN session
 */

jest.mock("@/lib/auth-guard", () => ({
  requireAuth: jest.fn(),
}));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    tableSession: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    table: { update: jest.fn() },
    $transaction: jest.fn(),
  },
}));

import { NextRequest } from "next/server";
import { PATCH } from "./route";
import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

const mockSession = { user: { id: "user-1", role: "STAFF" } };

function patchReq(body: object): NextRequest {
  return new Request("http://localhost/api/sessions/s-1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

const params = { params: Promise.resolve({ id: "s-1" }) };

describe("PATCH /api/sessions/[id]", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    (requireAuth as jest.Mock).mockResolvedValue({
      ok: false,
      response: Response.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await PATCH(patchReq({ status: "CLOSED" }), params);
    expect(res.status).toBe(401);
  });

  it("returns 422 when body has an unknown field (strict Zod schema)", async () => {
    (requireAuth as jest.Mock).mockResolvedValue({ ok: true, session: mockSession });
    const res = await PATCH(patchReq({ unknownField: "oops" }), params);
    expect(res.status).toBe(422);
  });

  it("returns 404 when session does not exist", async () => {
    (requireAuth as jest.Mock).mockResolvedValue({ ok: true, session: mockSession });
    (prisma.tableSession.findUnique as jest.Mock).mockResolvedValue(null);
    const res = await PATCH(patchReq({ status: "CLOSED" }), params);
    expect(res.status).toBe(404);
  });

  it("closes an OPEN session — runs transaction and returns updated session", async () => {
    (requireAuth as jest.Mock).mockResolvedValue({ ok: true, session: mockSession });
    const openSession = { id: "s-1", tableId: "t-1", status: "OPEN" };
    const closedSession = { ...openSession, status: "CLOSED", closedAt: new Date() };
    (prisma.tableSession.findUnique as jest.Mock).mockResolvedValue(openSession);
    (prisma.$transaction as jest.Mock).mockResolvedValue([closedSession, {}]);

    const res = await PATCH(patchReq({ status: "CLOSED" }), params);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("CLOSED");
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it("returns 409 when trying to close an already-CLOSED session", async () => {
    (requireAuth as jest.Mock).mockResolvedValue({ ok: true, session: mockSession });
    (prisma.tableSession.findUnique as jest.Mock).mockResolvedValue({ id: "s-1", status: "CLOSED" });

    const res = await PATCH(patchReq({ status: "CLOSED" }), params);

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "Session already closed" });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("returns 409 when trying to update consumers on a CLOSED session", async () => {
    (requireAuth as jest.Mock).mockResolvedValue({ ok: true, session: mockSession });
    (prisma.tableSession.findUnique as jest.Mock).mockResolvedValue({ id: "s-1", status: "CLOSED" });

    const res = await PATCH(patchReq({ consumers: 4 }), params);

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "Cannot modify a closed session" });
  });

  it("updates consumers on an OPEN session", async () => {
    (requireAuth as jest.Mock).mockResolvedValue({ ok: true, session: mockSession });
    const openSession = { id: "s-1", tableId: "t-1", status: "OPEN", consumers: 2 };
    (prisma.tableSession.findUnique as jest.Mock).mockResolvedValue(openSession);
    const updated = { ...openSession, consumers: 4 };
    (prisma.tableSession.update as jest.Mock).mockResolvedValue(updated);

    const res = await PATCH(patchReq({ consumers: 4 }), params);

    expect(res.status).toBe(200);
    expect((await res.json()).consumers).toBe(4);
    expect(prisma.tableSession.update).toHaveBeenCalledWith({
      where: { id: "s-1" },
      data: { consumers: 4 },
    });
  });
});
