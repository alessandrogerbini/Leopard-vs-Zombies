/**
 * @module game
 * @description Application entry point for Animals vs Zombies. Owns the main game loop,
 * state machine transitions, player input handling, physics, combat logic, and
 * rendering orchestration for the 2D Classic mode. Also acts as the launcher for
 * the 3D Survivor mode via launch3DGame.
 *
 * Dependencies: state.js, levels.js, utils.js, enemies.js, items.js, renderer.js, game3d.js
 * Exports: none (side-effect module -- bootstraps the game on import)
 *
 * Key concepts:
 * - Finite state machine drives all screen transitions (see diagram below).
 * - requestAnimationFrame loop calls update() then draw() every frame.
 * - Player physics use simple Euler integration with gravity and knockback.
 * - Powerups are ammo-counted (clawsOfSteel, jumpyBoots, bananaCannon, litterBox, superFangs)
 *   or frame-timed (raceCar, wings).
 * - 3 lives system with per-level respawn and game-over on depletion.
 * - Leaderboard is stored per-difficulty in localStorage (top 10).
 */

/*
 * ============================================================
 *  STATE MACHINE TRANSITION DIAGRAM
 * ============================================================
 *
 *   title ──[Enter]──> modeSelect ──[Enter, mode=0]──> difficulty ──[Enter]──> select
 *     ^                   |  ^                           |  ^                   |
 *     |                  [Esc]                          [Esc]                  [Esc]
 *     |                   v  |                           v  |                   |
 *     |                 title                         modeSelect           difficulty (2D)
 *     |                                                                   modeSelect (3D)
 *     |
 *     |   modeSelect ──[Enter, mode=1]──> select (skip difficulty)
 *     |
 *     |          ┌──── select ──[Enter on mode=0 (2D)]──────────────────┐
 *     |          |                                                      |
 *     |          v
 *     |       playing ──[all zombies dead, level<3]──> portal ──[enter portal]──> levelComplete
 *     |          |                                                                    |
 *     |          |  ┌───────[timer expires, level<3]──────────────────────────────────┘
 *     |          |  v                                                  [timer expires, level=3]
 *     |       playing ──[all zombies dead, level=3]──> bossIntro ──> bossFight         |
 *     |          |                                                      |              v
 *     |         [Esc]──> paused ──[Esc]──> (previous state)             |          gameWin
 *     |          |                                                      |            |
 *     |          |  ┌──[boss killed, diamond collected]─────────────────┘            |
 *     |          |  v                                                                |
 *     |       levelComplete ──[timer, level=3]──> gameWin ──[Enter]──> title          |
 *     |          |                                                                    |
 *     |         [hp<=0]                                                               |
 *     |          v                                                                    |
 *     |       dying ──[timer, lives>0]──> playing (re-init level)                     |
 *     |          |                                                                    |
 *     |         [timer, lives=0]                                                      |
 *     |          v                                                                    |
 *     |       gameOver ──[Enter]──> title                                             |
 *     |                                                                               |
 *     └───────────────────────────────────────────────────────────────────────────────┘
 *
 *   select ──[Enter on mode=1 (3D)]──> (stops 2D loop, launches 3D) ──[onReturn]──> title
 *
 * ============================================================
 */

// Main game loop, update logic, initialization
import { GRAVITY, GROUND_Y, keys, state, player, camera, POWERUP_DURATION, POWERUP_AMMO, ANIMAL_TYPES, DIFFICULTY_SETTINGS } from './state.js';
import { getLevelData } from './levels.js';
import { rectCollide, getAttackBox, spawnParticles, spawnFloatingText, getPlayerDamage, getPlayerCooldown, getPlayerJumpForce, addScore } from './utils.js';
import { spawnZombies, spawnBoss, updateZombieAI, updateBossAI, updateAllyAI, spawnAlly } from './enemies.js';
import { spawnHealthPickups, spawnPowerupCrates, spawnArmorCrates, spawnGlassesCrates, spawnSneakersCrates, spawnCleatsCrates, spawnHorseCrates, updateHealthPickups, updateDiamond, updatePortal, updateArmorPickups, updateGlassesPickups, updateSneakersPickups, updateCleatsPickups, updateHorsePickups } from './items.js';
import { initRenderer, getCtx, drawLeopard, drawZombie, drawBoss, drawBackground, drawHealthPickups, drawPowerupCrates, drawArmorCrates, drawArmorPickups, drawGlassesCrates, drawGlassesPickups, drawSneakersCrates, drawSneakersPickups, drawCleatsCrates, drawCleatsPickups, drawHorseCrates, drawHorsePickups, drawPortal, drawDiamond, drawParticles, drawFloatingTexts, drawHUD, drawBossIntro, drawDying, drawTitleScreen, drawLevelComplete, drawGameWin, drawGameOver, drawProjectiles, drawPaused, drawSelectScreen, drawDifficultyScreen, drawModeSelectScreen, drawAlly } from './renderer.js';
import { launch3DGame } from './game3d.js';

/** @type {HTMLCanvasElement} The main game canvas element. */
const canvas = document.getElementById('game');
initRenderer(canvas);

// --- Input System ---
// Two keydown listeners are registered:
// 1. A generic handler that sets keys[code] for movement/action polling each frame.
// 2. A name-entry handler that captures printable characters for the leaderboard.
// keyup clears the key flags.
// NOTE: preventDefault() is called on both keydown and keyup to stop browser
// scrolling and other default behavior while the game canvas is focused.
window.addEventListener('keydown', e => { keys[e.code] = true; e.preventDefault(); });
window.addEventListener('keyup', e => { keys[e.code] = false; e.preventDefault(); });

// Name entry input (captures actual key characters for text entry).
// Active only when state.nameEntryActive is true (game-over / game-win screens).
// Backspace deletes last character; Enter submits if at least 1 character typed;
// printable single-char keys are appended (max 10 characters, uppercased).
window.addEventListener('keydown', e => {
  if (state.nameEntryActive) {
    if (e.key === 'Backspace') {
      state.nameEntry = state.nameEntry.slice(0, -1);
    } else if (e.key === 'Enter' && state.nameEntry.length > 0) {
      saveScore();
      state.nameEntryActive = false;
    } else if (e.key.length === 1 && state.nameEntry.length < 10) {
      state.nameEntry += e.key.toUpperCase();
    }
  }
});

// --- Leaderboard Persistence ---
// Scores are stored per-difficulty in localStorage under keys like
// "avz-leaderboard-normal". Each entry includes name, score, animal, level,
// difficulty, and date. Lists are sorted descending by score, capped at 10.

/**
 * Load the leaderboard array for a given difficulty from localStorage.
 *
 * @param {string} difficulty - Difficulty key (e.g. 'easy', 'normal', 'hard').
 * @returns {Array<{name:string, score:number, animal:string, level:number, difficulty:string, date:number}>}
 *   Parsed leaderboard entries, or an empty array if none exist.
 */
function loadLeaderboard(difficulty) {
  return JSON.parse(localStorage.getItem(`avz-leaderboard-${difficulty}`) || '[]');
}
state.leaderboard = loadLeaderboard(state.difficulty);

/**
 * Save the current player's score to the leaderboard for the active difficulty.
 * Pushes a new entry with the player's name, score, animal, current level,
 * difficulty, and timestamp. The list is then sorted descending by score and
 * truncated to the top 10 entries before persisting to localStorage.
 */
