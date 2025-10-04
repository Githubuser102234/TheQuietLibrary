import React, { useState, useEffect, useRef, useCallback } from 'react';
// NOTE: THREE.js and Tone.js are assumed to be available globally via <script> tags
// For a real React app, you would use 'import * as THREE from 'three''

// --- GAME CONFIGURATION ---
const GAME_CONFIG = {
    PLAYER_HEIGHT: 1.6,
    MOVE_SPEED: 4, // units per second
    ROTATE_SPEED: 0.002,
    COLLISION_RADIUS: 0.4,
    PRESENCE_DECAY: 0.5,
    PRESENCE_MOVE_COST: 0.005,
    PRESENCE_INTERACT_COST: 3,
    MAX_PRESENCE: 100,
    WORLD_SIZE: { x: 12, y: 5, z: 12 },
};

// --- AUTH/FIREBASE SETUP (Assuming globals are provided by the environment) ---
const useFirebase = () => {
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);

    useEffect(() => {
        // This simulates connecting to the globally provided Firebase environment
        const auth = window.auth;
        
        const setupAuth = async () => {
            if (!auth) {
                // No Firebase config available, use local fallback
                setUserId('NO_FIREBASE_' + (window.crypto?.randomUUID() || 'fallback'));
                setIsAuthReady(true);
                return;
            }
            
            const unsubscribe = auth.onAuthStateChanged(async (user) => {
                if (!user) {
                    try {
                        const token = window.__initial_auth_token;
                        if (token) {
                            const result = await auth.signInWithCustomToken(auth, token);
                            setUserId(result.user.uid);
                        } else {
                            const result = await auth.signInAnonymously(auth);
                            setUserId(result.user.uid);
                        }
                    } catch (error) {
                        console.error("Firebase Auth failed:", error);
                        setUserId('Auth_Error_' + (window.crypto?.randomUUID() || 'fallback'));
                    }
                } else {
                    setUserId(user.uid);
                }
                setIsAuthReady(true);
            });
            return () => unsubscribe();
        };

        setupAuth();
    }, []);

    return { userId, isAuthReady };
};


// --- CORE LOGIC CLASS: SceneManager (Simulates /src/world/SceneManager.js) ---
// This class encapsulates the mutable Three.js state outside of React's render cycle.
class SceneManager {
    constructor(canvas, onInteractableHover, onInteract) {
        this.canvas = canvas;
        this.onInteractableHover = onInteractableHover;
        this.onInteract = onInteract;

        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.player = null; // THREE.Object3D parent for the camera
        this.raycaster = new THREE.Raycaster();
        this.interactableObjects = [];
        this.collisionObjects = [];
        this.flashlight = null;
        
        this.init();
        this.createScene();
        
        // Input binding for non-React events (mouse click)
        this.canvas.addEventListener('click', this.handleCanvasClick);
    }

