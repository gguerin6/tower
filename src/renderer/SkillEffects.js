// Dedicated visual effects for each active skill
// Each effect is a timed animation rendered on the entity canvas

export class SkillEffects {
    constructor() {
        this.effects = [];
    }

    add(type, x, y, radius = 0) {
        switch (type) {
            case 'whirlwind':
                this.effects.push({
                    type, x, y, radius,
                    timer: 0, duration: 0.6,
                    rotation: 0
                });
                break;
            case 'warCry':
                this.effects.push({
                    type, x, y, radius,
                    timer: 0, duration: 0.8,
                    rings: 3
                });
                break;
            case 'heal':
                this.effects.push({
                    type, x, y, radius: 0,
                    timer: 0, duration: 1.0,
                    particles: this._makeHealParticles(x, y)
                });
                break;
            case 'thunderStrike':
                this.effects.push({
                    type, x, y, radius,
                    timer: 0, duration: 0.7,
                    bolts: this._makeBolts(x, y),
                    flashTimer: 0.1
                });
                break;
            case 'shield':
                this.effects.push({
                    type, x, y, radius: 0,
                    timer: 0, duration: 0.5,
                    hexAngles: [0, 1, 2, 3, 4, 5].map(i => i * Math.PI / 3)
                });
                break;
        }
    }

