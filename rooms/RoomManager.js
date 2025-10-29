import * as THREE from "three";
import * as CANNON from "cannon-es";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { BackroomsRoom } from "./BackroomsRoom.js";
import { RoomLayouts } from "./RoomLayouts.js";
import { PickupLightsManager } from "../puzzles/lights.js";
import { ModelInteractionManager } from "../puzzles/modelInteraction.js"; // Add this import
import { PlaygroundLayouts } from "./Playground/PlaygroundLayout.js";
import { PlaygroundRoom } from "./Playground/PlaygroundRoom.js";
import { CSG } from "three-csg-ts";
import { SignInRoom } from "./Playground/SignInRoom.js";
import { ExtraRoom } from "./Playground/ExtraRoom.js";
import { KeypadUI } from "../props/keypadUI.js";

export class RoomManager {
  constructor(scene, world, camera, player) {
    this.scene = scene;
    this.world = world;
    this.player = player;
    this.camera = camera;
    this.rooms = [];
    this.hallways = []; // <--- initialize here
    this.lastZone = null;
    this.pendingRoomUpdate = null;
    this.currentRoom = null;
    this.currentLayoutName = "main";
    this.renderZonesDisabled = false;

    // lighting
    const ambient = new THREE.AmbientLight(0xded18a, 0.4);
    scene.add(ambient);

    this._createGlobalFloorAndCeiling();

    // Managers
    this.lightsManager = new PickupLightsManager(scene, camera);
    this.modelInteractionManager = new ModelInteractionManager(scene, camera);
    this.modelInteractionManager.setPickupLightsManager(this.lightsManager);

    // Start with the main room (first level)
    //this.createCustomRoom(RoomLayouts.main, 'main');
    //this.currentRoom = this.rooms[0];
    // old:
    // const mainRoom = this.createCustomRoom(RoomLayouts.main, "main");
    // this.currentRoom = mainRoom;

    // new:
    this.loadConnectedRooms();
  }

  _createGlobalFloorAndCeiling() {
    const groundBody = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    groundBody.position.y = -2.5;
    this.world.addBody(groundBody);

    const ceilingBody = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
    ceilingBody.quaternion.setFromEuler(Math.PI / 2, 0, 0);
    ceilingBody.position.y = 2.5;
    this.world.addBody(ceilingBody);
  }

