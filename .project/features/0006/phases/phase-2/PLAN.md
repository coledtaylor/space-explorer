# Feature Plan: Context-Adaptive Camera Zoom

## Objective
Replace the fixed `DEFAULT_ZOOM = 1.0` in FlightScene with a dynamic zoom system that maps ship altitude to an appropriate zoom level, keeping the view meaningful at all scales (planet fills screen in low orbit, orbital path visible at high altitude).

**Purpose:** At KSP scale (planets 500-2000 gu, orbits 50,000-500,000 gu), a fixed zoom makes the game unplayable -- either everything is too big or too small. Dynamic zoom is the bridge between large-scale data and a usable flight view.

**Output:** A smooth, altitude-aware camera zoom system with manual scroll-wheel override.

## Must-Haves (Goal-Backward)

### Observable Truths
- When the ship orbits a planet at altitude < 2x body radius, the planet visually fills 60-80% of screen height
- When the ship is at altitude > 10x body radius, the camera zooms out enough to show the orbital arc
- Zoom transitions are smooth -- no jarring jumps when altitude changes gradually
- The ship sprite remains visible at all zoom levels (never becomes sub-pixel)
- Starfield parallax still looks good at extreme zoom levels (no tiling artifacts, no disappearance)
- Player can override zoom with mouse scroll wheel; auto-zoom reasserts after a timeout

### Required Artifacts
| Path | Provides | Key Exports |
|------|----------|-------------|
| `src/lib/cameraZoom.ts` | Pure zoom calculation logic | `computeTargetZoom(altitude, bodyRadius, screenHeight)`, `ZOOM_CONFIG` constants |
| `src/scenes/FlightScene.ts` | Modified to use dynamic zoom, scroll wheel input, zoom lerp | N/A (scene class) |

### Key Links
| From | To | Via |
|------|-----|-----|
| `FlightScene._updateCamera` | `cameraZoom.computeTargetZoom` | Called each frame with current altitude and SOI body radius |
| `FlightScene.create` | Mouse wheel listener | `this.input.on('wheel', ...)` sets manual override zoom |
| `cam.zoom` | All rendering | Every `* zoom` multiplication in body drawing, orbit lines, trajectory, ship position |

## Dependency Graph
Task 1 (needs nothing) -> creates: src/lib/cameraZoom.ts
Task 2 (needs Task 1) -> modifies: src/scenes/FlightScene.ts

## Execution Sequences
| Sequence | Tasks | Parallel |
|----------|-------|----------|
| 1 | Task 1 | Yes |
| 2 | Task 2 | No (depends on Task 1) |

## Tasks

### Task 1: Create zoom calculation module
**Type:** auto
**Sequence:** 1
**Status:** complete
**Completed:** 2026-04-02

<files>
src/lib/cameraZoom.ts
</files>

<action>
Create a pure-function module that computes the target camera zoom level given altitude, body radius, and screen height.

The core idea: zoom should be set so that the body occupies a target fraction of screen height based on altitude regime.

**Zoom mapping logic:**
- Compute `altitudeRatio = altitude / bodyRadius` as the primary input
- When `altitudeRatio < 2` (low orbit): zoom so the body's diameter spans ~70% of screen height. Formula: `targetZoom = (screenHeight * 0.7) / (bodyRadius * 2)`. This means at a 1000 gu radius planet with 900px screen, zoom ~ 0.315.
- When `altitudeRatio > 10` (high orbit): zoom so the ship's orbital radius (altitude + bodyRadius) fits on screen with margin. Formula: `targetZoom = (screenHeight * 0.4) / (altitude + bodyRadius)`.
- Between ratio 2 and 10: smoothly interpolate (use smoothstep or similar easing) between the low-orbit zoom and high-orbit zoom values.
- Clamp zoom to a reasonable range: min ~0.001 (system-wide view), max ~2.0 (close surface view).

**Also export:**
- `ZOOM_CONFIG` object with named constants: `MIN_ZOOM`, `MAX_ZOOM`, `LOW_ORBIT_RATIO`, `HIGH_ORBIT_RATIO`, `LOW_ORBIT_SCREEN_FRACTION`, `HIGH_ORBIT_SCREEN_FRACTION`, `ZOOM_LERP_SPEED` (for smooth transitions, ~2.0), `MANUAL_OVERRIDE_TIMEOUT_MS` (3000-5000ms).
- A `smoothstep(edge0, edge1, x)` helper if not already in utils (check first -- if it exists in utils, import it).

Keep the module pure -- no Phaser dependencies, no side effects. It receives numbers and returns a number.
</action>

