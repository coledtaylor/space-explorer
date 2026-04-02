import Phaser from 'phaser';
import { getScanData, calculateLaunchFuelCost } from '../lib/surface.js';
import type { CelestialBody, Vec2 } from '../types/index.js';

// ── Constants ─────────────────────────────────────────────────────────────────

const HUD_FONT_FAMILY = '"Segoe UI", system-ui, sans-serif';
const HUD_FONT_SIZE = '14px';
const HUD_FONT_SIZE_LARGE = '18px';
const HUD_FONT_SIZE_SMALL = '12px';
const HUD_MARGIN = 20;
const HUD_LINE_HEIGHT = 22;

const COLOR_PRIMARY = '#b0d8ff';
const COLOR_MUTED = '#6090b0';
const COLOR_SUCCESS = '#40c860';
const COLOR_WARNING = '#f0c040';
const COLOR_DANGER = '#ff4040';
const COLOR_TITLE = '#ffffff';

// Fuel cost base for launch (scaled by body gravity in calculateLaunchFuelCost)
const LAUNCH_BASE_COST = 10;

// Low orbit altitude above body surface, expressed as a fraction of body radius.
// At KSP scale, body radii are 500-2000 gu, so a fixed 50 gu constant would place
// the ship inside or barely above the surface (≈ 3-10% of radius).  Using 15% of
// body radius instead gives a comfortable, proportional low orbit:
//   radius  500 → altitude  75 gu  (orbit at  575 gu)
//   radius  800 → altitude 120 gu  (orbit at  920 gu)
//   radius 2000 → altitude 300 gu  (orbit at 2300 gu)
const LOW_ORBIT_ALTITUDE_FACTOR = 0.15;

// Terrain constants
const TERRAIN_SEGMENTS = 100;
const TERRAIN_AMPLITUDE = 12;
const TERRAIN_FREQUENCY = 0.018;

// ── Local types ───────────────────────────────────────────────────────────────

// Shape of ship state passed by LandingScene (body-relative flat coords)
interface LandedShipState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  fuel: number;
}

// Raw data object passed by this.scene.start('SurfaceScene', data)
interface RawSurfaceData {
  body: CelestialBody;
  ship: LandedShipState;
  systemSeed?: number;
  sciencePoints?: number;
}

// Internal text objects for the HUD header
interface SurfaceHud {
  bodyNameLabel: Phaser.GameObjects.Text;
  bodyTypeLabel: Phaser.GameObjects.Text;
  scienceLabel: Phaser.GameObjects.Text;
  fuelLabel: Phaser.GameObjects.Text;
}

// Internal text objects for the interaction panel
interface InteractionPanel {
  resultText: Phaser.GameObjects.Text;
  scanButton: Phaser.GameObjects.Text;
  sampleButton: Phaser.GameObjects.Text;
  launchButton: Phaser.GameObjects.Text;
  launchWarning: Phaser.GameObjects.Text;
}

// ── Scene ─────────────────────────────────────────────────────────────────────

export class SurfaceScene extends Phaser.Scene {
  // Scene data received from LandingScene
  private body!: CelestialBody;
  private ship!: LandedShipState;
  private systemSeed: number = 0;

  // Graphics layers
  private backgroundGfx!: Phaser.GameObjects.Graphics;
  private shipGfx!: Phaser.GameObjects.Graphics;

  // UI
  private hud!: SurfaceHud;
  private panel!: InteractionPanel;

  // Track event listener cleanup
  private scanPointerHandler!: () => void;
  private samplePointerHandler!: () => void;
  private launchPointerHandler!: () => void;

  // Prevent duplicate launches
  private launchInitiated: boolean = false;

