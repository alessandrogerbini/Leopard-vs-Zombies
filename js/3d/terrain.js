/**
 * @module 3d/terrain
 * @description Procedural terrain generation and chunk management for the 3D Roguelike Survivor mode.
 *
 * This module contains all terrain-related logic extracted from game3d.js:
 * - Noise functions (noise2D, smoothNoise) for deterministic procedural generation
 * - terrainHeight — the core pure function used by nearly every subsystem
 * - Biome determination (getBiome, BIOME_COLORS) — currently forest-only
 * - Chunk key generation (getChunkKey)
 * - Chunk lifecycle management (generateChunk, unloadChunk, updateChunks)
 *
 * Pure functions (noise2D, smoothNoise, terrainHeight, getBiome, getChunkKey) have zero
 * external dependencies and can be called from anywhere. Chunk management functions
 * operate on a TerrainState object and require a Three.js scene reference.
 *
 * Extracted from game3d.js as Layer 1 of the modular decomposition.
 *
 * Dependencies: Three.js (global), 3d/constants.js (CHUNK_SIZE, MAP_HALF), 3d/utils.js (getCachedGeo, getCachedMat)
 * Exports: 11 — noise2D, smoothNoise, terrainHeight, getBiome, BIOME_COLORS,
 *               getChunkKey, createTerrainState, getNearbyColliders, generateChunk, unloadChunk, updateChunks
 */

import { CHUNK_SIZE, MAP_HALF } from './constants.js';
import { getCachedGeo, getCachedMat } from './utils.js';

// === PURE NOISE FUNCTIONS ===

/**
 * Simple seeded 2D noise function using sine-based hash.
 * Produces a deterministic pseudo-random value in [0, 1) for any (x, z) coordinate.
 * Used as the foundation for terrain height, biome selection, and decoration placement.
 *
 * @param {number} x - X coordinate input.
 * @param {number} z - Z coordinate input.
 * @returns {number} Pseudo-random value in [0, 1).
 */
export function noise2D(x, z) {
  const n = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
  return n - Math.floor(n);
}

/**
 * Bilinearly interpolated noise at a given scale.
 * Smooths the raw noise2D output using Hermite interpolation for natural-looking terrain.
 *
 * @param {number} x - World X coordinate.
 * @param {number} z - World Z coordinate.
 * @param {number} scale - Noise scale (larger = smoother/broader features).
 * @returns {number} Interpolated noise value in [0, 1).
 */
export function smoothNoise(x, z, scale) {
  const sx = x / scale, sz = z / scale;
  const ix = Math.floor(sx), iz = Math.floor(sz);
  const fx = sx - ix, fz = sz - iz;
  const a = noise2D(ix, iz), b = noise2D(ix + 1, iz);
  const c = noise2D(ix, iz + 1), d = noise2D(ix + 1, iz + 1);
  const u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
}

/**
 * Compute the terrain height at a world position.
 * Returns 0 for flat terrain (BD-73: hills/curvature removed).
 *
 * This is a PURE function with no closure or state dependencies.
 *
 * @param {number} x - World X coordinate.
 * @param {number} z - World Z coordinate.
 * @returns {number} Terrain height (always 0 for flat terrain).
 */
export function terrainHeight(x, z) {
  return 0;
}

// === BIOME SYSTEM ===

/**
 * Determine the biome type at a world position.
 * Currently returns 'forest' for all positions (single-biome mode).
 * Desert and plains have been removed per the alpha terrain overhaul.
 *
 * @param {number} x - World X coordinate.
 * @param {number} z - World Z coordinate.
 * @returns {'forest'} Always returns 'forest'.
 */
export function getBiome(x, z) {
  return 'forest';
}

/**
 * Biome-to-ground-color mapping. Forest biome has 3 color variations for visual variety.
 *
 * @constant {Object.<string, number[]>}
 */
export const BIOME_COLORS = {
  forest: [0x1a6622, 0x228833, 0x2a7a2a],
};

// === CHUNK KEY UTILITY ===

/**
 * Generate a string key for a chunk at grid coordinates (cx, cz).
 *
 * @param {number} cx - Chunk X index.
 * @param {number} cz - Chunk Z index.
 * @returns {string} Chunk key in "cx,cz" format.
 */
export function getChunkKey(cx, cz) { return `${cx},${cz}`; }

// === TERRAIN STATE ===

/**
 * @typedef {Object} TerrainState
 * @property {Set.<string>} loadedChunks - Set of chunk keys currently loaded.
 * @property {Map.<string, THREE.Mesh>} chunkMeshes - Map of chunk key to ground mesh.
 * @property {Array.<{meshes: THREE.Mesh[], x: number, z: number}>} decorations - Decoration objects (trees, rocks, logs, mushrooms, stumps).
 * @property {Map.<string, Array>} decorationsByChunk - Decorations indexed by chunk key for O(1) unload.
 * @property {THREE.Mesh[]} canopyMeshes - Flat array of all canopy meshes for wind animation.
 * @property {Map.<string, THREE.Mesh[]>} canopyMeshesByChunk - Canopy meshes indexed by chunk key for cleanup.
 * @property {Map.<string, Array.<{x: number, z: number, radius: number}>>} collidersByChunk - Chunk-indexed collision circles for solid objects (trees, rocks).
 */

