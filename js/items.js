/**
 * @module items
 * @description Manages all collectible item spawning and per-frame update logic
 * for the 2D Classic mode. Items fall into several categories: health pickups
 * (automatic on contact), powerup crates (break to activate), equipment crates
 * (break to drop, then press E to equip), the wild diamond (level-complete
 * trigger after boss defeat), and the portal (level-complete trigger on
 * non-boss levels).
 *
 * Dependencies: state.js (GROUND_Y, state, player, POWERUP_TYPES,
 *   POWERUP_DURATION, ARMOR_TYPES, GLASSES_TYPE, SNEAKERS_TYPE, CLEATS_TYPE,
 *   HORSE_TYPE, keys), utils.js (rectCollide, spawnParticles,
 *   spawnFloatingText, addScore), enemies.js (spawnAlly)
 * Exports: 15 functions — 7 spawn functions and 8 update functions
 *
 * Key concepts:
 * - Crates are placed at fixed percentages of the level width to avoid overlap:
 *   glasses at 25%, horse at 30%, armor at 40%, sneakers/cowboy boots at 55%,
 *   cleats at 65%. Powerup crates sit on the highest platforms instead.
 * - Equipment uses an interact-with-E-key pattern: after a crate is broken, a
 *   pickup entity spawns that bobs in place. The player must stand near it and
 *   press E to equip. The key press is consumed to prevent double-activation.
 * - Footwear occupies a shared slot: equipping cowboy boots or soccer cleats
 *   automatically discards any previously equipped footwear (mutual exclusion).
 * - Crates only spawn if the player does not already own that tier or a higher
 *   tier of the same equipment category.
 */

/**
 * @typedef {Object} HealthPickup
 * @property {number} x - Horizontal center position.
 * @property {number} y - Vertical base position (bobs up/down via sine wave).
 * @property {boolean} collected - Whether the pickup has been collected.
 * @property {number} bobTimer - Phase offset for the sine bob animation.
 */

/**
 * @typedef {Object} PowerupCrate
 * @property {number} x - Left edge position.
 * @property {number} y - Top edge position.
 * @property {number} w - Width in pixels (24).
 * @property {number} h - Height in pixels (24).
 * @property {number} hp - Remaining hits before breaking (starts at 3).
 * @property {boolean} broken - Whether the crate has been destroyed.
 * @property {Object} powerupType - The powerup type definition from POWERUP_TYPES.
 * @property {number} shakeTimer - Frames of shake animation remaining after being hit.
 */

/**
 * @typedef {Object} ArmorCrate
 * @property {number} x - Left edge position.
 * @property {number} y - Top edge position.
 * @property {number} w - Width in pixels (28).
 * @property {number} h - Height in pixels (28).
 * @property {number} hp - Remaining hits before breaking (starts at 3).
 * @property {boolean} broken - Whether the crate has been destroyed.
 * @property {Object} armorType - The armor type definition from ARMOR_TYPES.
 * @property {number} shakeTimer - Frames of shake animation remaining after being hit.
 */

/**
 * @typedef {Object} ArmorPickup
 * @property {number} x - Horizontal center position.
 * @property {number} y - Vertical base position.
 * @property {boolean} equipped - Whether the pickup has been equipped by the player.
 * @property {number} bobTimer - Phase for the bob animation.
 * @property {number} glowTimer - Phase for the glow pulse animation.
 * @property {Object} armorType - The armor type definition (includes id, name, color, tier).
 */

// Health pickups, powerup crates, armor crates, diamond, portal spawning
import { GROUND_Y, state, player, POWERUP_TYPES, POWERUP_DURATION, ARMOR_TYPES, GLASSES_TYPE, SNEAKERS_TYPE, CLEATS_TYPE, HORSE_TYPE, keys } from './state.js';
import { rectCollide, spawnParticles, spawnFloatingText, addScore } from './utils.js';
import { spawnAlly } from './enemies.js';

