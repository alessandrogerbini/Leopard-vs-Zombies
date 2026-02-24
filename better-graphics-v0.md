# Graphics Improvement Analysis: Leopard vs Zombies (3D Mode)

**Date:** 2026-02-23
**Scope:** Visual analysis of the 3D Roguelike Survivor mode, identifying latitude for graphical improvement within the existing Three.js architecture.

---

## 1. Current State

The 3D mode uses a **voxel art style** built entirely from `THREE.BoxGeometry` primitives with `MeshLambertMaterial` flat-color shading. Every object in the scene -- player models, zombies, trees, rocks, shrines, projectiles, XP gems -- is composed of axis-aligned boxes.

### Rendering pipeline
- **Renderer:** `THREE.WebGLRenderer` with antialiasing enabled, PCFSoftShadowMap shadows.
- **Camera:** `PerspectiveCamera` (FOV 50) in an isometric-style top-down chase position (`y=18, z=14`).
- **Lighting:** Single `AmbientLight` (0x667788, intensity 0.5) + single `DirectionalLight` (0xffeedd, intensity 0.9) with 2048x2048 shadow map.
- **Fog:** Linear `THREE.Fog` (sky blue, near=40, far=90) for distance fadeout.
- **Clear color:** 0x87CEEB (sky blue).
- **HUD:** Separate Canvas2D overlay rendered on top of the 3D scene. All UI text, bars, menus, minimap drawn via `CanvasRenderingContext2D`.

### Visual character
The aesthetic reads as a deliberately **chunky voxel look** -- Minecraft-adjacent but with more detail than single-voxel models. Character models have recognizable anatomy (head, torso, arms, legs, tail, ears, eyes). Zombies have tier-based visual escalation (shoulder pads, third eye, teeth, horns, spine ridges, aura particles, fire crown). The overall effect is charming but reads as programmer art rather than a committed art direction.

### Key observations from screenshots
- **Terrain:** Flat green ground plane (`terrainHeight()` returns 0). Uniform `0x4a8c3f` green. The ground is visually monotonous with no variation.
- **Trees:** Multi-box canopy (center + 4 lobes + top cap) on a rectangular trunk. Recognizable as trees but very blocky. Color variation exists (4 canopy colors) but is subtle.
- **Rocks:** 1-3 scaled boxes with color variation. Read as boulders at a distance but up close are obviously boxes.
- **Player model:** ~40 boxes per animal. Recognizable species (leopard spots, red panda face mask, lion mane, gator snout). The isometric camera means players see a small figure -- detail is mostly lost.
- **Zombies:** ~18 boxes at tier 1, growing to ~35+ at tier 10 with progressive decorations.
- **XP gems:** Small purple boxes scattered everywhere. High visual presence due to quantity.
- **Shadows:** Present and functional. The directional light shadow map follows the player. Shadow quality is good (PCFSoft).
- **Fog:** Works well to hide chunk loading/unloading and create depth.
- **Object density:** Decorations use a minimum spacing of 2.5 units. Chunks typically have 2-5 trees, 0-2 rocks, 0-1 logs, 0-2 mushroom clusters, 0-2 stumps. The world feels populated but not lush.

---

## 2. Texture Opportunities

### Current state: Zero textures
Every mesh uses `MeshLambertMaterial({ color: hex })` -- a single flat color per face. No texture maps are loaded anywhere in the codebase.

### Where textures would add the most visual richness

#### 2a. Ground / Terrain
**Impact: HIGH.** The uniform green ground is the single largest visible surface in the game. A grass texture with subtle variation would dramatically improve the visual quality. Options:
- **Tiled grass texture** on the chunk `PlaneGeometry`. UV mapping is trivial since planes already have default UVs from Three.js. A 512x512 repeating grass texture would cover the ground with minimal memory.
- **Multi-material approach:** Overlay a dirt/path texture near decorations using vertex colors or a secondary material layer.
- **UV implementation:** `PlaneGeometry(16, 16, 8, 8)` already generates UVs in [0,1]. Scale them by `CHUNK_SIZE` to tile. Apply `texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(8, 8)`.

