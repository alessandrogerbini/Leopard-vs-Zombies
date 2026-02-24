# BD-149: Kid Readability Audit

**Date:** 2026-02-24
**Target user:** Julian, age 7 (~3rd grade reading level, sitting 2-3 feet from monitor)
**Scope:** All HUD text, floating text, menus, minimap, game-over screen in 3D Roguelike Survivor mode

---

## Summary

The HUD was built for adult gamers. Julian is being asked to parse a dense Courier New monospace display with 15+ simultaneous information zones, tiny font sizes (9-16px), low-contrast colors, and RPG terminology he cannot read or understand. The game is playable because the action is intuitive, but the HUD is actively working against him.

---

## CRITICAL — Julian literally cannot see/read this

### C-1. Controls hint is invisible

**Problem:** The controls bar at the bottom of the screen uses 14px Courier New at 50% opacity white on a 40% opacity black strip. This is functionally invisible at 2-3 feet. The text reads `WASD: Move | SPACE: Jump | HOLD B: Power Attack | ESC: Pause` — a string so long it would challenge an adult to parse in a glance.

**Where:** `js/3d/hud.js` lines 361-372

**Fix:**
- Increase font to `bold 20px` and opacity to `0.85`
- Shorten to icon-style hints: `WASD Move | SPACE Jump | B Attack`
- Remove ESC hint (Julian does not need to know about ESC mid-action)
- Better yet: show controls hint only for the first 30 seconds of a run, then fade it out

**Why:** Julian needs to learn controls. If he cannot read them, Uncle Sandro has to teach him verbally every time. That defeats the purpose.

---

### C-2. Volume/mute indicator is unreadable

**Problem:** The volume indicator in the bottom-right uses **12px** Courier New at **35% opacity** white, with an additional 9px sub-label at 20% opacity. At 2-3 feet, 9px text is physically impossible for a child to read.

**Where:** `js/3d/hud.js` lines 312-324

**Fix:**
- Increase to `bold 16px` at 70% opacity minimum
- Remove the `[M] mute` sublabel entirely — Julian does not need keyboard shortcut hints cluttering the screen
- Consider a simple speaker icon (drawn with canvas lines) instead of text

**Why:** 9px text is below the threshold of readability even for adults at monitor distance. For a 7-year-old it is nonexistent.

---

### C-3. Minimap label is too small and cryptic

**Problem:** The minimap label uses `bold 10px monospace` and reads `[TAB] Map` or `[TAB] Close Map`. At 10px, this is invisible to Julian. The minimap itself is 120px square — tiny dots of red, blue, yellow, and purple are nearly indistinguishable at that size.

**Where:** `js/3d/hud.js` lines 534-538 (label), lines 374-539 (minimap)

**Fix:**
- Increase label font to `bold 14px`
- Make enemy dots larger (minimum radius 2.5 instead of tier-scaled 1.5)
- Consider adding a thin white border around the minimap for visibility
- Player triangle should be at least 6px tall instead of 4px

**Why:** The minimap is a powerful navigation tool but Julian cannot use it if the dots are sub-pixel sized. A 7-year-old needs bigger, bolder shapes.

---

### C-4. Game-over kill breakdown is micro-text

**Problem:** The tier kill breakdown uses **11px** Courier New in color `#aa6633` (muted brownish-orange). Tier names like "Shambler," "Lurcher," "Bruiser," "Ravager," "Abomination," "Nightmare" — these are advanced vocabulary a 7-year-old cannot read. The "Strongest Kill" line uses **12px** bold. The entire stats section compresses 6-8 lines into a 14px line-height block.

**Where:** `js/3d/hud.js` lines 854-882

**Fix:**
- Increase kill breakdown font to `bold 14px` minimum
- Replace tier names with kid-friendly labels: "Tiny Zombie," "Big Zombie," "Huge Zombie," "MEGA Zombie" (requires changes in `js/3d/constants.js` ZOMBIE_TIERS)
- Or simply show total kills in a big font and skip the per-tier breakdown entirely — Julian does not care about tier analytics
- Change color from `#aa6633` to `#ffaa44` for better contrast on the dark overlay

