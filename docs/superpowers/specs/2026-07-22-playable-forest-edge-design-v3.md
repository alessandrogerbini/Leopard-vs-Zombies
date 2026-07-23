# Playable Forest Edge First Quest Design v3

**Date:** 2026-07-22
**Bead:** `Leopard vs Zombies-de3`
**Status:** Refined v3 — awaiting user approval

## Goal

Replace the Forest Edge placeholder panel with the playable, elevated oblique 3D encounter intended by the Animal Rescue vertical slice. Its camera, scale, depth cues, and unobstructed world presentation must read immediately like the existing Survivor gameplay view. The deliverable stops after making `The Hero Sign-Up Sheet` genuinely playable: move through one local forest clearing, automatically gather five Wood from two spatial nodes, defeat three spatial tutorial zombies, receive the existing reward once, and return to the Rescue Hub.

This v3 is an implementation-ready design correction. It does not claim that the current GUI has changed.

## Repository-grounded Survivor camera baseline

The phrase **Survivor-like isometric** in this design means the existing game's elevated oblique perspective presentation, not a mathematically isometric orthographic camera. The implementation source of truth is `js/game3d.js` plus `js/3d/constants.js`:

| Observable | Current Survivor behavior | Forest Edge v3 requirement |
|---|---|---|
| Projection | `THREE.PerspectiveCamera(50, aspect, 0.1, 150)` | Use the same projection values. |
| Base follow offset | `CAMERA_Y_OFFSET = 18`, `CAMERA_Z_OFFSET = 14`; target camera position is `(playerX, playerY + 18, playerZ + 14)` | Use the same ground-level offset with `playerY = 0`. |
| Elevation/pitch at rest | `atan2(18, 14) = 52.125°` above the ground plane; the view ray pitches downward by the same magnitude | Preserve this angle; it is neither overhead nor near-horizontal. |
| Ground-plane yaw/azimuth at rest | Camera X equals player X and camera Z is `playerZ + 14`, so it looks along world `-Z` with no 45° X/Z yaw | Preserve this north-facing bearing. Do not invent a 45° yaw and describe it as current Survivor behavior. The diagonal is the elevated Y/Z viewing ray. |
| Follow | Each render frame performs `cameraAxis += (targetAxis - cameraAxis) * CAMERA_SMOOTH_FACTOR`, where `CAMERA_SMOOTH_FACTOR = 0.05` | Use the same position update, after the authoritative simulation step. |
| Look-at | Every normal frame calls `camera.lookAt(playerX, playerY, playerZ)` | Look at the current player anchor immediately each frame; do not independently smooth the look-at target. |
| Rotation | There is no player-controlled orbit or camera rotation. At rest the bearing is fixed; while position catches up to a moving player, immediate look-at may cause a small transient orientation change | Forest Edge has no camera-rotation input and follows the same transient behavior. |
| Zoom/framing | Base perspective `zoom` remains `1`. Survivor scales the offsets only for height above ground; at ground level the scale is `1` | Forest Edge is flat and grounded, so its scale always remains `1`; there is no death zoom, height zoom, wheel zoom, or adaptive portrait zoom. |
| Resize | Renderer size changes; `camera.aspect = width / height`; `camera.updateProjectionMatrix()`; HUD dimensions change. Camera pose and gameplay state do not reset | Use the same resize behavior. |

The resulting rest camera distance is `sqrt(18² + 14²) = 22.804` world units. This is the concrete visual baseline that replaces v2's shorter `(8.6, 7.2)` camera and independent target smoothing.

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
3. The selected animal starts at the south edge, facing north. The camera snaps to the Survivor base offset, looking diagonally down into the clearing with the player as its anchor.
4. WASD or arrows move the animal through simulation X/Z space. The camera follows, while paths, actors, shadows, and tree-line parallax make depth and direction legible.
5. Reaching `forestEdge-stump-1` hides that pile, grants exactly `3 Wood`, and updates the objective to `Wood 3/5`. Reaching `forestEdge-stump-2` grants exactly `2 Wood` and updates it to `Wood 5/5`.
6. Three visible zombies pursue the player. `Space` or `Enter` bonks the nearest in-range zombie. A distant attack changes no enemy HP.
7. Only a zombie whose collision surface touches the player's collision surface contributes to the shared damage cadence. Several touching zombies do not stack damage.
8. Death keeps gathered-node and defeated-zombie progress, applies the existing ingredient penalty, resets living zombies to their authored spawn positions, and respawns the player safely with full HP and grace.
9. As soon as both objectives are complete, the existing reward is applied exactly once, the reward banner appears, and the player is back in Hub.

`G` has no Forest Edge gameplay effect. `E` has no Forest Edge gameplay effect, even in an assist-enabled test fixture.

## Camera approaches considered

### Approach A — Exact Survivor base-follow contract, locally owned by RPG (selected)

- Use the current Survivor `50°` perspective lens, `+18Y/+14Z` ground offset, `0.05` per-render-frame position smoothing, immediate look-at, fixed north bearing, and aspect-only resize.
- Put immutable Forest Edge camera values in `constants-rpg.js`; keep Three.js camera creation, update, and resize ownership in the `game-rpg.js` composition root.
- Advantages: closest observable match to Survivor; preserves W/up, S/down, A/left, and D/right presentation; frames the complete small encounter at landscape sizes; no change to Survivor code.
- Tradeoff: it is elevated oblique perspective rather than strict orthographic isometry, and the camera policy is duplicated in small form instead of extracted.

### Approach B — Extract one shared Survivor/RPG follow-camera module

