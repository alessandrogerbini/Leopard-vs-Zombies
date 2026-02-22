// 3D Roguelike Survivor Mode
// Uses Three.js (loaded globally via CDN) + HUD overlay canvas

const ARENA_SIZE = 80;
const SHRINE_COUNT = 20;
const CHUNK_SIZE = 16;
const GRAVITY_3D = 22;
const JUMP_FORCE = 10;
const GROUND_Y = 0;
const MAP_HALF = 128; // 256x256 total map (extends -128 to +128 on both axes)

// Animal color palettes for 3D models
const ANIMAL_PALETTES = {
  leopard: { body: 0xe8a828, head: 0xf0c050, accent: 0xd09020, spot: 0xa06810, tail: 0xc08818 },
  redPanda: { body: 0xcc4422, head: 0xdd6644, accent: 0xaa3311, spot: 0x882200, tail: 0xbb3318 },
  lion: { body: 0xdda030, head: 0xeebb44, accent: 0xcc8820, spot: 0xaa6610, tail: 0xbb7718 },
  gator: { body: 0x44aa44, head: 0x55cc55, accent: 0x338833, spot: 0x226622, tail: 0x2a7a2a },
};

// Weapon types for weapon slot system
const WEAPON_TYPES = {
  clawSwipe: {
    id: 'clawSwipe', name: 'CLAW SWIPE', type: 'melee', color: '#ff8844',
    desc: 'AoE arc slash', baseDamage: 12, baseCooldown: 1.2, baseRange: 2.5, maxLevel: 5,
    levelDescs: ['+20% Damage', '+15% Range', '+20% Damage', '-15% Cooldown', '+30% Damage & Range'],
  },
  boneToss: {
    id: 'boneToss', name: 'BONE TOSS', type: 'projectile', color: '#ccccaa',
    desc: 'Ranged bone projectile', baseDamage: 10, baseCooldown: 1.5, baseRange: 12, maxLevel: 5,
    levelDescs: ['+25% Damage', '+1 Projectile', '+20% Speed', '-20% Cooldown', '+2 Projectiles'],
  },
  poisonCloud: {
    id: 'poisonCloud', name: 'POISON CLOUD', type: 'aoe', color: '#44cc44',
    desc: 'DoT cloud at enemy', baseDamage: 5, baseCooldown: 3, baseRange: 8, maxLevel: 5,
    levelDescs: ['+30% Damage', '+25% Area', '+30% Duration', '-20% Cooldown', '+50% Damage'],
  },
  lightningBolt: {
    id: 'lightningBolt', name: 'LIGHTNING BOLT', type: 'chain', color: '#aaddff',
    desc: 'Chains between enemies', baseDamage: 15, baseCooldown: 2, baseRange: 8, maxLevel: 5,
    levelDescs: ['+1 Chain', '+20% Damage', '+1 Chain', '-15% Cooldown', '+2 Chains & +30% Dmg'],
  },
  fireball: {
    id: 'fireball', name: 'FIREBALL', type: 'projectile_aoe', color: '#ff4400',
    desc: 'Explodes on impact', baseDamage: 20, baseCooldown: 2.5, baseRange: 10, maxLevel: 5,
    levelDescs: ['+25% Damage', '+30% Explosion', '+25% Damage', '-20% Cooldown', '+50% AoE Damage'],
  },
  boomerang: {
    id: 'boomerang', name: 'BOOMERANG', type: 'boomerang', color: '#aa44ff',
    desc: 'Piercing, returns', baseDamage: 8, baseCooldown: 1.8, baseRange: 10, maxLevel: 5,
    levelDescs: ['+20% Damage', '+1 Boomerang', '+25% Speed', '-15% Cooldown', 'Double Damage'],
  },
};

const SCROLL_TYPES = {
  power: { id: 'power', name: 'POWER SCROLL', color: '#ff4444', desc: '+15% all weapon damage', maxLevel: 5 },
  haste: { id: 'haste', name: 'HASTE SCROLL', color: '#ffaa44', desc: '-15% all cooldowns', maxLevel: 5 },
  arcane: { id: 'arcane', name: 'ARCANE SCROLL', color: '#aa44ff', desc: '+1 projectile count', maxLevel: 3 },
  vitality: { id: 'vitality', name: 'VITALITY SCROLL', color: '#44ff44', desc: '+20 max HP & heal', maxLevel: 5 },
  fortune: { id: 'fortune', name: 'FORTUNE SCROLL', color: '#ffff44', desc: '+30% XP gain', maxLevel: 3 },
  range: { id: 'range', name: 'RANGE SCROLL', color: '#44aaff', desc: '+20% weapon range', maxLevel: 5 },
};

// Powerup definitions for 3D (adapted from 2D)
const POWERUPS_3D = [
  { id: 'jumpyBoots', name: 'JUMPY BOOTS', color: '#44ff88', colorHex: 0x44ff88, desc: '+50% Jump Height', duration: 15, apply: s => { s.jumpBoost = 1.5; }, remove: s => { s.jumpBoost = 1; } },
  { id: 'clawsOfSteel', name: 'CLAWS OF STEEL', color: '#ff8844', colorHex: 0xff8844, desc: '2x Attack Damage', duration: 20, apply: s => { s.dmgBoost = 2; }, remove: s => { s.dmgBoost = 1; } },
  { id: 'superFangs', name: 'SUPER FANGS', color: '#ff44ff', colorHex: 0xff44ff, desc: '2x Attack Speed', duration: 20, apply: s => { s.atkSpeedBoost = 2; }, remove: s => { s.atkSpeedBoost = 1; } },
  { id: 'raceCar', name: 'RACE CAR', color: '#cc2222', colorHex: 0xcc2222, desc: '2x Speed + Fire!', duration: 12, apply: s => { s.speedBoost = 2; s.fireAura = true; }, remove: s => { s.speedBoost = 1; s.fireAura = false; } },
  { id: 'bananaCannon', name: 'BANANA CANNON', color: '#ffdd00', colorHex: 0xffdd00, desc: 'Ranged Attack!', duration: 15, apply: s => { s.rangedMode = true; }, remove: s => { s.rangedMode = false; } },
  { id: 'wings', name: 'ANGEL WINGS', color: '#aaddff', colorHex: 0xaaddff, desc: 'Fly Anywhere!', duration: 15, apply: s => { s.flying = true; }, remove: s => { s.flying = false; s.gManeuver = false; s.gManeuverPitch = 0; } },
  { id: 'frostNova', name: 'FROST NOVA', color: '#88ccff', colorHex: 0x88ccff, desc: 'Freeze Nearby Zombies!', duration: 1, apply: s => { s.frostNova = true; }, remove: s => { s.frostNova = false; } },
  { id: 'berserkerRage', name: 'BERSERKER RAGE', color: '#881111', colorHex: 0x881111, desc: '+50% Dmg, +30% Spd, +25% Vuln', duration: 20, apply: s => { s.dmgBoost = 1.5; s.speedBoost = 1.3; s.berserkVulnerable = true; }, remove: s => { s.dmgBoost = 1; s.speedBoost = 1; s.berserkVulnerable = false; } },
  { id: 'ghostForm', name: 'GHOST FORM', color: '#eeeeff', colorHex: 0xeeeeff, desc: 'Invulnerable, Can\'t Attack', duration: 8, apply: s => { s.ghostForm = true; s.invincible = 999; }, remove: s => { s.ghostForm = false; s.invincible = 0; } },
  { id: 'earthquakeStomp', name: 'EARTHQUAKE STOMP', color: '#8B6914', colorHex: 0x8B6914, desc: 'Landings Create Shockwaves!', duration: 15, apply: s => { s.earthquakeStomp = true; }, remove: s => { s.earthquakeStomp = false; } },
  { id: 'vampireFangs', name: 'VAMPIRE FANGS', color: '#6a0dad', colorHex: 0x6a0dad, desc: 'Passive HP Regen!', duration: 20, apply: s => { s.vampireHeal = true; }, remove: s => { s.vampireHeal = false; } },
  { id: 'lightningShield', name: 'LIGHTNING SHIELD', color: '#44aaff', colorHex: 0x44aaff, desc: 'Zap Nearby Enemies!', duration: 15, apply: s => { s.lightningShield = true; s.lightningShieldTimer = 0; }, remove: s => { s.lightningShield = false; } },
  { id: 'giantGrowth', name: 'GIANT GROWTH', color: '#22cc44', colorHex: 0x22cc44, desc: '2x Size & Dmg, -30% Speed', duration: 15, apply: s => { s.dmgBoost = 2; s.speedBoost = 0.7; s.giantMode = true; }, remove: s => { s.dmgBoost = 1; s.speedBoost = 1; s.giantMode = false; } },
  { id: 'timeWarp', name: 'TIME WARP', color: '#9944ff', colorHex: 0x9944ff, desc: 'Slow All Zombies!', duration: 10, apply: s => { s.timeWarp = true; for (const e of s.enemies) e.speed *= 0.25; }, remove: s => { s.timeWarp = false; for (const e of s.enemies) e.speed *= 4; } },
  { id: 'magnetAura', name: 'MAGNET AURA', color: '#aaaaaa', colorHex: 0xaaaaaa, desc: '5x Pickup Radius!', duration: 20, apply: s => { s.collectRadius *= 5; }, remove: s => { s.collectRadius /= 5; } },
  { id: 'mirrorImage', name: 'MIRROR IMAGE', color: '#44ffff', colorHex: 0x44ffff, desc: 'AI Clones Fight For You!', duration: 15, apply: s => { s.mirrorClones = true; }, remove: s => { s.mirrorClones = false; } },
  { id: 'bombTrail', name: 'BOMB TRAIL', color: '#ff6622', colorHex: 0xff6622, desc: 'Leave Explosive Bombs!', duration: 12, apply: s => { s.bombTrail = true; s.bombTrailTimer = 0; }, remove: s => { s.bombTrail = false; } },
  { id: 'regenBurst', name: 'REGEN BURST', color: '#33ff33', colorHex: 0x33ff33, desc: 'Rapidly Heal To Full!', duration: 5, apply: s => { s.regenBurst = true; }, remove: s => { s.regenBurst = false; } },
];

// Item definitions for 3D
const ITEMS_3D = [
  { id: 'leather', name: 'LEATHER ARMOR', color: '#b08040', colorHex: 0xb08040, desc: '-25% Damage Taken', slot: 'armor', tier: 1 },
  { id: 'chainmail', name: 'CHAINMAIL', color: '#aaaacc', colorHex: 0xaaaacc, desc: '-40% Damage Taken', slot: 'armor', tier: 2 },
  { id: 'glasses', name: 'AVIATOR GLASSES', color: '#ffaa00', colorHex: 0xffaa00, desc: 'See Crate Contents', slot: 'glasses' },
  { id: 'cowboyBoots', name: 'COWBOY BOOTS', color: '#8B4513', colorHex: 0x8B4513, desc: '+20% Attack Range', slot: 'boots' },
  { id: 'soccerCleats', name: 'SOCCER CLEATS', color: '#00cc44', colorHex: 0x00cc44, desc: '+15% Move Speed', slot: 'boots' },
  { id: 'magnetRing', name: 'MAGNET RING', color: '#cccccc', colorHex: 0xcccccc, desc: '+50% Pickup Radius', slot: 'ring' },
  { id: 'luckyCharm', name: 'LUCKY CHARM', color: '#ffdd44', colorHex: 0xffdd44, desc: '+50% Drop Rate', slot: 'charm' },
  { id: 'thornedVest', name: 'THORNED VEST', color: '#cc4422', colorHex: 0xcc4422, desc: 'Reflect 20% Damage', slot: 'vest' },
  { id: 'healthPendant', name: 'HEALTH PENDANT', color: '#44ff88', colorHex: 0x44ff88, desc: '+1 HP/s Regen', slot: 'pendant' },
  { id: 'shieldBracelet', name: 'SHIELD BRACELET', color: '#4488ff', colorHex: 0x4488ff, desc: 'Block 1 Hit / 30s', slot: 'bracelet' },
  { id: 'critGloves', name: 'CRIT GLOVES', color: '#ff4488', colorHex: 0xff4488, desc: '15% Chance 2x Damage', slot: 'gloves' },
];

// Shrine augment types
const SHRINE_AUGMENTS = [
  { id: 'maxHp', name: '+5% Max HP', color: '#44ff44', apply: s => { s.maxHp = Math.floor(s.maxHp * 1.05); s.hp = Math.min(s.hp + 10, s.maxHp); } },
  { id: 'xpGain', name: '+5% XP Gain', color: '#44aaff', apply: s => { s.augmentXpMult = (s.augmentXpMult || 1) * 1.05; } },
  { id: 'damage', name: '+5% Damage', color: '#ff4444', apply: s => { s.augmentDmgMult = (s.augmentDmgMult || 1) * 1.05; } },
  { id: 'moveSpeed', name: '+5% Move Speed', color: '#ffaa44', apply: s => { s.playerSpeed *= 1.05; } },
  { id: 'atkSpeed', name: '+5% Attack Speed', color: '#ff44ff', apply: s => { s.attackSpeed *= 1.05; } },
  { id: 'pickupRadius', name: '+10% Pickup Radius', color: '#ffff44', apply: s => { s.collectRadius *= 1.1; } },
  { id: 'armor', name: '+3% Armor', color: '#aaaacc', apply: s => { s.augmentArmor = (s.augmentArmor || 0) + 0.03; } },
  { id: 'regen', name: '+0.5 HP/s Regen', color: '#88ffaa', apply: s => { s.augmentRegen = (s.augmentRegen || 0) + 0.5; } },
];

// "NOT HARD ENOUGH" difficulty totem effects
const TOTEM_EFFECT = {
  zombieHpMult: 1.15,     // +15% zombie HP per totem
  zombieSpeedMult: 1.10,  // +10% zombie speed per totem
  spawnRateMult: 1.15,    // +15% spawn rate per totem
  xpBonusMult: 1.25,      // +25% XP per totem
  scoreBonusMult: 1.25,   // +25% score per totem
};

