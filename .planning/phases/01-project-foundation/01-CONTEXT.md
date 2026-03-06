# Phase 1: Project Foundation - Context

**Gathered:** 2026-03-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Scaffold a Next.js 16 application with Drizzle ORM + Neon Postgres, design the complete database schema (including rollup tables for data retention), set up email infrastructure via Resend, and deploy the full stack (Vercel + Railway + Neon). Includes a simple marketing landing page. No feature logic — this is pure infrastructure that enables all subsequent phases.

</domain>

<decisions>
## Implementation Decisions

### Sending domain
- Domain: uptimelens.io (needs to be purchased)
- Alert emails from: alerts@uptimelens.io
- Magic link emails: same domain, Claude's discretion on sender address
- SPF/DKIM/DMARC must be configured on uptimelens.io before email sends

### Landing page
- Include a simple marketing/landing page in Phase 1
- Lead messaging: price comparison angle — "$5/mo vs $34/mo" (UptimeRobot comparison)
- Sections: hero, features overview, pricing, CTA to sign up
- Two pricing tiers: $5/mo (10 monitors), $9/mo (30 monitors)
- Free trial mentioned on pricing — details in Phase 7

### Deployment scope
- Full deployment in Phase 1: Vercel (web app) + Railway (worker) + Neon (production Postgres)
- User has some accounts already, may need to create others
- Phase 1 delivers a live URL, not just local dev

### Branding
- Product name: "Uptime Lens" (locked in, final)
- Color palette: green/teal direction — uptime = green, trust, reliability
- Visual style: Stripe-inspired — polished gradients, premium feel, clean typography
- UI framework: shadcn/ui with Tailwind CSS (from research stack recommendation)

### Claude's Discretion
- Database schema structure (table names, column types, index strategy)
- Rollup table design (raw → hourly → daily aggregation approach)
- Project file/folder organization
- Magic link sender address (e.g., login@uptimelens.io or noreply@uptimelens.io)
- Landing page exact layout and copy beyond the messaging angle
- Tailwind color palette specifics within the green/teal direction
- Railway worker scaffold (placeholder until Phase 4 check engine)

</decisions>

<specifics>
## Specific Ideas

- Price comparison is the primary hook — the UptimeRobot 425% price hike ($8 → $34/mo) is the market opportunity
- Stripe-style visual polish: gradients, clean shadows, premium feel — not a generic SaaS template
- Two-tier pricing is deliberate: $5 for side projects (10 monitors), $9 for more serious use (30 monitors)

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield project, no existing code

### Established Patterns
- None — patterns will be established in this phase

### Integration Points
- None — this phase creates the foundation other phases integrate with

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-project-foundation*
*Context gathered: 2026-03-06*
