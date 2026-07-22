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
