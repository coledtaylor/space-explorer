import Phaser from 'phaser';
import { FlightScene } from './scenes/FlightScene';
import { MapScene } from './scenes/MapScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: '#010118',
  scene: [FlightScene, MapScene],
  scale: {
    mode: Phaser.Scale.RESIZE,
    parent: 'game-container',
    width: '100%',
    height: '100%',
  },
};

new Phaser.Game(config);
