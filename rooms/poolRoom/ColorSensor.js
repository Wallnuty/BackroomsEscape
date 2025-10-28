import * as THREE from 'three';

export class ColorSensor {
    constructor(scene, position, targetColor, detectionRadius = 5.0, id = 'sensor') {
        this.scene = scene;
        this.position = position;
        this.targetColor = new THREE.Color(targetColor);
        this.detectionRadius = detectionRadius;
        this.id = id;
        this.isSolved = false;

        // REDUCED detection radius for more precise detection
        this.detectionRadius = 6.0; // Reduced from 6-8m to 3m
        
        // Tighter detection angle to match spotlight cone
        this.detectionAngle = Math.PI / 6; // 30-degree cone instead of 45-degree
        
        // NEW: Maximum distance for spotlight cone intersection
        this.maxSpotlightDistance = 15.0; // Lights can't activate from too far
        
        this.direction = new THREE.Vector3(0, 0, -1);
        this.requiresDirectional = true;

        this.group = new THREE.Group();
        this.group.position.copy(position);
        this.scene.add(this.group);

        this.createVisuals();
        
        console.log(`Created sensor ${id} at:`, position, 'Target:', this.targetColor, `Radius: ${this.detectionRadius}m`);
    }

    createVisuals() {
        // Sensor base
        const baseGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.1, 16);
        const baseMaterial = new THREE.MeshStandardMaterial({
            color: 0x333333,
            metalness: 0.8,
            roughness: 0.2
        });
        this.base = new THREE.Mesh(baseGeometry, baseMaterial);
        this.base.rotation.x = Math.PI / 2;
        this.group.add(this.base);

        // Color indicator (shows target color)
        const indicatorGeometry = new THREE.CircleGeometry(0.25, 16);
        this.indicatorMaterial = new THREE.MeshBasicMaterial({
            color: this.targetColor,
            transparent: true,
            opacity: 0.3
        });
        this.indicator = new THREE.Mesh(indicatorGeometry, this.indicatorMaterial);
        this.indicator.position.y += 0.06;
        this.indicator.rotation.x = -Math.PI / 2;
        this.group.add(this.indicator);

