import { computeOrbitalElements, stateFromOrbitalElements } from './orbit.js';
import { vec2Mag } from './utils.js';

// Compute the planet's current orbital velocity vector from its position and parent mu
export function planetOrbitalVelocity(planet, system) {
  const mu = system.star.mu;
  const { a, e, omega } = planet.orbitalElements;

  // Derive current true anomaly from planet's current position relative to star
  const pos = { x: planet.x, y: planet.y };
  // Use zero velocity placeholder to compute nu; actual nu comes from atan2 of pos angle - omega
  const nu = Math.atan2(pos.y, pos.x) - omega;

  // Get state at current true anomaly
  const { vel } = stateFromOrbitalElements(a, e, omega, nu, mu);
  return { x: vel.x, y: vel.y };
}

// Compute absolute world-space position from ship's SOI-relative position
export function shipWorldPosition(ship, system) {
  const body = ship.currentSOIBody;

  // Star is at origin — ship position is already world-space
  if (!body || body === system.star || body.kind === 'star') {
    return { x: ship.x, y: ship.y };
  }

  // Planet SOI — ship position is relative to planet, add planet world pos
  return { x: ship.x + body.x, y: ship.y + body.y };
}

// Detect and perform SOI transitions; mutates ship state if transition occurs
// Returns { transitioned, from, to } or null if no transition
export function checkSOITransition(ship, system) {
  const current = ship.currentSOIBody;

  // Guard: if no SOI body assigned, default to star
  if (!current) {
    ship.currentSOIBody = system.star;
    return null;
  }

  if (current.kind === 'star') {
    // Star SOI: check if ship has entered any planet's SOI
    for (const planet of system.planets) {
      const dx = ship.x - planet.x;
      const dy = ship.y - planet.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < planet.soiRadius) {
        // Enter-child: transition into planet SOI
        const planetVel = planetOrbitalVelocity(planet, system);

        // Convert position to planet-relative frame
        ship.x -= planet.x;
        ship.y -= planet.y;

        // Convert velocity to planet-relative frame
        ship.vx -= planetVel.x;
        ship.vy -= planetVel.y;

        const oldBody = current;
        ship.currentSOIBody = planet;

        // Recompute orbital elements relative to new SOI body
        const elements = computeOrbitalElements(
          { x: ship.x, y: ship.y },
          { x: ship.vx, y: ship.vy },
          planet.mu
        );
        ship.orbit = {
          a: elements.a,
          e: elements.e,
          omega: elements.omega,
          nu: elements.nu,
          T: elements.T,
          apoapsis: elements.a * (1 + elements.e),
          periapsis: elements.a * (1 - elements.e),
          altitude: vec2Mag({ x: ship.x, y: ship.y }) - planet.radius,
        };

        return { transitioned: true, from: oldBody, to: planet };
      }
    }

    return null;

  } else if (current.kind === 'planet') {
    // Planet SOI: check if ship has escaped planet's SOI
    const dist = Math.sqrt(ship.x * ship.x + ship.y * ship.y);

    if (dist > current.soiRadius) {
      const planet = current;
      const planetVel = planetOrbitalVelocity(planet, system);

      // Convert position back to star-relative frame
      ship.x += planet.x;
      ship.y += planet.y;

      // Convert velocity back to star-relative frame
      ship.vx += planetVel.x;
      ship.vy += planetVel.y;

      ship.currentSOIBody = system.star;

      // Recompute orbital elements relative to star
      const elements = computeOrbitalElements(
        { x: ship.x, y: ship.y },
        { x: ship.vx, y: ship.vy },
        system.star.mu
      );
      ship.orbit = {
        a: elements.a,
        e: elements.e,
        omega: elements.omega,
        nu: elements.nu,
        T: elements.T,
        apoapsis: elements.a * (1 + elements.e),
        periapsis: elements.a * (1 - elements.e),
        altitude: vec2Mag({ x: ship.x, y: ship.y }) - system.star.radius,
      };

      return { transitioned: true, from: planet, to: system.star };
    }

    return null;
  }

  return null;
}
