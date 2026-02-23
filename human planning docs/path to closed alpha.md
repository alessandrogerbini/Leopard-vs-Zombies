# Wildfang -- Path to Closed Alpha

**Date:** 2026-02-22
**Purpose:** Define the minimum viable build worth putting in front of testers, identify what makes this game different, and lay out a concrete plan to get there.

---

## Table of Contents

1. [What "Closed Alpha" Means](#1-what-closed-alpha-means)
2. [Distinctive Game Mechanics Analysis](#2-distinctive-game-mechanics-analysis)
3. [Closed Alpha MVP Scope (Feature Triage)](#3-closed-alpha-mvp-scope-feature-triage)
4. [Recommended Alpha Feature Set](#4-recommended-alpha-feature-set)
5. [Suggested Alpha Milestones](#5-suggested-alpha-milestones)
6. [Risk Assessment](#6-risk-assessment)
7. [Open Design Questions](#7-open-design-questions)

---

## 1. What "Closed Alpha" Means

The gap analysis targets Open Beta -- a publicly available, feature-rich build. That is months of work away. The Closed Alpha is something different:

- **Audience:** 5-15 people you trust (friends, family, fellow game devs, a Discord channel). Not strangers. Not public.
- **Goal:** Answer the question: *"Is the core loop fun? Do the things that make this game different actually land?"*
- **Quality bar:** Bugs are acceptable. Missing polish is acceptable. Placeholder art and UI are acceptable. What is NOT acceptable is a broken core loop, crashes during normal play, or identity features that are absent entirely.
- **What testers should experience:** Pick an animal, fight zombies, level up, get weapons and scrolls, use a power attack, watch zombies merge into bigger zombies, die, want to play again. They should be able to tell you what felt different about this game compared to Vampire Survivors or Brotato.

The alpha is NOT about showing the full vision. It is about proving the core loop works and the game's personality comes through.

---

## 2. Distinctive Game Mechanics Analysis

The survivor genre is crowded. Vampire Survivors, Brotato, Halls of Torment, Soulstone Survivors, 20 Minutes Till Dawn, and dozens more compete for the same players. If Wildfang ships with "auto-attack + level up + survive," it disappears into the pile. The game needs to lead with what makes it different.

Here is an honest assessment of every mechanic that could differentiate Wildfang.

### Mechanic-by-Mechanic Breakdown

| Mechanic | Distinctiveness (1-5) | Fun Potential (1-5) | Alpha Priority | Analysis |
|---|---|---|---|---|
| **Animal characters with muscle growth** | 4 | 4 | **Must** | No survivor game uses bipedal animal characters that visibly bulk up as they level. The visual gag of a jacked red panda is inherently shareable. The character roster also opens up a tone that competitors cannot touch -- cute-but-fierce is a lane nobody owns in this genre. Muscle growth is already implemented and costs nothing to keep. |
| **Zombie merge/tier system** | 4 | 5 | **Must** | Most survivor games increase difficulty by spawning more enemies or spawning tougher variants on a timer. Having enemies dynamically combine on-screen into bigger threats is genuinely novel. It creates emergent tactical moments ("they're clustering -- scatter them!") and visual spectacle. The 10-tier system is overkill for alpha; the mechanic itself is the differentiator, not the tier count. |
| **Power attack (charge mechanic)** | 3 | 4 | **Must** | Survivors are overwhelmingly passive -- you move and things die. A deliberate charge-and-release input gives the player a moment of agency that the genre largely lacks. It creates risk/reward tension (stand still to charge while zombies close in). Most competitors have zero player-triggered combat actions. This is unusual and worth showcasing. |
| **3D perspective** | 3 | 3 | **Must** (already built) | Most survivors are 2D. The 3D perspective is immediately visually distinct in screenshots and trailers. It does not fundamentally change gameplay yet (the world is still mostly flat), but it separates Wildfang from the pixel-art crowd at a glance. Importantly, it is already built -- this is free differentiation. |
| **Animal theme + kid-friendly tone** | 5 | 4 | **Must** | There is no kid-friendly survivor game. The entire genre skews teen-to-adult with gothic, horror, or dark fantasy themes. A Saturday-morning-cartoon survivor starring jungle animals is a wide-open market position. This is arguably the single strongest differentiator and it requires zero new code -- it is a design philosophy that is already embedded in every asset. |
| **Shrine/augment system** | 2 | 3 | **Should** | Exploration-based permanent buffs exist in several survivors (Vampire Survivors has hidden items, Brotato has shop mechanics between waves). The shrine system is a fine mechanic but not a differentiator. It adds map exploration incentive, which is good for the alpha loop. Keep it, but do not invest polish time here. |
| **Tome/scroll stacking** | 2 | 3 | **Should** | Passive buff stacking is standard in the genre. Every survivor game has some form of stackable passive upgrades. The current scroll system is functional and contributes to build variety, but it does not stand out. It should be present in alpha as part of the progression loop but is not an identity feature. |
| **Difficulty totems (risk/reward)** | 3 | 4 | **Should** | Voluntary difficulty modifiers that players seek out on the map is a less common pattern. It creates a "how greedy are you?" tension that plays well with competitive testers. Not core to the identity but adds depth cheaply since it is already built. |
| **Mouth-made SFX** | 5 | 5 | **Could** | This is the single most marketable feature in the entire design document. No other game has it or can replicate it. However, it requires a real-world production dependency (recording sessions with a 7-year-old) that is outside the codebase. For alpha, the game will likely be silent. That is fine -- testers can evaluate gameplay without sound. But if even 5-10 placeholder mouth sounds can be recorded before alpha, include them. They will dramatically change how testers perceive the game. |
| **Verticality and terrain physics** | 4 | 5 | **Defer** | The vision document is very clear that verticality is a core pillar. But it is also the single largest engineering effort in the entire gap analysis, touching rendering, physics, enemy AI, combat, and camera systems. Building it for alpha would consume the entire development timeline. The existing platform system provides a taste of elevation. Full verticality is an Open Beta feature. |
| **Active abilities (per-animal)** | 3 | 5 | **Could** | Per-animal active abilities are a great design idea, but they represent a full combat system redesign. The current power attack already fills the "player-triggered action" slot. For alpha, the power attack IS the active ability. Per-animal differentiation through unique active abilities is a strong Open Beta feature. |
| **Howls (auto-cast spells)** | 3 | 4 | **Defer** | The planned Howl system (replacing scrolls with auto-cast spectacle spells) is a significant redesign. The current scroll system works fine as a passive buff layer for alpha. Howls are an Open Beta feature. |
| **Meta-progression** | 2 | 4 | **Stub** | Between-run progression is important for long-term retention but alpha testers will play 3-10 runs, not 50. A minimal stub (accumulate XP across runs, display it, maybe unlock one thing) is enough to communicate the concept. The full unlock tree is an Open Beta feature. |
| **Co-op** | 3 | 5 | **Defer** | Architecturally impossible without the monolith decomposition, gamepad support, and splitscreen rendering. This is a post-alpha feature, full stop. |
| **Biome-specific bosses** | 3 | 5 | **Defer** | Boss encounters are major content milestones. They require unique AI, attack patterns, visual design, and balancing. Zero bosses exist in 3D mode today. This is Open Beta content. |

### Summary: What Makes Wildfang Different

The game's identity rests on five pillars, in order of distinctiveness:

1. **Kid-friendly survivor in a genre with zero kid-friendly entries.** This is the market position. Everything flows from it.
2. **Animal characters with visible muscle growth.** Instantly memorable, inherently funny, already built.
3. **Zombie merge system.** Novel enemy escalation mechanic that creates emergent gameplay moments.
4. **Player-triggered power attack.** Uncommon agency in a passive genre.
5. **Mouth-made SFX** (when available). Unreplicable brand identity.

The alpha must showcase pillars 1-4. Pillar 5 is a bonus if any recordings can be done beforehand.

---

## 3. Closed Alpha MVP Scope (Feature Triage)

Every feature from the gap analysis and current build, triaged for alpha. The question for each: *"Does a tester need this to evaluate whether the core loop is fun and the game feels different?"*

### INCLUDE -- Must be in the alpha build

| Feature | Current State | Alpha Work Required |
|---|---|---|
| 4 playable animals with unique stats | Working | None -- already done |
| Muscle growth on level-up | Working | None -- already done |
| Auto-attack weapon system (6 weapons, 5 levels) | Working | None -- already done |
| Weapon slot progression (unlock at levels 1/5/10/15) | Working | None -- keep current in-run unlock model for alpha |
| Passive scroll system (6 types, stackable) | Working | None -- already done |
| Level-up upgrade menu with rerolls | Working | None -- already done |
| 10-tier zombie merge system | Working | None -- already done |
| Charged power attack (hold and release) | Working | None -- already done |
| Procedural infinite terrain (3 biomes) | Working | None -- already done |
| Shrine augment system (20 shrines, 8 types) | Working | None -- already done |
| Difficulty totem system (8 totems) | Working | None -- already done |
| Wave events (4-minute timer) | Working | None -- already done |
| 18 powerups (3D mode) | Working | None -- already done |
| 11 equipment items (3D mode) | Working | None -- already done |
| Pause menu (Resume/Restart/Main Menu) | Working | None -- already done |
| Per-difficulty leaderboard (localStorage) | Working | None -- already done |
| P0 bug fixes (for-in mutation, event listener leak) | Identified, unfixed | **Must fix** -- small changes, eliminates crash risk |
| P1 bug fixes (cooldown drift, opacity, state cleanup) | Identified, unfixed | **Should fix** -- improves stability for testers |
| Basic deployment (itch.io or GitHub Pages) | Not deployed | **Must do** -- testers need a URL to play |

### STUB -- Minimal/placeholder version acceptable

| Feature | Stub Version for Alpha | Full Version (Open Beta) |
|---|---|---|
| Meta-progression | Display cumulative XP across runs on the game-over screen. Store it in localStorage. No unlocks gated behind it yet -- just show the number and a message like "Total XP earned across all runs: X." This communicates the concept and lets testers feel like failed runs still counted. | Full unlock tree (weapon slots, howl slots, animals, biomes, reroll expansion, cosmetics) |
| Per-animal auto-attack differentiation | Current state: animals have different starting weapons and stats, which already creates some differentiation. For alpha, this is sufficient. Add a brief tooltip on character select showing "Leopard: Fast claws, balanced stats" etc. | Unique auto-attack animations and patterns per animal (rapid swipes vs. roar cone vs. tail spin vs. tail whip) |
| "Chill Mode" difficulty | Add a 4th difficulty option: "Chill" with 150% HP, 0.7x enemy speed, 1.5x powerup frequency, 0.5x score multiplier. Simple number tweaks, no new systems. Makes the game accessible to younger testers. | Full Chill Mode with tuned experience, no-shame messaging, full progression access |
| Feedback form / bug report | A simple text link on the game-over screen to a Google Form or similar survey asking "What was fun? What was frustrating? Would you play again?" | In-game feedback system, analytics, crash reporting |

### DEFER -- Not in the alpha build

| Feature | Justification for Deferral |
|---|---|
| Per-animal active abilities (Pounce Strike, Thunderous Roar, etc.) | Full combat system redesign. The power attack already provides player agency. Active abilities are an Open Beta differentiator, not an alpha requirement. |
| Howl system (auto-cast spells replacing scrolls) | Complete functional redesign of an existing working system. Scrolls work fine for alpha. |
| Weapon/item thematic redesign (kid-themed names and visuals) | Cosmetic overhaul that does not affect gameplay evaluation. "Bone Toss" works as well as "Boomerang Bone" for testing the loop. |
| Item system redesign (remove slots, unlimited stacking) | Fundamental system change. The current slot-based system is functional for alpha. |
| Verticality and terrain physics (slopes, momentum, ramps) | The single largest engineering effort. Cannot be done in alpha timeline. Existing platforms provide minimal elevation variety. |
| Full biome redesign (Suburbia, Zoo, Swamp, Schoolyard) | Massive content effort. The current 3 biomes (forest, desert, plains) provide sufficient variety for alpha testing. |
| Biome-specific mega zombie bosses | No bosses exist in 3D mode. Designing, implementing, and balancing even one boss is a significant effort better suited for Open Beta. |
| Co-op / splitscreen | Architecturally impossible without monolith decomposition, gamepad support, and splitscreen rendering. |
| Gamepad support | Important for eventual console targets but alpha testers can use keyboards. Gamepad is an Open Beta must-have, not an alpha one. |
| Camera redesign (isometric, rotatable) | Significant rendering change. Current top-down camera works for alpha. |
| Cosmetic system (skins, hats) | No gameplay value for alpha testing. |
| Combo Discovery / Combo Journal | Nice-to-have system that adds long-term depth. Not needed for alpha evaluation. |
| Friend leaderboards / online infrastructure | Alpha is 5-15 people. Local leaderboards suffice. |
| Console deployment (Switch, Steam) | Alpha is browser-based. Console is a much later milestone. |
| Monetization infrastructure | Irrelevant for alpha. |
| Remappable controls | Nice-to-have for accessibility. Not needed for alpha with known testers. |
| Text-to-speech for menus | Accessibility feature for a wider audience. Not alpha scope. |
| Monolith decomposition of game3d.js | See Risk Assessment. This is a judgment call. The monolith is painful but the game works. Breaking it apart is a large effort that does not directly improve the tester experience. **Recommendation:** Defer to post-alpha but before Open Beta. If parallel development becomes necessary before alpha ships, promote this to INCLUDE. |
| Full automated test suite | Testers are the test suite for alpha. Automated tests are an Open Beta investment. |
| Sound system + mouth-made SFX | Depends on real-world recording sessions. If 5-10 sounds can be recorded opportunistically, include them. Otherwise, ship silent -- testers can provide feedback on gameplay without audio. |
| Weighted level-up randomization | Algorithm improvement. Current random selection works fine for alpha. |
| "NEW!" badge on untried upgrades | UI polish feature. Defer. |
| Recording Studio menu section | Content feature dependent on audio assets. Far future. |

---

## 4. Recommended Alpha Feature Set

### Core Loop (Must Work Perfectly)

These are the non-negotiable systems. If any of these are broken, the alpha is not shippable.

1. **Character selection** -- Pick from 4 animals with visible stat differences. Must feel like a meaningful choice.
2. **Movement and camera** -- Smooth WASD movement on procedural terrain. No hitching, no camera jank.
3. **Auto-attack combat** -- Weapons fire automatically, hit enemies, deal damage, enemies die with satisfying feedback (particles, floating damage numbers).
4. **Level-up loop** -- Kill zombies, collect XP gems, level up, choose from 3-4 upgrade options (weapons, scrolls), see immediate gameplay impact.
5. **Zombie spawning and escalation** -- Enemies appear, increase in quantity over time, wave events create pressure spikes.
6. **Zombie merge system** -- Same-tier zombies visibly combine into bigger threats. This MUST be noticeable and feel impactful -- it is an identity feature.
7. **Power attack** -- Hold Enter to charge, release for AoE burst. Must feel good: the charge-up should build tension, the release should feel powerful.
8. **Death and restart** -- Player dies, sees score and stats, can immediately restart. The "one more run" pull should be strong.
9. **No crashes during a normal 5-15 minute run.** P0 bugs must be fixed.

### Identity Features (Must Be Present Even If Rough)

These are what make Wildfang feel like *Wildfang* and not "another survivor game." They do not need polish -- they need to exist and be noticeable.

1. **Animal characters with personality** -- The leopard, red panda, lion, and gator should feel like characters, not skins. Different starting weapons + different stats + different visual proportions + muscle growth on level-up. Testers should have a favorite animal by their third run.
2. **Zombie merge as spectacle** -- When zombies merge, it should be visible and create a "oh no" reaction. The current instant-merge-on-collision works mechanically, but consider adding a brief visual flash or scale-up animation if time allows. Testers should be able to describe the merge mechanic unprompted when asked "what was different about this game."
3. **Kid-friendly tone** -- The bright colors, goofy character proportions, and cartoonish combat already establish this. No changes needed, but do not add anything that undermines the tone (no blood, no grim UI, no "YOU DIED" screens -- keep it playful).
4. **Power attack as a decision point** -- Testers should feel the tension of "do I charge now or keep moving?" at least once per run. If the power attack is too weak or too easy to use, it fails as a differentiator. Verify that the risk/reward balance is noticeable.
5. **Shrine and totem exploration** -- The map should reward exploration. Shrines (free stat buffs) and totems (risk/reward difficulty) should pull players away from just circling in one spot. This is a differentiator from arena-style survivors.

### Quality of Life (Minimum Acceptable Polish)

These are not identity features but will make the difference between testers enjoying the experience and testers getting frustrated by friction.

1. **Stable frame rate** -- Run a profiling session and fix any obvious frame rate killers. Target: no drops below 30fps during normal play on a mid-range laptop. P1 performance bugs (BD-21 through BD-24) should be evaluated and fixed if they cause visible stuttering.
2. **Clear HUD** -- Health, XP bar, current weapons, current scrolls, wave timer, and score must be readable at a glance. The current HUD canvas overlay works; just verify nothing is obscured or misaligned.
3. **Working pause menu** -- Pause (Escape), Resume, Restart, Main Menu all work correctly without state leaks. Fix the state cleanup issues identified in P1 bugs.
4. **Game-over screen with stats** -- Show: time survived, zombies killed, highest zombie tier killed, level reached, score. Plus the meta-XP stub (total XP across all runs).
5. **Feedback mechanism** -- A link to a Google Form or similar on the game-over screen. Ask: "What animal did you pick? What was the most fun moment? What frustrated you? Would you play again? Anything else?"
6. **Deployment** -- A URL that testers can open in Chrome/Firefox/Edge and play immediately. itch.io is ideal (built-in fullscreen, community features, analytics). GitHub Pages is acceptable.

### Explicitly Cut (With Justification)

| Cut Feature | Why It Is Cut |
|---|---|
| Active abilities (per-animal unique skills) | Requires designing 4 unique abilities, implementing cooldown UI, balancing scaling, and potentially replacing or integrating with the power attack. This is 2-3 weeks of work for a system whose absence does not prevent evaluating the core loop. The power attack fills the agency role for alpha. |
| Howl system | Replacing a working passive system (scrolls) with an auto-cast spell system is a lateral redesign, not an improvement for alpha purposes. Scrolls demonstrate build variety just fine. |
| Verticality / terrain physics | The gap analysis rates this as VERY HIGH complexity. Slopes, momentum, ragdoll, and solid-body collision are fundamental engine work. The alpha can test the core loop on flat-plus-platforms terrain. |
| Co-op | Requires monolith decomposition + gamepad support + splitscreen rendering + shared state + difficulty scaling. This is the most architecturally demanding feature in the entire plan. Not achievable before alpha. |
| Gamepad input | Alpha testers will be told "use a keyboard." Gamepad is essential for Open Beta (console audience) but not for a closed test with known participants. |
| New biomes | Content creation effort. The 3 existing biomes are sufficient variety for alpha testing. |
| Bosses | Zero boss AI exists in 3D mode. Even one boss is a significant design and implementation effort. Defer to Open Beta. |
| Monolith decomposition | This is a painful deferral but a pragmatic one. The monolith is a development velocity problem, not a player experience problem. Testers will not know or care that the code is 4,500 lines in one file. Decompose after alpha feedback confirms the core loop is worth investing in, and before Open Beta development begins. **Exception:** if you plan to have multiple people building Open Beta features in parallel, do the decomposition first. |
| Sound | Depends on recording sessions. If even a handful of sounds are available, include them. If not, ship silent and note in the feedback form: "The game is currently silent. Imagine every sound effect made by a 7-year-old's mouth. Does that change how you feel about the experience?" |
| Console deployment | Alpha is browser-only. Console is a completely separate workstream. |
| Cosmetics, monetization, friend leaderboards, combo journal | None of these affect the core loop evaluation. All are Open Beta or later. |

---

## 5. Suggested Alpha Milestones

### Milestone 0: Stabilize (1-2 days)
**Delivered:** A build with zero known crash risks.

| Task | Effort | Notes |
|---|---|---|
| Fix P0: for-in iteration mutation (BD-16) | < 1 hour | Replace `for...in` with `Object.keys()` or equivalent safe iteration |
| Fix P0: event listener memory leak (BD-17) | < 1 hour | Store references and remove listeners on cleanup |
| Fix P1: cooldown timer drift | 1-2 hours | Clamp or reset cooldown values to prevent accumulation errors |
| Fix P1: floating-point opacity guard | < 1 hour | Clamp opacity values to [0, 1] range |
| Fix P1: incomplete state cleanup on restart | 2-3 hours | Audit restart path, ensure all arrays/objects/timers are reset |
| Run profiling session (Chrome DevTools) | 1-2 hours | Play for 10+ minutes, identify any frame rate killers. Fix obvious ones. |
| Pin Three.js CDN with SRI hash | < 30 min | Prevents supply-chain breakage |

**Testable:** Play 3 full runs (one per difficulty) without any crash, freeze, or visual corruption. Restart works cleanly. Frame rate stays above 30fps on a mid-range machine.

**Dependencies:** None. This is all independent bug-fix work.

---

### Milestone 1: Alpha Polish Pass (3-5 days)
**Delivered:** A build that feels intentional, not accidental. No new features -- just making existing features presentable.

| Task | Effort | Notes |
|---|---|---|
| Game-over screen upgrade | 2-3 hours | Add: time survived, zombies killed (by tier), highest tier killed, level reached, score. Display cumulative meta-XP stub ("Total XP across all runs: X"). Add feedback form link. |
| Character select screen cleanup | 1-2 hours | Show animal stats clearly (speed/damage/HP bars or numbers). Show starting weapon. Brief flavor text ("The Leopard -- balanced fighter, rapid claws"). |
| Meta-XP stub | 1-2 hours | Accumulate and persist total XP in localStorage. Display on game-over and main menu. No unlocks yet -- just the number. |
| "Chill Mode" difficulty | 1-2 hours | Add 4th difficulty: 150% HP, 0.7x enemy speed, 1.5x powerup frequency, 0.5x score. Simple number changes. |
| Zombie merge visual punch-up | 2-4 hours | When zombies merge, add a brief flash, scale-up bounce, and/or particle burst. Make it noticeable. This is an identity feature -- invest a few hours here. |
| Power attack feedback improvement | 1-2 hours | Add a visual charge indicator (growing glow around player during charge). Make the release AoE more visually dramatic (bigger flash, more screen shake). |
| HUD readability pass | 1-2 hours | Verify all HUD elements are readable, properly positioned, and not obscured. Check at different browser window sizes. |
| Verify the "one more run" flow | 1 hour | After death: game-over screen -> score/stats -> "Play Again" (instant restart) and "Main Menu" (character/difficulty select). The path from death to next run should take under 5 seconds. |

**Testable:** The full alpha experience. A tester can: select an animal, understand what makes it different, play through escalating zombie waves, experience the merge system visually, use the power attack meaningfully, level up with interesting choices, die with a satisfying stats screen, see their cumulative progress, and immediately start another run.

**Dependencies:** Milestone 0 (stability).

---

### Milestone 2: Deploy and Instrument (1-2 days)
**Delivered:** A publicly accessible URL with basic analytics and a feedback pipeline.

| Task | Effort | Notes |
|---|---|---|
| Deploy to itch.io | 1-2 hours | Create itch.io page, upload files, configure embed settings (fullscreen, browser requirements). Write a brief description: "Closed alpha -- looking for feedback on the core gameplay loop." |
| Create feedback form | 30 min | Google Form or Typeform. Questions: animal choice, most fun moment, most frustrating moment, play-again intent, open comments. |
| Add basic session analytics | 2-4 hours | Track (in localStorage or a simple analytics ping if desired): session count, average run duration, most-picked animal, average level reached, most common death wave. This data helps interpret tester feedback. Optional: use itch.io's built-in view/play analytics. |
| Write tester instructions | 1 hour | Brief document for testers: how to play, what to focus on, what is known to be missing (sound, gamepad), what feedback is most useful. |
| Distribute to alpha testers | 30 min | Send the URL and instructions to your 5-15 testers. |

**Testable:** Open the URL on a machine you have not tested on. Does it load? Does it play? Does the feedback form link work?

**Dependencies:** Milestone 1 (polish). Technically Milestone 0 alone produces a playable build, but Milestone 1 is what makes testers feel like they are testing a *game* rather than a *prototype*.

---

### Milestone 3: Respond to Feedback (3-7 days, after testers play)
**Delivered:** A revised build incorporating the highest-priority tester feedback.

This milestone cannot be planned in detail because it depends on what testers say. However, likely categories of feedback:

| Likely Feedback Area | Probable Response |
|---|---|
| "The game is too hard / too easy" | Adjust spawn rates, XP curves, weapon damage scaling. This is number tuning, not system changes. |
| "I didn't notice the zombie merge" | Increase merge visual feedback (bigger animation, camera pulse, popup text "ZOMBIES MERGED!"). |
| "The power attack doesn't feel worth using" | Increase damage, add more dramatic visual/audio feedback, consider reducing charge time. |
| "I couldn't tell the animals apart" | Enhance character select descriptions, consider slight visual differentiation of auto-attacks (different projectile colors per animal). |
| "I wanted to keep playing but there's no reason to" | Expand the meta-XP stub: add 1-2 simple unlocks (e.g., unlock a 4th reroll at 500 cumulative XP, or unlock a bonus starting item at 1,000 XP). |
| "Runs feel same-y after a few tries" | Evaluate build variety -- are testers naturally finding different weapon/scroll combinations? Consider adjusting level-up pool weights. |
| "The game crashed / froze / glitched" | Triage and fix. Any crash that multiple testers hit is P0. |

**Dependencies:** Tester feedback from Milestone 2 deployment. Allow at least 5-7 days of tester access before starting this milestone.

---

### Timeline Overview

```
Week 1:
  Day 1-2     Milestone 0 (Stabilize)
  Day 3-7     Milestone 1 (Polish Pass)

Week 2:
  Day 8-9     Milestone 2 (Deploy + Distribute)
  Day 10-14   Testers play. Collect feedback.

Week 3:
  Day 15-21   Milestone 3 (Respond to Feedback)

Week 3-4:    Decision point: Is the core loop validated?
              If YES -> Begin Open Beta planning (monolith decomposition, meta-progression, active abilities, sound)
              If NO  -> Identify what is failing and iterate on the alpha
```

**Total estimated effort to alpha deployment: 7-12 working days.**

This estimate assumes a single developer. The workload is light because the game is already feature-complete for alpha purposes -- the work is stabilization, polish, and deployment, not feature development.

---

## 6. Risk Assessment

### What Could Block Reaching Alpha

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **P0 bugs are harder to fix than estimated** | Low | Medium | Both bugs are well-understood (for-in iteration, event listener cleanup). Even if they take 4x the estimated time, that is half a day, not a blocker. |
| **Performance problems surface during profiling** | Medium | Medium | If frame rate drops below 30fps during normal play, the P1 performance beads (squared distance optimization, swap-delete arrays, recursive disposal) need to be addressed. These are individually small but could collectively take 1-2 days. Budget for this in Milestone 0. |
| **State cleanup on restart is more broken than expected** | Medium | High | If restarting the game leaves stale state that corrupts the next run, this becomes a P0 for alpha. The 4,500-line monolith makes state cleanup auditing difficult. Budget extra time in Milestone 0 for this. Test restart-after-death thoroughly on every restart path (pause menu restart, game-over restart, main menu and back). |
| **itch.io deployment has unexpected issues** | Low | Low | The game is vanilla JS + Three.js CDN. It should work on any static host. If itch.io has problems, GitHub Pages is the fallback. |
| **Scope creep -- "just one more feature before alpha"** | High | High | The most dangerous risk. The game already has enough features for alpha. The temptation to add active abilities, or redo the UI, or add sound "real quick" will delay shipping indefinitely. **The alpha goal is feedback, not perfection.** |
| **Testers do not actually play** | Medium | High | Send the game to 10-15 people, expect 5-8 to actually play. Follow up personally after 3 days. Make the game easy to access (one click, no install) and set expectations ("play 3 runs, fill out the form, takes 15 minutes"). |

### Technical Debt That Must Be Addressed Before Alpha

| Debt Item | Why Before Alpha | Effort |
|---|---|---|
| for-in mutation bug (BD-16) | Can cause invisible collision corruption. Testers hitting this would report impossible-to-diagnose bugs. | < 1 hour |
| Event listener memory leak (BD-17) | Causes gradual CPU degradation across multiple runs. Testers playing 5+ runs in one session would notice slowdown. | < 1 hour |
| Cooldown timer drift | Weapons firing at wrong rates undermines the entire combat feel. | 1-2 hours |
| State cleanup on restart | Stale state from run N bleeding into run N+1 would make tester feedback unreliable ("sometimes the game starts weird"). | 2-3 hours |

### Technical Debt That Can Wait Until After Alpha

| Debt Item | Why It Can Wait | When to Address |
|---|---|---|
| Monolith decomposition (game3d.js) | Does not affect player experience. Only matters when multiple developers need to work in parallel or when automated testing is needed. | Before Open Beta development begins. |
| Zero test coverage | Alpha testers ARE the test suite. Manual testing by the developer plus tester feedback covers the alpha scope. | Before Open Beta, after monolith decomposition makes tests practical. |
| Build system (bundler, minifier, linter) | No build step is a feature for alpha deployment simplicity. | Before Open Beta or console deployment. |
| Unpinned CDN (Three.js without SRI) | Low probability of causing issues during the alpha period. Pin it as a quick win in Milestone 0, but if it causes headaches, skip it. | Before any public release. |

### Design Questions That Need Answering Before Building (Open Beta, Not Alpha)

These do not block the alpha but must be resolved before significant Open Beta development begins:

1. **Does the power attack survive or get replaced by active abilities?** The plan does not mention the power attack. Active abilities fill a similar role. Options: (a) replace power attack with active abilities entirely, (b) keep power attack as a universal ability and add per-animal abilities on a second button, (c) evolve the power attack into per-animal active abilities (the charge mechanic stays, the effect becomes animal-specific). Tester feedback on the power attack will inform this.

2. **Is the 10-tier merge system the right structure?** The plan calls for 4 tiers (Shambler/Lurcher/Bruiser/Mega) with different merge ratios (5:1, 3:1, 2:1). The current 10-tier system with 1:1 merge ratio is simpler but less dramatic. Which creates better gameplay? Alpha testing may reveal whether testers even notice the merge system with 1:1 ratios.

3. **How much verticality is achievable without a full terrain physics overhaul?** There may be an intermediate step between "flat with platforms" and "full slope/momentum/ragdoll physics." Perhaps the platform system can be enhanced with more variety (ramps that boost speed, elevated areas with jump-down damage) without building a full physics engine. This should be scoped as a separate technical investigation.

4. **What is the engine migration plan for console?** The vision document mandates Nintendo Switch. A browser-based Three.js game cannot run on Switch. At some point, a hard decision must be made: migrate to Unity/Godot, build a custom native wrapper, or change the platform target. This decision does not affect the alpha but will reshape the entire Open Beta and launch plan.

5. **When can mouth-made SFX recording sessions happen?** This is a real-world scheduling dependency. The sooner recording sessions begin (even casually, with a phone), the sooner the game's most marketable feature is available. Consider doing a "sound jam" session with the 7-year-old where you play the game together and record their reactions -- that raw audio may be more charming than a structured recording session.

---

## 7. Open Design Questions

Beyond the technical questions above, there are gameplay design questions that alpha feedback should help answer. Frame these as hypotheses to test:

| Hypothesis | How Alpha Tests It | What "Success" Looks Like |
|---|---|---|
| "The zombie merge system creates memorable moments" | Ask testers: "What was the most memorable thing that happened?" and see if merge events come up unprompted. | 3+ out of 10 testers mention zombie merging without being asked about it. |
| "The power attack adds meaningful player agency" | Ask testers: "Did you use the power attack? When?" Look for evidence of deliberate timing decisions. | Testers describe using it "when I was surrounded" or "to break up a group" rather than "I forgot about it" or "I just mashed it." |
| "Animal choice feels like a meaningful decision" | Track which animals testers pick across multiple runs. Ask: "Did you have a favorite? Why?" | Distribution is not 90% one animal. Testers cite gameplay reasons for preference, not just aesthetics. |
| "The game creates a 'one more run' pull" | Track average session length and number of runs per session. Ask: "Did you play more than once? What made you keep going (or stop)?" | Average session has 3+ runs. Testers who stop cite external reasons (time) rather than boredom. |
| "The kid-friendly tone works for the target audience" | If any testers have kids aged 6-12, ask them to play. Observe. Ask the kids directly: "Was it fun? Was it scary? What was funny?" | Kids laugh, want to keep playing, are not frightened by zombies. |
| "Difficulty settings serve different skill levels" | Ask testers to try multiple difficulties. Do they settle on one that feels right? | Testers who report "too easy" on Easy find Medium or Hard satisfying. Nobody reports "all difficulties feel the same." |

---

## Final Word

The game is closer to alpha-ready than it might feel. The core loop -- move, auto-attack, level up, merge zombies, power attack, die, replay -- is already implemented and working. The animal characters, the merge system, the power attack, and the kid-friendly tone are already present as differentiators. The work between now and alpha is not "build the game" but "stabilize the game, polish the edges, and put it in front of people."

The single most important thing is to ship the alpha and get feedback. Every day spent adding features instead of deploying is a day of learning lost. The testers will tell you what is fun, what is confusing, what is missing, and what does not matter. That feedback is worth more than any planning document -- including this one.

Ship it. Learn from it. Then build the Open Beta.
