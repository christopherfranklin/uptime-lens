# Phase 02: Authentication - Research

**Researched:** 2026-03-06
**Domain:** Passwordless magic link authentication, session management, Next.js 16 auth patterns
**Confidence:** HIGH

## Summary

This phase implements passwordless magic link authentication for Uptime Lens using Better Auth as the auth library with a Drizzle ORM adapter on Neon PostgreSQL. Better Auth (v1.5.x) is the recommended choice over Auth.js/NextAuth or custom solutions: it is actively maintained (Lucia Auth was deprecated in March 2025), has first-class Drizzle adapter support, built-in magic link plugin, email change verification, and database-backed session management with sliding window expiry -- all requirements of this phase.

The architecture uses server-side database sessions (not JWTs) stored in a `session` table, with an encrypted session cookie for optimistic proxy-level checks. Next.js 16's `proxy.ts` (renamed from `middleware.ts`) handles route protection via lightweight cookie existence checks, while actual session validation happens in Server Components and Server Actions via a Data Access Layer (DAL). Email sending uses the existing Resend client with React Email templates for branded magic link emails.

**Primary recommendation:** Use Better Auth v1.5.x with magic link plugin, Drizzle adapter (provider: "pg"), and `nextCookies` plugin for the complete auth stack.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Link expiry: 10 minutes
- Expired/used link: show clear error message with a one-click "Resend" button (no redirect, no auto-resend)
- Signup and login are the same flow -- one page, enter email, get link. New email = create account, existing email = log in
- Email design: minimal branded -- logo, one line of text ("Click to sign in to Uptime Lens"), big green button, footer with "didn't request this?" note
- Always redirect to /dashboard after magic link click
- First-time users see empty dashboard with "Create your first monitor" prompt (no onboarding flow)
- No name collection during signup -- email only, zero friction
- Unauthenticated users hitting protected routes get redirected to /login (no return URL tracking)
- Landing page header shows just "Sign in" (single button, not sign in + sign up)
- 30-day sessions with sliding window -- each visit resets the clock
- Multi-device: allowed, each device gets its own independent session
- After logout: redirect to landing page (/)
- Verify new email first: user enters new email, magic link sent to NEW address, click confirms the change
- Old email stays active until new email is verified (prevents lockout from typos)
- Existing sessions stay active after email change (session tied to user ID, not email)
- Email change lives on a /settings page
- Phase 2 settings page includes only: email change + logout button
- Other settings (notifications, billing) added in their respective phases

### Claude's Discretion
- Auth library choice (NextAuth/Auth.js, Lucia, or custom) -- **Decided: Better Auth**
- Session storage strategy (JWT vs server-side DB sessions) -- **Decided: Server-side DB sessions**
- Token generation and hashing approach -- **Decided: Better Auth built-in (hashed storage)**
- Middleware vs per-page auth checks -- **Decided: proxy.ts for optimistic checks + DAL for secure checks**
- Login page design within the established brand (green/teal, Stripe-inspired)
- Settings page layout
- Magic link sender address (e.g., login@uptimelens.io)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-01 | User can sign up and log in via magic link (passwordless email) | Better Auth magic link plugin provides unified sign-up/sign-in flow. `sendMagicLink` callback integrates with Resend. `expiresIn: 600` for 10-minute expiry. |
| AUTH-02 | User session persists across browser refresh | Better Auth DB sessions with `expiresIn: 2592000` (30 days) and `updateAge: 86400` (1 day) sliding window. Session stored in httpOnly cookie. |
| AUTH-03 | User can log out from any page | Better Auth `authClient.signOut()` clears session cookie and DB record. Logout Server Action + redirect to `/`. |
| AUTH-04 | User can change their email address | Better Auth `user.changeEmail` config with verification email sent to new address. `updateEmailWithoutVerification: false` enforced. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| better-auth | ^1.5.4 | Auth framework | Active, TS-first, Drizzle adapter, magic link plugin, email change built-in |
| better-auth/plugins (magicLink) | (bundled) | Magic link auth | Built-in plugin, handles token generation, hashing, expiry, verification |
| better-auth/adapters/drizzle | (bundled) | DB adapter | First-class Drizzle support with schema generation CLI |
| better-auth/next-js | (bundled) | Next.js integration | `toNextJsHandler`, `nextCookies` plugin for Server Actions |
| better-auth/react | (bundled) | Client hooks | `createAuthClient`, `useSession`, reactive state via nano-store |

