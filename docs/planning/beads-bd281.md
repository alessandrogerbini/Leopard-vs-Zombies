# BD-281: Zombies display persistent visual artifacts after taking hits — yellow vests, color shifts

**Date:** 2026-02-28
**Source:** Manual playthrough (screenshot evidence). After being hit, some zombies retain incorrect coloring — they light up or display yellow vest-like geometry on their model that doesn't go away. Same-tier zombies end up looking wildly different, which is confusing (players may think color = tier or status).
**Related:** BD-279 (zombie color drift), BD-203 (zombie hurt flash fires too frequently)

---

## P1 — Visual Bug

---

### BD-281: Zombie hurt flash / material mutation leaves persistent visual artifacts

**Category:** Bug (visual / materials)
**Priority:** P1
**File(s):** `js/game3d.js` (zombie hurt flash, enemy model materials)

**Screenshot Evidence:**
Multiple zombies on screen at Wave 4-5 showing:
- Some zombies appear bright white/silver
- Some display yellow rectangular patches (looks like a vest) that persist indefinitely
- Same-tier zombies look completely different colors

**Suspected Root Causes:**

### 1. Hurt flash not reverting material color
When a zombie takes damage, the model flashes white. If the revert logic has a race condition, edge case, or timing bug, the material stays at the flash color permanently. The yellow vest appearance may be a partially-reverted flash where only some mesh children reverted.

### 2. Shared material references
If zombie meshes share a THREE.js Material reference (not cloned per-instance), modifying one zombie's material color affects others. The hurt flash on zombie A could tint zombie B's shared material.

### 3. Child mesh traversal incomplete
If the hurt flash iterates over `mesh.children` but misses deeply nested children (e.g., the vest/torso piece), some parts flash while others don't, and the revert misses the same parts.

### 4. Emissive property not reset
If the flash uses `material.emissive` instead of `material.color`, and the reset only restores `material.color`, the emissive glow persists.

---

## Fix Approach

1. Audit the zombie hurt flash code — ensure it saves and restores ALL material properties on ALL mesh children
2. Ensure each zombie has its own material instances (clone materials on creation)
3. Add a safety reset: if hurt flash timer expires, force-restore original colors regardless of state
4. Check if the "yellow vest" is actually a child mesh that gets its color set during flash and never reverted

---

## Acceptance Criteria

1. Zombie hurt flash fully reverts after the flash duration — no persistent color changes
2. All zombie mesh children (body, limbs, vest, head) flash and revert together
3. Same-tier zombies always appear the same color
4. No yellow/white persistent artifacts on any zombie model

---

## Estimated Complexity

S-M — likely a material save/restore bug in the hurt flash system.
