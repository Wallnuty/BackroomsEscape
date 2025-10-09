import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class Hallway {
    constructor(scene, world, start, end, height, width) {
        this.scene = scene;
        this.world = world;

        const dir = new THREE.Vector3().subVectors(end, start);
        const length = dir.length();
        const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);

        // Visual
        const geo = new THREE.BoxGeometry(length, height, width);
        const mat = new THREE.MeshStandardMaterial({ color: 0x999999 });
        const mesh = new THREE.Mesh(geo, mat);

        mesh.position.copy(midpoint);
        mesh.lookAt(end);
        scene.add(mesh);

        // Physics
        const shape = new CANNON.Box(new CANNON.Vec3(length/2, height/2, width/2));
        const body = new CANNON.Body({ mass: 0 });
        body.addShape(shape);
        body.position.set(midpoint.x, midpoint.y, midpoint.z);
        const axis = new CANNON.Vec3(dir.x, dir.y, dir.z).unit();
        body.quaternion.setFromVectors(new CANNON.Vec3(1,0,0), axis);
        world.addBody(body);
    }
}
