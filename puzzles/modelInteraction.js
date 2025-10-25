import * as THREE from 'three';

export class ModelInteractionManager {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.interactableModels = [];
        this.pickupLightsManager = null;

        // Interaction distance settings - temporarily increased for debugging
        this.maxInteractionDistance = 8.0; // Increased from 4.0
        this.maxLightInteractionDistance = 4.0;
        this.maxModelInteractionDistance = 8.0; // Increased from 4.0

        // Add reference to main game for reset functionality
        this.gameInstance = null;

        this.editingWhiteboard = false;
        this.whiteboardText = '';
        this.activeWhiteboardSurface = null;

        this.played67Sound = false; // Add this flag

        // Listen for keyboard input
        window.addEventListener('keydown', (e) => this.handleWhiteboardInput(e));

        this.markerAnimState = {
            isAnimating: false,
            lastTypedTime: 0,
            phase: 0, // 0 = up-right, 1 = down-left
            t: 0,     // animation progress (0 to 1)
            direction: 1 // 1 = forward, -1 = backward
        };
    }

    // Set reference to main game instance
    setGameInstance(gameInstance) {
        this.gameInstance = gameInstance;
    }

    // Set reference to pickup lights manager
    setPickupLightsManager(lightsManager) {
        this.pickupLightsManager = lightsManager;
    }

    // Register interactable models
    setInteractableModels(models) {
        this.interactableModels = models;
    }

    // Add a single interactable model
    addInteractableModel(modelGroup) {
        if (!this.interactableModels.includes(modelGroup)) {
            this.interactableModels.push(modelGroup);
        }
    }

    // Remove a model from interactables
    removeInteractableModel(modelGroup) {
        const index = this.interactableModels.indexOf(modelGroup);
        if (index > -1) {
            this.interactableModels.splice(index, 1);
        }
    }

    // Get all interactable objects (models + pickup lights)
    getAllInteractableObjects() {
        const allObjects = [...this.interactableModels];

        // Add pickup lights if available
        if (this.pickupLightsManager && this.pickupLightsManager.pickableRoots) {
            allObjects.push(...this.pickupLightsManager.pickableRoots);
        }

        return allObjects;
    }

    // Check if an object is within interaction distance
    isWithinInteractionDistance(object) {
        const objectPosition = new THREE.Vector3();
        object.getWorldPosition(objectPosition);

        const cameraPosition = this.camera.position;
        const distance = cameraPosition.distanceTo(objectPosition);

        // Use different max distances based on object type
        if (object.userData.isPickupLight) {
            return distance <= this.maxLightInteractionDistance;
        } else if (object.userData.isInteractableModel) {
            // If model specifies its own interaction distance, use it; otherwise use global default
            const modelMax = (typeof object.userData.interactionDistance === 'number')
                ? object.userData.interactionDistance
                : this.maxModelInteractionDistance;
            return distance <= modelMax;
        }

        return distance <= this.maxInteractionDistance;
    }

    // Handle pointer interaction with all interactable objects
    handlePointerInteraction(event) {
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera({ x: 0, y: 0 }, this.camera);

        // If we're holding a light, always drop it on any click (no distance check for dropping)
        if (this.pickupLightsManager && this.pickupLightsManager.heldLight) {
            this.pickupLightsManager.dropHeldLight();
            return true;
        }

        const allInteractables = this.getAllInteractableObjects();
        console.log('All interactables:', allInteractables.length); // Debug

        const intersects = raycaster.intersectObjects(allInteractables, true);
        console.log('Intersects found:', intersects.length); // Debug

        if (intersects.length > 0) {
            let obj = intersects[0].object;
            console.log('Hit object:', obj.name, obj.type); // Debug

            // Find the root interactable object
            while (obj && !obj.userData.isInteractableModel && !obj.userData.isPickupLight) {
                obj = obj.parent;
            }

            if (obj) {
                console.log('Root interactable found:', obj.name, obj.userData); // Debug

                // Get distance for debugging
                const objectPosition = new THREE.Vector3();
                obj.getWorldPosition(objectPosition);
                const distance = this.camera.position.distanceTo(objectPosition);
                console.log('Distance to object:', distance, 'Max allowed:', this.maxModelInteractionDistance); // Debug
                console.log('Camera position:', this.camera.position); // Debug
                console.log('Object position:', objectPosition); // Debug

                // Check if object is within interaction distance
                if (!this.isWithinInteractionDistance(obj)) {
                    console.log('Object too far away to interact with');
                    return false;
                }

                if (obj.userData.isPickupLight) {
                    // Pick up the light (we already checked we're not holding one above)
                    this.pickupLightsManager.pickupSpecificLight(obj);
                    return true;
                } else if (obj.userData.isInteractableModel) {
                    // Handle model interaction
                    this.onModelInteraction(obj);
                    return true;
                }
            } else {
                console.log('No root interactable object found'); // Debug
            }
        } else {
            console.log('No intersects found with raycaster'); // Debug
        }
        return false; // No interaction
    }

    // Check if crosshair should show hover state for any interactable
    checkInteractableHover() {
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);

        const allInteractables = this.getAllInteractableObjects();
        const intersects = raycaster.intersectObjects(allInteractables, true);

        if (intersects.length > 0) {
            let obj = intersects[0].object;
            while (obj && !obj.userData.isInteractableModel && !obj.userData.isPickupLight) {
                obj = obj.parent;
            }

            // Only show hover state if object exists AND is within interaction distance
            if (obj && (obj.userData.isInteractableModel || obj.userData.isPickupLight)) {
                return this.isWithinInteractionDistance(obj);
            }
        }
        return false;
    }

    // Specific interaction handlers
    handleSlideInteraction(modelGroup) {
        console.log('You interacted with the slide! 🛝');
        console.log('The world begins to dissolve around you...');

        // Trigger world reset
        if (this.gameInstance) {
            this.gameInstance.resetWorld();
        }
    }

    // Call this when the user interacts with the whiteboard
    async startWhiteboardEditing(displaySurface) {
        this.editingWhiteboard = true;
        this.activeWhiteboardSurface = displaySurface;
        // Optionally reset text or keep previous
        await displaySurface.drawText(this.whiteboardText, {
            rotation: Math.PI / 2,
            fontSize: 200,
            y: 640,
            scaleX: 0.5
        });
    }

    stopWhiteboardEditing() {
        this.editingWhiteboard = false;
        this.activeWhiteboardSurface = null;
    }

    async handleWhiteboardInput(e) {
        // Only allow typing if looking at whiteboard and in range
        const focusedSurface = this.getActiveWhiteboardSurface();
        if (!focusedSurface) {
            this.editingWhiteboard = false;
            this.activeWhiteboardSurface = null;
            return;
        }

        // If puzzle is completed, ignore further typing
        if (this.gameInstance && this.gameInstance.roomManager && this.gameInstance.roomManager.puzzleCompleted) {
            return;
        }

        // If not already editing, start now
        if (!this.editingWhiteboard || this.activeWhiteboardSurface !== focusedSurface) {
            this.editingWhiteboard = true;
            this.activeWhiteboardSurface = focusedSurface;
        }

        let previousText = this.whiteboardText;

        // Only allow digits, max 3 chars
        if (e.key.length === 1 && this.whiteboardText.length < 3 && /^[0-9]$/.test(e.key)) {
            this.whiteboardText += e.key;
        } else if (e.key === 'Backspace') {
            this.whiteboardText = this.whiteboardText.slice(0, -1);
        }

        // Reset sound flag if text changed
        if (this.whiteboardText !== previousText) {
            this.played67Sound = false;
            // --- Start marker animation ---
            this.markerAnimState.lastTypedTime = performance.now();
            this.markerAnimState.isAnimating = true;
        }

        await this.activeWhiteboardSurface.drawText(this.whiteboardText, {
            rotation: Math.PI / 2,
            fontSize: 200,
            y: 640,
            scaleX: 0.5
        });

        // Play sound if text is "67" and hasn't played yet
        if (this.whiteboardText === '67' && !this.played67Sound) {
            const audio = new Audio('/audio/sfx/67.mp3');
            audio.play();
            this.played67Sound = true;
        }

        // If text is "213", mark puzzle as completed and disable further typing
        if (this.whiteboardText === '213' && this.gameInstance && this.gameInstance.roomManager) {
            this.gameInstance.roomManager.puzzleCompleted = true;
            console.log('Whiteboard puzzle completed!');
            this.gameInstance.roomManager.turnOffAllLights();

            // --- Cut the THREE.js music ---
            if (this.gameInstance.inGameMusic) {
                this.gameInstance.inGameMusic.stop();
            }

            // --- Play powerCut.mp3 sound effect ---
            const audio = new Audio('/audio/sfx/powerCut.mp3');
            audio.play();

            // --- Remove held marker ---
            this.removeHeldMarker();

            this.editingWhiteboard = false;
            this.activeWhiteboardSurface = null;
        }
    }

    // Handle model interactions
    async onModelInteraction(modelGroup) {
        console.log(`Interacted with model: ${modelGroup.userData.modelPath}`);

        // Marker pickup logic
        if (modelGroup.userData.modelPath && modelGroup.userData.modelPath.toLowerCase().includes('marker')) {
            this.pickupMarker(modelGroup);
            return;
        }

        // Model-specific interactions - check for slide
        if (modelGroup.userData.modelPath && modelGroup.userData.modelPath.toLowerCase().includes('slide')) {
            this.handleSlideInteraction(modelGroup);
            return;
        }

        // If model has a DisplaySurface attached anywhere under it, draw the code when clicked
        let displaySurface = null;
        modelGroup.traverse(o => {
            if (o.userData && o.userData.displaySurface) displaySurface = o.userData.displaySurface;
        });
        if (displaySurface) {
            // --- NEW LOGIC: Require marker to write ---
            if (!this.hasMarker) {
                showTemporaryMessage("Nothing to write with");
                return;
            }
            showTemporaryMessage("Use your number keys");
            return;
        }

        // Add more model-specific interactions as needed
    }

    // Add this new method:
    pickupMarker(modelGroup) {
        // Remove from scene and interactables
        if (modelGroup.parent) modelGroup.parent.remove(modelGroup);
        this.removeInteractableModel(modelGroup);

        this.hasMarker = true;
        this.heldMarker = modelGroup;

        // --- Add held marker to camera ---
        if (!this.heldMarkerObject && this.camera) {
            // Clone the marker model for the HUD
            const heldMarker = modelGroup.clone(true);
            heldMarker.traverse(obj => {
                if (obj.material) obj.material = obj.material.clone();
            });
            heldMarker.position.set(0, 0, -1); // Adjust for bottom left
            heldMarker.scale.set(0.8, 0.8, 0.8); // Adjust size as needed
            heldMarker.rotation.set(0.2, 0, -0.5); // Adjust for a natural look

            this.scene.add(heldMarker);
            this.heldMarkerObject = heldMarker;
        }
    }

    removeHeldMarker() {
        if (this.heldMarkerObject && this.scene) {
            this.scene.remove(this.heldMarkerObject);
            this.heldMarkerObject = null;
            this.hasMarker = false;
            this.heldMarker = null;
        }
    }

    // Get all interactable models
    getInteractableModels() {
        return this.interactableModels;
    }

    // Clear all interactable models
    clearAll() {
        this.interactableModels = [];
    }

    // Optional: Method to update interaction distances at runtime
    setInteractionDistances({ light = 2.5, model = 3.5, general = 3.0 } = {}) {
        this.maxLightInteractionDistance = light;
        this.maxModelInteractionDistance = model;
        this.maxInteractionDistance = general;
    }

    getActiveWhiteboardSurface() {
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera({ x: 0, y: 0 }, this.camera);

        const allInteractables = this.getAllInteractableObjects();
        const intersects = raycaster.intersectObjects(allInteractables, true);

        if (intersects.length > 0) {
            let obj = intersects[0].object;
            while (obj && !obj.userData.isInteractableModel && !obj.userData.isPickupLight) {
                obj = obj.parent;
            }
            if (
                obj &&
                obj.userData.isInteractableModel &&
                obj.userData.modelPath &&
                obj.userData.modelPath.toLowerCase().includes('whiteboard.glb') &&
                this.isWithinInteractionDistance(obj)
            ) {
                let displaySurface = null;
                obj.traverse(o => {
                    if (o.userData && o.userData.displaySurface) displaySurface = o.userData.displaySurface;
                });
                return displaySurface;
            }
        }
        return null;
    }

    // Robust held-marker update — use camera world position & quaternion, non-mutating vectors
    updateHeldMarker() {
        if (!this.heldMarkerObject || !this.camera) return;

        const holdDistance = 1.1;
        // Default (rest) position
        const baseVertical = -0.5;
        const baseHorizontal = 0.9;

        // Animation endpoints
        const upright = { vertical: 0.1, horizontal: 0.4 };  // up, right
        const downleft = { vertical: -0.3, horizontal: -0.3 };  // down, left

        // Animation timing
        const now = performance.now();
        const anim = this.markerAnimState;
        const ANIM_DURATION = 0.22; // seconds for each half
        const ACTIVE_TIMEOUT = 400; // ms

        let verticalOffset = baseVertical;
        let horizontalOffset = baseHorizontal;

        if (anim.isAnimating && now - anim.lastTypedTime < ACTIVE_TIMEOUT) {
            // Animate between upright and downleft
            anim.t += (1 / 60) / ANIM_DURATION * anim.direction; // assuming ~60fps

            if (anim.t > 1) {
                anim.t = 1;
                anim.direction = -1;
            } else if (anim.t < 0) {
                anim.t = 0;
                anim.direction = 1;
            }

            verticalOffset = THREE.MathUtils.lerp(upright.vertical, downleft.vertical, anim.t);
            horizontalOffset = THREE.MathUtils.lerp(upright.horizontal, downleft.horizontal, anim.t);
        } else {
            // Not animating, reset to default
            anim.isAnimating = false;
            anim.t = 0;
            anim.direction = 1;
        }

        // --- Position and rotation logic (unchanged) ---
        const camPos = new THREE.Vector3();
        const camQuat = new THREE.Quaternion();
        this.camera.getWorldPosition(camPos);
        this.camera.getWorldQuaternion(camQuat);

        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camQuat).normalize();
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camQuat).normalize();
        const right = new THREE.Vector3().crossVectors(forward, up).normalize();

        const holdPosition = camPos.clone()
            .add(forward.clone().multiplyScalar(holdDistance))
            .add(right.clone().multiplyScalar(horizontalOffset))
            .add(up.clone().multiplyScalar(verticalOffset));

        this.heldMarkerObject.position.copy(holdPosition);
        this.heldMarkerObject.quaternion.copy(camQuat);

        const tilt = new THREE.Quaternion();
        tilt.setFromEuler(new THREE.Euler(0.2, 3, -0.5, 'XYZ'));
        this.heldMarkerObject.quaternion.multiply(tilt);
    }
}

// Show temporary message on the screen
function showTemporaryMessage(msg, duration = 2000) {
    let messageDiv = document.getElementById('whiteboardMessage');
    if (!messageDiv) {
        messageDiv = document.createElement('div');
        messageDiv.id = 'whiteboardMessage';
        messageDiv.style.position = 'fixed';
        messageDiv.style.bottom = '5%';
        messageDiv.style.left = '50%';
        messageDiv.style.transform = 'translateX(-50%)';
        messageDiv.style.background = 'rgba(0,0,0,0.7)';
        messageDiv.style.color = '#fff';
        messageDiv.style.padding = '12px 24px';
        messageDiv.style.borderRadius = '8px';
        messageDiv.style.fontSize = '1.2em';
        messageDiv.style.zIndex = '1000';
        document.body.appendChild(messageDiv);
    }
    messageDiv.textContent = msg;
    messageDiv.style.display = 'block';
    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, duration);
}