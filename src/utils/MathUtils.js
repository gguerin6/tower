export function lerp(a, b, t) {
    return a + (b - a) * t;
}

export function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
}

export function distance(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
}

export function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomFloat(min, max) {
    return Math.random() * (max - min) + min;
}

export function randomChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

export function pointInRect(px, py, rx, ry, rw, rh) {
    return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
}

export function circlesOverlap(x1, y1, r1, x2, y2, r2) {
    return distance(x1, y1, x2, y2) < r1 + r2;
}

export function angleBetween(x1, y1, x2, y2) {
    return Math.atan2(y2 - y1, x2 - x1);
}
