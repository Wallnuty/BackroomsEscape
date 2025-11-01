import * as THREE from "three";
import { KeypadUI } from "../props/keypadUI.js";
import { NumberDisplayUI } from "../props/numberDisplayUI.js";

// Example password array (fixed)
export const passwordArray = [1, 8, 3, 2];

// Player's current input array (starts empty)
export let playerCodeArray = [null, null, null, null];

// Optional array to store "correctly entered codes"
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
    this.audioListener = null; // Add audio listener reference

    this.keypadUI = new KeypadUI();
    this.keypadUI.onSuccess = () => {
      console.log("✅ Keypad solved! Updating puzzle image.");
      this.puzzle2Completed = true;
      if (this.puzzleImages.puzzle2) {
        this.puzzleImages.puzzle2.setImage("textures/walls/HappyFace.png");
      }
    };
    this.numberDisplayUI = new NumberDisplayUI(); // Add this line
    // Interaction distance settings - temporarily increased for debugging
    this.maxInteractionDistance = 8.0; // Increased from 4.0
    this.maxLightInteractionDistance = 4.0;
    this.maxModelInteractionDistance = 8.0; // Increased from 4.0

    // Add reference to main game for reset functionality
    this.gameInstance = null;

    this.editingWhiteboard = false;
    this.whiteboardText = "";
    this.activeWhiteboardSurface = null;

    this.played67Sound = false; // Add this flag

    // Listen for keyboard input
    window.addEventListener("keydown", (e) => this.handleWhiteboardInput(e));

    this.markerAnimState = {
      isAnimating: false,
      lastTypedTime: 0,
      phase: 0, // 0 = up-right, 1 = down-left
      t: 0, // animation progress (0 to 1)
      direction: 1, // 1 = forward, -1 = backward
    };

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

  // Set puzzle image reference
  setPuzzleImage(puzzleKey, imageObject) {
    this.puzzleImages[puzzleKey] = imageObject;
  }

  // Set audio listener for 3D sound
  setAudioListener(listener) {
    this.audioListener = listener;
    this.audioLoader = new THREE.AudioLoader();
    this._audioBufferCache = new Map(); // path -> AudioBuffer
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
      // If model specifies its own interaction distance, use it; otherwise use global default
      const modelMax =
        typeof object.userData.interactionDistance === "number"
          ? object.userData.interactionDistance
          : this.maxModelInteractionDistance;
      return distance <= modelMax;
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

  // Call this when the user interacts with the whiteboard
  async startWhiteboardEditing(displaySurface) {
    this.editingWhiteboard = true;
    this.activeWhiteboardSurface = displaySurface;
    // Optionally reset text or keep previous
    await displaySurface.drawText(this.whiteboardText, {
      rotation: Math.PI / 2,
      fontSize: 200,
      y: 640,
      scaleX: 0.5,
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

    // --- Prevent writing if player doesn't have the marker ---
    if (!this.hasMarker) {
      return;
    }

    // If puzzle is completed, ignore further typing
    if (
      this.gameInstance &&
      this.gameInstance.roomManager &&
      this.gameInstance.roomManager.puzzleCompleted
    ) {
      return;
    }

    // If not already editing, start now
    if (
      !this.editingWhiteboard ||
      this.activeWhiteboardSurface !== focusedSurface
    ) {
      this.editingWhiteboard = true;
      this.activeWhiteboardSurface = focusedSurface;
    }

    let previousText = this.whiteboardText;

    // Only allow digits, max 3 chars
    if (
      e.key.length === 1 &&
      this.whiteboardText.length < 3 &&
      /^[0-9]$/.test(e.key)
    ) {
      this.whiteboardText += e.key;
    } else if (e.key === "Backspace") {
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
      scaleX: 0.5,
    });

    // Play sound if text is "67" and hasn't played yet
    if (this.whiteboardText === "67" && !this.played67Sound) {
      const audio = new Audio("/audio/sfx/67.mp3");
      audio.play();
      this.played67Sound = true;
    }

    // If text is "213", mark puzzle as completed and disable further typing
    if (
      this.whiteboardText === "213" &&
      this.gameInstance &&
      this.gameInstance.roomManager
    ) {
      this.gameInstance.roomManager.puzzleCompleted = true;
      console.log("Whiteboard puzzle completed!");
      this.gameInstance.roomManager.turnOffAllLights();

      // --- Cut the THREE.js music ---
      if (this.gameInstance.inGameMusic) {
        this.gameInstance.inGameMusic.stop();
      }

      // --- Play powerCut.mp3 sound effect ---
      const audio = new Audio("/audio/sfx/powerCut.mp3");
      audio.volume = 0.6;
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

    // --- Marker pickup ---
    if (
      modelGroup.userData.modelPath &&
      modelGroup.userData.modelPath.toLowerCase().includes("marker")
    ) {
      this.pickupMarker(modelGroup);
      return;
    }

    // --- Slide interaction ---
    if (
      modelGroup.userData.modelPath &&
      modelGroup.userData.modelPath.toLowerCase().includes("slide")
    ) {
      this.handleSlideInteraction(modelGroup);
      return;
    }

    // --- Display surface interaction ---
    let displaySurface = null;
    modelGroup.traverse((o) => {
      if (o.userData && o.userData.displaySurface)
        displaySurface = o.userData.displaySurface;
    });
    if (displaySurface) {
      if (!this.hasMarker) {
        showTemporaryMessage("Nothing to write with");
        return;
      }
      showTemporaryMessage("Use your number keys");
      return;
    }

    // --- Number display ---
    if (modelGroup.userData.type === "numberDisplay" && this.numberDisplayUI) {
      const number = modelGroup.userData.displayNumber || 0;
      console.log("📊 Number display clicked! Number:", number);
      this.numberDisplayUI.show(number);
      return;
    }

    // --- Keypad interaction ---
    if (modelGroup.userData.type === "keypad" && this.keypadUI) {
      if (modelGroup.userData.isSolved) {
        console.log("⚠️ Keypad already solved - ignoring interaction");
        return;
      }

      const code = modelGroup.userData.code || "";
      this.keypadUI.currentKeypadModel = modelGroup;
      this.keypadUI.correctCode = code;

      if (this.pointerLockControls && !this.keypadUI.pointerLockControls) {
        this.keypadUI.pointerLockControls = this.pointerLockControls;
      }

      this.keypadUI.show();
      return;
    }

    // --- Puzzle code interaction ---
    if (modelGroup.userData.code !== undefined) {
      this.handleModelClick(modelGroup);

      if (this.checkPasswordComplete()) {
        console.log("Password complete! Trigger next event...");
        this.puzzle1Completed = true;
        if (this.puzzleImages.puzzle1) {
          this.puzzleImages.puzzle1.setImage("textures/walls/HappyFace.png");
        }
      }
    }

    // --- Door interaction ---
    if (modelGroup.userData.type === "door") {
      if (!this.puzzle1Completed || !this.puzzle2Completed) {
        console.log(
          "🔒 Door clicked but puzzles not complete → incorrect sound"
        );
        this.playIncorrectSound(modelGroup);
        return;
      }

      console.log("Door clicked and puzzles complete → correct sound");
      this.playCorrectSound(modelGroup);
      this.gameInstance.teleportToPoolrooms();
      return;
    }
  }

  // --- Marker methods ---
  pickupMarker(modelGroup) {
    // Remove from scene and interactables
    if (modelGroup.parent) modelGroup.parent.remove(modelGroup);
    this.removeInteractableModel(modelGroup);

    this.hasMarker = true;
    this.heldMarker = modelGroup;

    // Add held marker to camera
    if (!this.heldMarkerObject && this.camera) {
      const heldMarker = modelGroup.clone(true);
      heldMarker.traverse((obj) => {
        if (obj.material) obj.material = obj.material.clone();
      });
      heldMarker.position.set(0, 0, -1);
      heldMarker.scale.set(0.8, 0.8, 0.8);
      heldMarker.rotation.set(0.2, 0, -0.5);

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
  // Inside ModelInteractionManager class
  // Preload all sounds referenced by your interactable models (call after models loaded)
  // Preload all sounds referenced by your interactable models (call after models loaded)
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
  // Robust held-marker update — use camera world position & quaternion, non-mutating vectors
  updateHeldMarker() {
    if (!this.heldMarkerObject || !this.camera) return;

    const holdDistance = 1.1;
    // Default (rest) position
    const baseVertical = -0.5;
    const baseHorizontal = 0.9;

    // Animation endpoints
    const upright = { vertical: 0.1, horizontal: 0.4 }; // up, right
    const downleft = { vertical: -0.3, horizontal: -0.3 }; // down, left

    // Animation timing
    const now = performance.now();
    const anim = this.markerAnimState;
    const ANIM_DURATION = 0.44; // seconds for each half
    const ACTIVE_TIMEOUT = 400; // ms

    let verticalOffset = baseVertical;
    let horizontalOffset = baseHorizontal;

    if (anim.isAnimating && now - anim.lastTypedTime < ACTIVE_TIMEOUT) {
      // Animate between upright and downleft
      anim.t += (1 / 60 / ANIM_DURATION) * anim.direction; // assuming ~60fps

      if (anim.t > 1) {
        anim.t = 1;
        anim.direction = -1;
      } else if (anim.t < 0) {
        anim.t = 0;
        anim.direction = 1;
      }

      verticalOffset = THREE.MathUtils.lerp(
        upright.vertical,
        downleft.vertical,
        anim.t
      );
      horizontalOffset = THREE.MathUtils.lerp(
        upright.horizontal,
        downleft.horizontal,
        anim.t
      );
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

    const forward = new THREE.Vector3(0, 0, -1)
      .applyQuaternion(camQuat)
      .normalize();
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camQuat).normalize();
    const right = new THREE.Vector3().crossVectors(forward, up).normalize();

    const holdPosition = camPos
      .clone()
      .add(forward.clone().multiplyScalar(holdDistance))
      .add(right.clone().multiplyScalar(horizontalOffset))
      .add(up.clone().multiplyScalar(verticalOffset));

    this.heldMarkerObject.position.copy(holdPosition);
    this.heldMarkerObject.quaternion.copy(camQuat);

    const tilt = new THREE.Quaternion();
    tilt.setFromEuler(new THREE.Euler(0.2, 3, -0.5, "XYZ"));
    this.heldMarkerObject.quaternion.multiply(tilt);
  }
  getActiveWhiteboardSurface() {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera({ x: 0, y: 0 }, this.camera);

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
      if (
        obj &&
        obj.userData.isInteractableModel &&
        obj.userData.modelPath &&
        obj.userData.modelPath.toLowerCase().includes("whiteboard.glb") &&
        this.isWithinInteractionDistance(obj)
      ) {
        let displaySurface = null;
        obj.traverse((o) => {
          if (o.userData && o.userData.displaySurface)
            displaySurface = o.userData.displaySurface;
        });
        return displaySurface;
      }
    }
    return null;
  }
  handleModelClick(model) {
    const emptyIndex = playerCodeArray.findIndex((slot) => slot === null);
    const modelCode = Number(model.userData.code);

    if (this.puzzle1Completed) {
      console.log(
        `Puzzle solved → forced incorrect sound for model ${modelCode}`
      );
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
}
function showTemporaryMessage(msg, duration = 2000) {
  let messageDiv = document.getElementById("whiteboardMessage");
  if (!messageDiv) {
    messageDiv = document.createElement("div");
    messageDiv.id = "whiteboardMessage";
    messageDiv.style.position = "fixed";
    messageDiv.style.bottom = "5%";
    messageDiv.style.left = "50%";
    messageDiv.style.transform = "translateX(-50%)";
    messageDiv.style.background = "rgba(0,0,0,0.7)";
    messageDiv.style.color = "#fff";
    messageDiv.style.padding = "12px 24px";
    messageDiv.style.borderRadius = "8px";
    messageDiv.style.fontSize = "1.2em";
    messageDiv.style.zIndex = "1000";
    document.body.appendChild(messageDiv);
  }
  messageDiv.textContent = msg;
  messageDiv.style.display = "block";
  setTimeout(() => {
    messageDiv.style.display = "none";
  }, duration);
}
