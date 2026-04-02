# Feature Plan: Map View Adaptation for KSP-Scale

## Objective
Make MapScene fully functional at the new KSP scale where system zoom is ~0.001 and body radii are 500-2000 gu. Body markers, ship markers, maneuver node handles, trajectory propagation, and orbit rendering must all remain visible and interactive.

**Purpose:** Without these changes, the map view is unusable at the new scale -- bodies are sub-pixel dots, trajectory prediction covers a fraction of the distance between planets, and maneuver node handles are invisible.

**Output:** A working map view where all planets are readable, trajectories extend far enough for transfer orbits, and maneuver nodes are interactive.

## Must-Haves (Goal-Backward)

### Observable Truths
1. All planets visible as labeled markers at system-wide zoom (not sub-pixel)
2. Ship marker and velocity arrow visible at system-wide zoom
3. Trajectory prediction after a maneuver burn extends far enough to reach neighboring planets (~50,000-100,000+ gu)
4. Maneuver node center and drag handles remain visible and interactive
5. SOI boundaries drawn as faint circles on the map for navigation reference
6. Orbit ellipses render correctly at semi-major axes of 50,000-500,000 gu
7. Dashed trajectory path has visible dash/gap proportions at extreme zoom

### Required Artifacts
| Path | Provides | Key Exports |
|------|----------|-------------|
| `src/scenes/MapScene.ts` | Zoom-compensated rendering for all markers, labels, SOI circles | `MapScene` class |
| `src/lib/trajectory.ts` | Extended propagation defaults suitable for KSP-scale distances | `propagateTrajectory()` |

### Key Links
| From | To | Via |
|------|-----|-----|
| `MapScene._renderBodies()` | Camera zoom | `1/zoom` compensation for marker radii |
| `MapScene._renderTrajectory()` | `propagateTrajectory()` | `maxTime` and `stepSize` options |
| `MapScene._renderShip()` | Camera zoom | `1/zoom` compensation for ship marker |
| `MapScene._renderNodes()` | Camera zoom | Already partially compensated, needs verification |
| `MapScene._drawDashedPath()` | Camera zoom | Already compensates dash/gap lengths |

## Dependency Graph
Task 1 (needs nothing) -> creates: updated trajectory.ts with scale-aware defaults, updated MapScene trajectory call
Task 2 (needs nothing, parallel with Task 1) -> creates: zoom-compensated body/ship/node rendering, SOI circles, body labels

## Execution Sequences
| Sequence | Tasks | Parallel |
|----------|-------|----------|
| 1 | Task 1, Task 2 | Yes |

## Tasks

### Task 1: Scale trajectory propagation for KSP distances
**Type:** auto
**Sequence:** 1

<files>
src/lib/trajectory.ts
src/scenes/MapScene.ts
</files>

<action>
Update trajectory propagation to cover KSP-scale distances. The current defaults (maxTime=600, stepSize=1.0) propagate ~600 gu total -- far too short for transfer orbits spanning 50,000-500,000 gu.

In `trajectory.ts`:
- Increase default `maxTime` to ~50,000 (enough for a ship at ~50-200 gu/s to traverse significant distance)
- Increase default `stepSize` to ~10.0 (proportional to new scale; the adaptive logic already reduces step near bodies)
- Increase `MIN_POINT_DIST_SQ` proportionally (from 1 to ~100) so point arrays stay manageable at larger distances
- Keep the adaptive step logic (near-body reduction) but scale the thresholds -- `parentRadius * 4` is fine since body radii are now 500-2000

In `MapScene._renderTrajectory()`:
- Update the hardcoded `maxTime: 800, stepSize: 2.0` call to use scale-appropriate values (e.g., maxTime: 50000, stepSize: 10.0)
- The existing dashed path rendering already compensates dash/gap by `1/zoom` so it should work automatically
</action>

<verify>
1. File modified: `src/lib/trajectory.ts` has updated defaults (maxTime ~50000, stepSize ~10)
2. File modified: `src/scenes/MapScene.ts` `_renderTrajectory` passes scale-appropriate options
3. Build succeeds: `npx vite build` completes without errors
4. Domain complete: A maneuver node with a modest burn (~50 gu/s delta-v) produces a trajectory arc that extends tens of thousands of game units, visible as a dashed path spanning a meaningful fraction of the system on the map
</verify>

