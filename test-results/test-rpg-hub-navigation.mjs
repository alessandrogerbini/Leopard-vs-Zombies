import { deepStrictEqual, doesNotThrow, equal } from 'assert/strict';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');

async function importRpgModule(fileName) {
  const url = pathToFileURL(join(PROJECT_ROOT, 'js/rpg', fileName)).href;
  return import(`${url}?t=${Date.now()}`);
}

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

function makeSave() {
  return {
    currentZone: 'hub',
    flags: { firstQuestGuideDismissed: false },
    quests: { active: null, completed: [], progress: {} },
  };
}

const INACTIVE_GUIDE = {
  active: false,
  step: null,
  targetId: null,
  title: '',
  instruction: '',
  progress: null,
  dismissible: false,
};

async function testGuidance() {
  const { deriveFirstQuestGuide } = await importRpgModule('guidance-rpg.js');
  const save = makeSave();

  let guide = deriveFirstQuestGuide({ save, screen: 'hub' });
  deepStrictEqual(guide, {
    active: true,
    step: 'open-quest-board',
    targetId: 'questBoard',
    title: 'FIRST RESCUE',
    instruction: 'NEXT: Open the Quest Board',
    progress: null,
    dismissible: true,
  });

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

  deepStrictEqual(deriveFirstQuestGuide({ screen: 'hub' }), INACTIVE_GUIDE);

  const immutableSave = makeSave();
  immutableSave.quests.active = 'heroSignup';
  immutableSave.quests.progress.heroSignup = { wood: 2, tutorialZombies: 1 };
  const saveSnapshot = structuredClone(immutableSave);
  deriveFirstQuestGuide({ save: immutableSave, screen: 'hub' });
  deepStrictEqual(immutableSave, saveSnapshot);

  const sanitizationSave = makeSave();
  sanitizationSave.currentZone = 'forestEdge';
  sanitizationSave.quests.active = 'heroSignup';
  sanitizationSave.quests.progress.heroSignup = { wood: -2, tutorialZombies: '4.9' };
  guide = deriveFirstQuestGuide({ save: sanitizationSave, screen: 'zone' });
  deepStrictEqual(guide.progress, {
    wood: { current: 0, required: 5, label: 'Wood' },
    tutorialZombies: { current: 4, required: 3, label: 'Zombies' },
  });

  sanitizationSave.quests.progress.heroSignup = {
    wood: Number.POSITIVE_INFINITY,
    tutorialZombies: 'not-a-number',
  };
  guide = deriveFirstQuestGuide({ save: sanitizationSave, screen: 'zone' });
  deepStrictEqual(guide.progress, {
    wood: { current: 0, required: 5, label: 'Wood' },
    tutorialZombies: { current: 0, required: 3, label: 'Zombies' },
  });

  console.log('PASS: guidance');
}

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
      deepStrictEqual(hit, { type: 'landmark', id: item.id }, `${item.id} center hit resolves correctly`);
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
  equal(layout.landmarks.every(item => item.showLabel), true, 'landscape shows every label');
  equal(getDirectionalNeighbor(layout, 'questBoard', 'right'), 'grannyThistle');
  equal(getDirectionalNeighbor(layout, 'questBoard', 'down'), 'playerTent');
  equal(getDirectionalNeighbor(layout, 'questBoard', 'left'), null);
  equal(getDirectionalNeighbor(layout, 'questBoard', 'up'), null);
  deepStrictEqual(
    hitTestHubMap(layout, layout.dismissRect.x + 2, layout.dismissRect.y + 2),
    { type: 'dismiss', id: 'firstQuestGuide' },
  );

  for (const [width, height] of [[960, 540], [1280, 720]]) {
    const landscapeLayout = getHubMapLayout({
      width,
      height,
      landmarks: LANDMARKS,
      focusId: 'questBoard',
      guideTargetId: 'questBoard',
    });
    equal(
      getDirectionalNeighbor(landscapeLayout, 'storageChest', 'left'),
      'worldMap',
      `${width}x${height} Storage Chest left follows the illustrated lower row`,
    );
    equal(
      getDirectionalNeighbor(landscapeLayout, 'worldMap', 'right'),
      'storageChest',
      `${width}x${height} World Map right follows the illustrated lower row`,
    );
  }

  const portraitLayout = getHubMapLayout({
    width: 390,
    height: 844,
    landmarks: LANDMARKS,
    focusId: 'questBoard',
    guideTargetId: 'worldMap',
  });
  deepStrictEqual(
    portraitLayout.landmarks.filter(item => item.showLabel).map(item => item.id),
    ['questBoard', 'worldMap'],
    'portrait shows only the focused and guided landmark labels',
  );
  equal(getDirectionalNeighbor(portraitLayout, 'worldMap', 'left'), 'scoutHazel', 'portrait center left selects Scout Hazel');
  equal(getDirectionalNeighbor(portraitLayout, 'worldMap', 'right'), 'playerTent', 'portrait center right selects Player Tent');
  equal(getDirectionalNeighbor(portraitLayout, 'worldMap', 'up'), 'grannyThistle', 'portrait center up selects Granny Thistle');
  equal(getDirectionalNeighbor(portraitLayout, 'worldMap', 'down'), 'shellbert', 'portrait center down selects Shellbert');

  const landmarksWithFallback = [
    ...LANDMARKS,
    { id: 'newLandmark', label: 'New Landmark' },
  ];
  for (const [width, height] of [[960, 540], [390, 844]]) {
    const fallbackLayout = getHubMapLayout({
      width,
      height,
      landmarks: landmarksWithFallback,
      focusId: 'questBoard',
      guideTargetId: 'questBoard',
    });
    assertNoPairOverlap(
      fallbackLayout.landmarks.map(item => item.hitRect),
      `${width}x${height} fallback hit targets do not overlap`,
    );
    const fallback = fallbackLayout.landmarks.find(item => item.id === 'newLandmark');
    deepStrictEqual(
      hitTestHubMap(
        fallbackLayout,
        fallback.hitRect.x + fallback.hitRect.w / 2,
        fallback.hitRect.y + fallback.hitRect.h / 2,
      ),
      { type: 'landmark', id: 'newLandmark' },
      `${width}x${height} fallback center hit resolves exactly`,
    );
  }

  const overlappingDismissLayout = {
    dismissRect: { x: 10, y: 10, w: 30, h: 30 },
    landmarks: [{ id: 'underDismiss', hitRect: { x: 10, y: 10, w: 30, h: 30 } }],
  };
  deepStrictEqual(
    hitTestHubMap(overlappingDismissLayout, 20, 20),
    { type: 'dismiss', id: 'firstQuestGuide' },
    'dismiss hit takes precedence over an overlapping landmark',
  );

  const perpendicularLayout = {
    landmarks: [
      { id: 'origin', hitRect: { x: 0, y: 0, w: 10, h: 10 } },
      { id: 'aligned', hitRect: { x: 30, y: 0, w: 10, h: 10 } },
      { id: 'offAxis', hitRect: { x: 10, y: 15, w: 10, h: 10 } },
    ],
  };
  equal(
    getDirectionalNeighbor(perpendicularLayout, 'origin', 'right'),
    'aligned',
    'perpendicular penalty favors the visually aligned candidate',
  );

  const tiedLayout = {
    landmarks: [
      { id: 'origin', hitRect: { x: 0, y: 0, w: 10, h: 10 } },
      { id: 'zeta', hitRect: { x: 20, y: -10, w: 10, h: 10 } },
      { id: 'alpha', hitRect: { x: 20, y: 10, w: 10, h: 10 } },
    ],
  };
  equal(
    getDirectionalNeighbor(tiedLayout, 'origin', 'right'),
    'alpha',
    'equal directional scores break by landmark ID',
  );

  const boundaryLayout = {
    dismissRect: null,
    landmarks: [{ id: 'boundary', hitRect: { x: 10, y: 20, w: 30, h: 40 } }],
  };
  equal(hitTestHubMap(boundaryLayout, 40, 30), null, 'right edge is outside the hit rectangle');
  equal(hitTestHubMap(boundaryLayout, 20, 60), null, 'bottom edge is outside the hit rectangle');

  console.log('PASS: layout');
}

