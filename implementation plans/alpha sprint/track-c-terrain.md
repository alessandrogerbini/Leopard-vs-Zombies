# Track C: Terrain & Platforms

**Focus:** Single biome polish, floor clipping fix, terrain object variety, plateau system
**Key Files:** `js/3d/terrain.js` (modify), `js/3d/platforms.js` (new)
**Effort:** 10-14 hours
**Blocked By:** Nothing (can start Day 1)

---

## Task C-1: Strip Desert/Plains from Terrain Generation

**What to build:** Force all terrain to generate as forest biome. Remove desert and plains tile/decoration generation.

**File:** `js/3d/terrain.js`

**Changes:**
1. Modify `getBiome()` to always return `'forest'`
2. Keep the original biome logic commented out for post-alpha restoration
3. Remove desert-only decoration (cacti) from `generateChunk()` -- or just let the forest branch always execute
4. Update `BIOME_COLORS` to only include forest colors (or keep all but only forest is used)

**Implementation:**
```javascript
// In terrain.js, replace getBiome:
export function getBiome(x, z) {
  // Alpha: single biome (forest). Original multi-biome logic preserved below.
  return 'forest';
  // const v = smoothNoise(x + 500, z + 500, 25);
  // if (v < 0.33) return 'forest';
  // if (v < 0.66) return 'desert';
  // return 'plains';
}
```

**In generateChunk, simplify decoration logic:**
The existing forest branch creates trees (trunk + canopy). The desert branch creates rocks. Since biome is now always 'forest', the desert branch never executes. This is fine -- just leave it as dead code. The terrain variety task (C-3) will add rocks and other decorations to the forest biome.

**Test criteria:**
```javascript
import { getBiome } from '../js/3d/terrain.js';
// All positions return forest
assertEqual(getBiome(0, 0), 'forest', 'Origin is forest');
assertEqual(getBiome(100, 100), 'forest', 'Far corner is forest');
assertEqual(getBiome(-50, 75), 'forest', 'Negative coords are forest');
```

**Playtest verification:**
- Walk the entire map for 5 minutes
- See only green ground tiles and trees
- No sandy/desert or bright-green/plains tiles appear
- Decorations are only forest-type (trees, shrubs)

**Done when:** All terrain generation produces forest-biome chunks. No desert or plains tiles spawn.

---

## Task C-2: Fix Floor Clipping (Entity Y Resolution)

**What to build:** Ensure all entities (player, enemies, decorations, shrines, totems, crates, items, XP gems) have their Y-position resolved AFTER terrain height lookup. No model should clip through terrain.

**Files:** `js/game3d.js` (player physics, entity placement), `js/3d/terrain.js` (decoration placement)

**The Problem:**
Multiple places in the code set entity Y to `GROUND_Y` (0) instead of `terrainHeight(x, z)`. Since terrain height ranges from 0 to ~3.3, entities at Y=0 will be partially submerged in elevated terrain.

**Specific fixes needed:**

1. **Decorations in terrain.js** (already correct): Trunk position is `h + 1`, canopy is `h + 2.5`, rock is `h + 0.3`. These use `terrainHeight()`. VERIFIED CORRECT.

2. **Player ground collision in game3d.js:** The `GROUND_OFFSET` (0.55) is added to terrain height. Verify this is correct and consistent.

3. **Enemy spawn Y:** In the spawn functions, enemies must be placed at `terrainHeight(spawnX, spawnZ)` not at 0.

4. **Enemy ground following in tick:** Enemies snap to `terrainHeight(e.group.position.x, e.group.position.z)`. Verify the Y offset accounts for the enemy model's foot height (varies by tier scale).

5. **XP gems:** Gem Y should bob around `terrainHeight(gem.x, gem.z) + offset`, not around a fixed Y.

6. **Powerup crates:** Crate Y should be at `terrainHeight(crate.x, crate.z) + crateHeight/2`.

7. **Item pickups:** Same as crates -- Y at terrain height.

8. **Shrines:** Shrine mesh Y at terrain height + base offset.

9. **Totems:** Totem mesh Y at terrain height + base offset.

