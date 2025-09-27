import * as THREE from 'three';

export class RenderingZone {
    constructor(position, size, openingDirection, roomToRender = null) {
        this.position = position.clone();
        this.position.y = 0; // Force to floor level
        this.size = size.clone(); // Still Vector3, but we'll only use x and z
        this.openingDirection = openingDirection;
        this.roomToRender = roomToRender;
        this.isActive = true;
        this.hasTriggered = false;

        // Create a 2D bounding box for collision detection
        this.updateBoundingBox();

        // Optional: Create visual debug representation
        this.debugMesh = null;
        this.createDebugVisualization();
    }

    /**
     * Updates the 2D bounding box based on position and size (only x and z)
     */
    updateBoundingBox() {
        const halfSizeX = this.size.x * 0.5;
        const halfSizeZ = this.size.z * 0.5;

        this.minX = this.position.x - halfSizeX;
        this.maxX = this.position.x + halfSizeX;
        this.minZ = this.position.z - halfSizeZ;
        this.maxZ = this.position.z + halfSizeZ;
    }

    /**
     * Checks if a point (player position) is inside this 2D zone
     * @param {THREE.Vector3} point - The point to check
     * @returns {boolean} - True if point is inside the zone (ignores Y)
     */
    containsPoint(point) {
        if (!this.isActive) return false;

        return point.x >= this.minX &&
            point.x <= this.maxX &&
            point.z >= this.minZ &&
            point.z <= this.maxZ;
    }

    /**
     * Gets the world position where the new room should be rendered
     */
    getTargetRoomPosition() {
        const offset = new THREE.Vector3();
        const roomSize = 30;

        switch (this.openingDirection) {
            case 'north':
                offset.set(0, 0, roomSize);
                break;
            case 'south':
                offset.set(0, 0, -roomSize);
                break;
            case 'east':
                offset.set(roomSize, 0, 0);
                break;
            case 'west':
                offset.set(-roomSize, 0, 0);
                break;
            default:
                console.warn(`Unknown opening direction: ${this.openingDirection}`);
        }

        return this.position.clone().add(offset);
    }

    /**
     * Creates a flat plane debug visualization at floor level
     */
    createDebugVisualization(visible = false) {
        // Create a flat plane geometry instead of a box
        const geometry = new THREE.PlaneGeometry(this.size.x, this.size.z);
        const material = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide
        });

        this.debugMesh = new THREE.Mesh(geometry, material);
        this.debugMesh.position.copy(this.position);
        this.debugMesh.position.y = -2; // Slightly above floor to avoid z-fighting
        this.debugMesh.rotation.x = -Math.PI / 2; // Rotate to lay flat on floor
        this.debugMesh.visible = visible;
    }

    /**
     * Triggers the zone (marks as triggered)
     */
    trigger() {
        this.hasTriggered = true;
    }

    /**
     * Resets the zone trigger state
     */
    reset() {
        this.hasTriggered = false;
    }

    /**
     * Deactivates the zone
     */
    deactivate() {
        this.isActive = false;
    }

    /**
     * Activates the zone
     */
    activate() {
        this.isActive = true;
    }
}