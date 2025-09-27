import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { BackroomsRoom } from './BackroomsRoom.js';
import { RoomLayouts } from './RoomLayouts.js';

export class RoomManager {
    constructor(scene, world) {
        this.scene = scene;
        this.world = world;
        this.rooms = [];
        this.activeRenderingZones = [];

        // Create global floor and ceiling once
        this._createGlobalFloorAndCeiling();

        // Only create the main room
        const layout = RoomLayouts.secondary;
        this.createCustomRoom(layout);

        // this.createAllRooms();
    }

    /**
     * Creates global infinite floor and ceiling physics
     */
    _createGlobalFloorAndCeiling() {
        // Global infinite floor physics
        const groundBody = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
        groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
        groundBody.position.y = -2.5; // Fixed height for all rooms
        this.world.addBody(groundBody);

        // Global infinite ceiling physics  
        const ceilingBody = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
        ceilingBody.quaternion.setFromEuler(Math.PI / 2, 0, 0);
        ceilingBody.position.y = 2.5; // Fixed height for all rooms
        this.world.addBody(ceilingBody);
    }

    /**
     * Create a custom room with specified walls, lights, and rendering zones.
     * @param {THREE.Vector3} position - World position for the room center
     * @param {Array} walls - Array of [from, to, thickness] for each wall
     * @param {Array} lights - Array of [x, z] for each light panel
     * @param {Array} zones - Array of [from, to, direction, center] for each rendering zone
     * @returns {BackroomsRoom} - The created room
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
     * Creates all rooms from layouts
     */
    createAllRooms() {
        Object.values(RoomLayouts).forEach(layout => {
            this.createCustomRoom(layout.position, layout.walls, layout.lights, layout.zones);
        });
    }

    /**
     * Checks all rooms for rendering zone triggers
     * @param {THREE.Vector3} playerPosition - Current player world position
     * @returns {Array} - Array of triggered zones from all rooms
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
     * Handles triggered rendering zones (to be called from game loop)
     * @param {Array} triggeredZones - Array of triggered zones
     */
    handleTriggeredZones(triggeredZones) {
        triggeredZones.forEach(zone => {
            console.log(`🚪 Rendering zone triggered! Direction: ${zone.openingDirection}`);
            console.log('📍 Zone position:', zone.position);
            console.log('🎯 Opening center:', zone.openingCenter);

            const targetPosition = zone.getTargetRoomPosition();
            console.log('🏠 Target room position:', targetPosition);
            console.log('---');

            // Here you would implement the actual room rendering logic
            // For example: this.createRoomAtPosition(targetPosition, zone.openingCenter);
        });
    }

    /**
     * Updates the room manager (call this in your game loop)
     * @param {THREE.Vector3} playerPosition - Current player position
     */
    update(playerPosition) {
        const triggeredZones = this.checkAllRenderingZones(playerPosition);
        if (triggeredZones.length > 0) {
            this.handleTriggeredZones(triggeredZones);
        }
    }

    /**
     * Get all rooms
     */
    getRooms() {
        return this.rooms;
    }

    /**
     * Clean up all rooms
     */
    dispose() {
        this.rooms.forEach(room => {
            // Clean up rendering zone debug meshes
            room.renderingZones.forEach(zone => {
                if (zone.debugMesh) {
                    this.scene.remove(zone.debugMesh);
                    if (zone.debugMesh.geometry) zone.debugMesh.geometry.dispose();
                    if (zone.debugMesh.material) zone.debugMesh.material.dispose();
                }
            });

            // Dispose of geometries and materials in the room group
            room.group.traverse(object => {
                if (object.geometry) object.geometry.dispose();
                if (object.material) {
                    // Handle both array and single materials
                    if (Array.isArray(object.material)) {
                        object.material.forEach(material => material.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            });

            // Remove from scene
            this.scene.remove(room.group);

            // Remove physics bodies
            room.bodies.forEach(body => {
                this.world.removeBody(body);
            });
        });

        this.rooms = [];
    }
}