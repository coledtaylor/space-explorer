# Feature 0004: Landing & Surface Interaction

> Created: 2026-04-01
> Status: Draft
> Epic: 0001

## Overview

Landing and surface interaction transforms Space Explorer from an orbital mechanics simulator into a full exploration game. Players can descend to planetary surfaces, land on them, scan for science data, and launch back into orbit. This completes the core gameplay loop: discover a body, enter its SOI, orbit it, land, interact, and depart.

## Problem Statement

Players can orbit bodies and plan transfers but cannot interact with them beyond scanning from orbit. Landing is the core loop that makes exploration meaningful — discover a body, land on it, scan it, collect data. Without landing, the game is a flight simulator without a destination.

## User Stories

- As a player, I want to land on a planet or moon so that I can explore its surface
- As a player, I want to see altitude and descent rate during approach so that I can control my descent safely
- As a player, I want the camera to zoom in on the body surface as I descend so that landing feels immersive
- As a player, I want to crash if I come in too fast so that landing requires skill
- As a player, I want to scan and collect data from a body's surface so that landing is rewarding
- As a player, I want to launch from the surface back into orbit so that I can continue exploring
- As a player, I want gas giants to reject landing attempts so that body types feel distinct

---

## Codebase Context

### Technology Stack
Vanilla JavaScript ES modules, Canvas 2D rendering, single `requestAnimationFrame` game loop. No build tools, no dependencies. G=1 unit system with game-scale masses and orbital radii.

### Relevant Directories
- `js/` — all game modules (flat structure, one file per concern)
- `css/style.css` — single stylesheet for all UI
- `index.html` — single HTML entry point with `#ui-overlay` for all HUD/panels

### Conventions to Follow
- New feature = new module `js/<name>.js` with named exports, wired into `js/main.js`
- camelCase functions, PascalCase classes, UPPER_SNAKE_CASE constants
- Body data are plain objects with `kind` field discriminator, branched via if/else
- DOM elements use kebab-case IDs, styled in `css/style.css`
- No console.log, no try/catch — use defensive clamping
- Canvas draw functions take `(ctx, ...)` as first param; world-to-screen conversion is inline
- `consume*()` pattern for one-shot input events
- 2-space indentation, single quotes, semicolons always

### Key Integration Points
- **Ship state** (`js/ship.js`): Ship position is SOI-relative. `ship.x`, `ship.y` are relative to `ship.currentSOIBody`. Altitude is already computed as `vec2Mag(pos) - body.radius` in `ship.orbit.altitude`.
- **SOI transitions** (`js/physics.js`): `checkSOITransition()` handles frame-by-frame SOI entry/exit. Landing must disable SOI escape checks while landed.
- **Body properties** (`js/celestial.js`): Bodies have `mass`, `mu`, `radius`, `subtype`. Planet subtypes include `'Gas Giant'` which must block landing. Gravity for surface interaction: `surfaceGravity = mu / (radius * radius)`.
- **Game loop** (`js/main.js`): `update(dt)` runs per-frame logic; `render()` draws everything. New game states (landing, landed) must integrate into this loop.
- **Input** (`js/input.js`): W/S for thrust, mouse for aim. Landing reuses existing thrust controls.
- **Camera** (`js/main.js`): Camera lerps toward ship world position. Landing camera must override this with altitude-based zoom.

---

## Implementation Plan

### Phase 1: Landing Detection and Approach HUD

This phase delivers the ability to detect when a ship is approaching a body surface and display the information needed for a controlled descent. When complete, the player sees a landing HUD activate automatically during close approach, providing the situational awareness needed to attempt a landing.

**What this phase delivers:**
- A new `js/landing.js` module that tracks approach state, computes descent rate, horizontal velocity, and altitude relative to the body surface
- Landing approach mode activates automatically when altitude drops below a threshold and orbital velocity is below escape velocity
- A landing HUD overlay showing altitude, descent rate (vertical velocity component), and horizontal velocity
- Gas giant detection: when approaching a Gas Giant below a crush altitude, the ship is destroyed (or repelled) with feedback
- Surface collision detection: when altitude reaches zero, evaluate landing vs crash based on descent rate and horizontal velocity thresholds

**Success Criteria:**
- When the ship is within approach range of a landable body and below escape velocity, the landing HUD appears showing altitude, descent rate, and horizontal velocity in real-time
- When the ship contacts the surface too fast (descent rate OR horizontal velocity above threshold), a crash occurs with visual/text feedback and the ship respawns in orbit
- When the ship contacts the surface gently (both descent rate AND horizontal velocity below thresholds), it transitions to a landed state and stops moving
- When the ship approaches a Gas Giant below crush altitude, it is destroyed with a distinct "atmospheric crush" message
- Gas giants never allow successful landing regardless of approach speed

### Phase 2: Landing Camera and Surface Rendering

This phase delivers the visual experience of landing — the camera zooms in as altitude decreases, the body fills the screen, and the ship is visible on the surface after touchdown. This transforms landing from a numeric exercise into an immersive lunar-lander experience.

**What this phase delivers:**
- Smooth camera zoom that increases as altitude decreases (body grows to fill screen)
- Surface horizon rendering: when zoomed in close, draw a flat or curved horizon line representing the body surface with subtype-appropriate coloring
- Ship drawn resting on the surface when landed (angle locked to surface normal)
- Crash animation/effect: brief explosion or debris particles on crash, then respawn
- Camera behavior on the surface: static, zoomed in, body surface visible beneath ship

