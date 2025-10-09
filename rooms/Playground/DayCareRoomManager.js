import * as THREE from 'three';
import { PlaygroundRoom } from './PlaygroundRoom.js';
import { SignInRoom } from './SignInRoom.js';
import { ExtraRoom } from './ExtraRoom.js';
import { Hallway } from './Hallway.js';

export class DayCareRoomManager {
    constructor(scene, world) {
        this.scene = scene;
        this.world = world;

        this.rooms = {};
        this.hallways = [];
        this.corridorWidth = 6;

        this._setupRooms();
        this._setupHallways();
    }

    _setupRooms() {
        const playgroundPos = new THREE.Vector3(0, 0, 0);
        const signInPos = new THREE.Vector3(60, 0, 0);
        const extraPos = new THREE.Vector3(120, 0, 0);

        // Pass connections to allow corridor openings
        this.rooms.Playground = new PlaygroundRoom(this.scene, this.world, playgroundPos, { front: 'SignIn' }, this.corridorWidth);
        this.rooms.SignIn = new SignInRoom(this.scene, this.world, signInPos, { back: 'Playground', front: 'ExtraRoom' }, this.corridorWidth);
        this.rooms.ExtraRoom = new ExtraRoom(this.scene, this.world, extraPos, { back: 'SignIn' }, this.corridorWidth);
    }

    _setupHallways() {
        const playground = this.rooms.Playground;
        const signIn = this.rooms.SignIn;
        const extra = this.rooms.ExtraRoom;

        this.hallways.push(new Hallway(this.scene, this.world, 
            playground.position.clone().add(new THREE.Vector3(playground.width/2,0,0)), 
            signIn.position.clone().add(new THREE.Vector3(-signIn.width/2,0,0)),
            4, this.corridorWidth));

        this.hallways.push(new Hallway(this.scene, this.world, 
            signIn.position.clone().add(new THREE.Vector3(signIn.width/2,0,0)), 
            extra.position.clone().add(new THREE.Vector3(-extra.width/2,0,0)),
            4, this.corridorWidth));
    }

    unload() {
        Object.values(this.rooms).forEach(r => r.unload());
        this.hallways.forEach(h => this.world.removeBody(h.body));
    }
}