#### 2b. Tree trunks and canopy
**Impact: MEDIUM.** A bark texture on trunks and a leafy texture on canopy boxes would sell the "forest" biome. BoxGeometry has default UVs per face. A simple 256x256 bark texture and a 256x256 leaf texture would suffice.

#### 2c. Rock surfaces
**Impact: MEDIUM.** A stone/moss texture on rock boxes would break up the flat color and add visual weight.

#### 2d. Player and zombie models
**Impact: LOW-MEDIUM.** The camera is far enough that per-face textures on character models would barely register. However, a **fur/skin pattern texture** on larger surfaces (torso, head) could add subtle detail. The box UV layout is 6 faces per box -- manageable but requires per-animal texture authoring.

#### 2e. Ground under decorations
**Impact: LOW.** Dark circles under trees (already handled by `castShadow`) could be enhanced with a dirt/root texture decal.

### UV mapping on BoxGeometry
Three.js `BoxGeometry` automatically generates UV coordinates for each face, mapping each face to the full [0,1] range. This makes texturing straightforward:
```js
// Current:
new THREE.MeshLambertMaterial({ color: 0x4a8c3f })
// With texture:
const tex = new THREE.TextureLoader().load('grass.png');
tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
tex.repeat.set(8, 8);
new THREE.MeshLambertMaterial({ map: tex })
```
For character models, each box face gets its own UV space. The simplest approach is using `color` tinted textures (e.g., a subtle noise/fur texture multiplied by the existing color).

---

## 3. Polygon Budget

### Current approximate poly count per entity

| Entity | Boxes | Triangles (12 per box) | Notes |
|---|---|---|---|
| Player (leopard) | ~40 | ~480 | Includes spots, ears, eye detail |
| Player (lion) | ~42 | ~504 | Extra mane boxes |
| Player (gator) | ~48 | ~576 | Extra ridges, teeth, claws |
| Player + wings | ~55 | ~660 | 6 additional wing segments |
| Zombie tier 1 | ~18 | ~216 | Body, head, arms, legs |
| Zombie tier 5 | ~30 | ~360 | + shoulder pads, teeth, claws, third eye |
| Zombie tier 10 | ~45 | ~540 | + horns, ridges, aura cubes, fire crown |
| Tree | ~7 | ~84 | Trunk + multi-box canopy |
| Rock (small) | 1-2 | 12-24 | |
| Rock (cluster) | 2-4 | 24-48 | |
| Fallen log | 1-2 | 12-24 | |
| Mushroom cluster | 6-12 | 72-144 | Stems + caps + spots |
| Stump | 1-3 | 12-36 | + ring + root |
| Shrine | ~4 | ~48 | Base, pillar, orb, rune |
| XP gem | 1 | 12 | Shared geometry (instancing) |
| Map gem | 1 | 12 | Shared geometry |

### Total scene estimate (typical gameplay)
- 1 player: ~500 tris
- 20-40 zombies: ~4,300-8,600 tris
- ~80 chunks loaded (9x9 grid): 80 planes x 128 tris = ~10,240 tris
- ~200 decorations across loaded chunks: ~6,000 tris
- ~100 XP/map gems: ~1,200 tris
- Shrines, totems, weapons effects: ~500 tris
- **Total: ~23,000-27,000 triangles**

This is an extremely low poly budget by modern standards. Even mobile GPUs handle millions of triangles. There is enormous headroom.

### Where more polygons would add visual impact

#### 3a. Rounded canopy shapes
**Impact: HIGH.** Replace tree canopy boxes with `THREE.SphereGeometry(r, 8, 6)` or `THREE.IcosahedronGeometry(r, 1)`. An 8-segment sphere is 96 tris vs 12 for a box -- 8x more but still negligible. Trees would read as organic rather than Minecraft-like.

