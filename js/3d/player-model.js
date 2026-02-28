/**
 * @module 3d/player-model
 * @description Player model construction, animation, and visual updates for the 3D Roguelike Survivor mode.
 *
 * This module handles:
 * - Building bipedal animal models (leopard, redPanda, lion, gator) from box primitives
 * - Angel wings visual attachment for the flight powerup
 * - Bipedal walk cycle animation (legs, arms, body bob, tail wag)
 * - Flight pose animation (superman tilt, wing flapping, banking)
 * - Muscle growth visual scaling per level
 * - Player rotation toward movement direction
 *
 * The module is purely visual/geometric — it reads game state but does not mutate it.
 *
 * Dependencies: Three.js (global), 3d/utils.js (box helper)
 * Exports: buildPlayerModel, animatePlayer, updateMuscleGrowth, updateItemVisuals
 */

import { box } from './utils.js';

/**
 * @typedef {Object} PlayerModel
 * @property {THREE.Group} group     - The root group containing the entire player model (added to scene).
 * @property {THREE.Mesh[]} legs     - [leftLeg, rightLeg] meshes for walk animation.
 * @property {THREE.Mesh[]} arms     - [leftArm, rightArm] meshes for arm swing.
 * @property {THREE.Mesh|null} tail  - Tail mesh for wag animation, or null.
 * @property {Object.<string, THREE.Mesh>} muscles - Named muscle meshes for growth scaling
 *   (chest, bicepL, bicepR, shoulderL, shoulderR, thighL, thighR).
 * @property {THREE.Mesh|null} head  - Head mesh for minimal growth scaling.
 * @property {THREE.Mesh[]} hands    - [leftHand, rightHand] paw/hand meshes.
 * @property {THREE.Mesh[]} feet     - [leftFoot, rightFoot] foot meshes.
 * @property {Object.<string, THREE.Mesh|THREE.Mesh[]>} features - Animal-specific cosmetic parts
 *   (leopard: spots array; redPanda: faceMask; lion: mane array; gator: ridges array).
 * @property {THREE.Group} wingGroup - Angel wings group (child of group, initially hidden).
 * @property {Object} wingMeshes     - Individual wing segment meshes for flap animation.
 * @property {THREE.Mesh} wingMeshes.wingL1 - Left wing inner segment.
 * @property {THREE.Mesh} wingMeshes.wingL2 - Left wing middle segment.
 * @property {THREE.Mesh} wingMeshes.wingL3 - Left wing tip segment.
 * @property {THREE.Mesh} wingMeshes.wingR1 - Right wing inner segment.
 * @property {THREE.Mesh} wingMeshes.wingR2 - Right wing middle segment.
 * @property {THREE.Mesh} wingMeshes.wingR3 - Right wing tip segment.
 */

/**
 * Build the complete player model for the given animal type and add it to the scene.
 *
 * Creates a bipedal animal model from box primitives with species-specific geometry,
 * plus angel wings (initially hidden) for the flight powerup.
 *
 * @param {string} animalId - One of 'leopard', 'redPanda', 'lion', 'gator'.
 * @param {THREE.Scene} scene - The Three.js scene to add the model to.
 * @returns {PlayerModel} Structured object containing all model parts for animation.
 */
