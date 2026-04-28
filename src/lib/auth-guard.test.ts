/**
 * @jest-environment node
 */

import { requireAuth, requireRole } from "./auth-guard";

const mockGetServerSession = jest.fn();

jest.mock("next-auth", () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));

jest.mock("./auth", () => ({
  authOptions: {},
}));

describe("requireAuth", () => {
  beforeEach(() => {
    mockGetServerSession.mockReset();
  });

  it("returns ok:false with 401 when there is no session", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const result = await requireAuth();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(401);
    }
  });

  it("returns ok:true with session when authenticated", async () => {
    const fakeSession = { user: { id: "1", name: "Alice", email: "a@b.com", role: "STAFF" } };
    mockGetServerSession.mockResolvedValue(fakeSession);
    const result = await requireAuth();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.session).toBe(fakeSession);
    }
  });
});

describe("requireRole", () => {
  beforeEach(() => {
    mockGetServerSession.mockReset();
  });

  it("returns ok:false with 403 when there is no session", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const result = await requireRole("ADMIN");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(403);
    }
  });

  it("returns ok:false with 403 when session role is STAFF but ADMIN required", async () => {
    const fakeSession = { user: { id: "1", name: "Bob", email: "b@c.com", role: "STAFF" } };
    mockGetServerSession.mockResolvedValue(fakeSession);
    const result = await requireRole("ADMIN");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(403);
    }
  });

  it("returns ok:true with session when role matches ADMIN", async () => {
    const fakeSession = { user: { id: "2", name: "Carol", email: "c@d.com", role: "ADMIN" } };
    mockGetServerSession.mockResolvedValue(fakeSession);
    const result = await requireRole("ADMIN");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.session).toBe(fakeSession);
    }
  });
});
