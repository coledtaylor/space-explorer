// Camera zoom math — pure, framework-agnostic utilities.
// No Phaser imports. All functions are stateless and testable in isolation.

import { ZOOM_SPEED } from './scaleConfig.js';

// Re-export zoom constants so existing imports still work.
export { ZOOM_MIN, ZOOM_MAX, ZOOM_SPEED } from './scaleConfig.js';

/**
 * Applies a multiplicative zoom delta and clamps the result to [min, max].
 *
 * @param currentZoom - the camera's current zoom level
 * @param delta       - signed scroll delta (positive = zoom in, negative = zoom out)
 * @param min         - minimum allowed zoom (most zoomed out)
 * @param max         - maximum allowed zoom (most zoomed in)
 * @returns the new clamped zoom level
 */
export function clampZoom(
  currentZoom: number,
  delta: number,
  min: number,
  max: number,
): number {
  const newZoom = currentZoom * (1 + delta * ZOOM_SPEED);
  return Math.max(min, Math.min(max, newZoom));
}