        // Detection radius visualization (smaller now)
        const ringGeometry = new THREE.RingGeometry(this.detectionRadius - 0.5, this.detectionRadius, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: this.targetColor,
            transparent: true,
            opacity: 0.05,
            side: THREE.DoubleSide,
            wireframe: true
        });
        this.ring = new THREE.Mesh(ringGeometry, ringMaterial);
        this.ring.position.y += 0.05;
        this.ring.rotation.x = -Math.PI / 2;
        this.group.add(this.ring);

        // Direction indicator (cone showing detection direction)
        this.createDirectionIndicator();
    }

    createDirectionIndicator() {
        const coneGeometry = new THREE.ConeGeometry(0.2, 0.8, 8);
        const coneMaterial = new THREE.MeshBasicMaterial({
            color: this.targetColor,
            transparent: true,
            opacity: 0.4
        });
        this.directionIndicator = new THREE.Mesh(coneGeometry, coneMaterial);
        this.directionIndicator.rotation.x = Math.PI / 2;
        this.directionIndicator.position.y += 0.2;
        this.directionIndicator.position.z -= 0.4;
        this.group.add(this.directionIndicator);
    }

    // IMPROVED METHOD: Check if light is pointing at AND reaching this sensor
    isLightPointingAtSensor(light, lightPosition) {
        if (!this.requiresDirectional) return true;

        // Get light's forward direction
        const lightForward = new THREE.Vector3(0, 0, -1);
        lightForward.applyQuaternion(light.quaternion);

        // Vector from light to sensor
        const toSensor = new THREE.Vector3().subVectors(this.position, lightPosition).normalize();

        // Calculate angle between light forward and sensor direction
        const angle = lightForward.angleTo(toSensor);

        // Check if within detection angle AND not too far for spotlight to reach
        const distance = lightPosition.distanceTo(this.position);
        const withinAngle = angle <= this.detectionAngle;
        const withinReach = distance <= this.maxSpotlightDistance;

        return withinAngle && withinReach;
    }

    // NEW METHOD: More precise spotlight cone detection
    isInSpotlightCone(light, lightPosition) {
        // Get light's forward direction
        const lightForward = new THREE.Vector3(0, 0, -1);
        lightForward.applyQuaternion(light.quaternion);

        // Vector from light to sensor
        const toSensor = new THREE.Vector3().subVectors(this.position, lightPosition);
        const distance = toSensor.length();
        
        // Normalize for angle calculation
        toSensor.normalize();

        // Calculate angle between light forward and sensor direction
        const angle = lightForward.angleTo(toSensor);

        // Use a tighter angle for spotlight detection (spotlights are usually 30-45 degrees)
        const spotlightAngle = Math.PI / 6; // 30 degrees
        
        // Check if within spotlight cone AND reasonable distance
        const withinSpotlightCone = angle <= spotlightAngle;
        const reasonableDistance = distance <= 10.0; // Max 10m for spotlight effectiveness
        
        // Debug logging for spotlight detection
        if (distance < 15.0) { // Only log when somewhat close
            console.log(`      🎯 Spotlight check: angle=${(angle * 180/Math.PI).toFixed(1)}°, dist=${distance.toFixed(1)}m, inCone=${withinSpotlightCone}`);
        }

        return withinSpotlightCone && reasonableDistance;
    }

    // UPDATED METHOD: Check color with improved directional awareness
    checkColorWithDirection(lightColor, lightPosition, lightObject = null) {
        if (this.isSolved) return false;

        // Calculate distance from light to sensor
        const distance = lightPosition.distanceTo(this.position);
        
        // FIRST: Check if within basic detection radius
        if (distance > this.detectionRadius) {
            return false;
        }

        // SECOND: Check if light is properly pointing at sensor using spotlight cone detection
        if (lightObject && !this.isInSpotlightCone(lightObject, lightPosition)) {
            return false;
        }

        // FINALLY: Check color match
        const colorDistance = this.calculateColorDistance(lightColor, this.targetColor);
        const isCorrect = colorDistance < 0.3;
        
        // Enhanced logging
        if (distance < this.detectionRadius + 2.0) { // Log when close to detection radius
            console.log(`🔦 Sensor ${this.id}:`);
            console.log(`   📏 Distance: ${distance.toFixed(1)}m (radius: ${this.detectionRadius}m)`);
            if (lightObject) {
                const isPointing = this.isInSpotlightCone(lightObject, lightPosition);
                console.log(`   🎯 In spotlight cone: ${isPointing}`);
            }
            console.log(`   🎨 Color Distance: ${colorDistance.toFixed(3)}`);
            console.log(`   🎯 Target: R=${this.targetColor.r.toFixed(3)}, G=${this.targetColor.g.toFixed(3)}, B=${this.targetColor.b.toFixed(3)}`);
            console.log(`   💡 Received: R=${lightColor.r.toFixed(3)}, G=${lightColor.g.toFixed(3)}, B=${lightColor.b.toFixed(3)}`);
            console.log(`   ✅ Correct: ${isCorrect}`);
            console.log(`---`);
        }
        
        return isCorrect;
    }

    // Legacy method for backward compatibility
    checkColor(lightColor, lightPosition) {
        return this.checkColorWithDirection(lightColor, lightPosition, null);
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

    solve() {
        this.isSolved = true;
        this.indicatorMaterial.opacity = 1.0;
        this.indicatorMaterial.color = this.targetColor;
        
        // Make the ring more visible when solved
        this.ring.material.opacity = 0.3;
        this.ring.material.color = this.targetColor;
        
        // Make direction indicator brighter
        this.directionIndicator.material.opacity = 0.8;
        
        this.createSolveEffect();
        console.log(`🎯 SENSOR SOLVED: ${this.id}`);
    }

    createSolveEffect() {
        const geometry = new THREE.RingGeometry(0.4, 0.6, 32);
        const material = new THREE.MeshBasicMaterial({
            color: this.targetColor,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });
        const ring = new THREE.Mesh(geometry, material);
        ring.position.copy(this.position);
        ring.position.y += 0.1;
        ring.rotation.x = -Math.PI / 2;
        this.scene.add(ring);

        // Animate and remove
        const startTime = Date.now();
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / 1000;

            if (progress < 1) {
                ring.scale.setScalar(1 + progress);
                material.opacity = 0.8 * (1 - progress);
                requestAnimationFrame(animate);
            } else {
                this.scene.remove(ring);
                ring.geometry.dispose();
                ring.material.dispose();
            }
        };
        animate();
    }

    // Method to update sensor direction (if needed)
    setDirection(direction) {
        this.direction.copy(direction).normalize();
    }
}