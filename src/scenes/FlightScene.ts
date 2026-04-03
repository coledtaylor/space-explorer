import { Scene, GameObjects } from 'phaser';
import { Ship } from '../objects/Ship.js';
import { CelestialBody } from '../objects/CelestialBody.js';
import { SOLAR_SYSTEM } from '../lib/solarSystem.js';
import { createOrbitLine } from '../lib/orbitLines.js';
import { sumGravitationalForces } from '../lib/physics.js';
import { clampZoom, ZOOM_MIN, ZOOM_MAX } from '../lib/camera.js';
import type { Vec2 } from '../types/index.js';

const HUD_FONT_SIZE = '16px';
const HUD_PADDING = 12;
const HUD_DEPTH = 10; // renders above all world-space objects

// Scale factor: game units (km) → screen pixels.
// At 3e-5 px/km, Kerbin sits ~408 px from the star — visible at default zoom.
const WORLD_SCALE = 3e-5; // px/km

// Converts km/s² (physics output) to px/ms² for applying to ship velocity.
// Velocity is tracked as px/ms; Phaser delta is in ms.
const ACCEL_SCALE = WORLD_SCALE / 1_000_000; // (px/km) / (ms²/s²)

const INITIAL_ZOOM = 0.3;       // close enough to see Kerbin's orbit at startup
const SCROLL_SENSITIVITY = 1.0; // zoom change magnitude per wheel tick

/** Orbit-line graphics paired with the parent body it must track each frame. */
interface OrbitLine {
  graphics: GameObjects.Graphics;
  parent: CelestialBody;
}

export class FlightScene extends Scene {
  private ship!: Ship;
  private speedText!: Phaser.GameObjects.Text;
  private keyW!: Phaser.Input.Keyboard.Key;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;

  private celestialBodies: CelestialBody[] = [];
  private movingOrbitLines: OrbitLine[] = [];
  // Pixel coordinate of the solar system origin; used for km↔px conversion.
  private worldOrigin!: Vec2;

  constructor() {
    super({ key: 'FlightScene' });
  }

  create(): void {
    this.worldOrigin = { x: this.scale.width / 2, y: this.scale.height / 2 };
    this.createCelestialBodies();
    this.createShip();
    this.createHud();
    this.bindKeys();
    this.configureCamera();
  }

  private createCelestialBodies(): void {
    const bodyObjects = new Map<string, CelestialBody>();

    for (const [id, config] of Object.entries(SOLAR_SYSTEM.bodies)) {
      const parent = config.parentId !== undefined
        ? (bodyObjects.get(config.parentId) ?? null)
        : null;

      const body = new CelestialBody(this, config, parent, this.worldOrigin, WORLD_SCALE);
      bodyObjects.set(id, body);
      this.celestialBodies.push(body);

      const orbitLine = createOrbitLine(this, config, WORLD_SCALE);
      if (orbitLine !== null) {
        if (parent !== null) {
          // Moon orbit lines must follow their parent planet each frame.
          this.movingOrbitLines.push({ graphics: orbitLine, parent });
          orbitLine.x = parent.x;
          orbitLine.y = parent.y;
        } else {
          // Planet orbit lines are fixed at the star (world origin).
          orbitLine.x = this.worldOrigin.x;
          orbitLine.y = this.worldOrigin.y;
        }
      }
    }
  }

  private createShip(): void {
    // Place near Kerbin's orbit so gravity is immediately apparent at startup.
    const kerbinOrbitPx = SOLAR_SYSTEM.bodies.kerbin.orbitalRadius * WORLD_SCALE;
    this.ship = new Ship(this, this.worldOrigin.x + kerbinOrbitPx, this.worldOrigin.y);
  }

  private createHud(): void {
    this.speedText = this.add.text(HUD_PADDING, HUD_PADDING, 'Speed: 0', {
      fontSize: HUD_FONT_SIZE,
      color: '#ffffff',
    });
    // setScrollFactor(0) pins the HUD to the screen, ignoring camera and zoom.
    this.speedText.setScrollFactor(0).setDepth(HUD_DEPTH);
  }

  private bindKeys(): void {
    const kb = this.input.keyboard!;
    this.keyW = kb.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyA = kb.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyD = kb.addKey(Phaser.Input.Keyboard.KeyCodes.D);
  }

  private configureCamera(): void {
    // Follow ship — keeps it screen-centered at every zoom level.
    this.cameras.main.startFollow(this.ship, true, 1, 1);
    this.cameras.main.setZoom(INITIAL_ZOOM);

    // Wheel: dy > 0 = scroll down = zoom out; dy < 0 = scroll up = zoom in.
    this.input.on('wheel', (_p: unknown, _g: unknown, _dx: number, dy: number) => {
      const zoomDelta = dy < 0 ? SCROLL_SENSITIVITY : -SCROLL_SENSITIVITY;
      const next = clampZoom(this.cameras.main.zoom, zoomDelta, ZOOM_MIN, ZOOM_MAX);
      this.cameras.main.setZoom(next);
    });
  }

  update(time: number, delta: number): void {
    this.updateCelestialBodies(time);
    this.updateOrbitLines();
    this.applyGravity(delta);
    this.handleShipInput(delta);
    this.updateHud();
  }

  private updateCelestialBodies(time: number): void {
    for (const body of this.celestialBodies) {
      body.updatePosition(time);
    }
  }

  private updateOrbitLines(): void {
    for (const { graphics, parent } of this.movingOrbitLines) {
      graphics.x = parent.x;
      graphics.y = parent.y;
    }
  }

  private applyGravity(delta: number): void {
    // Convert pixel positions to km (star-relative) before physics, then
    // convert the resulting km/s² acceleration back to px/ms² for applyForce.
    const toKm = (px: number, origin: number) => (px - origin) / WORLD_SCALE;

    const shipKm: Vec2 = {
      x: toKm(this.ship.x, this.worldOrigin.x),
      y: toKm(this.ship.y, this.worldOrigin.y),
    };

    const bodiesForPhysics = this.celestialBodies.map((body) => ({
      config: body.bodyConfig,
      position: {
        x: toKm(body.x, this.worldOrigin.x),
        y: toKm(body.y, this.worldOrigin.y),
      },
    }));

    const accelKm = sumGravitationalForces(bodiesForPhysics, shipKm);
    this.ship.applyForce(accelKm.x * ACCEL_SCALE * delta, accelKm.y * ACCEL_SCALE * delta);
  }

  private handleShipInput(delta: number): void {
    if (this.keyW.isDown) this.ship.applyThrust(delta);
    if (this.keyA.isDown) this.ship.rotateLeft(delta);
    if (this.keyD.isDown) this.ship.rotateRight(delta);
    // S is intentionally a no-op
    this.ship.updatePosition(delta);
  }

  private updateHud(): void {
    const displaySpeed = Math.round(this.ship.speed * 100) / 100;
    this.speedText.setText(`Speed: ${displaySpeed}`);
  }
}
