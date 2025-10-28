import * as THREE from 'three';
import { createPickupLight } from '../../props/createPickupLight.js';
import { ColorSensor } from './ColorSensor.js';
import { PuzzleDoor } from './PuzzleDoor.js';

export class ColorPuzzleManager {
    constructor(scene, lightsManager) {
        this.scene = scene;
        this.lightsManager = lightsManager;
        this.sensors = [];
        this.doors = [];
        
        this.puzzleState = {
            redRoomOpen: false,
            purpleRoomOpen: false,
            finalExitOpen: false,
            hasRedLight: true,
            hasBlueLight: false,
            hasGreenLight: false
        };

        this.frameCount = 0;
        this.debugFrameInterval = 60; // Log every 60 frames (~1 second)

        this.initPuzzle();
    }

    initPuzzle() {
        this.createPuzzleDoors();
        this.createColorSensors();
        this.setupInitialLights();
        
        console.log("🔧 DEBUG: Puzzle initialized - starting sensor monitoring");
        
        // DEBUG: Test sensor setup
        setTimeout(() => this.testSensorDetection(), 1000);
        
        // TEMPORARY: Spawn all lights for testing
        setTimeout(() => {
            console.log("🔧 TEMPORARY: Spawning all lights for testing");
            this.spawnLightInRoom('blue', new THREE.Vector3(8, 1, 0));
            this.spawnLightInRoom('green', new THREE.Vector3(-8, 1, 0));
        }, 3000);
    }

    createPuzzleDoors() {
        const BRIGHT_PURPLE = 0xFF00FF;
        const BRIGHT_RED = 0xFF0000;
        const WHITE = 0xFFFFFF;

        // Purple Door (requires purple light)
        const purpleDoor = new PuzzleDoor(
            this.scene,
            new THREE.Vector3(-20, 2.5, 0),
            new THREE.Vector3(-20, 2.5, 5),
            BRIGHT_PURPLE,
            'purple'
        );
        this.doors.push(purpleDoor);

        // Red Door (requires red light)
        const redDoor = new PuzzleDoor(
            this.scene,
            new THREE.Vector3(20, 2.5, 0),
            new THREE.Vector3(20, 2.5, 5),
            BRIGHT_RED,
            'red'
        );
        this.doors.push(redDoor);

        // Final Exit Door (requires white light)
        const finalDoor = new PuzzleDoor(
            this.scene,
            new THREE.Vector3(0, 2.5, 20),
            new THREE.Vector3(0, 2.5, 25),
            WHITE,
            'final'
        );
        this.doors.push(finalDoor);

        console.log("🎯 Puzzle doors created");
    }

    createColorSensors() {
        const BRIGHT_PURPLE = 0xFF00FF;
        const BRIGHT_RED = 0xFF0000;
        const WHITE = 0xFFFFFF;

        // Sensor for Purple Door
        const purpleSensor = new ColorSensor(
            this.scene,
            new THREE.Vector3(-20, 1.5, -1),
            BRIGHT_PURPLE,
            6.0,
            'purple'
        );
        this.sensors.push(purpleSensor);

        // Sensor for Red Door
        const redSensor = new ColorSensor(
            this.scene,
            new THREE.Vector3(20, 1.5, -1),
            BRIGHT_RED,
            6.0,
            'red'
        );
        this.sensors.push(redSensor);

        // Sensor for Final Door
        const finalSensor = new ColorSensor(
            this.scene,
            new THREE.Vector3(0, 1.5, 19),
            WHITE,
            6.0,
            'final'
        );
        this.sensors.push(finalSensor);

        // Demo sensor showing purple requirement
        const demoSensor = new ColorSensor(
            this.scene,
            new THREE.Vector3(0, 1.5, -15),
            BRIGHT_PURPLE,
            8.0,
            'demo'
        );
        this.sensors.push(demoSensor);

        console.log("🔦 Color sensors created with directional detection");
    }

    setupInitialLights() {
        // Create initial red light
        const redLightConfig = {
            position: new THREE.Vector3(2, 1, -12),
            color: 0xff0000
        };

        const light = createPickupLight(redLightConfig.color, {
            type: 'spot',
            intensity: 12,
            distance: 100
        });

        light.group.position.copy(redLightConfig.position);
        light.group.name = 'red_light_main';

        this.scene.add(light.group);
        this.lightsManager.pickableRoots.push(light.group);
        this.lightsManager.colorMixingManager.addLight(light.group);

        // Point the red light toward the demo sensor
        const demoSensorPos = new THREE.Vector3(0, 1.5, -15);
        light.group.lookAt(demoSensorPos);

        console.log("💡 Initial red light created and pointed at demo sensor");
    }

