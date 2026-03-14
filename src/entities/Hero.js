import { Entity } from './Entity.js';
import { SpriteRenderer } from '../renderer/SpriteRenderer.js';
import { UIRenderer } from '../renderer/UIRenderer.js';
import { BalanceConfig } from '../data/BalanceConfig.js';
import { GearData } from '../data/GearData.js';
import { TILE_SIZE } from '../utils/Constants.js';
import { Audio } from '../audio/AudioManager.js';
import { distance } from '../utils/MathUtils.js';
import { EventBus } from '../utils/EventBus.js';

export class Hero extends Entity {
    constructor(x, y, playerData) {
        super(x, y, TILE_SIZE, TILE_SIZE * 1.2);
        this.playerData = playerData;

        this.recalcStats();

        this.hp = this.maxHp;
        this.targetX = x;
        this.targetY = y;
        this.moving = false;
        this.facing = 1; // 1=right, -1=left

        this.attackTarget = null;
        this.attackCooldown = 0;
        this.dead = false;
        this.respawnTimer = 0;

        // Animation
        this.state = 'idle';
        this.animSpeed = 6;
        this.animFrames = 4;
        this.attackAnimTimer = 0;
        this.attackAnimDuration = 0.35;

        // Auto-attack
        this.autoAttackRange = 120;

        // Skill cooldowns
        this.skillCooldowns = {};

        // Shield effect
        this.shieldActive = false;
        this.shieldTimer = 0;
        this.shieldReduction = 0;

        // Hit flash
        this.hitFlashTimer = 0;

        // Buff timer for war cry
        this.buffActive = false;
        this.buffTimer = 0;
        this.buffRadius = 0;
        this.buffAmount = 0;
    }

    recalcStats() {
        const pd = this.playerData;
        const base = BalanceConfig;

        this.maxHp = base.HERO_BASE_HP + (pd.statUpgrades.maxHp || 0) * 20;
        this.baseDamage = base.HERO_BASE_DAMAGE + (pd.statUpgrades.damage || 0) * 5;
        this.armor = base.HERO_BASE_ARMOR + (pd.statUpgrades.armor || 0) * 3;
        this.speed = base.HERO_BASE_SPEED + (pd.statUpgrades.speed || 0) * 10;
        this.hpRegen = base.HERO_BASE_REGEN + (pd.statUpgrades.hpRegen || 0) * 0.5;
        this.attackRange = base.HERO_ATTACK_RANGE;
        this.baseAttackCooldown = base.HERO_ATTACK_COOLDOWN;

        // Gear bonuses (Blacksmith upgrades)
        const gear = pd.gear || {};
        if (gear.sword > 0) this.baseDamage += GearData.sword.totalBonus(gear.sword);
        if (gear.helmet > 0) this.maxHp += GearData.helmet.totalBonus(gear.helmet);
        if (gear.chestplate > 0) this.armor += GearData.chestplate.totalBonus(gear.chestplate);
        if (gear.leggings > 0) this.speed += GearData.leggings.totalBonus(gear.leggings);
        if (gear.boots > 0) {
            const atkBonus = GearData.boots.totalBonus(gear.boots);
            this.baseAttackCooldown *= (1 - atkBonus);
        }

        // Equipment bonuses (legacy + accessories)
        if (pd.equipment.weapon) {
            this.baseDamage += pd.equipment.weapon.damage || 0;
        }
        if (pd.equipment.armor) {
            this.armor += pd.equipment.armor.armor || 0;
        }
        if (pd.equipment.accessory) {
            const acc = pd.equipment.accessory;
            if (acc.speed) this.speed += acc.speed;
            if (acc.hp) this.maxHp += acc.hp;
            if (acc.armor) this.armor += acc.armor;
            if (acc.damage) this.baseDamage += acc.damage;
            if (acc.hpRegen) this.hpRegen += acc.hpRegen;
        }

        // Passive skill bonuses
        const skills = pd.skills || {};
        if (skills.toughness > 0) {
            const bonus = [0.15, 0.30, 0.50, 0.75, 1.0][skills.toughness - 1];
            this.maxHp = Math.round(this.maxHp * (1 + bonus));
        }
        if (skills.swiftBlade > 0) {
            const bonus = [0.10, 0.22, 0.35, 0.48, 0.60][skills.swiftBlade - 1];
            this.baseAttackCooldown *= (1 - bonus);
        }
        if (skills.ironSkin > 0) {
            this.armor += [5, 12, 20, 30, 42][skills.ironSkin - 1];
        }
    }

