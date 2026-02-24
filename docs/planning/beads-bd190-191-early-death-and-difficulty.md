# Beads: BD-190 + BD-191 — Early Death Fix & Remove 3D Difficulty Select

**Date:** 2026-02-24
**Source:** Manual playthrough — player dies within seconds without meaningfully taking damage; difficulty selector is unwanted for 3D survivor mode.

---

## Priority Legend

| Priority | Meaning | Action Timeline |
|----------|---------|-----------------|
| **P0** | Game-breaking bug or crash | Fix immediately |
| **P1** | Critical UX or balance issue affecting playability | Next sprint |

---

## P0 -- Game-Breaking Balance

---

### BD-190: zombieDmgMult starts at 2x — halves effective HP from first frame

**Category:** Balance (game-breaking)
**Priority:** P0
**File(s):** `js/game3d.js` ~line 280

**Description:** `st.zombieDmgMult` is initialized to `2`, meaning all zombie contact damage is doubled from the moment the game starts. Tier-1 zombies deal `15 × 1.0 × 2 = 30 HP` per hit. A Leopard on easy difficulty has 50 HP — dead in 2 hits. A Red Panda has 40 HP — dead in 2 hits. With 10 zombies spawning in the initial burst, the player dies in seconds before they can meaningfully play. Games should last at least 7 minutes.

The `+0.15` per wave scaling (line 2271) is the intended difficulty ramp for a survivor roguelike. The starting value of 2 undermines the entire curve — it starts the player at wave-7 difficulty on frame 1.

**Root Cause:** `zombieDmgMult` was likely set to 2 during testing and never reverted, or was mistakenly initialized instead of being calculated from difficulty settings.

**Fix Approach:**

Change line 280 from:
```js
zombieDmgMult: 2,
```
to:
```js
zombieDmgMult: 1,
```

With `zombieDmgMult` starting at 1:
- **Wave 0:** Tier-1 damage = 15 (Leopard survives 3 hits, Red Panda 2-3 hits)
- **Wave 3 (~3.75 min):** zombieDmgMult = 1.45, Tier-1 damage = 21.75
- **Wave 5 (~6.25 min):** zombieDmgMult = 1.75, Tier-1 damage = 26.25
- **Wave 7+ (~8.75 min):** zombieDmgMult = 2.05 — now reaching the old starting difficulty

This gives a natural 7+ minute survival curve where healing, upgrades, and howls have time to matter.

**Acceptance Criteria:**
- Tier-1 zombie contact damage at game start is 15 (not 30)
- The `+0.15` per wave scaling is unchanged
- A Leopard (50 HP, easy) can survive at least 3 tier-1 contact hits at game start
- Games consistently last 3+ minutes for new players, 7+ minutes for competent play

---

## P1 -- UX Improvement

---

### BD-191: Remove difficulty selection for 3D Survivor mode

**Category:** UX
**Priority:** P1
**File(s):** `js/game.js` ~lines 294-302, 408-412

**Description:** The 3D Survivor mode has a difficulty selection screen (Chill/Easy/Medium/Hard) that shouldn't exist. In survivor-style roguelikes, difficulty is handled organically through in-game systems — the wave scaling, zombie tier progression, howl/weapon upgrades, and shrine augments already provide the difficulty curve. A manual difficulty selector is redundant and confusing. The 2D Classic mode should keep its difficulty selection.

When 3D mode is selected, skip the difficulty screen and go straight to animal selection. Default to the 'easy' difficulty preset (1.0x HP, 1.0x score, 1.0x enemy speed, 1.0x powerup frequency) — this is the "neutral" baseline that lets the in-game systems drive the experience.

**Fix Approach:**

**Change 1 — Mode select branch** (`js/game.js` ~lines 294-302):
Skip difficulty screen for 3D mode, go directly to animal select:
```js
if (state.selectedMode === 0) {
  // 2D Classic: go through difficulty select
  state.selectedDifficulty = 0;
  state.gameState = 'difficulty';
} else {
  // 3D Survivor: skip difficulty, default to 'easy' baseline
  state.difficulty = 'easy';
  state.leaderboard = loadLeaderboard(state.difficulty);
  state.selectedAnimal = 0;
  state.gameState = 'select';
}
```

**Change 2 — Animal select Escape key** (`js/game.js` ~lines 408-412):
Escape from animal select should go back to mode select (not difficulty) for 3D:
```js
if (keys['Escape'] && !state._escHeld) {
  state._escHeld = true;
  if (state.selectedMode === 0) {
    state.gameState = 'difficulty';
  } else {
    state.gameState = 'modeSelect';
  }
}
```

**Acceptance Criteria:**
- Selecting "3D Survivor" on mode select goes directly to animal selection (no difficulty screen)
- The 3D game launches with 'easy' difficulty settings (1.0x HP, 1.0x score, 1.0x enemy speed)
- Pressing Escape on animal select (3D) returns to mode select
- 2D Classic mode's difficulty selection is completely unchanged
- The existing `launch3DGame({ difficulty: diff, difficultyKey: state.difficulty, ... })` call still receives valid difficulty data

---

## Conflict Analysis

BD-190 and BD-191 have **no conflicts** — BD-190 changes a state initialization in `game3d.js` while BD-191 changes menu flow in `game.js`. Safe to implement in parallel.

Both are compatible with BD-189 (game-over input freeze fix, already applied).
