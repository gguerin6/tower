import { SpriteRenderer } from '../renderer/SpriteRenderer.js';
import { pointInRect } from '../utils/MathUtils.js';

export class Button {
    constructor(x, y, w, h, text, onClick, options = {}) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.text = text;
        this.onClick = onClick;
        this.hovered = false;
        this.disabled = options.disabled || false;
        this.color = options.color || '#3a3a4a';
        this.hoverColor = options.hoverColor || '#4a4a6a';
        this.textColor = options.textColor || '#fff';
        this.fontSize = options.fontSize || 14;
        this.visible = options.visible !== undefined ? options.visible : true;
        this.icon = options.icon || null; // optional icon text drawn left of label
    }

    containsPoint(x, y) {
        return pointInRect(x, y, this.x, this.y, this.w, this.h);
    }

    handleMouseMove(x, y) {
        this.hovered = this.containsPoint(x, y) && !this.disabled;
    }

    handleClick(x, y) {
        if (!this.visible || this.disabled) return false;
        if (this.containsPoint(x, y)) {
            this.onClick();
            return true;
        }
        return false;
    }

    render(ctx) {
        if (!this.visible) return;

        const bg = this.disabled ? '#1e1e22' : this.hovered ? this.hoverColor : this.color;
        const tc = this.disabled ? '#555' : this.textColor;

        const r = 8;
        const x = this.x, y = this.y, w = this.w, h = this.h;

        // Drop shadow
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        SpriteRenderer._rr(ctx, x + 1, y + 2, w, h, r);
        ctx.fill();

        // Button body gradient
        const g = ctx.createLinearGradient(x, y, x, y + h);
        if (this.disabled) {
            g.addColorStop(0, '#1e1e22');
            g.addColorStop(1, '#141418');
        } else {
            g.addColorStop(0, this._lighten(bg, 0.08));
            g.addColorStop(1, this._darken(bg, 0.18));
        }
        ctx.fillStyle = g;
        SpriteRenderer._rr(ctx, x, y, w, h, r);
        ctx.fill();

        // Inner highlight (top edge)
        if (!this.disabled) {
            ctx.fillStyle = 'rgba(255,255,255,0.08)';
            ctx.save();
            SpriteRenderer._rr(ctx, x, y, w, h, r);
            ctx.clip();
            ctx.fillRect(x, y, w, h * 0.4);
            ctx.restore();
        }

        // Hover glow
        if (this.hovered && !this.disabled) {
            ctx.fillStyle = 'rgba(255,255,255,0.04)';
            SpriteRenderer._rr(ctx, x, y, w, h, r);
            ctx.fill();
        }

        // Border
        ctx.strokeStyle = this.disabled ? '#2a2a2e' : this.hovered ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.12)';
        ctx.lineWidth = 1.5;
        SpriteRenderer._rr(ctx, x, y, w, h, r);
        ctx.stroke();

        // Inner border (subtle inset)
        if (!this.disabled) {
            ctx.strokeStyle = 'rgba(255,255,255,0.04)';
            ctx.lineWidth = 1;
            SpriteRenderer._rr(ctx, x + 1, y + 1, w - 2, h - 2, r - 1);
            ctx.stroke();
        }

        // Text - vertically centered properly
        const textY = y + (h - this.fontSize) / 2;
        SpriteRenderer.drawText(ctx, this.text, x + w / 2, textY, tc, this.fontSize, 'center');
    }

    _darken(hex, amount) {
        if (!hex || !hex.startsWith('#')) return hex;
        const r = parseInt(hex.slice(1, 3), 16) || 0;
        const g = parseInt(hex.slice(3, 5), 16) || 0;
        const b = parseInt(hex.slice(5, 7), 16) || 0;
        return `rgb(${Math.floor(r * (1 - amount))},${Math.floor(g * (1 - amount))},${Math.floor(b * (1 - amount))})`;
    }

    _lighten(hex, amount) {
        if (!hex || !hex.startsWith('#')) return hex;
        const r = parseInt(hex.slice(1, 3), 16) || 0;
        const g = parseInt(hex.slice(3, 5), 16) || 0;
        const b = parseInt(hex.slice(5, 7), 16) || 0;
        return `rgb(${Math.min(255, Math.floor(r + (255 - r) * amount))},${Math.min(255, Math.floor(g + (255 - g) * amount))},${Math.min(255, Math.floor(b + (255 - b) * amount))})`;
    }
}