### Supporting (already installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @react-email/components | ^1.0.8 | Email templates | Magic link email, email change verification email |
| resend | ^6.9.3 | Email sending | `sendMagicLink` callback, already configured in `lib/email/resend.ts` |
| drizzle-orm | ^0.45.1 | Database ORM | Auth tables, user queries, session storage |
| @neondatabase/serverless | ^1.0.2 | DB driver | Neon PostgreSQL connection |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Better Auth | Auth.js v5 | Auth.js has broader provider ecosystem but more complex configuration for custom magic link emails; Drizzle adapter requires manually defined schema tables |
| Better Auth | Custom auth (Lucia patterns) | Lucia deprecated March 2025; custom implementation viable but requires hand-rolling session management, CSRF protection, token hashing |
| DB sessions | Stateless JWT | JWTs can't be revoked server-side without a blocklist; DB sessions enable instant logout, session listing, and are recommended for this use case |

**Installation:**
```bash
npm install better-auth
```

No separate adapter packages needed -- `better-auth/adapters/drizzle`, `better-auth/plugins`, `better-auth/react`, and `better-auth/next-js` are all bundled exports.

## Architecture Patterns

### Recommended Project Structure
```
lib/
  auth.ts                    # Better Auth server instance (betterAuth config)
  auth-client.ts             # Better Auth client instance (createAuthClient)
  dal.ts                     # Data Access Layer (verifySession, getUser)
  email/
    resend.ts                # Existing Resend client (reuse)
    templates/
      magic-link.tsx         # React Email template for magic link
      email-change.tsx       # React Email template for email change verification
  db/
    schema.ts                # Extended with Better Auth tables (session, account, verification)
    index.ts                 # Existing DB client (reuse)
app/
  proxy.ts                   # Route protection (optimistic cookie check)
  api/
    auth/
      [...all]/route.ts      # Better Auth API handler
  (auth)/
    login/page.tsx           # Login page (email input + magic link flow)
    verify/page.tsx          # Magic link verification landing page (handles token from URL)
  (dashboard)/
    layout.tsx               # Authenticated layout with nav + logout
    dashboard/page.tsx       # Dashboard (empty state for new users)
    settings/page.tsx        # Settings page (email change + logout)
```

### Pattern 1: Better Auth Server Configuration
**What:** Central auth instance with magic link, Drizzle adapter, session config
**When to use:** Single server-side config file, imported by API route and DAL
**Example:**
```typescript
// lib/auth.ts
// Source: https://better-auth.com/docs/installation
import { betterAuth } from "better-auth";
import { magicLink } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/lib/db";
import { resend } from "@/lib/email/resend";
import { render } from "@react-email/components";
import MagicLinkEmail from "@/lib/email/templates/magic-link";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    usePlural: true,  // match existing "users" table naming
  }),
  session: {
    expiresIn: 60 * 60 * 24 * 30,  // 30 days
    updateAge: 60 * 60 * 24,        // refresh every 1 day (sliding window)
  },
  user: {
    changeEmail: {
      enabled: true,
      // Verification email sent to NEW email address by default
    },
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url, token }, request) => {
      // Used for email change verification
      void resend.emails.send({
        from: "Uptime Lens <login@uptimelens.io>",
        to: user.email,
        subject: "Verify your new email for Uptime Lens",
        react: EmailChangeTemplate({ url }),
      });
    },
  },
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        void resend.emails.send({
          from: "Uptime Lens <login@uptimelens.io>",
          to: email,
          subject: "Sign in to Uptime Lens",
          react: MagicLinkEmail({ url }),
        });
      },
      expiresIn: 600, // 10 minutes per user decision
    }),
    nextCookies(), // MUST be last plugin
  ],
});
```

