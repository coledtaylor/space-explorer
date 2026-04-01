# Feature Plan: Ship Physics Rewrite (Phase 3)

## Objective
Rewrite `js/ship.js` so the ship moves under gravitational influence of its current SOI body using patched conics physics. Remove all arcade physics (drag, speed cap, constant acceleration). Thrust applies impulse in vacuum along the ship heading. After each update, the ship computes and stores its Keplerian orbital elements.

**Purpose:** The ship is the player's primary interaction with the physics engine. Without realistic ship physics, no future feature (SOI transitions, maneuver planning, orbital rendezvous) can work. This phase makes the ship a proper orbital body.

**Output:** A rewritten `js/ship.js` that integrates with `js/orbit.js` (Phase 1) and the new celestial body model (Phase 2).

## Must-Haves (Goal-Backward)

### Observable Truths
- Ship placed in a circular orbit (v = sqrt(mu/r), perpendicular to radius) completes 100+ orbits with no thrust and no measurable energy drift
- Prograde thrust (W/Up) raises the far side of the orbit (apoapsis increases)
- Retrograde thrust (S/Down) lowers the far side of the orbit (periapsis decreases)
- Ship with zero fuel cannot thrust regardless of input
- There is no drag and no speed cap -- velocity changes only via gravity or thrust
- Ship's computed orbital elements (a, e, apoapsis, periapsis, T) are physically consistent with its state vector
- Ship renders correctly: triangle body, engine glow on thrust

### Required Artifacts
| Path | Provides | Key Exports |
|------|----------|-------------|
| `js/ship.js` | Ship class with gravitational physics, thrust model, orbital element computation, rendering | `Ship` |

### Dependencies (from prior phases)
| Path | Required From | Used For |
|------|---------------|----------|
| `js/orbit.js` | Phase 1 | `computeOrbitalElements`, `gravityAcceleration` |
| `js/units.js` | Phase 1 | `G` constant (if needed by ship) |
| `js/celestial.js` | Phase 2 | SOI body objects with `mass`, `mu`, `x`, `y`, `radius` properties |
| `js/input.js` | Existing | `up`, `down`, `left`, `right`, `aimAngle` |

### Key Links
| From | To | Via |
|------|-----|-----|
| `Ship.update()` | `orbit.js` | `gravityAcceleration(shipPos, bodyPos, mu)` for gravity each frame |
| `Ship.update()` | `orbit.js` | `computeOrbitalElements(pos, vel, mu)` to refresh `ship.orbit` |
| `Ship.update()` | `input.js` | `input.up`/`input.down` for thrust, `input.aimAngle` for heading |
| `Ship.update()` | SOI body | `currentSOIBody.x`, `.y`, `.mu`, `.radius` for gravity source |
| `Ship.draw()` | `this.thrustActive` | Engine glow triggers on thrust state |

## Dependency Graph
```
Task 1 (needs: orbit.js, units.js from Phase 1; celestial body model from Phase 2)
  → creates: js/ship.js with physics, thrust, orbital elements, rendering
Task 2 (needs: Task 1)
  → verifies: orbital stability, thrust behavior, energy conservation
```

## Execution Sequences
| Sequence | Tasks | Parallel |
|----------|-------|----------|
| 1 | Task 1: Rewrite ship.js | No |
| 2 | Task 2: Verification harness | No |

## Tasks

### Task 1: Rewrite ship.js with gravitational physics, thrust, orbital elements, and rendering
**Type:** auto
**Sequence:** 1
**Status:** complete
Completed: 2026-04-01

<files>
js/ship.js
</files>

<action>
Complete rewrite of `js/ship.js`. Import `computeOrbitalElements` and `gravityAcceleration` from `./orbit.js`.

**Ship state (constructor):**
- `x`, `y` -- position relative to current SOI body
- `vx`, `vy` -- velocity relative to current SOI body
- `angle` -- heading (from input.aimAngle)
- `fuel` -- starts at 100
- `thrustActive` -- boolean, set each frame
- `currentSOIBody` -- reference to the body the ship orbits (set externally by main.js)
- `orbit` -- object `{ a, e, omega, nu, T, apoapsis, periapsis, altitude }`, recomputed each frame
- Remove entirely: `drag`, `maxSpeed`, `acceleration` (constant), `trail`

**update(dt, input, currentSOIBody):**
1. Set `this.angle = input.aimAngle`
2. Compute gravity: call `gravityAcceleration({x: this.x, y: this.y}, {x: currentSOIBody.x, y: currentSOIBody.y}, currentSOIBody.mu)` -- but since ship position is relative to SOI body, the body position in this frame is `{x: 0, y: 0}`. Use `gravityAcceleration({x: this.x, y: this.y}, {x: 0, y: 0}, currentSOIBody.mu)`.
3. Apply gravity to velocity: `vx += ax * dt`, `vy += ay * dt`
4. Thrust: if `input.up` and `fuel > 0`, apply forward impulse along heading. If `input.down` and `fuel > 0`, apply retrograde impulse. Use a constant thrust magnitude (tunable, define as `THRUST_POWER` constant at module top, e.g., 10-50 game-units/s^2). Consume fuel proportional to thrust duration. Set `this.thrustActive` accordingly.
5. Integrate position: `x += vx * dt`, `y += vy * dt`
6. Compute orbital elements: call `computeOrbitalElements({x: this.x, y: this.y, vx: this.vx, vy: this.vy}, currentSOIBody.mu)` and store result in `this.orbit`. Also compute `altitude = dist(0, 0, this.x, this.y) - currentSOIBody.radius`.

**getSpeed():** return velocity magnitude.

