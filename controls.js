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
        // Only process movement keys if controls are locked
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

    // Reset all movement when controls are unlocked
    function resetMovement() {
        move.forward = false;
        move.backward = false;
        move.left = false;
        move.right = false;
        move.sprint = false;

        // Stop the player's momentum immediately
        playerBody.velocity.x = 0;
        playerBody.velocity.z = 0;
    }

    // Add event listeners for pointer lock changes
    document.addEventListener('pointerlockchange', () => {
        if (!controls.isLocked) {
            resetMovement();
        }
    });

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    domElement.addEventListener('click', () => controls.lock());

    // Reusable vectors
    const forwardVec = new THREE.Vector3();
    const rightVec = new THREE.Vector3();
    const moveDir = new THREE.Vector3();

    function update(delta) {
        // Only update if controls are locked
        if (!controls.isLocked) {
            // Apply stronger damping when controls are unlocked
            playerBody.velocity.x *= 0.5;
            playerBody.velocity.z *= 0.5;
            return;
        }

        // Build direction vectors
        controls.getDirection(forwardVec);
        forwardVec.y = 0; // prevent vertical influence
        forwardVec.normalize();

        rightVec.crossVectors(forwardVec, new THREE.Vector3(0, 1, 0)).normalize();

        // Reset moveDir and add input directions
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
            // Smooth damping when no keys pressed
            playerBody.velocity.x *= 0.9;
            playerBody.velocity.z *= 0.9;
        }
        // Y velocity is untouched (gravity, jumps)
    }

    return { update, controls };
}