/**
 * Create a fresh terrain state object for chunk management.
 * This replaces the closure variables that were previously in game3d.js.
 *
 * @returns {TerrainState} A new terrain state with empty collections.
 */
export function createTerrainState() {
  return {
    loadedChunks: new Set(),
    chunkMeshes: new Map(),
    decorations: [],
    decorationsByChunk: new Map(),   // Chunk key -> decoration[] for O(1) unload (BD-172)
    canopyMeshes: [],                // Flat array of canopy meshes for wind animation (BD-173)
    canopyMeshesByChunk: new Map(),  // Chunk key -> canopy mesh[] for cleanup (BD-173)
    collidersByChunk: new Map(),     // Chunk key -> array of { x, z, radius } for solid objects
  };
}

/**
 * Get colliders from the 9 chunks surrounding (and including) a world position.
 * This is the chunk-indexed replacement for scanning the entire flat colliders array.
 * Only checks ~30 colliders (nearby chunks) instead of all ~350 loaded.
 *
 * @param {number} wx - World X position to query around.
 * @param {number} wz - World Z position to query around.
 * @param {TerrainState} ts - The terrain state with collidersByChunk.
 * @returns {Array.<{x: number, z: number, radius: number}>} Combined colliders from 9 nearby chunks.
 */
export function getNearbyColliders(wx, wz, ts) {
  const cx = Math.floor(wx / CHUNK_SIZE);
  const cz = Math.floor(wz / CHUNK_SIZE);
  const result = [];
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      const key = getChunkKey(cx + dx, cz + dz);
      const arr = ts.collidersByChunk.get(key);
      if (arr) {
        for (let i = 0; i < arr.length; i++) result.push(arr[i]);
      }
    }
  }
  return result;
}

// === COLOR UTILITY ===

/**
 * Safely adjust an RGB hex color by per-channel deltas, clamping each channel to [0, 255].
 * Prevents overflow/underflow that corrupts adjacent channels when using raw hex arithmetic.
 *
 * @param {number} hex - Base color as 0xRRGGBB integer.
 * @param {number} rAdj - Red channel adjustment (-255 to +255).
 * @param {number} gAdj - Green channel adjustment (-255 to +255).
 * @param {number} bAdj - Blue channel adjustment (-255 to +255).
 * @returns {number} Adjusted color as 0xRRGGBB integer.
 */
function adjustColor(hex, rAdj, gAdj, bAdj) {
  const r = Math.max(0, Math.min(255, ((hex >> 16) & 0xFF) + rAdj));
  const g = Math.max(0, Math.min(255, ((hex >> 8) & 0xFF) + gAdj));
  const b = Math.max(0, Math.min(255, (hex & 0xFF) + bAdj));
  return (r << 16) | (g << 8) | b;
}

// === DECORATION BUILDERS ===
// Each builder creates one decoration type and returns an array of meshes.
// All decorations use cached BoxGeometry/MeshLambertMaterial (BD-184) to share
// identical instances across all chunks, dramatically reducing GPU memory.
// Positions are set so the base of each decoration sits at terrain height.

/**
 * Create a forest tree (trunk + canopy) at the given world position.
 * Trunk base sits at terrain height; canopy sits on top of trunk.
 *
 * @param {number} dx - World X position.
 * @param {number} dz - World Z position.
 * @param {number} h - Terrain height at (dx, dz).
 * @param {THREE.Scene} scene - Scene to add meshes to.
 * @returns {{meshes: THREE.Mesh[], canopyMeshes: THREE.Mesh[]}} All meshes and canopy-only meshes.
 */
function createTree(dx, dz, h, scene) {
  // Vary tree size slightly using noise
  const sizeVar = 0.8 + noise2D(dx * 7.1, dz * 3.7) * 0.4; // 0.8-1.2
  const trunkH = 2 * sizeVar;
  const canopyBase = h + trunkH;
  const meshes = [];
  const canopyMeshes = [];
  const s = sizeVar;

  // Trunk
  const trunk = new THREE.Mesh(
    getCachedGeo(0.3 * s, trunkH, 0.3 * s),
    getCachedMat(0x664422)
  );
  trunk.position.set(dx, h + trunkH / 2, dz);
  trunk.castShadow = true;
  scene.add(trunk);
  meshes.push(trunk);

  // Canopy color variation
  const canopyColors = [0x226622, 0x1a5a1a, 0x2a7a2a, 0x1e6e1e];
  const cc = canopyColors[Math.floor(noise2D(dx * 2.3, dz * 5.1) * canopyColors.length)];

  // Helper to add a canopy box
  const addBox = (w, bh, d, ox, oy, oz) => {
    const m = new THREE.Mesh(
      getCachedGeo(w, bh, d),
      getCachedMat(cc)
    );
    m.position.set(dx + ox, canopyBase + oy, dz + oz);
    m.userData.isCanopy = true;
    m.userData.windSeed = dx * 0.1 + dz * 0.07;
    m.castShadow = true;
    scene.add(m);
    meshes.push(m);
    canopyMeshes.push(m);
  };

  // Multi-box rounded canopy
  // Center block (largest)
  addBox(1.4 * s, 1.2 * s, 1.4 * s, 0, 0.6 * s, 0);
  // Top cap (smaller, higher)
  addBox(0.9 * s, 0.6 * s, 0.9 * s, 0, 1.3 * s, 0);
  // 4 side lobes (medium, offset outward)
  addBox(0.7 * s, 0.8 * s, 1.0 * s,  0.5 * s, 0.5 * s, 0);
  addBox(0.7 * s, 0.8 * s, 1.0 * s, -0.5 * s, 0.5 * s, 0);
  addBox(1.0 * s, 0.8 * s, 0.7 * s, 0, 0.5 * s,  0.5 * s);
  addBox(1.0 * s, 0.8 * s, 0.7 * s, 0, 0.5 * s, -0.5 * s);

  return { meshes, canopyMeshes };
}

