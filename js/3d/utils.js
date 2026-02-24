/**
 * @module 3d/utils
 * @description Shared utility functions for 3D model construction.
 *
 * Provides the `box()` helper used by both player and enemy model builders
 * to assemble voxel-style models from box primitives.
 *
 * Also provides geometry and material caches (BD-184) to share identical
 * BoxGeometry and MeshLambertMaterial instances across all decorations and
 * models, dramatically reducing GPU memory allocations.
 *
 * Dependencies: Three.js (global, loaded via CDN in index.html)
 */

// === GEOMETRY & MATERIAL CACHES (BD-184) ===

/** @type {Map<string, THREE.BoxGeometry>} Cache of BoxGeometry instances keyed by "w,h,d". */
const geoCache = new Map();

/** @type {Map<number, THREE.MeshLambertMaterial>} Cache of MeshLambertMaterial instances keyed by color hex. */
const matCache = new Map();

/**
 * Get or create a cached BoxGeometry with the given dimensions.
 * Rounds dimensions to 4 decimal places to avoid floating-point key fragmentation.
 *
 * @param {number} w - Box width.
 * @param {number} h - Box height.
 * @param {number} d - Box depth.
 * @returns {THREE.BoxGeometry} Shared geometry instance.
 */
export function getCachedGeo(w, h, d) {
  // Round to 4 decimal places to coalesce near-identical floating-point sizes
  const rw = Math.round(w * 10000) / 10000;
  const rh = Math.round(h * 10000) / 10000;
  const rd = Math.round(d * 10000) / 10000;
  const key = `${rw},${rh},${rd}`;
  if (!geoCache.has(key)) geoCache.set(key, new THREE.BoxGeometry(w, h, d));
  return geoCache.get(key);
}

/**
 * Get or create a cached MeshLambertMaterial with the given color.
 *
 * @param {number} color - Hex color value.
 * @returns {THREE.MeshLambertMaterial} Shared material instance.
 */
export function getCachedMat(color) {
  if (!matCache.has(color)) matCache.set(color, new THREE.MeshLambertMaterial({ color }));
  return matCache.get(color);
}

/**
 * Dispose all cached geometries and materials. Call on full game cleanup.
 */
export function clearCaches() {
  geoCache.forEach(g => g.dispose());
  geoCache.clear();
  matCache.forEach(m => m.dispose());
  matCache.clear();
}

/**
 * Create a box mesh with a cached LambertMaterial and cached BoxGeometry,
 * then add it to a Three.js group.
 * Used extensively to build all voxel-style animal and zombie models from box primitives.
 *
 * @param {THREE.Group} group - Parent group to add the mesh to.
 * @param {number} w - Box width.
 * @param {number} h - Box height.
 * @param {number} d - Box depth.
 * @param {number} color - Hex color for LambertMaterial.
 * @param {number} x - Local X position within the group.
 * @param {number} y - Local Y position within the group.
 * @param {number} z - Local Z position within the group.
 * @param {boolean} [shadow] - If truthy, enables castShadow on the mesh.
 * @returns {THREE.Mesh} The created box mesh.
 */
export function box(group, w, h, d, color, x, y, z, shadow) {
  const m = new THREE.Mesh(getCachedGeo(w, h, d), getCachedMat(color));
  m.position.set(x, y, z);
  if (shadow) m.castShadow = true;
  group.add(m);
  return m;
}
