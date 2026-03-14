import { Entity } from './Entity.js';
import { EnemyData } from '../data/EnemyData.js';
import { ElementColors } from '../data/TowerData.js';
import { SpriteRenderer } from '../renderer/SpriteRenderer.js';
import { UIRenderer } from '../renderer/UIRenderer.js';
import { TILE_SIZE } from '../utils/Constants.js';
import { distance } from '../utils/MathUtils.js';

export class Enemy extends Entity {
    constructor(type, path, scaling = null) {
        const data = EnemyData[type];
        const size = TILE_SIZE * (data.size || 1);
        // Hitbox larger than visual for easier clicking
        super(path[0].x, path[0].y, size * 1.5, size * 1.5);

        this.type = type;
        this.data = data;
        this.path = path;
        this.pathIndex = 0;

        // Stats (with optional scaling)
        const hpMult = scaling ? scaling.hpMult || 1 : 1;
        const speedMult = scaling ? scaling.speedMult || 1 : 1;
        const armorMult = scaling ? scaling.armorMult || 1 : 1;
        const dmgMult = scaling ? scaling.dmgMult || 1 : 1;

        this.maxHp = Math.round(data.hp * hpMult);
        this.hp = this.maxHp;
        this.speed = data.speed * speedMult;
        this.baseSpeed = this.speed;
        this.armor = Math.round(data.armor * armorMult);
        this.damage = Math.round(data.damage * dmgMult);
        this.gold = Math.round(data.gold * (scaling ? scaling.goldMult || 1 : 1));
        this.xp = data.xp;
        this.boss = data.boss || false;

        // Status effects
        this.slowTimer = 0;
        this.slowAmount = 0;
        this.burnTimer = 0;
        this.burnDps = 0;
        this.poisonTimer = 0;
        this.poisonDps = 0;

        // Ability
        this.ability = data.ability || null;
        this.abilityTimer = 0;
        this.abilityCooldown = data.abilityCooldown || 3;

        // Hero melee attack (attack hero in passing without stopping)
        this.heroAttackRange = TILE_SIZE * 1.2;
        this.heroAttackCooldown = 1.5;
        this.heroAttackTimer = 0;

        this.reached = false;
        this.attackingCastle = false;
        this.castleAttackTimer = 0;
        this.castleAttackCooldown = 1.0; // attack castle once per second
        this.castleDamageReady = false;

        // Demolisher: tower attacking behavior
        this.isDemolisher = data.demolisher || false;
        this.towerTarget = null;
        this.towerAttackDamage = data.towerAttackDamage || 0;
        this.towerAttackCooldown = data.towerAttackCooldown || 1.5;
        this.towerAttackTimer = 0;
        this.towerDetectRange = data.towerDetectRange || 80;
        this.attackingTower = false;
        this._returnPoint = null; // path point to return to after destroying tower

        // Animation setup
        this.state = 'walk';
        this.animSpeed = 5;
        this.animFrames = 4;

        // Hit flash
        this.hitFlashTimer = 0;

        // Death animation
        this.dying = false;
        this.deathTimer = 0;
        this.deathDuration = 0.35;
    }