export function buildPlayerModel(animalId, scene) {
  const group = new THREE.Group();
  const legs = []; // [leftLeg, rightLeg] (bipedal)
  const arms = []; // [leftArm, rightArm]
  let tail = null;
  const muscles = {}; // { chest, bicepL, bicepR, shoulderL, shoulderR, thighL, thighR }
  let head = null;     // Head mesh for minimal growth scaling
  const hands = [];    // [leftHand, rightHand] paw/hand meshes
  const feet = [];     // [leftFoot, rightFoot] foot meshes
  const features = {}; // Animal-specific cosmetic parts (spots, mane, etc.)

  if (animalId === 'leopard') {
    // === BIPEDAL LEOPARD ===
    // Torso (vertical)
    muscles.chest = box(group, 0.7, 0.65, 0.45, 0xe8a828, 0, 0.85, 0, true);
    // Belly
    box(group, 0.55, 0.2, 0.35, 0xf0c858, 0, 0.65, 0.05);
    // Rosette spots on torso
    const leopardSpots = [];
    [[0.25, 1.0, 0.15], [-0.2, 0.95, -0.1], [0.15, 0.8, 0.18], [-0.25, 0.85, 0.1]].forEach(p => {
      leopardSpots.push(box(group, 0.1, 0.08, 0.08, 0xc08018, p[0], p[1], p[2]));
    });
    features.spots = leopardSpots;
    // Shoulders
    muscles.shoulderL = box(group, 0.22, 0.2, 0.22, 0xe8a828, -0.42, 1.1, 0);
    muscles.shoulderR = box(group, 0.22, 0.2, 0.22, 0xe8a828, 0.42, 1.1, 0);
    // Neck
    box(group, 0.3, 0.25, 0.22, 0xe8a828, 0, 1.25, 0);
    // Head
    head = box(group, 0.5, 0.42, 0.45, 0xe8a828, 0, 1.55, 0, true);
    box(group, 0.4, 0.12, 0.1, 0xe8a828, 0, 1.75, 0);
    // Snout
    box(group, 0.22, 0.18, 0.22, 0xf0c050, 0, 1.42, 0.25);
    box(group, 0.1, 0.06, 0.05, 0xff6688, 0, 1.47, 0.36); // nose
    box(group, 0.12, 0.03, 0.05, 0xc08018, 0, 1.38, 0.33); // mouth
    // Eyes
    box(group, 0.1, 0.08, 0.06, 0x00dd00, -0.14, 1.58, 0.2);
    box(group, 0.1, 0.08, 0.06, 0x00dd00, 0.14, 1.58, 0.2);
    box(group, 0.04, 0.08, 0.03, 0x000000, -0.14, 1.58, 0.23);
    box(group, 0.04, 0.08, 0.03, 0x000000, 0.14, 1.58, 0.23);
    // Ears
    box(group, 0.1, 0.15, 0.07, 0xd09020, -0.16, 1.82, 0);
    box(group, 0.1, 0.15, 0.07, 0xd09020, 0.16, 1.82, 0);
    box(group, 0.06, 0.1, 0.04, 0xe8a0a0, -0.16, 1.82, 0.02);
    box(group, 0.06, 0.1, 0.04, 0xe8a0a0, 0.16, 1.82, 0.02);
    // Arms (at sides)
    muscles.bicepL = box(group, 0.16, 0.35, 0.16, 0xe8a828, -0.48, 0.85, 0, true);
    muscles.bicepR = box(group, 0.16, 0.35, 0.16, 0xe8a828, 0.48, 0.85, 0, true);
    arms.push(muscles.bicepL, muscles.bicepR);
    // Hands/paws
    hands.push(box(group, 0.13, 0.1, 0.13, 0xd09020, -0.48, 0.62, 0.05));
    hands.push(box(group, 0.13, 0.1, 0.13, 0xd09020, 0.48, 0.62, 0.05));
    // Legs (standing)
    muscles.thighL = box(group, 0.2, 0.45, 0.2, 0xc89020, -0.18, 0.25, 0, true);
    muscles.thighR = box(group, 0.2, 0.45, 0.2, 0xc89020, 0.18, 0.25, 0, true);
    legs.push(muscles.thighL, muscles.thighR);
    // Feet
    feet.push(box(group, 0.22, 0.08, 0.25, 0xd09020, -0.18, 0.02, 0.03));
    feet.push(box(group, 0.22, 0.08, 0.25, 0xd09020, 0.18, 0.02, 0.03));
    // Tail (from lower back)
    tail = box(group, 0.08, 0.08, 0.25, 0xe8a828, 0, 0.6, -0.3);
    box(group, 0.08, 0.08, 0.2, 0xd09020, 0, 0.55, -0.5);
    box(group, 0.06, 0.06, 0.15, 0x1a1a1a, 0, 0.52, -0.68);

  } else if (animalId === 'redPanda') {
    // === BIPEDAL RED PANDA ===
    // Torso (vertical, reddish-brown)
    muscles.chest = box(group, 0.65, 0.6, 0.4, 0xcc4422, 0, 0.85, 0, true);
    // Black underbelly
    box(group, 0.5, 0.2, 0.32, 0x111111, 0, 0.65, 0.05);
    box(group, 0.66, 0.1, 0.3, 0x1a1a1a, 0, 0.7, 0);
    // Shoulders
    muscles.shoulderL = box(group, 0.2, 0.18, 0.2, 0xcc4422, -0.38, 1.1, 0);
    muscles.shoulderR = box(group, 0.2, 0.18, 0.2, 0xcc4422, 0.38, 1.1, 0);
    // Neck
    box(group, 0.28, 0.22, 0.2, 0xcc4422, 0, 1.22, 0);
    // Head (large, round)
    head = box(group, 0.58, 0.5, 0.5, 0xcc4422, 0, 1.55, 0, true);
    box(group, 0.48, 0.12, 0.1, 0xcc4422, 0, 1.78, 0);
    // White face mask
    features.faceMask = box(group, 0.44, 0.26, 0.12, 0xffffff, 0, 1.48, 0.22);
    // White cheek patches
    box(group, 0.16, 0.15, 0.1, 0xffffff, -0.28, 1.45, 0.2);
    box(group, 0.16, 0.15, 0.1, 0xffffff, 0.28, 1.45, 0.2);
    // Dark eye patches (tear marks)
    box(group, 0.14, 0.14, 0.06, 0x441100, -0.14, 1.55, 0.22);
    box(group, 0.14, 0.14, 0.06, 0x441100, 0.14, 1.55, 0.22);
    // Dark beady eyes
    box(group, 0.07, 0.07, 0.05, 0x111111, -0.14, 1.55, 0.26);
    box(group, 0.07, 0.07, 0.05, 0x111111, 0.14, 1.55, 0.26);
    // White snout
    box(group, 0.2, 0.14, 0.18, 0xffffff, 0, 1.4, 0.25);
    // Black nose
    box(group, 0.08, 0.06, 0.05, 0x111111, 0, 1.44, 0.35);
    // Ears (large pointed, with white rims)
    box(group, 0.12, 0.25, 0.08, 0x882211, -0.2, 1.88, 0);
    box(group, 0.12, 0.25, 0.08, 0x882211, 0.2, 1.88, 0);
    box(group, 0.03, 0.23, 0.08, 0xffffff, -0.28, 1.88, 0);
    box(group, 0.03, 0.23, 0.08, 0xffffff, 0.28, 1.88, 0);
    box(group, 0.06, 0.16, 0.05, 0xffffff, -0.2, 1.88, 0.02);
    box(group, 0.06, 0.16, 0.05, 0xffffff, 0.2, 1.88, 0.02);
    // Arms (BLACK - characteristic)
    muscles.bicepL = box(group, 0.15, 0.35, 0.15, 0x111111, -0.44, 0.85, 0, true);
    muscles.bicepR = box(group, 0.15, 0.35, 0.15, 0x111111, 0.44, 0.85, 0, true);
    arms.push(muscles.bicepL, muscles.bicepR);
    // Paws
    hands.push(box(group, 0.12, 0.1, 0.12, 0x0a0a0a, -0.44, 0.62, 0.05));
    hands.push(box(group, 0.12, 0.1, 0.12, 0x0a0a0a, 0.44, 0.62, 0.05));
    // Legs (BLACK)
    muscles.thighL = box(group, 0.18, 0.45, 0.18, 0x111111, -0.16, 0.25, 0, true);
    muscles.thighR = box(group, 0.18, 0.45, 0.18, 0x111111, 0.16, 0.25, 0, true);
    legs.push(muscles.thighL, muscles.thighR);
    // Feet
    feet.push(box(group, 0.2, 0.08, 0.22, 0x0a0a0a, -0.16, 0.02, 0.03));
    feet.push(box(group, 0.2, 0.08, 0.22, 0x0a0a0a, 0.16, 0.02, 0.03));
    // Bushy striped tail
    tail = box(group, 0.22, 0.22, 0.3, 0xcc4422, 0, 0.6, -0.3);
    box(group, 0.23, 0.12, 0.06, 0xffccaa, 0, 0.6, -0.2);
    box(group, 0.22, 0.22, 0.3, 0xcc4422, 0, 0.55, -0.55);
    box(group, 0.23, 0.12, 0.06, 0xffccaa, 0, 0.55, -0.45);
    box(group, 0.2, 0.2, 0.12, 0x882211, 0, 0.52, -0.72);

  } else if (animalId === 'lion') {
    // === BIPEDAL LION ===
    // Torso (wider, muscular)
    muscles.chest = box(group, 0.8, 0.7, 0.5, 0xdda030, 0, 0.85, 0, true);
    // Belly
    box(group, 0.6, 0.2, 0.38, 0xeec060, 0, 0.62, 0.05);
    // Shoulders (big)
    muscles.shoulderL = box(group, 0.25, 0.22, 0.25, 0xdda030, -0.48, 1.12, 0);
    muscles.shoulderR = box(group, 0.25, 0.22, 0.25, 0xdda030, 0.48, 1.12, 0);
    // Neck
    box(group, 0.35, 0.3, 0.28, 0xdda030, 0, 1.28, 0);
    // Mane (around head, layered)
    const maneOuter = box(group, 0.95, 0.75, 0.8, 0xaa6610, 0, 1.6, -0.02);
    const maneInner = box(group, 0.8, 0.65, 0.7, 0xbb7720, 0, 1.6, -0.02);
    box(group, 0.12, 0.45, 0.55, 0x996610, -0.45, 1.6, 0);
    box(group, 0.12, 0.45, 0.55, 0x996610, 0.45, 1.6, 0);
    box(group, 0.65, 0.12, 0.1, 0x996610, 0, 2.0, 0);
    features.mane = [maneOuter, maneInner];
    // Head
    head = box(group, 0.5, 0.44, 0.48, 0xdda030, 0, 1.62, 0.05, true);
    // Snout
    box(group, 0.26, 0.2, 0.22, 0xeec060, 0, 1.48, 0.28);
    box(group, 0.12, 0.08, 0.06, 0x996620, 0, 1.53, 0.4); // nose
    box(group, 0.12, 0.03, 0.05, 0x885510, 0, 1.44, 0.38); // mouth
    // Eyes (amber)
    box(group, 0.12, 0.08, 0.06, 0xffaa00, -0.13, 1.66, 0.24);
    box(group, 0.12, 0.08, 0.06, 0xffaa00, 0.13, 1.66, 0.24);
    box(group, 0.05, 0.08, 0.03, 0x000000, -0.13, 1.66, 0.27);
    box(group, 0.05, 0.08, 0.03, 0x000000, 0.13, 1.66, 0.27);
    // Ears
    box(group, 0.1, 0.12, 0.07, 0xc89020, -0.18, 1.9, 0);
    box(group, 0.1, 0.12, 0.07, 0xc89020, 0.18, 1.9, 0);
    // Arms
    muscles.bicepL = box(group, 0.18, 0.4, 0.18, 0xdda030, -0.52, 0.85, 0, true);
    muscles.bicepR = box(group, 0.18, 0.4, 0.18, 0xdda030, 0.52, 0.85, 0, true);
    arms.push(muscles.bicepL, muscles.bicepR);
    // Hands
    hands.push(box(group, 0.15, 0.12, 0.15, 0xc89020, -0.52, 0.6, 0.05));
    hands.push(box(group, 0.15, 0.12, 0.15, 0xc89020, 0.52, 0.6, 0.05));
    // Legs
    muscles.thighL = box(group, 0.22, 0.48, 0.22, 0xc89020, -0.2, 0.25, 0, true);
    muscles.thighR = box(group, 0.22, 0.48, 0.22, 0xc89020, 0.2, 0.25, 0, true);
    legs.push(muscles.thighL, muscles.thighR);
    // Feet
    feet.push(box(group, 0.24, 0.08, 0.27, 0xc89020, -0.2, 0.02, 0.03));
    feet.push(box(group, 0.24, 0.08, 0.27, 0xc89020, 0.2, 0.02, 0.03));
    // Tail with tuft
    tail = box(group, 0.08, 0.08, 0.25, 0xdda030, 0, 0.6, -0.32);
    box(group, 0.06, 0.06, 0.2, 0xdda030, 0, 0.55, -0.52);
    box(group, 0.18, 0.18, 0.15, 0xaa6610, 0, 0.52, -0.68);

  } else if (animalId === 'gator') {
    // === BIPEDAL GATOR ===
    // Torso (armored, wider)
    muscles.chest = box(group, 0.75, 0.65, 0.5, 0x44aa44, 0, 0.82, 0, true);
    // Belly
    box(group, 0.55, 0.2, 0.38, 0x88cc88, 0, 0.6, 0.05);
    // Back ridges along spine
    const ridges = [];
    for (let i = 0; i < 5; i++) {
      ridges.push(box(group, 0.12, 0.1, 0.12, 0x338833, 0, 1.18 - i * 0.12, -0.22));
    }
    features.ridges = ridges;
    // Scale texture on sides
    [[-0.3, 0.9, 0.12], [0.3, 0.88, -0.08], [-0.28, 0.78, 0.1]].forEach(p => {
      box(group, 0.1, 0.08, 0.1, 0x3a9a3a, p[0], p[1], p[2]);
    });
    // Shoulders
    muscles.shoulderL = box(group, 0.22, 0.2, 0.22, 0x44aa44, -0.44, 1.08, 0);
    muscles.shoulderR = box(group, 0.22, 0.2, 0.22, 0x44aa44, 0.44, 1.08, 0);
    // Neck
    box(group, 0.32, 0.22, 0.25, 0x44aa44, 0, 1.2, 0);
    // Head (with snout extending forward)
    head = box(group, 0.4, 0.3, 0.35, 0x44aa44, 0, 1.42, 0.05, true);
    // Upper jaw (long snout)
    box(group, 0.3, 0.15, 0.45, 0x3a9a3a, 0, 1.38, 0.35);
    box(group, 0.25, 0.1, 0.4, 0x44aa44, 0, 1.42, 0.35);
    // Lower jaw
    box(group, 0.25, 0.08, 0.4, 0x2d882d, 0, 1.28, 0.35);
    // Nostrils
    box(group, 0.12, 0.08, 0.06, 0x338833, 0, 1.46, 0.58);
    // Teeth
    for (let t = 0; t < 3; t++) {
      box(group, 0.04, 0.05, 0.03, 0xffffff, -0.06 + t * 0.06, 1.32, 0.35 + t * 0.1);
      box(group, 0.04, 0.05, 0.03, 0xffffff, -0.04 + t * 0.06, 1.26, 0.38 + t * 0.1);
    }
    // Eyes (protruding on top)
    box(group, 0.15, 0.15, 0.15, 0x44aa44, -0.1, 1.58, 0.1);
    box(group, 0.15, 0.15, 0.15, 0x44aa44, 0.1, 1.58, 0.1);
    box(group, 0.1, 0.1, 0.1, 0xccff44, -0.1, 1.6, 0.14);
    box(group, 0.1, 0.1, 0.1, 0xccff44, 0.1, 1.6, 0.14);
    box(group, 0.03, 0.1, 0.04, 0x000000, -0.1, 1.6, 0.18);
    box(group, 0.03, 0.1, 0.04, 0x000000, 0.1, 1.6, 0.18);
    // Arms
    muscles.bicepL = box(group, 0.17, 0.35, 0.17, 0x338833, -0.48, 0.82, 0, true);
    muscles.bicepR = box(group, 0.17, 0.35, 0.17, 0x338833, 0.48, 0.82, 0, true);
    arms.push(muscles.bicepL, muscles.bicepR);
    // Clawed hands
    hands.push(box(group, 0.14, 0.1, 0.14, 0x2d772d, -0.48, 0.6, 0.05));
    hands.push(box(group, 0.14, 0.1, 0.14, 0x2d772d, 0.48, 0.6, 0.05));
    // Claws on hands
    for (const sx of [-0.48, 0.48]) {
      for (let c = -1; c <= 1; c++) {
        box(group, 0.02, 0.06, 0.02, 0xcccc88, sx + c * 0.04, 0.56, 0.12);
      }
    }
    // Legs
    muscles.thighL = box(group, 0.2, 0.42, 0.22, 0x338833, -0.18, 0.22, 0, true);
    muscles.thighR = box(group, 0.2, 0.42, 0.22, 0x338833, 0.18, 0.22, 0, true);
    legs.push(muscles.thighL, muscles.thighR);
    // Feet
    feet.push(box(group, 0.24, 0.06, 0.28, 0x2d772d, -0.18, 0.02, 0.03));
    feet.push(box(group, 0.24, 0.06, 0.28, 0x2d772d, 0.18, 0.02, 0.03));
    // Foot claws
    for (const fx of [-0.18, 0.18]) {
      for (let c = -1; c <= 1; c++) {
        box(group, 0.04, 0.03, 0.05, 0xcccc88, fx + c * 0.06, 0.04, 0.16);
      }
    }
    // Thick tail from lower back
    tail = box(group, 0.25, 0.18, 0.35, 0x44aa44, 0, 0.55, -0.35);
    box(group, 0.2, 0.15, 0.3, 0x3a9a3a, 0, 0.5, -0.6);
    box(group, 0.15, 0.12, 0.22, 0x338833, 0, 0.48, -0.8);
    // Tail ridges
    box(group, 0.08, 0.06, 0.08, 0x338833, 0, 0.62, -0.4);
    box(group, 0.06, 0.05, 0.06, 0x338833, 0, 0.58, -0.6);
  }

  scene.add(group);

  // === ANGEL WINGS VISUAL ===
  const wingGroup = new THREE.Group();
  // Left wing
  const wingMatL = new THREE.MeshLambertMaterial({ color: 0xaaddff, transparent: true, opacity: 0.85 });
  const wingL1 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.08), wingMatL);
  wingL1.position.set(-0.6, 1.0, -0.15);
  wingL1.rotation.z = 0.3;
  wingGroup.add(wingL1);
  const wingL2 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.35, 0.06), wingMatL);
  wingL2.position.set(-0.9, 1.15, -0.15);
  wingL2.rotation.z = 0.5;
  wingGroup.add(wingL2);
  // Wing feather tips
  const wingL3 = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.2, 0.04), new THREE.MeshLambertMaterial({ color: 0xcceeff, transparent: true, opacity: 0.7 }));
  wingL3.position.set(-1.1, 1.25, -0.15);
  wingL3.rotation.z = 0.6;
  wingGroup.add(wingL3);
  // Right wing (mirror)
  const wingMatR = new THREE.MeshLambertMaterial({ color: 0xaaddff, transparent: true, opacity: 0.85 });
  const wingR1 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.08), wingMatR);
  wingR1.position.set(0.6, 1.0, -0.15);
  wingR1.rotation.z = -0.3;
  wingGroup.add(wingR1);
  const wingR2 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.35, 0.06), wingMatR);
  wingR2.position.set(0.9, 1.15, -0.15);
  wingR2.rotation.z = -0.5;
  wingGroup.add(wingR2);
  const wingR3 = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.2, 0.04), new THREE.MeshLambertMaterial({ color: 0xcceeff, transparent: true, opacity: 0.7 }));
  wingR3.position.set(1.1, 1.25, -0.15);
  wingR3.rotation.z = -0.6;
  wingGroup.add(wingR3);
  wingGroup.visible = false;
  group.add(wingGroup);

  return {
    group,
    legs,
    arms,
    tail,
    muscles,
    head,
    hands,
    feet,
    features,
    wingGroup,
    wingMeshes: { wingL1, wingL2, wingL3, wingR1, wingR2, wingR3 },
  };
}

