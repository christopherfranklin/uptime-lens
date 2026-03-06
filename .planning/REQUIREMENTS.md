# Requirements: Uptime Lens

**Defined:** 2026-03-06
**Core Value:** Indie developers know instantly when their sites or services go down — and trust the product enough to pay for it month over month.

## v1 Requirements

### Authentication

- [ ] **AUTH-01**: User can sign up and log in via magic link (passwordless email)
- [ ] **AUTH-02**: User session persists across browser refresh
- [ ] **AUTH-03**: User can log out from any page
- [ ] **AUTH-04**: User can change their email address

### Monitor Management

- [ ] **MON-01**: User can create a monitor with name, URL/host, and check type (HTTP, TCP, SSL)
- [ ] **MON-02**: User can edit an existing monitor's settings
- [ ] **MON-03**: User can delete a monitor
- [ ] **MON-04**: User can pause and resume a monitor
- [ ] **MON-05**: User can monitor HTTP(S) URLs with expected status codes
- [ ] **MON-06**: User can monitor TCP port connectivity
- [ ] **MON-07**: User receives alerts when SSL certificates approach expiry (30, 14, 7, 1 day)

### Check Engine

- [ ] **CHK-01**: Monitors are checked automatically every 3 minutes
- [ ] **CHK-02**: Check results include response time, status, and error details
- [ ] **CHK-03**: A monitor is only declared down after 2-3 consecutive failures (retry logic)

### Alerting

- [ ] **ALR-01**: User receives email when a monitor goes down
- [ ] **ALR-02**: User receives email when a monitor recovers (with downtime duration)
- [ ] **ALR-03**: User receives a weekly email digest with uptime percentages and notable incidents

### Dashboard

- [ ] **DASH-01**: User sees all monitors in a list with current status (up/down/paused) and response time
- [ ] **DASH-02**: User can view response time charts for a monitor (24h, 7d, 30d, 90d)
- [ ] **DASH-03**: User can see uptime percentages per monitor (24h, 7d, 30d, 90d)
- [ ] **DASH-04**: User can view a log of downtime incidents per monitor with start/end times and duration

### Billing

- [ ] **BILL-01**: User can start a free trial without entering payment info
- [ ] **BILL-02**: User can subscribe to a paid plan via Stripe Checkout
- [ ] **BILL-03**: Monitor creation is limited based on subscription plan
- [ ] **BILL-04**: User is notified and given a grace period when payment fails

## v2 Requirements

### Notifications

- **NOTF-01**: User can receive webhook notifications on state change
- **NOTF-02**: User can configure notification preferences per monitor

### Monitor Types

- **MTYP-01**: User can monitor DNS records (A, AAAA, CNAME, MX)
- **MTYP-02**: User can configure check intervals per monitor (1m, 3m, 5m)

### Status Pages

- **STAT-01**: User gets a public status page auto-generated from monitor data
- **STAT-02**: User can choose which monitors appear on the status page

### Reporting

- **REPT-01**: User can view a 90-day uptime timeline visualization per monitor

## Out of Scope

| Feature | Reason |
|---------|--------|
| SMS/voice call notifications | Telecom costs eat margins at $5-7/mo price point; email + future webhooks cover indie dev needs |
| Slack/Discord/Teams native integrations | High maintenance; generic webhooks (v2) cover 80% of use cases at 10% effort |
| Multi-region monitoring | 3-5x infrastructure cost increase; single region + retry catches 99% of real outages |
| Incident management / on-call rotation | Different product for different audience (PagerDuty, OpsGenie) |
| Transaction / synthetic monitoring | Requires headless browser infrastructure; different product category (Checkly) |
| Real User Monitoring (RUM) | Entirely different architecture and product category |
| Cron job / heartbeat monitoring | Different monitoring paradigm (push vs pull) |
| Mobile app | Responsive web dashboard sufficient for indie devs |
| API for programmatic management | Low priority for users managing 5-20 monitors via UI |
| Team/multi-user accounts | Single-user accounts for v1; adds auth/billing complexity |
| OAuth login | Magic link is sufficient and simpler |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | — | Pending |
| AUTH-02 | — | Pending |
| AUTH-03 | — | Pending |
| AUTH-04 | — | Pending |
| MON-01 | — | Pending |
| MON-02 | — | Pending |
| MON-03 | — | Pending |
| MON-04 | — | Pending |
| MON-05 | — | Pending |
| MON-06 | — | Pending |
| MON-07 | — | Pending |
| CHK-01 | — | Pending |
| CHK-02 | — | Pending |
| CHK-03 | — | Pending |
| ALR-01 | — | Pending |
| ALR-02 | — | Pending |
| ALR-03 | — | Pending |
| DASH-01 | — | Pending |
| DASH-02 | — | Pending |
| DASH-03 | — | Pending |
| DASH-04 | — | Pending |
| BILL-01 | — | Pending |
| BILL-02 | — | Pending |
| BILL-03 | — | Pending |
| BILL-04 | — | Pending |

**Coverage:**
- v1 requirements: 25 total
- Mapped to phases: 0
- Unmapped: 25 ⚠️

---
*Requirements defined: 2026-03-06*
*Last updated: 2026-03-06 after initial definition*
