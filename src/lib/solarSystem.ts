// Solar system layout config — KSP-inspired scale.
//
// SCALE REGIME:
//   Distances: 1 game unit (gu) = 1 km. Orbital radii are in the tens-of-thousands
//   of km range, matching KSP's compressed solar system (~1/10 real-world scale).
//   Masses: real SI kg values — the gravitational constant G in physics.ts is
//   also real SI, so GM products yield correct accelerations at these distances.
//   Periods: tuned for gameplay feel (hours → seconds conversion applied so
//   orbits complete on visible timescales during time-warp).
//
// BODY HIERARCHY:
//   Kerbol (star) → Kerbin (planet 1) → Mun (moon)
//                                      → Minmus (moon)
//                → Duna (planet 2)
//                → Eve (planet 3)

import type { SolarSystemConfig } from '../types/index.js';

// ---------------------------------------------------------------------------
// Kerbol (central star)
// ---------------------------------------------------------------------------
const KERBOL_MASS = 1.7565459e28;   // kg — KSP canonical value
const KERBOL_RADIUS = 261_600;      // gu (km) — KSP canonical value
const KERBOL_COLOR = '#ffdd44';

// ---------------------------------------------------------------------------
// Kerbin (Earth analogue, planet 1)
// ---------------------------------------------------------------------------
const KERBIN_MASS = 5.2915793e22;   // kg — KSP canonical value
const KERBIN_RADIUS = 600;          // gu (km) — KSP canonical value
const KERBIN_ORBITAL_RADIUS = 13_599_840;  // gu (km) from Kerbol
const KERBIN_ORBITAL_PERIOD = 9_203_545;   // seconds — KSP canonical ~106 days
const KERBIN_COLOR = '#4488cc';

// ---------------------------------------------------------------------------
// Mun (Kerbin's large moon — analogous to Earth's Moon)
// ---------------------------------------------------------------------------
const MUN_MASS = 9.7599066e20;      // kg — KSP canonical value
const MUN_RADIUS = 200;             // gu (km)
const MUN_ORBITAL_RADIUS = 12_000;  // gu (km) from Kerbin
const MUN_ORBITAL_PERIOD = 138_984; // seconds — KSP canonical ~1.6 days
const MUN_COLOR = '#888888';

// ---------------------------------------------------------------------------
// Minmus (Kerbin's small outer moon — low-gravity target)
// ---------------------------------------------------------------------------
const MINMUS_MASS = 2.6457580e19;   // kg — KSP canonical value
const MINMUS_RADIUS = 60;           // gu (km)
const MINMUS_ORBITAL_RADIUS = 47_000; // gu (km) from Kerbin
const MINMUS_ORBITAL_PERIOD = 1_077_311; // seconds — KSP canonical ~12.5 days
const MINMUS_COLOR = '#aaddbb';

// ---------------------------------------------------------------------------
// Duna (Mars analogue, planet 2)
// ---------------------------------------------------------------------------
const DUNA_MASS = 4.5154812e21;     // kg — KSP canonical value
const DUNA_RADIUS = 320;            // gu (km)
const DUNA_ORBITAL_RADIUS = 20_726_155; // gu (km) from Kerbol
const DUNA_ORBITAL_PERIOD = 17_315_400; // seconds — KSP canonical ~200 days
const DUNA_COLOR = '#cc6644';

// ---------------------------------------------------------------------------
// Eve (Venus analogue, planet 3 — densest atmosphere, hardest landing)
// ---------------------------------------------------------------------------
const EVE_MASS = 1.2243980e23;      // kg — KSP canonical value
const EVE_RADIUS = 700;             // gu (km)
const EVE_ORBITAL_RADIUS = 9_832_685; // gu (km) from Kerbol
const EVE_ORBITAL_PERIOD = 5_657_995; // seconds — KSP canonical ~65 days
const EVE_COLOR = '#993399';

// ---------------------------------------------------------------------------
// Assembled config
// ---------------------------------------------------------------------------
export const SOLAR_SYSTEM: SolarSystemConfig = {
  bodies: {
    kerbol: {
      name: 'Kerbol',
      kind: 'star',
      mass: KERBOL_MASS,
      radius: KERBOL_RADIUS,
      orbitalRadius: 0,
      orbitalPeriod: 0,
      color: KERBOL_COLOR,
      // No parentId — Kerbol sits at the world origin.
    },
    kerbin: {
      name: 'Kerbin',
      kind: 'planet',
      mass: KERBIN_MASS,
      radius: KERBIN_RADIUS,
      orbitalRadius: KERBIN_ORBITAL_RADIUS,
      orbitalPeriod: KERBIN_ORBITAL_PERIOD,
      color: KERBIN_COLOR,
      parentId: 'kerbol',
    },
    mun: {
      name: 'Mun',
      kind: 'moon',
      mass: MUN_MASS,
      radius: MUN_RADIUS,
      orbitalRadius: MUN_ORBITAL_RADIUS,
      orbitalPeriod: MUN_ORBITAL_PERIOD,
      color: MUN_COLOR,
      parentId: 'kerbin',
    },
    minmus: {
      name: 'Minmus',
      kind: 'moon',
      mass: MINMUS_MASS,
      radius: MINMUS_RADIUS,
      orbitalRadius: MINMUS_ORBITAL_RADIUS,
      orbitalPeriod: MINMUS_ORBITAL_PERIOD,
      color: MINMUS_COLOR,
      parentId: 'kerbin',
    },
    duna: {
      name: 'Duna',
      kind: 'planet',
      mass: DUNA_MASS,
      radius: DUNA_RADIUS,
      orbitalRadius: DUNA_ORBITAL_RADIUS,
      orbitalPeriod: DUNA_ORBITAL_PERIOD,
      color: DUNA_COLOR,
      parentId: 'kerbol',
    },
    eve: {
      name: 'Eve',
      kind: 'planet',
      mass: EVE_MASS,
      radius: EVE_RADIUS,
      orbitalRadius: EVE_ORBITAL_RADIUS,
      orbitalPeriod: EVE_ORBITAL_PERIOD,
      color: EVE_COLOR,
      parentId: 'kerbol',
    },
  },
};