    init() {
        // Three.js setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);
        
        const container = this.canvas.parentElement;
        const width = container.clientWidth;
        const height = container.clientHeight;

        this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 100);
        this.player = new THREE.Object3D();
        this.player.position.set(0, GAME_CONFIG.PLAYER_HEIGHT, 5);
        this.player.add(this.camera);
        this.scene.add(this.player);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, canvas: this.canvas });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(width, height);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // Lighting
        const ambient = new THREE.AmbientLight(0x050505, 0.1);
        this.scene.add(ambient);

        this.flashlight = new THREE.SpotLight(0xffffff, 1.5, 30, Math.PI / 10, 0.5);
        this.flashlight.position.set(0, 0, 0);
        this.flashlight.target.position.set(0, 0, -1);
        this.flashlight.castShadow = true;
        this.flashlight.shadow.mapSize.width = 1024;
        this.camera.add(this.flashlight);
        this.camera.add(this.flashlight.target);
    }
    
    // Simulates a method to be called by React on resize
    resize = () => {
        const container = this.canvas.parentElement;
        if (!container) return;
        const width = container.clientWidth;
        const height = container.clientHeight;
        this.renderer.setSize(width, height);
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
    };

    // Helper to create objects
    createGameObject(geometry, material, name, position, rotation = { x: 0, y: 0, z: 0 }, type = 'collision') {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(position.x, position.y, position.z);
        mesh.rotation.set(rotation.x, rotation.y, rotation.z);
        mesh.name = name;
        this.scene.add(mesh);
        if (type === 'interactable') this.interactableObjects.push(mesh);
        if (type === 'collision') this.collisionObjects.push(mesh);
        mesh.castShadow = true;
        return mesh;
    }

    createScene() {
        this.interactableObjects = [];
        this.collisionObjects = [];
        // (Re)create world geometry
        const { x: wX, y: wY, z: wZ } = GAME_CONFIG.WORLD_SIZE;
        const matWall = new THREE.MeshPhongMaterial({ color: 0x111111, shininess: 1, side: THREE.DoubleSide });
        const matFloor = new THREE.MeshPhongMaterial({ color: 0x080808, shininess: 1 });
        const matInteract = new THREE.MeshPhongMaterial({ color: 0x880000, emissive: 0x220000, shininess: 10, transparent: true, opacity: 0.5 });
        const matFurniture = new THREE.MeshPhongMaterial({ color: 0x333333, shininess: 5, flatShading: true });
        
        // Floor and Walls
        const floor = this.createGameObject(new THREE.PlaneGeometry(wX, wZ), matFloor, 'Floor', { x: 0, y: 0, z: 0 }, { x: -Math.PI / 2, y: 0, z: 0 }, 'collision');
        floor.receiveShadow = true;
        this.createGameObject(new THREE.BoxGeometry(wX, wY, 0.1), matWall, 'WallBack', { x: 0, y: wY / 2, z: -wZ / 2 }, null, 'collision');
        this.createGameObject(new THREE.BoxGeometry(wZ, wY, 0.1), matWall, 'WallLeft', { x: -wX / 2, y: wY / 2, z: 0 }, { x: 0, y: Math.PI / 2, z: 0 }, 'collision');
        this.createGameObject(new THREE.BoxGeometry(wZ, wY, 0.1), matWall, 'WallRight', { x: wX / 2, y: wY / 2, z: 0 }, { x: 0, y: -Math.PI / 2, z: 0 }, 'collision');
        
        // Door - Exit
        const doorMat = new THREE.MeshPhongMaterial({ color: 0x440000, emissive: 0x050000, shininess: 0 }); 
        this.createGameObject(new THREE.BoxGeometry(2, 4, 0.2), doorMat, 'Door_Mesh', { x: 0, y: 2, z: wZ / 2 - 0.1 }, null, 'interactable');

        // Furniture and Interactables
        this.createGameObject(new THREE.BoxGeometry(2, 1, 1), matFurniture, 'Desk_C', { x: 3, y: 0.5, z: 3 }, null, 'collision');
        this.createGameObject(new THREE.BoxGeometry(0.5, 0.1, 0.5), matInteract, 'Desk_Mesh', { x: 3, y: 1.05, z: 3 }, null, 'interactable');
        
        this.createGameObject(new THREE.BoxGeometry(1, 3, 4), matFurniture, 'Bookshelf_C', { x: -4.5, y: 1.5, z: 0 }, null, 'collision');
        this.createGameObject(new THREE.BoxGeometry(0.1, 0.1, 0.1), matInteract, 'Bookshelf_Mesh', { x: -4.5, y: 1.5, z: -1.5 }, null, 'interactable');
        
        this.createGameObject(new THREE.CylinderGeometry(0.8, 0.8, 1.5, 8), matFurniture, 'Panel_C', { x: 4, y: 0.75, z: -4 }, null, 'collision');
        this.createGameObject(new THREE.BoxGeometry(0.5, 0.5, 0.05), matInteract, 'ControlPanel_Mesh', { x: 4, y: 1.5, z: -3.1 }, null, 'interactable');

        const symbolGeo = new THREE.TorusGeometry(0.3, 0.1, 8, 16);
        const symbolMat = new THREE.MeshBasicMaterial({ color: 0x880000, wireframe: true, transparent: true, opacity: 0.8 });
        this.createGameObject(symbolGeo, symbolMat, 'Distortion_Mesh', { x: -3, y: GAME_CONFIG.WORLD_SIZE.y * 0.8, z: -4.9 }, null, 'interactable');

        this.player.position.set(0, GAME_CONFIG.PLAYER_HEIGHT, 5);
        this.player.rotation.y = Math.PI;
    }
    
    // Render loop function
    render = () => {
        this.renderer.render(this.scene, this.camera);
    };

    // Public method to reset scene (called by React)
    reset() {
        // Clear all scene children and rebuild
        while(this.scene.children.length > 0) this.scene.remove(this.scene.children[0]);
        this.interactableObjects = [];
        this.collisionObjects = [];
        this.createScene();
    }
    
    // Core interaction logic
    handleCanvasClick = () => {
        const target = this.getInteractableTarget();
        this.onInteract(target); // Delegate back to React state manager
    }
    
    // Hover check for crosshair update (called in game loop)
    checkHover() {
        const target = this.getInteractableTarget();
        this.onInteractableHover(!!target);
    }
    
    // Raycasting utility
    getInteractableTarget() {
        this.raycaster.setFromCamera({ x: 0, y: 0 }, this.camera);
        this.raycaster.far = 3; 
        const intersects = this.raycaster.intersectObjects(this.interactableObjects, false);
        return intersects.length > 0 ? intersects[0].object : null;
    }

    // Cleanup
    dispose() {
        this.canvas.removeEventListener('click', this.handleCanvasClick);
        this.renderer.dispose();
    }
}


