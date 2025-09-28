import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { BackroomsRoom } from './rooms/BackroomsRoom.js';
import { createPhysicsWorld } from './physics/world.js';
import { createPlayer } from './physics/player.js';
import { createFirstPersonControls } from './controls.js';
import { createPickupLight, updateHeldLightTarget } from './props/createPickupLight.js';
import { ColorMixingManager } from './props/colorMixingManager.js';

class BackroomsGame {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.world = null;
    this.playerBody = null;
    this.room = null;
    this.controls = null;
    
    this.pickableRoots = [];
    this.heldLight = null;
    this.clock = new THREE.Clock();
    
    this.colorMixingManager = new ColorMixingManager();
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
    this.setupRoom();
    this.setupLights();
    this.setupPuzzle();
    this.setupControls();
    this.setupEventListeners();
    
    this.isGameRunning = true;
    this.animate();
  }

  setupThreeJS() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x000000, 10, 30);

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

setupRoom() {
  this.room = new BackroomsRoom(this.scene, this.world, 30, 5, 30);
  
  this.room.addWall(new THREE.Vector3(-5, 0, -5), new THREE.Vector3(5, 0, -5), 0.4);
  this.room.addWall(new THREE.Vector3(-10, 0, -5), new THREE.Vector3(-15, 0, -5), 0.4);
  this.room.addWall(new THREE.Vector3(-7, 0, 7), new THREE.Vector3(-15, 0, 7), 0.4);
  this.room.addWall(new THREE.Vector3(-2, 0, 7), new THREE.Vector3(5, 0, 7), 0.4);
  this.room.addWall(new THREE.Vector3(5, 0, 11), new THREE.Vector3(4, 0, 11), 1);
  this.room.addWall(new THREE.Vector3(11, 0, -7), new THREE.Vector3(10, 0, -7), 1);
  this.room.addWall(new THREE.Vector3(5, 0, -15), new THREE.Vector3(5, 0, 7), 0.2);

  // Add a white wall for color mixing testing
  this.addWhiteTestWall();
}

addWhiteTestWall() {
  // Create a large white wall for testing color mixing
  const wallGeometry = new THREE.PlaneGeometry(15, 8); // 15 units wide, 8 units tall
  const wallMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xffffff,
    side: THREE.DoubleSide,
    metalness: 0.1,
    roughness: 0.8
  });
  
  const testWall = new THREE.Mesh(wallGeometry, wallMaterial);
  testWall.position.set(0, 4, -12); // Position it at the back of the room
  testWall.rotation.y = Math.PI; // Face towards the center of the room
  
  // Enable shadow
  testWall.receiveShadow = true;
  
  this.scene.add(testWall);
  
  // Add a physics body for the wall so it's solid
  const wallShape = new CANNON.Box(new CANNON.Vec3(7.5, 4, 0.1));
  const wallBody = new CANNON.Body({
    mass: 0, // Static body
    position: new CANNON.Vec3(0, 4, -12)
  });
  wallBody.addShape(wallShape);
  this.world.addBody(wallBody);
  
  console.log("White test wall added for color mixing testing");
}

  setupLights() {
    const lightPositions = [
      { position: new THREE.Vector3(2, 1, -2), color: 0xff0000 }, // Red
      { position: new THREE.Vector3(-2, 1, -2), color: 0x00ff00 }, // Green
      { position: new THREE.Vector3(0, 1, 3), color: 0x0000ff }, // Blue
    ];

    lightPositions.forEach((lightConfig, index) => {
      const light = createPickupLight(lightConfig.color, { 
        type: 'spot', 
        intensity: 12,
        distance: 100 
      });
      
      light.group.position.copy(lightConfig.position);
      light.group.name = `pickupLight_${index}`;
      
      this.scene.add(light.group);
      this.pickableRoots.push(light.group);
      
      this.colorMixingManager.addLight(light.group);
    });
  }

  setupPuzzle() {
        // Example puzzle: Create color targets around the room
        this.puzzleTargets = [
        {
            position: new THREE.Vector3(8, 2, 8),
            targetColor: new THREE.Color(0xffff00), // Yellow
            solved: false
        },
        {
            position: new THREE.Vector3(-8, 2, 8), 
            targetColor: new THREE.Color(0xff00ff), // Magenta
            solved: false
        },
        {
            position: new THREE.Vector3(0, 2, -8),
            targetColor: new THREE.Color(0x00ffff), // Cyan
            solved: false
        }
        ];

        // Create visual indicators for puzzle targets
        this.puzzleTargets.forEach((target, index) => {
        const geometry = new THREE.SphereGeometry(0.3, 16, 16);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0x333333,
            transparent: true,
            opacity: 0.8
        });
        const indicator = new THREE.Mesh(geometry, material);
        indicator.position.copy(target.position);
        this.scene.add(indicator);
        
        target.indicator = indicator;
        });
    }

checkPuzzles() {
  // No camera logic here - just check if lights are illuminating targets
  this.puzzleTargets.forEach((target, index) => {
    if (!target.solved) {
      this.pickableRoots.forEach(lightGroup => {
        const lightPos = new THREE.Vector3();
        lightGroup.getWorldPosition(lightPos);
        
        const distance = lightPos.distanceTo(target.position);
        if (distance < 5) {
          const currentColor = this.colorMixingManager.getCurrentMixedColor(lightGroup);
          const colorDistance = this.colorMixingManager.calculateColorDistance(currentColor, target.targetColor);
          
          if (colorDistance < 0.2) {
            target.solved = true;
            target.indicator.material.color.copy(target.targetColor);
            target.indicator.material.opacity = 1.0;
            console.log(`Puzzle ${index + 1} solved!`);
            this.createSolveEffect(target.position);
          }
        }
      });
    }
  });
}

