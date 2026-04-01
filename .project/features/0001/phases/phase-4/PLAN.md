# Feature Plan: SOI Transitions and Reference Frames

## Objective
Create the sphere of influence detection and reference frame transition system so the ship can move between star and planet gravitational domains with continuous position and velocity.

**Purpose:** Without SOI transitions, the ship is permanently bound to one gravitational body. This phase enables the core patched conics experience: approaching a planet pulls the ship into its gravity well, and escaping returns the ship to the star's domain.

**Output:** `js/physics.js` (new module) with SOI detection and frame transitions, plus wiring into the game loop and coordinate display in `js/main.js`.

## Must-Haves (Goal-Backward)

### Observable Truths
- Ship transitions from star SOI to planet SOI when crossing the planet's SOI boundary
- Ship transitions from planet SOI to star SOI when leaving the planet's SOI boundary
- Position and velocity are continuous across transitions (no visible jump or teleport)
- Orbital elements are recomputed relative to the new SOI body after transition
- Ship can enter a planet's SOI, orbit it, and escape back to the star's SOI
- HUD displays the name of the current SOI body
- Camera follows the ship's absolute world position seamlessly through transitions

### Required Artifacts
| Path | Provides | Key Exports |
|------|----------|-------------|
| `js/physics.js` | SOI detection and reference frame transitions | `checkSOITransition`, `shipWorldPosition`, `planetVelocity` |
| `js/main.js` | Game loop integration, HUD wiring, coordinate display | (modified, no new exports) |

### Key Links
| From | To | Via |
|------|-----|-----|
| `physics.js` checkSOITransition | `ship.js` state (x, y, vx, vy, currentSOIBody) | Mutates ship state on transition |
| `physics.js` checkSOITransition | `orbit.js` computeOrbitalElements | Recomputes orbital elements after frame change |
| `physics.js` shipWorldPosition | `main.js` camera/render | Converts SOI-relative position to world-space for rendering |
| `physics.js` planetVelocity | `orbit.js` stateFromOrbitalElements | Derives planet velocity from its orbital elements for frame conversion |
| `main.js` update loop | `physics.js` checkSOITransition | Called each frame after ship.update() |

## Dependency Graph
Task 1 (needs: js/orbit.js, js/units.js, js/celestial.js, js/ship.js from phases 1-3) -> creates: js/physics.js
Task 2 (needs: Task 1) -> modifies: js/main.js

## Execution Sequences
| Sequence | Tasks | Parallel |
|----------|-------|----------|
| 1 | Task 1 | No |
| 2 | Task 2 | No |

## Tasks

### Task 1: Create SOI detection and reference frame transition module
**Type:** auto
**Sequence:** 1
**Status:** Complete
Completed: 2026-04-01

<files>
js/physics.js
</files>

<action>
Create `js/physics.js` as a new module exporting three functions:

1. `checkSOITransition(ship, system)` -- Given the ship and the system object (from Phase 2's `generateSystem`), detect whether the ship has crossed an SOI boundary and perform the frame transition if so:
   - If ship is in the star's SOI: check each planet's SOI. If ship distance from any planet (in star-relative coords) is less than that planet's `soiRadius`, transition into that planet's SOI. Enter-child takes priority.
   - If ship is in a planet's SOI: check if ship distance from the planet exceeds the planet's `soiRadius`. If so, transition back to the star's SOI.
   - On star-to-planet transition: convert ship position to planet-relative by subtracting planet position, convert velocity by subtracting planet's orbital velocity, set `ship.currentSOIBody` to the planet.
   - On planet-to-star transition: convert ship position to star-relative by adding planet position, convert velocity by adding planet's orbital velocity, set `ship.currentSOIBody` to the star.
   - After any transition, recompute ship orbital elements using `computeOrbitalElements` from `js/orbit.js`.
   - Return an object indicating whether a transition occurred and the old/new body (or null if no transition).

2. `shipWorldPosition(ship, system)` -- Compute the ship's absolute world-space position from its SOI-relative position. If ship is in the star's SOI, world position = ship position (star is at origin). If in a planet's SOI, world position = ship position + planet's absolute position.

3. `planetOrbitalVelocity(planet, system)` -- Compute a planet's velocity vector from its orbital elements using `stateFromOrbitalElements` from `js/orbit.js`. This is needed for the velocity frame conversion during transitions.

Follow project conventions: named exports, camelCase, no console logging, brief `//` section comments, 2-space indent, single quotes, semicolons.
</action>

<verify>
1. File exists: `js/physics.js` with three named exports (`checkSOITransition`, `shipWorldPosition`, `planetOrbitalVelocity`)
2. Imports reference `js/orbit.js` functions (computeOrbitalElements, stateFromOrbitalElements) and any needed utils
3. `checkSOITransition` handles both directions: star->planet and planet->star, with enter-child priority
4. Position conversion is mathematically correct: star-to-planet subtracts planet pos, planet-to-star adds planet pos
5. Velocity conversion is mathematically correct: star-to-planet subtracts planet velocity, planet-to-star adds planet velocity
6. No console.log, no try/catch, no default exports -- matches project conventions
</verify>

<done>
`js/physics.js` exists with SOI detection for both transition directions, reference frame conversion (position and velocity), orbital element recomputation after transition, and world-position computation. All functions are pure or clearly documented in their mutation pattern.
</done>

### Task 2: Wire SOI transitions into game loop and coordinate display
**Type:** auto
**Sequence:** 2
**Status:** Complete
Completed: 2026-04-01

<files>
js/main.js
</files>

<action>
Modify `js/main.js` to integrate SOI transitions and fix coordinate display for the reference frame system:

1. Import `checkSOITransition`, `shipWorldPosition` from `js/physics.js`.

2. In `update(dt)`, after `ship.update()` and `updateBodyPositions()`:
   - Call `checkSOITransition(ship, system)` to detect and perform any SOI transition.
   - Compute the ship's world position using `shipWorldPosition(ship, system)`.
   - Use the world position for camera tracking (camera lerps toward world position, not SOI-relative position).

3. Update coordinate display:
   - `coordsDisplay` should show the ship's world-space coordinates (so the display is continuous across transitions).
   - `locationDisplay` should show "SOI: [body name]" indicating which body's SOI the ship is currently in.

4. Update the nearest-body detection and fuel-regen logic to use world-space positions for distance calculations (since the ship's x/y are now SOI-relative, you need to compare world positions or convert appropriately).

5. Update `render()`:
   - Ship drawing must use world-space position for the screen transform (worldPos - camera + canvas/2).
   - Pass world position to `ship.draw()` or compute screen coordinates from world position before drawing.

6. Update system transition logic:
   - The "travel far enough" check (currently dist > 2000 from origin) should use the ship's distance from the star in star-relative coordinates, not raw ship.x/y (which may be planet-relative).

Keep changes minimal and focused. Do not rewrite unrelated sections. Follow existing code patterns for camera lerp, HUD updates, and render flow.
</action>

<verify>
1. `js/main.js` imports `checkSOITransition` and `shipWorldPosition` from `js/physics.js`
2. `checkSOITransition` is called each frame in `update(dt)` after ship physics
3. Camera follows world-space position (continuous through SOI transitions, no jump)
4. HUD shows current SOI body name
5. Coordinates display shows world-space values
6. Ship renders at correct world-space screen position even when in a planet's SOI
7. System transition check uses star-relative distance, not raw ship position
8. Domain complete: ship can approach a planet, cross its SOI boundary (transition occurs), orbit the planet, then escape back to star SOI -- all with continuous position, velocity, and camera tracking
</verify>

<done>
Game loop calls SOI transition check each frame. Camera, rendering, and HUD all use world-space coordinates derived from `shipWorldPosition`. SOI body name is displayed on HUD. System transition uses star-relative distance. Ship position and velocity are continuous across SOI boundary crossings.
</done>

## Verification Checklist
- [ ] `js/physics.js` exists with `checkSOITransition`, `shipWorldPosition`, `planetOrbitalVelocity` exports
- [ ] SOI transition fires when ship crosses planet SOI boundary inward (star -> planet)
- [ ] SOI transition fires when ship crosses planet SOI boundary outward (planet -> star)
- [ ] Ship position is continuous across transition (no visible teleport)
- [ ] Ship velocity is continuous across transition (no sudden speed change)
- [ ] Orbital elements are recomputed after transition (different values relative to new body)
- [ ] Camera follows ship smoothly through transitions
- [ ] HUD displays current SOI body name
- [ ] Ship can orbit a planet and then escape back to star SOI
- [ ] System transition (seed increment) still works correctly with reference frame system

## Success Criteria
The ship seamlessly transitions between star and planet SOIs when crossing SOI boundaries. Position and velocity are continuous (no jump). Orbital elements are recomputed relative to the new dominant body. The camera, HUD, and renderer all correctly handle the reference frame change. The player can enter a planet's SOI, orbit it, and escape -- the fundamental patched conics experience works.
