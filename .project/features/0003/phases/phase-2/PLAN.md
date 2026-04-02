# Feature Plan: Orbit Rendering as Conic Sections

## Objective
Upgrade orbit visualization so that all body orbits (planets around star, moons around planets) and the ship's orbit are rendered as properly scaled conic sections in both flight mode and map mode. Orbits must scale correctly with the map-mode zoom level and include periapsis/apoapsis markers.

**Purpose:** Players need to see the full orbital picture -- where every body is going and where the ship's trajectory leads -- to make informed flight decisions. This is the visual foundation for trajectory prediction and maneuver planning in later phases.

**Output:** Modified `js/renderer.js` with zoom-aware orbit rendering for all bodies and the ship, plus wiring in `js/main.js` to call body orbit drawing.

## Must-Haves (Goal-Backward)

### Observable Truths
1. All planet orbits around the star are visible as ellipses in map mode
2. All moon orbits around their parent planets are visible as ellipses in map mode
3. The ship's orbit renders as a full conic section (ellipse or hyperbola) in both flight and map modes
4. Orbits scale correctly when zooming in/out in map mode (no fixed-pixel sizes)
5. Periapsis and apoapsis diamond markers are visible on body orbits and on the ship's orbit
6. Orbit rendering is performant with no visible jitter or lag at any zoom level

### Required Artifacts
| Path | Provides | Key Exports |
|------|----------|-------------|
| `js/renderer.js` | Zoom-aware `drawOrbitPath()`, new `drawBodyOrbits()` | `drawBodyOrbits` (new export), updated `drawOrbitPath` signature |
| `js/main.js` | Wiring to call body orbit rendering in the render loop | No new exports |

### Key Links
| From | To | Via |
|------|-----|-----|
| `main.js` render() | `drawBodyOrbits()` | Import and call with system.bodies, camera, zoom |
| `drawBodyOrbits()` | body.orbitalElements | Each planet/moon has `orbitalElements: { a, e, omega }` and `parentBody` reference |
| `drawOrbitPath()` | zoom parameter | New `zoom` parameter scales all world-to-screen transforms |
| Phase 1 map mode | Phase 2 orbit rendering | Phase 1 provides `zoom` value; Phase 2 consumes it in draw calls |

## Dependency Graph
Task 1 (needs: existing drawOrbitPath, body.orbitalElements) -> creates: zoom-aware drawOrbitPath, drawBodyOrbits in renderer.js
Task 2 (needs: Task 1 exports) -> creates: wiring in main.js render loop

## Execution Sequences
| Sequence | Tasks | Parallel |
|----------|-------|----------|
| 1 | Task 1 | Yes |
| 2 | Task 2 | No (depends on Task 1) |

## Tasks

### Task 1: Add zoom-aware orbit rendering and body orbit drawing to renderer.js
**Type:** auto
**Sequence:** 1
**Status:** Complete
Completed: 2026-04-01

<files>
js/renderer.js
</files>

<action>
Modify `drawOrbitPath()` to accept an optional `zoom` parameter (default 1). All world-to-screen coordinate transforms inside the function must multiply distances by `zoom`. The ellipse semi-axes, focus offset, and hyperbolic radii all scale by zoom. The periapsis/apoapsis diamond markers should also scale (keep marker size in screen pixels, not world units -- around 4-6px). Line dash pattern and line width should remain in screen pixels (not scaled by zoom).

Add a new exported function `drawBodyOrbits(ctx, bodies, camera, zoom)` that iterates all bodies and draws their orbital ellipses:
- For each body with `orbitalElements` and `parentBody`, compute the screen position of the parent body (the orbit focus), then draw the elliptical orbit path using the body's `{ a, e, omega }` from `orbitalElements`. Apply the zoom factor to all distances.
- Planet orbits: draw with a subtle color (e.g., `rgba(100, 140, 180, 0.15)`) and thin line (1px), solid line (no dash).
- Moon orbits: draw with a dimmer color (e.g., `rgba(100, 140, 180, 0.08)`) and thinner line (0.5-1px).
- Draw periapsis markers on each body orbit as small diamonds. Apoapsis markers on body orbits too.
- Skip anomalies (they have no orbital elements).
- Use the same parametric ellipse approach already in `drawOrbitPath()` (center-of-ellipse with focus offset, rotated by omega).

