# Feature Plan: Port Orbital Physics to TypeScript

## Objective
Port all pure math and physics modules from vanilla JavaScript to TypeScript with strict mode. These modules are framework-agnostic and form the foundation for all Phaser scenes.

**Purpose:** Establish type-safe, testable physics foundation before scene implementation. TypeScript strict mode catches errors at build time rather than runtime.

**Output:**
- `src/types/index.ts` (type definitions)
- `src/lib/utils.ts`, `units.ts`, `orbit.ts`, `trajectory.ts`, `physics.ts`, `celestial.ts`

## Must-Haves (Goal-Backward)

### Observable Truths
- `generateSystem(seed)` returns a typed `CelestialBody[]` array with star, planets, and moons
- `computeOrbitalElements()` returns typed `OrbitalElements` with `a`, `e`, `omega`, `nu`, `T`, `epsilon`
- `propagateTrajectory()` returns typed `TrajectorySegment[]` with points, markers, and SOI body references
- `seededRandom(seed)` produces deterministic sequences (same seed = same output)
- All modules compile under TypeScript strict mode with no `any` types
- Importing any physics module into a Phaser scene causes no type or runtime errors

### Required Artifacts
| Path | Provides | Key Exports |
|------|----------|-------------|
| `src/types/index.ts` | Core type definitions | `Vec2`, `CelestialBody`, `OrbitalElements`, `TrajectoryPoint`, `TrajectorySegment`, `StarSystem`, `ShipState` |
| `src/lib/utils.ts` | Math utilities | `lerp`, `dist`, `clamp`, `seededRandom`, `hslToRgb`, `vec2Add`, `vec2Sub`, `vec2Scale`, `vec2Mag`, `vec2Normalize`, `vec2Dot`, `mod2pi` |
| `src/lib/units.ts` | Physical constants | `G`, `AU`, `SCALE` |
| `src/lib/orbit.ts` | Keplerian mechanics | `computeOrbitalElements`, `stateFromOrbitalElements`, `computeApoapsisRadius`, `computePeriapsisRadius`, `trueAnomalyAtTime`, `computeSOIRadius`, `gravityAcceleration` |
| `src/lib/physics.ts` | SOI transitions | `planetOrbitalVelocity`, `moonOrbitalVelocity`, `shipWorldPosition`, `checkSOITransition` |
| `src/lib/trajectory.ts` | Trajectory propagation | `propagateTrajectory` |
| `src/lib/celestial.ts` | System generation | `generateSystem`, `updateBodyPositions` |

### Key Links
| From | To | Via |
|------|-----|-----|
| `celestial.ts` | `orbit.ts` | `computeSOIRadius`, `stateFromOrbitalElements`, `trueAnomalyAtTime` |
| `celestial.ts` | `utils.ts` | `seededRandom`, `hslToRgb` |
| `celestial.ts` | `units.ts` | `G` constant |
| `physics.ts` | `orbit.ts` | `computeOrbitalElements`, `stateFromOrbitalElements` |
| `trajectory.ts` | `orbit.ts` | `gravityAcceleration`, `stateFromOrbitalElements`, `trueAnomalyAtTime` |
| `trajectory.ts` | `physics.ts` | `planetOrbitalVelocity`, `moonOrbitalVelocity` |
| All modules | `types/index.ts` | Type imports |

## Dependency Graph

```
Task 1: Types + Utils + Units (no dependencies)
  creates: src/types/index.ts, src/lib/utils.ts, src/lib/units.ts

Task 2: Orbital Math (depends on Task 1)
  needs: types, utils, units
  creates: src/lib/orbit.ts, src/lib/physics.ts

Task 3: Generation + Trajectory (depends on Task 2)
  needs: orbit, physics, utils, units, types
  creates: src/lib/celestial.ts, src/lib/trajectory.ts
```

## Execution Sequences
| Sequence | Tasks | Parallel |
|----------|-------|----------|
| 1 | Task 1 | N/A (single task) |
| 2 | Task 2 | N/A (single task) |
| 3 | Task 3 | N/A (single task) |

## Tasks

### Task 1: Create Type Definitions and Port Foundation Modules
**Type:** auto
**Sequence:** 1
**Status:** complete
**Completed:** 2026-04-02

<files>
src/types/index.ts
src/lib/utils.ts
src/lib/units.ts
</files>

<action>
Create the type definitions file with all core types needed by physics modules:
- `Vec2` interface for `{x, y}` vectors
- `CelestialBody` discriminated union with `kind: 'star' | 'planet' | 'moon' | 'anomaly'`
- `OrbitalElements` interface: `a`, `e`, `omega`, `nu`, `T`, `epsilon`
- `TrajectoryPoint` and `TrajectorySegment` interfaces
- `ShipState` interface for ship position, velocity, and SOI body
- `StarSystem` interface: `star`, `planets`, `bodies`, `moons`

Port `js/utils.js` to `src/lib/utils.ts`:
- Add explicit types to all functions
- `Vec2` type for vector operations
- `seededRandom` returns `() => number` closure

Port `js/units.js` to `src/lib/units.ts`:
- Export typed constants `G`, `AU`, `SCALE`
</action>

