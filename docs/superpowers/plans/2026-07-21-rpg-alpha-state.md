# RPG Alpha State Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring Animal Rescue RPG from the current planning state to a playable alpha with a selectable startup-menu button, persistent progression, authored quests, and enough RPG structure to be judged as a real third game mode.

**Architecture:** Add the RPG through a stable mode-selection trunk and an independent `game-rpg.js` orchestrator. RPG systems live under `js/rpg/`, share content and persistence through trunk modules, and communicate through `game-rpg.js` wiring instead of branch-to-branch imports.

**Tech Stack:** Vanilla JavaScript ES modules, Three.js global `THREE`, Canvas 2D HUD overlay, localStorage persistence, Puppeteer browser smoke tests, manual browser QA at 960x540 and 1280x720.

---

## Current Evidence

RPG mode is not implemented yet. The current project has:

- A planning source for Animal Rescue in `docs/planning/beads-bd289.md`.
- A narrative alpha draft in `docs/superpowers/specs/2026-05-30-quest-mode-story-arc-design-v2.md`.
- A scoped vertical-slice design in `docs/superpowers/specs/2026-07-21-rpg-third-mode-vertical-slice-design.md`.
- A first-slice implementation plan in `docs/superpowers/plans/2026-07-21-rpg-third-mode-vertical-slice.md`.

The code still has two-mode assumptions:

- `js/game.js` wraps `state.selectedMode` with `% 2` and routes only mode `0` and mode `1`.
- `js/renderer.js` draws two hard-coded mode cards.
- `index.html` has shared 3D canvases suitable for RPG, but comments still describe only 3D Survivor ownership.

## Alpha Definition

RPG alpha means a tester can start the game, choose Animal Rescue from the startup mode popup/menu, pick an animal, choose a save slot, play a short authored RPG campaign segment, quit, reload, and continue with saved progress. It does not mean the full 12-quest campaign is complete.

The alpha content target is **Prologue + Act 1 through the spaceship reveal**:

1. `The Hero Sign-Up Sheet` - tutorial quest in Forest Edge.
2. `Operation Bunny Rescue` - rescue quest in Rabbit Village.
3. `Banana Emergency` - Monkey Jungle quest that unlocks the Banana Cannon.
4. `Turtle Express` - short escort quest through Sunny Meadow.
5. `Bigger Than My Statue` - Sandy Beach quest ending with the telescope/spaceship reveal.

Alpha can defer Act 2, Act 3, King Fred, vehicles beyond the Banana Cannon-adjacent toy beat, full wardrobe, post-game, free-play races, and the final party.

## Architectural Approaches

### Approach A: Vertical Slice First, Then Alpha Layers

- **Trunks:** `js/mode-catalog.js`, `js/rpg/constants-rpg.js`, `js/rpg/save-system.js`, `js/rpg/progression-rpg.js`.
- **Branches:** `js/game-rpg.js`, `quest-system.js`, `inventory.js`, `combat-rpg.js`, `zone.js`, `npc.js`, `hud-rpg.js`, `journal-rpg.js`, `world-map-rpg.js`.
- **Composability:** `game-rpg.js` imports branches and passes functions/data into other branches where collaboration is needed.
- **Tradeoffs:** Safest path. The first playable RPG appears early, then each RPG layer is expanded with tests. Requires discipline to stop scope creep from pulling in full-story systems.

### Approach B: Full Campaign Skeleton First

- **Trunks:** Same trunks as Approach A, plus a complete campaign content trunk for all 12 quests.
- **Branches:** Same branches, but every branch supports all planned quest types immediately.
- **Composability:** Content tables drive all systems from the start.
- **Tradeoffs:** Good long-term shape, but too much content and too many system paths before the core loop is proven. Higher risk of an impressive menu with thin gameplay.

### Approach C: Menu Button and Single Quest Only

- **Trunks:** `js/mode-catalog.js`, `js/rpg/constants-rpg.js`, `js/rpg/save-system.js`.
- **Branches:** Minimal `game-rpg.js`, HUD, zone, NPC, quest, inventory.
- **Composability:** Small orchestrator with few modules.
- **Tradeoffs:** Fastest route to a third button, but it does not satisfy the proper-RPG rubric below. This is a demo, not alpha.