/**
 * Create a rock (rounded boulder shape using scaled boxes) at the given position.
 * 3 size variants selected by noise. Base sits at terrain height.
 *
 * @param {number} dx - World X position.
 * @param {number} dz - World Z position.
 * @param {number} h - Terrain height at (dx, dz).
 * @param {THREE.Scene} scene - Scene to add meshes to.
 * @returns {THREE.Mesh[]} Array of meshes composing this decoration.
 */
function createRock(dx, dz, h, scene) {
  const meshes = [];
  const variant = Math.floor(noise2D(dx * 4.3, dz * 6.7) * 3); // 0, 1, or 2
  const rockColors = [0x887766, 0x776655, 0x998877, 0x666655];
  const color = rockColors[Math.floor(noise2D(dx * 1.1, dz * 2.3) * rockColors.length)];

  if (variant === 0) {
    // Small boulder
    const rw = 0.5 + noise2D(dx, dz) * 0.3;
    const rh = 0.4 + noise2D(dz, dx) * 0.2;
    const rd = 0.5 + noise2D(dx + 1, dz) * 0.3;
    const rock = new THREE.Mesh(
      getCachedGeo(rw, rh, rd),
      getCachedMat(color)
    );
    rock.position.set(dx, h + rh / 2, dz);
    rock.rotation.y = noise2D(dx * 3, dz * 3) * Math.PI;
    rock.castShadow = true;
    scene.add(rock);
    meshes.push(rock);
  } else if (variant === 1) {
    // Medium boulder with smaller rock on top
    const baseW = 0.8 + noise2D(dx, dz) * 0.4;
    const baseH = 0.5 + noise2D(dz, dx) * 0.3;
    const baseD = 0.7 + noise2D(dx + 1, dz) * 0.4;
    const base = new THREE.Mesh(
      getCachedGeo(baseW, baseH, baseD),
      getCachedMat(color)
    );
    base.position.set(dx, h + baseH / 2, dz);
    base.rotation.y = noise2D(dx * 5, dz * 5) * Math.PI;
    base.castShadow = true;
    scene.add(base);
    meshes.push(base);

    // Smaller rock on top
    const topW = baseW * 0.6;
    const topH = baseH * 0.5;
    const topD = baseD * 0.6;
    const top = new THREE.Mesh(
      getCachedGeo(topW, topH, topD),
      getCachedMat(adjustColor(color, 0x11, 0x11, 0x11))
    );
    top.position.set(dx + (noise2D(dx * 2, dz) - 0.5) * 0.2, h + baseH + topH / 2, dz + (noise2D(dx, dz * 2) - 0.5) * 0.2);
    top.rotation.y = noise2D(dx * 7, dz * 7) * Math.PI;
    top.castShadow = true;
    scene.add(top);
    meshes.push(top);
  } else {
    // Large boulder cluster (2-3 rocks together)
    const count = 2 + Math.floor(noise2D(dx * 9, dz * 9) * 2);
    for (let i = 0; i < count; i++) {
      const offsetX = (noise2D(dx + i * 3, dz) - 0.5) * 0.8;
      const offsetZ = (noise2D(dx, dz + i * 3) - 0.5) * 0.8;
      const rw = 0.5 + noise2D(dx + i, dz + i) * 0.5;
      const rh = 0.4 + noise2D(dz + i, dx + i) * 0.4;
      const rd = 0.5 + noise2D(dx + i * 2, dz + i * 2) * 0.5;
      const rock = new THREE.Mesh(
        getCachedGeo(rw, rh, rd),
        getCachedMat(i % 2 === 0 ? color : adjustColor(color, 0x0a, 0x0a, 0x0a))
      );
      const rx = dx + offsetX;
      const rz = dz + offsetZ;
      const rGroundH = terrainHeight(rx, rz);
      rock.position.set(rx, rGroundH + rh / 2, rz);
      rock.rotation.y = noise2D(dx * (i + 3), dz * (i + 3)) * Math.PI;
      rock.castShadow = true;
      scene.add(rock);
      meshes.push(rock);
    }
  }
  return meshes;
}

