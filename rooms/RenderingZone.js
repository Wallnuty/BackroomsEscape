import * as THREE from 'three';

export class RenderingZone {
    constructor(fromPoint, toPoint, openingDirection, openingCenter) {
        // Calculate position as center point between from and to
        this.position = new THREE.Vector3().addVectors(fromPoint, toPoint).multiplyScalar(0.5);
        this.position.y = 0; // Force to floor level

        // Calculate size based on the rectangle formed by the two points
        const diff = toPoint.clone().sub(fromPoint);
        this.size = new THREE.Vector3(Math.abs(diff.x), 1, Math.abs(diff.z));

        this.openingDirection = openingDirection;
        this.openingCenter = openingCenter.clone(); // Store the center of the corresponding opening
        this.isActive = true;
        this.hasTriggered = false;
        this.playerInZone = false; // Track if player is currently in zone

        // Store the original points for reference
        this.fromPoint = fromPoint.clone();
        this.toPoint = toPoint.clone();

        // Create a 2D bounding box for collision detection
        this.updateBoundingBox();

        // Optional: Create visual debug representation
        this.debugMesh = null;
        this.createDebugVisualization();
    }

    /**
     * Updates the 2D bounding box based on the two points
     */
    updateBoundingBox() {
        // Use the actual points to define the bounding box
        this.minX = Math.min(this.fromPoint.x, this.toPoint.x);
        this.maxX = Math.max(this.fromPoint.x, this.toPoint.x);
        this.minZ = Math.min(this.fromPoint.z, this.toPoint.z);
        this.maxZ = Math.max(this.fromPoint.z, this.toPoint.z);
    }

    /**
     * Checks if a point (player position) is inside this 2D zone
     * @param {THREE.Vector3} point - The point to check
     * @returns {boolean} - True if point is inside the zone (ignores Y)
     */
    containsPoint(point) {
        if (!this.isActive) return false;

        const isInside = point.x >= this.minX &&
            point.x <= this.maxX &&
            point.z >= this.minZ &&
            point.z <= this.maxZ;

        return isInside;
    }

    /**
     * Creates a flat plane debug visualization at floor level
     */
    createDebugVisualization(visible = false) {
        // Create a flat plane geometry based on the calculated size
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

}