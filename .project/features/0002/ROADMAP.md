# Feature 0002: Celestial System Overhaul

> Created: 2026-04-01
> Status: Draft
> Epic: 0001

## Overview

Replace the flat star-plus-planets generation with a three-level hierarchical system (Star > Planet > Moon) featuring physically consistent properties, distinct per-subtype visuals, multi-level SOI transitions, and an enhanced minimap and info panel that expose the full orbital data.

## Problem Statement

The current `generateSystem()` produces a single star with 3-7 planets -- no moons, no hierarchical body structure. Body properties like the "Moons" detail field are cosmetic text, not actual child bodies. The physics engine built in Feature 0001 supports SOI transitions and Keplerian orbits, but only at the star-planet level. Milestone 2 of Epic 0001 requires physically realistic multi-level systems where ships can orbit moons, escape to planet SOI, and transfer between moons.

## User Stories

- As a pilot, I want planets to have moons so that systems feel deep and realistic
- As a pilot, I want to orbit a moon, escape to its parent planet's SOI, and transfer to another moon so that I can practice multi-body orbital maneuvers
- As a pilot, I want each planet subtype to look visually distinct (rings for gas giants, ice shimmer, cloud bands) so that I can identify body types at a glance
- As a pilot, I want the minimap to show moon orbits nested inside planet orbits so that I can plan trajectories through the system
- As a pilot, I want the scan/info panel to show full orbital data (mass, SOI radius, orbital period, semi-major axis, eccentricity) so that I can make informed navigation decisions
- As a pilot, I want the same seed to always produce the same system so that I can revisit known systems

---

## Codebase Context

### Technology Stack
- Vanilla JavaScript ES2020+, Canvas 2D, no build tools, zero dependencies
- ES modules via `<script type="module">`
- G=1 unit system with game-scale masses (units.js)

### Relevant Directories
- `js/celestial.js` -- system generation and orbit propagation (primary target)
- `js/physics.js` -- SOI detection and reference frame transitions
- `js/renderer.js` -- Canvas 2D body drawing and minimap
- `js/orbit.js` -- orbital mechanics math (already supports Kepler propagation)
- `js/main.js` -- game loop, UI wiring, scan panel, HUD updates
- `index.html` -- scan panel markup and HUD elements

### Conventions to Follow
- camelCase functions, PascalCase classes
- Named exports only, no default exports
- 2-space indentation, single quotes, semicolons
- Celestial bodies are plain objects with `kind` field discriminator
- Body shape: `{ kind, name, subtype, x, y, radius, color, hue, mass, mu, soiRadius, orbitalElements, parentBody }`
- No console.log, no try/catch

---

## Implementation Plan

### Phase 1: Hierarchical Generation -- Moons and Body Properties

Overhaul `celestial.js` to generate three-level systems. Each planet spawns moons based on its subtype. All bodies (star, planets, moons) carry physically consistent properties derived from mass and orbital distance. The `updateBodyPositions()` function propagates moon positions relative to their parent planet.

**What this phase delivers:** A deterministic system generator that produces Star > Planet > Moon hierarchies with correct SOI radii, orbital elements, and position propagation for all three levels. The system object gains a `moons` array (or moons nested under planets) and `system.bodies` includes all moons.

**Success Criteria:**
- Generating a system with the same seed always produces identical body counts, positions, and properties
- At least some planets have moons: Rocky 0-1, Ice/Ocean/Desert 0-2, Lush 0-3, Gas Giant 2-8
- Every body (star, planet, moon) has physically consistent mass, mu, soiRadius (derived from mass and orbital distance via `computeSOIRadius`)
- Moon positions update each frame relative to their parent planet (not the star)
- No moon orbits overlap with each other or extend beyond their parent planet's SOI radius

### Phase 2: Multi-Level SOI Transitions

Extend `physics.js` to handle three-level SOI transitions: star <-> planet <-> moon. The ship can enter a moon's SOI from within a planet's SOI, and escape a moon's SOI back to the planet's SOI. The `shipWorldPosition()` function computes correct world-space position for bodies nested two levels deep.

**What this phase delivers:** The ship can orbit a moon, escape to its parent planet's SOI, coast to another moon's SOI, and enter it -- completing the full multi-level SOI transition chain required by the acceptance criteria.

**Success Criteria:**
- Ship flying within a planet's SOI can enter a moon's SOI and the HUD shows the moon's name as current SOI body
- Ship can escape a moon's SOI and return to the parent planet's SOI with correct velocity frame conversion
- Ship world-space position is correct at all three SOI levels (star, planet, moon) -- no position jumps on transition
- Orbital elements are recomputed correctly after each transition (orbit path renders accurately around the new SOI body)

### Phase 3: Distinct Subtype Visuals and Rendering

