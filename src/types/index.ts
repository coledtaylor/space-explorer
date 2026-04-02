// Core type definitions for the Space Explorer physics engine

// Re-export landing types for convenience — defined in src/lib/landing.ts
export type { LandingState, LandingTelemetry } from '../lib/landing.js';

export interface Vec2 {
  x: number;
  y: number;
}

// Orbital elements describing a Keplerian orbit in 2D
export interface OrbitalElements {
  // Semi-major axis (game units)
  a: number;
  // Eccentricity [0, 1)
  e: number;
  // Argument of periapsis (radians)
  omega: number;
  // True anomaly at initial epoch (radians)
  nu0: number;
  // Orbital period (seconds) — only meaningful for elliptical orbits
  T?: number;
  // Specific orbital energy — negative for bound orbits
  epsilon?: number;
}

// Celestial body discriminated union
export type CelestialBodyKind = 'star' | 'planet' | 'moon' | 'anomaly';

interface CelestialBodyBase {
  kind: CelestialBodyKind;
  name: string;
  subtype: string;
  x: number;
  y: number;
  radius: number;
  color: string;
  hue: number;
  description: string;
  details: Record<string, string>;
}

export interface StarBody extends CelestialBodyBase {
  kind: 'star';
  mass: number;
  mu: number;
  soiRadius: number;
  glowColor: string;
}

export interface PlanetBody extends CelestialBodyBase {
  kind: 'planet';
  mass: number;
  mu: number;
  soiRadius: number;
  orbitalElements: OrbitalElements;
  parentBody: StarBody;
  moons: MoonBody[];
  children: MoonBody[];
}

export interface MoonBody extends CelestialBodyBase {
  kind: 'moon';
  mass: number;
  mu: number;
  soiRadius: number;
  orbitalElements: OrbitalElements;
  parentBody: PlanetBody;
}

export interface AnomalyBody extends CelestialBodyBase {
  kind: 'anomaly';
  glowColor: string;
}

export type CelestialBody = StarBody | PlanetBody | MoonBody | AnomalyBody;

// A body that has orbital mechanics (not anomalies or the central star)
export type OrbitingBody = PlanetBody | MoonBody;

// A body with mass and gravitational influence
export type MassiveBody = StarBody | PlanetBody | MoonBody;

// The full star system returned by generateSystem
export interface StarSystem {
  star: StarBody;
  planets: PlanetBody[];
  moons: MoonBody[];
  bodies: CelestialBody[];
}

// Ship position and velocity state
export interface ShipState {
  pos: Vec2;
  vel: Vec2;
  // The body whose SOI the ship currently occupies
  soiBody: MassiveBody;
}

// A single point along a propagated trajectory
export interface TrajectoryPoint {
  pos: Vec2;
  vel: Vec2;
  t: number;
}

// A marker along a trajectory (SOI transitions, closest approaches, etc.)
export interface TrajectoryMarker {
  type: 'soi-entry' | 'soi-exit' | 'closest-approach';
  x: number;
  y: number;
  body?: string;
  distance?: number;
}

// A contiguous segment of trajectory within a single SOI
export interface TrajectorySegment {
  points: Vec2[];
  soiBody: MassiveBody;
  color: string;
  markers: TrajectoryMarker[];
  // Apoapsis and periapsis markers if orbit is elliptical
  apoapsis?: Vec2;
  periapsis?: Vec2;
}

// Options for trajectory propagation
export interface TrajectoryOptions {
  maxTime?: number;
  stepSize?: number;
  maxSegments?: number;
  simBaseTime?: number;
}

// Result of an SOI transition check
export interface SOITransitionResult {
  newSoiBody: MassiveBody;
  // Relative velocity at the moment of SOI entry
  relativeVel: Vec2;
}
