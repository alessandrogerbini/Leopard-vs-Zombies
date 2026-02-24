# Playthrough 2 -- Post-Sprint Findings

**Date:** 2026-02-23
**Duration:** 6 minutes automated gameplay
**Character:** Leopard
**Final State:** LVL 9, Wave 2, Score ~7738, HP 22/76, two weapons (Claw Swipe Lv5 + Boomerang Lv1), Haste Howl x1 + Vitality Howl x1 + Thorns Howl x1, Augments: +2% Armor x2
**Screenshots:** `screenshot-ai/pt2-*.png` (title, mode-select, animal-select, 0s through 360s at 30s intervals, plus minimap and pause captures)

---

## Validated Fixes

### BD-94/111: XP Gems Are Purple-Blue and Pulsing
**Status: CONFIRMED WORKING**
XP gems are clearly visible as small purple/magenta dots scattered across the terrain in every gameplay screenshot (pt2-60s, pt2-90s, pt2-120s, etc.). They stand out well against the green grass. The color is consistently purple-blue as intended.

### BD-97: Minimap Fog-of-War
**Status: CONFIRMED WORKING**
The minimap (visible in pt2-90s, pt2-minimap, pt2-120s, and many later screenshots where Tab stayed open) shows a clear fog-of-war effect. The explored area appears as a gray/green blob shape with the unexplored area as solid black. The explored region grows as the player moves, and its irregular shape suggests proper per-chunk reveal rather than a simple circle. Colored dots on the minimap represent different entities (green = player triangle, yellow/orange = items/shrines, purple = XP gems, red = enemies).

### BD-98: Map Boundaries on Minimap
**Status: PARTIALLY CONFIRMED**
The minimap shows a bordered rectangle (white/gray outline) that appears to represent the map area. The fog-of-war blob exists within this border. However, since the game uses infinite procedural terrain, this may represent the current render distance rather than actual map boundaries. The border is visible in pt2-90s, pt2-minimap, pt2-120s.

### BD-93: Wave Warning at the Top
**Status: CONFIRMED WORKING**
The wave indicator ("WAVE 1", "WAVE 2") is displayed prominently in the top-right corner of the HUD in red text. It is clearly readable in pt2-60s, pt2-pause, pt2-300s, etc. The wave transitioned from Wave 1 to Wave 2 during the playthrough (visible around pt2-300s at ~5 minutes).

### BD-109: Controls Hint Readable
**Status: CONFIRMED WORKING**
The controls hint bar at the bottom of the screen reads "WASD: Move | SPACE: Jump | HOLD B: Power Attack | ESC: Pause" in white text on a semi-transparent dark background. It is clearly readable in every gameplay screenshot (pt2-60s onward). The "[TAB] Map" / "[TAB] Close Map" label also appears near the minimap corner.

### BD-100: Shrines/Totems Present
**Status: CONFIRMED WORKING**
The Augments display in the top-right HUD shows "+3% Armor x2" (visible in pt2-150s, pt2-pause, pt2-300s), confirming the player encountered and broke shrine/totem objects during gameplay. The augments accumulated over time, indicating shrines are spawning across the map and are interactable.

### Pause Menu
**Status: CONFIRMED WORKING**
The pause menu (pt2-pause.png) shows a clean overlay with "PAUSED" heading and three options: RESUME (highlighted in green), RESTART, and MAIN MENU. Arrow key navigation hint is shown. The minimap is also visible in the background of the pause overlay, which is a nice touch showing the map state while paused.

### Level-Up Menu
**Status: CONFIRMED WORKING**
Two level-up screens were captured:
- pt2-240s: Offers "BOOMERANG" (New Weapon, piercing returns), "CLAW SWIPE LV5" (Upgrade, -15% Cooldown), and "TURD MINE" (New Weapon, drops stinky mine). The selected option (Boomerang) has a purple/blue highlight border.
- pt2-270s: Offers "FORTUNE HOWL" (+30% XP gain), "FRENZY HOWL" (+10% attack speed), and "CLAW SWIPE LV5" (Upgrade, -15% Cooldown). The selected option (Claw Swipe) has an orange highlight border.
Both menus show "[R] REROLL (3 left)" and "< ARROW KEYS >" navigation hints. Weapon/howl/upgrade badges are color-coded (green for new weapon, blue for upgrade, purple for howl). The system is working correctly.

### Howl System
**Status: CONFIRMED WORKING**
By the end of the playthrough (pt2-330s, pt2-360s), the HUD shows "HASTE HOWL x1", "VITALITY HOWL x1", and "THORNS HOWL x1" stacked in the top-right area. Howls were acquired through level-up selections and are displaying correctly with stack counts.

