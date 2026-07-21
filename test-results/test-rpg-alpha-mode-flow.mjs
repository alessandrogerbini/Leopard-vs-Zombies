import puppeteer from 'puppeteer';

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';
const TIMEOUT = 30000;
const CASES = new Set([
  'rpg-save-select',
  'cleanup',
  'hub-dialogue-world-map',
  'combat-death-respawn',
]);

const requestedCase = getArgValue('--case');
if (requestedCase && !CASES.has(requestedCase)) {
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
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    await fn(browser);
  } finally {
    await browser.close();
  }
}

async function newPage(browser) {
  const page = await browser.newPage();
  await page.setViewport({ width: 960, height: 540, deviceScaleFactor: 1 });
  const failures = [];

  await page.setRequestInterception(true);
  page.on('request', async req => {
    const url = new URL(req.url());
    if (url.pathname.endsWith('/js/game.js')) {
      const response = await fetch(req.url());
      let body = await response.text();
      const marker = 'initRenderer(canvas);';
      if (!body.includes(marker)) {
        failures.push('Could not inject test state into game.js');
        await req.abort();
        return;
      }
      body = body.replace(marker, `${marker}\nwindow.__lvzTestState = state;\nwindow.__lvzTestKeys = keys;`);
      await req.respond({ status: response.status, headers: { 'content-type': 'application/javascript' }, body });
    } else {
      await req.continue();
    }
  });

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

  page.__assertNoFailures = () => assert(failures.length === 0, failures.join('\n') || 'no page errors or failed critical requests');
  return page;
}

async function canvasStats(page, selector) {
  return page.$eval(selector, canvas => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return { colored: 0 };
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let colored = 0;
    for (let i = 0; i < data.length; i += 16) {
      const a = data[i + 3];
      if (a > 0 && data[i] + data[i + 1] + data[i + 2] > 24) colored++;
    }
    return { colored };
  });
}

async function waitForHudNonBlank(page, label) {
  const start = Date.now();
  let stats = { colored: 0 };
  while (Date.now() - start < TIMEOUT) {
    stats = await canvasStats(page, '#hud3d');
    if (stats.colored > 500) {
      assert(true, `${label} HUD is nonblank (${stats.colored} sampled colored pixels)`);
      return;
    }
    await sleep(150);
  }
  assert(false, `${label} HUD is nonblank (${stats.colored} sampled colored pixels)`);
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

async function launchRpgToSaveSelect(page) {
  await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: TIMEOUT });
  await sleep(600);
  await page.evaluate(() => localStorage.clear());
  await tapKey(page, 'Enter');
  await page.waitForFunction(() => window.__lvzTestState.gameState === 'modeSelect', { timeout: TIMEOUT });
  await moveModeSelection(page, 2);
  await tapKey(page, 'Enter');
  await page.waitForFunction(() => window.__lvzTestState.gameState === 'select', { timeout: TIMEOUT });
  await tapKey(page, 'Enter');
  await page.waitForFunction(() => window.__rpgDebug && window.__rpgDebug.screen === 'saveSelect', { timeout: TIMEOUT });
  await waitForHudNonBlank(page, 'save select');
}

async function waitForTitle(page) {
  await page.waitForFunction(() => {
    const game = document.getElementById('game');
    const game3d = document.getElementById('game3d');
    const hud3d = document.getElementById('hud3d');
    return window.__lvzTestState.gameState === 'title'
      && getComputedStyle(game).display !== 'none'
      && getComputedStyle(game3d).display === 'none'
      && getComputedStyle(hud3d).display === 'none';
  }, { timeout: TIMEOUT });
}

async function testRpgSaveSelect() {
  await withBrowser(async browser => {
    const page = await newPage(browser);
    await launchRpgToSaveSelect(page);
    const debug = await page.evaluate(() => window.__rpgDebug);
    assert(debug.animalId === 'leopard', 'RPG save select receives selected animal');
    assert(debug.slotSummaries.length === 3, 'RPG save select exposes three slots');
    assert(debug.slotSummaries.every(slot => slot.label === 'NEW QUEST'), 'empty slots are labeled NEW QUEST');
    assert(debug.canvasCount === 2, 'RPG uses existing shared 3D canvases');
    page.__assertNoFailures();
  });
}