// --- CORE LOGIC CLASS: PhysicsManager (Simulates /src/player/Physics.js) ---
class PhysicsManager {
    constructor(player, collisionObjects) {
        this.player = player;
        this.collisionObjects = collisionObjects;
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
    }
    
    updateMovement(keyMap, delta) {
        let isMoving = false;
        const speed = GAME_CONFIG.MOVE_SPEED * delta;
        this.velocity.set(0, 0, 0);

        if (keyMap.w) { this.velocity.z -= speed; isMoving = true; }
        if (keyMap.s) { this.velocity.z += speed; isMoving = true; }
        if (keyMap.a) { this.velocity.x -= speed; isMoving = true; }
        if (keyMap.d) { this.velocity.x += speed; isMoving = true; }

        if (isMoving) {
            this.direction.set(this.velocity.x, 0, this.velocity.z).normalize().multiplyScalar(speed);
            this.direction.applyEuler(this.player.rotation);

            const oldPos = this.player.position.clone();

            // Attempt X movement with collision check
            this.player.position.x += this.direction.x;
            if (this.checkCollisions(this.player.position)) {
                 this.player.position.x = oldPos.x;
            }
            
            // Attempt Z movement with collision check
            this.player.position.z += this.direction.z;
            if (this.checkCollisions(this.player.position)) {
                 this.player.position.z = oldPos.z;
            }
            return true;
        }
        return false;
    }

    checkCollisions(position) {
        const size = new THREE.Vector3(GAME_CONFIG.COLLISION_RADIUS * 2, GAME_CONFIG.PLAYER_HEIGHT * 2, GAME_CONFIG.COLLISION_RADIUS * 2);
        const playerCenter = new THREE.Vector3(position.x, GAME_CONFIG.PLAYER_HEIGHT, position.z);
        const playerBox = new THREE.Box3().setFromCenterAndSize(playerCenter, size);

        for (const mesh of this.collisionObjects) {
            const meshBox = new THREE.Box3().setFromObject(mesh);
            if (playerBox.intersectsBox(meshBox)) {
                return true;
            }
        }
        return false;
    }
}


// --- CORE LOGIC CLASS: AudioController (Simulates /src/audio/AudioController.js) ---
class AudioController {
    constructor() {
        this.ambianceNoise = null;
        this.jumpscareSynth = null;
        this.heartBeatOscillator = null;
        this.init();
    }

    init() {
        if (typeof Tone === 'undefined') return;
        this.ambianceNoise = new Tone.Noise("brown").toDestination();
        this.ambianceNoise.volume.value = -30;
        this.ambianceNoise.start();

        this.jumpscareSynth = new Tone.NoiseSynth({
            noise: { type: "pink" },
            envelope: { attack: 0.01, decay: 0.5, sustain: 0.0, release: 0.1 }
        }).chain(new Tone.Distortion(0.8), Tone.Destination);
        this.jumpscareSynth.volume.value = -10;

        this.heartBeatOscillator = new Tone.Oscillator({
            frequency: 1, type: "sine", volume: -Infinity
        }).chain(new Tone.PingPongDelay("8n", 0.3), Tone.Destination);
        this.heartBeatOscillator.start();
        
        Tone.Destination.mute = !window.localStorage.getItem('audioEnabled') === 'true';
    }
    
