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
      map: loader.load("textures/floor/floor_basecolor.jpg"),
      normalMap: loader.load("textures/floor/floor_normalgl.png"),
      roughnessMap: loader.load("textures/floor/floor_roughness.png"),
    });
    const floorGeo = new THREE.PlaneGeometry(this.width, this.depth);
    const floor = new THREE.Mesh(floorGeo, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -halfH;
    this.group.add(floor);

    // CEILING
    const ceilingMaterial = new THREE.MeshStandardMaterial({
      map: loader.load("textures/ceiling/ceiling_basecolor.png"),
      normalMap: loader.load("textures/ceiling/ceiling_normalgl.png"),
      roughnessMap: loader.load("textures/ceiling/ceiling_roughness.png"),
    });
    const ceilingGeo = new THREE.PlaneGeometry(this.width, this.depth);
    const ceiling = new THREE.Mesh(ceilingGeo, ceilingMaterial);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = halfH;
    this.group.add(ceiling);

    // WALLS
    const wallPaths = [
      {
        base: "textures/walls/wall1_basecolor.png",
        normal: "textures/walls/wall1_normalgl.png",
        rough: "textures/walls/wall1_roughness.png",
      },
      {
        base: "textures/walls/wall2_basecolor.png",
        normal: "textures/walls/wall2_normalgl.png",
        rough: "textures/walls/wall2_roughness.png",
      },
      {
        base: "textures/walls/wall3_basecolor.png",
        normal: "textures/walls/wall3_normalgl.png",
        rough: "textures/walls/wall3_roughness.png",
      },
      {
        base: "textures/walls/wall4_basecolor.png",
        normal: "textures/walls/wall4_normalgl.png",
        rough: "textures/walls/wall4_roughness.png",
      },
    ];

    const wallNames = ["back", "right", "front", "left"];

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
          }
        }
      }
    }
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
  _loadModels() {
    PlaygroundLayouts.Playground.models.forEach((modelData) => {
      this.loader.load(modelData.path, (gltf) => {
        const obj = gltf.scene;
        obj.position.copy(modelData.position);
        obj.scale.copy(modelData.scale);
        obj.rotation.set(
          modelData.rotation.x,
          modelData.rotation.y,
          modelData.rotation.z
        );

        obj.userData.isInteractableModel = true;
        obj.userData.modelPath = modelData.type || modelData.path; // type like 'swing' or 'slide'
        if (modelData.code !== undefined) obj.userData.code = modelData.code;
        obj.userData.correctSound = modelData.correctSound || "/audio/sfx/child_laugh.mp3";
        obj.userData.incorrectSound = modelData.incorrectSound || "audio/sfx/see_saw.mp3"; 
        // Pre-attach positional audio for both sounds
        this.modelInteractionManager.attachPositionalAudioToModel(
            obj,
            obj.userData.correctSound
        );
        this.modelInteractionManager.attachPositionalAudioToModel(
            obj,
            obj.userData.incorrectSound
        );


        this.group.add(obj);
        this.models.push(obj);

        // Make all meshes interactable
        obj.traverse((child) => {
            if (child.isMesh) {
                child.userData.isInteractableModel = true;
                child.userData.modelPath = modelData.type || modelData.path;
                if (modelData.code !== undefined) child.userData.code = modelData.code;
                child.userData.correctSound = modelData.correctSound || "/audio/sfx/child_laugh.mp3";
                child.userData.incorrectSound = modelData.incorrectSound || "audio/sfx/see_saw.mp3";
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

        // Register with RoomManager's modelInteractionManager
        if (this.modelInteractionManager) {
            this.modelInteractionManager.addInteractableModel(obj);
        }

        if (!this.world) return;

        const compoundBody = new CANNON.Body({ mass: 0 });
        const bbox = new THREE.Box3().setFromObject(obj);
        const size = new THREE.Vector3();
        bbox.getSize(size);

        if (modelData.type === "slide") {
          const mainBox = new CANNON.Box(
            new CANNON.Vec3(size.x / 2, size.y / 4, size.z / 4)
          );
          compoundBody.addShape(
            mainBox,
            new CANNON.Vec3(0, size.y / 4, 0),
            new CANNON.Quaternion().setFromEuler(-Math.PI / 6, 0, 0)
          );
          const baseBox = new CANNON.Box(
            new CANNON.Vec3(size.x / 2, size.y / 8, size.z / 8)
          );
          compoundBody.addShape(
            baseBox,
            new CANNON.Vec3(0, -size.y / 8, size.z / 4)
          );
        } else if (modelData.type === "swing") {
          const postLeft = new CANNON.Box(
            new CANNON.Vec3(size.x / 16, size.y / 2, size.z / 16)
          );
          compoundBody.addShape(postLeft, new CANNON.Vec3(-size.x / 4, 0, 0));
          const postRight = new CANNON.Box(
            new CANNON.Vec3(size.x / 16, size.y / 2, size.z / 16)
          );
          compoundBody.addShape(postRight, new CANNON.Vec3(size.x / 4, 0, 0));
          const seat = new CANNON.Box(
            new CANNON.Vec3(size.x / 4, size.y / 16, size.z / 8)
          );
          compoundBody.addShape(
            seat,
            new CANNON.Vec3(0, -size.y / 2 + size.y / 16, 0)
          );
        } else {
          const box = new CANNON.Box(
            new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2)
          );
          compoundBody.addShape(box);
        }

        const objPos = obj.position;
        compoundBody.position.set(objPos.x, objPos.y, objPos.z);
        this.world.addBody(compoundBody);
        this.bodies.push(compoundBody);
      });
    });
  }

  _setupLights() {
    const ceilingY = this.height / 2 - 0.1;
    PlaygroundLayouts.Playground.lights.forEach(([x, z]) => {
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

  update(delta) {
    // Optional per-frame updates
  }

  unload() {
    this.models.forEach((obj) => this.group.remove(obj));
    this.bodies.forEach((b) => this.world.removeBody(b));
    this.scene.remove(this.group);
  }

  getSpawnPosition() {
    return new THREE.Vector3(0, -1.8, 0);
  }
}
