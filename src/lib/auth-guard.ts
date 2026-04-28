import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { authOptions } from "./auth";
import type { Role } from "./roles";

type AuthOk = { ok: true; session: Session };
type AuthErr = { ok: false; response: NextResponse };
export type AuthResult = AuthOk | AuthErr;

/** Requires a valid session. Returns 401 if not authenticated. */
export async function requireAuth(): Promise<AuthResult> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { ok: true, session };
}

/** Requires a valid session with a specific role. Returns 403 if not authenticated or wrong role. */
export async function requireRole(role: Role): Promise<AuthResult> {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== role) {
    return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { ok: true, session };
}
