# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Space Explorer is a TypeScript browser game built with Phaser 4 and Vite. Run `npm run dev` to start the dev server.

## Architecture

The game uses Phaser 4 with TypeScript. Vite handles bundling and dev serving.

**Module structure:**

```
src/
├── main.ts                 Game config, Phaser bootstrap, start button wiring
├── scenes/
│   ├── BootScene.ts        Asset loading and initial setup
│   ├── FlightScene.ts      Main flight gameplay with HUD rendering
│   ├── MapScene.ts         Orbital map view with maneuver nodes
│   ├── LandingScene.ts     Landing sequence
│   └── SurfaceScene.ts     Surface exploration
├── objects/
│   ├── Ship.ts             Ship physics and Phaser graphics rendering
│   └── CelestialBody.ts    Celestial body rendering in Phaser
├── lib/
│   ├── celestial.ts        Procedural star system generation (seeded RNG)
│   ├── orbit.ts            Orbital mechanics calculations
│   ├── physics.ts          Ship physics and SOI transitions
│   ├── trajectory.ts       Trajectory propagation
│   ├── maneuver.ts         Maneuver node handling
│   ├── landing.ts          Landing mechanics
│   ├── surface.ts          Surface interaction
│   ├── timewarp.ts         Time warp controls
│   ├── units.ts            Unit constants
│   └── utils.ts            Vector math, HSL conversion
└── types/
    └── index.ts            Shared type definitions
```

**Key patterns:**
- Phaser scenes manage game state and rendering. DOM overlay (`#ui-overlay` in index.html) provides HUD panels styled via CSS.
- `lib/` modules are pure logic with no Phaser dependency — testable independently.
- `objects/` contains Phaser game objects that combine rendering with domain logic.
- Celestial bodies use TypeScript discriminated unions (`kind` field) defined in `types/index.ts`.
- Procedural generation uses a deterministic seeded RNG in `lib/utils.ts`.

## Development

- `npm install` — install dependencies
- `npm run dev` — start Vite dev server
- `npm run build` — production build to `dist/`

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
