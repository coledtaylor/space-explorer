import type {
  StarSystem,
  StarBody,
  PlanetBody,
  MoonBody,
  AnomalyBody,
  CelestialBody,
} from '../types/index.js';
import { seededRandom, hslToRgb } from './utils.js';
import { G } from './units.js';
import { computeSOIRadius, trueAnomalyAtTime, stateFromOrbitalElements } from './orbit.js';
import {
  STAR_RADII,
  STAR_MASSES as SCALE_STAR_MASSES,
  PLANET_RADIUS_RANGE,
  PLANET_MASSES as SCALE_PLANET_MASSES,
  MOON_RADIUS_RANGE,
  MOON_MASS_MIN_FRAC as SCALE_MOON_MASS_MIN_FRAC,
  MOON_MASS_MAX_FRAC as SCALE_MOON_MASS_MAX_FRAC,
  INNERMOST_PLANET_ORBIT_MIN,
  INNERMOST_PLANET_ORBIT_RANGE,
  ORBITAL_SPACING_MIN,
  ORBITAL_SPACING_RANGE,
  MOON_MIN_SURFACE_GAP,
  MOON_ORBIT_GAP,
  STAR_SOI_RADIUS,
  ANOMALY_SPAWN_RADIUS,
  ANOMALY_RADIUS_RANGE,
} from './scaleConfig.js';

const PLANET_NAMES: readonly string[] = [
  'Aethon', 'Bellara', 'Cryon', 'Delvari', 'Elorix', 'Fyrnath',
  'Galdris', 'Helios Prime', 'Ithara', 'Jarvex', 'Kylonis', 'Lunara',
  'Meridax', 'Novaris', 'Omicron VII', 'Pyralis', 'Queltar', 'Ryndor',
  'Solvani', 'Thalyx', 'Umbrath', 'Vexari', 'Wyndale', 'Xyphos',
  'Yaldris', 'Zephyra', 'Arctis', 'Boreas', 'Calyx', 'Draeven',
];

const STAR_NAMES: readonly string[] = [
  'Sol', 'Vega', 'Altair', 'Rigel', 'Deneb', 'Sirius', 'Polaris',
  'Antares', 'Betelgeuse', 'Canopus', 'Arcturus', 'Procyon',
];

const ANOMALY_NAMES: readonly string[] = [
  'The Rift', 'Void Echo', 'Quantum Bloom', 'Dark Spiral', 'Phase Gate',
  'Chrono Eddy', 'Nebula Heart', 'Singularity Seed', 'Photon Cage',
];

const PLANET_TYPES: readonly string[] = [
  'Rocky', 'Gas Giant', 'Ice World', 'Ocean World', 'Desert', 'Volcanic', 'Lush',
];

const STAR_TYPES: readonly string[] = [
  'Red Dwarf', 'Yellow Star', 'Blue Giant', 'White Dwarf', 'Neutron Star',
];

// Moon name suffixes (roman numerals)
const MOON_SUFFIXES: readonly string[] = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];

// Moon count ranges per planet subtype [min, max]
const MOON_COUNTS: Readonly<Record<string, [number, number]>> = {
  'Rocky': [0, 1],
  'Gas Giant': [2, 8],
  'Ice World': [0, 2],
  'Ocean World': [0, 2],
  'Desert': [0, 2],
  'Volcanic': [0, 1],
  'Lush': [0, 3],
};

// Star and planet masses are imported from scaleConfig (KSP-scale values).
// Aliases for local use:
const STAR_MASSES = SCALE_STAR_MASSES;
const PLANET_MASSES = SCALE_PLANET_MASSES;
const MOON_MASS_MIN_FRAC = SCALE_MOON_MASS_MIN_FRAC;
const MOON_MASS_MAX_FRAC = SCALE_MOON_MASS_MAX_FRAC;

// Module-level elapsed time accumulator for orbit propagation
let elapsedTime: number = 0;

