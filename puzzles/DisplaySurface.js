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
    constructor(mesh, width = 2048, height = 1024) { // Increased resolution
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
        // Anisotropic filtering greatly improves texture quality at sharp angles
        // A value of 16 is a good default. For best results, this should be set
        // to renderer.capabilities.getMaxAnisotropy().
        this.texture.anisotropy = 16;

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
     * @param {object} [options] - Drawing options.
     * @param {number} [options.x] - X position on the canvas.
     * @param {number} [options.y] - Y position on the canvas.
     * @param {number} [options.fontSize] - Font size in pixels.
     * @param {number} [options.rotation] - Rotation in radians.
     * @param {number} [options.scaleX] - Horizontal scale factor.
     * @param {number} [options.scaleY] - Vertical scale factor.
     */
    async drawText(text, options = {}) {
        if (!this.context) return;

        // Wait for the custom font to be loaded before drawing
        if (document.fonts) {
            try {
                // This will wait until the font is available
                await document.fonts.load(`bold ${options.fontSize ?? Math.floor(this.canvas.height * 0.5)}px "DryWhiteboardMarker"`);
                await document.fonts.ready;
            } catch (e) {
                // Ignore errors, fallback to Arial
            }
        }

        // Clear the canvas first
        this.clear();

        // Default values
        const x = options.x ?? this.canvas.width / 2;
        const y = options.y ?? this.canvas.height / 2;
        const fontSize = options.fontSize ?? Math.floor(this.canvas.height * 0.5);
        const rotation = options.rotation ?? 0;
        const scaleX = options.scaleX ?? 1;
        const scaleY = options.scaleY ?? 1;

        this.context.save();
        this.context.font = `bold ${fontSize}px "DryWhiteboardMarker", Arial`;
        this.context.fillStyle = 'black';
        this.context.textAlign = 'center';
        this.context.textBaseline = 'middle';
        this.context.translate(x, y);
        this.context.rotate(rotation);
        this.context.scale(scaleX, scaleY);
        this.context.fillText(text, 0, 0);
        this.context.restore();
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