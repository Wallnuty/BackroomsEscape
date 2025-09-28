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
        this.createCustomRoom(RoomLayouts.main);

        this.lastZone = null;            // The last zone the player was in
        this.pendingRoomUpdate = null;   // Timeout handle for delayed update
        this.nextLayoutName = null;      // The room type we might switch to
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
    createCustomRoom(layout) {
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

        room.setZoneDebugVisibility(true);
        this.rooms.push(room);
        return room;
    }

    /**
     * Checks all rooms for rendering zone triggers
     */
    checkAllRenderingZones(playerPosition) {
        const allTriggeredZones = [];
        this.rooms.forEach(room => {
            const triggeredZones = room.checkRenderingZones(playerPosition);
            allTriggeredZones.push(...triggeredZones);
        });
        return allTriggeredZones;
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
            const newRoom = this.createCustomRoom(newLayout);

            // Log the room type change
            console.log(`Room type changed: ${this.currentLayoutName} -> ${randomLayoutName}`);

            // After creating the new room, update the currentLayoutName
            this.currentLayoutName = randomLayoutName;
            console.log(`Current room type is now: ${this.currentLayoutName}`);
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

        // Optionally, update zone directions if you want the rotated zone to face a new direction

        return {
            ...layout,
            walls: rotatedWalls,
            lights: rotatedLights,
            zones: rotatedZones
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
        const triggeredZones = this.checkAllRenderingZones(playerPosition);
        if (triggeredZones.length > 0) {
            this.handleTriggeredZones(triggeredZones);
        }
    }

    getRooms() {
        return this.rooms;
    }

    dispose() {
        this.rooms.forEach(room => {
            room.renderingZones.forEach(zone => {
                if (zone.debugMesh) {
                    this.scene.remove(zone.debugMesh);
                    if (zone.debugMesh.geometry) zone.debugMesh.geometry.dispose();
                    if (zone.debugMesh.material) zone.debugMesh.material.dispose();
                }
            });
            room.group.traverse(object => {
                if (object.geometry) object.geometry.dispose();
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(material => material.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            });
            this.scene.remove(room.group);
            room.bodies.forEach(body => {
                this.world.removeBody(body);
            });
        });
        this.rooms = [];
    }
}