/**
 * Create a fallen log at the given position.
 * Horizontal elongated box that sits on the ground. Walkable.
 *
 * @param {number} dx - World X position.
 * @param {number} dz - World Z position.
 * @param {number} h - Terrain height at (dx, dz).
 * @param {THREE.Scene} scene - Scene to add meshes to.
 * @returns {THREE.Mesh[]} Array of meshes composing this decoration.
 */
function createFallenLog(dx, dz, h, scene) {
  const logLength = 1.5 + noise2D(dx * 2.7, dz * 4.1) * 1.5; // 1.5-3.0
  const logRadius = 0.2 + noise2D(dz * 3.1, dx * 1.7) * 0.15; // 0.2-0.35
  const logColors = [0x553311, 0x664422, 0x554433];
  const color = logColors[Math.floor(noise2D(dx * 1.3, dz * 2.9) * logColors.length)];

  const log = new THREE.Mesh(
    getCachedGeo(logLength, logRadius * 2, logRadius * 2),
    getCachedMat(color)
  );
  log.position.set(dx, h + logRadius, dz);
  // Random rotation around Y for variety
  log.rotation.y = noise2D(dx * 5.3, dz * 7.1) * Math.PI;
  log.castShadow = true;
  scene.add(log);

  // Optionally add a broken branch stump on top
  const meshes = [log];
  if (noise2D(dx * 8.3, dz * 9.7) > 0.6) {
    const stumpH = 0.2 + noise2D(dx * 6, dz * 6) * 0.15;
    const stump = new THREE.Mesh(
      getCachedGeo(0.12, stumpH, 0.12),
      getCachedMat(adjustColor(color, -0x11, -0x11, 0))
    );
    stump.position.set(
      dx + (noise2D(dx * 4, dz * 4) - 0.5) * logLength * 0.3,
      h + logRadius * 2 + stumpH / 2,
      dz + (noise2D(dx * 3, dz * 5) - 0.5) * 0.1
    );
    stump.castShadow = true;
    scene.add(stump);
    meshes.push(stump);
  }
  return meshes;
}

/**
 * Create a mushroom cluster at the given position.
 * Small colorful boxes with a flat cap on top. 2-4 mushrooms per cluster.
 *
 * @param {number} dx - World X position.
 * @param {number} dz - World Z position.
 * @param {number} h - Terrain height at (dx, dz).
 * @param {THREE.Scene} scene - Scene to add meshes to.
 * @returns {THREE.Mesh[]} Array of meshes composing this decoration.
 */
function createMushroomCluster(dx, dz, h, scene) {
  const meshes = [];
  const count = 2 + Math.floor(noise2D(dx * 3.3, dz * 4.7) * 3); // 2-4
  const capColors = [0xcc3322, 0xdd8844, 0xaa44aa, 0xddcc33, 0x44aadd];
  const stemColor = 0xddddbb;

  for (let i = 0; i < count; i++) {
    const offsetX = (noise2D(dx + i * 5, dz + i * 3) - 0.5) * 0.6;
    const offsetZ = (noise2D(dx + i * 3, dz + i * 5) - 0.5) * 0.6;
    const mx = dx + offsetX;
    const mz = dz + offsetZ;
    const mh = terrainHeight(mx, mz);
    const stemH = 0.15 + noise2D(dx + i * 7, dz + i * 11) * 0.15; // 0.15-0.30
    const capSize = 0.15 + noise2D(dx + i * 13, dz + i * 9) * 0.12; // 0.15-0.27

    // Stem
    const stem = new THREE.Mesh(
      getCachedGeo(0.06, stemH, 0.06),
      getCachedMat(stemColor)
    );
    stem.position.set(mx, mh + stemH / 2, mz);
    scene.add(stem);
    meshes.push(stem);

    // Cap (flat wide box on top)
    const capColor = capColors[Math.floor(noise2D(dx + i * 17, dz + i * 19) * capColors.length)];
    const cap = new THREE.Mesh(
      getCachedGeo(capSize, 0.06, capSize),
      getCachedMat(capColor)
    );
    cap.position.set(mx, mh + stemH + 0.03, mz);
    scene.add(cap);
    meshes.push(cap);

    // Optional white spots on larger caps
    if (capSize > 0.22 && noise2D(dx + i * 23, dz + i * 29) > 0.4) {
      const spot = new THREE.Mesh(
        getCachedGeo(0.04, 0.02, 0.04),
        getCachedMat(0xffffff)
      );
      spot.position.set(mx + (noise2D(dx + i, dz) - 0.5) * 0.06, mh + stemH + 0.07, mz + (noise2D(dx, dz + i) - 0.5) * 0.06);
      scene.add(spot);
      meshes.push(spot);
    }
  }
  return meshes;
}

/**
 * Create a tree stump at the given position.
 * Short box with varied height. Some stumps have visible rings on top.
 *
 * @param {number} dx - World X position.
 * @param {number} dz - World Z position.
 * @param {number} h - Terrain height at (dx, dz).
 * @param {THREE.Scene} scene - Scene to add meshes to.
 * @returns {THREE.Mesh[]} Array of meshes composing this decoration.
 */
