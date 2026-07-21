import puppeteer from 'puppeteer';

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';
const TIMEOUT = 30000;
const MODE_CASES = new Set([
  'mode-menu-three-cards',
  'mode-select-escape-routes',
  'rpg-launch-return',
  'repeated-mode-launches',
  'all-modes',
]);

const requestedCase = getArgValue('--case');
if (requestedCase && !MODE_CASES.has(requestedCase)) {
  throw new Error(`Unknown --case ${requestedCase}`);
}

function getArgValue(name) {
  const idx = process.argv.indexOf(name);
  return idx === -1 ? null : process.argv[idx + 1];
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
  console.log(`PASS: ${message}`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function tapKey(page, key, holdMs = 60) {
  await page.keyboard.down(key);
  await sleep(holdMs);
  await page.keyboard.up(key);
  await sleep(120);
}

async function withBrowser(fn) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox'],
  });
  try {
    await fn(browser);
  } finally {
    await browser.close();
  }
}

async function newPage(browser, { expose2dState = false } = {}) {
  const page = await browser.newPage();
  await page.setViewport({ width: 960, height: 540, deviceScaleFactor: 1 });

  const failures = [];
  page.on('pageerror', err => failures.push(`pageerror: ${err.message}`));
  page.on('console', msg => {
    if (msg.type() === 'error') failures.push(`console error: ${msg.text()}`);
  });
  page.on('requestfailed', req => {
    const type = req.resourceType();
    if (['document', 'script', 'stylesheet', 'image', 'media', 'xhr', 'fetch'].includes(type)) {
      const failure = req.failure();
      failures.push(`request failed: ${type} ${req.url()} ${failure ? failure.errorText : ''}`);
    }
  });

  if (expose2dState) {
    await page.setRequestInterception(true);
    page.on('request', async req => {
      const url = new URL(req.url());
      if (url.pathname.endsWith('/js/game.js')) {
        const response = await fetch(req.url());
        let body = await response.text();
        const marker = 'initRenderer(canvas);';
        if (!body.includes(marker)) {
          await req.abort();
          failures.push('Could not inject 2D debug state into game.js');
          return;
        }
        body = body.replace(
          marker,
          `${marker}\nwindow.__lvzTestState = state;\nwindow.__lvzTestKeys = keys;`
        );
        await req.respond({
          status: response.status,
          headers: { 'content-type': 'application/javascript' },
          body,
        });
      } else {
        await req.continue();
      }
    });
  }

  page.__assertNoFailures = () => {
    assert(failures.length === 0, failures.length ? failures.join('\n') : 'no page errors or failed critical requests');
  };

  return page;
}

async function gotoGame(page) {
  await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: TIMEOUT });
  await sleep(600);
}

async function canvasNonBlank(page, selector) {
  return page.$eval(selector, canvas => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return { width: canvas.width, height: canvas.height, colored: 0 };
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let colored = 0;
    for (let i = 0; i < data.length; i += 16) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      if (a > 0 && r + g + b > 24) colored++;
    }
    return { width: canvas.width, height: canvas.height, colored };
  });
}

async function assertCanvasNonBlank(page, selector, label) {
  const stats = await canvasNonBlank(page, selector);
  assert(stats.colored > 500, `${label} is nonblank (${stats.colored} sampled colored pixels)`);
}

async function waitForCanvasNonBlank(page, selector, label, timeoutMs = TIMEOUT) {
  const start = Date.now();
  let stats = { colored: 0 };
  while (Date.now() - start < timeoutMs) {
    stats = await canvasNonBlank(page, selector);
    if (stats.colored > 500) {
      assert(true, `${label} is nonblank (${stats.colored} sampled colored pixels)`);
      return;
    }
    await sleep(150);
  }
  assert(false, `${label} is nonblank (${stats.colored} sampled colored pixels)`);
}

async function clickModeCard(page, index) {
  const layout = await page.evaluate(async () => {
    const { getModeCardLayout } = await import('/js/mode-catalog.js');
    return getModeCardLayout(960, 540);
  });
  const card = layout.cards[index];
  assert(Boolean(card), `mode card ${index} exists in catalog layout`);

  const box = await page.$eval('#game', canvas => {
    const rect = canvas.getBoundingClientRect();
    return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
  });
  const cssX = box.left + (card.x + card.w / 2) * (box.width / 960);
  const cssY = box.top + (card.y + card.h / 2) * (box.height / 540);
  await page.mouse.click(cssX, cssY);
  await sleep(180);
}

