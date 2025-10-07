import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { BackroomsRoom } from './BackroomsRoom.js';
import { RoomLayouts } from './RoomLayouts.js';
import { PickupLightsManager } from '../puzzles/lights.js';
import { ModelInteractionManager } from '../puzzles/modelInteraction.js'; // Add this import

export class RoomManager {
    constructor(scene, world, camera) {
        this.scene = scene;
        this.world = world;
        this.rooms = [];

        const ambient = new THREE.AmbientLight(0xded18a, 0.4);
        scene.add(ambient);

        this._createGlobalFloorAndCeiling();

        // Create managers
        this.lightsManager = new PickupLightsManager(scene, camera);
        this.modelInteractionManager = new ModelInteractionManager(scene, camera);

        // Connect the managers
        this.modelInteractionManager.setPickupLightsManager(this.lightsManager);

        // Start with the main room
        this.currentLayoutName = 'main';
        this.createCustomRoom(RoomLayouts.main, this.currentLayoutName);

        this.lastZone = null;
        this.pendingRoomUpdate = null;
        this.currentRoom = this.rooms[0];
        this.renderZonesDisabled = false;
    }

    _createGlobalFloorAndCeiling() {
        const groundBody = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
        groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
        groundBody.position.y = -2.5;
        this.world.addBody(groundBody);

        const ceilingBody = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
        ceilingBody.quaternion.setFromEuler(Math.PI / 2, 0, 0);
        ceilingBody.position.y = 2.5;
        this.world.addBody(ceilingBody);
    }

    /**
     * Creates a custom room from a layout object
     */
    createCustomRoom(layout, layoutName = null) {
        const {
            position,
            width = 30,
            height = 5,
            depth = 30,
            walls = [],
            lights = [],
            zones = [],
            models = [] // Add models support
        } = layout;

        const room = new BackroomsRoom(this.scene, this.world, width, height, depth, position);

        walls.forEach(([from, to, thickness]) => {
            room.addWall(from, to, thickness);
        });

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

        // Load models if any
        if (models.length > 0) {
            this.loadModelsForRoom(room, models);
        }

        room.setZoneDebugVisibility(false);

        room.layoutName = layoutName;
        this.rooms.push(room);

        // If this is the main room, spawn pickup lights in the center
        if (layoutName === 'main') {
            const center = position.clone();
            const pickupLightPositions = [
                { position: center.clone().add(new THREE.Vector3(0.5, 1, 0)), color: 0xff0000 },
                { position: center.clone().add(new THREE.Vector3(-0.5, 1, 0)), color: 0x00ff00 },
                { position: center.clone().add(new THREE.Vector3(0, 1, 0.5)), color: 0x0000ff },
            ];
            this.lightsManager.initPickupLights(pickupLightPositions);
        }

        return room;
    }

    /**
     * Loads 3D models for a room
     */
    loadModelsForRoom(room, models) {
        const loader = new GLTFLoader();

        models.forEach((modelConfig, index) => {
            loader.load(
                modelConfig.path,
                (gltf) => {
                    const model = gltf.scene;

                    // Create a group to contain the model and mark it as interactable
                    const modelGroup = new THREE.Group();
                    modelGroup.add(model);

                    // Apply scale and rotation to the model group
                    modelGroup.scale.copy(modelConfig.scale);
                    modelGroup.rotation.set(
                        modelConfig.rotation.x,
                        modelConfig.rotation.y,
                        modelConfig.rotation.z
                    );

                    // Check if the room has a rotation (from room generation)
                    if (room.rotationY !== undefined) {
                        // For rotated rooms, we need to rotate the model's position
                        const rotatedPosition = this.rotatePoint(modelConfig.position, room.rotationY);
                        modelGroup.position.copy(rotatedPosition);

                        // Also rotate the model itself to maintain consistent orientation
                        modelGroup.rotation.y += room.rotationY;
                    } else {
                        // No room rotation - use position as-is
                        modelGroup.position.copy(modelConfig.position);
                    }

                    // Mark as interactable model
                    modelGroup.userData.isInteractableModel = true;
                    modelGroup.userData.modelConfig = modelConfig;
                    modelGroup.userData.modelPath = modelConfig.path;
                    modelGroup.name = `interactableModel_${index}`;

                    // Add to room group
                    room.group.add(modelGroup);

                    // Add to model interaction manager
                    this.modelInteractionManager.addInteractableModel(modelGroup);

                    console.log(`Model ${modelConfig.path} loaded and added to room group`);
                }
            );
        });
    }