calculateColorDistance(color1, color2) {
  const r1 = color1.r;
  const g1 = color1.g;
  const b1 = color1.b;
  
  const r2 = color2.r;
  const g2 = color2.g;
  const b2 = color2.b;
  
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

createSolveEffect(position) {
  const geometry = new THREE.RingGeometry(0.5, 0.7, 32);
  const material = new THREE.MeshBasicMaterial({ 
    color: 0xffffff,
    transparent: true,
    opacity: 0.8,
    side: THREE.DoubleSide
  });
  const ring = new THREE.Mesh(geometry, material);
  ring.position.copy(position);
  ring.rotation.x = -Math.PI / 2;
  this.scene.add(ring);

  // Animate and remove the ring
  const startTime = Date.now();
  const animateRing = () => {
    const elapsed = Date.now() - startTime;
    const progress = elapsed / 1000;
    
    if (progress < 1) {
      ring.scale.setScalar(1 + progress);
      material.opacity = 0.8 * (1 - progress);
      requestAnimationFrame(animateRing);
    } else {
      this.scene.remove(ring);
      ring.geometry.dispose();
      ring.material.dispose();
    }
  };
  animateRing();
}
// Add this helper method to calculate color distance
calculateColorDistance(color1, color2) {
  // Convert THREE.Color to RGB components (0-1 range)
  const r1 = color1.r;
  const g1 = color1.g;
  const b1 = color1.b;
  
  const r2 = color2.r;
  const g2 = color2.g;
  const b2 = color2.b;
  
  // Calculate Euclidean distance in RGB space
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

  setupControls() {
    const controls = createFirstPersonControls(this.playerBody, this.camera, this.renderer.domElement);
    this.controls = controls;
  }

  setupEventListeners() {
    window.addEventListener('pointerdown', (event) => {
      this.handlePointerInteraction(event);
    });

    window.addEventListener('keydown', (event) => {
      if (event.code === 'KeyQ' || event.code === 'Escape') {
        this.dropHeldLight();
      }
      
      // Debug: Force color mixes
      if (event.code === 'Key1' && this.heldLight) {
        this.colorMixingManager.forceColorMix(this.heldLight, 0xffff00, 0.8);
      }
      if (event.code === 'Key2' && this.heldLight) {
        this.colorMixingManager.forceColorMix(this.heldLight, 0xff00ff, 0.8);
      }
      if (event.code === 'Key3' && this.heldLight) {
        this.colorMixingManager.forceColorMix(this.heldLight, 0x00ffff, 0.8);
      }
    });

    window.addEventListener('resize', () => {
      this.handleResize();
    });

    window.addEventListener('beforeunload', () => {
      this.cleanup();
    });
  }

  handlePointerInteraction(event) {
    if (!this.heldLight) {
      this.tryPickupLight();
    } else {
      this.dropHeldLight();
    }
  }

  tryPickupLight() {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera({ x: 0, y: 0 }, this.camera);
    
    const intersects = raycaster.intersectObjects(this.pickableRoots, true);
    
    if (intersects.length > 0) {
      let obj = intersects[0].object;
      while (obj && !obj.userData.isPickupLight) {
        obj = obj.parent;
      }
      
      if (obj) {
        this.heldLight = obj;
        this.onLightPickup();
      }
    }
  }

  onLightPickup() {
    if (!this.heldLight || !this.heldLight.userData) return;
    
    // Safely access userData properties
    if (this.heldLight.userData.lightTarget) {
      this.heldLight.userData.lightTarget.position.set(0, 0, -5);
    }
    
    // Only update disc opacity (no cone anymore)
    if (this.heldLight.userData.disc && this.heldLight.userData.disc.material) {
      this.heldLight.userData.disc.material.opacity = 0.8;
    }
  }

  dropHeldLight() {
    if (!this.heldLight) return;
    
    // Calculate drop position in front of the player
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    forward.y = 0; // Keep it horizontal
    forward.normalize();
    
    const dropDistance = 2;
    const dropPosition = new THREE.Vector3()
      .copy(this.camera.position)
      .add(forward.multiplyScalar(dropDistance));
    
    // Update the light's position in the world
    this.heldLight.position.copy(dropPosition);
    
    // Only reset disc opacity (no cone anymore)
    if (this.heldLight.userData.disc && this.heldLight.userData.disc.material) {
      this.heldLight.userData.disc.material.opacity = 1.0;
    }
    
    // Clear the held light reference
    this.heldLight = null;
  }

  updateHeldLight() {
    if (!this.heldLight) return;
    
    const holdDistance = 1.1;
    const verticalOffset = -0.3;
    const horizontalOffset = 0.2;

    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    right.crossVectors(forward, this.camera.up).normalize();
    
    const holdPosition = new THREE.Vector3()
      .copy(this.camera.position)
      .add(forward.multiplyScalar(holdDistance))
      .add(right.multiplyScalar(horizontalOffset))
      .add(new THREE.Vector3(0, verticalOffset, 0));
    
    this.heldLight.position.copy(holdPosition);
    this.heldLight.quaternion.copy(this.camera.quaternion);
    
    updateHeldLightTarget(this.heldLight, this.camera);
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
    
    this.updateHeldLight();
    
    // Update color mixing based on light-to-light distances only
    this.colorMixingManager.updateColorMixing();
    
    // REMOVED: this.updateLightOcclusion(); - No more camera-based light control
    
    // Check puzzle completion
    this.checkPuzzles();
    
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