import { SpriteRenderer } from './SpriteRenderer.js';
import { COLORS } from '../utils/Constants.js';

export class UIRenderer {
    static drawHealthBar(ctx, x, y, width, height, current, max) {
        const pct = Math.max(0, current / max);
        const barColor = pct > 0.6 ? COLORS.HEALTH_GREEN : pct > 0.3 ? COLORS.HEALTH_YELLOW : COLORS.HEALTH_RED;
        const r = Math.min(4, height / 2);

        // Background
        ctx.fillStyle = '#000';
        SpriteRenderer._rr(ctx, x - 1, y - 1, width + 2, height + 2, r + 1);
        ctx.fill();
        ctx.fillStyle = '#1a1a1a';
        SpriteRenderer._rr(ctx, x, y, width, height, r);
        ctx.fill();

        // Bar fill with smooth gradient
        if (pct > 0) {
            const grad = ctx.createLinearGradient(x, y, x, y + height);
            grad.addColorStop(0, UIRenderer._lighten(barColor, 0.15));
            grad.addColorStop(0.5, barColor);
            grad.addColorStop(1, UIRenderer._darken(barColor, 0.25));
            ctx.fillStyle = grad;
            ctx.save();
            SpriteRenderer._rr(ctx, x, y, width, height, r);
            ctx.clip();
            ctx.fillRect(x, y, width * pct, height);
            // Glossy highlight
            ctx.fillStyle = 'rgba(255,255,255,0.18)';
            ctx.fillRect(x, y, width * pct, Math.max(1, height * 0.35));
            ctx.restore();
        }

        // Subtle outer border
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 1;
        SpriteRenderer._rr(ctx, x - 1, y - 1, width + 2, height + 2, r + 1);
        ctx.stroke();
    }

