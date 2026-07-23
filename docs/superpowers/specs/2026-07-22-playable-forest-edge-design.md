# Playable Forest Edge First Quest Design

**Date:** 2026-07-22  
**Bead:** `Leopard vs Zombies-de3`  
**Status:** Approved design awaiting written-spec review

## Goal

Replace the Forest Edge placeholder panel with the playable top-down 3D encounter already intended by the Animal Rescue vertical slice. The work stops after making `The Hero Sign-Up Sheet` genuinely playable: move through the clearing, gather five Wood, defeat three tutorial zombies, receive the existing reward, and return to the Rescue Hub.

## Root Cause

Forest Edge is not failing to render. The current implementation never supplies a spatial encounter:

- `drawZone()` paints an opaque arena over the Three.js canvas.
- `Enter` or `Space` damages the first living zombie regardless of distance.
- `G` collects the first uncollected node regardless of distance.
- `E` completes quest progress through an assist shortcut.
- The Three.js runtime contains only a floor and rotating cube; it has no Forest Edge scene lifecycle or movement input.

The earlier approved vertical-slice design specified a movable player, visible Forest Edge objects, proximity gathering, and nearby-enemy attacks. This design restores that missing interaction layer while preserving the newer guided Hub flow.

## Scope

### Included

- Playable Forest Edge for the active `heroSignup` quest.
- Visible selected-animal model, forest clearing, two Wood piles, and three tutorial zombies.
- WASD and arrow-key movement with bounded diagonal speed.
- Camera follow from a readable top-down angle.
- Automatic Wood gathering only when the player reaches a node.
- `Space` or `Enter` attack against the nearest living zombie inside attack range.
- Zombie pursuit and contact damage based on actual proximity.
- Existing death penalty, respawn, quest progress, save writes, reward banner, and return-to-Hub behavior.
- Compact transparent HUD with controls, HP, Wood progress, zombie progress, and contextual feedback.
- Test-only quest assistance retained for automated later-quest coverage but unavailable during normal play.

### Excluded

- Playable implementations for Rabbit Village or later quest zones.
- New weapons, abilities, drops, audio recording, procedural terrain, or boss mechanics.
- Click-to-move, virtual joystick, or gamepad support.
- Redesigning the Rescue Hub, Quest Board, World Map, save flow, or later quest content.
- Replacing the existing ImageGen Hub artwork.

## Player Experience

1. The player selects Forest Edge from the World Map.
2. The HUD becomes transparent and the Three.js clearing is visible.
3. The selected animal appears near the southern edge of the arena.
4. A compact controls strip reads `MOVE: WASD / ARROWS` and `ATTACK: SPACE / ENTER`.
5. Walking into the first Wood pile gathers `3 Wood`; walking into the second gathers `2 Wood`. Each pile disappears and progress updates.
6. The three zombies visibly pursue the player. Attacks affect only a nearby zombie; an out-of-range attack does nothing.
7. A zombie damages the player only while inside contact range. Death retains the existing ten-percent ingredient penalty and respawns the player with brief grace time.
8. When both `Wood 5/5` and `Zombies 3/3` are satisfied, the existing quest reward is applied, the reward banner appears, and the screen returns to the Rescue Hub.

The `G` global-gather shortcut and normal-play `E` quest-completion shortcut are removed for this quest.

## Visual Design

Forest Edge uses the existing Three.js visual language and voxel construction helpers:

- A mossy rectangular ground plane with a lighter path through the center.
- Low trees, rocks, flowers, and boundary markers that communicate the playable limits without visual walls.
- Two distinct stump/log piles placed at the existing gathering-node coordinates.
- Three green, box-built tutorial zombies at their content-defined coordinates.
- The selected full animal model from `js/3d/player-model.js`, animated while moving and oriented toward travel.
- A camera high behind the player, looking toward the clearing; it follows smoothly while keeping nearby objectives visible.

The HUD canvas clears to transparency during zone play. Only the top objective/progress panel, bottom HP/controls strip, contextual pickup/attack feedback, guide dismissal control, and reward banner are drawn. No opaque arena panel or letter-block stand-ins remain.

## Architecture

### Pure simulation: `js/rpg/combat-rpg.js`

The existing pure combat branch gains spatial state and transitions while retaining its current ownership of HP, attack cooldown, death penalty, and combat events.

`createCombatState()` adds:

```javascript
{
  player: { x: 0, z: 4.6, facingX: 0, facingZ: -1 },
  enemies: [{ id, hp, maxHp, defeated, x, z, radius }],
  arenaBounds: { minX: -5.6, maxX: 5.6, minZ: -5.2, maxZ: 5.2 },
  attackRange: 1.65,
  contactRange: 1.05
}
```

When loading an in-progress `heroSignup` save, `createCombatState()` deterministically marks the first `tutorialZombies` progress-count enemies as defeated. Runtime enemy state therefore agrees with saved quest progress without persisting mesh or position data.

