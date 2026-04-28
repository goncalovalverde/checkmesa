# Auth Flow — Sequence Diagram

Covers three distinct protection layers:

1. **Login** — credential verification with brute-force rate limiting (`src/lib/auth.ts`)
2. **Page protection** — JWT presence and role-based redirect (`middleware.ts`)
3. **API protection** — centralised session guard (`src/lib/auth-guard.ts`)

---

## 1 · Login Flow

```mermaid
sequenceDiagram
    actor User as Staff / Admin
    participant Browser
    participant NextAuth as NextAuth (/api/auth)
    participant AuthTS as auth.ts (CredentialsProvider)
    participant RateLimit as Rate Limiter (in-memory)
    participant DB as SQLite (via Prisma)

    User->>Browser: Submit login form (email + password)
    Browser->>NextAuth: POST /api/auth/callback/credentials
    NextAuth->>AuthTS: authorize(credentials)
    AuthTS->>RateLimit: checkLoginRateLimit(email)
    alt > 10 attempts / 60 s
        RateLimit-->>AuthTS: blocked
        AuthTS-->>Browser: Error — too many attempts (429 behaviour)
    else Within limit
        RateLimit-->>AuthTS: allowed
        AuthTS->>DB: SELECT User WHERE email = ?
        DB-->>AuthTS: User record (or null)
        alt User not found
            AuthTS-->>Browser: null → NextAuth 401
        else User found
            AuthTS->>AuthTS: bcrypt.compare(password, hash)
            alt Invalid password
                AuthTS-->>Browser: null → NextAuth 401
            else Valid password
                AuthTS-->>NextAuth: { id, name, email, role }
                NextAuth-->>Browser: Set-Cookie: next-auth.session-token (JWT, 8 h)
            end
        end
    end
```

---

## 2 · Page Protection (middleware.ts)

```mermaid
sequenceDiagram
    actor User as Staff / Admin
    participant Browser
    participant Middleware as middleware.ts (Edge)
    participant Page as Next.js Page

    User->>Browser: Navigate to /sala or /admin
    Browser->>Middleware: GET /sala or /admin
    Middleware->>Middleware: withAuth — verify JWT token
    alt No valid token
        Middleware-->>Browser: Redirect → /login
    else Token present
        Middleware->>Middleware: Read role from JWT
        alt path starts /admin AND role ≠ ADMIN
            Middleware-->>Browser: Redirect → /sala
        else Authorised
            Middleware-->>Page: NextResponse.next()
            Page-->>Browser: Render page
        end
    end
```

---

## 3 · API Protection (auth-guard.ts)

All API route handlers use one of two guard functions from `src/lib/auth-guard.ts`
instead of duplicating session checks inline.

```mermaid
sequenceDiagram
    participant Client as Browser / fetch()
    participant Route as API Route Handler
    participant Guard as auth-guard.ts
    participant NextAuth as getServerSession()
    participant Handler as Business Logic + Prisma

    Client->>Route: HTTP request (GET / POST / PATCH / DELETE)
    Route->>Guard: requireAuth() or requireRole("ADMIN")
    Guard->>NextAuth: getServerSession(authOptions)
    NextAuth-->>Guard: Session | null

    alt requireAuth — no session
        Guard-->>Route: { ok: false, response: 401 Unauthorized }
        Route-->>Client: 401
    else requireRole — no session OR role ≠ ADMIN
        Guard-->>Route: { ok: false, response: 403 Forbidden }
        Route-->>Client: 403
    else Authorised
        Guard-->>Route: { ok: true, session }
        Route->>Handler: Execute business logic
        Handler-->>Route: Result
        Route-->>Client: 200 / 201 / 204
    end
```

> **AuthResult discriminated union:**
> ```typescript
> type AuthResult =
>   | { ok: true;  session: Session   }
>   | { ok: false; response: NextResponse }
> ```
> Routes check `if (!auth.ok) return auth.response;` — no `instanceof` fragility.
