import { clamp } from '../utils/MathUtils.js';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../utils/Constants.js';

export class Camera {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.targetX = 0;
        this.targetY = 0;
        this.smoothing = 5;
        this.worldWidth = CANVAS_WIDTH;
        this.worldHeight = CANVAS_HEIGHT;
    }

    setWorldSize(w, h) {
        this.worldWidth = w;
        this.worldHeight = h;
    }

    follow(entity, dt) {
        this.targetX = entity.x - CANVAS_WIDTH / 2;
        this.targetY = entity.y - CANVAS_HEIGHT / 2;
        this.x += (this.targetX - this.x) * this.smoothing * dt;
        this.y += (this.targetY - this.y) * this.smoothing * dt;
        this.clamp();
    }

    clamp() {
        this.x = clamp(this.x, 0, Math.max(0, this.worldWidth - CANVAS_WIDTH));
        this.y = clamp(this.y, 0, Math.max(0, this.worldHeight - CANVAS_HEIGHT));
    }

    screenToWorld(sx, sy) {
        return { x: sx + this.x, y: sy + this.y };
    }

    worldToScreen(wx, wy) {
        return { x: wx - this.x, y: wy - this.y };
    }
}
