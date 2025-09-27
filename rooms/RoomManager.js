import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { BackroomsRoom } from './BackroomsRoom.js';

export class RoomManager {
    constructor(scene, world) {
        this.scene = scene;
        this.world = world;
        this.rooms = [];
        this.activeRenderingZones = [];

        // Create global floor and ceiling once
        this._createGlobalFloorAndCeiling();
        this.createLevel();
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
     * Creates the complete level - handles all initial room creation
     * @returns {Object} - Object containing references to created rooms
     */
    createLevel() {
        // Create the main backrooms area
        const mainRoom = this.createMainBackrooms();

        // You can add more rooms here as your level expands
        // const corridorRoom = this.createCorridorRoom();
        // const officeRoom = this.createOfficeRoom();

        return {
            mainRoom: mainRoom,
            // Add other rooms here when you create them
        };
    }

    /**
     * Creates the main backrooms area with rendering zones
     */
    createMainBackrooms() {
        let position = new THREE.Vector3(-15, 0, 15);
        const room = new BackroomsRoom(this.scene, this.world, 30, 5, 30, position);

        // Add walls to create the backrooms layout
        room.addWall(new THREE.Vector3(10, 0, -15), new THREE.Vector3(-6, 0, -15), 0.4);
        room.addWall(new THREE.Vector3(10, 0, -15), new THREE.Vector3(10, 0, -2), 0.4);
        room.addWall(new THREE.Vector3(10, 0, 5), new THREE.Vector3(10, 0, 15), 0.4);
        room.addWall(new THREE.Vector3(-6, 0, -15), new THREE.Vector3(-6, 0, -4), 0.4);
        room.addWall(new THREE.Vector3(-6, 0, -4), new THREE.Vector3(-9, 0, -4), 0.4);
        room.addWall(new THREE.Vector3(-9, 0, -4), new THREE.Vector3(-9, 0, 8), 0.4);
        room.addWall(new THREE.Vector3(-9, 0, 8), new THREE.Vector3(-1, 0, 8), 0.4);
        room.addWall(new THREE.Vector3(15, 0, 15), new THREE.Vector3(-1, 0, 15), 0.4);
        room.addWall(new THREE.Vector3(15, 0, 2), new THREE.Vector3(5, 0, 2), 0.4);
        room.addWall(new THREE.Vector3(5, 0, 2), new THREE.Vector3(5, 0, -5), 0.4);
        room.addWall(new THREE.Vector3(-1, 0, 15), new THREE.Vector3(-1, 0, 8), 0.4);
        room.addWall(new THREE.Vector3(15, 0, -7), new THREE.Vector3(10, 0, -8), 0.4);
        room.addWall(new THREE.Vector3(15, 0, -1), new THREE.Vector3(15, 0, 11), 0.4);
        room.addWall(new THREE.Vector3(15, 0, -5), new THREE.Vector3(15, 0, -10), 0.4);

        // pillar
        room.addWall(new THREE.Vector3(-2, 0, 2), new THREE.Vector3(-2, 0, 0.5), 1.5);

        // Add rendering zones for openings
        // You'll need to specify the center point of each opening in your room layout

        room.addRenderingZone(
            new THREE.Vector3(15, 0, 2).add(position),  // Zone from point
            new THREE.Vector3(5, 0, -8).add(position),   // Zone to point
            'west',                                      // Opening direction
            new THREE.Vector3(15, 0, -3).add(position)    // Center of the opening
        );

        room.addRenderingZone(
            new THREE.Vector3(15, 0, 15).add(position),   // Zone from point
            new THREE.Vector3(10, 0, 2).add(position),  // Zone to point
            'west',                                     // Opening direction
            new THREE.Vector3(15, 0, 13).add(position)   // Center of the opening
        );

        // Enable debug visualization for all zones
        room.setZoneDebugVisibility(true);

        room.addLightPanel(10, 0);
        room.addLightPanel(-2, -6);
        room.addLightPanel(4, 10);

        this.rooms.push(room);
        return room;
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