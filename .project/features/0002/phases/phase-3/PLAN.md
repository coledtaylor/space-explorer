# Feature Plan: Distinct Subtype Visuals and Rendering

## Objective
Give every celestial body type a unique visual identity so players can distinguish body types at a glance.

**Purpose:** Currently all planets render with the same gradient-circle style (plus a thin atmosphere ring for gas giants, ocean, and lush). Moons have no rendering path at all. This phase makes each subtype visually distinct and adds moon rendering.

**Output:** Updated `js/renderer.js` with per-subtype planet drawing, moon drawing, and minimap moon support.

## Must-Haves (Goal-Backward)

### Observable Truths
- Gas giants are immediately recognizable by their rings and horizontal cloud bands
- Ice worlds shimmer or glint, distinct from all other planet types
- Volcanic worlds glow with a lava-like emission effect
- Ocean, desert, lush, and rocky planets each have a unique visual treatment (not just color differences)
- Moons render as smaller bodies with a distinct draw style (not the same as planet rendering)
- All bodies remain visually clear at default zoom (no overlapping effects, no invisible bodies)
- Frame rate stays at 60fps with a full system (star + 8 planets + ~20 moons)

### Required Artifacts
| Path | Provides | Key Exports |
|------|----------|-------------|
| `js/renderer.js` | Per-subtype planet drawing, moon drawing, minimap moon dots | `drawBody` (modified), `drawMinimap` (modified) |

### Key Links
| From | To | Via |
|------|-----|-----|
| `drawBody()` | `drawMoon()` | `body.kind === 'moon'` dispatch |
| `drawPlanet()` | subtype draw helpers | `body.subtype` switch/dispatch |
| `drawMinimap()` | moon dots | `body.kind === 'moon'` branch with smaller dot size |

## Dependency Graph
Task A (needs nothing) -> creates: per-subtype planet visuals in renderer.js
Task B (needs A complete, since both modify same file) -> creates: moon rendering + minimap moon support

## Execution Sequences
| Sequence | Tasks | Parallel |
|----------|-------|----------|
| 1 | Task 1 | No |
| 2 | Task 2 | No |

## Tasks

### Task 1: Per-Subtype Planet Visuals
**Type:** auto
**Sequence:** 1
**Status:** complete
Completed: 2026-04-01

<files>
js/renderer.js
</files>

<action>
Refactor `drawPlanet()` to dispatch on `body.subtype` and render each planet type with a unique visual treatment. Keep the existing shadow and gradient base, but add subtype-specific effects on top:

- **Gas Giant:** Draw 3-4 horizontal cloud bands across the body (alternating slightly lighter/darker stripes using `body.hue`). Draw a tilted ring (ellipse) around the planet extending ~1.5x the body radius, semi-transparent, with a gap where it passes behind the body.
- **Ice World:** Add a shimmer/glint effect -- a small bright-white specular highlight that shifts position slowly with `time`, plus a faint blue-white outer glow.
- **Volcanic:** Add a dim red/orange outer glow (like heat emission) and 2-3 small bright spots on the surface representing lava flows, positions derived from `body.hue` so they are deterministic.
- **Ocean World:** Add subtle wave-like horizontal bands in blue tones and a slightly thicker, brighter atmosphere ring than other types.
- **Desert:** Add a subtle sandy texture effect via 2-3 darker bands and a faint dust haze (thin warm-toned outer glow).
- **Lush:** Add a thin green atmosphere band and subtle continent-like darker patches (2-3 arcs on the surface).
- **Rocky:** Add 2-3 small crater marks (darker circles on the surface) for a cratered appearance.

Use only Canvas 2D operations (arcs, gradients, lines). Keep each subtype's extra drawing to ~10-20 lines. The effects should be visible at `body.radius` sizes of 12-36px.
</action>

<verify>
1. File modified: `js/renderer.js` contains subtype-specific branches in or called from `drawPlanet()`
2. All 7 subtypes handled: grep for 'Gas Giant', 'Ice World', 'Volcanic', 'Ocean World', 'Desert', 'Lush', 'Rocky' in renderer.js confirms each has a distinct code path
3. Visual check: serve the game (`npx serve .` or equivalent), load a system, and observe that different planet subtypes have visually distinct rendering (rings on gas giants, glow on volcanic, shimmer on ice, etc.)
4. Performance: no visible frame drops with a full system at default zoom
</verify>

<done>
Each of the 7 planet subtypes renders with a unique visual treatment beyond just color. Gas giants have rings and bands. Ice worlds shimmer. Volcanic worlds glow. The remaining types each have at least one distinguishing visual effect.
</done>

### Task 2: Moon Rendering and Minimap Integration
**Type:** auto
**Sequence:** 2

<files>
js/renderer.js
</files>

<action>
Add moon rendering support to `renderer.js`:

1. In `drawBody()`, add a `body.kind === 'moon'` branch that calls a new `drawMoon()` function. Place it after the planet branch.

2. Create `drawMoon(ctx, sx, sy, body, time)` as a module-private function. Moons should look distinct from planets:
   - Smaller visual presence (they already have smaller `radius` from Phase 1)
   - Use a simpler gradient (no atmosphere ring, no subtype effects)
   - Add a subtle cratered texture (2-3 small darker spots on the surface, positions derived from body.hue for determinism)
   - Add a faint shadow on one side to give a crescent/lit appearance

3. In `drawMinimap()`, add a `body.kind === 'moon'` branch that renders moons as smaller dots (minimum radius 1px, slightly dimmer than planets). Use the moon's color but at reduced opacity.

Moon rendering must work with the body positions set by Phase 1's `updateBodyPositions()` -- moons already have world-space `x`/`y` coordinates, so no special position logic is needed in the renderer.
</action>

<verify>
1. File modified: `js/renderer.js` contains `drawMoon` function and `kind === 'moon'` branches in both `drawBody` and `drawMinimap`
2. Code review: `drawMoon` is visually distinct from `drawPlanet` (simpler, no atmosphere, cratered style)
3. Visual check: serve the game, navigate to a planet with moons, confirm moons render at their orbital positions as smaller cratered bodies
4. Minimap check: moons appear as smaller dots on the minimap, distinguishable from planets
5. Performance: system with star + 8 planets + ~20 moons renders at 60fps
</verify>

<done>
Moons render as smaller, cratered bodies distinct from planets. The minimap shows moons as smaller dots. All body types (star, 7 planet subtypes, moon, anomaly) are visually distinguishable.
</done>

## Verification Checklist
- [ ] Gas giants render with visible ring and banded atmosphere
- [ ] Ice worlds have a shimmer/glint effect
- [ ] Volcanic worlds have a visible glow
- [ ] Ocean, desert, lush, and rocky planets each have unique visual treatment
- [ ] Moons render as smaller bodies with their own draw style
- [ ] All body types are visually distinguishable at default zoom
- [ ] Rendering star + up to 8 planets + ~20 moons maintains 60fps
- [ ] Minimap shows moons as smaller dots

## Success Criteria
Every body type in the system is visually identifiable at a glance. A player viewing a system can tell gas giants from ice worlds from volcanic planets without reading labels. Moons are clearly smaller companion bodies, not mini-planets. Performance remains smooth with maximum body counts.
