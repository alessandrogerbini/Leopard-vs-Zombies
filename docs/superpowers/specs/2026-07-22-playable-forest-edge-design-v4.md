# Playable Forest Edge First Quest Design v4

**Date:** 2026-07-23
**Bead:** `Leopard vs Zombies-de3`
**Status:** Refined v4 — awaiting user approval

## Goal

Replace the Forest Edge placeholder panel with the playable, elevated oblique 3D encounter intended by the Animal Rescue vertical slice. Its camera, scale, visible depth cues, lighting, and unobstructed world presentation must read immediately like the existing Survivor gameplay view. The deliverable stops after making `The Hero Sign-Up Sheet` genuinely playable: move through one local forest clearing, automatically gather five Wood from two spatial nodes, defeat three spatial tutorial zombies, receive the existing reward once, and return to the Rescue Hub.

This v4 is an implementation-ready design correction. It does not claim that the current GUI has changed.

## Repository-grounded Survivor camera baseline

The phrase **Survivor-like isometric** in this design is shorthand for the existing game's elevated oblique **perspective** presentation. It is not a claim of mathematical isometric projection. The implementation source of truth is `js/game3d.js`, `js/3d/constants.js`, and `js/3d/terrain.js`:

| Observable | Current Survivor behavior | Forest Edge v4 requirement |
|---|---|---|
| Projection | `THREE.PerspectiveCamera(50, aspect, 0.1, 150)` | Use the same projection values. |
| Base follow constants | `CAMERA_Y_OFFSET = 18`, `CAMERA_Z_OFFSET = 14`; the normal target uses those constants multiplied by the height zoom factor | Evaluate the base constants at Forest Edge's authored `playerY = 0`, producing exactly `(playerX, 18, playerZ + 14)`. |
| Survivor ground-lift caveat | Survivor initializes flat-ground `playerY` to `terrainHeight(0, 0) + 0.01`. With `GROUND_Y = 0`, the height multiplier is `1.0006`, so its runtime offsets relative to the player are about `18.0108` and `14.0084` and its world camera Y target is about `18.0208` | The negligible lift is not copied. Forest Edge is intentionally tested at exactly `playerY = 0`, offsets `18` and `14`, and zoom `1`. This copies Survivor's base constants, not every height-adjusted runtime value. |
| Elevation/pitch at rest | The base-constant ratio gives `atan2(18, 14) = 52.125°` above the ground plane; multiplying both offsets by Survivor's `1.0006` does not change the angle | Preserve `52.125°`; it is neither overhead nor near-horizontal. |
| Ground-plane yaw/azimuth at rest | Camera X equals player X and camera Z is positive relative to the player, so the converged view looks along world `-Z` with no 45° X/Z yaw | Preserve this north-facing rest bearing. The diagonal is the elevated Y/Z viewing ray, not a 45° ground-plane yaw. |
| Follow | Each normal render frame performs `cameraAxis += (targetAxis - cameraAxis) * 0.05` | Use the same position update after the authoritative simulation step. |
| Look-at | Every normal frame immediately calls `camera.lookAt(playerX, playerY, playerZ)` | Look at the current player anchor immediately; do not smooth a second target. |
| Rotation | There is no player-controlled orbit. While position catches up to a moving player, immediate look-at produces a small transient yaw/pitch change | Forest Edge has no camera-rotation input and preserves this transient behavior. “Fixed bearing” means the converged rest bearing. |
| Zoom/framing | `camera.zoom` remains its default `1`; Survivor changes offset distance for death and height | Forest Edge has no death zoom, height zoom, wheel zoom, or adaptive portrait zoom. `camera.zoom` remains exactly `1`. |
| Resize | Renderer size changes; camera aspect/projection and HUD dimensions update; gameplay state and camera identity do not reset | Use the same relevant behavior. |

The Forest Edge rest distance is exactly `sqrt(18² + 14²) = 22.804` world units. This is the selected visual baseline replacing v2's shorter `(8.6, 7.2)` camera and independently smoothed target.

## Approved scope

### Included

- Forest Edge while `heroSignup` is the active quest.
- One visible selected-animal model, one bounded local forest clearing, two Wood nodes, and three chasing tutorial zombies.
- Survivor-like elevated oblique perspective framing as defined above.
- WASD and arrow-key movement at normalized diagonal speed.
- Automatic proximity gathering: node one grants `3 Wood`; node two grants `2 Wood`.
- `Space` or `Enter` attacks the nearest living zombie that is in range.
- Zombie pursuit and non-stacking contact damage based on actual planar proximity.
- Existing ten-percent ingredient death penalty, deterministic safe respawn, and `1.25` seconds of grace.
- Compact transparent HUD with controls, HP, objective progress, feedback, and the existing guide-dismiss control.
- One idempotent completion transaction that applies the existing reward, shows the existing reward banner, saves, disposes the encounter, and returns to Hub.
- A named, injected, later-quest-only browser-test capability required by the existing alpha-chain regression.

### Excluded

- Playable Rabbit Village or any later quest zone.
- New weapons, abilities, drops, audio, procedural terrain, bosses, or content.
- Click-to-move, virtual joystick, gamepad, or touch controls.
- Camera orbit, rotation controls, wheel zoom, cinematic zoom, or a general camera-system redesign.
- Hub, Quest Board, World Map, general save UX, or later-quest redesigns.
- A normal-play `G` gather action or `E` completion action.
- Replacing the existing ImageGen Hub art.

## Player experience

1. With `heroSignup` active, the player selects Forest Edge on the World Map.
2. The opaque letter-block arena disappears. A real Three.js forest clearing fills the WebGL canvas beneath a transparent HUD.
3. The selected animal starts at the south edge, facing north. The camera snaps to the Forest Edge base offset and looks diagonally down into the clearing with the player as its anchor.
4. WASD or arrows move the animal through simulation X/Z space. The camera follows while perspective path taper, actor scale, shadows, overlap, and tree-line parallax make depth and direction legible.
5. Reaching `forestEdge-stump-1` hides that pile, grants exactly `3 Wood`, and updates the objective to `Wood 3/5`. Reaching `forestEdge-stump-2` grants exactly `2 Wood` and updates it to `Wood 5/5`.
6. Three visible zombies pursue the player. `Space` or `Enter` bonks the nearest in-range zombie. A distant attack changes no enemy HP.
7. Only a zombie whose collision surface touches the player's collision surface contributes to the shared damage cadence. Several touching zombies do not stack damage.
8. Death keeps gathered-node and defeated-zombie progress, applies the existing ingredient penalty, resets living zombies to their authored spawn positions, and respawns the player safely with full HP and grace.
9. As soon as both objectives are complete, the existing reward is applied exactly once, the reward banner appears, and the player is back in Hub.

`G` has no Forest Edge gameplay effect. `E` has no Forest Edge gameplay effect, even in an assist-enabled test fixture.

## Camera approaches considered

### Approach A — Survivor base-constant follow contract, locally owned by RPG (selected)

