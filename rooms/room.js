import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export function createRoom(width = 10, height = 5, depth = 10, options = {}) {
    const roomGroup = new THREE.Group();

    // Load texture for the walls
    const textureLoader = new THREE.TextureLoader();
    const wallTexture = textureLoader.load('/textures/walls/backroomsTexture.png');
    wallTexture.encoding = THREE.sRGBEncoding;
    wallTexture.wrapS = wallTexture.wrapT = THREE.RepeatWrapping;
    wallTexture.repeat.set(width / 4, height / 6);

    // Create two separate materials
    const wallMaterial = new THREE.MeshStandardMaterial({
        map: wallTexture,
        roughness: 0.9,
        metalness: 0,
        side: THREE.BackSide
    });

    const floorCeilingMaterial = new THREE.MeshStandardMaterial({
        color: 0xFDF38D,
        roughness: 1,
        metalness: 0,
        side: THREE.BackSide
    });

    // Create an array of materials for the box faces
    // Order: [right, left, top, bottom, front, back]
    const materials = [
        wallMaterial,         // right side (+x)
        wallMaterial,         // left side (-x)
        floorCeilingMaterial, // top side (+y)
        floorCeilingMaterial, // bottom side (-y)
        wallMaterial,         // front side (+z)
        wallMaterial          // back side (-z)
    ];

    // Room geometry (walls, floor, ceiling)
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const roomMesh = new THREE.Mesh(geometry, materials); // Use the array of materials
    roomGroup.add(roomMesh);

    // Optional: lights
    if (options.showLights !== false) { // eg createRoom(10, 5, 10, { showLights: false });
        // --- FIX: Increase Light Intensity ---
        const ambient = new THREE.AmbientLight(0xffffff, 0.6); // Increased from 0.3
        roomGroup.add(ambient);
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.0); // Increased from 0.8
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

    // Add physics colliders if world is provided
    if (options.world) {
        addRoomColliders(options.world, width, height, depth);
    }

    return roomGroup;
}

// Create physics colliders for the room
function addRoomColliders(world, width, height, depth) {
    // Floor
    const groundBody = new CANNON.Body({ mass: 0 });
    groundBody.addShape(new CANNON.Plane());
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    groundBody.position.y = -height / 2; // Position floor correctly
    world.addBody(groundBody);

    // Ceiling
    const ceilingBody = new CANNON.Body({ mass: 0 });
    ceilingBody.addShape(new CANNON.Plane());
    ceilingBody.quaternion.setFromEuler(Math.PI / 2, 0, 0);
    ceilingBody.position.y = height / 2;
    world.addBody(ceilingBody);

    // Walls
    const halfW = width / 2;
    const halfD = depth / 2;

    // North wall (Z+)
    const northWall = new CANNON.Body({ mass: 0 });
    northWall.addShape(new CANNON.Plane());
    northWall.quaternion.setFromEuler(0, Math.PI, 0);
    northWall.position.z = halfD;
    world.addBody(northWall);

    // South wall (Z-)
    const southWall = new CANNON.Body({ mass: 0 });
    southWall.addShape(new CANNON.Plane());
    southWall.position.z = -halfD;
    world.addBody(southWall);

    // East wall (X+)
    const eastWall = new CANNON.Body({ mass: 0 });
    eastWall.addShape(new CANNON.Plane());
    eastWall.quaternion.setFromEuler(0, -Math.PI / 2, 0);
    eastWall.position.x = halfW;
    world.addBody(eastWall);

    // West wall (X-)
    const westWall = new CANNON.Body({ mass: 0 });
    westWall.addShape(new CANNON.Plane());
    westWall.quaternion.setFromEuler(0, Math.PI / 2, 0);
    westWall.position.x = -halfW;
    world.addBody(westWall);
}
