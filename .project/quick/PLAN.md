# Quick Plan: Fix Planet Visibility and Gravity Stability

## Context

Celestial bodies use a log-scale visual radius (4-21px) that becomes sub-pixel when the camera zooms out to 0.05. Orbit lines are drawn with alpha 0.25 and width 0.5 — invisible when zoomed out. Gravity in `physics.ts` has no minimum distance clamp, so 1/r^2 spikes cause Euler integration instability (ship stutter) when the ship passes near a body. The camera zoom range spans 0.05 to 1.5 (a 30x range).

## Tasks

### Task 1: Scale celestial body visuals inversely with camera zoom [x]

<files>
src/objects/CelestialBody.ts
src/scenes/FlightScene.ts
</files>

<action>
Add a method to CelestialBody that redraws its circle at a zoom-compensated size: `updateVisualScale(cameraZoom: number)`. The draw radius should be `visualRadius / cameraZoom`, clamped to a reasonable minimum (e.g. 3px screen-space). Clear and redraw the Graphics each frame with the new radius. In FlightScene.update, after updating celestial body positions, pass `this.cameras.main.zoom` to each body's new method. This ensures bodies remain a consistent screen-space size regardless of zoom level.
</action>

<verify>
Run `npm run build` to confirm no TypeScript errors. Manually test: zoom all the way out (scroll down) and confirm all planets/moons remain visible as distinct circles. Zoom all the way in and confirm they don't become absurdly large.
</verify>

<done>
- Celestial body circles are visible at ZOOM_MIN (0.05) and ZOOM_MAX (1.5)
- Bodies maintain a minimum screen-space size of at least 3 pixels radius at any zoom
- No TypeScript compilation errors
</done>

Completed: 2026-04-02

### Task 2: Add minimum distance clamp to gravity calculation [x]

<files>
src/lib/physics.ts
</files>

<action>
In `calculateGravity`, add a minimum distance clamp before computing the force magnitude. Define a named constant `MIN_GRAVITY_DISTANCE` (in km) — a reasonable value is the radius of the smallest body (e.g. 60 km for Minmus, so use something like 50-100 km). Clamp `distanceSquared` to `MIN_GRAVITY_DISTANCE * MIN_GRAVITY_DISTANCE` so that gravity magnitude plateaus when the ship is very close to a body instead of spiking toward infinity. This prevents Euler integration instability without affecting behavior at normal orbital distances. Only clamp the magnitude calculation — keep the direction vector using the actual distance so the force direction remains correct.
</action>

<verify>
Run `npm run build` to confirm no TypeScript errors. Run `npx vitest run` to confirm existing physics tests still pass (the clamp should not affect tests that use normal orbital distances).
</verify>

<done>
- `calculateGravity` has a named constant for minimum distance
- Force magnitude is clamped, preventing 1/r^2 spikes at close range
- Direction vector still uses actual positions (not clamped distance)
- No TypeScript compilation errors
- Existing tests still pass
</done>

Completed: 2026-04-02

### Task 3: Increase orbit line visibility and add zoom compensation [x]

<files>
src/lib/orbitLines.ts
src/scenes/FlightScene.ts
</files>

<action>
In `orbitLines.ts`, increase `ORBIT_LINE_ALPHA` to at least 0.5 and `ORBIT_LINE_WIDTH` to at least 1.5 so lines are visible at default zoom. Additionally, either (a) modify `createOrbitLine` to accept a redraw method that FlightScene can call each frame with the current camera zoom to scale the line width inversely (clear + redraw with `lineWidth / cameraZoom`), or (b) export a new `updateOrbitLineZoom` function that takes a Graphics object, config, worldScale, and cameraZoom, clears and redraws with compensated width. In FlightScene.updateOrbitLines, call this zoom compensation so orbit lines maintain consistent screen-space thickness at all zoom levels.
</action>

<verify>
Run `npm run build` to confirm no TypeScript errors. Manually test: zoom all the way out and confirm orbit lines for all planets are clearly visible. Zoom in and confirm lines don't become excessively thick.
</verify>

<done>
- Orbit line alpha is >= 0.5 and base width >= 1.5
- Orbit lines maintain visible screen-space thickness at ZOOM_MIN (0.05)
- Orbit lines don't become excessively thick at ZOOM_MAX (1.5)
- No TypeScript compilation errors
</done>

Completed: 2026-04-02