- Use the current Survivor `50°` perspective lens, Forest Edge's exact `+18Y/+14Z` grounded offset, `0.05` per-render-frame position smoothing, immediate look-at, north-facing rest bearing, and aspect-only resize.
- Put immutable Forest Edge camera values in `constants-rpg.js`; keep Three.js camera creation, update, and resize ownership in the `game-rpg.js` composition root.
- Advantages: closest observable match to Survivor while preserving W/up, S/down, A/left, and D/right presentation; frames the small encounter at landscape sizes; does not change Survivor code.
- Tradeoff: it is elevated oblique perspective rather than mathematical isometry, and the small camera policy is duplicated instead of extracted.

### Approach B — Extract one shared Survivor/RPG follow-camera module

- Move the current Survivor policy into a shared trunk and make both modes consume it.
- Advantages: future camera fixes cannot drift between modes; one direct contract.
- Tradeoffs: changes the established Survivor runtime and expands this first-quest task into a cross-mode refactor with additional regression and ownership risk.

### Approach C1 — True orthographic isometry

- Use an orthographic camera at `45°` ground-plane azimuth and approximately `35.264°` elevation (`atan(1 / sqrt(2))`) so the three world axes have equal foreshortening and parallel world lines do not converge.
- Advantages: mathematically conventional isometric projection and a symmetric diorama silhouette.
- Tradeoffs: it does not match Survivor, removes perspective size/depth cues, and projects the unrotated movement axes diagonally unless input or world orientation changes.

### Approach C2 — Perspective three-quarter/isometric-like view

- Use a perspective camera with a `45°` ground-plane azimuth and an explicitly selected elevation, optionally near `35.264°`.
- This is not mathematical isometry: perspective convergence and distance-based size remain, and equal X/Z offsets establish azimuth only.
- Advantages: a familiar isometric-like composition while retaining perspective depth.
- Tradeoffs: it still does not match Survivor and would make the current unrotated W/A/S/D axes project diagonally.

### Recommendation

Select Approach A. The checkpoint asks for Forest Edge to look and play like Survivor mode, so repository fidelity, intuitive controls, deterministic visual testing, and narrow implementation risk outweigh either true orthographic isometry or a 45°-yaw perspective alternative. Code, tests, and user-facing design language call the result “Survivor-like elevated oblique perspective.”

## Architecture and dependency contract

### Trunks and composition root

- `js/rpg/constants-rpg.js` remains the stable content/configuration trunk. It owns authored node/enemy definitions, numeric Forest Edge simulation values, controlled scene palette values, and immutable `FOREST_EDGE_CAMERA` and `FOREST_EDGE_LIGHTING` values.
- `js/game-rpg.js` is the composition root. It imports branches, injects dependencies, translates plain return values, owns the Three.js renderer/camera/lights, and decides when to save or transition. It is the only module allowed to wire the RPG scene branch to the existing 3D player-model branch.
- Save objects and serializable view models are trunk-owned data ports between pure RPG branches. Opaque Three.js handles never cross into combat, inventory, quest, save, or HUD code.

### Branches

- `js/rpg/combat-rpg.js`: pure spatial movement, targeting, pursuit, contact damage, death, and serializable summaries.
- `js/rpg/inventory.js`: pure node collection and ingredient/ID bookkeeping.
- `js/rpg/quest-system.js`: quest progress normalization, completion state, and reward-claim ledger.
- `js/rpg/forest-edge-scene.js`: player-independent Three.js ground, paths, scenery, node, and zombie visuals.
- `js/rpg/hud-rpg.js`: transparent zone overlays from a supplied view model.
- `js/3d/player-model.js` plus `js/3d/utils.js`: existing selected-animal visuals and their shared geometry/material caches.

### Allowed dependency graph

```text
constants-rpg.js
  <- combat-rpg.js
  <- inventory.js
  <- quest-system.js

game-rpg.js (composition root)
  -> constants-rpg.js
  -> combat-rpg.js
  -> inventory.js
  -> quest-system.js
  -> forest-edge-scene.js
  -> hud-rpg.js
  -> 3d/player-model.js
  -> 3d/utils.js

forest-edge-scene.js
  <- injected THREE, scene, and plain definitions only
```

Forbidden arrows include `forest-edge-scene.js -> js/3d/*`, `forest-edge-scene.js -> combat-rpg.js`, `combat-rpg.js -> inventory.js`, and every other branch-to-branch import. `forest-edge-scene.js` uses a private local primitive builder backed by injected `THREE`; it does not import the sibling `box()` helper.

### Camera constants and formulas

`constants-rpg.js` adds this immutable policy:

```javascript
export const FOREST_EDGE_CAMERA = Object.freeze({
  fovDegrees: 50,
  near: 0.1,
  far: 150,
  yOffset: 18,
  zOffset: 14,
  smoothFactor: 0.05,
  zoom: 1,
});
```

For the authored grounded player `(px, 0, pz)`:

```text
desiredPosition = (px, 18, pz + 14)
lookAtTarget     = (px, 0, pz)
nextPosition     = previousPosition
                 + (desiredPosition - previousPosition) * 0.05
```

Entry snaps to `desiredPosition` before the first render. Every later render records the previous position and desired position, applies the formula once, calls `lookAt(lookAtTarget)`, and records a monotonic render-frame ID. The observation view retains only the eight most recent completed records so a screenshot can be matched to the records immediately before and after compositor capture without accumulating runtime history. Camera update happens after simulation and actor synchronization, so each recorded target and projected actor bound uses the same post-movement coordinates rendered in that frame.

### Scene API

`js/rpg/forest-edge-scene.js` exposes:

```javascript
buildForestEdgeScene({
  THREE,
  scene,
  nodeDefinitions,
  enemyDefinitions,
}) -> sceneHandle

syncForestEdgeScene(sceneHandle, {
  enemies,
  nodes,
}) -> void

getForestEdgeSceneDebug(sceneHandle) -> serializableSceneView

disposeForestEdgeScene(sceneHandle) -> boolean
```

The build function tags roots with stable `userData.rpgRole` values (`forestGround`, `forestPath`, `forestScenery`, `woodNode`, and `tutorialZombie`) and node/enemy IDs. Natural scenery used by the parallax check additionally has stable IDs `southCutStump` and `northTree`; these are ordinary non-interactive scenery, not test markers. If construction throws, it disposes its partially populated ownership sets before rethrowing. `disposeForestEdgeScene()` is idempotent: the first call removes its roots, disposes every owned resource once, marks the handle disposed, and returns `true`; later calls return `false`.

### Selected-animal integration

The composition root calls existing `buildPlayerModel(animal.id, runtimeScene)` directly. `forest-edge-scene.js` never receives the concrete `PlayerModel`.

Existing `animatePlayer()` is reused with this exact read-only adapter:

```javascript
{
  playerX: combat.player.x,
  playerY: 0,
  playerZ: combat.player.z,
  deathSequence: false,
  deathSequenceTimer: 0,
  flying: false,
  gManeuver: false,
  gManeuverPitch: 0,
  attackAnimTimer: visualAttackTimer,
  attackAnimDuration: 0.15,
}
```

Its `len`, `mx`, and `mz` arguments are normalized movement magnitude and the combat player's current facing vector. This supplies every `st.*` field read by `animatePlayer()` without fabricating a Survivor state.

