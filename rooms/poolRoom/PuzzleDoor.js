import * as THREE from 'three';
import * as CANNON from 'cannon-es'; // ADD THIS IMPORT

export class PuzzleDoor {
    constructor(scene, world, position, openPosition, color, id) {
        this.scene = scene;
        this.world = world; // Cannon.js world for physics
        this.position = new THREE.Vector3().copy(position);
        this.openPosition = new THREE.Vector3().copy(openPosition);
        this.color = color;
        this.id = id;
        this.isOpen = false;
        this.isAnimating = false;
        this.animationProgress = 0;
        this.animationSpeed = 0.02;
        
        // Physics bodies
        this.bodies = [];
        this.doorBody = null;

        this.group = new THREE.Group();
        this.group.position.copy(this.position);
        this.scene.add(this.group);

        this.createDoor();
        this.createIndicator();
        
        // Only create collision if world is provided
        if (this.world) {
            this.createCollision();
        } else {
            console.warn(`⚠️ No physics world provided for door ${this.id}, collision disabled`);
        }

        console.log(`🚪 Created door ${id} at:`, position);
    }

    createDoor() {
        // Door geometry
        const doorGeometry = new THREE.BoxGeometry(3, 5, 0.2);
        this.doorMaterial = new THREE.MeshStandardMaterial({
            color: 0x888888,
            metalness: 0.7,
            roughness: 0.3,
            emissive: this.color,
            emissiveIntensity: 0.1
        });
        
        this.door = new THREE.Mesh(doorGeometry, this.doorMaterial);
        this.door.position.y = 2.5;
        this.group.add(this.door);

        // Door frame
        const frameGeometry = new THREE.BoxGeometry(3.5, 5.5, 0.3);
        const frameMaterial = new THREE.MeshStandardMaterial({
            color: 0x444444,
            metalness: 0.5,
            roughness: 0.5
        });
        
        this.frame = new THREE.Mesh(frameGeometry, frameMaterial);
        this.frame.position.y = 2.5;
        this.group.add(this.frame);
    }

    createIndicator() {
        // Color indicator showing required color
        const indicatorGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.1, 16);
        this.indicatorMaterial = new THREE.MeshBasicMaterial({
            color: this.color,
            transparent: true,
            opacity: 0.5
        });
        
        this.indicator = new THREE.Mesh(indicatorGeometry, this.indicatorMaterial);
        this.indicator.position.y = 5.0;
        this.indicator.position.z = 0.2;
        this.group.add(this.indicator);

        // Pulsing effect for indicator
        this.pulseDirection = 1;
        this.pulseSpeed = 0.02;
    }

    createCollision() {
        if (!this.world) {
            console.warn(`⚠️ No physics world provided for door ${this.id}, collision disabled`);
            return;
        }

        // Create collision body for the door
        const doorThickness = 0.2;
        const doorWidth = 3;
        const doorHeight = 5;
        
        // Calculate world position for physics
        const worldPosition = this.position.clone();
        
        // Create door collision shape (box)
        const doorShape = new CANNON.Box(new CANNON.Vec3(doorWidth / 2, doorHeight / 2, doorThickness / 2));
        this.doorBody = new CANNON.Body({ 
            mass: 0, // Static body
            position: new CANNON.Vec3(worldPosition.x, worldPosition.y + 2.5, worldPosition.z)
        });
        this.doorBody.addShape(doorShape);
        
        // Store reference to the door object for easy identification
        this.doorBody.door = this;
        
        this.world.addBody(this.doorBody);
        this.bodies.push(this.doorBody);
        
        console.log(`🔒 Added collision for door ${this.id}`);
    }

    open() {
        if (this.isOpen || this.isAnimating) return;
        
        this.isAnimating = true;
        this.animationProgress = 0;
        
        // Remove collision when door starts opening
        this.removeCollision();
        
        console.log(`🚪 Opening door: ${this.id}`);
    }

    removeCollision() {
        // Remove door body from physics world
        if (this.doorBody && this.doorBody.world) {
            this.world.removeBody(this.doorBody);
            console.log(`🔓 Removed collision for door ${this.id}`);
        }
    }

    addCollision() {
        // Re-add collision body (for closing door)
        if (this.doorBody && !this.doorBody.world) {
            this.world.addBody(this.doorBody);
            console.log(`🔒 Re-added collision for door ${this.id}`);
        }
    }

    update() {
        // Update indicator pulsing effect (only when closed)
        if (!this.isOpen && !this.isAnimating) {
            this.indicatorMaterial.opacity += this.pulseSpeed * this.pulseDirection;
            if (this.indicatorMaterial.opacity >= 0.8 || this.indicatorMaterial.opacity <= 0.3) {
                this.pulseDirection *= -1;
            }
        }

        // Handle door opening animation
        if (this.isAnimating && this.animationProgress < 1) {
            this.animationProgress += this.animationSpeed;
            
            if (this.animationProgress >= 1) {
                this.animationProgress = 1;
                this.isAnimating = false;
                this.isOpen = true;
                this.doorMaterial.emissiveIntensity = 0.8;
                console.log(`✅ Door fully opened: ${this.id}`);
            }
        }
        // Handle door closing animation
        else if (this.isAnimating && this.animationProgress > 0) {
            this.animationProgress -= this.animationSpeed;
            
            if (this.animationProgress <= 0) {
                this.animationProgress = 0;
                this.isAnimating = false;
                this.isOpen = false;
                this.doorMaterial.emissiveIntensity = 0.1;
                console.log(`❌ Door fully closed: ${this.id}`);
            }
        }

        // Smooth interpolation for both opening and closing
        const smoothProgress = this.easeOutCubic(this.animationProgress);
        const currentPos = new THREE.Vector3();
        currentPos.lerpVectors(this.position, this.openPosition, smoothProgress);
        
        this.group.position.copy(currentPos);

        // Adjust emissive intensity based on open/close state
        if (this.isAnimating) {
            if (this.animationProgress < 1) { // Opening
                this.doorMaterial.emissiveIntensity = 0.1 + (0.7 * smoothProgress);
            } else { // Closing
                this.doorMaterial.emissiveIntensity = 0.1 + (0.7 * smoothProgress);
            }
        }
    }

    easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    // Optional: Close door method if needed
    close() {
        if (this.isOpen && !this.isAnimating) {
            this.isAnimating = true;
            this.animationProgress = 1; // Start from open position
            this.animationSpeed = 0.02; // Same speed as opening
            console.log(`🚪 Closing door: ${this.id}`);
            return true;
        }
        return false;
    }

    // Method to check if door is fully open
    isFullyOpen() {
        return this.isOpen && !this.isAnimating;
    }

    // Method to check if door is fully closed
    isFullyClosed() {
        return !this.isOpen && !this.isAnimating;
    }

    // Method to get current state for debugging
    getState() {
        return {
            id: this.id,
            isOpen: this.isOpen,
            isAnimating: this.isAnimating,
            animationProgress: this.animationProgress,
            hasCollision: this.doorBody ? !!this.doorBody.world : false
        };
    }

    // Clean up method to remove door completely
    dispose() {
        // Remove from scene
        this.scene.remove(this.group);
        
        // Remove from physics world
        this.removeCollision();
        
        // Dispose of geometries and materials
        if (this.door) {
            this.door.geometry.dispose();
            this.door.material.dispose();
        }
        if (this.frame) {
            this.frame.geometry.dispose();
            this.frame.material.dispose();
        }
        if (this.indicator) {
            this.indicator.geometry.dispose();
            this.indicator.material.dispose();
        }
        
        console.log(`🗑️ Disposed door: ${this.id}`);
    }
}