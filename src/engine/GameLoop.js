export class GameLoop {
    constructor(updateFn, renderFn) {
        this.updateFn = updateFn;
        this.renderFn = renderFn;
        this.running = false;
        this.lastTime = 0;
        this.rafId = null;
        this.maxDt = 0.05; // cap at 50ms
    }

    start() {
        this.running = true;
        this.lastTime = performance.now();
        this.tick(this.lastTime);
    }

    stop() {
        this.running = false;
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
    }

    tick(now) {
        if (!this.running) return;
        this.rafId = requestAnimationFrame((t) => this.tick(t));

        let dt = (now - this.lastTime) / 1000;
        this.lastTime = now;

        if (dt > this.maxDt) dt = this.maxDt;

        this.updateFn(dt);
        this.renderFn();
    }
}
