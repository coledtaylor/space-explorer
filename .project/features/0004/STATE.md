# Feature 0004: Landing & Surface Interaction — State

> Last updated: 2026-04-01

## Current Status

| Field | Value |
|-------|-------|
| **Phase** | Not Started |
| **Status** | Draft |
| **Blocker** | None |

## Phase Progress

| Phase | Status | Started | Completed |
|-------|--------|---------|-----------|
| Phase 1: Landing Detection and Approach HUD | ⬜ Pending | — | — |
| Phase 2: Landing Camera and Surface Rendering | ⬜ Pending | — | — |
| Phase 3: Surface Interaction Panel | ⬜ Pending | — | — |
| Phase 4: Launch from Surface | ⬜ Pending | — | — |

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-01 | Initial feature specification created | — |
| 2026-04-01 | Landing approach: automatic mode activation when close and below escape velocity | Player manages thrust manually; HUD provides altitude, descent rate, horizontal velocity |
| 2026-04-01 | Landing camera: smooth zoom-in as altitude decreases, body fills screen | Lunar-lander feel; immersive descent experience |
| 2026-04-01 | Success/crash: must be below threshold for BOTH descent rate AND horizontal velocity | Too fast on either axis = crash; requires precision from the player |
| 2026-04-01 | Surface interaction: HUD panel alongside game view, not full-screen overlay | Ship remains visible on the surface; consistent with existing scan panel pattern |
| 2026-04-01 | Launch: manual thrust (W key) off surface, fuel cost proportional to body mass/gravity | Player must achieve orbit themselves; heavier bodies cost more fuel |
| 2026-04-01 | Gas giants: cannot be landed on, atmospheric crush boundary at some altitude | Distinct body type behavior; prevents meaningless landings |
| 2026-04-01 | 4 phases instead of suggested 5 | Gas giant exclusion fits naturally in Phase 1 (landing detection) rather than as a separate phase; body-type surface variations fit in Phase 3 (surface interaction) |

## Blockers & Issues

| Issue | Status | Resolution |
|-------|--------|------------|
| None | — | — |

---
*Updated by `/spec:execute-phase` during implementation*
