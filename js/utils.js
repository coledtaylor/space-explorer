export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function dist(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

export function randomRange(min, max) {
  return Math.random() * (max - min) + min;
}

export function randomInt(min, max) {
  return Math.floor(randomRange(min, max + 1));
}

export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

export function seededRandom(seed) {
  let s = seed;
  return function () {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

export function hslToRgb(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r, g, b;
  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
}

// vec2 helpers — vectors are plain {x, y} objects

export function vec2Add(a, b) {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function vec2Sub(a, b) {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function vec2Scale(v, s) {
  return { x: v.x * s, y: v.y * s };
}

export function vec2Mag(v) {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

export function vec2Normalize(v) {
  const mag = vec2Mag(v);
  if (mag === 0) return { x: 0, y: 0 };
  return { x: v.x / mag, y: v.y / mag };
}

export function vec2Dot(a, b) {
  return a.x * b.x + a.y * b.y;
}

// Normalize angle to [0, 2*PI)
export function mod2pi(angle) {
  const twoPi = 2 * Math.PI;
  return ((angle % twoPi) + twoPi) % twoPi;
}