/**
 * Spawn health pickups on randomly selected platforms.
 *
 * Shuffles the platform list and places pickups on top of the first N
 * platforms, where N = min(4 + currentLevel, platformCount). Each pickup
 * starts with a random bob phase for visual variety.
 *
 * @see updateHealthPickups
 */
export function spawnHealthPickups() {
  state.healthPickups = [];
  const ld = state.levelData;
  const plats = [...ld.platforms];
  for (let i = plats.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [plats[i], plats[j]] = [plats[j], plats[i]];
  }
  const count = Math.min(4 + state.currentLevel, plats.length);
  for (let i = 0; i < count; i++) {
    const p = plats[i];
    state.healthPickups.push({
      x: p.x + p.w / 2,
      y: p.y - 12,
      collected: false,
      bobTimer: Math.random() * Math.PI * 2
    });
  }
}

/**
 * Spawn powerup crates on the highest platforms in the level.
 *
 * Sorts platforms by Y position (lowest Y = highest on screen), selects up
 * to 4 of the highest, and places one shuffled powerup type on each. Crates
 * have 3 HP and must be broken by the player's attacks to release the powerup.
 *
 * @see updateHealthPickups
 */
export function spawnPowerupCrates() {
  state.powerupCrates = [];
  const ld = state.levelData;
  const sorted = [...ld.platforms].sort((a, b) => a.y - b.y);
  const highPlats = sorted.slice(0, Math.min(4, sorted.length));

  const types = [...POWERUP_TYPES];
  for (let i = types.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [types[i], types[j]] = [types[j], types[i]];
  }

  highPlats.forEach((p, i) => {
    const type = types[i];
    state.powerupCrates.push({
      x: p.x + p.w / 2 - 12,
      y: p.y - 28,
      w: 24, h: 24,
      hp: 3,
      broken: false,
      powerupType: type,
      shakeTimer: 0
    });
  });
}

/**
 * Update all health pickups each frame.
 *
 * Each uncollected pickup bobs via a sine wave and checks for collision with
 * the player. On contact (if the player is not at full HP), restores 25 HP
 * (capped at maxHp) and spawns green particles and floating text.
 *
 * @see spawnHealthPickups
 */
export function updateHealthPickups() {
  state.healthPickups.forEach(h => {
    if (h.collected) return;
    if (player.hp >= player.maxHp) return;
    h.bobTimer += 0.05;
    const hbox = { x: h.x - 10, y: h.y - 10 + Math.sin(h.bobTimer) * 5, w: 20, h: 20 };
    const pbox = { x: player.x, y: player.y, w: player.w, h: player.h };
    if (rectCollide(pbox, hbox)) {
      h.collected = true;
      player.hp = Math.min(player.maxHp, player.hp + 25);
      spawnParticles(h.x, h.y, '#44ff44', 10, 6);
      spawnFloatingText(h.x, h.y - 20, '+25 HP', '#44ff44');
    }
  });
}

/**
 * Update the wild diamond each frame.
 *
 * The diamond spawns after the boss is defeated and pulses with a glow
 * animation. When the player collides with it, awards 1000 score, triggers
 * a screen flash, and transitions the game state to 'levelComplete'.
 */
export function updateDiamond() {
  if (!state.diamond || state.diamond.collected) return;
  state.diamond.glow += 0.05;
  const d = state.diamond;
  const dbox = { x: d.x - 15, y: d.y - 15, w: 30, h: 30 };
  const pbox = { x: player.x, y: player.y, w: player.w, h: player.h };
  if (rectCollide(pbox, dbox)) {
    d.collected = true;
    addScore(1000);
    state.screenFlash = 15;
    spawnParticles(d.x, d.y, '#00ffff', 30, 12);
    spawnParticles(d.x, d.y, '#ffffff', 20, 8);
    spawnFloatingText(d.x, d.y - 40, 'WILD DIAMOND!', '#00ffff');
    state.gameState = 'levelComplete';
    state.transitionTimer = 120;
  }
}

