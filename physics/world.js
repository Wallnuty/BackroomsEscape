// sets up the Cannon world

import * as CANNON from 'cannon-es';

export function createPhysicsWorld() {
    const world = new CANNON.World();
    world.gravity.set(0, -9.82, 0);

    // Better broadphase for your room size
    world.broadphase = new CANNON.SAPBroadphase(world);
    // OR for larger worlds:
    // world.broadphase = new CANNON.GridBroadphase(30, 30, 10, 10, 100, 100);

    world.solver.iterations = 8; // Reduce from 10 to 8

    return world;
}