- Move the current Survivor policy into a shared trunk and make both modes consume it.
- Advantages: future camera fixes cannot drift between modes; one direct contract.
- Tradeoffs: changes the established Survivor runtime and expands this first-quest task into a cross-mode refactor with additional regression risk and resource ownership work.

### Approach C — Mathematical isometric camera

- Use either an orthographic camera or a perspective camera with equal X/Z offsets and a `45°` ground-plane yaw.
- Advantages: stronger conventional diorama/isometric silhouette and more symmetric world axes.
- Tradeoffs: does not match the repository's current Survivor camera; W/A/S/D would project onto screen diagonals unless input were remapped; orthographic projection removes the Survivor perspective depth cue.

### Recommendation

Select Approach A. The checkpoint asks for Forest Edge to look and play like Survivor mode, so repository fidelity, intuitive existing controls, and narrow implementation risk outweigh mathematical isometry or camera refactoring. The code and tests must call the result “Survivor-like elevated oblique perspective” and must not claim that current Survivor has a 45° ground-plane yaw.

## Architecture and dependency contract

### Trunks and composition root

- `js/rpg/constants-rpg.js` remains the stable content/configuration trunk. It owns authored node/enemy definitions, the numeric Forest Edge simulation constants, and immutable `FOREST_EDGE_CAMERA` values matching the table above.
- `js/game-rpg.js` is the composition root. It may import capability branches, inject their dependencies, translate their plain return values, and decide when to save or transition screens. It owns the Three.js renderer/camera and is the only module allowed to wire the RPG scene branch to the existing 3D player-model branch.
- Save objects and serializable view models are the trunk-owned data ports between pure RPG branches. An opaque Three.js handle never crosses into combat, inventory, quest, save, or HUD code.

### Branches

- `js/rpg/combat-rpg.js`: pure spatial movement, targeting, pursuit, contact damage, death, and serializable summaries.
- `js/rpg/inventory.js`: pure node collection and ingredient/id bookkeeping.
- `js/rpg/quest-system.js`: quest progress normalization, completion state, and reward-claim ledger.
- `js/rpg/forest-edge-scene.js`: player-independent Three.js ground, paths, scenery, node, and zombie visuals.
- `js/rpg/hud-rpg.js`: transparent zone overlays from a supplied view model.
- `js/3d/player-model.js` plus `js/3d/utils.js`: the existing selected-animal visual branch and its shared geometry/material caches.

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

For a grounded player `(px, 0, pz)`:

```text
desiredPosition = (px, 18, pz + 14)
lookAtTarget     = (px, 0, pz)
nextPosition     = currentPosition
                 + (desiredPosition - currentPosition) * 0.05
```

Entry snaps `currentPosition` to `desiredPosition` before the first render. Every later render applies the formula once, then calls `lookAt(lookAtTarget)`. Camera update happens after simulation and actor synchronization, so its target uses the same post-movement player coordinates rendered that frame.

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

The build function tags root groups with stable `userData.rpgRole` values (`forestGround`, `forestPath`, `forestScenery`, `woodNode`, and `tutorialZombie`) and node/enemy IDs. If construction throws, it disposes its partially populated ownership sets before rethrowing. `disposeForestEdgeScene()` is idempotent: the first call removes its roots, disposes each owned resource once, marks the handle disposed, and returns `true`; later calls do nothing and return `false`.

### Selected-animal integration

The composition root calls the existing `buildPlayerModel(animal.id, runtimeScene)` directly. `forest-edge-scene.js` never receives the concrete `PlayerModel`.

The existing `animatePlayer()` is reused with this exact read-only adapter:

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

Its `len`, `mx`, and `mz` arguments are the normalized movement magnitude and the combat player's current facing vector. This supplies every `st.*` field read by `animatePlayer()` and does not fabricate a Survivor state.

One player model is built lazily on the first successful Forest Edge entry. On ordinary zone exit its group is detached, animation transforms are reset, and the model is retained for re-entry; re-entry reattaches that same group and never builds a duplicate. A targeted `disposePlayerModel()` API is added within `js/3d/player-model.js` so that the branch which allocates mixed cached/private resources also owns their destruction.

### Resource ownership and cleanup

| Resource | Owner | Lifetime | Exit/full-cleanup rule |
|---|---|---|---|
| WebGL renderer, base scene, perspective camera, lights | `game-rpg.js` | Full RPG runtime | Renderer disposed once on full cleanup; scene/camera references cleared |
| Ground, paths, scenery, nodes, zombie meshes | `forest-edge-scene.js` | One active Forest Edge encounter | Explicit handle disposal on every zone exit; no scene traversal |
| Selected player group | `3d/player-model.js`, wired by `game-rpg.js` | Reused across Forest Edge re-entries in one RPG runtime | Detach/reset on zone exit; `disposePlayerModel()` on full cleanup |
| Player-private geometries/materials | `3d/player-model.js` | Full RPG runtime | Returned in private ownership sets and disposed once by `disposePlayerModel()` |
| Cache-backed box geometries/materials | `3d/utils.js` | Full RPG runtime | Never disposed by zone/player traversal; `clearCaches()` once after player disposal on full cleanup |
| HUD pixels and runtime listeners | `game-rpg.js` | Full RPG runtime | HUD cleared and all registered listeners removed once on full cleanup |

`buildPlayerModel()` records only non-cached resources it creates, such as sphere and wing geometries/materials, in its private ownership sets. Cached `box()` geometry and cached materials are excluded. Full RPG cleanup uses ownership-aware destructors in this order: exit active Forest Edge, dispose the retained player model, clear the shared 3D caches, clear base scene references, then dispose the renderer. It does not recursively dispose `runtimeScene`. Only one external mode runs at a time, so cache clearing cannot invalidate a simultaneously active Survivor runtime.