/**
 * Animate the player model each frame: walk cycle, rotation, flight pose, wings, tail.
 *
 * Handles bipedal leg/arm swing, body bob, tail wag, player rotation toward movement,
 * flight banking/tilting, wing flapping, and return-to-upright transitions.
 *
 * This function does NOT mutate game state (st) — it only reads from it and modifies
 * the Three.js model objects directly.
 *
 * @param {PlayerModel} model - The player model object returned by buildPlayerModel.
 * @param {State3D} st - The game state object (read-only access).
 * @param {THREE.Clock} clock - The Three.js clock for elapsed time.
 * @param {number} len - Movement input magnitude (0 = idle, >0 = moving).
 * @param {number} mx - Movement X component (for rotation target).
 * @param {number} mz - Movement Z component (for rotation target).
 */
export function animatePlayer(model, st, clock, len, mx, mz) {
  const { group, legs, arms, tail, wingGroup, wingMeshes } = model;

  // === BD-230: DEATH STUMBLE ANIMATION ===
  // During death sequence, play a stumble-forward-and-collapse animation
  // and skip all normal animation (walk, idle, flight, attack lunge, tail wag).
  if (st.deathSequence) {
    const deathProgress = 1 - (st.deathSequenceTimer / 1.5);
    const tiltProgress = Math.min(deathProgress / 0.6, 1); // reaches max at 60%

    // Keep X/Z position, override Y for sinking into ground
    group.position.set(st.playerX, st.playerY - tiltProgress * 0.4, st.playerZ);

    // Forward tilt: 0 -> 45 degrees (stumble forward)
    const tilt = tiltProgress * (Math.PI / 4);
    group.rotation.x = -tilt;

    // Arms flail outward
    if (arms && arms[0]) arms[0].position.x = -0.6 - tiltProgress * 0.3;
    if (arms && arms[1]) arms[1].position.x = 0.6 + tiltProgress * 0.3;

    // Legs go limp (drift backward slightly)
    if (legs && legs[0]) { legs[0].position.z = -0.1 * tiltProgress; }
    if (legs && legs[1]) { legs[1].position.z = -0.1 * tiltProgress; }

    // Tail drops (stop wagging, droop downward)
    if (tail) {
      tail.rotation.y = 0;
      tail.rotation.x = tiltProgress * 0.5;
    }

    // Hide wings during death
    wingGroup.visible = false;

    return; // skip all other animation
  }

  // === PLAYER POSITION ===
  group.position.set(st.playerX, st.playerY, st.playerZ);

  // === PLAYER ROTATION ===
  // Player rotation toward movement
  if (len > 0) {
    const targetAngle = Math.atan2(mx, mz);
    // Smooth rotation
    let diff = targetAngle - group.rotation.y;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    if (st.flying) {
      // Slower turning when flying (feels more like flight)
      group.rotation.y += diff * 0.08;
      // Bank/roll into turns (subtle, clamped)
      const targetRoll = -diff * 0.6;
      const clampedRoll = Math.max(-0.35, Math.min(0.35, targetRoll)); // Max ~20 degrees
      group.rotation.z += (clampedRoll - group.rotation.z) * 0.1;
    } else {
      group.rotation.y += diff * 0.15;
    }
  } else if (st.flying) {
    // Return to level flight when not turning
    group.rotation.z *= 0.9;
  }

  // === BIPEDAL ANIMATION ===
  // Bipedal leg + arm animation
  if (st.flying) {
    // Flying pose: legs trail behind, arms reach forward
    if (legs[0]) { legs[0].position.z = -0.15; legs[0].position.y = 0.25; }
    if (legs[1]) { legs[1].position.z = -0.15; legs[1].position.y = 0.25; }
    if (arms[0]) arms[0].position.z = 0.2;
    if (arms[1]) arms[1].position.z = 0.2;
    // No body bob when flying
  } else {
    const walkSpeed = len > 0 ? 10 : 0;
    const walkPhase = clock.elapsedTime * walkSpeed;
    const legSwing = Math.sin(walkPhase) * 0.5;
    const legLift = Math.abs(Math.sin(walkPhase)) * 0.08;
    if (legs[0]) { legs[0].position.z = legSwing * 0.25; legs[0].position.y = 0.25 + (len > 0 ? legLift : 0); }
    if (legs[1]) { legs[1].position.z = -legSwing * 0.25; legs[1].position.y = 0.25 + (len > 0 ? Math.abs(Math.sin(walkPhase + Math.PI)) * 0.08 : 0); }
    // Arm swing (opposite to legs, bigger) / idle arm sway (BD-122)
    if (len > 0) {
      if (arms[0]) arms[0].position.z = -legSwing * 0.2;
      if (arms[1]) arms[1].position.z = legSwing * 0.2;
    } else {
      // BD-122: Subtle idle arm sway (slower than walk, independent rhythm)
      if (arms[0]) arms[0].position.z = Math.sin(clock.elapsedTime * 1.5) * 0.03;
      if (arms[1]) arms[1].position.z = Math.sin(clock.elapsedTime * 1.5 + Math.PI) * 0.03;
    }
    // Body bob when walking / idle breathing (BD-122)
    if (len > 0) {
      group.position.y = st.playerY + Math.abs(Math.sin(walkPhase * 2)) * 0.04;
    } else {
      // BD-122: Idle breathing — gentle vertical bob
      const breathe = Math.sin(clock.elapsedTime * 2) * 0.02;
      group.position.y = st.playerY + breathe;
    }
  }
  // BD-126: Attack lunge animation
  if (st.attackAnimTimer > 0) {
    const dur = st.attackAnimDuration || 0.15;
    const t = Math.min(st.attackAnimTimer / dur, 1);
    group.rotation.x = -0.2 * t; // lean forward, springs back
    // Arms reach forward during lunge
    if (arms[0]) arms[0].position.z += 0.15 * t;
    if (arms[1]) arms[1].position.z += 0.15 * t;
  }

  // Tail wag always plays
  if (tail) tail.rotation.y = Math.sin(clock.elapsedTime * 3) * 0.4;

  // === ANGEL WINGS + FLIGHT POSE ===
  // Angel wings visibility + flapping + superman pose
  wingGroup.visible = st.flying;
  if (st.flying) {
    if (st.gManeuver) {
      // During G maneuver: pitch follows the maneuver angle on top of superman tilt
      group.rotation.x = -Math.PI / 2.5 + st.gManeuverPitch;
    } else {
      // Normal superman flying pose, smoothly blend back from any residual maneuver pitch
      const targetTilt = -Math.PI / 2.5 + st.gManeuverPitch;
      group.rotation.x += (targetTilt - group.rotation.x) * 0.1;
    }
    // Counter-rotate wings to stay in the horizontal flight plane
    wingGroup.rotation.x = -group.rotation.x;
    // Flap: faster during maneuvers, gentler in normal flight
    const flapSpeed = st.gManeuver ? 12 : 6;
    const flapAmp = st.gManeuver ? 0.3 : 0.25;
    const flap = Math.sin(clock.elapsedTime * flapSpeed) * flapAmp;
    wingMeshes.wingL1.rotation.z = 0.2 + flap;
    wingMeshes.wingL2.rotation.z = 0.35 + flap * 1.1;
    wingMeshes.wingL3.rotation.z = 0.45 + flap * 1.2;
    wingMeshes.wingR1.rotation.z = -0.2 - flap;
    wingMeshes.wingR2.rotation.z = -0.35 - flap * 1.1;
    wingMeshes.wingR3.rotation.z = -0.45 - flap * 1.2;
  } else {
    // Return to upright (skip during attack lunge — BD-126)
    if (st.attackAnimTimer <= 0) {
      if (Math.abs(group.rotation.x) > 0.01) {
        group.rotation.x *= 0.85;
      } else {
        group.rotation.x = 0;
      }
    }
    // Reset roll from flight banking
    if (Math.abs(group.rotation.z) > 0.01) {
      group.rotation.z *= 0.85;
    } else {
      group.rotation.z = 0;
    }
    wingGroup.rotation.x = 0;
  }
}

