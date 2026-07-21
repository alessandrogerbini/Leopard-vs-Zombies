# RPG Alpha State Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring Animal Rescue RPG from the current planning state to a playable alpha with a selectable startup-menu button, persistent progression, authored quests, and enough RPG structure to be judged as a real third game mode.

**Architecture:** Add the RPG through a stable mode-selection trunk and an independent `game-rpg.js` orchestrator. RPG systems live under `js/rpg/`, share content and persistence through trunk modules, and communicate through `game-rpg.js` wiring instead of branch-to-branch imports.

**Tech Stack:** Vanilla JavaScript ES modules, Three.js global `THREE`, Canvas 2D HUD overlay, localStorage persistence, Puppeteer browser smoke tests, manual browser QA at 960x540, 1280x720, and 390x844.

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

## Alpha Runtime Loop

The intended alpha loop is 20-30 minutes:

```text
startup popup/menu -> ANIMAL RESCUE -> animal select -> RPG save select -> hub -> quest board or NPC -> zone -> combat/gather/rescue -> reward banner -> craft/equip -> unlock next destination -> hub reaction -> save/reload proof
```

Each authored quest must complete at least one cycle through that loop. The hub is the default return point after quest completion, death/respawn, and alpha end-card dismissal.

## Alpha Quest Unlock Chain

This chain is strict. Later zones do not appear as playable travel options until the listed trigger has persisted to the save.

| Order | Quest | Start | Play Zone | Unlock/State Reward |
| --- | --- | --- | --- | --- |
| 0 | New save | Hub save slot | Hub, Forest Edge | Forest Edge unlocked, no crafted recipes yet |
| 1 | `The Hero Sign-Up Sheet` | Quest board | Forest Edge | Wooden Club recipe, Rabbit Village unlock |
| 2 | `Operation Bunny Rescue` | Granny Thistle or quest board | Rabbit Village | `rescued.rabbitVillage = true`, Rabbits become `friend`, Monkey Jungle unlock |
| 3 | `Banana Emergency` | Monkey foreman NPC | Monkey Jungle | Banana Trap recipe, Banana Cannon recipe, `rescued.bananaStand = true`, Monkeys become `friend`, Sunny Meadow unlock |
| 4 | `Turtle Express` | Shellbert NPC | Sunny Meadow | `rescued.shellbert = true`, Glass Telescope recipe, Turtles become `friend`, Sandy Beach unlock |
| 5 | `Bigger Than My Statue` | Owl telescope prompt | Sandy Beach | `spaceshipWitness = true`, alpha end-card unlocked |

## Recipe Costs, Ingredient Sources, and Gear Effects

| Ingredient | Alpha Sources | Persistence Rule |
| --- | --- | --- |
| Wood | Forest Edge stumps, Rabbit Village crates | Collected node ids persist until the zone reset policy says otherwise |
| Metal | Sunny Meadow scrap, Sandy Beach tide junk | Inventory amount persists after reload and loses 10% on player death |
| Bananas | Monkey Jungle bunches, banana stash reward | Inventory amount persists after reload and fuels banana gear |
| Gems | Sunny Meadow shiny rocks, Sandy Beach shells | Inventory amount persists after reload and gates late alpha crafting |
| Glass | Rabbit Village window shards, Sandy Beach bottles | Inventory amount persists after reload and gates telescope crafting |

| Recipe | Cost | Earliest Craft Point | Effect |
| --- | --- | --- | --- |
| Wooden Club | 5 Wood | After `The Hero Sign-Up Sheet` unlocks the recipe | Weapon, +4 attack over empty paws |
| Banana Trap | 4 Wood, 4 Bananas | During `Banana Emergency` after the first banana stash objective | Gadget, slows or stuns a small zombie group |
| Banana Cannon | 2 Wood, 8 Bananas, 1 Metal | During `Banana Emergency` after trap tutorial success | Gear, required to fire one banana-shot payoff before quest completion |
| Glass Telescope | 2 Glass, 2 Metal, 2 Gems | After `Turtle Express` unlocks the recipe | Gadget, required at Sandy Beach to trigger the spaceship reveal |

## Persistent World-State Reactions After Reload

These reactions make the alpha feel like an RPG instead of five isolated chores:

- Rabbit Village shows rescued rabbit villagers after `rescued.rabbitVillage = true`; at least one rescued rabbit also appears in the hub after reload.
- Monkey Jungle shows a restored banana stand after `rescued.bananaStand = true`; one monkey NPC line changes after reload and mentions the Banana Cannon payoff.
- Shellbert remains safe after `rescued.shellbert = true`; Turtle dialogue changes after reload and the world map keeps Sandy Beach unlocked.
- The alpha end-card is not replayed on every load after `spaceshipWitness = true`; the journal keeps the `spaceshipWitness` sticker and the hub has one follow-up line about the reveal.

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
rpg/zone.js, rpg/npc.js -> rpg/model-factory-rpg.js
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
rpg/* -> js/3d/*
```

The orchestrator owns cross-system decisions. A quest can declare `objective.kind = 'defeatZombie'`; combat reports `defeatZombie` events to `game-rpg.js`; `game-rpg.js` calls quest progress functions.

RPG may reuse 3D animal-model ideas only by either creating RPG-local factories in `js/rpg/model-factory-rpg.js` or by first extracting truly shared model factories into a neutral trunk module in a separate reviewed bead. RPG must not import Survivor-owned `js/3d/*` modules during alpha implementation.

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
- `js/rpg/model-factory-rpg.js` - RPG-local voxel model helpers for player, NPC, enemy, and prop models.
- `js/rpg/zone.js` - hub and alpha-zone scene construction and disposal.
- `js/rpg/npc.js` - rabbit, monkey, turtle, fox, owl NPC model factories and interaction metadata.
- `js/rpg/world-map-rpg.js` - unlocked-zone list, travel options, current-zone transition policy.
- `js/rpg/journal-rpg.js` - quest log entries, sticker unlocks, first-bonk and quest-complete journal state.
- `js/rpg/hud-rpg.js` - save select, HUD, dialogue, quest board, crafting, inventory, world map, pause menu.
- `test-results/test-rpg-alpha-data-flow.mjs` - pure Node data-flow test for persistence, quest, crafting, progression, journal, using fake `localStorage`.
- `test-results/test-rpg-alpha-mode-flow.mjs` - Puppeteer flow test for startup menu, RPG launch, save slot, hub, quest play, quit/reload, screenshots.
- `test-results/test-mode-regression.mjs` - Puppeteer test that 2D Classic and 3D Survivor still launch.

## TDD Contract Per Milestone

Every implementation bead must follow this rhythm:

1. Create or extend the named test file first.
2. Run the exact milestone command and record the expected failure in the bead notes.
3. Implement the smallest scoped change that makes the failing case pass.
4. Re-run the same command, then run the previous milestone's passing command when the current work touches shared launch, save, HUD, or mode-selection behavior.
5. Commit only after the milestone command passes and the bead notes identify the command that passed.

`test-results/test-rpg-alpha-data-flow.mjs` must stay pure Node. It imports pure RPG modules and stubs `localStorage` with an in-memory object. DOM, Three.js rendering, canvas visibility, pointer hit testing, screenshots, and cleanup checks belong in Puppeteer tests.

`test-results/test-rpg-alpha-mode-flow.mjs` and `test-results/test-mode-regression.mjs` must use Puppeteer through:

```javascript
import puppeteer from 'puppeteer';
```

Do not add Playwright imports unless `package.json` is updated in the same bead and all browser tests are migrated deliberately.

## Browser Test Standard

Browser tests must accept `BASE_URL`, default to `http://localhost:8080`, and fail on:

- `pageerror`.
- console messages with type `error`.
- failed document, script, module, stylesheet, image, audio, or fetch requests.
- blank primary canvas or HUD canvas when the tested mode should be visible.
- unexpected `localStorage` leakage between RPG save slots, animals, or test cases.

Use this server wrapper for Puppeteer commands:

```bash
PORT="${PORT:-8080}"
BASE_URL="http://localhost:${PORT}"
python3 -m http.server "$PORT" >/tmp/lvz-http.log 2>&1 &
SERVER_PID=$!
trap 'kill "$SERVER_PID" 2>/dev/null || true' EXIT
sleep 1
BASE_URL="$BASE_URL" node test-results/test-rpg-alpha-mode-flow.mjs --case <case-name>
```

If port 8080 is already in use, set `PORT=8081` and the tests must honor the matching `BASE_URL`.

Modify:

- `index.html` - describe `#game3d` and `#hud3d` as shared 3D mode canvases.
- `js/state.js` - update JSDoc/state comments to include `rpgMode` or shared external-mode state.
- `js/game.js` - use `GAME_MODES.length`, route by `mode.id`, add click/tap selection for mode-card buttons, launch `launchRPGGame`.
- `js/renderer.js` - draw mode cards from `GAME_MODES`, including `ANIMAL RESCUE`, with responsive 3-card layout.
- `js/game3d.js` - accept optional canvas handles through `options.canvases` while keeping current DOM fallback.

## Non-Negotiable RPG Rubric

These are the boxes that must be checked during alpha landing. If one remains unchecked, Animal Rescue is not an RPG alpha yet.

Each checkbox must link to an entry in `docs/reviews/rpg-alpha-qa-report.md`. A checkbox cannot be changed to `[x]` without direct evidence from an automated command, a manual route, a screenshot set, or an audio asset mapping noted in that report.

- [ ] **Startup selection:** The startup popup/menu has an exact `ANIMAL RESCUE` button/card label; keyboard and click/tap can select it.
- [ ] **Third-mode isolation:** Starting and exiting RPG does not corrupt 2D Classic, 3D Survivor, title preview, key state, or canvas visibility across repeated launch/exit cycles.
- [ ] **Persistent saves:** Three save slots per animal persist level, XP, HP, ingredients, inventory, equipment, quests, reputation, journal, unlocked zones, current zone, rescued flags, alpha end-card state, and playtime.
- [ ] **Authored hub:** The player starts in a safe hub with named NPCs, quest board, crafting bench, world map exit, and interaction prompts that fit the supported viewports.
- [ ] **Quest log:** The player can accept quests, see the active objective, complete objectives, receive rewards, and review completed quests after reload.
- [ ] **NPC dialogue:** At least four named NPCs have two-line-or-shorter dialogue tied to quests or persisted world state.
- [ ] **World travel:** At least six alpha zones are reachable through an in-game world map or hub exit: Hub, Forest Edge, Rabbit Village, Monkey Jungle, Sunny Meadow, Sandy Beach.
- [ ] **Combat loop:** Player has HP, manual attack, enemy HP, enemy contact damage, defeat feedback, death/respawn, and no permadeath.
- [ ] **Rescue identity:** At least two quests visibly rescue or restore animals, and saved animals remain saved in world state after reload.
- [ ] **Inventory:** The player can collect all five core ingredients: Wood, Metal, Bananas, Gems, Glass.
- [ ] **Crafting:** At least four recipes exist and work with the listed costs and effects: Wooden Club, Banana Trap, Banana Cannon, Glass Telescope.
- [ ] **Equipment:** Crafted gear can be equipped, changes combat or unlocks progress, and persists after reload.
- [ ] **Progression:** XP and level increase through play; level changes at least one stat or unlock; progress persists.
- [ ] **Reputation:** Rabbits, Monkeys, and Turtles have Stranger/Friend reputation states with at least one persisted dialogue or world-state reaction per species.
- [ ] **Journal/stickers:** First bonk and every alpha quest completion unlock visible journal entries or stickers that persist.
- [ ] **Reward cadence:** The first 60 seconds contain a visible reward moment; each quest completion has a reward popup/banner; the first 10 minutes have at least three visible rewards.
- [ ] **Readable UI:** HUD, save slots, dialogue, quest board, crafting, inventory, world map, and pause menu text fit at 960x540, 1280x720, and 390x844.
- [ ] **Audio baseline:** Existing mouth-made SFX are mapped to attack, hit, zombie defeat, quest complete, crafting, and menu select events; required mappings have asset IDs and no 404s.
- [ ] **Cleanup:** Exiting RPG removes listeners, cancels animation frames, disposes Three.js resources, clears HUD pixels, hides RPG canvases, and returns to title with `onReturn` invoked at most once.
- [ ] **Regression coverage:** Automated flow tests prove 2D Classic, 3D Survivor, and RPG can each launch after the mode menu change, including RPG -> title -> RPG, RPG -> title -> 2D, and RPG -> title -> 3D.

## Rubric Evidence Matrix

| Rubric Item | Automated Test | Manual Evidence | Required Report Entry |
| --- | --- | --- | --- |
| Startup selection | `test-mode-regression.mjs --case mode-menu-three-cards` | screenshot of startup popup/menu | label, keyboard, click/tap |
| Third-mode isolation | `test-mode-regression.mjs --case repeated-mode-launches` | manual Escape-spam route | canvas visibility and key-state notes |
| Persistent saves | `test-rpg-alpha-data-flow.mjs --case save-slots` | reload slot 0 after quest progress | localStorage keys and save summary |
| Authored hub | `test-rpg-alpha-mode-flow.mjs --case hub-baseline` | hub screenshot | NPC, bench, board, map, safe-zone checklist |
| Quest log | `test-rpg-alpha-data-flow.mjs --case quest-log` | quest log screenshot before and after completion | active/completed quest state |
| NPC dialogue | `test-rpg-alpha-mode-flow.mjs --case npc-dialogue` | four NPC dialogue screenshots | NPC names and dialogue IDs |
| World travel | `test-rpg-alpha-data-flow.mjs --case world-unlocks` | world-map screenshots across unlocks | six-zone unlock table |
| Combat loop | `test-rpg-alpha-mode-flow.mjs --case combat-death-respawn` | death/respawn QA note | HP, enemy HP, respawn state |
| Rescue identity | `test-rpg-alpha-data-flow.mjs --case rescued-flags` | before/after/reload screenshots | rescued flags and restored NPCs |
| Inventory | `test-rpg-alpha-data-flow.mjs --case ingredients` | inventory screenshot | all five ingredient counts |
| Crafting | `test-rpg-alpha-data-flow.mjs --case recipes` | crafting menu screenshot | recipe costs and results |
| Equipment | `test-rpg-alpha-data-flow.mjs --case equipment` | equipped gear screenshot | stat or unlock change |
| Progression | `test-rpg-alpha-data-flow.mjs --case progression` | level-up screenshot | XP, level, stat change |
| Reputation | `test-rpg-alpha-data-flow.mjs --case reputation` | NPC follow-up screenshots | species rank and reaction |
| Journal/stickers | `test-rpg-alpha-data-flow.mjs --case journal` | journal screenshot | sticker IDs and entries |
| Reward cadence | `test-rpg-alpha-mode-flow.mjs --case reward-cadence` | first-10-minute QA route | timestamps or sequence notes |
| Readable UI | `test-rpg-alpha-mode-flow.mjs --case readability` | 960x540, 1280x720, 390x844 screenshots | no-overlap checklist |
| Audio baseline | `test-rpg-alpha-data-flow.mjs --case audio-manifest` | audio manifest QA note | event -> asset mapping |
| Cleanup | `test-rpg-alpha-mode-flow.mjs --case cleanup` | repeated exit QA note | listener, RAF, canvas, HUD checks |
| Regression coverage | `test-mode-regression.mjs --case all-modes` | title-to-mode manual route | Classic, Survivor, RPG launch proof |

## Milestone 0: Sprint Lock and Bead Mapping

**Purpose:** Turn this plan into implementation-ready work without changing gameplay code.

- [x] **Step 1: Confirm Approach A**

User approved Approach A on 2026-07-21. The chosen architecture is vertical-slice first, alpha layers second.

- [x] **Step 2: Attach plan to a coding sprint epic**

The sprint epic exists:

- Epic: `Leopard vs Zombies-agy` - `RPG Alpha Coding Sprint`
- Planning gate: `Leopard vs Zombies-qrf` - complete
- Refinement gate: `Leopard vs Zombies-agy.1` - complete

Implementation beads are ordered by dependencies:

| Order | Plan Scope | Bead |
| --- | --- | --- |
| 0 | Sub-chain refinement of this plan | `Leopard vs Zombies-agy.1` |
| 1 | Milestone 1: startup mode button and launcher shell | `Leopard vs Zombies-1xz` |
| 2 | Milestone 2: runtime shell and saves | `Leopard vs Zombies-1fl` |
| 3 | Milestone 3: hub, NPCs, dialogue, quest board | `Leopard vs Zombies-mwm` |
| 4 | Milestone 4: combat, gathering, inventory, crafting | `Leopard vs Zombies-18m` |
| 5 | Milestone 5: progression, reputation, journal, rewards | `Leopard vs Zombies-agy.2` |
| 6 | Milestone 6: alpha quest content | `Leopard vs Zombies-l6c` |
| 7 | Milestone 7: readability, audio, feel | `Leopard vs Zombies-agy.3` |
| 8 | Milestone 8: automated and manual alpha gate | `Leopard vs Zombies-8rr` |

Expected: `bd dep cycles --json` returns `[]`, and `bd epic status 'Leopard vs Zombies-agy' --json` shows these children under the epic.

- [x] **Step 3: Close the refinement gate before code implementation**

Completed after this refinement patch was written:

```bash
bd close 'Leopard vs Zombies-agy.1'
bd update 'Leopard vs Zombies-1xz' --status implementing
```

Expected: `Leopard vs Zombies-1xz` is the first active coding bead.

- [x] **Step 4: Do not start gameplay implementation under this refinement bead**

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

- `GAME_MODES` with `id`, `label`, `flow`, `card.lines`, and `card.palette` for all three modes:

```javascript
export const GAME_MODES = [
  {
    id: 'classic2d',
    label: '2D CLASSIC',
    flow: 'classic2d',
    card: {
      lines: ['Tower defense', 'Build and defend', 'Classic levels'],
      palette: { border: '#66bb6a', fill: '#17351f', accent: '#9be28f' }
    }
  },
  {
    id: 'survivor3d',
    label: '3D SURVIVOR',
    flow: 'survivor3d',
    card: {
      lines: ['Open survival', 'Fight zombie waves', 'Collect wild powers'],
      palette: { border: '#ef5350', fill: '#3b1717', accent: '#ffb0a8' }
    }
  },
  {
    id: 'animalRescueRpg',
    label: 'ANIMAL RESCUE',
    flow: 'animalRescueRpg',
    card: {
      lines: ['Quest adventure', 'Save animal friends', 'Craft awesome gear'],
      palette: { border: '#d6a736', fill: '#24351f', accent: '#b7e36a' }
    }
  }
];
```

- `getModeByIndex(index)`
- `getModeCardLayout(width, height)`
- `hitTestModeCard(width, height, x, y)`

Expected: no mode count is duplicated in `game.js` or `renderer.js`.

- [ ] **Step 2: Update state machine selection**

Change mode navigation from hard-coded `% 2` to `GAME_MODES.length`. Route by `mode.id`:

- `classic2d` -> difficulty -> animal select -> 2D launch.
- `survivor3d` -> animal select -> `launch3DGame`.
- `animalRescueRpg` -> animal select -> `launchRPGGame`.

`state.selectedMode` remains a UI index only. Clamp it on every mode-menu entry; gameplay routing must use `getModeByIndex(state.selectedMode).id`.

Expected: Escape from animal select returns to difficulty only for `classic2d`; it returns to mode select for both 3D modes.

- [ ] **Step 3: Add clickable/tappable mode-card buttons**

Add pointer handling in `game.js` for `modeSelect`:

- Click inside a card selects it.
- A second click on the selected card continues.
- Enter/Space continue for keyboard users.
- Pointer coordinates are normalized from CSS pixels to canvas backing pixels before calling `hitTestModeCard(width, height, x, y)`.
- Mouse, touch, and pointer events use the same hit-test path.

Expected: mouse users can press the `ANIMAL RESCUE` card from the startup menu without using arrow keys.

- [ ] **Step 4: Draw three responsive mode cards**

Update `drawModeSelectScreen()` to draw from `GAME_MODES`, using the shared layout function and catalog-owned labels, copy, and palette.

Expected: all three cards fit at 960x540, with no text overflow.

- [ ] **Step 5: Add external runtime ownership in `game.js`**

`game.js` owns one active external-mode runtime at a time:

- launching 3D Survivor or Animal Rescue pauses the 2D update/draw loop once.
- the launcher returns either a cleanup function or an object with `cleanup()`.
- `onReturn` is idempotent and may only restart the title loop once.
- repeated Escape presses during runtime cleanup do not trigger duplicate title loops.

Expected: RPG -> title -> RPG, RPG -> title -> 2D Classic, and RPG -> title -> 3D Survivor can run in one browser session without stale listeners or canvas state.

- [ ] **Step 6: Add minimal RPG launch screen**

Create `launchRPGGame({ animal, canvases, onReturn })` in `js/game-rpg.js`. For this milestone it must show a real nonblank `ANIMAL RESCUE` launch screen on the shared 3D HUD canvas, display the chosen animal name, and return to title when Escape is pressed. It does not create a save yet.

Expected: 2D and Survivor still launch; pressing the RPG card enters a visible Animal Rescue screen; Escape clears both shared 3D canvases, hides them predictably, removes the Escape listener, and returns to title.

- [ ] **Step 7: Write the failing mode-regression test**

Add `--case mode-menu-three-cards`, `--case rpg-launch-return`, and `--case repeated-mode-launches` to `test-results/test-mode-regression.mjs`.

Expected failing output before implementation: assertions fail because only two cards render, `ANIMAL RESCUE` is missing, and `launchRPGGame` is not imported.

- [ ] **Step 8: Verify**

Run:

```bash
PORT="${PORT:-8080}"
BASE_URL="http://localhost:${PORT}"
python3 -m http.server "$PORT" >/tmp/lvz-http.log 2>&1 &
SERVER_PID=$!
trap 'kill "$SERVER_PID" 2>/dev/null || true' EXIT
sleep 1
BASE_URL="$BASE_URL" node test-results/test-mode-regression.mjs --case mode-menu-three-cards
BASE_URL="$BASE_URL" node test-results/test-mode-regression.mjs --case rpg-launch-return
BASE_URL="$BASE_URL" node test-results/test-mode-regression.mjs --case repeated-mode-launches
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
  unlockedRecipes: [],
  currentZone: 'hub',
  rescued: {},
  flags: { spaceshipWitness: false, alphaEndCardSeen: false },
  updatedAt: 0,
  playtimeSeconds: 0
}
```

Expected: invalid saves are ignored and replaced with a fresh default without deleting the invalid localStorage value. Save keys are separated by animal and slot so Leopard slot 0 cannot overwrite Tiger slot 0.

- [ ] **Step 2: Add RPG launcher**

`launchRPGGame({ animal, canvases, onReturn })` opens RPG save select first. `game.js` does not track save slots. The RPG runtime starts only after the player chooses a slot.

After slot selection, `game-rpg.js` owns:

- Canvas visibility.
- Three.js renderer.
- HUD canvas.
- Runtime state.
- Key and pointer listeners.
- Animation frame.
- Cleanup.

Expected: Escape/onReturn is idempotent; cleanup removes all listeners, cancels RAF, disposes renderer resources, clears HUD, resets canvas visibility, returns to title, and restarts the 2D loop exactly once.

- [ ] **Step 3: Add save-select screen**

The RPG HUD draws three save-slot buttons for the chosen animal:

- Empty slot: `NEW QUEST`
- Existing slot: level, current zone, playtime, last updated
- Delete action: guarded by a two-step confirm inside RPG save select

Expected: loading slot 0, quitting, and reloading slot 0 restores the same save summary.

- [ ] **Step 4: Share 3D canvas handles safely**

Both `launch3DGame` and `launchRPGGame` accept optional `options.canvases`, with fallback to current DOM lookup.

Expected: no duplicate WebGL canvas is added to the DOM.

- [ ] **Step 5: Write failing save and launcher tests**

Extend `test-results/test-rpg-alpha-data-flow.mjs` with:

- `--case save-slots` for three slots per animal, cross-animal separation, invalid-save preservation, summary formatting, and playtime.
- `--case save-reload` for writing slot 0, reading it back, and confirming fields from the schema survive.

Extend `test-results/test-rpg-alpha-mode-flow.mjs` with:

- `--case rpg-save-select` for title -> Animal Rescue -> animal -> save select.
- `--case cleanup` for RPG save select -> Escape -> title -> RPG -> Escape -> title.

Expected failing output before implementation: save-system exports are missing, save select is not drawn, and cleanup instrumentation cannot observe a completed RPG runtime.

- [ ] **Step 6: Verify**

Run:

```bash
node test-results/test-rpg-alpha-data-flow.mjs --case save-slots
node test-results/test-rpg-alpha-data-flow.mjs --case save-reload
PORT="${PORT:-8080}"
BASE_URL="http://localhost:${PORT}"
python3 -m http.server "$PORT" >/tmp/lvz-http.log 2>&1 &
SERVER_PID=$!
trap 'kill "$SERVER_PID" 2>/dev/null || true' EXIT
sleep 1
BASE_URL="$BASE_URL" node test-results/test-rpg-alpha-mode-flow.mjs --case rpg-save-select
BASE_URL="$BASE_URL" node test-results/test-rpg-alpha-mode-flow.mjs --case cleanup
```

Expected: save creation, load, write, summaries, RPG launch, save select, return-to-title all pass.

## Milestone 3: Hub, NPCs, Dialogue, and Quest Board

**Purpose:** Make the player feel like they are inside an authored RPG space, not an empty test scene.

**Files:**

- Create: `js/rpg/npc.js`
- Create: `js/rpg/quest-system.js`
- Create: `js/rpg/zone.js`
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

Expected: Forest Edge is unlocked at new game; Rabbit Village, Monkey Jungle, Sunny Meadow, and Sandy Beach unlock only through the alpha quest chain.

- [ ] **Step 6: Write failing hub and quest-board tests**

Extend `test-results/test-rpg-alpha-data-flow.mjs` with `--case hub-quest-board` for quest availability, accept state, active objective, and world-map lock reasons.

Extend `test-results/test-rpg-alpha-mode-flow.mjs` with `--case hub-dialogue-world-map` for hub render, four named NPC prompts, two-line dialogue pages, quest board, and world map navigation.

Expected failing output before implementation: hub zone exports are missing, no quest board state exists, and Puppeteer cannot find hub/dialogue/world-map UI.

- [ ] **Step 7: Verify**

Run:

```bash
node test-results/test-rpg-alpha-data-flow.mjs --case hub-quest-board
PORT="${PORT:-8080}"
BASE_URL="http://localhost:${PORT}"
python3 -m http.server "$PORT" >/tmp/lvz-http.log 2>&1 &
SERVER_PID=$!
trap 'kill "$SERVER_PID" 2>/dev/null || true' EXIT
sleep 1
BASE_URL="$BASE_URL" node test-results/test-rpg-alpha-mode-flow.mjs --case hub-dialogue-world-map
```

Expected: hub, NPC prompts, dialogue, quest board, and world map flows pass.

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

- [ ] **Step 6: Write failing combat and crafting tests**

Extend `test-results/test-rpg-alpha-data-flow.mjs` with:

- `--case ingredients` for all five ingredient types and node persistence.
- `--case recipes` for Wooden Club, Banana Trap, Banana Cannon, and Glass Telescope costs/effects.
- `--case equipment` for equipping gear, stat/effect change, and reload persistence.

Extend `test-results/test-rpg-alpha-mode-flow.mjs` with `--case combat-death-respawn` for manual attack, enemy damage, player damage, death, respawn, and no permadeath.

Expected failing output before implementation: combat and inventory modules are missing or return no state changes.

- [ ] **Step 7: Verify**

Run:

```bash
node test-results/test-rpg-alpha-data-flow.mjs --case ingredients
node test-results/test-rpg-alpha-data-flow.mjs --case recipes
node test-results/test-rpg-alpha-data-flow.mjs --case equipment
PORT="${PORT:-8080}"
BASE_URL="http://localhost:${PORT}"
python3 -m http.server "$PORT" >/tmp/lvz-http.log 2>&1 &
SERVER_PID=$!
trap 'kill "$SERVER_PID" 2>/dev/null || true' EXIT
sleep 1
BASE_URL="$BASE_URL" node test-results/test-rpg-alpha-mode-flow.mjs --case combat-death-respawn
```

Expected: combat, death/respawn, gathering, inventory, crafting, equipment effects, and persistence pass.

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

- [ ] **Step 5: Write failing progression and reward tests**

Extend `test-results/test-rpg-alpha-data-flow.mjs` with:

- `--case progression` for XP, level thresholds, level 2 stat changes, and persistence.
- `--case reputation` for Rabbits, Monkeys, and Turtles Stranger/Friend transitions plus persisted reactions.
- `--case journal` for `myFirstBonk`, quest-complete stickers, entries, and persistence.

Extend `test-results/test-rpg-alpha-mode-flow.mjs` with `--case reward-cadence` for first-bonk reward timing and quest-complete reward banners.

Expected failing output before implementation: progression/journal exports are missing and reward banners are absent.

- [ ] **Step 6: Verify**

Run:

```bash
node test-results/test-rpg-alpha-data-flow.mjs --case progression
node test-results/test-rpg-alpha-data-flow.mjs --case reputation
node test-results/test-rpg-alpha-data-flow.mjs --case journal
PORT="${PORT:-8080}"
BASE_URL="http://localhost:${PORT}"
python3 -m http.server "$PORT" >/tmp/lvz-http.log 2>&1 &
SERVER_PID=$!
trap 'kill "$SERVER_PID" 2>/dev/null || true' EXIT
sleep 1
BASE_URL="$BASE_URL" node test-results/test-rpg-alpha-mode-flow.mjs --case reward-cadence
```

Expected: XP, levels, reputation, journal/stickers, first-bonk reward, and reward banners pass.

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

Reward: 20 XP, 4 Wood, 2 Glass, Rabbits become `friend`, Monkey Jungle unlock, `rescued.rabbitVillage = true`, `rabbitRescuer` sticker.

- [ ] **Step 3: Implement `Banana Emergency`**

Objective: recover 8 Bananas in Monkey Jungle, craft Banana Cannon, fire one banana-shot payoff, and defeat 5 zombies around the banana stash.

Reward: 30 XP, Banana Cannon mastery flag, Monkeys become `friend`, Sunny Meadow unlock, `rescued.bananaStand = true`, `bananaHero` sticker.

- [ ] **Step 4: Implement `Turtle Express`**

Objective: escort Shellbert across Sunny Meadow while keeping Shellbert above 1 HP.

Failure rule: if Shellbert reaches 1 HP or the player dies, the escort resets to the Sunny Meadow entrance with Shellbert at full HP; completed quests and equipment remain saved.

Reward: 35 XP, 3 Metal, 3 Gems, Glass Telescope recipe, Turtles become `friend`, Sandy Beach unlock, `rescued.shellbert = true`, `turtleHelper` sticker.

- [ ] **Step 5: Implement `Bigger Than My Statue`**

Objective: craft Glass Telescope, travel to Sandy Beach, interact with the telescope point.

Reward: 40 XP, `flags.spaceshipWitness = true`, `spaceshipWitness` sticker, alpha end-card unlocked.

- [ ] **Step 6: Add alpha end-card**

After the spaceship reveal, show a clear alpha-complete message and return the player to the hub with progress saved.

Expected: the save can reload after the end-card and show all completed alpha quests.

- [ ] **Step 7: Write failing alpha quest-chain tests**

Extend `test-results/test-rpg-alpha-data-flow.mjs` with:

- `--case world-unlocks` for the full Hub -> Forest Edge -> Rabbit Village -> Monkey Jungle -> Sunny Meadow -> Sandy Beach chain.
- `--case rescued-flags` for rabbit villagers, banana stand, Shellbert, and reload persistence.
- `--case alpha-quest-chain` for all five quest rewards, completed quest order, and alpha end-card flags.

Extend `test-results/test-rpg-alpha-mode-flow.mjs` with `--case alpha-end-card-reload` for the spaceship reveal, end-card dismissal, reload, and hub follow-up state.

Expected failing output before implementation: quest content constants are missing, unlock flags do not advance, and alpha end-card cannot render.

- [ ] **Step 8: Verify**

Run:

```bash
node test-results/test-rpg-alpha-data-flow.mjs --case world-unlocks
node test-results/test-rpg-alpha-data-flow.mjs --case rescued-flags
node test-results/test-rpg-alpha-data-flow.mjs --case alpha-quest-chain
PORT="${PORT:-8080}"
BASE_URL="http://localhost:${PORT}"
python3 -m http.server "$PORT" >/tmp/lvz-http.log 2>&1 &
SERVER_PID=$!
trap 'kill "$SERVER_PID" 2>/dev/null || true' EXIT
sleep 1
BASE_URL="$BASE_URL" node test-results/test-rpg-alpha-mode-flow.mjs --case alpha-end-card-reload
```

Expected: all alpha quest content, unlocks, rescue flags, spaceship reveal, end-card, and reload checks pass.

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

Expected: required events map to existing sound IDs in `sound-pack-alpha/sound-ids.md` or an existing audio manifest. Missing required mappings block this bead; optional polish sounds can be logged as follow-up beads.

- [ ] **Step 3: Add first-60-seconds reward**

The first zombie defeat triggers a visible `MY FIRST BONK` sticker/reward moment.

Expected: a new player sees a reward moment before completing the first quest.

- [ ] **Step 4: Visual QA**

Check these viewports:

- 960x540
- 1280x720
- 390x844

Expected: no core UI text overlaps, no button text overflows, and the RPG scene is nonblank.

- [ ] **Step 5: Write failing readability and audio tests**

Extend `test-results/test-rpg-alpha-data-flow.mjs` with `--case audio-manifest` for required RPG event IDs and asset existence.

Extend `test-results/test-rpg-alpha-mode-flow.mjs` with `--case readability` for 960x540, 1280x720, and 390x844 screenshots, nonblank canvas checks, and a simple no-overlap checklist for major HUD panels.

Expected failing output before implementation: audio event mappings are missing and screenshots do not show complete RPG UI.

- [ ] **Step 6: Verify**

Run:

```bash
node test-results/test-rpg-alpha-data-flow.mjs --case audio-manifest
PORT="${PORT:-8080}"
BASE_URL="http://localhost:${PORT}"
python3 -m http.server "$PORT" >/tmp/lvz-http.log 2>&1 &
SERVER_PID=$!
trap 'kill "$SERVER_PID" 2>/dev/null || true' EXIT
sleep 1
BASE_URL="$BASE_URL" node test-results/test-rpg-alpha-mode-flow.mjs --case readability
```

Expected: required audio mappings resolve, screenshots are captured, major UI text fits, and the RPG scene is nonblank.

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

Expected: all pure data cases pass: save slots, save reload, hub quest board, ingredients, recipes, equipment, progression, reputation, journal, world unlocks, rescued flags, alpha quest chain, and audio manifest.

- [ ] **Step 2: Mode-flow test**

Run:

```bash
PORT="${PORT:-8080}"
BASE_URL="http://localhost:${PORT}"
python3 -m http.server "$PORT" >/tmp/lvz-http.log 2>&1 &
SERVER_PID=$!
trap 'kill "$SERVER_PID" 2>/dev/null || true' EXIT
sleep 1
BASE_URL="$BASE_URL" node test-results/test-rpg-alpha-mode-flow.mjs
```

Expected: title -> mode menu -> Animal Rescue -> animal select -> save slot -> hub -> quest routes -> return title -> reload same save passes, including cleanup, readability, reward cadence, and alpha end-card cases.

- [ ] **Step 3: Existing-mode regression test**

Run:

```bash
PORT="${PORT:-8080}"
BASE_URL="http://localhost:${PORT}"
python3 -m http.server "$PORT" >/tmp/lvz-http.log 2>&1 &
SERVER_PID=$!
trap 'kill "$SERVER_PID" 2>/dev/null || true' EXIT
sleep 1
BASE_URL="$BASE_URL" node test-results/test-mode-regression.mjs
```

Expected: 2D Classic and 3D Survivor still launch from the same mode menu after RPG is added.

- [ ] **Step 4: Manual full alpha pass**

Manual route:

```text
Title -> Animal Rescue -> animal -> save slot 0 -> complete all five alpha quests -> quit -> reload slot 0 -> verify completed quests, rescued flags, equipped gear, reputation dialogue, stickers, alpha end-card state, and unlocked recipes -> return title -> launch 2D Classic -> return title -> launch 3D Survivor.
```

Expected: no crash, no stuck controls, no missing save state, no blank canvas.

- [ ] **Step 5: Check every rubric box**

Open this plan and change every non-negotiable RPG rubric checkbox from `[ ]` to `[x]` only after `docs/reviews/rpg-alpha-qa-report.md` contains the matching evidence matrix entry.

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

## Execution Gate

User approval for Approach A and the non-negotiable RPG rubric was received on 2026-07-21. Implementation still waits for `Leopard vs Zombies-agy.1` to close after this sub-chain refinement is committed and pushed. After that, set `Leopard vs Zombies-1xz` to `implementing` and execute one milestone/bead at a time with verification before each commit.
