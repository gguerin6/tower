import { UIRenderer } from '../renderer/UIRenderer.js';

export class HealthBar {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    render(ctx, current, max) {
        UIRenderer.drawHealthBar(ctx, this.x, this.y, this.width, this.height, current, max);
    }
}
