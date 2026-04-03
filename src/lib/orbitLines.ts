// Orbit-line rendering helpers — pure Phaser Graphics drawing.
// No game logic here; just functions that produce or update orbit-line circles.

import { GameObjects, Scene } from 'phaser';
import type { CelestialBodyConfig } from '../types/index.js';

const ORBIT_LINE_WIDTH = 0.5;
const ORBIT_LINE_ALPHA = 0.25;

/**
 * Converts a CSS hex color string ("#rrggbb") to a Phaser integer.
 * Falls back to white if parsing fails.
 */
function parseCssHex(cssColor: string): number {
  const hex = cssColor.replace('#', '');
  const parsed = parseInt(hex, 16);
  return isNaN(parsed) ? 0xffffff : parsed;
}

/**
 * Creates a Graphics object that draws a dim orbit-line circle for `config`.
 * The circle is drawn around the local origin (0, 0) of the Graphics object,
 * so the caller can reposition the Graphics to follow the parent body.
 *
 * Returns null for bodies with no orbit (e.g. the central star).
 */
export function createOrbitLine(
  scene: Scene,
  config: CelestialBodyConfig,
  worldScale: number,
): GameObjects.Graphics | null {
  if (config.orbitalRadius === 0) {
    return null;
  }

  const g = scene.add.graphics();
  const color = parseCssHex(config.color);
  g.lineStyle(ORBIT_LINE_WIDTH, color, ORBIT_LINE_ALPHA);
  g.strokeCircle(0, 0, config.orbitalRadius * worldScale);
  return g;
}
