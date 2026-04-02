# Feature Plan: Landing Detection and Approach HUD

## Objective
Deliver a new `js/landing.js` module that detects planetary approach, displays a landing HUD with descent telemetry, evaluates surface contact (crash vs safe landing), and rejects gas giant landings. When complete, the player sees real-time descent data during approach and gets clear feedback on landing outcomes.

**Purpose:** This is the foundation for all surface interaction. Without approach detection and collision evaluation, no subsequent landing features (camera zoom, surface panels, launch) can function.

**Output:** `js/landing.js` module, landing HUD markup in `index.html`, landing HUD styles in `css/style.css`, wiring in `js/main.js` and `js/ship.js`.

## Must-Haves (Goal-Backward)

### Observable Truths
1. When the ship orbits a landable body (planet/moon, not gas giant) and altitude drops below approach threshold while speed is below escape velocity, a landing HUD appears showing altitude, descent rate, and horizontal velocity
2. The landing HUD updates every frame with accurate telemetry derived from ship state relative to the SOI body
3. When altitude reaches zero and descent rate AND horizontal velocity are below safe thresholds, the ship enters a "landed" state (velocity zeroed, position locked to surface)
4. When altitude reaches zero and descent rate OR horizontal velocity exceed safe thresholds, a crash occurs (ship respawns in circular orbit around the same body with a status message)
5. When approaching a Gas Giant below crush altitude, the ship is destroyed with an "ATMOSPHERIC CRUSH" message and respawns in orbit around the parent star
6. Gas giants never allow a successful landing regardless of approach parameters

### Required Artifacts
| Path | Provides | Key Exports |
|------|----------|-------------|
| `js/landing.js` | Landing state machine, approach detection, descent telemetry, collision evaluation, gas giant rejection | `updateLanding(ship, dt)`, `getLandingState()`, `resetLanding()` |
| `js/ship.js` | Landed flag, position/velocity lock when landed | `ship.landed` property, modified `update()` to skip physics when landed |
| `js/main.js` | Landing module wiring, HUD updates, crash/land handling | Modified `update()` and `loop()` |
| `index.html` | Landing HUD markup | `#landing-hud` with altitude, descent rate, horizontal velocity, status rows |
| `css/style.css` | Landing HUD styling | Styles for `#landing-hud`, warning/danger color states |

### Key Links
| From | To | Via |
|------|-----|-----|
| `landing.js` | `ship.js` | Reads `ship.x`, `ship.y`, `ship.vx`, `ship.vy`, `ship.currentSOIBody`, `ship.orbit.altitude`; writes `ship.landed`, `ship.vx=0`, `ship.vy=0` |
| `landing.js` | `celestial.js` body data | Reads `body.subtype`, `body.radius`, `body.mu` to determine landability and surface gravity |
| `main.js` | `landing.js` | Calls `updateLanding()` each frame after `ship.update()`; reads `getLandingState()` to update HUD and handle crash/respawn |
| `ship.js` | `landing.js` | `ship.update()` checks `this.landed` to skip gravity/thrust/integration when landed |
| `main.js` | `physics.js` | Must skip `checkSOITransition()` when ship is landed (prevent escaping SOI while stationary on surface) |

## Dependency Graph
```
Task 1 (needs nothing) -> creates: js/landing.js, js/ship.js modifications
Task 2 (needs Task 1)  -> creates: index.html landing HUD, css/style.css landing styles, js/main.js wiring
```

## Execution Sequences
| Sequence | Tasks | Parallel |
|----------|-------|----------|
| 1 | Task 1 | Solo |
| 2 | Task 2 | Solo |

## Tasks

### Task 1: Create landing module and ship landed state
**Type:** auto
**Sequence:** 1
**Status:** Complete
Completed: 2026-04-02

<files>
js/landing.js
js/ship.js
</files>

<action>
Create `js/landing.js` with the landing state machine. The module tracks approach state and evaluates surface contact.

**State machine:** The landing system has states: `inactive`, `approach`, `landed`, `crashed`, `crushed`. Transition logic:

- `inactive` -> `approach`: when ship is in a planet/moon SOI (not star, not anomaly), altitude < approach threshold (e.g., `body.radius * 3`), and orbital speed < escape velocity (`sqrt(2 * body.mu / distance)`)
- `approach` -> `landed`: altitude <= 0, descent rate < safe threshold (e.g., 3 gu/s), horizontal velocity < safe threshold (e.g., 4 gu/s)  
- `approach` -> `crashed`: altitude <= 0, descent rate OR horizontal velocity exceed safe thresholds
- `approach` -> `crushed`: body.subtype === 'Gas Giant' AND altitude < crush threshold (e.g., `body.radius * 0.5`)
- `approach` -> `inactive`: altitude > approach threshold or speed > escape velocity (ship pulled away)
- `landed`/`crashed`/`crushed` -> `inactive`: after reset (called by main.js on respawn)

**Telemetry computation:**
- `altitude`: `vec2Mag({x: ship.x, y: ship.y}) - body.radius` (ship pos is SOI-relative)
- `descentRate`: radial velocity component = `-dot(pos, vel) / |pos|` (positive = descending)
- `horizontalVelocity`: tangential velocity component = `|cross(pos, vel)| / |pos|`
- `surfaceGravity`: `body.mu / (body.radius * body.radius)`

Export `updateLanding(ship, dt)` which takes the ship and returns the current state, and `getLandingState()` which returns `{ state, altitude, descentRate, horizontalVelocity, surfaceGravity, isGasGiant, bodyName }`. Export `resetLanding()` to return to inactive.

**Body landability:** A body is landable if `body.kind === 'planet'` or `body.kind === 'moon'`, AND `body.subtype !== 'Gas Giant'`. Gas giants enter approach mode but trigger crush instead of landing.

**Ship modifications:** Add `this.landed = false` to Ship constructor. In `ship.update()`, if `this.landed` is true, skip gravity, thrust, and position integration entirely (the ship is stationary on the surface). The ship should still allow angle changes via mouse aim so the player can orient for launch (Phase 4).
</action>

<verify>
1. File exists: `js/landing.js` exports `updateLanding`, `getLandingState`, `resetLanding`
2. File exists: `js/ship.js` has `this.landed = false` in constructor; `update()` returns early when `this.landed === true`
3. Code review: `updateLanding` correctly computes radial and tangential velocity components from ship SOI-relative position/velocity
4. Code review: Gas Giant detection checks `body.subtype === 'Gas Giant'` and transitions to `crushed` state below crush altitude
5. Code review: Surface collision at altitude <= 0 evaluates both descent rate and horizontal velocity against thresholds
</verify>

<done>
`js/landing.js` exists with complete state machine handling inactive/approach/landed/crashed/crushed states. `js/ship.js` Ship class has `landed` property that disables physics when true. Descent telemetry (altitude, descent rate, horizontal velocity) is computed from SOI-relative ship state. Gas giant crush detection works independently of landing speed.
</done>

### Task 2: Wire landing into game loop, add HUD markup and styles
**Type:** auto
**Sequence:** 2

<files>
index.html
css/style.css
js/main.js
</files>

<action>
**HTML:** Add a `#landing-hud` div inside `#ui-overlay`, positioned on the left side below the orbit HUD. Structure it like the existing `#orbit-hud` with rows:
- Header: "LANDING" (styled like `.burn-guide-header`)
- Row: ALT label + `#landing-alt` value + "m" unit
- Row: V/S label (vertical speed) + `#landing-vs` value + "m/s" unit  
- Row: H/S label (horizontal speed) + `#landing-hs` value + "m/s" unit
- Row: STATUS label + `#landing-status` value (shows APPROACH / NOMINAL / DANGER / LANDED / CRASH / CRUSH)
- Start hidden with class `hidden`

**CSS:** Style `#landing-hud` matching the `#orbit-hud` / `#burn-guide` visual language (dark translucent background, blue border, monospace font, same sizing). Add color states for status:
- APPROACH/NOMINAL: cyan (`#4fc3f7`)
- DANGER (descent rate or h-vel above 60% of threshold): yellow/amber (`#ffeb3b`)
- CRASH/CRUSH: red (`#ff4444`)
- LANDED: green (`#66ff66`)

Add color classes for the telemetry values themselves — when descent rate or horizontal velocity are in the danger zone (above 60% of safe threshold), color those specific values amber; above 90%, color them red.