    checkSensors() {
        this.frameCount++;
        const shouldLog = this.frameCount % this.debugFrameInterval === 0;

        if (shouldLog) {
            console.log(`\n🔄 FRAME ${this.frameCount}: Checking sensors...`);
        }

        this.sensors.forEach(sensor => {
            if (sensor.isSolved) {
                if (shouldLog) {
                    console.log(`   ⏩ Sensor ${sensor.id}: ALREADY SOLVED - skipping`);
                }
                return;
            }

            if (shouldLog) {
                console.log(`\n   🔍 Checking sensor: ${sensor.id}`);
            }

            // Get all light data with positions
            const lightData = this.lightsManager.pickableRoots.map(light => {
                const pos = new THREE.Vector3();
                light.getWorldPosition(pos);
                return { light, position: pos };
            });

            if (shouldLog && lightData.length === 0) {
                console.log(`      💡 No lights available`);
            }

            // Try combined color detection first (with directional check)
            const combinedCorrect = this.checkCombinedColorForSensor(sensor, lightData, shouldLog);
            
            if (combinedCorrect) {
                console.log(`🎯 COMBINED DETECTION SOLVED: Sensor ${sensor.id}`);
                this.onSensorSolved(sensor, null);
                return;
            }

            // Individual light checking with directional awareness
            let individualSolved = false;
            lightData.forEach((lightInfo, index) => {
                const currentColor = this.lightsManager.colorMixingManager.getCurrentMixedColor(lightInfo.light);
                const isCorrectColor = sensor.checkColorWithDirection(currentColor, lightInfo.position, lightInfo.light);

                if (isCorrectColor) {
                    console.log(`🎯 INDIVIDUAL DETECTION SOLVED: Sensor ${sensor.id} by light ${index}`);
                    this.onSensorSolved(sensor, lightInfo.light);
                    individualSolved = true;
                }
            });

            if (shouldLog && !combinedCorrect && !individualSolved) {
                console.log(`      ❌ Sensor ${sensor.id}: No detection this frame`);
            }
        });
    }

