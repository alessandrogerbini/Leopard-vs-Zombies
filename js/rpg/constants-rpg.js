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

export const ALPHA_ZONE_ORDER = [
  'hub',
  'forestEdge',
  'rabbitVillage',
  'monkeyJungle',
  'sunnyMeadow',
  'sandyBeach',
];

export const WORLD_ZONE_LOCKS = {
  hub: null,
  forestEdge: null,
  rabbitVillage: 'Complete The Hero Sign-Up Sheet',
  monkeyJungle: 'Rescue Rabbit Village',
  sunnyMeadow: 'Restore the banana stand',
  sandyBeach: 'Finish Turtle Express',
};

export const HUB_INTERACTABLES = [
  { id: 'questBoard', label: 'Quest Board', kind: 'questBoard', x: -2.4, z: -2.1, radius: 1.4 },
  { id: 'craftingBench', label: 'Crafting Bench', kind: 'craftingBench', x: 2.1, z: -1.8, radius: 1.2 },
  { id: 'worldMap', label: 'World Map', kind: 'worldMap', x: 0.2, z: 2.4, radius: 1.4 },
  { id: 'playerTent', label: 'Player Tent', kind: 'rest', x: -3.1, z: 1.8, radius: 1.1 },
  { id: 'storageChest', label: 'Storage Chest', kind: 'storage', x: 3.0, z: 1.5, radius: 1.1 },
];

export const HUB_NPC_CONTENT = [
  {
    id: 'grannyThistle',
    species: 'rabbit',
    name: 'Granny Thistle',
    questId: 'heroSignup',
    dialogueId: 'grannyHeroSignup',
    x: -1.25,
    z: -1.6,
    radius: 1.3,
    dialogue: ['The board has your first rescue chore.', 'Bring brave paws and a kind heart.'],
  },
  {
    id: 'scoutHazel',
    species: 'fox',
    name: 'Scout Hazel',
    questId: null,
    dialogueId: 'hazelHubWatch',
    x: 1.35,
    z: -0.95,
    radius: 1.2,
    dialogue: ['Forest Edge is open, but stay near the path.', 'I marked the safe trees with yellow ribbons.'],
  },
  {
    id: 'momoForeman',
    species: 'monkey',
    name: 'Momo Foreman',
    questId: null,
    dialogueId: 'momoBananaLater',
    x: -0.95,
    z: 1.15,
    radius: 1.2,
    dialogue: ['My banana crates are missing again.', 'Finish your sign-up and I will show you the mess.'],
  },
  {
    id: 'shellbert',
    species: 'turtle',
    name: 'Shellbert',
    questId: null,
    dialogueId: 'shellbertWaiting',
    x: 1.65,
    z: 1.25,
    radius: 1.2,
    dialogue: ['I am practicing emergency patience.', 'Please rescue loudly if you see trouble.'],
  },
];

export const QUEST_DEFINITIONS = {
  heroSignup: {
    id: 'heroSignup',
    title: 'The Hero Sign-Up Sheet',
    start: 'Quest Board',
    destinationZone: 'forestEdge',
    objective: 'Collect 5 Wood and bonk 3 tutorial zombies',
    rewardPreview: 'Wooden Club recipe, Rabbit Village route',
    prerequisites: [],
    progressDefaults: { wood: 0, tutorialZombies: 0 },
  },
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
