/**
 * @module rpg/constants-rpg
 * @description Stable RPG alpha constants shared by persistence, HUD, and runtime orchestration.
 *
 * Dependencies: none
 * Exports: save schema constants, alpha ingredient ids, zone labels, reputation states
 */

export const RPG_SAVE_VERSION = 1;
export const RPG_SAVE_PREFIX = 'lvz:rpg';
export const SAVE_SLOT_COUNT = 3;

export const INGREDIENT_IDS = ['wood', 'metal', 'bananas', 'gems', 'glass'];

export const DEFAULT_UNLOCKED_ZONES = ['hub', 'forestEdge'];

export const ZONE_LABELS = {
  hub: 'Hub',
  forestEdge: 'Forest Edge',
  rabbitVillage: 'Rabbit Village',
  monkeyJungle: 'Monkey Jungle',
  sunnyMeadow: 'Sunny Meadow',
  sandyBeach: 'Sandy Beach',
};

export const REPUTATION_DEFAULTS = {
  rabbits: 'stranger',
  monkeys: 'stranger',
  turtles: 'stranger',
};

export const RESCUE_DEFAULTS = {
  rabbitVillage: false,
  bananaStand: false,
  shellbert: false,
};