<verify>
1. File exists: `src/lib/cameraZoom.ts` with exports `computeTargetZoom` and `ZOOM_CONFIG`
2. Build succeeds: `npx vite build` completes without errors
3. Logic correctness (manual check): For a planet with radius=1000, screenHeight=900:
   - At altitude=500 (ratio 0.5): zoom ~ 0.315 (planet fills ~70% of screen)
   - At altitude=15000 (ratio 15): zoom ~ 0.0225 (orbit fits in ~40% of screen)
   - At altitude=5000 (ratio 5): zoom is interpolated between the two extremes
   - All results fall within MIN_ZOOM..MAX_ZOOM
</verify>

<done>
Pure zoom calculation module exists with correct altitude-to-zoom mapping, named constants, and no Phaser dependencies.
</done>

### Task 2: Integrate dynamic zoom into FlightScene
**Type:** auto
**Sequence:** 2

<files>
src/scenes/FlightScene.ts
</files>

<action>
Wire the zoom calculation into FlightScene, replacing the fixed `DEFAULT_ZOOM`. Three changes:

**1. Dynamic zoom in `_updateCamera`:**
- Import `computeTargetZoom` and `ZOOM_CONFIG` from `cameraZoom.ts`
- Each frame, compute `targetZoom = computeTargetZoom(this.ship.orbit.altitude, this.soiBody.radius, this.scale.height)`
- If manual override is not active, lerp `cam.zoom` toward `targetZoom` using exponential lerp (same `1 - Math.exp(-speed * dt)` pattern already used for camera position). Use `ZOOM_CONFIG.ZOOM_LERP_SPEED`.
- Add a private field `_manualZoomUntil: number = 0` to track when manual override expires.
- When manual override is active (`this.time.now < this._manualZoomUntil`), skip auto-zoom lerp.

**2. Mouse scroll wheel zoom override:**
- In `create()`, add `this.input.on('wheel', ...)` listener.
- On wheel event, multiply `cam.zoom` by a factor (e.g., `1.1` for scroll up, `1/1.1` for scroll down). Clamp to `ZOOM_CONFIG.MIN_ZOOM..MAX_ZOOM`.
- Set `this._manualZoomUntil = this.time.now + ZOOM_CONFIG.MANUAL_OVERRIDE_TIMEOUT_MS`.

**3. Camera scroll calculation fix:**
- The `_setCameraCenter` and `_updateCamera` methods already divide by zoom for scroll calculation -- verify this still works correctly when zoom changes frame-to-frame. The existing `scrollX = worldPos.x - width / (2 * zoom)` pattern is correct.

**4. Starfield adaptation:**
- The starfield parallax uses `camCX = cam.scrollX * cam.zoom + width / 2`. At very low zoom values (0.01), the parallax multiplier may cause the starfield to tile visibly. If this happens, scale `STARFIELD_EXTENT` by `1 / Math.min(zoom, 1)` to expand the tiling region, or clamp the parallax camera center so the starfield doesn't repeat obviously.

Remove the `DEFAULT_ZOOM` constant (replace its one usage in `create()` with an initial zoom computed from the starting orbit).
</action>

<verify>
1. Build succeeds: `npx vite build` completes without errors
2. File check: `DEFAULT_ZOOM` constant no longer exists in FlightScene.ts
3. File check: FlightScene imports from `../lib/cameraZoom`
4. Domain validation (manual play-test):
   - Launch the game, observe that zoom automatically adjusts as ship orbits
   - In low orbit near a body: planet fills most of the screen
   - At high altitude: camera zooms out to show more space
   - Zoom transitions are smooth when altitude changes
   - Mouse scroll wheel overrides zoom temporarily; auto-zoom resumes after timeout
   - Ship remains visible as a recognizable shape at all zoom levels
   - Starfield background does not tile or disappear at any zoom level
</verify>

<done>
FlightScene uses dynamic altitude-based zoom with smooth lerp transitions. Mouse scroll wheel provides temporary manual override. Fixed DEFAULT_ZOOM is removed. The flight view is playable at KSP scale.
</done>

## Verification Checklist
- [x] `src/lib/cameraZoom.ts` exists with pure zoom calculation function and named constants
- [ ] `npx vite build` succeeds with no type errors
- [ ] `DEFAULT_ZOOM` constant removed from FlightScene
- [ ] Low orbit: planet fills 60-80% of screen height
- [ ] High orbit: camera zooms out to show orbital context
- [ ] Zoom transitions are smooth (no jarring jumps)
- [ ] Mouse scroll wheel temporarily overrides auto-zoom
- [ ] Ship remains visible at all zoom levels
- [ ] Starfield looks acceptable at all zoom levels

## Success Criteria
The flight view dynamically adjusts zoom based on altitude so that planets fill the screen in low orbit and the view expands at high altitude. Transitions are smooth. The player can temporarily override zoom with the scroll wheel. The game is visually playable at KSP scale distances.
