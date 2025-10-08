import * as THREE from 'three';

export const PlaygroundLayout = {
    position: new THREE.Vector3(0, 0, 0),
    width: 40,
    height: 8,
    depth: 40
};

// helper constants
const halfW = PlaygroundLayout.width / 2;
const halfD = PlaygroundLayout.depth / 2;

PlaygroundLayout.walls = [
    [new THREE.Vector3(-halfW, 0, -halfD), new THREE.Vector3(halfW, 0, -halfD), 0.4],
    [new THREE.Vector3(halfW, 0, -halfD), new THREE.Vector3(halfW, 0, halfD), 0.4],
    [new THREE.Vector3(halfW, 0, halfD), new THREE.Vector3(-halfW, 0, halfD), 0.4],
    [new THREE.Vector3(-halfW, 0, halfD), new THREE.Vector3(-halfW, 0, -halfD), 0.4]
];

PlaygroundLayout.lights = [
    [16, 16],
    [16, -16],
    [-16,16],
    [-16, -16]
];

PlaygroundLayout.zones = [
    [
        new THREE.Vector3(halfW, 0, halfD),
        new THREE.Vector3(-halfW, 0, -halfD),
        'north',
        new THREE.Vector3(0, 0, halfD)
    ]
];

PlaygroundLayout.models = [
    {
        path: '/models/old_playground_slide.glb',
        position: new THREE.Vector3(14, -4, 14),
        scale: new THREE.Vector3(1, 1, 1),
        rotation: new THREE.Vector3(0, Math.PI / 4, 0)
    },
    {
        path: '/models/swing_set.glb',
        position: new THREE.Vector3(-11, -4, -12),
        scale: new THREE.Vector3(0.004, 0.004, 0.006),
        rotation: new THREE.Vector3(0, 0, 0)
    },
    {
        path: '/models/old_roundabout_merry_go_round.glb',
        position: new THREE.Vector3(14, -4, -14),
        scale: new THREE.Vector3(3, 3, 3),
        rotation: new THREE.Vector3(0, 0, 0)
    }
];
