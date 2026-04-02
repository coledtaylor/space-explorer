# Feature 0001: Physics Engine & Unit System

> Created: 2026-04-01
> Status: Draft
> Epic: 0001 (Milestone 1)

## Overview

Replace the arcade-style physics (thrust + drag + speed cap) with a patched conics orbital mechanics engine. This is a foundational rewrite: ship.js and celestial.js are rebuilt from scratch, a unit system is established, Keplerian orbital math is implemented, sphere of influence transitions are added, and the HUD and renderer are extended to display orbital information. When complete, the game feels like a space sim rather than an arcade game.

## Problem Statement

The current physics model uses drag, speed caps, and uniform circular orbits with arbitrary `orbitSpeed` values. This prevents any realistic orbital behavior: there are no elliptical orbits, no gravity, no meaningful relationship between speed and altitude. Building navigation, docking, or any future spaceflight mechanics requires a real physics foundation first.

## Success Criteria

- Ship orbits a star in a stable elliptical orbit with no thrust applied
- Prograde thrust raises the opposite side of the orbit; retrograde thrust lowers it
- Ship transitions between SOIs when crossing sphere of influence boundaries
- Orbital parameters displayed on HUD match computed Keplerian elements
- Unit system is documented and consistently applied across all modules
- Game runs at 60fps with a single star and orbiting ship
- No references to old arcade physics remain in ship.js or celestial.js

---

## Phase 1: Unit System and Orbital Math Library

**Goal:** Establish the mathematical foundation so that all subsequent phases can compute orbits, convert units, and express physical quantities consistently.

### Tasks

1. **Create unit constants module** -- `js/units.js`
   - Define the game-unit-to-km ratio (e.g., 1 game unit = 1 km, or a scaled ratio suitable for canvas rendering)
   - Export constants: `G` (gravitational constant in game units), `AU` (astronomical unit in game units), `SCALE` (render scale factor)
   - Document the unit system in comments at the top of the file: what 1 game unit means, what mass units are, what time units are
   - Time unit = seconds (real-time dt from requestAnimationFrame)

