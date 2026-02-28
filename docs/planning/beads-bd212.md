# Bead: BD-212 — Player is unkillable (cannot drop below 1 HP)

**Status: RESOLVED** (2026-02-28) — Player can now die. Fixed across BD-212/237/239 chain.

**Date:** 2026-02-24
**Source:** Julian's playtest — player literally cannot die, HP never reaches 0.

---

## Priority Legend

| Priority | Meaning | Action Timeline |
|----------|---------|-----------------|
| **P0** | Game-breaking bug or crash | Fix immediately |

---

## P0 -- Bug (Game-Breaking)

---

### BD-212: Player is unkillable — `Math.max(1, dmg)` forces minimum 1 damage, regen outheals it

**Category:** Bug — Balance (CRITICAL)
**Priority:** P0
**File(s):** `js/game3d.js` ~line 2714

**Description:** Julian reports the player literally cannot die. Investigation reveals a compounding bug:

**Root Cause — Line 2714:** `dmg = Math.max(1, dmg);`

This line was added in BD-154+155 as a safety measure to ensure damage is never 0 after armor/reduction calculations. But it has two critical side effects:

1. **Shield Bracelet block is broken:** When Shield Bracelet triggers, it sets `dmg = 0` (line 2709). But line 2714 immediately overrides this to `dmg = 1`, so the "block" still deals 1 damage. The "BLOCKED!" floating text appears but the player still takes damage.

2. **Regeneration creates immortality:** With any regen source active (Vampire Fangs at 3 HP/s, augment regen, Regen Burst at 20% maxHP/s), the player heals faster than 1 damage/hit. Since invincibility frames last 0.5s and each hit can only do 1 minimum damage, the effective damage rate is capped at 2 HP/s — while regen can exceed 3+ HP/s. The player's HP stabilizes above 0 indefinitely.

**The damage pipeline:**
```
baseDmg → armor reduction → augmentArmor reduction → wearable body reduction → berserk multiplier → Shield Bracelet (→ 0) → Math.max(1, dmg) [OVERRIDE TO 1] → st.hp -= dmg
```

Even with zero armor and no reductions, if the player has ANY regen source, they're effectively immortal because the 0.5s iframes limit damage intake to 2/s while regen provides 3+/s.

**Fix:**

1. Change `Math.max(1, dmg)` to `Math.max(0, Math.round(dmg))` — allow 0 damage (for Shield Bracelet blocks and full mitigation), but prevent negative damage
2. Skip the `st.hp -= dmg` and `st.invincible` lines if `dmg === 0` (a true block shouldn't consume iframes)

```js
// Before (BROKEN):
dmg = Math.max(1, dmg);
st.hp -= dmg;
if (st.hp < 0) st.hp = 0;
st.invincible = 0.5;

// After (FIXED):
dmg = Math.max(0, Math.round(dmg));
if (dmg > 0) {
  st.hp -= dmg;
  if (st.hp < 0) st.hp = 0;
  st.invincible = 0.5;
  if (st.playerHurtFlashCooldown <= 0) {
    st.playerHurtFlash = 0.5;
    st.playerHurtFlashCooldown = 1.0;
  }
  addFloatingText('-' + dmg, color || '#ff2200', st.playerX, st.playerY + 2, st.playerZ, 0.5);
}
// Shield Bracelet block with dmg=0 shows "BLOCKED!" text (already handled above line 2714)
// and does NOT consume iframes or deal damage
```

**Acceptance Criteria:**
- Player CAN die when HP reaches 0
- Game over triggers normally
- Shield Bracelet block actually blocks (0 damage, no iframes consumed)
- High armor + regen does NOT create immortality
- Damage numbers still display correctly for all values
- Low-damage hits (e.g., tier 1 with full armor) can still be fully mitigated to 0
- No regression to invincibility frames or hurt flash

---

## Conflict Analysis

BD-212 touches game3d.js ~line 2714 (damagePlayer function). Low conflict with BD-208 (player hurt flash, same function but different lines — the flash trigger code will need to move inside the `if (dmg > 0)` block).