    scanAllZones(playerPosition) {
        let activeZone = null;
        let activeRoom = null;
        const triggeredZones = [];

        for (const room of this.rooms) {
            for (const zone of room.renderingZones) {
                const isInside = zone.containsPoint(playerPosition);

                // find first active zone/room
                if (!activeZone && isInside) {
                    activeZone = zone;
                    activeRoom = room;
                }

                // handle trigger-on-enter semantics (mirror previous checkRenderingZones behaviour)
                if (isInside && !zone.hasTriggered) {
                    zone.hasTriggered = true;
                    triggeredZones.push(zone);
                } else if (!isInside && zone.hasTriggered) {
                    // reset when leaving so it can trigger again next entry
                    zone.hasTriggered = false;
                }
            }
        }

        return { activeZone, activeRoom, triggeredZones };
    }

    /**
     * Handles triggered rendering zones
     */
    handleTriggeredZones(triggeredZones) {
        triggeredZones.forEach(zone => {
            // Exclude the current room type
            const layoutNames = Object.keys(RoomLayouts).filter(
                name => name !== this.currentLayoutName
            );
            const randomLayoutName = layoutNames[Math.floor(Math.random() * layoutNames.length)];
            const randomLayout = RoomLayouts[randomLayoutName];

            // Pick a random zone from the new room
            const zoneIndex = Math.floor(Math.random() * randomLayout.zones.length);
            const selectedZone = randomLayout.zones[zoneIndex];

            // Directions
            const currentDir = zone.openingDirection;
            const targetDir = selectedZone[2];

            // Calculate rotation needed to align selected zone's direction to the opposite of current
            const desiredDir = this.getOppositeDirection(currentDir);
            const rotationY = this.calculateRotationBetweenDirections(targetDir, desiredDir);

            // Calculate new room position so the selected zone's opening center matches the current zone's opening center
            const currentCenter = zone.openingCenter.clone();
            const selectedCenter = selectedZone[3].clone();

            // Rotate selectedCenter by rotationY
            const rotatedCenter = this.rotatePoint(selectedCenter, rotationY);

            // Position = currentCenter - rotatedCenter
            const newRoomPosition = new THREE.Vector3(
                currentCenter.x - rotatedCenter.x,
                0,
                currentCenter.z - rotatedCenter.z
            );

            // Create the new room at the calculated position
            const rotatedLayout = this.rotateLayout(randomLayout, rotationY);
            const newLayout = { ...rotatedLayout, position: newRoomPosition };
            const newRoom = this.createCustomRoom(newLayout, randomLayoutName);

            // Store the rotation angle in the room for model loading
            newRoom.rotationY = rotationY;
        });
    }

    /**
     * Utility: Get opposite direction
     */
    getOppositeDirection(direction) {
        const opposites = {
            'north': 'south',
            'south': 'north',
            'east': 'west',
            'west': 'east'
        };
        return opposites[direction] || 'south';
    }

    /**
     * Utility: Calculate rotation (in radians) needed to turn from one direction to another
     */
    calculateRotationBetweenDirections(from, to) {
        const dirToAngle = {
            'south': 0,
            'west': Math.PI / 2,
            'north': Math.PI,
            'east': 3 * Math.PI / 2
        };
        let angle = dirToAngle[to] - dirToAngle[from];
        // Normalize angle to [0, 2PI)
        while (angle < 0) angle += Math.PI * 2;
        while (angle >= Math.PI * 2) angle -= Math.PI * 2;
        return angle;
    }

    /**
     * Utility: Rotate a point around the origin by angle (radians)
     */
    rotatePoint(vec, angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return new THREE.Vector3(
            vec.x * cos - vec.z * sin,
            vec.y,
            vec.x * sin + vec.z * cos
        );
    }

