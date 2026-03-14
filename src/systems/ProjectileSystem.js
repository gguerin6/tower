import { Projectile } from '../entities/Projectile.js';

export class ProjectileSystem {
    constructor() {
        this.projectiles = [];
        this.effects = []; // Visual-only effects (lightning bolts, impacts)
    }

    add(config) {
        const proj = new Projectile(config);
        this.projectiles.push(proj);

        // Tesla: add lightning bolt visual effect
        if (proj.instant && config.type === 'tesla') {
            this._addLightningBolt(config.startX, config.startY, config.target.x, config.target.y);
        }

        return proj;
    }

    _addLightningBolt(x1, y1, x2, y2) {
        // Generate jagged lightning segments
        const segments = [];
        const dx = x2 - x1;
        const dy = y2 - y1;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const steps = Math.max(4, Math.floor(dist / 12));
        const perpX = -dy / dist;
        const perpY = dx / dist;

        segments.push({ x: x1, y: y1 });
        for (let i = 1; i < steps; i++) {
            const t = i / steps;
            const offset = (Math.random() - 0.5) * 14;
            segments.push({
                x: x1 + dx * t + perpX * offset,
                y: y1 + dy * t + perpY * offset
            });
        }
        segments.push({ x: x2, y: y2 });

        // Add branch bolts
        const branches = [];
        for (let i = 1; i < segments.length - 1; i++) {
            if (Math.random() < 0.4) {
                const s = segments[i];
                const branchLen = 8 + Math.random() * 10;
                const branchAngle = Math.atan2(dy, dx) + (Math.random() - 0.5) * Math.PI;
                branches.push({
                    x1: s.x, y1: s.y,
                    x2: s.x + Math.cos(branchAngle) * branchLen,
                    y2: s.y + Math.sin(branchAngle) * branchLen
                });
            }
        }

        this.effects.push({
            type: 'lightning',
            segments,
            branches,
            life: 0.25,
            maxLife: 0.25,
            x2, y2 // impact point
        });
    }

    addImpactEffect(x, y, element) {
        if (element === 'fire') {
            this.effects.push({
                type: 'explosion',
                x, y,
                life: 0.35,
                maxLife: 0.35,
                color1: '#ff6622',
                color2: '#ffaa44',
                radius: 16
            });
        } else if (element === 'ice') {
            this.effects.push({
                type: 'frost_burst',
                x, y,
                life: 0.3,
                maxLife: 0.3
            });
        } else if (element === 'magic') {
            this.effects.push({
                type: 'magic_burst',
                x, y,
                life: 0.25,
                maxLife: 0.25
            });
        }
    }

