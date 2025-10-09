import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomLayouts } from './PlaygroundLayout.js';
import { LightPanel } from '../../props/LightPanel.js';

export class ExtraRoom {
    constructor(scene, world, position = new THREE.Vector3(0,0,0), connections = {}, corridorWidth = 6) {
        this.scene = scene;
        this.world = world;
        this.position = position;
        this.corridorWidth = corridorWidth;

        this.group = new THREE.Group();
        this.group.position.copy(position);
        scene.add(this.group);

        this.loader = new GLTFLoader();
        this.bodies = [];
        this.models = [];

        const layout = RoomLayouts.Extra;
        this.width = layout.width;
        this.height = layout.height;
        this.depth = layout.depth;

        // Compute openings for hallways
        this.openings = [];
        const hw = corridorWidth / 2;
        for (const [wall, connectedRoom] of Object.entries(connections)) {
            if (!connectedRoom) continue;
            if (wall === 'back' || wall === 'front') this.openings.push({ wall, xMin: -hw, xMax: hw });
            else this.openings.push({ wall, zMin: -hw, zMax: hw });
        }

        this._createVisuals();
        this._createPhysicsWalls();
        this._loadModels();
        this._setupLights();
    }

    _createVisuals() {
        const loader = new THREE.TextureLoader();
        const halfW = this.width / 2;
        const halfH = this.height / 2;
        const halfD = this.depth / 2;

        // Floor
        const floorMaterial = new THREE.MeshStandardMaterial({
            map: loader.load('textures/floor/floor_basecolor.jpg'),
            normalMap: loader.load('textures/floor/floor_normalgl.png'),
            roughnessMap: loader.load('textures/floor/floor_roughness.png'),
        });
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(this.width, this.depth), floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -halfH;
        this.group.add(floor);

        // Ceiling
        const ceilingMaterial = new THREE.MeshStandardMaterial({
            map: loader.load('textures/ceiling/ceiling_basecolor.png'),
            normalMap: loader.load('textures/ceiling/ceiling_normalgl.png'),
            roughnessMap: loader.load('textures/ceiling/ceiling_roughness.png'),
        });
        const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(this.width, this.depth), ceilingMaterial);
        ceiling.rotation.x = Math.PI / 2;
        ceiling.position.y = halfH;
        this.group.add(ceiling);

        // Walls
        const wallPaths = [
            { base: 'textures/walls/wall1_basecolor.png', normal: 'textures/walls/wall1_normalgl.png', rough: 'textures/walls/wall1_roughness.png' },
            { base: 'textures/walls/wall2_basecolor.png', normal: 'textures/walls/wall2_normalgl.png', rough: 'textures/walls/wall2_roughness.png' },
            { base: 'textures/walls/wall3_basecolor.png', normal: 'textures/walls/wall3_normalgl.png', rough: 'textures/walls/wall3_roughness.png' },
            { base: 'textures/walls/wall4_basecolor.png', normal: 'textures/walls/wall4_normalgl.png', rough: 'textures/walls/wall4_roughness.png' }
        ];
        const wallNames = ['back','right','front','left'];