  constructor() {
    super({ key: 'SurfaceScene' });
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  init(data: RawSurfaceData): void {
    this.body = data.body;
    this.ship = data.ship;
    this.systemSeed = data.systemSeed ?? 0;
    this.launchInitiated = false;

    // Ensure science registry values are initialised if not already set
    if (this.registry.get('sciencePoints') === null || this.registry.get('sciencePoints') === undefined) {
      this.registry.set('sciencePoints', data.sciencePoints ?? 0);
    }
    if (this.registry.get('scannedBodies') === null || this.registry.get('scannedBodies') === undefined) {
      this.registry.set('scannedBodies', new Set<string>());
    }
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#010118');

    this.backgroundGfx = this.add.graphics().setDepth(1);
    this.shipGfx = this.add.graphics().setDepth(3);

    this._drawBackground();
    this._drawShip();
    this._initHud();
    this._initInteractionPanel();
    this._updateScienceLabel();
  }

  shutdown(): void {
    // Remove pointer event listeners to prevent memory leaks across scene restarts.
    // Guards ensure we do not call off() before listeners were ever registered.
    if (this.panel?.scanButton) {
      this.panel.scanButton.off('pointerup', this.scanPointerHandler);
    }
    if (this.panel?.sampleButton) {
      this.panel.sampleButton.off('pointerup', this.samplePointerHandler);
    }
    if (this.panel?.launchButton) {
      this.panel.launchButton.off('pointerup', this.launchPointerHandler);
    }
  }

  // ── Drawing ─────────────────────────────────────────────────────────────────

  private _drawBackground(): void {
    const { width, height } = this.scale;
    const hue = this.body.hue ?? 200;
    const skyColor = this._hslToHex(hue, 0.15, 0.04);
    const horizonColor = this._hslToHex(hue, 0.3, 0.12);
    const terrainColor = this._hslToHex(hue, 0.4, 0.25);
    const terrainHighlight = this._hslToHex(hue, 0.5, 0.35);

    // Sky gradient — simulate with two filled rects blended toward horizon
    this.backgroundGfx.fillStyle(skyColor, 1);
    this.backgroundGfx.fillRect(0, 0, width, height);

    // Horizon glow band
    this.backgroundGfx.fillStyle(horizonColor, 0.8);
    this.backgroundGfx.fillRect(0, height * 0.5, width, height * 0.15);

    // Terrain fill below horizon
    const groundY = Math.floor(height * 0.62);
    this.backgroundGfx.fillStyle(terrainColor, 1);
    this.backgroundGfx.beginPath();
    this.backgroundGfx.moveTo(0, height);

    for (let i = 0; i <= TERRAIN_SEGMENTS; i++) {
      const sx = (i / TERRAIN_SEGMENTS) * width;
      const sy = groundY + Math.sin(sx * TERRAIN_FREQUENCY) * TERRAIN_AMPLITUDE;
      if (i === 0) {
        this.backgroundGfx.moveTo(sx, sy);
      } else {
        this.backgroundGfx.lineTo(sx, sy);
      }
    }

    this.backgroundGfx.lineTo(width, height);
    this.backgroundGfx.lineTo(0, height);
    this.backgroundGfx.closePath();
    this.backgroundGfx.fillPath();

    // Terrain surface line
    this.backgroundGfx.lineStyle(2, terrainHighlight, 0.9);
    this.backgroundGfx.beginPath();
    for (let i = 0; i <= TERRAIN_SEGMENTS; i++) {
      const sx = (i / TERRAIN_SEGMENTS) * width;
      const sy = groundY + Math.sin(sx * TERRAIN_FREQUENCY) * TERRAIN_AMPLITUDE;
      if (i === 0) {
        this.backgroundGfx.moveTo(sx, sy);
      } else {
        this.backgroundGfx.lineTo(sx, sy);
      }
    }
    this.backgroundGfx.strokePath();
  }

  private _drawShip(): void {
    const { width, height } = this.scale;
    // Place ship at bottom center, just above the terrain
    const shipX = width / 2;
    const shipY = Math.floor(height * 0.62) - 20;

    this.shipGfx.save();
    this.shipGfx.translateCanvas(shipX, shipY);
    // Ship is upright on the surface
    this.shipGfx.rotateCanvas(0);

    // Landing legs
    this.shipGfx.lineStyle(2, 0x8090a0, 1);
    this.shipGfx.beginPath();
    this.shipGfx.moveTo(-3, 9);
    this.shipGfx.lineTo(-14, 18);
    this.shipGfx.moveTo(3, 9);
    this.shipGfx.lineTo(14, 18);
    this.shipGfx.strokePath();

    // Leg pads
    this.shipGfx.lineStyle(2, 0x8090a0, 1);
    this.shipGfx.beginPath();
    this.shipGfx.moveTo(-18, 18);
    this.shipGfx.lineTo(-10, 18);
    this.shipGfx.moveTo(10, 18);
    this.shipGfx.lineTo(18, 18);
    this.shipGfx.strokePath();

    // Ship body — chevron
    this.shipGfx.fillStyle(0xc0d0e0, 1);
    this.shipGfx.lineStyle(1, 0x4fc3f7, 1);
    this.shipGfx.beginPath();
    this.shipGfx.moveTo(0, -14);
    this.shipGfx.lineTo(-9, 10);
    this.shipGfx.lineTo(-3, 7);
    this.shipGfx.lineTo(0, 9);
    this.shipGfx.lineTo(3, 7);
    this.shipGfx.lineTo(9, 10);
    this.shipGfx.closePath();
    this.shipGfx.fillPath();
    this.shipGfx.strokePath();

    // Cockpit highlight
    this.shipGfx.fillStyle(0x64b4ff, 0.6);
    this.shipGfx.beginPath();
    this.shipGfx.arc(0, -5, 3, 0, Math.PI * 2);
    this.shipGfx.closePath();
    this.shipGfx.fillPath();

    this.shipGfx.restore();
  }

  // ── HUD ─────────────────────────────────────────────────────────────────────

  private _initHud(): void {
    const x = HUD_MARGIN;
    let y = HUD_MARGIN;

    const titleStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: HUD_FONT_FAMILY,
      fontSize: HUD_FONT_SIZE_LARGE,
      color: COLOR_TITLE,
    };

    const mutedStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: HUD_FONT_FAMILY,
      fontSize: HUD_FONT_SIZE,
      color: COLOR_MUTED,
    };

