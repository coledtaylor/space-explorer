# Feature Plan: Foundation -- Types, Constants, Physics Math, and Test Framework

## Objective
Establish the pure-function math foundation and test harness for the solar system. After this phase, gravity and orbital position calculations are implemented, configured for a KSP-inspired solar system, and proven correct by an automated test suite. No Phaser rendering -- just math and tests.

**Purpose:** Every subsequent phase (rendering, camera, ship physics) depends on correct orbital math and type definitions. Proving the math works in isolation before touching rendering eliminates the hardest class of bugs.
**Output:** Type definitions, physics/orbit pure functions, solar system config, Vitest test suite -- all passing.

## Must-Haves (Goal-Backward)

### Observable Truths
1. `npx vitest run` executes and all tests pass
2. `calculateGravity(mass, distance)` returns correct GM/r^2 acceleration with direction
3. `getOrbitalPosition(radius, period, time)` returns correct (x, y) at cardinal points (t=0, T/4, T/2, T)
4. `getWorldPosition(bodyId, solarSystem, time)` chains parent offsets correctly for moons
5. Solar system config defines a star, 2-3 planets, and 1-2 moons with named constants (no magic numbers)
6. All celestial body data is typed: mass, radius, orbital parameters, color, parent reference

### Required Artifacts
| Path | Provides | Key Exports |
|------|----------|-------------|
| `src/types/index.ts` | Shared type definitions | `Vec2`, `CelestialBodyConfig`, `SolarSystemConfig` |
| `src/lib/physics.ts` | Gravity math | `calculateGravity`, `sumGravitationalForces` |
| `src/lib/orbit.ts` | Orbital position math | `getOrbitalPosition`, `getWorldPosition` |
| `src/lib/solarSystem.ts` | Solar system layout constants | `SOLAR_SYSTEM` (typed config object) |
| `vitest.config.ts` | Test runner config | (config) |
| `src/lib/__tests__/physics.test.ts` | Gravity tests | (test suite) |
| `src/lib/__tests__/orbit.test.ts` | Orbital position tests | (test suite) |

### Key Links
| From | To | Via |
|------|-----|-----|
| `physics.ts` | `types/index.ts` | imports `Vec2`, `CelestialBodyConfig` |
| `orbit.ts` | `types/index.ts` | imports `Vec2`, `CelestialBodyConfig`, `SolarSystemConfig` |
| `orbit.ts` | `solarSystem.ts` | `getWorldPosition` traverses parent chain using config |
| `solarSystem.ts` | `types/index.ts` | config satisfies `SolarSystemConfig` type |
| `physics.test.ts` | `physics.ts` | imports and tests pure functions |
| `orbit.test.ts` | `orbit.ts`, `solarSystem.ts` | imports functions and config for integration-level tests |

## Dependency Graph
```
Task 1 (needs nothing) -> creates: vitest.config.ts, src/types/index.ts, src/lib/physics.ts, src/lib/orbit.ts, src/lib/solarSystem.ts
Task 2 (needs Task 1)  -> creates: src/lib/__tests__/physics.test.ts, src/lib/__tests__/orbit.test.ts
```

## Execution Sequences
| Sequence | Tasks | Parallel |
|----------|-------|----------|
| 1 | Task 1 | Solo |
| 2 | Task 2 | Solo |

## Tasks

### Task 1: Types, Pure Functions, Solar System Config, and Vitest Setup
**Type:** auto
**Sequence:** 1
**Status:** complete
Completed: 2026-04-02

<files>
vitest.config.ts
src/types/index.ts
src/lib/physics.ts
src/lib/orbit.ts
src/lib/solarSystem.ts
</files>

<action>
1. Install vitest as a devDependency and create `vitest.config.ts` with TypeScript support (vitest handles TS natively with Vite).

2. Define types in `src/types/index.ts`:
   - `Vec2` (x, y)
   - `CelestialBodyConfig` -- mass, radius, orbitalRadius, orbitalPeriod, color, parentId (optional, references another body), name
   - `SolarSystemConfig` -- a record/map of body ID to CelestialBodyConfig, plus any top-level metadata

3. Implement `src/lib/physics.ts` with pure functions:
   - `calculateGravity(bodyMass, positionA, positionB)` -- returns acceleration vector (GM/r^2 directed from A toward B). Include zero-distance protection.
   - `sumGravitationalForces(bodies, shipPosition)` -- sums gravity from multiple bodies into a single acceleration vector.
   - Use a named constant for the gravitational constant G (KSP-scale, not real-world).

