/**
 * @module rpg/inventory
 * @description Pure RPG gathering, inventory, crafting, and equipment helpers.
 *
 * Dependencies: constants-rpg.js
 * Exports: createGatheringNodes, collectNode, getRecipeIds, craftItem, equipItem, applyDeathPenalty
 */

import { GATHERING_NODE_DEFINITIONS, INGREDIENT_IDS, RECIPE_DEFINITIONS, ZONE_LABELS } from './constants-rpg.js';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function ensureIngredientBag(save) {
  save.ingredients = save.ingredients || {};
  INGREDIENT_IDS.forEach(id => {
    save.ingredients[id] = Math.max(0, Math.trunc(Number(save.ingredients[id]) || 0));
  });
}

function ingredientLabel(id) {
  if (id === 'bananas') return 'Bananas';
  return id.charAt(0).toUpperCase() + id.slice(1);
}

function applyEquipmentStats(save) {
  const weapon = RECIPE_DEFINITIONS[save.equipped?.weapon];
  save.player.attack = 8 + (weapon?.attackBonus || 0);
  return save;
}

export function createGatheringNodes(save, zoneId = null) {
  const unlocked = new Set(save?.unlockedZones || []);
  return GATHERING_NODE_DEFINITIONS
    .filter(node => !zoneId || node.zoneId === zoneId)
    .filter(node => unlocked.has(node.zoneId))
    .map(node => ({
      ...clone(node),
      zoneLabel: ZONE_LABELS[node.zoneId] || node.zoneId,
      collected: Boolean(save?.collectedNodes?.[node.zoneId]?.includes(node.id)),
    }));
}

export function collectNode(save, node) {
  const next = clone(save);
  ensureIngredientBag(next);
  next.collectedNodes = next.collectedNodes && typeof next.collectedNodes === 'object'
    ? next.collectedNodes
    : {};
  next.collectedNodes[node.zoneId] = Array.isArray(next.collectedNodes[node.zoneId])
    ? next.collectedNodes[node.zoneId]
    : [];

  if (next.collectedNodes[node.zoneId].includes(node.id)) {
    return { save: next, collected: false, event: null };
  }

  next.collectedNodes[node.zoneId].push(node.id);
  next.ingredients[node.ingredient] += node.amount;
  return {
    save: next,
    collected: true,
    event: { kind: 'ingredientCollected', ingredient: node.ingredient, amount: node.amount, nodeId: node.id },
  };
}

export function getRecipeIds() {
  return Object.keys(RECIPE_DEFINITIONS);
}

export function getRecipe(recipeId) {
  const recipe = RECIPE_DEFINITIONS[recipeId];
  return recipe ? clone(recipe) : null;
}

function getMissingIngredients(save, recipe) {
  ensureIngredientBag(save);
  return Object.entries(recipe.cost)
    .filter(([ingredient, amount]) => save.ingredients[ingredient] < amount)
    .map(([ingredient, amount]) => `${ingredientLabel(ingredient)} ${amount - save.ingredients[ingredient]}`);
}

export function craftItem(save, recipeId) {
  const recipe = RECIPE_DEFINITIONS[recipeId];
  if (!recipe) return { save: clone(save), success: false, reason: 'Unknown recipe' };

  const next = clone(save);
  ensureIngredientBag(next);
  next.inventory = Array.isArray(next.inventory) ? next.inventory : [];
  next.unlockedRecipes = Array.isArray(next.unlockedRecipes) ? next.unlockedRecipes : [];
  if (!next.unlockedRecipes.includes(recipeId)) {
    return { save: next, success: false, reason: `${recipe.label} recipe is locked` };
  }

  const missing = getMissingIngredients(next, recipe);
  if (missing.length > 0) {
    return { save: next, success: false, reason: `Missing ${missing.join(', ')}` };
  }

  Object.entries(recipe.cost).forEach(([ingredient, amount]) => {
    next.ingredients[ingredient] -= amount;
  });
  if (!next.inventory.includes(recipeId)) next.inventory.push(recipeId);
  if (recipe.equipsTo) {
    next.equipped = next.equipped || { weapon: null, gadget: null };
    next.equipped[recipe.equipsTo] = recipeId;
  }
  applyEquipmentStats(next);
  return {
    save: next,
    success: true,
    itemId: recipeId,
    label: recipe.label,
    event: { kind: 'craftedItem', itemId: recipeId },
  };
}

export function equipItem(save, itemId) {
  const recipe = RECIPE_DEFINITIONS[itemId];
  const next = clone(save);
  next.inventory = Array.isArray(next.inventory) ? next.inventory : [];
  next.equipped = next.equipped || { weapon: null, gadget: null };
  if (!recipe || !recipe.equipsTo) return { save: next, success: false, reason: 'Item cannot be equipped' };
  if (!next.inventory.includes(itemId)) return { save: next, success: false, reason: 'Item is not in inventory' };
  next.equipped[recipe.equipsTo] = itemId;
  applyEquipmentStats(next);
  return { save: next, success: true, itemId, slot: recipe.equipsTo };
}

export function applyDeathPenalty(save) {
  const next = clone(save);
  ensureIngredientBag(next);
  const losses = {};
  INGREDIENT_IDS.forEach(id => {
    const loss = Math.floor(next.ingredients[id] * 0.1);
    losses[id] = loss;
    next.ingredients[id] -= loss;
  });
  next.player.hp = next.player.maxHp;
  return { save: next, losses };
}

