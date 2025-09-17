import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { BaseRoom } from './BaseRoom.js';
import { LightPanel } from '../props/LightPanel.js';

export class BackroomsRoom extends BaseRoom {
    constructor(scene, world, width, height, depth) {
        // You must call super() before using 'this'.
        super(scene, world, width, height, depth);
        // This will hold the material for interior walls.
        // It's initialized within _createMaterials, which is called by super().
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
            side: THREE.DoubleSide
        });

        // For the outer box, we still want BackSide so we don't see the outside of the box from within.
        const outerWallMaterial = this.wallMaterial.clone();
        outerWallMaterial.side = THREE.BackSide;
        // Set texture repeat for the main room walls
        outerWallMaterial.map.repeat.set(this.width / 4, this.height / 6);


        const floorMaterial = new THREE.MeshStandardMaterial({
            color: 0xe8daae, map: floorTexture, roughness: 1, side: THREE.BackSide
        });
        const ceilingMaterial = new THREE.MeshStandardMaterial({
            color: 0xfcfcd4, map: ceilingTexture, roughness: 0.8, side: THREE.BackSide
        });

        return [outerWallMaterial, outerWallMaterial, ceilingMaterial, floorMaterial, outerWallMaterial, outerWallMaterial];
    }

    // The addWall method is now inherited from BaseRoom, so we can remove it from here.

    /**
     * Overrides the base method to add specific RectAreaLights.
     */
    _createLights() {
        RectAreaLightUniformsLib.init();

        const addLightPanel = (x, z) => {
            const lightPanel = new LightPanel();
            lightPanel.setPosition(x, this.height / 2, z);
            this.group.add(lightPanel.group);
        };

        // Add light panels in a pattern
        addLightPanel(0, 0);
        addLightPanel(10, 0);
        addLightPanel(0, 10);
        addLightPanel(10, 10);

        const ambient = new THREE.AmbientLight(0xded18a, 0.4);
        this.group.add(ambient);
    }
}