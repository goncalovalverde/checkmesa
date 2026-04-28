/**
 * @jest-environment node
 */
// Mocks must be declared before imports.
// auth.ts imports prisma via relative path, so we mock that path too.
jest.mock("./prisma", () => ({
  prisma: {
    user: { findUnique: jest.fn() },
  },
}));

import { authOptions } from "@/lib/auth";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";
import type { JWT } from "next-auth/jwt";
import type { Session } from "next-auth";

// Extract the authorize function from the CredentialsProvider options
// (provider.authorize is next-auth's placeholder; the real impl is in options)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const authorize = (authOptions.providers[0] as any).options.authorize as (
  credentials: Record<string, string> | undefined
) => Promise<unknown>;

// Use real bcrypt with 1 round — fast enough for tests, tests actual crypto flow
const CORRECT_PASSWORD = "test-password-abc";
const HASHED_PASSWORD = bcrypt.hashSync(CORRECT_PASSWORD, 1);

const mockUser = {
  id: "user-1",
  name: "Alice",
  email: "alice@example.com",
  password: HASHED_PASSWORD,
  role: "STAFF",
};

describe("auth — authorize", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns null when credentials are absent", async () => {
    expect(await authorize(undefined)).toBeNull();
  });

  it("returns null when email or password is empty", async () => {
    expect(await authorize({ email: "", password: "pw" })).toBeNull();
    expect(await authorize({ email: "a@b.com", password: "" })).toBeNull();
  });

  it("returns null when user is not found in DB", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    const result = await authorize({ email: "nobody@example.com", password: "pw" });
    expect(result).toBeNull();
  });

  it("returns null when password does not match", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
    const result = await authorize({ email: mockUser.email, password: "wrong-password" });
    expect(result).toBeNull();
  });

  it("returns user object when credentials are valid", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
    const result = await authorize({ email: mockUser.email, password: CORRECT_PASSWORD });
    expect(result).toEqual({
      id: mockUser.id,
      name: mockUser.name,
      email: mockUser.email,
      role: mockUser.role,
    });
  });
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const jwtCallback = authOptions.callbacks!.jwt! as (args: any) => any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sessionCallback = authOptions.callbacks!.session! as (args: any) => any;

describe("auth — jwt callback", () => {
  it("adds role to token when user is present", () => {
    const token: JWT = { sub: "user-1" };
    const user = { id: "user-1", name: "Alice", email: "a@b.com", role: "ADMIN" };
    const result = jwtCallback({ token, user });
    expect(result.role).toBe("ADMIN");
  });

  it("leaves token unchanged when user is absent", () => {
    const token: JWT = { sub: "user-1", role: "STAFF" };
    const result = jwtCallback({ token, user: undefined });
    expect(result).toEqual(token);
  });
});

describe("auth — session callback", () => {
  it("maps token sub and role onto session.user", () => {
    const token: JWT = { sub: "user-1", role: "ADMIN" };
    const session: Session = {
      user: { name: "Alice", email: "a@b.com" },
      expires: "2099-01-01",
    };
    const result = sessionCallback({ session, token });
    expect(result.user.id).toBe("user-1");
    expect(result.user.role).toBe("ADMIN");
  });

  it("returns session unchanged when session.user is absent", () => {
    const token: JWT = { sub: "user-1", role: "ADMIN" };
    const session = { expires: "2099-01-01" } as Session;
    const result = sessionCallback({ session, token });
    expect(result).toEqual(session);
  });
});