## Forest scene and presentation contract

### Local forest composition

- The visual ground is a flat, irregularly colored grassy patch at `y = 0` that extends beyond the simulation rectangle. The simulation bounds remain `x: -5.6..5.6`, `z: -5.2..5.2`; no rectangular wall, opaque board, or arena border is drawn.
- A warm dirt path at `y = 0.01` enters from the south around `(0, 5.2)`, runs north through the clearing, and forks toward both authored Wood nodes. The path is a depth cue and has no collision or simulation authority.
- The two Wood piles appear at their authored coordinates `(-1.8, -1.1)` and `(1.6, -0.8)`. Each reads as a small stump/log pile with a yellow rescue ribbon, not a lettered debug block.
- The three tutorial zombies appear at their authored spawn coordinates `(-1.2, -1.4)`, `(1.3, -1.0)`, and `(0.1, 1.4)`. Their full bodies, silhouettes, facing, and contact approach remain readable at the Survivor camera distance.
- The selected animal uses the existing voxel model at the authoritative player coordinate, not the rotating fallback cube.
- Tall trees and dense canopy frame the west, east, and north outside the playable bounds. The south camera-facing entrance uses low shrubs, rocks, and cut stumps so foreground canopy cannot cover the player.
- Small rocks, mushrooms, grass clumps, and fallen branches may decorate only outside authored travel lanes and actor spawn/contact circles. They have no collision and cannot resemble a collectible.
- The scene background and light fog use forest colors, but fog begins beyond the complete encounter so neither node nor any legal actor position can be fog-hidden.

### Lighting, shadows, and depth

- The RPG renderer enables shadow maps with `THREE.PCFShadowMap`, matching Survivor's shadow-capable presentation.
- One hemisphere light provides sky/ground separation. One directional light sits diagonally above the clearing, casts shadows, and targets the player/clearing.
- Ground, path, and stable scenery receive shadows. The selected animal, Wood piles, zombies, tree trunks, and canopies cast shadows. Shadows must visibly offset toward one screen side so height reads in a still frame.
- Normal WebGL depth testing remains enabled. HUD transparency, perspective size change, overlap, shadows, and tree-line parallax provide depth; no fake opaque arena layer is permitted.

### Visibility and occlusion

- Low ground/path decoration may never extend above the selected animal's knees.
- No tall opaque scenery may be placed inside the simulation bounds or the camera-to-bounds foreground corridor.
- Because camera rotation is fixed, authored scenery is the occlusion solution: from the entry pose and from every legal player X/Z coordinate, a ray from the camera to the player's upper-body anchor has no `forestScenery` hit before the player. The same rule applies to each visible node and living zombie at its authored spawn.
- Dynamic actors may naturally overlap one another under normal depth testing, but no scenery material is allowed to force `depthTest: false` and no actor is rendered as a HUD sprite.
- A node or zombie becomes invisible only when its authoritative collected/defeated state says so, or when it is naturally outside the camera frustum during ordinary play. At landscape entry, the player, both nodes, and all three zombies are in the frustum. At portrait entry, the player and at least one uncompleted objective are in the frustum.

## Simulation coordinates versus screen presentation

Simulation remains deterministic in an unrotated world X/Z plane:

| Input | Simulation delta | Rest-camera presentation |
|---|---|---|
| W / ArrowUp | `z -= speed * dt` | Toward the upper part of the clearing |
| S / ArrowDown | `z += speed * dt` | Toward the lower part of the clearing |
| A / ArrowLeft | `x -= speed * dt` | Toward screen left |
| D / ArrowRight | `x += speed * dt` | Toward screen right |

The camera does not remap movement. For the rest pose, projecting points through the actual camera must satisfy:

```text
project(player + (1, 0, 0)).x > project(player).x
project(player + (-1, 0, 0)).x < project(player).x
project(player + (0, 0, -1)).y > project(player).y
project(player + (0, 0, 1)).y < project(player).y
```

Here projected Y is normalized-device-coordinate Y, where larger is visually higher. Diagonal inputs combine the same world axes and are normalized before simulation. Camera follow may keep the player near the visual anchor; the world and objectives move around that anchor. Simulation X/Z, never screen pixels or mesh transforms, determines movement, range, pursuit, collection, and persistence.

## Exact simulation contract

All distances are Euclidean in the X/Z plane:

```text
distance(a, b) = hypot(a.x - b.x, a.z - b.z)
surfaceGap(a, b) = distance(a, b) - a.radius - b.radius
```

An equality at a threshold counts as in range. Y never participates.

| Rule | Exact value/behavior |
|---|---|
| Player spawn | `(x: 0, z: 4.6)`, facing `(0, -1)` |
| Arena bounds | `minX -5.6`, `maxX 5.6`, `minZ -5.2`, `maxZ 5.2` |
| Player radius | `0.45` world units |
| Player speed | `3.2` world units/second |
| Player clamping | Player center is clamped to each arena edge inset by `0.45` |
| Movement input | Sum held aliases into X/Z, clamp each axis to `[-1, 1]`, normalize when magnitude exceeds `1`; opposite keys cancel |
| Zombie speed | `0.95` world units/second |
| Zombie radius | Authored `enemy.radius` (`0.9` for all three tutorial zombies) |
| Pursuit | Every living zombie moves directly toward the current player in authored array order, with no random motion or inter-zombie collision |
| Zombie stop | Move by at most `max(0, surfaceGap)` so the zombie stops at surface contact and never deliberately overlaps the player |
| Node gathering | Automatic when `surfaceGap(player, node) <= 0`, using authored node radius `1.1` |
| Attack reach | `surfaceGap(player, enemy) <= 0.45` |
| Attack target | Smallest planar center distance among living in-range enemies; an exact tie uses authored enemy array order |
| Attack damage/cooldown | Current saved player attack; `0.15` seconds after a successful in-range attack |
| Contact eligibility | `surfaceGap(player, enemy) <= 0` |
| Contact cadence | One shared timer; while one or more enemies touch, deal exactly `14` damage every `0.62` seconds |
| Contact stacking | Never stacks; one or three touching zombies still deal `14` per cadence |
| Contact reset | Immediately reset timer to `0` when none touch, during grace, on death, or on zone exit |
| Frame delta | Non-finite, zero, or negative delta advances nothing; positive delta is clamped to `0.1` seconds inside every exported transition |

