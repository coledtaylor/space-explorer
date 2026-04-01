# Feature Plan: Unit System and Orbital Math Library

## Objective
Establish the mathematical foundation (unit constants, vector helpers, and orbital mechanics functions) so all subsequent physics phases can compute orbits, convert units, and express physical quantities consistently.

**Purpose:** Every future phase (gravity, SOI transitions, orbit prediction) depends on having correct, tested orbital math and a documented unit system.
**Output:** `js/units.js`, `js/orbit.js`, extended `js/utils.js`

## Must-Haves (Goal-Backward)

### Observable Truths
- A circular orbit state vector round-trips through `computeOrbitalElements` and `stateFromOrbitalElements` with negligible error
- An elliptical orbit produces 0 < e < 1 with correct apoapsis and periapsis radii
- SOI radius computation produces physically reasonable values (e.g., Earth-Sun system yields ~929,000 km)
- The unit system is documented: what 1 game unit means, what mass units are, what time units are
- All math functions are pure -- no module-level mutable state, no side effects

### Required Artifacts
| Path | Provides | Key Exports |
|------|----------|-------------|
| `js/units.js` | Unit constants and documented unit system | `G`, `AU`, `SCALE`, unit documentation in comments |
| `js/orbit.js` | Orbital mechanics computations | `computeOrbitalElements`, `stateFromOrbitalElements`, `computeApoapsisRadius`, `computePeriapsisRadius`, `trueAnomalyAtTime`, `computeSOIRadius`, `gravityAcceleration` |
| `js/utils.js` | Extended with vec2 helpers and angle normalization | `vec2Add`, `vec2Sub`, `vec2Scale`, `vec2Mag`, `vec2Normalize`, `vec2Dot`, `mod2pi` |

### Key Links
| From | To | Via |
|------|-----|-----|
| `js/orbit.js` | `js/utils.js` | Imports vec2 helpers and `mod2pi` |
| `js/orbit.js` | `js/units.js` | May reference `G` for default values or documentation |
| `stateFromOrbitalElements` | `computeOrbitalElements` | Must be mathematical inverses (round-trip) |
| `trueAnomalyAtTime` | Kepler's equation | Newton-Raphson solver must converge for e < 1 |

## Dependency Graph
```
Task 1 (needs nothing) -> creates: js/units.js, js/utils.js (extended)
Task 2 (needs Task 1)  -> creates: js/orbit.js, verifies entire domain
```

## Execution Sequences
| Sequence | Tasks | Parallel |
|----------|-------|----------|
| 1 | Task 1 | Solo |
| 2 | Task 2 | Solo |

## Tasks

### Task 1: Create unit constants module and extend vector utilities
**Type:** auto
**Sequence:** 1

<files>
js/units.js
js/utils.js
</files>

<action>
Create `js/units.js` with the game's unit system. Document at the top of the file in comments: 1 game unit = 1 km, mass in kg, time in seconds (real-time dt from requestAnimationFrame). Export constants: `G` (gravitational constant scaled to game units: 6.674e-11 km^3 kg^-1 s^-2), `AU` (1 AU in game units/km = 1.496e8), `SCALE` (render scale factor for canvas -- pick a sensible default like 1.0 that can be tuned later). Use UPPER_SNAKE_CASE for constants per project conventions.

Extend `js/utils.js` with vec2 helper functions and angle normalization. Add: `vec2Add(a, b)`, `vec2Sub(a, b)`, `vec2Scale(v, s)`, `vec2Mag(v)`, `vec2Normalize(v)`, `vec2Dot(a, b)`, and `mod2pi(angle)`. Vectors are plain `{x, y}` objects. All functions must be pure. Follow existing code style: named exports, 2-space indent, single quotes, semicolons, no console logging.
</action>

<verify>
1. File exists: `js/units.js` exports `G`, `AU`, `SCALE` with comments documenting the unit system
2. File exists: `js/utils.js` still exports all original functions (`lerp`, `dist`, `clamp`, `seededRandom`, `hslToRgb`, `randomRange`, `randomInt`) plus new vec2 helpers and `mod2pi`
3. Spot-check math: `vec2Mag({x: 3, y: 4})` returns 5, `mod2pi(-Math.PI)` returns approximately `Math.PI`, `vec2Normalize({x: 0, y: 5})` returns `{x: 0, y: 1}`
</verify>

<done>
- `js/units.js` exists with documented unit system and exported constants G, AU, SCALE
- `js/utils.js` has all original exports plus vec2Add, vec2Sub, vec2Scale, vec2Mag, vec2Normalize, vec2Dot, mod2pi
- All new functions are pure (no side effects, no module state)
</done>

### Task 2: Create orbital mechanics module and verify the domain
**Type:** auto
**Sequence:** 2

<files>
js/orbit.js
</files>

