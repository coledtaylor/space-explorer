# Feature 0001: Solar System with On-Rails Orbits, Gravity, and Camera Zoom

> Created: 2026-04-02
> Status: Draft

## Overview

Add a solar system to the game: a star, planets, and moons that orbit on-rails (position computed from time), exert gravity on the player's ship, and are navigable via a zoomable camera. Establish a test framework for all physics and math.

## Problem Statement

The game currently has a ship flying on a black screen with no world content. The ship is screen-clamped with no physics environment. Players need a solar system to explore, gravity to interact with, and a camera that can zoom from ship-detail to full-system view. The codebase also lacks any testing infrastructure.

## User Stories

- As a player, I want to see planets orbiting a star so that I have a world to explore
- As a player, I want gravity pulling my ship toward nearby bodies so that navigation feels physical
- As a player, I want to zoom the camera out to see the whole solar system and zoom in to see my ship up close
- As a player, I want to see orbit lines so I can understand each body's path
- As a developer, I want unit tests for all physics/math functions so I can refactor with confidence

---

## Codebase Context

### Technology Stack
- TypeScript 5.x, Phaser 4.0.0-rc.7, Vite 5.x
- No test framework yet (Vitest to be added)
- Browser-only, ES modules, strict TypeScript

### Relevant Directories
- `src/lib/` -- pure function modules for physics, orbit math, gravity (to be created)
- `src/types/` -- shared type definitions (to be created)
- `src/objects/` -- Ship.ts (to be modified), CelestialBody class (to be created)
- `src/scenes/FlightScene.ts` -- main scene (heavy modification)
- `src/main.ts` -- entry point (minor modification if needed)

### Conventions to Follow
- PascalCase files for classes, camelCase for lib modules
- UPPER_SNAKE_CASE for constants in config files
- Named exports only, no defaults
- `import type` for type-only imports
- Pure functions in `src/lib/` must NOT import Phaser
- Delta-time passed explicitly, never from global state
- Files under 200 lines; decompose if exceeded

---

## Implementation Plan

### Phase 1: Foundation -- Types, Constants, Physics Math, and Test Framework

This phase establishes the pure-function foundation: type definitions for celestial bodies and the solar system, configuration constants for the solar system layout, gravity and orbital position math, and the Vitest test harness to prove it all works. No Phaser rendering -- just math and tests.

**Success Criteria:**
- Running `npx vitest run` executes a test suite that passes, covering gravity calculation and orbital position computation
- Given a body mass and distance, `calculateGravity()` returns the correct GM/r^2 acceleration vector
- Given an orbital radius, period, and current time, `getOrbitalPosition()` returns the correct (x, y) world-space coordinates
- A solar system config file defines a star, 2-3 planets, and 1-2 moons with named constants (no magic numbers) at KSP-inspired scale
- Type definitions exist for celestial body data (mass, radius, orbital parameters, color) and solar system structure

### Phase 2: Celestial Bodies and On-Rails Orbits in the Scene

This phase wires the Phase 1 math into Phaser: a CelestialBody game object that draws wire-outline circles, orbit-line rendering, and the FlightScene update loop that positions all bodies each frame using the on-rails math. The star sits at world origin; planets and moons orbit around their parents.

**Success Criteria:**
- When the game loads, the star is visible at the center and planets orbit around it in real time, moving along circular paths
- Each celestial body renders as a colored wire-outline circle at its configured visual radius
- Each orbiting body has a visible orbit-line circle showing its full orbital path
- Moons orbit their parent planet (not the star directly), and their world position is correct (parent offset + own orbit)

### Phase 3: Gravity, World-Space Ship, and Camera Zoom

This phase makes the world interactive: the ship moves freely in world space (screen clamping removed), all celestial bodies exert gravitational pull on the ship each frame, and the camera follows the ship with mouse-wheel zoom from ship-detail to full-system view. The speed HUD continues to work.

**Success Criteria:**
- The ship moves freely in world space with no screen-edge clamping; flying away from the star is possible indefinitely
- The ship accelerates toward nearby massive bodies when not thrusting (gravity is visibly pulling the ship)
- Mouse wheel zooms the camera smoothly between a close-up view (ship detail visible) and a far-out view (entire solar system visible)
- The camera tracks the ship at all zoom levels; the ship remains centered on screen
- The speed HUD remains visible and accurate at all zoom levels (fixed to screen, not world)

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/types/index.ts` | Create | Shared type definitions: CelestialBodyConfig, SolarSystemConfig, Vec2 |
| `src/lib/physics.ts` | Create | Pure functions: calculateGravity, sumGravitationalForces |
| `src/lib/orbit.ts` | Create | Pure functions: getOrbitalPosition, getWorldPosition (recursive parent chain) |
| `src/lib/solarSystem.ts` | Create | Solar system configuration constants (star, planets, moons) |
| `src/objects/CelestialBody.ts` | Create | Phaser Graphics object: draws wire-outline circle, updates position from orbit math |
| `src/objects/Ship.ts` | Modify | Remove screen clamping, add applyForce() for gravity, expose position for camera |
| `src/scenes/FlightScene.ts` | Modify | Create celestial bodies, apply gravity each frame, setup camera follow + zoom, draw orbit lines |
| `vitest.config.ts` | Create | Vitest configuration |
| `src/lib/__tests__/physics.test.ts` | Create | Unit tests for gravity calculations |
| `src/lib/__tests__/orbit.test.ts` | Create | Unit tests for orbital position math |

---

## Testing Strategy

### Unit Tests (Phase 1)
- `calculateGravity()` returns correct magnitude and direction for known mass/distance pairs
- `calculateGravity()` handles edge cases (zero distance protection, very large distances)
- `getOrbitalPosition()` returns correct position at t=0, t=period/4, t=period/2, t=period (full cycle)
- `getOrbitalPosition()` handles zero orbital radius (stationary body, e.g., the star)
- `getWorldPosition()` correctly chains parent offsets for moons

### Integration Tests (Phase 2-3)
- Solar system config produces valid body hierarchy (every parent ID references a real body)
- Sum of gravitational forces from multiple bodies produces correct combined vector

### Manual Testing
- Visual: planets visibly orbit the star at different speeds
- Visual: moons orbit their parent planet, not the star
- Visual: zooming out reveals the full solar system; zooming in shows ship detail
- Gameplay: ship drifts toward the star when stationary near it
- Gameplay: speed HUD updates correctly while under gravitational acceleration

---

## Dependencies

### Prerequisites
- Current Ship.ts and FlightScene.ts as starting points (both exist)

### External Dependencies
- `vitest` -- test runner (new dev dependency)
- No other new packages required

### Blocking/Blocked By
- Blocks: future features (map screen, landing, trajectory prediction, time warp)
- Blocked by: nothing -- this is the foundational feature

---

## Open Questions

- Exact planet/moon count: requirement says "2-3 planets + 1-2 moons" -- start with 3 planets and 1 moon, expand if it feels sparse?
- Scale tuning: KSP-inspired distances and masses will need playtesting to feel right with the current thrust acceleration. May need to adjust THRUST_ACCELERATION constant.
- Orbit speed: should orbits be visible to the naked eye (fast) or realistic-feeling (slow)? Suggest fast enough to see motion within a few seconds.
