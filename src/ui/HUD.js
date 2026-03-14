import { SpriteRenderer } from '../renderer/SpriteRenderer.js';
import { UIRenderer } from '../renderer/UIRenderer.js';
import { Button } from './Button.js';
import { Tooltip } from './Tooltip.js';
import { CANVAS_WIDTH, CANVAS_HEIGHT, COLORS } from '../utils/Constants.js';
import { SkillSystem } from '../systems/SkillSystem.js';

export class HUD {
    constructor(gameScene) {
        this.scene = gameScene;
        this.tooltip = new Tooltip();
        this.buttons = [];
        this.speedButton = null;
        this.nextWaveButton = null;
        this.pauseButton = null;
        this.gameSpeed = 1;

        this._skillReadyFlash = {}; // { skillId: timer }

        this.initButtons();
    }

    initButtons() {
        this.pauseButton = new Button(CANVAS_WIDTH - 50, 8, 42, 32, 'II', () => {
            this.scene.togglePause();
        }, { fontSize: 16, color: '#3a2a2a', hoverColor: '#5a3a3a' });

        this.speedButton = new Button(CANVAS_WIDTH - 100, 8, 45, 32, 'x1', () => {
            this.gameSpeed = this.gameSpeed === 1 ? 2 : 1;
            this.speedButton.text = `x${this.gameSpeed}`;
            this.scene.setSpeed(this.gameSpeed);
        }, { fontSize: 16, color: '#2a2a3a', hoverColor: '#3a3a5a' });

        this.nextWaveButton = new Button(CANVAS_WIDTH - 200, 8, 92, 32, 'Next Wave', () => {
            this.scene.skipWave();
        }, { fontSize: 14, color: '#2a3a2a', hoverColor: '#3a5a3a' });

        this.buttons = [this.pauseButton, this.speedButton, this.nextWaveButton];
    }

    handleMouseMove(x, y) {
        for (const btn of this.buttons) {
            btn.handleMouseMove(x, y);
        }
        this.tooltip.hide();
        this._checkHoverZones(x, y);
    }

    _checkHoverZones(x, y) {
        if (!this._hoverZones) return;
        for (const z of this._hoverZones) {
            if (x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h) {
                this.tooltip.show(x + 10, z.tipY != null ? z.tipY : y - 14, z.lines);
                return;
            }
        }
    }

    handleClick(x, y) {
        for (const btn of this.buttons) {
            if (btn.handleClick(x, y)) return true;
        }
        if (y < 50) return true;
        return false;
    }

    render(ctx, essence, lives, maxLives, wave, maxWaves, hero, waveTimer, infiniteInfo = null, pet = null) {
        this._hoverZones = [];

        this._renderTopBar(ctx, essence, wave, maxWaves, waveTimer, infiniteInfo);

        if (hero) {
            this.renderHeroBar(ctx, hero);
        }
        if (pet) {
            this.renderPetInfo(ctx, pet);
        }
        this.tooltip.render(ctx);
    }

    _renderTopBar(ctx, essence, wave, maxWaves, waveTimer, infiniteInfo) {
        const barH = 48;

        // Top bar background
        const barGrad = ctx.createLinearGradient(0, 0, 0, barH);
        barGrad.addColorStop(0, 'rgba(8,8,16,0.92)');
        barGrad.addColorStop(1, 'rgba(8,8,16,0.65)');
        ctx.fillStyle = barGrad;
        ctx.fillRect(0, 0, CANVAS_WIDTH, barH);

        // Bottom accent line
        const lineGrad = ctx.createLinearGradient(0, barH - 1, CANVAS_WIDTH, barH - 1);
        lineGrad.addColorStop(0, 'rgba(255,215,0,0)');
        lineGrad.addColorStop(0.2, 'rgba(255,215,0,0.2)');
        lineGrad.addColorStop(0.8, 'rgba(255,215,0,0.2)');
        lineGrad.addColorStop(1, 'rgba(255,215,0,0)');
        ctx.fillStyle = lineGrad;
        ctx.fillRect(0, barH - 1, CANVAS_WIDTH, 1);

        // === ESSENCE (left) ===
        // Essence container
        ctx.fillStyle = 'rgba(40,60,90,0.25)';
        SpriteRenderer._rr(ctx, 8, 6, 100, 34, 8);
        ctx.fill();
        ctx.strokeStyle = 'rgba(100,180,255,0.15)';
        ctx.lineWidth = 1;
        SpriteRenderer._rr(ctx, 8, 6, 100, 34, 8);
        ctx.stroke();
        UIRenderer.drawEssenceIcon(ctx, 16, 12, 20);
        SpriteRenderer.drawText(ctx, `${essence}`, 44, 12, '#66bbff', 22);
        this._hoverZones.push({ x: 8, y: 6, w: 100, h: 34, tipY: 44,
            lines: [{ text: 'Essence', color: '#66bbff', size: 12 }, { text: 'Currency earned during runs', color: '#888', size: 10 }] });

        // === WAVE (center) ===
        const cx = CANVAS_WIDTH / 2;
        const waveText = maxWaves === Infinity ? `Wave ${wave}` : `Wave ${wave}/${maxWaves}`;
        // Wave container
        const waveBgW = 160;
        ctx.fillStyle = 'rgba(255,255,255,0.04)';
        SpriteRenderer._rr(ctx, cx - waveBgW / 2, 4, waveBgW, 38, 10);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,215,0,0.12)';
        ctx.lineWidth = 1;
        SpriteRenderer._rr(ctx, cx - waveBgW / 2, 4, waveBgW, 38, 10);
        ctx.stroke();
        SpriteRenderer.drawText(ctx, waveText, cx, 10, '#eee', 22, 'center');

