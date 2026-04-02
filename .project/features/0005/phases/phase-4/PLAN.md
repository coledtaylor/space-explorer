# Feature Plan: Phaser 4 Migration - Phase 4 (MapScene)

## Objective

Build the system map view with orbit visualization, maneuver node planning, and time warp controls. The MapScene provides a zoomed-out orbital view of the entire star system where players can plan maneuvers and visualize trajectory predictions.

**Purpose:** Enable strategic orbital planning by showing the full system, allowing maneuver node placement and delta-V adjustments, and predicting post-burn trajectories with SOI crossings.

**Output:** A fully functional MapScene that toggles with FlightScene via M key, displays all orbital paths hierarchically, supports maneuver node creation and dragging, shows trajectory predictions, and includes time warp controls.

## Must-Haves (Goal-Backward)

### Observable Truths
- Pressing M key toggles between FlightScene and MapScene
- All celestial body orbits render correctly (star -> planets -> moons hierarchy)
- Ship's current position and orbital path are visible on the map
- Clicking on ship's orbit creates a maneuver node at that position
- Dragging a maneuver node handle adjusts delta-V (prograde/retrograde/normal/radial)
- Predicted post-burn trajectory renders showing SOI transitions
- Time warp buttons (1x, 10x, 100x, 1000x) change simulation speed
- Returning to FlightScene preserves all ship state correctly

### Required Artifacts
| Path | Provides | Key Exports |
|------|----------|-------------|
| `src/scenes/MapScene.ts` | System map scene with maneuver planning | `MapScene` class |
| `src/lib/maneuver.ts` | Maneuver node logic (ported from JS) | `createManeuverNode`, `getNodeWorldPosition`, `getHandlePositions`, `hitTestHandles`, `updateBurnFromDrag`, `getPostBurnState`, `getManeuverDeltaV` |

### Key Links
| From | To | Via |
|------|-----|-----|
| `FlightScene.ts` | `MapScene.ts` | Phaser scene switch on M key press |
| `MapScene.ts` | `FlightScene.ts` | Phaser scene switch on M key press |
| `MapScene.ts` | `src/lib/maneuver.ts` | Import for maneuver node creation/manipulation |
| `MapScene.ts` | `src/lib/trajectory.ts` | Import for post-burn trajectory prediction |
| `MapScene.ts` | `src/lib/celestial.ts` | Import for orbital hierarchy access |
| Scene data | Both scenes | Phaser registry or scene data passing for ship state |

## Dependency Graph
```
Task 1 (needs Phase 3 complete) -> creates: src/lib/maneuver.ts, MapScene skeleton, M key toggling
Task 2 (needs Task 1)           -> creates: Orbit rendering, ship position on map, zoom/camera
Task 3 (needs Task 2)           -> creates: Maneuver node interaction, trajectory prediction, time warp UI
```

## Execution Sequences
| Sequence | Tasks | Parallel |
|----------|-------|----------|
| 1 | Task 1 | No |
| 2 | Task 2 | No |
| 3 | Task 3 | No |

## Tasks

### Task 1: Port Maneuver Module and Create MapScene Skeleton
**Type:** auto
**Sequence:** 1
**Status:** Complete
Completed: 2026-04-02

<files>
src/lib/maneuver.ts
src/scenes/MapScene.ts
src/scenes/FlightScene.ts (modify - add M key handler)
src/main.ts (modify - register MapScene)
</files>

<action>
Port the maneuver node logic from js/maneuver.js to TypeScript and create the MapScene skeleton with scene toggling.

1. Create `src/lib/maneuver.ts`:
   - Port all functions from js/maneuver.js with full TypeScript types
   - Define `ManeuverNode` interface (nu, orbitalElements, soiBody, burnVector)
   - Define `BurnVector` interface (prograde, normal)
   - Export: createManeuverNode, getNodeWorldPosition, getHandlePositions, hitTestHandles, updateBurnFromDrag, getPostBurnState, getManeuverDeltaV
   - Import stateFromOrbitalElements from orbit.ts
   - No module-level mutable state (move maneuverNodes array to scene state)

