# Playable Forest Edge First Quest Design v2

**Date:** 2026-07-22
**Bead:** `Leopard vs Zombies-de3`
**Status:** Refined v2 — awaiting user approval

## Goal

Replace the Forest Edge placeholder panel with the playable top-down 3D encounter intended by the Animal Rescue vertical slice. The deliverable stops after making `The Hero Sign-Up Sheet` genuinely playable: move through one clearing, automatically gather five Wood from two spatial nodes, defeat three spatial tutorial zombies, receive the existing reward once, and return to the Rescue Hub.

## Approved scope

### Included

- Forest Edge while `heroSignup` is the active quest.
- One visible selected-animal model, one bounded clearing, two Wood nodes, and three chasing tutorial zombies.
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
- Hub, Quest Board, World Map, general save UX, or later-quest redesigns.
- A normal-play `G` gather action or `E` completion action.
- Replacing the existing ImageGen Hub art.

## Player experience

1. With `heroSignup` active, the player selects Forest Edge on the World Map.
2. A real Three.js clearing appears beneath a transparent HUD. The selected animal starts at the south edge, facing north.
3. WASD or arrows move the animal and a fixed-angle camera follows it.
4. Reaching `forestEdge-stump-1` hides that pile, grants exactly `3 Wood`, and updates the objective to `Wood 3/5`. Reaching `forestEdge-stump-2` grants exactly `2 Wood` and updates it to `Wood 5/5`.
5. Three visible zombies pursue the player. `Space` or `Enter` bonks the nearest in-range zombie. A distant attack changes no enemy HP.
6. Only a zombie whose collision surface touches the player's collision surface contributes to the shared damage cadence. Several touching zombies do not stack damage.
7. Death keeps gathered-node and defeated-zombie progress, applies the existing ingredient penalty, resets living zombies to their authored spawn positions, and respawns the player safely with full HP and grace.
8. As soon as both objectives are complete, the existing reward is applied exactly once, the reward banner appears, and the player is back in Hub.

`G` has no Forest Edge gameplay effect. `E` has no Forest Edge gameplay effect, even in an assist-enabled test fixture.

## Architecture and dependency contract

### Trunks and composition root

- `js/rpg/constants-rpg.js` remains the stable content/configuration trunk. It owns authored node/enemy definitions and the numeric Forest Edge simulation constants listed below.
- `js/game-rpg.js` is the composition root. It may import capability branches, inject their dependencies, translate their plain return values, and decide when to save or transition screens. It is the only module allowed to wire the RPG scene branch to the existing 3D player-model branch.
- Save objects and serializable view models are the trunk-owned data ports between pure RPG branches. An opaque Three.js handle never crosses into combat, inventory, quest, save, or HUD code.

### Branches

- `js/rpg/combat-rpg.js`: pure spatial movement, targeting, pursuit, contact damage, death, and serializable summaries.
- `js/rpg/inventory.js`: pure node collection and ingredient/id bookkeeping.
- `js/rpg/quest-system.js`: quest progress normalization, completion state, and reward-claim ledger.
- `js/rpg/forest-edge-scene.js`: player-independent Three.js ground, scenery, node, and zombie visuals.
- `js/rpg/hud-rpg.js`: transparent zone overlays from a supplied view model.
- `js/3d/player-model.js` plus `js/3d/utils.js`: the existing selected-animal visual branch and its shared geometry/material caches.

### Allowed dependency graph

