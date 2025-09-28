import * as THREE from 'three';
import { updateLightColorMixing, clearColorMixing } from './createPickupLight.js';

export class ColorMixingManager {
  constructor() {
    this.activeLights = new Map();
    this.mixingZones = [];
    this.overlapThreshold = 1.0; // Changed from 3.0 to 1.0 as requested
  }

  addLight(lightGroup) {
    this.activeLights.set(lightGroup, {
      mixedColors: [],
      position: new THREE.Vector3()
    });
  }

  removeLight(lightGroup) {
    this.activeLights.delete(lightGroup);
    clearColorMixing(lightGroup);
  }

  updateColorMixing() {
    const lights = Array.from(this.activeLights.keys());
    
    // Reset all mixes first
    lights.forEach(light => {
      if (light.userData) {
        light.userData.mixedColors = [];
      }
    });

    // Check for overlaps between all light pairs within 1.0 unit distance
    for (let i = 0; i < lights.length; i++) {
      const lightA = lights[i];
      const posA = new THREE.Vector3();
      lightA.getWorldPosition(posA);
      
      for (let j = i + 1; j < lights.length; j++) {
        const lightB = lights[j];
        const posB = new THREE.Vector3();
        lightB.getWorldPosition(posB);
        
        const distance = posA.distanceTo(posB);
        
        // Only mix if lights are within 1.0 unit distance
        if (distance < this.overlapThreshold) {
          this.mixColors(lightA, lightB, distance);
        }
      }
      
      // Update shader with current mixed colors
      if (lights[i].userData) {
        updateLightColorMixing(lights[i], lights[i].userData.mixedColors || []);
      }
    }
  }

  lightsOverlap(lightA, lightB) {
    const posA = new THREE.Vector3();
    const posB = new THREE.Vector3();
    lightA.getWorldPosition(posA);
    lightB.getWorldPosition(posB);
    
    const distance = posA.distanceTo(posB);
    return distance < this.overlapThreshold;
  }

  mixColors(lightA, lightB, distance) {
    if (!lightA.userData || !lightB.userData) return;
    
    const colorA = lightA.userData.primaryColor;
    const colorB = lightB.userData.primaryColor;
    
    // Calculate mix weight based on distance (stronger when closer)
    const normalizedDistance = distance / this.overlapThreshold; // 0 to 1
    const mixWeight = (1.0 - normalizedDistance) * 0.8; // 0.8 max at 0 distance, 0 at 1.0 distance
    
    // Add B's color to A
    if (!this.hasColorMix(lightA, colorB)) {
      if (!lightA.userData.mixedColors) lightA.userData.mixedColors = [];
      lightA.userData.mixedColors.push({
        color: colorB.clone(),
        weight: mixWeight
      });
    }
    
    // Add A's color to B
    if (!this.hasColorMix(lightB, colorA)) {
      if (!lightB.userData.mixedColors) lightB.userData.mixedColors = [];
      lightB.userData.mixedColors.push({
        color: colorA.clone(),
        weight: mixWeight
      });
    }
  }

  hasColorMix(lightGroup, color) {
    if (!lightGroup.userData || !lightGroup.userData.mixedColors) return false;
    
    return lightGroup.userData.mixedColors.some(mix => 
      mix.color && mix.color.equals && mix.color.equals(color)
    );
  }

  addMixingZone(position, radius) {
    this.mixingZones.push({ position, radius });
  }

  // For puzzle mechanics - force specific color mixes
  forceColorMix(lightGroup, targetColor, intensity = 1.0) {
    if (!lightGroup.userData) return;
    
    if (!lightGroup.userData.mixedColors) lightGroup.userData.mixedColors = [];
    lightGroup.userData.mixedColors.push({
      color: new THREE.Color(targetColor),
      weight: intensity
    });
    updateLightColorMixing(lightGroup, lightGroup.userData.mixedColors);
  }

  // Check if a light has reached a target color (for puzzle completion)
  checkColorMatch(lightGroup, targetColor, tolerance = 0.1) {
    const currentColor = this.getCurrentMixedColor(lightGroup);
    const colorDistance = this.calculateColorDistance(currentColor, targetColor);
    return colorDistance < tolerance;
  }

  getCurrentMixedColor(lightGroup) {
    if (!lightGroup.userData || !lightGroup.userData.primaryColor) {
      return new THREE.Color();
    }
    
    let mixedColor = lightGroup.userData.primaryColor.clone();
    
    if (lightGroup.userData.mixedColors) {
      lightGroup.userData.mixedColors.forEach(mix => {
        if (mix.color) {
          mixedColor.r += mix.color.r * mix.weight;
          mixedColor.g += mix.color.g * mix.weight;
          mixedColor.b += mix.color.b * mix.weight;
        }
      });
    }
    
    // Manual clamping
    mixedColor.r = Math.min(Math.max(mixedColor.r, 0), 1);
    mixedColor.g = Math.min(Math.max(mixedColor.g, 0), 1);
    mixedColor.b = Math.min(Math.max(mixedColor.b, 0), 1);
    
    return mixedColor;
  }

  // Add this method to calculate color distance safely
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
}