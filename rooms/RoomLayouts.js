import * as THREE from 'three';

let offset = 0.02;

// Each layout is an object with walls, lights, zones
export const RoomLayouts = {
    main: {
        position: new THREE.Vector3(-15, 0, 15),
        width: 30,
        height: 5,
        depth: 30,
        walls: [
            [new THREE.Vector3(10, 0, -15), new THREE.Vector3(-6, 0, -15), 0.4],
            [new THREE.Vector3(10, 0, -15), new THREE.Vector3(10, 0, -2), 0.4],
            [new THREE.Vector3(10, 0, 5), new THREE.Vector3(10, 0, 15), 0.4],
            [new THREE.Vector3(-6, 0, -15), new THREE.Vector3(-6, 0, -4), 0.4],
            [new THREE.Vector3(-6, 0, -4), new THREE.Vector3(-9, 0, -4), 0.4],
            [new THREE.Vector3(-9, 0, -4), new THREE.Vector3(-9, 0, 8), 0.4],
            [new THREE.Vector3(-9, 0, 8), new THREE.Vector3(-1, 0, 8), 0.4],
            [new THREE.Vector3(15, 0, 15), new THREE.Vector3(-1, 0, 15), 0.4],
            [new THREE.Vector3(15, 0, 2), new THREE.Vector3(5, 0, 2), 0.4],
            [new THREE.Vector3(5, 0, 2), new THREE.Vector3(5, 0, -5), 0.4],
            [new THREE.Vector3(-1, 0, 15), new THREE.Vector3(-1, 0, 8), 0.4],
            [new THREE.Vector3(15, 0, -8), new THREE.Vector3(10, 0, -8), 0.4],
            [new THREE.Vector3(15, 0, -1), new THREE.Vector3(15, 0, 11), 0.4],
            [new THREE.Vector3(15, 0, -5), new THREE.Vector3(15, 0, -10), 0.4],
            [new THREE.Vector3(-2, 0, 2), new THREE.Vector3(-2, 0, 0.5), 1.5],
            [new THREE.Vector3(10, 0, 5), new THREE.Vector3(12, 0, 5), 0.4]
        ],
        lights: [
            [10, 0],
            [-2, -6],
            [4, 10]
        ],
        zones: [
            [
                new THREE.Vector3(15, 0, 2),
                new THREE.Vector3(5, 0, -8),
                'west',
                new THREE.Vector3(15, 0, -3)
            ],
            [
                new THREE.Vector3(15, 0, 15),
                new THREE.Vector3(10, 0, 2),
                'west',
                new THREE.Vector3(15, 0, 13)
            ]
        ]
    },
    // Add more layouts here, e.g. secondary, corridor, office, etc.
    secondary: {
        position: new THREE.Vector3(-16, 0, 16),
        width: 24,
        height: 5,
        depth: 12,
        walls: [
            [new THREE.Vector3(12, 0, -6), new THREE.Vector3(-12, 0, -6), 0.4],
            [new THREE.Vector3(12, 0, 6), new THREE.Vector3(-12, 0, 6), 0.4],
            [new THREE.Vector3(12 - offset, 0, -6), new THREE.Vector3(12 - offset, 0, 2), 0.4], // Add offset to avoid walls overlapping
            [new THREE.Vector3(-12 + offset, 0, -6), new THREE.Vector3(-12 + offset, 0, 2), 0.4],
            [new THREE.Vector3(-12, 0, 2), new THREE.Vector3(-9.5, 0, 2), 0.4],
            [new THREE.Vector3(3, 0, 6), new THREE.Vector3(3, 0, -2), 0.4],
            [new THREE.Vector3(3, 0, -2), new THREE.Vector3(7, 0, -2), 0.4],
            [new THREE.Vector3(-2, 0, 6), new THREE.Vector3(-2, 0, 4), 0.4],
            [new THREE.Vector3(-7, 0, 6), new THREE.Vector3(-7, 0, -2), 0.4]
        ],
        lights: [
            [9, -1],
            [-5, -1]
        ],
        zones: [
            [
                new THREE.Vector3(12, 0, 6),
                new THREE.Vector3(3, 0, -6),
                'west',
                new THREE.Vector3(12, 0, 4)
            ],
            [
                new THREE.Vector3(-7, 0, 6),
                new THREE.Vector3(-12, 0, -6),
                'east',
                new THREE.Vector3(-12, 0, 4)
            ]
        ]
    }
};