# Feature Plan: Surface Interaction Panel

## Objective
Add a surface interaction HUD panel that appears when the ship is landed, providing scan and sample actions with science point rewards, body-type-specific flavor, and a persistent science counter in the main HUD.

**Purpose:** Landing without interaction is hollow. This phase makes landing rewarding by giving the player something to do on the surface -- scan for data, collect samples, and accumulate science points as exploration progress currency.

**Output:** `js/surface.js` module, surface panel HTML/CSS, science counter in HUD, scanned-body tracking

**Dependency:** Phase 1 must be complete. This plan assumes `js/landing.js` exists and exposes a landed state (e.g., `ship.landed === true` and `ship.landedBody` referencing the body the ship is on). If Phase 1 uses different property names, adapt accordingly.

## Must-Haves (Goal-Backward)

### Observable Truths
1. When the ship lands on a body, a surface interaction panel appears showing the body name, subtype, and available actions
2. Clicking "Scan" on a never-scanned body awards science points and shows discovery text
3. Clicking "Scan" on an already-scanned body shows "Already Scanned" and awards zero points
4. Different body subtypes (Rocky, Ice World, Volcanic, Ocean World, Desert, Lush, Moon) show distinct scan descriptions and sample flavor text
5. A science points counter is visible in the main HUD bar at all times (once the game starts) and accumulates across landings
6. The surface panel hides when the ship launches (Phase 4 will trigger this; this phase must support it via a hide/show API)

### Required Artifacts
| Path | Provides | Key Exports |
|------|----------|-------------|
| `js/surface.js` | Surface interaction logic, science state, scanned-body tracking | `SurfaceInteraction` class or functions: `showSurfacePanel(body)`, `hideSurfacePanel()`, `getScience()`, `isScanned(bodyName)` |
| `index.html` | Surface panel markup inside `#ui-overlay`, science counter in `#hud` | `#surface-panel`, `#surface-scan-btn`, `#surface-sample-btn`, `#science-display` |
| `css/style.css` | Styling for surface panel and science counter | `#surface-panel`, `#science-display` selectors |
| `js/main.js` | Wiring: show panel on landed state, hide on launch, update science display | Modified `update()` function |

### Key Links
| From | To | Via |
|------|-----|-----|
| `main.js` update loop | `surface.js` show/hide | Check `ship.landed` each frame, call `showSurfacePanel(ship.landedBody)` on transition to landed |
| `surface.js` scan action | scanned-body Set | Track by body name + system seed to avoid cross-system collisions |
| `surface.js` science points | `#science-display` in HUD | Module-level `sciencePoints` variable, updated on scan, read by main.js each frame |
| Surface panel buttons | `surface.js` handlers | DOM click event listeners on `#surface-scan-btn` and `#surface-sample-btn` |

## Dependency Graph
```
Task 1 (needs: Phase 1 landed state) -> creates: js/surface.js, index.html markup, css/style.css styles
Task 2 (needs: Task 1)               -> creates: main.js wiring, integration verification
```

## Execution Sequences
| Sequence | Tasks | Parallel |
|----------|-------|----------|
| 1 | Task 1 | No |
| 2 | Task 2 | No |

## Tasks

### Task 1: Create surface interaction module, HTML panel, and CSS
**Type:** auto
**Sequence:** 1

<files>
js/surface.js
index.html
css/style.css
</files>

<action>
Create `js/surface.js` with named exports for surface interaction logic:

- A module-level `sciencePoints` variable (starts at 0) and a `Set` tracking scanned body keys (use `systemSeed + ':' + bodyName` as key to avoid cross-system duplicates).
- `showSurfacePanel(body, systemSeed)` -- populates and shows the `#surface-panel` DOM element with: body name, subtype, description, and enables Scan/Sample buttons. Wire click handlers on the buttons (use a pattern that avoids duplicate listeners -- e.g., replace onclick or use a flag).
- `hideSurfacePanel()` -- hides the panel, used when launching.
- `getScience()` -- returns current science points.
- `isScanned(bodyName, systemSeed)` -- returns whether a body has been scanned.
- Scan action: if not yet scanned, add to scanned set, award points (scale by subtype -- e.g., Rocky: 10, Gas Giant: 0 (unlanded), Ice World: 20, Ocean World: 25, Volcanic: 30, Lush: 15, Desert: 10, Moon: 5), show discovery text in the panel. If already scanned, show "Already Scanned" message, no points.
- Sample action: show body-subtype-specific flavor text in the panel (Rocky: mineral analysis, Ice World: core sample, Volcanic: thermal reading, Ocean World: depth probe, Lush: bio sample, Desert: geological survey, Moon: regolith sample). No points, just flavor.
- Subtype-specific data should be a plain object constant (SUBTYPE_DATA) mapping subtype string to { scanPoints, scanText, sampleText }.

