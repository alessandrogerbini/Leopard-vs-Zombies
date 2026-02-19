// Shared game state - all mutable globals live here
export const GRAVITY = 0.325;
export const GROUND_Y = 440;

export const BASE_PLAYER_W = 48;
export const BASE_PLAYER_H = 60;
export const DRAW_SCALE = 1.62;

export const keys = {};

export const state = {
  gameState: 'title', // title, playing, bossIntro, bossFight, levelComplete, gameWin, gameOver
  currentLevel: 1,
  screenShake: 0,
  screenFlash: 0,
  particles: [],
  floatingTexts: [],
  transitionTimer: 0,
  levelData: null,
  zombies: [],
  healthPickups: [],
  powerupCrates: [],
  diamond: null,
  boss: null,
  bossIntroTimer: 0,
  deathTimer: 0,
  portal: null,
  projectiles: [],
  armorCrates: [],
  armorPickups: [],
  glassesCrates: [],
  glassesPickups: [],
  sneakersCrates: [],
  sneakersPickups: [],
};

export const player = {
  x: 80, y: GROUND_Y, w: BASE_PLAYER_W, h: BASE_PLAYER_H,
  vx: 0, vy: 0,
  speed: 2.8125, jumpForce: -12.75,
  baseSpeed: 2.8125, baseJumpForce: -12.75, baseDamage: 15, baseCooldown: 20,
  onGround: false,
  hp: 100, maxHp: 100,
  attacking: false, attackTimer: 0, attackCooldown: 0,
  facing: 1,
  frame: 0, frameTimer: 0,
  invincible: 0,
  combo: 0, comboTimer: 0,
  score: 0, lives: 3,
  knockbackX: 0,
  powerups: {
    jumpyBoots: 0,
    clawsOfSteel: 0,
    superFangs: 0,
    raceCar: 0,
    bananaCannon: 0,
    litterBox: 0,
    wings: 0
  },
  items: {
    armor: null,  // null, 'leather', or 'chainmail'
    glasses: false, // aviator glasses - see powerup crate contents
    sneakers: true, // high-top sneakers - 50% more jump hangtime (always equipped from start)
    cowboyBoots: false // cowboy boots - +20% attack range
  }
};

export const camera = { x: 0, y: 0 };

export const POWERUP_TYPES = [
  { id: 'jumpyBoots', name: 'JUMPY BOOTS', color: '#44ff88', desc: '+50% Jump Height', icon: 'boot' },
  { id: 'clawsOfSteel', name: 'CLAWS OF STEEL', color: '#ff8844', desc: '2x Attack Damage', icon: 'claw' },
  { id: 'superFangs', name: 'SUPER FANGS', color: '#ff44ff', desc: '2x Attack Speed', icon: 'fang' },
  { id: 'raceCar', name: 'RACE CAR', color: '#cc2222', desc: 'Jet Fire + Speed!', icon: 'car' },
  { id: 'bananaCannon', name: 'BANANA CANNON', color: '#ffdd00', desc: 'Ranged Boomerang!', icon: 'banana' },
  { id: 'litterBox', name: 'LITTER BOX', color: '#aa8844', desc: 'Rear AOE Attack!', icon: 'litter' },
  { id: 'wings', name: 'ANGEL WINGS', color: '#aaddff', desc: 'Fly Anywhere!', icon: 'wings' },
];
export const POWERUP_DURATION = 1500;

export const POWERUP_AMMO = {
  jumpyBoots: 15,
  clawsOfSteel: 25,
  superFangs: 25,
  raceCar: 500,
  bananaCannon: 12,
  litterBox: 8,
  wings: 600,
};

export const ARMOR_TYPES = [
  { id: 'leather', name: 'LEATHER ARMOR', color: '#b08040', desc: 'Light Protection', tier: 1, level: 2 },
  { id: 'chainmail', name: 'CHAINMAIL ARMOR', color: '#aaaacc', desc: 'Medium Protection', tier: 2, level: 3 },
];

export const GLASSES_TYPE = {
  id: 'aviator', name: 'AVIATOR GLASSES', color: '#ffaa00', desc: 'See Crate Contents!', level: 1
};

export const SNEAKERS_TYPE = {
  id: 'cowboyBoots', name: 'COWBOY BOOTS', color: '#8B4513', desc: '+20% Attack Range!', level: 2
};
