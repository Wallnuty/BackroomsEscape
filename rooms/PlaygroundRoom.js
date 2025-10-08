import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { PlaygroundLayout } from './PlaygroundLayout.js';
import { LightPanel } from '../props/LightPanel.js';

export class PlaygroundRoom {
    constructor(scene, world, position = new THREE.Vector3(0, 0, 0)) {
        this.scene = scene;
        this.world = world;
        this.position = position;

        this.group = new THREE.Group();
        this.group.position.copy(position);
        scene.add(this.group);

        this.loader = new GLTFLoader();
        this.bodies = [];
        this.models = [];
        this.width = PlaygroundLayout.width;
        this.height = PlaygroundLayout.height;
        this.depth = PlaygroundLayout.depth;

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
            map: loader.load('textures/floor/floor_basecolor.jpg'),
            normalMap: loader.load('textures/floor/floor_normalgl.png'),
            roughnessMap: loader.load('textures/floor/floor_roughness.png'),
        });
        const floorGeo = new THREE.PlaneGeometry(this.width, this.depth);
        const floor = new THREE.Mesh(floorGeo, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -halfH;
        this.group.add(floor);

        // CEILING
        const ceilingMaterial = new THREE.MeshStandardMaterial({
            map: loader.load('textures/ceiling/ceiling_basecolor.png'),
            normalMap: loader.load('textures/ceiling/ceiling_normalgl.png'),
            roughnessMap: loader.load('textures/ceiling/ceiling_roughness.png'),
        });
        const ceilingGeo = new THREE.PlaneGeometry(this.width, this.depth);
        const ceiling = new THREE.Mesh(ceilingGeo, ceilingMaterial);
        ceiling.rotation.x = Math.PI / 2;
        ceiling.position.y = halfH;
        this.group.add(ceiling);

        // WALLS
        const wallPaths = [
            { base: 'textures/walls/wall1_basecolor.png', normal: 'textures/walls/wall1_normalgl.png', rough: 'textures/walls/wall1_roughness.png' },
            { base: 'textures/walls/wall2_basecolor.png', normal: 'textures/walls/wall2_normalgl.png', rough: 'textures/walls/wall2_roughness.png' },
            { base: 'textures/walls/wall3_basecolor.png', normal: 'textures/walls/wall3_normalgl.png', rough: 'textures/walls/wall3_roughness.png' },
            { base: 'textures/walls/wall4_basecolor.png', normal: 'textures/walls/wall4_normalgl.png', rough: 'textures/walls/wall4_roughness.png' }
        ];

        for (let i = 0; i < 4; i++) {
            const material = new THREE.MeshStandardMaterial({
                map: loader.load(wallPaths[i].base),
                normalMap: loader.load(wallPaths[i].normal),
                roughnessMap: loader.load(wallPaths[i].rough),
            });

            let wallGeo;
            let wallMesh;

            if (i < 2) { // front/back walls
                wallGeo = new THREE.PlaneGeometry(this.width, this.height);
                wallMesh = new THREE.Mesh(wallGeo, material);
                wallMesh.position.set(0, 0, i === 0 ? -halfD : halfD);
                if (i === 1) wallMesh.rotation.y = Math.PI;
            } else { // left/right walls
                wallGeo = new THREE.PlaneGeometry(this.depth, this.height);
                wallMesh = new THREE.Mesh(wallGeo, material);
                wallMesh.position.set(i === 2 ? -halfW : halfW, 0, 0);
                wallMesh.rotation.y = i === 2 ? Math.PI / 2 : -Math.PI / 2;
            }

            this.group.add(wallMesh);
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

        // Back wall
        addWall(0, 0, -halfD - t / 2, halfW, halfH, t / 2);
        // Front wall
        addWall(0, 0, halfD + t / 2, halfW, halfH, t / 2);
        // Left wall
        addWall(-halfW - t / 2, 0, 0, t / 2, halfH, halfD);
        // Right wall
        addWall(halfW + t / 2, 0, 0, t / 2, halfH, halfD);
        // Ceiling (optional)
        addWall(0, halfH + t / 2, 0, halfW, t / 2, halfD);
    }

    /** Load GLB models defined in PlaygroundLayout */
    /** Load GLB models defined in PlaygroundLayout with improved colliders */
    _loadModels() {
        PlaygroundLayout.models.forEach(modelData => {
            this.loader.load(modelData.path, gltf => {
                const obj = gltf.scene;
                obj.position.copy(modelData.position);
                obj.scale.copy(modelData.scale);
                obj.rotation.set(
                    modelData.rotation.x,
                    modelData.rotation.y,
                    modelData.rotation.z
                );
                this.group.add(obj);
                this.models.push(obj);

                if (!this.world) return;

                // Create a compound collider using multiple boxes or cylinders
                const compoundBody = new CANNON.Body({ mass: 0 });
                
                // Example logic: check type and add suitable shapes
                if (modelData.type === 'slide') {
                    // Slide: one long inclined box + small base box
                    const bbox = new THREE.Box3().setFromObject(obj);
                    const size = new THREE.Vector3();
                    bbox.getSize(size);

                    // Inclined main part
                    const mainBox = new CANNON.Box(
                        new CANNON.Vec3(size.x / 2, size.y / 4, size.z / 4)
                    );
                    compoundBody.addShape(mainBox, new CANNON.Vec3(0, size.y / 4, 0), new CANNON.Quaternion().setFromEuler(-Math.PI/6, 0, 0));

                    // Base
                    const baseBox = new CANNON.Box(new CANNON.Vec3(size.x / 2, size.y / 8, size.z / 8));
                    compoundBody.addShape(baseBox, new CANNON.Vec3(0, -size.y / 8, size.z / 4));
                } else if (modelData.type === 'swing') {
                    // Swing: two vertical posts + seat
                    const bbox = new THREE.Box3().setFromObject(obj);
                    const size = new THREE.Vector3();
                    bbox.getSize(size);

                    // Left post
                    const postLeft = new CANNON.Box(new CANNON.Vec3(size.x / 16, size.y / 2, size.z / 16));
                    compoundBody.addShape(postLeft, new CANNON.Vec3(-size.x / 4, 0, 0));
                    // Right post
                    const postRight = new CANNON.Box(new CANNON.Vec3(size.x / 16, size.y / 2, size.z / 16));
                    compoundBody.addShape(postRight, new CANNON.Vec3(size.x / 4, 0, 0));
                    // Seat
                    const seat = new CANNON.Box(new CANNON.Vec3(size.x / 4, size.y / 16, size.z / 8));
                    compoundBody.addShape(seat, new CANNON.Vec3(0, -size.y / 2 + size.y / 16, 0));
                } else {
                    // Default: simple bounding box
                    const bbox = new THREE.Box3().setFromObject(obj);
                    const size = new THREE.Vector3();
                    bbox.getSize(size);
                    const box = new CANNON.Box(new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2));
                    compoundBody.addShape(box);
                }

                // Position compound body
                const objPos = obj.position;
                compoundBody.position.set(objPos.x, objPos.y, objPos.z);
                this.world.addBody(compoundBody);
                this.bodies.push(compoundBody);
            });
        });
    }

    _setupLights() {
        // Add ceiling light panels from layout
        const ceilingY = this.height / 2 - 0.1; // just below ceiling
        PlaygroundLayout.lights.forEach(([x, z]) => {
            const panel = new LightPanel({
                intensity: 13,
                width: 2,
                height: 2,
                color: 0xffffff
            });
            panel.setPosition(x, ceilingY, z);
            this.group.add(panel.group);
        });
    }

    
    /** Called every frame if needed */
    update(delta) {
        // No flicker lights or pickups here
    }

    /** Cleanup */
    unload() {
        this.models.forEach(obj => this.group.remove(obj));
        this.bodies.forEach(b => this.world.removeBody(b));
        this.scene.remove(this.group);
    }

    /** Spawn position (above ground floor) */
    getSpawnPosition() {
        return new THREE.Vector3(0, -1.8, 0);
    }
}
