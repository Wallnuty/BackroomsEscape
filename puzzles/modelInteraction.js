import * as THREE from 'three';

export class ModelInteractionManager {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.interactableModels = [];
        this.pickupLightsManager = null;

        // Interaction distance settings
        this.maxInteractionDistance = 4.0;
        this.maxLightInteractionDistance = 4.0;
        this.maxModelInteractionDistance = 4.0;

        // Add reference to main game for reset functionality
        this.gameInstance = null;
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
            return distance <= this.maxModelInteractionDistance;
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
        const intersects = raycaster.intersectObjects(allInteractables, true);

        if (intersects.length > 0) {
            let obj = intersects[0].object;

            // Find the root interactable object
            while (obj && !obj.userData.isInteractableModel && !obj.userData.isPickupLight) {
                obj = obj.parent;
            }

            if (obj) {
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
            }
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

    // Handle model interactions
    onModelInteraction(modelGroup) {
        console.log(`Interacted with model: ${modelGroup.userData.modelPath}`);

        // Model-specific interactions
        if (modelGroup.userData.modelPath.includes('ballpit')) {
            this.handleBallpitInteraction(modelGroup);
        }

        // Add more model-specific interactions as needed
    }

    // Specific interaction handlers
    handleBallpitInteraction(modelGroup) {
        console.log('You interacted with the ballpit! 🎾');
        console.log('The world begins to dissolve around you...');

        // Trigger world reset
        if (this.gameInstance) {
            this.gameInstance.resetWorld();
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
}