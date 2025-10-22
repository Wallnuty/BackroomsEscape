import * as THREE from "three";
import { code } from "three/tsl";

// --- Room definitions ---
export const PlaygroundLayouts = {
  Playground: {
    position: new THREE.Vector3(0, 0, 0),
    width: 40,
    height: 12,
    depth: 40,
  },

  SignIn: {
    position: new THREE.Vector3(-50, 0, 0),
    width: 40,
    height: 8,
    depth: 40,
  },

  Extra: {
    position: new THREE.Vector3(-100, 0, 0),
    width: 40,
    height: 8,
    depth: 40,
  },
};

// --- Walls and lights helpers ---
function createWalls(room) {
  console.log("Creating walls for room:", room);
  const halfW = room.width / 2;
  const halfH = room.height / 2;
  const halfD = room.depth / 2;

  let walls = [
    [
      new THREE.Vector3(-halfW, 0, -halfD),
      new THREE.Vector3(halfW, 0, -halfD),
      0.4,
    ], // back
    [
      new THREE.Vector3(halfW, 0, -halfD),
      new THREE.Vector3(halfW, 0, halfD),
      0.4,
    ], // right
    [
      new THREE.Vector3(halfW, 0, halfD),
      new THREE.Vector3(-halfW, 0, halfD),
      0.4,
    ], // front
    [
      new THREE.Vector3(-halfW, 0, halfD),
      new THREE.Vector3(-halfW, 0, -halfD),
      0.4,
    ], // left
  ];

  const halfDoor = 4; // door half-width

  if (room === PlaygroundLayouts.Playground) {
    console.log("Adding door cutout for Playground left wall");
    const wall = walls[3];
    const zC = 0;
    walls.splice(
      3,
      1,
      [
        wall[0].clone(),
        new THREE.Vector3(wall[1].x, 0, zC - halfDoor),
        wall[2],
      ],
      [new THREE.Vector3(wall[0].x, 0, zC + halfDoor), wall[1].clone(), wall[2]]
    );
  } else if (room === PlaygroundLayouts.SignIn) {
    // left wall cutout
    let wall = walls[3];
    let zC = 0;
    walls.splice(
      3,
      1,
      [
        wall[0].clone(),
        new THREE.Vector3(wall[1].x, 0, zC - halfDoor),
        wall[2],
      ],
      [new THREE.Vector3(wall[0].x, 0, zC + halfDoor), wall[1].clone(), wall[2]]
    );
    // right wall cutout
    wall = walls[1];
    zC = 0;
    walls.splice(
      1,
      1,
      [
        wall[0].clone(),
        new THREE.Vector3(wall[1].x, 0, zC - halfDoor),
        wall[2],
      ],
      [new THREE.Vector3(wall[0].x, 0, zC + halfDoor), wall[1].clone(), wall[2]]
    );
    console.log("Sign in walls:", walls);
  } else if (room === PlaygroundLayouts.Extra) {
    console.log("Adding door cutout for Extra right wall");
    const wall = walls[1];
    const zC = 0;
    walls.splice(
      1,
      1,
      [
        wall[0].clone(),
        new THREE.Vector3(wall[1].x, 0, zC - halfDoor),
        wall[2],
      ],
      [new THREE.Vector3(wall[0].x, 0, zC + halfDoor), wall[1].clone(), wall[2]]
    );
  }

  room.walls = walls;
  console.log("Walls created:", walls);
}

function createLights(room, spacing = 8) {
  console.log("Creating lights for room:", room);
  const halfW = room.width / 2;
  const halfD = room.depth / 2;
  room.lights = [
    [halfW - spacing, halfD - spacing],
    [halfW - spacing, -halfD + spacing],
    [-halfW + spacing, halfD - spacing],
    [-halfW + spacing, -halfD + spacing],
  ];
  console.log("Lights created:", room.lights);
}

