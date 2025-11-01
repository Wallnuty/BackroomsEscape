import * as THREE from "three";
import * as CANNON from "cannon-es";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { PlaygroundLayouts } from "./PlaygroundLayout.js";
import { LightPanel } from "../../props/LightPanel.js";
import { Chalkboard } from "../../props/chalkboard.js";
import { KeypadUI } from "../../props/keypadUI.js";

export class ExtraRoom {
  constructor(
    scene,
    world,
    position = new THREE.Vector3(0, 0, 0),
    connections = {},
    corridorWidth = 6,
    camera
  ) {
    this.scene = scene;
    this.world = world;
    this.position = position;
    this.corridorWidth = corridorWidth;
    this.camera = camera;

    this.group = new THREE.Group();
    this.group.position.copy(position);
    scene.add(this.group);

    this.loader = new GLTFLoader();
    this.bodies = [];
    this.models = [];
    this.wallMeshes = [];
    this.renderingZones = [];
    this.modelInteractionManager = null;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    const layout = PlaygroundLayouts.Extra;
    this.width = layout.width;
    this.height = layout.height;
    this.depth = layout.depth;

    // Compute openings for hallways
    this.openings = [];
    const hw = corridorWidth / 2;
    for (const [wall, connectedRoom] of Object.entries(connections)) {
      if (!connectedRoom) continue;
      if (wall === "back" || wall === "front")
        this.openings.push({ wall, xMin: -hw, xMax: hw });
      else this.openings.push({ wall, zMin: -hw, zMax: hw });
    }

    this._createVisuals();
    this._createPhysicsWalls();
    this._loadModels();
    this._setupLights();
    this._setupChalkboards();
    this._setupKeypads();
  }

  _createVisuals() {
    const loader = new THREE.TextureLoader();
    const halfW = this.width / 2;
    const halfH = this.height / 2;
    const halfD = this.depth / 2;
    const t = 0.5;

    const addWallSegment = (geo, x, y, z, mat) => {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);
      this.group.add(mesh);
      this.wallMeshes.push(mesh);

      const size = new THREE.Vector3();
      geo.computeBoundingBox();
      geo.boundingBox.getSize(size);
      const shape = new CANNON.Box(
        new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2)
      );
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

    // Floor
    const floorMat = new THREE.MeshStandardMaterial({
      map: loader.load("./textures/floor/grey_floor.jpg"),
      //normalMap: loader.load("textures/floor/floor_normalgl.png"),
      //roughnessMap: loader.load("textures/floor/floor_roughness.png"),
    });
    addWallSegment(
      new THREE.BoxGeometry(this.width, t, this.depth),
      0,
      -halfH - t / 2,
      0,
      floorMat
    );

    // Ceiling
    const ceilMat = new THREE.MeshStandardMaterial({
      map: loader.load("./textures/ceiling/ceiling_basecolor.png"),
      normalMap: loader.load("./textures/ceiling/ceiling_normalgl.png"),
      roughnessMap: loader.load("./textures/ceiling/ceiling_roughness.png"),
    });
    addWallSegment(
      new THREE.PlaneGeometry(this.width, t, this.depth),
      0,
      halfH + t / 2,
      0,
      ceilMat
    );

    // Walls
    const wallNames = ["back", "right", "front", "left"];
    const wallTextures = [
      {
        base: "./textures/walls/eerie_wall.jpg",
        normal: "./textures/walls/wall1_normalgl.png",
        rough: "./textures/walls/wall1_roughness.png",
      },
      {
        base: "./textures/walls/eerie_wall.jpg",
        normal: "./textures/walls/wall2_normalgl.png",
        rough: "./textures/walls/wall2_roughness.png",
      },
      {
        base: "./textures/walls/eerie_wall.jpg",
        normal: "./textures/walls/wall3_normalgl.png",
        rough: "./textures/walls/wall3_roughness.png",
      },
      {
        base: "./textures/walls/eerie_wall.jpg",
        normal: "./textures/walls/wall4_normalgl.png",
        rough: "./textures/walls/wall4_roughness.png",
      },
    ];

