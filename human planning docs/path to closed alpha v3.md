# Wildfang -- Path to Closed Alpha v3

**Date:** 2026-02-22
**Revision:** v3 -- incorporates direct creative direction from the developer. Expanded content scope (weapons, howls, items, rarity), mouth-made SFX promoted to core feature, single-biome terrain polish, readability-first UI.

---

## 1. What "Closed Alpha" Means

- **Audience:** 5-15 trusted people (friends, family, devs, a Discord channel).
- **Goal:** Answer one question: *"Is the core loop fun, and do the things that make this game different actually land?"*
- **Quality bar:** Bugs and placeholder art are acceptable. A broken core loop, crashes, absent identity features, or silent gameplay are not.
- **What testers experience:** Pick an animal, fight zombies, level up, choose from a rich pool of weapons and howls, collect items with visible rarity, hear mouth-made SFX on every action, use a power attack with a chunky visible charge bar, watch zombies merge, die, want to play again, tell you what felt different.

### Exit Criteria -- "Alpha Is Done" When:

1. A tester can complete 3 consecutive runs on any difficulty without a crash, freeze, or state corruption.
2. At least 5 testers have submitted feedback (inline or via form).
3. The six identity features (animal characters, muscle growth, zombie merge, power attack, mouth-made SFX, kid-friendly tone) are present and noticeable without prompting.
4. Chill Mode exists and a child aged 6-10 can survive at least 3 minutes on it.
5. Game-over screen shows stats, inline feedback prompts, and a link to the full feedback form.
6. Every core game action produces an audible mouth-made sound effect.

---

## 2. What Makes Wildfang Different (Summary)

The alpha must showcase these pillars:

1. **Kid-friendly survivor in a genre with zero kid-friendly entries.** The market position.
2. **Animal characters with visible muscle growth.** Instantly memorable, already built.
3. **Zombie merge system.** Novel enemy escalation. (See Section 3 for merge ratio decision.)
4. **Player-triggered power attack with chunky visible charge timer.** Uncommon agency in a passive genre.
5. **Mouth-made SFX by the 7-year-old creative director.** Unreplicable brand identity. Not a stretch goal -- this IS the feature.
6. **Expanded build variety.** 10 weapons, 10 howls, 25 items across 4 rarity tiers. Every run feels different.

Everything already built that does not serve these pillars stays in but gets zero polish time.

---

## 3. Design Decisions to Lock Before Building

### 3a. Merge Ratios

**Decision:** Ship alpha with tiered merge ratios, not 1:1.

| Tier Name | Merge Ratio | Visual Cue |
|---|---|---|
| Tier 1 (Shambler) | base | Default zombie |
| Tier 2 (Lurcher) | 5 Shamblers | Slightly larger, faster |
| Tier 3 (Bruiser) | 3 Lurchers | Visibly larger, glowing eyes |
| Tier 4 (Mega) | 2 Bruisers | Boss-sized, screen shake on spawn |

Rationale: At 1:1, merges are invisible. Tiered ratios make each merge a noticeable event. Cap at 4 tiers for alpha; the 10-tier system is deferred.

**Done when:** Merge ratios are implemented, and a Tier 4 Mega zombie spawns visibly during a 10-minute run on Normal difficulty.

### 3b. Run Variety

**Decision:** Randomize weapon AND howl offerings per run.

Each run, randomly select 6 of the 10 weapon types and 6 of the 10 howl types to appear in level-up options. The excluded options change every run. This guarantees different builds across runs with zero new systems.

**Done when:** Playing 3 consecutive runs, the player is offered different weapon and howl pools in at least 2 of 3 runs.

### 3c. Sound: Mouth-Made SFX

**Decision:** Ship alpha with the 40-file mouth-made sound pack as the ONLY audio layer. No placeholder library sounds.

The sound pack from the creative director is recorded, cataloged, and mapped to game events (see `sound-pack-alpha/sound-ids.md`). Integration requires:
- An audio manager module (load files, play by event ID, random variant selection from pools)
- Hooking ~20 game events to their mapped sound IDs
- Volume control and mute toggle