```text
constants-rpg.js
  <- combat-rpg.js
  <- inventory.js
  <- quest-system.js

game-rpg.js (composition root)
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

The build function tags root groups with stable `userData.rpgRole` values (`forestGround`, `forestScenery`, `woodNode`, and `tutorialZombie`) and node/enemy IDs. If construction throws, it disposes its partially populated ownership sets before rethrowing. `disposeForestEdgeScene()` is idempotent: the first call removes its roots, disposes each owned resource once, marks the handle disposed, and returns `true`; later calls do nothing and return `false`.

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
| WebGL renderer, base scene, camera, lights | `game-rpg.js` | Full RPG runtime | Renderer disposed once on full cleanup; scene references cleared |
| Ground, path, scenery, nodes, zombie meshes | `forest-edge-scene.js` | One active Forest Edge encounter | Explicit handle disposal on every zone exit; no scene traversal |
| Selected player group | `3d/player-model.js`, wired by `game-rpg.js` | Reused across Forest Edge re-entries in one RPG runtime | Detach/reset on zone exit; `disposePlayerModel()` on full cleanup |
| Player-private geometries/materials | `3d/player-model.js` | Full RPG runtime | Returned in private ownership sets and disposed once by `disposePlayerModel()` |
| Cache-backed box geometries/materials | `3d/utils.js` | Full RPG runtime | Never disposed by zone/player traversal; `clearCaches()` once after player disposal on full cleanup |
| HUD pixels and runtime listeners | `game-rpg.js` | Full RPG runtime | HUD cleared and all registered listeners removed once on full cleanup |

`buildPlayerModel()` records only non-cached resources it creates (for example sphere geometry and wing geometry/materials) in its private ownership sets. Cached `box()` geometry and cached materials are excluded. Full RPG cleanup uses ownership-aware destructors in this order: exit active Forest Edge, dispose the retained player model, clear the shared 3D caches, clear base scene references, then dispose the renderer. It does not recursively dispose `runtimeScene`. Only one external mode runs at a time, so cache clearing cannot invalidate a simultaneously active Survivor runtime.

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
  attacked,        // true only when damage was applied
  targetId,        // attacked enemy id or null
  reason,          // 'hit' | 'cooldown' | 'outOfRange' | 'noTargets'
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
8. Synchronize node/zombie meshes, animate the player adapter, update camera, render Three.js, and draw the HUD.

This ordering lets a timely bonk defeat a touching zombie before that frame's contact check.

## Input ownership

- Runtime listeners are registered once for `keydown`, `keyup`, `blur`, `visibilitychange`, and `resize`. They remain attached while the RPG runtime owns the canvases and are removed by full cleanup.
- Only an active Forest Edge screen owns WASD/arrows, `Space`, and `Enter`; only then are their browser defaults prevented.
- Keydown/keyup maintain a `Set` of held movement codes. Movement aliases are combined, so releasing one alias does not clear another held alias.
- Attack keydown is accepted only when `event.repeat === false` and that physical code is not already held. It sets one boolean `attackQueued`; the next frame consumes and clears it. Holding a key through multiple cooldowns never attacks again. A new attack requires keyup followed by a fresh keydown.
- `blur`, `visibilitychange` to hidden, every Forest Edge exit, and full cleanup clear held movement codes, held attack codes, and `attackQueued`.
- `G` is ignored in Forest Edge. `E` is ignored in Forest Edge. Neither calls inventory, quest, reward, or save functions.

## Camera and render synchronization

On entry, the camera snaps to:

```text
position = (player.x, 8.6, player.z + 7.2)
target   = (player.x, 0.65, player.z - 1.2)
```

On later frames, position and target independently approach those offsets with `alpha = 1 - exp(-8 * dt)`. Camera orientation is fixed relative to world north; movement remains screen-readable. Resize changes renderer dimensions, HUD dimensions, camera aspect, and projection only.

Simulation state is authoritative. In the same frame:

- player group X/Z equals the simulation player X/Z;
- each living zombie group X/Z equals its corresponding simulation X/Z;
- a defeated zombie group is hidden;
- a collected node group is hidden;
- camera debug position/target reflects the post-movement player.

## Save normalization and exactly-once completion

### Schema and canonical fields

The additive save schema becomes version `2` and adds `quests.rewardsClaimed: []`.

- `collectedNodes.forestEdge` is canonical for whether each Wood node may grant ingredients again.
- `quests.progress.heroSignup.wood` is a derived objective counter after reconciliation.
- `quests.progress.heroSignup.tutorialZombies` is canonical for how many tutorial zombies are defeated across reload/re-entry.
- `quests.completed` is canonical for quest completion.
- `quests.rewardsClaimed` is canonical for whether numeric/non-idempotent reward effects, especially XP, have already been applied.
- `ingredients.wood` remains an independent inventory ledger. Reconciliation never adds or removes ingredients because old/corrupt saves do not record ingredient provenance.
- Runtime positions, living-zombie HP, cooldowns, and camera state are never persisted.

### Hero Sign-Up normalization

`normalizeHeroSignupSave(save)` is a pure quest-system transition invoked on slot load and before Forest Edge entry:

1. Sanitize Forest Edge collected IDs to the two authored IDs and preserve authored order.
2. Clamp saved Wood progress to an integer in `[0, 5]`.
3. Sum amounts for valid collected IDs.
4. If that sum is below saved progress, add still-missing node IDs in authored order until the sum meets or exceeds it. This deterministically maps progress-only legacy saves without allowing a node to grant Wood twice.
5. Set Wood progress to `min(5, sum(valid collected node amounts))`. Normal saves therefore remain exactly `0`, `2`, `3`, or `5`; corrupt progress is advanced to the smallest safely represented milestone rather than creating a softlock.
6. Clamp zombie progress to an integer in `[0, 3]`.
7. Seed the first N enemies in authored order as `defeated: true`, `hp: 0`; seed all others at authored HP/spawn; set `defeatedEnemies` to N.
8. If `heroSignup` is already in `quests.completed`, force its progress to `5/3`, hide both nodes, seed all zombies defeated, clear an erroneous active `heroSignup`, and set `currentZone` to `hub`.

Normalization changes metadata only. It never emits pickup/defeat events, grants ingredients, grants XP, or shows feedback.

### Legacy reward reconciliation

- A legacy save that already lists `heroSignup` in `quests.completed` is treated as already numerically rewarded: normalization adds `heroSignup` to `rewardsClaimed` without adding XP.
- It repairs only idempotent entitlements from the authored reward: Wooden Club recipe, Rabbit Village unlock, `myFirstBonk` sticker, and the Hero Sign-Up journal entry.
- If `rewardsClaimed` contains `heroSignup` but `completed` does not, normalization marks it completed, clears an active `heroSignup`, repairs those idempotent entitlements, and does not add XP.
- If the active quest has normalized progress `5/3` but is neither completed nor claimed, slot load runs the normal completion transaction immediately. This prevents a completed-objective reload from requiring another node/enemy or another input.

### Completion transaction

The pure quest completion transition determines `shouldGrantReward = !quests.rewardsClaimed.includes('heroSignup')` and returns the claimed/completed quest state plus the authored reward. The composition root applies that reward to the same cloned save through the existing pure reward helpers, without introducing imports between those branches, and produces one final save:

- progress exactly `wood: 5`, `tutorialZombies: 3`;
- `heroSignup` present once in `completed`;
- `heroSignup` present once in `rewardsClaimed`;
- `quests.active = null`;
- existing reward effects applied only when `shouldGrantReward` is true;
- `currentZone = 'hub'`.

`game-rpg.js` writes that final save once, then shows the runtime reward banner. There is no persisted intermediate state between completion, reward, and Hub return. Reloading the final save cannot grant XP or ingredients again. If a write fails, the UI does not advertise completion and the pre-write save remains authoritative.

Node pickup updates its collected ID, ingredient amount, and hero Wood progress in one in-memory save before one write. Zombie defeat updates enemy state and hero progress before one write. Progress handlers require all three conditions: `screen === 'zone'`, `currentZone === 'forestEdge'`, and `quests.active === 'heroSignup'`.

## Death and transition contract

The Forest Edge player spawn is `(0, 4.6)`. On death, every still-living zombie returns to its authored spawn X/Z but retains its current HP; defeated zombies remain defeated and hidden. Nodes and quest progress remain collected/completed. Player HP becomes max HP, contact and attack cooldowns reset to `0`, held/queued input clears, and grace becomes exactly `1.25` seconds. No contact damage can occur during grace.

| Trigger | Resulting screen / `currentZone` | Encounter/player resources | Save behavior |
|---|---|---|---|
| Slot load with stale `currentZone: forestEdge` | `hub` / `hub` | None active | Normalize partial progress and write only if normalized data changed |
| Enter Forest Edge with active `heroSignup` and Three.js ready | `zone` / `forestEdge` | Build one scene handle; attach/build exactly one player; snap camera | Full HP on entry; reconcile, then one entry write |
| Enter with no active quest | Stay on caller screen / `hub` | No encounter created | No progress write; show `Accept The Hero Sign-Up Sheet first` |
| Enter after Hero Sign-Up completion | Stay on caller screen / `hub` | No encounter created | No progress write; show `Forest Edge is safe` |
| Enter while a later quest is active | Stay on caller screen / `hub` | No encounter created | No progress write; show `Follow your active quest marker` |
| Missing Three.js or scene/player-build failure | `zoneError` / `hub` | Dispose any partial scene handle and partial player-owned resources; no player attached | Persist `hub` only if correcting stale zone; show `Forest Edge could not start — Escape: Hub` |
| `Escape` from Forest Edge | `hub` / `hub` | Clear input, dispose scene once, detach/reset player | One exit write |
| `I` from Forest Edge | `inventory` / `hub` | Clear input, dispose scene once, detach/reset player | One exit write; Escape from inventory follows existing Hub behavior |
| Quest completion | `hub` / `hub` | Clear input, dispose scene once, detach/reset player | One final completion/reward/zone write |
| Player death | `zone` / `forestEdge` | Keep scene; reset player/living-zombie positions and animation | One penalty/HP write; runtime positions remain unsaved |
| Resize | Unchanged / unchanged | Keep the same handle/model; update sizes/projection/camera | No save |
| Blur or hidden document | Unchanged / unchanged | Clear held and queued input only | No save |
| Full cleanup/return to title from Forest Edge | `cleaned` / persisted `hub` | Run zone exit, player disposal, cache clear, renderer disposal; remove every listener | One final save after setting Hub and flooring playtime |

All Forest Edge screen changes use one `transitionFromForestEdge(nextScreen, reason)` path. Direct `screen = ...` assignments may not bypass input clearing, `currentZone` correction, scene disposal, or save timing.

## Reachable non-quest behavior

Forest Edge remains visible and unlocked on the World Map, but the playable encounter starts only for an active `heroSignup`. Direct Hub shortcut `F` and World Map selection apply the same gate and feedback described in the transition table. A no-quest, completed-quest, or later-quest visit creates no zombies or collectible nodes and cannot update any quest. This is a guard against progress corruption, not a playable post-quest zone.

Later quest destinations retain their current non-playable regression behavior. This design adds no spatial systems to them.

## Explicit browser-test capability

`launchRPGGame()` accepts this optional launch-only capability object:

```javascript
testCapabilities: {
  allowLaterQuestAssist: true
}
```

Normal `js/game.js` supplies no `testCapabilities`, so the internal capability defaults to an immutable `false`. It is not read from `window.__rpgDebug`, `window.__lvzTestState`, localStorage, URL parameters, or generic test-state presence. The browser harness enables it only by intercepting the RPG launch call for the specific later-quest fixture.

With the capability enabled, `E` may call the existing assist path only when the active quest is one of `bunnyRescue`, `bananaEmergency`, `turtleExpress`, or `statueReveal`. It cannot assist `heroSignup`, cannot collect Forest Edge nodes, and cannot defeat Forest Edge zombies. The later-quest fixture starts from a normalized save in which Hero Sign-Up and its existing reward are already recorded. The disabled fixture and enabled fixture press the same `E` key and assert opposite later-quest outcomes; both assert that `E` cannot advance Hero Sign-Up.

## HUD and feedback contract

`drawZone()` begins with `clearRect()` and never calls the opaque shared `drawBackground()` or draws an arena panel. It draws:

- a top objective panel (`Wood n/5`, `Zombies n/3`) with background alpha at most `0.72`;
- a bottom status strip with `HP`, `MOVE: WASD / ARROWS`, and `ATTACK: SPACE / ENTER`, background alpha at most `0.72`;
- the existing guide/dismiss affordance inside the top layout;
- one short feedback label, with no full-screen fill;
- the existing reward banner after completion on the Hub screen.

The zone HUD layout function exposes persistent panel rectangles in the serializable debug view. At `960x540`, `1280x720`, and `390x844`, every persistent rectangle is inside the canvas, top and bottom panels do not overlap, text fits its rectangle, and the central playfield remains unobstructed.

Feedback uses simulation time and replacement rather than an unbounded queue:

| Event | Text | Lifetime |
|---|---|---|
| Out-of-range attack | `TOO FAR — MOVE CLOSER` | `0.9s` |
| Successful hit | `BONK!` | `0.6s` |
| Wood pickup | `FOUND 3 WOOD` or `FOUND 2 WOOD` | `1.2s` |
| Contact damage | `OUCH! -14 HP` | `0.6s` |
| Respawn | `BACK ON YOUR PAWS!` | `1.5s` |

## Test-first strategy

Every behavior change starts with a focused failing test. Pure simulation/save tests are written and observed failing before their implementation; focused browser cases are then written and observed failing against the placeholder before scene/HUD/orchestration work. Only after focused tests pass are full regression suites run.

### Focused pure tests

Add a Forest Edge simulation/normalization case that proves:

- cardinal movement is `3.2` units/second over ten `0.1`-second steps, diagonals are normalized, opposite keys cancel, facing follows last nonzero movement, and bounds include the player radius;
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

1. **Actual scene, not the old floor/cube:** on a fresh encounter, debug tags report exactly one selected-animal root, two total/visible Wood nodes, and three total/visible tutorial zombies. The rendered scene reports those groups visible and a nonzero draw/triangle count beyond base lights/background.
2. **Measurable HUD transparency:** on a 16-pixel sample grid, pixels with alpha greater than `16` cover at most `30%` of a landscape HUD and `40%` of a portrait HUD. Within the central rectangle `x: 15%-85%, y: 25%-72%`, at least `90%` of samples have alpha at most `8`.
3. **Movement/render synchronization:** holding W and a diagonal changes simulation coordinates at the specified normalized rate; player mesh X/Z matches simulation within `0.001`; camera position and target both change toward the documented offsets.
4. **Zombie synchronization:** over time each live zombie's planar distance to the player decreases until contact; every zombie mesh matches simulation within `0.001`; defeated meshes become hidden in the same frame.
5. **Spatial-only effects:** remaining distant for more than two contact cadences loses no HP and gathers nothing; distant attack preserves all HP; walking to each authored node grants exactly `3` then `2`, hides the matching mesh, and never grants again after exit/re-entry.
6. **Attack input:** a held attack key and synthetic repeat keydowns produce one attack; keyup plus a fresh press produces the next. `Space` and `Enter` follow the same path.
7. **Death:** forced normal contact death shows the penalty once, resets player/living-zombie positions, preserves completed nodes/enemies, blocks damage throughout grace, and shows respawn feedback.
8. **Completion/reload:** real movement and attacks reach `5/5` and `3/3`; one final save contains completed/claimed/reward/current-zone state; Hub shows the banner; reload changes neither XP, ingredients, entitlements, nor actor progress.
9. **Partial saves:** Wood `3/5` plus Zombies `1/3` with missing node IDs loads with the first node and first zombie hidden, counters seeded, no ingredient grant during reconciliation, and enough remaining content to complete. Escape/re-entry reproduces the same state.
10. **Shortcut/capability safety:** normal `G` and `E` leave Forest Edge save/debug state byte-for-byte equivalent for progress/ingredients/enemies/nodes. Disabled later-quest assist does nothing; explicitly enabled later-quest assist works only for the named later quests; enabled `E` still cannot advance Hero Sign-Up.
11. **Every lifecycle path:** Escape, Inventory, completion, Three.js failure, and full cleanup each produce the documented screen/currentZone state and exactly one scene disposal. Resize preserves simulation and actor identities. Blur/hidden clears held movement and attack.
12. **Listener and repeat-launch cleanup:** the harness wraps listener registration/removal and observes balanced RPG-owned handler identities after cleanup. Across three launch/enter/exit/title cycles, actor counts never exceed `1/2/3`, one key press causes one action, `onReturn` increments once per cycle, HUD clears, and no stale RAF continues.
13. **Responsive zone layout:** at `960x540`, `1280x720`, and `390x844`, persistent zone rectangles are in bounds and non-overlapping, required control/progress text is present, central transparency thresholds pass, and the selected animal plus at least one objective remains in the camera view.
14. **Failure route:** deleting `window.THREE` before Forest Edge entry produces `zoneError`, creates no actor groups, shows the exact failure message, and Escape returns to Hub without an exception or stale input.
15. **Feedback:** miss, each pickup amount, hit, damage, and respawn text appears and expires within one frame of its stated lifetime.

The browser debug object is observation-only. It exposes serializable simulation positions, scene roles/IDs/visibility/positions, camera position/target, HUD layout, feedback, held-input counts, active scene generation/disposal counts, and listener count. It provides no mutation or completion method and is never an assist gate.

### Regression gate

After focused cases pass, run the complete RPG data-flow and browser suites, responsive Hub suite, repeated-mode cleanup suite, 2D Classic regressions, and 3D Survivor regressions. Existing Hub, save-slot, guide-dismiss, reward-banner, alpha-end-card, and later-quest data behavior must remain green.

## Acceptance criteria

- Forest Edge is a real, bounded, top-down 3D quest encounter beneath a measurably transparent HUD.
- Exactly one selected animal, two Wood nodes, and three tutorial zombies are created for a fresh encounter and remain synchronized with authoritative simulation state.
- WASD/arrows, camera follow, proximity gathering, nearest in-range attacks, pursuit, contact-only non-stacking damage, death, and safe respawn obey the numeric contracts above.
- The first quest can complete only through the two proximity pickups and three spatial zombie defeats.
- Normal `G` and `E` cannot gather, defeat, complete, reward, or save progress.
- Partial saves, death, Escape/re-entry, completion/reload, and legacy completion reconcile without duplicate ingredients/rewards or missing remaining objectives.
- Completion persists progress, reward claim, reward, and Hub zone in one final write, disposes the encounter once, and shows the existing banner in Hub.
- No `js/rpg/` branch imports `js/3d/`; player/cache/scene resources have explicit, non-overlapping owners and survive resize/re-entry/repeated launch safely.
- Every Forest Edge exit and full-runtime listener/RAF cleanup is objectively covered.
- Later zones remain out of scope; their test assist requires the explicit launch-only capability and can never assist Hero Sign-Up.

## Review resolutions

| Finding | Resolution |
|---|---|
| C1 forbidden scene dependency | `Architecture and dependency contract` makes `game-rpg.js` the composition root; the scene uses injected THREE/plain definitions and a private primitive builder, with an explicit forbidden-arrow list. |
| C2 unsafe shared-resource disposal | `Selected-animal integration` and `Resource ownership and cleanup` separate scene-owned, player-private, and cache-backed resources; zone exit and full cleanup have ordered idempotent destructors and no traversal disposal. |
| I1 underspecified spatial tuning | `Exact simulation contract` fixes all speeds, radii, formulas, thresholds, tie-breaks, stopping, cadence, stacking, and resets. |
| I2 undefined spatial respawn | `Death and transition contract` fixes spawn, live-enemy reset, HP retention, cooldown resets, preserved progress, and exact grace. |
| I3 save/screen invariants | `Save normalization and exactly-once completion` names canonical fields, reconciliation, counters, ledger, atomic completion, and Hub-zone invariants; the transition table fixes entry/exit writes. |
| I4 reachable non-quest visits | `Reachable non-quest behavior` and the transition table gate entry and all progress by active quest plus zone, with exact fallback messages. |
| I5 unsafe test-assist gating | `Explicit browser-test capability` names `allowLaterQuestAssist`, defines its only injection path, excludes Hero Sign-Up, and requires enabled/disabled assertions. |
| I6 incompatible animation API | `Selected-animal integration` supplies every field read by the existing `animatePlayer()` and defines model reuse/removal/disposal. |
| I7 incomplete input/transition lifecycle | `Input ownership` and `Death and transition contract` centralize exits, repeat suppression, key clearing, blur/visibility, resize, failure, inventory, completion, cleanup, and save timing. |
| I8 non-measurable browser plan | `Objective browser acceptance` defines alpha thresholds, role/actor counts, position epsilon, camera observables, distant-effect windows, responsive rectangles, listener balance, and repeated-launch counts. |
| M1 test-first sequencing | `Test-first strategy` requires each pure/browser behavior to be observed failing before implementation and identifies the focused cases. |
| M2 vague feedback | `HUD and feedback contract` fixes messages and lifetimes; browser item 15 verifies them. |
| M3 implicit return/delta behavior | `Exact simulation contract` gives each pure return shape and exact invalid/oversized delta behavior. |

## Spec self-check

- Every Critical, Important, and Minor review finding is mapped above.
- No placeholder, optional implementation fork, or unresolved ownership decision remains.
- The numeric simulation, save canonicalization, actor visibility, input, transition, and cleanup rules agree with one another.
- The design remains limited to playable `heroSignup` at Forest Edge plus the narrowly gated later-quest regression assist.
