import Phaser from 'phaser';
import type { ManeuverNode } from '../lib/maneuver.js';
import {
  createManeuverNode,
  getNodeWorldPosition,
  getHandlePositions,
  hitTestHandles,
  updateBurnFromDrag,
  getPostBurnState,
  getManeuverDeltaV,
} from '../lib/maneuver.js';
import { propagateTrajectory } from '../lib/trajectory.js';
import { updateBodyPositions } from '../lib/celestial.js';
import { computeOrbitalElements } from '../lib/orbit.js';
import { getWarpRate, increaseWarp, decreaseWarp, resetWarp, WARP_STEPS } from '../lib/timewarp.js';
import type { MassiveBody, StarSystem, PlanetBody, MoonBody, Vec2, ShipState } from '../types/index.js';

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
// Screen-pixel sizes for markers (compensated by 1/zoom at render time)
const SHIP_MARKER_RADIUS_PX = 6;
const SHIP_VELOCITY_ARROW_LENGTH_PX = 32;
// Minimum pixel size for planet/moon/star markers at any zoom
const MIN_PLANET_MARKER_PX = 5;
const MIN_MOON_MARKER_PX = 3;
const MIN_STAR_MARKER_PX = 10;
// Legacy constants kept for non-zoom-compensated uses
const SHIP_MARKER_RADIUS = 6;
const SHIP_VELOCITY_ARROW_LENGTH = 32;
const PLANET_MARKER_RADIUS = 5;
const MOON_MARKER_RADIUS = 3;
const STAR_MARKER_RADIUS = 18;
// SOI boundary circles on the map
const SOI_CIRCLE_COLOR = 0x8899aa;
const SOI_CIRCLE_ALPHA = 0.15;
// Body label font size in screen pixels (scaled by 1/zoom for constant screen size)
const BODY_LABEL_FONT_PX = 11;
const HUD_FONT_FAMILY = '"Segoe UI", system-ui, sans-serif';
const HUD_COLOR_PRIMARY = '#b0d8ff';
const HUD_COLOR_MUTED = '#6090b0';
const HUD_MARGIN = 16;
// Zoom lerp speed (fraction of gap closed per second)
const ZOOM_LERP_SPEED = 4.0;

// Maneuver node rendering
const NODE_CIRCLE_RADIUS = 8;
const NODE_CIRCLE_COLOR = 0xffaa00;
const NODE_CIRCLE_ALPHA = 0.9;
const HANDLE_PROGRADE_COLOR = 0x00ff88;
const HANDLE_RETROGRADE_COLOR = 0xff4444;
const HANDLE_NORMAL_COLOR = 0x88aaff;
const HANDLE_RADIAL_COLOR = 0xffcc44;
const HANDLE_RADIUS = 5;
const HANDLE_LINE_ALPHA = 0.75;

// Trajectory prediction rendering
const TRAJECTORY_DASH_LEN = 8;
const TRAJECTORY_GAP_LEN = 5;
const TRAJECTORY_COLOR = 0xff8800;
const TRAJECTORY_ALPHA = 0.65;
const TRAJECTORY_LINE_WIDTH = 1.5;
const SOI_MARKER_COLOR = 0xffffff;
const SOI_MARKER_RADIUS = 6;
const SOI_MARKER_ALPHA = 0.8;

// Orbit click hit-test tolerance in world units (before zoom)
const ORBIT_HIT_TOLERANCE = 12;

// Dashed-path segment step size in world units
const DASH_STEP = 8;

export class MapScene extends Phaser.Scene {
  // Maneuver nodes live here so they persist between map open/close cycles within a session
  private maneuverNodes: ManeuverNode[] = [];

  private mKey!: Phaser.Input.Keyboard.Key;
  private warpUpKey!: Phaser.Input.Keyboard.Key;
  private warpDownKey!: Phaser.Input.Keyboard.Key;

  private soiLabel!: Phaser.GameObjects.Text;
  private warpLabel!: Phaser.GameObjects.Text;
  private dvLabel!: Phaser.GameObjects.Text;

  private soiBody!: MassiveBody;
  private system!: StarSystem;

  // Graphics layers
  private orbitGfx!: Phaser.GameObjects.Graphics;
  private bodyGfx!: Phaser.GameObjects.Graphics;
  private shipGfx!: Phaser.GameObjects.Graphics;
  private nodeGfx!: Phaser.GameObjects.Graphics;
  private trajectoryGfx!: Phaser.GameObjects.Graphics;