    wallNames.forEach((wallName, i) => {
      const mat = new THREE.MeshStandardMaterial({
        map: loader.load(wallTextures[i].base),
        normalMap: loader.load(wallTextures[i].normal),
        roughnessMap: loader.load(wallTextures[i].rough),
      });

      const openings = this.openings.filter((o) => o.wall === wallName);
      const isZWall = wallName === "back" || wallName === "front";

      if (openings.length === 0) {
        const geo = isZWall
          ? new THREE.BoxGeometry(this.width, this.height, t)
          : new THREE.BoxGeometry(t, this.height, this.depth);

        const x = isZWall
          ? 0
          : wallName === "left"
          ? -halfW - t / 2
          : halfW + t / 2;
        const z = isZWall
          ? wallName === "back"
            ? -halfD - t / 2
            : halfD + t / 2
          : 0;
        addWallSegment(geo, x, 0, z, mat);
      } else {
        if (isZWall) {
          openings.sort((a, b) => a.xMin - b.xMin);
          let lastX = -halfW;
          openings.forEach((o) => {
            const segWidth = o.xMin - lastX;
            if (segWidth > 0)
              addWallSegment(
                new THREE.BoxGeometry(segWidth, this.height, t),
                lastX + segWidth / 2,
                0,
                wallName === "back" ? -halfD - t / 2 : halfD + t / 2,
                mat
              );
            lastX = o.xMax;
          });
          const finalWidth = halfW - lastX;
          if (finalWidth > 0)
            addWallSegment(
              new THREE.BoxGeometry(finalWidth, this.height, t),
              lastX + finalWidth / 2,
              0,
              wallName === "back" ? -halfD - t / 2 : halfD + t / 2,
              mat
            );
        } else {
          openings.sort((a, b) => a.zMin - b.zMin);
          let lastZ = -halfD;
          openings.forEach((o) => {
            const segDepth = o.zMin - lastZ;
            if (segDepth > 0)
              addWallSegment(
                new THREE.BoxGeometry(t, this.height, segDepth),
                wallName === "left" ? -halfW - t / 2 : halfW + t / 2,
                0,
                lastZ + segDepth / 2,
                mat
              );
            lastZ = o.zMax;
          });
          const finalDepth = halfD - lastZ;
          if (finalDepth > 0)
            addWallSegment(
              new THREE.BoxGeometry(t, this.height, finalDepth),
              wallName === "left" ? -halfW - t / 2 : halfW + t / 2,
              0,
              lastZ + finalDepth / 2,
              mat
            );
        }
      }
    });
  }

  _createPhysicsWalls() {
    const t = 0.5;
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

      if (openings.length === 0) {
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

    addWall(0, halfH + t / 2, 0, halfW, t / 2, halfD);
  }

  _loadModels() {
    const layout = PlaygroundLayouts.Extra;
    if (!layout.models) return;

    // Load all models EXCEPT keypads (keypads handled separately)
    layout.models
      .filter((modelData) => modelData.type !== "keypad")
      .forEach((modelData) => {
        this.loader.load(
          modelData.path,
          (gltf) => {
            const obj = gltf.scene;
            obj.position.copy(modelData.position);
            obj.scale.copy(modelData.scale);
            obj.rotation.set(
              modelData.rotation.x,
              modelData.rotation.y,
              modelData.rotation.z
            );

            obj.traverse((child) => {
              if (child.isMesh) {
                // Mark as interactable and copy userData from modelData
                child.userData.isInteractableModel = true;
                child.userData.type = modelData.type || "default";
                child.userData.modelPath = modelData.path;
                child.userData.code = modelData.code;
                child.userData.displayNumber = modelData.displayNumber;

                // Material fixes
                if (!child.material) {
                  child.material = new THREE.MeshStandardMaterial({
                    color: 0xaaaaaa,
                    roughness: 0.8,
                    metalness: 0.1,
                  });
                } else {
                  child.material = child.material.clone();

                  if (
                    child.material.color &&
                    child.material.color.r === 0 &&
                    child.material.color.g === 0 &&
                    child.material.color.b === 0
                  ) {
                    child.material.color.setHex(0x8b7355);
                  }

                  if (child.material.metalness !== undefined) {
                    child.material.metalness = 0.1;
                  }
                  if (child.material.roughness !== undefined) {
                    child.material.roughness = 0.8;
                  }
                }

                child.material.needsUpdate = true;
                child.castShadow = true;
                child.receiveShadow = true;

                // Register with model interaction manager
                if (this.modelInteractionManager) {
                  this.modelInteractionManager.addInteractableModel(child);
                }
              }
            });

            this.group.add(obj);
            this.models.push(obj);

            // Register parent object
            if (this.modelInteractionManager) {
              this.modelInteractionManager.addInteractableModel(obj);
            }

            // Create physics body
            if (!this.world) return;

            const compoundBody = new CANNON.Body({ mass: 0 });
            const bbox = new THREE.Box3().setFromObject(obj);
            const size = new THREE.Vector3();
            bbox.getSize(size);

            const box = new CANNON.Box(
              new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2)
            );
            compoundBody.addShape(box);
            compoundBody.position.set(
              obj.position.x + this.position.x,
              obj.position.y + this.position.y,
              obj.position.z + this.position.z
            );
            this.world.addBody(compoundBody);
            this.bodies.push(compoundBody);
          },
          undefined,
          (error) => {
            console.error("Error loading model:", modelData.path, error);
          }
        );
      });
  }

  _setupLights() {
    const layout = PlaygroundLayouts.Extra;
    const ceilingY = this.height / 2 - 0.1;
    layout.lights.forEach(([x, z]) => {
      const panel = new LightPanel({
        intensity: 13,
        width: 2,
        height: 2,
        color: 0xffffff,
      });
      panel.setPosition(x, ceilingY, z);
      this.group.add(panel.group);
    });
  }

  _setupChalkboards() {
    const layout = PlaygroundLayouts.Extra;
    if (!layout.chalkboards) return;

    layout.chalkboards.forEach((data) => {
      const board = new Chalkboard(data.phrase, 4);
      board.group.position.copy(data.position);
      board.group.rotation.y = data.rotationY || 0;
      this.group.add(board.group);

      const phrases = data.phrases || [
        "1.COME", // Trick
        "2.PLAY", // doll
        "3.LAUGH", // clown
        "4.FOREVER", // trick
        "5.STAY", // Desk
        "6.SCREAM", // man screaming
        "7.ESCAPE", // Trick
        "8.HELP", //Trick
        "9.HIDE",
      ];

      board.startCycling(phrases, 3000);
      data.instance = board;
    });
  }

  _setupKeypads() {
    const layout = PlaygroundLayouts.Extra;
    if (!layout.models) return;

    // Load keypads separately to ensure they work properly
    layout.models
      .filter((modelData) => modelData.type === "keypad")
      .forEach((data) => {
        this.loader.load(
          data.path,
          (gltf) => {
            const obj = gltf.scene;
            obj.position.copy(data.position);
            obj.scale.copy(data.scale);
            obj.rotation.set(data.rotation.x, data.rotation.y, data.rotation.z);

            // Mark all child meshes as interactable
            obj.traverse((child) => {
              if (child.isMesh) {
                child.userData.isInteractableModel = true;
                child.userData.code = data.code;
                child.userData.modelPath = data.path;
                child.userData.type = "keypad";

                if (this.modelInteractionManager) {
                  this.modelInteractionManager.addInteractableModel(child);
                }

                this.models.push(child);
              }
            });

            this.group.add(obj);

            // Register parent object
            if (this.modelInteractionManager) {
              this.modelInteractionManager.addInteractableModel(obj);
            }
          },
          undefined,
          (error) => {
            console.error("Error loading keypad model:", data.path, error);
          }
        );
      });
  }

  update(delta) {}

  unload() {
    this.models.forEach((obj) => this.group.remove(obj));
    this.bodies.forEach((b) => this.world.removeBody(b));
    this.scene.remove(this.group);
  }

  getSpawnPosition() {
    return new THREE.Vector3(0, -1.8, 0);
  }
}
