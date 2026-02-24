/**
 * Automated 6-minute playthrough of Leopard vs Zombies 3D mode.
 *
 * Menu flow: title -[Enter]-> modeSelect (defaults mode=1=3D) -[Enter]-> select (animal) -[Enter]-> 3D game
 * 3D controls: WASD movement, Space jump, Enter/B power attack, Tab minimap, Escape pause, M mute
 *
 * Takes screenshots at regular intervals during ~6 minutes of gameplay.
 */
const { chromium } = require('/home/alessandro-gerbini/.nvm/versions/node/v22.22.0/lib/node_modules/playwright');

const OUTDIR = '/home/alessandro-gerbini/claude-projects/Leopard vs Zombies/screenshot-ai';
const URL = 'http://localhost:8080';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/**
 * Hold a key for a specified duration.
 */
async function holdKey(page, key, ms) {
  await page.keyboard.down(key);
  await sleep(ms);
  await page.keyboard.up(key);
}

/**
 * Hold multiple keys simultaneously for a specified duration.
 */
async function holdKeys(page, keys, ms) {
  for (const k of keys) await page.keyboard.down(k);
  await sleep(ms);
  for (const k of keys) await page.keyboard.up(k);
}

(async () => {
  console.log('=== Leopard vs Zombies: 6-Minute Automated Playthrough ===\n');
  console.log('Launching browser with GPU support...');

  const browser = await chromium.launch({
    headless: true,
    executablePath: '/usr/bin/google-chrome-stable',
    args: [
      '--no-sandbox',
      '--enable-webgl',
      '--enable-webgl2',
      '--ignore-gpu-blocklist',
      '--enable-gpu-rasterization',
      '--enable-features=Vulkan',
      '--disable-software-rasterizer',
      '--use-gl=angle',
      '--use-angle=swiftshader',
    ]
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1
  });

  const page = await context.newPage();

  const errors = [];
  const consoleMessages = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
    consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
  });
  page.on('pageerror', err => errors.push(err.message));

  let screenshotIndex = 0;
  async function screenshot(name) {
    screenshotIndex++;
    const padded = String(screenshotIndex).padStart(2, '0');
    const filename = `playthrough-${padded}-${name}.png`;
    await page.screenshot({ path: `${OUTDIR}/${filename}` });
    console.log(`  [Screenshot ${padded}] ${filename}`);
    return filename;
  }

  try {
    // ============================================================
    // PHASE 1: Menu Navigation
    // ============================================================
    console.log('\n--- Phase 1: Menu Navigation ---');

    console.log('Loading game page...');
    await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
    await sleep(3000);

    // Check WebGL status
    const glInfo = await page.evaluate(() => {
      const c = document.createElement('canvas');
      const gl = c.getContext('webgl2') || c.getContext('webgl');
      if (!gl) return 'NO WEBGL';
      const dbg = gl.getExtension('WEBGL_debug_renderer_info');
      return dbg
        ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)
        : gl.getParameter(gl.VERSION);
    });
    console.log('WebGL renderer:', glInfo);

    // Title screen
    await screenshot('title-screen');

    // Press Enter: title -> modeSelect (defaults to mode=1 = 3D Survivor)
    console.log('Pressing Enter (title -> modeSelect)...');
    await page.keyboard.press('Enter');
    await sleep(1500);
    await screenshot('mode-select');

    // Mode defaults to 3D (mode=1). Press Enter to go to animal select.
    console.log('Pressing Enter (modeSelect -> animal select)...');
    await page.keyboard.press('Enter');
    await sleep(1500);
    await screenshot('animal-select');

    // Browse animals: press Right twice to see different animals, then go back to leopard
    await page.keyboard.press('ArrowRight');
    await sleep(800);
    await screenshot('animal-select-right1');
    await page.keyboard.press('ArrowRight');
    await sleep(800);
    await screenshot('animal-select-right2');
    // Go back to leopard (first animal)
    await page.keyboard.press('ArrowLeft');
    await sleep(500);
    await page.keyboard.press('ArrowLeft');
    await sleep(500);

    // Press Enter to start 3D game with leopard
    console.log('Pressing Enter (select -> 3D game launch)...');
    await page.keyboard.press('Enter');
    await sleep(6000); // Long wait for 3D initialization, terrain generation

    // Verify 3D canvas exists
    const canvasStatus = await page.evaluate(() => {
      const c3d = document.getElementById('game3d');
      const hud = document.getElementById('hud');
      return {
        game3d: c3d ? { width: c3d.width, height: c3d.height, display: c3d.style.display } : null,
        hud: hud ? { width: hud.width, height: hud.height } : null,
        game2d: document.getElementById('game')?.style.display
      };
    });
    console.log('Canvas status:', JSON.stringify(canvasStatus));

    await screenshot('game-start');

    if (errors.length > 0) {
      console.log('Errors after game start:', errors.slice(-5).join('; '));
    }

    // ============================================================
    // PHASE 2: Active Gameplay (~6 minutes)
    // ============================================================
    console.log('\n--- Phase 2: Active Gameplay (6 minutes) ---');

    const GAMEPLAY_DURATION_SEC = 360; // 6 minutes
    const SCREENSHOT_INTERVAL_SEC = 30;
    const gameStartTime = Date.now();

    // Movement patterns to simulate realistic gameplay
    const movePatterns = [
      // [keys, durationMs, description]
      [['w'], 4000, 'forward'],
      [['w', 'd'], 3000, 'forward-right diagonal'],
      [['d'], 2000, 'right'],
      [['w'], 5000, 'forward'],
      [['w', 'a'], 3000, 'forward-left diagonal'],
      [['a'], 2000, 'left'],
      [['w'], 4000, 'forward'],
      [['s', 'd'], 2000, 'back-right'],
      [['w'], 6000, 'forward (long run)'],
      [['d'], 3000, 'right'],
      [['w'], 4000, 'forward'],
      [['w', 'a'], 4000, 'forward-left'],
      [['s'], 2000, 'backward'],
      [['w'], 5000, 'forward'],
      [['a'], 3000, 'left'],
      [['w', 'd'], 5000, 'forward-right'],
      [['w'], 3000, 'forward'],
      [['d'], 2000, 'right circle'],
      [['w'], 4000, 'forward'],
      [['s', 'a'], 2000, 'back-left'],
      [['w'], 6000, 'forward (long run)'],
    ];

    let patternIndex = 0;
    let lastScreenshotSec = 0;
    let nextJumpTime = Date.now() + 8000; // Jump every ~8-12s
    let nextPowerAttackTime = Date.now() + 15000; // Power attack every ~15-20s
    let minimapTaken = false;

    while (true) {
      const elapsedSec = (Date.now() - gameStartTime) / 1000;
      if (elapsedSec >= GAMEPLAY_DURATION_SEC) break;

      // Take screenshot at intervals
      const currentIntervalSec = Math.floor(elapsedSec / SCREENSHOT_INTERVAL_SEC) * SCREENSHOT_INTERVAL_SEC;
      if (currentIntervalSec > lastScreenshotSec && currentIntervalSec <= elapsedSec) {
        lastScreenshotSec = currentIntervalSec;
        const minutes = Math.floor(currentIntervalSec / 60);
        const seconds = currentIntervalSec % 60;
        const timeLabel = `${minutes}m${seconds > 0 ? seconds + 's' : ''}`;
        await screenshot(`gameplay-${timeLabel}`);
        console.log(`  Elapsed: ${timeLabel} / 6m`);
      }

      // Take minimap screenshot around the 1.5-minute mark
      if (!minimapTaken && elapsedSec >= 90 && elapsedSec < 100) {
        // Release movement keys temporarily
        for (const k of ['w', 'a', 's', 'd']) await page.keyboard.up(k);
        await sleep(200);
        // Press Tab for minimap
        await page.keyboard.press('Tab');
        await sleep(1000);
        await screenshot('minimap-open');
        // Close minimap
        await page.keyboard.press('Tab');
        await sleep(200);
        minimapTaken = true;
      }

      // Take pause menu screenshot around 2.5 minutes
      if (elapsedSec >= 150 && elapsedSec < 151) {
        for (const k of ['w', 'a', 's', 'd']) await page.keyboard.up(k);
        await sleep(200);
        await page.keyboard.press('Escape');
        await sleep(1000);
        await screenshot('pause-menu');
        // Resume
        await page.keyboard.press('Escape');
        await sleep(500);
      }

      // Execute movement pattern
      const pattern = movePatterns[patternIndex % movePatterns.length];
      const [moveKeys, moveDuration, moveDesc] = pattern;

      // Start movement
      for (const k of moveKeys) await page.keyboard.down(k);

      // During movement, interleave jumps and power attacks
      const moveStart = Date.now();
      while (Date.now() - moveStart < moveDuration) {
        const now = Date.now();
        const currentElapsed = (now - gameStartTime) / 1000;
        if (currentElapsed >= GAMEPLAY_DURATION_SEC) break;

        // Jump periodically
        if (now >= nextJumpTime) {
          await page.keyboard.press('Space');
          nextJumpTime = now + 8000 + Math.random() * 4000;
        }

        // Power attack (hold Enter briefly, then release)
        if (now >= nextPowerAttackTime) {
          await page.keyboard.down('Enter');
          await sleep(800 + Math.random() * 600); // Charge 0.8-1.4s
          await page.keyboard.up('Enter');
          nextPowerAttackTime = now + 15000 + Math.random() * 10000;
        }

        await sleep(200); // Small tick
      }

      // Release movement keys
      for (const k of moveKeys) await page.keyboard.up(k);

      // Brief pause between movement patterns
      await sleep(300);
      patternIndex++;
    }

    // ============================================================
    // PHASE 3: Final Screenshots
    // ============================================================
    console.log('\n--- Phase 3: Final Screenshots ---');

    // Final gameplay state
    await screenshot('final-6min');

    // Get game stats via page evaluation
    const gameStats = await page.evaluate(() => {
      // Try to read HUD or game state info from the page
      const canvases = document.querySelectorAll('canvas');
      return {
        canvasCount: canvases.length,
        visibleCanvases: [...canvases].filter(c => c.style.display !== 'none').map(c => ({
          id: c.id,
          width: c.width,
          height: c.height
        }))
      };
    });
    console.log('Final game stats:', JSON.stringify(gameStats));

    // Open minimap one more time at end if we missed it
    if (!minimapTaken) {
      await page.keyboard.press('Tab');
      await sleep(1000);
      await screenshot('minimap-final');
      await page.keyboard.press('Tab');
      await sleep(200);
    }

    console.log('\n=== Playthrough Complete ===');
    console.log(`Total screenshots: ${screenshotIndex}`);
    if (errors.length > 0) {
      console.log(`\n=== Console Errors (${errors.length}): ===`);
      errors.forEach(e => console.log('  ' + e));
    }

  } catch (err) {
    console.error('\nFATAL ERROR:', err.message);
    try { await screenshot('error-state'); } catch(e) {}
  } finally {
    await browser.close();
    console.log('Browser closed.');
  }
})();
