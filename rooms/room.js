import * as THREE from 'three';

export function createRoom(width = 10, height = 5, depth = 10, options = {}) {
    const roomGroup = new THREE.Group();

    // Room geometry (walls, floor, ceiling)
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshStandardMaterial({
        color: options.color || 0xffffff,
        roughness: 1,
        metalness: 0,
        side: THREE.BackSide // render inside faces
    });
    const roomMesh = new THREE.Mesh(geometry, material);
    roomGroup.add(roomMesh);

    // Optional: lights
    if (options.showLights !== false) { // eg createRoom(10, 5, 10, { showLights: false });
        const ambient = new THREE.AmbientLight(0xffffff, 0.3);
        roomGroup.add(ambient);
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(5, 10, 5);
        roomGroup.add(dirLight);
    }

    // Optional: edges for corners
    if (options.showEdges !== false) {
        const edges = new THREE.LineSegments(
            new THREE.EdgesGeometry(geometry),
            new THREE.LineBasicMaterial({ color: options.edgeColor || 0x333333, depthTest: false })
        );
        roomGroup.add(edges);
    }

    // Optional: floor grid for scale/orientation
    if (options.showGrid !== false) {
        const grid = new THREE.GridHelper(width, 10, 0x444444, 0x222222);
        grid.position.y = -height / 2;
        roomGroup.add(grid);
    }

    return roomGroup;
}