Coverage: 40 files across combat (8), weapons (10), movement/powerups (12), zombies (7), specials (3). Gaps exist for pickup chimes, UI clicks, and shrine sounds -- these ship silent or with a generic substitute from the existing pool (e.g., `litterbox-1.ogg` for crate opens). A second recording session for gap sounds is a post-alpha task.

**Done when:** Every melee hit, weapon fire, power attack, jump, powerup activation, zombie spawn, zombie merge, zombie death, and player death produces a mouth-made sound. Volume slider or mute button works. No action in the core loop is silent.

### 3d. 2D Mode Gate

**Decision:** Disable 2D mode access for alpha.

**Done when:** Launching the game goes directly to 3D mode. No path reaches 2D mode.

### 3e. Single Biome, Polished

**Decision:** Ship alpha with ONE biome (forest), polished. Remove desert and plains from terrain generation.

Rationale: Three half-baked biomes are worse than one good one. Polish means: no model clipping through the floor, variety of terrain objects, and meaningful use of plateaus for verticality.

**Done when:** All terrain generation produces forest-biome chunks. No desert or plains tiles spawn.

---

## 4. Content Expansion

### 4a. Weapons: 6 Existing + 4 New = 10

**Existing (working):** Claw Swipe, Bone Toss, Poison Cloud, Lightning Bolt, Fireball, Boomerang.

**New weapons to add:**

| Weapon | Type | Description | Why It Fits |
|---|---|---|---|
| **Mud Bomb** | Projectile+AoE | Lobs an arcing glob that explodes on impact and leaves a slow zone for 3s. | Adds crowd control to the weapon pool. Arcing trajectory is visually distinct. From the vision doc. |
| **Beehive Launcher** | Summon | Fires a beehive that breaks on contact and releases 3 bees that chase nearby enemies for 4s. | Adds a persistent/pet weapon type. Kids love watching bees chase zombies. From the vision doc. |
| **Snowball Turret** | Orbit | Spawns an orbiting turret that fires slow-applying snowballs at the nearest enemy. | Adds an always-on orbital weapon. Slow effect gives it tactical identity. From the vision doc. |
| **Stink Line** | Trail | Leaves a trail of damage behind the player as they move. Faster movement = longer trail = more coverage. | Rewards movement, which the game already encourages. Synergizes with speed items/powerups. From the vision doc. |

All 4 new weapons need: constants definition (baseDamage, baseCooldown, baseRange, maxLevel, 5 levelDescs), fire logic, projectile/effect visuals, and sound mapping (existing sound pack covers projectile and gas sounds).

**Done when:** 10 weapons appear in the constants file, all 10 can be offered during level-up, and all 10 fire correctly with visuals and sound.

### 4b. Howls: 6 Existing Scrolls Renamed + 4 New = 10

**Rename:** All references to "tomes" and "scrolls" become "howls" throughout code and UI. The passive buff system stays identical -- howls are still stackable passive buffs. The rename fits the animal theme.

**Existing (rename only):** Power Howl, Haste Howl, Arcane Howl, Vitality Howl, Fortune Howl, Range Howl.

**New howls to add:**

| Howl | Effect | Max Stacks | Why It Fits |
|---|---|---|---|
| **Thorns Howl** | Reflect 10% of contact damage back to attackers | 3 | Defensive option for kids who get swarmed. Stacks with Thorned Vest for a "reflect build." |
| **Magnet Howl** | +25% pickup radius per stack | 4 | Quality-of-life howl that every player appreciates. Stacks mean you can build a vacuum-everything run. |
| **Frenzy Howl** | +10% attack speed per stack | 4 | Direct offensive buff. Stacks with Haste for a speed-focused build. Visually exciting (more projectiles). |
| **Guardian Howl** | +8% max HP per stack, +2 HP/s regen per stack | 3 | Tanky survival howl. Lets kids build defensively. Pairs with Vitality for a "never die" build. |

**Done when:** 10 howls appear in the constants file (renamed from SCROLL_TYPES to HOWL_TYPES), all 10 can be offered during level-up, and the word "scroll" or "tome" appears nowhere in the UI.

### 4c. Items: 11 Existing + 14 New = 25, with 4 Rarity Tiers

