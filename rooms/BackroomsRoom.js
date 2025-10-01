import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { BaseRoom } from './BaseRoom.js';
import { LightPanel } from '../props/LightPanel.js';

export class BackroomsRoom extends BaseRoom {
    constructor(scene, world, width, height, depth, position = new THREE.Vector3(0, 0, 0)) {
        // Pass position to parent constructor
        super(scene, world, width, height, depth, position);
    }

    /**
     * Overrides the base method to create materials with backrooms textures.
     */
    _createMaterials() {

        const textureLoader = new THREE.TextureLoader();

        const wallTexture = textureLoader.load('/textures/walls/backroomsTexture.png');
        wallTexture.encoding = THREE.sRGBEncoding;
        wallTexture.wrapS = wallTexture.wrapT = THREE.RepeatWrapping;
        // We'll set repeat per-wall to handle different sizes
        // wallTexture.repeat.set(this.width / 4, this.height / 6);

        const ceilingTexture = textureLoader.load('/textures/ceiling/backroomsTiles.jpg');
        ceilingTexture.wrapS = ceilingTexture.wrapT = THREE.RepeatWrapping;
        ceilingTexture.repeat.set(this.width / 2, this.depth / 2);

        const floorTexture = textureLoader.load('/textures/floor/carpet.jpg');
        floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping;
        floorTexture.repeat.set(this.width / 4, this.depth / 4);

        // Create the material and store it on the instance. Use DoubleSide for interior walls.
        this.wallMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFFFB3,
            map: wallTexture,
            roughness: 0.9,
            side: THREE.FrontSide
        });

        const floorMaterial = new THREE.MeshStandardMaterial({
            color: 0xe8daae, map: floorTexture, roughness: 1, side: THREE.FrontSide
        });
        const ceilingMaterial = new THREE.MeshStandardMaterial({
            color: 0xfcfcd4, map: ceilingTexture, roughness: 0.8, side: THREE.FrontSide
        });

        return {
            ceiling: ceilingMaterial,
            floor: floorMaterial
            // wallMaterial is stored on this.wallMaterial for addWall()
        };
    }

    /**
     * Adds a light panel at the specified position
     * @param {number} x - X coordinate relative to room center
     * @param {number} z - Z coordinate relative to room center
     */
    addLightPanel(x, z) {
        const lightPanel = new LightPanel();
        lightPanel.setPosition(x, this.height / 2, z);
        this.group.add(lightPanel.group);
        return lightPanel;
    }
}