# Contributing

Guide for developers working on Animals vs Zombies.

## Dev Setup

1. Clone the repository
2. Serve locally with any HTTP server (required for ES module imports):
   ```bash
   python3 -m http.server
   # or
   npx serve .
   ```
3. Open `http://localhost:8000` in a browser with DevTools open

There is no build step, no bundler, no package manager, and no transpiler. All source files are vanilla JavaScript using native ES module syntax (`import`/`export`). Three.js is loaded globally via CDN in `index.html`.

### Project Layout

```
index.html          Entry point (3 canvases, CDN script, module loader)
js/
  game.js           2D game loop, state machine, physics, combat
  state.js          Shared 2D state, constants, type catalogs
  utils.js          Collision detection, particles, stat helpers
  levels.js         Level definitions and procedural terrain
  enemies.js        Zombie/boss/ally spawning and AI
  items.js          Pickup and crate systems
  renderer.js       All 2D drawing functions
  game3d.js         Complete 3D survivor mode (single closure)
```

## How to Add a New Weapon (3D Mode)

Weapons are defined in `js/game3d.js`. Follow these steps:

### 1. Define the weapon type

Add an entry to the `WEAPON_TYPES` constant (line 21 of `game3d.js`):

```js
const WEAPON_TYPES = {
  // ... existing weapons ...
  myWeapon: {
    id: 'myWeapon',
    name: 'MY WEAPON',
    type: 'projectile',  // melee | projectile | aoe | chain | projectile_aoe | boomerang
    color: '#ff00ff',
    desc: 'Short description',
    baseDamage: 10,
    baseCooldown: 1.5,   // seconds between auto-fires
    baseRange: 8,
    maxLevel: 5,
    levelDescs: ['+20% Damage', '+1 Projectile', '+20% Speed', '-20% Cooldown', '+30% Damage'],
  },
};
```

### 2. Add firing logic

Add a case for your weapon in `fireWeapon(w)` (line 1535 of `game3d.js`). This function is called automatically when the weapon's cooldown expires. You receive `w` which is the weapon instance `{ typeId, level, cooldownTimer }`:

```js
function fireWeapon(w) {
  const def = WEAPON_TYPES[w.typeId];
  // ... existing switch/if chain ...

  if (w.typeId === 'myWeapon') {
    // Find nearest enemy, create projectile mesh, push to st.weaponProjectiles
  }
}
```

### 3. Add projectile/effect update logic

If your weapon uses projectiles, add update logic in `updateWeaponProjectiles(dt)` (line 1738 of `game3d.js`). This function runs every frame and handles movement, collision detection, and cleanup:

```js
function updateWeaponProjectiles(dt) {
  for (let i = st.weaponProjectiles.length - 1; i >= 0; i--) {
    const p = st.weaponProjectiles[i];
    // ... existing projectile types ...

    if (p.type === 'myWeapon') {
      // Move projectile, check enemy collisions, apply damage, remove when done
    }
  }
}
```

### 4. Apply level-up scaling

Within `fireWeapon`, scale damage/range/cooldown/projectile count based on `w.level`. Follow the pattern used by existing weapons (e.g., `boneToss` adds projectiles at levels 2 and 5).

The weapon will automatically appear in the level-up upgrade pool once defined in `WEAPON_TYPES`.

## How to Add a New Powerup (3D Mode)

Powerups are temporary buffs found in crate drops.

### 1. Define the powerup

Add an entry to the `POWERUPS_3D` array (line 64 of `game3d.js`):

```js
const POWERUPS_3D = [
  // ... existing powerups ...
  {
    id: 'myPowerup',
    name: 'MY POWERUP',
    color: '#ff00ff',
    colorHex: 0xff00ff,
    desc: 'Effect description',
    duration: 15,  // seconds
    apply: s => { s.myPowerupFlag = true; },
    remove: s => { s.myPowerupFlag = false; },
  },
];
```

### 2. Add state flag

Add the boolean flag to the `st` state object initialization (around line 147 of `game3d.js`):

```js
const st = {
  // ... existing state ...
  myPowerupFlag: false,
};
```

### 3. Add effect logic

Add gameplay effects in `tick()` (line 1973 of `game3d.js`). Check `st.myPowerupFlag` wherever the effect should apply (e.g., in damage calculations, movement, or as a periodic effect):