The current 11 items use a slot-based system (one item per slot). For 25 items across 4 rarity tiers, we need to:
1. Add a `rarity` field to every item definition ("stuff", "goodStuff", "shinyStuff", "reallyCoolStuff").
2. Color-code item drops and UI cards by rarity (white, green, blue, orange/gold).
3. Weight rarity in the drop table (common drops frequently, legendary is rare).
4. Some slots now have multiple options at different rarity levels, giving the player choices about which boots or which armor to keep.

**Rarity tier distribution:**

| Tier | Name | Color | Count | Drop Weight |
|---|---|---|---|---|
| Common | "Stuff" | White | 8 | 50% |
| Uncommon | "Good Stuff" | Green | 7 | 28% |
| Rare | "Shiny Stuff" | Blue | 6 | 16% |
| Legendary | "REALLY Cool Stuff" | Orange | 4 | 6% |

**Full item roster (11 existing reclassified + 14 new):**

| # | Item | Slot | Effect | Rarity |
|---|---|---|---|---|
| 1 | Leather Armor | armor | -25% damage taken | Stuff |
| 2 | Soccer Cleats | boots | +15% move speed | Stuff |
| 3 | Aviator Glasses | glasses | See crate contents | Stuff |
| 4 | Magnet Ring | ring | +50% pickup radius | Stuff |
| 5 | **Rubber Ducky** | duck | +10% move speed (stacks) | Stuff |
| 6 | **Thick Fur** | fur | +15 max HP (stacks) | Stuff |
| 7 | **Silly Straw** | straw | Heal 1 HP per 10 kills | Stuff |
| 8 | **Bandana** | bandana | +5% all damage | Stuff |
| 9 | Cowboy Boots | boots | +20% attack range | Good Stuff |
| 10 | Lucky Charm | charm | +50% drop rate | Good Stuff |
| 11 | Health Pendant | pendant | +1 HP/s regen | Good Stuff |
| 12 | Crit Gloves | gloves | 15% chance 2x damage | Good Stuff |
| 13 | **Hot Sauce Bottle** | hotsauce | 15% chance to ignite enemies (DoT) | Good Stuff |
| 14 | **Bouncy Ball** | ball | Projectiles gain 1 ricochet (stacks) | Good Stuff |
| 15 | **Lucky Penny** | penny | +8% powerup drop chance (stacks) | Good Stuff |
| 16 | Chainmail | armor | -40% damage taken | Shiny Stuff |
| 17 | Thorned Vest | vest | Reflect 20% damage | Shiny Stuff |
| 18 | Shield Bracelet | bracelet | Block 1 hit every 30s | Shiny Stuff |
| 19 | **Alarm Clock** | clock | -8% howl cooldowns (stacks) | Shiny Stuff |
| 20 | **Whoopee Cushion** | cushion | 20% chance enemies explode on death (AoE) | Shiny Stuff |
| 21 | **Turbo Sneakers** | turboshoes | +25% move speed, +10% dodge chance | Shiny Stuff |
| 22 | **Golden Bone** | goldenbone | +30% all weapon damage | REALLY Cool Stuff |
| 23 | **Crown of Claws** | crown | Auto-attacks hit one additional target | REALLY Cool Stuff |
| 24 | **Zombie Magnet** | zombiemagnet | Enemies drop 2x XP gems | REALLY Cool Stuff |
| 25 | **Rainbow Scarf** | scarf | All howl effects +50% stronger | REALLY Cool Stuff |

New stackable items (Rubber Ducky, Thick Fur, Silly Straw, Bandana, Hot Sauce Bottle, Bouncy Ball, Lucky Penny, Alarm Clock) do NOT use the one-per-slot system -- they stack freely like howls. Non-stackable items keep the existing slot behavior.

**Done when:** 25 items appear in ITEMS_3D, each has a `rarity` field, drop colors match rarity tier, and the level-up/drop UI displays rarity name and color. A 10-minute run on Normal difficulty encounters items from all 4 rarity tiers.

---

## 5. Terrain: Single Biome, Polished

### 5a. Floor Clipping Fix (NON-NEGOTIABLE)

