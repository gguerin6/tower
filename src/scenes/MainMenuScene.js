import { Scene } from '../engine/Scene.js';
import { Button } from '../ui/Button.js';
import { SpriteRenderer } from '../renderer/SpriteRenderer.js';
import { UIRenderer } from '../renderer/UIRenderer.js';
import { CANVAS_WIDTH, CANVAS_HEIGHT, SCENES } from '../utils/Constants.js';
import { Audio } from '../audio/AudioManager.js';

// Preload banner image
const bannerImg = new Image();
bannerImg.src = 'assets/banner.jpg';

export class MainMenuScene extends Scene {
    constructor(game) {
        super(game);
        this.buttons = [];
        this.slotButtons = [];
        this.deleteButtons = [];
        this.showSlots = false;
        this.animTimer = 0;
        this.bgDrawn = false;
        this.confirmDeleteSlot = null;
        this.confirmButtons = [];
    }

    enter() {
        this.showSlots = false;
        this.animTimer = 0;
        this.bgDrawn = false;
        this.confirmDeleteSlot = null;
        this.confirmButtons = [];

        Audio.ensureMusic();

        const cx = CANVAS_WIDTH / 2;

        const blockH = 185;
        const blockY = (CANVAS_HEIGHT - blockH) / 2;

        this.buttons = [
            new Button(cx - 110, blockY + 130, 220, 55, 'PLAY', () => {
                this.showSlots = true;
                this.refreshSlots();
            }, { fontSize: 24, color: '#2a4a2a', hoverColor: '#3a6a3a' }),
        ];

        this.refreshSlots();
    }

    refreshSlots() {
        const cx = CANVAS_WIDTH / 2;
        const panelW = 440;
        const slotH = 60;
        const slotGap = 70;
        const panelH = 60 + 3 * slotGap + 16 + 44 + 52 + 32 + 20;
        const totalH = 45 + 15 + panelH;
        const blockTopY = (CANVAS_HEIGHT - totalH) / 2;
        const panelY = blockTopY + 60;
        const panelX = cx - panelW / 2;
        const startY = panelY + 60;
        const slots = this.game.saveManager.getAllSlotInfo();

        this.slotButtons = [];
        this.deleteButtons = [];

        slots.forEach((info, i) => {
            const slot = i + 1;
            const y = startY + i * slotGap;

            // Use empty text - we'll render custom card
            const isNewGame = !info;
            this.slotButtons.push(new Button(panelX + 20, y, panelW - 80, slotH, '', () => {
                this.game.loadGame(slot);
                if (isNewGame) {
                    this.game.sceneManager.switch(SCENES.CINEMATIC);
                } else {
                    this.game.sceneManager.switch(SCENES.VILLAGE);
                }
            }, { color: info ? '#1e2030' : '#1e2e1e', hoverColor: info ? '#2a2a44' : '#2a3e2a' }));

            // Store slot data for custom rendering
            this.slotButtons[this.slotButtons.length - 1]._slotInfo = info;
            this.slotButtons[this.slotButtons.length - 1]._slotNum = slot;

            if (info) {
                this.deleteButtons.push(new Button(panelX + panelW - 52, y + (slotH - 34) / 2, 34, 34, 'X', () => {
                    this._showDeleteConfirm(slot);
                }, { color: '#3a1a1a', hoverColor: '#5a2a2a', fontSize: 16 }));
            }
        });

        const backY = startY + slots.length * slotGap + 16;
        this.slotButtons.push(new Button(cx - 90, backY, 180, 44, 'Back', () => {
            this.showSlots = false;
        }, { fontSize: 16 }));

        // Export / Import buttons
        const ioY = backY + 52;
        this.slotButtons.push(new Button(cx - 120, ioY, 110, 32, 'Export', () => {
            this.game.saveManager.exportToFile();
        }, { fontSize: 12, color: '#2a3a4a', hoverColor: '#3a5a6a' }));
        this.slotButtons.push(new Button(cx + 10, ioY, 110, 32, 'Import', async () => {
            const ok = await this.game.saveManager.importFromFile();
            if (ok) this.refreshSlots();
        }, { fontSize: 12, color: '#2a3a4a', hoverColor: '#3a5a6a' }));
    }

