# Milestones: Space Explorer — Orbital Mechanics & Galaxy

## Overview

Seven milestones, each delivering independently valuable gameplay. The first two milestones establish the physics and celestial foundation. Milestone 3 adds the planning layer. Milestone 4 introduces landing. Milestone 5 layers on progression systems. Milestone 6 scales to the galaxy. Milestone 7 ties everything together with polish.

The critical ordering decision: Map/Planning Mode (M3) comes before Landing (M4). Players need orbit visualization and maneuver planning tools before they can meaningfully target and land on bodies.

---

## Milestone 1: Physics Engine & Unit System

**Goal:** Replace arcade physics with a patched conics orbital mechanics engine and establish a coherent unit system.

**Delivers:** A ship that orbits a star under real gravity. Players can thrust to change orbits, achieve circular and elliptical orbits, and escape a body's sphere of influence. The foundation every subsequent milestone builds on.

**Dependencies:** None — this is the foundation.

**Key Features:**
- Proper unit system with game-units-to-km mapping and SI-like internal representation
- Gravitational acceleration from the dominant body (patched conics, single SOI)
- Keplerian orbit computation (semi-major axis, eccentricity, orbital period)
- SOI definition and transition detection
- Ship state as orbital elements plus position/velocity
- Thrust model: realistic impulse, no drag in vacuum, fuel consumption
- Clean break rewrite of ship.js (new physics model)
- Clean break rewrite of celestial.js (bodies with mass, radius, SOI radius)
- Basic HUD showing orbital parameters (altitude, velocity, apoapsis, periapsis)

**Acceptance Criteria:**
- [ ] Ship orbits a star in a stable elliptical orbit with no thrust applied
- [ ] Prograde thrust raises the opposite side of the orbit; retrograde thrust lowers it
- [ ] Ship transitions between SOIs when crossing sphere of influence boundaries
- [ ] Orbital parameters displayed on HUD match computed Keplerian elements
- [ ] Unit system is documented and consistently applied across all modules
- [ ] Game runs at 60fps with a single star and orbiting ship
- [ ] No references to old arcade physics remain in ship.js or celestial.js

**Linked Feature:** 0001

**Status:** Planned

---

## Milestone 2: Celestial System Overhaul

**Goal:** Expand procedural generation to produce physically realistic multi-level systems with stars, planets, and moons.

**Delivers:** Star systems with multiple planets orbiting a star and moons orbiting planets. Each body has mass, radius, SOI, and orbital parameters. The ship can fly through a rich system with proper SOI transitions at every level.

**Dependencies:** Milestone 1 (physics engine and unit system)

**Key Features:**
- Hierarchical body structure: star > planets > moons
- Body properties: mass, radius, surface gravity, SOI radius, orbital elements
- Procedural generation of physically plausible systems (stable orbits, reasonable mass ratios)
- Multi-level SOI transitions (moon SOI inside planet SOI inside star SOI)
- Enhanced renderer for varied body types (gas giants, rocky worlds, ice bodies)
- Minimap updated to show full system hierarchy
- Body info panel showing physical properties

**Acceptance Criteria:**
- [ ] Generated systems contain a star with 3-8 planets, and at least some planets have 1-3 moons
- [ ] All bodies have physically consistent properties (SOI radius derived from mass and orbital distance)
- [ ] Ship can orbit a moon, escape to planet SOI, and transfer to another moon
- [ ] System generation is deterministic — same seed always produces same system
- [ ] Body rendering visually distinguishes stars, rocky planets, gas giants, and moons
- [ ] No body orbits overlap or produce immediately unstable configurations

**Linked Feature:** 0002

**Status:** Planned

---

## Milestone 3: Map & Planning Mode

**Goal:** Give players orbit visualization, trajectory prediction, and maneuver node tools for planning flights.

**Delivers:** A toggle-able map mode where players can see their current orbit, predicted trajectory, place maneuver nodes with prograde/retrograde/normal/radial handles, and see the resulting trajectory. Execute burns by following maneuver node guidance.

**Dependencies:** Milestone 1 (orbital mechanics), Milestone 2 (multi-body systems to plan around)

**Key Features:**
- Map mode toggle (M key or UI button) — zoomed-out view of the system
- Current orbit rendered as a conic section (ellipse, hyperbola, or parabola)
- Trajectory prediction: show future path including SOI transitions
- Maneuver node placement on current orbit
- Maneuver node handles: prograde, retrograde, normal, anti-normal, radial in/out
- Delta-v budget display (planned burn cost vs available delta-v)
- Burn execution guidance in real-time mode (time-to-node countdown, burn direction indicator)
- Time warp controls for long transfers
- Encounter prediction: show closest approach to target bodies

**Acceptance Criteria:**
- [ ] Player can toggle between flight mode and map mode seamlessly
- [ ] Current orbit is rendered accurately as a conic section
- [ ] Placing a maneuver node shows the post-burn trajectory in a different color
- [ ] Maneuver handles adjust the burn vector and update the predicted trajectory in real time
- [ ] Delta-v cost of a maneuver node is displayed and updates with handle adjustments
- [ ] Time warp allows skipping long coast phases (at least 2x, 5x, 10x, 50x)
- [ ] A Hohmann transfer between two planets can be planned and executed using maneuver nodes

**Linked Feature:** 0003

**Status:** Planned

---

## Milestone 4: Landing & Surface Interaction

**Goal:** Let players land on celestial bodies and perform abstract surface activities.

**Delivers:** Players can decelerate into a landing trajectory, touch down on a body, and interact with it through an abstract menu — scanning for science data, collecting samples, and completing surface objectives.

**Dependencies:** Milestone 1 (physics), Milestone 2 (bodies with surface gravity), Milestone 3 (trajectory planning for landing approach)

