# RPG Third-Mode Vertical Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a playable Animal Rescue RPG vertical slice as the third game mode without regressing 2D Classic or 3D Survivor.

**Architecture:** Add a mode catalog trunk for all mode-selection policy, then implement RPG as an independent 3D branch under `js/rpg/` plus a `js/game-rpg.js` orchestrator. RPG branch modules depend only on RPG trunks and shared 3D primitives; sibling RPG branches communicate through `game-rpg.js` wiring, not branch-to-branch imports.

**Tech Stack:** Vanilla JavaScript ES modules, Three.js global `THREE`, Canvas 2D HUD overlay, localStorage persistence, Puppeteer smoke tests.

---

## Scope Lock

Implement only the approved vertical slice from `docs/superpowers/specs/2026-07-21-rpg-third-mode-vertical-slice-design.md`.

In scope:

- Mode select has three cards: `2D CLASSIC`, `3D SURVIVOR`, `ANIMAL RESCUE`.
- Animal Rescue launches after animal select.
- RPG mode has three save slots per animal.
- A new save enters a hub with Granny Thistle, a quest board, a crafting bench, and an exit sign.
- The first quest, `The Hero Sign-Up Sheet`, sends the player to Forest Edge.
- Forest Edge has three tutorial zombies, Wood gathering nodes, simple manual attack, quest completion, and return to hub.
- The player can craft Wooden Club from Wood.
- Save/load persists slice progress.
- Escape can return to title and cleanup all RPG scene/input resources.

Out of scope:

- Full Act 1, Rabbit Village, Monkey Jungle, vehicles, reputation tiers, stickers, wardrobe, skill tree, bosses, world map node graph, Cure Cocoa, Fred flags, hidden grottos, follower buddy, and cinematics.

## File Map

Create:

- `js/mode-catalog.js` - stable mode descriptor trunk used by launcher and renderer.
- `js/game-rpg.js` - RPG orchestrator and lifecycle owner.
- `js/rpg/constants-rpg.js` - immutable RPG content tables.
- `js/rpg/save-system.js` - save key, validation, load, and write functions.
- `js/rpg/inventory.js` - ingredient and crafting operations.
- `js/rpg/quest-system.js` - quest accept, progress, and completion operations.
- `js/rpg/zone.js` - hub and Forest Edge scene creation and disposal helpers.
- `js/rpg/npc.js` - simple rabbit NPC mesh and interaction helpers.
- `js/rpg/hud-rpg.js` - RPG save select, HUD, prompts, dialogue, quest complete, and crafting overlay drawing.
- `test-results/test-rpg-data-flow.mjs` - browser-module test for save, quest, and crafting logic.
- `test-results/test-rpg-mode-flow.mjs` - Puppeteer smoke test for mode launch and cleanup.

Modify:

- `js/game.js` - use mode catalog, route selected RPG mode to `launchRPGGame`.
- `js/renderer.js` - draw mode cards from `GAME_MODES`.
- `js/game3d.js` - accept optional `options.canvases` while preserving current fallback DOM lookup.
- `index.html` - update comments to describe shared 3D world/HUD canvases.

## Task 1: Add Failing RPG Data-Flow Test

**Files:**
- Create: `test-results/test-rpg-data-flow.mjs`

- [ ] **Step 1: Write the failing browser-module test**

Create `test-results/test-rpg-data-flow.mjs` with:

```javascript
import puppeteer from 'puppeteer';

const baseUrl = process.env.AVZ_TEST_URL || 'http://127.0.0.1:8080';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

try {
  const page = await browser.newPage();
  await page.goto(`${baseUrl}/index.html`, { waitUntil: 'networkidle0' });

  const result = await page.evaluate(async () => {
    const constants = await import('/js/rpg/constants-rpg.js');
    const save = await import('/js/rpg/save-system.js');
    const inventory = await import('/js/rpg/inventory.js');
    const quests = await import('/js/rpg/quest-system.js');

    localStorage.clear();

    const s = save.createDefaultRPGSave('leopard', 0);
    const key = save.getRPGSaveKey('leopard', 0);
    save.writeRPGSave(s);
    const loaded = save.loadRPGSave('leopard', 0);

    const questState = quests.acceptQuest(loaded, 'heroSignUp');
    const progressed = quests.addQuestProgress(questState, 'defeatZombie', 3);
    const completed = quests.tryCompleteQuest(progressed, 'heroSignUp');

    const withWood = inventory.addIngredients(completed, { wood: 5 });
    const crafted = inventory.craftRecipe(withWood, 'woodenClub');

    return {
      key,
      modeName: constants.RPG_MODE_LABEL,
      saveVersion: loaded.version,
      activeAfterAccept: questState.quests.active,
      completedQuests: crafted.quests.completed,
      woodAfterCraft: crafted.ingredients.wood,
      equippedWeapon: crafted.equipped.weapon,
      unlockedZones: crafted.unlockedZones,
    };
  });

  assert(result.key === 'avz-rpg-save-v1-leopard-0', `Unexpected save key: ${result.key}`);
  assert(result.modeName === 'ANIMAL RESCUE', `Unexpected mode label: ${result.modeName}`);
  assert(result.saveVersion === 1, `Unexpected save version: ${result.saveVersion}`);
  assert(result.activeAfterAccept === 'heroSignUp', `Quest did not activate: ${result.activeAfterAccept}`);
  assert(result.completedQuests.includes('heroSignUp'), 'Quest did not complete');
  assert(result.woodAfterCraft === 0, `Wood was not consumed correctly: ${result.woodAfterCraft}`);
  assert(result.equippedWeapon === 'woodenClub', `Weapon was not equipped: ${result.equippedWeapon}`);
  assert(result.unlockedZones.includes('forestEdge'), 'Forest Edge should be unlocked');

  console.log('RPG data flow test passed');
} finally {
  await browser.close();
}
```

- [ ] **Step 2: Run the test and confirm it fails**

Run:

```bash
python3 -m http.server 8080 > /tmp/avz-rpg-plan-server.log 2>&1 &
SERVER_PID=$!
node test-results/test-rpg-data-flow.mjs
kill $SERVER_PID
```

Expected: FAIL with a browser import error for `/js/rpg/constants-rpg.js`.

- [ ] **Step 3: Commit the failing test**

