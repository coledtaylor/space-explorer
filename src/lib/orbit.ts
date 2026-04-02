import type { Vec2, OrbitalElements } from '../types/index.js';
import { vec2Mag, vec2Scale, vec2Sub, vec2Dot } from './utils.js';

// Compute orbital elements from state vector (position and velocity relative to SOI body at origin)
export function computeOrbitalElements(pos: Vec2, vel: Vec2, mu: number): OrbitalElements {
  const r = vec2Mag(pos);
  const v = vec2Mag(vel);

  // Specific orbital energy
  const epsilon = v * v / 2 - mu / r;

  // Semi-major axis
  const a = -mu / (2 * epsilon);

  // Angular momentum (scalar, 2D cross product)
  const h = pos.x * vel.y - pos.y * vel.x;

  // Eccentricity vector
  const dotPV = vec2Dot(pos, vel);
  const eVec: Vec2 = {
    x: ((v * v - mu / r) * pos.x - dotPV * vel.x) / mu,
    y: ((v * v - mu / r) * pos.y - dotPV * vel.y) / mu,
  };
  const e = vec2Mag(eVec);

  // Argument of periapsis
  const omega = Math.atan2(eVec.y, eVec.x);

  // True anomaly at epoch: angle from periapsis direction to current position
  const nu0 = Math.atan2(pos.y, pos.x) - omega;

  // Orbital period (only meaningful for elliptical orbits, a > 0)
  const T = a > 0 ? 2 * Math.PI * Math.sqrt(a * a * a / mu) : undefined;

  // Suppress unused variable warning — h is computed for completeness (angular momentum sign)
  void h;

  return { a, e, omega, nu0, T, epsilon };
}

// Compute state vector from orbital elements at a given true anomaly
// Returns { pos: Vec2, vel: Vec2 } in the inertial frame
export function stateFromOrbitalElements(
  a: number,
  e: number,
  omega: number,
  nu: number,
  mu: number,
): { pos: Vec2; vel: Vec2 } {
  // Semi-latus rectum
  const p = a * (1 - e * e);

  // Radius at this true anomaly
  const r = p / (1 + e * Math.cos(nu));

  // Position in perifocal frame
  const xPerif = r * Math.cos(nu);
  const yPerif = r * Math.sin(nu);

  // Velocity in perifocal frame
  const sqrtMuOverP = Math.sqrt(mu / p);
  const vxPerif = -sqrtMuOverP * Math.sin(nu);
  const vyPerif = sqrtMuOverP * (e + Math.cos(nu));

  // Rotate from perifocal to inertial frame by omega
  const cosO = Math.cos(omega);
  const sinO = Math.sin(omega);

  const pos: Vec2 = {
    x: cosO * xPerif - sinO * yPerif,
    y: sinO * xPerif + cosO * yPerif,
  };
  const vel: Vec2 = {
    x: cosO * vxPerif - sinO * vyPerif,
    y: sinO * vxPerif + cosO * vyPerif,
  };

  return { pos, vel };
}

// Apoapsis radius (farthest point from focus)
export function computeApoapsisRadius(a: number, e: number): number {
  return a * (1 + e);
}

// Periapsis radius (closest point to focus)
export function computePeriapsisRadius(a: number, e: number): number {
  return a * (1 - e);
}

// Propagate true anomaly forward by time t using Kepler's equation (elliptical orbits only)
export function trueAnomalyAtTime(t: number, a: number, e: number, mu: number, nu0: number): number {
  // Mean motion
  const n = Math.sqrt(mu / (a * a * a));

  // Convert nu0 to eccentric anomaly E0
  // tan(E/2) = sqrt((1-e)/(1+e)) * tan(nu/2)
  const tanHalfNu0 = Math.tan(nu0 / 2);
  const E0 = 2 * Math.atan(Math.sqrt((1 - e) / (1 + e)) * tanHalfNu0);

  // Convert E0 to mean anomaly M0
  const M0 = E0 - e * Math.sin(E0);

  // Advance mean anomaly
  const M = M0 + n * t;

  // Solve Kepler's equation M = E - e*sin(E) via Newton-Raphson
  let E = M;
  for (let i = 0; i < 50; i++) {
    const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= dE;
    if (Math.abs(dE) < 1e-12) break;
  }

  // Convert E back to true anomaly
  // tan(nu/2) = sqrt((1+e)/(1-e)) * tan(E/2)
  const nu = 2 * Math.atan(Math.sqrt((1 + e) / (1 - e)) * Math.tan(E / 2));

  return nu;
}

// Sphere of influence radius (Hill sphere approximation)
export function computeSOIRadius(bodyMass: number, parentMass: number, orbitalRadius: number): number {
  return orbitalRadius * Math.pow(bodyMass / parentMass, 0.4);
}

// Gravitational acceleration vector on ship due to a body
// Returns acceleration Vec2 pointing from ship toward body
export function gravityAcceleration(shipPos: Vec2, bodyPos: Vec2, mu: number): Vec2 {
  const rVec = vec2Sub(shipPos, bodyPos);
  const r = vec2Mag(rVec);
  // a = -mu/r^3 * rVec  (rVec points ship→body direction when negated)
  return vec2Scale(rVec, -mu / (r * r * r));
}