### Pattern 2: Next.js 16 Proxy for Route Protection
**What:** Lightweight cookie-existence check in proxy.ts, no DB calls
**When to use:** Every request to protected routes
**Example:**
```typescript
// proxy.ts
// Source: https://nextjs.org/docs/app/guides/authentication
import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const protectedRoutes = ["/dashboard", "/settings"];
const authRoutes = ["/login", "/verify"];

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const sessionCookie = getSessionCookie(request);

  // Redirect unauthenticated users away from protected routes
  if (protectedRoutes.some((route) => path.startsWith(route)) && !sessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Redirect authenticated users away from auth routes
  if (authRoutes.some((route) => path.startsWith(route)) && sessionCookie) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\.png$).*)"],
};
```

### Pattern 3: Data Access Layer (DAL) for Secure Session Checks
**What:** Server-side session validation with DB lookup, memoized per request
**When to use:** In Server Components and Server Actions that need authenticated user data
**Example:**
```typescript
// lib/dal.ts
// Source: https://nextjs.org/docs/app/guides/authentication
import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export const verifySession = cache(async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  return session;
});

export const getOptionalSession = cache(async () => {
  return auth.api.getSession({
    headers: await headers(),
  });
});
```

### Pattern 4: Better Auth API Route Handler
**What:** Catch-all route that handles all Better Auth API endpoints
**When to use:** Single file, handles sign-in, sign-out, session, email change, verification
**Example:**
```typescript
// app/api/auth/[...all]/route.ts
// Source: https://better-auth.com/docs/integrations/next
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
```

### Anti-Patterns to Avoid
- **Auth checks in layouts:** Layouts don't re-render on navigation in Next.js App Router. Do auth checks in page components or leaf components, not in `layout.tsx`.
- **DB calls in proxy.ts:** Proxy runs on every request (including prefetches). Only do cookie existence checks there. Full session validation belongs in DAL.
- **Storing session tokens in localStorage:** Always use httpOnly secure cookies. Better Auth handles this automatically.
- **Awaiting email sends in auth callbacks:** Use `void` to fire-and-forget email sends. Awaiting creates timing attack vectors and slows the response.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Magic link token generation | Custom crypto.randomBytes + hashing | Better Auth `magicLink` plugin | Handles token generation, hashing, expiry, single-use enforcement, rate limiting |
| Session management | Custom session table + cookie logic | Better Auth DB sessions | Handles creation, refresh, sliding window, expiry, revocation, multi-device |
| CSRF protection | Custom token middleware | Better Auth built-in | Automatic CSRF protection on state-mutating endpoints |
| Email change verification | Custom verification token flow | Better Auth `user.changeEmail` | Handles verification token, email swap, session preservation |
| Auth API endpoints | Custom route handlers for login/logout/session | Better Auth catch-all handler | Single `[...all]/route.ts` handles 15+ auth endpoints |
| Cookie security | Manual httpOnly/secure/sameSite settings | Better Auth cookie management | Secure defaults, configurable via `advanced.cookies` |

**Key insight:** Auth is deceptively complex -- token timing attacks, session fixation, CSRF, cookie security, and email verification edge cases are all solved problems in Better Auth. Custom implementations invariably miss at least one of these.

## Common Pitfalls