<action>
Create `js/orbit.js` implementing 2D orbital mechanics. Import vec2 helpers from `js/utils.js` and constants from `js/units.js` as needed. All functions are pure, named exports.

Functions to implement:

1. `computeOrbitalElements(pos, vel, mu)` -- Given position `{x, y}`, velocity `{x, y}`, and gravitational parameter mu (= G*M), compute and return: `{ a, e, omega, nu, T, epsilon }` (semi-major axis, eccentricity, argument of periapsis, true anomaly, orbital period, specific orbital energy). Use the vis-viva equation and standard orbital mechanics formulas for 2D.

2. `stateFromOrbitalElements(a, e, omega, nu, mu)` -- Inverse of above. From orbital elements, compute and return `{ pos: {x, y}, vel: {x, y} }`.

3. `computeApoapsisRadius(a, e)` -- Returns `a * (1 + e)`.

4. `computePeriapsisRadius(a, e)` -- Returns `a * (1 - e)`.

5. `trueAnomalyAtTime(t, a, e, mu, nu0)` -- Propagate true anomaly forward by time `t`. Convert nu0 to mean anomaly, advance by `n * t` (where n = mean motion), solve Kepler's equation with Newton-Raphson to get eccentric anomaly, convert back to true anomaly. Handle only elliptical orbits (e < 1) for now.

6. `computeSOIRadius(bodyMass, parentMass, orbitalRadius)` -- Returns `orbitalRadius * (bodyMass / parentMass) ** 0.4`.

7. `gravityAcceleration(shipPos, bodyPos, mu)` -- Returns `{x, y}` acceleration vector: `-mu / r^3 * r_vec` where r_vec points from body to ship.

After creating the module, verify correctness by creating a temporary HTML test harness (`tests/orbit-test.html`) that imports the modules and runs these checks in the browser, printing results to the page:
- Circular orbit test: pos = {x: 100, y: 0}, vel = {x: 0, y: sqrt(mu/100)} with mu = 1000. Verify e is approximately 0 and a is approximately 100.
- Round-trip test: take the orbital elements from the circular test, feed them to `stateFromOrbitalElements`, verify pos and vel match originals within tolerance (1e-6).
- Elliptical orbit test: use a velocity less than circular velocity, verify 0 < e < 1, verify periapsis < 100 < apoapsis.
- SOI test: `computeSOIRadius(5.972e24, 1.989e30, 1.496e8)` produces approximately 929000 (Earth's SOI in km).
- The test page should show PASS/FAIL for each check.
</action>

<verify>
1. File exists: `js/orbit.js` with all 7 functions exported
2. File exists: `tests/orbit-test.html` that can be opened in a browser
3. Domain complete: Open `tests/orbit-test.html` in a browser -- all tests show PASS:
   - Circular orbit: e approximately 0, a approximately 100
   - Round-trip: position and velocity match within 1e-6
   - Elliptical orbit: 0 < e < 1, periapsis < r < apoapsis
   - SOI: result approximately 929000 km
4. All functions in `js/orbit.js` are pure (no module-level mutable state)
</verify>

<done>
- `js/orbit.js` exports all 7 orbital mechanics functions
- `tests/orbit-test.html` verifies correctness with all tests passing
- Circular orbit produces e ~= 0, a ~= r
- Round-trip (elements -> state -> elements) is stable within floating-point tolerance
- SOI computation matches known physical values
- All functions are pure with no side effects
</done>

## Verification Checklist
- [x] `js/units.js` exists with documented unit system (game unit = 1 km, mass = kg, time = seconds)
  Completed: 2026-04-01
- [x] `js/units.js` exports G, AU, SCALE constants
  Completed: 2026-04-01
- [x] `js/utils.js` exports vec2Add, vec2Sub, vec2Scale, vec2Mag, vec2Normalize, vec2Dot, mod2pi
  Completed: 2026-04-01
- [x] `js/utils.js` retains all original exports (lerp, dist, clamp, seededRandom, hslToRgb)
  Completed: 2026-04-01
- [x] `js/orbit.js` exports all 7 functions: computeOrbitalElements, stateFromOrbitalElements, computeApoapsisRadius, computePeriapsisRadius, trueAnomalyAtTime, computeSOIRadius, gravityAcceleration
  Completed: 2026-04-01
- [x] All new functions are pure (no module state, no side effects, no console logging)
  Completed: 2026-04-01
- [x] Code style matches conventions: 2-space indent, single quotes, semicolons, named exports, camelCase
  Completed: 2026-04-01
- [x] `tests/orbit-test.html` runs in browser with all checks passing
  Completed: 2026-04-01
- [x] Round-trip test (state -> elements -> state) passes within 1e-6 tolerance
  Completed: 2026-04-01

## Success Criteria
Given a position and velocity around a body, orbital elements are correctly computed and round-trip back to the original state vector. SOI radius matches known physical values. The unit system is fully documented in `js/units.js`. All math functions are pure and follow project conventions.
