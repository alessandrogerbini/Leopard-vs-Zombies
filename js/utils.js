/**
 * @module utils
 * @description Shared utility functions for the 2D Classic mode. Provides AABB
 * collision detection, player hitbox calculation, visual effect spawners
 * (particles and floating text), and derived-stat helpers that fold in powerup
 * and item modifiers.
 *
 * Dependencies: state.js (state, player, DIFFICULTY_SETTINGS)
 * Exports: 8 functions — rectCollide, getAttackBox, spawnParticles,
 *          spawnFloatingText, getPlayerDamage, getPlayerCooldown,
 *          getPlayerJumpForce, addScore
 *
 * Key concepts:
 * - All collision uses axis-aligned bounding boxes (AABB).
 * - Powerup modifiers are checked at call time so callers always get the
 *   current effective value without caching concerns.
 * - Score is scaled by the active difficulty multiplier automatically.
 */

// Collision, particles, floating text, powerup helpers
import { state, player, DIFFICULTY_SETTINGS } from './state.js';

/**
 * Test axis-aligned bounding box overlap between two rectangles.
 *
 * @param {Object} a - First rectangle.
 * @param {number} a.x - Left edge.
 * @param {number} a.y - Top edge.
 * @param {number} a.w - Width.
 * @param {number} a.h - Height.
 * @param {Object} b - Second rectangle.
 * @param {number} b.x - Left edge.
 * @param {number} b.y - Top edge.
 * @param {number} b.w - Width.
 * @param {number} b.h - Height.
 * @returns {boolean} True if the two rectangles overlap.
 */
export function rectCollide(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x &&
         a.y < b.y + b.h && a.y + a.h > b.y;
}

/**
 * Compute the player's melee attack hitbox, positioned in front of the player.
 * Cowboy boots extend the reach by 20%.
 *
 * @returns {{x: number, y: number, w: number, h: number}} AABB for the attack area.
 * @see player.items.cowboyBoots
 */
export function getAttackBox() {
  let reach = 55;
  // NOTE: Cowboy boots modifier is applied here rather than on equip so that
  // unequipping mid-run (if ever supported) would take effect immediately.
  if (player.items.cowboyBoots) reach = Math.floor(reach * 1.2);
  if (player.facing === 1) {
    return { x: player.x + player.w, y: player.y - 5, w: reach, h: player.h + 5 };
  } else {
    return { x: player.x - reach, y: player.y - 5, w: reach, h: player.h + 5 };
  }
}

/**
 * Spawn a burst of visual particles at the given world position. Particles are
 * added to `state.particles` and rendered/updated by the renderer each frame.
 *
 * @param {number} x - World x-coordinate of the burst origin.
 * @param {number} y - World y-coordinate of the burst origin.
 * @param {string} color - CSS color string for the particles (e.g. '#ff4444').
 * @param {number} count - Number of particles to create.
 * @param {number} spread - Maximum random velocity magnitude in each axis.
 */
export function spawnParticles(x, y, color, count, spread) {
  for (let i = 0; i < count; i++) {
    state.particles.push({
      x, y,
      vx: (Math.random() - 0.5) * spread,
      vy: (Math.random() - 0.8) * spread,
      life: 30 + Math.random() * 20,
      maxLife: 50,
      color,
      size: 2 + Math.random() * 3
    });
  }
}

/**
 * Spawn a floating text label that drifts upward and fades out over 60 frames.
 * Used for damage numbers, score popups, and status messages.
 *
 * @param {number} x - World x-coordinate.
 * @param {number} y - World y-coordinate.
 * @param {string} text - Display text.
 * @param {string} color - CSS color string for the text.
 */
export function spawnFloatingText(x, y, text, color) {
  state.floatingTexts.push({ x, y, text, color, life: 60 });
}

/**
 * Calculate the player's effective melee damage, factoring in the current
 * combo multiplier and the Claws of Steel powerup.
 *
 * Combo adds +3 damage per consecutive hit. Claws of Steel doubles the total.
 *
 * @returns {number} Final integer damage value.
 * @see player.combo
 * @see player.powerups.clawsOfSteel
 */
export function getPlayerDamage() {
  let dmg = player.baseDamage + player.combo * 3;
  if (player.powerups.clawsOfSteel > 0) dmg *= 2;
  return Math.floor(dmg);
}

/**
 * Calculate the player's effective attack cooldown in frames. Super Fangs
 * halves the cooldown, doubling attack speed.
 *
 * @returns {number} Cooldown in frames between attacks.
 * @see player.powerups.superFangs
 */
export function getPlayerCooldown() {
  let cd = player.baseCooldown;
  if (player.powerups.superFangs > 0) cd = Math.floor(cd / 2);
  return cd;
}

/**
 * Calculate the player's effective jump impulse. Jumpy Boots increases the
 * force by 50% (more negative = higher jump).
 *
 * @returns {number} Jump velocity (negative value; larger magnitude = higher jump).
 * @see player.powerups.jumpyBoots
 */
export function getPlayerJumpForce() {
  let jf = player.baseJumpForce;
  if (player.powerups.jumpyBoots > 0) jf *= 1.5;
  return jf;
}

/**
 * Award score to the player, automatically scaled by the active difficulty's
 * score multiplier (easy = 1x, medium = 1.75x, hard = 2.5x).
 *
 * @param {number} points - Raw (unscaled) point value to award.
 * @see DIFFICULTY_SETTINGS
 */
export function addScore(points) {
  player.score += Math.floor(points * DIFFICULTY_SETTINGS[state.difficulty].scoreMult);
}
