import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

export function createFirstPersonControls(playerBody, camera, domElement) {
    const controls = new PointerLockControls(camera, domElement);
    const pauseMenu = document.getElementById('pauseMenu');
    const resumeBtn = document.getElementById('resumeBtn');

    let paused = false;
    let canInteract = false; // Track if mouse has moved since resume

    // Movement state
    const move = { forward: false, backward: false, left: false, right: false, sprint: false };
    const speed = 5;
    const sprintMultiplier = 1.6;

    // Reset movement helper
    function resetMovement() {
        move.forward = move.backward = move.left = move.right = move.sprint = false;
        playerBody.velocity.x = 0;
        playerBody.velocity.z = 0;
    }

    // Pause/unpause helper
    function setPaused(state) {
        paused = state;
        pauseMenu.style.display = paused ? 'flex' : 'none';
        document.body.style.cursor = paused ? 'auto' : 'none';
        resetMovement();
        canInteract = !paused; // Disable interactions while paused
    }

    // Toggle pause on Escape
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Escape') {
            setPaused(!paused);
            if (paused) document.exitPointerLock();
        }
    });

    // Pointer lock changes
    document.addEventListener('pointerlockchange', () => {
        paused = document.pointerLockElement !== domElement;
        pauseMenu.style.display = paused ? 'flex' : 'none';
        document.body.style.cursor = paused ? 'auto' : 'none';
        resetMovement();
        canInteract = !paused; // Only allow interaction if pointer is locked
    });

    // Key handling
    function onKeyDown(e) {
        if (paused) return;
        switch (e.code) {
            case 'KeyW': case 'ArrowUp': move.forward = true; break;
            case 'KeyS': case 'ArrowDown': move.backward = true; break;
            case 'KeyA': case 'ArrowLeft': move.left = true; break;
            case 'KeyD': case 'ArrowRight': move.right = true; break;
            case 'ShiftLeft': move.sprint = true; break;
        }
    }

    function onKeyUp(e) {
        if (paused) return;
        switch (e.code) {
            case 'KeyW': case 'ArrowUp': move.forward = false; break;
            case 'KeyS': case 'ArrowDown': move.backward = false; break;
            case 'KeyA': case 'ArrowLeft': move.left = false; break;
            case 'KeyD': case 'ArrowRight': move.right = false; break;
            case 'ShiftLeft': move.sprint = false; break;
        }
    }

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    // Resume button
    resumeBtn.addEventListener('click', () => {
        setPaused(false);

        // Slight delay to allow browser to register user gesture
        setTimeout(() => {
            requestPointerLock(domElement);
        }, 1000);
    });

    // Canvas click requests pointer lock
    domElement.addEventListener('click', (event) => {
        if (!canInteract) {
            event.stopImmediatePropagation(); // prevent accidental first click
            return;
        }
        if (!document.pointerLockElement) requestPointerLock(domElement);
    });

    // Mouse movement enables interaction
    window.addEventListener('mousemove', () => {
        canInteract = true;
    });

    // Filter large mouse movement spikes
    const maxDelta = 100;
    domElement.addEventListener('mousemove', (event) => {
        if (Math.abs(event.movementX) > maxDelta || Math.abs(event.movementY) > maxDelta) {
            event.stopPropagation();
        }
    }, { capture: true });

    // Movement vectors
    const forwardVec = new THREE.Vector3();
    const rightVec = new THREE.Vector3();
    const moveDir = new THREE.Vector3();

    function update(delta) {
        if (!controls.isLocked || paused) {
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
            playerBody.velocity.x *= 0.5;
            playerBody.velocity.z *= 0.5;
        }
    }

    return { update, controls };
}

// Request pointer lock with unadjustedMovement if supported
export function requestPointerLock(domElement) {
    if (domElement && domElement.requestPointerLock) {
        try {
            domElement.requestPointerLock({ unadjustedMovement: true });
        } catch (e) {
            domElement.requestPointerLock();
        }
    }
}
