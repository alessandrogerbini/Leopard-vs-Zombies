# Bead: BD-189 — Game Over Screen Input Freeze

**Date:** 2026-02-24
**Source:** Manual playthrough — died as Red Panda, game over screen completely unresponsive to all keyboard input.

---

## Priority Legend

| Priority | Meaning | Action Timeline |
|----------|---------|-----------------|
| **P0** | Game-breaking bug or crash | Fix immediately |

---

## P0 -- Game-Breaking Bug

---

### BD-189: Game over screen ignores all keyboard input (nameEntryInputCooldown never expires)

**Category:** Bug (input freeze)
**Priority:** P0
**File(s):** `js/game3d.js` ~lines 4459, 6077

**Description:** After the player dies, the game over screen is completely unresponsive to keyboard input — Enter, Space, Arrow keys, and letter keys all do nothing. The player is permanently stuck on the "ENTER YOUR NAME:" prompt with no way to proceed, restart, or return to the menu.

**Root Cause:**

On player death (line 6077), `st.nameEntryInputCooldown` is set to `0.3` (300ms). This cooldown is intended to briefly block input so that held movement keys (WASD) don't leak into the name entry field.

However, the cooldown decrement (line 4459) sits inside the `if (!st.paused && !st.gameOver)` simulation block (which begins at line 4238). Since `st.gameOver` is `true` at this point, the cooldown **never decrements** — it stays at 0.3 forever.

In the keydown handler, all name entry input is gated by:
```js
if (st.nameEntryInputCooldown > 0) return;  // line 603
```

Since the cooldown is permanently > 0, this `return` fires on every single keypress, blocking all input indefinitely. The game over screen becomes a dead end.

**Reproduction:**
1. Start a 3D game (any animal, any difficulty)
2. Die (let zombies kill you)
3. Game over screen appears with "ENTER YOUR NAME:" prompt
4. Press any key — nothing happens
5. Player is permanently stuck

**Fix Approach:**

Move the cooldown decrement outside the `!st.gameOver` gate. The simplest fix is to place it just before or just after the existing `if (!st.paused && !st.gameOver)` block, alongside other timers that should tick during game over:

```js
// Move from inside the simulation block to just before it (after FPS tracking):
if (st.nameEntryInputCooldown > 0) st.nameEntryInputCooldown -= dt;
```

Remove the original line 4459 from inside the `!st.gameOver` block.

**Acceptance Criteria:**
- After dying, the game over screen accepts keyboard input after ~300ms
- Player can type a name using letter keys (excluding WASD/B/R/E/Space as per BD-107)
- Player can press Enter to save the name (when name length > 0)
- Player can use Arrow keys to navigate the "Was that FUN?" feedback selector
- After saving the name, pressing Enter returns to the main menu
- The 300ms cooldown still works — keys held during death don't leak into name entry
- No regressions to upgrade menu, pause menu, or shrine menu input handling

---

## Conflict Analysis

This bead has **no conflicts** with BD-186/187/188 (health regen balance) — they touch different lines and different systems. Safe to implement in any order or in parallel.