function saveScore() {
  const diff = state.difficulty;
  const lb = loadLeaderboard(diff);
  lb.push({
    name: state.nameEntry,
    score: player.score,
    animal: player.animal,
    level: state.currentLevel,
    difficulty: diff,
    date: Date.now()
  });
  lb.sort((a, b) => b.score - a.score);
  state.leaderboard = lb.slice(0, 10);
  localStorage.setItem(`avz-leaderboard-${diff}`, JSON.stringify(state.leaderboard));
}

/**
 * Initialize (or re-initialize) a level for 2D Classic mode.
 *
 * Resets the player's position, velocity, HP, attack state, powerups, and
 * camera. Clears transient state (particles, floating texts, diamond, boss,
 * portal, projectiles). Spawns zombies, health pickups, and all crate types
 * for the new level. Re-positions or respawns existing allies near the player.
 * Finally transitions the game state to 'playing'.
 *
 * @param {number} level - Level number to load (1, 2, or 3).
 * @see getLevelData
 * @see spawnZombies
 */
function initLevel(level) {
  state.currentLevel = level;
  state.levelData = getLevelData(level);
  player.x = 80;
  player.y = GROUND_Y;
  player.vx = 0;
  player.vy = 0;
  player.knockbackX = 0;
  player.hp = player.maxHp;
  player.attacking = false;
  player.attackTimer = 0;
  player.attackCooldown = 0;
  player.invincible = 0;
  player.facing = 1;
  player.combo = 0;
  player.powerups.jumpyBoots = 0;
  player.powerups.clawsOfSteel = 0;
  player.powerups.superFangs = 0;
  player.powerups.raceCar = 0;
  player.powerups.bananaCannon = 0;
  player.powerups.litterBox = 0;
  player.powerups.wings = 0;
  camera.x = 0;
  state.particles = [];
  state.floatingTexts = [];
  state.diamond = null;
  state.boss = null;
  state.bossIntroTimer = 0;
  state.portal = null;
  state.projectiles = [];

  spawnZombies();
  spawnHealthPickups();
  spawnPowerupCrates();
  spawnArmorCrates();
  spawnGlassesCrates();
  spawnSneakersCrates();
  spawnCleatsCrates();
  spawnHorseCrates();

  // Re-spawn horse ally if player has horse item and no horse ally exists
  if (player.items.horse && !state.allies.some(a => a.type === 'horse')) {
    spawnAlly('horse', player.x + 60, GROUND_Y);
  }
  // Reset existing allies' positions near player on level start
  state.allies.forEach(a => {
    if (a.alive) {
      a.x = player.x + (Math.random() > 0.5 ? 40 : -40);
      a.y = GROUND_Y;
      a.vx = 0;
      a.vy = 0;
    } else if (a.lives > 0) {
      // Respawn dead allies with lives remaining
      a.alive = true;
      a.hp = a.maxHp;
      a.x = player.x + (Math.random() > 0.5 ? 40 : -40);
      a.y = GROUND_Y;
      a.vx = 0;
      a.vy = 0;
      a.invincibleTimer = 60;
    }
  });

  state.gameState = 'playing';
}

/**
 * Main per-frame update tick for 2D Classic mode.
 *
 * Runs the finite state machine, processes player physics and input, handles
 * combat (melee attacks, projectile updates, powerup damage), ticks AI for
 * zombies/boss/allies, checks level completion conditions, manages the
 * death/lives system, updates the camera, and decays particles and effects.
 *
 * The function is structured in clearly delineated subsystem sections:
 * 1. Pause toggle
 * 2. State machine transitions (title, modeSelect, difficulty, select,
 *    levelComplete, bossIntro, gameWin/gameOver, dying)
 * 3. Powerup frame timers (raceCar, wings countdown)
 * 4. Player movement (ground, air, flight modes)
 * 5. Player attack logic (banana cannon, litter box, standard melee)
 * 6. Knockback decay
 * 7. Player physics (gravity, position integration, ground/platform collision)
 * 8. Animation frame cycling
 * 9. Attack hit detection (melee vs zombies, boss, crates of all types)
 * 10. Jet fire / race car contact damage (powerup-specific damage zones)
 * 11. AI updates (zombies, boss, allies, pickups)
 * 12. Projectile updates and collision (banana, litter, boss skulls/AOE/mortars)
 * 13. Level completion / boss spawn triggers
 * 14. Death / lives system
 * 15. Camera follow (smooth lerp toward player)
 * 16. Particle and floating text decay, screen shake/flash cooldown
 */
