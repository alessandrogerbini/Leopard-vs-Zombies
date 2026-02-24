# Documentation Audit — BD-153

**Date:** 2026-02-24
**Auditor:** Agent (BD-153)
**Scope:** All documentation vs. codebase after BD-134 through BD-148 sprint blitz
**Method:** Every claim cross-referenced against actual code in `js/3d/constants.js`, `js/game3d.js`, `js/3d/hud.js`, `js/3d/terrain.js`, and related modules.

---

## 1. README.md

### STALE

#### 1.1 Weapon count: says 6, actual is 11
**Doc:** `README.md` line 88 — "Six weapon types with 5 upgrade levels each"
**Code:** `js/3d/constants.js` lines 68–135 — `WEAPON_TYPES` has 11 entries: clawSwipe, boneToss, poisonCloud, lightningBolt, fireball, boomerang, mudBomb, beehiveLauncher, snowballTurret, stinkLine, turdMine.
**Impact:** README lists only the original 6 (lines 89–94). Missing: Mud Bomb, Beehive Launcher, Snowball Turret, Stink Line, Turd Mine.

#### 1.2 Scroll/Howl count: says 6, actual is 10
**Doc:** `README.md` lines 96–103 — "Six passive scroll types that stack multiple times"
**Code:** `js/3d/constants.js` lines 163–174 — `HOWL_TYPES` has 10 entries: power, haste, arcane, vitality, fortune, range, thorns, magnet, frenzy, guardian.
**Impact:** README lists only the original 6 (lines 98–103). Missing: Thorns (+10% reflect, max 3), Magnet (+25% pickup radius, max 4), Frenzy (+10% attack speed, max 4), Guardian (+8% max HP + 2 HP/s regen, max 3).

#### 1.3 Terminology: "Scrolls" vs. "Howls"
**Doc:** `README.md` lines 96–97 — Section titled "Scrolls (3D Mode)"
**Code:** `js/3d/constants.js` lines 148–174 — All references use "HOWL_TYPES"; each entry has `name: 'POWER HOWL'`, `'HASTE HOWL'`, etc. The in-game HUD (verified via `js/3d/hud.js`) displays them as "Howls."
**Impact:** README uses the legacy term "Scrolls." The system was renamed to "Howls" in-game. All code references say "howl."

#### 1.4 Item count: says 11, actual is 25
**Doc:** `README.md` lines 109–110 — "11 permanent equipment pieces"
**Code:** `js/3d/constants.js` lines 282–312 — `ITEMS_3D` has 25 entries across 4 rarity tiers (8 common, 7 uncommon, 6 rare, 4 legendary).
**Impact:** README lists only the original 11 items (lines 110). Missing 14 items added in later sprints: Rubber Ducky, Thick Fur, Silly Straw, Bandana, Hot Sauce Bottle, Bouncy Ball, Lucky Penny, Alarm Clock, Whoopee Cushion, Turbo Sneakers, Golden Bone, Crown of Claws, Zombie Magnet, Rainbow Scarf. README also does not mention the 4-tier rarity system (common/uncommon/rare/legendary) or stackable items.

#### 1.5 Shrine count and type: says "20 breakable shrines," actual is 3 types totaling 52
**Doc:** `README.md` lines 112–113 — "20 breakable shrines placed at game start"
**Code:** `js/3d/constants.js` lines 14 (`SHRINE_COUNT = 20`), 385 (`CHARGE_SHRINE_COUNT = 22`), 394 (`CHALLENGE_SHRINE_COUNT = 10`). Confirmed in `js/game3d.js` lines 1492, 1511, 1521 where all three types are generated.
**Impact:** README only mentions the original 20 breakable shrines (SHRINE_AUGMENTS type). It does not document:
- **Charge Shrines (22):** Stand near to charge for 4 seconds, then choose from 3 tiered upgrades (4 rarity tiers with different upgrade pools). Defined in `js/3d/constants.js` lines 346–392.
- **Challenge Shrines (10):** Activate to spawn a boss enemy. Boss drops guaranteed legendary loot on kill. Defined in `js/3d/constants.js` lines 394–409.

#### 1.6 Totem count: says 8, actual is 24
**Doc:** `README.md` lines 115–116 — "8 totems scattered on the map"
**Code:** `js/game3d.js` line 1501 — `const TOTEM_COUNT = 24;`
**Impact:** Totem count was increased from 8 to 24 (per BD-100). The effects per totem (line 116) are still accurate.

