// Tests for orbital position pure functions.
//
// getOrbitalPosition uses cosine/sine so the orbit starts at (radius, 0) at t=0
// and advances counter-clockwise:
//   t=0    → (r,  0)
//   t=T/4  → (0,  r)
//   t=T/2  → (-r, 0)
//   t=T    → (r,  0)  (back to start)
//
// getWorldPosition walks the parent chain and sums orbital offsets, so a moon's
// world position equals planet_position + moon_orbital_position.

import { describe, it, expect } from 'vitest';
import { getOrbitalPosition, getWorldPosition } from '../orbit.js';
import { SOLAR_SYSTEM } from '../solarSystem.js';

// Absolute epsilon suitable for distances in game units (km-scale, values up to ~1e7).
// A tolerance of 1e-4 km is well within any meaningful precision for this simulation.
const EPSILON = 1e-4;

function expectVec2Close(
  actual: { x: number; y: number },
  expected: { x: number; y: number },
  epsilon = EPSILON,
): void {
  expect(Math.abs(actual.x - expected.x)).toBeLessThan(epsilon);
  expect(Math.abs(actual.y - expected.y)).toBeLessThan(epsilon);
}

describe('getOrbitalPosition', () => {
  const radius = 10_000;
  const period = 100;

  it('returns (radius, 0) at t=0 (start of orbit)', () => {
    const result = getOrbitalPosition(radius, period, 0);
    expectVec2Close(result, { x: radius, y: 0 });
  });

  it('returns (0, radius) at t=T/4 (quarter orbit, counter-clockwise)', () => {
    const result = getOrbitalPosition(radius, period, period / 4);
    expectVec2Close(result, { x: 0, y: radius });
  });

  it('returns (-radius, 0) at t=T/2 (half orbit)', () => {
    const result = getOrbitalPosition(radius, period, period / 2);
    expectVec2Close(result, { x: -radius, y: 0 });
  });

  it('returns (radius, 0) at t=T (full orbit, back to start)', () => {
    const result = getOrbitalPosition(radius, period, period);
    expectVec2Close(result, { x: radius, y: 0 });
  });

  it('returns (0, 0) when orbitalRadius is zero (central body has no orbit)', () => {
    const result = getOrbitalPosition(0, period, 42);
    expect(result.x).toBe(0);
    expect(result.y).toBe(0);
  });

  it('returns (radius, 0) when orbitalPeriod is zero (degenerate case does not divide by zero)', () => {
    // A body with period 0 should not throw or produce NaN/Infinity.
    const result = getOrbitalPosition(radius, 0, 100);
    expect(Number.isFinite(result.x)).toBe(true);
    expect(Number.isFinite(result.y)).toBe(true);
    expect(result.x).toBe(radius);
    expect(result.y).toBe(0);
  });
});

describe('getWorldPosition', () => {
  // All tests use the canonical SOLAR_SYSTEM config so the expected values are
  // derived directly from the config constants rather than duplicated here.

  it('returns (0, 0) for the central star (Kerbol has no parent)', () => {
    // Kerbol orbitalRadius=0, no parent — world position is always the origin.
    const result = getWorldPosition('kerbol', SOLAR_SYSTEM, 0);
    expect(result.x).toBe(0);
    expect(result.y).toBe(0);
  });

  it('returns (0, 0) for the central star regardless of time', () => {
    const result = getWorldPosition('kerbol', SOLAR_SYSTEM, 9_999_999);
    expect(result.x).toBe(0);
    expect(result.y).toBe(0);
  });

  it('returns the planet orbital position relative to star at t=0', () => {
    // At t=0, Kerbin should be at (KERBIN_ORBITAL_RADIUS, 0).
    const kerbin = SOLAR_SYSTEM.bodies.kerbin;
    const result = getWorldPosition('kerbin', SOLAR_SYSTEM, 0);
    expectVec2Close(result, { x: kerbin.orbitalRadius, y: 0 });
  });

  it('correctly chains moon world position as planet_pos + moon_orbital_pos', () => {
    // At an arbitrary time t, Mun world position = Kerbin world position + Mun orbital position.
    const t = 50_000; // seconds — chosen so both bodies have moved meaningfully

    const kerbinPos = getWorldPosition('kerbin', SOLAR_SYSTEM, t);
    const munBody = SOLAR_SYSTEM.bodies.mun;
    const munOrbitalPos = getOrbitalPosition(munBody.orbitalRadius, munBody.orbitalPeriod, t);

    const expectedMunWorld = {
      x: kerbinPos.x + munOrbitalPos.x,
      y: kerbinPos.y + munOrbitalPos.y,
    };

    const result = getWorldPosition('mun', SOLAR_SYSTEM, t);
    expectVec2Close(result, expectedMunWorld);
  });

  it('correctly chains moon world position at a second arbitrary time', () => {
    // Repeat the chaining test at a different time to catch period-dependent bugs.
    const t = 500_000;

    const kerbinPos = getWorldPosition('kerbin', SOLAR_SYSTEM, t);
    const munBody = SOLAR_SYSTEM.bodies.mun;
    const munOrbitalPos = getOrbitalPosition(munBody.orbitalRadius, munBody.orbitalPeriod, t);

    const expectedMunWorld = {
      x: kerbinPos.x + munOrbitalPos.x,
      y: kerbinPos.y + munOrbitalPos.y,
    };

    const result = getWorldPosition('mun', SOLAR_SYSTEM, t);
    expectVec2Close(result, expectedMunWorld);
  });

  it('returns (0, 0) for an unknown body ID (graceful fallback)', () => {
    const result = getWorldPosition('nonexistent_body', SOLAR_SYSTEM, 0);
    expect(result.x).toBe(0);
    expect(result.y).toBe(0);
  });
});
