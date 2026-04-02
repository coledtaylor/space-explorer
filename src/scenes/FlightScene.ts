import Phaser from 'phaser';
import { Ship } from '../objects/Ship';
import { CelestialBodyRenderer } from '../objects/CelestialBody';
import { generateSystem, updateBodyPositions } from '../lib/celestial';
import { checkSOITransition, shipWorldPosition, buildOrbitFromState } from '../lib/physics';
import { stateFromOrbitalElements } from '../lib/orbit';
import { seededRandom } from '../lib/utils';
import { computeTargetZoom, ZOOM_CONFIG } from '../lib/cameraZoom';
import { isLandableBody, LANDING_THRESHOLDS } from '../lib/landing.js';
import {
  SYSTEM_TRANSITION_RADIUS as SCALE_SYSTEM_TRANSITION_RADIUS,
  SHIP_START_ORBIT_FACTOR,
} from '../lib/scaleConfig.js';
import { getWarpRate, increaseWarp, decreaseWarp, resetWarp, shouldAutoDropWarp } from '../lib/timewarp.js';
import type { StarSystem, MassiveBody, ShipState } from '../types/index';
import type { InputState } from '../objects/Ship';
import type { LandingSceneData } from './LandingScene';

// Data passed back from SurfaceScene (or LandingScene crash/ascent) when returning to flight
interface FlightResumeData {
  shipX: number;
  shipY: number;
  shipVx: number;
  shipVy: number;
  shipAngle: number;
  shipFuel: number;
  soiBody?: MassiveBody;
}

// Smoothing factor for camera lerp (fraction of distance closed per second)
const CAMERA_LERP = 4.0;
// Distance from origin (star) that triggers a new system (from scaleConfig — 1,500,000 gu)
const SYSTEM_TRANSITION_RADIUS = SCALE_SYSTEM_TRANSITION_RADIUS;
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

