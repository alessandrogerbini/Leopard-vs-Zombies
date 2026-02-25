# Bead: BD-217 — Zombies can spawn directly on top of the player

**Date:** 2026-02-24
**Source:** Julian's playtest — zombies spawning directly under/next to the player model.

---

## Priority Legend

| Priority | Meaning | Action Timeline |
|----------|---------|-----------------|
| **P1** | Critical UX or balance issue affecting playability | Next sprint |

---

## P1 -- Balance / Fairness

---

### BD-217: Add spawn exclusion zone around the player

**Category:** Balance — Spawn Fairness
**Priority:** P1
**File(s):** `js/game3d.js` ~lines 2304-2322 (spawnAmbient), 2333-2345 (spawnWaveEvent), 4971-4981 (initial burst)

**Description:** The three zombie spawn functions all calculate positions relative to the player using angle + distance, then clamp to map boundaries. However, when the player is near a map edge, the boundary clamp can push the spawn point BACK toward the player, potentially placing zombies very close or even on top of them.

Current spawn distances:
- Initial burst: 15-20 units (can clamp to <5 if player near edge)
- Ambient spawn: 18-26 units early, 25-35 later (can clamp similarly)
- Wave spawn: 20-35 units (can clamp similarly)

There is NO minimum distance validation. The `createEnemy()` function at line 1741 accepts any coordinates without checking proximity to the player.

Challenge shrine boss spawns at shrine position + 5 units offset are exempt from this fix (intentional — shrine is activated by proximity).

**Fix:**

1. Add a spawn validation helper:
```js
function isValidSpawnPosition(x, z, minDist) {
  const dx = x - st.playerX;
  const dz = z - st.playerZ;
  return (dx * dx + dz * dz) >= minDist * minDist;
}
```

2. In all three spawn functions (spawnAmbient, spawnWaveEvent, initial burst), after calculating and clamping the position, check if it's within the exclusion zone. If so, re-roll the angle and try again (max 3 attempts, then skip that zombie):
```js
let sx, sz, attempts = 0;
const MIN_SPAWN_DIST = 12; // minimum 12 units from player
do {
  const angle = Math.random() * Math.PI * 2;
  sx = Math.max(-MAP_HALF + 2, Math.min(MAP_HALF - 2, st.playerX + Math.cos(angle) * dist));
  sz = Math.max(-MAP_HALF + 2, Math.min(MAP_HALF - 2, st.playerZ + Math.sin(angle) * dist));
  attempts++;
} while (!isValidSpawnPosition(sx, sz, MIN_SPAWN_DIST) && attempts < 3);
if (attempts >= 3) continue; // skip this zombie rather than spawn on player
```

3. Do NOT apply exclusion to challenge shrine spawns (line 6237) — those are intentionally close to the shrine the player activated.

**Acceptance Criteria:**
- No zombie spawns within 12 units of the player
- Spawn near map edges correctly re-rolls instead of clamping onto player
- Challenge shrine bosses still spawn near the shrine (exempt)
- Wave spawns still produce the correct total count (minus any skipped)
- No performance impact (max 3 re-rolls is negligible)
- Initial burst at game start spawns at safe distances

---

## Conflict Analysis

BD-217 touches game3d.js spawn functions (~lines 2304-2345, 4971-4981) — NO conflict with BD-213 (keydown handler), BD-214 (hurt flash), BD-215 (boss attacks), or BD-216 (death feedback).
