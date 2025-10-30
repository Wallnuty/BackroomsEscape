import * as THREE from "three";
import * as CANNON from "cannon-es";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { PlaygroundLayouts } from "./PlaygroundLayout.js";
import { LightPanel } from "../../props/LightPanel.js";
import { ImageObject } from "../../props/blackboard.js";
console.log("✅ SignInRoom.js is being imported and executed");

export class SignInRoom {
  constructor(
    scene,
    world,
    modelInteractionManager,
    position = new THREE.Vector3(0, 0, 0),
    connections = {},
    corridorWidth = 6
  ) {
    this.scene = scene;
    this.world = world;
    this.modelInteractionManager = modelInteractionManager;
    this.position = position;
    this.corridorWidth = corridorWidth;

    this.group = new THREE.Group();
    this.group.position.copy(position);
    scene.add(this.group);

    this.loader = new GLTFLoader();
    this.bodies = [];
    this.models = [];
    this.wallMeshes = []; // store visual wall meshes with wallSide
    this.renderingZones = [];

    const layout = PlaygroundLayouts.SignIn;
    this.width = layout.width;
    this.height = layout.height;
    this.depth = layout.depth;

    // Compute openings from connections
    this.openings = [];
    const hw = corridorWidth / 2;
    for (const [wall, connectedRoom] of Object.entries(connections)) {
      if (!connectedRoom) continue;
      if (wall === "back" || wall === "front")
        this.openings.push({ wall, xMin: -hw, xMax: hw });
      else this.openings.push({ wall, zMin: -hw, zMax: hw });
    }

    this._createVisuals();
    //this._createPhysicsWalls();
    this._loadModels();
    this._setupLights();
        // --- ADD IMAGE OBJECT HERE ---
    this.imageObj = new ImageObject(4, 4, 0.1, "textures/walls/UnhappyFace.png");
    this.imageObj.setPosition(20, 0, 10); // position in room
    this.imageObj.setRotation(0, Math.PI / 2, 0); // rotate to face inward
    this.group.add(this.imageObj.group);
    modelInteractionManager.setPuzzleImage("puzzle1", this.imageObj);

    this.imageObj2 = new ImageObject(4, 4, 0.1, "textures/walls/UnhappyFace.png");
    this.imageObj2.setPosition(-20, 0, 10); // different position
    this.imageObj2.setRotation(0, Math.PI / 2, 0); // rotate to face inward
    this.group.add(this.imageObj2.group);
     modelInteractionManager.setPuzzleImage("puzzle2", this.imageObj2);
    this.addRenderingZone(
      new THREE.Vector3(-this.width / 2, 0, -this.depth / 2), // from
      new THREE.Vector3(this.width / 2, 0, this.depth / 2), // to
      "south", // direction (or any)
      new THREE.Vector3(0, 0, 0) // center
    );
  }

  // --- define the method inside the class ---
  addRenderingZone(from, to, direction, center) {
    const zone = {
      from,
      to,
      direction,
      center,
      hasTriggered: false,
      parentRoom: this,
      containsPoint: (point) => {
        // Simple AABB check
        return (
          point.x >= Math.min(from.x, to.x) &&
          point.x <= Math.max(from.x, to.x) &&
          point.y >= Math.min(from.y, to.y) &&
          point.y <= Math.max(from.y, to.y) &&
          point.z >= Math.min(from.z, to.z) &&
          point.z <= Math.max(from.z, to.z)
        );
      },
    };
    this.renderingZones.push(zone);
  }

