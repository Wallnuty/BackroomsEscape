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

    // --- FIX: Load ceiling texture ---
    const ceilingTexture = textureLoader.load('/textures/ceiling/backroomsTiles.webp'); // Placeholder path
    ceilingTexture.wrapS = ceilingTexture.wrapT = THREE.RepeatWrapping;
    ceilingTexture.repeat.set(width / 2, depth / 2);


    // Create two separate materials
    const wallMaterial = new THREE.MeshStandardMaterial({
        color: 0xFFFFCC,
        map: wallTexture,
        roughness: 0.9,
        side: THREE.BackSide
    });

    const floorMaterial = new THREE.MeshStandardMaterial({
        color: 0xFDF38D,
        roughness: 1,
        side: THREE.BackSide
    });

    const ceilingMaterial = new THREE.MeshStandardMaterial({
        color: 0xFFFFCC,
        map: ceilingTexture,
        roughness: 0.8,
        side: THREE.BackSide
    });

    // Create an array of materials for the box faces
    // Order: [right, left, top, bottom, front, back]
    const materials = [
        wallMaterial,         // right side (+x)
        wallMaterial,         // left side (-x)
        ceilingMaterial,      // top side (+y)
        floorMaterial,        // bottom side (-y)
        wallMaterial,         // front side (+z)
        wallMaterial          // back side (-z)
    ];

    // Room geometry (walls, floor, ceiling)
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const roomMesh = new THREE.Mesh(geometry, materials); // Use the array of materials
    roomMesh.receiveShadow = true; // The room interior should receive shadows
    roomGroup.add(roomMesh);

    // --- ADD: Emissive ceiling lights ---
    const lightPanelGeometry = new THREE.PlaneGeometry(2, 2); // 2x2 meter light panels
    const lightPanelMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xffffff, // Make it glow
        emissiveIntensity: 1.5,
        side: THREE.DoubleSide
    });

    // Function to create a light panel and add it to the group
    function addLightPanel(x, z) {
        const lightPanel = new THREE.Mesh(lightPanelGeometry, lightPanelMaterial);
        lightPanel.position.set(x, height / 2 - 0.05, z); // Position just below the ceiling
        lightPanel.rotation.x = Math.PI / 2; // Rotate to be flat on the ceiling
        roomGroup.add(lightPanel);
    }

    // Add light panels in a pattern
    addLightPanel(0, 0);
    addLightPanel(10, 0);
    addLightPanel(0, 10);
    addLightPanel(-10, 0);
    addLightPanel(0, -10);
    addLightPanel(10, 10);
    addLightPanel(-10, -10);


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
