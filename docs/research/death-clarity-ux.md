# Death Communication Research Report

**Date:** 2026-02-24
**Purpose:** How to communicate death cause to a 7-year-old in a roguelike survivor game.

---

## The Problem

When HP reaches 0, the game immediately cuts to the game-over screen. The player has no idea what killed them — no slow-motion, no "defeated by" text, no camera focus on the killer. For a 7-year-old, death feels random and confusing.

---

## 1. How Other Games Handle It

### Minecraft
- `"[Player] was slain by [Mob]"` — consistent format, always the same place
- 50+ death message variants for different damage types
- After 2-3 deaths, even young children predict the format

### Fortnite
- Large centered `"ELIMINATED"` text
- `"Eliminated by [Name]"` below
- Spectates the eliminator briefly
- Big dramatic word + small explanatory detail

### Risk of Rain 2
- `"Killed by [Enemy Name]"` on death screen
- Default: `"Killed by: The Planet"` when source unclear
- Community DEMANDED more detail (ShowDeathCause mod)

### Vampire Survivors
- Does NOT show what killed you (notable exception)
- Works because death is always obviously "the swarm overwhelmed you"
- Does NOT work for games with varied damage sources like ours

### Hades
- Narrative prose from narrator describing death (humorous)
- Too content-heavy for our scope, but the tone is right

---

## 2. Recommended Implementation

### Priority 1: Track Last Damage Source (Foundation)

Add `st.lastDamageSource` updated in `damagePlayer()`:
```js
st.lastDamageSource = { type: 'contact', tierName: 'Brute', tier: 4, color: 0xff4444 };
```

Call sites to update:
| Source | Type | Tier Name |
|---|---|---|
| Contact damage | 'contact' | From ZOMBIE_TIERS |
| Death Bolt | 'deathBolt' | 'Nightmare' |
| Bone Spit | 'boneSpit' | 'Horror' |
| Boss Slam | 'slam' | 'Titan' |
| Shockwave | 'shockwave' | 'Titan' |
| Death Beam | 'beam' | 'Overlord' |
| Poison Pool | 'poison' | 'Lurcher' |

### Priority 2: "DEFEATED BY" on Game-Over Screen

Between time survived and kill count:
```js
ctx.fillStyle = tierColor;
ctx.font = 'bold 18px ' + GAME_FONT;
ctx.fillText('DEFEATED BY: ' + tierName.toUpperCase(), W / 2, 158);
```

Use "DEFEATED BY" not "KILLED BY" — implies the enemy was strong, not that the player was weak.

### Priority 3: Red Death Vignette

On killing blow, bypass hurt flash cooldown:
- `st.playerHurtFlash = 1.5` (longer than normal 0.5)
- Render deeper red vignette (alpha 0.4-0.5 vs normal 0.2)

### Priority 4: Slow-Motion Death Sequence (1.5 seconds)

When HP hits 0:
1. Enter `st.deathSequence` phase (don't immediately set `st.gameOver`)
2. Ramp `timeScale` from 1.0 → 0.15 over 0.5s, hold for 1.0s
3. Camera interpolates toward killer's position (blend lookAt target)
4. Camera zooms in ~30-40% (reduce distance)
5. After 1.5s real time → transition to game-over screen

Implementation:
```js
if (st.hp <= 0 && !st.deathSequence) {
  st.hp = 0;
  st.deathSequence = true;
  st.deathSequenceTimer = 1.5;
  st.deathSequenceKiller = { x: killerX, z: killerZ };
}
// In update loop:
if (st.deathSequence) {
  st.deathSequenceTimer -= dt; // real dt, not scaled
  const progress = 1 - (st.deathSequenceTimer / 1.5);
  const timeScale = progress < 0.33 ? 1.0 - (progress / 0.33) * 0.85 : 0.15;
  gameDt = dt * timeScale; // use gameDt for all game logic
  if (st.deathSequenceTimer <= 0) st.gameOver = true;
}
```

### Priority 5: Player Stumble Animation

During death sequence, tilt player model:
```js
const tilt = Math.min(deathProgress * 2, 1) * (Math.PI / 4); // max 45°
playerGroup.rotation.x = -tilt;
playerGroup.position.y -= tilt * 0.5;
```

---

## 3. Kid-Friendly Design Principles

1. **Big icons beat small text.** Show tier color alongside name.
2. **One idea only.** "DEFEATED BY: Brute" — not a damage log.
3. **Dramatic timing > text walls.** The slow-mo moment communicates more than words.
4. **Celebrate effort.** "YOU DEFEATED 32 ZOMBIES!" stays the headline. "Defeated by" is secondary.
5. **Use "DEFEATED BY" not "YOU DIED."** Enemy was strong, player wasn't weak.
6. **Color-code the killer name.** Visual association builds over time.

---

## What NOT to Implement

- **Kill replay buffer:** Architecturally heavy, confusing for young players
- **Full damage log:** Too much text, no value for 7-year-old
- **Narrative prose (Hades-style):** Content pipeline too heavy
- **Visual screenshot on death:** Complexity without clarity

---

## Sources
- Minecraft Death Messages Wiki
- Risk of Rain 2 Death Messages + ShowDeathCause mod
- Vampire Survivors Results Screen
- Hades death screen analysis (Kotaku)
- Fortnite Elimination Feed
- Game Developer: Slow-Mo Tips and Tricks
- Nielsen Norman Group: Children's UX
- Game Developer: Boss Battle Design and Structure
