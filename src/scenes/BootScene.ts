import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create(): void {
    const { width, height } = this.scale;

    // Dark blue background
    this.cameras.main.setBackgroundColor('#010118');

    // Centered placeholder text
    this.add
      .text(width / 2, height / 2, 'Space Explorer - Phaser 4', {
        fontFamily: 'monospace',
        fontSize: '32px',
        color: '#4fc3f7',
      })
      .setOrigin(0.5, 0.5);
  }
}
