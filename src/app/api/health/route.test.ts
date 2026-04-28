/**
 * @jest-environment node
 */
import { GET } from "./route";

jest.mock("@/lib/prisma", () => ({
  prisma: { $queryRaw: jest.fn() },
}));

const { prisma } = jest.requireMock("@/lib/prisma");

describe("GET /api/health", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 200 with status ok when DB is reachable", async () => {
    prisma.$queryRaw.mockResolvedValue([]);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.db).toBe("ok");
    expect(typeof body.uptime).toBe("number");
    expect(typeof body.version).toBe("string");
  });

  it("returns 503 with db unreachable when DB throws", async () => {
    prisma.$queryRaw.mockRejectedValue(new Error("connection refused"));

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.status).toBe("error");
    expect(body.db).toBe("unreachable");
    expect(typeof body.uptime).toBe("number");
  });
});