    checkCombinedColorForSensor(sensor, lightData, shouldLog = false) {
        let combinedColor = new THREE.Color(0x000000);
        let activeLights = 0;
        let lightsInRangeButNotPointing = 0;

        if (shouldLog) {
            console.log(`      🔦 Checking combined color for sensor ${sensor.id}`);
        }

        // Combine colors ONLY from lights that are both in range AND pointing at sensor
        lightData.forEach((lightInfo, index) => {
            const distance = lightInfo.position.distanceTo(sensor.position);
            const isPointingAtSensor = sensor.isLightPointingAtSensor(lightInfo.light, lightInfo.position);
            
            if (shouldLog) {
                const lightColor = this.lightsManager.colorMixingManager.getCurrentMixedColor(lightInfo.light);
                console.log(`      💡 Light ${index}: dist=${distance.toFixed(1)}m, pointing=${isPointingAtSensor}, color=(${lightColor.r.toFixed(2)},${lightColor.g.toFixed(2)},${lightColor.b.toFixed(2)})`);
            }

            // CRITICAL FIX: Only count lights that are pointing at the sensor
            if (distance < sensor.detectionRadius) {
                if (isPointingAtSensor) {
                    const lightColor = this.lightsManager.colorMixingManager.getCurrentMixedColor(lightInfo.light);
                    
                    // ADDITIVE color mixing
                    combinedColor.r = Math.max(combinedColor.r, lightColor.r);
                    combinedColor.g = Math.max(combinedColor.g, lightColor.g);
                    combinedColor.b = Math.max(combinedColor.b, lightColor.b);
                    activeLights++;
                    
                    if (shouldLog) {
                        console.log(`         ✅ Light ${index} ADDED to combined color (pointing at sensor)`);
                    }
                } else {
                    lightsInRangeButNotPointing++;
                    if (shouldLog) {
                        console.log(`         ❌ Light ${index} in range but NOT pointing at sensor`);
                    }
                }
            } else {
                if (shouldLog) {
                    console.log(`         ⏩ Light ${index} out of range`);
                }
            }
        });

        if (shouldLog) {
            console.log(`      📊 Sensor ${sensor.id} summary: ${activeLights} lights pointing, ${lightsInRangeButNotPointing} lights in range but not pointing`);
        }

        if (activeLights === 0) {
            if (shouldLog && lightsInRangeButNotPointing > 0) {
                console.log(`      🚨 Sensor ${sensor.id}: ${lightsInRangeButNotPointing} lights in range but NONE pointing at sensor!`);
            }
            return false;
        }

        // Boost color intensity for multiple lights
        if (activeLights > 1) {
            const boostFactor = 1.0 + (activeLights * 0.3);
            combinedColor.r = Math.min(combinedColor.r * boostFactor, 1.0);
            combinedColor.g = Math.min(combinedColor.g * boostFactor, 1.0);
            combinedColor.b = Math.min(combinedColor.b * boostFactor, 1.0);
        }

        const colorDistance = this.calculateColorDistance(combinedColor, sensor.targetColor);
        const isCorrect = colorDistance < 0.5;

        // Enhanced logging for combined colors
        if (shouldLog || isCorrect) {
            console.log(`🌈 Sensor ${sensor.id} - COMBINED DETECTION:`);
            console.log(`   📊 Active lights pointing at sensor: ${activeLights}`);
            console.log(`   🎨 Combined Color: R=${combinedColor.r.toFixed(3)}, G=${combinedColor.g.toFixed(3)}, B=${combinedColor.b.toFixed(3)}`);
            console.log(`   🎯 Target Color: R=${sensor.targetColor.r.toFixed(3)}, G=${sensor.targetColor.g.toFixed(3)}, B=${sensor.targetColor.b.toFixed(3)}`);
            console.log(`   📏 Color Distance: ${colorDistance.toFixed(3)}`);
            console.log(`   ✅ Match: ${isCorrect}`);
            console.log(`---`);
        }

        return isCorrect;
    }

    calculateColorDistance(color1, color2) {
        const dr = color1.r - color2.r;
        const dg = color1.g - color2.g;
        const db = color1.b - color2.b;
        return Math.sqrt(dr * dr + dg * dg + db * db);
    }

    onSensorSolved(sensor, light) {
        console.log(`\n🎉🎉🎉 SENSOR SOLVED! 🎉🎉🎉`);
        console.log(`   Sensor: ${sensor.id}`);
        console.log(`   Position:`, sensor.position);
        console.log(`   Solved by: ${light ? 'individual light' : 'combined detection'}`);
        console.log(`   Timestamp: ${new Date().toLocaleTimeString()}`);
        
        sensor.solve();
        
        switch(sensor.id) {
            case 'red':
                console.log(`   🚀 ACTION: Opening red door and spawning blue light`);
                this.openDoor('red');
                this.spawnLightInRoom('blue', new THREE.Vector3(25, 1, 0));
                this.puzzleState.hasBlueLight = true;
                this.puzzleState.redRoomOpen = true;
                console.log("🔵 Blue light spawned in red room");
                break;
                
            case 'purple':
                console.log(`   🚀 ACTION: Opening purple door and spawning green light`);
                this.openDoor('purple');
                this.spawnLightInRoom('green', new THREE.Vector3(-25, 1, 0));
                this.puzzleState.hasGreenLight = true;
                this.puzzleState.purpleRoomOpen = true;
                console.log("🟢 Green light spawned in purple room");
                break;
                
            case 'final':
                console.log(`   🚀 ACTION: Opening final door and completing puzzle`);
                this.openDoor('final');
                this.puzzleState.finalExitOpen = true;
                this.onPuzzleComplete();
                break;
                
            case 'demo':
                console.log(`   🚀 ACTION: Demo sensor activated (visual feedback only)`);
                sensor.createSolveEffect();
                console.log("💡 Demo sensor activated - teaching mechanic");
                break;
        }
        
        console.log(`🎉 SENSOR ${sensor.id} SOLUTION COMPLETE\n`);
    }