<done>
Trajectory propagation covers enough distance for transfer orbits between planets at KSP scale. The dashed trajectory path is visible and proportioned correctly on the map.
</done>

### Task 2: Zoom-compensated map rendering and SOI visualization
**Type:** auto
**Sequence:** 1

<files>
src/scenes/MapScene.ts
</files>

<action>
Make all map elements visible and interactive at zoom ~0.001 by compensating fixed-pixel-size elements with `1/zoom`.

Body markers in `_renderBodies()`:
- Replace fixed `STAR_MARKER_RADIUS`, `PLANET_MARKER_RADIUS`, `MOON_MARKER_RADIUS` with zoom-compensated values: `Math.max(body.radius, MIN_MARKER_PX / zoom)` where `MIN_MARKER_PX` is ~4-6 pixels. This ensures bodies are always at least a few pixels but render at true scale when zoomed in.
- Add text labels next to each planet (body name). Use Phaser text objects pooled/created once in `create()` and repositioned each frame. Set their scale to `1/zoom` so they appear constant-size on screen. Place them offset from the body marker.

Ship marker in `_renderShip()`:
- Apply `1/zoom` to `SHIP_MARKER_RADIUS`, the outer ring radius, and `SHIP_VELOCITY_ARROW_LENGTH` so the ship marker stays a constant screen size.

Maneuver nodes in `_renderNodes()`:
- `NODE_CIRCLE_RADIUS` and `HANDLE_RADIUS` are already divided by zoom. Verify `HANDLE_LINE_ALPHA` lines are thick enough -- may need to scale line width by `1/zoom` too.

SOI circles:
- In `_renderBodies()` (or a new `_renderSOI()` method), draw a faint dashed or solid circle at each planet's `soiRadius` centered on the planet's current position. Use a low alpha (~0.15) and a neutral color. This gives the player spatial reference for SOI boundaries when planning maneuvers.

Orbit hit tolerance in `_tryPlaceManeuverNode()`:
- Already scales by `1/zoom` via `ORBIT_HIT_TOLERANCE / zoom` -- verify this still works at zoom 0.001 (tolerance becomes 12,000 gu which may be too generous). Consider capping the tolerance or using a screen-pixel-based approach.
</action>

<verify>
1. Files modified: `src/scenes/MapScene.ts` has zoom-compensated marker sizes, planet labels, SOI circles
2. Build succeeds: `npx vite build` completes without errors
3. Visual check: At system-wide zoom (~0.001), planet markers are 4-6 pixels minimum, planet names are readable text labels, star is visibly larger than planets
4. SOI circles: Faint circles visible around each planet at their SOI radius
5. Ship marker: Ship dot and velocity arrow remain visible (constant screen size) regardless of zoom level
6. Interaction: Clicking near the ship orbit at system-wide zoom correctly places a maneuver node (hit tolerance is reasonable, not spanning half the system)
7. Domain complete: Map view is readable and interactive -- a player can identify all bodies, see their ship, and place/drag maneuver nodes
</verify>

<done>
All map elements (bodies, labels, ship, nodes, SOI circles) are visible and correctly sized at KSP-scale zoom levels. The map is usable for planning transfer orbits.
</done>

## Verification Checklist
- [x] All planets visible as labeled markers at system-wide zoom
- [x] Ship marker and velocity arrow visible at any zoom level
- [x] SOI boundary circles drawn around planets
- [x] Trajectory prediction extends far enough for interplanetary transfers (~50,000+ gu)
- [x] Maneuver nodes placeable and draggable at new scale
- [x] No rendering artifacts from large coordinates or extreme zoom
- [x] `npx vite build` succeeds with no TypeScript errors
- [x] Orbit hit tolerance is reasonable (not too wide at extreme zoom)

Completed: 2026-04-02

## Success Criteria
The map view displays the full KSP-scale system with readable body markers and labels, visible ship position, functional maneuver nodes, SOI boundary indicators, and trajectory predictions that extend far enough to show transfer orbits between planets. A player can open the map, understand the system layout, and plan an interplanetary maneuver.