    _showDeleteConfirm(slot) {
        this.confirmDeleteSlot = slot;
        const cx = CANVAS_WIDTH / 2;
        const dw = 260, dh = 120;
        const dy = CANVAS_HEIGHT / 2 - dh / 2;
        const btnY = dy + dh - 46;
        this.confirmButtons = [
            new Button(cx - 100, btnY, 85, 32, 'Delete', () => {
                this.game.saveManager.delete(this.confirmDeleteSlot);
                this.confirmDeleteSlot = null;
                this.confirmButtons = [];
                this.refreshSlots();
            }, { color: '#5a1a1a', hoverColor: '#7a2a2a', fontSize: 14 }),
            new Button(cx + 15, btnY, 85, 32, 'Cancel', () => {
                this.confirmDeleteSlot = null;
                this.confirmButtons = [];
            }, { fontSize: 14 })
        ];
    }

    update(dt) {
        this.animTimer += dt;
    }

    onMouseMove(x, y) {
        if (this.confirmDeleteSlot) {
            for (const btn of this.confirmButtons) btn.handleMouseMove(x, y);
            return;
        }
        if (this.showSlots) {
            for (const btn of this.slotButtons) btn.handleMouseMove(x, y);
            for (const btn of this.deleteButtons) btn.handleMouseMove(x, y);
        } else {
            for (const btn of this.buttons) btn.handleMouseMove(x, y);
        }
    }

    onMouseDown(x, y) {
        Audio.playButtonClick();
        if (this.confirmDeleteSlot) {
            for (const btn of this.confirmButtons) {
                if (btn.handleClick(x, y)) return;
            }
            return;
        }
        if (this.showSlots) {
            for (const btn of this.slotButtons) {
                if (btn.handleClick(x, y)) return;
            }
            for (const btn of this.deleteButtons) {
                if (btn.handleClick(x, y)) return;
            }
        } else {
            for (const btn of this.buttons) {
                if (btn.handleClick(x, y)) return;
            }
        }
    }

    render(renderer) {
        const bg = renderer.bg;
        const ctx = renderer.entity;
        const ui = renderer.ui;

        if (!this.bgDrawn) {
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

                bg.fillStyle = 'rgba(0,0,0,0.45)';
                bg.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

                const vignette = bg.createRadialGradient(
                    CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_WIDTH * 0.25,
                    CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_WIDTH * 0.75
                );
                vignette.addColorStop(0, 'rgba(0,0,0,0)');
                vignette.addColorStop(1, 'rgba(0,0,0,0.6)');
                bg.fillStyle = vignette;
                bg.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            } else {
                const grad = bg.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
                grad.addColorStop(0, '#0a0a1e');
                grad.addColorStop(0.5, '#151530');
                grad.addColorStop(1, '#0a1a0a');
                bg.fillStyle = grad;
                bg.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
                this.bgDrawn = false;
                return;
            }

            this.bgDrawn = true;
        }

        // Animated embers
        const t = this.animTimer;
        for (let i = 0; i < 20; i++) {
            const x = (i * 51 + t * (8 + i * 0.5)) % CANVAS_WIDTH;
            const y = CANVAS_HEIGHT - ((i * 37 + t * (20 + i * 2)) % (CANVAS_HEIGHT + 40));
            const alpha = 0.15 + Math.sin(i + t * 1.5) * 0.1;
            const size = 1.5 + Math.sin(i * 2 + t) * 0.8;
            const glow = ctx.createRadialGradient(x, y, 0, x, y, size * 3);
            glow.addColorStop(0, `rgba(255,180,50,${alpha})`);
            glow.addColorStop(1, `rgba(255,100,20,0)`);
            ctx.fillStyle = glow;
            ctx.fillRect(x - size * 3, y - size * 3, size * 6, size * 6);
            ctx.fillStyle = `rgba(255,200,80,${alpha + 0.1})`;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }

        // UI layer
        const cx2 = CANVAS_WIDTH / 2;

