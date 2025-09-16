// sets up the Cannon world

import * as CANNON from 'cannon-es';

export function createPhysicsWorld() {
    const world = new CANNON.World();
    world.gravity.set(0, -9.82, 0); // Earth-like gravity
    world.broadphase = new CANNON.NaiveBroadphase();
    world.solver.iterations = 10;

    return world;
}