#### 1.7 Wave timing: says "every 4 minutes," actual is 75s first / 90s subsequent
**Doc:** `README.md` line 35 — "Wave events trigger every 4 minutes"
**Code:** `js/game3d.js` lines 283–284 — `waveEventTimer: 75` (first wave at ~1.25 min), line 4644 — `st.waveEventTimer = 90` (subsequent waves at 1.5 min). Changed by BD-131.
**Impact:** Waves are much more frequent than documented — roughly every 1.25–1.5 minutes, not 4 minutes.

#### 1.8 3D biome count: README implies 1 biome exists, but text is ambiguous
**Doc:** `README.md` line 35 refers to "infinite wave-based survival" but does not mention biome count.
**Code:** `js/3d/terrain.js` lines 77–86 — `getBiome()` always returns `'forest'`. Comment on line 79: "Desert and plains have been removed per the alpha terrain overhaul."
**Status:** README does not explicitly claim multiple biomes, so this is not wrong. However, `wildfang-current-status.md` (line 37) claims "three biomes (forest, desert, plains)" and the biome colors array (terrain.js line 95) only has `forest`. This is stale in the status doc.

#### 1.9 Powerup count: says 18, and "Litter Box" is listed but does not exist
**Doc:** `README.md` line 107 — Lists "Litter Box" as a 3D powerup
**Code:** `js/3d/constants.js` lines 203–222 — `POWERUPS_3D` has 18 entries. None is named "Litter Box" or "litterBox." The 18 powerups match the names in the doc comment (lines 183–199) but "Litter Box" from the 2D mode list was never ported.
**Impact:** The total count of 18 is correct, but "Litter Box" should not appear in the 3D list. The 2D list says 7 types and includes Litter Box (line 106); this is correct for 2D mode (`js/state.js` confirms).

#### 1.10 Difficulty modes missing Chill Mode
**Doc:** `README.md` lines 77–83 — Lists only Easy/Medium/Hard
**Code:** `js/state.js` line 139 — `chill: { label: 'CHILL', hpMult: 1.5, scoreMult: 0.5, enemySpeedMult: 0.7, powerupFreqMult: 1.5, desc: 'Relax and have fun!' }`
**Impact:** Chill Mode is a fully implemented 4th difficulty option in 2D mode. Not documented in README.

### MISSING

#### 1.11 Kill combo counter system — not documented anywhere
**Code:** `js/game3d.js` lines 418–420 (state), 437 (`COMBO_MILESTONES`), 2333–2338 (tracking + floating text). Implemented by BD-138/BD-142.
**Impact:** Combo counter is a visible gameplay feature (floating "x10 COMBO!" text with color escalation at milestones 10/25/50/100/200/500/1000). Not mentioned in README.

#### 1.12 FPS debug counter — not documented anywhere
**Code:** `js/game3d.js` lines 430–431 (state), 740–741 (backtick toggle), 4009–4013 (FPS tracking). `js/3d/hud.js` lines 1009–1016 (rendering). Implemented by BD-140.
**Impact:** Backtick key toggles FPS+entity count overlay. Could be documented in Controls section.

#### 1.13 Item pickup fanfare system — not documented anywhere
**Code:** `js/game3d.js` lines 348–351 (state: `itemFlashTimer`, `itemAnnouncement`, `itemSlowTimer`), 5431–5440 (activation), 5661–5665 (decay). Implemented by BD-147.
**Impact:** Items trigger screen flash, center-screen announcement banner, and brief time-dilation on pickup. A significant gameplay feel feature.

#### 1.14 Zombie special attacks (tiers 2-6) — not documented anywhere
**Code:** `js/game3d.js` lines 1625–1627 (`getTierAttackCooldown`), 1783–1793 (enemy state), 3173–3212 (attack system). Implemented by BD-145.
**Impact:** Tiers 2-6 each have unique telegraphed special attacks. This dramatically changes mid-game combat dynamics. Not mentioned in Zombie Tier Merging section or elsewhere.

#### 1.15 XP gem merge system — not documented anywhere
**Code:** `js/game3d.js` lines 294 (`gemMergeTimer`), 5225–5239 (merge loop). Implemented by BD-135/BD-139/BD-144.
**Impact:** XP gems merge nearby into larger, brighter gems worth more XP. Hard cap of 80 gems on screen. Affects performance and player experience.

