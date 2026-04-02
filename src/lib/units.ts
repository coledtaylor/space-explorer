// Unit system documentation:
// Game-scale units designed for KSP-like orbital mechanics on a canvas.
// 1 game unit (gu) is an abstract distance; camera zoom maps gu → pixels.
// Mass in game mass units (GMU); G=1 so mu = mass directly.
// Time in seconds (real-time dt from requestAnimationFrame, scaled by time warp).
//
// This is NOT SI. G=1 and masses are chosen so that:
//   - Star radii are 3000–10000 gu
//   - Orbital radii are 50000–500000 gu (visible with appropriate zoom)
//   - Circular velocities are 50–200 gu/s at inner orbits
//   - Orbital periods are minutes to hours at game time (scaled by time warp)
//
// Reference scale (KSP-inspired):
//   1 AU ≈ 100,000 gu  (innermost planet orbits at ~0.5–0.8 AU equivalent)

// Gravitational constant (game units) — set to 1 so mu = mass directly
export const G: number = 1;

// 1 AU in game units (reference for scale; orbital radii are set by scaleConfig.ts)
export const AU: number = 100_000;

// Render scale factor (pixels per game unit at default zoom level)
export const SCALE: number = 1.0;
