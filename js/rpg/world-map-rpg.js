/**
 * @module rpg/world-map-rpg
 * @description Pure world-map unlock view models for the RPG alpha.
 *
 * Dependencies: constants-rpg.js
 * Exports: getWorldMapEntries
 */

import { ALPHA_ZONE_ORDER, WORLD_ZONE_LOCKS, ZONE_LABELS } from './constants-rpg.js';

export function getWorldMapEntries(save) {
  const unlocked = new Set(Array.isArray(save?.unlockedZones) ? save.unlockedZones : []);
  return ALPHA_ZONE_ORDER.map(id => {
    const isUnlocked = unlocked.has(id);
    return {
      id,
      label: ZONE_LABELS[id] || id,
      unlocked: isUnlocked,
      reason: isUnlocked ? '' : WORLD_ZONE_LOCKS[id],
      current: save?.currentZone === id,
    };
  });
}