One model is built lazily on first successful entry. Ordinary exit detaches the group, resets animation transforms, and retains it for re-entry. Re-entry reattaches the same group. A targeted `disposePlayerModel()` API is added to `js/3d/player-model.js` so the allocating branch owns destruction of its mixed cached/private resources.

### Resource ownership and cleanup

| Resource | Owner | Lifetime | Exit/full-cleanup rule |
|---|---|---|---|
| WebGL renderer, base scene, perspective camera, lights | `game-rpg.js` | Full RPG runtime | Renderer disposed once on full cleanup; scene/camera references cleared |
| Ground, paths, scenery, nodes, zombie meshes | `forest-edge-scene.js` | One active encounter | Explicit handle disposal on every zone exit; no scene traversal |
| Selected player group | `3d/player-model.js`, wired by `game-rpg.js` | Reused across re-entries | Detach/reset on zone exit; `disposePlayerModel()` on full cleanup |
| Player-private geometries/materials | `3d/player-model.js` | Full RPG runtime | Disposed once by `disposePlayerModel()` |
| Cache-backed box geometries/materials | `3d/utils.js` | Full RPG runtime | Never disposed by zone/player traversal; `clearCaches()` once after player disposal |
| HUD pixels and runtime listeners | `game-rpg.js` | Full RPG runtime | HUD cleared and listeners removed once on full cleanup |

`buildPlayerModel()` records only non-cached resources it creates in its private ownership sets. Cached `box()` geometry/materials are excluded. Full cleanup runs: exit active Forest Edge, dispose retained player, clear shared 3D caches, clear base-scene references, then dispose renderer. It never recursively disposes `runtimeScene`. Only one external mode runs at a time, so cache clearing cannot invalidate Survivor concurrently.

## Forest scene and presentation contract

### Local composition and controlled visual palette

- A flat grassy patch at `y = 0` extends beyond the simulation rectangle. Its irregular color cells use `0x466d3e`, `0x4f7b45`, and `0x62894e`; no one cell covers more than one quarter of the visible central ground. Simulation bounds remain `x: -5.6..5.6`, `z: -5.2..5.2`; no rectangular wall, opaque board, or arena border is drawn.
- A constant-width warm dirt trunk path at `y = 0.01` uses `0x9a7048` and `0xb18659`. It enters near `(0, 5.2)`, runs north, and forks toward both Wood nodes. Designated straight near/far path probe segments precede the fork so rendered perspective taper is measurable. The path has no collision or simulation authority.
- Wood piles appear at `(-1.8, -1.1)` and `(1.6, -0.8)`. Each is a stump/log pile with a visible `0xf2c94c` rescue ribbon, not a lettered block.
- Tutorial zombies appear at `(-1.2, -1.4)`, `(1.3, -1.0)`, and `(0.1, 1.4)`. Each has a readable full-body silhouette and a visible burgundy torso garment using `0x6d3f47`, providing a deterministic pixel accent distinct from grass.
- The selected animal uses its existing voxel model at the authoritative coordinate. It is never replaced by a rotating cube. The fresh visual fixture selects the existing leopard, whose orange/yellow materials provide the deterministic player-image mask; structural and scale checks still run for all selectable models.
- Tall trees and dense canopy frame west, east, and north outside the playable bounds. The south camera-facing entrance contains only low shrubs, rocks, and cut stumps.
- `southCutStump` near the entrance and `northTree` at the far tree line are natural composition elements used to measure post-movement parallax. They share bark-family material so their rendered component centroids can be compared without adding debug-looking markers.
- Small rocks, mushrooms, grass clumps, and fallen branches stay outside authored travel lanes and actor spawn/contact circles. They have no collision and cannot resemble a collectible.
- Scene background and fog use `0x294a3a`. Fog is `THREE.Fog(0x294a3a, 34, 70)`. At every legal player position, the camera-to-player distance and the maximum camera-to-legal-actor-anchor distance are less than the fog near value; actors and objectives cannot be fog-hidden.

### Numeric lighting and shadow policy

Forest Edge uses Survivor's base daytime light colors, intensities, offset direction, shadow type, and map size, but keeps the light clearing-fixed for this bounded deterministic encounter:

```javascript
export const FOREST_EDGE_LIGHTING = Object.freeze({
  hemisphereSky: 0x87ceeb,
  hemisphereGround: 0x4a8c3f,
  hemisphereIntensity: 0.6,
  directionalColor: 0xffeedd,
  directionalIntensity: 0.9,
  directionalPosition: Object.freeze({ x: 10, y: 20, z: 10 }),
  directionalTarget: Object.freeze({ x: 0, y: 0, z: 0 }),
  shadowMapSize: 1024,
  shadowNear: 0.5,
  shadowFar: 80,
  shadowExtent: 16,
  shadowBias: -0.0005,
  shadowNormalBias: 0.02,
});
```

- Renderer shadow maps are enabled with `THREE.PCFShadowMap`.
- Directional shadow-camera left/right/top/bottom are `-16/+16/+16/-16`. Unlike Survivor's player-following light, this light and target never move. Fixed ownership makes the bounded scene and its screenshot shadows repeatable.
- Ground, paths, and stable scenery receive shadows. The animal, Wood piles, zombies, trunks, and canopies cast shadows.
- After matrices update, every corner of each legal caster/receiver world bounding box must project inside the shadow-camera X/Y range with at least a `0.25` NDC margin and inside its near/far depth. This proves the entire authored encounter, including legal player extremes, is covered rather than merely checking flags.
- Materials remain normally depth-tested. No actor or scenery is a HUD sprite and no scenery forces `depthTest: false`.
- Composited-image gates below require visible shadow pixels, lit/shaded luminance separation, path taper, and post-movement parallax. Light objects and `castShadow` flags are diagnostics, not acceptance substitutes.

### Projected scale and entry framing

Projected bounds are calculated from the eight corners of each current world-space `THREE.Box3` through the actual camera after world matrices update. Bounds must also contain visible screenshot pixels as defined by the visual gates; mathematical projection alone cannot pass.

At the fresh entry pose, each complete object is inside the viewport and meets these deliberately broad, non-brittle pixel envelopes:

| Viewport | Selected animal W × H | Each zombie W × H | Each Wood pile W × H |
|---|---:|---:|---:|
| `960x540` | `18..78 × 38..105` | `16..68 × 28..88` | `14..62 × 12..52` |
| `1280x720` | `24..104 × 50..140` | `21..91 × 37..118` | `19..83 × 16..70` |
| `390x844` | `28..122 × 60..175` | `25..116 × 48..150` | `22..108 × 20..92` |

At both landscape sizes, all four playable-boundary corners projected at ground level lie within `x: 3%..97%` and `y: 7%..94%` on entry. At portrait entry, the animal, both nodes, and all three zombies remain inside the viewport with at least four pixels of margin; decorative east/west tree line may crop. No persistent HUD panel may overlap more than `10%` of any entry actor/object projected-bound area.

### Finite occlusion and extreme-position visibility

Occlusion is verified against actual model bounds, not an assumed animal height:

