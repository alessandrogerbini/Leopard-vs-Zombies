# BD-265: Level-up menu must show currently equipped weapons and howls

**Date:** 2026-02-28
**Source:** Manual playthrough — when the level-up upgrade menu appears with 3 choices (new weapons, weapon upgrades, howls), the player cannot see what weapons and howls they already have. The dark overlay (rgba 0,0,0,0.7) covers the normal HUD which shows weapons on the left and howls (powers) on the right. Without this context, the player can't make informed decisions — "Should I take a new weapon or upgrade one I already have? Which howls do I already have stacked?"

---

## P1 — UX / Readability

---

### BD-265: Show current weapons and howls inventory on the level-up upgrade menu

**Category:** UX (information display, decision support)
**Priority:** P1
**File(s):** `js/3d/hud.js` (upgrade menu rendering ~line 1005)

**Symptom:**
The upgrade menu darkens the screen and shows 3 choice cards. The player's current weapons (left HUD) and howls/powers (right HUD) are hidden behind the overlay. A player — especially a young one — cannot remember what they have equipped. They might:
- Pick a new weapon when they already have 4 (max slots)
- Pick a howl they already have at max level
- Skip upgrading a weapon they use constantly because they forgot its level
- Not understand what "BETTER! Boomerang Lv4" means without seeing they have Boomerang Lv3

**Current upgrade menu layout (hud.js ~line 1005-1092):**
```
┌─────────────────────────────────────────────┐
│              (dark overlay)                  │
│                                              │
│              LEVEL UP!                       │
│              Choose:                         │
│                                              │
│   ┌────────┐   ┌────────┐   ┌────────┐     │
│   │ NEW!   │   │BETTER! │   │ POWER! │     │
│   │ MUD    │   │BOOMERANG│  │ HASTE  │     │
│   │ BOMB   │   │ Lv4    │   │ HOWL   │     │
│   │        │   │        │   │        │     │
│   └────────┘   └────────┘   └────────┘     │
│                                              │
│         < ARROW KEYS >                       │
│      PRESS ENTER TO SELECT                   │
│    Press R for NEW CHOICES! (3 left)         │
│                                              │
│  (weapon list hidden)   (howls hidden)       │
│                                              │
└─────────────────────────────────────────────┘
```

**No context about what you already have.**

---

## Fix — Add "YOUR STUFF" panels to upgrade menu

Render the player's current weapons and howls as compact lists on the left and right sides of the upgrade menu, below/beside the choice cards. These are always visible during the menu.

**Proposed layout:**

```
┌─────────────────────────────────────────────┐
│              LEVEL UP!                       │
│              Choose:                         │
│                                              │
│   ┌────────┐   ┌────────┐   ┌────────┐     │
│   │ NEW!   │   │BETTER! │   │ POWER! │     │
│   │ MUD    │   │BOOMERANG│  │ HASTE  │     │
│   │ BOMB   │   │ Lv4    │   │ HOWL   │     │
│   └────────┘   └────────┘   └────────┘     │
│                                              │
│         < ARROW KEYS >                       │
│      PRESS ENTER TO SELECT                   │
│                                              │
│  YOUR WEAPONS:          YOUR POWERS:         │
│  ■ BOOMERANG Lv3        ■ FORTUNE x2        │
│  ■ BONE TOSS Lv1        ■ HASTE x1          │
│  □ [empty slot]                              │
│  □ [empty slot]                              │
│                                              │
└─────────────────────────────────────────────┘
```

### Implementation (hud.js, inside `if (s.upgradeMenu && !s.gameOver)` block, after the reroll text ~line 1091):

```js
// BD-265: Show current weapons and howls during upgrade menu
const invY = cardY + cardH + 100;

// Left side: current weapons
ctx.textAlign = 'left';
ctx.fillStyle = '#ffcc00'; ctx.font = 'bold 14px ' + GAME_FONT;
ctx.fillText('YOUR WEAPONS:', 40, invY);
let iwY = invY + 18;
for (let wi = 0; wi < s.weapons.length; wi++) {
  const w = s.weapons[wi];
  const def = WEAPON_TYPES[w.typeId];
  ctx.fillStyle = def.color; ctx.font = '14px ' + GAME_FONT;
  ctx.fillText(`■ ${def.name} Lv${w.level}`, 44, iwY);
  iwY += 16;
}
for (let wi = s.weapons.length; wi < s.maxWeaponSlots; wi++) {
  ctx.fillStyle = '#555'; ctx.font = '14px ' + GAME_FONT;
  ctx.fillText('□ [empty slot]', 44, iwY);
  iwY += 16;
}

// Right side: current howls
ctx.textAlign = 'right';
const howlEntries = Object.entries(s.howls).filter(([, v]) => v > 0);
if (howlEntries.length > 0) {
  ctx.fillStyle = '#ffcc00'; ctx.font = 'bold 14px ' + GAME_FONT;
  ctx.fillText('YOUR POWERS:', W - 40, invY);
  let ihY = invY + 18;
  for (const [tid, count] of howlEntries) {
    const def = HOWL_TYPES[tid];
    ctx.fillStyle = def.color; ctx.font = '14px ' + GAME_FONT;
    ctx.fillText(`${def.name.replace(' HOWL', '')} x${count}`, W - 44, ihY);
    ihY += 16;
  }
} else {
  ctx.fillStyle = '#555'; ctx.font = '14px ' + GAME_FONT;
  ctx.fillText('No powers yet', W - 40, invY + 18);
}

ctx.textAlign = 'left'; // reset
```

### Visual details:
- **Font size:** 14px (smaller than the choice cards, secondary info)
- **Position:** below the reroll text, ~100px under the cards — visible but not competing
- **Weapon colors:** each weapon shows in its own color (from WEAPON_TYPES[].color), matching the normal HUD
- **Howl colors:** each howl in its own color (from HOWL_TYPES[].color)
- **Empty slots:** shown in gray with □ symbol — reminds player they have room for new weapons
- **Max weapon slots:** shown so player knows capacity (e.g., 2/4 slots used)

---

## Acceptance Criteria

1. During the level-up upgrade menu, current weapons are listed on the bottom-left with name, level, and color
2. Current howls are listed on the bottom-right with name, stack count, and color
3. Empty weapon slots are shown (reminds player they have room)
4. Lists don't overlap with the choice cards or control prompts
5. Information is secondary (smaller font, below cards) — doesn't distract from the main choice
6. Reroll regenerates cards but the inventory lists stay (they show current state)

---

## Conflict Analysis

No conflicts. Adds ~25 lines to the upgrade menu rendering in hud.js. Read-only access to `s.weapons`, `s.howls`, `s.maxWeaponSlots`, `WEAPON_TYPES`, `HOWL_TYPES` — all already available in the HUD context.

---

## Estimated Complexity

XS (Trivial) — ~25 lines of HUD rendering code, all read-only state access.
