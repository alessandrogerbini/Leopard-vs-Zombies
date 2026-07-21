/**
 * @module rpg/quest-system
 * @description Pure quest board state transitions for the Animal Rescue alpha.
 *
 * Dependencies: constants-rpg.js
 * Exports: getQuestDefinition, getAvailableQuests, acceptQuest, getActiveQuestTracker,
 *   isQuestObjectiveComplete, completeQuest
 */

import { QUEST_DEFINITIONS } from './constants-rpg.js';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function getCompleted(save) {
  return new Set(Array.isArray(save?.quests?.completed) ? save.quests.completed : []);
}

function hasPrerequisites(save, quest) {
  const completed = getCompleted(save);
  return quest.prerequisites.every(id => completed.has(id));
}

export function getQuestDefinition(questId) {
  const quest = QUEST_DEFINITIONS[questId];
  return quest ? clone(quest) : null;
}

export function getAvailableQuests(save) {
  const active = save?.quests?.active || null;
  const completed = getCompleted(save);
  return Object.values(QUEST_DEFINITIONS)
    .filter(quest => !active && !completed.has(quest.id) && hasPrerequisites(save, quest))
    .map(quest => clone(quest));
}

export function acceptQuest(save, questId, acceptedAt = Date.now()) {
  const quest = QUEST_DEFINITIONS[questId];
  if (!quest) throw new Error(`Unknown RPG quest: ${questId}`);
  if (!getAvailableQuests(save).some(available => available.id === questId)) {
    throw new Error(`Quest is not available: ${questId}`);
  }

  const next = clone(save);
  next.quests = next.quests || { active: null, completed: [], progress: {} };
  next.quests.active = questId;
  next.quests.completed = Array.isArray(next.quests.completed) ? next.quests.completed : [];
  next.quests.progress = next.quests.progress && typeof next.quests.progress === 'object'
    ? next.quests.progress
    : {};
  next.quests.progress[questId] = {
    ...clone(quest.progressDefaults),
    acceptedAt,
  };
  next.currentZone = 'hub';
  return next;
}

export function getActiveQuestTracker(save) {
  const questId = save?.quests?.active || null;
  if (!questId) return null;
  const quest = QUEST_DEFINITIONS[questId];
  if (!quest) return null;
  return {
    id: quest.id,
    title: quest.title,
    objective: quest.objective,
    destinationZone: quest.destinationZone,
    rewardPreview: quest.rewardPreview,
    progress: clone(save.quests.progress?.[questId] || quest.progressDefaults),
  };
}

export function isQuestObjectiveComplete(save, questId = save?.quests?.active) {
  const quest = QUEST_DEFINITIONS[questId];
  if (!quest) return false;
  const progress = save?.quests?.progress?.[questId] || {};
  return Object.entries(quest.completion || {}).every(([key, required]) => (progress[key] || 0) >= required);
}

export function completeQuest(save, questId = save?.quests?.active) {
  const quest = QUEST_DEFINITIONS[questId];
  if (!quest) throw new Error(`Unknown RPG quest: ${questId}`);
  if (!isQuestObjectiveComplete(save, questId)) {
    return { save: clone(save), completed: false, reward: null };
  }

  const next = clone(save);
  next.quests = next.quests || { active: null, completed: [], progress: {} };
  next.quests.completed = Array.isArray(next.quests.completed) ? next.quests.completed : [];
  if (!next.quests.completed.includes(questId)) next.quests.completed.push(questId);
  if (next.quests.active === questId) next.quests.active = null;
  return { save: next, completed: true, reward: clone(quest.reward || {}) };
}
