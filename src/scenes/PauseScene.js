import { Scene } from '../engine/Scene.js';
import { Button } from '../ui/Button.js';
import { SpriteRenderer } from '../renderer/SpriteRenderer.js';
import { UIRenderer } from '../renderer/UIRenderer.js';
import { CANVAS_WIDTH, CANVAS_HEIGHT, SCENES } from '../utils/Constants.js';
import { Audio } from '../audio/AudioManager.js';

export class PauseScene extends Scene {
    constructor(game) {
        super(game);
        this.buttons = [];
        this.showSettings = false;
        this.showKeybinds = false;
        this.musicVol = Audio.musicVolume;
        this.sfxVol = Audio.sfxVolume;
        this.dragging = null;
        this.waitingForKey = null;
    }

    enter() {
        this.showSettings = false;
        this.showKeybinds = false;
        this.musicVol = Audio.musicVolume;
        this.sfxVol = Audio.sfxVolume;
        this.dragging = null;
        this.waitingForKey = null;
        this.initButtons();
    }

    initButtons() {
        const cx = CANVAS_WIDTH / 2;
        const cy = CANVAS_HEIGHT / 2;

        if (this.showKeybinds) {
            const bindings = this._getBindingsList();
            const rowH = 24;
            const listH = bindings.length * rowH;
            const headerH = 50;
            const footerH = 60;
            const panelH = headerH + listH + footerH + 30;
            const panelY = cy - panelH / 2;
            const btnY = panelY + panelH - footerH + 5;
            this.buttons = [
                new Button(cx - 90, btnY, 120, 36, 'Back', () => {
                    this.showKeybinds = false;
                    this.showSettings = true;
                    this.initButtons();
                }, { fontSize: 14 }),
                new Button(cx + 40, btnY, 80, 36, 'Reset', () => {
                    this.game.resetKeyBindings();
                    this.initButtons();
                }, { fontSize: 12, color: '#4a2a2a', hoverColor: '#6a3a3a' })
            ];
        } else if (this.showSettings) {
            this.buttons = [
                new Button(cx - 100, cy + 60, 200, 44, 'Key Bindings', () => {
                    this.showSettings = false;
                    this.showKeybinds = true;
                    this.waitingForKey = null;
                    this.initButtons();
                }, { fontSize: 14, color: '#2a3a4a', hoverColor: '#3a5a6a' }),
                new Button(cx - 100, cy + 112, 200, 44, 'Back', () => {
                    this.showSettings = false;
                    this.initButtons();
                }, { fontSize: 15 })
            ];
        } else {
            const blockH = 290;
            const topY = cy - blockH / 2;
            const btnStart = topY + 50;
            const btnGap = 56;
            this.buttons = [
                new Button(cx - 100, btnStart, 200, 48, 'Resume', () => {
                    this.game.sceneManager.pop();
                }, { fontSize: 18, color: '#2a4a2a', hoverColor: '#3a6a3a' }),
                new Button(cx - 100, btnStart + btnGap, 200, 48, 'Settings', () => {
                    this.showSettings = true;
                    this.initButtons();
                }, { fontSize: 16, color: '#2a2a4a', hoverColor: '#3a3a6a' }),
                new Button(cx - 100, btnStart + btnGap * 2, 200, 48, 'Save & Quit', () => {
                    this.game.saveGame();
                    this.game.sceneManager.pop();
                    this.game.sceneManager.switch(SCENES.VILLAGE);
                }, { fontSize: 16 }),
                new Button(cx - 100, btnStart + btnGap * 3, 200, 48, 'Main Menu', () => {
                    this.game.saveGame();
                    this.game.sceneManager.pop();
                    this.game.sceneManager.switch(SCENES.MAIN_MENU);
                }, { fontSize: 16, color: '#4a2a2a', hoverColor: '#6a3a3a' })
            ];
        }
    }

    onMouseMove(x, y) {
        for (const btn of this.buttons) btn.handleMouseMove(x, y);
        if (this.dragging) {
            this._updateSlider(x);
        }
    }

