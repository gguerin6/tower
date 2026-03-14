import { Scene } from '../engine/Scene.js';
import { Button } from '../ui/Button.js';
import { SpriteRenderer } from '../renderer/SpriteRenderer.js';
import { UIRenderer } from '../renderer/UIRenderer.js';
import { MapData } from '../data/MapData.js';
import { CANVAS_WIDTH, CANVAS_HEIGHT, SCENES, COLORS } from '../utils/Constants.js';
import { Audio } from '../audio/AudioManager.js';

const bannerImg = new Image();
bannerImg.src = 'assets/banner.jpg';

const MAP_COLORS = {
    forest: { bg: '#1a3a1a', accent: '#44aa44', name: 'Forest' },
    desert: { bg: '#3a2a0a', accent: '#ccaa44', name: 'Desert' },
    mountain: { bg: '#2a2a2a', accent: '#8888aa', name: 'Mountain' },
    swamp: { bg: '#0a2a1a', accent: '#44aa88', name: 'Swamp' },
    castle: { bg: '#1a1a2a', accent: '#8888cc', name: 'Castle' }
};

export class MapSelectScene extends Scene {
    constructor(game) {
        super(game);
        this.mapButtons = [];
        this.mapCards = []; // visual data for map cards
    }

    enter() {
        Audio.ensureMusic();

        const pd = this.game.playerData;
        const maps = Object.entries(MapData);
        const cx = CANVAS_WIDTH / 2;
        const cardW = 440;
        const cardH = 64;
        const gap = 8;
        const startY = 90;

        this.mapButtons = [];
        this.mapCards = [];

        maps.forEach(([id, data], i) => {
            const y = startY + i * (cardH + gap);
            const completed = pd.mapsCompleted[id];
            const locked = data.requiredMap && !pd.mapsCompleted[data.requiredMap];
            const bx = cx - cardW / 2;

            this.mapCards.push({
                id, data, completed, locked, x: bx, y, w: cardW, h: cardH
            });

            this.mapButtons.push(new Button(bx, y, cardW, cardH, '', () => {
                if (!locked) {
                    this.game.sceneManager.switch(SCENES.GAME, { mapId: id });
                }
            }, {
                color: 'transparent', hoverColor: 'transparent',
                disabled: locked
            }));
        });

        // Infinite mode card
        const infY = startY + maps.length * (cardH + gap) + 12;
        this.mapCards.push({
            id: 'infinite', data: { name: 'Infinite Mode', waves: Infinity, difficulty: 0, description: 'Endless waves with scaling difficulty' },
            completed: false, locked: false, x: cx - cardW / 2, y: infY, w: cardW, h: cardH, infinite: true
        });
        this.mapButtons.push(new Button(cx - cardW / 2, infY, cardW, cardH, '', () => {
            this.game.sceneManager.switch(SCENES.GAME, { mapId: 'infinite' });
        }, { color: 'transparent', hoverColor: 'transparent' }));

        // Back button
        this.mapButtons.push(new Button(cx - 90, CANVAS_HEIGHT - 65, 180, 44, 'Back to Village', () => {
            this.game.sceneManager.switch(SCENES.VILLAGE);
        }, { fontSize: 15 }));
    }

    onMouseMove(x, y) {
        for (const btn of this.mapButtons) btn.handleMouseMove(x, y);
    }

    onMouseDown(x, y) {
        Audio.playButtonClick();
        for (const btn of this.mapButtons) {
            if (btn.handleClick(x, y)) return;
        }
    }

    render(renderer) {
        const bg = renderer.bg;
        const ui = renderer.ui;

        // Banner background
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
            bg.fillStyle = 'rgba(0,0,0,0.72)';
            bg.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        } else {
            const grad = bg.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
            grad.addColorStop(0, '#0a0a1e');
            grad.addColorStop(1, '#151520');
            bg.fillStyle = grad;
            bg.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        }

        // Header
        SpriteRenderer.drawText(ui, 'SELECT MAP', CANVAS_WIDTH / 2, 16, '#ffd700', 28, 'center');
        UIRenderer.drawSeparator(ui, CANVAS_WIDTH / 2 - 100, 52, 200);

        // Player info
        UIRenderer.drawGoldIcon(ui, 18, 58, 14);
        SpriteRenderer.drawText(ui, `${this.game.playerData.gold}`, 38, 56, COLORS.UI_GOLD, 16);
        SpriteRenderer.drawText(ui, `Lv.${this.game.playerData.level}`, 130, 56, '#ddd', 15);