### Recommendation

Use **Approach A**. It keeps the already-approved vertical slice as the first milestone, then expands to a proper RPG alpha with enough quests, progression, persistence, crafting, and world reaction to test whether Animal Rescue is fun. It also protects 2D Classic and 3D Survivor by removing hard-coded mode assumptions before RPG code launches.

## Dependency Rules

Allowed imports:

```text
game.js -> mode-catalog.js
renderer.js -> mode-catalog.js
game.js -> game3d.js
game.js -> game-rpg.js
game-rpg.js -> rpg/* branches
rpg/* branches -> rpg/constants-rpg.js
rpg/* branches -> rpg/progression-rpg.js
rpg/save-system.js -> rpg/constants-rpg.js
rpg/zone.js, rpg/npc.js, game-rpg.js -> 3d/player-model.js and 3d/utils.js
```

Forbidden imports:

```text
rpg/quest-system.js -> rpg/inventory.js
rpg/inventory.js -> rpg/quest-system.js
rpg/zone.js -> rpg/npc.js
rpg/hud-rpg.js -> rpg/zone.js
rpg/combat-rpg.js -> rpg/quest-system.js
game3d.js -> game-rpg.js
game-rpg.js -> game3d.js
```

The orchestrator owns cross-system decisions. A quest can declare `objective.kind = 'defeatZombie'`; combat reports `defeatZombie` events to `game-rpg.js`; `game-rpg.js` calls quest progress functions.

## File Map

Create:

- `js/mode-catalog.js` - mode descriptors and mode-card layout hitboxes.
- `js/game-rpg.js` - RPG lifecycle, scene, input, state, save orchestration.
- `js/rpg/constants-rpg.js` - alpha content definitions for zones, NPCs, quests, ingredients, recipes, enemies, journal stickers.
- `js/rpg/save-system.js` - RPG save keys, schema, validation, load, write, summaries.
- `js/rpg/progression-rpg.js` - XP curve, level rewards, reputation ranks, alpha unlock rules.
- `js/rpg/quest-system.js` - quest accept, objective progress, completion, reward calculation.
- `js/rpg/inventory.js` - ingredient math, crafting, equipment changes.
- `js/rpg/combat-rpg.js` - manual attack, enemy damage, player damage, respawn penalties.
- `js/rpg/zone.js` - hub and alpha-zone scene construction and disposal.
- `js/rpg/npc.js` - rabbit, monkey, turtle, fox, owl NPC model factories and interaction metadata.
- `js/rpg/world-map-rpg.js` - unlocked-zone list, travel options, current-zone transition policy.
- `js/rpg/journal-rpg.js` - quest log entries, sticker unlocks, first-bonk and quest-complete journal state.
- `js/rpg/hud-rpg.js` - save select, HUD, dialogue, quest board, crafting, inventory, world map, pause menu.
- `test-results/test-rpg-alpha-data-flow.mjs` - browser-module test for persistence, quest, crafting, progression, journal.
- `test-results/test-rpg-alpha-mode-flow.mjs` - Puppeteer flow test for startup menu, RPG launch, save slot, hub, quit/reload.
- `test-results/test-mode-regression.mjs` - Puppeteer test that 2D Classic and 3D Survivor still launch.

Modify:

- `index.html` - describe `#game3d` and `#hud3d` as shared 3D mode canvases.
- `js/state.js` - update JSDoc/state comments to include `rpgMode` or shared external-mode state.
- `js/game.js` - use `GAME_MODES.length`, route by `mode.id`, add click/tap selection for mode-card buttons, launch `launchRPGGame`.
- `js/renderer.js` - draw mode cards from `GAME_MODES`, including `ANIMAL RESCUE`, with responsive 3-card layout.
- `js/game3d.js` - accept optional canvas handles through `options.canvases` while keeping current DOM fallback.

## Non-Negotiable RPG Rubric

These are the boxes that must be checked during alpha landing. If one remains unchecked, Animal Rescue is not an RPG alpha yet.

