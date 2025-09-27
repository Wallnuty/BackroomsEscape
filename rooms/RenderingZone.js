import * as THREE from 'three';

export class RenderingZone {
    constructor(position, size, openingDirection, roomToRender = null) {
        this.position = position.clone();
        this.size = size.clone(); // Vector3 for box dimensions
        this.openingDirection = openingDirection; // 'north', 'south', 'east', 'west'
        this.roomToRender = roomToRender; // Reference to room that should be rendered
        this.isActive = true;
        this.hasTriggered = false;

        // Create a bounding box for collision detection
        this.boundingBox = new THREE.Box3();
        this.updateBoundingBox();

        // Optional: Create visual debug representation
        this.debugMesh = null;
        this.createDebugVisualization();
    }

    /**
     * Updates the bounding box based on position and size
     */
    updateBoundingBox() {
        const halfSize = this.size.clone().multiplyScalar(0.5);
        this.boundingBox.setFromCenterAndSize(this.position, this.size);
    }

    /**
     * Checks if a point (player position) is inside this zone
     * @param {THREE.Vector3} point - The point to check
     * @returns {boolean} - True if point is inside the zone
     */
    containsPoint(point) {
        return this.isActive && this.boundingBox.containsPoint(point);
    }

    /**
     * Gets the world position where the new room should be rendered
     * based on the opening direction and zone position
     * @returns {THREE.Vector3} - World position for new room
     */
    getTargetRoomPosition() {
        const offset = new THREE.Vector3();
        const roomSize = 30; // Assuming standard room size, this could be parameterized

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
     * Creates a debug visualization of the zone (optional)
     */
    createDebugVisualization(visible = false) {
        const geometry = new THREE.BoxGeometry(this.size.x, this.size.y, this.size.z);
        const material = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.3,
            wireframe: true
        });

        this.debugMesh = new THREE.Mesh(geometry, material);
        this.debugMesh.position.copy(this.position);
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