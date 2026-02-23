/**
 * @module 3d/utils
 * @description Shared utility functions for 3D model construction.
 *
 * Provides the `box()` helper used by both player and enemy model builders
 * to assemble voxel-style models from box primitives.
 *
 * Dependencies: Three.js (global, loaded via CDN in index.html)
 */

/**
 * Create a box mesh with a LambertMaterial and add it to a Three.js group.
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
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color }));
  m.position.set(x, y, z);
  if (shadow) m.castShadow = true;
  group.add(m);
  return m;
}
