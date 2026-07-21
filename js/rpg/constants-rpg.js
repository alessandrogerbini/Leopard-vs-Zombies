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
    completion: { wood: 5, tutorialZombies: 3 },
    reward: {
      xp: 10,
      ingredients: {},
      recipes: ['woodenClub'],
      unlockedZones: ['rabbitVillage'],
      stickers: ['myFirstBonk'],
      journalEntry: { id: 'heroSignupComplete', text: 'The Hero Sign-Up Sheet complete' },
    },
  },
  bunnyRescue: {
    id: 'bunnyRescue',
    title: 'Operation Bunny Rescue',
    start: 'Granny Thistle',
    destinationZone: 'rabbitVillage',
    objective: 'Rescue 3 rabbit villagers',
    rewardPreview: 'Rabbit friends, Monkey Jungle route',
    prerequisites: ['heroSignup'],
    progressDefaults: { rescuedRabbits: 0 },
    completion: { rescuedRabbits: 3 },
    reward: {
      xp: 20,
      ingredients: { wood: 4, glass: 2 },
      reputation: { rabbits: 'friend' },
      unlockedZones: ['monkeyJungle'],
      rescued: { rabbitVillage: true },
      stickers: ['rabbitRescuer'],
      journalEntry: { id: 'bunnyRescueComplete', text: 'Rabbit Village rescued' },
    },
  },
  bananaEmergency: {
    id: 'bananaEmergency',
    title: 'Banana Emergency',
    start: 'Momo Foreman',
    destinationZone: 'monkeyJungle',
    objective: 'Recover bananas and fire the Banana Cannon',
    rewardPreview: 'Banana Cannon payoff, Sunny Meadow route',
    prerequisites: ['bunnyRescue'],
    progressDefaults: { bananas: 0, bananaCannon: 0, bananaShot: 0, zombies: 0 },
    completion: { bananas: 8, bananaCannon: 1, bananaShot: 1, zombies: 5 },
    reward: {
      xp: 30,
      recipes: ['bananaCannon'],
      reputation: { monkeys: 'friend' },
      unlockedZones: ['sunnyMeadow'],
      rescued: { bananaStand: true },
      flags: { bananaCannonPayoff: true },
      stickers: ['bananaHero'],
      journalEntry: { id: 'bananaEmergencyComplete', text: 'Banana stand restored' },
    },
  },
  turtleExpress: {
    id: 'turtleExpress',
    title: 'Turtle Express',
    start: 'Shellbert',
    destinationZone: 'sunnyMeadow',
    objective: 'Escort Shellbert across Sunny Meadow',
    rewardPreview: 'Glass Telescope recipe, Sandy Beach route',
    prerequisites: ['bananaEmergency'],
    progressDefaults: { escortShellbert: 0 },
    completion: { escortShellbert: 1 },
    reward: {
      xp: 35,
      ingredients: { metal: 3, gems: 3 },
      recipes: ['glassTelescope'],
      reputation: { turtles: 'friend' },
      unlockedZones: ['sandyBeach'],
      rescued: { shellbert: true },
      stickers: ['turtleHelper'],
      journalEntry: { id: 'turtleExpressComplete', text: 'Shellbert safely escorted' },
    },
  },
  statueReveal: {
    id: 'statueReveal',
    title: 'Bigger Than My Statue',
    start: 'Owl Telescope',
    destinationZone: 'sandyBeach',
    objective: 'Use the Glass Telescope at Sandy Beach',
    rewardPreview: 'Spaceship reveal',
    prerequisites: ['turtleExpress'],
    progressDefaults: { glassTelescope: 0, telescopePoint: 0 },
    completion: { glassTelescope: 1, telescopePoint: 1 },
    reward: {
      xp: 40,
      flags: { spaceshipWitness: true, alphaEndCardUnlocked: true },
      stickers: ['spaceshipWitness'],
      journalEntry: { id: 'statueRevealComplete', text: 'Spaceship seen over Sandy Beach' },
    },
  },
};

export const LEVEL_XP_THRESHOLDS = {
  2: 20,
  3: 65,
  4: 145,
};

export const LEVEL_REWARDS = {
  2: { maxHp: 10, attack: 1 },
  3: { maxHp: 10, attack: 1 },
  4: { maxHp: 15, attack: 2 },
};