export function launch3DGame(options) {
  const onReturn = options.onReturn;
  const animalData = options.animal; // { id, name, color, speed, damage, hp, desc }
  const diffData = options.difficulty; // { hpMult, scoreMult, ... }
  const animalId = animalData.id;
  const palette = ANIMAL_PALETTES[animalId] || ANIMAL_PALETTES.leopard;

  const canvas3d = document.getElementById('game3d');
  const hudCanvas = document.getElementById('hud3d');
  const hudCtx = hudCanvas.getContext('2d');

  canvas3d.style.display = 'block';
  hudCanvas.style.display = 'block';

  // Fullscreen: expand container and canvases to fill browser window
  const container = document.getElementById('game-container');
  const canvas2d = document.getElementById('game');
  container.style.width = '100vw';
  container.style.height = '100vh';
  canvas2d.style.display = 'none';
  canvas3d.style.width = '100%';
  canvas3d.style.height = '100%';
  hudCanvas.style.width = '100%';
  hudCanvas.style.height = '100%';

  // === STATE ===
  const st = {
    // Player stats (scaled by animal + difficulty)
    hp: Math.floor(animalData.hp * diffData.hpMult),
    maxHp: Math.floor(animalData.hp * diffData.hpMult),
    playerSpeed: 5 * animalData.speed,
    attackSpeed: 1.2,
    attackDamage: 15 * animalData.damage,
    attackRange: 3,
    collectRadius: 2,
    jumpForce: JUMP_FORCE,
    attackTimer: 0, // legacy, kept for crate proximity check
    playerX: 0, playerY: GROUND_Y + 0.2, playerZ: 0,
    playerVY: 0,
    onGround: true,
    onPlatformY: null, // Y of the platform we're standing on
    moveDir: { x: 0, z: 0 },
    scoreMult: diffData.scoreMult,
    zombieDmgMult: diffData.hpMult >= 1.0 ? 2 : diffData.hpMult >= 0.5 ? 3 : 4,
    score: 0,
    wave: 1,
    ambientSpawnTimer: 3,
    waveEventTimer: 240,  // 4 minutes until first wave event
    waveWarning: 0,       // countdown seconds (0 = no warning)
    waveActive: false,
    ambientCrateTimer: 30,
    gameTime: 0,          // total elapsed game time in seconds
    xp: 0, xpToNext: 10, level: 1,
    enemies: [],
    xpGems: [],
    attackLines: [],
    powerupCrates: [],
    itemPickups: [],
    projectiles: [],
    // Active powerup state
    activePowerup: null, // { def, timer }
    jumpBoost: 1,
    dmgBoost: 1,
    atkSpeedBoost: 1,
    speedBoost: 1,
    fireAura: false,
    rangedMode: false,
    flying: false,
    frostNova: false,
    berserkVulnerable: false,
    ghostForm: false,
    earthquakeStomp: false,
    vampireHeal: false,
    lightningShield: false,
    lightningShieldTimer: 0,
    giantMode: false,
    timeWarp: false,
    mirrorClones: false,
    mirrorCloneGroups: [],
    bombTrail: false,
    bombTrailTimer: 0,
    bombTrailBombs: [],
    regenBurst: false,
    wasAirborne: false,
    // G-force maneuver state (Top Gun style loops/dives while flying)
    gManeuver: false,
    gManeuverPitch: 0,
    // Items (permanent)
    items: { armor: null, glasses: false, boots: null, ring: false, charm: false, vest: false, pendant: false, bracelet: false, gloves: false },
    shieldBraceletTimer: 0,
    shieldBraceletReady: true,
    // UI
    gameOver: false,
    paused: false,
    upgradeMenu: false,
    upgradeChoices: [],
    selectedUpgrade: 0,
    running: true,
    invincible: 0,
    enterReleasedSinceGameOver: false,
    pauseMenu: false,
    selectedPauseOption: 0,
    // Auto-attack + power attack
    autoAttackTimer: 0,
    charging: false,
    chargeTime: 0,
    chargeGlow: null,
    // Weapon slots
    weapons: [],
    maxWeaponSlots: 1,
    scrolls: { power: 0, haste: 0, arcane: 0, vitality: 0, fortune: 0, range: 0 },
    rerolls: 3, // rerolls per game
    weaponProjectiles: [],
    weaponEffects: [],
    // Shrines
    shrines: [],
    shrinesByChunk: {},
    augments: {},
    augmentXpMult: 1,
    augmentDmgMult: 1,
    augmentArmor: 0,
    augmentRegen: 0,
    // Difficulty totems
    totems: [],
    totemCount: 0,
    totemDiffMult: 1,
    totemSpeedMult: 1,
    totemSpawnMult: 1,
    totemXpMult: 1,
    totemScoreMult: 1,
    // Floating texts for shrine/augment announcements
    floatingTexts3d: [],
    // Leaderboard
    nameEntry: '',
    nameEntryActive: false,
    leaderboard3d: [],
    // Kill tracking
    killsByTier: new Array(10).fill(0),
    totalKills: 0,
    // Game timer
    gameTime: 0,
  };

  // Load 3D leaderboard
  const diffKey = diffData.scoreMult >= 1.5 ? 'hard' : diffData.scoreMult >= 1 ? 'normal' : 'easy';
  st.leaderboard3d = JSON.parse(localStorage.getItem(`avz3d-leaderboard-${diffKey}`) || '[]');

  function saveScore3d() {
    st.leaderboard3d.push({
      name: st.nameEntry,
      score: st.score,
      animal: animalData.name,
      level: st.level,
      wave: st.wave - 1,
      time: st.gameTime,
      kills: st.totalKills,
      date: Date.now()
    });
    st.leaderboard3d.sort((a, b) => b.score - a.score);
    st.leaderboard3d = st.leaderboard3d.slice(0, 10);
    localStorage.setItem(`avz3d-leaderboard-${diffKey}`, JSON.stringify(st.leaderboard3d));
  }

  // Animal-specific starting weapon
  const ANIMAL_WEAPONS = {
    leopard: 'clawSwipe',
    redPanda: 'boomerang',
    lion: 'lightningBolt',
    gator: 'poisonCloud',
  };
  const startWeapon = ANIMAL_WEAPONS[animalId] || 'clawSwipe';
  st.weapons.push({ typeId: startWeapon, level: 1, cooldownTimer: 0 });

  // === INPUT ===
  const keys3d = {};
  function onKeyDown(e) {
    keys3d[e.code] = true;
    e.preventDefault();
    if (st.gameOver && !st.upgradeMenu && st.enterReleasedSinceGameOver) {
      if (st.nameEntryActive) {
        // Name entry text input
        if (e.key === 'Backspace') {
          st.nameEntry = st.nameEntry.slice(0, -1);
        } else if (e.key === 'Enter' && st.nameEntry.length > 0) {
          saveScore3d();
          st.nameEntryActive = false;
        } else if (e.key.length === 1 && st.nameEntry.length < 10) {
          st.nameEntry += e.key.toUpperCase();
        }
      } else if (e.code === 'Enter') {
        cleanup();
        onReturn();
      }
    } else if (st.upgradeMenu && !st.gameOver) {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') st.selectedUpgrade = (st.selectedUpgrade - 1 + st.upgradeChoices.length) % st.upgradeChoices.length;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') st.selectedUpgrade = (st.selectedUpgrade + 1) % st.upgradeChoices.length;
      if (e.code === 'Enter' || e.code === 'Space') {
        const choice = st.upgradeChoices[st.selectedUpgrade];
        choice.apply(st);
        st.upgradeMenu = false;
        st.paused = false;
      }
      if (e.code === 'KeyR' && st.rerolls > 0) {
        st.rerolls--;
        showUpgradeMenu(); // re-generates choices
      }
    } else if (st.pauseMenu && !st.gameOver) {
      // Pause menu navigation
      if (e.code === 'Escape') {
        // Unpause via Escape
        st.paused = false;
        st.pauseMenu = false;
      } else if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        st.selectedPauseOption = (st.selectedPauseOption - 1 + 3) % 3;
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        st.selectedPauseOption = (st.selectedPauseOption + 1) % 3;
      } else if (e.code === 'Enter' || e.code === 'Space') {
        if (st.selectedPauseOption === 0) {
          // Resume
          st.paused = false;
          st.pauseMenu = false;
        } else if (st.selectedPauseOption === 1) {
          // Restart
          cleanup();
          launch3DGame({ animal: animalData, difficulty: diffData, onReturn });
        } else if (st.selectedPauseOption === 2) {
          // Main Menu
          cleanup();
          onReturn();
        }
      }
    } else if (!st.gameOver && !st.upgradeMenu && !st.pauseMenu) {
      // Normal gameplay — Enter/NumpadEnter/B handled by power attack in game loop via keys3d
      // Escape opens pause menu
      if (e.code === 'Escape') {
        st.paused = true;
        st.pauseMenu = true;
        st.selectedPauseOption = 0;
      }
    }
  }
  function onKeyUp(e) {
    keys3d[e.code] = false;
    e.preventDefault();
    if (st.gameOver && (e.code === 'Enter' || e.code === 'NumpadEnter')) {
      st.enterReleasedSinceGameOver = true;
    }
    // Power attack release
    if ((e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'KeyB') && st.charging && !st.gameOver && !st.upgradeMenu && !st.pauseMenu) {
      st.charging = false;
      st.powerAttackReady = true;
    }
  }
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  // === THREE.JS SCENE ===
  const renderer = new THREE.WebGLRenderer({ canvas: canvas3d, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x87CEEB); // sky blue

  // HUD canvas matches window size
  hudCanvas.width = window.innerWidth;
  hudCanvas.height = window.innerHeight;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x87CEEB, 40, 90);

  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 150);

  // Handle window resize
  function onResize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    hudCanvas.width = w;
    hudCanvas.height = h;
  }
  window.addEventListener('resize', onResize);
  camera.position.set(0, 18, 14);
  camera.lookAt(0, 0, 0);

  // Lights
  const ambientLight = new THREE.AmbientLight(0x667788, 0.5);
  scene.add(ambientLight);
  const dirLight = new THREE.DirectionalLight(0xffeedd, 0.9);
  dirLight.position.set(10, 20, 10);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  dirLight.shadow.camera.near = 0.5;
  dirLight.shadow.camera.far = 80;
  dirLight.shadow.camera.left = -40;
  dirLight.shadow.camera.right = 40;
  dirLight.shadow.camera.top = 40;
  dirLight.shadow.camera.bottom = -40;
  scene.add(dirLight);
  scene.add(dirLight.target);

  // === MAP BOUNDARY WALLS ===
  const wallHeight = 8;
  const wallThickness = 2;
  const wallColor = 0x665544;
  const wallMat = new THREE.MeshLambertMaterial({ color: wallColor });
  // North wall
  const northWall = new THREE.Mesh(new THREE.BoxGeometry(MAP_HALF * 2 + wallThickness * 2, wallHeight, wallThickness), wallMat);
  northWall.position.set(0, wallHeight / 2, -MAP_HALF - wallThickness / 2);
  northWall.castShadow = true; northWall.receiveShadow = true;
  scene.add(northWall);
  // South wall
  const southWall = new THREE.Mesh(new THREE.BoxGeometry(MAP_HALF * 2 + wallThickness * 2, wallHeight, wallThickness), wallMat);
  southWall.position.set(0, wallHeight / 2, MAP_HALF + wallThickness / 2);
  southWall.castShadow = true; southWall.receiveShadow = true;
  scene.add(southWall);
  // West wall
  const westWall = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, wallHeight, MAP_HALF * 2), wallMat);
  westWall.position.set(-MAP_HALF - wallThickness / 2, wallHeight / 2, 0);
  westWall.castShadow = true; westWall.receiveShadow = true;
  scene.add(westWall);
  // East wall
  const eastWall = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, wallHeight, MAP_HALF * 2), wallMat);
  eastWall.position.set(MAP_HALF + wallThickness / 2, wallHeight / 2, 0);
  eastWall.castShadow = true; eastWall.receiveShadow = true;
  scene.add(eastWall);

  // === PROCEDURAL TERRAIN ===
  // Seeded noise for deterministic terrain
  function noise2D(x, z) {
    const n = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
    return n - Math.floor(n);
  }
  function smoothNoise(x, z, scale) {
    const sx = x / scale, sz = z / scale;
    const ix = Math.floor(sx), iz = Math.floor(sz);
    const fx = sx - ix, fz = sz - iz;
    const a = noise2D(ix, iz), b = noise2D(ix + 1, iz);
    const c = noise2D(ix, iz + 1), d = noise2D(ix + 1, iz + 1);
    const u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
    return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
  }
  function terrainHeight(x, z) {
    return smoothNoise(x, z, 12) * 2 + smoothNoise(x, z, 6) * 1 + smoothNoise(x, z, 3) * 0.3;
  }
  function getBiome(x, z) {
    const v = smoothNoise(x + 500, z + 500, 25);
    if (v < 0.33) return 'forest';
    if (v < 0.66) return 'desert';
    return 'plains';
  }
  const BIOME_COLORS = {
    forest: [0x1a6622, 0x228833, 0x2a7a2a],
    desert: [0xc4a44a, 0xbba040, 0xd4b44a],
    plains: [0x44aa44, 0x55bb55, 0x3a9a3a],
  };

  // Generate terrain chunks
  const terrainChunks = {};
  const chunkMeshes = {};
  const loadedChunks = new Set();
  const decorations = []; // trees, rocks, etc.

  function getChunkKey(cx, cz) { return `${cx},${cz}`; }

  function generateChunk(cx, cz) {
    const key = getChunkKey(cx, cz);
    if (loadedChunks.has(key)) return;
    // Skip chunks entirely outside map bounds
    const chunkMinX = cx * CHUNK_SIZE;
    const chunkMaxX = chunkMinX + CHUNK_SIZE;
    const chunkMinZ = cz * CHUNK_SIZE;
    const chunkMaxZ = chunkMinZ + CHUNK_SIZE;
    if (chunkMaxX < -MAP_HALF || chunkMinX > MAP_HALF || chunkMaxZ < -MAP_HALF || chunkMinZ > MAP_HALF) return;
    loadedChunks.add(key);

    const ox = cx * CHUNK_SIZE, oz = cz * CHUNK_SIZE;
    const geo = new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE, 8, 8);
    const posAttr = geo.attributes.position;

    // Determine dominant biome for chunk
    const biome = getBiome(ox + CHUNK_SIZE / 2, oz + CHUNK_SIZE / 2);
    const colors = BIOME_COLORS[biome];
    const color = colors[Math.floor(noise2D(cx, cz) * colors.length)];

    for (let i = 0; i < posAttr.count; i++) {
      const lx = posAttr.getX(i);
      const lz = posAttr.getY(i); // plane is XY before rotation
      const wx = ox + lx, wz = oz + lz;
      const h = terrainHeight(wx, wz);
      posAttr.setZ(i, h);
    }
    geo.computeVertexNormals();

    const mat = new THREE.MeshLambertMaterial({ color });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(ox, 0, oz);
    mesh.receiveShadow = true;
    scene.add(mesh);
    chunkMeshes[key] = mesh;

    // Decorations: trees, rocks
    const numDecos = Math.floor(noise2D(cx * 3 + 7, cz * 3 + 13) * 5);
    for (let d = 0; d < numDecos; d++) {
      const dx = ox + noise2D(cx + d * 7, cz + d * 13) * CHUNK_SIZE;
      const dz = oz + noise2D(cx + d * 11, cz + d * 17) * CHUNK_SIZE;
      const h = terrainHeight(dx, dz);

      if (biome === 'forest' || (biome === 'plains' && noise2D(dx, dz) > 0.5)) {
        // Tree: trunk + canopy
        const trunk = new THREE.Mesh(
          new THREE.BoxGeometry(0.3, 2, 0.3),
          new THREE.MeshLambertMaterial({ color: 0x664422 })
        );
        trunk.position.set(dx, h + 1, dz);
        trunk.castShadow = true;
        scene.add(trunk);
        const canopy = new THREE.Mesh(
          new THREE.BoxGeometry(1.8, 1.5, 1.8),
          new THREE.MeshLambertMaterial({ color: biome === 'forest' ? 0x226622 : 0x44aa33 })
        );
        canopy.position.set(dx, h + 2.5, dz);
        canopy.castShadow = true;
        scene.add(canopy);
        decorations.push({ meshes: [trunk, canopy], x: dx, z: dz });
      } else if (biome === 'desert') {
        // Rock
        const rock = new THREE.Mesh(
          new THREE.BoxGeometry(0.8 + noise2D(dx, dz) * 0.8, 0.5 + noise2D(dz, dx) * 0.6, 0.8 + noise2D(dx + 1, dz) * 0.8),
          new THREE.MeshLambertMaterial({ color: 0x998877 })
        );
        rock.position.set(dx, h + 0.3, dz);
        rock.castShadow = true;
        scene.add(rock);
        decorations.push({ meshes: [rock], x: dx, z: dz });
      }
    }
  }

  function unloadChunk(cx, cz) {
    const key = getChunkKey(cx, cz);
    if (!loadedChunks.has(key)) return;
    const mesh = chunkMeshes[key];
    if (mesh) {
      scene.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose();
      delete chunkMeshes[key];
    }
    // Remove decorations in this chunk
    const ox = cx * CHUNK_SIZE, oz = cz * CHUNK_SIZE;
    for (let i = decorations.length - 1; i >= 0; i--) {
      const d = decorations[i];
      if (d.x >= ox && d.x < ox + CHUNK_SIZE && d.z >= oz && d.z < oz + CHUNK_SIZE) {
        d.meshes.forEach(m => { scene.remove(m); m.geometry.dispose(); m.material.dispose(); });
        decorations.splice(i, 1);
      }
    }
    loadedChunks.delete(key);
  }

  function updateChunks(px, pz) {
    const pcx = Math.floor(px / CHUNK_SIZE);
    const pcz = Math.floor(pz / CHUNK_SIZE);
    const VIEW_DIST = 4;

    // Load nearby
    for (let dx = -VIEW_DIST; dx <= VIEW_DIST; dx++) {
      for (let dz = -VIEW_DIST; dz <= VIEW_DIST; dz++) {
        generateChunk(pcx + dx, pcz + dz);
      }
    }
    // Unload far
    const toRemove = [];
    for (const key of loadedChunks) {
      const [cx, cz] = key.split(',').map(Number);
      if (Math.abs(cx - pcx) > VIEW_DIST + 1 || Math.abs(cz - pcz) > VIEW_DIST + 1) {
        toRemove.push([cx, cz]);
      }
    }
    toRemove.forEach(([cx, cz]) => unloadChunk(cx, cz));
  }

  // === PLATFORMS ===
  const platforms = [];
  const platformsByChunk = {};

  function generatePlatforms(cx, cz) {
    const key = getChunkKey(cx, cz);
    if (platformsByChunk[key]) return;
    // Skip chunks outside map bounds
    const cpMinX = cx * CHUNK_SIZE, cpMaxX = cpMinX + CHUNK_SIZE;
    const cpMinZ = cz * CHUNK_SIZE, cpMaxZ = cpMinZ + CHUNK_SIZE;
    if (cpMaxX < -MAP_HALF || cpMinX > MAP_HALF || cpMaxZ < -MAP_HALF || cpMinZ > MAP_HALF) return;
    platformsByChunk[key] = [];

    const ox = cx * CHUNK_SIZE, oz = cz * CHUNK_SIZE;
    const numPlats = Math.floor(noise2D(cx * 5 + 31, cz * 5 + 37) * 3);
    for (let i = 0; i < numPlats; i++) {
      const px = ox + 2 + noise2D(cx + i * 19, cz + i * 23) * (CHUNK_SIZE - 4);
      const pz = oz + 2 + noise2D(cx + i * 29, cz + i * 31) * (CHUNK_SIZE - 4);
      const baseH = terrainHeight(px, pz);
      const ph = baseH + 2 + noise2D(px, pz) * 2; // 2-4 units above ground
      const pw = 2 + noise2D(px * 2, pz * 2) * 2; // 2-4 wide
      const pd = 2 + noise2D(px * 3, pz * 3) * 2;

      const biome = getBiome(px, pz);
      const platColor = biome === 'desert' ? 0xaa8855 : biome === 'forest' ? 0x556633 : 0x667744;

      const geo = new THREE.BoxGeometry(pw, 0.4, pd);
      const mat = new THREE.MeshLambertMaterial({ color: platColor });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(px, ph, pz);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);

      const plat = { mesh, x: px, y: ph, z: pz, w: pw, d: pd };
      platforms.push(plat);
      platformsByChunk[key].push(plat);
    }
  }

  function unloadPlatforms(cx, cz) {
    const key = getChunkKey(cx, cz);
    const plats = platformsByChunk[key];
    if (!plats) return;
    plats.forEach(p => {
      scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      p.mesh.material.dispose();
      const idx = platforms.indexOf(p);
      if (idx >= 0) platforms.splice(idx, 1);
    });
    delete platformsByChunk[key];
  }

  function updatePlatformChunks(px, pz) {
    const pcx = Math.floor(px / CHUNK_SIZE);
    const pcz = Math.floor(pz / CHUNK_SIZE);
    const VIEW_DIST = 4;
    for (let dx = -VIEW_DIST; dx <= VIEW_DIST; dx++) {
      for (let dz = -VIEW_DIST; dz <= VIEW_DIST; dz++) {
        generatePlatforms(pcx + dx, pcz + dz);
        generateShrines(pcx + dx, pcz + dz);
      }
    }
    // Unload far platforms + shrines
    for (const key in platformsByChunk) {
      const [cx, cz] = key.split(',').map(Number);
      if (Math.abs(cx - Math.floor(px / CHUNK_SIZE)) > VIEW_DIST + 1 ||
          Math.abs(cz - Math.floor(pz / CHUNK_SIZE)) > VIEW_DIST + 1) {
        unloadPlatforms(cx, cz);
        unloadShrines(cx, cz);
      }
    }
    // Also unload shrines in chunks not covered by platforms
    for (const key in st.shrinesByChunk) {
      const [cx, cz] = key.split(',').map(Number);
      if (Math.abs(cx - Math.floor(px / CHUNK_SIZE)) > VIEW_DIST + 1 ||
          Math.abs(cz - Math.floor(pz / CHUNK_SIZE)) > VIEW_DIST + 1) {
        unloadShrines(cx, cz);
      }
    }
  }

  // === SHRINES ===
  function createShrineMesh(x, z) {
    const group = new THREE.Group();
    const h = terrainHeight(x, z);
    // Stone pillar base
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.3, 0.8),
      new THREE.MeshLambertMaterial({ color: 0x888888 })
    );
    base.position.y = 0.15;
    base.castShadow = true;
    group.add(base);
    // Pillar
    const pillar = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 1.2, 0.4),
      new THREE.MeshLambertMaterial({ color: 0x999999 })
    );
    pillar.position.y = 0.9;
    pillar.castShadow = true;
    group.add(pillar);
    // Glowing orb on top
    const orb = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.3, 0.3),
      new THREE.MeshBasicMaterial({ color: 0x44ffaa, transparent: true, opacity: 0.8 })
    );
    orb.position.y = 1.7;
    group.add(orb);
    // Rune symbol (small rotating cube)
    const rune = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 0.15, 0.15),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 })
    );
    rune.position.y = 1.7;
    group.add(rune);

    group.position.set(x, h, z);
    scene.add(group);
    return { group, orb, rune, x, z, hp: 3, alive: true };
  }

  function generateShrines(cx, cz) {
    // Shrines are now finite and pre-placed at game start — skip chunk generation
    return;
  }

  function unloadShrines(cx, cz) {
    // Shrines are now finite and pre-placed — never unload them
    return;
  }

  // === DIFFICULTY TOTEMS ===
  function createTotemMesh(x, z) {
    const group = new THREE.Group();
    const gh = terrainHeight(x, z);
    // Dark stone base
    const baseMat = new THREE.MeshLambertMaterial({ color: 0x332222 });
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.4, 0.8), baseMat);
    base.position.y = 0.2;
    base.castShadow = true;
    group.add(base);
    // Skull pillar
    const pillarMat = new THREE.MeshLambertMaterial({ color: 0x442222 });
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.4, 0.5), pillarMat);
    pillar.position.y = 1.1;
    pillar.castShadow = true;
    group.add(pillar);
    // Red skull orb (glowing)
    const orbMat = new THREE.MeshBasicMaterial({ color: 0xff2222, transparent: true, opacity: 0.9 });
    const orb = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), orbMat);
    orb.position.y = 2.0;
    group.add(orb);
    group.position.set(x, gh, z);
    scene.add(group);
    return { group, x, z, y: gh, orb, hp: 5, alive: true };
  }

  // Initial terrain + platforms
  updateChunks(0, 0);
  updatePlatformChunks(0, 0);

  // Pre-generate finite shrines across the map
  for (let i = 0; i < SHRINE_COUNT; i++) {
    const sx = (Math.random() - 0.5) * (ARENA_SIZE * 2 - 20);
    const sz = (Math.random() - 0.5) * (ARENA_SIZE * 2 - 20);
    const shrine = createShrineMesh(sx, sz);
    st.shrines.push(shrine);
  }

  // Pre-generate difficulty totems
  const TOTEM_COUNT = 8;
  for (let ti = 0; ti < TOTEM_COUNT; ti++) {
    const tx = (Math.random() - 0.5) * (ARENA_SIZE * 2 - 30);
    const tz = (Math.random() - 0.5) * (ARENA_SIZE * 2 - 30);
    const totem = createTotemMesh(tx, tz);
    st.totems.push(totem);
  }

  // === PLAYER MODEL ===
  // Helper to add a box mesh to a group
  function box(group, w, h, d, color, x, y, z, shadow) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color }));
    m.position.set(x, y, z);
    if (shadow) m.castShadow = true;
    group.add(m);
    return m;
  }

  const playerGroup = new THREE.Group();
  const legs = []; // [leftLeg, rightLeg] (bipedal)
  const arms = []; // [leftArm, rightArm]
  let tail = null;
  const muscles = {}; // { chest, bicepL, bicepR, shoulderL, shoulderR, thighL, thighR }

  if (animalId === 'leopard') {
    // === BIPEDAL LEOPARD ===
    // Torso (vertical)
    muscles.chest = box(playerGroup, 0.7, 0.65, 0.45, 0xe8a828, 0, 0.85, 0, true);
    // Belly
    box(playerGroup, 0.55, 0.2, 0.35, 0xf0c858, 0, 0.65, 0.05);
    // Rosette spots on torso
    [[0.25, 1.0, 0.15], [-0.2, 0.95, -0.1], [0.15, 0.8, 0.18], [-0.25, 0.85, 0.1]].forEach(p => {
      box(playerGroup, 0.1, 0.08, 0.08, 0xc08018, p[0], p[1], p[2]);
    });
    // Shoulders
    muscles.shoulderL = box(playerGroup, 0.22, 0.2, 0.22, 0xe8a828, -0.42, 1.1, 0);
    muscles.shoulderR = box(playerGroup, 0.22, 0.2, 0.22, 0xe8a828, 0.42, 1.1, 0);
    // Neck
    box(playerGroup, 0.3, 0.25, 0.22, 0xe8a828, 0, 1.25, 0);
    // Head
    box(playerGroup, 0.5, 0.42, 0.45, 0xe8a828, 0, 1.55, 0, true);
    box(playerGroup, 0.4, 0.12, 0.1, 0xe8a828, 0, 1.75, 0);
    // Snout
    box(playerGroup, 0.22, 0.18, 0.22, 0xf0c050, 0, 1.42, 0.25);
    box(playerGroup, 0.1, 0.06, 0.05, 0xff6688, 0, 1.47, 0.36); // nose
    box(playerGroup, 0.12, 0.03, 0.05, 0xc08018, 0, 1.38, 0.33); // mouth
    // Eyes
    box(playerGroup, 0.1, 0.08, 0.06, 0x00dd00, -0.14, 1.58, 0.2);
    box(playerGroup, 0.1, 0.08, 0.06, 0x00dd00, 0.14, 1.58, 0.2);
    box(playerGroup, 0.04, 0.08, 0.03, 0x000000, -0.14, 1.58, 0.23);
    box(playerGroup, 0.04, 0.08, 0.03, 0x000000, 0.14, 1.58, 0.23);
    // Ears
    box(playerGroup, 0.1, 0.15, 0.07, 0xd09020, -0.16, 1.82, 0);
    box(playerGroup, 0.1, 0.15, 0.07, 0xd09020, 0.16, 1.82, 0);
    box(playerGroup, 0.06, 0.1, 0.04, 0xe8a0a0, -0.16, 1.82, 0.02);
    box(playerGroup, 0.06, 0.1, 0.04, 0xe8a0a0, 0.16, 1.82, 0.02);
    // Arms (at sides)
    muscles.bicepL = box(playerGroup, 0.16, 0.35, 0.16, 0xe8a828, -0.48, 0.85, 0, true);
    muscles.bicepR = box(playerGroup, 0.16, 0.35, 0.16, 0xe8a828, 0.48, 0.85, 0, true);
    arms.push(muscles.bicepL, muscles.bicepR);
    // Hands/paws
    box(playerGroup, 0.13, 0.1, 0.13, 0xd09020, -0.48, 0.62, 0.05);
    box(playerGroup, 0.13, 0.1, 0.13, 0xd09020, 0.48, 0.62, 0.05);
    // Legs (standing)
    muscles.thighL = box(playerGroup, 0.2, 0.45, 0.2, 0xc89020, -0.18, 0.25, 0, true);
    muscles.thighR = box(playerGroup, 0.2, 0.45, 0.2, 0xc89020, 0.18, 0.25, 0, true);
    legs.push(muscles.thighL, muscles.thighR);
    // Feet
    box(playerGroup, 0.22, 0.08, 0.25, 0xd09020, -0.18, 0.02, 0.03);
    box(playerGroup, 0.22, 0.08, 0.25, 0xd09020, 0.18, 0.02, 0.03);
    // Tail (from lower back)
    tail = box(playerGroup, 0.08, 0.08, 0.25, 0xe8a828, 0, 0.6, -0.3);
    box(playerGroup, 0.08, 0.08, 0.2, 0xd09020, 0, 0.55, -0.5);
    box(playerGroup, 0.06, 0.06, 0.15, 0x1a1a1a, 0, 0.52, -0.68);

  } else if (animalId === 'redPanda') {
    // === BIPEDAL RED PANDA ===
    // Torso (vertical, reddish-brown)
    muscles.chest = box(playerGroup, 0.65, 0.6, 0.4, 0xcc4422, 0, 0.85, 0, true);
    // Black underbelly
    box(playerGroup, 0.5, 0.2, 0.32, 0x111111, 0, 0.65, 0.05);
    box(playerGroup, 0.66, 0.1, 0.3, 0x1a1a1a, 0, 0.7, 0);
    // Shoulders
    muscles.shoulderL = box(playerGroup, 0.2, 0.18, 0.2, 0xcc4422, -0.38, 1.1, 0);
    muscles.shoulderR = box(playerGroup, 0.2, 0.18, 0.2, 0xcc4422, 0.38, 1.1, 0);
    // Neck
    box(playerGroup, 0.28, 0.22, 0.2, 0xcc4422, 0, 1.22, 0);
    // Head (large, round)
    box(playerGroup, 0.58, 0.5, 0.5, 0xcc4422, 0, 1.55, 0, true);
    box(playerGroup, 0.48, 0.12, 0.1, 0xcc4422, 0, 1.78, 0);
    // White face mask
    box(playerGroup, 0.44, 0.26, 0.12, 0xffffff, 0, 1.48, 0.22);
    // White cheek patches
    box(playerGroup, 0.16, 0.15, 0.1, 0xffffff, -0.28, 1.45, 0.2);
    box(playerGroup, 0.16, 0.15, 0.1, 0xffffff, 0.28, 1.45, 0.2);
    // Dark eye patches (tear marks)
    box(playerGroup, 0.14, 0.14, 0.06, 0x441100, -0.14, 1.55, 0.22);
    box(playerGroup, 0.14, 0.14, 0.06, 0x441100, 0.14, 1.55, 0.22);
    // Dark beady eyes
    box(playerGroup, 0.07, 0.07, 0.05, 0x111111, -0.14, 1.55, 0.26);
    box(playerGroup, 0.07, 0.07, 0.05, 0x111111, 0.14, 1.55, 0.26);
    // White snout
    box(playerGroup, 0.2, 0.14, 0.18, 0xffffff, 0, 1.4, 0.25);
    // Black nose
    box(playerGroup, 0.08, 0.06, 0.05, 0x111111, 0, 1.44, 0.35);
    // Ears (large pointed, with white rims)
    box(playerGroup, 0.12, 0.25, 0.08, 0x882211, -0.2, 1.88, 0);
    box(playerGroup, 0.12, 0.25, 0.08, 0x882211, 0.2, 1.88, 0);
    box(playerGroup, 0.03, 0.23, 0.08, 0xffffff, -0.28, 1.88, 0);
    box(playerGroup, 0.03, 0.23, 0.08, 0xffffff, 0.28, 1.88, 0);
    box(playerGroup, 0.06, 0.16, 0.05, 0xffffff, -0.2, 1.88, 0.02);
    box(playerGroup, 0.06, 0.16, 0.05, 0xffffff, 0.2, 1.88, 0.02);
    // Arms (BLACK - characteristic)
    muscles.bicepL = box(playerGroup, 0.15, 0.35, 0.15, 0x111111, -0.44, 0.85, 0, true);
    muscles.bicepR = box(playerGroup, 0.15, 0.35, 0.15, 0x111111, 0.44, 0.85, 0, true);
    arms.push(muscles.bicepL, muscles.bicepR);
    // Paws
    box(playerGroup, 0.12, 0.1, 0.12, 0x0a0a0a, -0.44, 0.62, 0.05);
    box(playerGroup, 0.12, 0.1, 0.12, 0x0a0a0a, 0.44, 0.62, 0.05);
    // Legs (BLACK)
    muscles.thighL = box(playerGroup, 0.18, 0.45, 0.18, 0x111111, -0.16, 0.25, 0, true);
    muscles.thighR = box(playerGroup, 0.18, 0.45, 0.18, 0x111111, 0.16, 0.25, 0, true);
    legs.push(muscles.thighL, muscles.thighR);
    // Feet
    box(playerGroup, 0.2, 0.08, 0.22, 0x0a0a0a, -0.16, 0.02, 0.03);
    box(playerGroup, 0.2, 0.08, 0.22, 0x0a0a0a, 0.16, 0.02, 0.03);
    // Bushy striped tail
    tail = box(playerGroup, 0.22, 0.22, 0.3, 0xcc4422, 0, 0.6, -0.3);
    box(playerGroup, 0.23, 0.12, 0.06, 0xffccaa, 0, 0.6, -0.2);
    box(playerGroup, 0.22, 0.22, 0.3, 0xcc4422, 0, 0.55, -0.55);
    box(playerGroup, 0.23, 0.12, 0.06, 0xffccaa, 0, 0.55, -0.45);
    box(playerGroup, 0.2, 0.2, 0.12, 0x882211, 0, 0.52, -0.72);

  } else if (animalId === 'lion') {
    // === BIPEDAL LION ===
    // Torso (wider, muscular)
    muscles.chest = box(playerGroup, 0.8, 0.7, 0.5, 0xdda030, 0, 0.85, 0, true);
    // Belly
    box(playerGroup, 0.6, 0.2, 0.38, 0xeec060, 0, 0.62, 0.05);
    // Shoulders (big)
    muscles.shoulderL = box(playerGroup, 0.25, 0.22, 0.25, 0xdda030, -0.48, 1.12, 0);
    muscles.shoulderR = box(playerGroup, 0.25, 0.22, 0.25, 0xdda030, 0.48, 1.12, 0);
    // Neck
    box(playerGroup, 0.35, 0.3, 0.28, 0xdda030, 0, 1.28, 0);
    // Mane (around head, layered)
    box(playerGroup, 0.95, 0.75, 0.8, 0xaa6610, 0, 1.6, -0.02);
    box(playerGroup, 0.8, 0.65, 0.7, 0xbb7720, 0, 1.6, -0.02);
    box(playerGroup, 0.12, 0.45, 0.55, 0x996610, -0.45, 1.6, 0);
    box(playerGroup, 0.12, 0.45, 0.55, 0x996610, 0.45, 1.6, 0);
    box(playerGroup, 0.65, 0.12, 0.1, 0x996610, 0, 2.0, 0);
    // Head
    box(playerGroup, 0.5, 0.44, 0.48, 0xdda030, 0, 1.62, 0.05, true);
    // Snout
    box(playerGroup, 0.26, 0.2, 0.22, 0xeec060, 0, 1.48, 0.28);
    box(playerGroup, 0.12, 0.08, 0.06, 0x996620, 0, 1.53, 0.4); // nose
    box(playerGroup, 0.12, 0.03, 0.05, 0x885510, 0, 1.44, 0.38); // mouth
    // Eyes (amber)
    box(playerGroup, 0.12, 0.08, 0.06, 0xffaa00, -0.13, 1.66, 0.24);
    box(playerGroup, 0.12, 0.08, 0.06, 0xffaa00, 0.13, 1.66, 0.24);
    box(playerGroup, 0.05, 0.08, 0.03, 0x000000, -0.13, 1.66, 0.27);
    box(playerGroup, 0.05, 0.08, 0.03, 0x000000, 0.13, 1.66, 0.27);
    // Ears
    box(playerGroup, 0.1, 0.12, 0.07, 0xc89020, -0.18, 1.9, 0);
    box(playerGroup, 0.1, 0.12, 0.07, 0xc89020, 0.18, 1.9, 0);
    // Arms
    muscles.bicepL = box(playerGroup, 0.18, 0.4, 0.18, 0xdda030, -0.52, 0.85, 0, true);
    muscles.bicepR = box(playerGroup, 0.18, 0.4, 0.18, 0xdda030, 0.52, 0.85, 0, true);
    arms.push(muscles.bicepL, muscles.bicepR);
    // Hands
    box(playerGroup, 0.15, 0.12, 0.15, 0xc89020, -0.52, 0.6, 0.05);
    box(playerGroup, 0.15, 0.12, 0.15, 0xc89020, 0.52, 0.6, 0.05);
    // Legs
    muscles.thighL = box(playerGroup, 0.22, 0.48, 0.22, 0xc89020, -0.2, 0.25, 0, true);
    muscles.thighR = box(playerGroup, 0.22, 0.48, 0.22, 0xc89020, 0.2, 0.25, 0, true);
    legs.push(muscles.thighL, muscles.thighR);
    // Feet
    box(playerGroup, 0.24, 0.08, 0.27, 0xc89020, -0.2, 0.02, 0.03);
    box(playerGroup, 0.24, 0.08, 0.27, 0xc89020, 0.2, 0.02, 0.03);
    // Tail with tuft
    tail = box(playerGroup, 0.08, 0.08, 0.25, 0xdda030, 0, 0.6, -0.32);
    box(playerGroup, 0.06, 0.06, 0.2, 0xdda030, 0, 0.55, -0.52);
    box(playerGroup, 0.18, 0.18, 0.15, 0xaa6610, 0, 0.52, -0.68);

  } else if (animalId === 'gator') {
    // === BIPEDAL GATOR ===
    // Torso (armored, wider)
    muscles.chest = box(playerGroup, 0.75, 0.65, 0.5, 0x44aa44, 0, 0.82, 0, true);
    // Belly
    box(playerGroup, 0.55, 0.2, 0.38, 0x88cc88, 0, 0.6, 0.05);
    // Back ridges along spine
    for (let i = 0; i < 5; i++) {
      box(playerGroup, 0.12, 0.1, 0.12, 0x338833, 0, 1.18 - i * 0.12, -0.22);
    }
    // Scale texture on sides
    [[-0.3, 0.9, 0.12], [0.3, 0.88, -0.08], [-0.28, 0.78, 0.1]].forEach(p => {
      box(playerGroup, 0.1, 0.08, 0.1, 0x3a9a3a, p[0], p[1], p[2]);
    });
    // Shoulders
    muscles.shoulderL = box(playerGroup, 0.22, 0.2, 0.22, 0x44aa44, -0.44, 1.08, 0);
    muscles.shoulderR = box(playerGroup, 0.22, 0.2, 0.22, 0x44aa44, 0.44, 1.08, 0);
    // Neck
    box(playerGroup, 0.32, 0.22, 0.25, 0x44aa44, 0, 1.2, 0);
    // Head (with snout extending forward)
    box(playerGroup, 0.4, 0.3, 0.35, 0x44aa44, 0, 1.42, 0.05, true);
    // Upper jaw (long snout)
    box(playerGroup, 0.3, 0.15, 0.45, 0x3a9a3a, 0, 1.38, 0.35);
    box(playerGroup, 0.25, 0.1, 0.4, 0x44aa44, 0, 1.42, 0.35);
    // Lower jaw
    box(playerGroup, 0.25, 0.08, 0.4, 0x2d882d, 0, 1.28, 0.35);
    // Nostrils
    box(playerGroup, 0.12, 0.08, 0.06, 0x338833, 0, 1.46, 0.58);
    // Teeth
    for (let t = 0; t < 3; t++) {
      box(playerGroup, 0.04, 0.05, 0.03, 0xffffff, -0.06 + t * 0.06, 1.32, 0.35 + t * 0.1);
      box(playerGroup, 0.04, 0.05, 0.03, 0xffffff, -0.04 + t * 0.06, 1.26, 0.38 + t * 0.1);
    }
    // Eyes (protruding on top)
    box(playerGroup, 0.15, 0.15, 0.15, 0x44aa44, -0.1, 1.58, 0.1);
    box(playerGroup, 0.15, 0.15, 0.15, 0x44aa44, 0.1, 1.58, 0.1);
    box(playerGroup, 0.1, 0.1, 0.1, 0xccff44, -0.1, 1.6, 0.14);
    box(playerGroup, 0.1, 0.1, 0.1, 0xccff44, 0.1, 1.6, 0.14);
    box(playerGroup, 0.03, 0.1, 0.04, 0x000000, -0.1, 1.6, 0.18);
    box(playerGroup, 0.03, 0.1, 0.04, 0x000000, 0.1, 1.6, 0.18);
    // Arms
    muscles.bicepL = box(playerGroup, 0.17, 0.35, 0.17, 0x338833, -0.48, 0.82, 0, true);
    muscles.bicepR = box(playerGroup, 0.17, 0.35, 0.17, 0x338833, 0.48, 0.82, 0, true);
    arms.push(muscles.bicepL, muscles.bicepR);
    // Clawed hands
    box(playerGroup, 0.14, 0.1, 0.14, 0x2d772d, -0.48, 0.6, 0.05);
    box(playerGroup, 0.14, 0.1, 0.14, 0x2d772d, 0.48, 0.6, 0.05);
    // Claws on hands
    for (const sx of [-0.48, 0.48]) {
      for (let c = -1; c <= 1; c++) {
        box(playerGroup, 0.02, 0.06, 0.02, 0xcccc88, sx + c * 0.04, 0.56, 0.12);
      }
    }
    // Legs
    muscles.thighL = box(playerGroup, 0.2, 0.42, 0.22, 0x338833, -0.18, 0.22, 0, true);
    muscles.thighR = box(playerGroup, 0.2, 0.42, 0.22, 0x338833, 0.18, 0.22, 0, true);
    legs.push(muscles.thighL, muscles.thighR);
    // Feet
    box(playerGroup, 0.24, 0.06, 0.28, 0x2d772d, -0.18, 0.02, 0.03);
    box(playerGroup, 0.24, 0.06, 0.28, 0x2d772d, 0.18, 0.02, 0.03);
    // Foot claws
    for (const fx of [-0.18, 0.18]) {
      for (let c = -1; c <= 1; c++) {
        box(playerGroup, 0.04, 0.03, 0.05, 0xcccc88, fx + c * 0.06, 0.04, 0.16);
      }
    }
    // Thick tail from lower back
    tail = box(playerGroup, 0.25, 0.18, 0.35, 0x44aa44, 0, 0.55, -0.35);
    box(playerGroup, 0.2, 0.15, 0.3, 0x3a9a3a, 0, 0.5, -0.6);
    box(playerGroup, 0.15, 0.12, 0.22, 0x338833, 0, 0.48, -0.8);
    // Tail ridges
    box(playerGroup, 0.08, 0.06, 0.08, 0x338833, 0, 0.62, -0.4);
    box(playerGroup, 0.06, 0.05, 0.06, 0x338833, 0, 0.58, -0.6);
  }

  scene.add(playerGroup);

  // === ANGEL WINGS VISUAL ===
  const wingGroup = new THREE.Group();
  // Left wing
  const wingMatL = new THREE.MeshLambertMaterial({ color: 0xaaddff, transparent: true, opacity: 0.85 });
  const wingL1 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.08), wingMatL);
  wingL1.position.set(-0.6, 1.0, -0.15);
  wingL1.rotation.z = 0.3;
  wingGroup.add(wingL1);
  const wingL2 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.35, 0.06), wingMatL);
  wingL2.position.set(-0.9, 1.15, -0.15);
  wingL2.rotation.z = 0.5;
  wingGroup.add(wingL2);
  // Wing feather tips
  const wingL3 = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.2, 0.04), new THREE.MeshLambertMaterial({ color: 0xcceeff, transparent: true, opacity: 0.7 }));
  wingL3.position.set(-1.1, 1.25, -0.15);
  wingL3.rotation.z = 0.6;
  wingGroup.add(wingL3);
  // Right wing (mirror)
  const wingMatR = new THREE.MeshLambertMaterial({ color: 0xaaddff, transparent: true, opacity: 0.85 });
  const wingR1 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.08), wingMatR);
  wingR1.position.set(0.6, 1.0, -0.15);
  wingR1.rotation.z = -0.3;
  wingGroup.add(wingR1);
  const wingR2 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.35, 0.06), wingMatR);
  wingR2.position.set(0.9, 1.15, -0.15);
  wingR2.rotation.z = -0.5;
  wingGroup.add(wingR2);
  const wingR3 = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.2, 0.04), new THREE.MeshLambertMaterial({ color: 0xcceeff, transparent: true, opacity: 0.7 }));
  wingR3.position.set(1.1, 1.25, -0.15);
  wingR3.rotation.z = -0.6;
  wingGroup.add(wingR3);
  wingGroup.visible = false;
  playerGroup.add(wingGroup);

  // === FIRE AURA (for race car powerup) ===
  const fireParticles = [];
  const fireGeo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
  const fireMat = new THREE.MeshBasicMaterial({ color: 0xff6600 });

  // === ZOMBIE TIER SYSTEM ===
  // Tiers 1-10: zombies merge on collision to form stronger ones
  const ZOMBIE_TIERS = [
    { scale: 1.0,  hpMult: 1,   dmgMult: 1,   speed: 1.8,  body: 0x4a6a4a, head: 0x5a7a5a, eye: 0xff0000, name: 'Shambler' },
    { scale: 1.15, hpMult: 2.2, dmgMult: 1.5, speed: 1.7, body: 0x3a6a3a, head: 0x4a8a4a, eye: 0xff2200, name: 'Lurcher' },
    { scale: 1.3,  hpMult: 3.5, dmgMult: 2,   speed: 1.6, body: 0x3a5a2a, head: 0x4a6a3a, eye: 0xff4400, name: 'Bruiser' },
    { scale: 1.5,  hpMult: 5,   dmgMult: 2.8, speed: 1.5, body: 0x4a4a2a, head: 0x5a5a3a, eye: 0xff6600, name: 'Brute' },
    { scale: 1.7,  hpMult: 7,   dmgMult: 3.5, speed: 1.4, body: 0x5a3a2a, head: 0x6a4a3a, eye: 0xff8800, name: 'Ravager' },
    { scale: 1.9,  hpMult: 10,  dmgMult: 4.5, speed: 1.35, body: 0x6a2a1a, head: 0x7a3a2a, eye: 0xffaa00, name: 'Horror' },
    { scale: 2.15, hpMult: 14,  dmgMult: 5.5, speed: 1.3, body: 0x7a1a1a, head: 0x8a2a2a, eye: 0xffcc00, name: 'Abomination' },
    { scale: 2.4,  hpMult: 19,  dmgMult: 7,   speed: 1.25, body: 0x8a1010, head: 0x9a2020, eye: 0xffdd00, name: 'Nightmare' },
    { scale: 2.7,  hpMult: 25,  dmgMult: 9,   speed: 1.2, body: 0x990808, head: 0xaa1818, eye: 0xffee44, name: 'Titan' },
    { scale: 3.0,  hpMult: 35,  dmgMult: 12,  speed: 1.15, body: 0xaa0000, head: 0xbb1111, eye: 0xffff66, name: 'Overlord' },
  ];

  // === ENEMY CREATION (tier-based zombie) ===
  function createEnemy(x, z, baseHp, tier) {
    tier = Math.max(1, Math.min(10, tier || 1));
    const td = ZOMBIE_TIERS[tier - 1];
    const s = td.scale;
    const group = new THREE.Group();

    // Body
    const eBody = box(group, 0.55 * s, 0.7 * s, 0.35 * s, td.body, 0, 0.75 * s, 0, true);
    // Torn shirt
    box(group, 0.56 * s, 0.15 * s, 0.36 * s, td.body - 0x101010, 0, 0.95 * s, 0);
    box(group, 0.4 * s, 0.08 * s, 0.36 * s, td.body - 0x111111, 0, 0.55 * s, 0);

    // Head
    const eHead = box(group, 0.42 * s, 0.42 * s, 0.38 * s, td.head, 0, 1.25 * s, 0, true);
    box(group, 0.38 * s, 0.1 * s, 0.35 * s, td.head + 0x101010, 0, 1.45 * s, 0);

    // Eyes (glow brighter at higher tiers)
    const eyeGlowMat = new THREE.MeshBasicMaterial({ color: td.eye });
    box(group, 0.1 * s, 0.08 * s, 0.06 * s, td.eye, -0.1 * s, 1.3 * s, 0.18 * s);
    box(group, 0.1 * s, 0.08 * s, 0.06 * s, td.eye, 0.1 * s, 1.3 * s, 0.18 * s);
    const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.06 * s, 0.05 * s, 0.03 * s), eyeGlowMat);
    eyeL.position.set(-0.1 * s, 1.3 * s, 0.2 * s); group.add(eyeL);
    const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.06 * s, 0.05 * s, 0.03 * s), eyeGlowMat);
    eyeR.position.set(0.1 * s, 1.3 * s, 0.2 * s); group.add(eyeR);

    // Tier 3+: third eye on forehead
    if (tier >= 3) {
      box(group, 0.08 * s, 0.08 * s, 0.06 * s, td.eye, 0, 1.42 * s, 0.18 * s);
      const eyeM = new THREE.Mesh(new THREE.BoxGeometry(0.05 * s, 0.05 * s, 0.03 * s), eyeGlowMat);
      eyeM.position.set(0, 1.42 * s, 0.2 * s); group.add(eyeM);
    }

    // Tier 6+: extra side eyes
    if (tier >= 6) {
      const sideEyeMat = new THREE.MeshBasicMaterial({ color: td.eye });
      for (const sx of [-0.2, 0.2]) {
        box(group, 0.06 * s, 0.06 * s, 0.06 * s, td.eye, sx * s, 1.35 * s, 0.16 * s);
        const se = new THREE.Mesh(new THREE.BoxGeometry(0.04 * s, 0.04 * s, 0.03 * s), sideEyeMat);
        se.position.set(sx * s, 1.35 * s, 0.19 * s); group.add(se);
      }
    }

    // Mouth (wider/scarier at higher tiers)
    const mouthW = (0.25 + tier * 0.015) * s;
    box(group, mouthW, 0.08 * s, 0.06 * s, 0x2a1a1a, 0, 1.12 * s, 0.18 * s);
    box(group, mouthW * 0.7, 0.05 * s, 0.04 * s, 0x1a0a0a, 0, 1.1 * s, 0.19 * s);

    // Tier 4+: teeth
    if (tier >= 4) {
      const teethColor = 0xddddaa;
      for (let t = -2; t <= 2; t++) {
        box(group, 0.03 * s, 0.05 * s, 0.03 * s, teethColor, t * 0.04 * s, 1.07 * s, 0.19 * s);
      }
    }

    // Arms
    const armL = box(group, 0.16 * s, 0.55 * s, 0.16 * s, td.head, -0.38 * s, 0.75 * s, 0.15 * s, true);
    const armR = box(group, 0.16 * s, 0.55 * s, 0.16 * s, td.head, 0.38 * s, 0.75 * s, 0.15 * s, true);
    // Hands
    box(group, 0.12 * s, 0.12 * s, 0.12 * s, td.body, -0.38 * s, 0.5 * s, 0.2 * s);
    box(group, 0.12 * s, 0.12 * s, 0.12 * s, td.body, 0.38 * s, 0.5 * s, 0.2 * s);

    // Tier 5+: claws on hands
    if (tier >= 5) {
      const clawColor = 0xccccaa;
      for (const side of [-1, 1]) {
        for (let c = -1; c <= 1; c++) {
          box(group, 0.02 * s, 0.08 * s, 0.02 * s, clawColor, (side * 0.38 + c * 0.03) * s, 0.42 * s, 0.24 * s);
        }
      }
    }

    // Legs
    const legL = box(group, 0.18 * s, 0.45 * s, 0.18 * s, td.body - 0x101010, -0.12 * s, 0.22 * s, 0, true);
    const legR = box(group, 0.18 * s, 0.45 * s, 0.18 * s, td.body - 0x101010, 0.12 * s, 0.22 * s, 0, true);
    // Feet
    box(group, 0.2 * s, 0.06 * s, 0.22 * s, td.body - 0x1a1a1a, -0.12 * s, 0.02, 0.02 * s);
    box(group, 0.2 * s, 0.06 * s, 0.22 * s, td.body - 0x1a1a1a, 0.12 * s, 0.02, 0.02 * s);

    // Tier 2+: shoulder pads (getting bigger with tier)
    if (tier >= 2) {
      const padS = 0.08 + tier * 0.02;
      box(group, padS * s, padS * 0.6 * s, padS * s, td.body + 0x111111, -0.38 * s, 1.05 * s, 0);
      box(group, padS * s, padS * 0.6 * s, padS * s, td.body + 0x111111, 0.38 * s, 1.05 * s, 0);
    }

    // Tier 7+: horns
    if (tier >= 7) {
      const hornColor = 0x665544;
      const hornH = 0.15 + (tier - 7) * 0.08;
      box(group, 0.06 * s, hornH * s, 0.06 * s, hornColor, -0.15 * s, (1.48 + hornH / 2) * s, 0);
      box(group, 0.06 * s, hornH * s, 0.06 * s, hornColor, 0.15 * s, (1.48 + hornH / 2) * s, 0);
      // Horn tips
      box(group, 0.04 * s, 0.04 * s, 0.04 * s, 0xaa8866, -0.15 * s, (1.48 + hornH) * s, 0);
      box(group, 0.04 * s, 0.04 * s, 0.04 * s, 0xaa8866, 0.15 * s, (1.48 + hornH) * s, 0);
    }

    // Tier 8+: spine ridges down the back
    if (tier >= 8) {
      const ridgeColor = td.body + 0x222222;
      for (let r = 0; r < 4; r++) {
        const ry = (0.6 + r * 0.2) * s;
        const rSize = (0.06 + (tier - 8) * 0.02) * s;
        box(group, rSize, rSize * 1.5, rSize, ridgeColor, 0, ry, -0.2 * s);
      }
    }

    // Tier 9+: glowing aura particles (emissive cubes around body)
    if (tier >= 9) {
      const auraMat = new THREE.MeshBasicMaterial({ color: td.eye, transparent: true, opacity: 0.4 });
      for (let a = 0; a < 6; a++) {
        const ag = new THREE.Mesh(new THREE.BoxGeometry(0.12 * s, 0.12 * s, 0.12 * s), auraMat);
        const angle = (a / 6) * Math.PI * 2;
        ag.position.set(Math.cos(angle) * 0.5 * s, (0.5 + Math.random() * 0.8) * s, Math.sin(angle) * 0.5 * s);
        group.add(ag);
      }
    }

    // Tier 10: crown of fire (emissive blocks on head)
    if (tier >= 10) {
      const crownMat = new THREE.MeshBasicMaterial({ color: 0xff4400 });
      for (let c = 0; c < 8; c++) {
        const ca = (c / 8) * Math.PI * 2;
        const cm = new THREE.Mesh(new THREE.BoxGeometry(0.05 * s, 0.12 * s, 0.05 * s), crownMat);
        cm.position.set(Math.cos(ca) * 0.18 * s, 1.52 * s, Math.sin(ca) * 0.18 * s);
        group.add(cm);
      }
    }

    const totalHp = baseHp * td.hpMult;
    const th = terrainHeight(x, z);
    group.position.set(x, th + 0.35 * s, z);
    scene.add(group);
    return {
      group, body: eBody, head: eHead, armL, armR, legL, legR,
      hp: totalHp,
      maxHp: totalHp,
      speed: td.speed + Math.random() * 0.3,
      hurtTimer: 0,
      alive: true,
      tier,
      bodyColor: td.body,
      headColor: td.head,
      walkPhase: Math.random() * Math.PI * 2,
    };
  }

  function disposeEnemy(e) {
    e.alive = false;
    scene.remove(e.group);
    e.group.traverse(c => { if (c.geometry) c.geometry.dispose(); if (c.material) c.material.dispose(); });
  }

  // === XP GEM ===
  const gemGeo = new THREE.BoxGeometry(0.25, 0.25, 0.25);
  const gemMat = new THREE.MeshLambertMaterial({ color: 0x44ff44, emissive: 0x22aa22 });
  function createXpGem(x, z) {
    const mesh = new THREE.Mesh(gemGeo, gemMat);
    const h = terrainHeight(x, z);
    mesh.position.set(x, h + 0.5, z);
    scene.add(mesh);
    return { mesh, bobPhase: Math.random() * Math.PI * 2 };
  }

  // Find a nearby platform to place items on
  function findNearbyPlatform(x, z, maxDist) {
    let best = null, bestD = maxDist * maxDist;
    for (const p of platforms) {
      const dx = p.x - x, dz = p.z - z;
      const d2 = dx * dx + dz * dz;
      if (d2 < bestD) { bestD = d2; best = p; }
    }
    return best;
  }

  // === POWERUP CRATE ===
  function createPowerupCrate(x, z) {
    const ptype = POWERUPS_3D[Math.floor(Math.random() * POWERUPS_3D.length)];
    // Place on nearest platform if one exists nearby
    const plat = findNearbyPlatform(x, z, 20);
    const px = plat ? plat.x : x;
    const pz = plat ? plat.z : z;
    const h = plat ? plat.y + 0.2 : terrainHeight(px, pz);
    const group = new THREE.Group();
    // Wooden crate
    const crateGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    const crateMat = new THREE.MeshLambertMaterial({ color: 0x886633 });
    const crate = new THREE.Mesh(crateGeo, crateMat);
    crate.position.y = 0.4;
    crate.castShadow = true;
    group.add(crate);
    // Colored top indicator
    const topGeo = new THREE.BoxGeometry(0.5, 0.1, 0.5);
    const topMat = new THREE.MeshLambertMaterial({ color: ptype.colorHex, emissive: ptype.colorHex, emissiveIntensity: 0.3 });
    const top = new THREE.Mesh(topGeo, topMat);
    top.position.y = 0.85;
    group.add(top);

    group.position.set(px, h, pz);
    scene.add(group);
    return { group, ptype, x: px, z: pz, hp: 3, alive: true, showLabel: false };
  }

  // === ITEM PICKUP ===
  function createItemPickup(x, z) {
    // Pick a random item that player doesn't already have (or higher tier)
    const available = ITEMS_3D.filter(it => {
      if (it.slot === 'armor') {
        if (st.items.armor === 'chainmail') return false;
        if (st.items.armor === 'leather' && it.tier <= 1) return false;
        return true;
      }
      if (it.slot === 'glasses') return !st.items.glasses;
      if (it.slot === 'boots') return st.items.boots !== it.id;
      // Boolean-slot items: ring, charm, vest, pendant, bracelet, gloves
      if (st.items[it.slot] !== undefined && typeof st.items[it.slot] === 'boolean') return !st.items[it.slot];
      return true;
    });
    if (available.length === 0) return null;

    const itype = available[Math.floor(Math.random() * available.length)];
    // Place on nearest platform if one exists nearby
    const plat = findNearbyPlatform(x, z, 20);
    const px = plat ? plat.x : x;
    const pz = plat ? plat.z : z;
    const h = plat ? plat.y + 0.2 : terrainHeight(px, pz);
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.4, 0.4),
      new THREE.MeshLambertMaterial({ color: itype.colorHex, emissive: itype.colorHex, emissiveIntensity: 0.4 })
    );
    mesh.position.set(px, h + 0.8, pz);
    scene.add(mesh);
    return { mesh, itype, x: px, z: pz, bobPhase: Math.random() * Math.PI * 2, alive: true };
  }

  // === ATTACK LINE ===
  const attackLineMat = new THREE.LineBasicMaterial({ color: 0xffff44 });
  function createAttackLine(fx, fy, fz, tx, ty, tz) {
    const pts = [new THREE.Vector3(fx, fy, fz), new THREE.Vector3(tx, ty, tz)];
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const line = new THREE.Line(geo, attackLineMat);
    scene.add(line);
    return { line, life: 6 };
  }

  // === PROJECTILE (banana cannon) ===
  function createProjectile(x, y, z, vx, vz) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.15, 0.15),
      new THREE.MeshLambertMaterial({ color: 0xffdd00 })
    );
    mesh.position.set(x, y, z);
    scene.add(mesh);
    return { mesh, vx, vz, life: 120, hitEnemies: new Set() };
  }

  // === PLAYER DAMAGE MULTIPLIER (level scaling) ===
  function getPlayerDmgMult() {
    return (1 + (st.level - 1) * 0.12) * st.dmgBoost * st.augmentDmgMult;
  }

  // === AMBIENT SPAWNING (constant trickle) ===
  function spawnAmbient() {
    const elapsedMin = st.gameTime / 60;
    const count = Math.min(4, 1 + Math.floor(elapsedMin / 3));
    const baseHp = 8 + Math.floor(elapsedMin * 2.5);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 25 + Math.random() * 10;
      const sx = Math.max(-MAP_HALF + 2, Math.min(MAP_HALF - 2, st.playerX + Math.cos(angle) * dist));
      const sz = Math.max(-MAP_HALF + 2, Math.min(MAP_HALF - 2, st.playerZ + Math.sin(angle) * dist));
      st.enemies.push(createEnemy(sx, sz, baseHp, 1));
    }
  }

  // === WAVE EVENT SPAWNING (every 4 minutes, big burst) ===
  function spawnWaveEvent() {
    const elapsedMin = st.gameTime / 60;
    const baseHp = 8 + Math.floor(elapsedMin * 2.5);
    const waveHp = Math.floor(baseHp * (1 + st.wave * 0.15));
    const count = 12 + st.wave * 6;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
      const dist = 20 + Math.random() * 15;
      const sx = Math.max(-MAP_HALF + 2, Math.min(MAP_HALF - 2, st.playerX + Math.cos(angle) * dist));
      const sz = Math.max(-MAP_HALF + 2, Math.min(MAP_HALF - 2, st.playerZ + Math.sin(angle) * dist));
      const tier = Math.random() < 0.1 * st.wave ? Math.min(st.wave, 3) : 1;
      st.enemies.push(createEnemy(sx, sz, waveHp, tier));
    }
    st.wave++;

    // Spawn crate with wave
    const crateAngle = Math.random() * Math.PI * 2;
    const cx = Math.max(-MAP_HALF + 2, Math.min(MAP_HALF - 2, st.playerX + Math.cos(crateAngle) * 15));
    const cz = Math.max(-MAP_HALF + 2, Math.min(MAP_HALF - 2, st.playerZ + Math.sin(crateAngle) * 15));
    st.powerupCrates.push(createPowerupCrate(cx, cz));

    // Spawn item every 2 waves
    if (st.wave % 2 === 0) {
      const ix = Math.max(-MAP_HALF + 2, Math.min(MAP_HALF - 2, st.playerX + Math.cos(Math.random() * Math.PI * 2) * 12));
      const iz = Math.max(-MAP_HALF + 2, Math.min(MAP_HALF - 2, st.playerZ + Math.sin(Math.random() * Math.PI * 2) * 12));
      const pickup = createItemPickup(ix, iz);
      if (pickup) st.itemPickups.push(pickup);
    }
  }

    // === SCROLL MULTIPLIER HELPERS ===
  function getScrollDmgMult() { return 1 + st.scrolls.power * 0.15; }
  function getScrollCdMult() { return Math.max(0.3, 1 - st.scrolls.haste * 0.15); }
  function getScrollRangeMult() { return 1 + st.scrolls.range * 0.2; }
  function getScrollBonusProj() { return st.scrolls.arcane; }
  function getScrollXpMult() { return 1 + st.scrolls.fortune * 0.3; }

  // === WEAPON FUNCTIONS ===
  function getWeaponDamage(w) {
    const def = WEAPON_TYPES[w.typeId];
    let dmg = def.baseDamage;
    // Level scaling
    if (w.typeId === 'clawSwipe') dmg *= 1 + (w.level - 1) * 0.2;
    else if (w.typeId === 'boneToss') dmg *= 1 + (w.level - 1) * 0.2;
    else if (w.typeId === 'poisonCloud') dmg *= 1 + (w.level - 1) * 0.25;
    else if (w.typeId === 'lightningBolt') dmg *= 1 + (w.level - 1) * 0.18;
    else if (w.typeId === 'fireball') dmg *= 1 + (w.level - 1) * 0.22;
    else if (w.typeId === 'boomerang') dmg *= 1 + (w.level - 1) * 0.2;
    return dmg * getScrollDmgMult() * st.augmentDmgMult;
  }

  function getWeaponCooldown(w) {
    const def = WEAPON_TYPES[w.typeId];
    let cd = def.baseCooldown;
    if (w.level >= 4) cd *= 0.82;
    return cd * getScrollCdMult();
  }

  function getWeaponRange(w) {
    const def = WEAPON_TYPES[w.typeId];
    let r = def.baseRange;
    if (w.typeId === 'clawSwipe' && w.level >= 3) r *= 1.15;
    if (w.typeId === 'clawSwipe' && w.level >= 5) r *= 1.15;
    return r * getScrollRangeMult();
  }

  function getProjectileCount(w) {
    let count = 1;
    if (w.typeId === 'boneToss') {
      if (w.level >= 2) count++;
      if (w.level >= 5) count += 2;
    }
    if (w.typeId === 'boomerang' && w.level >= 2) count++;
    count += getScrollBonusProj();
    return count;
  }

  function getChainCount(w) {
    let chains = 2;
    if (w.level >= 1) chains++;
    if (w.level >= 3) chains++;
    if (w.level >= 5) chains += 2;
    return chains;
  }

  function findNearestEnemy(range) {
    let nearest = null, nearDist = Infinity;
    for (const e of st.enemies) {
      if (!e.alive) continue;
      const dx = st.playerX - e.group.position.x;
      const dz = st.playerZ - e.group.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < range && dist < nearDist) {
        nearest = e;
        nearDist = dist;
      }
    }
    return nearest;
  }

  function killEnemy(e) {
    const pts = Math.floor((10 + st.wave * 2) * (e.tier || 1) * st.scoreMult * (st.totemScoreMult || 1));
    st.score += pts;
    st.xpGems.push(createXpGem(e.group.position.x, e.group.position.z));
    for (let g = 1; g < (e.tier || 1); g++) {
      st.xpGems.push(createXpGem(e.group.position.x + (Math.random() - 0.5), e.group.position.z + (Math.random() - 0.5)));
    }
    st.totalKills++;
    st.killsByTier[(e.tier || 1) - 1]++;
    // Loot drop roll — higher tier zombies drop more often
    // Lucky Charm: +50% chance to drop
    let dropChance = [0.03, 0.06, 0.10, 0.15, 0.15, 0.20, 0.20, 0.30, 0.30, 0.50][(e.tier || 1) - 1];
    if (st.items.charm) dropChance *= 1.5;
    if (Math.random() < dropChance) {
      const dropX = e.group.position.x;
      const dropZ = e.group.position.z;
      const roll = Math.random();
      if (roll < 0.6) {
        // Powerup crate (60% of drops)
        st.powerupCrates.push(createPowerupCrate(dropX, dropZ));
      } else if (roll < 0.85) {
        // Health orb (25% of drops) — heal 15% max HP
        st.hp = Math.min(st.hp + st.maxHp * 0.15, st.maxHp);
        st.floatingTexts3d.push({ text: '+HEALTH', color: '#44ff44', x: dropX, y: terrainHeight(dropX, dropZ) + 2, z: dropZ, life: 1.5 });
      } else {
        // XP burst (15% of drops) — bonus XP gems
        for (let g = 0; g < 3; g++) {
          st.xpGems.push(createXpGem(dropX + (Math.random() - 0.5) * 2, dropZ + (Math.random() - 0.5) * 2));
        }
      }
    }
    disposeEnemy(e);
  }

  function damageEnemy(e, dmg) {
    if (st.items.gloves && Math.random() < 0.15) dmg *= 2;
    e.hp -= dmg;
    e.hurtTimer = 0.15;
    if (e.hp <= 0 && e.alive) killEnemy(e);
  }

  function fireWeapon(w) {
    const def = WEAPON_TYPES[w.typeId];
    const range = getWeaponRange(w);
    const dmg = getWeaponDamage(w);

    if (w.typeId === 'clawSwipe') {
      // Arc slash visual: 3 slash lines fanning out from player
      const facing = playerGroup.rotation.y;
      const slashGroup = new THREE.Group();
      for (let s = -1; s <= 1; s++) {
        const a = facing + s * 0.4;
        const len = range;
        const slashMat = new THREE.MeshBasicMaterial({ color: 0xff8844, transparent: true, opacity: 0.7 });
        const slashMesh = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.15, len), slashMat);
        slashMesh.position.set(
          st.playerX + Math.sin(a) * len * 0.5,
          st.playerY + 0.8,
          st.playerZ + Math.cos(a) * len * 0.5
        );
        slashMesh.rotation.y = a;
        scene.add(slashMesh);
        st.weaponEffects.push({ mesh: slashMesh, life: 0.2, type: 'slash' });
      }
      // Hit all enemies in range
      for (const e of st.enemies) {
        if (!e.alive) continue;
        const dx = e.group.position.x - st.playerX;
        const dz = e.group.position.z - st.playerZ;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < range) damageEnemy(e, dmg);
      }
    } else if (w.typeId === 'boneToss') {
      // Spinning bone shape (T-shape made of 2 boxes)
      const count = getProjectileCount(w);
      for (let i = 0; i < count; i++) {
        const target = findNearestEnemy(range);
        if (!target) break;
        const dx = target.group.position.x - st.playerX;
        const dz = target.group.position.z - st.playerZ;
        const d = Math.sqrt(dx * dx + dz * dz) || 1;
        const spread = (i - (count - 1) / 2) * 0.3;
        const vx = (dx / d) * 12 + spread * (-dz / d);
        const vz = (dz / d) * 12 + spread * (dx / d);
        const boneGroup = new THREE.Group();
        const boneMat = new THREE.MeshLambertMaterial({ color: 0xeeddcc });
        boneGroup.add(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.4), boneMat));  // shaft
        boneGroup.add(new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.08, 0.08), boneMat)); // cross top
        const crossBot = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.08, 0.08), boneMat);
        crossBot.position.z = -0.16;
        boneGroup.add(crossBot);
        boneGroup.position.set(st.playerX, st.playerY + 0.8, st.playerZ);
        scene.add(boneGroup);
        st.weaponProjectiles.push({ mesh: boneGroup, vx, vz, dmg, life: 2, pierce: false, type: 'bone' });
      }
    } else if (w.typeId === 'poisonCloud') {
      // Swirling green cloud: multiple small particles in a group
      const target = findNearestEnemy(range);
      if (target) {
        const cx = target.group.position.x;
        const cz = target.group.position.z;
        const cloudSize = 2 * (1 + (w.level >= 2 ? 0.25 : 0));
        const cloudDuration = 3 * (1 + (w.level >= 3 ? 0.3 : 0));
        const cloudGroup = new THREE.Group();
        const ch = terrainHeight(cx, cz);
        // Multiple smaller particles instead of one big box
        for (let p = 0; p < 8; p++) {
          const pa = (p / 8) * Math.PI * 2;
          const pr = cloudSize * 0.3 * Math.random();
          const particleMat = new THREE.MeshBasicMaterial({
            color: p % 2 === 0 ? 0x44cc44 : 0x22aa22,
            transparent: true, opacity: 0.4
          });
          const particle = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.4), particleMat);
          particle.position.set(Math.cos(pa) * pr, 0.2 + Math.random() * 0.4, Math.sin(pa) * pr);
          cloudGroup.add(particle);
        }
        cloudGroup.position.set(cx, ch, cz);
        scene.add(cloudGroup);
        st.weaponEffects.push({ mesh: cloudGroup, x: cx, z: cz, radius: cloudSize / 2, dmgPerSec: dmg, life: cloudDuration, type: 'cloud' });
      }
    } else if (w.typeId === 'lightningBolt') {
      // Bright zigzag lightning with glow
      const chains = getChainCount(w);
      const target = findNearestEnemy(range);
      if (target) {
        const hit = new Set();
        let current = target;
        let prevX = st.playerX, prevZ = st.playerZ;
        for (let c = 0; c < chains && current; c++) {
          damageEnemy(current, dmg * (c === 0 ? 1 : 0.7));
          // Zigzag bolt: multiple small segments
          const ex = current.group.position.x, ez = current.group.position.z;
          const ey = current.group.position.y + 0.8;
          const boltDx = ex - prevX, boltDz = ez - prevZ;
          const boltDist = Math.sqrt(boltDx * boltDx + boltDz * boltDz) || 1;
          const segments = Math.max(3, Math.floor(boltDist * 2));
          for (let s = 0; s < segments; s++) {
            const t1 = s / segments, t2 = (s + 1) / segments;
            const jitter = 0.3;
            const x1 = prevX + boltDx * t1 + (Math.random() - 0.5) * jitter;
            const z1 = prevZ + boltDz * t1 + (Math.random() - 0.5) * jitter;
            const x2 = prevX + boltDx * t2 + (Math.random() - 0.5) * jitter;
            const z2 = prevZ + boltDz * t2 + (Math.random() - 0.5) * jitter;
            const segLen = Math.sqrt((x2 - x1) ** 2 + (z2 - z1) ** 2) || 0.1;
            const boltMat = new THREE.MeshBasicMaterial({ color: 0xaaddff });
            const boltSeg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, segLen), boltMat);
            boltSeg.position.set((x1 + x2) / 2, st.playerY + 1 + (Math.random() - 0.5) * 0.3, (z1 + z2) / 2);
            boltSeg.rotation.y = Math.atan2(x2 - x1, z2 - z1);
            scene.add(boltSeg);
            st.weaponEffects.push({ mesh: boltSeg, life: 0.15, type: 'bolt' });
          }
          // Glow at impact point
          const glowMat = new THREE.MeshBasicMaterial({ color: 0xccddff, transparent: true, opacity: 0.6 });
          const glow = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), glowMat);
          glow.position.set(ex, ey, ez);
          scene.add(glow);
          st.weaponEffects.push({ mesh: glow, life: 0.2, type: 'bolt' });

          hit.add(current);
          prevX = ex; prevZ = ez;
          let nextNearest = null, nextDist = Infinity;
          for (const e of st.enemies) {
            if (!e.alive || hit.has(e)) continue;
            const dx2 = prevX - e.group.position.x;
            const dz2 = prevZ - e.group.position.z;
            const d2 = Math.sqrt(dx2 * dx2 + dz2 * dz2);
            if (d2 < 5 && d2 < nextDist) { nextNearest = e; nextDist = d2; }
          }
          current = nextNearest;
        }
      }
    } else if (w.typeId === 'fireball') {
      // Glowing sphere with trail particles
      const count = Math.max(1, getScrollBonusProj());
      for (let i = 0; i < count; i++) {
        const target = findNearestEnemy(range);
        if (!target) break;
        const dx = target.group.position.x - st.playerX;
        const dz = target.group.position.z - st.playerZ;
        const d = Math.sqrt(dx * dx + dz * dz) || 1;
        // Multi-part fireball: core + outer glow
        const fbGroup = new THREE.Group();
        const coreMat = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
        const core = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), coreMat);
        fbGroup.add(core);
        const outerMat = new THREE.MeshBasicMaterial({ color: 0xff4400, transparent: true, opacity: 0.5 });
        const outer = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), outerMat);
        fbGroup.add(outer);
        // Flame trail particles (smaller cubes behind)
        for (let t = 1; t <= 3; t++) {
          const trailMat = new THREE.MeshBasicMaterial({ color: t === 1 ? 0xff6600 : 0xff2200, transparent: true, opacity: 0.4 / t });
          const trail = new THREE.Mesh(new THREE.BoxGeometry(0.15 / t, 0.15 / t, 0.15 / t), trailMat);
          trail.position.z = -t * 0.15;
          fbGroup.add(trail);
        }
        fbGroup.position.set(st.playerX, st.playerY + 0.8, st.playerZ);
        scene.add(fbGroup);
        const explosionR = 2.5 * (1 + (w.level >= 2 ? 0.3 : 0));
        st.weaponProjectiles.push({
          mesh: fbGroup, vx: (dx / d) * 10, vz: (dz / d) * 10, dmg,
          life: 2, pierce: false, type: 'fireball',
          explosionRadius: explosionR, explosionDmg: dmg * (w.level >= 5 ? 1.5 : 1)
        });
      }
    } else if (w.typeId === 'boomerang') {
      // Spinning cross/disc shape
      const count = getProjectileCount(w);
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + playerGroup.rotation.y;
        const boomGroup = new THREE.Group();
        const boomMat = new THREE.MeshLambertMaterial({ color: 0xaa44ff });
        // Cross shape for boomerang
        boomGroup.add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.1), boomMat));
        boomGroup.add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.5), boomMat));
        // Glowing center
        const centerMat = new THREE.MeshBasicMaterial({ color: 0xcc88ff, transparent: true, opacity: 0.6 });
        boomGroup.add(new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.1, 0.15), centerMat));
        boomGroup.position.set(st.playerX, st.playerY + 0.8, st.playerZ);
        scene.add(boomGroup);
        const speed = 8 * (1 + (w.level >= 3 ? 0.25 : 0));
        st.weaponProjectiles.push({
          mesh: boomGroup, angle, speed, dmg: dmg * (w.level >= 5 ? 2 : 1), life: 2.5, pierce: true, type: 'boomerang',
          startX: st.playerX, startZ: st.playerZ, elapsed: 0,
        });
      }
    }
  }

  function updateWeapons(dt) {
    for (const w of st.weapons) {
      w.cooldownTimer = Math.max(0, w.cooldownTimer - dt);
      if (w.cooldownTimer <= 0) {
        const hasTarget = findNearestEnemy(getWeaponRange(w));
        if (hasTarget) {
          fireWeapon(w);
          w.cooldownTimer = getWeaponCooldown(w);
        } else {
          w.cooldownTimer = 0.1; // retry soon
        }
      }
    }
  }

  function updateWeaponProjectiles(dt) {
    for (let i = st.weaponProjectiles.length - 1; i >= 0; i--) {
      const p = st.weaponProjectiles[i];
      p.life -= dt;

      if (p.type === 'boomerang') {
        p.elapsed += dt;
        // Boomerang follows an arc path
        const t = p.elapsed / 1.2;
        const outDist = p.speed * Math.sin(Math.min(t, 1) * Math.PI);
        p.mesh.position.x = p.startX + Math.sin(p.angle + t * 4) * outDist;
        p.mesh.position.z = p.startZ + Math.cos(p.angle + t * 4) * outDist;
        p.mesh.rotation.y += dt * 15;
      } else {
        p.mesh.position.x += p.vx * dt;
        p.mesh.position.z += p.vz * dt;
        p.mesh.rotation.y += dt * 8;
      }

      if (p.life <= 0) {
        // Fireball explosion on timeout
        if (p.type === 'fireball' && p.explosionRadius) {
          spawnExplosion(p.mesh.position.x, p.mesh.position.z, p.explosionRadius, p.explosionDmg);
        }
        scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        st.weaponProjectiles.splice(i, 1);
        continue;
      }

      // Hit enemies
      for (const e of st.enemies) {
        if (!e.alive) continue;
        const dx = p.mesh.position.x - e.group.position.x;
        const dz = p.mesh.position.z - e.group.position.z;
        if (dx * dx + dz * dz < 1.2) {
          damageEnemy(e, p.dmg);
          if (!p.pierce) {
            // Fireball explosion on hit
            if (p.type === 'fireball' && p.explosionRadius) {
              spawnExplosion(p.mesh.position.x, p.mesh.position.z, p.explosionRadius, p.explosionDmg);
            }
            scene.remove(p.mesh);
            p.mesh.geometry.dispose();
            p.mesh.material.dispose();
            st.weaponProjectiles.splice(i, 1);
            break;
          }
        }
      }
    }
  }

  function spawnExplosion(x, z, radius, dmg) {
    const h = terrainHeight(x, z);
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(radius * 2, 0.5, radius * 2),
      new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0.5 })
    );
    mesh.position.set(x, h + 0.3, z);
    scene.add(mesh);
    st.weaponEffects.push({ mesh, x, z, radius, life: 0.3, type: 'explosion' });

    // Damage all enemies in radius
    for (const e of st.enemies) {
      if (!e.alive) continue;
      const dx = x - e.group.position.x;
      const dz = z - e.group.position.z;
      if (dx * dx + dz * dz < radius * radius) {
        damageEnemy(e, dmg);
      }
    }
  }

  function disposeEffectMesh(mesh) {
    scene.remove(mesh);
    mesh.traverse(c => { if (c.geometry) c.geometry.dispose(); if (c.material) c.material.dispose(); });
  }

  function updateWeaponEffects(dt) {
    for (let i = st.weaponEffects.length - 1; i >= 0; i--) {
      const eff = st.weaponEffects[i];
      eff.life -= dt;

      if (eff.type === 'cloud') {
        // DoT damage
        for (const e of st.enemies) {
          if (!e.alive) continue;
          const dx = eff.x - e.group.position.x;
          const dz = eff.z - e.group.position.z;
          if (dx * dx + dz * dz < eff.radius * eff.radius) {
            damageEnemy(e, eff.dmgPerSec * dt);
          }
        }
        // Swirl the cloud particles
        eff.mesh.rotation.y += dt * 2;
        // Pulse opacity on children
        eff.mesh.children.forEach((c, ci) => {
          if (c.material) c.material.opacity = 0.2 + Math.sin(clock.elapsedTime * 4 + ci) * 0.15;
        });
      }

      if (eff.type === 'explosion') {
        if (eff.mesh.material) {
          eff.mesh.material.opacity = Math.min(1, Math.max(0, eff.life / 0.3 * 0.5));
        }
        eff.mesh.scale.y = Math.max(0.01, eff.life / 0.3);
      }

      if (eff.type === 'slash') {
        // Fade out slash lines
        if (eff.mesh.material) eff.mesh.material.opacity = Math.min(1, Math.max(0, eff.life / 0.2 * 0.7));
      }

      if (eff.type === 'bolt') {
        // Fade lightning segments
        if (eff.mesh.material) eff.mesh.material.opacity = Math.min(1, Math.max(0, eff.life / 0.15));
      }

      if (eff.life <= 0) {
        disposeEffectMesh(eff.mesh);
        st.weaponEffects.splice(i, 1);
      }
    }
  }

  // === LEVEL UP ===
  function showUpgradeMenu() {
    st.paused = true;
    st.upgradeMenu = true;
    st.selectedUpgrade = 0;

    // Unlock weapon slots at levels 5, 10, 15
    if (st.level === 5 || st.level === 10 || st.level === 15) {
      st.maxWeaponSlots = Math.min(4, st.maxWeaponSlots + 1);
    }

    const pool = [];

    // New weapons (if slots available)
    if (st.weapons.length < st.maxWeaponSlots) {
      const ownedIds = new Set(st.weapons.map(w => w.typeId));
      for (const id in WEAPON_TYPES) {
        if (!ownedIds.has(id)) {
          const def = WEAPON_TYPES[id];
          pool.push({
            category: 'NEW WEAPON',
            name: def.name,
            color: def.color,
            desc: def.desc,
            apply: s => {
              s.weapons.push({ typeId: id, level: 1, cooldownTimer: 0 });
            }
          });
        }
      }
    }

    // Weapon upgrades (existing weapons below max)
    for (const w of st.weapons) {
      const def = WEAPON_TYPES[w.typeId];
      if (w.level < def.maxLevel) {
        const nextDesc = def.levelDescs[w.level - 1] || '+Upgrade';
        pool.push({
          category: 'UPGRADE',
          name: `${def.name} LV${w.level + 1}`,
          color: def.color,
          desc: nextDesc,
          apply: () => { w.level++; }
        });
      }
    }

    // Scrolls (below max)
    for (const id in SCROLL_TYPES) {
      const def = SCROLL_TYPES[id];
      if (st.scrolls[id] < def.maxLevel) {
        pool.push({
          category: 'SCROLL',
          name: def.name,
          color: def.color,
          desc: def.desc,
          apply: s => {
            s.scrolls[id]++;
            if (id === 'vitality') {
              s.maxHp += 20;
              s.hp = Math.min(s.hp + 20, s.maxHp);
            }
          }
        });
      }
    }

    // Fallback options
    if (pool.length < 3) {
      pool.push({
        category: 'HEAL',
        name: 'HEAL',
        color: '#44ff44',
        desc: 'Restore 30 HP',
        apply: s => { s.hp = Math.min(s.hp + 30, s.maxHp); }
      });
      pool.push({
        category: 'HEAL',
        name: 'MAX HP +10',
        color: '#88ff88',
        desc: '+10 Max HP',
        apply: s => { s.maxHp += 10; s.hp = Math.min(s.hp + 10, s.maxHp); }
      });
    }

    // Shuffle and pick 3
    const shuffled = pool.sort(() => Math.random() - 0.5);
    st.upgradeChoices = shuffled.slice(0, 3);
  }

  // === PRE-GENERATE LOOT CRATES ===
  const LOOT_CRATE_COUNT = 30;
  for (let lci = 0; lci < LOOT_CRATE_COUNT; lci++) {
    const lx = (Math.random() - 0.5) * (ARENA_SIZE * 2 - 20);
    const lz = (Math.random() - 0.5) * (ARENA_SIZE * 2 - 20);
    const pickup = createItemPickup(lx, lz);
    if (pickup) st.itemPickups.push(pickup);
  }

  // === GAME LOOP ===
  const clock = new THREE.Clock();
  let animId = null;
  let chunkUpdateTimer = 0;

  function getGroundAt(x, z) {
    return terrainHeight(x, z);
  }

  function tick() {
    if (!st.running) return;
    animId = requestAnimationFrame(tick);

    const dt = Math.min(clock.getDelta(), 0.05);

    if (!st.paused && !st.gameOver) {
      st.gameTime += dt;


      // === PLAYER INPUT ===
      let mx = 0, mz = 0;
      if (keys3d['KeyW'] || keys3d['ArrowUp']) mz = -1;
      if (keys3d['KeyS'] || keys3d['ArrowDown']) mz = 1;
      if (keys3d['KeyA'] || keys3d['ArrowLeft']) mx = -1;
      if (keys3d['KeyD'] || keys3d['ArrowRight']) mx = 1;
      const len = Math.sqrt(mx * mx + mz * mz);
      if (len > 0) { mx /= len; mz /= len; }
      st.moveDir.x = mx; st.moveDir.z = mz;

      // Apply speed bonuses
      let speed = st.playerSpeed * st.speedBoost;
      if (st.items.boots === 'soccerCleats') speed *= 1.15;

      st.playerX += mx * speed * dt;
      st.playerZ += mz * speed * dt;
      // Clamp player to map boundaries
      st.playerX = Math.max(-MAP_HALF + 1, Math.min(MAP_HALF - 1, st.playerX));
      st.playerZ = Math.max(-MAP_HALF + 1, Math.min(MAP_HALF - 1, st.playerZ));

      // === JUMPING ===
      const jumpKey = keys3d['Space'] || keys3d['KeyW'] && keys3d['ShiftLeft'];
      if (st.flying) {
        // Wings flight mode
        if (keys3d['Space']) st.playerVY = 6;
        else if (keys3d['ShiftLeft']) st.playerVY = -6;
        else st.playerVY *= 0.9;
        st.playerY += st.playerVY * dt;
        st.onGround = false;

        // G-force maneuvers: Alt + forward/backward while flying
        const altKey = keys3d['AltLeft'] || keys3d['AltRight'];
        if (altKey) {
          const pitchRate = Math.PI * 1.2; // ~1.2 rad/s = full loop in ~5.2s

          if (keys3d['KeyW'] || keys3d['ArrowUp']) {
            // Pull up — forward loop (like pulling back on stick)
            st.gManeuver = true;
            st.gManeuverPitch += pitchRate * dt;
          } else if (keys3d['KeyS'] || keys3d['ArrowDown']) {
            // Push over — dive loop
            st.gManeuver = true;
            st.gManeuverPitch -= pitchRate * dt;
          }

          if (st.gManeuver) {
            // Speed boost during maneuver
            let maneuverSpeed = st.playerSpeed * st.speedBoost * 1.5;
            if (st.items.boots === 'soccerCleats') maneuverSpeed *= 1.15;
            // Move in the direction the player is facing through the loop
            const facingAngle = playerGroup.rotation.y;
            const pitchAngle = st.gManeuverPitch;
            st.playerX += Math.sin(facingAngle) * Math.cos(pitchAngle) * maneuverSpeed * dt;
            st.playerZ += Math.cos(facingAngle) * Math.cos(pitchAngle) * maneuverSpeed * dt;
            st.playerY += Math.sin(pitchAngle) * maneuverSpeed * dt;

            // Prevent going underground
            const gManeuverGroundH = getGroundAt(st.playerX, st.playerZ) + 1.0;
            if (st.playerY < gManeuverGroundH) st.playerY = gManeuverGroundH;
          }
        } else {
          // Not maneuvering — smoothly return to normal
          if (st.gManeuver) {
            st.gManeuver = false;
          }
          st.gManeuverPitch *= 0.9; // Decay toward 0 when not holding Alt
          // Zero out tiny residual pitch
          if (Math.abs(st.gManeuverPitch) < 0.01) st.gManeuverPitch = 0;
        }
      } else {
        if (keys3d['Space'] && st.onGround) {
          st.playerVY = st.jumpForce * st.jumpBoost;
          st.onGround = false;
          st.onPlatformY = null;
        }
        // Gravity
        st.playerVY -= GRAVITY_3D * dt;
        st.playerY += st.playerVY * dt;
      }

      // Ground collision (offset keeps model above terrain surface)
      const GROUND_OFFSET = 0.55;
      const groundH = getGroundAt(st.playerX, st.playerZ) + GROUND_OFFSET;
      if (!st.flying && st.playerY <= groundH) {
        st.playerY = groundH;
        st.playerVY = 0;
        st.onGround = true;
        st.onPlatformY = null;
      }

      // Platform collision (only when falling)
      if (!st.flying && st.playerVY <= 0) {
        for (const p of platforms) {
          const halfW = p.w / 2, halfD = p.d / 2;
          if (st.playerX > p.x - halfW && st.playerX < p.x + halfW &&
              st.playerZ > p.z - halfD && st.playerZ < p.z + halfD) {
            const platTop = p.y + 0.2;
            if (st.playerY >= platTop - 0.5 && st.playerY <= platTop + 0.5) {
              st.playerY = platTop;
              st.playerVY = 0;
              st.onGround = true;
              st.onPlatformY = platTop;
            }
          }
        }
      }

      // Min height clamp
      const groundH2 = getGroundAt(st.playerX, st.playerZ) + GROUND_OFFSET;
      if (st.playerY < groundH2) {
        st.playerY = groundH2;
        st.playerVY = 0;
        st.onGround = true;
      }

      // Per-frame Y clamp to prevent any clipping
      const groundHClamp = getGroundAt(st.playerX, st.playerZ) + GROUND_OFFSET;
      if (playerGroup.position.y < groundHClamp) st.playerY = groundHClamp;
      playerGroup.position.set(st.playerX, st.playerY, st.playerZ);

      // Player rotation toward movement
      if (len > 0) {
        const targetAngle = Math.atan2(mx, mz);
        // Smooth rotation
        let diff = targetAngle - playerGroup.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        if (st.flying) {
          // Slower turning when flying (feels more like flight)
          playerGroup.rotation.y += diff * 0.08;
          // Bank/roll into turns (subtle, clamped)
          const targetRoll = -diff * 0.6;
          const clampedRoll = Math.max(-0.35, Math.min(0.35, targetRoll)); // Max ~20 degrees
          playerGroup.rotation.z += (clampedRoll - playerGroup.rotation.z) * 0.1;
        } else {
          playerGroup.rotation.y += diff * 0.15;
        }
      } else if (st.flying) {
        // Return to level flight when not turning
        playerGroup.rotation.z *= 0.9;
      }

      // Bipedal leg + arm animation
      if (st.flying) {
        // Flying pose: legs trail behind, arms reach forward
        if (legs[0]) { legs[0].position.z = -0.15; legs[0].position.y = 0.25; }
        if (legs[1]) { legs[1].position.z = -0.15; legs[1].position.y = 0.25; }
        if (arms[0]) arms[0].position.z = 0.2;
        if (arms[1]) arms[1].position.z = 0.2;
        // No body bob when flying
      } else {
        const walkSpeed = len > 0 ? 10 : 0;
        const walkPhase = clock.elapsedTime * walkSpeed;
        const legSwing = Math.sin(walkPhase) * 0.5;
        const legLift = Math.abs(Math.sin(walkPhase)) * 0.08;
        if (legs[0]) { legs[0].position.z = legSwing * 0.25; legs[0].position.y = 0.25 + (len > 0 ? legLift : 0); }
        if (legs[1]) { legs[1].position.z = -legSwing * 0.25; legs[1].position.y = 0.25 + (len > 0 ? Math.abs(Math.sin(walkPhase + Math.PI)) * 0.08 : 0); }
        // Arm swing (opposite to legs, bigger)
        if (arms[0]) arms[0].position.z = -legSwing * 0.2;
        if (arms[1]) arms[1].position.z = legSwing * 0.2;
        // Body bob when walking
        if (len > 0) {
          playerGroup.position.y = st.playerY + Math.abs(Math.sin(walkPhase * 2)) * 0.04;
        }
      }
      // Tail wag always plays
      if (tail) tail.rotation.y = Math.sin(clock.elapsedTime * 3) * 0.4;

      // Muscle growth per level (0.08 per level = very visible)
      const muscleScale = 1 + (st.level - 1) * 0.08;
      for (const key in muscles) {
        if (muscles[key]) muscles[key].scale.set(muscleScale, muscleScale, muscleScale);
      }

      // Angel wings visibility + flapping + superman pose
      wingGroup.visible = st.flying;
      if (st.flying) {
        if (st.gManeuver) {
          // During G maneuver: pitch follows the maneuver angle on top of superman tilt
          playerGroup.rotation.x = -Math.PI / 2.5 + st.gManeuverPitch;
        } else {
          // Normal superman flying pose, smoothly blend back from any residual maneuver pitch
          const targetTilt = -Math.PI / 2.5 + st.gManeuverPitch;
          playerGroup.rotation.x += (targetTilt - playerGroup.rotation.x) * 0.1;
        }
        // Counter-rotate wings to stay in the horizontal flight plane
        wingGroup.rotation.x = -playerGroup.rotation.x;
        // Flap: faster during maneuvers, gentler in normal flight
        const flapSpeed = st.gManeuver ? 12 : 6;
        const flapAmp = st.gManeuver ? 0.3 : 0.25;
        const flap = Math.sin(clock.elapsedTime * flapSpeed) * flapAmp;
        wingL1.rotation.z = 0.2 + flap;
        wingL2.rotation.z = 0.35 + flap * 1.1;
        wingL3.rotation.z = 0.45 + flap * 1.2;
        wingR1.rotation.z = -0.2 - flap;
        wingR2.rotation.z = -0.35 - flap * 1.1;
        wingR3.rotation.z = -0.45 - flap * 1.2;
      } else {
        // Return to upright
        if (Math.abs(playerGroup.rotation.x) > 0.01) {
          playerGroup.rotation.x *= 0.85;
        } else {
          playerGroup.rotation.x = 0;
        }
        // Reset roll from flight banking
        if (Math.abs(playerGroup.rotation.z) > 0.01) {
          playerGroup.rotation.z *= 0.85;
        } else {
          playerGroup.rotation.z = 0;
        }
        wingGroup.rotation.x = 0;
      }

      // Invincibility timer
      if (st.invincible > 0) st.invincible -= dt;

      // === ACTIVE POWERUP TIMER ===
      if (st.activePowerup) {
        st.activePowerup.timer -= dt;
        if (st.activePowerup.timer <= 0) {
          st.activePowerup.def.remove(st);
          st.activePowerup = null;
        }
      }

      // === FIRE AURA DAMAGE ===
      if (st.fireAura) {
        // Spawn fire particles
        if (Math.random() < 0.3) {
          const fp = new THREE.Mesh(fireGeo, fireMat.clone());
          fp.material.color.setHex(Math.random() > 0.5 ? 0xff6600 : 0xff2200);
          fp.position.set(
            st.playerX + (Math.random() - 0.5) * 1.5,
            st.playerY + 0.5 + Math.random(),
            st.playerZ + (Math.random() - 0.5) * 1.5
          );
          scene.add(fp);
          fireParticles.push({ mesh: fp, life: 0.5 });
        }
        // Damage nearby enemies
        for (const e of st.enemies) {
          if (!e.alive) continue;
          const dx = st.playerX - e.group.position.x;
          const dz = st.playerZ - e.group.position.z;
          if (dx * dx + dz * dz < 9) { // range 3
            e.hp -= 20 * dt;
            e.hurtTimer = 0.1;
          }
        }
      }
      // Update fire particles
      for (let i = fireParticles.length - 1; i >= 0; i--) {
        fireParticles[i].life -= dt;
        fireParticles[i].mesh.position.y += dt * 3;
        if (fireParticles[i].life <= 0) {
          scene.remove(fireParticles[i].mesh);
          fireParticles[i].mesh.geometry.dispose();
          fireParticles[i].mesh.material.dispose();
          fireParticles.splice(i, 1);
        }
      }

      // === FROST NOVA (freeze nearby enemies on activation) ===
      if (st.frostNova) {
        for (const e of st.enemies) {
          if (!e.alive) continue;
          const dx = st.playerX - e.group.position.x;
          const dz = st.playerZ - e.group.position.z;
          if (dx * dx + dz * dz < 64) { // range 8
            e.frozen = true;
            e.frozenTimer = 5;
          }
        }
        // Spawn burst of frost particles
        for (let i = 0; i < 20; i++) {
          const angle = Math.random() * Math.PI * 2;
          const dist = Math.random() * 8;
          const fp = new THREE.Mesh(fireGeo, fireMat.clone());
          fp.material.color.setHex(0x88ccff);
          fp.position.set(st.playerX + Math.cos(angle) * dist, st.playerY + 0.5 + Math.random(), st.playerZ + Math.sin(angle) * dist);
          scene.add(fp);
          fireParticles.push({ mesh: fp, life: 1.0 });
        }
        st.frostNova = false; // instant burst, only triggers once
      }
      // Update frozen enemies
      for (const e of st.enemies) {
        if (!e.alive || !e.frozen) continue;
        e.frozenTimer -= dt;
        if (e.frozenTimer <= 0) {
          e.frozen = false;
          e.body.material.color.setHex(e.bodyColor);
          e.head.material.color.setHex(e.headColor);
        } else {
          // Frozen tint
          e.body.material.color.setHex(0x88ccff);
          e.head.material.color.setHex(0xaaddff);
        }
      }

      // === BERSERKER RAGE visual (red aura particles) ===
      if (st.berserkVulnerable && Math.random() < 0.25) {
        const fp = new THREE.Mesh(fireGeo, fireMat.clone());
        fp.material.color.setHex(0x881111);
        fp.position.set(
          st.playerX + (Math.random() - 0.5) * 1.5,
          st.playerY + 0.3 + Math.random() * 0.8,
          st.playerZ + (Math.random() - 0.5) * 1.5
        );
        scene.add(fp);
        fireParticles.push({ mesh: fp, life: 0.4 });
      }

      // === GHOST FORM visual (transparent player + ghost particles) ===
      if (st.ghostForm) {
        playerGroup.traverse(child => {
          if (child.isMesh && child.material) {
            child.material.transparent = true;
            child.material.opacity = 0.3 + Math.sin(clock.elapsedTime * 6) * 0.15;
          }
        });
        if (Math.random() < 0.2) {
          const fp = new THREE.Mesh(fireGeo, fireMat.clone());
          fp.material.color.setHex(0xeeeeff);
          fp.material.transparent = true;
          fp.material.opacity = 0.5;
          fp.position.set(
            st.playerX + (Math.random() - 0.5) * 1,
            st.playerY + Math.random() * 1.5,
            st.playerZ + (Math.random() - 0.5) * 1
          );
          scene.add(fp);
          fireParticles.push({ mesh: fp, life: 0.6 });
        }
      } else {
        // Restore opacity when ghost form ends
        playerGroup.traverse(child => {
          if (child.isMesh && child.material && child.material.transparent && child.material.opacity < 0.9) {
            child.material.opacity = 1;
            child.material.transparent = false;
          }
        });
      }

      // === EARTHQUAKE STOMP (shockwave on landing) ===
      if (st.earthquakeStomp) {
        const currentlyAirborne = !st.onGround;
        if (st.wasAirborne && st.onGround) {
          // Just landed - create shockwave!
          const stompDmg = st.attackDamage * st.dmgBoost * 1.5;
          for (const e of st.enemies) {
            if (!e.alive) continue;
            const dx = st.playerX - e.group.position.x;
            const dz = st.playerZ - e.group.position.z;
            if (dx * dx + dz * dz < 25) { // range 5
              e.hp -= stompDmg;
              e.hurtTimer = 0.15;
            }
          }
          // Visual: expanding ring of brown particles
          for (let i = 0; i < 24; i++) {
            const angle = (i / 24) * Math.PI * 2;
            const fp = new THREE.Mesh(fireGeo, fireMat.clone());
            fp.material.color.setHex(0x8B6914);
            fp.position.set(
              st.playerX + Math.cos(angle) * 2,
              st.playerY + 0.2,
              st.playerZ + Math.sin(angle) * 2
            );
            scene.add(fp);
            fireParticles.push({ mesh: fp, life: 0.8 });
          }
        }
        st.wasAirborne = currentlyAirborne;
      }

      // === VAMPIRE FANGS (passive regen 3 HP/s) ===
      if (st.vampireHeal) {
        st.hp = Math.min(st.hp + 3 * dt, st.maxHp);
        if (Math.random() < 0.15) {
          const fp = new THREE.Mesh(fireGeo, fireMat.clone());
          fp.material.color.setHex(0x6a0dad);
          fp.position.set(
            st.playerX + (Math.random() - 0.5) * 0.8,
            st.playerY + 0.5 + Math.random() * 0.5,
            st.playerZ + (Math.random() - 0.5) * 0.8
          );
          scene.add(fp);
          fireParticles.push({ mesh: fp, life: 0.5 });
        }
      }

      // === LIGHTNING SHIELD (zap nearest enemy every 0.5s) ===
      if (st.lightningShield) {
        st.lightningShieldTimer -= dt;
        if (st.lightningShieldTimer <= 0) {
          st.lightningShieldTimer = 0.5;
          let nearest = null, nearestDist = 25; // range 5 squared
          for (const e of st.enemies) {
            if (!e.alive) continue;
            const dx = st.playerX - e.group.position.x;
            const dz = st.playerZ - e.group.position.z;
            const distSq = dx * dx + dz * dz;
            if (distSq < nearestDist) {
              nearestDist = distSq;
              nearest = e;
            }
          }
          if (nearest) {
            nearest.hp -= 10 * st.dmgBoost;
            nearest.hurtTimer = 0.15;
            // Lightning bolt visual (line of particles from player to enemy)
            const ex = nearest.group.position.x, ez = nearest.group.position.z;
            const ey = nearest.group.position.y + 0.5;
            for (let i = 0; i < 6; i++) {
              const t = i / 5;
              const fp = new THREE.Mesh(fireGeo, fireMat.clone());
              fp.material.color.setHex(0x44aaff);
              fp.position.set(
                st.playerX + (ex - st.playerX) * t + (Math.random() - 0.5) * 0.3,
                st.playerY + 1 + (ey - st.playerY - 1) * t,
                st.playerZ + (ez - st.playerZ) * t + (Math.random() - 0.5) * 0.3
              );
              scene.add(fp);
              fireParticles.push({ mesh: fp, life: 0.3 });
            }
          }
        }
        // Orbiting spark particles
        if (Math.random() < 0.3) {
          const angle = clock.elapsedTime * 4 + Math.random() * Math.PI;
          const fp = new THREE.Mesh(fireGeo, fireMat.clone());
          fp.material.color.setHex(0x44aaff);
          fp.position.set(
            st.playerX + Math.cos(angle) * 1.5,
            st.playerY + 0.8 + Math.random() * 0.5,
            st.playerZ + Math.sin(angle) * 1.5
          );
          scene.add(fp);
          fireParticles.push({ mesh: fp, life: 0.4 });
        }
      }

      // === GIANT GROWTH (scale player model) ===
      if (st.giantMode) {
        playerGroup.scale.set(2, 2, 2);
      } else {
        if (playerGroup.scale.x > 1.01) {
          playerGroup.scale.set(1, 1, 1);
        }
      }

      // === TIME WARP visual (purple distortion particles around player) ===
      if (st.timeWarp && Math.random() < 0.2) {
        const angle = Math.random() * Math.PI * 2;
        const fp = new THREE.Mesh(fireGeo, fireMat.clone());
        fp.material.color.setHex(0x9944ff);
        fp.material.transparent = true;
        fp.material.opacity = 0.6;
        fp.position.set(
          st.playerX + Math.cos(angle) * 3,
          st.playerY + Math.random() * 2,
          st.playerZ + Math.sin(angle) * 3
        );
        scene.add(fp);
        fireParticles.push({ mesh: fp, life: 0.7 });
      }

      // === MIRROR IMAGE (2 orbiting clones that damage enemies) ===
      if (st.mirrorClones) {
        // Create clone groups if they don't exist
        if (st.mirrorCloneGroups.length === 0) {
          for (let c = 0; c < 2; c++) {
            const clone = new THREE.Group();
            const cloneBody = new THREE.Mesh(
              new THREE.BoxGeometry(0.5, 0.7, 0.4),
              new THREE.MeshLambertMaterial({ color: 0x44ffff, transparent: true, opacity: 0.6 })
            );
            cloneBody.position.y = 0.5;
            clone.add(cloneBody);
            const cloneHead = new THREE.Mesh(
              new THREE.BoxGeometry(0.35, 0.35, 0.35),
              new THREE.MeshLambertMaterial({ color: 0x88ffff, transparent: true, opacity: 0.6 })
            );
            cloneHead.position.y = 1.1;
            clone.add(cloneHead);
            scene.add(clone);
            st.mirrorCloneGroups.push({ group: clone, attackTimer: 0 });
          }
        }
        // Update clone positions (orbit around player)
        for (let c = 0; c < st.mirrorCloneGroups.length; c++) {
          const cloneData = st.mirrorCloneGroups[c];
          const angle = clock.elapsedTime * 2 + (c * Math.PI);
          const orbitR = 2.5;
          cloneData.group.position.set(
            st.playerX + Math.cos(angle) * orbitR,
            st.playerY,
            st.playerZ + Math.sin(angle) * orbitR
          );
          cloneData.group.rotation.y = angle + Math.PI;
          // Clone attacks nearby enemies every 0.8s
          cloneData.attackTimer -= dt;
          if (cloneData.attackTimer <= 0) {
            cloneData.attackTimer = 0.8;
            for (const e of st.enemies) {
              if (!e.alive) continue;
              const dx = cloneData.group.position.x - e.group.position.x;
              const dz = cloneData.group.position.z - e.group.position.z;
              if (dx * dx + dz * dz < 9) { // range 3
                e.hp -= st.attackDamage * st.dmgBoost * 0.5;
                e.hurtTimer = 0.1;
                break; // one target per attack
              }
            }
          }
        }
      } else {
        // Remove clones when powerup ends
        if (st.mirrorCloneGroups.length > 0) {
          for (const cloneData of st.mirrorCloneGroups) {
            cloneData.group.traverse(child => {
              if (child.geometry) child.geometry.dispose();
              if (child.material) child.material.dispose();
            });
            scene.remove(cloneData.group);
          }
          st.mirrorCloneGroups = [];
        }
      }

      // === BOMB TRAIL (drop bombs as player moves) ===
      if (st.bombTrail) {
        st.bombTrailTimer -= dt;
        if (st.bombTrailTimer <= 0) {
          st.bombTrailTimer = 0.5;
          // Create bomb at player position
          const bomb = new THREE.Mesh(
            new THREE.SphereGeometry(0.3, 8, 8),
            new THREE.MeshLambertMaterial({ color: 0xff6622 })
          );
          bomb.position.set(st.playerX, st.playerY + 0.3, st.playerZ);
          scene.add(bomb);
          st.bombTrailBombs.push({ mesh: bomb, timer: 1.5, x: st.playerX, z: st.playerZ });
        }
      }
      // Update bombs (countdown + explosion)
      for (let i = st.bombTrailBombs.length - 1; i >= 0; i--) {
        const b = st.bombTrailBombs[i];
        b.timer -= dt;
        // Flashing as timer runs down
        const flash = Math.sin(b.timer * 12) > 0;
        b.mesh.material.color.setHex(flash ? 0xff6622 : 0xff2200);
        if (b.timer <= 0) {
          // Explode! Damage enemies within range 3
          for (const e of st.enemies) {
            if (!e.alive) continue;
            const dx = b.x - e.group.position.x;
            const dz = b.z - e.group.position.z;
            if (dx * dx + dz * dz < 9) {
              e.hp -= st.attackDamage * st.dmgBoost;
              e.hurtTimer = 0.15;
            }
          }
          // Explosion particles
          for (let j = 0; j < 10; j++) {
            const fp = new THREE.Mesh(fireGeo, fireMat.clone());
            fp.material.color.setHex(Math.random() > 0.5 ? 0xff6622 : 0xff2200);
            fp.position.set(
              b.x + (Math.random() - 0.5) * 2,
              b.mesh.position.y + Math.random() * 1.5,
              b.z + (Math.random() - 0.5) * 2
            );
            scene.add(fp);
            fireParticles.push({ mesh: fp, life: 0.5 });
          }
          scene.remove(b.mesh);
          b.mesh.geometry.dispose();
          b.mesh.material.dispose();
          st.bombTrailBombs.splice(i, 1);
        }
      }

      // === REGEN BURST (rapid healing) ===
      if (st.regenBurst) {
        st.hp = Math.min(st.hp + (st.maxHp / 5) * dt, st.maxHp);
        if (Math.random() < 0.25) {
          const fp = new THREE.Mesh(fireGeo, fireMat.clone());
          fp.material.color.setHex(0x33ff33);
          fp.position.set(
            st.playerX + (Math.random() - 0.5) * 1,
            st.playerY + 0.3 + Math.random() * 1.2,
            st.playerZ + (Math.random() - 0.5) * 1
          );
          scene.add(fp);
          fireParticles.push({ mesh: fp, life: 0.6 });
        }
      }

      // === WEAPONS (auto-fire) ===
      updateWeapons(dt);
      updateWeaponProjectiles(dt);
      updateWeaponEffects(dt);

      // === AMBIENT SPAWNS ===
      st.ambientSpawnTimer -= dt;
      if (st.ambientSpawnTimer <= 0) {
        spawnAmbient();
        st.ambientSpawnTimer = 3;
      }

      // === AMBIENT CRATE SPAWN (every 30s) ===
      st.ambientCrateTimer -= dt;
      if (st.ambientCrateTimer <= 0) {
        st.ambientCrateTimer = 30;
        const ca = Math.random() * Math.PI * 2;
        const cx = st.playerX + Math.cos(ca) * 15;
        const cz = st.playerZ + Math.sin(ca) * 15;
        st.powerupCrates.push(createPowerupCrate(cx, cz));
      }

      // === WAVE EVENTS (every 4 minutes) ===
      st.waveEventTimer -= dt;
      if (st.waveEventTimer <= 10 && st.waveWarning === 0) {
        st.waveWarning = 10; // Start 10-second countdown
      }
      if (st.waveWarning > 0) {
        st.waveWarning -= dt;
        if (st.waveWarning <= 0) {
          st.waveWarning = 0;
          spawnWaveEvent();
          st.waveEventTimer = 240; // Reset for next wave in 4 min
        }
      }

      // === TERRAIN CHUNKS (throttled) ===
      chunkUpdateTimer -= dt;
      if (chunkUpdateTimer <= 0) {
        updateChunks(st.playerX, st.playerZ);
        updatePlatformChunks(st.playerX, st.playerZ);
        chunkUpdateTimer = 0.5;
      }

      // === ENEMY AI ===
      for (const e of st.enemies) {
        if (!e.alive) continue;
        if (e.frozen) continue; // Frost Nova: frozen enemies don't move
        // Lazy-init jump state fields
        if (e.jumpVY === undefined) { e.jumpVY = 0; e.jumpCooldown = 0; e.onPlatform = false; }
        const dx = st.playerX - e.group.position.x;
        const dz = st.playerZ - e.group.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist > 0.01) {
          const nx = dx / dist;
          const nz = dz / dist;
          const eSpd = e.speed * st.totemSpeedMult;
          e.group.position.x += nx * eSpd * dt;
          e.group.position.z += nz * eSpd * dt;
          // Clamp enemies to map boundaries
          e.group.position.x = Math.max(-MAP_HALF + 0.5, Math.min(MAP_HALF - 0.5, e.group.position.x));
          e.group.position.z = Math.max(-MAP_HALF + 0.5, Math.min(MAP_HALF - 0.5, e.group.position.z));
          e.group.rotation.y = Math.atan2(nx, nz);
        }

        // Platform jumping logic
        if (e.jumpCooldown > 0) e.jumpCooldown -= dt;

        // Check if player is on a platform and zombie is close horizontally
        if (st.onPlatformY !== null && dist < 6 && !e.onPlatform) {
          const targetY = st.onPlatformY;
          const zombieY = e.group.position.y;
          if (targetY > zombieY + 0.5 && e.jumpCooldown <= 0 && e.jumpVY === 0) {
            const tierJumpChance = 0.02 + ((e.tier || 1) - 1) * 0.015;
            if (Math.random() < tierJumpChance) {
              e.jumpVY = 8 + ((e.tier || 1) - 1) * 0.5;
              e.jumpCooldown = 2;
            }
          }
        }

        // Apply jump physics or normal ground following
        if (e.jumpVY !== 0 || e.onPlatform) {
          e.jumpVY -= GRAVITY_3D * dt;
          e.group.position.y += e.jumpVY * dt;

          for (const p of platforms) {
            const halfW = p.w / 2, halfD = p.d / 2;
            if (e.group.position.x > p.x - halfW && e.group.position.x < p.x + halfW &&
                e.group.position.z > p.z - halfD && e.group.position.z < p.z + halfD) {
              const platTop = p.y + 0.2;
              if (e.jumpVY <= 0 && e.group.position.y >= platTop - 0.5 && e.group.position.y <= platTop + 1.0) {
                e.group.position.y = platTop + 0.45;
                e.jumpVY = 0;
                e.onPlatform = true;
              }
            }
          }

          const groundH = getGroundAt(e.group.position.x, e.group.position.z) + 0.45;
          if (e.group.position.y <= groundH) {
            e.group.position.y = groundH;
            e.jumpVY = 0;
            e.onPlatform = false;
          }
        } else {
          const eh = getGroundAt(e.group.position.x, e.group.position.z) + 0.45;
          e.group.position.y = eh;
        }
        // Walking animation: arm swing + leg shuffle
        e.walkPhase += dt * e.speed * 3;
        const armSwing = Math.sin(e.walkPhase) * 0.4;
        const legSwing = Math.sin(e.walkPhase) * 0.15;
        if (e.armL) e.armL.position.z = 0.15 + armSwing * 0.3;
        if (e.armR) e.armR.position.z = 0.15 - armSwing * 0.3;
        if (e.legL) e.legL.position.z = legSwing;
        if (e.legR) e.legR.position.z = -legSwing;
        // Contact damage (scaled by tier + difficulty) - check Y distance so platforms/air protect player
        const dy = Math.abs(st.playerY - e.group.position.y);
        const tierData = ZOMBIE_TIERS[(e.tier || 1) - 1];
        if (dist < 1.0 * (tierData.scale || 1) && dy < 1.5 && st.invincible <= 0) {
          let dmg = 15 * tierData.dmgMult * st.zombieDmgMult * dt;
          if (st.items.armor === 'leather') dmg *= 0.75;
          else if (st.items.armor === 'chainmail') dmg *= 0.6;
          dmg *= (1 - st.augmentArmor);
          if (st.berserkVulnerable) dmg *= 1.25; // Berserker Rage: +25% damage taken
          // Shield Bracelet: absorb one hit every 30s
          if (st.items.bracelet && st.shieldBraceletReady) {
            dmg = 0;
            st.shieldBraceletReady = false;
            st.shieldBraceletTimer = 30;
            st.floatingTexts3d.push({ text: 'BLOCKED!', color: '#4488ff', x: st.playerX, y: st.playerY + 2, z: st.playerZ, life: 1.5 });
          }
          st.hp -= dmg;
          // Thorned Vest: reflect 20% damage back
          if (st.items.vest && dmg > 0) { e.hp -= dmg * 0.2; e.hurtTimer = 0.1; }
          st.invincible = 0.2;
        }
        // Hurt flash (white flash like 2D)
        if (e.hurtTimer > 0) {
          e.hurtTimer -= dt;
          const flashColor = e.hurtTimer > 0 ? 0xffffff : e.bodyColor;
          const headFlash = e.hurtTimer > 0 ? 0xffffff : e.headColor;
          e.body.material.color.setHex(flashColor);
          e.head.material.color.setHex(headFlash);
          if (e.hurtTimer <= 0) {
            e.body.material.color.setHex(e.bodyColor);
            e.head.material.color.setHex(e.headColor);
          }
        }
        // Kill enemies that fall too far behind
        if (dist > 60) { disposeEnemy(e); }
      }

      // === ZOMBIE-ZOMBIE COLLISION: MERGE INTO HIGHER TIERS ===
      const ZOMBIE_RADIUS = 0.5;
      const mergedSet = new Set();
      const newEnemies = [];
      for (let i = 0; i < st.enemies.length; i++) {
        const a = st.enemies[i];
        if (!a.alive || mergedSet.has(i)) continue;
        let merged = false;
        for (let j = i + 1; j < st.enemies.length; j++) {
          const b = st.enemies[j];
          if (!b.alive || mergedSet.has(j)) continue;
          const dx = a.group.position.x - b.group.position.x;
          const dz = a.group.position.z - b.group.position.z;
          const distSq = dx * dx + dz * dz;
          const aScale = ZOMBIE_TIERS[(a.tier || 1) - 1].scale;
          const bScale = ZOMBIE_TIERS[(b.tier || 1) - 1].scale;
          const minDist = ZOMBIE_RADIUS * (aScale + bScale);
          if (distSq < minDist * minDist && distSq > 0.001) {
            // Same tier and below max → merge!
            const aTier = a.tier || 1;
            const bTier = b.tier || 1;
            if (aTier === bTier && aTier < 10) {
              const mx = (a.group.position.x + b.group.position.x) / 2;
              const mz = (a.group.position.z + b.group.position.z) / 2;
              const newTier = aTier + 1;
              const baseHp = 8 + Math.floor((st.gameTime / 60) * 2.5);
              disposeEnemy(a); disposeEnemy(b);
              mergedSet.add(i); mergedSet.add(j);
              newEnemies.push(createEnemy(mx, mz, baseHp, newTier));
              merged = true;
              break;
            } else {
              // Different tiers or max tier: just push apart
              const dist = Math.sqrt(distSq);
              const overlap = (minDist - dist) * 0.5;
              const nx = dx / dist;
              const nz = dz / dist;
              a.group.position.x += nx * overlap;
              a.group.position.z += nz * overlap;
              b.group.position.x -= nx * overlap;
              b.group.position.z -= nz * overlap;
            }
          }
        }
      }
      if (newEnemies.length > 0) {
        st.enemies.push(...newEnemies);
      }

      // === AUTO-ATTACK ===
      st.autoAttackTimer -= dt;
      if (st.autoAttackTimer <= 0 && !st.ghostForm) {
        let range = st.attackRange;
        if (st.items.boots === 'cowboyBoots') range *= 1.2;
        if (st.rangedMode) range *= 2;

        let nearest = null, nearDist = Infinity;
        for (const e of st.enemies) {
          if (!e.alive) continue;
          const dx = st.playerX - e.group.position.x;
          const dz = st.playerZ - e.group.position.z;
          const dist = Math.sqrt(dx * dx + dz * dz);
          if (dist < range && dist < nearDist) {
            nearest = e;
            nearDist = dist;
          }
        }
        if (nearest) {
          let dmg = st.attackDamage * getPlayerDmgMult();
          if (st.items.gloves && Math.random() < 0.15) dmg *= 2;
          nearest.hp -= dmg;
          nearest.hurtTimer = 0.15;

          const py = st.playerY + 0.8;
          const ey = nearest.group.position.y + 0.8;
          st.attackLines.push(createAttackLine(st.playerX, py, st.playerZ, nearest.group.position.x, ey, nearest.group.position.z));

          if (st.rangedMode) {
            const dx = nearest.group.position.x - st.playerX;
            const dz = nearest.group.position.z - st.playerZ;
            const d = Math.sqrt(dx * dx + dz * dz) || 1;
            st.projectiles.push(createProjectile(st.playerX, py, st.playerZ, dx / d * 15, dz / d * 15));
          }

          if (nearest.hp <= 0 && nearest.alive) killEnemy(nearest);
          st.autoAttackTimer = 1 / (st.attackSpeed * st.atkSpeedBoost);
        }
      }

      // === POWER ATTACK (Hold Enter/B to charge, release to strike) ===
      const chargeKey = keys3d['Enter'] || keys3d['NumpadEnter'] || keys3d['KeyB'];
      if (chargeKey && !st.upgradeMenu && !st.pauseMenu) {
        if (!st.charging) {
          st.charging = true;
          st.chargeTime = 0;
        }
        st.chargeTime = Math.min(st.chargeTime + dt, 2);
        // Charge glow visual
        if (!st.chargeGlow) {
          const glowMat = new THREE.MeshBasicMaterial({ color: 0xffcc00, transparent: true, opacity: 0.3 });
          st.chargeGlow = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), glowMat);
          scene.add(st.chargeGlow);
        }
        const glowScale = 1 + st.chargeTime * 1.5;
        st.chargeGlow.scale.set(glowScale, glowScale, glowScale);
        st.chargeGlow.position.set(st.playerX, st.playerY + 0.8, st.playerZ);
        st.chargeGlow.material.opacity = 0.15 + st.chargeTime * 0.2;
      }
      if (!chargeKey && st.charging) {
        st.charging = false;
        st.powerAttackReady = true;
      }
      if (st.powerAttackReady) {
        st.powerAttackReady = false;
        const chargeMult = 1 + st.chargeTime;
        let range = st.attackRange * (1 + st.chargeTime * 0.5);
        if (st.items.boots === 'cowboyBoots') range *= 1.2;
        const py = st.playerY + 0.8;
        let dmg = st.attackDamage * getPlayerDmgMult() * chargeMult;
        if (st.items.gloves && Math.random() < 0.15) dmg *= 2;

        // Hit all enemies in range (AoE power attack)
        for (const e of st.enemies) {
          if (!e.alive) continue;
          const dx = st.playerX - e.group.position.x;
          const dz = st.playerZ - e.group.position.z;
          const dist = Math.sqrt(dx * dx + dz * dz);
          if (dist < range) {
            e.hp -= dmg;
            e.hurtTimer = 0.2;
            st.attackLines.push(createAttackLine(st.playerX, py, st.playerZ, e.group.position.x, e.group.position.y + 0.8, e.group.position.z));
            if (e.hp <= 0 && e.alive) killEnemy(e);
          }
        }
        // Flash effect
        if (st.chargeGlow) {
          st.chargeGlow.material.opacity = 0.8;
          st.chargeGlow.scale.set(range * 2, range * 2, range * 2);
          setTimeout(() => {
            if (st.chargeGlow) {
              scene.remove(st.chargeGlow);
              st.chargeGlow.geometry.dispose();
              st.chargeGlow.material.dispose();
              st.chargeGlow = null;
            }
          }, 100);
        }
        st.chargeTime = 0;
      }
      // Remove charge glow if not charging
      if (!st.charging && !st.powerAttackReady && st.chargeGlow) {
        scene.remove(st.chargeGlow);
        st.chargeGlow.geometry.dispose();
        st.chargeGlow.material.dispose();
        st.chargeGlow = null;
      }

      // === ATTACK LINES ===
      for (let i = st.attackLines.length - 1; i >= 0; i--) {
        st.attackLines[i].life--;
        if (st.attackLines[i].life <= 0) {
          scene.remove(st.attackLines[i].line);
          st.attackLines[i].line.geometry.dispose();
          st.attackLines.splice(i, 1);
        }
      }

      // === PROJECTILES ===
      for (let i = st.projectiles.length - 1; i >= 0; i--) {
        const p = st.projectiles[i];
        p.mesh.position.x += p.vx * dt;
        p.mesh.position.z += p.vz * dt;
        p.mesh.rotation.y += dt * 10;
        p.life--;
        if (p.life <= 0) {
          scene.remove(p.mesh);
          p.mesh.geometry.dispose();
          p.mesh.material.dispose();
          st.projectiles.splice(i, 1);
          continue;
        }
        // Hit enemies
        for (const e of st.enemies) {
          if (!e.alive || p.hitEnemies.has(e)) continue;
          const dx = p.mesh.position.x - e.group.position.x;
          const dz = p.mesh.position.z - e.group.position.z;
          if (dx * dx + dz * dz < 1) {
            e.hp -= st.attackDamage * st.dmgBoost * 0.8;
            e.hurtTimer = 0.15;
            p.hitEnemies.add(e);
            if (e.hp <= 0 && e.alive) killEnemy(e);
          }
        }
      }

      // === XP GEMS ===
      for (let i = st.xpGems.length - 1; i >= 0; i--) {
        const gem = st.xpGems[i];
        gem.bobPhase += dt * 3;
        const gh = getGroundAt(gem.mesh.position.x, gem.mesh.position.z);
        gem.mesh.position.y = gh + 0.4 + Math.sin(gem.bobPhase) * 0.15;
        gem.mesh.rotation.y += dt * 2;
        const dx = st.playerX - gem.mesh.position.x;
        const dz = st.playerZ - gem.mesh.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        // Magnet pull
        if (dist < st.collectRadius * 2 && dist > st.collectRadius) {
          const pull = 3 * dt;
          gem.mesh.position.x += (dx / dist) * pull;
          gem.mesh.position.z += (dz / dist) * pull;
        }
        if (dist < st.collectRadius) {
          st.xp += Math.max(1, Math.round(st.augmentXpMult * getScrollXpMult() * (st.totemXpMult || 1)));
          scene.remove(gem.mesh);
          st.xpGems.splice(i, 1);
          if (st.xp >= st.xpToNext) {
            st.xp -= st.xpToNext;
            st.xpToNext = Math.floor(st.xpToNext * 1.5);
            st.level++;
            showUpgradeMenu();
          }
        }
      }

      // === POWERUP CRATES ===
      for (let i = st.powerupCrates.length - 1; i >= 0; i--) {
        const c = st.powerupCrates[i];
        if (!c.alive) continue;
        const dx = st.playerX - c.x;
        const dz = st.playerZ - c.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        // Show label if glasses equipped
        c.showLabel = st.items.glasses && dist < 8;

        // Auto-attack hits crates
        if (dist < st.attackRange * 1.5 && st.autoAttackTimer <= 0) {
          // Handled by proximity - player walks into crate to break
        }
        // Walk into crate to break (must be at similar height)
        const cdy = Math.abs(st.playerY - c.group.position.y);
        if (dist < 1.2 && cdy < 2.0) {
          c.hp--;
          if (c.hp <= 0) {
            c.alive = false;
            // Apply powerup
            if (st.activePowerup) st.activePowerup.def.remove(st);
            c.ptype.apply(st);
            st.activePowerup = { def: c.ptype, timer: c.ptype.duration };
            scene.remove(c.group);
            c.group.traverse(ch => { if (ch.geometry) ch.geometry.dispose(); if (ch.material) ch.material.dispose(); });
            st.powerupCrates.splice(i, 1);
          }
        }
        // Cleanup far crates
        if (dist > 60) {
          c.alive = false;
          scene.remove(c.group);
          c.group.traverse(ch => { if (ch.geometry) ch.geometry.dispose(); if (ch.material) ch.material.dispose(); });
          st.powerupCrates.splice(i, 1);
        }
      }

      // === ITEM PICKUPS ===
      for (let i = st.itemPickups.length - 1; i >= 0; i--) {
        const item = st.itemPickups[i];
        if (!item.alive) continue;
        item.bobPhase += dt * 3;
        const ih = getGroundAt(item.x, item.z);
        item.mesh.position.y = ih + 0.8 + Math.sin(item.bobPhase) * 0.2;
        item.mesh.rotation.y += dt * 1.5;
        const dx = st.playerX - item.x;
        const dz = st.playerZ - item.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const idy = Math.abs(st.playerY - item.mesh.position.y);
        if (dist < 1.5 && idy < 2.0) {
          // Equip item
          const it = item.itype;
          if (it.slot === 'armor') st.items.armor = it.id;
          else if (it.slot === 'glasses') st.items.glasses = true;
          else if (it.slot === 'boots') st.items.boots = it.id;
          else if (it.slot === 'ring') { st.items.ring = true; st.collectRadius *= 1.5; }
          else if (it.slot === 'charm') st.items.charm = true;
          else if (it.slot === 'vest') st.items.vest = true;
          else if (it.slot === 'pendant') { st.items.pendant = true; st.augmentRegen += 1; }
          else if (it.slot === 'bracelet') st.items.bracelet = true;
          else if (it.slot === 'gloves') st.items.gloves = true;
          // Floating text for item pickup
          st.floatingTexts3d.push({ text: it.name, color: it.color, x: item.x, y: st.playerY + 2.5, z: item.z, life: 2 });
          st.floatingTexts3d.push({ text: it.desc, color: '#ffffff', x: item.x, y: st.playerY + 2, z: item.z, life: 2 });
          item.alive = false;
          scene.remove(item.mesh);
          item.mesh.geometry.dispose();
          item.mesh.material.dispose();
          st.itemPickups.splice(i, 1);
        }
        if (dist > 60) {
          item.alive = false;
          scene.remove(item.mesh);
          item.mesh.geometry.dispose();
          item.mesh.material.dispose();
          st.itemPickups.splice(i, 1);
        }
      }

      // === SHRINES ===
      for (let i = st.shrines.length - 1; i >= 0; i--) {
        const shrine = st.shrines[i];
        if (!shrine.alive) continue;
        // Animate: bob orb, rotate rune
        const bobTime = clock.elapsedTime * 2 + shrine.x;
        if (shrine.orb) shrine.orb.position.y = 1.7 + Math.sin(bobTime) * 0.1;
        if (shrine.rune) {
          shrine.rune.rotation.y += dt * 2;
          shrine.rune.rotation.x += dt * 1.3;
        }
        // Check if auto-attack or power attack hits shrine
        const dx = st.playerX - shrine.x;
        const dz = st.playerZ - shrine.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const sdy = Math.abs(st.playerY - shrine.group.position.y);
        if (dist < st.attackRange * 1.5 && sdy < 2.5 && st.autoAttackTimer <= 0.05) {
          shrine.hp--;
          if (shrine.hp <= 0) {
            shrine.alive = false;
            // Random augment
            const aug = SHRINE_AUGMENTS[Math.floor(Math.random() * SHRINE_AUGMENTS.length)];
            aug.apply(st);
            st.augments[aug.id] = (st.augments[aug.id] || 0) + 1;
            // Floating text
            st.floatingTexts3d.push({
              text: aug.name,
              color: aug.color,
              x: shrine.x, y: terrainHeight(shrine.x, shrine.z) + 2.5, z: shrine.z,
              life: 2
            });
            scene.remove(shrine.group);
            shrine.group.traverse(c => { if (c.geometry) c.geometry.dispose(); if (c.material) c.material.dispose(); });
            st.shrines.splice(i, 1);
          }
        }
      }

      // === DIFFICULTY TOTEMS ===
      for (let i = st.totems.length - 1; i >= 0; i--) {
        const totem = st.totems[i];
        if (!totem.alive) continue;
        // Animate orb
        if (totem.orb) totem.orb.position.y = 2.0 + Math.sin(clock.elapsedTime * 3 + totem.x) * 0.1;
        // Check if player attacks totem
        const tdx = st.playerX - totem.x;
        const tdz = st.playerZ - totem.z;
        const tdist = Math.sqrt(tdx * tdx + tdz * tdz);
        const tdy = Math.abs(st.playerY - totem.y);
        if (tdist < st.attackRange * 1.5 && tdy < 2.5 && st.autoAttackTimer <= 0.05) {
          totem.hp--;
          if (totem.hp <= 0) {
            totem.alive = false;
            st.totemCount++;
            st.totemDiffMult *= TOTEM_EFFECT.zombieHpMult;
            st.totemSpeedMult *= TOTEM_EFFECT.zombieSpeedMult;
            st.totemSpawnMult *= TOTEM_EFFECT.spawnRateMult;
            st.totemXpMult *= TOTEM_EFFECT.xpBonusMult;
            st.totemScoreMult *= TOTEM_EFFECT.scoreBonusMult;
            st.floatingTexts3d.push({ text: 'NOT HARD ENOUGH!', color: '#ff2222', x: totem.x, y: totem.y + 3, z: totem.z, life: 3 });
            st.floatingTexts3d.push({ text: '+25% XP & SCORE', color: '#ffcc00', x: totem.x, y: totem.y + 2.5, z: totem.z, life: 3 });
            scene.remove(totem.group);
            totem.group.traverse(c => { if (c.geometry) c.geometry.dispose(); if (c.material) c.material.dispose(); });
            st.totems.splice(i, 1);
          }
        }
      }

      // === FLOATING TEXTS 3D ===
      for (let i = st.floatingTexts3d.length - 1; i >= 0; i--) {
        st.floatingTexts3d[i].y += dt * 1.5;
        st.floatingTexts3d[i].life -= dt;
        if (st.floatingTexts3d[i].life <= 0) {
          st.floatingTexts3d.splice(i, 1);
        }
      }

      // === AUGMENT REGEN ===
      if (st.augmentRegen > 0) {
        st.hp = Math.min(st.hp + st.augmentRegen * dt, st.maxHp);
      }

      // === SHIELD BRACELET COOLDOWN ===
      if (st.items.bracelet && !st.shieldBraceletReady) {
        st.shieldBraceletTimer -= dt;
        if (st.shieldBraceletTimer <= 0) {
          st.shieldBraceletReady = true;
          st.floatingTexts3d.push({ text: 'SHIELD READY!', color: '#4488ff', x: st.playerX, y: st.playerY + 2, z: st.playerZ, life: 1.5 });
        }
      }

      // Clean dead enemies
      st.enemies = st.enemies.filter(e => e.alive);

      // Player death
      if (st.hp <= 0) {
        st.hp = 0;
        st.gameOver = true;
        st.enterReleasedSinceGameOver = false;
        st.nameEntryActive = true;
        st.nameEntry = '';
      }
    }

    // === CAMERA ===
    const camTargetX = st.playerX;
    const camTargetZ = st.playerZ + 14;
    const camTargetY = st.playerY + 18;
    camera.position.x += (camTargetX - camera.position.x) * 0.05;
    camera.position.z += (camTargetZ - camera.position.z) * 0.05;
    camera.position.y += (camTargetY - camera.position.y) * 0.05;
    camera.lookAt(st.playerX, st.playerY, st.playerZ);

    // Update directional light to follow player
    dirLight.position.set(st.playerX + 10, 20, st.playerZ + 10);
    dirLight.target.position.set(st.playerX, 0, st.playerZ);

    renderer.render(scene, camera);
    drawHUD(hudCtx, st);
  }

  clock.start();
  tick();

  // === HUD ===
  function drawHUD(ctx, s) {
    const W = hudCanvas.width, H = hudCanvas.height;
    ctx.clearRect(0, 0, W, H);

    if (!s.gameOver && !s.upgradeMenu) {
      // HP bar
      ctx.fillStyle = '#222'; ctx.fillRect(20, 20, 200, 20);
      const hpRatio = Math.max(0, s.hp / s.maxHp);
      ctx.fillStyle = hpRatio > 0.5 ? '#44ff44' : hpRatio > 0.25 ? '#ffaa00' : '#ff4444';
      ctx.fillRect(20, 20, 200 * hpRatio, 20);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.strokeRect(20, 20, 200, 20);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 12px "Courier New"'; ctx.textAlign = 'left';
      ctx.fillText(`HP: ${Math.ceil(s.hp)}/${s.maxHp}`, 25, 35);

      // XP bar
      ctx.fillStyle = '#222'; ctx.fillRect(20, 46, 200, 14);
      const xpRatio = s.xp / s.xpToNext;
      ctx.fillStyle = '#44aaff';
      ctx.fillRect(20, 46, 200 * xpRatio, 14);
      ctx.strokeStyle = '#fff'; ctx.strokeRect(20, 46, 200, 14);
      ctx.fillStyle = '#fff'; ctx.font = '10px "Courier New"';
      ctx.fillText(`XP: ${s.xp}/${s.xpToNext}`, 25, 57);

      // Level + Animal
      ctx.fillStyle = '#ffcc00'; ctx.font = 'bold 16px "Courier New"';
      ctx.fillText(`LVL ${s.level}`, 20, 80);
      ctx.fillStyle = animalData.color; ctx.font = 'bold 12px "Courier New"';
      ctx.fillText(animalData.name, 20, 96);

      // Weapon slots (left side)
      let wy = 115;
      for (let wi = 0; wi < s.weapons.length; wi++) {
        const w = s.weapons[wi];
        const def = WEAPON_TYPES[w.typeId];
        const cdRatio = Math.max(0, w.cooldownTimer / getWeaponCooldown(w));
        // Background
        ctx.fillStyle = '#222'; ctx.fillRect(20, wy, 140, 18);
        // Cooldown fill
        ctx.fillStyle = def.color + '88'; ctx.fillRect(20, wy, 140 * (1 - cdRatio), 18);
        ctx.strokeStyle = '#555'; ctx.lineWidth = 1; ctx.strokeRect(20, wy, 140, 18);
        // Name
        ctx.fillStyle = def.color; ctx.font = 'bold 10px "Courier New"'; ctx.textAlign = 'left';
        ctx.fillText(`${def.name} Lv${w.level}`, 24, wy + 13);
        wy += 22;
      }
      // Empty slots
      for (let wi = s.weapons.length; wi < s.maxWeaponSlots; wi++) {
        ctx.fillStyle = '#1a1a1a'; ctx.fillRect(20, wy, 140, 18);
        ctx.strokeStyle = '#333'; ctx.lineWidth = 1; ctx.strokeRect(20, wy, 140, 18);
        ctx.fillStyle = '#444'; ctx.font = '10px "Courier New"'; ctx.textAlign = 'left';
        ctx.fillText('[EMPTY SLOT]', 24, wy + 13);
        wy += 22;
      }

      // Scrolls display (right side below timer)
      ctx.textAlign = 'right';
      let ty = 92;
      const scrollEntries = Object.entries(s.scrolls).filter(([, v]) => v > 0);
      if (scrollEntries.length > 0) {
        for (const [tid, count] of scrollEntries) {
          const def = SCROLL_TYPES[tid];
          ctx.fillStyle = def.color; ctx.font = '10px "Courier New"';
          ctx.fillText(`${def.name} x${count}`, W - 20, ty);
          ty += 13;
        }
      }
      ctx.textAlign = 'left';

      // Wave + Score (top right)
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ff6644'; ctx.font = 'bold 18px "Courier New"';
      ctx.fillText(`WAVE ${s.wave}`, W - 20, 35);
      ctx.fillStyle = '#ffcc00'; ctx.font = 'bold 16px "Courier New"';
      ctx.fillText(`SCORE: ${s.score}`, W - 20, 55);
      // Timer
      const mins = Math.floor(s.gameTime / 60);
      const secs = Math.floor(s.gameTime % 60);
      const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      ctx.fillStyle = '#ffffff'; ctx.font = 'bold 14px "Courier New"';
      ctx.fillText(timeStr, W - 20, 75);

      // Wave warning countdown
      if (s.waveWarning > 0) {
        ctx.fillStyle = 'rgba(255, 0, 0, 0.15)';
        ctx.fillRect(0, 0, W, H);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ff2222';
        ctx.font = 'bold 36px "Courier New"';
        ctx.fillText(`WAVE ${s.wave + 1} INCOMING`, W / 2, H / 2 - 40);
        ctx.fillStyle = '#ffcc00';
        ctx.font = 'bold 48px "Courier New"';
        ctx.fillText(Math.ceil(s.waveWarning).toString(), W / 2, H / 2 + 20);
        ctx.textAlign = 'left';
      }

      // Active powerup indicator
      if (s.activePowerup) {
        const pw = s.activePowerup;
        ctx.fillStyle = pw.def.color; ctx.font = 'bold 14px "Courier New"';
        ctx.textAlign = 'center';
        ctx.fillText(`${pw.def.name} (${Math.ceil(pw.timer)}s)`, W / 2, 25);
        // Timer bar
        const barW = 120, barH = 6;
        ctx.fillStyle = '#222'; ctx.fillRect(W / 2 - barW / 2, 30, barW, barH);
        ctx.fillStyle = pw.def.color;
        ctx.fillRect(W / 2 - barW / 2, 30, barW * (pw.timer / pw.def.duration), barH);
      }

      // Items (bottom-left)
      ctx.textAlign = 'left';
      let iy = H - 40;
      if (s.items.armor) {
        const armorDef = ITEMS_3D.find(i => i.id === s.items.armor);
        if (armorDef) {
          ctx.fillStyle = armorDef.color; ctx.font = '11px "Courier New"';
          ctx.fillText(`[${armorDef.name}]`, 20, iy);
          iy -= 16;
        }
      }
      if (s.items.glasses) {
        ctx.fillStyle = '#ffaa00'; ctx.font = '11px "Courier New"';
        ctx.fillText('[AVIATOR GLASSES]', 20, iy);
        iy -= 16;
      }
      if (s.items.boots) {
        const bootDef = ITEMS_3D.find(i => i.id === s.items.boots);
        if (bootDef) {
          ctx.fillStyle = bootDef.color; ctx.font = '11px "Courier New"';
          ctx.fillText(`[${bootDef.name}]`, 20, iy);
          iy -= 16;
        }
      }
      // New items display
      const boolSlots = ['ring', 'charm', 'vest', 'pendant', 'bracelet', 'gloves'];
      for (const slot of boolSlots) {
        if (s.items[slot]) {
          const itemDef = ITEMS_3D.find(i => i.slot === slot);
          if (itemDef) {
            ctx.fillStyle = itemDef.color; ctx.font = '11px "Courier New"';
            ctx.fillText(`[${itemDef.name}]`, 20, iy);
            iy -= 16;
          }
        }
      }
      // Shield bracelet cooldown indicator
      if (s.items.bracelet && !s.shieldBraceletReady) {
        ctx.fillStyle = '#4488ff'; ctx.font = '10px "Courier New"';
        ctx.fillText(`Shield: ${Math.ceil(s.shieldBraceletTimer)}s`, 20, iy);
        iy -= 16;
      }

      // Floating texts (shrine augments)
      for (const ft of s.floatingTexts3d) {
        const v = new THREE.Vector3(ft.x, ft.y, ft.z);
        v.project(camera);
        const sx = (v.x * 0.5 + 0.5) * W;
        const sy = (-v.y * 0.5 + 0.5) * H;
        if (v.z > 0 && v.z < 1) {
          ctx.globalAlpha = Math.min(1, ft.life);
          ctx.fillStyle = ft.color; ctx.font = 'bold 14px "Courier New"'; ctx.textAlign = 'center';
          ctx.fillText(ft.text, sx, sy);
          ctx.globalAlpha = 1;
        }
      }

      // Augment display (right side)
      const augKeys = Object.keys(s.augments);
      if (augKeys.length > 0 || s.totemCount > 0) {
        ctx.textAlign = 'right';
        let ay = 80;
        if (augKeys.length > 0) {
          ctx.fillStyle = '#88ffaa'; ctx.font = 'bold 11px "Courier New"';
          ctx.fillText('AUGMENTS', W - 20, ay);
          ay += 14;
          for (const aKey of augKeys) {
            const aug = SHRINE_AUGMENTS.find(a => a.id === aKey);
            if (aug) {
              ctx.fillStyle = aug.color; ctx.font = '10px "Courier New"';
              ctx.fillText(`${aug.name} x${s.augments[aKey]}`, W - 20, ay);
              ay += 13;
            }
          }
        }
        if (s.totemCount > 0) {
          ay += 4;
          ctx.fillStyle = '#ff2222'; ctx.font = 'bold 11px "Courier New"';
          ctx.fillText(`SKULLS: ${s.totemCount}`, W - 20, ay);
          ay += 14;
        }
        ctx.textAlign = 'left';
      }

      // Crate labels (glasses reveal)
      if (s.items.glasses) {
        for (const c of s.powerupCrates) {
          if (!c.alive || !c.showLabel) continue;
          const v = new THREE.Vector3(c.x, getGroundAt(c.x, c.z) + 1.5, c.z);
          v.project(camera);
          const sx = (v.x * 0.5 + 0.5) * W;
          const sy = (-v.y * 0.5 + 0.5) * H;
          if (v.z > 0 && v.z < 1) {
            ctx.fillStyle = c.ptype.color; ctx.font = 'bold 10px "Courier New"'; ctx.textAlign = 'center';
            ctx.fillText(c.ptype.name, sx, sy);
          }
        }
        // Item pickup labels (glasses reveal)
        for (const ip of s.itemPickups) {
          if (!ip.alive) continue;
          const v = new THREE.Vector3(ip.x, getGroundAt(ip.x, ip.z) + 1.8, ip.z);
          v.project(camera);
          const sx = (v.x * 0.5 + 0.5) * W;
          const sy = (-v.y * 0.5 + 0.5) * H;
          if (v.z > 0 && v.z < 1) {
            ctx.fillStyle = ip.itype.color; ctx.font = 'bold 10px "Courier New"'; ctx.textAlign = 'center';
            ctx.fillText(ip.itype.name, sx, sy);
          }
        }
      }

      // Controls hint
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.font = '12px "Courier New"';
      ctx.fillText('WASD: Move | SPACE: Jump | HOLD B: Power Attack | ESC: Pause', W / 2, H - 10);

      // Charge meter
      if (s.charging) {
        const barW = 100, barH = 10;
        const bx = W / 2 - barW / 2, by = H - 30;
        ctx.fillStyle = '#222'; ctx.fillRect(bx, by, barW, barH);
        const ratio = s.chargeTime / 2;
        const chargeColor = ratio < 0.5 ? '#ffcc00' : ratio < 0.8 ? '#ff8800' : '#ff2200';
        ctx.fillStyle = chargeColor; ctx.fillRect(bx, by, barW * ratio, barH);
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.strokeRect(bx, by, barW, barH);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 10px "Courier New"'; ctx.textAlign = 'center';
        ctx.fillText('CHARGING', W / 2, by - 3);
      }
    }

    // Pause menu
    if (s.pauseMenu && !s.gameOver && !s.upgradeMenu) {
      ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(0, 0, W, H);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff'; ctx.font = 'bold 40px "Courier New"';
      ctx.fillText('PAUSED', W / 2, H / 2 - 80);

      const pauseOpts = ['RESUME', 'RESTART', 'MAIN MENU'];
      const pauseColors = ['#44ff44', '#ffaa44', '#ff4444'];
      const cardW = 160, cardH = 80, gap = 25;
      const totalW = pauseOpts.length * cardW + (pauseOpts.length - 1) * gap;
      const startX = (W - totalW) / 2;
      const cardY = H / 2 - 20;

      for (let i = 0; i < pauseOpts.length; i++) {
        const cx = startX + i * (cardW + gap);
        const isSelected = i === s.selectedPauseOption;

        if (isSelected) {
          ctx.fillStyle = pauseColors[i];
          ctx.fillRect(cx - 3, cardY - 3, cardW + 6, cardH + 6);
        }
        ctx.fillStyle = isSelected ? '#1a1a2a' : '#111118';
        ctx.fillRect(cx, cardY, cardW, cardH);

        ctx.fillStyle = pauseColors[i]; ctx.font = 'bold 16px "Courier New"';
        ctx.fillText(pauseOpts[i], cx + cardW / 2, cardY + cardH / 2 + 6);

        if (isSelected) {
          const t = Date.now() * 0.003;
          const arrowBob = Math.sin(t * 3) * 4;
          ctx.fillStyle = '#ffcc00';
          ctx.beginPath();
          ctx.moveTo(cx + cardW / 2, cardY - 8 + arrowBob);
          ctx.lineTo(cx + cardW / 2 - 8, cardY - 18 + arrowBob);
          ctx.lineTo(cx + cardW / 2 + 8, cardY - 18 + arrowBob);
          ctx.closePath(); ctx.fill();
        }
      }

      ctx.fillStyle = '#666'; ctx.font = '14px "Courier New"';
      ctx.fillText('<  ARROW KEYS  >', W / 2, cardY + cardH + 25);
    }

    // Upgrade menu (weapons / upgrades / tomes)
    if (s.upgradeMenu && !s.gameOver) {
      ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, 0, W, H);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffcc00'; ctx.font = 'bold 32px "Courier New"';
      ctx.fillText('LEVEL UP!', W / 2, 100);
      ctx.fillStyle = '#ffffff'; ctx.font = '16px "Courier New"';
      ctx.fillText('Choose:', W / 2, 130);

      const cardW = 200, cardH = 200, gap = 30;
      const totalW = s.upgradeChoices.length * cardW + (s.upgradeChoices.length - 1) * gap;
      const startX = (W - totalW) / 2;
      const cardY = 160;

      for (let i = 0; i < s.upgradeChoices.length; i++) {
        const u = s.upgradeChoices[i];
        const cx = startX + i * (cardW + gap);
        const isSelected = i === s.selectedUpgrade;

        if (isSelected) {
          ctx.fillStyle = u.color;
          ctx.fillRect(cx - 3, cardY - 3, cardW + 6, cardH + 6);
        }
        ctx.fillStyle = isSelected ? '#1a1a2a' : '#111118';
        ctx.fillRect(cx, cardY, cardW, cardH);

        // Category badge
        const badgeColors = { 'NEW WEAPON': '#ff8844', 'UPGRADE': '#44aaff', 'SCROLL': '#aa44ff', 'HEAL': '#44ff44' };
        const badgeColor = badgeColors[u.category] || '#666';
        ctx.fillStyle = badgeColor; ctx.font = 'bold 10px "Courier New"';
        // Badge background
        const badgeW = ctx.measureText(u.category).width + 12;
        ctx.fillStyle = badgeColor + '44';
        ctx.fillRect(cx + cardW / 2 - badgeW / 2, cardY + 10, badgeW, 18);
        ctx.fillStyle = badgeColor; ctx.font = 'bold 10px "Courier New"';
        ctx.fillText(u.category, cx + cardW / 2, cardY + 23);

        // Name
        ctx.fillStyle = u.color; ctx.font = 'bold 16px "Courier New"';
        ctx.fillText(u.name, cx + cardW / 2, cardY + 65);

        // Description
        ctx.fillStyle = '#cccccc'; ctx.font = '12px "Courier New"';
        // Word wrap description
        const words = u.desc.split(' ');
        let line = '', lineY = cardY + 100;
        for (const word of words) {
          const test = line + word + ' ';
          if (ctx.measureText(test).width > cardW - 20) {
            ctx.fillText(line.trim(), cx + cardW / 2, lineY);
            line = word + ' ';
            lineY += 16;
          } else {
            line = test;
          }
        }
        if (line.trim()) ctx.fillText(line.trim(), cx + cardW / 2, lineY);

        if (isSelected) {
          const t = Date.now() * 0.003;
          const arrowBob = Math.sin(t * 3) * 4;
          ctx.fillStyle = '#ffcc00';
          ctx.beginPath();
          ctx.moveTo(cx + cardW / 2, cardY - 10 + arrowBob);
          ctx.lineTo(cx + cardW / 2 - 10, cardY - 22 + arrowBob);
          ctx.lineTo(cx + cardW / 2 + 10, cardY - 22 + arrowBob);
          ctx.closePath(); ctx.fill();
        }
      }

      ctx.fillStyle = '#666'; ctx.font = '14px "Courier New"';
      ctx.fillText('<  ARROW KEYS  >', W / 2, cardY + cardH + 25);
      if (Math.sin(Date.now() * 0.005) > 0) {
        ctx.fillStyle = '#ffcc00'; ctx.font = 'bold 18px "Courier New"';
        ctx.fillText('PRESS ENTER TO SELECT', W / 2, cardY + cardH + 55);
      }
      // Reroll indicator
      if (s.rerolls > 0) {
        ctx.fillStyle = '#88ccff'; ctx.font = 'bold 14px "Courier New"';
        ctx.fillText(`[R] REROLL (${s.rerolls} left)`, W / 2, cardY + cardH + 80);
      } else {
        ctx.fillStyle = '#444'; ctx.font = '12px "Courier New"';
        ctx.fillText('No rerolls remaining', W / 2, cardY + cardH + 80);
      }
    }

    // Game Over
    if (s.gameOver) {
      ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillRect(0, 0, W, H);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ff4444'; ctx.font = 'bold 48px "Courier New"';
      ctx.fillText('GAME OVER', W / 2, 80);
      ctx.fillStyle = '#ffcc00'; ctx.font = 'bold 24px "Courier New"';
      ctx.fillText(`SCORE: ${s.score}`, W / 2, 125);
      ctx.fillStyle = '#ffffff'; ctx.font = '16px "Courier New"';
      ctx.fillText(`${animalData.name} | Level ${s.level} | Wave ${s.wave - 1}`, W / 2, 155);
      // Time survived
      const goMins = Math.floor(s.gameTime / 60);
      const goSecs = Math.floor(s.gameTime % 60);
      ctx.fillStyle = '#88ccff'; ctx.font = '16px "Courier New"';
      ctx.fillText(`Time: ${String(goMins).padStart(2, '0')}:${String(goSecs).padStart(2, '0')}`, W / 2, 175);
      // Kill stats
      ctx.fillStyle = '#ff8844'; ctx.font = 'bold 14px "Courier New"';
      ctx.fillText(`Total Kills: ${s.totalKills}`, W / 2, 195);

      if (s.nameEntryActive) {
        // Name entry
        ctx.fillStyle = '#88ccff'; ctx.font = 'bold 18px "Courier New"';
        ctx.fillText('ENTER YOUR NAME:', W / 2, 240);
        ctx.fillStyle = '#222'; ctx.fillRect(W / 2 - 110, 250, 220, 36);
        ctx.strokeStyle = '#88ccff'; ctx.lineWidth = 2; ctx.strokeRect(W / 2 - 110, 250, 220, 36);
        ctx.fillStyle = '#ffffff'; ctx.font = 'bold 22px "Courier New"';
        const cursor = Math.sin(Date.now() * 0.005) > 0 ? '_' : '';
        ctx.fillText(s.nameEntry + cursor, W / 2, 275);
        ctx.fillStyle = '#666'; ctx.font = '12px "Courier New"';
        ctx.fillText('Type name, then ENTER to save', W / 2, 305);
      } else {
        // Leaderboard
        ctx.fillStyle = '#ffcc00'; ctx.font = 'bold 18px "Courier New"';
        ctx.fillText('LEADERBOARD', W / 2, 240);
        const lb = s.leaderboard3d;
        if (lb.length > 0) {
          ctx.font = '12px "Courier New"';
          ctx.fillStyle = '#888';
          ctx.fillText('RANK   NAME        SCORE   ANIMAL    LVL  WAVE  TIME', W / 2, 262);
          for (let i = 0; i < Math.min(lb.length, 10); i++) {
            const e = lb[i];
            const rank = String(i + 1).padStart(2);
            const name = (e.name || '???').padEnd(10);
            const score = String(e.score).padStart(6);
            const animal = (e.animal || '').padEnd(8).slice(0, 8);
            const lvl = String(e.level || 1).padStart(3);
            const wave = String(e.wave || 0).padStart(4);
            const lbTime = e.time ? `${String(Math.floor(e.time/60)).padStart(2,'0')}:${String(Math.floor(e.time%60)).padStart(2,'0')}` : '--:--';
            ctx.fillStyle = i === 0 ? '#ffcc00' : i < 3 ? '#ccaa44' : '#888888';
            ctx.fillText(`${rank}.  ${name}  ${score}   ${animal} ${lvl}  ${wave}  ${lbTime}`, W / 2, 280 + i * 18);
          }
        } else {
          ctx.fillStyle = '#666'; ctx.font = '14px "Courier New"';
          ctx.fillText('No scores yet', W / 2, 280);
        }

        if (Math.sin(Date.now() * 0.005) > 0) {
          ctx.fillStyle = '#ffcc00'; ctx.font = 'bold 18px "Courier New"';
          ctx.fillText('PRESS ENTER TO RETURN', W / 2, H - 40);
        }
      }
    }

    ctx.textAlign = 'left';
  }

  // === CLEANUP ===
  function cleanup() {
    st.running = false;
    if (animId) cancelAnimationFrame(animId);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);

    // Dispose fire particles
    fireParticles.forEach(fp => { scene.remove(fp.mesh); fp.mesh.geometry.dispose(); fp.mesh.material.dispose(); });
    // Dispose mirror clone groups
    st.mirrorCloneGroups.forEach(cd => { cd.group.traverse(c => { if (c.geometry) c.geometry.dispose(); if (c.material) c.material.dispose(); }); scene.remove(cd.group); });
    // Dispose bomb trail bombs
    st.bombTrailBombs.forEach(b => { scene.remove(b.mesh); b.mesh.geometry.dispose(); b.mesh.material.dispose(); });

    // Dispose weapon projectiles and effects
    st.weaponProjectiles.forEach(p => { scene.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose(); });
    st.weaponEffects.forEach(e => { scene.remove(e.mesh); e.mesh.geometry.dispose(); e.mesh.material.dispose(); });
    // Dispose charge glow
    if (st.chargeGlow) { scene.remove(st.chargeGlow); st.chargeGlow.geometry.dispose(); st.chargeGlow.material.dispose(); }

    // Dispose all Three.js objects
    scene.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
        else child.material.dispose();
      }
    });
    renderer.dispose();

    hudCtx.clearRect(0, 0, hudCanvas.width, hudCanvas.height);
    canvas3d.style.display = 'none';
    hudCanvas.style.display = 'none';
    window.removeEventListener('resize', onResize);

    // Restore container and 2D canvas for menu screens
    container.style.width = '960px';
    container.style.height = '540px';
    canvas3d.style.width = '960px';
    canvas3d.style.height = '540px';
    hudCanvas.style.width = '960px';
    hudCanvas.style.height = '540px';
    canvas2d.style.display = '';
  }
}
