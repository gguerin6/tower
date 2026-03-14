export class InputManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.mouseX = 0;
        this.mouseY = 0;
        this.keys = {};
        this.mouseButtons = {};
        this.listeners = {
            mousedown: [],
            mouseup: [],
            mousemove: [],
            keydown: [],
            keyup: [],
            wheel: []
        };

        this.setupListeners();
    }

    setupListeners() {
        this.canvas.addEventListener('mousedown', (e) => {
            e.preventDefault();
            const pos = this.getCanvasPos(e);
            this.mouseX = pos.x;
            this.mouseY = pos.y;
            this.mouseButtons[e.button] = true;
            for (const cb of this.listeners.mousedown) {
                cb(pos.x, pos.y, e.button);
            }
        });

        this.canvas.addEventListener('mouseup', (e) => {
            e.preventDefault();
            const pos = this.getCanvasPos(e);
            this.mouseX = pos.x;
            this.mouseY = pos.y;
            this.mouseButtons[e.button] = false;
            for (const cb of this.listeners.mouseup) {
                cb(pos.x, pos.y, e.button);
            }
        });

        this.canvas.addEventListener('mousemove', (e) => {
            const pos = this.getCanvasPos(e);
            this.mouseX = pos.x;
            this.mouseY = pos.y;
            for (const cb of this.listeners.mousemove) {
                cb(pos.x, pos.y);
            }
        });

        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            for (const cb of this.listeners.wheel) {
                cb(e.deltaY);
            }
        }, { passive: false });

        window.addEventListener('keydown', (e) => {
            // Prevent default for game keys (Tab, Space, arrows)
            if (['Tab', ' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault();
            }
            this.keys[e.key] = true;
            for (const cb of this.listeners.keydown) {
                cb(e.key);
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
            for (const cb of this.listeners.keyup) {
                cb(e.key);
            }
        });
    }

    getCanvasPos(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    }

    onMouseDown(cb) { this.listeners.mousedown.push(cb); }
    onMouseUp(cb) { this.listeners.mouseup.push(cb); }
    onMouseMove(cb) { this.listeners.mousemove.push(cb); }
    onKeyDown(cb) { this.listeners.keydown.push(cb); }
    onKeyUp(cb) { this.listeners.keyup.push(cb); }
    onWheel(cb) { this.listeners.wheel.push(cb); }

    isKeyDown(key) { return !!this.keys[key]; }
}