- [ ] **Startup selection:** The startup popup/menu has a clear `ANIMAL RESCUE` button/card; keyboard and click/tap can select it.
- [ ] **Third-mode isolation:** Starting and exiting RPG does not corrupt 2D Classic, 3D Survivor, title preview, key state, or canvas visibility.
- [ ] **Persistent saves:** Three save slots per animal persist level, XP, HP, ingredients, inventory, equipment, quests, reputation, journal, unlocked zones, current zone, and playtime.
- [ ] **Authored hub:** The player starts in a safe hub with named NPCs, quest board, crafting bench, world map exit, and readable interaction prompts.
- [ ] **Quest log:** The player can accept quests, see the active objective, complete objectives, receive rewards, and review completed quests.
- [ ] **NPC dialogue:** At least four named NPCs have short readable dialogue tied to quests or world state.
- [ ] **World travel:** At least five alpha zones are reachable through an in-game world map or hub exit: Hub, Forest Edge, Rabbit Village, Monkey Jungle, Sandy Beach.
- [ ] **Combat loop:** Player has HP, manual attack, enemy HP, enemy contact damage, defeat feedback, death/respawn, and no permadeath.
- [ ] **Rescue identity:** At least two quests visibly rescue or restore animals, and saved animals remain saved in world state after reload.
- [ ] **Inventory:** The player can collect all five core ingredients: Wood, Metal, Bananas, Gems, Glass.
- [ ] **Crafting:** At least four recipes exist and work: Wooden Club, Banana Trap, Banana Cannon, Glass Telescope.
- [ ] **Equipment:** Crafted gear can be equipped, changes gameplay or unlocks progress, and persists after reload.
- [ ] **Progression:** XP and level increase through play; level changes at least one stat or unlock; progress persists.
- [ ] **Reputation:** At least Rabbits, Monkeys, and Turtles have Stranger/Friend reputation states with visible quest rewards or world reactions.
- [ ] **Journal/stickers:** First bonk and every alpha quest completion unlock visible journal entries or stickers.
- [ ] **Reward cadence:** The first 60 seconds contain a visible reward moment; each quest completion has a clear reward popup/banner.
- [ ] **Readable UI:** HUD, save slots, dialogue, quest board, crafting, inventory, world map, and pause menu text fit at 960x540 and 1280x720.
- [ ] **Audio baseline:** Existing mouth-made SFX are mapped to attack, hit, zombie defeat, quest complete, crafting, and menu select events, with silent fallback only where no asset exists.
- [ ] **Cleanup:** Exiting RPG removes listeners, cancels animation frames, disposes Three.js resources, clears HUD, hides RPG canvases, and returns to title.
- [ ] **Regression coverage:** Automated flow tests prove 2D Classic, 3D Survivor, and RPG can each launch after the mode menu change.

## Milestone 0: Planning Lock

**Purpose:** Turn this plan into implementation-ready work without changing gameplay code.

- [ ] **Step 1: Confirm Approach A**

User approval required before implementation. The chosen architecture is vertical-slice first, alpha layers second.

- [ ] **Step 2: Split implementation into beads**

Create one implementation bead per milestone:

```bash
bd create "Implement RPG startup mode button and launcher shell" --type feature --priority 1 --labels rpg,alpha,implementation
bd create "Implement RPG save slots and persistence trunk" --type feature --priority 1 --labels rpg,alpha,implementation
bd create "Implement RPG hub, NPC, and quest-board core" --type feature --priority 1 --labels rpg,alpha,implementation
bd create "Implement RPG combat, gathering, inventory, and crafting loop" --type feature --priority 1 --labels rpg,alpha,implementation
bd create "Implement RPG alpha quest content and progression" --type feature --priority 1 --labels rpg,alpha,implementation
bd create "Run RPG alpha QA and regression gate" --type task --priority 1 --labels rpg,alpha,qa
```

Expected: each bead is created by `bd` and can be shown with `bd show <id> --json`.

- [ ] **Step 3: Do not start gameplay implementation under this planning bead**

Expected: `git diff -- js index.html test-results` contains no RPG implementation changes from this bead.

## Milestone 1: Startup Menu Button and Launcher Shell

**Purpose:** Make Animal Rescue visible and selectable from the startup mode popup/menu while preserving existing modes.

**Files:**