2. Create `src/scenes/MapScene.ts`:
   - Extend Phaser.Scene with key 'MapScene'
   - In create(): Initialize camera, set dark background, add placeholder "Map View" text
   - In update(): Handle M key to switch back to FlightScene
   - Store reference to ship state via scene data or registry
   - Initialize maneuverNodes array as scene-level state

3. Modify `src/scenes/FlightScene.ts`:
   - Add M key input listener
   - On M press: pause FlightScene, start MapScene, pass ship state via scene data
   - Use this.scene.start('MapScene', { ship, bodies, camera }) or registry

4. Modify `src/main.ts`:
   - Import and register MapScene in the Phaser config scene array
</action>

<verify>
1. File exists: src/lib/maneuver.ts with typed exports (no `any` types)
2. File exists: src/scenes/MapScene.ts extending Phaser.Scene
3. TypeScript compiles: `npx tsc --noEmit` passes with no errors
4. Scene toggle works: Run dev server, press M in FlightScene, MapScene displays "Map View" text
5. Return toggle: Press M in MapScene, returns to FlightScene
6. State preserved: After toggling to MapScene and back, ship position and velocity unchanged
</verify>

<done>
Maneuver module ported to TypeScript with full types; MapScene skeleton exists; M key toggles between FlightScene and MapScene; ship state preserved across transitions
</done>

---

### Task 2: Orbit Visualization and Ship Position
**Type:** auto
**Sequence:** 2
**Status:** Complete
Completed: 2026-04-02

<files>
src/scenes/MapScene.ts (modify)
</files>

<action>
Implement orbit path rendering and ship position visualization on the map.

1. Implement map camera and zoom:
   - Calculate zoom level to fit entire system (outermost planet orbit with padding)
   - Center camera on star (0, 0) or current SOI body
   - Smooth lerp transition when entering/exiting map mode

2. Render orbital paths using Phaser Graphics:
   - Draw star at center
   - For each planet: draw orbital ellipse around star using orbitalElements (a, e, omega)
   - For each moon: draw orbital ellipse around parent planet
   - Use different colors/opacities for hierarchy (brighter for planets, dimmer for moons)
   - Ellipse rendering: use Graphics.strokeEllipse or parametric path

3. Render celestial bodies on orbits:
   - Draw small circles for planets/moons at their current orbital positions
   - Color-code by body type (use existing body.color or body.hue)
   - Scale body size inversely with zoom (stay visible at map scale)

4. Render ship on map:
   - Draw ship icon/marker at ship's world position
   - Draw ship's current orbital path (ellipse around currentSOIBody)
   - Indicate ship's orbital direction (small arrow or velocity vector)
   - Ship marker should stand out (bright color, larger than moons)

5. Add minimal HUD:
   - Display current SOI body name
   - Display zoom level (optional)
</action>

<verify>
1. Zoom correct: Map view shows entire star system with all planet orbits visible
2. Orbits render: Each planet has a visible elliptical orbit path around the star
3. Moon orbits: Moons have visible orbits around their parent planets
4. Bodies visible: All celestial bodies appear as colored circles at correct positions
5. Ship visible: Ship marker clearly visible on map at correct world position
6. Ship orbit: Ship's orbital path around current SOI body renders as ellipse
7. Camera smooth: Toggling to map mode shows smooth zoom-out transition
</verify>

<done>
All orbital paths render hierarchically (star -> planets -> moons); ship position and orbit visible; map camera zooms to show entire system; bodies colored and scaled appropriately
</done>

---

### Task 3: Maneuver Node Interaction and Time Warp
**Type:** auto
**Sequence:** 3

<files>
src/scenes/MapScene.ts (modify)
src/lib/timewarp.ts (create)
</files>

<action>
Implement maneuver node creation, dragging, trajectory prediction, and time warp controls.

