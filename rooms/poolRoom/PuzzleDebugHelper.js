import * as THREE from 'three';

export class PuzzleDebugHelper {
    constructor(scene) {
        this.scene = scene;
        this.debugObjects = [];
        this.createDebugMarkers();
    }

    createDebugMarkers() {
        // Mark sensor positions
        const sensorPositions = [
            new THREE.Vector3(-20, 1.5, -1),  // Purple sensor
            new THREE.Vector3(20, 1.5, -1),   // Red sensor
            new THREE.Vector3(0, 1.5, 19),    // Final sensor
            new THREE.Vector3(0, 1.5, -15)    // Demo sensor
        ];

        // Mark door positions
        const doorPositions = [
            new THREE.Vector3(-20, 2.5, 0),   // Purple door
            new THREE.Vector3(20, 2.5, 0),    // Red door
            new THREE.Vector3(0, 2.5, 20)     // Final door
        ];

        // Create sensor markers (red spheres)
        sensorPositions.forEach((pos, index) => {
            const geometry = new THREE.SphereGeometry(0.5, 16, 16);
            const material = new THREE.MeshBasicMaterial({ 
                color: 0xff0000,
                transparent: true,
                opacity: 0.7
            });
            const marker = new THREE.Mesh(geometry, material);
            marker.position.copy(pos);
            marker.name = `sensor_debug_${index}`;
            this.scene.add(marker);
            this.debugObjects.push(marker);
        });

        // Create door markers (blue boxes)
        doorPositions.forEach((pos, index) => {
            const geometry = new THREE.BoxGeometry(2, 4, 0.5);
            const material = new THREE.MeshBasicMaterial({ 
                color: 0x0000ff,
                transparent: true,
                opacity: 0.5,
                wireframe: true
            });
            const marker = new THREE.Mesh(geometry, material);
            marker.position.copy(pos);
            marker.name = `door_debug_${index}`;
            this.scene.add(marker);
            this.debugObjects.push(marker);
        });

        console.log("Debug markers created. Sensors: Red spheres, Doors: Blue boxes");
    }

    cleanup() {
        this.debugObjects.forEach(obj => {
            this.scene.remove(obj);
            obj.geometry.dispose();
            obj.material.dispose();
        });
        this.debugObjects = [];
    }
}