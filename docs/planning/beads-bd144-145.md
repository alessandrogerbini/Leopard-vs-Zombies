# Beads: BD-144 and BD-145

**Date:** 2026-02-24
**Source:** Mid-game playtest screenshot — gem polygon overload + Julian's request for scarier tiered zombies

---

## BD-144: XP gems still too numerous and too large mid-game — aggressive merge + size cap

**Category:** Performance — Critical
**Priority:** P0
**File(s):** `js/game3d.js` (gem merge loop ~line 4736, createXpGem ~line 1808, gem update loop ~line 4767)

### Description
Despite the BD-135 merge system, mid-game screenshots show the screen flooded with purple cubes. The merge radius of 1.5 units and 0.5s timer isn't aggressive enough — hundreds of gems still accumulate faster than they merge. Merged gems also scale up to 3.5x base size, which makes them visually overwhelming. The gem system needs to be much more aggressive about consolidation and much more restrained about visual size.

### Fix Approach

1. **Double the merge radius.** Change from `2.25` (1.5^2) to `9.0` (3.0^2):
   ```js
   if (mdx * mdx + mdz * mdz < 9.0) { // 3.0^2 — aggressive merge radius
   ```

2. **Merge more frequently.** Change timer from 0.5s to 0.25s:
   ```js
   st.gemMergeTimer = 0.25;
   ```

3. **Cap merged gem visual scale.** Change max baseScale from 3.5 to 1.8:
   ```js
   const targetScale = Math.min(1.0 + a.xpValue * 0.05, 1.8);
   ```
   This makes even huge XP-value gems only ~1.8x their base size — noticeable but not screen-filling. The `0.05` growth rate (down from `0.15`) means gems need 16 XP to reach max size.

4. **Hard cap on total gem count.** After the merge pass, if gem count still exceeds 80, force-merge the closest pairs until under the cap. Or simpler: in `killEnemy()` where gems are spawned, if `st.xpGems.length > 80`, skip spawning new gem meshes and instead add the XP value to the nearest existing gem:
   ```js
   // In killEnemy gem spawn section:
   if (st.xpGems.length > 80) {
     // Find nearest gem and add value instead of creating new mesh
     let nearest = null, nearDist = Infinity;
     for (const g of st.xpGems) {
       const gd = Math.abs(g.mesh.position.x - e.group.position.x) + Math.abs(g.mesh.position.z - e.group.position.z);
       if (gd < nearDist) { nearDist = gd; nearest = g; }
     }
     if (nearest) {
       nearest.xpValue += 1;
       const targetScale = Math.min(1.0 + nearest.xpValue * 0.05, 1.8);
       nearest.baseScale = targetScale;
       if (nearest.mesh.material === gemMat) nearest.mesh.material = gemMat.clone();
       nearest.mesh.material.emissiveIntensity = Math.min(0.3 + nearest.xpValue * 0.05, 1.0);
     }
   } else {
     st.xpGems.push(createXpGem(...));
   }
   ```

5. **Stop cloning material per gem on creation.** In `createXpGem()`, change `gemMat.clone()` back to `gemMat` (shared material). Only clone during merge when individual emissive is needed. This halves material object count for unmerged gems:
   ```js
   const mesh = new THREE.Mesh(gemGeo, gemMat); // shared, not cloned
   ```

### Acceptance Criteria
- Merge radius is 3.0 units (was 1.5)
- Merge runs every 0.25s (was 0.5s)
- Max gem visual scale capped at 1.8x (was 3.5x)
- Hard cap of 80 gems on screen — above that, new XP gets added to nearest existing gem
- Unmerged gems share a single material instance
- FPS stays above 50 in mid-game (use backtick counter to verify)
- Gems still feel rewarding to collect (bigger = more valuable)

---

## BD-145: Tiered zombie special attacks — make tiers 2-6 increasingly scary (Julian's vision)

**Category:** Enhancement — Gameplay (Julian Critical)
**Priority:** P1
**File(s):** `js/game3d.js` (enemy update loop ~line 4235, createEnemy ~line 1740, constants)

### Description
Currently only tier 9 (Titan) and tier 10 (Overlord) have special attacks (beam and ground slam from BD-84). Julian wants tiers 2 through 6 to feel increasingly dangerous with their own unique attack patterns that force the player to move, dodge, and learn. Right now mid-tier zombies are just faster/tankier versions of tier 1 — there's no behavioral difference.

### Design Goal
Each tier should introduce a new mechanic that the player has to learn and respect. Inspired by classic action-roguelike boss design (Vampire Survivors elites, Binding of Isaac champions, Enter the Gungeon bosses):

- **Telegraphed attacks** — player sees the wind-up and has time to dodge
- **Pattern recognition** — each tier has a signature move
- **Escalating threat** — each tier's attack is scarier than the last
- **Visual clarity** — attacks should be readable at a glance (colored indicators on the ground)

### Proposed Tier Attacks (Needs Research Agent Validation)

This section requires a research agent to analyze attack patterns from similar games and propose the final design. Placeholder ideas:

| Tier | Name | Proposed Attack | Telegraph |
|------|------|----------------|-----------|
| 2 | Brute | **Lunge** — quick dash toward player | Brief red flash before charging |
| 3 | Spitter | **Poison spit** — ranged projectile | Pauses, mouth glows green |
| 4 | Berserker | **Spin attack** — AoE melee whirlwind | Winds up for 0.5s, spins with red trail |
| 5 | Bomber | **Death burst** — explodes on death (AoE) | Flashes orange rapidly before popping |
| 6 | Necromancer | **Summon** — spawns 2 tier-1 zombies | Dark aura pulse, brief channel |

### Acceptance Criteria
- Tiers 2-6 each have a unique, telegraphed special attack
- Attacks force player movement/dodging (not just stat checks)
- Telegraphs are visually clear (ground indicators, colored flashes)
- Attack frequency scales with tier (higher tiers attack more often)
- Attacks deal meaningful but fair damage
- No performance regression from attack visuals
- Julian would approve: scary, fun, learnable

---

## Parallelization Notes

- **BD-144:** Pure performance fix in gem code. Independent.
- **BD-145:** Requires research phase first (design agent), then implementation. The research agent should produce a detailed spec that an implementation agent can execute.