  // Camera zoom target and current
  private targetZoom: number = 1;

  // Drag state
  private dragNode: ManeuverNode | null = null;
  private dragHandle: ReturnType<typeof hitTestHandles> = null;
  private dragLastWorld: Vec2 | null = null;

  // Orbit elements for ship — cached per update so click-test can use them
  private shipOrbitalElements: ReturnType<typeof computeOrbitalElements> | null = null;

  constructor() {
    super({ key: 'MapScene' });
  }

  init(data: MapSceneData): void {
    this.soiBody = data.soiBody;
    this.system = data.system;
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#000810');

    // Graphics layers (depth ordered: trajectory -> orbits -> bodies -> nodes -> ship)
    this.trajectoryGfx = this.add.graphics().setDepth(1);
    this.orbitGfx = this.add.graphics().setDepth(2);
    this.bodyGfx = this.add.graphics().setDepth(3);
    this.nodeGfx = this.add.graphics().setDepth(4);
    this.shipGfx = this.add.graphics().setDepth(5);

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
      .text(this.scale.width - HUD_MARGIN, HUD_MARGIN, 'M — return to flight | , / . — time warp', {
        fontFamily: HUD_FONT_FAMILY,
        fontSize: '12px',
        color: HUD_COLOR_MUTED,
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(10);
    void hint;

    // Warp label (bottom-left)
    this.warpLabel = this.add
      .text(HUD_MARGIN, this.scale.height - HUD_MARGIN - 40, `Warp: ${getWarpRate()}x`, {
        fontFamily: HUD_FONT_FAMILY,
        fontSize: '14px',
        color: HUD_COLOR_PRIMARY,
      })
      .setOrigin(0, 1)
      .setScrollFactor(0)
      .setDepth(10);

    // Delta-V budget label (bottom-left, above warp label)
    this.dvLabel = this.add
      .text(HUD_MARGIN, this.scale.height - HUD_MARGIN - 60, 'Delta-V: 0.00 m/s', {
        fontFamily: HUD_FONT_FAMILY,
        fontSize: '14px',
        color: '#ffaa44',
      })
      .setOrigin(0, 1)
      .setScrollFactor(0)
      .setDepth(10);

    // Keyboard controls
    this.mKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.M);
    // COMMA = warp down, PERIOD = warp up
    this.warpDownKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.COMMA);
    this.warpUpKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.PERIOD);

    // Pointer events for node placement and dragging
    this.input.on(Phaser.Input.Events.POINTER_DOWN, this._onPointerDown, this);
    this.input.on(Phaser.Input.Events.POINTER_MOVE, this._onPointerMove, this);
    this.input.on(Phaser.Input.Events.POINTER_UP, this._onPointerUp, this);

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

    // Time warp keyboard controls
    if (Phaser.Input.Keyboard.JustDown(this.warpUpKey)) {
      increaseWarp();
      this._updateWarpLabel();
    }
    if (Phaser.Input.Keyboard.JustDown(this.warpDownKey)) {
      decreaseWarp();
      this._updateWarpLabel();
    }

    // Smooth zoom lerp toward target
    const rawDt = delta / 1000;
    const currentZoom = this.cameras.main.zoom;
    const newZoom = currentZoom + (this.targetZoom - currentZoom) * Math.min(1, ZOOM_LERP_SPEED * rawDt);
    this.cameras.main.setZoom(newZoom);

