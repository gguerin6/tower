import { GameLoop } from './GameLoop.js';
import { SceneManager } from './SceneManager.js';
import { InputManager } from './InputManager.js';
import { Camera } from './Camera.js';
import { CanvasRenderer } from '../renderer/CanvasRenderer.js';
import { ParticleSystem } from '../renderer/ParticleSystem.js';
import { SaveManager } from '../save/SaveManager.js';
import { SCENES } from '../utils/Constants.js';
import { EventBus } from '../utils/EventBus.js';
import { Audio } from '../audio/AudioManager.js';

// Scene imports
import { MainMenuScene } from '../scenes/MainMenuScene.js';
import { GameScene } from '../scenes/GameScene.js';
import { VillageScene } from '../scenes/VillageScene.js';
import { MapSelectScene } from '../scenes/MapSelectScene.js';
import { PauseScene } from '../scenes/PauseScene.js';
import { GameOverScene } from '../scenes/GameOverScene.js';
import { CinematicScene } from '../scenes/CinematicScene.js';

export class Game {
    constructor() {
        this.renderer = new CanvasRenderer();
        this.input = new InputManager(this.renderer.getTopCanvas());
        this.sceneManager = new SceneManager();
        this.camera = new Camera();
        this.particles = new ParticleSystem();
        this.saveManager = new SaveManager();

        // Player state (persistent across scenes)
        this.playerData = null;

        // Key bindings (configurable)
        this.keyBindings = this.loadKeyBindings();

        this.loop = new GameLoop(
            (dt) => this.update(dt),
            () => this.render()
        );

        this.registerScenes();
        this.setupInput();
        this.setupVisibility();
    }

    registerScenes() {
        this.sceneManager.register(SCENES.MAIN_MENU, new MainMenuScene(this));
        this.sceneManager.register(SCENES.GAME, new GameScene(this));
        this.sceneManager.register(SCENES.VILLAGE, new VillageScene(this));
        this.sceneManager.register(SCENES.MAP_SELECT, new MapSelectScene(this));
        this.sceneManager.register(SCENES.PAUSE, new PauseScene(this));
        this.sceneManager.register(SCENES.GAME_OVER, new GameOverScene(this));
        this.sceneManager.register(SCENES.CINEMATIC, new CinematicScene(this));
    }

    setupInput() {
        this.input.onMouseDown((x, y, btn) => {
            // Init audio on first user click (browser requirement)
            if (!Audio.initialized) {
                Audio.init();
            }
            Audio.resume();
            const scene = this.sceneManager.current();
            if (scene) scene.onMouseDown(x, y, btn);
        });
        this.input.onMouseUp((x, y, btn) => {
            const scene = this.sceneManager.current();
            if (scene) scene.onMouseUp(x, y, btn);
        });
        this.input.onMouseMove((x, y) => {
            const scene = this.sceneManager.current();
            if (scene) scene.onMouseMove(x, y);
        });
        this.input.onKeyDown((key) => {
            const scene = this.sceneManager.current();
            if (scene) scene.onKeyDown(key);
        });
        this.input.onKeyUp((key) => {
            const scene = this.sceneManager.current();
            if (scene) scene.onKeyUp(key);
        });
        this.input.onWheel((deltaY) => {
            const scene = this.sceneManager.current();
            if (scene) scene.onWheel(deltaY);
        });
    }

    setupVisibility() {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // Auto-pause only during gameplay — check if GameScene is in the stack
                // but PauseScene is NOT already on top
                const stack = this.sceneManager.stack;
                const top = this.sceneManager.current();
                const gameScene = this.sceneManager.scenes[SCENES.GAME];
                if (stack.includes(gameScene) && top === gameScene) {
                    gameScene.togglePause();
                }
            }
        });
    }

    start() {
        this.sceneManager.switch(SCENES.MAIN_MENU);
        this.loop.start();
    }

    update(dt) {
        this.sceneManager.update(dt);
        this.particles.update(dt);
    }

    render() {
        if (this.sceneManager.needsBgClear) {
            this.renderer.clear('BG');
            this.sceneManager.needsBgClear = false;
        }
        this.renderer.clearEntity();
        this.renderer.clearUI();
        this.sceneManager.render(this.renderer);
    }

    loadGame(slot) {
        this.playerData = this.saveManager.load(slot);
        if (!this.playerData) {
            this.playerData = this.saveManager.createNew(slot);
        }
    }

    saveGame() {
        if (this.playerData) {
            this.saveManager.save(this.playerData);
        }
    }

    loadKeyBindings() {
        try {
            const saved = localStorage.getItem('towerDefenseKeyBindings');
            if (saved) return JSON.parse(saved);
        } catch (e) {}
        return this.getDefaultKeyBindings();
    }

    getDefaultKeyBindings() {
        return {
            pause: 'Escape',
            nextWave: ' ',
            speed: 'Tab',
            closemenu: 'q',
            skills: { skill1: '&', skill2: 'é', skill3: '"', skill4: "'", skill5: '(' }
        };
    }

    saveKeyBindings() {
        localStorage.setItem('towerDefenseKeyBindings', JSON.stringify(this.keyBindings));
    }

    resetKeyBindings() {
        this.keyBindings = this.getDefaultKeyBindings();
        this.saveKeyBindings();
    }
}
