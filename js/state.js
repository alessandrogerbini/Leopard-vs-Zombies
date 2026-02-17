// Shared game state - all mutable globals live here
export const GRAVITY = 0.485;
export const GROUND_Y = 440;

export const BASE_PLAYER_W = 48;
export const BASE_PLAYER_H = 60;
export const DRAW_SCALE = 1.2;

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
};

export const player = {
  x: 80, y: GROUND_Y, w: BASE_PLAYER_W, h: BASE_PLAYER_H,
  vx: 0, vy: 0,
  speed: 3.75, jumpForce: -12.75,
  baseSpeed: 3.75, baseJumpForce: -12.75, baseDamage: 15, baseCooldown: 20,
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
    superFangs: 0
  }
};

export const camera = { x: 0, y: 0 };

export const POWERUP_TYPES = [
  { id: 'jumpyBoots', name: 'JUMPY BOOTS', color: '#44ff88', desc: '+50% Jump Height', icon: 'boot' },
  { id: 'clawsOfSteel', name: 'CLAWS OF STEEL', color: '#ff8844', desc: '2x Attack Damage', icon: 'claw' },
  { id: 'superFangs', name: 'SUPER FANGS', color: '#ff44ff', desc: '2x Attack Speed', icon: 'fang' },
];
export const POWERUP_DURATION = 600;
