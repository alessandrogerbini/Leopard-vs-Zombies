/**
 * Automated 6-minute playthrough of Leopard vs Zombies 3D mode (Playthrough 2).
 *
 * Menu flow: title -[Enter]-> modeSelect (defaults mode=1=3D) -[Enter]-> select (animal) -[Enter]-> 3D game
 * 3D controls: WASD movement, Space jump, Enter/B power attack, Tab minimap, Escape pause, M mute
 *
 * Takes screenshots every 30 seconds: pt2-0s.png through pt2-360s.png
 */
const { chromium } = require('/home/alessandro-gerbini/.nvm/versions/node/v22.22.0/lib/node_modules/playwright');

const OUTDIR = '/home/alessandro-gerbini/claude-projects/Leopard vs Zombies/screenshot-ai';
const URL = 'http://localhost:8080/index.html';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  console.log('=== Leopard vs Zombies: Playthrough 2 ===\n');
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
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push(err.message));

  async function screenshotAt(seconds) {
    const filename = `pt2-${seconds}s.png`;
    await page.screenshot({ path: `${OUTDIR}/${filename}` });
    console.log(`  [Screenshot] ${filename} (${Math.floor(seconds/60)}m${seconds%60}s)`);
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

    // Title screen screenshot
    await page.screenshot({ path: `${OUTDIR}/pt2-title.png` });
    console.log('  [Screenshot] pt2-title.png');

    // Press Enter: title -> modeSelect (sets selectedMode=1 = 3D Survivor)
    console.log('Pressing Enter (title -> modeSelect)...');
    await page.keyboard.press('Enter');
    await sleep(1500);
    await page.screenshot({ path: `${OUTDIR}/pt2-mode-select.png` });
    console.log('  [Screenshot] pt2-mode-select.png');

    // Mode defaults to 3D (mode=1). Press Enter -> animal select.
    console.log('Pressing Enter (modeSelect -> animal select)...');
    await page.keyboard.press('Enter');
    await sleep(1500);
    await page.screenshot({ path: `${OUTDIR}/pt2-animal-select.png` });
    console.log('  [Screenshot] pt2-animal-select.png');

    // Press Enter to start 3D game with leopard (selectedAnimal=0)
    console.log('Pressing Enter (select -> 3D game launch with Leopard)...');
    await page.keyboard.press('Enter');
    await sleep(8000); // Long wait for 3D init, terrain gen, model loading

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

    if (errors.length > 0) {
      console.log('Errors after game start:', errors.join('; '));
    }

    // ============================================================
    // PHASE 2: Active Gameplay (~6 minutes)
    // ============================================================
    console.log('\n--- Phase 2: Active Gameplay (6 minutes) ---');

    const GAMEPLAY_DURATION_SEC = 360; // 6 minutes
    const SCREENSHOT_INTERVAL_SEC = 30;
    const gameStartTime = Date.now();

    // Movement patterns: [keys, durationMs, description]
    const movePatterns = [
      [['w'], 5000, 'forward'],
      [['w', 'd'], 4000, 'forward-right diagonal'],
      [['d'], 3000, 'right'],
      [['w'], 6000, 'forward (long)'],
      [['w', 'a'], 3000, 'forward-left diagonal'],
      [['a'], 2500, 'left'],
      [['w'], 5000, 'forward'],
      [['s', 'd'], 2000, 'back-right'],
      [['w'], 7000, 'forward (very long)'],
      [['d'], 3000, 'right'],
      [['w'], 5000, 'forward'],
      [['w', 'a'], 4000, 'forward-left'],
      [['s'], 2000, 'backward'],
      [['w'], 5000, 'forward'],
      [['a'], 3500, 'left'],
      [['w', 'd'], 5000, 'forward-right'],
      [['w'], 4000, 'forward'],
      [['d'], 2500, 'right turn'],
      [['w'], 6000, 'forward'],
      [['s', 'a'], 2000, 'back-left'],
      [['w'], 7000, 'forward (long run)'],
      [['w', 'd'], 3000, 'forward-right'],
      [['w'], 5000, 'forward'],
      [['a'], 4000, 'left strafe long'],
      [['w'], 5000, 'forward'],
    ];

    let patternIndex = 0;
    let nextScreenshotSec = 0; // Start with 0s screenshot
    let nextJumpTime = Date.now() + 6000;
    let nextPowerAttackTime = Date.now() + 12000;
    let minimapDone = false;
    let pauseDone = false;

    // Take initial 0s screenshot
    await screenshotAt(0);
    nextScreenshotSec = SCREENSHOT_INTERVAL_SEC;

    while (true) {
      const elapsedMs = Date.now() - gameStartTime;
      const elapsedSec = elapsedMs / 1000;
      if (elapsedSec >= GAMEPLAY_DURATION_SEC) break;

      // Take screenshot at intervals
      if (elapsedSec >= nextScreenshotSec) {
        // Release all movement keys before screenshot for cleaner capture
        for (const k of ['w', 'a', 's', 'd']) await page.keyboard.up(k);
        await sleep(100);
        await screenshotAt(nextScreenshotSec);
        nextScreenshotSec += SCREENSHOT_INTERVAL_SEC;
      }

      // Minimap screenshot around 90s
      if (!minimapDone && elapsedSec >= 85 && elapsedSec < 95) {
        for (const k of ['w', 'a', 's', 'd']) await page.keyboard.up(k);
        await sleep(200);
        await page.keyboard.down('Tab');
        await sleep(1500);
        await page.screenshot({ path: `${OUTDIR}/pt2-minimap.png` });
        console.log('  [Screenshot] pt2-minimap.png');
        await page.keyboard.up('Tab');
        await sleep(200);
        minimapDone = true;
      }

      // Pause menu screenshot around 150s
      if (!pauseDone && elapsedSec >= 148 && elapsedSec < 155) {
        for (const k of ['w', 'a', 's', 'd']) await page.keyboard.up(k);
        await sleep(200);
        await page.keyboard.press('Escape');
        await sleep(1500);
        await page.screenshot({ path: `${OUTDIR}/pt2-pause.png` });
        console.log('  [Screenshot] pt2-pause.png');
        // Resume
        await page.keyboard.press('Escape');
        await sleep(500);
        pauseDone = true;
      }

      // Execute movement pattern
      const pattern = movePatterns[patternIndex % movePatterns.length];
      const [moveKeys, moveDuration, moveDesc] = pattern;

      // Start movement
      for (const k of moveKeys) await page.keyboard.down(k);

      const moveStart = Date.now();
      while (Date.now() - moveStart < moveDuration) {
        const now = Date.now();
        const currentElapsed = (now - gameStartTime) / 1000;
        if (currentElapsed >= GAMEPLAY_DURATION_SEC) break;

        // Check if screenshot is due (don't miss it during long movement)
        if (currentElapsed >= nextScreenshotSec && nextScreenshotSec <= GAMEPLAY_DURATION_SEC) {
          for (const k of moveKeys) await page.keyboard.up(k);
          await sleep(100);
          await screenshotAt(nextScreenshotSec);
          nextScreenshotSec += SCREENSHOT_INTERVAL_SEC;
          for (const k of moveKeys) await page.keyboard.down(k);
        }

        // Jump periodically
        if (now >= nextJumpTime) {
          await page.keyboard.press('Space');
          nextJumpTime = now + 6000 + Math.random() * 6000;
        }

        // Power attack (hold Enter briefly)
        if (now >= nextPowerAttackTime) {
          await page.keyboard.down('Enter');
          await sleep(600 + Math.random() * 800);
          await page.keyboard.up('Enter');
          nextPowerAttackTime = now + 12000 + Math.random() * 8000;
        }

        await sleep(200);
      }

      // Release movement keys
      for (const k of moveKeys) await page.keyboard.up(k);
      await sleep(250);
      patternIndex++;
    }

    // ============================================================
    // PHASE 3: Final Screenshots
    // ============================================================
    console.log('\n--- Phase 3: Final Screenshots ---');

    // Ensure we got the 360s screenshot
    if (nextScreenshotSec <= 360) {
      await screenshotAt(360);
    }

    // Final state info
    const finalInfo = await page.evaluate(() => {
      const canvases = document.querySelectorAll('canvas');
      return {
        canvasCount: canvases.length,
        visible: [...canvases].filter(c => c.style.display !== 'none').map(c => c.id)
      };
    });
    console.log('Final canvas state:', JSON.stringify(finalInfo));

    console.log('\n=== Playthrough 2 Complete ===');
    if (errors.length > 0) {
      console.log(`\n=== Console Errors (${errors.length}): ===`);
      errors.slice(-20).forEach(e => console.log('  ' + e));
    }

  } catch (err) {
    console.error('\nFATAL ERROR:', err.message);
    console.error(err.stack);
    try {
      await page.screenshot({ path: `${OUTDIR}/pt2-error.png` });
      console.log('  [Screenshot] pt2-error.png (error state)');
    } catch(e) {}
  } finally {
    await browser.close();
    console.log('Browser closed.');
  }
})();