**Why:** The game-over screen should make Julian feel "WHOA I killed 200 zombies!" not "here is a data table." He cannot read "Abomination" or "Ravager."

---

### C-5. Leaderboard table is adult-density data

**Problem:** The leaderboard header `RANK   NAME        SCORE   ANIMAL    LVL  WAVE  TIME` is drawn in **14px** Courier New color `#888` on dark background. Each row packs 7 columns of padded monospace data. The alignment assumes precise character widths. At 14px Courier New, this is a spreadsheet, not a kid-friendly scoreboard.

**Where:** `js/3d/hud.js` lines 934-956

**Fix:**
- Show only top 5, not top 10 (less data to process)
- Show only 3 columns: RANK, NAME, SCORE
- Increase font to `bold 18px` for entries, `bold 16px` for header
- Use gold/silver/bronze colors for ranks 1/2/3 (already partially done for rank 1)
- Drop the ANIMAL, LVL, WAVE, TIME columns — Julian does not care about those stats

**Why:** Julian wants to see "Am I #1?" He does not need a pivot table.

---

### C-6. Feedback section uses tiny text and abstract questions

**Problem:** "Would you play again?" is drawn at **13px bold**. The response options are 12-14px. The follow-up "What was your most fun moment? (Tell us on Discord!)" is **11px** `#666` — barely visible. Julian cannot read "Discord" and does not know what it means.

**Where:** `js/3d/hud.js` lines 892-916

**Fix:**
- Increase feedback question to `bold 20px`
- Change question to kid-friendly: "Was that FUN?" with YES / KINDA / NAH
- Remove Discord reference entirely — a 7-year-old should not be directed to Discord
- Increase option text to `bold 18px`

**Why:** If you want Julian's feedback, ask in his language, at a size he can see.

---

## HIGH — Julian might miss this important info

### H-1. HP bar text is too small relative to its importance

**Problem:** The HP bar is 200x24px with **bold 16px** Courier New text reading `HP: 87/100`. The bar itself is color-coded (green/orange/red) which is good, but the numeric readout is hard to parse at 16px from 2-3 feet. Julian may not understand the fraction format.

**Where:** `js/3d/hud.js` lines 75-81

**Fix:**
- Increase HP text to `bold 20px`
- Increase bar height to 30px
- Replace `HP: 87/100` with just the number and a heart icon, or remove the numeric entirely and let the color bar speak for itself
- Add a pulsing red border when HP drops below 25% to create urgency without requiring reading

**Why:** HP is the most important number in the game. It needs to be the most visible. The color-coding is excellent; lean into it harder and reduce text reliance.

---

### H-2. XP bar is visually secondary but functionally confusing

**Problem:** The XP bar is 200x18px with **bold 14px** text reading `XP: 23/50`. At 14px, this is small. "XP" is gamer jargon a 7-year-old may not understand. The blue fill is good visual feedback, but the text competes with it.

**Where:** `js/3d/hud.js` lines 84-90

**Fix:**
- Increase to 200x22px with `bold 16px` text
- Consider removing the numeric text entirely — the fill bar communicates progress visually
- Or replace "XP" with a star icon drawn in canvas

**Why:** Julian can see "the blue bar is filling up" without reading. The text is redundant noise.

---

### H-3. Floating damage numbers overlap and spam

**Problem:** Floating texts are rendered at `bold 18px` Courier New, which is a decent size, but the system spawns them aggressively. In late game (visible in screenshot 2), the center of the screen is a chaotic soup of overlapping text: damage numbers, "+XP," "BOOM!," item names, combo counts. The MAX_FLOATING_TEXTS cap is 15, but even 15 overlapping texts at the player position creates visual noise.

**Where:** `js/3d/hud.js` lines 228-239 (rendering), `js/game3d.js` lines 466-503 (spawning), lines 5632-5636 (update/fade)

