import { TowerData, ElementColors, ElementNames } from '../data/TowerData.js';
import { SpriteRenderer } from '../renderer/SpriteRenderer.js';
import { UIRenderer } from '../renderer/UIRenderer.js';
import { TILE_SIZE, TOWER_TYPES, COLORS } from '../utils/Constants.js';
import { pointInRect } from '../utils/MathUtils.js';

export class TowerMenu {
    constructor() {
        this.visible = false;
        this.mode = null;
        this.col = 0;
        this.row = 0;
        this.tower = null;
        this.hoveredOption = -1;
        this.options = [];
        this.gold = 0;
        // Manage mode hover zones
        this.hoveredZone = null; // 'upgrade', 'sell', 'dmg', 'range', 'speed'
    }

    openBuild(col, row, gold, mapsCompleted = {}, currentWave = 1) {
        this.visible = true;
        this.mode = 'build';
        this.col = col;
        this.row = row;
        this.tower = null;
        this.gold = gold;

        // Permanent unlock: which map must be completed to unlock each tower
        const unlockReqs = {
            archer: null,           // always available
            mage:   null,           // always available
            cannon: 'forest',       // complete Forest Path
            frost:  'desert',       // complete Desert Spiral
            tesla:  'mountain'      // complete Mountain Pass
        };

        const mapNames = {
            forest: 'Forest Path',
            desert: 'Desert Spiral',
            mountain: 'Mountain Pass'
        };

        // In-run unlock: minimum wave to place each tower during a run
        const unlockWaves = {
            archer: 1,
            mage:   1,
            cannon: 5,
            frost:  8,
            tesla:  12
        };

        const types = Object.keys(TOWER_TYPES).map(k => TOWER_TYPES[k]);
        this.options = types.map(type => {
            const data = TowerData[type];
            const req = unlockReqs[type];
            const mapLocked = req ? !mapsCompleted[req] : false;
            const unlockWave = unlockWaves[type] || 1;
            const waveLocked = currentWave < unlockWave;
            const locked = mapLocked || waveLocked;
            const elemName = ElementNames[data.element] || '';

            let lockReason = '';
            if (mapLocked) {
                lockReason = `Complete ${mapNames[req] || req}`;
            } else if (waveLocked) {
                lockReason = `Unlocks wave ${unlockWave}`;
            }

            return {
                type,
                text: data.name,
                cost: data.cost,
                description: locked ? lockReason : `[${elemName}] ${data.description}`,
                canAfford: !locked && gold >= data.cost,
                action: 'build',
                locked,
                elemColor: data.element ? ElementColors[data.element] : null
            };
        });
    }

    openManage(tower, gold) {
        this.visible = true;
        this.mode = 'manage';
        this.tower = tower;
        this.col = tower.col;
        this.row = tower.row;
        this.gold = gold;
        this.options = [];
        this.hoveredZone = null;
    }

    updateGold(gold) {
        if (!this.visible) return;
        this.gold = gold;
        for (const opt of this.options) {
            if (opt.locked) continue;
            if (opt.action === 'sell') continue;
            opt.canAfford = gold >= opt.cost;
        }
    }

    close() {
        this.visible = false;
        this.options = [];
        this.hoveredOption = -1;
        this.hoveredZone = null;
    }

    _getManageLayout() {
        const t = this.tower;
        const td = TowerData[t.type];
        const hasSpecial = td.slowAmount || td.splash || td.chainTargets;
        const lineH = 17;
        // All Y offsets relative to panel top (py)
        const headerH = 36;                                    // 0..36
        const sepGap = 8;                                      // 36..44
        const statsY = headerH + sepGap;                       // 44 — stats table starts
        const statsH = lineH * 5;                              // header row + 4 data rows = 85
        const sep2Y = statsY + statsH + 4;                     // 133
        const statUpY = sep2Y + 6;                             // 139
        const statUpH = 3 * 26;                                // 78
        const specialH = hasSpecial ? 22 : 0;
        const btnY = statUpY + statUpH + 4 + specialH;        // 221 (+ specialH)
        const btnH = 30;
        const h = btnY + btnH + 8;                             // 259 (+ specialH)
        return { statsY, lineH, sep2Y, statUpY, specialH, btnY, btnH, h, hasSpecial };
    }

