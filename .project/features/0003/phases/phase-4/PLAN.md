# Feature Plan: Maneuver Nodes with Drag Handles

## Objective
Add KSP-style maneuver nodes that players place on their orbit path in map mode. Each node has four draggable handles (prograde, retrograde, normal, radial) that adjust the burn vector. Dragging a handle updates the post-burn trajectory in real time and displays delta-v cost.

**Purpose:** Enable deliberate orbital planning -- players can design burns visually before executing them, making Hohmann transfers and intercepts plannable rather than guesswork.

**Output:** `js/maneuver.js` module + rendering additions in `js/renderer.js` + interaction wiring in `js/input.js` and `js/main.js` + UI elements in `index.html` and `css/style.css`

**Dependency:** Phases 1-3 must be complete (map mode toggle, orbit rendering, trajectory prediction all exist). This plan assumes `js/mapmode.js` and `js/trajectory.js` exist from earlier phases.

## Must-Haves (Goal-Backward)

### Observable Truths
1. Player can click on their orbit path in map mode to place a maneuver node at that orbital position
2. The node displays four draggable handles extending in the prograde, retrograde, normal, and radial directions
3. Dragging a handle changes the burn vector magnitude in that direction, and the post-burn trajectory updates in real time
4. The post-burn trajectory is drawn in a visually distinct color (e.g., orange or green) from the pre-burn orbit (blue)
5. Delta-v cost is displayed as a label next to the node and updates live as handles move
6. A Hohmann transfer can be planned: place node, drag prograde handle, see trajectory arc toward target planet

### Required Artifacts
| Path | Provides | Key Exports |
|------|----------|-------------|
| `js/maneuver.js` | Maneuver node data model, placement logic, burn vector math, handle hit-testing and drag | `createManeuverNode`, `updateManeuverDrag`, `getPostBurnState`, `getManeuverDeltaV`, `maneuverNodes` (array) |
| `js/renderer.js` | Drawing for maneuver node glyph, four handles, delta-v label, post-burn trajectory | `drawManeuverNode`, `drawPostBurnTrajectory` (new functions) |
| `js/input.js` | Mouse drag tracking for maneuver handles in map mode | `consumeDragStart`, `consumeDragMove`, `consumeDragEnd` or equivalent drag state |
| `js/main.js` | Wire maneuver node placement on orbit click, handle dragging, post-burn trajectory rendering | Modified `update()` and `render()` |
| `index.html` | Maneuver info display element (delta-v readout panel) | `#maneuver-info` div |
| `css/style.css` | Styles for maneuver info panel | `.maneuver-info` styles |

### Key Links
| From | To | Via |
|------|-----|-----|
| Click on orbit path | `createManeuverNode()` | Hit-test orbit path points in `main.js` update, convert screen click to true anomaly |
| Handle drag | `updateManeuverDrag()` | `input.js` drag state consumed in `main.js`, updates burn vector in maneuver node |
| Burn vector change | Post-burn trajectory | `getPostBurnState()` computes new vel, fed to trajectory propagation from Phase 3 |
| Maneuver node state | Renderer | `drawManeuverNode()` reads node position + handles, `drawPostBurnTrajectory()` reads propagated path |

## Dependency Graph
```
Task 1 (needs: orbit.js, utils.js) -> creates: js/maneuver.js, js/input.js (drag support)
Task 2 (needs: Task 1, renderer.js, main.js) -> creates: renderer.js additions, main.js wiring, index.html + css updates
```

## Execution Sequences
| Sequence | Tasks | Parallel |
|----------|-------|----------|
| 1 | Task 1 | Solo |
| 2 | Task 2 | Solo |

## Tasks

### Task 1: Maneuver Node Data Model and Input Drag Support
**Type:** auto
**Sequence:** 1
Completed: 2026-04-01

<files>
js/maneuver.js
js/input.js
</files>

<action>
Create `js/maneuver.js` with the maneuver node data model and logic:

- `createManeuverNode(nu, orbitalElements, soiBody)` -- creates a node at a given true anomaly on the ship's orbit. The node stores: position on orbit (true anomaly), the SOI body, the pre-burn orbital elements, and a burn vector `{ prograde: 0, normal: 0 }` (2D: prograde is tangential, normal is perpendicular).

- `getNodeWorldPosition(node)` -- computes the world-space {x, y} position of the node on the orbit using `stateFromOrbitalElements`.

- `getHandlePositions(node)` -- returns four screen-direction vectors for the prograde/retrograde/normal/radial handles based on the orbital velocity direction at the node's true anomaly. Prograde aligns with velocity, retrograde opposite, normal perpendicular (both directions). Each handle extends from the node center by a fixed pixel distance plus scaled burn magnitude.

- `hitTestHandles(node, worldX, worldY, camera, canvasW, canvasH)` -- returns which handle (if any) is within grab radius of the given screen position. Returns `'prograde'`, `'retrograde'`, `'normal'`, `'radial'`, or `null`.

- `updateBurnFromDrag(node, handle, dragDelta)` -- given which handle is being dragged and the drag pixel delta, updates the node's burn vector (prograde or normal component). Prograde/retrograde adjust the same axis (positive/negative), normal/radial adjust the perpendicular axis.

- `getPostBurnState(node)` -- computes the post-burn velocity by adding the burn vector (rotated into the orbital frame) to the velocity at the node's true anomaly. Returns `{ pos, vel }` in SOI-relative coordinates suitable for trajectory propagation.

- `getManeuverDeltaV(node)` -- returns the total delta-v magnitude of the burn vector.

- Export a module-level `maneuverNodes` array that `main.js` can read/write.

