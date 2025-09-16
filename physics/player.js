// player physics body + sync to camera

import * as CANNON from 'cannon-es';
import * as THREE from 'three';

export function createPlayer(world, camera, options = {}) {
    const radius = options.radius ?? 0.3;
    const height = options.height ?? 1.6;
    const mass = options.mass ?? 1;

    // Use a sphere for simplicity
    const shape = new CANNON.Sphere(radius);
    const body = new CANNON.Body({ mass });
    body.addShape(shape);
    body.position.set(0, height / 2, 0);

    world.addBody(body);

    // Sync camera to player
    function syncCamera() {
        camera.position.copy(body.position);
    }

    return { body, syncCamera };
}