```bash
git add test-results/test-rpg-data-flow.mjs
git commit -m "test: add failing RPG data flow coverage"
```

## Task 2: Add RPG Trunk Data Modules

**Files:**
- Create: `js/rpg/constants-rpg.js`
- Create: `js/rpg/save-system.js`
- Create: `js/rpg/inventory.js`
- Create: `js/rpg/quest-system.js`
- Test: `test-results/test-rpg-data-flow.mjs`

- [ ] **Step 1: Create RPG constants**

Create `js/rpg/constants-rpg.js`:

```javascript
/**
 * @module rpg/constants-rpg
 * @description Immutable content definitions for the Animal Rescue RPG vertical slice.
 */

export const RPG_MODE_LABEL = 'ANIMAL RESCUE';
export const RPG_SAVE_VERSION = 1;

export const INGREDIENTS = Object.freeze({
  wood: Object.freeze({ id: 'wood', name: 'WOOD', color: '#8b5a2b' }),
  bananas: Object.freeze({ id: 'bananas', name: 'BANANAS', color: '#ffd84a' }),
});

export const RPG_ZONES = Object.freeze({
  hub: Object.freeze({
    id: 'hub',
    name: 'QUEST HUB',
    kind: 'safe',
    spawn: Object.freeze({ x: 0, y: 0, z: 0 }),
  }),
  forestEdge: Object.freeze({
    id: 'forestEdge',
    name: 'FOREST EDGE',
    kind: 'quest',
    spawn: Object.freeze({ x: 0, y: 0, z: 0 }),
    tutorialZombieCount: 3,
    gatherNodes: Object.freeze([
      Object.freeze({ id: 'wood-1', ingredient: 'wood', amount: 2, x: -5, z: -6 }),
      Object.freeze({ id: 'wood-2', ingredient: 'wood', amount: 2, x: 5, z: -4 }),
      Object.freeze({ id: 'wood-3', ingredient: 'wood', amount: 1, x: 0, z: 6 }),
    ]),
  }),
});

export const RPG_RECIPES = Object.freeze({
  woodenClub: Object.freeze({
    id: 'woodenClub',
    name: 'WOODEN CLUB',
    category: 'weapon',
    costs: Object.freeze({ wood: 5 }),
    equipsTo: 'weapon',
    description: 'A big stick for the first rescue quest.',
  }),
});

export const RPG_QUESTS = Object.freeze({
  heroSignUp: Object.freeze({
    id: 'heroSignUp',
    name: 'THE HERO SIGN-UP SHEET',
    type: 'rescue',
    giverNpcId: 'grannyThistle',
    startZone: 'hub',
    targetZone: 'forestEdge',
    objective: Object.freeze({ kind: 'defeatZombie', required: 3 }),
    rewards: Object.freeze({
      ingredients: Object.freeze({ wood: 5 }),
      xp: 10,
      unlockRecipes: Object.freeze(['woodenClub']),
      unlockZones: Object.freeze(['forestEdge']),
    }),
    introLine: 'Future legend, please bonk those three confused zombies.',
    completeLine: 'You did it. That was a very heroic amount of bonking.',
  }),
});

export const RPG_NPCS = Object.freeze({
  grannyThistle: Object.freeze({
    id: 'grannyThistle',
    name: 'GRANNY THISTLE',
    species: 'rabbit',
    zone: 'hub',
    x: 0,
    z: -5,
    questId: 'heroSignUp',
  }),
});
```

- [ ] **Step 2: Create save system**

Create `js/rpg/save-system.js`:

```javascript
/**
 * @module rpg/save-system
 * @description localStorage persistence for Animal Rescue RPG saves.
 */

import { RPG_SAVE_VERSION } from './constants-rpg.js';

export function getRPGSaveKey(animalId, slot) {
  return `avz-rpg-save-v1-${animalId}-${slot}`;
}

export function createDefaultRPGSave(animalId, slot) {
  return {
    version: RPG_SAVE_VERSION,
    animalId,
    slot,
    player: { level: 1, xp: 0, maxHp: 100 },
    ingredients: { wood: 0, bananas: 0 },
    inventory: [],
    equipped: { weapon: null },
    quests: { active: null, completed: [] },
    questProgress: {},
    unlockedZones: ['hub', 'forestEdge'],
    unlockedRecipes: ['woodenClub'],
    currentZone: 'hub',
    updatedAt: Date.now(),
    playtimeSeconds: 0,
  };
}

export function isValidRPGSave(value, animalId, slot) {
  return Boolean(
    value &&
    value.version === RPG_SAVE_VERSION &&
    value.animalId === animalId &&
    value.slot === slot &&
    value.player &&
    value.ingredients &&
    value.equipped &&
    value.quests &&
    Array.isArray(value.quests.completed) &&
    Array.isArray(value.unlockedZones) &&
    Array.isArray(value.unlockedRecipes)
  );
}

export function loadRPGSave(animalId, slot, storage = localStorage) {
  const key = getRPGSaveKey(animalId, slot);
  try {
    const raw = storage.getItem(key);
    if (!raw) return createDefaultRPGSave(animalId, slot);
    const parsed = JSON.parse(raw);
    return isValidRPGSave(parsed, animalId, slot) ? parsed : createDefaultRPGSave(animalId, slot);
  } catch (_) {
    return createDefaultRPGSave(animalId, slot);
  }
}

export function writeRPGSave(save, storage = localStorage) {
  const next = { ...save, updatedAt: Date.now() };
  storage.setItem(getRPGSaveKey(next.animalId, next.slot), JSON.stringify(next));
  return next;
}

export function getRPGSaveSummaries(animalId, storage = localStorage) {
  return [0, 1, 2].map(slot => {
    const save = loadRPGSave(animalId, slot, storage);
    const exists = storage.getItem(getRPGSaveKey(animalId, slot)) !== null;
    return {
      slot,
      exists,
      level: save.player.level,
      completedCount: save.quests.completed.length,
      updatedAt: save.updatedAt,
    };
  });
}
```

- [ ] **Step 3: Create inventory operations**

Create `js/rpg/inventory.js`:

```javascript
/**
 * @module rpg/inventory
 * @description Pure ingredient and crafting operations for the RPG slice.
 */

import { RPG_RECIPES } from './constants-rpg.js';

export function addIngredients(save, amounts) {
  const ingredients = { ...save.ingredients };
  for (const [id, amount] of Object.entries(amounts)) {
    ingredients[id] = (ingredients[id] || 0) + amount;
  }
  return { ...save, ingredients };
}

export function canAffordRecipe(save, recipeId) {
  const recipe = RPG_RECIPES[recipeId];
  if (!recipe) return false;
  return Object.entries(recipe.costs).every(([id, amount]) => (save.ingredients[id] || 0) >= amount);
}

export function craftRecipe(save, recipeId) {
  const recipe = RPG_RECIPES[recipeId];
  if (!recipe) throw new Error(`Unknown RPG recipe: ${recipeId}`);
  if (!save.unlockedRecipes.includes(recipeId)) throw new Error(`Recipe is locked: ${recipeId}`);
  if (!canAffordRecipe(save, recipeId)) throw new Error(`Not enough ingredients for recipe: ${recipeId}`);

  const ingredients = { ...save.ingredients };
  for (const [id, amount] of Object.entries(recipe.costs)) {
    ingredients[id] -= amount;
  }

  const inventory = save.inventory.includes(recipeId) ? save.inventory.slice() : [...save.inventory, recipeId];
  const equipped = recipe.equipsTo ? { ...save.equipped, [recipe.equipsTo]: recipeId } : { ...save.equipped };
  return { ...save, ingredients, inventory, equipped };
}
```

- [ ] **Step 4: Create quest operations**

Create `js/rpg/quest-system.js`:

```javascript
/**
 * @module rpg/quest-system
 * @description Pure quest state transitions for the RPG vertical slice.
 */

import { RPG_QUESTS } from './constants-rpg.js';
import { addIngredients } from './inventory.js';

export function acceptQuest(save, questId) {
  if (!RPG_QUESTS[questId]) throw new Error(`Unknown RPG quest: ${questId}`);
  if (save.quests.completed.includes(questId)) return save;
  return {
    ...save,
    quests: { ...save.quests, active: questId },
    questProgress: { ...save.questProgress, [questId]: 0 },
  };
}

export function addQuestProgress(save, objectiveKind, amount = 1) {
  const questId = save.quests.active;
  if (!questId) return save;
  const quest = RPG_QUESTS[questId];
  if (quest.objective.kind !== objectiveKind) return save;
  const previous = save.questProgress[questId] || 0;
  return {
    ...save,
    questProgress: { ...save.questProgress, [questId]: previous + amount },
  };
}

export function isQuestComplete(save, questId) {
  const quest = RPG_QUESTS[questId];
  if (!quest) return false;
  return (save.questProgress[questId] || 0) >= quest.objective.required;
}

export function tryCompleteQuest(save, questId) {
  if (!isQuestComplete(save, questId)) return save;
  if (save.quests.completed.includes(questId)) return save;
  const quest = RPG_QUESTS[questId];
  const withIngredients = addIngredients(save, quest.rewards.ingredients);
  return {
    ...withIngredients,
    player: { ...withIngredients.player, xp: withIngredients.player.xp + quest.rewards.xp },
    quests: {
      active: withIngredients.quests.active === questId ? null : withIngredients.quests.active,
      completed: [...withIngredients.quests.completed, questId],
    },
    unlockedZones: Array.from(new Set([...withIngredients.unlockedZones, ...quest.rewards.unlockZones])),
    unlockedRecipes: Array.from(new Set([...withIngredients.unlockedRecipes, ...quest.rewards.unlockRecipes])),
  };
}
```

- [ ] **Step 5: Run the data-flow test**

Run:

```bash
python3 -m http.server 8080 > /tmp/avz-rpg-plan-server.log 2>&1 &
SERVER_PID=$!
node test-results/test-rpg-data-flow.mjs
kill $SERVER_PID
```

Expected: `RPG data flow test passed`.

- [ ] **Step 6: Commit**

```bash
git add js/rpg/constants-rpg.js js/rpg/save-system.js js/rpg/inventory.js js/rpg/quest-system.js
git commit -m "feat: add RPG slice data modules"
```

## Task 3: Add Mode Catalog and Dynamic Mode Select

**Files:**
- Create: `js/mode-catalog.js`
- Modify: `js/game.js`
- Modify: `js/renderer.js`
- Test: `test-results/test-rpg-mode-flow.mjs`

- [ ] **Step 1: Create mode catalog**

Create `js/mode-catalog.js`:

```javascript
/**
 * @module mode-catalog
 * @description Stable game-mode descriptors shared by launcher and renderer.
 */

export const MODE_IDS = Object.freeze({
  CLASSIC_2D: 'classic2d',
  SURVIVOR_3D: 'survivor3d',
  RPG: 'rpg',
});

export const GAME_MODES = Object.freeze([
  Object.freeze({
    id: MODE_IDS.CLASSIC_2D,
    label: '2D CLASSIC',
    color: '#44ff88',
    lines: Object.freeze(['Side-scrolling action', '3 levels + boss fights', 'Multiple animals & items']),
    requiresDifficulty: true,
  }),
  Object.freeze({
    id: MODE_IDS.SURVIVOR_3D,
    label: '3D SURVIVOR',
    color: '#ff6644',
    lines: Object.freeze(['Top-down arena combat', 'Endless zombie waves', 'Level up & survive!']),
    requiresDifficulty: false,
  }),
  Object.freeze({
    id: MODE_IDS.RPG,
    label: 'ANIMAL RESCUE',
    color: '#66ccff',
    lines: Object.freeze(['Quest hub adventure', 'Craft gear & save animals', 'Persistent RPG progress']),
    requiresDifficulty: false,
  }),
]);

export function normalizeModeIndex(index) {
  return (index + GAME_MODES.length) % GAME_MODES.length;
}

export function getModeByIndex(index) {
  return GAME_MODES[normalizeModeIndex(index)];
}
```

- [ ] **Step 2: Update `js/game.js` imports**

Add:

```javascript
import { MODE_IDS, GAME_MODES, getModeByIndex, normalizeModeIndex } from './mode-catalog.js';
import { launchRPGGame } from './game-rpg.js?v=1';
```

- [ ] **Step 3: Replace mode-select index math in `js/game.js`**

Replace both `+ 2) % 2` expressions with:

```javascript
state.selectedMode = normalizeModeIndex(state.selectedMode - 1);
```

and:

```javascript
state.selectedMode = normalizeModeIndex(state.selectedMode + 1);
```