**Fix:**
- Reduce MAX_FLOATING_TEXTS from 15 to 8
- Increase the dedup window from 0.3s to 0.6s
- Make non-important texts ("+XP", damage numbers) use a smaller font (14px) and shorter life (0.3s)
- Reserve the full 18px bold for important texts only (item pickups, boss kills, combo milestones)
- Add horizontal spread: offset each new text by random +-30px on screen X to reduce stacking

**Why:** Screenshot 2 shows the mid-to-late game reality: the center of the screen is unreadable text soup. Julian's eyes glaze over and he ignores all floating text. The important messages ("BOSS DEFEATED!", item names) get lost in the noise.

---

### H-4. Weapon slot bars have tiny text and are visually dense

**Problem:** Weapon slot bars are 140x20px with **bold 14px** text showing names like `BEEHIVE LAUNCHER Lv3`. At 14px, "BEEHIVE LAUNCHER" barely fits, and "Lv3" is cryptic. Empty slots show `[EMPTY SLOT]` in 14px `#444` — nearly invisible against the dark background.

**Where:** `js/3d/hud.js` lines 98-121

**Fix:**
- Increase bar size to 160x24px with `bold 16px` text
- Shorten weapon names for display: "BEEHIVE" instead of "BEEHIVE LAUNCHER", "LIGHTNING" instead of "LIGHTNING BOLT"
- Replace "Lv3" with 3 small star icons or dots
- Change empty slot text from `[EMPTY SLOT]` to a brighter color (`#666`) or use a dashed border instead

**Why:** Julian needs to know "what weapons do I have?" at a glance. He cannot read "BEEHIVE LAUNCHER Lv3" at 14px while also playing the game.

---

### H-5. Equipped items list is a wall of tiny bracketed text

**Problem:** The bottom-left items list uses **15px** Courier New for every item, stacked vertically with 18px spacing. In late game (screenshot 2), this becomes 10-15 lines of `[ITEM NAME]` or `[ITEM NAME x3]` text, consuming the entire left side of the screen. Colors vary by rarity but are still small text on transparent background.

**Where:** `js/3d/hud.js` lines 168-225

**Fix:**
- Show only the 5 most recently acquired items, or items with active effects
- Increase font to `bold 16px` with slightly wider spacing (20px)
- Use colored dots/squares instead of brackets: a gold square followed by "GOLDEN BONE" reads faster than `[GOLDEN BONE]`
- Or collapse to a compact icon grid (colored squares representing items) with a tooltip on hover/pause
- Consider moving this to the pause menu entirely — Julian does not need to see his full inventory during combat

**Why:** Screenshot 2 shows the left side of the screen is an unreadable wall of green, blue, orange, and white bracketed text. Julian cannot parse it during gameplay and it blocks his view of enemies approaching from the left.

---

### H-6. Wave warning text is positioned too high

**Problem:** The "WAVE X INCOMING" warning appears at `y=90` with a countdown at `y=125`, both center-aligned. The font sizes are good (28px and 36px) and the red color is attention-grabbing. However, at y=90 this overlaps with the HP/XP bar area on smaller screens. The red screen overlay at 6% opacity is very subtle.

**Where:** `js/3d/hud.js` lines 142-153

**Fix:**
- Move to center of screen vertically: `y = H * 0.35` and countdown at `y = H * 0.45`
- Increase red overlay from 6% to 12% opacity — subtle is bad for a 7-year-old
- Add a screen-edge pulse effect (alternating red border) for extra urgency
- These font sizes (28px, 36px) are good — keep them

**Why:** Wave warnings are critical game events. Julian needs to know "something big is coming." The current positioning competes with the top-left HUD cluster.

---

### H-7. Active powerup indicator is tiny and top-center

**Problem:** The active powerup name is drawn at `bold 14px` at `y=25` with a 120x6px timer bar below it. At 14px, "BERSERKER RAGE (12s)" is hard to read. The timer bar at 6px height is nearly invisible. Julian likely never notices when he has an active powerup.

**Where:** `js/3d/hud.js` lines 156-166

**Fix:**
- Increase name to `bold 20px`
- Increase timer bar to at least 150x12px
- Move slightly lower (y=40) to avoid browser tab bar proximity
- Add a colored screen-edge glow matching the powerup color while active

