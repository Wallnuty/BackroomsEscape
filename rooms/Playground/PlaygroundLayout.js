import * as THREE from "three";
import { code } from "three/tsl";

// --- Room definitions ---
export const PlaygroundLayouts = {
  Playground: {
    position: new THREE.Vector3(0, 0, 0),
    width: 60,
    height: 12,
    depth: 60,
  },

  SignIn: {
    position: new THREE.Vector3(-50, 0, 0),
    width: 40,
    height: 12,
    depth: 40,
  },

  Extra: {
    position: new THREE.Vector3(-100, 0, 0),
    width: 40,
    height: 12,
    depth: 40,

    // Chalkboard
    chalkboards: [
      {
        position: new THREE.Vector3(0, 2, 19.9),
        rotationY: Math.PI,
        phrase: "OBSERVATION",
      },
    ],
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
      position: new THREE.Vector3(20, -6, 20),
      scale: new THREE.Vector3(1.5, 1.3, 1.5),
      rotation: new THREE.Vector3(0, 0, 0),
      type: "slide",
      code: 1,
      isTeleportSlide: false,
      correctSound: "/audio/sfx/child_laugh.mp3",
      incorrectSound: "/audio/sfx/old_slide.mp3",
    },
    {
      path: "/models/swing_set.glb",
      position: new THREE.Vector3(0, -6, -20),
      scale: new THREE.Vector3(0.008, 0.008, 0.012),
      rotation: new THREE.Vector3(0, 0, 0),
      type: "swing",
      code: 2,
      correctSound: "/audio/sfx/child_laugh.mp3",
      incorrectSound: "/audio/sfx/swing_set.mp3",
    },
    {
      path: "/models/old_roundabout_merry_go_round.glb",
      position: new THREE.Vector3(0, -6, 0),
      scale: new THREE.Vector3(6, 6, 6),
      rotation: new THREE.Vector3(0, 0, 0),
      type: "merry-go-round",
      code: 3,
      correctSound: "/audio/sfx/child_laugh.mp3",
      incorrectSound: "/audio/sfx/merry_go_round.mp3",
    },
    {
      path: "/models/kid_cycle.glb",
      position: new THREE.Vector3(-20, -6, -10),
      scale: new THREE.Vector3(6, 6, 6),
      rotation: new THREE.Vector3(0, 180, 0),
      type: "default",
      code: 4,
      correctSound: "/audio/sfx/child_laugh.mp3",
      incorrectSound: "/audio/sfx/trike.mp3",
    },
    {
      path: "/models/kid_cycle.glb",
      position: new THREE.Vector3(8, -6, 20),
      scale: new THREE.Vector3(6, 6, 6),
      rotation: new THREE.Vector3(0, 180, 0),
      type: "default",
      code: 4,
      correctSound: "/audio/sfx/child_laugh.mp3",
      incorrectSound: "/audio/sfx/trike.mp3",
    },
    {
      path: "/models/see_saw.glb",
      position: new THREE.Vector3(-10, -6, 20),
      scale: new THREE.Vector3(5, 5, 5),
      rotation: new THREE.Vector3(0, Math.PI/2, 0),
      type: "see-saw",
      code: 5,
      correctSound: "/audio/sfx/child_laugh.mp3",
      incorrectSound: "/audio/sfx/see_saw.mp3",
    },
    {
      path: "/models/toy_giraffe.glb",
      position: new THREE.Vector3(-20, -6, 10),
      scale: new THREE.Vector3(40, 40, 40),
      rotation: new THREE.Vector3(0, 90, 0),
      type: "default",
      code: 6,
      correctSound: "/audio/sfx/child_laugh.mp3",
      incorrectSound: "/audio/sfx/wooden_blocks.mp3",
    },
    {
      path: "/models/ball_pit.glb",
      position: new THREE.Vector3(20, -5, 8),
      scale: new THREE.Vector3(0.3, 0.14, 0.3),
      rotation: new THREE.Vector3(0, 0, 0),
      type: "default",
      code: 1,
      correctSound: "/audio/sfx/child_laugh.mp3",
      incorrectSound: "/audio/sfx/old_slide.mp3",
    },
    {
      path: "/models/wooden_playground.glb",
      position: new THREE.Vector3(-20, -6, -20),
      scale: new THREE.Vector3(0.06, 0.06, 0.06),
      rotation: new THREE.Vector3(0, 0, 0),
      type: "default",
      code: 7,
      correctSound: "/audio/sfx/child_laugh.mp3",
      incorrectSound: "/audio/sfx/wooden_playground.mp3",
    },
    {
      path: "/models/trampoline.glb",
      position: new THREE.Vector3(21, -5.8, -13),
      scale: new THREE.Vector3(0.05, 0.05, 0.05),
      rotation: new THREE.Vector3(0, 0, 0),
      type: "default",
      code: 8,
      correctSound: "/audio/sfx/child_laugh.mp3",
      incorrectSound: "/audio/sfx/trampoline.mp3",
    },


  ];

  PlaygroundLayouts.SignIn.models = [
    {
      path: "/models/desk.glb",
      position: new THREE.Vector3(0, -6, -13),
      scale: new THREE.Vector3(3.5, 3.5, 3.5),
      rotation: new THREE.Vector3(0, Math.PI, 0),
      type: "default",
    },
    {
      path: "/models/wooden_chair.glb",
      position: new THREE.Vector3(1, -6, -14),
      scale: new THREE.Vector3(3.5, 3.5, 3.5),
      rotation: new THREE.Vector3(0, Math.PI, 0),
      type: "default",
    },
    {
      path: "/models/clipboard.glb",
      position: new THREE.Vector3(-1, -2.6, -13),
      scale: new THREE.Vector3(2, 2, 2),
      rotation: new THREE.Vector3(0, Math.PI, 0),
      type: "default",
    },
    {
      path: "/models/damage_door.glb",
      position: new THREE.Vector3(0, -6, 20),
      scale: new THREE.Vector3(0.04, 0.04, 0.04),
      rotation: new THREE.Vector3(0, Math.PI + Math.PI/2, 0),
      type: "door",
      code: null,
      correctSound: "/audio/sfx/door_opening.mp3",
      incorrectSound: "/audio/sfx/locked_door.mp3",
    },
    {
      path: "/models/filling_cabinets.glb",
      position: new THREE.Vector3(-17, -6, -19.7),
      scale: new THREE.Vector3(3.5, 3.5, 3.5),
      rotation: new THREE.Vector3(0, Math.PI+ Math.PI/2, 0),
      type: "default",
    },
  ];

  PlaygroundLayouts.Extra.models = [
    {
      path: "/models/victorian_bookshelf.glb",
      position: new THREE.Vector3(
        -20 + 2, // left wall (-20) + half bookshelf width (1)
        -4, // floor height
        0 // center along wall
      ),
      scale: new THREE.Vector3(3, 3, 3),
      rotation: new THREE.Vector3(0, 0, 0), // face into room
      type: "numberDisplay", // Change from "default" to "numberDisplay"
      displayNumber: 9, // Add the number you want to display
    },
    {
      path: "/models/keypad.glb",
      position: new THREE.Vector3(19.9, -1, 7),
      scale: new THREE.Vector3(6, 6, 6),
      rotation: new THREE.Vector3(0, Math.PI / 2, 0),
      type: "keypad", // tag it so we know it opens popup
      code: "4705", // store code here for popup
    },
    {
      path: "/models/creepy_doll_character.glb",
      position: new THREE.Vector3(-10, -3, 10),
      scale: new THREE.Vector3(1, 1, 1),
      rotation: new THREE.Vector3(0, Math.PI / 6, 0),
      type: "numberDisplay", // tag it so we know it opens popup
      displayNumber: 4, // store code here for popup
    },
    {
      path: "/models/vintage_wall_clock.glb",
      position: new THREE.Vector3(10, -2, -20),
      scale: new THREE.Vector3(0.04, 0.04, 0.04),
      rotation: new THREE.Vector3(0, 0, 0),
      type: "numberDisplay", // tag it so we know it opens popup
      displayNumber: 3, // store code here for popup
    },
    {
      path: "/models/painting_of_a_clown.glb",
      position: new THREE.Vector3(-10, 0, -20),
      scale: new THREE.Vector3(5, 5, 5),
      rotation: new THREE.Vector3(0, -Math.PI / 2, 0),
      type: "numberDisplay", // tag it so we know it opens popup
      displayNumber: 7, // store code here for popup
    },
    {
      path: "/models/student_desk.glb",
      position: new THREE.Vector3(6, -2.5, -10),
      scale: new THREE.Vector3(2, 2, 2),
      rotation: new THREE.Vector3(0, -Math.PI / 2, 0),
      type: "numberDisplay", // tag it so we know it opens popup
      displayNumber: 0,
    },
    {
      path: "/models/student_desk.glb",
      position: new THREE.Vector3(-8, -2.5, -10),
      scale: new THREE.Vector3(2, 2, 2),
      rotation: new THREE.Vector3(0, -Math.PI / 2, 0),
      type: "numberDisplay", // tag it so we know it opens popup
      displayNumber: 0,
    },
    {
      path: "/models/student_desk.glb",
      position: new THREE.Vector3(6, -2.5, 5),
      scale: new THREE.Vector3(2, 2, 2),
      rotation: new THREE.Vector3(0, -Math.PI / 2, 0),
      type: "numberDisplay", // tag it so we know it opens popup
      displayNumber: 0,
    },
    {
      path: "/models/student_desk.glb",
      position: new THREE.Vector3(-8, -2.5, 5),
      scale: new THREE.Vector3(2, 2, 2),
      rotation: new THREE.Vector3(0, -Math.PI / 2, 0),
      type: "numberDisplay", // tag it so we know it opens popup
      displayNumber: 0,
    },
    {
      path: "/models/face.glb",
      position: new THREE.Vector3(19.9, -1, -10),
      scale: new THREE.Vector3(3, 3, 3),
      rotation: new THREE.Vector3(0, -Math.PI / 2, 0),
      type: "numberDisplay", // tag it so we know it opens popup
      displayNumber: 5,
    },
  ];

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
