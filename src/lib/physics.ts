// Gravitational physics — pure, framework-agnostic math.
// All functions are stateless and testable in isolation. No Phaser imports.

import type { Vec2, CelestialBodyConfig } from '../types/index.js';

// KSP-scale gravitational constant. Real SI value is ~6.674e-11 N·m²/kg².
// KSP inflates G to make orbital mechanics feel responsive at compressed scales
// (KSP distances are ~10x smaller than real-world, masses similarly tuned).
const G = 6.674e-11;

/**
 * Calculates the gravitational acceleration vector exerted on a point mass
 * at `posA` by a body of `bodyMass` located at `posB`.
 *
 * Returns GM/r² directed from posA toward posB.
 * Returns zero vector if positions are identical (zero-distance protection
 * prevents division by zero and infinite forces from coincident points).
 */
export function calculateGravity(
  bodyMass: number,
  posA: Vec2,
  posB: Vec2,
): Vec2 {
  const dx = posB.x - posA.x;
  const dy = posB.y - posA.y;
  const distanceSquared = dx * dx + dy * dy;

  // Guard: coincident points produce undefined direction and infinite magnitude.
  if (distanceSquared === 0) {
    return { x: 0, y: 0 };
  }

  const distance = Math.sqrt(distanceSquared);
  const magnitude = (G * bodyMass) / distanceSquared;

  // Normalize direction then scale by magnitude in one step.
  return {
    x: (dx / distance) * magnitude,
    y: (dy / distance) * magnitude,
  };
}

/**
 * Sums gravitational acceleration contributions from multiple celestial bodies
 * onto a ship at `shipPosition`.
 *
 * Each body's position must be supplied alongside its config because bodies
 * move over time — callers are responsible for resolving current positions
 * before passing them here.
 */
export function sumGravitationalForces(
  bodies: Array<{ config: CelestialBodyConfig; position: Vec2 }>,
  shipPosition: Vec2,
): Vec2 {
  let totalX = 0;
  let totalY = 0;

  for (const { config, position } of bodies) {
    const contribution = calculateGravity(config.mass, shipPosition, position);
    totalX += contribution.x;
    totalY += contribution.y;
  }

  return { x: totalX, y: totalY };
}