    update(dt, hero = null) {
        if (!this.active && !this.dying) return;

        // Death animation
        if (this.dying) {
            this.deathTimer += dt;
            if (this.deathTimer >= this.deathDuration) {
                this.dying = false;
            }
            return;
        }

        // Hit flash countdown
        if (this.hitFlashTimer > 0) {
            this.hitFlashTimer -= dt;
        }

        // Parent animation update (animTimer, animFrame, sortY)
        super.update(dt);

        // Handle slow
        if (this.slowTimer > 0) {
            this.slowTimer -= dt;
            this.speed = this.baseSpeed * (1 - this.slowAmount);
        } else {
            this.speed = this.baseSpeed;
        }

        // Burn DoT (fire damage)
        if (this.burnTimer > 0) {
            this.burnTimer -= dt;
            this.hp -= this.burnDps * dt;
            if (this.hp <= 0 && this.active) {
                this.hp = 0;
                this.active = false;
                this.dying = true;
                this.deathTimer = 0;
            }
        }

        // Poison DoT (magic damage)
        if (this.poisonTimer > 0) {
            this.poisonTimer -= dt;
            this.hp -= this.poisonDps * dt;
            if (this.hp <= 0 && this.active) {
                this.hp = 0;
                this.active = false;
                this.dying = true;
                this.deathTimer = 0;
            }
        }

        // Demolisher: attack nearby tower
        if (this.attackingTower && this.towerTarget) {
            if (this.towerTarget.destroyed) {
                // Tower destroyed — return to path
                this.attackingTower = false;
                this.towerTarget = null;
            } else {
                const tdx = this.towerTarget.x - this.x;
                const tdy = this.towerTarget.y - this.y;
                const tdist = Math.sqrt(tdx * tdx + tdy * tdy);
                if (tdist > TILE_SIZE * 0.8) {
                    // Move toward tower
                    this.x += (tdx / tdist) * this.speed * dt;
                    this.y += (tdy / tdist) * this.speed * dt;
                } else {
                    // In range — attack
                    this.state = 'attack';
                    this.towerAttackTimer -= dt;
                    if (this.towerAttackTimer <= 0) {
                        this.towerTarget.takeDamage(this.towerAttackDamage);
                        this.towerAttackTimer = this.towerAttackCooldown;
                    }
                }
                return; // don't follow path while attacking tower
            }
        }

        // Move along path (always keep moving, never stop for hero)
        if (!this.attackingCastle && this.pathIndex < this.path.length) {
            const target = this.path[this.pathIndex];
            const dx = target.x - this.x;
            const dy = target.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 2) {
                this.pathIndex++;
                if (this.pathIndex >= this.path.length) {
                    this.reached = true;
                    this.attackingCastle = true;
                    this.state = 'attack';
                }
            } else {
                this.x += (dx / dist) * this.speed * dt;
                this.y += (dy / dist) * this.speed * dt;
                this.state = 'walk';
            }

            // Check if entered castle diamond hitbox — stop and attack
            if (this.castleHitbox && !this.attackingCastle) {
                const h = this.castleHitbox;
                const cdx = this.x - h.cx;
                const cdy = this.y - h.cy;
                const d = Math.abs(cdx) / h.hw + Math.abs(cdy) / h.hh;
                if (d < 1) {
                    // Push back to diamond edge
                    const cd = Math.sqrt(cdx * cdx + cdy * cdy);
                    if (cd > 0) {
                        const nx = cdx / cd;
                        const ny = cdy / cd;
                        const t = 1 / (Math.abs(nx) / h.hw + Math.abs(ny) / h.hh);
                        this.x = h.cx + nx * t;
                        this.y = h.cy + ny * t;
                    }
                    this.reached = true;
                    this.attackingCastle = true;
                    this.state = 'attack';
                }
            }
        }

        // Attack hero in passing (no path deviation)
        if (hero && !hero.dead && this.heroAttackTimer <= 0) {
            const d = distance(this.x, this.y, hero.x, hero.y);
            if (d <= this.heroAttackRange) {
                hero.takeDamage(this.damage);
                this.heroAttackTimer = this.heroAttackCooldown;
            }
        }
        if (this.heroAttackTimer > 0) {
            this.heroAttackTimer -= dt;
        }

        // Castle attack timer
        if (this.attackingCastle) {
            this.castleAttackTimer -= dt;
            if (this.castleAttackTimer <= 0) {
                this.castleAttackTimer = this.castleAttackCooldown;
                this.castleDamageReady = true; // signal to GameScene
            }
        }