Models must never clip through terrain. This means:
- All entity Y-positions must be resolved AFTER terrain height lookup, not before.
- Decoration objects (trees, rocks) must be placed with their base at terrain height, not at GROUND_Y.
- Zombie spawn Y must match terrain height at spawn position.

**Done when:** A 10-minute run shows zero visible instances of any model partially submerged in terrain.

### 5b. Terrain Object Variety

The forest biome needs more than trees and shrubs. Add:
- **Rocks** (2-3 size variants, rounded boulder shapes)
- **Fallen logs** (horizontal, can be walked over)
- **Mushroom clusters** (small decorative)
- **Stumps** (varied height)

These are all simple box-model geometry. No new art pipeline needed.

**Done when:** A forest chunk contains a visibly varied mix of at least 4 decoration types, not just trees.

### 5c. Plateaus (Verticality Without Slopes)

Plateaus are flat-topped elevated platforms with solid visible sides. They replace the current floating platforms for a more grounded, readable look.

**Plateau rules:**
- A "unit" = the height of a tier-1 Shambler zombie (~1.0 world units based on ZOMBIE_TIERS[0].scale).
- Plateaus can be 1, 2, 3, or 4 units high.
- 1-unit plateaus: tier-1 zombies can walk UNDERNEATH them. Player can stand on top.
- Higher plateaus: create meaningful elevation. Zombies climb (existing platform-climbing code).
- Plateaus have visible solid sides (earth/stone colored), not floating boxes.
- Can be wide (small hill) or narrow (column/pillar).
- Occasional stacking: a 2-unit plateau with a 1-unit plateau on top = 3 units of verticality.

This creates vertical gameplay without slope physics: high ground advantages, zombie pathfinding interest, and visual variety.

**Done when:** Terrain generation produces plateaus at varied heights (1-4 units). Player and zombies interact with them correctly (standing on top, walking under 1-unit ones). Sides are visually solid (not floating).

---

## 6. Readability & UI

### 6a. Power Attack Charge Timer (MANDATORY)

The current charge indicator is a growing glow. That is not enough for kids. The charge timer must be:
- **A chunky, visible bar** above the player or below the HUD health bar.
- **Color-coded:** fills from yellow (weak) to orange (medium) to red (full charge).
- **Segmented or notched:** kids can see "I'm at half charge" at a glance.
- **Big.** Not subtle. Not small. Chunky. If a 7-year-old can't see it from across the room, it's too small.
- Text label: "CHARGING..." while held, "READY!" flash at full charge.

**Done when:** A non-gamer child can tell you how charged the power attack is by looking at the screen from 6 feet away.

### 6b. General Readability Pass

- All HUD text: minimum effective size for 1280x720. Test at that resolution.
- Rarity colors on items are high-contrast and distinct.
- Level-up cards show: big icon, short name, one-line description, rarity border color.
- Howl names displayed as "HOWL" not "SCROLL" throughout.
- Weapon names and howl names are kid-readable (no jargon, no abbreviations).
- Damage numbers, XP values, and pickup text are large and brief.

**Done when:** All HUD elements readable and unobscured at 1280x720 and 1920x1080. A tester does not squint at anything.

---

## 7. Alpha Scope Summary

### MUST -- In the build, working correctly

