// Orbital position math — pure, framework-agnostic.
// Computes circular-orbit positions and resolves world-space coordinates
// by walking the parent chain. No Phaser imports.

import type { Vec2, SolarSystemConfig } from '../types/index.js';

const TWO_PI = 2 * Math.PI;

/**
 * Returns the position on a circular orbit at time `t`.
 *
 * Orbit starts at (radius, 0) at t=0 and advances counter-clockwise.
 * Using cosine/sine maps the orbit: t=0 → (r,0), t=T/4 → (0,r), t=T/2 → (-r,0).
 *
 * Returns (0, 0) for zero orbital radius — used for the central star which
 * has no orbit.
 */
export function getOrbitalPosition(
  orbitalRadius: number,
  orbitalPeriod: number,
  time: number,
): Vec2 {
  if (orbitalRadius === 0) {
    return { x: 0, y: 0 };
  }

  // Avoid division-by-zero for bodies with undefined period.
  if (orbitalPeriod === 0) {
    return { x: orbitalRadius, y: 0 };
  }

  const angle = (TWO_PI * time) / orbitalPeriod;

  return {
    x: orbitalRadius * Math.cos(angle),
    y: orbitalRadius * Math.sin(angle),
  };
}

/**
 * Returns the absolute world-space position of a celestial body at time `t`
 * by recursively summing parent offsets up the hierarchy.
 *
 * A body with no `parentId` (the central star) is at the world origin.
 * A planet's world position is its own orbital position relative to the star.
 * A moon's world position is the planet's world position plus the moon's own
 * orbital position — this chaining continues for any depth of hierarchy.
 */
export function getWorldPosition(
  bodyId: string,
  config: SolarSystemConfig,
  time: number,
): Vec2 {
  const body = config.bodies[bodyId];

  if (body === undefined) {
    return { x: 0, y: 0 };
  }

  const ownOrbitalPos = getOrbitalPosition(
    body.orbitalRadius,
    body.orbitalPeriod,
    time,
  );

  // Base case: no parent means this body is at the solar system origin.
  if (body.parentId === undefined) {
    return ownOrbitalPos;
  }

  // Recursive case: add parent's world-space position to our orbital offset.
  const parentWorldPos = getWorldPosition(body.parentId, config, time);

  return {
    x: parentWorldPos.x + ownOrbitalPos.x,
    y: parentWorldPos.y + ownOrbitalPos.y,
  };
}