#### 3b. Cylindrical tree trunks
**Impact: MEDIUM.** `THREE.CylinderGeometry(radiusTop, radiusBottom, height, 8)` at 8 segments = 96 tris. Trunks would look natural.

#### 3c. Rounded rocks
**Impact: MEDIUM.** `THREE.DodecahedronGeometry(r, 0)` or deformed `SphereGeometry` would read as boulders. Current boxes read as crates.

#### 3d. Smoother player heads
**Impact: LOW.** The camera distance means head shape matters less than body silhouette. A sphere or rounded box for the head would help close-up recognition on the select screen but barely registers during gameplay.

#### 3e. Weapon projectile shapes
**Impact: MEDIUM.** Fireballs and boomerangs using spheres/cones instead of boxes would improve weapon feel. The bone toss is a T-shape which already reads well.

---

## 4. Object Diversity

### Current decoration types (5)
1. **Trees** -- Multi-box canopy on trunk. 4 canopy color variants, noise-based size variation (0.8-1.2x). 2-5 per chunk.
2. **Rocks** -- 3 size variants (small boulder, medium + top, cluster). 4 color variants. 0-2 per chunk.
3. **Fallen logs** -- Horizontal box with optional branch stump. 3 color variants. 0-1 per chunk.
4. **Mushroom clusters** -- 2-4 mushrooms per cluster, 5 cap colors. 0-2 per chunk.
5. **Stumps** -- Short box with optional ring detail and root bulge. 3 color variants. 0-2 per chunk.

### Potential additions (ranked by impact/effort)

#### HIGH impact, LOW effort
- **Grass patches:** 3-8 thin tall boxes (0.02 x 0.3 x 0.02) clustered together, random green shades. Spawn 3-6 clusters per chunk. Would break up the flat ground plane enormously. ~5 boxes each = 60 tris.
- **Flowers:** Small colored boxes (0.05 x 0.05 x 0.05) on thin stems. 5-10 color variants. Spawn as part of grass patches or independently. ~2-3 boxes each = 24-36 tris.
- **Leaf piles:** 3-5 flat boxes stacked loosely at slight angles near trees. Seasonal color variants (green, brown, yellow). ~4 boxes each.

#### MEDIUM impact, MEDIUM effort
- **Bushes:** Dense clusters of 4-8 green boxes at ground level, smaller than tree canopy. Would fill visual gaps between trees and provide partial cover. ~6 boxes each.
- **Tall grass / reeds:** Vertical thin boxes (0.03 x 0.6 x 0.03) in groups of 5-10. Would add vertical interest to the flat ground. Subtle animation (wind sway) possible via position offset in update loop.
- **Berry bushes:** Colored dots (small boxes) on a bush base. Could double as a visual-only decoration or a minor heal pickup source.
- **Puddles / ponds:** Flat transparent blue boxes at ground level with slight y-offset. `MeshBasicMaterial({ color: 0x4488aa, transparent: true, opacity: 0.5 })`. Simple but would add biome variety.

#### MEDIUM impact, HIGH effort
- **Ruins / stone walls:** L-shaped or U-shaped arrangements of stone boxes. Would add structural variety and lore flavor. Could tie into shrine aesthetic.
- **Fallen tree (dead):** Tilted trunk with bare branch stubs. Distinct from fallen log (which is just a horizontal cylinder).
- **Animal burrows:** Small dark box recessed into ground. Visual interest + possible future gameplay (spawn point for allies?).

#### LOW impact, LOW effort
- **Pebbles / small stones:** Tiny boxes (0.1 x 0.05 x 0.1) scattered around rocks. Already implied by the aesthetic.
- **Twigs:** Thin boxes on ground near trees/logs.

---

## 5. Lighting and Effects

### Current lighting setup
- **Ambient:** `AmbientLight(0x667788, 0.5)` -- cool-toned fill, moderate intensity.
- **Directional:** `DirectionalLight(0xffeedd, 0.9)` at position (10, 20, 10). Warm-toned key light. Shadow map 2048x2048, frustum -40 to +40 on all axes.
- **Fog:** `Fog(0x87CEEB, 40, 90)` -- sky blue linear fog. Hides chunk transitions.
- **No hemisphere light, no point lights, no post-processing.**