function createStump(dx, dz, h, scene) {
  const meshes = [];
  const stumpH = 0.3 + noise2D(dx * 5.7, dz * 3.9) * 0.4; // 0.3-0.7
  const stumpW = 0.35 + noise2D(dz * 4.1, dx * 6.3) * 0.25; // 0.35-0.6
  const stumpColors = [0x664422, 0x553311, 0x775533];
  const color = stumpColors[Math.floor(noise2D(dx * 2.1, dz * 3.3) * stumpColors.length)];

  // Main stump body
  const stump = new THREE.Mesh(
    getCachedGeo(stumpW, stumpH, stumpW),
    getCachedMat(color)
  );
  stump.position.set(dx, h + stumpH / 2, dz);
  stump.castShadow = true;
  scene.add(stump);
  meshes.push(stump);

  // Ring detail on top (lighter color disc)
  if (noise2D(dx * 8.1, dz * 9.3) > 0.3) {
    const ringW = stumpW * 0.7;
    const ring = new THREE.Mesh(
      getCachedGeo(ringW, 0.03, ringW),
      getCachedMat(adjustColor(color, 0x22, 0x22, 0x11))
    );
    ring.position.set(dx, h + stumpH + 0.015, dz);
    scene.add(ring);
    meshes.push(ring);
  }

  // Occasional root bulge at base
  if (noise2D(dx * 10.3, dz * 11.7) > 0.6) {
    const rootW = stumpW * 1.3;
    const rootH = 0.1;
    const root = new THREE.Mesh(
      getCachedGeo(rootW, rootH, rootW),
      getCachedMat(adjustColor(color, -0x11, -0x11, 0))
    );
    root.position.set(dx, h + rootH / 2, dz);
    scene.add(root);
    meshes.push(root);
  }

  return meshes;
}

/**
 * Create a grass patch at the given position.
 * Small thin blades of varying green shades. Walk-through, no collision.
 *
 * @param {number} dx - World X position.
 * @param {number} dz - World Z position.
 * @param {number} h - Terrain height at (dx, dz).
 * @param {THREE.Scene} scene - Scene to add meshes to.
 * @returns {THREE.Mesh[]} Array of meshes composing this decoration.
 */
function createGrassPatch(dx, dz, h, scene) {
  const meshes = [];
  const bladeCount = 3 + Math.floor(noise2D(dx * 3.1, dz * 4.3) * 6); // 3-8
  const greens = [0x3a7a2f, 0x4a8c3f, 0x5a9c4f, 0x2a6a1f, 0x3a8a35];
  for (let i = 0; i < bladeCount; i++) {
    const bh = 0.3 + noise2D(dx * 5.7 + i * 7, dz * 3.3 + i * 11) * 0.3; // 0.3-0.6
    const colorIdx = Math.floor(noise2D(dx * 2.1 + i * 13, dz * 6.7 + i * 17) * greens.length);
    const m = new THREE.Mesh(
      getCachedGeo(0.08, bh, 0.05),
      getCachedMat(greens[colorIdx])
    );
    const offX = (noise2D(dx * 4.3 + i * 19, dz * 5.9 + i * 23) - 0.5); // -0.5 to 0.5
    const offZ = (noise2D(dx * 6.1 + i * 29, dz * 2.7 + i * 31) - 0.5);
    m.position.set(dx + offX * 1.2, h + bh / 2, dz + offZ * 1.2);
    scene.add(m);
    meshes.push(m);
  }
  return meshes;
}

/**
 * Create a flower patch at the given position.
 * Small stems with colorful caps on top. Walk-through, no collision.
 *
 * @param {number} dx - World X position.
 * @param {number} dz - World Z position.
 * @param {number} h - Terrain height at (dx, dz).
 * @param {THREE.Scene} scene - Scene to add meshes to.
 * @returns {THREE.Mesh[]} Array of meshes composing this decoration.
 */
function createFlowerPatch(dx, dz, h, scene) {
  const meshes = [];
  const count = 2 + Math.floor(noise2D(dx * 2.9, dz * 4.1) * 3); // 2-4
  const colors = [0xcc3333, 0xddcc33, 0xeeeedd, 0x4466cc, 0xdd66aa, 0xdd8833];
  for (let i = 0; i < count; i++) {
    const stemH = 0.25 + noise2D(dx * 5.3 + i * 7, dz * 3.7 + i * 11) * 0.2; // 0.25-0.45
    const stem = new THREE.Mesh(
      getCachedGeo(0.06, stemH, 0.06),
      getCachedMat(0x3a7a2f)
    );
    const offX = (noise2D(dx * 4.7 + i * 13, dz * 6.1 + i * 17) - 0.5);
    const offZ = (noise2D(dx * 6.3 + i * 19, dz * 2.9 + i * 23) - 0.5);
    const fx = dx + offX * 1.0;
    const fz = dz + offZ * 1.0;
    stem.position.set(fx, h + stemH / 2, fz);
    scene.add(stem);
    meshes.push(stem);
    const colorIdx = Math.floor(noise2D(dx * 3.1 + i * 29, dz * 7.3 + i * 31) * colors.length);
    const cap = new THREE.Mesh(
      getCachedGeo(0.14, 0.06, 0.14),
      getCachedMat(colors[colorIdx])
    );
    cap.position.set(fx, h + stemH + 0.02, fz);
    scene.add(cap);
    meshes.push(cap);
  }
  return meshes;
}

