# Wildfang -- Path to Closed Alpha v2

**Date:** 2026-02-22
**Revision:** v2 -- incorporates producer and game-design critiques of v1.

---

## 1. What "Closed Alpha" Means

- **Audience:** 5-15 trusted people (friends, family, devs, a Discord channel).
- **Goal:** Answer one question: *"Is the core loop fun, and do the things that make this game different actually land?"*
- **Quality bar:** Bugs and placeholder art are acceptable. A broken core loop, crashes, or absent identity features are not.
- **What testers experience:** Pick an animal, fight zombies, level up, get weapons and scrolls, use a power attack, watch zombies merge, die, want to play again, tell you what felt different.

### Exit Criteria -- "Alpha Is Done" When:

1. A tester can complete 3 consecutive runs on any difficulty without a crash, freeze, or state corruption.
2. At least 5 testers have submitted feedback (inline or via form).
3. The five identity features (animal characters, muscle growth, zombie merge, power attack, kid-friendly tone) are present and noticeable without prompting.
4. Chill Mode exists and a child aged 6-10 can survive at least 3 minutes on it.
5. Game-over screen shows stats, inline feedback prompts, and a link to the full feedback form.

---

## 2. What Makes Wildfang Different (Summary)

The alpha must showcase these pillars:

1. **Kid-friendly survivor in a genre with zero kid-friendly entries.** The market position.
2. **Animal characters with visible muscle growth.** Instantly memorable, already built.
3. **Zombie merge system.** Novel enemy escalation. (See Section 3 for merge ratio decision.)
4. **Player-triggered power attack.** Uncommon agency in a passive genre.
5. **Mouth-made SFX** (stretch goal). Unreplicable brand identity.

Everything already built that does not serve these pillars stays in but gets zero polish time.

---

## 3. Design Decisions to Lock Before Building

These were open questions in v1. They are now decisions.

### 3a. Merge Ratios

**Decision:** Ship alpha with tiered merge ratios, not 1:1.

| Tier Name | Merge Ratio | Visual Cue |
|---|---|---|
| Tier 1 (Shambler) | base | Default zombie |
| Tier 2 (Lurcher) | 5 Shamblers | Slightly larger, faster |
| Tier 3 (Bruiser) | 3 Lurchers | Visibly larger, glowing eyes |
| Tier 4 (Mega) | 2 Bruisers | Boss-sized, screen shake on spawn |

Rationale: At 1:1, merges are invisible. Tiered ratios make each merge a noticeable event. This is a design decision, not a testing hypothesis. Cap at 4 tiers for alpha; the 10-tier system is deferred.

**Done when:** Merge ratios are implemented, and a Tier 4 Mega zombie spawns visibly during a 10-minute run on Normal difficulty.

### 3b. Run Variety

**Decision:** Randomize weapon offerings per run.

Each run, randomly select 4 of the 6 weapon types to appear in level-up options. The 2 excluded weapons change every run. This guarantees different builds across runs with zero new systems.

**Done when:** Playing 3 consecutive runs, the player is offered different weapon pools in at least 2 of 3 runs.

### 3c. Placeholder Audio

**Decision:** Include 10-15 free placeholder sounds. Ship with audio, not silent.

Source from free SFX libraries (freesound.org, Kenney.nl). Cover: zombie hit, zombie death, player hit, power attack charge, power attack release, level-up chime, XP gem pickup, merge sound, weapon fire (2-3 variants), game-over sting.

Rationale: The difference between "game" and "tech demo" is sound. Two hours of work. Mouth-made SFX replace these later.

**Done when:** Every action listed above produces an audible sound. Volume is adjustable or mutable.

### 3d. 2D Mode Gate

**Decision:** Disable 2D mode access for alpha. Add a mode gate that sends players directly to 3D character select.

Rationale: Testers will find 2D mode and get confused. A 30-minute gate prevents this.

**Done when:** Launching the game goes directly to 3D mode. No path reaches 2D mode.

---

## 4. Alpha Scope

### MUST -- In the build, working correctly

All items below are already built unless marked with **[NEW]**.

