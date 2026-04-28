# ADR-0004: Centralised Auth Guard (`auth-guard.ts`)

**Date:** 2026-04-28
**Status:** Accepted
**Deciders:** Lead Engineer

---

## Context

Every API route handler in `src/app/api/` previously duplicated the same two-line session check:

```typescript
// Pattern A — auth required
const session = await getServerSession(authOptions);
if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

// Pattern B — admin role required
const session = await getServerSession(authOptions);
if (!session || (session.user as { role?: string }).role !== "ADMIN") {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
```

This pattern appeared in **14 route files**, creating:
- A single-responsibility violation (every handler owned its own auth logic)
- Risk of divergence (one handler could silently use a different status code or message)
- Friction for future changes (e.g. adding audit logging or a new role would require 14 edits)

This was identified during a security audit and marked as a Maintenance Review refactor candidate.

---

## Decision

Introduce `src/lib/auth-guard.ts` as the single point of API route authentication and authorisation.

### API

```typescript
type Role = "ADMIN" | "STAFF";

type AuthResult =
  | { ok: true;  session: Session }
  | { ok: false; response: NextResponse };

requireAuth(): Promise<AuthResult>      // 401 if unauthenticated
requireRole(role: Role): Promise<AuthResult>  // 403 if unauthenticated or wrong role
```

### Usage in route handlers

```typescript
const auth = await requireRole("ADMIN");
if (!auth.ok) return auth.response;
// auth.session is fully typed from here
```

### Design choices

| Choice | Rationale |
|--------|-----------|
| Discriminated union (`ok: true/false`) | Avoids `instanceof NextResponse` fragility; narrows type cleanly without casting |
| Typed `Role = "ADMIN" \| "STAFF"` | Invalid role strings are a compile-time error |
| `requireRole` returns 403 for both unauthenticated and wrong-role | Preserves existing API behaviour; avoids leaking auth status to callers |
| Kept in `src/lib/` (not a middleware) | Auth guard runs server-side in Node.js route handlers, not Edge — keeping it as a plain async function avoids Edge runtime constraints |

---

## Consequences

### Positive
- Auth logic lives in **one place** — status codes, error messages, and future enhancements (audit logging, IP checks) need one edit
- 14 files simplified; no more unsafe `(session.user as { role?: string })` cast scattered through the codebase
- Fully covered by unit tests (`src/lib/auth-guard.test.ts`, 5 test cases)

### Negative / Trade-offs
- One additional async call indirection per route (negligible overhead — `getServerSession` reads a cookie, no DB hit)
- A bug in `auth-guard.ts` now affects all 14 routes simultaneously (mitigated by unit tests and the reduced surface area)

---

## Alternatives Considered

| Alternative | Rejected because |
|-------------|-----------------|
| Next.js middleware role check for all API routes | Middleware runs on Edge; `getServerSession` requires Node.js context |
| Higher-order route wrapper (`withAuth(handler)`) | More complex generic typing; harder to access `session` inside the handler body |
| Keep inline checks | Violates SRP; 14 divergence points |

---

## Related

- `src/lib/auth-guard.ts`
- `src/lib/auth-guard.test.ts`
- `docs/diagrams/auth-sequence.md` — updated to show all three protection layers
- `docs/diagrams/component.md` — updated to include `auth-guard.ts` node
- ADR-0003 (Test Suite) — unit tests added for the guard
