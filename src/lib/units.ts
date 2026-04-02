// Unit system documentation:
// Game-scale units designed for playable orbital mechanics on a canvas.
// 1 game unit ≈ 1 pixel at default zoom
// Mass in game mass units (tuned so orbital velocities are ~5-30 gu/s)
// Time in seconds (real-time dt from requestAnimationFrame)
//
// This is NOT SI. G=1 and masses are chosen so that:
// - Orbital radii are 200-1200 game units (visible on screen)
// - Circular velocities are 5-30 game units/s (smooth movement)
// - Orbital periods are 30s-5min (fun gameplay pace)

// Gravitational constant (game units)
export const G: number = 1;

// 1 AU in game units (reference only — orbital radii are set directly)
export const AU: number = 1000;

// Render scale factor (pixels per game unit)
export const SCALE: number = 1.0;
