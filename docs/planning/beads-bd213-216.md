# Beads: BD-213 through BD-216

**Date:** 2026-02-24
**Source:** Julian's playtest + screenshot — dead keys on game-over name entry, player model stuck white, bosses still unscary, no death clarity.

---

## Priority Legend

| Priority | Meaning | Action Timeline |
|----------|---------|-----------------|
| **P0** | Game-breaking bug or crash | Fix immediately |
| **P1** | Critical UX or balance issue affecting playability | Next sprint |

---

## P0 -- Bugs

---

### BD-213: Game-over name entry blocks gameplay keys (a, s, d, b, r, e, w)

**Category:** Bug — Input
**Priority:** P0
**File(s):** `js/game3d.js` ~lines 590, 601-614

**Description:** On the game-over screen, the "ENTER YOUR NAME" field is canvas-based (not an HTML input). The keyboard handler at line 590 calls `e.preventDefault()` on ALL key events unconditionally, before checking if name entry is active. Additionally, line 605 has `BLOCKED_NAME_KEYS = new Set(['w','a','s','d','b','r','e',' '])` which explicitly prevents these 7 gameplay keys from being typed as name characters.

A player named "DREW" or "SABER" or "WADE" cannot type their name. Julian cannot type names containing any of these common letters.

**Root Cause:**
1. Line 590: `e.preventDefault()` fires before `st.nameEntryActive` check — blocks all browser key handling
2. Line 605: `BLOCKED_NAME_KEYS` set prevents w/a/s/d/b/r/e/space from being added to `st.nameEntry`
3. The block was added in BD-107 to prevent WASD movement from leaking into name entry, but the fix went too far — it blocks the characters entirely instead of just blocking the movement action

**Fix:**
1. Remove the `BLOCKED_NAME_KEYS` set entirely — when `st.nameEntryActive` is true, ALL character keys should be accepted as name input
2. Move `e.preventDefault()` inside conditional blocks so it only fires during gameplay, not during name entry
3. When `st.nameEntryActive` is true, the keydown handler should ONLY process: Backspace (delete char), Enter (submit), and single-character keys (add to name). It should NOT process movement, attack, or any other gameplay bindings.

```js
// In onKeyDown:
if (st.gameOver && st.nameEntryActive) {
  if (e.key === 'Backspace') {
    st.nameEntry = st.nameEntry.slice(0, -1);
    e.preventDefault();
  } else if (e.key === 'Enter' && st.nameEntry.length > 0) {
    saveScore3d();
    st.nameEntryActive = false;
    e.preventDefault();
  } else if (e.key.length === 1 && st.nameEntry.length < 10) {
    st.nameEntry += e.key.toUpperCase();
    e.preventDefault();
  }
  return; // Don't process any gameplay keys
}
// ... rest of handler with preventDefault() for gameplay keys
```

**Acceptance Criteria:**
- All 26 letters can be typed in the name entry field
- Space character works in name entry
- WASD keys do NOT trigger movement during name entry (return early prevents it)
- Backspace deletes characters
- Enter submits the name
- Max 10 characters still enforced
- After name is submitted, gameplay keys work normally for menu navigation

---

### BD-214: Player model turns white on damage and never reverts to original colors

**Category:** Bug — Visual (Regression from BD-208)
**Priority:** P0
**File(s):** `js/game3d.js` ~lines 4572-4598

**Description:** BD-208 replaced the 10Hz white strobe with a constant 50% tint. However, the implementation has a critical logic error: `_origColor` is saved EVERY FRAME the flash is active, not just on the first frame. Since the mesh color is already tinted white from the previous frame, the "original" color gets overwritten with the tinted value. After the flash timer expires, the restoration block reads back the tinted color, not the true original.

**Current code (line 4578-4579):**
```js
if (!child.userData._origColor) {
  child.userData._origColor = child.material.color.getHex();
}
```

This `if` guard SHOULD prevent overwriting — but the restoration block at line 4592 does `delete child.userData._origColor`, which means the NEXT flash will re-save the (possibly still-tinted) color. If a second flash starts before the model fully restores, the tinted color gets saved as "original."

**The compounding issue:** The restoration block at lines 4590-4595 uses `playerGroup.userData._flashCleared` as a gate. This flag is set to `true` after restoration, and reset to `false` when `playerHurtFlash > 0`. But if the flash timer expires and restoration runs on the same frame as a new flash trigger (due to the cooldown being separate from the flash timer), the restoration deletes `_origColor` and the new flash immediately re-saves the current (still-tinted) color.

