import { seededRandom, hslToRgb } from './utils.js';
import { G, AU } from './units.js';
import { computeSOIRadius, trueAnomalyAtTime, stateFromOrbitalElements } from './orbit.js';

const PLANET_NAMES = [
  'Aethon', 'Bellara', 'Cryon', 'Delvari', 'Elorix', 'Fyrnath',
  'Galdris', 'Helios Prime', 'Ithara', 'Jarvex', 'Kylonis', 'Lunara',
  'Meridax', 'Novaris', 'Omicron VII', 'Pyralis', 'Queltar', 'Ryndor',
  'Solvani', 'Thalyx', 'Umbrath', 'Vexari', 'Wyndale', 'Xyphos',
  'Yaldris', 'Zephyra', 'Arctis', 'Boreas', 'Calyx', 'Draeven',
];

const STAR_NAMES = [
  'Sol', 'Vega', 'Altair', 'Rigel', 'Deneb', 'Sirius', 'Polaris',
  'Antares', 'Betelgeuse', 'Canopus', 'Arcturus', 'Procyon',
];

const ANOMALY_NAMES = [
  'The Rift', 'Void Echo', 'Quantum Bloom', 'Dark Spiral', 'Phase Gate',
  'Chrono Eddy', 'Nebula Heart', 'Singularity Seed', 'Photon Cage',
];

const PLANET_TYPES = ['Rocky', 'Gas Giant', 'Ice World', 'Ocean World', 'Desert', 'Volcanic', 'Lush'];
const STAR_TYPES = ['Red Dwarf', 'Yellow Star', 'Blue Giant', 'White Dwarf', 'Neutron Star'];

// Solar mass in kg
const SOLAR_MASS = 1.989e30;
// Earth mass in kg
const EARTH_MASS = 5.972e24;

const STAR_MASSES = {
  'Red Dwarf': 0.3 * SOLAR_MASS,
  'Yellow Star': 1.0 * SOLAR_MASS,
  'Blue Giant': 10.0 * SOLAR_MASS,
  'White Dwarf': 0.6 * SOLAR_MASS,
  'Neutron Star': 1.5 * SOLAR_MASS,
};

const PLANET_MASSES = {
  'Rocky': 1.0 * EARTH_MASS,
  'Gas Giant': 300.0 * EARTH_MASS,
  'Ice World': 15.0 * EARTH_MASS,
  'Ocean World': 2.0 * EARTH_MASS,
  'Desert': 0.8 * EARTH_MASS,
  'Volcanic': 1.1 * EARTH_MASS,
  'Lush': 1.5 * EARTH_MASS,
};

// Module-level elapsed time accumulator for orbit propagation
let elapsedTime = 0;

