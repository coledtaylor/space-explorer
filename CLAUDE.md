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

## Code Quality Standards (HIGHEST PRIORITY)

**Code quality and clean architecture are the top priority for this project.** Speed of delivery is explicitly deprioritized. Take the time to write clean, maintainable code.

**Core Principles:**
- **Single Responsibility:** Each module, class, and function does one thing well
- **Separation of Concerns:** Rendering logic separate from game logic separate from physics math
- **No God Objects:** If a file exceeds 200 lines, consider decomposition
- **No Magic Numbers:** Constants with descriptive names in config files
- **No Copy-Paste:** Extract shared logic to utilities

**Code Style:**
- Function names describe what they return or do: `calculateOrbitalPeriod()`, `isWithinSOI()`
- Boolean variables use is/has/can/should prefixes
- Comments explain "why", not "what" — code should be self-documenting
- No silent failures — invalid state should be explicit

**Quality Gates:**
- Refactor immediately when patterns emerge — don't accumulate tech debt
- If implementation feels hacky, stop and redesign before continuing
- Each feature phase includes a code quality review before completion
- Prefer testable pure functions over stateful classes where possible