        // Wave timer (below wave number, inside container)
        if (waveTimer > 0) {
            const timerSec = Math.ceil(waveTimer);
            SpriteRenderer.drawTextNoOutline(ctx, `Next: ${timerSec}s`, cx, 30, '#8a8a8a', 10, 'center');
        }

        // === INFINITE MODE INFO (right of center) ===
        if (infiniteInfo) {
            const ix = cx + waveBgW / 2 + 16;
            const nextCP = Math.ceil(wave / 5) * 5;
            const wavesLeft = nextCP - wave;
            if (wavesLeft > 0) {
                SpriteRenderer.drawTextNoOutline(ctx, `Checkpoint in ${wavesLeft}`, ix, 10, '#88cc88', 11);
            } else {
                SpriteRenderer.drawTextNoOutline(ctx, 'CHECKPOINT!', ix, 10, '#ffd700', 11);
            }
            SpriteRenderer.drawTextNoOutline(ctx, `Banked: ${infiniteInfo.checkpointEssence}  |  +${infiniteInfo.essenceSinceCheckpoint}`, ix, 26, '#777', 10);
        }

        // === BUTTONS (right) ===
        for (const btn of this.buttons) {
            btn.render(ctx);
        }
    }

    renderHeroBar(ctx, hero) {
        const barH = 56;
        const barY = CANVAS_HEIGHT - barH;

        // Bottom bar background
        const barGrad = ctx.createLinearGradient(0, barY, 0, CANVAS_HEIGHT);
        barGrad.addColorStop(0, 'rgba(8,8,16,0.7)');
        barGrad.addColorStop(1, 'rgba(8,8,16,0.92)');
        ctx.fillStyle = barGrad;
        ctx.fillRect(0, barY, CANVAS_WIDTH, barH);

        // Top accent line
        const lineGrad = ctx.createLinearGradient(0, barY, CANVAS_WIDTH, barY);
        lineGrad.addColorStop(0, 'rgba(255,255,255,0)');
        lineGrad.addColorStop(0.2, 'rgba(255,255,255,0.08)');
        lineGrad.addColorStop(0.8, 'rgba(255,255,255,0.08)');
        lineGrad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = lineGrad;
        ctx.fillRect(0, barY, CANVAS_WIDTH, 1);

        if (hero.dead) {
            SpriteRenderer.drawText(ctx, `Hero respawning in ${Math.ceil(hero.respawnTimer)}s...`,
                CANVAS_WIDTH / 2, barY + 16, '#ff6666', 22, 'center');
            return;
        }

        const pd = hero.playerData;
        const tipAbove = barY - 6;
        const THIRD = Math.floor(CANVAS_WIDTH / 3); // 320px per section
        const pad = 8;

        // =============================================
        // TIER 1 — LEFT (0..320): Level + HP + Stats
        // =============================================
        const t1X = pad;
        const t1W = THIRD - pad * 2;

        // Level badge (top-left of tier)
        ctx.fillStyle = 'rgba(200,160,40,0.12)';
        SpriteRenderer._rr(ctx, t1X, barY + 6, 48, 20, 6);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,215,0,0.2)';
        ctx.lineWidth = 1;
        SpriteRenderer._rr(ctx, t1X, barY + 6, 48, 20, 6);
        ctx.stroke();
        SpriteRenderer.drawText(ctx, `Lv.${pd.level}`, t1X + 6, barY + 8, '#ffd700', 14);

        // HP bar (right of level badge, top row)
        const hpBarX = t1X + 56;
        const hpBarY = barY + 8;
        const hpBarW = t1W - 56;
        UIRenderer.drawHealthBar(ctx, hpBarX, hpBarY, hpBarW, 16, hero.hp, hero.maxHp);
        SpriteRenderer.drawTextNoOutline(ctx, `${Math.round(hero.hp)} / ${hero.maxHp}`,
            hpBarX + hpBarW / 2, hpBarY + 3, '#fff', 10, 'center');

        // Stats row (bottom row of tier 1): Damage | Armor | Speed | Regen
        const statY = barY + 32;
        const statColW = Math.floor(t1W / 4);

        UIRenderer.drawStatIcon(ctx, 'sword', t1X, statY + 1, 9, '#ff8844');
        SpriteRenderer.drawText(ctx, `${hero.baseDamage}`, t1X + 13, statY, '#ffaa66', 13);

        UIRenderer.drawStatIcon(ctx, 'shield', t1X + statColW, statY + 1, 9, '#6688cc');
        SpriteRenderer.drawText(ctx, `${hero.armor}`, t1X + statColW + 13, statY, '#88aaee', 13);

        UIRenderer.drawStatIcon(ctx, 'arrow', t1X + statColW * 2, statY + 1, 8, '#66cc66');
        SpriteRenderer.drawText(ctx, `${hero.speed}`, t1X + statColW * 2 + 13, statY, '#88ee88', 13);

        UIRenderer.drawStatIcon(ctx, 'cross', t1X + statColW * 3, statY + 1, 8, '#44dd44');
        SpriteRenderer.drawText(ctx, `${hero.hpRegen.toFixed(1)}`, t1X + statColW * 3 + 13, statY, '#66ee66', 13);

        // Hover zones — Tier 1
        const dmgRed = (hero.armor / (100 + hero.armor) * 100).toFixed(1);
        this._hoverZones.push({ x: t1X, y: barY + 6, w: 48, h: 20, tipY: tipAbove,
            lines: [{ text: `Level ${pd.level}`, color: '#ffd700', size: 12 }] });
        this._hoverZones.push({ x: hpBarX, y: hpBarY - 2, w: hpBarW, h: 20, tipY: tipAbove,
            lines: [{ text: 'Health Points', color: '#44dd44', size: 12 }, { text: `${Math.round(hero.hp)} / ${hero.maxHp}`, color: '#aaa', size: 10 }] });
        this._hoverZones.push({ x: t1X, y: statY - 2, w: statColW, h: 18, tipY: tipAbove,
            lines: [{ text: 'Damage', color: '#ffaa66', size: 12 }, { text: 'Base melee attack damage', color: '#888', size: 10 }] });
        this._hoverZones.push({ x: t1X + statColW, y: statY - 2, w: statColW, h: 18, tipY: tipAbove,
            lines: [{ text: 'Armor', color: '#88aaee', size: 12 }, { text: `Damage reduction: ${dmgRed}%`, color: '#888', size: 10 }] });
        this._hoverZones.push({ x: t1X + statColW * 2, y: statY - 2, w: statColW, h: 18, tipY: tipAbove,
            lines: [{ text: 'Speed', color: '#88ee88', size: 12 }, { text: 'Hero movement speed', color: '#888', size: 10 }] });
        this._hoverZones.push({ x: t1X + statColW * 3, y: statY - 2, w: statColW, h: 18, tipY: tipAbove,
            lines: [{ text: 'HP Regen', color: '#66ee66', size: 12 }, { text: `Restores ${hero.hpRegen.toFixed(1)} HP per second`, color: '#888', size: 10 }] });

        // Separator between tier 1 and tier 2
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect(THIRD, barY + 6, 1, barH - 12);

        // =============================================
        // TIER 2 — CENTER (320..640): Skills
        // =============================================
        const activeSkills = SkillSystem.getLearnedActiveSkills(pd);
        const slotSize = 40;
        const slotGap = 5;
        const totalSkillW = activeSkills.length > 0 ? activeSkills.length * (slotSize + slotGap) - slotGap : 0;
        const t2Center = THIRD + THIRD / 2; // 480
        const skillStartX = Math.round(t2Center - totalSkillW / 2);

        if (activeSkills.length > 0) {
            activeSkills.forEach((skill, i) => {
                    const sx = skillStartX + i * (slotSize + slotGap);
                    const sy = barY + (barH - slotSize) / 2;
                    const cd = hero.skillCooldowns[skill.id] || 0;
                    const ready = cd <= 0;

                    // Slot background
                    const slotGrad = ctx.createLinearGradient(sx, sy, sx, sy + slotSize);
                    if (ready) {
                        slotGrad.addColorStop(0, '#252545');
                        slotGrad.addColorStop(1, '#18182e');
                    } else {
                        slotGrad.addColorStop(0, '#151520');
                        slotGrad.addColorStop(1, '#0a0a12');
                    }
                    ctx.fillStyle = slotGrad;
                    SpriteRenderer._rr(ctx, sx, sy, slotSize, slotSize, 6);
                    ctx.fill();

                    // Border
                    ctx.strokeStyle = ready ? '#6666cc' : '#2a2a3a';
                    ctx.lineWidth = ready ? 2 : 1;
                    SpriteRenderer._rr(ctx, sx, sy, slotSize, slotSize, 6);
                    ctx.stroke();

                    // Ready flash effect
                    if (ready) {
                        const flashTimer = this._skillReadyFlash[skill.id] || 0;
                        if (flashTimer > 0) {
                            const flashAlpha = flashTimer / 0.5;
                            ctx.strokeStyle = `rgba(120,160,255,${flashAlpha * 0.7})`;
                            ctx.lineWidth = 3;
                            SpriteRenderer._rr(ctx, sx - 1, sy - 1, slotSize + 2, slotSize + 2, 7);
                            ctx.stroke();
                        }
                    }

                    // Ready glow
                    if (ready) {
                        ctx.fillStyle = 'rgba(100,100,200,0.08)';
                        ctx.save();
                        SpriteRenderer._rr(ctx, sx, sy, slotSize, slotSize, 6);
                        ctx.clip();
                        ctx.fillRect(sx, sy, slotSize, slotSize * 0.4);
                        ctx.restore();
                    }

                    // Skill icon (geometric)
                    UIRenderer.drawSkillIcon(ctx, skill.id, sx + slotSize / 2, sy + slotSize / 2, slotSize, ready ? 1 : 0.3);

                    // Key hint (top-left corner)
                    SpriteRenderer.drawTextNoOutline(ctx, skill.key, sx + 3, sy + 1, '#777', 9);

                    // Cooldown overlay - circular sweep
                    if (!ready) {
                        const pct = cd / skill.cooldown[skill.level - 1];
                        const centerX = sx + slotSize / 2;
                        const centerY = sy + slotSize / 2;
                        const radius = slotSize / 2;

                        ctx.save();
                        SpriteRenderer._rr(ctx, sx, sy, slotSize, slotSize, 6);
                        ctx.clip();

                        ctx.beginPath();
                        ctx.moveTo(centerX, centerY);
                        const startAngle = -Math.PI / 2;
                        const endAngle = startAngle + Math.PI * 2 * pct;
                        ctx.arc(centerX, centerY, radius + 2, startAngle, endAngle);
                        ctx.closePath();
                        ctx.fillStyle = 'rgba(0,0,0,0.55)';
                        ctx.fill();

                        // Bright edge line
                        ctx.beginPath();
                        ctx.moveTo(centerX, centerY);
                        ctx.lineTo(
                            centerX + Math.cos(endAngle) * radius,
                            centerY + Math.sin(endAngle) * radius
                        );
                        ctx.strokeStyle = 'rgba(100,140,255,0.5)';
                        ctx.lineWidth = 1.5;
                        ctx.stroke();

                        ctx.restore();

                        // Cooldown number
                        SpriteRenderer.drawText(ctx, `${Math.ceil(cd)}`, centerX, sy + 24, '#ff8888', 12, 'center');
                    }

                    // Skill hover zone
                    const cdText = ready ? 'Ready' : `Cooldown: ${Math.ceil(cd)}s`;
                    this._hoverZones.push({ x: sx, y: sy, w: slotSize, h: slotSize, tipY: tipAbove,
                        lines: [
                            { text: `${skill.name} [${skill.key}]`, color: '#ddd', size: 12 },
                            { text: skill.description, color: '#888', size: 10 },
                            { text: cdText, color: ready ? '#88ff88' : '#ff8888', size: 10 }
                        ] });
                });
        } else {
            // No skills — show hint
            SpriteRenderer.drawTextNoOutline(ctx, 'No skills learned', t2Center, barY + barH / 2 - 5, '#333', 11, 'center');
        }

        // Separator between tier 2 and tier 3
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect(THIRD * 2, barY + 6, 1, barH - 12);

        // =============================================
        // TIER 3 — RIGHT (640..960): Equipment
        // =============================================
        const wpn = pd.equipment.weapon;
        const arm = pd.equipment.armor;
        const acc = pd.equipment.accessory;
        const eqSlotSize = 40;
        const eqSlotGap = 8;
        const eqItems = [
            { item: wpn, icon: 'sword', color: '#8a6633', textColor: '#cc9966', label: 'Weapon' },
            { item: arm, icon: 'shield', color: '#446688', textColor: '#6688aa', label: 'Armor' },
            { item: acc, icon: null, color: '#7755aa', textColor: '#aa88cc', label: 'Accessory' },
        ];
        const totalEqW = eqItems.length * (eqSlotSize + eqSlotGap) - eqSlotGap;
        const t3Center = THIRD * 2 + THIRD / 2; // 800
        const eqStartX = Math.round(t3Center - totalEqW / 2);

        eqItems.forEach((eq, i) => {
            const ex = eqStartX + i * (eqSlotSize + eqSlotGap);
            const ey = barY + (barH - eqSlotSize) / 2;

            // Slot background
            ctx.fillStyle = eq.item ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)';
            SpriteRenderer._rr(ctx, ex, ey, eqSlotSize, eqSlotSize, 6);
            ctx.fill();
            ctx.strokeStyle = eq.item ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)';
            ctx.lineWidth = 1;
            SpriteRenderer._rr(ctx, ex, ey, eqSlotSize, eqSlotSize, 6);
            ctx.stroke();

            if (eq.item) {
                if (eq.icon) {
                    UIRenderer.drawStatIcon(ctx, eq.icon, ex + (eqSlotSize - 16) / 2, ey + 5, 16, eq.color);
                } else {
                    // Accessory gem
                    ctx.fillStyle = eq.color;
                    ctx.beginPath();
                    ctx.arc(ex + eqSlotSize / 2, ey + 14, 7, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = 'rgba(255,255,255,0.3)';
                    ctx.beginPath();
                    ctx.arc(ex + eqSlotSize / 2 - 2, ey + 12, 3, 0, Math.PI * 2);
                    ctx.fill();
                }
                // Name below icon
                const shortName = eq.item.name.length > 6 ? eq.item.name.substring(0, 6) : eq.item.name;
                SpriteRenderer.drawTextNoOutline(ctx, shortName, ex + eqSlotSize / 2, ey + eqSlotSize - 7, eq.textColor, 9, 'center');

                this._hoverZones.push({ x: ex, y: ey, w: eqSlotSize, h: eqSlotSize, tipY: tipAbove,
                    lines: [
                        { text: eq.item.name, color: eq.textColor, size: 12 },
                        { text: eq.item.description || eq.label, color: '#888', size: 10 }
                    ] });
            } else {
                // Empty slot
                SpriteRenderer.drawTextNoOutline(ctx, eq.label, ex + eqSlotSize / 2, ey + eqSlotSize / 2 - 4, '#2a2a2a', 9, 'center');
            }
        });
    }

    updateSkillFlash(dt, hero) {
        const pd = hero.playerData;
        const activeSkills = SkillSystem.getLearnedActiveSkills(pd);
        for (const skill of activeSkills) {
            const cd = hero.skillCooldowns[skill.id] || 0;
            const wasOnCooldown = this._prevSkillCooldowns?.[skill.id] > 0;
            if (wasOnCooldown && cd <= 0) {
                this._skillReadyFlash[skill.id] = 0.5;
            }
            // Decay flash
            if (this._skillReadyFlash[skill.id] > 0) {
                this._skillReadyFlash[skill.id] -= dt;
            }
        }
        if (!this._prevSkillCooldowns) this._prevSkillCooldowns = {};
        for (const skill of activeSkills) {
            this._prevSkillCooldowns[skill.id] = hero.skillCooldowns[skill.id] || 0;
        }
    }

    renderPetInfo(ctx, pet) {
        const x = CANVAS_WIDTH - 170 - 130;
        const y = CANVAS_HEIGHT - 56 - 50;

        // Small bg
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        SpriteRenderer._rr(ctx, x - 4, y + 2, 164, 44, 6);
        ctx.fill();

        const color = pet.data.color;
        SpriteRenderer.drawTextNoOutline(ctx, pet.data.name, x, y + 8, color, 11);
        SpriteRenderer.drawTextNoOutline(ctx, `Lv.${pet.level}`, x + 75, y + 8, '#ffd700', 10);

        if (pet.frenzyActive) {
            SpriteRenderer.drawTextNoOutline(ctx, 'FRENZY', x + 110, y + 8, '#ff4400', 9);
        }

        UIRenderer.drawHealthBar(ctx, x, y + 24, 80, 6, pet.hp, pet.maxHp);
        SpriteRenderer.drawTextNoOutline(ctx, `${Math.round(pet.hp)}/${pet.maxHp}`, x + 40, y + 34, '#888', 8, 'center');
    }

}
