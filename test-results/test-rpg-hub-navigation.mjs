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
