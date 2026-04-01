import { Ship } from './ship.js';
import { Input } from './input.js';
import { Starfield } from './starfield.js';
import { generateSystem, updateOrbits } from './celestial.js';
import { drawBody, drawMinimap, setCameraHack } from './renderer.js';
import { dist } from './utils.js';

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const minimapCanvas = document.getElementById('minimap-canvas');
const minimapCtx = minimapCanvas.getContext('2d');

// UI elements
const startScreen = document.getElementById('start-screen');
const startBtn = document.getElementById('start-btn');
const scanPanel = document.getElementById('scan-panel');
const scanClose = document.getElementById('scan-close');
const scanName = document.getElementById('scan-name');
const scanType = document.getElementById('scan-type');
const scanDesc = document.getElementById('scan-desc');
const scanDetails = document.getElementById('scan-details');
const locationDisplay = document.getElementById('location-display');
const coordsDisplay = document.getElementById('coords-display');
const fuelDisplay = document.getElementById('fuel-display');
const speedDisplay = document.getElementById('speed-display');
const hud = document.getElementById('hud');
const minimap = document.getElementById('minimap');

let running = false;
let time = 0;

const ship = new Ship();
const input = new Input(canvas);
const starfield = new Starfield();
const camera = { x: 0, y: 0 };

// Generate a starting system
let currentSystemSeed = 42;
let bodies = generateSystem(currentSystemSeed);

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// Start game
startBtn.addEventListener('click', () => {
  startScreen.classList.add('hidden');
  hud.style.display = '';
  minimap.style.display = '';
  running = true;
  requestAnimationFrame(loop);
});

scanClose.addEventListener('click', () => {
  scanPanel.classList.add('hidden');
});

// Hide HUD initially
hud.style.display = 'none';
minimap.style.display = 'none';

let lastTime = 0;

function loop(timestamp) {
  if (!running) return;
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;
  time += dt;

  update(dt);
  render();

  requestAnimationFrame(loop);
}

function update(dt) {
  // Update aim
  const shipScreenX = ship.x - camera.x + canvas.width / 2;
  const shipScreenY = ship.y - camera.y + canvas.height / 2;
  input.updateAim(shipScreenX, shipScreenY);

  ship.update(dt, input);
  updateOrbits(bodies, dt);

  // Camera follows ship smoothly
  camera.x += (ship.x - camera.x) * 0.08;
  camera.y += (ship.y - camera.y) * 0.08;

  // HUD
  coordsDisplay.textContent = `x: ${Math.round(ship.x)}  y: ${Math.round(ship.y)}`;
  fuelDisplay.textContent = `Fuel: ${Math.round(ship.fuel)}%`;
  speedDisplay.textContent = `Speed: ${Math.round(ship.getSpeed())}`;

  // Find nearest body for location display
  let nearest = null;
  let nearestDist = Infinity;
  for (const body of bodies) {
    const d = dist(ship.x, ship.y, body.x, body.y);
    if (d < nearestDist) {
      nearestDist = d;
      nearest = body;
    }
  }
  if (nearest && nearestDist < 300) {
    locationDisplay.textContent = `Near: ${nearest.name}`;
  } else {
    locationDisplay.textContent = 'Deep Space';
  }

  // Click to scan
  const click = input.consumeClick();
  if (click) {
    for (const body of bodies) {
      const bsx = body.x - camera.x + canvas.width / 2;
      const bsy = body.y - camera.y + canvas.height / 2;
      if (dist(click.x, click.y, bsx, bsy) < body.radius + 20) {
        showScan(body);
        break;
      }
    }
  }

  // Interact with nearest body
  if (input.consumeInteract() && nearest && nearestDist < nearest.radius + 60) {
    showScan(nearest);
  }

  // Fuel regeneration near stars
  for (const body of bodies) {
    if (body.kind === 'star') {
      const d = dist(ship.x, ship.y, body.x, body.y);
      if (d < body.radius * 4 && d > body.radius) {
        ship.fuel = Math.min(100, ship.fuel + dt * 5);
        fuelDisplay.style.color = '#66ff66';
        setTimeout(() => fuelDisplay.style.color = '#4fc3f7', 200);
      }
    }
  }

  // System transition — travel far enough to discover new system
  if (dist(ship.x, ship.y, 0, 0) > 2000) {
    currentSystemSeed += 1;
    bodies = generateSystem(currentSystemSeed);
    ship.x = 0;
    ship.y = -300;
    ship.vx *= 0.3;
    ship.vy *= 0.3;
    camera.x = ship.x;
    camera.y = ship.y;
    scanPanel.classList.add('hidden');
  }
}

function showScan(body) {
  scanName.textContent = body.name;
  scanType.textContent = body.subtype || body.kind;
  scanDesc.textContent = body.description;
  scanDetails.innerHTML = '';
  if (body.details) {
    for (const [key, val] of Object.entries(body.details)) {
      const line = document.createElement('div');
      line.textContent = `${key}: ${val}`;
      scanDetails.appendChild(line);
    }
  }
  scanPanel.classList.remove('hidden');
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Background
  ctx.fillStyle = '#010108';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  starfield.draw(ctx, camera, time);

  setCameraHack(camera.x, camera.y);

  // Draw bodies (stars first, then planets, then anomalies)
  const sorted = [...bodies].sort((a, b) => {
    const order = { star: 0, planet: 1, anomaly: 2 };
    return (order[a.kind] || 0) - (order[b.kind] || 0);
  });
  for (const body of sorted) {
    drawBody(ctx, body, camera, time);
  }

  ship.draw(ctx, camera);

  // Minimap
  drawMinimap(minimapCtx, ship, bodies, camera);
}
