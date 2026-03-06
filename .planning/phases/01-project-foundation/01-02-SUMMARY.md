---
phase: 01-project-foundation
plan: 02
subsystem: ui, email
tags: [next.js, landing-page, resend, email, shadcn-ui, tailwind-v4, marketing]

# Dependency graph
requires:
  - phase: 01-project-foundation (plan 01)
    provides: Next.js scaffold, shadcn/ui components (Button, Card, Badge), Tailwind v4 brand palette
provides:
  - Marketing landing page at / with hero, features, pricing, and footer
  - Resend email client singleton (lazy-initialized via Proxy)
  - Test email API route at POST /api/email/test
  - Marketing route group layout (app/(marketing))
affects: [01-03-PLAN, 02-auth (magic link emails), 05-alerting (email alerts)]

# Tech tracking
tech-stack:
  added: []
  patterns: [Proxy-based lazy Resend client, marketing route group for public pages, composable landing page sections]

key-files:
  created: [app/(marketing)/layout.tsx, app/(marketing)/page.tsx, components/landing/hero.tsx, components/landing/features.tsx, components/landing/pricing.tsx, components/landing/footer.tsx, lib/email/resend.ts, app/api/email/test/route.ts, tests/email/resend.test.ts]
  modified: [app/page.tsx (deleted)]

key-decisions:
  - "Used Proxy pattern for Resend client (same as db client) to avoid build crash when RESEND_API_KEY is not set"
  - "Deleted app/page.tsx in favor of app/(marketing)/page.tsx route group to serve landing page at /"

patterns-established:
  - "Lazy service clients: all external service clients use Proxy pattern for safe build-time imports"
  - "Marketing route group: app/(marketing) for public-facing pages without dashboard chrome"
  - "Landing page composition: separate component files per section, composed in page.tsx"

requirements-completed: []

# Metrics
duration: 8min
completed: 2026-03-06
---

# Phase 1 Plan 02: Landing Page & Email Summary

**Stripe-inspired marketing landing page with price comparison hook ($5/mo vs $34/mo), two-tier pricing, and Resend email infrastructure with test API route**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-06T23:18:17Z
- **Completed:** 2026-03-06T23:27:06Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- Built polished marketing landing page with hero, features grid, pricing tiers, and footer using brand colors and Stripe-inspired design
- Set up Resend email client with lazy Proxy initialization and POST /api/email/test endpoint
- All 9 tests passing (7 schema + 2 email), build succeeds

## Task Commits

Each task was committed atomically:

1. **Task 1: Build marketing landing page with Stripe-inspired design** - `cd52698` (feat)
2. **Task 2: Set up Resend email client and test API route** - `e092249` (feat)

## Files Created/Modified
- `app/(marketing)/layout.tsx` - Marketing route group layout with nav header (product name + login link)
- `app/(marketing)/page.tsx` - Landing page composing Hero, Features, Pricing, Footer sections
- `components/landing/hero.tsx` - Hero section with gradient background, price comparison hook, dual CTAs
- `components/landing/features.tsx` - 4-card feature grid (multi-protocol, 3-min checks, alerts, charts)
- `components/landing/pricing.tsx` - Two-tier pricing (Starter $5/mo, Pro $9/mo) with feature checklists
- `components/landing/footer.tsx` - Simple footer with branding and placeholder links
- `lib/email/resend.ts` - Lazy-initialized Resend client singleton via Proxy pattern
- `app/api/email/test/route.ts` - POST endpoint to send test email with HTML body
- `tests/email/resend.test.ts` - Tests for Resend client exports and route handler
- `app/page.tsx` - Deleted (replaced by marketing route group)

## Decisions Made
- Used Proxy pattern for Resend client (consistent with db client from Plan 01) to avoid `new Resend(undefined)` crash during build when RESEND_API_KEY is not set
- Deleted root `app/page.tsx` so `app/(marketing)/page.tsx` serves as the root `/` route without conflict
- Used inline SVG for check icons in pricing cards to avoid adding an icon library dependency
- Used emoji icons for feature cards (plan specified "use simple Unicode/emoji or plain text icons -- no icon library needed")

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Resend client crash when RESEND_API_KEY is undefined**
- **Found during:** Task 2 (build verification)
- **Issue:** `new Resend(process.env.RESEND_API_KEY)` at module top level throws "Missing API key" during Next.js build, preventing page data collection for `/api/email/test`
- **Fix:** Wrapped Resend client in a Proxy with lazy initialization (same pattern as db client from Plan 01), deferring `new Resend()` until first property access at runtime
- **Files modified:** lib/email/resend.ts
- **Verification:** Build succeeds, all tests pass, Proxy correctly forwards `get` and `has` traps
- **Committed in:** e092249 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Auto-fix necessary for build correctness. No scope creep. Consistent with established Proxy pattern from Plan 01.

## Issues Encountered
- Proxy `has` trap needed for Vitest `toHaveProperty` assertions -- added `has` trap alongside `get` trap so `in` operator correctly delegates to the real Resend instance

## User Setup Required

The user needs to complete these steps before email sending works:
1. Get a Resend API key from https://resend.com
2. Set `RESEND_API_KEY` in `.env.local`
3. Add and verify uptimelens.io domain in Resend dashboard (SPF/DKIM/DMARC)
4. Test with `curl -X POST http://localhost:3000/api/email/test -H "Content-Type: application/json" -d '{"to":"your@email.com"}'`

Note: During development before domain verification, use "onboarding@resend.dev" as the from address in the route handler for testing.

## Next Phase Readiness
- Landing page live at / with all required sections
- Email infrastructure ready for magic link auth (Phase 2) and alerting (Phase 5)
- Marketing route group established for any additional public pages
- Plan 03 (deployment) can deploy the landing page and API route to production

## Self-Check: PASSED

All 9 key files verified present. Both task commits verified in git history.

---
*Phase: 01-project-foundation*
*Completed: 2026-03-06*
