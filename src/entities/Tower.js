import { Entity } from './Entity.js';
import { TowerData } from '../data/TowerData.js';
import { SpriteRenderer } from '../renderer/SpriteRenderer.js';
import { TILE_SIZE } from '../utils/Constants.js';
import { distance } from '../utils/MathUtils.js';

export class Tower extends Entity {
    constructor(type, col, row) {
        super(col * TILE_SIZE + TILE_SIZE / 2, row * TILE_SIZE + TILE_SIZE / 2, TILE_SIZE, TILE_SIZE);
        this.type = type;
        this.col = col;
        this.row = row;
        this.level = 1;
        this.data = TowerData[type];

        this.cooldownTimer = 0;
        this.target = null;
        this.totalCost = this.data.cost;

        // Buff modifiers
        this.damageMult = 1;
        this.rangeMult = 1;

        // Shoot recoil animation
        this.recoilTimer = 0;
        this.recoilDuration = 0.15;

        // Muzzle flash
        this.muzzleFlashTimer = 0;
        this.muzzleFlashDuration = 0.12;

        // Individual stat upgrades (0-3 each)
        this.rangeUpgrades = 0;
        this.damageUpgrades = 0;
        this.speedUpgrades = 0;

        // Tower HP (for demolisher attacks)
        this.maxHp = 100 + (this.data.cost / 10) * 10; // tankier towers = more HP
        this.hp = this.maxHp;
        this.destroyed = false;
        this.hitFlashTimer = 0;

        // Research bonuses (set by GameScene each frame)
        this.speedResearchBonus = 0;
        this.splashResearchBonus = 0;
        this.slowResearchBonus = 0;
        this.chainResearchBonus = 0;
    }

    get damage() {
        const base = this.data.damage[this.level - 1] * this.damageMult;
        return base * (1 + this.damageUpgrades * 0.15);
    }
    get range() {
        const base = this.data.range[this.level - 1] * this.rangeMult;
        return base * (1 + this.rangeUpgrades * 0.10);
    }
    get cooldown() {
        const base = this.data.cooldown[this.level - 1];
        return base * (1 - this.speedUpgrades * 0.10) * (1 - this.speedResearchBonus);
    }
    get sellValue() { return Math.floor(this.totalCost * 0.6); }

    getStatUpgradeCost(stat) {
        const current = this[stat + 'Upgrades'];
        if (current >= 3) return null;
        return Math.floor(this.data.cost * 0.5 * (current + 1));
    }

    upgradeStat(stat) {
        if (this[stat + 'Upgrades'] >= 3) return null;
        const cost = this.getStatUpgradeCost(stat);
        this[stat + 'Upgrades']++;
        this.totalCost += cost;
        return cost;
    }

    getUpgradeCost() {
        if (this.level >= 4) return null;
        return Math.floor(this.data.cost * Math.pow(2.3, this.level));
    }

    upgrade() {
        if (this.level >= 4) return false;
        const cost = this.getUpgradeCost();
        this.level++;
        this.totalCost += cost;
        return cost;
    }

    findTarget(enemies) {
        const inRange = enemies.filter(e =>
            e.active && distance(this.x, this.y, e.x, e.y) <= this.range
        );

        if (inRange.length === 0) {
            this.target = null;
            return null;
        }

        switch (this.data.targetMode) {
            case 'first':
                this.target = inRange.reduce((best, e) =>
                    e.pathIndex > best.pathIndex ? e : best, inRange[0]);
                break;
            case 'closest':
                this.target = inRange.reduce((best, e) =>
                    distance(this.x, this.y, e.x, e.y) < distance(this.x, this.y, best.x, best.y) ? e : best, inRange[0]);
                break;
            case 'strongest':
                this.target = inRange.reduce((best, e) =>
                    e.hp > best.hp ? e : best, inRange[0]);
                break;
            default:
                this.target = inRange[0];
        }

        return this.target;
    }

    update(dt) {
        if (this.destroyed) return;
        if (this.cooldownTimer > 0) {
            this.cooldownTimer -= dt;
        }
        if (this.recoilTimer > 0) {
            this.recoilTimer -= dt;
        }
        if (this.muzzleFlashTimer > 0) {
            this.muzzleFlashTimer -= dt;
        }
        if (this.hitFlashTimer > 0) {
            this.hitFlashTimer -= dt;
        }
    }

    takeDamage(amount) {
        if (this.destroyed) return;
        this.hp -= amount;
        this.hitFlashTimer = 0.15;
        if (this.hp <= 0) {
            this.hp = 0;
            this.destroyed = true;
        }
    }

    canShoot() {
        return !this.destroyed && this.cooldownTimer <= 0 && this.target && this.target.active;
    }

