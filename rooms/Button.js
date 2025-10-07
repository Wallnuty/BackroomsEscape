import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class RoomButton {
    constructor(scene, physicsWorld, position, onActivate) {
        // Create visible mesh
        const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        const material = new THREE.MeshStandardMaterial({
            color: 0xff3333,
            emissive: 0x550000,
            metalness: 0.5,
            roughness: 0.3
        });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(position);
        scene.add(this.mesh);

        // Add subtle glow
        const light = new THREE.PointLight(0xff5555, 2, 5);
        light.position.copy(position);
        scene.add(light);

        // Physics body (static)
        const shape = new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5));
        this.body = new CANNON.Body({ mass: 0 });
        this.body.addShape(shape);
        this.body.position.copy(position);
        physicsWorld.addBody(this.body);

        this.onActivate = onActivate;
        this.active = true;
        this.interactionDistance = 2; // meters
    }

    /**
     * Check if the player is close enough and pressing E
     */
    update(playerPos) {
    if (!this.active) return;

    const dx = playerPos.x - this.body.position.x;
    const dz = playerPos.z - this.body.position.z;
    const dist = Math.sqrt(dx*dx + dz*dz);

    // Visual feedback
    if (dist < this.interactionDistance) {
        this.mesh.material.emissive.setHex(0x0033ff);
    } else {
        this.mesh.material.emissive.setHex(0x550000);
    }

    // Interaction
    if (dist < this.interactionDistance && this._pressedE) {
        this.active = false;
        this.onActivate();
    }
}


    /**
     * Called from global key listener
     */
    handleKeyDown(event) {
        if (event.code === 'KeyE') this._pressedE = true;
    }

    handleKeyUp(event) {
        if (event.code === 'KeyE') this._pressedE = false;
    }
}