    _placePanelSmart(pw, ph) {
        const topLimit = 50;       // below top HUD bar
        const bottomLimit = 584;   // above bottom hero bar (640 - 56)
        const tileX = this.col * TILE_SIZE;
        const tileY = this.row * TILE_SIZE;
        const tileCenterY = tileY + TILE_SIZE / 2;
        const gap = 4;

        // Horizontal: prefer right of tile, fallback left
        let mx = tileX + TILE_SIZE + gap;
        if (mx + pw > 960) mx = tileX - pw - gap;
        if (mx < 0) mx = 0;

        // Vertical: center on tile, then clamp to safe zone
        let my = tileCenterY - ph / 2;

        // Clamp within safe zone
        if (my + ph > bottomLimit) my = bottomLimit - ph;
        if (my < topLimit) my = topLimit;

        // If still overflows bottom (panel taller than safe zone), prefer top alignment
        if (my + ph > bottomLimit) my = topLimit;

        return { x: mx, y: my };
    }

    _getManageBounds() {
        const w = 260;
        const { h } = this._getManageLayout();
        const pos = this._placePanelSmart(w, h);
        return { x: pos.x, y: pos.y, w, h };
    }

    _getBuildBounds() {
        const menuW = 220;
        const optH = 44;
        const menuH = this.options.length * optH + 18;
        const pos = this._placePanelSmart(menuW, menuH);
        return { x: pos.x, y: pos.y, w: menuW, h: menuH, optH };
    }

    getMenuBounds() {
        if (this.mode === 'manage' && this.tower) {
            return this._getManageBounds();
        }
        return this._getBuildBounds();
    }

    handleMouseMove(x, y) {
        if (!this.visible) return;

        if (this.mode === 'manage' && this.tower) {
            this._handleManageHover(x, y);
            return;
        }

        const { x: mx, y: my, w, optH } = this._getBuildBounds();
        this.hoveredOption = -1;
        for (let i = 0; i < this.options.length; i++) {
            const oy = my + 9 + i * optH;
            if (pointInRect(x, y, mx + 6, oy, w - 12, optH - 4)) {
                this.hoveredOption = i;
            }
        }
    }

    _handleManageHover(x, y) {
        this.hoveredZone = null;
        const zones = this._getManageZones();
        for (const z of zones) {
            if (pointInRect(x, y, z.x, z.y, z.w, z.h)) {
                this.hoveredZone = z.id;
                return;
            }
        }
    }

    _getManageZones() {
        const { x: mx, y: my, w } = this._getManageBounds();
        const layout = this._getManageLayout();
        const t = this.tower;
        const zones = [];
        const pad = 8;

        // Stat upgrade buttons (right side of stat upgrade rows)
        const btnW = 56;
        const btnH = 22;
        const btnX = mx + w - pad - btnW;
        const stats = ['damage', 'range', 'speed'];
        for (let i = 0; i < 3; i++) {
            zones.push({ id: stats[i], x: btnX, y: my + layout.statUpY + i * 26, w: btnW, h: btnH });
        }

        // Bottom buttons
        const bottomY = my + layout.btnY;
        const upgradeCost = t.getUpgradeCost();
        if (upgradeCost !== null) {
            zones.push({ id: 'upgrade', x: mx + pad, y: bottomY, w: w - pad * 2 - 70, h: layout.btnH });
            zones.push({ id: 'sell', x: mx + w - pad - 62, y: bottomY, w: 62, h: layout.btnH });
        } else {
            zones.push({ id: 'sell', x: mx + pad, y: bottomY, w: w - pad * 2, h: layout.btnH });
        }

        return zones;
    }

    handleClick(x, y) {
        if (!this.visible) return null;

        if (this.mode === 'manage' && this.tower) {
            return this._handleManageClick(x, y);
        }

        // Build mode
        const { x: mx, y: my, w, h, optH } = this._getBuildBounds();
        for (let i = 0; i < this.options.length; i++) {
            const oy = my + 9 + i * optH;
            if (pointInRect(x, y, mx + 6, oy, w - 12, optH - 4) && this.options[i].canAfford) {
                const opt = this.options[i];
                this.close();
                return {
                    action: opt.action,
                    type: opt.type,
                    tower: this.tower,
                    col: this.col,
                    row: this.row,
                    stat: opt.stat
                };
            }
        }

        if (!pointInRect(x, y, mx, my, w, h)) {
            this.close();
        }
        return null;
    }

