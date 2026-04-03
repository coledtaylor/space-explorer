import { Game, AUTO } from 'phaser';
import { FlightScene } from './scenes/FlightScene';

const config: Phaser.Types.Core.GameConfig = {
  type: AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: '#000000',
  parent: document.body,
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [FlightScene],
};

new Game(config);
