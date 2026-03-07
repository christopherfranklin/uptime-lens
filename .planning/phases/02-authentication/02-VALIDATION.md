---
phase: 02
slug: authentication
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-03-06
---

# Phase 02 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^4.0.18 |
| **Config file** | vitest.config.mts |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | AUTH-01 | unit | `npx vitest run tests/auth/magic-link.test.ts -x` | Plan 01 Task 1 (Wave 0) | pending |
| 02-01-01 | 01 | 1 | AUTH-01 | unit | `npx vitest run tests/auth/api-route.test.ts -x` | Plan 01 Task 1 (Wave 0) | pending |
| 02-01-02 | 01 | 1 | AUTH-02 | unit | `npx vitest run tests/auth/session.test.ts -x` | Plan 01 Task 1 (Wave 0) | pending |
| 02-01-03 | 01 | 1 | AUTH-03 | unit | `npx vitest run tests/auth/logout.test.ts -x` | Plan 01 Task 1 (Wave 0) | pending |
| 02-02-01 | 02 | 2 | AUTH-01 | unit | `npx vitest run tests/auth/login-page.test.tsx -x` | Plan 01 Task 1 (Wave 0) | pending |
| 02-02-02 | 02 | 2 | AUTH-04 | unit | `npx vitest run tests/auth/email-change.test.ts -x` | Plan 01 Task 1 (Wave 0) | pending |
| 02-02-03 | 02 | 2 | AUTH-03 | unit | `npx vitest run tests/auth/settings-page.test.tsx -x` | Plan 01 Task 1 (Wave 0) | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

Wave 0 test stubs are created by **Plan 01, Task 1** (prepended task). All 7 files are created as `test.todo()` stubs, then filled in with real tests in subsequent tasks:

- Plan 01 Task 3 fills in: magic-link, api-route, session, email-change tests
- Plan 02 Task 2 fills in: login-page tests
- Plan 02 Task 3 fills in: logout, settings-page tests

Files:
- [ ] `tests/auth/magic-link.test.ts` -- covers AUTH-01 (auth config exports, magic link plugin presence)
- [ ] `tests/auth/api-route.test.ts` -- covers AUTH-01 (API route exports GET/POST)
- [ ] `tests/auth/session.test.ts` -- covers AUTH-02 (session config values)
- [ ] `tests/auth/logout.test.ts` -- covers AUTH-03 (logout action exports)
- [ ] `tests/auth/login-page.test.tsx` -- covers AUTH-01 (login page renders and submits)
- [ ] `tests/auth/email-change.test.ts` -- covers AUTH-04 (email change sends verification)
- [ ] `tests/auth/settings-page.test.tsx` -- covers AUTH-03 (settings page renders logout)

*Existing infrastructure (Vitest) covers framework needs. Wave 0 creates test stubs, subsequent tasks fill them in.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Magic link email received in inbox | AUTH-01 | External email delivery | Send magic link, check inbox for branded email |
| Session survives browser refresh | AUTH-02 | Requires real browser | Log in, refresh page, confirm still authenticated |
| Logout redirects to landing page | AUTH-03 | Requires real browser | Click logout, confirm redirect to / |
| Email change verification email arrives | AUTH-04 | External email delivery | Change email in settings, check new inbox |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 5s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending (plans revised, awaiting execution)
