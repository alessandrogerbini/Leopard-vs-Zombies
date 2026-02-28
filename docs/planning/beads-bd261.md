# BD-261: Arcane Howl "Shoot more stuff!" only affects 3 of 10 weapons

**Date:** 2026-02-28
**Source:** Manual playthrough — Arcane Howl works great on Boomerang but doesn't seem to affect other weapons. Investigation confirms only 3/10 weapons use the arcane howl stat.

---

## P1 — Bug / Balance

---

### BD-261: Arcane Howl projectile bonus missing from 7 weapons

**Category:** Bug (incomplete feature implementation)
**Priority:** P1
**File(s):** `js/game3d.js` (weapon firing code ~lines 3244-3535)

**Symptom:**
Arcane Howl ("Shoot more stuff!", +1 projectile per level, max 3) only increases projectile count for Boomerang, Bone Toss, and Fireball. The other 7 weapons completely ignore it.

**Root Cause:**
The helper `getProjectileCount(w)` (line 2893) adds `getHowlBonusProj()`, but only Bone Toss (line 3274) and Boomerang (line 3415) call it. Fireball (line 3379) calls `getHowlBonusProj()` directly. The remaining 7 weapons have no arcane integration at all.

**Current state:**

| Weapon | Type | Arcane? | How | Line |
|--------|------|---------|-----|------|
| Claw Swipe | Melee AoE | NO | Fixed 3 slashes | 3244 |
| Bone Toss | Projectile | YES | `getProjectileCount(w)` | 3274 |
| Poison Cloud | AoE DoT | NO | Single cloud | 3295 |
| Lightning Bolt | Chain | NO | Uses `getChainCount()` | 3322 |
| Fireball | Projectile | YES | `getHowlBonusProj()` | 3379 |
| Boomerang | Projectile | YES | `getProjectileCount(w)` | 3415 |
| Mud Bomb | Projectile | NO | Single bomb | 3434 |
| Beehive Launcher | Projectile | NO | Single hive | 3459 |
| Snowball Turret | Turret | NO | Level-based count | 3487 |
| Stink Line | Trail | NO | Single trail | 3516 |

**Fix — add arcane howl integration to remaining weapons:**

Each weapon type needs a sensible interpretation of "more projectiles":

| Weapon | Proposed Arcane Behavior |
|--------|------------------------|
| **Claw Swipe** | +N extra slash arcs (3 base → 3+N arcs, wider coverage) |
| **Poison Cloud** | +N extra clouds placed on nearby enemies (1 base → 1+N targets) |
| **Lightning Bolt** | +N extra chain targets via `getChainCount()` — add `getHowlBonusProj()` to chain count |
| **Mud Bomb** | +N extra bombs lobbed at nearby enemies (1 base → 1+N bombs with spread) |
| **Beehive Launcher** | +N extra bees spawned per hive (add `getHowlBonusProj()` to `beeCount`) |
| **Snowball Turret** | +N extra snowballs fired per turret volley (turrets shoot faster or multi-shot) |
| **Stink Line** | +N wider trail (increase trail width/coverage, or place parallel trails) |

**Implementation approach — use `getProjectileCount(w)` for all projectile-type weapons:**

For Mud Bomb, wrap the existing single-projectile code in a count loop:
```js
const count = getProjectileCount(w);
for (let i = 0; i < count; i++) {
  // Spread angle: i / count around the target direction
  // ... existing bomb logic with angle offset ...
}
```

For Lightning Bolt, add arcane bonus to chain count:
```js
function getChainCount(w) {
  let chains = ...; // existing level-based logic
  chains += getHowlBonusProj(); // ADD THIS
  return chains;
}
```

For Beehive, add to bee count:
```js
beeCount += getHowlBonusProj();
```

For Poison Cloud, fire at multiple targets:
```js
const count = Math.max(1, 1 + getHowlBonusProj());
// Find N nearest enemies, place a cloud on each
```

For Snowball Turret, increase turret shot count or max turrets:
```js
maxTurrets += getHowlBonusProj();
```

For Stink Line, widen or multiply trails:
```js
const trailCount = 1 + getHowlBonusProj();
// Place parallel trail segments with small lateral offset
```

For Claw Swipe, increase arc count:
```js
const slashCount = 3 + getHowlBonusProj();
```

---

## Acceptance Criteria

1. ALL 10 weapons benefit from Arcane Howl in a weapon-appropriate way
2. Each weapon's arcane behavior feels natural (more projectiles, more chains, more coverage)
3. Arcane Howl level 1/2/3 scaling works correctly for all weapons
4. Rainbow Scarf 1.5x multiplier applies correctly to all weapons
5. No performance regression at max arcane level with multiple weapons active

---

## Estimated Complexity

M (Medium) — 7 weapon fire functions need modification, each relatively small (add loop or increase count).
