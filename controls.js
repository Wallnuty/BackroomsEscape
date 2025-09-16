import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

export function createFirstPersonControls(playerBody, camera, domElement) {
    const controls = new PointerLockControls(camera, domElement);
    const move = { forward: false, backward: false, left: false, right: false };
    const speed = 5; // movement speed (m/s)

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

    domElement.addEventListener('click', () => controls.lock());

    function update(delta) {
        const forward = Number(move.forward) - Number(move.backward);
        const strafe = Number(move.right) - Number(move.left);

        // Get camera forward vector (ignore Y)
        const forwardVector = new THREE.Vector3();
        controls.getDirection(forwardVector);
        forwardVector.y = 0;
        forwardVector.normalize();

        // Get right vector
        const rightVector = new THREE.Vector3();
        rightVector.crossVectors(forwardVector, new THREE.Vector3(0, 1, 0)).normalize();

        // Build movement vector in THREE
        const moveDir = new THREE.Vector3();
        if (forward) moveDir.add(forwardVector.multiplyScalar(forward));
        if (strafe) moveDir.add(rightVector.multiplyScalar(strafe));
        moveDir.normalize();

        // Convert to Cannon Vec3
        const desiredVel = new CANNON.Vec3(moveDir.x * speed, playerBody.velocity.y, moveDir.z * speed);

        // Apply (preserve Y velocity for gravity/jumps)
        playerBody.velocity.copy(desiredVel);
    }

    return { update, controls };
}