# Rescue Hub Guided Local Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the overlapping Rescue Hub controls with a responsive illustrated local map, single-click mouse navigation, spatial keyboard focus, and dismissible guidance that lasts only through `The Hero Sign-Up Sheet`.

**Architecture:** Keep persistence and content in the existing RPG trunks, add pure guide-policy and map-geometry trunks, and let `js/game-rpg.js` compose them with the Canvas HUD. Drawing, hit testing, keyboard navigation, and debug output consume the same serializable layout objects so visual focus and activation cannot drift apart.

**Tech Stack:** Vanilla JavaScript ES modules, Canvas 2D, browser `Image`, localStorage, Node `assert/strict`, Puppeteer, ImageGen raster assets, ImageMagick verification.

---

## Scope and Current Evidence

This plan implements approved bead `Leopard vs Zombies-9i5` and design spec `docs/superpowers/specs/2026-07-21-rescue-hub-guided-local-map-design.md`.

Current behavior that this plan replaces:

- `js/game-rpg.js:73-84` puts NPCs before interactables and stores a numeric `selectedFocus`, so Granny Thistle receives fresh-save focus instead of the Quest Board.
- `js/game-rpg.js:370-381` wraps through a flat focus list, so arrow direction does not match the visible map.
- `js/game-rpg.js:691-704` handles pointer activation only on save selection.
- `js/game-rpg.js:718-720` registers pointer, mouse, and touch activation listeners for the same handler.
- `js/rpg/hud-rpg.js:216-291` projects labels directly from world coordinates, producing overlaps.
- `js/rpg/hud-rpg.js:320-409` draws Quest Board and World Map rows without reusable hit rectangles.
- `index.html:38-40` disables pointer events on the shared HUD canvas; RPG must temporarily enable them and restore the prior inline style during cleanup.

## File Map

Create:

- `js/rpg/guidance-rpg.js` — pure first-quest guide derivation; no DOM, drawing, storage writes, or mutable state.
- `js/rpg/hub-map-layout.js` — pure responsive landmark, guide, prompt, hit-test, and directional-navigation geometry.
- `assets/rpg/rescue-hub-map-landscape.png` — clean Storybook Camp Diorama background for landscape viewports.
- `assets/rpg/rescue-hub-map-portrait.png` — clean Storybook Camp Diorama background for portrait viewports.
- `test-results/test-rpg-hub-navigation.mjs` — pure Node coverage for guide policy and all layout ports.

Modify:

- `js/rpg/save-system.js` — default and normalize `flags.firstQuestGuideDismissed`.
- `js/rpg/hud-rpg.js` — shared menu layouts/hit tests, illustrated hub rendering, guide beacon, progress counters, and fallback rendering.
- `js/game-rpg.js` — string focus ID, guide/layout composition, image preloading, pointer input, spatial arrows, dismissal writes, and debug geometry.
- `test-results/test-rpg-alpha-data-flow.mjs` — save compatibility and dismissal persistence.
- `test-results/test-rpg-alpha-mode-flow.mjs` — hover, single-click, full first-quest guide, dismissal, fallback, and responsive screenshots.
- `docs/superpowers/specs/2026-07-21-rescue-hub-guided-local-map-design.md` — record written-spec approval.

Do not modify quest definitions, rewards, later-quest progression, combat controls, gathering controls, save version, 2D Classic, or 3D Survivor.

## Shared Contracts

Use these IDs everywhere:

```javascript
const GUIDE_TARGETS = {
  questBoard: 'questBoard',
  heroSignupRow: 'quest:heroSignup',
  worldMap: 'worldMap',
  forestEdge: 'zone:forestEdge',
};
```

The hub focus value is a landmark ID string, not an array index. `selectedQuest` and `selectedMapEntry` remain numeric because those screens already use ordered content arrays.

The guide policy returns plain data:

```javascript
{
  active: true,
  step: 'open-quest-board',
  targetId: 'questBoard',
  title: 'FIRST RESCUE',
  instruction: 'NEXT: Open the Quest Board',
  progress: null,
  dismissible: true,
}
```

The layout ports return rectangles in HUD canvas buffer coordinates. Pointer conversion remains CSS-to-buffer scaled in `getHudPoint()`.

### Task 1: Preserve the guide dismissal flag

**Files:**

- Modify: `test-results/test-rpg-alpha-data-flow.mjs:55-145`
- Modify: `js/rpg/save-system.js:60-85,165-171`

- [ ] **Step 1: Add failing save-schema assertions**

Add these assertions to `testSaveSlots()` after the existing default flag assertion:

```javascript
equal(defaultSave.flags.firstQuestGuideDismissed, false, 'new saves show the first-quest guide');

const legacySave = saves.normalizeSave({
  ...defaultSave,
  flags: { spaceshipWitness: true },
});
equal(legacySave.flags.firstQuestGuideDismissed, false, 'legacy saves default the optional guide flag to false');
```

In `testSaveReload()`, set and verify the persisted value:

```javascript
save.flags.firstQuestGuideDismissed = true;
```

```javascript
equal(loaded.flags.firstQuestGuideDismissed, true, 'guide dismissal persists after reload');
```

- [ ] **Step 2: Run the focused tests and confirm the failure**

Run:

```bash
node test-results/test-rpg-alpha-data-flow.mjs --case save-slots
```

Expected: FAIL because `firstQuestGuideDismissed` is `undefined`.

- [ ] **Step 3: Add the optional boolean to defaults and normalization**

Add the field to `createDefaultSave()`:

```javascript
flags: {
  spaceshipWitness: false,
  alphaEndCardSeen: false,
  alphaEndCardUnlocked: false,
  bananaCannonPayoff: false,
  firstQuestGuideDismissed: false,
},
```

Add the field to the explicit normalized flag object:

```javascript
save.flags = {
  spaceshipWitness: Boolean(flags.spaceshipWitness),
  alphaEndCardSeen: Boolean(flags.alphaEndCardSeen),
  alphaEndCardUnlocked: Boolean(flags.alphaEndCardUnlocked),
  bananaCannonPayoff: Boolean(flags.bananaCannonPayoff),
  firstQuestGuideDismissed: Boolean(flags.firstQuestGuideDismissed),
};
```

Keep `RPG_SAVE_VERSION` at `1`; this is a backward-compatible optional field.

- [ ] **Step 4: Run both save cases**

Run:

```bash
node test-results/test-rpg-alpha-data-flow.mjs --case save-slots
node test-results/test-rpg-alpha-data-flow.mjs --case save-reload
```

Expected: both cases print `PASS` and exit `0`.

- [ ] **Step 5: Commit the persistence slice**

```bash
git add js/rpg/save-system.js test-results/test-rpg-alpha-data-flow.mjs
git commit -m "feat: persist first quest guide dismissal"
```

### Task 2: Derive first-quest guidance from save state

**Files:**

- Create: `js/rpg/guidance-rpg.js`
- Create: `test-results/test-rpg-hub-navigation.mjs`

- [ ] **Step 1: Create the failing guide-policy test**

Create `test-results/test-rpg-hub-navigation.mjs` with:

```javascript
import { deepStrictEqual, equal } from 'assert/strict';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');

async function importRpgModule(fileName) {
  const url = pathToFileURL(join(PROJECT_ROOT, 'js/rpg', fileName)).href;
  return import(`${url}?t=${Date.now()}`);
}

function makeSave() {
  return {
    currentZone: 'hub',
    flags: { firstQuestGuideDismissed: false },
    quests: { active: null, completed: [], progress: {} },
  };
}

async function testGuidance() {
  const { deriveFirstQuestGuide } = await importRpgModule('guidance-rpg.js');
  const save = makeSave();

  let guide = deriveFirstQuestGuide({ save, screen: 'hub' });
  equal(guide.step, 'open-quest-board');
  equal(guide.targetId, 'questBoard');
  equal(guide.instruction, 'NEXT: Open the Quest Board');

  guide = deriveFirstQuestGuide({ save, screen: 'questBoard' });
  equal(guide.step, 'accept-hero-signup');
  equal(guide.targetId, 'quest:heroSignup');

  save.quests.active = 'heroSignup';
  save.quests.progress.heroSignup = { wood: 2, tutorialZombies: 1 };
  guide = deriveFirstQuestGuide({ save, screen: 'hub' });
  equal(guide.step, 'travel-to-forest-edge');
  equal(guide.targetId, 'worldMap');

  guide = deriveFirstQuestGuide({ save, screen: 'worldMap' });
  equal(guide.step, 'choose-forest-edge');
  equal(guide.targetId, 'zone:forestEdge');

  save.currentZone = 'forestEdge';
  guide = deriveFirstQuestGuide({ save, screen: 'zone' });
  equal(guide.step, 'forest-edge-objectives');
  deepStrictEqual(guide.progress, {
    wood: { current: 2, required: 5, label: 'Wood' },
    tutorialZombies: { current: 1, required: 3, label: 'Zombies' },
  });

  save.flags.firstQuestGuideDismissed = true;
  equal(deriveFirstQuestGuide({ save, screen: 'zone' }).active, false);

  save.flags.firstQuestGuideDismissed = false;
  save.quests.active = null;
  save.quests.completed = ['heroSignup'];
  equal(deriveFirstQuestGuide({ save, screen: 'hub' }).active, false);

  save.quests.completed = [];
  save.quests.active = 'bunnyRescue';
  equal(deriveFirstQuestGuide({ save, screen: 'hub' }).active, false);

  console.log('PASS: guidance');
}

await testGuidance();
```

