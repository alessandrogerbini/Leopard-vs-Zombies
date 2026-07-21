/**
 * @module rpg/progression-rpg
 * @description Pure XP, level, and reputation helpers for the Animal Rescue alpha.
 *
 * Dependencies: constants-rpg.js
 * Exports: grantXp, setReputation, getReputationReaction
 */

import { LEVEL_REWARDS, LEVEL_XP_THRESHOLDS, REPUTATION_DEFAULTS, REPUTATION_REACTIONS } from './constants-rpg.js';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function grantXp(save, amount) {
  const next = clone(save);
  const xpGain = Math.max(0, Math.trunc(Number(amount) || 0));
  next.player.xp = Math.max(0, Math.trunc(Number(next.player.xp) || 0)) + xpGain;
  next.player.level = Math.max(1, Math.trunc(Number(next.player.level) || 1));
  const levelUps = [];

  let nextLevel = next.player.level + 1;
  while (LEVEL_XP_THRESHOLDS[nextLevel] !== undefined && next.player.xp >= LEVEL_XP_THRESHOLDS[nextLevel]) {
    next.player.level = nextLevel;
    const reward = LEVEL_REWARDS[nextLevel] || {};
    next.player.maxHp += reward.maxHp || 0;
    next.player.hp = next.player.maxHp;
    next.player.attack += reward.attack || 0;
    levelUps.push(nextLevel);
    nextLevel += 1;
  }

  return { save: next, xpGain, levelUps };
}

export function setReputation(save, species, rank = 'friend') {
  if (!Object.prototype.hasOwnProperty.call(REPUTATION_DEFAULTS, species)) {
    throw new Error(`Unknown RPG reputation species: ${species}`);
  }
  const next = clone(save);
  next.reputation = { ...REPUTATION_DEFAULTS, ...(next.reputation || {}) };
  next.reputation[species] = rank === 'friend' ? 'friend' : 'stranger';
  return { save: next, species, rank: next.reputation[species] };
}

export function getReputationReaction(save, species) {
  const rank = save?.reputation?.[species] === 'friend' ? 'friend' : 'stranger';
  return REPUTATION_REACTIONS[species]?.[rank] || '';
}

