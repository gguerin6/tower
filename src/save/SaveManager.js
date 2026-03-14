import { createDefaultSaveData } from './SaveData.js';

const SAVE_KEY = 'towerDefenseRPG_saves';

export class SaveManager {
    constructor() {
        this.saves = this.loadAll();
    }

    loadAll() {
        try {
            const raw = localStorage.getItem(SAVE_KEY);
            const saves = raw ? JSON.parse(raw) : {};
            return saves;
        } catch {
            return {};
        }
    }

    saveAll() {
        localStorage.setItem(SAVE_KEY, JSON.stringify(this.saves));
    }

    load(slot) {
        return this.saves[slot] || null;
    }

    save(data) {
        data.updatedAt = Date.now();
        this.saves[data.slot] = data;
        this.saveAll();
    }

    createNew(slot) {
        const data = createDefaultSaveData(slot);
        this.saves[slot] = data;
        this.saveAll();
        return data;
    }

    delete(slot) {
        delete this.saves[slot];
        this.saveAll();
    }

    getSlotInfo(slot) {
        const data = this.saves[slot];
        if (!data) return null;
        return {
            slot,
            level: data.level,
            gold: data.gold,
            playTime: data.playTime,
            mapsCompleted: Object.keys(data.mapsCompleted).length,
            updatedAt: data.updatedAt
        };
    }

    getAllSlotInfo() {
        return [1, 2, 3].map(slot => this.getSlotInfo(slot));
    }

    // Export all saves to a JSON file download
    exportToFile() {
        const json = JSON.stringify(this.saves, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'tower_saves.json';
        a.click();
        URL.revokeObjectURL(url);
    }

    // Import saves from a JSON file
    importFromFile() {
        return new Promise((resolve) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) { resolve(false); return; }
                const reader = new FileReader();
                reader.onload = (ev) => {
                    try {
                        const data = JSON.parse(ev.target.result);
                        this.saves = data;
                        this.saveAll();
                        resolve(true);
                    } catch {
                        resolve(false);
                    }
                };
                reader.readAsText(file);
            };
            input.click();
        });
    }
}
