import * as THREE from "three";
import { KeypadUI } from "../props/keypadUI.js";
import { NumberDisplayUI } from "../props/numberDisplayUI.js";

// Example password array (fixed)
export const passwordArray = [1, 5, 3, 2];

// Player’s current input array (starts empty)
export let playerCodeArray = [null, null, null, null];

// Optional array to store “correctly entered codes”
export let correctCodesArray = [];

export class ModelInteractionManager {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.puzzleImages = {
      puzzle1: null,
      puzzle2: null,
    };

    this.interactableModels = [];
    this.pickupLightsManager = null;
    this.pointerLockControls = null; // store PointerLockControls instance
    this.controlsPaused = false; // new flag

    this.keypadUI = new KeypadUI();
    this.numberDisplayUI = new NumberDisplayUI(); // Add this line
    // Interaction distance settings - temporarily increased for debugging
    this.maxInteractionDistance = 8.0; // Increased from 4.0
    this.maxLightInteractionDistance = 4.0;
    this.maxModelInteractionDistance = 8.0; // Increased from 4.0

    // Add reference to main game for reset functionality
    this.gameInstance = null;

    this.puzzle1Completed = false;
  }
  setKeypadUI(keypadUI) {
    this.keypadUI = keypadUI;
  }
  setPointerLockControls(controls) {
    this.pointerLockControls = controls;
    console.log("🔧 Setting controls on ModelInteractionManager:", controls);
    // Make sure KeypadUI has reference to controls
    if (this.keypadUI) {
      this.keypadUI.pointerLockControls = controls;
      console.log(
        "🔧 Controls passed to KeypadUI:",
        this.keypadUI.pointerLockControls
      );
    }
  }
  // In ModelInteractionManager class
  setControlsWrapper(controlsWrapper) {
    if (this.keypadUI) {
      this.keypadUI.controlsWrapper = controlsWrapper;
      console.log("✅ Controls wrapper set on KeypadUI:", !!controlsWrapper);
    }
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
      const isPlayground =
        this.gameInstance?.currentRoom?.constructor.name === "PlaygroundRoom";
      if (!isPlayground) {
        allObjects.push(...this.pickupLightsManager.pickableRoots);
      }
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
    if (this.keypadUI?.isVisible) return false;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera({ x: 0, y: 0 }, this.camera);

    const interactables = this.getAllInteractableObjects().filter((obj) =>
      this.isWithinInteractionDistance(obj)
    );

    const intersects = raycaster.intersectObjects(interactables, true);

    if (intersects.length > 0) {
      let obj = intersects[0].object;

      // Check if it is the teleport slide
      if (obj.userData.isTeleportSlide && this.gameInstance) {
        this.gameInstance.teleportToPlayground();
        return; // Skip other interactions
      }
      // If we're holding a light, always drop it on any click (no distance check for dropping)
      if (this.pickupLightsManager && this.pickupLightsManager.heldLight) {
        this.pickupLightsManager.dropHeldLight();
        return true;
      }

      const allInteractables = this.getAllInteractableObjects();
      console.log("All interactables:", allInteractables.length); // Debug

      console.log("Intersects found:", intersects.length); // Debug

      if (intersects.length > 0) {
        let obj = intersects[0].object;
        console.log("Hit object:", obj.name, obj.type); // Debug

        // Find the root interactable object
        while (
          obj &&
          !obj.userData.isInteractableModel &&
          !obj.userData.isPickupLight
        ) {
          obj = obj.parent;
        }

        if (obj) {
          console.log("Root interactable found:", obj.name, obj.userData); // Debug

          // Get distance for debugging
          const objectPosition = new THREE.Vector3();
          obj.getWorldPosition(objectPosition);
          const distance = this.camera.position.distanceTo(objectPosition);
          console.log(
            "Distance to object:",
            distance,
            "Max allowed:",
            this.maxModelInteractionDistance
          ); // Debug
          console.log("Camera position:", this.camera.position); // Debug
          console.log("Object position:", objectPosition); // Debug

          // Check if object is within interaction distance
          if (!this.isWithinInteractionDistance(obj)) {
            console.log("Object too far away to interact with");
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
          console.log("No root interactable object found"); // Debug
        }
      } else {
        console.log("No intersects found with raycaster"); // Debug
      }
      return false; // No interaction
    }
  }

  // Check if crosshair should show hover state for any interactable
  checkInteractableHover() {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);

    const allInteractables = this.getAllInteractableObjects();
    const intersects = raycaster.intersectObjects(allInteractables, true);

    if (intersects.length > 0) {
      let obj = intersects[0].object;
      while (
        obj &&
        !obj.userData.isInteractableModel &&
        !obj.userData.isPickupLight
      ) {
        obj = obj.parent;
      }

      // Only show hover state if object exists AND is within interaction distance
      if (
        obj &&
        (obj.userData.isInteractableModel || obj.userData.isPickupLight)
      ) {
        return this.isWithinInteractionDistance(obj);
      }
    }
    return false;
  }

  handleSlideInteraction(modelGroup) {
    console.log("Slide clicked! Loading playground...");
    if (this.gameInstance && this.gameInstance.roomManager) {
      // Clear all interactable models first
      this.clearAll();

      // Reset the RoomManager to load the Playground and connected rooms
      this.gameInstance.roomManager.loadConnectedRooms();

      // Reset model interaction manager references
      this.setInteractableModels([]);
      if (this.pickupLightsManager) {
        if (
          this.pickupLightsManager &&
          this.pickupLightsManager.pickableRoots
        ) {
          this.pickupLightsManager.pickableRoots.forEach((lightGroup) => {
            clearColorMixing(lightGroup);
          });
        }
      }

      console.log("Playground loaded successfully.");
    }
  }

  // Handle model interactions
  onModelInteraction(modelGroup) {
    console.log(`Interacted with model: ${modelGroup.userData.modelPath}`);
    console.log("Current puzzle1Completed:", this.puzzle1Completed);
    if (modelGroup.userData.type === "numberDisplay" && this.numberDisplayUI) {
      const number = modelGroup.userData.displayNumber || 0;
      console.log("📊 Number display clicked! Number:", number);
      this.numberDisplayUI.show(number);
      return;
    }

    // Check if it's a teleport slide
    if (modelGroup.userData.type === "keypad" && this.keypadUI) {
      // Check if this keypad is already solved
      if (modelGroup.userData.isSolved) {
        console.log("⚠️ Keypad already solved - ignoring interaction");
        return;
      }

      const code = modelGroup.userData.code || "";
      console.log("✅ Keypad clicked! Code:", code);
      this.keypadUI.currentKeypadModel = modelGroup;

      // Make sure KeypadUI has the controls reference (safety check)
      if (this.pointerLockControls && !this.keypadUI.pointerLockControls) {
        this.keypadUI.pointerLockControls = this.pointerLockControls;
      }

      console.log(
        "🔒 Pointer lock status before show:",
        this.pointerLockControls?.isLocked
      );
      console.log(
        "🔒 KeypadUI has controls?",
        !!this.keypadUI.pointerLockControls
      );

      // Set the correct code for this keypad
      this.keypadUI.correctCode = code;

      // Show the popup (KeypadUI's show() method will handle unlocking)
      this.keypadUI.show();

      console.log(
        "🔒 Pointer lock status after show:",
        this.pointerLockControls?.isLocked
      );

      return; // Don't process through password array system
    }
    // Otherwise, handle puzzle code if it has one
    if (modelGroup.userData.code !== undefined) {
      this.handleModelClick(modelGroup);

      if (this.checkPasswordComplete()) {
        console.log("Password complete! Trigger next event...");
        this.puzzle1Completed = true;
        if (this.puzzleImages.puzzle1) {
          this.puzzleImages.puzzle1.setImage("textures/walls/HappyFace.png");
        }
      }

      if (this.checkAnotherPuzzleComplete()) {
        console.log("Puzzle 2 complete!");
        if (this.puzzleImages.puzzle2) {
          this.puzzleImages.puzzle2.setImage("textures/puzzle2_solved.png");
        }
      }
    }

    // You could also have other slide-specific behavior here
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

  handleModelClick(model) {
    const emptyIndex = playerCodeArray.findIndex((slot) => slot === null);
    const modelCode = Number(model.userData.code);
    
    if (this.puzzle1Completed) {
        console.log(`Puzzle solved → forced incorrect sound for model ${modelCode}`);
      this.playIncorrectSound(model);
      return;
    }
    if (emptyIndex === -1) return; // all slots full

    console.log(typeof modelCode, typeof passwordArray[emptyIndex]);

    playerCodeArray[emptyIndex] = modelCode;
    
    if (modelCode === passwordArray[emptyIndex]) {
      correctCodesArray.push(modelCode);
      this.playCorrectSound(model);
      console.log(`Correct code ${modelCode} at slot ${emptyIndex}`);
    } else {
      this.playIncorrectSound(model);
      console.log(`Incorrect code ${modelCode} at slot ${emptyIndex}`);
      // Reset everything
      playerCodeArray.fill(null);
      correctCodesArray.length = 0;
    }
  }

  setAudioListener(listener) {
    this.audioListener = listener;
    this.audioLoader = new THREE.AudioLoader();
    this._audioBufferCache = new Map(); // path -> AudioBuffer
  }

  // preload a single audio file (returns a Promise)
  preloadAudio(audioPath) {
    if (!this.audioLoader) {
      return Promise.reject(
        new Error(
          "AudioListener not set. Call setAudioListener(listener) first."
        )
      );
    }
    if (!audioPath) return Promise.resolve(null);
    if (this._audioBufferCache.has(audioPath))
      return Promise.resolve(this._audioBufferCache.get(audioPath));

    return new Promise((resolve, reject) => {
      this.audioLoader.load(
        audioPath,
        (buffer) => {
          this._audioBufferCache.set(audioPath, buffer);
          resolve(buffer);
        },
        undefined,
        (err) => {
          console.warn("Audio load failed:", audioPath, err);
          resolve(null); // don't break everything if missing
        }
      );
    });
  }

  // Preload all sounds referenced by your interactable models (call after models loaded)
  async preloadModelSounds(models = this.interactableModels) {
    if (!models || !this.audioLoader) return;
    const paths = new Set();
    models.forEach((m) => {
      if (m.userData?.correctSound) paths.add(m.userData.correctSound);
      if (m.userData?.incorrectSound) paths.add(m.userData.incorrectSound);
    });
    await Promise.all(Array.from(paths).map((p) => this.preloadAudio(p)));
  }

  // Attach a positional audio to a model (keeps it in model.children so it's spatialized)
  attachPositionalAudioToModel(
    modelGroup,
    audioPath,
    { refDistance = 2, maxDistance = 25, rolloff = 2, volume = 0.6 } = {}
  ) {
    if (!this.audioListener || !audioPath) return null;
    const buffer = this._audioBufferCache.get(audioPath);
    if (!buffer) {
      // If not preloaded, try to load now (async) and then attach when ready.
      this.preloadAudio(audioPath).then(() => {
        this.attachPositionalAudioToModel(modelGroup, audioPath, {
          refDistance,
          maxDistance,
          rolloff,
          volume,
        });
      });
      return null;
    }
    // Create PositionalAudio and attach to model root (or a specific mesh if you prefer)
    const pAudio = new THREE.PositionalAudio(this.audioListener);
    pAudio.setBuffer(buffer);
    pAudio.setRefDistance(refDistance);
    pAudio.setMaxDistance(maxDistance);
    pAudio.setRolloffFactor(rolloff);
    pAudio.setVolume(volume);
    pAudio.userData = pAudio.userData || {};
    pAudio.userData._sourcePath = audioPath;

    // Keep audio node on the model for reuse
    modelGroup.add(pAudio);
    // Also store references on userData for convenience
    if (!modelGroup.userData.audioNodes) modelGroup.userData.audioNodes = {};
    modelGroup.userData.audioNodes[audioPath] = pAudio;
    return pAudio;
  }

  // play a model's sound (uses an existing PositionalAudio if present, else creates a short-lived one)
  playModelSound(modelGroup, audioPath, opts = {}) {
    if (!this.audioListener || !audioPath) return;
    // try find a pre-attached node first
    const existing = modelGroup.userData?.audioNodes?.[audioPath];
    if (existing) {
      try {
        existing.stop && existing.stop();
      } catch (e) {}
      existing.setVolume(
        typeof opts.volume === "number"
          ? opts.volume
          : existing.getVolume?.() ?? 0.6
      );
      existing.play();
      return;
    }

    // otherwise create a temporary PositionalAudio, play once, then remove
    const buffer = this._audioBufferCache.get(audioPath);
    if (!buffer) {
      // try preload then retry
      this.preloadAudio(audioPath).then(() =>
        this.playModelSound(modelGroup, audioPath, opts)
      );
      return;
    }

    const tmp = new THREE.PositionalAudio(this.audioListener);
    tmp.setBuffer(buffer);
    tmp.setRefDistance(opts.refDistance ?? 2);
    tmp.setMaxDistance(opts.maxDistance ?? 25);
    tmp.setRolloffFactor(opts.rolloff ?? 2);
    tmp.setVolume(opts.volume ?? 0.6);

    modelGroup.add(tmp);
    tmp.play();
    // cleanup when finished
    tmp.onEnded = () => {
      try {
        modelGroup.remove(tmp);
      } catch (e) {}
      if (tmp.disconnect) tmp.disconnect();
    };
  }

  // Update your existing playCorrectSound / playIncorrectSound to use three audio
  playCorrectSound(model) {
    const audioPath = model.userData?.correctSound;
    if (!audioPath) return;
    // Example: slightly higher volume and shorter maxDistance
    this.playModelSound(model, audioPath, {
      volume: 0.85,
      refDistance: 1.5,
      maxDistance: 15,
    });
  }

  playIncorrectSound(model) {
    const audioPath = model.userData?.incorrectSound;
    if (!audioPath) return;
    this.playModelSound(model, audioPath, {
      volume: 0.9,
      refDistance: 1.5,
      maxDistance: 18,
    });
  }

  checkPasswordComplete() {
    return playerCodeArray.every((code, i) => code === passwordArray[i]);
  }

  setPuzzleImage(puzzleKey, imageObject) {
    this.puzzleImages[puzzleKey] = imageObject;
  }
}
