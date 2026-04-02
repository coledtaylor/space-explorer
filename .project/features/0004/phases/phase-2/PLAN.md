# Feature Plan: Landing Camera and Surface Rendering

## Objective
Deliver the visual experience of planetary landing -- camera zoom-in during descent, surface horizon rendering, ship resting on surface, and crash effects. This transforms landing from a numeric state-machine exercise (Phase 1) into an immersive lunar-lander experience.

**Purpose:** Without visual feedback, landing is invisible. The player needs to SEE the body grow, the horizon fill the screen, and the ship touch down. Crash must feel impactful.
**Output:** Modified `js/renderer.js`, `js/ship.js`, `js/main.js` with altitude-driven camera zoom, surface horizon drawing, landed ship rendering, and crash visual effects.

## Must-Haves (Goal-Backward)

### Observable Truths
1. As altitude decreases, the camera smoothly zooms in -- the body visually grows larger on screen
2. When landed, the body fills the lower portion of the screen and the ship visibly sits on its surface
3. When a crash occurs, there is a visible effect (explosion particles + screen shake) before respawn
4. Zoom transitions are smooth (no sudden jumps) during both descent and return to orbit
5. Normal flight at high altitude is unaffected -- zoom is 1.0 when not in approach range

### Required Artifacts
| Path | Provides | Key Exports |
|------|----------|-------------|
| `js/renderer.js` (modify) | Surface horizon drawing, crash effect rendering | `drawSurfaceHorizon()`, `drawCrashEffect()` |
| `js/main.js` (modify) | Altitude-driven camera zoom logic, crash effect state management, zoom integration into render pipeline | N/A (orchestrator) |
| `js/ship.js` (modify) | Landed ship drawing (angle locked to surface normal, resting on surface) | Modified `draw()` method |

### Key Links
| From | To | Via |
|------|-----|-----|
| `main.js` update loop | Camera zoom | `ship.orbit.altitude` from Phase 1 landing state drives zoom factor |
| `main.js` render | `drawSurfaceHorizon()` | Called when zoom > threshold, passes body color/subtype |
| `main.js` render | `drawCrashEffect()` | Called when crash state active (from Phase 1 landing state machine) |
| `ship.draw()` | Surface normal lock | When `ship.landed === true`, angle = atan2 to body center + PI |
| Zoom factor | All draw calls | Existing `zoom` parameter already flows through `drawBody()`, `ship.draw()` |

## Dependency Graph
```
Phase 1 (landing state machine, ship.landed flag, crash detection) -- MUST EXIST FIRST

Task 1 (needs: Phase 1 landing state) -> creates: altitude-driven zoom in main.js, surface horizon in renderer.js
Task 2 (needs: Task 1 zoom working) -> creates: landed ship rendering, crash effects, screen shake
```

## Execution Sequences
| Sequence | Tasks | Parallel |
|----------|-------|----------|
| 1 | Task 1: Camera Zoom + Surface Horizon | No |
| 2 | Task 2: Landed Rendering + Crash Effects | No |

## Tasks

### Task 1: Altitude-Driven Camera Zoom and Surface Horizon
**Type:** auto
**Sequence:** 1

<files>
js/main.js
js/renderer.js
</files>

