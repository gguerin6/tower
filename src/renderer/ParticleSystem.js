import { randomFloat } from '../utils/MathUtils.js';

class Particle {
    constructor(x, y, vx, vy, life, color, size) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.life = life;
        this.maxLife = life;
        this.color = color;
        this.size = size;
    }

    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.life -= dt;
        this.vy += 30 * dt; // gravity
    }

    get alpha() {
        return Math.max(0, this.life / this.maxLife);
    }

    get alive() {
        return this.life > 0;
    }
}

export class ParticleSystem {
    constructor() {
        this.particles = [];
    }

    emit(x, y, count, config = {}) {
        const {
            color = '#fff',
            speed = 80,
            life = 0.6,
            size = 3,
            spread = Math.PI * 2,
            angle = -Math.PI / 2,
            gravity = true
        } = config;

        for (let i = 0; i < count; i++) {
            const a = angle + randomFloat(-spread / 2, spread / 2);
            const s = randomFloat(speed * 0.5, speed);
            const p = new Particle(
                x, y,
                Math.cos(a) * s,
                Math.sin(a) * s,
                randomFloat(life * 0.5, life),
                color,
                randomFloat(size * 0.5, size)
            );
            if (!gravity) p.vy = Math.sin(a) * s;
            this.particles.push(p);
        }
    }

    update(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update(dt);
            if (!this.particles[i].alive) {
                this.particles.splice(i, 1);
            }
        }
    }

    render(ctx) {
        for (const p of this.particles) {
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            ctx.fillRect(Math.round(p.x - p.size / 2), Math.round(p.y - p.size / 2), p.size, p.size);
        }
        ctx.globalAlpha = 1;
    }

    clear() {
        this.particles = [];
    }
}
