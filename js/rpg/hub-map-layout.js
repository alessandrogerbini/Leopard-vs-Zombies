/**
 * @module rpg/hub-map-layout
 * @description Pure responsive geometry and navigation for the Rescue Hub map.
 *
 * Dependencies: none
 * Exports: getGuideOverlayLayout, getHubMapLayout, hitTestGuideDismiss,
 *   hitTestHubMap, getDirectionalNeighbor
 */

const ANCHORS = {
  landscape: {
    questBoard: [0.125, 0.16],
    grannyThistle: [0.375, 0.16],
    craftingBench: [0.625, 0.16],
    scoutHazel: [0.875, 0.16],
    playerTent: [0.125, 0.5],
    momoForeman: [0.375, 0.5],
    shellbert: [0.625, 0.5],
    storageChest: [0.875, 0.5],
    worldMap: [0.5, 0.84],
  },
  portrait: {
    questBoard: [0.17, 0.15],
    grannyThistle: [0.5, 0.15],
    craftingBench: [0.83, 0.15],
    scoutHazel: [0.17, 0.5],
    worldMap: [0.5, 0.5],
    playerTent: [0.83, 0.5],
    momoForeman: [0.17, 0.85],
    shellbert: [0.5, 0.85],
    storageChest: [0.83, 0.85],
  },
};

function rect(x, y, w, h) {
  return { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) };
}

function contains(rectangle, x, y) {
  return Boolean(rectangle)
    && x >= rectangle.x
    && x <= rectangle.x + rectangle.w
    && y >= rectangle.y
    && y <= rectangle.y + rectangle.h;
}

function center(rectangle) {
  return { x: rectangle.x + rectangle.w / 2, y: rectangle.y + rectangle.h / 2 };
}

export function getGuideOverlayLayout(width, height) {
  const orientation = width / height >= 1.15 ? 'landscape' : 'portrait';
  const objectiveW = orientation === 'landscape' ? Math.min(620, width - 36) : width - 24;
  const objectiveH = orientation === 'landscape' ? 62 : 76;
  const objectiveRect = rect((width - objectiveW) / 2, 82, objectiveW, objectiveH);
  const dismissRect = rect(
    objectiveRect.x + objectiveRect.w - 38,
    objectiveRect.y + 10,
    28,
    28,
  );
  return { orientation, objectiveRect, dismissRect };
}

export function getHubMapLayout({ width, height, landmarks, focusId, guideTargetId }) {
  const overlay = guideTargetId ? getGuideOverlayLayout(width, height) : null;
  const orientation = width / height >= 1.15 ? 'landscape' : 'portrait';
  const promptH = orientation === 'landscape' ? 76 : 96;
  const promptRect = rect(
    orientation === 'landscape' ? 22 : 12,
    height - promptH - 12,
    orientation === 'landscape' ? width - 44 : width - 24,
    promptH,
  );
  const mapTop = overlay ? overlay.objectiveRect.y + overlay.objectiveRect.h + 10 : 82;
  const mapRect = rect(
    orientation === 'landscape' ? 20 : 12,
    mapTop,
    orientation === 'landscape' ? width - 40 : width - 24,
    promptRect.y - mapTop - 10,
  );
  const anchorSet = ANCHORS[orientation];
  const fallbackColumns = orientation === 'landscape' ? 4 : 3;
  const sourceLandmarks = Array.isArray(landmarks) ? landmarks : [];

  const placed = sourceLandmarks.map((landmark, index) => {
    const fallback = [
      ((index % fallbackColumns) + 0.5) / fallbackColumns,
      (Math.floor(index / fallbackColumns) + 0.5)
        / Math.ceil(Math.max(1, sourceLandmarks.length) / fallbackColumns),
    ];
    const [nx, ny] = anchorSet[landmark.id] || fallback;
    const point = {
      x: mapRect.x + mapRect.w * nx,
      y: mapRect.y + mapRect.h * ny,
    };
    const hitW = orientation === 'landscape' ? 136 : 100;
    const hitH = orientation === 'landscape' ? 74 : 80;
    const labelW = orientation === 'landscape' ? 128 : 96;
    const labelH = 26;
    return {
      ...landmark,
      point,
      iconRect: rect(point.x - 22, point.y - 26, 44, 44),
      labelRect: rect(point.x - labelW / 2, point.y + 18, labelW, labelH),
      hitRect: rect(point.x - hitW / 2, point.y - 30, hitW, hitH),
      showLabel: orientation === 'landscape' || landmark.id === focusId || landmark.id === guideTargetId,
    };
  });

  return {
    orientation,
    mapRect,
    landmarks: placed,
    objectiveRect: overlay?.objectiveRect || null,
    dismissRect: overlay?.dismissRect || null,
    promptRect,
  };
}

export function hitTestGuideDismiss(layout, x, y) {
  return contains(layout?.dismissRect, x, y)
    ? { type: 'dismiss', id: 'firstQuestGuide' }
    : null;
}

export function hitTestHubMap(layout, x, y) {
  const dismiss = hitTestGuideDismiss(layout, x, y);
  if (dismiss) return dismiss;
  const landmark = layout?.landmarks?.find(item => contains(item.hitRect, x, y));
  return landmark ? { type: 'landmark', id: landmark.id } : null;
}

export function getDirectionalNeighbor(layout, currentId, direction) {
  const current = layout?.landmarks?.find(item => item.id === currentId);
  if (!current) return null;
  const origin = center(current.hitRect);
  const vectors = {
    left: [-1, 0],
    right: [1, 0],
    up: [0, -1],
    down: [0, 1],
  };
  const vector = vectors[direction];
  if (!vector) return null;

  const candidates = layout.landmarks
    .filter(item => item.id !== currentId)
    .map(item => {
      const target = center(item.hitRect);
      const dx = target.x - origin.x;
      const dy = target.y - origin.y;
      const primary = dx * vector[0] + dy * vector[1];
      const perpendicular = Math.abs(dx * vector[1] - dy * vector[0]);
      return { id: item.id, primary, score: primary + perpendicular * 1.75 };
    })
    .filter(item => item.primary > 0.5)
    .sort((a, b) => a.score - b.score || a.id.localeCompare(b.id));

  return candidates[0]?.id || null;
}
