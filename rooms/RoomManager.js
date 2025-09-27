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
        room.addWall(new THREE.Vector3(15, 0, -10), new THREE.Vector3(10, 0, -10), 0.4);
        room.addWall(new THREE.Vector3(15, 0, -1), new THREE.Vector3(15, 0, 11), 0.4);
        room.addWall(new THREE.Vector3(15, 0, -5), new THREE.Vector3(15, 0, -10), 0.4);

        // pillar
        room.addWall(new THREE.Vector3(-2, 0, 2), new THREE.Vector3(-2, 0, 0.5), 1.5);

        // Add rendering zones for the two left-side openings
        // Convert relative positions to world coordinates
        const worldPos1 = new THREE.Vector3(-24, 0, 11).add(position); // First opening zone
        const worldPos2 = new THREE.Vector3(-24, 0, -11).add(position); // Second opening zone

        room.addRenderingZone(
            worldPos1,
            new THREE.Vector3(2, 3, 4), // Zone size
            'west', // Opening faces west
            { type: 'backrooms', variant: 'corridor' } // Room config to render
        );

        room.addRenderingZone(
            worldPos2,
            new THREE.Vector3(2, 3, 4), // Zone size
            'west', // Opening faces west
            { type: 'backrooms', variant: 'office' } // Different room config
        );

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
            console.log(`Rendering zone triggered! Direction: ${zone.openingDirection}, Position:`, zone.position);
            console.log('Room to render:', zone.roomToRender);

            // Here you would implement the actual room rendering logic
            // For now, just log the information
            const targetPosition = zone.getTargetRoomPosition();
            console.log('Target room position:', targetPosition);

            // Example: this.createRoomAtPosition(zone.roomToRender, targetPosition);
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