<action>
Add altitude-driven camera zoom to main.js that smoothly increases zoom as the ship descends toward a body surface. The zoom should:
- Activate when the ship is in landing approach (use Phase 1's landing state or altitude threshold, e.g., altitude < body.radius * 3)
- Scale from 1.0 at approach entry to a max zoom (e.g., 8-15x) at surface contact, using a smooth curve (not linear -- exponential or inverse-altitude feels better)
- Lerp the zoom value each frame to prevent sudden jumps (same lerp pattern as MapMode in js/mapmode.js)
- Override the existing zoom variable that already flows through all draw calls
- NOT activate when in map mode
- Smoothly return to 1.0 when ascending back above approach altitude

In renderer.js, add a `drawSurfaceHorizon()` function that:
- Draws a curved or flat horizon line representing the body surface when zoom is high enough (e.g., zoom > 3)
- Uses the body's color/hue and subtype to tint the surface (rocky = grey-brown, ice = white-blue, volcanic = dark red, ocean = deep blue, lush = green, desert = tan)
- Fills the area below the horizon with a gradient from surface color to dark
- The horizon position is derived from the body's screen position and scaled radius -- when the body is large on screen, the top arc of the circle becomes the visible horizon
- Export this function for use in main.js render

Camera position when zoomed in should track the ship more tightly (reduce or eliminate the lerp lag so the ship stays centered during descent).
</action>

<verify>
1. File modified: js/main.js contains a landing zoom calculation that references ship altitude and lerps a zoom factor
2. File modified: js/renderer.js exports drawSurfaceHorizon function
3. Manual test: orbit a planet and lower periapsis -- as altitude decreases, the body should visually grow larger on screen with smooth zoom
4. Manual test: at high zoom (close to surface), a colored horizon fills the lower screen area
5. Manual test: ascending back to high altitude smoothly returns zoom to 1.0 with no sudden jumps
6. Manual test: map mode is not affected by landing zoom (map mode has its own zoom)
</verify>

<done>
Camera zoom smoothly increases as ship altitude decreases, body grows to fill screen during descent. Surface horizon with subtype-appropriate coloring renders at close range. Zoom returns smoothly to 1.0 on ascent. Map mode unaffected.
</done>

### Task 2: Landed Ship Rendering and Crash Effects
**Type:** auto
**Sequence:** 2

<files>
js/ship.js
js/main.js
js/renderer.js
</files>

<action>
Modify ship.js draw() method to handle the landed state:
- When `this.landed` is true (set by Phase 1), lock the ship's visual angle to the surface normal (angle = Math.atan2(ship.y, ship.x) pointing away from body center, since ship position is SOI-relative with body at origin)
- Draw the ship sitting ON the surface -- position it so the bottom of the ship triangle touches the body edge, not overlapping or floating

Add crash visual effects to renderer.js:
- `drawCrashEffect()` function that renders a brief explosion: orange/yellow particle burst expanding outward, fading over ~1 second
- Include screen shake: offset the camera by random small amounts (decreasing over time) during the crash effect duration
- The crash effect state (active, timer, position) should be managed in main.js and triggered when Phase 1 sets crash state

Wire crash effects in main.js:
- When the landing state machine reports a crash, start the crash effect timer at the crash world position
- During the crash effect, apply screen shake to the camera offset before rendering
- After the effect duration (~1 second), allow Phase 1's respawn logic to proceed
- Clear the crash effect state on respawn

Ensure the landed camera is static and stable -- no jitter, no lerp oscillation. The ship should look firmly planted on the surface with the body filling the lower screen.
</action>

<verify>
1. File modified: js/ship.js draw() handles landed state with surface-normal angle lock
2. File modified: js/renderer.js exports drawCrashEffect function with particle/explosion rendering
3. File modified: js/main.js contains crash effect state management (timer, position, screen shake)
4. Manual test: when ship lands successfully (Phase 1), it visually rests on the body surface with correct orientation
5. Manual test: when ship crashes (Phase 1), explosion particles appear and screen shakes briefly before respawn
6. Manual test: landed camera is stable -- no wobble or drift while sitting on surface
7. Domain complete: descent shows smooth zoom-in, landing shows ship on surface with body filling lower screen, crash shows visible effect, return to orbit shows smooth zoom-out
</verify>

<done>
Ship renders correctly on surface when landed (angle locked to surface normal, positioned at body edge). Crash produces visible explosion particles and screen shake. Camera is stable when landed. All zoom transitions (descent, landed, crash-respawn, ascent) are smooth.
</done>

## Verification Checklist
- [ ] Approaching a body causes smooth camera zoom-in (body grows on screen)
- [ ] At very low altitude, surface horizon with body-appropriate color fills lower screen
- [ ] Landed ship sits on surface with correct orientation (nose pointing away from body)
- [ ] Crash triggers visible explosion particles and screen shake
- [ ] Ascending from surface smoothly zooms back out to 1.0
- [ ] Map mode zoom is completely independent of landing zoom
- [ ] No sudden zoom jumps at any transition (approach entry, landing, launch, crash)
- [ ] 60fps maintained during zoom and surface rendering

## Success Criteria
The player visually experiences landing as a lunar-lander descent: the body grows to fill the screen, the ship touches down on a colored surface horizon, crashes produce dramatic feedback, and all transitions are buttery smooth. The visual system is ready for Phase 3 (surface interaction panel) and Phase 4 (launch sequence).