- Create: `js/mode-catalog.js`
- Create: `js/game-rpg.js`
- Create: `test-results/test-mode-regression.mjs`
- Modify: `js/game.js`
- Modify: `js/renderer.js`
- Modify: `js/state.js`
- Modify: `index.html`

- [ ] **Step 1: Add mode catalog trunk**

`js/mode-catalog.js` owns:

- `GAME_MODES = [{ id: 'classic2d' }, { id: 'survivor3d' }, { id: 'animalRescueRpg' }]`
- `getModeByIndex(index)`
- `getModeCardLayout(width, height)`
- `hitTestModeCard(width, height, x, y)`

Expected: no mode count is duplicated in `game.js` or `renderer.js`.

- [ ] **Step 2: Update state machine selection**

Change mode navigation from hard-coded `% 2` to `GAME_MODES.length`. Route by `mode.id`:

- `classic2d` -> difficulty -> animal select -> 2D launch.
- `survivor3d` -> animal select -> `launch3DGame`.
- `animalRescueRpg` -> animal select -> `launchRPGGame`.

Expected: Escape from animal select returns to difficulty only for `classic2d`; it returns to mode select for both 3D modes.

- [ ] **Step 3: Add clickable/tappable mode-card buttons**

Add pointer handling in `game.js` for `modeSelect`:

- Click inside a card selects it.
- A second click on the selected card continues.
- Enter/Space continue for keyboard users.

Expected: mouse users can press the `ANIMAL RESCUE` card from the startup menu without using arrow keys.

- [ ] **Step 4: Draw three responsive mode cards**

Update `drawModeSelectScreen()` to draw from `GAME_MODES`, using the shared layout function. The `ANIMAL RESCUE` card text:

- Label: `ANIMAL RESCUE`
- Lines: `Quest adventure`, `Save animal friends`, `Craft awesome gear`
- Color: a distinct gold/green pairing, not the existing 2D green or Survivor red.

Expected: all three cards fit at 960x540, with no text overflow.

- [ ] **Step 5: Add minimal RPG launch screen**

Create `launchRPGGame({ animal, canvases, onReturn })` in `js/game-rpg.js`. For this milestone it must show a real nonblank `ANIMAL RESCUE` launch screen on the shared 3D HUD canvas, display the chosen animal name, and return to title when Escape is pressed. It does not create a save yet.

Expected: 2D and Survivor still launch; pressing the RPG card enters a visible Animal Rescue screen and Escape returns to title.

- [ ] **Step 6: Verify**

Run:

```bash
python3 -m http.server 8080
node test-results/test-mode-regression.mjs
```

Expected: PASS for 2D launch, 3D launch, mode-card rendering, RPG launch, and RPG return-to-title.

## Milestone 2: RPG Runtime Shell and Saves

**Purpose:** Launch Animal Rescue into its own runtime with save slots, cleanup, and return-to-title.

**Files:**

- Create: `js/rpg/constants-rpg.js`
- Create: `js/rpg/save-system.js`
- Create: `js/rpg/hud-rpg.js`
- Create: `test-results/test-rpg-alpha-data-flow.mjs`
- Create: `test-results/test-rpg-alpha-mode-flow.mjs`
- Modify: `js/game.js`
- Modify: `js/game-rpg.js`
- Modify: `js/game3d.js`

- [ ] **Step 1: Add save schema**

The save payload must include:

```javascript
{
  version: 1,
  animalId: 'leopard',
  slot: 0,
  player: { level: 1, xp: 0, hp: 100, maxHp: 100, attack: 8 },
  ingredients: { wood: 0, metal: 0, bananas: 0, gems: 0, glass: 0 },
  inventory: [],
  equipped: { weapon: null, gadget: null },
  quests: { active: null, completed: [], progress: {} },
  reputation: { rabbits: 'stranger', monkeys: 'stranger', turtles: 'stranger' },
  journal: { stickers: [], entries: [] },
  unlockedZones: ['hub', 'forestEdge'],
  unlockedRecipes: ['woodenClub'],
  currentZone: 'hub',
  rescued: {},
  updatedAt: 0,
  playtimeSeconds: 0
}
```

Expected: invalid saves are ignored and replaced with a fresh default without deleting the invalid localStorage value.

