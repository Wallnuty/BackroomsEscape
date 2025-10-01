import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

export function createFirstPersonControls(playerBody, camera, domElement) {
    const controls = new PointerLockControls(camera, domElement);

    // Movement state
    const move = { forward: false, backward: false, left: false, right: false, sprint: false };
    const speed = 5; // m/s
    const sprintMultiplier = 1.6;

    // Event listeners
    function onKeyDown(e) {
        if (!controls.isLocked) return;

        switch (e.code) {
            case 'KeyW': case 'ArrowUp': move.forward = true; break;
            case 'KeyS': case 'ArrowDown': move.backward = true; break;
            case 'KeyA': case 'ArrowLeft': move.left = true; break;
            case 'KeyD': case 'ArrowRight': move.right = true; break;
            case 'ShiftLeft': move.sprint = true; break;
        }
    }

    function onKeyUp(e) {
        switch (e.code) {
            case 'KeyW': case 'ArrowUp': move.forward = false; break;
            case 'KeyS': case 'ArrowDown': move.backward = false; break;
            case 'KeyA': case 'ArrowLeft': move.left = false; break;
            case 'KeyD': case 'ArrowRight': move.right = false; break;
            case 'ShiftLeft': move.sprint = false; break;
        }
    }

    function resetMovement() {
        move.forward = false;
        move.backward = false;
        move.left = false;
        move.right = false;
        move.sprint = false;

        playerBody.velocity.x = 0;
        playerBody.velocity.z = 0;
    }

    document.addEventListener('pointerlockchange', () => {
        if (!controls.isLocked) resetMovement();
    });


    domElement.addEventListener('click', () => {
        requestPointerLock(domElement);
    });

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);



    // Filter large movement spikes
    const maxDelta = 100; // pixels/frame, adjust as needed
    domElement.addEventListener('mousemove', (event) => {
        if (Math.abs(event.movementX) > maxDelta || Math.abs(event.movementY) > maxDelta) {
            event.stopPropagation();
        }
    }, { capture: true });

    // Reusable vectors
    const forwardVec = new THREE.Vector3();
    const rightVec = new THREE.Vector3();
    const moveDir = new THREE.Vector3();

    function update(delta) {
        if (!controls.isLocked) {
            playerBody.velocity.x *= 0.5;
            playerBody.velocity.z *= 0.5;
            return;
        }

        controls.getDirection(forwardVec);
        forwardVec.y = 0;
        forwardVec.normalize();

        rightVec.crossVectors(forwardVec, new THREE.Vector3(0, 1, 0)).normalize();

        moveDir.set(0, 0, 0);
        if (move.forward) moveDir.add(forwardVec);
        if (move.backward) moveDir.sub(forwardVec);
        if (move.right) moveDir.add(rightVec);
        if (move.left) moveDir.sub(rightVec);

        if (moveDir.lengthSq() > 0) {
            moveDir.normalize();
            const currentSpeed = move.sprint ? speed * sprintMultiplier : speed;
            playerBody.velocity.x = moveDir.x * currentSpeed;
            playerBody.velocity.z = moveDir.z * currentSpeed;
        } else {
            playerBody.velocity.x *= 0.9;
            playerBody.velocity.z *= 0.9;
        }
    }

    return { update, controls };
}

// Request pointer lock with unadjustedMovement if supported
export function requestPointerLock(domElement) {
    if (domElement && domElement.requestPointerLock) {
        try {
            // @ts-ignore
            domElement.requestPointerLock({ unadjustedMovement: true });
        } catch (e) {
            domElement.requestPointerLock();
        }
    }
}