**Key Features:**
- Landing approach: deceleration burn, altitude tracking, vertical/horizontal velocity display
- Touchdown detection and landing success/failure based on descent rate
- Surface interaction screen: abstract menu-based interface (not a platformer)
- Scan action: reveals body composition, atmosphere, unique features
- Sample collection: gathers materials for science points
- Surface objectives: specific tasks tied to missions (e.g., "scan the anomaly on body X")
- Launch from surface: escape back to orbit with fuel cost
- Different surface types yield different scan results and science value

**Acceptance Criteria:**
- [ ] Player can perform a controlled descent and land on a planet or moon
- [ ] Landing too fast results in a crash (failure state with feedback)
- [ ] Surface interaction menu appears after successful landing
- [ ] Scanning a body for the first time yields science points
- [ ] Player can launch from a surface back into orbit
- [ ] Different body types (rocky, gas giant atmosphere, ice) have distinct interaction options
- [ ] Gas giants cannot be landed on (atmospheric crush boundary)

**Linked Feature:** 0004

**Status:** Planned

---

## Milestone 5: Progression System

**Goal:** Build the science, mission, and tech tree systems that give exploration purpose and structure.

**Delivers:** A progression loop where discovery yields science points, missions provide goals and rewards, and the tech tree unlocks better ships and equipment. Players feel a meaningful arc from first orbit to interplanetary capability.

**Dependencies:** Milestone 4 (surface interaction for science collection), Milestone 3 (planning tools for mission completion)

**Key Features:**
- Science points earned from: first orbit of a body, scanning, surface samples, anomaly discovery
- Diminishing returns on repeated visits to the same body
- Mission/contract system: milestone missions (scripted) and procedural contracts
- Milestone missions: first orbit, first moon landing, first interplanetary transfer, etc.
- Currency earned from mission completion
- Tech tree with branches: propulsion, fuel capacity, scientific instruments, navigation
- Ship upgrades: better engines (higher ISP), larger fuel tanks, advanced scanners
- Persistent player profile: unlocks, discovered bodies, science log
- Home base / space center as the starting point and upgrade hub

**Acceptance Criteria:**
- [ ] Science points are awarded for first-time discoveries (orbit, scan, sample) of each body
- [ ] At least 10 milestone missions form a progression arc from suborbital to interplanetary
- [ ] Tech tree has at least 3 branches with 4+ nodes each
- [ ] Upgrading propulsion visibly improves ship delta-v capability
- [ ] Player state persists across browser sessions (localStorage or IndexedDB)
- [ ] A new player has clear guidance on what to do first (initial missions)
- [ ] Late-game missions require capabilities only available through tech tree advancement

**Status:** Planned

---

## Milestone 6: Galaxy Scale

**Goal:** Expand the game from a single star system to a galaxy of hundreds of procedurally generated systems with interstellar travel.

**Delivers:** A galaxy map showing hundreds of star systems. Players who have unlocked interstellar technology can travel between systems, discovering new stars, planets, and moons. The full exploration endgame opens up.

**Dependencies:** Milestone 2 (system generation), Milestone 5 (tech tree for interstellar unlock)

**Key Features:**
- Galaxy generation: hundreds of star systems placed in 2D space with deterministic seeds
- Galaxy map: zoomable view showing all systems, color-coded by star type
- System preview: basic info visible before visiting (star class, number of planets)
- Interstellar travel mechanic: warp/jump drive (tech-gated, high fuel cost)
- Travel time and fuel cost scale with distance between systems
- Each system fully generated on arrival (deterministic from seed)
- Discovery log: track which systems and bodies have been visited
- Bookmarking: mark systems of interest on the galaxy map
- Persistence: galaxy state, visited systems, and player position saved

**Acceptance Criteria:**
- [ ] Galaxy contains at least 200 star systems with varied star types
- [ ] Galaxy map is navigable with zoom and pan controls
- [ ] Interstellar travel requires endgame tech tree unlocks
- [ ] Traveling to a new system generates it deterministically from its seed
- [ ] Previously visited systems retain their state (discovered bodies, completed missions)
- [ ] Galaxy generation completes in under 1 second
- [ ] The galaxy feels varied — different star types produce different system configurations

**Status:** Planned

---

## Milestone 7: Polish & Integration

**Goal:** Unify all systems into a cohesive experience with tutorials, balanced progression, and quality-of-life improvements.

**Delivers:** A polished game that a new player can pick up and understand. Balanced progression from first launch to interstellar travel. Smooth UI, helpful tutorials, and no rough edges between milestone systems.

**Dependencies:** All previous milestones (1-6)

**Key Features:**
- Interactive tutorial: guided first launch, first orbit, first transfer
- Contextual tooltips explaining orbital mechanics concepts
- UI overhaul: consistent style across HUD, map mode, surface interaction, tech tree, galaxy map
- Progression balance pass: science point yields, mission rewards, tech costs, fuel economics
- Performance optimization: efficient rendering for complex systems with many orbits
- Edge case handling: degenerate orbits, SOI transition glitches, save corruption recovery
- Accessibility: keyboard navigation for all menus, colorblind-friendly orbit colors
- Credits and about screen

**Acceptance Criteria:**
- [ ] A new player can complete the tutorial and achieve first orbit within 10 minutes
- [ ] Progression from first orbit to interstellar travel feels rewarding, not grindy
- [ ] All UI screens share a consistent visual language
- [ ] Game maintains 60fps with a full system (star, 8 planets, moons) and orbit rendering
- [ ] No known save/load corruption issues
- [ ] At least 3 playtesters can complete the tutorial without external help
- [ ] All systems (physics, planning, landing, progression, galaxy) work together without jarring transitions

**Status:** Planned
