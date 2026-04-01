# Feature Plan: HUD, Orbit Rendering, and Integration

## Objective
Wire all new physics modules (units, orbit, celestial, ship, physics) into the game loop, add an orbital parameter HUD, render the ship's predicted orbit on the canvas, update the renderer for the new body format, and remove all old arcade physics code.

**Purpose:** This is the integration phase that makes the physics engine visible and playable. Without it, phases 1-4 exist as unused modules. This phase turns math into gameplay.
**Output:** Updated `index.html`, `css/style.css`, `js/main.js`, `js/renderer.js` -- the game runs with orbital mechanics end-to-end.

## Must-Haves (Goal-Backward)

### Observable Truths
- Game launches, ship starts in orbit, HUD displays altitude, velocity, Ap, Pe, period, eccentricity, and SOI body name
- HUD values update in real-time as the ship thrusts or coasts
- Ship's predicted orbit is drawn on the canvas as a visible ellipse (or hyperbola for escape trajectories)
- Prograde thrust visibly changes the orbit line shape
- SOI transition changes the HUD "SOI Body" display and orbit line recomputes
- Game runs at 60fps with star + multiple planets
- Controls hint on start screen reflects the new thrust model
- No console errors, no references to old arcade physics (drag, maxSpeed, orbitAngle, orbitSpeed)

### Required Artifacts
| Path | Provides | Key Exports |
|------|----------|-------------|
| `index.html` | Orbital HUD elements in `#hud`, updated controls hint | DOM elements: `#orbit-hud`, `#alt-display`, `#vel-display`, `#ap-display`, `#pe-display`, `#period-display`, `#ecc-display`, `#soi-display` |
| `css/style.css` | Styling for orbital HUD section | `#orbit-hud` styles matching existing HUD aesthetic |
| `js/main.js` | Rewired game loop using new physics modules | No new exports (orchestrator) |
| `js/renderer.js` | Orbit path rendering, updated body rendering | `drawOrbitPath` (new), `drawBody` (updated), `drawMinimap`, `setCameraHack` |

### Key Links
| From | To | Via |
|------|-----|-----|
| `js/main.js` | `js/celestial.js` (new) | `import { generateSystem, updateBodyPositions }` |
| `js/main.js` | `js/ship.js` (new) | `import { Ship }` -- new Ship class with gravity-based update |
| `js/main.js` | `js/physics.js` | `import { checkSOITransition }` or equivalent |
| `js/main.js` | `js/renderer.js` | `import { drawOrbitPath }` for orbit line |
| `js/main.js` | `ship.orbit` | HUD reads orbital elements each frame |
| `js/renderer.js` | `js/orbit.js` | May import `stateFromOrbitalElements` to compute orbit path points |
| `index.html` DOM | `js/main.js` | getElementById for new HUD elements |

## Dependency Graph
```
Task 1 (needs nothing)        -> creates: updated index.html (HUD + controls), updated css/style.css
Task 2 (needs nothing)        -> creates: updated js/renderer.js (drawOrbitPath + new body format)
Task 3 (needs Task 1, Task 2) -> creates: rewired js/main.js (full integration, old code removed)
```

## Execution Sequences
| Sequence | Tasks | Parallel |
|----------|-------|----------|
| 1 | Task 1, Task 2 | Yes |
| 2 | Task 3 | Solo |

## Tasks

### Task 1: Add orbital HUD elements and update controls hint
**Type:** auto
**Sequence:** 1
**Status:** Complete
**Completed:** 2026-04-01

<files>
index.html
css/style.css
</files>

<action>
Add a new orbital HUD section to `index.html`. Place it below the existing `#hud` bar or as a new `#orbit-hud` panel in the bottom-left corner of `#ui-overlay`. Include span elements for: Altitude (`#alt-display`), Velocity (`#vel-display`), Apoapsis (`#ap-display`), Periapsis (`#pe-display`), Period (`#period-display`), Eccentricity (`#ecc-display`), and SOI Body (`#soi-display`). Use kebab-case IDs per convention.

Style `#orbit-hud` in `css/style.css` to match the existing aesthetic: absolute positioning bottom-left (above or beside minimap), semi-transparent dark background with subtle blue border (like `#scan-panel`), monospace font for numeric values (`'Courier New', monospace`), blue glow text-shadow matching `#hud span`. Labels should be dim (`#556677`), values should be brighter (`#4fc3f7`). Keep it compact -- single column, tight line spacing.

