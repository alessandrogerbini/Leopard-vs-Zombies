# Animals vs Zombies

A browser-based action game featuring four playable animal characters battling waves of zombies across two distinct game modes. Built entirely with vanilla JavaScript and Three.js, the game offers a 2D side-scrolling platformer campaign and a 3D top-down roguelike survivor mode -- no build step required.

## How to Run

Open `index.html` directly in a modern browser, or use a local HTTP server (required for ES module imports in some browsers):

```bash
# Option A: Python
python3 -m http.server

# Option B: Node.js
npx serve .
```

Then navigate to `http://localhost:8000` (Python) or `http://localhost:3000` (serve).

## Game Modes

### 2D Classic Mode

A side-scrolling platformer with 3 levels and boss fights:

| Level | Name           | Width  | Zombies | Boss |
|-------|----------------|--------|---------|------|
| 1     | The Dark Forest| 3200px | 12      | Yes  |
| 2     | The Highway    | 4000px | 18      | Yes  |
| 3     | The Ice Age    | 5000px | 25      | Yes  |

Clear all zombies, collect the diamond, defeat the boss, and enter the portal to advance. Three lives per run with score-based leaderboards stored per difficulty.

### 3D Roguelike Survivor Mode

An infinite wave-based survival game rendered in 3D with a top-down camera. Survive as long as possible while leveling up, collecting weapons and scrolls, breaking shrines for augments, and activating difficulty totems for bonus XP/score. Zombies use a 10-tier merge system where same-tier zombies collide and combine into stronger variants. Wave events trigger every 4 minutes with large enemy bursts.

## Controls

### 2D Classic Mode

| Key           | Action                          |
|---------------|---------------------------------|
| Arrow Left/Right | Move left/right              |
| Arrow Up      | Jump                            |
| Arrow Down    | (used in flight with Wings)     |
| Space         | Attack                          |
| Enter         | Confirm selection               |
| Escape        | Pause / Unpause                 |

### 3D Survivor Mode

| Key                        | Action                           |
|----------------------------|----------------------------------|
| W / Arrow Up               | Move forward                     |
| S / Arrow Down             | Move backward                    |
| A / Arrow Left             | Move left                        |
| D / Arrow Right            | Move right                       |
| Space                      | Jump                             |
| Enter / B (hold & release) | Charge and release power attack  |
| Escape                     | Pause menu (Resume/Restart/Quit) |
| Arrow Left/Right (menus)   | Navigate upgrade / pause menus   |
| Enter / Space (menus)      | Confirm selection                |

Note: Gamepad is not currently supported.

## Animal Selection

Choose from four playable animals, each with different stat profiles:

| Animal     | Speed | Damage | HP  | Description      | 3D Starting Weapon |
|------------|-------|--------|-----|------------------|--------------------|
| Leopard    | 1.0x  | 1.0x   | 100 | Balanced fighter | Claw Swipe         |
| Red Panda  | 1.2x  | 0.8x   | 80  | Fast & agile     | Boomerang          |
| Lion       | 0.85x | 1.3x   | 120 | Strong & tough   | Lightning Bolt     |
| Gator      | 0.75x | 1.5x   | 150 | Slow but deadly  | Poison Cloud       |

## Difficulty Modes

| Difficulty | HP Modifier | Score Multiplier | Description             |
|------------|-------------|------------------|-------------------------|
| Easy       | 100%        | 1.0x             | Full HP -- great for learning |
| Medium     | 55%         | 1.75x            | A real challenge        |
| Hard       | 35%         | 2.5x             | For hardcore players    |

## Feature Highlights

### Weapons (3D Mode)
Six weapon types with 5 upgrade levels each, up to 4 active weapon slots (unlocked at levels 1/5/10/15):
- **Claw Swipe** -- melee AoE arc slash
- **Bone Toss** -- ranged bone projectile (gains extra projectiles)
- **Poison Cloud** -- damage-over-time area at enemy position
- **Lightning Bolt** -- chains between multiple enemies
- **Fireball** -- projectile that explodes on impact
- **Boomerang** -- piercing projectile that returns to the player

### Scrolls (3D Mode)
Six passive scroll types that stack multiple times:
- **Power** (+15% weapon damage, max 5)
- **Haste** (-15% cooldowns, max 5)
- **Arcane** (+1 projectile count, max 3)
- **Vitality** (+20 max HP & heal, max 5)
- **Fortune** (+30% XP gain, max 3)
- **Range** (+20% weapon range, max 5)

### Powerups
- **2D Mode (7 types):** Jumpy Boots, Claws of Steel, Super Fangs, Race Car, Banana Cannon, Litter Box, Angel Wings -- ammo-based, found in breakable crates
- **3D Mode (18 types):** All of the above plus Frost Nova, Berserker Rage, Ghost Form, Earthquake Stomp, Vampire Fangs, Lightning Shield, Giant Growth, Time Warp, Magnet Aura, Mirror Image, Bomb Trail, Regen Burst -- duration-based, found in crate drops

### Items (3D Mode)
11 permanent equipment pieces across different slots: Leather Armor, Chainmail, Aviator Glasses, Cowboy Boots, Soccer Cleats, Magnet Ring, Lucky Charm, Thorned Vest, Health Pendant, Shield Bracelet, Crit Gloves.

### Shrines & Augments (3D Mode)
20 breakable shrines placed at game start. Each shrine grants a random augment (+5% Max HP, +5% XP, +5% Damage, +5% Speed, +5% Attack Speed, +10% Pickup Radius, +3% Armor, or +0.5 HP/s Regen).

### Difficulty Totems (3D Mode)
8 totems scattered on the map. Activating a totem increases zombie HP (+15%), zombie speed (+10%), and spawn rate (+15%), but also boosts XP (+25%) and score (+25%) per totem.

### Zombie Tier Merging (3D Mode)
Zombies range from tier 1 to tier 10. When two same-tier zombies collide, they merge into a single higher-tier zombie with increased stats and visual upgrades (glowing eyes, horns, auras).

## Tech Stack

- **Rendering:** Three.js r128 (loaded via CDN) for 3D, Canvas 2D API for HUD overlay and the entire 2D mode
- **Language:** Vanilla JavaScript with ES modules
- **Build:** None -- no bundler, transpiler, or package manager required
- **Persistence:** localStorage for per-difficulty leaderboards (2D and 3D)
- **Resolution:** 960x540 base canvas; 3D mode expands to fullscreen viewport
