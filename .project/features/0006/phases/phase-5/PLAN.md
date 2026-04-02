# Feature Plan: KSP-Scale Rescale - Phase 5: Polish and Tuning

## Objective
Fine-tune gameplay constants, optimize rendering performance, and verify all scene transitions work correctly at KSP scale. This phase assumes phases 1-4 have delivered the rescaled system generation, adaptive camera, flight time warp, and map view adaptation.

**Purpose:** Make the rescaled game feel fun and playable -- planets imposing, distances vast but navigable, landing/launch cycles smooth, performance solid.
**Output:** Tuned constants across ship, landing, camera, and rendering; optimized gradient rendering; verified end-to-end mission loop.

## Must-Haves (Goal-Backward)

### Goal
A complete mission loop (orbit -> transfer -> orbit -> land -> launch -> transfer) works without physics glitches, performance drops, or broken transitions.

### Observable Truths
1. Ship thrust produces meaningful delta-v for orbit changes without making fuel trivial (a few transfers + landings per tank)
2. Landing descent rates feel controllable -- player can arrest descent before crash threshold
3. Camera zoom curve feels natural at all altitudes (low orbit = planet fills screen, high altitude = orbit context visible)
4. Large planets rendering at >500px screen radius do not drop below 30 fps
5. Scene transitions (Flight->Landing->Surface->Flight, Flight->Map->Flight) preserve ship state correctly
6. SurfaceScene launch places ship in valid low orbit at new body radii

### Required Artifacts
| Path | Provides | Key Changes |
|------|----------|-------------|
| `src/objects/Ship.ts` | Ship physics constants | Tuned THRUST_POWER, FUEL_CONSUMPTION_RATE, INITIAL_FUEL |
| `src/lib/landing.ts` | Landing thresholds | Tuned SAFE_DESCENT_RATE, CRASH_DESCENT_RATE for new gravity values |
| `src/scenes/FlightScene.ts` | Camera zoom curve | Refined altitude-to-zoom mapping, trajectory step tuning |
| `src/scenes/LandingScene.ts` | Landing sequence | Verified altitude/terrain rendering at new body radii, tuned LANDING_THRUST/LANDING_GRAVITY |
| `src/scenes/SurfaceScene.ts` | Launch state | Updated LOW_ORBIT_ALTITUDE for new scale |
| `src/objects/CelestialBody.ts` | Body rendering | Dynamic gradient step count based on screen-space radius |

### Key Links
| From | To | Via | Risk |
|------|-----|-----|------|
| `Ship.ts` THRUST_POWER | delta-v budget | `v = thrust * burn_time` | Too weak = can't transfer; too strong = fuel trivial |
| `landing.ts` thresholds | landing survivability | `surfaceGravity = mu/r^2` | New body masses change gravity; old thresholds may be too tight or loose |
| `SurfaceScene.ts` LOW_ORBIT_ALTITUDE | post-launch orbit | `orbitRadius = body.radius + altitude` | At old value (50), orbit is inside atmosphere for 500+ radius bodies |
| `CelestialBody.ts` gradient steps | frame rate | `drawRadialGradient()` step count | Fixed 6-12 steps at 500+ px radius = fine; but if steps scale with radius, perf tanks |

## Dependency Graph
```
Task 1 (needs: phases 1-4 complete) -> creates: tuned constants in Ship.ts, landing.ts, SurfaceScene.ts, LandingScene.ts
Task 2 (needs: Task 1) -> creates: optimized CelestialBody.ts rendering, tuned FlightScene.ts camera/trajectory, verified mission loop
```

## Execution Sequences
| Sequence | Tasks | Parallel |
|----------|-------|----------|
| 1 | Task 1: Gameplay Constants Tuning | No |
| 2 | Task 2: Rendering Optimization and Mission Loop Verification | No |

## Tasks

### Task 1: Tune Gameplay Constants for KSP Scale
**Type:** auto
**Status:** Complete
Completed: 2026-04-02
**Sequence:** 1