async function testScreenLayouts() {
  const {
    getQuestBoardLayout,
    getWorldMapLayout,
    hitTestQuestBoard,
    hitTestWorldMap,
  } = await importRpgModule('hud-rpg.js');

  for (const [width, height] of [[960, 540], [1280, 720], [390, 844]]) {
    const questBoardLayout = getQuestBoardLayout(width, height, 1, true);
    equal(questBoardLayout.rows.length, 1, `${width}x${height} quest board has one row`);
    assertInside(questBoardLayout.objectiveRect, width, height, `${width}x${height} quest objective inside viewport`);
    assertInside(questBoardLayout.dismissRect, width, height, `${width}x${height} quest dismiss inside viewport`);
    assertInside(questBoardLayout.rows[0].rect, width, height, `${width}x${height} quest row inside viewport`);
    deepStrictEqual(
      hitTestQuestBoard(
        questBoardLayout,
        questBoardLayout.rows[0].rect.x + 2,
        questBoardLayout.rows[0].rect.y + 2,
      ),
      { type: 'quest', index: 0 },
      `${width}x${height} quest row hit resolves exactly`,
    );

    const worldMapLayout = getWorldMapLayout(width, height, 6, true);
    equal(worldMapLayout.cards.length, 6, `${width}x${height} world map has six cards`);
    assertInside(worldMapLayout.objectiveRect, width, height, `${width}x${height} map objective inside viewport`);
    assertInside(worldMapLayout.dismissRect, width, height, `${width}x${height} map dismiss inside viewport`);
    worldMapLayout.cards.forEach((card, index) => {
      assertInside(card.rect, width, height, `${width}x${height} map card ${index} inside viewport`);
    });
    deepStrictEqual(
      hitTestWorldMap(
        worldMapLayout,
        worldMapLayout.cards[1].rect.x + 2,
        worldMapLayout.cards[1].rect.y + 2,
      ),
      { type: 'zone', index: 1 },
      `${width}x${height} map card hit resolves exactly`,
    );
  }

  console.log('PASS: screen-layouts');
}

