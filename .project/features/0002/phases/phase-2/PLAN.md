# Feature Plan: Multi-Level SOI Transitions (Phase 2)

## Objective
Extend `physics.js` to support three-level SOI transitions (star <-> planet <-> moon) so the ship can enter a moon's SOI from within a planet's SOI, escape back, and transfer between moons. Update `shipWorldPosition()` to handle two-level nesting (moon position is relative to planet, which is relative to star).

**Purpose:** Enable the core multi-body orbital navigation that defines the Celestial System Overhaul -- without this, moons generated in Phase 1 are visual-only and non-interactive.
**Output:** Modified `js/physics.js` with moon-aware SOI detection, frame transitions, and world-space position computation; modified `js/main.js` for any integration adjustments.

## Must-Haves (Goal-Backward)

### Observable Truths
1. Ship in planet SOI detects entry into a child moon's SOI and transitions smoothly
2. Ship in moon SOI that exceeds moon's SOI radius escapes to parent planet's SOI
3. HUD location display shows the current SOI body name at all three levels (star, planet, moon)
4. Ship world-space position has no discontinuity (jump) on any SOI transition
5. Orbital elements are recomputed on every transition, and the orbit path renders correctly around the new SOI body
6. Two-level escape works: ship in moon SOI can escape moon, then escape planet, reaching star SOI

### Required Artifacts
| Path | Provides | Key Changes |
|------|----------|-------------|
| `js/physics.js` | SOI transition logic for all 3 levels | `moonOrbitalVelocity()`, updated `checkSOITransition()`, updated `shipWorldPosition()` |
| `js/main.js` | Integration wiring | Pass moon children to SOI checks if needed (likely no changes -- `checkSOITransition` already receives full `system`) |

### Key Links
| From | To | Via |
|------|-----|-----|
| `checkSOITransition` (planet branch) | moon SOI entry | iterate `current.children` for moon proximity |
| `checkSOITransition` (moon branch) | planet SOI escape | convert position/velocity from moon-relative to planet-relative frame |
| `shipWorldPosition` | world coords for moon SOI | `ship.pos + moon.pos + planet.pos` (two-level offset) |
| `moonOrbitalVelocity` | frame conversion | compute moon's velocity relative to its parent planet |

## Dependency Graph
```
Task 1 (needs: Phase 1 complete) -> creates: updated physics.js with 3-level SOI logic
Task 2 (needs: Task 1) -> creates: verified integration, edge cases handled
```

## Execution Sequences
| Sequence | Tasks | Parallel |
|----------|-------|----------|
| 1 | Task 1 | No |
| 2 | Task 2 | No |

## Tasks

### Task 1: Implement three-level SOI transitions and world position
**Type:** auto
**Sequence:** 1
**Status:** Complete
Completed: 2026-04-01

<files>
js/physics.js
</files>

<action>
Extend `physics.js` to handle moon-level SOI transitions. Three changes:

1. **Add `moonOrbitalVelocity(moon, planet)`** -- analogous to `planetOrbitalVelocity` but computes a moon's velocity relative to its parent planet using `planet.mu` and the moon's `orbitalElements`. Follow the same pattern as `planetOrbitalVelocity`.

2. **Update `checkSOITransition()`** to handle three SOI levels:
   - **Planet SOI branch** (`current.kind === 'planet'`): Before checking escape, check if ship has entered any child moon's SOI. Iterate `current.children` (the moon array from Phase 1). If ship distance to a moon < moon's soiRadius, transition into moon SOI: subtract moon position, subtract moon orbital velocity, set `ship.currentSOIBody = moon`, recompute orbital elements against `moon.mu`. Guard: `current.children` may be undefined or empty -- skip moon check if so.
   - **New moon SOI branch** (`current.kind === 'moon'`): Check if ship has escaped moon's SOI (distance from origin > `current.soiRadius`). If so, transition back to parent planet SOI: add moon position, add moon orbital velocity, set `ship.currentSOIBody = current.parentBody`, recompute orbital elements against `current.parentBody.mu`.
   - Keep existing star->planet and planet->star transitions unchanged.

3. **Update `shipWorldPosition()`** to handle three levels:
   - Star SOI: return `{x: ship.x, y: ship.y}` (unchanged)
   - Planet SOI: return `{x: ship.x + body.x, y: ship.y + body.y}` (unchanged)
   - Moon SOI: the moon's x,y are relative to its parent planet, so return `{x: ship.x + body.x + body.parentBody.x, y: ship.y + body.y + body.parentBody.y}`

Follow existing code patterns exactly: same orbital element recomputation structure, same `vec2Mag` usage, same `{ transitioned, from, to }` return shape.
</action>

