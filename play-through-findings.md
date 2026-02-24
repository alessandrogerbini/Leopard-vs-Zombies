# Leopard vs Zombies -- Automated Playthrough Findings

**Date:** 2026-02-23
**Method:** Playwright automated playthrough, ~6 minutes of 3D Survivor mode
**Character:** Leopard (default)
**Renderer:** SwiftShader (software WebGL via headless Chrome)
**Screenshots:** 19 captured across menus, gameplay, level-ups, and game over
**Final Stats:** Level 7, Wave 2 (started), Score 2356, 157 kills, survived 2m11s game-time

---

## 1. Bugs

### BUG-01: Mode Select screen not visually distinct from Title screen
**Screenshots:** playthrough-02-mode-select.png vs playthrough-01-title-screen.png
**Severity:** Medium
**Description:** After pressing Enter on the title screen, the game transitions to `modeSelect` state, but the screenshot (02) looks identical to the title screen -- there is no visible mode selection UI or indication that the user is now choosing between 2D Classic and 3D Survivor. The "PRESS ENTER TO START" text is not visible in screenshot 02. The mode select screen should show the two mode options (2D Classic / 3D Survivor) with a visual selector highlighting the current choice. It appears the title screen animation may blink "PRESS ENTER TO START" in/out, which could explain why it appeared in screenshot 03 (animal select screen erroneously?) but not in 02. However, screenshot 03 shows the title screen with "PRESS ENTER TO START" visible, meaning the first Enter press may not have registered, or the mode select screen renders identically to the title.

**Update on re-analysis:** Looking more carefully, screenshots 01-06 show that the first Enter went title->modeSelect (02, same visual), the second Enter went modeSelect->select (03 shows "PRESS ENTER TO START" which is the title flicker -- but actually screenshot 07 at 30s shows the animal select). The real animal select with cards appears at screenshot 07. This means the menu navigation actually took extra presses or the screenshots caught intermediate frames. **The key issue remains: modeSelect has no distinct visual indicator.**

### BUG-02: Animal Select screen shows "PRESS ENTER TO START" (title text bleed-through)
**Screenshots:** playthrough-03-animal-select.png, playthrough-06-game-start.png
**Severity:** Low
**Description:** Screenshots 03 and 06 show the title screen with "PRESS ENTER TO START" visible rather than the expected mode select or animal select screens. This suggests the 2D canvas is still rendering the title screen animation while state transitions happen. The 2D canvas should either be hidden or show the correct state immediately after transition.

### BUG-03: Level-up menu persists / blocks minimap (Tab)
**Screenshots:** playthrough-09-gameplay-1m30s.png, playthrough-10-minimap-open.png
**Severity:** Medium
**Description:** The level-up menu appeared around 1m30s and was still showing at the minimap capture attempt (screenshot 10). Pressing Tab while the upgrade menu is open did not open the minimap -- the upgrade menu remains on top. This is expected behavior (game is paused during upgrade), but the automated player could not dismiss the menu since Enter was being used for power attacks. The upgrade menu effectively blocks all other UI until an option is selected.

### BUG-04: Game Over triggered while game timer shows only 02:11
**Screenshot:** playthrough-19-final-6min.png
**Severity:** Low (observation)
**Description:** The game over screen shows "Time: 02:11" even though the Playwright script ran for 6 real-time minutes. The game time advances in delta-time while the game loop runs, but the player died at 2m11s of *game time*. The remaining ~4 minutes of real time were spent on the game-over screen. The level-up menu (which pauses the game) consumed significant real time but not game time. The automated input also typed "WWD" into the name entry field (from pressing 'w' and 'd' movement keys that were still being sent after death).

### BUG-05: Name entry captures movement keys after game over
**Screenshot:** playthrough-19-final-6min.png
**Severity:** Medium
**Description:** The game over screen shows "WWD" in the name entry field. This happened because the automated movement keys ('w', 'd') were still being pressed when the game over screen appeared, and the name entry input captured them as text. In normal gameplay, a human player would stop pressing WASD when they die, but this reveals that there is no input filtering -- movement keys should probably be ignored during name entry, or there should be a brief input cooldown after transitioning to the game-over state.

### BUG-06: 404 error on resource load
**Console output:** "Failed to load resource: the server responded with a status of 404 (File not found)"
**Severity:** Low
**Description:** One 404 error was logged during game startup. Likely a missing sound file or asset. Should be investigated to identify which resource is missing.

