/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";

jest.mock("next-auth", () => ({ getServerSession: jest.fn() }));
jest.mock("@/lib/auth", () => ({ authOptions: {} }));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    product: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  },
}));

import { GET, POST } from "./route";
import { getServerSession } from "next-auth";
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
    (getServerSession as jest.Mock).mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns 200 with flattened products list", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    const dbProducts = [
      {
        id: "p1", name: "Bife", type: "DISH", categoryId: "cat-1",
        finalPrice: 12, basePrice: 10.62, vatAmount: 1.38, vatRate: 0.13, active: true,
        category: { name: "Pratos" },
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
    (getServerSession as jest.Mock).mockResolvedValue(mockStaffSession);
    const res = await POST(postReq({ name: "X", type: "DISH", categoryId: "c1", finalPrice: 10 }));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "Forbidden" });
  });

  it("returns 400 when required fields are missing", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockAdminSession);
    const res = await POST(postReq({ name: "Bife" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Missing fields" });
  });

  it("returns 201 with created product and VAT applied", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockAdminSession);
    const created = {
      id: "p-new", name: "Mousse", type: "DISH", categoryId: "cat-2",
      finalPrice: 4, basePrice: 3.54, vatAmount: 0.46, vatRate: 0.13, active: true,
      category: { name: "Sobremesas" },
    };
    (prisma.product.create as jest.Mock).mockResolvedValue(created);

    const res = await POST(postReq({ name: "Mousse", type: "DISH", categoryId: "cat-2", finalPrice: 4 }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toMatchObject({ id: "p-new", name: "Mousse", category: "Sobremesas" });
    const createCall = (prisma.product.create as jest.Mock).mock.calls[0][0].data;
    expect(createCall).toMatchObject({ name: "Mousse", vatRate: 0.13 });
  });
});
