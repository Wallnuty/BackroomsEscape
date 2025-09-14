import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

export function createFirstPersonControls(camera, domElement, bounds) {
    const controls = new PointerLockControls(camera, domElement);

    const move = { forward: false, backward: false, left: false, right: false };
    const velocity = new THREE.Vector3();
    const damping = 10.0;
    const speed = 3.5;

    // Key input handlers
    function onKeyDown(e) {
        switch (e.code) {
            case 'KeyW': case 'ArrowUp': move.forward = true; break;
            case 'KeyS': case 'ArrowDown': move.backward = true; break;
            case 'KeyA': case 'ArrowLeft': move.left = true; break;
            case 'KeyD': case 'ArrowRight': move.right = true; break;
        }
    }
    function onKeyUp(e) {
        switch (e.code) {
            case 'KeyW': case 'ArrowUp': move.forward = false; break;
            case 'KeyS': case 'ArrowDown': move.backward = false; break;
            case 'KeyA': case 'ArrowLeft': move.left = false; break;
            case 'KeyD': case 'ArrowRight': move.right = false; break;
        }
    }

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    // Pointer lock on click
    domElement.addEventListener('click', () => controls.lock());

    // Set initial camera height
    camera.position.y = bounds?.eyeY ?? 1.5;

    // Update function to be called every frame
    function update(delta) {
        // Apply damping
        velocity.x -= velocity.x * damping * delta;
        velocity.z -= velocity.z * damping * delta;

        // Compute movement direction
        const forward = Number(move.forward) - Number(move.backward);
        const strafe = Number(move.right) - Number(move.left);

        if (forward || strafe) {
            const accel = speed * 10.0;
            velocity.z -= forward * accel * delta;
            velocity.x -= strafe * accel * delta;
        }

        if (controls.isLocked) {
            // Move camera via PointerLockControls
            controls.moveRight(-velocity.x * delta);
            controls.moveForward(-velocity.z * delta);

            // Clamp position if bounds are provided
            if (bounds) {
                camera.position.x = THREE.MathUtils.clamp(camera.position.x, bounds.minX, bounds.maxX);
                camera.position.z = THREE.MathUtils.clamp(camera.position.z, bounds.minZ, bounds.maxZ);
                camera.position.y = bounds.eyeY ?? camera.position.y;
            }
        }
    }

    return { controls, update };
}