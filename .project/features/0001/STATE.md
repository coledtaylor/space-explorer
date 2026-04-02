# Feature 0001: Physics Engine & Unit System -- State

> Last Updated: 2026-04-01

## Current Status

| Field | Value |
|-------|-------|
| **Phase** | Phase 5: HUD, Orbit Rendering, and Integration |
| **Status** | ✅ Complete |
| **Blocker** | None |

## Phase Progress

| Phase | Status | Started | Completed |
|-------|--------|---------|-----------|
| Phase 1: Unit System and Orbital Math Library | ✅ Complete | 2026-04-01 | 2026-04-01 |
| Phase 2: Celestial Body Model | ✅ Complete | 2026-04-01 | 2026-04-01 |
| Phase 3: Ship Physics Rewrite | ✅ Complete | 2026-04-01 | 2026-04-01 |
| Phase 4: SOI Transitions and Reference Frames | ✅ Complete | 2026-04-01 | 2026-04-01 |
| Phase 5: HUD, Orbit Rendering, and Integration | ✅ Complete | 2026-04-01 | 2026-04-01 |

## Task Progress

| Task | Status | Sequence | Notes |
|------|--------|----------|-------|
| 1.1: Unit constants + vec2 helpers | ✅ Complete | 1 | Created js/units.js, extended js/utils.js |
| 1.2: Orbital mechanics module + tests | ✅ Complete | 2 | Created js/orbit.js, tests/orbit-test.html |
| 2.1: Rewrite celestial.js | ✅ Complete | 1 | Clean break rewrite with physical properties and Keplerian motion |
| 2.2: Verify Keplerian motion | ✅ Complete | 2 | Created tests/celestial.test.html, all 8 checks pass |
| 3.1: Rewrite ship.js | ✅ Complete | 1 | Gravitational physics, impulse thrust, orbital elements, preserved rendering |
| 3.2: Ship physics verification | ✅ Complete | 2 | tests/ship-physics-test.html with 5 tests |
| 4.1: Create physics.js | ✅ Complete | 1 | SOI detection, frame transitions, world position |
| 4.2: Wire SOI into main.js | ✅ Complete | 2 | Game loop integration, camera, HUD, coordinate display |
| 5.1: Orbital HUD + controls hint | ✅ Complete | 1 | index.html + css/style.css updated |
| 5.2: Orbit path rendering | ✅ Complete | 1 | drawOrbitPath in renderer.js, elliptical + hyperbolic |
| 5.3: Rewire main.js integration | ✅ Complete | 2 | Full integration, orbital HUD wiring, old code removed |

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-01 | Clean break rewrite of ship.js and celestial.js | New physics model fundamentally different from arcade |
| 2026-04-01 | Patched conics, not N-body simulation | Tractable math, predictable orbits, proven model (KSP) |
| 2026-04-01 | SI-like unit system (1 gu = 1 km, kg, seconds) | Documented in js/units.js |
| 2026-04-01 | 2D orbital elements (4 instead of 6) | No inclination/RAAN in 2D |
| 2026-04-01 | Ship position stored relative to SOI body | Simplifies gravity and SOI transitions |
| 2026-04-01 | Planets on rails (Kepler propagation) | Determinism and performance |
| 2026-04-01 | Semi-implicit Euler integration | Symplectic, preserves energy |
| 2026-04-01 | Ship starts at (500, 0) with v = sqrt(mu/500) | Stable circular orbit initialization |
| 2026-04-01 | Hyperbolic orbits show ∞ for Ap and Period | Clear visual distinction for escape trajectories |

## Blockers & Issues

| Issue | Status | Resolution |
|-------|--------|------------|
| None | -- | -- |

---
*Updated by `/spec:execute-phase` during implementation*