Replace the Enter branch with:

```javascript
const selectedMode = getModeByIndex(state.selectedMode);
if (selectedMode.requiresDifficulty) {
  state.selectedDifficulty = 0;
  state.gameState = 'difficulty';
} else {
  state.difficulty = 'easy';
  state.leaderboard = loadLeaderboard(state.difficulty);
  state.selectedAnimal = 0;
  state.gameState = 'select';
}
```

- [ ] **Step 4: Replace selected-mode launch branch in `js/game.js`**

Inside the `select` state Enter handler, replace `if (state.selectedMode === 1)` with:

```javascript
const selectedMode = getModeByIndex(state.selectedMode);
if (selectedMode.id === MODE_IDS.SURVIVOR_3D) {
```

After the existing 3D Survivor `launch3DGame(...)` branch, add:

```javascript
} else if (selectedMode.id === MODE_IDS.RPG) {
  state.gameState = '3dMode';
  stopGameLoop();
  canvas.style.display = 'none';
  launchRPGGame({
    animal,
    saveSlot: 0,
    canvases: {
      world: document.getElementById('game3d'),
      hud: document.getElementById('hud3d'),
    },
    onReturn: () => {
      canvas.style.display = '';
      Object.keys(keys).forEach(k => { keys[k] = false; });
      state.gameState = 'title';
      state.particles = [];
      state.floatingTexts = [];
      state.zombies = [];
      state.healthPickups = [];
      state.powerupCrates = [];
      state.projectiles = [];
      state.allies = [];
      startGameLoop();
      startTitlePreview();
    },
  });
```

Keep the existing final `else` branch for 2D Classic.

- [ ] **Step 5: Update Escape handling from select in `js/game.js`**

Replace:

```javascript
state.gameState = state.selectedMode === 0 ? 'difficulty' : 'modeSelect';
```

with:

```javascript
state.gameState = getModeByIndex(state.selectedMode).requiresDifficulty ? 'difficulty' : 'modeSelect';
```

- [ ] **Step 6: Update `js/renderer.js` mode select**

Import the catalog:

```javascript
import { GAME_MODES } from './mode-catalog.js';
```

In `drawModeSelectScreen`, replace the local `modes` array with:

```javascript
const modes = GAME_MODES;
```

Use responsive card sizing:

```javascript
const cardW = modes.length > 2 ? 240 : 280;
const cardH = 260;
const gap = modes.length > 2 ? 30 : 60;
```

For the icon branch, keep the existing 2D icon when `m.id === 'classic2d'`, keep the existing arena icon when `m.id === 'survivor3d'`, and add this RPG icon branch:

```javascript
} else {
  ctx.fillStyle = '#8b5a2b';
  ctx.fillRect(cx + cardW / 2 - 38, cardY + 218, 76, 8);
  ctx.fillStyle = '#66ccff';
  ctx.fillRect(cx + cardW / 2 - 8, cardY + 190, 16, 28);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(cx + cardW / 2 + 18, cardY + 198, 10, 10);
  ctx.fillStyle = '#ffcc00';
  ctx.fillRect(cx + cardW / 2 - 34, cardY + 195, 12, 16);
}
```

- [ ] **Step 7: Commit**

```bash
git add js/mode-catalog.js js/game.js js/renderer.js
git commit -m "feat: add third mode catalog entry"
```

## Task 4: Let 3D Launchers Receive Canvas Handles

**Files:**
- Modify: `js/game3d.js`
- Modify: `index.html`

- [ ] **Step 1: Update `launch3DGame` canvas lookup**

In `js/game3d.js`, replace:

```javascript
const canvas3d = document.getElementById('game3d');
const hudCanvas = document.getElementById('hud3d');
```

with:

```javascript
const canvas3d = options.canvases?.world || document.getElementById('game3d');
const hudCanvas = options.canvases?.hud || document.getElementById('hud3d');
```

- [ ] **Step 2: Update `index.html` comments**

Change the canvas comment to describe `#game3d` and `#hud3d` as shared 3D mode canvases used by Survivor and Animal Rescue.

- [ ] **Step 3: Run current 3D smoke test**

Run:

```bash
python3 -m http.server 8080 > /tmp/avz-rpg-plan-server.log 2>&1 &
SERVER_PID=$!
node test-results/test-gameover-flow.mjs
kill $SERVER_PID
```

Expected: existing 3D game-over flow reaches the feedback screen and returns to title.

- [ ] **Step 4: Commit**

```bash
git add js/game3d.js index.html
git commit -m "refactor: pass shared 3D canvases to mode launchers"
```

## Task 5: Add RPG HUD and Scene Helpers

**Files:**
- Create: `js/rpg/hud-rpg.js`
- Create: `js/rpg/npc.js`
- Create: `js/rpg/zone.js`

- [ ] **Step 1: Create HUD module**

Create `js/rpg/hud-rpg.js` with exported functions:

```javascript
/**
 * @module rpg/hud-rpg
 * @description Canvas 2D HUD rendering for the RPG vertical slice.
 */

import { RPG_QUESTS, RPG_RECIPES } from './constants-rpg.js';

export function drawRPGSaveSelect(ctx, s) {
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(0,0,0,0.62)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#66ccff';
  ctx.font = 'bold 38px "Courier New"';
  ctx.fillText('ANIMAL RESCUE', W / 2, 90);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px "Courier New"';
  ctx.fillText('CHOOSE SAVE SLOT', W / 2, 130);

  const cardW = 220;
  const cardH = 150;
  const gap = 30;
  const startX = (W - cardW * 3 - gap * 2) / 2;
  for (let i = 0; i < 3; i++) {
    const x = startX + i * (cardW + gap);
    const selected = i === s.saveSlot;
    ctx.fillStyle = selected ? '#66ccff' : '#333844';
    ctx.fillRect(x - 3, 185 - 3, cardW + 6, cardH + 6);
    ctx.fillStyle = '#111820';
    ctx.fillRect(x, 185, cardW, cardH);
    const summary = s.saveSummaries[i];
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px "Courier New"';
    ctx.fillText(`SLOT ${i + 1}`, x + cardW / 2, 225);
    ctx.font = '16px "Courier New"';
    ctx.fillText(summary.exists ? `LV ${summary.level}` : 'NEW GAME', x + cardW / 2, 265);
    ctx.fillText(summary.exists ? `${summary.completedCount} QUESTS` : 'START HERE', x + cardW / 2, 295);
  }

  ctx.fillStyle = '#ffcc00';
  ctx.font = 'bold 18px "Courier New"';
  ctx.fillText('ARROWS: SELECT   ENTER: START   ESC: BACK', W / 2, H - 50);
}

export function drawRPGHUD(ctx, s) {
  const W = ctx.canvas.width;
  ctx.clearRect(0, 0, W, ctx.canvas.height);
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(12, 12, 290, 92);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px "Courier New"';
  ctx.fillText(`ZONE: ${s.zoneName}`, 24, 36);
  ctx.fillText(`WOOD: ${s.save.ingredients.wood}`, 24, 60);
  ctx.fillText(`BANANAS: ${s.save.ingredients.bananas}`, 24, 84);

  if (s.save.quests.active) {
    const quest = RPG_QUESTS[s.save.quests.active];
    const progress = s.save.questProgress[quest.id] || 0;
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(W - 330, 12, 318, 76);
    ctx.fillStyle = '#ffcc00';
    ctx.font = 'bold 15px "Courier New"';
    ctx.fillText(quest.name, W - 24, 38);
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px "Courier New"';
    ctx.fillText(`${progress}/${quest.objective.required} zombies bonked`, W - 24, 62);
  }

  if (s.prompt) {
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(W / 2 - 230, ctx.canvas.height - 86, 460, 42);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 17px "Courier New"';
    ctx.fillText(s.prompt, W / 2, ctx.canvas.height - 59);
  }
}

export function drawRPGDialogue(ctx, line) {
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(0,0,0,0.82)';
  ctx.fillRect(120, H - 150, W - 240, 90);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.strokeRect(120, H - 150, W - 240, 90);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px "Courier New"';
  ctx.fillText(line, W / 2, H - 102);
  ctx.font = '14px "Courier New"';
  ctx.fillText('ENTER', W / 2, H - 76);
}

export function drawRPGCrafting(ctx, s) {
  const recipe = RPG_RECIPES.woodenClub;
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(0,0,0,0.82)';
  ctx.fillRect(150, 120, W - 300, H - 240);
  ctx.strokeStyle = '#66ccff';
  ctx.lineWidth = 3;
  ctx.strokeRect(150, 120, W - 300, H - 240);
  ctx.fillStyle = '#66ccff';
  ctx.font = 'bold 28px "Courier New"';
  ctx.fillText('CRAFTING BENCH', W / 2, 170);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px "Courier New"';
  ctx.fillText(recipe.name, W / 2, 225);
  ctx.font = '16px "Courier New"';
  ctx.fillText(`Cost: ${recipe.costs.wood} Wood`, W / 2, 260);
  ctx.fillText(`You have: ${s.save.ingredients.wood} Wood`, W / 2, 290);
  ctx.fillStyle = s.save.ingredients.wood >= recipe.costs.wood ? '#44ff88' : '#ff7777';
  ctx.font = 'bold 18px "Courier New"';
  ctx.fillText(s.save.ingredients.wood >= recipe.costs.wood ? 'ENTER: BUILD IT' : 'NEED MORE WOOD', W / 2, 335);
  ctx.fillStyle = '#cccccc';
  ctx.fillText('ESC: CLOSE', W / 2, 370);
}
```

- [ ] **Step 2: Create NPC module**

Create `js/rpg/npc.js`:

```javascript
/**
 * @module rpg/npc
 * @description Minimal NPC meshes and proximity helpers for the RPG slice.
 */

import { box } from '../3d/utils.js';

export function createRabbitNPC(THREE, scene, def) {
  const group = new THREE.Group();
  group.position.set(def.x, 0, def.z);
  box(group, 0.55, 0.8, 0.35, 0xffffff, 0, 0.75, 0);
  box(group, 0.42, 0.38, 0.34, 0xffeeee, 0, 1.32, 0);
  box(group, 0.12, 0.55, 0.1, 0xffeeee, -0.14, 1.78, 0);
  box(group, 0.12, 0.55, 0.1, 0xffeeee, 0.14, 1.78, 0);
  box(group, 0.08, 0.08, 0.04, 0x111111, -0.1, 1.38, -0.18, false);
  box(group, 0.08, 0.08, 0.04, 0x111111, 0.1, 1.38, -0.18, false);
  scene.add(group);
  return { ...def, group, radius: 2.1 };
}

export function getNearbyNPC(npcs, playerX, playerZ) {
  return npcs.find(npc => {
    const dx = npc.x - playerX;
    const dz = npc.z - playerZ;
    return dx * dx + dz * dz <= npc.radius * npc.radius;
  }) || null;
}
```

- [ ] **Step 3: Create zone module**

Create `js/rpg/zone.js`:

```javascript
/**
 * @module rpg/zone
 * @description Minimal bounded hub and Forest Edge scene helpers for the RPG slice.
 */

import { box } from '../3d/utils.js';
import { RPG_NPCS, RPG_ZONES } from './constants-rpg.js';

function disposeObject(object) {
  object.traverse?.(child => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      if (Array.isArray(child.material)) child.material.forEach(material => material.dispose());
      else child.material.dispose();
    }
  });
}

export function clearZone(scene, zoneState) {
  for (const object of zoneState.objects) {
    scene.remove(object);
    disposeObject(object);
  }
  zoneState.objects.length = 0;
  zoneState.npcs.length = 0;
  zoneState.enemies.length = 0;
  zoneState.gatherNodes.length = 0;
}

export function createZoneState() {
  return { objects: [], npcs: [], enemies: [], gatherNodes: [] };
}

export function buildHub(THREE, scene, zoneState, createNpc) {
  clearZone(scene, zoneState);
  const ground = new THREE.Mesh(
    new THREE.BoxGeometry(26, 0.2, 26),
    new THREE.MeshLambertMaterial({ color: 0x315d34 })
  );
  ground.position.y = -0.1;
  scene.add(ground);
  zoneState.objects.push(ground);

  const bench = new THREE.Group();
  bench.position.set(5, 0, -3);
  box(bench, 2, 0.35, 0.8, 0x8b5a2b, 0, 0.45, 0);
  box(bench, 0.2, 0.8, 0.2, 0x5c3a1e, -0.8, 0.1, -0.25);
  box(bench, 0.2, 0.8, 0.2, 0x5c3a1e, 0.8, 0.1, 0.25);
  scene.add(bench);
  zoneState.objects.push(bench);

  const sign = new THREE.Group();
  sign.position.set(-5, 0, -3);
  box(sign, 0.18, 1.2, 0.18, 0x6b421c, 0, 0.6, 0);
  box(sign, 1.8, 0.55, 0.12, 0xd6b26a, 0, 1.35, 0);
  scene.add(sign);
  zoneState.objects.push(sign);

  const granny = createNpc(RPG_NPCS.grannyThistle);
  zoneState.npcs.push(granny);
  return RPG_ZONES.hub;
}

export function buildForestEdge(THREE, scene, zoneState) {
  clearZone(scene, zoneState);
  const ground = new THREE.Mesh(
    new THREE.BoxGeometry(32, 0.2, 32),
    new THREE.MeshLambertMaterial({ color: 0x244f2a })
  );
  ground.position.y = -0.1;
  scene.add(ground);
  zoneState.objects.push(ground);

  for (let i = 0; i < 3; i++) {
    const enemy = new THREE.Group();
    enemy.position.set(-5 + i * 5, 0, -7);
    box(enemy, 0.55, 0.9, 0.35, 0x4a7a42, 0, 0.7, 0);
    box(enemy, 0.4, 0.35, 0.32, 0x77aa55, 0, 1.28, 0);
    scene.add(enemy);
    zoneState.objects.push(enemy);
    zoneState.enemies.push({ id: `tutorial-zombie-${i}`, group: enemy, hp: 2, alive: true });
  }

  for (const node of RPG_ZONES.forestEdge.gatherNodes) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.35, 0.7),
      new THREE.MeshLambertMaterial({ color: 0x8b5a2b })
    );
    mesh.position.set(node.x, 0.2, node.z);
    scene.add(mesh);
    zoneState.objects.push(mesh);
    zoneState.gatherNodes.push({ ...node, mesh, collected: false, radius: 1.6 });
  }
  return RPG_ZONES.forestEdge;
}
```

- [ ] **Step 4: Commit**

```bash
git add js/rpg/hud-rpg.js js/rpg/npc.js js/rpg/zone.js
git commit -m "feat: add RPG HUD and scene helpers"
```

## Task 6: Add RPG Orchestrator

**Files:**
- Create: `js/game-rpg.js`
- Test: `test-results/test-rpg-mode-flow.mjs`

- [ ] **Step 1: Create `js/game-rpg.js`**

Create `js/game-rpg.js` with a closure-based `launchRPGGame(options)` following the same lifecycle shape as `launch3DGame`:

```javascript
/**
 * @module game-rpg
 * @description Animal Rescue RPG vertical-slice orchestrator.
 */

import { buildPlayerModel, animatePlayer } from './3d/player-model.js?v=14';
import { clearCaches } from './3d/utils.js';
import { createDefaultRPGSave, getRPGSaveSummaries, loadRPGSave, writeRPGSave } from './rpg/save-system.js';
import { craftRecipe } from './rpg/inventory.js';
import { acceptQuest, addQuestProgress, tryCompleteQuest } from './rpg/quest-system.js';
import { RPG_QUESTS } from './rpg/constants-rpg.js';
import { createZoneState, buildForestEdge, buildHub, clearZone } from './rpg/zone.js';
import { createRabbitNPC, getNearbyNPC } from './rpg/npc.js';
import { drawRPGCrafting, drawRPGDialogue, drawRPGHUD, drawRPGSaveSelect } from './rpg/hud-rpg.js';

export function launchRPGGame(options) {
  const onReturn = options.onReturn;
  const animal = options.animal;
  const canvas3d = options.canvases?.world || document.getElementById('game3d');
  const hudCanvas = options.canvases?.hud || document.getElementById('hud3d');
  const hudCtx = hudCanvas.getContext('2d');
  const container = document.getElementById('game-container');

  canvas3d.style.display = 'block';
  hudCanvas.style.display = 'block';
  container.style.width = '100vw';
  container.style.height = '100vh';

  const renderer = new THREE.WebGLRenderer({ canvas: canvas3d, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  hudCanvas.width = window.innerWidth;
  hudCanvas.height = window.innerHeight;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x102018);
  scene.add(new THREE.AmbientLight(0x889988, 0.75));
  const sun = new THREE.DirectionalLight(0xffffff, 0.8);
  sun.position.set(8, 16, 8);
  scene.add(sun);

  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 120);
  const clock = new THREE.Clock();
  const keys = {};
  const zoneState = createZoneState();
  const playerModel = buildPlayerModel(animal.id, scene);

  const st = {
    running: true,
    screen: 'saveSelect',
    animal,
    saveSlot: options.saveSlot || 0,
    saveSummaries: getRPGSaveSummaries(animal.id),
    save: createDefaultRPGSave(animal.id, options.saveSlot || 0),
    playerX: 0,
    playerZ: 2,
    zoneName: 'QUEST HUB',
    prompt: '',
    dialogueLine: '',
    mode: 'hub',
  };

  function onResize() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    hudCanvas.width = window.innerWidth;
    hudCanvas.height = window.innerHeight;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  }

  function loadZone(zoneId) {
    if (zoneId === 'forestEdge') {
      const zone = buildForestEdge(THREE, scene, zoneState);
      st.zoneName = zone.name;
      st.playerX = 0;
      st.playerZ = 8;
    } else {
      const zone = buildHub(THREE, scene, zoneState, def => createRabbitNPC(THREE, scene, def));
      st.zoneName = zone.name;
      st.playerX = 0;
      st.playerZ = 2;
    }
    st.save = { ...st.save, currentZone: zoneId };
    writeRPGSave(st.save);
  }

  function startSlot(slot) {
    st.saveSlot = slot;
    st.save = loadRPGSave(animal.id, slot);
    st.screen = 'play';
    loadZone(st.save.currentZone || 'hub');
  }

  function returnToTitle() {
    writeRPGSave(st.save);
    cleanup();
    onReturn();
  }

  function onKeyDown(e) {
    keys[e.code] = true;
    if (st.screen === 'saveSelect') {
      if (e.code === 'ArrowLeft') st.saveSlot = (st.saveSlot + 2) % 3;
      if (e.code === 'ArrowRight') st.saveSlot = (st.saveSlot + 1) % 3;
      if (e.code === 'Enter' || e.code === 'Space') startSlot(st.saveSlot);
      if (e.code === 'Escape') returnToTitle();
      e.preventDefault();
      return;
    }
    if (st.screen === 'dialogue') {
      if (e.code === 'Enter' || e.code === 'Space') {
        st.dialogueLine = '';
        st.screen = 'play';
      }
      e.preventDefault();
      return;
    }
    if (st.screen === 'crafting') {
      if (e.code === 'Enter' || e.code === 'Space') {
        try {
          st.save = writeRPGSave(craftRecipe(st.save, 'woodenClub'));
          st.screen = 'play';
        } catch (err) {
          st.dialogueLine = err.message;
          st.screen = 'dialogue';
        }
      }
      if (e.code === 'Escape') st.screen = 'play';
      e.preventDefault();
      return;
    }
    if (e.code === 'Escape') returnToTitle();
    if (e.code === 'Enter' || e.code === 'Space') interactOrAttack();
    e.preventDefault();
  }

  function onKeyUp(e) {
    keys[e.code] = false;
    e.preventDefault();
  }

  function interactOrAttack() {
    if (st.save.currentZone === 'hub') {
      const npc = getNearbyNPC(zoneState.npcs, st.playerX, st.playerZ);
      if (npc?.questId && !st.save.quests.completed.includes(npc.questId)) {
        st.save = writeRPGSave(acceptQuest(st.save, npc.questId));
        st.dialogueLine = RPG_QUESTS[npc.questId].introLine;
        st.screen = 'dialogue';
        return;
      }
      if (Math.hypot(st.playerX - 5, st.playerZ + 3) < 2.5) {
        st.screen = 'crafting';
        return;
      }
      if (Math.hypot(st.playerX + 5, st.playerZ + 3) < 2.5) {
        loadZone('forestEdge');
        return;
      }
    }

    for (const enemy of zoneState.enemies) {
      if (!enemy.alive) continue;
      const d = enemy.group.position.distanceTo(playerModel.group.position);
      if (d < 2.2) {
        enemy.hp -= 1;
        if (enemy.hp <= 0) {
          enemy.alive = false;
          scene.remove(enemy.group);
          st.save = addQuestProgress(st.save, 'defeatZombie', 1);
          st.save = tryCompleteQuest(st.save, 'heroSignUp');
          st.save = writeRPGSave(st.save);
        }
        return;
      }
    }
  }

  function update(dt) {
    let mx = 0;
    let mz = 0;
    if (keys.KeyW || keys.ArrowUp) mz -= 1;
    if (keys.KeyS || keys.ArrowDown) mz += 1;
    if (keys.KeyA || keys.ArrowLeft) mx -= 1;
    if (keys.KeyD || keys.ArrowRight) mx += 1;
    const len = Math.hypot(mx, mz) || 1;
    st.playerX += (mx / len) * dt * 5;
    st.playerZ += (mz / len) * dt * 5;
    st.playerX = Math.max(-12, Math.min(12, st.playerX));
    st.playerZ = Math.max(-12, Math.min(12, st.playerZ));
    playerModel.group.position.set(st.playerX, 0, st.playerZ);
    animatePlayer(playerModel, { ...st, level: st.save.player.level }, clock, len, mx, mz);

    st.prompt = '';
    if (st.save.currentZone === 'hub') {
      const npc = getNearbyNPC(zoneState.npcs, st.playerX, st.playerZ);
      if (npc) st.prompt = 'ENTER: TALK';
      else if (Math.hypot(st.playerX - 5, st.playerZ + 3) < 2.5) st.prompt = 'ENTER: CRAFT';
      else if (Math.hypot(st.playerX + 5, st.playerZ + 3) < 2.5) st.prompt = 'ENTER: FOREST EDGE';
    } else {
      for (const node of zoneState.gatherNodes) {
        if (!node.collected && Math.hypot(st.playerX - node.x, st.playerZ - node.z) < node.radius) {
          node.collected = true;
          scene.remove(node.mesh);
          st.save.ingredients[node.ingredient] += node.amount;
          st.save = writeRPGSave(st.save);
        }
      }
      if (!st.save.quests.active && st.save.quests.completed.includes('heroSignUp')) {
        st.prompt = 'QUEST COMPLETE - WALK SOUTH TO RETURN';
        if (st.playerZ > 11) loadZone('hub');
      }
    }

    camera.position.set(st.playerX, 13, st.playerZ + 11);
    camera.lookAt(st.playerX, 0, st.playerZ);
  }

  function draw() {
    if (st.screen === 'saveSelect') {
      drawRPGSaveSelect(hudCtx, st);
      return;
    }
    drawRPGHUD(hudCtx, st);
    if (st.screen === 'dialogue') drawRPGDialogue(hudCtx, st.dialogueLine);
    if (st.screen === 'crafting') drawRPGCrafting(hudCtx, st);
  }

  function tick() {
    if (!st.running) return;
    requestAnimationFrame(tick);
    const dt = Math.min(0.05, clock.getDelta());
    if (st.screen === 'play') update(dt);
    renderer.render(scene, camera);
    draw();
  }

  function cleanup() {
    st.running = false;
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('resize', onResize);
    clearZone(scene, zoneState);
    scene.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
        else child.material.dispose();
      }
    });
    clearCaches();
    renderer.dispose();
    hudCtx.clearRect(0, 0, hudCanvas.width, hudCanvas.height);
    canvas3d.style.display = 'none';
    hudCanvas.style.display = 'none';
    container.style.width = '960px';
    container.style.height = '540px';
    canvas3d.style.width = '960px';
    canvas3d.style.height = '540px';
    canvas3d.style.border = '2px solid #333';
    hudCanvas.style.width = '960px';
    hudCanvas.style.height = '540px';
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('resize', onResize);
  onResize();
  tick();
}
```

- [ ] **Step 2: Run the data-flow test again**

Run:

```bash
python3 -m http.server 8080 > /tmp/avz-rpg-plan-server.log 2>&1 &
SERVER_PID=$!
node test-results/test-rpg-data-flow.mjs
kill $SERVER_PID
```

Expected: `RPG data flow test passed`.

- [ ] **Step 3: Commit**

