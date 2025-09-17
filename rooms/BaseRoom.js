import * as THREE from 'three';
import * as CANNON from 'cannon-es';

/**
 * Creates a basic rectangular room with visuals and physics.
 * Intended to be extended by more specific room types.
 */
export class BaseRoom {
    constructor(scene, world, width = 10, height = 5, depth = 10) {
        this.scene = scene;
        this.world = world;
        this.width = width;
        this.height = height;
        this.depth = depth;

        this.group = new THREE.Group();
        this.bodies = [];
        this.wallMaterial = null; // Will be set by _createMaterials

        this._createVisuals();
        this._createPhysics();

        this.scene.add(this.group);
        this.bodies.forEach(body => this.world.addBody(body));
    }

    /**
     * Creates the visual components of the room.
     * Uses overrideable methods for materials and lights.
     */
    _createVisuals() {
        const materials = this._createMaterials();
        const geometry = new THREE.BoxGeometry(this.width, this.height, this.depth);
        const roomMesh = new THREE.Mesh(geometry, materials);
        roomMesh.receiveShadow = true;
        this.group.add(roomMesh);

        this._createLights();
    }

    /**
     * Creates the physics bodies for the room boundaries.
     */
    _createPhysics() {
        const { width, height, depth } = this;

        // Floor
        const groundBody = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
        groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
        groundBody.position.y = -height / 2;
        this.bodies.push(groundBody);

        // Ceiling
        const ceilingBody = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
        ceilingBody.quaternion.setFromEuler(Math.PI / 2, 0, 0);
        ceilingBody.position.y = height / 2;
        this.bodies.push(ceilingBody);

        // Walls
        const wallPositions = [
            { pos: [0, 0, depth / 2], rot: [0, Math.PI, 0] },   // Back
            { pos: [0, 0, -depth / 2], rot: [0, 0, 0] },         // Front
            { pos: [width / 2, 0, 0], rot: [0, -Math.PI / 2, 0] },// Right
            { pos: [-width / 2, 0, 0], rot: [0, Math.PI / 2, 0] } // Left
        ];

        wallPositions.forEach(data => {
            const wallBody = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
            wallBody.quaternion.setFromEuler(...data.rot);
            wallBody.position.set(...data.pos);
            this.bodies.push(wallBody);
        });
    }

    /**
     * Adds an internal wall to the room between two points.
     * @param {THREE.Vector3} from - The start point of the wall on the floor.
     * @param {THREE.Vector3} to - The end point of the wall on the floor.
     * @param {number} thickness - The thickness of the wall.
     */
    addWall(from, to, thickness) {
        const diff = to.clone().sub(from);
        const width = diff.length(); // Calculate the length of the wall

        // Calculate the center position of the wall
        const position = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);

        // Calculate the rotation of the wall
        const rotationY = Math.atan2(diff.x, diff.z);

        // --- Visuals ---
        // Note: BoxGeometry width is along its local X-axis. We rotate it to align with the from-to vector.
        const wallGeometry = new THREE.BoxGeometry(thickness, this.height, width);

        // Use the wall material defined on the instance.
        const wallMaterial = this.wallMaterial.clone();

        // If the material has a texture, clone it and set its repeat value based on the wall size.
        if (wallMaterial.map) {
            const wallTexture = wallMaterial.map.clone();
            wallTexture.needsUpdate = true; // Important when cloning textures
            wallTexture.repeat.set(width / 4, this.height / 6);
            wallMaterial.map = wallTexture;
        }

        const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);
        wallMesh.position.copy(position);
        wallMesh.rotation.y = rotationY;
        this.group.add(wallMesh);

        // --- Physics ---
        const wallShape = new CANNON.Box(new CANNON.Vec3(thickness / 2, this.height / 2, width / 2));
        const wallBody = new CANNON.Body({ mass: 0 });
        wallBody.addShape(wallShape);
        wallBody.position.copy(position);
        wallBody.quaternion.setFromEuler(0, rotationY, 0);
        this.world.addBody(wallBody);
        this.bodies.push(wallBody);
    }

    /**
     * Creates basic materials. Override in subclass for custom textures.
     * @returns {THREE.Material[]}
     */
    _createMaterials() {
        const material = new THREE.MeshStandardMaterial({
            color: 0x808080,
            side: THREE.BackSide
        });
        // Set a default wall material for the base class
        this.wallMaterial = new THREE.MeshStandardMaterial({
            color: 0x888888,
            side: THREE.DoubleSide
        });
        return Array(6).fill(material);
    }

    /**
     * Creates basic lighting. Override in subclass for custom lights.
     */
    _createLights() {
        const ambient = new THREE.AmbientLight(0xffffff, 0.5);
        this.group.add(ambient);
    }
}