/**
 * @module game-rpg
 * @description Animal Rescue RPG orchestrator for save-slot selection and alpha runtime ownership.
 *
 * Dependencies: save-system.js, hud-rpg.js, shared DOM canvases supplied by game.js
 * Exports: launchRPGGame
 */

import { deleteSaveSlot, listSaveSummaries, readSaveSlot, writeSaveSlot } from './rpg/save-system.js';
import { createCombatState, getCombatSummary, performPlayerAttack, tickCombat } from './rpg/combat-rpg.js';
import { collectNode, createGatheringNodes, craftItem, getRecipe, getRecipeIds } from './rpg/inventory.js';
import { addJournalEntry, createRewardBanner, unlockSticker } from './rpg/journal-rpg.js';
import { createHubNpcs } from './rpg/npc.js';
import { grantXp } from './rpg/progression-rpg.js';
import { acceptQuest, completeQuest, getActiveQuestTracker, getAvailableQuests, isQuestObjectiveComplete } from './rpg/quest-system.js';
import { createHubZone } from './rpg/zone.js';
import { getWorldMapEntries } from './rpg/world-map-rpg.js';
import { drawAlphaEndCard, drawCrafting, drawDialogue, drawHub, drawInventory, drawQuestBoard, drawRewardBanner, drawSaveSelect, drawWorldMap, drawZone, hitTestSaveSlot } from './rpg/hud-rpg.js';

