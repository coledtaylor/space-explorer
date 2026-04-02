import Phaser from 'phaser';
import type { Vec2, MassiveBody, OrbitalElements } from '../types/index';
import { computeOrbitalElements, gravityAcceleration } from '../lib/orbit';
import { vec2Mag } from '../lib/utils';

// Physics constants
//
// KSP-SCALE TUNING (Feature 0006, Phase 5):
//
// At KSP scale orbital velocities are 60-200 gu/s.  A typical Hohmann transfer
// between adjacent planets (e.g., 80 000 → 160 000 gu) requires roughly 25 gu/s
// of delta-v per burn (two burns to complete the transfer).
//
// Design targets:
//   • Burns last 10-20 s real-time (not instant, not tediously long)
//   • Full fuel tank supports ~3-4 interplanetary transfers (≈ 8 individual burns)
//
// With THRUST_POWER = 2 gu/s² and FUEL_CONSUMPTION_RATE = 5 units/s:
//   dv per second of thrust = 2 gu/s
//   fuel per second of burn  = 5
//   dv per unit of fuel      = 2 / 5 = 0.4 gu/s per unit
//
// INITIAL_FUEL = 500 →  total dv budget = 500 × 0.4 = 200 gu/s
//   A 25 dv burn takes 25/2 = 12.5 s and costs 12.5 × 5 = 62.5 fuel
//   200 / 25 = 8 significant burns on a full tank — plenty for 3-4 transfers
//   plus landing/launch manoeuvres
//
// INITIAL_FUEL is exported so FlightScene can reference it instead of a hardcoded literal.
export const THRUST_POWER = 2;
const ROTATION_SPEED = 2.5; // radians per second
const FUEL_CONSUMPTION_RATE = 5;
export const INITIAL_FUEL = 500;

// Ship color constants
const SHIP_BODY_COLOR = 0xc0d0e0;
const SHIP_OUTLINE_COLOR = 0x4fc3f7;
const ENGINE_GLOW_OUTER_COLOR = 0x64b4ff;
const ENGINE_GLOW_INNER_COLOR = 0xc8e6ff;

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

export interface ShipOrbit {
  a: number;
  e: number;
  omega: number;
  nu0: number;
  T: number | undefined;
  apoapsis: number;
  periapsis: number;
  altitude: number;
}

export class Ship {
  // Position relative to current SOI body (body is at origin)
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  fuel: number;
  thrustActive: boolean;
  orbit: ShipOrbit;

  constructor() {
    this.x = 0;
    // Default y is overridden by FlightScene._initShipCircularOrbit at KSP scale.
    // Set to -56000 (≈ Yellow Star radius × SHIP_START_ORBIT_FACTOR) for consistency.
    this.y = -56000;
    this.vx = 0;
    this.vy = 0;
    this.angle = 0;
    this.fuel = INITIAL_FUEL;
    this.thrustActive = false;
    this.orbit = { a: 0, e: 0, omega: 0, nu0: 0, T: undefined, apoapsis: 0, periapsis: 0, altitude: 0 };
  }

  update(dt: number, input: InputState, soiBody: MassiveBody): void {
    // Gravity — ship pos is relative to SOI body, body is at origin
    const grav = gravityAcceleration({ x: this.x, y: this.y }, { x: 0, y: 0 }, soiBody.mu);
    this.vx += grav.x * dt;
    this.vy += grav.y * dt;

    // Rotation
    if (input.left) {
      this.angle -= ROTATION_SPEED * dt;
    }
    if (input.right) {
      this.angle += ROTATION_SPEED * dt;
    }

    // Thrust
    this.thrustActive = false;
    if (this.fuel > 0) {
      if (input.up) {
        // Prograde: thrust along heading direction
        this.vx += Math.sin(this.angle) * THRUST_POWER * dt;
        this.vy += -Math.cos(this.angle) * THRUST_POWER * dt;
        this.fuel = Math.max(0, this.fuel - FUEL_CONSUMPTION_RATE * dt);
        this.thrustActive = true;
      } else if (input.down) {
        // Retrograde: thrust opposite to heading
        this.vx -= Math.sin(this.angle) * THRUST_POWER * dt;
        this.vy -= -Math.cos(this.angle) * THRUST_POWER * dt;
        this.fuel = Math.max(0, this.fuel - FUEL_CONSUMPTION_RATE * dt);
        this.thrustActive = true;
      }
    }

    // Integrate position
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Compute orbital elements for HUD and orbit rendering
    const pos: Vec2 = { x: this.x, y: this.y };
    const vel: Vec2 = { x: this.vx, y: this.vy };
    const elements: OrbitalElements = computeOrbitalElements(pos, vel, soiBody.mu);
    const apoapsis = elements.a * (1 + elements.e);
    const periapsis = elements.a * (1 - elements.e);
    const altitude = vec2Mag(pos) - soiBody.radius;

    this.orbit = {
      a: elements.a,
      e: elements.e,
      omega: elements.omega,
      nu0: elements.nu0,
      T: elements.T,
      apoapsis,
      periapsis,
      altitude,
    };
  }

  getSpeed(): number {
    return vec2Mag({ x: this.vx, y: this.vy });
  }

  getOrbitalState(): { x: number; y: number; vx: number; vy: number } {
    return { x: this.x, y: this.y, vx: this.vx, vy: this.vy };
  }

  /**
   * Draw the ship onto a Phaser Graphics object.
   * The caller is responsible for clearing and repositioning the Graphics as needed.
   * Coordinates are screen-space (pixels from canvas top-left).
   */
  draw(scene: Phaser.Scene, sx: number, sy: number): void {
    const gfx = scene.add.graphics();
    this._renderTo(gfx, sx, sy);
  }

  /**
   * Render ship visuals into an existing Graphics object at screen position (sx, sy).
   * The graphics origin is at world (0,0); we translate to (sx, sy) then rotate by angle.
   */
  renderTo(gfx: Phaser.GameObjects.Graphics, sx: number, sy: number): void {
    this._renderTo(gfx, sx, sy);
  }

  private _renderTo(gfx: Phaser.GameObjects.Graphics, sx: number, sy: number): void {
    gfx.save();
    gfx.translateCanvas(sx, sy);
    gfx.rotateCanvas(this.angle);

    // Engine glow when thrusting
    if (this.thrustActive && this.fuel > 0) {
      // Outer flame cone
      gfx.fillStyle(ENGINE_GLOW_OUTER_COLOR, 0.7);
      gfx.beginPath();
      gfx.moveTo(-6, 8);
      gfx.lineTo(0, 18 + Math.random() * 6);
      gfx.lineTo(6, 8);
      gfx.closePath();
      gfx.fillPath();

      // Inner bright flame cone
      gfx.fillStyle(ENGINE_GLOW_INNER_COLOR, 0.9);
      gfx.beginPath();
      gfx.moveTo(-3, 8);
      gfx.lineTo(0, 14 + Math.random() * 4);
      gfx.lineTo(3, 8);
      gfx.closePath();
      gfx.fillPath();
    }

    // Ship body — arrow/chevron shape
    gfx.fillStyle(SHIP_BODY_COLOR, 1);
    gfx.lineStyle(1, SHIP_OUTLINE_COLOR, 1);
    gfx.beginPath();
    gfx.moveTo(0, -14);
    gfx.lineTo(-9, 10);
    gfx.lineTo(-3, 7);
    gfx.lineTo(0, 9);
    gfx.lineTo(3, 7);
    gfx.lineTo(9, 10);
    gfx.closePath();
    gfx.fillPath();
    gfx.strokePath();

    gfx.restore();
  }
}
