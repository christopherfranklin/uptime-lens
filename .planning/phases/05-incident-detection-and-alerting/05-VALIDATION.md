---
phase: 5
slug: incident-detection-and-alerting
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-07
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest |
| **Config file** | `vitest.config.ts` (root) |
| **Quick run command** | `npx vitest run tests/alerting/ --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/alerting/ --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | ALR-01, ALR-02 | unit | `npx vitest run tests/alerting/incident-detection.test.ts` | No -- Wave 0 | pending |
| 05-01-02 | 01 | 1 | MON-07 | unit | `npx vitest run tests/alerting/ssl-expiry.test.ts` | No -- Wave 0 | pending |
| 05-01-03 | 01 | 1 | -- | unit | `npx vitest run tests/alerting/email-templates.test.ts` | No -- Wave 0 | pending |
| 05-01-04 | 01 | 1 | -- | unit | `npx vitest run tests/alerting/format-duration.test.ts` | No -- Wave 0 | pending |
| 05-02-01 | 02 | 1 | ALR-03 | unit | `npx vitest run tests/alerting/weekly-digest.test.ts` | No -- Wave 0 | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [ ] `tests/alerting/incident-detection.test.ts` -- stubs for ALR-01, ALR-02 (incident open/close state machine)
- [ ] `tests/alerting/ssl-expiry.test.ts` -- stubs for MON-07 (SSL threshold logic)
- [ ] `tests/alerting/weekly-digest.test.ts` -- stubs for ALR-03 (digest scheduling + content)
- [ ] `tests/alerting/email-templates.test.ts` -- template rendering verification
- [ ] `tests/alerting/format-duration.test.ts` -- duration formatting utility

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Email arrives in inbox with correct branding | ALR-01, ALR-02, MON-07, ALR-03 | Requires real Resend API + email client rendering | Send test alert via worker; verify email received with correct layout, colors, and content |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