**Why:** Powerups are exciting! Julian should feel "I have SUPER POWERS right now!" The current implementation is a footnote he cannot read.

---

## MEDIUM — Confusing but not game-breaking

### M-1. Upgrade menu descriptions use RPG jargon

**Problem:** Upgrade card descriptions like "+15% all weapon damage," "-15% all cooldowns," "+1 projectile count," "Reflect 10% contact damage" are written for adult RPG players. Julian does not understand percentages, "cooldowns," "projectiles," "contact damage," or "multiplicative." The descriptions are drawn at **14px** `#cccccc` with word-wrapping.

**Where:** `js/3d/hud.js` lines 720-735 (rendering), `js/3d/constants.js` lines 163-174 (howl descs), lines 69-135 (weapon descs)

**Fix:**
- Rewrite all descriptions for a 7-year-old:
  - "AoE arc slash" -> "Slash everything close!"
  - "+15% all weapon damage" -> "Hit harder!"
  - "-15% all cooldowns" -> "Attack faster!"
  - "+1 projectile count" -> "Shoot more stuff!"
  - "+20 max HP & heal" -> "More hearts!"
  - "+30% XP gain" -> "Level up faster!"
  - "Reflect 10% contact damage" -> "Hurt them back!"
  - "+25% pickup radius" -> "Grab stuff easier!"
  - "+10% attack speed" -> "Attack faster!"
  - "+8% max HP, +2 HP/s regen" -> "Tougher and heal!"
- Increase description font to `bold 16px`
- Consider adding a simple color-coded effect preview (sparkle animation on the card)

**Why:** The upgrade menu is a critical game moment — Julian is choosing his build. If he cannot understand the options, he picks randomly. That is not fun, it is frustrating.

---

### M-2. Category badges on upgrade cards are small and jargon-heavy

**Problem:** Category badges ("NEW WEAPON," "UPGRADE," "HOWL," "HEAL") are drawn at **bold 14px** with transparent color backgrounds. "HOWL" is game-specific jargon. "UPGRADE" is abstract. Only "HEAL" is intuitive.

**Where:** `js/3d/hud.js` lines 706-714

**Fix:**
- Increase badge font to `bold 16px`
- Rename categories: "NEW WEAPON" -> "NEW!" (with weapon icon), "UPGRADE" -> "BETTER!", "HOWL" -> "POWER!", "HEAL" -> "HEAL!"
- Make badge backgrounds more opaque (change `'44'` suffix to `'88'`)

**Why:** Julian needs to quickly understand "this gives me something new" vs. "this makes something I have better" vs. "this heals me." The current badges are too small and too abstract.

---

### M-3. Howl counts on right side are confusing

**Problem:** Howls are displayed as `POWER HOWL x3` at **16px** on the right side of the screen. The word "HOWL" is repeated for every entry. Julian sees a stack of colored text that means nothing to him.

**Where:** `js/3d/hud.js` lines 248-257

**Fix:**
- Remove "HOWL" from display names: just show "POWER x3" or "HASTE x2"
- Add a section header: "YOUR POWERS:" at bold 16px
- Consider using colored squares/dots instead of text for compact display
- Increase font to `bold 18px`

**Why:** The right side of the screen becomes a column of "X HOWL x2, Y HOWL x1, Z HOWL x3" that Julian cannot parse. He needs to see "I have powers and they are strong."

---

### M-4. Augment section header and labels are small

**Problem:** The "AUGMENTS" header and individual augment names (like "+5% Max HP x2") are at **16px** and use RPG-stat language Julian cannot understand.

**Where:** `js/3d/hud.js` lines 259-274

**Fix:**
- Rename "AUGMENTS" to "BONUSES" or "BOOSTS"
- Simplify augment display names in `js/3d/constants.js` SHRINE_AUGMENTS: "+5% Max HP" -> "Tougher!", "+5% Damage" -> "Stronger!"
- Or collapse to a single line: "BOOSTS: 5" showing total count

**Why:** "Augments" is a word Julian cannot read or understand. He just needs to know "I have bonus stuff."

---

