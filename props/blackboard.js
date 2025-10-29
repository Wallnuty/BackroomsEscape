import * as THREE from "three";

export class ImageObject {
  constructor(width = 1, height = 1, depth = 1, imagePath = null) {
    this.group = new THREE.Group();

    // --- Texture ---
    let material;
    if (imagePath) {
      const texture = new THREE.TextureLoader().load(imagePath);
      material = new THREE.MeshStandardMaterial({ map: texture });
    } else {
      material = new THREE.MeshStandardMaterial({ color: 0x999999 });
    }

    // --- Geometry (box) ---
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const mesh = new THREE.Mesh(geometry, material);
    this.group.add(mesh);

    // Optional: store references
    this.mesh = mesh;
    this.material = material;
  }

  // Update the image dynamically
  setImage(imagePath) {
    const texture = new THREE.TextureLoader().load(imagePath);
    this.material.map = texture;
    this.material.needsUpdate = true;
  }

  // Set position
  setPosition(x, y, z) {
    this.group.position.set(x, y, z);
  }

  // Set scale
  setScale(x, y, z) {
    this.group.scale.set(x, y, z);
  }
}