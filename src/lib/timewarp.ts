// Time warp state for orbital time acceleration in flight and map views
// WARP_STEPS provides six levels up to 100000x for KSP-scale transits
export const WARP_STEPS: readonly number[] = [1, 10, 100, 1000, 10000, 100000];

// Auto-drop warp when ship altitude is within this fraction of the body radius
const SURFACE_PROXIMITY_FACTOR = 0.5;

let warpIndex = 0;

export function getWarpRate(): number {
  return WARP_STEPS[warpIndex] ?? 1;
}

export function getWarpIndex(): number {
  return warpIndex;
}

export function increaseWarp(): void {
  warpIndex = Math.min(warpIndex + 1, WARP_STEPS.length - 1);
}

export function decreaseWarp(): void {
  warpIndex = Math.max(warpIndex - 1, 0);
}

export function resetWarp(): void {
  warpIndex = 0;
}

/**
 * Returns true if time warp should auto-drop to 1x.
 *
 * Warp must be cancelled when:
 * - Thrust is active (player is maneuvering)
 * - The ship just entered a new SOI (trajectory changes discontinuously)
 * - The ship is approaching a body surface (altitude < bodyRadius * SURFACE_PROXIMITY_FACTOR)
 */
export function shouldAutoDropWarp(
  isThrusting: boolean,
  altitude: number,
  bodyRadius: number,
  soiChanged: boolean,
): boolean {
  if (isThrusting) return true;
  if (soiChanged) return true;
  if (altitude < bodyRadius * SURFACE_PROXIMITY_FACTOR) return true;
  return false;
}
