# Feature Plan: Phaser 4 Migration - Phase 5: LandingScene

## Objective

Build the LandingScene that handles final approach and touchdown when the player nears a landable celestial body.

**Purpose:** Provide dedicated landing gameplay with altitude-based camera zoom, descent telemetry, crash/success detection, and smooth transitions to SurfaceScene or back to FlightScene.

**Output:** A complete LandingScene that activates on approach, displays landing HUD, handles crash/landing outcomes, rejects gas giants, and transitions appropriately.

## Must-Haves (Goal-Backward)

### Observable Truths
- Approaching a planet/moon surface triggers transition from FlightScene to LandingScene
- Landing HUD displays altitude, vertical speed (descent rate), and horizontal velocity
- Camera zooms in as altitude decreases (closer = more zoomed)
- Surface horizon renders at bottom of screen with terrain hints
- Crashing (vertical speed >50 m/s on contact) shows crash effect and respawns to FlightScene
- Landing gently (vertical speed <10 m/s) transitions to SurfaceScene
- Attempting to land on a gas giant rejects and returns to FlightScene with warning

### Required Artifacts
| Path | Provides | Key Exports |
|------|----------|-------------|
| `src/scenes/LandingScene.ts` | Landing sequence scene | LandingScene class |
| `src/lib/landing.ts` | Landing physics/state logic | updateLandingState, LandingState type, LANDING_THRESHOLDS |

### Key Links
| From | To | Via |
|------|-----|-----|
| `FlightScene` | `LandingScene` | `this.scene.start('LandingScene', shipData)` when altitude < threshold |
| `LandingScene` | `SurfaceScene` | `this.scene.start('SurfaceScene', landingData)` on successful landing |
| `LandingScene` | `FlightScene` | `this.scene.start('FlightScene', respawnData)` on crash or gas giant rejection |
| `LandingScene` | `src/lib/landing.ts` | Import landing state machine and threshold constants |

## Dependency Graph
```
Task 1 (needs Phase 4 complete) -> creates: src/lib/landing.ts
Task 2 (needs Task 1)           -> creates: src/scenes/LandingScene.ts with full rendering, HUD, transitions
```

## Execution Sequences
| Sequence | Tasks | Parallel |
|----------|-------|----------|
| 1 | Task 1 | No |
| 2 | Task 2 | No |

## Tasks

### Task 1: Port Landing Physics to TypeScript
**Type:** auto
**Sequence:** 1
Completed: 2026-04-02

<files>
src/lib/landing.ts
src/types/index.ts
</files>

<action>
Port the landing state machine from `js/landing.js` to TypeScript:

1. Create `src/lib/landing.ts` with:
   - `LandingState` type: `'inactive' | 'approach' | 'landed' | 'crashed' | 'crushed' | 'ascending'`
   - `LandingTelemetry` interface: altitude, descentRate, horizontalVelocity, surfaceGravity, isGasGiant, bodyName
   - `LANDING_THRESHOLDS` constants: SAFE_DESCENT_RATE (10 for Phaser version), SAFE_HORIZONTAL_VEL (15), APPROACH_FACTOR (3), CRUSH_FACTOR (0.5), CRASH_DESCENT_RATE (50)
   - `calculateLandingTelemetry(shipPos, shipVel, body)` pure function returning telemetry
   - `determineLandingOutcome(telemetry, currentState)` pure function returning next state
   - `isLandableBody(body)` type guard for planet/moon with non-gas-giant subtype

2. Update `src/types/index.ts` to export LandingState and LandingTelemetry types

Keep the physics logic identical to js/landing.js but with full type safety. No Phaser imports in this file - pure framework-agnostic logic.
</action>

<verify>
1. File exists: `src/lib/landing.ts` exports LandingState, LandingTelemetry, LANDING_THRESHOLDS, calculateLandingTelemetry, determineLandingOutcome, isLandableBody
2. TypeScript compiles: `npx tsc --noEmit` passes with no errors
3. Types exported: `src/types/index.ts` includes LandingState and LandingTelemetry exports
4. Pure functions: `src/lib/landing.ts` has zero Phaser imports (grep returns no matches)
</verify>

<done>
Landing physics module compiles with strict TypeScript; all functions are pure and testable; types are exported from types/index.ts
</done>

---

### Task 2: Implement LandingScene with HUD and Transitions
**Type:** auto
**Sequence:** 2

<files>
src/scenes/LandingScene.ts
src/scenes/FlightScene.ts
src/main.ts
</files>

<action>
Create the complete LandingScene:

1. Create `src/scenes/LandingScene.ts`:
   - Extend Phaser.Scene with key 'LandingScene'
   - In `init(data)`: receive ship state and target body from FlightScene
   - Scene state: ship position/velocity (body-relative), targetBody, currentTelemetry, zoomLevel
   
2. Landing HUD (Phaser Text objects):
   - Altitude display (top-left): "ALT: {value} km"
   - Vertical speed display: "VS: {value} m/s" with color coding (green <10, yellow 10-50, red >50)
   - Horizontal velocity display: "HVEL: {value} m/s"
   - Body name display: "LANDING: {bodyName}"

3. Camera zoom system:
   - Calculate target zoom from altitude: `1 + (1 - altitude/approachThreshold) * 2` (zooms from 1x to 3x)
   - Lerp current zoom toward target each frame for smooth transition
   - Use Phaser camera zoom: `this.cameras.main.setZoom(zoomLevel)`

4. Surface horizon rendering:
   - Draw ground line at bottom of screen using Phaser Graphics
   - Simple terrain hints: slight undulation using sine wave
   - Body-specific coloring (use body.color or derive from body.hue)

5. Ship rendering and physics:
   - Draw ship using Phaser Graphics (triangle shape)
   - Apply gravity each frame toward body center
   - Handle thrust input (up arrow/W) with body-relative velocity changes
   - Track body-relative position (convert world coords to altitude + lateral position)

6. Outcome detection and transitions:
   - On `crashed` state: screen shake, red flash, particle burst, then `this.scene.start('FlightScene', respawnData)` after 1.5s
   - On `landed` state: `this.scene.start('SurfaceScene', { body, ship, sciencePoints })`
   - On gas giant detection (`crushed` state): warning text "Cannot land on gas giant", return to FlightScene after 2s
   - On `ascending` state above threshold: return to FlightScene with current ship state

7. Update `src/scenes/FlightScene.ts`:
   - Add transition logic: when ship altitude < body.radius * APPROACH_FACTOR and within SOI, call `this.scene.start('LandingScene', { ship, body })`

8. Register LandingScene in `src/main.ts` scene array
</action>

<verify>
1. Scene registered: `src/main.ts` includes LandingScene in the scenes array
2. FlightScene triggers transition: Flying ship close to a planet (altitude < approach threshold) starts LandingScene
3. HUD displays: LandingScene shows altitude, vertical speed, horizontal velocity, and body name
4. Zoom works: Camera zooms in as altitude decreases (visible zoom change)
5. Surface renders: Ground line visible at bottom of screen with body-appropriate color
6. Crash works: Descending >50 m/s on contact shows shake/flash effect, then returns to FlightScene
7. Landing works: Descending <10 m/s on contact transitions to SurfaceScene (or placeholder if SurfaceScene not ready)
8. Gas giant rejection: Approaching gas giant shows warning and returns to FlightScene
9. Ascent exit: Thrusting up and reaching approach threshold returns to FlightScene with state
</verify>

<done>
LandingScene fully functional: HUD displays telemetry, camera zooms on approach, crash/landing/gas-giant outcomes work correctly, all scene transitions preserve state
</done>

## Verification Checklist
- [ ] `src/lib/landing.ts` exists with typed landing state machine
- [ ] `src/scenes/LandingScene.ts` exists and is registered in main.ts
- [ ] FlightScene triggers LandingScene transition on approach
- [ ] Landing HUD shows altitude, vertical speed, horizontal velocity
- [ ] Camera zoom increases as altitude decreases
- [ ] Surface horizon renders at screen bottom
- [ ] Crash (>50 m/s descent) triggers crash effect and FlightScene respawn
- [ ] Gentle landing (<10 m/s descent) transitions to SurfaceScene
- [ ] Gas giant approach shows rejection message and returns to FlightScene
- [ ] Ascending above threshold returns to FlightScene with preserved state
- [ ] `npx tsc --noEmit` passes with no errors

## Success Criteria

Phase 5 is complete when:
1. Approaching any planet/moon surface triggers transition to LandingScene
2. Landing HUD displays altitude, descent rate, and horizontal velocity in real-time
3. Camera zooms in progressively as altitude decreases (1x to 3x range)
4. Surface horizon renders at bottom of screen with terrain-appropriate coloring
5. Crashing (>50 m/s vertical speed on contact) shows visual effects and respawns
6. Landing gently (<10 m/s vertical speed on contact) transitions to SurfaceScene
7. Attempting to land on a gas giant shows rejection message and returns to FlightScene
8. All transitions preserve ship state correctly (fuel, position, velocity)
9. TypeScript compilation passes with strict mode enabled