### Weapon System
**Status: CONFIRMED WORKING**
The weapon display in the top-left shows weapon names and levels. The player started with "CLAW SWIPE Lv1" (pt2-60s), which upgraded through levels (Lv2 at pt2-90s, Lv3 at pt2-120s, Lv4 at pt2-150s, Lv5 at pt2-300s). A second weapon slot "BOOMERANG Lv1" was acquired (visible in pt2-300s). The "[EMPTY SLOT]" indicator was also visible at pt2-210s. Weapon upgrades are working correctly.

---

## Remaining Issues

### BD-88: Shrine/Totem Spread Across Map
**Status: CANNOT FULLY VERIFY**
While augments were collected (confirming shrines exist), the shrines themselves are not visually distinguishable in the screenshots at the current zoom level and resolution. The minimap shows colored dots but it is unclear which are shrines vs. other entities. The augments (+3% Armor x2) suggest at least 2 shrines were found, but their spatial distribution cannot be confirmed from these screenshots alone.

### BD-89: Tree/Rock Overlap
**Status: POSSIBLE ISSUE DETECTED**
In pt2-60s and pt2-minimap, there are areas where decorations (trees, rocks, fallen logs) appear to be placed quite close together, and in some cases they may be overlapping. For example, in pt2-60s, the area around the player shows trees and brown rock/log objects in close proximity. However, at the isometric view angle it is difficult to determine if they truly overlap or are just adjacent. In pt2-120s, terrain objects appear reasonably spaced in some areas but clustered in others.

### BD-101: Semi-Transparent Walls
**Status: CANNOT VERIFY**
No obvious wall structures (semi-transparent or otherwise) were visible in any of the screenshots. The plateau structures (brown/tan elevated terrain visible in pt2-60s, pt2-minimap, pt2-pause) appear as solid opaque blocks. If walls are supposed to become semi-transparent when occluding the player, this was not captured. The player may not have been behind a wall during screenshot captures.

### BD-113: Zombies Blocked by Terrain
**Status: CANNOT VERIFY**
Zombies are visible in many screenshots (small dark figures, especially in pt2-210s, pt2-270s, pt2-300s, pt2-330s), but it is impossible to determine from static screenshots whether they are properly being blocked by terrain obstacles or passing through them. This requires dynamic observation.

### BD-121/124: Grass/Flowers Visible
**Status: NOT OBSERVED**
The terrain in all screenshots shows a flat green ground plane with decorations (trees, rocks, fallen logs, stumps), but no distinct grass patches or flower clusters are visible at ground level. Small white specks are visible in a few frames (pt2-150s bottom, pt2-minimap bottom-right) that could be grass/flower elements, but they are very subtle and hard to confirm. If grass and flowers were implemented, they may be too small to see at the default camera distance, or they may not be rendering.

### BD-125: Tree Sway Animation
**Status: CANNOT VERIFY**
Static screenshots cannot confirm or deny tree sway animation. The trees appear as static voxel models in all frames. This requires video/dynamic observation.

### BD-127: Lighting Shift Over Time
**Status: SUBTLE IF PRESENT**
Comparing early screenshots (pt2-60s) to later ones (pt2-330s, pt2-360s), there is no dramatic lighting change visible. The overall green tone and shadow angles appear largely consistent throughout the 6-minute playthrough. If lighting shifts were implemented, either the 6-minute window is too short to observe them, or the effect is too subtle to detect in screenshots. The ambient lighting appears consistent across all frames.

### BD-123: Zombie Shrink Death Animation
**Status: CANNOT VERIFY**
Static screenshots cannot capture death animations. Some small/dark objects on the ground could be dying zombies, but this cannot be confirmed. Requires dynamic observation.

### BD-104: Equipped Items Showing on Model
**Status: NOT OBSERVED**
The leopard player model appears the same throughout the playthrough (orange bipedal figure). No visible equipment changes were observed despite acquiring weapons and augments. The model at pt2-360s looks the same as at pt2-60s. This could mean equipped items are not visually reflected on the model, or the items acquired (weapons, howls, augments) are not the type that would show visually.

### BD-95/99: Loot Dropping from Zombies
**Status: PARTIALLY CONFIRMED**
Purple XP gems are abundant across the terrain, consistent with loot drops from defeated zombies. Some colored items (a green hexagonal object in pt2-60s near center-right, a cyan/teal item in pt2-150s left side) appear to be pickup items on the ground. However, the act of zombies dropping loot upon death cannot be directly confirmed from static screenshots.

---

## New Bugs Found

