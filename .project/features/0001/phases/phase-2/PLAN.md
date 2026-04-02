# Feature Plan: Celestial Body Model (Phase 2)

## Objective
Rewrite `js/celestial.js` so that celestial bodies carry physical properties (mass, radius, mu, soiRadius) and orbit on Keplerian rails, replacing the old `orbitRadius`/`orbitAngle`/`orbitSpeed` model entirely.

**Purpose:** Phase 1 built the math library (`js/orbit.js`, `js/units.js`, vec2 helpers in `js/utils.js`). This phase uses that foundation to give celestial bodies real physical identities and deterministic Keplerian motion, which Phase 3 (ship physics) depends on.

**Output:** Rewritten `js/celestial.js` exporting `generateSystem(seed)` (structured return) and `updateBodyPositions(system, dt)`.

## Must-Haves (Goal-Backward)

### Observable Truths
- Every star has `mass`, `radius`, `mu`, and `soiRadius` properties
- Every planet has `mass`, `radius`, `mu`, `soiRadius`, `parentBody`, and `orbitalElements` (a, e, omega, nu0)
- Planets move along elliptical paths derived from Keplerian orbital elements, not `angle += speed * dt`
- `generateSystem(seed)` returns `{ star, planets, bodies }` (structured), not a flat array
- System generation is fully deterministic for a given seed
- A planet returns to approximately the same position after one orbital period
- Anomalies are preserved unchanged (no physics, just visual markers)
- No `orbitAngle`, `orbitSpeed`, or `orbitRadius` properties exist on any body

### Required Artifacts
| Path | Provides | Key Exports |
|------|----------|-------------|
| `js/celestial.js` | Rewritten body generation + Keplerian motion | `generateSystem`, `updateBodyPositions` |

### Key Links
| From | To | Via |
|------|-----|-----|
| `celestial.js` generateSystem | `js/units.js` | Import `G`, `AU`, `SCALE` for physical constants |
| `celestial.js` generateSystem | `js/orbit.js` | Import `computeSOIRadius` for planet SOI |
| `celestial.js` updateBodyPositions | `js/orbit.js` | Import `trueAnomalyAtTime`, `stateFromOrbitalElements` for rail propagation |
| `celestial.js` planets | `js/utils.js` | Import `seededRandom`, `hslToRgb` (existing), vec2 helpers if needed |

## Dependency Graph
Task 1 (needs: js/units.js, js/orbit.js from Phase 1) -> creates: rewritten js/celestial.js with generateSystem + updateBodyPositions
Task 2 (needs: Task 1) -> creates: verified domain — planets orbit on Keplerian rails, round-trip period test passes

## Execution Sequences
| Sequence | Tasks | Parallel |
|----------|-------|----------|
| 1 | Task 1 | No |
| 2 | Task 2 | No |

## Tasks

### Task 1: Rewrite celestial.js with physical bodies and Keplerian motion
**Type:** auto
**Sequence:** 1
**Status:** Complete
Completed: 2026-04-01

<files>
js/celestial.js
</files>

<action>
Completely rewrite `js/celestial.js`. This is a clean break from the old file.

**generateSystem(seed):**
- Import `G`, `AU` from `js/units.js` and `computeSOIRadius` from `js/orbit.js`.
- Use `seededRandom(seed)` for all randomness (preserve determinism).
- Generate one star. Derive `mass` from star type: Red Dwarf ~0.3 solar masses, Yellow Star ~1.0, Blue Giant ~10, White Dwarf ~0.6, Neutron Star ~1.5 (express in game mass units per `js/units.js`). Compute `mu = G * mass`. Set `soiRadius` to a very large value (system boundary, e.g. 100 AU). Keep all existing visual properties (color, glowColor, hue, name, subtype, description, details).
- Generate 3-7 planets. For each planet:
  - Orbital radius spaced in AU-scale (use `AU` constant), e.g. starting ~0.3-0.5 AU with spacing that increases outward (Titius-Bode-like).
  - `mass` derived from planet type: Rocky ~1 Earth mass, Gas Giant ~300 Earth masses, Ice World ~15, Ocean World ~2, Desert ~0.8, Volcanic ~1.1, Lush ~1.5. Scale appropriately to game mass units.
  - `mu = G * mass`.
  - `soiRadius` computed via `computeSOIRadius(planetMass, starMass, orbitalRadius)`.
  - `orbitalElements`: `{ a: orbitalRadius, e: rng() * 0.15, omega: rng() * 2 * Math.PI, nu0: rng() * 2 * Math.PI }`.
  - `parentBody`: reference to the star object.
  - Compute initial x/y position from orbital elements using `stateFromOrbitalElements` (position only, ignore velocity for rail bodies).
  - Keep all existing visual properties. Reuse `PLANET_NAMES`, `PLANET_TYPES`, `STAR_TYPES`, `STAR_NAMES`, `ANOMALY_NAMES` arrays and `generatePlanetDesc`.
  - `radius` remains the visual/physical radius in game units. Keep the existing visual radius generation or derive from mass if sensible, but ensure bodies remain visible at the render scale.
- Anomalies: preserve exactly as before (no physics properties, just position + visual).
- Return `{ star, planets, bodies }` where `bodies` is the flat array of all bodies (star + planets + anomalies) for backward compatibility with renderer.