```js
// Inside tick(), in the appropriate section:
if (st.myPowerupFlag) {
  // Apply your powerup's effect each frame
}
```

The powerup will automatically appear in crate drops once added to `POWERUPS_3D`. The `apply` function is called when the player picks it up, and `remove` is called when the duration expires.

## How to Add a New Item (3D Mode)

Items are permanent equipment pieces that persist for the entire run.

### 1. Define the item

Add an entry to the `ITEMS_3D` array (line 86 of `game3d.js`):

```js
const ITEMS_3D = [
  // ... existing items ...
  {
    id: 'myItem',
    name: 'MY ITEM',
    color: '#ff00ff',
    colorHex: 0xff00ff,
    desc: 'Effect description',
    slot: 'mySlot',  // unique slot name, or reuse existing: armor, glasses, boots, ring, charm, vest, pendant, bracelet, gloves
  },
];
```

### 2. Add slot to state

Add the item slot to `st.items` in the state initialization (around line 209 of `game3d.js`):

```js
items: {
  // ... existing slots ...
  mySlot: false,  // or null for tiered items like armor
},
```

### 3. Apply stat effects

Add the item's effect wherever relevant in `tick()` (line 1973). For example, if it modifies damage:

```js
// In the damage calculation section:
let damage = baseDamage;
if (st.items.mySlot) damage *= 1.2;
```

Items appear as random drops from crates and as level-up choices. The slot system ensures only one item per slot.

## How to Add a New Enemy Variant (2D Mode)

Enemy types are defined in `js/enemies.js`.

### 1. Add the variant in spawning

Modify `spawnZombies()` (line 124 of `enemies.js`) to include your new type. Currently zombies are either `'normal'` or `'big'` (30% chance). Add a new type check:

```js
export function spawnZombies() {
  // ... existing spawn logic ...
  const roll = Math.random();
  let type = 'normal';
  if (roll < 0.3) type = 'big';
  else if (roll < 0.4) type = 'myType';  // 10% chance

  // Set type-specific stats:
  if (type === 'myType') {
    z.w = 40; z.h = 52;
    z.hp *= 1.5;
    z.speed *= 1.2;
  }
}
```

### 2. Add AI behavior (if different)

Modify `updateZombieAI()` in `enemies.js` if your variant needs unique behavior (e.g., ranged attacks, special movement patterns).

### 3. Add rendering

Add a visual branch in `drawZombie(z)` (line 848 of `renderer.js`):

```js
export function drawZombie(z) {
  // ... existing draw logic ...
  if (z.type === 'myType') {
    // Custom drawing code
  }
}
```

## How to Add a New Level (2D Mode)

Levels are defined in `js/levels.js`.

### 1. Add level data

Add a new entry in `getLevelData()` (line 42 of `levels.js`). Follow the pattern of existing levels:

```js
export function getLevelData(level) {
  const levels = {
    // ... existing levels 1-3 ...
    4: {
      width: 6000,
      name: "MY NEW LEVEL",
      bgColor: '#1a1a2a',
      groundColor: '#2a2a4a',
      zombieCount: 30,
      zombieHp: 80,
      zombieSpeed: 1.5,
      platforms: [
        { x: 400, y: 360, w: 120, h: 16 },
        // ... more platforms ...
      ],
      myFeatures: generateMyFeatures(6000),  // optional procedural decorations
    },
  };
  return levels[level];
}
```

### 2. Add background rendering

Add a visual theme in `drawBackground()` (line 1100 of `renderer.js`) by checking `state.currentLevel`:

```js
export function drawBackground() {
  // ... existing level backgrounds ...
  if (state.currentLevel === 4) {
    // Draw sky, background elements, ground details
  }
}
```

### 3. Update progression logic

In `game.js`, update the boss/portal/level-complete logic to handle the new level count (currently hardcoded to 3 levels with the boss on level 3).

## Code Conventions

- No TypeScript, no JSX -- plain ES module JavaScript only
- `camelCase` for variables and functions, `UPPER_SNAKE_CASE` for constants
- JSDoc `@module` headers on each file with dependency and export documentation
- Three.js objects: always dispose geometry and materials in cleanup functions
- 2D entities: plain objects with `x, y, w, h` properties for AABB collision
- Chunk keys: `"cx,cz"` string format (integer coordinates)
