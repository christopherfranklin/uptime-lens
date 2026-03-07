# Phase 2: Authentication - Context

**Gathered:** 2026-03-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can create accounts and securely access the application via passwordless magic link email. Covers signup/login, persistent sessions, logout, and email change. No OAuth, no social login, no team/multi-user accounts.

</domain>

<decisions>
## Implementation Decisions

### Magic link experience
- Link expiry: 10 minutes
- Expired/used link: show clear error message with a one-click "Resend" button (no redirect, no auto-resend)
- Signup and login are the same flow — one page, enter email, get link. New email = create account, existing email = log in
- Email design: minimal branded — logo, one line of text ("Click to sign in to Uptime Lens"), big green button, footer with "didn't request this?" note

### Post-login destination
- Always redirect to /dashboard after magic link click
- First-time users see empty dashboard with "Create your first monitor" prompt (no onboarding flow)
- No name collection during signup — email only, zero friction
- Unauthenticated users hitting protected routes get redirected to /login (no return URL tracking)
- Landing page header shows just "Sign in" (single button, not sign in + sign up)

### Session duration
- 30-day sessions with sliding window — each visit resets the clock
- Multi-device: allowed, each device gets its own independent session
- After logout: redirect to landing page (/)

### Email change flow
- Verify new email first: user enters new email, magic link sent to NEW address, click confirms the change
- Old email stays active until new email is verified (prevents lockout from typos)
- Existing sessions stay active after email change (session tied to user ID, not email)
- Email change lives on a /settings page

### Settings page scope
- Phase 2 settings page includes only: email change + logout button
- Other settings (notifications, billing) added in their respective phases

### Claude's Discretion
- Auth library choice (NextAuth/Auth.js, Lucia, or custom)
- Session storage strategy (JWT vs server-side DB sessions)
- Token generation and hashing approach
- Middleware vs per-page auth checks
- Login page design within the established brand (green/teal, Stripe-inspired)
- Settings page layout
- Magic link sender address (e.g., login@uptimelens.io)

</decisions>

<specifics>
## Specific Ideas

- Single unified auth flow (enter email, get link) is key — no "already have an account?" friction
- Empty dashboard state for first-time users should guide them to create their first monitor
- Minimal branded email keeps deliverability high and scannability fast

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/email/resend.ts`: Resend client ready for sending magic link emails (uses Proxy pattern for lazy init)
- `lib/db/schema.ts`: `users` table with id, email, name, timestamps — needs session/token table additions
- `lib/db/index.ts`: Database client with Proxy pattern for lazy initialization
- `app/(marketing)/layout.tsx`: Route group pattern established for public pages

### Established Patterns
- Proxy pattern for lazy client initialization (db, Resend) — follow same for auth clients
- Route groups for page organization: `(marketing)` exists, auth pages likely `(auth)` or similar
- shadcn/ui + Tailwind v4 for UI components
- Biome for linting/formatting
- Base UI Button with `nativeButton={false}` when rendered as Link elements

### Integration Points
- Landing page header needs "Sign in" button linking to /login
- New route group needed for authenticated pages (dashboard, settings)
- Database schema needs session/token tables added alongside existing users table
- Resend client reused for magic link email sending

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-authentication*
*Context gathered: 2026-03-06*