---

## 2. Balance

### BAL-01: HP drops rapidly in mid-game (3.5--4.5 minutes)
**Screenshots:** playthrough-15-gameplay-4m.png (HP 30/54), playthrough-16-gameplay-4m30s.png (HP 41/54), playthrough-18-gameplay-5m30s.png (HP 6/54)
**Description:** Between the 4-minute and 5.5-minute marks (real time), the player's HP went from 54/54 to 6/54. The zombie density increased significantly, with many dark-colored (higher-tier) zombies visible. The auto-attack and snowball turret weapon were not sufficient to keep the horde at bay. By 5m30s the player was essentially overwhelmed.

### BAL-02: Zombie density escalation feels appropriate
**Screenshots:** playthrough-08-gameplay-1m.png (sparse), playthrough-14-gameplay-3m30s.png (moderate), playthrough-16-gameplay-4m30s.png (dense)
**Description:** The zombie population ramps up nicely over time. Early game (30s-1m) has scattered zombies with plenty of breathing room. By 3-4 minutes, there's a healthy challenge with zombies approaching from multiple directions. By 4.5 minutes, the screen is crowded with 20+ zombies, creating intense pressure. The escalation curve feels well-tuned.

### BAL-03: Weapon progression -- only 2 weapons acquired by Level 7
**Screenshots:** playthrough-14-gameplay-3m30s.png shows "CLAW SWIPE Lv1" and "SNOWBALL TURRET Lv1"
**Description:** By level 7 (just over 2 minutes of game time), the player had only 2 weapons, both at Lv1. The level-up choices frequently offered Howls instead of weapon upgrades. With 4 howls acquired (Power, Haste, Magnet, Guardian) vs 2 weapons, the howl-to-weapon ratio may be slightly skewed. Players might prefer more weapon variety earlier.

### BAL-04: Howl stacking appears strong
**Screenshots:** playthrough-15-gameplay-4m.png shows Power Howl x1, Haste Howl x1, Magnet Howl x1, Guardian Howl x1
**Description:** By level 6, the player had 4 different howls. The passive buffs from these (+damage, -cooldowns, +pickup radius, +HP/regen) stack well together. The Guardian Howl's +8% max HP and +2 HP/s regen kept the player alive longer than expected given the zombie pressure.

### BAL-05: Score growth is steady
**Progression:** 0 -> 128 (30s) -> 156 (44s) -> 244 (52s) -> 336 (1m02) -> 744 (1m18) -> 1152 (1m34) -> 2174 (2m02) -> 2356 (death at 2m11)
**Description:** Score accumulation accelerates as zombie density increases and higher-tier kills yield more points. The curve feels rewarding -- late-game kills are worth noticeably more.

---

## 3. UX Issues

### UX-01: Menu navigation has no visual state for mode select
**Screenshots:** playthrough-01 through playthrough-06
**Description:** The transition from title to mode select to animal select is not visually clear. The title screen and mode select screen appear identical. A new player would have no idea they're choosing between 2D and 3D modes without seeing distinct UI. The animal select screen (screenshot 07) is well-designed with clear cards, stat bars, and navigation hints.

### UX-02: HUD text is small and hard to read at 1280x720
**Screenshots:** All gameplay screenshots
**Description:** The HUD elements (HP bar, XP bar, level indicator, weapon names, howl list, wave/score/timer in the top-right) use small monospaced text that is difficult to read, especially the howl names in the top-right corner. At 1280x720, the weapon names ("CLAW SWIPE Lv1", "SNOWBALL TURRET Lv1") in the top-left are readable but could benefit from slightly larger font or higher contrast backgrounds.

### UX-03: Bottom HUD text is barely visible
**Screenshots:** playthrough-08-gameplay-1m.png, playthrough-11-gameplay-2m.png
**Description:** There appears to be helper text at the bottom of the screen (controls hint), but it blends into the green terrain and is nearly unreadable. The text needs a darker background strip or shadow to be legible against the varying terrain colors below it.

### UX-04: Level-up menu is clear and well-designed
**Screenshots:** playthrough-09-gameplay-1m30s.png, playthrough-17-gameplay-5m.png
**Description:** The upgrade menu is one of the strongest UI elements. The cards have distinct category tags (UPGRADE in green, HOWL in purple), clear descriptions, and the orange/cyan selection borders are easy to see. The "[R] REROLL (3 left)" hint is helpful. The Arrow Keys navigation hint is clear.

