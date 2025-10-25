import * as THREE from "three";
import * as CANNON from "cannon-es";
import { RoomManager } from "./rooms/RoomManager.js";
import { createPhysicsWorld } from "./physics/world.js";
import { createPlayer } from "./physics/player.js";
import { createFirstPersonControls } from "./controls.js";
import { PickupLightsManager } from "./puzzles/lights.js";
import { requestPointerLock } from "./controls.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

class BackroomsGame {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.cameras = []; // array of all cameras
    this.activeCameraIndex = 0;
    this.renderer = null;
    this.world = null;
    this.playerBody = null;
    this.controls = null;
    this.roomManager = null;

    this.pickableRoots = [];
    this.heldLight = null;
    this.clock = new THREE.Clock();

    this.isGameRunning = false;
    this.isPaused = false;
    this.footstepInterval = null;
    this.puzzleTargets = [];
    this.blinkTimeouts = [];

    // Track if mouse has moved since resuming
    this.mouseMovedSinceResume = false;

    this.init();
  }

  init() {
    this.setupStartScreen();
  }

  setupStartScreen() {
    const playButton = document.getElementById("playButton");
    const startScreen = document.getElementById("startScreen");

    playButton.addEventListener("click", () => {
      this.startGame();
      requestPointerLock(this.renderer?.domElement);
      playButton.disabled = true;
      playButton.textContent = "◾ LOADING...";

      if (window.stopStartScreenMusic) window.stopStartScreenMusic();

      startScreen.style.transition =
        "opacity 1s ease-out, transform 0.5s ease-in";
      startScreen.style.opacity = "0";
      startScreen.style.transform = "scale(0.8)";

      setTimeout(() => {
        startScreen.style.display = "none";
        document.getElementById("crosshair").style.display = "block";
      }, 1000);
    });
  }

  startGame() {
    this.setupThreeJS();
    this.setupPhysics();
    this.setupAudio();
    this.setupRoomManager();
    this.setupControls();
    this.requestPointerLock();
    this.setupEventListeners();

    this.isGameRunning = true;
    this.animate();
  }

  requestPointerLock() {
    if (this.renderer && this.renderer.domElement.requestPointerLock) {
      try {
        this.renderer.domElement.requestPointerLock({
          unadjustedMovement: true,
        });
      } catch (e) {
        this.renderer.domElement.requestPointerLock();
      }
    }
  }

  setupThreeJS() {
    this.scene = new THREE.Scene();

    // Main first-person camera
    const fpCamera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    fpCamera.position.set(0, 1.6, 0);
    this.camera = fpCamera;
    const topDownCamera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      1,
      200
    );
    topDownCamera.position.set(0, 50, 0);
    topDownCamera.lookAt(0, 0, 0);
    topDownCamera.userData.followPlayer = true;
    this.cameras = [fpCamera, topDownCamera];
    this.activeCameraIndex = 0;
    this.camera = this.cameras[this.activeCameraIndex];

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 1);
    document.body.appendChild(this.renderer.domElement);
    this.playerMarker = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xff0000 })
    );
    this.scene.add(this.playerMarker);
  }

  setupPhysics() {
    this.world = createPhysicsWorld();
    const playerSetup = createPlayer(this.world, this.camera);
    this.playerBody = playerSetup.body;
    this.syncCamera = playerSetup.syncCamera;
  }

  setupAudio() {
    const listener = new THREE.AudioListener();
    this.camera.add(listener);

    // Existing footstep audio
    this.footstepBuffer = null;
    const audioLoader = new THREE.AudioLoader();
    audioLoader.load("/audio/sfx/carpetCreak.mp3", (buffer) => {
      this.footstepBuffer = buffer;
    });

    // Add "Not A Human" as background music
    this.setupInGameMusic(listener);

    this.startAmbientFootsteps();
  }

  setupInGameMusic(listener) {
    const audio = new THREE.Audio(listener);
    const audioLoader = new THREE.AudioLoader();

    audioLoader.load("/audio/music/NotAHuman.mp3", (buffer) => {
      audio.setBuffer(buffer);
      audio.setLoop(true);
      audio.setVolume(0); // Start at volume 0 for fade in
      audio.play();

      // Store reference for later control
      this.inGameMusic = audio;
      console.log("Not A Human music started - fading in...");

      // Fade in over 3 seconds
      this.fadeInMusic(audio, 0.2, 3000); // Target volume 0.2, over 3 seconds
    });
  }

  // Add this new method to your BackroomsGame class
  fadeInMusic(audio, targetVolume, duration) {
    const startVolume = 0;
    const volumeStep = targetVolume / (duration / 50); // Update every 50ms
    let currentVolume = startVolume;

    const fadeInterval = setInterval(() => {
      currentVolume += volumeStep;

      if (currentVolume >= targetVolume) {
        currentVolume = targetVolume;
        audio.setVolume(currentVolume);
        clearInterval(fadeInterval);
        console.log("Music fade in complete");
      } else {
        audio.setVolume(currentVolume);
      }
    }, 50); // Update every 50 milliseconds for smooth fade

    // Store interval reference for cleanup if needed
    this.musicFadeInterval = fadeInterval;
  }

  startAmbientFootsteps() {
    this.playRandomFootstep();

    this.footstepInterval = setInterval(() => {
      this.playRandomFootstep();
    }, 120000);

    setTimeout(() => {
      setInterval(() => {
        if (Math.random() > 0.7) this.playRandomFootstep();
      }, 30000 + Math.random() * 60000);
    }, 15000);
  }

  playRandomFootstep() {
    if (!this.footstepBuffer) return;

    const playerPos = this.camera.position.clone();
    const angle = Math.random() * Math.PI * 2;
    const distance = 8 + Math.random() * 15;

    const randomPos = new THREE.Vector3(
      playerPos.x + Math.cos(angle) * distance,
      playerPos.y,
      playerPos.z + Math.sin(angle) * distance
    );

    const audio = new THREE.PositionalAudio(new THREE.AudioListener());
    audio.setBuffer(this.footstepBuffer);
    audio.setRefDistance(3);
    audio.setMaxDistance(25);
    audio.setRolloffFactor(2);
    audio.setVolume(0.4);
    audio.position.copy(randomPos);

    this.scene.add(audio);
    audio.play();
    audio.onEnded = () => this.scene.remove(audio);
  }

  setupRoomManager() {
    this.roomManager = new RoomManager(this.scene, this.world, this.camera);

    // Connect the game instance to model interaction manager for reset functionality
    this.roomManager.modelInteractionManager.setGameInstance(this);
  }

  setupControls() {
    this.controls = createFirstPersonControls(
      this.playerBody,
      this.camera,
      this.renderer.domElement
    );
  }

  setupEventListeners() {
    window.addEventListener("pointerdown", (event) => {
      if (!this.isPaused && this.mouseMovedSinceResume) {
        // Use only the model interaction manager (which now handles both models and lights)
        this.roomManager.modelInteractionManager.handlePointerInteraction(event);
      }
    });
    const cameraToggleBtn = document.getElementById("cameraToggleBtn");
    cameraToggleBtn.addEventListener("click", () => {
      if (!this.cameras.length) return;
      this.activeCameraIndex =
        (this.activeCameraIndex + 1) % this.cameras.length;
      this.camera = this.cameras[this.activeCameraIndex];

      console.log("Switched camera to index:", this.activeCameraIndex);
    });
    window.addEventListener("keydown", (event) => {
      if (event.code === "Escape") {
        this.isPaused ? this.resumeGame() : this.pauseGame();
      }
      if (event.code === "KeyQ") this.roomManager.lightsManager.dropHeldLight();

      if (event.code === "Key1" && this.heldLight)
        this.roomManager.lightsManager.colorMixingManager.forceColorMix(
          this.heldLight,
          0xffff00,
          0.8
        );
      if (event.code === "Key2" && this.heldLight)
        this.roomManager.lightsManager.colorMixingManager.forceColorMix(
          this.heldLight,
          0xff00ff,
          0.8
        );
      if (event.code === "Key3" && this.heldLight)
        this.roomManager.lightsManager.colorMixingManager.forceColorMix(
          this.heldLight,
          0x00ffff,
          0.8
        );
    });

    document
      .getElementById("resumeBtn")
      .addEventListener("click", () => this.resumeGame());

    // Detect mouse movement
    window.addEventListener("mousemove", () => {
      this.mouseMovedSinceResume = true;
    });

    window.addEventListener("resize", () => this.handleResize());
    window.addEventListener("beforeunload", () => this.cleanup());
  }

  pauseGame() {
    this.isPaused = true;
    document.getElementById("pauseMenu").style.display = "flex";
    document.getElementById("crosshair").style.display = "none";
    if (this.controls) this.controls.enabled = false;
    document.exitPointerLock?.();
  }

  resumeGame() {
    this.isPaused = false;
    document.getElementById("pauseMenu").style.display = "none";
    document.getElementById("crosshair").style.display = "block";
    if (this.controls) this.controls.enabled = true;
    this.requestPointerLock();

    // Reset mouseMoved flag
    this.mouseMovedSinceResume = false;
  }

  // Add this method to the BackroomsGame class
  resetWorld() {
    console.log("Resetting world...");

    // Fade to black effect
    this.createResetEffect();

    // Reset after fade effect
    setTimeout(() => {
      this.performWorldReset();
    }, 1500);
  }

  createResetEffect() {
    // Create a black overlay for fade effect
    const overlay = document.createElement("div");
    overlay.id = "resetOverlay";
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: black;
        opacity: 0;
        z-index: 1000;
        transition: opacity 1s ease-in-out;
        pointer-events: none;
    `;
    document.body.appendChild(overlay);

    // Trigger fade in
    setTimeout(() => {
      overlay.style.opacity = "1";
    }, 10);

    // Remove overlay after reset - keep it black longer
    setTimeout(() => {
      overlay.style.opacity = "0";
      setTimeout(() => {
        if (overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
      }, 1000);
    }, 2000); // Keep black overlay for 3 seconds total
  }

  performWorldReset() {
    console.log("Performing world reset...");

    // 1. Clear the entire scene (except global objects we want to keep)
    this.clearScene();

    // 2. Reset player position
    this.resetPlayerPosition();

    // 3. Destroy and recreate room manager (much simpler!)
    this.destroyRoomManager();
    this.setupRoomManager();

    // 4. Reset game state
    this.resetGameState();

    console.log("World reset complete!");
  }

  destroyRoomManager() {
    if (this.roomManager) {
      // Cancel any pending timeouts
      if (this.roomManager.pendingRoomUpdate) {
        clearTimeout(this.roomManager.pendingRoomUpdate);
      }

      // Clear reference
      this.roomManager = null;

      console.log("Room manager destroyed");
    }
  }

  resetPlayerPosition() {
    // Reset physics body position
    this.playerBody.position.set(-15, -2.1, 3); // Original spawn position
    this.playerBody.velocity.set(0, 0, 0);
    this.playerBody.angularVelocity.set(0, 0, 0);

    // Sync camera
    this.syncCamera();

    // Reset camera rotation to face forward
    this.camera.rotation.set(0, 0, 0);

    console.log("Player position reset to origin");
  }

  resetGameState() {
    // Reset any game state variables
    this.heldLight = null;
    this.puzzleTargets = [];

    // Reset mouse movement tracking
    this.mouseMovedSinceResume = false;

    // Reset crosshair state
    const crosshair = document.getElementById("crosshair");
    if (crosshair) {
      crosshair.classList.remove("hovering");
    }

    console.log("Game state cleared completely");
  }

  clearScene() {
    // Store objects we want to keep
    const objectsToKeep = [
      this.playerMarker,
      // Keep any ambient lights, cameras, etc.
    ];

    // Get all objects in the scene
    const objectsToRemove = [];
    this.scene.traverse((object) => {
      if (object !== this.scene && !objectsToKeep.includes(object)) {
        objectsToRemove.push(object);
      }
    });

    // Remove and dispose everything
    objectsToRemove.forEach((object) => {
      // Remove from parent
      if (object.parent) {
        object.parent.remove(object);
      }

      // Dispose geometry
      if (object.geometry) {
        object.geometry.dispose();
      }

      // Dispose materials
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach(mat => mat.dispose());
        } else {
          object.material.dispose();
        }
      }

      // Dispose textures
      if (object.material && object.material.map) {
        object.material.map.dispose();
      }
    });

    // Clear all physics bodies except player
    const bodiesToRemove = this.world.bodies.filter(body => body !== this.playerBody);
    bodiesToRemove.forEach(body => {
      this.world.removeBody(body);
    });

    console.log(`Cleared ${objectsToRemove.length} objects from scene`);
  }

  animate() {
    if (!this.isGameRunning) return;

    const delta = this.clock.getDelta();

    if (!this.isPaused) {
      this.world.step(1 / 60, delta, 3);

      // Only update FP controls if active camera is FP
      if (this.activeCameraIndex === 0) {
        this.controls?.update(delta);
        this.syncCamera?.();
      }

      if (this.roomManager?.lightsManager) {
        this.roomManager.lightsManager.updateHeldLight();
        this.roomManager.lightsManager.colorMixingManager.updateColorMixing();
        this.roomManager.lightsManager.checkPuzzles();
      }
      if (this.roomManager?.modelInteractionManager) {
        this.roomManager.modelInteractionManager.updateHeldMarker();
      }
      const playerPos =
        this.activeCameraIndex === 0
          ? this.camera.position
          : this.playerBody.position;

      this.roomManager?.update(playerPos);

      if (this.camera.userData.followPlayer) {
        const playerPos = this.playerBody.position;
        const targetPos = new THREE.Vector3(
          playerPos.x,
          playerPos.y + 20,
          playerPos.z
        );
        this.camera.position.lerp(targetPos, 0.1);
        this.camera.lookAt(playerPos.x, playerPos.y + 1, playerPos.z);
      }

      const crosshair = document.getElementById("crosshair");

      if (this.activeCameraIndex === 0) {
        // First-person: show crosshair normally
        if (this.mouseMovedSinceResume) {
          // Use the unified hover check
          const isHovering = this.roomManager?.modelInteractionManager?.checkInteractableHover();

          if (isHovering) {
            crosshair.classList.add("hovering");
          } else {
            crosshair.classList.remove("hovering");
          }
        } else {
          crosshair.classList.remove("hovering");
        }
        crosshair.style.display = "block";
      } else {
        crosshair.style.display = "none";
      }
      if (this.playerMarker) {
        this.playerMarker.position.copy(this.playerBody.position);
        this.playerMarker.position.y += 0.5;
        this.playerMarker.visible = this.activeCameraIndex !== 0;
      }
    }

    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(() => this.animate());
  }

  handleResize() {
    if (!this.camera || !this.renderer) return;

    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  cleanup() {
    this.blinkTimeouts.forEach((id) => clearTimeout(id));
    this.blinkTimeouts = [];
    this.isGameRunning = false;

    if (this.footstepInterval) clearInterval(this.footstepInterval);
    this.renderer?.dispose();

    this.scene?.traverse((object) => {
      if (object.geometry) object.geometry.dispose();
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach((mat) => mat.dispose());
        } else {
          object.material.dispose();
        }
      }
    });
  }
}

const game = new BackroomsGame();
window.BackroomsGame = game;
