import * as THREE from 'three';

export function createPickupLight(hexColor = 0xff0000, { type = 'spot', intensity = 8, distance = 100 } = {}) {
  const group = new THREE.Group();
  group.name = 'pickupLight';
  group.userData.isPickupLight = true;
  group.userData.lightColor = new THREE.Color(hexColor);
  group.userData.primaryColor = new THREE.Color(hexColor);
  group.userData.mixedColors = [];

  // ----- body cube -----
  const bodyGeo = new THREE.BoxGeometry(0.36, 0.36, 0.6);
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.2, roughness: 0.5 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.castShadow = true;
  group.add(body);

  // ----- bezel -----
  const bezelGeo = new THREE.TorusGeometry(0.12, 0.03, 12, 24);
  const bezelMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
  const bezel = new THREE.Mesh(bezelGeo, bezelMat);
  bezel.rotation.x = Math.PI;
  bezel.position.z = -0.33;
  group.add(bezel);

  // ----- disc (always shows primary color) -----
  const discGeo = new THREE.CircleGeometry(0.09, 32);
  const discMat = new THREE.MeshBasicMaterial({ 
    color: hexColor, 
    transparent: true, 
    opacity: 1.0 
  });
  const disc = new THREE.Mesh(discGeo, discMat);
  disc.position.z = -0.345;
  disc.rotation.x = Math.PI;
  group.add(disc);

  // ----- actual light (this is what will change color for the ray) -----
  let light;
  let lightTarget;
  
  if (type === 'spot') {
    light = new THREE.SpotLight(hexColor, intensity, distance, Math.PI / 6, 0.1, 1);
    
    lightTarget = new THREE.Object3D();
    light.target = lightTarget;
    group.add(lightTarget);
    
    light.position.set(0, 0, 0.33);
    lightTarget.position.set(0, 0, -10);
    
    light.decay = 0.5;
    light.penumbra = 0;
    light.angle = Math.PI / 8;
  } else {
    light = new THREE.PointLight(hexColor, intensity, distance, 2);
    light.position.set(0, 0, 0.33);
  }
  
  light.castShadow = false;
  group.add(light);

  // Store references for color mixing
  group.userData.lightTarget = lightTarget;
  group.userData.actualLight = light;
  group.userData.discMaterial = discMat;
  group.userData.disc = disc;

  return { group, light, disc };
}

// --- Update the color mixing function ---
export function updateLightColorMixing(lightGroup, mixedColors = []) {
  const actualLight = lightGroup.userData.actualLight;
  
  if (!actualLight) return;

  // Calculate the mixed color for the light ray
  let mixedColor = lightGroup.userData.primaryColor.clone();
  
  mixedColors.forEach(mix => {
    // Add the mixed color with its weight
    mixedColor.r += mix.color.r * mix.weight;
    mixedColor.g += mix.color.g * mix.weight;
    mixedColor.b += mix.color.b * mix.weight;
  });
  
  // Manual clamping since THREE.Color.clamp() doesn't exist
  mixedColor.r = Math.min(Math.max(mixedColor.r, 0), 1);
  mixedColor.g = Math.min(Math.max(mixedColor.g, 0), 1);
  mixedColor.b = Math.min(Math.max(mixedColor.b, 0), 1);
  
  // Update the actual light color (this affects the ray)
  actualLight.color.copy(mixedColor);
}

// Remove the cone update function since we don't have visual cones anymore
export function updateCones(pickableRoots, walls = []) {
  // This function is no longer needed since we removed the visual cone
  // But we keep it to avoid breaking existing calls
}

export function updateHeldLightTarget(heldLight, camera) {
  if (!heldLight || !heldLight.userData.lightTarget) return;
  
  const lightTarget = heldLight.userData.lightTarget;
  const cameraWorldDir = new THREE.Vector3();
  camera.getWorldDirection(cameraWorldDir);
  
  const lightWorldPos = new THREE.Vector3();
  heldLight.getWorldPosition(lightWorldPos);
  
  const targetWorldPos = lightWorldPos.clone().add(cameraWorldDir.multiplyScalar(10));
  lightTarget.position.copy(heldLight.worldToLocal(targetWorldPos));
}

export function clearColorMixing(lightGroup) {
  lightGroup.userData.mixedColors = [];
  const actualLight = lightGroup.userData.actualLight;
  if (actualLight) {
    // Reset to primary color
    actualLight.color.copy(lightGroup.userData.primaryColor);
  }
  updateLightColorMixing(lightGroup, []);
}