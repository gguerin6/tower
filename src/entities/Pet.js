import { Entity } from './Entity.js';
import { SpriteRenderer } from '../renderer/SpriteRenderer.js';
import { UIRenderer } from '../renderer/UIRenderer.js';
import { PetData } from '../data/PetData.js';
import { TILE_SIZE } from '../utils/Constants.js';
import { distance } from '../utils/MathUtils.js';
import { EventBus } from '../utils/EventBus.js';

export class Pet extends Entity {
    constructor(hero, petId, level) {
        super(hero.x + 20, hero.y + 15, 20, 20);
        this.hero = hero;
        this.petId = petId;
        this.level = level;
        this.data = PetData[petId];

        this.recalcStats();

        this.hp = this.maxHp;
        this.attackTarget = null;
        this.attackCooldown = 0;
        this.facing = 1;
        this.attackRange = this.data.baseStats.attackRange;
        this.attackAnimTimer = 0;

        // Follow offset (orbit around hero)
        this.followAngle = 0;
        this.followDist = 30;
        this.orbitSpeed = 1.5;

        // Ability tracking
        this.attackCount = 0;
        this.frenzyTimer = 0;
        this.frenzyActive = false;

        // Projectile for ranged pets
        this.projectiles = [];
    }

    recalcStats() {
        const base = this.data.baseStats;
        const bonuses = this.data.levelBonuses;
        const lvlIdx = Math.min(this.level - 1, 4);

        this.damage = base.damage + (bonuses.damage[lvlIdx] || 0);
        this.attackSpeed = base.attackSpeed + (bonuses.attackSpeed[lvlIdx] || 0);
        this.speed = base.speed;
        this.maxHp = base.hp + (bonuses.hp[lvlIdx] || 0);
        this.attackRange = base.attackRange;
    }

    hasAbility() {
        return this.level >= this.data.ability.unlockLevel;
    }

