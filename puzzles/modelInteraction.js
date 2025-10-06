import * as THREE from 'three';

export class ModelInteractionManager {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.interactableModels = [];
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

    // Handle pointer interaction with models
    handlePointerInteraction(event) {
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera({ x: 0, y: 0 }, this.camera);

        const intersects = raycaster.intersectObjects(this.interactableModels, true);

        if (intersects.length > 0) {
            let obj = intersects[0].object;

            // Find the root interactable object
            while (obj && !obj.userData.isInteractableModel) {
                obj = obj.parent;
            }

            if (obj && obj.userData.isInteractableModel) {
                this.onModelInteraction(obj);
                return true; // Interaction handled
            }
        }
        return false; // No interaction
    }

    // Check if crosshair should show hover state for models
    checkModelHover() {
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);

        const intersects = raycaster.intersectObjects(this.interactableModels, true);

        if (intersects.length > 0) {
            let obj = intersects[0].object;
            while (obj && !obj.userData.isInteractableModel) {
                obj = obj.parent;
            }

            return obj && obj.userData.isInteractableModel;
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

        // Add ballpit-specific behavior here
        // For example: trigger puzzle elements, play sounds, etc.
    }

    // Get all interactable models
    getInteractableModels() {
        return this.interactableModels;
    }

    // Clear all interactable models
    clearAll() {
        this.interactableModels = [];
    }
}