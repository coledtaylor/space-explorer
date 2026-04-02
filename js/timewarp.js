export const WARP_STEPS = [1, 2, 5, 10, 50];

let warpIndex = 0;

export function getWarpRate() {
  return WARP_STEPS[warpIndex];
}

export function getWarpIndex() {
  return warpIndex;
}

export function increaseWarp() {
  warpIndex = Math.min(warpIndex + 1, WARP_STEPS.length - 1);
}

export function decreaseWarp() {
  warpIndex = Math.max(warpIndex - 1, 0);
}

export function resetWarp() {
  warpIndex = 0;
}
