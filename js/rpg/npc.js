/**
 * @module rpg/npc
 * @description RPG NPC metadata factories for hub prompts and dialogue.
 *
 * Dependencies: constants-rpg.js
 * Exports: createHubNpcs, getNpcById
 */

import { HUB_NPC_CONTENT } from './constants-rpg.js';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createHubNpcs(save) {
  return HUB_NPC_CONTENT.map(npc => ({
    ...clone(npc),
    saveAnimalId: save?.animalId || 'leopard',
    group: null,
  }));
}

export function getNpcById(id, save) {
  return createHubNpcs(save).find(npc => npc.id === id) || null;
}

