# Uptime Lens

## What This Is

A simple, affordable uptime monitoring SaaS for indie developers. Users add monitors for their sites and services (HTTP, TCP, DNS, SSL), get email alerts when things go down, and see response time charts and uptime percentages on a clean dashboard. Positioned as the simpler, cheaper alternative to UptimeRobot and Pingdom.

## Core Value

Indie developers know instantly when their sites or services go down — and trust the product enough to pay for it month over month.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Multi-protocol monitoring (HTTP, TCP, DNS, SSL expiry)
- [ ] 3-minute default check intervals
- [ ] Email alert notifications on downtime
- [ ] Dashboard with status list, response time charts, and uptime percentages
- [ ] Magic link (passwordless) authentication
- [ ] Free trial with transition to paid subscription
- [ ] Fully deployable SaaS (signup, payments, production infrastructure)

### Out of Scope

- Public status pages — deferred to post-v1
- SMS/Slack/Discord/webhook notifications — email only for v1
- OAuth login — magic link is sufficient
- Mobile app — web only
- Configurable check intervals — fixed 3-minute intervals for v1
- Multi-region checks — single region for v1

## Context

- Target market: indie developers with side projects and small apps who find existing tools overbuilt and overpriced
- Revenue model: recurring subscription SaaS (side revenue stream)
- Competitive landscape: UptimeRobot (freemium, feature-heavy), Better Uptime (incident management focus), Pingdom (enterprise pricing) — opportunity at the simple/cheap end
- No existing codebase — greenfield project

## Constraints

- **Simplicity**: Must stay dead-simple — feature bloat kills the value proposition
- **Cost**: Infrastructure costs must stay low enough for sustainable solo operation
- **Deployment**: Must be deployable as a production SaaS accepting real signups and payments

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Magic link auth over password | Simpler UX, no password management, fits indie dev audience | — Pending |
| Email-only alerts for v1 | Reduces complexity, covers primary use case | — Pending |
| 3-minute fixed check interval | Good balance of detection speed and resource cost | — Pending |
| Free trial model (not freemium) | Simpler billing, validates willingness to pay early | — Pending |

---
*Last updated: 2026-03-06 after initialization*
