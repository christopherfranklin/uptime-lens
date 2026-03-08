---
phase: 4
slug: check-engine
status: draft
nyquist_compliant: true
created: 2026-03-08
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.x |
| **Config file** | vitest.config.ts (root) |
| **Quick run command** | `npx vitest run tests/worker/` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~8 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/worker/`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 8 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| 04-01-01 | 01 | 1 | MON-05, CHK-02 | unit (TDD) | `npx vitest run tests/worker/probes.test.ts` | pending |
| 04-01-02 | 01 | 1 | MON-06 | unit (TDD) | `npx vitest run tests/worker/probes.test.ts` | pending |
| 04-01-03 | 01 | 1 | CHK-01 | unit (TDD) | `npx vitest run tests/worker/check-loop.test.ts` | pending |
| 04-01-04 | 01 | 1 | CHK-03 | unit (TDD) | `npx vitest run tests/worker/check-loop.test.ts` | pending |
| 04-02-01 | 02 | 2 | CHK-02 | unit (TDD) | `npx vitest run tests/worker/rollups.test.ts` | pending |
| 04-02-02 | 02 | 2 | CHK-02 | build | `cd worker && npx tsc --noEmit` | pending |

*Status: pending / green / red / flaky*

---

## Test Creation Strategy

Plans use TDD (`tdd="true"`): tests are created as part of the RED phase before implementation. No separate Wave 0 test scaffold is needed -- TDD tasks create test files with all test cases inline during execution.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Worker runs checks on real HTTP endpoints | MON-05, CHK-01 | Requires live network + running worker | Start worker locally, create HTTP monitor, wait 3 min, verify heartbeat row in DB |
| TCP probe connects to real port | MON-06 | Requires live network target | Create TCP monitor for known open port, verify heartbeat after check |
| SSL cert expiry extraction on real domain | MON-05 | Requires live TLS endpoint | Create SSL monitor for a real HTTPS domain, verify sslExpiresAt populated |
| Worker tick timing is ~30s | CHK-01 | Requires observing worker process timing | Watch worker logs for tick messages, verify ~30s between ticks |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify commands
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] TDD tasks create tests inline (no separate Wave 0 needed)
- [x] No watch-mode flags
- [x] Feedback latency < 8s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
