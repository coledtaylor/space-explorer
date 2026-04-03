import { Scene } from 'phaser';

export class BootScene extends Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create(): void {
    this.add.text(
      this.scale.width / 2,
      this.scale.height / 2,
      'Space Explorer',
      { fontSize: '48px', color: '#ffffff' },
    ).setOrigin(0.5);
  }
}