    update(dt, enemies) {
        super.update(dt);

        if (!this.hero || this.hero.dead) {
            // Follow hero position even when dead (stay near)
            this._followHero(dt);
            return;
        }

        // Frenzy timer (wolf ability)
        if (this.frenzyActive) {
            this.frenzyTimer -= dt;
            if (this.frenzyTimer <= 0) {
                this.frenzyActive = false;
            }
        }

        // Phoenix healing aura
        if (this.petId === 'phoenix' && this.hasAbility()) {
            const healRate = this.data.healPerSec[this.level - 1] || 0;
            if (healRate > 0 && this.hero.hp < this.hero.maxHp) {
                this.hero.hp = Math.min(this.hero.maxHp, this.hero.hp + healRate * dt);
            }
        }

        // Attack cooldown
        if (this.attackCooldown > 0) {
            this.attackCooldown -= dt;
        }

        // Attack animation
        if (this.attackAnimTimer > 0) {
            this.attackAnimTimer -= dt;
        }

        // Find target
        if ((!this.attackTarget || !this.attackTarget.active) && enemies) {
            this.attackTarget = null;
            let nearest = null;
            let nearDist = this.attackRange + 30;
            for (const enemy of enemies) {
                if (!enemy.active) continue;
                const d = distance(this.x, this.y, enemy.x, enemy.y);
                if (d < nearDist) {
                    nearDist = d;
                    nearest = enemy;
                }
            }
            this.attackTarget = nearest;
        }

        // Attack or follow
        if (this.attackTarget && this.attackTarget.active) {
            const dist = distance(this.x, this.y, this.attackTarget.x, this.attackTarget.y);
            if (dist <= this.attackRange) {
                // In range - attack
                this.facing = this.attackTarget.x > this.x ? 1 : -1;
                if (this.attackCooldown <= 0) {
                    this.performAttack(enemies);
                }
                if (this.attackAnimTimer > 0) {
                    this.state = 'attack';
                } else {
                    this.state = 'idle';
                }
            } else {
                // Move toward target (but don't go too far from hero)
                const heroD = distance(this.x, this.y, this.hero.x, this.hero.y);
                if (heroD < 150) {
                    this._moveToward(this.attackTarget.x, this.attackTarget.y, dt);
                    this.state = 'walk';
                } else {
                    this.attackTarget = null;
                    this._followHero(dt);
                    this.state = 'walk';
                }
            }
        } else {
            this.attackTarget = null;
            this._followHero(dt);
        }

        // Update projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            const dx = p.tx - p.x;
            const dy = p.ty - p.y;
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d < 5) {
                // Hit
                if (p.target && p.target.active) {
                    const dealt = p.target.takeDamage(p.damage, false, this.data.element);
                    EventBus.emit('heroDamageEnemy', { enemy: p.target, damage: dealt, element: this.data.element });
                    if (!p.target.active) {
                        EventBus.emit('enemyKilled', { enemy: p.target, byHero: false });
                        this._onKill();
                    }

                    // AoE ability (fire sprite)
                    if (p.aoe && enemies) {
                        for (const e of enemies) {
                            if (e === p.target || !e.active) continue;
                            if (distance(p.tx, p.ty, e.x, e.y) < 50) {
                                const aoeDmg = Math.round(p.damage * 0.5);
                                const dealt2 = e.takeDamage(aoeDmg, false, this.data.element);
                                EventBus.emit('heroDamageEnemy', { enemy: e, damage: dealt2, element: this.data.element });
                                if (!e.active) {
                                    EventBus.emit('enemyKilled', { enemy: e, byHero: false });
                                }
                            }
                        }
                    }

                    // Frost ability (frost fairy)
                    if (p.freeze && p.target.active) {
                        p.target.slowTimer = Math.max(p.target.slowTimer || 0, 1.0);
                        p.target.slowAmount = Math.max(p.target.slowAmount || 0, 0.7);
                    }

                    // Chain lightning (thunder hawk)
                    if (p.chain && enemies) {
                        let chainTarget = null;
                        let chainDist = 80;
                        for (const e of enemies) {
                            if (e === p.target || !e.active) continue;
                            const cd = distance(p.target.x, p.target.y, e.x, e.y);
                            if (cd < chainDist) {
                                chainDist = cd;
                                chainTarget = e;
                            }
                        }
                        if (chainTarget) {
                            const chainDmg = Math.round(p.damage * 0.5);
                            const dealt3 = chainTarget.takeDamage(chainDmg, false, 'lightning');
                            EventBus.emit('heroDamageEnemy', { enemy: chainTarget, damage: dealt3, element: 'lightning' });
                            EventBus.emit('chainLightning', { from: p.target, to: chainTarget });
                            if (!chainTarget.active) {
                                EventBus.emit('enemyKilled', { enemy: chainTarget, byHero: false });
                            }
                        }
                    }
                }
                this.projectiles.splice(i, 1);
            } else {
                const speed = 250;
                p.x += (dx / d) * speed * dt;
                p.y += (dy / d) * speed * dt;
                if (p.target && p.target.active) {
                    p.tx = p.target.x;
                    p.ty = p.target.y;
                }
            }
        }
    }

    performAttack(enemies) {
        if (!this.attackTarget || !this.attackTarget.active) return;

        this.attackCount++;
        this.attackAnimTimer = 0.25;
        this.state = 'attack';

        let effectiveSpeed = this.attackSpeed;
        if (this.frenzyActive) effectiveSpeed *= 1.5;
        this.attackCooldown = 1 / effectiveSpeed;

        let dmg = this.damage;

        // Shadow cat crit
        if (this.petId === 'shadowCat' && this.hasAbility()) {
            if (Math.random() < 0.25) {
                dmg *= 3;
            }
        }

        if (this.data.type === 'ranged' || this.data.type === 'support') {
            // Spawn projectile
            const proj = {
                x: this.x, y: this.y - 5,
                tx: this.attackTarget.x, ty: this.attackTarget.y,
                target: this.attackTarget,
                damage: dmg,
                aoe: false, freeze: false, chain: false
            };

            // Abilities
            if (this.hasAbility()) {
                if (this.petId === 'fireSprite' && this.attackCount % 5 === 0) {
                    proj.aoe = true;
                }
                if (this.petId === 'frostFairy' && this.attackCount % 6 === 0) {
                    proj.freeze = true;
                }
                if (this.petId === 'thunderHawk') {
                    proj.chain = true;
                }
            }

            this.projectiles.push(proj);
        } else {
            // Melee hit
            const dealt = this.attackTarget.takeDamage(dmg, false, this.data.element);
            EventBus.emit('heroDamageEnemy', { enemy: this.attackTarget, damage: dealt, element: this.data.element });
            if (!this.attackTarget.active) {
                EventBus.emit('enemyKilled', { enemy: this.attackTarget, byHero: false });
                this._onKill();
            }
        }
    }

    _onKill() {
        // Wolf frenzy on kill
        if (this.petId === 'wolf' && this.hasAbility()) {
            this.frenzyActive = true;
            this.frenzyTimer = 4;
        }
    }

    _followHero(dt) {
        this.followAngle += this.orbitSpeed * dt;
        const targetX = this.hero.x + Math.cos(this.followAngle) * this.followDist;
        const targetY = this.hero.y + Math.sin(this.followAngle) * this.followDist * 0.5 + 10;

        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const d = Math.sqrt(dx * dx + dy * dy);

        if (d > 2) {
            const moveSpeed = Math.min(this.speed, d * 3);
            this.x += (dx / d) * moveSpeed * dt;
            this.y += (dy / d) * moveSpeed * dt;
            if (Math.abs(dx) > 2) this.facing = dx > 0 ? 1 : -1;
            this.state = d > 10 ? 'walk' : 'idle';
        } else {
            this.state = 'idle';
        }
    }

    _moveToward(tx, ty, dt) {
        const dx = tx - this.x;
        const dy = ty - this.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d > 3) {
            this.x += (dx / d) * this.speed * dt;
            this.y += (dy / d) * this.speed * dt;
            if (Math.abs(dx) > 2) this.facing = dx > 0 ? 1 : -1;
        }
    }

    render(ctx, camX = 0, camY = 0) {
        const sx = this.x - camX;
        const sy = this.y - camY;

        // Shadow
        SpriteRenderer.drawShadow(ctx, sx, sy + 6, 8, 3);

        // Frenzy glow
        if (this.frenzyActive) {
            ctx.globalAlpha = 0.3;
            SpriteRenderer.drawCircle(ctx, sx, sy, 14, '#ff4400');
            ctx.globalAlpha = 1;
        }

        // Phoenix healing aura
        if (this.petId === 'phoenix' && this.hasAbility()) {
            ctx.globalAlpha = 0.08;
            SpriteRenderer.drawCircle(ctx, sx, sy, 25, '#ffaa00');
            ctx.globalAlpha = 1;
        }

        // Draw pet sprite
        this._drawPetSprite(ctx, sx, sy);

        // HP bar (small)
        if (this.hp < this.maxHp) {
            UIRenderer.drawHealthBar(ctx, sx - 10, sy - 16, 20, 3, this.hp, this.maxHp);
        }

        // Projectiles
        for (const p of this.projectiles) {
            const px = p.x - camX;
            const py = p.y - camY;
            const color = this.data.color;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(px, py, p.aoe ? 4 : 3, 0, Math.PI * 2);
            ctx.fill();
            // Glow
            ctx.globalAlpha = 0.3;
            ctx.beginPath();
            ctx.arc(px, py, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
    }

    _drawPetSprite(ctx, sx, sy) {
        const f = this.facing;
        const bobY = this.state === 'walk' ? Math.sin(this.animFrame * Math.PI) * 2 : 0;
        const atkOffset = this.state === 'attack' ? f * 3 : 0;
        const color = this.data.color;

        switch (this.petId) {
            case 'wolf':
                this._drawWolf(ctx, sx + atkOffset, sy - bobY, f, color);
                break;
            case 'fireSprite':
                this._drawSprite(ctx, sx, sy - bobY - 4, f, color, '#ff3300');
                break;
            case 'frostFairy':
                this._drawSprite(ctx, sx, sy - bobY - 4, f, '#88ddff', '#2288ff');
                break;
            case 'thunderHawk':
                this._drawHawk(ctx, sx + atkOffset, sy - bobY - 3, f, color);
                break;
            case 'shadowCat':
                this._drawCat(ctx, sx + atkOffset, sy - bobY, f, color);
                break;
            case 'phoenix':
                this._drawPhoenix(ctx, sx, sy - bobY - 5, f);
                break;
            default:
                SpriteRenderer.drawCircle(ctx, sx, sy - 4, 6, color);
        }
    }

    _drawWolf(ctx, x, y, f, color) {
        // Body
        ctx.fillStyle = color;
        ctx.fillRect(x - 7 * f, y - 4, 14, 8);
        // Head
        ctx.fillRect(x + 5 * f, y - 8, 6 * f, 8);
        // Ears
        ctx.fillStyle = '#997744';
        ctx.fillRect(x + 6 * f, y - 11, 2, 3);
        ctx.fillRect(x + 9 * f, y - 11, 2, 3);
        // Eye
        ctx.fillStyle = '#fff';
        ctx.fillRect(x + 8 * f, y - 6, 2, 2);
        // Tail
        ctx.fillStyle = '#886633';
        ctx.fillRect(x - 8 * f, y - 6, 4 * -f, 3);
        // Legs
        ctx.fillStyle = '#776644';
        ctx.fillRect(x - 4, y + 4, 2, 4);
        ctx.fillRect(x + 3, y + 4, 2, 4);
    }

    _drawSprite(ctx, x, y, f, color, glowColor) {
        // Floating elemental sprite
        const flutter = Math.sin(Date.now() / 150) * 2;
        // Glow
        ctx.globalAlpha = 0.15;
        SpriteRenderer.drawCircle(ctx, x, y + flutter, 10, glowColor);
        ctx.globalAlpha = 1;
        // Body
        SpriteRenderer.drawCircle(ctx, x, y + flutter, 5, color);
        // Core
        SpriteRenderer.drawCircle(ctx, x, y + flutter, 2, '#fff');
        // Wings
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.ellipse(x - 6, y + flutter - 2, 4, 6, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(x + 6, y + flutter - 2, 4, 6, 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }

    _drawHawk(ctx, x, y, f, color) {
        // Body
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        // Beak
        ctx.fillStyle = '#ffaa00';
        ctx.fillRect(x + 4 * f, y - 1, 3 * f, 2);
        // Wings
        const wingFlap = Math.sin(Date.now() / 100) * 0.4;
        ctx.fillStyle = '#ddcc22';
        ctx.save();
        ctx.translate(x - 3, y);
        ctx.rotate(-wingFlap);
        ctx.fillRect(-8, -2, 8, 3);
        ctx.restore();
        ctx.save();
        ctx.translate(x + 3, y);
        ctx.rotate(wingFlap);
        ctx.fillRect(0, -2, 8, 3);
        ctx.restore();
        // Eye
        ctx.fillStyle = '#000';
        ctx.fillRect(x + 3 * f, y - 2, 1, 1);
    }

    _drawCat(ctx, x, y, f, color) {
        // Body
        ctx.fillStyle = color;
        ctx.fillRect(x - 5 * f, y - 3, 10, 7);
        // Head
        ctx.fillRect(x + 4 * f, y - 7, 6 * f, 6);
        // Ears (pointed)
        ctx.beginPath();
        ctx.moveTo(x + 5 * f, y - 7);
        ctx.lineTo(x + 4 * f, y - 12);
        ctx.lineTo(x + 7 * f, y - 7);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x + 8 * f, y - 7);
        ctx.lineTo(x + 9 * f, y - 12);
        ctx.lineTo(x + 10 * f, y - 7);
        ctx.fill();
        // Eyes (glowing)
        ctx.fillStyle = '#ff44ff';
        ctx.fillRect(x + 6 * f, y - 5, 2, 2);
        // Tail (curved up)
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x - 5 * f, y);
        ctx.quadraticCurveTo(x - 10 * f, y - 8, x - 8 * f, y - 12);
        ctx.stroke();
        // Legs
        ctx.fillStyle = '#7733aa';
        ctx.fillRect(x - 3, y + 4, 2, 3);
        ctx.fillRect(x + 2, y + 4, 2, 3);
    }

    _drawPhoenix(ctx, x, y, f) {
        const flutter = Math.sin(Date.now() / 120) * 2;
        // Fire glow
        ctx.globalAlpha = 0.2;
        SpriteRenderer.drawCircle(ctx, x, y + flutter, 12, '#ff4400');
        ctx.globalAlpha = 1;
        // Body
        ctx.fillStyle = '#ffaa22';
        ctx.beginPath();
        ctx.ellipse(x, y + flutter, 5, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        // Head
        ctx.fillStyle = '#ffcc44';
        SpriteRenderer.drawCircle(ctx, x + 4 * f, y + flutter - 4, 3, '#ffcc44');
        // Beak
        ctx.fillStyle = '#ff6600';
        ctx.fillRect(x + 6 * f, y + flutter - 4, 2 * f, 1);
        // Wings (fire-like)
        ctx.fillStyle = '#ff6622';
        const wingFlap = Math.sin(Date.now() / 100) * 0.5;
        ctx.save();
        ctx.translate(x - 4, y + flutter);
        ctx.rotate(-wingFlap - 0.2);
        ctx.fillRect(-7, -2, 7, 3);
        ctx.restore();
        ctx.save();
        ctx.translate(x + 4, y + flutter);
        ctx.rotate(wingFlap + 0.2);
        ctx.fillRect(0, -2, 7, 3);
        ctx.restore();
        // Tail feathers (fire)
        ctx.fillStyle = '#ff4400';
        ctx.beginPath();
        ctx.moveTo(x - 5 * f, y + flutter + 2);
        ctx.lineTo(x - 12 * f, y + flutter - 2);
        ctx.lineTo(x - 10 * f, y + flutter + 4);
        ctx.lineTo(x - 14 * f, y + flutter);
        ctx.lineTo(x - 8 * f, y + flutter + 5);
        ctx.closePath();
        ctx.fill();
        // Eye
        ctx.fillStyle = '#000';
        ctx.fillRect(x + 5 * f, y + flutter - 5, 1, 1);
    }
}