        const pd = this.game.playerData;

        // Map cards
        for (let i = 0; i < this.mapCards.length; i++) {
            const card = this.mapCards[i];
            const btn = this.mapButtons[i];
            if (!btn) continue;
            const hovered = btn.hovered;
            this._renderMapCard(ui, card, hovered, pd);
        }

        // Back button
        const backBtn = this.mapButtons[this.mapButtons.length - 1];
        if (backBtn) backBtn.render(ui);
    }

    _renderMapCard(ctx, card, hovered, pd) {
        const { id, data, completed, locked, x, y, w, h } = card;
        const colors = MAP_COLORS[id] || { bg: '#2a2a3a', accent: '#8888aa', name: id };

        // Card bg
        const bgColor = locked ? '#141416' : hovered ? '#252530' : '#1a1a22';
        ctx.fillStyle = bgColor;
        SpriteRenderer._rr(ctx, x, y, w, h, 8);
        ctx.fill();

        // Left accent bar
        ctx.fillStyle = locked ? '#333' : colors.accent || '#888';
        ctx.globalAlpha = locked ? 0.3 : 0.6;
        SpriteRenderer._rr(ctx, x, y, 5, h, 8);
        ctx.fill();
        ctx.fillRect(x + 4, y, 2, h);
        ctx.globalAlpha = 1;

        // Border
        if (completed) {
            ctx.strokeStyle = '#4a8a4a';
            ctx.lineWidth = 2;
        } else if (hovered && !locked) {
            ctx.strokeStyle = 'rgba(255,255,255,0.25)';
            ctx.lineWidth = 1.5;
        } else {
            ctx.strokeStyle = 'rgba(255,255,255,0.08)';
            ctx.lineWidth = 1;
        }
        SpriteRenderer._rr(ctx, x, y, w, h, 8);
        ctx.stroke();

        if (locked) {
            // Locked state
            SpriteRenderer.drawText(ctx, data.name, x + 20, y + 12, '#555', 16);
            const reqName = MapData[data.requiredMap]?.name || data.requiredMap;
            SpriteRenderer.drawTextNoOutline(ctx, `Complete "${reqName}" to unlock`, x + 20, y + 36, '#444', 11);
            SpriteRenderer.drawText(ctx, '\uD83D\uDD12', x + w - 36, y + 20, '#444', 20);
        } else if (card.infinite) {
            // Infinite mode
            SpriteRenderer.drawText(ctx, 'Infinite Mode', x + 20, y + 10, '#aa88ff', 17);
            SpriteRenderer.drawTextNoOutline(ctx, 'Endless waves with scaling difficulty', x + 20, y + 34, '#888', 11);
            const best = pd.bestWave?.infinite || 0;
            if (best > 0) {
                SpriteRenderer.drawText(ctx, `Best: Wave ${best}`, x + w - 120, y + 20, '#ffd700', 13);
            }
            // Infinity icon
            ctx.strokeStyle = '#aa88ff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(x + w - 28, y + h / 2 - 4, 8, 0, Math.PI * 2);
            ctx.stroke();
        } else {
            // Normal map
            SpriteRenderer.drawText(ctx, data.name, x + 20, y + 10, completed ? '#88dd88' : '#ddd', 17);

            // Waves
            SpriteRenderer.drawTextNoOutline(ctx, `${data.waves} waves`, x + 20, y + 36, '#888', 11);

            // Difficulty stars
            const starX = x + 110;
            for (let s = 0; s < 5; s++) {
                const filled = s < data.difficulty;
                ctx.fillStyle = filled ? '#ffd700' : '#333';
                ctx.font = '12px sans-serif';
                ctx.textAlign = 'left';
                ctx.fillText(filled ? '\u2605' : '\u2606', starX + s * 14, y + 40);
            }

            // Best wave / Completed badge
            const bestW = pd.bestWave?.[id] || 0;
            if (completed) {
                ctx.fillStyle = 'rgba(68,136,68,0.15)';
                SpriteRenderer._rr(ctx, x + w - 96, y + 14, 80, 24, 4);
                ctx.fill();
                SpriteRenderer.drawTextNoOutline(ctx, '\u2714 COMPLETED', x + w - 56, y + 18, '#88dd88', 10, 'center');
            } else if (bestW > 0) {
                SpriteRenderer.drawText(ctx, `Best: Wave ${bestW}/${data.waves}`, x + w - 130, y + 20, '#ffd700', 12);
            }
        }
    }
}
