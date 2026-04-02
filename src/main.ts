import Phaser from 'phaser';
import { FlightScene } from './scenes/FlightScene';
import { MapScene } from './scenes/MapScene';
import { LandingScene } from './scenes/LandingScene';
import { SurfaceScene } from './scenes/SurfaceScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: '#010118',
  scene: [FlightScene, MapScene, LandingScene, SurfaceScene],
  scale: {
    mode: Phaser.Scale.RESIZE,
    parent: 'game-container',
    width: '100%',
    height: '100%',
  },
};

// Wire up the start screen button
const startBtn = document.getElementById('start-btn');
const startScreen = document.getElementById('start-screen');

if (startBtn && startScreen) {
  startBtn.addEventListener('click', () => {
    startScreen.classList.add('hidden');
    // Hide the old DOM HUD elements (Phaser has its own HUD now)
    const uiOverlay = document.getElementById('ui-overlay');
    if (uiOverlay) {
      uiOverlay.style.display = 'none';
    }
    // Create the game only after clicking start
    new Phaser.Game(config);
  });
} else {
  // Fallback: start game immediately if no start screen
  new Phaser.Game(config);
}
