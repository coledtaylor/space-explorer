# Feature Plan: Gravity, World-Space Ship, and Camera Zoom

## Objective
Make the solar system interactive: the ship moves freely in world space (no screen clamping), celestial bodies exert gravitational pull on the ship, and the camera follows the ship with smooth mouse-wheel zoom from ship-detail to full-system view.

**Purpose:** Without this phase the ship is trapped on screen and the solar system is scenery. This phase turns it into a navigable physics world.
**Output:** Modified Ship.ts with world-space movement and gravity force application, modified FlightScene.ts with gravity loop, camera follow/zoom, and screen-fixed HUD.

## Must-Haves (Goal-Backward)

### Observable Truths
1. The ship can fly away from the star indefinitely -- no invisible walls or screen clamping
2. A stationary ship near a massive body visibly accelerates toward it (gravity works)
3. Mouse wheel zooms smoothly between close-up (ship triangle clearly visible) and far-out (all orbits visible)
4. The ship stays centered on screen at every zoom level
5. The speed HUD remains readable and fixed to the screen corner at every zoom level

### Required Artifacts
| Path | Provides | Key Exports |
|------|----------|-------------|
| `src/objects/Ship.ts` | World-space ship with force application | `Ship` class with `applyForce(fx, fy)`, `updatePosition(delta)` (no bounds), `position` |
| `src/scenes/FlightScene.ts` | Gravity loop, camera follow, zoom, HUD | Scene with gravity integration, camera config, scroll-zoom input |
| `src/lib/camera.ts` | Pure zoom math utilities | `clampZoom(zoom, min, max)`, `ZOOM_MIN`, `ZOOM_MAX`, `ZOOM_SPEED` |

### Key Links
| From | To | Via |
|------|-----|-----|
| `FlightScene.update()` | `Ship.applyForce()` | `sumGravitationalForces()` from Phase 1 `src/lib/physics.ts` |
| `FlightScene.update()` | `Ship.updatePosition()` | Called each frame with delta only (no bounds) |
| `FlightScene.create()` | Phaser camera | `this.cameras.main.startFollow(ship)` + zoom config |
| `FlightScene` scroll input | `cameras.main.zoom` | Mouse wheel event handler applying `clampZoom()` |
| `speedText` | Screen-fixed position | `setScrollFactor(0)` so HUD ignores camera scroll |

## Dependency Graph
```
Task 1 (needs: Phase 1 physics.ts, Phase 2 CelestialBody objects)
  creates: updated Ship.ts, src/lib/camera.ts

Task 2 (needs: Task 1)
  creates: updated FlightScene.ts with gravity, camera, zoom, HUD
```

## Execution Sequences
| Sequence | Tasks | Parallel |
|----------|-------|----------|
| 1 | Task 1 | Solo |
| 2 | Task 2 | Solo |

## Tasks

### Task 1: World-Space Ship and Camera Zoom Math
**Type:** auto
**Sequence:** 1
**Status:** complete
Completed: 2026-04-02

<files>
src/objects/Ship.ts
src/lib/camera.ts
</files>

<action>
Modify Ship.ts:
- Remove the `ScreenBounds` interface and the `bounds` parameter from `updatePosition()`. The method should apply velocity to position with no clamping: `this.x += this.vx * delta; this.y += this.vy * delta`.
- Add `applyForce(fx: number, fy: number): void` that adds the force vector directly to vx/vy (force is pre-multiplied by delta on the caller side, matching how `applyThrust` works -- or decide a consistent convention and apply it; just be consistent with how `sumGravitationalForces` from Phase 1 returns its result).
- Keep all existing functionality (thrust, rotation, speed getter, drawing).

Create `src/lib/camera.ts`:
- Export zoom constants: `ZOOM_MIN` (far out, something like 0.01-0.05 to see full system), `ZOOM_MAX` (close up, ~1.0-2.0 for ship detail), `ZOOM_SPEED` (scroll sensitivity factor).
- Export `clampZoom(currentZoom: number, delta: number, min: number, max: number): number` -- applies a multiplicative delta and clamps. This is a pure function with no Phaser dependency.
- These values will need tuning based on Phase 1's solar system scale; pick reasonable defaults and mark them as tunable.
</action>

