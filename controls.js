import * as THREE from "three";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";

export function createFirstPersonControls(playerBody, camera, domElement) {
  const controls = new PointerLockControls(camera, domElement);
  const pauseMenu = document.getElementById("pauseMenu");
  const resumeBtn = document.getElementById("resumeBtn");

  let paused = false;
  let canInteract = false;
  let keypadOpen = false; // NEW: Track if keypad is open

  // Movement state
  const move = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    sprint: false,
  };
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
    pauseMenu.style.display = paused ? "flex" : "none";
    document.body.style.cursor = paused ? "auto" : "none";
    resetMovement();
    canInteract = !paused;
  }

  // Toggle pause on Escape
  document.addEventListener("keydown", (e) => {
    if (e.code === "Escape" && !keypadOpen) {
      // Don't pause if keypad is open
      setPaused(!paused);
      if (paused) document.exitPointerLock();
    }
  });

  // Pointer lock changes
  document.addEventListener("pointerlockchange", () => {
    // Ignore pointer lock changes when keypad is open
    if (keypadOpen) {
      console.log("🔒 Pointer lock change ignored - keypad is open");
      return;
    }

    paused = document.pointerLockElement !== domElement;
    pauseMenu.style.display = paused ? "flex" : "none";
    document.body.style.cursor = paused ? "auto" : "none";
    resetMovement();
    canInteract = !paused;

    console.log("🔒 Pointer lock changed - paused:", paused);
  });

  // Key handling
  function onKeyDown(e) {
    if (paused || keypadOpen) return; // Don't process keys when keypad is open
    switch (e.code) {
      case "KeyW":
      case "ArrowUp":
        move.forward = true;
        break;
      case "KeyS":
      case "ArrowDown":
        move.backward = true;
        break;
      case "KeyA":
      case "ArrowLeft":
        move.left = true;
        break;
      case "KeyD":
      case "ArrowRight":
        move.right = true;
        break;
      case "ShiftLeft":
        move.sprint = true;
        break;
    }
  }

  function onKeyUp(e) {
    if (paused || keypadOpen) return;
    switch (e.code) {
      case "KeyW":
      case "ArrowUp":
        move.forward = false;
        break;
      case "KeyS":
      case "ArrowDown":
        move.backward = false;
        break;
      case "KeyA":
      case "ArrowLeft":
        move.left = false;
        break;
      case "KeyD":
      case "ArrowRight":
        move.right = false;
        break;
      case "ShiftLeft":
        move.sprint = false;
        break;
    }
  }

  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);

  // Resume button
  resumeBtn.addEventListener("click", () => {
    setPaused(false);
    setTimeout(() => {
      requestPointerLock(domElement);
    }, 1000);
  });

  // Canvas click requests pointer lock
  domElement.addEventListener("click", (event) => {
    if (!canInteract || keypadOpen) {
      // Don't re-lock if keypad is open
      event.stopImmediatePropagation();
      return;
    }
    if (!document.pointerLockElement) requestPointerLock(domElement);
  });

  // Mouse movement enables interaction
  window.addEventListener("mousemove", () => {
    if (!keypadOpen) canInteract = true;
  });

  // Filter large mouse movement spikes
  const maxDelta = 100;
  domElement.addEventListener(
    "mousemove",
    (event) => {
      if (
        Math.abs(event.movementX) > maxDelta ||
        Math.abs(event.movementY) > maxDelta
      ) {
        event.stopPropagation();
      }
    },
    { capture: true }
  );

  // Movement vectors
  const forwardVec = new THREE.Vector3();
  const rightVec = new THREE.Vector3();
  const moveDir = new THREE.Vector3();

  function update(delta) {
    if (!controls.isLocked || paused || keypadOpen) {
      // Stop movement when keypad is open
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

  // NEW: Method to set keypad state
  function setKeypadOpen(isOpen) {
    keypadOpen = isOpen;
    if (isOpen) {
      resetMovement();
      canInteract = false;
    }
  }

  return { update, controls, setKeypadOpen };
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
