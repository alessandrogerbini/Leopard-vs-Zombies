# Beads: BD-236 through BD-238

**Date:** 2026-02-24
**Source:** Post-sprint playtesting revealed two critical bugs in boss battle and player death systems.

---

### BD-236: Boss attacks never fire — tier cap too low

**Category:** Bug Fix — Boss Combat
**Priority:** P0 (Critical)
**File(s):** `js/game3d.js`

**Root cause:** Boss tier was capped at 8 via `Math.min(st.wave + 2, 8)`, but ALL boss attack logic requires `e.tier >= 9`. Bosses never reached tier 9, making the entire attack system (phases, telegraphs, Titan attacks, Overlord attacks) dead code.

**Fix:** Replace the tier calculation at line 7589:
- Before: `const bossTier = Math.min(st.wave + 2, 8);`
- After: `const bossTier = st.wave >= 4 ? 10 : 9;`

Waves 1–3 spawn Titan bosses (tier 9), wave 4+ spawn Overlord bosses (tier 10). Boss HP is independently scaled via `BOSS_HP_MULT = 25`, so tier only affects attack set and visuals.

---

### BD-237: Player can't die — heals rescue from 0 HP

**Category:** Bug Fix — Player Death
**Priority:** P0 (Critical)
**File(s):** `js/game3d.js`

**Root cause:** `killEnemy()` contains two unguarded heal paths that restore HP even when the player is at 0. Since `killEnemy()` runs before the death check (`st.hp <= 0` at line 7704), enemy kills within the same frame resurrect the player.

**Fix:** Add `if (st.hp > 0)` guard to both heal paths:
- Line 2705 (Silly Straw): `if (st.hp > 0) st.hp = Math.min(st.hp + st.items.sillyStraw, st.maxHp);`
- Line 2743 (Health orb): `if (st.hp > 0) st.hp = Math.min(st.hp + st.maxHp * 0.10, st.maxHp);`

Cannot use `!st.deathSequence` because `deathSequence` hasn't been set yet at this point in the frame.

---

### BD-238: Playwright E2E tests for boss attacks and player death

**Category:** Test — E2E Verification
**Priority:** P1
**File(s):** `test-results/test-boss-and-death.mjs`

**Description:** Three Playwright tests verifying the BD-236 and BD-237 fixes:

1. **Boss spawns as tier 9+ and attacks fire** — Activates a challenge shrine, verifies boss tier >= 9 and bossPhase >= 1, forces specialAttackTimer to 0, polls for attack state transition.
2. **Player death triggers correctly** — Sets HP to 1 with no invincibility, waits for natural death from enemy contact.
3. **Death with heal-on-kill items (regression)** — Gives player Silly Straw stacks near heal threshold, sets HP to 1, verifies death still occurs (heal-on-kill doesn't resurrect).

Follows existing pattern from `test-results/test-gameover-flow.mjs`.
