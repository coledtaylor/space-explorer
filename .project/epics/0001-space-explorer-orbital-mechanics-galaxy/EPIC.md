# Epic: Space Explorer — Orbital Mechanics & Galaxy

## Vision

Space Explorer becomes a 2D space exploration game grounded in realistic orbital mechanics using the patched conics approximation. Players experience the full arc of spaceflight — from their first suborbital hop off a home planet, through achieving stable orbit, transferring between moons and planets, and ultimately traveling to other star systems in a procedurally generated galaxy of hundreds of systems.

The game offers two complementary control modes: real-time thrust control for hands-on piloting and a map/planning mode for designing maneuver nodes and transfer orbits. This dual approach lets players feel the physics directly while also engaging with the strategic layer of mission planning, delta-v budgets, and orbital transfers.

The end state is a game where discovery drives progression. Players scan celestial bodies for science points, complete milestone missions, and unlock increasingly capable ships and equipment through a tech tree. The galaxy is vast, deterministic, and persistent — every system generated from a seed, every body discoverable, every orbit governed by the same consistent physics.

## Context

The current Space Explorer codebase is a vanilla JavaScript browser game with arcade-style physics. Ships have thrust and drag, celestial bodies orbit in simple circles, and "travel" between systems is a boundary trigger that resets position and regenerates. There is no gravity model, no orbital mechanics, no concept of sphere of influence, and no planning tools.

This epic represents a fundamental transformation of the game's physics and scope. The ship and celestial modules will be rewritten from scratch to support patched conics physics — a sphere-of-influence model where the ship is always under the gravitational influence of exactly one body, with proper SOI transitions. The procedural generation system will be expanded from single star systems to a full galaxy of hundreds of interconnected systems with hierarchical body structures (stars, planets, moons).

The existing rendering, input, and utility modules remain viable and will be extended rather than replaced. The game retains its vanilla JS, no-build-tools philosophy.

## Core Pillars

### 1. Realistic Orbital Flight
Patched conics physics using the sphere of influence model. Ships experience gravitational acceleration from their current dominant body only. No atmospheric drag in space. Players must understand and work with orbital mechanics: stable orbits, escape trajectories, SOI transitions, and delta-v budgets. Internally, a proper unit system maps game units to real-scale quantities.

### 2. Dual Control Modes
Real-time thrust control for direct piloting — point and burn, feel the physics. Map/planning mode for strategic flight — visualize orbits, place maneuver nodes, see predicted trajectories, and execute planned burns. Players toggle between modes freely. The planning mode is not optional polish; it is a core gameplay system that arrives before landing mechanics.

### 3. Procedural Galaxy
Hundreds of star systems generated deterministically from seeds. Each system contains a star with orbiting planets, and planets may have moons. Body properties (mass, radius, SOI, orbital parameters) are physically consistent. The galaxy is persistent across sessions and fully explorable.

### 4. Science & Mission Progression
Discovery fuels advancement. Scanning bodies yields science points. Milestone missions (first orbit, first moon landing, first interplanetary transfer) grant currency and unlock new capabilities. A tech tree gates access to better ships, engines, fuel capacity, and scientific instruments. The progression arc mirrors real spaceflight history.

### 5. Abstract Surface Interaction
Landing on a body transitions to an abstract interaction layer — scan the surface, collect samples, complete objectives. There is no platformer or rover gameplay. Surface interaction is a menu/card-based system that delivers science and mission completion. Real surface exploration is explicitly deferred to a future epic.

## Scope

### In Scope
- Patched conics gravity and orbital mechanics engine
- Proper unit system (game-units-to-km mapping, SI-like internally)
- Sphere of influence model with SOI transitions
- Rewrite of ship.js (physics, fuel, thrust, orbital state)
- Rewrite of celestial.js (hierarchical bodies, mass, SOI, orbital parameters)
- Moons and multi-level orbit hierarchies
- Map/planning mode with orbit visualization and maneuver nodes
- Trajectory prediction and burn planning
- Abstract landing and surface interaction
- Science points, missions, and tech tree progression
- Galaxy-scale procedural generation (hundreds of systems)
- Interstellar travel mechanics
- Galaxy map navigation
- Session persistence (save/load game state)
- UI updates for new systems (HUD, menus, tech tree interface)
- Tutorials and onboarding for orbital mechanics concepts

### Out of Scope
- N-body physics simulation
- Real surface exploration (platformer, rover, walking)
- Multiplayer of any kind
- 3D rendering or WebGL migration
- Sound design and music (can be layered independently)
- Mobile or gamepad input support
- Modding or user-generated content
- External dependencies or build tools
- Server-side anything — remains a static client-side game

### Assumptions
- Patched conics provides sufficient realism for engaging gameplay without N-body complexity
- Canvas 2D can handle rendering hundreds of orbit lines and predicted trajectories at acceptable frame rates
- The existing seededRandom utility is sufficient for deterministic galaxy generation
- Players will learn orbital mechanics concepts through gameplay and light tutorial guidance
- localStorage or IndexedDB is adequate for client-side persistence

## Success Criteria

- A player can launch from a planet surface, achieve stable orbit, transfer to a moon, and return — all governed by patched conics physics
- The map/planning mode allows placing maneuver nodes and shows accurate trajectory predictions
- At least 100 star systems are explorable with consistent procedural generation
- The tech tree provides a meaningful progression arc from suborbital flight to interstellar travel
- The game runs at 60fps on mid-range hardware with a full system rendered
- A new player can understand the basics of orbital flight within 10 minutes of gameplay