**getOrbitalState():** return `{ x: this.x, y: this.y, vx: this.vx, vy: this.vy }`.

**draw(ctx, camera):** Keep the existing ship body drawing (triangle shape) and engine glow. Engine glow triggers on `this.thrustActive && this.fuel > 0`. Remove trail rendering entirely. The ship's screen position is computed from its world position (which main.js must provide by adding SOI body absolute position to ship relative position -- but for draw, pass the ship's world-space position via camera offset as before).

**Constants at module top:**
- `THRUST_POWER` -- thrust acceleration in game-units/s^2
- `FUEL_CONSUMPTION_RATE` -- fuel units consumed per second of thrust

Follow all codebase conventions: named export, 2-space indent, single quotes, no console logging, brief `//` section comments.
</action>

<verify>
1. File exists: `js/ship.js` exports `Ship` class
2. No references to `drag`, `maxSpeed`, `acceleration` (as the old constant), or `trail` in the file
3. Constructor initializes: x, y, vx, vy, angle, fuel, thrustActive, currentSOIBody, orbit
4. `update` method signature is `update(dt, input, currentSOIBody)`
5. `update` calls `gravityAcceleration` and `computeOrbitalElements` from orbit.js
6. Thrust only applies when fuel > 0 and input.up or input.down is true
7. No drag applied to velocity anywhere
8. No speed clamping anywhere
9. `draw` method preserves triangle ship body and engine glow (glow keyed on `thrustActive`)
10. Module imports from `./orbit.js` are present
</verify>

<done>
Ship class is fully rewritten with gravitational physics, impulse thrust (prograde/retrograde), orbital element computation per frame, and preserved rendering. No arcade physics remain. Ready for integration testing.
</done>

### Task 2: Create verification harness and validate orbital mechanics
**Type:** auto
**Sequence:** 2

<files>
tests/ship-physics-test.html
</files>

<action>
Create a standalone HTML test harness that imports `js/ship.js`, `js/orbit.js`, `js/units.js`, and `js/utils.js` as ES modules and runs automated physics validation. The harness should run in a browser (open the HTML file via a local server) and print results to the page.

**Test 1: Circular orbit stability**
- Create a mock SOI body (star) with known mu (e.g., mu = 1e6)
- Place ship at position (r, 0) where r = 500
- Set ship velocity to (0, -sqrt(mu/r)) -- circular orbit velocity, perpendicular to radius
- Run ship.update() in a loop for 100 orbital periods (T = 2*PI*sqrt(r^3/mu)), using dt = 0.016
- After simulation, check: distance from origin should be within 1% of r. Specific orbital energy should be within 0.1% of initial value.
- Report PASS/FAIL

**Test 2: Prograde thrust raises apoapsis**
- Same circular orbit setup
- After a few orbits, simulate prograde thrust by setting input.up = true for a short burst (0.5s)
- After thrust, check: ship.orbit.apoapsis > initial circular radius
- Report PASS/FAIL

**Test 3: Retrograde thrust lowers periapsis**
- Same circular orbit setup
- Simulate retrograde thrust (input.down = true) for a short burst
- After thrust, check: ship.orbit.periapsis < initial circular radius
- Report PASS/FAIL

**Test 4: Zero fuel prevents thrust**
- Set ship.fuel = 0, apply input.up = true
- Run one update step, check velocity unchanged from gravity-only expectation
- Report PASS/FAIL

**Test 5: Energy conservation**
- Circular orbit, run 10 full periods
- Compute specific orbital energy each period: epsilon = v^2/2 - mu/r
- Check max deviation from initial energy is < 0.1%
- Report PASS/FAIL

The mock input object only needs: `aimAngle`, `up`, `down`, `left`, `right` properties. The mock SOI body needs: `x`, `y`, `mu`, `radius`, `mass`.

Print each test result with test name and PASS/FAIL to the page body. Use simple DOM manipulation (createElement, appendChild).
</action>

<verify>
1. File exists: `tests/ship-physics-test.html`
2. Open via local HTTP server (e.g., `npx serve . -p 8080` from repo root, then visit `http://localhost:8080/tests/ship-physics-test.html`)
3. All 5 tests display PASS on the page:
   - Circular orbit stability: PASS
   - Prograde thrust raises apoapsis: PASS
   - Retrograde thrust lowers periapsis: PASS
   - Zero fuel prevents thrust: PASS
   - Energy conservation: PASS
4. Domain complete: Ship orbits stably under gravity, thrust works as expected in both directions, fuel constraint is enforced, energy is conserved
</verify>

<done>
All 5 physics tests pass in the browser. Ship physics are verified: stable orbits, correct thrust behavior, fuel enforcement, energy conservation. Phase 3 domain is proven complete.
</done>

## Verification Checklist
- [ ] `js/ship.js` contains no references to `drag`, `maxSpeed`, or old `acceleration` constant
- [ ] `js/ship.js` imports from `./orbit.js`
- [ ] Ship.update accepts `(dt, input, currentSOIBody)` and applies gravity + optional thrust
- [ ] Circular orbit (v = sqrt(mu/r)) is stable over 100+ orbits with no thrust
- [ ] Prograde thrust raises apoapsis; retrograde lowers periapsis
- [ ] Zero fuel prevents any thrust
- [ ] Energy conservation holds within 0.1% over 10 orbits
- [ ] Ship rendering preserved (triangle body, engine glow on thrust)
- [ ] All 5 tests in `tests/ship-physics-test.html` pass

## Success Criteria
Ship orbits stably with no thrust (no drift over 100+ orbits). Prograde/retrograde thrust correctly modifies the orbit. No drag, no speed cap. Orbital elements are physically consistent. All verified by automated browser tests.
