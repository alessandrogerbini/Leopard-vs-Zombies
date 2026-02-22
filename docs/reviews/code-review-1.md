# Code Review — Leopard vs Zombies
## Reviewer: In the style of Linus Torvalds
## Date: 2026-02-22

---

## The Verdict

This codebase is a massive 10,000-line monolith where one enormous function (`launch3DGame`) containing 3600 lines manages the entire 3D game. It has serious architectural problems, inconsistent naming, memory leaks from `delete` statements on objects, and a band-aid approach to input handling with underscore-prefixed state flags scattered throughout. That said, the 2D mode is well-organized and the game mechanics work. If you want to ship this, you'll need to refactor the 3D game into actual modules.

---

## Architecture (the big picture problems)

### 1. The 3600-Line Monolith

The entire 3D game is a single exported function `launch3DGame()` in `game3d.js` (lines 121-3619). Everything—camera, rendering, player logic, enemy spawning, item pickups, animations, UI—lives inside this function's scope. This is **not** code, it's a blob.

**The 2D side got it right**: `game.js` imports from separate modules (`enemies.js`, `items.js`, `levels.js`, `renderer.js`), each with clear responsibilities. `game3d.js` should do the same.

**Consequence**: Any attempt to test, reuse, or debug individual systems requires untangling them from the 3600-line spaghetti. Want to unit test the weapon system? Too bad, it's locked inside the closure.

### 2. Inconsistent Input Handling: State Pollution with Underscores

In `game.js`, you have this pattern (lines 121-130):

```javascript
if (keys['Escape'] && !state._escHeld) {
  state._escHeld = true;
  if (state.gameState === 'paused') {
    state.gameState = state._prevState;
  }
}
if (!keys['Escape']) state._escHeld = false;
```

This is repeated for Enter, arrow keys, etc. These underscore-prefixed flags (`_escHeld`, `_enterHeld`, `_selectLeftHeld`, etc.) are **hidden implementation details** polluting the public state object. They're not in the initial state declaration, they just... appear.

Better approach:

```javascript
// At top of module
const keyHeld = {};

function isKeyPressedThisFrame(code) {
  const wasHeld = keyHeld[code] || false;
  const isNowHeld = keys[code];
  keyHeld[code] = isNowHeld;
  return isNowHeld && !wasHeld;
}

// Usage:
if (isKeyPressedThisFrame('Escape')) {
  togglePause();
}
```

This separates **state** from **transient frame flags**.

### 3. Two Completely Different Player Models

The 2D mode uses one player system (`state.js`/`game.js`), the 3D mode builds its own (`game3d.js` line 147+). They don't share code, so bugfixes in one don't apply to the other. The armor system in 2D, the weapon slots in 3D—why are these separate?

**Separation of concerns is dead here.**

---

## The Good (yes, there is some)

### 1. 2D Architecture Is Reasonable

`game.js`, `enemies.js`, `items.js`, `renderer.js`, `levels.js`, `state.js` are well-separated. The 2D game demonstrates what good modular design looks like. Each file has a clear responsibility. This half of the codebase isn't infected yet.

### 2. Physics Are Correct (Both Modes)

The collision detection (`rectCollide` in `utils.js`, lines 4-7) is simple and fast:

```javascript
export function rectCollide(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x &&
         a.y < b.y + b.h && a.y + a.h > b.y;
}
```

No floating-point slop, no over-complicated spatial hashing. Gravity, ground collision, platform collision work correctly in both modes. The 3D jump physics are solid.

### 3. Reasonable Game Design (Feature-Wise)

Weapons, scrolls, items, shrines, power-ups—the feature set is substantial and the progression systems work. The boss fight choreography (telegraphy system in `enemies.js` lines 157-227) is clever: enemies announce attacks before executing them.

### 4. No External Dependencies (Good for a Game Jam)

Single HTML file, loads Three.js from CDN, everything else is vanilla JS. That's commendable.

---

## The Bad (specific issues with code examples)

### 1. Object Delete on Object Properties (game3d.js, lines 570, 657)

```javascript
delete chunkMeshes[key];
delete platformsByChunk[key];
```