- For an animal or zombie, compute `feetY = box.min.y`, `topY = box.max.y`, and the upper-body target at `(box center X, feetY + 0.72 * (topY - feetY), box center Z)`.
- For a Wood pile, use its world-bounding-box center.
- Recursive raycast participants are visible mesh descendants of `forestScenery` whose material is visible, has `opacity >= 0.85`, and is either non-transparent or effectively opaque. Authored tall scenery uses `transparent: false` and `opacity: 1`.
- A target is clear when no participating hit has distance less than `cameraToTargetDistance - 0.02`.

The reproducible player test domain is the radius-inset legal rectangle `x: -5.15..5.15`, `z: -4.75..4.75`. For each of `leopard`, `redPanda`, `lion`, and `gator`, a detached browser scene checks every point on a `0.5`-unit grid, explicitly adds the exact maximum edges, the spawn, four edge midpoints, and four corners, snaps the camera to that point's desired position, and requires a clear ray to the model-derived upper-body target. The entry camera separately requires clear rays to both node centers and all three zombie upper-body targets.

The running-game image test supplements those raycasts at `960x540`: fresh fixtures use real held-key movement to reach spawn, four edge midpoints, and four corners. At all nine samples the projected player bounds remain inside the viewport, meet the `960x540` scale envelope, and contain the required visible player silhouette pixels. The south edge and both south corners specifically prove that camera-facing foreground foliage does not cover the upper body. Objectives may leave the frustum at remote player extremes; an objective becomes hidden only through authoritative collected/defeated state or ordinary frustum exit, never through an opaque foreground prop.

## Simulation coordinates versus screen presentation

Simulation remains deterministic in the unrotated X/Z plane:

| Input | Simulation delta | Converged-camera presentation |
|---|---|---|
| W / ArrowUp | `z -= speed * dt` | Toward the upper clearing |
| S / ArrowDown | `z += speed * dt` | Toward the lower clearing |
| A / ArrowLeft | `x -= speed * dt` | Toward screen left |
| D / ArrowRight | `x += speed * dt` | Toward screen right |

The camera does not remap movement. At rest:

```text
project(player + (1, 0, 0)).x > project(player).x
project(player + (-1, 0, 0)).x < project(player).x
project(player + (0, 0, -1)).y > project(player).y
project(player + (0, 0, 1)).y < project(player).y
```

Projected Y is normalized-device-coordinate Y, where larger is visually higher. Diagonals combine world axes and normalize before simulation. Simulation X/Z, never pixels or mesh transforms, determines movement, range, pursuit, collection, and persistence.

## Exact simulation contract

All distances are Euclidean in X/Z:

```text
distance(a, b) = hypot(a.x - b.x, a.z - b.z)
surfaceGap(a, b) = distance(a, b) - a.radius - b.radius
```

Equality at a threshold is in range. Y never participates.

| Rule | Exact value/behavior |
|---|---|
| Player spawn | `(x: 0, z: 4.6)`, facing `(0, -1)` |
| Arena bounds | `minX -5.6`, `maxX 5.6`, `minZ -5.2`, `maxZ 5.2` |
| Player radius | `0.45` |
| Player speed | `3.2` world units/second |
| Player clamping | Center clamped to each edge inset by `0.45` |
| Movement input | Sum aliases into X/Z, clamp axes to `[-1, 1]`, normalize above magnitude `1`; opposites cancel |
| Zombie speed | `0.95` world units/second |
| Zombie radius | Authored `enemy.radius` (`0.9` for all three) |
| Pursuit | Living zombies move directly toward player in authored order; no random motion or inter-zombie collision |
| Zombie stop | Move by at most `max(0, surfaceGap)` and never deliberately overlap player |
| Node gathering | Automatic when `surfaceGap(player, node) <= 0`; node radius `1.1` |
| Attack reach | `surfaceGap(player, enemy) <= 0.45` |
| Attack target | Smallest center distance among living in-range enemies; exact tie uses authored order |
| Attack damage/cooldown | Current saved player attack; `0.15s` after a successful in-range hit |
| Contact eligibility | `surfaceGap(player, enemy) <= 0` |
| Contact cadence | One shared timer; one or more touching enemies deal exactly `14` every `0.62s` |
| Contact stacking | Never stacks |
| Contact reset | Reset to `0` when none touch, during grace, on death, or on exit |
| Frame delta | Non-finite, zero, or negative advances nothing; positive clamps to `0.1s` inside every exported transition |

At `0.62`, emit one damage event and subtract `0.62` instead of discarding overflow. With capped delta, at most one contact event occurs per tick.

`moveCombatPlayer(state, move, dtSeconds)` returns `{ state, moved }`, clones input, changes only player position/facing, and reports movement only when position changes.

`performPlayerAttack(state, save)` returns:

```javascript
{
  state,
  save,
  events,
  attacked,
  targetId,
  reason, // 'hit' | 'cooldown' | 'outOfRange' | 'noTargets'
}
```

It emits `zombieHit` for each hit and one `defeatZombie` when HP crosses zero. Miss/cooldown mutates no HP and starts no cooldown.

`tickCombat(state, save, dtSeconds)` returns `{ state, save, events }`, clones inputs, advances cooldowns, pursues, evaluates contact, and handles death. It may emit `playerDamaged` and `playerRespawned`.

`getCombatSummary(state)` returns only serializable player pose/radius/HP, enemy ID/position/radius/HP/defeated state, counts, cooldowns, grace, deaths, and arena bounds.

### Deterministic frame order

For each active-zone animation frame:

1. Clamp delta and derive held movement.
2. Call `moveCombatPlayer()`.
3. Gather every intersecting uncollected node in authored order, once each.
4. Consume at most one queued attack and call `performPlayerAttack()`.
5. Call `tickCombat()` for pursuit/contact/death.
6. Apply events, normalize counters, and run completion once.
7. Save only for pickup, defeat, player damage/death, or completion. Movement, camera, misses, cooldown attempts, and non-defeating visuals never write.
8. Synchronize meshes and animate the player adapter.
9. Record the camera frame inputs, update camera, render Three.js, then clear/redraw transparent HUD.

A timely bonk can defeat a touching zombie before that frame's contact check.

## Input ownership

- Runtime listeners register once for `keydown`, `keyup`, `blur`, `visibilitychange`, and `resize`; full cleanup removes them.
- Only active Forest Edge owns WASD/arrows, `Space`, and `Enter`, and only then prevents defaults.
- A `Set` tracks held movement codes. Aliases combine; releasing one alias does not clear another.
- Attack keydown is accepted only with `repeat === false` and a not-already-held physical code. It sets one `attackQueued`; the next frame consumes it. Holding never auto-repeats. A new attack requires keyup then keydown.
- Blur, hidden document, every exit, and full cleanup clear movement codes, attack codes, and queue.
- `G` and `E` are ignored in Forest Edge and call no inventory, quest, reward, or save function.
- No Forest Edge key rotates or zooms the camera.

## Render synchronization, camera observation, and resize

Simulation is authoritative. In the same rendered frame:

- player X/Z equals simulation;
- living zombie X/Z equals simulation and faces travel direction;
- defeated zombies and collected nodes are hidden;
- the bounded camera observation ring contains `renderFrameId`, `previousPosition`, `desiredPositionUsed`, `actualPosition`, `lookAtTarget`, projection values, and projected world/object bounds for each of its last eight completed renders;
- the resize handler synchronously records a monotonic `resizeEventId`, requested dimensions/aspect, stable renderer/camera/scene-generation and actor IDs, save-write count, and a serialized pre/post gameplay-state hash;
- renderer runs before HUD, and HUD starts with `clearRect()`.