- [ ] **Step 2: Run the test and confirm the missing-module failure**

Run:

```bash
node test-results/test-rpg-hub-navigation.mjs
```

Expected: FAIL with `Cannot find module .../guidance-rpg.js`.

- [ ] **Step 3: Implement the pure guide policy**

Create `js/rpg/guidance-rpg.js`:

```javascript
/**
 * @module rpg/guidance-rpg
 * @description Pure first-quest guidance policy for Animal Rescue.
 *
 * Dependencies: constants-rpg.js
 * Exports: deriveFirstQuestGuide
 */

import { QUEST_DEFINITIONS } from './constants-rpg.js';

const HERO_QUEST = QUEST_DEFINITIONS.heroSignup;

function inactiveGuide() {
  return {
    active: false,
    step: null,
    targetId: null,
    title: '',
    instruction: '',
    progress: null,
    dismissible: false,
  };
}

function activeGuide(step, targetId, title, instruction, progress = null) {
  return {
    active: true,
    step,
    targetId,
    title,
    instruction,
    progress,
    dismissible: true,
  };
}

function progressValue(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.trunc(number)) : 0;
}

export function deriveFirstQuestGuide({ save, screen }) {
  if (!save || save.flags?.firstQuestGuideDismissed) return inactiveGuide();

  const completed = Array.isArray(save.quests?.completed) ? save.quests.completed : [];
  if (completed.includes(HERO_QUEST.id)) return inactiveGuide();

  const activeQuestId = save.quests?.active || null;
  if (activeQuestId && activeQuestId !== HERO_QUEST.id) return inactiveGuide();

  if (!activeQuestId) {
    if (screen === 'questBoard') {
      return activeGuide(
        'accept-hero-signup',
        'quest:heroSignup',
        HERO_QUEST.title,
        'Accept The Hero Sign-Up Sheet',
      );
    }
    return activeGuide(
      'open-quest-board',
      'questBoard',
      'FIRST RESCUE',
      'NEXT: Open the Quest Board',
    );
  }

  if (screen === 'worldMap') {
    return activeGuide(
      'choose-forest-edge',
      'zone:forestEdge',
      'FIRST RESCUE',
      'Choose Forest Edge',
    );
  }

  if (screen === 'zone' && save.currentZone === HERO_QUEST.destinationZone) {
    const progress = save.quests?.progress?.[HERO_QUEST.id] || {};
    return activeGuide(
      'forest-edge-objectives',
      null,
      HERO_QUEST.title,
      'Finish both objectives',
      {
        wood: { current: progressValue(progress.wood), required: 5, label: 'Wood' },
        tutorialZombies: {
          current: progressValue(progress.tutorialZombies),
          required: 3,
          label: 'Zombies',
        },
      },
    );
  }

  if (screen === 'hub') {
    return activeGuide(
      'travel-to-forest-edge',
      'worldMap',
      'FIRST RESCUE',
      'NEXT: Travel to Forest Edge',
    );
  }

  return inactiveGuide();
}
```

- [ ] **Step 4: Run the guide-policy test**

Run:

```bash
node test-results/test-rpg-hub-navigation.mjs
```

Expected: `PASS: guidance`.

- [ ] **Step 5: Commit the policy slice**

```bash
git add js/rpg/guidance-rpg.js test-results/test-rpg-hub-navigation.mjs
git commit -m "feat: derive first quest guidance"
```

### Task 3: Build responsive hub geometry and spatial navigation

**Files:**

- Create: `js/rpg/hub-map-layout.js`
- Modify: `test-results/test-rpg-hub-navigation.mjs`

- [ ] **Step 1: Extend the pure test with geometry coverage**

Add these helpers and `testLayout()` before the final call in `test-results/test-rpg-hub-navigation.mjs`:

```javascript
function intersects(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function assertInside(rect, width, height, label) {
  equal(rect.x >= 0 && rect.y >= 0 && rect.x + rect.w <= width && rect.y + rect.h <= height, true, label);
}

function assertNoPairOverlap(rects, label) {
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      equal(intersects(rects[i], rects[j]), false, `${label}: ${i} and ${j}`);
    }
  }
}

const LANDMARKS = [
  ['questBoard', 'Quest Board'],
  ['grannyThistle', 'Granny Thistle'],
  ['craftingBench', 'Crafting Bench'],
  ['scoutHazel', 'Scout Hazel'],
  ['playerTent', 'Player Tent'],
  ['momoForeman', 'Momo Foreman'],
  ['shellbert', 'Shellbert'],
  ['storageChest', 'Storage Chest'],
  ['worldMap', 'World Map'],
].map(([id, label]) => ({ id, label }));

async function testLayout() {
  const {
    getDirectionalNeighbor,
    getHubMapLayout,
    hitTestHubMap,
  } = await importRpgModule('hub-map-layout.js');

  for (const [width, height] of [[960, 540], [1280, 720], [390, 844]]) {
    const layout = getHubMapLayout({
      width,
      height,
      landmarks: LANDMARKS,
      focusId: 'questBoard',
      guideTargetId: 'questBoard',
    });

    assertInside(layout.mapRect, width, height, `${width}x${height} map inside viewport`);
    assertInside(layout.objectiveRect, width, height, `${width}x${height} objective inside viewport`);
    assertInside(layout.promptRect, width, height, `${width}x${height} prompt inside viewport`);
    assertInside(layout.dismissRect, width, height, `${width}x${height} dismiss inside viewport`);
    layout.landmarks.forEach(item => {
      assertInside(item.iconRect, width, height, `${item.id} icon inside viewport`);
      assertInside(item.labelRect, width, height, `${item.id} label inside viewport`);
      assertInside(item.hitRect, width, height, `${item.id} hit target inside viewport`);
      equal(intersects(item.hitRect, layout.objectiveRect), false, `${item.id} clears objective beacon`);
      equal(intersects(item.hitRect, layout.promptRect), false, `${item.id} clears bottom prompt`);
      const hit = hitTestHubMap(layout, item.hitRect.x + item.hitRect.w / 2, item.hitRect.y + item.hitRect.h / 2);
      equal(hit.id, item.id, `${item.id} center hit resolves correctly`);
    });
    assertNoPairOverlap(layout.landmarks.map(item => item.hitRect), `${width}x${height} hit targets do not overlap`);
    assertNoPairOverlap(layout.landmarks.filter(item => item.showLabel).map(item => item.labelRect), `${width}x${height} visible labels do not overlap`);
  }

  const layout = getHubMapLayout({
    width: 960,
    height: 540,
    landmarks: LANDMARKS,
    focusId: 'questBoard',
    guideTargetId: 'questBoard',
  });
  equal(getDirectionalNeighbor(layout, 'questBoard', 'right'), 'grannyThistle');
  equal(getDirectionalNeighbor(layout, 'questBoard', 'down'), 'playerTent');
  equal(getDirectionalNeighbor(layout, 'questBoard', 'left'), null);
  equal(getDirectionalNeighbor(layout, 'questBoard', 'up'), null);
  deepStrictEqual(
    hitTestHubMap(layout, layout.dismissRect.x + 2, layout.dismissRect.y + 2),
    { type: 'dismiss', id: 'firstQuestGuide' },
  );

  console.log('PASS: layout');
}
```

Replace the final call with:

```javascript
await testGuidance();
await testLayout();
```

- [ ] **Step 2: Run the test and confirm the missing-module failure**

Run:

```bash
node test-results/test-rpg-hub-navigation.mjs
```

Expected: guide assertions pass, then import fails for `hub-map-layout.js`.

- [ ] **Step 3: Implement the pure layout trunk**

Create `js/rpg/hub-map-layout.js`:

```javascript
/**
 * @module rpg/hub-map-layout
 * @description Pure responsive geometry and navigation for the Rescue Hub map.
 *
 * Dependencies: none
 * Exports: getGuideOverlayLayout, getHubMapLayout, hitTestGuideDismiss,
 *   hitTestHubMap, getDirectionalNeighbor
 */

const ANCHORS = {
  landscape: {
    questBoard: [0.125, 0.16],
    grannyThistle: [0.375, 0.16],
    craftingBench: [0.625, 0.16],
    scoutHazel: [0.875, 0.16],
    playerTent: [0.125, 0.5],
    momoForeman: [0.375, 0.5],
    shellbert: [0.625, 0.5],
    storageChest: [0.875, 0.5],
    worldMap: [0.5, 0.84],
  },
  portrait: {
    questBoard: [0.17, 0.15],
    grannyThistle: [0.5, 0.15],
    craftingBench: [0.83, 0.15],
    scoutHazel: [0.17, 0.5],
    worldMap: [0.5, 0.5],
    playerTent: [0.83, 0.5],
    momoForeman: [0.17, 0.85],
    shellbert: [0.5, 0.85],
    storageChest: [0.83, 0.85],
  },
};

function rect(x, y, w, h) {
  return { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) };
}

function contains(rectangle, x, y) {
  return Boolean(rectangle)
    && x >= rectangle.x
    && x <= rectangle.x + rectangle.w
    && y >= rectangle.y
    && y <= rectangle.y + rectangle.h;
}

function center(rectangle) {
  return { x: rectangle.x + rectangle.w / 2, y: rectangle.y + rectangle.h / 2 };
}

export function getGuideOverlayLayout(width, height) {
  const orientation = width / height >= 1.15 ? 'landscape' : 'portrait';
  const objectiveW = orientation === 'landscape' ? Math.min(620, width - 36) : width - 24;
  const objectiveH = orientation === 'landscape' ? 62 : 76;
  const objectiveRect = rect((width - objectiveW) / 2, 82, objectiveW, objectiveH);
  const dismissRect = rect(
    objectiveRect.x + objectiveRect.w - 38,
    objectiveRect.y + 10,
    28,
    28,
  );
  return { orientation, objectiveRect, dismissRect };
}

export function getHubMapLayout({ width, height, landmarks, focusId, guideTargetId }) {
  const overlay = guideTargetId ? getGuideOverlayLayout(width, height) : null;
  const orientation = width / height >= 1.15 ? 'landscape' : 'portrait';
  const promptH = orientation === 'landscape' ? 76 : 96;
  const promptRect = rect(orientation === 'landscape' ? 22 : 12, height - promptH - 12, orientation === 'landscape' ? width - 44 : width - 24, promptH);
  const mapTop = overlay ? overlay.objectiveRect.y + overlay.objectiveRect.h + 10 : 82;
  const mapRect = rect(orientation === 'landscape' ? 20 : 12, mapTop, orientation === 'landscape' ? width - 40 : width - 24, promptRect.y - mapTop - 10);
  const anchorSet = ANCHORS[orientation];
  const fallbackColumns = orientation === 'landscape' ? 4 : 3;

  const sourceLandmarks = Array.isArray(landmarks) ? landmarks : [];
  const placed = sourceLandmarks.map((landmark, index) => {
    const fallback = [
      ((index % fallbackColumns) + 0.5) / fallbackColumns,
      (Math.floor(index / fallbackColumns) + 0.5) / Math.ceil(Math.max(1, sourceLandmarks.length) / fallbackColumns),
    ];
    const [nx, ny] = anchorSet[landmark.id] || fallback;
    const point = {
      x: mapRect.x + mapRect.w * nx,
      y: mapRect.y + mapRect.h * ny,
    };
    const hitW = orientation === 'landscape' ? 136 : 100;
    const hitH = orientation === 'landscape' ? 74 : 80;
    const labelW = orientation === 'landscape' ? 128 : 96;
    const labelH = 26;
    return {
      ...landmark,
      point,
      iconRect: rect(point.x - 22, point.y - 26, 44, 44),
      labelRect: rect(point.x - labelW / 2, point.y + 18, labelW, labelH),
      hitRect: rect(point.x - hitW / 2, point.y - 30, hitW, hitH),
      showLabel: orientation === 'landscape' || landmark.id === focusId || landmark.id === guideTargetId,
    };
  });

  return {
    orientation,
    mapRect,
    landmarks: placed,
    objectiveRect: overlay?.objectiveRect || null,
    dismissRect: overlay?.dismissRect || null,
    promptRect,
  };
}

export function hitTestGuideDismiss(layout, x, y) {
  return contains(layout?.dismissRect, x, y)
    ? { type: 'dismiss', id: 'firstQuestGuide' }
    : null;
}

export function hitTestHubMap(layout, x, y) {
  const dismiss = hitTestGuideDismiss(layout, x, y);
  if (dismiss) return dismiss;
  const landmark = layout?.landmarks?.find(item => contains(item.hitRect, x, y));
  return landmark ? { type: 'landmark', id: landmark.id } : null;
}

export function getDirectionalNeighbor(layout, currentId, direction) {
  const current = layout?.landmarks?.find(item => item.id === currentId);
  if (!current) return null;
  const origin = center(current.hitRect);
  const vectors = {
    left: [-1, 0],
    right: [1, 0],
    up: [0, -1],
    down: [0, 1],
  };
  const vector = vectors[direction];
  if (!vector) return null;

  const candidates = layout.landmarks
    .filter(item => item.id !== currentId)
    .map(item => {
      const target = center(item.hitRect);
      const dx = target.x - origin.x;
      const dy = target.y - origin.y;
      const primary = dx * vector[0] + dy * vector[1];
      const perpendicular = Math.abs(dx * vector[1] - dy * vector[0]);
      return { id: item.id, primary, score: primary + perpendicular * 1.75 };
    })
    .filter(item => item.primary > 0.5)
    .sort((a, b) => a.score - b.score || a.id.localeCompare(b.id));

  return candidates[0]?.id || null;
}
```

- [ ] **Step 4: Run the pure navigation suite**

Run:

```bash
node test-results/test-rpg-hub-navigation.mjs
```

Expected: `PASS: guidance` and `PASS: layout`.

- [ ] **Step 5: Commit the geometry slice**

```bash
git add js/rpg/hub-map-layout.js test-results/test-rpg-hub-navigation.mjs
git commit -m "feat: add responsive hub map layout"
```

### Task 4: Generate clean landscape and portrait map art

**Files:**

- Reference: `docs/art/rpg-rescue-hub-local-map-selected.png`
- Create: `assets/rpg/rescue-hub-map-landscape.png`
- Create: `assets/rpg/rescue-hub-map-portrait.png`

- [ ] **Step 1: Generate the landscape background with ImageGen**

Use the `imagegen` skill and provide `docs/art/rpg-rescue-hub-local-map-selected.png` as the image reference. Use this exact art direction:

```text
Edit the provided Storybook Camp Diorama reference into a clean 16:9 production game background for the Animal Rescue Rescue Hub. Preserve the softly isometric storybook forest-camp style, warm painted lighting, mossy greens, golden paths, rounded friendly props, and cozy rescue-adventure mood. Show nine clearly separated landmark areas arranged across three spacious visual bands: quest board, rabbit elder clearing, crafting bench, fox scout post, player tent, monkey work area, turtle rest area, storage chest, and a central lower world-map table. Connect the areas with readable dirt paths and keep every landmark fully visible. Background scenery and landmark artwork only. Remove every word, letter, number, label, tutorial panel, objective box, arrow, glow, button, border, HUD element, and cursor. No baked user interface. Keep the center and top margins calm enough for dynamic Canvas overlays.
```

Save the generated PNG as `assets/rpg/rescue-hub-map-landscape.png`.

- [ ] **Step 2: Generate the portrait background with ImageGen**

Use the same reference with this exact art direction:

```text
Edit the provided Storybook Camp Diorama reference into a clean tall portrait production game background for the Animal Rescue Rescue Hub, designed for a 390 by 844 phone viewport. Preserve the softly isometric storybook forest-camp style, warm painted lighting, mossy greens, golden paths, rounded friendly props, and cozy rescue-adventure mood. Arrange nine clearly separated landmark areas in a tall three-column by three-row map: quest board, rabbit elder clearing, crafting bench, fox scout post, world-map table, player tent, monkey work area, turtle rest area, and storage chest. Connect the areas with readable dirt paths, keep every landmark fully visible, and reserve calm space at the top and bottom for dynamic Canvas overlays. Background scenery and landmark artwork only. Remove every word, letter, number, label, tutorial panel, objective box, arrow, glow, button, border, HUD element, and cursor. No baked user interface.
```

Save the generated PNG as `assets/rpg/rescue-hub-map-portrait.png`.