**main.js wiring:**
1. Import `updateLanding`, `getLandingState`, `resetLanding` from `./landing.js`
2. Grab DOM references for `#landing-hud`, `#landing-alt`, `#landing-vs`, `#landing-hs`, `#landing-status`
3. In the sub-step loop (inside `loop()`, after `ship.update()` and before `checkSOITransition()`): call `updateLanding(ship, subDt)`
4. Skip `checkSOITransition()` when ship is landed (`ship.landed === true`)
5. In `update(dt)` (the per-frame function): read `getLandingState()` and update landing HUD visibility and values:
   - If state is `approach`: show `#landing-hud`, update all telemetry values, set status text and color classes
   - If state is `landed`: show `#landing-hud` with LANDED status, zero out velocity displays
   - If state is `crashed`: hide `#landing-hud`, show a brief crash message (set `#landing-status` to "CRASH" with red styling, or flash the status text), then call `resetLanding()` and respawn ship in circular orbit around the same body (radius = `body.radius * 4`, circular velocity = `sqrt(body.mu / orbitRadius)`)
   - If state is `crushed`: similar to crash but respawn around the parent star instead (since gas giant SOI should be exited), with status "ATMOSPHERIC CRUSH"
   - If state is `inactive`: hide `#landing-hud`
6. On system transition (seed change), call `resetLanding()`
7. In map mode, the landing HUD can remain visible if in approach (it is informational)

**Crash/crush respawn logic:**
- Crash: `ship.x = body.radius * 4; ship.y = 0; ship.vx = 0; ship.vy = -sqrt(body.mu / (body.radius * 4)); ship.landed = false;` — stays in same SOI body
- Crush (gas giant): need to transition back to star SOI. Set `ship.currentSOIBody = system.star`, reposition ship at the gas giant's world position offset, give it a circular orbit velocity around the star
</action>

<verify>
1. File exists: `index.html` contains `#landing-hud` div with `#landing-alt`, `#landing-vs`, `#landing-hs`, `#landing-status` elements
2. File exists: `css/style.css` contains `#landing-hud` styles with color state classes for status values
3. Serve the game (`npx serve . -p 3333` or equivalent) and open in browser — verify no console errors on load
4. Manual test: Orbit a rocky planet, lower periapsis by thrusting retrograde. When altitude drops below approach threshold, the landing HUD should appear with updating telemetry values
5. Manual test: Approach surface too fast — crash message appears, ship respawns in orbit around same body
6. Manual test: Approach surface slowly (retrograde thrust to slow descent) — ship enters landed state, LANDED status shown, ship stops moving
7. Manual test: Approach a Gas Giant — below crush altitude, ship is destroyed with ATMOSPHERIC CRUSH message, respawns around star
8. Domain complete: Landing HUD shows real-time altitude/descent-rate/horizontal-velocity during approach; crash vs safe landing is correctly evaluated; gas giants reject landing
</verify>

<done>
Landing HUD appears during approach with real-time altitude, descent rate, and horizontal velocity. Surface contact below speed thresholds results in landed state (ship stops). Surface contact above speed thresholds results in crash with respawn. Gas giant approach below crush altitude results in atmospheric crush with respawn at star. Landing module is fully wired into the game loop with SOI transition checks disabled while landed.
</done>

## Verification Checklist
- [x] `js/landing.js` exports `updateLanding`, `getLandingState`, `resetLanding`
- [x] `js/ship.js` Ship has `landed` property; `update()` skips physics when landed
- [ ] `index.html` has `#landing-hud` with telemetry display elements
- [ ] `css/style.css` has landing HUD styles with danger/warning color states
- [ ] `js/main.js` imports and calls landing module each frame
- [ ] `js/main.js` skips SOI transitions when ship is landed
- [ ] Landing HUD appears during approach with updating values
- [ ] Safe landing: ship stops, LANDED status displayed
- [ ] Crash: ship respawns in orbit, feedback shown
- [ ] Gas giant crush: ship destroyed, respawns at star
- [ ] No console errors, no NaN values in telemetry

## Success Criteria
The player can approach any landable body and see real-time descent telemetry. Gentle approaches result in a landed state where the ship stops. Fast approaches cause a crash with respawn. Gas giants destroy the ship below crush altitude. The landing HUD uses color-coded warnings to communicate approach safety in real-time.