When the shared contact timer reaches `0.62`, one damage event is emitted and `0.62` is subtracted from the timer rather than discarding fractional overflow. Because delta is capped at `0.1`, at most one contact-damage event can occur in one tick.

`moveCombatPlayer(state, move, dtSeconds)` returns `{ state, moved }`. It clones its input, applies only player position/facing, and reports `moved: true` only if position changed.

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

It emits `zombieHit` for every successful hit and exactly one `defeatZombie` when HP crosses to zero. A miss and cooldown attempt mutate no HP and start no cooldown.

`tickCombat(state, save, dtSeconds)` returns `{ state, save, events }`. It advances cooldowns, pursues, evaluates the shared contact cadence, and handles death. It may emit `playerDamaged` and `playerRespawned`. It clones both inputs.

`getCombatSummary(state)` returns only serializable values: complete player pose/radius/HP, each enemy's id/position/radius/HP/defeated state, aggregate counts, cooldowns, grace, deaths, and arena bounds.

### Deterministic frame order

For each active-zone animation frame, `game-rpg.js` performs:

1. Clamp delta and derive the held movement vector.
2. Call `moveCombatPlayer()`.
3. Gather every intersecting uncollected node in authored order; process each node at most once.
4. Consume at most one queued attack and call `performPlayerAttack()`.
5. Call `tickCombat()` for pursuit/contact/death.
6. Apply emitted events, normalize quest counters, and run completion once.
7. Save if and only if the frame produced a save-worthy event: pickup, defeat, player damage/death, or completion. Movement, camera updates, misses, cooldown attempts, and non-defeating hit visuals never write.
8. Synchronize node/zombie/player meshes and animate the player adapter.
9. Update the camera from post-simulation player coordinates, render Three.js, and draw the transparent HUD.

This ordering lets a timely bonk defeat a touching zombie before that frame's contact check.

## Input ownership

- Runtime listeners are registered once for `keydown`, `keyup`, `blur`, `visibilitychange`, and `resize`. They remain attached while the RPG runtime owns the canvases and are removed by full cleanup.
- Only an active Forest Edge screen owns WASD/arrows, `Space`, and `Enter`; only then are their browser defaults prevented.
- Keydown/keyup maintain a `Set` of held movement codes. Movement aliases are combined, so releasing one alias does not clear another held alias.
- Attack keydown is accepted only when `event.repeat === false` and that physical code is not already held. It sets one boolean `attackQueued`; the next frame consumes and clears it. Holding a key through multiple cooldowns never attacks again. A new attack requires keyup followed by a fresh keydown.
- `blur`, `visibilitychange` to hidden, every Forest Edge exit, and full cleanup clear held movement codes, held attack codes, and `attackQueued`.
- `G` is ignored in Forest Edge. `E` is ignored in Forest Edge. Neither calls inventory, quest, reward, or save functions.
- No Forest Edge key rotates or zooms the camera.

## Render synchronization and responsive framing

Simulation state is authoritative. In the same frame:

- player group X/Z equals simulation player X/Z;
- each living zombie group X/Z equals its corresponding simulation X/Z and faces its movement direction;
- a defeated zombie group is hidden;
- a collected node group is hidden;
- camera debug desired position, actual position, look-at target, projection values, and aspect reflect the post-movement frame;
- the renderer runs before the HUD is redrawn, and the HUD begins with `clearRect()`.

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

It does not recreate the renderer, camera, scene handle, actor groups, combat state, or save; it does not move the camera, change FOV/zoom, or write a save. Landscape framing shows the complete playable clearing on entry. Portrait may crop decorative east/west tree line, but not the player and all nearest uncompleted objectives.

## Save normalization and exactly-once completion

### Schema and canonical fields

The additive save schema becomes version `2` and adds `quests.rewardsClaimed: []`.

- `collectedNodes.forestEdge` is canonical for whether each Wood node may grant ingredients again.
- `quests.progress.heroSignup.wood` is a derived objective counter after reconciliation.
- `quests.progress.heroSignup.tutorialZombies` is canonical for how many tutorial zombies are defeated across reload/re-entry.
- `quests.completed` is canonical for quest completion.
- `quests.rewardsClaimed` is canonical for whether numeric/non-idempotent reward effects, especially XP, have already been applied.
- `ingredients.wood` remains an independent inventory ledger. Reconciliation never adds or removes ingredients because old/corrupt saves do not record ingredient provenance.
- Runtime positions, living-zombie HP, cooldowns, camera state, and visual identities are never persisted.

### Hero Sign-Up normalization

`normalizeHeroSignupSave(save)` is a pure quest-system transition invoked on slot load and before Forest Edge entry:

1. Sanitize Forest Edge collected IDs to the two authored IDs and preserve authored order.
2. Clamp saved Wood progress to an integer in `[0, 5]`.
3. Sum amounts for valid collected IDs.
4. If that sum is below saved progress, add still-missing node IDs in authored order until the sum meets or exceeds it.
5. Set Wood progress to `min(5, sum(valid collected node amounts))`. Normal saves remain exactly `0`, `2`, `3`, or `5`; corrupt progress advances to the smallest safely represented milestone.
6. Clamp zombie progress to an integer in `[0, 3]`.
7. Seed the first N enemies in authored order as `defeated: true`, `hp: 0`; seed all others at authored HP/spawn; set `defeatedEnemies` to N.
8. If `heroSignup` is already in `quests.completed`, force progress to `5/3`, hide both nodes, seed all zombies defeated, clear an erroneous active `heroSignup`, and set `currentZone` to `hub`.

Normalization changes metadata only. It never emits pickup/defeat events, grants ingredients, grants XP, or shows feedback.

### Legacy reward reconciliation

- A legacy save that already lists `heroSignup` in `quests.completed` is treated as already numerically rewarded: normalization adds `heroSignup` to `rewardsClaimed` without adding XP.
- It repairs only idempotent entitlements from the authored reward: Wooden Club recipe, Rabbit Village unlock, `myFirstBonk` sticker, and the Hero Sign-Up journal entry.
- If `rewardsClaimed` contains `heroSignup` but `completed` does not, normalization marks it completed, clears an active `heroSignup`, repairs those idempotent entitlements, and does not add XP.
- If the active quest has normalized progress `5/3` but is neither completed nor claimed, slot load runs the normal completion transaction immediately.

### Completion transaction

The pure quest completion transition determines `shouldGrantReward = !quests.rewardsClaimed.includes('heroSignup')` and returns the claimed/completed quest state plus the authored reward. The composition root applies that reward to the same cloned save through the existing pure reward helpers and produces one final save:

- progress exactly `wood: 5`, `tutorialZombies: 3`;
- `heroSignup` present once in `completed`;
- `heroSignup` present once in `rewardsClaimed`;
- `quests.active = null`;
- existing reward effects applied only when `shouldGrantReward` is true;
- `currentZone = 'hub'`.

`game-rpg.js` writes that final save once, then shows the runtime reward banner. There is no persisted intermediate state between completion, reward, and Hub return. Reloading the final save cannot grant XP or ingredients again. If a write fails, the UI does not advertise completion and the pre-write save remains authoritative.

Node pickup updates its collected ID, ingredient amount, and Hero Wood progress in one in-memory save before one write. Zombie defeat updates enemy state and Hero progress before one write. Progress handlers require all three conditions: `screen === 'zone'`, `currentZone === 'forestEdge'`, and `quests.active === 'heroSignup'`.

## Death and transition contract

The Forest Edge player spawn is `(0, 4.6)`. On death, every still-living zombie returns to its authored spawn X/Z but retains current HP; defeated zombies remain defeated and hidden. Nodes and quest progress remain collected/completed. Player HP becomes max HP, contact and attack cooldowns reset to `0`, held/queued input clears, and grace becomes exactly `1.25` seconds. No contact damage can occur during grace.

| Trigger | Resulting screen / `currentZone` | Encounter/player resources | Save behavior |
|---|---|---|---|
| Slot load with stale `currentZone: forestEdge` | `hub` / `hub` | None active | Normalize partial progress and write only if normalized data changed |
| Enter Forest Edge with active `heroSignup` and Three.js ready | `zone` / `forestEdge` | Build one scene handle; attach/build exactly one player; create/snap Survivor-like camera | Full HP on entry; reconcile, then one entry write |
| Enter with no active quest | Stay on caller screen / `hub` | No encounter created | No progress write; show `Accept The Hero Sign-Up Sheet first` |
| Enter after Hero Sign-Up completion | Stay on caller screen / `hub` | No encounter created | No progress write; show `Forest Edge is safe` |
| Enter while a later quest is active | Stay on caller screen / `hub` | No encounter created | No progress write; show `Follow your active quest marker` |
| Missing Three.js or scene/player-build failure | `zoneError` / `hub` | Dispose any partial scene handle and partial player-owned resources; no player attached; no fallback cube | Persist `hub` only if correcting stale zone; show `Forest Edge could not start — Escape: Hub` |
| `Escape` from Forest Edge | `hub` / `hub` | Clear input, dispose scene once, detach/reset player | One exit write |
| `I` from Forest Edge | `inventory` / `hub` | Clear input, dispose scene once, detach/reset player | One exit write; Escape from inventory follows existing Hub behavior |
| Quest completion | `hub` / `hub` | Clear input, dispose scene once, detach/reset player | One final completion/reward/zone write |
| Player death | `zone` / `forestEdge` | Keep scene/camera; reset player/living-zombie positions and animation | One penalty/HP write; runtime positions remain unsaved |
| Resize | Unchanged / unchanged | Keep same camera/handle/model; update sizes, aspect, projection | No save |
| Blur or hidden document | Unchanged / unchanged | Clear held and queued input only | No save |
| Full cleanup/return to title from Forest Edge | `cleaned` / persisted `hub` | Run zone exit, player disposal, cache clear, renderer disposal; remove every listener | One final save after setting Hub and flooring playtime |

All Forest Edge screen changes use one `transitionFromForestEdge(nextScreen, reason)` path. Direct `screen = ...` assignments may not bypass input clearing, `currentZone` correction, scene disposal, or save timing.

## Reachable non-quest behavior

