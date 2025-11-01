import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { PoolRoom } from './PoolRoom.js';
import { PoolRoomLayouts } from './PoolRoomLayouts.js';
import { PickupLightsManager } from '../../puzzles/lights.js';
import { ModelInteractionManager } from '../../puzzles/modelInteraction.js';
import { ColorPuzzleManager } from './ColorPuzzleManager.js';

export class PoolRoomManager {
    constructor(scene, world, camera) {
        this.scene = scene;
        this.world = world;
        this.rooms = [];

        // Pool room specific lighting
        this._createPoolRoomLighting();
        this._createGlobalFloorAndCeiling();

        // Create managers
        this.lightsManager = new PickupLightsManager(scene, camera);
        this.modelInteractionManager = new ModelInteractionManager(scene, camera);

        // Connect the managers
        this.modelInteractionManager.setPickupLightsManager(this.lightsManager);

        // Start with the poolroom
        this.currentLayoutName = 'poolroom';
        this.createPoolRoom(PoolRoomLayouts.poolroom, this.currentLayoutName);

        // Initialize color puzzle system
        this.colorPuzzleManager = new ColorPuzzleManager(this.scene, this.lightsManager, this.world);

        // DEBUG: Add debug helper


        this.lastZone = null;
        this.pendingRoomUpdate = null;
        this.currentRoom = this.rooms[0];
        this.renderZonesDisabled = false;

        // Setup puzzle-specific lights

        console.log("PoolRoomManager initialized with puzzle system");
    }

    _createPoolRoomLighting() {
        // Clear any existing ambient light
        this.scene.children.forEach(child => {
            if (child.isAmbientLight) {
                this.scene.remove(child);
            }
        });

        // Pool room specific ambient light (blueish tone)
        const ambient = new THREE.AmbientLight(0x4a7c94, 0.4);
        this.scene.add(ambient);

        // Add some directional light for better visibility
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
        directionalLight.position.set(10, 15, 10);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);
    }

_createRoomFloor(room, walls) {
    if (!walls || walls.length === 0) return;

    // Use materials from the room
    const { floor } = room._createMaterials(); 

    // Compute bounds from wall positions
    let minX = Infinity, maxX = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    walls.forEach(([from, to]) => {
        minX = Math.min(minX, from.x, to.x);
        maxX = Math.max(maxX, from.x, to.x);
        minZ = Math.min(minZ, from.z, to.z);
        maxZ = Math.max(maxZ, from.z, to.z);
    });

    const width = maxX - minX;
    const depth = maxZ - minZ;

    // Floor mesh
    const geometry = new THREE.BoxGeometry(width, 0.1, depth);
    const mesh = new THREE.Mesh(geometry, floor);
    mesh.position.set((minX + maxX)/2, -5, (minZ + maxZ)/2);
    room.group.add(mesh);

    // Physics floor
    const body = new CANNON.Body({
        mass: 0,
        shape: new CANNON.Box(new CANNON.Vec3(width/2, 0.05, depth/2))
    });
    body.position.set((minX + maxX)/2, -5, (minZ + maxZ)/2);
    this.world.addBody(body);

    if (!room.bodies) room.bodies = [];
    room.bodies.push(body);
}