    update(dt, enemies, towers = []) {
        this.towers = towers;
        if (this.dead) {
            this.respawnTimer -= dt;
            if (this.respawnTimer <= 0) {
                this.respawn();
            }
            return;
        }

        // Parent animation update
        super.update(dt);

        // Hit flash countdown
        if (this.hitFlashTimer > 0) {
            this.hitFlashTimer -= dt;
        }

        // Shield timer
        if (this.shieldActive) {
            this.shieldTimer -= dt;
            if (this.shieldTimer <= 0) {
                this.shieldActive = false;
            }
        }

        // Buff timer
        if (this.buffActive) {
            this.buffTimer -= dt;
            if (this.buffTimer <= 0) {
                this.buffActive = false;
            }
        }

        // HP regeneration
        if (this.hp < this.maxHp) {
            this.hp = Math.min(this.maxHp, this.hp + this.hpRegen * dt);
        }

        // Skill cooldowns
        for (const key of Object.keys(this.skillCooldowns)) {
            if (this.skillCooldowns[key] > 0) {
                this.skillCooldowns[key] -= dt;
            }
        }

        // Attack cooldown
        if (this.attackCooldown > 0) {
            this.attackCooldown -= dt;
        }

        // Attack animation timer
        if (this.attackAnimTimer > 0) {
            this.attackAnimTimer -= dt;
            if (this.attackAnimTimer <= 0) {
                this.attackAnimTimer = 0;
            }
        }

        // Auto-attack: find nearest enemy if no target
        if ((!this.attackTarget || !this.attackTarget.active) && !this.moving && enemies) {
            this.attackTarget = null;
            let nearest = null;
            let nearDist = this.autoAttackRange;
            for (const enemy of enemies) {
                if (!enemy.active) continue;
                const d = distance(this.x, this.y, enemy.x, enemy.y);
                if (d < nearDist) {
                    nearDist = d;
                    nearest = enemy;
                }
            }
            if (nearest) {
                this.attackTarget = nearest;
            }
        }

        // If has attack target, move toward and attack
        if (this.attackTarget && this.attackTarget.active) {
            const dist = distance(this.x, this.y, this.attackTarget.x, this.attackTarget.y);
            if (dist <= this.attackRange) {
                // In range - attack
                this.facing = this.attackTarget.x > this.x ? 1 : -1;
                this.moving = false;
                if (this.attackCooldown <= 0) {
                    this.performAttack();
                }
                // Set attack state while attack anim is playing
                if (this.attackAnimTimer > 0) {
                    this.state = 'attack';
                } else {
                    this.state = 'idle';
                }
            } else {
                // Move toward target
                this.targetX = this.attackTarget.x;
                this.targetY = this.attackTarget.y;
                this.moveToward(dt);
                this.state = 'walk';
            }
        } else {
            this.attackTarget = null;
            if (this.moving) {
                this.moveToward(dt);
                this.state = 'walk';
            } else {
                if (this.attackAnimTimer > 0) {
                    this.state = 'attack';
                } else {
                    this.state = 'idle';
                }
            }
        }
    }

    moveToward(dt) {
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 3) {
            this.moving = false;
            return;
        }

        this.facing = dx > 0 ? 1 : -1;
        const moveX = (dx / dist) * this.speed * dt;
        const moveY = (dy / dist) * this.speed * dt;
        this.x += moveX;
        this.y += moveY;

        // Collide with towers — push hero out of tower tiles
        if (this.towers) {
            const S = TILE_SIZE;
            const heroR = S * 0.3;
            for (const t of this.towers) {
                const tx = t.col * S + S / 2;
                const ty = t.row * S + S / 2;
                const ddx = this.x - tx;
                const ddy = this.y - ty;
                const d = Math.sqrt(ddx * ddx + ddy * ddy);
                const minDist = S * 0.55 + heroR;
                if (d < minDist && d > 0) {
                    this.x = tx + (ddx / d) * minDist;
                    this.y = ty + (ddy / d) * minDist;
                }
            }
        }

