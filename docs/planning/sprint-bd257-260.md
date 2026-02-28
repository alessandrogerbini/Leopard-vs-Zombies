# Sprint Plan: BD-257 through BD-260 -- Shrine Labels, Death Hang Fix, Spawn Tuning, Item Fanfare

**Date:** 2026-02-28
**Source beads:**
- `docs/planning/beads-bd257.md` (shrine upgrade labels too vague)
- `docs/planning/beads-bd258.md` (death sequence hangs AGAIN -- try-catch fix)
- `docs/planning/beads-bd259.md` (reduce ambient zombie spawn rate 20%)
- `docs/planning/beads-bd260.md` (item pickup fanfare with slot-machine reveal)
**Execution model:** 2 batch rounds -- Batch 1 parallel (3 agents), Batch 2 sequential (1 agent)

---

## 1. Sprint Overview

This sprint addresses one **P0 game-breaking bug** (death hang recurrence), two **P1 polish/balance fixes** (shrine labels, spawn rate), and one **P1 feature** (item pickup fanfare).

**BD-258 is P0** -- the death-to-game-over transition STILL hangs intermittently despite two prior fixes (BD-251, BD-256). The root cause is the ~3300-line `tick()` function having zero error handling. Any uncaught exception in `requestAnimationFrame` silently kills the game loop. The fix wraps the tick body in try-catch, which is the correct architectural pattern for production game loops.

**BD-257 is P1** -- charge shrine upgrade cards show vague names ("All better!" vs "Everything better!") with no subtext. Players cannot distinguish between a full heal and an all-stat boost. Fix: rename the unclear options, add `desc` field to all 24 upgrades, render subtext on cards.

**BD-259 is P1** -- early waves (0-2) are overpopulated. Fix: increase `AMBIENT_SPAWN_INTERVAL` from 1.36 to 1.70 seconds (20% fewer spawns/min).

**BD-260 is P1** -- item pickups currently flash a small banner and apply immediately with no ceremony. Fix: add a full slot-machine reveal animation, showcase card, and wave-limited reroll system. This is the largest bead in the sprint.

---

## 2. Bead Inventory

| BD# | Priority | Category | File(s) | Complexity | Summary |
|-----|----------|----------|---------|------------|---------|
| BD-258 | P0 | Bug (game-breaking) | `js/game3d.js` (tick function, dt calculation), `index.html`, `js/game.js` | S | Wrap tick() in try-catch, fix realDt contamination, bump cache to v=8 |
| BD-257 | P1 | UX (readability) | `js/3d/constants.js` (CHARGE_SHRINE_UPGRADES ~line 651), `js/3d/hud.js` (card rendering ~line 1131) | S | Rename vague shrine labels, add desc field to 24 upgrades, render subtext |
| BD-259 | P1 | Balance (spawn rate) | `js/3d/constants.js` (AMBIENT_SPAWN_INTERVAL, line 808) | XS | Change one constant: 1.36 -> 1.70 |
| BD-260 | P1 | Feature (game feel) | `js/game3d.js` (item pickup ~line 7649, state init ~line 280, input ~line 756), `js/3d/hud.js` (new rendering section) | L | Slot-machine reveal, showcase card, reroll economy, new HUD section |

---

## 3. Conflict Matrix

|          | BD-258 | BD-257 | BD-259 | BD-260 |
|----------|--------|--------|--------|--------|
| **BD-258** | -- | NONE | NONE | LOW |
| **BD-257** | NONE | -- | LOW | NONE |
| **BD-259** | NONE | LOW | -- | NONE |
| **BD-260** | LOW | NONE | NONE | -- |

### Conflict Details

- **BD-258 vs BD-257 (NONE):** BD-258 modifies `game3d.js` lines 4921-4936 (tick wrapper, dt calculation) and cache-busting. BD-257 modifies `constants.js` lines 651-700 (CHARGE_SHRINE_UPGRADES) and `hud.js` line 1131 (card rendering). Completely different files and code regions. **Safe to parallel.**

- **BD-258 vs BD-259 (NONE):** BD-258 touches `game3d.js` (tick function). BD-259 touches `constants.js` line 808 (one constant). Different files entirely. **Safe to parallel.**