function update() {
  // ── Guard: do absolutely nothing while 3D mode is active ─────────
  // The 2D game loop may still be running (RAF race condition) when 3D
  // mode launches. This guard prevents ANY 2D state transitions or key
  // processing until the 3D mode returns and resets gameState.
  if (state.gameState === '3dMode') return;

  // ── Section 1: Pause Toggle ──────────────────────────────────────
  if (keys['Escape'] && !state._escHeld) {
    state._escHeld = true;
    if (state.gameState === 'paused') {
      state.gameState = state._prevState;
    } else if (state.gameState === 'playing' || state.gameState === 'bossFight') {
      state._prevState = state.gameState;
      state.gameState = 'paused';
    }
  }
  if (!keys['Escape']) state._escHeld = false;
  if (state.gameState === 'paused') return;

  // ── Section 2: State Machine Transitions ──────────────────────────
  // Each state handles its own input and either returns early or falls through
  // to the gameplay subsections below.
  if (state.gameState === 'title') {
    // Enter goes to mode select
    if (keys['Enter'] && !state._enterHeld) { state._enterHeld = true; state.selectedMode = 1; state.gameState = 'modeSelect'; }
    if (!keys['Enter']) state._enterHeld = false;
    return;
  }

  // Mode select: choose between 2D Classic and 3D Survivor.
  if (state.gameState === 'modeSelect') {
    if (keys['ArrowLeft'] && !state._selectLeftHeld) {
      state._selectLeftHeld = true;
      state.selectedMode = (state.selectedMode - 1 + 2) % 2;
    }
    if (!keys['ArrowLeft']) state._selectLeftHeld = false;
    if (keys['ArrowRight'] && !state._selectRightHeld) {
      state._selectRightHeld = true;
      state.selectedMode = (state.selectedMode + 1) % 2;
    }
    if (!keys['ArrowRight']) state._selectRightHeld = false;
    if (keys['Enter'] && !state._enterHeld) {
      state._enterHeld = true;
      if (state.selectedMode === 0) {
        // 2D Classic: go through difficulty select
        state.selectedDifficulty = 0;
        state.gameState = 'difficulty';
      } else {
        // BD-191: 3D Survivor skips difficulty — survivor roguelike handles its own ramp
        state.difficulty = 'easy';
        state.leaderboard = loadLeaderboard(state.difficulty);
        state.selectedAnimal = 0;
        state.gameState = 'select';
      }
    }
    if (!keys['Enter']) state._enterHeld = false;
    if (keys['Escape'] && !state._escHeld) {
      state._escHeld = true;
      state.gameState = 'title';
    }
    return;
  }

  if (state.gameState === 'difficulty') {
    const diffKeys = Object.keys(DIFFICULTY_SETTINGS);
    if (keys['ArrowLeft'] && !state._selectLeftHeld) {
      state._selectLeftHeld = true;
      state.selectedDifficulty = (state.selectedDifficulty - 1 + diffKeys.length) % diffKeys.length;
    }
    if (!keys['ArrowLeft']) state._selectLeftHeld = false;
    if (keys['ArrowRight'] && !state._selectRightHeld) {
      state._selectRightHeld = true;
      state.selectedDifficulty = (state.selectedDifficulty + 1) % diffKeys.length;
    }
    if (!keys['ArrowRight']) state._selectRightHeld = false;
    if (keys['Enter'] && !state._enterHeld) {
      state._enterHeld = true;
      state.difficulty = diffKeys[state.selectedDifficulty];
      state.leaderboard = loadLeaderboard(state.difficulty);
      state.selectedAnimal = 0;
      state.gameState = 'select';
    }
    if (!keys['Enter']) state._enterHeld = false;
    if (keys['Escape'] && !state._escHeld) {
      state._escHeld = true;
      state.gameState = 'modeSelect';
    }
    return;
  }

  if (state.gameState === 'select') {
    if (keys['ArrowLeft'] && !state._selectLeftHeld) {
      state._selectLeftHeld = true;
      state.selectedAnimal = (state.selectedAnimal - 1 + ANIMAL_TYPES.length) % ANIMAL_TYPES.length;
    }
    if (!keys['ArrowLeft']) state._selectLeftHeld = false;
    if (keys['ArrowRight'] && !state._selectRightHeld) {
      state._selectRightHeld = true;
      state.selectedAnimal = (state.selectedAnimal + 1) % ANIMAL_TYPES.length;
    }
    if (!keys['ArrowRight']) state._selectRightHeld = false;
    if (keys['Enter'] && !state._enterHeld) {
      state._enterHeld = true;
      const animal = ANIMAL_TYPES[state.selectedAnimal];
      if (state.selectedMode === 1) {
        // BD-179: Apply selected difficulty settings to 3D mode
        const diff = DIFFICULTY_SETTINGS[state.difficulty];
        // ── 3D Mode Launch Integration ──────────────────────────────
        // When the player selects 3D Survivor mode:
        // 1. The 2D RAF loop is stopped via stopGameLoop().
        // 2. The 2D canvas is hidden.
        // 3. launch3DGame() is called with the chosen animal, difficulty
        //    settings, and an onReturn callback.
        // 4. The onReturn callback re-shows the 2D canvas, clears ghost
        //    key inputs, resets to the title state, and restarts the 2D loop.
        state.gameState = '3dMode'; // prevent 2D update from processing any keys
        stopGameLoop();
        canvas.style.display = 'none';
        launch3DGame({
          animal,
          difficulty: diff,
          difficultyKey: state.difficulty,
          onReturn: () => {
            canvas.style.display = '';
            // Clear all 2D keys to prevent ghost inputs
            Object.keys(keys).forEach(k => { keys[k] = false; });
            state.gameState = 'title';
            // Reset stale 2D game state
            state.particles = [];
            state.floatingTexts = [];
            state.zombies = [];
            state.healthPickups = [];
            state.powerupCrates = [];
            state.projectiles = [];
            state.allies = [];
            startGameLoop();
          }
        });
      } else {
        // 2D Classic mode
        const diff = DIFFICULTY_SETTINGS[state.difficulty];
        player.animal = animal.id;
        player.baseSpeed = 2.8125 * animal.speed;
        player.speed = player.baseSpeed;
        player.baseDamage = 15 * animal.damage;
        player.maxHp = Math.floor(animal.hp * diff.hpMult);
        player.hp = player.maxHp;
        player.lives = 3;
        player.items.armor = null;
        player.items.glasses = false;
        player.items.sneakers = true;
        player.items.cowboyBoots = false;
        player.items.soccerCleats = false;
        player.items.horse = false;
        state.allies = [];
        initLevel(1);
      }
    }
    if (!keys['Enter']) state._enterHeld = false;
    if (keys['Escape'] && !state._escHeld) {
      state._escHeld = true;
      // BD-191: 3D goes back to mode select (no difficulty screen)
      state.gameState = state.selectedMode === 0 ? 'difficulty' : 'modeSelect';
    }
    return;
  }

  if (state.gameState === 'levelComplete') {
    state.transitionTimer--;
    // Spawn random animal ally once when level complete starts (at a specific timer value)
    if (state.transitionTimer === 80) {
      const allyTypes = ['leopard', 'redPanda', 'lion', 'gator'].filter(t => t !== player.animal);
      const randomType = allyTypes[Math.floor(Math.random() * allyTypes.length)];
      spawnAlly(randomType, player.x + 80, GROUND_Y, false);
      spawnParticles(player.x + 80, GROUND_Y, '#ffcc00', 20, 10);
      spawnFloatingText(player.x + 80, GROUND_Y - 40, `${randomType.toUpperCase()} ALLY JOINS!`, '#ffcc00');
      state.screenFlash = 8;
    }
    if (state.transitionTimer <= 0) {
      if (state.currentLevel < 3) initLevel(state.currentLevel + 1);
      else { state.gameState = 'gameWin'; state.nameEntryActive = true; state.nameEntry = ''; }
    }
    return;
  }

  if (state.gameState === 'bossIntro') {
    state.bossIntroTimer--;
    if (state.bossIntroTimer <= 0) state.gameState = 'bossFight';
    return;
  }

  if (state.gameState === 'gameWin' || state.gameState === 'gameOver') {
    if (!state.nameEntryActive && keys['Enter']) { state.gameState = 'title'; player.score = 0; player.lives = 3; player.items.armor = null; player.items.glasses = false; player.items.sneakers = true; player.items.cowboyBoots = false; player.items.soccerCleats = false; player.items.horse = false; state.allies = []; }
    return;
  }

  if (state.gameState === 'dying') {
    state.deathTimer--;
    if (state.deathTimer <= 0) {
      if (player.lives > 0) {
        initLevel(state.currentLevel);
        spawnFloatingText(player.x, player.y - 40, `${player.lives} LIVES LEFT`, '#ffcc00');
      } else {
        state.gameState = 'gameOver';
        state.nameEntryActive = true;
        state.nameEntry = '';
      }
    }
    return;
  }

  const ld = state.levelData;
  const inBossFight = state.gameState === 'bossFight';

  // ── Section 3: Powerup Frame Timers ──────────────────────────────
  // raceCar and wings are frame-counted powerups that decrement each tick.
  // Ammo-based powerups (jumpyBoots, clawsOfSteel, etc.) decrement on use instead.
  if (player.powerups.raceCar > 0) player.powerups.raceCar--;
  if (player.powerups.wings > 0) player.powerups.wings--;

  // ── Section 4: Player Movement ────────────────────────────────────
  // Three movement modes: flight (wings powerup), ground, and airborne.
  // Soccer cleats grant a 15% speed bonus. Flight uses smooth deceleration
  // for a floaty feel. Air movement uses partial acceleration (0.55 lerp).
  // Apply soccer cleats speed bonus
  const moveSpeed = player.items.soccerCleats ? player.speed * 1.15 : player.speed;
  if (player.powerups.wings > 0) {
    // Flight mode: smooth movement in all directions
    const flySpeed = moveSpeed * 1.1;
    let targetVx = 0;
    let targetVy = 0;
    if (keys['ArrowLeft']) { targetVx = -flySpeed; player.facing = -1; }
    if (keys['ArrowRight']) { targetVx = flySpeed; player.facing = 1; }
    if (keys['ArrowUp']) { targetVy = -flySpeed; }
    if (keys['ArrowDown']) { targetVy = flySpeed; }
    // Smooth deceleration for floaty flight feel
    player.vx += (targetVx - player.vx) * 0.15;
    player.vy += (targetVy - player.vy) * 0.15;
  } else if (player.onGround) {
    player.vx = 0;
    if (keys['ArrowLeft']) { player.vx = -moveSpeed; player.facing = -1; }
    if (keys['ArrowRight']) { player.vx = moveSpeed; player.facing = 1; }
  } else {
    let targetVx = 0;
    if (keys['ArrowLeft']) { targetVx = -moveSpeed; player.facing = -1; }
    if (keys['ArrowRight']) { targetVx = moveSpeed; player.facing = 1; }
    player.vx += (targetVx - player.vx) * 0.55;
  }
  if (player.powerups.wings <= 0 && keys['ArrowUp'] && player.onGround) {
    player.vy = getPlayerJumpForce();
    player.onGround = false;
    if (player.powerups.jumpyBoots > 0) player.powerups.jumpyBoots--;
  }

  // ── Section 5: Player Attack Logic ────────────────────────────────
  // Three attack modes depending on active powerup:
  // - Banana cannon: fires a boomerang banana projectile (one at a time)
  // - Litter box: fires 5 litter chunks in a spread behind the player
  // - Standard melee: 12-frame attack animation with fire breath visual
  const cooldown = getPlayerCooldown();
  if (keys['Space'] && player.attackCooldown <= 0 && !player.attacking) {
    if (player.powerups.bananaCannon > 0) {
      // Banana cannon: fire a boomerang banana (only if none already in flight)
      const bananaInFlight = state.projectiles.some(p => p.type === 'banana');
      if (!bananaInFlight) {
        state.projectiles.push({
          type: 'banana', x: player.x + player.w/2, y: player.y + player.h/2,
          vx: player.facing * 8, vy: 0, damage: 20, life: 120,
          maxDist: 280, distTraveled: 0, returning: false,
          hitEnemies: new Set(), originX: player.x + player.w/2
        });
        player.attackCooldown = cooldown;
        player.powerups.bananaCannon--;
      }
    } else if (player.powerups.litterBox > 0) {
      // Litter box: fire 5 litter projectiles behind the player
      for (let i = 0; i < 5; i++) {
        state.projectiles.push({
          type: 'litter', x: player.x + player.w/2, y: player.y + player.h/2,
          vx: -player.facing * (4 + Math.random() * 4), vy: -2 + Math.random() * 4,
          damage: 25, life: 30, hitEnemies: new Set()
        });
      }
      player.attackCooldown = cooldown;
      player.powerups.litterBox--;
    } else {
      // Standard melee attack
      player.attacking = true;
      player.attackTimer = 12;
      player.attackCooldown = cooldown;
      if (player.powerups.clawsOfSteel > 0) player.powerups.clawsOfSteel--;
      if (player.powerups.superFangs > 0) player.powerups.superFangs--;
    }
  }
  if (player.attacking) { player.attackTimer--; if (player.attackTimer <= 0) player.attacking = false; }
  if (player.attackCooldown > 0) player.attackCooldown--;
  if (player.invincible > 0) player.invincible--;
  if (player.comboTimer > 0) { player.comboTimer--; if (player.comboTimer <= 0) player.combo = 0; }

  // ── Section 6: Knockback Decay ────────────────────────────────────
  player.knockbackX *= 0.8;
  if (Math.abs(player.knockbackX) < 0.3) player.knockbackX = 0;

  // ── Section 7: Player Physics ─────────────────────────────────────
  // Euler integration: apply gravity (halved near apex if sneakers equipped
  // for extra hangtime), integrate position, clamp to ground/ceiling, and
  // resolve platform collisions (one-way from above).
  if (player.powerups.wings <= 0) {
    let grav = GRAVITY;
    if (player.items.sneakers && !player.onGround && Math.abs(player.vy) < 4) {
      grav *= 0.5; // 50% less gravity near apex = more hangtime
    }
    player.vy += grav;
  }
  player.x += player.vx + player.knockbackX;
  player.y += player.vy;

  // Clamp vertical bounds (don't fly above y=0 or below ground)
  if (player.powerups.wings > 0) {
    if (player.y < 0) { player.y = 0; player.vy = 0; }
    if (player.y >= GROUND_Y) { player.y = GROUND_Y; player.vy = 0; }
    player.onGround = false;
  } else {
    if (player.y >= GROUND_Y) { player.y = GROUND_Y; player.vy = 0; player.onGround = true; }
  }

  player.onGround = player.powerups.wings > 0 ? false : player.y >= GROUND_Y;
  if (player.powerups.wings <= 0) {
    ld.platforms.forEach(p => {
      if (player.vy >= 0 &&
          player.x + player.w > p.x && player.x < p.x + p.w &&
          player.y + player.h >= p.y && player.y + player.h <= p.y + p.h + 10) {
        player.y = p.y - player.h + 5;
        player.vy = 0;
        player.onGround = true;
      }
    });
  }

  player.x = Math.max(0, Math.min(player.x, ld.width - player.w));

  // ── Section 8: Animation Frame Cycling ────────────────────────────
  player.frameTimer++;
  if (Math.abs(player.vx) > 0) {
    if (player.frameTimer > 6) { player.frame = (player.frame + 1) % 4; player.frameTimer = 0; }
  } else {
    if (player.frameTimer > 12) { player.frame = (player.frame + 1) % 2; player.frameTimer = 0; }
  }

  // ── Section 9: Melee Attack Hit Detection ─────────────────────────
  // Fires on the 2nd frame of the 12-frame attack animation (timer === 10).
  // Checks the attack hitbox against all zombies, the boss, and every crate
  // type (powerup, armor, glasses, sneakers, cleats, horse). Crates have HP
  // and break to spawn their contents; powerup crates have a 20% trap chance.
  if (player.attacking && player.attackTimer === 10) {
    const atkBox = getAttackBox();
    const dmg = getPlayerDamage();

    state.zombies.forEach(z => {
      if (!z.alive) return;
      if (rectCollide(atkBox, z)) {
        z.hp -= dmg; z.hurt = 8; z.vx = player.facing * 6; z.vy = -4;
        player.combo++; player.comboTimer = 90;
        spawnParticles(z.x + z.w/2, z.y + z.h/2, '#ff4444', 8, 6);
        spawnFloatingText(z.x + z.w/2, z.y - 10, `-${dmg}`, '#ff6666');
        state.screenShake = 5;
        if (z.hp <= 0) {
          z.alive = false;
          addScore(z.type === 'big' ? 200 : 100);
          spawnParticles(z.x + z.w/2, z.y + z.h/2, '#44ff44', 15, 10);
          spawnFloatingText(z.x + z.w/2, z.y - 30, z.type === 'big' ? '+200' : '+100', '#ffff44');
        }
      }
    });

    if (state.boss && state.boss.alive) {
      const boss = state.boss;
      if (rectCollide(atkBox, boss)) {
        boss.hp -= dmg; boss.hurt = 8; boss.vx = player.facing * 3;
        player.combo++; player.comboTimer = 90;
        spawnParticles(boss.x + boss.w/2, boss.y + boss.h/2, '#ff4444', 12, 8);
        spawnFloatingText(boss.x + boss.w/2, boss.y - 10, `-${dmg}`, '#ff6666');
        state.screenShake = 6;
        if (boss.hp <= 0) {
          boss.alive = false; addScore(1000);
          state.screenShake = 20; state.screenFlash = 15;
          spawnParticles(boss.x + boss.w/2, boss.y + boss.h/2, '#ff8800', 40, 15);
          spawnParticles(boss.x + boss.w/2, boss.y + boss.h/2, '#ffff00', 30, 12);
          spawnFloatingText(boss.x + boss.w/2, boss.y - 40, 'BOSS DEFEATED! +1000', '#ffff44');
          state.diamond = { x: ld.width - 150, y: GROUND_Y - 30, collected: false, glow: 0 };
          spawnFloatingText(ld.width - 150, GROUND_Y - 60, 'THE WILD DIAMOND APPEARS!', '#00ffff');
        }
      }
    }

    state.powerupCrates.forEach(c => {
      if (c.broken) return;
      if (rectCollide(atkBox, c)) {
        c.hp--; c.shakeTimer = 6;
        spawnParticles(c.x + c.w/2, c.y + c.h/2, '#aa8844', 4, 4);
        if (c.hp <= 0) {
          c.broken = true;
          const ptype = c.powerupType;
          player.powerups[ptype.id] = POWERUP_AMMO[ptype.id];
          spawnParticles(c.x + c.w/2, c.y + c.h/2, ptype.color, 20, 10);
          spawnFloatingText(c.x + c.w/2, c.y - 20, ptype.name, ptype.color);
          spawnFloatingText(c.x + c.w/2, c.y - 5, ptype.desc, '#ffffff');
          state.screenFlash = 5; addScore(150);

          // Trap crate: ~20% chance zombies burst out
          if (Math.random() < 0.2) {
            const trapCount = 1 + Math.floor(Math.random() * 2); // 1-2 zombies
            const ld2 = state.levelData;
            for (let ti = 0; ti < trapCount; ti++) {
              state.zombies.push({
                x: c.x + (ti === 0 ? -20 : 20), y: c.y, w: 36, h: 48,
                vx: (ti === 0 ? -3 : 3), vy: -5,
                hp: ld2.zombieHp, maxHp: ld2.zombieHp,
                speed: ld2.zombieSpeed * (0.8 + Math.random() * 0.4),
                onGround: false,
                facing: ti === 0 ? -1 : 1,
                frame: 0, frameTimer: 0,
                attackTimer: 0,
                hurt: 0,
                type: Math.random() < 0.3 ? 'big' : 'normal',
                alive: true
              });
              // Upgrade big zombies like spawnZombies does
              const nz = state.zombies[state.zombies.length - 1];
              if (nz.type === 'big') {
                nz.w = 44; nz.h = 56;
                nz.hp *= 1.8; nz.maxHp = nz.hp;
                nz.speed *= 0.7;
              }
            }
            // Dramatic visuals: bigger particle burst in red/green
            spawnParticles(c.x + c.w/2, c.y + c.h/2, '#ff0000', 25, 14);
            spawnParticles(c.x + c.w/2, c.y + c.h/2, '#4a6a4a', 15, 12);
            spawnFloatingText(c.x + c.w/2, c.y - 40, 'AMBUSH!', '#ff2222');
            state.screenShake = 12;
            state.screenFlash = 10;
          }
        }
      }
    });

    // Armor crate hits
    state.armorCrates.forEach(c => {
      if (c.broken) return;
      if (rectCollide(atkBox, c)) {
        c.hp--; c.shakeTimer = 6;
        spawnParticles(c.x + c.w/2, c.y + c.h/2, '#8888aa', 4, 4);
        if (c.hp <= 0) {
          c.broken = true;
          spawnParticles(c.x + c.w/2, c.y + c.h/2, c.armorType.color, 20, 10);
          spawnFloatingText(c.x + c.w/2, c.y - 20, c.armorType.name, c.armorType.color);
          state.screenFlash = 5;
          // Spawn floating armor pickup that rises above the crate
          state.armorPickups.push({
            x: c.x + c.w/2,
            y: c.y,
            armorType: c.armorType,
            equipped: false,
            bobTimer: 0,
            glowTimer: 0
          });
        }
      }
    });

    // Glasses crate hits
    state.glassesCrates.forEach(c => {
      if (c.broken) return;
      if (rectCollide(atkBox, c)) {
        c.hp--; c.shakeTimer = 6;
        spawnParticles(c.x + c.w/2, c.y + c.h/2, '#8888aa', 4, 4);
        if (c.hp <= 0) {
          c.broken = true;
          spawnParticles(c.x + c.w/2, c.y + c.h/2, c.glassesType.color, 20, 10);
          spawnFloatingText(c.x + c.w/2, c.y - 20, c.glassesType.name, c.glassesType.color);
          state.screenFlash = 5;
          // Spawn floating glasses pickup that rises above the crate
          state.glassesPickups.push({
            x: c.x + c.w/2,
            y: c.y,
            glassesType: c.glassesType,
            equipped: false,
            bobTimer: 0,
            glowTimer: 0
          });
        }
      }
    });

    // Sneakers crate hits
    state.sneakersCrates.forEach(c => {
      if (c.broken) return;
      if (rectCollide(atkBox, c)) {
        c.hp--; c.shakeTimer = 6;
        spawnParticles(c.x + c.w/2, c.y + c.h/2, '#8888aa', 4, 4);
        if (c.hp <= 0) {
          c.broken = true;
          spawnParticles(c.x + c.w/2, c.y + c.h/2, c.sneakersType.color, 20, 10);
          spawnFloatingText(c.x + c.w/2, c.y - 20, c.sneakersType.name, c.sneakersType.color);
          state.screenFlash = 5;
          // Spawn floating sneakers pickup that rises above the crate
          state.sneakersPickups.push({
            x: c.x + c.w/2,
            y: c.y,
            sneakersType: c.sneakersType,
            equipped: false,
            bobTimer: 0,
            glowTimer: 0
          });
        }
      }
    });

    // Cleats crate hits
    state.cleatsCrates.forEach(c => {
      if (c.broken) return;
      if (rectCollide(atkBox, c)) {
        c.hp--; c.shakeTimer = 6;
        spawnParticles(c.x + c.w/2, c.y + c.h/2, '#8888aa', 4, 4);
        if (c.hp <= 0) {
          c.broken = true;
          spawnParticles(c.x + c.w/2, c.y + c.h/2, c.cleatsType.color, 20, 10);
          spawnFloatingText(c.x + c.w/2, c.y - 20, c.cleatsType.name, c.cleatsType.color);
          state.screenFlash = 5;
          // Spawn floating cleats pickup that rises above the crate
          state.cleatsPickups.push({
            x: c.x + c.w/2,
            y: c.y,
            cleatsType: c.cleatsType,
            equipped: false,
            bobTimer: 0,
            glowTimer: 0
          });
        }
      }
    });

    // Horse crate hits
    state.horseCrates.forEach(c => {
      if (c.broken) return;
      if (rectCollide(atkBox, c)) {
        c.hp--; c.shakeTimer = 6;
        spawnParticles(c.x + c.w/2, c.y + c.h/2, '#8888aa', 4, 4);
        if (c.hp <= 0) {
          c.broken = true;
          spawnParticles(c.x + c.w/2, c.y + c.h/2, c.horseType.color, 25, 12);
          spawnFloatingText(c.x + c.w/2, c.y - 20, c.horseType.name, c.horseType.color);
          state.screenFlash = 8;
          // Spawn floating horse pickup that rises above the crate
          state.horsePickups.push({
            x: c.x + c.w/2,
            y: c.y,
            horseType: c.horseType,
            equipped: false,
            bobTimer: 0,
            glowTimer: 0
          });
        }
      }
    });
  }

  // ── Section 10: Race Car Powerup Damage ───────────────────────────
  // When the race car powerup is active, three damage sources are checked:
  // a) Jet fire: a 240px-wide hitbox behind the car deals 8 dmg at 15% chance/frame
  // b) Contact damage: 30 dmg with a 20-frame per-enemy cooldown
  // Both sources apply to zombies and the boss independently.
  // Jet fire damage (race car)
  if (player.powerups.raceCar > 0 && state.gameState !== 'dying') {
    // Fire jet damages enemies behind the car
    const jetBox = {
      x: player.facing === 1 ? player.x - 240 : player.x + player.w,
      y: player.y + 10,
      w: 240,
      h: player.h - 10
    };
    state.zombies.forEach(z => {
      if (!z.alive) return;
      if (rectCollide(jetBox, z) && Math.random() < 0.15) {
        const fireDmg = 8;
        z.hp -= fireDmg; z.hurt = 4;
        spawnParticles(z.x + z.w/2, z.y + z.h/2, '#ff6600', 3, 4);
        spawnFloatingText(z.x + z.w/2, z.y - 10, `-${fireDmg}`, '#ff8800');
        if (z.hp <= 0) {
          z.alive = false;
          addScore(z.type === 'big' ? 200 : 100);
          spawnParticles(z.x + z.w/2, z.y + z.h/2, '#ff8800', 15, 10);
          spawnFloatingText(z.x + z.w/2, z.y - 30, z.type === 'big' ? '+200' : '+100', '#ffff44');
        }
      }
    });
    // Also damage boss
    if (state.boss && state.boss.alive) {
      const boss = state.boss;
      if (rectCollide(jetBox, boss) && Math.random() < 0.15) {
        const fireDmg = 8;
        boss.hp -= fireDmg; boss.hurt = 4;
        spawnParticles(boss.x + boss.w/2, boss.y + boss.h/2, '#ff6600', 3, 4);
        spawnFloatingText(boss.x + boss.w/2, boss.y - 10, `-${fireDmg}`, '#ff8800');
        if (boss.hp <= 0) {
          boss.alive = false; addScore(1000);
          state.screenShake = 20; state.screenFlash = 15;
          spawnParticles(boss.x + boss.w/2, boss.y + boss.h/2, '#ff8800', 40, 15);
          spawnFloatingText(boss.x + boss.w/2, boss.y - 40, 'BOSS DEFEATED! +1000', '#ffff44');
          state.diamond = { x: state.levelData.width - 150, y: GROUND_Y - 30, collected: false, glow: 0 };
          spawnFloatingText(state.levelData.width - 150, GROUND_Y - 60, 'THE WILD DIAMOND APPEARS!', '#00ffff');
        }
      }
    }

    // Race car contact damage: run over enemies on collision
    const carBox = { x: player.x - 5, y: player.y, w: player.w + 10, h: player.h };
    const carDmg = 30;
    const carCooldownFrames = 20; // frames between hits on the same enemy
    state.zombies.forEach(z => {
      if (!z.alive) return;
      if (rectCollide(carBox, z)) {
        if (!z._carHitCooldown || z._carHitCooldown <= 0) {
          z.hp -= carDmg; z.hurt = 10;
          z.vx = player.facing * 10; z.vy = -6;
          z._carHitCooldown = carCooldownFrames;
          spawnParticles(z.x + z.w/2, z.y + z.h/2, '#cc2222', 10, 8);
          spawnFloatingText(z.x + z.w/2, z.y - 10, `-${carDmg}`, '#cc2222');
          state.screenShake = 6;
          if (z.hp <= 0) {
            z.alive = false;
            addScore(z.type === 'big' ? 200 : 100);
            spawnParticles(z.x + z.w/2, z.y + z.h/2, '#ff4400', 20, 12);
            spawnFloatingText(z.x + z.w/2, z.y - 30, z.type === 'big' ? '+200' : '+100', '#ffff44');
          }
        }
      }
    });
    // Contact damage to boss
    if (state.boss && state.boss.alive) {
      const boss = state.boss;
      if (rectCollide(carBox, boss)) {
        if (!boss._carHitCooldown || boss._carHitCooldown <= 0) {
          boss.hp -= carDmg; boss.hurt = 10;
          boss.vx = player.facing * 5;
          boss._carHitCooldown = carCooldownFrames;
          spawnParticles(boss.x + boss.w/2, boss.y + boss.h/2, '#cc2222', 12, 9);
          spawnFloatingText(boss.x + boss.w/2, boss.y - 10, `-${carDmg}`, '#cc2222');
          state.screenShake = 8;
          if (boss.hp <= 0) {
            boss.alive = false; addScore(1000);
            state.screenShake = 20; state.screenFlash = 15;
            spawnParticles(boss.x + boss.w/2, boss.y + boss.h/2, '#ff8800', 40, 15);
            spawnFloatingText(boss.x + boss.w/2, boss.y - 40, 'BOSS DEFEATED! +1000', '#ffff44');
            state.diamond = { x: state.levelData.width - 150, y: GROUND_Y - 30, collected: false, glow: 0 };
            spawnFloatingText(state.levelData.width - 150, GROUND_Y - 60, 'THE WILD DIAMOND APPEARS!', '#00ffff');
          }
        }
      }
    }
  }

  // ── Section 11: AI & Pickup Updates ───────────────────────────────
  updateZombieAI();
  updateBossAI();
  updateAllyAI();
  updateHealthPickups();
  updateDiamond();
  updatePortal();
  updateArmorPickups();
  updateGlassesPickups();
  updateSneakersPickups();
  updateCleatsPickups();
  updateHorsePickups();

  // ── Section 12: Projectile Updates & Collision ────────────────────
  // Each projectile type has unique movement behavior:
  // - banana: flies forward, then boomerangs back to the player
  // - litter: gravity-affected chunks that slow and fall
  // - bossSkull: straight-line projectile, consumed on player hit
  // - bossAOE: expanding shockwave ring, hits player in annular zone
  // - bossMortar: arcing gravity projectile, burst on ground impact
  // Player projectiles track which enemies they have already hit (Set).
  // Boss projectiles apply damage reduction if race car powerup is active.
  state.projectiles = state.projectiles.filter(proj => {
    proj.life--;
    if (proj.life <= 0) return false;

    if (proj.type === 'banana') {
      proj.distTraveled += Math.abs(proj.vx);
      if (!proj.returning && proj.distTraveled >= proj.maxDist) {
        proj.returning = true;
      }
      if (proj.returning) {
        // Fly back toward player
        const dx = player.x + player.w/2 - proj.x;
        const dy = player.y + player.h/2 - proj.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < 20) return false; // collected
        proj.vx = (dx / dist) * 9;
        proj.vy = (dy / dist) * 9;
      }
      proj.x += proj.vx;
      proj.y += proj.vy;
    } else if (proj.type === 'litter') {
      proj.vy += 0.3; // gravity on litter
      proj.x += proj.vx;
      proj.y += proj.vy;
      proj.vx *= 0.95;
      if (proj.y > GROUND_Y + 50) return false;
    } else if (proj.type === 'bossSkull') {
      // Straight-line projectile
      proj.x += proj.vx;
      proj.y += proj.vy;
      if (proj.y > GROUND_Y + 50 || proj.y < -50) return false;
    } else if (proj.type === 'bossAOE') {
      // Expanding shockwave ring
      proj.radius += proj.maxRadius / (proj.life + 10);
      if (proj.radius > proj.maxRadius) proj.radius = proj.maxRadius;
    } else if (proj.type === 'bossMortar') {
      // Arcing projectile affected by gravity
      proj.vy += GRAVITY * 0.6;
      proj.x += proj.vx;
      proj.y += proj.vy;
      if (proj.y > GROUND_Y + 10) {
        // Impact: spawn a brief ground burst effect
        spawnParticles(proj.x, GROUND_Y, '#44ff44', 6, 5);
        // Check player hit on impact
        if (!proj.hitPlayer && player.invincible <= 0) {
          const impactDist = Math.abs(player.x + player.w / 2 - proj.x);
          if (impactDist < 40 && player.y + player.h >= GROUND_Y - 10) {
            let mortarDmg = proj.damage;
            // Race car armor: 80% damage reduction
            if (player.powerups.raceCar > 0) mortarDmg = Math.max(1, Math.floor(mortarDmg * 0.2));
            player.hp -= mortarDmg;
            player.invincible = 35;
            player.knockbackX = (player.x > proj.x ? 1 : -1) * 8;
            player.vy = -5;
            state.screenShake = 8;
            state.screenFlash = 5;
            spawnParticles(player.x + player.w / 2, player.y + player.h / 2, '#ff0000', 8, 6);
            spawnFloatingText(player.x + player.w / 2, player.y - 10, `-${mortarDmg}`, '#ff4444');
            proj.hitPlayer = true;
          }
        }
        return false;
      }
    }

    // Player projectiles hit enemies (skip boss projectile types)
    if (proj.hitEnemies) {
      const pBox = { x: proj.x - 8, y: proj.y - 8, w: 16, h: 16 };
      state.zombies.forEach(z => {
        if (!z.alive || proj.hitEnemies.has(z)) return;
        if (rectCollide(pBox, z)) {
          z.hp -= proj.damage; z.hurt = 8;
          z.vx = (proj.vx > 0 ? 1 : -1) * 4; z.vy = -3;
          proj.hitEnemies.add(z);
          spawnParticles(z.x + z.w/2, z.y + z.h/2, proj.type === 'banana' ? '#ffdd00' : '#aa8844', 6, 5);
          spawnFloatingText(z.x + z.w/2, z.y - 10, `-${proj.damage}`, proj.type === 'banana' ? '#ffdd00' : '#aa8844');
          state.screenShake = 3;
          if (z.hp <= 0) {
            z.alive = false;
            addScore(z.type === 'big' ? 200 : 100);
            spawnParticles(z.x + z.w/2, z.y + z.h/2, '#44ff44', 15, 10);
            spawnFloatingText(z.x + z.w/2, z.y - 30, z.type === 'big' ? '+200' : '+100', '#ffff44');
          }
          if (proj.type === 'litter') return; // litter hits all in AOE
        }
      });

      // Hit boss
      if (state.boss && state.boss.alive) {
        const boss = state.boss;
        if (!proj.hitEnemies.has(boss) && rectCollide(pBox, boss)) {
          boss.hp -= proj.damage; boss.hurt = 8;
          proj.hitEnemies.add(boss);
          spawnParticles(boss.x + boss.w/2, boss.y + boss.h/2, '#ff4444', 8, 6);
          spawnFloatingText(boss.x + boss.w/2, boss.y - 10, `-${proj.damage}`, '#ff6666');
          state.screenShake = 4;
          if (boss.hp <= 0) {
            boss.alive = false; addScore(1000);
            state.screenShake = 20; state.screenFlash = 15;
            spawnParticles(boss.x + boss.w/2, boss.y + boss.h/2, '#ff8800', 40, 15);
            spawnFloatingText(boss.x + boss.w/2, boss.y - 40, 'BOSS DEFEATED! +1000', '#ffff44');
            state.diamond = { x: state.levelData.width - 150, y: GROUND_Y - 30, collected: false, glow: 0 };
            spawnFloatingText(state.levelData.width - 150, GROUND_Y - 60, 'THE WILD DIAMOND APPEARS!', '#00ffff');
          }
        }
      }
    }

    // Boss projectiles hit player
    if (proj.type === 'bossSkull' && !proj.hitPlayer && player.invincible <= 0) {
      const skullBox = { x: proj.x - 10, y: proj.y - 10, w: 20, h: 20 };
      const plBox = { x: player.x, y: player.y, w: player.w, h: player.h };
      if (rectCollide(skullBox, plBox)) {
        let skullDmg = proj.damage;
        // Race car armor: 80% damage reduction
        if (player.powerups.raceCar > 0) skullDmg = Math.max(1, Math.floor(skullDmg * 0.2));
        player.hp -= skullDmg;
        player.invincible = 35;
        player.knockbackX = (proj.vx > 0 ? 1 : -1) * 10;
        player.vy = -5;
        state.screenShake = 10;
        state.screenFlash = 6;
        spawnParticles(player.x + player.w / 2, player.y + player.h / 2, '#44ff44', 10, 7);
        spawnFloatingText(player.x + player.w / 2, player.y - 10, `-${skullDmg}`, '#ff4444');
        proj.hitPlayer = true;
        return false; // skull consumed on hit
      }
    }

    if (proj.type === 'bossAOE' && !proj.hitPlayer && player.invincible <= 0) {
      const dx = (player.x + player.w / 2) - proj.x;
      const dy = (player.y + player.h) - proj.y;
      const playerDist = Math.sqrt(dx * dx + dy * dy);
      // Hit if player is within the expanding ring (between inner and outer edge)
      if (playerDist < proj.radius + 20 && playerDist > proj.radius - 30) {
        let aoeDmg = proj.damage;
        // Race car armor: 80% damage reduction
        if (player.powerups.raceCar > 0) aoeDmg = Math.max(1, Math.floor(aoeDmg * 0.2));
        player.hp -= aoeDmg;
        player.invincible = 35;
        const pushDir = dx !== 0 ? (dx > 0 ? 1 : -1) : 1;
        player.knockbackX = pushDir * 10;
        player.vy = -6;
        state.screenShake = 10;
        state.screenFlash = 6;
        spawnParticles(player.x + player.w / 2, player.y + player.h / 2, '#88ff88', 10, 7);
        spawnFloatingText(player.x + player.w / 2, player.y - 10, `-${aoeDmg}`, '#ff4444');
        proj.hitPlayer = true;
      }
    }

    return true;
  });

  // ── Section 13: Level Completion / Boss Spawn Triggers ─────────────
  // Levels 1-2: all zombies dead -> spawn portal. Level 3: all zombies dead
  // -> spawn boss + bossIntro. After boss is killed, the Wild Diamond glows
  // until collected, triggering levelComplete -> gameWin.
  if (state.currentLevel < 3) {
    if (state.zombies.every(z => !z.alive) && !state.portal) {
      state.portal = {
        x: ld.width - 100, y: GROUND_Y + player.h,
        nextLevel: state.currentLevel + 1, timer: 0, entered: false
      };
      spawnFloatingText(player.x, player.y - 50, 'ALL ZOMBIES DEFEATED!', '#ffff00');
      spawnFloatingText(ld.width - 100, GROUND_Y - 20, 'PORTAL OPENED!', '#aa66ff');
      state.screenFlash = 5;
    }
  } else if (state.gameState === 'playing') {
    if (state.zombies.every(z => !z.alive) && !state.boss) {
      spawnBoss();
      state.gameState = 'bossIntro';
      state.bossIntroTimer = 90;
      state.screenShake = 15;
    }
  } else if (inBossFight && state.boss && !state.boss.alive && state.diamond && !state.diamond.collected) {
    state.diamond.glow += 0.02;
  }

  // ── Section 14: Death / Lives System ──────────────────────────────
  // When HP hits 0, decrement lives, enter 'dying' state for 90 frames,
  // then either re-init the current level (lives > 0) or transition to gameOver.
  if (player.hp <= 0) {
    player.hp = 0;
    player.lives--;
    state.screenShake = 15;
    state.gameState = 'dying';
    state.deathTimer = 90;
    spawnParticles(player.x + player.w/2, player.y + player.h/2, '#ff0000', 20, 10);
  }

  // ── Section 15: Camera Follow ─────────────────────────────────────
  // Smooth lerp (8%) toward the player with the player offset to the left
  // third of the screen. Clamped to level bounds.
  const targetX = player.x - canvas.width / 3;
  camera.x += (targetX - camera.x) * 0.08;
  camera.x = Math.max(0, Math.min(camera.x, ld.width - canvas.width));

  // ── Section 16: Particle / Effect Decay ───────────────────────────
  state.particles = state.particles.filter(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.life--; return p.life > 0; });
  state.floatingTexts = state.floatingTexts.filter(t => { t.y -= 1; t.life--; return t.life > 0; });

  if (state.screenShake > 0) state.screenShake--;
  if (state.screenFlash > 0) state.screenFlash--;
}