<verify>
1. File structure: `js/physics.js` exports `moonOrbitalVelocity`, `shipWorldPosition`, `planetOrbitalVelocity`, `checkSOITransition`
2. Code review: `checkSOITransition` has three branches -- `star`, `planet` (with nested moon-entry check), and `moon` (with escape-to-planet logic)
3. Code review: `shipWorldPosition` has three branches -- star (ship coords), planet (ship + planet), moon (ship + moon + moon.parentBody)
4. Code review: moon SOI entry subtracts moon position and moon orbital velocity; moon SOI escape adds them back (symmetric frame conversion)
5. Code review: orbital elements are recomputed with correct `mu` on every transition (moon.mu for moon entry, parentBody.mu for moon escape)
6. No syntax errors: open `index.html` in browser, confirm no console errors on load
</verify>

<done>
physics.js handles star<->planet<->moon SOI transitions with correct frame conversions, and shipWorldPosition returns correct world coordinates at all three nesting levels.
</done>

### Task 2: Integration verification and edge case hardening
**Type:** auto
**Sequence:** 2
**Status:** Complete
Completed: 2026-04-01

<files>
js/physics.js
js/main.js
</files>

<action>
Verify and harden the integration between the new three-level SOI logic and the game loop:

1. **Priority ordering in planet branch**: When checking moon entry inside the planet SOI branch, check moon entry BEFORE checking planet escape. This prevents the edge case where a ship near a moon at the planet SOI boundary escapes the planet instead of entering the moon. The current structure already checks escape second for the star branch -- mirror that pattern.

2. **Guard against missing children**: Ensure the planet branch gracefully handles planets with no `children` array (empty array or undefined). Use `const moons = current.children || [];` before iterating.

3. **Two-level escape continuity**: After escaping a moon to planet SOI, the next frame's `checkSOITransition` call will naturally handle planet-to-star escape if the ship is also outside the planet's SOI. Verify this works by code-tracing: after moon escape, ship position is planet-relative, and the planet branch's escape check uses distance from origin. No special handling needed, but confirm the logic is correct.

4. **HUD integration**: In `main.js`, the location display already reads `ship.currentSOIBody.name`. Confirm this works for moon bodies (moons must have a `name` property -- Phase 1 provides this). No changes expected.

5. **drawOrbitPath integration**: In `main.js`, `drawOrbitPath(ctx, camera, ship.orbit, ship.currentSOIBody)` already passes the current SOI body. Since `shipWorldPosition` now returns correct world coords for moons, and `drawOrbitPath` draws relative to `soiBody`, orbit rendering should work. Confirm the renderer uses the soiBody's world position for the orbit center -- if it uses `soiBody.x, soiBody.y` directly, this is correct for planets (star-relative) but NOT for moons (planet-relative). If `drawOrbitPath` uses soiBody.x/y for the orbit center, add a `bodyWorldPosition(body)` helper to `physics.js` that returns the body's world-space position (same logic as shipWorldPosition but for a body), and update `renderer.js` to use it for the orbit center.
</action>

<verify>
1. Serve the game locally and load it in a browser -- no console errors
2. Fly ship into a planet's SOI -- HUD shows planet name, orbit path renders around planet
3. If the planet has moons (check by visual inspection), fly toward a moon and enter its SOI -- HUD updates to show moon name, orbit path renders around moon
4. Escape the moon's SOI by thrusting prograde -- HUD switches back to planet name, no visible position jump
5. Escape the planet's SOI -- HUD switches to star name, no position jump
6. Domain complete: full transition chain star->planet->moon->planet->star works with correct HUD, smooth position, and accurate orbit rendering at each level
</verify>

<done>
Ship can enter moon SOI from planet SOI, escape back to planet SOI, and continue to star SOI. HUD correctly displays current SOI body at all levels. No position discontinuities on any transition. Orbit path renders accurately around the current SOI body at all three levels.
</done>

## Verification Checklist
- [ ] Ship in planet SOI enters moon SOI when crossing moon's SOI boundary -- HUD shows moon name
- [ ] Ship escapes moon SOI back to planet SOI with correct velocity frame conversion -- no position jump
- [ ] Ship world-space position is continuous across all transitions (star, planet, moon)
- [ ] Orbital elements recomputed correctly on each transition -- orbit path renders around current SOI body
- [ ] Two-level escape (moon -> planet -> star) works across consecutive frames
- [ ] Planets with no moons do not cause errors in the planet SOI branch

## Success Criteria
The ship can complete the full multi-level SOI transition chain: orbit a moon, escape to parent planet SOI, coast to another moon's SOI, enter it, escape again, and leave the planet SOI -- all with correct HUD display, no position jumps, and accurate orbit path rendering at every level.
