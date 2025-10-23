import * as THREE from 'three';

/**
 * Manages a canvas texture to display text on a mesh surface.
 */
export class DisplaySurface {
    /**
     * @param {THREE.Mesh} mesh The mesh to apply the display texture to.
     * @param {number} [width=1024] The width of the canvas texture.
     * @param {number} [height=512] The height of the canvas texture.
     */
    constructor(mesh, width = 1024, height = 512) {
        this.mesh = mesh;
        this.canvas = document.createElement('canvas');
        this.canvas.width = width;
        this.canvas.height = height;
        this.context = this.canvas.getContext('2d');

        // Create a texture from the canvas
        this.texture = new THREE.CanvasTexture(this.canvas);
        this.texture.flipY = false; // Important for GLB models
        this.texture.encoding = THREE.sRGBEncoding;
        this.texture.wrapS = THREE.ClampToEdgeWrapping;
        this.texture.wrapT = THREE.ClampToEdgeWrapping;

        // Replace the mesh's material with a new one using our canvas texture
        const originalMaterial = this.mesh.material;
        this.mesh.material = new THREE.MeshStandardMaterial({
            map: this.texture,
            // show only on the front face to avoid the texture appearing mirrored/warped on the back
            side: THREE.FrontSide,
            metalness: originalMaterial.metalness || 0.0,
            roughness: originalMaterial.roughness || 0.8,
        });

        // Ensure the original material is disposed to prevent memory leaks
        originalMaterial.dispose();

        // Clear the surface initially
        this.clear();
    }

    /**
     * Draws text onto the canvas surface.
     * @param {string} text The text to display.
     */
    drawText(text) {
        if (!this.context) return;

        // Clear the canvas first
        this.clear();

        // Set font properties
        const fontSize = Math.floor(this.canvas.height * 0.5); // Large font size relative to canvas height
        this.context.font = `bold ${fontSize}px Arial`;
        this.context.fillStyle = 'black';
        this.context.textAlign = 'center';
        this.context.textBaseline = 'middle';

        // Draw the text in the center of the canvas
        this.context.fillText(text, this.canvas.width / 2, this.canvas.height / 2);

        // Mark the texture for update so the changes appear on the model
        this.texture.needsUpdate = true;
    }

    /**
     * Clears the display surface to its default background color.
     */
    clear() {
        if (!this.context) return;
        this.context.fillStyle = '#f0f0f0'; // Off-white whiteboard color
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.texture.needsUpdate = true;
    }
}