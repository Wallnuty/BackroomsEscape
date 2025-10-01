import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { RoomManager } from './rooms/RoomManager.js';
import { createPhysicsWorld } from './physics/world.js';
import { createPlayer } from './physics/player.js';
import { createFirstPersonControls } from './controls.js';
import { PickupLightsManager } from './puzzles/lights.js';

class BackroomsGame {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.world = null;
        this.playerBody = null;
        this.controls = null;
        this.roomManager = null; // Add this

        this.pickableRoots = [];
        this.heldLight = null;
        this.clock = new THREE.Clock();

        this.isGameRunning = false;
        this.footstepInterval = null;

        this.puzzleTargets = []; // For color puzzle objectives


        this.init();
    }

    init() {
        this.setupStartScreen();
    }

    setupStartScreen() {
        const playButton = document.getElementById('playButton');
        const startScreen = document.getElementById('startScreen');

        playButton.addEventListener('click', () => {
            this.startGame();
            playButton.disabled = true;
            playButton.textContent = '◾ LOADING...';

            if (window.stopStartScreenMusic) {
                window.stopStartScreenMusic();
            }

            startScreen.style.transition = 'opacity 1s ease-out, transform 0.5s ease-in';
            startScreen.style.opacity = '0';
            startScreen.style.transform = 'scale(0.8)';

            setTimeout(() => {
                startScreen.style.display = 'none';
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
                // @ts-ignore
                this.renderer.domElement.requestPointerLock({ unadjustedMovement: true });
            } catch (e) {
                this.renderer.domElement.requestPointerLock();
            }
        }
    }

    setupThreeJS() {
        this.scene = new THREE.Scene();

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 1.6, 0);

        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            powerPreference: "high-performance"
        });
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x000000, 1);
        document.body.appendChild(this.renderer.domElement);
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
        audioLoader.load('/audio/sfx/carpetCreak.mp3', (buffer) => {
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
                if (Math.random() > 0.7) {
                    this.playRandomFootstep();
                }
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
        audio.onEnded = () => {
            this.scene.remove(audio);
        };
    }

    setupRoomManager() {
        // Instantiate RoomManager and create initial room(s)
        this.roomManager = new RoomManager(this.scene, this.world, this.camera);
    }

    setupControls() {
        const controls = createFirstPersonControls(this.playerBody, this.camera, this.renderer.domElement);
        this.controls = controls;
    }

    setupEventListeners() {
        window.addEventListener('pointerdown', (event) => {
            this.roomManager.lightsManager.handlePointerInteraction(event);
        });

        window.addEventListener('keydown', (event) => {
            if (event.code === 'KeyQ' || event.code === 'Escape') {
                this.roomManager.lightsManager.dropHeldLight();
            }

            // Debug: Force color mixes
            if (event.code === 'Key1' && this.heldLight) {
                this.roomManager.lightsManager.colorMixingManager.forceColorMix(this.heldLight, 0xffff00, 0.8);
            }
            if (event.code === 'Key2' && this.heldLight) {
                this.roomManager.lightsManager.colorMixingManager.forceColorMix(this.heldLight, 0xff00ff, 0.8);
            }
            if (event.code === 'Key3' && this.heldLight) {
                this.roomManager.lightsManager.colorMixingManager.forceColorMix(this.heldLight, 0x00ffff, 0.8);
            }
        });

        window.addEventListener('resize', () => {
            this.handleResize();
        });

        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
    }

    handleResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        if (!this.isGameRunning) return;

        const delta = this.clock.getDelta();

        this.world.step(1 / 60, delta, 3);

        if (this.controls && this.controls.update) {
            this.controls.update(delta);
        }

        if (this.syncCamera) {
            this.syncCamera();
        }

        // Use lightsManager from roomManager
        if (this.roomManager && this.roomManager.lightsManager) {
            this.roomManager.lightsManager.updateHeldLight();
            this.roomManager.lightsManager.colorMixingManager.updateColorMixing();
            this.roomManager.lightsManager.checkPuzzles();
        }

        // Update room manager with player position
        if (this.roomManager) {
            this.roomManager.update(this.camera.position);
        }

        this.renderer.render(this.scene, this.camera);

        requestAnimationFrame(() => this.animate());
    }

    cleanup() {
        this.isGameRunning = false;

        if (this.footstepInterval) {
            clearInterval(this.footstepInterval);
        }

        if (this.renderer) {
            this.renderer.dispose();
        }

        if (this.scene) {
            this.scene.traverse((object) => {
                if (object.geometry) object.geometry.dispose();
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(material => material.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            });
        }
    }
}

// Initialize the game
const game = new BackroomsGame();
window.BackroomsGame = game;