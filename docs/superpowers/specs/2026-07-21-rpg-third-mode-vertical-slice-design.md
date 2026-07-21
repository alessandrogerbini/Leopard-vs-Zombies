# RPG Third-Mode Vertical Slice Design

**Date:** 2026-07-21
**Bead:** `Leopard vs Zombies-3b0`
**Source docs:** `docs/planning/beads-bd289.md`, `docs/superpowers/specs/2026-05-30-quest-mode-story-arc-design-v2.md`
**Status:** Approved slice for implementation planning.

## Goal

Add Animal Rescue as the third game mode through a small, playable RPG vertical slice. The slice proves that the current game can launch an independent RPG mode, save persistent progress, show a hub, run a simple quest loop, gather ingredients, craft one weapon, and return cleanly to the title screen without regressing 2D Classic or 3D Survivor.

## Scope

The first implementation slice includes:

- Third mode card in mode select: `ANIMAL RESCUE`.
- Existing animal select reused after picking the RPG mode.
- New/load save flow with three local save slots per animal.
- RPG launch contract: `launchRPGGame({ animal, saveSlot, onReturn })`.
- RPG hub using the existing Three.js canvas and HUD canvas pattern.
- Two playable zones: `hub` and `forestEdge`.
- One friendly NPC species: rabbits.
- One main quest: `heroSignUp`.
- Ingredients: Wood and Bananas only.
- Crafting: Wooden Club only.
- Minimal manual attack sufficient to defeat three tutorial zombies.
- Save/load of level, XP, ingredients, completed quests, active quest, unlocked recipes, and current zone.
- Return-to-title cleanup equivalent to 3D Survivor cleanup.

## Deferred

The slice does not include the full 12-quest story, Rabbit Village, Monkey Jungle, world map node graph, reputation ranks beyond the first rabbit flag, vehicles, skill trees, wardrobe, stickers, follower buddy, boss fights, Cure Cocoa, hidden grottos, Fred flags, or post-game content. Those remain valid later phases, but they must not be pulled into the first implementation plan.

## Architecture

### Trunks

`js/mode-catalog.js` is the mode-selection trunk. It owns the stable list of game modes and the mode descriptor contract. `game.js` and `renderer.js` depend on this trunk instead of hard-coding two modes.

`js/rpg/constants-rpg.js` is the RPG content trunk. It owns immutable zone, ingredient, recipe, quest, and NPC definitions for the slice.

`js/rpg/save-system.js` is the persistence trunk. It owns save keys, default save creation, schema versioning, serialization, validation, and localStorage IO.

### Branches

`js/game-rpg.js` is the RPG orchestrator branch. It wires the RPG state, renderer, input, scene lifecycle, and module calls. It does not define content tables.

`js/rpg/quest-system.js` is the quest branch. It accepts, advances, and completes quests using definitions from `constants-rpg.js`.

`js/rpg/inventory.js` is the inventory/crafting branch. It owns ingredient arithmetic and recipe crafting.

`js/rpg/zone.js` is the zone branch. It creates hub and Forest Edge scene content from zone definitions.

`js/rpg/npc.js` is the NPC branch. It creates rabbit NPC models and interaction prompts.

`js/rpg/hud-rpg.js` is the HUD branch. It draws RPG overlays, save slots, quest prompts, dialogue, and crafting menus.

Branch modules must not import each other. They may import trunks and receive sibling branch functions through `game-rpg.js` wiring.

## Data Flow

The 2D launcher remains the top-level owner of game selection:

```text
title -> modeSelect -> select -> launchRPGGame({ animal, saveSlot, onReturn })
```

The RPG mode owns its own local state object inside `launchRPGGame`, mirroring the 3D Survivor closure pattern:

```javascript
const st = {
  screen: 'saveSelect',
  animal,
  saveSlot,
  save: createDefaultRPGSave(animal.id, saveSlot),
  currentZone: 'hub',
  activeQuestId: null,
  questProgress: {},
  ingredients: { wood: 0, bananas: 0 },
  unlockedRecipes: ['woodenClub'],
  equipped: { weapon: null },
  npcs: [],
  enemies: [],
  gatherNodes: [],
  running: true,
};
```

All persisted fields live under `st.save`. Three.js meshes and DOM references are never persisted.

## UI Flow

1. Title screen.
2. Mode select with three cards: 2D Classic, 3D Survivor, Animal Rescue.
3. Animal select.
4. RPG save select with three slots.
5. Hub scene.
6. Talk to Granny Thistle with Enter.
7. Accept `The Hero Sign-Up Sheet`.
8. Enter Forest Edge through a hub signpost.
9. Defeat three tutorial zombies and gather Wood.
10. Quest complete banner appears.
11. Return to hub.
12. Craft Wooden Club at the crafting bench.
13. Auto-save writes progress.
14. Escape menu can return to title.

## Persistence

Save keys use:

```text
avz-rpg-save-v1-{animalId}-{slotIndex}
```

The save payload is JSON:

```javascript
{
  version: 1,
  animalId: 'leopard',
  slot: 0,
  player: { level: 1, xp: 0, maxHp: 100 },
  ingredients: { wood: 0, bananas: 0 },
  inventory: [],
  equipped: { weapon: null },
  quests: { active: null, completed: [] },
  unlockedZones: ['hub', 'forestEdge'],
  unlockedRecipes: ['woodenClub'],
  currentZone: 'hub',
  updatedAt: 0,
  playtimeSeconds: 0
}
```

Invalid or incompatible saves are ignored and replaced with a fresh default save. The previous value is not deleted by the loader.

## Verification Strategy

The implementation must add Puppeteer smoke tests because the project has no build step and browser ES modules are the runtime target.

Required checks:

- `bd status --json` shows the tracker is accessible.
- `node test-results/test-rpg-data-flow.mjs` validates RPG save, quest, and crafting pure-module behavior in a browser page.
- `node test-results/test-rpg-mode-flow.mjs` starts the game, selects Animal Rescue, opens a save slot, reaches the hub, exits to title, and confirms 2D Classic and 3D Survivor still launch.
- Manual browser smoke at `http://localhost:8080` verifies the RPG canvas is nonblank and text fits at 960x540.

## Implementation Readiness

Implementation may begin only from this vertical-slice scope. Any request to add vehicles, full Act 1, stickers, reputation ranks, Rabbit Village, bosses, or story cinematics must create follow-up beads or return to planning.