    const primaryStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: HUD_FONT_FAMILY,
      fontSize: HUD_FONT_SIZE,
      color: COLOR_PRIMARY,
    };

    const bodyNameLabel = this.add
      .text(x, y, this.body.name.toUpperCase(), titleStyle)
      .setScrollFactor(0)
      .setDepth(10);
    y += HUD_LINE_HEIGHT + 4;

    const bodyTypeLabel = this.add
      .text(x, y, `${this.body.kind.toUpperCase()} — ${this.body.subtype}`, mutedStyle)
      .setScrollFactor(0)
      .setDepth(10);
    y += HUD_LINE_HEIGHT + 8;

    const scienceLabel = this.add
      .text(x, y, 'SCIENCE: 0 pts', primaryStyle)
      .setScrollFactor(0)
      .setDepth(10);
    y += HUD_LINE_HEIGHT;

    const fuelLabel = this.add
      .text(x, y, `FUEL: ${Math.floor(this.ship.fuel)}`, primaryStyle)
      .setScrollFactor(0)
      .setDepth(10);

    this.hud = { bodyNameLabel, bodyTypeLabel, scienceLabel, fuelLabel };
  }

  private _updateScienceLabel(): void {
    const pts = (this.registry.get('sciencePoints') as number | null) ?? 0;
    this.hud.scienceLabel.setText(`SCIENCE: ${pts} pts`);
  }

  private _updateFuelLabel(): void {
    this.hud.fuelLabel.setText(`FUEL: ${Math.floor(this.ship.fuel)}`);
  }

  // ── Interaction panel ────────────────────────────────────────────────────────

  private _initInteractionPanel(): void {
    const { width, height } = this.scale;

    // Panel background
    const panelW = 320;
    const panelH = 260;
    const panelX = width - panelW - HUD_MARGIN;
    const panelY = HUD_MARGIN;

    const panelBg = this.add.graphics().setDepth(8);
    panelBg.fillStyle(0x0a1020, 0.85);
    panelBg.fillRoundedRect(panelX, panelY, panelW, panelH, 8);
    panelBg.lineStyle(1, 0x2040608, 0.6);
    panelBg.strokeRoundedRect(panelX, panelY, panelW, panelH, 8);

    const smallStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: HUD_FONT_FAMILY,
      fontSize: HUD_FONT_SIZE_SMALL,
      color: COLOR_MUTED,
    };

    // Result text area — spans most of the panel width
    const resultText = this.add
      .text(panelX + 14, panelY + 14, 'Awaiting crew action…', {
        fontFamily: HUD_FONT_FAMILY,
        fontSize: HUD_FONT_SIZE_SMALL,
        color: COLOR_MUTED,
        wordWrap: { width: panelW - 28 },
      })
      .setScrollFactor(0)
      .setDepth(10);

    // Button layout — evenly spaced inside the panel
    const btnY = panelY + panelH - 60;
    const btnSpacing = panelW / 3;

    const scanButton = this._makeButton(
      panelX + btnSpacing * 0,
      btnY,
      '[ SCAN ]',
      COLOR_SUCCESS,
    );

    const sampleButton = this._makeButton(
      panelX + btnSpacing * 1,
      btnY,
      '[ SAMPLE ]',
      COLOR_PRIMARY,
    );

    const launchButton = this._makeButton(
      panelX + btnSpacing * 2,
      btnY,
      '[ LAUNCH ]',
      COLOR_WARNING,
    );

    // Fuel warning shown when not enough fuel to launch
    const launchWarning = this.add
      .text(panelX + panelW / 2, btnY + 26, '', {
        fontFamily: HUD_FONT_FAMILY,
        fontSize: HUD_FONT_SIZE_SMALL,
        color: COLOR_DANGER,
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(10);

    // Fuel cost hint below launch button
    const fuelCost = this._computeLaunchFuelCost();
    this.add
      .text(panelX + btnSpacing * 2 + 40, btnY + 16, `(${Math.ceil(fuelCost)} fuel)`, smallStyle)
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(10);

    this.panel = { resultText, scanButton, sampleButton, launchButton, launchWarning };

    // Register pointer handlers (stored so shutdown() can remove them)
    this.scanPointerHandler = () => this._handleScan();
    this.samplePointerHandler = () => this._handleSample();
    this.launchPointerHandler = () => this._handleLaunch();

    scanButton.on('pointerup', this.scanPointerHandler);
    sampleButton.on('pointerup', this.samplePointerHandler);
    launchButton.on('pointerup', this.launchPointerHandler);
  }

  private _makeButton(
    x: number,
    y: number,
    label: string,
    color: string,
  ): Phaser.GameObjects.Text {
    return this.add
      .text(x + 40, y, label, {
        fontFamily: HUD_FONT_FAMILY,
        fontSize: HUD_FONT_SIZE,
        color,
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(10)
      .setInteractive({ useHandCursor: true });
  }

  // ── Interaction handlers ─────────────────────────────────────────────────────

  private _handleScan(): void {
    const key = this._scanKey();
    const scannedBodies = this.registry.get('scannedBodies') as Set<string> | null;
    const knownScans: Set<string> = scannedBodies ?? new Set<string>();

    if (knownScans.has(key)) {
      this.panel.resultText
        .setText('Already Scanned. No new data collected.')
        .setColor(COLOR_MUTED);
      return;
    }

    const data = getScanData(this.body.subtype);
    knownScans.add(key);
    this.registry.set('scannedBodies', knownScans);

    const currentPoints = (this.registry.get('sciencePoints') as number | null) ?? 0;
    const newPoints = currentPoints + data.scanPoints;
    this.registry.set('sciencePoints', newPoints);

    this.panel.resultText
      .setText(`SCAN COMPLETE (+${data.scanPoints} pts)\n${data.scanText}`)
      .setColor(COLOR_SUCCESS);

    this._updateScienceLabel();
  }

  private _handleSample(): void {
    const data = getScanData(this.body.subtype);
    this.panel.resultText
      .setText(`SAMPLE COLLECTED\n${data.sampleText}`)
      .setColor(COLOR_PRIMARY);
  }

  private _handleLaunch(): void {
    if (this.launchInitiated) return;

    const fuelCost = this._computeLaunchFuelCost();
    if (this.ship.fuel < fuelCost) {
      this.panel.launchWarning.setText(`Insufficient fuel (need ${Math.ceil(fuelCost)})`);
      this.panel.resultText
        .setText('LAUNCH ABORTED: Not enough fuel.')
        .setColor(COLOR_DANGER);
      return;
    }

    this.launchInitiated = true;
    this.panel.launchWarning.setText('');
    this.panel.resultText
      .setText('LAUNCHING…\nEngines at full thrust.')
      .setColor(COLOR_WARNING);

    this.ship = { ...this.ship, fuel: this.ship.fuel - fuelCost };
    this._updateFuelLabel();

    // Brief delay so the player sees the launch message
    this.time.delayedCall(800, () => {
      this._transitionToFlight(fuelCost);
    });
  }

  // ── Launch physics ────────────────────────────────────────────────────────────

  private _computeLaunchFuelCost(): number {
    const gravity = this._computeSurfaceGravity();
    return calculateLaunchFuelCost(gravity, LAUNCH_BASE_COST);
  }

  private _computeSurfaceGravity(): number {
    // surfaceGravity ≈ mu / radius²  (same formula used in landing.ts)
    if (!('mu' in this.body) || this.body.radius === 0) return 1.0;
    const mu = (this.body as { mu: number }).mu;
    return mu / (this.body.radius * this.body.radius);
  }

  private _transitionToFlight(fuelSpent: number): void {
    // Place the ship in low circular orbit above the body's surface.
    //
    // The body is treated as being at the origin of the scene's coordinate
    // frame (consistent with how LandingScene and FlightScene position it).
    // Orbital radius = body.radius + LOW_ORBIT_ALTITUDE
    // Circular orbital speed v = sqrt(mu / r)
    // Initial position: directly "above" in the +y direction (arbitrary)
    // Initial velocity: tangent to orbit in the +x direction

    const lowOrbitAltitude = this.body.radius * LOW_ORBIT_ALTITUDE_FACTOR;
    const orbitRadius = this.body.radius + lowOrbitAltitude;

    let orbitalSpeed: number;
    if ('mu' in this.body) {
      const mu = (this.body as { mu: number }).mu;
      orbitalSpeed = Math.sqrt(mu / orbitRadius);
    } else {
      orbitalSpeed = 5; // fallback for anomaly bodies
    }

    const launchPosition: Vec2 = { x: 0, y: -orbitRadius };
    const launchVelocity: Vec2 = { x: orbitalSpeed, y: 0 };

    this.scene.start('FlightScene', {
      shipX: launchPosition.x,
      shipY: launchPosition.y,
      shipVx: launchVelocity.x,
      shipVy: launchVelocity.y,
      shipAngle: 0,
      shipFuel: this.ship.fuel,
      soiBody: this.body,
      launchState: {
        position: launchPosition,
        velocity: launchVelocity,
        fuelSpent,
      },
    });
  }

  // ── Utility ──────────────────────────────────────────────────────────────────

  /** Unique key for this body within the current system, used for scan deduplication. */
  private _scanKey(): string {
    return `${this.systemSeed}:${this.body.name}`;
  }

  /** Convert HSL (h: 0–360, s/l: 0–1) to a Phaser hex color number. */
  private _hslToHex(h: number, s: number, l: number): number {
    const a = s * Math.min(l, 1 - l);
    const f = (n: number): number => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color);
    };
    return (f(0) << 16) | (f(8) << 8) | f(4);
  }
}