    onMouseDown(x, y) {
        if (this.waitingForKey) return;

        for (const btn of this.buttons) {
            if (btn.handleClick(x, y)) return;
        }

        if (this.showSettings && !this.showKeybinds) {
            const cx = CANVAS_WIDTH / 2;
            const cy = CANVAS_HEIGHT / 2;
            const sliderX = cx - 80;
            const sliderW = 160;
            const musicY = cy - 50;
            const sfxY = cy - 2;

            if (x >= sliderX && x <= sliderX + sliderW) {
                if (y >= musicY - 8 && y <= musicY + 16) {
                    this.dragging = 'music';
                    this._updateSlider(x);
                } else if (y >= sfxY - 8 && y <= sfxY + 16) {
                    this.dragging = 'sfx';
                    this._updateSlider(x);
                }
            }
        }

        if (this.showKeybinds) {
            const cx = CANVAS_WIDTH / 2;
            const cy = CANVAS_HEIGHT / 2;
            const bindings = this._getBindingsList();
            const rowH = 24;
            const listH = bindings.length * rowH;
            const headerH = 50;
            const footerH = 60;
            const panelH = headerH + listH + footerH + 30;
            const panelY = cy - panelH / 2;
            const startY = panelY + headerH + 4;
            for (let i = 0; i < bindings.length; i++) {
                const by = startY + i * rowH;
                if (x >= cx + 20 && x <= cx + 130 && y >= by && y <= by + 20) {
                    this.waitingForKey = bindings[i].id;
                    return;
                }
            }
        }
    }

    onMouseUp() {
        this.dragging = null;
    }

    _updateSlider(x) {
        const cx = CANVAS_WIDTH / 2;
        const sliderX = cx - 80;
        const sliderW = 160;
        const val = Math.max(0, Math.min(1, (x - sliderX) / sliderW));

        if (this.dragging === 'music') {
            this.musicVol = val;
            Audio.setMusicVolume(val);
        } else if (this.dragging === 'sfx') {
            this.sfxVol = val;
            Audio.setSfxVolume(val);
        }
    }

    _getBindingsList() {
        const kb = this.game.keyBindings;
        return [
            { id: 'pause', label: 'Pause', value: kb.pause },
            { id: 'nextWave', label: 'Next Wave', value: kb.nextWave },
            { id: 'speed', label: 'Speed Toggle', value: kb.speed },
            { id: 'closemenu', label: 'Close Menu', value: kb.closemenu },
            { id: 'skills.skill1', label: 'Skill 1', value: kb.skills.skill1 },
            { id: 'skills.skill2', label: 'Skill 2', value: kb.skills.skill2 },
            { id: 'skills.skill3', label: 'Skill 3', value: kb.skills.skill3 },
            { id: 'skills.skill4', label: 'Skill 4', value: kb.skills.skill4 },
            { id: 'skills.skill5', label: 'Skill 5', value: kb.skills.skill5 },
        ];
    }

    _getKeyDisplayName(key) {
        if (key === ' ') return 'Space';
        if (key === 'Escape') return 'Esc';
        if (key === 'Tab') return 'Tab';
        if (key === 'Enter') return 'Enter';
        if (key === 'ArrowUp') return 'Up';
        if (key === 'ArrowDown') return 'Down';
        if (key === 'ArrowLeft') return 'Left';
        if (key === 'ArrowRight') return 'Right';
        // Keep special characters as-is (AZERTY keys like &, é, ", ', ()
        if (key.length === 1 && /[^a-zA-Z0-9]/.test(key)) return key;
        return key.toUpperCase();
    }

    onKeyDown(key) {
        if (this.waitingForKey) {
            const id = this.waitingForKey;
            const kb = this.game.keyBindings;
            if (id.startsWith('skills.')) {
                const skillId = id.split('.')[1];
                kb.skills[skillId] = key;
            } else {
                kb[id] = key;
            }
            this.game.saveKeyBindings();
            this.waitingForKey = null;
            return;
        }

        if (key === 'Escape') {
            if (this.showKeybinds) {
                this.showKeybinds = false;
                this.showSettings = true;
                this.initButtons();
            } else if (this.showSettings) {
                this.showSettings = false;
                this.initButtons();
            } else {
                this.game.sceneManager.pop();
            }
        }
    }

