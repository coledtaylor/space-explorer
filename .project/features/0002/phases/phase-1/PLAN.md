# Feature Plan: Hierarchical Generation -- Moons and Body Properties

## Objective
Overhaul `js/celestial.js` to generate three-level star systems (Star > Planet > Moon) with physically consistent properties and per-frame moon position propagation.

**Purpose:** The current system generator produces only star + planets. This phase adds moons as real child bodies with orbital mechanics, enabling multi-level SOI transitions in Phase 2.

**Output:** A deterministic `generateSystem(seed)` that returns a system object containing moons nested under planets, with all bodies (star, planets, moons) carrying mass, mu, soiRadius, and orbitalElements. `updateBodyPositions()` propagates moon positions relative to their parent planet each frame.

## Must-Haves (Goal-Backward)

### Observable Truths
- Same seed always produces identical body counts, positions, and properties (determinism preserved)
- Rocky planets have 0-1 moons, Ice/Ocean/Desert have 0-2, Lush have 0-3, Gas Giants have 2-8
- Every body (star, planet, moon) carries mass, mu, soiRadius derived from computeSOIRadius
- Moon positions animate in orbit around their parent planet, not around the star
- No moon orbit overlaps another moon orbit or extends beyond its parent planet's SOI radius

### Required Artifacts
| Path | Provides | Key Exports |
|------|----------|-------------|
| `js/celestial.js` | Moon generation, moon name table, moon mass/radius tables, subtype-based moon counts, moon position propagation | `generateSystem(seed)` (modified return shape), `updateBodyPositions(system, dt)` (updated to propagate moons) |

### Key Links
| From | To | Via |
|------|-----|-----|
| `generateSystem()` | `computeSOIRadius()` | Import from `js/orbit.js` -- must be called for every moon |
| `generateSystem()` | `stateFromOrbitalElements()` | Import from `js/orbit.js` -- initial moon positions |
| `updateBodyPositions()` | `trueAnomalyAtTime()` | Import from `js/orbit.js` -- moon orbit propagation |
| `main.js` | `generateSystem()` | Existing import -- return shape changes (system gains moons) |
| `main.js` | `system.bodies` | Existing usage -- must include moons so rendering/physics see them |
| `physics.js` | `system.planets[].moons` | Phase 2 will need to iterate moons; this phase establishes the data shape |

## Dependency Graph
```
Task 1 (needs nothing) --> creates: updated js/celestial.js with moon generation + propagation
Task 2 (needs Task 1)  --> creates: verified system via Node.js script, confirms all success criteria
```

## Execution Sequences
| Sequence | Tasks | Parallel |
|----------|-------|----------|
| 1 | Task 1 | No |
| 2 | Task 2 | No |

## Tasks

### Task 1: Add moon generation and position propagation to celestial.js
**Type:** auto
**Sequence:** 1
**Status:** Complete
Completed: 2026-04-01

<files>
js/celestial.js
</files>

<action>
Modify `generateSystem()` in `js/celestial.js` to spawn moons for each planet based on its subtype. Modify `updateBodyPositions()` to propagate moon positions relative to their parent planet each frame.

