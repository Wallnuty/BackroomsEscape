import * as THREE from 'three';
import { BackroomsRoom } from '../BackroomsRoom.js';

export class PoolRoom extends BackroomsRoom {
    _createMaterials() {
        const textureLoader = new THREE.TextureLoader();

        const tile = textureLoader.load('./textures/walls/pool_tiles_color.png');
        tile.wrapS = tile.wrapT = THREE.RepeatWrapping;
        tile.colorSpace = THREE.SRGBColorSpace;

        // 🔧 Adjust these numbers until tiles look realistic
        tile.repeat.set(120 / 8, this.height / 8);

        // Slight variation for floor (different ratio)
        const floorTile = tile.clone();
        floorTile.repeat.set(120 / 19.5, 60 / 19.5);


        const wallTile = tile.clone();
        wallTile.repeat.set(120 / 468, 60 / 234); // less vertical repetition

        const wallMaterial = new THREE.MeshStandardMaterial({
            map: wallTile,
            roughness: 0.6,
            metalness: 0.3
        });

        const floorMaterial = new THREE.MeshStandardMaterial({
            map: floorTile,
            roughness: 0.9,
            metalness: 0.1
        });

        const ceilingMaterial = new THREE.MeshStandardMaterial({
            map: floorTile,
            roughness: 0.8,
            metalness: 0.2
        });

        this.wallMaterial = wallMaterial;
        return { floor: floorMaterial, ceiling: ceilingMaterial };
    }
}