2. **Create orbital mechanics math module** -- `js/orbit.js`
   - `computeOrbitalElements(pos, vel, mu)` -- from state vector {x, y, vx, vy} and gravitational parameter mu (= GM), compute: semi-major axis (a), eccentricity (e), argument of periapsis (omega), true anomaly (nu), orbital period (T), specific orbital energy (epsilon)
   - `stateFromOrbitalElements(a, e, omega, nu, mu)` -- inverse: from orbital elements, compute position and velocity vectors
   - `computeApoapsisRadius(a, e)` and `computePeriapsisRadius(a, e)` -- simple helpers
   - `trueAnomalyAtTime(t, a, e, mu, nu0)` -- propagate true anomaly forward in time (Kepler's equation solver using Newton-Raphson)
   - `computeSOIRadius(bodyMass, parentMass, orbitalRadius)` -- SOI = orbitalRadius * (bodyMass / parentMass)^(2/5)
   - `gravityAcceleration(shipPos, bodyPos, mu)` -- returns acceleration vector {ax, ay} = -mu/r^3 * r_vec

3. **Extend math utilities** -- `js/utils.js`
   - Add `vec2` helpers if needed: `vec2Add`, `vec2Sub`, `vec2Scale`, `vec2Mag`, `vec2Normalize`, `vec2Dot`
   - Add `mod2pi(angle)` -- normalize angle to [0, 2*PI)

### Verification

- Import `orbit.js` in a throwaway test harness (or browser console) and verify:
  - A circular orbit (v = sqrt(mu/r) perpendicular to radius) produces eccentricity ~0 and semi-major axis ~r
  - An elliptical orbit produces 0 < e < 1 with correct apoapsis/periapsis
  - `stateFromOrbitalElements` round-trips with `computeOrbitalElements` (input state vector -> elements -> state vector matches)
  - `computeSOIRadius` returns a reasonable value (e.g., Earth-like body around Sun-like star)
- Unit constants are documented: reading `js/units.js` tells you exactly what 1 game unit, 1 mass unit, and 1 time unit represent

**Success Criteria:**
- Given a position and velocity around a body, orbital elements are correctly computed (round-trip test passes)
- SOI radius computation produces physically reasonable values
- Unit system is documented in js/units.js with clear mapping from game units to physical units
- All math functions are pure (no side effects, no module state)

---

## Phase 2: Celestial Body Model

**Goal:** Celestial bodies have physical properties (mass, radius, SOI) and move on Keplerian orbits, replacing the old flat `orbitRadius`/`orbitAngle`/`orbitSpeed` model.

### Tasks

1. **Rewrite celestial body generation** -- `js/celestial.js` (clean break)
   - Bodies are plain objects with `kind` field (preserve existing convention)
   - Star properties: `mass`, `radius` (physical, in game units), `mu` (= G * mass), `soiRadius` (effectively infinite for the star -- the system boundary)
   - Planet properties: `mass`, `radius`, `mu`, `soiRadius` (computed via `computeSOIRadius`), `parentBody` (reference to star), `orbitalElements` (a, e, omega, nu0) for rail orbit
   - Retain visual properties: `color`, `glowColor`, `hue`, `name`, `subtype`, `description`, `details` -- reuse existing name lists and generation logic
   - `generateSystem(seed)` returns `{ star, planets[], bodies[] }` (structured, not flat array)
   - Anomalies preserved as before (no physics, just visual markers)

2. **Implement on-rails orbital motion** -- `js/celestial.js`
   - `updateBodyPositions(system, dt)` -- for each planet, propagate true anomaly using Kepler's equation, then compute x/y from orbital elements
   - Planets orbit the star deterministically (no simulation drift)
   - Planet positions are in the star-centered reference frame

3. **Update generateSystem to produce realistic systems** -- `js/celestial.js`
   - Use seeded RNG (preserve determinism)
   - Star mass derived from star type (Red Dwarf ~0.3 solar, Yellow ~1.0, Blue Giant ~10, etc.)
   - Planet orbital radii spaced realistically (not pixel-based 200+i*150, but in game-unit AU-scale distances)
   - Planet masses derived from type (Rocky ~Earth, Gas Giant ~Jupiter, etc.)
   - Eccentricities low (0.0 to 0.15 for most, up to 0.3 for some)

### Verification

- Generate a system and log body properties: star has mass/mu, planets have mass/mu/soiRadius/orbitalElements
- Call `updateBodyPositions` over many frames: planets move smoothly along elliptical paths
- Verify a planet returns to approximately the same position after one orbital period
- SOI radii are reasonable: inner planets have smaller SOI than outer gas giants

**Success Criteria:**
- Every celestial body has mass, radius, mu, and soiRadius properties
- Planets orbit the star on Keplerian rails (position derived from orbital elements, not angle += speed * dt)
- System generation is deterministic given a seed
- No references to old `orbitAngle`/`orbitSpeed` properties remain in celestial.js

---

## Phase 3: Ship Physics Rewrite

**Goal:** The ship moves under gravitational influence of its current SOI body, with no drag, no speed cap -- thrust applies impulse in vacuum.

### Tasks

1. **Rewrite ship state and physics** -- `js/ship.js` (clean break)
   - Ship state: `x`, `y`, `vx`, `vy`, `angle`, `fuel`, `thrustActive`, `currentSOIBody` (reference to the body whose SOI the ship is in)
   - Remove: `drag`, `maxSpeed`, `acceleration` (constant), `trail` (defer trail to Phase 5 or keep simple)
   - `update(dt, input, currentSOIBody)`:
     - Compute gravity from `currentSOIBody`: acceleration = gravityAcceleration(shipPos, bodyPos, mu)
     - Apply gravity: vx += ax * dt, vy += ay * dt
     - If thrusting and fuel > 0: apply impulse along ship's heading (prograde/retrograde based on input)
     - Integrate position: x += vx * dt, y += vy * dt
     - Fuel consumption proportional to thrust duration
   - Ship position is stored in the current SOI body's reference frame (relative to that body)
   - `getOrbitalState(soiBody)` -- returns position and velocity relative to SOI body center (accounting for body's own motion)

2. **Define thrust model** -- `js/ship.js`
   - Thrust direction: along ship heading (angle from input)
   - Thrust magnitude: a constant specific impulse (tunable, e.g., 10 game-units/s^2)
   - Input mapping: W/Up = thrust forward (along heading), S/Down = thrust backward (retrograde). A/D or Left/Right could rotate heading or thrust laterally -- decide and implement
   - No drag. No speed cap. Velocity only changes via gravity or thrust.

3. **Compute ship orbital elements** -- `js/ship.js`
   - After each update, compute orbital elements relative to currentSOIBody using `computeOrbitalElements`
   - Store as `ship.orbit = { a, e, omega, nu, T, apoapsis, periapsis, altitude }`
   - Altitude = distance from SOI body center minus body's physical radius

4. **Preserve ship rendering** -- `js/ship.js`
   - Keep the ship drawing code (triangle shape, engine glow)
   - Adjust engine glow to trigger on thrust (was `this.thrust > 0`, now `this.thrustActive`)
   - Trail rendering can be simplified or temporarily removed (orbit line in Phase 5 replaces it)

### Verification

- Place ship in circular orbit (v = sqrt(mu/r), perpendicular to radius): ship completes orbits with no thrust, maintaining altitude
- Apply prograde thrust: opposite side of orbit rises (apoapsis increases)
- Apply retrograde thrust: opposite side drops (periapsis decreases)
- With no thrust, total orbital energy stays constant across frames (energy conservation test)
- Ship with zero fuel cannot thrust

**Success Criteria:**
- Ship orbits a body in a stable ellipse with no thrust applied (no drift, no energy gain/loss over 100+ orbits)
- Prograde thrust raises the orbit on the opposite side; retrograde lowers it
- There is no drag and no speed cap -- velocity is governed only by gravity and thrust
- Ship's computed orbital elements (apoapsis, periapsis, period) are physically consistent with its trajectory

---

## Phase 4: SOI Transitions and Reference Frames

**Goal:** The ship transitions between gravitational spheres of influence when crossing SOI boundaries, switching its reference frame to the new dominant body.

### Tasks

1. **SOI detection** -- `js/physics.js` (new module) or within `js/main.js`
   - Each frame, check if the ship has exited its current SOI body's sphere (distance from body > soiRadius)
   - Check if the ship has entered a child body's SOI (for each planet, distance from planet < planet.soiRadius)
   - Priority: entering a child SOI takes precedence over exiting parent SOI

2. **Reference frame transition** -- `js/physics.js`
   - When transitioning from star SOI to planet SOI:
     - Convert ship position from star-relative to planet-relative coordinates
     - Convert ship velocity: subtract planet's orbital velocity from ship velocity (so velocity is now relative to planet)
     - Set `ship.currentSOIBody = planet`
   - When transitioning from planet SOI to star SOI:
     - Convert ship position from planet-relative to star-relative coordinates
     - Convert ship velocity: add planet's orbital velocity to ship velocity
     - Set `ship.currentSOIBody = star`
   - Recompute ship orbital elements after transition

3. **Wire SOI logic into game loop** -- `js/main.js`
   - After ship.update(), call SOI check
   - On transition, update ship state and recompute orbit
   - Update HUD to show current SOI body name

4. **Handle coordinate display** -- `js/main.js`
   - Ship world position (for camera, rendering) must be computed from SOI-relative position + body absolute position
   - Camera follows ship's absolute (world-space) position
   - All rendering uses world-space coordinates

### Verification

- Start in star SOI, thrust toward a planet: when crossing the planet's SOI boundary, currentSOIBody switches to the planet
- Ship velocity smoothly continues (no visible jump or teleport at transition)
- Thrust away from the planet: when exiting planet SOI, currentSOIBody switches back to star
- Orbital elements change at transition (they're now relative to the new body)
- Ship can orbit a planet, then escape back to star orbit

**Success Criteria:**
- Ship transitions from star SOI to planet SOI when crossing the planet's SOI boundary
- Ship transitions from planet SOI to star SOI when leaving the planet's SOI boundary
- Position and velocity are continuous across transitions (no visible jump)
- Orbital elements are recomputed relative to the new SOI body after each transition
- Ship can enter a planet's SOI, orbit it, and escape back to the star's SOI

---

## Phase 5: HUD, Orbit Rendering, and Integration

**Goal:** Orbital parameters are displayed on the HUD, the ship's current orbit is rendered as a line on the canvas, and everything is wired together in main.js with old code fully removed.

### Tasks

1. **Orbital parameter HUD** -- `index.html`, `css/style.css`, `js/main.js`
   - Add HUD elements to `index.html` (in `#hud-left` or a new `#hud-orbit` section):
     - Altitude (distance from SOI body surface)
     - Velocity (magnitude of ship velocity relative to SOI body)
     - Apoapsis (Ap)
     - Periapsis (Pe)
     - Orbital period (T)
     - Current SOI body name
     - Eccentricity (e)
   - Style orbital HUD to match existing aesthetic (monospace numbers, blue glow text)
   - Update HUD values each frame from `ship.orbit`

2. **Orbit line rendering** -- `js/renderer.js`
   - `drawOrbitPath(ctx, camera, orbitalElements, soiBody)` -- render the ship's current orbit as a dashed ellipse (or hyperbola if e >= 1)
   - For elliptical orbits (e < 1): draw an ellipse using Canvas path with correct semi-major/semi-minor axes, rotated by argument of periapsis, centered on SOI body
   - For hyperbolic orbits (e >= 1): draw the hyperbolic branch as a series of line segments
   - Color: semi-transparent blue/cyan, matching the existing UI palette
   - Mark apoapsis and periapsis with small indicators

3. **Wire everything into main.js** -- `js/main.js`
   - Replace `import { Ship }` with new ship module
   - Replace `import { generateSystem, updateOrbits }` with new celestial module
   - Import `units.js`, `orbit.js`, `physics.js` as needed
   - Update `update(dt)`:
     - Call `updateBodyPositions(system, dt)` instead of `updateOrbits(bodies, dt)`
     - Call `ship.update(dt, input, currentSOIBody)`
     - Call SOI transition check
     - Update orbital HUD
   - Update `render()`:
     - Call `drawOrbitPath` for ship's current orbit
     - Pass new body format to `drawBody` (may need minor adapter if body shape changed)
   - Update system transition logic (>2000 units from origin) to work with new coordinate system
   - Remove all old arcade physics references

4. **Update renderer for new body format** -- `js/renderer.js`
   - Ensure `drawBody` works with the new celestial body objects (should be minimal since visual properties are preserved)
   - Remove old `orbitRadius`-based orbit ring rendering in `drawPlanet` (replace with Keplerian orbit ring)
   - Add `drawOrbitPath` export

5. **Update controls hint** -- `index.html`
   - Update controls hint on start screen to reflect new thrust model (prograde/retrograde instead of WASD directional)

6. **Remove all old code** -- verify clean break
   - No `drag`, `maxSpeed`, `acceleration` in ship.js
   - No `orbitAngle`, `orbitSpeed`, `orbitRadius` in celestial.js
   - No arcade HUD references (old speed/fuel displays updated or replaced)

### Verification

- Launch the game: ship starts in orbit around the star, HUD shows orbital parameters
- HUD values update in real-time as the ship thrusts
- Orbit line is visible on canvas, matching the ship's actual trajectory
- Prograde thrust visibly changes the orbit line shape (raises far side)
- SOI transition changes the HUD "SOI Body" display
- Game runs at 60fps with star + multiple planets
- Old start screen controls hint reflects new input scheme
- No console errors, no references to old physics

**Success Criteria:**
- HUD displays altitude, velocity, Ap, Pe, period, eccentricity, and SOI body name
- Ship's predicted orbit is rendered as a visible ellipse/hyperbola on the canvas
- All modules are wired together: physics, celestial, ship, renderer, HUD
- Game runs at 60fps with a complete star system (star + 3-7 planets)
- No references to old arcade physics remain anywhere in the codebase
- Controls hint on start screen accurately describes the new input model

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `js/units.js` | Create | Unit system constants, scale factors, documented unit mapping |
| `js/orbit.js` | Create | Orbital mechanics: elements from state vectors, Kepler solver, SOI radius |
| `js/physics.js` | Create | SOI detection, reference frame transitions |
| `js/celestial.js` | Rewrite | Bodies with mass/mu/SOI, Keplerian on-rails motion, structured system |
| `js/ship.js` | Rewrite | Gravitational physics, impulse thrust, orbital state computation |
| `js/main.js` | Modify | Wire new modules, update game loop, orbital HUD updates, remove old logic |
| `js/renderer.js` | Modify | Add orbit path rendering, update body rendering for new format |
| `js/utils.js` | Modify | Add vec2 math helpers, angle normalization |
| `index.html` | Modify | Add orbital HUD elements, update controls hint |
| `css/style.css` | Modify | Style orbital HUD elements |

## Dependencies

### Prerequisites
- None. This is the foundational feature; everything else builds on it.

### External Dependencies
- None. Vanilla JS, no libraries.

### Blocking/Blocked By
- **Blocks:** All future epic features (navigation/maneuver planning, time warp, encounter planning, planetary landing, etc.)
- **Blocked by:** Nothing

## Technical Notes

### Patched Conics Model
The ship is always under influence of exactly one body. No N-body simulation. This is the same model used by Kerbal Space Program and is well-suited for a 2D game: tractable math, predictable orbits, and clear SOI boundaries.

### Kepler's Equation
Solving M = E - e*sin(E) (mean anomaly to eccentric anomaly) requires an iterative solver. Newton-Raphson converges in 3-5 iterations for typical eccentricities. For hyperbolic orbits, use the hyperbolic form: M = e*sinh(H) - H.

### 2D Simplification
In 2D, orbital elements simplify significantly:
- No inclination (i = 0)
- No longitude of ascending node (RAAN = 0)
- Argument of periapsis (omega) is just the angle from the x-axis to periapsis
- This reduces the 6 classical orbital elements to 4: a, e, omega, nu

### Coordinate Systems
- **World space:** Absolute coordinates for rendering. Star is at origin of its system.
- **SOI-relative space:** Ship position/velocity relative to its current SOI body. Used for physics and orbital element computation.
- **Screen space:** World space transformed by camera offset. Used for canvas rendering.

### Performance Considerations
- Kepler equation solving per frame is cheap (3-5 iterations of Newton-Raphson)
- Planet position updates are O(n) where n = planet count (< 10)
- Orbit path rendering: pre-compute ~100 points on the ellipse, redraw only when orbital elements change significantly
- 60fps target is easily achievable with this math load

### Numerical Stability
- Use a fixed maximum dt (already clamped to 0.05s in game loop)
- For very eccentric orbits (e > 0.95), Kepler solver may need more iterations or a different initial guess
- Energy conservation should be monitored: if |deltaE/E| > 1e-6 per orbit, the integrator timestep is too large

### Reference Material
- "Orbital Mechanics for Engineering Students" by Curtis (patched conics, Kepler's equation)
- KSP wiki on patched conics and SOI transitions
- Vis-viva equation: v^2 = mu * (2/r - 1/a) -- useful for sanity checks