Also update `js/input.js` to support mouse drag:
- Add `dragStart`, `dragging`, `dragX`, `dragY` state fields
- On `mousedown` set `dragStart` with position, on `mousemove` while mouse is down update drag position, on `mouseup` clear drag state
- Add `consumeDragStart()`, `getDragState()`, `consumeDragEnd()` methods following the existing consume pattern
</action>

<verify>
1. File exists: `js/maneuver.js` exports `createManeuverNode`, `getNodeWorldPosition`, `getHandlePositions`, `hitTestHandles`, `updateBurnFromDrag`, `getPostBurnState`, `getManeuverDeltaV`, `maneuverNodes`
2. File exists: `js/input.js` has drag-related state and consume methods alongside existing keyboard/click handling
3. `getPostBurnState` correctly adds burn vector rotated into orbital frame to velocity at node's true anomaly -- verify by reading code that it uses `stateFromOrbitalElements` to get velocity at nu, rotates burn vector by velocity direction angle, and sums
4. All exports use named export pattern, 2-space indent, single quotes, no console.log
</verify>

<done>
`js/maneuver.js` exists with complete maneuver node data model. `js/input.js` supports mouse drag tracking. The burn vector math correctly transforms between orbital frame and world frame.
</done>

### Task 2: Rendering, Wiring, and UI Integration
**Type:** auto
**Sequence:** 2

<files>
js/renderer.js
js/main.js
index.html
css/style.css
</files>

<action>
Add maneuver node rendering to `js/renderer.js`:

- `drawManeuverNode(ctx, camera, node, activeHandle)` -- draws the node as a small circle at its orbit position, with four handle lines extending outward: prograde (green), retrograde (green, opposite direction), normal (purple), radial (purple, opposite direction). The active/dragged handle should be highlighted brighter. Handle length scales with burn magnitude. Draw a delta-v label (e.g., "42.3 m/s") next to the node in white text.

- `drawPostBurnTrajectory(ctx, camera, points)` -- draws the post-burn predicted trajectory as a dashed line in a distinct color (use orange `rgba(255, 160, 40, 0.5)` to contrast with the blue pre-burn orbit). Accepts an array of screen-space points.

Wire maneuver nodes into `js/main.js`:

- In map mode only: when the player clicks near the ship's orbit path (within ~15px of any orbit point), create a maneuver node at the closest true anomaly using `createManeuverNode`. Limit to one node at a time for now (clear previous node on new placement).

- On drag start: hit-test all maneuver node handles. If a handle is grabbed, enter drag mode. On drag move: call `updateBurnFromDrag` with the drag delta. On drag end: finalize.

- In render: if a maneuver node exists, call `drawManeuverNode` and compute post-burn trajectory by calling `getPostBurnState` then propagating it (reuse trajectory prediction logic from Phase 3 if available, otherwise propagate the post-burn orbit using `computeOrbitalElements` on the post-burn state and draw it with `drawOrbitPath` in the distinct color).

- Update the `#maneuver-info` panel to show delta-v when a node exists, hide when no node.

Add to `index.html`:
- A `#maneuver-info` div inside `#ui-overlay` showing the delta-v readout. Keep it minimal: a small floating panel positioned near the bottom-right or alongside the orbit HUD.

Add to `css/style.css`:
- Style `#maneuver-info` with the same dark translucent background used by other HUD panels (`rgba(0, 5, 15, 0.85)` or similar), cyan accent text, position it so it does not overlap existing HUD elements. Hide by default with `.hidden` class.
</action>

<verify>
1. Files modified: `js/renderer.js` has `drawManeuverNode` and `drawPostBurnTrajectory` exports; `js/main.js` imports from `js/maneuver.js`; `index.html` contains `#maneuver-info`; `css/style.css` has `#maneuver-info` styles
2. Open game in browser, enter map mode (M key), click on the ship's orbit path -- a maneuver node glyph appears at the clicked point with four colored handles visible
3. Drag the prograde handle outward -- the delta-v label increases, and an orange post-burn trajectory arc appears showing the new orbit
4. Drag prograde handle further -- trajectory extends into a larger orbit; reduce it -- trajectory shrinks back
5. Drag the normal handle -- trajectory tilts, showing the orbit plane rotating
6. Delta-v readout in `#maneuver-info` panel updates in real time during drag
7. Click a different point on the orbit -- previous node is replaced with new node at new position
8. Domain complete: can visually plan a Hohmann transfer by placing a node and dragging prograde until the post-burn trajectory reaches a target planet's orbit
</verify>

<done>
Maneuver nodes render on the orbit path with four draggable handles. Dragging handles updates the burn vector, the post-burn trajectory renders in orange, and delta-v cost displays next to the node and in the HUD panel. A basic Hohmann transfer is plannable.
</done>

## Verification Checklist
- [ ] `js/maneuver.js` exists with all exported functions
- [ ] `js/input.js` has drag support without breaking existing keyboard/click handling
- [ ] Clicking orbit path in map mode places a maneuver node
- [ ] Four handles (prograde/retrograde/normal/radial) are visible and color-coded
- [ ] Dragging a handle updates burn vector and post-burn trajectory in real time
- [ ] Post-burn trajectory renders in orange (distinct from blue pre-burn orbit)
- [ ] Delta-v label appears next to node and updates during drag
- [ ] `#maneuver-info` panel shows/hides appropriately
- [ ] No console errors, no build steps needed
- [ ] Hohmann transfer can be planned visually (prograde burn shows transfer arc to outer orbit)

## Success Criteria
A player in map mode can click their orbit path to place a maneuver node, drag the prograde handle to increase burn magnitude, see the orange post-burn trajectory extend to a higher orbit, read the delta-v cost, and visually confirm the trajectory intersects a target planet's orbit -- enabling basic Hohmann transfer planning.