### UX-05: Game Over screen is information-rich but dense
**Screenshot:** playthrough-19-final-6min.png
**Description:** The game over screen packs a lot of information: score, character, level, wave, time, total kills with tier breakdown (Shambler: 135, Lurcher: 17, Bruiser: 4, Brute: 1), strongest kill, play-again feedback, and name entry. This is comprehensive but quite dense. The tier kill breakdown text is very small. The "Would you play again?" feedback prompt with [Yes] / Maybe / No is a nice touch for gathering player sentiment.

### UX-06: Minimap in bottom-right is very small
**Screenshots:** All gameplay screenshots show a tiny circular minimap
**Description:** The minimap in the bottom-right corner is quite small (appears to be roughly 60-70px diameter). While it shows the player position and nearby entities, it's difficult to use for navigation at a glance. The "[TAB] Map" label is helpful for indicating the full map is available.

### UX-07: Floating text ("POWERUP!", "LURCHER!") is effective
**Screenshots:** playthrough-18-gameplay-5m30s.png shows "POWERUP!" and "LURCHER!" floating text
**Description:** The floating damage/event text provides good feedback for combat events and pickups. The colored text stands out against the 3D scene. This is a well-implemented feedback system.

---

## 4. Graphics

### GFX-01: Voxel art style is charming and consistent
**Screenshots:** All gameplay screenshots
**Description:** The low-poly voxel aesthetic is well-executed. Trees, rocks, stumps, mushrooms, and terrain blocks all share a cohesive visual language. The green-dominant forest biome is pleasant. The leopard player model is identifiable and animated (visible in different poses across screenshots).

### GFX-02: Zombie models have good tier differentiation
**Screenshots:** playthrough-14 through playthrough-18
**Description:** Different zombie tiers are visually distinct. Basic shamblers appear as small dark figures, while larger zombies (lurchers, bruisers, brutes) are noticeably bigger with different proportions. The tier system creates visual variety in the enemy roster.

### GFX-03: Shadow rendering is basic but functional
**Screenshots:** All gameplay screenshots
**Description:** Simple drop shadows appear beneath objects, giving depth to the scene. They appear to be circular/blob shadows rather than projected shadows, which is appropriate for the art style and performance.

### GFX-04: Terrain plateaus create interesting elevation variety
**Screenshots:** playthrough-13-gameplay-3m.png, playthrough-16-gameplay-4m30s.png
**Description:** Raised terrain plateaus are visible in several screenshots, adding vertical dimension to the otherwise flat world. The plateau edges have visible cliff faces with darker brown coloring that contrasts with the green grass top.

### GFX-05: XP gems (purple particles) are visible but small
**Screenshots:** Multiple gameplay screenshots show small purple/pink dots scattered on the ground
**Description:** XP gems appear as small purple/magenta dots on the ground. They're visible but could benefit from a slight glow or pulsing animation to draw the player's attention more effectively, especially when the Magnet Howl is not active.

### GFX-06: Crate/pickup objects have distinct coloring
**Screenshots:** playthrough-13-gameplay-3m.png shows a bright green cube (likely a crate)
**Description:** Breakable crates and item pickups use bright, saturated colors (green, red, brown) that stand out from the terrain. This makes them easy to spot during gameplay.

### GFX-07: Draw distance appears reasonable
**Screenshots:** All gameplay screenshots
**Description:** The chunk-based terrain system loads a reasonable area around the player. Trees and decorations are visible at medium distance. The background fades to a flat green color at the far edges, and a brownish-grey sky is visible. There's no obvious pop-in visible in the screenshots, though the static nature of screenshots may not capture dynamic chunk loading artifacts.

### GFX-08: SwiftShader rendering note
**Description:** All screenshots were captured using SwiftShader (software rendering) since the test ran in headless Chrome. This means the visual quality may differ from what a player would see with hardware GPU acceleration. Lighting, shadows, and post-processing effects may appear simplified compared to actual hardware rendering.

---

## 5. Suggestions

### SUG-01: Add a visible Mode Select UI
The mode select screen needs a clear visual showing "2D Classic" and "3D Survivor" as two selectable options with a highlight indicator. Currently it's indistinguishable from the title screen.

