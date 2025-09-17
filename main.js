import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { createRoom } from './rooms/room.js';
import { createPhysicsWorld } from './physics/world.js';
import { createPlayer } from './physics/player.js';
import { createFirstPersonControls } from './controls.js';

// THREE.js setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });

// --- OPTIMIZATION: Add physically correct lighting settings ---
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
renderer.shadowMap.enabled = true; // Enable shadow map support

renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 1);
document.body.appendChild(renderer.domElement);

// Audio
const listener = new THREE.AudioListener();
camera.add(listener);

const sound = new THREE.Audio(listener);
const audioLoader = new THREE.AudioLoader();
audioLoader.load('/music/backroomsMusic.mp3', function (buffer) {
    sound.setBuffer(buffer);
    sound.setLoop(true);
    sound.setVolume(0.1);
});

// Start music on first click to comply with browser autoplay policies
const startAudio = () => {
    if (!sound.isPlaying) {
        sound.play();
    }
    renderer.domElement.removeEventListener('click', startAudio);
};
renderer.domElement.addEventListener('click', startAudio);

// Physics world
const world = createPhysicsWorld();

// Player (physics body + camera sync)
const { body: playerBody, syncCamera } = createPlayer(world, camera);
const { update: updateControls } = createFirstPersonControls(playerBody, camera, renderer.domElement);

// Room
const room = createRoom(30, 5, 30, { world: world });
scene.add(room);

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
