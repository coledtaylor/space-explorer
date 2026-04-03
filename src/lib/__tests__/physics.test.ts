// Tests for gravitational physics pure functions.
//
// Expected values are hand-calculated using the same G constant defined in
// physics.ts (6.674e-11). Tests verify both magnitude correctness and direction
// correctness independently so a bug in either is caught separately.

import { describe, it, expect } from 'vitest';
import { calculateGravity, sumGravitationalForces } from '../physics.js';
import type { CelestialBodyConfig } from '../../types/index.js';

// The gravitational constant used in physics.ts — must match to hand-calculate expected values.
const G = 6.674e-11;

// Tolerance for floating-point comparisons. Physics values span many orders of
// magnitude so we use relative tolerance rather than a fixed epsilon.
const RELATIVE_TOLERANCE = 1e-9;

function expectClose(actual: number, expected: number, tolerance = RELATIVE_TOLERANCE): void {
  if (expected === 0) {
    expect(Math.abs(actual)).toBeLessThan(tolerance);
  } else {
    expect(Math.abs((actual - expected) / expected)).toBeLessThan(tolerance);
  }
}

describe('calculateGravity', () => {
  it('returns the correct acceleration magnitude for a known mass and distance', () => {
    // Body of 1e24 kg sitting at origin, test point 1000 km away along +x axis.
    // Expected magnitude: G * M / r² = 6.674e-11 * 1e24 / (1e6)² = 6.674e-2
    const mass = 1e24;
    const distance = 1_000; // game units (km)
    const posA = { x: 0, y: 0 };
    const posB = { x: distance, y: 0 };

    const result = calculateGravity(mass, posA, posB);

    const expectedMagnitude = (G * mass) / (distance * distance);
    const actualMagnitude = Math.sqrt(result.x * result.x + result.y * result.y);

    expectClose(actualMagnitude, expectedMagnitude);
  });

  it('returns acceleration directed from posA toward posB', () => {
    // posA is at origin, posB is directly up (+y). Gravity should point in +y direction.
    const mass = 5e22;
    const posA = { x: 0, y: 0 };
    const posB = { x: 0, y: 500 };

    const result = calculateGravity(mass, posA, posB);

    expect(result.x).toBeCloseTo(0, 10);
    expect(result.y).toBeGreaterThan(0);
  });

  it('returns acceleration directed from posA toward posB at an oblique angle', () => {
    // posB is at 45 degrees — x and y components should be equal and positive.
    const mass = 5e22;
    const posA = { x: 0, y: 0 };
    const posB = { x: 400, y: 400 };

    const result = calculateGravity(mass, posA, posB);

    expect(result.x).toBeGreaterThan(0);
    expect(result.y).toBeGreaterThan(0);
    // At exactly 45 degrees the x and y components must be equal.
    expectClose(result.x, result.y);
  });

  it('returns zero vector when posA and posB are identical (zero-distance guard)', () => {
    // Coincident positions must not produce Infinity or NaN.
    const mass = 1e24;
    const pos = { x: 100, y: 200 };

    const result = calculateGravity(mass, pos, pos);

    expect(result.x).toBe(0);
    expect(result.y).toBe(0);
    expect(Number.isFinite(result.x)).toBe(true);
    expect(Number.isFinite(result.y)).toBe(true);
  });

  it('returns a negligible but non-zero acceleration at a very large distance', () => {
    // At astronomical distances gravity should not vanish to exactly zero —
    // floating-point precision must be sufficient to return a small value.
    const mass = 1.7e28; // Kerbol-scale mass
    const distance = 1e9; // 1 billion km — far beyond any planet
    const posA = { x: 0, y: 0 };
    const posB = { x: distance, y: 0 };

    const result = calculateGravity(mass, posA, posB);

    const magnitude = Math.sqrt(result.x * result.x + result.y * result.y);
    expect(magnitude).toBeGreaterThan(0);
    expect(Number.isFinite(magnitude)).toBe(true);
  });
});

describe('sumGravitationalForces', () => {
  // Minimal stub config — only the fields sumGravitationalForces needs.
  const makeBody = (mass: number): CelestialBodyConfig => ({
    name: 'test',
    kind: 'planet',
    mass,
    radius: 1,
    orbitalRadius: 0,
    orbitalPeriod: 0,
    color: '#ffffff',
  });

  it('returns zero vector when no bodies are provided', () => {
    const result = sumGravitationalForces([], { x: 0, y: 0 });

    expect(result.x).toBe(0);
    expect(result.y).toBe(0);
  });

  it('sums contributions from multiple bodies into a single acceleration vector', () => {
    // Two equal-mass bodies placed symmetrically on the x-axis, ship at origin.
    // Y components cancel; X components add. The net force should point in
    // +x because the right-side body is at larger x (both attract from same side…
    // actually let us use bodies at +x and -x from the ship and verify they cancel.
    const mass = 1e22;
    const ship = { x: 0, y: 0 };
    const bodies = [
      { config: makeBody(mass), position: { x: 1000, y: 0 } },
      { config: makeBody(mass), position: { x: -1000, y: 0 } },
    ];

    const result = sumGravitationalForces(bodies, ship);

    // Net x should cancel to ~0 (symmetric pull in opposite directions).
    expect(result.x).toBeCloseTo(0, 6);
    // Net y stays 0.
    expect(result.y).toBeCloseTo(0, 6);
  });

  it('accumulates forces when bodies pull in the same direction', () => {
    // Two bodies stacked at the same position along +x.
    // Net force should be exactly twice a single body's contribution.
    const mass = 1e22;
    const ship = { x: 0, y: 0 };
    const bodyPos = { x: 800, y: 0 };

    const single = calculateGravity(mass, ship, bodyPos);
    const bodies = [
      { config: makeBody(mass), position: bodyPos },
      { config: makeBody(mass), position: bodyPos },
    ];

    const result = sumGravitationalForces(bodies, ship);

    expectClose(result.x, single.x * 2);
    expect(result.y).toBeCloseTo(0, 10);
  });
});
