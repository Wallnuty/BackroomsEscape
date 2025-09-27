import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { RoomManager } from './rooms/RoomManager.js';
import { createPhysicsWorld } from './physics/world.js';
import { createPlayer } from './physics/player.js';
import { createFirstPersonControls } from './controls.js';

// Wait for Play button to start the game
const playButton = document.getElementById('playButton');
const startScreen = document.getElementById('startScreen');

playButton.addEventListener('click', () => {
    playButton.disabled = true;
    playButton.textContent = '◾ LOADING...';

    // Stop the start screen music
    if (window.stopStartScreenMusic) {
        window.stopStartScreenMusic();
    }

    // VHS-style transition effect
    startScreen.style.transition = 'opacity 1s ease-out, transform 0.5s ease-in';
    startScreen.style.opacity = '0';
    startScreen.style.transform = 'scale(0.8)';

    setTimeout(() => {
        startScreen.style.display = 'none';
        startGame();
    }, 1000);
});

function startGame() {
    // THREE.js setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });

    // Lighting/tone mapping
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.shadowMap.enabled = true;

    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 1);
    document.body.appendChild(renderer.domElement);

    // Audio setup
    const listener = new THREE.AudioListener();
    camera.add(listener);

    // Load footstep sound buffer
    let footstepBuffer = null;
    const audioLoader = new THREE.AudioLoader();
    audioLoader.load('/audio/sfx/carpetCreak.mp3', (buffer) => {
        footstepBuffer = buffer;
    });

    // Random footstep system
    function playRandomFootstep() {
        if (!footstepBuffer) return;

        // Generate random position around the player
        const playerPos = camera.position;
        const minDistance = 5;
        const maxDistance = 25;

        // Random angle and distance
        const angle = Math.random() * Math.PI * 2;
        const distance = minDistance + Math.random() * (maxDistance - minDistance);

        // Calculate random position
        const randomPos = new THREE.Vector3(
            playerPos.x + Math.cos(angle) * distance,
            playerPos.y,
            playerPos.z + Math.sin(angle) * distance
        );

        // Create positional audio (simpler approach)
        const footstepAudio = new THREE.PositionalAudio(listener);
        footstepAudio.setBuffer(footstepBuffer);
        footstepAudio.setRefDistance(3);
        footstepAudio.setMaxDistance(25);
        footstepAudio.setRolloffFactor(2);
        footstepAudio.setVolume(0.4);
        footstepAudio.position.copy(randomPos);

        scene.add(footstepAudio);
        footstepAudio.play();

        // Clean up after the sound finishes
        footstepAudio.onEnded = () => {
            scene.remove(footstepAudio);
        };

        console.log(`👣 Footstep played at: ${randomPos.x.toFixed(1)}, ${randomPos.z.toFixed(1)}`);
    }

    // Start the random footstep timer (120000ms = 2 minutes)
    const footstepInterval = setInterval(playRandomFootstep, 120000);

    // Optional: Play first footstep after 10-30 seconds for immediate atmosphere
    setTimeout(playRandomFootstep, 10000 + Math.random() * 20000);

    // Physics world
    const world = createPhysicsWorld();

    // Player (physics body + camera sync)
    const { body: playerBody, syncCamera } = createPlayer(world, camera);
    const { update: updateControls } = createFirstPersonControls(playerBody, camera, renderer.domElement);

    // Room management - this replaces all your room creation code
    const roomManager = new RoomManager(scene, world);
    const { mainRoom } = roomManager.createLevel();

    // Animation loop
    const clock = new THREE.Clock();
    function animate() {
        const delta = clock.getDelta();
        world.step(1 / 60, delta, 3);
        updateControls(delta);
        syncCamera();
        renderer.render(scene, camera);
    }
    renderer.setAnimationLoop(animate);

    // Responsive resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Clean up interval when game ends (optional)
    window.addEventListener('beforeunload', () => {
        clearInterval(footstepInterval);
        roomManager.dispose();
    });
}
