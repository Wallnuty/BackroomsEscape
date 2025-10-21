import * as THREE from "three";
import { PlaygroundRoom } from "./PlaygroundRoom.js";
import { SignInRoom } from "./SignInRoom.js";
import { ExtraRoom } from "./ExtraRoom.js";
import { Hallway } from "./Hallway.js";

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
    // Positions along X axis
    const playgroundPos = new THREE.Vector3(0, 0, 0);
    const signInPos = new THREE.Vector3(60, 0, 0); // corridor length + half widths
    const extraPos = new THREE.Vector3(120, 0, 0);

    // Pass connections to allow corridor openings
    this.rooms.Playground = new PlaygroundRoom(
      this.scene,
      this.world,
      playgroundPos
    );
    this.rooms.SignIn = new SignInRoom(
      this.scene,
      this.world,
      signInPos,
      { back: "Playground", front: "ExtraRoom" },
      this.corridorWidth
    );
    this.rooms.ExtraRoom = new ExtraRoom(
      this.scene,
      this.world,
      extraPos,
      { back: "SignIn" },
      this.corridorWidth
    );
  }

  _setupHallways() {
    const playground = this.rooms.Playground;
    const signIn = this.rooms.SignIn;
    const extra = this.rooms.ExtraRoom;

    const corridorHeight = 4;

    // Playground → SignIn
    const start1 = playground.position
      .clone()
      .add(new THREE.Vector3(playground.width / 2, 0, 0));
    const end1 = signIn.position
      .clone()
      .add(new THREE.Vector3(-signIn.width / 2, 0, 0));
    this.hallways.push(
      new Hallway(
        this.scene,
        this.world,
        start1,
        end1,
        corridorHeight,
        this.corridorWidth
      )
    );

    // SignIn → ExtraRoom
    const start2 = signIn.position
      .clone()
      .add(new THREE.Vector3(signIn.width / 2, 0, 0));
    const end2 = extra.position
      .clone()
      .add(new THREE.Vector3(-extra.width / 2, 0, 0));
    this.hallways.push(
      new Hallway(
        this.scene,
        this.world,
        start2,
        end2,
        corridorHeight,
        this.corridorWidth
      )
    );
  }

  unload() {
    // Remove rooms
    Object.values(this.rooms).forEach((r) => r.unload());

    // Remove hallways
    this.hallways.forEach((h) => {
      this.scene.remove(h.mesh);
      this.world.removeBody(h.body);
    });
  }

  getSpawnPosition() {
    return this.rooms.Playground.getSpawnPosition();
  }
}
