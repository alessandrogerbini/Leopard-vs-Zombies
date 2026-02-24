/**
 * Playwright script for capturing 3D mode screenshots for graphics analysis.
 *
 * Uses page.evaluate to directly manipulate game state for reliable menu navigation,
 * since the keyboard debounce system is tricky to drive externally.
 */

const { chromium } = require('/home/alessandro-gerbini/.nvm/versions/node/v22.22.0/lib/node_modules/playwright');
const path = require('path');

const SCREENSHOT_DIR = __dirname;
const PREFIX = 'gfx-';
const URL = 'http://localhost:8080/index.html';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function screenshot(page, name) {
  const filePath = path.join(SCREENSHOT_DIR, `${PREFIX}${name}.png`);
  await page.screenshot({ path: filePath, fullPage: false });
  console.log(`  Saved: ${PREFIX}${name}.png`);
}

/** Press a key with enough delay for the game loop to read it */
async function gameKeyPress(page, code, holdMs = 200) {
  await page.keyboard.down(code);
  await sleep(holdMs);
  await page.keyboard.up(code);
  await sleep(300); // Wait for debounce flag to clear
}

(async () => {
  console.log('Launching browser with WebGL support...');
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--enable-webgl',
      '--enable-webgl2',
      '--ignore-gpu-blocklist',
      '--enable-gpu-rasterization',
      '--disable-software-rasterizer',
    ]
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push(err.message));
  page.on('dialog', dialog => dialog.dismiss());

  console.log('Loading game...');
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await sleep(3000);

  // Check WebGL status
  const glInfo = await page.evaluate(() => {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    if (!gl) return 'NO WEBGL';
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    return dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.VERSION);
  });
  console.log('WebGL renderer:', glInfo);

  // === NAVIGATE TO 3D MODE ===
  console.log('\n--- Step 1: Title screen ---');
  await screenshot(page, '01-title');

  // Press Enter: title -> modeSelect
  console.log('--- Step 2: Press Enter -> Mode Select ---');
  await gameKeyPress(page, 'Enter');
  await sleep(500);
  await screenshot(page, '02-mode-select');

  // Check what state we are in
  let gameState = await page.evaluate(() => {
    // Access the game state module -- it is not directly accessible from window,
    // but the keydown/keyup handlers on window set keys[e.code]. Let's check
    // if the canvas is displaying the correct screen via pixel checking or
    // use the game's exposed state.
    const c = document.getElementById('game');
    return c ? c.style.display : 'no canvas';
  });
  console.log('  Canvas display:', gameState);

  // The mode select defaults to selectedMode=1 (3D Survivor).
  // Press Enter: modeSelect -> select (animal select, 3D mode)
  console.log('--- Step 3: Press Enter -> Animal Select ---');
  await gameKeyPress(page, 'Enter');
  await sleep(500);
  await screenshot(page, '03-animal-select');

  // Press Enter: select -> launch 3D game
  console.log('--- Step 4: Press Enter -> Launch 3D Game ---');
  await gameKeyPress(page, 'Enter');
  await sleep(5000); // Wait for 3D scene to initialize + terrain to load

  // Check if 3D canvas is visible
  const canvasState = await page.evaluate(() => {
    const c2d = document.getElementById('game');
    const c3d = document.getElementById('game3d');
    const hud = document.getElementById('hud');
    return {
      game: c2d ? c2d.style.display : 'not found',
      game3d: c3d ? c3d.style.display : 'not found',
      hud: hud ? hud.style.display : 'not found',
      game3dSize: c3d ? `${c3d.width}x${c3d.height}` : 'N/A',
    };
  });
  console.log('  Canvas state:', JSON.stringify(canvasState));

  if (errors.length > 0) {
    console.log('  Errors:', errors.slice(-3).join('; '));
  }

  await screenshot(page, '04-3d-initial');

  // === 3D GAMEPLAY SCREENSHOTS ===
  console.log('\n--- Step 5: Early gameplay (wait for enemies) ---');
  await sleep(5000);
  await screenshot(page, '05-early-gameplay');

  // Move player forward
  console.log('--- Step 6: Move forward (W) ---');
  await page.keyboard.down('KeyW');
  await sleep(3000);
  await page.keyboard.up('KeyW');
  await sleep(500);
  await screenshot(page, '06-terrain-forward');

  // Strafe to see different terrain
  console.log('--- Step 7: Strafe left (A) ---');
  await page.keyboard.down('KeyA');
  await sleep(2000);
  await page.keyboard.up('KeyA');
  await sleep(500);
  await screenshot(page, '07-terrain-side');

  // Wait for enemies to approach
  console.log('--- Step 8: Wait for zombies ---');
  await sleep(5000);
  await screenshot(page, '08-enemies');

  // Move into enemies
  console.log('--- Step 9: Move into combat ---');
  await page.keyboard.down('KeyW');
  await sleep(2000);
  await page.keyboard.up('KeyW');
  await sleep(1000);
  await screenshot(page, '09-combat');

  // Explore for decorations
  console.log('--- Step 10: Explore for trees ---');
  await page.keyboard.down('KeyW');
  await sleep(4000);
  await page.keyboard.up('KeyW');
  await screenshot(page, '10-trees');

  // Turn
  console.log('--- Step 11: Turn (D) ---');
  await page.keyboard.down('KeyD');
  await sleep(2000);
  await page.keyboard.up('KeyD');
  await sleep(500);
  await screenshot(page, '11-angle');

  // More exploration
  console.log('--- Step 12: More terrain ---');
  await page.keyboard.down('KeyW');
  await sleep(3000);
  await page.keyboard.up('KeyW');
  await page.keyboard.down('KeyD');
  await sleep(1500);
  await page.keyboard.up('KeyD');
  await screenshot(page, '12-overview');

  // Wait for later combat with more enemies
  console.log('--- Step 13: Later combat ---');
  await sleep(8000);
  await screenshot(page, '13-later-combat');

  // Back up to see distant terrain
  console.log('--- Step 14: Distant terrain ---');
  await page.keyboard.down('KeyS');
  await sleep(3000);
  await page.keyboard.up('KeyS');
  await screenshot(page, '14-distant');

  // HUD close-up (same as gameplay, shows HUD overlay)
  console.log('--- Step 15: HUD overlay ---');
  await screenshot(page, '15-hud');

  // Pause menu
  console.log('--- Step 16: Pause menu ---');
  await gameKeyPress(page, 'Escape');
  await sleep(500);
  await screenshot(page, '16-pause');

  // Resume
  await gameKeyPress(page, 'Escape');
  await sleep(500);

  // Final wide shot
  console.log('--- Step 17: Final exploration ---');
  await page.keyboard.down('KeyW');
  await sleep(5000);
  await page.keyboard.up('KeyW');
  await screenshot(page, '17-wide');

  await page.keyboard.down('KeyA');
  await sleep(3000);
  await page.keyboard.up('KeyA');
  await screenshot(page, '18-final');

  console.log('\nAll screenshots captured!');
  if (errors.length > 0) {
    console.log('\nPage errors:');
    errors.forEach(e => console.log('  ' + e));
  }

  await browser.close();
})();
