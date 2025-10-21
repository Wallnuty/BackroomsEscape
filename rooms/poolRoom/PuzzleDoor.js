import * as THREE from 'three';

export class PuzzleDoor {
    constructor(scene, position, openPosition, requiredColor, id = 'door') {
        this.scene = scene;
        this.position = position;
        this.openPosition = openPosition;
        this.requiredColor = new THREE.Color(requiredColor);
        this.id = id;
        this.isOpen = false;
        this.isAnimating = false;
        this.animationProgress = 0;

        this.createDoor();
    }

    createDoor() {
        // Door frame
        const frameGeometry = new THREE.BoxGeometry(3, 5, 0.3);
        const frameMaterial = new THREE.MeshStandardMaterial({
            color: 0x8B4513, // Brown wood
            roughness: 0.8
        });
        this.frame = new THREE.Mesh(frameGeometry, frameMaterial);
        this.frame.position.copy(this.position);
        this.scene.add(this.frame);

        // Door panel
        const doorGeometry = new THREE.BoxGeometry(2.8, 4.8, 0.1);
        this.doorMaterial = new THREE.MeshStandardMaterial({
            color: 0x654321, // Darker wood
            roughness: 0.7,
            emissive: this.requiredColor,
            emissiveIntensity: 0.1
        });
        this.door = new THREE.Mesh(doorGeometry, this.doorMaterial);
        this.door.position.copy(this.position);
        this.scene.add(this.door);

        // Color indicator
        const indicatorGeometry = new THREE.CircleGeometry(0.3, 16);
        this.indicatorMaterial = new THREE.MeshBasicMaterial({
            color: this.requiredColor,
            transparent: true,
            opacity: 0.5
        });
        this.indicator = new THREE.Mesh(indicatorGeometry, this.indicatorMaterial);
        this.indicator.position.copy(this.position);
        this.indicator.position.z += 0.06;
        this.scene.add(this.indicator);
    }

    open() {
        if (this.isOpen || this.isAnimating) return;
        
        this.isAnimating = true;
        this.animationProgress = 0;
        console.log(`Opening door: ${this.id}`);
    }

    update() {
        if (!this.isAnimating) return;

        this.animationProgress += 0.02; // Animation speed

        if (this.animationProgress >= 1) {
            this.animationProgress = 1;
            this.isAnimating = false;
            this.isOpen = true;
        }

        // Animate door sliding to open position
        const currentPosition = new THREE.Vector3();
        currentPosition.lerpVectors(this.position, this.openPosition, this.animationProgress);
        
        this.door.position.copy(currentPosition);
        this.indicator.position.copy(currentPosition);

        // Increase emissive intensity during animation
        this.doorMaterial.emissiveIntensity = 0.1 + (this.animationProgress * 0.3);
    }

    close() {
        // For future use if needed
        this.isOpen = false;
        this.door.position.copy(this.position);
        this.indicator.position.copy(this.position);
        this.doorMaterial.emissiveIntensity = 0.1;
    }
}