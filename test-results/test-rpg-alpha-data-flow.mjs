import { deepStrictEqual, equal, ok } from 'assert/strict';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const CASES = new Set([
  'save-slots',
  'save-reload',
  'hub-quest-board',
  'ingredients',
  'recipes',
  'equipment',
  'progression',
  'reputation',
  'journal',
  'world-unlocks',
  'rescued-flags',
  'alpha-quest-chain',
  'audio-manifest',
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
  equal(defaultSave.flags.firstQuestGuideDismissed, false, 'new saves show the first-quest guide');

  const legacySave = saves.normalizeSave({
    ...defaultSave,
    flags: { spaceshipWitness: true },
  });
  equal(legacySave.flags.firstQuestGuideDismissed, false, 'legacy saves default the optional guide flag to false');
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
  save.flags.firstQuestGuideDismissed = true;
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
  equal(loaded.save.flags.firstQuestGuideDismissed, true, 'guide dismissal persists after reload');
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

async function testIngredients() {
  const saves = await importSaveSystem();
  const inventory = await importRpgModule('inventory.js');
  let save = saves.createDefaultSave('leopard', 0);
  save.unlockedZones.push('rabbitVillage', 'monkeyJungle', 'sunnyMeadow', 'sandyBeach');

  const nodes = inventory.createGatheringNodes(save);
  deepStrictEqual([...new Set(nodes.map(node => node.ingredient))].sort(), ['bananas', 'gems', 'glass', 'metal', 'wood']);
  ok(nodes.every(node => node.id && node.zoneId && node.radius > 0), 'gathering nodes expose id, zone, and radius');

  const woodNode = nodes.find(node => node.ingredient === 'wood');
  let result = inventory.collectNode(save, woodNode);
  save = result.save;
  equal(result.collected, true, 'first gather collects node');
  equal(save.ingredients.wood, woodNode.amount, 'wood amount increases');
  ok(save.collectedNodes[woodNode.zoneId].includes(woodNode.id), 'collected node id persists by zone');

  result = inventory.collectNode(save, woodNode);
  save = result.save;
  equal(result.collected, false, 'second gather of same node is ignored');
  equal(save.ingredients.wood, woodNode.amount, 'duplicate node does not add ingredients');

  for (const ingredient of ['metal', 'bananas', 'gems', 'glass']) {
    const node = nodes.find(item => item.ingredient === ingredient);
    result = inventory.collectNode(save, node);
    save = result.save;
    ok(save.ingredients[ingredient] >= node.amount, `${ingredient} can be gathered`);
  }

  logPass('ingredients');
}

async function testRecipes() {
  const saves = await importSaveSystem();
  const inventory = await importRpgModule('inventory.js');
  const recipeIds = inventory.getRecipeIds();
  deepStrictEqual(recipeIds, ['woodenClub', 'bananaTrap', 'bananaCannon', 'glassTelescope']);

  let missing = saves.createDefaultSave('leopard', 0);
  missing.unlockedRecipes.push('woodenClub');
  const failed = inventory.craftItem(missing, 'woodenClub');
  equal(failed.success, false, 'craft fails without ingredients');
  ok(failed.reason.includes('Wood'), 'craft failure identifies missing ingredient');

  let save = saves.createDefaultSave('leopard', 0);
  save.unlockedRecipes.push(...recipeIds);
  save.ingredients = { wood: 20, metal: 20, bananas: 20, gems: 20, glass: 20 };

  let crafted = inventory.craftItem(save, 'woodenClub');
  save = crafted.save;
  equal(crafted.success, true, 'wooden club crafts');
  equal(save.ingredients.wood, 15, 'wooden club consumes 5 wood');
  ok(save.inventory.includes('woodenClub'), 'crafted wooden club enters inventory');
  equal(save.equipped.weapon, 'woodenClub', 'wooden club auto-equips as weapon');

  crafted = inventory.craftItem(save, 'bananaTrap');
  save = crafted.save;
  equal(crafted.success, true, 'banana trap crafts');
  equal(save.equipped.gadget, 'bananaTrap', 'banana trap auto-equips as gadget');

  crafted = inventory.craftItem(save, 'bananaCannon');
  save = crafted.save;
  equal(crafted.success, true, 'banana cannon crafts');
  ok(save.inventory.includes('bananaCannon'), 'banana cannon enters inventory');

  crafted = inventory.craftItem(save, 'glassTelescope');
  save = crafted.save;
  equal(crafted.success, true, 'glass telescope crafts');
  equal(save.equipped.gadget, 'glassTelescope', 'glass telescope equips as gadget');

  logPass('recipes');
}

async function testEquipment() {
  const saves = await importSaveSystem();
  const inventory = await importRpgModule('inventory.js');
  const storage = createMemoryStorage();
  let save = saves.createDefaultSave('gator', 0);
  save.inventory.push('woodenClub', 'bananaTrap');

  let equipped = inventory.equipItem(save, 'woodenClub');
  save = equipped.save;
  equal(equipped.success, true, 'wooden club equips');
  equal(save.equipped.weapon, 'woodenClub');
  equal(save.player.attack, 12, 'wooden club increases attack over empty paws');

  equipped = inventory.equipItem(save, 'bananaTrap');
  save = equipped.save;
  equal(equipped.success, true, 'banana trap equips');
  equal(save.equipped.gadget, 'bananaTrap');

  saves.writeSaveSlot(storage, save, 777);
  const loaded = saves.readSaveSlot(storage, 'gator', 0).save;
  equal(loaded.equipped.weapon, 'woodenClub', 'weapon equipment persists after reload');
  equal(loaded.equipped.gadget, 'bananaTrap', 'gadget equipment persists after reload');
  equal(loaded.player.attack, 12, 'equipment stat change persists after reload');

  logPass('equipment');
}

async function testProgression() {
  const saves = await importSaveSystem();
  const progression = await importRpgModule('progression-rpg.js');
  const storage = createMemoryStorage();
  let save = saves.createDefaultSave('leopard', 0);

  let result = progression.grantXp(save, 19);
  save = result.save;
  equal(save.player.level, 1, '19 XP does not level up');
  equal(save.player.xp, 19);

  result = progression.grantXp(save, 1);
  save = result.save;
  equal(save.player.level, 2, '20 XP reaches level 2');
  equal(save.player.maxHp, 110, 'level 2 increases max HP by 10');
  equal(save.player.hp, 110, 'level up heals to new max HP');
  equal(save.player.attack, 9, 'level 2 increases attack by 1');
  deepStrictEqual(result.levelUps, [2], 'grantXp reports level-up list');

  result = progression.grantXp(save, 45);
  save = result.save;
  equal(save.player.level, 3, '45 more XP reaches level 3');

  saves.writeSaveSlot(storage, save, 3000);
  const loaded = saves.readSaveSlot(storage, 'leopard', 0).save;
  equal(loaded.player.level, 3, 'level persists after reload');
  equal(loaded.player.xp, 65, 'total XP persists after reload');

  logPass('progression');
}

async function testReputation() {
  const saves = await importSaveSystem();
  const progression = await importRpgModule('progression-rpg.js');
  const storage = createMemoryStorage();
  let save = saves.createDefaultSave('leopard', 0);

  for (const species of ['rabbits', 'monkeys', 'turtles']) {
    const updated = progression.setReputation(save, species, 'friend');
    save = updated.save;
    equal(save.reputation[species], 'friend', `${species} can reach friend`);
    ok(progression.getReputationReaction(save, species).includes('friend'), `${species} reaction changes at friend rank`);
  }

  saves.writeSaveSlot(storage, save, 4000);
  const loaded = saves.readSaveSlot(storage, 'leopard', 0).save;
  deepStrictEqual(loaded.reputation, { rabbits: 'friend', monkeys: 'friend', turtles: 'friend' });

  logPass('reputation');
}

async function testJournal() {
  const saves = await importSaveSystem();
  const journal = await importRpgModule('journal-rpg.js');
  const storage = createMemoryStorage();
  let save = saves.createDefaultSave('leopard', 0);

  let updated = journal.unlockSticker(save, 'myFirstBonk');
  save = updated.save;
  equal(updated.unlocked, true, 'first bonk sticker unlocks');
  updated = journal.unlockSticker(save, 'myFirstBonk');
  save = updated.save;
  equal(updated.unlocked, false, 'duplicate sticker unlock is ignored');
  deepStrictEqual(save.journal.stickers, ['myFirstBonk']);

  save = journal.addJournalEntry(save, 'heroSignupComplete', 'The Hero Sign-Up Sheet complete').save;
  ok(save.journal.entries.includes('heroSignupComplete'), 'journal entry id persists');

  const banner = journal.createRewardBanner({
    questTitle: 'The Hero Sign-Up Sheet',
    xp: 10,
    ingredients: { wood: 5 },
    recipes: ['woodenClub'],
    stickers: ['myFirstBonk'],
  });
  equal(banner.questTitle, 'The Hero Sign-Up Sheet');
  ok(banner.lines.some(line => line.includes('10 XP')), 'reward banner includes XP');
  ok(banner.lines.some(line => line.includes('Wood 5')), 'reward banner includes ingredients');
  ok(banner.lines.some(line => line.includes('woodenClub')), 'reward banner includes recipes');
  ok(banner.lines.some(line => line.includes('myFirstBonk')), 'reward banner includes stickers');

  saves.writeSaveSlot(storage, save, 5000);
  const loaded = saves.readSaveSlot(storage, 'leopard', 0).save;
  deepStrictEqual(loaded.journal.stickers, ['myFirstBonk'], 'stickers persist after reload');
  deepStrictEqual(loaded.journal.entries, ['heroSignupComplete'], 'journal entries persist after reload');

  logPass('journal');
}

async function applyQuestRewardForTest(save, reward, questId) {
  const progression = await importRpgModule('progression-rpg.js');
  const journal = await importRpgModule('journal-rpg.js');
  let next = save;
  if (reward.xp) next = progression.grantXp(next, reward.xp).save;
  Object.entries(reward.ingredients || {}).forEach(([id, amount]) => { next.ingredients[id] += amount; });
  Object.entries(reward.reputation || {}).forEach(([species, rank]) => { next = progression.setReputation(next, species, rank).save; });
  (reward.recipes || []).forEach(id => { if (!next.unlockedRecipes.includes(id)) next.unlockedRecipes.push(id); });
  (reward.unlockedZones || []).forEach(id => { if (!next.unlockedZones.includes(id)) next.unlockedZones.push(id); });
  Object.entries(reward.rescued || {}).forEach(([id, value]) => { next.rescued[id] = value; });
  Object.entries(reward.flags || {}).forEach(([id, value]) => { next.flags[id] = value; });
  (reward.stickers || []).forEach(id => { next = journal.unlockSticker(next, id).save; });
  if (reward.journalEntry) next = journal.addJournalEntry(next, reward.journalEntry.id, reward.journalEntry.text).save;
  if (questId === 'statueReveal') next.flags.alphaEndCardUnlocked = true;
  return next;
}

async function completeQuestForTest(save, questId) {
  const quests = await importRpgModule('quest-system.js');
  let next = save;
  if (!next.quests.active) next = quests.acceptQuest(next, questId, 6000);
  const quest = quests.getQuestDefinition(questId);
  next.quests.progress[questId] = { ...next.quests.progress[questId], ...quest.completion };
  const completed = quests.completeQuest(next, questId);
  if (!completed.completed) throw new Error(`Quest did not complete in test: ${questId}`);
  next = await applyQuestRewardForTest(completed.save, completed.reward, questId);
  return next;
}

async function testWorldUnlocks() {
  const saves = await importSaveSystem();
  const quests = await importRpgModule('quest-system.js');
  const worldMap = await importRpgModule('world-map-rpg.js');
  let save = saves.createDefaultSave('leopard', 0);
  const expected = [
    ['heroSignup', 'rabbitVillage'],
    ['bunnyRescue', 'monkeyJungle'],
    ['bananaEmergency', 'sunnyMeadow'],
    ['turtleExpress', 'sandyBeach'],
  ];

  deepStrictEqual(quests.getAvailableQuests(save).map(quest => quest.id), ['heroSignup']);
  for (const [questId, unlockedZone] of expected) {
    save = await completeQuestForTest(save, questId);
    ok(save.unlockedZones.includes(unlockedZone), `${questId} unlocks ${unlockedZone}`);
    equal(worldMap.getWorldMapEntries(save).find(entry => entry.id === unlockedZone).unlocked, true, `${unlockedZone} is open on world map`);
  }

  deepStrictEqual(save.quests.completed, ['heroSignup', 'bunnyRescue', 'bananaEmergency', 'turtleExpress']);
  deepStrictEqual(quests.getAvailableQuests(save).map(quest => quest.id), ['statueReveal']);
  logPass('world-unlocks');
}

async function testRescuedFlags() {
  const saves = await importSaveSystem();
  const storage = createMemoryStorage();
  let save = saves.createDefaultSave('leopard', 0);
  for (const questId of ['heroSignup', 'bunnyRescue', 'bananaEmergency', 'turtleExpress']) {
    save = await completeQuestForTest(save, questId);
  }
  equal(save.rescued.rabbitVillage, true, 'Rabbit Village rescue flag is set');
  equal(save.rescued.bananaStand, true, 'banana stand restoration flag is set');
  equal(save.rescued.shellbert, true, 'Shellbert rescue flag is set');
  equal(save.reputation.rabbits, 'friend', 'rabbit reputation persists from rescue');
  equal(save.reputation.monkeys, 'friend', 'monkey reputation persists from restoration');
  equal(save.reputation.turtles, 'friend', 'turtle reputation persists from escort');

  saves.writeSaveSlot(storage, save, 7000);
  const loaded = saves.readSaveSlot(storage, 'leopard', 0).save;
  equal(loaded.rescued.rabbitVillage, true, 'Rabbit Village flag survives reload');
  equal(loaded.rescued.bananaStand, true, 'banana stand flag survives reload');
  equal(loaded.rescued.shellbert, true, 'Shellbert flag survives reload');

  logPass('rescued-flags');
}

async function testAlphaQuestChain() {
  const saves = await importSaveSystem();
  const storage = createMemoryStorage();
  let save = saves.createDefaultSave('leopard', 0);
  for (const questId of ['heroSignup', 'bunnyRescue', 'bananaEmergency', 'turtleExpress', 'statueReveal']) {
    save = await completeQuestForTest(save, questId);
  }

  deepStrictEqual(save.quests.completed, ['heroSignup', 'bunnyRescue', 'bananaEmergency', 'turtleExpress', 'statueReveal']);
  ok(save.unlockedRecipes.includes('woodenClub'), 'Hero Sign-Up unlocks Wooden Club recipe');
  ok(save.unlockedRecipes.includes('bananaCannon'), 'Banana Emergency unlocks Banana Cannon recipe');
  ok(save.unlockedRecipes.includes('glassTelescope'), 'Turtle Express unlocks Glass Telescope recipe');
  equal(save.flags.bananaCannonPayoff, true, 'Banana Cannon payoff flag is set');
  equal(save.flags.spaceshipWitness, true, 'spaceship witness flag is set');
  equal(save.flags.alphaEndCardUnlocked, true, 'alpha end-card flag is set');
  ok(save.journal.stickers.includes('spaceshipWitness'), 'spaceship witness sticker persists');

  saves.writeSaveSlot(storage, save, 8000);
  const loaded = saves.readSaveSlot(storage, 'leopard', 0).save;
  equal(loaded.flags.spaceshipWitness, true, 'spaceship reveal survives reload');
  deepStrictEqual(loaded.quests.completed, save.quests.completed, 'completed quest order survives reload');

  logPass('alpha-quest-chain');
}

async function testAudioManifest() {
  const constants = await importRpgModule('constants-rpg.js');
  const requiredEvents = [
    'menuSelect',
    'questAccept',
    'attack',
    'hit',
    'zombieDefeat',
    'ingredientPickup',
    'craftSuccess',
    'questComplete',
    'playerDeath',
  ];
  const manifest = constants.RPG_AUDIO_EVENTS;
  ok(manifest, 'RPG audio event manifest exists');
  for (const eventId of requiredEvents) {
    const entry = manifest[eventId];
    ok(entry, `${eventId} has an audio mapping`);
    ok(entry.soundId && Array.isArray(entry.files), `${eventId} has soundId and files`);
    for (const fileName of entry.files) {
      ok(existsSync(join(PROJECT_ROOT, 'sound-pack-alpha', fileName)), `${eventId} asset exists: ${fileName}`);
    }
  }

  logPass('audio-manifest');
}

const casesToRun = requestedCase ? [requestedCase] : Array.from(CASES);
for (const caseName of casesToRun) {
  if (caseName === 'save-slots') await testSaveSlots();
  if (caseName === 'save-reload') await testSaveReload();
  if (caseName === 'hub-quest-board') await testHubQuestBoard();
  if (caseName === 'ingredients') await testIngredients();
  if (caseName === 'recipes') await testRecipes();
  if (caseName === 'equipment') await testEquipment();
  if (caseName === 'progression') await testProgression();
  if (caseName === 'reputation') await testReputation();
  if (caseName === 'journal') await testJournal();
  if (caseName === 'world-unlocks') await testWorldUnlocks();
  if (caseName === 'rescued-flags') await testRescuedFlags();
  if (caseName === 'alpha-quest-chain') await testAlphaQuestChain();
  if (caseName === 'audio-manifest') await testAudioManifest();
}