### Pitfall 1: Better Auth Schema Conflicts with Existing Users Table
**What goes wrong:** Better Auth expects specific columns (id as string, emailVerified boolean) that differ from the existing `users` table (id as integer, no emailVerified).
**Why it happens:** Better Auth's default schema uses string IDs; the project already has integer auto-increment IDs.
**How to avoid:** Use `usePlural: true` in the Drizzle adapter config to match existing `users` table name. Run `npx auth@latest generate` to see what schema additions are needed, then manually adjust the generated schema to integrate with existing tables. May need to add `emailVerified` column to existing users table and adjust the id type mapping.
**Warning signs:** Migration errors, "column not found" errors, type mismatches between Better Auth expectations and existing schema.

### Pitfall 2: proxy.ts vs middleware.ts in Next.js 16
**What goes wrong:** Using `middleware.ts` instead of `proxy.ts` causes deprecation warnings or doesn't work as expected.
**Why it happens:** Next.js 16 renamed `middleware.ts` to `proxy.ts`. The function export must be named `proxy` (or default export), not `middleware`.
**How to avoid:** Create `proxy.ts` at project root with `export function proxy(request: NextRequest)`. Use Next.js codemod if migrating: `npx @next/codemod@latest upgrade`.
**Warning signs:** File named `middleware.ts` not being picked up, deprecation warnings in console.

### Pitfall 3: nextCookies Plugin Order
**What goes wrong:** Cookies don't get set properly in Server Actions, causing session creation to fail silently.
**Why it happens:** The `nextCookies()` plugin must be the LAST plugin in the plugins array.
**How to avoid:** Always place `nextCookies()` at the end of the plugins array.
**Warning signs:** Login appears to succeed but session cookie is not set, user redirected back to login.

### Pitfall 4: Awaiting Email Sends in Auth Callbacks
**What goes wrong:** Auth responses are slow (500ms+) and vulnerable to timing attacks that reveal whether an email exists.
**Why it happens:** The `sendMagicLink` callback awaits the Resend API call.
**How to avoid:** Use `void resend.emails.send(...)` (fire-and-forget) instead of `await resend.emails.send(...)`.
**Warning signs:** Slow login form responses, observable timing differences between existing and non-existing emails.

### Pitfall 5: Layout Auth Checks Not Re-Running on Navigation
**What goes wrong:** User logs out on another tab, but protected layout still renders because Next.js doesn't re-render layouts on client navigation.
**Why it happens:** Next.js App Router partial rendering optimization -- layouts persist across navigations.
**How to avoid:** Do auth checks in page-level Server Components (via DAL `verifySession()`), not in layout components. proxy.ts handles the coarse redirect.
**Warning signs:** Stale session data visible after logout on another device.

### Pitfall 6: Better Auth ID Type Mismatch
**What goes wrong:** Better Auth generates string UUIDs for IDs by default, but existing schema uses integer auto-increment.
**Why it happens:** Better Auth's core schema uses `string` type IDs.
**How to avoid:** When generating the Drizzle schema with `npx auth@latest generate`, review and align ID types. Better Auth supports custom ID generation. The existing `users` table uses `integer().primaryKey().generatedAlwaysAsIdentity()` -- ensure the adapter schema maps correctly.
**Warning signs:** Foreign key constraint errors, type casting errors in queries.

## Code Examples

### Magic Link Login Page
```typescript
// app/(auth)/login/page.tsx
"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await authClient.signIn.magicLink({
      email,
      callbackURL: "/dashboard",
    });

    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  }

  if (sent) {
    return (
      <div>
        <h1>Check your email</h1>
        <p>We sent a magic link to {email}</p>
        <button onClick={() => { setSent(false); handleSubmit(new Event("submit") as any); }}>
          Resend link
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1>Sign in to Uptime Lens</h1>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        required
      />
      {error && <p className="text-red-500">{error}</p>}
      <button type="submit" disabled={loading}>
        {loading ? "Sending..." : "Send magic link"}
      </button>
    </form>
  );
}
```

### Better Auth Client Setup
```typescript
// lib/auth-client.ts
// Source: https://better-auth.com/docs/integrations/next
import { createAuthClient } from "better-auth/react";
import { magicLinkClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [magicLinkClient()],
});
```

