# Domain Pitfalls

**Domain:** Uptime monitoring micro-SaaS for indie developers
**Researched:** 2026-03-06

## Critical Pitfalls

Mistakes that cause rewrites, loss of user trust, or product failure.

### Pitfall 1: Single-Region Monitoring Ships a False Positive Machine

**What goes wrong:** With only one monitoring location, roughly 20% of all downtime alerts are false positives caused by transient network routing issues, DNS hiccups, or brief problems at the monitoring provider's own infrastructure. Users get woken up at 3 AM for nothing. After a few false alarms, they stop trusting the product and churn.

**Why it happens:** Building single-region first feels like a valid MVP simplification. The problem is that the core value proposition of a monitoring tool is *accurate alerts*, and single-region monitoring is fundamentally broken for this purpose. A check from one location cannot distinguish between "the target is down" and "the network path between my server and the target has a problem."

**Consequences:** Alert fatigue destroys trust. Users who receive 2-3 false positives will either disable alerts (making the product useless) or switch to a competitor. This is not a "nice to have" -- it is an existential product risk.

**Prevention:**
- Implement confirmation checks before alerting. Even with a single primary region, add at least one secondary verification region. When the primary check fails, trigger a confirmation check from the secondary region before opening an incident.
- Require 2-3 consecutive failures before alerting (not just one failed check).
- Combine both: consecutive failures AND cross-region confirmation.
- At minimum, use a "recheck from same region after 30-second delay" pattern as a baseline noise filter.

**Detection (warning signs):**
- Users reporting false alerts in support channels.
- Incident records that show downtime durations shorter than 60 seconds.
- High ratio of incidents that auto-resolve within one check interval.

**Phase relevance:** Must be addressed in the core monitoring engine phase. This is not something to defer -- shipping without confirmation logic will poison early user trust during the period when the product has no reputation to fall back on.

