import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { BackroomsRoom } from './BackroomsRoom.js';
import { RoomLayouts } from './RoomLayouts.js';
import { PickupLightsManager } from '../puzzles/lights.js';
import { ModelInteractionManager } from '../puzzles/modelInteraction.js'; // Add this import
import { DisplaySurface } from '../puzzles/DisplaySurface.js';

export class RoomManager {
    constructor(scene, world, camera) {
        this.scene = scene;
        this.world = world;
        this.rooms = [];
        this.puzzleCompleted = false;

        this.ambient = new THREE.AmbientLight(0xded18a, 0.4);
        scene.add(this.ambient);

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

        lights.forEach(lightEntry => {
            const x = lightEntry[0];
            const z = lightEntry[1];
            const flicker = !!lightEntry[2];
            room.addLightPanel(x, z, flicker);
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

        // NOTE: pickup lights are no longer spawned automatically for the main room.
        // If you want to spawn them later, call this.lightsManager.initPickupLights(...) from game code.

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
                    // analysis/debug logs removed

                    const model = gltf.scene;

                    // Root group holds the translated position (room-local coordinates).
                    // If the room has a rotationY, rotate the position vector so placement follows room orientation.
                    const modelRoot = new THREE.Group();
                    const position = modelConfig.position ? modelConfig.position.clone() : new THREE.Vector3(0, 0, 0);
                    modelRoot.position.copy(position);

                    // IMPORTANT: apply room yaw on the root so model rotates around WORLD Y at modelRoot.position
                    // If room.rotationY is present, use it. Default to 0.
                    modelRoot.rotation.y = typeof room.rotationY === 'number' ? room.rotationY : 0;

                    // Optional per-model yaw offset to correct model authoring orientation (use if an asset faces -Z instead of +Z)
                    if (typeof modelConfig.yawWorldOffset === 'number') {
                        modelRoot.rotation.y += modelConfig.yawWorldOffset;
                    }

                    // Pivot holds the actual model, receives scale & rotation (local transform).
                    const pivot = new THREE.Group();

                    // Optionally center the model so rotation happens around its visual center
                    try {
                        const bbox = new THREE.Box3().setFromObject(model);
                        if (!bbox.isEmpty()) {
                            const center = bbox.getCenter(new THREE.Vector3());
                            // Move model so its center is at origin of pivot
                            model.position.sub(center);
                        }
                    } catch (e) {
                        // ignore bounding-box errors for non-mesh scenes
                    }

                    pivot.add(model);

                    // If this is the whiteboard model, create a DisplaySurface for the backboard mesh
                    if (modelConfig.path && modelConfig.path.toLowerCase().includes('whiteboard.glb')) {
                        model.traverse(child => {
                            if (child.isMesh && child.name === 'Backboard_Material002_0') {
                                // create the display surface and attach references for interaction code
                                const displaySurface = new DisplaySurface(child);
                                modelRoot.userData.displaySurface = displaySurface;
                                child.userData.displaySurface = displaySurface;

                                // Draw persisted text from ModelInteractionManager
                                const savedText = this.modelInteractionManager.whiteboardText || '';
                                displaySurface.drawText(savedText, {
                                    rotation: Math.PI / 2,
                                    fontSize: 200,
                                    y: 640,
                                    scaleX: 0.5
                                });
                            }
                        });
                    }

                    // Apply model-local rotation & scale (use defaults if absent)
                    const rot = modelConfig.rotation || new THREE.Vector3(0, 0, 0);
                    pivot.rotation.set(rot.x || 0, rot.y || 0, rot.z || 0);
                    const scale = modelConfig.scale || new THREE.Vector3(1, 1, 1);
                    pivot.scale.copy(scale);

                    modelRoot.add(pivot);

                    // Mark as interactable model (only if config allows)
                    const isInteractable = modelConfig.interactable !== false; // default true
                    modelRoot.userData.isInteractableModel = !!isInteractable;
                    modelRoot.userData.modelConfig = modelConfig;
                    modelRoot.userData.modelPath = modelConfig.path;
                    // Optional per-model interaction distance (meters). If absent, fallback to manager default.
                    if (typeof modelConfig.interactionDistance === 'number') {
                        modelRoot.userData.interactionDistance = modelConfig.interactionDistance;
                    }
                    modelRoot.name = `interactableModel_${index}`;

                    // Add to room group (room.group already positioned in world)
                    room.group.add(modelRoot);

                    // Add to model interaction manager only if interactable
                    if (isInteractable) this.modelInteractionManager.addInteractableModel(modelRoot);

                    // model loaded (log removed)
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
            let layoutNames;
            if (this.puzzleCompleted) {
                // Only allow exit room to spawn
                layoutNames = ['exit'];
            } else {
                // Exclude exit room from possible layouts
                layoutNames = Object.keys(RoomLayouts).filter(
                    name => name !== 'exit' && name !== this.currentLayoutName
                );
            }

            // If no layouts are available, do nothing
            if (layoutNames.length === 0) return;

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
        // Rotate lights (preserve optional flicker flag)
        const rotatedLights = layout.lights.map(entry => {
            const x = entry[0];
            const z = entry[1];
            const flicker = entry[2] || false;
            const v = rotateVec(new THREE.Vector3(x, 0, z));
            return [v.x, v.z, flicker];
        });

        // Rotate zones
        const rotatedZones = layout.zones.map(([from, to, direction, center]) => [
            rotateVec(from),
            rotateVec(to),
            this.getRotatedDirection(direction, angle),
            rotateVec(center)
        ]);

        // Rotate models (position + add yaw to model rotation.y)
        const rotatedModels = (layout.models || []).map(model => {
            const newPos = rotateVec(model.position ? model.position.clone() : new THREE.Vector3(0, 0, 0));
            return {
                ...model,
                position: newPos,
                rotation: model.rotation ? model.rotation.clone() : new THREE.Vector3(0, 0, 0)
            };
        });

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
            models: rotatedModels,
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
                if (child.userData.isInteractableModel) {
                    this.modelInteractionManager.removeInteractableModel(child);
                    // If this is the whiteboard being removed, stop editing
                    if (child.userData.displaySurface &&
                        this.modelInteractionManager.activeWhiteboardSurface === child.userData.displaySurface) {
                        this.modelInteractionManager.stopWhiteboardEditing();
                    }
                }
            });

            // stop any running periodic blackouts on panels to avoid leaked timers
            if (room.lightPanels) {
                room.lightPanels.forEach(p => {
                    if (typeof p.stopPeriodicBlackout === 'function') p.stopPeriodicBlackout();
                });
            }

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

        // // Clean up pickup lights not in the current room
        // if (this.currentRoom) {
        //     this.cleanupPickupLightsForRoom(this.currentRoom);
        // }
    }