    update(dt) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            this.projectiles[i].update(dt);
            if (!this.projectiles[i].active) {
                // Keep inactive for combat processing this frame
            }
        }

        // Update visual effects
        for (let i = this.effects.length - 1; i >= 0; i--) {
            this.effects[i].life -= dt;
            if (this.effects[i].life <= 0) {
                this.effects.splice(i, 1);
            }
        }
    }

    getHits() {
        const hits = this.projectiles.filter(p => !p.active);
        this.projectiles = this.projectiles.filter(p => p.active);
        return hits;
    }

    render(ctx, camX = 0, camY = 0) {
        // Render effects first (behind projectiles)
        for (const fx of this.effects) {
            this._renderEffect(ctx, fx, camX, camY);
        }

        for (const proj of this.projectiles) {
            proj.render(ctx, camX, camY);
        }
    }

    _renderEffect(ctx, fx, camX, camY) {
        const t = fx.life / fx.maxLife; // 1 = fresh, 0 = gone

        if (fx.type === 'lightning') {
            this._renderLightning(ctx, fx, t, camX, camY);
        } else if (fx.type === 'explosion') {
            this._renderExplosion(ctx, fx, t, camX, camY);
        } else if (fx.type === 'frost_burst') {
            this._renderFrostBurst(ctx, fx, t, camX, camY);
        } else if (fx.type === 'magic_burst') {
            this._renderMagicBurst(ctx, fx, t, camX, camY);
        }
    }

    _renderLightning(ctx, fx, t, camX, camY) {
        const segs = fx.segments;
        const alpha = t;

        // Outer glow bolt
        ctx.globalAlpha = alpha * 0.4;
        ctx.strokeStyle = '#ffee33';
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(segs[0].x - camX, segs[0].y - camY);
        for (let i = 1; i < segs.length; i++) {
            ctx.lineTo(segs[i].x - camX, segs[i].y - camY);
        }
        ctx.stroke();

        // Main bright bolt
        ctx.globalAlpha = alpha * 0.9;
        ctx.strokeStyle = '#ffffaa';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(segs[0].x - camX, segs[0].y - camY);
        for (let i = 1; i < segs.length; i++) {
            ctx.lineTo(segs[i].x - camX, segs[i].y - camY);
        }
        ctx.stroke();

        // White core
        ctx.globalAlpha = alpha * 0.7;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(segs[0].x - camX, segs[0].y - camY);
        for (let i = 1; i < segs.length; i++) {
            ctx.lineTo(segs[i].x - camX, segs[i].y - camY);
        }
        ctx.stroke();

        // Branches
        ctx.globalAlpha = alpha * 0.5;
        ctx.strokeStyle = '#ffee88';
        ctx.lineWidth = 1;
        for (const b of fx.branches) {
            ctx.beginPath();
            ctx.moveTo(b.x1 - camX, b.y1 - camY);
            ctx.lineTo(b.x2 - camX, b.y2 - camY);
            ctx.stroke();
        }

        // Impact flash at target
        const impX = fx.x2 - camX;
        const impY = fx.y2 - camY;
        ctx.globalAlpha = alpha * 0.6;
        const impGlow = ctx.createRadialGradient(impX, impY, 0, impX, impY, 12 * t);
        impGlow.addColorStop(0, 'rgba(255, 255, 200, 0.8)');
        impGlow.addColorStop(0.5, 'rgba(255, 238, 50, 0.3)');
        impGlow.addColorStop(1, 'rgba(255, 200, 0, 0)');
        ctx.fillStyle = impGlow;
        ctx.beginPath();
        ctx.arc(impX, impY, 12 * t, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 1;
        ctx.lineCap = 'butt';
        ctx.lineJoin = 'miter';
    }

    _renderExplosion(ctx, fx, t, camX, camY) {
        const sx = fx.x - camX;
        const sy = fx.y - camY;
        const r = fx.radius * (1 - t * 0.3);
        const expandT = 1 - t; // 0 = start, 1 = end

        // Outer shockwave ring
        ctx.globalAlpha = t * 0.4;
        ctx.strokeStyle = '#ff8844';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(sx, sy, r * (0.5 + expandT * 0.8), 0, Math.PI * 2);
        ctx.stroke();

        // Fire glow
        ctx.globalAlpha = t * 0.6;
        const fireGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * (0.3 + expandT * 0.5));
        fireGrad.addColorStop(0, 'rgba(255, 240, 180, 0.8)');
        fireGrad.addColorStop(0.3, fx.color2);
        fireGrad.addColorStop(0.7, fx.color1);
        fireGrad.addColorStop(1, 'rgba(200, 50, 0, 0)');
        ctx.fillStyle = fireGrad;
        ctx.beginPath();
        ctx.arc(sx, sy, r * (0.3 + expandT * 0.5), 0, Math.PI * 2);
        ctx.fill();

        // Sparks
        ctx.globalAlpha = t * 0.7;
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2 + expandT * 2;
            const sparkDist = r * expandT * 0.8;
            const px = sx + Math.cos(angle) * sparkDist;
            const py = sy + Math.sin(angle) * sparkDist;
            ctx.fillStyle = '#ffcc44';
            ctx.beginPath();
            ctx.arc(px, py, 1.5 * t, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.globalAlpha = 1;
    }

    _renderFrostBurst(ctx, fx, t, camX, camY) {
        const sx = fx.x - camX;
        const sy = fx.y - camY;

        // Ice ring
        ctx.globalAlpha = t * 0.5;
        ctx.strokeStyle = '#88ddff';
        ctx.lineWidth = 1.5;
        const ringR = 10 * (1 - t) + 4;
        ctx.beginPath();
        ctx.arc(sx, sy, ringR, 0, Math.PI * 2);
        ctx.stroke();

        // Frost crystals expanding outward
        ctx.globalAlpha = t * 0.7;
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const dist = 4 + (1 - t) * 10;
            const px = sx + Math.cos(angle) * dist;
            const py = sy + Math.sin(angle) * dist;

            ctx.fillStyle = '#ccf0ff';
            ctx.save();
            ctx.translate(px, py);
            ctx.rotate(angle);
            ctx.beginPath();
            ctx.moveTo(0, -2 * t);
            ctx.lineTo(1.2 * t, 0);
            ctx.lineTo(0, 2 * t);
            ctx.lineTo(-1.2 * t, 0);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }

        ctx.globalAlpha = 1;
    }

    _renderMagicBurst(ctx, fx, t, camX, camY) {
        const sx = fx.x - camX;
        const sy = fx.y - camY;

        // Purple glow
        ctx.globalAlpha = t * 0.5;
        const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, 10 * (1 - t * 0.5));
        glow.addColorStop(0, 'rgba(200, 150, 255, 0.6)');
        glow.addColorStop(0.6, 'rgba(140, 80, 220, 0.2)');
        glow.addColorStop(1, 'rgba(100, 50, 180, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(sx, sy, 10 * (1 - t * 0.5), 0, Math.PI * 2);
        ctx.fill();

        // Sparkle particles
        ctx.globalAlpha = t * 0.8;
        for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2 + (1 - t) * 3;
            const dist = 3 + (1 - t) * 8;
            const px = sx + Math.cos(angle) * dist;
            const py = sy + Math.sin(angle) * dist;
            ctx.fillStyle = '#ddbbff';
            ctx.beginPath();
            ctx.arc(px, py, 1.2 * t, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.globalAlpha = 1;
    }

    clear() {
        this.projectiles = [];
        this.effects = [];
    }
}