// === CHUNK MANAGEMENT ===

/**
 * Generate a terrain chunk at the given chunk grid coordinates.
 * Creates an 8x8 subdivided plane mesh with per-vertex height displacement,
 * forest-colored material, and random decorations (trees, rocks, fallen logs,
 * mushroom clusters, stumps).
 * Skips chunks outside MAP_HALF bounds or already loaded.
 *
 * @param {number} cx - Chunk X index.
 * @param {number} cz - Chunk Z index.
 * @param {THREE.Scene} scene - The Three.js scene to add meshes to.
 * @param {TerrainState} ts - The terrain state tracking loaded chunks and decorations.
 */
export function generateChunk(cx, cz, scene, ts) {
  const key = getChunkKey(cx, cz);
  if (ts.loadedChunks.has(key)) return;
  // Skip chunks entirely outside map bounds
  const chunkMinX = cx * CHUNK_SIZE;
  const chunkMaxX = chunkMinX + CHUNK_SIZE;
  const chunkMinZ = cz * CHUNK_SIZE;
  const chunkMaxZ = chunkMinZ + CHUNK_SIZE;
  if (chunkMaxX < -MAP_HALF || chunkMinX > MAP_HALF || chunkMaxZ < -MAP_HALF || chunkMinZ > MAP_HALF) return;
  ts.loadedChunks.add(key);

  const ox = cx * CHUNK_SIZE, oz = cz * CHUNK_SIZE;
  // PlaneGeometry is NOT cached — each chunk has unique vertex displacement
  const geo = new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE, 8, 8);
  const posAttr = geo.attributes.position;

  // Uniform forest green ground color (BD-73: no per-chunk color variation)
  const color = 0x4a8c3f;

  // Vertex displacement loop: local coords range [-CHUNK_SIZE/2, +CHUNK_SIZE/2],
  // mesh center is offset by CHUNK_SIZE/2, so world = (ox + CHUNK_SIZE/2) + local
  const centerX = ox + CHUNK_SIZE / 2;
  const centerZ = oz + CHUNK_SIZE / 2;
  for (let i = 0; i < posAttr.count; i++) {
    const lx = posAttr.getX(i);
    const lz = posAttr.getY(i); // plane is XY before rotation
    const wx = centerX + lx, wz = centerZ + lz;
    const h = terrainHeight(wx, wz);
    posAttr.setZ(i, h);
  }
  geo.computeVertexNormals();

  // Ground material uses cache — all chunks share the same forest green
  const mat = getCachedMat(color);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  // BD-73: Position at chunk center so plane covers [ox, ox+CHUNK_SIZE] with no seam gaps
  mesh.position.set(centerX, 0, centerZ);
  mesh.receiveShadow = true;
  scene.add(mesh);
  ts.chunkMeshes.set(key, mesh);

  // === FOREST DECORATIONS ===
  // Generate a variety of decoration types per chunk.
  // Use different noise seeds per decoration type so their placement is independent.

  // BD-172: Initialize chunk-indexed arrays for O(1) unload
  ts.decorationsByChunk.set(key, []);
  // BD-173: Initialize canopy mesh tracking for this chunk
  ts.canopyMeshesByChunk.set(key, []);

  // BD-89: Track occupied positions to prevent decorations overlapping each other.
  const occupiedPositions = []; // {x, z} of each placed decoration in this chunk
  const MIN_DECO_SPACING = 2.5; // minimum distance between any two decorations
  const MIN_DECO_SPACING_SQ = MIN_DECO_SPACING * MIN_DECO_SPACING;

  /** Check if (px, pz) is far enough from all occupied positions. */
  function isDecoPositionClear(px, pz) {
    for (let i = 0; i < occupiedPositions.length; i++) {
      const ddx = px - occupiedPositions[i].x;
      const ddz = pz - occupiedPositions[i].z;
      if (ddx * ddx + ddz * ddz < MIN_DECO_SPACING_SQ) return false;
    }
    return true;
  }

  // Trees: 2-5 per chunk
  const numTrees = 2 + Math.floor(noise2D(cx * 3 + 7, cz * 3 + 13) * 4);
  for (let d = 0; d < numTrees; d++) {
    const dx = ox + noise2D(cx + d * 7, cz + d * 13) * CHUNK_SIZE;
    const dz = oz + noise2D(cx + d * 11, cz + d * 17) * CHUNK_SIZE;
    if (!isDecoPositionClear(dx, dz)) continue;
    occupiedPositions.push({ x: dx, z: dz });
    const h = terrainHeight(dx, dz);
    const tree = createTree(dx, dz, h, scene);
    const dec = { meshes: tree.meshes, x: dx, z: dz };
    ts.decorations.push(dec);
    ts.decorationsByChunk.get(key).push(dec);
    if (!ts.collidersByChunk.has(key)) ts.collidersByChunk.set(key, []);
    ts.collidersByChunk.get(key).push({ x: dx, z: dz, radius: 1.2 });
    // BD-173: Track canopy meshes for wind animation
    for (const cm of tree.canopyMeshes) {
      ts.canopyMeshes.push(cm);
      ts.canopyMeshesByChunk.get(key).push(cm);
    }
  }

  // Rocks: 0-2 per chunk
  const numRocks = Math.floor(noise2D(cx * 5 + 19, cz * 5 + 23) * 3);
  for (let d = 0; d < numRocks; d++) {
    const dx = ox + noise2D(cx + d * 19 + 3, cz + d * 23 + 5) * CHUNK_SIZE;
    const dz = oz + noise2D(cx + d * 23 + 7, cz + d * 29 + 11) * CHUNK_SIZE;
    if (!isDecoPositionClear(dx, dz)) continue;
    occupiedPositions.push({ x: dx, z: dz });
    const h = terrainHeight(dx, dz);
    const meshes = createRock(dx, dz, h, scene);
    const rockDec = { meshes, x: dx, z: dz };
    ts.decorations.push(rockDec);
    ts.decorationsByChunk.get(key).push(rockDec);
    if (!ts.collidersByChunk.has(key)) ts.collidersByChunk.set(key, []);
    ts.collidersByChunk.get(key).push({ x: dx, z: dz, radius: 1.0 });
  }

  // Fallen logs: 0-1 per chunk
  const numLogs = noise2D(cx * 7 + 31, cz * 7 + 37) > 0.5 ? 1 : 0;
  for (let d = 0; d < numLogs; d++) {
    const dx = ox + noise2D(cx + d * 31 + 9, cz + d * 37 + 13) * CHUNK_SIZE;
    const dz = oz + noise2D(cx + d * 37 + 17, cz + d * 41 + 19) * CHUNK_SIZE;
    if (!isDecoPositionClear(dx, dz)) continue;
    occupiedPositions.push({ x: dx, z: dz });
    const h = terrainHeight(dx, dz);
    const meshes = createFallenLog(dx, dz, h, scene);
    const logDec = { meshes, x: dx, z: dz };
    ts.decorations.push(logDec);
    ts.decorationsByChunk.get(key).push(logDec);
    // BD-254: Add collision for fallen logs (r=0.8 approximates center bulk of elongated shape)
    if (!ts.collidersByChunk.has(key)) ts.collidersByChunk.set(key, []);
    ts.collidersByChunk.get(key).push({ x: dx, z: dz, radius: 0.8 });
  }

  // Mushroom clusters: 0-2 per chunk
  const numMushrooms = Math.floor(noise2D(cx * 11 + 43, cz * 11 + 47) * 3);
  for (let d = 0; d < numMushrooms; d++) {
    const dx = ox + noise2D(cx + d * 43 + 21, cz + d * 47 + 23) * CHUNK_SIZE;
    const dz = oz + noise2D(cx + d * 47 + 27, cz + d * 53 + 29) * CHUNK_SIZE;
    if (!isDecoPositionClear(dx, dz)) continue;
    occupiedPositions.push({ x: dx, z: dz });
    const h = terrainHeight(dx, dz);
    const meshes = createMushroomCluster(dx, dz, h, scene);
    const mushDec = { meshes, x: dx, z: dz };
    ts.decorations.push(mushDec);
    ts.decorationsByChunk.get(key).push(mushDec);
  }

  // Stumps: 0-2 per chunk
  const numStumps = Math.floor(noise2D(cx * 13 + 53, cz * 13 + 59) * 3);
  for (let d = 0; d < numStumps; d++) {
    const dx = ox + noise2D(cx + d * 53 + 31, cz + d * 59 + 37) * CHUNK_SIZE;
    const dz = oz + noise2D(cx + d * 59 + 41, cz + d * 61 + 43) * CHUNK_SIZE;
    if (!isDecoPositionClear(dx, dz)) continue;
    occupiedPositions.push({ x: dx, z: dz });
    const h = terrainHeight(dx, dz);
    const meshes = createStump(dx, dz, h, scene);
    const stumpDec = { meshes, x: dx, z: dz };
    ts.decorations.push(stumpDec);
    ts.decorationsByChunk.get(key).push(stumpDec);
    // BD-254: Add collision for stumps (r=0.5 covers 0.35-0.6 width + root bulge)
    if (!ts.collidersByChunk.has(key)) ts.collidersByChunk.set(key, []);
    ts.collidersByChunk.get(key).push({ x: dx, z: dz, radius: 0.5 });
  }

  // Grass patches: 3-6 per chunk (walk-through, no collision)
  const numGrass = 3 + Math.floor(Math.abs(noise2D(cx * 15 + 61, cz * 15 + 67)) * 4);
  for (let d = 0; d < numGrass; d++) {
    const gdx = ox + Math.abs(noise2D(cx + d * 61 + 45, cz + d * 67 + 47)) * CHUNK_SIZE;
    const gdz = oz + Math.abs(noise2D(cx + d * 67 + 51, cz + d * 71 + 53)) * CHUNK_SIZE;
    const gh = terrainHeight(gdx, gdz);
    const meshes = createGrassPatch(gdx, gdz, gh, scene);
    const grassDec = { meshes, x: gdx, z: gdz };
    ts.decorations.push(grassDec);
    ts.decorationsByChunk.get(key).push(grassDec);
  }

  // Flower patches: 1-3 per chunk (walk-through, no collision)
  const numFlowers = 1 + Math.floor(Math.abs(noise2D(cx * 17 + 73, cz * 17 + 79)) * 3);
  for (let d = 0; d < numFlowers; d++) {
    const fdx = ox + Math.abs(noise2D(cx + d * 73 + 55, cz + d * 79 + 57)) * CHUNK_SIZE;
    const fdz = oz + Math.abs(noise2D(cx + d * 79 + 59, cz + d * 83 + 61)) * CHUNK_SIZE;
    const fh = terrainHeight(fdx, fdz);
    const meshes = createFlowerPatch(fdx, fdz, fh, scene);
    const flowerDec = { meshes, x: fdx, z: fdz };
    ts.decorations.push(flowerDec);
    ts.decorationsByChunk.get(key).push(flowerDec);
  }
}

