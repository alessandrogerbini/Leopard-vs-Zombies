/**
 * @module game-rpg
 * @description Animal Rescue RPG orchestrator for save-slot selection and alpha runtime ownership.
 *
 * Dependencies: save-system.js, hud-rpg.js, shared DOM canvases supplied by game.js
 * Exports: launchRPGGame
 */

import { deleteSaveSlot, listSaveSummaries, readSaveSlot, writeSaveSlot } from './rpg/save-system.js';
import { drawRuntimeShell, drawSaveSelect, hitTestSaveSlot } from './rpg/hud-rpg.js';

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

  function updateDebug() {
    if (typeof window === 'undefined') return;
    window.__rpgDebug = {
      screen,
      animalId: animal.id || 'leopard',
      selectedSlot,
      slotSummaries,
      canvasCount: [canvas3d, hudCanvas].filter(Boolean).length,
      activeSave: activeSave ? {
        animalId: activeSave.animalId,
        slot: activeSave.slot,
        currentZone: activeSave.currentZone,
        player: activeSave.player,
      } : null,
    };
  }

  function draw() {
    if (screen === 'saveSelect') {
      drawSaveSelect(hudCtx, { animal, slotSummaries, selectedSlot, confirmDelete });
    } else if (activeSave) {
      drawRuntimeShell(hudCtx, { animal, save: activeSave });
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
    if (screen !== 'runtime' || returned) return;
    const dt = Math.min(0.1, (now - lastFrameTime) / 1000);
    lastFrameTime = now;
    if (activeSave) activeSave.playtimeSeconds += dt;
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
    screen = 'runtime';
    confirmDelete = false;
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
    if (e.code === 'Escape') {
      e.preventDefault();
      if (confirmDelete) {
        confirmDelete = false;
        draw();
      } else {
        returnToTitle();
      }
      return;
    }

    if (screen !== 'saveSelect') return;
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