| Feature | Alpha Work |
|---|---|
| 4 playable animals with muscle growth | None |
| 10 auto-attack weapons (5 levels each) | **[NEW]** Add 4 weapons (Mud Bomb, Beehive Launcher, Snowball Turret, Stink Line) |
| Weapon slot progression (unlock at 1/5/10/15) | None |
| 10 howls (renamed from scrolls, stackable) | **[NEW]** Rename scrolls to howls. Add 4 howls (Thorns, Magnet, Frenzy, Guardian) |
| 25 items across 4 rarity tiers | **[NEW]** Add 14 items, add rarity system, reclassify existing 11 |
| Level-up upgrade menu with rerolls | Update to show rarity colors and howl rename |
| Zombie merge system | **[NEW]** Implement tiered merge ratios (Section 3a) |
| Charged power attack with chunky charge bar | **[NEW]** Visible segmented charge bar, color-coded, large (Section 6a) |
| Single biome (forest), polished | **[NEW]** Remove desert/plains. Fix floor clipping. Add terrain variety. Add plateaus (Section 5) |
| Mouth-made SFX (40 files) | **[NEW]** Audio manager, event hookups, variant pools, volume control (Section 3c) |
| Shrine augment system | None |
| Difficulty totem system | None |
| Wave events (4-minute timer) | None |
| 18 powerups | None |
| Pause menu (Resume/Restart/Main Menu) | None |
| Per-difficulty leaderboard (localStorage) | None |
| **[NEW]** Chill Mode difficulty | 150% HP, 0.7x enemy speed, 1.5x powerup freq, 0.5x score |
| **[NEW]** Randomized weapon + howl pool per run | Section 3b |
| **[NEW]** 2D mode gate | Section 3d |
| **[NEW]** Inline feedback on game-over screen | 2-3 short questions displayed directly |
| P0 bug fixes (for-in mutation, event listener leak) | Must fix |
| P1 bug fixes (cooldown drift, opacity, state cleanup) | Must fix |
| Deployment (itch.io or GitHub Pages) | Must do |

### DEFER -- Not in alpha

Per-animal active abilities, additional biomes, slope/momentum physics, co-op, gamepad, bosses, cosmetics, monetization, monolith decomposition, meta-XP/progression, analytics display UI, full test suite, combo journal, console deployment, camera redesign, second SFX recording session (gap sounds).

---

## 8. Milestones

**Total timeline: ~5 weeks to deployment. This is honest.** The expanded content scope (4 weapons, 4 howls, 14 items, rarity system, audio integration, terrain overhaul, charge bar UI) adds roughly 2 weeks over the v2 plan. Rushing this to 3 weeks means shipping half-done content, which defeats the purpose of the expansion.

### Milestone 0: Recruit Testers + Stabilize (Days 1-3)

Tester recruitment happens NOW, not after the build is ready.

| Task | Effort | Done When |
|---|---|---|
| Recruit 10-15 testers. Confirm availability. | 1-2 hours | 10+ people have said "yes, I will play this week." |
| Fix P0: for-in mutation (BD-16) | < 1 hour | No for-in iteration over mutable collections. |
| Fix P0: event listener leak (BD-17) | < 1 hour | All listeners stored and removed on cleanup. |
| Fix P1: cooldown timer drift | 1-2 hours | Weapon cooldowns clamped; no accumulation errors. |
| Fix P1: opacity guard | < 1 hour | All opacity values clamped to [0, 1]. |
| Fix P1: state cleanup on restart | 2-3 hours | 3 consecutive restart cycles show no stale state. |
| Profiling session (Chrome DevTools) | 1-2 hours | 10-minute run stays above 30fps on mid-range laptop. |
| Pin Three.js CDN with SRI hash | < 30 min | Hash present in index.html. |
| Browser compatibility check | 1-2 hours | Runs in Chrome, Firefox, Edge. One low-end machine tested. |
| 2D mode gate | 30 min | No path reaches 2D mode. |

**Effort total: ~10-14 hours (2-3 days).**

---

### Milestone 1: Audio + Terrain Foundation (Days 4-10)

Get the two systems that touch everything built first: sound and terrain.

| Task | Effort | Done When |
|---|---|---|
| Audio manager module (load, play, pool, volume) | 3-4 hours | Calling `playSound('sfx_melee_hit')` plays a random bite variant. Volume slider works. |
| Hook audio to ~20 game events | 3-4 hours | Every core action in `sound-ids.md` mapping produces sound. No silent core actions. |
| Convert Bite-1.mp3 to .ogg, volume normalization pass | 1-2 hours | All 40 files are .ogg, levels are consistent. |
| Single biome: strip desert/plains from terrain gen | 1-2 hours | All chunks generate as forest. |
| Floor clipping fix | 2-3 hours | Entity Y always resolved after terrain height lookup. Zero visible clipping. |
| Terrain object variety (rocks, logs, mushrooms, stumps) | 2-3 hours | Forest chunks have 4+ decoration types. |
| Plateau system | 4-6 hours | Plateaus at 1-4 unit heights. Solid sides. Player stands on top. Zombies walk under 1-unit, climb others. |