export function generateSystem(seed: number): StarSystem {
  const rng = seededRandom(seed);

  // Central star
  const starTypeIdx = Math.floor(rng() * STAR_TYPES.length);
  const starType = STAR_TYPES[starTypeIdx];
  const starHues: Readonly<Record<string, number>> = {
    'Red Dwarf': 10,
    'Yellow Star': 45,
    'Blue Giant': 220,
    'White Dwarf': 200,
    'Neutron Star': 270,
  };
  const hue = starHues[starType] ?? 45;
  const [r, g, b] = hslToRgb(hue, 0.8, 0.6);

  const starMass = STAR_MASSES[starType] ?? 600_000_000;
  const star: StarBody = {
    kind: 'star',
    name: STAR_NAMES[Math.floor(rng() * STAR_NAMES.length)] ?? 'Sol',
    subtype: starType,
    x: 0,
    y: 0,
    radius: STAR_RADII[starType] ?? 7000,
    mass: starMass,
    mu: G * starMass,
    soiRadius: STAR_SOI_RADIUS,
    color: `rgb(${r},${g},${b})`,
    glowColor: `rgba(${r},${g},${b},0.15)`,
    hue,
    description: `A ${starType.toLowerCase()} at the heart of this system.`,
    details: {
      'Class': starType,
      'Temperature': `${(3000 + rng() * 30000).toFixed(0)} K`,
      'Luminosity': `${(rng() * 100).toFixed(1)} L\u2609`,
    },
  };

  // Planets
  const planetCount = 3 + Math.floor(rng() * 5);
  const planets: PlanetBody[] = [];

  // Start at KSP-scale innermost orbit (50000–80000 gu), increase with Titius-Bode-like spacing
  let orbitalRadius = INNERMOST_PLANET_ORBIT_MIN + rng() * INNERMOST_PLANET_ORBIT_RANGE;
  for (let i = 0; i < planetCount; i++) {
    const typeIdx = Math.floor(rng() * PLANET_TYPES.length);
    const pType = PLANET_TYPES[typeIdx] ?? 'Rocky';
    const pHue = rng() * 360;
    const [pr, pg, pb] = hslToRgb(pHue, 0.4 + rng() * 0.3, 0.5 + rng() * 0.2);
    const [pRadMin, pRadMax] = PLANET_RADIUS_RANGE[pType] ?? [500, 900];
    const pRadius = pRadMin + rng() * (pRadMax - pRadMin);

    const planetMass = PLANET_MASSES[pType] ?? 500;
    const planetMu = G * planetMass;
    const soiRadius = computeSOIRadius(planetMass, starMass, orbitalRadius);

    const e = rng() * 0.15;
    const omega = rng() * 2 * Math.PI;
    const nu0 = rng() * 2 * Math.PI;

    const orbitalElements = { a: orbitalRadius, e, omega, nu0 };

    // Compute initial position from orbital elements
    const { pos } = stateFromOrbitalElements(orbitalRadius, e, omega, nu0, star.mu);

    const planet: PlanetBody = {
      kind: 'planet',
      name: PLANET_NAMES[(seed * 7 + i * 13) % PLANET_NAMES.length] ?? `Planet ${i + 1}`,
      subtype: pType,
      x: pos.x,
      y: pos.y,
      radius: pRadius,
      mass: planetMass,
      mu: planetMu,
      soiRadius,
      orbitalElements,
      parentBody: star,
      color: `rgb(${pr},${pg},${pb})`,
      hue: pHue,
      description: generatePlanetDesc(pType, rng),
      details: {
        'Type': pType,
        'Diameter': `${(pRadius * 400).toFixed(0)} km`,
        'Gravity': `${(0.2 + rng() * 2.5).toFixed(2)} g`,
        'Atmosphere': rng() > 0.3 ? 'Present' : 'None',
        'Moons': '0',
      },
      moons: [],
      children: [],
    };
    planets.push(planet);

    // Titius-Bode-like spacing: multiply by 1.5-2.0 each step (from scaleConfig)
    orbitalRadius *= ORBITAL_SPACING_MIN + rng() * ORBITAL_SPACING_RANGE;
  }

  // Generate moons for each planet
  const allMoons: MoonBody[] = [];
  for (const planet of planets) {
    const moonCountRange = MOON_COUNTS[planet.subtype] ?? [0, 0] as [number, number];
    const [minMoons, maxMoons] = moonCountRange;
    const moonCount = minMoons + Math.floor(rng() * (maxMoons - minMoons + 1));
    const maxSoiRadius = planet.soiRadius * 0.8;

    // Track outermost radius to avoid orbit overlaps.
    // Start just beyond the planet surface with the KSP-scale minimum surface gap.
    let nextMinRadius = planet.radius + MOON_MIN_SURFACE_GAP;

    for (let m = 0; m < moonCount; m++) {
      const moonMassFrac = MOON_MASS_MIN_FRAC + rng() * (MOON_MASS_MAX_FRAC - MOON_MASS_MIN_FRAC);
      const moonMass = planet.mass * moonMassFrac;
      const moonMu = G * moonMass;
      const [moonRadMin, moonRadMax] = MOON_RADIUS_RANGE;
      const moonRadius = moonRadMin + rng() * (moonRadMax - moonRadMin);

      // Orbital radius: start after gap, space each moon with a gap between them
      const gap = moonRadius + MOON_ORBIT_GAP;
      const moonOrbitalRadius = nextMinRadius + gap + rng() * gap;

      // Check if this orbit fits within the planet's SOI
      if (moonOrbitalRadius > maxSoiRadius) break;

      const moonE = rng() * 0.05;
      const moonOmega = rng() * 2 * Math.PI;
      const moonNu0 = rng() * 2 * Math.PI;

      const moonSoiRadius = computeSOIRadius(moonMass, planet.mass, moonOrbitalRadius);
      const moonOrbitalElements = { a: moonOrbitalRadius, e: moonE, omega: moonOmega, nu0: moonNu0 };

      // Initial position relative to parent planet
      const { pos: moonLocalPos } = stateFromOrbitalElements(moonOrbitalRadius, moonE, moonOmega, moonNu0, planet.mu);

      const moonHue = rng() * 360;
      const [mr, mg, mb] = hslToRgb(moonHue, 0.2 + rng() * 0.2, 0.55 + rng() * 0.15);

      const moon: MoonBody = {
        kind: 'moon',
        name: `${planet.name} ${MOON_SUFFIXES[m] ?? (m + 1)}`,
        subtype: 'Moon',
        x: planet.x + moonLocalPos.x,
        y: planet.y + moonLocalPos.y,
        radius: moonRadius,
        mass: moonMass,
        mu: moonMu,
        soiRadius: moonSoiRadius,
        orbitalElements: moonOrbitalElements,
        parentBody: planet,
        color: `rgb(${mr},${mg},${mb})`,
        hue: moonHue,
        description: `A natural satellite orbiting ${planet.name}.`,
        details: {
          'Type': 'Moon',
          'Diameter': `${(moonRadius * 400).toFixed(0)} km`,
          'Parent': planet.name,
        },
      };

      planet.moons.push(moon);
      planet.children.push(moon);
      allMoons.push(moon);

      // Advance next min radius beyond the apoapsis of this moon orbit, with a gap
      nextMinRadius = moonOrbitalRadius * (1 + moonE) + moonRadius + MOON_ORBIT_GAP;
    }

    // Update moon count in planet details
    planet.details['Moons'] = `${planet.moons.length}`;
  }

  const bodies: CelestialBody[] = [star, ...planets, ...allMoons];

  // Anomaly (30% chance) — spawned within ANOMALY_SPAWN_RADIUS of the origin
  if (rng() > 0.7) {
    const ax = (rng() - 0.5) * 2 * ANOMALY_SPAWN_RADIUS;
    const ay = (rng() - 0.5) * 2 * ANOMALY_SPAWN_RADIUS;
    const [anomalyRadMin, anomalyRadMax] = ANOMALY_RADIUS_RANGE;
    const anomaly: AnomalyBody = {
      kind: 'anomaly',
      name: ANOMALY_NAMES[Math.floor(rng() * ANOMALY_NAMES.length)] ?? 'The Rift',
      subtype: 'Spatial Anomaly',
      x: ax,
      y: ay,
      radius: anomalyRadMin + rng() * (anomalyRadMax - anomalyRadMin),
      color: '#b040ff',
      glowColor: 'rgba(176, 64, 255, 0.2)',
      hue: 280,
      description: 'An unexplained spatial disturbance. Scanners detect unusual energy readings.',
      details: {
        'Type': 'Unknown',
        'Energy': `${(rng() * 9999).toFixed(0)} TeV`,
        'Stability': rng() > 0.5 ? 'Stable' : 'Fluctuating',
        'Threat Level': rng() > 0.6 ? 'Moderate' : 'Low',
      },
    };
    bodies.push(anomaly);
  }

  // Reset elapsed time when a new system is generated
  elapsedTime = 0;

  return { star, planets, bodies, moons: allMoons };
}

