# Feature Plan: KSP-Scale Rescale -- Phase 1: Scale Constants and System Generation

## Objective
Replace all arcade-scale generation constants with KSP-scale values and rebalance masses so orbital mechanics remain correct. After this phase, `generateSystem()` produces bodies with radii 500-10000 gu and orbital distances 50000-500000 gu, and the ship starts in a valid circular orbit at the new scale.

**Purpose:** This is the foundational data-layer change. Every subsequent phase (camera, time warp, map) depends on bodies being generated at the correct scale. Getting the physics balance right here prevents cascading rework.

**Output:** A new `scaleConfig.ts` module, updated `celestial.ts` generation, and updated constants across FlightScene/Ship/landing so the game boots and runs (visually broken but physically correct).

## Must-Haves (Goal-Backward)

### Observable Truths
- Generated star radii are 5000-10000 gu (not 25-80)
- Generated planet radii are 500-2000 gu (not 12-36)
- Generated moon radii are 50-200 gu (not 3-8)
- Orbital distances between planets span 50000-500000 gu (not 200-1350)
- Ship starts in a valid circular orbit around the star at new scale (no NaN, no crash)
- SOI transitions work: ship can cross from star SOI into a planet SOI without physics glitch
- Landing approach detection triggers at a sensible distance for the new body sizes
- System transition boundary is large enough that the player does not accidentally leave the system

### Required Artifacts
| Path | Provides | Key Exports |
|------|----------|-------------|
| `src/lib/scaleConfig.ts` | All scale constants in one place | `SCALE_CONFIG` object with star/planet/moon radii ranges, mass tables, orbital distance params, thresholds |
| `src/lib/celestial.ts` | Updated generation using scaleConfig | `generateSystem()` producing KSP-scale bodies |
| `src/lib/units.ts` | Updated AU constant and documentation | `AU` reflecting new scale regime |
| `src/scenes/FlightScene.ts` | Updated transition radius, trajectory params, ship starting orbit offset | `SYSTEM_TRANSITION_RADIUS`, trajectory constants |
| `src/lib/landing.ts` | Reviewed thresholds for new scale | `LANDING_THRESHOLDS` (APPROACH_FACTOR may change) |
| `src/objects/Ship.ts` | Updated default starting position | Constructor `y` offset |

### Key Links
| From | To | Via |
|------|-----|-----|
| `scaleConfig.ts` | `celestial.ts` | Import SCALE_CONFIG for all generation params |
| `celestial.ts` star mass | `FlightScene.ts` ship orbit | `sqrt(star.mu / orbitRadius)` must produce valid velocity |
| `celestial.ts` planet mass | `orbit.ts` SOI calc | `computeSOIRadius(planetMass, starMass, orbitalRadius)` must yield flyable SOI |
| `landing.ts` APPROACH_FACTOR | body.radius | `3 * 1000 gu = 3000 gu` approach distance -- verify this is reasonable |

## Dependency Graph
```
Task 1 (needs nothing) -> creates: src/lib/scaleConfig.ts, updated src/lib/units.ts
Task 2 (needs Task 1)  -> modifies: src/lib/celestial.ts, src/scenes/FlightScene.ts, src/objects/Ship.ts, src/lib/landing.ts
```

## Execution Sequences
| Sequence | Tasks | Parallel |
|----------|-------|----------|
| 1 | Task 1 | Solo |
| 2 | Task 2 | Solo |

## Tasks

### Task 1: Create scaleConfig.ts and update units.ts
**Type:** auto
**Sequence:** 1
**Status:** Complete
Completed: 2026-04-02

<files>
src/lib/scaleConfig.ts
src/lib/units.ts
</files>

<action>
Create `src/lib/scaleConfig.ts` as the single source of truth for all scale-dependent constants. Export a `SCALE_CONFIG` object (or grouped named exports) containing:

**Star parameters:**
- Radius range per star type (scale up from current 25-80 to 5000-10000 gu, preserving relative differences between types)
- Mass per star type: rebalance so that at orbital radius ~50000-80000, circular velocity is ~50-200 gu/s. With G=1, v_circ = sqrt(M/r). For v=100 at r=60000, M = v^2 * r = 600,000,000. Star masses should be in the hundreds of millions range.
- Star SOI radius: large enough to encompass all planet orbits (~1,500,000 gu or computed dynamically)

**Planet parameters:**
- Radius range per planet type (scale from 12-36 to 500-2000 gu; gas giants at the upper end, rocky at lower)
- Mass per planet type: rebalance so planet SOI is large enough to fly into and orbit. SOI = r * (m/M)^0.4. Target SOI ~10-30% of orbital radius. Work backward from desired SOI fraction to determine mass ratio needed.
- Moon mass fraction range (keep similar ratios: 0.5%-5% of parent)

**Orbital parameters:**
- Starting orbital radius for innermost planet: 50000-80000 gu
- Titius-Bode multiplier range: keep 1.5-2.0
- Moon orbital radius spacing logic: fit within planet SOI, moon radius + proportional gap