function createMockCanvasContext(width = 960, height = 540) {
  return {
    canvas: { width, height },
    clearRect() {},
    fillRect() {},
    strokeRect() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    quadraticCurveTo() {},
    closePath() {},
    fill() {},
    stroke() {},
    fillText() {},
    drawImage() {},
    createLinearGradient() {
      return { addColorStop() {} };
    },
    measureText(text) {
      return { width: String(text).length * 8 };
    },
    fillStyle: '',
    strokeStyle: '',
    font: '',
    textAlign: 'left',
    lineWidth: 1,
  };
}

async function testLegacyRenderSmoke() {
  const { drawHub, drawQuestBoard, drawWorldMap } = await importRpgModule('hud-rpg.js');
  const ctx = createMockCanvasContext();
  const hub = {
    npcs: [
      { id: 'grannyThistle', name: 'Granny Thistle' },
      { id: 'scoutHazel', name: 'Scout Hazel' },
      { id: 'momoForeman', name: 'Momo Foreman' },
      { id: 'shellbert', name: 'Shellbert' },
    ],
    interactables: [
      { id: 'questBoard', label: 'Quest Board' },
      { id: 'craftingBench', label: 'Crafting Bench' },
      { id: 'worldMap', label: 'World Map' },
      { id: 'playerTent', label: 'Player Tent' },
      { id: 'storageChest', label: 'Storage Chest' },
    ],
  };

  doesNotThrow(() => drawHub(ctx, { hub, focusItem: null, activeQuest: null }));
  doesNotThrow(() => drawQuestBoard(ctx, {
    activeQuest: null,
    questBoard: {
      selectedQuest: 0,
      available: [{
        id: 'heroSignup',
        title: 'The Hero Sign-Up Sheet',
        destinationZone: 'forestEdge',
        rewardPreview: 'Wooden Club recipe',
      }],
    },
  }));
  doesNotThrow(() => drawWorldMap(ctx, {
    worldMap: {
      selectedMapEntry: 0,
      entries: [
        { id: 'forestEdge', label: 'Forest Edge', unlocked: true, reason: '' },
        { id: 'rabbitVillage', label: 'Rabbit Village', unlocked: false, reason: 'Complete the first rescue' },
      ],
    },
  }));

  console.log('PASS: legacy-render-smoke');
}

await testGuidance();
await testLayout();
await testScreenLayouts();
await testLegacyRenderSmoke();