### Improvement opportunities

#### 5a. Hemisphere light (replace ambient)
**Impact: HIGH. Effort: TRIVIAL.**
Replace `AmbientLight` with `HemisphereLight(skyColor, groundColor, intensity)`:
```js
// Current:
new THREE.AmbientLight(0x667788, 0.5);
// Proposed:
new THREE.HemisphereLight(0x87CEEB, 0x4a8c3f, 0.6);
```
This creates natural sky-ground color bleeding. Objects lit from above get sky blue tint; undersides get ground green tint. Looks vastly more natural than flat ambient for zero performance cost.

#### 5b. Fog color variation (time of day)
**Impact: MEDIUM. Effort: LOW.**
Gradually shift fog color, clear color, and light color/intensity over game time to simulate dawn-to-dusk. This creates visual variety over a 20+ minute session:
- Minutes 0-5: Morning (warm golden light, slight fog)
- Minutes 5-15: Midday (bright, minimal fog)
- Minutes 15+: Dusk (orange/red tones, heavier fog)

Only requires interpolating 3-4 color values per frame.

#### 5c. Particle systems
**Impact: HIGH. Effort: MEDIUM.**
The game already has a `fireParticles` array with a cap of 80 and `spawnFireParticle()`. The infrastructure is there. Opportunities:
- **Ambient leaf particles:** Slowly falling small green boxes that drift in the wind. 10-20 particles max. Would make the forest feel alive.
- **Dust motes:** Tiny bright particles in sunlight. Especially near the player's feet when moving.
- **Death burst particles:** Currently enemies just disappear. A burst of colored boxes on death would provide satisfying feedback. (The 2D mode has `spawnParticles` -- a 3D equivalent is missing for enemy deaths beyond the XP gem drop.)
- **Weapon impact particles:** Claw swipe could shed orange sparks. Fireball explosions could scatter ember boxes. Poison cloud could emit rising wisps.

#### 5d. Bloom / glow post-processing
**Impact: MEDIUM. Effort: MEDIUM-HIGH.**
Three.js supports `EffectComposer` with `UnrealBloomPass`. This would make:
- XP gems and map gems glow attractively
- Lightning bolts and fire effects pop
- Shrine orbs and rune cubes shimmer
- Higher-tier zombie eyes and auras glow menacingly

Implementation requires switching from `renderer.render(scene, camera)` to an effect composer pipeline. The `MeshBasicMaterial` emissive elements (zombie eyes, gem mats, bolt glow) would automatically bloom. Performance cost is one additional full-screen pass.

#### 5e. Ambient occlusion (SSAO)
**Impact: MEDIUM. Effort: HIGH.**
Screen-space ambient occlusion would darken crevices between boxes, under trees, and around the base of objects. This would dramatically improve depth perception in the voxel style. However, SSAO is a full-screen post-processing effect that requires careful tuning and has a real GPU cost. Best deferred to a later optimization pass.

#### 5f. Shadow improvements
**Impact: LOW-MEDIUM. Effort: LOW.**
The current shadow setup is functional. Minor improvements:
- Increase shadow map to 4096x4096 for crisper shadows (costs ~4x memory, minimal GPU impact).
- Add `shadow.bias = -0.001` to reduce shadow acne artifacts.
- The directional light shadow frustum follows the player (`dirLight.target` is updated). Consider tightening the frustum bounds from -40/+40 to -25/+25 for higher shadow resolution near the player.

---

## 6. Animation

### Current animation state

