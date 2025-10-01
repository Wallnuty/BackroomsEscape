import * as THREE from 'three';
import { createPickupLight, updateHeldLightTarget } from '../props/createPickupLight.js';
import { ColorMixingManager } from '../props/colorMixingManager.js';

export class PickupLightsManager {
    constructor(scene, camera, pickupLightPositions = null) {
        this.scene = scene;
        this.camera = camera;
        this.colorMixingManager = new ColorMixingManager();
        this.pickableRoots = [];
        this.heldLight = null;
        this.puzzleTargets = [];
    }

    initPickupLights(pickupLightPositions = null) {
        // Default positions if not overridden
        const defaultPositions = [
            { position: new THREE.Vector3(0.5, 1, 0), color: 0xff0000 }, // Red
            { position: new THREE.Vector3(-0.5, 1, 0), color: 0x00ff00 }, // Green
            { position: new THREE.Vector3(0, 1, 0.5), color: 0x0000ff }, // Blue
        ];

        const lightPositions = pickupLightPositions || defaultPositions;

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
        // **purple orbs**
        // this.puzzleTargets.forEach((target, index) => {
        //     const geometry = new THREE.SphereGeometry(0.3, 16, 16);
        //     const material = new THREE.MeshBasicMaterial({
        //         color: 0x333333,
        //         transparent: true,
        //         opacity: 0.8
        //     });
        //     const indicator = new THREE.Mesh(geometry, material);
        //     indicator.position.copy(target.position);
        //     this.scene.add(indicator);

        //     target.indicator = indicator;
        // });
    }

    checkPuzzles() {
        this.puzzleTargets.forEach((target, index) => {
            if (!target.solved) {
                this.pickableRoots.forEach(lightGroup => {
                    const lightPos = new THREE.Vector3();
                    lightGroup.getWorldPosition(lightPos);

                    const distance = lightPos.distanceTo(target.position);
                    if (distance < 5) {
                        const currentColor = this.colorMixingManager.getCurrentMixedColor(lightGroup);
                        const colorDistance = this.calculateColorDistance(currentColor, target.targetColor);

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

        if (this.heldLight.userData.lightTarget) {
            this.heldLight.userData.lightTarget.position.set(0, 0, -5);
        }

        if (this.heldLight.userData.disc && this.heldLight.userData.disc.material) {
            this.heldLight.userData.disc.material.opacity = 0.8;
        }
    }

    dropHeldLight() {
        if (!this.heldLight) return;

        const forward = new THREE.Vector3();
        this.camera.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();

        const dropDistance = 1;
        const dropPosition = new THREE.Vector3()
            .copy(this.camera.position)
            .add(forward.multiplyScalar(dropDistance));
        dropPosition.y -= 0.35; // Lower the drop position by 0.5 units

        this.heldLight.position.copy(dropPosition);

        if (this.heldLight.userData.disc && this.heldLight.userData.disc.material) {
            this.heldLight.userData.disc.material.opacity = 1.0;
        }

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
}