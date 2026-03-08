---
phase: 3
slug: monitor-management
status: draft
nyquist_compliant: true
created: 2026-03-07
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.x |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run tests/monitors/` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/monitors/`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| 03-01-01 | 01 | 1 | MON-01 | unit (TDD) | `npx vitest run tests/monitors/actions.test.ts` | pending |
| 03-01-02 | 01 | 1 | MON-02 | unit (TDD) | `npx vitest run tests/monitors/actions.test.ts` | pending |
| 03-01-03 | 01 | 1 | MON-03 | unit (TDD) | `npx vitest run tests/monitors/actions.test.ts` | pending |
| 03-01-04 | 01 | 1 | MON-04 | unit (TDD) | `npx vitest run tests/monitors/actions.test.ts` | pending |
| 03-02-01 | 02 | 2 | MON-01 | build + manual | `npx next build` | pending |
| 03-02-02 | 02 | 2 | MON-02, MON-04 | build + manual | `npx next build` | pending |
| 03-02-03 | 02 | 2 | MON-03 | build + manual | `npx next build` | pending |

*Status: pending / green / red / flaky*

---

## Test Creation Strategy

Plan 01 Task 1 uses TDD (`tdd="true"`): tests are created as part of the RED phase before implementation. No separate Wave 0 test scaffold is needed -- the TDD task creates `tests/monitors/actions.test.ts` with all test cases inline during execution.

Plan 02 tasks are UI components verified by `npx next build` (type checking) and a human checkpoint (Task 3).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Slide-out panel opens on create/edit click | MON-01, MON-02 | UI interaction with animation | Click "Create Monitor" -> panel slides in from right |
| Type-specific fields show/hide | MON-01 | Dynamic form rendering | Select HTTP/TCP/SSL -> verify correct fields appear |
| Delete confirmation dialog | MON-03 | UI dialog flow | Click delete -> dialog appears -> confirm -> monitor removed from list |
| Paused monitor styling in list | MON-04 | Visual styling verification | Pause monitor -> verify gray/dimmed row with "Paused" badge |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify commands
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] TDD task creates tests inline (no separate Wave 0 needed)
- [x] No watch-mode flags
- [x] Feedback latency < 5s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