async function testCleanup() {
  await withBrowser(async browser => {
    const page = await newPage(browser);
    await launchRpgToSaveSelect(page);
    await tapKey(page, 'Escape');
    await waitForTitle(page);
    const afterFirstReturn = await page.evaluate(() => window.__rpgReturnCount || 0);
    assert(afterFirstReturn === 1, 'Escape from save select returns to title once');

    await tapKey(page, 'Enter');
    await page.waitForFunction(() => window.__lvzTestState.gameState === 'modeSelect', { timeout: TIMEOUT });
    await moveModeSelection(page, 2);
    await tapKey(page, 'Enter');
    await page.waitForFunction(() => window.__lvzTestState.gameState === 'select', { timeout: TIMEOUT });
    await tapKey(page, 'Enter');
    await page.waitForFunction(() => window.__rpgDebug && window.__rpgDebug.screen === 'saveSelect', { timeout: TIMEOUT });
    await tapKey(page, 'Escape');
    await waitForTitle(page);
    const afterSecondReturn = await page.evaluate(() => window.__rpgReturnCount || 0);
    assert(afterSecondReturn === 2, 'second RPG launch also returns exactly once');
    const hudPixels = await canvasStats(page, '#hud3d');
    assert(hudPixels.colored === 0, 'RPG cleanup clears HUD pixels');
    page.__assertNoFailures();
  });
}

async function launchRpgToHub(page) {
  await launchRpgToSaveSelect(page);
  await tapKey(page, 'Enter');
  await page.waitForFunction(() => window.__rpgDebug && window.__rpgDebug.screen === 'hub', { timeout: TIMEOUT });
  await waitForHudNonBlank(page, 'hub');
}

async function testHubDialogueWorldMap() {
  await withBrowser(async browser => {
    const page = await newPage(browser);
    await launchRpgToHub(page);
    let debug = await page.evaluate(() => window.__rpgDebug);
    assert(debug.hub.enemies === 0, 'hub has no enemies');
    assert(debug.hub.damageSources === 0, 'hub has no damage sources');
    assert(debug.hub.interactables.includes('questBoard'), 'hub exposes quest board prompt');
    assert(debug.hub.interactables.includes('craftingBench'), 'hub exposes crafting bench prompt');
    assert(debug.hub.interactables.includes('worldMap'), 'hub exposes world map prompt');
    assert(debug.hub.interactables.includes('playerTent'), 'hub exposes tent prompt');
    assert(debug.hub.interactables.includes('storageChest'), 'hub exposes storage chest prompt');
    assert(debug.hub.npcs.length === 4, 'hub exposes four named NPC prompts');
    assert(debug.hub.npcs[0].name === 'Granny Thistle', 'Granny Thistle is the first hub NPC');

    await tapKey(page, 'Enter');
    await page.waitForFunction(() => window.__rpgDebug && window.__rpgDebug.screen === 'dialogue', { timeout: TIMEOUT });
    debug = await page.evaluate(() => window.__rpgDebug);
    assert(debug.dialogue.name === 'Granny Thistle', 'Enter opens focused NPC dialogue');
    assert(debug.dialogue.lines.length <= 2, 'dialogue page has no more than two lines');
    assert(debug.dialogue.lines.every(line => line.length <= 54), 'dialogue lines are short enough for 960x540');
    await tapKey(page, 'Escape');
    await page.waitForFunction(() => window.__rpgDebug && window.__rpgDebug.screen === 'hub', { timeout: TIMEOUT });

    await tapKey(page, 'KeyQ');
    await page.waitForFunction(() => window.__rpgDebug && window.__rpgDebug.screen === 'questBoard', { timeout: TIMEOUT });
    debug = await page.evaluate(() => window.__rpgDebug);
    assert(debug.questBoard.available[0].id === 'heroSignup', 'quest board lists Hero Sign-Up Sheet');
    assert(debug.questBoard.available[0].rewardPreview.includes('Wooden Club recipe'), 'quest board shows reward preview');
    await tapKey(page, 'Enter');
    await page.waitForFunction(() => window.__rpgDebug && window.__rpgDebug.screen === 'hub' && window.__rpgDebug.activeQuest, { timeout: TIMEOUT });
    debug = await page.evaluate(() => window.__rpgDebug);
    assert(debug.activeQuest.id === 'heroSignup', 'accepting quest returns hub with active quest tracker');
    assert(debug.activeQuest.objective === 'Collect 5 Wood and bonk 3 tutorial zombies', 'active quest objective is visible');

    await tapKey(page, 'KeyM');
    await page.waitForFunction(() => window.__rpgDebug && window.__rpgDebug.screen === 'worldMap', { timeout: TIMEOUT });
    debug = await page.evaluate(() => window.__rpgDebug);
    assert(debug.worldMap.entries.length === 6, 'world map lists six alpha zones');
    assert(debug.worldMap.entries.find(entry => entry.id === 'forestEdge').unlocked, 'Forest Edge is unlocked');
    assert(!debug.worldMap.entries.find(entry => entry.id === 'rabbitVillage').unlocked, 'Rabbit Village is locked before first quest completion');
    assert(debug.worldMap.entries.find(entry => entry.id === 'rabbitVillage').reason === 'Complete The Hero Sign-Up Sheet', 'Rabbit Village lock reason is short and specific');
    page.__assertNoFailures();
  });
}