/**
 * Update muscle growth visual scaling based on player level using 5-tier logarithmic curves.
 *
 * Uses the formula: scale = 1 + maxGrowth * (1 - Math.exp(-growthRate * t))
 * where t = level - 1 (so level 1 = no growth). This produces an asymptotic curve
 * that never fully stops growing, replacing the old linear-with-hard-cap system that
 * plateaued completely by level 17-21.
 *
 * Five growth tiers prevent the "blobby" look by scaling body parts at different rates:
 * - **Tier 1: Core muscles** (chest, shoulders) — maxGrowth=1.2, rate=0.08, approaches 2.2x.
 *   Non-uniform scaling (wider > taller, Y *= 0.7).
 * - **Tier 2: Limbs** (biceps, thighs) — maxGrowth=0.9, rate=0.07, approaches 1.9x.
 *   Slight Z-axis reduction (Z *= 0.9) on thighs to prevent boxy look.
 * - **Tier 3: Extremities** (hands, feet) — maxGrowth=0.7, rate=0.06, approaches 1.7x.
 * - **Tier 4: Head** — maxGrowth=0.4, rate=0.05, approaches 1.4x.
 * - **Tier 5: Cosmetic** (tail, features) — maxGrowth=0.3, rate=0.04, approaches 1.3x.
 *
 * @param {PlayerModel} model - The player model object returned by buildPlayerModel.
 * @param {number} level - Current player level (1-based).
 */