        for (let i = 0; i < 4; i++) {
            const material = new THREE.MeshStandardMaterial({
                map: loader.load(wallPaths[i].base),
                normalMap: loader.load(wallPaths[i].normal),
                roughnessMap: loader.load(wallPaths[i].rough),
            });

            const openings = this.openings.filter(o => o.wall === wallNames[i]);
            const isZWall = (wallNames[i] === 'back' || wallNames[i] === 'front');

            if (openings.length === 0) {
                let mesh;
                if (isZWall) {
                    mesh = new THREE.Mesh(new THREE.PlaneGeometry(this.width, this.height), material);
                    mesh.position.set(0, 0, wallNames[i] === 'back' ? -halfD : halfD);
                } else {
                    mesh = new THREE.Mesh(new THREE.PlaneGeometry(this.depth, this.height), material);
                    mesh.position.set(wallNames[i] === 'left' ? -halfW : halfW, 0, 0);
                    mesh.rotation.y = wallNames[i] === 'left' ? -Math.PI / 2 : Math.PI / 2;
                }
                this.group.add(mesh);
            } else {
                // Split wall segments
                let segments = [];
                if (isZWall) {
                    openings.sort((a, b) => a.xMin - b.xMin);
                    let lastX = -halfW;
                    openings.forEach(o => {
                        const leftWidth = o.xMin - lastX;
                        if (leftWidth > 0) segments.push({ x: lastX + leftWidth / 2, w: leftWidth });
                        lastX = o.xMax;
                    });
                    const rightWidth = halfW - lastX;
                    if (rightWidth > 0) segments.push({ x: lastX + rightWidth / 2, w: rightWidth });
                    segments.forEach(s => {
                        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(s.w, this.height), material);
                        mesh.position.set(s.x, 0, wallNames[i] === 'back' ? -halfD : halfD);
                        this.group.add(mesh);
                    });
                } else {
                    openings.sort((a, b) => a.zMin - b.zMin);
                    let lastZ = -halfD;
                    openings.forEach(o => {
                        const depth = o.zMin - lastZ;
                        if (depth > 0) segments.push({ z: lastZ + depth / 2, d: depth });
                        lastZ = o.zMax;
                    });
                    const backDepth = halfD - lastZ;
                    if (backDepth > 0) segments.push({ z: lastZ + backDepth / 2, d: backDepth });
                    segments.forEach(s => {
                        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(s.d, this.height), material);
                        mesh.position.set(wallNames[i] === 'left' ? -halfW : halfW, 0, s.z);
                        mesh.rotation.y = wallNames[i] === 'left' ? -Math.PI / 2 : Math.PI / 2;
                        this.group.add(mesh);
                    });
                }
            }
        }
    }

    _createPhysicsWalls() {
        const t = 0.5;
        const halfW = this.width / 2;
        const halfH = this.height / 2;
        const halfD = this.depth / 2;

        const addWall = (x, y, z, sx, sy, sz) => {
            const shape = new CANNON.Box(new CANNON.Vec3(sx, sy, sz));
            const body = new CANNON.Body({ mass: 0 });
            body.addShape(shape);
            body.position.set(this.position.x + x, this.position.y + y, this.position.z + z);
            this.world.addBody(body);
            this.bodies.push(body);
        };

        const walls = ['back','right','front','left'];
        walls.forEach(wName => {
            const openings = this.openings.filter(o => o.wall === wName);
            if (openings.length === 0) {
                switch(wName){
                    case 'back': addWall(0,0,-halfD-t/2, halfW, halfH, t/2); break;
                    case 'front': addWall(0,0,halfD+t/2, halfW, halfH, t/2); break;
                    case 'left': addWall(-halfW-t/2,0,0, t/2, halfH, halfD); break;
                    case 'right': addWall(halfW+t/2,0,0, t/2, halfH, halfD); break;
                }
            } else {
                openings.forEach(o => {
                    if (wName === 'back' || wName === 'front') {
                        const z = wName === 'back' ? -halfD - t/2 : halfD + t/2;
                        const leftWidth = o.xMin + halfW;
                        const rightWidth = halfW - o.xMax;
                        if (leftWidth > 0) addWall(-halfW + leftWidth / 2, 0, z, leftWidth / 2, halfH, t/2);
                        if (rightWidth > 0) addWall(o.xMax - halfW + rightWidth/2, 0, z, rightWidth/2, halfH, t/2);
                    } else {
                        const x = wName === 'left' ? -halfW-t/2 : halfW+t/2;
                        const bottomDepth = o.zMin + halfD;
                        const topDepth = halfD - o.zMax;
                        if(bottomDepth>0) addWall(x,0,-halfD+bottomDepth/2,t/2,halfH,bottomDepth/2);
                        if(topDepth>0) addWall(x,0,o.zMax-halfD+topDepth/2,t/2,halfH,topDepth/2);
                    }
                });
            }
        });

        // Ceiling
        addWall(0, halfH+t/2, 0, halfW, t/2, halfD);
    }

    _loadModels() {
        const layout = RoomLayouts.Extra;
        if(!layout.models) return;
        layout.models.forEach(modelData => {
            this.loader.load(modelData.path, gltf => {
                const obj = gltf.scene;
                obj.position.copy(modelData.position);
                obj.scale.copy(modelData.scale);
                obj.rotation.set(modelData.rotation.x, modelData.rotation.y, modelData.rotation.z);
                this.group.add(obj);
                this.models.push(obj);

                if(!this.world) return;
                const compoundBody = new CANNON.Body({ mass: 0 });
                const bbox = new THREE.Box3().setFromObject(obj);
                const size = new THREE.Vector3();
                bbox.getSize(size);
                const box = new CANNON.Box(new CANNON.Vec3(size.x/2,size.y/2,size.z/2));
                compoundBody.addShape(box);
                compoundBody.position.set(obj.position.x,obj.position.y,obj.position.z);
                this.world.addBody(compoundBody);
                this.bodies.push(compoundBody);
            });
        });
    }

    _setupLights() {
        const layout = RoomLayouts.Extra;
        const ceilingY = this.height / 2 - 0.1;
        layout.lights.forEach(([x, z]) => {
            const panel = new LightPanel({ intensity: 13, width: 2, height: 2, color: 0xffffff });
            panel.setPosition(x, ceilingY, z);
            this.group.add(panel.group);
        });
    }

    update(delta){}
    unload(){
        this.models.forEach(obj => this.group.remove(obj));
        this.bodies.forEach(b => this.world.removeBody(b));
        this.scene.remove(this.group);
    }
    getSpawnPosition(){ return new THREE.Vector3(0,-1.8,0);}
}
