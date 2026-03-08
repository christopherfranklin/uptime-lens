---
phase: 6
slug: dashboard
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-08
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.0.18 |
| **Config file** | `vitest.config.mts` |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | DASH-01 | unit | `npx vitest run tests/dashboard/monitor-list.test.tsx -x` | Wave 0 | ⬜ pending |
| 06-01-02 | 01 | 1 | DASH-01 | unit | `npx vitest run tests/dashboard/monitor-list.test.tsx -x` | Wave 0 | ⬜ pending |
| 06-02-01 | 02 | 1 | DASH-02 | unit | `npx vitest run tests/dashboard/chart-queries.test.ts -x` | Wave 0 | ⬜ pending |
| 06-02-02 | 02 | 1 | DASH-02 | unit | `npx vitest run tests/dashboard/response-chart.test.tsx -x` | Wave 0 | ⬜ pending |
| 06-02-03 | 02 | 1 | DASH-03 | unit | `npx vitest run tests/dashboard/uptime-queries.test.ts -x` | Wave 0 | ⬜ pending |
| 06-02-04 | 02 | 1 | DASH-04 | unit | `npx vitest run tests/dashboard/incident-queries.test.ts -x` | Wave 0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/dashboard/monitor-list.test.tsx` — stubs for DASH-01 (enhanced list rendering with stats, summary bar)
- [ ] `tests/dashboard/chart-queries.test.ts` — stubs for DASH-02 (data resolution switching, query correctness)
- [ ] `tests/dashboard/response-chart.test.tsx` — stubs for DASH-02 (component renders, gradient, tooltip)
- [ ] `tests/dashboard/uptime-queries.test.ts` — stubs for DASH-03 (percentage calculation, edge cases, zero-check handling)
- [ ] `tests/dashboard/incident-queries.test.ts` — stubs for DASH-04 (pagination, ordering, time filtering, ongoing pinning)

*Existing infrastructure covers test framework — only test files need creation.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Response time chart renders correctly with gradient fill | DASH-02 | Visual rendering requires browser inspection | Open detail page, verify line chart has area gradient fill, hover tooltip shows timestamp + ms |
| Auto-refresh updates data without loading spinners | DASH-02, DASH-03 | Timing-based visual behavior | Open detail page, wait 60s, verify data updates silently |
| Monitor row click navigates to detail page | DASH-01 | Navigation + routing integration | Click monitor row, verify URL changes to /monitors/[id] |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