export function updateMuscleGrowth(model, level) {
  const t = level - 1;

  // Logarithmic growth helper: asymptotically approaches (1 + maxGrowth) but never caps
  const logScale = (maxGrowth, growthRate) => 1 + maxGrowth * (1 - Math.exp(-growthRate * t));

  // Tier 1: Core muscles (chest, shoulders) — widest growth, non-uniform (wider > taller)
  // Only scale muscles that are NOT children of arm/leg groups (chest, shoulderL, shoulderR)
  // bicepL/R and thighL/R ARE the arm/leg array entries — skip them here to avoid double-scaling
  const mS = logScale(1.2, 0.08);
  if (model.muscles) {
    for (const key of ['chest', 'shoulderL', 'shoulderR']) {
      if (model.muscles[key]) model.muscles[key].scale.set(mS, mS * 0.7, mS);
    }
  }

  // Tier 2: Limbs (arms, legs) — moderate proportional growth
  // Thighs use 90% Z-axis scale to prevent boxy look at high levels
  const lS = logScale(0.9, 0.07);
  if (model.arms) {
    for (const arm of model.arms) {
      if (arm) arm.scale.set(lS, lS, lS);
    }
  }
  if (model.legs) {
    for (const leg of model.legs) {
      if (leg) leg.scale.set(lS, lS, lS * 0.9);
    }
  }

  // Tier 3: Extremities (hands, feet) — subtle growth
  const eS = logScale(0.7, 0.06);
  for (const arr of [model.hands, model.feet]) {
    if (arr) for (const part of arr) {
      if (part) part.scale.set(eS, eS, eS);
    }
  }

  // Tier 4: Head — minimal growth to maintain proportions
  const hS = logScale(0.4, 0.05);
  if (model.head) model.head.scale.set(hS, hS, hS);

  // Tier 5: Cosmetic (tail, features) — very subtle
  const fS = logScale(0.3, 0.04);
  if (model.tail) model.tail.scale.set(fS, fS, fS);
  if (model.features) {
    for (const k in model.features) {
      const feat = model.features[k];
      if (!feat) continue;
      // Features can be single meshes or arrays of meshes
      if (Array.isArray(feat)) {
        for (const m of feat) { if (m) m.scale.set(fS, fS, fS); }
      } else {
        feat.scale.set(fS, fS, fS);
      }
    }
  }
}

// ============================================================================
// ITEM VISUALS — BD-70/BD-104: Display equipped items on the character model
// ============================================================================

/**
 * Registry mapping visual keys to voxel box specifications for display on the player model.
 * Keys correspond either to item IDs (for string-value slots like armor/boots) or to
 * st.items property names (for boolean/stackable slots).
 *
 * Each entry defines a body region (slot) and an array of box primitives with position/size/color.
 * Optional `emissive` property on boxes adds glow for rare/legendary items.
 * Coordinates are in model-local space (same as buildPlayerModel boxes).
 *
 * @type {Object.<string, {slot: string, boxes: Array.<{w: number, h: number, d: number, color: number, x: number, y: number, z: number, emissive?: number}>}>}
 */
