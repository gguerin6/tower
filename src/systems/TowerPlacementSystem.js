import { Tower } from '../entities/Tower.js';
import { TowerData } from '../data/TowerData.js';
import { TILE_SIZE } from '../utils/Constants.js';
import { EventBus } from '../utils/EventBus.js';

export class TowerPlacementSystem {
    constructor(towerSlots) {
        // Map of "col,row" -> Tower or null
        this.slots = {};
        for (const slot of towerSlots) {
            this.slots[`${slot.col},${slot.row}`] = null;
        }
        this.towers = [];
    }

    getSlotAt(col, row) {
        const key = `${col},${row}`;
        return key in this.slots ? key : null;
    }

    isSlotEmpty(col, row) {
        const key = this.getSlotAt(col, row);
        return key !== null && this.slots[key] === null;
    }

    getTowerAt(col, row) {
        const key = `${col},${row}`;
        return this.slots[key] || null;
    }

    canPlace(type, col, row, gold) {
        if (!this.isSlotEmpty(col, row)) return false;
        const data = TowerData[type];
        return gold >= data.cost;
    }

    place(type, col, row) {
        const tower = new Tower(type, col, row);
        const key = `${col},${row}`;
        this.slots[key] = tower;
        this.towers.push(tower);
        EventBus.emit('towerPlaced', { tower });
        return tower;
    }

    canUpgrade(tower, gold) {
        if (tower.level >= 4) return false;
        return gold >= tower.getUpgradeCost();
    }

    upgradeTower(tower) {
        const cost = tower.upgrade();
        EventBus.emit('towerUpgraded', { tower });
        return cost;
    }

    sellTower(tower) {
        const key = `${tower.col},${tower.row}`;
        this.slots[key] = null;
        this.towers = this.towers.filter(t => t !== tower);
        const value = tower.sellValue;
        EventBus.emit('towerSold', { tower, value });
        return value;
    }

    getSlotCoords() {
        return Object.keys(this.slots).map(key => {
            const [col, row] = key.split(',').map(Number);
            return { col, row, occupied: this.slots[key] !== null };
        });
    }

    renderSlots(ctx, camX = 0, camY = 0) {
        for (const [key, tower] of Object.entries(this.slots)) {
            if (tower) continue;
            const [col, row] = key.split(',').map(Number);
            const sx = col * TILE_SIZE - camX;
            const sy = row * TILE_SIZE - camY;
            const cx = sx + TILE_SIZE / 2;
            const cy = sy + TILE_SIZE / 2;

            // Subtle pulsing glow on the stone platform
            const pulse = 0.12 + Math.sin(Date.now() * 0.003 + col + row) * 0.06;
            ctx.fillStyle = `rgba(255,255,200,${pulse})`;
            ctx.beginPath();
            ctx.arc(cx, cy, TILE_SIZE / 2 - 4, 0, Math.PI * 2);
            ctx.fill();

            // Small "+" hint in center
            ctx.strokeStyle = `rgba(255,255,255,${pulse + 0.05})`;
            ctx.lineWidth = 1.5;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(cx - 4, cy); ctx.lineTo(cx + 4, cy);
            ctx.moveTo(cx, cy - 4); ctx.lineTo(cx, cy + 4);
            ctx.stroke();
        }
    }
}