- [ ] **Step 2: Add RPG launcher**

`launchRPGGame({ animal, saveSlot, canvases, onReturn })` owns:

- Canvas visibility.
- Three.js renderer.
- HUD canvas.
- Runtime state.
- Key and pointer listeners.
- Animation frame.
- Cleanup.

Expected: exiting RPG returns to title and restarts the 2D loop exactly once.

- [ ] **Step 3: Add save-select screen**

The RPG HUD draws three save-slot buttons for the chosen animal:

- Empty slot: `NEW QUEST`
- Existing slot: level, current zone, playtime, last updated
- Delete action: guarded by a two-step confirm inside RPG save select

Expected: loading slot 0, quitting, and reloading slot 0 restores the same save summary.

- [ ] **Step 4: Share 3D canvas handles safely**

Both `launch3DGame` and `launchRPGGame` accept optional `options.canvases`, with fallback to current DOM lookup.

Expected: no duplicate WebGL canvas is added to the DOM.

- [ ] **Step 5: Verify**

Run:

```bash
node test-results/test-rpg-alpha-data-flow.mjs
node test-results/test-rpg-alpha-mode-flow.mjs
```

Expected: save creation, load, write, summaries, RPG launch, save select, return-to-title all pass.

## Milestone 3: Hub, NPCs, Dialogue, and Quest Board

**Purpose:** Make the player feel like they are inside an authored RPG space, not an empty test scene.

**Files:**

- Create: `js/rpg/npc.js`
- Create: `js/rpg/quest-system.js`
- Create: `js/rpg/world-map-rpg.js`
- Modify: `js/rpg/constants-rpg.js`
- Modify: `js/rpg/hud-rpg.js`
- Modify: `js/game-rpg.js`

- [ ] **Step 1: Build the alpha hub**

Hub contains:

- Granny Thistle near quest board.
- Crafting bench.
- World map exit.
- Player tent.
- Storage chest visual.
- A safe boundary.

Expected: hub has no enemies and no damage sources.

- [ ] **Step 2: Add NPC interaction**

NPC model factories return metadata only:

```javascript
{ id, species, name, questId, dialogueId, x, z, radius, group }
```

Expected: NPC modules do not import quest, inventory, HUD, or zone modules.

- [ ] **Step 3: Add dialogue overlay**

Dialogue text is capped to two short lines per page. Enter/Space advances. Escape closes.

Expected: all dialogue fits at 960x540.

- [ ] **Step 4: Add quest board**

Quest board lists available quests from content tables based on save state. It supports:

- Highlight.
- Accept.
- Back.
- Reward preview.
- Destination zone.

Expected: accepting `The Hero Sign-Up Sheet` sets active quest and shows an objective tracker.

- [ ] **Step 5: Add world map screen**

World map lists unlocked zones and locks unavailable zones with a short reason.

Expected: Forest Edge is unlocked at new game; Rabbit Village unlocks after the first quest; later zones unlock through quest rewards.

## Milestone 4: Combat, Gathering, Inventory, and Crafting

**Purpose:** Build the core RPG loop: fight, gather, craft, equip, save.

**Files:**

- Create: `js/rpg/combat-rpg.js`
- Create: `js/rpg/inventory.js`
- Modify: `js/rpg/constants-rpg.js`
- Modify: `js/rpg/hud-rpg.js`
- Modify: `js/game-rpg.js`

- [ ] **Step 1: Add manual combat**

Combat supports:

- Enter/Space attack.
- Short melee range.
- Player attack cooldown.
- Enemy HP.
- Player HP.
- Enemy contact damage.
- Hit flash and knockback.

Expected: three tutorial zombies can kill an idle player, and an active player can defeat them.

- [ ] **Step 2: Add death and respawn**

Death does not end the save. The player respawns at the current zone entrance with full HP and loses 10% of carried ingredients, rounded down per ingredient.

Expected: completed quests and equipment survive death.

- [ ] **Step 3: Add gathering nodes**

Nodes require proximity and Enter/Space. Each node has id, ingredient, amount, x, z, radius, and collected state.

Expected: gathered nodes remain collected until the quest resets or the player starts a new run of the zone.

