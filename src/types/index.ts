// Shared type definitions for Space Explorer.
// Pure data shapes — no runtime code, no framework imports.

/** A 2D vector used for positions, velocities, and acceleration. */
export interface Vec2 {
  x: number;
  y: number;
}

/**
 * Configuration for a single celestial body (star, planet, or moon).
 * All distances are in game units (gu), masses in kg, periods in seconds.
 */
export interface CelestialBodyConfig {
  /** Human-readable display name. */
  name: string;

  /** Body kind — drives rendering and gameplay rules. */
  kind: 'star' | 'planet' | 'moon';

  /** Mass in kilograms. Used for gravitational pull calculations. */
  mass: number;

  /** Visual and collision radius in game units. */
  radius: number;

  /**
   * Orbital radius in game units measured from parent body center.
   * Zero for the central star (no parent orbit).
   */
  orbitalRadius: number;

  /**
   * Time in seconds for one complete orbit around the parent.
   * Zero for the central star.
   */
  orbitalPeriod: number;

  /** CSS hex color string used for rendering. */
  color: string;

  /**
   * ID key of the parent body in the solar system config.
   * Absent (undefined) for the central star which orbits nothing.
   */
  parentId?: string;
}

/**
 * Complete solar system layout — a keyed map of body ID to config.
 * The ID is used for parent-chain lookups and must be unique.
 */
export interface SolarSystemConfig {
  bodies: Record<string, CelestialBodyConfig>;
}
