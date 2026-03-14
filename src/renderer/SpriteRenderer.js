import { TILE_SIZE } from '../utils/Constants.js';

const FONT = "'Nunito', 'Segoe UI', sans-serif";
const S = TILE_SIZE;

// Preload tower sprite images
const towerImages = {};
const towerImageMap = { archer: 'archer', mage: 'mage', cannon: 'canon', frost: 'glace', tesla: 'tesla' };
for (const [type, file] of Object.entries(towerImageMap)) {
    const img = new Image();
    img.src = `assets/${file}.png`;
    towerImages[type] = img;
}

export class SpriteRenderer {
    // ===== UTILITY =====
    static drawRect(ctx, x, y, w, h, color) {
        ctx.fillStyle = color;
        ctx.fillRect(Math.round(x), Math.round(y), w, h);
    }

    static drawCircle(ctx, x, y, r, color) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(Math.round(x), Math.round(y), r, 0, Math.PI * 2);
        ctx.fill();
    }

    static drawStrokedCircle(ctx, x, y, r, fillColor, strokeColor, lw = 1) {
        ctx.fillStyle = fillColor;
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = lw;
        ctx.beginPath();
        ctx.arc(Math.round(x), Math.round(y), r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }

    static drawDiamond(ctx, x, y, size, color) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(x, y - size);
        ctx.lineTo(x + size, y);
        ctx.lineTo(x, y + size);
        ctx.lineTo(x - size, y);
        ctx.closePath();
        ctx.fill();
    }

    // ===== TEXT (clean, highly readable) =====
    static drawText(ctx, text, x, y, color = '#fff', size = 14, align = 'left') {
        ctx.font = `800 ${size}px ${FONT}`;
        ctx.textAlign = align;
        ctx.textBaseline = 'top';
        ctx.lineJoin = 'round';
        ctx.miterLimit = 2;
        // Outer stroke for contrast
        ctx.strokeStyle = 'rgba(0,0,0,0.9)';
        ctx.lineWidth = Math.max(3, size * 0.22);
        ctx.strokeText(text, x, y);
        // Drop shadow
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillText(text, x + 1, y + 1);
        // Main text
        ctx.fillStyle = color;
        ctx.fillText(text, x, y);
    }

    static drawTextNoOutline(ctx, text, x, y, color = '#fff', size = 14, align = 'left') {
        ctx.font = `700 ${size}px ${FONT}`;
        ctx.textAlign = align;
        ctx.textBaseline = 'top';
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fillText(text, x + 1, y + 1);
        ctx.fillStyle = color;
        ctx.fillText(text, x, y);
    }

    // ===== 2.5D SHADOW =====
    static drawShadow(ctx, x, y, rx, ry) {
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        ctx.beginPath();
        ctx.ellipse(Math.round(x), Math.round(y), rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    // ===== HELPER: rounded rect =====
    static _rr(ctx, x, y, w, h, r) {
        r = Math.min(r, w / 2, h / 2);
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.arcTo(x + w, y, x + w, y + r, r);
        ctx.lineTo(x + w, y + h - r);
        ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
        ctx.lineTo(x + r, y + h);
        ctx.arcTo(x, y + h, x, y + h - r, r);
        ctx.lineTo(x, y + r);
        ctx.arcTo(x, y, x + r, y, r);
        ctx.closePath();
    }

    // ===== MATERIAL ICONS =====
    static drawMaterialIcon(ctx, id, cx, cy, size = 8) {
        const s = size;
        ctx.save();
        switch (id) {
            case 'wood': {
                // Log shape: horizontal cylinder with end grain
                const lw = s * 1.3, lh = s * 0.7;
                ctx.fillStyle = '#6B3A1B';
                SpriteRenderer._rr(ctx, cx - lw, cy - lh / 2, lw * 2, lh, lh * 0.3);
                ctx.fill();
                // Wood grain lines
                ctx.strokeStyle = 'rgba(0,0,0,0.25)';
                ctx.lineWidth = 0.7;
                ctx.beginPath();
                ctx.moveTo(cx - lw * 0.6, cy - lh * 0.2);
                ctx.lineTo(cx + lw * 0.6, cy - lh * 0.2);
                ctx.moveTo(cx - lw * 0.5, cy + lh * 0.15);
                ctx.lineTo(cx + lw * 0.5, cy + lh * 0.15);
                ctx.stroke();
                // End grain circle
                ctx.fillStyle = '#A67B5B';
                ctx.beginPath();
                ctx.arc(cx + lw * 0.7, cy, lh * 0.38, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#5a2a0a';
                ctx.lineWidth = 0.6;
                ctx.stroke();
                // Highlight
                ctx.fillStyle = 'rgba(255,255,255,0.15)';
                ctx.fillRect(cx - lw * 0.8, cy - lh / 2, lw * 1.6, lh * 0.3);
                break;
            }
            case 'stone': {
                // Rock shape: irregular polygon
                ctx.fillStyle = '#777';
                ctx.beginPath();
                ctx.moveTo(cx - s * 0.3, cy - s * 0.8);
                ctx.lineTo(cx + s * 0.6, cy - s * 0.6);
                ctx.lineTo(cx + s, cy - s * 0.1);
                ctx.lineTo(cx + s * 0.7, cy + s * 0.7);
                ctx.lineTo(cx - s * 0.2, cy + s * 0.8);
                ctx.lineTo(cx - s * 0.9, cy + s * 0.3);
                ctx.lineTo(cx - s, cy - s * 0.3);
                ctx.closePath();
                ctx.fill();
                // Light face
                ctx.fillStyle = 'rgba(255,255,255,0.12)';
                ctx.beginPath();
                ctx.moveTo(cx - s * 0.3, cy - s * 0.8);
                ctx.lineTo(cx + s * 0.6, cy - s * 0.6);
                ctx.lineTo(cx + s * 0.2, cy);
                ctx.lineTo(cx - s * 0.5, cy - s * 0.1);
                ctx.closePath();
                ctx.fill();
                // Dark edge
                ctx.strokeStyle = 'rgba(0,0,0,0.3)';
                ctx.lineWidth = 0.8;
                ctx.beginPath();
                ctx.moveTo(cx + s * 0.2, cy);
                ctx.lineTo(cx - s * 0.5, cy - s * 0.1);
                ctx.stroke();
                break;
            }
            case 'iron': {
                // Ingot shape: trapezoid
                const iw = s * 1.2, ih = s * 0.8;
                const grad = ctx.createLinearGradient(cx - iw, cy - ih, cx + iw, cy + ih);
                grad.addColorStop(0, '#bccedd');
                grad.addColorStop(0.5, '#8899aa');
                grad.addColorStop(1, '#667788');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.moveTo(cx - iw * 0.6, cy - ih);
                ctx.lineTo(cx + iw * 0.6, cy - ih);
                ctx.lineTo(cx + iw, cy + ih * 0.3);
                ctx.lineTo(cx + iw * 0.5, cy + ih);
                ctx.lineTo(cx - iw * 0.5, cy + ih);
                ctx.lineTo(cx - iw, cy + ih * 0.3);
                ctx.closePath();
                ctx.fill();
                // Top face highlight
                ctx.fillStyle = 'rgba(255,255,255,0.2)';
                ctx.beginPath();
                ctx.moveTo(cx - iw * 0.6, cy - ih);
                ctx.lineTo(cx + iw * 0.6, cy - ih);
                ctx.lineTo(cx + iw * 0.3, cy - ih * 0.2);
                ctx.lineTo(cx - iw * 0.3, cy - ih * 0.2);
                ctx.closePath();
                ctx.fill();
                // Edge
                ctx.strokeStyle = 'rgba(0,0,0,0.2)';
                ctx.lineWidth = 0.6;
                ctx.beginPath();
                ctx.moveTo(cx - iw * 0.3, cy - ih * 0.2);
                ctx.lineTo(cx + iw * 0.3, cy - ih * 0.2);
                ctx.stroke();
                break;
            }
            case 'crystal': {
                // Gem: hexagonal crystal with facets
                const grad = ctx.createLinearGradient(cx - s, cy - s, cx + s, cy + s);
                grad.addColorStop(0, '#cc88ff');
                grad.addColorStop(0.5, '#9944dd');
                grad.addColorStop(1, '#6622aa');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.moveTo(cx, cy - s);
                ctx.lineTo(cx + s * 0.8, cy - s * 0.3);
                ctx.lineTo(cx + s * 0.8, cy + s * 0.4);
                ctx.lineTo(cx, cy + s);
                ctx.lineTo(cx - s * 0.8, cy + s * 0.4);
                ctx.lineTo(cx - s * 0.8, cy - s * 0.3);
                ctx.closePath();
                ctx.fill();
                // Light facet
                ctx.fillStyle = 'rgba(255,255,255,0.25)';
                ctx.beginPath();
                ctx.moveTo(cx, cy - s);
                ctx.lineTo(cx + s * 0.8, cy - s * 0.3);
                ctx.lineTo(cx, cy + s * 0.1);
                ctx.lineTo(cx - s * 0.4, cy - s * 0.3);
                ctx.closePath();
                ctx.fill();
                // Sparkle
                ctx.fillStyle = 'rgba(255,255,255,0.6)';
                ctx.beginPath();
                ctx.arc(cx - s * 0.2, cy - s * 0.4, s * 0.15, 0, Math.PI * 2);
                ctx.fill();
                break;
            }
            case 'darkEssence': {
                // Dark orb with swirl
                const grad = ctx.createRadialGradient(cx - s * 0.2, cy - s * 0.2, 0, cx, cy, s);
                grad.addColorStop(0, '#9944cc');
                grad.addColorStop(0.6, '#552288');
                grad.addColorStop(1, '#220044');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(cx, cy, s * 0.85, 0, Math.PI * 2);
                ctx.fill();
                // Inner glow
                ctx.fillStyle = 'rgba(170,100,255,0.2)';
                ctx.beginPath();
                ctx.arc(cx - s * 0.15, cy - s * 0.15, s * 0.45, 0, Math.PI * 2);
                ctx.fill();
                // Outer ring
                ctx.strokeStyle = 'rgba(150,80,220,0.5)';
                ctx.lineWidth = 0.8;
                ctx.beginPath();
                ctx.arc(cx, cy, s * 0.85, 0, Math.PI * 2);
                ctx.stroke();
                // Sparkle
                ctx.fillStyle = 'rgba(200,150,255,0.5)';
                ctx.beginPath();
                ctx.arc(cx - s * 0.25, cy - s * 0.3, s * 0.12, 0, Math.PI * 2);
                ctx.fill();
                break;
            }
        }
        ctx.restore();
    }

    // ===== HELPER: gradient fill rounded rect =====
    static _gradRect(ctx, x, y, w, h, r, c1, c2, vertical = true) {
        const g = vertical
            ? ctx.createLinearGradient(x, y, x, y + h)
            : ctx.createLinearGradient(x, y, x + w, y);
        g.addColorStop(0, c1);
        g.addColorStop(1, c2);
        ctx.fillStyle = g;
        SpriteRenderer._rr(ctx, x, y, w, h, r);
        ctx.fill();
    }

    // ===== HELPER: glow =====
    static _glow(ctx, x, y, r, color, alpha = 0.3) {
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, color);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.globalAlpha = alpha;
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }

    // ========================
    // HERO - POLISHED KNIGHT
    // ========================
    static drawHero(ctx, x, y, facing, hp, maxHp, state = 'idle', animFrame = 0) {
        const cx = Math.round(x);
        const baseY = Math.round(y);
        const dir = facing > 0 ? 1 : -1;

        ctx.save();

        let bodyOff = 0, legPhase = 0, swordAngle = 0, capeWave = 0;
        const t = Date.now() * 0.001;
        if (state === 'walk') {
            bodyOff = Math.sin(animFrame * Math.PI) * 2;
            legPhase = animFrame;
            capeWave = Math.sin(animFrame * Math.PI * 2) * 0.12;
        } else if (state === 'attack') {
            const swingAngles = [-0.5, -1.4, 0.4, 0.1];
            swordAngle = (swingAngles[animFrame % 4] || 0) * dir;
            bodyOff = animFrame === 1 ? -3 : 0;
            capeWave = animFrame === 1 ? 0.15 : 0;
        } else if (state !== 'die') {
            bodyOff = Math.sin(t * 3) * 1;
            capeWave = Math.sin(t * 2) * 0.06;
        }

        const topY = baseY - S * 1.6 + bodyOff;

        // === CAPE (layered with folds) ===
        const capeTipX = cx - dir * S * 0.2 + Math.sin(t * 2.5 + 1) * 3;
        const capeTipY = baseY + 2 + bodyOff;
        // Outer cape (dark red)
        ctx.fillStyle = '#8b1a1a';
        ctx.beginPath();
        ctx.moveTo(cx - dir * S * 0.08, topY + S * 0.5);
        ctx.quadraticCurveTo(cx - dir * S * 0.3 - capeWave * 20, topY + S * 1.0, capeTipX - dir * 3, capeTipY);
        ctx.quadraticCurveTo(cx - dir * S * 0.05, capeTipY + 2, cx + dir * S * 0.06, topY + S * 0.55);
        ctx.closePath();
        ctx.fill();
        // Inner cape (brighter red)
        ctx.fillStyle = '#c92a2a';
        ctx.beginPath();
        ctx.moveTo(cx - dir * S * 0.04, topY + S * 0.54);
        ctx.quadraticCurveTo(cx - dir * S * 0.2 - capeWave * 14, topY + S * 0.95, capeTipX, capeTipY - 3);
        ctx.quadraticCurveTo(cx, capeTipY - 1, cx + dir * S * 0.04, topY + S * 0.58);
        ctx.closePath();
        ctx.fill();
        // Cape inner fold highlight
        ctx.fillStyle = 'rgba(255,100,100,0.18)';
        ctx.beginPath();
        ctx.moveTo(cx - dir * S * 0.01, topY + S * 0.58);
        ctx.quadraticCurveTo(cx - dir * S * 0.1, topY + S * 0.8, cx - dir * S * 0.06, capeTipY - 8);
        ctx.quadraticCurveTo(cx, topY + S * 0.85, cx + dir * S * 0.02, topY + S * 0.6);
        ctx.closePath();
        ctx.fill();

        // === LEGS (armored greaves) ===
        const legL = legPhase === 0 ? 0 : Math.sin(legPhase * Math.PI * 2) * 3;
        const legR = -legL;
        // Chainmail under-layer
        ctx.fillStyle = '#2a2848';
        ctx.fillRect(cx - S * 0.14, baseY - S * 0.38 + legL, S * 0.12, S * 0.18);
        ctx.fillRect(cx + S * 0.02, baseY - S * 0.38 + legR, S * 0.12, S * 0.18);
        // Greaves (metal leg armor)
        const legGradL = ctx.createLinearGradient(cx - S * 0.15, 0, cx - S * 0.02, 0);
        legGradL.addColorStop(0, '#3a4a6a');
        legGradL.addColorStop(0.4, '#5a6a8a');
        legGradL.addColorStop(1, '#3a4a6a');
        ctx.fillStyle = legGradL;
        SpriteRenderer._rr(ctx, cx - S * 0.15, baseY - S * 0.22 + legL, S * 0.13, S * 0.2, 2);
        ctx.fill();
        const legGradR = ctx.createLinearGradient(cx + S * 0.02, 0, cx + S * 0.15, 0);
        legGradR.addColorStop(0, '#3a4a6a');
        legGradR.addColorStop(0.6, '#5a6a8a');
        legGradR.addColorStop(1, '#3a4a6a');
        ctx.fillStyle = legGradR;
        SpriteRenderer._rr(ctx, cx + S * 0.02, baseY - S * 0.22 + legR, S * 0.13, S * 0.2, 2);
        ctx.fill();
        // Knee guards
        ctx.fillStyle = '#4a5a7a';
        ctx.beginPath();
        ctx.ellipse(cx - S * 0.085, baseY - S * 0.22 + legL, S * 0.055, S * 0.04, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cx + S * 0.085, baseY - S * 0.22 + legR, S * 0.055, S * 0.04, 0, 0, Math.PI * 2);
        ctx.fill();
        // Knee highlights
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.beginPath();
        ctx.ellipse(cx - S * 0.09, baseY - S * 0.24 + legL, S * 0.03, S * 0.02, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cx + S * 0.08, baseY - S * 0.24 + legR, S * 0.03, S * 0.02, 0, 0, Math.PI * 2);
        ctx.fill();
        // Boots (armored)
        const bootGrad = ctx.createLinearGradient(0, baseY - S * 0.04, 0, baseY + S * 0.04);
        bootGrad.addColorStop(0, '#5a4030');
        bootGrad.addColorStop(0.5, '#3e2818');
        bootGrad.addColorStop(1, '#2a1a0c');
        ctx.fillStyle = bootGrad;
        SpriteRenderer._rr(ctx, cx - S * 0.16, baseY - S * 0.04 + legL, S * 0.15, S * 0.08, 3);
        ctx.fill();
        SpriteRenderer._rr(ctx, cx + S * 0.01, baseY - S * 0.04 + legR, S * 0.15, S * 0.08, 3);
        ctx.fill();
        // Boot metal trim
        ctx.fillStyle = '#8a7a5a';
        ctx.fillRect(cx - S * 0.16, baseY - S * 0.04 + legL, S * 0.15, S * 0.02);
        ctx.fillRect(cx + S * 0.01, baseY - S * 0.04 + legR, S * 0.15, S * 0.02);

        // === BODY (PLATE ARMOR) ===
        // Chainmail base visible at edges
        ctx.fillStyle = '#2a2848';
        SpriteRenderer._rr(ctx, cx - S * 0.24, topY + S * 0.46, S * 0.48, S * 0.56, 3);
        ctx.fill();
        // Main chest plate
        const bodyG = ctx.createLinearGradient(cx - S * 0.22, topY + S * 0.5, cx + S * 0.22, topY + S * 0.5);
        bodyG.addColorStop(0, '#1e3d7a');
        bodyG.addColorStop(0.2, '#2952a3');
        bodyG.addColorStop(0.45, '#3b6fd4');
        bodyG.addColorStop(0.55, '#4a80e0');
        bodyG.addColorStop(0.8, '#3566c0');
        bodyG.addColorStop(1, '#1e3d7a');
        ctx.fillStyle = bodyG;
        SpriteRenderer._rr(ctx, cx - S * 0.21, topY + S * 0.48, S * 0.42, S * 0.5, 5);
        ctx.fill();
        // Chest V-shape detail (armor plate lines)
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx - S * 0.14, topY + S * 0.52);
        ctx.lineTo(cx, topY + S * 0.72);
        ctx.lineTo(cx + S * 0.14, topY + S * 0.52);
        ctx.stroke();
        // Upper chest highlight
        ctx.fillStyle = 'rgba(180,210,255,0.1)';
        ctx.beginPath();
        ctx.moveTo(cx - S * 0.16, topY + S * 0.5);
        ctx.lineTo(cx + S * 0.16, topY + S * 0.5);
        ctx.lineTo(cx + S * 0.1, topY + S * 0.58);
        ctx.lineTo(cx - S * 0.1, topY + S * 0.58);
        ctx.closePath();
        ctx.fill();
        // Center gem/emblem
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.moveTo(cx, topY + S * 0.56);
        ctx.lineTo(cx + S * 0.03, topY + S * 0.6);
        ctx.lineTo(cx, topY + S * 0.64);
        ctx.lineTo(cx - S * 0.03, topY + S * 0.6);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.beginPath();
        ctx.arc(cx - S * 0.005, topY + S * 0.59, S * 0.012, 0, Math.PI * 2);
        ctx.fill();

        // Belt (ornate)
        const beltG = ctx.createLinearGradient(0, topY + S * 0.92, 0, topY + S * 1.0);
        beltG.addColorStop(0, '#d4a020');
        beltG.addColorStop(0.5, '#b8860b');
        beltG.addColorStop(1, '#8B6914');
        ctx.fillStyle = beltG;
        SpriteRenderer._rr(ctx, cx - S * 0.23, topY + S * 0.93, S * 0.46, S * 0.07, 2);
        ctx.fill();
        // Belt buckle (detailed)
        ctx.fillStyle = '#ffd700';
        SpriteRenderer._rr(ctx, cx - S * 0.04, topY + S * 0.94, S * 0.08, S * 0.05, 2);
        ctx.fill();
        ctx.fillStyle = '#c8a000';
        SpriteRenderer._rr(ctx, cx - S * 0.025, topY + S * 0.948, S * 0.05, S * 0.034, 1);
        ctx.fill();

        // === SHOULDER PADS (with spikes) ===
        // Left pauldron
        const pauldG = ctx.createRadialGradient(cx - S * 0.26, topY + S * 0.5, 0, cx - S * 0.26, topY + S * 0.52, S * 0.12);
        pauldG.addColorStop(0, '#5a7ac0');
        pauldG.addColorStop(0.6, '#3a5a9a');
        pauldG.addColorStop(1, '#2a4a80');
        ctx.fillStyle = pauldG;
        ctx.beginPath();
        ctx.ellipse(cx - S * 0.26, topY + S * 0.52, S * 0.12, S * 0.08, 0, 0, Math.PI * 2);
        ctx.fill();
        // Right pauldron
        const pauldG2 = ctx.createRadialGradient(cx + S * 0.26, topY + S * 0.5, 0, cx + S * 0.26, topY + S * 0.52, S * 0.12);
        pauldG2.addColorStop(0, '#5a7ac0');
        pauldG2.addColorStop(0.6, '#3a5a9a');
        pauldG2.addColorStop(1, '#2a4a80');
        ctx.fillStyle = pauldG2;
        ctx.beginPath();
        ctx.ellipse(cx + S * 0.26, topY + S * 0.52, S * 0.12, S * 0.08, 0, 0, Math.PI * 2);
        ctx.fill();
        // Pauldron edge trim
        ctx.strokeStyle = '#6a8ad0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(cx - S * 0.26, topY + S * 0.52, S * 0.12, S * 0.08, 0, Math.PI, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(cx + S * 0.26, topY + S * 0.52, S * 0.12, S * 0.08, 0, Math.PI, Math.PI * 2);
        ctx.stroke();
        // Shoulder spike rivets
        ctx.fillStyle = '#c0c8d8';
        ctx.beginPath(); ctx.arc(cx - S * 0.26, topY + S * 0.48, S * 0.02, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + S * 0.26, topY + S * 0.48, S * 0.02, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.beginPath(); ctx.arc(cx - S * 0.265, topY + S * 0.475, S * 0.008, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + S * 0.255, topY + S * 0.475, S * 0.008, 0, Math.PI * 2); ctx.fill();

        // === HEAD ===
        // Neck with gorget (throat armor)
        ctx.fillStyle = '#4a5a7a';
        SpriteRenderer._rr(ctx, cx - S * 0.08, topY + S * 0.38, S * 0.16, S * 0.12, 3);
        ctx.fill();
        ctx.fillStyle = '#d4a06a';
        ctx.fillRect(cx - S * 0.04, topY + S * 0.36, S * 0.08, S * 0.08);

        // Head
        ctx.fillStyle = '#daa870';
        ctx.beginPath();
        ctx.ellipse(cx, topY + S * 0.24, S * 0.14, S * 0.17, 0, 0, Math.PI * 2);
        ctx.fill();
        // Face shading
        ctx.fillStyle = 'rgba(180,130,80,0.2)';
        ctx.beginPath();
        ctx.ellipse(cx + dir * S * 0.03, topY + S * 0.28, S * 0.08, S * 0.1, 0, 0, Math.PI * 2);
        ctx.fill();
        // Skin highlight
        ctx.fillStyle = 'rgba(255,220,180,0.25)';
        ctx.beginPath();
        ctx.ellipse(cx - S * 0.04, topY + S * 0.18, S * 0.05, S * 0.07, 0, 0, Math.PI * 2);
        ctx.fill();

        // Helmet (detailed with nasal guard)
        const hG = ctx.createLinearGradient(cx - S * 0.18, topY, cx + S * 0.18, topY + S * 0.05);
        hG.addColorStop(0, '#5a6a7a');
        hG.addColorStop(0.3, '#8a9aaa');
        hG.addColorStop(0.5, '#a8b8c8');
        hG.addColorStop(0.7, '#8a9aaa');
        hG.addColorStop(1, '#5a6a7a');
        ctx.fillStyle = hG;
        // Helmet dome
        ctx.beginPath();
        ctx.ellipse(cx, topY + S * 0.12, S * 0.18, S * 0.14, 0, Math.PI, Math.PI * 2);
        ctx.fill();
        // Helmet brim
        ctx.fillStyle = '#6a7a8a';
        ctx.fillRect(cx - S * 0.19, topY + S * 0.1, S * 0.38, S * 0.05);
        // Brim edge highlight
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(cx - S * 0.18, topY + S * 0.1, S * 0.36, S * 0.015);
        // Nasal guard
        ctx.fillStyle = '#7a8a9a';
        ctx.fillRect(cx + dir * S * 0.06, topY + S * 0.14, S * 0.03, S * 0.14);
        // Helmet ridge (center crest)
        ctx.fillStyle = '#8090a0';
        ctx.beginPath();
        ctx.moveTo(cx - S * 0.02, topY + S * 0.12);
        ctx.lineTo(cx, topY - S * 0.02);
        ctx.lineTo(cx + S * 0.02, topY + S * 0.12);
        ctx.closePath();
        ctx.fill();

        // Plume (multi-layered feathers)
        ctx.fillStyle = '#a01818';
        ctx.beginPath();
        ctx.ellipse(cx, topY - S * 0.04, S * 0.035, S * 0.12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#d42020';
        ctx.beginPath();
        ctx.ellipse(cx, topY - S * 0.02, S * 0.025, S * 0.09, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.ellipse(cx, topY, S * 0.015, S * 0.06, 0, 0, Math.PI * 2);
        ctx.fill();
        // Plume tip highlight
        ctx.fillStyle = 'rgba(255,180,100,0.3)';
        ctx.beginPath();
        ctx.ellipse(cx, topY - S * 0.1, S * 0.01, S * 0.03, 0, 0, Math.PI * 2);
        ctx.fill();

        // Visor slit
        ctx.fillStyle = '#0a0a1a';
        SpriteRenderer._rr(ctx, cx + dir * S * 0.02, topY + S * 0.175, S * 0.14, S * 0.04, 2);
        ctx.fill();
        // Eyes glow
        ctx.fillStyle = '#8ab4f8';
        ctx.shadowColor = '#6699ff';
        ctx.shadowBlur = 3;
        ctx.beginPath();
        ctx.arc(cx + dir * S * 0.06, topY + S * 0.195, S * 0.016, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx + dir * S * 0.12, topY + S * 0.195, S * 0.016, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // === SHIELD ARM ===
        // Arm (armored)
        const armG = ctx.createLinearGradient(cx - dir * S * 0.38, 0, cx - dir * S * 0.25, 0);
        armG.addColorStop(0, '#2a4a80');
        armG.addColorStop(0.5, '#3a5a9a');
        armG.addColorStop(1, '#2a4a80');
        ctx.fillStyle = armG;
        SpriteRenderer._rr(ctx, cx - dir * S * 0.36, topY + S * 0.55, S * 0.12, S * 0.28, 3);
        ctx.fill();
        // Vambrace (forearm armor)
        ctx.fillStyle = '#3a5a9a';
        SpriteRenderer._rr(ctx, cx - dir * S * 0.37, topY + S * 0.65, S * 0.13, S * 0.12, 2);
        ctx.fill();

        // Shield (kite shield with cross)
        ctx.save();
        ctx.translate(cx - dir * S * 0.38, topY + S * 0.68);
        // Shield body
        const shG = ctx.createLinearGradient(-S * 0.1, -S * 0.14, S * 0.1, S * 0.14);
        shG.addColorStop(0, '#2a4a8a');
        shG.addColorStop(0.3, '#3a5a9a');
        shG.addColorStop(0.6, '#5070b0');
        shG.addColorStop(1, '#2a4a7a');
        ctx.fillStyle = shG;
        ctx.beginPath();
        ctx.moveTo(0, -S * 0.16);
        ctx.lineTo(S * 0.12, -S * 0.1);
        ctx.lineTo(S * 0.12, S * 0.06);
        ctx.lineTo(0, S * 0.2);
        ctx.lineTo(-S * 0.12, S * 0.06);
        ctx.lineTo(-S * 0.12, -S * 0.1);
        ctx.closePath();
        ctx.fill();
        // Shield border
        ctx.strokeStyle = '#7090c0';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        // Cross emblem
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(-S * 0.015, -S * 0.1, S * 0.03, S * 0.22);
        ctx.fillRect(-S * 0.07, -S * 0.03, S * 0.14, S * 0.03);
        // Shield boss (center)
        ctx.fillStyle = '#c0a020';
        ctx.beginPath();
        ctx.arc(0, 0, S * 0.03, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.beginPath();
        ctx.arc(-S * 0.01, -S * 0.01, S * 0.015, 0, Math.PI * 2);
        ctx.fill();
        // Corner rivets
        ctx.fillStyle = '#90a0b0';
        const rivets = [[0, -S * 0.13], [S * 0.09, -S * 0.06], [-S * 0.09, -S * 0.06], [0, S * 0.14]];
        for (const [rx, ry] of rivets) {
            ctx.beginPath(); ctx.arc(rx, ry, S * 0.012, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();

        // === SWORD ARM ===
        ctx.save();
        ctx.translate(cx + dir * S * 0.28, topY + S * 0.62);
        ctx.rotate(swordAngle);
        // Arm (armored)
        ctx.fillStyle = '#3568b8';
        SpriteRenderer._rr(ctx, -S * 0.06, -S * 0.08, S * 0.12, S * 0.28, 3);
        ctx.fill();
        // Vambrace
        ctx.fillStyle = '#3a5a9a';
        SpriteRenderer._rr(ctx, -S * 0.065, S * 0.06, S * 0.13, S * 0.1, 2);
        ctx.fill();
        // Gauntlet
        ctx.fillStyle = '#4a5a7a';
        ctx.beginPath();
        ctx.ellipse(0, S * 0.17, S * 0.045, S * 0.04, 0, 0, Math.PI * 2);
        ctx.fill();

        // Sword pommel
        ctx.fillStyle = '#c0a020';
        ctx.beginPath();
        ctx.arc(0, S * 0.2, S * 0.025, 0, Math.PI * 2);
        ctx.fill();
        // Sword grip (wrapped)
        ctx.fillStyle = '#4a3020';
        ctx.fillRect(-S * 0.02, S * 0.1, S * 0.04, S * 0.08);
        ctx.strokeStyle = '#6a5040';
        ctx.lineWidth = 0.8;
        for (let i = 0; i < 3; i++) {
            const gy = S * 0.12 + i * S * 0.025;
            ctx.beginPath(); ctx.moveTo(-S * 0.02, gy); ctx.lineTo(S * 0.02, gy + S * 0.01); ctx.stroke();
        }
        // Guard (cross guard with decorations)
        const guardG = ctx.createLinearGradient(-S * 0.09, 0, S * 0.09, 0);
        guardG.addColorStop(0, '#a08020');
        guardG.addColorStop(0.5, '#ffd700');
        guardG.addColorStop(1, '#a08020');
        ctx.fillStyle = guardG;
        SpriteRenderer._rr(ctx, -S * 0.09, S * 0.06, S * 0.18, S * 0.04, 2);
        ctx.fill();
        // Guard tips
        ctx.fillStyle = '#ffd700';
        ctx.beginPath(); ctx.arc(-S * 0.09, S * 0.08, S * 0.018, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(S * 0.09, S * 0.08, S * 0.018, 0, Math.PI * 2); ctx.fill();

        // Blade
        const blG = ctx.createLinearGradient(-S * 0.035, 0, S * 0.035, 0);
        blG.addColorStop(0, '#8aa0b8');
        blG.addColorStop(0.2, '#b0c8e0');
        blG.addColorStop(0.4, '#d8e8f8');
        blG.addColorStop(0.6, '#e8f0ff');
        blG.addColorStop(0.8, '#c0d4e8');
        blG.addColorStop(1, '#8aa0b8');
        ctx.fillStyle = blG;
        ctx.beginPath();
        ctx.moveTo(-S * 0.035, S * 0.06);
        ctx.lineTo(-S * 0.03, -S * 0.55);
        ctx.lineTo(0, -S * 0.7);
        ctx.lineTo(S * 0.03, -S * 0.55);
        ctx.lineTo(S * 0.035, S * 0.06);
        ctx.closePath();
        ctx.fill();
        // Blade edge
        ctx.strokeStyle = 'rgba(200,220,240,0.5)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(-S * 0.032, S * 0.04);
        ctx.lineTo(-S * 0.028, -S * 0.54);
        ctx.lineTo(0, -S * 0.7);
        ctx.stroke();
        // Fuller (blood groove)
        ctx.fillStyle = 'rgba(100,130,160,0.3)';
        ctx.fillRect(-S * 0.008, -S * 0.48, S * 0.016, S * 0.42);
        // Blade shine
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fillRect(S * 0.005, -S * 0.5, S * 0.008, S * 0.35);
        // Blade tip sparkle (idle)
        if (state === 'idle' || state === 'walk') {
            const sparkle = Math.sin(t * 5) * 0.3 + 0.3;
            ctx.fillStyle = `rgba(255,255,255,${sparkle})`;
            ctx.beginPath();
            ctx.arc(0, -S * 0.68, S * 0.015, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        // === ATTACK SLASH FX ===
        if (state === 'attack' && (animFrame === 1 || animFrame === 2)) {
            const intensity = animFrame === 1 ? 0.6 : 0.25;
            ctx.globalAlpha = intensity;
            // Outer arc
            ctx.strokeStyle = '#e0f0ff';
            ctx.lineWidth = 3.5;
            ctx.lineCap = 'round';
            ctx.beginPath();
            const sr = S * 0.75;
            const sa = dir > 0 ? -Math.PI * 0.6 : Math.PI * 0.4;
            const ea = dir > 0 ? Math.PI * 0.2 : Math.PI * 1.2;
            ctx.arc(cx + dir * S * 0.3, topY + S * 0.5, sr, sa, ea);
            ctx.stroke();
            // Inner arc
            ctx.strokeStyle = '#80c0ff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(cx + dir * S * 0.3, topY + S * 0.5, sr * 0.65, sa, ea);
            ctx.stroke();
            // Particle sparks
            ctx.fillStyle = '#ffffff';
            for (let i = 0; i < 3; i++) {
                const a = sa + (ea - sa) * (i + 0.5) / 3;
                const r = sr * (0.8 + Math.random() * 0.3);
                const px = cx + dir * S * 0.3 + Math.cos(a) * r;
                const py = topY + S * 0.5 + Math.sin(a) * r;
                ctx.beginPath();
                ctx.arc(px, py, 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
        }

        ctx.restore();
    }

    // ========================
    // ENEMIES
    // ========================
    static drawEnemy(ctx, x, y, type, healthPct, state = 'walk', animFrame = 0) {
        const cx = Math.round(x);
        const baseY = Math.round(y);

        SpriteRenderer.drawShadow(ctx, cx, baseY + 2, S * 0.3, S * 0.08);

        switch (type) {
            case 'goblin': SpriteRenderer._drawGoblin(ctx, cx, baseY, animFrame); break;
            case 'wolf': SpriteRenderer._drawWolf(ctx, cx, baseY, animFrame); break;
            case 'orc': SpriteRenderer._drawOrc(ctx, cx, baseY, animFrame); break;
            case 'bat': SpriteRenderer._drawBat(ctx, cx, baseY, animFrame); break;
            case 'shaman': SpriteRenderer._drawShaman(ctx, cx, baseY, animFrame); break;
            case 'goblinKing': SpriteRenderer._drawBossGoblin(ctx, cx, baseY, animFrame); break;
            case 'darkKnight': SpriteRenderer._drawBossDK(ctx, cx, baseY, animFrame); break;
            case 'demolisher': SpriteRenderer._drawDemolisher(ctx, cx, baseY, animFrame); break;
            case 'dragon': SpriteRenderer._drawBossDragon(ctx, cx, baseY, animFrame); break;
            default:
                ctx.fillStyle = '#a33';
                ctx.beginPath();
                ctx.arc(cx, baseY - S * 0.3, S * 0.3, 0, Math.PI * 2);
                ctx.fill();
        }
    }

    static _drawGoblin(ctx, cx, by, frame) {
        const bob = Math.sin(frame * Math.PI) * 2;
        const top = by - S * 1.0 + bob;
        // Legs
        ctx.fillStyle = '#2d6b1f';
        ctx.fillRect(cx - S * 0.09, by - S * 0.26, S * 0.07, S * 0.26);
        ctx.fillRect(cx + S * 0.02, by - S * 0.26, S * 0.07, S * 0.26);
        // Body
        SpriteRenderer._gradRect(ctx, cx - S * 0.14, top + S * 0.38, S * 0.28, S * 0.32, 4, '#4aa836', '#3a8828');
        // Vest
        ctx.fillStyle = '#7a5a2a';
        ctx.fillRect(cx - S * 0.12, top + S * 0.58, S * 0.24, S * 0.06);
        // Head (big, round)
        const hG = ctx.createRadialGradient(cx, top + S * 0.22, 0, cx, top + S * 0.22, S * 0.18);
        hG.addColorStop(0, '#6cc85a');
        hG.addColorStop(1, '#3a9a2a');
        ctx.fillStyle = hG;
        ctx.beginPath();
        ctx.ellipse(cx, top + S * 0.22, S * 0.16, S * 0.18, 0, 0, Math.PI * 2);
        ctx.fill();
        // Ears (pointy)
        ctx.fillStyle = '#4aaa3a';
        ctx.beginPath();
        ctx.moveTo(cx - S * 0.14, top + S * 0.18);
        ctx.quadraticCurveTo(cx - S * 0.32, top + S * 0.02, cx - S * 0.1, top + S * 0.26);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cx + S * 0.14, top + S * 0.18);
        ctx.quadraticCurveTo(cx + S * 0.32, top + S * 0.02, cx + S * 0.1, top + S * 0.26);
        ctx.closePath();
        ctx.fill();
        // Eyes (glowing red)
        ctx.fillStyle = '#ff2200';
        ctx.beginPath();
        ctx.ellipse(cx - S * 0.06, top + S * 0.18, S * 0.035, S * 0.025, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cx + S * 0.06, top + S * 0.18, S * 0.035, S * 0.025, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffcc00';
        ctx.beginPath();
        ctx.arc(cx - S * 0.055, top + S * 0.18, S * 0.015, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx + S * 0.065, top + S * 0.18, S * 0.015, 0, Math.PI * 2);
        ctx.fill();
        // Nose
        ctx.fillStyle = '#3a8a2a';
        ctx.beginPath();
        ctx.arc(cx, top + S * 0.26, S * 0.025, 0, Math.PI * 2);
        ctx.fill();
        // Mouth (grin)
        ctx.strokeStyle = '#2a6a1a';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, top + S * 0.3, S * 0.06, 0.1, Math.PI - 0.1);
        ctx.stroke();
        // Dagger
        ctx.fillStyle = '#ccc';
        ctx.beginPath();
        ctx.moveTo(cx + S * 0.18, top + S * 0.35);
        ctx.lineTo(cx + S * 0.2, top + S * 0.55);
        ctx.lineTo(cx + S * 0.16, top + S * 0.55);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#8B6914';
        ctx.fillRect(cx + S * 0.14, top + S * 0.53, S * 0.08, S * 0.03);
    }

    static _drawWolf(ctx, cx, by, frame) {
        const run = Math.sin(frame * Math.PI * 2) * 2;
        // Body (sleek oval)
        const bG = ctx.createLinearGradient(cx - S * 0.35, by - S * 0.35, cx + S * 0.3, by - S * 0.1);
        bG.addColorStop(0, '#6a6a6a');
        bG.addColorStop(0.5, '#8a8a8a');
        bG.addColorStop(1, '#666');
        ctx.fillStyle = bG;
        ctx.beginPath();
        ctx.ellipse(cx - S * 0.05, by - S * 0.22, S * 0.35, S * 0.14, 0, 0, Math.PI * 2);
        ctx.fill();
        // Belly highlight
        ctx.fillStyle = 'rgba(200,200,200,0.15)';
        ctx.beginPath();
        ctx.ellipse(cx - S * 0.05, by - S * 0.18, S * 0.2, S * 0.06, 0, 0, Math.PI * 2);
        ctx.fill();
        // Legs
        ctx.fillStyle = '#5a5a5a';
        const lo = run;
        ctx.fillRect(cx - S * 0.25, by - S * 0.1 + lo, S * 0.05, S * 0.12);
        ctx.fillRect(cx - S * 0.1, by - S * 0.1 - lo, S * 0.05, S * 0.12);
        ctx.fillRect(cx + S * 0.08, by - S * 0.1 + lo, S * 0.05, S * 0.12);
        ctx.fillRect(cx + S * 0.2, by - S * 0.1 - lo, S * 0.05, S * 0.12);
        // Head
        ctx.fillStyle = '#7a7a7a';
        ctx.beginPath();
        ctx.ellipse(cx + S * 0.28, by - S * 0.38, S * 0.1, S * 0.1, 0.2, 0, Math.PI * 2);
        ctx.fill();
        // Snout
        ctx.fillStyle = '#8a8a8a';
        ctx.beginPath();
        ctx.ellipse(cx + S * 0.38, by - S * 0.36, S * 0.06, S * 0.05, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.arc(cx + S * 0.42, by - S * 0.38, S * 0.015, 0, Math.PI * 2);
        ctx.fill();
        // Ears
        ctx.fillStyle = '#5a5a5a';
        ctx.beginPath();
        ctx.moveTo(cx + S * 0.22, by - S * 0.42);
        ctx.lineTo(cx + S * 0.2, by - S * 0.56);
        ctx.lineTo(cx + S * 0.28, by - S * 0.42);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cx + S * 0.3, by - S * 0.44);
        ctx.lineTo(cx + S * 0.32, by - S * 0.56);
        ctx.lineTo(cx + S * 0.36, by - S * 0.42);
        ctx.closePath();
        ctx.fill();
        // Eye
        ctx.fillStyle = '#ffdd00';
        ctx.beginPath();
        ctx.ellipse(cx + S * 0.3, by - S * 0.4, S * 0.025, S * 0.02, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#111';
        ctx.beginPath();
        ctx.arc(cx + S * 0.3, by - S * 0.4, S * 0.01, 0, Math.PI * 2);
        ctx.fill();
        // Tail
        ctx.strokeStyle = '#6a6a6a';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx - S * 0.35, by - S * 0.28);
        ctx.quadraticCurveTo(cx - S * 0.45, by - S * 0.45, cx - S * 0.4, by - S * 0.5);
        ctx.stroke();
    }

    static _drawOrc(ctx, cx, by, frame) {
        const bob = Math.sin(frame * Math.PI) * 1;
        const top = by - S * 1.35 + bob;
        // Legs
        ctx.fillStyle = '#2d5a1e';
        SpriteRenderer._rr(ctx, cx - S * 0.14, by - S * 0.34, S * 0.12, S * 0.34, 2);
        ctx.fill();
        SpriteRenderer._rr(ctx, cx + S * 0.04, by - S * 0.34, S * 0.12, S * 0.34, 2);
        ctx.fill();
        // Boots
        ctx.fillStyle = '#3a2a10';
        ctx.fillRect(cx - S * 0.16, by - S * 0.05, S * 0.16, S * 0.07);
        ctx.fillRect(cx + S * 0.02, by - S * 0.05, S * 0.16, S * 0.07);
        // Body (wide, muscular)
        const oG = ctx.createLinearGradient(cx - S * 0.28, top + S * 0.4, cx + S * 0.28, top + S * 0.4);
        oG.addColorStop(0, '#2c6a1e');
        oG.addColorStop(0.5, '#3a8a2a');
        oG.addColorStop(1, '#2c6a1e');
        ctx.fillStyle = oG;
        SpriteRenderer._rr(ctx, cx - S * 0.28, top + S * 0.4, S * 0.56, S * 0.52, 5);
        ctx.fill();
        // Armor straps
        ctx.fillStyle = '#5a4a2a';
        ctx.fillRect(cx - S * 0.04, top + S * 0.42, S * 0.03, S * 0.48);
        ctx.fillRect(cx + S * 0.03, top + S * 0.42, S * 0.03, S * 0.48);
        // Head
        ctx.fillStyle = '#4aa03a';
        ctx.beginPath();
        ctx.ellipse(cx, top + S * 0.24, S * 0.18, S * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();
        // Jaw
        ctx.fillStyle = '#3a8a2a';
        ctx.beginPath();
        ctx.ellipse(cx, top + S * 0.36, S * 0.14, S * 0.08, 0, 0, Math.PI);
        ctx.fill();
        // Tusks
        ctx.fillStyle = '#eee';
        ctx.beginPath();
        ctx.moveTo(cx - S * 0.08, top + S * 0.34);
        ctx.lineTo(cx - S * 0.06, top + S * 0.44);
        ctx.lineTo(cx - S * 0.1, top + S * 0.34);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cx + S * 0.08, top + S * 0.34);
        ctx.lineTo(cx + S * 0.06, top + S * 0.44);
        ctx.lineTo(cx + S * 0.1, top + S * 0.34);
        ctx.closePath();
        ctx.fill();
        // Eyes
        ctx.fillStyle = '#ff4400';
        ctx.beginPath();
        ctx.ellipse(cx - S * 0.07, top + S * 0.2, S * 0.04, S * 0.025, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cx + S * 0.07, top + S * 0.2, S * 0.04, S * 0.025, 0, 0, Math.PI * 2);
        ctx.fill();
        // Brow
        ctx.fillStyle = '#2a5a1a';
        ctx.fillRect(cx - S * 0.1, top + S * 0.14, S * 0.08, S * 0.03);
        ctx.fillRect(cx + S * 0.02, top + S * 0.14, S * 0.08, S * 0.03);
        // Axe
        ctx.fillStyle = '#555';
        ctx.fillRect(cx + S * 0.3, top + S * 0.1, S * 0.04, S * 0.6);
        ctx.fillStyle = '#888';
        ctx.beginPath();
        ctx.moveTo(cx + S * 0.34, top + S * 0.15);
        ctx.quadraticCurveTo(cx + S * 0.5, top + S * 0.28, cx + S * 0.34, top + S * 0.42);
        ctx.lineTo(cx + S * 0.34, top + S * 0.15);
        ctx.closePath();
        ctx.fill();
        // Axe shine
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.beginPath();
        ctx.moveTo(cx + S * 0.34, top + S * 0.2);
        ctx.quadraticCurveTo(cx + S * 0.42, top + S * 0.28, cx + S * 0.34, top + S * 0.36);
        ctx.lineTo(cx + S * 0.34, top + S * 0.2);
        ctx.closePath();
        ctx.fill();
    }

    static _drawBat(ctx, cx, by, frame) {
        const float = Math.sin(Date.now() * 0.008) * 4;
        const fy = by - S * 0.6 + float;
        const wingFlap = Math.sin(Date.now() * 0.015) * 0.4;
        ctx.save();
        // Body
        ctx.fillStyle = '#7a4080';
        ctx.beginPath();
        ctx.ellipse(cx, fy, S * 0.08, S * 0.1, 0, 0, Math.PI * 2);
        ctx.fill();
        // Head
        ctx.fillStyle = '#6a3070';
        ctx.beginPath();
        ctx.ellipse(cx, fy - S * 0.14, S * 0.07, S * 0.06, 0, 0, Math.PI * 2);
        ctx.fill();
        // Wings
        ctx.fillStyle = '#5a3060';
        // Left wing
        ctx.save();
        ctx.translate(cx - S * 0.08, fy);
        ctx.rotate(-wingFlap);
        ctx.beginPath();
        ctx.moveTo(0, -S * 0.02);
        ctx.quadraticCurveTo(-S * 0.2, -S * 0.2, -S * 0.35, -S * 0.15);
        ctx.quadraticCurveTo(-S * 0.28, S * 0.02, -S * 0.2, S * 0.08);
        ctx.lineTo(0, S * 0.04);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        // Right wing
        ctx.save();
        ctx.translate(cx + S * 0.08, fy);
        ctx.rotate(wingFlap);
        ctx.beginPath();
        ctx.moveTo(0, -S * 0.02);
        ctx.quadraticCurveTo(S * 0.2, -S * 0.2, S * 0.35, -S * 0.15);
        ctx.quadraticCurveTo(S * 0.28, S * 0.02, S * 0.2, S * 0.08);
        ctx.lineTo(0, S * 0.04);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        // Ears
        ctx.fillStyle = '#5a2860';
        ctx.beginPath();
        ctx.moveTo(cx - S * 0.04, fy - S * 0.16);
        ctx.lineTo(cx - S * 0.08, fy - S * 0.28);
        ctx.lineTo(cx, fy - S * 0.16);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cx + S * 0.04, fy - S * 0.16);
        ctx.lineTo(cx + S * 0.08, fy - S * 0.28);
        ctx.lineTo(cx, fy - S * 0.16);
        ctx.closePath();
        ctx.fill();
        // Eyes (glowing)
        SpriteRenderer._glow(ctx, cx, fy - S * 0.13, S * 0.08, '#ff0000', 0.35);
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.ellipse(cx - S * 0.03, fy - S * 0.13, S * 0.02, S * 0.015, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cx + S * 0.03, fy - S * 0.13, S * 0.02, S * 0.015, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    static _drawShaman(ctx, cx, by, frame) {
        const bob = Math.sin(Date.now() * 0.003) * 1.5;
        const top = by - S * 1.2 + bob;
        // Robe
        ctx.fillStyle = '#3a2a5a';
        ctx.beginPath();
        ctx.moveTo(cx - S * 0.18, top + S * 0.4);
        ctx.lineTo(cx - S * 0.24, by);
        ctx.lineTo(cx + S * 0.24, by);
        ctx.lineTo(cx + S * 0.18, top + S * 0.4);
        ctx.closePath();
        ctx.fill();
        // Robe detail
        ctx.fillStyle = '#5a4a7a';
        ctx.fillRect(cx - S * 0.015, top + S * 0.42, S * 0.03, S * 0.55);
        // Robe stars
        ctx.fillStyle = 'rgba(200,200,255,0.35)';
        ctx.beginPath(); ctx.arc(cx - S * 0.08, top + S * 0.6, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + S * 0.06, top + S * 0.7, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx - S * 0.12, top + S * 0.8, 1, 0, Math.PI * 2); ctx.fill();
        // Head
        ctx.fillStyle = '#5a8a4a';
        ctx.beginPath();
        ctx.ellipse(cx, top + S * 0.24, S * 0.11, S * 0.14, 0, 0, Math.PI * 2);
        ctx.fill();
        // Hood
        ctx.fillStyle = '#2a1a4a';
        ctx.beginPath();
        ctx.moveTo(cx, top - S * 0.05);
        ctx.quadraticCurveTo(cx - S * 0.22, top + S * 0.18, cx - S * 0.16, top + S * 0.32);
        ctx.lineTo(cx + S * 0.16, top + S * 0.32);
        ctx.quadraticCurveTo(cx + S * 0.22, top + S * 0.18, cx, top - S * 0.05);
        ctx.closePath();
        ctx.fill();
        // Eyes (magical glow)
        SpriteRenderer._glow(ctx, cx, top + S * 0.22, S * 0.1, '#cc44ff', 0.35);
        ctx.fillStyle = '#cc44ff';
        ctx.beginPath();
        ctx.ellipse(cx - S * 0.04, top + S * 0.22, S * 0.025, S * 0.018, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cx + S * 0.04, top + S * 0.22, S * 0.025, S * 0.018, 0, 0, Math.PI * 2);
        ctx.fill();
        // Staff
        ctx.fillStyle = '#5a3a1a';
        ctx.fillRect(cx + S * 0.2, top + S * 0.05, S * 0.035, S * 0.85);
        // Staff orb
        const pulse = 1 + Math.sin(Date.now() * 0.006) * 0.25;
        SpriteRenderer._glow(ctx, cx + S * 0.22, top, S * 0.14 * pulse, '#cc44ff', 0.3);
        ctx.fillStyle = '#cc44ff';
        ctx.beginPath();
        ctx.arc(cx + S * 0.22, top, S * 0.055 * pulse, 0, Math.PI * 2);
        ctx.fill();
        // Orb shine
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.beginPath();
        ctx.arc(cx + S * 0.2, top - S * 0.02, S * 0.02, 0, Math.PI * 2);
        ctx.fill();
    }

    static _drawDemolisher(ctx, cx, by, frame) {
        const bob = Math.sin(frame * Math.PI) * 1.5;
        const top = by - S * 1.2 + bob;

        // Legs — thick, armored
        ctx.fillStyle = '#5a3a1a';
        ctx.fillRect(cx - S * 0.12, by - S * 0.3, S * 0.1, S * 0.3);
        ctx.fillRect(cx + S * 0.03, by - S * 0.3, S * 0.1, S * 0.3);
        // Metal shin guards
        ctx.fillStyle = '#666';
        ctx.fillRect(cx - S * 0.13, by - S * 0.2, S * 0.12, S * 0.12);
        ctx.fillRect(cx + S * 0.02, by - S * 0.2, S * 0.12, S * 0.12);

        // Body — heavy build, brown leather armor
        const bodyG = ctx.createLinearGradient(cx - S * 0.2, top + S * 0.3, cx + S * 0.2, top + S * 0.3);
        bodyG.addColorStop(0, '#6a3a15');
        bodyG.addColorStop(0.5, '#8a4a22');
        bodyG.addColorStop(1, '#5a3010');
        ctx.fillStyle = bodyG;
        ctx.fillRect(cx - S * 0.22, top + S * 0.35, S * 0.44, S * 0.5);

        // Belt with metal buckle
        ctx.fillStyle = '#444';
        ctx.fillRect(cx - S * 0.22, top + S * 0.7, S * 0.44, S * 0.06);
        ctx.fillStyle = '#aa8833';
        ctx.fillRect(cx - S * 0.04, top + S * 0.69, S * 0.08, S * 0.08);

        // Shoulder pads — metal
        ctx.fillStyle = '#777';
        ctx.beginPath();
        ctx.arc(cx - S * 0.25, top + S * 0.38, S * 0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx + S * 0.25, top + S * 0.38, S * 0.1, 0, Math.PI * 2);
        ctx.fill();
        // Spikes on shoulders
        ctx.fillStyle = '#555';
        ctx.beginPath();
        ctx.moveTo(cx - S * 0.35, top + S * 0.32);
        ctx.lineTo(cx - S * 0.28, top + S * 0.35);
        ctx.lineTo(cx - S * 0.3, top + S * 0.42);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cx + S * 0.35, top + S * 0.32);
        ctx.lineTo(cx + S * 0.28, top + S * 0.35);
        ctx.lineTo(cx + S * 0.3, top + S * 0.42);
        ctx.closePath();
        ctx.fill();

        // Head — rough, scarred face
        ctx.fillStyle = '#c89060';
        ctx.beginPath();
        ctx.arc(cx, top + S * 0.2, S * 0.16, 0, Math.PI * 2);
        ctx.fill();

        // Helmet — iron with nose guard
        ctx.fillStyle = '#666';
        ctx.beginPath();
        ctx.arc(cx, top + S * 0.15, S * 0.18, Math.PI, 0);
        ctx.fill();
        // Nose guard
        ctx.fillRect(cx - S * 0.02, top + S * 0.1, S * 0.04, S * 0.15);

        // Eyes — angry red
        ctx.fillStyle = '#cc2200';
        ctx.beginPath();
        ctx.arc(cx - S * 0.06, top + S * 0.2, S * 0.03, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx + S * 0.06, top + S * 0.2, S * 0.03, 0, Math.PI * 2);
        ctx.fill();

        // Warhammer — big, swinging
        const hammerSwing = Math.sin(frame * Math.PI) * 0.3;
        ctx.save();
        ctx.translate(cx + S * 0.3, top + S * 0.4);
        ctx.rotate(-0.5 + hammerSwing);
        // Handle
        ctx.fillStyle = '#5a3a1a';
        ctx.fillRect(-S * 0.03, 0, S * 0.06, S * 0.5);
        // Hammer head
        ctx.fillStyle = '#555';
        ctx.fillRect(-S * 0.12, -S * 0.08, S * 0.24, S * 0.14);
        // Metal highlight
        ctx.fillStyle = '#888';
        ctx.fillRect(-S * 0.1, -S * 0.06, S * 0.2, S * 0.04);
        ctx.restore();
    }

    static _drawBossGoblin(ctx, cx, by, frame) {
        ctx.save();
        ctx.translate(cx, by);
        ctx.scale(1.35, 1.35);
        SpriteRenderer._drawGoblin(ctx, 0, 0, frame);
        // Crown
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.moveTo(-S * 0.15, -S * 1.12);
        ctx.lineTo(-S * 0.12, -S * 1.22);
        ctx.lineTo(-S * 0.06, -S * 1.14);
        ctx.lineTo(0, -S * 1.28);
        ctx.lineTo(S * 0.06, -S * 1.14);
        ctx.lineTo(S * 0.12, -S * 1.22);
        ctx.lineTo(S * 0.15, -S * 1.12);
        ctx.closePath();
        ctx.fill();
        // Crown jewel
        ctx.fillStyle = '#ff0040';
        ctx.beginPath();
        ctx.arc(0, -S * 1.18, S * 0.025, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    static _drawBossDK(ctx, cx, by, frame) {
        const bob = Math.sin(frame * Math.PI) * 1;
        const top = by - S * 2.0 + bob;
        SpriteRenderer.drawShadow(ctx, cx, by + 2, S * 0.5, S * 0.14);
        // Legs
        ctx.fillStyle = '#1a1a1a';
        SpriteRenderer._rr(ctx, cx - S * 0.15, by - S * 0.38, S * 0.12, S * 0.38, 2);
        ctx.fill();
        SpriteRenderer._rr(ctx, cx + S * 0.04, by - S * 0.38, S * 0.12, S * 0.38, 2);
        ctx.fill();
        // Body - dark plate armor
        const aG = ctx.createLinearGradient(cx - S * 0.3, top + S * 0.5, cx + S * 0.3, top + S * 0.5);
        aG.addColorStop(0, '#0a0a0a');
        aG.addColorStop(0.3, '#2a2a2a');
        aG.addColorStop(0.5, '#3a3a3a');
        aG.addColorStop(0.7, '#2a2a2a');
        aG.addColorStop(1, '#0a0a0a');
        ctx.fillStyle = aG;
        SpriteRenderer._rr(ctx, cx - S * 0.3, top + S * 0.48, S * 0.6, S * 0.56, 4);
        ctx.fill();
        // Armor highlight
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect(cx - S * 0.25, top + S * 0.5, S * 0.5, S * 0.05);
        // Helmet
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath();
        ctx.ellipse(cx, top + S * 0.3, S * 0.2, S * 0.18, 0, 0, Math.PI * 2);
        ctx.fill();
        // Visor glow (red)
        SpriteRenderer._glow(ctx, cx, top + S * 0.32, S * 0.14, '#ff0000', 0.3);
        ctx.fillStyle = '#ff2200';
        ctx.fillRect(cx - S * 0.12, top + S * 0.3, S * 0.24, S * 0.035);
        // Horns
        ctx.fillStyle = '#2a2a2a';
        ctx.beginPath();
        ctx.moveTo(cx - S * 0.18, top + S * 0.2);
        ctx.quadraticCurveTo(cx - S * 0.35, top, cx - S * 0.28, top - S * 0.08);
        ctx.lineTo(cx - S * 0.14, top + S * 0.22);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cx + S * 0.18, top + S * 0.2);
        ctx.quadraticCurveTo(cx + S * 0.35, top, cx + S * 0.28, top - S * 0.08);
        ctx.lineTo(cx + S * 0.14, top + S * 0.22);
        ctx.closePath();
        ctx.fill();
        // Giant sword
        ctx.fillStyle = '#333';
        ctx.fillRect(cx + S * 0.32, top + S * 0.05, S * 0.05, S * 0.9);
        ctx.fillStyle = '#444';
        ctx.fillRect(cx + S * 0.25, top + S * 0.5, S * 0.18, S * 0.04);
        // Shoulder spikes
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath();
        ctx.moveTo(cx - S * 0.3, top + S * 0.5);
        ctx.lineTo(cx - S * 0.42, top + S * 0.32);
        ctx.lineTo(cx - S * 0.26, top + S * 0.58);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cx + S * 0.3, top + S * 0.5);
        ctx.lineTo(cx + S * 0.42, top + S * 0.32);
        ctx.lineTo(cx + S * 0.26, top + S * 0.58);
        ctx.closePath();
        ctx.fill();
        // Dark aura
        SpriteRenderer._glow(ctx, cx, by - S * 0.5, S * 0.7, '#ff0000', 0.08);
    }

    static _drawBossDragon(ctx, cx, by, frame) {
        const sc = 1.7;
        ctx.save();
        ctx.translate(cx, by);
        ctx.scale(sc, sc);
        SpriteRenderer.drawShadow(ctx, 0, 4, S * 0.45, S * 0.12);
        const top = -S * 1.0;
        // Body
        const dG = ctx.createLinearGradient(0, top + S * 0.35, 0, top + S * 0.7);
        dG.addColorStop(0, '#cc2222');
        dG.addColorStop(1, '#8a1111');
        ctx.fillStyle = dG;
        ctx.beginPath();
        ctx.ellipse(0, top + S * 0.5, S * 0.32, S * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();
        // Belly
        ctx.fillStyle = '#cc8822';
        ctx.beginPath();
        ctx.ellipse(0, top + S * 0.55, S * 0.18, S * 0.08, 0, 0, Math.PI);
        ctx.fill();
        // Legs
        ctx.fillStyle = '#882222';
        SpriteRenderer._rr(ctx, -S * 0.2, top + S * 0.65, S * 0.1, S * 0.2, 2);
        ctx.fill();
        SpriteRenderer._rr(ctx, S * 0.12, top + S * 0.65, S * 0.1, S * 0.2, 2);
        ctx.fill();
        // Wings
        const wf = Math.sin(Date.now() * 0.005) * 0.15;
        ctx.fillStyle = 'rgba(180,40,40,0.8)';
        ctx.save();
        ctx.translate(-S * 0.2, top + S * 0.38);
        ctx.rotate(-0.3 + wf);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(-S * 0.3, -S * 0.3, -S * 0.5, -S * 0.25);
        ctx.quadraticCurveTo(-S * 0.35, -S * 0.05, -S * 0.55, -S * 0.05);
        ctx.quadraticCurveTo(-S * 0.3, S * 0.1, 0, S * 0.1);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        ctx.save();
        ctx.translate(S * 0.2, top + S * 0.38);
        ctx.rotate(0.3 - wf);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(S * 0.3, -S * 0.3, S * 0.5, -S * 0.25);
        ctx.quadraticCurveTo(S * 0.35, -S * 0.05, S * 0.55, -S * 0.05);
        ctx.quadraticCurveTo(S * 0.3, S * 0.1, 0, S * 0.1);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        // Neck + Head
        ctx.fillStyle = '#aa2222';
        ctx.beginPath();
        ctx.ellipse(S * 0.2, top + S * 0.2, S * 0.12, S * 0.1, 0.2, 0, Math.PI * 2);
        ctx.fill();
        // Snout
        ctx.fillStyle = '#993333';
        ctx.beginPath();
        ctx.ellipse(S * 0.32, top + S * 0.15, S * 0.06, S * 0.05, 0.3, 0, Math.PI * 2);
        ctx.fill();
        // Eye
        ctx.fillStyle = '#ffaa00';
        ctx.beginPath();
        ctx.ellipse(S * 0.22, top + S * 0.15, S * 0.025, S * 0.02, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#111';
        ctx.beginPath();
        ctx.arc(S * 0.22, top + S * 0.15, S * 0.01, 0, Math.PI * 2);
        ctx.fill();
        // Horns
        ctx.fillStyle = '#885522';
        ctx.beginPath();
        ctx.moveTo(S * 0.14, top + S * 0.12);
        ctx.lineTo(S * 0.1, top - S * 0.02);
        ctx.lineTo(S * 0.18, top + S * 0.14);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(S * 0.24, top + S * 0.1);
        ctx.lineTo(S * 0.26, top - S * 0.02);
        ctx.lineTo(S * 0.28, top + S * 0.12);
        ctx.closePath();
        ctx.fill();
        // Tail
        ctx.strokeStyle = '#882222';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-S * 0.3, top + S * 0.5);
        ctx.quadraticCurveTo(-S * 0.45, top + S * 0.35, -S * 0.42, top + S * 0.25);
        ctx.stroke();
        // Fire glow
        SpriteRenderer._glow(ctx, 0, top + S * 0.5, S * 0.4, '#ff4400', 0.15);
        ctx.restore();
    }

    // ========================
    // TOWERS - POLISHED
    // ========================
    static drawTower(ctx, x, y, type, level = 1) {
        const cx = Math.round(x + S / 2);
        const baseY = Math.round(y + S);
        const img = towerImages[type];

        if (img && img.complete && img.naturalWidth > 0) {
            // Scale: tower sprite fills ~1.4 tiles wide (30% smaller)
            const imgW = S * 1.4;
            const imgH = imgW * (img.naturalHeight / img.naturalWidth);
            // Grow slightly with level
            const scale = 1 + (level - 1) * 0.08;
            const drawW = imgW * scale;
            const drawH = imgH * scale;
            // Bottom of image sits at the tile bottom
            const drawX = cx - drawW / 2;
            const drawY = baseY - drawH + 2;

            // Subtle shadow
            ctx.save();
            ctx.shadowColor = 'rgba(0,0,0,0.4)';
            ctx.shadowBlur = 4;
            ctx.shadowOffsetY = 2;
            ctx.drawImage(img, drawX, drawY, drawW, drawH);
            ctx.restore();

            // Level star indicators
            if (level > 1) {
                for (let i = 0; i < level - 1; i++) {
                    const sx = cx - (level - 1) * 4 + i * 8;
                    ctx.fillStyle = '#ffd700';
                    SpriteRenderer._drawStar(ctx, sx, drawY + 2, 3.5);
                }
            }
        } else {
            // Fallback to procedural drawing
            SpriteRenderer.drawShadow(ctx, cx, baseY + 1, S * 0.45, S * 0.12);
            const bG = ctx.createLinearGradient(x, baseY - 8, x, baseY);
            bG.addColorStop(0, '#7a7a7a');
            bG.addColorStop(1, '#4a4a4a');
            ctx.fillStyle = bG;
            SpriteRenderer._rr(ctx, x + 1, baseY - 8, S - 2, 8, 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.1)';
            ctx.fillRect(x + 2, baseY - 8, S - 4, 2);
            const tBase = baseY - 8;
            switch (type) {
                case 'archer': SpriteRenderer._drawArcherTower(ctx, cx, tBase, level); break;
                case 'mage': SpriteRenderer._drawMageTower(ctx, cx, tBase, level); break;
                case 'cannon': SpriteRenderer._drawCannonTower(ctx, cx, tBase, level); break;
                case 'frost': SpriteRenderer._drawFrostTower(ctx, cx, tBase, level); break;
                case 'tesla': SpriteRenderer._drawTeslaTower(ctx, cx, tBase, level); break;
            }
            if (level > 1) {
                for (let i = 0; i < level - 1; i++) {
                    const sx = cx - (level - 1) * 4 + i * 8;
                    ctx.fillStyle = '#ffd700';
                    SpriteRenderer._drawStar(ctx, sx, y + 3, 3.5);
                }
            }
        }
    }

    static _drawArcherTower(ctx, cx, base, level) {
        const h = S * 0.9 + level * 4;
        // Wood tower
        const wG = ctx.createLinearGradient(cx - 7, base - h, cx + 7, base - h);
        wG.addColorStop(0, '#6a4a1a');
        wG.addColorStop(0.3, '#8a6a3a');
        wG.addColorStop(0.7, '#7a5a2a');
        wG.addColorStop(1, '#5a3a0a');
        ctx.fillStyle = wG;
        SpriteRenderer._rr(ctx, cx - 7, base - h, 14, h, 2);
        ctx.fill();
        // Platform
        ctx.fillStyle = '#6a4a1a';
        SpriteRenderer._rr(ctx, cx - 10, base - h - 3, 20, 5, 2);
        ctx.fill();
        // Battlements
        ctx.fillStyle = '#5a3a0a';
        ctx.fillRect(cx - 10, base - h - 8, 5, 6);
        ctx.fillRect(cx - 1, base - h - 8, 5, 6);
        ctx.fillRect(cx + 6, base - h - 8, 5, 6);
        // Bow
        ctx.strokeStyle = '#a67c52';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(cx + 8, base - h + 4, 7, -Math.PI * 0.4, Math.PI * 0.4);
        ctx.stroke();
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 1;
        ctx.beginPath();
        const bx = cx + 8, byr = base - h + 4, br = 7;
        ctx.moveTo(bx + br * Math.cos(-Math.PI * 0.4), byr + br * Math.sin(-Math.PI * 0.4));
        ctx.lineTo(bx + br * Math.cos(Math.PI * 0.4), byr + br * Math.sin(Math.PI * 0.4));
        ctx.stroke();
    }

    static _drawMageTower(ctx, cx, base, level) {
        const h = S * 1.0 + level * 4;
        // Stone tower
        const mG = ctx.createLinearGradient(cx - 7, base - h, cx + 7, base - h);
        mG.addColorStop(0, '#3a3a5a');
        mG.addColorStop(0.5, '#5a5a8a');
        mG.addColorStop(1, '#3a3a5a');
        ctx.fillStyle = mG;
        SpriteRenderer._rr(ctx, cx - 7, base - h, 14, h, 2);
        ctx.fill();
        // Roof (cone)
        ctx.fillStyle = '#2a2a7a';
        ctx.beginPath();
        ctx.moveTo(cx, base - h - 16);
        ctx.lineTo(cx - 10, base - h);
        ctx.lineTo(cx + 10, base - h);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#3a3a8a';
        ctx.beginPath();
        ctx.moveTo(cx, base - h - 14);
        ctx.lineTo(cx - 3, base - h);
        ctx.lineTo(cx + 3, base - h - 2);
        ctx.closePath();
        ctx.fill();
        // Crystal
        SpriteRenderer.drawDiamond(ctx, cx, base - h - 18, 5 + level, '#7788ff');
        SpriteRenderer._glow(ctx, cx, base - h - 18, 10 + level * 2, '#5566ff', 0.25 + level * 0.08);
        // Window glow
        ctx.fillStyle = '#88aaff';
        ctx.beginPath();
        ctx.arc(cx, base - h + 14, 3, 0, Math.PI * 2);
        ctx.fill();
        SpriteRenderer._glow(ctx, cx, base - h + 14, 6, '#88aaff', 0.2);
    }

    static _drawCannonTower(ctx, cx, base, level) {
        const h = S * 0.6;
        // Fortified base
        const cG = ctx.createLinearGradient(cx - 9, base - h, cx + 9, base - h);
        cG.addColorStop(0, '#4a4a4a');
        cG.addColorStop(0.5, '#6a6a6a');
        cG.addColorStop(1, '#4a4a4a');
        ctx.fillStyle = cG;
        SpriteRenderer._rr(ctx, cx - 9, base - h, 18, h, 3);
        ctx.fill();
        // Cannon mount
        ctx.fillStyle = '#3a3a3a';
        SpriteRenderer._rr(ctx, cx - 5, base - h - 6, 10, 8, 2);
        ctx.fill();
        // Barrel
        ctx.fillStyle = '#333';
        SpriteRenderer._rr(ctx, cx + 2, base - h - 10, 14, 5, 2);
        ctx.fill();
        ctx.fillStyle = '#444';
        ctx.beginPath();
        ctx.arc(cx + 16, base - h - 7.5, 3, 0, Math.PI * 2);
        ctx.fill();
        // Cannonball
        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.arc(cx + 16, base - h - 7.5, 2, 0, Math.PI * 2);
        ctx.fill();
        // Rivets
        ctx.fillStyle = '#999';
        [[-6, -3], [4, -3], [-6, 3], [4, 3]].forEach(([dx, dy]) => {
            ctx.beginPath();
            ctx.arc(cx + dx, base - h / 2 + dy, 1.5, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    static _drawFrostTower(ctx, cx, base, level) {
        const h = S * 1.0 + level * 4;
        // Ice tower
        const fG = ctx.createLinearGradient(cx - 6, base - h, cx + 6, base - h);
        fG.addColorStop(0, '#6a98c8');
        fG.addColorStop(0.5, '#a0d0f0');
        fG.addColorStop(1, '#6a98c8');
        ctx.fillStyle = fG;
        SpriteRenderer._rr(ctx, cx - 6, base - h, 12, h, 2);
        ctx.fill();
        // Ice spire
        ctx.fillStyle = '#b0e0ff';
        ctx.beginPath();
        ctx.moveTo(cx, base - h - 18);
        ctx.lineTo(cx - 8, base - h);
        ctx.lineTo(cx + 8, base - h);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#d0f0ff';
        ctx.beginPath();
        ctx.moveTo(cx, base - h - 16);
        ctx.lineTo(cx - 2, base - h);
        ctx.lineTo(cx + 3, base - h - 2);
        ctx.closePath();
        ctx.fill();
        // Crystal
        SpriteRenderer.drawDiamond(ctx, cx, base - h - 20, 5 + level, '#d0f0ff');
        // Frost aura
        SpriteRenderer._glow(ctx, cx, base - h / 2, 16 + level * 3, '#88ccff', 0.15);
        // Icicles
        ctx.fillStyle = '#c0e8ff';
        [[-7, 0], [5, 3]].forEach(([dx, dh]) => {
            ctx.beginPath();
            ctx.moveTo(cx + dx, base - h);
            ctx.lineTo(cx + dx, base - h + 8 + dh);
            ctx.lineTo(cx + dx + 2, base - h);
            ctx.closePath();
            ctx.fill();
        });
    }

    static _drawTeslaTower(ctx, cx, base, level) {
        const h = S * 1.1 + level * 4;
        // Metal pole
        const tG = ctx.createLinearGradient(cx - 4, base - h, cx + 4, base - h);
        tG.addColorStop(0, '#777');
        tG.addColorStop(0.5, '#aaa');
        tG.addColorStop(1, '#777');
        ctx.fillStyle = tG;
        SpriteRenderer._rr(ctx, cx - 4, base - h, 8, h, 1);
        ctx.fill();
        // Coils
        ctx.fillStyle = '#aa8833';
        SpriteRenderer._rr(ctx, cx - 8, base - h * 0.5, 16, 3, 1);
        ctx.fill();
        SpriteRenderer._rr(ctx, cx - 8, base - h * 0.3, 16, 3, 1);
        ctx.fill();
        // Top platform
        ctx.fillStyle = '#666';
        SpriteRenderer._rr(ctx, cx - 10, base - h - 3, 20, 5, 2);
        ctx.fill();
        // Tesla ball
        ctx.fillStyle = '#999';
        ctx.fillRect(cx - 2, base - h - 10, 4, 8);
        SpriteRenderer._glow(ctx, cx, base - h - 12, 9 + level * 2, '#ffee00', 0.25 + level * 0.08);
        ctx.fillStyle = '#ffee00';
        ctx.beginPath();
        ctx.arc(cx, base - h - 12, 5 + level, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.beginPath();
        ctx.arc(cx - 1, base - h - 13, 2 + level * 0.5, 0, Math.PI * 2);
        ctx.fill();
        // Sparks
        ctx.strokeStyle = '#ffee00';
        ctx.lineWidth = 1;
        ctx.lineCap = 'round';
        const t = Date.now() * 0.01;
        for (let i = 0; i < 2 + level; i++) {
            const a = t + i * 2.1;
            ctx.beginPath();
            ctx.moveTo(cx, base - h - 12);
            const ex = cx + Math.cos(a) * (8 + level * 2);
            const ey = base - h - 12 + Math.sin(a) * (8 + level * 2);
            const mx = (cx + ex) / 2 + Math.sin(t * 3 + i) * 4;
            const my = (base - h - 12 + ey) / 2 + Math.cos(t * 3 + i) * 4;
            ctx.lineTo(mx, my);
            ctx.lineTo(ex, ey);
            ctx.stroke();
        }
    }

    static _drawStar(ctx, x, y, r) {
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const a = (i * 4 * Math.PI) / 5 - Math.PI / 2;
            const method = i === 0 ? 'moveTo' : 'lineTo';
            ctx[method](x + Math.cos(a) * r, y + Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.fill();
    }

    static drawCastle(ctx, x, y, level, hpPct) {
        const cx = x;
        const base = y;
        const sc = 2.0; // Scale factor - much bigger castle

        // Shadow
        SpriteRenderer.drawShadow(ctx, cx, base + 6, S * 2.2, 10);

        // Outer walls (ramparts)
        const wallW = S * 2.8 * sc * 0.5;
        const wallH = S * 0.6 * sc * 0.5;
        const wallG = ctx.createLinearGradient(cx - wallW, base - wallH, cx + wallW, base - wallH);
        wallG.addColorStop(0, '#3a3a4a');
        wallG.addColorStop(0.5, '#5a5a6a');
        wallG.addColorStop(1, '#3a3a4a');
        ctx.fillStyle = wallG;
        ctx.fillRect(cx - wallW, base - wallH, wallW * 2, wallH);
        // Wall stone lines
        ctx.fillStyle = 'rgba(0,0,0,0.06)';
        for (let py = base - wallH + 4; py < base - 2; py += 6) {
            ctx.fillRect(cx - wallW + 2, py, wallW * 2 - 4, 1);
        }
        // Wall battlements
        ctx.fillStyle = '#5a5a6a';
        const bCount = 12;
        for (let i = 0; i < bCount; i++) {
            const bx = cx - wallW + 4 + i * (wallW * 2 - 8) / bCount;
            ctx.fillRect(bx, base - wallH - 5, 6, 6);
        }

        // Main keep (center)
        const kW = S * 1.6, kH = S * 2.2;
        const kG = ctx.createLinearGradient(cx - kW / 2, base - kH, cx + kW / 2, base - kH);
        kG.addColorStop(0, '#4a4a5a');
        kG.addColorStop(0.3, '#6a6a7a');
        kG.addColorStop(0.7, '#5a5a6a');
        kG.addColorStop(1, '#3a3a4a');
        ctx.fillStyle = kG;
        SpriteRenderer._rr(ctx, cx - kW / 2, base - kH, kW, kH, 3);
        ctx.fill();
        // Keep stone detail
        ctx.fillStyle = 'rgba(0,0,0,0.05)';
        for (let py = base - kH + 8; py < base - 4; py += 8) {
            ctx.fillRect(cx - kW / 2 + 3, py, kW - 6, 1);
        }
        // Keep battlements
        ctx.fillStyle = '#6a6a7a';
        for (let i = 0; i < 7; i++) {
            const bx = cx - kW / 2 + 4 + i * (kW - 8) / 7;
            ctx.fillRect(bx, base - kH - 7, 7, 8);
        }

        // Left tower
        const tW = S * 0.7, tH = S * 2.8;
        const ltX = cx - kW / 2 - tW * 0.2;
        ctx.fillStyle = '#5a5a6a';
        SpriteRenderer._rr(ctx, ltX, base - tH, tW, tH, 3);
        ctx.fill();
        // Left tower highlight
        ctx.fillStyle = 'rgba(255,255,255,0.04)';
        ctx.fillRect(ltX + 2, base - tH + 3, tW * 0.3, tH - 6);
        // Left tower roof
        ctx.fillStyle = '#3a3a5a';
        ctx.beginPath();
        ctx.moveTo(ltX + tW / 2, base - tH - S * 0.6);
        ctx.lineTo(ltX - 5, base - tH);
        ctx.lineTo(ltX + tW + 5, base - tH);
        ctx.closePath();
        ctx.fill();
        // Left tower windows
        for (let wi = 0; wi < 3; wi++) {
            const wy = base - tH + 18 + wi * 22;
            ctx.fillStyle = '#445577';
            SpriteRenderer._rr(ctx, ltX + tW / 2 - 4, wy, 8, 12, 4);
            ctx.fill();
            ctx.fillStyle = 'rgba(255,200,100,0.12)';
            ctx.beginPath();
            ctx.arc(ltX + tW / 2, wy + 6, 7, 0, Math.PI * 2);
            ctx.fill();
        }

        // Right tower
        const rtX = cx + kW / 2 - tW * 0.8;
        ctx.fillStyle = '#5a5a6a';
        SpriteRenderer._rr(ctx, rtX, base - tH, tW, tH, 3);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.04)';
        ctx.fillRect(rtX + 2, base - tH + 3, tW * 0.3, tH - 6);
        // Right tower roof
        ctx.fillStyle = '#3a3a5a';
        ctx.beginPath();
        ctx.moveTo(rtX + tW / 2, base - tH - S * 0.6);
        ctx.lineTo(rtX - 5, base - tH);
        ctx.lineTo(rtX + tW + 5, base - tH);
        ctx.closePath();
        ctx.fill();
        // Right tower windows
        for (let wi = 0; wi < 3; wi++) {
            const wy = base - tH + 18 + wi * 22;
            ctx.fillStyle = '#445577';
            SpriteRenderer._rr(ctx, rtX + tW / 2 - 4, wy, 8, 12, 4);
            ctx.fill();
            ctx.fillStyle = 'rgba(255,200,100,0.12)';
            ctx.beginPath();
            ctx.arc(rtX + tW / 2, wy + 6, 7, 0, Math.PI * 2);
            ctx.fill();
        }

        // Gate
        const gateW = S * 0.6, gateH = S * 0.9;
        ctx.fillStyle = '#1a0e05';
        SpriteRenderer._rr(ctx, cx - gateW / 2, base - gateH, gateW, gateH, gateW / 2);
        ctx.fill();
        // Gate wooden planks
        ctx.fillStyle = '#2a1808';
        ctx.fillRect(cx - 1, base - gateH + 5, 2, gateH - 5);
        // Gate metal studs
        ctx.fillStyle = '#aa8833';
        [[-8, -10], [6, -10], [-8, -24], [6, -24], [-1, -17]].forEach(([dx, dy]) => {
            ctx.beginPath();
            ctx.arc(cx + dx, base + dy, 2.5, 0, Math.PI * 2);
            ctx.fill();
        });
        // Gate arch highlight
        ctx.strokeStyle = '#886622';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, base - gateH + gateW / 2, gateW / 2 - 2, Math.PI, 0);
        ctx.stroke();

        // Keep windows (larger)
        ctx.fillStyle = '#445577';
        const winPositions = [[-16, -kH + 25], [8, -kH + 25], [-16, -kH + 50], [8, -kH + 50]];
        winPositions.forEach(([dx, dy]) => {
            SpriteRenderer._rr(ctx, cx + dx, base + dy, 10, 14, 5);
            ctx.fill();
        });
        // Window warm glow
        ctx.fillStyle = 'rgba(255,200,100,0.15)';
        winPositions.forEach(([dx, dy]) => {
            ctx.beginPath();
            ctx.arc(cx + dx + 5, base + dy + 7, 9, 0, Math.PI * 2);
            ctx.fill();
        });

        // Flags on both towers
        const t = Date.now() * 0.002;
        const drawFlag = (fx, fy, color) => {
            ctx.fillStyle = color;
            ctx.fillRect(fx - 1, fy - S * 0.5, 2, S * 0.5);
            const wave = Math.sin(t) * 2;
            ctx.beginPath();
            ctx.moveTo(fx + 1, fy - S * 0.5);
            ctx.quadraticCurveTo(fx + 10, fy - S * 0.45 + wave, fx + 16, fy - S * 0.42);
            ctx.lineTo(fx + 16, fy - S * 0.3);
            ctx.quadraticCurveTo(fx + 10, fy - S * 0.33 + wave, fx + 1, fy - S * 0.28);
            ctx.closePath();
            ctx.fill();
        };
        drawFlag(ltX + tW / 2, base - tH - S * 0.6, '#cc3333');
        drawFlag(rtX + tW / 2, base - tH - S * 0.6, '#3333cc');

        // Level upgrade visuals
        if (level >= 2) {
            // Golden trim on keep
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 1.5;
            ctx.globalAlpha = 0.6;
            SpriteRenderer._rr(ctx, cx - kW / 2, base - kH, kW, kH, 3);
            ctx.stroke();
            ctx.globalAlpha = 1;
            // Golden banner between towers
            ctx.fillStyle = 'rgba(255,215,0,0.15)';
            ctx.fillRect(cx - kW / 2, base - kH - 7, kW, 3);
        }
        if (level >= 3) {
            // Magical barrier glow
            SpriteRenderer._glow(ctx, cx, base - kH / 2, kW * 0.6, '#4488ff', 0.1);
            // Runes on walls
            ctx.fillStyle = 'rgba(100,150,255,0.2)';
            for (let i = 0; i < 5; i++) {
                const rx = cx - wallW + 15 + i * (wallW * 2 - 30) / 5;
                ctx.beginPath();
                ctx.arc(rx, base - wallH / 2, 3, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        if (level >= 4) {
            // Crown on keep
            ctx.fillStyle = '#ffd700';
            ctx.beginPath();
            ctx.moveTo(cx - 10, base - kH - 7);
            ctx.lineTo(cx - 12, base - kH - 16);
            ctx.lineTo(cx - 6, base - kH - 11);
            ctx.lineTo(cx, base - kH - 18);
            ctx.lineTo(cx + 6, base - kH - 11);
            ctx.lineTo(cx + 12, base - kH - 16);
            ctx.lineTo(cx + 10, base - kH - 7);
            ctx.closePath();
            ctx.fill();
        }
        if (level >= 5) {
            // Divine aura
            const auraAlpha = 0.06 + Math.sin(t * 2) * 0.03;
            SpriteRenderer._glow(ctx, cx, base - kH / 2, kW * 0.8, '#ffd700', auraAlpha);
            SpriteRenderer._glow(ctx, cx, base - kH / 2, kW * 0.4, '#ffffff', auraAlpha * 0.5);
        }

        // Damage overlay
        if (hpPct < 1) {
            ctx.strokeStyle = `rgba(50,30,20,${0.5 * (1 - hpPct)})`;
            ctx.lineWidth = 2;
            if (hpPct < 0.7) {
                ctx.beginPath();
                ctx.moveTo(cx - 12, base - kH + 15);
                ctx.lineTo(cx - 5, base - kH + 35);
                ctx.lineTo(cx - 14, base - kH + 55);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(cx - wallW + 10, base - wallH + 5);
                ctx.lineTo(cx - wallW + 18, base - 5);
                ctx.stroke();
            }
            if (hpPct < 0.4) {
                ctx.beginPath();
                ctx.moveTo(cx + 14, base - kH + 20);
                ctx.lineTo(cx + 8, base - kH + 50);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(cx + wallW - 15, base - wallH + 3);
                ctx.lineTo(cx + wallW - 8, base - 8);
                ctx.stroke();
            }
            if (hpPct < 0.25) {
                // Smoke and fire
                ctx.fillStyle = `rgba(180,60,0,${0.12 * (1 - hpPct)})`;
                ctx.beginPath();
                ctx.arc(cx - 10 + Math.sin(t * 1.5) * 4, base - kH + 12, 10, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = `rgba(80,80,80,${0.1 * (1 - hpPct)})`;
                ctx.beginPath();
                ctx.arc(cx + 8 + Math.sin(t + 2) * 3, base - kH - 8, 12, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(cx - 5 + Math.sin(t * 1.2) * 5, base - kH - 20, 14, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    static drawTile(ctx, col, row, color) {
        ctx.fillStyle = color;
        ctx.fillRect(col * S, row * S, S, S);
    }
}
