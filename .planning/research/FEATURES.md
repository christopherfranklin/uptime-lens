# Feature Research

**Domain:** Uptime monitoring micro-SaaS for indie developers
**Researched:** 2026-03-06
**Confidence:** HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete or untrustworthy.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| HTTP(S) URL monitoring | The core use case -- every competitor offers it as the baseline | LOW | Must support GET/HEAD with expected status codes. POST with custom headers/body is a v1.x add. |
| Configurable check intervals | Users expect at least a few options (1m, 3m, 5m). Fixed interval feels rigid. | LOW | v1 ships with 3-minute fixed per PROJECT.md. Must add options post-v1 or users will chafe. UptimeRobot free is 5m, paid is 60s/30s. |
| Email alerting on down/up | Universal baseline notification. Every single competitor does this. | LOW | Send on state change (up->down, down->up). Include monitor name, URL, timestamp, downtime duration on recovery. |
| Dashboard with monitor list | Users need to see all monitors at a glance with current status (up/down/paused). | MEDIUM | Color-coded status indicators, last check time, current response time. Sort by status (down first). |
| Response time history charts | Users want to see performance trends, not just up/down. Line chart of response times over selectable time ranges. | MEDIUM | Time ranges: 24h, 7d, 30d, 90d. Use line chart with area fill. Show avg, p95 on hover. |
| Uptime percentage display | The single number users care about most. "99.9%" is the language of the domain. | LOW | Calculate over 24h, 7d, 30d, 90d windows. Display prominently per monitor and as an aggregate. |
| SSL certificate expiry monitoring | Expired SSL certs cause outages and security warnings. Every serious competitor monitors this. | LOW | Check cert expiry during HTTP checks. Alert at 30, 14, 7, 1 day thresholds. No separate monitor type needed -- piggyback on HTTPS checks. |
| Retry before alerting (false positive prevention) | Single-check failures cause false positives from transient network issues. Users will lose trust if alerted for non-outages. | LOW | Confirm failure with 2-3 consecutive checks before alerting. This is the single most important trust-building feature. Industry standard is 2-3 retries. |
| User authentication and account management | Users need accounts to manage monitors. Magic link auth per PROJECT.md is fine. | MEDIUM | Magic link (passwordless) is a good choice for indie devs. Must include session management, logout, email change. |
| Subscription billing | This is a SaaS -- users must be able to pay. | MEDIUM | Stripe integration. Free trial period, then paid. Must handle failed payments, cancellation, plan changes. |
| Monitor CRUD operations | Users need to add, edit, delete, and pause monitors. | LOW | Clean form: URL, name, check type, optional expected status code. Pause/resume without deleting. |
| TCP port monitoring | Indie devs run databases, Redis, custom services on specific ports. Second most common check type after HTTP. | LOW | Connect to host:port, verify connection succeeds within timeout. |
| Downtime incident log | Users need a history of when things went down and for how long. Essential for debugging and accountability. | LOW | List of incidents per monitor: start time, end time, duration, root cause (HTTP status, timeout, DNS failure, etc.). |

### Differentiators (Competitive Advantage)

