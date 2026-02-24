# Beads: Crash Bug & Performance (BD-134 through BD-136)

**Date:** 2026-02-24
**Source:** Live gameplay crash report — "too much recursion" InternalError + viewport flooded with floating text + XP gem polygon overload

---

## BD-134: CRITICAL — Infinite recursion crash: killEnemy → spawnExplosion → damageEnemy → killEnemy

**Category:** Bug — Game-breaking crash
**Priority:** P0
**File(s):** `js/game3d.js` (lines 2237-2238, 2291-2301, 2934-2952)

### Description
When the Whoopee Cushion item is equipped, `killEnemy()` has a 20% chance to call `spawnExplosion()` (line 2237-2238). `spawnExplosion()` iterates all enemies and calls `damageEnemy()` on those within the blast radius (lines 2944-2952). If `damageEnemy()` reduces an enemy's HP to zero, it calls `killEnemy()` (line 2301). That kill can trigger another Whoopee Cushion explosion, which damages more enemies, which die, which explode... creating unbounded recursion until the browser throws `InternalError: too much recursion`.

Stack trace (observed):
```
killEnemy game3d.js:2238
spawnExplosion game3d.js:2950
damageEnemy game3d.js:2301
killEnemy game3d.js:2238
spawnExplosion game3d.js:2950
... (hundreds of frames)
```

This is a 100% game-crashing bug whenever the player has a Whoopee Cushion and kills enemies in a dense group. The crash also spawns hundreds of floating "BOOM!" texts and explosion meshes before the stack overflows, flooding the viewport.

### Fix Approach
Add a recursion guard flag that prevents Whoopee Cushion explosions from triggering further Whoopee Cushion explosions:

```js
// At module scope or in state init:
let _inExplosionChain = false;

// In killEnemy(), wrap the Whoopee Cushion block:
if (st.items.cushion && Math.random() < 0.20 && !_inExplosionChain) {
  _inExplosionChain = true;
  spawnExplosion(e.group.position.x, e.group.position.z, 2.5, 15 * getPlayerDmgMult());
  st.floatingTexts3d.push({ text: 'BOOM!', color: '#ff88cc', x: e.group.position.x, y: e.group.position.y + 2, z: e.group.position.z, life: 1 });
  _inExplosionChain = false;
}
```

This allows the initial explosion to kill nearby enemies normally (they die, drop loot, etc.), but those chain-killed enemies will NOT trigger further Whoopee Cushion explosions. The guard is cleared after the initial explosion finishes processing.

### Acceptance Criteria
- Whoopee Cushion explosions do NOT trigger further Whoopee Cushion explosions (no chain reaction)
- Enemies killed by the AoE blast still die normally (death animation, loot drops, XP)
- The initial Whoopee Cushion explosion still works as intended (20% chance, AoE damage)
- No `InternalError: too much recursion` under any circumstances
- No floating text or explosion mesh spam from chain reactions

---

## BD-135: XP gem performance — too many polygons from accumulated gems

**Category:** Performance — Rendering
**Priority:** P1
**File(s):** `js/game3d.js` (lines 1741-1757, `gemGeo`/`gemMat`/`createXpGem`; XP gem update loop)

### Description
Each XP gem is an individual `THREE.Mesh` with `BoxGeometry(0.35, 0.35, 0.35)` (12 triangles) and its own `MeshLambertMaterial`. In mid-to-late game with high kill rates, hundreds of XP gems accumulate on the ground, each as a separate draw call. At 200+ gems, this creates a measurable FPS drop.

The problem compounds with:
- Loot drop XP bursts spawning 3 gems each (line 2274)
- Normal enemy kill XP gems
- Map gems from initial generation
- Gems that the player doesn't immediately collect

### Fix Approach
Implement an XP gem merge system with density-based visual scaling:

1. **Halve default gem size:** Change `BoxGeometry(0.35, 0.35, 0.35)` to `BoxGeometry(0.2, 0.2, 0.2)`. Gems should be small by default.

2. **Add XP value to gems:** Each gem tracks an `xpValue` field (default 1). When gems are close together, merge them:
   ```js
   function createXpGem(x, z, xpValue = 1) {
     const mesh = new THREE.Mesh(gemGeo, gemMat.clone());
     const h = terrainHeight(x, z);
     mesh.position.set(x, h + 0.5, z);
     scene.add(mesh);
     return { mesh, bobPhase: Math.random() * Math.PI * 2, xpValue };
   }
   ```