export const REPUTATION_REACTIONS = {
  rabbits: {
    stranger: 'The rabbits watch carefully from the cabbage fence.',
    friend: 'Your rabbit friends wave from the rescued garden.',
  },
  monkeys: {
    stranger: 'The monkeys are still guarding their banana crates.',
    friend: 'Your monkey friends cheer beside the banana stand.',
  },
  turtles: {
    stranger: 'The turtles nod politely and keep their helmets ready.',
    friend: 'Your turtle friends save a sunny path for you.',
  },
};

export const STICKER_DEFINITIONS = {
  myFirstBonk: { id: 'myFirstBonk', label: 'MY FIRST BONK' },
  rabbitRescuer: { id: 'rabbitRescuer', label: 'RABBIT RESCUER' },
  bananaHero: { id: 'bananaHero', label: 'BANANA HERO' },
  turtleHelper: { id: 'turtleHelper', label: 'TURTLE HELPER' },
  spaceshipWitness: { id: 'spaceshipWitness', label: 'SPACESHIP WITNESS' },
};

export const GATHERING_NODE_DEFINITIONS = [
  { id: 'forestEdge-stump-1', zoneId: 'forestEdge', ingredient: 'wood', amount: 3, x: -1.8, z: -1.1, radius: 1.1 },
  { id: 'forestEdge-stump-2', zoneId: 'forestEdge', ingredient: 'wood', amount: 2, x: 1.6, z: -0.8, radius: 1.1 },
  { id: 'rabbitVillage-window-1', zoneId: 'rabbitVillage', ingredient: 'glass', amount: 2, x: -2.1, z: 0.6, radius: 1.0 },
  { id: 'rabbitVillage-crate-1', zoneId: 'rabbitVillage', ingredient: 'wood', amount: 2, x: 2.0, z: 0.9, radius: 1.0 },
  { id: 'monkeyJungle-bunch-1', zoneId: 'monkeyJungle', ingredient: 'bananas', amount: 4, x: -1.4, z: 1.8, radius: 1.1 },
  { id: 'monkeyJungle-bunch-2', zoneId: 'monkeyJungle', ingredient: 'bananas', amount: 4, x: 1.9, z: 1.4, radius: 1.1 },
  { id: 'sunnyMeadow-scrap-1', zoneId: 'sunnyMeadow', ingredient: 'metal', amount: 2, x: -1.1, z: -2.0, radius: 1.0 },
  { id: 'sunnyMeadow-rock-1', zoneId: 'sunnyMeadow', ingredient: 'gems', amount: 2, x: 2.2, z: -1.6, radius: 1.0 },
  { id: 'sandyBeach-bottle-1', zoneId: 'sandyBeach', ingredient: 'glass', amount: 2, x: -2.0, z: 1.7, radius: 1.0 },
  { id: 'sandyBeach-tidejunk-1', zoneId: 'sandyBeach', ingredient: 'metal', amount: 1, x: 0.9, z: 2.1, radius: 1.0 },
  { id: 'sandyBeach-shell-1', zoneId: 'sandyBeach', ingredient: 'gems', amount: 1, x: 2.4, z: 0.8, radius: 1.0 },
];

export const RECIPE_DEFINITIONS = {
  woodenClub: {
    id: 'woodenClub',
    label: 'Wooden Club',
    cost: { wood: 5 },
    equipsTo: 'weapon',
    attackBonus: 4,
    effect: 'Adds 4 attack',
  },
  bananaTrap: {
    id: 'bananaTrap',
    label: 'Banana Trap',
    cost: { wood: 4, bananas: 4 },
    equipsTo: 'gadget',
    effect: 'Slows a small zombie group',
  },
  bananaCannon: {
    id: 'bananaCannon',
    label: 'Banana Cannon',
    cost: { wood: 2, bananas: 8, metal: 1 },
    equipsTo: 'weapon',
    attackBonus: 2,
    effect: 'Fires a banana-shot payoff',
  },
  glassTelescope: {
    id: 'glassTelescope',
    label: 'Glass Telescope',
    cost: { glass: 2, metal: 2, gems: 2 },
    equipsTo: 'gadget',
    effect: 'Reveals the Sandy Beach signal',
  },
};

export const TUTORIAL_ZOMBIES = [
  { id: 'tutorialZombieA', name: 'Training Zombie', hp: 8, attack: 14, x: -1.2, z: -1.4, radius: 0.9 },
  { id: 'tutorialZombieB', name: 'Training Zombie', hp: 8, attack: 14, x: 1.3, z: -1.0, radius: 0.9 },
  { id: 'tutorialZombieC', name: 'Training Zombie', hp: 8, attack: 14, x: 0.1, z: 1.4, radius: 0.9 },
];

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
