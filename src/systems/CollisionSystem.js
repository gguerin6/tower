import { distance } from '../utils/MathUtils.js';

export class CollisionSystem {
    static checkCircleCollision(x1, y1, r1, x2, y2, r2) {
        return distance(x1, y1, x2, y2) < r1 + r2;
    }

    static checkAABB(a, b) {
        const ab = a.getBounds();
        const bb = b.getBounds();
        return ab.x < bb.x + bb.width &&
               ab.x + ab.width > bb.x &&
               ab.y < bb.y + bb.height &&
               ab.y + ab.height > bb.y;
    }

    static getEntitiesAtPoint(entities, x, y) {
        return entities.filter(e => e.active && e.containsPoint(x, y));
    }

    static getEntitiesInRadius(entities, x, y, radius) {
        return entities.filter(e =>
            e.active && distance(x, y, e.x, e.y) <= radius
        );
    }
}
