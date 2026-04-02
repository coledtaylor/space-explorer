# Feature Plan: Time Warp as Core Flight Mechanic

## Objective
Expand time warp from a minimal map-only feature into a core flight mechanic available in FlightScene. At KSP scale, transit between bodies (50,000-500,000 gu) is unplayable without warp in flight view. This phase makes warp accessible, safe, and stable for flight.

**Purpose:** Without flight-view time warp, the rescaled game is unplayable — players would wait real-time hours to transit between planets.
**Output:** Expanded timewarp module with safety rails, FlightScene warp controls + HUD indicator, stable physics at all warp levels.

## Must-Haves (Goal-Backward)

### Observable Truths
- Player can increase/decrease warp in flight view using comma/period keys
- Warp rate visibly accelerates ship movement and body orbital motion
- HUD displays current warp rate (highlighted when > 1x)
- Warp auto-drops to 1x when entering a new SOI
- Warp auto-drops to 1x when player applies thrust
- Warp auto-drops to 1x when ship approaches a body surface
- Transit of 50,000+ gu completes in < 2 minutes at max warp
- No physics explosions (NaN, missed SOI transitions) at any warp level

### Required Artifacts
| Path | Provides | Key Exports |
|------|----------|-------------|
| `src/lib/timewarp.ts` | Expanded warp steps + safety helpers | `WARP_STEPS`, `getWarpRate`, `increaseWarp`, `decreaseWarp`, `resetWarp`, `shouldAutoDropWarp` |
| `src/scenes/FlightScene.ts` | Warp controls, warped dt, HUD indicator, safety triggers | Modified `update()`, new HUD label, new key bindings |

### Key Links
| From | To | Via |
|------|-----|-----|
| FlightScene.update | timewarp module | `getWarpRate()` multiplies dt before physics |
| FlightScene._handleSOITransition | timewarp module | `resetWarp()` on SOI change |
| FlightScene._readInput (thrust) | timewarp module | `resetWarp()` when thrust is active |
| FlightScene._updateHud | timewarp module | `getWarpRate()` for HUD label text |

## Dependency Graph
Task 1 (needs nothing) -> creates: expanded src/lib/timewarp.ts with higher steps + safety helper
Task 2 (needs Task 1) -> creates: FlightScene warp integration (controls, warped dt, HUD, safety rails)

## Execution Sequences
| Sequence | Tasks | Parallel |
|----------|-------|----------|
| 1 | Task 1 | Yes (single task) |
| 2 | Task 2 | Yes (single task) |

## Tasks

### Task 1: Expand timewarp module with higher steps and safety helper
**Type:** auto
**Sequence:** 1

<files>
src/lib/timewarp.ts
</files>

<action>
Expand WARP_STEPS to [1, 10, 100, 1000, 10000, 100000]. The existing get/set/increase/decrease/reset functions stay the same (they already index into the array).

Add a pure function `shouldAutoDropWarp(isThrusting: boolean, altitude: number, bodyRadius: number, soiChanged: boolean): boolean` that returns true if warp should drop to 1x. Conditions: thrust is active, SOI just changed, or altitude < bodyRadius * 0.5 (approaching surface). Export it.

Keep the module stateless except for the warp index (same pattern as current). Add named constants for the surface proximity threshold factor.
</action>

<verify>
1. File exists: src/lib/timewarp.ts with WARP_STEPS containing 6 levels up to 100000
2. Exports: getWarpRate, increaseWarp, decreaseWarp, resetWarp, shouldAutoDropWarp all exported
3. shouldAutoDropWarp returns true for thrust=true, soiChanged=true, and altitude < radius*threshold
4. Build succeeds: npx vite build completes without type errors
</verify>

<done>
WARP_STEPS has 6 levels [1, 10, 100, 1000, 10000, 100000]. Safety helper function exported and handles all three auto-drop conditions. Module builds cleanly.
Completed: 2026-04-02
</done>

### Task 2: Integrate warp into FlightScene with controls, HUD, and safety rails
**Type:** auto
**Sequence:** 2

<files>
src/scenes/FlightScene.ts
</files>

<action>
Wire time warp into FlightScene following the same patterns MapScene uses:

**Keyboard controls:** Add comma/period key bindings (same as MapScene). On JustDown, call increaseWarp/decreaseWarp from timewarp module.

**Warped dt:** In update(), after reading raw dt, compute `warpedDt = dt * getWarpRate()`. Pass warpedDt to `updateBodyPositions()` and to `this.ship.update()` instead of raw dt. Keep raw dt for camera lerp (camera should move smoothly regardless of warp).

**Physics stability at high warp:** When warpedDt exceeds a threshold (e.g., > 0.5s), use substeps — divide warpedDt into N steps of max 0.1s each, calling ship.update and updateBodyPositions per substep. This prevents the ship from tunneling through SOI boundaries at 100000x warp. Run SOI transition check after each substep.

**Safety rails:** After ship.update each substep, check `shouldAutoDropWarp()` passing: ship.thrustActive, current altitude (compute from ship position and soiBody radius), soiBody radius, and whether SOI just changed this frame. If true, call resetWarp().

**HUD indicator:** Add a warp rate text label to the HUD (top-right area or next to existing HUD labels). Format: "WARP: 100x". Color it yellow (#ffdd44) when > 1x, default HUD color when 1x. Update it each frame.

**On scene exit:** Call resetWarp() when switching to MapScene (matching MapScene's behavior of resetting on return to flight).
</action>

<verify>
1. File exists: src/scenes/FlightScene.ts imports from timewarp module
2. Build succeeds: npx vite build completes without errors
3. Keyboard: comma/period keys registered in create()
4. Warped physics: update() multiplies dt by getWarpRate() before passing to ship.update and updateBodyPositions
5. Substeps: when warpedDt > threshold, loop runs multiple smaller steps with SOI checks per step
6. Safety: resetWarp() called on SOI transition, thrust detection, and surface proximity
7. HUD: warp label text object created, updated each frame with current rate and color-coded
8. Domain complete: run `npx vite build` — no errors. Manually verify in browser: press period to increase warp, comma to decrease, HUD shows rate, thrust auto-drops to 1x, SOI entry auto-drops to 1x.
</verify>

<done>
FlightScene has comma/period warp controls, warped dt applied to all physics, substep loop for stability at high warp, auto-drop on thrust/SOI/surface, warp rate HUD label visible and color-coded. Build passes.
Completed: 2026-04-02
</done>

## Verification Checklist
- [x] WARP_STEPS includes [1, 10, 100, 1000, 10000, 100000]
- [x] shouldAutoDropWarp exported and handles thrust, SOI change, surface proximity
- [x] FlightScene comma/period keys control warp
- [x] Physics uses warpedDt with substep loop for stability
- [x] Warp auto-drops to 1x on thrust
- [x] Warp auto-drops to 1x on SOI transition
- [x] Warp auto-drops to 1x near body surface
- [x] HUD shows warp rate, yellow when > 1x
- [x] `npx vite build` passes with no errors

## Success Criteria
Player can engage time warp in flight view with comma/period. Max warp (100000x) makes 50,000+ gu transits complete in under 2 minutes. Warp auto-cancels on SOI entry, thrust, or surface approach. Warp indicator visible in HUD. Physics stable at all warp levels (substep integration prevents tunneling). Build passes cleanly.
