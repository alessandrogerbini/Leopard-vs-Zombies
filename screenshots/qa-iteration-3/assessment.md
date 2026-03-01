# Iteration 3 — Visual QA Assessment

## Comparison: Concept Art vs Level 20 Leopard

### Scores (0-10 scale)

| Dimension | Iter 1 | Iter 2 | Iter 3 | Justification |
|---|---|---|---|---|
| 1. Overall silhouette | 3 | 4 | 6 | Character reads as a wide, muscular figure from gameplay view; inverted-triangle shape visible with shoulder caps protruding beyond torso edge |
| 2. Total size increase | 4 | 4 | 7 | Level 20 character clearly dwarfs nearby zombies (~2x visual size compared to level 1); dramatic progression visible |
| 3. Shoulder definition | 2 | 5 | 7 | Round spherical shoulder caps are clearly visible, sized correctly, and protrude past the torso width — the signature bodybuilder look |
| 4. Arm thickness & separation | 3 | 3 | 6 | Arms are pushed wide from body with visible bicep bulges; thicker cross-section; gorilla-arm separation achieved |
| 5. Chest/ab definition | 2 | 2 | 3 | Hard to see from top-down camera but pec meshes are present; abs still hidden by camera angle — would score higher from front view |
| 6. Head-to-body ratio | 4 | 5 | 7 | Head stays visibly small while body grows massively; good tiny-head-on-big-body effect at level 20 |
| 7. Stance width | 3 | 3 | 6 | Legs are thick and spread wide with planted feet; no longer stick-thin; reads as stable powerful stance |
| 8. Wearable visibility | 5 | 6 | 6 | Cardboard box registers in HUD; body wearable meshes scale with torso growth; wearable wraps around enlarged body |

### Total: 48 / 80 (60%) — up from 32/80 (40%) in iteration 2

### Summary

Three iterations of the recursive QA loop achieved an 85% improvement in overall scores (26 → 48 out of 80). The three highest-impact changes implemented across iterations:

1. **Group.scale overall size increase** (iter 1) — single biggest visual impact, character now genuinely grows ~2.2x from level 1 to 20
2. **SphereGeometry shoulder caps** (iter 1) — rounded boulder shoulders are the signature bodybuilder feature
3. **Aggressive growth curves + arm/leg push** (iter 2-3) — inverted-triangle silhouette with gorilla arms and planted wide stance

### Remaining gaps (for future iteration)

- Chest/ab definition (score 3) needs torso split into upper/lower blocks — hard to see from top-down camera regardless
- Concept art detail (individual muscle striations, panel lines) would require texture work beyond box/sphere primitives
- Front-facing hero camera would dramatically improve perception of all muscle details
