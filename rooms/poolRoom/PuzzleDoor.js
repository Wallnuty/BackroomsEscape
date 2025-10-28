import * as THREE from 'three';

export class PuzzleDoor {
    constructor(scene, position, openPosition, color, id) {
        this.scene = scene;
        this.position = position.clone();
        this.openPosition = openPosition.clone();
        this.color = color;
        this.id = id;
        this.isOpen = false;
        this.isAnimating = false;
        this.animationProgress = 0;
        this.animationSpeed = 0.02;

        this.group = new THREE.Group();
        this.group.position.copy(this.position);
        this.scene.add(this.group);

        this.createDoor();
        this.createIndicator();

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

    open() {
        if (this.isOpen || this.isAnimating) return;
        
        this.isAnimating = true;
        this.animationProgress = 0;
        console.log(`🚪 Opening door: ${this.id}`);
    }

    update() {
        // Update indicator pulsing effect
        if (!this.isOpen) {
            this.indicatorMaterial.opacity += this.pulseSpeed * this.pulseDirection;
            if (this.indicatorMaterial.opacity >= 0.8 || this.indicatorMaterial.opacity <= 0.3) {
                this.pulseDirection *= -1;
            }
        }

        // Handle door opening animation
        if (this.isAnimating) {
            this.animationProgress += this.animationSpeed;
            
            if (this.animationProgress >= 1) {
                this.animationProgress = 1;
                this.isAnimating = false;
                this.isOpen = true;
                this.doorMaterial.emissiveIntensity = 0.8; // Bright when fully open
                console.log(`✅ Door fully opened: ${this.id}`);
            }

            // Smooth interpolation
            const smoothProgress = this.easeOutCubic(this.animationProgress);
            const currentPos = new THREE.Vector3();
            currentPos.lerpVectors(this.position, this.openPosition, smoothProgress);
            
            this.group.position.copy(currentPos);

            // Increase emissive intensity as door opens
            this.doorMaterial.emissiveIntensity = 0.1 + (0.7 * smoothProgress);
        }
    }

    easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    // Optional: Close door method if needed
    close() {
        if (!this.isOpen || this.isAnimating) return;
        
        this.isAnimating = true;
        this.animationProgress = 1;
        console.log(`🚪 Closing door: ${this.id}`);
    }

    // Method to check if door is fully open
    isFullyOpen() {
        return this.isOpen && !this.isAnimating;
    }

    // Method to get current state for debugging
    getState() {
        return {
            id: this.id,
            isOpen: this.isOpen,
            isAnimating: this.isAnimating,
            animationProgress: this.animationProgress
        };
    }
}