async function moveModeSelection(page, modeIndex) {
  const currentMode = await page.evaluate(() => window.__lvzTestState.selectedMode);
  const modeCount = await page.evaluate(async () => {
    const { GAME_MODES } = await import('/js/mode-catalog.js');
    return GAME_MODES.length;
  });
  const stepsRight = (modeIndex - currentMode + modeCount) % modeCount;
  const stepsLeft = (currentMode - modeIndex + modeCount) % modeCount;
  if (stepsLeft < stepsRight) {
    for (let i = 0; i < stepsLeft; i++) await tapKey(page, 'ArrowLeft');
  } else {
    for (let i = 0; i < stepsRight; i++) await tapKey(page, 'ArrowRight');
  }
}

async function goTitleToModeSelect(page) {
  await tapKey(page, 'Enter');
  await page.waitForFunction(() => {
    const st = window.__lvzTestState;
    return !st || st.gameState === 'modeSelect';
  }, { timeout: TIMEOUT });
  await assertCanvasNonBlank(page, '#game', 'mode select canvas');
}

async function waitForRpgVisible(page) {
  await page.waitForFunction(() => {
    const game3d = document.getElementById('game3d');
    const hud3d = document.getElementById('hud3d');
    return getComputedStyle(game3d).display !== 'none'
      && getComputedStyle(hud3d).display !== 'none';
  }, { timeout: TIMEOUT });
  await waitForCanvasNonBlank(page, '#hud3d', 'RPG HUD canvas');
}

async function waitForTitleAfterExternalReturn(page) {
  await page.waitForFunction(() => {
    const game = document.getElementById('game');
    const game3d = document.getElementById('game3d');
    const hud3d = document.getElementById('hud3d');
    const stateOk = !window.__lvzTestState || window.__lvzTestState.gameState === 'title';
    return stateOk
      && getComputedStyle(game).display !== 'none'
      && getComputedStyle(game3d).display === 'none'
      && getComputedStyle(hud3d).display === 'none';
  }, { timeout: TIMEOUT });
  await assertCanvasNonBlank(page, '#game', 'title canvas after external return');
}

async function launchRpgByKeyboard(page) {
  await goTitleToModeSelect(page);
  await moveModeSelection(page, 2);
  await tapKey(page, 'Enter');
  await page.waitForFunction(() => !window.__lvzTestState || window.__lvzTestState.gameState === 'select', { timeout: TIMEOUT });
  await tapKey(page, 'Enter');
  await waitForRpgVisible(page);
}

async function navigateToAnimalSelect(page, modeIndex) {
  await gotoGame(page);
  await goTitleToModeSelect(page);
  await moveModeSelection(page, modeIndex);
  await tapKey(page, 'Enter');
  if (modeIndex === 0) {
    await page.waitForFunction(() => window.__lvzTestState.gameState === 'difficulty', { timeout: TIMEOUT });
    await tapKey(page, 'Enter');
  }
  await page.waitForFunction(() => window.__lvzTestState.gameState === 'select', { timeout: TIMEOUT });
}

async function returnFromRpg(page) {
  await tapKey(page, 'Escape');
  await waitForTitleAfterExternalReturn(page);
}

async function testModeMenuThreeCards() {
  await withBrowser(async browser => {
    const page = await newPage(browser, { expose2dState: true });
    await gotoGame(page);
    const catalogResult = await page.evaluate(async () => {
      const { GAME_MODES, getModeCardLayout, hitTestModeCard } = await import('/js/mode-catalog.js');
      const layout = getModeCardLayout(960, 540);
      const rpgCard = layout.cards[2];
      const hit = hitTestModeCard(960, 540, rpgCard.x + rpgCard.w / 2, rpgCard.y + rpgCard.h / 2);
      return {
        modeCount: GAME_MODES.length,
        labels: GAME_MODES.map(mode => mode.label),
        cards: layout.cards.map(card => ({
          label: card.mode.label,
          x: card.x,
          y: card.y,
          w: card.w,
          h: card.h,
        })),
        hitIndex: hit && hit.index,
        hitId: hit && hit.mode.id,
      };
    });
    assert(catalogResult.modeCount === 3, 'GAME_MODES exposes exactly three modes');
    assert(catalogResult.labels.join('|') === '2D CLASSIC|3D SURVIVOR|ANIMAL RESCUE', 'mode labels match startup menu contract');
    assert(catalogResult.cards.length === 3, 'mode layout returns three cards');
    for (const card of catalogResult.cards) {
      assert(card.x >= 0 && card.y >= 0, `${card.label} card starts inside canvas`);
      assert(card.x + card.w <= 960 && card.y + card.h <= 540, `${card.label} card fits inside 960x540`);
    }
    for (let i = 1; i < catalogResult.cards.length; i++) {
      assert(catalogResult.cards[i - 1].x + catalogResult.cards[i - 1].w < catalogResult.cards[i].x, 'mode cards do not overlap horizontally');
    }
    assert(catalogResult.hitIndex === 2 && catalogResult.hitId === 'animalRescueRpg', 'hit test identifies the Animal Rescue card');
    await page.evaluate(() => { window.__lvzTestState.selectedMode = 99; });
    await goTitleToModeSelect(page);
    const clampedMode = await page.evaluate(() => window.__lvzTestState.selectedMode);
    assert(clampedMode === 2, 'mode-menu entry clamps selectedMode to the last valid card');
    page.__assertNoFailures();
  });
}