    getRooms() {
        return this.rooms;
    }

    // isLightInRoom(lightGroup, room) {
    //     const pos = new THREE.Vector3();
    //     lightGroup.getWorldPosition(pos);

    //     const minX = room.position.x - room.width / 2;
    //     const maxX = room.position.x + room.width / 2;
    //     const minZ = room.position.z - room.depth / 2;
    //     const maxZ = room.position.z + room.depth / 2;
    //     const minY = room.position.y - room.height / 2;
    //     const maxY = room.position.y + room.height / 2;

    //     return (
    //         pos.x >= minX && pos.x <= maxX &&
    //         pos.z >= minZ && pos.z <= maxZ &&
    //         pos.y >= minY && pos.y <= maxY
    //     );
    // }

    // cleanupPickupLightsForRoom(room) {
    //     if (this.lightsManager && this.lightsManager.pickableRoots) {
    //         this.lightsManager.pickableRoots = this.lightsManager.pickableRoots.filter(lightGroup => {
    //             if (this.isLightInRoom(lightGroup, room)) {
    //                 return true;
    //             } else {
    //                 this.scene.remove(lightGroup);
    //                 this.lightsManager.colorMixingManager.removeLight(lightGroup);
    //                 // Optionally dispose geometry/materials here
    //                 // lightGroup.traverse(obj => {
    //                 //     if (obj.geometry) obj.geometry.dispose();
    //                 //     if (obj.material) obj.material.dispose();
    //                 // });
    //                 return false;
    //             }
    //         });
    //     }
    // }

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

    turnOffAllLights() {
        this.rooms.forEach(room => {
            if (room.lightPanels) {
                room.lightPanels.forEach(panel => {
                    if (typeof panel.turnOff === 'function') panel.turnOff();
                });
            }
        });
        // Lower ambient light intensity
        if (this.ambient) {
            this.ambient.intensity = 0.2; // Or 0 for total darkness
        }
    }
}