<verify>
1. File exists: `src/objects/Ship.ts` -- no references to `ScreenBounds`, no `bounds` parameter on `updatePosition`, has `applyForce` method
2. File exists: `src/lib/camera.ts` -- exports `ZOOM_MIN`, `ZOOM_MAX`, `ZOOM_SPEED`, `clampZoom`
3. No Phaser imports in `src/lib/camera.ts` (pure math module)
4. `npm run build` succeeds with no type errors
</verify>

<done>
Ship.ts has no screen clamping and exposes applyForce(). Camera zoom math exists as a pure module. Build passes.
</done>

### Task 2: Gravity Loop, Camera Follow, Zoom Input, and Screen-Fixed HUD
**Type:** auto
**Sequence:** 2
**Status:** complete
Completed: 2026-04-02

<files>
src/scenes/FlightScene.ts
</files>

<action>
Modify FlightScene.ts to wire everything together:

**Gravity loop in update():**
- Each frame, compute the ship's world position. Use `sumGravitationalForces()` from `src/lib/physics.ts` (Phase 1) with the ship position and all celestial body configs (with their current world positions from Phase 2's CelestialBody objects). Apply the resulting force vector to the ship via `ship.applyForce()`. Make sure delta is handled consistently (check whether sumGravitationalForces returns acceleration or force, and multiply by delta as needed before applying).

**Remove screen bounds from update:**
- Call `ship.updatePosition(delta)` with no bounds argument.

**Camera follow:**
- In `create()`, configure `this.cameras.main.startFollow(this.ship)` so the camera tracks the ship. Set appropriate follow lerp for smooth tracking.
- Set initial zoom appropriate for seeing nearby bodies.

**Mouse-wheel zoom:**
- In `create()`, add a pointer wheel event listener. On scroll, use `clampZoom()` from `src/lib/camera.ts` to compute the new zoom level and apply it to `this.cameras.main.zoom`.

**Screen-fixed HUD:**
- Call `this.speedText.setScrollFactor(0)` so the speed text stays pinned to the screen corner regardless of camera position or zoom. Set a high depth so it renders above everything.

**Ship starting position:**
- Place the ship at a sensible world-space location (e.g., offset from the star, near the first planet's orbit) rather than screen center, since the camera now follows.
</action>

<verify>
1. File exists: `src/scenes/FlightScene.ts` imports from `src/lib/physics.ts` and `src/lib/camera.ts`
2. `npm run build` succeeds with no type errors
3. Manual verification: run `npm run dev`, confirm:
   - Ship moves freely without hitting invisible walls
   - Ship drifts toward the star when not thrusting (gravity visible)
   - Mouse wheel zooms in/out smoothly
   - Ship stays centered at all zoom levels
   - Speed HUD stays in top-left corner at all zoom levels
4. Domain complete: all five observable truths from the Must-Haves section are satisfied
</verify>

<done>
Gravity pulls the ship toward massive bodies. Camera follows ship with smooth zoom from ship-detail to full-system. Speed HUD is screen-fixed. Ship moves freely in world space with no clamping.
</done>

## Verification Checklist
- [ ] Ship flies past where the screen edge used to be without stopping
- [ ] Ship with zero velocity near the star visibly accelerates toward it
- [ ] Mouse wheel zooms smoothly; no jumps or flicker
- [ ] At minimum zoom, all planet orbits are visible
- [ ] At maximum zoom, the ship triangle is clearly visible and detailed
- [ ] Ship stays screen-centered at every zoom level
- [ ] Speed HUD is readable and fixed to screen corner at all zoom levels
- [ ] `npm run build` produces no errors

## Success Criteria
The ship moves freely in an infinite world, is gravitationally attracted to all celestial bodies, and the player can zoom from ship-detail to full solar-system view while the camera tracks the ship and the HUD remains screen-fixed. All observable truths validated by visual inspection in the running game.
