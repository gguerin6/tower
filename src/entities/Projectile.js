import { Entity } from './Entity.js';
import { distance } from '../utils/MathUtils.js';
import { SpriteRenderer } from '../renderer/SpriteRenderer.js';

export class Projectile extends Entity {
    constructor(config) {
        super(config.startX, config.startY, 6, 6);
        this.target = config.target;
        this.damage = config.damage;
        this.speed = config.speed;
        this.color = config.color;
        this.ignoreArmor = config.ignoreArmor;
        this.splash = config.splash;
        this.splashDamagePct = config.splashDamagePct;
        this.slowAmount = config.slowAmount;
        this.slowDuration = config.slowDuration;
        this.chainTargets = config.chainTargets;
        this.chainRange = config.chainRange;
        this.towerType = config.type;
        this.element = config.element || 'physical';

        // Target position snapshot (in case target dies)
        this.targetX = config.target.x;
        this.targetY = config.target.y;

        // Trail history for motion effects
        this.trail = [];
        this.maxTrail = this.towerType === 'cannon' ? 6 : 8;
        this.age = 0;

        // Direction angle
        this.angle = Math.atan2(this.targetY - this.y, this.targetX - this.x);

        // For instant (tesla)
        if (this.speed === 0) {
            this.instant = true;
        }
    }

