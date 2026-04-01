import { vec2Mag, vec2Scale, vec2Sub, vec2Dot } from './utils.js';

// Compute orbital elements from state vector
// Returns { a, e, omega, nu, T, epsilon }
export function computeOrbitalElements(pos, vel, mu) {
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
  const eVec = {
    x: ((v * v - mu / r) * pos.x - dotPV * vel.x) / mu,
    y: ((v * v - mu / r) * pos.y - dotPV * vel.y) / mu,
  };
  const e = vec2Mag(eVec);

  // Argument of periapsis
  const omega = Math.atan2(eVec.y, eVec.x);

  // True anomaly: angle from periapsis direction to current position
  const nu = Math.atan2(pos.y, pos.x) - omega;

  // Orbital period (only meaningful for elliptical orbits)
  const T = 2 * Math.PI * Math.sqrt(a * a * a / mu);

  return { a, e, omega, nu, T, epsilon };
}

// Compute state vector from orbital elements
// Returns { pos: {x, y}, vel: {x, y} }
export function stateFromOrbitalElements(a, e, omega, nu, mu) {
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

  const pos = {
    x: cosO * xPerif - sinO * yPerif,
    y: sinO * xPerif + cosO * yPerif,
  };
  const vel = {
    x: cosO * vxPerif - sinO * vyPerif,
    y: sinO * vxPerif + cosO * vyPerif,
  };

  return { pos, vel };
}

// Apoapsis radius
export function computeApoapsisRadius(a, e) {
  return a * (1 + e);
}

// Periapsis radius
export function computePeriapsisRadius(a, e) {
  return a * (1 - e);
}

// Propagate true anomaly forward by time t using Kepler's equation (elliptical only)
export function trueAnomalyAtTime(t, a, e, mu, nu0) {
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

// Sphere of influence radius
export function computeSOIRadius(bodyMass, parentMass, orbitalRadius) {
  return orbitalRadius * Math.pow(bodyMass / parentMass, 0.4);
}

// Gravitational acceleration vector on ship due to a body
// Returns acceleration {x, y} pointing from ship toward body
export function gravityAcceleration(shipPos, bodyPos, mu) {
  const rVec = vec2Sub(shipPos, bodyPos);
  const r = vec2Mag(rVec);
  // a = -mu/r^3 * rVec  (rVec points body->ship, so negative pulls toward body)
  return vec2Scale(rVec, -mu / (r * r * r));
}