**Wrong.** The `delete` operator is slow in V8 and doesn't cleanly dereference objects. You're creating hidden classes and deoptimization. If `platformsByChunk` is large, you're fragmenting the object's internal hash table.

Use a **Map**:

```javascript
const platformsByChunk = new Map();
// ...
platformsByChunk.delete(key);  // Clean, semantic
```

### 2. Memory Leaks in Effects / Weapon Projectiles

In `game3d.js` line 1835:

```javascript
if (eff.life <= 0) {
  disposeEffectMesh(eff.mesh);
  st.weaponEffects.splice(i, 1);
}
```

This is in a loop that's being modified during iteration. **But here's the real problem**: Every frame, you're creating thousands of particle/effect objects. At line 1797:

```javascript
if (eff.type === 'poisonCloud') {
  eff.mesh.children.forEach((c, ci) => {
    if (c.material) c.material.opacity = 0.2 + Math.sin(clock.elapsedTime * 4 + ci) * 0.15;
  });
}
```

You're accessing `clock.elapsedTime` hundreds of times per frame across all effects. Each mesh's material opacity is recalculated. This is expensive and you're not batching.

**The enemy cleanup at line 3108:**

```javascript
st.enemies = st.enemies.filter(e => e.alive);
```

This creates a new array every frame. That's O(n) allocation per frame for potentially hundreds of enemies. Use indices and a swap-delete pattern instead.

### 3. Inconsistent Naming: "st" vs "state" vs "s"

- 2D mode: `state`, `player` (clear names from `state.js`)
- 3D mode line 147: `const st = { ... }` (three letters, cryptic)
- HUD drawing function line 3141: `function drawHUD(ctx, s)` (single letter!)

This inconsistency makes the code harder to read. Pick ONE name and stick with it.

### 4. Hardcoded Magic Numbers Everywhere

`game3d.js` line 152: `attackSpeed: 1.2` — where does 1.2 come from?
Line 156: `collectRadius: 2` — why 2?
Line 164: `zombieDmgMult: diffData.hpMult >= 1.0 ? 2 : diffData.hpMult >= 0.5 ? 3 : 4` — this is a nested ternary that should be a function.

Define constants:

```javascript
const DIFFICULTY_MULTIPLIERS = {
  easy: 2,    // hpMult >= 1.0
  medium: 3,  // 0.5 <= hpMult < 1.0
  hard: 4,    // hpMult < 0.5
};
```

### 5. items.js Crate Handling: Copy-Paste Hell

Lines 102-351 in `items.js` define armor crates, glasses crates, sneakers crates, cleats crates, horse crates. Each one follows the same pattern:

```javascript
export function spawnArmorCrates() { ... }
export function updateArmorPickups() { ... }
export function spawnGlassesCrates() { ... }
export function updateGlassesPickups() { ... }
// ... repeat 5 times
```

This is **pure cargo cult copy-paste**. Create a factory:

```javascript
function createCrateFactory(crateType) {
  return {
    spawn: () => { /* generic spawn logic */ },
    update: () => { /* generic update logic */ },
  };
}

const crateManagers = {
  armor: createCrateFactory('armor'),
  glasses: createCrateFactory('glasses'),
  // ...
};
```

### 6. Floating-Point Comparisons (Minor But Real)

`game3d.js` line 1818:

```javascript
if (eff.mesh.material) eff.mesh.material.opacity = eff.life / 0.3 * 0.5;
```

You're dividing by `0.3`. If `eff.life` is very small, this can produce NaN or Infinity. Add a guard:

```javascript
const opacity = Math.min(1, Math.max(0, eff.life / 0.3 * 0.5));
if (eff.mesh.material) eff.mesh.material.opacity = opacity;
```

### 7. Event Listener Cleanup (game3d.js)

The window keydown/keyup listeners for 3D mode are added but **never removed**:

```javascript
window.addEventListener('keydown', e => { keys3d[e.code] = true; });
window.addEventListener('keyup', e => { keys3d[e.code] = false; });
```

When you switch back to 2D mode, these listeners still fire. Memory leak.

**Fix**: Store the handler functions and remove them on cleanup:

```javascript
const handleKeyDown = e => { keys3d[e.code] = true; };
const handleKeyUp = e => { keys3d[e.code] = false; };
window.addEventListener('keydown', handleKeyDown);
window.addEventListener('keyup', handleKeyUp);

// In cleanup:
window.removeEventListener('keydown', handleKeyDown);
window.removeEventListener('keyup', handleKeyUp);
```

---

## The Ugly (the worst offenders)

### 1. Three.js Object Disposal Pattern

You're calling `dispose()` on materials and geometries (e.g., game3d.js lines 568-569), which is correct, but **you're not disposing the Group or parent objects**. At line 577:

```javascript
d.meshes.forEach(m => { scene.remove(m); m.geometry.dispose(); m.material.dispose(); });
```

But `d` is a decoration that has a `group` somewhere. Are you disposing that group's internal state? If `m` has children, those aren't disposed recursively. Three.js objects hold resources. You need:

```javascript
function disposeGroup(group) {
  group.traverse(child => {
    if (child instanceof THREE.Mesh) {
      child.geometry?.dispose();
      child.material?.dispose();
    }
  });
  scene.remove(group);
}
```

### 2. The Leaderboard / LocalStorage Collision Between Modes

`game.js` lines 32-50 load a 2D leaderboard. `game3d.js` doesn't use the same leaderboard (it has `s.leaderboard3d`). So you have **two separate leaderboards**. If they're supposed to be separate (hard mode vs easy mode by difficulty), document it. Right now it just looks like incomplete refactoring.

### 3. Weapon Cooldown Lies

The cooldown timer is decremented each frame:

```javascript
w.cooldownTimer -= dt;
if (w.cooldownTimer <= 0) {
  w.cooldownTimer = getWeaponCooldown(w);
}
```

But there's no clamp. If you have a massive frame skip (lag), `cooldownTimer` goes deeply negative, and the next fire happens immediately. Use:

```javascript
w.cooldownTimer = Math.max(0, w.cooldownTimer - dt);
```

### 4. The Ambiguous Canvas IDs

In `index.html`:

```html
<canvas id="game" width="960" height="540"></canvas>
<canvas id="game3d" width="960" height="540"></canvas>
<canvas id="hud3d" width="960" height="540"></canvas>
```

This works, but if someone adds a third mode, the naming scheme breaks down. Use semantic data attributes or pass canvases as options to mode launchers.

### 5. Shrine Augments: Mixed Declarative/Imperative State

`game3d.js` lines 236-242:

```javascript
shrines: [],
shrinesByChunk: {},
augments: {},
augmentXpMult: 1,
augmentDmgMult: 1,
augmentArmor: 0,
augmentRegen: 0,
```

You track augment counts in `st.augments` but then have separate multiplier fields. When you apply an augment:

```javascript
const aug = SHRINE_AUGMENTS[Math.floor(Math.random() * SHRINE_AUGMENTS.length)];
const was = (s.augments[aug.id] || 0);
aug.apply(s);
s.augments[aug.id] = was + 1;
```

You **call `aug.apply(s)`** which modifies `st.augmentDmgMult` directly, then you record it in `augments`. This is mixing declarative (state in `augments{}`) with imperative (calling `apply()` functions). If you save/load, or revert an augment, you can't—the state is spread across two representations.

Use **one source of truth**:

```javascript
function applyAllAugments(s) {
  s.augmentDmgMult = 1;
  s.augmentXpMult = 1;
  s.augmentArmor = 0;
  s.augmentRegen = 0;
  for (const [augId, count] of Object.entries(s.augments)) {
    const aug = SHRINE_AUGMENTS.find(a => a.id === augId);
    for (let i = 0; i < count; i++) aug.apply(s);
  }
}
```

---

## Bugs Found (actual defects)

### 1. `for...in` Iteration During Mutation (REAL BUG)

`game3d.js` lines 671-677:

```javascript
for (const key in platformsByChunk) {
  const [cx, cz] = key.split(',').map(Number);
  if (Math.abs(cx - pcx) > VIEW_DIST + 1 || ...) {
    unloadPlatforms(cx, cz);  // Modifies platformsByChunk during iteration!
  }
}
```