/**
 * Update the level-exit portal each frame.
 *
 * The portal appears on non-boss levels after all zombies are defeated.
 * It animates via a timer and checks for player collision. On contact,
 * transitions the game state to 'levelComplete' with a shorter transition
 * timer (90 frames vs the diamond's 120).
 */
export function updatePortal() {
  if (!state.portal || state.portal.entered) return;
  state.portal.timer += 0.04;
  const p = state.portal;
  const portalBox = { x: p.x - 20, y: p.y - 60, w: 40, h: 60 };
  const pbox = { x: player.x, y: player.y, w: player.w, h: player.h };
  if (rectCollide(pbox, portalBox)) {
    p.entered = true;
    state.gameState = 'levelComplete';
    state.transitionTimer = 90;
    state.screenFlash = 10;
    spawnParticles(p.x, p.y - 30, '#8844ff', 25, 10);
    spawnParticles(p.x, p.y - 30, '#ffffff', 15, 8);
  }
}

/**
 * Spawn an armor crate if the current level has a matching armor tier.
 *
 * Checks ARMOR_TYPES for an entry matching the current level number. If the
 * player already owns this tier or higher, the crate is not spawned. The
 * crate is placed on the ground at 40% of the level width. Breaking the
 * crate (3 HP) drops an armor pickup that the player can equip with E.
 *
 * @see updateArmorPickups
 */
export function spawnArmorCrates() {
  state.armorCrates = [];
  state.armorPickups = [];
  // Find the armor type for this level
  const armorType = ARMOR_TYPES.find(a => a.level === state.currentLevel);
  if (!armorType) return;

  // If the player already has this tier or higher, don't spawn the crate
  const currentTier = player.items.armor
    ? (ARMOR_TYPES.find(a => a.id === player.items.armor)?.tier || 0)
    : 0;
  if (currentTier >= armorType.tier) return;

  const ld = state.levelData;
  // Pick a ground-level location away from platforms used by powerup crates
  // Place it on the ground roughly 40% into the level
  const crateX = Math.floor(ld.width * 0.4);
  state.armorCrates.push({
    x: crateX,
    y: GROUND_Y + player.h - 28,
    w: 28, h: 28,
    hp: 3,
    broken: false,
    armorType: armorType,
    shakeTimer: 0
  });
}

/**
 * Update all armor pickups each frame (interact-with-E-key pattern).
 *
 * Each unequipped armor pickup bobs and glows. When the player is within
 * range and presses E, the armor is equipped to `player.items.armor`,
 * particles and floating text are spawned, 250 score is awarded, and the
 * E key press is consumed to prevent double-activation.
 *
 * @see spawnArmorCrates
 */
export function updateArmorPickups() {
  state.armorPickups.forEach(ap => {
    if (ap.equipped) return;
    ap.bobTimer += 0.04;
    ap.glowTimer += 0.03;

    // Check if player is near and pressing E
    const pbox = { x: player.x, y: player.y, w: player.w, h: player.h };
    const apBox = { x: ap.x - 20, y: ap.y - 40, w: 40, h: 50 };
    if (rectCollide(pbox, apBox) && keys['KeyE']) {
      ap.equipped = true;
      player.items.armor = ap.armorType.id;
      spawnParticles(ap.x, ap.y - 20, ap.armorType.color, 25, 10);
      spawnParticles(ap.x, ap.y - 20, '#ffffff', 15, 8);
      spawnFloatingText(ap.x, ap.y - 50, ap.armorType.name, ap.armorType.color);
      spawnFloatingText(ap.x, ap.y - 35, 'EQUIPPED!', '#ffffff');
      state.screenFlash = 8;
      addScore(250);
      keys['KeyE'] = false; // consume the key press
    }
  });
}

/**
 * Spawn a glasses crate if the current level matches GLASSES_TYPE.level.
 *
 * Only spawns if the player does not already own glasses. The crate is
 * placed on the ground at 25% of the level width. Breaking the crate
 * drops a glasses pickup that the player can equip with E.
 *
 * @see updateGlassesPickups
 */
