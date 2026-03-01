/**
 * Debug Injector — Puppeteer request-interception module
 *
 * Injects debug hooks into game3d.js at runtime via response interception
 * (no source file edits). Uses the proven pattern from test-results/test-boss-and-death.mjs.
 *
 * Exposes on window:
 *   __debugSt          — game state object
 *   __debugModel        — player model object
 *   __debugCamera       — Three.js camera
 *   __setLevel(n)       — set level and trigger muscle growth update
 *   __equipWearable(slot, id) — equip a wearable and update visuals
 *   __orbitCamera(angle, dist, height) — reposition camera for inspection shots
 */
import fs from 'fs';
import path from 'path';

/**
 * Install request interception on a Puppeteer page to inject debug hooks into game3d.js.
 * Reads the source file directly and modifies it before serving.
 *
 * @param {import('puppeteer').Page} page - The Puppeteer page to intercept.
 */
export async function installDebugHooks(page) {
  await page.setRequestInterception(true);

  page.on('request', async (interceptedRequest) => {
    const url = interceptedRequest.url();

    // Only intercept game3d.js requests
    if (!url.includes('/js/game3d.js')) {
      interceptedRequest.continue();
      return;
    }

    try {
      // Read the source file directly from disk
      const gameDir = path.resolve(import.meta.dirname, '../../');
      const filePath = path.join(gameDir, 'js/game3d.js');
      let body = fs.readFileSync(filePath, 'utf-8');

      // --- Hook 1: Expose st (game state) after keydown listener ---
      // NOTE: camera is declared AFTER this point (line 1036), so we can't
      // reference it here (temporal dead zone). It's set in Hook 2 instead.
      const marker1 = "window.addEventListener('keydown', onKeyDown);";
      if (body.includes(marker1)) {
        body = body.replace(marker1, `${marker1}
  window.__debugSt = st;`);
        console.log('  [inject] Hook 1: __debugSt injected');
      } else {
        console.log('  [inject] WARNING: marker1 not found');
      }

      // --- Hook 2: Expose playerModel + debug helpers after creation ---
      const marker2 = 'const playerModel = buildPlayerModel(animalId, scene);';
      if (body.includes(marker2)) {
        body = body.replace(marker2, `${marker2}
  window.__debugModel = playerModel;
  window.__debugCamera = camera;
  window.__debugAnimalId = animalId;
  window.__updateMuscleGrowth = updateMuscleGrowth;
  window.__updateWearableVisuals = updateWearableVisuals;
  window.__updateItemVisuals = updateItemVisuals;

  // Debug: set level and trigger muscle growth (suppresses level-up menu)
  window.__setLevel = function(n) {
    st.level = n;
    st._lastGrowthLevel = -1; // force re-render next frame
    st.upgradeMenu = false;   // suppress level-up menu overlay
    st.paused = false;        // unpause game
    st.chargeShrineMenu = false;
    st.wearableCompare = null;
    st.itemFanfare = null;
    updateMuscleGrowth(playerModel, n);
  };

  // Debug: equip wearable and update visuals
  window.__equipWearable = function(slot, id) {
    if (!st.wearables) st.wearables = { head: null, body: null, feet: null };
    st.wearables[slot] = id;
    updateWearableVisuals(playerModel, st.wearables, st.level);
  };

  // Debug: orbit camera around player for inspection
  window.__orbitCamera = function(angleDeg, dist, height) {
    const rad = (angleDeg || 0) * Math.PI / 180;
    const d = dist || 4;
    const h = height || 3;
    const px = st.playerX || 0;
    const pz = st.playerZ || 0;
    camera.position.set(px + Math.sin(rad) * d, h, pz + Math.cos(rad) * d);
    camera.lookAt(px, 1.0, pz);
  };`);
        console.log('  [inject] Hook 2: __debugModel + helpers injected');
      } else {
        console.log('  [inject] WARNING: marker2 not found');
      }

      interceptedRequest.respond({
        status: 200,
        contentType: 'application/javascript',
        body: body,
      });
    } catch (err) {
      console.error('  [inject] Error:', err.message);
      interceptedRequest.continue();
    }
  });
}