**updateBodyPositions(system, dt):**
- Replace `updateOrbits`. Accept the system object (not flat array).
- Track elapsed time as a module-level accumulator (or accept cumulative time).
- For each planet in `system.planets`, propagate its true anomaly forward by `dt` using `trueAnomalyAtTime` from `js/orbit.js`, then compute new x/y from `stateFromOrbitalElements`. Update the planet's `x` and `y` in-place.
- Star and anomalies do not move.

Remove the old `updateOrbits` export. Do not reference `orbitAngle`, `orbitSpeed`, or `orbitRadius` anywhere.
</action>

<verify>
1. File exists: `js/celestial.js` with exports `generateSystem` and `updateBodyPositions`
2. No old properties: Run `grep -n "orbitAngle\|orbitSpeed\|orbitRadius" js/celestial.js` returns no matches
3. Structured return: `generateSystem(42)` returns an object with `star`, `planets` (array), and `bodies` (array) properties
4. Physical properties: star has `mass`, `mu`, `soiRadius`; each planet has `mass`, `mu`, `soiRadius`, `parentBody`, `orbitalElements` with keys `a`, `e`, `omega`, `nu0`
5. Determinism: `generateSystem(42)` called twice produces identical output
6. Imports from Phase 1 modules: file imports from `./units.js` and `./orbit.js`
</verify>

<done>
- `generateSystem` returns `{ star, planets, bodies }` with all physical properties on every body
- `updateBodyPositions` propagates planet positions via Keplerian math
- No references to `orbitAngle`, `orbitSpeed`, or `orbitRadius` remain
- All existing visual properties and name arrays preserved
- Anomalies preserved unchanged
</done>

### Task 2: Verify Keplerian orbital motion end-to-end
**Type:** auto
**Sequence:** 2
**Status:** Complete
Completed: 2026-04-01

<files>
js/celestial.js
tests/celestial.test.html
</files>

<action>
Create a minimal browser-based test harness at `tests/celestial.test.html` that imports `js/celestial.js` (and its dependencies) and runs verification checks, logging results to the page. This is a throwaway verification file, not a permanent test suite.

The test harness should:
1. Call `generateSystem(42)` and verify the returned structure has `star`, `planets`, `bodies` properties.
2. Verify star has `mass`, `mu`, `soiRadius` and they are positive numbers.
3. Verify each planet has `mass`, `mu`, `soiRadius`, `parentBody`, `orbitalElements` (with `a`, `e`, `omega`, `nu0`).
4. Verify SOI radii are reasonable: inner rocky planets have smaller SOI than outer gas giants (or at minimum, all SOI values are positive and less than the star's SOI).
5. Verify eccentricities are in range [0, 0.15].
6. Run `updateBodyPositions` for enough steps to complete one orbital period for the innermost planet. Record the planet's initial position, step through the orbit, and verify it returns to approximately the same position (within 1% of orbital radius tolerance).
7. Verify determinism: call `generateSystem(42)` again and compare star/planet properties match exactly.
8. Verify no planet object has `orbitAngle`, `orbitSpeed`, or `orbitRadius` properties.

Log each check as PASS/FAIL to the page body. If any fix is needed in `js/celestial.js` to pass these checks, apply it.
</action>

<verify>
1. File exists: `tests/celestial.test.html`
2. Open the test harness in a browser context (or review the logic): all 8 checks described above are implemented
3. If any checks revealed bugs in `js/celestial.js`, those bugs have been fixed
4. Domain complete: planets orbit on Keplerian rails, return to start position after one period, all physical properties present and reasonable
</verify>

<done>
- All verification checks pass (structure, physical properties, SOI reasonableness, orbital period round-trip, determinism, no old properties)
- Any bugs found during verification have been fixed in `js/celestial.js`
</done>

## Verification Checklist
- [ ] `generateSystem(seed)` returns `{ star, planets, bodies }` with physical properties on all bodies
- [ ] Star has `mass`, `radius`, `mu`, `soiRadius`
- [ ] Each planet has `mass`, `radius`, `mu`, `soiRadius`, `parentBody`, `orbitalElements`
- [ ] `updateBodyPositions(system, dt)` moves planets along Keplerian orbits
- [ ] A planet returns to its starting position after one orbital period (within 1% tolerance)
- [ ] SOI radii are positive and reasonably scaled (inner < outer for similar-mass bodies)
- [ ] System generation is deterministic for a given seed
- [ ] No `orbitAngle`, `orbitSpeed`, or `orbitRadius` properties exist anywhere in `js/celestial.js`
- [ ] Anomalies are preserved (kind, position, visual properties)
- [ ] All visual properties (color, glowColor, hue, name, subtype, description, details) are retained

## Success Criteria
Every celestial body carries mass, radius, mu, and soiRadius. Planets orbit the star on Keplerian rails with positions derived from orbital elements via `trueAnomalyAtTime` and `stateFromOrbitalElements`. System generation is deterministic. No references to the old `orbitAngle`/`orbitSpeed`/`orbitRadius` model remain in `js/celestial.js`. A planet completes a full orbital period and returns to its starting position.
