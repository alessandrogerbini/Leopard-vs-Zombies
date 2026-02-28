# BD-250: Game-over screen text layout overlaps — "DEFEATED BY" collides with kill count

**Date:** 2026-02-27
**Source:** Screenshot from manual playthrough — game-over screen text is jumbled, with the "DEFEATED BY: SHAMBLER" line visually colliding with the "YOU DEFEATED 289 ZOMBIES!" line.

---

## Priority Legend

| Priority | Meaning | Action Timeline |
|----------|---------|-----------------|
| **P1** | High-priority visual bug | Fix this sprint |

---

## P1 — Visual Layout Bug

---

### BD-250: Game-over screen text lines overlap due to hardcoded Y positions

**Category:** Bug (UI layout)
**Priority:** P1
**File(s):** `js/3d/hud.js` ~lines 1312-1416

**Symptom:**
On the game-over screen, the "DEFEATED BY: SHAMBLER" line (red text + zombie icon + dark pill) overlaps directly with the "YOU DEFEATED 289 ZOMBIES!" line below it. The zombie tier icon also collides with the word "YOU". The overall effect is jumbled, hard to read, and looks unfinished.

**Root Cause:**
The game-over screen uses hardcoded Y pixel positions with insufficient spacing between elements. The "DEFEATED BY" section (BD-216/232) was inserted between existing elements without adjusting the positions below it.

Current layout (hardcoded Y values):
```
Y=55   "GAME OVER"                    (48px font)
Y=95   "SCORE: 7524"                  (24px font) — 40px gap
Y=118  "RED PANDA | Level 10 | Wave 2"(14px font) — 23px gap
Y=138  "Time: 03:44"                  (14px font) — 20px gap
Y=158  "DEFEATED BY: SHAMBLER"        (20px font) — 20px gap
Y=175  "YOU DEFEATED 289 ZOMBIES!"    (28px font) — 17px gap ← OVERLAP
Y=205  Tier breakdown starts          (16px font) — 30px gap
```

The 28px bold "YOU DEFEATED" text has ascenders reaching ~26px above its baseline (Y=175), putting them at Y≈149 — directly through the "DEFEATED BY" text at Y=158. The zombie tier icon at Y=158 extends even further up and left, colliding with the kill count text.

**Fix Approach:**
Replace hardcoded Y positions with a flowing cursor (`cursorY`) that accumulates proper spacing after each element. This prevents overlap regardless of which optional sections are shown (e.g., "DEFEATED BY" only appears when `lastDamageSource` exists).

```js
let cursorY = 55;

// "GAME OVER" title
ctx.fillStyle = '#ff4444'; ctx.font = 'bold 48px ' + GAME_FONT;
ctx.fillText('GAME OVER', W / 2, cursorY);
cursorY += 40;

// SCORE
ctx.fillStyle = '#ffcc00'; ctx.font = 'bold 24px ' + GAME_FONT;
ctx.fillText(`SCORE: ${s.score}`, W / 2, cursorY);
cursorY += 23;

// Animal | Level | Wave
ctx.fillStyle = '#ffffff'; ctx.font = 'bold 14px ' + GAME_FONT;
ctx.fillText(`${animalData.name} | Level ${s.level} | Wave ${s.wave - 1}`, W / 2, cursorY);
cursorY += 20;

// Time survived
ctx.fillStyle = '#88ccff'; ctx.font = 'bold 14px ' + GAME_FONT;
ctx.fillText(`Time: ...`, W / 2, cursorY);
cursorY += 24;

// DEFEATED BY (conditional — only if lastDamageSource exists)
if (s.lastDamageSource && s.lastDamageSource.tierName) {
  // ... icon + pill + text at cursorY ...
  cursorY += 30;
}

// YOU DEFEATED N ZOMBIES!
ctx.fillStyle = '#ffcc44'; ctx.font = 'bold 28px ' + GAME_FONT;
ctx.fillText(`YOU DEFEATED ${s.totalKills} ZOMBIES!`, W / 2, cursorY);
cursorY += 30;

// Tier breakdown, feedback, name entry — all flow from cursorY
```

**Acceptance Criteria:**
- No text overlaps on the game-over screen at any window size
- "DEFEATED BY" line is clearly separated from the kill count line below it
- Zombie tier icon does not overlap any text
- When "DEFEATED BY" is absent (e.g., unknown damage source), the layout collapses gracefully without a gap
- All sections (stats, feedback, name entry, leaderboard) remain properly spaced
- Layout works at both small (800x600) and large (1920x1080) window sizes

---

## Conflict Analysis

No conflicts with other beads. Changes are limited to the game-over section of `js/3d/hud.js` (lines 1307-1457). BD-249 (game-over hang) touches `game3d.js` transition logic, not HUD layout — safe to implement in parallel.

---

## Review Notes

**Reviewer:** Code review (2026-02-27)

### Root Cause Assessment
Correct. Confirmed by reading hud.js lines 1307-1460: all Y positions are hardcoded. The "DEFEATED BY" section at Y=158 (line 1342/1359) and "YOU DEFEATED" at Y=175 (line 1363) have only 17px separation, which is insufficient for a 28px bold font with ascenders. The overlap is a mathematical certainty, not a rendering quirk.

### Recommended Solution: cursorY approach (as proposed)
The flowing `cursorY` accumulator is the right fix. It handles the conditional "DEFEATED BY" section gracefully and prevents future layout issues when adding new sections.

### Additional Edge Cases / Risks
- **Small window heights:** If the window is very short (e.g., 600px), the entire game-over screen may not fit. The cursorY approach should include a check or clamp to prevent content from exceeding the canvas height. Consider adding a `Math.min(cursorY, H - 120)` guard before the name entry section to ensure it remains on-screen.
- **Very long animal names:** The `animalData.name` line uses center-aligned text so this is fine, but verify with "Red Panda" (longest name) at minimum width.
- **Missing lastDamageSource:** When the "DEFEATED BY" section is absent, the cursorY skip is correct — the layout should collapse without a visible gap. Verify this path explicitly during testing.
- **Tier breakdown height is variable:** The kid groups section (lines 1367-1383) already uses a flowing `tierY` variable internally — this should be integrated into the global cursorY system rather than starting from a hardcoded 205.

### Implementation Notes
- Convert ALL hardcoded Y values in lines 1312-1457 to use cursorY, not just the overlapping section. This prevents future regressions when adding new elements.
- The feedback section (lines 1392-1413) and name entry section (lines 1416-1457) should also flow from cursorY.
- Keep the spacing values (40px, 23px, 20px, etc.) as named constants or inline comments for readability.

### Estimated Complexity
S (Small) — mechanical refactor of ~30 lines. No logic changes, no new features. Pure layout fix.

### Dependencies
- None. Can be implemented in parallel with BD-251.
- Complementary to BD-251: BD-251 ensures the game-over screen appears; BD-250 ensures it looks correct when it does.

### Implementation Order
Second priority after BD-251. The screen must render (BD-251) before its layout matters (BD-250).