    /**
     * Utility: Rotate a layout object by a given angle (radians)
     */
    rotateLayout(layout, angle) {
        // Helper to rotate a THREE.Vector3
        function rotateVec(vec) {
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            return new THREE.Vector3(
                vec.x * cos - vec.z * sin,
                vec.y,
                vec.x * sin + vec.z * cos
            );
        }

        // Rotate walls
        const rotatedWalls = layout.walls.map(([from, to, thickness]) => [
            rotateVec(from),
            rotateVec(to),
            thickness
        ]);

        // Rotate lights
        const rotatedLights = layout.lights.map(([x, z]) => {
            const v = rotateVec(new THREE.Vector3(x, 0, z));
            return [v.x, v.z];
        });

        // Rotate zones
        const rotatedZones = layout.zones.map(([from, to, direction, center]) => [
            rotateVec(from),
            rotateVec(to),
            this.getRotatedDirection(direction, angle),
            rotateVec(center)
        ]);

        // Adjust width and depth by rotating the original width/depth vector
        // Use a vector from (0,0,0) to (width, 0, depth), rotate it, and take abs values
        const sizeVec = rotateVec(new THREE.Vector3(layout.width, 0, layout.depth));
        const width = Math.abs(sizeVec.x);
        const depth = Math.abs(sizeVec.z);

        return {
            ...layout,
            walls: rotatedWalls,
            lights: rotatedLights,
            zones: rotatedZones,
            width,
            depth
        };
    }

    getRotatedDirection(originalDirection, angle) {
        const directions = ['south', 'west', 'north', 'east'];
        const dirToIndex = { south: 0, west: 1, north: 2, east: 3 };
        const steps = Math.round(angle / (Math.PI / 2)) % 4;
        const originalIndex = dirToIndex[originalDirection];
        const newIndex = (originalIndex + steps + 4) % 4;
        return directions[newIndex];
    }


    /**
     * Main update loop
     */
    update(playerPosition) {
        // If render zones are disabled, skip all zone logic
        if (this.renderZonesDisabled) {
            return;
        }
        // Single scan: get active zone/room and triggered zones
        const { activeZone, activeRoom, triggeredZones } = this.scanAllZones(playerPosition);

        // If player has left the last zone
        if (this.lastZone && (!activeZone || activeZone !== this.lastZone)) {
            // Start a timer to update the current room after 0.5s
            if (this.pendingRoomUpdate) {
                clearTimeout(this.pendingRoomUpdate);
                this.pendingRoomUpdate = null;
            }

            // capture the zone we left and store the timeout id so we can detect cancellation
            const scheduledLastZone = this.lastZone;
            const timeoutId = setTimeout(() => {
                // if pendingRoomUpdate was cleared/cancelled, don't run
                if (this.pendingRoomUpdate !== timeoutId) return;

                // update to the room that the left-zone belonged to
                if (scheduledLastZone && scheduledLastZone.parentRoom) {
                    const prevLayoutName = this.currentLayoutName;
                    this.currentRoom = scheduledLastZone.parentRoom;
                    this.currentLayoutName = this.currentRoom.layoutName;
                    console.log(`Current room type updated to: ${this.currentLayoutName}`);

                    // If current room is now exit, seal it and disable render zones
                    if (this.currentLayoutName === 'exit') {
                        this.sealExitRoom();
                        this.renderZonesDisabled = true;
                        console.log('Exit room detected - sealed and render zones disabled');
                    }

                    // Manage room transitions
                    this.manageRoomTransitions(prevLayoutName, this.currentLayoutName);
                }

                this.pendingRoomUpdate = null;
            }, 200);

            this.pendingRoomUpdate = timeoutId;
        }

        // If player enters a new zone within 0.5s, cancel the pending update
        if (activeZone && activeZone !== this.lastZone && this.pendingRoomUpdate) {
            clearTimeout(this.pendingRoomUpdate);
            this.pendingRoomUpdate = null;
        }

        // Only handle triggered zones if the player was NOT in any zone last frame AND render zones are not disabled
        const triggersToHandle = (!this.lastZone && !this.renderZonesDisabled) ? triggeredZones : [];

        // Update lastZone
        this.lastZone = activeZone;

        // Handle zone triggers as before (use triggersToHandle from the single scan)
        if (triggersToHandle.length > 0) {
            this.handleTriggeredZones(triggersToHandle);
        }
    }

    manageRoomTransitions(prevLayoutName, newLayoutName) {
        // Only act if there are two rooms
        if (this.rooms.length > 1) {
            if (prevLayoutName === newLayoutName) {
                // Same room type: remove the newly generated room
                this.removeRoom(this.rooms[1]);
            } else {
                // Different room type: remove the old room, shift new room to index 0
                this.removeRoom(this.rooms[0]);
                // After removal, rooms[1] becomes rooms[0] automatically
                this.currentRoom = this.rooms[0];
            }
        }
    }

