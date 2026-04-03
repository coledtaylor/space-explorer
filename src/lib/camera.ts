// Camera zoom math — pure, framework-agnostic utilities.
// No Phaser imports. All functions are stateless and testable in isolation.
//
// ZOOM REGIME (KSP scale, WORLD_SCALE = 3e-5 px/km):
//   At ZOOM_MIN the full Kerbol system (~20M km radius) fits on screen.
//   At ZOOM_MAX the ship triangle (20px) is clearly readable.
//   These are tunable — adjust based on canvas size and desired feel.

// Tunable: far-out zoom — set so the outermost planet orbit fits on screen.
// At WORLD_SCALE=3e-5, Duna sits ~621 px from the star. ZOOM_MIN=0.05 means
// the visible radius is canvas_half / 0.05 = ~7000 px → fits the full system.
export const ZOOM_MIN = 0.05;

// Tunable: close-up zoom — 1.5 makes the ship triangle occupy a comfortable
// fraction of the screen and planet surfaces clearly visible when nearby.
export const ZOOM_MAX = 1.5;

// Tunable: multiplicative scroll sensitivity. Each wheel tick multiplies the
// current zoom by (1 ± ZOOM_SPEED). 0.1 = 10% change per tick.
export const ZOOM_SPEED = 0.1;

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
  // Multiplicative zoom feels more natural than additive — equal steps at any
  // zoom level rather than coarse steps when zoomed in, fine steps when out.
  const newZoom = currentZoom * (1 + delta * ZOOM_SPEED);
  return Math.max(min, Math.min(max, newZoom));
}