<files>
src/objects/Ship.ts
src/lib/landing.ts
src/scenes/LandingScene.ts
src/scenes/SurfaceScene.ts
</files>

<action>
Rebalance ship and landing constants for the new KSP scale. The key constraint: with planet radii 500-2000 gu and orbital distances 50,000-500,000 gu, the ship needs enough delta-v for several orbit changes and at least one planetary transfer per fuel load.

**Ship.ts tuning targets:**
- Calculate required delta-v for a Hohmann transfer between typical adjacent planets (e.g., 80,000 gu to 160,000 gu orbit). With G=1 and star mass from phase 1, compute v_circ at each orbit, then the transfer delta-v. Set THRUST_POWER and INITIAL_FUEL so the ship can perform ~3-4 significant burns before running dry. FUEL_CONSUMPTION_RATE should make burns last 10-30 seconds of real time, not instant.
- Export INITIAL_FUEL as a named constant so `FlightScene._updateHud` can reference it instead of the hardcoded `1000` on line 725.

**landing.ts tuning targets:**
- Compute surface gravity for typical bodies at new scale: `g = mu / radius^2`. If a rocky planet has radius 800 and mu scaled accordingly, the safe descent rate (currently 10 gu/s) and crash rate (currently 50 gu/s) may need adjustment. The player should have a few seconds of margin to arrest descent with LANDING_THRUST.
- APPROACH_FACTOR (currently 3): at radius 800, approach triggers at 2400 gu altitude. Verify this gives enough time to decelerate from orbital speed. Adjust if needed.

**LandingScene.ts tuning targets:**
- LANDING_THRUST (currently 25) and LANDING_GRAVITY (currently 9.8): LANDING_GRAVITY is a fallback only -- real gravity comes from mu. Verify LANDING_THRUST can overcome surface gravity at the new scale. If surface gravity is much higher than 9.8, LANDING_THRUST needs to increase proportionally.
- ZOOM_MIN/ZOOM_MAX: at new body radii, the landing view altitude range is much larger. Verify the zoom range still produces a good visual experience.

**SurfaceScene.ts tuning targets:**
- LOW_ORBIT_ALTITUDE (currently 50): for a body with radius 800, a 50 gu orbit is barely above the surface (6% of radius). Increase to something proportional -- perhaps 10-20% of body radius, or compute dynamically from body.radius. Update `_transitionToFlight()` accordingly.
</action>

<verify>
1. Files modified: `src/objects/Ship.ts` has updated THRUST_POWER, FUEL_CONSUMPTION_RATE, INITIAL_FUEL with named exports; `src/lib/landing.ts` has reviewed/updated thresholds; `src/scenes/LandingScene.ts` has reviewed LANDING_THRUST; `src/scenes/SurfaceScene.ts` has updated LOW_ORBIT_ALTITUDE
2. No hardcoded magic numbers: FlightScene fuel bar references the exported INITIAL_FUEL constant
3. Math check: manually verify that `INITIAL_FUEL / FUEL_CONSUMPTION_RATE * THRUST_POWER` gives enough delta-v for 3+ significant orbit changes at the new scale
4. Math check: verify `LANDING_THRUST > surfaceGravity` for the largest landable body (so the player can hover)
5. Build succeeds: `npx vite build` completes without errors
</verify>

<done>
Ship constants produce enough delta-v for a multi-transfer mission. Landing thrust can overcome gravity on all landable bodies. Launch orbit altitude is proportional to body radius. No hardcoded fuel references remain.
</done>

### Task 2: Rendering Optimization and Mission Loop Verification
**Type:** checkpoint:human-verify
**Sequence:** 2

<files>
src/objects/CelestialBody.ts
src/scenes/FlightScene.ts
</files>

<action>
Optimize large-body rendering and tune the camera zoom curve, then verify the full mission loop.

