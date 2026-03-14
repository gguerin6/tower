import { Scene } from '../engine/Scene.js';
import { SCENES } from '../utils/Constants.js';
import { Audio } from '../audio/AudioManager.js';

export class CinematicScene extends Scene {
    constructor(game) {
        super(game);
        this.video = null;
        this.skipped = false;
    }

    enter() {
        this.skipped = false;

        // Stop game music during cinematic
        Audio.stopMusic();

        // Create video element overlaying the game
        this.video = document.createElement('video');
        this.video.src = 'assets/introcinematique.mp4';
        this.video.style.cssText = `
            position: absolute; top: 0; left: 0;
            width: 100%; height: 100%;
            object-fit: cover; z-index: 100;
            background: #000; cursor: pointer;
        `;

        const container = document.getElementById('game-container');
        container.appendChild(this.video);

        // Auto-transition when video ends
        this.video.addEventListener('ended', () => this._finish());

        // Fallback if video fails to load
        this.video.addEventListener('error', () => this._finish());

        this.video.play().catch(() => {
            // Autoplay blocked — finish immediately
            this._finish();
        });
    }

    _finish() {
        if (this.skipped) return;
        this.skipped = true;

        if (this.video) {
            this.video.pause();
            this.video.remove();
            this.video = null;
        }

        this.game.sceneManager.switch(SCENES.VILLAGE);
    }

    onMouseDown() {
        this._finish();
    }

    onKeyDown() {
        this._finish();
    }

    exit() {
        // Safety cleanup
        if (this.video) {
            this.video.pause();
            this.video.remove();
            this.video = null;
        }
    }

    update() {}
    render() {}
}
