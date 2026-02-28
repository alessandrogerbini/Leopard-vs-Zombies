# BD-253: GIANT GROWTH powerup feels like a liability — needs clearer upside

**Date:** 2026-02-27
**Source:** Manual playthrough — picking up the GIANT GROWTH powerup makes the player bigger but the benefits (2x damage) are not obvious. The downsides (30% slower, visually larger = feels like bigger target) are immediately felt. The powerup feels like a punishment.

---

## P2 — Game Feel / Design

---

### BD-253: GIANT GROWTH powerup reads as all-downside — benefits not communicated

**Category:** Design (game feel, player feedback)
**Priority:** P2
**File(s):** `js/3d/constants.js` (POWERUPS_3D, ~line 212), `js/game3d.js` (visual scale ~line 5234, movement ~line 4765), `js/3d/hud.js` (powerup timer display)

**Symptom:**
When the player picks up GIANT GROWTH, they immediately notice:
- **Character is 2x bigger** — feels like a bigger target (even though hitbox is unchanged)
- **Movement is 30% slower** — feels sluggish, harder to dodge
- **No visible health benefit** — no extra HP, no damage reduction

The 2x damage bonus is the intended upside, but it's invisible during normal gameplay — the player doesn't see damage numbers on enemies and can't easily tell attacks hit harder. The net experience is "this powerup made me worse."

**Current Implementation:**
```js
// constants.js - POWERUPS_3D
{
  id: 'giantGrowth',
  name: 'GIANT GROWTH',
  color: '#22cc44',
  desc: '2x Size & Dmg, -30% Speed',
  duration: 15,
  apply: s => { s.dmgBoost = 2; s.speedBoost = 0.7; s.giantMode = true; },
  remove: s => { s.dmgBoost = 1; s.speedBoost = 1; s.giantMode = false; }
}
```

- **dmgBoost = 2**: doubles all weapon and auto-attack damage
- **speedBoost = 0.7**: 30% movement speed reduction
- **giantMode = true**: scales playerGroup to 2x (visual only, hitbox PR=0.5 unchanged)
- **Duration**: 15 seconds
- **HUD display**: green "GIANT GROWTH (15s)" text + timer bar at top center

**Problems:**
1. **Damage boost is invisible** — enemy health bars aren't shown, floating damage numbers are small and fleeting. The player can't feel the 2x damage.
2. **Speed penalty is immediately felt** — WASD movement becomes noticeably sluggish.
3. **Size increase feels threatening** — larger character reads as "bigger hitbox" even though collision radius is unchanged.
4. **No satisfying "power" feedback** — no screen shake, no impact effects, no visual aura that says "you are strong now."
5. **Description is cryptic** — "2x Size & Dmg, -30% Speed" appears briefly and isn't reinforced during the effect.

**Fix Approach — Make the Power Fantasy Obvious:**

### Visual/Audio Feedback (make it FEEL powerful)
- **Impact shake on pickup** — brief screen shake when GIANT GROWTH activates
- **Ground stomp VFX** — player footsteps create small dust/impact particles at 2x scale
- **Damage number boost** — floating damage numbers during GIANT GROWTH are larger and a different color (e.g., orange/gold instead of white) so the player can SEE the 2x damage
- **Aura glow** — subtle green emissive glow on the player model during the effect

### Gameplay Adjustments (make it objectively better)
- **Add knockback** — giant player pushes nearby zombies away slightly on contact, creating space (reinforces the "big = strong" fantasy)
- **Reduce speed penalty** — change from -30% to -15% (speedBoost 0.85 instead of 0.7). The current penalty is too harsh for a temporary 15s buff.
- **OR: Add damage resistance** — 25-50% damage reduction during giant mode, justifying the size increase. This would make the size feel like armor, not exposure.

### HUD Improvements (tell the player what's happening)
- **Active effect description** — show "DMG x2 | SPD -30%" as a persistent subtitle under the timer, so the player knows what the tradeoff is
- **Damage counter** — brief "GIANT DAMAGE: 847" accumulated damage display during the effect, making the bonus tangible

**Recommended Minimum Fix (low effort, high impact):**
1. Larger + colored damage numbers during GIANT GROWTH (gold, 1.5x size)
2. Screen shake on activation
3. Reduce speed penalty from 0.7 to 0.85
4. Add HUD subtitle showing "DMG x2" during the effect

