# BD-243: Character model muscle growth caps too early — should scale through endgame

**Category:** Visual / Character Art / Game Feel
**Priority:** P1-High (creative director feedback)
**File(s):** `js/3d/player-model.js` (muscle growth system), `js/game3d.js` (level-up triggers)

## Problem

The player character model stops visibly growing/bulking around level 10. In a run that can go to level 20+ or beyond, the character should continue getting bigger and more muscular-looking throughout the entire session. The current growth curve plateaus too early, failing to deliver the satisfying visual power fantasy of a late-game character.

This is a creative direction issue flagged by Julian — the muscle growth system was one of the signature visual features and it's currently underwhelming in the mid-to-late game.

## Investigation Needed

An agent should:
1. Read `js/3d/player-model.js` completely — understand the muscle growth system, scaling functions, how growth is applied per level
2. Read the level-up logic in `js/game3d.js` — find where muscle growth is triggered and what values are passed
3. Identify:
   - What is the current growth curve/formula?
   - Is there a hard cap? A diminishing return that effectively caps?
   - What body parts scale (arms, legs, torso, head)?
   - Does growth affect hitbox or just visuals?
   - Are there any visual upgrades beyond size (e.g. surface detail, color shifts, glow)?
4. Design improvements:
   - Extended growth curve that remains visually rewarding through level 25-30+
   - Consider non-linear scaling (subtle early, dramatic late)
   - Consider additional visual markers beyond raw size: vein-like surface lines, muscle definition ridges, color intensity shifts, subtle glow/aura at very high levels
   - Per-animal visual personality at high growth (leopard gets sleeker + more defined, lion gets mane volume, gator gets broader, red panda gets fluffier)
   - Ensure it doesn't break gameplay (character too large to see enemies, camera issues)
5. Write findings and implementation plan to beads

## Deliverable

- Research findings document with current growth curve analysis
- Forward plan with specific visual improvements
- Implementation beads broken out by phase

## Acceptance Criteria

- Growth remains visually noticeable and rewarding from level 1 through level 30+
- Each animal's high-level form feels distinct and powerful
- No gameplay-breaking side effects (camera, collision, visibility)
- Julian approves the creative direction