Forest Edge remains visible and unlocked on the World Map, but the playable encounter starts only for an active `heroSignup`. Direct Hub shortcut `F` and World Map selection apply the same gate and feedback described in the transition table. A no-quest, completed-quest, or later-quest visit creates no zombies or collectible nodes and cannot update any quest. This is a guard against progress corruption, not a playable post-quest zone.

Rabbit Village and all later quest destinations remain non-playable in this design. Their existing regression behavior is retained; no spatial systems are added to them.

## Explicit browser-test capability

`launchRPGGame()` accepts this optional launch-only capability object:

```javascript
testCapabilities: {
  allowLaterQuestAssist: true
}
```

Normal `js/game.js` supplies no `testCapabilities`, so the internal capability defaults to immutable `false`. It is not read from `window.__rpgDebug`, `window.__lvzTestState`, localStorage, URL parameters, or generic test-state presence. The browser harness enables it only by intercepting the RPG launch call for the specific later-quest fixture.

With the capability enabled, `E` may call the existing assist path only when the active quest is one of `bunnyRescue`, `bananaEmergency`, `turtleExpress`, or `statueReveal`. It cannot assist `heroSignup`, collect Forest Edge nodes, or defeat Forest Edge zombies. The later-quest fixture starts from a normalized save in which Hero Sign-Up and its existing reward are already recorded. The disabled fixture and enabled fixture press the same `E` key and assert opposite later-quest outcomes; both assert that `E` cannot advance Hero Sign-Up.

## HUD and feedback contract

`drawZone()` begins with `clearRect()` and never calls the opaque shared `drawBackground()`, draws an arena panel, or paints proxy actor blocks. It draws:

- a compact top objective panel (`Wood n/5`, `Zombies n/3`) with background alpha at most `0.72`;
- a bottom status strip with `HP`, `MOVE: WASD / ARROWS`, and `ATTACK: SPACE / ENTER`, background alpha at most `0.72`;
- the existing guide/dismiss affordance inside the top layout;
- one short feedback label with no full-screen fill;
- the existing reward banner after completion on the Hub screen.

The zone HUD layout function exposes persistent panel rectangles in the serializable debug view. At `960x540`, `1280x720`, and `390x844`, every persistent rectangle is inside the canvas, top and bottom panels do not overlap, text fits its rectangle, and the central forest playfield remains visible.

Feedback uses simulation time and replacement rather than an unbounded queue:

| Event | Text | Lifetime |
|---|---|---|
| Out-of-range attack | `TOO FAR — MOVE CLOSER` | `0.9s` |
| Successful hit | `BONK!` | `0.6s` |
| Wood pickup | `FOUND 3 WOOD` or `FOUND 2 WOOD` | `1.2s` |
| Contact damage | `OUCH! -14 HP` | `0.6s` |
| Respawn | `BACK ON YOUR PAWS!` | `1.5s` |

## Test-first strategy

Every behavior change starts with a focused failing test. Pure simulation/save/camera-contract tests are written and observed failing before implementation; focused browser cases are then written and observed failing against the placeholder before scene, camera, HUD, and orchestration work. Only after focused tests pass are full regression suites run.

### Focused unit acceptance

Add Forest Edge simulation, normalization, and camera-contract cases that prove:

- the camera constants equal `50`, `0.1`, `150`, `18`, `14`, `0.05`, and `1`;
- the entry formula produces `(player.x, 18, player.z + 14)`, targets `(player.x, 0, player.z)`, has `52.125° ± 0.001°` ground elevation, zero X offset, and fixed north rest bearing;
- one follow step changes each position axis by exactly five percent of its remaining difference and the target uses current post-movement player coordinates;
- cardinal movement is `3.2` units/second over ten `0.1`-second steps, diagonals are normalized, opposite keys cancel, facing follows last nonzero movement, and bounds include player radius;
- W/Up maps to `-Z`, S/Down to `+Z`, A/Left to `-X`, and D/Right to `+X`; screen coordinates never enter the simulation transition;
- zero, negative, non-finite, and oversized deltas follow the exact validation/clamp rule;
- node contact uses player plus authored node radius;
- distant attacks return `outOfRange` without HP/cooldown changes;
- nearest in-range selection and authored-order tie-breaking are deterministic;
- hit/defeat events and the `0.15`-second cooldown occur exactly once;
- zombies approach at `0.95` units/second and stop at surface contact;
- contact resets when separated, deals `14` every `0.62` seconds, and never stacks;
- death resets spatial state/cooldowns, retains live HP and objective state, enforces `1.25` seconds of grace, and emits one respawn event;
- all transitions leave input state and save arguments unmutated;
- `Wood 3/no IDs`, `Wood 5/no IDs`, `Zombies 1`, out-of-range counters, completed/claimed mismatches, and completed-objective active saves reconcile exactly as specified;
- completion/reload applies XP once, repairs idempotent entitlements, sets Hub, and cannot duplicate ingredients or rewards.

### Objective browser acceptance

Focused browser cases must prove:

1. **Actual forest scene, not fallback blocks:** on a fresh encounter, debug tags report exactly one selected-animal root, one ground root, at least one path root, two total/visible Wood nodes, and three total/visible tutorial zombies. There is no `runtimeCube`, rotating hero cube, lettered zombie block, opaque arena rectangle, or alternate floor/cube fallback. The rendered scene reports a nonzero draw/triangle count beyond base lights/background.
2. **Exact camera projection and rest orientation:** debug reports a perspective camera with FOV `50`, near `0.1`, far `150`, zoom `1`, and aspect equal to canvas width/height. On entry, actual position equals `(player.x, 18, player.z + 14)` within `0.001`, the look-at ray intersects the player anchor within `0.001`, elevation is `52.125° ± 0.01°`, X offset is `0 ± 0.001`, and the view points toward world `-Z`.
3. **Follow and fixed rotation policy:** after player movement, one rendered frame places each camera axis at `previous + (desired - previous) * 0.05` within `0.001` and immediately looks at the post-movement player. No movement key changes a camera orbit angle; after the player stops and follow converges, the base offset/orientation returns within `0.01`.
4. **Projected world directions:** projecting one-unit ground points around the rest target satisfies the four inequalities in `Simulation coordinates versus screen presentation`. W changes simulation Z negatively and makes a stationary northern objective approach the player anchor from the upper playfield; D changes X positively. A W+D interval travels the same planar distance as W alone.
5. **Measurable HUD transparency and scene visibility:** on a 16-pixel sample grid, HUD pixels with alpha greater than `16` cover at most `30%` of landscape and `40%` of portrait. In central `x: 15%-85%, y: 25%-72%`, at least `90%` of samples have alpha at most `8`. WebGL actor/object projections in that region remain visible behind transparent HUD pixels.
6. **Forest composition and depth cues:** the entry frame contains grassy ground, dirt path, perimeter tree/scenery tags, both ribboned Wood nodes, all three zombies, the selected animal, and cast/received shadow flags. Actor upper-body/node rays have no scenery occluder before their targets. The player and all objectives are inside the landscape frustum.
7. **Player and object synchronization:** player mesh X/Z matches simulation within `0.001`; every live zombie mesh matches simulation within `0.001`; defeated zombie and collected-node visibility changes in the same frame as authoritative state. No mesh transform feeds back into simulation or save data.
8. **Zombie synchronization:** over time each live zombie's planar distance to the player decreases until contact; each faces its travel direction; normal depth testing remains enabled.
9. **Spatial-only effects:** remaining distant for more than two contact cadences loses no HP and gathers nothing; distant attack preserves all HP; walking to each authored node grants exactly `3` then `2`, hides the matching mesh, and never grants again after exit/re-entry.
10. **Attack input:** a held attack key and synthetic repeat keydowns produce one attack; keyup plus a fresh press produces the next. `Space` and `Enter` follow the same path.
11. **Death:** forced normal contact death shows the penalty once, resets player/living-zombie positions, preserves completed nodes/enemies, blocks damage throughout grace, preserves the same camera instance, and shows respawn feedback.
12. **Completion/reload:** real movement and attacks reach `5/5` and `3/3`; one final save contains completed/claimed/reward/current-zone state; Hub shows the banner; reload changes neither XP, ingredients, entitlements, nor actor progress.
13. **Partial saves:** Wood `3/5` plus Zombies `1/3` with missing node IDs loads with the first node and first zombie hidden, counters seeded, no ingredient grant during reconciliation, and enough remaining content to complete. Escape/re-entry reproduces the same state.
14. **Shortcut/capability safety:** normal `G` and `E` leave Forest Edge save/debug state byte-for-byte equivalent for progress/ingredients/enemies/nodes. Disabled later-quest assist does nothing; explicitly enabled later-quest assist works only for named later quests; enabled `E` still cannot advance Hero Sign-Up.
15. **Every lifecycle path:** Escape, Inventory, completion, Three.js failure, and full cleanup each produce the documented screen/currentZone state and exactly one scene disposal. Blur/hidden clears held movement and attack.
16. **Responsive resize:** at `960x540`, `1280x720`, and `390x844`, renderer and HUD dimensions match the viewport and camera aspect matches within `0.0001`. Camera object identity, position, FOV, zoom, scene generation, actor identities, simulation coordinates, HP, objective state, and save-write count remain unchanged. Landscape shows the full encounter; portrait shows the player and at least one nearest uncompleted objective.
17. **Listener and repeat-launch cleanup:** the harness wraps listener registration/removal and observes balanced RPG-owned handler identities after cleanup. Across three launch/enter/exit/title cycles, actor counts never exceed `1/2/3`, one key press causes one action, `onReturn` increments once per cycle, HUD clears, and no stale RAF continues.
18. **Failure route:** deleting `window.THREE` before Forest Edge entry produces `zoneError`, creates no camera/actor/fallback groups, shows the exact failure message, and Escape returns to Hub without an exception or stale input.
19. **Feedback:** miss, each pickup amount, hit, damage, and respawn text appears and expires within one frame of its stated lifetime.

The browser debug object is observation-only. It exposes serializable simulation positions, scene roles/IDs/visibility/positions, camera type/projection/position/desired-position/look-at target, projected test points, HUD layout, feedback, held-input counts, active scene generation/disposal counts, and listener count. It provides no mutation or completion method and is never an assist gate.

### Regression gate

After focused cases pass, run the complete RPG data-flow and browser suites, responsive Hub suite, repeated-mode cleanup suite, 2D Classic regressions, and 3D Survivor regressions. Existing Hub, save-slot, guide-dismiss, reward-banner, alpha-end-card, later-quest data behavior, and Survivor camera behavior must remain green.

## Acceptance criteria