**Acceptance Criteria:**
- Player can clearly see/feel the 2x damage bonus during GIANT GROWTH
- The powerup feels like a net positive ("I want this")
- Speed penalty is noticeable but not punishing
- Visual feedback reinforces the power fantasy (bigger = stronger, not bigger = more vulnerable)
- Effect description is clear on the HUD during the full 15s duration
- No gameplay balance regression (still a tradeoff, just a better-communicated one)

---

## Conflict Analysis

No conflicts with other beads. Changes touch POWERUPS_3D definition in `constants.js`, visual/HUD code in `game3d.js` and `hud.js`. Independent of BD-249/250/251/252.

---

## Review Notes

**Reviewer:** Code review (2026-02-27)

### Root Cause Assessment
Sound. The analysis correctly identifies that the 2x damage bonus is invisible while the 30% speed penalty and 2x size are immediately felt. The current implementation at constants.js line 212 confirms: `apply: s => { s.dmgBoost = 2; s.speedBoost = 0.7; s.giantMode = true; }`. The visual scaling at game3d.js line 5234 is purely cosmetic (`playerGroup.scale.set(2, 2, 2)`) with no hitbox change, but players cannot know this intuitively.

### Recommended Minimum Fix (agree with bead's proposal, with adjustments)
Implement the "Recommended Minimum Fix" from the bead, with these specific choices:

1. **Reduce speed penalty: `speedBoost = 0.85` (was 0.7).** This is a one-character change in constants.js line 212. The current -30% is too punishing for a 15s temporary buff. -15% is noticeable but not crippling.

2. **Add HUD subtitle during effect.** Show "DMG x2" text below the existing "GIANT GROWTH (15s)" timer bar. This requires a small addition to the powerup timer rendering in hud.js. Low effort, high clarity.

3. **Larger + gold damage numbers during GIANT GROWTH.** If floating damage numbers exist in the codebase, apply a 1.5x scale and gold color (`#ffcc00`) when `st.giantMode` is true. If damage numbers don't currently exist as a visual system, SKIP this — implementing a floating damage number system is scope creep for this bead.

4. **Screen shake on activation — SKIP for now.** Screen shake requires a camera offset system that may not exist. If it does, add it. If not, it is out of scope for a P2 game-feel bead. The speed penalty reduction + HUD clarity are the highest-value changes.

### What NOT to implement (from the "nice to have" list)
- **Knockback on contact:** New physics behavior. Out of scope. Save for a dedicated "melee physics" bead.
- **Ground stomp VFX / dust particles:** New particle system work. Out of scope.
- **Aura glow / emissive material:** Requires material changes on the player model. Moderate effort for minor visual payoff. Skip.
- **Accumulated damage counter:** New HUD element that requires tracking state. Unnecessary if the damage numbers are already gold-colored.
- **Damage resistance:** Fundamentally changes the powerup's identity from "glass cannon" to "tank." This is a design decision, not a bug fix. Flag for the game designer to decide, do not implement by default.

### Additional Edge Cases
- **CLAWS OF STEEL overlap:** `clawsOfSteel` also sets `dmgBoost = 2` (line 201). If the player has CLAWS OF STEEL active and picks up GIANT GROWTH, the second `apply` overwrites `dmgBoost` to 2 (no stacking). When GIANT GROWTH's `remove` fires, it resets `dmgBoost = 1`, removing the CLAWS OF STEEL bonus even if its timer hasn't expired. This is a pre-existing bug in the powerup system (not introduced by this bead) but worth noting. A proper fix would use multiplicative stacking rather than absolute assignment.
- **BERSERKER RAGE overlap:** Same pattern — `berserkerRage` sets `dmgBoost = 1.5` and `speedBoost = 1.3`. GIANT GROWTH would overwrite both. This is a systemic issue with the powerup apply/remove pattern.

### Estimated Complexity
S (Small) — the minimum fix is: one constant change (speedBoost), one HUD text addition, and optionally gold-colored damage numbers if the system exists.

### Dependencies
- None. Fully independent of all other beads.

### Implementation Order
**Priority 5 (last) of this batch.** This is P2 game feel. Implement only after BD-251, BD-250, BD-252 are done. Quick win for morale after the harder fixes.

### Testing Plan
1. Pick up GIANT GROWTH — verify speed penalty feels manageable (not sluggish).
2. Verify "DMG x2" appears on HUD during the effect.
3. Kill zombies during GIANT GROWTH — verify they die noticeably faster (subjective but important).
4. Verify powerup expiry restores normal speed and damage.
5. Pick up GIANT GROWTH while CLAWS OF STEEL is active — document the overwrite behavior for a future powerup stacking fix.