Give each planet subtype and moon a unique visual treatment in `renderer.js`. Gas giants get rings and cloud bands. Ice worlds get a shimmer effect. Volcanic worlds glow. Moons render as smaller bodies with their own visual style. Body drawing dispatches on `kind === 'moon'` in addition to existing kinds.

**What this phase delivers:** Every body type is visually distinguishable at a glance. Moons render correctly at their world-space positions with appropriate size and style.

**Success Criteria:**
- Gas giants render with visible ring and banded atmosphere (distinct from other planet types)
- Ice worlds, ocean worlds, desert, volcanic, lush, and rocky planets each have a visually unique rendering treatment
- Moons render as smaller bodies with their own draw style (not identical to planet rendering)
- All body types remain visually clear and distinguishable at default zoom level
- Rendering all bodies (star + up to 8 planets + up to ~20 moons) maintains 60fps

### Phase 4: Enhanced Minimap, Info Panel, and UI Integration

Upgrade the minimap to show nested orbit rings (planet orbits around star, moon orbits around planets when zoomed). Upgrade the scan/info panel to show full orbital data for any body. Wire moons into all UI systems (click-to-scan, nearest-body detection, fuel regeneration exclusion).

**What this phase delivers:** The minimap visualizes the full system hierarchy. The info panel exposes real orbital data instead of cosmetic text. All UI interactions work with moons as first-class bodies.

**Success Criteria:**
- Minimap shows orbit rings for planets around the star, and orbit rings for moons around their parent planet
- Clicking a moon in the game view opens the scan panel with that moon's data
- Scan panel for any body displays: mass, radius, SOI radius, orbital period, semi-major axis, eccentricity (real computed values, not placeholder text)
- System transition boundary and fuel regeneration logic work correctly with the expanded body list
- Location/coordinate display correctly reflects the ship's SOI body at all three hierarchy levels

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `js/celestial.js` | Modify | Add moon generation, moon name list, moon mass table, subtype-based moon counts, update body position propagation for moons |
| `js/physics.js` | Modify | Add moon SOI detection, planet<->moon frame transitions, update `shipWorldPosition` for three-level nesting |
| `js/renderer.js` | Modify | Add `drawMoon()`, enhance `drawPlanet()` per-subtype visuals, add ring/shimmer/glow effects, upgrade `drawMinimap()` with orbit rings |
| `js/main.js` | Modify | Wire moons into scan interaction, nearest-body search, update HUD for moon SOI, pass moons to minimap |
| `index.html` | Modify | Add orbital data fields to scan panel markup (mass, SOI radius, orbital period, semi-major axis, eccentricity) |

---

## Testing Strategy

### Unit Tests
No test framework exists. Verification is manual and observational.

### Manual Testing -- Phase 1
- Generate multiple systems with different seeds and verify moon counts match subtype rules
- Generate the same seed twice and confirm identical output
- Observe moon positions animating in orbit around their parent planets

### Manual Testing -- Phase 2
- Fly ship into a planet's SOI, then into a moon's SOI; confirm HUD shows moon name
- Escape moon SOI; confirm smooth transition back to planet SOI with no position jump
- Transfer from one moon to another within the same planet's SOI
- Escape planet SOI to star SOI from within a moon's SOI (two-level escape)

### Manual Testing -- Phase 3
- Visually inspect each planet subtype for distinct rendering
- Confirm moons render at correct positions relative to their parent
- Check that gas giant rings are visible and do not clip through other bodies
- Run with a large system (8 planets, many moons) and confirm smooth framerate

### Manual Testing -- Phase 4
- Click on moons in game view and verify scan panel opens with real orbital data
- Check minimap shows orbit rings at appropriate zoom levels
- Verify no UI regressions (fuel display, speed display, coordinate display)

---

## Dependencies

### Prerequisites
- Feature 0001 physics engine (orbit.js, physics.js, units.js, ship.js) must be complete and stable
- Existing `computeSOIRadius`, `trueAnomalyAtTime`, `stateFromOrbitalElements` functions in orbit.js

### External Dependencies
- None (vanilla JS, zero dependencies)

### Blocking/Blocked By
- Blocked by: Feature 0001 (orbital mechanics engine) -- already complete
- Blocks: Epic 0001 Milestone 3 (galaxy map / inter-system travel) which builds on the richer system structure

---

## Open Questions

- Should moons have their own anomaly chance, or are anomalies only at the system level?
- What is the minimum visual radius for moons to remain clickable on screen? (Currently planets go down to 12px)
- Should the system transition boundary (currently 4000 units from star) be adjusted given that large gas giant moon systems may extend further from the star?
- Should moon names be generated procedurally from the parent planet name (e.g., "Aethon I", "Aethon II") or drawn from a separate name pool?
