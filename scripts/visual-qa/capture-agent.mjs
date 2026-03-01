/**
 * Visual QA Capture Agent
 *
 * Puppeteer script that captures screenshots of the player model at various
 * levels and with wearables equipped, for visual comparison against concept art.
 *
 * Usage: node scripts/visual-qa/capture-agent.mjs [iteration]
 *   iteration: optional number (default 1) for output directory naming
 */
import puppeteer from 'puppeteer';
import { setTimeout as sleep } from 'timers/promises';
import { installDebugHooks } from './debug-injector.mjs';
import path from 'path';
import fs from 'fs';

const BASE_DIR = path.resolve(import.meta.dirname, '../../screenshots');
const ITERATION = parseInt(process.argv[2]) || 1;
const OUT_DIR = path.join(BASE_DIR, `qa-iteration-${ITERATION}`);

// Levels to capture
const LEVELS = [1, 5, 8, 10, 15, 20];

// Camera angles: [name, angleDeg, distance, height]
const ANGLES = [
  ['front', 0, 4, 2.5],
  ['three-quarter', 45, 4, 2.5],
  ['gameplay', 0, 14, 18],
];

// Wearables to test at level 10: [slot, id, name]
const WEARABLE_TESTS = [
  ['body', 'cardboardBox', 'cardboard-box'],
  ['body', 'bumbleArmor', 'bumble-armor'],
  ['body', 'knightPlate', 'knight-plate'],
];

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log(`=== Visual QA Capture — Iteration ${ITERATION} ===`);
  console.log(`Output: ${OUT_DIR}`);

  const browser = await puppeteer.launch({
    headless: 'shell',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--enable-webgl',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--disable-gpu-sandbox',
      '--ignore-gpu-blocklist',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 960, height: 540 });

  // Capture console and errors for debugging
  const pageLogs = [];
  page.on('console', msg => pageLogs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => pageLogs.push(`[PAGE ERROR] ${err.message}`));

  // Install debug hooks via request interception
  await installDebugHooks(page);

  // Navigate to game
  console.log('Navigating to game...');
  await page.goto('http://localhost:8080', { waitUntil: 'networkidle0', timeout: 30000 });

  // Wait for title screen to render
  console.log('Waiting for title screen (5s)...');
  await sleep(5000);

  // Helper: press Enter with proper debounce timing for game loop
  async function pressEnter() {
    await page.keyboard.down('Enter');
    await sleep(200);
    await page.keyboard.up('Enter');
    await sleep(500);
  }

  // Navigate: title -> modeSelect -> select -> 3D game
  console.log('Navigating to 3D game (leopard)...');
  await pressEnter(); // title -> modeSelect
  await pressEnter(); // modeSelect -> select (3D Survivor)
  await pressEnter(); // select -> launch 3D game (leopard)

  // Wait for 3D game to fully initialize
  console.log('Waiting for 3D game init (10s)...');
  await sleep(10000);

  // Poll for debug hooks (they're set inside launch3DGame which may take time)
  let hookReady = false;
  for (let attempt = 0; attempt < 10; attempt++) {
    hookReady = await page.evaluate(() => !!window.__debugSt && !!window.__debugModel);
    if (hookReady) break;
    console.log(`  Waiting for hooks (attempt ${attempt + 1}/10)...`);
    await sleep(2000);
  }

  if (!hookReady) {
    console.error('ERROR: Debug hooks not available after 30s!');
    console.error('Page logs:');
    for (const log of pageLogs.slice(-20)) console.error('  ', log);
    await browser.close();
    process.exit(1);
  }
  console.log('Debug hooks verified.');

  // --- Capture at each level and angle ---
  for (const level of LEVELS) {
    console.log(`\n--- Level ${level} ---`);
    await page.evaluate((lvl) => window.__setLevel(lvl), level);
    await sleep(500);

    for (const [angleName, angleDeg, dist, height] of ANGLES) {
      await page.evaluate(
        (a, d, h) => window.__orbitCamera(a, d, h),
        angleDeg, dist, height
      );
      await sleep(400);

      const filename = `level-${String(level).padStart(2, '0')}-${angleName}.png`;
      await page.screenshot({ path: path.join(OUT_DIR, filename), fullPage: false });
      console.log(`  Saved: ${filename}`);
    }
  }

  // --- Wearable tests at level 10 ---
  console.log('\n--- Wearable Tests (Level 10) ---');
  await page.evaluate(() => window.__setLevel(10));
  await sleep(300);

  for (const [slot, wearableId, name] of WEARABLE_TESTS) {
    // Clear all wearables first
    await page.evaluate(() => {
      window.__equipWearable('head', null);
      window.__equipWearable('body', null);
      window.__equipWearable('feet', null);
    });
    await sleep(100);

    // Equip the test wearable
    await page.evaluate((s, id) => window.__equipWearable(s, id), slot, wearableId);
    await sleep(300);

    // Front view for wearable check
    await page.evaluate(() => window.__orbitCamera(0, 4, 2.5));
    await sleep(400);

    const filename = `wearable-${name}-front.png`;
    await page.screenshot({ path: path.join(OUT_DIR, filename), fullPage: false });
    console.log(`  Saved: ${filename}`);
  }

  // --- Metadata ---
  const metadata = {
    iteration: ITERATION,
    timestamp: new Date().toISOString(),
    levels: LEVELS,
    angles: ANGLES.map(a => a[0]),
    wearables: WEARABLE_TESTS.map(w => w[2]),
    pageLogs: pageLogs.slice(-30),
  };
  fs.writeFileSync(path.join(OUT_DIR, 'metadata.json'), JSON.stringify(metadata, null, 2));
  console.log('\nMetadata saved.');

  await browser.close();
  console.log('Done! Screenshots saved to:', OUT_DIR);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
