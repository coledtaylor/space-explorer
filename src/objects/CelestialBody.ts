import { GameObjects, Scene } from 'phaser';
import type { CelestialBodyConfig, Vec2 } from '../types/index.js';
import { getOrbitalPosition } from '../lib/orbit.js';
import {
  STAR_SCALE_FACTOR,
  BODY_SCALE_FACTOR,
  MIN_BODY_RADIUS,
  MIN_SCREEN_RADIUS,
  BODY_LINE_WIDTH,
  BODY_LINE_ALPHA,
  BODY_FILL_ALPHA,
} from '../lib/scaleConfig.js';

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
 * Computes the visual draw radius in world-space pixels from the body's
 * physical radius. Bodies are visually exaggerated so they're substantial
 * relative to orbit distances — same approach KSP uses. Without this,
 * Kerbin (600km) at WORLD_SCALE 1e-3 would be 0.6px.
 *
 * Visual scale: sqrt(radius) * multiplier gives a nice spread where the
 * star is much bigger than planets, and planets are bigger than moons,
 * without the star being overwhelmingly huge.
 */
function computeVisualRadius(config: CelestialBodyConfig): number {
  if (config.kind === 'star') {
    return Math.sqrt(config.radius) * STAR_SCALE_FACTOR;
  }
  const scaled = Math.sqrt(config.radius) * BODY_SCALE_FACTOR;
  return Math.max(MIN_BODY_RADIUS, scaled);
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
    this.visualRadius = computeVisualRadius(config);
    this.worldScale = worldScale;

    // Star anchors to world origin; orbiting bodies start at worldOrigin too
    // and will be moved by the first updatePosition call.
    this.x = worldOrigin.x;
    this.y = worldOrigin.y;

    scene.add.existing(this);
    this.drawBody();
  }

  private drawBody(drawRadius: number = this.visualRadius): void {
    const color = parseCssHex(this.config.color);
    this.fillStyle(color, BODY_FILL_ALPHA);
    this.fillCircle(0, 0, drawRadius);
    this.lineStyle(BODY_LINE_WIDTH, color, BODY_LINE_ALPHA);
    this.strokeCircle(0, 0, drawRadius);
  }

  /**
   * Redraws this body ensuring it stays visible when zoomed far out.
   * The body keeps its world-space size, but gets a minimum screen-space
   * radius so it doesn't vanish into a sub-pixel dot.
   */
  updateVisualScale(cameraZoom: number): void {
    // Minimum world-space radius to guarantee MIN_SCREEN_RADIUS on screen.
    const minWorldRadius = MIN_SCREEN_RADIUS / cameraZoom;
    const worldRadius = Math.max(this.visualRadius, minWorldRadius);
    this.clear();
    this.drawBody(worldRadius);
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

  /** Exposes body config for physics calculations (e.g. mass lookup). */
  get bodyConfig(): CelestialBodyConfig {
    return this.config;
  }
}