        // Collide with castle (diamond hitbox)
        if (this.castleHitbox) {
            const h = this.castleHitbox;
            const cdx = this.x - h.cx;
            const cdy = this.y - h.cy;
            const d = Math.abs(cdx) / h.hw + Math.abs(cdy) / h.hh;
            if (d < 1) {
                // Inside diamond — push out along direction from center
                const dist = Math.sqrt(cdx * cdx + cdy * cdy);
                if (dist < 1) {
                    this.x = h.cx + h.hw + 2;
                } else {
                    const nx = cdx / dist;
                    const ny = cdy / dist;
                    const t = 1 / (Math.abs(nx) / h.hw + Math.abs(ny) / h.hh);
                    this.x = h.cx + nx * (t + 2);
                    this.y = h.cy + ny * (t + 2);
                }
            }
        }
    }

    moveTo(x, y) {
        this.targetX = x;
        this.targetY = y;
        this.moving = true;
        this.attackTarget = null;
    }

    setAttackTarget(enemy) {
        this.attackTarget = enemy;
        this.moving = false;
    }

    performAttack() {
        if (!this.attackTarget || !this.attackTarget.active) return;

        const dmg = this.baseDamage;
        const dealt = this.attackTarget.takeDamage(dmg, false, 'physical');
        Audio.playHeroAttack();

        // Start attack animation
        this.attackAnimTimer = this.attackAnimDuration;
        this.state = 'attack';
        this.animFrame = 0;

        // Lifesteal
        if (this.playerData.equipment.accessory?.lifesteal) {
            this.hp = Math.min(this.maxHp, this.hp + dealt * this.playerData.equipment.accessory.lifesteal);
        }

        this.attackCooldown = this.baseAttackCooldown;
        EventBus.emit('heroAttack', { target: this.attackTarget, damage: dealt });

        if (!this.attackTarget.active) {
            EventBus.emit('enemyKilled', {
                enemy: this.attackTarget,
                byHero: true
            });
            this.attackTarget = null;
        }
    }

    takeDamage(amount) {
        if (this.dead) return 0;
        let effective = amount * (100 / (100 + this.armor));
        if (this.shieldActive) {
            effective *= (1 - this.shieldReduction);
        }
        this.hp -= effective;
        this.hitFlashTimer = 0.15;
        if (this.hp <= 0) {
            this.die();
        }
        return effective;
    }

    die() {
        this.dead = true;
        this.hp = 0;
        this.state = 'die';
        this.respawnTimer = BalanceConfig.HERO_RESPAWN_TIME;
        Audio.playHeroDeath();
        EventBus.emit('heroDied', {});
    }

    respawn() {
        this.dead = false;
        this.hp = this.maxHp;
        this.respawnTimer = 0;
        this.attackTarget = null;
        this.moving = false;
        this.state = 'idle';
        EventBus.emit('heroRespawned', {});
    }

    render(ctx, camX = 0, camY = 0) {
        if (this.dead) {
            const sx = this.x - camX;
            const sy = this.y - camY;
            ctx.globalAlpha = 0.4;
            SpriteRenderer.drawShadow(ctx, sx, sy + 10, 14, 5);
            SpriteRenderer.drawHero(ctx, sx, sy, this.facing, this.hp, this.maxHp, 'die', 0);
            ctx.globalAlpha = 1;
            SpriteRenderer.drawText(ctx, `${Math.ceil(this.respawnTimer)}s`, sx, sy - 30, '#fff', 12, 'center');
            return;
        }

        const sx = this.x - camX;
        const sy = this.y - camY;

        // Shield visual
        if (this.shieldActive) {
            ctx.globalAlpha = 0.2;
            SpriteRenderer.drawCircle(ctx, sx, sy, 24, '#4af');
            ctx.globalAlpha = 1;
            ctx.strokeStyle = '#4af';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(sx, sy, 24, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Buff visual
        if (this.buffActive) {
            ctx.globalAlpha = 0.15;
            SpriteRenderer.drawCircle(ctx, sx, sy, this.buffRadius, '#fa0');
            ctx.globalAlpha = 1;
        }

        // Shadow
        SpriteRenderer.drawShadow(ctx, sx, sy + 10, 14, 5);

        // Hit flash effect
        if (this.hitFlashTimer > 0) {
            const intensity = Math.min(this.hitFlashTimer / 0.08, 1);
            const bright = 1 + intensity * 2;
            ctx.save();
            ctx.filter = `brightness(${bright})`;
            SpriteRenderer.drawHero(ctx, sx, sy, this.facing, this.hp, this.maxHp, this.state, this.animFrame);
            ctx.restore();
        } else {
            SpriteRenderer.drawHero(ctx, sx, sy, this.facing, this.hp, this.maxHp, this.state, this.animFrame);
        }

        // Health bar (above plume: sprite top is at sy - TILE_SIZE * 1.6 - ~4 for plume)
        UIRenderer.drawHealthBar(ctx, sx - 16, sy - TILE_SIZE * 1.7 - 6, 32, 4, this.hp, this.maxHp);

        // Move target indicator
        if (this.moving && !this.attackTarget) {
            ctx.strokeStyle = '#4f4';
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.arc(this.targetX - camX, this.targetY - camY, 5, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Attack target indicator
        if (this.attackTarget && this.attackTarget.active) {
            const tx = this.attackTarget.x - camX;
            const ty = this.attackTarget.y - camY;
            ctx.strokeStyle = '#f44';
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.arc(tx, ty, 8, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }

    useSkill(skillId, enemies, towers) {
        const skills = this.playerData.skills;
        const level = skills[skillId];
        if (!level || level <= 0) return false;
        if (this.skillCooldowns[skillId] > 0) return false;
        if (this.dead) return false;

        switch (skillId) {
            case 'whirlwind': {
                const cd = [8, 7, 6, 5, 4][level - 1];
                const dmg = [30, 50, 80, 120, 175][level - 1];
                const radius = [60, 70, 80, 90, 100][level - 1];
                this.skillCooldowns[skillId] = cd;
                for (const enemy of enemies) {
                    if (enemy.active && distance(this.x, this.y, enemy.x, enemy.y) <= radius) {
                        const dealt = enemy.takeDamage(dmg, false, 'physical');
                        EventBus.emit('heroDamageEnemy', { enemy, damage: dealt, element: 'physical' });
                        if (!enemy.active) {
                            EventBus.emit('enemyKilled', { enemy, byHero: true });
                        }
                    }
                }
                EventBus.emit('skillUsed', { skill: 'whirlwind', x: this.x, y: this.y, radius });
                return true;
            }
            case 'warCry': {
                const cd = [15, 13, 11, 9, 7][level - 1];
                const dur = [5, 6, 7, 8, 10][level - 1];
                const buff = [0.2, 0.35, 0.5, 0.65, 0.8][level - 1];
                const radius = [120, 140, 160, 180, 200][level - 1];
                this.skillCooldowns[skillId] = cd;
                this.buffActive = true;
                this.buffTimer = dur;
                this.buffRadius = radius;
                this.buffAmount = buff;
                EventBus.emit('skillUsed', { skill: 'warCry', x: this.x, y: this.y, radius });
                return true;
            }
            case 'heal': {
                const cd = [12, 10, 8, 7, 5][level - 1];
                const amount = [30, 50, 80, 120, 180][level - 1];
                this.skillCooldowns[skillId] = cd;
                this.hp = Math.min(this.maxHp, this.hp + amount);
                EventBus.emit('skillUsed', { skill: 'heal', x: this.x, y: this.y });
                return true;
            }
            case 'thunderStrike': {
                const cd = [10, 8, 7, 6, 5][level - 1];
                const dmg = [50, 80, 120, 180, 260][level - 1];
                const radius = [50, 60, 70, 80, 90][level - 1];
                this.skillCooldowns[skillId] = cd;
                const tx = this.attackTarget ? this.attackTarget.x : this.targetX;
                const ty = this.attackTarget ? this.attackTarget.y : this.targetY;
                for (const enemy of enemies) {
                    if (enemy.active && distance(tx, ty, enemy.x, enemy.y) <= radius) {
                        const dealt = enemy.takeDamage(dmg, true, 'lightning');
                        EventBus.emit('heroDamageEnemy', { enemy, damage: dealt, element: 'lightning' });
                        if (!enemy.active) {
                            EventBus.emit('enemyKilled', { enemy, byHero: true });
                        }
                    }
                }
                EventBus.emit('skillUsed', { skill: 'thunderStrike', x: tx, y: ty, radius });
                return true;
            }
            case 'shield': {
                const cd = [20, 18, 15, 13, 10][level - 1];
                const dur = [3, 4, 5, 6, 8][level - 1];
                const red = [0.5, 0.65, 0.8, 0.88, 0.95][level - 1];
                this.skillCooldowns[skillId] = cd;
                this.shieldActive = true;
                this.shieldTimer = dur;
                this.shieldReduction = red;
                EventBus.emit('skillUsed', { skill: 'shield', x: this.x, y: this.y });
                return true;
            }
        }
        return false;
    }
}
