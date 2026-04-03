# Feature Plan: Celestial Bodies and On-Rails Orbits in the Scene

## Objective
Wire Phase 1 pure math (orbit positions, solar system config) into Phaser rendering: create a CelestialBody game object that draws colored wire-outline circles, render orbit-line paths, and update the FlightScene loop to position all bodies each frame using on-rails orbital math.

**Purpose:** Give the player a visible, animated solar system -- the star at world origin, planets circling it, moons circling their parent planets -- proving the orbital math works in-game before adding gravity and camera zoom in Phase 3.

**Output:** `src/objects/CelestialBody.ts` (new), `src/scenes/FlightScene.ts` (modified with celestial body creation and orbit rendering)

## Must-Haves (Goal-Backward)

### Observable Truths
1. The star renders as a colored wire-outline circle at world origin (0, 0)
2. Each planet renders as a colored wire-outline circle orbiting the star along a circular path
3. Each moon renders as a colored wire-outline circle orbiting its parent planet (not the star)
4. Moon world positions are correct: parent world position + moon's own orbital offset
5. Each orbiting body has a visible orbit-line circle showing its full orbital path around its parent
6. Bodies move visibly each frame -- orbital motion is apparent within a few seconds

### Required Artifacts
| Path | Provides | Key Exports |
|------|----------|-------------|
| `src/objects/CelestialBody.ts` | Phaser Graphics game object that draws a wire-outline circle and updates its world position from orbit math each frame | `CelestialBody` class |
| `src/scenes/FlightScene.ts` | Scene that creates all celestial bodies from solar system config, draws orbit-line rings, and calls position updates each frame | `FlightScene` class (modified) |

### Phase 1 Dependencies (must exist before this phase runs)
| Path | Provides | Used For |
|------|----------|----------|
| `src/types/index.ts` | `CelestialBodyConfig`, `SolarSystemConfig`, `Vec2` | Typing body configs and positions |
| `src/lib/orbit.ts` | `getOrbitalPosition()`, `getWorldPosition()` | Computing each body's position from time |
| `src/lib/solarSystem.ts` | Solar system config constant (star, planets, moons) | Iterating body hierarchy to create game objects |

### Key Links
| From | To | Via |
|------|-----|-----|
| `CelestialBody.update()` | `getOrbitalPosition()` | Calls orbit math with current game time to get local-space position |
| `CelestialBody` (moon) | parent `CelestialBody` | Reads parent's world position to compute own world position via `getWorldPosition()` |
| `FlightScene.create()` | `solarSystem` config | Iterates config to instantiate `CelestialBody` objects and draw orbit lines |
| `FlightScene.update()` | `CelestialBody.update()` | Calls update on each body every frame, passing elapsed time |

## Dependency Graph
```
Task 1 (needs: Phase 1 artifacts) -> creates: src/objects/CelestialBody.ts
Task 2 (needs: Task 1)            -> modifies: src/scenes/FlightScene.ts
```

## Execution Sequences
| Sequence | Tasks | Parallel |
|----------|-------|----------|
| 1 | Task 1: CelestialBody game object | No |
| 2 | Task 2: FlightScene integration with orbit lines | No |

## Tasks

### Task 1: CelestialBody game object
**Type:** auto
**Sequence:** 1
Completed: 2026-04-02

<files>
src/objects/CelestialBody.ts
</files>

<action>
Create a CelestialBody class extending Phaser.GameObjects.Graphics. It receives a CelestialBodyConfig (from src/types/index.ts) and an optional parent CelestialBody reference.

On construction, draw a wire-outline circle (strokeCircle) using the body's configured color and visual radius. The star has no parent and sits at (0, 0).

Provide an updatePosition method that accepts elapsed game time (ms). For bodies with orbital parameters, call getOrbitalPosition() from src/lib/orbit.ts to get the local orbital offset, then add the parent's world position (if any) to produce final world coordinates. Set this.x and this.y accordingly. The star is stationary and skips orbit computation.

