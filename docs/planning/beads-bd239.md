# BD-239: Player still immortal — regen resurrects from 0 HP every frame

**Category:** Bug — Game-Breaking
**Priority:** P0-Critical
**Reopens:** BD-212 (partial fix), BD-237 (partial fix)
**File(s):** `js/game3d.js`

## Problem

BD-212 removed the `Math.max(1, dmg)` floor that prevented lethal damage.
BD-237 added `st.hp > 0` guards to kill-triggered heals (Silly Straw, health orbs).
But **augment regen** (line ~7665) still heals unconditionally when `st.hp === 0`:

```js
// Runs BEFORE the death check at ~7704
if (st.augmentRegen > 0 && !st.deathSequence) {
    const effectiveRegen = Math.min(st.augmentRegen, 4.0);
    st.hp = Math.min(st.hp + effectiveRegen * gameDt, st.maxHp);
}
```

**Sequence every frame:**
1. Player takes damage → `st.hp` = 0
2. Augment regen ticks: `st.hp` = 0 + 4.0 × 0.016 = 0.064
3. Death check: `st.hp <= 0`? No (0.064 > 0) → **death never triggers**
4. HUD displays rounded value → shows "1 HP"
5. Player is immortal

The same issue may exist in other regen sources (Health Pendant wearable, Vampire Fangs powerup, poison pool bypass damage at ~7647-7652) that also modify `st.hp` directly without the `st.hp > 0` guard.

## Fix

Add `st.hp > 0` guard to ALL regen/heal sources, matching the BD-237 pattern:

```js
// Augment regen (~7665)
if (st.augmentRegen > 0 && !st.deathSequence && st.hp > 0) {

// Any other direct st.hp += heal sources need the same guard
```

Also audit every `st.hp +=` and `st.hp = Math.min(st.hp + ...)` line to ensure none can resurrect from 0.

## Acceptance Criteria

- Player dies when HP reaches 0, even with augment regen active
- Player dies when HP reaches 0, even with Health Pendant equipped
- Player dies when HP reaches 0, even with Vampire Fangs active
- No heal source can bring player from 0 HP back to positive
- Existing BD-237 guards (Silly Straw, health orb) remain intact
- Death sequence triggers correctly on reaching 0 HP

## Estimated Scope

Small — add `st.hp > 0` guard to 3-5 heal sites. Full audit of `st.hp` mutation sites needed.
