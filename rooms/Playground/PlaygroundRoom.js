import * as THREE from "three";
import * as CANNON from "cannon-es";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { PlaygroundLayouts } from "./PlaygroundLayout.js";
import { LightPanel } from "../../props/LightPanel.js";

export class PlaygroundRoom {
  constructor(
    scene,
    world,
    position = new THREE.Vector3(0, 0, 0),
    connections = {},
    corridorWidth = 6
  ) {
    this.scene = scene;
    this.world = world;
    this.position = position;
    this.openings = [];
    this.renderingZones = [];

    // Create openings for connections
    const halfCorridor = corridorWidth / 2;
    for (const [wall, connectedRoom] of Object.entries(connections)) {
      if (!connectedRoom) continue;
      if (wall === "back" || wall === "front") {
        this.openings.push({ wall, xMin: -halfCorridor, xMax: halfCorridor });
      } else {
        // left/right
        this.openings.push({ wall, zMin: -halfCorridor, zMax: halfCorridor });
      }
    }

    this.group = new THREE.Group();
    this.group.position.copy(position);
    scene.add(this.group);

    this.loader = new GLTFLoader();
    this.bodies = [];
    this.models = [];
    this.width = PlaygroundLayouts.Playground.width;
    this.height = PlaygroundLayouts.Playground.height;
    this.depth = PlaygroundLayouts.Playground.depth;

    this._createVisuals();
    this._createPhysicsWalls();
    this._loadModels();
    this._setupLights();
  }