The ship's orbit rendering (`drawOrbitPath`) should use a brighter, dashed style to distinguish it from body orbits -- keep the existing style but ensure it works with zoom.

Performance: use 60-80 line segments per body orbit (fewer than the ship's 100 since body orbits are background elements). Skip drawing orbits whose projected screen size is smaller than ~5 pixels (the entire ellipse would be sub-pixel at current zoom).
</action>

<verify>
1. File exists: `js/renderer.js` exports both `drawOrbitPath` and `drawBodyOrbits`
2. `drawOrbitPath` signature includes a zoom parameter
3. `drawBodyOrbits` iterates bodies, checks for orbitalElements/parentBody, draws ellipses with periapsis/apoapsis markers
4. Zoom factor is applied to all world-to-screen distance calculations (search for `* zoom` in the function bodies)
5. No console.log statements added (follows project convention)
</verify>

<done>
drawOrbitPath accepts zoom and scales all orbit geometry by it. drawBodyOrbits draws planet and moon orbital ellipses with periapsis/apoapsis markers, with appropriate visual distinction between planet orbits, moon orbits, and the ship's orbit.
</done>

### Task 2: Wire body orbit rendering into main.js render loop
**Type:** auto
**Sequence:** 2

<files>
js/main.js
</files>

<action>
Import `drawBodyOrbits` from `./renderer.js`. In the `render()` function, call `drawBodyOrbits(ctx, system.bodies, camera, zoom)` after drawing bodies but before drawing the ship's orbit path. For now, pass `zoom = 1` since Phase 1 (map mode with zoom variable) has not yet landed -- this makes body orbits visible immediately in flight mode and ready to scale once Phase 1 adds the zoom state.

Also update the existing `drawOrbitPath()` call to pass `zoom` (use the same zoom variable, defaulting to 1).

The body orbits should render behind the ship's orbit (draw body orbits first, then ship orbit on top).
</action>

<verify>
1. `js/main.js` imports `drawBodyOrbits` from `./renderer.js`
2. `render()` calls `drawBodyOrbits(ctx, system.bodies, camera, 1)` before `drawOrbitPath()`
3. `drawOrbitPath()` call passes a zoom argument
4. Game loads in browser without errors: serve the game directory and open index.html, verify the canvas renders
5. Planet orbit ellipses are visible around the star in flight mode (faint rings matching orbital radii)
6. Moon orbit ellipses are visible around planets when zoomed in close enough
7. Ship orbit path still renders correctly with periapsis/apoapsis markers
8. No performance degradation (game loop stays at 60fps with a typical 5-7 planet system)
</verify>

<done>
Body orbits render in flight mode as faint ellipses around their parent bodies. Ship orbit renders on top with its existing brighter dashed style. All orbit rendering accepts a zoom parameter ready for Phase 1 integration. The game runs without errors and maintains 60fps.
</done>

## Verification Checklist
- [ ] All planet orbits visible as ellipses centered on the star
- [ ] All moon orbits visible as ellipses centered on their parent planet
- [ ] Ship orbit renders as a dashed conic section (ellipse or hyperbola) with periapsis/apoapsis markers
- [ ] Body orbits have periapsis/apoapsis diamond markers
- [ ] Zoom parameter plumbed through all orbit draw functions (ready for Phase 1 map-mode zoom)
- [ ] Orbit rendering is visually clean -- no jitter, no stray lines, no gaps
- [ ] Performance: 60fps maintained with full system of bodies and orbits
- [ ] No console logging or try/catch added (project conventions)

## Success Criteria
All celestial body orbits and the ship's orbit are rendered as properly scaled conic sections with periapsis/apoapsis markers. The rendering accepts a zoom parameter and scales correctly, ready for Phase 1 map-mode integration. The game maintains 60fps with all orbits visible.
