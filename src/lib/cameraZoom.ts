import { clamp } from './utils.js';

// Named constants for zoom behavior configuration
export const ZOOM_CONFIG = {
  MIN_ZOOM: 0.001,
  MAX_ZOOM: 2.0,
  LOW_ORBIT_RATIO: 2,
  HIGH_ORBIT_RATIO: 10,
  LOW_ORBIT_SCREEN_FRACTION: 0.7,
  HIGH_ORBIT_SCREEN_FRACTION: 0.4,
  // Exponential lerp speed for smooth auto-zoom transitions (units: 1/second)
  ZOOM_LERP_SPEED: 2.0,
  // How long the manual scroll-wheel override holds before auto-zoom resumes (ms)
  MANUAL_OVERRIDE_TIMEOUT_MS: 4000,
} as const;

// Classic smoothstep: returns 0 at x<=edge0, 1 at x>=edge1, smooth S-curve between.
// Uses the standard cubic Hermite formula: 3t^2 - 2t^3.
export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

// Compute the target camera zoom for a given altitude above a body.
//
// The zoom is chosen so the body fills a meaningful fraction of screen height:
//   - Low orbit (altitudeRatio < LOW_ORBIT_RATIO): planet diameter spans ~70% of screen.
//   - High orbit (altitudeRatio > HIGH_ORBIT_RATIO): orbital radius fits in ~40% of screen.
//   - Between: smooth interpolation via smoothstep.
//
// Result is clamped to [MIN_ZOOM, MAX_ZOOM].
export function computeTargetZoom(
  altitude: number,
  bodyRadius: number,
  screenHeight: number,
): number {
  const altitudeRatio = altitude / bodyRadius;

  // Low orbit: body diameter (2 * bodyRadius) spans LOW_ORBIT_SCREEN_FRACTION of screen.
  const lowOrbitZoom =
    (screenHeight * ZOOM_CONFIG.LOW_ORBIT_SCREEN_FRACTION) / (bodyRadius * 2);

  // High orbit: orbital radius (altitude + bodyRadius) fits in HIGH_ORBIT_SCREEN_FRACTION of screen.
  const highOrbitZoom =
    (screenHeight * ZOOM_CONFIG.HIGH_ORBIT_SCREEN_FRACTION) / (altitude + bodyRadius);

  let targetZoom: number;

  if (altitudeRatio <= ZOOM_CONFIG.LOW_ORBIT_RATIO) {
    targetZoom = lowOrbitZoom;
  } else if (altitudeRatio >= ZOOM_CONFIG.HIGH_ORBIT_RATIO) {
    targetZoom = highOrbitZoom;
  } else {
    // Interpolate via smoothstep between the two regime zoom values.
    // t=0 at LOW_ORBIT_RATIO, t=1 at HIGH_ORBIT_RATIO.
    const t = smoothstep(
      ZOOM_CONFIG.LOW_ORBIT_RATIO,
      ZOOM_CONFIG.HIGH_ORBIT_RATIO,
      altitudeRatio,
    );
    targetZoom = lowOrbitZoom + (highOrbitZoom - lowOrbitZoom) * t;
  }

  return clamp(targetZoom, ZOOM_CONFIG.MIN_ZOOM, ZOOM_CONFIG.MAX_ZOOM);
}