- Forest Edge is a real local forest encounter shown through the repository-grounded Survivor-like elevated oblique perspective, not an opaque arena overlay or static debug view.
- The camera uses a `50°` perspective lens, `+18Y/+14Z` base offset, `52.125°` rest elevation, north-facing zero-X bearing, `0.05` per-frame position follow, immediate player look-at, fixed user rotation, zoom `1`, and aspect-only resize.
- Exactly one selected animal, two Wood nodes, and three tutorial zombies are created for a fresh encounter and remain synchronized with authoritative simulation state.
- Grassy terrain, dirt paths, forest perimeter, ribboned Wood piles, zombies, animal model, lighting, shadows, and occlusion-safe composition remain visible beneath a measurably transparent HUD.
- World X/Z simulation and screen presentation are distinct and tested: WASD/arrows remain deterministic and visually intuitive without screen-space input or camera-relative remapping.
- Proximity gathering, nearest in-range attacks, pursuit, contact-only non-stacking damage, death, and safe respawn obey the numeric contracts above.
- The first quest can complete only through two proximity pickups and three spatial zombie defeats. Normal `G` and `E` cannot gather, defeat, complete, reward, or save progress.
- Partial saves, death, Escape/re-entry, completion/reload, and legacy completion reconcile without duplicate ingredients/rewards or missing remaining objectives.
- Completion persists progress, reward claim, reward, and Hub zone in one final write, disposes the encounter once, and shows the existing banner in Hub.
- No `js/rpg/` branch imports `js/3d/`; player/cache/scene resources have explicit, non-overlapping owners and survive resize/re-entry/repeated launch safely.
- Every Forest Edge exit and full-runtime listener/RAF cleanup is objectively covered.
- No fallback debug blocks, proxy actor panels, or rotating placeholder cube can appear in the playable or failure route.
- Rabbit Village and later quests remain out of scope; their test assist requires the explicit launch-only capability and can never assist Hero Sign-Up.

## Review resolutions and checkpoint change history

| Finding | Exact v3 resolution |
|---|---|
| C1 forbidden scene dependency | `Architecture and dependency contract` makes `game-rpg.js` the composition root; `Scene API` uses injected THREE/plain definitions and a private primitive builder, with an explicit forbidden-arrow list. |
| C2 unsafe shared-resource disposal | `Selected-animal integration` and `Resource ownership and cleanup` separate scene-owned, player-private, and cache-backed resources; zone exit and full cleanup use ordered idempotent destructors and no traversal disposal. |
| I1 underspecified spatial tuning | `Exact simulation contract` fixes all speeds, radii, formulas, thresholds, tie-breaks, stopping, cadence, stacking, and resets. |
| I2 undefined spatial respawn | `Death and transition contract` fixes spawn, live-enemy reset, HP retention, cooldown resets, preserved progress, and exact grace. |
| I3 save/screen invariants | `Save normalization and exactly-once completion` names canonical fields, reconciliation, counters, ledger, atomic completion, and Hub-zone invariants; `Death and transition contract` fixes entry/exit writes. |
| I4 reachable non-quest visits | `Reachable non-quest behavior` and `Death and transition contract` gate entry and all progress by active quest plus zone, with exact fallback messages. |
| I5 unsafe test-assist gating | `Explicit browser-test capability` names `allowLaterQuestAssist`, defines its only injection path, excludes Hero Sign-Up, and requires enabled/disabled assertions. |
| I6 incompatible animation API | `Selected-animal integration` supplies every field read by existing `animatePlayer()` and defines model reuse/removal/disposal. |
| I7 incomplete input/transition lifecycle | `Input ownership` and `Death and transition contract` centralize exits, repeat suppression, key clearing, blur/visibility, resize, failure, inventory, completion, cleanup, and save timing. |
| I8 non-measurable browser plan | `Focused unit acceptance` and `Objective browser acceptance` define alpha thresholds, role/actor counts, position epsilon, camera observables, projected directions, distant-effect windows, responsive framing, listener balance, and repeated-launch counts. |
| M1 test-first sequencing | `Test-first strategy` requires each pure/browser behavior to be observed failing before implementation and identifies focused unit/browser cases. |
| M2 vague feedback | `HUD and feedback contract` fixes messages/lifetimes; `Objective browser acceptance` item 19 verifies them. |
| M3 implicit return/delta behavior | `Exact simulation contract` gives each pure return shape and exact invalid/oversized delta behavior. |
| Human v2 checkpoint: Forest Edge does not visibly read like Survivor's isometric gameplay view | `Repository-grounded Survivor camera baseline` records actual projection, offsets, pitch, yaw, follow, look-at, zoom, resize, and rotation behavior; `Camera approaches considered` selects exact Survivor base follow; `Camera constants and formulas`, `Forest scene and presentation contract`, `Simulation coordinates versus screen presentation`, `Render synchronization and responsive framing`, and browser items 1–8 and 16 turn the correction into testable implementation requirements. |

Change history:

- v1 established the playable first-quest direction but left 13 review findings unresolved.
- v2 resolved C1, C2, I1–I8, and M1–M3; every one of those resolutions is retained above.
- The v2 human checkpoint rejected the visible overhead/static debug-arena presentation.
- v3 replaces ambiguous camera wording and v2's short custom camera with the exact current Survivor base-camera contract, adds a local forest composition/occlusion contract, separates simulation axes from screen projection, and adds objective camera/presentation/resize tests.

## Spec self-check

- All accepted first-quest behavior from v2 is retained.
- Every Critical, Important, and Minor review finding remains mapped to an exact v3 section.
- The human camera finding maps to exact source-grounded camera, scene, movement-projection, resize, and test sections.
- Projection, offsets, elevation, ground-plane yaw, follow, look-at, zoom, rotation, resize, occlusion, and HUD behavior have one testable meaning.
- No placeholder, optional implementation fork, unresolved ownership decision, or claim of already-changed GUI remains.
- Simulation, save canonicalization, actor visibility, camera synchronization, input, transition, and cleanup rules agree.
- The design remains limited to playable `heroSignup` at Forest Edge plus the narrowly gated later-quest regression assist, and implementation remains test-first.