async function testModeSelectEscapeRoutes() {
  const routes = [
    { label: '2D Classic', modeIndex: 0, expectedState: 'difficulty' },
    { label: '3D Survivor', modeIndex: 1, expectedState: 'modeSelect' },
    { label: 'Animal Rescue', modeIndex: 2, expectedState: 'modeSelect' },
  ];

  await withBrowser(async browser => {
    for (const route of routes) {
      const page = await newPage(browser, { expose2dState: true });
      await navigateToAnimalSelect(page, route.modeIndex);
      await tapKey(page, 'Escape');
      await page.waitForFunction(
        expectedState => window.__lvzTestState.gameState === expectedState,
        { timeout: TIMEOUT },
        route.expectedState
      );
      assert(true, `${route.label} animal-select Escape returns to ${route.expectedState}`);
      page.__assertNoFailures();
      await page.close();
    }
  });
}

async function testRpgLaunchReturn() {
  await withBrowser(async browser => {
    const page = await newPage(browser, { expose2dState: true });
    await gotoGame(page);
    await goTitleToModeSelect(page);
    await clickModeCard(page, 2);
    await clickModeCard(page, 2);
    await page.waitForFunction(() => window.__lvzTestState.gameState === 'select', { timeout: TIMEOUT });
    await tapKey(page, 'Enter');
    await waitForRpgVisible(page);
    await returnFromRpg(page);
    page.__assertNoFailures();
  });
}

async function testRepeatedModeLaunches() {
  await withBrowser(async browser => {
    const page = await newPage(browser, { expose2dState: true });
    await gotoGame(page);

    await launchRpgByKeyboard(page);
    await returnFromRpg(page);
    await launchRpgByKeyboard(page);
    await returnFromRpg(page);

    await goTitleToModeSelect(page);
    await moveModeSelection(page, 0);
    await tapKey(page, 'Enter');
    await page.waitForFunction(() => window.__lvzTestState.gameState === 'difficulty', { timeout: TIMEOUT });
    await tapKey(page, 'Enter');
    await page.waitForFunction(() => window.__lvzTestState.gameState === 'select', { timeout: TIMEOUT });
    await tapKey(page, 'Enter');
    await page.waitForFunction(() => window.__lvzTestState.gameState === 'playing', { timeout: TIMEOUT });
    await assertCanvasNonBlank(page, '#game', '2D Classic gameplay canvas');

    await page.evaluate(() => {
      Object.keys(window.__lvzTestKeys).forEach(key => { window.__lvzTestKeys[key] = false; });
      window.__lvzTestState.gameState = 'title';
      window.__lvzTestState.selectedMode = 1;
    });
    await sleep(250);
    await goTitleToModeSelect(page);
    await moveModeSelection(page, 1);
    await tapKey(page, 'Enter');
    await page.waitForFunction(() => window.__lvzTestState.gameState === 'select', { timeout: TIMEOUT });
    await tapKey(page, 'Enter');
    await page.waitForFunction(() => {
      const game3d = document.getElementById('game3d');
      const hud3d = document.getElementById('hud3d');
      return getComputedStyle(game3d).display !== 'none'
        && getComputedStyle(hud3d).display !== 'none';
    }, { timeout: TIMEOUT });
    await waitForCanvasNonBlank(page, '#hud3d', '3D Survivor HUD canvas');

    page.__assertNoFailures();
  });
}

const defaultCases = ['mode-menu-three-cards', 'mode-select-escape-routes', 'rpg-launch-return', 'repeated-mode-launches'];
const casesToRun = requestedCase
  ? requestedCase === 'all-modes' ? defaultCases : [requestedCase]
  : defaultCases;

for (const caseName of casesToRun) {
  console.log(`\n=== ${caseName} ===`);
  if (caseName === 'mode-menu-three-cards') await testModeMenuThreeCards();
  if (caseName === 'mode-select-escape-routes') await testModeSelectEscapeRoutes();
  if (caseName === 'rpg-launch-return') await testRpgLaunchReturn();
  if (caseName === 'repeated-mode-launches') await testRepeatedModeLaunches();
}
