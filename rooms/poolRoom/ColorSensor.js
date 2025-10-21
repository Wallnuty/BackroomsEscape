import * as THREE from 'three';

export class ColorSensor {
    constructor(scene, position, targetColor, detectionRadius = 5.0, id = 'sensor') {
        this.scene = scene;
        this.position = position;
        this.targetColor = new THREE.Color(targetColor);
        this.detectionRadius = detectionRadius;
        this.id = id;
        this.isSolved = false;

        this.createVisuals();
        
        console.log(`Created sensor ${id} at:`, position, 'Target:', this.targetColor, `Radius: ${detectionRadius}`);
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
        this.base.position.copy(this.position);
        this.base.rotation.x = Math.PI / 2;
        this.scene.add(this.base);

        // Color indicator (shows target color)
        const indicatorGeometry = new THREE.CircleGeometry(0.25, 16);
        this.indicatorMaterial = new THREE.MeshBasicMaterial({
            color: this.targetColor,
            transparent: true,
            opacity: 0.3
        });
        this.indicator = new THREE.Mesh(indicatorGeometry, this.indicatorMaterial);
        this.indicator.position.copy(this.position);
        this.indicator.position.y += 0.06;
        this.indicator.rotation.x = -Math.PI / 2;
        this.scene.add(this.indicator);

        // Detection radius visualization
        const ringGeometry = new THREE.RingGeometry(this.detectionRadius - 0.5, this.detectionRadius, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: this.targetColor,
            transparent: true,
            opacity: 0.05,
            side: THREE.DoubleSide,
            wireframe: true
        });
        this.ring = new THREE.Mesh(ringGeometry, ringMaterial);
        this.ring.position.copy(this.position);
        this.ring.position.y += 0.05;
        this.ring.rotation.x = -Math.PI / 2;
        this.scene.add(this.ring);
    }

    checkColor(lightColor, lightPosition) {
        if (this.isSolved) return false;

        // Calculate distance from light to sensor
        const distance = lightPosition.distanceTo(this.position);
        
        // Only check color if within detection radius
        if (distance > this.detectionRadius) {
            return false;
        }

        const colorDistance = this.calculateColorDistance(lightColor, this.targetColor);
        const isCorrect = colorDistance < 0.3;
        
        // Enhanced logging - show RGB values
        if (colorDistance < 0.6) { // Log when somewhat close
            console.log(`🔦 Sensor ${this.id}:`);
            console.log(`   📏 Distance: ${distance.toFixed(1)}m`);
            console.log(`   🎨 Color Distance: ${colorDistance.toFixed(3)}`);
            console.log(`   🎯 Target: R=${this.targetColor.r.toFixed(3)}, G=${this.targetColor.g.toFixed(3)}, B=${this.targetColor.b.toFixed(3)}`);
            console.log(`   💡 Received: R=${lightColor.r.toFixed(3)}, G=${lightColor.g.toFixed(3)}, B=${lightColor.b.toFixed(3)}`);
            console.log(`   ✅ Correct: ${isCorrect}`);
            console.log(`---`);
        }
        
        return isCorrect;
    }

    // NEW METHOD: Check combined color from multiple lights
    checkCombinedColor(lights, lightPositions) {
        if (this.isSolved) return false;

        let combinedColor = new THREE.Color(0x000000);
        let activeLights = 0;

        // Combine colors from all lights within range
        lights.forEach((light, index) => {
            const lightPos = lightPositions[index];
            const distance = lightPos.distanceTo(this.position);
            
            if (distance < this.detectionRadius) {
                const lightColor = this.lightsManager.colorMixingManager.getCurrentMixedColor(light);
                
                // Add this light's color to the combined color
                combinedColor.r += lightColor.r;
                combinedColor.g += lightColor.g;
                combinedColor.b += lightColor.b;
                activeLights++;
            }
        });

        // If no lights in range, return false
        if (activeLights === 0) return false;

        // Average the combined color
        combinedColor.r /= activeLights;
        combinedColor.g /= activeLights;
        combinedColor.b /= activeLights;

        // Clamp values to [0, 1]
        combinedColor.r = Math.min(Math.max(combinedColor.r, 0), 1);
        combinedColor.g = Math.min(Math.max(combinedColor.g, 0), 1);
        combinedColor.b = Math.min(Math.max(combinedColor.b, 0), 1);

        const colorDistance = this.calculateColorDistance(combinedColor, this.targetColor);
        const isCorrect = colorDistance < 0.3;

        // Log combined color detection
        console.log(`🌈 Sensor ${this.id} - COMBINED COLOR:`);
        console.log(`   📊 Active lights: ${activeLights}`);
        console.log(`   🎨 Combined: R=${combinedColor.r.toFixed(3)}, G=${combinedColor.g.toFixed(3)}, B=${combinedColor.b.toFixed(3)}`);
        console.log(`   🎯 Target: R=${this.targetColor.r.toFixed(3)}, G=${this.targetColor.g.toFixed(3)}, B=${this.targetColor.b.toFixed(3)}`);
        console.log(`   📏 Color Distance: ${colorDistance.toFixed(3)}`);
        console.log(`   ✅ Correct: ${isCorrect}`);
        console.log(`---`);

        return isCorrect;
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
            }
        };
        animate();
    }
}