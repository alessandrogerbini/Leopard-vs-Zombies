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
    questBoard: [0.15, 0.16],
    grannyThistle: [0.47, 0.16],
    craftingBench: [0.8, 0.16],
    scoutHazel: [0.47, 0.5],
    playerTent: [0.15, 0.5],
    momoForeman: [0.82, 0.5],
    shellbert: [0.64, 0.5],
    storageChest: [0.84, 0.84],
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
    && x < rectangle.x + rectangle.w
    && y >= rectangle.y
    && y < rectangle.y + rectangle.h;
}

function center(rectangle) {
  return { x: rectangle.x + rectangle.w / 2, y: rectangle.y + rectangle.h / 2 };
}

function intersects(a, b) {
  return a.x < b.x + b.w
    && a.x + a.w > b.x
    && a.y < b.y + b.h
    && a.y + a.h > b.y;
}

function isInside(inner, outer) {
  return inner.x >= outer.x
    && inner.y >= outer.y
    && inner.x + inner.w <= outer.x + outer.w
    && inner.y + inner.h <= outer.y + outer.h;
}

function getFallbackCandidates(mapRect, orientation, hitW, hitH) {
  const columns = orientation === 'landscape' ? 4 : 3;
  const rows = orientation === 'landscape' ? 3 : 4;
  const minX = mapRect.x + hitW / 2;
  const maxX = mapRect.x + mapRect.w - hitW / 2;
  const minY = mapRect.y + 30;
  const maxY = mapRect.y + mapRect.h - (hitH - 30);
  const candidates = [];

  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      candidates.push({
        x: minX + (maxX - minX) * column / (columns - 1),
        y: minY + (maxY - minY) * row / (rows - 1),
      });
    }
  }

  return candidates;
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
  const sourceLandmarks = Array.isArray(landmarks) ? landmarks : [];
  const hitW = orientation === 'landscape' ? 136 : 100;
  const hitH = orientation === 'landscape' ? 74 : 80;
  const labelW = orientation === 'landscape' ? 128 : 96;
  const labelH = 26;

  const placeLandmark = (landmark, point) => ({
    ...landmark,
    point,
    iconRect: rect(point.x - 22, point.y - 26, 44, 44),
    labelRect: rect(point.x - labelW / 2, point.y + 18, labelW, labelH),
    hitRect: rect(point.x - hitW / 2, point.y - 30, hitW, hitH),
    showLabel: orientation === 'landscape' || landmark.id === focusId || landmark.id === guideTargetId,
  });

  const placedByIndex = new Array(sourceLandmarks.length);
  const occupiedRects = [];
  const fallbackLandmarks = [];

  sourceLandmarks.forEach((landmark, index) => {
    const anchor = anchorSet[landmark.id];
    if (!anchor) {
      fallbackLandmarks.push({ landmark, index });
      return;
    }

    const point = {
      x: mapRect.x + mapRect.w * anchor[0],
      y: mapRect.y + mapRect.h * anchor[1],
    };
    const placed = placeLandmark(landmark, point);
    placedByIndex[index] = placed;
    occupiedRects.push(placed.hitRect);
  });

  const fallbackCandidates = getFallbackCandidates(mapRect, orientation, hitW, hitH);
  fallbackLandmarks
    .sort((a, b) => String(a.landmark.id).localeCompare(String(b.landmark.id)) || a.index - b.index)
    .forEach(({ landmark, index }) => {
      const point = fallbackCandidates.find(candidate => {
        const prospective = rect(candidate.x - hitW / 2, candidate.y - 30, hitW, hitH);
        return isInside(prospective, mapRect)
          && occupiedRects.every(occupied => !intersects(prospective, occupied));
      });

      if (!point) {
        throw new Error(`Unable to place hub landmark "${landmark.id}" without overlap`);
      }

      const placed = placeLandmark(landmark, point);
      placedByIndex[index] = placed;
      occupiedRects.push(placed.hitRect);
    });

  return {
    orientation,
    mapRect,
    landmarks: placedByIndex,
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
