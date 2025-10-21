import * as THREE from "three";
import * as CANNON from "cannon-es";

export class Hallway {
  constructor(scene, world, start, end, height, width) {
    this.scene = scene;
    this.world = world;

    try {
      const dir = new THREE.Vector3().subVectors(end, start);
      const length = dir.length();
      const midpoint = new THREE.Vector3()
        .addVectors(start, end)
        .multiplyScalar(0.5);

      console.log("Creating hallway:", { start, end, length, midpoint });

      // Visual
      const geo = new THREE.BoxGeometry(length, height, width);
      const mat = new THREE.MeshStandardMaterial({ color: 0x999999 });
      this.mesh = new THREE.Mesh(geo, mat);

      this.mesh.position.copy(midpoint);
      this.mesh.lookAt(end);
      scene.add(this.mesh);

      console.log("Hallway mesh created at:", this.mesh.position);

      // Physics - keep box aligned to world axes
      const shape = new CANNON.Box(
        new CANNON.Vec3(length / 2, height / 2, width / 2)
      );
      this.body = new CANNON.Body({ mass: 0 });
      this.body.addShape(shape);
      this.body.position.set(midpoint.x, midpoint.y, midpoint.z);
      world.addBody(this.body);

      console.log("Hallway physics body created at:", this.body.position);
    } catch (error) {
      console.error("Error creating Hallway:", error);
      throw error;
    }
  }
}