#### 1.16 Floating text cap and deduplication — not documented anywhere
**Code:** `js/game3d.js` lines 468 (`MAX_FLOATING_TEXTS = 15`), 481–500 (`addFloatingText` with dedup logic). Implemented by BD-136.
**Impact:** Max 15 floating texts at once. Rapid identical texts deduplicated within 0.3s window.

#### 1.17 Dodge mechanic (Turbo Sneakers) — not documented anywhere
**Code:** `js/game3d.js` lines 345–346 (`dodgeChance`), 4974–4976 (dodge proc with "DODGE!" text), 5420 (Turbo Sneakers equip). Present since Turbo Sneakers item was added.
**Impact:** Active dodge chance mechanic triggered by a rare item. Visible "DODGE!" floating text on proc.

#### 1.18 Whoopee Cushion explosion chain guard — not documented
**Code:** `js/game3d.js` lines 286 (`_inExplosionChain`), 2351–2354 (guard). Implemented by BD-134.
**Impact:** Technical fix preventing infinite recursion crash. Not player-facing but relevant to understanding game behavior.

#### 1.19 Initial enemy burst at game start — not documented
**Code:** `js/game3d.js` lines 285 (`initialBurstDone`), 4595–4596 (10-enemy ring spawn). Implemented by BD-130.
**Impact:** 10 enemies spawn in a ring around the player at game start. Changes the early-game feel significantly.

#### 1.20 Wave progress bar on HUD — not documented
**Code:** Confirmed in `js/3d/hud.js` via BD-131 implementation. HUD shows a subtle red progress bar under WAVE text that fills as the next wave approaches.
**Impact:** Visual UX element.

#### 1.21 Minimap/full map system — not documented
**Code:** `js/game3d.js` lines 365 (`showFullMap`), 724–736 (Tab toggle with menu guards). Implemented before BD-128 sprints.
**Impact:** Tab key toggles a full map view. Not mentioned in Controls section.

### ACCURATE

#### 1.22 Animal selection table (lines 66–75)
All 4 animals, speed/damage/HP ratios, and starting weapons match `js/3d/constants.js` `ANIMAL_PALETTES` (lines 47–52) and `ANIMAL_WEAPONS` (lines 460–465). **Correct.**

#### 1.23 Difficulty modes Easy/Medium/Hard (lines 77–83)
HP modifiers and score multipliers match `js/state.js` difficulty definitions. **Correct** (but incomplete — missing Chill Mode per finding 1.10).

#### 1.24 2D Classic Mode description (lines 22–31)
Level names, widths, zombie counts, and boss fight description all match `js/levels.js` and `js/enemies.js`. **Correct.**

#### 1.25 Controls — 2D Mode (lines 39–48)
Matches input handling in `js/game.js`. **Correct.**

#### 1.26 Controls — 3D Mode (lines 50–63)
Core controls are accurate (WASD, Space jump, Enter/B charge, Escape pause). **Correct** but missing Tab (map toggle) and Backtick (FPS counter).

#### 1.27 "Gamepad is not currently supported" (line 64)
Confirmed: no gamepad code exists anywhere in the codebase. **Correct.**

#### 1.28 Tech Stack section (lines 121–127)
Three.js r128, Canvas 2D for HUD, vanilla JS with ES modules, no build step, localStorage leaderboards, 960x540 base canvas. All confirmed. **Correct.**

#### 1.29 Zombie Tier Merging section (lines 118–119)
10 tiers, collision-based merging, stat increases, visual upgrades. Matches `ZOMBIE_TIERS` in `js/3d/constants.js` lines 438–449. **Correct.**

#### 1.30 Shrine augment types (line 113)
The 8 augment types and their effects match `SHRINE_AUGMENTS` in `js/3d/constants.js` lines 330–339. **Correct** (but count and type of shrines is stale per finding 1.5).

---

## 2. Ideal Agent Instructions/agents.md

### STALE

#### 2.1 Phase routing paths reference `docs/` subfolder that does not exist
**Doc:** `agents.md` lines 12–14 — Routes to `docs/navigation.md`, `docs/execution.md`, `docs/landing.md`
**Actual structure:** All files are at the same directory level as `agents.md` (flat structure in `Ideal Agent Instructions/`). The files are `navigation.md`, `execution.md`, `landing.md` — no `docs/` subfolder.
**Also at lines 56–58:** Phase documents section repeats the same incorrect `docs/` prefix.
**Impact:** An agent following these paths literally would fail to find the files.

### ACCURATE

