/**
 * @module rpg/save-system
 * @description Pure localStorage persistence helpers for Animal Rescue RPG save slots.
 *
 * Dependencies: constants-rpg.js
 * Exports: save slot keys, default save creation, validation/normalization, read/write/delete, summaries
 */

import {
  DEFAULT_UNLOCKED_ZONES,
  INGREDIENT_IDS,
  REPUTATION_DEFAULTS,
  RESCUE_DEFAULTS,
  RPG_SAVE_PREFIX,
  RPG_SAVE_VERSION,
  SAVE_SLOT_COUNT,
  ZONE_LABELS,
} from './constants-rpg.js';

export { SAVE_SLOT_COUNT } from './constants-rpg.js';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function toInt(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : fallback;
}

function normalizeId(value, fallback) {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

function clampSlot(slot) {
  const parsed = Math.trunc(Number(slot));
  if (!Number.isFinite(parsed) || parsed < 0 || parsed >= SAVE_SLOT_COUNT) {
    throw new RangeError(`RPG save slot must be 0-${SAVE_SLOT_COUNT - 1}`);
  }
  return parsed;
}

function createIngredientBag(source = {}) {
  return Object.fromEntries(INGREDIENT_IDS.map(id => [id, toInt(source[id], 0)]));
}

function uniqueStrings(values, fallback = []) {
  if (!Array.isArray(values)) return [...fallback];
  const seen = new Set();
  values.forEach(value => {
    if (typeof value === 'string' && value.length > 0) seen.add(value);
  });
  return [...seen];
}

export function getSaveKey(animalId, slot) {
  return `${RPG_SAVE_PREFIX}:${normalizeId(animalId, 'leopard')}:slot:${clampSlot(slot)}`;
}

export function createDefaultSave(animalId = 'leopard', slot = 0, now = 0) {
  const safeSlot = clampSlot(slot);
  return {
    version: RPG_SAVE_VERSION,
    animalId: normalizeId(animalId, 'leopard'),
    slot: safeSlot,
    createdAt: now,
    updatedAt: now,
    player: { level: 1, xp: 0, hp: 100, maxHp: 100, attack: 8 },
    ingredients: createIngredientBag(),
    inventory: [],
    equipped: { weapon: null, gadget: null },
    quests: { active: null, completed: [], progress: {} },
    reputation: { ...REPUTATION_DEFAULTS },
    journal: { entries: [], stickers: [] },
    unlockedZones: [...DEFAULT_UNLOCKED_ZONES],
    unlockedRecipes: [],
    currentZone: 'hub',
    collectedNodes: {},
    rescued: { ...RESCUE_DEFAULTS },
    flags: { spaceshipWitness: false, alphaEndCardSeen: false },
    playtimeSeconds: 0,
  };
}

export function normalizeSave(raw, animalId = raw?.animalId || 'leopard', slot = raw?.slot || 0) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new TypeError('RPG save must be an object');
  }

  const defaultSave = createDefaultSave(animalId, slot);
  const save = {
    ...defaultSave,
    ...clone(raw),
  };

  save.version = RPG_SAVE_VERSION;
  save.animalId = normalizeId(save.animalId, animalId);
  save.slot = clampSlot(save.slot);
  save.createdAt = toInt(save.createdAt, defaultSave.createdAt);
  save.updatedAt = toInt(save.updatedAt, defaultSave.updatedAt);

  const player = raw.player && typeof raw.player === 'object' ? raw.player : {};
  save.player = {
    level: Math.max(1, toInt(player.level, defaultSave.player.level)),
    xp: toInt(player.xp, defaultSave.player.xp),
    hp: toInt(player.hp, defaultSave.player.hp),
    maxHp: Math.max(1, toInt(player.maxHp, defaultSave.player.maxHp)),
    attack: Math.max(1, toInt(player.attack, defaultSave.player.attack)),
  };
  save.player.hp = Math.min(save.player.hp, save.player.maxHp);

  save.ingredients = createIngredientBag(raw.ingredients);
  save.inventory = uniqueStrings(raw.inventory);
  save.equipped = {
    weapon: typeof raw.equipped?.weapon === 'string' ? raw.equipped.weapon : null,
    gadget: typeof raw.equipped?.gadget === 'string' ? raw.equipped.gadget : null,
  };

  const quests = raw.quests && typeof raw.quests === 'object' ? raw.quests : {};
  save.quests = {
    active: typeof quests.active === 'string' ? quests.active : null,
    completed: uniqueStrings(quests.completed),
    progress: quests.progress && typeof quests.progress === 'object' && !Array.isArray(quests.progress)
      ? clone(quests.progress)
      : {},
  };

  const reputation = raw.reputation && typeof raw.reputation === 'object' ? raw.reputation : {};
  save.reputation = {
    ...REPUTATION_DEFAULTS,
    ...Object.fromEntries(Object.keys(REPUTATION_DEFAULTS).map(key => [
      key,
      reputation[key] === 'friend' ? 'friend' : 'stranger',
    ])),
  };

  const journal = raw.journal && typeof raw.journal === 'object' ? raw.journal : {};
  save.journal = {
    entries: uniqueStrings(journal.entries),
    stickers: uniqueStrings(journal.stickers),
  };

  save.unlockedZones = uniqueStrings(raw.unlockedZones, DEFAULT_UNLOCKED_ZONES);
  if (!save.unlockedZones.includes('hub')) save.unlockedZones.unshift('hub');
  if (!save.unlockedZones.includes('forestEdge')) save.unlockedZones.push('forestEdge');
  save.unlockedRecipes = uniqueStrings(raw.unlockedRecipes);
  save.currentZone = typeof raw.currentZone === 'string' && save.unlockedZones.includes(raw.currentZone)
    ? raw.currentZone
    : 'hub';
  save.collectedNodes = raw.collectedNodes && typeof raw.collectedNodes === 'object' && !Array.isArray(raw.collectedNodes)
    ? clone(raw.collectedNodes)
    : {};

  const rescued = raw.rescued && typeof raw.rescued === 'object' ? raw.rescued : {};
  save.rescued = {
    ...RESCUE_DEFAULTS,
    ...Object.fromEntries(Object.keys(RESCUE_DEFAULTS).map(key => [key, Boolean(rescued[key])])),
  };

  const flags = raw.flags && typeof raw.flags === 'object' ? raw.flags : {};
  save.flags = {
    spaceshipWitness: Boolean(flags.spaceshipWitness),
    alphaEndCardSeen: Boolean(flags.alphaEndCardSeen),
  };
  save.playtimeSeconds = toInt(raw.playtimeSeconds, defaultSave.playtimeSeconds);

  return save;
}