// Ceiling
_createRoomCeiling(room, walls) {
    if (!walls || walls.length === 0) return;

    const { ceiling } = room._createMaterials(); 
    
    // Create transparent material
    const transparentMaterial = new THREE.MeshLambertMaterial({
        color: ceiling.color,
        transparent: true,
        opacity: 0.3
    });

    let minX = Infinity, maxX = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    walls.forEach(([from, to]) => {
        minX = Math.min(minX, from.x, to.x);
        maxX = Math.max(maxX, from.x, to.x);
        minZ = Math.min(minZ, from.z, to.z);
        maxZ = Math.max(maxZ, from.z, to.z);
    });

    const width = maxX - minX;
    const depth = maxZ - minZ;

    const geometry = new THREE.BoxGeometry(width, 0.1, depth);
    
    // Assign materials to specific faces
    const materials = [
        transparentMaterial, // right - won't be visible
        ceiling,            // left - won't be visible  
        transparentMaterial, // top - TRANSPARENT
        ceiling,            // bottom - OPAQUE
        transparentMaterial, // front - won't be visible
        transparentMaterial  // back - won't be visible
    ];
    
    const mesh = new THREE.Mesh(geometry, materials);
    mesh.position.set((minX + maxX)/2, 5.1, (minZ + maxZ)/2);
    room.group.add(mesh);

    // Physics ceiling (optional)
    const body = new CANNON.Body({
        mass: 0,
        shape: new CANNON.Box(new CANNON.Vec3(width/2, 0.05, depth/2))
    });
    body.position.set((minX + maxX)/2, 5.1, (minZ + maxZ)/2);
    this.world.addBody(body);

    room.bodies.push(body);
}


    _createGlobalFloorAndCeiling() {
        // Pool room floor
        const groundBody = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
        groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
        groundBody.position.y = -2.5;
        this.world.addBody(groundBody);

        // Higher ceiling for pool room
        const ceilingBody = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
        ceilingBody.quaternion.setFromEuler(Math.PI / 2, 0, 0);
        ceilingBody.position.y = 7.5;
        this.world.addBody(ceilingBody);
    }

    createPoolRoom(layout, layoutName = null) {
        const {
            position,
            width = 40,
            height = 10,
            depth = 40,
            walls = [],
            lights = [],
            zones = [],
            models = []
        } = layout;

        const room = new PoolRoom(this.scene, this.world, width, height, depth, position);

        // Override wall materials for pool room look

        walls.forEach(([from, to, thickness]) => {
            room.addWall(from, to, thickness);
        });
        
        this._createRoomFloor(room, walls);
        this._createRoomCeiling(room, walls);

        lights.forEach(([x, z]) => {
            room.addLightPanel(x, z);
        });

        zones.forEach(([from, to, direction, center]) => {
            room.addRenderingZone(
                from.clone().add(position),
                to.clone().add(position),
                direction,
                center.clone().add(position)
            );
        });

        // Load pool room specific models
        if (models.length > 0) {
            this.loadModelsForRoom(room, models);
        }

        room.setZoneDebugVisibility(false);
        room.layoutName = layoutName;
        this.rooms.push(room);

        return room;
    }

    setupPuzzleLights() {
        // Initial light setup for the puzzle
        const pickupLightPositions = [
            // Red light in main area, positioned to point at demo sensor
            { 
                position: new THREE.Vector3(2, 1, -12), 
                color: 0xff0000,
                name: 'red_light_main'
            },
            // Blue light will spawn in red room after puzzle solved
            // Green light will spawn in purple room after puzzle solved
        ];

        // Initialize only the starting red light
        this.lightsManager.initPickupLights([pickupLightPositions[0]]);

        // Position the red light to point toward the demo sensor
        const redLight = this.lightsManager.pickableRoots[0];
        if (redLight) {
            // Point the light toward the demo sensor at (0, 1.5, -15)
            const demoSensorPos = new THREE.Vector3(0, 1.5, -15);
            const lightPos = redLight.position.clone();
            const direction = new THREE.Vector3()
                .subVectors(demoSensorPos, lightPos)
                .normalize();
            
            // Set light rotation to point at sensor
            redLight.lookAt(demoSensorPos);
            
            console.log("Red light positioned to demonstrate purple requirement");
        }
    }

    spawnAdditionalLight(color, position) {
        const colorConfigs = {
            'blue': { color: 0x0000ff, name: 'blue_light' },
            'green': { color: 0x00ff00, name: 'green_light' }
        };

        const config = colorConfigs[color];
        if (config) {
            // Create new light using the existing light system
            const light = this.lightsManager.colorMixingManager.createPickupLight(config.color, {
                type: 'spot',
                intensity: 12,
                distance: 100
            });

            light.group.position.copy(position);
            light.group.name = config.name;

            this.scene.add(light.group);
            this.lightsManager.pickableRoots.push(light.group);
            this.lightsManager.colorMixingManager.addLight(light.group);

            console.log(`Spawned ${color} light at`, position);
            
            // Create spawn effect
            this.createLightSpawnEffect(position, config.color);
        }
    }

    createLightSpawnEffect(position, color) {
        const geometry = new THREE.SphereGeometry(0.5, 16, 16);
        const material = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.7
        });
        const sphere = new THREE.Mesh(geometry, material);
        sphere.position.copy(position);
        this.scene.add(sphere);

        // Animate the spawn effect
        const startTime = Date.now();
        const animateSpawn = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / 1000;

            if (progress < 1.5) {
                sphere.scale.setScalar(1 + Math.sin(progress * Math.PI) * 0.5);
                material.opacity = 0.7 * (1 - progress / 1.5);
                requestAnimationFrame(animateSpawn);
            } else {
                this.scene.remove(sphere);
                sphere.geometry.dispose();
                sphere.material.dispose();
            }
        };
        animateSpawn();
    }

    _applyPoolRoomMaterials(room) {
        // Override all materials in the room to use pool room style
        room.group.traverse((child) => {
            if (child.isMesh && child.material) {
                // Create pool room style material (blue-gray)
                child.material = new THREE.MeshStandardMaterial({
                    color: 0x6b8c9d,
                    roughness: 0.8,
                    metalness: 0.1,
                    transparent: false
                });
            }
        });
    }

    loadModelsForRoom(room, models) {
        const loader = new GLTFLoader();

        models.forEach((modelConfig, index) => {
            loader.load(
                modelConfig.path,
                (gltf) => {
                    const model = gltf.scene;
                    const modelGroup = new THREE.Group();
                    modelGroup.add(model);

                    modelGroup.scale.copy(modelConfig.scale);
                    modelGroup.rotation.set(
                        modelConfig.rotation.x,
                        modelConfig.rotation.y,
                        modelConfig.rotation.z
                    );

                    if (room.rotationY !== undefined) {
                        const rotatedPosition = this.rotatePoint(modelConfig.position, room.rotationY);
                        modelGroup.position.copy(rotatedPosition);
                        modelGroup.rotation.y += room.rotationY;
                    } else {
                        modelGroup.position.copy(modelConfig.position);
                    }

                    modelGroup.userData.isInteractableModel = true;
                    modelGroup.userData.modelConfig = modelConfig;
                    modelGroup.userData.modelPath = modelConfig.path;
                    modelGroup.name = `poolroom_model_${index}`;

                    room.group.add(modelGroup);
                    this.modelInteractionManager.addInteractableModel(modelGroup);

                    console.log(`Pool room model ${modelConfig.path} loaded`);
                },
                undefined,
                (error) => {
                    console.error(`Error loading pool room model ${modelConfig.path}:`, error);
                }
            );
        });
    }

    // Enhanced update method to handle puzzle logic
    update(playerPosition) {
        if (this.renderZonesDisabled) {
            return;
        }

        // Update zone system
        const { activeZone, activeRoom, triggeredZones } = this.scanAllZones(playerPosition);

        // Handle zone transitions
        if (this.lastZone && (!activeZone || activeZone !== this.lastZone)) {
            if (this.pendingRoomUpdate) {
                clearTimeout(this.pendingRoomUpdate);
                this.pendingRoomUpdate = null;
            }

            const scheduledLastZone = this.lastZone;
            const timeoutId = setTimeout(() => {
                if (this.pendingRoomUpdate !== timeoutId) return;

                if (scheduledLastZone && scheduledLastZone.parentRoom) {
                    const prevLayoutName = this.currentLayoutName;
                    this.currentRoom = scheduledLastZone.parentRoom;
                    this.currentLayoutName = this.currentRoom.layoutName;
                    console.log(`Current room type updated to: ${this.currentLayoutName}`);
                    this.manageRoomTransitions(prevLayoutName, this.currentLayoutName);
                }

                this.pendingRoomUpdate = null;
            }, 200);

            this.pendingRoomUpdate = timeoutId;
        }

        if (activeZone && activeZone !== this.lastZone && this.pendingRoomUpdate) {
            clearTimeout(this.pendingRoomUpdate);
            this.pendingRoomUpdate = null;
        }

        const triggersToHandle = (!this.lastZone && !this.renderZonesDisabled) ? triggeredZones : [];
        this.lastZone = activeZone;

        if (triggersToHandle.length > 0) {
            this.handleTriggeredZones(triggersToHandle);
        }

        // Update color puzzle system
        if (this.colorPuzzleManager) {
            this.colorPuzzleManager.update();
        }

        // Check for puzzle events and spawn lights accordingly
        this.handlePuzzleEvents();
    }

    handlePuzzleEvents() {
        // This method will handle spawning lights when doors open
        // For now, we'll spawn lights when sensors are solved
        // In a full implementation, this would be event-driven
    }

    onSensorSolved(sensorId) {
        switch(sensorId) {
            case 'red':
                // Spawn blue light in red room
                this.spawnAdditionalLight('blue', new THREE.Vector3(25, 1, 0));
                break;
            case 'purple':
                // Spawn green light in purple room
                this.spawnAdditionalLight('green', new THREE.Vector3(-25, 1, 0));
                break;
            case 'final':
                // Puzzle complete - could trigger level transition
                console.log("🎉 Pool Room Puzzle Complete! 🎉");
                break;
        }
    }

    // Keep existing utility methods
    scanAllZones(playerPosition) {
        let activeZone = null;
        let activeRoom = null;
        const triggeredZones = [];

        for (const room of this.rooms) {
            for (const zone of room.renderingZones) {
                const isInside = zone.containsPoint(playerPosition);

                if (!activeZone && isInside) {
                    activeZone = zone;
                    activeRoom = room;
                }

                if (isInside && !zone.hasTriggered) {
                    zone.hasTriggered = true;
                    triggeredZones.push(zone);
                } else if (!isInside && zone.hasTriggered) {
                    zone.hasTriggered = false;
                }
            }
        }

        return { activeZone, activeRoom, triggeredZones };
    }

    handleTriggeredZones(triggeredZones) {
        triggeredZones.forEach(zone => {
            console.log('Pool room zone triggered');
        });
    }

    rotatePoint(vec, angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return new THREE.Vector3(
            vec.x * cos - vec.z * sin,
            vec.y,
            vec.x * sin + vec.z * cos
        );
    }

    manageRoomTransitions(prevLayoutName, newLayoutName) {
        if (this.rooms.length > 1) {
            if (prevLayoutName === newLayoutName) {
                this.removeRoom(this.rooms[1]);
            } else {
                this.removeRoom(this.rooms[0]);
                this.currentRoom = this.rooms[0];
            }
        }
    }

    getRooms() {
        return this.rooms;
    }

    removeRoom(room) {
        if (room.group && room.group.children) {
            const children = [...room.group.children];
            children.forEach(child => {
                if (child.userData.isInteractableModel) {
                    this.modelInteractionManager.removeInteractableModel(child);
                }
            });
            this.scene.remove(room.group);
        }

        if (room.bodies && Array.isArray(room.bodies)) {
            room.bodies.forEach(body => {
                this.world.removeBody(body);
            });
        }

        const idx = this.rooms.indexOf(room);
        if (idx !== -1) {
            this.rooms.splice(idx, 1);
        }
    }
}