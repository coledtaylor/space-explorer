import { clamp } from './utils.js';

// Named constants for zoom behavior configuration
export const ZOOM_CONFIG = {
  MIN_ZOOM: 0.0005,
  MAX_ZOOM: 5.0,
  // Exponential lerp speed for smooth auto-zoom transitions (units: 1/second)
  ZOOM_LERP_SPEED: 2.0,
  // How long the manual scroll-wheel override holds before auto-zoom resumes (ms)
  MANUAL_OVERRIDE_TIMEOUT_MS: 4000,
} as const;

/**
 * Compute the target camera zoom from first principles.
 *
 * Goal: the ship is always visible and centered. The parent body (star/planet)
 * should be visible somewhere on screen for context. The trajectory arc should
 * be visible.
 *
 * Strategy: zoom so that the distance from ship to the SOI body center maps to
 * a fixed fraction of the screen. This naturally zooms in when close to a body
 * and zooms out when far away.
 *
 * - When very close (altitude < bodyRadius): body fills most of the screen.
 *   Zoom = screenHeight * 0.35 / bodyRadius  (body diameter = ~70% screen)
 *
 * - When far away: distance-to-body maps to ~40% of screen height, so the body
 *   is visible at the edge and the trajectory arc has room.
 *   Zoom = screenHeight * 0.4 / distanceToBody
 *
 * We take the minimum of these two to avoid over-zooming when close.
 */
export function computeTargetZoom(
  altitude: number,
  bodyRadius: number,
  screenHeight: number,
): number {
  const distanceToCenter = altitude + bodyRadius;

  // Close-up zoom: body diameter fills ~70% of screen
  const closeZoom = (screenHeight * 0.35) / bodyRadius;

  // Distance-based zoom: distance to body center fills ~40% of screen
  const distZoom = (screenHeight * 0.4) / distanceToCenter;

  // Use whichever is more zoomed out (smaller value) — this ensures we never
  // zoom in so far that the body is off-screen when we're far from it, and
  // never zoom out too far when we're close.
  const targetZoom = Math.min(closeZoom, distZoom);

  return clamp(targetZoom, ZOOM_CONFIG.MIN_ZOOM, ZOOM_CONFIG.MAX_ZOOM);
}