**Moon generation requirements:**
- Add a `MOON_NAMES` array (e.g., suffixed from parent: "Aethon I", "Aethon II", or a separate name pool -- executor's choice as long as names are deterministic from seed).
- Add a `MOON_COUNTS` table mapping planet subtypes to `[min, max]` ranges: Rocky [0,1], Ice World [0,2], Ocean World [0,2], Desert [0,2], Lush [0,3], Gas Giant [2,8].
- Add a `MOON_MASSES` table or derive moon mass from parent mass (moons should be 0.5%-5% of parent mass, chosen via rng per moon).
- For each planet, use `rng()` to pick a moon count within the subtype range. For each moon:
  - Pick mass from range, compute `mu = G * mass`.
  - Choose orbital radius starting just outside the planet's visual radius (planet.radius + moonRadius + gap), spaced so orbits do not overlap. Clamp maximum orbital radius so no moon orbit extends beyond `planet.soiRadius * 0.8` (safety margin).
  - If a valid non-overlapping orbit cannot fit, skip remaining moons for that planet.
  - Choose eccentricity (small, 0 to 0.05), omega, and nu0 via rng.
  - Compute `soiRadius` via `computeSOIRadius(moonMass, planetMass, moonOrbitalRadius)`.
  - Compute initial position via `stateFromOrbitalElements` relative to the parent planet.
  - Set `x = planet.x + pos.x`, `y = planet.y + pos.y` for initial world position.
  - Moon body shape: `{ kind: 'moon', name, subtype: 'Moon', x, y, radius (3-8 game units), color, hue, mass, mu, soiRadius, orbitalElements: { a, e, omega, nu0 }, parentBody: planet, description, details }`.
- Store moons in `planet.moons = [...]` array on each planet.
- Add all moons to `system.bodies` (flatten: `[star, ...planets, ...allMoons]`).
- Return shape becomes `{ star, planets, bodies, moons }` where `moons` is the flat array of all moons. Keep backward compatibility: `system.star`, `system.planets`, `system.bodies` all still work. `system.bodies` now includes moons.

**Moon position propagation in `updateBodyPositions()`:**
- After updating each planet's position, iterate `planet.moons` (if any).
- For each moon, propagate its true anomaly using `trueAnomalyAtTime(elapsedTime, ...)` with the moon's orbital elements and `planet.mu`.
- Compute moon's local position via `stateFromOrbitalElements` relative to planet.
- Set `moon.x = planet.x + localPos.x`, `moon.y = planet.y + localPos.y`.

**Constraints:**
- All rng calls must happen in deterministic order (same seed = same output). Do not use `Math.random()`.
- Follow existing code conventions: 2-space indent, single quotes, semicolons, named exports, no console.log, no try/catch.
- Import `G` from `'./units.js'` and `computeSOIRadius`, `trueAnomalyAtTime`, `stateFromOrbitalElements` from `'./orbit.js'` (already imported).
</action>

<verify>
1. File exists: `js/celestial.js` contains `MOON_COUNTS`, `MOON_MASSES` (or equivalent), and moon generation logic inside `generateSystem()`.
2. Grep for `kind: 'moon'` in `js/celestial.js` confirms moon body objects are created.
3. Grep for `planet.moons` in `updateBodyPositions()` confirms moon position propagation exists.
4. The file has no syntax errors: run `node --check js/celestial.js` (will fail on imports but should show no syntax errors beyond ES module import issues). Alternatively, wrap a quick check: `node -e "import('file:///absolute/path/to/celestial.js').catch(e => { if (e.code !== 'ERR_MODULE_NOT_FOUND') { console.error(e); process.exit(1); } })"`.
</verify>

<done>
- `generateSystem()` returns a system with `star`, `planets` (each having a `moons` array), `bodies` (includes all moons), and `moons` (flat array).
- Moon counts respect subtype ranges: Rocky 0-1, Ice/Ocean/Desert 0-2, Lush 0-3, Gas Giant 2-8.
- Every moon has `kind: 'moon'`, `mass`, `mu`, `soiRadius`, `orbitalElements`, `parentBody` pointing to its planet.
- `updateBodyPositions()` propagates moon positions relative to their parent planet.
- No moon orbit overlaps another or extends beyond 80% of parent SOI radius.
</done>

### Task 2: Verify determinism, moon counts, physics consistency, and non-overlapping orbits
**Type:** auto
**Sequence:** 2

<files>
(no files created -- verification only)
</files>

<action>
Write and run a temporary Node.js verification script (e.g., `/tmp/verify-moons.mjs`) that imports `generateSystem` and `updateBodyPositions` from `js/celestial.js` and validates all success criteria programmatically. The script must:

1. **Determinism:** Call `generateSystem(42)` twice. Assert that both calls produce identical body counts, identical moon counts per planet, identical positions (x, y), identical masses, and identical soiRadius values for every body.

2. **Moon count ranges:** Generate systems with seeds 1-20. For each system, verify every planet's moon count falls within the allowed range for its subtype (Rocky 0-1, Ice World 0-2, Ocean World 0-2, Desert 0-2, Lush 0-3, Gas Giant 2-8). Also verify that across all 20 seeds, at least one Gas Giant has 2+ moons (statistical near-certainty).

3. **Physics consistency:** For every body in every generated system (seeds 1-20), verify:
   - `mass > 0`
   - `mu === G * mass` (where G is imported from units.js)
   - For planets: `soiRadius === computeSOIRadius(planet.mass, star.mass, planet.orbitalElements.a)` (within floating point tolerance)
   - For moons: `soiRadius === computeSOIRadius(moon.mass, planet.mass, moon.orbitalElements.a)` (within floating point tolerance)
   - `moon.parentBody === planet` (reference equality)

4. **Non-overlapping orbits:** For every planet with 2+ moons, verify:
   - No two moon orbits overlap: for moons sorted by `orbitalElements.a`, the apoapsis of moon[i] (a*(1+e)) is less than the periapsis of moon[i+1] (a*(1-e)).
   - Every moon's apoapsis `a*(1+e)` is less than `planet.soiRadius`.

5. **Moon propagation:** Call `updateBodyPositions(system, 1.0)` then `updateBodyPositions(system, 1.0)` (2 seconds total). Verify that moon positions have changed from their initial values and that each moon's distance from its parent planet is approximately equal to `a` (within eccentricity bounds).

6. **Backward compatibility:** Verify `system.star`, `system.planets`, and `system.bodies` all exist. Verify `system.bodies.length === 1 + system.planets.length + system.moons.length`. Verify `system.bodies` includes all moons.

Print clear pass/fail for each check. Exit with code 0 if all pass, code 1 if any fail. Delete the temp script after running.

Note: since the codebase uses ES modules, the script must use `.mjs` extension and ESM syntax. The imports reference relative paths from the script location -- adjust accordingly.
</action>

<verify>
1. The verification script runs and exits with code 0 (all checks pass).
2. Console output shows pass for: determinism, moon count ranges, physics consistency, non-overlapping orbits, moon propagation, backward compatibility.
3. The temp script is cleaned up after running.
</verify>

<done>
All six verification categories pass across 20 seeds. The hierarchical generation system is proven correct and deterministic.
</done>

## Verification Checklist
- [ ] Same seed produces identical output (determinism)
- [ ] Moon counts respect subtype ranges (Rocky 0-1, Ice/Ocean/Desert 0-2, Lush 0-3, Gas Giant 2-8)
- [ ] Every body has physically consistent mass, mu, soiRadius
- [ ] Moon soiRadius computed via computeSOIRadius(moonMass, planetMass, moonOrbitalRadius)
- [ ] Moon positions update relative to parent planet in updateBodyPositions()
- [ ] No moon orbits overlap each other
- [ ] No moon orbit extends beyond parent planet's SOI radius
- [ ] system.bodies includes all moons (backward compatible)
- [ ] system.planets[].moons arrays are populated

## Success Criteria
The phase is complete when `generateSystem(seed)` produces hierarchical Star > Planet > Moon systems where every body has correct physical properties, moon positions propagate relative to their parent planet each frame, moon orbits are non-overlapping and contained within parent SOI, and the entire system is fully deterministic from seed. All criteria verified programmatically across 20 seeds.
