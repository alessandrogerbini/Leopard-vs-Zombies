/**
 * @module levels
 * @description Level layout definitions for the 2D Classic mode's three stages.
 * Each level specifies world dimensions, visual theme, zombie stats, platform
 * placements, and procedurally generated background decorations. Internal helper
 * functions scatter trees, highway props, and ice features across the level
 * width with randomized spacing.
 *
 * Dependencies: none
 * Exports: 1 function — getLevelData
 *
 * Key concepts:
 * - Levels are keyed 1-3: Dark Forest, Highway, Ice Age.
 * - Platforms are hand-placed; decorations are procedurally generated.
 * - Each call to getLevelData produces fresh random decorations (no caching).
 * - Zombie stats scale with level: more enemies, higher HP, varied speed.
 */

/**
 * @typedef {Object} LevelData
 * @property {number} width - Total world width in pixels.
 * @property {string} name - Display name shown on the HUD (e.g. "THE DARK FOREST").
 * @property {string} bgColor - CSS color for the sky/background fill.
 * @property {string} groundColor - CSS color for the ground plane.
 * @property {number} zombieCount - Base number of zombies spawned in this level.
 * @property {number} zombieHp - Base HP for each zombie in this level.
 * @property {number} zombieSpeed - Base movement speed for zombies in this level.
 * @property {Array<{x: number, y: number, w: number, h: number}>} platforms - Static platform rectangles the player can stand on.
 * @property {Array<{x: number, h: number}>} [trees] - (Level 1) Generated background trees with randomized height.
 * @property {Array<{x: number, type: string, color?: string}>} [highway] - (Level 2) Generated highway decoration objects (cars, signs, lamps).
 * @property {Array<{x: number, type: string, h?: number}>} [iceFeatures] - (Level 3) Generated ice terrain features (icicles, mounds, frozen trees).
 */

// Level definitions and background generators

/**
 * Generate randomized background tree decorations across the level width.
 * Trees are spaced 150-350px apart with heights between 80-140px, inset
 * 200px from each edge to avoid spawning at level boundaries.
 *
 * @param {number} width - Total level width in pixels.
 * @returns {Array<{x: number, h: number}>} Array of tree positions and heights.
 */
function generateTrees(width) {
  const trees = [];
  for (let x = 200; x < width - 200; x += 150 + Math.random() * 200) {
    trees.push({ x, h: 80 + Math.random() * 60 });
  }
  return trees;
}

/**
 * Generate randomized highway decoration objects (cars, road signs, street
 * lamps) across the level width. Distribution: 50% cars, 25% signs, 25% lamps.
 * Objects are spaced 120-300px apart, inset 200px from each edge.
 *
 * @param {number} width - Total level width in pixels.
 * @returns {Array<{x: number, type: 'car'|'sign'|'lamp', color?: string}>} Array of highway prop descriptors.
 */
function generateHighway(width) {
  const items = [];
  const carColors = ['#8b0000', '#2f4f4f', '#1a1a6e', '#4a4a4a', '#6b3a00', '#2e8b57'];
  for (let x = 200; x < width - 200; x += 120 + Math.random() * 180) {
    const roll = Math.random();
    if (roll < 0.5) {
      items.push({ x, type: 'car', color: carColors[Math.floor(Math.random() * carColors.length)] });
    } else if (roll < 0.75) {
      items.push({ x, type: 'sign' });
    } else {
      items.push({ x, type: 'lamp' });
    }
  }
  return items;
}

/**
 * Generate randomized ice terrain features (icicles, snow mounds, frozen
 * trees) across the level width. Distribution: 40% icicles, 30% mounds,
 * 30% frozen trees. Objects are spaced 100-280px apart, inset 200px from
 * each edge.
 *
 * @param {number} width - Total level width in pixels.
 * @returns {Array<{x: number, type: 'icicle'|'mound'|'frozenTree', h?: number}>} Array of ice feature descriptors.
 */