Features that set Uptime Lens apart. Not required, but create the value proposition of "simpler and cheaper."

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Dead-simple UX (fewer than 5 clicks to first monitor) | Competitors have grown bloated. UptimeRobot has dozens of settings per monitor. Uptime Lens wins by being the tool you set up in 60 seconds. | MEDIUM | This is a UX discipline, not a feature. Minimal form fields, smart defaults, zero jargon. The product IS the simplicity. |
| Aggressive pricing ($5-7/mo for 20-30 monitors) | UptimeRobot just had a 425% price hike to $34/mo. There is a clear gap at the $5-10/mo price point for indie devs who just need basic monitoring. OwlPulse sits at $9/mo. | LOW | Price is a feature. Keep infrastructure costs low enough to sustain this. Target margin at this price point. |
| Clean, fast dashboard (no feature bloat) | Competitors have cluttered UIs with incident management, on-call, team features, etc. Indie devs want a dashboard that loads fast and shows status at a glance. | MEDIUM | Load in under 1 second. No unnecessary nav items. No upsell prompts. The dashboard IS the product experience. |
| Transparent uptime history (90-day timeline view) | Visual timeline showing green/red bars for uptime/downtime over 90 days. This visualization is immediately understandable and builds trust. | MEDIUM | Horizontal bar per monitor, colored segments for up/down periods. Click to drill into specific incidents. Inspired by GitHub's status indicators. |
| DNS record monitoring | Many indie devs misconfigure DNS or don't notice propagation issues. Less common than HTTP/TCP but valuable for the audience. | LOW | Resolve specified record types (A, AAAA, CNAME, MX) and verify expected values. Alert on changes or failures. |
| Webhook notifications (generic) | Opens the door to any integration without building specific Slack/Discord/etc. integrations. Power users can pipe to anything. | LOW | POST JSON payload to user-specified URL on state change. Include monitor details, old/new status, timestamps. Template the payload format. |
| Email digest / weekly report | Competitors send these but often poorly. A clean weekly email with uptime percentages and notable incidents builds the habit loop that prevents churn. | LOW | Weekly email: all monitors, uptime %, any incidents, response time trends. Keep it scannable. This is a retention feature. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create complexity that undermines the core value proposition of simplicity and affordability.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Public status pages | Competitors all have them. Users ask for them because they've seen them elsewhere. | Significant complexity: custom domains, SSL provisioning, subscriber management, design customization, caching at scale. Doubles the product surface area. PROJECT.md correctly defers this to post-v1. | Defer to v1.x. When built, keep it minimal -- single page, auto-generated from monitor data, no custom branding in v1. |
| Slack/Discord/Teams integrations (native) | Developers want alerts where they already are. | Each integration has its own OAuth flow, API quirks, rate limits, and maintenance burden. Building 3-5 native integrations is a significant ongoing cost. | Offer generic webhook notifications instead. Slack and Discord both accept incoming webhooks natively. Provide setup guides for each platform. 80% of the value, 10% of the effort. |
| SMS/voice call notifications | Perceived as more urgent than email. Enterprise tools offer this. | Twilio/telecom costs are per-message and eat into margins at a $5-7/mo price point. Also requires phone number collection and compliance (TCPA, GDPR). | Email + webhook covers 95% of indie dev needs. If users need SMS, they can pipe webhooks through Twilio themselves. |
| Multi-region monitoring | Checking from multiple global locations reduces false positives and catches regional outages. | Dramatically increases infrastructure costs (3-5x per check). For indie dev side projects, single-region monitoring with retry logic catches 99% of real outages. | Single region with retry-before-alert. Add multi-region as a paid tier feature in v2 if demand warrants it. |
| Incident management / on-call rotation | Enterprise monitoring tools bundle this. Some users expect it. | Massive feature surface: schedules, escalation policies, acknowledgment flows, timeline views, post-mortems. This is an entire product (PagerDuty, OpsGenie). Indie devs with side projects don't have on-call rotations. | Out of scope permanently. This is a different product for a different audience. |
| Transaction / synthetic monitoring | Simulating multi-step user flows (login, checkout) catches application-level issues. | Requires headless browser infrastructure, script authoring UX, much higher compute costs. Complex to build and maintain. Not what indie devs need for side projects. | Out of scope permanently. If users need synthetic monitoring, they need Checkly or Datadog, not a simple uptime tool. |
| Real User Monitoring (RUM) | Measures actual user experience via JavaScript snippet. | Entirely different architecture: client-side JS, data ingestion pipeline, session analytics. This is a separate product category (SpeedCurve, Datadog RUM). | Out of scope permanently. Recommend dedicated RUM tools if users ask. |
| Cron job / heartbeat monitoring | Monitor scheduled tasks by expecting periodic pings from the task itself. | Different monitoring paradigm (push vs pull). Requires separate endpoint infrastructure, different alerting logic, different UI. Adds complexity without serving the core use case well. | Defer indefinitely. If added later, keep it minimal: endpoint that expects a ping every N minutes, alerts if missed. |
| API with full CRUD | Power users and agencies want programmatic monitor management. | API design, documentation, authentication (API keys), rate limiting, versioning -- all significant ongoing maintenance. Low priority for indie devs who manage 5-20 monitors via UI. | Defer to v2. Build internal API-first architecture so this becomes easy to expose later. |
| Team/multi-user accounts | Agencies and teams want shared access. | Role management, permissions, invitation flows, shared billing. Adds complexity to auth, billing, and every feature that touches ownership. | Defer to v1.x. Single-user accounts for v1. |
| Mobile app | Users want to check status on the go. | Maintaining iOS + Android apps (or React Native) is a major ongoing cost. Push notification infrastructure adds complexity. | Responsive web dashboard. Works on mobile browsers. Push notifications via email are sufficient for indie devs. |
| Custom check intervals (per monitor) | Different monitors have different criticality levels. | Per-monitor intervals complicate the scheduling system. For v1, a single interval simplifies infrastructure significantly. | Fixed 3-minute interval for v1 per PROJECT.md. Add per-monitor intervals in v1.x (e.g., 1m, 3m, 5m options). |

