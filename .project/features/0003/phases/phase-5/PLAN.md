# Feature Plan: Time Warp System

## Objective
Add a discrete time warp system that lets players accelerate the physics simulation to skip long coast phases between orbital maneuvers.

**Purpose:** Without time warp, players must wait in real time during long coast phases (e.g., half an orbit to reach apoapsis). This makes orbital planning impractical. Time warp closes the loop on the planning features from Phases 1-4.

**Output:** `js/timewarp.js` module, updated `js/main.js` game loop, updated `js/input.js` key bindings, warp rate HUD element in `index.html` and `css/style.css`.

## Must-Haves (Goal-Backward)

### Observable Truths
- Player presses a key (period/comma or similar) and the simulation speeds up through discrete steps: 1x, 2x, 5x, 10x, 50x
- Player sees the current warp rate displayed in the HUD at all times
- Celestial bodies orbit faster and the ship coasts faster at elevated warp rates
- When the player applies thrust (W/S keys), warp automatically drops to 1x
- When the ship enters a new SOI, warp automatically drops to 1x
- The simulation remains stable at 50x warp (no physics explosions, no missed SOI transitions)

### Required Artifacts
| Path | Provides | Key Exports |
|------|----------|-------------|
| `js/timewarp.js` | Time warp state machine: rate steps, increase/decrease, auto-drop, dt scaling | `WARP_STEPS`, `getWarpRate`, `increaseWarp`, `decreaseWarp`, `resetWarp`, `getWarpIndex` |
| `js/input.js` | Key bindings for warp increase/decrease | Extended `onKey` with period/comma handling, `consumeWarpUp`, `consumeWarpDown` |
| `js/main.js` | Game loop integration: multiply dt by warp rate, sub-stepping for stability, auto-drop on thrust/SOI | Modified `loop()` and `update()` |
| `index.html` | Warp rate display element in HUD | `#warp-display` element |
| `css/style.css` | Styling for warp rate indicator | `#warp-display` rules |

### Key Links
| From | To | Via |
|------|-----|-----|
| `input.js` key handler | `main.js` update | `consumeWarpUp()` / `consumeWarpDown()` called each frame |
| `main.js` loop | `timewarp.js` state | `getWarpRate()` multiplies effective dt |
| `main.js` update | `timewarp.js` auto-drop | `resetWarp()` called when `ship.thrustActive` or SOI transition detected |
| `main.js` update | `index.html` HUD | `warpDisplay.textContent` updated each frame |
| High warp dt | Physics stability | Sub-stepping: divide warped dt into multiple fixed-size steps (max ~0.05s each) |

## Dependency Graph
```
Task 1 (needs nothing) -> creates: js/timewarp.js, js/input.js modifications
Task 2 (needs Task 1)  -> creates: js/main.js integration, index.html warp HUD, css/style.css warp styling
```

## Execution Sequences
| Sequence | Tasks | Parallel |
|----------|-------|----------|
| 1 | Task 1 | Yes |
| 2 | Task 2 | No (depends on Task 1) |

## Tasks

### Task 1: Create time warp module and input bindings
**Type:** auto
**Sequence:** 1
**Status:** Complete
Completed: 2026-04-01

<files>
js/timewarp.js
js/input.js
</files>

<action>
Create `js/timewarp.js` as a stateful module that manages time warp. It should:

- Export a `WARP_STEPS` array: `[1, 2, 5, 10, 50]`
- Track the current warp index (starts at 0 = 1x)
- Export `getWarpRate()` returning the current multiplier
- Export `getWarpIndex()` returning the current index
- Export `increaseWarp()` and `decreaseWarp()` to step through the array (clamped at bounds)
- Export `resetWarp()` to force back to index 0 (1x)

Modify `js/input.js` to add warp key bindings. Use period (`.` / `>`) to increase warp and comma (`,` / `<`) to decrease warp. Follow the existing `consumeInteract` pattern: add `warpUp` and `warpDown` boolean flags set on keydown, with `consumeWarpUp()` and `consumeWarpDown()` methods that read-and-reset. Only trigger on keydown (not held).
</action>

<verify>
1. File exists: `js/timewarp.js` with all listed exports
2. `js/input.js` has `consumeWarpUp()` and `consumeWarpDown()` methods following the consume pattern
3. Pressing `.` sets `warpUp = true`, pressing `,` sets `warpDown = true` (verify by reading key handler code)
4. `WARP_STEPS` is `[1, 2, 5, 10, 50]`, `increaseWarp()` clamps at max index, `decreaseWarp()` clamps at 0
</verify>

