// Orbit-line rendering helpers — pure Phaser Graphics drawing.
// No game logic here; just functions that produce or update orbit-line circles.

import { GameObjects, Scene } from 'phaser';
import type { CelestialBodyConfig } from '../types/index.js';
import {
  ORBIT_LINE_BASE_WIDTH,
  ORBIT_LINE_ALPHA,
  MAX_ORBIT_LINE_WIDTH,
} from './scaleConfig.js';

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
  drawOrbitCircle(g, config, worldScale, 1);
  return g;
}

/**
 * Redraws an orbit-line Graphics object with a zoom-compensated line width.
 * Call once per frame to maintain consistent screen-space thickness at all
 * zoom levels. The line width is `ORBIT_LINE_BASE_WIDTH / cameraZoom`, clamped
 * so it never exceeds MAX_ORBIT_LINE_WIDTH screen pixels.
 */
export function updateOrbitLineZoom(
  graphics: GameObjects.Graphics,
  config: CelestialBodyConfig,
  worldScale: number,
  cameraZoom: number,
): void {
  graphics.clear();
  drawOrbitCircle(graphics, config, worldScale, cameraZoom);
}

/** Internal: draws the orbit circle with zoom-compensated line width. */
function drawOrbitCircle(
  g: GameObjects.Graphics,
  config: CelestialBodyConfig,
  worldScale: number,
  cameraZoom: number,
): void {
  const color = parseCssHex(config.color);
  // World-space width that maps to ORBIT_LINE_BASE_WIDTH screen pixels.
  const worldWidth = ORBIT_LINE_BASE_WIDTH / cameraZoom;
  // Clamp: equivalent world-space width for MAX_ORBIT_LINE_WIDTH screen pixels.
  const maxWorldWidth = MAX_ORBIT_LINE_WIDTH / cameraZoom;
  const lineWidth = Math.min(worldWidth, maxWorldWidth);
  g.lineStyle(lineWidth, color, ORBIT_LINE_ALPHA);
  g.strokeCircle(0, 0, config.orbitalRadius * worldScale);
}