### Logout Server Action
```typescript
// app/actions/auth.ts
"use server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export async function logout() {
  await auth.api.signOut({
    headers: await headers(),
  });
  redirect("/");
}
```

### Email Change on Settings Page
```typescript
// Settings page email change (client component)
const { error } = await authClient.changeEmail({
  newEmail: "new@example.com",
  callbackURL: "/settings",
});
```

### React Email Magic Link Template
```typescript
// lib/email/templates/magic-link.tsx
// Source: https://react.email/docs
import {
  Body,
  Button,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface MagicLinkEmailProps {
  url: string;
}

export default function MagicLinkEmail({ url }: MagicLinkEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Sign in to Uptime Lens</Preview>
      <Body style={{ backgroundColor: "#f6f9fc", fontFamily: "sans-serif" }}>
        <Container style={{ margin: "0 auto", padding: "40px 20px", maxWidth: "560px" }}>
          <Section style={{ backgroundColor: "#ffffff", borderRadius: "8px", padding: "40px" }}>
            <Text style={{ fontSize: "24px", fontWeight: "bold", color: "#0f172a" }}>
              UL
            </Text>
            <Text style={{ fontSize: "16px", color: "#334155" }}>
              Click to sign in to Uptime Lens
            </Text>
            <Button
              href={url}
              style={{
                backgroundColor: "#10b981",
                color: "#ffffff",
                padding: "12px 24px",
                borderRadius: "6px",
                fontSize: "16px",
                fontWeight: "600",
                textDecoration: "none",
                display: "inline-block",
              }}
            >
              Sign in
            </Button>
            <Text style={{ fontSize: "12px", color: "#94a3b8", marginTop: "24px" }}>
              If you didn't request this email, you can safely ignore it.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| middleware.ts | proxy.ts | Next.js 16 (2025) | Must use proxy.ts; proxy runs on Node.js runtime (not Edge) |
| Lucia Auth | Better Auth / Custom | March 2025 | Lucia deprecated; Better Auth is recommended successor |
| NextAuth v4 | Auth.js v5 | 2024 | Auth.js v5 stable but still complex for simple use cases |
| Edge Runtime middleware | Node.js Runtime proxy | Next.js 16 (2025) | proxy.ts runs on Node.js, can do full DB session validation (though not recommended for perf) |
| JWT-only sessions | DB sessions + cookie cache | 2024-2025 | DB sessions preferred for revocability; cookie cache optional for perf |

**Deprecated/outdated:**
- `middleware.ts` in Next.js 16 -- use `proxy.ts` instead
- Lucia Auth -- deprecated March 2025; use Better Auth or custom
- `useFormState` -- renamed to `useActionState` in React 19

## Open Questions

1. **Better Auth ID type compatibility with existing users table**
   - What we know: Existing users table uses `integer().primaryKey().generatedAlwaysAsIdentity()`. Better Auth default schema uses string IDs.
   - What's unclear: Whether Better Auth's Drizzle adapter can work with integer IDs without friction, or if migration to string/UUID IDs is needed.
   - Recommendation: Run `npx auth@latest generate` to inspect the generated schema, then manually reconcile with existing schema. If integer IDs cause issues, consider adding Better Auth's own user table alongside existing users with a mapping, though this adds complexity. Test this first during implementation.

2. **Resend sender domain verification**
   - What we know: Resend requires verified sender domains. The project has Resend configured with API key.
   - What's unclear: Whether the sender domain (e.g., uptimelens.io) is configured and verified in Resend.
   - Recommendation: Use `onboarding@resend.dev` for development/testing. Production sender address needs domain verification in Resend dashboard.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^4.0.18 |
| Config file | vitest.config.mts |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | Magic link login creates/finds user and creates session | unit | `npx vitest run tests/auth/magic-link.test.ts -x` | Wave 0 |
| AUTH-01 | Auth API route exports GET and POST handlers | unit | `npx vitest run tests/auth/api-route.test.ts -x` | Wave 0 |
| AUTH-02 | Session persists (cookie set with correct options) | unit | `npx vitest run tests/auth/session.test.ts -x` | Wave 0 |
| AUTH-03 | Logout clears session | unit | `npx vitest run tests/auth/logout.test.ts -x` | Wave 0 |
| AUTH-04 | Email change flow sends verification | unit | `npx vitest run tests/auth/email-change.test.ts -x` | Wave 0 |
| AUTH-01 | Login page renders and submits | unit | `npx vitest run tests/auth/login-page.test.tsx -x` | Wave 0 |
| AUTH-03 | Settings page renders logout button | unit | `npx vitest run tests/auth/settings-page.test.tsx -x` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/auth/magic-link.test.ts` -- covers AUTH-01 (auth config exports, magic link plugin presence)
- [ ] `tests/auth/api-route.test.ts` -- covers AUTH-01 (API route exports GET/POST)
- [ ] `tests/auth/session.test.ts` -- covers AUTH-02 (session config values)
- [ ] `tests/auth/logout.test.ts` -- covers AUTH-03 (logout action exports)
- [ ] `tests/auth/email-change.test.ts` -- covers AUTH-04 (changeEmail config present)
- [ ] `tests/auth/login-page.test.tsx` -- covers AUTH-01 (login page renders)
- [ ] `tests/auth/settings-page.test.tsx` -- covers AUTH-03/AUTH-04 (settings page renders)