<done>
`timewarp.js` exports a complete warp state machine. `input.js` handles period/comma keys with consume pattern. No integration yet.
</done>

### Task 2: Integrate time warp into game loop and HUD
**Type:** auto
**Sequence:** 2

<files>
js/main.js
index.html
css/style.css
</files>

<action>
Wire the time warp system into the game loop and add HUD display.

**index.html:** Add a `#warp-display` element inside `#hud-right`, after the speed display. Text content will be set by JS (e.g., "WARP 1x").

**css/style.css:** Style `#warp-display` to match the existing HUD aesthetic. Use the same font size and text-shadow as other HUD spans. When warp > 1x, the element should be visually prominent — use a bright color like `#ffcc00` (amber/gold). At 1x it can be dimmed or hidden.

**js/main.js integration:**

1. Import from `timewarp.js` and the new consume methods from `input.js`.

2. In the `update()` function, at the top:
   - Check `input.consumeWarpUp()` and `input.consumeWarpDown()`, call `increaseWarp()` / `decreaseWarp()` accordingly.
   - After ship update, check if `ship.thrustActive` is true — if so, call `resetWarp()`.
   - After `checkSOITransition()`, check if a transition occurred — if so, call `resetWarp()`.

3. For physics stability at high warp, use sub-stepping in the game loop. Instead of passing `dt * warpRate` directly to `update()`, compute `effectiveDt = dt * warpRate` and then run multiple sub-steps of the `update()` function, each with a capped sub-dt (e.g., max 0.05s per step). This means at 50x warp with a 16ms frame, effectiveDt = 0.8s, which runs as 16 steps of 0.05s each. This prevents physics explosions and missed SOI boundaries.

4. Update `#warp-display` text each frame to show current warp rate (e.g., "WARP 5x"). Show/hide or dim based on whether warp is 1x.

Important: The sub-stepping loop must call `updateBodyPositions`, `ship.update`, and `checkSOITransition` each sub-step — not just ship physics. Body positions must advance in lockstep. The render function should only run once per frame (after all sub-steps).
</action>

<verify>
1. File exists: `index.html` contains `#warp-display` element inside `#hud-right`
2. File exists: `css/style.css` contains `#warp-display` styling
3. `js/main.js` imports from `timewarp.js` and uses consume methods
4. Sub-stepping logic: verify that the loop divides `effectiveDt` into chunks of max 0.05s each, calling update functions per sub-step
5. Auto-drop on thrust: verify `resetWarp()` is called when `ship.thrustActive` is true
6. Auto-drop on SOI transition: verify `resetWarp()` is called when `checkSOITransition` returns a transition
7. HUD updates: verify `warpDisplay.textContent` is set each frame
8. Manual test: open game in browser, press `.` repeatedly — warp display should cycle through 1x, 2x, 5x, 10x, 50x. Press `,` to decrease. Press W to thrust — warp should reset to 1x. Observe bodies orbiting faster at high warp with no physics instability.
</verify>

<done>
Time warp is fully functional: key presses cycle through 1x/2x/5x/10x/50x, HUD shows current rate, physics sub-steps keep simulation stable, warp auto-drops on thrust or SOI transition.
</done>

## Verification Checklist
- [x] `js/timewarp.js` exists with `WARP_STEPS`, `getWarpRate`, `increaseWarp`, `decreaseWarp`, `resetWarp` exports
- [x] `js/input.js` handles `.`/`,` keys with consume pattern
- [ ] `index.html` has `#warp-display` in HUD
- [ ] `css/style.css` has warp display styling matching HUD aesthetic
- [ ] `js/main.js` imports and wires timewarp + input consume methods
- [ ] Sub-stepping prevents physics explosions at 50x warp (max 0.05s per sub-step)
- [ ] Pressing `.` increases warp through discrete steps, pressing `,` decreases
- [ ] HUD shows current warp rate, visually prominent when > 1x
- [ ] Applying thrust (W/S) auto-drops warp to 1x
- [ ] SOI transition auto-drops warp to 1x
- [ ] Game remains stable during extended 50x warp (no NaN positions, no missed transitions)

## Success Criteria
Player can press `.` to increase time warp through 1x/2x/5x/10x/50x steps and `,` to decrease. The warp rate is visible in the HUD. Bodies orbit and the ship coasts at the accelerated rate. Warp automatically resets to 1x when thrust is applied or an SOI transition occurs. The simulation is stable at all warp rates with no physics explosions.
