import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { BackroomsRoom } from './BackroomsRoom.js';
import { RoomLayouts } from './RoomLayouts.js';

export class RoomManager {
    constructor(scene, world) {
        this.scene = scene;
        this.world = world;
        this.rooms = [];

        //Add global yellow lighting
        const ambient = new THREE.AmbientLight(0xded18a, 0.4);
        scene.add(ambient);

        this._createGlobalFloorAndCeiling();

        // Start with the main room (change to RoomLayouts.main if needed)
        this.currentLayoutName = 'main'; // Start in main room
        this.createCustomRoom(RoomLayouts.main, this.currentLayoutName);

        this.lastZone = null;            // The last zone the player was in
        this.pendingRoomUpdate = null;   // Timeout handle for delayed update
        this.currentRoom = this.rooms[0]; // Track the actual room object
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
            zones = []
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

        room.setZoneDebugVisibility(false); // true to see render zones

        // Store the layout name on the room object
        room.layoutName = layoutName;

        this.rooms.push(room);
        return room;
    }

    /**
     * Checks all rooms for rendering zone triggers
     * (REMOVED) - replaced by scanAllZones below to avoid double-looping
     */
    // checkAllRenderingZones(playerPosition) {
    //     const allTriggeredZones = [];
    //     this.rooms.forEach(room => {
    //         const triggeredZones = room.checkRenderingZones(playerPosition);
    //         allTriggeredZones.push(...triggeredZones);
    //     });
    //     return allTriggeredZones;
    // }

    /**
     * Single-pass scan over all rooms/zones.
     * Returns the active zone/room (first zone containing the player)
     * and an array of zones that were newly triggered this frame.
     */
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
            this.createCustomRoom(newLayout, randomLayoutName);

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

        // Only handle triggered zones if the player was NOT in any zone last frame.
        // This ensures room creation only happens when entering a zone from a non-zone.
        const triggersToHandle = (!this.lastZone) ? triggeredZones : [];

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
        // Remove all meshes in the room group from the scene
        if (room.group && room.group.children) {
            room.group.children.forEach(child => {
                this.scene.remove(child);
            });
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
    }

    getRooms() {
        return this.rooms;
    }

}