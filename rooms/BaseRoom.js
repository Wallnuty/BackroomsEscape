import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { RenderingZone } from './RenderingZone.js';

/**
 * Creates a basic rectangular room with visuals and physics.
 * Intended to be extended by more specific room types.
 */
export class BaseRoom {
    constructor(scene, world, width = 10, height = 5, depth = 10, position = new THREE.Vector3(0, 0, 0)) {
        this.scene = scene;
        this.world = world;
        this.width = width;
        this.height = height;
        this.depth = depth;
        this.position = position; // Store room position

        this.group = new THREE.Group();
        this.bodies = [];
        this.wallMaterial = null; // Will be set by _createMaterials

        // Add rendering zones array
        this.renderingZones = [];

        // Set the room position
        this.group.position.copy(position);

        this._createVisuals();

        this.scene.add(this.group);
        this.bodies.forEach(body => this.world.addBody(body));
    }

    /**
     * Creates the visual components of the room.
     * Uses overrideable methods for materials and lights.
     */
    _createVisuals() {
        const materials = this._createMaterials();

        // Create floor
        const floorGeometry = new THREE.PlaneGeometry(this.width, this.depth);
        const floorMesh = new THREE.Mesh(floorGeometry, materials.floor); // Floor material
        floorMesh.rotation.x = -Math.PI / 2;
        floorMesh.position.y = -this.height / 2;
        floorMesh.receiveShadow = false;
        this.group.add(floorMesh);

        // Create ceiling
        const ceilingGeometry = new THREE.PlaneGeometry(this.width, this.depth);
        const ceilingMesh = new THREE.Mesh(ceilingGeometry, materials.ceiling); // Ceiling material
        ceilingMesh.rotation.x = Math.PI / 2;
        ceilingMesh.position.y = this.height / 2;
        ceilingMesh.receiveShadow = false;
        this.group.add(ceilingMesh);

    }

    /**
     * Adds an internal wall to the room between two points.
     * @param {THREE.Vector3} from - The start point of the wall on the floor.
     * @param {THREE.Vector3} to - The end point of the wall on the floor.
     * @param {number} thickness - The thickness of the wall.
     */
    addWall(from, to, thickness) {
        const diff = to.clone().sub(from);
        const width = diff.length();

        // Calculate the center position of the wall (relative to room)
        const relativePosition = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);

        // Convert to world coordinates for physics
        const worldPosition = relativePosition.clone().add(this.position);

        // Calculate the rotation of the wall
        const rotationY = Math.atan2(diff.x, diff.z);

        // --- Visuals ---
        const wallGeometry = new THREE.BoxGeometry(thickness, this.height, width);
        const wallMaterial = this.wallMaterial.clone();

        if (wallMaterial.map) {
            const wallTexture = wallMaterial.map.clone();
            wallTexture.needsUpdate = true;
            wallTexture.repeat.set(width / 4, this.height / 6);
            wallMaterial.map = wallTexture;
        }

        const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);
        wallMesh.position.copy(relativePosition); // Relative to room group
        wallMesh.rotation.y = rotationY;
        wallMesh.receiveShadow = false;
        wallMesh.castShadow = false;
        this.group.add(wallMesh);

        // --- Physics ---
        const wallShape = new CANNON.Box(new CANNON.Vec3(thickness / 2, this.height / 2, width / 2));
        const wallBody = new CANNON.Body({ mass: 0 });
        wallBody.addShape(wallShape);
        wallBody.position.copy(worldPosition); // World coordinates for physics
        wallBody.quaternion.setFromEuler(0, rotationY, 0);
        this.world.addBody(wallBody);
        this.bodies.push(wallBody);
    }

    /**
     * Creates basic materials. Override in subclass for custom textures.
     * @returns {THREE.Material[]} Array: [wall, wall, ceiling, floor, wall, wall]
     */
    _createMaterials() {
        const wallMaterial = new THREE.MeshStandardMaterial({
            color: 0x888888,
            side: THREE.DoubleSide
        });

        const floorMaterial = new THREE.MeshStandardMaterial({
            color: 0x666666,
            side: THREE.FrontSide
        });

        const ceilingMaterial = new THREE.MeshStandardMaterial({
            color: 0xaaaaaa,
            side: THREE.BackSide
        });

        // Set a default wall material for the base class
        this.wallMaterial = wallMaterial;

        return [wallMaterial, wallMaterial, ceilingMaterial, floorMaterial, wallMaterial, wallMaterial];
    }

    /**
     * Adds a rendering zone to this room between two points
     * @param {THREE.Vector3} fromPoint - Starting point of the zone
     * @param {THREE.Vector3} toPoint - Ending point of the zone
     * @param {string} openingDirection - Direction the opening faces ('north', 'south', 'east', 'west')
     * @param {THREE.Vector3} openingCenter - Center point of the corresponding opening
     */
    addRenderingZone(fromPoint, toPoint, openingDirection, openingCenter) {
        const zone = new RenderingZone(fromPoint, toPoint, openingDirection, openingCenter);
        this.renderingZones.push(zone);

        // Attach reference to the room
        zone.parentRoom = this;

        // Add debug visualization to the scene if desired
        if (zone.debugMesh) {
            this.scene.add(zone.debugMesh);
        }

        return zone;
    }

    /**
     * Checks all rendering zones for player collision with enter/exit detection
     * @param {THREE.Vector3} playerPosition - Current player position
     * @returns {Array} - Array of triggered zones
     */
    checkRenderingZones(playerPosition) {
        const triggeredZones = [];

        this.renderingZones.forEach(zone => {
            const isInZone = zone.containsPoint(playerPosition);

            if (isInZone && !zone.hasTriggered) {
                // Player entered zone
                zone.trigger();
                triggeredZones.push(zone);
                console.log('Player entered rendering zone');
            } else if (!isInZone && zone.hasTriggered) {
                // Player left zone - reset it
                zone.reset();
                console.log('Player left rendering zone');
            }
        });

        return triggeredZones;
    }

    /**
     * Gets all rendering zones
     * @returns {Array} - Array of all rendering zones
     */
    getRenderingZones() {
        return this.renderingZones;
    }

    /**
     * Resets all rendering zones in this room
     */
    resetRenderingZones() {
        this.renderingZones.forEach(zone => zone.reset());
    }

    /**
     * Shows/hides debug visualization for all zones
     * @param {boolean} visible - Whether to show debug meshes
     */
    setZoneDebugVisibility(visible) {
        this.renderingZones.forEach(zone => {
            if (zone.debugMesh) {
                zone.debugMesh.visible = visible;
            }
        });
    }
}