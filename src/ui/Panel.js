import { UIRenderer } from '../renderer/UIRenderer.js';

export class Panel {
    constructor(x, y, w, h, alpha = 0.85) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.alpha = alpha;
        this.visible = true;
    }

    render(ctx) {
        if (!this.visible) return;
        UIRenderer.drawPanel(ctx, this.x, this.y, this.w, this.h, this.alpha);
    }

    containsPoint(x, y) {
        return x >= this.x && x <= this.x + this.w && y >= this.y && y <= this.y + this.h;
    }
}