    _handleManageClick(x, y) {
        const bounds = this._getManageBounds();
        const zones = this._getManageZones();
        const t = this.tower;

        for (const z of zones) {
            if (!pointInRect(x, y, z.x, z.y, z.w, z.h)) continue;

            if (z.id === 'upgrade') {
                const cost = t.getUpgradeCost();
                if (cost && this.gold >= cost) {
                    return { action: 'upgrade', tower: t, col: this.col, row: this.row };
                }
                return null;
            }
            if (z.id === 'sell') {
                this.close();
                return { action: 'sell', tower: t, col: this.col, row: this.row };
            }
            // Stat upgrades
            if (z.id === 'damage' || z.id === 'range' || z.id === 'speed') {
                const cost = t.getStatUpgradeCost(z.id);
                if (cost && this.gold >= cost) {
                    return { action: 'upgradeStat', tower: t, col: this.col, row: this.row, stat: z.id };
                }
                return null;
            }
        }

        // Click outside panel = close
        if (!pointInRect(x, y, bounds.x, bounds.y, bounds.w, bounds.h)) {
            this.close();
        }
        return null;
    }

    getHoveredBuildPreview() {
        if (!this.visible || this.mode !== 'build' || this.hoveredOption < 0) return null;
        const opt = this.options[this.hoveredOption];
        if (!opt || opt.locked || !opt.canAfford) return null;
        const data = TowerData[opt.type];
        return {
            col: this.col,
            row: this.row,
            range: data.range[0],
            color: data.color || '#aaa',
            element: data.element
        };
    }

    render(ctx, camX = 0, camY = 0) {
        if (!this.visible) return;

        if (this.mode === 'manage' && this.tower) {
            this._renderManagePanel(ctx);
            return;
        }

        this._renderBuildMenu(ctx);
    }

    _renderBuildMenu(ctx) {
        const { x: mx, y: my, w, h, optH } = this._getBuildBounds();

        UIRenderer.drawPanel(ctx, mx, my, w, h, 0.72);

        for (let i = 0; i < this.options.length; i++) {
            const opt = this.options[i];
            const oy = my + 9 + i * optH;
            const hovered = this.hoveredOption === i;

            const r = 6;
            const bgColor = !opt.canAfford ? 'rgba(20,20,24,0.5)' : hovered ? 'rgba(48,48,74,0.6)' : 'rgba(30,30,46,0.5)';
            ctx.fillStyle = bgColor;
            SpriteRenderer._rr(ctx, mx + 6, oy, w - 12, optH - 4, r);
            ctx.fill();

            if (hovered && opt.canAfford) {
                ctx.strokeStyle = 'rgba(255,255,255,0.2)';
                ctx.lineWidth = 1;
                SpriteRenderer._rr(ctx, mx + 6, oy, w - 12, optH - 4, r);
                ctx.stroke();
            }

            if (opt.elemColor && !opt.locked) {
                ctx.fillStyle = opt.elemColor;
                ctx.globalAlpha = 0.3;
                SpriteRenderer._rr(ctx, mx + 6, oy, 4, optH - 4, r);
                ctx.fill();
                ctx.globalAlpha = 1;
                ctx.fillStyle = opt.elemColor;
                ctx.beginPath();
                ctx.arc(mx + w - 26, oy + 12, 5, 0, Math.PI * 2);
                ctx.fill();
            }

            if (opt.locked) {
                SpriteRenderer.drawText(ctx, '\uD83D\uDD12', mx + w - 28, oy + 12, '#888', 14);
            }

            const textColor = opt.canAfford ? '#eee' : '#777';
            SpriteRenderer.drawText(ctx, opt.text, mx + 16, oy + 5, textColor, 13);

            if (opt.description) {
                // Truncate description to avoid overlapping cost on the right
                ctx.font = '10px monospace';
                let desc = opt.description;
                const maxDescW = w - 90;
                while (desc.length > 0 && ctx.measureText(desc).width > maxDescW) {
                    desc = desc.slice(0, -1);
                }
                if (desc.length < opt.description.length) desc += '…';
                SpriteRenderer.drawTextNoOutline(ctx, desc, mx + 16, oy + 24, '#aaa', 10);
            }

            if (opt.cost > 0) {
                const costColor = opt.canAfford ? '#88ccff' : '#667';
                UIRenderer.drawEssenceIcon(ctx, mx + w - 50, oy + 24, 8);
                SpriteRenderer.drawTextNoOutline(ctx, `${opt.cost}`, mx + w - 38, oy + 24, costColor, 11);
            }
        }
    }

