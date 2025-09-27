// player physics body + sync to camera

import * as CANNON from 'cannon-es';
import * as THREE from 'three';

export function createPlayer(world, camera, options = {}) {
    const radius = options.radius ?? 0.3;
    const height = options.height ?? 1.6;
    const mass = options.mass ?? 1;

    // This is the vertical offset from the center of the physics sphere to the camera.
    const eyeOffset = height * 1.3 - radius * 0.5; // Adjust this value for desired eye level

    // Use a sphere for simplicity
    const shape = new CANNON.Sphere(radius);
    const body = new CANNON.Body({ mass });
    body.addShape(shape);
    // Start the player at a reasonable height to avoid falling far
    body.position.set(-15, -2.1, 3);

    world.addBody(body);

    // Sync camera to player, now with an offset
    function syncCamera() {
        // Copy the physics body's position
        camera.position.copy(body.position);
        // Add the vertical offset for eye level
        camera.position.y += eyeOffset;
    }

    return { body, syncCamera };
}