function generatePlanetDesc(type: string, rng: () => number): string {
  const descs: Readonly<Record<string, string[]>> = {
    'Rocky': [
      'A barren, cratered world with thin atmosphere.',
      'A dense, mineral-rich planet with towering mountain ranges.',
    ],
    'Gas Giant': [
      'A massive world of swirling hydrogen and helium clouds.',
      "Colossal storms rage across this gas giant's banded atmosphere.",
    ],
    'Ice World': [
      'A frozen sphere locked in eternal winter.',
      "Gleaming ice sheets cover this frigid planet's surface.",
    ],
    'Ocean World': [
      'Endless oceans cover this water world from pole to pole.',
      'Deep currents stir beneath a global ocean.',
    ],
    'Desert': [
      'Vast dune seas stretch across this arid world.',
      'Sandstorms scour the surface of this parched planet.',
    ],
    'Volcanic': [
      'Rivers of lava carve through a hellish landscape.',
      'Tectonic fury keeps this world in constant upheaval.',
    ],
    'Lush': [
      'Dense forests and abundant life thrive here.',
      'A verdant world teeming with biological activity.',
    ],
  };
  const options = descs[type] ?? ['A mysterious world.'];
  return options[Math.floor(rng() * options.length)] ?? 'A mysterious world.';
}

export function updateBodyPositions(system: StarSystem, dt: number): void {
  elapsedTime += dt;

  for (const planet of system.planets) {
    const { a, e, omega, nu0 } = planet.orbitalElements;
    const mu = planet.parentBody.mu;

    // Propagate true anomaly to current elapsed time
    const nu = trueAnomalyAtTime(elapsedTime, a, e, mu, nu0);
    const { pos } = stateFromOrbitalElements(a, e, omega, nu, mu);

    planet.x = pos.x;
    planet.y = pos.y;

    // Propagate moon positions relative to parent planet
    for (const moon of planet.moons) {
      const { a: ma, e: me, omega: mOmega, nu0: mNu0 } = moon.orbitalElements;
      const moonNu = trueAnomalyAtTime(elapsedTime, ma, me, planet.mu, mNu0);
      const { pos: moonLocalPos } = stateFromOrbitalElements(ma, me, mOmega, moonNu, planet.mu);
      moon.x = planet.x + moonLocalPos.x;
      moon.y = planet.y + moonLocalPos.y;
    }
  }
}
