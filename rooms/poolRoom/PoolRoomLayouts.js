import * as THREE from 'three';

export const PoolRoomLayouts = {
    poolroom: {
        position: new THREE.Vector3(0, 0, 0),
        width: 60,
        height: 10,
        depth: 40,
        walls: [
            // Outer boundary walls - make sure they form a proper room
            [new THREE.Vector3(-30, 0, -20), new THREE.Vector3(30, 0, -20), 0.4],  // South wall
            [new THREE.Vector3(30, 0, -20), new THREE.Vector3(30, 0, 20), 0.4],    // East wall
            [new THREE.Vector3(30, 0, 20), new THREE.Vector3(-30, 0, 20), 0.4],    // North wall
            [new THREE.Vector3(-30, 0, 20), new THREE.Vector3(-30, 0, -20), 0.4],  // West wall
            
            // Puzzle room walls - create actual rooms
            // Left side room (purple door)
            [new THREE.Vector3(-25, 0, -15), new THREE.Vector3(-25, 0, 15), 0.4],  // Left inner wall
            [new THREE.Vector3(-25, 0, 15), new THREE.Vector3(-15, 0, 15), 0.4],   // Back wall left room
            [new THREE.Vector3(-25, 0, -15), new THREE.Vector3(-15, 0, -15), 0.4], // Front wall left room
            
            // Right side room (red door)
            [new THREE.Vector3(15, 0, -15), new THREE.Vector3(25, 0, -15), 0.4],   // Front wall right room
            [new THREE.Vector3(15, 0, 15), new THREE.Vector3(25, 0, 15), 0.4],     // Back wall right room
            [new THREE.Vector3(25, 0, -15), new THREE.Vector3(25, 0, 15), 0.4],    // Right inner wall
            
            // Door openings (thin walls to create door frames)
            [new THREE.Vector3(-25, 0, -2), new THREE.Vector3(-25, 0, -5), 0.2],   // Left door frame bottom
            [new THREE.Vector3(-25, 0, 5), new THREE.Vector3(-25, 0, 2), 0.2],     // Left door frame top
            
            [new THREE.Vector3(25, 0, -2), new THREE.Vector3(25, 0, -5), 0.2],     // Right door frame bottom
            [new THREE.Vector3(25, 0, 5), new THREE.Vector3(25, 0, 2), 0.2],       // Right door frame top
            
            // Final exit wall with opening
            [new THREE.Vector3(-10, 0, 20), new THREE.Vector3(-15, 0, 20), 0.4],   // Final wall left
            [new THREE.Vector3(10, 0, 20), new THREE.Vector3(15, 0, 20), 0.4],     // Final wall right
        ],
        lights: [
            [0, 0],        // Center
            [-20, -10],    // Left area
            [20, -10],     // Right area
            [-20, 10],     // Back left
            [20, 10],      // Back right
            [0, -15]       // Front center (demo area)
        ],
        zones: [
            // Main area zones
            [
                new THREE.Vector3(-5, 0, -20),
                new THREE.Vector3(5, 10, -21),
                'south',
                new THREE.Vector3(0, 5, -20.5)
            ]
        ],
        models: []
    }
};