    static _darken(hex, amount) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgb(${Math.floor(r * (1 - amount))},${Math.floor(g * (1 - amount))},${Math.floor(b * (1 - amount))})`;
    }

    static _lighten(hex, amount) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgb(${Math.min(255, r + Math.floor((255 - r) * amount))},${Math.min(255, g + Math.floor((255 - g) * amount))},${Math.min(255, b + Math.floor((255 - b) * amount))})`;
    }

    static drawPanel(ctx, x, y, w, h, alpha = 0.85) {
        const r = 12;
        // Outer shadow (softer, larger, scaled with alpha)
        ctx.fillStyle = `rgba(0,0,0,${0.5 * alpha / 0.85})`;
        SpriteRenderer._rr(ctx, x + 3, y + 3, w + 2, h + 2, r + 2);
        ctx.fill();

        // Panel body
        const grad = ctx.createLinearGradient(x, y, x, y + h);
        grad.addColorStop(0, `rgba(28,28,48,${alpha})`);
        grad.addColorStop(0.3, `rgba(20,20,38,${alpha})`);
        grad.addColorStop(1, `rgba(10,10,20,${alpha})`);
        ctx.fillStyle = grad;
        SpriteRenderer._rr(ctx, x, y, w, h, r);
        ctx.fill();

        // Inner top highlight
        ctx.save();
        SpriteRenderer._rr(ctx, x, y, w, h, r);
        ctx.clip();
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        ctx.fillRect(x, y, w, h * 0.15);
        ctx.restore();

        // Border
        ctx.strokeStyle = `rgba(255,255,255,${0.12 * alpha / 0.85})`;
        ctx.lineWidth = 1.5;
        SpriteRenderer._rr(ctx, x, y, w, h, r);
        ctx.stroke();
    }

    static drawButton(ctx, x, y, w, h, text, hovered = false, disabled = false) {
        const bgColor = disabled ? '#1e1e22' : hovered ? '#4a4a5a' : '#3a3a4a';
        const textColor = disabled ? '#555' : '#fff';
        const r = 8;

        ctx.fillStyle = bgColor;
        SpriteRenderer._rr(ctx, x, y, w, h, r);
        ctx.fill();
        if (hovered && !disabled) {
            ctx.fillStyle = 'rgba(255,255,255,0.04)';
            SpriteRenderer._rr(ctx, x, y, w, h / 2, r);
            ctx.fill();
        }
        ctx.strokeStyle = hovered && !disabled ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1.5;
        SpriteRenderer._rr(ctx, x, y, w, h, r);
        ctx.stroke();

        SpriteRenderer.drawText(ctx, text, x + w / 2, y + (h - 14) / 2, textColor, 14, 'center');
    }

    static drawTooltip(ctx, x, y, lines) {
        const padding = 12;
        const lineHeight = 20;
        const maxWidth = Math.max(...lines.map(l => l.text.length * 9)) + padding * 2;
        const height = lines.length * lineHeight + padding * 2;

        if (x + maxWidth > 960) x = 960 - maxWidth - 4;
        if (y + height > 640) y = 640 - height - 4;
        if (x < 4) x = 4;
        if (y < 4) y = 4;

        UIRenderer.drawPanel(ctx, x, y, maxWidth, height, 0.95);

        lines.forEach((line, i) => {
            SpriteRenderer.drawText(
                ctx, line.text,
                x + padding, y + padding + i * lineHeight,
                line.color || '#fff', line.size || 13
            );
        });
    }

    static drawSeparator(ctx, x, y, w) {
        // Subtle gradient line
        const grad = ctx.createLinearGradient(x, y, x + w, y);
        grad.addColorStop(0, 'rgba(255,255,255,0)');
        grad.addColorStop(0.2, 'rgba(255,255,255,0.08)');
        grad.addColorStop(0.5, 'rgba(255,215,0,0.2)');
        grad.addColorStop(0.8, 'rgba(255,255,255,0.08)');
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(x, y, w, 1);
    }

    static drawGoldIcon(ctx, x, y, size = 14) {
        const cx = x + size / 2;
        const cy = y + size / 2;
        // Outer circle
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
        ctx.fill();
        // Inner circle
        ctx.fillStyle = '#daa520';
        ctx.beginPath();
        ctx.arc(cx, cy, size / 3, 0, Math.PI * 2);
        ctx.fill();
        // Highlight
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.beginPath();
        ctx.arc(cx - size * 0.1, cy - size * 0.12, size / 4.5, 0, Math.PI * 2);
        ctx.fill();
        // G letter
        ctx.fillStyle = '#ffd700';
        ctx.font = `bold ${size * 0.5}px 'Nunito', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('G', cx, cy + 1);
    }

    static drawEssenceIcon(ctx, x, y, size = 14) {
        const cx = x + size / 2;
        const cy = y + size / 2;
        // Diamond shape
        ctx.fillStyle = '#66bbff';
        ctx.beginPath();
        ctx.moveTo(cx, cy - size / 2);
        ctx.lineTo(cx + size / 2.5, cy);
        ctx.lineTo(cx, cy + size / 2);
        ctx.lineTo(cx - size / 2.5, cy);
        ctx.closePath();
        ctx.fill();
        // Inner glow
        ctx.fillStyle = '#aaddff';
        ctx.beginPath();
        ctx.moveTo(cx, cy - size / 4);
        ctx.lineTo(cx + size / 5, cy);
        ctx.lineTo(cx, cy + size / 4);
        ctx.lineTo(cx - size / 5, cy);
        ctx.closePath();
        ctx.fill();
        // Highlight
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.beginPath();
        ctx.arc(cx - size * 0.08, cy - size * 0.15, size / 6, 0, Math.PI * 2);
        ctx.fill();
    }

    static drawHeartIcon(ctx, x, y, size = 14) {
        const s = size / 14;
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.arc(x + 5 * s, y + 5 * s, 4 * s, 0, Math.PI * 2);
        ctx.arc(x + 11 * s, y + 5 * s, 4 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x + 1 * s, y + 7 * s);
        ctx.lineTo(x + 8 * s, y + 14 * s);
        ctx.lineTo(x + 15 * s, y + 7 * s);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.beginPath();
        ctx.arc(x + 5 * s, y + 4 * s, 2 * s, 0, Math.PI * 2);
        ctx.fill();
    }

    // Stat icon helper for HUD — draws small colored icons
    // Skill icon — geometric pixel art for each active skill
    static drawSkillIcon(ctx, skillId, cx, cy, size, alpha = 1) {
        const s = size;
        ctx.save();
        ctx.globalAlpha = alpha;

        switch (skillId) {
            case 'whirlwind': {
                // Spinning blades — 3 curved arcs around center
                ctx.strokeStyle = '#ff8844';
                ctx.lineWidth = 2.5;
                ctx.lineCap = 'round';
                for (let i = 0; i < 3; i++) {
                    const angle = (i * Math.PI * 2) / 3;
                    ctx.beginPath();
                    ctx.arc(cx, cy, s * 0.38, angle, angle + Math.PI * 0.55);
                    ctx.stroke();
                    // Blade tip
                    const tx = cx + Math.cos(angle + Math.PI * 0.55) * s * 0.38;
                    const ty = cy + Math.sin(angle + Math.PI * 0.55) * s * 0.38;
                    ctx.fillStyle = '#ffaa44';
                    ctx.beginPath();
                    ctx.arc(tx, ty, 2.5, 0, Math.PI * 2);
                    ctx.fill();
                }
                // Center dot
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
                ctx.fill();
                break;
            }
            case 'warCry': {
                // Megaphone / shout waves
                // Head circle
                ctx.fillStyle = '#ffcc44';
                ctx.beginPath();
                ctx.arc(cx - s * 0.15, cy, s * 0.2, 0, Math.PI * 2);
                ctx.fill();
                // Sound waves (3 arcs)
                ctx.strokeStyle = '#ffdd66';
                ctx.lineWidth = 2;
                ctx.lineCap = 'round';
                for (let i = 1; i <= 3; i++) {
                    ctx.beginPath();
                    ctx.arc(cx - s * 0.05, cy, s * 0.15 + i * s * 0.1, -Math.PI * 0.4, Math.PI * 0.4);
                    ctx.stroke();
                }
                break;
            }
            case 'heal': {
                // Green cross with glow
                const cw = s * 0.22;
                const ch = s * 0.42;
                // Glow
                ctx.fillStyle = 'rgba(68,255,68,0.15)';
                ctx.beginPath();
                ctx.arc(cx, cy, s * 0.45, 0, Math.PI * 2);
                ctx.fill();
                // Cross
                ctx.fillStyle = '#44ee44';
                ctx.fillRect(cx - cw / 2, cy - ch / 2, cw, ch);
                ctx.fillRect(cx - ch / 2, cy - cw / 2, ch, cw);
                // Highlight
                ctx.fillStyle = 'rgba(255,255,255,0.3)';
                ctx.fillRect(cx - cw / 2 + 1, cy - ch / 2 + 1, cw - 2, ch * 0.35);
                break;
            }
            case 'thunderStrike': {
                // Lightning bolt
                ctx.fillStyle = '#66bbff';
                ctx.beginPath();
                ctx.moveTo(cx + s * 0.05, cy - s * 0.42);
                ctx.lineTo(cx + s * 0.22, cy - s * 0.42);
                ctx.lineTo(cx + s * 0.02, cy + s * 0.05);
                ctx.lineTo(cx + s * 0.18, cy + s * 0.05);
                ctx.lineTo(cx - s * 0.15, cy + s * 0.45);
                ctx.lineTo(cx - s * 0.02, cy + s * 0.02);
                ctx.lineTo(cx - s * 0.18, cy + s * 0.02);
                ctx.closePath();
                ctx.fill();
                // Bright core
                ctx.fillStyle = 'rgba(200,230,255,0.5)';
                ctx.beginPath();
                ctx.moveTo(cx + s * 0.08, cy - s * 0.3);
                ctx.lineTo(cx + s * 0.16, cy - s * 0.3);
                ctx.lineTo(cx + s * 0.02, cy);
                ctx.lineTo(cx - s * 0.06, cy);
                ctx.closePath();
                ctx.fill();
                break;
            }
            case 'shield': {
                // Glowing shield with inner emblem
                const sw = s * 0.42;
                const sh = s * 0.48;
                ctx.fillStyle = '#4488dd';
                ctx.beginPath();
                ctx.moveTo(cx - sw, cy - sh * 0.6);
                ctx.lineTo(cx + sw, cy - sh * 0.6);
                ctx.lineTo(cx + sw, cy + sh * 0.15);
                ctx.lineTo(cx, cy + sh);
                ctx.lineTo(cx - sw, cy + sh * 0.15);
                ctx.closePath();
                ctx.fill();
                // Inner highlight
                ctx.fillStyle = 'rgba(100,180,255,0.35)';
                ctx.beginPath();
                ctx.moveTo(cx - sw * 0.65, cy - sh * 0.45);
                ctx.lineTo(cx + sw * 0.65, cy - sh * 0.45);
                ctx.lineTo(cx + sw * 0.65, cy);
                ctx.lineTo(cx, cy + sh * 0.5);
                ctx.lineTo(cx - sw * 0.65, cy);
                ctx.closePath();
                ctx.fill();
                // Border
                ctx.strokeStyle = '#88bbff';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(cx - sw, cy - sh * 0.6);
                ctx.lineTo(cx + sw, cy - sh * 0.6);
                ctx.lineTo(cx + sw, cy + sh * 0.15);
                ctx.lineTo(cx, cy + sh);
                ctx.lineTo(cx - sw, cy + sh * 0.15);
                ctx.closePath();
                ctx.stroke();
                break;
            }
            default: {
                // Fallback — star shape
                ctx.fillStyle = '#aaa';
                ctx.beginPath();
                for (let i = 0; i < 5; i++) {
                    const angle = -Math.PI / 2 + (i * Math.PI * 2) / 5;
                    const r = i % 2 === 0 ? s * 0.38 : s * 0.18;
                    const method = i === 0 ? 'moveTo' : 'lineTo';
                    ctx[method](cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
                    const angle2 = angle + Math.PI / 5;
                    const r2 = i % 2 === 0 ? s * 0.18 : s * 0.38;
                    ctx.lineTo(cx + Math.cos(angle2) * r2, cy + Math.sin(angle2) * r2);
                }
                ctx.closePath();
                ctx.fill();
                break;
            }
        }
        ctx.restore();
    }

    // Stat icon helper for HUD — draws small colored icons
    static drawStatIcon(ctx, type, x, y, size, color) {
        ctx.fillStyle = color;
        const s = size;
        switch (type) {
            case 'sword':
                ctx.beginPath();
                ctx.moveTo(x, y + s);
                ctx.lineTo(x + s * 0.4, y);
                ctx.lineTo(x + s * 0.8, y + s);
                ctx.lineTo(x + s * 0.4, y + s * 0.75);
                ctx.closePath();
                ctx.fill();
                break;
            case 'shield':
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x + s, y);
                ctx.lineTo(x + s, y + s * 0.6);
                ctx.lineTo(x + s * 0.5, y + s);
                ctx.lineTo(x, y + s * 0.6);
                ctx.closePath();
                ctx.fill();
                break;
            case 'arrow':
                ctx.beginPath();
                ctx.moveTo(x, y + s * 0.5);
                ctx.lineTo(x + s, y);
                ctx.lineTo(x + s, y + s);
                ctx.closePath();
                ctx.fill();
                ctx.fillRect(x - s * 0.3, y + s * 0.3, s * 0.5, s * 0.4);
                break;
            case 'cross':
                ctx.fillRect(x + s * 0.3, y, s * 0.4, s);
                ctx.fillRect(x, y + s * 0.3, s, s * 0.4);
                break;
        }
    }
}
