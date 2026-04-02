# Feature Plan: FlightScene Core

## Objective
Build the main flight gameplay scene with ship physics, celestial body rendering, camera tracking, HUD, and SOI transition handling.

**Purpose:** Create the primary gameplay loop where players fly their ship through a procedurally generated star system with realistic orbital mechanics.

**Output:** A playable FlightScene with ship controls, celestial bodies, orbit visualization, and system transitions.

## Must-Haves (Goal-Backward)

### Observable Truths
- Player can thrust and rotate the ship using keyboard (WASD/arrows)
- Celestial bodies (star, planets, moons) render with correct visual appearance
- Planets and moons orbit over time (positions update)
- Camera smoothly follows the ship
- HUD displays fuel, velocity, altitude, and current SOI body
- Ship's predicted orbit path renders correctly
- SOI transitions work (entering/exiting planet/moon influence changes reference frame)
- Flying 2000+ units from origin triggers new system generation

### Required Artifacts
| Path | Provides | Key Exports |
|------|----------|-------------|
| `src/scenes/FlightScene.ts` | Main flight gameplay scene | `FlightScene` class |
| `src/objects/Ship.ts` | Ship entity with physics | `Ship` class |
| `src/objects/CelestialBody.ts` | Body rendering with Phaser Graphics | `CelestialBodyRenderer` class |

### Key Links
| From | To | Via |
|------|-----|-----|
| `FlightScene.update()` | `Ship.update()` | dt, input state |
| `FlightScene.update()` | `physics.ts` SOI functions | `checkSOITransition()` |
| `FlightScene.update()` | `celestial.ts` | `updateBodyPositions()` |
| `Ship` | `orbit.ts` | `computeOrbitalElements()` |
| `CelestialBodyRenderer` | Phaser Graphics | `this.scene.add.graphics()` |

## Dependency Graph
```
Task 1 (needs Phase 2 physics modules) -> creates: Ship.ts, CelestialBody.ts
Task 2 (needs Task 1) -> creates: FlightScene.ts with full gameplay loop
```

## Execution Sequences
| Sequence | Tasks | Parallel |
|----------|-------|----------|
| 1 | Task 1 | No |
| 2 | Task 2 | No |

## Tasks

### Task 1: Ship and CelestialBody Entities
**Type:** auto
**Sequence:** 1
**Status:** Complete
**Completed:** 2026-04-02

<files>
src/objects/Ship.ts
src/objects/CelestialBody.ts
</files>

<action>
Create Ship entity class that wraps physics state (position, velocity, angle, fuel) and handles thrust/rotation input. Port the update logic from js/ship.js but use the TypeScript physics modules from Phase 2 (orbit.ts for computeOrbitalElements, utils.ts for vec2Mag). Include thrustActive flag for engine glow rendering.

Create CelestialBodyRenderer class that uses Phaser Graphics to draw celestial bodies. Support star (radial gradient glow), planet (gradient fill with subtype effects), moon (simpler gradient), and anomaly types. Port visual patterns from js/renderer.js drawBody/drawStar/drawPlanet/drawMoon functions, adapting Canvas 2D calls to Phaser Graphics equivalents (fillGradientStyle, fillCircle, etc.).

Both classes should accept typed CelestialBody and ShipState from src/types/index.ts. Ship.draw() and CelestialBodyRenderer.draw() methods take the Phaser scene for graphics access.
</action>

<verify>
1. Files exist: src/objects/Ship.ts exports Ship class, src/objects/CelestialBody.ts exports CelestialBodyRenderer
2. TypeScript compiles: `npm run build` succeeds with no type errors
3. Ship class has: constructor, update(dt, input, soiBody), getSpeed(), getOrbitalState(), draw(scene)
4. CelestialBodyRenderer has: constructor(scene), drawBody(body, camera, time, zoom)
5. No `any` types in either file
</verify>

<done>
Ship entity handles thrust/rotation physics and draws itself with engine glow. CelestialBodyRenderer draws all body types (star, planet, moon, anomaly) using Phaser Graphics with correct gradients and effects.
</done>

### Task 2: FlightScene with Gameplay Loop
**Type:** auto
**Sequence:** 2

<files>
src/scenes/FlightScene.ts
src/main.ts
src/config/game.ts
</files>

<action>
Create FlightScene implementing Phaser.Scene with preload(), create(), update() lifecycle. In create(): initialize Ship in circular orbit around star, generate system using celestial.ts generateSystem(), create Starfield background layer, create CelestialBodyRenderer, set up keyboard input (cursors + WASD), initialize HUD display objects (fuel bar, velocity text, altitude text, SOI body name).

In update(time, delta): get dt from delta, read keyboard state, call ship.update() with input, call updateBodyPositions() for orbital motion, call checkSOITransition() from physics.ts, update camera to lerp toward ship world position, draw starfield background, draw all celestial bodies via CelestialBodyRenderer, draw ship, draw ship's orbit path using propagateTrajectory(), update HUD text values, check system transition boundary (2000 units from origin triggers new seed and regenerateSystem()).

Update main.ts to add FlightScene to the Phaser game config scene list. Update game.ts config if needed to set proper canvas size (full window) and background color.
</action>

<verify>
1. File exists: src/scenes/FlightScene.ts exports FlightScene class
2. `npm run dev` starts with FlightScene visible
3. Ship responds to WASD/arrow input (thrust forward/backward, rotate left/right)
4. Celestial bodies render: star visible at center, planets orbiting, moons orbiting planets
5. Camera follows ship smoothly (not instant snap)
6. HUD shows: fuel gauge decreasing on thrust, velocity updating, altitude from SOI body, current body name
7. Orbit path renders: faint line showing predicted trajectory
8. SOI transition: fly close to a planet, observe HUD SOI body change and reference frame shift
9. System transition: fly 2000+ units from star, observe new system generated (star color/planets change)
</verify>

<done>
FlightScene runs a complete gameplay loop: ship physics with input, celestial body rendering and orbital motion, camera following, HUD display, orbit visualization, SOI transitions, and system boundary transitions.
</done>

## Verification Checklist
- [ ] Ship accelerates when W/Up pressed, decelerates when S/Down pressed
- [ ] Ship rotates when A/Left or D/Right pressed
- [ ] Fuel depletes during thrust and is shown in HUD
- [ ] Star renders with glow effect at system center
- [ ] Planets render with correct colors and orbit around star
- [ ] Moons orbit their parent planets
- [ ] Camera lerps to ship position (smooth follow, not instant)
- [ ] Velocity and altitude update in HUD as ship moves
- [ ] Predicted orbit path visible ahead of ship
- [ ] Entering planet SOI changes the reference frame (ship position resets relative to planet)
- [ ] Exiting SOI back to star works correctly
- [ ] Flying 2000+ units triggers new system generation

## Success Criteria
Ship responds to keyboard input with proper physics (thrust applies force, gravity pulls toward SOI body). Celestial bodies render correctly and orbit over time. Camera follows ship smoothly. HUD displays current flight data. SOI transitions work bidirectionally (star to planet, planet to moon, and reverse). System boundary triggers regeneration. The FlightScene is the foundation for all subsequent scenes (Map, Landing, Surface).