Expose a worldPosition getter (returns Vec2 with current x, y) so child bodies can read their parent's position.

Follow existing patterns from Ship.ts: Graphics-based rendering, named constants for styling (line width, alpha), explicit types on all public methods.
</action>

<verify>
1. File exists: src/objects/CelestialBody.ts with named export `CelestialBody`
2. Class extends Phaser.GameObjects.Graphics
3. Constructor draws a wire-outline circle using strokeCircle with configured color and radius
4. updatePosition method computes position from getOrbitalPosition and parent offset
5. worldPosition getter returns { x, y } Vec2
6. No magic numbers -- line width, colors come from config or named constants
7. File is under 200 lines
8. TypeScript compiles: npx tsc --noEmit passes without errors in this file
</verify>

<done>
CelestialBody class exists, draws a colored wire-outline circle, updates its position from orbital math each frame, correctly chains parent offsets for moons, and exposes worldPosition for child bodies to read.
</done>

### Task 2: FlightScene integration with orbit lines
**Type:** auto
**Sequence:** 2
Completed: 2026-04-02

<files>
src/scenes/FlightScene.ts
</files>

<action>
Modify FlightScene to create and animate all celestial bodies from the solar system config.

In create(): import the solar system config from src/lib/solarSystem.ts. Iterate the body hierarchy (star, then planets, then moons) and instantiate a CelestialBody for each, passing the parent reference for orbiting bodies. Store all bodies in an array for the update loop. For each orbiting body, draw a static orbit-line circle (a separate Graphics object or a dedicated drawing pass) showing the full orbital path around its parent -- use a dim/transparent stroke so it reads as a guide, not a solid object.

In update(): pass elapsed game time to each CelestialBody's updatePosition method so bodies move along their orbits each frame. Keep existing ship logic (WASD, thrust, speed HUD) intact.

Ensure moons' orbit lines are drawn relative to their parent planet's position. Since planets move, moon orbit lines should update position each frame to follow the parent (either re-draw or move the orbit-line Graphics object to match parent world position).

The ship should remain functional -- do not break existing WASD input, thrust, or speed HUD.
</action>

<verify>
1. File exists: src/scenes/FlightScene.ts imports from solarSystem, orbit, and CelestialBody
2. TypeScript compiles: npx tsc --noEmit passes without errors
3. Build succeeds: npm run build completes without errors
4. Visual verification (run npm run dev and open browser):
   - Star visible at center of screen as a colored circle
   - Planets visible orbiting the star, moving along circular paths
   - Moons visible orbiting their parent planet (not the star)
   - Each orbiting body has a visible orbit-line ring showing its path
   - Ship still responds to WASD input and speed HUD still displays
5. File is under 200 lines; if exceeded, extraction into helpers is done
</verify>

<done>
FlightScene creates all celestial bodies from config, draws orbit-line rings for each orbiting body, updates all body positions each frame so orbits animate in real time, moons orbit their parent planets correctly, and existing ship controls and HUD remain functional.
</done>

## Verification Checklist
- [x] `npx tsc --noEmit` passes with no errors
- [x] `npm run build` succeeds
- [x] Star renders at world origin as a colored wire-outline circle
- [x] Planets orbit the star visibly -- motion is apparent within a few seconds
- [x] Moons orbit their parent planet, not the star directly
- [x] Each orbiting body has a visible orbit-line circle showing its full path
- [x] Existing ship WASD controls and speed HUD still work
- [x] No file exceeds 200 lines
- [x] No magic numbers -- all styling/config values are named constants

## Success Criteria
The game loads and displays an animated solar system: a star at center, planets orbiting it along visible orbit-line paths, and moons orbiting their parent planets. All motion is computed from on-rails orbital math (getOrbitalPosition). The ship and HUD remain functional. TypeScript compiles cleanly and all files follow project conventions.