- **BD-258 vs BD-260 (LOW):** Both modify `game3d.js`. BD-258 touches lines 4921-4936 (tick wrapper, dt). BD-260 touches lines 280 (state init), 756 (input handler), 2569 (wave event), 7649 (item pickup). These are >500 lines apart in all cases. However, BD-260 adds new state and logic that will run inside the tick body that BD-258 wraps in try-catch. **Order matters: BD-258 should merge first** so that BD-260's new code runs inside the safety net. No overlapping line ranges.

- **BD-257 vs BD-259 (LOW):** Both modify `constants.js`. BD-257 touches CHARGE_SHRINE_UPGRADES (~lines 651-700). BD-259 touches AMBIENT_SPAWN_INTERVAL (line 808). These are >100 lines apart. **Safe to parallel -- no overlapping regions.**

- **BD-257 vs BD-260 (NONE):** BD-257 touches `constants.js` (shrine upgrades) and `hud.js` (shrine card rendering ~line 1131). BD-260 touches `game3d.js` (item pickup flow) and `hud.js` (new fanfare rendering section, added AFTER existing sections ~line 1488+). Different hud.js regions (>350 lines apart). **Safe to parallel.**

- **BD-259 vs BD-260 (NONE):** BD-259 changes one line in `constants.js` (line 808). BD-260 does not modify `constants.js` (read-only reference to ITEMS_3D). **No conflict.**

### Conflicts with External Beads

None. All BD-249 through BD-256 are merged. No other in-flight beads exist.

---

## 4. Dependency & Priority Order

### Critical Path

```
BD-258 (P0, S) ──merge──► BD-260 (P1, L) ──merge──► Done
```

BD-258 must merge before BD-260 because:
1. BD-258 is P0 (game-breaking) -- it should ship first regardless.
2. BD-260 adds ~300-400 lines of new code inside tick(). If any of that code throws during development/testing, the try-catch from BD-258 prevents a full game hang, making BD-260 safer to develop and test.
3. BD-258's cache-bust to v=8 must be the baseline; BD-260 should not re-bump.

BD-257 and BD-259 are fully independent of each other and of BD-258/BD-260. They can run in parallel with BD-258.

### Non-Critical (Independent)

BD-257 and BD-259 have zero dependencies on BD-258 or BD-260. They touch different files (constants.js shrine upgrades + hud.js card rendering, and constants.js spawn interval, respectively). They can merge in any order, at any time.

---

## 5. Batch Plan

### Batch 1 (parallel): BD-258 + BD-257 + BD-259

All three are independent. No overlapping file regions. All are small (S/S/XS).

| Agent | Bead | Priority | File(s) | Lines Changed | Est. Time |
|-------|------|----------|---------|---------------|-----------|
| Agent A | BD-258 | P0 | `js/game3d.js` (lines 4921-4936), `index.html`, `js/game.js` | ~15 lines | 15 min |
| Agent B | BD-257 | P1 | `js/3d/constants.js` (lines 651-700), `js/3d/hud.js` (line 1131) | ~30 lines | 20 min |
| Agent C | BD-259 | P1 | `js/3d/constants.js` (line 808) | 1 line | 5 min |

**Merge order:** Agent A (BD-258) first -- it is P0 and establishes the try-catch safety net. Then Agent C (BD-259) -- trivial, no conflicts. Then Agent B (BD-257) -- slightly larger but still no conflicts. Alternatively, B and C can merge in either order since they touch different regions of `constants.js` (lines 651-700 vs line 808).

**Can BD-257 and BD-259 share a single agent?** Yes. Both touch `constants.js` but in non-overlapping regions. A single agent could implement both in one commit. However, they are logically distinct beads (UX fix vs balance tuning), so separate commits are cleaner for rollback. If agent capacity is limited, combine into one agent with two sequential commits.

### Batch 2 (sequential): BD-260

BD-260 is the only L-complexity bead. It modifies multiple sections of `game3d.js` and adds a new section to `hud.js`. It should run after BD-258 is merged so that the try-catch safety net is in place during development.

| Agent | Bead | Priority | File(s) | Lines Changed | Est. Time |
|-------|------|----------|---------|---------------|-----------|
| Agent D | BD-260 | P1 | `js/game3d.js` (~280, ~756, ~2569, ~7649), `js/3d/hud.js` (new section after ~1488) | ~350 lines | 90-120 min |