    update(dt) {
        if (!this.active) return;

        // Update target position if still alive
        if (this.target && this.target.active) {
            this.targetX = this.target.x;
            this.targetY = this.target.y;
        }

        if (this.instant) {
            this.active = false;
            return;
        }

        this.age += dt;

        // Store trail position
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > this.maxTrail) {
            this.trail.shift();
        }

        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 8) {
            this.active = false;
            return;
        }

        // Update angle
        this.angle = Math.atan2(dy, dx);

        this.x += (dx / dist) * this.speed * dt;
        this.y += (dy / dist) * this.speed * dt;
    }

    render(ctx, camX = 0, camY = 0) {
        if (!this.active || this.instant) return;

        const sx = this.x - camX;
        const sy = this.y - camY;

        switch (this.towerType) {
            case 'archer':
                this._renderArrow(ctx, sx, sy, camX, camY);
                break;
            case 'mage':
                this._renderMagicOrb(ctx, sx, sy, camX, camY);
                break;
            case 'cannon':
                this._renderCannonball(ctx, sx, sy, camX, camY);
                break;
            case 'frost':
                this._renderIceShard(ctx, sx, sy, camX, camY);
                break;
            default:
                SpriteRenderer.drawCircle(ctx, sx, sy, 3, this.color);
        }
    }

    _renderArrow(ctx, sx, sy, camX, camY) {
        const a = this.angle;

        // Motion trail - fading lines
        if (this.trail.length > 1) {
            for (let i = 1; i < this.trail.length; i++) {
                const t0 = this.trail[i - 1];
                const t1 = this.trail[i];
                const alpha = (i / this.trail.length) * 0.3;
                ctx.strokeStyle = `rgba(180, 140, 80, ${alpha})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(t0.x - camX, t0.y - camY);
                ctx.lineTo(t1.x - camX, t1.y - camY);
                ctx.stroke();
            }
        }

        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(a);

        // Arrow shaft
        ctx.strokeStyle = '#8B6914';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-10, 0);
        ctx.lineTo(3, 0);
        ctx.stroke();

        // Arrowhead
        ctx.fillStyle = '#d0d0d0';
        ctx.beginPath();
        ctx.moveTo(7, 0);
        ctx.lineTo(2, -2.5);
        ctx.lineTo(3, 0);
        ctx.lineTo(2, 2.5);
        ctx.closePath();
        ctx.fill();

        // Fletching
        ctx.fillStyle = 'rgba(180, 60, 40, 0.8)';
        ctx.beginPath();
        ctx.moveTo(-10, 0);
        ctx.lineTo(-7, -2);
        ctx.lineTo(-7, 0);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-10, 0);
        ctx.lineTo(-7, 2);
        ctx.lineTo(-7, 0);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }

    _renderMagicOrb(ctx, sx, sy, camX, camY) {
        // Sparkle trail
        for (let i = 0; i < this.trail.length; i++) {
            const t = this.trail[i];
            const progress = i / this.trail.length;
            const alpha = progress * 0.5;
            const r = 2 + progress * 1.5;
            const tx = t.x - camX;
            const ty = t.y - camY;

            // Trail particles with slight offset
            const wobble = Math.sin(this.age * 10 + i * 2) * 3;
            ctx.globalAlpha = alpha * 0.6;
            ctx.fillStyle = '#cc88ff';
            ctx.beginPath();
            ctx.arc(tx + wobble, ty + Math.cos(this.age * 8 + i) * 2, r * 0.5, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Outer glow
        const glowR = 8 + Math.sin(this.age * 12) * 2;
        const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, glowR);
        glow.addColorStop(0, 'rgba(170, 100, 255, 0.4)');
        glow.addColorStop(0.5, 'rgba(130, 70, 220, 0.15)');
        glow.addColorStop(1, 'rgba(100, 50, 200, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(sx, sy, glowR, 0, Math.PI * 2);
        ctx.fill();

        // Core orb
        const orbGrad = ctx.createRadialGradient(sx - 1, sy - 1, 0, sx, sy, 4);
        orbGrad.addColorStop(0, '#eeddff');
        orbGrad.addColorStop(0.4, '#aa66ff');
        orbGrad.addColorStop(1, '#6633bb');
        ctx.fillStyle = orbGrad;
        ctx.beginPath();
        ctx.arc(sx, sy, 4, 0, Math.PI * 2);
        ctx.fill();

        // Inner bright core
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.beginPath();
        ctx.arc(sx - 1, sy - 1, 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Orbiting sparkle
        const sparkAngle = this.age * 8;
        const sparkR = 5;
        ctx.fillStyle = 'rgba(255, 220, 255, 0.6)';
        ctx.beginPath();
        ctx.arc(sx + Math.cos(sparkAngle) * sparkR, sy + Math.sin(sparkAngle) * sparkR, 1, 0, Math.PI * 2);
        ctx.fill();
    }

    _renderCannonball(ctx, sx, sy, camX, camY) {
        // Smoke trail
        for (let i = 0; i < this.trail.length; i++) {
            const t = this.trail[i];
            const progress = i / this.trail.length;
            const tx = t.x - camX;
            const ty = t.y - camY;

            // Smoke puffs rising upward
            const rise = (1 - progress) * 4;
            const spread = Math.sin(this.age * 5 + i * 1.5) * 2;
            const smokeAlpha = progress * 0.25;
            const smokeR = 2 + (1 - progress) * 2;

            ctx.globalAlpha = smokeAlpha;
            ctx.fillStyle = '#888';
            ctx.beginPath();
            ctx.arc(tx + spread, ty - rise, smokeR, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Fire glow behind cannonball
        const fireGlow = ctx.createRadialGradient(sx, sy, 0, sx, sy, 8);
        fireGlow.addColorStop(0, 'rgba(255, 120, 20, 0.35)');
        fireGlow.addColorStop(0.6, 'rgba(255, 60, 0, 0.1)');
        fireGlow.addColorStop(1, 'rgba(200, 40, 0, 0)');
        ctx.fillStyle = fireGlow;
        ctx.beginPath();
        ctx.arc(sx, sy, 8, 0, Math.PI * 2);
        ctx.fill();

        // Cannonball body
        const ballGrad = ctx.createRadialGradient(sx - 1, sy - 1, 0, sx, sy, 4.5);
        ballGrad.addColorStop(0, '#555');
        ballGrad.addColorStop(0.6, '#333');
        ballGrad.addColorStop(1, '#111');
        ctx.fillStyle = ballGrad;
        ctx.beginPath();
        ctx.arc(sx, sy, 4.5, 0, Math.PI * 2);
        ctx.fill();

        // Metallic highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.beginPath();
        ctx.arc(sx - 1.5, sy - 1.5, 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Ember sparks trailing behind
        const tailAngle = this.angle + Math.PI;
        for (let i = 0; i < 3; i++) {
            const sparkDist = 5 + i * 3 + Math.sin(this.age * 15 + i * 3) * 2;
            const sparkSpread = Math.sin(this.age * 10 + i * 4) * 3;
            const ex = sx + Math.cos(tailAngle) * sparkDist + Math.sin(tailAngle) * sparkSpread;
            const ey = sy + Math.sin(tailAngle) * sparkDist + Math.cos(tailAngle) * sparkSpread;
            const emberAlpha = 0.8 - i * 0.2;
            ctx.globalAlpha = emberAlpha;
            ctx.fillStyle = i === 0 ? '#ffaa22' : '#ff6600';
            ctx.beginPath();
            ctx.arc(ex, ey, 1.2 - i * 0.2, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    _renderIceShard(ctx, sx, sy, camX, camY) {
        // Frost particle trail
        for (let i = 0; i < this.trail.length; i++) {
            const t = this.trail[i];
            const progress = i / this.trail.length;
            const tx = t.x - camX;
            const ty = t.y - camY;

            // Frost crystals drifting
            const drift = Math.sin(this.age * 6 + i * 2) * 3;
            const alpha = progress * 0.4;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = '#aaeeff';

            // Small diamond shapes
            const s = 1.5 + progress;
            ctx.save();
            ctx.translate(tx + drift, ty + Math.cos(this.age * 4 + i) * 2);
            ctx.rotate(this.age * 3 + i);
            ctx.beginPath();
            ctx.moveTo(0, -s);
            ctx.lineTo(s * 0.6, 0);
            ctx.lineTo(0, s);
            ctx.lineTo(-s * 0.6, 0);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
        ctx.globalAlpha = 1;

        // Ice glow
        const iceGlow = ctx.createRadialGradient(sx, sy, 0, sx, sy, 10);
        iceGlow.addColorStop(0, 'rgba(100, 200, 255, 0.3)');
        iceGlow.addColorStop(0.5, 'rgba(80, 180, 255, 0.1)');
        iceGlow.addColorStop(1, 'rgba(60, 160, 255, 0)');
        ctx.fillStyle = iceGlow;
        ctx.beginPath();
        ctx.arc(sx, sy, 10, 0, Math.PI * 2);
        ctx.fill();

        // Ice crystal shard - elongated diamond rotated to movement direction
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(this.angle);

        // Outer crystal
        const grad = ctx.createLinearGradient(-6, 0, 6, 0);
        grad.addColorStop(0, '#88ddff');
        grad.addColorStop(0.5, '#ccf0ff');
        grad.addColorStop(1, '#66ccee');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(7, 0);
        ctx.lineTo(0, -3);
        ctx.lineTo(-5, 0);
        ctx.lineTo(0, 3);
        ctx.closePath();
        ctx.fill();

        // Crystal edge highlight
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(7, 0);
        ctx.lineTo(0, -3);
        ctx.lineTo(-5, 0);
        ctx.stroke();

        // Inner bright core line
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-3, 0);
        ctx.lineTo(5, 0);
        ctx.stroke();

        ctx.restore();
    }
}
