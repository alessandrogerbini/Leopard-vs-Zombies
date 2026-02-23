/**
 * @module 3d/terrain
 * @description Procedural terrain generation and chunk management for the 3D Roguelike Survivor mode.
 *
 * This module contains all terrain-related logic extracted from game3d.js:
 * - Noise functions (noise2D, smoothNoise) for deterministic procedural generation
 * - terrainHeight — the core pure function used by nearly every subsystem
 * - Biome determination (getBiome, BIOME_COLORS)
 * - Chunk key generation (getChunkKey)
 * - Chunk lifecycle management (generateChunk, unloadChunk, updateChunks)
 *
 * Pure functions (noise2D, smoothNoise, terrainHeight, getBiome, getChunkKey) have zero
 * external dependencies and can be called from anywhere. Chunk management functions
 * operate on a TerrainState object and require a Three.js scene reference.
 *
 * Extracted from game3d.js as Layer 1 of the modular decomposition.
 *
 * Dependencies: Three.js (global), 3d/constants.js (CHUNK_SIZE, MAP_HALF)
 * Exports: 10 — noise2D, smoothNoise, terrainHeight, getBiome, BIOME_COLORS,
 *               getChunkKey, createTerrainState, generateChunk, unloadChunk, updateChunks
 */

import { CHUNK_SIZE, MAP_HALF } from './constants.js';

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
 * Compute the terrain height at a world position using multi-octave noise.
 * Combines 3 octaves at scales 12, 6, and 3 for varied terrain with large hills and fine detail.
 *
 * This is a PURE function with no closure or state dependencies.
 *
 * @param {number} x - World X coordinate.
 * @param {number} z - World Z coordinate.
 * @returns {number} Terrain height in world Y units (typically 0-3.3 range).
 */
export function terrainHeight(x, z) {
  return smoothNoise(x, z, 12) * 2 + smoothNoise(x, z, 6) * 1 + smoothNoise(x, z, 3) * 0.3;
}

// === BIOME SYSTEM ===

/**
 * Determine the biome type at a world position.
 * Uses a large-scale noise sample (offset by 500 to decouple from terrain height)
 * to divide the world into three biome regions.
 *
 * @param {number} x - World X coordinate.
 * @param {number} z - World Z coordinate.
 * @returns {'forest'|'desert'|'plains'} The biome at the given position.
 */
export function getBiome(x, z) {
  const v = smoothNoise(x + 500, z + 500, 25);
  if (v < 0.33) return 'forest';
  if (v < 0.66) return 'desert';
  return 'plains';
}

/**
 * Biome-to-ground-color mapping. Each biome has 3 color variations for visual variety.
 *
 * @constant {Object.<string, number[]>}
 */
export const BIOME_COLORS = {
  forest: [0x1a6622, 0x228833, 0x2a7a2a],
  desert: [0xc4a44a, 0xbba040, 0xd4b44a],
  plains: [0x44aa44, 0x55bb55, 0x3a9a3a],
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
 * @property {Object.<string, THREE.Mesh>} chunkMeshes - Map of chunk key to ground mesh.
 * @property {Array.<{meshes: THREE.Mesh[], x: number, z: number}>} decorations - Tree/rock decoration objects.
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
    chunkMeshes: {},
    decorations: [],
  };
}

// === CHUNK MANAGEMENT ===

/**
 * Generate a terrain chunk at the given chunk grid coordinates.
 * Creates an 8x8 subdivided plane mesh with per-vertex height displacement,
 * biome-colored material, and random decorations (trees in forest/plains, rocks in desert).
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
  const geo = new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE, 8, 8);
  const posAttr = geo.attributes.position;

  // Determine dominant biome for chunk
  const biome = getBiome(ox + CHUNK_SIZE / 2, oz + CHUNK_SIZE / 2);
  const colors = BIOME_COLORS[biome];
  const color = colors[Math.floor(noise2D(cx, cz) * colors.length)];

  for (let i = 0; i < posAttr.count; i++) {
    const lx = posAttr.getX(i);
    const lz = posAttr.getY(i); // plane is XY before rotation
    const wx = ox + lx, wz = oz + lz;
    const h = terrainHeight(wx, wz);
    posAttr.setZ(i, h);
  }
  geo.computeVertexNormals();

  const mat = new THREE.MeshLambertMaterial({ color });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(ox, 0, oz);
  mesh.receiveShadow = true;
  scene.add(mesh);
  ts.chunkMeshes[key] = mesh;

  // Decorations: trees, rocks
  const numDecos = Math.floor(noise2D(cx * 3 + 7, cz * 3 + 13) * 5);
  for (let d = 0; d < numDecos; d++) {
    const dx = ox + noise2D(cx + d * 7, cz + d * 13) * CHUNK_SIZE;
    const dz = oz + noise2D(cx + d * 11, cz + d * 17) * CHUNK_SIZE;
    const h = terrainHeight(dx, dz);

    if (biome === 'forest' || (biome === 'plains' && noise2D(dx, dz) > 0.5)) {
      // Tree: trunk + canopy
      const trunk = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 2, 0.3),
        new THREE.MeshLambertMaterial({ color: 0x664422 })
      );
      trunk.position.set(dx, h + 1, dz);
      trunk.castShadow = true;
      scene.add(trunk);
      const canopy = new THREE.Mesh(
        new THREE.BoxGeometry(1.8, 1.5, 1.8),
        new THREE.MeshLambertMaterial({ color: biome === 'forest' ? 0x226622 : 0x44aa33 })
      );
      canopy.position.set(dx, h + 2.5, dz);
      canopy.castShadow = true;
      scene.add(canopy);
      ts.decorations.push({ meshes: [trunk, canopy], x: dx, z: dz });
    } else if (biome === 'desert') {
      // Rock
      const rock = new THREE.Mesh(
        new THREE.BoxGeometry(0.8 + noise2D(dx, dz) * 0.8, 0.5 + noise2D(dz, dx) * 0.6, 0.8 + noise2D(dx + 1, dz) * 0.8),
        new THREE.MeshLambertMaterial({ color: 0x998877 })
      );
      rock.position.set(dx, h + 0.3, dz);
      rock.castShadow = true;
      scene.add(rock);
      ts.decorations.push({ meshes: [rock], x: dx, z: dz });
    }
  }
}

/**
 * Unload a terrain chunk and its decorations, disposing all Three.js resources.
 *
 * @param {number} cx - Chunk X index.
 * @param {number} cz - Chunk Z index.
 * @param {THREE.Scene} scene - The Three.js scene to remove meshes from.
 * @param {TerrainState} ts - The terrain state tracking loaded chunks and decorations.
 */
export function unloadChunk(cx, cz, scene, ts) {
  const key = getChunkKey(cx, cz);
  if (!ts.loadedChunks.has(key)) return;
  const mesh = ts.chunkMeshes[key];
  if (mesh) {
    scene.remove(mesh);
    mesh.geometry.dispose();
    mesh.material.dispose();
    delete ts.chunkMeshes[key];
  }
  // Remove decorations in this chunk
  const ox = cx * CHUNK_SIZE, oz = cz * CHUNK_SIZE;
  for (let i = ts.decorations.length - 1; i >= 0; i--) {
    const d = ts.decorations[i];
    if (d.x >= ox && d.x < ox + CHUNK_SIZE && d.z >= oz && d.z < oz + CHUNK_SIZE) {
      d.meshes.forEach(m => { scene.remove(m); m.geometry.dispose(); m.material.dispose(); });
      ts.decorations.splice(i, 1);
    }
  }
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
