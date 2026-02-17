// Level definitions and background generators

function generateTrees(width) {
  const trees = [];
  for (let x = 200; x < width - 200; x += 150 + Math.random() * 200) {
    trees.push({ x, h: 80 + Math.random() * 60 });
  }
  return trees;
}

function generateGravestones(width) {
  const stones = [];
  for (let x = 200; x < width - 200; x += 100 + Math.random() * 150) {
    stones.push({ x, h: 20 + Math.random() * 20 });
  }
  return stones;
}

function generateTorches(width) {
  const torches = [];
  for (let x = 200; x < width - 200; x += 200 + Math.random() * 200) {
    torches.push({ x, flicker: Math.random() * Math.PI * 2 });
  }
  return torches;
}

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
      name: "THE GRAVEYARD",
      bgColor: '#1a1a2a',
      groundColor: '#3a3a4a',
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
      gravestones: generateGravestones(4000),
    },
    3: {
      width: 5000,
      name: "THE ZOMBIE FORTRESS",
      bgColor: '#2a1a1a',
      groundColor: '#4a2a2a',
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
      torches: generateTorches(5000),
    }
  };
  return levels[level];
}
