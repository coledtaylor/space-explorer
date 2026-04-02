# Feature Plan: Launch from Surface (Feature 0004, Phase 4)

## Objective
Enable the player to lift off from a landed body and return to orbital flight, closing the land-interact-depart gameplay loop.

**Purpose:** Without launch, landing is a dead end. This phase makes landing meaningful by letting the player depart and continue exploring.
**Output:** Launch sequence in `js/landing.js` and `js/ship.js`, fuel-cost scaling by surface gravity, re-enabling of SOI checks, surface panel dismissal, and landing HUD behavior during ascent.

## Must-Haves (Goal-Backward)

### Observable Truths
1. Pressing W while landed lifts the ship off the surface and resumes physics simulation
2. Launching from a high-gravity body burns noticeably more fuel than from a low-gravity moon
3. After launch the player can orbit the same body using normal thrust controls (no stuck states)
4. The surface interaction panel disappears the moment launch begins
5. The landing HUD reappears during ascent and disappears once above approach altitude

### Required Artifacts
| Path | Provides | Key Exports |
|------|----------|-------------|
| `js/landing.js` | Launch state transition, fuel cost calculation, ascent HUD control | `launchFromSurface()` or equivalent state transition within existing landing state machine |
| `js/ship.js` | Landed flag clear, velocity resume, launch thrust application | Modified `update()` that handles launch thrust with gravity-scaled fuel cost |
| `js/main.js` | Wiring: detect W press while landed, trigger launch, hide surface panel, manage HUD visibility | Modified `loop()` / `update()` / `render()` |
| `js/surface.js` | Surface panel hide on launch | Panel hide function callable from main.js |
| `js/physics.js` | SOI transition skip while landed, re-enable on launch | Guard in `checkSOITransition()` |

### Key Links
| From | To | Via |
|------|-----|-----|
| `input.up` (W key) | `landing.js` launch trigger | main.js checks `ship.landed && input.up` |
| `landing.js` launch | `ship.js` state clear | Clears `ship.landed`, sets initial upward velocity |
| `landing.js` launch | `surface.js` panel hide | main.js calls panel hide on state change |
| `landing.js` ascent state | `physics.js` SOI re-enable | `checkSOITransition` skips when `ship.landed`, resumes when not |
| `landing.js` altitude check | landing HUD visibility | HUD shows during ascent while below approach altitude, hides above |

## Dependency Graph
```
Task 1 (needs: Phase 1 landed state + Phase 3 surface panel) -> creates: launch mechanics, fuel scaling, state transitions
Task 2 (needs: Task 1) -> creates: HUD wiring, surface panel dismissal, SOI guard, integration verification
```

## Execution Sequences
| Sequence | Tasks | Parallel |
|----------|-------|----------|
| 1 | Task 1 | No |
| 2 | Task 2 | No |

## Tasks

### Task 1: Implement launch mechanics and gravity-scaled fuel cost
**Type:** auto
**Sequence:** 1

<files>
js/landing.js
js/ship.js
</files>

<action>
Add launch capability to the landing state machine in `js/landing.js`. When the ship is in the `landed` state and thrust input (W / `input.up`) is detected, transition to a `launching` or `ascending` state:

1. Compute surface gravity for the current body: `surfaceGravity = mu / (radius * radius)`. Use this to scale fuel consumption during launch thrust. A high-gravity body (large `surfaceGravity`) should multiply the base `FUEL_CONSUMPTION_RATE` so launches from heavy planets cost 2-4x more fuel than from small moons.

2. On launch initiation: clear the landed flag on the ship, give the ship an initial upward velocity impulse away from the body center (along the surface normal, i.e., the radial direction from body center through ship position). The impulse should be enough to visibly separate from the surface but not escape — the player must continue thrusting.

3. In `js/ship.js`, ensure the `update()` method respects the landed state: when `ship.landed` is true, skip gravity integration, velocity integration, and position integration (the ship is stationary on the surface). When `ship.landed` becomes false (launch), normal physics resume immediately.

4. Export a `getLaunchFuelMultiplier(body)` or equivalent from `landing.js` so that `ship.js` can apply the gravity-scaled fuel cost during ascent thrust. The multiplier should be proportional to `surfaceGravity` normalized against a baseline (e.g., baseline gravity = 1.0, so a body with surfaceGravity 2.0 costs 2x fuel).

The landing state machine from Phase 1 likely has states like `inactive`, `approaching`, `landed`, `crashed`. Add `ascending` as a new state that activates on launch and returns to `inactive` once the ship is above approach altitude.
</action>

