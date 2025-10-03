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

    this.footstepBuffer = null;
    const audioLoader = new THREE.AudioLoader();
    audioLoader.load("/audio/sfx/carpetCreak.mp3", (buffer) => {
      this.footstepBuffer = buffer;
    });

    this.startAmbientFootsteps();
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
        this.roomManager.lightsManager.handlePointerInteraction(event);
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

  handleResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
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
        if (
          this.roomManager?.lightsManager?.pickableRoots?.length > 0 &&
          this.mouseMovedSinceResume
        ) {
          const raycaster = new THREE.Raycaster();
          raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
          const intersects = raycaster.intersectObjects(
            this.roomManager.lightsManager.pickableRoots,
            true
          );

          if (intersects.length > 0) crosshair.classList.add("hovering");
          else crosshair.classList.remove("hovering");
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
