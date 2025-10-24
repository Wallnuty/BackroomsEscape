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
            [new THREE.Vector3(15 - offset, 0, -1), new THREE.Vector3(15 - offset, 0, 11), 0.4],
            [new THREE.Vector3(15 - offset, 0, -5), new THREE.Vector3(15 - offset, 0, -10), 0.4],
            [new THREE.Vector3(-2, 0, 2), new THREE.Vector3(-2, 0, 0.5), 1.5],
            [new THREE.Vector3(10, 0, 5), new THREE.Vector3(12, 0, 5), 0.4]
        ],
        // lights entries: [x, z] or [x, z, flickerFlag]
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
        ],
        models: [
            {
                path: '/models/whiteboard.glb',
                position: new THREE.Vector3(3, -0.70, 14),
                scale: new THREE.Vector3(1, 1, 1),
                rotation: new THREE.Vector3(0, - Math.PI / 2, 0),
                interactionDistance: 4
            },
            {
                path: '/models/note.glb',
                position: new THREE.Vector3(9.65, -0.20, 12),
                scale: new THREE.Vector3(10, 10, 10),
                rotation: new THREE.Vector3(Math.PI / 2, 0, Math.PI / 2),
                interactable: false
            }
        ]
    }, secondary: {
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
        ],
        // Add the 8-ball model to the secondary room
        models: [
            {
                path: '/models/eight_ball.glb',
                position: new THREE.Vector3(0, -2.25, 5),
                scale: new THREE.Vector3(0.12, 0.12, 0.12),
                rotation: new THREE.Vector3(Math.PI / 4, 0, 0),
                // make the 8-ball non-interactable
                interactable: false
            }
        ]
    }, third: {
        position: new THREE.Vector3(-16, 0, 16),
        width: 40,
        height: 5,
        depth: 16,
        walls: [
            [new THREE.Vector3(20, 0, 8), new THREE.Vector3(-20, 0, 8), 0.4],
            [new THREE.Vector3(20, 0, 8), new THREE.Vector3(20, 0, -8), 0.4],
            [new THREE.Vector3(-20, 0, 8), new THREE.Vector3(-20, 0, -8), 0.4],
            [new THREE.Vector3(16, 0, -8 + offset), new THREE.Vector3(-15, 0, -8 + offset), 0.4],
            [new THREE.Vector3(-19, 0, -8 + offset), new THREE.Vector3(-20, 0, -8 + offset), 0.4],


            [new THREE.Vector3(-5, 0, 8), new THREE.Vector3(-5, 0, 3), 0.4],
            [new THREE.Vector3(-5, 0, -3), new THREE.Vector3(-5, 0, -8), 0.4],

            [new THREE.Vector3(5, 0, 8), new THREE.Vector3(5, 0, 3), 0.4],
            [new THREE.Vector3(5, 0, -3), new THREE.Vector3(5, 0, -8), 0.4],

            [new THREE.Vector3(-15, 0, 8), new THREE.Vector3(-15, 0, 2), 0.4],
            [new THREE.Vector3(-15, 0, -2), new THREE.Vector3(-15, 0, -8), 0.4],

            [new THREE.Vector3(16, 0, 4), new THREE.Vector3(16, 0, -8), 0.4],

            // pillar
            [new THREE.Vector3(10.75, 0, 4), new THREE.Vector3(9.25, 0, 4), 1.5]
        ],
        // middle light ([-1,1]) is set to flicker (third element true)
        lights: [
            [9, 1],
            [-1, 1, true],
            [-11, 1]
        ],
        zones: [
            [
                new THREE.Vector3(20, 0, 8),
                new THREE.Vector3(15, 0, -8),
                'south',
                new THREE.Vector3(18, 0, -8)
            ],
            [
                new THREE.Vector3(-9, 0, 8),
                new THREE.Vector3(-20, 0, -8),
                'south',
                new THREE.Vector3(-17, 0, -8)
            ]
        ],
        // Add the chair model to the third room
        models: [
            {
                path: '/models/7chair.glb',
                position: new THREE.Vector3(10, -1.25, 2.5),
                scale: new THREE.Vector3(0.6, 0.6, 0.6),
                rotation: new THREE.Vector3(0, -Math.PI, 0),
                // make the chair non-interactable
                interactable: false
            }
        ],
    }, exit: {
        position: new THREE.Vector3(-16, 0, 16),
        width: 10,
        height: 5,
        depth: 10,
        walls: [
            [new THREE.Vector3(5, 0, -5), new THREE.Vector3(5, 0, 5), 0.4],
            [new THREE.Vector3(-5, 0, -5), new THREE.Vector3(-5, 0, 5), 0.4],
            [new THREE.Vector3(-5, 0, 5), new THREE.Vector3(5, 0, 5), 0.4],
            [new THREE.Vector3(-5, 0, -5), new THREE.Vector3(-2, 0, -5), 0.4],
            [new THREE.Vector3(2, 0, -5), new THREE.Vector3(5, 0, -5), 0.4],
        ],
        lights: [
            [0, 0]
        ],
        zones: [
            [
                new THREE.Vector3(-5, 0, -5),
                new THREE.Vector3(5, 0, -4),
                'south',
                new THREE.Vector3(0, 0, -5)
            ]
        ],
        // Add ballpit configuration
        models: [
            {
                path: '/models/redSlide.glb',
                position: new THREE.Vector3(1, 0, 3),
                scale: new THREE.Vector3(1.5, 1.5, 1.5),
                rotation: new THREE.Vector3(0, 0, 0)
            }
        ]
    }, fourth: {
        position: new THREE.Vector3(0, 0, 0),
        width: 34,
        height: 5,
        depth: 20,
        walls: [
            // Outer walls
            [new THREE.Vector3(-5, 0, 10), new THREE.Vector3(17, 0, 10), 0.4], // top
            [new THREE.Vector3(-9, 0, 10), new THREE.Vector3(-17, 0, 10), 0.4], // top
            [new THREE.Vector3(-17, 0, -10), new THREE.Vector3(-17, 0, 10), 0.4], // right
            [new THREE.Vector3(-17, 0, -10), new THREE.Vector3(-4, 0, -10), 0.4], // bottom
            [new THREE.Vector3(17, 0, -10), new THREE.Vector3(0, 0, -10), 0.4], // bottom
            [new THREE.Vector3(17, 0, 10), new THREE.Vector3(17, 0, 0), 0.4], // left
            [new THREE.Vector3(17, 0, -10), new THREE.Vector3(17, 0, -4), 0.4], // left

            [new THREE.Vector3(17, 0, 0), new THREE.Vector3(7, 0, 0), 0.4],
            [new THREE.Vector3(7, 0, -8), new THREE.Vector3(7, 0, 0), 0.4],

            [new THREE.Vector3(0, 0, -6), new THREE.Vector3(0, 0, -10), 0.4],
            [new THREE.Vector3(0, 0, -6), new THREE.Vector3(-12, 0, -6), 0.4],

            [new THREE.Vector3(0, 0, 2), new THREE.Vector3(-17, 0, 2), 0.4],
            [new THREE.Vector3(-3, 0, 17), new THREE.Vector3(-3, 0, 16), 0.4],
            [new THREE.Vector3(-3, 0, 12), new THREE.Vector3(-3, 0, 13), 0.4],

            [new THREE.Vector3(3, 0, 5), new THREE.Vector3(3, 0, 5.4), 0.4] // pillar
        ],
        lights: [
            [10, 5],
            [-10, -1],
        ],
        zones: [
            [
                new THREE.Vector3(-17, 0, 10),
                new THREE.Vector3(5, 0, 4),
                'north',
                new THREE.Vector3(-7, 0, 10)
            ],
            [
                new THREE.Vector3(17, 0, 0),
                new THREE.Vector3(0, 0, -10),
                'west',
                new THREE.Vector3(17, 0, -2)
            ],
            [
                new THREE.Vector3(0, 0, -5),
                new THREE.Vector3(-17, 0, -10),
                'south',
                new THREE.Vector3(-2, 0, -10)
            ]
        ]
    }
};