    shoot() {
        this.cooldownTimer = this.cooldown;
        this.recoilTimer = this.recoilDuration;
        this.muzzleFlashTimer = this.muzzleFlashDuration;
        this._muzzleAngle = this.target ? Math.atan2(this.target.y - this.y, this.target.x - this.x) : 0;
        return {
            type: this.type,
            element: this.data.element || 'physical',
            startX: this.x,
            startY: this.y,
            target: this.target,
            damage: this.damage,
            speed: this.data.projectileSpeed,
            color: this.data.projectileColor,
            ignoreArmor: this.data.ignoreArmor || false,
            splash: this.data.splash ? Math.round(this.data.splash[this.level - 1] * (1 + this.splashResearchBonus)) : 0,
            splashDamagePct: this.data.splashDamagePct || 0,
            slowAmount: this.data.slowAmount ? this.data.slowAmount[this.level - 1] * (1 + this.slowResearchBonus) : 0,
            slowDuration: this.data.slowDuration ? this.data.slowDuration[this.level - 1] : 0,
            chainTargets: this.data.chainTargets ? this.data.chainTargets[this.level - 1] + Math.floor(this.chainResearchBonus) : 0,
            chainRange: this.data.chainRange ? this.data.chainRange[this.level - 1] : 0
        };
    }

    render(ctx, camX = 0, camY = 0, selected = false) {
        const sx = this.col * TILE_SIZE - camX;
        const sy = this.row * TILE_SIZE - camY;

        // Destroyed tower: rubble
        if (this.destroyed) {
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = '#555';
            ctx.fillRect(sx + 4, sy + TILE_SIZE - 10, TILE_SIZE - 8, 8);
            ctx.fillStyle = '#444';
            ctx.fillRect(sx + 8, sy + TILE_SIZE - 14, 6, 6);
            ctx.fillRect(sx + TILE_SIZE - 16, sy + TILE_SIZE - 12, 5, 5);
            ctx.globalAlpha = 1;
            return;
        }

        if (selected) {
            // Draw range circle
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(sx + TILE_SIZE / 2, sy + TILE_SIZE / 2, this.range, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Recoil: scale bounce when shooting
        if (this.recoilTimer > 0) {
            const t = this.recoilTimer / this.recoilDuration;
            const scaleX = 1 + t * 0.12;
            const scaleY = 1 - t * 0.08;
            const cx = sx + TILE_SIZE / 2;
            const cy = sy + TILE_SIZE;
            ctx.save();
            ctx.translate(cx, cy);
            ctx.scale(scaleX, scaleY);
            ctx.translate(-cx, -cy);
            SpriteRenderer.drawTower(ctx, sx, sy, this.type, this.level);
            ctx.restore();
        } else {
            SpriteRenderer.drawTower(ctx, sx, sy, this.type, this.level);
        }

        // Muzzle flash effect
        if (this.muzzleFlashTimer > 0) {
            const t = this.muzzleFlashTimer / this.muzzleFlashDuration;
            const cx = sx + TILE_SIZE / 2;
            const cy = sy + TILE_SIZE * 0.3;
            const flashDist = TILE_SIZE * 0.5;
            const fx = cx + Math.cos(this._muzzleAngle) * flashDist;
            const fy = cy + Math.sin(this._muzzleAngle) * flashDist;
            const flashR = 4 + t * 4;

            let flashColor1, flashColor2;
            switch (this.type) {
                case 'archer':
                    flashColor1 = 'rgba(255, 240, 180, ' + (t * 0.5) + ')';
                    flashColor2 = 'rgba(200, 160, 80, 0)';
                    break;
                case 'mage':
                    flashColor1 = 'rgba(180, 120, 255, ' + (t * 0.6) + ')';
                    flashColor2 = 'rgba(120, 60, 200, 0)';
                    break;
                case 'cannon':
                    flashColor1 = 'rgba(255, 180, 60, ' + (t * 0.7) + ')';
                    flashColor2 = 'rgba(255, 100, 20, 0)';
                    break;
                case 'frost':
                    flashColor1 = 'rgba(150, 220, 255, ' + (t * 0.5) + ')';
                    flashColor2 = 'rgba(100, 180, 255, 0)';
                    break;
                case 'tesla':
                    flashColor1 = 'rgba(255, 255, 150, ' + (t * 0.7) + ')';
                    flashColor2 = 'rgba(255, 220, 50, 0)';
                    break;
                default:
                    flashColor1 = 'rgba(255, 255, 255, ' + (t * 0.4) + ')';
                    flashColor2 = 'rgba(255, 255, 255, 0)';
            }

            const grad = ctx.createRadialGradient(fx, fy, 0, fx, fy, flashR);
            grad.addColorStop(0, flashColor1);
            grad.addColorStop(1, flashColor2);
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(fx, fy, flashR, 0, Math.PI * 2);
            ctx.fill();
        }

        // Hit flash overlay
        if (this.hitFlashTimer > 0) {
            const a = Math.min(this.hitFlashTimer / 0.08, 1) * 0.4;
            ctx.fillStyle = `rgba(255, 80, 40, ${a})`;
            ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
        }

        // Tower HP bar (only show when damaged)
        if (this.hp < this.maxHp) {
            const barW = TILE_SIZE - 4;
            const barH = 3;
            const barX = sx + 2;
            const barY = sy - 4;
            const pct = this.hp / this.maxHp;
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(barX, barY, barW, barH);
            ctx.fillStyle = pct > 0.5 ? '#4a4' : pct > 0.25 ? '#aa4' : '#a44';
            ctx.fillRect(barX, barY, barW * pct, barH);
        }
    }
}
