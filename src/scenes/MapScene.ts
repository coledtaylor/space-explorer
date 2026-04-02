import Phaser from 'phaser';
import type { ManeuverNode } from '../lib/maneuver.js';
import type { MassiveBody, StarSystem, PlanetBody, MoonBody, Vec2 } from '../types/index.js';
import { computeOrbitalElements } from '../lib/orbit.js';

// Registry keys shared between FlightScene and MapScene
export const REGISTRY_KEY_SHIP_X = 'ship.x';
export const REGISTRY_KEY_SHIP_Y = 'ship.y';
export const REGISTRY_KEY_SHIP_VX = 'ship.vx';
export const REGISTRY_KEY_SHIP_VY = 'ship.vy';
export const REGISTRY_KEY_SHIP_ANGLE = 'ship.angle';
export const REGISTRY_KEY_SHIP_FUEL = 'ship.fuel';
export const REGISTRY_KEY_SOI_BODY = 'soi.body';
export const REGISTRY_KEY_SYSTEM = 'star.system';

// Passed from FlightScene via scene data when starting MapScene
export interface MapSceneData {
  soiBody: MassiveBody;
  system: StarSystem;
}

// Map rendering constants
const MAP_PADDING_FACTOR = 1.25;
const PLANET_ORBIT_ALPHA = 0.45;
const MOON_ORBIT_ALPHA = 0.25;
const ORBIT_SEGMENTS = 120;
const SHIP_ORBIT_ALPHA = 0.7;
const SHIP_ORBIT_COLOR = 0x44ddff;
const SHIP_MARKER_COLOR = 0x00ffcc;
const SHIP_MARKER_RADIUS = 6;
const SHIP_VELOCITY_ARROW_LENGTH = 32;
const PLANET_MARKER_RADIUS = 5;
const MOON_MARKER_RADIUS = 3;
const STAR_MARKER_RADIUS = 18;
const HUD_FONT_FAMILY = '"Segoe UI", system-ui, sans-serif';
const HUD_COLOR_PRIMARY = '#b0d8ff';
const HUD_COLOR_MUTED = '#6090b0';
const HUD_MARGIN = 16;
// Zoom lerp speed (fraction of gap closed per second)
const ZOOM_LERP_SPEED = 4.0;

export class MapScene extends Phaser.Scene {
  // Maneuver nodes live here so they persist between map open/close cycles within a session
  private maneuverNodes: ManeuverNode[] = [];

  private mKey!: Phaser.Input.Keyboard.Key;
  private soiLabel!: Phaser.GameObjects.Text;

  private soiBody!: MassiveBody;
  private system!: StarSystem;

  // Graphics layers
  private orbitGfx!: Phaser.GameObjects.Graphics;
  private bodyGfx!: Phaser.GameObjects.Graphics;
  private shipGfx!: Phaser.GameObjects.Graphics;

  // Camera zoom target and current
  private targetZoom: number = 1;

  constructor() {
    super({ key: 'MapScene' });
  }