export function spawnGlassesCrates() {
  state.glassesCrates = [];
  state.glassesPickups = [];
  // Only spawn on the glasses' designated level
  if (state.currentLevel !== GLASSES_TYPE.level) return;
  // Don't spawn if player already has glasses
  if (player.items.glasses) return;

  const ld = state.levelData;
  // Place it on the ground roughly 25% into the level (distinct from armor crate at 40%)
  const crateX = Math.floor(ld.width * 0.25);
  state.glassesCrates.push({
    x: crateX,
    y: GROUND_Y + player.h - 28,
    w: 28, h: 28,
    hp: 3,
    broken: false,
    glassesType: GLASSES_TYPE,
    shakeTimer: 0
  });
}

/**
 * Update all glasses pickups each frame (interact-with-E-key pattern).
 *
 * Each unequipped glasses pickup bobs and glows. When the player is within
 * range and presses E, glasses are equipped to `player.items.glasses`,
 * particles and floating text are spawned, 250 score is awarded, and the
 * E key press is consumed.
 *
 * @see spawnGlassesCrates
 */
export function updateGlassesPickups() {
  state.glassesPickups.forEach(gp => {
    if (gp.equipped) return;
    gp.bobTimer += 0.04;
    gp.glowTimer += 0.03;

    // Check if player is near and pressing E
    const pbox = { x: player.x, y: player.y, w: player.w, h: player.h };
    const gpBox = { x: gp.x - 20, y: gp.y - 40, w: 40, h: 50 };
    if (rectCollide(pbox, gpBox) && keys['KeyE']) {
      gp.equipped = true;
      player.items.glasses = true;
      spawnParticles(gp.x, gp.y - 20, GLASSES_TYPE.color, 25, 10);
      spawnParticles(gp.x, gp.y - 20, '#ffffff', 15, 8);
      spawnFloatingText(gp.x, gp.y - 50, GLASSES_TYPE.name, GLASSES_TYPE.color);
      spawnFloatingText(gp.x, gp.y - 35, 'EQUIPPED!', '#ffffff');
      state.screenFlash = 8;
      addScore(250);
      keys['KeyE'] = false; // consume the key press
    }
  });
}

/**
 * Spawn a cowboy boots crate if the current level matches SNEAKERS_TYPE.level.
 *
 * Only spawns if the player does not already own cowboy boots. The crate is
 * placed on the ground at 55% of the level width. Breaking the crate drops
 * a pickup that the player can equip with E.
 *
 * @see updateSneakersPickups
 */
export function spawnSneakersCrates() {
  state.sneakersCrates = [];
  state.sneakersPickups = [];
  // Only spawn on the cowboy boots' designated level
  if (state.currentLevel !== SNEAKERS_TYPE.level) return;
  // Don't spawn if player already has cowboy boots
  if (player.items.cowboyBoots) return;

  const ld = state.levelData;
  // Place it on the ground roughly 55% into the level (distinct from armor at 40%, glasses at 25%)
  const crateX = Math.floor(ld.width * 0.55);
  state.sneakersCrates.push({
    x: crateX,
    y: GROUND_Y + player.h - 28,
    w: 28, h: 28,
    hp: 3,
    broken: false,
    sneakersType: SNEAKERS_TYPE,
    shakeTimer: 0
  });
}

/**
 * Update all cowboy boots pickups each frame (interact-with-E-key pattern).
 *
 * Uses the footwear mutual exclusion system: equipping cowboy boots
 * automatically discards any existing soccer cleats or sneakers. When the
 * player is within range and presses E, cowboy boots are equipped to
 * `player.items.cowboyBoots`, particles and floating text are spawned,
 * 250 score is awarded, and the E key press is consumed.
 *
 * @see spawnSneakersCrates
 */
