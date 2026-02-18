// Level definitions and background generators

function generateTrees(width) {
  const trees = [];
  for (let x = 200; x < width - 200; x += 150 + Math.random() * 200) {
    trees.push({ x, h: 80 + Math.random() * 60 });
  }
  return trees;
}

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