// --- Models ---
function createModels() {
  console.log("Creating models for all rooms");

  PlaygroundLayouts.Playground.models = [
    {
      path: "/models/old_playground_slide.glb",
      position: new THREE.Vector3(14, -6, 14),
      scale: new THREE.Vector3(1.5, 1.5, 1.5),
      rotation: new THREE.Vector3(0, Math.PI / 4, 0),
      type: "slide",
      code: 1,
      isTeleportSlide: false,
    },
    {
      path: "/models/swing_set.glb",
      position: new THREE.Vector3(-11, -6, -12),
      scale: new THREE.Vector3(0.008, 0.008, 0.012),
      rotation: new THREE.Vector3(0, 0, 0),
      type: "swing",
      code: 2,
    },
    {
      path: "/models/old_roundabout_merry_go_round.glb",
      position: new THREE.Vector3(14, -6, -14),
      scale: new THREE.Vector3(5, 5, 5),
      rotation: new THREE.Vector3(0, 0, 0),
      type: "default",
      code: 3,
    },
    {
      path: "/models/kid_cycle.glb",
      position: new THREE.Vector3(14, -6, 0),
      scale: new THREE.Vector3(6, 6, 6),
      rotation: new THREE.Vector3(0, 180, 0),
      type: "default",
      code: 4,
    },
    {
      path: "/models/see_saw.glb",
      position: new THREE.Vector3(-10, -6, 12),
      scale: new THREE.Vector3(4, 4, 4),
      rotation: new THREE.Vector3(0, 90, 0),
      type: "default",
      code: 5,
    },
        {
      path: "/models/toy_giraffe.glb",
      position: new THREE.Vector3(0, -6, 13),
      scale: new THREE.Vector3(40, 40, 40),
      rotation: new THREE.Vector3(0, 90, 0),
      type: "default",
      code: 6,
    },
  ];

  PlaygroundLayouts.SignIn.models = [
    {
      path: "/models/desk.glb",
      position: new THREE.Vector3(0, -2.5, 0),
      scale: new THREE.Vector3(1, 1, 1),
      rotation: new THREE.Vector3(0, 0, 0),
      type: "default",
    },
    {
      path: "/models/wooden_chair.glb",
      position: new THREE.Vector3(2, -2.5, 2),
      scale: new THREE.Vector3(1, 1, 1),
      rotation: new THREE.Vector3(0, Math.PI / 2, 0),
      type: "default",
    },
  ];

  PlaygroundLayouts.Extra.models = [];
  console.log(
    "Models created:",
    PlaygroundLayouts.Playground.models,
    PlaygroundLayouts.SignIn.models
  );
}

// --- Apply helpers ---
for (const key in PlaygroundLayouts) {
  console.log("Applying room setup for:", key);
  createWalls(PlaygroundLayouts[key]);
  createLights(PlaygroundLayouts[key]);
}
createModels();

// --- Zones for teleport / corridor ---
console.log("Creating zones for rooms");
PlaygroundLayouts.Playground.zones = [
  [
    new THREE.Vector3(-20, 0, -20),
    new THREE.Vector3(-40, 0, 20),
    "toSignIn",
    PlaygroundLayouts.SignIn.position.clone(),
  ],
];

PlaygroundLayouts.SignIn.zones = [
  [
    new THREE.Vector3(20, 0, -20),
    new THREE.Vector3(0, 0, 20),
    "toPlayground",
    PlaygroundLayouts.Playground.position.clone(),
  ],
  [
    new THREE.Vector3(-20, 0, -20),
    new THREE.Vector3(-40, 0, 20),
    "toExtra",
    PlaygroundLayouts.Extra.position.clone(),
  ],
];

PlaygroundLayouts.Extra.zones = [
  [
    new THREE.Vector3(20, 0, -20),
    new THREE.Vector3(0, 0, 20),
    "toSignIn",
    PlaygroundLayouts.SignIn.position.clone(),
  ],
];

console.log("PlaygroundLayouts fully initialized:", PlaygroundLayouts);