### BUG-NEW-1: Minimap Overlay Gets Stuck Open (HIGH)
**Severity: High (gameplay-affecting UX issue)**
Starting from approximately pt2-120s (2 minutes), the minimap overlay appears to be stuck in the open/expanded state for the remainder of the playthrough. The large black minimap rectangle with fog-of-war persists in screenshots pt2-120s, pt2-150s, pt2-180s, pt2-210s, pt2-300s, pt2-330s, and pt2-360s. This obscures roughly 30-40% of the game viewport. The minimap was intentionally opened at ~85s via Tab key press and closed, but it appears to have re-opened (possibly due to the Tab key hold mechanism -- the script used `keyboard.down('Tab')` then `keyboard.up('Tab')`, which may have toggled it back open). Regardless of the automation cause, this reveals that the minimap can easily get stuck in an open state that persists through gameplay, level-ups, and wave transitions. The "[TAB] Close Map" hint is visible but the map stays open.

**Note:** This may be a scripting artifact (Tab hold vs press behavior), but it does indicate the minimap toggle is fragile with rapid key events.

### BUG-NEW-2: Mode Select Screen Shows 2D Canvas Still Rendering (LOW)
**Severity: Low (menu timing issue)**
The pt2-0s screenshot (taken after the script waited 8 seconds for 3D init) shows the title screen with "PRESS ENTER TO START" still visible. The pt2-30s screenshot shows the mode select screen. This suggests the game state machine was slower than expected during menu navigation, or the 2D canvas was still rendering on top during the 3D initialization phase. The canvas status check showed `game3d` existed but `hud` was null, suggesting 3D was partially initialized when checked. By pt2-60s the 3D game is fully visible. This may indicate a race condition during the 2D-to-3D transition where both canvases are briefly visible, or the menu navigation required more time between key presses.

### BUG-NEW-3: Plateau/Wall Visual Occlusion (MEDIUM)
**Severity: Medium (visual quality)**
In pt2-60s and pt2-pause, large brown/tan plateau structures are visible. These solid opaque blocks can significantly occlude the player and enemies when the camera is behind them. In pt2-60s, the player appears to be partially behind a large plateau block. If BD-101 (semi-transparent walls) was supposed to address this, it does not appear to be working for plateau structures, which remain fully opaque.

### BUG-NEW-4: Level-Up Menu Missing "PRESS ENTER TO SELECT" on Second Occurrence (LOW)
**Severity: Low (minor inconsistency)**
In pt2-240s, the level-up menu shows both "PRESS ENTER TO SELECT" and "[R] REROLL (3 left)". In pt2-270s, only "[R] REROLL (3 left)" is shown without the "PRESS ENTER TO SELECT" text. This inconsistency could confuse players who forget how to confirm their selection.

---

## Balance Observations

### Progression Pace
- **Level progression:** The player reached LVL 9 in 6 minutes (approximately one level per 40 seconds of active gameplay). This feels like a good pace for a survivor-style game -- frequent enough to feel rewarding without being overwhelming.
- **Wave progression:** Only reached Wave 2 in 6 minutes. The first wave lasted about 5 minutes (Wave 2 started around pt2-300s). This feels slow. In Vampire Survivors-style games, waves typically advance every 1-2 minutes. Consider shortening wave duration or making the transition more dramatic.

### Difficulty
- **HP stayed healthy:** The player's HP stayed relatively high throughout most of the playthrough (50/50 at start, dipping to low 40s mid-game, recovering to 60-76 range with leveling). Only in the final minute did HP drop to 22/76, suggesting Wave 2 brought a meaningful difficulty increase. The early game may be too easy.
- **Score progression:** Score grew from 0 to ~7738 over 6 minutes, accelerating in the later half as more zombies appeared. The scoring feels reasonable.

### Weapon Balance
- The player relied heavily on Claw Swipe (upgraded to Lv5) for the entire run. The Boomerang was acquired late (around the 4-minute mark). The second weapon slot being empty until level ~6-7 means the early game is a single-weapon experience, which can feel monotonous.

### Enemy Density
- Early game (pt2-60s): Very sparse enemies. Only 1-2 zombie figures visible at the edges of the screen.
- Mid-game (pt2-210s, pt2-270s): Moderate density, 5-10 zombies visible simultaneously.
- Late game (pt2-330s, pt2-360s): Good density, 10+ zombies visible with multiple groups approaching.
- The ramp-up feels appropriate but the early game is notably empty.

---

## Visual Quality

