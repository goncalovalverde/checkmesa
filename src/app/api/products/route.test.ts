/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";

jest.mock("@/lib/auth-guard", () => ({
  requireAuth: jest.fn(),
  requireRole: jest.fn(),
}));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    product: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    category: {
      findUnique: jest.fn(),
    },
  },
}));

import { GET, POST } from "./route";
import { requireAuth, requireRole } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

const mockSession = { user: { id: "user-1", role: "ADMIN" } };
const mockAdminSession = { user: { id: "user-1", role: "ADMIN" } };
const mockStaffSession = { user: { id: "user-2", role: "STAFF" } };

function postReq(body: object): NextRequest {
  return new Request("http://localhost/api/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

describe("GET /api/products", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    (requireAuth as jest.Mock).mockResolvedValue({ ok: false, response: Response.json({ error: "Unauthorized" }, { status: 401 }) });
    const res = await GET();
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns 200 with flattened products list", async () => {
    (requireAuth as jest.Mock).mockResolvedValue({ ok: true, session: mockSession });
    const dbProducts = [
      {
        id: "p1", name: "Bife", categoryId: "cat-1",
        finalPrice: 12, basePrice: 10.62, vatAmount: 1.38, vatRate: 0.13, active: true,
        category: { name: "Pratos", vatRate: { id: "vr-intermedio", label: "Intermédio (13%)", rate: 0.13 } },
      },
    ];
    (prisma.product.findMany as jest.Mock).mockResolvedValue(dbProducts);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body[0]).toMatchObject({ id: "p1", name: "Bife", category: "Pratos" });
    expect(body[0]).not.toHaveProperty("category.name");
  });
});

describe("POST /api/products", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 403 when user is not ADMIN", async () => {
    (requireRole as jest.Mock).mockResolvedValue({ ok: false, response: Response.json({ error: "Forbidden" }, { status: 403 }) });
    const res = await POST(postReq({ name: "X", categoryId: "c1", finalPrice: 10 }));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "Forbidden" });
  });

  it("returns 422 when required fields are missing", async () => {
    (requireRole as jest.Mock).mockResolvedValue({ ok: true, session: mockAdminSession });
    const res = await POST(postReq({ name: "Bife" }));
    expect(res.status).toBe(422);
  });

  it("returns 404 when category not found", async () => {
    (requireRole as jest.Mock).mockResolvedValue({ ok: true, session: mockAdminSession });
    (prisma.category.findUnique as jest.Mock).mockResolvedValue(null);
    const res = await POST(postReq({ name: "Mousse", categoryId: "cat-missing", finalPrice: 4 }));
    expect(res.status).toBe(404);
  });

  it("returns 201 with created product and VAT derived from category", async () => {
    (requireRole as jest.Mock).mockResolvedValue({ ok: true, session: mockAdminSession });
    (prisma.category.findUnique as jest.Mock).mockResolvedValue({
      id: "cat-2",
      vatRate: { id: "vr-intermedio", label: "Intermédio (13%)", rate: 0.13 },
    });
    const created = {
      id: "p-new", name: "Mousse", categoryId: "cat-2",
      finalPrice: 4, basePrice: 3.54, vatAmount: 0.46, vatRate: 0.13, active: true,
      category: { name: "Sobremesas" },
    };
    (prisma.product.create as jest.Mock).mockResolvedValue(created);

    const res = await POST(postReq({ name: "Mousse", categoryId: "cat-2", finalPrice: 4 }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toMatchObject({ id: "p-new", name: "Mousse", category: "Sobremesas" });
    const createCall = (prisma.product.create as jest.Mock).mock.calls[0][0].data;
    expect(createCall).toMatchObject({ name: "Mousse", vatRate: 0.13 });
    expect(createCall).not.toHaveProperty("type");
  });
});