### SUG-02: Add input cooldown/filter on game over transition
When transitioning to the game over screen, add a brief input blackout period (200-300ms) so that movement keys being held during death don't get typed into the name entry field. Alternatively, filter out WASD keys from name entry entirely (they're unlikely to be used in names).

### SUG-03: Increase HUD text size or add background panels
The HUD text, especially the howl list in the top-right and the bottom helper text, would benefit from slightly larger fonts and semi-transparent dark background panels for improved readability.

### SUG-04: Add XP gem glow or pulse effect
XP gems could use a subtle glow, pulse animation, or particle trail to make them more visually appealing and easier to spot in dense areas.

### SUG-05: Consider weapon vs howl balance in level-up choices
The level-up menu currently seems to offer howls frequently. Consider weighting weapon upgrades or new weapons slightly higher in the first few level-ups to give players more active gameplay variety early on.

### SUG-06: Larger minimap or persistent full-map toggle
The corner minimap is very small. Consider making it slightly larger by default, or allowing players to toggle a medium-sized map overlay without needing to open the full Tab map.

### SUG-07: Investigate the 404 resource error
A 404 error was logged during game startup. This should be tracked down (likely a missing sound file) and either the file should be added or the reference removed.

### SUG-08: Add visual feedback for power attack charging
During the playthrough, power attacks were used via Enter but it was difficult to tell from screenshots when charging was active. A more prominent visual indicator (character glow, screen-edge effect, growing charge circle) would help players understand the charge mechanic.

### SUG-09: Consider a brief invulnerability after level-up menu closes
Since the game pauses during the upgrade menu but zombies are still positioned around the player, closing the menu can result in immediate damage. A brief 0.5-1s invulnerability window after dismissing the upgrade menu would prevent cheap deaths.

---

## Appendix: Screenshot Manifest

| # | Filename | Timestamp | Content |
|---|----------|-----------|---------|
| 01 | playthrough-01-title-screen.png | 0s | Title screen (no "PRESS ENTER" visible) |
| 02 | playthrough-02-mode-select.png | +1.5s | Mode select (identical to title) |
| 03 | playthrough-03-animal-select.png | +3s | Title screen with "PRESS ENTER TO START" |
| 04 | playthrough-04-animal-select-right1.png | +3.8s | Title screen (no change visible) |
| 05 | playthrough-05-animal-select-right2.png | +4.6s | Title screen (no change visible) |
| 06 | playthrough-06-game-start.png | +11s | Title screen with "PRESS ENTER TO START" |
| 07 | playthrough-07-gameplay-0m30s.png | +30s | Gameplay: HP 50/50, LVL 1, Wave 1, Score 0, 00:04 |
| 08 | playthrough-08-gameplay-1m.png | +1m | Gameplay: HP 50/50, XP 5/19, LVL 1, 00:04 |
| 09 | playthrough-09-gameplay-1m30s.png | +1m30s | Level Up menu: Claw Swipe Lv2 / Guardian Howl / Haste Howl |
| 10 | playthrough-10-minimap-open.png | +1m35s | Level Up menu still showing (Tab blocked) |
| 11 | playthrough-11-gameplay-2m.png | +2m | Gameplay: HP 54/54, XP 6/33, LVL 4, Score 128, 00:31 |
| 12 | playthrough-12-gameplay-2m30s.png | +2m30s | Gameplay: HP 54/54, XP 22/33, Score 156, 00:44 |
| 13 | playthrough-13-gameplay-3m.png | +3m | Gameplay: HP 54/54, XP 31/33, LVL 4, Score 244, 00:52 |
| 14 | playthrough-14-gameplay-3m30s.png | +3m30s | Gameplay: HP 54/54, LVL 5, Score 336, 01:02, Snowball Turret added |
| 15 | playthrough-15-gameplay-4m.png | +4m | Gameplay: HP 30/54, LVL 6, Score 744, 01:18, dense zombies |
| 16 | playthrough-16-gameplay-4m30s.png | +4m30s | Gameplay: HP 41/54, Score 1152, 01:34, very dense zombies |
| 17 | playthrough-17-gameplay-5m.png | +5m | Level Up menu: Guardian Howl / Haste Howl / Vitality Howl |
| 18 | playthrough-18-gameplay-5m30s.png | +5m30s | Gameplay: HP 6/54, Wave 2, Score 2174, 02:02, near death |
| 19 | playthrough-19-final-6min.png | +6m | Game Over: Score 2356, Level 7, 157 kills, 02:11 game time |