Add HTML to `index.html` inside `#ui-overlay` (after `#scan-panel`):
- `#surface-panel` div (hidden by default with class `hidden`) containing: body name heading (`#surface-body-name`), subtype label (`#surface-body-type`), description (`#surface-body-desc`), a "Scan" button (`#surface-scan-btn`), a "Collect Sample" button (`#surface-sample-btn`), and a result/feedback area (`#surface-result`).
- In `#hud-right`, add a `#science-display` span showing "Science: 0" (styled like the fuel display but in a distinct color like gold/amber).

Add CSS to `css/style.css`:
- `#surface-panel`: positioned on the left side of the screen (not overlapping orbit HUD -- use `left: 20px; top: 50%; transform: translateY(-50%)`), similar glass-panel styling to `#scan-panel` (dark translucent background, border, backdrop-filter). Width ~280px.
- Buttons styled consistently with game aesthetic (transparent bg, colored border, hover glow).
- `#science-display` styled in gold/amber color (`#ffd740`) with text-shadow glow.
- `#surface-panel.hidden` should match the pattern used by `#scan-panel.hidden` (opacity 0, pointer-events none, slight transform offset).
</action>

<verify>
1. File exists: `js/surface.js` with exports `showSurfacePanel`, `hideSurfacePanel`, `getScience`, `isScanned`
2. File updated: `index.html` contains `#surface-panel`, `#surface-scan-btn`, `#surface-sample-btn`, `#surface-result`, `#science-display`
3. File updated: `css/style.css` contains `#surface-panel` and `#science-display` selectors
4. Module loads without errors: open browser dev tools, `import('./js/surface.js')` resolves without syntax errors
5. SUBTYPE_DATA covers at least: Rocky, Ice World, Volcanic, Ocean World, Lush, Desert, Moon
</verify>

<done>
Surface module exists with scan/sample logic, scanned-body tracking, science point accumulation. HTML panel and science counter markup present. CSS styles applied. Module is importable without errors.
</done>

### Task 2: Wire surface panel into game loop
**Type:** auto
**Sequence:** 2

<files>
js/main.js
</files>

<action>
Import `showSurfacePanel`, `hideSurfacePanel`, `getScience` from `./surface.js` in `main.js`.

Add a `scienceDisplay` DOM reference for `#science-display`.

In the `update()` function:
- Track a `wasLanded` flag (module-level boolean) to detect the transition into landed state. When `ship.landed` transitions from false to true, call `showSurfacePanel(ship.landedBody, currentSystemSeed)`. When it transitions from true to false, call `hideSurfacePanel()`.
- Each frame, update `scienceDisplay.textContent` to show `'Science: ' + getScience()`.
- When a system transition occurs (the seed increment block), call `hideSurfacePanel()` to close any open panel.

Ensure the surface panel is hidden during map mode -- if `mapMode.isActive()` becomes true while landed, hide the panel; restore it when map mode exits if still landed.
</action>

<verify>
1. `js/main.js` imports from `./surface.js`
2. `#science-display` updates each frame with current science value
3. Manual test flow: land on a body (Phase 1 prerequisite) -> surface panel appears -> click Scan -> science counter increments -> click Scan again -> "Already Scanned" message, no increment -> click Sample -> flavor text appears -> launch -> panel hides
4. Domain complete: science points persist across multiple landings in the same session; different subtypes show different text; scanned state persists so re-landing on same body shows "Already Scanned"
</verify>

<done>
Surface panel shows/hides in sync with landed state. Science counter updates in the HUD. Scan awards points once per body. Sample shows flavor text. System transition clears the panel.
</done>

## Verification Checklist
- [x] `js/surface.js` exports `showSurfacePanel`, `hideSurfacePanel`, `getScience`, `isScanned`
- [x] `index.html` has `#surface-panel` with scan/sample buttons and `#science-display` in HUD
- [x] `css/style.css` styles the surface panel and science counter
- [x] `js/main.js` imports surface module and wires show/hide to landed state transitions
- [x] First scan of a body awards science points and shows discovery text
- [x] Second scan of same body shows "Already Scanned", no points
- [x] At least 6 subtypes have distinct scan/sample text (Rocky, Ice World, Volcanic, Ocean World, Lush, Desert)
- [x] Science counter visible in HUD and accumulates across landings
- [x] Surface panel hides on launch and during map mode
- [x] No console.log statements, follows project conventions (2-space indent, single quotes, semicolons)

Completed: 2026-04-02

## Success Criteria
The surface interaction panel appears after landing, provides meaningful scan/sample interactions with body-type-specific flavor, tracks scanned bodies to prevent duplicate science awards, and displays a persistent science counter in the main HUD. All code follows existing project conventions.