        if (this.showSlots) {
            const panelW = 440;
            const slotGap = 70;
            const panelH = 60 + 3 * slotGap + 16 + 44 + 52 + 32 + 20;
            const totalH = 45 + 15 + panelH;
            const blockTopY = (CANVAS_HEIGHT - totalH) / 2;
            const titleY = blockTopY;
            const panelY = blockTopY + 60;
            const panelX = cx2 - panelW / 2;

            // Title glow
            const glowAlpha = 0.08 + Math.sin(t * 1.5) * 0.04;
            const titleGlow = ui.createRadialGradient(cx2, titleY + 20, 10, cx2, titleY + 20, 200);
            titleGlow.addColorStop(0, `rgba(255,215,0,${glowAlpha})`);
            titleGlow.addColorStop(1, 'rgba(255,215,0,0)');
            ui.fillStyle = titleGlow;
            ui.fillRect(cx2 - 200, titleY - 20, 400, 80);

            SpriteRenderer.drawText(ui, 'TOWER DEFENSE', cx2, titleY, '#ffd700', 40, 'center');

            // Panel
            UIRenderer.drawPanel(ui, panelX, panelY, panelW, panelH, 0.88);
            SpriteRenderer.drawText(ui, 'Select Save Slot', cx2, panelY + 16, '#ddd', 20, 'center');
            UIRenderer.drawSeparator(ui, panelX + 20, panelY + 46, panelW - 40);

            // Render slot buttons with custom content
            for (const btn of this.slotButtons) {
                btn.render(ui);
                // Render custom slot content on top
                if (btn._slotNum) {
                    const info = btn._slotInfo;
                    const bx = btn.x + 14;
                    const by = btn.y;
                    const bh = btn.h;
                    if (info) {
                        SpriteRenderer.drawText(ui, `Slot ${btn._slotNum}`, bx, by + 8, '#ddd', 15);
                        SpriteRenderer.drawTextNoOutline(ui, `Lv.${info.level}`, bx + 80, by + 10, '#ffd700', 12);
                        // Gold
                        UIRenderer.drawGoldIcon(ui, bx, by + 32, 10);
                        SpriteRenderer.drawTextNoOutline(ui, `${info.gold}`, bx + 16, by + 30, '#ffd700', 11);
                        // Maps
                        SpriteRenderer.drawTextNoOutline(ui, `Maps: ${info.mapsCompleted}`, bx + 80, by + 30, '#888', 11);
                    } else {
                        SpriteRenderer.drawText(ui, `Slot ${btn._slotNum}`, bx, by + 10, '#88cc88', 15);
                        SpriteRenderer.drawTextNoOutline(ui, 'New Game', bx, by + 32, '#668866', 12);
                    }
                }
            }
            for (const btn of this.deleteButtons) btn.render(ui);
        } else {
            const blockH = 185;
            const titleY = (CANVAS_HEIGHT - blockH) / 2;

            // Title glow
            const glowAlpha = 0.08 + Math.sin(t * 1.5) * 0.04;
            const titleGlow = ui.createRadialGradient(cx2, titleY + 20, 10, cx2, titleY + 20, 200);
            titleGlow.addColorStop(0, `rgba(255,215,0,${glowAlpha})`);
            titleGlow.addColorStop(1, 'rgba(255,215,0,0)');
            ui.fillStyle = titleGlow;
            ui.fillRect(cx2 - 200, titleY - 40, 400, 140);

            SpriteRenderer.drawText(ui, 'TOWER DEFENSE', cx2, titleY, '#ffd700', 40, 'center');
            SpriteRenderer.drawText(ui, 'HERO  RPG', cx2, titleY + 48, '#ccc', 26, 'center');

            // Decorative line
            UIRenderer.drawSeparator(ui, cx2 - 120, titleY + 82, 240);

            // Tagline
            const alpha = 0.4 + Math.sin(t * 2) * 0.3;
            ui.globalAlpha = alpha;
            SpriteRenderer.drawText(ui, 'Defend.  Fight.  Grow.', cx2, titleY + 96, '#c8b87a', 16, 'center');
            ui.globalAlpha = 1;

            for (const btn of this.buttons) btn.render(ui);
        }

        // Confirm delete dialog
        if (this.confirmDeleteSlot) {
            // Dim overlay
            ui.fillStyle = 'rgba(0,0,0,0.6)';
            ui.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

            // Dialog panel
            const dw = 260, dh = 120;
            const dx = cx2 - dw / 2, dy = CANVAS_HEIGHT / 2 - dh / 2;
            UIRenderer.drawPanel(ui, dx, dy, dw, dh, 0.95);

            SpriteRenderer.drawText(ui, 'Delete Save?', cx2, dy + 18, '#ff8888', 18, 'center');
            SpriteRenderer.drawTextNoOutline(ui, `Slot ${this.confirmDeleteSlot} will be lost forever.`, cx2, dy + 46, '#aaa', 11, 'center');

            for (const btn of this.confirmButtons) btn.render(ui);
        }

        // Version / credits
        SpriteRenderer.drawTextNoOutline(ui, 'Siegebreaker\'s Anthem', 10, CANVAS_HEIGHT - 20, 'rgba(200,180,120,0.25)', 10);
    }
}
