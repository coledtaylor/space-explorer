# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Space Explorer is a vanilla JavaScript browser game — no build tools, no bundler, no package manager. Open `index.html` directly in a browser to run.

## Architecture

The game uses ES modules (`<script type="module">`) with a single HTML entry point and Canvas 2D rendering.

**Module dependency graph:**

```
main.js  (game loop, UI wiring, state management)
├── ship.js       Ship class — physics (thrust/drag/fuel), trail, drawing
├── input.js      Input class — keyboard (WASD/arrows/E/M) + mouse tracking
├── starfield.js  Starfield class — 3-layer parallax background with twinkling
├── celestial.js  generateSystem(seed) → bodies[], updateOrbits() — procedural star system generation
├── renderer.js   drawBody(), drawMinimap(), setCameraHack() — all canvas rendering for celestial bodies
└── utils.js      Pure math helpers: lerp, dist, clamp, seededRandom, hslToRgb
```

**Key patterns:**
- `main.js` owns the game loop (`requestAnimationFrame`), camera, and all DOM/UI interaction. Other modules are stateless or self-contained classes.
- Celestial bodies are plain objects with a `kind` field (`'star'`, `'planet'`, `'anomaly'`) — no class hierarchy.
- Procedural generation uses a deterministic seeded RNG (`seededRandom` in `utils.js`). Incrementing `currentSystemSeed` triggers a new system.
- `renderer.js` uses a module-level camera hack (`setCameraHack`) to avoid threading the camera through every draw function — noted as technical debt.
- System transition happens when the ship moves >2000 units from origin, resetting position and generating a new system.

## Development

No build, lint, or test commands — static files only. Use any local HTTP server for development (e.g., `npx serve`, `python -m http.server`, or VS Code Live Server) since ES modules require serving over HTTP.