    updateTension(normalizedPresence) {
        if (!this.ambianceNoise || !this.heartBeatOscillator || Tone.Destination.mute) return;
        
        const ambianceVolume = -30 + (10 * normalizedPresence);
        this.ambianceNoise.volume.rampTo(ambianceVolume, 0.5);

        const pulseFrequency = 1 + (normalizedPresence * 4);
        this.heartBeatOscillator.frequency.rampTo(pulseFrequency, 0.5);

        const pulseVolume = -20 + (15 * normalizedPresence);
        this.heartBeatOscillator.volume.rampTo(pulseVolume, 0.5);
    }
    
    playScare() {
        if (this.jumpscareSynth && !Tone.Destination.mute) this.jumpscareSynth.triggerAttackRelease("4n");
    }
    
    reset() {
        if (Tone.context && Tone.context.state !== 'running') Tone.context.resume();
        if (this.ambianceNoise) this.ambianceNoise.volume.rampTo(-30, 2);
        if (this.heartBeatOscillator) this.heartBeatOscillator.volume.rampTo(-Infinity, 1);
    }
    
    toggleMute(isMuted) {
        Tone.Destination.mute = isMuted;
        if (!isMuted && Tone.context.state !== 'running') Tone.context.resume();
    }
}


// --- REACT COMPONENT: GameView (Handles Canvas and Game Loop) ---
// Simulates /src/components/GameView.jsx
const GameView = ({ gameState, setGameState, handleInteraction, audioController, isRunning }) => {
    const canvasRef = useRef(null);
    const sceneManagerRef = useRef(null);
    const physicsManagerRef = useRef(null);
    const lastTimeRef = useRef(0);
    const keyMapRef = useRef({ w: false, a: false, s: false, d: false });
    const [isHoveringInteractable, setIsHoveringInteractable] = useState(false);
    
    // Look rotation logic (Simulates /src/player/Input.js)
    const handlePointerMove = useCallback((event) => {
        if (!isRunning || !sceneManagerRef.current) return;
        const manager = sceneManagerRef.current;
        
        const deltaX = event.movementX || 0;
        const deltaY = event.movementY || 0;

        manager.player.rotation.y -= deltaX * GAME_CONFIG.ROTATE_SPEED;
        let rotationX = manager.camera.rotation.x - deltaY * GAME_CONFIG.ROTATE_SPEED;
        rotationX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, rotationX));
        manager.camera.rotation.x = rotationX;
    }, [isRunning]);
    
    const handleKeyDown = useCallback((event) => {
        const key = event.key.toLowerCase();
        if (keyMapRef.current.hasOwnProperty(key)) keyMapRef.current[key] = true;
    }, []);

    const handleKeyUp = useCallback((event) => {
        const key = event.key.toLowerCase();
        if (keyMapRef.current.hasOwnProperty(key)) keyMapRef.current[key] = false;
    }, []);
    
    // --- MAIN GAME LOOP (Simulates /src/GameLoop.js) ---
    const gameLoop = useCallback((time) => {
        requestAnimationFrame(gameLoop);
        
        if (!isRunning || !sceneManagerRef.current || !physicsManagerRef.current) {
            sceneManagerRef.current?.render();
            return;
        }

        const delta = (time - lastTimeRef.current) / 1000;
        lastTimeRef.current = time;

        const manager = sceneManagerRef.current;
        const physics = physicsManagerRef.current;
        
        // 1. Physics Update
        const moved = physics.updateMovement(keyMapRef.current, delta);
        
        // 2. Presence and Game State Update
        setGameState(prev => {
            let newPresence = prev.presenceLevel;
            
            // Decay
            newPresence = Math.max(0, newPresence - GAME_CONFIG.PRESENCE_DECAY * delta);

            // Cost for moving
            if (moved) {
                newPresence += GAME_CONFIG.PRESENCE_MOVE_COST;
            }

            if (newPresence >= GAME_CONFIG.MAX_PRESENCE) {
                // Game Over handled by main App component via useEffect dependency
                return { ...prev, presenceLevel: GAME_CONFIG.MAX_PRESENCE };
            }

            // 3. Audio Update
            audioController.updateTension(newPresence / GAME_CONFIG.MAX_PRESENCE);

            return { ...prev, presenceLevel: newPresence };
        });

        // 4. Interaction Check (Hover)
        manager.checkHover();

        // 5. Render
        manager.render();
    }, [isRunning, setGameState, audioController]);

    // --- EFFECT: Setup and Cleanup ---
    useEffect(() => {
        if (!canvasRef.current || typeof THREE === 'undefined') return;

        const manager = new SceneManager(
            canvasRef.current, 
            setIsHoveringInteractable, 
            handleInteraction
        );
        sceneManagerRef.current = manager;
        
        physicsManagerRef.current = new PhysicsManager(manager.player, manager.collisionObjects);

        window.addEventListener('resize', manager.resize);
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        window.addEventListener('mousemove', handlePointerMove);

        // Start the loop
        gameLoop(0); 

        return () => {
            window.removeEventListener('resize', manager.resize);
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('mousemove', handlePointerMove);
            manager.dispose();
        };
    }, [handleKeyDown, handleKeyUp, handlePointerMove, gameLoop, handleInteraction]); 
    
    // --- EFFECT: Reset/Restart Logic ---
    useEffect(() => {
        if (isRunning && sceneManagerRef.current) {
            sceneManagerRef.current.reset();
            audioController.reset();
        }
    }, [isRunning, audioController]);

    // Mobile touch controls need to be implemented here similarly to desktop, 
    // binding touch events to keyMapRef.current.

    return (
        <div id="canvas-container" className="flex-grow relative min-h-[400px]">
            <canvas ref={canvasRef} id="game-canvas"></canvas>
            <div id="crosshair" className={`
                absolute top-1/2 left-1/2 w-2 h-2 -m-1 rounded-full border border-red-700 pointer-events-none 
                ${isHoveringInteractable ? 'bg-green-500 border-green-500 shadow-lg shadow-green-500/50' : 'bg-transparent border-red-700'}
            `}></div>
            
            {/* Virtual Mobile Controls (Simplified binding to keyMapRef) */}
            <div id="virtual-controls" className={`absolute bottom-5 left-5 z-50 ${gameState.isMobile ? 'block' : 'hidden'}`}>
                <div className="grid grid-cols-3 gap-1 w-24 h-24">
                    {/* Up */}
                    <button className="col-start-2 row-start-1 bg-gray-900/70 text-red-500 rounded-full w-8 h-8 flex items-center justify-center font-bold text-lg border-2 border-red-700/50 active:bg-red-700 active:text-white"
                        onTouchStart={() => keyMapRef.current.w = true} onTouchEnd={() => keyMapRef.current.w = false}>▲</button>
                    {/* Left */}
                    <button className="col-start-1 row-start-2 bg-gray-900/70 text-red-500 rounded-full w-8 h-8 flex items-center justify-center font-bold text-lg border-2 border-red-700/50 active:bg-red-700 active:text-white"
                        onTouchStart={() => keyMapRef.current.a = true} onTouchEnd={() => keyMapRef.current.a = false}>◀</button>
                    {/* Right */}
                    <button className="col-start-3 row-start-2 bg-gray-900/70 text-red-500 rounded-full w-8 h-8 flex items-center justify-center font-bold text-lg border-2 border-red-700/50 active:bg-red-700 active:text-white"
                        onTouchStart={() => keyMapRef.current.d = true} onTouchEnd={() => keyMapRef.current.d = false}>▶</button>
                    {/* Down */}
                    <button className="col-start-2 row-start-3 bg-gray-900/70 text-red-500 rounded-full w-8 h-8 flex items-center justify-center font-bold text-lg border-2 border-red-700/50 active:bg-red-700 active:text-white"
                        onTouchStart={() => keyMapRef.current.s = true} onTouchEnd={() => keyMapRef.current.s = false}>▼</button>
                </div>
            </div>
        </div>
    );
};


