import { Scene } from '../engine/Scene.js';
import { Button } from '../ui/Button.js';
import { SpriteRenderer } from '../renderer/SpriteRenderer.js';
import { UIRenderer } from '../renderer/UIRenderer.js';
import { CANVAS_WIDTH, CANVAS_HEIGHT, SCENES, COLORS } from '../utils/Constants.js';
import { Audio } from '../audio/AudioManager.js';
import { Materials } from '../data/MaterialData.js';
import { MapData } from '../data/MapData.js';
import { BalanceConfig } from '../data/BalanceConfig.js';

const bannerImg = new Image();
bannerImg.src = 'assets/banner.jpg';

export class GameOverScene extends Scene {
    constructor(game) {
        super(game);
        this.buttons = [];
        this.victory = false;
        this.goldEarned = 0;
        this.waveGold = 0;
        this.victoryBonus = 0;
        this.wavesCompleted = 0;
        this.mapId = null;
        this.isInfinite = false;
        this.isNewRecord = false;
        this.bestWave = 0;
        this.loot = {};
        this.xpEarned = 0;
        this.levelsGained = 0;
        this._matZones = [];
        this._matTooltip = null;
        this._mouseX = 0;
        this._mouseY = 0;
    }

    enter(params = {}) {
        Audio.ensureMusic();
        this.victory = params.victory || false;
        this.goldEarned = params.gold || 0;
        this.waveGold = params.waveGold || 0;
        this.victoryBonus = params.victoryBonus || 0;
        this.wavesCompleted = params.wave || 0;
        this.mapId = params.mapId || null;
        this.isInfinite = params.isInfinite || false;
        this.isNewRecord = params.isNewRecord || false;
        this.bestWave = params.bestWave || 0;
        this.loot = params.loot || {};
        this.xpEarned = params.xpEarned || 0;

        // Apply XP to playerData and count levels gained
        const pd = this.game.playerData;
        const startLevel = pd.level;
        pd.xp += this.xpEarned;
        const maxLvl = BalanceConfig.MAX_LEVEL || 30;
        let needed = Math.floor(BalanceConfig.XP_LEVEL_BASE * Math.pow(BalanceConfig.XP_LEVEL_MULT, pd.level - 1));
        while (pd.xp >= needed && pd.level < maxLvl) {
            pd.xp -= needed;
            pd.level++;
            pd.skillPoints += BalanceConfig.SKILL_POINTS_PER_LEVEL;
            needed = Math.floor(BalanceConfig.XP_LEVEL_BASE * Math.pow(BalanceConfig.XP_LEVEL_MULT, pd.level - 1));
        }
        if (pd.level >= maxLvl) pd.xp = 0;
        this.levelsGained = pd.level - startLevel;
        if (this.levelsGained > 0) {
            this.game.pendingLevelUp = { levels: this.levelsGained, newLevel: pd.level };
        }
        this.game.saveGame();

        const cx = CANVAS_WIDTH / 2;

        this.buttons = [
            new Button(cx - 100, 0, 200, 44, 'Back to Village', () => {
                Audio.playButtonClick();
                this.game.sceneManager.switch(SCENES.VILLAGE);
            }, { fontSize: 16, color: '#2a4a2a', hoverColor: '#3a6a3a' }),
            new Button(cx - 100, 0, 200, 44, 'Main Menu', () => {
                Audio.playButtonClick();
                this.game.sceneManager.switch(SCENES.MAIN_MENU);
            }, { fontSize: 16 })
        ];
    }

    onMouseMove(x, y) {
        this._mouseX = x;
        this._mouseY = y;
        this._matTooltip = null;
        for (const z of this._matZones) {
            if (x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h) {
                this._matTooltip = z;
                break;
            }
        }
        for (const btn of this.buttons) btn.handleMouseMove(x, y);
    }

    onMouseDown(x, y) {
        for (const btn of this.buttons) {
            if (btn.handleClick(x, y)) return;
        }
    }

