/** Default search radius for nearby synagogues. */
export const DEFAULT_SYNAGOGUE_RADIUS_METERS = 4000;

/** Map camera zoom when focusing a selected synagogue. */
export const SYNAGOGUE_FOCUS_LATITUDE_DELTA = 0.01;
export const SYNAGOGUE_FOCUS_LONGITUDE_DELTA = 0.01;

/**
 * Initial map region padding so a ~2km radius fits comfortably on screen.
 * ~1° latitude ≈ 111 km → 0.03° ≈ 3.3 km.
 */
export const MAP_INITIAL_LATITUDE_DELTA = 0.03;
export const MAP_INITIAL_LONGITUDE_DELTA = 0.03;