The record is observation-only. Its internally paired previous/desired/actual values let a browser assertion verify one exact `0.05` update even if Puppeteer samples after several animation frames.

Resize uses:

```text
width  = max(1, floor(window.innerWidth  or 960))
height = max(1, floor(window.innerHeight or 540))
renderer.setSize(width, height, false)
camera.aspect = width / height
camera.updateProjectionMatrix()
hudCanvas.width = width
hudCanvas.height = height
```

Resize does not recreate renderer, camera, scene handle, actor groups, combat state, or save; move camera; change FOV/zoom; or write. Landscape entry shows the full playable clearing. Portrait entry keeps the animal, both Wood piles, and all three fresh zombies visible while allowing decorative east/west tree-line crop.

## Save normalization and exactly-once completion

### Schema and canonical fields

The additive save schema becomes version `2` and adds `quests.rewardsClaimed: []`.

- `collectedNodes.forestEdge` is canonical for node grants.
- `quests.progress.heroSignup.wood` is derived after reconciliation.
- `quests.progress.heroSignup.tutorialZombies` is canonical for defeated tutorial zombies across reload/re-entry.
- `quests.completed` is canonical for completion.
- `quests.rewardsClaimed` is canonical for numeric/non-idempotent reward effects, especially XP.
- `ingredients.wood` remains an independent ledger; reconciliation never changes ingredients because legacy/corrupt saves lack provenance.
- Runtime positions, living HP, cooldowns, camera, and visual identities are not persisted.

### Hero Sign-Up normalization

`normalizeHeroSignupSave(save)` runs on slot load and before entry:

1. Sanitize node IDs to the two authored IDs in authored order.
2. Clamp saved Wood progress to integer `[0, 5]`.
3. Sum amounts for valid collected IDs.
4. If below saved progress, add missing IDs in authored order until meeting/exceeding it.
5. Set Wood progress to `min(5, sum(valid collected amounts))`; normal results are `0`, `2`, `3`, or `5`.
6. Clamp zombie progress to integer `[0, 3]`.
7. Seed first N authored enemies defeated/zero HP and the rest at authored spawn/HP.
8. If already completed, force `5/3`, hide nodes, seed all zombies defeated, clear erroneous active Hero Sign-Up, and set Hub.

Normalization changes metadata only. It emits no events, ingredients, XP, or feedback.

### Legacy reward reconciliation

- Completed legacy Hero Sign-Up is treated as already numerically rewarded: add its claim without XP, and repair only Wooden Club recipe, Rabbit Village unlock, `myFirstBonk` sticker, and journal entry.
- Claimed-but-not-completed marks completion, clears active Hero Sign-Up, repairs idempotent entitlements, and adds no XP.
- Normalized active `5/3` that is neither completed nor claimed runs the normal completion transaction immediately on load.

### Completion transaction

The pure transition computes `shouldGrantReward = !quests.rewardsClaimed.includes('heroSignup')`. The composition root applies the authored reward to one cloned save and writes once:

- progress `wood: 5`, `tutorialZombies: 3`;
- Hero Sign-Up once in `completed` and `rewardsClaimed`;
- `quests.active = null`;
- reward effects only when `shouldGrantReward`;
- `currentZone = 'hub'`.

Only after the write succeeds does the runtime show the banner. No intermediate persisted state exists. Reload cannot duplicate XP or ingredients. Failed write leaves pre-write save authoritative and advertises no completion.

Pickup updates collected ID, ingredients, and Wood progress in memory before one write. Defeat updates enemy state and progress before one write. Progress requires `screen === 'zone'`, `currentZone === 'forestEdge'`, and active `heroSignup`.

## Death and transition contract

Spawn is `(0, 4.6)`. Death returns each living zombie to authored X/Z while retaining HP; defeated zombies stay defeated/hidden. Nodes/progress persist. Player HP becomes max, contact/attack cooldowns become `0`, inputs clear, and grace is exactly `1.25s`.

| Trigger | Resulting screen / `currentZone` | Resources | Save behavior |
|---|---|---|---|
| Load stale Forest Edge zone | `hub` / `hub` | None | Normalize; write only if changed |
| Enter with active Hero Sign-Up and Three.js | `zone` / `forestEdge` | One scene; attach/build one player; create/snap camera | Full HP; reconcile then one entry write |
| Enter with no active quest | Caller / `hub` | None | No progress write; `Accept The Hero Sign-Up Sheet first` |
| Enter after completion | Caller / `hub` | None | No progress write; `Forest Edge is safe` |
| Enter with later quest active | Caller / `hub` | None | No progress write; `Follow your active quest marker` |
| Missing Three.js or build failure | `zoneError` / `hub` | Dispose partial ownership; no fallback cube | Persist Hub only if repairing stale zone; `Forest Edge could not start — Escape: Hub` |
| Escape | `hub` / `hub` | Clear input, dispose scene once, detach/reset player | One exit write |
| Inventory | `inventory` / `hub` | Same exit cleanup | One exit write; Inventory Escape follows Hub behavior |
| Completion | `hub` / `hub` | Clear input, dispose once, detach/reset | One final completion/reward/zone write |
| Death | `zone` / `forestEdge` | Keep scene/camera; reset spatial/animation state | One penalty/HP write; no runtime positions |
| Resize | Unchanged | Same camera/handle/model | No write |
| Blur/hidden | Unchanged | Clear input only | No write |
| Full cleanup/title | `cleaned` / persisted `hub` | Zone exit, player/cache/renderer disposal; remove listeners | One final Hub/playtime write |

Every Forest Edge screen change uses `transitionFromForestEdge(nextScreen, reason)`. Direct screen assignments may not bypass input clearing, zone correction, disposal, or save timing.

## Reachable non-quest behavior

Forest Edge remains visible/unlocked, but the encounter starts only for active `heroSignup`. Hub shortcut `F` and World Map selection share the gate and feedback above. No-quest, completed, and later-quest visits create no zombies/nodes and update no quest.

Rabbit Village and later destinations remain non-playable. Their current regression behavior is retained; no spatial systems are added.

## Explicit browser-test capability

`launchRPGGame()` accepts only this optional launch capability:

```javascript
testCapabilities: {
  allowLaterQuestAssist: true
}
```

Normal `js/game.js` supplies none, so immutable default is `false`. It is not read from debug objects, localStorage, URL parameters, or generic test-state presence. The harness injects it only for the named later-quest fixture.

When enabled, `E` may use the existing assist path only for `bunnyRescue`, `bananaEmergency`, `turtleExpress`, or `statueReveal`. It cannot assist Hero Sign-Up, collect nodes, or defeat zombies. Enabled and disabled fixtures press the same key and assert opposite later-quest outcomes; both assert no Hero Sign-Up progress.

## HUD and feedback contract

`drawZone()` starts with `clearRect()` and never calls opaque `drawBackground()`, draws an arena panel, or paints proxy actors. It draws:

- compact top objective panel (`Wood n/5`, `Zombies n/3`) with background alpha at most `0.72`;
- bottom strip with `HP`, `MOVE: WASD / ARROWS`, and `ATTACK: SPACE / ENTER`, alpha at most `0.72`;
- existing guide/dismiss affordance inside top layout;
- one short feedback label without full-screen fill;
- existing reward banner after completion in Hub.

Persistent panel rectangles are exposed serializably. At `960x540`, `1280x720`, and `390x844`, they remain inside the canvas, top/bottom do not overlap, text fits, and the central playfield remains visible.

Feedback uses simulation time and replacement:

| Event | Text | Lifetime |
|---|---|---|
| Out-of-range attack | `TOO FAR — MOVE CLOSER` | `0.9s` |
| Successful hit | `BONK!` | `0.6s` |
| Wood pickup | `FOUND 3 WOOD` / `FOUND 2 WOOD` | `1.2s` |
| Contact damage | `OUCH! -14 HP` | `0.6s` |
| Respawn | `BACK ON YOUR PAWS!` | `1.5s` |

## Test-first strategy

Implementation remains test-first:

1. Add focused unit tests for pure simulation, save normalization, camera formulas, and lighting constants; run each focused case and record its expected failure before implementation.
2. Add the composited-image browser case and run it unchanged against the current floor/cube plus opaque arena. It must fail terrain, path, actor, node, zombie, shadow/depth, HUD-alpha, and no-arena gates before scene/HUD implementation begins.
3. Add detached-scene occlusion/scale tests and focused running-game browser mechanics/lifecycle cases; observe their pre-implementation failures.
4. Implement only the minimum branch/orchestration work needed to pass the focused tests.
5. Run focused tests after each slice, then the complete regression gate.

### Focused unit acceptance

Cases prove:

- camera constants `50`, `0.1`, `150`, `18`, `14`, `0.05`, `1`;
- Forest Edge entry `(player.x, 18, player.z + 14)`, target `(player.x, 0, player.z)`, elevation `52.125° ± 0.001°`, zero X offset, north rest bearing;
- one pure follow step is exactly five percent and uses post-movement target;
- lighting/fog values equal the numeric contract and all authored caster/receiver bounds fit the shadow frustum;
- cardinal speed is `3.2` over ten `0.1s` steps, diagonals normalize, opposites cancel, facing persists, bounds include radius;
- input-to-world mapping and absence of screen coordinates in simulation;
- invalid and oversized delta behavior;
- node contact radii; distant attack no-op; nearest/tie targeting; hit/defeat/cooldown;
- zombie speed/stop; shared non-stacking cadence/reset;
- death resets spatial/cooldowns, retains live HP/objectives, applies grace once;
- pure inputs remain unmutated;
- corrupt/legacy node, zombie, completed/claimed, and active-complete save reconciliation;
- completion/reload applies XP once, repairs entitlements, sets Hub, and duplicates nothing.

## Deterministic composited-frame acceptance

### Capture and decode path

The existing no-build Puppeteer harness is sufficient; no image package or build step is added:

1. Set the viewport to one of `960x540`, `1280x720`, or `390x844` with `deviceScaleFactor: 1`.
2. Enter a fresh leopard Hero Sign-Up encounter. Wait for `document.fonts.ready`, scene generation `1`, and at least two completed render-frame records.
3. Record the current render-frame ID, read the `#game-container` client rectangle, call `page.screenshot({ type: 'png', clip })`, then record the new frame ID. A browser screenshot captures the compositor's stacked WebGL canvas plus transparent HUD canvas; neither canvas is sampled in isolation. The post-capture ID may be at most six greater than the pre-capture ID. Associate moving-object pixels with the union of the retained projected bounds from that inclusive frame interval, expanded by four pixels; static probes use their unchanged bounds. This gives screenshot/geometry alignment without pausing or mutating gameplay.
4. Pass the PNG buffer as base64 to `page.evaluate`, decode it into an `Image`, draw that image onto a scratch 2D canvas, and inspect `getImageData()`. The scratch canvas is test-only and never touches game state.
5. Save the same PNG as a failure artifact. Metadata/projection assertions may explain a failure but cannot replace any required pixel assertion.

Color classification converts screenshot RGB to HSV (`H: 0..360`, `S/V: 0..1`), uses BT.709 luminance, and treats adjacent pixels as one component with 8-connectivity. Anti-aliased boundary pixels may fall outside masks; thresholds intentionally inspect interior area rather than exact silhouettes.

### Rendered-image masks and gates

At all three entry viewports:

1. **Terrain:** excluding persistent HUD rectangles and actor/object projected bounds, forest-green pixels (`H 72..150`, `S 0.20..0.78`, `V 0.16..0.68`) occupy `35%..82%` of the central playfield (`x 8%..92%`, `y 12%..90%`), reach at least `80%` of its width and `75%` of its height, and include at least three RGB bins each covering `>= 3%`. A bin is the exact triplet `(floor(R / 32), floor(G / 32), floor(B / 32))`, giving eight levels per channel. This proves visible varied terrain, not merely a ground tag.
2. **Path:** warm-brown pixels (`H 20..55`, `S 0.25..0.78`, `V 0.25..0.82`) form a connected component occupying at least `0.8%` of the non-HUD playfield, intersect the bottom entrance band and the clearing center, and cover at least `55%` of each projected near/far path-probe quadrilateral. Rendered brown width across the near straight probe is at least `1.15` times far-probe width, proving perspective taper in pixels.
3. **Selected animal:** within the projected player envelope, a local-foreground pixel differs from the median RGB of the surrounding five-pixel ground ring by Euclidean distance `>= 28`. The largest foreground component occupies at least `12%` of the envelope and spans at least `42%` of its width and `58%` of its height. In the leopard entry fixture, orange/yellow pixels (`H 24..58`, `S >= 0.48`, `V >= 0.42`) contribute at least `max(18, round(viewportHeight * 0.035))` pixels. The visible component bounds, not only the projected envelope, must meet at least `40%` of the applicable player minimum width and `55%` of its minimum height.
4. **Both Wood nodes:** each projected node envelope independently contains a foreground component occupying at least `10%` of its area and a ribbon-yellow component (`H 38..66`, `S >= 0.52`, `V >= 0.58`) of at least `max(10, round(viewportHeight * 0.018))` pixels. Exactly two separated ribbon components map one-to-one to the authored node envelopes.
5. **All three zombies:** each projected zombie envelope independently contains a foreground component occupying at least `12%` of its area and a burgundy garment component (`H 335..360` or `H 0..22`, `S 0.25..0.82`, `V 0.18..0.68`) of at least `max(12, round(viewportHeight * 0.022))` pixels. Exactly three separated garment components map one-to-one to the three authored envelopes.
6. **Foliage:** forest-family pixels in the top perimeter band occupy at least `22%` and have luminance standard deviation at least `12`. At landscape sizes the left and right perimeter bands each also contain at least `14%` forest-family pixels. This proves a textured perimeter rather than a flat background color while allowing portrait side crop.
7. **Lighting and visible shadows:** every actor/object envelope has luminance `P90 - P10 >= 24`, median luminance in `35..220`, and no more than `8%` clipped-white pixels. A predicted ground-shadow ROI follows the fixed light slope from caster top toward world `(-X, -Z)` and is compared with two adjacent equal-area ground strips after excluding path/object pixels. At landscape sizes, the player and at least two additional casters chosen from one node, one zombie, and one trunk each have shadow-ROI median at least `8` luminance below adjacent ground and at least `12` pixels that are `>= 14` darker. Portrait requires the player plus one additional caster and at least `8` such pixels. Flags alone cannot satisfy this gate.
8. **Transparent HUD and unobscured playfield:** direct HUD-canvas alpha sampling remains diagnostic and requires pixels with alpha `>16` to cover at most `30%` of landscape and `40%` of portrait. In `x 15%..85%, y 25%..72%`, at least `90%` of HUD pixels have alpha `<=8`. Every entry actor/object pixel component above remains present in the composited screenshot, and persistent HUD rectangles overlap no more than `10%` of their projected envelopes.
9. **No opaque/debug arena:** no 4-connected HUD component with alpha `>250` may touch all four canvas edges or cover more than `8%` of the canvas; the exact legacy fills `#274f31` and `#85b26e` together occupy less than `2%` of the composited central playfield; and no RGB bin defined in gate 1 occupies more than `28%` there. Divide the central playfield into clipped `16x16` tiles. Mark a tile near-uniform when every channel's maximum minus minimum is `<= 12`; connect 4-neighbor marked tiles only when their median RGB distance is `<= 12`. No connected near-uniform tile component may cover more than `12%` of the central playfield. Combined with the required terrain/path/actor components, this fails the current arena, a replacement flat board, invisible meshes, and fallback cube.