**Threshold parameters:**
- System transition radius: at least 2x the outermost expected orbit (~1,500,000 gu)
- Ship starting orbit offset from star: a reasonable multiple of star radius (e.g., star.radius * 3-5 so the ship isn't visually overlapping the star)
- Anomaly spawn range: match new system extent

Update `src/lib/units.ts`: change `AU` to reflect the new scale regime (e.g., 100000 gu) and update the documentation comment to describe the new scale.
</action>

<verify>
1. File exists: `src/lib/scaleConfig.ts` exports scale constants with star masses in the hundreds-of-millions range
2. Math check: `sqrt(starMass / 60000)` yields a value between 50-200 for a typical star type (e.g., Yellow Star)
3. Math check: For a planet with the configured mass at orbital radius 60000 around that star, `computeSOIRadius` yields a value that is 10-30% of orbital radius
4. File exists: `src/lib/units.ts` has updated AU value and documentation
5. Both files compile: `npx tsc --noEmit` passes (or at least these two files have no type errors)
</verify>

<done>
scaleConfig.ts exists with all scale constants. Star masses produce v_circ 50-200 gu/s at typical orbital distances. Planet masses produce flyable SOI radii. units.ts documents the new scale regime.
</done>

### Task 2: Update generation and consumers to use new scale
**Type:** auto
**Sequence:** 2

<files>
src/lib/celestial.ts
src/scenes/FlightScene.ts
src/objects/Ship.ts
src/lib/landing.ts
</files>

<action>
**celestial.ts:** Replace all inline scale constants with imports from `scaleConfig.ts`. Specifically:
- `STAR_MASSES` dict -> use scaleConfig star masses
- `starSizes` dict -> use scaleConfig star radii
- `PLANET_MASSES` dict -> use scaleConfig planet masses
- Planet radius generation (`12 + rng() * 24`) -> use scaleConfig planet radius range per type
- Starting orbital radius (`200 + rng() * 100`) -> use scaleConfig starting orbital distance
- Moon radius generation (`3 + rng() * 5`) -> use scaleConfig moon radius range
- Moon orbital spacing (`planet.radius + 8`, gap logic) -> scale proportionally to new sizes
- Star SOI (`5000` hardcoded on line 118) -> use scaleConfig or compute dynamically
- Anomaly spawn range (`1500`) -> use scaleConfig anomaly range
- Keep the Titius-Bode multiplier (`1.5 + rng() * 0.5`) or pull from config

**FlightScene.ts:**
- `SYSTEM_TRANSITION_RADIUS` (currently 2000) -> import from scaleConfig (~1,500,000)
- `_initShipCircularOrbit`: change `star.radius + 300` to use scaleConfig ship starting offset (e.g., `star.radius * 3` or a configured value)
- `TRAJECTORY_STEP_SIZE` and `TRAJECTORY_STEP_COUNT`: at new scale, current 600 steps * 1.0 dt = 600 gu of prediction. Need to cover at least 10000+ gu. Increase step size to ~10-20 and/or step count to ~1000. Pull from scaleConfig or compute based on scale.

**Ship.ts:**
- Default constructor position `this.y = -300` -> use a larger default (this gets overridden by `_initShipCircularOrbit` but should be consistent with new scale, e.g., -10000)

**landing.ts:**
- Review `APPROACH_FACTOR = 3`. At new scale, a 1000 gu radius planet triggers approach at 3000 gu altitude. This seems reasonable (3x body radius). If the value is fine, add a comment documenting why it still works at new scale. If it needs adjustment (e.g., 2x would be better so approach doesn't trigger too far out), change it.
- `SAFE_DESCENT_RATE` (10) and `CRASH_DESCENT_RATE` (50) should be reviewed against new surface gravity values. With larger masses and radii, surface gravity = mu/r^2. If surface gravity is much higher, the descent rates may need scaling. Add a comment if no change is needed.
</action>

<verify>
1. The game compiles: `npx tsc --noEmit` passes with no errors
2. Run the game (`npx vite` or `npx vite build`) and open in browser -- it loads without console errors
3. Add temporary `console.log` in `generateSystem` to print: star radius, star mass, first planet radius, first planet orbital distance, first planet SOI radius. Verify:
   - Star radius is 5000-10000 range
   - Planet radius is 500-2000 range
   - Planet orbital distance is 50000+ range
   - Planet SOI radius is >5000 (large enough to fly into)
4. Verify ship starts without NaN: check that `_initShipCircularOrbit` produces finite x, y, vx, vy values at the new orbit radius
5. Verify `SYSTEM_TRANSITION_RADIUS` is 1,000,000+ in FlightScene
6. Domain complete: system generation produces KSP-scale bodies, ship can start in orbit, the physics layer (gravity, SOI math) works with the new values without NaN or infinity
</verify>

<done>
celestial.ts generates KSP-scale systems using scaleConfig constants. FlightScene uses updated transition radius and trajectory params. Ship starts in valid orbit at new scale. Landing thresholds are reviewed and documented. The game compiles and boots.
</done>

## Verification Checklist
- [x] `src/lib/scaleConfig.ts` exists and exports all scale constants
- [ ] Star radii in generated system are 5000-10000 gu
- [ ] Planet radii are 500-2000 gu
- [ ] Moon radii are 50-200 gu
- [ ] Orbital distances span 50000-500000 gu
- [x] v_circ at typical planet orbit is 50-200 gu/s (check: `sqrt(starMass / orbitalRadius)`)
- [x] Planet SOI radii are large enough to fly into (>5000 gu)
- [ ] Ship starts in valid circular orbit (no NaN)
- [x] System transition radius is 1,000,000+ gu
- [x] `npx tsc --noEmit` passes
- [ ] Game loads in browser without console errors

## Success Criteria
The generation layer produces a star system at KSP-like scale where star radii are 5000-10000 gu, planet radii are 500-2000 gu, orbital distances are 50000-500000 gu, and orbital mechanics are balanced (circular velocities 50-200 gu/s). The game compiles, boots, and the ship starts in a valid orbit. The visual experience will be broken (camera/zoom not adapted) but the data layer is correct.