1. Create `src/lib/timewarp.ts`:
   - Port from js/timewarp.js with TypeScript types
   - Export WARP_STEPS array [1, 10, 100, 1000]
   - Export functions: getWarpRate, setWarpRate (or increaseWarp/decreaseWarp)
   - Make warp state scene-local or use a simple exported variable

2. Maneuver node placement:
   - On click, raycast to determine if click is on ship's orbital path
   - If on orbit: calculate true anomaly (nu) at click point
   - Create maneuver node at that nu using createManeuverNode
   - Render node as a circle with four handles (prograde/retrograde/normal/radial)
   - Display delta-V values near node

3. Maneuver node dragging:
   - On pointer down: hitTestHandles to detect which handle is grabbed
   - On pointer move: updateBurnFromDrag with world-space delta
   - On pointer up: release handle
   - Update node visual and delta-V display in real-time

4. Trajectory prediction:
   - After any burn vector change, compute post-burn state with getPostBurnState
   - Propagate trajectory forward using trajectory.ts functions
   - Render predicted path as dashed line (different color from current orbit)
   - Detect and mark SOI transitions along predicted path
   - Show encounter markers where trajectory enters new SOI

5. Delta-V budget display:
   - Calculate total delta-V from all maneuver nodes
   - Display in HUD: "Delta-V: X.XX m/s" or similar
   - Compare against available fuel (if fuel-to-delta-V conversion exists)

6. Time warp controls:
   - Add UI buttons or keyboard shortcuts (< and > keys) for warp control
   - Display current warp rate: "1x", "10x", "100x", "1000x"
   - In update(): multiply dt by warp rate for orbital updates
   - Reset warp to 1x when entering maneuver drag or switching to FlightScene
</action>

<verify>
1. Node creation: Clicking on ship's orbit creates a visible maneuver node
2. Node handles: Node displays four draggable handles (prograde/retrograde/normal/radial)
3. Drag updates: Dragging a handle changes the displayed delta-V values
4. Trajectory renders: Post-burn trajectory renders as dashed line from maneuver node
5. SOI markers: If trajectory crosses SOI boundary, a marker indicates the transition
6. Delta-V display: Total delta-V shown somewhere on screen
7. Time warp: Pressing warp buttons changes displayed warp rate
8. Warp affects time: At 10x warp, celestial bodies visibly orbit faster
9. State persists: Creating node in MapScene, returning to FlightScene, then back to MapScene shows node still present
</verify>

<done>
Clicking ship orbit creates maneuver node; dragging handles adjusts delta-V; post-burn trajectory prediction renders with SOI crossings; time warp controls work (1x-1000x); delta-V budget displayed
</done>

## Verification Checklist
- [ ] M key toggles between FlightScene and MapScene
- [ ] All planet orbits render as ellipses around the star
- [ ] Moon orbits render around their parent planets
- [ ] Ship position visible on map
- [ ] Ship's current orbit renders correctly
- [ ] Clicking on ship orbit creates a maneuver node
- [ ] Maneuver node has four directional handles
- [ ] Dragging handles updates burn vector and delta-V display
- [ ] Post-burn trajectory renders from maneuver node
- [ ] SOI transitions marked on predicted trajectory
- [ ] Time warp buttons change simulation speed
- [ ] Warp affects orbital motion visibly
- [ ] Ship state preserved when returning to FlightScene
- [ ] TypeScript compiles with no errors (`npx tsc --noEmit`)
- [ ] No `any` types in new code

## Success Criteria

Phase 4 is complete when:
1. Pressing M toggles between FlightScene and MapScene without losing ship state
2. MapScene displays all orbital paths in correct hierarchy (star -> planets -> moons)
3. Ship's position and current orbital path are clearly visible on the map
4. Clicking on ship's orbit creates a maneuver node at that true anomaly
5. Dragging maneuver node handles adjusts prograde/normal delta-V values
6. Post-burn trajectory prediction renders showing where the ship will go
7. SOI crossings are visible on the predicted trajectory
8. Time warp controls allow speeding up simulation (1x, 10x, 100x, 1000x)
9. All code passes TypeScript strict mode with no `any` types
