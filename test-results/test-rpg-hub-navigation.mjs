import { deepStrictEqual, equal } from 'assert/strict';
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

await testGuidance();
await testLayout();
