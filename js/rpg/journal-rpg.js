/**
 * @module rpg/journal-rpg
 * @description Pure journal, sticker, and reward-banner helpers for the RPG alpha.
 *
 * Dependencies: constants-rpg.js
 * Exports: unlockSticker, addJournalEntry, createRewardBanner
 */

import { STICKER_DEFINITIONS } from './constants-rpg.js';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function ensureJournal(save) {
  save.journal = save.journal || { entries: [], stickers: [] };
  save.journal.entries = Array.isArray(save.journal.entries) ? save.journal.entries : [];
  save.journal.stickers = Array.isArray(save.journal.stickers) ? save.journal.stickers : [];
}

export function unlockSticker(save, stickerId) {
  const sticker = STICKER_DEFINITIONS[stickerId];
  if (!sticker) throw new Error(`Unknown RPG sticker: ${stickerId}`);
  const next = clone(save);
  ensureJournal(next);
  if (next.journal.stickers.includes(stickerId)) {
    return { save: next, sticker, unlocked: false };
  }
  next.journal.stickers.push(stickerId);
  return { save: next, sticker, unlocked: true };
}

export function addJournalEntry(save, entryId, text = entryId) {
  const next = clone(save);
  ensureJournal(next);
  if (!next.journal.entries.includes(entryId)) next.journal.entries.push(entryId);
  next.journal.entryText = next.journal.entryText || {};
  next.journal.entryText[entryId] = text;
  return { save: next, entryId, text };
}

export function createRewardBanner(payload) {
  const lines = [];
  if (payload.xp) lines.push(`${payload.xp} XP`);
  Object.entries(payload.ingredients || {}).forEach(([id, amount]) => {
    if (amount > 0) lines.push(`${id.charAt(0).toUpperCase() + id.slice(1)} ${amount}`);
  });
  if (payload.recipes?.length) lines.push(`Recipes: ${payload.recipes.join(', ')}`);
  if (payload.stickers?.length) lines.push(`Stickers: ${payload.stickers.join(', ')}`);
  if (payload.unlockedZones?.length) lines.push(`Routes: ${payload.unlockedZones.join(', ')}`);

  return {
    title: payload.title || 'QUEST COMPLETE',
    questTitle: payload.questTitle || null,
    xp: payload.xp || 0,
    ingredients: payload.ingredients || {},
    recipes: payload.recipes || [],
    stickers: payload.stickers || [],
    unlockedZones: payload.unlockedZones || [],
    lines,
  };
}

