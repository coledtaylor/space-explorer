import Phaser from 'phaser';
import {
  calculateLandingTelemetry,
  determineLandingOutcome,
  isLandableBody,
  LANDING_THRESHOLDS,
  type LandingState,
  type LandingTelemetry,
} from '../lib/landing.js';
import type { CelestialBody, PlanetBody, MoonBody, Vec2 } from '../types/index.js';

// HUD layout constants
const HUD_MARGIN = 16;
const HUD_LINE_HEIGHT = 22;
const HUD_FONT_SIZE = '14px';
const HUD_FONT_FAMILY = '"Segoe UI", system-ui, sans-serif';
const HUD_COLOR_PRIMARY = '#b0d8ff';
const HUD_COLOR_MUTED = '#6090b0';

// Landing colors for vertical speed indicator
const VS_COLOR_SAFE = '#40c860';   // green — descent rate under safe threshold
const VS_COLOR_CAUTION = '#f0c040'; // yellow — descent rate between safe and crash
const VS_COLOR_DANGER = '#ff4040';  // red — descent rate above crash threshold

// Camera zoom range and smoothing
const ZOOM_MIN = 1.0;
const ZOOM_MAX = 3.0;
const ZOOM_LERP_SPEED = 2.0; // fraction of gap closed per second

// Gravity applied to ship each frame during landing sequence (game units / s²)
// This is a fallback used only when body.mu is unavailable (anomaly bodies).
// At KSP scale, real gravity comes from mu/r² and this constant is not exercised.
const LANDING_GRAVITY = 9.8;

// Ship thrust in landing mode (body-relative, upward), in gu/s².
//
// KSP-SCALE VERIFICATION (Feature 0006, Phase 5):
// Surface gravity for all landable body types at max radius:
//   Rocky    r=900:  g = 5.22M  / 810 000    ≈  6.4 gu/s²
//   Volcanic r=1000: g = 6.525M / 1 000 000  ≈  6.5 gu/s²
//   Ice World r=1100: g = 10.44M / 1 210 000 ≈  8.6 gu/s²
//   Lush/Ocean r=1200: g = 7.83M / 1 440 000 ≈  5.4 gu/s²
// LANDING_THRUST = 25 exceeds all surface gravities above — players can hover.
const LANDING_THRUST = 25;
const LANDING_ROTATION_SPEED = 2.5; // radians per second
const LANDING_FUEL_RATE = 5; // fuel consumed per second of thrust

// Surface undulation amplitude and frequency (screen pixels)
const TERRAIN_AMPLITUDE = 8;
const TERRAIN_FREQUENCY = 0.015;
const TERRAIN_SEGMENTS = 120;

// Post-outcome delay before scene transition (seconds)
const CRASH_DELAY = 1.5;
const GAS_GIANT_DELAY = 2.0;

// Data passed from FlightScene when triggering landing approach
export interface LandingSceneData {
  shipX: number;
  shipY: number;
  shipVx: number;
  shipVy: number;
  shipAngle: number;
  shipFuel: number;
  body: PlanetBody | MoonBody;
  systemSeed: number;
}

// HUD text objects for the landing display
interface LandingHud {
  altLabel: Phaser.GameObjects.Text;
  vsLabel: Phaser.GameObjects.Text;
  hvelLabel: Phaser.GameObjects.Text;
  bodyLabel: Phaser.GameObjects.Text;
  warningLabel: Phaser.GameObjects.Text;
}

export class LandingScene extends Phaser.Scene {
  // Ship state — position is body-relative (body center at origin)
  private shipX: number = 0;
  private shipY: number = 0;
  private shipVx: number = 0;
  private shipVy: number = 0;
  private shipAngle: number = 0;
  private shipFuel: number = 1000;
  private shipThrustActive: boolean = false;

  private targetBody!: PlanetBody | MoonBody;
  private systemSeed: number = 0;
  private currentState: LandingState = 'approach';
  private currentTelemetry!: LandingTelemetry;

  private zoomLevel: number = ZOOM_MIN;