| Feature | Alpha Work |
|---|---|
| 4 playable animals with muscle growth | None |
| Auto-attack weapons (6 types, 5 levels) | None |
| Weapon slot progression (unlock at 1/5/10/15) | None |
| Passive scroll system (6 types, stackable) | None |
| Level-up upgrade menu with rerolls | None |
| Zombie merge system | **[NEW]** Implement tiered merge ratios (Section 3a) |
| Charged power attack | **[NEW]** Add visual charge indicator (Section 5, M1) |
| Procedural infinite terrain (3 biomes) | None |
| Shrine augment system | None |
| Difficulty totem system | None |
| Wave events (4-minute timer) | None |
| 18 powerups, 11 equipment items | None |
| Pause menu (Resume/Restart/Main Menu) | None |
| Per-difficulty leaderboard (localStorage) | None |
| **[NEW]** Chill Mode difficulty | 150% HP, 0.7x enemy speed, 1.5x powerup freq, 0.5x score. Number tweaks + 1 hour balance verification across all 4 difficulties. |
| **[NEW]** Randomized weapon pool per run | Section 3b |
| **[NEW]** Placeholder audio (10-15 SFX) | Section 3c |
| **[NEW]** 2D mode gate | Section 3d |
| **[NEW]** Inline feedback on game-over screen | 2-3 short questions displayed directly, not just a link |
| P0 bug fixes (for-in mutation, event listener leak) | Must fix |
| P1 bug fixes (cooldown drift, opacity, state cleanup) | Must fix |
| Deployment (itch.io or GitHub Pages) | Must do |

### DEFER -- Not in alpha

Per-animal active abilities, Howl system, verticality/terrain physics, co-op, gamepad, new biomes, bosses, cosmetics, monetization, monolith decomposition, meta-XP/progression, analytics display UI, full test suite, combo journal, console deployment, camera redesign.

Note on **per-animal active abilities**: Strong post-alpha priority. Each animal getting a unique active (dash, roar, spin, chomp) would significantly improve identity. Design these during the alpha feedback window.

Note on **meta-XP**: Cut for alpha. Testers will play 3-10 runs. Between-run progression adds nothing to a test of the core loop. Revisit for Open Beta.

---

## 5. Milestones

**Total timeline: 3 weeks to deployment. Be honest about calendar time.**

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

### Milestone 1: Alpha Polish (Days 4-10)

| Task | Effort | Done When |
|---|---|---|
| Tiered merge ratios (4 tiers) | 3-4 hours | Tier 4 Mega spawns during a 10-min Normal run. Merge event has flash + scale bounce. |
| Merge visual punch-up | 2-3 hours | Flash, scale-up bounce, and particle burst on every merge. A first-time player notices merges without being told. |
| Power attack charge indicator | 2-3 hours | Visible growing glow during charge. Release produces dramatic AoE flash + screen shake. A tester can gauge charge level visually. |
| Randomized weapon pool per run | 1-2 hours | 4 of 6 weapons offered; pool differs between runs. |
| Chill Mode | 1-2 hours | 4th difficulty option. A 7-year-old survives 3+ minutes. Balance verified across all difficulties (1 hour). |
| Placeholder audio (10-15 SFX) | 2-3 hours | Every core action has a sound. Mute button works. |
| Game-over screen upgrade | 2-3 hours | Shows: time survived, zombies killed, highest tier, level, score. Displays 2-3 inline feedback questions (see Section 6). "Play Again" reachable in under 5 seconds. |
| Character select cleanup | 1-2 hours | Stats visible (speed/damage/HP). Starting weapon shown. Brief flavor text per animal. |
| HUD readability pass | 1-2 hours | All HUD elements readable and unobscured at 1280x720 and 1920x1080. |
| Difficulty curve check | 1 hour | Play 3 runs with a stopwatch. Adjust spawn rates/XP if Easy is too hard or Hard is trivial. |

**Effort total: ~18-25 hours (5-7 days).**

---

### Milestone 1.5: Developer QA Gate (Day 11)

**Before any tester touches the build, the developer plays it.**

| Task | Effort | Done When |
|---|---|---|
| Play 2 full runs per difficulty (8 runs total) | 3-4 hours | No crash, no state corruption, no visual glitch that would confuse a tester. |
| Fill out own feedback form | 30 min | Form works. Questions make sense in context. |
| Fix any issues found | 2-4 hours | All blockers resolved. Non-blockers logged for M3. |

**Effort total: ~6-8 hours (1 day). This is a hard gate. Do not skip it.**

---

### Milestone 2: Deploy + Distribute (Days 12-13)

| Task | Effort | Done When |
|---|---|---|
| Deploy to itch.io (or GitHub Pages fallback) | 1-2 hours | URL loads and plays on a machine the developer has not tested on. |
| Write tester instructions | 1 hour | One page: how to play, what to focus on, what is missing (full audio, gamepad), what feedback matters most. |
| Distribute to testers | 30 min | URL and instructions sent. |

**Effort total: ~3-4 hours (1 day). Then wait 5-7 days for feedback.**

---

### Milestone 3: Respond to Feedback (Days 19-21, time-boxed)

**Hard rules:**
- Time-box: 5 working days maximum.
- Scope cap: Fix at most 3 issues. Prioritize by frequency (how many testers hit it) and severity (does it break the loop).
- Hard cutoff: At end of 5 days, the alpha is done regardless. Remaining issues go to Open Beta backlog.

**Pre-committed success criteria for the alpha:**
- 5+ testers submitted feedback.
- 50%+ of testers played 3+ runs.
- 50%+ of testers said they would play again.
- At least 2 testers mentioned zombie merging or power attack unprompted.
- No crash reported by more than 1 tester.