This iterates `platformsByChunk` with `for...in` while `unloadPlatforms` calls `delete platformsByChunk[key]`. **This is undefined behavior in JavaScript.** The iteration may skip keys or process deleted keys.

**Fix** — collect keys first:

```javascript
const keysToUnload = [];
for (const key in platformsByChunk) {
  // ... check if should unload ...
  keysToUnload.push(key);
}
keysToUnload.forEach(key => unloadPlatforms(...));
```

### 2. Event Listener Leak on Mode Switch

As described above — keydown/keyup handlers for 3D mode are never removed when returning to 2D.

### 3. Incomplete State Cleanup on Mode Switch

`game.js` lines 213-219 switch to 3D mode:

```javascript
stopGameLoop();
canvas.style.display = 'none';
launch3DGame({
  animal, difficulty: diff,
  onReturn: () => {
    canvas.style.display = '';
    Object.keys(keys).forEach(k => { keys[k] = false; });
    state.gameState = 'title';
    startGameLoop();
  }
});
```

You clear the `keys` object and set `gameState = 'title'` but don't clear `state.particles`, `state.floatingTexts`, `state.zombies`, etc. If the player was mid-game, the old state persists. Should call a full reset function.

### 4. Null Dereference Risk in Crate Proximity

```javascript
const pickup = createItemPickup(lx, lz);
if (pickup) st.itemPickups.push(pickup);
```

If `createItemPickup` returns `null`, you don't push. But later, when iterating itemPickups for collision, if you assumed all items are valid, you'd crash. Add assertions or validate on access.

---

## Performance Concerns

### 1. Particle System Creates 1000s of Objects Per Minute

Poison cloud particles update opacity every frame per child per effect. With 10 poison clouds active and 20 particles each, that's 200+ opacity value writes per frame. Use `InstancedBufferGeometry` instead.

### 2. Enemy Distance Checks Use sqrt()

```javascript
const enemyDist = Math.sqrt(dx * dx + dz * dz);
if (enemyDist < rangeLimit) { /* attack */ }
```

100 enemies = 100 sqrt() calls per frame. Use squared distances:

```javascript
const enemyDistSq = dx * dx + dz * dz;
if (enemyDistSq < rangeLimitSq) { /* attack */ }
```

### 3. Array.filter() Creates New Array Every Frame

```javascript
st.enemies = st.enemies.filter(e => e.alive);
```

O(n) allocation per frame. Use swap-delete or a pool.

---

## File-by-File Notes

| File | Verdict |
|------|---------|
| **index.html** | Clean. No issues. |
| **state.js** | Good. Clear, declarative. Minor: document `POWERUP_AMMO` meaning. |
| **utils.js** | Solid. `rectCollide` is fast and correct. Keep this style. |
| **levels.js** | Functional. Magic coordinates acceptable for game jam. |
| **items.js** | Copy-paste hell. Refactor to factory pattern. Logic itself is correct. |
| **enemies.js** | Well-written. Telegraph system is clever. Minor: extract nested ternaries. |
| **renderer.js** | Verbose but correct. Acceptable for 2D renderer. |
| **game.js** | Solid 2D glue code. Isolate underscore input flags. |
| **game3d.js** | **Problem child.** Break into 7+ modules: Player, Enemies, Weapons, Terrain, Shrines, UI, GameState. Each ~500 lines. |

---

## Final Word

You've built a game that **works**. The feature set is solid, the mechanics are fun, and the code is **functional**. But it's not **maintainable**. The 3D mode is a monolith that will be hell to debug or extend. The 2D mode shows you know how to write modular code—apply those lessons to 3D.

**Immediate fixes (priority order):**
1. **Break up `game3d.js`** into separate modules.
2. **Use Map/Set instead of delete on objects** for chunk/platform cleanup.
3. **Fix the `for...in` iteration bug** during unloading (line 671).
4. **Remove event listener leaks** (keydown/keyup handlers on mode switch).
5. **Isolate input state** (move underscore flags into a separate object).
6. **Consolidate leaderboards** or document why they're separate.

The bones are good. The execution needs polish. Spend a week refactoring now, save yourself months of pain later.