<verify>
1. File modified: `js/landing.js` contains launch/ascending state and a fuel multiplier function based on `mu / (radius * radius)`
2. File modified: `js/ship.js` `update()` skips physics when `ship.landed === true` and resumes when false
3. Logic check: grep for `surfaceGravity` or `mu / (radius` in landing.js confirms gravity-based fuel scaling exists
4. Logic check: the ascending state transitions back to inactive when altitude exceeds approach threshold
</verify>

<done>
Launch mechanics exist: landed state can transition to ascending via thrust input, fuel cost scales with surface gravity, ship physics freeze while landed and resume on launch, ascending state returns to inactive above approach altitude.
</done>

**Status:** Complete
**Completed:** 2026-04-02

### Task 2: Wire launch into game loop — panel dismissal, HUD, SOI guard
**Type:** auto
**Sequence:** 2

<files>
js/main.js
js/physics.js
js/surface.js
</files>

<action>
Wire the launch sequence into the game loop and ensure all UI and physics systems respond correctly:

1. In `js/main.js` `update()`: detect the transition from landed to ascending (or simply detect `ship.landed` becoming false). When this happens, hide the surface interaction panel by calling whatever hide method `surface.js` exposes (likely adding `.hidden` class to the panel element). The surface panel must disappear immediately on launch, not after a delay.

2. In `js/main.js` `update()`: during the ascending state, show the landing HUD (altitude, descent rate, horizontal velocity — same HUD from Phase 1 approach). The landing HUD should remain visible while the ship is below the approach altitude threshold. Once the ship climbs above approach altitude, hide the landing HUD and return to normal orbital HUD display.

3. In `js/physics.js` `checkSOITransition()`: add a guard at the top of the function that returns `null` (skip transition check) when `ship.landed` is true. This prevents the ship from triggering an SOI escape while stationary on the surface. When `ship.landed` is false, SOI checks proceed normally — no special handling needed for the ascending state since the ship is flying normally at that point.

4. In `js/main.js`, ensure the camera zoom behavior from Phase 2 works correctly during ascent — the camera should smoothly zoom out as altitude increases, reversing the descent zoom. This should already work if the landing camera system from Phase 2 is altitude-based, but verify the wiring handles the ascending state.

5. Ensure the ship angle is not locked during ascent — the player should be able to aim with the mouse and thrust in any direction after liftoff, using normal flight controls.
</action>

<verify>
1. In-game test sequence: Land on a body. Verify surface panel is visible. Press W. Verify: (a) ship lifts off, (b) surface panel disappears immediately, (c) landing HUD appears showing altitude increasing, (d) once above approach altitude the landing HUD hides and orbital HUD shows normal data.
2. Fuel test: Land on a high-mass planet, note fuel before launch, thrust for 2 seconds, note fuel consumed. Land on a small moon, repeat. The planet launch should consume detectably more fuel.
3. SOI test: While landed, confirm no SOI transition occurs (ship stays in the body's SOI). After launch and climbing above the surface, confirm SOI transitions work normally if the ship escapes.
4. Controls test: After liftoff, confirm mouse aiming works and the ship can thrust in any direction to achieve orbit.
5. File check: `js/physics.js` `checkSOITransition` contains a `ship.landed` guard that returns null early.
</verify>

<done>
Launch is fully integrated: W key triggers liftoff from landed state, surface panel hides on launch, landing HUD shows during ascent and hides above approach altitude, SOI checks are suppressed while landed and resume on launch, camera zooms out during ascent, player has full flight controls after liftoff, high-gravity bodies cost more fuel than low-gravity ones.
</done>

**Status:** Complete
**Completed:** 2026-04-02

## Verification Checklist
- [ ] Pressing W while landed initiates liftoff and ship begins moving away from surface
- [ ] Surface interaction panel hides immediately when launch begins
- [ ] Landing HUD (altitude, descent rate) appears during ascent
- [ ] Landing HUD disappears when ship climbs above approach altitude
- [ ] Fuel consumption during launch thrust is higher on heavy bodies than light ones
- [ ] After launch, normal thrust/aim controls work for achieving orbit
- [ ] SOI transition checks are skipped while landed, resume after launch
- [ ] No physics glitches at the landed-to-flying transition (no NaN, no teleporting, no velocity spikes)
- [ ] Camera smoothly zooms out during ascent

## Success Criteria
The player can press W while landed on any body to lift off. The launch consumes fuel proportional to the body's surface gravity. After clearing the surface, the player can freely maneuver to achieve orbit using standard controls. The surface panel disappears on launch, the landing HUD shows during ascent, and all systems (SOI, camera, physics) transition cleanly back to normal flight mode.