<verify>
1. Files exist: `src/types/index.ts`, `src/lib/utils.ts`, `src/lib/units.ts`
2. Compile check: `npx tsc --noEmit` passes with no errors
3. Type completeness: All exported types are explicitly typed (no `any`)
4. Determinism test: Create a temp file that imports `seededRandom`, calls `seededRandom(42)()` twice, logs results, runs via `npx tsx --eval` - verify same seed produces same sequence
</verify>

<done>
- `Vec2`, `CelestialBody`, `OrbitalElements`, `TrajectorySegment`, `ShipState`, `StarSystem` types exported
- All utility functions typed with no `any`
- `seededRandom(42)` produces deterministic output
- TypeScript compiles without errors
</done>

---

### Task 2: Port Orbital Mechanics Modules
**Type:** auto
**Sequence:** 2
**Status:** complete
**Completed:** 2026-04-02

<files>
src/lib/orbit.ts
src/lib/physics.ts
</files>

<action>
Port `js/orbit.js` to `src/lib/orbit.ts`:
- Import `Vec2` and `OrbitalElements` from types
- Type all function parameters and return values
- `computeOrbitalElements(pos: Vec2, vel: Vec2, mu: number): OrbitalElements`
- `stateFromOrbitalElements(...): { pos: Vec2, vel: Vec2 }`
- `gravityAcceleration(shipPos: Vec2, bodyPos: Vec2, mu: number): Vec2`

Port `js/physics.js` to `src/lib/physics.ts`:
- Import types from `../types`
- `planetOrbitalVelocity(planet: CelestialBody, system: StarSystem): Vec2`
- `checkSOITransition(ship: ShipState, system: StarSystem): SOITransitionResult | null`
- Add `SOITransitionResult` type to types/index.ts if needed
</action>

<verify>
1. Files exist: `src/lib/orbit.ts`, `src/lib/physics.ts`
2. Compile check: `npx tsc --noEmit` passes
3. Import check: Both modules can be imported without errors
4. Type coverage: No `any` types in function signatures
</verify>

<done>
- `computeOrbitalElements`, `stateFromOrbitalElements`, `gravityAcceleration` exported and typed
- `checkSOITransition` returns properly typed result
- All Keplerian math functions preserve exact behavior from JS source
- TypeScript compiles without errors
</done>

---

### Task 3: Port System Generation and Trajectory Propagation
**Type:** auto
**Sequence:** 3
**Status:** complete
**Completed:** 2026-04-02

<files>
src/lib/celestial.ts
src/lib/trajectory.ts
</files>

<action>
Port `js/celestial.js` to `src/lib/celestial.ts`:
- `generateSystem(seed: number): StarSystem`
- `updateBodyPositions(system: StarSystem, dt: number): void`
- Type all internal arrays (PLANET_NAMES, STAR_TYPES, etc.) as `readonly string[]`
- Module-level `elapsedTime` typed as `number`

Port `js/trajectory.js` to `src/lib/trajectory.ts`:
- `propagateTrajectory(shipState: ShipState, system: StarSystem, options?: TrajectoryOptions): TrajectorySegment[]`
- Add `TrajectoryOptions` type: `{ maxTime?: number, stepSize?: number, maxSegments?: number, simBaseTime?: number }`
- Type `SOI_COLORS` as `readonly string[]`
</action>

<verify>
1. Files exist: `src/lib/celestial.ts`, `src/lib/trajectory.ts`
2. Compile check: `npx tsc --noEmit` passes with all 6 lib modules
3. Generation test: Run `npx tsx -e "import { generateSystem } from './src/lib/celestial'; const sys = generateSystem(42); console.log(sys.star.name, sys.planets.length)"` - verify output matches expected (deterministic)
4. Integration: Import all lib modules in a single test file, verify no circular dependency errors
5. Domain complete: `generateSystem(seed)` returns typed `StarSystem` with `star`, `planets[]`, `moons[]`, `bodies[]`
</verify>

<done>
- `generateSystem(42)` returns deterministic star system with typed bodies
- `propagateTrajectory` returns typed trajectory segments
- All 6 physics modules compile under strict TypeScript
- No circular dependencies between modules
- Ready for scene integration in Phase 3
</done>

## Verification Checklist
- [ ] `npx tsc --noEmit` passes for all src/lib/*.ts files
- [ ] No `any` types in any exported function signatures
- [ ] `generateSystem(seed)` returns correctly typed `StarSystem`
- [ ] `seededRandom(seed)` produces deterministic sequences
- [ ] `computeOrbitalElements` returns typed `OrbitalElements`
- [ ] `propagateTrajectory` returns typed `TrajectorySegment[]`
- [ ] All modules importable without circular dependency errors

## Success Criteria
All physics modules compile with TypeScript strict mode. Type definitions exist for `CelestialBody`, `OrbitalElements`, `TrajectoryPoint`, `TrajectorySegment`, and `StarSystem`. `generateSystem(seed)` returns a typed `CelestialBody[]` array. Importing any physics module into a Phaser scene causes no errors.
