/**
 * @module rpg/zone
 * @description Pure RPG zone metadata factories.
 *
 * Dependencies: constants-rpg.js
 * Exports: createHubZone
 */

import { HUB_INTERACTABLES, ZONE_LABELS } from './constants-rpg.js';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createHubZone(save) {
  return {
    id: 'hub',
    label: ZONE_LABELS.hub,
    currentZone: save?.currentZone || 'hub',
    safeBoundary: { x: 0, z: 0, radius: 5.4 },
    enemies: [],
    damageSources: [],
    interactables: HUB_INTERACTABLES.map(item => clone(item)),
  };
}

