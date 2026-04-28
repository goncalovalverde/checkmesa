/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";

jest.mock("next-auth", () => ({ getServerSession: jest.fn() }));
jest.mock("@/lib/auth", () => ({ authOptions: {} }));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    product: { findUnique: jest.fn() },
    tableSession: { findUnique: jest.fn() },
    orderItem: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

import { POST } from "./route";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";

const mockSession = { user: { id: "user-1", role: "STAFF" } };

const mockProduct = {
  id: "prod-1", name: "Água", category: "bebida",
  finalPrice: 1.5, basePrice: 1.22, vatAmount: 0.28, vatRate: 0.23, active: true,
};

function postReq(body: object): NextRequest {
  return new Request("http://localhost/api/order-items", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

describe("POST /api/order-items", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);
    const res = await POST(postReq({ sessionId: "s1", productId: "prod-1" }));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns 422 when sessionId or productId is missing", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    const res = await POST(postReq({ sessionId: "s1" }));
    expect(res.status).toBe(422);
  });

  it("returns 404 when session does not exist", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (prisma.tableSession.findUnique as jest.Mock).mockResolvedValue(null);
    const res = await POST(postReq({ sessionId: "s1", productId: "prod-1" }));
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Session not found" });
  });

  it("returns 404 when product does not exist", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (prisma.tableSession.findUnique as jest.Mock).mockResolvedValue({ status: "OPEN" });
    (prisma.product.findUnique as jest.Mock).mockResolvedValue(null);
    const res = await POST(postReq({ sessionId: "s1", productId: "missing" }));
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Product not found" });
  });

  it("creates a new order item (201) when product is not yet in session", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (prisma.tableSession.findUnique as jest.Mock).mockResolvedValue({ status: "OPEN" });
    (prisma.product.findUnique as jest.Mock).mockResolvedValue(mockProduct);
    (prisma.orderItem.findFirst as jest.Mock).mockResolvedValue(null);
    const created = { id: "oi-1", sessionId: "s1", productId: "prod-1", quantity: 1, unitPrice: 1.5, product: mockProduct };
    (prisma.orderItem.create as jest.Mock).mockResolvedValue(created);

    const res = await POST(postReq({ sessionId: "s1", productId: "prod-1" }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toMatchObject({ id: "oi-1", quantity: 1, unitPrice: 1.5 });
    expect((prisma.orderItem.create as jest.Mock).mock.calls[0][0].data).toMatchObject({
      unitPrice: mockProduct.finalPrice,
    });
  });

  it("increments quantity (200) when product is already in the session", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (prisma.tableSession.findUnique as jest.Mock).mockResolvedValue({ status: "OPEN" });
    (prisma.product.findUnique as jest.Mock).mockResolvedValue(mockProduct);
    const existing = { id: "oi-1", sessionId: "s1", productId: "prod-1", quantity: 2 };
    (prisma.orderItem.findFirst as jest.Mock).mockResolvedValue(existing);
    const updated = { ...existing, quantity: 3, product: mockProduct };
    (prisma.orderItem.update as jest.Mock).mockResolvedValue(updated);

    const res = await POST(postReq({ sessionId: "s1", productId: "prod-1", quantity: 1 }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.quantity).toBe(3);
    expect((prisma.orderItem.update as jest.Mock).mock.calls[0][0].data).toEqual({ quantity: 3 });
  });
});
