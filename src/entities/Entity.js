export class Entity {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.active = true;

        // Animation
        this.animTimer = 0;
        this.animFrame = 0;
        this.animSpeed = 4; // frames per second
        this.animFrames = 1;
        this.state = 'idle'; // idle, walk, attack, die

        // 2.5D depth sort key (higher y = drawn later = in front)
        this.sortY = y;
    }

    update(dt) {
        this.animTimer += dt;
        if (this.animTimer >= 1 / this.animSpeed) {
            this.animTimer -= 1 / this.animSpeed;
            this.animFrame = (this.animFrame + 1) % this.animFrames;
        }
        this.sortY = this.y;
    }

    render(ctx) {}

    getBounds() {
        return {
            x: this.x - this.width / 2,
            y: this.y - this.height / 2,
            width: this.width,
            height: this.height
        };
    }

    containsPoint(px, py) {
        const b = this.getBounds();
        return px >= b.x && px <= b.x + b.width && py >= b.y && py <= b.y + b.height;
    }

    distanceTo(other) {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
}
