# BD-278: Item and howl rarity not visually obvious — needs border color + tier label

**Date:** 2026-02-28
**Source:** Manual playthrough — when items and howls are presented (level-up menu, pickup notifications, HUD), there is no clear visual indicator of their rarity tier. Players can't quickly distinguish a common drop from a legendary one.

---

## P1 — UX / Readability

---

### BD-278: Add rarity border colors and tier descriptor labels to items and howls

**Category:** UX (visual clarity)
**Priority:** P1
**File(s):** `js/3d/hud.js` (level-up menu rendering, item display, howl display), `js/3d/constants.js` (ITEM_RARITIES for reference)

**Current Behavior:**
Items and howls are presented with their name and stats but lack a quick visual rarity indicator. Players have to read descriptions to understand relative value. In the heat of gameplay, this is impractical.

**Expected Behavior:**
Each item and howl should display:
1. **A colored border/frame** matching its rarity tier (e.g., white=common, green=uncommon, blue=rare, purple/gold=legendary)
2. **A rarity descriptor label** (e.g., "Common", "Uncommon", "Rare", "Legendary") displayed near the item name

This should apply everywhere items/howls appear:
- Level-up menu choices
- Pickup floating text / fanfare
- HUD inventory display
- Any comparison or selection UI

**Reference:**
`ITEM_RARITIES` in `js/3d/constants.js` already defines 4 tiers with associated colors. These should be leveraged for the border colors.

---

## Acceptance Criteria

1. All items display a colored border matching their rarity tier
2. All items display a text label with their rarity name (Common/Uncommon/Rare/Legendary)
3. All howls display rarity indicators (if howls have rarity tiers; if not, they should get them)
4. Rarity colors are distinct and readable against the HUD background
5. Visual treatment is consistent across all UI contexts (menus, HUD, notifications)
6. Kid-friendly and readable at a glance (target audience 7+)

---

## Estimated Complexity

M (Medium) — HUD rendering changes across multiple UI contexts, referencing existing rarity data.