export function readSaveSlot(storage, animalId, slot) {
  const safeSlot = clampSlot(slot);
  const key = getSaveKey(animalId, safeSlot);
  const raw = storage.getItem(key);
  if (raw === null) {
    return {
      key,
      valid: true,
      empty: true,
      save: createDefaultSave(animalId, safeSlot),
      raw: null,
    };
  }

  try {
    const parsed = JSON.parse(raw);
    const save = normalizeSave(parsed, animalId, safeSlot);
    return { key, valid: true, empty: false, save, raw };
  } catch (err) {
    return {
      key,
      valid: false,
      empty: false,
      save: createDefaultSave(animalId, safeSlot),
      raw,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export function writeSaveSlot(storage, save, updatedAt = Date.now()) {
  const normalized = normalizeSave({ ...save, updatedAt }, save?.animalId, save?.slot);
  const key = getSaveKey(normalized.animalId, normalized.slot);
  storage.setItem(key, JSON.stringify(normalized));
  return normalized;
}

export function deleteSaveSlot(storage, animalId, slot) {
  storage.removeItem(getSaveKey(animalId, slot));
}

export function formatPlaytime(seconds) {
  const total = toInt(seconds, 0);
  const minutes = Math.floor(total / 60);
  const remainingSeconds = total % 60;
  if (minutes <= 0) return `${remainingSeconds}s`;
  return `${minutes}m ${remainingSeconds}s`;
}

export function getZoneLabel(zoneId) {
  return ZONE_LABELS[zoneId] || zoneId;
}

export function summarizeSaveSlot(storage, animalId, slot) {
  const result = readSaveSlot(storage, animalId, slot);
  if (result.empty) {
    return {
      key: result.key,
      slot,
      empty: true,
      valid: true,
      label: 'NEW QUEST',
      animalId,
    };
  }

  if (!result.valid) {
    return {
      key: result.key,
      slot,
      empty: false,
      valid: false,
      label: 'CORRUPT SAVE',
      animalId,
      currentZone: 'hub',
      playtime: '0s',
      updatedAt: 0,
    };
  }

  const { save } = result;
  const zoneLabel = getZoneLabel(save.currentZone);
  return {
    key: result.key,
    slot,
    empty: false,
    valid: true,
    label: `LV ${save.player.level} - ${zoneLabel}`,
    animalId: save.animalId,
    level: save.player.level,
    xp: save.player.xp,
    hp: save.player.hp,
    maxHp: save.player.maxHp,
    currentZone: save.currentZone,
    zoneLabel,
    playtime: formatPlaytime(save.playtimeSeconds),
    playtimeSeconds: save.playtimeSeconds,
    updatedAt: save.updatedAt,
  };
}

export function listSaveSummaries(storage, animalId) {
  return Array.from({ length: SAVE_SLOT_COUNT }, (_, slot) => summarizeSaveSlot(storage, animalId, slot));
}