- [ ] **Step 4: Add inventory and equipment menu**

Inventory menu shows ingredients and crafted gear. Equipping a weapon changes combat stats immediately.

Expected: Wooden Club increases attack compared with empty paws.

- [ ] **Step 5: Add crafting bench**

Crafting supports four alpha recipes:

- `woodenClub`
- `bananaTrap`
- `bananaCannon`
- `glassTelescope`

Expected: craft attempts with missing ingredients show a short readable failure line; successful craft consumes ingredients, adds gear, equips gear when the recipe defines `equipsTo`, and writes save.

## Milestone 5: Progression, Reputation, Journal, and Rewards

**Purpose:** Add the RPG growth systems that make repeated play matter.

**Files:**

- Create: `js/rpg/progression-rpg.js`
- Create: `js/rpg/journal-rpg.js`
- Modify: `js/rpg/constants-rpg.js`
- Modify: `js/rpg/quest-system.js`
- Modify: `js/rpg/hud-rpg.js`
- Modify: `js/game-rpg.js`

- [ ] **Step 1: Add XP and levels**

XP comes from quest rewards and zombie defeats. Level curve:

```text
level 1 -> 2: 20 XP
level 2 -> 3: 45 XP
level 3 -> 4: 80 XP
```

Expected: reaching level 2 increases max HP by 10 and attack by 1.

- [ ] **Step 2: Add reputation**

Alpha reputation has three species:

- Rabbits
- Monkeys
- Turtles

Alpha ranks:

- `stranger`
- `friend`

Expected: completing each species' first main quest promotes that species to `friend`, changes at least one NPC line, and persists.

- [ ] **Step 3: Add journal and stickers**

Stickers:

- `myFirstBonk`
- `rabbitRescuer`
- `bananaHero`
- `turtleHelper`
- `spaceshipWitness`

Expected: first zombie defeat unlocks `myFirstBonk`; each alpha quest completion unlocks one sticker.

- [ ] **Step 4: Add reward banners**

Reward banners show:

- Quest name.
- XP gained.
- Ingredients gained.
- Recipe unlocks.
- Sticker unlocks.

Expected: every completed alpha quest has a reward banner before returning to normal play.

## Milestone 6: Alpha Quest Content

**Purpose:** Build the authored Prologue + Act 1 content.

**Files:**

- Modify: `js/rpg/constants-rpg.js`
- Modify: `js/rpg/zone.js`
- Modify: `js/rpg/npc.js`
- Modify: `js/game-rpg.js`
- Modify: `js/rpg/hud-rpg.js`

- [ ] **Step 1: Implement `The Hero Sign-Up Sheet`**

Objective: defeat 3 tutorial zombies in Forest Edge and gather 5 Wood.

Reward: 10 XP, Wooden Club recipe, Rabbit Village unlock, `myFirstBonk` sticker if not already earned.

- [ ] **Step 2: Implement `Operation Bunny Rescue`**

Objective: clear Rabbit Village, interact with 3 rescued rabbit villagers.

Reward: 20 XP, 4 Wood, 2 Glass, Rabbits become `friend`, `rabbitRescuer` sticker.

- [ ] **Step 3: Implement `Banana Emergency`**

Objective: recover 8 Bananas in Monkey Jungle and defeat 5 zombies around the banana stash.

Reward: 30 XP, Banana Trap recipe, Banana Cannon recipe, Monkeys become `friend`, `bananaHero` sticker.

- [ ] **Step 4: Implement `Turtle Express`**

Objective: escort Shellbert across Sunny Meadow while keeping Shellbert above 1 HP.

Reward: 35 XP, 3 Metal, 3 Gems, Turtles become `friend`, `turtleHelper` sticker.

- [ ] **Step 5: Implement `Bigger Than My Statue`**

Objective: craft Glass Telescope, travel to Sandy Beach, interact with the telescope point.

Reward: 40 XP, Sandy Beach complete flag, `spaceshipWitness` sticker, alpha end-card unlocked.

- [ ] **Step 6: Add alpha end-card**

After the spaceship reveal, show a clear alpha-complete message and return the player to the hub with progress saved.

Expected: the save can reload after the end-card and show all completed alpha quests.

