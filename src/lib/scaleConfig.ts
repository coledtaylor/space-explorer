// Centralized tuning constants for the game's scale, rendering, and physics.
// Edit this file to adjust how the game looks and feels.
// No Phaser imports — pure values only.

// ---------------------------------------------------------------------------
// World Scale
// ---------------------------------------------------------------------------

/** Converts game units (km) to screen pixels. Increasing this spreads orbits apart. */
export const WORLD_SCALE = 5e-3; // px/km

// ---------------------------------------------------------------------------
// Camera & Zoom
// ---------------------------------------------------------------------------

/** Minimum zoom (most zoomed out). Must fit the outermost orbit on screen. */
export const ZOOM_MIN = 0.001;

/** Maximum zoom (most zoomed in). Ship triangle should be clearly visible. */
export const ZOOM_MAX = 2.0;

/** Multiplicative scroll sensitivity. 0.25 = 25% change per wheel tick. */
export const ZOOM_SPEED = 0.25;

/** Starting zoom level when the scene loads. */
export const INITIAL_ZOOM = 0.02;

// ---------------------------------------------------------------------------
// Ship
// ---------------------------------------------------------------------------

/** Ship forward thrust in px/ms². */
export const THRUST_ACCELERATION = 0.0003;

/** Ship rotation speed in radians/ms. */
export const ROTATION_SPEED = 0.003;

/** Ship triangle height in pixels. */
export const SHIP_HEIGHT = 20;

/** Ship triangle half-width in pixels. */
export const SHIP_HALF_WIDTH = 8;

// ---------------------------------------------------------------------------
// Celestial Body Rendering
// ---------------------------------------------------------------------------

/** Visual radius multiplier for the star. sqrt(radius) * this factor. */
export const STAR_SCALE_FACTOR = 24;

/** Visual radius multiplier for planets and moons. sqrt(radius) * this factor. */
export const BODY_SCALE_FACTOR = 150;

/** Minimum visual radius for any non-star body in world-space pixels. */
export const MIN_BODY_RADIUS = 450;

/** Minimum screen-space radius in pixels. Bodies never shrink below this on screen. */
export const MIN_SCREEN_RADIUS = 3;

/** Wire outline thickness for celestial bodies. */
export const BODY_LINE_WIDTH = 1.5;

/** Wire outline opacity. */
export const BODY_LINE_ALPHA = 1.0;

/** Translucent fill opacity behind the outline. */
export const BODY_FILL_ALPHA = 0.3;

// ---------------------------------------------------------------------------
// Orbit Lines
// ---------------------------------------------------------------------------

/** Base line width for orbit path circles. */
export const ORBIT_LINE_BASE_WIDTH = 1.5;

/** Orbit line opacity. */
export const ORBIT_LINE_ALPHA = 0.5;

/** Max screen-space width to prevent thick lines when zoomed in. */
export const MAX_ORBIT_LINE_WIDTH = 3;

// ---------------------------------------------------------------------------
// Physics
// ---------------------------------------------------------------------------

/** Gravitational constant in SI units (m³/kg/s²). */
export const GRAVITATIONAL_CONSTANT = 6.674e-11;

/** Minimum distance (km) for gravity calculation. Prevents 1/r² force spikes. */
export const MIN_GRAVITY_DISTANCE = 50;

// ---------------------------------------------------------------------------
// Derived Constants (computed from the above — don't edit directly)
// ---------------------------------------------------------------------------

/** Converts km/s² acceleration to px/ms² for ship velocity integration. */
export const ACCEL_SCALE = WORLD_SCALE / 1_000_000;
