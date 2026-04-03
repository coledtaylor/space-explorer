import { GameObjects, Scene } from 'phaser';
import type { CelestialBodyConfig, Vec2 } from '../types/index.js';
import { getOrbitalPosition } from '../lib/orbit.js';

// Wire-outline style constants
const BODY_LINE_WIDTH = 1.5;
const BODY_LINE_ALPHA = 1.0;

// Minimum visual radius so small moons are still visible on-screen.
const MIN_VISUAL_RADIUS = 4; // pixels

/**
 * Converts a CSS hex color string ("#rrggbb") to a Phaser-compatible
 * 0xRRGGBB integer. Falls back to white if parsing fails.
 */
function parseCssHex(cssColor: string): number {
  const hex = cssColor.replace('#', '');
  const parsed = parseInt(hex, 16);
  return isNaN(parsed) ? 0xffffff : parsed;
}

/**
 * Computes the visual draw radius for a body from its config radius.
 * Bodies span enormous physical sizes (60–261600 km) but must all be
 * distinguishable at canvas scale. We use a log scale clamped to a minimum.
 */
function computeVisualRadius(configRadius: number): number {
  // log10 scale: radius 60 → ~3.4, radius 600 → ~4.1, radius 261600 → ~7.0
  // Multiply by a tuning factor so the star is noticeably larger than planets.
  const logRadius = Math.log10(Math.max(1, configRadius));
  return Math.max(MIN_VISUAL_RADIUS, logRadius * 3);
}

/**
 * A celestial body (star, planet, or moon) rendered as a wire-outline circle.
 *
 * Positions are maintained in screen space. The caller provides:
 *  - `worldOrigin`: the screen-space pixel coordinate of world (0, 0)
 *  - `worldScale`: km-per-pixel factor for converting orbital radii to pixels
 *
 * The star has no parent and is placed at worldOrigin. Planets and moons
 * compute their screen position from orbital math plus parent screen position.
 */
export class CelestialBody extends GameObjects.Graphics {
  private readonly config: CelestialBodyConfig;
  private readonly parent: CelestialBody | null;
  private readonly visualRadius: number;
  private readonly worldScale: number;

  constructor(
    scene: Scene,
    config: CelestialBodyConfig,
    parent: CelestialBody | null,
    worldOrigin: Vec2,
    worldScale: number,
  ) {
    super(scene);
    this.config = config;
    this.parent = parent;
    this.visualRadius = computeVisualRadius(config.radius);
    this.worldScale = worldScale;

    // Star anchors to world origin; orbiting bodies start at worldOrigin too
    // and will be moved by the first updatePosition call.
    this.x = worldOrigin.x;
    this.y = worldOrigin.y;

    scene.add.existing(this);
    this.drawBody();
  }

  private drawBody(): void {
    const color = parseCssHex(this.config.color);
    this.lineStyle(BODY_LINE_WIDTH, color, BODY_LINE_ALPHA);
    this.strokeCircle(0, 0, this.visualRadius);
  }

  /**
   * Updates this body's screen-space position from on-rails orbital math.
   * @param time - elapsed game time in milliseconds
   */
  updatePosition(time: number): void {
    // Star has no orbit — stays fixed at world origin.
    if (this.config.orbitalRadius === 0) {
      return;
    }

    // Orbital math uses seconds; Phaser time is in ms.
    const timeSeconds = time / 1000;

    const localOffset = getOrbitalPosition(
      this.config.orbitalRadius,
      this.config.orbitalPeriod,
      timeSeconds,
    );

    const parentPos = this.parent !== null
      ? this.parent.worldPosition
      : { x: 0, y: 0 };

    this.x = parentPos.x + localOffset.x * this.worldScale;
    this.y = parentPos.y + localOffset.y * this.worldScale;
  }

  /** Current screen-space position, readable by child bodies (e.g. moons). */
  get worldPosition(): Vec2 {
    return { x: this.x, y: this.y };
  }

  /** Visual draw radius in pixels, used by callers for orbit-line sizing. */
  get drawRadius(): number {
    return this.visualRadius;
  }
}