#### 2.2 Phase routing trigger words (lines 12–16)
Planning/Implementing/Landing/Parallelized Sprint trigger words and the `parallelization.md` reference are all valid. The actual documents exist. **Correct** (path prefix aside).

#### 2.3 Execution model selection (lines 19–21)
1–3 tasks serial, 4+ parallel. This matches the actual workflow used throughout the BD-88 through BD-148 sprints. **Correct.**

#### 2.4 Bead mandate schema (lines 34–39)
The minimal bead schema (id, status, scope) is followed consistently across all `docs/planning/` bead files. **Correct.**

#### 2.5 Architecture rules (lines 43–47)
Dependency inversion, no branch-to-branch imports, acyclic deps, context budgeting. These are project principles, still valid. **Correct.**

---

## 3. Ideal Agent Instructions/README.md

### STALE

#### 3.1 Structure diagram shows `docs/` and `architecture/` subfolders that do not exist
**Doc:** `README.md` lines 7–18 — Shows:
```
project/
├── agents.md
├── modularity-primer.md
├── context-primer.md
├── docs/
│   ├── navigation.md
│   ├── execution.md
│   └── landing.md
└── architecture/
    ├── modularity-reference.md
    └── context-reference.md
```
**Actual structure:** All 10 files are flat in `Ideal Agent Instructions/`:
```
agents.md
context-primer.md
context-reference.md
execution.md
landing.md
modularity-primer.md
modularity-reference.md
navigation.md
parallelization.md
README.md
```
**Impact:** The documented tree structure has never been implemented. No `docs/` or `architecture/` subfolders exist. Also, `parallelization.md` is not shown in the structure diagram.

#### 3.2 agents.md described as "38-line router"
**Doc:** `README.md` line 9 — "38-line router (phase detection + bead mandate)"
**Actual:** `agents.md` is 60 lines (including the Welcome section added for the project). The original generic template may have been 38 lines, but the project-specific version is longer.
**Impact:** Minor, cosmetic.

### ACCURATE

#### 3.3 Phase descriptions (lines 23–55)
Navigation, Execution, Landing phase descriptions accurately reflect the workflow used. **Correct.**

#### 3.4 Bead schema (lines 57–73)
Canonical schema definition matches usage. **Correct.**

#### 3.5 Key design principles (lines 85–103)
Modularity, context budget, phase separation principles are accurate. **Correct.**

---

## 4. docs/planning/*.md — Sprint Status Audit

### STALE

#### 4.1 `wildfang-current-status.md` — Massively outdated
**Doc:** Written 2026-02-22 (line 3). Reflects state before BD-128+ sprint blitz.
**Stale claims:**
- **Weapons:** Says "6 weapon types" (line 60, 98). Actual: 11.
- **Scrolls/Howls:** Says "6 scroll types" (lines 63, 110). Actual: 10 howls. Still uses "scroll" terminology.
- **Items:** Says "11 items" (line 59, 130). Actual: 25 items across 4 rarity tiers.
- **Totems:** Says "8 totems" (line 68, 160). Actual: 24.
- **Biomes:** Says "3 biomes (forest, desert, plains)" (line 37, 154). Actual: forest-only (desert/plains removed).
- **Shrines:** Says "20 shrines" (line 67, 158). Actual: 52 total (20 breakable + 22 charge + 10 challenge).
- **Wave events:** Says "every 4 minutes" (line 41, 69). Actual: 75s/90s.
- **Bead count:** Says "17 beads" (line 219). Actual: 153+ beads now.
- **Codebase size:** Says "~12,400 lines across 8 JavaScript files" (line 6). The game3d.js alone has grown significantly since then.
- **Commits:** Says "39" (line 7). Far more now.
- **Module health table:** Missing all `js/3d/` extracted modules (constants.js, utils.js, terrain.js, player-model.js, hud.js, audio.js).
- **game3d.js size:** Says "4,494 lines" (line 213). Has grown considerably.

#### 4.2 `sprint1.md` — Historical, status unclear
**Doc:** Original sprint plan from early development. References BD-01 through BD-15.
**Status:** All beads in this plan are long since implemented and in the codebase. The plan itself has no status markers, so it is not misleadingly "in progress," but there is no completion marker either.

#### 4.3 `sprint-bd88-96.md` — All beads implemented, no completion marker
**Doc:** Sprint plan for BD-88 through BD-96.
**Code:** All features from these beads are confirmed present in the codebase (shrine spacing, decoration collision, zombie speed, spawn rates, wave intervals, wave text position, XP drops, loot drops, totem drops).
**Status:** No "COMPLETE" marker on the document.

