import * as THREE from 'three';

/**
 * Creates and adds ceiling lights to the scene.
 * @param {THREE.Scene} scene The scene to add the lights to.
 */
export function createCeilingLights(scene) {
    // Helper function to create a single spotlight
    function createSpotlight(x, z) {
        const light = new THREE.SpotLight(0xfffde0, 150); // Warm white light
        light.position.set(x, 3, z); // Positioned high up
        light.angle = Math.PI / 6; // Cone angle
        light.penumbra = 0.8; // Soft edges
        light.decay = 2; // Realistic falloff
        light.distance = 10; // Light only travels 10 units

        // This is important for performance and quality
        light.castShadow = true;
        light.shadow.mapSize.width = 1024;
        light.shadow.mapSize.height = 1024;
        light.shadow.camera.near = 1;
        light.shadow.camera.far = 10;

        scene.add(light);

        // The target for a spotlight is where it's pointing.
        // By default, it's (0,0,0). We want it to point straight down.
        const target = new THREE.Object3D();
        target.position.set(x, 0, z);
        scene.add(target);
        light.target = target;

        return light;
    }

    // Create multiple lights based on the image
    const lights = [
        createSpotlight(0, 0),
        createSpotlight(10, 0),
        createSpotlight(0, 10),
        createSpotlight(-10, 0),
        createSpotlight(0, -10),
        createSpotlight(10, 10),
        createSpotlight(-10, -10),
    ];

    // Add a soft ambient light to illuminate the whole scene slightly
    // This prevents shadows from being pitch black
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    scene.add(ambientLight);

    return lights;
}