## Feature Dependencies

```
[User Authentication]
    |--requires--> [Email Service] (for magic links and alerts)
    |--requires--> [Database] (user storage)
    |
    |--enables--> [Monitor CRUD]
    |                 |--requires--> [Check Scheduler]
    |                 |                   |--requires--> [Check Executor] (HTTP, TCP, DNS)
    |                 |                   |--produces--> [Check Results Storage]
    |                 |                                       |
    |                 |                                       |--enables--> [Response Time Charts]
    |                 |                                       |--enables--> [Uptime Percentage Calculation]
    |                 |                                       |--enables--> [Downtime Incident Log]
    |                 |                                       |--enables--> [SSL Expiry Detection]
    |                 |
    |                 |--enables--> [Alert System]
    |                                   |--requires--> [Check Results Storage] (state change detection)
    |                                   |--requires--> [Retry Logic] (false positive prevention)
    |                                   |--requires--> [Email Service] (notification delivery)
    |                                   |--enables--> [Webhook Notifications] (v1.x)
    |
    |--enables--> [Dashboard]
    |                 |--requires--> [Monitor CRUD]
    |                 |--requires--> [Check Results Storage]
    |                 |--requires--> [Response Time Charts]
    |                 |--requires--> [Uptime Percentage Calculation]
    |
    |--enables--> [Subscription Billing]
                      |--requires--> [Stripe Integration]
                      |--enforces--> [Monitor Limits] (per plan)

[Weekly Email Digest]
    |--requires--> [Check Results Storage]
    |--requires--> [Uptime Percentage Calculation]
    |--requires--> [Email Service]

[Public Status Pages] (v1.x)
    |--requires--> [Monitor CRUD]
    |--requires--> [Check Results Storage]
    |--requires--> [Uptime Percentage Calculation]
```

### Dependency Notes

- **Monitor CRUD requires Auth:** Users must be authenticated before creating monitors. Auth is the foundation.
- **Alert System requires Retry Logic:** Alerts without retry confirmation will produce false positives, destroying user trust. Retry logic is non-negotiable before alerting goes live.
- **Dashboard requires Check Results Storage:** Charts and uptime percentages are computed from stored check results. The data pipeline must be working before the dashboard is meaningful.
- **Billing enforces Monitor Limits:** The billing system gates how many monitors a user can create. Must be in place before paid launch but can be deferred during free trial period.
- **SSL Expiry piggybacks on HTTPS checks:** Not a separate monitor type. Extract cert info during HTTPS checks to avoid separate scheduling.
- **Webhook Notifications extend Alert System:** Same state-change detection, different delivery mechanism. Easy to add once alerting works.

