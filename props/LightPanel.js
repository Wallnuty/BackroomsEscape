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
     * @param {boolean} [options.flicker=false] - Optional flag indicating this panel should flicker.
     */
    constructor({ intensity = 13, width = 2, height = 2, color = 0xffffff, flicker = false } = {}) {
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
        lightPanelMesh.position.y = -0.05; // Offset slightly from the light source to prevent z-fighting
        this.group.add(lightPanelMesh);

        // The actual light source
        const rectLight = new THREE.RectAreaLight(color, intensity, width, height);
        rectLight.rotation.x = -Math.PI / 2; // Point down
        this.group.add(rectLight);

        // store flicker flag for future use
        this.flicker = !!flicker;
        this.rectLight = rectLight;
        this.mesh = lightPanelMesh;

        // store base intensity so periodic blackout can restore it
        this.baseIntensity = intensity;
        // track periodic blackout timers
        this._blackoutInterval = null;
        this._blackoutTimeouts = []; // store multiple timeout ids for double-flicker sequence

        // --- NEW: Use 2-1-3 blink pattern if flicker is true ---
        if (this.flicker) {
            this.startBlinkPattern_213();
        }
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

    /**
     * Start a periodic blackout: every intervalMs milliseconds the area light
     * is set to 0 for blackoutMs milliseconds twice (double flicker) with a short gap,
     * then restored. Default: every 3000ms, two blackouts of 300ms separated by 120ms.
     * Safe to call multiple times (no duplicate intervals).
     * @param {number} [intervalMs=3000]
     * @param {number} [blackoutMs=300]
     * @param {number} [gapMs=120] - gap between the two off-pulses
     */
    startPeriodicBlackout(intervalMs = 3000, blackoutMs = 200, gapMs = 105) {
        if (this._blackoutInterval) return;
        if (typeof this.baseIntensity !== 'number') this.baseIntensity = this.rectLight?.intensity || 0;

        // ensure array exists
        this._blackoutTimeouts = this._blackoutTimeouts || [];

        this._blackoutInterval = setInterval(() => {
            // first blackout
            if (this.rectLight) this.rectLight.intensity = 0;
            if (this.mesh && this.mesh.material) this.mesh.material.emissiveIntensity = 0;

            // restore after blackoutMs
            const t1 = setTimeout(() => {
                if (this.rectLight) this.rectLight.intensity = this.baseIntensity;
                if (this.mesh && this.mesh.material) this.mesh.material.emissiveIntensity = 1;

                // brief gap, then second blackout
                const t2 = setTimeout(() => {
                    if (this.rectLight) this.rectLight.intensity = 0;
                    if (this.mesh && this.mesh.material) this.mesh.material.emissiveIntensity = 0;

                    // restore after blackoutMs
                    const t3 = setTimeout(() => {
                        if (this.rectLight) this.rectLight.intensity = this.baseIntensity;
                        if (this.mesh && this.mesh.material) this.mesh.material.emissiveIntensity = 1;
                    }, blackoutMs);

                    this._blackoutTimeouts.push(t3);
                }, gapMs);

                this._blackoutTimeouts.push(t2);
            }, blackoutMs);

            this._blackoutTimeouts.push(t1);
        }, intervalMs);
    }

    /**
     * Stop the periodic blackout timers and restore intensity immediately.
     */
    stopPeriodicBlackout() {
        if (this._blackoutInterval) {
            clearInterval(this._blackoutInterval);
            this._blackoutInterval = null;
        }

        if (this._blackoutTimeouts && this._blackoutTimeouts.length) {
            for (let i = 0; i < this._blackoutTimeouts.length; i++) {
                clearTimeout(this._blackoutTimeouts[i]);
            }
            this._blackoutTimeouts.length = 0;
        }

        // Also stop the 2-1-3 pattern if running
        this.stopBlinkPattern_213 && this.stopBlinkPattern_213();

        // restore
        if (this.rectLight) this.rectLight.intensity = this.baseIntensity;
        if (this.mesh && this.mesh.material) this.mesh.material.emissiveIntensity = 1;
    }

    /**
     * Turns off the light and its emissive panel.
     */
    turnOff() {
        if (this.rectLight) this.rectLight.intensity = 0;
        if (this.mesh && this.mesh.material) this.mesh.material.emissiveIntensity = 0;
    }

    /**
     * Start a 2-1-3 blink pattern if flicker is true.
     * Each blink is blackoutMs ms off, gapMs ms on between blinks, then patternPauseMs between patterns.
     * Example: blink-blink-(pause)-blink-(pause)-blink-blink-blink-(long pause)-repeat
     */
    startBlinkPattern_213(blackoutMs = 160, gapMs = 120, patternPauseMs = 700, longPauseMs = 2000) {
        if (this._blinkPatternInterval) return;
        if (typeof this.baseIntensity !== 'number') this.baseIntensity = this.rectLight?.intensity || 0;

        const blink = (count, cb) => {
            let i = 0;
            const doBlink = () => {
                if (i >= count) {
                    if (cb) cb();
                    return;
                }
                // Off
                if (this.rectLight) this.rectLight.intensity = 0;
                if (this.mesh && this.mesh.material) this.mesh.material.emissiveIntensity = 0;
                setTimeout(() => {
                    // On
                    if (this.rectLight) this.rectLight.intensity = this.baseIntensity;
                    if (this.mesh && this.mesh.material) this.mesh.material.emissiveIntensity = 1;
                    i++;
                    setTimeout(doBlink, gapMs);
                }, blackoutMs);
            };
            doBlink();
        };

        const pattern = () => {
            blink(2, () => {
                setTimeout(() => {
                    blink(1, () => {
                        setTimeout(() => {
                            blink(3, () => {
                                setTimeout(pattern, longPauseMs); // <-- Use long pause here
                            });
                        }, patternPauseMs);
                    });
                }, patternPauseMs);
            });
        };

        pattern();
        this._blinkPatternInterval = true; // just a flag to prevent re-entry
    }

    /**
     * Stop the 2-1-3 blink pattern.
     */
    stopBlinkPattern_213() {
        this._blinkPatternInterval = false;
        // Restore light immediately
        if (this.rectLight) this.rectLight.intensity = this.baseIntensity;
        if (this.mesh && this.mesh.material) this.mesh.material.emissiveIntensity = 1;
    }
}