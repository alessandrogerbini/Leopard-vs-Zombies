# BD-242: Unique power attacks per animal — visual identity + scaling + item synergy

**Category:** Game Design / Visual / Combat
**Priority:** P1-High
**File(s):** `js/game3d.js` (power attack logic + visuals), `js/3d/constants.js`, `js/3d/hud.js` (charge bar label)
**Deliverable:** Forward plan document (`docs/planning/power-attack-forward-plan.md`) → implementation beads

## Problem

The power attack (hold B/Enter, release for AoE) is identical for all 4 animals:
- Same yellow expanding box visual
- Same damage/radius behavior
- No label on the charge bar indicating what the attack is
- No scaling with player level
- No interaction with item/howl choices
- Undermines character identity — each animal should feel distinct

The charge bar UI itself is great and should be preserved.

## Design Goals

1. **Each animal gets a unique power attack** with distinct visuals, particle effects, and gameplay feel
2. **The charge bar should label the attack** (e.g. "POUNCE", "TAIL SPIN", "ROAR", "DEATH ROLL")
3. **Power attacks scale with level** — damage, radius, and/or visual intensity increase as the player levels
4. **Item/howl synergy** — certain items or howls should modify or enhance the power attack in interesting ways
5. **Preserve the charge mechanic** — hold 0-2s, bigger charge = bigger effect

## Forward Plan Scope

An agent should:
1. Read the current power attack implementation in game3d.js (search for charging/power attack logic)
2. Read the animal stat profiles (state.js or constants.js)
3. Read the item and howl systems to identify synergy opportunities
4. Design 4 unique power attacks (one per animal) with:
   - Name and thematic fit
   - Visual description (particles, colors, shapes, animations)
   - Mechanical behavior (AoE shape, damage pattern, special effects)
   - Level scaling curve
   - 2-3 item/howl synergies per attack
5. Write the forward plan to `docs/planning/power-attack-forward-plan.md`
6. Break implementation into numbered beads

## Acceptance Criteria

- Forward plan covers all 4 animals with distinct, thematically appropriate attacks
- Each attack has clear visual and mechanical descriptions
- Level scaling is defined
- Item synergies are specific (which items, what effect)
- Implementation is broken into manageable beads
- Charge bar label design is included
