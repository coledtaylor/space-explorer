# Feature Plan: Map Mode Toggle and Camera System

## Objective
Implement a map/flight mode toggle (M key) with smooth camera zoom transitions. Map mode zooms out to show the full star system centered on the ship's current SOI body. The ship is visible as a highlighted marker. All flight-mode functionality remains unchanged.

**Purpose:** This is the foundation for all map-mode features (orbit rendering, maneuver nodes, trajectory prediction). Without a working camera system and mode toggle, none of the later phases can function.

**Output:** `js/mapmode.js` (new module), modifications to `js/main.js` and `js/renderer.js`

## Must-Haves (Goal-Backward)

### Observable Truths
1. Pressing M toggles between flight mode and map mode
2. The transition between modes is a smooth zoom animation (not a snap)
3. In map mode, the camera centers on the current SOI body (star, planet, or moon)
4. Map mode is zoomed out far enough to show all planets and their orbit paths
5. The ship is visible in map mode as a highlighted marker at its world position
6. All celestial bodies, orbit rings, and name labels render correctly at the map zoom level
7. Pressing M again smoothly zooms back to flight mode following the ship
8. Ship controls (thrust, rotation) and physics continue working during map mode (simulation does not pause)

### Required Artifacts
| Path | Provides | Key Exports |
|------|----------|-------------|
| `js/mapmode.js` | Map mode state, zoom interpolation, target camera computation | `MapMode` class or state object with `toggle()`, `update(dt, ...)`, `getCamera()`, `getZoom()` |
| `js/main.js` | Wiring: consume M key toggle, use map camera/zoom in render, pass zoom to renderer | Modified `update()` and `render()` functions |
| `js/renderer.js` | Zoom-aware rendering: scale body positions, sizes, and orbit paths by zoom factor; ship marker in map mode | Modified `drawBody()`, `drawOrbitPath()`, new ship marker drawing |

### Key Links
| From | To | Via |
|------|-----|-----|
| `input.js` `map` toggle | `mapmode.js` toggle | `main.js` reads `input.map` and calls `mapMode.toggle()` on change |
| `mapmode.js` camera/zoom | `main.js` render | `main.js` uses map mode's camera/zoom when active, flight camera when not |
| `main.js` zoom factor | `renderer.js` drawing | Zoom applied as canvas scale transform before all drawing, or passed to draw functions |
| `mapmode.js` SOI body center | camera target | Map camera centers on `ship.currentSOIBody` world position (accounting for parent chain) |

## Dependency Graph
```
Task 1 (needs nothing) -> creates: js/mapmode.js
Task 2 (needs Task 1)  -> modifies: js/main.js, js/renderer.js, index.html, css/style.css
```

## Execution Sequences
| Sequence | Tasks | Parallel |
|----------|-------|----------|
| 1 | Task 1 | Solo |
| 2 | Task 2 | Solo |

## Tasks

### Task 1: Create map mode state module
**Type:** auto
**Sequence:** 1
Completed: 2026-04-01

<files>
js/mapmode.js
</files>

<action>
Create `js/mapmode.js` as a new ES module that manages the map/flight mode state and smooth camera transitions.

The module should export a `MapMode` class (following the pattern of `Ship`, `Input`, `Starfield`) with:

- **State:** `active` (boolean), `zoom` (current zoom level, 1.0 = flight mode), `targetZoom` (what zoom is animating toward), `cameraX`/`cameraY` (map mode camera center), `transitioning` (boolean, true during animation)
- **`toggle()`:** Flips `active` and sets `targetZoom` accordingly. Flight mode target zoom = 1.0. Map mode target zoom should be computed to fit the outermost planet orbit on screen.
- **`update(dt, ship, system, canvas, flightCamera)`:** Each frame, lerp `zoom` toward `targetZoom` with a smooth factor (~0.04-0.06 per frame feels good). When in map mode, compute the camera center as the world position of `ship.currentSOIBody` (for the star it is 0,0; for a planet, use the planet's current x,y; for a moon, use the moon's current x,y). Lerp the camera position smoothly toward that center. Compute the target zoom based on the outermost body's orbit radius vs canvas size so everything fits.
- **`getCamera()`:** Returns `{ x, y }` — the interpolated camera position. During flight mode this should smoothly return toward the flight camera position.
- **`getZoom()`:** Returns the current interpolated zoom level (1.0 = normal flight, <1.0 = zoomed out).
- **`isActive()`:** Returns whether map mode is fully or partially active (true during transitions too).

Key design decisions:
- Use `lerp` from `utils.js` for smooth interpolation
- The zoom value represents a scale factor applied to the canvas (0.1 = zoomed out 10x)
- Target zoom in map mode: compute from `maxOrbitRadius` of the system. Something like `Math.min(canvas.width, canvas.height) / (maxOrbitRadius * 2.5)` gives a good fit with margin.
- When transitioning back to flight mode, the camera should smoothly converge back to the flight camera position (the `flightCamera` parameter).
</action>

<verify>
1. File exists: `js/mapmode.js` with `MapMode` class exported
2. Class has all required methods: `toggle()`, `update()`, `getCamera()`, `getZoom()`, `isActive()`
3. Module imports from `./utils.js` using correct relative path with `.js` extension
4. No console.log calls, no default exports, 2-space indentation, single quotes
</verify>

<done>
`MapMode` class exists with state management, smooth zoom interpolation, and camera centering logic. Ready to be wired into `main.js`.
</done>