  // Graphics objects
  private shipGfx!: Phaser.GameObjects.Graphics;
  private terrainGfx!: Phaser.GameObjects.Graphics;
  private flashGfx!: Phaser.GameObjects.Graphics;

  // HUD text objects
  private hud!: LandingHud;

  // Keyboard input
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };

  // Outcome handling — prevent multiple transitions
  private outcomeHandled: boolean = false;

  constructor() {
    super({ key: 'LandingScene' });
  }

  init(data: LandingSceneData): void {
    this.shipX = data.shipX;
    this.shipY = data.shipY;
    this.shipVx = data.shipVx;
    this.shipVy = data.shipVy;
    this.shipAngle = data.shipAngle;
    this.shipFuel = data.shipFuel;
    this.targetBody = data.body;
    this.systemSeed = data.systemSeed;
    this.currentState = 'approach';
    this.zoomLevel = ZOOM_MIN;
    this.outcomeHandled = false;
    this.shipThrustActive = false;
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#010118');
    this.cameras.main.setZoom(this.zoomLevel);

    // Graphics layers — terrain behind ship
    this.terrainGfx = this.add.graphics().setDepth(1);
    this.shipGfx = this.add.graphics().setDepth(2);
    this.flashGfx = this.add.graphics().setScrollFactor(0).setDepth(20);

    // Keyboard input
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasdKeys = {
      W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };

    // Build HUD
    this._initHud();
  }

  update(_time: number, delta: number): void {
    const dt = delta / 1000;

    // Once an outcome is handled, wait for the timer to trigger transition
    if (this.outcomeHandled) return;

    // Read input
    const thrustUp =
      (this.cursors.up?.isDown ?? false) || this.wasdKeys.W.isDown;
    const thrustDown =
      (this.cursors.down?.isDown ?? false) || this.wasdKeys.S.isDown;
    const rotateLeft =
      (this.cursors.left?.isDown ?? false) || this.wasdKeys.A.isDown;
    const rotateRight =
      (this.cursors.right?.isDown ?? false) || this.wasdKeys.D.isDown;

    // Rotation
    if (rotateLeft) this.shipAngle -= LANDING_ROTATION_SPEED * dt;
    if (rotateRight) this.shipAngle += LANDING_ROTATION_SPEED * dt;

    // Apply body gravity (downward = toward body center, origin)
    const distToCenter = Math.sqrt(this.shipX * this.shipX + this.shipY * this.shipY);
    if (distToCenter > 0) {
      // Unit vector from ship toward body center
      const gravDirX = -this.shipX / distToCenter;
      const gravDirY = -this.shipY / distToCenter;

      // Use mu-based gravity from body when available, fallback to constant
      const mu = this.targetBody.mu;
      const gravMag = distToCenter > 0 ? mu / (distToCenter * distToCenter) : LANDING_GRAVITY;
      this.shipVx += gravDirX * gravMag * dt;
      this.shipVy += gravDirY * gravMag * dt;
    }

    // Thrust
    this.shipThrustActive = false;
    if (this.shipFuel > 0) {
      if (thrustUp) {
        // Thrust along ship heading direction
        this.shipVx += Math.sin(this.shipAngle) * LANDING_THRUST * dt;
        this.shipVy += -Math.cos(this.shipAngle) * LANDING_THRUST * dt;
        this.shipFuel = Math.max(0, this.shipFuel - LANDING_FUEL_RATE * dt);
        this.shipThrustActive = true;
      } else if (thrustDown) {
        this.shipVx -= Math.sin(this.shipAngle) * LANDING_THRUST * dt;
        this.shipVy -= -Math.cos(this.shipAngle) * LANDING_THRUST * dt;
        this.shipFuel = Math.max(0, this.shipFuel - LANDING_FUEL_RATE * dt);
        this.shipThrustActive = true;
      }
    }

    // Integrate position
    this.shipX += this.shipVx * dt;
    this.shipY += this.shipVy * dt;

    // Compute telemetry
    const shipPos: Vec2 = { x: this.shipX, y: this.shipY };
    const shipVel: Vec2 = { x: this.shipVx, y: this.shipVy };
    this.currentTelemetry = calculateLandingTelemetry(shipPos, shipVel, this.targetBody);

    // Determine next state
    const nextState = determineLandingOutcome(
      this.currentTelemetry,
      this.currentState,
      this.targetBody,
    );
    this.currentState = nextState;

    // Handle terminal outcomes
    this._handleOutcome(nextState);

    // Update camera zoom based on altitude
    this._updateZoom(dt);

    // Render
    this.terrainGfx.clear();
    this.shipGfx.clear();
    this._drawTerrain();
    this._drawShip();

    // Update HUD
    this._updateHud();
  }

  // --- Initialization ---

  private _initHud(): void {
    const x = HUD_MARGIN;
    let y = HUD_MARGIN;

    const primaryStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: HUD_FONT_FAMILY,
      fontSize: HUD_FONT_SIZE,
      color: HUD_COLOR_PRIMARY,
    };

    const mutedStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: HUD_FONT_FAMILY,
      fontSize: HUD_FONT_SIZE,
      color: HUD_COLOR_MUTED,
    };

    const warningStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: HUD_FONT_FAMILY,
      fontSize: '22px',
      color: '#ff4040',
    };

    const bodyLabel = this.add
      .text(x, y, `LANDING: ${this.targetBody.name}`, mutedStyle)
      .setScrollFactor(0)
      .setDepth(10);
    y += HUD_LINE_HEIGHT + 4;

    const altLabel = this.add
      .text(x, y, 'ALT: 0 km', primaryStyle)
      .setScrollFactor(0)
      .setDepth(10);
    y += HUD_LINE_HEIGHT;

    const vsLabel = this.add
      .text(x, y, 'VS: 0.0 m/s', primaryStyle)
      .setScrollFactor(0)
      .setDepth(10);
    y += HUD_LINE_HEIGHT;

    const hvelLabel = this.add
      .text(x, y, 'HVEL: 0.0 m/s', primaryStyle)
      .setScrollFactor(0)
      .setDepth(10);

    // Warning label — hidden until needed
    const { width, height } = this.scale;
    const warningLabel = this.add
      .text(width / 2, height / 2, '', warningStyle)
      .setOrigin(0.5, 0.5)
      .setScrollFactor(0)
      .setDepth(30)
      .setVisible(false);

    this.hud = { altLabel, vsLabel, hvelLabel, bodyLabel, warningLabel };
  }

  // --- Per-frame helpers ---

  private _updateZoom(dt: number): void {
    if (!this.currentTelemetry) return;

    const approachThreshold = this.targetBody.radius * LANDING_THRESHOLDS.APPROACH_FACTOR;
    const altFraction = Math.max(0, Math.min(1, this.currentTelemetry.altitude / approachThreshold));
    const targetZoom = ZOOM_MIN + (1 - altFraction) * (ZOOM_MAX - ZOOM_MIN);

    // Lerp toward target zoom
    const alpha = 1 - Math.exp(-ZOOM_LERP_SPEED * dt);
    this.zoomLevel += (targetZoom - this.zoomLevel) * alpha;

    this.cameras.main.setZoom(this.zoomLevel);
  }

  private _drawTerrain(): void {
    const { width, height } = this.scale;

    // Derive a color from body hue
    const hue = this.targetBody.hue ?? 120;
    const terrainColor = this._hslToHex(hue, 0.4, 0.3);
    const horizonColor = this._hslToHex(hue, 0.3, 0.2);

    // Ground horizon is at bottom of screen
    const groundY = height - 60;

    this.terrainGfx.fillStyle(horizonColor, 1);
    this.terrainGfx.fillRect(0, groundY, width, height - groundY);

    // Sine-wave terrain undulation on top of the ground base
    this.terrainGfx.fillStyle(terrainColor, 1);
    this.terrainGfx.beginPath();
    this.terrainGfx.moveTo(0, height);

    for (let i = 0; i <= TERRAIN_SEGMENTS; i++) {
      const sx = (i / TERRAIN_SEGMENTS) * width;
      // Lateral position of ship used as terrain offset so terrain scrolls
      const terrainOffset = this.shipX * 0.02;
      const sy = groundY + Math.sin((sx + terrainOffset) * TERRAIN_FREQUENCY) * TERRAIN_AMPLITUDE;
      if (i === 0) {
        this.terrainGfx.moveTo(sx, sy);
      } else {
        this.terrainGfx.lineTo(sx, sy);
      }
    }

    this.terrainGfx.lineTo(width, height);
    this.terrainGfx.lineTo(0, height);
    this.terrainGfx.closePath();
    this.terrainGfx.fillPath();

    // Horizon line
    this.terrainGfx.lineStyle(2, terrainColor, 0.8);
    this.terrainGfx.beginPath();
    this.terrainGfx.moveTo(0, groundY);
    for (let i = 0; i <= TERRAIN_SEGMENTS; i++) {
      const sx = (i / TERRAIN_SEGMENTS) * width;
      const terrainOffset = this.shipX * 0.02;
      const sy = groundY + Math.sin((sx + terrainOffset) * TERRAIN_FREQUENCY) * TERRAIN_AMPLITUDE;
      this.terrainGfx.lineTo(sx, sy);
    }
    this.terrainGfx.strokePath();
  }

  private _drawShip(): void {
    const { width, height } = this.scale;

    // Ship is always drawn near center of screen, adjusted by altitude
    // As altitude decreases toward 0, ship descends toward terrain line
    const groundY = height - 60;
    const approachThreshold = this.targetBody.radius * LANDING_THRESHOLDS.APPROACH_FACTOR;
    const altFraction = this.currentTelemetry
      ? Math.max(0, Math.min(1, this.currentTelemetry.altitude / approachThreshold))
      : 0.5;

    // Ship Y: from top 20% to just above terrain
    const shipScreenY = height * 0.2 + (groundY - 40 - height * 0.2) * (1 - altFraction);
    const shipScreenX = width / 2;

    this.shipGfx.save();
    this.shipGfx.translateCanvas(shipScreenX, shipScreenY);
    this.shipGfx.rotateCanvas(this.shipAngle);

    // Engine glow
    if (this.shipThrustActive && this.shipFuel > 0) {
      this.shipGfx.fillStyle(0x64b4ff, 0.7);
      this.shipGfx.beginPath();
      this.shipGfx.moveTo(-6, 8);
      this.shipGfx.lineTo(0, 18 + Math.random() * 6);
      this.shipGfx.lineTo(6, 8);
      this.shipGfx.closePath();
      this.shipGfx.fillPath();

      this.shipGfx.fillStyle(0xc8e6ff, 0.9);
      this.shipGfx.beginPath();
      this.shipGfx.moveTo(-3, 8);
      this.shipGfx.lineTo(0, 14 + Math.random() * 4);
      this.shipGfx.lineTo(3, 8);
      this.shipGfx.closePath();
      this.shipGfx.fillPath();
    }

    // Ship body — same chevron shape as Ship.ts
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

    this.shipGfx.restore();
  }

  private _updateHud(): void {
    if (!this.currentTelemetry) return;

    const { altitude, descentRate, horizontalVelocity } = this.currentTelemetry;

    this.hud.altLabel.setText(`ALT: ${Math.max(0, altitude).toFixed(0)} km`);
    this.hud.hvelLabel.setText(`HVEL: ${horizontalVelocity.toFixed(1)} m/s`);

    // Color-code vertical speed
    const vsText = `VS: ${descentRate.toFixed(1)} m/s`;
    this.hud.vsLabel.setText(vsText);
    if (descentRate < LANDING_THRESHOLDS.SAFE_DESCENT_RATE) {
      this.hud.vsLabel.setColor(VS_COLOR_SAFE);
    } else if (descentRate < LANDING_THRESHOLDS.CRASH_DESCENT_RATE) {
      this.hud.vsLabel.setColor(VS_COLOR_CAUTION);
    } else {
      this.hud.vsLabel.setColor(VS_COLOR_DANGER);
    }
  }

  // --- Outcome detection and scene transitions ---

  private _handleOutcome(state: LandingState): void {
    if (this.outcomeHandled) return;

    switch (state) {
      case 'crashed':
        this._handleCrash();
        break;
      case 'crushed':
        this._handleGasGiant();
        break;
      case 'landed':
        this._handleLanded();
        break;
      case 'ascending':
        this._handleAscending();
        break;
    }
  }

  private _handleCrash(): void {
    this.outcomeHandled = true;

    // Screen shake
    this.cameras.main.shake(600, 0.03);

    // Red flash overlay
    const { width, height } = this.scale;
    this.flashGfx.fillStyle(0xff0000, 0.6);
    this.flashGfx.fillRect(0, 0, width, height);
    this.tweens.add({
      targets: this.flashGfx,
      alpha: 0,
      duration: 800,
      ease: 'Power2',
    });

    // Particle-like burst — draw expanding circles
    const cx = width / 2;
    const groundY = height - 60;
    const shipScreenY = groundY - 40;
    this._drawExplosionParticles(cx, shipScreenY);

    this.hud.warningLabel.setText('CRASH!').setVisible(true);

    // Return to FlightScene after delay
    this.time.delayedCall(CRASH_DELAY * 1000, () => {
      this._returnToFlight();
    });
  }

  private _handleGasGiant(): void {
    this.outcomeHandled = true;

    this.hud.warningLabel
      .setText('Cannot land on gas giant')
      .setVisible(true);

    this.cameras.main.shake(400, 0.01);

    this.time.delayedCall(GAS_GIANT_DELAY * 1000, () => {
      this._returnToFlight();
    });
  }

  private _handleLanded(): void {
    this.outcomeHandled = true;

    this.hud.warningLabel
      .setText('LANDED')
      .setColor('#40c860')
      .setVisible(true);

    // Transition to SurfaceScene — pass body, ship state, and system seed for scan deduplication
    this.time.delayedCall(800, () => {
      this.scene.start('SurfaceScene', {
        body: this.targetBody,
        ship: {
          x: this.shipX,
          y: this.shipY,
          vx: this.shipVx,
          vy: this.shipVy,
          angle: this.shipAngle,
          fuel: this.shipFuel,
        },
        systemSeed: this.systemSeed,
      });
    });
  }

  private _handleAscending(): void {
    // Only exit if we're clearly above the approach threshold
    const approachThreshold = this.targetBody.radius * LANDING_THRESHOLDS.APPROACH_FACTOR;
    if (this.currentTelemetry && this.currentTelemetry.altitude >= approachThreshold) {
      this.outcomeHandled = true;
      this._returnToFlight();
    }
  }

  private _returnToFlight(): void {
    this.scene.start('FlightScene', {
      shipX: this.shipX,
      shipY: this.shipY,
      shipVx: this.shipVx,
      shipVy: this.shipVy,
      shipAngle: this.shipAngle,
      shipFuel: this.shipFuel,
      soiBody: this.targetBody,
    });
  }

  private _drawExplosionParticles(cx: number, cy: number): void {
    // Draw a burst of radiating lines/circles to simulate an explosion
    const burst = this.add.graphics().setDepth(15);
    const colors = [0xff6600, 0xffaa00, 0xff2200, 0xffffff];

    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const color = colors[i % colors.length] ?? 0xff6600;
      burst.lineStyle(2, color, 0.9);
      burst.beginPath();
      burst.moveTo(cx, cy);
      burst.lineTo(cx + Math.cos(angle) * 30, cy + Math.sin(angle) * 30);
      burst.strokePath();
    }

    this.tweens.add({
      targets: burst,
      scaleX: 3,
      scaleY: 3,
      alpha: 0,
      duration: 600,
      ease: 'Power2',
      onComplete: () => burst.destroy(),
    });
  }

  // --- Utility ---

  // Convert HSL (h: 0-360, s: 0-1, l: 0-1) to Phaser hex color number
  private _hslToHex(h: number, s: number, l: number): number {
    const a = s * Math.min(l, 1 - l);
    const f = (n: number): number => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color);
    };
    const r = f(0);
    const g = f(8);
    const b = f(4);
    return (r << 16) | (g << 8) | b;
  }
}