3. **Merge pass in update loop:** Every ~0.5 seconds, scan for gems within 1.5 units of each other and merge them:
   ```js
   // Merge nearby XP gems
   if (st.gemMergeTimer <= 0) {
     st.gemMergeTimer = 0.5;
     for (let i = st.xpGems.length - 1; i >= 0; i--) {
       const a = st.xpGems[i];
       if (!a.mesh) continue;
       for (let j = i - 1; j >= 0; j--) {
         const b = st.xpGems[j];
         if (!b.mesh) continue;
         const dx = a.mesh.position.x - b.mesh.position.x;
         const dz = a.mesh.position.z - b.mesh.position.z;
         if (dx * dx + dz * dz < 2.25) { // 1.5^2
           a.xpValue += b.xpValue;
           scene.remove(b.mesh);
           b.mesh.geometry.dispose();
           b.mesh = null;
           st.xpGems.splice(j, 1);
           i--;
           // Scale merged gem based on total XP value
           const s = Math.min(0.2 + a.xpValue * 0.03, 0.7);
           a.mesh.scale.set(s / 0.2, s / 0.2, s / 0.2);
           // Brighten emissive based on density
           const brightness = Math.min(0.3 + a.xpValue * 0.05, 1.0);
           a.mesh.material.emissiveIntensity = brightness;
         }
       }
     }
   }
   st.gemMergeTimer -= dt;
   ```

4. **Visual scaling:** Merged gems grow in size (up to 3.5x base) and brightness (emissive intensity increases), making dense gem clusters visually distinct and rewarding to collect.

5. **XP collection uses value:** When the player collects a gem, award `gem.xpValue` instead of 1.

### Acceptance Criteria
- Default gem size is ~half the current size (0.2 vs 0.35)
- Nearby gems (within 1.5 units) merge into a single larger gem
- Merged gems scale up in size proportional to their total XP value
- Merged gems glow brighter (higher emissive intensity)
- Collecting a merged gem awards the full combined XP value
- Total gem count on screen stays manageable (< 100 even in late game)
- No visual popping or jarring transitions during merges
- FPS improvement measurable in late-game scenarios

---

## BD-136: Floating text spam — too many simultaneous floating texts clutter viewport

**Category:** Performance/UX — HUD
**Priority:** P2
**File(s):** `js/game3d.js` (lines 398, 5020-5027; all `floatingTexts3d.push()` call sites)

### Description
Floating text announcements (damage numbers, "BOOM!", loot names, "+XP", "+HEALTH", etc.) have no cap on simultaneous count. When many enemies die in quick succession (e.g., from AoE weapons, power attack, or Whoopee Cushion explosions), dozens of floating texts spawn simultaneously, covering the viewport with overlapping text.

The playthrough showed the viewport "filled with text over the bosses and small zombies," making gameplay unreadable.

### Fix Approach
Cap the maximum simultaneous floating texts and prioritize important messages:

1. **Hard cap:** Before pushing a new floating text, check if the array exceeds a max (e.g., 15). If so, remove the oldest entries to make room:
   ```js
   const MAX_FLOATING_TEXTS = 15;
   function addFloatingText(text, color, x, y, z, life) {
     if (st.floatingTexts3d.length >= MAX_FLOATING_TEXTS) {
       st.floatingTexts3d.splice(0, st.floatingTexts3d.length - MAX_FLOATING_TEXTS + 1);
     }
     st.floatingTexts3d.push({ text, color, x, y, z, life });
   }
   ```

2. **Deduplicate rapid identical texts:** If the same text was already pushed in the last 0.3 seconds, skip it. This prevents "BOOM! BOOM! BOOM!" spam from Whoopee Cushion chains.

3. **Shorter lifetimes for common messages:** Reduce life for damage numbers and "BOOM!" to 0.5s (from 1.0s). Keep important messages like item names and boss kills at their current durations.

### Acceptance Criteria
- No more than 15 floating texts visible simultaneously
- Duplicate texts within 0.3s are suppressed
- Important messages (boss kill, item pickup, totem activation) are never suppressed
- Common messages ("BOOM!", damage numbers) use shorter lifetimes
- The viewport remains readable during intense combat
- No information loss for important gameplay events

---

## Parallelization Notes

### Independent (can run in parallel)
- **BD-134 (P0):** Touches only `killEnemy` (line 2237). Quick guard addition. **MUST BE FIXED FIRST.**
- **BD-135 (P1):** Touches `createXpGem`, `gemGeo`/`gemMat` (lines 1741-1757), and XP gem update loop. Independent of BD-134.
- **BD-136 (P2):** Touches `floatingTexts3d.push()` call sites (15+ locations) and floating text update loop (line 5021). **LOW conflict with BD-134** (BD-134's BOOM! text push is one call site).

### Recommended Execution
1. Fix BD-134 immediately (< 5 minutes, game is unplayable without it)
2. BD-135 and BD-136 can be done in parallel after BD-134
