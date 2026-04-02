import Phaser from 'phaser';
import type { ManeuverNode } from '../lib/maneuver.js';
import type { MassiveBody, StarSystem } from '../types/index.js';

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

export class MapScene extends Phaser.Scene {
  // Maneuver nodes live here so they persist between map open/close cycles within a session
  private maneuverNodes: ManeuverNode[] = [];

  private mKey!: Phaser.Input.Keyboard.Key;
  private mapLabel!: Phaser.GameObjects.Text;
  private soiLabel!: Phaser.GameObjects.Text;

  private soiBody!: MassiveBody;
  private system!: StarSystem;

  constructor() {
    super({ key: 'MapScene' });
  }

  init(data: MapSceneData): void {
    // Receive ship state passed from FlightScene
    this.soiBody = data.soiBody;
    this.system = data.system;
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#000810');

    // Placeholder heading — Task 2 will replace this with full orbit rendering
    this.mapLabel = this.add
      .text(this.scale.width / 2, this.scale.height / 2 - 20, 'Map View', {
        fontFamily: '"Segoe UI", system-ui, sans-serif',
        fontSize: '32px',
        color: '#4fc3f7',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10);

    this.soiLabel = this.add
      .text(this.scale.width / 2, this.scale.height / 2 + 24, `SOI: ${this.soiBody?.name ?? '—'}`, {
        fontFamily: '"Segoe UI", system-ui, sans-serif',
        fontSize: '16px',
        color: '#6090b0',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10);

    const hint = this.add
      .text(this.scale.width / 2, this.scale.height / 2 + 56, 'Press M to return to flight', {
        fontFamily: '"Segoe UI", system-ui, sans-serif',
        fontSize: '13px',
        color: '#3a5a7a',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10);

    // Suppress unused variable warning — hint is rendered, no reference needed after creation
    void hint;

    this.mKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.M);
  }

  update(): void {
    if (Phaser.Input.Keyboard.JustDown(this.mKey)) {
      this._returnToFlight();
    }
  }

  private _returnToFlight(): void {
    // Switch back to FlightScene; FlightScene reads preserved state from the registry
    this.scene.start('FlightScene');
  }

  // Expose maneuver nodes for future tasks (Task 2/3 will render and interact with them)
  getManeuverNodes(): ManeuverNode[] {
    return this.maneuverNodes;
  }
}
