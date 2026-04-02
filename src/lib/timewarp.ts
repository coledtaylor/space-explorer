// Time warp state for MapScene orbital time acceleration
// WARP_STEPS matches the task spec: 1x, 10x, 100x, 1000x
export const WARP_STEPS: readonly number[] = [1, 10, 100, 1000];

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