**Implementation approach:** Search game3d.js for every instance where an entity Y position is set. For each, verify it uses `terrainHeight()` and not a hardcoded value. Add `terrainHeight()` calls where missing.

**Ground offset constant:** Define `GROUND_OFFSET = 0.55` (player model's foot-to-center distance). For enemies, the offset is `0.5 * tierScale` approximately.

**Test criteria:**
```javascript
// Verify terrain height is used for spawn positions
// (Indirect test: create a mock spawn at (50, 50) and verify Y > 0)
const spawnY = terrainHeight(50, 50);
assert(spawnY > 0, 'Terrain at (50,50) is above zero');
// The entity Y should be >= spawnY (above terrain, not inside it)
```

**Playtest verification (the definitive test):**
- Play for 10 minutes on Normal difficulty
- Walk across varied terrain (hills and valleys)
- Watch enemies spawn -- they should stand ON terrain, not inside it
- Break crates -- they should float at correct height
- Pick up XP gems -- they should bob above terrain surface
- Watch decorations -- tree trunks should emerge from ground, not float above it
- **Zero visible instances of any model partially submerged in terrain**

**Risk note:** If terrain height resolution requires touching too many systems, apply a brute-force Y-offset (+0.1 units on all entities) as a stopgap and log the real fix for post-alpha.

**Done when:** A 10-minute run shows zero visible clipping.

---

## Task C-3: Add Terrain Object Variety (Rocks, Logs, Mushrooms, Stumps)

**What to build:** Expand forest biome decoration set from just "trees" to include rocks, fallen logs, mushroom clusters, and stumps. All are simple box-model geometry.

**File:** `js/3d/terrain.js` -- modify the decoration section of `generateChunk()`

**New decoration types:**

### Rocks (2-3 size variants)
```javascript
// Small rock: irregular boulder shape from overlapping boxes
function createRock(scene, x, z, h, variant) {
  const meshes = [];
  const size = 0.5 + variant * 0.4; // variant 0-2
  const rock = new THREE.Mesh(
    new THREE.BoxGeometry(size, size * 0.6, size * 0.9),
    new THREE.MeshLambertMaterial({ color: 0x887766 })
  );
  rock.position.set(x, h + size * 0.3, z);
  rock.rotation.y = Math.random() * Math.PI;
  rock.castShadow = true;
  scene.add(rock);
  meshes.push(rock);
  // Optional secondary bump for larger variants
  if (variant > 0) {
    const bump = new THREE.Mesh(
      new THREE.BoxGeometry(size * 0.6, size * 0.4, size * 0.5),
      new THREE.MeshLambertMaterial({ color: 0x776655 })
    );
    bump.position.set(x + size * 0.2, h + size * 0.55, z);
    bump.castShadow = true;
    scene.add(bump);
    meshes.push(bump);
  }
  return meshes;
}
```

### Fallen Logs (horizontal)
```javascript
function createFallenLog(scene, x, z, h) {
  const meshes = [];
  const length = 1.5 + Math.random() * 1.5;
  const log = new THREE.Mesh(
    new THREE.BoxGeometry(length, 0.25, 0.3),
    new THREE.MeshLambertMaterial({ color: 0x664422 })
  );
  log.position.set(x, h + 0.13, z);
  log.rotation.y = Math.random() * Math.PI;
  log.castShadow = true;
  scene.add(log);
  meshes.push(log);
  return meshes;
}
```

### Mushroom Clusters
```javascript
function createMushrooms(scene, x, z, h) {
  const meshes = [];
  for (let i = 0; i < 3; i++) {
    const ox = (Math.random() - 0.5) * 0.4;
    const oz = (Math.random() - 0.5) * 0.4;
    const stemH = 0.15 + Math.random() * 0.1;
    // Stem
    const stem = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, stemH, 0.06),
      new THREE.MeshLambertMaterial({ color: 0xeeeecc })
    );
    stem.position.set(x + ox, h + stemH / 2, z + oz);
    scene.add(stem);
    meshes.push(stem);
    // Cap
    const cap = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.06, 0.14),
      new THREE.MeshLambertMaterial({ color: 0xcc4422 })
    );
    cap.position.set(x + ox, h + stemH + 0.03, z + oz);
    scene.add(cap);
    meshes.push(cap);
  }
  return meshes;
}
```

### Stumps (varied height)
```javascript
function createStump(scene, x, z, h) {
  const meshes = [];
  const stumpH = 0.3 + Math.random() * 0.3;
  const stump = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, stumpH, 0.4),
    new THREE.MeshLambertMaterial({ color: 0x553311 })
  );
  stump.position.set(x, h + stumpH / 2, z);
  stump.castShadow = true;
  scene.add(stump);
  meshes.push(stump);
  // Ring detail on top
  const ring = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.02, 0.3),
    new THREE.MeshLambertMaterial({ color: 0x664422 })
  );
  ring.position.set(x, h + stumpH + 0.01, z);
  scene.add(ring);
  meshes.push(ring);
  return meshes;
}
```

**Decoration distribution per chunk:**
Use the existing `numDecos` random count (0-5 per chunk). For each decoration slot, roll a weighted random to pick the type:
- Tree: 35%
- Rock: 25%
- Fallen log: 15%
- Mushroom cluster: 15%
- Stump: 10%

**Test criteria:**
```javascript
// Verify decoration variety exists (indirect -- check that functions exist and return mesh arrays)
// These are integration tests best done via playtest
```

**Playtest verification:**
- Walk through forest terrain for 3 minutes
- See a mix of trees, rocks, logs, mushrooms, and stumps
- All decorations sit on the terrain surface (no floating, no clipping)
- Decorations do not cluster too densely (no overlapping mess)

**Done when:** A forest chunk contains a visibly varied mix of at least 4 decoration types.

---

## Task C-4: Implement Plateau System

**What to build:** Flat-topped elevated platforms with solid visible sides that replace the current floating platforms. Plateaus provide verticality without slope physics.

**File:** `js/3d/platforms.js` (new)

**Plateau rules (from v3 plan):**
- A "unit" = the height of a tier-1 Shambler zombie (~1.0 world units based on ZOMBIE_TIERS[0].scale)
- Plateaus can be 1, 2, 3, or 4 units high
- 1-unit plateaus: tier-1 zombies can walk UNDERNEATH. Player can stand on top.
- Higher plateaus: meaningful elevation. Zombies climb (reuse existing platform-climbing code).
- Plateaus have visible solid sides (earth/stone colored), not floating boxes.
- Can be wide (small hill, 4-8 units) or narrow (column/pillar, 2-3 units)
- Occasional stacking: a 2-unit plateau with a 1-unit plateau on top = 3 units of verticality

**Implementation:**

### Plateau Data Structure
```javascript
/**
 * @typedef {Object} Plateau
 * @property {number} x - Center X position
 * @property {number} z - Center Z position
 * @property {number} baseY - Y at bottom (terrain height at center)
 * @property {number} topY - Y at top (baseY + height)
 * @property {number} height - Plateau height in world units (1-4)
 * @property {number} w - Width (X extent)
 * @property {number} d - Depth (Z extent)
 * @property {THREE.Group} group - Visual mesh group (top surface + sides)
 */
```

### Plateau Generation
```javascript
export function createPlateau(x, z, height, w, d, scene, terrain) {
  const baseY = terrainHeight(x, z);
  const topY = baseY + height;
  const group = new THREE.Group();

  // Top surface (green/brown, flat)
  const topMat = new THREE.MeshLambertMaterial({ color: 0x556633 });
  const topMesh = new THREE.Mesh(new THREE.BoxGeometry(w, 0.2, d), topMat);
  topMesh.position.set(x, topY, z);
  topMesh.receiveShadow = true;
  group.add(topMesh);

  // Sides (earth/stone colored)
  const sideMat = new THREE.MeshLambertMaterial({ color: 0x887755 });
  // Front
  const front = new THREE.Mesh(new THREE.BoxGeometry(w, height, 0.2), sideMat);
  front.position.set(x, baseY + height / 2, z + d / 2);
  group.add(front);
  // Back
  const back = new THREE.Mesh(new THREE.BoxGeometry(w, height, 0.2), sideMat);
  back.position.set(x, baseY + height / 2, z - d / 2);
  group.add(back);
  // Left
  const left = new THREE.Mesh(new THREE.BoxGeometry(0.2, height, d), sideMat);
  left.position.set(x - w / 2, baseY + height / 2, z);
  group.add(left);
  // Right
  const right = new THREE.Mesh(new THREE.BoxGeometry(0.2, height, d), sideMat);
  right.position.set(x + w / 2, baseY + height / 2, z);
  group.add(right);

  scene.add(group);

  return {
    x, z, baseY, topY, height, w, d, group,
    // Collision interface (compatible with existing platform collision code)
    get y() { return topY; },
  };
}
```

### Chunk-Based Plateau Generation
Plateaus are generated per-chunk like the existing platform system. Each chunk has a 20% chance of containing a plateau. Height is weighted: 1-unit (40%), 2-unit (30%), 3-unit (20%), 4-unit (10%). Size is random within bounds: width 2-8, depth 2-8.

```javascript
export function generatePlateaus(cx, cz, scene, terrain, plateauState) {
  const key = getChunkKey(cx, cz);
  if (plateauState.byChunk[key]) return;

  const roll = noise2D(cx * 5 + 3, cz * 5 + 7);
  if (roll > 0.2) { plateauState.byChunk[key] = []; return; } // 20% chance

  const ox = cx * CHUNK_SIZE + CHUNK_SIZE / 2;
  const oz = cz * CHUNK_SIZE + CHUNK_SIZE / 2;

  // Determine height
  const hRoll = noise2D(cx * 7, cz * 7);
  const height = hRoll < 0.4 ? 1 : hRoll < 0.7 ? 2 : hRoll < 0.9 ? 3 : 4;

  // Determine size
  const w = 2 + noise2D(cx * 11, cz * 11) * 6;
  const d = 2 + noise2D(cx * 13, cz * 13) * 6;

  const plateau = createPlateau(ox, oz, height, w, d, scene, terrain);
  plateauState.byChunk[key] = [plateau];
  plateauState.all.push(plateau);
}
```

### Player-Plateau Collision
Reuse the existing platform collision logic but adapt for plateaus:
```javascript
// In the player physics section:
for (const p of plateaus) {
  const halfW = p.w / 2, halfD = p.d / 2;
  if (st.playerX > p.x - halfW && st.playerX < p.x + halfW &&
      st.playerZ > p.z - halfD && st.playerZ < p.z + halfD) {
    if (st.playerVY <= 0 && st.playerY >= p.topY - 0.5 && st.playerY <= p.topY + 0.5) {
      st.playerY = p.topY + GROUND_OFFSET;
      st.playerVY = 0;
      st.onGround = true;
      st.onPlatformY = p.topY;
    }
  }
}
```

### Walk-Under for 1-Unit Plateaus
For 1-unit plateaus, the player and tier-1 zombies should be able to walk underneath. This means the top collision only applies if the player is at or above the plateau top. If the player Y is below the plateau base + some threshold, ignore the collision:
```javascript
// Only collide with plateau top if player is near the top, not underneath
const playerNearTop = st.playerY >= p.topY - 1.0;
if (playerNearTop && st.playerVY <= 0 && ...) {
  // land on plateau
}
```

**Test criteria:**
```javascript
// Plateau creation test
const p = createPlateau(10, 10, 2, 4, 4, mockScene, terrainHeight);
assertEqual(p.height, 2, 'Plateau height is 2');
assert(p.topY > p.baseY, 'Top is above base');
assertClose(p.topY - p.baseY, 2, 0.01, 'Height difference is 2 units');
assertEqual(p.w, 4, 'Width is 4');
assertEqual(p.d, 4, 'Depth is 4');
```

**Playtest verification:**
- Walk around and encounter plateaus at varied heights (1-4 units)
- Jump onto a 1-unit plateau -- player stands on top
- Walk under a 1-unit plateau -- player passes underneath
- See solid earth/stone sides on all plateaus (not floating boxes)
- Zombies climb onto plateaus (reuse existing climb logic)
- No Z-fighting or visual artifacts on plateau surfaces

**Done when:** Terrain generation produces plateaus at varied heights (1-4 units). Player and zombies interact correctly. Sides are visually solid.
