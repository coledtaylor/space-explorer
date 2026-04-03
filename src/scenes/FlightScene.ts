import { Scene, GameObjects } from 'phaser';
import { Ship, ScreenBounds } from '../objects/Ship.js';
import { CelestialBody } from '../objects/CelestialBody.js';
import { SOLAR_SYSTEM } from '../lib/solarSystem.js';
import { createOrbitLine } from '../lib/orbitLines.js';
import type { Vec2 } from '../types/index.js';

const HUD_FONT_SIZE = '16px';
const HUD_PADDING = 12;

// Scale factor: game units (km) → screen pixels.
// KSP orbital radii are ~10,000–20,000,000 km. At 3e-5 px/km, Kerbin sits
// ~408 px from the star — visible but not clipping the canvas edge.
const WORLD_SCALE = 3e-5;

/** Pairing of an orbit-line Graphics with the parent body it must track. */
interface OrbitLine {
  graphics: GameObjects.Graphics;
  parent: CelestialBody;
}

export class FlightScene extends Scene {
  private ship!: Ship;
  private speedText!: Phaser.GameObjects.Text;
  private keyW!: Phaser.Input.Keyboard.Key;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyS!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;

  private celestialBodies: CelestialBody[] = [];
  private movingOrbitLines: OrbitLine[] = [];

  constructor() {
    super({ key: 'FlightScene' });
  }

  create(): void {
    const worldOrigin: Vec2 = {
      x: this.scale.width / 2,
      y: this.scale.height / 2,
    };

    this.createCelestialBodies(worldOrigin);
    this.createShip(worldOrigin);
    this.createHud();
    this.bindKeys();
  }

  private createCelestialBodies(worldOrigin: Vec2): void {
    const bodyObjects = new Map<string, CelestialBody>();

    for (const [id, config] of Object.entries(SOLAR_SYSTEM.bodies)) {
      const parent = config.parentId !== undefined
        ? (bodyObjects.get(config.parentId) ?? null)
        : null;

      const body = new CelestialBody(this, config, parent, worldOrigin, WORLD_SCALE);
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
          orbitLine.x = worldOrigin.x;
          orbitLine.y = worldOrigin.y;
        }
      }
    }
  }

  private createShip(worldOrigin: Vec2): void {
    this.ship = new Ship(this, worldOrigin.x, worldOrigin.y);
  }

  private createHud(): void {
    this.speedText = this.add.text(HUD_PADDING, HUD_PADDING, 'Speed: 0', {
      fontSize: HUD_FONT_SIZE,
      color: '#ffffff',
    });
  }

  private bindKeys(): void {
    const keyboard = this.input.keyboard!;
    this.keyW = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyA = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyS = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.keyD = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
  }

  update(time: number, delta: number): void {
    this.updateCelestialBodies(time);
    this.updateOrbitLines();
    this.handleShipInput(delta);
    this.updateHud();
  }

  private updateCelestialBodies(time: number): void {
    for (const body of this.celestialBodies) {
      body.updatePosition(time);
    }
  }

  private updateOrbitLines(): void {
    // Reposition moon orbit rings to follow their parent planet's current position.
    for (const { graphics, parent } of this.movingOrbitLines) {
      graphics.x = parent.x;
      graphics.y = parent.y;
    }
  }

  private handleShipInput(delta: number): void {
    if (this.keyW.isDown) {
      this.ship.applyThrust(delta);
    }
    if (this.keyA.isDown) {
      this.ship.rotateLeft(delta);
    }
    if (this.keyD.isDown) {
      this.ship.rotateRight(delta);
    }
    // S is intentionally a no-op

    const bounds: ScreenBounds = {
      minX: 0,
      maxX: this.scale.width,
      minY: 0,
      maxY: this.scale.height,
    };
    this.ship.updatePosition(delta, bounds);
  }

  private updateHud(): void {
    const displaySpeed = Math.round(this.ship.speed * 100) / 100;
    this.speedText.setText(`Speed: ${displaySpeed}`);
  }
}