    _renderManagePanel(ctx) {
        const t = this.tower;
        const td = TowerData[t.type];
        const elemColor = ElementColors[td.element] || '#fff';
        const elemName = ElementNames[td.element] || '';
        const { x: px, y: py, w: pw, h: ph } = this._getManageBounds();
        const layout = this._getManageLayout();
        const pad = 8;

        UIRenderer.drawPanel(ctx, px, py, pw, ph, 0.74);

        // ── HEADER ──
        SpriteRenderer.drawText(ctx, td.name, px + pad + 2, py + 8, '#ffd700', 15);

        // Level pips (after name, measured properly)
        ctx.font = `800 15px 'Nunito', 'Segoe UI', sans-serif`;
        const nameW = ctx.measureText(td.name).width;
        const pipX = px + pad + 2 + nameW + 10;
        for (let i = 0; i < 4; i++) {
            ctx.fillStyle = i < t.level ? '#ffd700' : '#2a2a2a';
            ctx.beginPath();
            ctx.arc(pipX + i * 12, py + 16, 4, 0, Math.PI * 2);
            ctx.fill();
            if (i < t.level) {
                ctx.strokeStyle = 'rgba(255,255,255,0.2)';
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        }

        // Element badge
        ctx.fillStyle = elemColor;
        ctx.globalAlpha = 0.15;
        SpriteRenderer._rr(ctx, px + pw - pad - 56, py + 6, 50, 16, 5);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = elemColor;
        ctx.beginPath();
        ctx.arc(px + pw - pad - 46, py + 14, 4, 0, Math.PI * 2);
        ctx.fill();
        SpriteRenderer.drawTextNoOutline(ctx, elemName, px + pw - pad - 38, py + 9, elemColor, 9);

        // Target mode
        const modeNames = { first: 'First', closest: 'Closest', strongest: 'Strongest' };
        SpriteRenderer.drawTextNoOutline(ctx, `Target: ${modeNames[td.targetMode] || td.targetMode}`, px + pad + 2, py + 26, '#999', 9);

        UIRenderer.drawSeparator(ctx, px + pad, py + 36, pw - pad * 2);

        // ── STATS TABLE ──
        const sy = py + layout.statsY;
        const col1 = px + pad + 2;
        const col2 = px + 65;
        const col3 = px + 120;
        const lineH = layout.lineH;

        const curDmg = t.damage;
        const curRange = t.range;
        const curCd = t.cooldown;
        const curDps = curDmg / curCd;

        const canLevelUp = t.level < 4;
        let nextDmg = curDmg, nextRange = curRange, nextCd = curCd;
        if (canLevelUp) {
            const nl = t.level;
            nextDmg = td.damage[nl] * t.damageMult * (1 + t.damageUpgrades * 0.15);
            nextRange = td.range[nl] * t.rangeMult * (1 + t.rangeUpgrades * 0.10);
            nextCd = td.cooldown[nl] * (1 - t.speedUpgrades * 0.10);
        }

        // Column headers
        SpriteRenderer.drawTextNoOutline(ctx, 'STAT', col1, sy, '#888', 8);
        SpriteRenderer.drawTextNoOutline(ctx, 'NOW', col2 + 2, sy, '#888', 8);
        if (canLevelUp) SpriteRenderer.drawTextNoOutline(ctx, 'NEXT', col3 + 2, sy, '#888', 8);

        const fmt = v => `${Math.round(v)}`;
        const fmtAps = v => (1 / v).toFixed(2);
        const fmtDec = v => v.toFixed(1);

        const renderStatRow = (rowY, label, color, cur, next, format) => {
            ctx.fillStyle = 'rgba(255,255,255,0.04)';
            SpriteRenderer._rr(ctx, col1 - 2, rowY - 2, pw - pad * 2, lineH, 3);
            ctx.fill();
            SpriteRenderer.drawTextNoOutline(ctx, label, col1, rowY, '#ccc', 10);
            SpriteRenderer.drawText(ctx, format(cur), col2, rowY, color, 10);
            if (canLevelUp) {
                SpriteRenderer.drawText(ctx, format(next), col3, rowY, color, 10);
                const diff = next - cur;
                if (Math.abs(diff) > 0.001) {
                    const diffStr = format === fmtAps
                        ? `+${(1/next - 1/cur).toFixed(2)}`
                        : `+${format(diff)}`;
                    if (diff > 0 || format === fmtAps) {
                        SpriteRenderer.drawTextNoOutline(ctx, diffStr, col3 + 36, rowY + 1, '#44dd44', 8);
                    }
                }
            }
        };

        renderStatRow(sy + lineH, 'Damage', '#ff8844', curDmg, nextDmg, fmt);
        renderStatRow(sy + lineH * 2, 'Range', '#66cc66', curRange, nextRange, fmt);
        renderStatRow(sy + lineH * 3, 'Atk/s', '#44aaff', curCd, canLevelUp ? nextCd : curCd, fmtAps);
        renderStatRow(sy + lineH * 4, 'DPS', '#ffcc44', curDps, canLevelUp ? nextDmg / nextCd : curDps, fmtDec);

        // ── STAT UPGRADES (inline) ──
        UIRenderer.drawSeparator(ctx, px + pad, py + layout.sep2Y, pw - pad * 2);
        const suY = py + layout.statUpY;
        const statDefs = [
            { id: 'damage', label: 'Damage', pct: '+15%', color: '#ff8844' },
            { id: 'range', label: 'Range', pct: '+10%', color: '#66cc66' },
            { id: 'speed', label: 'Atk Speed', pct: '+10%', color: '#44aaff' }
        ];

        for (let i = 0; i < statDefs.length; i++) {
            const s = statDefs[i];
            const rowY = suY + i * 26;
            const lvl = t[s.id + 'Upgrades'];
            const cost = t.getStatUpgradeCost(s.id);
            const maxed = cost === null;
            const canAfford = !maxed && this.gold >= cost;
            const hovered = this.hoveredZone === s.id;

            // Color accent line
            ctx.fillStyle = s.color;
            ctx.globalAlpha = 0.2;
            ctx.fillRect(px + pad, rowY, 3, 22);
            ctx.globalAlpha = 1;

            // Label + pct
            SpriteRenderer.drawTextNoOutline(ctx, s.label, px + pad + 8, rowY + 2, '#ddd', 10);
            SpriteRenderer.drawTextNoOutline(ctx, s.pct, px + pad + 8, rowY + 13, '#999', 9);

            // Pips
            const pipStartX = px + pad + 80;
            for (let p = 0; p < 3; p++) {
                ctx.fillStyle = p < lvl ? s.color : '#1e1e2a';
                ctx.beginPath();
                ctx.arc(pipStartX + p * 13, rowY + 11, 4.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = p < lvl ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)';
                ctx.lineWidth = 1;
                ctx.stroke();
            }

            // Upgrade button (right side)
            const btnX = px + pw - pad - 56;
            const btnW = 56;
            const btnH = 22;
            if (maxed) {
                ctx.fillStyle = 'rgba(80,160,80,0.1)';
                SpriteRenderer._rr(ctx, btnX, rowY, btnW, btnH, 5);
                ctx.fill();
                SpriteRenderer.drawTextNoOutline(ctx, 'MAX', btnX + btnW / 2, rowY + 5, '#7aaa7a', 10, 'center');
            } else {
                ctx.fillStyle = hovered && canAfford ? 'rgba(42,42,62,0.6)' : 'rgba(24,24,34,0.5)';
                SpriteRenderer._rr(ctx, btnX, rowY, btnW, btnH, 5);
                ctx.fill();
                ctx.strokeStyle = canAfford
                    ? (hovered ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)')
                    : 'rgba(255,255,255,0.04)';
                ctx.lineWidth = 1;
                SpriteRenderer._rr(ctx, btnX, rowY, btnW, btnH, 5);
                ctx.stroke();

                UIRenderer.drawEssenceIcon(ctx, btnX + 8, rowY + 5, 7);
                SpriteRenderer.drawTextNoOutline(ctx, `${cost}`, btnX + 20, rowY + 5, canAfford ? '#88ccff' : '#667', 10);
            }
        }

        // ── SPECIAL STATS ──
        if (layout.hasSpecial) {
            const specY = suY + 3 * 26 + 4;
            if (td.slowAmount) {
                const slow = td.slowAmount[t.level - 1];
                const dur = td.slowDuration[t.level - 1];
                SpriteRenderer.drawTextNoOutline(ctx, `Slow: ${Math.round(slow * 100)}% for ${dur.toFixed(1)}s`, col1, specY, '#44ccff', 9);
            }
            if (td.splash) {
                const spl = td.splash[t.level - 1];
                SpriteRenderer.drawTextNoOutline(ctx, `Splash: ${spl}px (${Math.round(td.splashDamagePct * 100)}% dmg)`, col1, specY, '#ff6622', 9);
            }
            if (td.chainTargets) {
                const ch = td.chainTargets[t.level - 1];
                const cr = td.chainRange[t.level - 1];
                SpriteRenderer.drawTextNoOutline(ctx, `Chain: ${ch} targets, ${cr}px range`, col1, specY, '#ffee33', 9);
            }
        }

        // ── BOTTOM BUTTONS ──
        const bottomY = py + layout.btnY;
        const upgradeCost = t.getUpgradeCost();
        const canUpgrade = upgradeCost !== null && this.gold >= upgradeCost;

        if (upgradeCost !== null) {
            // Level upgrade button
            const ubW = pw - pad * 2 - 70;
            const upHov = this.hoveredZone === 'upgrade';
            ctx.fillStyle = canUpgrade
                ? (upHov ? 'rgba(42,58,42,0.6)' : 'rgba(30,46,30,0.5)')
                : 'rgba(24,24,34,0.5)';
            SpriteRenderer._rr(ctx, px + pad, bottomY, ubW, 30, 6);
            ctx.fill();
            ctx.strokeStyle = canUpgrade
                ? (upHov ? 'rgba(100,200,100,0.4)' : 'rgba(80,160,80,0.25)')
                : 'rgba(255,255,255,0.04)';
            ctx.lineWidth = 1;
            SpriteRenderer._rr(ctx, px + pad, bottomY, ubW, 30, 6);
            ctx.stroke();

            SpriteRenderer.drawText(ctx, `Lv.${t.level + 1}`, px + pad + 10, bottomY + 7, canUpgrade ? '#eee' : '#888', 12);
            UIRenderer.drawEssenceIcon(ctx, px + pad + ubW - 60, bottomY + 9, 8);
            SpriteRenderer.drawTextNoOutline(ctx, `${upgradeCost}`, px + pad + ubW - 46, bottomY + 9, canUpgrade ? '#88ccff' : '#667', 11);

            // Sell button (right)
            const sellX = px + pw - pad - 62;
            const sellHov = this.hoveredZone === 'sell';
            ctx.fillStyle = sellHov ? 'rgba(58,32,32,0.6)' : 'rgba(36,24,24,0.5)';
            SpriteRenderer._rr(ctx, sellX, bottomY, 62, 30, 6);
            ctx.fill();
            ctx.strokeStyle = sellHov ? 'rgba(180,80,80,0.4)' : 'rgba(255,255,255,0.06)';
            ctx.lineWidth = 1;
            SpriteRenderer._rr(ctx, sellX, bottomY, 62, 30, 6);
            ctx.stroke();
            SpriteRenderer.drawTextNoOutline(ctx, 'Sell', sellX + 8, bottomY + 5, sellHov ? '#ff9999' : '#ccaaaa', 11);
            UIRenderer.drawEssenceIcon(ctx, sellX + 8, bottomY + 18, 6);
            SpriteRenderer.drawTextNoOutline(ctx, `+${t.sellValue}`, sellX + 20, bottomY + 17, '#88ccff', 10);
        } else {
            // Max level — just sell
            const sellHov = this.hoveredZone === 'sell';
            ctx.fillStyle = sellHov ? 'rgba(58,32,32,0.6)' : 'rgba(36,24,24,0.5)';
            SpriteRenderer._rr(ctx, px + pad, bottomY, pw - pad * 2, 30, 6);
            ctx.fill();
            ctx.strokeStyle = sellHov ? 'rgba(180,80,80,0.4)' : 'rgba(255,255,255,0.06)';
            ctx.lineWidth = 1;
            SpriteRenderer._rr(ctx, px + pad, bottomY, pw - pad * 2, 30, 6);
            ctx.stroke();

            // MAX badge left
            ctx.fillStyle = 'rgba(255,215,0,0.1)';
            SpriteRenderer._rr(ctx, px + pad + 4, bottomY + 5, 36, 18, 4);
            ctx.fill();
            SpriteRenderer.drawTextNoOutline(ctx, 'MAX', px + pad + 22, bottomY + 8, '#ffd700', 10, 'center');

            SpriteRenderer.drawTextNoOutline(ctx, 'Sell', px + pad + 52, bottomY + 7, sellHov ? '#ff9999' : '#ccaaaa', 11);
            UIRenderer.drawEssenceIcon(ctx, px + pw - pad - 50, bottomY + 10, 7);
            SpriteRenderer.drawTextNoOutline(ctx, `+${t.sellValue}`, px + pw - pad - 38, bottomY + 9, '#88ccff', 10);
        }
    }
}