**CelestialBody.ts optimization:**
- The `drawRadialGradient()` function uses a fixed `steps` parameter (6-12 depending on body type). When a planet fills the screen (radius 500+ screen pixels), these few steps are fine -- but the concentric circles themselves become very large draw calls. Add an early-out: if the body's screen-space radius (`body.radius * zoom`) exceeds the screen diagonal, skip drawing circles larger than the visible area. Clamp the outer radius of the gradient to `Math.min(outerRadius, screenDiagonal)`.
- For the star glow specifically (`_drawStar` draws glow at `r * 3`), cap the glow outer radius to avoid drawing a gradient circle 3x the screen size.

**FlightScene.ts camera tuning:**
- The camera currently uses `DEFAULT_ZOOM = 1.0` with no dynamic adjustment (that was phase 2's job). By this phase, a dynamic zoom system should exist. Review the altitude-to-zoom curve and adjust if needed. The feel targets:
  - At altitude < 1x body radius: zoom so planet takes ~70% of screen height. `targetZoom = screenHeight * 0.7 / (bodyRadius * 2)` approximately.
  - At altitude > 20x body radius: zoom out to show orbital context.
  - Smooth exponential lerp between regimes (already exists if phase 2 is done).
- Trajectory rendering: review TRAJECTORY_STEP_SIZE and TRAJECTORY_STEP_COUNT. At the new scale, the current 600 steps * 1.0 dt covers 600 gu of simulation time, predicting maybe 600 gu of path. For orbits at 50,000+ gu, this shows almost nothing. Increase step count and/or step size so the trajectory prediction covers at least one full orbit or a meaningful portion of a transfer arc. Consider `TRAJECTORY_STEP_SIZE = 5.0` and `TRAJECTORY_STEP_COUNT = 2000` as a starting point, then adjust.

**Mission loop verification (manual, for human checkpoint):**
Run the game with `npx vite dev` and perform:
1. Start in star orbit -- verify camera zoom feels right
2. Use map view to plan a transfer to a planet
3. Execute the transfer burn, engage time warp
4. Enter planet SOI -- verify SOI transition is smooth
5. Lower orbit and trigger landing approach
6. Land successfully -- verify descent is controllable
7. On surface, scan and launch
8. Verify ship is in valid low orbit after launch
</action>

<verify>
1. File exists: `src/objects/CelestialBody.ts` has screen-space clamping in gradient rendering
2. File exists: `src/scenes/FlightScene.ts` has updated trajectory step parameters
3. Build succeeds: `npx vite build` completes without errors
4. Human verification: run `npx vite dev`, orbit a large planet at low altitude, confirm >30 fps (check browser dev tools performance tab)
5. Human verification: complete the 8-step mission loop described above without crashes or broken transitions
</verify>

<done>
Gradient rendering is clamped to screen bounds. Trajectory prediction covers meaningful orbital arcs at new scale. Camera zoom curve produces immersive low-orbit and contextual high-orbit views. Human has verified the full mission loop works end-to-end.
</done>

## Verification Checklist
- [ ] Ship can perform 3+ significant orbital maneuvers on a full tank
- [ ] Landing thrust exceeds surface gravity on all landable body types
- [ ] SurfaceScene launch places ship in proportional low orbit (not clipping body)
- [ ] No hardcoded `1000` for fuel max in HUD code
- [ ] Frame rate stays above 30 fps with a large planet filling the screen
- [ ] Trajectory prediction line extends far enough to show orbital arcs at 50,000+ gu distances
- [ ] Full mission loop completes: star orbit -> planet transfer -> orbit -> land -> surface -> launch -> orbit
- [ ] All scene transitions (Flight/Map/Landing/Surface) preserve ship state without NaN or position jumps

## Success Criteria
The game is playable end-to-end at KSP scale. A player can plan and execute multi-body missions with meaningful fuel management, controllable landings, and smooth scene transitions. Performance remains above 30 fps in all scenarios. The game feels like a KSP-lite experience: planets are imposing, distances are vast but navigable with time warp, and the player has agency through maneuver planning.