async function acceptHeroQuestAndEnterForest(page) {
  await launchRpgToHub(page);
  await tapKey(page, 'KeyQ');
  await page.waitForFunction(() => window.__rpgDebug && window.__rpgDebug.screen === 'questBoard', { timeout: TIMEOUT });
  await tapKey(page, 'Enter');
  await page.waitForFunction(() => window.__rpgDebug && window.__rpgDebug.screen === 'hub' && window.__rpgDebug.activeQuest, { timeout: TIMEOUT });
  await tapKey(page, 'KeyF');
  await page.waitForFunction(() => window.__rpgDebug && window.__rpgDebug.screen === 'zone', { timeout: TIMEOUT });
  await waitForHudNonBlank(page, 'Forest Edge');
}

async function testCombatDeathRespawn() {
  await withBrowser(async browser => {
    const attackPage = await newPage(browser);
    await acceptHeroQuestAndEnterForest(attackPage);
    let debug = await attackPage.evaluate(() => window.__rpgDebug);
    assert(debug.combat.zoneId === 'forestEdge', 'combat starts in Forest Edge');
    assert(debug.combat.enemiesAlive === 3, 'Forest Edge starts with three tutorial zombies');
    assert(debug.combat.playerHp === 100, 'player starts combat at full HP');

    for (let expectedAlive = 2; expectedAlive >= 0; expectedAlive--) {
      await tapKey(attackPage, 'Enter');
      await attackPage.waitForFunction(alive => window.__rpgDebug.combat.enemiesAlive === alive, { timeout: TIMEOUT }, expectedAlive);
    }
    debug = await attackPage.evaluate(() => window.__rpgDebug);
    assert(debug.combat.defeatedEnemies === 3, 'manual attacks defeat tutorial zombies');
    assert(debug.activeQuest.progress.tutorialZombies === 3, 'combat defeat events update quest progress');
    attackPage.__assertNoFailures();

    const idlePage = await newPage(browser);
    await acceptHeroQuestAndEnterForest(idlePage);
    await idlePage.waitForFunction(() => window.__rpgDebug.combat.deaths >= 1, { timeout: TIMEOUT });
    debug = await idlePage.evaluate(() => window.__rpgDebug);
    assert(debug.combat.deaths === 1, 'idle player can die from contact damage');
    assert(debug.combat.playerHp === debug.combat.playerMaxHp, 'death respawns player at full HP');
    assert(debug.screen === 'zone', 'death respawns without leaving the zone');
    assert(debug.activeSave.player.hp === debug.combat.playerMaxHp, 'respawn updates save HP');
    idlePage.__assertNoFailures();
  });
}

const casesToRun = requestedCase ? [requestedCase] : Array.from(CASES);
for (const caseName of casesToRun) {
  console.log(`\n=== ${caseName} ===`);
  if (caseName === 'rpg-save-select') await testRpgSaveSelect();
  if (caseName === 'cleanup') await testCleanup();
  if (caseName === 'hub-dialogue-world-map') await testHubDialogueWorldMap();
  if (caseName === 'combat-death-respawn') await testCombatDeathRespawn();
}