### M-5. Charge shrine menu shows rarity labels Julian cannot read

**Problem:** The shrine activation menu shows "COMMON SHRINE," "UNCOMMON SHRINE," "RARE SHRINE," "LEGENDARY SHRINE" — rarity tier names that are gaming jargon. The upgrades offered ("+3% Move Speed," "+0.3 HP/s Regen") use the same percentage-based RPG language as other menus.

**Where:** `js/3d/hud.js` lines 766-824, `js/3d/constants.js` lines 346-378

**Fix:**
- Replace rarity labels with kid-friendly alternatives: "SMALL SHRINE," "COOL SHRINE," "AWESOME SHRINE," "MEGA SHRINE"
- Or rely on color-coding alone (already present) and drop the rarity word
- Simplify upgrade descriptions (same fixes as M-1)

**Why:** "Uncommon" and "Legendary" are reading-level barriers. Color-coding already communicates rarity better than words for a 7-year-old.

---

### M-6. Reroll text is subtle and confusing

**Problem:** The reroll indicator `[R] REROLL (2 left)` is drawn at **bold 14px** `#88ccff`, and when depleted shows `No rerolls remaining` at **14px** `#444` (nearly invisible). "REROLL" is not in a 7-year-old's vocabulary.

**Where:** `js/3d/hud.js` lines 756-762

**Fix:**
- Change text to "Press R for NEW CHOICES! (2 left)"
- Increase to `bold 18px`
- When depleted, either hide entirely or show very briefly then fade

**Why:** Julian might enjoy rerolling if he knew it existed. "REROLL" is opaque; "NEW CHOICES" is clear.

---

### M-7. "PRESS ENTER TO SELECT" flashes on and off

**Problem:** The confirm prompt flashes using `Math.sin(Date.now() * 0.005) > 0`, which means it is invisible 50% of the time. A 7-year-old looking at the screen at the wrong moment will not see it.

**Where:** `js/3d/hud.js` lines 751-754

**Fix:**
- Change to a gentle pulse (always visible, but brightness oscillates) instead of full on/off blinking
- Example: `const alpha = 0.6 + 0.4 * Math.sin(Date.now() * 0.005)` — always at least 60% visible
- Increase to `bold 22px`

**Why:** Blinking text that fully disappears is a usability antipattern. It was jarring in the 1990s and it is worse for a child.

---

### M-8. Pause menu option text is small relative to card size

**Problem:** Pause menu cards are 160x80px but the option labels ("RESUME," "RESTART," "MAIN MENU") are drawn at **bold 16px** centered in the card. That is a lot of empty card space with small text. The navigation hint `< ARROW KEYS >` at **14px** `#666` is nearly invisible.

**Where:** `js/3d/hud.js` lines 641-676

**Fix:**
- Increase option text to `bold 24px`
- Increase card size to 180x90px
- Change navigation hint to `bold 18px` at `#aaa` with clearer wording: "USE ARROWS + ENTER"

**Why:** The pause menu is one of the few moments where Julian is reading text, not playing. Make it count.

---

## LOW — Polish/nice-to-have

### L-1. Level display says "LVL" not "Level"

**Problem:** `LVL 12` at **bold 20px** `#ffcc00` is acceptable but "LVL" is an abbreviation. Julian can read "Level" but "LVL" looks like a random letter cluster.

**Where:** `js/3d/hud.js` line 94

**Fix:** Change to `Level ${s.level}` or keep as-is with bold yellow — the number communicates enough.

**Why:** Minor readability improvement. The yellow color and large font make this acceptable as-is.

---

### L-2. Score display says "SCORE:" redundantly

**Problem:** `SCORE: 38907` at **bold 18px** `#ffcc00` is fine but the colon-space format is adult-style formatting.

**Where:** `js/3d/hud.js` line 133

**Fix:** Consider just showing the number with a star icon, or keep as-is. This is already one of the more readable elements.

**Why:** Low priority. The score is visible and the yellow color helps.

---

### L-3. Item announcement banner description is small

**Problem:** When picking up an item, the center-screen announcement shows the item name at `bold 18px monospace` and description at `13px monospace`. The 13px description line is too small.