### Task 2: Wire map mode into game loop and renderer
**Type:** auto
**Sequence:** 2
Completed: 2026-04-01

<files>
js/main.js
js/renderer.js
index.html
css/style.css
</files>

<action>
Wire the `MapMode` module into the game loop and make the renderer zoom-aware. This is the integration task that makes map mode actually work.

**In `js/main.js`:**
1. Import `MapMode` from `./mapmode.js`
2. Instantiate `const mapMode = new MapMode()` alongside the other module-level objects
3. In `update()`: detect when `input.map` changes (track previous state with a `let prevMapState = false` variable). When it transitions from false to true or true to false, call `mapMode.toggle()`. Then call `mapMode.update(dt, ship, system, canvas, camera)` every frame.
4. In `update()`: when map mode is active, skip the ship-aiming logic (don't rotate toward mouse) so the ship doesn't spin in map view. Ship physics (gravity, thrust) should still run.
5. In `render()`: apply the zoom. Before drawing, compute the effective camera and zoom from `mapMode`. Use `ctx.save()`, `ctx.translate(canvas.width/2, canvas.height/2)`, `ctx.scale(zoom, zoom)`, `ctx.translate(-camera.x, -camera.y)` to set up a zoom transform. Then draw all bodies and the ship in world coordinates (no manual screen-space conversion needed — the transform handles it). After drawing, `ctx.restore()`. This replaces the current per-body screen-space offset approach during rendering, but only when zoom != 1.0. Alternatively, pass the zoom factor to draw functions and multiply positions/sizes — choose whichever approach requires fewer changes to `renderer.js`.
6. When map mode is active, draw a highlighted ship marker (a bright circle or pulsing ring around the ship position) so the ship is easy to spot at the zoomed-out scale. This can be drawn directly in `main.js` after calling `ship.draw()`.
7. Add a "MAP" indicator to the HUD when map mode is active. Add a small `<span id="map-indicator">` to `index.html` inside `#hud` and toggle its visibility.

**In `js/renderer.js`:**
- If using the canvas transform approach: `drawBody()` currently computes screen-space coordinates (`sx = body.x - camera.x + canvas.width/2`). When a zoom transform is active, the drawing should use world coordinates directly since the transform handles the camera offset. The cleanest approach is to accept an optional `zoom` parameter (default 1.0) and adjust the off-screen culling margin by `1/zoom` so bodies don't pop in/out at low zoom levels.
- `drawOrbitPath()` similarly needs zoom-awareness for culling/visibility. At map zoom levels the entire orbit should always be visible.
- Body name labels and other text should scale inversely with zoom so they remain readable (use `ctx.save()`, scale font size by `1/zoom`, draw, `ctx.restore()`).

**In `index.html`:**
- Add `<span id="map-indicator" class="hidden">MAP</span>` inside `#hud-left`
- Update the controls hint: change "M -- Minimap" to "M -- Map View"

**In `css/style.css`:**
- Style `#map-indicator` with a distinct color (e.g., `#ff9800` or `#4fc3f7`) and slight glow/emphasis so the player knows they are in map mode.

Important constraints:
- The starfield background should NOT zoom (it is a parallax background, not a world-space element). Draw it before applying the zoom transform.
- The minimap should still render normally in both modes.
- The HUD (DOM overlay) is not affected by canvas transforms.
- All existing flight-mode behavior must continue working exactly as before when map mode is off and zoom is 1.0.
</action>

<verify>
1. Files modified: `js/main.js` imports and instantiates `MapMode`, `js/renderer.js` handles zoom, `index.html` has map indicator, `css/style.css` has indicator styles
2. Serve the game locally (`npx serve .` or `python -m http.server`) and open in browser
3. Press M: camera smoothly zooms out, centering on the SOI body, showing all planets and orbits
4. Ship is visible as a highlighted marker at its position in map mode
5. All celestial bodies, orbit paths, and name labels are visible and correctly positioned at map zoom
6. Press M again: camera smoothly zooms back to flight mode following the ship
7. In flight mode after returning from map: ship controls work exactly as before (thrust, rotation, scan, etc.)
8. Rapid M toggling does not break the animation or cause visual glitches
9. MAP indicator appears in HUD when map mode is active, disappears when returning to flight
</verify>

<done>
Map mode is fully functional: M key toggles between flight and map view with smooth zoom transitions. Map view shows the full system centered on the SOI body. Ship is highlighted. All flight-mode functionality is preserved.
</done>

## Verification Checklist
- [x] `js/mapmode.js` exists with `MapMode` class exported (named export, no default)
- [x] M key toggles map mode on and off
- [x] Zoom transition is smooth (animated over ~0.5-1 second), not a snap
- [x] Map mode camera centers on the current SOI body
- [x] All planets and their orbits are visible in map mode
- [x] Ship is visible as a highlighted marker in map mode
- [x] Body names/labels are readable at map zoom level
- [x] Returning to flight mode smoothly zooms back and camera follows ship
- [x] Ship physics continue running in map mode (bodies orbit, ship moves)
- [x] Flight controls (thrust, aim, scan, interact) work normally after returning from map mode
- [x] MAP indicator visible in HUD during map mode
- [ ] No console errors in browser dev tools

## Success Criteria
Player can press M to enter a smoothly-animated zoomed-out map view showing the full star system, see their ship as a highlighted marker, and press M again to smoothly return to flight mode with all controls working as before.
