import * as THREE from "three";
import * as CANNON from "cannon-es";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { BackroomsRoom } from "./BackroomsRoom.js";
import { RoomLayouts } from "./RoomLayouts.js";
import { PickupLightsManager } from "../puzzles/lights.js";
import { ModelInteractionManager } from "../puzzles/modelInteraction.js"; // Add this import
import { DisplaySurface } from "../puzzles/DisplaySurface.js";
import { PlaygroundLayouts } from "./Playground/PlaygroundLayout.js";
import { PlaygroundRoom } from "./Playground/PlaygroundRoom.js";
import { CSG } from "three-csg-ts";
import { SignInRoom } from "./Playground/SignInRoom.js";
import { ExtraRoom } from "./Playground/ExtraRoom.js";
import { KeypadUI } from "../props/keypadUI.js";

export class RoomManager {
  constructor(scene, world, camera, player) {
    // Core references
    this.scene = scene;
    this.world = world;
    this.camera = camera;
    this.player = player;

    // Room / level tracking
    this.rooms = [];
    this.hallways = [];
    this.lastZone = null;
    this.pendingRoomUpdate = null;
    this.currentRoom = null;
    this.currentLayoutName = "main";
    this.renderZonesDisabled = false;

    // Puzzle state
    this.puzzleCompleted = false;

    // Lighting
    this.ambient = new THREE.AmbientLight(0xded18a, 0.4);
    scene.add(this.ambient);

    this._createGlobalFloorAndCeiling();

    // Managers
    this.lightsManager = new PickupLightsManager(scene, camera);
    this.modelInteractionManager = new ModelInteractionManager(scene, camera);
    this.modelInteractionManager.setPickupLightsManager(this.lightsManager);

    // Start with the main room (first level)
    this.createCustomRoom(RoomLayouts.main, "main");
    this.currentRoom = this.rooms[0];
    // old:
    //const mainRoom = this.createCustomRoom(RoomLayouts.main, "main");
    //this.currentRoom = mainRoom;

    // new:
    // this.loadConnectedRooms();
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

        lights.forEach((lightEntry) => {
          const x = lightEntry[0];
          const z = lightEntry[1];
          const flicker = !!lightEntry[2];
          room.addLightPanel(x, z, flicker);
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

    // NOTE: pickup lights are no longer spawned automatically for the main room.
    // If you want to spawn them later, call this.lightsManager.initPickupLights(...) from game code.

    // Playground model registration
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
    height = 12,
    doorWidth = 4,
    doorHeight = 5
  ) {
    const direction = new THREE.Vector3()
      .subVectors(roomB.position, roomA.position)
      .normalize();

    // Get half-extents of each room along the hallway axis
    const halfA = (roomA.width || 40) / 2;
    const halfB = (roomB.width || 40) / 2;

    // Compute offset points that align with each room's outer wall
    const start = roomA.position
      .clone()
      .add(direction.clone().multiplyScalar(halfA));
    const end = roomB.position
      .clone()
      .add(direction.clone().multiplyScalar(-halfB));
    const midpoint = start.clone().add(end).multiplyScalar(0.5);
    const distance = start.distanceTo(end);
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
    const ceilingGeo = new THREE.PlaneGeometry(distance, width);
    const ceilingMesh = new THREE.Mesh(ceilingGeo, floorMat);
    ceilingMesh.position.set(midpoint.x, midpoint.y + height / 2, midpoint.z);
    ceilingMesh.rotation.x = -Math.PI / 2;  // face downward
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
      roomA.connectingWall = cutDoor(
        roomA,
        roomA.connectingWall,
        doorWidth,
        doorHeight
      );
    if (roomB.connectingWall)
      roomB.connectingWall = cutDoor(
        roomB,
        roomB.connectingWall,
        doorWidth,
        doorHeight
      );

    // store hallway so it can be cleaned up later
    this.hallways.push(hallwayRecord);
  }

  /**
   * Loads the linear Playground -> SignIn -> Extra system (along +Z axis)
   */

  loadConnectedRooms() {
    // Cleanup old rooms/hallways (with defensive checks)
    if (this.rooms && Array.isArray(this.rooms)) {
      this.rooms.forEach((r) => r.unload?.());
    }
    if (this.hallways && Array.isArray(this.hallways)) {
      this.hallways.forEach((h) => {
        // hallwayRecord has 'meshes' and 'bodies' (plural)
        if (h.meshes) {
          h.meshes.forEach((mesh) => this.scene.remove(mesh));
        }
        if (h.bodies) {
          h.bodies.forEach((body) => this.world.removeBody(body));
        }
      });
    }
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
      this.createHallwayBetweenRooms(roomA, roomB, 8, 12);
    };

    if (playgroundRoom && signInRoom) createHallway(playgroundRoom, signInRoom);
    if (signInRoom && extraRoom) createHallway(signInRoom, extraRoom);

    this.rooms = [playgroundRoom, signInRoom, extraRoom].filter(Boolean);

    // Place player
    if (playgroundRoom && this.player?.body) {
      const floorY =
        -(playgroundRoom.height || PlaygroundLayouts.Playground.height) / 2;
      this.player.body.position.set(-12, floorY + 1, 0);
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
      // --- Prevent spawning marker if already picked up ---
      if (
        modelConfig.path &&
        modelConfig.path.toLowerCase().includes("marker") &&
        this.modelInteractionManager.hasMarker
      ) {
        // Skip spawning this marker
        return;
      }

      loader.load(modelConfig.path, (gltf) => {
        // analysis/debug logs removed

        const model = gltf.scene;

        // Root group holds the translated position (room-local coordinates).
        // If the room has a rotationY, rotate the position vector so placement follows room orientation.
        const modelRoot = new THREE.Group();
        const position = modelConfig.position
          ? modelConfig.position.clone()
          : new THREE.Vector3(0, 0, 0);
        modelRoot.position.copy(position);

        // IMPORTANT: apply room yaw on the root so model rotates around WORLD Y at modelRoot.position
        // If room.rotationY is present, use it. Default to 0.
        modelRoot.rotation.y =
          typeof room.rotationY === "number" ? room.rotationY : 0;

        // Optional per-model yaw offset to correct model authoring orientation (use if an asset faces -Z instead of +Z)
        if (typeof modelConfig.yawWorldOffset === "number") {
          modelRoot.rotation.y += modelConfig.yawWorldOffset;
        }

        // Pivot holds the actual model, receives scale & rotation (local transform).
        const pivot = new THREE.Group();

        // Optionally center the model so rotation happens around its visual center
        try {
          const bbox = new THREE.Box3().setFromObject(model);
          if (!bbox.isEmpty()) {
            const center = bbox.getCenter(new THREE.Vector3());
            // Move model so its center is at origin of pivot
            model.position.sub(center);
          }
        } catch (e) {
          // ignore bounding-box errors for non-mesh scenes
        }

        pivot.add(model);

        // If this is the whiteboard model, create a DisplaySurface for the backboard mesh
        if (
          modelConfig.path &&
          modelConfig.path.toLowerCase().includes("whiteboard.glb")
        ) {
          model.traverse((child) => {
            if (child.isMesh && child.name === "Backboard_Material002_0") {
              // create the display surface and attach references for interaction code
              const displaySurface = new DisplaySurface(child);
              modelRoot.userData.displaySurface = displaySurface;
              child.userData.displaySurface = displaySurface;

              // Draw persisted text from ModelInteractionManager
              const savedText =
                this.modelInteractionManager.whiteboardText || "";
              displaySurface.drawText(savedText, {
                rotation: Math.PI / 2,
                fontSize: 200,
                y: 640,
                scaleX: 0.5,
              });
            }
          });
        }

        // Apply model-local rotation & scale (use defaults if absent)
        const rot = modelConfig.rotation || new THREE.Vector3(0, 0, 0);
        pivot.rotation.set(rot.x || 0, rot.y || 0, rot.z || 0);
        const scale = modelConfig.scale || new THREE.Vector3(1, 1, 1);
        pivot.scale.copy(scale);

        modelRoot.add(pivot);

        // Mark as interactable model (only if config allows)
        const isInteractable = modelConfig.interactable !== false; // default true
        modelRoot.userData.isInteractableModel = !!isInteractable;
        modelRoot.userData.modelConfig = modelConfig;
        modelRoot.userData.modelPath = modelConfig.path;
        // Optional per-model interaction distance (meters). If absent, fallback to manager default.
        if (typeof modelConfig.interactionDistance === "number") {
          modelRoot.userData.interactionDistance =
            modelConfig.interactionDistance;
        }
        modelRoot.name = `interactableModel_${index}`;

        // Add to room group (room.group already positioned in world)
        room.group.add(modelRoot);

        // Add to model interaction manager only if interactable
        if (isInteractable)
          this.modelInteractionManager.addInteractableModel(modelRoot);

        // model loaded (log removed)
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
      // Skip random generation for specific rooms
      if (["playground", "signin", "extra"].includes(this.currentLayoutName)) {
        return;
      }

      let layoutNames;
      if (this.puzzleCompleted) {
        // Only allow exit room to spawn
        layoutNames = ["exit"];
      } else {
        // Exclude exit room from possible layouts
        layoutNames = Object.keys(RoomLayouts).filter(
          (name) => name !== "exit" && name !== this.currentLayoutName
        );
      }

      // If no layouts are available, do nothing
      if (layoutNames.length === 0) return;

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
    // Rotate lights (preserve optional flicker flag)
    const rotatedLights = layout.lights.map((entry) => {
      const x = entry[0];
      const z = entry[1];
      const flicker = entry[2] || false;
      const v = rotateVec(new THREE.Vector3(x, 0, z));
      return [v.x, v.z, flicker];
    });

    // Rotate zones
    const rotatedZones = layout.zones.map(([from, to, direction, center]) => [
      rotateVec(from),
      rotateVec(to),
      this.getRotatedDirection(direction, angle),
      rotateVec(center),
    ]);

    // Rotate models (position + add yaw to model rotation.y)
    const rotatedModels = (layout.models || []).map((model) => {
      const newPos = rotateVec(
        model.position ? model.position.clone() : new THREE.Vector3(0, 0, 0)
      );
      return {
        ...model,
        position: newPos,
        rotation: model.rotation
          ? model.rotation.clone()
          : new THREE.Vector3(0, 0, 0),
      };
    });

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
      models: rotatedModels,
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
        if (child.userData.isInteractableModel) {
          this.modelInteractionManager.removeInteractableModel(child);
          // If this is the whiteboard being removed, stop editing
          if (
            child.userData.displaySurface &&
            this.modelInteractionManager.activeWhiteboardSurface ===
              child.userData.displaySurface
          ) {
            this.modelInteractionManager.stopWhiteboardEditing();
          }
        }
      });

      // stop any running periodic blackouts on panels to avoid leaked timers
      if (room.lightPanels) {
        room.lightPanels.forEach((p) => {
          if (typeof p.stopPeriodicBlackout === "function")
            p.stopPeriodicBlackout();
        });
      }

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

    // // Clean up pickup lights not in the current room
    // if (this.currentRoom) {
    //     this.cleanupPickupLightsForRoom(this.currentRoom);
    // }
  }

  getRooms() {
    return this.rooms;
  }

  // isLightInRoom(lightGroup, room) {
  //     const pos = new THREE.Vector3();
  //     lightGroup.getWorldPosition(pos);

  //     const minX = room.position.x - room.width / 2;
  //     const maxX = room.position.x + room.width / 2;
  //     const minZ = room.position.z - room.depth / 2;
  //     const maxZ = room.position.z + room.depth / 2;
  //     const minY = room.position.y - room.height / 2;
  //     const maxY = room.position.y + room.height / 2;

  //     return (
  //         pos.x >= minX && pos.x <= maxX &&
  //         pos.z >= minZ && pos.z <= maxZ &&
  //         pos.y >= minY && pos.y <= maxY
  //     );
  // }

  // cleanupPickupLightsForRoom(room) {
  //     if (this.lightsManager && this.lightsManager.pickableRoots) {
  //         this.lightsManager.pickableRoots = this.lightsManager.pickableRoots.filter(lightGroup => {
  //             if (this.isLightInRoom(lightGroup, room)) {
  //                 return true;
  //             } else {
  //                 this.scene.remove(lightGroup);
  //                 this.lightsManager.colorMixingManager.removeLight(lightGroup);
  //                 // Optionally dispose geometry/materials here
  //                 // lightGroup.traverse(obj => {
  //                 //     if (obj.geometry) obj.geometry.dispose();
  //                 //     if (obj.material) obj.material.dispose();
  //                 // });
  //                 return false;
  //             }
  //         });
  //     }
  // }

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

  turnOffAllLights() {
    this.rooms.forEach((room) => {
      if (room.lightPanels) {
        room.lightPanels.forEach((panel) => {
          if (typeof panel.turnOff === "function") panel.turnOff();
        });
      }
    });
    // Lower ambient light intensity
    if (this.ambient) {
      this.ambient.intensity = 0.2; // Or 0 for total darkness
    }
  }
}
