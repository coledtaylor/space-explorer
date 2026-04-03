import { GameObjects, Scene } from 'phaser';

const THRUST_ACCELERATION = 0.0003; // pixels per ms^2
const ROTATION_SPEED = 0.003;       // radians per ms

const SHIP_HEIGHT = 20;
const SHIP_HALF_WIDTH = 8;

export class Ship extends GameObjects.Graphics {
  private vx: number = 0;
  private vy: number = 0;
  private heading: number = 0; // radians, 0 = pointing up (negative Y)

  constructor(scene: Scene, x: number, y: number) {
    super(scene);
    scene.add.existing(this);
    this.x = x;
    this.y = y;
    this.drawOutline();
  }

  private drawOutline(): void {
    this.clear();
    this.lineStyle(1.5, 0xffffff, 1);

    // Triangle pointing up in local space: tip at top, base at bottom
    const tip = { x: 0, y: -SHIP_HEIGHT };
    const bottomLeft = { x: -SHIP_HALF_WIDTH, y: 0 };
    const bottomRight = { x: SHIP_HALF_WIDTH, y: 0 };

    this.strokeTriangle(
      tip.x, tip.y,
      bottomLeft.x, bottomLeft.y,
      bottomRight.x, bottomRight.y,
    );
  }

  applyThrust(delta: number): void {
    // heading 0 = pointing up (-Y), so thrust direction is (-sin, -cos) in world space
    // Phaser rotation: 0 = right, but we track heading independently
    const thrustMagnitude = THRUST_ACCELERATION * delta;
    this.vx += Math.sin(this.heading) * thrustMagnitude;
    this.vy -= Math.cos(this.heading) * thrustMagnitude;
  }

  /**
   * Adds a pre-scaled force (pixels/ms) to the ship velocity.
   * Callers are responsible for multiplying acceleration by delta before calling.
   */
  applyForce(fx: number, fy: number): void {
    this.vx += fx;
    this.vy += fy;
  }

  rotateLeft(delta: number): void {
    this.heading -= ROTATION_SPEED * delta;
    this.rotation = this.heading;
  }

  rotateRight(delta: number): void {
    this.heading += ROTATION_SPEED * delta;
    this.rotation = this.heading;
  }

  updatePosition(delta: number): void {
    this.x += this.vx * delta;
    this.y += this.vy * delta;
  }

  get speed(): number {
    return Math.sqrt(this.vx * this.vx + this.vy * this.vy);
  }
}
