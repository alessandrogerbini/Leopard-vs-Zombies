# Beads: BD-193 + BD-194 — Game Over Input Gate Fix & Starting HP Boost

**Date:** 2026-02-24
**Source:** Manual playthrough — game-over screen still unresponsive after BD-189 fix; early game too punishing for 7-year-olds.

---

## Priority Legend

| Priority | Meaning | Action Timeline |
|----------|---------|-----------------|
| **P0** | Game-breaking bug or crash | Fix immediately |
| **P1** | Critical UX or balance issue affecting playability | Next sprint |

---

## P0 -- Game-Breaking Bug

---

### BD-193: Game over screen still unresponsive — enterReleasedSinceGameOver gate too restrictive

**Category:** Bug (input freeze)
**Priority:** P0
**File(s):** `js/game3d.js` ~lines 601, 782, 4240-4242

**Description:** BD-189 fixed the `nameEntryInputCooldown` never expiring, but there is a SECOND input gate: `st.enterReleasedSinceGameOver` (line 601). This flag is only set to `true` when the Enter key specifically is released (line 782 in `onKeyUp`). If the player presses ANY other key first (Space, arrows, letters), the gate stays permanently closed and all input is blocked.

The original intent was to prevent a held Enter key (from power attack) from instantly interacting with the game-over screen. But the 0.3s `nameEntryInputCooldown` already provides this protection, AND the `!e.repeat` check on `isFreshConfirm` prevents held-key repeats from confirming. The `enterReleasedSinceGameOver` gate is therefore redundant with the cooldown but vastly more destructive — it creates a permanent deadlock if the player doesn't know to press Enter first.

**Fix Approach:**

Auto-enable `enterReleasedSinceGameOver` when the cooldown timer expires. In the BD-189 cooldown tick (line ~4242), add:

```js
if (st.nameEntryInputCooldown > 0) {
  st.nameEntryInputCooldown -= dt;
  // BD-193: Auto-unlock game-over input when cooldown expires,
  // instead of requiring a specific Enter key release
  if (st.nameEntryInputCooldown <= 0) {
    st.enterReleasedSinceGameOver = true;
  }
}
```

This preserves the 0.3s protection window (held keys during death won't leak) while removing the requirement to know the secret handshake of pressing Enter specifically.

**Acceptance Criteria:**
- After dying, the game-over screen accepts ALL keyboard input after ~300ms
- No specific key needs to be pressed first to "unlock" the screen
- Held Enter from power attack does NOT leak through (0.3s cooldown + `!e.repeat` still guard)
- Name entry, feedback arrows, and confirm all work immediately after the cooldown
- No regressions to upgrade menu, pause menu, or shrine menu

---

## P1 -- Balance

---

### BD-194: Increase 3D starting HP by 25% — too punishing for young players

**Category:** Balance
**Priority:** P1
**File(s):** `js/game3d.js` ~lines 263-264

**Description:** With the 'easy' baseline (hpMult: 1.0) after BD-191 removed difficulty selection, Red Panda starts at 40 HP and Leopard at 50 HP. At 15 damage per tier-1 contact hit (after BD-190+192), the player dies in 2-3 hits. For a 7-year-old playing their first roguelike, this is too punishing in the opening seconds before they've acquired any howls or items.

A 25% HP boost gives Red Panda 50 HP and Leopard 62 HP — survivable for 3-4 tier-1 hits, enough time to learn the game loop.

**Fix Approach:**

In `js/game3d.js` lines 263-264, multiply by 1.25:

```js
// Before:
hp: Math.floor(animalData.hp * diffData.hpMult),
maxHp: Math.floor(animalData.hp * diffData.hpMult),

// After:
hp: Math.floor(animalData.hp * diffData.hpMult * 1.25),
maxHp: Math.floor(animalData.hp * diffData.hpMult * 1.25),
```

This only affects 3D mode (game3d.js). The 2D mode in game.js is unchanged.

**Resulting starting HP (3D, 'easy' baseline):**

| Animal | Before | After |
|--------|--------|-------|
| Red Panda (40 base) | 40 | 50 |
| Leopard (50 base) | 50 | 62 |
| Lion (60 base) | 60 | 75 |
| Gator (75 base) | 75 | 93 |

**Acceptance Criteria:**
- Red Panda starts with 50 HP in 3D mode
- Leopard starts with 62 HP in 3D mode
- maxHp matches starting HP
- HUD HP bar renders correctly with the new values
- Level-up HP gains (if any) still work correctly
- 2D mode HP is completely unaffected

---

## Conflict Analysis

BD-193 and BD-194 touch different lines in game3d.js — no conflicts. Both compatible with BD-189/190/191/192.
