import Phaser from 'phaser';
import { Ship } from '../objects/Ship';
import { CelestialBodyRenderer } from '../objects/CelestialBody';
import { generateSystem, updateBodyPositions } from '../lib/celestial';
import { checkSOITransition, shipWorldPosition, buildOrbitFromState } from '../lib/physics';
import { propagateTrajectory } from '../lib/trajectory';
import { stateFromOrbitalElements } from '../lib/orbit';
import { seededRandom } from '../lib/utils';
import { isLandableBody, LANDING_THRESHOLDS } from '../lib/landing.js';
import type { StarSystem, MassiveBody, ShipState } from '../types/index';
import type { InputState } from '../objects/Ship';
import type { LandingSceneData } from './LandingScene';

// Pixels per game-unit at default zoom
const DEFAULT_ZOOM = 1.0;
// Smoothing factor for camera lerp (fraction of distance closed per second)
const CAMERA_LERP = 4.0;
// Distance from origin (star) that triggers a new system
const SYSTEM_TRANSITION_RADIUS = 2000;
// Starting seed
const INITIAL_SEED = 42;

// HUD layout constants
const HUD_MARGIN = 16;
const HUD_LINE_HEIGHT = 20;
const HUD_FUEL_BAR_WIDTH = 180;
const HUD_FUEL_BAR_HEIGHT = 10;
const HUD_FONT_SIZE = '13px';
const HUD_FONT_FAMILY = '"Segoe UI", system-ui, sans-serif';
const HUD_COLOR_PRIMARY = '#b0d8ff';
const HUD_COLOR_MUTED = '#6090b0';
const HUD_COLOR_FUEL_FULL = 0x40c860;
const HUD_COLOR_FUEL_LOW = 0xff6040;
const HUD_COLOR_FUEL_BG = 0x1a2a3a;

// Trajectory rendering
const TRAJECTORY_MAX_TIME = 600;
const TRAJECTORY_STEP_SIZE = 1.0;
const TRAJECTORY_MAX_SEGMENTS = 3;

// Starfield configuration
interface StarLayer {
  count: number;
  parallax: number;
  size: number;
  opacity: number;
}

interface StarPoint {
  x: number;
  y: number;
  twinkleOffset: number;
  twinkleSpeed: number;
}

const STARFIELD_LAYERS: readonly StarLayer[] = [
  { count: 200, parallax: 0.05, size: 1, opacity: 0.4 },
  { count: 150, parallax: 0.1, size: 1.5, opacity: 0.6 },
  { count: 80, parallax: 0.2, size: 2, opacity: 0.8 },
];
const STARFIELD_EXTENT = 4000;

// HUD display state
interface HudTextObjects {
  soiLabel: Phaser.GameObjects.Text;
  velocityLabel: Phaser.GameObjects.Text;
  altitudeLabel: Phaser.GameObjects.Text;
  fuelLabel: Phaser.GameObjects.Text;
  systemLabel: Phaser.GameObjects.Text;
}

interface HudGraphics {
  fuelBarBg: Phaser.GameObjects.Graphics;
  fuelBar: Phaser.GameObjects.Graphics;
  trajectoryGfx: Phaser.GameObjects.Graphics;
}

export class FlightScene extends Phaser.Scene {
  private ship!: Ship;
  private soiBody!: MassiveBody;
  private system!: StarSystem;
  private currentSeed: number = INITIAL_SEED;
  private elapsedTime: number = 0;

  private bodyRenderer!: CelestialBodyRenderer;
  private worldGfx!: Phaser.GameObjects.Graphics;
  private shipGfx!: Phaser.GameObjects.Graphics;
  private starfieldGfx!: Phaser.GameObjects.Graphics;

  // Body name labels created each frame by CelestialBodyRenderer.drawBody — destroyed at start of next frame
  private bodyLabels: Phaser.GameObjects.Text[] = [];
  // Snapshot of display list length before drawing bodies, used to collect renderer-created labels
  private preBodyDrawChildCount: number = 0;

