# BD-266: Item fanfare not triggering at runtime — carousel, showcase, and reroll not appearing

**Date:** 2026-02-28
**Source:** Manual playthrough — despite BD-260 code being present on master, picking up items still auto-equips immediately with no fanfare pause, no slot-machine carousel, no showcase card, and no reroll option. The feature is completely non-functional at runtime.

---

## P0 — Feature Not Working

---

### BD-266: BD-260 item fanfare code exists but does not activate in-game

**Category:** Bug (feature non-functional)
**Priority:** P0
**File(s):** `js/game3d.js` (item pickup ~line 7910, fanfare tick ~line 8315, fanfare helpers ~line 2415), `js/3d/hud.js` (fanfare rendering ~line 1206)

**Symptom:**
All BD-260 fanfare code is present on master and structurally complete:
- `startItemFanfare()` at line 2492
- `applyItemFanfareChoice()` at line 2527
- `buildItemFanfarePool()` at line 2415
- `checkSlotOccupied()` at line 2460
- `weightedRandomItem()` at line 2441
- Fanfare tick at line 8315 (outside pause gate)
- HUD rendering at line 1206 (carousel + showcase + prompts)
- Input handling at line 871
- State variables at line 408

Yet picking up items still behaves as pre-BD-260: instant equip, brief announcement banner, no pause.

**Code audit confirms the flow SHOULD work:**
1. Line 7910: `if (distSq < 2.25 && idy < 2.0 && !st.deathSequence && !st.itemFanfare)` — pickup detection
2. Line 7921: `startItemFanfare(item, it, isBossForced)` — should fire
3. Line 2512: `st.paused = true` — should pause the game
4. Line 1206: `if (s.itemFanfare && !s.gameOver)` — should render

**Possible root causes (investigate all):**

### 1. Silent runtime exception (HIGHEST SUSPICION)

BD-258 added try-catch around tick(). If `startItemFanfare()` throws (e.g., `buildItemFanfarePool()` returns empty array, `checkSlotOccupied()` hits undefined property), the exception is caught silently. The item mesh is already removed (lines 7915-7919 execute BEFORE `startItemFanfare` at line 7921), so the item disappears but the fanfare never opens. The game continues as if nothing happened.

**Diagnosis:** Add `console.log('[BD-260] startItemFanfare called', rolledItem.name)` at the top of `startItemFanfare()`. Check browser console for errors (the try-catch should log them).

### 2. The pickup section is inside the pause gate

The item pickup loop at line 7910 is inside `if (!st.paused && !st.gameOver)` (line 5200). If the game is paused for ANY reason when the player touches an item, the pickup never fires. This is correct behavior, but worth confirming the flow reaches line 7910 at all.

### 3. WEARABLE pickups are a separate system

There are TWO pickup systems:
- `st.itemPickups` (ITEMS_3D) — line 7900+ — **HAS fanfare**
- `st.wearablePickups` (WEARABLES_3D, head/body/feet slots) — line 7933+ — **NO fanfare, auto-equips**

If the user is primarily encountering wearable pickups (from crates, wave rewards), those completely bypass the fanfare. The user may see items being auto-equipped and think the fanfare doesn't work, when actually those are wearables not items.

**However:** The user says "no carousel animation, no ability to reroll" — this suggests they've never seen the fanfare trigger at all, not even once. This points to cause #1 (exception) or a real code path issue.

### 4. Browser cache

Despite v=10 cache-busting, the user may be running stale code. Hard refresh (Ctrl+Shift+R) or incognito window needed.

---

## Fix Plan

### Step 1: Add diagnostic console.log statements (TEMPORARY)

**File: `js/game3d.js`**

At line 7910 (pickup detection):
```js
if (distSq < 2.25 && idy < 2.0 && !st.deathSequence && !st.itemFanfare) {
  console.log('[BD-266] Item pickup detected:', item.itype.name);
```

At line 2492 (startItemFanfare entry):
```js
function startItemFanfare(pickup, rolledItem, isBossForced) {
  console.log('[BD-266] startItemFanfare called:', rolledItem.name, 'boss:', isBossForced);
```

At line 2496 (after st.itemFanfare assignment):
```js
st.itemFanfare = { ... };
console.log('[BD-266] itemFanfare state set, phase:', st.itemFanfare.phase, 'poolSize:', st.itemFanfare.rollPool.length);
```

At line 1206 in hud.js (fanfare render entry):
```js
if (s.itemFanfare && !s.gameOver) {
  console.log('[BD-266] HUD rendering fanfare, phase:', s.itemFanfare.phase);
```

### Step 2: Check tick try-catch for swallowed errors

The BD-258 try-catch at tick() line 4924 logs to `console.error`. Open browser console (F12 → Console) and look for `[tick] Uncaught exception` messages when walking over items.

### Step 3: If exception found, fix the root cause

Common suspects:
- `buildItemFanfarePool()` returning empty array → `pool.length > 1` check makes rollPool = `[rolledItem]` (single item), but the carousel still needs to render
- `ITEM_RARITIES[poolItem.rarity]` returning undefined if a pool item has no rarity
- `rolledItem.name.charAt(0)` failing if name is undefined
- `f.rollPool.findIndex(...)` returning -1

### Step 4: Extend fanfare to WEARABLE pickups

The wearable pickup system at line 7933 is completely separate and has no fanfare. To give wearables the same treatment:
- Intercept wearable pickup at line 7954 (distance check)
- Instead of auto-equip, call a new `startWearableFanfare()` or adapt `startItemFanfare()` to handle wearable data
- This may be a separate bead (BD-264 was supposed to cover this but the agent modified the old wearableCompare code instead of the fanfare)

### Step 5: Remove diagnostic logs and bump cache

After root cause is found and fixed, remove all `[BD-266]` console.logs and bump to v=11.

---

## Acceptance Criteria

1. Walking over an ITEMS_3D pickup triggers the fanfare (pause, carousel, showcase, ENTER to accept)
2. Reroll (R key, up to 2 per wave) works during the showcase phase
3. Browser console shows no errors during item pickup
4. If wearable pickups also get fanfare treatment, they follow the same flow
5. All diagnostic logs removed after fix

---

## Estimated Complexity

S-M (Small to Medium) — likely a single runtime error causing silent failure, plus potentially extending fanfare to wearable pickups.
