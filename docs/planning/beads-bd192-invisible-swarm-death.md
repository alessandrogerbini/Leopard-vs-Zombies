# Bead: BD-192 — Invisible Swarm Death (invincibility too short + no player damage flash)

**Date:** 2026-02-24
**Source:** Manual playthrough — Level 4, 99 kills, 11 seconds, player reports "not seeing myself taking damage." Game should last 7+ minutes.

---

## Priority Legend

| Priority | Meaning | Action Timeline |
|----------|---------|-----------------|
| **P0** | Game-breaking bug or crash | Fix immediately |

---

## P0 -- Game-Breaking Balance + UX

---

### BD-192: Invincibility window too short + no player damage feedback → invisible swarm death

**Category:** Balance + UX (game-breaking)
**Priority:** P0
**File(s):** `js/game3d.js` ~lines 2613-2647 (damagePlayer), player model rendering

**Description:** The player dies in seconds from zombie contact damage without perceiving individual hits. Two compounding issues:

**Issue A — 0.2s invincibility is fatal in a swarm game:**

The `damagePlayer()` function (line 2644) grants only 0.2 seconds of invincibility after each hit. With 10+ zombies on screen:
- Max contact DPS: `15 damage × 5 hits/sec = 75 HP/s`
- Red Panda (40 HP): dead in 0.53 seconds of contact
- Leopard (50 HP): dead in 0.67 seconds

For comparison, Vampire Survivors (the genre model) uses ~0.5-1.0s invincibility frames. At 0.5s invincibility:
- Max contact DPS: `15 × 2 = 30 HP/s`
- Red Panda survives ~1.3s of pure contact
- With movement, healing, and upgrades → 7+ minute runs achievable

**Issue B — No player visual feedback when hit:**

When the player takes damage, the only feedback is:
1. A small floating `-15` text that scrolls up quickly (easy to miss in a crowd)
2. The HP bar decreasing

There is NO player model flash, NO screen edge effect, NO screen shake. Enemy zombies get white body flash on hit (BD-166, lines 5268-5279), but the player model has zero visual damage indication. The player genuinely cannot tell they're being hit.

**Fix Approach:**

**Part A — Increase invincibility to 0.5s** (line 2644):
```js
// Before:
st.invincible = 0.2;
// After:
st.invincible = 0.5;
```

Also update the dodge invincibility (line 2618) to match:
```js
// Before:
st.invincible = 0.2;
// After:
st.invincible = 0.5;
```

**Part B — Add player body flash on damage:**

In `damagePlayer()`, after reducing HP, set a flash timer on the player model. Then in the render loop, apply a red/white tint to the player model's body parts while the flash is active. The flash should be clearly visible — blink the player model between normal color and white/red for the duration of invincibility.

Implementation:
1. Add `st.playerHurtFlash = 0` to state initialization (~line 359)
2. In `damagePlayer()`, set `st.playerHurtFlash = st.invincible` (0.5s)
3. In the render/animation section that runs every frame, apply color flash to `playerModel` body parts when `st.playerHurtFlash > 0`, decrement timer. Use alternating white/normal at ~10Hz for a blink effect.

**Acceptance Criteria:**
- Invincibility after contact damage is 0.5 seconds (not 0.2)
- Player model visibly flashes white/red when taking damage
- The flash is clearly visible even in a crowd of zombies
- With Red Panda (40 HP), the player can survive ~1.3 seconds of sustained swarm contact (not 0.5s)
- Games consistently last 3+ minutes for new players, 7+ for competent play
- Poison pool damage (lines 6006-6018) still respects the `st.invincible` check, benefiting from the longer window
- All existing armor/dodge/shield mechanics still work correctly

---

## Conflict Analysis

No conflicts with BD-189 (game-over input), BD-190 (zombieDmgMult), or BD-191 (difficulty removal). All touch different code sections.