**Confidence:** HIGH -- multiple sources confirm 20% false positive rate for single-location monitoring ([FlareWarden case study](https://dev.to/khrome83/how-we-built-cross-region-uptime-verification-and-why-single-location-monitoring-is-broken-24mo), [Phare.io best practices](https://phare.io/blog/best-practices-to-configure-an-uptime-monitoring-service/)).

---

### Pitfall 2: Alert Flapping Destroys User Experience

**What goes wrong:** A monitored service hovers around the failure threshold -- it responds, then times out, then responds, then times out. The user receives a rapid-fire sequence: DOWN alert, UP recovery, DOWN alert, UP recovery, all within minutes. This is called "flapping" and it is one of the most common complaints about monitoring tools.

**Why it happens:** The monitoring system treats every state change as a reportable event with no hysteresis or debounce logic. The target service may be genuinely degraded (slow responses near the timeout threshold), or there may be intermittent network issues. Without dampening, every oscillation generates a notification.

**Consequences:** Email inbox flooded with alternating down/up alerts. Users lose trust in the severity of any individual alert. The monitoring tool becomes the source of noise rather than signal.

**Prevention:**
- Implement "confirmation count" thresholds: require N consecutive failures (e.g., 2-3) before declaring DOWN, and N consecutive successes before declaring RECOVERED.
- Use separate thresholds for alerting vs. recovery (hysteresis). For example: alert after 3 failures, but only send recovery after 3 successes. This prevents rapid oscillation from generating notifications.
- Aggregate rapid state changes into a single "instability" notification rather than individual down/up pairs.
- Consider a minimum incident duration: do not send a recovery notification until the service has been stable for at least 2 check intervals.

**Detection (warning signs):**
- Multiple incidents for the same monitor within a short time window.
- Incidents with duration less than one check interval.
- Users requesting the ability to "snooze" or disable alerts.

**Phase relevance:** Must be built into the alerting engine from the start. Retrofitting flapping protection into an alerting system that was designed to fire on every state change requires rethinking the entire state machine.

**Confidence:** HIGH -- flapping is well-documented across Nagios, Datadog, and Squadcast ([Squadcast flapping guide](https://www.squadcast.com/blog/how-squadcast-helps-with-flapping-alerts), [Datadog flapping reduction](https://docs.datadoghq.com/monitors/guide/reduce-alert-flapping/)).

---

### Pitfall 3: Check Data Storage Grows Without Bound and Kills the Database

**What goes wrong:** Every check result (timestamp, response time, status code, headers) gets stored as an individual row. With 100 monitors at 3-minute intervals, that is 48,000 rows per day, 1.44 million per month, 17.3 million per year -- for a *single user*. With 100 users, you are looking at 1.7 billion rows per year. Queries slow to a crawl. Storage costs escalate. Database backups take hours.

**Why it happens:** Storing every raw check result feels natural during development when you have 5 monitors. The data model seems simple: one row per check. But time-series data grows linearly and indefinitely, and traditional relational databases are not designed for this access pattern.

**Consequences:** Dashboard queries time out. Uptime percentage calculations become expensive. Database costs dominate infrastructure spend. Backups become unreliable. A developer who built a monitoring service [reported spending 1000+ hours](https://dev.to/vponamariov/how-i-built-architecture-of-uptime-monitoring-service-54h8) and identified storage explosion as a primary architectural challenge, ultimately shifting to hourly aggregation tables.

**Prevention:**
- Design a data retention strategy from day one:
  - Raw check data: keep 24-48 hours for incident investigation.
  - Hourly aggregations (avg/min/max response time, uptime percentage): keep 30-90 days.
  - Daily aggregations: keep 1-2 years.
- Use a rollup/aggregation job that runs periodically to compress old data.
- Calculate uptime percentages incrementally (update a running counter) rather than scanning all historical checks.
- Consider using a time-series-aware storage approach (TimescaleDB continuous aggregates, or even just well-indexed PostgreSQL with partitioning by time).

**Detection (warning signs):**
- Database size growing faster than user count.
- Dashboard page load times increasing over weeks/months.
- Uptime calculation queries taking more than 1 second.
- Database backup duration increasing steadily.

**Phase relevance:** Must be designed into the data model from the first phase. Migrating from "store everything" to "aggregate and expire" after the fact requires complex data migrations and risks data loss. The aggregation strategy should be part of the initial schema design.

**Confidence:** HIGH -- confirmed by multiple builder experiences and time-series database literature ([InfluxData on TSDB challenges](https://www.influxdata.com/blog/using-time-series-data-infrastructure-monitoring-advantages-limitations/), [builder post-mortem](https://dev.to/vponamariov/how-i-built-architecture-of-uptime-monitoring-service-54h8)).

---

### Pitfall 4: The Scheduler Drifts and Checks Pile Up

**What goes wrong:** A naive scheduler (setInterval, cron, or a simple loop) fires checks every 3 minutes. But checks take variable time to complete (DNS resolution, TCP handshake, HTTP response). If a target is slow or unresponsive (30-second timeout), the check takes 30 seconds. Meanwhile, other checks pile up. The scheduler falls behind. Checks that should fire at :00, :03, :06 end up firing at :00, :03, :06:30, :10, :14... Users see gaps in their response time charts and late alerts.

**Why it happens:** The scheduler does not decouple scheduling from execution. It runs checks sequentially or with insufficient concurrency. Slow or timing-out checks block the scheduler. Timer drift compounds over time, especially under load.

**Consequences:** Checks do not run at consistent intervals. Response time charts have irregular gaps. Downtime detection is delayed (a 3-minute check interval becomes 5-7 minutes under load). Uptime percentages become inaccurate because the denominator (expected number of checks) does not match actuality.

**Prevention:**
- Separate scheduling from execution: the scheduler enqueues check jobs, workers dequeue and execute them independently.
- Use a proper job queue (BullMQ, PostgreSQL-based queue, or similar) rather than in-process timers.
- Set timeouts aggressively on HTTP/TCP checks (10 seconds max, not 30) so slow targets do not starve the system.
- Monitor the scheduler itself: track the delta between scheduled time and actual execution time.
- Use wall-clock scheduling (fire at absolute times) rather than relative intervals (fire N seconds after last check).

**Detection (warning signs):**
- Gaps in response time charts.
- Check execution timestamps not aligning with expected intervals.
- Increasing queue depth during peak load.
- Alert delays: user reports downtime was detected minutes after it actually started.

**Phase relevance:** Core monitoring engine phase. The scheduler architecture is foundational. Changing from an in-process scheduler to a queue-based system later requires rewriting the monitoring core.

**Confidence:** HIGH -- this is a well-known distributed systems problem. Google's SRE book dedicates a chapter to distributed periodic scheduling. The "favor skipping over doubling" principle is critical ([Google SRE on distributed cron](https://sre.google/sre-book/distributed-periodic-scheduling/)).

---

### Pitfall 5: Monitoring Only the Health Check Endpoint, Not What Users Experience

**What goes wrong:** The monitor checks `GET /health` or `GET /` and gets a 200 OK in 50ms. Meanwhile, the database is down, the payment system is broken, and real users see errors on every page. The monitoring dashboard shows 100% uptime while the product is on fire.

**Why it happens:** Developers monitor the simplest possible endpoint. A basic health check endpoint often bypasses the actual application stack -- it might be served by the reverse proxy, or it might return 200 without checking database connectivity, cache availability, or downstream service health.

**Consequences:** Users discover outages before the monitoring tool does. The monitoring product loses credibility. The "uptime percentage" becomes a vanity metric that does not reflect reality.

**Prevention:**
- Default HTTP checks should validate response body content (keyword check), not just status codes. A 200 response with an error page body is still a failure.
- Document and encourage users to monitor endpoints that exercise real application logic (e.g., an API endpoint that queries the database).
- For the product's own monitoring types: support keyword/content validation as a first-class feature, not an afterthought.
- Consider supporting response time thresholds: if a page takes >5 seconds, consider it degraded even if it returns 200.

**Detection (warning signs):**
- Users reporting that their site was down but the monitor showed "up."
- Feature requests for "content validation" or "keyword monitoring."
- Support tickets about incorrect uptime percentages.

**Phase relevance:** Feature design phase when implementing HTTP monitoring. Keyword/content validation should be in v1, not deferred.

**Confidence:** HIGH -- documented across OpenStatus, Phare.io, and UptimeRobot best practices ([OpenStatus guide](https://www.openstatus.dev/guides/why-uptime-percentage-is-misleading), [Phare.io best practices](https://phare.io/blog/best-practices-to-configure-an-uptime-monitoring-service/)).

---

## Moderate Pitfalls

### Pitfall 6: Uptime Percentage Calculation is Deceptively Complex

**What goes wrong:** The uptime percentage seems trivial: `(total_checks - failed_checks) / total_checks * 100`. But edge cases abound. What happens when the monitor is paused? When the monitor is created mid-month? When checks are missed due to scheduler issues? When a check times out -- is that downtime or an unknown state? These ambiguities lead to percentages that do not match user expectations.

**Prevention:**
- Define uptime calculation semantics clearly and document them.
- Exclude paused periods from the calculation denominator.
- Handle gaps in check data (missed checks should not count as uptime).
- Track "expected checks" vs "actual checks" to detect and handle missing data.
- Consider whether timeout should count as downtime or a separate "degraded" state.
- Use incremental counters (success_count, total_count) updated on each check, rather than recalculating from raw data.

**Detection (warning signs):**
- Users questioning why their uptime shows 100% when they know they had downtime.
- Uptime percentages that change retroactively when old data is aggregated.
- Discrepancies between incident history and uptime percentage.

**Phase relevance:** Data model and dashboard phase. The calculation logic should be defined when designing the check result schema.

**Confidence:** MEDIUM -- based on multiple guides and monitoring tool documentation showing this is a common source of user confusion.

---

### Pitfall 7: Email Deliverability Kills the Alerting System

**What goes wrong:** The product relies on email-only alerts (as specified in PROJECT.md). Alert emails land in spam, are delayed by mail server throttling, or are blocked entirely. The user does not receive the downtime alert. The entire value proposition fails silently.

**Why it happens:** Transactional email requires proper SPF, DKIM, and DMARC configuration. New sending domains have no reputation. Alert emails with subjects like "YOUR SITE IS DOWN" can trigger spam filters. Email providers throttle new senders. Gmail tabs may route alerts to Promotions or Updates instead of Primary.

**Consequences:** The user's site is down. The alert email is in spam. The user discovers the outage from their own users hours later. Trust is permanently broken.

**Prevention:**
- Use a reputable transactional email service (Postmark, AWS SES, Resend) rather than sending directly.
- Set up SPF, DKIM, and DMARC from day one.
- Use a professional, consistent "From" address and avoid spam-trigger words in subjects.
- Implement delivery tracking: log whether emails were accepted by the recipient's mail server.
- Send a test alert during onboarding so users can verify delivery and whitelist the sender.
- Consider adding a "check your spam folder" prompt during setup.
- Plan for a second notification channel (even just in-app) as a fallback, even if v1 is email-only.

**Detection (warning signs):**
- Users reporting they never received an alert for a confirmed incident.
- Low email open rates on alert emails.
- High bounce rates from transactional email provider dashboard.

**Phase relevance:** Authentication/onboarding phase (test alert during setup) and alerting engine phase (deliverability configuration).

**Confidence:** HIGH -- email deliverability is a well-documented challenge for SaaS products. The risk is amplified here because email is the ONLY alert channel in v1.

---

### Pitfall 8: SSL Certificate Monitoring Looks Simple But Has Sharp Edges

**What goes wrong:** SSL expiry monitoring requires connecting to the target over TLS and reading the certificate. But: the certificate presented may vary by SNI (Server Name Indication), intermediate certificates may be misconfigured, the server may present a valid cert for a different domain, wildcard certificates need correct matching, and self-signed certificates need special handling. A naive implementation will either produce false positives (reporting problems that do not exist) or miss real issues.

**Prevention:**
- Always send the correct SNI hostname when connecting.
- Check the entire certificate chain, not just the leaf certificate.
- Validate that the certificate's Common Name or SAN matches the monitored domain.
- Handle connection failures gracefully: "could not connect" is not the same as "certificate expired."
- Define clear thresholds for expiry warnings (30 days, 14 days, 7 days) and let users configure them.
- Test against Let's Encrypt (90-day certs, auto-renewal), traditional CAs, and self-signed scenarios.

**Detection (warning signs):**
- Users behind CDNs (Cloudflare, AWS CloudFront) reporting incorrect certificate information.
- SSL checks showing different results than browser certificate viewers.

**Phase relevance:** Multi-protocol monitoring phase when implementing SSL checks.

**Confidence:** MEDIUM -- based on SSL monitoring tool documentation and GitHub issues ([Uptime Kuma SSL issues](https://github.com/louislam/uptime-kuma/issues/3926)).

---

### Pitfall 9: DNS Checks That Do Not Actually Validate What Matters

**What goes wrong:** A DNS monitor checks that a domain resolves. It gets an answer -- pass. But: the answer could be wrong (DNS poisoning, misconfigured records), the TTL could be dangerously low, DNSSEC validation could be failing, or the domain could be resolving to an unexpected IP. Simply "getting an answer" is not sufficient validation.

**Prevention:**
- Allow users to specify expected DNS record values (expected IP, expected CNAME target).
- Validate that the response matches expectations, not just that a response was received.
- Support multiple record types (A, AAAA, CNAME, MX, TXT) with type-specific validation.
- Use a DNS library that supports DNSSEC validation.
- Be aware that DNS responses can vary by resolver and region. Use consistent resolver configuration.

**Detection (warning signs):**
- Users asking "why did my DNS check pass when my domain was pointing to the wrong server?"
- DNS checks showing UP while HTTP checks for the same domain show DOWN.

**Phase relevance:** Multi-protocol monitoring phase when implementing DNS checks.

**Confidence:** MEDIUM -- based on DNS monitoring documentation and monitoring type guides.

---

### Pitfall 10: Firewall and Rate Limiting Block Monitoring Probes

**What goes wrong:** The monitored server's firewall, WAF (Web Application Firewall), or DDoS protection (Cloudflare, AWS Shield) identifies the monitoring probe as suspicious traffic and blocks it. The monitor reports the site as DOWN when it is actually UP. This is a false positive caused by the monitoring infrastructure itself.

**Why it happens:** Monitoring probes make repeated, automated HTTP requests from fixed IP addresses. This pattern matches bot traffic. Cloudflare's "Under Attack" mode, rate limiters, and IP-based blocklists can all catch monitoring probes.

**Prevention:**
- Publish monitoring probe IP addresses so users can whitelist them.
- Use realistic User-Agent strings (not "MonitorBot/1.0").
- Do not check more frequently than necessary (3-minute intervals are generally safe).
- Document instructions for whitelisting in Cloudflare, AWS WAF, and other common WAF products.
- Detect when a response is a WAF challenge page (Cloudflare's 403 with challenge body) vs. a genuine 403.

**Detection (warning signs):**
- New monitors returning 403 or 503 immediately after creation.
- Users behind Cloudflare consistently reporting false positives.
- Check responses containing WAF/challenge HTML instead of expected content.

**Phase relevance:** Monitoring engine phase. Should be considered when designing the HTTP check implementation.

**Confidence:** HIGH -- this is a common support issue for every monitoring service ([WPX on UptimeRobot false positives](https://wpx.net/kb/uptime-robot-false-positives/), [UptimeRobot blog on performance issues](https://uptimerobot.com/blog/performance-issues-any-false-positives-you-may-have-received/)).

---

## Minor Pitfalls

### Pitfall 11: Timezone Confusion in Dashboard and Reports

**What goes wrong:** Downtime timestamps are displayed in UTC, but the user is in PST. They see "downtime at 02:00" and think it happened at 2 AM their time, when it actually happened at 6 PM. Uptime reports for "today" or "this month" use the server's timezone rather than the user's timezone, leading to confusing boundary effects.

**Prevention:**
- Store all timestamps in UTC internally.
- Display timestamps in the user's local timezone (detected from browser or user preference).
- Use relative timestamps ("3 hours ago") for recent events and absolute timestamps for historical data.
- Ensure "daily" and "monthly" uptime calculations respect the user's timezone for period boundaries.

**Phase relevance:** Dashboard/UI phase.

**Confidence:** HIGH -- standard web application UX issue, amplified in monitoring where timing matters.

---

### Pitfall 12: TCP Checks Without Connection Semantics

**What goes wrong:** A TCP monitor opens a connection to a port and declares success if the TCP handshake completes. But: a load balancer may accept TCP connections even when all backend servers are down. A service may accept connections but not respond to application-level requests. The port may be open but the service crashed and the OS is handling the connection queue.

**Prevention:**
- Document clearly what TCP monitoring does and does not verify.
- For common protocols (SMTP, FTP, database ports), consider sending a minimal protocol-level handshake to verify the service is actually responding.
- Set connection timeouts and read timeouts separately.
- Consider supporting "TCP + expect banner" checks for services that send a greeting on connect.

**Phase relevance:** Multi-protocol monitoring phase.

**Confidence:** MEDIUM -- based on monitoring type documentation and Uptime Kuma issues.

---

### Pitfall 13: Magic Link Email Delivery Competes with Alert Emails

**What goes wrong:** The product uses magic link authentication (passwordless) AND email alerts. Both rely on email delivery. If the email sending infrastructure has issues, users cannot log in AND do not receive alerts. A single point of failure takes out both authentication and the core product feature.

**Prevention:**
- Use the same transactional email provider for both, but monitor its health independently.
- Consider rate limits: a surge of alert emails (multiple monitors going down simultaneously) should not delay magic link emails.
- Implement email priority/queue separation: authentication emails should have higher priority than bulk alert emails.
- Have a fallback: allow users to set a password as an alternative to magic link.

**Phase relevance:** Authentication phase and alerting phase. Design the email sending architecture to handle both workloads without contention.

**Confidence:** MEDIUM -- inferred from the project's specific combination of magic link auth + email-only alerts. Not commonly documented because most monitoring tools use password auth.

---

### Pitfall 14: Not Monitoring Your Own Monitoring Infrastructure

**What goes wrong:** The monitoring service itself goes down. No checks run. No alerts fire. Users' sites could be down and nobody knows. The irony is total. When the service comes back up, it retroactively shows a gap in monitoring data, but the damage is done.

**Prevention:**
- Use an external service (even a free tier of UptimeRobot or Healthchecks.io) to monitor your own monitoring service.
- Implement a "dead man's switch" / heartbeat check: if the scheduler has not produced check results for N minutes, trigger an alert through an independent channel.
- Design for graceful degradation: if the alerting system is down, at least queue alerts for delivery when it recovers.

**Phase relevance:** Infrastructure/deployment phase. Should be set up as part of production deployment.

**Confidence:** HIGH -- this is a known meta-problem. Every monitoring service faces it.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Monitoring Engine | Single-region false positives (#1) | Implement confirmation checks with consecutive failure threshold from day one. Even a 30-second recheck from the same region reduces false positives by 50%+. |
| Monitoring Engine | Scheduler drift (#4) | Decouple scheduling from execution using a job queue. Never run checks synchronously in the scheduler loop. |
| Monitoring Engine | Firewall/WAF blocking (#10) | Use realistic User-Agent, publish probe IPs, detect challenge pages. |
| Alerting System | Flapping notifications (#2) | Build state machine with hysteresis: require N consecutive failures to alert, N consecutive successes to recover. |
| Alerting System | Email deliverability (#7) | Use reputable transactional email provider. Send test alert during onboarding. Monitor delivery metrics. |
| Data Model | Storage explosion (#3) | Design aggregation strategy in initial schema. Raw data retention <= 48 hours. Hourly and daily rollups. |
| Data Model | Uptime calculation edge cases (#6) | Define calculation semantics before writing code. Handle paused monitors, missed checks, and timezone boundaries. |
| Dashboard/UI | Timezone confusion (#11) | Store UTC, display local. Use relative timestamps for recent events. |
| Multi-Protocol Checks | SSL certificate edge cases (#8) | Test against SNI, CDN-fronted, Let's Encrypt, and self-signed scenarios. |
| Multi-Protocol Checks | DNS validation gaps (#9) | Validate expected values, not just resolution success. |
| Multi-Protocol Checks | TCP connection semantics (#12) | Document what TCP checks do and do not verify. Consider banner checks for common services. |
| Authentication | Magic link + alert email contention (#13) | Separate email queues/priorities for auth vs. alerts. |
| Infrastructure | Meta-monitoring gap (#14) | Use external heartbeat monitor. Implement dead man's switch. |
| Billing/Pricing | Cost scaling surprises | Track per-user infrastructure cost. Set resource limits per plan tier. Model costs at 100, 1000, 10000 users before launching. |

## Sources

- [FlareWarden: Why Single-Location Monitoring is Broken (DEV.to)](https://dev.to/khrome83/how-we-built-cross-region-uptime-verification-and-why-single-location-monitoring-is-broken-24mo)
- [Architecture of Uptime Monitoring Service (DEV.to)](https://dev.to/vponamariov/how-i-built-architecture-of-uptime-monitoring-service-54h8)
- [Phare.io: Best Practices to Configure Uptime Monitoring](https://phare.io/blog/best-practices-to-configure-an-uptime-monitoring-service/)
- [OpenStatus: Why Uptime Percentage Is Misleading](https://www.openstatus.dev/guides/why-uptime-percentage-is-misleading)
- [Squadcast: Flapping Alerts Guide](https://www.squadcast.com/blog/how-squadcast-helps-with-flapping-alerts)
- [Datadog: Reduce Alert Flapping](https://docs.datadoghq.com/monitors/guide/reduce-alert-flapping/)
- [Google SRE Book: Distributed Periodic Scheduling](https://sre.google/sre-book/distributed-periodic-scheduling/)
- [InfluxData: Using Time Series Data for Infrastructure Monitoring](https://www.influxdata.com/blog/using-time-series-data-infrastructure-monitoring-advantages-limitations/)
- [UptimeRobot: False Positives Post-Mortem](https://uptimerobot.com/blog/false-positives-in-eu-monitoring-region/)
- [WPX: UptimeRobot False Positives Guide](https://wpx.net/kb/uptime-robot-false-positives/)
- [Watchman Tower: Uptime Monitoring Alerts Best Practices](https://www.watchmantower.com/blog/uptime-monitoring-alerts-and-escalation)
- [Resolve.io: False Positive Alerts as Hidden Risk](https://resolve.io/blog/false-positive-alerts-a-hidden-risk-in-observability)
