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

await testGuidance();