```bash
git add js/game-rpg.js
git commit -m "feat: add RPG vertical slice launcher"
```

## Task 7: Add RPG Mode Flow Smoke Test

**Files:**
- Create: `test-results/test-rpg-mode-flow.mjs`

- [ ] **Step 1: Write Puppeteer mode-flow test**

Create `test-results/test-rpg-mode-flow.mjs`:

```javascript
import puppeteer from 'puppeteer';

const baseUrl = process.env.AVZ_TEST_URL || 'http://127.0.0.1:8080';

async function press(page, key, delay = 120) {
  await page.keyboard.press(key);
  await new Promise(resolve => setTimeout(resolve, delay));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 960, height: 540 });
  await page.goto(`${baseUrl}/index.html`, { waitUntil: 'networkidle0' });
  await page.evaluate(() => localStorage.clear());

  await press(page, 'Enter');
  await press(page, 'ArrowRight');
  await press(page, 'Enter');
  await press(page, 'Enter');
  await press(page, 'Enter', 700);

  const inRpg = await page.evaluate(() => {
    const game = document.getElementById('game');
    const game3d = document.getElementById('game3d');
    const hud3d = document.getElementById('hud3d');
    return {
      gameDisplay: game.style.display,
      game3dDisplay: game3d.style.display,
      hud3dDisplay: hud3d.style.display,
      saveKeyExists: localStorage.getItem('avz-rpg-save-v1-leopard-0') !== null,
    };
  });

  assert(inRpg.gameDisplay === 'none', `2D canvas should be hidden in RPG mode: ${inRpg.gameDisplay}`);
  assert(inRpg.game3dDisplay === 'block', `3D canvas should be visible in RPG mode: ${inRpg.game3dDisplay}`);
  assert(inRpg.hud3dDisplay === 'block', `HUD canvas should be visible in RPG mode: ${inRpg.hud3dDisplay}`);

  await press(page, 'Escape', 500);
  const returned = await page.evaluate(() => ({
    gameDisplay: document.getElementById('game').style.display,
    game3dDisplay: document.getElementById('game3d').style.display,
    hud3dDisplay: document.getElementById('hud3d').style.display,
  }));

  assert(returned.gameDisplay !== 'none', '2D canvas should be visible after RPG return');
  assert(returned.game3dDisplay === 'none', '3D canvas should hide after RPG return');
  assert(returned.hud3dDisplay === 'none', 'HUD canvas should hide after RPG return');

  console.log('RPG mode flow test passed');
} finally {
  await browser.close();
}
```

- [ ] **Step 2: Run the test**

Run:

```bash
python3 -m http.server 8080 > /tmp/avz-rpg-plan-server.log 2>&1 &
SERVER_PID=$!
node test-results/test-rpg-mode-flow.mjs
kill $SERVER_PID
```

Expected: `RPG mode flow test passed`.

- [ ] **Step 3: Commit**

```bash
git add test-results/test-rpg-mode-flow.mjs
git commit -m "test: cover RPG mode launch and return"
```

## Task 8: Manual Slice Verification

**Files:**
- Modify only if verification exposes a defect in files already touched by this plan.

- [ ] **Step 1: Start local server**

```bash
python3 -m http.server 8080
```

- [ ] **Step 2: Verify mode selection manually**

Open `http://127.0.0.1:8080`.

Expected:

- Title screen appears.
- Enter opens mode select.
- Mode select shows all three cards with no text overlap at 960x540.
- Left/right selection wraps across all three modes.

- [ ] **Step 3: Verify RPG slice manually**

Expected:

- Select `ANIMAL RESCUE`.
- Select Leopard.
- Save-slot screen appears.
- Enter opens hub.
- Granny Thistle, bench, and sign are visible.
- Enter near Granny accepts `The Hero Sign-Up Sheet`.
- Enter near the sign enters Forest Edge.
- Three tutorial zombies are visible.
- Enter near zombies damages/defeats them.
- Wood nodes collect when approached.
- Quest completion clears the active quest.
- Walking south returns to hub.
- Enter near crafting bench crafts Wooden Club when Wood is sufficient.
- Escape returns to title.

- [ ] **Step 4: Run final automated checks**

```bash
python3 -m http.server 8080 > /tmp/avz-rpg-plan-server.log 2>&1 &
SERVER_PID=$!
node test-results/test-rpg-data-flow.mjs
node test-results/test-rpg-mode-flow.mjs
node test-results/test-gameover-flow.mjs
kill $SERVER_PID
```

Expected:

- `RPG data flow test passed`
- `RPG mode flow test passed`
- Existing 3D game-over flow completes.

- [ ] **Step 5: Update bead status**

```bash
bd update 'Leopard vs Zombies-3b0' --status landing
```

- [ ] **Step 6: Commit verification fixes or close if no fixes are needed**

If verification required code fixes:

```bash
git add js/mode-catalog.js js/game.js js/renderer.js js/game3d.js index.html js/game-rpg.js js/rpg test-results/test-rpg-data-flow.mjs test-results/test-rpg-mode-flow.mjs
git commit -m "fix: stabilize RPG vertical slice smoke flow"
```

If no fixes are needed:

```bash
bd close 'Leopard vs Zombies-3b0' --reason "RPG vertical slice implemented and verified"
```

## Dependency Rules

Allowed imports:

- `game.js -> mode-catalog.js`
- `game.js -> game-rpg.js`
- `renderer.js -> mode-catalog.js`
- `game-rpg.js -> js/rpg/*`
- `game-rpg.js -> js/3d/player-model.js`
- `game-rpg.js -> js/3d/utils.js`
- `js/rpg/* -> js/rpg/constants-rpg.js`
- `js/rpg/npc.js -> js/3d/utils.js`
- `js/rpg/zone.js -> js/3d/utils.js`, `js/rpg/constants-rpg.js`

Forbidden imports:

- No `js/rpg/*` module imports from `game-rpg.js`.
- No RPG module imports from `game3d.js`.
- No 2D modules import RPG modules.
- No branch-to-branch imports.

## Follow-Up Beads After Slice

Create separate beads after this slice for:

- Rabbit Village and quest 2.
- Full Act 1 through telescope reveal.
- Reputation and village visual states.
- Journal stickers.
- Follower buddy.
- World map node UI.
- Vehicles.
- Skill tree.
- Boss and finale systems.