4. Implement `src/lib/orbit.ts` with pure functions:
   - `getOrbitalPosition(orbitalRadius, orbitalPeriod, time)` -- returns Vec2 position on a circular orbit at time t. For zero radius, return (0,0).
   - `getWorldPosition(bodyId, config, time)` -- recursively walks the parent chain to compute absolute world-space position. A body with no parent is at the origin.

5. Create `src/lib/solarSystem.ts` defining the solar system config:
   - A central star (e.g., "Kerbol") at origin
   - 2-3 planets with KSP-inspired scale (orbital radii in thousands of km, periods in seconds for gameplay feel)
   - 1-2 moons orbiting one of the planets
   - All values as named constants, no magic numbers
   - Export the config typed as SolarSystemConfig

Follow CLAUDE.md quality standards: descriptive names, single responsibility per function, comments explain "why" not "what", no magic numbers.
</action>

<verify>
1. File exists and compiles: `npx tsc --noEmit` passes with no errors
2. Vitest installed: `npx vitest --version` returns a version number
3. Type exports: `src/types/index.ts` exports Vec2, CelestialBodyConfig, SolarSystemConfig
4. Physics exports: `src/lib/physics.ts` exports calculateGravity, sumGravitationalForces
5. Orbit exports: `src/lib/orbit.ts` exports getOrbitalPosition, getWorldPosition
6. Solar system config: `src/lib/solarSystem.ts` exports a config with at least 4 bodies (1 star + 2 planets + 1 moon minimum)
7. No magic numbers: all numeric values in solarSystem.ts are named constants or clearly derived from named constants
</verify>

<done>
All five files exist, TypeScript compiles cleanly, vitest is installed, and the solar system config defines a star, planets, and moons with named constants at KSP-inspired scale.
</done>

### Task 2: Test Suite for Physics and Orbit Math
**Type:** auto
**Sequence:** 2
**Status:** complete
Completed: 2026-04-02

<files>
src/lib/__tests__/physics.test.ts
src/lib/__tests__/orbit.test.ts
</files>

<action>
1. Create `src/lib/__tests__/physics.test.ts`:
   - Test `calculateGravity` returns correct magnitude for a known mass/distance pair (hand-calculate expected value using the G constant from physics.ts)
   - Test `calculateGravity` returns correct direction (acceleration points from position A toward position B)
   - Test zero-distance protection does not produce Infinity or NaN
   - Test `sumGravitationalForces` correctly sums contributions from multiple bodies
   - Test very large distances produce negligible but non-zero acceleration

2. Create `src/lib/__tests__/orbit.test.ts`:
   - Test `getOrbitalPosition` at t=0 returns (radius, 0) or equivalent starting position
   - Test at t=period/4 returns (0, radius) -- quarter orbit
   - Test at t=period/2 returns (-radius, 0) -- half orbit
   - Test at t=period returns back to start -- full cycle (within floating point tolerance)
   - Test zero orbital radius returns (0, 0)
   - Test `getWorldPosition` for the star returns (0, 0) or the origin
   - Test `getWorldPosition` for a planet returns its orbital position relative to parent
   - Test `getWorldPosition` for a moon correctly chains the planet offset plus its own orbital position
   - Use the actual SOLAR_SYSTEM config from solarSystem.ts for the parent-chain tests

Use descriptive test names. Use a reasonable floating-point tolerance (e.g., 1e-6 relative or appropriate absolute epsilon for the scale).
</action>

<verify>
1. `npx vitest run` passes with 0 failures
2. Test count: at least 10 test cases across both files
3. Domain complete: gravity math is proven correct for known inputs, orbital positions hit cardinal points accurately, moon world-position chains parent offsets correctly
</verify>

<done>
`npx vitest run` executes all tests and reports 0 failures. Gravity returns correct magnitude and direction, orbital position hits all four cardinal points, and moon world-position correctly chains parent offsets.
</done>

## Verification Checklist
- [ ] `npx tsc --noEmit` passes cleanly
- [ ] `npx vitest run` passes with all tests green
- [ ] `calculateGravity` returns correct GM/r^2 with direction for known inputs
- [ ] `getOrbitalPosition` returns correct (x, y) at t=0, T/4, T/2, T
- [ ] `getWorldPosition` chains parent offsets for moons
- [ ] Solar system config has star + 2-3 planets + 1-2 moons, all named constants
- [ ] No magic numbers in any source file
- [ ] No file exceeds 200 lines

## Success Criteria
`npx vitest run` executes a passing test suite with at least 10 test cases covering gravity calculation, orbital position at cardinal points, zero-radius edge cases, and recursive world-position resolution through the parent chain. All source files compile cleanly and follow the project's quality standards.