export function updateSneakersPickups() {
  state.sneakersPickups.forEach(sp => {
    if (sp.equipped) return;
    sp.bobTimer += 0.04;
    sp.glowTimer += 0.03;

    // Interact-with-E-key pattern: player overlaps pickup hitbox AND presses E.
    // The key is consumed (set to false) after equip to prevent double-activation.
    const pbox = { x: player.x, y: player.y, w: player.w, h: player.h };
    const spBox = { x: sp.x - 20, y: sp.y - 40, w: 40, h: 50 };
    if (rectCollide(pbox, spBox) && keys['KeyE']) {
      sp.equipped = true;
      // Footwear mutual exclusion: only one footwear item (sneakers, cowboy
      // boots, or soccer cleats) can be equipped at a time. Discard any
      // existing footwear before equipping the new item.
      if (player.items.soccerCleats) {
        player.items.soccerCleats = false;
        spawnFloatingText(sp.x, sp.y - 65, 'SOCCER CLEATS DISCARDED', '#ff6666');
      } else if (player.items.sneakers) {
        spawnFloatingText(sp.x, sp.y - 65, 'SNEAKERS DISCARDED', '#ff6666');
      }
      player.items.sneakers = false;
      player.items.cowboyBoots = true;
      spawnParticles(sp.x, sp.y - 20, SNEAKERS_TYPE.color, 25, 10);
      spawnParticles(sp.x, sp.y - 20, '#ffffff', 15, 8);
      spawnFloatingText(sp.x, sp.y - 50, SNEAKERS_TYPE.name, SNEAKERS_TYPE.color);
      spawnFloatingText(sp.x, sp.y - 35, 'EQUIPPED!', '#ffffff');
      state.screenFlash = 8;
      addScore(250);
      keys['KeyE'] = false; // consume the key press
    }
  });
}

/**
 * Spawn a soccer cleats crate if the current level matches CLEATS_TYPE.level.
 *
 * Only spawns if the player does not already own soccer cleats. The crate is
 * placed on the ground at 65% of the level width. Breaking the crate drops
 * a pickup that the player can equip with E.
 *
 * @see updateCleatsPickups
 */
export function spawnCleatsCrates() {
  state.cleatsCrates = [];
  state.cleatsPickups = [];
  // Only spawn on the cleats' designated level
  if (state.currentLevel !== CLEATS_TYPE.level) return;
  // Don't spawn if player already has soccer cleats
  if (player.items.soccerCleats) return;

  const ld = state.levelData;
  // Place it on the ground roughly 65% into the level (distinct from glasses at 25%, armor at 40%, sneakers at 55%)
  const crateX = Math.floor(ld.width * 0.65);
  state.cleatsCrates.push({
    x: crateX,
    y: GROUND_Y + player.h - 28,
    w: 28, h: 28,
    hp: 3,
    broken: false,
    cleatsType: CLEATS_TYPE,
    shakeTimer: 0
  });
}

/**
 * Update all soccer cleats pickups each frame (interact-with-E-key pattern).
 *
 * Uses the footwear mutual exclusion system: equipping soccer cleats
 * automatically discards any existing cowboy boots or sneakers. When the
 * player is within range and presses E, soccer cleats are equipped to
 * `player.items.soccerCleats`, particles and floating text are spawned,
 * 250 score is awarded, and the E key press is consumed.
 *
 * @see spawnCleatsCrates
 */
