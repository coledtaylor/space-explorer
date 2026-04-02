# Feature Plan: Burn Execution Guidance

## Objective
Connect maneuver nodes to flight mode with real-time burn guidance HUD. When a maneuver node exists, the player sees a countdown to burn start, a heading indicator showing which direction to point the ship, and a delta-v remaining display during the burn. After the burn completes, the maneuver node is automatically removed.

**Purpose:** Without burn guidance, players must mentally translate map-mode plans into flight-mode actions. This phase closes the plan-to-execution loop, making maneuver nodes actionable rather than just visual.
**Output:** `js/burnguide.js` module, burn guidance HUD elements in `index.html` and `css/style.css`, wiring in `js/main.js` and `js/ship.js`.

## Must-Haves (Goal-Backward)

### Observable Truths
1. When a maneuver node exists and the player is in flight mode, a countdown to burn start is visible in the HUD
2. A directional heading marker on the canvas shows the direction the ship should be pointing for the burn
3. When the ship thrusts during an active burn window, a delta-v remaining indicator decreases toward zero
4. When delta-v remaining reaches zero, the maneuver node is automatically removed from the system
5. The post-burn orbit closely matches the planned trajectory that was shown in map mode

### Required Artifacts
| Path | Provides | Key Exports |
|------|----------|-------------|
| `js/burnguide.js` | Burn guidance state machine and rendering | `BurnGuide` class or functions: `updateBurnGuide()`, `drawBurnGuide()`, `setBurnTarget()`, `clearBurnTarget()` |
| `index.html` | Burn guidance HUD container | `#burn-guide` element with countdown, delta-v remaining, and status spans |
| `css/style.css` | Burn guidance HUD styling | Styles for `#burn-guide` and child elements |
| `js/main.js` | Wiring burn guide into game loop | Import and call burn guide update/render in `update()` and `render()` |
| `js/ship.js` | Burn execution tracking on ship | `activeManeuver` property, delta-v accounting during thrust |

### Key Links
| From | To | Via |
|------|-----|-----|
| `js/maneuver.js` (Phase 4) | `js/burnguide.js` | Maneuver node data: burn vector, position on orbit, time-to-node |
| `js/burnguide.js` | `js/ship.js` | Ship angle vs burn direction comparison; delta-v consumption tracking |
| `js/burnguide.js` | `js/main.js` | `updateBurnGuide()` called each frame to compute countdown and check burn completion |
| `js/burnguide.js` | Canvas rendering | `drawBurnGuide()` renders heading marker on canvas; HUD text updated via DOM |
| `js/burnguide.js` | `js/maneuver.js` | Auto-remove maneuver node when burn completes |
| `js/orbit.js` | `js/burnguide.js` | `trueAnomalyAtTime()` and `stateFromOrbitalElements()` to compute time-to-node and burn direction in world space |

## Dependency Graph
```
Task 1 (needs: js/maneuver.js from Phase 4, js/orbit.js, js/ship.js)
  -> creates: js/burnguide.js, ship.js modifications

Task 2 (needs: Task 1)
  -> creates: index.html additions, css/style.css additions, js/main.js wiring
```

## Execution Sequences
| Sequence | Tasks | Parallel |
|----------|-------|----------|
| 1 | Task 1 | No |
| 2 | Task 2 | No |

## Tasks

### Task 1: Create burn guidance module and ship burn tracking
**Type:** auto
**Sequence:** 1

<files>
js/burnguide.js
js/ship.js
</files>

<action>
Create `js/burnguide.js` as the burn guidance state machine. It should export functions (not a class) following the codebase pattern of stateless exported functions with module-level state where needed.

**Core state:** Track the active maneuver node reference, burn phase (`'coast'`, `'align'`, `'burn'`, `'done'`), and delta-v remaining.

**`updateBurnGuide(ship, maneuverNodes, time, dt)`** — called each frame:
- If no maneuver nodes exist, clear state and return null (no guidance).
- Take the first maneuver node. Compute time-to-burn using the node's true anomaly position on the orbit vs ship's current true anomaly, using orbital period and mean motion from `orbit.js`. The node stores the orbital position where the burn should happen.
- Phase transitions: `'coast'` while time-to-burn > 10s, `'align'` when < 10s (player should orient), `'burn'` when time-to-burn <= 0 or ship is thrusting near the node position.
- During `'burn'` phase, track delta-v expended by the ship (compare velocity magnitude change each frame while thrusting). Decrement `dvRemaining` accordingly.
- When `dvRemaining` <= 0, transition to `'done'`, remove the maneuver node from the array, and reset state.
- Return a guidance object: `{ phase, timeToBurn, dvRemaining, dvTotal, burnDirection: {x, y}, alignmentAngle }`.

**`drawBurnGuide(ctx, camera, ship, guidance, system)`** — render a heading marker on the canvas:
- Compute the burn direction vector in world space from the maneuver node's prograde/normal/radial components resolved at the node position.
- Draw an arrow/chevron indicator at the edge of a circle around the ship pointing in the burn direction. Use cyan (`#4fc3f7`) for aligned, yellow for misaligned (angle > 10 degrees).
- Draw a small alignment arc showing how close the ship's heading is to the burn direction.

**Ship modifications in `js/ship.js`:**
- Add an `activeManeuver` property (initially `null`) to the constructor.
- No other ship changes needed; delta-v tracking lives in `burnguide.js` by comparing velocity each frame.
</action>

<verify>
1. File exists: `js/burnguide.js` exports `updateBurnGuide` and `drawBurnGuide` functions
2. File exists: `js/ship.js` has `activeManeuver` property in constructor
3. `updateBurnGuide` returns null when no maneuver nodes exist
4. `updateBurnGuide` returns a guidance object with `{ phase, timeToBurn, dvRemaining, dvTotal, burnDirection, alignmentAngle }` when a maneuver node exists
5. `drawBurnGuide` draws heading indicator on canvas context without errors when passed valid guidance object
6. When `dvRemaining` reaches 0, the maneuver node is removed from the provided array
</verify>