**Where:** `js/3d/hud.js` lines 974-1006

**Fix:**
- Increase description to `bold 16px`
- Increase banner height from 60px to 70px to accommodate

**Why:** Item pickups are exciting moments. Julian should be able to read what he got. The name is fine; the description is too small.

---

### L-4. FPS counter uses debug-style formatting

**Problem:** The FPS counter uses `E:142 G:38 T:12` format — completely opaque to Julian. But since it is toggled with backtick (a debug feature), this is acceptable.

**Where:** `js/3d/hud.js` lines 1008-1024

**Fix:** No change needed. This is a developer tool, not player-facing.

**Why:** Julian will never press backtick. This is fine.

---

### L-5. Courier New is not a kid-friendly font

**Problem:** Every piece of text in the HUD uses Courier New, a monospace typeface designed for code editors. It is narrow, has thin strokes, and lacks visual warmth. For a game about a leopard fighting zombies, it feels clinical.

**Where:** Every `ctx.font` call in `js/3d/hud.js`

**Fix:**
- Consider switching to a rounded sans-serif like `"Fredoka One", "Baloo 2", "Comic Sans MS", sans-serif` for HUD text
- Keep Courier New only for the leaderboard and technical displays
- This is a significant change that affects every text rendering call, so it should be a separate sprint item

**Why:** Font choice affects perceived difficulty. Rounded, thicker fonts feel friendlier and are easier for young readers to parse. This is a polish item that would significantly improve the overall feel.

---

## Screenshot Analysis

### Screenshot 1 (02:23:17) — Early/mid game

**What Julian sees first:** The red leopard character in the center. Good.
**What Julian sees second:** The bright magenta floating text near the player. Hard to read but eye-catching.
**What Julian sees third:** Green terrain with scattered enemies and objects.
**What is invisible:** The minimap in the bottom-right is nearly unnoticeable. The controls bar at the bottom is completely invisible. The weapon bars on the left are small but present. The howl/score section on the right is small text on a busy background.

### Screenshot 2 (02:33:58) — Late game, heavy action

**What Julian sees first:** CHAOS. Orange explosions, purple cubes everywhere, floating text overlapping in the center.
**What Julian sees second:** The left side of the screen is a wall of green/blue/orange item text from top to bottom — weapon bars and item list consume the entire left margin.
**What Julian sees third:** The right side has score, howls, and augments stacking up.
**What is invisible:** The actual gameplay. The character is buried under visual effects. The HP bar is present but small relative to the screen chaos. The bottom controls hint is completely invisible under the noise.
**Critical issue:** At this stage of the game, the HUD is consuming roughly 30-40% of the visible screen area with text Julian cannot read. The floating text soup in the center makes it hard to see enemies or the player character.

### Screenshot 3 (02:45:05) — Mid-late game with item pickup

**What Julian sees first:** The bright orange/yellow item announcement banner in the center: "HOT SAUCE BOTTLE" (readable at 18px bold).
**What Julian sees second:** Floating text around the player area: "POWERUP!", item names in gold, effect descriptions.
**What Julian sees third:** The left-side item and weapon list, now growing long.
**What is invisible:** The description line below "HOT SAUCE BOTTLE" in the announcement banner is too small. The augment section on the right side. The minimap.

---

## Priority Implementation Order

If tackling these in sprints, the recommended order based on impact:

1. **C-1 + C-2 + C-3** — Fix the invisible text (controls, volume, minimap label). Quick wins.
2. **M-1 + M-2** — Rewrite upgrade menu descriptions for a 7-year-old. High impact on gameplay decisions.
3. **H-3** — Reduce floating text spam. Biggest visual clutter source.
4. **H-1 + H-2** — Improve HP/XP bar readability. Core survival info.
5. **C-4 + C-5 + C-6** — Fix game-over screen readability. End-of-run experience.
6. **H-4 + H-5** — Improve weapon/item display. Quality of life.
7. **M-3 through M-8** — Medium fixes. Incremental polish.
8. **L-5** — Font change. Big effort, big reward, separate sprint.