const ITEM_VISUALS = {
  // --- Armor slot (string-value: st.items.armor = 'leather' | 'chainmail') ---
  leather: { slot: 'torso', boxes: [
    { w: 0.75, h: 0.5, d: 0.48, color: 0xb08040, x: 0, y: 0.85, z: 0.02 },
    { w: 0.15, h: 0.2, d: 0.15, color: 0x8a6030, x: -0.35, y: 1.05, z: 0 },
    { w: 0.15, h: 0.2, d: 0.15, color: 0x8a6030, x: 0.35, y: 1.05, z: 0 },
  ]},
  chainmail: { slot: 'torso', boxes: [
    { w: 0.78, h: 0.52, d: 0.5, color: 0xaaaacc, x: 0, y: 0.85, z: 0.02, emissive: 0x222233 },
    { w: 0.2, h: 0.22, d: 0.18, color: 0x888aaa, x: -0.38, y: 1.08, z: 0, emissive: 0x222233 },
    { w: 0.2, h: 0.22, d: 0.18, color: 0x888aaa, x: 0.38, y: 1.08, z: 0, emissive: 0x222233 },
  ]},
  // --- Boots slot (string-value: st.items.boots = 'soccerCleats' | 'cowboyBoots') ---
  soccerCleats: { slot: 'feet', boxes: [
    { w: 0.2, h: 0.12, d: 0.25, color: 0x228822, x: -0.2, y: 0.06, z: 0 },
    { w: 0.2, h: 0.12, d: 0.25, color: 0x228822, x: 0.2, y: 0.06, z: 0 },
  ]},
  cowboyBoots: { slot: 'feet', boxes: [
    { w: 0.22, h: 0.25, d: 0.22, color: 0x8B4513, x: -0.2, y: 0.12, z: 0 },
    { w: 0.22, h: 0.25, d: 0.22, color: 0x8B4513, x: 0.2, y: 0.12, z: 0 },
  ]},
  // --- Boolean slots (st.items.KEY = true/false) ---
  glasses: { slot: 'face', boxes: [
    { w: 0.12, h: 0.06, d: 0.06, color: 0x222222, x: -0.14, y: 1.56, z: 0.26 },
    { w: 0.12, h: 0.06, d: 0.06, color: 0x222222, x: 0.14, y: 1.56, z: 0.26 },
    { w: 0.06, h: 0.03, d: 0.03, color: 0x444444, x: 0, y: 1.57, z: 0.27 },
  ]},
  ring: { slot: 'hand', boxes: [
    { w: 0.08, h: 0.04, d: 0.08, color: 0xcccccc, x: -0.32, y: 0.65, z: 0.15 },
  ]},
  gloves: { slot: 'hands', boxes: [
    { w: 0.16, h: 0.12, d: 0.14, color: 0xcc3333, x: -0.48, y: 0.62, z: 0.05 },
    { w: 0.16, h: 0.12, d: 0.14, color: 0xcc3333, x: 0.48, y: 0.62, z: 0.05 },
  ]},
  crown: { slot: 'head', boxes: [
    { w: 0.08, h: 0.12, d: 0.08, color: 0xFFD700, x: -0.15, y: 1.82, z: 0, emissive: 0x332200 },
    { w: 0.08, h: 0.12, d: 0.08, color: 0xFFD700, x: 0.15, y: 1.82, z: 0, emissive: 0x332200 },
    { w: 0.08, h: 0.12, d: 0.08, color: 0xFFD700, x: 0, y: 1.82, z: -0.1, emissive: 0x332200 },
    { w: 0.08, h: 0.12, d: 0.08, color: 0xFFD700, x: 0, y: 1.82, z: 0.1, emissive: 0x332200 },
    { w: 0.08, h: 0.10, d: 0.08, color: 0xffcc00, x: -0.08, y: 1.85, z: 0.08, emissive: 0x332200 },
  ]},
  scarf: { slot: 'neck', boxes: [
    { w: 0.42, h: 0.1, d: 0.35, color: 0xff44ff, x: 0, y: 1.2, z: 0, emissive: 0x331133 },
    { w: 0.08, h: 0.25, d: 0.06, color: 0xff66ff, x: 0.18, y: 1.05, z: 0.18, emissive: 0x331133 },
  ]},
  vest: { slot: 'torso', boxes: [
    { w: 0.72, h: 0.45, d: 0.46, color: 0xcc4422, x: 0, y: 0.88, z: 0.02, emissive: 0x221100 },
    { w: 0.1, h: 0.08, d: 0.1, color: 0xdddddd, x: -0.28, y: 0.95, z: 0.22, emissive: 0x221100 },
    { w: 0.1, h: 0.08, d: 0.1, color: 0xdddddd, x: 0.28, y: 0.95, z: 0.22, emissive: 0x221100 },
  ]},
  pendant: { slot: 'neck', boxes: [
    { w: 0.06, h: 0.06, d: 0.04, color: 0x44ff88, x: 0, y: 1.12, z: 0.22 },
    { w: 0.18, h: 0.03, d: 0.03, color: 0x888888, x: 0, y: 1.18, z: 0.2 },
  ]},
  bracelet: { slot: 'hand', boxes: [
    { w: 0.14, h: 0.05, d: 0.14, color: 0x4488ff, x: 0.48, y: 0.7, z: 0, emissive: 0x112244 },
  ]},
  cushion: { slot: 'belt', boxes: [
    { w: 0.15, h: 0.1, d: 0.12, color: 0xff88cc, x: -0.35, y: 0.55, z: 0, emissive: 0x221122 },
  ]},
  turboshoes: { slot: 'feet', boxes: [
    { w: 0.22, h: 0.14, d: 0.26, color: 0x22cccc, x: -0.2, y: 0.07, z: 0, emissive: 0x112222 },
    { w: 0.22, h: 0.14, d: 0.26, color: 0x22cccc, x: 0.2, y: 0.07, z: 0, emissive: 0x112222 },
    { w: 0.06, h: 0.08, d: 0.04, color: 0x88ffff, x: -0.32, y: 0.1, z: 0, emissive: 0x224444 },
    { w: 0.06, h: 0.08, d: 0.04, color: 0x88ffff, x: 0.32, y: 0.1, z: 0, emissive: 0x224444 },
  ]},
  goldenbone: { slot: 'belt', boxes: [
    { w: 0.2, h: 0.06, d: 0.06, color: 0xffcc00, x: -0.3, y: 0.55, z: 0.15, emissive: 0x443300 },
    { w: 0.06, h: 0.1, d: 0.06, color: 0xffcc00, x: -0.38, y: 0.55, z: 0.15, emissive: 0x443300 },
    { w: 0.06, h: 0.1, d: 0.06, color: 0xffcc00, x: -0.22, y: 0.55, z: 0.15, emissive: 0x443300 },
  ]},
  zombiemagnet: { slot: 'belt', boxes: [
    { w: 0.1, h: 0.12, d: 0.06, color: 0x88ff88, x: 0.32, y: 0.6, z: -0.15, emissive: 0x113311 },
    { w: 0.04, h: 0.12, d: 0.06, color: 0xff4444, x: 0.36, y: 0.6, z: -0.15, emissive: 0x331111 },
  ]},
  // --- Stackable items (st.items.KEY = count) ---
  thickFur: { slot: 'torso', boxes: [
    { w: 0.8, h: 0.55, d: 0.52, color: 0xaa8855, x: 0, y: 0.85, z: 0 },
  ]},
  bandana: { slot: 'head', boxes: [
    { w: 0.42, h: 0.06, d: 0.42, color: 0xcc2222, x: 0, y: 1.68, z: 0 },
  ]},
  rubberDucky: { slot: 'belt', boxes: [
    { w: 0.12, h: 0.12, d: 0.12, color: 0xffdd00, x: 0.35, y: 0.55, z: 0 },
  ]},
};

/**
 * Slots where st.items[key] holds a string item ID (the equipped item's id from ITEMS_3D)
 * rather than a boolean or stack count. For these slots, the visual key is the string value,
 * not the st.items property name.
 * @type {Set<string>}
 */
const STRING_VALUE_SLOTS = new Set(['armor', 'boots']);

/**
 * Per-animal Y offsets and scale factors for item visual placement.
 * Adjusts item positions to account for different animal head heights and body sizes.
 *
 * @type {Object.<string, {headY: number, torsoScale: number}>}
 */
const ANIMAL_OFFSETS = {
  leopard: { headY: 0, torsoScale: 1.0 },
  redPanda: { headY: -0.02, torsoScale: 0.93 },
  lion: { headY: 0.05, torsoScale: 1.1 },
  gator: { headY: 0.03, torsoScale: 1.05 },
};

/**
 * Update the visual item meshes on the player model to reflect current equipped items.
 *
 * Removes all existing item meshes, then re-creates meshes for each equipped item
 * that has a visual definition in ITEM_VISUALS. Meshes are added directly to the
 * player model's root group so they move/rotate with the character.
 *
 * This function is called whenever the player picks up an item, and handles:
 * - String-value slots (armor, boots) — the value IS the ITEM_VISUALS key
 *     e.g. st.items.armor = 'leather' → look up ITEM_VISUALS['leather']
 * - Boolean slots (glasses, crown, gloves, ring, scarf, etc.) — the st.items key IS the visual key
 *     e.g. st.items.glasses = true → look up ITEM_VISUALS['glasses']
 * - Stackable items (thickFur, bandana, rubberDucky, etc.) — the st.items key IS the visual key
 *     e.g. st.items.bandana = 3 → look up ITEM_VISUALS['bandana']
 *
 * Rare/legendary items get emissive glow via per-box `emissive` property in ITEM_VISUALS.
 *
 * @param {PlayerModel} model - The player model object returned by buildPlayerModel.
 * @param {Object} items - The st.items object containing equipped item state.
 * @param {string} animalId - One of 'leopard', 'redPanda', 'lion', 'gator'.
 */