**Success Criteria:**
- As the ship descends, the camera smoothly zooms in so that the body visually grows larger, creating a lunar-lander descent feel
- When landed, the ship is visibly sitting on the body surface with the body filling the lower portion of the screen
- When a crash occurs, there is a visible crash effect (explosion, screen shake, or particle burst) before respawn
- The zoom transition is smooth (no sudden jumps) both during descent and when returning to orbit

### Phase 3: Surface Interaction Panel

This phase delivers the gameplay reward for landing. A surface interaction panel appears alongside the game view, letting the player scan the body, collect samples, and see body-specific information. Science points are tracked as progress currency.

**What this phase delivers:**
- A surface interaction HUD panel (not full-screen overlay) that appears when landed
- Scan button: first scan of a body yields science points; subsequent scans show "already scanned"
- Sample button: collect a surface sample (body-type-specific flavor text)
- Body-type-specific interaction options and descriptions (rocky: mineral scan, ice: core sample, volcanic: thermal reading, ocean: depth probe, lush: bio scan, desert: geological survey)
- Science points counter in the main HUD, persisted across landings within a session
- Scanned-bodies tracking (set of body names or IDs that have been scanned from the surface)

**Success Criteria:**
- After a successful landing, a surface interaction panel appears alongside the game view showing the body name, type, and available actions
- Clicking "Scan" on a body for the first time awards science points and shows discovery text
- Clicking "Scan" on an already-scanned body shows "already scanned" and awards no additional points
- Different body subtypes show distinct interaction options and flavor text (at least rocky, ice, gas giant exclusion, and one other)
- A science points counter is visible in the HUD and accumulates across multiple landings

### Phase 4: Launch from Surface

This phase delivers the ability to leave a body's surface and return to orbit. The player must use manual thrust to lift off, and fuel cost is proportional to the body's surface gravity. This closes the landing loop — land, interact, depart.

**What this phase delivers:**
- Launch sequence: pressing W (thrust) while landed lifts the ship off the surface
- Fuel cost proportional to body surface gravity (heavier bodies cost more fuel to escape)
- Transition from landed state back to orbital flight: ship regains SOI-relative velocity, physics resume, landing HUD reappears during ascent then fades
- Surface interaction panel hides on launch
- SOI transition checks re-enabled after clearing the surface

**Success Criteria:**
- When landed, pressing W lifts the ship off the surface and resumes orbital physics
- Launching from a high-gravity body consumes noticeably more fuel than from a low-gravity moon
- After launch, the player can achieve orbit around the same body using normal thrust controls
- The surface interaction panel disappears when launch begins
- The landing HUD reappears during ascent and disappears once the ship is above approach altitude

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `js/landing.js` | Create | Landing state machine: approach detection, descent tracking, touchdown/crash evaluation, surface gravity, gas giant exclusion |
| `js/surface.js` | Create | Surface interaction logic: scan/sample actions, science points, body-type-specific interactions, scanned-body tracking |
| `js/main.js` | Modify | Wire landing module into game loop, add landed game state, integrate surface panel, add science HUD, handle camera zoom override |
| `js/ship.js` | Modify | Add landed state flag, lock position/velocity when landed, launch thrust logic |
| `js/physics.js` | Modify | Skip SOI escape check when ship is landed or in landing approach |
| `js/renderer.js` | Modify | Add surface horizon rendering, crash effect drawing, landed-ship rendering |
| `js/input.js` | Modify | Add surface interaction button bindings (scan, sample) if needed beyond existing E key |
| `js/celestial.js` | Modify | Add `landable` property to body generation (false for gas giants, true for others) |
| `index.html` | Modify | Add landing HUD markup, surface interaction panel markup, science points display |
| `css/style.css` | Modify | Style landing HUD, surface panel, crash feedback, science counter |

---

## Testing Strategy

### Unit Tests
- No test framework exists. Manual verification only.

### Integration Tests
- Not applicable (no test infrastructure).

### Manual Testing
- Orbit a rocky planet, lower periapsis until approach HUD appears
- Verify descent rate and altitude update in real-time
- Attempt a fast approach — confirm crash feedback and respawn
- Attempt a gentle approach — confirm successful landing and surface panel
- Verify gas giant approach triggers crush/destruction, never lands
- On surface: click Scan, verify science points awarded
- Scan same body again, verify no duplicate points
- Press W to launch, verify liftoff and return to orbit
- Land on different body types, verify distinct interaction text
- Verify camera zoom during descent and ascent
- Verify no physics glitches at landing/launch transitions (no teleporting, no NaN)
- Check 60fps is maintained during landing zoom and surface rendering

---

## Dependencies

### Prerequisites
- Feature 0001 (Physics Engine) — complete: provides gravity, SOI transitions, orbital elements
- Feature 0002 (Celestial System Overhaul) — complete: provides body subtypes, masses, moons
- Feature 0003 (Map & Planning Mode) — complete: provides map mode (landing should be disabled in map mode)

### External Dependencies
- None — vanilla JS, no new packages

### Blocking/Blocked By
- Blocks: Future features that depend on surface data collection (resource gathering, missions, progression)
- Blocked by: Nothing (all prerequisites complete)

---

## Open Questions

- What are the exact threshold values for safe landing? (descent rate max, horizontal velocity max) — likely needs playtesting to tune
- Should the ship be damageable (health system) or is crash = instant death + respawn?
- Where does the ship respawn after a crash? Back in circular orbit around the same body, or around the parent body?
- How many science points per body scan? Flat rate or scaled by body type/rarity?
- Should the surface panel allow refueling at certain body types (e.g., gas giant skimming for fuel)?
- Should landing be possible while time warp is active, or should warp auto-cancel on approach?