## Milestone 7: Readability, Audio, and Feel

**Purpose:** Make the alpha understandable and satisfying for the intended audience.

**Files:**

- Modify: `js/rpg/hud-rpg.js`
- Modify: `js/game-rpg.js`
- Modify: `js/rpg/constants-rpg.js`
- Modify: `js/3d/audio.js` only if the existing audio manager needs reusable event IDs.

- [ ] **Step 1: Keep language kid-readable**

Player-facing RPG copy uses short words and short lines. No dense RPG jargon in alpha UI.

Expected: dialogue and objective text fit without wrapping over controls at 960x540.

- [ ] **Step 2: Add mouth-made SFX hooks**

Events:

- Menu select.
- Quest accept.
- Attack.
- Hit.
- Zombie defeat.
- Ingredient pickup.
- Craft success.
- Quest complete.
- Player death.

Expected: each event plays an existing sound when a matching sound exists; missing sounds are logged as follow-up beads.

- [ ] **Step 3: Add first-60-seconds reward**

The first zombie defeat triggers a visible `MY FIRST BONK` sticker/reward moment.

Expected: a new player sees a reward moment before completing the first quest.

- [ ] **Step 4: Visual QA**

Check these viewports:

- 960x540
- 1280x720
- 390x844

Expected: no core UI text overlaps, no button text overflows, and the RPG scene is nonblank.

## Milestone 8: Automated and Manual Alpha Gate

**Purpose:** Prove the mode works as a third mode and meets the non-negotiable RPG rubric.

**Files:**

- Create: `docs/reviews/rpg-alpha-qa-report.md`
- Modify: `test-results/test-rpg-alpha-data-flow.mjs`
- Modify: `test-results/test-rpg-alpha-mode-flow.mjs`
- Modify: `test-results/test-mode-regression.mjs`

- [ ] **Step 1: Data-flow test**

Run:

```bash
node test-results/test-rpg-alpha-data-flow.mjs
```

Expected: save, quest, inventory, crafting, progression, reputation, and journal checks pass.

- [ ] **Step 2: Mode-flow test**

Run:

```bash
node test-results/test-rpg-alpha-mode-flow.mjs
```

Expected: title -> mode menu -> Animal Rescue -> animal select -> save slot -> hub -> return title -> reload same save passes.

- [ ] **Step 3: Existing-mode regression test**

Run:

```bash
node test-results/test-mode-regression.mjs
```

Expected: 2D Classic and 3D Survivor still launch from the same mode menu after RPG is added.

- [ ] **Step 4: Manual full alpha pass**

Manual route:

```text
Title -> Animal Rescue -> animal -> save slot 0 -> complete all five alpha quests -> quit -> reload slot 0 -> verify completed quests and unlocked recipes -> return title -> launch 2D Classic -> return title -> launch 3D Survivor.
```

Expected: no crash, no stuck controls, no missing save state, no blank canvas.

- [ ] **Step 5: Check every rubric box**

Open this plan and change every non-negotiable RPG rubric checkbox from `[ ]` to `[x]` only after direct automated or manual evidence exists.

Expected: all 20 rubric boxes are checked in the final alpha landing commit.

## Implementation Order

1. Mode catalog and startup RPG button.
2. RPG launcher shell, save select, cleanup.
3. Hub, NPC interaction, quest board, world map.
4. Combat, gathering, inventory, crafting.
5. XP, reputation, journal, reward banners.
6. Five alpha quests.
7. Readability, audio, and feel.
8. Automated regression, full manual playthrough, rubric landing.

This order is strict. Content expansion starts only after the launcher, persistence, and quest loop are verified.

## Follow-Up Beads After Alpha

These are explicitly outside the alpha gate:

- Act 2 story chain and Cure Cocoa.
- Act 3 King Fred finale.
- Vehicles beyond alpha recipe gating.
- Full wardrobe and tent decoration system.
- Fred flags and hidden grottos.
- Post-game party and Banana Car race.
- Full six-species Hero reputation ladder.
- Online publishing polish.

## Approval Gate

Implementation should not start until the user approves Approach A and the non-negotiable RPG rubric above. After approval, set the implementation bead to `implementing` and execute one milestone at a time with verification before each commit.
