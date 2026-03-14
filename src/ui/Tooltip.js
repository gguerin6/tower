import { UIRenderer } from '../renderer/UIRenderer.js';

export class Tooltip {
    constructor() {
        this.visible = false;
        this.x = 0;
        this.y = 0;
        this.lines = [];
    }

    show(x, y, lines) {
        this.visible = true;
        this.x = x;
        this.y = y;
        this.lines = lines;
    }

    hide() {
        this.visible = false;
    }

    render(ctx) {
        if (!this.visible || this.lines.length === 0) return;
        UIRenderer.drawTooltip(ctx, this.x, this.y, this.lines);
    }
}