    // Advance body positions by warp-scaled dt
    const warpedDt = rawDt * getWarpRate();
    if (warpedDt > 0) {
      updateBodyPositions(this.system, warpedDt);
      this._renderOrbits();
      this._renderBodies();
      this._renderShip();
      this._renderNodes();
    }
  }

  private _returnToFlight(): void {
    resetWarp();
    this.scene.start('FlightScene');
  }

  private _updateWarpLabel(): void {
    const rate = getWarpRate();
    this.warpLabel.setText(`Warp: ${rate}x`);
    // Highlight non-1x warp in yellow
    const isWarping = rate > 1;
    this.warpLabel.setColor(isWarping ? '#ffdd44' : HUD_COLOR_PRIMARY);
  }

  private _updateDvLabel(): void {
    let totalDv = 0;
    for (const node of this.maneuverNodes) {
      totalDv += getManeuverDeltaV(node);
    }
    this.dvLabel.setText(`Delta-V: ${totalDv.toFixed(2)} m/s`);
  }

  // Convert screen-space pointer position to world-space coordinates
  private _pointerToWorld(pointer: Phaser.Input.Pointer): Vec2 {
    const cam = this.cameras.main;
    return {
      x: (pointer.x - cam.centerX) / cam.zoom + cam.scrollX + cam.centerX,
      y: (pointer.y - cam.centerY) / cam.zoom + cam.scrollY + cam.centerY,
    };
  }

  // Pointer down: check for node handle hit, or try to place node on ship orbit
  private _onPointerDown(pointer: Phaser.Input.Pointer): void {
    const world = this._pointerToWorld(pointer);
    const zoom = this.cameras.main.zoom;

    // First: check if any existing node handle is being grabbed
    for (const node of this.maneuverNodes) {
      const handle = hitTestHandles(node, world.x, world.y, undefined, zoom);
      if (handle !== null) {
        this.dragNode = node;
        this.dragHandle = handle;
        this.dragLastWorld = { x: world.x, y: world.y };
        // Pause warp during drag to avoid confusion
        resetWarp();
        this._updateWarpLabel();
        return;
      }
    }

    // Second: check if the click is near the ship's orbital path
    this._tryPlaceManeuverNode(world, zoom);
  }

  private _onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (this.dragNode === null || this.dragHandle === null || this.dragLastWorld === null) return;

    const world = this._pointerToWorld(pointer);
    const delta: Vec2 = {
      x: world.x - this.dragLastWorld.x,
      y: world.y - this.dragLastWorld.y,
    };

    updateBurnFromDrag(this.dragNode, this.dragHandle, delta);
    this.dragLastWorld = { x: world.x, y: world.y };

    this._updateDvLabel();
    this._renderNodes();
    this._renderTrajectory();
  }

  private _onPointerUp(_pointer: Phaser.Input.Pointer): void {
    this.dragNode = null;
    this.dragHandle = null;
    this.dragLastWorld = null;
  }

  // Attempt to place a maneuver node if the click is near the ship's orbit
  private _tryPlaceManeuverNode(world: Vec2, zoom: number): void {
    if (this.shipOrbitalElements === null) return;

    const elements = this.shipOrbitalElements;
    if (!isFinite(elements.a) || elements.a <= 0 || elements.e >= 1) return;

    // Compute true anomaly at click position by projecting into the orbital frame
    const bodyX = this.soiBody.x ?? 0;
    const bodyY = this.soiBody.y ?? 0;

    // Click relative to SOI body (focus of orbit)
    const relX = world.x - bodyX;
    const relY = world.y - bodyY;

    // Rotate click into perifocal frame (un-rotate by -omega)
    const cosO = Math.cos(-elements.omega);
    const sinO = Math.sin(-elements.omega);
    const perifX = cosO * relX - sinO * relY;
    const perifY = sinO * relX + cosO * relY;

    // True anomaly from perifocal coordinates
    const nu = Math.atan2(perifY, perifX);

    // Compute world position of that true anomaly on the orbit
    const { a, e, omega } = elements;
    const p = a * (1 - e * e);
    const r = p / (1 + e * Math.cos(nu));
    const xPerif = r * Math.cos(nu) - a * e;
    const yPerif = r * Math.sin(nu);
    const cosOmega = Math.cos(omega);
    const sinOmega = Math.sin(omega);
    const orbitWorldX = cosOmega * (xPerif + a * e) - sinOmega * yPerif + bodyX;
    const orbitWorldY = sinOmega * (xPerif + a * e) + cosOmega * yPerif + bodyY;

    // Distance from click to nearest point on orbit in world units.
    // At zoom 0.001 the uncapped tolerance (12/0.001 = 12,000 gu) would span a large fraction
    // of the system, making accidental node placement common. Cap it at a reasonable world-space
    // distance (e.g. 2000 gu ~ a few times the SOI of a planet).
    const MAX_HIT_TOLERANCE_WU = 2000;
    const hitTolerance = Math.min(ORBIT_HIT_TOLERANCE / zoom, MAX_HIT_TOLERANCE_WU);
    const dx = world.x - orbitWorldX;
    const dy = world.y - orbitWorldY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > hitTolerance) return;

    // Create node and add to list (replace existing node at close nu if desired — for now allow multiples)
    const node = createManeuverNode(nu, elements, this.soiBody);
    this.maneuverNodes.push(node);
    this._updateDvLabel();
    this._renderNodes();
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
      this.shipOrbitalElements = null;
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
    if (epsilon >= 0 || r < 1e-6) {
      this.shipOrbitalElements = null;
      return;
    }

    const elements = computeOrbitalElements(relPos, relVel, mu);
    if (!isFinite(elements.a) || elements.a <= 0 || elements.e >= 1) {
      this.shipOrbitalElements = null;
      return;
    }

    this.shipOrbitalElements = elements;

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

  // Draw the star, planets, and moons as colored circles at current positions.
  // Marker radii are zoom-compensated so they remain at least MIN_*_MARKER_PX screen pixels.
  // SOI boundary circles and body name labels are also rendered here.
  private _renderBodies(): void {
    this.bodyGfx.clear();

    const zoom = this.cameras.main.zoom;
    const star = this.system.star;

    // Zoom-compensated star radius: at least MIN_STAR_MARKER_PX screen pixels, or true body radius
    const starR = Math.max(star.radius ?? STAR_MARKER_RADIUS, MIN_STAR_MARKER_PX / zoom);

    // Star glow
    const starColor = Phaser.Display.Color.HexStringToColor(
      this._hueToHexString(star.hue, 0.8, 0.6),
    ).color;
    this.bodyGfx.fillStyle(starColor, 0.18);
    this.bodyGfx.fillCircle(0, 0, starR * 2.5);

    // Star body
    this.bodyGfx.fillStyle(starColor, 1.0);
    this.bodyGfx.fillCircle(0, 0, starR);

    // Star name label
    this._drawBodyLabel(star.name, 0, 0, starR, zoom);

    // Planets
    for (const planet of this.system.planets) {
      const planetColor = Phaser.Display.Color.HexStringToColor(
        this._hueToHexString(planet.hue, 0.5, 0.55),
      ).color;
      const planetR = Math.max(planet.radius ?? PLANET_MARKER_RADIUS, MIN_PLANET_MARKER_PX / zoom);

      // SOI boundary circle (faint, for navigation reference)
      if (planet.soiRadius !== undefined && planet.soiRadius > 0) {
        this.bodyGfx.lineStyle(1 / zoom, SOI_CIRCLE_COLOR, SOI_CIRCLE_ALPHA);
        this.bodyGfx.strokeCircle(planet.x, planet.y, planet.soiRadius);
      }

      this.bodyGfx.fillStyle(planetColor, 1.0);
      this.bodyGfx.fillCircle(planet.x, planet.y, planetR);

      // Planet name label
      this._drawBodyLabel(planet.name, planet.x, planet.y, planetR, zoom);

      // Moons
      for (const moon of planet.moons) {
        const moonColor = Phaser.Display.Color.HexStringToColor(
          this._hueToHexString(moon.hue, 0.3, 0.5),
        ).color;
        const moonR = Math.max(moon.radius ?? MOON_MARKER_RADIUS, MIN_MOON_MARKER_PX / zoom);
        this.bodyGfx.fillStyle(moonColor, 0.85);
        this.bodyGfx.fillCircle(moon.x, moon.y, moonR);

        // Moon name label (only at medium zoom to avoid clutter)
        this._drawBodyLabel(moon.name, moon.x, moon.y, moonR, zoom);
      }
    }
  }

  // Draw a body name label at a constant screen size, offset above the body marker.
  // Uses Phaser Graphics to render text by drawing it via a temporary Text object approach —
  // but since Graphics doesn't support text, we use a pooled approach: store Text objects
  // keyed by body name and update their position/scale each frame.
  private _bodyLabels: Map<string, Phaser.GameObjects.Text> = new Map();

  private _drawBodyLabel(name: string, wx: number, wy: number, markerR: number, zoom: number): void {
    let label = this._bodyLabels.get(name);
    if (label === undefined) {
      label = this.add.text(0, 0, name, {
        fontFamily: HUD_FONT_FAMILY,
        fontSize: `${BODY_LABEL_FONT_PX}px`,
        color: '#aaccee',
        stroke: '#000810',
        strokeThickness: 2,
      }).setDepth(3).setOrigin(0, 1);
      this._bodyLabels.set(name, label);
    }

    // Position label just above the marker, in world space, scaled by 1/zoom for constant screen size
    label.setPosition(wx + markerR * 1.1, wy - markerR * 1.1);
    label.setScale(1 / zoom);
    label.setVisible(true);
  }

  // Draw ship marker and velocity arrow.
  // All sizes are compensated by 1/zoom so they appear as constant screen-pixel sizes.
  private _renderShip(): void {
    this.shipGfx.clear();

    const shipX = this.registry.get(REGISTRY_KEY_SHIP_X) as number | undefined;
    const shipY = this.registry.get(REGISTRY_KEY_SHIP_Y) as number | undefined;
    const shipVx = this.registry.get(REGISTRY_KEY_SHIP_VX) as number | undefined;
    const shipVy = this.registry.get(REGISTRY_KEY_SHIP_VY) as number | undefined;

    if (shipX === undefined || shipY === undefined) return;

    const zoom = this.cameras.main.zoom;
    const markerR = SHIP_MARKER_RADIUS_PX / zoom;
    const outerR = (SHIP_MARKER_RADIUS_PX + 4) / zoom;
    const lineW = 2 / zoom;

    // Outer ring for visibility
    this.shipGfx.lineStyle(lineW, SHIP_MARKER_COLOR, 0.5);
    this.shipGfx.strokeCircle(shipX, shipY, outerR);

    // Ship marker dot
    this.shipGfx.fillStyle(SHIP_MARKER_COLOR, 1.0);
    this.shipGfx.fillCircle(shipX, shipY, markerR);

    // Velocity direction arrow (skip if velocity is essentially zero)
    if (shipVx !== undefined && shipVy !== undefined) {
      const speed = Math.hypot(shipVx, shipVy);
      if (speed > 0.01) {
        const nx = shipVx / speed;
        const ny = shipVy / speed;
        const arrowLen = SHIP_VELOCITY_ARROW_LENGTH_PX / zoom;
        const arrowEndX = shipX + nx * arrowLen;
        const arrowEndY = shipY + ny * arrowLen;

        this.shipGfx.lineStyle(lineW, SHIP_MARKER_COLOR, 0.85);
        this.shipGfx.beginPath();
        this.shipGfx.moveTo(shipX, shipY);
        this.shipGfx.lineTo(arrowEndX, arrowEndY);
        this.shipGfx.strokePath();

        // Arrowhead (constant screen-pixel size)
        const headLen = 6 / zoom;
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

  // Draw all maneuver nodes and their handles
  private _renderNodes(): void {
    this.nodeGfx.clear();

    const zoom = this.cameras.main.zoom;

    for (const node of this.maneuverNodes) {
      const origin = getNodeWorldPosition(node);
      const handles = getHandlePositions(node, zoom);

      // Node center circle
      this.nodeGfx.lineStyle(2, NODE_CIRCLE_COLOR, NODE_CIRCLE_ALPHA);
      this.nodeGfx.strokeCircle(origin.x, origin.y, NODE_CIRCLE_RADIUS / zoom);

      // Delta-V text near node — use a Graphics line pattern to indicate magnitude
      // Draw handles as colored lines from origin to handle tip, then a dot at tip
      this._drawHandle(origin, handles.prograde, HANDLE_PROGRADE_COLOR);
      this._drawHandle(origin, handles.retrograde, HANDLE_RETROGRADE_COLOR);
      this._drawHandle(origin, handles.normal, HANDLE_NORMAL_COLOR);
      this._drawHandle(origin, handles.radial, HANDLE_RADIAL_COLOR);

      // Show dv values as small text labels (use existing Text objects recycled or created on demand)
      // For simplicity, we annotate via the nodeGfx using short tick lines at the handle tips
    }
  }

  private _drawHandle(origin: Vec2, tip: Vec2, color: number): void {
    this.nodeGfx.lineStyle(1.5, color, HANDLE_LINE_ALPHA);
    this.nodeGfx.beginPath();
    this.nodeGfx.moveTo(origin.x, origin.y);
    this.nodeGfx.lineTo(tip.x, tip.y);
    this.nodeGfx.strokePath();

    this.nodeGfx.fillStyle(color, 1.0);
    this.nodeGfx.fillCircle(tip.x, tip.y, HANDLE_RADIUS / this.cameras.main.zoom);
  }

  // Render post-burn trajectory prediction as a dashed path
  private _renderTrajectory(): void {
    this.trajectoryGfx.clear();

    if (this.maneuverNodes.length === 0) return;

    for (const node of this.maneuverNodes) {
      // Only render trajectory for nodes that have a non-zero burn
      const dv = getManeuverDeltaV(node);
      if (dv < 0.001) continue;

      const postBurn = getPostBurnState(node);

      const shipState: ShipState = {
        pos: { x: postBurn.x, y: postBurn.y },
        vel: { x: postBurn.vx, y: postBurn.vy },
        soiBody: node.soiBody,
      };

      const segments = propagateTrajectory(shipState, this.system, {
        maxTime: 50000,
        stepSize: 10.0,
        maxSegments: 3,
        simBaseTime: 0,
      });

      for (const seg of segments) {
        if (seg.points.length < 2) continue;

        // Points are SOI-relative — convert to world-space using current body positions
        const bodyX = seg.soiBody.x;
        const bodyY = seg.soiBody.y;
        const worldPoints = seg.points.map(pt => ({ x: pt.x + bodyX, y: pt.y + bodyY }));
        this._drawDashedPath(worldPoints, TRAJECTORY_COLOR, TRAJECTORY_ALPHA, TRAJECTORY_LINE_WIDTH);

        // Draw SOI transition markers
        for (const marker of seg.markers) {
          if (marker.type === 'soi-entry' || marker.type === 'soi-exit') {
            this.trajectoryGfx.lineStyle(1.5, SOI_MARKER_COLOR, SOI_MARKER_ALPHA);
            this.trajectoryGfx.strokeCircle(marker.x, marker.y, SOI_MARKER_RADIUS / this.cameras.main.zoom);
          }
        }
      }

      // Draw a thin connector from the node world position to the trajectory start point
      if (segments.length > 0 && (segments[0]?.points.length ?? 0) > 0) {
        const firstSeg = segments[0]!;
        const firstPoint = firstSeg.points[0]!;
        const firstWorldX = firstPoint.x + firstSeg.soiBody.x;
        const firstWorldY = firstPoint.y + firstSeg.soiBody.y;
        const nodeWorld = getNodeWorldPosition(node);

        this.trajectoryGfx.lineStyle(1, TRAJECTORY_COLOR, 0.4);
        this.trajectoryGfx.beginPath();
        this.trajectoryGfx.moveTo(nodeWorld.x, nodeWorld.y);
        this.trajectoryGfx.lineTo(firstWorldX, firstWorldY);
        this.trajectoryGfx.strokePath();
      }
    }
  }

  // Draw a dashed line through an array of Vec2 points (caller converts to world-space).
  // Uses cumulative distance along the path to determine dash/gap phases.
  private _drawDashedPath(points: Vec2[], color: number, alpha: number, lineWidth: number): void {
    if (points.length < 2) return;

    this.trajectoryGfx.lineStyle(lineWidth, color, alpha);

    const dashLen = TRAJECTORY_DASH_LEN / this.cameras.main.zoom;
    const gapLen = TRAJECTORY_GAP_LEN / this.cameras.main.zoom;
    const cycleLen = dashLen + gapLen;

    // Total cumulative distance along the path
    let distAccum = 0;

    for (let i = 1; i < points.length; i++) {
      const ax = points[i - 1]!.x;
      const ay = points[i - 1]!.y;
      const bx = points[i]!.x;
      const by = points[i]!.y;

      const segDx = bx - ax;
      const segDy = by - ay;
      const segLen = Math.sqrt(segDx * segDx + segDy * segDy);
      if (segLen < 1e-6) continue;

      const ux = segDx / segLen;
      const uy = segDy / segLen;

      // Walk the segment in pieces bounded by dash/gap transitions
      let walked = 0;
      while (walked < segLen) {
        // Position within the current cycle
        const phase = distAccum % cycleLen;
        const isDrawing = phase < dashLen;

        // Distance to the next phase boundary within the cycle
        const distToNextBoundary = isDrawing ? (dashLen - phase) : (cycleLen - phase);
        const step = Math.min(distToNextBoundary, segLen - walked);

        if (isDrawing) {
          const x0 = ax + ux * walked;
          const y0 = ay + uy * walked;
          const x1 = x0 + ux * step;
          const y1 = y0 + uy * step;
          this.trajectoryGfx.beginPath();
          this.trajectoryGfx.moveTo(x0, y0);
          this.trajectoryGfx.lineTo(x1, y1);
          this.trajectoryGfx.strokePath();
        }

        distAccum += step;
        walked += step;
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

  // Expose maneuver nodes for persistence across scene transitions
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