If these criteria are met, the core loop is validated. Move to Open Beta planning.
If not, identify the single biggest failure and run one more 5-day iteration (max).

---

### Timeline Overview

```
Week 1 (Days 1-7):
  Days 1-3    M0: Recruit testers + stabilize
  Days 4-7    M1: Alpha polish (first half)

Week 2 (Days 8-14):
  Days 8-10   M1: Alpha polish (second half)
  Day 11      M1.5: Developer QA gate
  Days 12-13  M2: Deploy + distribute
  Days 14+    Testers play

Week 3 (Days 15-21):
  Days 15-18  Testers continue playing. Collect feedback.
  Days 19-21  M3: Respond to top 3 issues (time-boxed)

Day 21:      Decision point. Core loop validated? -> Open Beta.
             Not validated? -> One more 5-day iteration, then decide.
```

**Total: ~3 weeks. ~40-55 hours of developer work, spread across calendar time to allow tester feedback windows.**

---

## 6. Feedback System

### Write the questions BEFORE building.

**Inline (game-over screen, 2-3 questions max):**
1. "What was the most fun moment this run?" (free text, optional)
2. "Would you play again?" (Yes / Maybe / No)
3. "Anything frustrating?" (free text, optional)

These appear directly on the game-over screen. No external link required. Responses stored in localStorage.

**Full form (linked from game-over screen, for testers willing to go deeper):**
1. Which animal did you pick most? Why?
2. Did you notice zombies combining into bigger zombies? What did you think?
3. Did you use the power attack? When and why?
4. What difficulty did you play on? Was it right for you?
5. How old are you? (If a kid is playing, note their age.)
6. Would you play this again? What would make you come back?
7. What was confusing or frustrating?
8. Open comments.

### Silent Analytics (localStorage only, no UI, no display stub)

Track these 5 metrics per run, silently. Zero tester-facing cost. Used to cross-reference with qualitative feedback.

1. Run duration (seconds)
2. Animal picked
3. Level reached
4. Weapons picked vs. skipped (which weapons offered, which chosen)
5. Whether power attack was used (yes/no, count)

No analytics dashboard. Read the data manually from localStorage or via console during debrief with testers.

---

## 7. Risk Assessment

| Risk | Mitigation |
|---|---|
| **Scope creep** (highest risk) | Every polish task has a "done when." If it is not on the milestone list, it does not happen before alpha. |
| **Testers do not play** | Recruit in M0, not M2. Confirm 10+ people. Follow up personally at day 3. Make it one-click, 15 minutes, no install. |
| **State cleanup worse than expected** | Budget 2-3 hours in M0. If it exceeds 4 hours, ship with a "please refresh between runs" note and fix in M3. |
| **Performance issues surface** | Profiling is in M0. If frame rate is bad, the P1 perf fixes (squared distance, swap-delete) get promoted. |
| **Merge ratio rebalance takes too long** | If tiered merges take more than 4 hours, ship with 1:1 and a larger visual punch-up. Test the hypothesis with testers. |
| **Chill Mode balance is off** | 1 hour of balance verification is budgeted. If a 7-year-old still dies in under 2 minutes, halve enemy speed again. This is number tweaks. |

---

## 8. Hypotheses to Test

These connect directly to milestone tasks and feedback questions.

| Hypothesis | Built In | Measured By |
|---|---|---|
| Zombie merge creates memorable moments | M1 (merge ratios + visual punch-up) | Inline Q1 + Form Q2: do testers mention merging unprompted? |
| Power attack adds meaningful agency | M1 (charge indicator) | Form Q3 + silent analytics (power attack usage count) |
| Animal choice feels meaningful | Already built + M1 (character select cleanup) | Form Q1 + silent analytics (animal distribution across runs) |
| "One more run" pull exists | Already built | Inline Q2 (play again?) + Form Q6 + silent analytics (run duration, session count) |
| Kid-friendly tone works | Already built + M1 (Chill Mode) | Form Q5 (kid age + reactions) |
| Build variety exists across runs | M1 (randomized weapon pool) | Silent analytics (weapons picked) + Form Q7 if testers report samey runs |

---

## Post-Alpha Priorities (Not in Scope, Noted for Planning)

Once alpha feedback validates the core loop, the next investments in priority order:

1. **Monolith decomposition** -- Required before parallel Open Beta development.
2. **Per-animal active abilities** -- Dash, roar, spin, chomp. Strongest candidate for deepening animal identity.
3. **Mouth-made SFX recording sessions** -- Replace placeholders with the real thing.
4. **Meta-progression system** -- Between-run unlocks for long-term retention.
5. **Verticality investigation** -- Scope an intermediate step between flat terrain and full physics.
6. **Gamepad support** -- Required for console audience and co-op.