**Fix — Save original colors ONCE on player model creation, never delete them:**

1. When the player model is created (in the model building section), traverse all meshes and store `child.userData._trueColor = child.material.color.getHex()` on every mesh. This is the permanent ground truth.
2. In the flash rendering, always blend from `_trueColor` (never from current color):
   ```js
   if (st.playerHurtFlash > 0) {
     st.playerHurtFlash -= dt;
     playerGroup.traverse(child => {
       if (child.isMesh && child.material && child.userData._trueColor !== undefined) {
         const origColor = child.userData._trueColor;
         const r = ((origColor >> 16) & 0xff) * 0.5 + 255 * 0.5;
         const g = ((origColor >> 8) & 0xff) * 0.5 + 255 * 0.5;
         const b = (origColor & 0xff) * 0.5 + 255 * 0.5;
         child.material.color.setHex((Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b));
       }
     });
   } else {
     // Restore to true colors
     playerGroup.traverse(child => {
       if (child.isMesh && child.material && child.userData._trueColor !== undefined) {
         child.material.color.setHex(child.userData._trueColor);
       }
     });
   }
   ```
3. Remove the `_flashCleared` gate entirely — just always restore when flash is not active. This is idempotent and safe.

**Acceptance Criteria:**
- Player model returns to original colors after hurt flash ends
- Multiple rapid flashes do NOT progressively whiten the model
- Flash still shows 50% tint while active
- Works correctly with all 4 animal types (leopard, redPanda, lion, gator)
- No performance regression from traversing the model every frame

---

## P1 -- Gameplay

---

### BD-215: Boss zombies (tier 9-10) need diverse, learnable attack patterns

**Category:** Gameplay — Boss Design
**Priority:** P1
**File(s):** `js/game3d.js` (boss attack section), `js/3d/constants.js`
**Reference:** `docs/research/boss-battle-design.md`

**Description:** Despite BD-211's speed/range/cooldown buffs, bosses still lack diverse attack patterns that players can learn and adapt to. The Titan has only slam + shockwave (both AoE, no projectiles). The Overlord has only a single Death Bolt (easily dodged). Julian says they remain unscary because there's nothing interactive — no rockets, no projectile patterns, no floor hazards to dodge.

Research into roguelike survivor boss design (Vampire Survivors, Halls of Torment, Brotato) identifies the key missing elements: multi-projectile volleys, floor hazard zones, charge attacks, phase transitions, and visual intimidation.

**Fix — Add new attacks per the research report:**

**Tier 9 (Titan) additions:**
1. **Bone Barrage:** Titan slams ground, 4-6 bone fragments arc outward landing at semi-random positions near the player. Red ground circles telegraph landing zones (0.8s warning). Damage: 15 per bone.
2. **Titan Charge:** Hunches down (1.5s telegraph with red aim line), charges at 3x speed for 15 units. 30 damage on contact. 2s recovery stun after (exploitable window). Cooldown: 10s.
3. **Phase system:** Above 60% HP: slam + shockwave only. 60-30%: add Bone Barrage. Below 30%: add Titan Charge, -25% cooldowns, brighter glow.

**Tier 10 (Overlord) additions:**
1. **Death Bolt Volley:** Upgrade single bolt to 3-bolt spread (15-degree arc). Center bolt leads target, flanking bolts offset ±7.5°. Speed 16. Damage: 30 per bolt.
2. **Shadow Zones:** Dark circles (3-unit radius) appear at 3-5 positions near player. 1.5s telegraph, then erupt dealing 10 damage/0.5s for 3 seconds. Forces constant movement.
3. **Summon Burst:** 2s channel, spawns 4-6 tier 1-3 zombies in a ring. 50% HP, despawn after 15s. Cooldown: 12s.
4. **Death Beam:** 2s charge-up, fires a thick beam that sweeps 60° over 2s. 40 damage. Player must run perpendicular or get behind boss.
5. **Phase system:** Above 75%: Volley + Shadow Zones. 75-50%: add Summon. 50-25%: add Beam, volley becomes 5-bolt. Below 25%: Overlord moves 30% faster, all cooldowns -20%.