**Merge order:** After all Batch 1 beads are merged.

**Why BD-260 needs isolation:** It touches 4+ regions of game3d.js and adds a completely new HUD section. Running it in parallel with BD-258 would risk merge conflicts in game3d.js even though the specific line ranges don't overlap -- the file is ~8200 lines and both agents would be making structural changes.

---

## 6. Parallelization Opportunities Summary

```
TIME ──────────────────────────────────────────────────────────────────────►

Batch 1:  [Agent A: BD-258 (game3d.js tick + cache)]  ────merge────┐
          [Agent B: BD-257 (constants.js + hud.js)]    ────merge────┤
          [Agent C: BD-259 (constants.js line 808)]    ────merge────┤
                                                                    ▼
Batch 2:  [Agent D: BD-260 (game3d.js + hud.js — item fanfare)]  ──merge──┐
                                                                            ▼
                                                            Post-merge QA
```

**Total agents:** 4 (3 in Batch 1, 1 in Batch 2)
**Parallelism:** 3x within Batch 1
**Sequential dependency:** Batch 2 starts after Batch 1 is merged (BD-260 needs BD-258's try-catch)
**Agent consolidation option:** Agents B+C could be combined into one agent (both touch constants.js non-overlapping regions) to reduce to 3 total agents.

---

## 7. Machine-Actionable Specs

See individual bead files for full implementation specs:

### 7A. BD-258: Wrap tick() in try-catch + fix realDt contamination

**Priority:** P0 -- implement and merge first
**Complexity:** S (Small)
**Files:** `js/game3d.js` (lines 4921-4936), `index.html`, `js/game.js`, `js/game3d.js` (cache-bust)
**Agent:** A (Batch 1)

**Implementation summary (3 changes):**

1. **Wrap tick() body in try-catch** (line 4921): The `requestAnimationFrame(tick)` is already at line 4923 (before game logic), so the next frame is scheduled regardless. Wrap lines 4924-8234 (entire tick body after rAF) in `try { ... } catch (err) { console.error('[tick] Uncaught exception:', err); }`.

2. **Fix realDt contamination** (lines 4926-4936): Capture `rawDt` before item slow dilation, use `rawDt` for `realDt` instead of the dilated `dt`. This ensures the death sequence timer runs at true wall-clock speed even if `itemSlowTimer` is active from a pre-death pickup.

3. **Bump cache-busting** to `?v=8` in `index.html`, `js/game.js`, `js/game3d.js`.

**DO NOT TOUCH:**
- `js/3d/constants.js` -- owned by BD-257 (Agent B) and BD-259 (Agent C)
- `js/3d/hud.js` -- owned by BD-257 (Agent B)
- `js/game3d.js` lines outside 4921-4936 and cache-bust strings

**Testing:**
1. Die in game -- verify game-over screen always appears after 1.5s
2. Open browser console -- verify no `[tick] Uncaught exception` errors during normal play
3. Intentionally break something (e.g., null reference) -- verify error is logged and game continues
4. Pick up item just before dying -- verify death sequence duration is 1.5s, not 3s

---

### 7B. BD-257: Rename vague shrine labels + add subtext

**Priority:** P1
**Complexity:** S (Small)
**Files:** `js/3d/constants.js` (CHARGE_SHRINE_UPGRADES ~line 651), `js/3d/hud.js` (~line 1131)
**Agent:** B (Batch 1)

**Implementation summary (2 changes):**

1. **constants.js:** Rename `fullheal` from "All better!" to "Full heal!". Rename `allstats5` from "Everything better!" to "Power surge!". Add `desc` field to all 24 upgrades across all 4 tiers (common, uncommon, rare, legendary). See bead for full desc strings.

2. **hud.js (~line 1131):** Change the name rendering Y offset from `+6` to `-2` to make room for subtext. Add 3 lines after the name to render `u.desc` in 12px gray (#aaa) at Y offset `+18`.

**DO NOT TOUCH:**
- `js/game3d.js` -- owned by BD-258 (Agent A) and BD-260 (Agent D)
- `js/3d/constants.js` line 808 (AMBIENT_SPAWN_INTERVAL) -- owned by BD-259 (Agent C)
- `js/3d/hud.js` lines outside ~1128-1135 (card rendering)

**Testing:**
1. Activate a MEGA SHRINE -- verify "Full heal!" and "Power surge!" are the names shown
2. Verify all cards show a gray subtext line below the name
3. Verify subtext is visually secondary (smaller, muted color)
4. Test at different window sizes -- verify text doesn't overflow card bounds
5. Verify common/uncommon/rare tier cards also show subtext

---

### 7C. BD-259: Reduce ambient spawn rate 20%

**Priority:** P1
**Complexity:** XS (Trivial)
**File:** `js/3d/constants.js` (line 808)
**Agent:** C (Batch 1)

**Implementation:** Change `AMBIENT_SPAWN_INTERVAL` from `1.36` to `1.70`.

**DO NOT TOUCH:**
- `js/game3d.js` -- owned by BD-258 (Agent A) and BD-260 (Agent D)
- `js/3d/constants.js` lines outside 808 -- CHARGE_SHRINE_UPGRADES owned by BD-257 (Agent B)
- `js/3d/hud.js` -- owned by BD-257 (Agent B) and BD-260 (Agent D)

**Testing:**
1. Play waves 0-2 -- verify noticeably fewer zombies on screen (~20% reduction)
2. Play to wave 5+ -- verify late game still ramps up to challenging density
3. Verify wave event bursts are NOT affected (separate from ambient spawns)

---

### 7D. BD-260: Item pickup fanfare with slot-machine reveal

**Priority:** P1
**Complexity:** L (Large)
**Files:** `js/game3d.js` (~line 280, ~756, ~2569, ~7649, ~8091), `js/3d/hud.js` (new section after ~1488)
**Agent:** D (Batch 2 -- after BD-258 is merged)

**Implementation summary (see bead for full spec):**

1. **State init (game3d.js ~line 280):** Add `itemFanfare: null`, `itemFanfareRerolls: 2`, `itemFanfareWave: 1`.

2. **Input handler (game3d.js ~line 756):** Add fanfare input block (Enter to accept, R to reroll, arrow keys for slot comparison).

3. **Wave event reset (game3d.js ~line 2569):** Reset `itemFanfareRerolls` to 2 each wave.

4. **Item pickup flow (game3d.js ~line 7649):** Replace immediate equip with fanfare trigger. Set `st.paused = true`, populate carousel pool.

5. **Death check (game3d.js ~line 8091):** Add `st.itemFanfare = null` to menu-clearing block.

6. **Fanfare tick (game3d.js, inside tick body):** Add carousel animation logic (deceleration, snap to final).

7. **HUD rendering (hud.js, new section after ~1488):** Carousel animation, showcase card, reroll counter, accept/reroll prompts.

8. **Suppress old `itemAnnouncement` banner** when fanfare is active.

**DO NOT TOUCH:**
- `js/3d/constants.js` -- owned by BD-257 (Agent B) and BD-259 (Agent C)
- `js/game3d.js` lines 4921-4936 (tick wrapper, dt) -- owned by BD-258 (Agent A, already merged)
- `js/3d/hud.js` lines 1128-1135 (shrine card rendering) -- owned by BD-257 (Agent B)

**Testing:**
1. Pick up an item -- verify game pauses, slot-machine carousel plays (~1.5s), lands on item
2. Verify showcase card shows name, rarity, description, icon
3. Press ENTER -- verify item is equipped and game resumes
4. Press R -- verify reroll triggers new spin (up to 2 per wave)
5. Test with stackable item -- verify "x2 -> x3" count shown
6. Test with non-stackable slot occupied -- verify comparison card
7. Die during fanfare -- verify fanfare force-closes and game-over screen appears
8. Verify boss-forced items skip roll animation, go to showcase, no reroll option
9. Performance: no FPS impact from carousel animation

---

## 8. Risk Register

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| BD-258 try-catch masks real bugs by swallowing exceptions silently | Medium | Low | Exceptions are logged to `console.error` with stack trace. Future devs must check console. The alternative (game hangs entirely) is worse. |
| BD-259 spawn rate reduction makes late game too easy | Medium | Low | Only ambient spawns affected. Wave event bursts (the main difficulty driver) unchanged. Revert is trivial (one constant). Monitor via playtesting. |
| BD-260 fanfare interrupts game flow too much (feels slow) | Medium | Medium | The fanfare is skippable -- ENTER immediately accepts. Roll duration (1.5s) matches existing upgrade menu appearance time. If too slow, reduce to 1.0s in a follow-up. |
| BD-260 reroll economy is exploitable (reroll commons until legendary) | Low | Medium | 2 rerolls per wave is deliberately limited. The pool is weighted by rarity, so even with rerolls, legendaries remain rare. Monitor via playtesting. |
| BD-260 merge conflicts with game3d.js changes from BD-258 | Low | Low | BD-258 only wraps tick() at lines 4921-4923 and modifies dt at 4926-4936. BD-260 touches lines 280, 756, 2569, 7649 -- all >500 lines away. Clean merge expected. |
| BD-257 desc strings overflow card bounds on small screens | Low | Low | Cards are 180x120px, desc text is 12px. Longest desc is "Attack a tiny bit faster" (~22 chars at 12px bold ~132px). Card width is 180px with center alignment. Should fit. Test at 800x600 minimum. |

---

## 9. Post-Sprint Integration QA

After all 4 beads are merged, run the following integration tests:

1. **Death flow (BD-258):** Die in multiple scenarios (normal, with menus open, with items in flight, near shrines). Verify game-over screen ALWAYS appears within 2 seconds. Check console for any `[tick] Uncaught exception` messages.

2. **Shrine labels (BD-257):** Activate charge shrines at all 4 tiers. Verify every card has a name + gray subtext. Verify "Full heal!" and "Power surge!" are distinct and clear at legendary tier.

3. **Spawn rate (BD-259):** Play a full game on Normal difficulty. Count approximate zombies visible at 30 seconds, 1 minute, 2 minutes. Compare subjectively to pre-patch feel. Early waves should feel less crowded.

4. **Item fanfare (BD-260):** Pick up 5+ items across a game. Verify carousel animation, showcase card, ENTER to accept, R to reroll. Verify rerolls reset on wave events. Verify forced items (boss drops) skip carousel.

5. **Cross-system regression:**
   - Upgrade menu selection still works
   - Pause menu (ESC) still works
   - Wearable compare still works
   - Charge shrine menu still works
   - Zombie movement and collision still work (BD-254/255)
   - GIANT GROWTH powerup still works (BD-253)

6. **Performance:** Play until 200+ zombies are alive. Verify no FPS regression from BD-260's per-frame fanfare state checks.

---

## 10. Rollback Plan

| Bead | Rollback Strategy |
|------|-------------------|
| BD-258 | Remove try-catch wrapper (restore original tick structure). Revert rawDt/realDt change. Safe -- no other beads depend on the try-catch at runtime. |
| BD-257 | Revert constants.js CHARGE_SHRINE_UPGRADES name/desc changes. Revert hud.js card rendering (remove desc line, restore +6 offset). Safe -- desc field is additive, removing it just hides subtext. |
| BD-259 | Change AMBIENT_SPAWN_INTERVAL back to 1.36. Trivial one-line revert. |
| BD-260 | Remove all new state variables, input handler block, fanfare tick logic, HUD fanfare rendering. Restore original immediate-equip pickup flow at ~line 7649. Larger revert but self-contained -- no other systems depend on the fanfare. |

Each bead is independently revertable. BD-260 is the largest revert surface but its changes are well-isolated (new state + new rendering section + modified pickup flow).

---

## 11. File Change Summary

| File | BD-258 | BD-257 | BD-259 | BD-260 |
|------|--------|--------|--------|--------|
| `js/game3d.js` | +5 lines (try-catch, rawDt) | -- | -- | +200 lines (state, input, fanfare tick, pickup flow) |
| `js/3d/constants.js` | -- | ~24 lines modified (desc fields) | 1 line modified | -- (read-only) |
| `js/3d/hud.js` | -- | +4 lines (subtext rendering) | -- | +150 lines (fanfare rendering) |
| `index.html` | 1 line (v=8) | -- | -- | -- |
| `js/game.js` | 1 line (v=8) | -- | -- | -- |

**Net lines added:** BD-258: ~7, BD-257: ~28, BD-259: 0 (modification), BD-260: ~350. **Total: ~385 lines.**
