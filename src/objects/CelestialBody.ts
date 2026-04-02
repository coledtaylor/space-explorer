import Phaser from 'phaser';
import type { CelestialBody, StarBody, PlanetBody, MoonBody, AnomalyBody } from '../types/index';
import { hslToRgb } from '../lib/utils';

// Convert separate [r,g,b] components (0-255 each) to a Phaser hex color integer
function rgb(r: number, g: number, b: number): number {
  return (r << 16) | (g << 8) | b;
}

// Parse a CSS rgb/rgba string like "rgb(100, 200, 50)" into a Phaser hex color integer.
// Falls back to white on parse failure.
function parseCssRgb(cssColor: string): number {
  const match = cssColor.match(/rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return 0xffffff;
  return rgb(parseInt(match[1]), parseInt(match[2]), parseInt(match[3]));
}

// Parse an hsl(h,s%,l%) string into a Phaser hex color integer.
function parseCssHsl(cssColor: string): number {
  const match = cssColor.match(/hsl\(\s*([\d.]+),\s*([\d.]+)%,\s*([\d.]+)%/);
  if (!match) return 0xaaaaaa;
  const [r, g, b] = hslToRgb(parseFloat(match[1]), parseFloat(match[2]) / 100, parseFloat(match[3]) / 100);
  return rgb(r, g, b);
}

// Lighten an hsl color string by increasing the lightness component.
function lightenHslColor(cssColor: string, amount: number): number {
  const match = cssColor.match(/hsl\(\s*([\d.]+),\s*([\d.]+)%,\s*([\d.]+)%/);
  if (match) {
    const [r, g, b] = hslToRgb(
      parseFloat(match[1]),
      parseFloat(match[2]) / 100,
      Math.min(1, parseFloat(match[3]) / 100 + amount / 100),
    );
    return rgb(r, g, b);
  }
  // For rgb colors, parse and blend toward white
  const rgbMatch = cssColor.match(/rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)/);
  if (rgbMatch) {
    const factor = amount / 100;
    const r2 = Math.min(255, Math.round(parseInt(rgbMatch[1]) + (255 - parseInt(rgbMatch[1])) * factor));
    const g2 = Math.min(255, Math.round(parseInt(rgbMatch[2]) + (255 - parseInt(rgbMatch[2])) * factor));
    const b2 = Math.min(255, Math.round(parseInt(rgbMatch[3]) + (255 - parseInt(rgbMatch[3])) * factor));
    return rgb(r2, g2, b2);
  }
  return 0xffffff;
}

// Maximum screen-space radius for gradient circles. Drawing gradient circles
// much larger than the visible screen wastes GPU fill rate with no visual benefit.
// At 2000px, this comfortably covers a 1440p display diagonal (~2560px) with margin.
const MAX_GRADIENT_RADIUS = 2000;

// Draw a radial gradient approximation using concentric circles.
// innerColor and outerColor are Phaser hex integers.
// Draws `steps` concentric circles blending from inner to outer color/alpha.
// outerRadius is clamped to MAX_GRADIENT_RADIUS to avoid massive off-screen geometry
// when a body's screen-space radius exceeds the visible area.
function drawRadialGradient(
  gfx: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  innerRadius: number,
  outerRadius: number,
  innerColor: number,
  outerColor: number,
  innerAlpha: number,
  outerAlpha: number,
  steps: number,
): void {
  // Clamp to avoid drawing massive off-screen geometry when zoomed in on large bodies
  const clampedOuter = Math.min(outerRadius, MAX_GRADIENT_RADIUS);
  // If the entire gradient is beyond the cap, skip drawing entirely
  if (innerRadius >= clampedOuter) return;
  outerRadius = clampedOuter;

  for (let i = steps; i >= 0; i--) {
    const t = i / steps;
    const r = innerRadius + (outerRadius - innerRadius) * t;
    // Interpolate color components
    const ir = (innerColor >> 16) & 0xff;
    const ig = (innerColor >> 8) & 0xff;
    const ib = innerColor & 0xff;
    const or = (outerColor >> 16) & 0xff;
    const og = (outerColor >> 8) & 0xff;
    const ob = outerColor & 0xff;
    const cr = Math.round(or + (ir - or) * t);
    const cg = Math.round(og + (ig - og) * t);
    const cb = Math.round(ob + (ib - ob) * t);
    const alpha = outerAlpha + (innerAlpha - outerAlpha) * t;
    gfx.fillStyle(rgb(cr, cg, cb), alpha);
    gfx.fillCircle(cx, cy, r);
  }
}

export class CelestialBodyRenderer {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Draw a celestial body onto a Graphics object.
   * sx/sy are screen-space coordinates. zoom is the current camera zoom.
   * time is the game time in seconds (used for animated effects).
   */
  drawBody(
    gfx: Phaser.GameObjects.Graphics,
    body: CelestialBody,
    sx: number,
    sy: number,
    time: number,
    zoom: number,
  ): void {
    const dr = body.radius * zoom;

    // Cull bodies that are entirely off-screen
    const { width, height } = this.scene.scale;
    const margin = dr * 3 + width * (1 / zoom);
    if (sx < -margin || sx > width + margin || sy < -margin || sy > height + margin) return;

    switch (body.kind) {
      case 'star':
        this._drawStar(gfx, sx, sy, body, time, zoom);
        break;
      case 'planet':
        this._drawPlanet(gfx, sx, sy, body, time, zoom);
        break;
      case 'moon':
        this._drawMoon(gfx, sx, sy, body, zoom);
        break;
      case 'anomaly':
        this._drawAnomaly(gfx, sx, sy, body, time, zoom);
        break;
    }

    // Name label — skip if too small
    if (body.kind === 'moon' && dr < 4) return;
    if (dr < 1.5) return;

    this.scene.add
      .text(sx, sy + dr + 12, body.name, {
        fontFamily: '"Segoe UI", system-ui, sans-serif',
        fontSize: '10px',
        color: body.kind === 'moon' ? 'rgba(200,210,220,0.35)' : 'rgba(200,210,220,0.5)',
      })
      .setOrigin(0.5, 0);
  }

  private _drawStar(
    gfx: Phaser.GameObjects.Graphics,
    sx: number,
    sy: number,
    body: StarBody,
    time: number,
    zoom: number,
  ): void {
    const r = body.radius * zoom;
    // Cap glow at MAX_GRADIENT_RADIUS so a screen-filling star doesn't draw a
    // 3× screen-size gradient. The animated pulse adds at most a few pixels.
    const rawGlowSize = r * 3 + Math.sin(time * 0.5) * 5 * zoom;
    const glowSize = Math.min(rawGlowSize, MAX_GRADIENT_RADIUS);

    // Outer glow — radial gradient from glowColor at inner edge to transparent
    const glowColor = parseCssHsl(body.color);
    drawRadialGradient(gfx, sx, sy, r * 0.5, glowSize, glowColor, glowColor, 0.3, 0, 12);

    // Star body — radial gradient from white at center to body color
    const bodyColor = parseCssRgb(body.color) || parseCssHsl(body.color);
    drawRadialGradient(gfx, sx, sy, 0, r, 0xffffff, bodyColor, 1, 0.8, 8);
  }

  private _drawPlanet(
    gfx: Phaser.GameObjects.Graphics,
    sx: number,
    sy: number,
    body: PlanetBody,
    time: number,
    zoom: number,
  ): void {
    const r = body.radius * zoom;

    // Drop shadow
    gfx.fillStyle(0x000000, 0.3);
    gfx.fillCircle(sx + 2 * zoom, sy + 2 * zoom, r);

    // Planet body — radial gradient from lightened color to base color
    const baseColor = parseCssRgb(body.color) || parseCssHsl(body.color);
    const lightColor = lightenHslColor(body.color, 40);
    drawRadialGradient(gfx, sx - r * 0.3, sy - r * 0.3, 0, r * 1.2, lightColor, baseColor, 1, 1, 6);

    // Subtype-specific effects
    switch (body.subtype) {
      case 'Gas Giant':
        this._drawGasGiantEffects(gfx, sx, sy, body, zoom);
        break;
      case 'Ice World':
        this._drawIceWorldEffects(gfx, sx, sy, body, time, zoom);
        break;
      case 'Volcanic':
        this._drawVolcanicEffects(gfx, sx, sy, body, zoom);
        break;
      case 'Ocean World':
        this._drawOceanWorldEffects(gfx, sx, sy, body, zoom);
        break;
      case 'Desert':
        this._drawDesertEffects(gfx, sx, sy, body, zoom);
        break;
      case 'Lush':
        this._drawLushEffects(gfx, sx, sy, body, zoom);
        break;
      case 'Rocky':
        this._drawRockyEffects(gfx, sx, sy, body, zoom);
        break;
    }
  }

  private _drawGasGiantEffects(
    gfx: Phaser.GameObjects.Graphics,
    sx: number,
    sy: number,
    body: PlanetBody,
    zoom: number,
  ): void {
    const r = body.radius * zoom;
    // Cloud bands — drawn as horizontal rectangles clipped to the planet circle area
    // Phaser Graphics has no clip path, so we approximate with alpha rects
    const bandCount = 4;
    for (let i = 0; i < bandCount; i++) {
      const yOff = -r + (i / bandCount) * r * 2;
      const bandH = (r * 2) / bandCount;
      const alpha = i % 2 === 0 ? 0.18 : 0.08;
      const [hr, hg, hb] = hslToRgb(body.hue, 0.6, i % 2 === 0 ? 0.75 : 0.45);
      gfx.fillStyle(rgb(hr, hg, hb), alpha);
      gfx.fillRect(sx - r, sy + yOff, r * 2, bandH);
    }

    // Ring system — back half then front half
    const ringRx = r * 1.6;
    const ringRy = r * 0.35;
    const [ringR, ringG, ringB] = hslToRgb(body.hue, 0.5, 0.7);
    const ringColor = rgb(ringR, ringG, ringB);
    const ringLineWidth = Math.max(2 * zoom, r * 0.12);

    // Back arc (bottom half of ellipse)
    gfx.lineStyle(ringLineWidth, ringColor, 0.35);
    gfx.beginPath();
    for (let a = Math.PI; a <= Math.PI * 2; a += 0.05) {
      const px = sx + Math.cos(a + 0.35) * ringRx;
      const py = sy + Math.sin(a + 0.35) * ringRy;
      if (a === Math.PI) gfx.moveTo(px, py);
      else gfx.lineTo(px, py);
    }
    gfx.strokePath();

    // Front arc (top half of ellipse, over planet)
    gfx.lineStyle(ringLineWidth, ringColor, 0.5);
    gfx.beginPath();
    for (let a = 0; a <= Math.PI; a += 0.05) {
      const px = sx + Math.cos(a + 0.35) * ringRx;
      const py = sy + Math.sin(a + 0.35) * ringRy;
      if (a === 0) gfx.moveTo(px, py);
      else gfx.lineTo(px, py);
    }
    gfx.strokePath();
  }

  private _drawIceWorldEffects(
    gfx: Phaser.GameObjects.Graphics,
    sx: number,
    sy: number,
    body: PlanetBody,
    time: number,
    zoom: number,
  ): void {
    const r = body.radius * zoom;
    // Faint blue-white outer glow
    drawRadialGradient(gfx, sx, sy, r * 0.8, r * 1.6, 0xc8e6ff, 0xc8e6ff, 0.15, 0, 6);

    // Animated specular glint
    const glintAngle = time * 0.4;
    const glintX = sx + Math.cos(glintAngle) * r * 0.3;
    const glintY = sy + Math.sin(glintAngle) * r * 0.2 - r * 0.25;
    const glintR = Math.max(1.5 * zoom, r * 0.12);
    drawRadialGradient(gfx, glintX, glintY, 0, glintR, 0xffffff, 0xffffff, 0.9, 0, 4);
  }

  private _drawVolcanicEffects(
    gfx: Phaser.GameObjects.Graphics,
    sx: number,
    sy: number,
    body: PlanetBody,
    zoom: number,
  ): void {
    const r = body.radius * zoom;
    // Red-orange heat glow
    drawRadialGradient(gfx, sx, sy, r * 0.85, r * 1.55, 0xff5000, 0xff5000, 0.18, 0, 6);

    // Lava spots
    const spots = [
      { angle: body.hue * 0.0175, dist: 0.5 },
      { angle: body.hue * 0.0175 + 2.1, dist: 0.45 },
      { angle: body.hue * 0.0175 + 4.3, dist: 0.55 },
    ];
    for (const spot of spots) {
      const lx = sx + Math.cos(spot.angle) * r * spot.dist;
      const ly = sy + Math.sin(spot.angle) * r * spot.dist;
      const lr = Math.max(1.5 * zoom, r * 0.1);
      gfx.fillStyle(0xffb400, 0.85);
      gfx.fillCircle(lx, ly, lr);
    }
  }

  private _drawOceanWorldEffects(
    gfx: Phaser.GameObjects.Graphics,
    sx: number,
    sy: number,
    body: PlanetBody,
    zoom: number,
  ): void {
    const r = body.radius * zoom;
    // Wave-like bands approximated as horizontal rects
    for (let i = 0; i < 3; i++) {
      const yOff = -r * 0.5 + i * r * 0.4;
      gfx.fillStyle(0x1e64c8, 0.12);
      gfx.fillRect(sx - r, sy + yOff, r * 2, r * 0.18);
    }
    // Atmosphere ring
    gfx.lineStyle(3 * zoom, 0x50a0ff, 0.35);
    gfx.strokeCircle(sx, sy, r + 4 * zoom);
  }

  private _drawDesertEffects(
    gfx: Phaser.GameObjects.Graphics,
    sx: number,
    sy: number,
    body: PlanetBody,
    zoom: number,
  ): void {
    const r = body.radius * zoom;
    // Warm dust haze glow
    drawRadialGradient(gfx, sx, sy, r * 0.9, r * 1.5, 0xc88c3c, 0xc88c3c, 0.12, 0, 5);
    // Sandy bands
    for (let i = 0; i < 3; i++) {
      const yOff = -r * 0.6 + i * r * 0.45;
      gfx.fillStyle(0x502800, 0.12);
      gfx.fillRect(sx - r, sy + yOff, r * 2, r * 0.15);
    }
  }

  private _drawLushEffects(
    gfx: Phaser.GameObjects.Graphics,
    sx: number,
    sy: number,
    body: PlanetBody,
    zoom: number,
  ): void {
    const r = body.radius * zoom;
    // Green atmosphere ring
    gfx.lineStyle(2 * zoom, 0x50c850, 0.3);
    gfx.strokeCircle(sx, sy, r + 3 * zoom);

    // Continent-like darker spots
    const continents = [
      { angle: body.hue * 0.0175, arcLen: 0.9 },
      { angle: body.hue * 0.0175 + 2.3, arcLen: 0.7 },
      { angle: body.hue * 0.0175 + 4.1, arcLen: 0.6 },
    ];
    for (const c of continents) {
      const cx2 = sx + Math.cos(c.angle) * r * 0.4;
      const cy2 = sy + Math.sin(c.angle) * r * 0.4;
      gfx.fillStyle(0x145014, 0.22);
      gfx.fillCircle(cx2, cy2, r * 0.32);
    }
  }

  private _drawRockyEffects(
    gfx: Phaser.GameObjects.Graphics,
    sx: number,
    sy: number,
    body: PlanetBody,
    zoom: number,
  ): void {
    const r = body.radius * zoom;
    // Crater marks
    const craters = [
      { angle: body.hue * 0.0175, dist: 0.45 },
      { angle: body.hue * 0.0175 + 2.0, dist: 0.5 },
      { angle: body.hue * 0.0175 + 3.8, dist: 0.38 },
    ];
    for (const crater of craters) {
      const cx2 = sx + Math.cos(crater.angle) * r * crater.dist;
      const cy2 = sy + Math.sin(crater.angle) * r * crater.dist;
      const cr = Math.max(1.5 * zoom, r * 0.14);
      gfx.fillStyle(0x000000, 0.25);
      gfx.fillCircle(cx2, cy2, cr);
      gfx.lineStyle(zoom, 0x000000, 0.15);
      gfx.strokeCircle(cx2, cy2, cr);
    }
  }

  private _drawMoon(
    gfx: Phaser.GameObjects.Graphics,
    sx: number,
    sy: number,
    body: MoonBody,
    zoom: number,
  ): void {
    const r = body.radius * zoom;

    // Base gradient — simpler than planets, no atmosphere
    const baseColor = parseCssRgb(body.color) || parseCssHsl(body.color);
    const lightColor = lightenHslColor(body.color, 25);
    drawRadialGradient(gfx, sx - r * 0.25, sy - r * 0.25, 0, r * 1.1, lightColor, baseColor, 1, 1, 5);

    // Crater marks
    const craters = [
      { angle: body.hue * 0.0175, dist: 0.42 },
      { angle: body.hue * 0.0175 + 2.2, dist: 0.48 },
      { angle: body.hue * 0.0175 + 4.5, dist: 0.35 },
    ];
    for (const crater of craters) {
      const cx2 = sx + Math.cos(crater.angle) * r * crater.dist;
      const cy2 = sy + Math.sin(crater.angle) * r * crater.dist;
      const cr = Math.max(zoom, r * 0.12);
      gfx.fillStyle(0x000000, 0.3);
      gfx.fillCircle(cx2, cy2, cr);
    }

    // Faint shadow on one side for lit appearance
    drawRadialGradient(
      gfx,
      sx + r * 0.4,
      sy + r * 0.2,
      0,
      r,
      0x000000,
      0x000000,
      0,
      0.45,
      5,
    );
  }

  private _drawAnomaly(
    gfx: Phaser.GameObjects.Graphics,
    sx: number,
    sy: number,
    body: AnomalyBody,
    time: number,
    zoom: number,
  ): void {
    const br = body.radius * zoom;

    // Pulsing rings
    for (let i = 0; i < 3; i++) {
      const r = br + i * 10 * zoom + Math.sin(time * 2 + i) * 5 * zoom;
      const alpha = 0.3 - i * 0.08;
      gfx.lineStyle(2 * zoom, 0xb040ff, alpha);
      gfx.strokeCircle(sx, sy, r);
    }

    // Core — radial gradient from light purple to transparent
    drawRadialGradient(gfx, sx, sy, 0, br, 0xc896ff, 0xb040ff, 0.8, 0, 6);
  }
}
