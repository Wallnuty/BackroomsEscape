import * as THREE from 'three';

export const PoolRoomLayouts = {

    //player location is -15, 0, 3
    poolroom: {
        position: new THREE.Vector3(0, 0, 0),
        width: 150,
        height: 10,
        depth: 150,
        walls: [
            // Outer boundary walls - make sure they form a proper room
            [new THREE.Vector3(-10, 0, 7), new THREE.Vector3(-10, 0, -2), 0.4],  //spawn wall left
            [new THREE.Vector3(-20, 0, 7), new THREE.Vector3(-20, 0, -2), 0.4],   //spawn wall right
            [new THREE.Vector3(-20, 0, 7), new THREE.Vector3(-10, 0, 7), 0.4],    //spawn wall back
            [new THREE.Vector3(-20.2, 0, -1.8), new THREE.Vector3(-22.8, 0, -1.8), 0.4],  //side wall
            [new THREE.Vector3(-23, 0, -2), new THREE.Vector3(-23, 0, 10), 0.4], //left corridor  wall
            [new THREE.Vector3(-23, 0, 10), new THREE.Vector3(-60, 0, 10), 0.4], // left corridor left wall
            [new THREE.Vector3(-60, 0, 10), new THREE.Vector3(-60, 0, -10), 0.4], //left corridor end wall
            [new THREE.Vector3(-60, 0, -10), new THREE.Vector3(-50, 0, -10), 0.4], //left corridor behind door wall
            [new THREE.Vector3(-50, 0, -10), new THREE.Vector3(-50, 0, 6), 0.4], //left corridor behind door right wall
            [new THREE.Vector3(-49.8, 0, 5.8), new THREE.Vector3(-27.2, 0, 5.8), 0.4], //left corridor right wall
            [new THREE.Vector3(-27, 0, 6), new THREE.Vector3(-27, 0, -10), 0.4], //left corridor first wall
            [new THREE.Vector3(-27, 0, -10), new THREE.Vector3(-20.2, 0, -10), 0.4], //left corridor side wall right
            [new THREE.Vector3(-20, 0, -9.8), new THREE.Vector3(-20, 0, -20), 0.4], //main corridor left right
             //final door wall
            [new THREE.Vector3(-10, 0, -20), new THREE.Vector3(-10, 0, -9.8), 0.4], //main corridor right left
            [new THREE.Vector3(-9.8, 0, -10), new THREE.Vector3(10, 0, -10), 0.4], //right corridor left wall
            [new THREE.Vector3(9.8, 0, -10.2), new THREE.Vector3(9.8, 0, -20), 0.4], //right corridor solution left wall
            [new THREE.Vector3(10, 0, -20), new THREE.Vector3(20, 0, -20), 0.4], //right corridor solution back wall
            [new THREE.Vector3(20, 0, -20), new THREE.Vector3(20, 0, -1.8), 0.4], //right corridor back wall
            [new THREE.Vector3(20, 0, -1.8), new THREE.Vector3(-9.8, 0, -1.8), 0.4], //right corridor right wall


            //door stuffs
            [new THREE.Vector3(10, 0, -12), new THREE.Vector3(13.25, 0, -12), 0.3],
            [new THREE.Vector3(16.75, 0, -12), new THREE.Vector3(20, 0, -12), 0.3],   //Magenta door
            [new THREE.Vector3(13.25, 5.25, -12), new THREE.Vector3(16.75, 5.25, -12), 0.3],

            [new THREE.Vector3(-60, 0, 0), new THREE.Vector3(-56.75, 0, 0), 0.3],
            [new THREE.Vector3(-53.25, 0, 0), new THREE.Vector3(-50, 0, 0), 0.3],
            [new THREE.Vector3(-53.25, 5.25, 0), new THREE.Vector3(-56.75, 5.25, 0), 0.3],

            [new THREE.Vector3(-20, 0, -20), new THREE.Vector3(-16.75, 0, -20), 0.3],
            [new THREE.Vector3(-10, 0, -20), new THREE.Vector3(-13.25, 0, -20), 0.3],
            [new THREE.Vector3(-13.25, 5.25, -20), new THREE.Vector3(-16.75, 5.25, -20), 0.3],
        ],  
        lights: [
            [-15, -6],
            [-55, 7.8], 
            [-55, -3],
            [0, -6],
            [15, -6],
            [15, -16],           
        ],
        zones: [
            // Main area zones
            [
                new THREE.Vector3(-5, 0, -20),
                new THREE.Vector3(5, 10, -21),
                'south',
                new THREE.Vector3(0, 5, -20.5)
            ]
        ],
        models: []
    }
};