/**
 * Unload a terrain chunk and its decorations.
 * Ground PlaneGeometry is disposed (unique per chunk), but decoration
 * geometry/materials are shared via cache (BD-184) and must NOT be disposed here.
 *
 * @param {number} cx - Chunk X index.
 * @param {number} cz - Chunk Z index.
 * @param {THREE.Scene} scene - The Three.js scene to remove meshes from.
 * @param {TerrainState} ts - The terrain state tracking loaded chunks and decorations.
 */
export function unloadChunk(cx, cz, scene, ts) {
  const key = getChunkKey(cx, cz);
  if (!ts.loadedChunks.has(key)) return;
  const mesh = ts.chunkMeshes.get(key);
  if (mesh) {
    scene.remove(mesh);
    // PlaneGeometry is unique per chunk — dispose it.
    // Material is cached (shared) — do NOT dispose.
    mesh.geometry.dispose();
    ts.chunkMeshes.delete(key);
  }
  // BD-172: O(1) decoration removal via chunk-key index
  // Only scene.remove, no dispose (geometry/materials shared via getCachedGeo/getCachedMat, BD-184)
  const chunkDecs = ts.decorationsByChunk.get(key);
  if (chunkDecs) {
    const decsToRemove = new Set(chunkDecs);
    for (const d of chunkDecs) {
      d.meshes.forEach(m => { scene.remove(m); });
    }
    // Remove from flat array in one pass
    ts.decorations = ts.decorations.filter(d => !decsToRemove.has(d));
    ts.decorationsByChunk.delete(key);
  }
  // BD-173: Remove canopy meshes for this chunk
  const chunkCanopies = ts.canopyMeshesByChunk.get(key);
  if (chunkCanopies) {
    const canopySet = new Set(chunkCanopies);
    ts.canopyMeshes = ts.canopyMeshes.filter(m => !canopySet.has(m));
    ts.canopyMeshesByChunk.delete(key);
  }
  // Remove colliders for this chunk
  ts.collidersByChunk.delete(key);
  ts.loadedChunks.delete(key);
}

