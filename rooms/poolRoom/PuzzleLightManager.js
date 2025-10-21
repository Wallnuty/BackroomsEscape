import * as THREE from 'three';
import { createPickupLight } from '../../props/createPickupLight.js';

export class PuzzleLightManager {
    constructor(scene, colorMixingManager) {
        this.scene = scene;
        this.colorMixingManager = colorMixingManager;
        this.puzzleLights = new Map(); // Track puzzle-specific lights
        this.lightSpawnPoints = new Map();
        
        this.setupSpawnPoints();
    }

    setupSpawnPoints() {
        // Define where lights will spawn when puzzles are solved
        this.lightSpawnPoints.set('blue_light', new THREE.Vector3(25, 1, 0));
        this.lightSpawnPoints.set('green_light', new THREE.Vector3(-25, 1, 0));
        this.lightSpawnPoints.set('red_light', new THREE.Vector3(2, 1, -12));
    }

    createPuzzleLight(color, position, name, config = {}) {
        const lightConfig = {
            type: 'spot',
            intensity: 12,
            distance: 100,
            ...config
        };

        const light = createPickupLight(color, lightConfig);
        light.group.position.copy(position);
        light.group.name = name;
        
        // Add puzzle-specific metadata
        light.group.userData.isPuzzleLight = true;
        light.group.userData.puzzleId = name;
        light.group.userData.originalColor = color;

        this.scene.add(light.group);
        this.colorMixingManager.addLight(light.group);
        this.puzzleLights.set(name, light.group);

        console.log(`Created puzzle light: ${name} at`, position);
        
        return light.group;
    }

    spawnInitialLights() {
        // Spawn the starting red light
        const redLight = this.createPuzzleLight(
            0xff0000,
            this.lightSpawnPoints.get('red_light'),
            'red_light_main'
        );

        // Point red light toward demo sensor
        this.pointLightAtTarget(redLight, new THREE.Vector3(0, 1.5, -15));

        return [redLight];
    }

    spawnLightForPuzzle(lightType) {
        const spawnConfigs = {
            'blue': {
                color: 0x0000ff,
                spawnPoint: 'blue_light',
                name: 'blue_light_room'
            },
            'green': {
                color: 0x00ff00,
                spawnPoint: 'green_light',
                name: 'green_light_room'
            }
        };

        const config = spawnConfigs[lightType];
        if (config && this.lightSpawnPoints.has(config.spawnPoint)) {
            const position = this.lightSpawnPoints.get(config.spawnPoint);
            const light = this.createPuzzleLight(config.color, position, config.name);
            
            this.createSpawnEffect(position, config.color);
            return light;
        }
        
        return null;
    }

    pointLightAtTarget(lightGroup, targetPosition) {
        if (lightGroup && lightGroup.userData.lightTarget) {
            // Point the light and its target at the position
            lightGroup.userData.lightTarget.position.copy(targetPosition);
            
            // Calculate direction and rotate light
            const direction = new THREE.Vector3()
                .subVectors(targetPosition, lightGroup.position)
                .normalize();
            
            lightGroup.lookAt(targetPosition);
            
            console.log(`Pointed ${lightGroup.name} at`, targetPosition);
        }
    }

    createSpawnEffect(position, color) {
        // Create a pulsing sphere effect at spawn location
        const geometry = new THREE.SphereGeometry(0.6, 16, 16);
        const material = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.8
        });
        const sphere = new THREE.Mesh(geometry, material);
        sphere.position.copy(position);
        this.scene.add(sphere);

        // Create a ring effect
        const ringGeometry = new THREE.RingGeometry(0.3, 0.8, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.position.copy(position);
        ring.rotation.x = -Math.PI / 2;
        this.scene.add(ring);

        // Animate both effects
        const startTime = Date.now();
        const animateEffect = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / 1500; // 1.5 second animation

            if (progress < 1) {
                // Pulsing scale
                const pulseScale = 1 + Math.sin(progress * Math.PI * 2) * 0.3;
                sphere.scale.setScalar(pulseScale);
                
                // Fading opacity
                sphere.material.opacity = 0.8 * (1 - progress);
                ring.material.opacity = 0.6 * (1 - progress);
                
                // Expanding ring
                ring.scale.setScalar(1 + progress * 2);
                
                requestAnimationFrame(animateEffect);
            } else {
                // Cleanup
                this.scene.remove(sphere);
                this.scene.remove(ring);
                sphere.geometry.dispose();
                sphere.material.dispose();
                ring.geometry.dispose();
                ring.material.dispose();
            }
        };
        animateEffect();
    }

    getLightByName(name) {
        return this.puzzleLights.get(name);
    }

    getAllPuzzleLights() {
        return Array.from(this.puzzleLights.values());
    }

    removePuzzleLight(name) {
        const light = this.puzzleLights.get(name);
        if (light) {
            this.scene.remove(light);
            this.colorMixingManager.removeLight(light);
            this.puzzleLights.delete(name);
            
            // Dispose of geometries and materials
            light.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(mat => mat.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            });
        }
    }

    resetPuzzleLights() {
        // Remove all puzzle lights except the initial red light
        const lightsToRemove = [];
        this.puzzleLights.forEach((light, name) => {
            if (name !== 'red_light_main') {
                lightsToRemove.push(name);
            }
        });
        
        lightsToRemove.forEach(name => this.removePuzzleLight(name));
    }

    updateLightTargets() {
        // Update any light targets that need to follow moving objects
        // This can be expanded for dynamic puzzle elements
    }
}