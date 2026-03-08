---
phase: 3
slug: monitor-management
status: draft
nyquist_compliant: true
wave_0_complete: false
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

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | MON-01 | unit | `npx vitest run tests/monitors/actions.test.ts` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | MON-02 | unit | `npx vitest run tests/monitors/actions.test.ts` | ❌ W0 | ⬜ pending |
| 03-01-03 | 01 | 1 | MON-03 | unit | `npx vitest run tests/monitors/actions.test.ts` | ❌ W0 | ⬜ pending |
| 03-01-04 | 01 | 1 | MON-04 | unit | `npx vitest run tests/monitors/actions.test.ts` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 1 | MON-01 | manual | N/A (UI) | N/A | ⬜ pending |
| 03-02-02 | 02 | 1 | MON-02, MON-04 | manual | N/A (UI) | N/A | ⬜ pending |
| 03-02-03 | 02 | 1 | MON-03 | manual | N/A (UI) | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/monitors/actions.test.ts` — stubs for MON-01 through MON-04 server action tests
- [ ] Test fixtures for mocked db and session

*Existing vitest infrastructure covers framework needs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Slide-out panel opens on create/edit click | MON-01, MON-02 | UI interaction with animation | Click "Create Monitor" → panel slides in from right |
| Type-specific fields show/hide | MON-01 | Dynamic form rendering | Select HTTP/TCP/SSL → verify correct fields appear |
| Delete confirmation dialog | MON-03 | UI dialog flow | Click delete → dialog appears → confirm → monitor removed from list |
| Paused monitor styling in list | MON-04 | Visual styling verification | Pause monitor → verify gray/dimmed row with "Paused" badge |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 5s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
