import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { BackroomsRoom } from './rooms/BackroomsRoom.js';
import { createPhysicsWorld } from './physics/world.js';
import { createPlayer } from './physics/player.js';
import { createFirstPersonControls } from './controls.js';

// Wait for Play button to start the game
const playButton = document.getElementById('playButton');
const startScreen = document.getElementById('startScreen');

playButton.addEventListener('click', () => {
    playButton.disabled = true;
    playButton.textContent = '◾ LOADING...';
    
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

    // Audio (user clicked Play, so it's safe to start)
    const listener = new THREE.AudioListener();
    camera.add(listener);
    const sound = new THREE.Audio(listener);
    const audioLoader = new THREE.AudioLoader();
    audioLoader.load('/music/backroomsMusic.mp3', (buffer) => {
        sound.setBuffer(buffer);
        sound.setLoop(true);
        sound.setVolume(0.1);
        sound.play();
    });

    // Physics world
    const world = createPhysicsWorld();

    // Player (physics body + camera sync)
    const { body: playerBody, syncCamera } = createPlayer(world, camera);
    const { update: updateControls } = createFirstPersonControls(playerBody, camera, renderer.domElement);

    // Room
    const room = new BackroomsRoom(scene, world, 30, 5, 30);

    // Add walls
    room.addWall(new THREE.Vector3(-5, 0, -5), new THREE.Vector3(5, 0, -5), 0.4);
    room.addWall(new THREE.Vector3(-10, 0, -5), new THREE.Vector3(-15, 0, -5), 0.4);
    room.addWall(new THREE.Vector3(-7, 0, 7), new THREE.Vector3(-15, 0, 7), 0.4);
    room.addWall(new THREE.Vector3(-2, 0, 7), new THREE.Vector3(5, 0, 7), 0.4);
    room.addWall(new THREE.Vector3(5, 0, 11), new THREE.Vector3(4, 0, 11), 1);
    room.addWall(new THREE.Vector3(11, 0, -7), new THREE.Vector3(10, 0, -7), 1);
    room.addWall(new THREE.Vector3(5, 0, -15), new THREE.Vector3(5, 0, 7), 0.2);

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
}