  /**
   * Creates a custom room from a layout object.
   * - If layoutName === 'playground' => use PlaygroundRoom (it internally creates visuals/physics/models)
   * - Else => use BackroomsRoom and apply walls/lights/zones/models from the layout
   */
  createCustomRoom(layout, layoutName = null) {
    // defensive: ensure layout exists
    if (!layout) {
      console.warn(
        "createCustomRoom called with undefined layout:",
        layoutName
      );
      return null;
    }

    // destructure with defaults (layout must supply position for Backrooms usage)
    const {
      position = new THREE.Vector3(0, 0, 0),
      width = 30,
      height = 5,
      depth = 30,
      walls = [],
      lights = [],
      zones = [],
      models = [],
    } = layout;

    let room;

    // Playground has its own Room class that handles visuals/physics/models
    if (layoutName === "signin") {
      const connections = { left: "Playground", right: "Extra" }; // tell the room to leave the right wall open
      const corridorWidth = 8; // match your hallway width
      room = new SignInRoom(
        this.scene,
        this.world,
        this.modelInteractionManager,
        position.clone(),
        connections,
        corridorWidth
      );
    } else if (layoutName === "extra") {
      const connections = { right: "Playground" }; // tell the room to leave the right wall open
      const corridorWidth = 8; // match your hallway width
      room = new ExtraRoom(
        this.scene,
        this.world,
        position.clone(),
        connections,
        corridorWidth,
        this.camera
      );
      room.modelInteractionManager = this.modelInteractionManager;
    } else if (layoutName === "playground" || layoutName === "Playground") {
      const connections = { left: "SignIn" }; // tell the room to leave the right wall open
      const corridorWidth = 8; // match your hallway width
      console.log(layoutName);
      room = new PlaygroundRoom(
        this.scene,
        this.world,
        position.clone(),
        connections,
        corridorWidth
      );
      room.modelInteractionManager = this.modelInteractionManager;
    } else {
      // Default to BackroomsRoom for generic layouts (main, secondary, etc.)
      console.log(layoutName);
      room = new BackroomsRoom(
        this.scene,
        this.world,
        width,
        height,
        depth,
        position.clone()
      );

      // Apply walls (BackroomsRoom should expose addWall)
      if (
        Array.isArray(walls) &&
        walls.length > 0 &&
        typeof room.addWall === "function"
      ) {
        walls.forEach(([from, to, thickness]) => {
          // from/to are local room coordinates; addWall expects coords relative to room origin
          room.addWall(from.clone(), to.clone(), thickness);
        });
      }

      // Apply lights (BackroomsRoom should expose addLightPanel)
      if (
        Array.isArray(lights) &&
        lights.length > 0 &&
        typeof room.addLightPanel === "function"
      ) {
        lights.forEach(([x, z]) => {
          room.addLightPanel(x, z);
        });
      }

      // Apply zones: these are global positions; BackroomsRoom.addRenderingZone expects world coordinates
      if (
        Array.isArray(zones) &&
        zones.length > 0 &&
        typeof room.addRenderingZone === "function"
      ) {
        zones.forEach(([from, to, direction, center]) => {
          room.addRenderingZone(
            from.clone().add(position),
            to.clone().add(position),
            direction,
            center.clone().add(position)
          );
        });
      }

      // Load static models for non-Playground rooms (BackroomsRoom doesn't auto-load models in your code)
      if (Array.isArray(models) && models.length > 0) {
        this.loadModelsForRoom(room, models);
      }
    }

    // Common: set flags and push into rooms list
    room.layoutName = layoutName || "custom";
    this.rooms.push(room);

    // If layoutName === 'main' spawn pickup lights (your existing logic)
    if (layoutName === "main" && this.lightsManager && position) {
      const center = position.clone();
      const pickupLightPositions = [
        {
          position: center.clone().add(new THREE.Vector3(0.5, 1, 0)),
          color: 0xff0000,
        },
        {
          position: center.clone().add(new THREE.Vector3(-0.5, 1, 0)),
          color: 0x00ff00,
        },
        {
          position: center.clone().add(new THREE.Vector3(0, 1, 0.5)),
          color: 0x0000ff,
        },
      ];
      this.lightsManager.initPickupLights(pickupLightPositions);
    }

    // If it's playground and layout contains explicit models array (rare), register lightweight placeholders for interaction
    if (
      (layoutName === "playground" || layoutName === "Playground") &&
      Array.isArray(layout.models) &&
      layout.models.length > 0
    ) {
      layout.models.forEach((modelConfig, index) => {
        const modelGroup = new THREE.Group();
        modelGroup.userData.isInteractableModel = true;
        modelGroup.userData.modelConfig = modelConfig;
        modelGroup.userData.modelPath = modelConfig.path || "";
        modelGroup.name = `playgroundModel_${index}`;
        // place group at modelConfig.position relative to room, so it is in the scene hierarchy
        modelGroup.position.copy(modelConfig.position || new THREE.Vector3());
        if (room.group) room.group.add(modelGroup);
        this.modelInteractionManager.addInteractableModel(modelGroup);
      });
    }

    return room;
  }

createHallwayBetweenRooms(
  roomA,
  roomB,
  width = 8,
  height = 10,
  doorWidth = 4,
  doorHeight = 5
) {
  const start = roomA.position.clone();
  const end = roomB.position.clone();
  const midpoint = start.clone().add(end).multiplyScalar(0.5);
  const distance = 8.4;
  const direction = new THREE.Vector3().subVectors(end, start).normalize();
  const angleY = Math.atan2(direction.z, direction.x);

  // --- Floor ---
  const floorGeo = new THREE.BoxGeometry(distance, 0.2, width);
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x555555 });
  const floorMesh = new THREE.Mesh(floorGeo, floorMat);
  floorMesh.position.set(
    midpoint.x,
    midpoint.y - height / 2 + 0.1,
    midpoint.z
  );
  floorMesh.rotation.y = -angleY;
  this.scene.add(floorMesh);

  // --- Ceiling (NEW) ---
  const ceilingGeo = new THREE.BoxGeometry(distance, 0.2, width);
  const ceilingMesh = new THREE.Mesh(ceilingGeo, floorMat);
  ceilingMesh.position.set(
    midpoint.x,
    midpoint.y + height / 2 - 0.1,
    midpoint.z
  );
  ceilingMesh.rotation.y = -angleY;
  this.scene.add(ceilingMesh);

  // --- Walls ---
  const wallGeo = new THREE.BoxGeometry(distance, height, 0.2); // thin wall along Z
  const leftWall = new THREE.Mesh(wallGeo, floorMat);
  const rightWall = new THREE.Mesh(wallGeo, floorMat);
  leftWall.position.set(midpoint.x, midpoint.y, midpoint.z - width / 2 + 0.1);
  rightWall.position.set(
    midpoint.x,
    midpoint.y,
    midpoint.z + width / 2 - 0.1
  );
  leftWall.rotation.y = -angleY;
  rightWall.rotation.y = -angleY;
  this.scene.add(leftWall, rightWall);

  // --- Physics bodies ---
  const shapes = [
    { mesh: floorMesh, size: [distance / 2, 0.1, width / 2] },
    { mesh: leftWall, size: [distance / 2, height / 2, 0.1] },
    { mesh: rightWall, size: [distance / 2, height / 2, 0.1] },
    // ceiling physics (NEW)
    { mesh: ceilingMesh, size: [distance / 2, 0.1, width / 2] },
  ];

  // Keep references so we can remove them later
  const hallwayRecord = {
    meshes: [floorMesh, ceilingMesh, leftWall, rightWall],
    bodies: [],
  };

  shapes.forEach((s) => {
    const body = new CANNON.Body({ mass: 0 });
    const shape = new CANNON.Box(new CANNON.Vec3(...s.size));
    body.addShape(shape);
    body.position.copy(s.mesh.position);
    body.quaternion.copy(s.mesh.quaternion); // align with mesh rotation
    this.world.addBody(body);
    hallwayRecord.bodies.push(body);
  });

  // --- Cut doors in connected room walls ---
  const cutDoor = (room, wallMesh, doorWidth, doorHeight) => {
    if (!wallMesh || !room) return;

    // Make a simple rectangular hole
    const holeGeo = new THREE.BoxGeometry(
      doorWidth,
      doorHeight,
      (wallMesh.geometry.parameters?.depth || 1) + 0.1
    );
    const holeMesh = new THREE.Mesh(holeGeo);
    holeMesh.position.set(0, -room.height / 2 + doorHeight / 2, 0);

    const wallWithHole = CSG.subtract(wallMesh, holeMesh);
    wallWithHole.position.copy(wallMesh.position);
    wallWithHole.rotation.copy(wallMesh.rotation);

    // Replace old mesh in scene
    this.scene.remove(wallMesh);
    this.scene.add(wallWithHole);

    // --- Remove old physics bodies for this wall ---
    const side = wallMesh.userData?.wallSide;
    if (side) {
      const toRemove = (room.bodies || []).filter(
        (b) => b.userData?.wallSide === side
      );
      toRemove.forEach((b) => {
        this.world.removeBody(b);
        const idx = room.bodies.indexOf(b);
        if (idx !== -1) room.bodies.splice(idx, 1);
      });
    }

    // --- Create new simple physics body matching the wall hole ---
    const bbox = new THREE.Box3().setFromObject(wallWithHole);
    const size = new THREE.Vector3();
    bbox.getSize(size);
    const center = new THREE.Vector3();
    bbox.getCenter(center);

    const newBody = new CANNON.Body({ mass: 0 });
    const boxShape = new CANNON.Box(
      new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2)
    );
    newBody.addShape(boxShape);
    newBody.position.set(center.x, center.y, center.z);

    const quat = new THREE.Quaternion();
    wallWithHole.getWorldQuaternion(quat);
    newBody.quaternion.copy(
      new CANNON.Quaternion(quat.x, quat.y, quat.z, quat.w)
    );

    newBody.userData = { wallSide: side };
    this.world.addBody(newBody);
    if (!room.bodies) room.bodies = [];
    room.bodies.push(newBody);

    return wallWithHole;
  };

  // NOTE: cutDoor expects (room, wallMesh, doorWidth, doorHeight)
  if (roomA.connectingWall)
    roomA.connectingWall = cutDoor(roomA, roomA.connectingWall, doorWidth, doorHeight);
  if (roomB.connectingWall)
    roomB.connectingWall = cutDoor(roomB, roomB.connectingWall, doorWidth, doorHeight);

  // store hallway so it can be cleaned up later
  this.hallways.push(hallwayRecord);
}


  /**
   * Loads the linear Playground -> SignIn -> Extra system (along +Z axis)
   */
  loadConnectedRooms() {
    // Cleanup old rooms/hallways
    this.rooms.forEach((r) => r.unload?.());
    this.hallways.forEach((h) => {
      if (h.mesh) this.scene.remove(h.mesh);
      if (h.body) this.world.removeBody(h.body);
    });
    this.rooms = [];
    this.hallways = [];

    const spacing = 8; // hallway distance
    let cursorX = 0;

    const createAndPosition = (layoutObj, layoutKey) => {
      // Calculate final position FIRST before creating the room
      const finalPosition = new THREE.Vector3(
        cursorX,
        layoutObj.position?.y ?? 0,
        layoutObj.position?.z ?? 0
      );

      // Create a modified layout object with the correct position
      const modifiedLayout = {
        ...layoutObj,
        position: finalPosition,
      };

      // Create room at the correct position
      const room = this.createCustomRoom(modifiedLayout, layoutKey);
      if (!room) return null;

      // Store the position reference (should already be correct from constructor)
      room.position = finalPosition;

      // Assign wall for hallway cutting (adjust wallSide depending on your room)
      if (room.wallMeshes) {
        if (layoutKey === "playground") {
          room.connectingWall = room.wallMeshes.find(
            (w) => w.wallSide === "right"
          )?.mesh;
        } else if (layoutKey === "signin") {
          room.connectingWall = room.wallMeshes.find(
            (w) => w.wallSide === "left"
          )?.mesh;
        }
      }

      // Call this if your room has position-dependent updates
      room.updatePositionDependentObjects?.();

      // Move cursor for next room
      const wallThickness = 0.4;
      const roomWidth = (room.width || layoutObj.width || 40) + wallThickness;
      cursorX -= roomWidth + spacing;

      return room;
    };

    // Create rooms linearly
    const playgroundRoom = createAndPosition(
      PlaygroundLayouts.Playground,
      "playground"
    );
    const signInRoom = createAndPosition(PlaygroundLayouts.SignIn, "signin");
    const extraRoom = createAndPosition(PlaygroundLayouts.Extra, "extra");

    if (playgroundRoom && playgroundRoom.group) {
      playgroundRoom.group.traverse((child) => {
        // Only consider meshes or groups explicitly marked as models
        if ((child.isMesh || child.isGroup) && child.userData.isModel) {
          // Avoid double-adding
          if (!child.userData.isInteractableModel) {
            child.userData.isInteractableModel = true;
            this.modelInteractionManager.addInteractableModel(child);
          }
        }
      });
    }

    // Connect rooms with hallways
    const createHallway = (roomA, roomB) => {
      if (!roomA || !roomB) return;
      const start = roomA.position.clone();
      const end = roomB.position.clone();
      start.z = end.z = roomA.position.z;
      this.createHallwayBetweenRooms(roomA, roomB, 8, 10);
    };

    if (playgroundRoom && signInRoom) createHallway(playgroundRoom, signInRoom);
    if (signInRoom && extraRoom) createHallway(signInRoom, extraRoom);

    this.rooms = [playgroundRoom, signInRoom, extraRoom].filter(Boolean);

    // Place player
    if (playgroundRoom && this.player?.body) {
      const floorY =
        -(playgroundRoom.height || PlaygroundLayouts.Playground.height) / 2;
      this.player.body.position.set(
        playgroundRoom.position.x,
        floorY + 1,
        playgroundRoom.position.z
      );
      this.player.body.velocity.set(0, 0, 0);
      this.player.syncCamera?.();
    }

    this.currentRoom = playgroundRoom;
    this.currentLayoutName = "playground";
    console.log(
      "Playground → SignIn → Extra system loaded along X-axis (parallel rooms)."
    );
  }

  /**
   * Loads 3D models for a room
   */
  loadModelsForRoom(room, models) {
    const loader = new GLTFLoader();

    models.forEach((modelConfig, index) => {
      loader.load(modelConfig.path, (gltf) => {
        const model = gltf.scene;

        // Create a group to contain the model and mark it as interactable
        const modelGroup = new THREE.Group();
        modelGroup.add(model);

        // Apply scale and rotation to the model group
        modelGroup.scale.copy(modelConfig.scale);
        modelGroup.rotation.set(
          modelConfig.rotation.x,
          modelConfig.rotation.y,
          modelConfig.rotation.z
        );

        // Check if the room has a rotation (from room generation)
        if (room.rotationY !== undefined) {
          // For rotated rooms, we need to rotate the model's position
          const rotatedPosition = this.rotatePoint(
            modelConfig.position,
            room.rotationY
          );
          modelGroup.position.copy(rotatedPosition);

          // Also rotate the model itself to maintain consistent orientation
          modelGroup.rotation.y += room.rotationY;
        } else {
          // No room rotation - use position as-is
          modelGroup.position.copy(modelConfig.position);
        }

        // Mark as interactable model
        modelGroup.userData.isInteractableModel = true;
        modelGroup.userData.modelConfig = modelConfig;
        modelGroup.userData.modelPath = modelConfig.path;
        modelGroup.name = `interactableModel_${index}`;

        // Add to room group
        room.group.add(modelGroup);

        console.log(modelGroup, modelGroup.userData.isInteractableModel);
        // Add to model interaction manager
        this.modelInteractionManager.addInteractableModel(modelGroup);

        console.log(`Model ${modelConfig.path} loaded and added to room group`);
      });
    });
  }

  scanAllZones(playerPosition) {
    let activeZone = null;
    let activeRoom = null;
    const triggeredZones = [];

    for (const room of this.rooms) {
      for (const zone of room.renderingZones) {
        const isInside = zone.containsPoint(playerPosition);

        // find first active zone/room
        if (!activeZone && isInside) {
          activeZone = zone;
          activeRoom = room;
        }

        // handle trigger-on-enter semantics (mirror previous checkRenderingZones behaviour)
        if (isInside && !zone.hasTriggered) {
          zone.hasTriggered = true;
          triggeredZones.push(zone);
        } else if (!isInside && zone.hasTriggered) {
          // reset when leaving so it can trigger again next entry
          zone.hasTriggered = false;
        }
      }
    }

    return { activeZone, activeRoom, triggeredZones };
  }

  /**
   * Handles triggered rendering zones
   */
  handleTriggeredZones(triggeredZones) {
    triggeredZones.forEach((zone) => {
      // Exclude the current room type
      if (["playground", "signin", "extra"].includes(this.currentLayoutName)) {
        return; // skip random generation for linear sequence
      }
      const layoutNames = Object.keys(RoomLayouts).filter(
        (name) => name !== this.currentLayoutName
      );
      const randomLayoutName =
        layoutNames[Math.floor(Math.random() * layoutNames.length)];
      const randomLayout = RoomLayouts[randomLayoutName];

      // Pick a random zone from the new room
      const zoneIndex = Math.floor(Math.random() * randomLayout.zones.length);
      const selectedZone = randomLayout.zones[zoneIndex];

      // Directions
      const currentDir = zone.openingDirection;
      const targetDir = selectedZone[2];

      // Calculate rotation needed to align selected zone's direction to the opposite of current
      const desiredDir = this.getOppositeDirection(currentDir);
      const rotationY = this.calculateRotationBetweenDirections(
        targetDir,
        desiredDir
      );

      // Calculate new room position so the selected zone's opening center matches the current zone's opening center
      const currentCenter = zone.openingCenter.clone();
      const selectedCenter = selectedZone[3].clone();

      // Rotate selectedCenter by rotationY
      const rotatedCenter = this.rotatePoint(selectedCenter, rotationY);

      // Position = currentCenter - rotatedCenter
      const newRoomPosition = new THREE.Vector3(
        currentCenter.x - rotatedCenter.x,
        0,
        currentCenter.z - rotatedCenter.z
      );

      // Create the new room at the calculated position
      const rotatedLayout = this.rotateLayout(randomLayout, rotationY);
      const newLayout = { ...rotatedLayout, position: newRoomPosition };
      const newRoom = this.createCustomRoom(newLayout, randomLayoutName);

      // Store the rotation angle in the room for model loading
      newRoom.rotationY = rotationY;
    });
  }

  /**
   * Utility: Get opposite direction
   */
  getOppositeDirection(direction) {
    const opposites = {
      north: "south",
      south: "north",
      east: "west",
      west: "east",
    };
    return opposites[direction] || "south";
  }

  /**
   * Utility: Calculate rotation (in radians) needed to turn from one direction to another
   */
  calculateRotationBetweenDirections(from, to) {
    const dirToAngle = {
      south: 0,
      west: Math.PI / 2,
      north: Math.PI,
      east: (3 * Math.PI) / 2,
    };
    let angle = dirToAngle[to] - dirToAngle[from];
    // Normalize angle to [0, 2PI)
    while (angle < 0) angle += Math.PI * 2;
    while (angle >= Math.PI * 2) angle -= Math.PI * 2;
    return angle;
  }

  /**
   * Utility: Rotate a point around the origin by angle (radians)
   */
  rotatePoint(vec, angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return new THREE.Vector3(
      vec.x * cos - vec.z * sin,
      vec.y,
      vec.x * sin + vec.z * cos
    );
  }

  /**
   * Utility: Rotate a layout object by a given angle (radians)
   */
  rotateLayout(layout, angle) {
    // Helper to rotate a THREE.Vector3
    function rotateVec(vec) {
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      return new THREE.Vector3(
        vec.x * cos - vec.z * sin,
        vec.y,
        vec.x * sin + vec.z * cos
      );
    }

    // Rotate walls
    const rotatedWalls = layout.walls.map(([from, to, thickness]) => [
      rotateVec(from),
      rotateVec(to),
      thickness,
    ]);

    // Rotate lights
    const rotatedLights = layout.lights.map(([x, z]) => {
      const v = rotateVec(new THREE.Vector3(x, 0, z));
      return [v.x, v.z];
    });

    // Rotate zones
    const rotatedZones = layout.zones.map(([from, to, direction, center]) => [
      rotateVec(from),
      rotateVec(to),
      this.getRotatedDirection(direction, angle),
      rotateVec(center),
    ]);

    // Adjust width and depth by rotating the original width/depth vector
    // Use a vector from (0,0,0) to (width, 0, depth), rotate it, and take abs values
    const sizeVec = rotateVec(new THREE.Vector3(layout.width, 0, layout.depth));
    const width = Math.abs(sizeVec.x);
    const depth = Math.abs(sizeVec.z);

    return {
      ...layout,
      walls: rotatedWalls,
      lights: rotatedLights,
      zones: rotatedZones,
      width,
      depth,
    };
  }

  getRotatedDirection(originalDirection, angle) {
    const directions = ["south", "west", "north", "east"];
    const dirToIndex = { south: 0, west: 1, north: 2, east: 3 };
    const steps = Math.round(angle / (Math.PI / 2)) % 4;
    const originalIndex = dirToIndex[originalDirection];
    const newIndex = (originalIndex + steps + 4) % 4;
    return directions[newIndex];
  }

  /**
   * Main update loop
   */
  update(playerPosition) {
    // If render zones are disabled, skip all zone logic
    if (this.renderZonesDisabled) {
      return;
    }
    // Single scan: get active zone/room and triggered zones
    const { activeZone, activeRoom, triggeredZones } =
      this.scanAllZones(playerPosition);

    // If player has left the last zone
    if (this.lastZone && (!activeZone || activeZone !== this.lastZone)) {
      // Start a timer to update the current room after 0.5s
      if (this.pendingRoomUpdate) {
        clearTimeout(this.pendingRoomUpdate);
        this.pendingRoomUpdate = null;
      }

      // capture the zone we left and store the timeout id so we can detect cancellation
      const scheduledLastZone = this.lastZone;
      const timeoutId = setTimeout(() => {
        // if pendingRoomUpdate was cleared/cancelled, don't run
        if (this.pendingRoomUpdate !== timeoutId) return;

        // update to the room that the left-zone belonged to
        if (scheduledLastZone && scheduledLastZone.parentRoom) {
          const prevLayoutName = this.currentLayoutName;
          //this.createCustomRoom(RoomLayouts.main, "main"); // existing main room
          this.currentRoom = scheduledLastZone.parentRoom;
          this.currentLayoutName = this.currentRoom.layoutName;
          console.log(
            `Current room type updated to: ${this.currentLayoutName}`
          );

          // If current room is now exit, seal it and disable render zones
          if (this.currentLayoutName === "exit") {
            this.sealExitRoom();
            this.renderZonesDisabled = true;
            console.log(
              "Exit room detected - sealed and render zones disabled"
            );
          }

          // Manage room transitions
          this.manageRoomTransitions(prevLayoutName, this.currentLayoutName);
        }

        this.pendingRoomUpdate = null;
      }, 200);

      this.pendingRoomUpdate = timeoutId;
    }

    // If player enters a new zone within 0.5s, cancel the pending update
    if (activeZone && activeZone !== this.lastZone && this.pendingRoomUpdate) {
      clearTimeout(this.pendingRoomUpdate);
      this.pendingRoomUpdate = null;
    }

    // Only handle triggered zones if the player was NOT in any zone last frame AND render zones are not disabled
    const triggersToHandle =
      !this.lastZone && !this.renderZonesDisabled ? triggeredZones : [];

    // Update lastZone
    this.lastZone = activeZone;

    // Handle zone triggers as before (use triggersToHandle from the single scan)
    if (triggersToHandle.length > 0) {
      this.handleTriggeredZones(triggersToHandle);
    }
  }

  manageRoomTransitions(prevLayoutName, newLayoutName) {
    // Linear system: Playground → SignIn → Extra
    const linearRooms = ["playground", "signin", "extra"];

    if (
      linearRooms.includes(prevLayoutName) &&
      linearRooms.includes(newLayoutName)
    ) {
      // Just update currentRoom, don't remove anything
      const newRoom = this.rooms.find((r) => r.layoutName === newLayoutName);
      if (newRoom) {
        this.currentRoom = newRoom;
        console.log(`Switched currentRoom to: ${newLayoutName}`);
      }
      return;
    }

    // For Backrooms/random rooms, keep old logic
    if (this.rooms.length > 1) {
      if (prevLayoutName === newLayoutName) {
        this.removeRoom(this.rooms[1]);
      } else {
        this.removeRoom(this.rooms[0]);
        this.currentRoom = this.rooms[0];
      }
    }
  }

  /**
   * Removes a room from the scene, physics world, and internal array.
   * @param {BaseRoom} room - The room instance to remove.
   */
  removeRoom(room) {
    // Remove all meshes in the room group from the scene and dispose geometry/materials
    if (room.group && room.group.children) {
      // Create a copy of children array to avoid mutation during iteration
      const children = [...room.group.children];

      children.forEach((child) => {
        // Remove from model interaction manager if it's an interactable model
        if (child.userData.isInteractableModel) {
          this.modelInteractionManager.removeInteractableModel(child);
          console.log(
            `Removed model from interaction manager: ${child.userData.modelPath}`
          );
        }
      });

      // Remove the entire room group from scene (this removes all children too)
      this.scene.remove(room.group);
    }

    // Remove all physics bodies from the world
    if (room.bodies && Array.isArray(room.bodies)) {
      room.bodies.forEach((body) => {
        this.world.removeBody(body);
      });
    }

    // Remove from rooms array
    const idx = this.rooms.indexOf(room);
    if (idx !== -1) {
      this.rooms.splice(idx, 1);
    }

    // Clean up pickup lights not in the current room
    if (this.currentRoom) {
      this.cleanupPickupLightsForRoom(this.currentRoom);
    }
  }

  getRooms() {
    return this.rooms;
  }

  isLightInRoom(lightGroup, room) {
    const pos = new THREE.Vector3();
    lightGroup.getWorldPosition(pos);

    const minX = room.position.x - room.width / 2;
    const maxX = room.position.x + room.width / 2;
    const minZ = room.position.z - room.depth / 2;
    const maxZ = room.position.z + room.depth / 2;
    const minY = room.position.y - room.height / 2;
    const maxY = room.position.y + room.height / 2;

    return (
      pos.x >= minX &&
      pos.x <= maxX &&
      pos.z >= minZ &&
      pos.z <= maxZ &&
      pos.y >= minY &&
      pos.y <= maxY
    );
  }

  cleanupPickupLightsForRoom(room) {
    if (this.lightsManager && this.lightsManager.pickableRoots) {
      this.lightsManager.pickableRoots =
        this.lightsManager.pickableRoots.filter((lightGroup) => {
          if (this.isLightInRoom(lightGroup, room)) {
            return true;
          } else {
            this.scene.remove(lightGroup);
            this.lightsManager.colorMixingManager.removeLight(lightGroup);
            // Optionally dispose geometry/materials here
            // lightGroup.traverse(obj => {
            //     if (obj.geometry) obj.geometry.dispose();
            //     if (obj.material) obj.material.dispose();
            // });
            return false;
          }
        });
    }
  }

  /**
   * Seals the exit room by adding a hardcoded wall at the opening
   */
  sealExitRoom() {
    if (!this.currentRoom || this.currentLayoutName !== "exit") return;

    // Get the exit room's zone to find where the opening is
    const exitZone = this.currentRoom.renderingZones[0]; // Exit room has one zone
    if (!exitZone) return;

    const direction = exitZone.openingDirection;
    const center = exitZone.openingCenter.clone();

    // Convert world position to room-relative position
    const roomPosition = this.currentRoom.position;
    const relativeCenter = center.clone().sub(roomPosition);

    // Create wall coordinates based on the opening direction
    let wallStart, wallEnd;
    const wallThickness = 0.4;

    switch (direction) {
      case "south":
        // Wall blocks the south opening
        wallStart = new THREE.Vector3(
          relativeCenter.x - 2,
          0,
          relativeCenter.z
        );
        wallEnd = new THREE.Vector3(relativeCenter.x + 2, 0, relativeCenter.z);
        break;
      case "north":
        // Wall blocks the north opening
        wallStart = new THREE.Vector3(
          relativeCenter.x - 2,
          0,
          relativeCenter.z
        );
        wallEnd = new THREE.Vector3(relativeCenter.x + 2, 0, relativeCenter.z);
        break;
      case "east":
        // Wall blocks the east opening
        wallStart = new THREE.Vector3(
          relativeCenter.x,
          0,
          relativeCenter.z - 2
        );
        wallEnd = new THREE.Vector3(relativeCenter.x, 0, relativeCenter.z + 2);
        break;
      case "west":
        // Wall blocks the west opening
        wallStart = new THREE.Vector3(
          relativeCenter.x,
          0,
          relativeCenter.z - 2
        );
        wallEnd = new THREE.Vector3(relativeCenter.x, 0, relativeCenter.z + 2);
        break;
      default:
        console.warn("Unknown direction for sealing wall:", direction);
        return;
    }

    // Add the sealing wall to the current room
    this.currentRoom.addWall(wallStart, wallEnd, wallThickness);

    console.log(
      `Exit room sealed with wall from ${wallStart.x}, ${wallStart.z} to ${wallEnd.x}, ${wallEnd.z}`
    );
  }
}