## Sources

### Primary (HIGH confidence)
- [Next.js 16 Authentication Guide](https://nextjs.org/docs/app/guides/authentication) -- session management, proxy.ts auth patterns, DAL pattern, cookie configuration
- [Next.js 16 Proxy Documentation](https://nextjs.org/docs/app/getting-started/proxy) -- proxy.ts convention, matcher config, runtime
- [Better Auth Installation](https://better-auth.com/docs/installation) -- setup, Drizzle adapter, Next.js integration
- [Better Auth Magic Link Plugin](https://better-auth.com/docs/plugins/magic-link) -- magic link API, configuration, sendMagicLink callback
- [Better Auth Drizzle Adapter](https://better-auth.com/docs/adapters/drizzle) -- adapter config, usePlural, custom table names
- [Better Auth Session Management](https://better-auth.com/docs/concepts/session-management) -- expiresIn, updateAge, cookie cache, sliding window
- [Better Auth Next.js Integration](https://better-auth.com/docs/integrations/next) -- proxy.ts, server components, nextCookies plugin
- [Better Auth Users & Accounts](https://better-auth.com/docs/concepts/users-accounts) -- changeEmail config, verification flow
- [Better Auth Email Configuration](https://better-auth.com/docs/concepts/email) -- sendVerificationEmail, email change verification
- [Better Auth Database Schema](https://better-auth.com/docs/concepts/database) -- core tables (user, session, account, verification)

### Secondary (MEDIUM confidence)
- [Better Auth npm](https://www.npmjs.com/package/better-auth) -- v1.5.4 latest, actively maintained
- [Lucia Auth deprecation](https://github.com/lucia-auth/lucia/discussions/1707) -- deprecated March 2025, Better Auth recommended
- [Next.js 16 Middleware to Proxy rename](https://nextjs.org/docs/messages/middleware-to-proxy) -- migration guide

### Tertiary (LOW confidence)
- None -- all critical findings verified with official documentation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- Better Auth official docs verified all features needed (magic link, Drizzle, email change, session config)
- Architecture: HIGH -- Next.js 16 official auth guide provides exact patterns (proxy.ts, DAL, Server Components)
- Pitfalls: HIGH -- schema compatibility concern documented with mitigation, proxy.ts naming verified with official docs

**Research date:** 2026-03-06
**Valid until:** 2026-04-06 (30 days -- stable libraries, well-documented APIs)
