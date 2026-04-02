// scaleConfig.ts — Single source of truth for all KSP-scale game constants.
//
// SCALE REGIME:
//   Star radii:          5000–10000 gu
//   Planet radii:         500–2000 gu
//   Moon radii:            50–200 gu
//   Innermost planet orbit: 50000–80000 gu
//   Typical system extent:  up to ~500000 gu
//   System transition boundary: 1,500,000 gu
//
// PHYSICS BASIS (G=1):
//   v_circ = sqrt(M / r)
//   Target v_circ = 50–200 gu/s at r = 50000–80000 gu
//   For v=100 at r=60000: M = v² × r = 10000 × 60000 = 600,000,000
//   Star masses are therefore in the hundreds-of-millions range.
//
//   SOI = r × (m_planet / m_star)^0.4
//   Target SOI ≈ 10–25% of orbital radius.
//   For SOI = 15% at r=60000, Yellow Star (M=600M):
//     (m/M)^0.4 = 0.15  →  m = M × 0.15^2.5 ≈ M × 0.0087 ≈ 5,220,000

// ---------------------------------------------------------------------------
// Star radii (gu) per star type
// ---------------------------------------------------------------------------
export const STAR_RADII: Readonly<Record<string, number>> = {
  'Red Dwarf':    5000,
  'Yellow Star':  7000,
  'Blue Giant':  10000,
  'White Dwarf':  4000,
  'Neutron Star': 3000,
};

// ---------------------------------------------------------------------------
// Star masses (game mass units) per star type
// With G=1, mu = mass.  v_circ = sqrt(mass / r).
//
// Targets at r = 60000 gu:
//   Red Dwarf:    v ≈  60 gu/s  → M = 60²  × 60000 =  216,000,000
//   Yellow Star:  v ≈ 100 gu/s  → M = 100² × 60000 =  600,000,000
//   Blue Giant:   v ≈ 180 gu/s  → M = 180² × 60000 = 1,944,000,000
//   White Dwarf:  v ≈  70 gu/s  → M = 70²  × 60000 =  294,000,000
//   Neutron Star: v ≈ 140 gu/s  → M = 140² × 60000 = 1,176,000,000
// ---------------------------------------------------------------------------
export const STAR_MASSES: Readonly<Record<string, number>> = {
  'Red Dwarf':     216_000_000,
  'Yellow Star':   600_000_000,
  'Blue Giant':  1_944_000_000,
  'White Dwarf':   294_000_000,
  'Neutron Star':1_176_000_000,
};

// ---------------------------------------------------------------------------
// Planet radii (gu) ranges per planet type [min, max]
// Gas Giants are large; rocky/icy worlds are smaller.
// ---------------------------------------------------------------------------
export const PLANET_RADIUS_RANGE: Readonly<Record<string, [number, number]>> = {
  'Rocky':       [ 500,  900],
  'Gas Giant':   [1200, 2000],
  'Ice World':   [ 600, 1100],
  'Ocean World': [ 700, 1200],
  'Desert':      [ 500,  900],
  'Volcanic':    [ 600, 1000],
  'Lush':        [ 650, 1100],
};

// ---------------------------------------------------------------------------
// Planet masses (game mass units) per planet type.
// Tuned so SOI ≈ 10–25% of orbital radius around a Yellow Star (M=600M) at r=60000.
//
// SOI formula: r * (m / M_star)^0.4
// For SOI = 15% of r → (m/M)^0.4 = 0.15 → m = M × 0.15^2.5 ≈ M × 0.00870
// At Yellow Star M=600M: m_base ≈ 5,220,000
//
// Gas Giants are ~20× heavier than rocky worlds (similar to Solar System ratios).
// ---------------------------------------------------------------------------
export const PLANET_MASSES: Readonly<Record<string, number>> = {
  'Rocky':        5_220_000,
  'Gas Giant':  104_400_000,
  'Ice World':   10_440_000,
  'Ocean World':  7_830_000,
  'Desert':       5_220_000,
  'Volcanic':     6_525_000,
  'Lush':         7_830_000,
};

// ---------------------------------------------------------------------------
// Moon radius range [min, max] in gu
// ---------------------------------------------------------------------------
export const MOON_RADIUS_RANGE: [number, number] = [50, 200];

// ---------------------------------------------------------------------------
// Moon mass as a fraction of parent planet mass
// ---------------------------------------------------------------------------
export const MOON_MASS_MIN_FRAC = 0.005;  // 0.5%
export const MOON_MASS_MAX_FRAC = 0.05;   // 5.0%

// ---------------------------------------------------------------------------
// Orbital distance parameters
// ---------------------------------------------------------------------------

// Starting orbital radius for the innermost planet (gu)
export const INNERMOST_PLANET_ORBIT_MIN = 50_000;
export const INNERMOST_PLANET_ORBIT_RANGE = 30_000;  // random offset added

// Titius-Bode-like multiplier range applied each successive planet [min, max]
export const ORBITAL_SPACING_MIN = 1.5;
export const ORBITAL_SPACING_RANGE = 0.5;  // rng() * this value added to min

// ---------------------------------------------------------------------------
// Moon orbital spacing
// Minimum gap between moon surface and planet surface (gu)
// ---------------------------------------------------------------------------
export const MOON_MIN_SURFACE_GAP = 200;

// Gap factor: each moon is spaced by moonRadius + this constant
export const MOON_ORBIT_GAP = 100;

// ---------------------------------------------------------------------------
// System-level thresholds
// ---------------------------------------------------------------------------

// Boundary at which the game transitions to a new star system.
// Should be well beyond outermost expected planet orbit (~500000 gu max).
export const SYSTEM_TRANSITION_RADIUS = 1_500_000;

// Star SOI radius — large enough to encompass all planet orbits.
// Set to 1.1× the transition radius so the star's gravity dominates the whole playable system.
export const STAR_SOI_RADIUS = 1_650_000;

// Ship starting orbit: offset from star surface as a multiple of star radius.
// Ship is placed at star.radius * SHIP_START_ORBIT_FACTOR from star center.
// Set to put the ship just inside the innermost planet band for a dramatic start.
export const SHIP_START_ORBIT_FACTOR = 8;  // star.radius × 8 ≈ 56000 for Yellow Star

// Anomaly spawn radius (gu): anomalies are placed within this radius of the origin.
export const ANOMALY_SPAWN_RADIUS = 400_000;

// Anomaly radius range [min, max] in gu
export const ANOMALY_RADIUS_RANGE: [number, number] = [500, 1500];
