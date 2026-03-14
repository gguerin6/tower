import { CANVAS_WIDTH, CANVAS_HEIGHT, LAYERS } from '../utils/Constants.js';

export class CanvasRenderer {
    constructor() {
        this.layers = {};
        this.contexts = {};

        for (const [key, id] of Object.entries(LAYERS)) {
            const canvas = document.getElementById(id);
            canvas.width = CANVAS_WIDTH;
            canvas.height = CANVAS_HEIGHT;
            this.layers[key] = canvas;
            this.contexts[key] = canvas.getContext('2d');
        }
    }

    getCtx(layer) {
        return this.contexts[layer] || this.contexts.ENTITY;
    }

    clear(layer) {
        const ctx = this.contexts[layer];
        if (ctx) {
            ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        }
    }

    clearAll() {
        for (const key of Object.keys(this.contexts)) {
            this.clear(key);
        }
    }

    clearEntity() {
        this.clear('ENTITY');
    }

    clearUI() {
        this.clear('UI');
    }

    get bg() { return this.contexts.BG; }
    get entity() { return this.contexts.ENTITY; }
    get ui() { return this.contexts.UI; }

    getTopCanvas() {
        return this.layers.UI;
    }
}