## MVP Definition

### Launch With (v1)

Minimum viable product -- what's needed to validate that indie devs will pay for simple uptime monitoring.

- [ ] HTTP(S) monitoring with 3-minute intervals -- the core use case
- [ ] TCP port monitoring -- second most common need for devs
- [ ] Email alerts on state change (down/up) -- minimum viable notification
- [ ] Retry before alert (2-3 consecutive failures) -- trust-critical, prevents false positive rage-quits
- [ ] SSL certificate expiry alerts -- piggyback on HTTPS checks, low effort, high value
- [ ] Dashboard with monitor list, status indicators, response time charts, uptime percentages -- the product experience
- [ ] Downtime incident log per monitor -- accountability and debugging
- [ ] Magic link authentication -- per PROJECT.md decision
- [ ] Free trial with Stripe billing transition -- validates willingness to pay
- [ ] Monitor CRUD (add, edit, delete, pause/resume) -- basic management

### Add After Validation (v1.x)

Features to add once core is working and first paying users are on board.

- [ ] Webhook notifications -- when users request integrations beyond email, this unblocks Slack/Discord/etc. without building native integrations
- [ ] DNS record monitoring -- when users request it, low complexity to add
- [ ] Configurable check intervals (1m, 3m, 5m per monitor) -- when users complain about fixed 3-minute intervals
- [ ] Weekly email digest report -- retention feature, add once there are enough users to justify the batch job
- [ ] Public status pages (minimal) -- when multiple users request it, keep scope tiny: auto-generated, no custom domains
- [ ] 90-day uptime timeline visualization -- when the dashboard feels too basic, this adds visual trust
- [ ] Team/multi-user accounts -- when agencies or small teams show interest

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] Multi-region monitoring -- only if demand justifies the infrastructure cost increase
- [ ] API for programmatic monitor management -- only when agencies or power users demand it
- [ ] Cron job / heartbeat monitoring -- only if the push-based model proves needed
- [ ] Native Slack/Discord integrations -- only if webhooks prove insufficient for users

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| HTTP(S) monitoring | HIGH | LOW | P1 |
| TCP port monitoring | HIGH | LOW | P1 |
| Email alerts on state change | HIGH | LOW | P1 |
| Retry before alert | HIGH | LOW | P1 |
| SSL certificate expiry alerts | HIGH | LOW | P1 |
| Monitor list dashboard | HIGH | MEDIUM | P1 |
| Response time charts | HIGH | MEDIUM | P1 |
| Uptime percentage display | HIGH | LOW | P1 |
| Downtime incident log | MEDIUM | LOW | P1 |
| Magic link auth | HIGH | MEDIUM | P1 |
| Stripe billing integration | HIGH | MEDIUM | P1 |
| Monitor CRUD | HIGH | LOW | P1 |
| Webhook notifications | MEDIUM | LOW | P2 |
| DNS monitoring | MEDIUM | LOW | P2 |
| Configurable check intervals | MEDIUM | LOW | P2 |
| Weekly email digest | MEDIUM | LOW | P2 |
| 90-day timeline visualization | MEDIUM | MEDIUM | P2 |
| Public status pages (minimal) | MEDIUM | HIGH | P2 |
| Team accounts | LOW | MEDIUM | P3 |
| Multi-region monitoring | LOW | HIGH | P3 |
| API | LOW | MEDIUM | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add based on user demand
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | UptimeRobot | Better Stack | StatusCake | Hyperping | Uptime Lens (Plan) |
|---------|-------------|--------------|------------|-----------|---------------------|
| HTTP monitoring | Yes | Yes | Yes | Yes | v1 -- core feature |
| TCP monitoring | Yes (port) | Yes | Yes | Yes | v1 -- core feature |
| DNS monitoring | Limited | Yes | No | No | v1.x -- add when requested |
| SSL monitoring | Paid only | Yes | Yes | Yes | v1 -- piggyback on HTTPS |
| Check interval (fastest) | 30s (paid) | 30s (paid) | 30s (paid) | 30s | 3min fixed (v1), 1min (v1.x) |
| Free plan monitors | 50 (non-commercial) | Yes (limited) | 10 | 5 | Free trial, then paid |
| Paid plan (entry) | $7/mo (10 monitors) | $24/mo | $20/mo | $24/mo (10 monitors) | Target $5-7/mo (20-30 monitors) |
| Email alerts | Yes | Yes | Yes | Yes | v1 |
| SMS alerts | Paid | Yes | Yes | Yes | Not planned |
| Slack integration | Paid | Yes | Yes | Yes | Webhook covers this (v1.x) |
| Discord integration | No | No | Yes | Yes | Webhook covers this (v1.x) |
| Webhooks | Yes | Yes | Yes | Yes | v1.x |
| Status pages | Yes (basic free) | Yes (branded) | No | Yes (branded) | v1.x (minimal) |
| Incident management | No | Yes (core feature) | No | Yes | Not planned |
| On-call / escalation | No | Yes | No | Yes | Not planned |
| Response time charts | Yes | Yes | Yes | Yes | v1 |
| Uptime reports | Yes | Yes | Yes | Yes | v1 (dashboard), v1.x (email) |
| Multi-region | Yes | Yes | Yes | Yes | Not planned (v2 maybe) |
| Mobile app | Yes (iOS/Android) | Yes | No | No | No (responsive web) |
| API | Yes | Yes | Yes | Yes | v2 |
| Setup complexity | Medium (many options) | High (incident mgmt) | Low | Medium | Very Low (target: 60 seconds) |