    /**
     * Removes a room from the scene, physics world, and internal array.
     * @param {BaseRoom} room - The room instance to remove.
     */
    removeRoom(room) {
        // Remove all meshes in the room group from the scene and dispose geometry/materials
        if (room.group && room.group.children) {
            // Create a copy of children array to avoid mutation during iteration
            const children = [...room.group.children];

            children.forEach(child => {
                // Remove from model interaction manager if it's an interactable model
                if (child.userData.isInteractableModel) {
                    this.modelInteractionManager.removeInteractableModel(child);
                    console.log(`Removed model from interaction manager: ${child.userData.modelPath}`);
                }
            });

            // Remove the entire room group from scene (this removes all children too)
            this.scene.remove(room.group);
        }

        // Remove all physics bodies from the world
        if (room.bodies && Array.isArray(room.bodies)) {
            room.bodies.forEach(body => {
                this.world.removeBody(body);
            });
        }

        // Remove from rooms array
        const idx = this.rooms.indexOf(room);
        if (idx !== -1) {
            this.rooms.splice(idx, 1);
        }

        // Clean up pickup lights not in the current room
        if (this.currentRoom) {
            this.cleanupPickupLightsForRoom(this.currentRoom);
        }
    }

    getRooms() {
        return this.rooms;
    }

    isLightInRoom(lightGroup, room) {
        const pos = new THREE.Vector3();
        lightGroup.getWorldPosition(pos);

        const minX = room.position.x - room.width / 2;
        const maxX = room.position.x + room.width / 2;
        const minZ = room.position.z - room.depth / 2;
        const maxZ = room.position.z + room.depth / 2;
        const minY = room.position.y - room.height / 2;
        const maxY = room.position.y + room.height / 2;

        return (
            pos.x >= minX && pos.x <= maxX &&
            pos.z >= minZ && pos.z <= maxZ &&
            pos.y >= minY && pos.y <= maxY
        );
    }

    cleanupPickupLightsForRoom(room) {
        if (this.lightsManager && this.lightsManager.pickableRoots) {
            this.lightsManager.pickableRoots = this.lightsManager.pickableRoots.filter(lightGroup => {
                if (this.isLightInRoom(lightGroup, room)) {
                    return true;
                } else {
                    this.scene.remove(lightGroup);
                    this.lightsManager.colorMixingManager.removeLight(lightGroup);
                    // Optionally dispose geometry/materials here
                    // lightGroup.traverse(obj => {
                    //     if (obj.geometry) obj.geometry.dispose();
                    //     if (obj.material) obj.material.dispose();
                    // });
                    return false;
                }
            });
        }
    }

    /**
     * Seals the exit room by adding a hardcoded wall at the opening
     */
    sealExitRoom() {
        if (!this.currentRoom || this.currentLayoutName !== 'exit') return;

        // Get the exit room's zone to find where the opening is
        const exitZone = this.currentRoom.renderingZones[0]; // Exit room has one zone
        if (!exitZone) return;

        const direction = exitZone.openingDirection;
        const center = exitZone.openingCenter.clone();

        // Convert world position to room-relative position
        const roomPosition = this.currentRoom.position;
        const relativeCenter = center.clone().sub(roomPosition);

        // Create wall coordinates based on the opening direction
        let wallStart, wallEnd;
        const wallThickness = 0.4;

        switch (direction) {
            case 'south':
                // Wall blocks the south opening
                wallStart = new THREE.Vector3(relativeCenter.x - 2, 0, relativeCenter.z);
                wallEnd = new THREE.Vector3(relativeCenter.x + 2, 0, relativeCenter.z);
                break;
            case 'north':
                // Wall blocks the north opening
                wallStart = new THREE.Vector3(relativeCenter.x - 2, 0, relativeCenter.z);
                wallEnd = new THREE.Vector3(relativeCenter.x + 2, 0, relativeCenter.z);
                break;
            case 'east':
                // Wall blocks the east opening
                wallStart = new THREE.Vector3(relativeCenter.x, 0, relativeCenter.z - 2);
                wallEnd = new THREE.Vector3(relativeCenter.x, 0, relativeCenter.z + 2);
                break;
            case 'west':
                // Wall blocks the west opening
                wallStart = new THREE.Vector3(relativeCenter.x, 0, relativeCenter.z - 2);
                wallEnd = new THREE.Vector3(relativeCenter.x, 0, relativeCenter.z + 2);
                break;
            default:
                console.warn('Unknown direction for sealing wall:', direction);
                return;
        }

        // Add the sealing wall to the current room
        this.currentRoom.addWall(wallStart, wallEnd, wallThickness);

        console.log(`Exit room sealed with wall from ${wallStart.x}, ${wallStart.z} to ${wallEnd.x}, ${wallEnd.z}`);
    }
}