export function launchRPGGame(options) {
  const animal = options.animal || { name: 'LEOPARD', color: '#e8a828' };
  const onReturn = typeof options.onReturn === 'function' ? options.onReturn : () => {};
  const canvases = options.canvases || {};
  const canvas3d = canvases.game3d || document.getElementById('game3d');
  const hudCanvas = canvases.hud3d || document.getElementById('hud3d');
  const container = canvases.container || document.getElementById('game-container');
  const canvas2d = canvases.game2d || document.getElementById('game');
  const hudCtx = hudCanvas.getContext('2d');

  let returned = false;
  let screen = 'saveSelect';
  let selectedSlot = 0;
  let confirmDelete = false;
  let slotSummaries = listSaveSummaries(localStorage, animal.id || 'leopard');
  let activeSave = null;
  let hubZone = null;
  let hubNpcs = [];
  let focusItems = [];
  let selectedFocus = 0;
  let selectedQuest = 0;
  let selectedMapEntry = 0;
  let selectedRecipe = 0;
  let dialogueNpc = null;
  let combatState = null;
  let craftingMessage = '';
  let rewardBanner = null;
  let runtimeRenderer = null;
  let runtimeScene = null;
  let runtimeCamera = null;
  let runtimeCube = null;
  let frameId = 0;
  let lastFrameTime = performance.now();

  function resize() {
    const w = Math.max(1, Math.floor(window.innerWidth || 960));
    const h = Math.max(1, Math.floor(window.innerHeight || 540));
    canvas3d.width = w;
    canvas3d.height = h;
    hudCanvas.width = w;
    hudCanvas.height = h;
    if (runtimeRenderer) runtimeRenderer.setSize(w, h, false);
    if (runtimeCamera) {
      runtimeCamera.aspect = w / h;
      runtimeCamera.updateProjectionMatrix();
    }
    draw();
  }

  function refreshSlotSummaries() {
    slotSummaries = listSaveSummaries(localStorage, animal.id || 'leopard');
  }

  function refreshHubState() {
    if (!activeSave) return;
    hubZone = createHubZone(activeSave);
    hubNpcs = createHubNpcs(activeSave);
    focusItems = [
      ...hubNpcs.map(npc => ({ type: 'npc', id: npc.id, label: npc.name, npc })),
      ...hubZone.interactables.map(item => ({ type: item.kind, id: item.id, label: item.label, item })),
    ];
    selectedFocus = Math.min(selectedFocus, Math.max(0, focusItems.length - 1));
    selectedQuest = Math.min(selectedQuest, Math.max(0, getAvailableQuests(activeSave).length - 1));
    selectedMapEntry = Math.min(selectedMapEntry, Math.max(0, getWorldMapEntries(activeSave).length - 1));
  }

  function getViewModel() {
    const activeQuest = activeSave ? getActiveQuestTracker(activeSave) : null;
    const available = activeSave ? getAvailableQuests(activeSave) : [];
    const entries = activeSave ? getWorldMapEntries(activeSave) : [];
    const recipes = getRecipeIds().map(id => getRecipe(id));
    const focusItem = focusItems[selectedFocus] || null;
    return {
      animal,
      save: activeSave,
      hub: {
        zone: hubZone,
        npcs: hubNpcs,
        interactables: hubZone?.interactables || [],
      },
      focusItem,
      activeQuest,
      dialogue: dialogueNpc ? { name: dialogueNpc.name, lines: dialogueNpc.dialogue } : null,
      questBoard: { available, selectedQuest },
      worldMap: { entries, selectedMapEntry },
      combat: combatState ? getCombatSummary(combatState) : null,
      gatheringNodes: activeSave ? createGatheringNodes(activeSave, activeSave.currentZone) : [],
      crafting: { recipes, selectedRecipe, message: craftingMessage },
      rewardBanner,
    };
  }

  function updateDebug() {
    if (typeof window === 'undefined') return;
    const view = activeSave ? getViewModel() : null;
    window.__rpgDebug = {
      screen,
      animalId: animal.id || 'leopard',
      selectedSlot,
      slotSummaries,
      canvasCount: [canvas3d, hudCanvas].filter(Boolean).length,
      hub: view ? {
        enemies: hubZone.enemies.length,
        damageSources: hubZone.damageSources.length,
        interactables: hubZone.interactables.map(item => item.id),
        npcs: hubNpcs.map(npc => ({ id: npc.id, name: npc.name, dialogueId: npc.dialogueId })),
      } : null,
      focusItem: view?.focusItem ? { id: view.focusItem.id, label: view.focusItem.label, type: view.focusItem.type } : null,
      activeQuest: view?.activeQuest || null,
      dialogue: view?.dialogue || null,
      questBoard: view?.questBoard || null,
      worldMap: view?.worldMap || null,
      combat: view?.combat || null,
      gatheringNodes: view?.gatheringNodes || [],
      crafting: view?.crafting || null,
      rewardBanner,
      activeSave: activeSave ? {
        animalId: activeSave.animalId,
        slot: activeSave.slot,
        currentZone: activeSave.currentZone,
        player: activeSave.player,
        quests: activeSave.quests,
        journal: activeSave.journal,
        unlockedRecipes: activeSave.unlockedRecipes,
        unlockedZones: activeSave.unlockedZones,
        rescued: activeSave.rescued,
        reputation: activeSave.reputation,
        flags: activeSave.flags,
      } : null,
    };
  }

  function draw() {
    if (screen === 'saveSelect') {
      drawSaveSelect(hudCtx, { animal, slotSummaries, selectedSlot, confirmDelete });
    } else if (activeSave) {
      refreshHubState();
      const view = getViewModel();
      if (screen === 'hub') drawHub(hudCtx, view);
      else if (screen === 'dialogue') drawDialogue(hudCtx, view);
      else if (screen === 'questBoard') drawQuestBoard(hudCtx, view);
      else if (screen === 'worldMap') drawWorldMap(hudCtx, view);
      else if (screen === 'zone') drawZone(hudCtx, view);
      else if (screen === 'inventory') drawInventory(hudCtx, view);
      else if (screen === 'crafting') drawCrafting(hudCtx, view);
      else if (screen === 'alphaEndCard') drawAlphaEndCard(hudCtx, view);
      if (screen !== 'alphaEndCard') drawRewardBanner(hudCtx, rewardBanner);
    }
    updateDebug();
  }

  function initRuntimeScene() {
    if (!window.THREE || runtimeRenderer) return;
    runtimeRenderer = new window.THREE.WebGLRenderer({ canvas: canvas3d, antialias: true });
    runtimeRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    runtimeRenderer.setSize(canvas3d.width, canvas3d.height, false);

    runtimeScene = new window.THREE.Scene();
    runtimeScene.background = new window.THREE.Color(0x102318);
    runtimeCamera = new window.THREE.PerspectiveCamera(60, canvas3d.width / canvas3d.height, 0.1, 100);
    runtimeCamera.position.set(0, 2.6, 5.2);
    runtimeCamera.lookAt(0, 0.8, 0);

    const light = new window.THREE.DirectionalLight(0xfff4c2, 1.2);
    light.position.set(3, 6, 4);
    runtimeScene.add(light);
    runtimeScene.add(new window.THREE.AmbientLight(0x9fd28f, 0.55));

    const floorGeo = new window.THREE.PlaneGeometry(16, 16);
    const floorMat = new window.THREE.MeshLambertMaterial({ color: 0x274624 });
    const floor = new window.THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    runtimeScene.add(floor);

    const heroGeo = new window.THREE.BoxGeometry(0.8, 1.2, 0.5);
    const heroMat = new window.THREE.MeshLambertMaterial({ color: animal.color || 0xe8a828 });
    runtimeCube = new window.THREE.Mesh(heroGeo, heroMat);
    runtimeCube.position.y = 0.6;
    runtimeScene.add(runtimeCube);
  }

  function renderRuntime(now = performance.now()) {
    if (!['hub', 'dialogue', 'questBoard', 'worldMap', 'zone', 'inventory', 'crafting', 'alphaEndCard'].includes(screen) || returned) return;
    const dt = Math.min(0.1, (now - lastFrameTime) / 1000);
    lastFrameTime = now;
    if (activeSave) activeSave.playtimeSeconds += dt;
    if (screen === 'zone' && combatState && activeSave) {
      const result = tickCombat(combatState, activeSave, dt);
      combatState = result.state;
      activeSave = result.save;
      if (result.events.length > 0) {
        processCombatEvents(result.events);
        activeSave = writeSaveSlot(localStorage, activeSave);
      }
    }
    if (runtimeCube) runtimeCube.rotation.y += dt;
    if (runtimeRenderer && runtimeScene && runtimeCamera) runtimeRenderer.render(runtimeScene, runtimeCamera);
    draw();
    frameId = requestAnimationFrame(renderRuntime);
  }

  function startSelectedSlot() {
    const result = readSaveSlot(localStorage, animal.id || 'leopard', selectedSlot);
    activeSave = result.save;
    activeSave.updatedAt = Date.now();
    if (result.empty || !result.valid) {
      activeSave = writeSaveSlot(localStorage, activeSave);
    }
    screen = 'hub';
    confirmDelete = false;
    selectedFocus = 0;
    selectedQuest = 0;
    selectedMapEntry = 0;
    selectedRecipe = 0;
    dialogueNpc = null;
    combatState = null;
    craftingMessage = '';
    rewardBanner = null;
    refreshHubState();
    initRuntimeScene();
    lastFrameTime = performance.now();
    draw();
    frameId = requestAnimationFrame(renderRuntime);
  }

  function handleDelete() {
    if (!confirmDelete) {
      confirmDelete = true;
      draw();
      return;
    }
    deleteSaveSlot(localStorage, animal.id || 'leopard', selectedSlot);
    refreshSlotSummaries();
    confirmDelete = false;
    draw();
  }

  function cleanup() {
    if (returned) return false;
    returned = true;
    if (frameId) cancelAnimationFrame(frameId);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('resize', resize);
    hudCanvas.removeEventListener('pointerdown', onPointerDown);
    hudCanvas.removeEventListener('mousedown', onPointerDown);
    hudCanvas.removeEventListener('touchstart', onPointerDown);
    if (activeSave) {
      activeSave.playtimeSeconds = Math.floor(activeSave.playtimeSeconds || 0);
      writeSaveSlot(localStorage, activeSave);
    }
    disposeRuntimeScene();
    hudCtx.clearRect(0, 0, hudCanvas.width, hudCanvas.height);
    canvas3d.style.display = 'none';
    hudCanvas.style.display = 'none';
    container.style.width = '960px';
    container.style.height = '540px';
    canvas3d.style.width = '960px';
    canvas3d.style.height = '540px';
    hudCanvas.style.width = '960px';
    hudCanvas.style.height = '540px';
    canvas2d.style.display = '';
    screen = 'cleaned';
    updateDebug();
    return true;
  }

  function disposeRuntimeScene() {
    if (runtimeScene) {
      runtimeScene.traverse(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) child.material.forEach(material => material.dispose());
          else child.material.dispose();
        }
      });
    }
    if (runtimeRenderer) {
      runtimeRenderer.dispose();
    }
    runtimeRenderer = null;
    runtimeScene = null;
    runtimeCamera = null;
    runtimeCube = null;
  }

  function returnToTitle() {
    if (cleanup()) {
      if (typeof window !== 'undefined') {
        window.__rpgReturnCount = (window.__rpgReturnCount || 0) + 1;
      }
      onReturn();
    }
  }

  function onKeyDown(e) {
    if (screen === 'alphaEndCard') {
      if (e.code === 'Enter' || e.code === 'Space' || e.code === 'Escape') {
        e.preventDefault();
        activeSave.flags.alphaEndCardSeen = true;
        activeSave = writeSaveSlot(localStorage, activeSave);
        screen = 'hub';
        draw();
      }
      return;
    }

    if (e.code === 'Escape') {
      e.preventDefault();
      if (confirmDelete) {
        confirmDelete = false;
        draw();
      } else if (['dialogue', 'questBoard', 'worldMap', 'zone', 'inventory', 'crafting'].includes(screen)) {
        screen = 'hub';
        dialogueNpc = null;
        craftingMessage = '';
        draw();
      } else {
        returnToTitle();
      }
      return;
    }

    if (screen === 'saveSelect') {
      if (e.code === 'ArrowLeft' || e.code === 'ArrowUp') {
        e.preventDefault();
        selectedSlot = (selectedSlot - 1 + slotSummaries.length) % slotSummaries.length;
        confirmDelete = false;
        draw();
        return;
      }
      if (e.code === 'ArrowRight' || e.code === 'ArrowDown') {
        e.preventDefault();
        selectedSlot = (selectedSlot + 1) % slotSummaries.length;
        confirmDelete = false;
        draw();
        return;
      }
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        if (confirmDelete) handleDelete();
        else startSelectedSlot();
        return;
      }
      if (e.code === 'Backspace' || e.code === 'Delete') {
        e.preventDefault();
        if (!slotSummaries[selectedSlot]?.empty) handleDelete();
      }
      return;
    }

    if (screen === 'hub') {
      if (e.code === 'ArrowLeft' || e.code === 'ArrowUp') {
        e.preventDefault();
        selectedFocus = (selectedFocus - 1 + focusItems.length) % focusItems.length;
        draw();
        return;
      }
      if (e.code === 'ArrowRight' || e.code === 'ArrowDown') {
        e.preventDefault();
        selectedFocus = (selectedFocus + 1) % focusItems.length;
        draw();
        return;
      }
      if (e.code === 'KeyQ') {
        e.preventDefault();
        screen = 'questBoard';
        draw();
        return;
      }
      if (e.code === 'KeyM') {
        e.preventDefault();
        screen = 'worldMap';
        draw();
        return;
      }
      if (e.code === 'KeyF') {
        e.preventDefault();
        startZone('forestEdge');
        return;
      }
      if (e.code === 'KeyT') {
        e.preventDefault();
        const quest = getActiveQuestTracker(activeSave);
        if (quest) startZone(quest.destinationZone);
        return;
      }
      if (e.code === 'KeyI') {
        e.preventDefault();
        screen = 'inventory';
        draw();
        return;
      }
      if (e.code === 'KeyC') {
        e.preventDefault();
        screen = 'crafting';
        draw();
        return;
      }
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        activateFocusedHubItem();
      }
      return;
    }

    if (screen === 'dialogue') {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        screen = 'hub';
        dialogueNpc = null;
        draw();
      }
      return;
    }

    if (screen === 'questBoard') {
      const available = getAvailableQuests(activeSave);
      if (e.code === 'ArrowUp' || e.code === 'ArrowLeft') {
        e.preventDefault();
        selectedQuest = (selectedQuest - 1 + Math.max(1, available.length)) % Math.max(1, available.length);
        draw();
        return;
      }
      if (e.code === 'ArrowDown' || e.code === 'ArrowRight') {
        e.preventDefault();
        selectedQuest = (selectedQuest + 1) % Math.max(1, available.length);
        draw();
        return;
      }
      if ((e.code === 'Enter' || e.code === 'Space') && available[selectedQuest]) {
        e.preventDefault();
        activeSave = acceptQuest(activeSave, available[selectedQuest].id);
        activeSave = writeSaveSlot(localStorage, activeSave);
        screen = 'hub';
        draw();
      }
      return;
    }

    if (screen === 'worldMap') {
      const entries = getWorldMapEntries(activeSave);
      if (e.code === 'ArrowLeft' || e.code === 'ArrowUp') {
        e.preventDefault();
        selectedMapEntry = (selectedMapEntry - 1 + entries.length) % entries.length;
        draw();
        return;
      }
      if (e.code === 'ArrowRight' || e.code === 'ArrowDown') {
        e.preventDefault();
        selectedMapEntry = (selectedMapEntry + 1) % entries.length;
        draw();
        return;
      }
      if ((e.code === 'Enter' || e.code === 'Space') && entries[selectedMapEntry]?.unlocked) {
        e.preventDefault();
        startZone(entries[selectedMapEntry].id);
      }
      return;
    }

    if (screen === 'zone') {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        const result = performPlayerAttack(combatState, activeSave);
        combatState = result.state;
        activeSave = result.save;
        processCombatEvents(result.events);
        activeSave = writeSaveSlot(localStorage, activeSave);
        draw();
        return;
      }
      if (e.code === 'KeyG') {
        e.preventDefault();
        const node = createGatheringNodes(activeSave, activeSave.currentZone).find(item => !item.collected);
        if (node) {
          const result = collectNode(activeSave, node);
          activeSave = result.save;
          processGatherEvent(result.event);
          maybeCompleteActiveQuest();
          activeSave = writeSaveSlot(localStorage, activeSave);
        }
        draw();
        return;
      }
      if (e.code === 'KeyE') {
        e.preventDefault();
        assistActiveQuest();
        maybeCompleteActiveQuest();
        activeSave = writeSaveSlot(localStorage, activeSave);
        draw();
        return;
      }
      if (e.code === 'KeyI') {
        e.preventDefault();
        screen = 'inventory';
        draw();
        return;
      }
    }

    if (screen === 'inventory') {
      if (e.code === 'KeyC') {
        e.preventDefault();
        screen = 'crafting';
        draw();
      }
      return;
    }

    if (screen === 'crafting') {
      const recipeIds = getRecipeIds();
      if (e.code === 'ArrowUp' || e.code === 'ArrowLeft') {
        e.preventDefault();
        selectedRecipe = (selectedRecipe - 1 + recipeIds.length) % recipeIds.length;
        draw();
        return;
      }
      if (e.code === 'ArrowDown' || e.code === 'ArrowRight') {
        e.preventDefault();
        selectedRecipe = (selectedRecipe + 1) % recipeIds.length;
        draw();
        return;
      }
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        const result = craftItem(activeSave, recipeIds[selectedRecipe]);
        activeSave = result.success ? writeSaveSlot(localStorage, result.save) : result.save;
        craftingMessage = result.success ? `Crafted ${result.label}` : result.reason;
        draw();
      }
    }
  }

  function startZone(zoneId) {
    if (!activeSave?.unlockedZones?.includes(zoneId)) return;
    activeSave.currentZone = zoneId;
    activeSave.player.hp = activeSave.player.maxHp;
    combatState = createCombatState(activeSave, zoneId);
    activeSave = writeSaveSlot(localStorage, activeSave);
    screen = 'zone';
    draw();
  }

  function assistActiveQuest() {
    const questId = activeSave?.quests?.active;
    if (!questId) return;
    activeSave.quests.progress = activeSave.quests.progress || {};
    activeSave.quests.progress[questId] = activeSave.quests.progress[questId] || {};
    const progress = activeSave.quests.progress[questId];
    if (questId === 'heroSignup') {
      progress.wood = 5;
      progress.tutorialZombies = 3;
    } else if (questId === 'bunnyRescue') {
      progress.rescuedRabbits = 3;
    } else if (questId === 'bananaEmergency') {
      progress.bananas = 8;
      progress.bananaCannon = 1;
      progress.bananaShot = 1;
      progress.zombies = 5;
    } else if (questId === 'turtleExpress') {
      progress.escortShellbert = 1;
    } else if (questId === 'statueReveal') {
      progress.glassTelescope = 1;
      progress.telescopePoint = 1;
    }
  }

  function processCombatEvents(events) {
    events.forEach(event => {
      if (event.kind !== 'defeatZombie') return;
      unlockFirstBonkSticker();
      if (!activeSave?.quests?.active) return;
      const questId = activeSave.quests.active;
      activeSave.quests.progress = activeSave.quests.progress || {};
      activeSave.quests.progress[questId] = activeSave.quests.progress[questId] || {};
      activeSave.quests.progress[questId].tutorialZombies = Math.min(
        3,
        (activeSave.quests.progress[questId].tutorialZombies || 0) + 1
      );
    });
    maybeCompleteActiveQuest();
  }

  function processGatherEvent(event) {
    if (!event || !activeSave?.quests?.active) return;
    if (event.kind !== 'ingredientCollected') return;
    const questId = activeSave.quests.active;
    activeSave.quests.progress = activeSave.quests.progress || {};
    activeSave.quests.progress[questId] = activeSave.quests.progress[questId] || {};
    if (event.ingredient === 'wood') {
      activeSave.quests.progress[questId].wood = Math.min(
        5,
        (activeSave.quests.progress[questId].wood || 0) + event.amount
      );
    }
  }

  function unlockFirstBonkSticker() {
    if (activeSave?.journal?.stickers?.includes('myFirstBonk')) return;
    const result = unlockSticker(activeSave, 'myFirstBonk');
    activeSave = result.save;
    if (result.unlocked) {
      rewardBanner = createRewardBanner({ title: 'MY FIRST BONK', stickers: ['myFirstBonk'] });
    }
  }

  function maybeCompleteActiveQuest() {
    const questId = activeSave?.quests?.active;
    if (!questId || !isQuestObjectiveComplete(activeSave, questId)) return;
    const result = completeQuest(activeSave, questId);
    if (!result.completed) return;
    activeSave = result.save;
    applyQuestReward(questId, result.reward);
  }

  function applyQuestReward(questId, reward) {
    if (reward.xp) activeSave = grantXp(activeSave, reward.xp).save;
    Object.entries(reward.ingredients || {}).forEach(([id, amount]) => {
      activeSave.ingredients[id] = (activeSave.ingredients[id] || 0) + amount;
    });
    (reward.recipes || []).forEach(recipeId => {
      if (!activeSave.unlockedRecipes.includes(recipeId)) activeSave.unlockedRecipes.push(recipeId);
    });
    (reward.unlockedZones || []).forEach(zoneId => {
      if (!activeSave.unlockedZones.includes(zoneId)) activeSave.unlockedZones.push(zoneId);
    });
    Object.entries(reward.reputation || {}).forEach(([species, rank]) => {
      // Reputation state remains serializable; progression-rpg validates in data tests.
      activeSave.reputation[species] = rank;
    });
    Object.entries(reward.rescued || {}).forEach(([id, value]) => {
      activeSave.rescued[id] = value;
    });
    Object.entries(reward.flags || {}).forEach(([id, value]) => {
      activeSave.flags[id] = value;
    });
    (reward.stickers || []).forEach(stickerId => {
      activeSave = unlockSticker(activeSave, stickerId).save;
    });
    if (reward.journalEntry) {
      activeSave = addJournalEntry(activeSave, reward.journalEntry.id, reward.journalEntry.text).save;
    }
    const questTitle = questId === 'heroSignup' ? 'The Hero Sign-Up Sheet' : questId;
    rewardBanner = createRewardBanner({ questTitle, ...reward });
    screen = questId === 'statueReveal' ? 'alphaEndCard' : 'hub';
  }

  function activateFocusedHubItem() {
    const focus = focusItems[selectedFocus];
    if (!focus) return;
    if (focus.type === 'npc') {
      dialogueNpc = focus.npc;
      screen = 'dialogue';
    } else if (focus.type === 'questBoard') {
      screen = 'questBoard';
    } else if (focus.type === 'worldMap') {
      screen = 'worldMap';
    }
    draw();
  }

  function getHudPoint(event) {
    const source = event.touches && event.touches.length > 0 ? event.touches[0] : event;
    if (source.clientX === undefined || source.clientY === undefined) return null;
    const rect = hudCanvas.getBoundingClientRect();
    return {
      x: (source.clientX - rect.left) * (hudCanvas.width / rect.width),
      y: (source.clientY - rect.top) * (hudCanvas.height / rect.height),
    };
  }

  function onPointerDown(event) {
    if (screen !== 'saveSelect') return;
    const point = getHudPoint(event);
    if (!point) return;
    const hit = hitTestSaveSlot(hudCanvas.width, hudCanvas.height, point.x, point.y);
    if (!hit) return;
    event.preventDefault();
    if (selectedSlot === hit.slot) startSelectedSlot();
    else {
      selectedSlot = hit.slot;
      confirmDelete = false;
      draw();
    }
  }

  container.style.width = '100vw';
  container.style.height = '100vh';
  canvas2d.style.display = 'none';
  canvas3d.style.display = 'block';
  hudCanvas.style.display = 'block';
  canvas3d.style.width = '100%';
  canvas3d.style.height = '100%';
  hudCanvas.style.width = '100%';
  hudCanvas.style.height = '100%';

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('resize', resize);
  hudCanvas.addEventListener('pointerdown', onPointerDown);
  hudCanvas.addEventListener('mousedown', onPointerDown);
  hudCanvas.addEventListener('touchstart', onPointerDown, { passive: false });
  resize();

  return { cleanup: returnToTitle };
}