Update the `.controls-hint` in `#start-screen` to reflect the new thrust model: W/Up = Prograde thrust, S/Down = Retrograde thrust, A/D or Left/Right = Rotate ship, Mouse = Aim. Remove or update any controls that no longer apply.

Set `#orbit-hud` to `display: none` initially (same pattern as `#hud` and `#minimap` -- shown when game starts).
</action>

<verify>
1. File structure: `index.html` contains `#orbit-hud` with all 7 display elements (alt, vel, ap, pe, period, ecc, soi)
2. File structure: `css/style.css` contains `#orbit-hud` styles with monospace font, blue glow, dark background
3. Visual check: controls hint text mentions prograde/retrograde instead of WASD directional thrust
4. Convention compliance: IDs are kebab-case, CSS uses existing color palette (#4fc3f7, rgba blue borders)
</verify>

<done>
- `index.html` has `#orbit-hud` section with 7 labeled display spans
- `css/style.css` styles `#orbit-hud` matching existing UI aesthetic
- Controls hint updated for orbital thrust model
- Orbit HUD hidden by default (shown when game starts)
</done>

### Task 2: Add orbit path rendering and update renderer for new body format
**Type:** auto
**Sequence:** 1
Completed: 2026-04-01

<files>
js/renderer.js
</files>

<action>
Add a new exported function `drawOrbitPath(ctx, camera, orbitalElements, soiBody)` to `js/renderer.js`. This function draws the ship's predicted orbit on the canvas.

For elliptical orbits (e < 1): Compute the ellipse parameters (semi-major axis `a`, semi-minor axis `b = a * sqrt(1 - e^2)`, center offset from focus). Use Canvas `ctx.ellipse()` or manually compute ~100 points along the ellipse. Rotate by argument of periapsis (`omega`). Center the ellipse on the SOI body's screen position. Draw as a dashed line (`ctx.setLineDash([8, 6])`) in semi-transparent cyan (`rgba(79, 195, 247, 0.3)`). Mark apoapsis and periapsis with small diamond or circle indicators in brighter cyan.

For hyperbolic orbits (e >= 1): Compute ~80 line segments along the hyperbolic branch (true anomaly from -arccos(-1/e)+margin to +arccos(-1/e)-margin). Draw as dashed line segments in semi-transparent orange/red (`rgba(255, 150, 50, 0.3)`) to visually distinguish escape trajectories.

Update `drawPlanet()` to remove the old `orbitRadius`-based orbit ring rendering (lines 50-58 that draw a circle using `body.orbitRadius`). The new celestial bodies from Phase 2 will not have `orbitRadius` -- they have `orbitalElements`. Optionally draw a faint Keplerian orbit ring for each planet using its orbital elements, or simply remove the ring (the orbit path is now the ship's orbit, not the planet's). Either approach is fine -- keep it simple.

Ensure `drawBody` still works if the body object no longer has `orbitRadius` (guard against undefined). The visual properties (`color`, `glowColor`, `radius`, `name`, `kind`, `subtype`) are preserved from Phase 2 so the draw functions should work with minimal changes.

Export `drawOrbitPath` as a named export.
</action>

<verify>
1. File exists: `js/renderer.js` exports `drawOrbitPath`, `drawBody`, `drawMinimap`, `setCameraHack`
2. No crash on missing `orbitRadius`: `drawPlanet` does not reference `body.orbitRadius` unconditionally (guarded or removed)
3. `drawOrbitPath` handles both elliptical (e < 1) and hyperbolic (e >= 1) cases
4. Orbit line uses dashed stroke, semi-transparent color, and apoapsis/periapsis markers for elliptical orbits
</verify>

<done>
- `drawOrbitPath` exported from `js/renderer.js`, handles elliptical and hyperbolic orbits
- Old `orbitRadius`-based orbit ring removed or guarded in `drawPlanet`
- `drawBody` works with new body format (no crash on missing old properties)
- Orbit rendering uses project color palette and dashed lines
</done>

### Task 3: Rewire main.js with new physics modules and remove old code
**Type:** auto
**Sequence:** 2

<files>
js/main.js
</files>

<action>
This is the full integration task. Rewrite `js/main.js` to use the new physics modules from Phases 1-4 while preserving the game's overall structure (start screen, scan panel, minimap, camera follow).

**Imports:** Replace old imports with new module imports. Import `Ship` from the new `./ship.js`, `generateSystem` and `updateBodyPositions` from the new `./celestial.js`, `drawBody`, `drawMinimap`, `setCameraHack`, `drawOrbitPath` from `./renderer.js`, SOI transition logic from `./physics.js`, and any needed helpers from `./orbit.js` and `./units.js`. Keep `Input`, `Starfield`, and `dist` imports.

**State:** The system is now a structured object (`{ star, planets, bodies }`) rather than a flat `bodies[]` array. The ship has a `currentSOIBody`. Add DOM references for the new orbital HUD elements (`#alt-display`, `#vel-display`, `#ap-display`, `#pe-display`, `#period-display`, `#ecc-display`, `#soi-display`).

**Game start:** Show `#orbit-hud` alongside `#hud` and `#minimap` when the game starts. Initialize the ship in a stable orbit around the star (set position and velocity for a circular orbit using `sqrt(mu/r)`).

**Update loop changes:**
- Call `updateBodyPositions(system, dt)` instead of `updateOrbits(bodies, dt)`
- Call `ship.update(dt, input, ship.currentSOIBody)` -- the new Ship.update takes the SOI body
- Call SOI transition check after ship update
- Compute ship world position (SOI-relative position + SOI body position) for camera and rendering
- Update camera to follow ship's world-space position
- Update orbital HUD: read `ship.orbit` and write formatted values to each display element. Format numbers: altitude in km (integer), velocity in km/s (1 decimal), Ap/Pe in km (integer), period in seconds (integer), eccentricity (3 decimals). Show SOI body name.
- Preserve: scan panel logic, click-to-scan, interact, fuel regen near stars
- Update nearest-body logic to use `system.bodies` instead of flat `bodies`

**Render loop changes:**
- Call `drawOrbitPath(ctx, camera, ship.orbit, ship.currentSOIBody)` to render the orbit line
- Pass `system.bodies` (or iterate `sorted`) to `drawBody`
- Pass `system.bodies` to `drawMinimap`

**System transition:** Update the >2000 units boundary check to work with the new coordinate system. When transitioning to a new system, generate a new system, reset the ship into a circular orbit around the new star, and reset the SOI body.

**Remove all old code:** No references to `drag`, `maxSpeed`, `orbitAngle`, `orbitSpeed`. The old `updateOrbits` import is gone. The old `ship.update(dt, input)` two-arg call is replaced with the new three-arg call.
</action>

<verify>
1. File exists: `js/main.js` imports from new modules (ship, celestial, physics, orbit, units, renderer)
2. No old imports: no `updateOrbits` from celestial.js, no two-arg `ship.update(dt, input)` call
3. Game loop: `update()` calls `updateBodyPositions`, `ship.update` with SOI body, SOI check, and HUD update
4. Game loop: `render()` calls `drawOrbitPath` for ship orbit
5. HUD wiring: all 7 orbital HUD elements are updated each frame from `ship.orbit`
6. System start: ship initialized in circular orbit around star with correct velocity
7. Clean break: grep for `orbitAngle`, `orbitSpeed`, `drag`, `maxSpeed` in `js/main.js` returns no matches
8. Functionality: serve the game (`npx serve .` or `python -m http.server`), open in browser -- game launches without console errors, ship orbits, HUD shows values, orbit line visible
</verify>

<done>
- `js/main.js` fully rewired to use new physics modules
- Orbital HUD updates each frame with formatted values
- Orbit path rendered on canvas
- Ship starts in stable orbit
- SOI transitions handled
- No old arcade physics references remain
- Game runs at 60fps without console errors
</done>

## Verification Checklist
- [ ] Game launches without console errors
- [ ] Ship starts in orbit around the star (no thrust needed to maintain orbit)
- [ ] HUD displays: Altitude, Velocity, Ap, Pe, Period, Eccentricity, SOI Body
- [ ] HUD values update in real-time during thrust and coast
- [ ] Orbit line visible as dashed ellipse around SOI body
- [ ] Prograde thrust visibly raises the far side of the orbit line
- [ ] SOI transition changes SOI body name on HUD
- [ ] Hyperbolic trajectories render differently from elliptical
- [ ] Controls hint on start screen says prograde/retrograde
- [ ] 60fps maintained with star + multiple planets
- [ ] No references to old physics: `orbitAngle`, `orbitSpeed`, `drag`, `maxSpeed` absent from main.js
- [ ] `drawPlanet` does not crash on bodies without `orbitRadius`

## Success Criteria
The game is fully playable with orbital mechanics. The ship orbits under gravity, the HUD shows all orbital parameters updating in real-time, the predicted orbit is drawn on the canvas, SOI transitions work end-to-end, and no old arcade physics code remains. The game runs at 60fps with a complete star system.