**Effort total: ~18-24 hours (5-7 days).**

---

### Milestone 2: Content Expansion (Days 11-18)

Build the 4 new weapons, 4 new howls, 14 new items, rarity system, and UI updates.

| Task | Effort | Done When |
|---|---|---|
| Rename scrolls to howls (code + UI) | 1-2 hours | SCROLL_TYPES becomes HOWL_TYPES. All UI text says "howl." Zero instances of "scroll" or "tome" in player-facing text. |
| 4 new howls (Thorns, Magnet, Frenzy, Guardian) | 2-3 hours | All 10 howls in constants, offered in level-up, effects work correctly. |
| 4 new weapons (Mud Bomb, Beehive Launcher, Snowball Turret, Stink Line) | 8-12 hours | All 10 weapons in constants, fire logic works, visuals and sound mapped. This is the biggest single task. |
| Rarity system for items | 2-3 hours | `rarity` field on all items. Drop weighting by rarity. Color-coded borders on drops and UI cards. |
| 14 new items | 4-6 hours | All 25 items in ITEMS_3D. Stackable items stack correctly. Non-stackable items use slot system. |
| Randomized weapon + howl pool per run | 1-2 hours | 6 of 10 weapons and 6 of 10 howls per run. |
| Level-up card UI update | 2-3 hours | Cards show rarity color border, big icon, short name, one-line desc. "NEW!" badge on unseen options. |
| Map new weapons to sound IDs | 1 hour | Mud Bomb uses explode, Beehive uses pew variants, Snowball Turret uses pew, Stink Line uses gas/fart pool. |

**Effort total: ~22-32 hours (6-8 days).**

---

### Milestone 3: Alpha Polish + Charge Bar (Days 19-24)

| Task | Effort | Done When |
|---|---|---|
| Tiered merge ratios (4 tiers) | 3-4 hours | Tier 4 Mega spawns during a 10-min Normal run. |
| Merge visual punch-up | 2-3 hours | Flash, scale-up bounce, particle burst on merge. Merge sound (zombie-3.ogg / zombie-6.ogg) plays. |
| Power attack charge bar (chunky, segmented, color-coded) | 3-4 hours | Segmented bar visible during charge. Yellow -> orange -> red fill. "CHARGING..." / "READY!" text. Visible from across the room. |
| Chill Mode | 1-2 hours | 4th difficulty option. A 7-year-old survives 3+ minutes. |
| Game-over screen upgrade | 2-3 hours | Shows: time, kills, highest tier, level, score. 2-3 inline feedback questions. "Play Again" in under 5 seconds. |
| Character select cleanup | 1-2 hours | Stats visible. Starting weapon shown. Brief flavor text per animal. |
| HUD readability pass | 2-3 hours | All HUD elements readable at 1280x720. Rarity colors distinct. Damage numbers large. |
| Difficulty curve check (all 4 difficulties) | 1-2 hours | Play 4 runs with a stopwatch. Adjust if needed. |

**Effort total: ~16-23 hours (4-6 days).**

---

### Milestone 3.5: Developer QA Gate (Day 25)

**Before any tester touches the build, the developer plays it.**

| Task | Effort | Done When |
|---|---|---|
| Play 2 full runs per difficulty (8 runs total) | 3-4 hours | No crash, no state corruption, no visual glitch that would confuse a tester. |
| Verify all 10 weapons fire with sound | 1 hour | Each weapon produces correct visual and audio. |
| Verify all 10 howls work | 30 min | Each howl applies its buff. Stacking works. |
| Verify rarity drops across all 4 tiers | 30 min | Legendary items appear rarely. Commons appear often. Colors are correct. |
| Verify charge bar readability | 15 min | Charge bar is visible, chunky, color transitions work. |
| Verify zero terrain clipping | 15 min | Walk the map for 5 minutes. No models in the floor. |
| Fill out own feedback form | 30 min | Form works. Questions make sense. |
| Fix any issues found | 2-4 hours | All blockers resolved. Non-blockers logged for M5. |

**Effort total: ~8-10 hours (1 day). This is a hard gate. Do not skip it.**