### Key Competitive Insight

The gap in the market is clear: after UptimeRobot's price hike to $34/mo, there is no simple, affordable uptime monitoring tool at the $5-10/mo price point that targets indie developers specifically. The competitors either:

1. **Overbuilt**: Better Stack and Hyperping bundle incident management, on-call, and status pages -- complexity indie devs don't need
2. **Overpriced**: UptimeRobot went from affordable to $34/mo; Pingdom is enterprise-priced
3. **Self-hosted only**: Uptime Kuma is free but requires server management, Docker knowledge, and ongoing maintenance
4. **Dated UX**: StatusCake's interface is functional but uninspired

Uptime Lens can win by being aggressively simple and aggressively priced. The product constraint ("simplicity kills feature bloat") is the competitive advantage.

## Sources

- [UptimeRobot Pricing](https://uptimerobot.com/pricing/) - Competitor pricing and feature tiers
- [UptimeRobot Alternatives After 2025 Price Surge](https://earezki.com/ai-news/2026-03-01-uptimerobot-alternatives-who-survived-the-2025-price-hike/) - Market reaction to UptimeRobot's 425% price increase
- [Better Stack Features](https://www.saasworthy.com/product/better-uptime) - Better Stack feature set and pricing
- [StatusCake Pricing](https://www.statuscake.com/pricing/) - StatusCake feature tiers and free plan
- [Hyperping Pricing](https://hyperping.com/pricing) - Hyperping feature set targeting smaller teams
- [OneUptime Features](https://oneuptime.com) - Open source monitoring platform feature landscape
- [Odown: False Positives vs Real Outages](https://odown.com/blog/false-positives-in-uptime/) - False positive prevention best practices
- [UptimeRobot: Building a Status Page Guide](https://uptimerobot.com/knowledge-hub/monitoring/building-a-status-page-ultimate-guide/) - Status page importance for customer trust
- [Best Uptime Monitoring Tools 2026](https://uptimerobot.com/knowledge-hub/monitoring/11-best-uptime-monitoring-tools-compared/) - Feature comparison across 11 tools

---
*Feature research for: Uptime monitoring micro-SaaS*
*Researched: 2026-03-06*