    spawnLightInRoom(color, position) {
        const colorConfigs = {
            'blue': { 
                color: 0x0000ff, 
                name: 'blue_light_room',
                config: { type: 'spot', intensity: 12, distance: 100 }
            },
            'green': { 
                color: 0x00ff00, 
                name: 'green_light_room',
                config: { type: 'spot', intensity: 12, distance: 100 }
            },
            'red': { 
                color: 0xff0000, 
                name: 'red_light_extra',
                config: { type: 'spot', intensity: 12, distance: 100 }
            }
        };

        const config = colorConfigs[color];
        if (config && this.lightsManager) {
            const light = createPickupLight(config.color, config.config);
            light.group.position.copy(position);
            light.group.name = config.name;

            this.scene.add(light.group);
            this.lightsManager.pickableRoots.push(light.group);
            this.lightsManager.colorMixingManager.addLight(light.group);

            console.log(`✅ Spawned ${color} light at`, position);
            this.createLightSpawnEffect(position, config.color);
            
            return light.group;
        }
        
        return null;
    }

    createLightSpawnEffect(position, color) {
        const geometry = new THREE.SphereGeometry(0.8, 16, 16);
        const material = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.7
        });
        const sphere = new THREE.Mesh(geometry, material);
        sphere.position.copy(position);
        this.scene.add(sphere);

        const ringGeometry = new THREE.RingGeometry(0.5, 1.0, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.position.copy(position);
        ring.position.y += 0.1;
        ring.rotation.x = -Math.PI / 2;
        this.scene.add(ring);

        const startTime = Date.now();
        const animateSpawn = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / 1500;

            if (progress < 1) {
                sphere.scale.setScalar(1 + Math.sin(progress * Math.PI * 2) * 0.3);
                sphere.material.opacity = 0.7 * (1 - progress);
                ring.scale.setScalar(1 + progress * 3);
                ring.material.opacity = 0.5 * (1 - progress);
                requestAnimationFrame(animateSpawn);
            } else {
                this.scene.remove(sphere);
                this.scene.remove(ring);
                sphere.geometry.dispose();
                sphere.material.dispose();
                ring.geometry.dispose();
                ring.material.dispose();
            }
        };
        animateSpawn();
    }

    openDoor(doorId) {
        const door = this.doors.find(d => d.id === doorId);
        if (door && !door.isOpen) {
            console.log(`🚪 OPENING DOOR: ${doorId}`);
            console.log(`   From:`, door.position);
            console.log(`   To:`, door.openPosition);
            door.open();
        }
    }

    onPuzzleComplete() {
        console.log("🎉🎉🎉 COLOR PUZZLE COMPLETED! 🎉🎉🎉");
        this.createCompletionEffect();
        
        setTimeout(() => {
            this.showCompletionMessage();
        }, 2000);

        setTimeout(() => {
            console.log("➡️ Ready for next level...");
        }, 5000);
    }

    showCompletionMessage() {
        const message = document.createElement('div');
        message.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 20px 40px;
            border-radius: 10px;
            font-size: 24px;
            font-family: Arial, sans-serif;
            z-index: 1000;
            text-align: center;
            border: 2px solid gold;
        `;
        message.innerHTML = '🎉 POOL ROOM PUZZLE COMPLETE! 🎉<br><small>All color mysteries solved!</small>';
        document.body.appendChild(message);
        
        setTimeout(() => {
            if (document.body.contains(message)) {
                document.body.removeChild(message);
            }
        }, 5000);
    }

    createCompletionEffect() {
        const positions = [
            new THREE.Vector3(0, 5, 0),
            new THREE.Vector3(-5, 5, -5),
            new THREE.Vector3(5, 5, 5),
            new THREE.Vector3(-5, 5, 5),
            new THREE.Vector3(5, 5, -5)
        ];

        const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff];

        positions.forEach((pos, index) => {
            const geometry = new THREE.SphereGeometry(1.5, 16, 16);
            const material = new THREE.MeshBasicMaterial({
                color: colors[index],
                transparent: true,
                opacity: 0.8
            });
            const sphere = new THREE.Mesh(geometry, material);
            sphere.position.copy(pos);
            this.scene.add(sphere);

            const startTime = Date.now();
            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = elapsed / 3000;

                if (progress < 1) {
                    sphere.scale.setScalar(1 + progress * 2);
                    material.opacity = 0.8 * (1 - progress);
                    sphere.rotation.y += 0.05;
                    requestAnimationFrame(animate);
                } else {
                    this.scene.remove(sphere);
                    sphere.geometry.dispose();
                    sphere.material.dispose();
                }
            };
            animate();
        });
    }

    update() {
        this.checkSensors();
        this.doors.forEach(door => door.update());
    }

    getPuzzleState() {
        return {
            ...this.puzzleState,
            sensorsSolved: this.sensors.filter(sensor => sensor.isSolved).map(sensor => sensor.id),
            doorsOpen: this.doors.filter(door => door.isOpen).map(door => door.id)
        };
    }

    testSensorDetection() {
        console.log("=== 🧪 SENSOR DETECTION TEST ===");
        
        this.sensors.forEach(sensor => {
            console.log(`🔦 Sensor ${sensor.id}:`);
            console.log(`   📍 Position:`, sensor.position);
            console.log(`   🎯 Target: R=${sensor.targetColor.r.toFixed(3)}, G=${sensor.targetColor.g.toFixed(3)}, B=${sensor.targetColor.b.toFixed(3)}`);
            console.log(`   📏 Detection Radius: ${sensor.detectionRadius}m`);
            console.log(`   🧭 Directional: ${sensor.requiresDirectional}`);
            console.log(`   📐 Detection Angle: ${(sensor.detectionAngle * 180 / Math.PI).toFixed(1)}°`);
            console.log(`   ✅ Solved: ${sensor.isSolved}`);
        });

        console.log(`💡 Available lights: ${this.lightsManager.pickableRoots.length}`);
        this.lightsManager.pickableRoots.forEach((light, index) => {
            const pos = new THREE.Vector3();
            light.getWorldPosition(pos);
            const color = this.lightsManager.colorMixingManager.getCurrentMixedColor(light);
            
            // Get light direction
            const lightForward = new THREE.Vector3(0, 0, -1);
            lightForward.applyQuaternion(light.quaternion);
            
            console.log(`   Light ${index}: ${light.name || 'unnamed'}`);
            console.log(`     📍 Position:`, pos);
            console.log(`     🧭 Direction:`, lightForward);
            console.log(`     🎨 Current Color: R=${color.r.toFixed(3)}, G=${color.g.toFixed(3)}, B=${color.b.toFixed(3)}`);
        });
        
        console.log("=== TEST COMPLETE ===");
    }

    // Debug methods for manual testing
    debugSpawnBlueLight() {
        console.log("🔧 Debug: Spawning blue light");
        this.spawnLightInRoom('blue', new THREE.Vector3(5, 1, 5));
    }

    debugSpawnGreenLight() {
        console.log("🔧 Debug: Spawning green light");
        this.spawnLightInRoom('green', new THREE.Vector3(-5, 1, 5));
    }

    debugSpawnRedLight() {
        console.log("🔧 Debug: Spawning red light");
        this.spawnLightInRoom('red', new THREE.Vector3(0, 1, 5));
    }

    debugSolveAllSensors() {
        console.log("🔧 TEST MODE: Solving all sensors");
        this.sensors.forEach(sensor => {
            if (!sensor.isSolved) {
                sensor.solve();
                console.log(`   ✅ Solved sensor: ${sensor.id}`);
            }
        });
        
        this.doors.forEach(door => {
            if (!door.isOpen) {
                door.open();
                console.log(`   🚪 Opened door: ${door.id}`);
            }
        });
    }

    debugResetPuzzle() {
        console.log("🔧 Debug: Resetting puzzle");
        
        this.sensors.forEach(sensor => {
            sensor.isSolved = false;
            sensor.indicatorMaterial.opacity = 0.3;
            console.log(`   🔄 Reset sensor: ${sensor.id}`);
        });
        
        this.doors.forEach(door => {
            door.isOpen = false;
            door.isAnimating = false;
            door.animationProgress = 0;
            door.group.position.copy(door.position);
            door.doorMaterial.emissiveIntensity = 0.1;
            console.log(`   🔄 Closed door: ${door.id}`);
        });
        
        this.puzzleState = {
            redRoomOpen: false,
            purpleRoomOpen: false,
            finalExitOpen: false,
            hasRedLight: true,
            hasBlueLight: false,
            hasGreenLight: false
        };
        
        console.log("🔄 Puzzle reset complete");
    }
}