    render(renderer) {
        const bg = renderer.bg;
        const ui = renderer.ui;
        this._matZones = [];

        // Banner background with tinted overlay
        if (bannerImg.complete && bannerImg.naturalWidth > 0) {
            const imgAspect = bannerImg.naturalWidth / bannerImg.naturalHeight;
            const canvasAspect = CANVAS_WIDTH / CANVAS_HEIGHT;
            let drawW, drawH, drawX, drawY;
            if (canvasAspect > imgAspect) {
                drawW = CANVAS_WIDTH;
                drawH = CANVAS_WIDTH / imgAspect;
                drawX = 0;
                drawY = (CANVAS_HEIGHT - drawH) / 2;
            } else {
                drawH = CANVAS_HEIGHT;
                drawW = CANVAS_HEIGHT * imgAspect;
                drawX = (CANVAS_WIDTH - drawW) / 2;
                drawY = 0;
            }
            bg.drawImage(bannerImg, drawX, drawY, drawW, drawH);
            bg.fillStyle = this.victory ? 'rgba(10,40,10,0.65)' : 'rgba(40,10,10,0.65)';
            bg.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        } else {
            const grad = bg.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
            if (this.victory) {
                grad.addColorStop(0, '#0a1a0a');
                grad.addColorStop(1, '#1a3a1a');
            } else {
                grad.addColorStop(0, '#1a0a0a');
                grad.addColorStop(1, '#2a1515');
            }
            bg.fillStyle = grad;
            bg.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        }

        // Vignette
        const vignette = bg.createRadialGradient(
            CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_WIDTH * 0.2,
            CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_WIDTH * 0.7
        );
        vignette.addColorStop(0, 'rgba(0,0,0,0)');
        vignette.addColorStop(1, 'rgba(0,0,0,0.5)');
        bg.fillStyle = vignette;
        bg.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        const cx = CANVAS_WIDTH / 2;
        const cy = CANVAS_HEIGHT / 2;

        // Count loot entries for panel sizing
        const lootEntries = Object.entries(this.loot).filter(([, v]) => v > 0);
        const lootH = lootEntries.length > 0 ? 42 + Math.ceil(lootEntries.length / 3) * 26 : 0;
        const hasRecord = !this.victory && this.isNewRecord;
        const recordH = hasRecord ? 28 : 0;
        const xpH = 32 + (this.levelsGained > 0 ? 24 : 0);
        const panelH = 300 + lootH + recordH + xpH;
        const panelY = cy - panelH / 2 - 10;

        UIRenderer.drawPanel(ui, cx - 210, panelY, 420, panelH, 0.93);

        let y = panelY + 20;

        // ── TITLE ──
        const title = this.victory ? 'VICTORY!' : 'DEFEAT';
        const titleColor = this.victory ? '#44dd77' : '#ee5555';

        const titleGlow = ui.createRadialGradient(cx, y + 14, 10, cx, y + 14, 120);
        titleGlow.addColorStop(0, this.victory ? 'rgba(68,221,119,0.1)' : 'rgba(238,85,85,0.1)');
        titleGlow.addColorStop(1, 'rgba(0,0,0,0)');
        ui.fillStyle = titleGlow;
        ui.fillRect(cx - 120, y - 10, 240, 50);

        SpriteRenderer.drawText(ui, title, cx, y, titleColor, 36, 'center');
        y += 42;

        // Map name
        if (this.mapId && !this.isInfinite) {
            const mapInfo = MapData[this.mapId];
            if (mapInfo) {
                SpriteRenderer.drawTextNoOutline(ui, mapInfo.name, cx, y, '#777', 12, 'center');
                y += 16;
            }
        }

        UIRenderer.drawSeparator(ui, cx - 100, y, 200);
        y += 16;

        // ── WAVES ROW ──
        ui.fillStyle = 'rgba(255,255,255,0.03)';
        SpriteRenderer._rr(ui, cx - 170, y - 2, 340, 28, 6);
        ui.fill();
        SpriteRenderer.drawTextNoOutline(ui, 'Waves Reached', cx - 110, y + 4, '#999', 13);
        SpriteRenderer.drawText(ui, `${this.wavesCompleted}`, cx + 110, y + 2, '#ddd', 18);
        y += 34;

        // ── NEW RECORD ──
        if (hasRecord) {
            ui.fillStyle = 'rgba(255,215,0,0.06)';
            SpriteRenderer._rr(ui, cx - 170, y - 2, 340, 24, 6);
            ui.fill();
            SpriteRenderer.drawText(ui, 'NEW RECORD!', cx, y + 2, '#ffd700', 14, 'center');
            y += 28;
        }

        // ── GOLD REWARD ──
        ui.fillStyle = 'rgba(255,215,0,0.03)';
        SpriteRenderer._rr(ui, cx - 170, y - 2, 340, 28, 6);
        ui.fill();
        SpriteRenderer.drawTextNoOutline(ui, 'Gold Reward', cx - 110, y + 4, '#999', 13);
        UIRenderer.drawGoldIcon(ui, cx + 85, y + 3, 12);
        SpriteRenderer.drawText(ui, `+${this.goldEarned}`, cx + 110, y + 2, COLORS.UI_GOLD, 18);
        y += 32;

        // Gold breakdown
        if (this.victory && this.victoryBonus > 0) {
            SpriteRenderer.drawTextNoOutline(ui, `Wave reward: ${this.waveGold}g  +  Victory bonus: ${this.victoryBonus}g`, cx, y, '#666', 10, 'center');
            y += 16;
        } else if (!this.victory && !this.isInfinite) {
            SpriteRenderer.drawTextNoOutline(ui, 'Upgrade your hero and towers to go further!', cx, y, '#887755', 10, 'center');
            y += 16;
        }

        // Best wave reminder for defeat
        if (!this.victory && this.bestWave > 0) {
            SpriteRenderer.drawTextNoOutline(ui, `Best: Wave ${this.bestWave}`, cx, y, '#555', 10, 'center');
            y += 14;
        }

        // ── XP EARNED ──
        ui.fillStyle = 'rgba(150,100,220,0.04)';
        SpriteRenderer._rr(ui, cx - 170, y - 2, 340, 28, 6);
        ui.fill();
        SpriteRenderer.drawTextNoOutline(ui, 'XP Earned', cx - 110, y + 4, '#999', 13);
        SpriteRenderer.drawText(ui, `+${this.xpEarned}`, cx + 110, y + 2, '#bb88ff', 18);
        y += 32;

        // Level up notification
        if (this.levelsGained > 0) {
            ui.fillStyle = 'rgba(255,215,0,0.08)';
            SpriteRenderer._rr(ui, cx - 170, y - 2, 340, 22, 6);
            ui.fill();
            const lvlText = this.levelsGained === 1
                ? `LEVEL UP! Now Lv.${this.game.playerData.level}`
                : `${this.levelsGained} LEVELS UP! Now Lv.${this.game.playerData.level}`;
            SpriteRenderer.drawText(ui, lvlText, cx, y, '#ffd700', 13, 'center');
            y += 24;
        }

        // ── LOOT DISPLAY ──
        if (lootEntries.length > 0) {
            y += 4;
            UIRenderer.drawSeparator(ui, cx - 80, y, 160);
            y += 12;
            SpriteRenderer.drawTextNoOutline(ui, 'MATERIALS COLLECTED', cx, y, '#777', 10, 'center');
            y += 18;

            const colW = 120;
            const cols = Math.min(lootEntries.length, 3);
            const startX = cx - (cols * colW) / 2;
            lootEntries.forEach(([mat, amount], i) => {
                const matInfo = Materials[mat];
                if (!matInfo) return;
                const col = i % 3;
                const row = Math.floor(i / 3);
                const lx = startX + col * colW + 12;
                const ly = y + row * 26;
                ui.fillStyle = matInfo.color;
                ui.globalAlpha = 0.2;
                ui.beginPath();
                ui.arc(lx, ly + 5, 8, 0, Math.PI * 2);
                ui.fill();
                ui.globalAlpha = 1;
                SpriteRenderer.drawMaterialIcon(ui, mat, lx, ly + 5, 6);
                SpriteRenderer.drawTextNoOutline(ui, `${matInfo.name}: ${amount}`, lx + 12, ly, matInfo.color, 11);
                this._matZones.push({ x: lx - 8, y: ly - 4, w: colW - 16, h: 20, id: mat, name: matInfo.name, color: matInfo.color, amount });
            });
        }

        // ── BUTTONS ──
        const btnBaseY = panelY + panelH - 100;
        this.buttons[0].y = btnBaseY;
        this.buttons[1].y = btnBaseY + 52;

        for (const btn of this.buttons) {
            btn.render(ui);
        }

        // Material tooltip
        if (this._matTooltip) {
            const t = this._matTooltip;
            UIRenderer.drawTooltip(ui, this._mouseX + 12, this._mouseY - 10, [
                { text: t.name, color: t.color, size: 13 },
                { text: `Collected: ${t.amount}`, color: '#aaa', size: 11 }
            ]);
        }
    }
}