- [ ] **Step 3: Inspect both assets and verify their orientation**

Run:

```bash
identify assets/rpg/rescue-hub-map-landscape.png assets/rpg/rescue-hub-map-portrait.png
```

Expected: both files are PNG; landscape width is greater than height; portrait height is greater than width.

Open both images with the local image viewer. Verify that there is no text or UI, all nine landmark areas are visible, and no landmark touches an edge.

- [ ] **Step 4: Commit the production art**

```bash
git add assets/rpg/rescue-hub-map-landscape.png assets/rpg/rescue-hub-map-portrait.png
git commit -m "art: add Rescue Hub local map backgrounds"
```

### Task 5: Render the map, beacon, and clickable menu geometry

**Files:**

- Modify: `js/rpg/hud-rpg.js:1-474`
- Modify: `test-results/test-rpg-hub-navigation.mjs`

- [ ] **Step 1: Add failing Quest Board and World Map geometry tests**

Add this function to `test-results/test-rpg-hub-navigation.mjs` and call it after `testLayout()`:

```javascript
async function testScreenLayouts() {
  const {
    getQuestBoardLayout,
    getWorldMapLayout,
    hitTestQuestBoard,
    hitTestWorldMap,
  } = await importRpgModule('hud-rpg.js');

  for (const [width, height] of [[960, 540], [1280, 720], [390, 844]]) {
    const quests = getQuestBoardLayout(width, height, 1, true);
    equal(quests.rows.length, 1);
    assertInside(quests.objectiveRect, width, height, `${width}x${height} quest beacon inside`);
    assertInside(quests.dismissRect, width, height, `${width}x${height} quest dismiss inside`);
    assertInside(quests.rows[0].rect, width, height, `${width}x${height} quest row inside`);
    deepStrictEqual(
      hitTestQuestBoard(quests, quests.rows[0].rect.x + 2, quests.rows[0].rect.y + 2),
      { type: 'quest', index: 0 },
    );

    const world = getWorldMapLayout(width, height, 6, true);
    equal(world.cards.length, 6);
    assertInside(world.objectiveRect, width, height, `${width}x${height} map beacon inside`);
    assertInside(world.dismissRect, width, height, `${width}x${height} map dismiss inside`);
    world.cards.forEach(card => assertInside(card.rect, width, height, `${width}x${height} map card inside`));
    deepStrictEqual(
      hitTestWorldMap(world, world.cards[1].rect.x + 2, world.cards[1].rect.y + 2),
      { type: 'zone', index: 1 },
    );
  }

  console.log('PASS: screen-layouts');
}
```

Final calls:

```javascript
await testGuidance();
await testLayout();
await testScreenLayouts();
```

- [ ] **Step 2: Run the test and confirm the missing-export failure**

Run:

```bash
node test-results/test-rpg-hub-navigation.mjs
```

Expected: FAIL because the four menu geometry exports do not exist.

- [ ] **Step 3: Add shared menu layouts and hit tests to the HUD module**

Import the guide geometry:

```javascript
import { getGuideOverlayLayout } from './hub-map-layout.js';
```

Add these exports after `hitTestSaveSlot()`:

```javascript
function pointInRect(rect, x, y) {
  return Boolean(rect) && x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

export function getQuestBoardLayout(width, height, count, guideActive = false) {
  const overlay = guideActive ? getGuideOverlayLayout(width, height) : null;
  const x = Math.max(28, width * 0.12);
  const y = overlay ? overlay.objectiveRect.y + overlay.objectiveRect.h + 12 : Math.max(112, height * 0.22);
  const panelW = Math.min(720, width - x * 2);
  const panelH = Math.max(104, Math.min(320, height - y - 62));
  const rows = Array.from({ length: count }, (_, index) => ({
    index,
    rect: {
      x: Math.round(x + 18),
      y: Math.round(y + 28 + index * 94),
      w: Math.round(panelW - 36),
      h: 78,
    },
  }));
  return {
    panelRect: { x: Math.round(x), y: Math.round(y), w: Math.round(panelW), h: Math.round(panelH) },
    rows,
    objectiveRect: overlay?.objectiveRect || null,
    dismissRect: overlay?.dismissRect || null,
  };
}

export function hitTestQuestBoard(layout, x, y) {
  const row = layout?.rows?.find(item => pointInRect(item.rect, x, y));
  return row ? { type: 'quest', index: row.index } : null;
}

export function getWorldMapLayout(width, height, count, guideActive = false) {
  const overlay = guideActive ? getGuideOverlayLayout(width, height) : null;
  const cols = width >= 760 ? 3 : 2;
  const gap = 14;
  const margin = Math.max(24, Math.min(54, width * 0.08));
  const cardW = Math.floor((width - margin * 2 - gap * (cols - 1)) / cols);
  const cardH = width >= 760 ? 102 : 88;
  const startY = overlay ? overlay.objectiveRect.y + overlay.objectiveRect.h + 12 : Math.max(104, height * 0.22);
  const cards = Array.from({ length: count }, (_, index) => ({
    index,
    rect: {
      x: margin + (index % cols) * (cardW + gap),
      y: Math.round(startY + Math.floor(index / cols) * (cardH + gap)),
      w: cardW,
      h: cardH,
    },
  }));
  return {
    cards,
    objectiveRect: overlay?.objectiveRect || null,
    dismissRect: overlay?.dismissRect || null,
  };
}

export function hitTestWorldMap(layout, x, y) {
  const card = layout?.cards?.find(item => pointInRect(item.rect, x, y));
  return card ? { type: 'zone', index: card.index } : null;
}
```

- [ ] **Step 4: Replace the hub token renderer with art-aware dynamic UI**

Keep `drawBackground()` as the functional fallback. Replace `drawHubGround()`, `hubPoint()`, `drawHubToken()`, and `drawHub()` with these responsibilities and exact rendering rules:

```javascript
function drawImageContained(ctx, image, width, height) {
  const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
  const drawW = image.naturalWidth * scale;
  const drawH = image.naturalHeight * scale;
  ctx.drawImage(image, (width - drawW) / 2, (height - drawH) / 2, drawW, drawH);
}

function drawHubFallback(ctx, layout) {
  drawBackground(ctx, ctx.canvas.width, ctx.canvas.height);
  ctx.fillStyle = '#29452a';
  roundedRect(ctx, layout.mapRect.x, layout.mapRect.y, layout.mapRect.w, layout.mapRect.h, 18);
  ctx.fill();
  ctx.strokeStyle = '#82a36d';
  ctx.lineWidth = 3;
  ctx.stroke();
}

function drawGuideBeacon(ctx, guide, layout) {
  if (!guide?.active || !layout?.objectiveRect) return;
  const rect = layout.objectiveRect;
  ctx.fillStyle = 'rgba(12, 23, 18, 0.94)';
  roundedRect(ctx, rect.x, rect.y, rect.w, rect.h, 12);
  ctx.fill();
  ctx.strokeStyle = '#f5d66b';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.textAlign = 'left';
  ctx.fillStyle = '#f5d66b';
  fitText(ctx, guide.title, rect.w - 72, 15, 11);
  ctx.fillText(guide.title, rect.x + 18, rect.y + 24);
  ctx.fillStyle = '#fff1a6';
  fitText(ctx, guide.instruction, rect.w - 72, 17, 11);
  ctx.fillText(guide.instruction, rect.x + 18, rect.y + 48);
  if (guide.progress) {
    const progress = `Wood ${guide.progress.wood.current}/${guide.progress.wood.required}   Zombies ${guide.progress.tutorialZombies.current}/${guide.progress.tutorialZombies.required}`;
    ctx.fillStyle = '#d8e4c5';
    fitText(ctx, progress, rect.w - 72, 14, 10, '"Courier New", monospace', 'normal');
    ctx.fillText(progress, rect.x + 18, rect.y + rect.h - 10);
  }
  if (guide.dismissible && layout.dismissRect) {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#d8e4c5';
    ctx.font = 'bold 18px "Courier New", monospace';
    ctx.fillText('X', layout.dismissRect.x + layout.dismissRect.w / 2, layout.dismissRect.y + 20);
  }
}

function drawLandmark(ctx, item, focused, guided) {
  const icon = item.iconRect;
  ctx.fillStyle = guided ? '#fff1a6' : focused ? '#d8e4c5' : 'rgba(18, 35, 25, 0.82)';
  roundedRect(ctx, icon.x, icon.y, icon.w, icon.h, 12);
  ctx.fill();
  ctx.strokeStyle = guided ? '#f5d66b' : focused ? '#eef6dc' : 'rgba(255,255,255,0.42)';
  ctx.lineWidth = guided ? 4 : focused ? 3 : 1;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = focused || guided ? '#1b2419' : '#eef6dc';
  ctx.font = 'bold 14px "Courier New", monospace';
  ctx.fillText(item.label.slice(0, 1).toUpperCase(), icon.x + icon.w / 2, icon.y + 28);

  if (item.showLabel) {
    const label = item.labelRect;
    ctx.fillStyle = 'rgba(7, 14, 12, 0.9)';
    roundedRect(ctx, label.x, label.y, label.w, label.h, 7);
    ctx.fill();
    ctx.strokeStyle = guided ? '#f5d66b' : 'rgba(216, 228, 197, 0.45)';
    ctx.lineWidth = guided ? 2 : 1;
    ctx.stroke();
    ctx.fillStyle = guided ? '#fff1a6' : '#eef6dc';
    fitText(ctx, item.label, label.w - 10, 12, 9);
    ctx.fillText(item.label, label.x + label.w / 2, label.y + 17);
  }

  if (guided) {
    ctx.fillStyle = '#f5d66b';
    ctx.beginPath();
    ctx.moveTo(icon.x + icon.w / 2, icon.y - 10);
    ctx.lineTo(icon.x + icon.w / 2 - 9, icon.y - 24);
    ctx.lineTo(icon.x + icon.w / 2 + 9, icon.y - 24);
    ctx.closePath();
    ctx.fill();
  }
}

export function drawHub(ctx, view) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const hub = view.hub;
  const layout = hub.layout;
  const focus = view.focusItem;
  const activeQuest = view.activeQuest;
  const mapAsset = hub.mapAsset;

  ctx.clearRect(0, 0, w, h);
  if (mapAsset?.status === 'ready' && mapAsset.image) {
    ctx.fillStyle = '#17291b';
    ctx.fillRect(0, 0, w, h);
    drawImageContained(ctx, mapAsset.image, w, h);
  } else {
    drawHubFallback(ctx, layout);
  }

  drawTopBar(ctx, 'Rescue Hub', activeQuest ? activeQuest.objective : 'Safe camp');
  layout.landmarks.forEach(item => {
    drawLandmark(ctx, item, focus?.id === item.id, view.guide?.targetId === item.id);
  });
  drawGuideBeacon(ctx, view.guide, layout);

  ctx.fillStyle = 'rgba(8, 15, 14, 0.9)';
  roundedRect(ctx, layout.promptRect.x, layout.promptRect.y, layout.promptRect.w, layout.promptRect.h, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(216, 228, 197, 0.42)';
  ctx.stroke();
  ctx.textAlign = 'left';
  ctx.fillStyle = '#f5d66b';
  fitText(ctx, focus ? focus.label : 'Rescue Hub', layout.promptRect.w - 34, 18, 12);
  ctx.fillText(focus ? focus.label : 'Rescue Hub', layout.promptRect.x + 18, layout.promptRect.y + 31);
  ctx.fillStyle = '#d8e4c5';
  ctx.font = '14px "Courier New", monospace';
  const prompt = activeQuest ? `${activeQuest.title}: ${activeQuest.objective}` : 'Choose a landmark to begin your rescue.';
  fitText(ctx, prompt, layout.promptRect.w - 34, 14, 10, '"Courier New", monospace', 'normal');
  ctx.fillText(prompt, layout.promptRect.x + 18, layout.promptRect.y + 58);
}
```

- [ ] **Step 5: Make Quest Board and World Map drawing consume shared rectangles**

In `drawQuestBoard()`, replace locally calculated panel and row geometry with `view.questBoard.layout`. Draw each row from `layout.rows[index].rect`, and call `drawGuideBeacon(ctx, view.guide, layout)` after `drawTopBar()`. The row drawing body becomes:

```javascript
const layout = view.questBoard.layout;
const { x, y, w: panelW, h: panelH } = layout.panelRect;
drawGuideBeacon(ctx, view.guide, layout);

available.forEach((quest, index) => {
  const row = layout.rows[index].rect;
  ctx.fillStyle = index === selectedQuest ? '#243a22' : '#16251d';
  roundedRect(ctx, row.x, row.y, row.w, row.h, 8);
  ctx.fill();
  ctx.strokeStyle = view.guide?.targetId === `quest:${quest.id}`
    ? '#f5d66b'
    : index === selectedQuest ? '#fff1a6' : 'rgba(216, 228, 197, 0.25)';
  ctx.lineWidth = view.guide?.targetId === `quest:${quest.id}` ? 4 : 2;
  ctx.stroke();
  ctx.fillStyle = index === selectedQuest ? '#fff1a6' : '#eef6dc';
  fitText(ctx, quest.title, row.w - 40, 20, 14);
  ctx.fillText(quest.title, row.x + 20, row.y + 30);
  ctx.fillStyle = '#cbd9bb';
  ctx.font = '14px "Courier New", monospace';
  ctx.fillText(`Destination: ${quest.destinationZone}`, row.x + 20, row.y + 54);
  fitText(ctx, quest.rewardPreview, Math.max(120, row.w * 0.48), 14, 10, '"Courier New", monospace', 'normal');
  ctx.fillText(quest.rewardPreview, row.x + Math.min(262, row.w * 0.44), row.y + 54);
});
```

In `drawWorldMap()`, replace local card geometry with `view.worldMap.layout.cards[index].rect`, call `drawGuideBeacon()`, and set the guide-target border with:

```javascript
const guided = view.guide?.targetId === `zone:${entry.id}`;
ctx.strokeStyle = guided ? '#f5d66b' : isSelected ? '#fff1a6' : entry.unlocked ? '#6da85f' : '#8b6e7a';
ctx.lineWidth = guided ? 4 : isSelected ? 3 : 2;
```

Keep locked-zone text and unlock behavior unchanged.

- [ ] **Step 6: Add first-quest counters to Forest Edge without replacing the normal tracker**

In `drawZone()`, use `view.zoneGuideLayout` and draw the guide only when it exists:

```javascript
const guideLayout = view.zoneGuideLayout;
drawTopBar(ctx, 'Forest Edge', activeQuest ? activeQuest.objective : 'Training path');
if (guideLayout) drawGuideBeacon(ctx, view.guide, guideLayout);

const arenaX = Math.max(34, w * 0.12);
const arenaY = guideLayout
  ? guideLayout.objectiveRect.y + guideLayout.objectiveRect.h + 12
  : Math.max(102, h * 0.22);
const arenaW = Math.min(720, w - arenaX * 2);
const arenaH = Math.max(150, Math.min(282, h - arenaY - 118));
```

The top bar continues to show `activeQuest.objective` after guide dismissal; only `drawGuideBeacon()` and its progress counters disappear.

- [ ] **Step 7: Run pure tests and commit the HUD slice**

Run:

```bash
node test-results/test-rpg-hub-navigation.mjs
node test-results/test-rpg-alpha-data-flow.mjs --case hub-quest-board
```

Expected: all cases print `PASS`.

```bash
git add js/rpg/hud-rpg.js test-results/test-rpg-hub-navigation.mjs
git commit -m "feat: render guided Rescue Hub map"
```

### Task 6: Wire focus, pointer activation, guide dismissal, and asset fallback

**Files:**

- Modify: `test-results/test-rpg-alpha-mode-flow.mjs`
- Modify: `js/game-rpg.js:9-168,221-265,370-478,667-723`

- [ ] **Step 1: Add browser helpers for HUD rectangles**

Add these helpers near `tapKey()` in `test-results/test-rpg-alpha-mode-flow.mjs`:

```javascript
async function hudClientPoint(page, rect) {
  return page.$eval('#hud3d', (canvas, target) => {
    const bounds = canvas.getBoundingClientRect();
    return {
      x: bounds.left + (target.x + target.w / 2) * (bounds.width / canvas.width),
      y: bounds.top + (target.y + target.h / 2) * (bounds.height / canvas.height),
    };
  }, rect);
}

async function moveToHudRect(page, rect) {
  const point = await hudClientPoint(page, rect);
  await page.mouse.move(point.x, point.y);
  await sleep(120);
}

async function clickHudRect(page, rect) {
  const point = await hudClientPoint(page, rect);
  await page.mouse.click(point.x, point.y);
  await sleep(180);
}
```

- [ ] **Step 2: Add a failing guided single-click flow**

Add `guided-hub-pointer` to `CASES` and add this test:

```javascript
async function testGuidedHubPointer() {
  await withBrowser(async browser => {
    const page = await newPage(browser);
    await launchRpgToHub(page);

    let debug = await page.evaluate(() => window.__rpgDebug);
    assert(debug.focusItem.id === 'questBoard', 'fresh hub focuses the Quest Board');
    assert(debug.guide.step === 'open-quest-board', 'fresh hub explains the next action');

    const granny = debug.hub.layout.landmarks.find(item => item.id === 'grannyThistle');
    await moveToHudRect(page, granny.hitRect);
    await page.waitForFunction(() => window.__rpgDebug.focusItem.id === 'grannyThistle');
    assert(true, 'hover and keyboard share hub focus');

    debug = await page.evaluate(() => window.__rpgDebug);
    const board = debug.hub.layout.landmarks.find(item => item.id === 'questBoard');
    await clickHudRect(page, board.hitRect);
    await page.waitForFunction(() => window.__rpgDebug.screen === 'questBoard');
    await sleep(250);
    debug = await page.evaluate(() => window.__rpgDebug);
    assert(debug.activeQuest === null, 'one board click opens the board without duplicate acceptance');
    assert(debug.guide.step === 'accept-hero-signup', 'guide advances to quest acceptance');

    await clickHudRect(page, debug.questBoard.layout.rows[0].rect);
    await page.waitForFunction(() => window.__rpgDebug.screen === 'hub' && window.__rpgDebug.activeQuest?.id === 'heroSignup');
    debug = await page.evaluate(() => window.__rpgDebug);
    assert(debug.guide.step === 'travel-to-forest-edge', 'guide advances to World Map');

    const worldMap = debug.hub.layout.landmarks.find(item => item.id === 'worldMap');
    await clickHudRect(page, worldMap.hitRect);
    await page.waitForFunction(() => window.__rpgDebug.screen === 'worldMap');
    debug = await page.evaluate(() => window.__rpgDebug);
    const forestIndex = debug.worldMap.entries.findIndex(entry => entry.id === 'forestEdge');
    await clickHudRect(page, debug.worldMap.layout.cards[forestIndex].rect);
    await page.waitForFunction(() => window.__rpgDebug.screen === 'zone');

    debug = await page.evaluate(() => window.__rpgDebug);
    assert(debug.guide.progress.wood.current === 0, 'Forest Edge guide starts at Wood 0/5');
    assert(debug.guide.progress.tutorialZombies.current === 0, 'Forest Edge guide starts at Zombies 0/3');

    await tapKey(page, 'KeyG');
    await page.waitForFunction(() => window.__rpgDebug.guide.progress.wood.current > 0);
    debug = await page.evaluate(() => window.__rpgDebug);
    assert(debug.guide.progress.wood.current === 3, 'Wood counter updates after the first stump');
    await tapKey(page, 'KeyG');
    await page.waitForFunction(() => window.__rpgDebug.guide.progress.wood.current === 5);
    await tapKey(page, 'Enter');
    await page.waitForFunction(() => window.__rpgDebug.guide.progress.tutorialZombies.current === 1);
    debug = await page.evaluate(() => window.__rpgDebug);
    assert(debug.guide.progress.tutorialZombies.current === 1, 'Zombie counter updates after the first bonk');
    for (let expectedAlive = 1; expectedAlive >= 0; expectedAlive--) {
      await tapKey(page, 'Enter');
      await page.waitForFunction(alive => window.__rpgDebug.combat?.enemiesAlive === alive || window.__rpgDebug.screen === 'hub', {}, expectedAlive);
    }
    await page.waitForFunction(() => window.__rpgDebug.screen === 'hub' && window.__rpgDebug.activeSave.quests.completed.includes('heroSignup'));
    debug = await page.evaluate(() => window.__rpgDebug);
    assert(debug.guide.active === false, 'guide ends after The Hero Sign-Up Sheet');
    assert(debug.rewardBanner.questTitle === 'The Hero Sign-Up Sheet', 'existing reward banner remains visible');
    page.__assertNoFailures();
  });
}
```

Register the case at the bottom:

```javascript
if (caseName === 'guided-hub-pointer') await testGuidedHubPointer();
```

- [ ] **Step 3: Run the new case and confirm it fails at fresh focus**

Use a free local port:

```bash
PORT=8128
python3 -m http.server "$PORT" >/tmp/lvz-rpg-hub-http.log 2>&1 &
SERVER_PID=$!
trap 'kill "$SERVER_PID" 2>/dev/null || true' EXIT
BASE_URL="http://localhost:$PORT" node test-results/test-rpg-alpha-mode-flow.mjs --case guided-hub-pointer
```

Expected: FAIL because fresh focus is Granny Thistle and hub debug geometry is absent.

- [ ] **Step 4: Import the new ports and replace numeric hub focus**

Add imports to `js/game-rpg.js`:

```javascript
import { deriveFirstQuestGuide } from './rpg/guidance-rpg.js';
import {
  getDirectionalNeighbor,
  getGuideOverlayLayout,
  getHubMapLayout,
  hitTestGuideDismiss,
  hitTestHubMap,
} from './rpg/hub-map-layout.js';
import {
  drawAlphaEndCard,
  drawCrafting,
  drawDialogue,
  drawHub,
  drawInventory,
  drawQuestBoard,
  drawRewardBanner,
  drawSaveSelect,
  drawWorldMap,
  drawZone,
  getQuestBoardLayout,
  getWorldMapLayout,
  hitTestQuestBoard,
  hitTestSaveSlot,
  hitTestWorldMap,
} from './rpg/hud-rpg.js';
```

Replace numeric state with:

```javascript
let selectedFocus = null;
```

Replace `refreshHubState()` with:

```javascript
function refreshHubState() {
  if (!activeSave) return;
  hubZone = createHubZone(activeSave);
  hubNpcs = createHubNpcs(activeSave);
  focusItems = [
    ...hubNpcs.map(npc => ({ type: 'npc', id: npc.id, label: npc.name, x: npc.x, z: npc.z, npc })),
    ...hubZone.interactables.map(item => ({ type: item.kind, id: item.id, label: item.label, x: item.x, z: item.z, item })),
  ];
  const focusIds = new Set(focusItems.map(item => item.id));
  if (!focusIds.has(selectedFocus)) {
    const guideTarget = deriveFirstQuestGuide({ save: activeSave, screen }).targetId;
    selectedFocus = focusIds.has(guideTarget) ? guideTarget : focusItems[0]?.id || null;
  }
  selectedQuest = Math.min(selectedQuest, Math.max(0, getAvailableQuests(activeSave).length - 1));
  selectedMapEntry = Math.min(selectedMapEntry, Math.max(0, getWorldMapEntries(activeSave).length - 1));
}
```

Set `selectedFocus = null` in `startSelectedSlot()` before `refreshHubState()`.

- [ ] **Step 5: Preload both map assets with a non-fatal status**

Add near runtime state:

```javascript
const previousHudPointerEvents = hudCanvas.style.pointerEvents;
const hubMapAssets = {
  landscape: { status: 'loading', image: null, url: new URL('../assets/rpg/rescue-hub-map-landscape.png', import.meta.url).href },
  portrait: { status: 'loading', image: null, url: new URL('../assets/rpg/rescue-hub-map-portrait.png', import.meta.url).href },
};

function preloadHubMapAssets() {
  Object.values(hubMapAssets).forEach(asset => {
    const image = new Image();
    asset.image = image;
    image.onload = () => {
      asset.status = 'ready';
      draw();
    };
    image.onerror = () => {
      asset.status = 'failed';
      asset.image = null;
      draw();
    };
    image.src = asset.url;
  });
}
```

Call `preloadHubMapAssets()` once during RPG launch before `resize()`.

- [ ] **Step 6: Compose guide and shared layouts in the view model**

Replace the `focusItem` lookup and add these view fields in `getViewModel()`:

```javascript
const focusItem = focusItems.find(item => item.id === selectedFocus) || null;
const guide = deriveFirstQuestGuide({ save: activeSave, screen });
const hubGuideTarget = guide.active && focusItems.some(item => item.id === guide.targetId)
  ? guide.targetId
  : null;
const hubLayout = getHubMapLayout({
  width: hudCanvas.width,
  height: hudCanvas.height,
  landmarks: focusItems.map(({ id, label, type, x, z }) => ({ id, label, type, x, z })),
  focusId: selectedFocus,
  guideTargetId: hubGuideTarget,
});
const questGuideActive = guide.active
  && getAvailableQuests(activeSave).some(quest => `quest:${quest.id}` === guide.targetId);
const worldGuideActive = guide.active
  && getWorldMapEntries(activeSave).some(entry => `zone:${entry.id}` === guide.targetId);
const questBoardLayout = getQuestBoardLayout(hudCanvas.width, hudCanvas.height, available.length, questGuideActive);
const worldMapLayout = getWorldMapLayout(hudCanvas.width, hudCanvas.height, entries.length, worldGuideActive);
const zoneGuideLayout = guide.active && guide.step === 'forest-edge-objectives'
  ? getGuideOverlayLayout(hudCanvas.width, hudCanvas.height)
  : null;
const mapAsset = hubMapAssets[hubLayout.orientation];
```