export function updateItemVisuals(model, items, animalId) {
  // Remove all existing item meshes
  if (model.itemMeshes) {
    for (const key in model.itemMeshes) {
      for (const mesh of model.itemMeshes[key]) {
        model.group.remove(mesh);
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) mesh.material.dispose();
      }
    }
  }
  model.itemMeshes = {};

  const offsets = ANIMAL_OFFSETS[animalId] || ANIMAL_OFFSETS.leopard;

  for (const slotKey in items) {
    const val = items[slotKey];
    if (!val || val <= 0) continue;

    // Resolve the visual key: for string-value slots (armor, boots), use the string value;
    // for boolean/count slots, use the st.items property name directly.
    let visualKey;
    if (STRING_VALUE_SLOTS.has(slotKey)) {
      visualKey = val; // val is the item ID string, e.g. 'leather', 'soccerCleats'
    } else {
      visualKey = slotKey; // key is the visual key, e.g. 'glasses', 'crown', 'bandana'
    }

    const visual = ITEM_VISUALS[visualKey];
    if (!visual) continue;

    const meshes = [];
    for (const b of visual.boxes) {
      const geo = new THREE.BoxGeometry(b.w, b.h, b.d);
      const matOpts = { color: b.color };
      if (b.emissive) matOpts.emissive = b.emissive;
      const mat = new THREE.MeshLambertMaterial(matOpts);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(b.x, b.y + (offsets.headY || 0), b.z);
      mesh.castShadow = true;
      model.group.add(mesh);
      meshes.push(mesh);
    }
    model.itemMeshes[visualKey] = meshes;
  }
}

// ============================================================================
// WEARABLE VISUALS — BD-180: Display equipped wearables on the character model
// ============================================================================

/**
 * Registry mapping wearable IDs to voxel box specifications for visual display.
 * Each entry defines an array of box primitives with position/size/color.
 * Coordinates are in model-local space (same as buildPlayerModel boxes).
 *
 * @type {Object.<string, Array.<{w: number, h: number, d: number, color: number, x: number, y: number, z: number}>>}
 */
