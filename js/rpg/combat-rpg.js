/**
 * @module rpg/combat-rpg
 * @description Pure deterministic combat state transitions for RPG alpha zones.
 *
 * Dependencies: constants-rpg.js
 * Exports: createCombatState, performPlayerAttack, tickCombat, getCombatSummary
 */

import { INGREDIENT_IDS, TUTORIAL_ZOMBIES } from './constants-rpg.js';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createCombatState(save, zoneId = 'forestEdge') {
  return {
    zoneId,
    playerHp: save.player.hp,
    playerMaxHp: save.player.maxHp,
    attackCooldownSeconds: 0,
    contactTimerSeconds: 0,
    respawnGraceSeconds: 0,
    defeatedEnemies: 0,
    deaths: 0,
    enemies: zoneId === 'forestEdge'
      ? TUTORIAL_ZOMBIES.map(enemy => ({ ...clone(enemy), maxHp: enemy.hp, defeated: false }))
      : [],
  };
}

export function getCombatSummary(state) {
  const enemiesAlive = state.enemies.filter(enemy => !enemy.defeated).length;
  return {
    zoneId: state.zoneId,
    enemiesAlive,
    defeatedEnemies: state.defeatedEnemies,
    playerHp: state.playerHp,
    playerMaxHp: state.playerMaxHp,
    deaths: state.deaths,
    attackCooldownSeconds: state.attackCooldownSeconds,
    respawnGraceSeconds: state.respawnGraceSeconds,
  };
}

function applyCombatDeathPenalty(save) {
  const next = clone(save);
  const losses = {};
  next.ingredients = next.ingredients || {};
  INGREDIENT_IDS.forEach(id => {
    const current = Math.max(0, Math.trunc(Number(next.ingredients[id]) || 0));
    const loss = Math.floor(current * 0.1);
    next.ingredients[id] = current - loss;
    losses[id] = loss;
  });
  next.player.hp = next.player.maxHp;
  return { save: next, losses };
}

export function performPlayerAttack(state, save) {
  const nextState = clone(state);
  const nextSave = clone(save);
  const events = [];
  if (nextState.attackCooldownSeconds > 0) {
    return { state: nextState, save: nextSave, events, attacked: false };
  }

  const target = nextState.enemies.find(enemy => !enemy.defeated);
  if (!target) return { state: nextState, save: nextSave, events, attacked: false };

  target.hp = Math.max(0, target.hp - nextSave.player.attack);
  nextState.attackCooldownSeconds = 0.15;
  if (target.hp <= 0) {
    target.defeated = true;
    nextState.defeatedEnemies += 1;
    events.push({ kind: 'defeatZombie', enemyId: target.id, zoneId: nextState.zoneId });
  }

  return { state: nextState, save: nextSave, events, attacked: true };
}

export function tickCombat(state, save, dtSeconds) {
  const nextState = clone(state);
  let nextSave = clone(save);
  const events = [];
  nextState.attackCooldownSeconds = Math.max(0, nextState.attackCooldownSeconds - dtSeconds);
  nextState.respawnGraceSeconds = Math.max(0, nextState.respawnGraceSeconds - dtSeconds);

  if (nextState.enemies.some(enemy => !enemy.defeated) && nextState.respawnGraceSeconds <= 0) {
    nextState.contactTimerSeconds += dtSeconds;
    if (nextState.contactTimerSeconds >= 0.62) {
      nextState.contactTimerSeconds = 0;
      nextState.playerHp = Math.max(0, nextState.playerHp - 14);
      nextSave.player.hp = nextState.playerHp;
      events.push({ kind: 'playerDamaged', amount: 14 });
    }
  }

  if (nextState.playerHp <= 0) {
    const penalty = applyCombatDeathPenalty(nextSave);
    nextSave = penalty.save;
    nextState.playerHp = nextSave.player.hp;
    nextState.playerMaxHp = nextSave.player.maxHp;
    nextState.contactTimerSeconds = 0;
    nextState.respawnGraceSeconds = 1.25;
    nextState.deaths += 1;
    events.push({ kind: 'playerRespawned', losses: penalty.losses });
  }

  return { state: nextState, save: nextSave, events };
}