Return:

```javascript
hub: {
  zone: hubZone,
  npcs: hubNpcs,
  interactables: hubZone?.interactables || [],
  layout: hubLayout,
  mapAsset,
},
focusItem,
guide,
questBoard: { available, selectedQuest, layout: questBoardLayout },
worldMap: { entries, selectedMapEntry, layout: worldMapLayout },
zoneGuideLayout,
```

Expose only serializable pieces in `window.__rpgDebug`:

```javascript
guide: view?.guide || null,
hub: view ? {
  enemies: hubZone.enemies.length,
  damageSources: hubZone.damageSources.length,
  interactables: hubZone.interactables.map(item => item.id),
  npcs: hubNpcs.map(npc => ({ id: npc.id, name: npc.name, dialogueId: npc.dialogueId })),
  layout: view.hub.layout,
  mapAssetStatus: view.hub.mapAsset.status,
} : null,
```

The existing `questBoard` and `worldMap` debug values now include their layouts through the view model.

- [ ] **Step 7: Unify keyboard and pointer action dispatch**

Replace `activateFocusedHubItem()` with an ID-based function:

```javascript
function activateFocusedHubItem(focusId = selectedFocus) {
  const focus = focusItems.find(item => item.id === focusId);
  if (!focus) return;
  selectedFocus = focus.id;
  if (focus.type === 'npc') {
    dialogueNpc = focus.npc;
    screen = 'dialogue';
  } else if (focus.type === 'questBoard') {
    selectedQuest = 0;
    screen = 'questBoard';
  } else if (focus.type === 'worldMap') {
    const entries = getWorldMapEntries(activeSave);
    const guide = deriveFirstQuestGuide({ save: activeSave, screen: 'worldMap' });
    const targetId = guide.targetId?.replace('zone:', '');
    const targetIndex = entries.findIndex(entry => entry.id === targetId);
    selectedMapEntry = targetIndex >= 0 ? targetIndex : selectedMapEntry;
    screen = 'worldMap';
  } else if (focus.type === 'craftingBench') {
    screen = 'crafting';
  } else if (focus.type === 'storage') {
    screen = 'inventory';
  } else if (focus.type === 'rest') {
    activeSave.player.hp = activeSave.player.maxHp;
    activeSave = writeSaveSlot(localStorage, activeSave);
  }
  draw();
}
```

In the hub key branch, replace wrapping index changes with:

```javascript
const directionByCode = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
};
const direction = directionByCode[e.code];
if (direction) {
  e.preventDefault();
  const layout = getViewModel().hub.layout;
  selectedFocus = getDirectionalNeighbor(layout, selectedFocus, direction) || selectedFocus;
  draw();
  return;
}
```

After accepting `heroSignup` from keyboard or pointer, set `selectedFocus = 'worldMap'` before returning to the hub.

- [ ] **Step 8: Add hover, single pointer activation, and guide dismissal**

Add:

```javascript
function dismissFirstQuestGuide() {
  if (!activeSave) return;
  activeSave.flags.firstQuestGuideDismissed = true;
  activeSave = writeSaveSlot(localStorage, activeSave);
  draw();
}

function onPointerMove(event) {
  const point = getHudPoint(event);
  if (!point || !activeSave) return;
  const view = getViewModel();
  let interactive = false;
  if (screen === 'hub') {
    const hit = hitTestHubMap(view.hub.layout, point.x, point.y);
    if (hit?.type === 'landmark') {
      interactive = true;
      if (selectedFocus !== hit.id) {
        selectedFocus = hit.id;
        draw();
      }
    } else if (hit?.type === 'dismiss') interactive = true;
  } else if (screen === 'questBoard') {
    const hit = hitTestQuestBoard(view.questBoard.layout, point.x, point.y);
    if (hit) {
      interactive = true;
      if (selectedQuest !== hit.index) {
        selectedQuest = hit.index;
        draw();
      }
    }
  } else if (screen === 'worldMap') {
    const hit = hitTestWorldMap(view.worldMap.layout, point.x, point.y);
    if (hit) {
      interactive = true;
      if (selectedMapEntry !== hit.index) {
        selectedMapEntry = hit.index;
        draw();
      }
    }
  }
  if (view.guide?.active && hitTestGuideDismiss(
    screen === 'hub' ? view.hub.layout : screen === 'questBoard' ? view.questBoard.layout : screen === 'worldMap' ? view.worldMap.layout : view.zoneGuideLayout,
    point.x,
    point.y,
  )) interactive = true;
  hudCanvas.style.cursor = interactive ? 'pointer' : 'default';
}

function onPointerLeave() {
  hudCanvas.style.cursor = 'default';
}
```

Replace `onPointerDown()` with a single dispatcher that checks dismissal first:

```javascript
function onPointerDown(event) {
  const point = getHudPoint(event);
  if (!point) return;

  if (screen === 'saveSelect') {
    const hit = hitTestSaveSlot(hudCanvas.width, hudCanvas.height, point.x, point.y);
    if (!hit) return;
    event.preventDefault();
    if (selectedSlot === hit.slot) startSelectedSlot();
    else {
      selectedSlot = hit.slot;
      confirmDelete = false;
      draw();
    }
    return;
  }

  if (!activeSave) return;
  const view = getViewModel();
  const guideLayout = screen === 'hub'
    ? view.hub.layout
    : screen === 'questBoard'
      ? view.questBoard.layout
      : screen === 'worldMap'
        ? view.worldMap.layout
        : view.zoneGuideLayout;
  if (view.guide.active && hitTestGuideDismiss(guideLayout, point.x, point.y)) {
    event.preventDefault();
    dismissFirstQuestGuide();
    return;
  }

  if (screen === 'hub') {
    const hit = hitTestHubMap(view.hub.layout, point.x, point.y);
    if (hit?.type !== 'landmark') return;
    event.preventDefault();
    activateFocusedHubItem(hit.id);
  } else if (screen === 'questBoard') {
    const hit = hitTestQuestBoard(view.questBoard.layout, point.x, point.y);
    const quest = hit ? getAvailableQuests(activeSave)[hit.index] : null;
    if (!quest) return;
    event.preventDefault();
    selectedQuest = hit.index;
    activeSave = writeSaveSlot(localStorage, acceptQuest(activeSave, quest.id));
    selectedFocus = 'worldMap';
    screen = 'hub';
    draw();
  } else if (screen === 'worldMap') {
    const hit = hitTestWorldMap(view.worldMap.layout, point.x, point.y);
    const entry = hit ? getWorldMapEntries(activeSave)[hit.index] : null;
    if (!entry?.unlocked) return;
    event.preventDefault();
    selectedMapEntry = hit.index;
    startZone(entry.id);
  }
}
```

Register only these pointer listeners:

```javascript
hudCanvas.style.pointerEvents = 'auto';
hudCanvas.addEventListener('pointermove', onPointerMove);
hudCanvas.addEventListener('pointerleave', onPointerLeave);
hudCanvas.addEventListener('pointerdown', onPointerDown);
```

Remove the `mousedown` and `touchstart` registrations. In `cleanup()`, remove the same three pointer listeners, reset `hudCanvas.style.cursor`, and restore:

```javascript
hudCanvas.style.pointerEvents = previousHudPointerEvents;
```

- [ ] **Step 9: Run the guided pointer case**

Run with the same server:

```bash
BASE_URL="http://localhost:$PORT" node test-results/test-rpg-alpha-mode-flow.mjs --case guided-hub-pointer
```

Expected: every assertion prints `PASS`; one Quest Board click does not accept the quest; the guide disappears after quest completion.

- [ ] **Step 10: Update the existing first-focus regression and commit**

In `testHubDialogueWorldMap()`, replace the Granny-first assertion with:

```javascript
assert(debug.focusItem.id === 'questBoard', 'Quest Board is the fresh-save focus');
await tapKey(page, 'ArrowRight');
await page.waitForFunction(() => window.__rpgDebug.focusItem.id === 'grannyThistle');
await tapKey(page, 'Enter');
```

Keep the existing Granny dialogue assertions after this keyboard move.

Run:

```bash
BASE_URL="http://localhost:$PORT" node test-results/test-rpg-alpha-mode-flow.mjs --case hub-dialogue-world-map
```

Expected: PASS.

```bash
git add js/game-rpg.js test-results/test-rpg-alpha-mode-flow.mjs
git commit -m "feat: add mouse-guided hub navigation"
```

### Task 7: Prove dismissal, fallback art, responsive layout, and mode safety

**Files:**