function generateIceFeatures(width) {
  const features = [];
  for (let x = 200; x < width - 200; x += 100 + Math.random() * 180) {
    const roll = Math.random();
    if (roll < 0.4) {
      features.push({ x, type: 'icicle', h: 30 + Math.random() * 50 });
    } else if (roll < 0.7) {
      features.push({ x, type: 'mound', h: 15 + Math.random() * 25 });
    } else {
      features.push({ x, type: 'frozenTree', h: 80 + Math.random() * 60 });
    }
  }
  return features;
}

/**
 * Retrieve the complete layout data for a given level number. Returns a fresh
 * object each call because decoration arrays are procedurally regenerated.
 *
 * @param {number} level - Level number (1, 2, or 3).
 * @returns {LevelData|undefined} Level configuration object, or undefined for invalid level numbers.
 * @see LevelData
 */
export function getLevelData(level) {
  const levels = {
    1: {
      width: 3200,
      name: "THE DARK FOREST",
      bgColor: '#1a2a1a',
      groundColor: '#2d4a2d',
      zombieCount: 12,
      zombieHp: 30,
      zombieSpeed: 0.92,
      platforms: [
        { x: 400, y: 360, w: 120, h: 16 },
        { x: 700, y: 300, w: 100, h: 16 },
        { x: 1000, y: 340, w: 140, h: 16 },
        { x: 1350, y: 280, w: 100, h: 16 },
        { x: 1700, y: 360, w: 120, h: 16 },
        { x: 2000, y: 300, w: 100, h: 16 },
        { x: 2400, y: 340, w: 140, h: 16 },
        { x: 2700, y: 280, w: 100, h: 16 },
      ],
      trees: generateTrees(3200),
    },
    2: {
      width: 4000,
      name: "THE HIGHWAY",
      bgColor: '#1a1a22',
      groundColor: '#2a2a2e',
      zombieCount: 18,
      zombieHp: 45,
      zombieSpeed: 0.86,
      platforms: [
        { x: 300, y: 370, w: 100, h: 16 },
        { x: 550, y: 300, w: 80, h: 16 },
        { x: 800, y: 250, w: 100, h: 16 },
        { x: 1100, y: 340, w: 120, h: 16 },
        { x: 1400, y: 280, w: 80, h: 16 },
        { x: 1700, y: 360, w: 100, h: 16 },
        { x: 2000, y: 300, w: 120, h: 16 },
        { x: 2300, y: 250, w: 80, h: 16 },
        { x: 2600, y: 340, w: 100, h: 16 },
        { x: 2900, y: 280, w: 120, h: 16 },
        { x: 3200, y: 360, w: 100, h: 16 },
        { x: 3500, y: 300, w: 80, h: 16 },
      ],
      highway: generateHighway(4000),
    },
    3: {
      width: 5000,
      name: "THE ICE AGE",
      bgColor: '#0a1a2a',
      groundColor: '#8aaacc',
      zombieCount: 25,
      zombieHp: 60,
      zombieSpeed: 1.38,
      platforms: [
        { x: 300, y: 360, w: 100, h: 16 },
        { x: 550, y: 290, w: 80, h: 16 },
        { x: 800, y: 220, w: 100, h: 16 },
        { x: 1050, y: 340, w: 120, h: 16 },
        { x: 1350, y: 270, w: 80, h: 16 },
        { x: 1600, y: 360, w: 100, h: 16 },
        { x: 1900, y: 300, w: 120, h: 16 },
        { x: 2200, y: 240, w: 80, h: 16 },
        { x: 2500, y: 340, w: 100, h: 16 },
        { x: 2800, y: 280, w: 120, h: 16 },
        { x: 3100, y: 360, w: 100, h: 16 },
        { x: 3400, y: 300, w: 80, h: 16 },
        { x: 3700, y: 250, w: 100, h: 16 },
        { x: 4000, y: 340, w: 120, h: 16 },
        { x: 4400, y: 300, w: 100, h: 16 },
      ],
      iceFeatures: generateIceFeatures(5000),
    }
  };
  return levels[level];
}