/**
 * Main per-frame render function. Delegates to specialized drawing functions
 * from renderer.js based on the current game state.
 *
 * Draw order for gameplay states (back to front):
 * 1. Background (sky gradient, moon, stars, terrain features, ground, platforms)
 * 2. Pickups & Crates (health, powerup, armor, glasses, sneakers, cleats, horse)
 * 3. Portal & Diamond (end-of-level objects)
 * 4. Enemies (zombies via forEach)
 * 5. Boss
 * 6. Allies (allied animal companions via forEach)
 * 7. Player character (drawLeopard -- name is historical, draws any animal)
 * 8. Projectiles (bananas, litter, boss skulls/AOE/mortars)
 * 9. Particles & floating damage/score texts
 * 10. Screen flash overlay (white flash on big hits/pickups)
 * 11. HUD (HP bar, score, level info, powerup indicators, item display)
 * 12. State overlays (bossIntro, dying, levelComplete, gameOver, paused)
 *
 * Menu states (title, modeSelect, difficulty, select, gameWin) render their
 * own full-screen overlay and return early, skipping gameplay draw layers.
 *
 * Screen shake is applied via ctx.translate before the gameplay layers.
 */
function draw() {
  if (state.gameState === '3dMode') return;
  const ctx = getCtx();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Full-screen menu states: render and return early (no gameplay layers)
  if (state.gameState === 'title') { drawTitleScreen(); return; }
  if (state.gameState === 'modeSelect') { drawModeSelectScreen(); return; }
  if (state.gameState === 'difficulty') { drawDifficultyScreen(); return; }
  if (state.gameState === 'select') { drawSelectScreen(); return; }
  if (state.gameState === 'gameWin') { drawGameWin(); return; }

  ctx.save();
  if (state.screenShake > 0) {
    ctx.translate((Math.random() - 0.5) * state.screenShake * 2, (Math.random() - 0.5) * state.screenShake * 2);
  }

  drawBackground();
  drawHealthPickups();
  drawPowerupCrates();
  drawArmorCrates();
  drawArmorPickups();
  drawGlassesCrates();
  drawGlassesPickups();
  drawSneakersCrates();
  drawSneakersPickups();
  drawCleatsCrates();
  drawCleatsPickups();
  drawHorseCrates();
  drawHorsePickups();
  drawPortal();
  drawDiamond();
  state.zombies.forEach(z => drawZombie(z));
  drawBoss();
  state.allies.forEach(a => drawAlly(a));
  drawLeopard(player.x - camera.x, player.y);
  drawProjectiles();
  drawParticles();
  drawFloatingTexts();
  ctx.restore();

  if (state.screenFlash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${state.screenFlash * 0.06})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  drawHUD();
  if (state.gameState === 'bossIntro') drawBossIntro();
  if (state.gameState === 'dying') drawDying();
  if (state.gameState === 'levelComplete') drawLevelComplete();
  if (state.gameState === 'gameOver') drawGameOver();
  if (state.gameState === 'paused') drawPaused();
}

