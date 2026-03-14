import { Entity } from './Entity.js';
import { SpriteRenderer } from '../renderer/SpriteRenderer.js';
import { TILE_SIZE } from '../utils/Constants.js';

const S = TILE_SIZE;

// Preload NPC sprite images
const npcImages = {};
const npcImageMap = {
    blacksmith: 'blacksmith',
    elder: 'elder',
    sage: 'wizzard',
    merchant: 'merchand'
};
for (const [type, file] of Object.entries(npcImageMap)) {
    const img = new Image();
    img.src = `assets/${file}.png`;
    npcImages[type] = img;
}

export class NPC extends Entity {
    constructor(x, y, type, name) {
        super(x, y, TILE_SIZE, TILE_SIZE * 1.2);
        this.type = type;
        this.name = name;
        this.interactRadius = TILE_SIZE * 2;
        this.animTimer = 0;
    }

    update(dt) {
        this.animTimer += dt;
    }

    render(ctx, camX = 0, camY = 0, hovered = false) {
        const sx = this.x - camX;
        const sy = this.y - camY;
        const bob = Math.sin(this.animTimer * 2) * 1;

        let spriteTopY = sy - S * 2; // default fallback

        if (this.type === 'portal') {
            this._drawPortal(ctx, sx, sy);
            spriteTopY = sy - 38;
        } else if (this.type === 'questboard') {
            this._drawQuestBoard(ctx, sx, sy, bob);
            spriteTopY = sy - S * 1.6;
        } else {
            const img = npcImages[this.type];
            if (img && img.complete && img.naturalWidth > 0) {
                const imgW = S * 2;
                const imgH = imgW * (img.naturalHeight / img.naturalWidth);
                const drawX = sx - imgW / 2;
                const drawY = sy - imgH + S * 0.4 + bob;
                ctx.drawImage(img, drawX, drawY, imgW, imgH);
                spriteTopY = drawY;
            } else if (this.type === 'beastmaster') {
                // Uses building sprite from VillageScene, _buildingTopY set there
                if (this._buildingTopY != null) spriteTopY = this._buildingTopY;
            } else {
                SpriteRenderer.drawShadow(ctx, sx, sy + 12, 12, 4);
                ctx.fillStyle = '#888';
                ctx.beginPath();
                ctx.arc(sx, sy - S * 0.3 + bob, S * 0.3, 0, Math.PI * 2);
                ctx.fill();
                spriteTopY = sy - S * 0.6;
            }
        }

        // Name label - just above the sprite
        const labelColor = hovered ? '#ffd700' : '#ddd';
        const labelSize = hovered ? 13 : 11;
        const labelY = spriteTopY - 6;
        SpriteRenderer.drawText(ctx, this.name, sx, labelY, labelColor, labelSize, 'center');

        // Upgrade available indicator
        if (this.hasNewUpgrade) {
            const indicatorY = labelY - 16;
            const pulse = Math.sin(this.animTimer * 3) * 0.3 + 0.7;
            const bounce = Math.sin(this.animTimer * 2) * 2;
            ctx.globalAlpha = pulse;
            // Arrow down triangle
            ctx.fillStyle = '#ffd700';
            ctx.beginPath();
            ctx.moveTo(sx, indicatorY + 8 + bounce);
            ctx.lineTo(sx - 5, indicatorY + 2 + bounce);
            ctx.lineTo(sx + 5, indicatorY + 2 + bounce);
            ctx.closePath();
            ctx.fill();
            // Circle with "!" mark
            ctx.fillStyle = '#ffd700';
            ctx.beginPath();
            ctx.arc(sx, indicatorY - 4 + bounce, 7, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#1a1a1a';
            ctx.font = 'bold 10px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('!', sx, indicatorY - 4 + bounce);
            ctx.globalAlpha = 1;
        }

        if (hovered && this.type !== 'portal') {
            SpriteRenderer.drawText(ctx, '[Click]', sx, sy + 20, '#bbb', 10, 'center');
            ctx.strokeStyle = 'rgba(255,215,0,0.3)';
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.arc(sx, sy, this.interactRadius * 0.5, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }

    _drawQuestBoard(ctx, cx, cy, bob) {
        // Wooden post
        ctx.fillStyle = '#5a3a1a';
        ctx.fillRect(cx - 3, cy - S * 0.5, 6, S * 0.8);

        // Board
        const bw = S * 1.0;
        const bh = S * 0.9;
        const bx = cx - bw / 2;
        const by = cy - S * 1.4 + bob;
        const g = ctx.createLinearGradient(bx, by, bx + bw, by);
        g.addColorStop(0, '#7a5a2a');
        g.addColorStop(0.5, '#8a6a3a');
        g.addColorStop(1, '#6a4a1a');
        ctx.fillStyle = g;
        SpriteRenderer._rr(ctx, bx, by, bw, bh, 3);
        ctx.fill();
        ctx.strokeStyle = '#4a2a0a';
        ctx.lineWidth = 1.5;
        SpriteRenderer._rr(ctx, bx, by, bw, bh, 3);
        ctx.stroke();

        // Paper notes
        ctx.fillStyle = '#e8dcc8';
        ctx.fillRect(bx + 4, by + 5, bw * 0.4, bh * 0.35);
        ctx.fillRect(bx + bw * 0.5, by + 5, bw * 0.4, bh * 0.28);
        ctx.fillRect(bx + 6, by + bh * 0.5, bw * 0.35, bh * 0.35);
        ctx.fillRect(bx + bw * 0.48, by + bh * 0.45, bw * 0.42, bh * 0.4);

        // Lines on notes
        ctx.strokeStyle = '#aaa';
        ctx.lineWidth = 0.5;
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(bx + 6, by + 10 + i * 4);
            ctx.lineTo(bx + bw * 0.38, by + 10 + i * 4);
            ctx.stroke();
        }

        // Pins
        ctx.fillStyle = '#cc3333';
        ctx.beginPath(); ctx.arc(bx + 8, by + 6, 2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#3333cc';
        ctx.beginPath(); ctx.arc(bx + bw * 0.55, by + 7, 2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#33cc33';
        ctx.beginPath(); ctx.arc(bx + 10, by + bh * 0.52, 2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#cccc33';
        ctx.beginPath(); ctx.arc(bx + bw * 0.52, by + bh * 0.47, 2, 0, Math.PI * 2); ctx.fill();

        // Notification handled by common NPC indicator (hasNewUpgrade)
    }

    _drawPortal(ctx, cx, cy) {
        const t = this.animTimer;
        const pulse = 1 + Math.sin(t * 3) * 0.15;

        // Ground rune circle
        ctx.strokeStyle = 'rgba(150,100,255,0.15)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy + 10, 35, 10, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Portal glow layers
        SpriteRenderer._glow(ctx, cx, cy, 30 * pulse, '#6030aa', 0.15);
        SpriteRenderer._glow(ctx, cx, cy, 20 * pulse, '#8050cc', 0.25);
        SpriteRenderer._glow(ctx, cx, cy, 10 * pulse, '#a070ee', 0.4);
        ctx.fillStyle = '#c0a0ff';
        ctx.beginPath();
        ctx.arc(cx, cy, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.beginPath();
        ctx.arc(cx - 1, cy - 1, 2, 0, Math.PI * 2);
        ctx.fill();

        // Rotating rune ring
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(t * 0.5);
        ctx.fillStyle = '#ddf';
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2;
            const r = 20;
            ctx.beginPath();
            ctx.arc(Math.cos(a) * r, Math.sin(a) * r, 2, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        // Spinning arcs
        ctx.strokeStyle = 'rgba(180,120,255,0.5)';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(cx, cy, 20, t * 0.8, t * 0.8 + Math.PI * 1.2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx, cy, 20, t * 0.8 + Math.PI, t * 0.8 + Math.PI * 2.2);
        ctx.stroke();

        // Particles
        for (let i = 0; i < 4; i++) {
            const pt = (t * 0.5 + i * 1.5) % 2;
            const px = cx + Math.sin(t + i * 2.5) * 12;
            const py = cy - pt * 20;
            const alpha = 1 - pt / 2;
            ctx.globalAlpha = alpha * 0.6;
            ctx.fillStyle = '#c0a0ff';
            ctx.beginPath();
            ctx.arc(px, py, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }
}