    render(renderer) {
        const ui = renderer.ui;

        ui.fillStyle = 'rgba(0,0,0,0.7)';
        ui.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        const cx = CANVAS_WIDTH / 2;
        const cy = CANVAS_HEIGHT / 2;

        if (this.showKeybinds) {
            const bindings = this._getBindingsList();
            const rowH = 24;
            const listH = bindings.length * rowH;
            const headerH = 50;
            const footerH = 60;
            const panelH = headerH + listH + footerH + 30;
            const panelY = cy - panelH / 2;

            UIRenderer.drawPanel(ui, cx - 170, panelY, 340, panelH, 0.93);
            SpriteRenderer.drawText(ui, 'KEY BINDINGS', cx, panelY + 18, '#ffd700', 22, 'center');
            UIRenderer.drawSeparator(ui, cx - 120, panelY + 36, 240);
            SpriteRenderer.drawTextNoOutline(ui, 'Click a key to rebind', cx, panelY + 42, '#666', 10, 'center');

            const startY = panelY + headerH + 4;
            for (let i = 0; i < bindings.length; i++) {
                const b = bindings[i];
                const by = startY + i * rowH;
                const isWaiting = this.waitingForKey === b.id;

                // Label
                SpriteRenderer.drawTextNoOutline(ui, b.label, cx - 140, by + 5, '#bbb', 11);

                // Key box
                ui.fillStyle = isWaiting ? '#3a2a0a' : '#12121e';
                SpriteRenderer._rr(ui, cx + 20, by, 110, 20, 5);
                ui.fill();
                ui.strokeStyle = isWaiting ? '#ffd700' : '#333';
                ui.lineWidth = isWaiting ? 1.5 : 1;
                SpriteRenderer._rr(ui, cx + 20, by, 110, 20, 5);
                ui.stroke();

                const displayText = isWaiting ? '< Press Key >' : this._getKeyDisplayName(b.value);
                const textColor = isWaiting ? '#ffd700' : '#ccc';
                SpriteRenderer.drawTextNoOutline(ui, displayText, cx + 75, by + 4, textColor, 10, 'center');
            }
        } else if (this.showSettings) {
            UIRenderer.drawPanel(ui, cx - 160, cy - 140, 320, 340, 0.93);
            SpriteRenderer.drawText(ui, 'SETTINGS', cx, cy - 118, '#ffd700', 26, 'center');
            UIRenderer.drawSeparator(ui, cx - 100, cy - 90, 200);

            // Music slider
            SpriteRenderer.drawText(ui, 'Music', cx - 90, cy - 70, '#ccc', 14);
            this._drawSlider(ui, cx - 80, cy - 50, 160, this.musicVol);
            SpriteRenderer.drawTextNoOutline(ui, `${Math.round(this.musicVol * 100)}%`, cx + 90, cy - 48, '#aaa', 12);

            // SFX slider
            SpriteRenderer.drawText(ui, 'SFX', cx - 90, cy - 22, '#ccc', 14);
            this._drawSlider(ui, cx - 80, cy - 2, 160, this.sfxVol);
            SpriteRenderer.drawTextNoOutline(ui, `${Math.round(this.sfxVol * 100)}%`, cx + 90, cy, '#aaa', 12);

            SpriteRenderer.drawTextNoOutline(ui, 'Speed: Tab or HUD button', cx, cy + 28, '#666', 11, 'center');
        } else {
            const blockH = 290;
            const topY = cy - blockH / 2;
            const panelPad = 22;
            UIRenderer.drawPanel(ui, cx - 140, topY - panelPad, 280, blockH + panelPad * 2, 0.93);
            SpriteRenderer.drawText(ui, 'PAUSED', cx, topY + 2, '#ffd700', 26, 'center');
            UIRenderer.drawSeparator(ui, cx - 80, topY + 34, 160);
        }

        for (const btn of this.buttons) {
            btn.render(ui);
        }
    }

    _drawSlider(ctx, x, y, w, value) {
        // Track background
        ctx.fillStyle = '#111';
        SpriteRenderer._rr(ctx, x, y + 2, w, 8, 4);
        ctx.fill();

        // Fill
        const fillW = w * value;
        if (fillW > 0) {
            const grad = ctx.createLinearGradient(x, y, x + fillW, y);
            grad.addColorStop(0, '#3355aa');
            grad.addColorStop(1, '#6688cc');
            ctx.fillStyle = grad;
            ctx.save();
            SpriteRenderer._rr(ctx, x, y + 2, w, 8, 4);
            ctx.clip();
            ctx.fillRect(x, y + 2, fillW, 8);
            ctx.restore();
        }

        // Track border
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        SpriteRenderer._rr(ctx, x, y + 2, w, 8, 4);
        ctx.stroke();

        // Knob
        const knobX = x + fillW;
        const knobGrad = ctx.createRadialGradient(knobX, y + 6, 0, knobX, y + 6, 8);
        knobGrad.addColorStop(0, '#fff');
        knobGrad.addColorStop(1, '#bbb');
        ctx.fillStyle = knobGrad;
        ctx.beginPath();
        ctx.arc(knobX, y + 6, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }
}