---

### Milestone 4: Deploy + Distribute (Days 26-27)

| Task | Effort | Done When |
|---|---|---|
| Deploy to itch.io (or GitHub Pages fallback) | 1-2 hours | URL loads and plays on a machine the developer has not tested on. |
| Write tester instructions | 1 hour | One page: how to play, what to focus on, what is missing (gamepad, extra biomes, some sounds), what feedback matters most. |
| Distribute to testers | 30 min | URL and instructions sent. |

**Effort total: ~3-4 hours (1 day). Then wait 5-7 days for feedback.**

---

### Milestone 5: Respond to Feedback (Days 33-35, time-boxed)

**Hard rules:**
- Time-box: 5 working days maximum.
- Scope cap: Fix at most 3 issues. Prioritize by frequency and severity.
- Hard cutoff: At end of 5 days, the alpha is done regardless.

**Pre-committed success criteria for the alpha:**
- 5+ testers submitted feedback.
- 50%+ of testers played 3+ runs.
- 50%+ of testers said they would play again.
- At least 2 testers mentioned zombie merging or power attack unprompted.
- At least 2 testers mentioned the sound effects unprompted.
- No crash reported by more than 1 tester.

If these criteria are met, the core loop is validated. Move to Open Beta planning.
If not, identify the single biggest failure and run one more 5-day iteration (max).

---

### Timeline Overview

```
Week 1 (Days 1-7):
  Days 1-3    M0: Recruit testers + stabilize
  Days 4-7    M1: Audio + terrain foundation (first half)

Week 2 (Days 8-14):
  Days 8-10   M1: Audio + terrain foundation (second half)
  Days 11-14  M2: Content expansion (first half -- howl rename, new howls, rarity system, start weapons)

Week 3 (Days 15-21):
  Days 15-18  M2: Content expansion (second half -- finish weapons, new items, level-up UI, run randomization)
  Days 19-21  M3: Alpha polish + charge bar (first half)

Week 4 (Days 22-28):
  Days 22-24  M3: Alpha polish + charge bar (second half)
  Day 25      M3.5: Developer QA gate
  Days 26-27  M4: Deploy + distribute
  Days 28+    Testers play

Week 5 (Days 29-35):
  Days 29-32  Testers continue playing. Collect feedback.
  Days 33-35  M5: Respond to top 3 issues (time-boxed)

Day 35:      Decision point. Core loop validated? -> Open Beta.
             Not validated? -> One more 5-day iteration, then decide.
```

**Total: ~5 weeks. ~80-110 hours of developer work, spread across calendar time to allow tester feedback windows.** This is roughly double the v2 estimate, which is honest given the expanded content (4 weapons with fire logic and visuals, 14 items, rarity system, terrain overhaul, audio system). The content work in M2 is the most variable -- weapons with novel fire patterns (Beehive Launcher, Snowball Turret) take longer than stat-only additions.

> **Forecast recorded 2026-02-22:** 5 weeks / 80-110 hours to closed alpha deployment (M4 complete). Clock starts when first implementation sprint task begins. We will revisit this estimate post-alpha to calibrate future planning.

---

## 9. Feedback System

### Write the questions BEFORE building.

**Inline (game-over screen, 2-3 questions max):**
1. "What was the most fun moment this run?" (free text, optional)
2. "Would you play again?" (Yes / Maybe / No)
3. "Anything frustrating?" (free text, optional)

These appear directly on the game-over screen. No external link required. Responses stored in localStorage.

**Full form (linked from game-over screen, for testers willing to go deeper):**
1. Which animal did you pick most? Why?
2. Did you notice zombies combining into bigger zombies? What did you think?
3. Did you use the power attack? Could you tell how charged it was?
4. What did you think of the sound effects?
5. What difficulty did you play on? Was it right for you?
6. Did any items or weapons feel particularly fun or useless?
7. How old are you? (If a kid is playing, note their age.)
8. Would you play this again? What would make you come back?
9. What was confusing or frustrating?
10. Open comments.

### Silent Analytics (localStorage only, no UI)

Track these 6 metrics per run, silently:

1. Run duration (seconds)
2. Animal picked
3. Level reached
4. Weapons picked vs. skipped (which weapons offered, which chosen)
5. Whether power attack was used (yes/no, count)
6. Item rarity distribution encountered vs. picked up

---

## 10. Risk Assessment

| Risk | Mitigation |
|---|---|
| **Scope creep** (highest risk -- v3 already expanded scope!) | Every task has a "done when." The 4 new weapons are the biggest risk. If any single weapon exceeds 4 hours, simplify its fire pattern to a reskinned existing type and iterate post-alpha. |
| **New weapon complexity** | Mud Bomb and Stink Line are simple (reskins of fireball/trail). Beehive Launcher and Snowball Turret require new logic (summon, orbit). Budget these as 3-4 hours each. If stuck at 5 hours, ship with simpler behavior and note for post-alpha. |
| **Rarity system touches too many things** | The rarity system is data-only: add a `rarity` field, color borders, and drop weights. It does NOT change how items function. Keep it purely cosmetic/statistical for alpha. |
| **Audio integration harder than expected** | The audio manager is a simple module: preload, play-by-ID, random-from-pool. Web Audio API or HTMLAudioElement both work. If the full system takes >4 hours, ship with a minimal version (no pooling, just play file by name). |
| **Testers do not play** | Recruit in M0, not M4. Confirm 10+ people. Follow up personally at day 3. |
| **Plateau physics interact badly with existing code** | The existing platform system already handles elevated surfaces. Plateaus are just wider platforms with visual sides. If collision gets complicated, ship with visual-only plateaus (no walk-under) and iterate. |
| **Floor clipping fix is deeper than expected** | Budget 3 hours. If terrain height resolution requires touching too many systems, apply a brute-force Y-offset (+0.1 units on all entities) as a stopgap and note the real fix for post-alpha. |
| **5 weeks feels long** | It is longer than v2's 3 weeks. But v3 ships with 67% more weapons, 67% more howls, 127% more items, a rarity system, a full audio layer, and polished terrain. That content IS the alpha. Shipping a thin alpha with 6 weapons and silence would test less. |

---

## 11. Hypotheses to Test

| Hypothesis | Built In | Measured By |
|---|---|---|
| Zombie merge creates memorable moments | M3 (merge ratios + visual punch-up + merge sound) | Inline Q1 + Form Q2: do testers mention merging unprompted? |
| Power attack adds meaningful agency | M3 (chunky charge bar) | Form Q3 + silent analytics (power attack count) |
| Mouth-made SFX are instantly memorable | M1 (full audio integration) | Form Q4: do testers mention sound effects? |
| Animal choice feels meaningful | Already built + M3 (character select cleanup) | Form Q1 + silent analytics (animal distribution) |
| "One more run" pull exists | Already built | Inline Q2 (play again?) + Form Q8 + silent analytics (run count) |
| Kid-friendly tone works | Already built + M3 (Chill Mode) | Form Q7 (kid age + reactions) |
| Build variety exists across runs | M2 (10 weapons, 10 howls, 25 items, randomized pools) | Silent analytics (weapons/items picked) + Form Q6 |
| Rarity tiers create excitement on drops | M2 (rarity system) | Form Q6 + silent analytics (rarity pickup rates) |

---

## Post-Alpha Priorities (Not in Scope, Noted for Planning)

Once alpha feedback validates the core loop, the next investments in priority order:

1. **Second SFX recording session** -- Cover the gap sounds (pickup chimes, UI clicks, shrine breaking, augment granted, footsteps). The creative director is available.
2. **Per-animal active abilities** -- Pounce Strike, Thunderous Roar, Bamboo Barrage, Death Roll. Strongest candidate for deepening animal identity.
3. **Monolith decomposition** -- Required before parallel Open Beta development.
4. **Additional biomes** -- Now that the single-biome terrain is polished, adding desert and plains (and eventually Suburbia, Zoo, Swamp, Schoolyard from the vision doc) is additive, not structural.
5. **Meta-progression system** -- Between-run unlocks for long-term retention.
6. **Slope physics investigation** -- Build on the plateau system toward full momentum-based terrain.
7. **Gamepad support** -- Required for console audience and co-op.