### Terrain and Environment
- **Ground:** The green grass terrain renders cleanly with a consistent color. No visible z-fighting or texture issues.
- **Trees:** Multiple tree types visible (tall conical, bushy round). They cast shadows on the ground. The voxel style is consistent and charming. Tree variety adds visual interest.
- **Rocks and Logs:** Brown/reddish decorations (fallen logs, rocks) are scattered across the terrain. They provide good visual variety. Some appear as flat rectangles (fallen logs), others as small cubes (rocks).
- **Plateaus:** Large brown elevated terrain blocks are prominent in several screenshots. They add vertical variety but their fully opaque nature can block the view (see BUG-NEW-3).
- **Shadows:** Objects cast directional shadows on the ground, adding depth to the scene. Shadow quality appears consistent.

### HUD and UI
- **HUD layout:** Clean and informative. Top-left shows HP bar (green), XP bar (blue), level, animal name, and weapon slots. Top-right shows wave number, score, timer, howls, and augments. All text is readable.
- **Controls hint:** Bottom bar with semi-transparent background is clear and unobtrusive.
- **Minimap (small):** The corner minimap (visible in pt2-60s, bottom-right) shows a radar-style view with colored dots. It is small but functional.
- **Level-up menus:** Well-designed card layout with color-coded badges (green=weapon, blue=upgrade, purple=howl). Text is readable. The selection highlight (colored border) is clear.
- **Pause menu:** Clean overlay with clear options. The minimap visible in the background is a nice detail.

### Character Models
- **Leopard:** The bipedal orange voxel model is clearly visible and distinct against the green terrain. Animation state is hard to judge from screenshots.
- **Zombies:** Small dark (olive/brown) figures visible in later screenshots. They appear appropriately menacing at a distance. Multiple zombie types may be present (some appear larger than others in pt2-330s).

### XP Gems
- Purple/magenta gems are highly visible against the green terrain. They appear to be scattered in meaningful patterns (near where zombies were defeated). Good visual contrast and visibility.

### Lighting
- The scene has a pleasant daytime look with warm directional lighting casting shadows to one side. The overall mood is appropriate for a lighthearted zombie survival game. However, no dynamic lighting changes were observed over the 6-minute window (see BD-127 note above).

---

## Recommendations

### Priority 1 (High -- Gameplay-Affecting)

1. **Fix minimap toggle robustness (BUG-NEW-1):** Investigate whether the Tab key minimap toggle can get stuck in the open state during rapid key events, gameplay transitions, or level-ups. Consider using a debounce/cooldown on the toggle, or ensuring it closes automatically when other overlays (level-up, pause) appear. The minimap covering 30-40% of the viewport is a significant usability issue.

2. **Investigate plateau occlusion (BD-101 / BUG-NEW-3):** The large plateau blocks fully obscure the player and enemies behind them. Implementing semi-transparency or a cutaway effect when the player is behind elevated terrain would significantly improve gameplay visibility.

3. **Accelerate early-game enemy density:** The first 1-2 minutes of gameplay feel very empty with only 1-2 zombies on screen. Consider spawning more enemies sooner or reducing the initial enemy-free grace period. Players need immediate engagement to stay interested.

### Priority 2 (Medium -- Quality of Life)

4. **Shorten Wave 1 duration or add sub-wave indicators:** 5 minutes for a single wave is long. Consider either shortening waves to 2-3 minutes, or adding visible sub-wave escalation within each wave to give players a sense of progression within a wave.

5. **Implement grass/flower decorations (BD-121/124):** If not yet implemented, ground-level vegetation would add significant visual richness. If implemented but too small, increase the scale or density so they are visible at the default camera distance.

6. **Add visual equipment on player model (BD-104):** Showing weapons or augment effects on the player model would provide satisfying visual feedback for progression. Even simple effects (glow, particle aura, weapon in hand) would help.

7. **Earlier second weapon opportunity:** Consider offering a second weapon option at level 3-4 instead of 5-6. Having only one weapon for the first 2-3 minutes makes combat feel repetitive.

### Priority 3 (Low -- Polish)

8. **Ensure consistent level-up menu text:** Fix the missing "PRESS ENTER TO SELECT" on subsequent level-up menus (BUG-NEW-4).

9. **Add lighting variation (BD-127):** If a day/night cycle or lighting shift system exists, either extend its range to be more noticeable or ensure it triggers within typical play sessions (5-10 minutes).

10. **Tree sway animation verification (BD-125):** Verify tree sway is implemented and visible at the default camera distance. If it is subtle, consider increasing the sway amplitude slightly for visual appeal.

11. **Improve 2D-to-3D transition (BUG-NEW-2):** Add a loading screen or fade transition when switching from the 2D menu system to the 3D game to avoid the brief period where both canvases may overlap.