At entry, screenshot-supported projected envelopes must meet the table in `Projected scale and entry framing`. Bounds may expand by two pixels for anti-aliasing, but the numeric min/max ranges do not change.

### Movement and extreme-position image samples

- At `960x540`, capture the running game at spawn plus the four edge midpoints and four corners reached through normal held inputs in fresh fixtures. Each sample reruns player scale, visible-foreground, lighting, shadow, HUD overlap, and viewport-margin gates. South midpoint/corners also rerun the no-foreground-occluder ray and require the upper `60%` of the screenshot-supported player component to remain present.
- Capture an entry image, move right by `1.6 ± 0.1` world units with normal input, release, wait for camera convergence within `0.01`, and capture again. The screenshot component centroid for `southCutStump` and `northTree` must move in the same horizontal direction; the near stump displacement magnitude must be at least `1.12` times the far tree's. The second frame must still pass terrain, path, player, zombie, node, shadow, and HUD masks. This proves visible perspective parallax/depth after movement rather than checking only entry metadata.

## Objective browser acceptance

In addition to the rendered-image gates:

1. Debug roles report one selected-animal root, one ground root, path roots, two visible nodes, and three visible zombies; no `runtimeCube`, proxy blocks, alternate floor/cube, or fallback group exists. Renderer reports nonzero draw/triangle counts.
2. Camera reports perspective FOV `50`, near `0.1`, far `150`, zoom `1`, correct aspect, entry position within `0.001`, look-at intersection within `0.001`, `52.125° ± 0.01°`, zero X offset, and world `-Z` rest view.
3. One completed camera record satisfies `actual = previous + (desired - previous) * 0.05` on every axis within `0.001` and looks at post-movement player. Render-frame IDs increase. After convergence, base offset/orientation returns within `0.01`. No key changes an orbit value.
4. Projected cardinal inequalities hold. W makes simulation Z negative; D makes X positive; W+D travels the same distance as W.
5. Detached-scene occlusion checks cover every defined grid point, all four animals, all objective anchors, participating-material rules, and the exact shadow-frustum containment rule.
6. Player/zombie meshes match simulation within `0.001`; hidden state changes in the same frame; mesh transforms never feed simulation/save.
7. Each live zombie approaches until contact, faces travel, and retains normal depth testing.
8. Remaining distant for more than two cadences loses no HP/gathers nothing; distant attack changes no HP; normal movement collects exactly `3` then `2`, hides matching nodes, and cannot regrant after re-entry.
9. Held attack plus synthetic repeats yields one attack; keyup/fresh press yields the next; Space and Enter share the path.
10. Normal contact death applies the penalty once, resets positions, preserves completed objectives, blocks damage for grace, keeps the same camera, and shows feedback.
11. Real movement/attacks reach `5/5` and `3/3`; one final save has completion/claim/reward/Hub; reload changes no XP, ingredients, entitlements, or actor progress.
12. Partial `Wood 3/Zombies 1` with missing IDs loads first node/enemy hidden, grants no reconciliation ingredients, and remains completable; re-entry reproduces it.
13. `G`/`E` leave Hero progress/ingredients/enemies/nodes byte-equivalent. Disabled later assist does nothing; enabled works only for named later quests and never Hero Sign-Up.
14. Escape, Inventory, completion, Three.js failure, and full cleanup produce documented screen/zone state and one disposal. Blur/hidden clears input.
15. A synchronous `resize` event dispatched and observed within one `page.evaluate` call increments `resizeEventId` once and records only renderer/HUD dimensions and camera aspect/projection changes; its pre/post gameplay hashes match, as do camera/scene/actor IDs and save-write count, before the next RAF. Real `page.setViewport` calls then prove `960x540`, `1280x720`, and `390x844` dimensions/aspect within `0.0001`, stable identities/generation/objectives/save-write count, and no reset; ordinary zombie pursuit may advance only by the elapsed capped simulation deltas. A fresh fixture at each size supplies the recaptured entry frame and passes that viewport's complete visual gates.
16. Listener registration/removal balances after cleanup. Across three launch/enter/exit/title cycles, actor counts never exceed `1/2/3`, one key causes one action, `onReturn` increments once, HUD clears, and no RAF survives.
17. Missing `window.THREE` gives `zoneError`, creates no camera/actor/fallback, shows exact failure text, and Escape returns Hub without exception/stale input.
18. Miss, pickup amounts, hit, damage, and respawn text appears and expires within one frame of specified lifetime.

The browser debug object is observation-only. It exposes serializable simulation, scene roles/IDs/visibility/positions, internally paired camera-frame records, projected bounds/probes, HUD layout/feedback, held-input counts, scene generation/disposal, and listener counts. It has no mutation/completion method and is never an assist gate.

### Regression gate

After focused cases pass, run complete RPG data-flow/browser suites, responsive Hub, repeated-mode cleanup, 2D Classic, and 3D Survivor regressions. Existing Hub, slots, guide dismissal, reward banner, alpha end card, later-quest data behavior, and Survivor camera remain green.

## Acceptance criteria

