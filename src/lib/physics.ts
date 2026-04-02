import type {
  Vec2,
  StarSystem,
  PlanetBody,
  MoonBody,
  MassiveBody,
  ShipState,
  SOITransitionResult,
} from '../types/index.js';
import { vec2Mag } from './utils.js';
import { computeOrbitalElements, stateFromOrbitalElements } from './orbit.js';

// Compute the orbital velocity vector of a planet in the star-relative inertial frame
export function planetOrbitalVelocity(planet: PlanetBody, system: StarSystem): Vec2 {
  const mu = system.star.mu;
  const { a, e, omega } = planet.orbitalElements;

  // Derive current true anomaly from planet's current position relative to star
  const nu = Math.atan2(planet.y, planet.x) - omega;

  // Get state at current true anomaly
  const { vel } = stateFromOrbitalElements(a, e, omega, nu, mu);
  return { x: vel.x, y: vel.y };
}

// Compute the orbital velocity vector of a moon relative to its parent planet
export function moonOrbitalVelocity(moon: MoonBody, planet: PlanetBody): Vec2 {
  const mu = planet.mu;
  const { a, e, omega } = moon.orbitalElements;

  // Derive current true anomaly from moon's position relative to parent planet
  const localX = moon.x - planet.x;
  const localY = moon.y - planet.y;
  const nu = Math.atan2(localY, localX) - omega;

  // Get state at current true anomaly
  const { vel } = stateFromOrbitalElements(a, e, omega, nu, mu);
  return { x: vel.x, y: vel.y };
}

// Compute absolute world-space position from ship's SOI-relative position
export function shipWorldPosition(ship: ShipState, system: StarSystem): Vec2 {
  const body = ship.soiBody;

  // Star is at origin — ship position is already world-space
  if (body.kind === 'star') {
    return { x: ship.pos.x, y: ship.pos.y };
  }

  // Moon SOI — ship position is relative to moon; moon.x/y are world-space
  // Planet SOI — ship position is relative to planet, add planet world pos
  // Both cases: add body world position to ship local position
  return { x: ship.pos.x + body.x, y: ship.pos.y + body.y };
}

// Build the updated orbit summary from state relative to a body
function buildOrbitFromState(
  pos: Vec2,
  vel: Vec2,
  body: MassiveBody,
): { a: number; e: number; omega: number; nu0: number; T: number | undefined; apoapsis: number; periapsis: number; altitude: number } {
  const elements = computeOrbitalElements(pos, vel, body.mu);
  return {
    a: elements.a,
    e: elements.e,
    omega: elements.omega,
    nu0: elements.nu0,
    T: elements.T,
    apoapsis: elements.a * (1 + elements.e),
    periapsis: elements.a * (1 - elements.e),
    altitude: vec2Mag(pos) - body.radius,
  };
}

// Detect SOI transitions and return the transition result if one occurs.
// Returns null if no transition occurs.
// The returned SOITransitionResult contains the new SOI body and the ship's
// velocity in the new body's reference frame at the moment of transition.
//
// NOTE: This function does not mutate ship state. The caller is responsible for
// updating ShipState with the new soiBody and converting pos/vel to the new frame.
// The newSoiBody field identifies the target, and relativeVel is the ship's velocity
// in the new frame. For position, the caller must subtract the body's world position.
export function checkSOITransition(
  ship: ShipState,
  system: StarSystem,
): SOITransitionResult | null {
  const current = ship.soiBody;

  if (current.kind === 'star') {
    // Star SOI: check if ship has entered any planet's SOI
    for (const planet of system.planets) {
      const dx = ship.pos.x - planet.x;
      const dy = ship.pos.y - planet.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < planet.soiRadius) {
        // Enter planet SOI: compute ship velocity relative to planet
        const planetVel = planetOrbitalVelocity(planet, system);
        const relativeVel: Vec2 = {
          x: ship.vel.x - planetVel.x,
          y: ship.vel.y - planetVel.y,
        };

        return { newSoiBody: planet, relativeVel };
      }
    }

    return null;

  } else if (current.kind === 'planet') {
    const moons = current.children;

    // Check moon entry before planet escape (moon takes priority at boundary)
    for (const moon of moons) {
      // Moon position relative to planet (ship is in planet-relative frame)
      const moonLocalX = moon.x - current.x;
      const moonLocalY = moon.y - current.y;
      const dx = ship.pos.x - moonLocalX;
      const dy = ship.pos.y - moonLocalY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < moon.soiRadius) {
        // Enter moon SOI: compute ship velocity relative to moon
        const moonVel = moonOrbitalVelocity(moon, current);
        const relativeVel: Vec2 = {
          x: ship.vel.x - moonVel.x,
          y: ship.vel.y - moonVel.y,
        };

        return { newSoiBody: moon, relativeVel };
      }
    }

    // Check if ship has escaped planet's SOI (ship pos is planet-relative)
    const dist = Math.sqrt(ship.pos.x * ship.pos.x + ship.pos.y * ship.pos.y);

    if (dist > current.soiRadius) {
      // Escape planet SOI: compute ship velocity in star-relative frame
      const planetVel = planetOrbitalVelocity(current, system);
      const relativeVel: Vec2 = {
        x: ship.vel.x + planetVel.x,
        y: ship.vel.y + planetVel.y,
      };

      return { newSoiBody: system.star, relativeVel };
    }

    return null;

  } else if (current.kind === 'moon') {
    // Moon SOI: check if ship has escaped moon's SOI
    const dist = Math.sqrt(ship.pos.x * ship.pos.x + ship.pos.y * ship.pos.y);

    if (dist > current.soiRadius) {
      const planet = current.parentBody;
      const moonVel = moonOrbitalVelocity(current, planet);

      // Convert velocity back to planet-relative frame
      const relativeVel: Vec2 = {
        x: ship.vel.x + moonVel.x,
        y: ship.vel.y + moonVel.y,
      };

      return { newSoiBody: planet, relativeVel };
    }

    return null;
  }

  // Anomalies have no SOI — should never be assigned as soiBody
  return null;
}

// Re-export buildOrbitFromState for callers that need to update orbit data after a transition
export { buildOrbitFromState };
