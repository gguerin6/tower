import { Enemy } from '../entities/Enemy.js';
import { WaveData, generateInfiniteWave } from '../data/WaveData.js';
import { BalanceConfig } from '../data/BalanceConfig.js';
import { EventBus } from '../utils/EventBus.js';
import { Audio } from '../audio/AudioManager.js';

export class WaveSystem {
    constructor(mapId, path, infinite = false) {
        this.mapId = mapId;
        // Support multiple paths: array of arrays = multi-path, array of {x,y} = single
        if (Array.isArray(path[0])) {
            this.paths = path;
            this.path = path[0];
        } else {
            this.paths = [path];
            this.path = path;
        }
        this._nextPathIndex = 0;
        this.infinite = infinite;
        this.waves = infinite ? [] : (WaveData[mapId] || WaveData.forest);

        this.currentWave = 0;
        this.totalWaves = infinite ? Infinity : this.waves.length;
        this.waveTimer = 5; // initial delay
        this.spawnTimer = 0;
        this.spawnQueue = [];
        this.spawning = false;
        this.allWavesDone = false;
        this.waveInProgress = false;
        this.enemies = [];
    }

    update(dt) {
        if (this.allWavesDone) return;

        if (!this.spawning && !this.waveInProgress) {
            this.waveTimer -= dt;
            if (this.waveTimer <= 0) {
                this.startNextWave();
            }
        }

        if (this.spawning) {
            this.spawnTimer -= dt;
            if (this.spawnTimer <= 0 && this.spawnQueue.length > 0) {
                this.spawnEnemy();
                this.spawnTimer = BalanceConfig.WAVE_SPAWN_INTERVAL;
            }
            if (this.spawnQueue.length === 0) {
                this.spawning = false;
            }
        }

        // Check if wave is complete (all enemies dead or reached)
        if (this.waveInProgress && !this.spawning) {
            const allDone = this.enemies.every(e => !e.active);
            if (allDone) {
                this.waveInProgress = false;
                EventBus.emit('waveComplete', { wave: this.currentWave });

                if (!this.infinite && this.currentWave >= this.totalWaves) {
                    this.allWavesDone = true;
                    EventBus.emit('allWavesComplete', {});
                } else {
                    this.waveTimer = BalanceConfig.WAVE_DELAY;
                }
            }
        }
    }

    startNextWave() {
        this.currentWave++;
        this.waveInProgress = true;
        this.spawning = true;
        this.spawnTimer = 0;
        this.enemies = [];

        let waveData;
        if (this.infinite) {
            waveData = generateInfiniteWave(this.currentWave);
        } else {
            waveData = this.waves[this.currentWave - 1];
        }

        this.spawnQueue = [];

        // Build scaling: combine wave-defined scaling with per-wave map scaling
        let scaling = waveData.scaling ? { ...waveData.scaling } : {};
        const mapScaling = BalanceConfig.MAP_WAVE_SCALING?.[this.mapId];
        if (mapScaling && !this.infinite) {
            const w = this.currentWave - 1; // 0-based wave index
            scaling.hpMult = (scaling.hpMult || 1) * (1 + mapScaling.hpPerWave * w);
            scaling.armorMult = (scaling.armorMult || 1) * (1 + mapScaling.armorPerWave * w);
            scaling.speedMult = (scaling.speedMult || 1) * (1 + mapScaling.speedPerWave * w);
            scaling.dmgMult = (scaling.dmgMult || 1) * (1 + mapScaling.dmgPerWave * w);
        }

        for (const group of waveData.enemies) {
            for (let i = 0; i < group.count; i++) {
                this.spawnQueue.push({ type: group.type, scaling });
            }
        }

        if (waveData.boss) {
            this.spawnQueue.push({ type: waveData.boss, scaling });
        }

        // Shuffle spawn queue a bit for variety
        for (let i = this.spawnQueue.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.spawnQueue[i], this.spawnQueue[j]] = [this.spawnQueue[j], this.spawnQueue[i]];
        }

        // But keep boss at end
        if (waveData.boss) {
            const bossIdx = this.spawnQueue.findIndex(s => s.type === waveData.boss);
            if (bossIdx >= 0) {
                const boss = this.spawnQueue.splice(bossIdx, 1)[0];
                this.spawnQueue.push(boss);
            }
        }

        this.currentWaveData = waveData;
        EventBus.emit('waveStart', { wave: this.currentWave, total: this.totalWaves, enemies: waveData.enemies, boss: waveData.boss || null });
    }

    spawnEnemy() {
        const config = this.spawnQueue.shift();
        if (!config) return;

        // Alternate between paths for multi-path maps
        const chosenPath = this.paths[this._nextPathIndex % this.paths.length];
        this._nextPathIndex++;

        const enemy = new Enemy(config.type, chosenPath, config.scaling);
        this.enemies.push(enemy);
        EventBus.emit('enemySpawned', { enemy });
        if (enemy.boss) {
            Audio.playBossSpawn();
        }
    }

    getTimeUntilNextWave() {
        if (this.waveInProgress || this.spawning) return 0;
        return Math.max(0, this.waveTimer);
    }

    skipToNextWave() {
        if (!this.waveInProgress && !this.spawning) {
            this.waveTimer = 0;
        }
    }
}