/**
 * Load/unload terrain chunks around the player position.
 * Loads all chunks within VIEW_DIST (4) chunks of the player's chunk,
 * and unloads any loaded chunks beyond VIEW_DIST + 1.
 *
 * @param {number} px - Player world X position.
 * @param {number} pz - Player world Z position.
 * @param {THREE.Scene} scene - The Three.js scene for chunk meshes.
 * @param {TerrainState} ts - The terrain state tracking loaded chunks and decorations.
 * @see generateChunk
 * @see unloadChunk
 */
export function updateChunks(px, pz, scene, ts) {
  const pcx = Math.floor(px / CHUNK_SIZE);
  const pcz = Math.floor(pz / CHUNK_SIZE);
  const VIEW_DIST = 4;

  // Load nearby
  for (let dx = -VIEW_DIST; dx <= VIEW_DIST; dx++) {
    for (let dz = -VIEW_DIST; dz <= VIEW_DIST; dz++) {
      generateChunk(pcx + dx, pcz + dz, scene, ts);
    }
  }
  // Unload far
  const toRemove = [];
  for (const key of ts.loadedChunks) {
    const [cx, cz] = key.split(',').map(Number);
    if (Math.abs(cx - pcx) > VIEW_DIST + 1 || Math.abs(cz - pcz) > VIEW_DIST + 1) {
      toRemove.push([cx, cz]);
    }
  }
  toRemove.forEach(([cx, cz]) => unloadChunk(cx, cz, scene, ts));
}