// --- RAF (requestAnimationFrame) Loop Management ---
// NOTE: animFrameId is used both as an active-loop flag and to allow
// cancellation. When the 3D mode launches, stopGameLoop() is called to
// suspend the 2D loop; startGameLoop() resumes it on return.

/** @type {number|null} Current requestAnimationFrame handle, or null if stopped. */
let animFrameId = null;

/**
 * Single iteration of the main game loop. Calls update() then draw(),
 * and schedules the next frame via requestAnimationFrame.
 */
/** @type {boolean} Set to true by stopGameLoop(), checked after update()/draw(). */
let loopStopped = false;

function gameLoop() {
  update();
  draw();
  // Only reschedule if stopGameLoop() wasn't called during this frame
  // (e.g. when entering 3D mode from update())
  if (!loopStopped) {
    animFrameId = requestAnimationFrame(gameLoop);
  }
}

/**
 * Stop the RAF game loop by cancelling the pending animation frame.
 * Safe to call when already stopped (no-op).
 */
function stopGameLoop() {
  loopStopped = true;
  if (animFrameId !== null) {
    cancelAnimationFrame(animFrameId);
    animFrameId = null;
  }
}

/**
 * Start the RAF game loop if it is not already running.
 * Calls gameLoop() which self-schedules via requestAnimationFrame.
 */
function startGameLoop() {
  loopStopped = false;
  if (animFrameId === null) {
    gameLoop();
  }
}

// Bootstrap: kick off the game loop on module load.
startGameLoop();