  /** Create visual walls, ceiling, and floor with textures */
  _createVisuals() {
    const loader = new THREE.TextureLoader();
    const halfW = this.width / 2;
    const halfH = this.height / 2;
    const halfD = this.depth / 2;

    // FLOOR
    const floorMaterial = new THREE.MeshStandardMaterial({
      map: loader.load("./textures/floor/floor_basecolor.jpg"),
      normalMap: loader.load("./textures/floor/floor_normalgl.png"),
      roughnessMap: loader.load("./textures/floor/floor_roughness.png"),
    });
    const floorGeo = new THREE.PlaneGeometry(this.width, this.depth);
    const floor = new THREE.Mesh(floorGeo, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -halfH;
    this.group.add(floor);

    // CEILING
    const ceilingMaterial = new THREE.MeshStandardMaterial({
      map: loader.load("./textures/ceiling/ceiling_basecolor.png"),
      normalMap: loader.load("./textures/ceiling/ceiling_normalgl.png"),
      roughnessMap: loader.load("./textures/ceiling/ceiling_roughness.png"),
    });
    const ceilingGeo = new THREE.PlaneGeometry(this.width, this.depth);
    const ceiling = new THREE.Mesh(ceilingGeo, ceilingMaterial);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = halfH;
    this.group.add(ceiling);

    // WALLS
    const wallPaths = [
      {
        base: "./textures/walls/wall1_basecolor.png",
        normal: "./textures/walls/wall1_normalgl.png",
        rough: "./textures/walls/wall1_roughness.png",
      },
      {
        base: "./textures/walls/wall2_basecolor.png",
        normal: "./textures/walls/wall2_normalgl.png",
        rough: "./textures/walls/wall2_roughness.png",
      },
      {
        base: "./textures/walls/wall3_basecolor.png",
        normal: "./textures/walls/wall3_normalgl.png",
        rough: "./textures/walls/wall3_roughness.png",
      },
      {
        base: "./textures/walls/wall4_basecolor.png",
        normal: "./textures/walls/wall4_normalgl.png",
        rough: "./textures/walls/wall4_roughness.png",
      },
    ];

    const wallNames = ["back", "right", "front", "left"];

    const kidDrawings = [
      loader.load("./textures/walls/PuzzleHintMerry-go-round.png"),
      loader.load("./textures/walls/PuzzleHintSlide.png"),
      loader.load("./textures/walls/PuzzleHintTrampoline.png"),
      loader.load("./textures/walls/PuzzleHintSwing.png")
    ];

    // Keep track of all wall meshes to overlay drawings after creation
    const createdWalls = [];

    for (let i = 0; i < 4; i++) {
      const material = new THREE.MeshStandardMaterial({
        map: loader.load(wallPaths[i].base),
        normalMap: loader.load(wallPaths[i].normal),
        roughnessMap: loader.load(wallPaths[i].rough),
      });

      const wallName = wallNames[i];
      const openings = this.openings.filter((o) => o.wall === wallName);
      const isZWall = wallName === "back" || wallName === "front";

      if (openings.length === 0) {
        // Full wall
        let wallGeo, wallMesh;
        if (isZWall) {
          wallGeo = new THREE.PlaneGeometry(this.width, this.height);
          wallMesh = new THREE.Mesh(wallGeo, material);
          wallMesh.position.set(0, 0, wallName === "back" ? -halfD : halfD);
          if (wallName === "front") wallMesh.rotation.y = Math.PI;
        } else {
          wallGeo = new THREE.PlaneGeometry(this.depth, this.height);
          wallMesh = new THREE.Mesh(wallGeo, material);
          wallMesh.position.set(wallName === "left" ? -halfW : halfW, 0, 0);
          wallMesh.rotation.y =
            wallName === "left" ? Math.PI / 2 : -Math.PI / 2;
        }
        this.group.add(wallMesh);
        createdWalls.push({ mesh: wallMesh, geo: wallGeo, wallIndex: i });
      } else {
        // Wall with openings
        if (isZWall) {
          openings.sort((a, b) => a.xMin - b.xMin);
          let lastX = -halfW;
          openings.forEach((o) => {
            const leftWidth = o.xMin - lastX;
            if (leftWidth > 0) {
              const wallGeo = new THREE.PlaneGeometry(leftWidth, this.height);
              const wallMesh = new THREE.Mesh(wallGeo, material);
              wallMesh.position.set(
                lastX + leftWidth / 2,
                0,
                wallName === "back" ? -halfD : halfD
              );
              if (wallName === "front") wallMesh.rotation.y = Math.PI;
              this.group.add(wallMesh);
              createdWalls.push({ mesh: wallMesh, geo: wallGeo, wallIndex: i });

            }
            lastX = o.xMax;
          });
          const rightWidth = halfW - lastX;
          if (rightWidth > 0) {
            const wallGeo = new THREE.PlaneGeometry(rightWidth, this.height);
            const wallMesh = new THREE.Mesh(wallGeo, material);
            wallMesh.position.set(
              lastX + rightWidth / 2,
              0,
              wallName === "back" ? -halfD : halfD
            );
            if (wallName === "front") wallMesh.rotation.y = Math.PI;
            this.group.add(wallMesh);
            createdWalls.push({ mesh: wallMesh, geo: wallGeo, wallIndex: i });
          }
        } else {
          openings.sort((a, b) => a.zMin - b.zMin);
          let lastZ = -halfD;
          openings.forEach((o) => {
            const lowerDepth = o.zMin - lastZ;
            if (lowerDepth > 0) {
              const wallGeo = new THREE.PlaneGeometry(lowerDepth, this.height);
              const wallMesh = new THREE.Mesh(wallGeo, material);
              wallMesh.position.set(
                wallName === "left" ? -halfW : halfW,
                0,
                lastZ + lowerDepth / 2
              );
              wallMesh.rotation.y =
                wallName === "left" ? Math.PI / 2 : -Math.PI / 2;
              this.group.add(wallMesh);
              createdWalls.push({ mesh: wallMesh, geo: wallGeo, wallIndex: i });
            }
            lastZ = o.zMax;
          });
          const upperDepth = halfD - lastZ;
          if (upperDepth > 0) {
            const wallGeo = new THREE.PlaneGeometry(upperDepth, this.height);
            const wallMesh = new THREE.Mesh(wallGeo, material);
            wallMesh.position.set(
              wallName === "left" ? -halfW : halfW,
              0,
              lastZ + upperDepth / 2
            );
            wallMesh.rotation.y =
              wallName === "left" ? Math.PI / 2 : -Math.PI / 2;
            this.group.add(wallMesh);
            createdWalls.push({ mesh: wallMesh, geo: wallGeo, wallIndex: i });
          }
        }
      }
    }
  createdWalls.forEach(({ mesh, geo, wallIndex }) => {
      const overlayMat = new THREE.MeshStandardMaterial({
          map: kidDrawings[wallIndex],
          transparent: true,
      });
      const overlayMesh = new THREE.Mesh(geo.clone(), overlayMat);
      overlayMesh.scale.set(0.25, 0.25, 1);
      overlayMesh.position.copy(mesh.position);
      overlayMesh.rotation.copy(mesh.rotation);

      // Determine wall normal for correct offset
      const offset = 0.01;
      const wallName = wallNames[wallIndex];
      const normal = new THREE.Vector3();
      if (wallName === "back") normal.set(0, 0, 1);
      else if (wallName === "front") normal.set(0, 0, -1);
      else if (wallName === "left") normal.set(1, 0, 0);
      else if (wallName === "right") normal.set(-1, 0, 0);

      overlayMesh.position.add(normal.multiplyScalar(offset));

      this.group.add(overlayMesh);
  });
  }

  /** Add static physics walls for collision */
  _createPhysicsWalls() {
    const t = 0.5; // wall thickness
    const halfW = this.width / 2;
    const halfH = this.height / 2;
    const halfD = this.depth / 2;

    const addWall = (x, y, z, sx, sy, sz) => {
      const shape = new CANNON.Box(new CANNON.Vec3(sx, sy, sz));
      const body = new CANNON.Body({ mass: 0 });
      body.addShape(shape);
      body.position.set(
        this.position.x + x,
        this.position.y + y,
        this.position.z + z
      );
      this.world.addBody(body);
      this.bodies.push(body);
    };

    const walls = ["back", "right", "front", "left"];
    walls.forEach((wName) => {
      const openings = this.openings.filter((o) => o.wall === wName);
      const isZWall = wName === "back" || wName === "front";
      const wallPos = isZWall
        ? wName === "back"
          ? -halfD - t / 2
          : halfD + t / 2
        : wName === "left"
        ? -halfW - t / 2
        : halfW + t / 2;
      const wallLength = isZWall ? this.width : this.depth;

      if (openings.length === 0) {
        // full wall
        if (isZWall) addWall(0, 0, wallPos, halfW, halfH, t / 2);
        else addWall(wallPos, 0, 0, t / 2, halfH, halfD);
      } else {
        if (isZWall) {
          openings.sort((a, b) => a.xMin - b.xMin);
          let lastX = -halfW;
          openings.forEach((o) => {
            const leftWidth = o.xMin - lastX;
            if (leftWidth > 0)
              addWall(
                -halfW + leftWidth / 2,
                0,
                wallPos,
                leftWidth / 2,
                halfH,
                t / 2
              );
            lastX = o.xMax;
          });
          const rightWidth = halfW - lastX;
          if (rightWidth > 0)
            addWall(
              lastX + rightWidth / 2,
              0,
              wallPos,
              rightWidth / 2,
              halfH,
              t / 2
            );
        } else {
          openings.sort((a, b) => a.zMin - b.zMin);
          let lastZ = -halfD;
          openings.forEach((o) => {
            const lowerDepth = o.zMin - lastZ;
            if (lowerDepth > 0)
              addWall(
                wallPos,
                0,
                lastZ + lowerDepth / 2,
                t / 2,
                halfH,
                lowerDepth / 2
              );
            lastZ = o.zMax;
          });
          const upperDepth = halfD - lastZ;
          if (upperDepth > 0)
            addWall(
              wallPos,
              0,
              lastZ + upperDepth / 2,
              t / 2,
              halfH,
              upperDepth / 2
            );
        }
      }
    });

    // Ceiling (optional)
    addWall(0, halfH + t / 2, 0, halfW, t / 2, halfD);
  }

  /** Load GLB models defined in PlaygroundLayout */
/** Load GLB models defined in PlaygroundLayout */
_loadModels() {
  PlaygroundLayouts.Playground.models.forEach((modelData) => {
    this.loader.load(modelData.path, (gltf) => {
      const obj = gltf.scene;
      obj.position.copy(modelData.position);
      obj.scale.copy(modelData.scale);
      obj.rotation.set(modelData.rotation.x, modelData.rotation.y, modelData.rotation.z);

      // --- Interaction setup ---
      obj.userData.isInteractableModel = true;
      obj.userData.modelPath = modelData.type || modelData.path;
      obj.userData.correctSound = modelData.correctSound || "./audio/sfx/child_laugh.mp3";
      obj.userData.incorrectSound = modelData.incorrectSound || "./audio/sfx/see_saw.mp3";

      if (this.modelInteractionManager) {
        this.modelInteractionManager.attachPositionalAudioToModel(obj, obj.userData.correctSound);
        this.modelInteractionManager.attachPositionalAudioToModel(obj, obj.userData.incorrectSound);
        this.modelInteractionManager.addInteractableModel(obj);
      }

      // Mark child meshes as interactable
        obj.traverse((child) => {
            if (child.isMesh) {
                child.userData.isInteractableModel = true;
                child.userData.modelPath = modelData.type || modelData.path;
                if (modelData.code !== undefined) child.userData.code = modelData.code;
                child.userData.correctSound = modelData.correctSound || "./audio/sfx/child_laugh.mp3";
                child.userData.incorrectSound = modelData.incorrectSound || "./audio/sfx/see_saw.mp3";
                // Pre-attach positional audio for both sounds
                this.modelInteractionManager.attachPositionalAudioToModel(
                    obj,
                    obj.userData.correctSound
                );
                this.modelInteractionManager.attachPositionalAudioToModel(
                    obj,
                    obj.userData.incorrectSound
                );

            }
        });

      this.group.add(obj);
      this.models.push(obj);

      // --- Physics setup ---
      if (!this.world) return;
      if (modelData.type === "merry-go-round") return; // skip

      const bbox = new THREE.Box3().setFromObject(obj);
      const size = new THREE.Vector3();
      bbox.getSize(size);
      const center = new THREE.Vector3();
      bbox.getCenter(center);

      // Create a custom physics body for specific models
      if (modelData.type === "ramp") {
        const compoundBody = new CANNON.Body({ mass: 0 });
        const mainBox = new CANNON.Box(new CANNON.Vec3(size.x / 2, size.y / 4, size.z / 4));
        compoundBody.addShape(mainBox, new CANNON.Vec3(0, size.y / 4, 0), new CANNON.Quaternion().setFromEuler(-Math.PI/6,0,0));
        const baseBox = new CANNON.Box(new CANNON.Vec3(size.x / 2, size.y / 8, size.z / 8));
        compoundBody.addShape(baseBox, new CANNON.Vec3(0, -size.y / 8, size.z / 4));
        compoundBody.position.copy(obj.position);
        this.world.addBody(compoundBody);
        this.bodies.push(compoundBody);
      } 
      else if (modelData.type === "swing") {
        const compoundBody = new CANNON.Body({ mass: 0 });
        const postLeft = new CANNON.Box(new CANNON.Vec3(size.x / 16, size.y / 2, size.z / 16));
        compoundBody.addShape(postLeft, new CANNON.Vec3(-size.x / 4, 0, 0));
        const postRight = new CANNON.Box(new CANNON.Vec3(size.x / 16, size.y / 2, size.z / 16));
        compoundBody.addShape(postRight, new CANNON.Vec3(size.x / 4, 0, 0));
        const seat = new CANNON.Box(new CANNON.Vec3(size.x / 4, size.y / 16, size.z / 8));
        compoundBody.addShape(seat, new CANNON.Vec3(0, -size.y / 2 + size.y / 16, 0));
        compoundBody.position.copy(obj.position);
        this.world.addBody(compoundBody);
        this.bodies.push(compoundBody);
      } 
      else if (modelData.type === "see-saw") {
        const body = new CANNON.Body({ mass: 0 });

        // main plank
        body.addShape(new CANNON.Box(new CANNON.Vec3(size.x / 2, size.y / 4, size.z / 4)));

        // pivot supports
        body.addShape(new CANNON.Box(new CANNON.Vec3(size.x / 16, size.y / 2, size.z / 8)), new CANNON.Vec3(-size.x / 4, -size.y / 2, 0));
        body.addShape(new CANNON.Box(new CANNON.Vec3(size.x / 16, size.y / 2, size.z / 8)), new CANNON.Vec3(size.x / 4, -size.y / 2, 0));

        body.position.copy(obj.position);
        this.world.addBody(body);
        this.bodies.push(body);
      } 
      else {
        // Default physics for any other model
        const offset = new CANNON.Vec3(center.x - obj.position.x, center.y - obj.position.y, center.z - obj.position.z);
        const halfExtents = new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2);
        const compoundBody = new CANNON.Body({ mass: 0 });
        compoundBody.addShape(new CANNON.Box(halfExtents), offset);
        compoundBody.position.copy(obj.position);
        this.world.addBody(compoundBody);
        this.bodies.push(compoundBody);
      }
    });
  });
}


  _setupLights() {
    const ceilingY = this.height / 2 - 0.1;
    PlaygroundLayouts.Playground.lights.forEach(([x, z]) => {
      const panel = new LightPanel({
        intensity: 8,
        width: 2,
        height: 2,
        color: 0xffffff,
      });
      panel.setPosition(x, ceilingY, z);
      this.group.add(panel.group);
    });
  }

  update(delta) {
    // Optional per-frame updates
  }

  unload() {
    this.models.forEach((obj) => this.group.remove(obj));
    this.bodies.forEach((b) => this.world.removeBody(b));
    this.scene.remove(this.group);
  }

  getSpawnPosition() {
    return new THREE.Vector3(-10, -1.8, 0);
  }
}
