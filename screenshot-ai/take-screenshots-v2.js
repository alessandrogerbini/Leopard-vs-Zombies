const { chromium } = require('/home/alessandro-gerbini/.nvm/versions/node/v22.22.0/lib/node_modules/playwright');

const OUTDIR = '/home/alessandro-gerbini/claude-projects/Leopard vs Zombies/screenshot-ai';
const URL = 'http://localhost:8080';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  console.log('Launching browser with WebGL flags...');
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-webgl',
      '--ignore-gpu-blocklist'
    ]
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });

  const page = await context.newPage();

  const logs = [];
  page.on('console', msg => {
    const text = msg.text();
    logs.push(`[${msg.type()}] ${text}`);
  });

  page.on('pageerror', err => {
    logs.push(`[PAGE_ERROR] ${err.message}`);
  });

  try {
    // 1. Load the page
    console.log('Navigating to game...');
    await page.goto(URL, { waitUntil: 'networkidle', timeout: 20000 });
    await sleep(3000); // Extra time for Three.js init + first render

    // Check WebGL support
    const webglInfo = await page.evaluate(() => {
      const c = document.createElement('canvas');
      const gl = c.getContext('webgl2') || c.getContext('webgl');
      if (!gl) return 'NO WEBGL';
      const dbg = gl.getExtension('WEBGL_debug_renderer_info');
      return {
        renderer: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'unknown',
        vendor: dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : 'unknown',
        version: gl.getParameter(gl.VERSION)
      };
    });
    console.log('WebGL info:', JSON.stringify(webglInfo));

    // Check canvas state
    const canvasInfo = await page.evaluate(() => {
      const canvases = document.querySelectorAll('canvas');
      return Array.from(canvases).map((c, i) => ({
        index: i,
        width: c.width,
        height: c.height,
        id: c.id || '(no id)',
        className: c.className || '(no class)',
        style: c.style.cssText.substring(0, 200)
      }));
    });
    console.log('Canvas elements:', JSON.stringify(canvasInfo, null, 2));

    // Screenshot 1: Title screen (with enhanced WebGL)
    console.log('\n=== Screenshot 01: Title Screen ===');
    await page.screenshot({ path: `${OUTDIR}/v2-01-title-screen.png` });

    // 2. Press Enter -> should go to difficulty select (2D mode is gated)
    console.log('\n=== Screenshot 02: After Enter (difficulty select?) ===');
    await page.keyboard.press('Enter');
    await sleep(2000);
    await page.screenshot({ path: `${OUTDIR}/v2-02-difficulty-select.png` });

    // 3. Press Enter -> select default difficulty, should launch 3D game
    console.log('\n=== Screenshot 03: After second Enter (3D game loading?) ===');
    await page.keyboard.press('Enter');
    await sleep(4000); // Extra time for 3D scene setup

    // Check if Three.js scene is active
    const threeInfo = await page.evaluate(() => {
      // Look for Three.js renderer
      const canvases = document.querySelectorAll('canvas');
      const info = [];
      canvases.forEach((c, i) => {
        const ctx2d = c.getContext('2d');
        const hasWebGL = !ctx2d; // If 2d context fails, it's a WebGL canvas
        info.push({ i, w: c.width, h: c.height, is2d: !!ctx2d });
      });
      return info;
    });
    console.log('Canvas contexts after game start:', JSON.stringify(threeInfo));

    await page.screenshot({ path: `${OUTDIR}/v2-03-game-start.png` });

    // 4. Wait for gameplay, enemies should start spawning
    console.log('\n=== Screenshot 04: Early gameplay (8s in) ===');
    await sleep(5000);
    await page.screenshot({ path: `${OUTDIR}/v2-04-early-gameplay.png` });

    // 5. Move around with WASD
    console.log('\n=== Screenshot 05: After movement ===');
    await page.keyboard.down('w');
    await page.keyboard.down('d');
    await sleep(2000);
    await page.keyboard.up('w');
    await page.keyboard.up('d');
    await sleep(1000);
    await page.screenshot({ path: `${OUTDIR}/v2-05-after-movement.png` });

    // 6. More gameplay - enemies should be present
    console.log('\n=== Screenshot 06: Mid gameplay (15s in) ===');
    await page.keyboard.down('w');
    await sleep(3000);
    await page.keyboard.up('w');
    await page.keyboard.down('a');
    await sleep(2000);
    await page.keyboard.up('a');
    await sleep(2000);
    await page.screenshot({ path: `${OUTDIR}/v2-06-mid-gameplay.png` });

    // 7. Pause menu
    console.log('\n=== Screenshot 07: Pause menu ===');
    await page.keyboard.press('Escape');
    await sleep(1000);
    await page.screenshot({ path: `${OUTDIR}/v2-07-pause-menu.png` });

    // Unpause
    await page.keyboard.press('Escape');
    await sleep(500);

    // 8. Hold Enter for power attack charge
    console.log('\n=== Screenshot 08: Power attack charging ===');
    await page.keyboard.down('Enter');
    await sleep(1500);
    await page.screenshot({ path: `${OUTDIR}/v2-08-power-charge.png` });
    await page.keyboard.up('Enter');
    await sleep(1000);

    // 9. Late gameplay
    console.log('\n=== Screenshot 09: Late gameplay (30s+ in) ===');
    await page.keyboard.down('s');
    await page.keyboard.down('d');
    await sleep(3000);
    await page.keyboard.up('s');
    await page.keyboard.up('d');
    await sleep(2000);
    await page.screenshot({ path: `${OUTDIR}/v2-09-late-gameplay.png` });

    // Print last few console logs for debugging
    console.log('\n=== Recent page console logs (last 20): ===');
    logs.slice(-20).forEach(l => console.log('  ' + l));

    console.log('\nAll v2 screenshots taken successfully!');

  } catch (err) {
    console.error('Error:', err.message);
    console.error(err.stack);
    try {
      await page.screenshot({ path: `${OUTDIR}/v2-error-state.png` });
    } catch (e) {}
    console.log('\n=== Console logs at error: ===');
    logs.slice(-30).forEach(l => console.log('  ' + l));
  } finally {
    await browser.close();
    console.log('Browser closed.');
  }
})();
