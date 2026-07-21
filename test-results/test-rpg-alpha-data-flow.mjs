import { deepStrictEqual, equal, ok } from 'assert/strict';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const CASES = new Set([
  'save-slots',
  'save-reload',
  'hub-quest-board',
]);

const requestedCase = getArgValue('--case');
if (requestedCase && !CASES.has(requestedCase)) {
  throw new Error(`Unknown --case ${requestedCase}`);
}

function getArgValue(name) {
  const idx = process.argv.indexOf(name);
  return idx === -1 ? null : process.argv[idx + 1];
}

function logPass(message) {
  console.log(`PASS: ${message}`);
}

function createMemoryStorage() {
  const map = new Map();
  return {
    get length() { return map.size; },
    key(index) { return Array.from(map.keys())[index] || null; },
    getItem(key) { return map.has(key) ? map.get(key) : null; },
    setItem(key, value) { map.set(key, String(value)); },
    removeItem(key) { map.delete(key); },
    clear() { map.clear(); },
    dump() { return Object.fromEntries(map.entries()); },
  };
}

async function importSaveSystem() {
  const url = pathToFileURL(join(PROJECT_ROOT, 'js/rpg/save-system.js')).href;
  return import(`${url}?t=${Date.now()}`);
}

async function importRpgModule(fileName) {
  const url = pathToFileURL(join(PROJECT_ROOT, 'js/rpg', fileName)).href;
  return import(`${url}?t=${Date.now()}`);
}

async function testSaveSlots() {
  const saves = await importSaveSystem();
  const storage = createMemoryStorage();

  equal(saves.SAVE_SLOT_COUNT, 3, 'RPG exposes exactly three save slots');
  const leopardKey = saves.getSaveKey('leopard', 0);
  const tigerKey = saves.getSaveKey('tiger', 0);
  ok(leopardKey.includes('leopard') && leopardKey.includes(':0'), 'save key includes animal and slot');
  ok(tigerKey.includes('tiger') && tigerKey !== leopardKey, 'cross-animal save keys are separate');

  const defaultSave = saves.createDefaultSave('leopard', 0);
  deepStrictEqual(defaultSave.player, { level: 1, xp: 0, hp: 100, maxHp: 100, attack: 8 });
  deepStrictEqual(defaultSave.ingredients, { wood: 0, metal: 0, bananas: 0, gems: 0, glass: 0 });
  deepStrictEqual(defaultSave.equipped, { weapon: null, gadget: null });
  deepStrictEqual(defaultSave.unlockedZones, ['hub', 'forestEdge']);
  equal(defaultSave.currentZone, 'hub');
  equal(defaultSave.flags.spaceshipWitness, false);
  equal(defaultSave.playtimeSeconds, 0);

  storage.setItem(leopardKey, '{not valid json');
  const invalidLoaded = saves.readSaveSlot(storage, 'leopard', 0);
  equal(invalidLoaded.valid, false, 'invalid save is reported invalid');
  equal(invalidLoaded.empty, false, 'invalid existing localStorage value is not treated as an empty slot');
  equal(storage.getItem(leopardKey), '{not valid json', 'invalid localStorage value is preserved');
  equal(invalidLoaded.save.animalId, 'leopard', 'invalid save returns fresh default animal id');

  const emptySummaries = saves.listSaveSummaries(storage, 'redPanda');
  equal(emptySummaries.length, 3, 'summary list returns three slots');
  equal(emptySummaries[0].empty, true, 'empty slot is marked empty');
  equal(emptySummaries[0].label, 'NEW QUEST', 'empty slot label is NEW QUEST');

  const save = saves.createDefaultSave('leopard', 0);
  save.player.level = 3;
  save.currentZone = 'forestEdge';
  save.playtimeSeconds = 125;
  saves.writeSaveSlot(storage, save, 123456);
  const summaries = saves.listSaveSummaries(storage, 'leopard');
  equal(summaries[0].empty, false, 'written slot is not empty');
  equal(summaries[0].level, 3, 'summary includes level');
  equal(summaries[0].currentZone, 'forestEdge', 'summary includes current zone');
  equal(summaries[0].playtime, '2m 5s', 'summary formats playtime');
  equal(summaries[0].updatedAt, 123456, 'summary includes updated timestamp');

  logPass('save-slots');
}

