# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Space Explorer is a TypeScript browser game built with Phaser 4 and Vite.

## Development

- `npm install` — install dependencies
- `npm run dev` — start Vite dev server
- `npm run build` — production build to `dist/`

## Phaser Documentation (MUST USE)

**Before planning or implementing ANY Phaser-specific feature, you MUST search the official documentation and examples.** Do not guess or assume how Phaser APIs work based on method names or type signatures.

**Resources:**
- Phaser Docs: https://docs.phaser.io/
- API Reference: https://docs.phaser.io/api-documentation/4.0.0-rc.6/api-documentation
- Examples: https://labs.phaser.io/
- GitHub: https://github.com/phaserjs/phaser

**When to search:**
- Any camera operation (zoom, follow, scroll, viewports, multiple cameras)
- Any input handling (keyboard, mouse, pointer, wheel events)
- Any rendering technique (graphics, text, sprites, containers, depth)
- Any scene lifecycle question (create, update, scene transitions)
- Any time you're unsure how a Phaser API behaves

**How to search:**
- Use WebSearch with queries like "Phaser 4 [feature] site:docs.phaser.io" or "Phaser [feature] example"
- Check the API reference for method signatures and behavior
- Look at examples for working patterns
- When docs are sparse, search the Phaser discourse forum for community solutions

**This is mandatory, not optional.** Phaser 4 is a release candidate with behaviors that differ from Phaser 3. A 30-second search prevents multiple failed iterations.

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
- Write tests to prove things are working as expected