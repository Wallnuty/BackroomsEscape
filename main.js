import * as THREE from 'three';
import { createRoom } from './rooms/room.js';
import { createFirstPersonControls } from './controls.js';

/*
Note:
The ground is usually the XZ plane.
Y increases as you go up.
*/

// Scene & camera
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
    75, // FOV
    window.innerWidth / window.innerHeight,
    0.005, // Near clipping plane (closest visible distance)
    1000 // Far clipping plane (farthest visible distance)
);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 1);
document.body.appendChild(renderer.domElement);

// Create a room
const roomWidth = 10, roomHeight = 5, roomDepth = 10;
const room = createRoom(roomWidth, roomHeight, roomDepth);
scene.add(room);

// Camera initial position
camera.position.set(0, 0.6, 0);
camera.lookAt(3, 0, 0.0);

// First-person controls with bounds
const bounds = {
    minX: -roomWidth / 2 + 0.1,
    maxX: roomWidth / 2 - 0.1,
    minZ: -roomDepth / 2 + 0.1,
    maxZ: roomDepth / 2 - 0.1,
    eyeY: 0.6
};

const { controls, update } = createFirstPersonControls(camera, renderer.domElement, bounds);
scene.add(camera); // Camera is automatically moved by controls

// Clock for delta time
const clock = new THREE.Clock();

// Animation loop
function animate() {
    const delta = clock.getDelta();
    update(delta);
    renderer.render(scene, camera);
}
renderer.setAnimationLoop(animate);

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