#### Player
- **Walk cycle:** Leg Z-position oscillates with `sin(elapsedTime * 10)`. Arms swing opposite to legs. Body bobs vertically when walking. Tail wags constantly.
- **Rotation:** Smooth lerp (0.15 rate) toward movement direction.
- **Flight:** Superman tilt (-PI/2.5), wing flapping at speed 6, banking into turns. Legs trail behind, arms reach forward.
- **Muscle growth:** Per-level scaling across 5 tiers (core, limbs, extremities, head, cosmetic).

#### Zombies
- **Walk:** `walkPhase` drives leg and arm oscillation. Simple sin-wave.
- **Merge bounce:** Visual bounce timer on tier-up.
- **Tier 9-10 special attacks:** Telegraph mesh, fire state.

#### Decorations
- **XP gems:** Bob up/down + spin (rotation.y increment per frame).
- **Shrine orbs:** No animation visible in code (static position).
- **Shrine runes:** Rotate continuously.

### Improvement opportunities

#### 6a. Idle animation for player
**Impact: MEDIUM. Effort: LOW.**
Currently the player is static when not moving (only tail wags). A subtle idle bob (breathing) would sell the character as alive:
```js
if (len === 0 && !st.flying) {
  const breathe = Math.sin(clock.elapsedTime * 2) * 0.02;
  group.position.y = st.playerY + breathe;
  // Slight torso scale pulse
  if (model.muscles.chest) {
    const s = 1 + Math.sin(clock.elapsedTime * 2) * 0.01;
    model.muscles.chest.scale.y = s;
  }
}
```

#### 6b. Attack animation
**Impact: HIGH. Effort: MEDIUM.**
The auto-attack and power attack currently have no player model animation -- damage just happens and a yellow line flashes. Adding a forward lunge or arm swing would make combat feel impactful:
- On auto-attack: Quick forward lean (rotate group.rotation.x by -0.2 for 0.15 seconds, then spring back).
- On power attack: Bigger lunge with body compression before release.

#### 6c. Zombie death animation
**Impact: HIGH. Effort: MEDIUM.**
Zombies currently just vanish when killed. A brief death animation would provide satisfying feedback:
- Scale shrink over 0.3 seconds (lerp scale to 0).
- Fall backward (rotate on X axis).
- Sink into ground (lower Y position).
- Combination: shrink + sink + color fade to dark.

#### 6d. Tree and decoration sway
**Impact: MEDIUM. Effort: LOW.**
Trees could sway slightly in a "wind" effect:
```js
// In update loop, for each tree canopy mesh:
canopy.rotation.z = Math.sin(clock.elapsedTime * 0.5 + tree.x * 0.1) * 0.02;
```
Very subtle, but makes the world feel alive. Mushrooms and tall grass could also sway.

#### 6e. Hit reaction on zombies
**Impact: MEDIUM. Effort: LOW.**
Currently zombies have a `hurtTimer` that flashes their color. Adding a knockback stumble (brief position offset in the opposite direction of the hit) would improve combat feel. The `hurtTimer` already exists -- just add a position impulse that decays.

#### 6f. Smooth camera transitions
**Impact: LOW-MEDIUM. Effort: LOW.**
The camera follows the player rigidly. A slight lag/spring on camera follow would add cinematic feel. The 2D mode already does `camera.x += (targetX - camera.x) * 0.08` -- the 3D mode could use similar smooth lerp if not already doing so.

---

## 7. Priority Recommendations

Ranked by **visual impact per unit of implementation effort**. Each item includes an estimated implementation time and whether it requires new assets.

### Tier S: Do these first (huge impact, minimal effort)

| # | Improvement | Est. Time | New Assets? | Impact |
|---|---|---|---|---|
| 1 | **Hemisphere light** (replace ambient) | 5 min | No | Natural lighting for free |
| 2 | **Grass patch decorations** | 30 min | No | Breaks up flat ground monotony |
| 3 | **Player idle breathing animation** | 15 min | No | Character feels alive |
| 4 | **Zombie death animation** (shrink + sink) | 45 min | No | Combat satisfaction |
| 5 | **Ground texture** (tiled grass on terrain planes) | 1 hr | 1 texture (can procedurally generate) | Largest visual surface improved |

