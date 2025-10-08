import * as THREE from 'three';

/**
 * A class representing a ceiling light panel, including a visible mesh and a RectAreaLight.
 */
export class LightPanel {
    /**
     * @param {object} options
     * @param {number} [options.intensity=13] - The intensity of the light.
     * @param {number} [options.width=2] - The width of the light panel.
     * @param {number} [options.height=2] - The height (depth) of the light panel.
     * @param {THREE.ColorRepresentation} [options.color=0xffffff] - The color of the light.
     */
    constructor({ intensity = 13, width = 2, height = 2, color = 0xffffff } = {}) {
        this.group = new THREE.Group();

        const lightPanelGeometry = new THREE.PlaneGeometry(width, height);
        const lightPanelMaterial = new THREE.MeshStandardMaterial({
            emissive: color,
            color: color,
            side: THREE.DoubleSide
        });

        // The visible emissive panel mesh
        const lightPanelMesh = new THREE.Mesh(lightPanelGeometry, lightPanelMaterial);
        lightPanelMesh.rotation.x = Math.PI / 2;
        lightPanelMesh.position.y = -0.05;
        this.group.add(lightPanelMesh);

        // The actual light source
        const rectLight = new THREE.RectAreaLight(color, intensity, width, height);
        rectLight.rotation.x = -Math.PI / 2; // Point down
        this.group.add(rectLight);

        //Make it accessible from PlaygroundRoom
        this.light = rectLight;
    }

    /**
     * Sets the position of the light panel group.
     * @param {number} x
     * @param {number} y
     * @param {number} z
     */
    setPosition(x, y, z) {
        this.group.position.set(x, y, z);
    }
}