- Forest Edge is a real local forest encounter rendered through Survivor-like elevated oblique perspective, not an opaque arena or static debug view.
- Camera uses perspective `50°`, exact Forest Edge `+18Y/+14Z`, `52.125°` rest elevation, north zero-X bearing, `0.05` follow, immediate look-at, no user rotation, zoom `1`, and aspect-only resize. The negligible Survivor `0.01` ground lift is described accurately.
- Exactly one visible selected animal, two Wood nodes, and three zombies synchronize with simulation and meet screenshot-supported projected scale/framing gates.
- Composited screenshots at `960x540`, `1280x720`, and `390x844` objectively prove varied terrain, path/taper, animal, both ribboned nodes, all zombies, foliage, fixed numeric lighting, visible shadows, perspective depth/parallax, transparent HUD, and absence of opaque/debug arena.
- Finite raycast coverage plus running-game extreme screenshots prove no tall scenery occludes the player at spawn, edges, corners, or any `0.5`-grid legal position.
- World X/Z and screen presentation remain distinct; movement is deterministic/intuitive without remapping.
- Proximity collection, nearest in-range attacks, pursuit, contact-only non-stacking damage, death, and respawn obey exact numeric contracts.
- Hero Sign-Up completes only through two spatial pickups and three spatial defeats. Normal `G`/`E` cannot progress or reward it.
- Partial saves, death, re-entry, completion/reload, and legacy reconciliation duplicate nothing and leave remaining objectives available.
- Completion persists progress/reward claim/reward/Hub in one final write, disposes once, and shows the Hub banner.
- No RPG branch imports `js/3d/`; player/cache/scene ownership remains explicit and safe across resize/re-entry/relaunch.
- All lifecycle/listener/RAF cleanup paths are objectively covered.
- No fallback blocks, proxy panels, or rotating cube can appear in playable or failure routes.
- Rabbit Village and later quests remain out of scope; their assist is explicit, launch-only, named, and unable to assist Hero Sign-Up.
- Implementation is test-first: focused unit and composited-image tests are observed failing against the placeholder before production changes.

## Review resolutions and change history

### Preserved v1/v2 review resolutions

| Earlier finding | Retained v4 section |
|---|---|
| C1 forbidden scene dependency | `Architecture and dependency contract` and `Scene API` retain composition-root injection, private primitives, and explicit forbidden arrows. |
| C2 unsafe shared-resource disposal | `Selected-animal integration` and `Resource ownership and cleanup` retain separate scene, player-private, and cached-resource owners plus ordered idempotent teardown. |
| I1 underspecified spatial tuning | `Exact simulation contract` retains speeds, radii, formulas, thresholds, ties, stopping, cadence, stacking, and resets. |
| I2 undefined spatial respawn | `Death and transition contract` retains deterministic spawn/enemy reset, HP/cooldowns, preserved progress, and `1.25s` grace. |
| I3 save/screen invariants | `Save normalization and exactly-once completion` and transition table retain canonical ledgers, reconciliation, one final write, and Hub invariants. |
| I4 reachable non-quest visits | `Reachable non-quest behavior` and transition gates retain exact no-content/no-progress behavior and feedback. |
| I5 unsafe test-assist gating | `Explicit browser-test capability` retains named launch-only capability, later-quest allowlist, and Hero exclusion. |
| I6 incompatible animation API | `Selected-animal integration` retains the complete adapter plus reuse/removal/disposal. |
| I7 incomplete input/transition lifecycle | `Input ownership` and transition table retain centralized exits, repeat suppression, clearing, resize/failure/inventory/completion/cleanup, and save timing. |
| I8 non-measurable browser plan | `Deterministic composited-frame acceptance` and `Objective browser acceptance` strengthen rather than remove state, alpha, projection, resize, lifecycle, and repeated-launch coverage. |
| M1 test-first sequencing | `Test-first strategy` requires each focused pure/browser/visual case to fail first. |
| M2 vague feedback | `HUD and feedback contract` fixes text/lifetimes; browser item 18 verifies them. |
| M3 implicit return/delta behavior | `Exact simulation contract` retains return shapes and invalid/oversized delta rules. |

### v3 independent-review resolutions

| V3 review finding | Exact v4 resolution |
|---|---|
| C1 visible result not proven | `Deterministic composited-frame acceptance` captures the actual stacked WebGL+HUD compositor at all three viewports, decodes it without new dependencies, and requires screenshot terrain/path/animal/two-node/three-zombie/foliage/shadow/HUD/no-arena masks plus a post-movement parallax frame. |
| I1 lighting, fog, shadow, and scale not objective | `Numeric lighting and shadow policy` fixes colors, intensities, ownership, position/target, map/frustum/bias, and fog; `Projected scale and entry framing` fixes broad pixel envelopes; rendered-image gates 3–7 require visible size, contrast, and shadows. |
| I2 all-position occlusion not finite | `Finite occlusion and extreme-position visibility` derives anchors from world boxes, defines participating materials and hit epsilon, checks a finite `0.5` grid plus exact extrema for all animals, checks objective anchors, and adds nine running-game image samples including the south foreground. |
| I3 inaccurate mathematical-isometry alternative | `Camera approaches considered` separates true orthographic isometry (`45°`, `35.264°`, equal foreshortening) from a 45°-yaw perspective three-quarter view and explicitly states the latter is not mathematical isometry. |
| M1 overlooked Survivor ground lift | `Repository-grounded Survivor camera baseline` records the `0.01` lift, `1.0006` multiplier, approximate runtime offsets, and the intentional exact Forest Edge base-constant evaluation. |
| M2 one-frame follow observation incomplete | `Camera constants and formulas`, `Render synchronization, camera observation, and resize`, and browser item 3 expose/read a bounded ring of internally paired completed-frame records with monotonic ID, previous, desired, actual, and look-at values; exact formula also remains unit-tested. |

Change history:

- v1 established the playable first-quest direction but left 13 review findings unresolved.
- v2 resolved C1, C2, I1–I8, and M1–M3.
- The v2 human checkpoint rejected the visible overhead/static debug-arena presentation.
- v3 selected the repository-grounded Survivor-like elevated oblique perspective and preserved all v2 behavior, but its independent review found visual acceptance and several measurement details incomplete.
- v4 preserves the accepted gameplay and all 13 v2 resolutions while replacing hidden-state-only presentation acceptance with deterministic compositor pixels, fixing numeric lighting/scale/occlusion gates, correcting isometry and ground-lift language, and making the exact camera-step record observable.

## Spec self-check

- Accepted first-quest behavior and all 13 v2 technical resolutions remain present and mapped.
- Every v3 Critical, Important, and Minor finding maps to a concrete v4 section.
- The selected direction is consistently described as Survivor-like elevated oblique perspective, never as mathematical isometric projection.
- Camera source facts include the actual `0.01` Survivor lift without changing Forest Edge's exact `50 / 18 / 14 / 0.05 / zoom 1` contract.
- Every claimed visible element has a deterministic composited-screenshot mask, threshold, viewport, and failure mode; metadata is diagnostic only.
- Lighting, fog, shadow coverage, visible shadow contrast, object scale, entry framing, full-domain player occlusion, extreme positions, resize/state preservation, HUD transparency, and parallax are objectively bounded.
- No placeholder, TBD, optional implementation fork, unresolved ownership decision, or claim of an already-changed GUI remains.
- Save, simulation, input, camera, actor visibility, transition, and cleanup rules agree.
- Scope remains playable `heroSignup` at Forest Edge plus the narrowly gated existing later-quest regression assist. Later playable quests remain excluded.
- Implementation remains explicitly test-first.