<done>
`burnguide.js` implements the full coast/align/burn/done state machine. Ship has `activeManeuver` property. The module computes time-to-burn countdown, tracks delta-v consumption, renders a heading marker, and auto-removes completed maneuver nodes.
</done>

### Task 2: Wire burn guidance into HUD, HTML, CSS, and game loop
**Type:** auto
**Sequence:** 2

<files>
index.html
css/style.css
js/main.js
</files>

<action>
**HTML (`index.html`):** Add a `#burn-guide` div inside `#ui-overlay`, positioned below the orbit HUD on the left side. Structure:
```
<div id="burn-guide" class="hidden">
  <div class="burn-guide-header">BURN GUIDANCE</div>
  <div class="burn-guide-row"><span class="burn-guide-label">T-BURN</span><span id="burn-countdown">--:--</span></div>
  <div class="burn-guide-row"><span class="burn-guide-label">dV REM</span><span id="burn-dv-remaining">0</span><span class="burn-guide-unit">m/s</span></div>
  <div class="burn-guide-row"><span class="burn-guide-label">STATUS</span><span id="burn-status">IDLE</span></div>
</div>
```

**CSS (`css/style.css`):** Style `#burn-guide` to match the existing orbit HUD aesthetic:
- Same background (`rgba(0, 5, 15, 0.85)`), border (`rgba(79, 195, 247, 0.3)`), border-radius, backdrop-filter
- Position absolute, bottom left, above the orbit HUD (use a bottom offset that clears `#orbit-hud`)
- `.burn-guide-header` in small caps, dim color, letter-spacing
- Monospace font for values matching `#orbit-hud` style
- Status text color changes: cyan for `'coast'`, yellow for `'align'`, green pulsing for `'burn'`, dim for `'done'`
- Add a `.burn-active` class that adds a subtle glow border when burn phase is active

**`js/main.js` wiring:**
- Import `updateBurnGuide` and `drawBurnGuide` from `./burnguide.js`
- Add DOM references for `burn-guide`, `burn-countdown`, `burn-dv-remaining`, `burn-status`
- In `update()`: call `updateBurnGuide(ship, maneuverNodes, time, dt)` where `maneuverNodes` comes from the maneuver module (Phase 4). Store the returned guidance object.
- Update the burn guide DOM elements: format `timeToBurn` as `MM:SS` or seconds with decimal when < 10s. Show `dvRemaining` rounded to 1 decimal. Set status text to phase name uppercased. Show/hide `#burn-guide` based on whether guidance is non-null.
- In `render()`: if guidance is non-null, call `drawBurnGuide(ctx, camera, ship, guidance, system)` to render the heading marker on canvas.
- Hide `#burn-guide` initially (add to the `hud.style.display = 'none'` block at startup).
- When the game starts, show burn-guide element alongside other HUD elements (but it will self-hide via `.hidden` class when no maneuver exists).

Note: Phase 4 must have created a `maneuverNodes` array (or equivalent) accessible from `main.js`. If the maneuver module exports a getter like `getManeuverNodes()`, use that. The burn guide needs read/write access to remove completed nodes.
</action>

<verify>
1. File exists: `index.html` contains `#burn-guide` element with `#burn-countdown`, `#burn-dv-remaining`, `#burn-status` children
2. File exists: `css/style.css` contains `#burn-guide` styles matching orbit HUD aesthetic
3. `js/main.js` imports `updateBurnGuide` and `drawBurnGuide` from `./burnguide.js`
4. `js/main.js` calls `updateBurnGuide()` in the `update()` function and `drawBurnGuide()` in `render()`
5. `#burn-guide` is hidden when no maneuver node exists and visible when one does
6. Domain complete: Open browser, verify no JS errors on load. With no maneuver node, burn guide HUD is hidden. When a maneuver node is placed (Phase 4 prerequisite), the burn guide appears showing countdown, heading marker renders on canvas pointing in burn direction, delta-v decrements during thrust, and node auto-removes when burn completes.
</verify>

<done>
Burn guidance HUD is fully wired: countdown timer formats time-to-burn, delta-v remaining updates during thrust, status indicator shows current phase, heading marker renders on canvas. The burn guide panel appears/disappears based on maneuver node existence. Completed burns auto-remove nodes. The flight-mode experience connects seamlessly to map-mode planning.
</done>

## Verification Checklist
- [x] `js/burnguide.js` exists with `updateBurnGuide()` and `drawBurnGuide()` exports
- [x] `js/ship.js` constructor includes `this.activeManeuver = null`
<!-- Task 1 Completed: 2026-04-01 -->
- [ ] `index.html` has `#burn-guide` panel with countdown, dv-remaining, and status elements
- [ ] `css/style.css` styles `#burn-guide` consistently with existing orbit HUD
- [ ] `js/main.js` imports and calls burn guide functions in update and render loops
- [ ] No maneuver node: burn guide HUD hidden, no heading marker drawn
- [ ] With maneuver node: countdown visible, heading marker points in burn direction
- [ ] During burn: delta-v remaining decreases as ship thrusts
- [ ] Burn complete: maneuver node removed, burn guide hides
- [ ] No console errors on page load or during gameplay

## Success Criteria
The plan-to-execution loop is closed: a player can place a maneuver node in map mode, return to flight mode, see a countdown to the burn, orient the ship using the heading marker, execute the burn while watching delta-v deplete, and have the node auto-clear upon completion. The resulting trajectory closely matches the planned one from map mode.