export function updateCleatsPickups() {
  state.cleatsPickups.forEach(cp => {
    if (cp.equipped) return;
    cp.bobTimer += 0.04;
    cp.glowTimer += 0.03;

    // Interact-with-E-key pattern: player overlaps pickup hitbox AND presses E.
    // The key is consumed (set to false) after equip to prevent double-activation.
    const pbox = { x: player.x, y: player.y, w: player.w, h: player.h };
    const cpBox = { x: cp.x - 20, y: cp.y - 40, w: 40, h: 50 };
    if (rectCollide(pbox, cpBox) && keys['KeyE']) {
      cp.equipped = true;
      // Footwear mutual exclusion: only one footwear item can be equipped.
      // Discard any existing footwear before equipping soccer cleats.
      if (player.items.cowboyBoots) {
        player.items.cowboyBoots = false;
        spawnFloatingText(cp.x, cp.y - 65, 'COWBOY BOOTS DISCARDED', '#ff6666');
      } else if (player.items.sneakers) {
        spawnFloatingText(cp.x, cp.y - 65, 'SNEAKERS DISCARDED', '#ff6666');
      }
      player.items.sneakers = false;
      player.items.soccerCleats = true;
      spawnParticles(cp.x, cp.y - 20, CLEATS_TYPE.color, 25, 10);
      spawnParticles(cp.x, cp.y - 20, '#ffffff', 15, 8);
      spawnFloatingText(cp.x, cp.y - 50, CLEATS_TYPE.name, CLEATS_TYPE.color);
      spawnFloatingText(cp.x, cp.y - 35, 'EQUIPPED!', '#ffffff');
      state.screenFlash = 8;
      addScore(250);
      keys['KeyE'] = false; // consume the key press
    }
  });
}

/**
 * Spawn a horse crate if the current level matches HORSE_TYPE.level.
 *
 * Has additional prerequisites: the player must already own cowboy boots and
 * must not already own a horse. The crate is placed on the ground at 30% of
 * the level width. It is slightly larger (32x32) than other equipment crates.
 * Breaking the crate drops a horse pickup that the player can equip with E.
 *
 * @see updateHorsePickups
 */
export function spawnHorseCrates() {
  state.horseCrates = [];
  state.horsePickups = [];
  // Only spawn on level 3
  if (state.currentLevel !== HORSE_TYPE.level) return;
  // Only spawn if player has cowboy boots AND doesn't have horse yet
  if (!player.items.cowboyBoots) return;
  if (player.items.horse) return;

  const ld = state.levelData;
  // Place it on the ground roughly 30% into the level (distinct from other crates)
  const crateX = Math.floor(ld.width * 0.30);
  state.horseCrates.push({
    x: crateX,
    y: GROUND_Y + player.h - 32,
    w: 32, h: 32,
    hp: 3,
    broken: false,
    horseType: HORSE_TYPE,
    shakeTimer: 0
  });
}

/**
 * Update all horse pickups each frame (interact-with-E-key pattern).
 *
 * When the player is within range and presses E, the horse item is equipped
 * to `player.items.horse` and a horse ally is spawned via `spawnAlly()` at
 * the player's position. Awards 500 score (higher than other equipment) and
 * triggers both screen flash and screen shake. The E key press is consumed.
 *
 * @see spawnHorseCrates
 * @see spawnAlly
 */
export function updateHorsePickups() {
  state.horsePickups.forEach(hp => {
    if (hp.equipped) return;
    hp.bobTimer += 0.04;
    hp.glowTimer += 0.03;

    // Check if player is near and pressing E
    const pbox = { x: player.x, y: player.y, w: player.w, h: player.h };
    const hpBox = { x: hp.x - 25, y: hp.y - 50, w: 50, h: 60 };
    if (rectCollide(pbox, hpBox) && keys['KeyE']) {
      hp.equipped = true;
      player.items.horse = true;
      // Spawn the horse ally
      spawnAlly('horse', player.x + 60, GROUND_Y);
      spawnParticles(hp.x, hp.y - 20, HORSE_TYPE.color, 30, 12);
      spawnParticles(hp.x, hp.y - 20, '#ffffff', 20, 8);
      spawnFloatingText(hp.x, hp.y - 60, HORSE_TYPE.name, HORSE_TYPE.color);
      spawnFloatingText(hp.x, hp.y - 40, 'HORSE ALLY JOINS YOU!', '#ffffff');
      state.screenFlash = 10;
      state.screenShake = 5;
      addScore(500);
      keys['KeyE'] = false;
    }
  });
}