### Tier A: High impact, moderate effort

| # | Improvement | Est. Time | New Assets? | Impact |
|---|---|---|---|---|
| 6 | **Flower decorations** | 30 min | No | Color variety on ground |
| 7 | **Bush decorations** | 30 min | No | Fills visual gaps between trees |
| 8 | **Attack animation** (player lunge) | 1 hr | No | Combat feel |
| 9 | **Tree sway animation** | 30 min | No | World feels alive |
| 10 | **Time-of-day lighting shift** | 1-2 hr | No | Visual variety over session |
| 11 | **Ambient leaf particles** | 1 hr | No | Forest atmosphere |
| 12 | **Rounded tree canopy** (SphereGeometry) | 1 hr | No | Trees look organic |

### Tier B: Good improvements, more work required

| # | Improvement | Est. Time | New Assets? | Impact |
|---|---|---|---|---|
| 13 | **Bloom post-processing** | 2-3 hr | No | Gems, effects, and emissives glow |
| 14 | **Bark and leaf textures** | 1-2 hr | 2 textures | Tree detail |
| 15 | **Water puddles / ponds** | 1 hr | No | Biome variety |
| 16 | **Weapon impact particles** | 2-3 hr | No | Combat juice |
| 17 | **Cylindrical tree trunks** | 1 hr | No | Natural tree shapes |
| 18 | **Rounded rock shapes** | 1 hr | No | Rocks look like rocks |
| 19 | **Zombie hit knockback** | 30 min | No | Combat feel |

### Tier C: Polish (save for later)

| # | Improvement | Est. Time | New Assets? | Impact |
|---|---|---|---|---|
| 20 | **SSAO post-processing** | 3-4 hr | No | Depth perception |
| 21 | **Shadow map improvement** (4096, bias) | 15 min | No | Crisper shadows |
| 22 | **Ruins / stone wall decorations** | 2-3 hr | No | Structural variety |
| 23 | **Character texture overlays** (fur/skin) | 3-4 hr | 4 textures | Model detail |
| 24 | **Tall grass / reeds** with wind | 1-2 hr | No | Ground cover |
| 25 | **Camera spring follow** | 30 min | No | Cinematic feel |

### Implementation strategy

The top 5 items (Tier S) could be implemented in a **single 2-3 hour sprint** and would transform the visual quality of the game. They require zero new art assets and involve minimal code changes:

1. Hemisphere light is a one-line change.
2. Grass patches reuse the existing decoration system pattern (`createGrassPatch` function, add to `generateChunk`).
3. Idle animation is 5-10 lines in `animatePlayer`.
4. Death animation is a `deathTimer` on enemies with scale/position lerp in the update loop.
5. Ground texture is loading one image and applying it to the terrain material.

The voxel art style is a strength to lean into, not fight against. The improvements above enhance the voxel look rather than trying to escape it. Rounded shapes (spheres, cylinders) should be used selectively -- for organic objects like tree canopies and rocks -- while keeping the blocky character for man-made or structural objects (shrines, crates, walls).

---

## Appendix: Screenshot Reference

All screenshots captured by `screenshot-ai/graphics-review.js` and stored with `gfx-` prefix:

- `gfx-04-3d-initial.png` -- Initial spawn, shows terrain, trees, rocks, player, XP gems, HUD
- `gfx-06-terrain-forward.png` -- Forward movement, terrain + decoration density
- `gfx-08-enemies.png` -- Zombies approaching, red eyes visible at distance
- `gfx-09-combat.png` -- Active combat area with multiple zombies
- `gfx-10-trees.png` -- Close view of multi-box tree canopy
- `gfx-13-later-combat.png` -- Later gameplay with more enemies, augment display
- `gfx-14-distant.png` -- Wider view showing terrain generation, fog fadeout
- `gfx-16-pause.png` -- Level-up menu (actually captured during upgrade selection)
- `gfx-17-wide.png` -- Wide shot with many zombies and decorations visible