**Chill Mode adjustments:**
- Telegraph durations 1.5x longer
- Projectile speeds 0.6x
- Cooldowns 1.5x longer
- Fewer simultaneous projectiles (3-bolt → 2-bolt, 5-bolt → 3-bolt)

**Visual/audio additions:**
- Screen shake on boss slam/charge impacts
- Distinct audio cues per attack type
- Boss entrance sequence (grow from 0 scale, title card, nearby zombies scatter)
- Phase transition flash + "TITAN ENRAGED!" floating text

**Acceptance Criteria:**
- Titan has 4 distinct attacks with clear telegraphs
- Overlord has 5 distinct attacks with clear telegraphs
- Both bosses have HP-based phase transitions
- Attack patterns are learnable — same visual/audio cues every time
- Every attack has a safe zone (no unavoidable damage)
- Chill Mode makes patterns easier but keeps bosses scary
- Julian says "THAT is scary!"

---

### BD-216: No death clarity — player doesn't understand what killed them

**Category:** UX — Death Feedback
**Priority:** P1
**File(s):** `js/game3d.js` (damagePlayer, game-over trigger), `js/3d/hud.js` (game-over screen)
**Reference:** `docs/research/death-clarity-ux.md`

**Description:** When HP reaches 0, the game immediately cuts to the game-over screen. There's no slow-motion, no indication of what killed the player, and no "defeated by" information. For a 7-year-old, death feels random and confusing — they can't learn from it.

**Fix — Multi-part death feedback system:**

**Part A — Track last damage source (foundation):**
Add `st.lastDamageSource` to state. Update `damagePlayer()` to accept a `source` parameter:
```js
function damagePlayer(baseDmg, color, source) {
  // ... existing logic ...
  if (dmg > 0) {
    st.lastDamageSource = source || { type: 'unknown', tierName: 'Unknown' };
    // ... rest of damage logic
  }
}
```
Update all ~8 call sites to pass source objects with `{ type, tierName, tier, color }`.

**Part B — "DEFEATED BY" line on game-over screen:**
In hud.js game-over rendering, add between time and kill count:
```js
if (s.lastDamageSource && s.lastDamageSource.tierName) {
  ctx.fillStyle = '#' + (s.lastDamageSource.color).toString(16).padStart(6, '0');
  ctx.font = 'bold 18px ' + GAME_FONT;
  ctx.fillText('DEFEATED BY: ' + s.lastDamageSource.tierName.toUpperCase(), W / 2, 158);
}
```

**Part C — Slow-motion death sequence (1.5 seconds):**
When HP hits 0, enter `st.deathSequence` phase instead of immediate game over:
1. Ramp `timeScale` from 1.0 to 0.15 over 0.5s, hold for 1.0s
2. Camera slowly zooms toward the killing enemy
3. Red vignette deepens
4. Player model tilts backward (stumble animation)
5. After 1.5s real time, transition to game-over screen

**Acceptance Criteria:**
- Game-over screen shows "DEFEATED BY: [Tier Name]" in the killer's color
- 1.5-second slow-motion death moment before game-over screen appears
- Camera pans toward the killing enemy during death sequence
- Player model stumbles/falls during death sequence
- Red vignette intensifies at death moment
- A 7-year-old can tell what killed them after dying
- No regression to game-over stats, feedback, or name entry

---

## Conflict Analysis

- **BD-213** touches game3d.js (keydown handler ~lines 590-614) — NO conflict with others
- **BD-214** touches game3d.js (player hurt flash ~lines 4572-4598) — NO conflict with others (different section from BD-213)
- **BD-215** touches game3d.js (boss attacks ~lines 5155+) + constants.js — NO conflict with BD-213/214/216
- **BD-216** touches game3d.js (damagePlayer ~line 2714, game-over trigger ~line 6336) + hud.js (game-over screen) — LOW conflict with BD-214 (different section)

**Recommended sprint batches:**
- **Agent 1:** BD-213 (dead keys fix — quick, isolated)
- **Agent 2:** BD-214 (white model fix — quick, isolated)
- **Agent 3:** BD-216 Parts A+B (damage source tracking + defeated-by line — moderate, foundational)
- **Agent 4:** BD-216 Part C (slow-motion death sequence — larger, depends on Part A)
- **Agent 5:** BD-215 (boss attack overhaul v2 — largest bead, needs full attention)