New or refined pure transitions:

- `moveCombatPlayer(state, move, dtSeconds)` normalizes diagonal input, clamps the player to arena bounds, and updates facing.
- `performPlayerAttack(state, save)` selects the nearest living enemy inside attack range; distant attacks return `attacked: false`.
- `tickCombat(state, save, dtSeconds)` advances living zombies toward the player and accumulates contact damage only for enemies inside contact range.
- `getCombatSummary(state)` returns serializable player/enemy positions in addition to the current counters and HP.

The module continues importing only content constants and mutates neither input state nor saves.

### Scene lifecycle: `js/rpg/forest-edge-scene.js`

A new visual branch owns only Three.js objects:

- `buildForestEdgeScene(THREE, scene, definitions)` creates ground, scenery, node meshes, and zombie meshes.
- `syncForestEdgeScene(sceneState, combatSummary, gatheringNodes)` updates player-independent zombie visibility/positions and collected-node visibility.
- `disposeForestEdgeScene(scene, sceneState)` removes and disposes only objects owned by the Forest Edge branch.

It imports immutable RPG constants and the shared voxel `box()` helper. It does not import combat, inventory, quest, HUD, or game branches.

### Orchestration: `js/game-rpg.js`

The orchestrator owns:

- keydown/keyup state and listener cleanup;
- ignoring repeated keydown attack events so one physical press produces at most one attack request;
- selected-animal model creation and animation;
- mapping input into the pure movement/combat transitions;
- proximity checks between the combat player position and uncollected gathering nodes;
- applying gather/combat events through the existing inventory, quest, reward, and save functions;
- synchronizing simulation positions to Three.js meshes and following camera;
- entering and disposing Forest Edge scene state when screens change.

`E` assistance is accepted only when the injected browser-test state exists. It cannot change quest progress in a normal browser session.

### HUD: `js/rpg/hud-rpg.js`

`drawZone()` consumes the serializable combat summary, gathering nodes, guide, and active quest. It draws transparent status overlays and never mutates gameplay state. The existing Hub, menu, and fallback renderers are unchanged.

## Data Flow

```text
keydown/keyup
  -> held movement vector + one-shot attack request
  -> pure combat movement/tick/attack transitions
  -> combat and proximity events
  -> existing inventory/quest/save/reward functions
  -> serializable view model + debug state
  -> Three.js scene synchronization + transparent HUD
```

Save writes occur after material events: Wood pickup, zombie defeat, player damage/death, quest completion, and zone transition. Per-frame positions remain runtime-only and are not persisted.

## Lifecycle and Failure Handling

- Forest Edge scene creation is idempotent for one active encounter.
- Leaving the zone, returning to title, or calling cleanup disposes scene-owned geometry/materials and removes keyup/keydown listeners exactly once.
- A resize updates renderer size, HUD size, and camera projection without resetting encounter state.
- If Three.js is unavailable, the HUD displays a concise `Forest Edge could not start` message and allows Escape to return; it must not present the static placeholder as playable content.
- A loaded save with partial first-quest progress hides already collected nodes and seeds the matching number of defeated tutorial zombies.

## Testing Strategy

### Pure tests

Extend RPG data-flow or add a focused Forest Edge simulation test proving:

- held movement changes player position and diagonal movement is normalized;
- arena bounds clamp movement;
- attacks outside range miss and do not damage enemies;
- attacks inside range damage the nearest enemy and emit one defeat event;
- zombies close distance over time;
- contact damage occurs only inside contact range;
- death penalty and respawn grace remain intact;
- input state and save objects are not mutated.

### Browser tests

Add a first-quest playable-flow case proving:

- Forest Edge displays a nonblank Three.js scene under a non-opaque HUD;
- holding movement keys changes debug player coordinates;
- walking near each Wood node gathers exactly `3` then `2` Wood;
- a distant attack does not change enemy HP;
- moving into attack range and attacking defeats all three zombies;
- the quest returns to Hub with the existing reward banner;
- `G` does not gather and normal-play `E` does not auto-complete;
- cleanup removes movement state/listeners and repeated launches still work.

Run the complete RPG data, RPG browser, mode-regression, and responsive Hub suites after the focused tests.

## Acceptance Criteria

- Forest Edge visibly renders a playable 3D clearing rather than an opaque placeholder panel.
- The selected animal moves with WASD and arrow keys while the camera follows.
- Wood can be collected only through proximity.
- Zombies are visible, pursue the player, damage only on contact, and can be attacked only within range.
- The first quest requires real play to reach `Wood 5/5` and `Zombies 3/3`.
- Completion preserves the existing reward/save/return-to-Hub flow.
- Normal players cannot use hidden gather or auto-complete shortcuts.
- All existing Hub, save, later-quest data, 2D Classic, and 3D Survivor regressions pass.