  private hud!: HudTextObjects;
  private hudGfx!: HudGraphics;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };
  private mKey!: Phaser.Input.Keyboard.Key;

  private starLayers: StarPoint[][] = [];

  constructor() {
    super({ key: 'FlightScene' });
  }

  preload(): void {
    // No external assets — everything is procedurally drawn
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#010118');
    this.cameras.main.setZoom(DEFAULT_ZOOM);

    // Generate the initial star system
    this.system = generateSystem(this.currentSeed);
    this.soiBody = this.system.star;

    // Place ship in a circular orbit around the star
    this._initShipCircularOrbit();

    // Set up renderers
    this.bodyRenderer = new CelestialBodyRenderer(this);
    this.worldGfx = this.add.graphics();
    this.shipGfx = this.add.graphics();
    this.starfieldGfx = this.add.graphics();

    // Depth ordering: starfield behind world behind ship, HUD on top
    this.starfieldGfx.setDepth(0);
    this.worldGfx.setDepth(1);
    this.shipGfx.setDepth(2);

    // Build starfield star positions (seeded for determinism)
    this._initStarfield();

    // Set up keyboard input
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasdKeys = {
      W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    this.mKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.M);

    // Position camera at ship world position immediately (no lerp on first frame)
    const worldPos = this._shipWorldPosition();
    this._setCameraCenter(worldPos.x, worldPos.y);

    // Build HUD (fixed to camera — use setScrollFactor(0))
    this._initHud();
  }

  update(time: number, delta: number): void {
    const dt = delta / 1000; // convert ms → seconds
    this.elapsedTime += dt;

    // Switch to map view
    if (Phaser.Input.Keyboard.JustDown(this.mKey)) {
      this._switchToMapScene();
      return;
    }

    // Read input
    const input = this._readInput();

    // Build ShipState for physics functions
    const shipState = this._buildShipState();

    // Update ship physics
    this.ship.update(dt, input, this.soiBody);

    // Advance celestial body orbital positions
    updateBodyPositions(this.system, dt);

    // Check for SOI transitions
    this._handleSOITransition(shipState);

    // Check if approaching a landable body — hand off to LandingScene
    if (this._checkLandingApproach(shipState)) return;

    // Check for system boundary transition
    this._handleSystemTransition();

    // Update camera to smoothly follow ship
    this._updateCamera(dt);

    // --- Render ---
    const cam = this.cameras.main;
    const zoom = cam.zoom;

    // Clear graphics layers
    this.starfieldGfx.clear();
    this.worldGfx.clear();
    this.shipGfx.clear();

    // Destroy previous body labels
    for (const label of this.bodyLabels) {
      label.destroy();
    }
    this.bodyLabels = [];

    // Draw starfield background (parallax, screen-space)
    this._drawStarfield(time / 1000);

    // Draw orbital path lines (faint ellipses for planets and moons)
    this._drawOrbitLines(zoom, cam);

    // Draw all celestial bodies
    this._drawCelestialBodies(time / 1000, zoom, cam);

    // Draw ship trajectory prediction
    this._drawTrajectory(zoom, cam);

    // Draw ship
    const shipWorld = this._shipWorldPosition();
    const shipSx = (shipWorld.x - cam.scrollX) * zoom;
    const shipSy = (shipWorld.y - cam.scrollY) * zoom;
    this.ship.renderTo(this.shipGfx, shipSx, shipSy);

    // Update HUD
    this._updateHud();
  }

  // --- Initialization helpers ---

  private _initShipCircularOrbit(): void {
    this.ship = new Ship();

    // Place ship in circular orbit: at (0, -r) with tangential velocity
    const orbitRadius = this.system.star.radius + 300;
    const circularSpeed = Math.sqrt(this.system.star.mu / orbitRadius);

    this.ship.x = 0;
    this.ship.y = -orbitRadius;
    // Tangential velocity for clockwise orbit: vx = circularSpeed, vy = 0
    this.ship.vx = circularSpeed;
    this.ship.vy = 0;
    this.ship.angle = 0;
  }

  private _initStarfield(): void {
    this.starLayers = STARFIELD_LAYERS.map((layer) => {
      const rng = seededRandom(layer.count * 7 + 31);
      const stars: StarPoint[] = [];
      for (let i = 0; i < layer.count; i++) {
        stars.push({
          x: rng() * STARFIELD_EXTENT - STARFIELD_EXTENT / 2,
          y: rng() * STARFIELD_EXTENT - STARFIELD_EXTENT / 2,
          twinkleOffset: rng() * Math.PI * 2,
          twinkleSpeed: 0.5 + rng() * 2,
        });
      }
      return stars;
    });
  }

  private _initHud(): void {
    const { width, height } = this.scale;
    const x = HUD_MARGIN;
    let y = height - HUD_MARGIN - HUD_LINE_HEIGHT * 5 - HUD_FUEL_BAR_HEIGHT - 8;

    const style: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: HUD_FONT_FAMILY,
      fontSize: HUD_FONT_SIZE,
      color: HUD_COLOR_PRIMARY,
    };

    const mutedStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: HUD_FONT_FAMILY,
      fontSize: HUD_FONT_SIZE,
      color: HUD_COLOR_MUTED,
    };

    // SOI body name label (top line)
    const soiLabel = this.add.text(x, y, 'SOI: —', style).setScrollFactor(0).setDepth(10);
    y += HUD_LINE_HEIGHT;

    const velocityLabel = this.add.text(x, y, 'VEL: 0.0 u/s', style).setScrollFactor(0).setDepth(10);
    y += HUD_LINE_HEIGHT;

    const altitudeLabel = this.add.text(x, y, 'ALT: 0.0 u', style).setScrollFactor(0).setDepth(10);
    y += HUD_LINE_HEIGHT;

    const fuelLabel = this.add.text(x, y, 'FUEL', mutedStyle).setScrollFactor(0).setDepth(10);
    y += HUD_LINE_HEIGHT;

    // Fuel bar background
    const fuelBarBg = this.add.graphics().setScrollFactor(0).setDepth(10);
    fuelBarBg.fillStyle(HUD_COLOR_FUEL_BG, 0.8);
    fuelBarBg.fillRect(x, y, HUD_FUEL_BAR_WIDTH, HUD_FUEL_BAR_HEIGHT);

    // Fuel bar fill (redrawn each frame)
    const fuelBar = this.add.graphics().setScrollFactor(0).setDepth(10);

    y += HUD_FUEL_BAR_HEIGHT + 4;
    const systemLabel = this.add.text(x, y, `SEED: ${this.currentSeed}`, mutedStyle).setScrollFactor(0).setDepth(10);

    this.hud = { soiLabel, velocityLabel, altitudeLabel, fuelLabel, systemLabel };

    // Trajectory graphics object (world-space, depth between world and ship)
    const trajectoryGfx = this.add.graphics().setDepth(1);

    this.hudGfx = { fuelBarBg, fuelBar, trajectoryGfx };
  }

  // --- Per-frame helpers ---

  private _readInput(): InputState {
    const up =
      (this.cursors.up?.isDown ?? false) ||
      (this.wasdKeys.W.isDown);
    const down =
      (this.cursors.down?.isDown ?? false) ||
      (this.wasdKeys.S.isDown);
    const left =
      (this.cursors.left?.isDown ?? false) ||
      (this.wasdKeys.A.isDown);
    const right =
      (this.cursors.right?.isDown ?? false) ||
      (this.wasdKeys.D.isDown);
    return { up, down, left, right };
  }

  private _buildShipState(): ShipState {
    return {
      pos: { x: this.ship.x, y: this.ship.y },
      vel: { x: this.ship.vx, y: this.ship.vy },
      soiBody: this.soiBody,
    };
  }

  private _shipWorldPosition(): { x: number; y: number } {
    return shipWorldPosition(this._buildShipState(), this.system);
  }

  private _setCameraCenter(worldX: number, worldY: number): void {
    const { width, height } = this.scale;
    const zoom = this.cameras.main.zoom;
    this.cameras.main.scrollX = worldX - width / (2 * zoom);
    this.cameras.main.scrollY = worldY - height / (2 * zoom);
  }

  private _updateCamera(dt: number): void {
    const worldPos = this._shipWorldPosition();
    const { width, height } = this.scale;
    const zoom = this.cameras.main.zoom;

    const targetScrollX = worldPos.x - width / (2 * zoom);
    const targetScrollY = worldPos.y - height / (2 * zoom);

    const alpha = 1 - Math.exp(-CAMERA_LERP * dt);
    this.cameras.main.scrollX += (targetScrollX - this.cameras.main.scrollX) * alpha;
    this.cameras.main.scrollY += (targetScrollY - this.cameras.main.scrollY) * alpha;
  }

  private _handleSOITransition(shipState: ShipState): void {
    const result = checkSOITransition(shipState, this.system);
    if (!result) return;

    const newBody = result.newSoiBody;

    // Convert ship position to new body's reference frame
    if (newBody.kind === 'star') {
      // Escaping to star SOI: ship world pos = planet pos + ship local pos
      this.ship.x = shipState.pos.x + this.soiBody.x;
      this.ship.y = shipState.pos.y + this.soiBody.y;
    } else if (newBody.kind === 'planet') {
      // Entering planet SOI from star: subtract planet world position
      this.ship.x = shipState.pos.x - newBody.x;
      this.ship.y = shipState.pos.y - newBody.y;
    } else if (newBody.kind === 'moon') {
      // Entering moon SOI from planet: compute moon-relative position
      // Ship is in planet-relative frame, moon is in planet-relative frame too
      const planet = newBody.parentBody;
      const moonLocalX = newBody.x - planet.x;
      const moonLocalY = newBody.y - planet.y;
      this.ship.x = shipState.pos.x - moonLocalX;
      this.ship.y = shipState.pos.y - moonLocalY;
    }

    // Apply the new reference-frame velocity
    this.ship.vx = result.relativeVel.x;
    this.ship.vy = result.relativeVel.y;

    // Update the ship's orbital elements for the new body
    const newOrbitInfo = buildOrbitFromState(
      { x: this.ship.x, y: this.ship.y },
      { x: this.ship.vx, y: this.ship.vy },
      newBody,
    );
    this.ship.orbit = newOrbitInfo;

    this.soiBody = newBody;
  }

  private _handleSystemTransition(): void {
    const worldPos = this._shipWorldPosition();
    const distFromOrigin = Math.sqrt(worldPos.x * worldPos.x + worldPos.y * worldPos.y);

    if (distFromOrigin < SYSTEM_TRANSITION_RADIUS) return;

    // Generate new system
    this.currentSeed = (this.currentSeed + 1) % 10000;
    this.system = generateSystem(this.currentSeed);
    this.soiBody = this.system.star;
    this.elapsedTime = 0;

    // Re-initialize ship in circular orbit in the new system
    this._initShipCircularOrbit();

    // Jump camera immediately to ship's new position
    const newWorldPos = this._shipWorldPosition();
    this._setCameraCenter(newWorldPos.x, newWorldPos.y);

    this.hud.systemLabel.setText(`SEED: ${this.currentSeed}`);
  }

  // Returns true if a landing approach was triggered (caller should return early from update)
  private _checkLandingApproach(shipState: ShipState): boolean {
    const soiBody = this.soiBody;

    // Only trigger for planets and moons with landing capability
    if (!isLandableBody(soiBody)) return false;

    // Ship position is relative to SOI body center, so distance from origin = distance to body center
    const distToCenter = Math.sqrt(shipState.pos.x * shipState.pos.x + shipState.pos.y * shipState.pos.y);
    const altitude = distToCenter - soiBody.radius;
    const approachThreshold = soiBody.radius * LANDING_THRESHOLDS.APPROACH_FACTOR;

    if (altitude >= approachThreshold) return false;

    // Trigger LandingScene
    const data: LandingSceneData = {
      shipX: this.ship.x,
      shipY: this.ship.y,
      shipVx: this.ship.vx,
      shipVy: this.ship.vy,
      shipAngle: this.ship.angle,
      shipFuel: this.ship.fuel,
      body: soiBody,
    };
    this.scene.start('LandingScene', data);
    return true;
  }

  private _drawStarfield(timeSec: number): void {
    const { width, height } = this.scale;
    const cam = this.cameras.main;
    // Camera center in world space (scroll gives top-left corner)
    const camCX = cam.scrollX * cam.zoom + width / 2;
    const camCY = cam.scrollY * cam.zoom + height / 2;

    STARFIELD_LAYERS.forEach((layer, li) => {
      const stars = this.starLayers[li];
      if (!stars) return;

      for (const star of stars) {
        // Parallax offset based on camera world center position
        let sx = ((star.x - camCX * layer.parallax) % STARFIELD_EXTENT + STARFIELD_EXTENT) % STARFIELD_EXTENT - STARFIELD_EXTENT / 2 + width / 2;
        let sy = ((star.y - camCY * layer.parallax) % STARFIELD_EXTENT + STARFIELD_EXTENT) % STARFIELD_EXTENT - STARFIELD_EXTENT / 2 + height / 2;

        // Wrap to screen bounds (tile the starfield)
        sx = ((sx % STARFIELD_EXTENT) + STARFIELD_EXTENT) % STARFIELD_EXTENT;
        sy = ((sy % STARFIELD_EXTENT) + STARFIELD_EXTENT) % STARFIELD_EXTENT;

        if (sx < -10 || sx > width + 10 || sy < -10 || sy > height + 10) continue;

        const twinkle = 0.5 + 0.5 * Math.sin(timeSec * star.twinkleSpeed + star.twinkleOffset);
        const alpha = layer.opacity * (0.6 + 0.4 * twinkle);

        this.starfieldGfx.fillStyle(0xdce6ff, alpha);
        this.starfieldGfx.fillCircle(sx, sy, layer.size);
      }
    });
  }

  private _drawOrbitLines(zoom: number, cam: Phaser.Cameras.Scene2D.Camera): void {
    this.worldGfx.lineStyle(1, 0x1a3a5a, 0.4);

    for (const planet of this.system.planets) {
      // Draw orbit ellipse for this planet around star (at world origin)
      this._drawOrbitEllipse(this.worldGfx, planet.orbitalElements.a, planet.orbitalElements.e, planet.orbitalElements.omega, 0, 0, zoom, cam);

      for (const moon of planet.moons) {
        // Draw orbit ellipse for moon around planet
        this._drawOrbitEllipse(this.worldGfx, moon.orbitalElements.a, moon.orbitalElements.e, moon.orbitalElements.omega, planet.x, planet.y, zoom, cam);
      }
    }
  }

  private _drawOrbitEllipse(
    gfx: Phaser.GameObjects.Graphics,
    a: number,
    e: number,
    omega: number,
    parentWorldX: number,
    parentWorldY: number,
    zoom: number,
    cam: Phaser.Cameras.Scene2D.Camera,
  ): void {
    const b = a * Math.sqrt(1 - e * e);
    const steps = 64;

    gfx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const nu = (i / steps) * Math.PI * 2;
      // Perifocal frame position
      const r = (a * (1 - e * e)) / (1 + e * Math.cos(nu));
      const xPerif = r * Math.cos(nu);
      const yPerif = r * Math.sin(nu);
      // Rotate by omega to inertial frame
      const cosO = Math.cos(omega);
      const sinO = Math.sin(omega);
      const wx = cosO * xPerif - sinO * yPerif + parentWorldX;
      const wy = sinO * xPerif + cosO * yPerif + parentWorldY;
      // Convert world to screen
      const sx = (wx - cam.scrollX) * zoom;
      const sy = (wy - cam.scrollY) * zoom;
      if (i === 0) gfx.moveTo(sx, sy);
      else gfx.lineTo(sx, sy);
    }
    gfx.strokePath();

    // Suppress unused vars
    void b;
  }

  private _drawCelestialBodies(timeSec: number, zoom: number, cam: Phaser.Cameras.Scene2D.Camera): void {
    // Record child count before drawing so we can collect new Text labels afterward
    const beforeCount = this.children.list.length;

    for (const body of this.system.bodies) {
      const sx = (body.x - cam.scrollX) * zoom;
      const sy = (body.y - cam.scrollY) * zoom;
      this.bodyRenderer.drawBody(this.worldGfx, body, sx, sy, timeSec, zoom);
    }

    // Collect any Text objects added by the renderer (they have no scrollFactor set and depth = 0)
    // We destroy them at the top of the next frame
    const afterCount = this.children.list.length;
    for (let i = beforeCount; i < afterCount; i++) {
      const child = this.children.list[i];
      if (child instanceof Phaser.GameObjects.Text) {
        child.setScrollFactor(0);
        this.bodyLabels.push(child);
      }
    }
  }

  private _drawTrajectory(zoom: number, cam: Phaser.Cameras.Scene2D.Camera): void {
    this.hudGfx.trajectoryGfx.clear();

    const shipState = this._buildShipState();
    const segments = propagateTrajectory(shipState, this.system, {
      maxTime: TRAJECTORY_MAX_TIME,
      stepSize: TRAJECTORY_STEP_SIZE,
      maxSegments: TRAJECTORY_MAX_SEGMENTS,
      simBaseTime: this.elapsedTime,
    });

    for (const segment of segments) {
      if (segment.points.length < 2) continue;

      this.hudGfx.trajectoryGfx.lineStyle(1, 0x4fc3f7, 0.35);
      this.hudGfx.trajectoryGfx.beginPath();

      const first = segment.points[0];
      if (!first) continue;
      const fsx = (first.x - cam.scrollX) * zoom;
      const fsy = (first.y - cam.scrollY) * zoom;
      this.hudGfx.trajectoryGfx.moveTo(fsx, fsy);

      for (let i = 1; i < segment.points.length; i++) {
        const pt = segment.points[i];
        if (!pt) continue;
        const sx = (pt.x - cam.scrollX) * zoom;
        const sy = (pt.y - cam.scrollY) * zoom;
        this.hudGfx.trajectoryGfx.lineTo(sx, sy);
      }

      this.hudGfx.trajectoryGfx.strokePath();
    }
  }

  private _switchToMapScene(): void {
    // Persist ship state to the Phaser registry so MapScene (and this scene on resume) can read it
    this.registry.set('ship.x', this.ship.x);
    this.registry.set('ship.y', this.ship.y);
    this.registry.set('ship.vx', this.ship.vx);
    this.registry.set('ship.vy', this.ship.vy);
    this.registry.set('ship.angle', this.ship.angle);
    this.registry.set('ship.fuel', this.ship.fuel);

    // Pass live references via scene data for MapScene to use immediately
    this.scene.start('MapScene', {
      soiBody: this.soiBody,
      system: this.system,
    });
  }

  private _updateHud(): void {
    const speed = this.ship.getSpeed();
    const altitude = this.ship.orbit.altitude;

    this.hud.soiLabel.setText(`SOI: ${this.soiBody.name}`);
    this.hud.velocityLabel.setText(`VEL: ${speed.toFixed(1)} u/s`);
    this.hud.altitudeLabel.setText(`ALT: ${altitude.toFixed(0)} u`);

    // Redraw fuel bar
    this.hudGfx.fuelBar.clear();
    const fuelFraction = this.ship.fuel / 1000;
    const barColor = fuelFraction > 0.3 ? HUD_COLOR_FUEL_FULL : HUD_COLOR_FUEL_LOW;
    const barWidth = Math.max(0, HUD_FUEL_BAR_WIDTH * fuelFraction);
    const { height } = this.scale;

    // Recalculate y position for fuel bar (4th row from HUD top)
    const hudTop = height - HUD_MARGIN - HUD_LINE_HEIGHT * 5 - HUD_FUEL_BAR_HEIGHT - 8;
    const fuelBarY = hudTop + HUD_LINE_HEIGHT * 4;

    this.hudGfx.fuelBar.fillStyle(barColor, 0.9);
    this.hudGfx.fuelBar.fillRect(HUD_MARGIN, fuelBarY, barWidth, HUD_FUEL_BAR_HEIGHT);
  }
}