  init(data: MapSceneData): void {
    this.soiBody = data.soiBody;
    this.system = data.system;
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#000810');

    // Graphics layers (depth ordered: orbits -> bodies -> ship)
    this.orbitGfx = this.add.graphics().setDepth(1);
    this.bodyGfx = this.add.graphics().setDepth(2);
    this.shipGfx = this.add.graphics().setDepth(3);

    // Calculate zoom to fit entire system
    this.targetZoom = this._calculateSystemZoom();
    // Start at a wider zoom for smooth transition in
    this.cameras.main.setZoom(this.targetZoom * 0.4);
    this.cameras.main.centerOn(0, 0);

    // HUD — fixed to screen (scrollFactor 0)
    this.soiLabel = this.add
      .text(HUD_MARGIN, HUD_MARGIN, `SOI: ${this.soiBody?.name ?? '—'}`, {
        fontFamily: HUD_FONT_FAMILY,
        fontSize: '15px',
        color: HUD_COLOR_PRIMARY,
      })
      .setScrollFactor(0)
      .setDepth(10);

    const zoomText = (this.targetZoom * 100).toFixed(1);
    const zoomLabel = this.add
      .text(HUD_MARGIN, HUD_MARGIN + 22, `Zoom: ${zoomText}%`, {
        fontFamily: HUD_FONT_FAMILY,
        fontSize: '12px',
        color: HUD_COLOR_MUTED,
      })
      .setScrollFactor(0)
      .setDepth(10);
    void zoomLabel;

    const hint = this.add
      .text(this.scale.width - HUD_MARGIN, HUD_MARGIN, 'M — return to flight', {
        fontFamily: HUD_FONT_FAMILY,
        fontSize: '12px',
        color: HUD_COLOR_MUTED,
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(10);
    void hint;

    this.mKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.M);

    // Initial render
    this._renderOrbits();
    this._renderBodies();
    this._renderShip();
  }

  update(_time: number, delta: number): void {
    if (Phaser.Input.Keyboard.JustDown(this.mKey)) {
      this._returnToFlight();
      return;
    }

    // Smooth zoom lerp toward target
    const dt = delta / 1000;
    const currentZoom = this.cameras.main.zoom;
    const newZoom = currentZoom + (this.targetZoom - currentZoom) * Math.min(1, ZOOM_LERP_SPEED * dt);
    this.cameras.main.setZoom(newZoom);
  }

  private _returnToFlight(): void {
    this.scene.start('FlightScene');
  }

  // Calculate zoom so the outermost planet orbit fits the viewport with padding
  private _calculateSystemZoom(): number {
    const planets = this.system.planets;
    if (planets.length === 0) return 0.1;

    let maxRadius = 0;
    for (const planet of planets) {
      const { a, e } = planet.orbitalElements;
      // Apoapsis is the farthest point of the orbit
      const apoapsis = a * (1 + e);
      if (apoapsis > maxRadius) maxRadius = apoapsis;
    }

    // Fit within the smaller screen dimension
    const screenHalf = Math.min(this.scale.width, this.scale.height) / 2;
    return screenHalf / (maxRadius * MAP_PADDING_FACTOR);
  }

  // Draw orbital ellipses for planets and moons
  private _renderOrbits(): void {
    this.orbitGfx.clear();

    // Planet orbits around star (origin)
    for (const planet of this.system.planets) {
      const color = Phaser.Display.Color.HexStringToColor(
        this._hueToHexString(planet.hue, 0.6, 0.55),
      ).color;
      this._drawOrbitEllipse(
        this.orbitGfx,
        planet.orbitalElements.a,
        planet.orbitalElements.e,
        planet.orbitalElements.omega,
        0,
        0,
        color,
        PLANET_ORBIT_ALPHA,
      );

      // Moon orbits around parent planet
      for (const moon of planet.moons) {
        const moonColor = Phaser.Display.Color.HexStringToColor(
          this._hueToHexString(moon.hue, 0.4, 0.5),
        ).color;
        this._drawOrbitEllipse(
          this.orbitGfx,
          moon.orbitalElements.a,
          moon.orbitalElements.e,
          moon.orbitalElements.omega,
          planet.x,
          planet.y,
          moonColor,
          MOON_ORBIT_ALPHA,
        );
      }
    }

    // Ship orbit around current SOI body
    this._renderShipOrbitPath();
  }

  // Draw an orbital ellipse using a parametric path
  // The ellipse center is offset by (focusX, focusY) — the SOI body position
  private _drawOrbitEllipse(
    gfx: Phaser.GameObjects.Graphics,
    a: number,
    e: number,
    omega: number,
    focusX: number,
    focusY: number,
    color: number,
    alpha: number,
  ): void {
    // Semi-minor axis
    const b = a * Math.sqrt(1 - e * e);
    // Distance from center to focus
    const c = a * e;

    gfx.lineStyle(1, color, alpha);
    gfx.beginPath();

    for (let i = 0; i <= ORBIT_SEGMENTS; i++) {
      const theta = (i / ORBIT_SEGMENTS) * 2 * Math.PI;
      // Ellipse in perifocal frame, centered at geometric center
      const xPerif = a * Math.cos(theta) - c; // shift so focus is at 0
      const yPerif = b * Math.sin(theta);

      // Rotate by omega
      const cosO = Math.cos(omega);
      const sinO = Math.sin(omega);
      const wx = cosO * xPerif - sinO * yPerif + focusX;
      const wy = sinO * xPerif + cosO * yPerif + focusY;

      if (i === 0) {
        gfx.moveTo(wx, wy);
      } else {
        gfx.lineTo(wx, wy);
      }
    }

    gfx.closePath();
    gfx.strokePath();
  }

  // Draw the ship's orbital path around its current SOI body
  private _renderShipOrbitPath(): void {
    const shipX = this.registry.get(REGISTRY_KEY_SHIP_X) as number | undefined;
    const shipY = this.registry.get(REGISTRY_KEY_SHIP_Y) as number | undefined;
    const shipVx = this.registry.get(REGISTRY_KEY_SHIP_VX) as number | undefined;
    const shipVy = this.registry.get(REGISTRY_KEY_SHIP_VY) as number | undefined;

    if (
      shipX === undefined ||
      shipY === undefined ||
      shipVx === undefined ||
      shipVy === undefined
    ) {
      return;
    }

    // Ship position relative to SOI body
    const relPos: Vec2 = { x: shipX - this.soiBody.x, y: shipY - this.soiBody.y };
    const relVel: Vec2 = { x: shipVx, y: shipVy };
    const mu = this.soiBody.mu;

    // Check if ship is gravitationally bound (negative orbital energy)
    const r = Math.hypot(relPos.x, relPos.y);
    const v2 = relVel.x * relVel.x + relVel.y * relVel.y;
    const epsilon = v2 / 2 - mu / r;
    if (epsilon >= 0 || r < 1e-6) return; // hyperbolic or degenerate

    const elements = computeOrbitalElements(relPos, relVel, mu);
    if (!isFinite(elements.a) || elements.a <= 0 || elements.e >= 1) return;

    this._drawOrbitEllipse(
      this.orbitGfx,
      elements.a,
      elements.e,
      elements.omega,
      this.soiBody.x,
      this.soiBody.y,
      SHIP_ORBIT_COLOR,
      SHIP_ORBIT_ALPHA,
    );
  }

  // Draw the star, planets, and moons as colored circles at current positions
  private _renderBodies(): void {
    this.bodyGfx.clear();

    const star = this.system.star;

    // Star glow
    const starColor = Phaser.Display.Color.HexStringToColor(
      this._hueToHexString(star.hue, 0.8, 0.6),
    ).color;
    this.bodyGfx.fillStyle(starColor, 0.18);
    this.bodyGfx.fillCircle(0, 0, STAR_MARKER_RADIUS * 2.5);

    // Star body
    this.bodyGfx.fillStyle(starColor, 1.0);
    this.bodyGfx.fillCircle(0, 0, STAR_MARKER_RADIUS);

    // Planets
    for (const planet of this.system.planets) {
      const planetColor = Phaser.Display.Color.HexStringToColor(
        this._hueToHexString(planet.hue, 0.5, 0.55),
      ).color;
      this.bodyGfx.fillStyle(planetColor, 1.0);
      this.bodyGfx.fillCircle(planet.x, planet.y, PLANET_MARKER_RADIUS);

      // Moons
      for (const moon of planet.moons) {
        const moonColor = Phaser.Display.Color.HexStringToColor(
          this._hueToHexString(moon.hue, 0.3, 0.5),
        ).color;
        this.bodyGfx.fillStyle(moonColor, 0.85);
        this.bodyGfx.fillCircle(moon.x, moon.y, MOON_MARKER_RADIUS);
      }
    }
  }

  // Draw ship marker and velocity arrow
  private _renderShip(): void {
    this.shipGfx.clear();

    const shipX = this.registry.get(REGISTRY_KEY_SHIP_X) as number | undefined;
    const shipY = this.registry.get(REGISTRY_KEY_SHIP_Y) as number | undefined;
    const shipVx = this.registry.get(REGISTRY_KEY_SHIP_VX) as number | undefined;
    const shipVy = this.registry.get(REGISTRY_KEY_SHIP_VY) as number | undefined;

    if (shipX === undefined || shipY === undefined) return;

    // Outer ring for visibility
    this.shipGfx.lineStyle(2, SHIP_MARKER_COLOR, 0.5);
    this.shipGfx.strokeCircle(shipX, shipY, SHIP_MARKER_RADIUS + 4);

    // Ship marker dot
    this.shipGfx.fillStyle(SHIP_MARKER_COLOR, 1.0);
    this.shipGfx.fillCircle(shipX, shipY, SHIP_MARKER_RADIUS);

    // Velocity direction arrow (skip if velocity is essentially zero)
    if (shipVx !== undefined && shipVy !== undefined) {
      const speed = Math.hypot(shipVx, shipVy);
      if (speed > 0.01) {
        const nx = shipVx / speed;
        const ny = shipVy / speed;
        const arrowEndX = shipX + nx * SHIP_VELOCITY_ARROW_LENGTH;
        const arrowEndY = shipY + ny * SHIP_VELOCITY_ARROW_LENGTH;

        this.shipGfx.lineStyle(2, SHIP_MARKER_COLOR, 0.85);
        this.shipGfx.beginPath();
        this.shipGfx.moveTo(shipX, shipY);
        this.shipGfx.lineTo(arrowEndX, arrowEndY);
        this.shipGfx.strokePath();

        // Arrowhead
        const headLen = 6;
        const headAngle = Math.PI / 6;
        const angle = Math.atan2(ny, nx);
        this.shipGfx.beginPath();
        this.shipGfx.moveTo(arrowEndX, arrowEndY);
        this.shipGfx.lineTo(
          arrowEndX - headLen * Math.cos(angle - headAngle),
          arrowEndY - headLen * Math.sin(angle - headAngle),
        );
        this.shipGfx.moveTo(arrowEndX, arrowEndY);
        this.shipGfx.lineTo(
          arrowEndX - headLen * Math.cos(angle + headAngle),
          arrowEndY - headLen * Math.sin(angle + headAngle),
        );
        this.shipGfx.strokePath();
      }
    }
  }

  // Convert HSL hue + saturation + lightness to a hex color string (#rrggbb)
  private _hueToHexString(hue: number, s: number, l: number): string {
    const h = hue / 360;
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const r = Math.round(this._hueChannel(p, q, h + 1 / 3) * 255);
    const g = Math.round(this._hueChannel(p, q, h) * 255);
    const b = Math.round(this._hueChannel(p, q, h - 1 / 3) * 255);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  private _hueChannel(p: number, q: number, t: number): number {
    let tc = t;
    if (tc < 0) tc += 1;
    if (tc > 1) tc -= 1;
    if (tc < 1 / 6) return p + (q - p) * 6 * tc;
    if (tc < 1 / 2) return q;
    if (tc < 2 / 3) return p + (q - p) * (2 / 3 - tc) * 6;
    return p;
  }

  // Expose maneuver nodes for future tasks (Task 3 will interact with them)
  getManeuverNodes(): ManeuverNode[] {
    return this.maneuverNodes;
  }

  // Helpers for type narrowing — needed because planet/moon have different parent types
  private _isPlanet(body: MassiveBody): body is PlanetBody {
    return body.kind === 'planet';
  }

  private _isMoon(body: MassiveBody): body is MoonBody {
    return body.kind === 'moon';
  }

  // Silence unused-variable warnings for narrowing helpers used in future tasks
  private _assertNarrowingHelpers(): void {
    void this._isPlanet;
    void this._isMoon;
  }
}
