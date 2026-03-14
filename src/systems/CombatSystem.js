import { BalanceConfig } from '../data/BalanceConfig.js';
import { distance } from '../utils/MathUtils.js';
import { EventBus } from '../utils/EventBus.js';
import { ElementColors } from '../data/TowerData.js';

export class CombatSystem {
    constructor() {
        this.floatingTexts = [];
    }

    _dmgTextColor(element, elemMult) {
        if (elemMult > 1) return '#ff4444';     // weakness = red text
        if (elemMult < 1) return '#8888aa';     // resistance = grey text
        return ElementColors[element] || '#fff'; // normal = element color
    }

    _dmgTextSuffix(elemMult) {
        if (elemMult >= 1.4) return '!!!';
        if (elemMult > 1) return '!';
        if (elemMult <= 0.5) return '~';
        return '';
    }

    processProjectileHit(projectile, enemies) {
        const target = projectile.target;
        const element = projectile.element || 'physical';

        if (target && target.active) {
            const isCrit = Math.random() < BalanceConfig.CRIT_CHANCE;
            const dmg = isCrit ? projectile.damage * BalanceConfig.CRIT_MULT : projectile.damage;
            const dealt = target.takeDamage(dmg, projectile.ignoreArmor, element);
            const em = target.lastElemMult || 1;
            const color = this._dmgTextColor(element, em);
            const suffix = this._dmgTextSuffix(em);
            this.addFloatingText(target.x, target.y - 20, Math.round(dealt) + suffix, isCrit ? '#ffd700' : color);
            if (isCrit) {
                this.addFloatingText(target.x, target.y - 35, 'CRIT!', '#ffd700');
            }

            if (!target.active) {
                EventBus.emit('enemyKilled', { enemy: target, byHero: false });
            }

            // Slow
            if (projectile.slowAmount > 0) {
                target.applySlow(projectile.slowAmount, projectile.slowDuration);
            }

            // Burn
            if (projectile.burnDps > 0) {
                target.applyBurn(projectile.burnDps, projectile.burnDuration);
            }

            // Poison
            if (projectile.poisonDps > 0) {
                target.applyPoison(projectile.poisonDps, projectile.poisonDuration);
            }

            // Splash damage
            if (projectile.splash > 0) {
                for (const enemy of enemies) {
                    if (enemy !== target && enemy.active &&
                        distance(target.x, target.y, enemy.x, enemy.y) <= projectile.splash) {
                        const splashDmg = projectile.damage * projectile.splashDamagePct;
                        enemy.takeDamage(splashDmg, projectile.ignoreArmor, element);
                        if (!enemy.active) {
                            EventBus.emit('enemyKilled', { enemy, byHero: false });
                        }
                    }
                }
            }

            // Chain lightning
            if (projectile.chainTargets > 0) {
                let lastTarget = target;
                let chainsLeft = projectile.chainTargets;
                const hit = new Set([target]);

                while (chainsLeft > 0) {
                    let closest = null;
                    let closestDist = projectile.chainRange;

                    for (const enemy of enemies) {
                        if (!hit.has(enemy) && enemy.active) {
                            const d = distance(lastTarget.x, lastTarget.y, enemy.x, enemy.y);
                            if (d < closestDist) {
                                closest = enemy;
                                closestDist = d;
                            }
                        }
                    }

                    if (!closest) break;

                    hit.add(closest);
                    const chainDmg = projectile.damage * 0.7;
                    closest.takeDamage(chainDmg, projectile.ignoreArmor, element);
                    EventBus.emit('chainLightning', {
                        from: { x: lastTarget.x, y: lastTarget.y },
                        to: { x: closest.x, y: closest.y }
                    });
                    if (!closest.active) {
                        EventBus.emit('enemyKilled', { enemy: closest, byHero: false });
                    }
                    lastTarget = closest;
                    chainsLeft--;
                }
            }
        }
    }

    processEnemyAbilities(enemies) {
        for (const enemy of enemies) {
            if (!enemy.active || !enemy.canUseAbility()) continue;

            if (enemy.ability === 'healAura') {
                for (const other of enemies) {
                    if (other.active && other !== enemy &&
                        distance(enemy.x, enemy.y, other.x, other.y) <= enemy.data.abilityRadius) {
                        other.hp = Math.min(other.maxHp, other.hp + enemy.data.abilityHeal);
                    }
                }
                enemy.useAbility();
                EventBus.emit('enemyAbility', { enemy, ability: 'healAura' });
            }
        }
    }

    addFloatingText(x, y, text, color) {
        this.floatingTexts.push({
            x, y, text: String(text), color,
            life: 1.0,
            vy: -40
        });
    }

    updateFloatingTexts(dt) {
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const ft = this.floatingTexts[i];
            ft.y += ft.vy * dt;
            ft.life -= dt;
            if (ft.life <= 0) {
                this.floatingTexts.splice(i, 1);
            }
        }
    }

    renderFloatingTexts(ctx, camX = 0, camY = 0) {
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        for (const ft of this.floatingTexts) {
            ctx.globalAlpha = Math.max(0, ft.life);
            const dx = ft.x - camX;
            const dy = ft.y - camY;
            // Dark outline for readability
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 3;
            ctx.strokeText(ft.text, dx, dy);
            ctx.fillStyle = ft.color;
            ctx.fillText(ft.text, dx, dy);
        }
        ctx.globalAlpha = 1;
    }
}
