/**
 * @jest-environment node
 */
import { GET } from "./route";

jest.mock("@/lib/prisma", () => ({
  prisma: { $queryRaw: jest.fn() },
}));

const { prisma } = jest.requireMock("@/lib/prisma");

// Helper to set up $queryRaw mock for the three sequential calls:
//   call 1: SELECT 1         (DB ping)
//   call 2: pending count
//   call 3: failed count
function mockMigrations(pending: number, failed: number) {
  prisma.$queryRaw
    .mockResolvedValueOnce([])                          // SELECT 1
    .mockResolvedValueOnce([{ count: BigInt(pending) }]) // pending
    .mockResolvedValueOnce([{ count: BigInt(failed) }]); // failed
}

describe("GET /api/health", () => {
  beforeEach(() => jest.resetAllMocks());

  it("200 ok — DB reachable, all migrations applied", async () => {
    mockMigrations(0, 0);
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.db).toBe("ok");
    expect(body.migrations).toBe("ok");
    expect(typeof body.uptime).toBe("number");
    expect(typeof body.version).toBe("string");
  });

  it("503 db unreachable — SELECT 1 throws", async () => {
    prisma.$queryRaw.mockRejectedValueOnce(new Error("connection refused"));
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.status).toBe("error");
    expect(body.db).toBe("unreachable");
    expect(body.migrations).toBe("unknown");
  });

  it("503 migrations pending — unfinished migration rows exist", async () => {
    mockMigrations(2, 0);
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.status).toBe("error");
    expect(body.db).toBe("ok");
    expect(body.migrations).toBe("pending");
  });

  it("503 migrations failed — rolled_back rows exist", async () => {
    mockMigrations(0, 1);
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.status).toBe("error");
    expect(body.db).toBe("ok");
    expect(body.migrations).toBe("failed");
  });

  it("503 migrations unknown — _prisma_migrations query throws", async () => {
    prisma.$queryRaw
      .mockResolvedValueOnce([])                          // SELECT 1 passes
      .mockRejectedValueOnce(new Error("table not found")); // migration query fails
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.status).toBe("error");
    expect(body.db).toBe("ok");
    expect(body.migrations).toBe("unknown");
  });
});