- Modify: `test-results/test-rpg-alpha-mode-flow.mjs`
- Modify if visual comparison finds a defect: `js/rpg/hud-rpg.js`, `js/rpg/hub-map-layout.js`, or the two production map PNGs
- Update: bead `Leopard vs Zombies-9i5`

- [ ] **Step 1: Add a dismissal persistence browser case**

Add `guide-dismissal` to `CASES` and implement:

```javascript
async function testGuideDismissal() {
  await withBrowser(async browser => {
    const page = await newPage(browser);
    await launchRpgToHub(page);
    await tapKey(page, 'KeyQ');
    await tapKey(page, 'Enter');
    await page.waitForFunction(() => window.__rpgDebug.screen === 'hub' && window.__rpgDebug.activeQuest?.id === 'heroSignup');

    let debug = await page.evaluate(() => window.__rpgDebug);
    await clickHudRect(page, debug.hub.layout.dismissRect);
    await page.waitForFunction(() => window.__rpgDebug.guide.active === false);
    debug = await page.evaluate(() => window.__rpgDebug);
    assert(debug.activeQuest.objective === 'Collect 5 Wood and bonk 3 tutorial zombies', 'dismissal preserves the normal quest tracker');
    assert(debug.activeSave.flags.firstQuestGuideDismissed === true, 'dismissal writes the save flag');

    await tapKey(page, 'Escape');
    await waitForTitle(page);
    await tapKey(page, 'Enter');
    await page.waitForFunction(() => window.__lvzTestState.gameState === 'modeSelect');
    await moveModeSelection(page, 2);
    await tapKey(page, 'Enter');
    await page.waitForFunction(() => window.__lvzTestState.gameState === 'select');
    await tapKey(page, 'Enter');
    await page.waitForFunction(() => window.__rpgDebug?.screen === 'saveSelect');
    await tapKey(page, 'Enter');
    await page.waitForFunction(() => window.__rpgDebug?.screen === 'hub');
    debug = await page.evaluate(() => window.__rpgDebug);
    assert(debug.guide.active === false, 'dismissal remains hidden after reload');
    assert(debug.activeQuest.id === 'heroSignup', 'reload keeps the active first quest');
    page.__assertNoFailures();
  });
}
```

Register it at the bottom.

- [ ] **Step 2: Add controlled map-image failure support to the browser harness**

Change `newPage()` to accept:

```javascript
async function newPage(browser, { failHubMapImages = false } = {}) {
```

In request interception, before the `game.js` branch:

```javascript
if (failHubMapImages && url.pathname.includes('/assets/rpg/rescue-hub-map-')) {
  await req.abort('failed');
  return;
}
```

In `requestfailed`, ignore only the two deliberate map failures:

```javascript
const expectedHubMapFailure = failHubMapImages && req.url().includes('/assets/rpg/rescue-hub-map-');
if (!expectedHubMapFailure && ['document', 'script', 'stylesheet', 'image', 'media', 'xhr', 'fetch'].includes(type)) {
  const failure = req.failure();
  failures.push(`request failed: ${type} ${req.url()} ${failure ? failure.errorText : ''}`);
}
```

- [ ] **Step 3: Add and run the fallback browser case**

Add `hub-map-fallback` to `CASES`:

```javascript
async function testHubMapFallback() {
  await withBrowser(async browser => {
    const page = await newPage(browser, { failHubMapImages: true });
    await launchRpgToHub(page);
    await page.waitForFunction(() => window.__rpgDebug.hub.mapAssetStatus === 'failed');
    const debug = await page.evaluate(() => window.__rpgDebug);
    assert(debug.hub.layout.landmarks.length === 9, 'fallback keeps every hub landmark');
    assert(debug.focusItem.id === 'questBoard', 'fallback keeps guided focus');
    await page.screenshot({ path: 'test-results/rpg-hub-fallback-960x540.png' });
    page.__assertNoFailures();
  });
}
```

Register it, then run:

```bash
BASE_URL="http://localhost:$PORT" node test-results/test-rpg-alpha-mode-flow.mjs --case guide-dismissal
BASE_URL="http://localhost:$PORT" node test-results/test-rpg-alpha-mode-flow.mjs --case hub-map-fallback
```

Expected: both cases pass; the fallback screenshot shows nine separated landmarks with a usable Quest Board target.

- [ ] **Step 4: Expand responsive screenshots to assert geometry**

In `testReadability()`, change the existing `const debug` declaration to `let debug`, then assert:

```javascript
await page.waitForFunction(() => window.__rpgDebug.hub.mapAssetStatus === 'ready');
debug = await page.evaluate(() => window.__rpgDebug);
const hitRects = debug.hub.layout.landmarks.map(item => item.hitRect);
for (let i = 0; i < hitRects.length; i++) {
  for (let j = i + 1; j < hitRects.length; j++) {
    const a = hitRects[i];
    const b = hitRects[j];
    const overlap = a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    assert(!overlap, `hub hit targets ${i}/${j} do not overlap at ${viewport.label}`);
  }
}
```

Keep screenshots at `960x540`, `1280x720`, and `390x844`.

- [ ] **Step 5: Run pure and complete RPG suites**

Run:

```bash
node test-results/test-rpg-hub-navigation.mjs
node test-results/test-rpg-alpha-data-flow.mjs
BASE_URL="http://localhost:$PORT" node test-results/test-rpg-alpha-mode-flow.mjs
```

Expected: all cases pass with no page error, unexpected request failure, blank HUD, duplicate activation, save loss, or first-quest regression.

- [ ] **Step 6: Compare the selected visual and implementation together**

Create a side-by-side review sheet:

```bash
montage docs/art/rpg-rescue-hub-local-map-selected.png test-results/rpg-readability-960x540.png \
  -tile 2x1 -geometry 960x540+18+18 -background '#111111' test-results/rpg-hub-reference-comparison.png
```

Open `test-results/rpg-hub-reference-comparison.png` in one visual inspection. Verify:

- local-map hierarchy and storybook camp mood match the selected direction;
- the Quest Board is the only guided gold glow on a fresh save;
- labels and hit regions are separated;
- the top beacon and bottom prompt do not cover landmarks;
- the portrait map retains every destination;
- production artwork contains no baked text or tutorial UI.

If inspection exposes a defect, adjust only the owning HUD, layout, or asset file, rerun the focused pure/browser case, and regenerate the comparison sheet.

- [ ] **Step 7: Run full mode regressions**

Run:

```bash
BASE_URL="http://localhost:$PORT" node test-results/test-mode-regression.mjs
```

Expected: 2D Classic, 3D Survivor, RPG launch/return, three-card mode selection, and repeated launches all pass.

- [ ] **Step 8: Commit final QA changes**

```bash
git add js/game-rpg.js js/rpg/hud-rpg.js js/rpg/hub-map-layout.js \
  test-results/test-rpg-alpha-mode-flow.mjs test-results/rpg-readability-960x540.png \
  test-results/rpg-readability-1280x720.png test-results/rpg-readability-390x844.png \
  test-results/rpg-hub-fallback-960x540.png test-results/rpg-hub-reference-comparison.png
git commit -m "test: verify guided Rescue Hub flow"
```

Omit unchanged paths from the commit command.

- [ ] **Step 9: Land the completed bead and push**

Record the exact passing commands in the bead notes, close the bead, and run the mandatory repository workflow:

```bash
bd update 'Leopard vs Zombies-9i5' --append-notes 'Implemented guided Rescue Hub local map. Pure navigation, RPG data flow, RPG browser flow, responsive visual QA, fallback, and full mode regression suites pass.'
bd close 'Leopard vs Zombies-9i5'
git pull --rebase
bd dolt push
git push
git remote prune origin
git status --short --branch
```

Expected: push succeeds and status shows `rpg-alpha-startup-mode...origin/rpg-alpha-startup-mode` with no modified or untracked files.

## Completion Checklist

- A fresh save focuses the Quest Board and identifies it as the next action.
- Hover and arrow keys update one shared focus ID.
- One pointer activation triggers exactly one hub/menu action.
- Quest Board and World Map mouse selection use the same rectangles that are drawn.
- The Objective Beacon derives from save and screen state and ends after `heroSignup`.
- Dismissal persists and leaves the normal active-quest tracker visible.
- Forest Edge shows `Wood X/5` and `Zombies X/3` only while guidance is active.
- Landscape and portrait map assets are clean ImageGen backgrounds with no baked UI.
- Fallback Canvas rendering remains fully usable.
- Layout rectangles are inside and non-overlapping at `960x540`, `1280x720`, and `390x844`.
- Save, later quest, cleanup, 2D Classic, and 3D Survivor regressions pass.
- Bead is closed only after all verification passes and the branch is pushed.