        // Ability timer
        if (this.ability) {
            this.abilityTimer -= dt;
        }
    }

    render(ctx, camX = 0, camY = 0) {
        if (!this.active && !this.dying) return;

        const sx = this.x - camX;
        const sy = this.y - camY;
        const visualSize = TILE_SIZE * (this.data.size || 1);

        // Slow indicator (under enemy)
        if (this.slowTimer > 0) {
            ctx.globalAlpha = 0.25;
            SpriteRenderer.drawCircle(ctx, sx, sy, visualSize * 0.6, '#6688ff');
            ctx.globalAlpha = 1;
        }

        // Burn indicator (orange flicker)
        if (this.burnTimer > 0) {
            ctx.globalAlpha = 0.2 + Math.sin(Date.now() * 0.015) * 0.1;
            SpriteRenderer.drawCircle(ctx, sx, sy, visualSize * 0.5, '#ff6600');
            ctx.globalAlpha = 1;
        }

        // Poison indicator (green tint)
        if (this.poisonTimer > 0) {
            ctx.globalAlpha = 0.2 + Math.sin(Date.now() * 0.01) * 0.08;
            SpriteRenderer.drawCircle(ctx, sx, sy, visualSize * 0.5, '#44dd44');
            ctx.globalAlpha = 1;
        }

        // Shadow
        const shadowRx = this.boss ? 18 : 10;
        const shadowRy = this.boss ? 7 : 4;

        // Death animation: shrink + fade + rise
        if (this.dying) {
            const t = this.deathTimer / this.deathDuration;
            const alpha = 1 - t;
            const scale = 1 - t * 0.6;
            const riseY = -t * 12;
            ctx.save();
            ctx.globalAlpha = alpha;
            SpriteRenderer.drawShadow(ctx, sx, sy + 8, shadowRx * scale, shadowRy * scale);
            ctx.translate(sx, sy + riseY);
            ctx.scale(scale, scale);
            ctx.translate(-sx, -(sy + riseY));
            SpriteRenderer.drawEnemy(ctx, sx, sy + riseY, this.type, 0, 'walk', this.animFrame);
            ctx.restore();
            return;
        }

        SpriteRenderer.drawShadow(ctx, sx, sy + 8, shadowRx, shadowRy);

        // Squash & stretch while walking
        const isWalking = this.state === 'walk' && !this.attackingCastle;
        if (isWalking) {
            const t = Date.now() * 0.006;
            const squashX = 1 + Math.sin(t) * 0.06;
            const squashY = 1 - Math.sin(t) * 0.06;
            ctx.save();
            ctx.translate(sx, sy);
            ctx.scale(squashX, squashY);
            ctx.translate(-sx, -sy);
        }

        // Hit flash: brief white tint using filter
        if (this.hitFlashTimer > 0) {
            const intensity = Math.min(this.hitFlashTimer / 0.06, 1);
            const bright = 1 + intensity * 3;
            ctx.save();
            ctx.filter = `brightness(${bright})`;
            SpriteRenderer.drawEnemy(ctx, sx, sy, this.type, this.hp / this.maxHp, this.state, this.animFrame);
            ctx.restore();
        } else {
            SpriteRenderer.drawEnemy(ctx, sx, sy, this.type, this.hp / this.maxHp, this.state, this.animFrame);
        }

        if (isWalking) {
            ctx.restore();
        }

        // Health bar (always show, bigger for bosses)
        const barW = this.boss ? visualSize * 1.2 : visualSize * 0.9;
        const barH = this.boss ? 6 : 4;
        const barY = sy - visualSize / 2 - (this.boss ? 18 : 10);
        UIRenderer.drawHealthBar(ctx, sx - barW / 2, barY, barW, barH, this.hp, this.maxHp);

        // Boss indicator
        if (this.boss) {
            SpriteRenderer.drawText(ctx, 'BOSS', sx, barY - 16, '#ffd700', 12, 'center');
        }

        // Resistance/weakness icons under health bar
        if (this.data.resistances) {
            const res = this.data.resistances;
            const entries = Object.entries(res);
            const iconY = barY + barH + 3;
            const totalW = entries.length * 9;
            let ix = sx - totalW / 2;
            for (const [elem, mult] of entries) {
                const col = ElementColors[elem] || '#fff';
                ctx.fillStyle = col;
                ctx.globalAlpha = 0.9;
                if (mult > 1) {
                    // Weakness: down arrow (enemy takes more)
                    ctx.beginPath();
                    ctx.moveTo(ix, iconY);
                    ctx.lineTo(ix + 4, iconY + 5);
                    ctx.lineTo(ix - 4, iconY + 5);
                    ctx.closePath();
                    ctx.fill();
                } else {
                    // Resistance: shield shape
                    ctx.beginPath();
                    ctx.moveTo(ix, iconY);
                    ctx.lineTo(ix + 4, iconY + 1);
                    ctx.lineTo(ix + 3, iconY + 5);
                    ctx.lineTo(ix, iconY + 7);
                    ctx.lineTo(ix - 3, iconY + 5);
                    ctx.lineTo(ix - 4, iconY + 1);
                    ctx.closePath();
                    ctx.fill();
                }
                ctx.globalAlpha = 1;
                ix += 9;
            }
        }
    }

    takeDamage(amount, ignoreArmor = false, element = null) {
        // Apply elemental resistance/weakness multiplier
        let elemMult = 1;
        if (element && this.data.resistances) {
            elemMult = this.data.resistances[element] ?? 1;
        }
        const afterElem = amount * elemMult;
        const effective = ignoreArmor ? afterElem : afterElem * (100 / (100 + this.armor));
        this.hp -= effective;
        this.hitFlashTimer = 0.12;
        this.lastElementHit = element;
        this.lastElemMult = elemMult;
        if (this.hp <= 0) {
            this.hp = 0;
            this.active = false;
            this.dying = true;
            this.deathTimer = 0;
        }
        return effective;
    }

    applySlow(amount, duration) {
        if (amount > this.slowAmount || this.slowTimer <= 0) {
            this.slowAmount = amount;
            this.slowTimer = duration;
        }
    }

    applyBurn(dps, duration) {
        if (dps > this.burnDps || this.burnTimer <= 0) {
            this.burnDps = dps;
            this.burnTimer = duration;
        }
    }

    applyPoison(dps, duration) {
        if (dps > this.poisonDps || this.poisonTimer <= 0) {
            this.poisonDps = dps;
            this.poisonTimer = duration;
        }
    }

    canUseAbility() {
        return this.ability && this.abilityTimer <= 0;
    }

    useAbility() {
        this.abilityTimer = this.abilityCooldown;
    }
}
