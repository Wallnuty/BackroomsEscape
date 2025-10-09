import * as THREE from 'three';

export const RoomLayouts = {

  Playground: {
    position: new THREE.Vector3(0, 0, 0),
    width: 40,
    height: 12,
    depth: 40,
  },

  SignIn: {
    position: new THREE.Vector3(0, 0, 0),
    width: 40,
    height: 8,
    depth: 40,
  },

  Extra: {
    position: new THREE.Vector3(0, 0, 0),
    width: 40,
    height: 8,
    depth: 40,
  }

};

// --- Helper function to create walls based on room dimensions ---
function createWalls(room) {
  const halfW = room.width / 2;
  const halfH = room.height / 2;
  const halfD = room.depth / 2;

  room.walls = [
    [new THREE.Vector3(-halfW, 0, -halfD), new THREE.Vector3(halfW, 0, -halfD), 0.4], // back
    [new THREE.Vector3(halfW, 0, -halfD), new THREE.Vector3(halfW, 0, halfD), 0.4],  // right
    [new THREE.Vector3(halfW, 0, halfD), new THREE.Vector3(-halfW, 0, halfD), 0.4],  // front
    [new THREE.Vector3(-halfW, 0, halfD), new THREE.Vector3(-halfW, 0, -halfD), 0.4]  // left
  ];
}

// --- Helper function to create ceiling lights ---
function createLights(room, spacing = 8) {
  const halfW = room.width / 2;
  const halfD = room.depth / 2;
  room.lights = [
    [halfW - spacing, halfD - spacing],
    [halfW - spacing, -halfD + spacing],
    [-halfW + spacing, halfD - spacing],
    [-halfW + spacing, -halfD + spacing]
  ];
}

// --- Helper function to define example models ---
function createModels() {
  RoomLayouts.Playground.models = [
    {
      path: '/models/old_playground_slide.glb',
      position: new THREE.Vector3(14, -6, 14),
      scale: new THREE.Vector3(1.5, 1.5, 1.5),
      rotation: new THREE.Vector3(0, Math.PI / 4, 0),
      type: 'slide'
    },
    {
      path: '/models/swing_set.glb',
      position: new THREE.Vector3(-11, -6, -12),
      scale: new THREE.Vector3(0.008, 0.008, 0.012),
      rotation: new THREE.Vector3(0, 0, 0),
      type: 'swing'
    },
    {
      path: '/models/old_roundabout_merry_go_round.glb',
      position: new THREE.Vector3(14, -6, -14),
      scale: new THREE.Vector3(5, 5, 5),
      rotation: new THREE.Vector3(0, 0, 0),
      type: 'default'
    }
  ];

  RoomLayouts.SignIn.models = [
    {
      path: '/models/desk.glb',
      position: new THREE.Vector3(0, -2.5, 0),
      scale: new THREE.Vector3(1,1,1),
      rotation: new THREE.Vector3(0,0,0),
      type: 'default'
    },
    {
      path: '/models/wooden_chair.glb',
      position: new THREE.Vector3(2, -2.5, 2),
      scale: new THREE.Vector3(1,1,1),
      rotation: new THREE.Vector3(0, Math.PI/2, 0),
      type: 'default'
    }
  ];

  RoomLayouts.Extra.models = [];
}

// --- Apply helpers to each room ---
for (const roomKey in RoomLayouts) {
  createWalls(RoomLayouts[roomKey]);
  createLights(RoomLayouts[roomKey]);
}
createModels();

// Optional: zones (only Playground example)
const halfW = RoomLayouts.Playground.width / 2;
const halfD = RoomLayouts.Playground.depth / 2;
RoomLayouts.Playground.zones = [
  [
    new THREE.Vector3(halfW, 0, halfD),
    new THREE.Vector3(-halfW, 0, -halfD),
    'north',
    new THREE.Vector3(0, 0, halfD)
  ]
];