  _createVisuals() {
    const loader = new THREE.TextureLoader();
    const halfW = this.width / 2;
    const halfH = this.height / 2;
    const halfD = this.depth / 2;
    const t = 0.5; // wall thickness

    // Floor
    const floorMat = new THREE.MeshStandardMaterial({
      map: loader.load("textures/floor/floor_basecolor.jpg"),
      normalMap: loader.load("textures/floor/floor_normalgl.png"),
      roughnessMap: loader.load("textures/floor/floor_roughness.png"),
    });
    const floorGeo = new THREE.BoxGeometry(this.width, t, this.depth);
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.set(0, -halfH - t / 2, 0);
    this.group.add(floor);

    // Ceiling
    const ceilMat = new THREE.MeshStandardMaterial({
      map: loader.load("textures/ceiling/ceiling_basecolor.png"),
      normalMap: loader.load("textures/ceiling/ceiling_normalgl.png"),
      roughnessMap: loader.load("textures/ceiling/ceiling_roughness.png"),
    });
    const ceilGeo = new THREE.BoxGeometry(this.width, t, this.depth);
    const ceiling = new THREE.Mesh(ceilGeo, ceilMat);
    ceiling.position.set(0, halfH + t / 2, 0);
    this.group.add(ceiling);

    // Walls helper
    const wallNames = ["back", "right", "front", "left"];
    const wallTextures = [
      {
        base: "textures/walls/SignInWall_basecolor.png",
        normal: "textures/walls/SignInWall_normalgl.png",
        rough: "textures/walls/SignInWall_roughness.png",
      },
      {
        base: "textures/walls/SignInWall_basecolor.png",
        normal: "textures/walls/SignInWall_normalgl.png",
        rough: "textures/walls/SignInWall_roughness.png",
      },
      {
        base: "textures/walls/SignInWall_basecolor.png",
        normal: "textures/walls/SignInWall_normalgl.png",
        rough: "textures/walls/SignInWall_roughness.png",
      },
      {
        base: "textures/walls/SignInWall_basecolor.png",
        normal: "textures/walls/SignInWall_normalgl.png",
        rough: "textures/walls/SignInWall_roughness.png",
      },
    ];

    // Helper function to create wall + physics at once
    const addWallSegment = (geo, x, y, z, mat) => {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);
      this.group.add(mesh);
      this.wallMeshes.push(mesh);

      // Physics
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
    let backwall = null;
    // Create walls
    wallNames.forEach((wallName, i) => {
      const mat = new THREE.MeshStandardMaterial({
        map: loader.load(wallTextures[i].base),
        normalMap: loader.load(wallTextures[i].normal),
        roughnessMap: loader.load(wallTextures[i].rough),
      });

      const openings = this.openings.filter((o) => o.wall === wallName);
      const isZWall = wallName === "back" || wallName === "front";

      if (openings.length === 0) {
        // Full wall
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
        // Wall with openings
        if (isZWall) {
          openings.sort((a, b) => a.xMin - b.xMin);
          let lastX = -halfW;
          openings.forEach((o) => {
            const segWidth = o.xMin - lastX;
            if (segWidth > 0) {
              const geo = new THREE.BoxGeometry(segWidth, this.height, t);
              const x = lastX + segWidth / 2;
              const z = wallName === "back" ? -halfD - t / 2 : halfD + t / 2;
              addWallSegment(geo, x, 0, z, mat);
            }
            lastX = o.xMax;
          });
          const finalWidth = halfW - lastX;
          if (finalWidth > 0) {
            const geo = new THREE.BoxGeometry(finalWidth, this.height, t);
            const x = lastX + finalWidth / 2;
            const z = wallName === "back" ? -halfD - t / 2 : halfD + t / 2;
            addWallSegment(geo, x, 0, z, mat);
          }
        } else {
          openings.sort((a, b) => a.zMin - b.zMin);
          let lastZ = -halfD;
          openings.forEach((o) => {
            const segDepth = o.zMin - lastZ;
            if (segDepth > 0) {
              const geo = new THREE.BoxGeometry(t, this.height, segDepth);
              const x = wallName === "left" ? -halfW - t / 2 : halfW + t / 2;
              const z = lastZ + segDepth / 2;
              addWallSegment(geo, x, 0, z, mat);
            }
            lastZ = o.zMax;
          });
          const finalDepth = halfD - lastZ;
          if (finalDepth > 0) {
            const geo = new THREE.BoxGeometry(t, this.height, finalDepth);
            const x = wallName === "left" ? -halfW - t / 2 : halfW + t / 2;
            const z = lastZ + finalDepth / 2;
            addWallSegment(geo, x, 0, z, mat);
          }
        }
      }
    });
    
    const overlayTex = loader.load("textures/walls/Daycare_sign3.png");
    const overlayMat = new THREE.MeshStandardMaterial({ map: overlayTex, transparent: true });

    this.wallMeshes.forEach(mesh => {
      // Only back wall segments
      if (mesh.position.z < 0) { 
        const overlayMesh = new THREE.Mesh(mesh.geometry.clone(), overlayMat);
        overlayMesh.position.copy(mesh.position);
        overlayMesh.rotation.copy(mesh.rotation);
        overlayMesh.scale.set(0.5, 0.5, 1); // adjust size
        // offset slightly along z to avoid z-fighting
        overlayMesh.position.z += 0.01;
        this.group.add(overlayMesh);
      }
    });
  }

  _createPhysicsWalls() {
    // create physics exactly from wallMeshes
    this.wallMeshes.forEach((mesh) => {
      const box = new THREE.Box3().setFromObject(mesh);
      const size = new THREE.Vector3();
      box.getSize(size);
      const center = new THREE.Vector3();
      box.getCenter(center);

      const shape = new CANNON.Box(
        new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2)
      );
      const body = new CANNON.Body({ mass: 0 });
      body.addShape(shape);
      body.position.set(
        center.x + this.position.x,
        center.y + this.position.y,
        center.z + this.position.z
      );
      this.world.addBody(body);
      this.bodies.push(body);
    });
  }

  _loadModels() {
    const layout = PlaygroundLayouts.SignIn;
    if (!layout.models) return;
    layout.models.forEach((modelData) => {
      this.loader.load(modelData.path, (gltf) => {
        const obj = gltf.scene;
        obj.position.copy(modelData.position);
        obj.scale.copy(modelData.scale);
        obj.rotation.set(
          modelData.rotation.x,
          modelData.rotation.y,
          modelData.rotation.z
        );
        if (modelData.type === "door") {
          obj.userData.isInteractableModel = true;
          obj.userData.modelPath = "door";
          obj.userData.type = "door";
          obj.userData.correctSound = modelData.correctSound;
          obj.userData.incorrectSound = modelData.incorrectSound;
        }

        if (this.modelInteractionManager && obj.userData.isInteractableModel) {
          this.modelInteractionManager.addInteractableModel(obj);
        }

        this.group.add(obj);
        this.models.push(obj);

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
          obj.position.x,
          obj.position.y,
          obj.position.z
        );
        this.world.addBody(compoundBody);
        this.bodies.push(compoundBody);
      });
    });
  }

  _setupLights() {
    const layout = PlaygroundLayouts.SignIn;
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