async function testSaveReload() {
  const saves = await importSaveSystem();
  const storage = createMemoryStorage();

  const save = saves.createDefaultSave('gator', 0);
  save.player.level = 2;
  save.player.xp = 25;
  save.player.hp = 72;
  save.ingredients.wood = 6;
  save.ingredients.glass = 2;
  save.inventory.push('woodenClub');
  save.equipped.weapon = 'woodenClub';
  save.quests.active = 'heroSignup';
  save.quests.progress.heroSignup = { tutorialZombies: 2, wood: 5 };
  save.reputation.rabbits = 'friend';
  save.journal.stickers.push('myFirstBonk');
  save.unlockedZones.push('rabbitVillage');
  save.unlockedRecipes.push('woodenClub');
  save.currentZone = 'forestEdge';
  save.rescued.rabbitVillage = true;
  save.flags.spaceshipWitness = true;
  save.playtimeSeconds = 360;

  saves.writeSaveSlot(storage, save, 2000);
  const loaded = saves.readSaveSlot(storage, 'gator', 0);
  equal(loaded.valid, true, 'written save reloads as valid');
  equal(loaded.empty, false, 'written save reloads as existing');
  equal(loaded.save.updatedAt, 2000, 'write updates timestamp');
  deepStrictEqual(loaded.save.player, { level: 2, xp: 25, hp: 72, maxHp: 100, attack: 8 });
  deepStrictEqual(loaded.save.ingredients, { wood: 6, metal: 0, bananas: 0, gems: 0, glass: 2 });
  deepStrictEqual(loaded.save.inventory, ['woodenClub']);
  deepStrictEqual(loaded.save.equipped, { weapon: 'woodenClub', gadget: null });
  equal(loaded.save.quests.active, 'heroSignup');
  equal(loaded.save.quests.progress.heroSignup.tutorialZombies, 2);
  equal(loaded.save.reputation.rabbits, 'friend');
  deepStrictEqual(loaded.save.journal.stickers, ['myFirstBonk']);
  ok(loaded.save.unlockedZones.includes('rabbitVillage'), 'unlocked zones persist');
  ok(loaded.save.unlockedRecipes.includes('woodenClub'), 'unlocked recipes persist');
  equal(loaded.save.rescued.rabbitVillage, true);
  equal(loaded.save.flags.spaceshipWitness, true);
  equal(loaded.save.playtimeSeconds, 360);

  const otherAnimal = saves.readSaveSlot(storage, 'leopard', 0);
  equal(otherAnimal.empty, true, 'different animal slot is still empty');

  logPass('save-reload');
}

async function testHubQuestBoard() {
  const saves = await importSaveSystem();
  const zone = await importRpgModule('zone.js');
  const npc = await importRpgModule('npc.js');
  const quests = await importRpgModule('quest-system.js');
  const worldMap = await importRpgModule('world-map-rpg.js');
  const save = saves.createDefaultSave('leopard', 0);

  const hub = zone.createHubZone(save);
  equal(hub.id, 'hub', 'hub zone id is stable');
  deepStrictEqual(hub.enemies, [], 'hub has no enemies');
  deepStrictEqual(hub.damageSources, [], 'hub has no damage sources');
  ok(hub.interactables.some(item => item.id === 'questBoard'), 'hub contains quest board visual');
  ok(hub.interactables.some(item => item.id === 'craftingBench'), 'hub contains crafting bench visual');
  ok(hub.interactables.some(item => item.id === 'worldMap'), 'hub contains world map exit visual');
  ok(hub.interactables.some(item => item.id === 'playerTent'), 'hub contains player tent visual');
  ok(hub.interactables.some(item => item.id === 'storageChest'), 'hub contains storage chest visual');

  const hubNpcs = npc.createHubNpcs(save);
  deepStrictEqual(hubNpcs.map(item => item.name), ['Granny Thistle', 'Scout Hazel', 'Momo Foreman', 'Shellbert']);
  ok(hubNpcs.every(item => item.group === null), 'NPC metadata does not require live Three.js groups');
  ok(hubNpcs.every(item => item.dialogue.length <= 2), 'NPC dialogue pages are capped to two lines');

  const available = quests.getAvailableQuests(save);
  equal(available.length, 1, 'new save has one available quest');
  equal(available[0].id, 'heroSignup', 'Hero Sign-Up Sheet is available first');
  equal(available[0].title, 'The Hero Sign-Up Sheet');
  equal(available[0].destinationZone, 'forestEdge');
  ok(available[0].rewardPreview.includes('Wooden Club recipe'), 'quest board exposes reward preview');

  const accepted = quests.acceptQuest(save, 'heroSignup', 1234);
  equal(accepted.quests.active, 'heroSignup', 'accepting quest sets active quest');
  equal(accepted.quests.progress.heroSignup.acceptedAt, 1234, 'accepting quest records timestamp');
  equal(quests.getAvailableQuests(accepted).length, 0, 'active quest is removed from available list');
  equal(quests.getActiveQuestTracker(accepted).objective, 'Collect 5 Wood and bonk 3 tutorial zombies');
  equal(quests.getActiveQuestTracker(accepted).destinationZone, 'forestEdge');

  const entries = worldMap.getWorldMapEntries(save);
  equal(entries.length, 6, 'world map lists all six alpha zones');
  equal(entries.find(entry => entry.id === 'hub').unlocked, true, 'Hub is unlocked');
  equal(entries.find(entry => entry.id === 'forestEdge').unlocked, true, 'Forest Edge is unlocked on new save');
  equal(entries.find(entry => entry.id === 'rabbitVillage').unlocked, false, 'Rabbit Village starts locked');
  equal(entries.find(entry => entry.id === 'rabbitVillage').reason, 'Complete The Hero Sign-Up Sheet');
  equal(entries.find(entry => entry.id === 'monkeyJungle').reason, 'Rescue Rabbit Village');
  equal(entries.find(entry => entry.id === 'sunnyMeadow').reason, 'Restore the banana stand');
  equal(entries.find(entry => entry.id === 'sandyBeach').reason, 'Finish Turtle Express');

  logPass('hub-quest-board');
}

const casesToRun = requestedCase ? [requestedCase] : Array.from(CASES);
for (const caseName of casesToRun) {
  if (caseName === 'save-slots') await testSaveSlots();
  if (caseName === 'save-reload') await testSaveReload();
  if (caseName === 'hub-quest-board') await testHubQuestBoard();
}