    _makeHealParticles(x, y) {
        const particles = [];
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            const dist = 15 + Math.random() * 20;
            particles.push({
                startX: x + Math.cos(angle) * dist,
                startY: y + 10 + Math.random() * 10,
                x: x + Math.cos(angle) * dist,
                y: y + 10 + Math.random() * 10,
                targetY: y - 20 - Math.random() * 15,
                size: 2 + Math.random() * 2,
                delay: Math.random() * 0.3
            });
        }
        return particles;
    }

    _makeBolts(x, y) {
        const bolts = [];
        for (let i = 0; i < 3; i++) {
            const segments = [];
            const startX = x + (Math.random() - 0.5) * 30;
            const startY = y - 80 - Math.random() * 40;
            let bx = startX, by = startY;
            const steps = 5 + Math.floor(Math.random() * 3);
            for (let s = 0; s < steps; s++) {
                const t = (s + 1) / steps;
                const nx = startX + (x - startX) * t + (Math.random() - 0.5) * 20;
                const ny = startY + (y - startY) * t;
                segments.push({ x1: bx, y1: by, x2: nx, y2: ny });
                bx = nx;
                by = ny;
            }
            bolts.push({ segments, delay: i * 0.08 });
        }
        return bolts;
    }

    update(dt) {
        for (let i = this.effects.length - 1; i >= 0; i--) {
            const e = this.effects[i];
            e.timer += dt;
            if (e.type === 'whirlwind') {
                e.rotation += dt * 14;
            }
            if (e.timer >= e.duration) {
                this.effects.splice(i, 1);
            }
        }
    }

    render(ctx, camX = 0, camY = 0) {
        for (const e of this.effects) {
            const ex = e.x - camX;
            const ey = e.y - camY;
            const t = e.timer / e.duration; // 0..1 progress

            switch (e.type) {
                case 'whirlwind':
                    this._renderWhirlwind(ctx, ex, ey, e, t);
                    break;
                case 'warCry':
                    this._renderWarCry(ctx, ex, ey, e, t);
                    break;
                case 'heal':
                    this._renderHeal(ctx, ex, ey, e, t, camX, camY);
                    break;
                case 'thunderStrike':
                    this._renderThunderStrike(ctx, ex, ey, e, t);
                    break;
                case 'shield':
                    this._renderShield(ctx, ex, ey, e, t);
                    break;
            }
        }
    }

    _renderWhirlwind(ctx, x, y, e, t) {
        const alpha = t < 0.2 ? t / 0.2 : t > 0.7 ? (1 - t) / 0.3 : 1;
        const r = e.radius * (0.3 + t * 0.7);

        // Spinning arc slashes
        ctx.save();
        ctx.globalAlpha = alpha * 0.6;
        const bladeCount = 4;
        for (let i = 0; i < bladeCount; i++) {
            const angle = e.rotation + (i / bladeCount) * Math.PI * 2;
            const bladeLen = r * 0.9;

            // Main blade arc
            ctx.strokeStyle = '#ffaa00';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(x, y, bladeLen, angle - 0.4, angle + 0.4);
            ctx.stroke();

            // Inner bright arc
            ctx.strokeStyle = '#ffdd44';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(x, y, bladeLen * 0.85, angle - 0.3, angle + 0.3);
            ctx.stroke();
        }

        // Center swirl
        ctx.strokeStyle = '#ffcc22';
        ctx.lineWidth = 2;
        ctx.globalAlpha = alpha * 0.4;
        ctx.beginPath();
        ctx.arc(x, y, r * 0.3, e.rotation, e.rotation + Math.PI * 1.5);
        ctx.stroke();

        // Sparks flying outward
        ctx.globalAlpha = alpha * 0.8;
        for (let i = 0; i < 8; i++) {
            const sa = e.rotation * 0.7 + (i / 8) * Math.PI * 2;
            const sd = r * (0.5 + t * 0.5);
            const sx = x + Math.cos(sa) * sd;
            const sy = y + Math.sin(sa) * sd;
            ctx.fillStyle = i % 2 === 0 ? '#ffaa00' : '#ffdd66';
            ctx.fillRect(sx - 1.5, sy - 1.5, 3, 3);
        }

        ctx.restore();
    }

    _renderWarCry(ctx, x, y, e, t) {
        ctx.save();

        // Expanding shockwave rings
        for (let i = 0; i < e.rings; i++) {
            const ringT = Math.max(0, t - i * 0.12);
            if (ringT <= 0) continue;
            const ringProgress = Math.min(ringT / 0.6, 1);
            const ringR = e.radius * ringProgress;
            const ringAlpha = (1 - ringProgress) * 0.5;

            ctx.globalAlpha = ringAlpha;
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 3 - i * 0.8;
            ctx.beginPath();
            ctx.arc(x, y, ringR, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Upward energy lines around hero
        ctx.globalAlpha = (1 - t) * 0.7;
        const lineCount = 8;
        for (let i = 0; i < lineCount; i++) {
            const angle = (i / lineCount) * Math.PI * 2;
            const dist = 16 + Math.sin(t * 8 + i) * 4;
            const lx = x + Math.cos(angle) * dist;
            const ly = y + Math.sin(angle) * dist;
            const height = 15 + t * 20;

            ctx.strokeStyle = i % 2 === 0 ? '#ffa500' : '#ffd700';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(lx, ly);
            ctx.lineTo(lx, ly - height);
            ctx.stroke();

            // Arrow tip
            ctx.fillStyle = '#ffd700';
            ctx.beginPath();
            ctx.moveTo(lx, ly - height - 4);
            ctx.lineTo(lx - 3, ly - height + 2);
            ctx.lineTo(lx + 3, ly - height + 2);
            ctx.closePath();
            ctx.fill();
        }

        ctx.restore();
    }

    _renderHeal(ctx, x, y, e, t, camX, camY) {
        ctx.save();

        // Rising green crosses/particles
        for (const p of e.particles) {
            const pt = Math.max(0, t - p.delay);
            if (pt <= 0) continue;
            const progress = Math.min(pt / 0.7, 1);
            p.x = p.startX - camX;
            p.y = (p.startY + (p.targetY - p.startY) * progress) - camY;
            const alpha = progress < 0.8 ? 1 : (1 - progress) / 0.2;

            ctx.globalAlpha = alpha * 0.9;

            // Draw small cross
            const s = p.size;
            ctx.fillStyle = '#44ff44';
            ctx.fillRect(p.x - s / 2, p.y - s, s, s * 2);
            ctx.fillRect(p.x - s, p.y - s / 2, s * 2, s);

            // Glow
            ctx.globalAlpha = alpha * 0.3;
            ctx.fillStyle = '#88ff88';
            ctx.beginPath();
            ctx.arc(p.x, p.y, s * 2, 0, Math.PI * 2);
            ctx.fill();
        }

        // Central green glow pulse
        const pulseAlpha = t < 0.3 ? t / 0.3 : (1 - t) / 0.7;
        ctx.globalAlpha = pulseAlpha * 0.25;
        ctx.fillStyle = '#44ff44';
        ctx.beginPath();
        ctx.arc(x, y, 22 + t * 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    _renderThunderStrike(ctx, x, y, e, t) {
        ctx.save();

        // Ground impact circle
        const impactT = Math.min(t / 0.15, 1);
        const impactR = e.radius * impactT;
        const impactAlpha = (1 - t) * 0.5;
        ctx.globalAlpha = impactAlpha;
        ctx.fillStyle = '#ffff44';
        ctx.beginPath();
        ctx.arc(x, y, impactR, 0, Math.PI * 2);
        ctx.fill();

        // Ground ring
        ctx.globalAlpha = impactAlpha * 1.5;
        ctx.strokeStyle = '#ffee00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, impactR, 0, Math.PI * 2);
        ctx.stroke();

        // Lightning bolts from sky
        for (const bolt of e.bolts) {
            const boltT = Math.max(0, t - bolt.delay);
            if (boltT <= 0) continue;
            const boltAlpha = boltT < 0.1 ? 1 : Math.max(0, 1 - (boltT - 0.1) / 0.4);

            // Outer glow
            ctx.globalAlpha = boltAlpha * 0.4;
            ctx.strokeStyle = '#ffffaa';
            ctx.lineWidth = 5;
            ctx.beginPath();
            for (const seg of bolt.segments) {
                ctx.moveTo(seg.x1 - (e.x - x) + x - e.x, seg.y1 - (e.y - y) + y - e.y);
                ctx.lineTo(seg.x2 - (e.x - x) + x - e.x, seg.y2 - (e.y - y) + y - e.y);
            }
            ctx.stroke();

            // Core bolt
            ctx.globalAlpha = boltAlpha * 0.9;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            for (const seg of bolt.segments) {
                const ox = x - e.x;
                const oy = y - e.y;
                ctx.moveTo(seg.x1 + ox, seg.y1 + oy);
                ctx.lineTo(seg.x2 + ox, seg.y2 + oy);
            }
            ctx.stroke();
        }

        // Flash
        if (e.flashTimer > 0 && t < 0.1) {
            ctx.globalAlpha = (1 - t / 0.1) * 0.15;
            ctx.fillStyle = '#fff';
            ctx.fillRect(x - 200, y - 200, 400, 400);
        }

        // Electric sparks on ground
        ctx.globalAlpha = (1 - t) * 0.7;
        const sparkCount = 6;
        for (let i = 0; i < sparkCount; i++) {
            const sa = (i / sparkCount) * Math.PI * 2 + t * 4;
            const sd = e.radius * 0.6 * (0.5 + Math.sin(t * 12 + i * 2) * 0.5);
            const sx = x + Math.cos(sa) * sd;
            const sy = y + Math.sin(sa) * sd;
            ctx.fillStyle = '#ffff88';
            ctx.fillRect(sx - 1, sy - 1, 2, 2);
            // Small arc from spark
            ctx.strokeStyle = '#ffee44';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(sx + (Math.random() - 0.5) * 8, sy + (Math.random() - 0.5) * 8);
            ctx.stroke();
        }

        ctx.restore();
    }

    _renderShield(ctx, x, y, e, t) {
        ctx.save();

        const shieldR = 24;

        // Expanding hexagonal segments appearing
        const segAlpha = t < 0.3 ? t / 0.3 : t > 0.7 ? (1 - t) / 0.3 : 1;
        ctx.globalAlpha = segAlpha * 0.6;

        // Hexagon outline forming segment by segment
        const segmentsVisible = Math.min(6, Math.floor(t / 0.05) + 1);
        for (let i = 0; i < segmentsVisible; i++) {
            const a1 = e.hexAngles[i] - Math.PI / 2;
            const a2 = e.hexAngles[(i + 1) % 6] - Math.PI / 2;
            const expandT = Math.min(1, t / 0.2);
            const r = shieldR * expandT;

            ctx.strokeStyle = '#66bbff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x + Math.cos(a1) * r, y + Math.sin(a1) * r);
            ctx.lineTo(x + Math.cos(a2) * r, y + Math.sin(a2) * r);
            ctx.stroke();
        }

        // Inner fill
        if (t > 0.15) {
            const fillAlpha = Math.min((t - 0.15) / 0.2, 1) * 0.15 * (1 - Math.max(0, (t - 0.7) / 0.3));
            ctx.globalAlpha = fillAlpha;
            ctx.fillStyle = '#4488ff';
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const a = e.hexAngles[i] - Math.PI / 2;
                const r = shieldR;
                if (i === 0) ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
                else ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
            }
            ctx.closePath();
            ctx.fill();
        }

        // Bright vertices
        ctx.globalAlpha = segAlpha * 0.9;
        for (let i = 0; i < segmentsVisible; i++) {
            const a = e.hexAngles[i] - Math.PI / 2;
            const r = shieldR * Math.min(1, t / 0.2);
            ctx.fillStyle = '#aaddff';
            ctx.beginPath();
            ctx.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, 2, 0, Math.PI * 2);
            ctx.fill();
        }

        // Rune/magic sparkles
        if (t > 0.1) {
            ctx.globalAlpha = (1 - t) * 0.5;
            for (let i = 0; i < 4; i++) {
                const sa = t * 3 + i * Math.PI / 2;
                const sd = shieldR + 4 + Math.sin(t * 8 + i) * 3;
                ctx.fillStyle = '#88ccff';
                ctx.fillRect(x + Math.cos(sa) * sd - 1, y + Math.sin(sa) * sd - 1, 2, 2);
            }
        }

        ctx.restore();
    }

    clear() {
        this.effects = [];
    }
}