const WEARABLE_VISUALS = {
  partyHat: [
    // Cone-like stack: wide base, narrow top
    { w: 0.36, h: 0.12, d: 0.36, color: 0xff4488, x: 0, y: 1.82, z: 0 },
    { w: 0.24, h: 0.14, d: 0.24, color: 0xff66aa, x: 0, y: 1.95, z: 0 },
    { w: 0.12, h: 0.12, d: 0.12, color: 0xffaacc, x: 0, y: 2.06, z: 0 },
  ],
  sharkFin: [
    // Single triangular-ish fin on top of head
    { w: 0.06, h: 0.30, d: 0.20, color: 0x4488cc, x: 0, y: 1.92, z: -0.05 },
    { w: 0.04, h: 0.18, d: 0.12, color: 0x66aadd, x: 0, y: 2.08, z: -0.02 },
  ],
  cardboardBox: [
    // Slightly wider box around the torso
    { w: 0.80, h: 0.60, d: 0.50, color: 0xbb8844, x: 0, y: 0.85, z: 0.02 },
    // Flap lines (dark accents)
    { w: 0.78, h: 0.03, d: 0.48, color: 0x886633, x: 0, y: 1.14, z: 0.02 },
  ],
  bumbleArmor: [
    // Yellow box around torso
    { w: 0.82, h: 0.58, d: 0.50, color: 0xffcc00, x: 0, y: 0.85, z: 0.02 },
    // Black stripe
    { w: 0.83, h: 0.10, d: 0.51, color: 0x222222, x: 0, y: 0.85, z: 0.02 },
    // Second stripe
    { w: 0.83, h: 0.06, d: 0.51, color: 0x222222, x: 0, y: 1.02, z: 0.02 },
  ],
  clownShoes: [
    // Oversized red boxes at foot positions
    { w: 0.30, h: 0.12, d: 0.40, color: 0xff2222, x: -0.18, y: 0.04, z: 0.08 },
    { w: 0.30, h: 0.12, d: 0.40, color: 0xff2222, x: 0.18, y: 0.04, z: 0.08 },
    // Round toe bumps
    { w: 0.14, h: 0.14, d: 0.14, color: 0xff4444, x: -0.18, y: 0.06, z: 0.26 },
    { w: 0.14, h: 0.14, d: 0.14, color: 0xff4444, x: 0.18, y: 0.06, z: 0.26 },
  ],
  springBoots: [
    // Green boxes at foot positions
    { w: 0.26, h: 0.14, d: 0.30, color: 0x44ff44, x: -0.18, y: 0.05, z: 0.04 },
    { w: 0.26, h: 0.14, d: 0.30, color: 0x44ff44, x: 0.18, y: 0.05, z: 0.04 },
    // Small coil underneath (silver)
    { w: 0.14, h: 0.06, d: 0.14, color: 0xcccccc, x: -0.18, y: -0.02, z: 0.04 },
    { w: 0.14, h: 0.06, d: 0.14, color: 0xcccccc, x: 0.18, y: -0.02, z: 0.04 },
    // Second coil ring
    { w: 0.10, h: 0.04, d: 0.10, color: 0xaaaaaa, x: -0.18, y: -0.06, z: 0.04 },
    { w: 0.10, h: 0.04, d: 0.10, color: 0xaaaaaa, x: 0.18, y: -0.06, z: 0.04 },
  ],
  bumbleHelmet: [
    // Yellow dome helmet on head
    { w: 0.52, h: 0.28, d: 0.50, color: 0xffcc00, x: 0, y: 1.82, z: 0 },
    // Black stripe across middle
    { w: 0.53, h: 0.08, d: 0.51, color: 0x222222, x: 0, y: 1.80, z: 0 },
    // Second black stripe near top
    { w: 0.44, h: 0.06, d: 0.42, color: 0x222222, x: 0, y: 1.92, z: 0 },
    // Left antenna stalk
    { w: 0.04, h: 0.18, d: 0.04, color: 0x222222, x: -0.10, y: 2.04, z: 0 },
    // Right antenna stalk
    { w: 0.04, h: 0.18, d: 0.04, color: 0x222222, x: 0.10, y: 2.04, z: 0 },
    // Left antenna tip (yellow ball)
    { w: 0.08, h: 0.08, d: 0.08, color: 0xffdd44, x: -0.10, y: 2.16, z: 0 },
    // Right antenna tip (yellow ball)
    { w: 0.08, h: 0.08, d: 0.08, color: 0xffdd44, x: 0.10, y: 2.16, z: 0 },
  ],
  crownOfClaws: [
    // Gold band base
    { w: 0.50, h: 0.08, d: 0.48, color: 0xffd700, x: 0, y: 1.80, z: 0 },
    // Front claw spike (center, tallest)
    { w: 0.06, h: 0.22, d: 0.06, color: 0xffd700, x: 0, y: 1.96, z: 0.18 },
    // Front-left claw spike
    { w: 0.06, h: 0.16, d: 0.06, color: 0xffcc00, x: -0.16, y: 1.92, z: 0.12 },
    // Front-right claw spike
    { w: 0.06, h: 0.16, d: 0.06, color: 0xffcc00, x: 0.16, y: 1.92, z: 0.12 },
    // Back-left claw spike
    { w: 0.06, h: 0.14, d: 0.06, color: 0xcc9900, x: -0.14, y: 1.90, z: -0.12 },
    // Back-right claw spike
    { w: 0.06, h: 0.14, d: 0.06, color: 0xcc9900, x: 0.14, y: 1.90, z: -0.12 },
    // Dark gold accent band
    { w: 0.48, h: 0.04, d: 0.46, color: 0xcc9900, x: 0, y: 1.78, z: 0 },
  ],
  knightPlate: [
    // Main chest plate (silver-gray)
    { w: 0.82, h: 0.58, d: 0.52, color: 0xbbbbcc, x: 0, y: 0.85, z: 0.02 },
    // Left shoulder pauldron
    { w: 0.24, h: 0.18, d: 0.22, color: 0x8888aa, x: -0.44, y: 1.10, z: 0 },
    // Right shoulder pauldron
    { w: 0.24, h: 0.18, d: 0.22, color: 0x8888aa, x: 0.44, y: 1.10, z: 0 },
    // Center cross accent (darker metal)
    { w: 0.04, h: 0.30, d: 0.04, color: 0x666688, x: 0, y: 0.88, z: 0.26 },
    { w: 0.18, h: 0.04, d: 0.04, color: 0x666688, x: 0, y: 0.95, z: 0.26 },
    // Highlight edge at top
    { w: 0.80, h: 0.04, d: 0.50, color: 0xddddee, x: 0, y: 1.14, z: 0.02 },
  ],
  dragonScale: [
    // Main green scale armor
    { w: 0.84, h: 0.60, d: 0.52, color: 0x44aa44, x: 0, y: 0.85, z: 0.02 },
    // Overlapping scale rows (darker green, offset)
    { w: 0.80, h: 0.08, d: 0.50, color: 0x338833, x: 0, y: 0.72, z: 0.02 },
    { w: 0.78, h: 0.08, d: 0.48, color: 0x338833, x: 0.04, y: 0.84, z: 0.02 },
    { w: 0.76, h: 0.08, d: 0.46, color: 0x338833, x: -0.04, y: 0.96, z: 0.02 },
    // Yellow-green glowing trim at top
    { w: 0.82, h: 0.04, d: 0.50, color: 0x88ff44, x: 0, y: 1.14, z: 0.02 },
    // Yellow-green glowing trim at bottom
    { w: 0.82, h: 0.04, d: 0.50, color: 0x88ff44, x: 0, y: 0.56, z: 0.02 },
  ],
  rocketBoots: [
    // Orange boot shafts
    { w: 0.24, h: 0.18, d: 0.28, color: 0xff6600, x: -0.18, y: 0.08, z: 0.02 },
    { w: 0.24, h: 0.18, d: 0.28, color: 0xff6600, x: 0.18, y: 0.08, z: 0.02 },
    // Exhaust nozzles (dark gray at back of boots)
    { w: 0.12, h: 0.10, d: 0.06, color: 0x444444, x: -0.18, y: 0.04, z: -0.14 },
    { w: 0.12, h: 0.10, d: 0.06, color: 0x444444, x: 0.18, y: 0.04, z: -0.14 },
    // Flame exhaust (red)
    { w: 0.10, h: 0.08, d: 0.08, color: 0xff2200, x: -0.18, y: -0.02, z: -0.16 },
    { w: 0.10, h: 0.08, d: 0.08, color: 0xff2200, x: 0.18, y: -0.02, z: -0.16 },
    // Inner flame (yellow-orange)
    { w: 0.06, h: 0.10, d: 0.06, color: 0xffcc00, x: -0.18, y: -0.04, z: -0.16 },
    { w: 0.06, h: 0.10, d: 0.06, color: 0xffcc00, x: 0.18, y: -0.04, z: -0.16 },
  ],
  shadowSteps: [
    // Dark purple boot shafts
    { w: 0.24, h: 0.16, d: 0.28, color: 0x332244, x: -0.18, y: 0.06, z: 0.02 },
    { w: 0.24, h: 0.16, d: 0.28, color: 0x332244, x: 0.18, y: 0.06, z: 0.02 },
    // Wide shadowy soles
    { w: 0.28, h: 0.06, d: 0.34, color: 0x221133, x: -0.18, y: 0.00, z: 0.04 },
    { w: 0.28, h: 0.06, d: 0.34, color: 0x221133, x: 0.18, y: 0.00, z: 0.04 },
    // Purple glow accents on sides
    { w: 0.04, h: 0.12, d: 0.04, color: 0x8844ff, x: -0.32, y: 0.08, z: 0.02 },
    { w: 0.04, h: 0.12, d: 0.04, color: 0x8844ff, x: 0.32, y: 0.08, z: 0.02 },
    // Purple glow accents on toes
    { w: 0.06, h: 0.04, d: 0.04, color: 0x8844ff, x: -0.18, y: 0.04, z: 0.18 },
    { w: 0.06, h: 0.04, d: 0.04, color: 0x8844ff, x: 0.18, y: 0.04, z: 0.18 },
  ],
  gravityStompers: [
    // Chunky purple boot shafts (wider than normal)
    { w: 0.28, h: 0.20, d: 0.30, color: 0xaa44ff, x: -0.18, y: 0.08, z: 0.02 },
    { w: 0.28, h: 0.20, d: 0.30, color: 0xaa44ff, x: 0.18, y: 0.08, z: 0.02 },
    // Extra-wide heavy soles
    { w: 0.34, h: 0.08, d: 0.38, color: 0x7722cc, x: -0.18, y: -0.02, z: 0.04 },
    { w: 0.34, h: 0.08, d: 0.38, color: 0x7722cc, x: 0.18, y: -0.02, z: 0.04 },
    // Bright glow strip on sole bottom
    { w: 0.30, h: 0.04, d: 0.34, color: 0xcc88ff, x: -0.18, y: -0.06, z: 0.04 },
    { w: 0.30, h: 0.04, d: 0.34, color: 0xcc88ff, x: 0.18, y: -0.06, z: 0.04 },
  ],
};

/**
 * Build a Three.js Group containing the visual mesh for a wearable item.
 * Uses the box() helper for consistent voxel-style construction.
 *
 * @param {string} wearableId - The wearable ID (key in WEARABLES_3D).
 * @returns {THREE.Group|null} A group containing the wearable meshes, or null if no visual defined.
 */
export function buildWearableMesh(wearableId) {
  const boxes = WEARABLE_VISUALS[wearableId];
  if (!boxes) return null;

  const group = new THREE.Group();
  for (const b of boxes) {
    box(group, b.w, b.h, b.d, b.color, b.x, b.y, b.z, true);
  }
  return group;
}

/**
 * Update the visual wearable meshes on the player model to reflect current equipped wearables.
 * Removes all existing wearable meshes, then re-creates meshes for each equipped wearable.
 *
 * @param {PlayerModel} model - The player model object returned by buildPlayerModel.
 * @param {Object} wearables - The st.wearables object { head, body, feet } with wearable IDs or null.
 */
export function updateWearableVisuals(model, wearables) {
  // Remove all existing wearable meshes
  if (model.wearableMeshes) {
    for (const slot in model.wearableMeshes) {
      const grp = model.wearableMeshes[slot];
      if (grp) {
        model.group.remove(grp);
        grp.traverse(c => {
          if (c.geometry) c.geometry.dispose();
          if (c.material) c.material.dispose();
        });
      }
    }
  }
  model.wearableMeshes = {};

  for (const slot of ['head', 'body', 'feet']) {
    const wId = wearables[slot];
    if (!wId) continue;
    const grp = buildWearableMesh(wId);
    if (grp) {
      model.group.add(grp);
      model.wearableMeshes[slot] = grp;
    }
  }
}
