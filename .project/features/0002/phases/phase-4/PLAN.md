# Feature Plan: Enhanced Minimap, Info Panel, and UI Integration

## Objective
Upgrade the minimap to visualize the full star > planet > moon hierarchy with nested orbit rings. Replace cosmetic scan panel text with real orbital data. Wire moons into all UI interactions so they behave as first-class bodies (click-to-scan, nearest-body detection, fuel regeneration exclusion, SOI location display).

**Purpose:** The player needs to see and interact with moons through the same UI systems that work for stars and planets. Without this, moons exist in the simulation but are invisible to the UI layer.
**Output:** Modified `js/renderer.js`, `js/main.js`, `index.html`

## Must-Haves (Goal-Backward)

### Observable Truths
1. Minimap draws orbit rings for planets around the star (concentric circles at each planet's semi-major axis)
2. Minimap draws orbit rings for moons around their parent planet (smaller circles centered on the planet dot)
3. Moon dots appear on the minimap at their correct positions
4. Clicking a moon in the game view opens the scan panel showing that moon's data
5. Scan panel for any body (star, planet, moon) shows real orbital data: mass, radius, SOI radius, orbital period, semi-major axis, eccentricity
6. Location display shows the correct SOI body name at all three hierarchy levels (star, planet, moon)
7. Fuel regeneration only triggers near stars, not near moons or planets
8. System transition boundary uses world-space distance correctly with the expanded body list

### Required Artifacts
| Path | Provides | Key Exports |
|------|----------|-------------|
| `js/renderer.js` | Enhanced `drawMinimap()` with orbit rings and moon support | `drawMinimap` (modified signature or internal logic) |
| `js/main.js` | Updated `showScan()` with real orbital data, moon-aware click/scan/fuel/location logic | No new exports (entry point) |
| `index.html` | Scan panel markup with orbital data fields | N/A (HTML) |

### Key Links
| From | To | Via |
|------|-----|-----|
| `drawMinimap()` | planet.orbitalElements.a | Reads semi-major axis to draw orbit ring radius |
| `drawMinimap()` | moon.parentBody | Determines center point for moon orbit ring |
| `showScan()` | body.orbitalElements | Reads real orbital data instead of cosmetic `details` |
| click-to-scan loop | system.bodies | Must include moons (already in bodies array after Phase 1) |
| fuel regen loop | body.kind | Must check `=== 'star'` (already does, no change needed) |
| `shipWorldPosition()` | moon.parentBody.x/y | Phase 2 already handles three-level nesting |

## Dependency Graph
Task 1 (needs nothing from this phase) -> creates: enhanced minimap with orbit rings and moon dots
Task 2 (needs nothing from this phase) -> creates: updated scan panel markup and real orbital data display, moon-aware UI logic

Tasks 1 and 2 are independent -- they modify different functions in different files (minimap rendering vs scan/UI logic).

## Execution Sequences
| Sequence | Tasks | Parallel |
|----------|-------|----------|
| 1 | Task 1, Task 2 | Yes |

## Tasks

### Task 1: Enhanced Minimap with Nested Orbit Rings
**Type:** auto
**Sequence:** 1
**Status:** complete
Completed: 2026-04-01

<files>
js/renderer.js
</files>

<action>
Upgrade `drawMinimap()` in `renderer.js` to visualize the full system hierarchy:

1. Draw orbit rings for each planet around the star. For each planet, draw a circle centered on the star's minimap position with radius = `planet.orbitalElements.a * scale`. Use a subtle dashed or solid stroke (e.g., `rgba(100, 140, 180, 0.15)`).

2. Draw orbit rings for each moon around its parent planet. For each moon body (where `body.kind === 'moon'`), draw a circle centered on the parent planet's minimap position with radius = `moon.orbitalElements.a * scale`. Use an even subtler stroke to distinguish from planet orbits.

3. Ensure moon dots render on the minimap. The existing body loop already iterates `system.bodies` which includes moons after Phase 1. Add a `kind === 'moon'` branch that renders moon dots slightly smaller than planet dots (e.g., `Math.max(1, body.radius * scale * 2)`).

4. The function signature stays the same: `drawMinimap(minimapCtx, ship, bodies, camera)`. Planet orbit rings require access to `orbitalElements.a` on each body. Moon orbit rings require access to `parentBody` on each moon. Both are already present on the body objects from Phase 1.

Keep the minimap performant -- orbit rings are just `ctx.arc` calls with no fills, so this adds negligible overhead.
</action>

<verify>
1. File modified: `js/renderer.js` contains updated `drawMinimap()` function
2. Code review: `drawMinimap()` iterates bodies and draws `ctx.arc` orbit rings for planets (centered on star position) and moons (centered on parent planet position)
3. Code review: Moon dots render with `kind === 'moon'` branch in the body loop
4. No new exports added, no existing exports removed
5. Domain complete: Load the game in browser, observe minimap shows concentric orbit rings around the star for each planet. When a planet has moons, smaller orbit rings appear centered on that planet's dot.
</verify>

<done>
Minimap renders orbit rings for all planets around the star and orbit rings for all moons around their parent planets. Moon dots appear on the minimap at correct positions. No performance regression.
</done>

### Task 2: Real Orbital Data in Scan Panel and Moon-Aware UI
**Type:** auto
**Sequence:** 1

<files>
index.html
js/main.js
</files>

<action>
Three changes across two files:

**index.html** -- Add dedicated orbital data fields to the scan panel markup inside `#scan-panel`, below `#scan-details`. Add a new `div` with id `scan-orbital` that will hold orbital data rows. Structure it similarly to the orbit HUD with label/value pairs for: Mass, Radius, SOI Radius, Orbital Period, Semi-Major Axis, Eccentricity. These should be generic elements that `showScan()` populates dynamically.

**js/main.js -- showScan()** -- Replace the cosmetic `body.details` display with real computed orbital data. For any body that has `orbitalElements`, compute and display:
- Mass: `body.mass` (with units)
- Radius: `body.radius` (with units)
- SOI Radius: `body.soiRadius` (with units, skip for stars)
- Orbital Period: compute from `T = 2 * PI * sqrt(a^3 / mu_parent)` where mu_parent is `body.parentBody.mu`
- Semi-Major Axis: `body.orbitalElements.a`
- Eccentricity: `body.orbitalElements.e`

For stars (no orbitalElements), show mass, radius, and the existing details (temperature, luminosity). For anomalies, keep existing behavior. Keep the existing name/type/description display; add the orbital data below it.

**js/main.js -- click-to-scan and nearest-body** -- These already iterate `system.bodies` which includes moons after Phase 1. Verify no filtering excludes moons. The `drawBody()` dispatch in renderer.js (from Phase 3) already handles `kind === 'moon'`, so click hit-testing works if the moon is drawn on screen.

**js/main.js -- location display** -- The `locationDisplay` already shows `ship.currentSOIBody.name`. After Phase 2, `currentSOIBody` can be a moon, so this already works at all three hierarchy levels. No change needed, but verify it reads correctly.

**js/main.js -- fuel regeneration** -- Already filters `body.kind === 'star'`. No change needed. Moons are naturally excluded.

**js/main.js -- system transition** -- Already uses `dist(wp.x, wp.y, 0, 0) > 4000` with world-space position. No change needed since `shipWorldPosition()` (Phase 2) computes correct world-space for three-level nesting.
</action>

<verify>
1. File modified: `index.html` contains `#scan-orbital` section inside `#scan-panel`
2. File modified: `js/main.js` contains updated `showScan()` that reads `body.mass`, `body.soiRadius`, `body.orbitalElements.a`, `body.orbitalElements.e` and computes orbital period
3. Code review: `showScan()` handles all three body kinds (star shows class/temp/luminosity, planet/moon shows full orbital data, anomaly shows existing data)
4. Code review: No body kind filters in click-to-scan or nearest-body loops exclude moons
5. Code review: Fuel regeneration loop still checks `body.kind === 'star'`
6. Domain complete: Load game, click a planet -- scan panel shows real mass, SOI radius, semi-major axis, eccentricity, orbital period (computed values, not cosmetic text). Click a moon -- same orbital data appears. Click the star -- shows star-specific data. Location display shows moon name when in moon SOI.
</verify>

<done>
Scan panel displays real orbital data (mass, radius, SOI radius, orbital period, semi-major axis, eccentricity) for any clicked body. Moons are clickable and scannable. Location display reflects the correct SOI body at all hierarchy levels. Fuel regeneration and system transitions work correctly with the expanded body list.
</done>

## Verification Checklist
- [ ] Minimap shows orbit rings for planets around the star
- [ ] Minimap shows orbit rings for moons around their parent planet
- [ ] Moon dots appear on minimap
- [ ] Clicking a moon in game view opens scan panel with that moon's data
- [ ] Scan panel shows real mass, radius, SOI radius for planets and moons
- [ ] Scan panel shows computed orbital period, semi-major axis, eccentricity
- [ ] Star scan panel shows star-specific data (class, temperature, luminosity)
- [ ] Location display shows moon name when ship is in moon SOI
- [ ] Fuel regeneration only triggers near stars (not moons or planets)
- [ ] System transition boundary works correctly (world-space distance > 4000)

## Success Criteria
The minimap visualizes the full three-level system hierarchy with orbit rings at both levels. The scan panel exposes real computed orbital data for every body type. All UI interactions (click, scan, nearest-body, fuel, location, transition) treat moons as first-class citizens with no regressions to existing star/planet behavior.