export function generateSystem(seed) {
  const rng = seededRandom(seed);

  // Central star
  const starTypeIdx = Math.floor(rng() * STAR_TYPES.length);
  const starType = STAR_TYPES[starTypeIdx];
  const starHues = { 'Red Dwarf': 10, 'Yellow Star': 45, 'Blue Giant': 220, 'White Dwarf': 200, 'Neutron Star': 270 };
  const starSizes = { 'Red Dwarf': 40, 'Yellow Star': 55, 'Blue Giant': 80, 'White Dwarf': 30, 'Neutron Star': 25 };
  const hue = starHues[starType];
  const [r, g, b] = hslToRgb(hue, 0.8, 0.6);

  const starMass = STAR_MASSES[starType];
  const star = {
    kind: 'star',
    name: STAR_NAMES[Math.floor(rng() * STAR_NAMES.length)],
    subtype: starType,
    x: 0,
    y: 0,
    radius: starSizes[starType],
    mass: starMass,
    mu: G * starMass,
    soiRadius: 100 * AU,
    color: `rgb(${r},${g},${b})`,
    glowColor: `rgba(${r},${g},${b},0.15)`,
    hue,
    description: `A ${starType.toLowerCase()} at the heart of this system.`,
    details: {
      'Class': starType,
      'Temperature': `${(3000 + rng() * 30000).toFixed(0)} K`,
      'Luminosity': `${(rng() * 100).toFixed(1)} L☉`,
    },
  };

  // Planets
  const planetCount = 3 + Math.floor(rng() * 5);
  const planets = [];

  // Start ~0.3 AU, increase with Titius-Bode-like spacing
  let orbitalRadius = (0.3 + rng() * 0.2) * AU;
  for (let i = 0; i < planetCount; i++) {
    const typeIdx = Math.floor(rng() * PLANET_TYPES.length);
    const pType = PLANET_TYPES[typeIdx];
    const pHue = rng() * 360;
    const [pr, pg, pb] = hslToRgb(pHue, 0.4 + rng() * 0.3, 0.3 + rng() * 0.3);
    const pRadius = 12 + rng() * 24;

    const planetMass = PLANET_MASSES[pType];
    const planetMu = G * planetMass;
    const soiRadius = computeSOIRadius(planetMass, starMass, orbitalRadius);

    const e = rng() * 0.15;
    const omega = rng() * 2 * Math.PI;
    const nu0 = rng() * 2 * Math.PI;

    const orbitalElements = { a: orbitalRadius, e, omega, nu0 };

    // Compute initial position from orbital elements
    const { pos } = stateFromOrbitalElements(orbitalRadius, e, omega, nu0, star.mu);

    planets.push({
      kind: 'planet',
      name: PLANET_NAMES[(seed * 7 + i * 13) % PLANET_NAMES.length],
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
        'Moons': `${Math.floor(rng() * 6)}`,
      },
    });

    // Titius-Bode-like spacing: multiply by 1.5-2.0 each step, plus a small random offset
    orbitalRadius *= 1.5 + rng() * 0.5;
  }

  const bodies = [star, ...planets];

  // Anomaly (30% chance)
  if (rng() > 0.7) {
    const ax = (rng() - 0.5) * 1500;
    const ay = (rng() - 0.5) * 1500;
    const anomaly = {
      kind: 'anomaly',
      name: ANOMALY_NAMES[Math.floor(rng() * ANOMALY_NAMES.length)],
      subtype: 'Spatial Anomaly',
      x: ax,
      y: ay,
      radius: 20 + rng() * 15,
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

  return { star, planets, bodies };
}

function generatePlanetDesc(type, rng) {
  const descs = {
    'Rocky': ['A barren, cratered world with thin atmosphere.', 'A dense, mineral-rich planet with towering mountain ranges.'],
    'Gas Giant': ['A massive world of swirling hydrogen and helium clouds.', 'Colossal storms rage across this gas giant\'s banded atmosphere.'],
    'Ice World': ['A frozen sphere locked in eternal winter.', 'Gleaming ice sheets cover this frigid planet\'s surface.'],
    'Ocean World': ['Endless oceans cover this water world from pole to pole.', 'Deep currents stir beneath a global ocean.'],
    'Desert': ['Vast dune seas stretch across this arid world.', 'Sandstorms scour the surface of this parched planet.'],
    'Volcanic': ['Rivers of lava carve through a hellish landscape.', 'Tectonic fury keeps this world in constant upheaval.'],
    'Lush': ['Dense forests and abundant life thrive here.', 'A verdant world teeming with biological activity.'],
  };
  const options = descs[type] || ['A mysterious world.'];
  return options[Math.floor(rng() * options.length)];
}

export function updateBodyPositions(system, dt) {
  elapsedTime += dt;

  for (const planet of system.planets) {
    const { a, e, omega, nu0 } = planet.orbitalElements;
    const mu = planet.parentBody.mu;

    // Propagate true anomaly to current elapsed time
    const nu = trueAnomalyAtTime(elapsedTime, a, e, mu, nu0);
    const { pos } = stateFromOrbitalElements(a, e, omega, nu, mu);

    planet.x = pos.x;
    planet.y = pos.y;
  }
}