// --- REACT COMPONENT: App (Root) ---
export default function App() {
    const { userId, isAuthReady } = useFirebase();
    const audioControllerRef = useRef(new AudioController());

    const interactionData = useRef({
        'Desk_Mesh': { examined: false, hasKey: true, message: "Key Card (1/3) found. A faint whisper echoes.", scareTrigger: false },
        'Bookshelf_Mesh': { examined: false, hasKey: true, message: "Magnetic Key (2/3) found. Silence returns... briefly.", scareTrigger: false },
        'Door_Mesh': { examined: false, message: "The emergency exit needs 3 keys.", isExit: true },
        'ControlPanel_Mesh': { examined: false, hasKey: true, message: "Access Token (3/3) acquired. The lock system is ready.", scareTrigger: false },
        'Distortion_Mesh': { examined: false, hasKey: false, message: "A sudden, blinding static! THE PRESENCE IS CLOSER!", scareTrigger: true, usedMessage: "It's just a faint residue now." }
    });

    const [gameState, setGameState] = useState({
        isRunning: false,
        keysFound: 0,
        presenceLevel: 0,
        message: "",
        messageColor: "text-red-400",
        modalOpen: true,
        modalTitle: "THE SILENT VAULT",
        modalText: "You are trapped. Find the three security keys to escape before the entity's presence consumes you. Movement and interaction increase the risk.",
        isMobile: /Mobi|Android/i.test(navigator.userAgent),
        audioMuted: window.localStorage.getItem('audioEnabled') !== 'true',
    });
    
    // --- Message Handling ---
    const showMessage = useCallback((text, color = "text-red-400") => {
        setGameState(prev => ({ ...prev, message: text, messageColor: color }));
        clearTimeout(window.messageTimeout);
        window.messageTimeout = setTimeout(() => {
            setGameState(prev => ({ ...prev, message: "" }));
        }, 3500);
    }, []);

    // --- Interaction Logic (Simulates /src/logic/InteractionManager.js) ---
    const handleInteraction = useCallback((targetMesh) => {
        if (!gameState.isRunning) return;
        
        if (!targetMesh) {
            showMessage("You touch the air. Nothing happens.", 'text-gray-500');
            setGameState(prev => ({ ...prev, presenceLevel: prev.presenceLevel + 1 }));
            return;
        }

        const meshName = targetMesh.name;
        const objectData = interactionData.current[meshName];

        if (!objectData) return;
        
        // 1. Handle Exit Door
        if (objectData.isExit) {
            if (gameState.keysFound === 3) {
                endGame(true); 
            } else {
                showMessage(objectData.message);
                setGameState(prev => ({ ...prev, presenceLevel: prev.presenceLevel + GAME_CONFIG.PRESENCE_INTERACT_COST }));
            }
            return;
        }

        // 2. Check if already examined
        if (objectData.examined) {
            showMessage(objectData.usedMessage || "You've already searched here.");
            setGameState(prev => ({ ...prev, presenceLevel: prev.presenceLevel + 1 }));
            return;
        }

        // Mark as examined
        objectData.examined = true;

        // 3. Key found logic
        if (objectData.hasKey) {
            setGameState(prev => ({ ...prev, keysFound: prev.keysFound + 1 }));
            showMessage(objectData.message, 'text-yellow-300');

            // Visual feedback (mutable state on the mesh)
            targetMesh.material.emissive.setHex(0x000000);
            targetMesh.material.opacity = 0.1;
            targetMesh.material.needsUpdate = true;
            targetMesh.castShadow = false;
        } else {
            showMessage(objectData.message);
        }

        // 4. Scare Trigger logic
        if (objectData.scareTrigger && !gameState.jumpscarePlayed) {
            audioControllerRef.current.playScare();
            targetMesh.visible = false;
            setGameState(prev => ({ 
                ...prev, 
                presenceLevel: prev.presenceLevel + 30, 
                jumpscarePlayed: true 
            }));
            showMessage("A cold terror grips you!", 'text-red-500');
        } else {
             setGameState(prev => ({ ...prev, presenceLevel: prev.presenceLevel + GAME_CONFIG.PRESENCE_INTERACT_COST }));
        }
    }, [gameState.isRunning, gameState.keysFound]); // Include deps for current state access

    // --- Game Flow Control ---
    const startGame = () => {
        if (!isAuthReady) {
            showMessage("Initializing authentication...", 'text-gray-500');
            return;
        }
        
        // Reset interaction data (must manually reset the mutable data)
        Object.keys(interactionData.current).forEach(key => {
            interactionData.current[key].examined = false;
        });

        setGameState({
            ...gameState,
            isRunning: true,
            keysFound: 0,
            presenceLevel: 0,
            jumpscarePlayed: false,
            modalOpen: false,
        });
        showMessage("The vault is open. Find the three keys.", 'text-yellow-400');
    };

    const endGame = useCallback((win) => {
        setGameState(prev => ({
            ...prev,
            isRunning: false,
            modalOpen: true,
            modalTitle: win ? "ACCESS GRANTED" : "SEALED IN",
            modalText: win 
                ? "All keys inserted. The final lock clicks open. You survived the vault."
                : "The Presence consumed you. The vault door slams shut. Game Over.",
        }));
        audioControllerRef.current.stop();
        if (!win) audioControllerRef.current.playScare();
    }, [gameState]);

    // --- Effect for Game Over Check ---
    useEffect(() => {
        if (gameState.isRunning && gameState.presenceLevel >= GAME_CONFIG.MAX_PRESENCE) {
            endGame(false);
        }
    }, [gameState.isRunning, gameState.presenceLevel, endGame]);
    
    // --- Audio Toggle ---
    const toggleAudio = () => {
        const newMuted = !gameState.audioMuted;
        audioControllerRef.current.toggleMute(newMuted);
        window.localStorage.setItem('audioEnabled', !newMuted);
        setGameState(prev => ({ ...prev, audioMuted: newMuted }));
    };

    return (
        <div className="p-4 flex items-center justify-center min-h-screen bg-black">
            <div id="game-container" className="w-full max-w-4xl h-[95vh] flex flex-col rounded-xl overflow-hidden border-2 border-red-700 shadow-2xl shadow-red-900/40">
                {/* Status Bar */}
                <div className="p-3 bg-red-900/20 flex flex-col sm:flex-row justify-between items-center border-b border-red-900">
                    <div className="text-sm font-semibold text-red-400 mb-2 sm:mb-0">
                        Keys Found: <span id="keys-count">{gameState.keysFound}/3</span>
                    </div>
                    <div className="w-full sm:w-1/2 bg-gray-700 rounded-full h-4 relative">
                        <div className="bg-red-600 h-4 rounded-full transition-all duration-500" style={{ width: `${gameState.presenceLevel}%` }}></div>
                        <span className="absolute top-0 left-1/2 transform -translate-x-1/2 text-xs font-bold text-white leading-4">PRESENCE</span>
                    </div>
                </div>

                {/* Game View and Message Box */}
                <div className="relative flex-grow min-h-[400px]">
                    <GameView 
                        gameState={gameState} 
                        setGameState={setGameState} 
                        handleInteraction={handleInteraction}
                        audioController={audioControllerRef.current}
                        isRunning={gameState.isRunning}
                    />
                    <div id="message-box" className={`
                        absolute top-10 left-1/2 transform -translate-x-1/2 p-3 bg-black/80 border-2 border-red-700 rounded-lg text-center text-sm transition-opacity duration-500 max-w-xs
                        ${gameState.message ? 'opacity-100' : 'opacity-0'} ${gameState.messageColor}
                    `}>
                        {gameState.message}
                    </div>
                </div>
                
                {/* Footer/Controls */}
                <div className="p-3 bg-red-900/20 text-xs text-center border-t border-red-900">
                    <p className="text-red-300 mb-2">Desktop: **WASD** to move, **Mouse** to look/interact. Mobile: Use **D-Pad** and **tap** to interact.</p>
                    <div className="flex justify-center space-x-4">
                         <button onClick={toggleAudio} className="action-button">
                            {gameState.audioMuted ? "Unmute Audio" : "Mute Audio"}
                         </button>
                    </div>
                    <p id="userIdDisplay" className="text-gray-500 mt-2 text-xs">User ID: {userId || 'Authenticating...'}</p>
                </div>
                
                {/* Start/End Screen Modal */}
                {gameState.modalOpen && (
                    <div className="absolute inset-0 bg-black bg-opacity-95 flex items-center justify-center z-50">
                        <div className="text-center p-8 bg-gray-900 border-2 border-red-700 rounded-xl shadow-2xl max-w-sm w-11/12">
                            <h1 className={`font-['Creepster'] text-5xl mb-4 ${gameState.modalTitle.includes("GRANTED") || gameState.modalTitle.includes("SILENT") ? 'text-green-500' : 'text-red-600'}`}>{gameState.modalTitle}</h1>
                            <p className="text-gray-300 mb-6 text-sm">{gameState.modalText}</p>
                            <button onClick={startGame} className="action-button text-base px-6 py-3">
                                {gameState.isRunning ? "RESUME GAME" : "START THE GAME"}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