#### 4.4 `sprint-bd128-plus.md` — All beads implemented, no completion marker
**Doc:** Sprint plan for BD-128 through BD-133.
**Code:** All features confirmed: minimap toggle guard (BD-128), transparent plateau sides reverted (BD-129/BD-143), initial burst spawn (BD-130), wave timing (BD-131), grass/flower scaling (BD-132), ramp/stair access (BD-133).
**Status:** Post-merge QA checklist (lines 293–303) has unchecked boxes. All items are actually done.

#### 4.5 `sprint-bd137-141.md` — All beads implemented, no completion marker
**Doc:** Sprint plan for BD-137 through BD-141.
**Code:** All features confirmed: gem magnet speed trail (BD-137), kill combo counter (BD-138), gem merge scale fix (BD-139), FPS counter (BD-140).
**Status:** BD-141 playtest checklist (lines 266–280) has unchecked boxes. All items are actually done.

#### 4.6 `beads-crash-and-perf.md` — BD-134/135/136 all implemented
**Doc:** Bead definitions for BD-134, BD-135, BD-136.
**Code:** All three confirmed in codebase — explosion recursion guard, XP gem merge system, floating text cap.
**Status:** No completion marker.

#### 4.7 `beads-bd142-143.md` — Both implemented
**Doc:** BD-142 (combo milestone fix), BD-143 (plateau transparency revert).
**Code:** Both confirmed — `COMBO_MILESTONES` array exists, plateau sides are opaque.
**Status:** No completion marker.

#### 4.8 `beads-bd144-145.md` — Both implemented
**Doc:** BD-144 (aggressive gem merge), BD-145 (zombie special attacks tiers 2-6).
**Code:** Both confirmed — merge radius 3.0, 80-gem cap, tier 2-6 special attacks with telegraph/fire states.
**Status:** No completion marker.

#### 4.9 `beads-bd146-148.md` — BD-146 and BD-147 implemented, BD-148 design-only
**Doc:** BD-146 (drop rate reduction), BD-147 (item pickup fanfare), BD-148 (wearable equipment design).
**Code:** BD-146 confirmed (drop rates at reduced levels: 0.01–0.15). BD-147 confirmed (itemFlashTimer, itemAnnouncement, itemSlowTimer). BD-148 was labeled "design-only" — no wearable slot system implemented in code (no "wearable" or "equipSlot" references in game3d.js). The 25 items in ITEMS_3D still use the original slot system, not the 5-slot wearable categories proposed in BD-148.
**Status:** BD-146 and BD-147 done. BD-148 remains design-only/pending.

#### 4.10 `beads-bd149-153.md` — Current sprint, all pending
**Doc:** BD-149 through BD-153 quality sweep beads.
**Status:** These are the current active tasks. BD-153 is this very audit. Marked correctly as pending.

### ACCURATE

#### 4.11 `wildfang-plan.md` — Creative direction document
This is a design pitch / vision document, not a sprint plan. It describes the desired end-state, not current implementation. It does not claim to be current status. **Valid as aspirational document.**

#### 4.12 `beads-bd149-153.md` — Correctly marked as pending
Current sprint beads. All 5 are research/audit tasks. Status is accurate. **Correct.**

---

## 5. Codebase Features Not Documented Anywhere

These features exist in code but are not mentioned in README, planning docs, or any other documentation:

| Feature | Code Location | Added By |
|---------|--------------|----------|
| Kill combo counter with milestone text | `game3d.js` L418-420, L2333-2338, L437 | BD-138/BD-142 |
| FPS debug counter (backtick toggle) | `game3d.js` L430-431, L740-741; `hud.js` L1009-1016 | BD-140 |
| Item pickup fanfare (flash + banner + time-slow) | `game3d.js` L348-351, L5431-5440 | BD-147 |
| Zombie special attacks (tiers 2-6) | `game3d.js` L1625-1627, L1783-1793, L3173-3212 | BD-145 |
| XP gem merge system | `game3d.js` L294, L5225-5239 | BD-135/BD-139/BD-144 |
| Floating text cap (15) + deduplication | `game3d.js` L468-500 | BD-136 |
| Explosion recursion guard | `game3d.js` L286, L2351-2354 | BD-134 |
| Charge shrines (22, tiered upgrades) | `constants.js` L346-392; `game3d.js` L390-394, L634-666, L1511 | Pre-BD-128 |
| Challenge shrines (10, boss spawners) | `constants.js` L394-409; `game3d.js` L397, L1521, L5603-5613 | BD-77/BD-100 |
| Initial enemy burst (10 ring spawn) | `game3d.js` L285, L4595-4596 | BD-130 |
| Wave progress bar on HUD | `hud.js` (BD-131 implementation) | BD-131 |
| Minimap + full map (Tab toggle) | `game3d.js` L365, L724-736 | Pre-BD-128 |
| Dodge mechanic (Turbo Sneakers) | `game3d.js` L345-346, L4974-4976 | Item system |
| Turd Mine weapon | `constants.js` L129-134; `game3d.js` L2174, L2753-2784 | Post-initial weapon set |
| 4-tier item rarity system | `constants.js` L233-238 (ITEM_RARITIES) | Item expansion sprint |
| Stackable items (Rubber Ducky, Thick Fur, etc.) | `constants.js` L288-291, L297-299, L304 | Item expansion sprint |
| Weapon class scaling system | `constants.js` L141-145 (WEAPON_CLASS_SCALING) | Weapon expansion sprint |
| Chill Mode (4th difficulty) | `js/state.js` L139 | Difficulty expansion |
| Boss system (BOSS_HP_MULT, etc.) | `constants.js` L399-409 | BD-77 |

---

## 6. Recommended Additions

### 6.1 README.md — Full Rewrite of Feature Highlights
The entire "Feature Highlights" section (lines 86–119) needs rewriting:
- Update weapon count from 6 to 11, add the 5 missing weapons
- Rename "Scrolls" to "Howls," update count from 6 to 10, add 4 missing howls
- Update item count from 11 to 25, add rarity system description
- Update shrine section to cover all 3 shrine types (breakable, charge, challenge) with correct counts
- Update totem count from 8 to 24
- Fix wave timing from "4 minutes" to "~1.5 minutes"
- Remove "Litter Box" from 3D powerup list
- Add Chill Mode to difficulty table

### 6.2 README.md — New Sections Needed
- **Kill Combo System** section
- **Controls** update: Add Tab (map toggle), Backtick (FPS counter)
- **Boss Encounters** section (challenge shrines spawn bosses)
- **Zombie Special Attacks** section (tiers 2-6 have unique telegraphed attacks)
- **Item Rarity System** section (4 tiers: common/uncommon/rare/legendary)

### 6.3 Ideal Agent Instructions — Fix File Paths
- `agents.md` lines 12-14, 56-58: Change `docs/navigation.md` to `navigation.md` (and same for execution/landing)
- `README.md` lines 7-19: Update structure diagram to show flat layout + include `parallelization.md`

### 6.4 `wildfang-current-status.md` — Full Rewrite or Archive
This document is so stale (written before BD-128+ sprint blitz) that it would be more efficient to rewrite it from scratch. Every content inventory number is wrong. The module health table is missing 6 extracted modules. The bead count is off by 136+. Recommend either rewriting or archiving it with a "SUPERSEDED" header.

### 6.5 Sprint Plans — Add Completion Markers
All sprint plans for completed sprints should have a clear "STATUS: COMPLETE" header or similar marker. Currently, `sprint-bd88-96.md`, `sprint-bd128-plus.md`, `sprint-bd137-141.md`, and all `beads-*.md` files for implemented beads have no completion markers. Someone reading these docs cannot tell if the work is done without checking the codebase.

### 6.6 New Document: Feature Catalog
Create a single authoritative feature catalog that lists every weapon, howl, item, powerup, shrine type, and system with exact counts and properties. This would be the source of truth that README summarizes from, preventing the drift that caused most of the staleness found in this audit.

---

## Summary

| Category | Count |
|----------|-------|
| **STALE** (wrong/outdated info) | 20 findings |
| **MISSING** (undocumented features) | 19+ features |
| **ACCURATE** (confirmed correct) | 11 sections |
| **RECOMMENDED ADDITIONS** | 6 recommendations |

The most critical staleness is in `README.md` where nearly every numerical claim about game content is wrong (weapons: 6 vs 11, howls: 6 vs 10, items: 11 vs 25, shrines: 20 vs 52, totems: 8 vs 24, wave timing: 4min vs 1.5min). The game has grown enormously since the documentation was last updated, and the docs have not kept pace.