// Trajectory rendering — at KSP scale, step size and count are increased to cover
// meaningful distances (10 gu/step × 1000 steps = 10000 gu of prediction, enough
// to show at least one partial orbit at typical planet orbital speeds).
const TRAJECTORY_STEP_SIZE = 10.0;
const TRAJECTORY_STEP_COUNT = 1000;
const TRAJECTORY_ALPHA_START = 0.7;
const TRAJECTORY_ALPHA_END = 0.15;

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
  warpLabel: Phaser.GameObjects.Text;
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
  private warpUpKey!: Phaser.Input.Keyboard.Key;
  private warpDownKey!: Phaser.Input.Keyboard.Key;

  private starLayers: StarPoint[][] = [];

  // Timestamp (Phaser time.now ms) until which manual scroll-wheel zoom overrides auto-zoom
  private _manualZoomUntil: number = 0;

  // (trajectory is computed and drawn inline each frame — no caching needed)

  // Non-null when the scene is being resumed after landing/surface (set in init())
  private _resumeData: FlightResumeData | null = null;

  constructor() {
    super({ key: 'FlightScene' });
  }

  init(data: FlightResumeData | Record<string, never>): void {
    // Only treat as a resume if the data includes ship position from a prior scene
    if ('shipX' in data) {
      this._resumeData = data as FlightResumeData;
    } else {
      this._resumeData = null;
    }
  }

  preload(): void {
    // No external assets — everything is procedurally drawn
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#010118');

    // Generate the star system — use existing seed when resuming so the same
    // system is restored after a landing sequence
    this.system = generateSystem(this.currentSeed);

    if (this._resumeData !== null) {
      // Resuming from landing/surface — restore exact ship state
      this._initShipFromResumeData(this._resumeData);
      this._resumeData = null;
    } else {
      // Fresh start — place ship in circular orbit around the star
      this.soiBody = this.system.star;
      this._initShipCircularOrbit();
    }

    // Set up renderers
    this.bodyRenderer = new CelestialBodyRenderer(this);
    // All graphics use screen-space coordinates (we do world-to-screen transform manually)
    // so set scrollFactor(0) to prevent camera from transforming them again
    this.worldGfx = this.add.graphics().setScrollFactor(0);
    this.shipGfx = this.add.graphics().setScrollFactor(0);
    this.starfieldGfx = this.add.graphics().setScrollFactor(0);

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
    // COMMA = warp down, PERIOD = warp up (same convention as MapScene)
    this.warpDownKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.COMMA);
    this.warpUpKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.PERIOD);

    // Mouse scroll wheel: zoom override — temporarily suspends auto-zoom
    this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _gameObjects: unknown, _deltaX: number, deltaY: number) => {
      const cam = this.cameras.main;
      const zoomFactor = deltaY < 0 ? 1.1 : 1 / 1.1;
      cam.zoom = Math.min(ZOOM_CONFIG.MAX_ZOOM, Math.max(ZOOM_CONFIG.MIN_ZOOM, cam.zoom * zoomFactor));
      this._manualZoomUntil = this.time.now + ZOOM_CONFIG.MANUAL_OVERRIDE_TIMEOUT_MS;
    });

    // Set initial zoom based on starting altitude so the view is immediately meaningful
    const initialZoom = computeTargetZoom(
      this.ship.orbit.altitude,
      this.soiBody.radius,
      this.scale.height,
    );
    this.cameras.main.setZoom(initialZoom);

    // Position camera at ship world position immediately (no lerp on first frame)
    const worldPos = this._shipWorldPosition();
    this._setCameraCenter(worldPos.x, worldPos.y);

    // Ensure science state is initialised in the registry — only set defaults the
    // very first time so that science points persist across landing/surface cycles.
    if (this.registry.get('sciencePoints') === null || this.registry.get('sciencePoints') === undefined) {
      this.registry.set('sciencePoints', 0);
    }
    if (this.registry.get('scannedBodies') === null || this.registry.get('scannedBodies') === undefined) {
      this.registry.set('scannedBodies', new Set<string>());
    }

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

    // Time warp keyboard controls
    if (Phaser.Input.Keyboard.JustDown(this.warpUpKey)) {
      increaseWarp();
    }
    if (Phaser.Input.Keyboard.JustDown(this.warpDownKey)) {
      decreaseWarp();
    }

    // Read input
    const input = this._readInput();

    // Compute warped dt for physics; raw dt is kept for smooth camera lerp
    const warpedDt = dt * getWarpRate();

    // Physics stability substeps: when warped dt is large, divide into smaller steps
    // to prevent tunneling through SOI boundaries at high warp rates.
    const MAX_SUBSTEP = 0.1; // seconds — maximum substep size
    const substepCount = warpedDt > MAX_SUBSTEP ? Math.ceil(warpedDt / MAX_SUBSTEP) : 1;
    const substepDt = warpedDt / substepCount;

    let soiJustChanged = false;

    for (let step = 0; step < substepCount; step++) {
      // Build ship state before this substep
      const shipState = this._buildShipState();

      // Update ship physics with warped substep dt
      this.ship.update(substepDt, input, this.soiBody);

      // Advance celestial body orbital positions
      updateBodyPositions(this.system, substepDt);

      // Check for SOI transitions
      const soiBefore = this.soiBody;
      this._handleSOITransition(shipState);
      if (this.soiBody !== soiBefore) {
        soiJustChanged = true;
      }

      // Safety rails: auto-drop warp on thrust, SOI change, or surface proximity
      const distToCenter = Math.sqrt(this.ship.x * this.ship.x + this.ship.y * this.ship.y);
      const altitude = distToCenter - this.soiBody.radius;
      if (shouldAutoDropWarp(this.ship.thrustActive, altitude, this.soiBody.radius, soiJustChanged)) {
        resetWarp();
      }

      // Reset per-substep soiJustChanged after check (only flag it once per transition)
      soiJustChanged = false;
    }

    // Build final ship state for landing and system transition checks
    const shipState = this._buildShipState();

    // Check if approaching a landable body — hand off to LandingScene
    if (this._checkLandingApproach(shipState)) return;

    // Check for system boundary transition
    this._handleSystemTransition();

    // Update camera to smoothly follow ship (always raw dt — camera must be smooth)
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

    // Place ship in circular orbit at star.radius * SHIP_START_ORBIT_FACTOR from star center.
    // For a Yellow Star (radius=7000), factor=8 gives orbitRadius=56000 gu, well within
    // the innermost planet band and producing v_circ ≈ 103 gu/s.
    const orbitRadius = this.system.star.radius * SHIP_START_ORBIT_FACTOR;
    const circularSpeed = Math.sqrt(this.system.star.mu / orbitRadius);

    this.ship.x = 0;
    this.ship.y = -orbitRadius;
    // Tangential velocity for clockwise orbit: vx = circularSpeed, vy = 0
    this.ship.vx = circularSpeed;
    this.ship.vy = 0;
    this.ship.angle = 0;
  }

  private _initShipFromResumeData(data: FlightResumeData): void {
    this.ship = new Ship();
    this.ship.x = data.shipX;
    this.ship.y = data.shipY;
    this.ship.vx = data.shipVx;
    this.ship.vy = data.shipVy;
    this.ship.angle = data.shipAngle;
    this.ship.fuel = data.shipFuel;

    // Restore the SOI body if one was provided; otherwise fall back to star
    if (data.soiBody !== undefined) {
      this.soiBody = data.soiBody;
    } else {
      this.soiBody = this.system.star;
    }
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

    // Warp rate indicator — top-right corner
    const warpLabel = this.add
      .text(width - HUD_MARGIN, HUD_MARGIN, 'WARP: 1x', {
        fontFamily: HUD_FONT_FAMILY,
        fontSize: HUD_FONT_SIZE,
        color: HUD_COLOR_MUTED,
      })
      .setScrollFactor(0)
      .setDepth(10)
      .setOrigin(1, 0); // right-align

    this.hud = { soiLabel, velocityLabel, altitudeLabel, fuelLabel, systemLabel, warpLabel };

    // Trajectory graphics object (screen-space, depth between world and ship)
    const trajectoryGfx = this.add.graphics().setScrollFactor(0).setDepth(1);

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
    const cam = this.cameras.main;

    // Auto-zoom: lerp toward altitude-computed target unless manual override is active
    if (this.time.now >= this._manualZoomUntil) {
      const targetZoom = computeTargetZoom(
        this.ship.orbit.altitude,
        this.soiBody.radius,
        this.scale.height,
      );
      cam.zoom += (targetZoom - cam.zoom) * (1 - Math.exp(-ZOOM_CONFIG.ZOOM_LERP_SPEED * dt));
    }

    const worldPos = this._shipWorldPosition();
    const { width, height } = this.scale;
    const zoom = cam.zoom;

    const targetScrollX = worldPos.x - width / (2 * zoom);
    const targetScrollY = worldPos.y - height / (2 * zoom);

    const alpha = 1 - Math.exp(-CAMERA_LERP * dt);
    cam.scrollX += (targetScrollX - cam.scrollX) * alpha;
    cam.scrollY += (targetScrollY - cam.scrollY) * alpha;
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

    // Drop warp immediately on SOI entry — trajectory changes discontinuously
    resetWarp();
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

    // Ship's orbital periapsis must be below the surface — otherwise the ship
    // is in a stable orbit and should not be forced into a landing sequence.
    if (this.ship.orbit.periapsis > soiBody.radius) return false;

    // Ship must be close to the body surface
    const distToCenter = Math.sqrt(shipState.pos.x * shipState.pos.x + shipState.pos.y * shipState.pos.y);
    const altitude = distToCenter - soiBody.radius;
    const approachThreshold = soiBody.radius * LANDING_THRESHOLDS.APPROACH_FACTOR;

    if (altitude >= approachThreshold) return false;

    // Ship must be descending (moving toward the body, not away)
    const radialVel = (shipState.pos.x * shipState.vel.x + shipState.pos.y * shipState.vel.y) / distToCenter;
    if (radialVel > 0) return false; // positive radial velocity = moving away

    // Trigger LandingScene
    const data: LandingSceneData = {
      shipX: this.ship.x,
      shipY: this.ship.y,
      shipVx: this.ship.vx,
      shipVy: this.ship.vy,
      shipAngle: this.ship.angle,
      shipFuel: this.ship.fuel,
      body: soiBody,
      systemSeed: this.currentSeed,
    };
    this.scene.start('LandingScene', data);
    return true;
  }

  private _drawStarfield(timeSec: number): void {
    const { width, height } = this.scale;
    const cam = this.cameras.main;
    // Camera center in world space (scroll gives top-left corner).
    // Wrap within STARFIELD_EXTENT so extreme low-zoom scroll values don't degrade
    // the modulo arithmetic used for parallax tiling.
    const rawCamCX = cam.scrollX * cam.zoom + width / 2;
    const rawCamCY = cam.scrollY * cam.zoom + height / 2;
    const camCX = ((rawCamCX % STARFIELD_EXTENT) + STARFIELD_EXTENT) % STARFIELD_EXTENT;
    const camCY = ((rawCamCY % STARFIELD_EXTENT) + STARFIELD_EXTENT) % STARFIELD_EXTENT;

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
    const steps = 128;

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

  /**
   * Draw trajectory prediction by simulating forward from the ship's current
   * state and drawing directly — same approach as _drawOrbitEllipse.
   *
   * Physics: Velocity-Verlet integration under the current SOI body's gravity.
   * The sim stays in SOI-relative coordinates (body at origin).
   * Each position is converted world → screen and drawn immediately.
   */
  private _drawTrajectory(zoom: number, cam: Phaser.Cameras.Scene2D.Camera): void {
    const gfx = this.hudGfx.trajectoryGfx;
    gfx.clear();

    const mu = this.soiBody.mu;
    if (mu <= 0) return;

    // Ship state in SOI-relative frame
    let px = this.ship.x;
    let py = this.ship.y;
    let vx = this.ship.vx;
    let vy = this.ship.vy;

    // SOI body world position (for converting SOI-relative → world)
    const bodyX = this.soiBody.x;
    const bodyY = this.soiBody.y;

    const totalSteps = TRAJECTORY_STEP_COUNT;
    const dt = TRAJECTORY_STEP_SIZE;

    // First point — convert to screen
    let prevSx = (px + bodyX - cam.scrollX) * zoom;
    let prevSy = (py + bodyY - cam.scrollY) * zoom;

    for (let i = 0; i < totalSteps; i++) {
      // Gravity at current position (body at origin)
      const r2 = px * px + py * py;
      const r = Math.sqrt(r2);
      if (r < this.soiBody.radius * 0.5) break; // hit the body
      const r3 = r2 * r;
      const ax1 = -mu * px / r3;
      const ay1 = -mu * py / r3;

      // Velocity-Verlet: new position
      const nx = px + vx * dt + 0.5 * ax1 * dt * dt;
      const ny = py + vy * dt + 0.5 * ay1 * dt * dt;

      // Gravity at new position
      const nr2 = nx * nx + ny * ny;
      const nr = Math.sqrt(nr2);
      const nr3 = nr2 * nr;
      const ax2 = -mu * nx / nr3;
      const ay2 = -mu * ny / nr3;

      // New velocity
      vx += 0.5 * (ax1 + ax2) * dt;
      vy += 0.5 * (ay1 + ay2) * dt;

      px = nx;
      py = ny;

      // Convert to screen
      const sx = (px + bodyX - cam.scrollX) * zoom;
      const sy = (py + bodyY - cam.scrollY) * zoom;

      // Draw this segment with fading alpha
      const t = i / totalSteps;
      const alpha = TRAJECTORY_ALPHA_START + (TRAJECTORY_ALPHA_END - TRAJECTORY_ALPHA_START) * t;
      gfx.lineStyle(2, 0x4fc3f7, alpha);
      gfx.beginPath();
      gfx.moveTo(prevSx, prevSy);
      gfx.lineTo(sx, sy);
      gfx.strokePath();

      prevSx = sx;
      prevSy = sy;
    }
  }

  private _switchToMapScene(): void {
    // Drop warp when leaving flight view — map scene manages its own warp state
    resetWarp();

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

    // Update warp indicator — yellow when warping, muted when at 1x
    const warpRate = getWarpRate();
    const isWarping = warpRate > 1;
    this.hud.warpLabel.setText(`WARP: ${warpRate}x`);
    this.hud.warpLabel.setColor(isWarping ? '#ffdd44' : HUD_COLOR_MUTED);

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
