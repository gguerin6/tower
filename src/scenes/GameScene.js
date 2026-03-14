import { Scene } from '../engine/Scene.js';
import { Hero } from '../entities/Hero.js';
import { WaveSystem } from '../systems/WaveSystem.js';
import { TowerPlacementSystem } from '../systems/TowerPlacementSystem.js';
import { ProjectileSystem } from '../systems/ProjectileSystem.js';
import { CombatSystem } from '../systems/CombatSystem.js';
import { CollisionSystem } from '../systems/CollisionSystem.js';
import { HUD } from '../ui/HUD.js';
import { TowerMenu } from '../ui/TowerMenu.js';
import { SpriteRenderer } from '../renderer/SpriteRenderer.js';
import { UIRenderer } from '../renderer/UIRenderer.js';
import { MapData, generateInfiniteMap } from '../data/MapData.js';
import { BalanceConfig } from '../data/BalanceConfig.js';
import { TILE_SIZE, CANVAS_WIDTH, CANVAS_HEIGHT, SCENES, COLORS } from '../utils/Constants.js';
import { EventBus } from '../utils/EventBus.js';
import { distance, pointInRect } from '../utils/MathUtils.js';
import { Audio } from '../audio/AudioManager.js';
import { QuestData, QUEST_RESET_INTERVAL } from '../data/QuestData.js';
import { EnemyData } from '../data/EnemyData.js';
import { ElementColors, ElementNames } from '../data/TowerData.js';
import { Pet } from '../entities/Pet.js';
import { Materials, rollEnemyDrops, getRunBonusMaterials } from '../data/MaterialData.js';
import { getResearchBonus } from '../data/TowerResearchData.js';
import { SkillEffects } from '../renderer/SkillEffects.js';

// Preload castle sprite
const castleImg = new Image();
castleImg.src = 'assets/castle.png';

// Preload map background images
const mapBgImages = {};
const mapBgMap = { forest: 'bg1', desert: 'bg2', mountain: 'bg3', swamp: 'bg4', castle: 'bg5', infinite: 'bginfinite' };
for (const [id, file] of Object.entries(mapBgMap)) {
    const img = new Image();
    img.src = `assets/${file}.png`;
    mapBgImages[id] = img;
}

export class GameScene extends Scene {
    constructor(game) {
        super(game);
        this.mapData = null;
        this.hero = null;
        this.waveSystem = null;
        this.towerSystem = null;
        this.projectileSystem = null;
        this.combatSystem = null;
        this.hud = null;
        this.towerMenu = null;
        this.enemies = [];
        this.essence = 0;
        this.lives = 0;
        this.maxLives = 0;
        this.speed = 1;
        this.bgDrawn = false;
        this.selectedTower = null;
        this.lightningEffects = [];

        // Infinite mode essence checkpoint system
        this.checkpointEssence = 0;       // Essence banked at last 5-wave checkpoint
        this.essenceSinceCheckpoint = 0;  // Essence earned since last checkpoint

        // XP accumulated during run (applied on return to village)
        this.runXp = 0;

        // Combo kill system
        this.comboCount = 0;
        this.comboTimer = 0;
        this.comboBestThisRun = 0;
        this.comboGoldBonus = 0;

        // Loot collected during run
        this.lootCollected = {};

        // Castle defense system
        this.castleMaxHp = 0;
        this.castleHp = 0;
        this.castleLevel = 1;
        this.castleArmor = 5;
        this.castleX = 0;
        this.castleY = 0;
        this.showCastleMenu = false;

        // Enemy info panel (right-click inspect)
        this.enemyInfoPanel = null; // { enemyType, x, y }

        // Wave announcement banner
        this.waveAnnouncement = null; // { wave, enemies, boss, timer, maxTimer }

        // Screen shake
        this.screenShake = { intensity: 0, timer: 0 };

        // Screen flash (boss death)
        this.screenFlash = { alpha: 0, color: '#fff' };

        // Hero kill streak
        this.heroKillStreak = 0;
        this.heroKillTimer = 0;
        this.killStreakAnnouncement = null;
    }

    enter(params = {}) {
        const mapId = params.mapId || 'forest';
        this.mapData = mapId === 'infinite' ? generateInfiniteMap() : MapData[mapId];
        this.mapId = mapId;

        this.essence = this.mapData.startEssence;
        this.lives = this.mapData.lives;
        this.maxLives = this.mapData.lives;
        this.speed = 1;
        this.bgDrawn = false;
        this.selectedTower = null;
        this.enemies = [];
        this.lightningEffects = [];
        this.checkpointEssence = 0;
        this.essenceSinceCheckpoint = 0;
        this.runXp = 0;
        this.comboCount = 0;
        this.comboTimer = 0;
        this.comboBestThisRun = 0;
        this.comboGoldBonus = 0;
        this.lootCollected = {};
        this.waveAnnouncement = null;
        this.autoWave = false;
        this.screenFlash = { alpha: 0, color: '#fff' };
        this.heroKillStreak = 0;
        this.heroKillTimer = 0;
        this.killStreakAnnouncement = null;

        // Support multi-path maps (paths = array of arrays)
        const mainPath = this.mapData.paths ? this.mapData.paths[0] : this.mapData.path;

        // Castle is placed at the path end
        const pathEnd = mainPath[mainPath.length - 1];
        this.castleX = pathEnd.x + TILE_SIZE - 13;
        this.castleY = pathEnd.y;
        this.castleLevel = 1;
        this.castleArmor = 5;
        this.castleMaxHp = 100 + (this.mapData.lives - 1) * 20;
        this.castleHp = this.castleMaxHp;
        this.showCastleMenu = false;
        this.screenShake = { intensity: 0, timer: 0 };

        // Castle hitbox — isometric diamond matching the sprite
        // The sprite is 10.5 tiles wide, aspect ratio ~1.7:1
        // The visible castle walls form a diamond ~80% of image size
        const cImgW = TILE_SIZE * 10.5;
        const cImgH = castleImg.naturalHeight > 0
            ? cImgW * (castleImg.naturalHeight / castleImg.naturalWidth)
            : TILE_SIZE * 6;
        // Diamond half-widths (horizontal and vertical radii)
        this.castleHitbox = {
            cx: this.castleX,
            cy: this.castleY,
            hw: cImgW * 0.42,  // half-width of diamond
            hh: cImgH * 0.32   // half-height of diamond
        };

        // Init audio - switch to battle music
        Audio.switchMusic('assets/music.mp3');
        Audio.ensureMusic();

        // Init systems
        const wavePaths = this.mapData.paths || this.mapData.path;
        this.waveSystem = new WaveSystem(mapId, wavePaths, this.mapData.infinite);
        this.towerSystem = new TowerPlacementSystem(this.mapData.towerSlots);
        this.projectileSystem = new ProjectileSystem();
        this.combatSystem = new CombatSystem();
        this.skillEffects = new SkillEffects();
        this.hud = new HUD(this);
        this.towerMenu = new TowerMenu();

        // Init hero near path start but on screen
        const heroStart = mainPath[1] || mainPath[0];
        this.hero = new Hero(heroStart.x, heroStart.y, this.game.playerData);
        this.hero.castleHitbox = this.castleHitbox;

        // Init pet
        this.pet = null;
        const pd2 = this.game.playerData;
        if (pd2.pets && pd2.pets.active) {
            this.pet = new Pet(this.hero, pd2.pets.active, pd2.pets.levels[pd2.pets.active] || 1);
        }

        // Register events
        this.unsubscribers = [
            EventBus.on('enemySpawned', ({ enemy }) => {
                enemy.castleHitbox = this.castleHitbox;
                this.enemies.push(enemy);
            }),
            EventBus.on('enemyKilled', ({ enemy, byHero }) => {
                // Combo system
                this.comboCount++;
                this.comboTimer = 2.0; // 2s window to keep combo
                if (this.comboCount > this.comboBestThisRun) {
                    this.comboBestThisRun = this.comboCount;
                }

                // Bestiary tracking
                const pd = this.game.playerData;
                if (!pd.bestiary) pd.bestiary = {};
                pd.bestiary[enemy.type] = true;

                // Essence bonus from passive
                let essenceMult = 1;
                if (pd.skills.goldFind > 0) {
                    essenceMult += [0.10, 0.22, 0.35, 0.50, 0.70][pd.skills.goldFind - 1];
                }
                if (pd.equipment.accessory?.goldBonus) {
                    essenceMult += pd.equipment.accessory.goldBonus;
                }
                // Combo essence bonus: +5% per combo beyond 3
                let comboBonus = 0;
                if (this.comboCount >= 3) {
                    comboBonus = (this.comboCount - 2) * 0.05;
                    essenceMult += comboBonus;
                }
                const earned = Math.round(enemy.gold * essenceMult);
                this.essence += earned;
                if (this.comboCount >= 3) {
                    const bonusEssence = Math.round(enemy.gold * comboBonus);
                    this.comboGoldBonus += bonusEssence;
                }
                if (this.mapData.infinite) {
                    this.essenceSinceCheckpoint += earned;
                }

                // XP (accumulated, applied at village)
                this.runXp += enemy.xp;

                Audio.playEnemyDeath();

                // Quest progress
                this.updateQuestProgress('kills');
                this.updateQuestProgress('goldEarned', earned);
                if (byHero) {
                    this.updateQuestProgress('heroKills');
                    this.heroKillStreak++;
                    this.heroKillTimer = 1.5;
                    const streakLabels = { 2: 'Double Kill!', 3: 'Triple Kill!', 4: 'Multi Kill!', 5: 'Rampage!' };
                    const label = streakLabels[Math.min(this.heroKillStreak, 5)];
                    if (label) {
                        this.killStreakAnnouncement = { text: label, timer: 1.5, color: this.heroKillStreak >= 5 ? '#ff4444' : '#ffd700' };
                    }
                }
                if (enemy.boss) {
                    this.updateQuestProgress('bosses');
                    this.triggerShake(10, 0.5);
                    this.screenFlash = { alpha: 0.6, color: '#fff' };
                }

                // Particles
                this.game.particles.emit(enemy.x, enemy.y, 8, {
                    color: enemy.data.color,
                    speed: 60,
                    life: 0.5,
                    size: 3
                });

                // Combo particles
                if (this.comboCount >= 5) {
                    this.game.particles.emit(enemy.x, enemy.y - 10, 4, {
                        color: '#ffd700', speed: 50, life: 0.4, size: 2
                    });
                }

                // Loot drops
                const drops = rollEnemyDrops(enemy.type);
                let dropOffset = 0;
                for (const [mat, amount] of Object.entries(drops)) {
                    this.lootCollected[mat] = (this.lootCollected[mat] || 0) + amount;
                    if (!pd.materials) pd.materials = {};
                    pd.materials[mat] = (pd.materials[mat] || 0) + amount;
                    const matInfo = Materials[mat];
                    if (matInfo) {
                        // Floating loot text
                        this.combatSystem.addFloatingText(
                            enemy.x + (Math.random() - 0.5) * 20,
                            enemy.y - 30 - dropOffset * 18,
                            `+${amount} ${matInfo.name}`,
                            matInfo.color
                        );
                        // Loot burst particles in material color
                        this.game.particles.emit(enemy.x, enemy.y - 10, 6, {
                            color: matInfo.color,
                            speed: 40,
                            life: 0.7,
                            size: 3,
                            spread: Math.PI * 0.6,
                            angle: -Math.PI / 2
                        });
                        // Loot icon float-up
                        if (!this._lootIcons) this._lootIcons = [];
                        this._lootIcons.push({
                            mat, x: enemy.x, y: enemy.y - 8,
                            life: 1.2, maxLife: 1.2,
                            vx: (Math.random() - 0.5) * 20,
                            vy: -35 - dropOffset * 10
                        });
                        dropOffset++;
                    }
                }
            }),
            EventBus.on('waveComplete', ({ wave }) => {
                // Wave complete essence reward (scales up each wave)
                const waveEssence = 15 + wave * 3;
                this.essence += waveEssence;
                if (this.mapData.infinite) {
                    this.essenceSinceCheckpoint += waveEssence;
                }

                // Wave XP bonus (accumulated, applied at village)
                const waveXp = Math.floor((BalanceConfig.XP_PER_WAVE || 20) * (1 + wave * 0.12));
                this.runXp += waveXp;

                // Quest progress
                this.updateQuestProgress('waves');
                this.updateQuestProgress('goldEarned', waveEssence);

                // Infinite mode: checkpoint every 5 waves
                if (this.mapData.infinite && wave % 5 === 0) {
                    this.checkpointEssence += this.essenceSinceCheckpoint;
                    this.essenceSinceCheckpoint = 0;
                    Audio.playCheckpoint();
                    // Show checkpoint notification
                    this.game.particles.emit(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 40, 25, {
                        color: '#66bbff', speed: 100, life: 1.2, size: 4
                    });
                }

                // Auto-wave: skip to next wave immediately
                if (this.autoWave) {
                    this.skipWave();
                }
            }),
            EventBus.on('waveStart', ({ wave, enemies, boss }) => {
                Audio.playWaveStart();
                this.waveAnnouncement = {
                    wave,
                    enemies: enemies || [],
                    boss: boss || null,
                    timer: 3.0,
                    maxTimer: 3.0
                };
            }),
            EventBus.on('allWavesComplete', () => {
                // Victory
                const pd = this.game.playerData;
                const wave = this.waveSystem.currentWave;
                const isFirstClear = !pd.mapsCompleted[this.mapId];
                pd.mapsCompleted[this.mapId] = true;
                if (!pd.bestWave) pd.bestWave = {};
                pd.bestWave[this.mapId] = wave;

                // Wave-based gold reward (NOT run gold — run gold is for towers only)
                const waveGold = this._calcRunReward(wave);
                const victoryBonus = Math.floor(waveGold * (isFirstClear ? 0.50 : 0.25));
                const totalReward = waveGold + victoryBonus;
                pd.gold += totalReward;
                this.updateQuestProgress('wins');
                // Run completion loot
                const bonusMats = getRunBonusMaterials(wave, true);
                if (!pd.materials) pd.materials = {};
                for (const [mat, amount] of Object.entries(bonusMats)) {
                    pd.materials[mat] = (pd.materials[mat] || 0) + amount;
                    this.lootCollected[mat] = (this.lootCollected[mat] || 0) + amount;
                }
                this.game.saveGame();
                Audio.playVictory();
                this.game.sceneManager.switch(SCENES.GAME_OVER, {
                    victory: true, gold: totalReward, waveGold, victoryBonus,
                    wave, mapId: this.mapId,
                    loot: { ...this.lootCollected },
                    xpEarned: Math.floor(this.runXp * (this.mapData.xpMult || 1))
                });
            }),
            EventBus.on('chainLightning', ({ from, to }) => {
                this.lightningEffects.push({ from, to, timer: 0.2 });
            }),
            EventBus.on('heroAttack', ({ target, damage }) => {
                if (target) {
                    const em = target.lastElemMult || 1;
                    const color = em > 1 ? '#ff4444' : em < 1 ? '#8888aa' : '#fff';
                    const suffix = em >= 1.4 ? '!!!' : em > 1 ? '!' : em <= 0.5 ? '~' : '';
                    this.combatSystem.addFloatingText(target.x, target.y - 20, Math.round(damage) + suffix, color);
                }
            }),
            EventBus.on('heroDamageEnemy', ({ enemy, damage, element }) => {
                if (enemy) {
                    const em = enemy.lastElemMult || 1;
                    const color = em > 1 ? '#ff4444' : em < 1 ? '#8888aa' : (ElementColors[element] || '#fff');
                    const suffix = em >= 1.4 ? '!!!' : em > 1 ? '!' : em <= 0.5 ? '~' : '';
                    this.combatSystem.addFloatingText(enemy.x, enemy.y - 20, Math.round(damage) + suffix, color);
                }
            }),
            EventBus.on('skillUsed', ({ skill, x, y, radius }) => {
                this.skillEffects.add(skill, x, y, radius);
            }),
            EventBus.on('heroDied', () => {
                this.triggerShake(4, 0.3);
            })
        ];

        this.game.particles.clear();
    }

    exit() {
        if (this.unsubscribers) {
            for (const unsub of this.unsubscribers) unsub();
        }
        this.projectileSystem.clear();
        this.game.particles.clear();
        this.skillEffects.clear();
    }

    updateQuestProgress(objective, amount = 1) {
        const pd = this.game.playerData;
        if (!pd.quests) pd.quests = { lastReset: 0, progress: {}, completed: {} };

        // Check for reset (every 2 hours)
        const now = Date.now();
        if (now - pd.quests.lastReset >= QUEST_RESET_INTERVAL) {
            pd.quests.lastReset = now;
            pd.quests.progress = {};
            pd.quests.completed = {};
        }

        for (const quest of QuestData) {
            if (quest.objective !== objective) continue;
            if (pd.quests.completed[quest.id]) continue;

            pd.quests.progress[quest.id] = (pd.quests.progress[quest.id] || 0) + amount;

            // Mark as fulfilled (rewards claimed at quest board)
            if (pd.quests.progress[quest.id] >= quest.target && !pd.quests.completed[quest.id]) {
                pd.quests.completed[quest.id] = 'fulfilled';
                this.game.saveGame();
            }
        }
    }

    triggerShake(intensity, duration) {
        if (intensity > this.screenShake.intensity) {
            this.screenShake.intensity = intensity;
            this.screenShake.timer = duration;
        }
    }

    update(dt) {
        const sDt = dt * this.speed;

        // Wave system
        this.waveSystem.update(sDt);

        // Wave announcement timer (use raw dt so banner is readable at 2x speed)
        if (this.waveAnnouncement) {
            this.waveAnnouncement.timer -= dt;
            if (this.waveAnnouncement.timer <= 0) this.waveAnnouncement = null;
        }

        // Demolisher: find tower targets for demolisher enemies
        for (const enemy of this.enemies) {
            if (!enemy.active || !enemy.isDemolisher || enemy.attackingTower || enemy.attackingCastle) continue;
            // Look for a nearby non-destroyed tower to attack
            let closest = null;
            let closestDist = enemy.towerDetectRange;
            for (const tower of this.towerSystem.towers) {
                if (tower.destroyed) continue;
                const d = distance(enemy.x, enemy.y, tower.x, tower.y);
                if (d < closestDist) {
                    closestDist = d;
                    closest = tower;
                }
            }
            if (closest) {
                enemy.towerTarget = closest;
                enemy.attackingTower = true;
                enemy.towerAttackTimer = 0;
            }
        }

        // Update enemies (pass hero so they can attack in passing)
        for (const enemy of this.enemies) {
            // Update dying enemies for death animation
            if (!enemy.active) {
                if (enemy.dying) enemy.update(sDt);
                continue;
            }
            enemy.update(sDt, this.hero);

            // Enemy attacks castle periodically while at the end
            if (enemy.attackingCastle && enemy.castleDamageReady) {
                enemy.castleDamageReady = false;
                const rawDmg = enemy.damage || 10;
                const effectiveDmg = rawDmg * (100 / (100 + this.castleArmor));
                this.castleHp -= effectiveDmg;
                this.triggerShake(3, 0.2);
                // Damage particles on castle
                this.game.particles.emit(this.castleX, this.castleY - TILE_SIZE * 2, 5, {
                    color: '#ff4400', speed: 40, life: 0.4, size: 3
                });
                if (this.castleHp <= 0) {
                    this.castleHp = 0;
                    this.lives = 0;
                    this.gameOver();
                    return;
                }
            }
        }

        // Enemy abilities
        const activeEnemiesForAbilities = this.enemies.filter(e => e.active);
        this.combatSystem.processEnemyAbilities(activeEnemiesForAbilities);

        // Clean dead enemies (keep dying ones for death animation)
        this.enemies = this.enemies.filter(e => e.active || e.dying);

        // Update hero (pass enemies for auto-attack)
        const activeEnemiesForHero = this.enemies.filter(e => e.active);
        this.hero.update(sDt, activeEnemiesForHero, this.towerSystem.towers);

        // Update pet
        if (this.pet) {
            this.pet.hero = this.hero;
            this.pet.update(sDt, activeEnemiesForHero);
        }

        // Update skill ready flash
        if (this.hud && this.hero && !this.hero.dead) {
            this.hud.updateSkillFlash(sDt, this.hero);
        }

        // Hero war cry buff for towers + research bonuses
        for (const tower of this.towerSystem.towers) {
            const pd = this.game.playerData;

            // Base damage mult = 1 + permanent research bonus
            tower.damageMult = 1 + getResearchBonus(pd, tower.type, 'damage');
            // War cry temporary buff
            if (this.hero.buffActive) {
                const d = distance(this.hero.x, this.hero.y, tower.x, tower.y);
                if (d <= this.hero.buffRadius) {
                    tower.damageMult += this.hero.buffAmount;
                }
            }
            // War banner accessory
            if (pd.equipment.accessory?.towerDamage) {
                tower.damageMult += pd.equipment.accessory.towerDamage;
            }

            // Base range mult = 1 + permanent research bonus
            tower.rangeMult = 1 + getResearchBonus(pd, tower.type, 'range');
            // Passive commander range skill
            if (pd.skills.commander > 0) {
                tower.rangeMult += [0.05, 0.12, 0.20, 0.28, 0.38][pd.skills.commander - 1];
            }

            // Research: attack speed
            tower.speedResearchBonus = getResearchBonus(pd, tower.type, 'speed');
            // Research: splash radius (cannon)
            tower.splashResearchBonus = getResearchBonus(pd, tower.type, 'splash');
            // Research: slow effect (frost)
            tower.slowResearchBonus = getResearchBonus(pd, tower.type, 'slow');
            // Research: chain targets (tesla)
            tower.chainResearchBonus = getResearchBonus(pd, tower.type, 'chain');
        }

        // Tower synergy: +5% damage per unique adjacent tower type
        for (const tower of this.towerSystem.towers) {
            const adjacentTypes = new Set();
            for (const other of this.towerSystem.towers) {
                if (other === tower || other.destroyed) continue;
                if (Math.abs(other.col - tower.col) <= 2 && Math.abs(other.row - tower.row) <= 2) {
                    if (other.type !== tower.type) adjacentTypes.add(other.type);
                }
            }
            tower.synergyMult = 1 + adjacentTypes.size * BalanceConfig.SYNERGY_BONUS;
        }

        // Tower targeting and shooting
        const activeEnemies = this.enemies.filter(e => e.active);
        for (const tower of this.towerSystem.towers) {
            tower.update(sDt);
            tower.findTarget(activeEnemies);
            if (tower.canShoot()) {
                const projConfig = tower.shoot();
                this.projectileSystem.add(projConfig);
                Audio.playTowerShot(tower.type);
            }
        }

        // Handle destroyed towers — free the slot
        for (const tower of this.towerSystem.towers) {
            if (tower.destroyed) {
                const key = `${tower.col},${tower.row}`;
                this.towerSystem.slots[key] = null;
                // Particles
                this.game.particles.emit(tower.x, tower.y, 10, {
                    color: '#886644', speed: 40, life: 0.5, size: 3
                });
                // Close tower menu if this tower was selected
                if (this.selectedTower === tower) {
                    this.selectedTower = null;
                    this.towerMenu.close();
                }
            }
        }
        this.towerSystem.towers = this.towerSystem.towers.filter(t => !t.destroyed);

        // Update projectiles
        this.projectileSystem.update(sDt);

        // Process hits
        const hits = this.projectileSystem.getHits();
        for (const proj of hits) {
            this.combatSystem.processProjectileHit(proj, activeEnemies);
            // Add impact visual effect
            this.projectileSystem.addImpactEffect(proj.targetX, proj.targetY, proj.element);
        }

        // Floating texts
        this.combatSystem.updateFloatingTexts(sDt);

        // Lightning effects
        for (let i = this.lightningEffects.length - 1; i >= 0; i--) {
            this.lightningEffects[i].timer -= sDt;
            if (this.lightningEffects[i].timer <= 0) {
                this.lightningEffects.splice(i, 1);
            }
        }

        // Combo timer
        if (this.comboTimer > 0) {
            this.comboTimer -= sDt;
            if (this.comboTimer <= 0) {
                this.comboCount = 0;
                this.comboTimer = 0;
            }
        }

        // Screen shake decay
        if (this.screenShake.timer > 0) {
            this.screenShake.timer -= dt;
            if (this.screenShake.timer <= 0) {
                this.screenShake.intensity = 0;
                this.screenShake.timer = 0;
            }
        }

        // Screen flash decay
        if (this.screenFlash.alpha > 0) {
            this.screenFlash.alpha -= dt * 2;
            if (this.screenFlash.alpha < 0) this.screenFlash.alpha = 0;
        }

        // Hero kill streak decay
        if (this.heroKillTimer > 0) {
            this.heroKillTimer -= sDt;
            if (this.heroKillTimer <= 0) {
                this.heroKillStreak = 0;
                this.heroKillTimer = 0;
            }
        }
        if (this.killStreakAnnouncement) {
            this.killStreakAnnouncement.timer -= sDt;
            if (this.killStreakAnnouncement.timer <= 0) {
                this.killStreakAnnouncement = null;
            }
        }

        // Particles & skill effects
        this.game.particles.update(sDt);
        this.skillEffects.update(sDt);

        // Loot icons float-up
        if (this._lootIcons) {
            for (let i = this._lootIcons.length - 1; i >= 0; i--) {
                const li = this._lootIcons[i];
                li.life -= sDt;
                li.x += li.vx * sDt;
                li.y += li.vy * sDt;
                li.vy += 15 * sDt; // slight gravity
                if (li.life <= 0) this._lootIcons.splice(i, 1);
            }
        }

        // Keep tower menu essence in sync (so canAfford updates live)
        this.towerMenu.updateGold(this.essence);

        // Auto-save periodically
        if (this.game.playerData) {
            this.game.playerData.playTime += dt;
        }
    }

    gameOver() {
        const pd = this.game.playerData;
        const wave = this.waveSystem.currentWave;
        if (!pd.bestWave) pd.bestWave = {};

        // Track best wave for all maps
        const mapKey = this.mapData.infinite ? 'infinite' : this.mapId;
        const best = pd.bestWave[mapKey] || 0;
        if (wave > best) pd.bestWave[mapKey] = wave;
        const isNewRecord = wave > best;

        let goldReward;
        if (this.mapData.infinite) {
            goldReward = this.checkpointEssence + Math.floor(this.essenceSinceCheckpoint * 0.3);
        } else {
            // Wave-based gold reward (defeat = full wave reward, no victory bonus)
            goldReward = this._calcRunReward(wave);
        }

        pd.gold += goldReward;
        // Run completion loot (defeat = reduced)
        const bonusMats = getRunBonusMaterials(wave, false);
        if (!pd.materials) pd.materials = {};
        for (const [mat, amount] of Object.entries(bonusMats)) {
            const kept = Math.ceil(amount * 0.5);
            pd.materials[mat] = (pd.materials[mat] || 0) + kept;
            this.lootCollected[mat] = (this.lootCollected[mat] || 0) + kept;
        }
        this.game.saveGame();
        Audio.playDefeat();
        this.game.sceneManager.switch(SCENES.GAME_OVER, {
            victory: false,
            gold: goldReward,
            wave,
            mapId: mapKey,
            isInfinite: !!this.mapData.infinite,
            isNewRecord,
            bestWave: Math.max(best, wave),
            loot: { ...this.lootCollected },
            xpEarned: Math.floor(this.runXp * (this.mapData.xpMult || 1))
        });
    }

    // Calculate persistent gold reward based on waves reached
    // This is the gold the player takes home to the village
    _calcRunReward(wavesReached) {
        // Base: 16g per wave + scaling, multiplied by map goldMult
        let total = 0;
        for (let w = 1; w <= wavesReached; w++) {
            total += 16 + Math.floor(w * 1.5);
        }
        const mapMult = this.mapData.goldMult || 1;
        return Math.floor(total * mapMult);
    }

    togglePause() {
        console.log('[DEBUG] togglePause called, pushing PAUSE scene');
        this.game.sceneManager.push(SCENES.PAUSE);
    }

    setSpeed(s) {
        this.speed = s;
    }

    skipWave() {
        this.waveSystem.skipToNextWave();
    }

    // Input handling with priority
    onMouseDown(x, y, button) {
        if (button === 2) {
            this._handleRightClick(x, y);
            return;
        }

        // Left click closes info panel
        this.enemyInfoPanel = null;

        if (button !== 0) {
            this.towerMenu.close();
            this.selectedTower = null;
            return;
        }

        // 1. HUD buttons
        if (this.hud.handleClick(x, y)) return;

        // 1.5. Castle menu (if open)
        if (this.showCastleMenu && this._castleMenuBounds) {
            const cm = this._castleMenuBounds;
            if (pointInRect(x, y, cm.x, cm.y, cm.w, cm.options.length * cm.optH + 16)) {
                for (let i = 0; i < cm.options.length; i++) {
                    const oy = cm.y + 8 + i * cm.optH;
                    if (pointInRect(x, y, cm.x + 6, oy, cm.w - 12, 30)) {
                        const opt = cm.options[i];
                        if (opt.action === 'upgrade') this.upgradeCastle();
                        else if (opt.action === 'repair') this.repairCastle();
                    }
                }
                return;
            }
        }

        // 2. Tower menu (if open)
        if (this.towerMenu.visible) {
            const result = this.towerMenu.handleClick(x, y);
            if (result) {
                this.handleTowerMenuAction(result);
                return;
            }
            return;
        }

        // 3. Check enemy click
        const clickedEnemy = this.enemies.find(e =>
            e.active && e.containsPoint(x, y)
        );
        if (clickedEnemy) {
            this.hero.setAttackTarget(clickedEnemy);
            Audio.playHeroAttack();
            return;
        }

        // 4. Check tower slot / existing tower
        const col = Math.floor(x / TILE_SIZE);
        const row = Math.floor(y / TILE_SIZE);

        const existingTower = this.towerSystem.getTowerAt(col, row);
        if (existingTower) {
            this.selectedTower = existingTower;
            this.towerMenu.openManage(existingTower, this.essence);
            return;
        }

        if (this.towerSystem.isSlotEmpty(col, row)) {
            this.towerMenu.openBuild(col, row, this.essence, this.game.playerData?.mapsCompleted || {}, Math.max(1, this.waveSystem.currentWave));
            return;
        }

        // 4.5. Check castle click (diamond hitbox)
        if (this._castleDiamondDist(x, y) < 0) {
            this.showCastleMenu = !this.showCastleMenu;
            return;
        }

        this.showCastleMenu = false;

        // 5. Move hero
        this.hero.moveTo(x, y);
        this.selectedTower = null;
    }

    onMouseMove(x, y) {
        this.hud.handleMouseMove(x, y);
        this.towerMenu.handleMouseMove(x, y);
    }

    onKeyDown(key) {
        const bindings = this.game.keyBindings || {};

        if (key === (bindings.pause || 'Escape')) {
            if (this.towerMenu.visible) {
                this.towerMenu.close();
            } else {
                this.togglePause();
            }
            return;
        }

        // Skill keys
        const sk = bindings.skills || {};
        const skillKeys = {
            [sk.skill1 || '1']: 'whirlwind',
            [sk.skill2 || '2']: 'warCry',
            [sk.skill3 || '3']: 'heal',
            [sk.skill4 || '4']: 'thunderStrike',
            [sk.skill5 || '5']: 'shield'
        };
        if (skillKeys[key]) {
            this.hero.useSkill(skillKeys[key], this.enemies.filter(e => e.active), this.towerSystem.towers);
        }

        if (key === (bindings.nextWave || ' ')) {
            this.skipWave();
        }

        if (key === (bindings.speed || 'Tab')) {
            this.speed = this.speed === 1 ? 2 : 1;
            this.hud.gameSpeed = this.speed;
            this.hud.speedButton.text = `x${this.speed}`;
        }

        if (key === (bindings.closemenu || 'q') || key === 'Q') {
            if (this.towerMenu.visible) {
                this.towerMenu.close();
            }
            this.showCastleMenu = false;
            this.selectedTower = null;
        }
    }

    getCastleUpgradeCost() {
        if (this.castleLevel >= 5) return null;
        return [80, 150, 250, 400][this.castleLevel - 1];
    }

    getCastleRepairCost() {
        if (this.castleHp >= this.castleMaxHp) return 0;
        return Math.ceil((this.castleMaxHp - this.castleHp) * 0.5);
    }

    upgradeCastle() {
        const cost = this.getCastleUpgradeCost();
        if (!cost || this.essence < cost) return;
        this.essence -= cost;
        this.castleLevel++;
        this.castleMaxHp += 50;
        this.castleHp += 50;
        this.castleArmor += 5;
        Audio.playTowerUpgrade();
        this.game.particles.emit(this.castleX, this.castleY - TILE_SIZE * 2, 15, {
            color: '#ffd700', speed: 80, life: 0.8, size: 3
        });
    }

    repairCastle() {
        const cost = this.getCastleRepairCost();
        if (cost <= 0 || this.essence < cost) return;
        this.essence -= cost;
        this.castleHp = this.castleMaxHp;
        this.lives = this.maxLives;
        Audio.playCheckpoint();
    }

    handleTowerMenuAction(result) {
        switch (result.action) {
            case 'build': {
                if (this.towerSystem.canPlace(result.type, result.col, result.row, this.essence)) {
                    const tower = this.towerSystem.place(result.type, result.col, result.row);
                    this.essence -= tower.data.cost;
                    this.selectedTower = tower;
                    this.bgDrawn = false; // redraw background to remove stone platform
                    Audio.playTowerPlace();
                }
                break;
            }
            case 'upgrade': {
                const tower = result.tower;
                const cost = tower.getUpgradeCost();
                if (cost && this.essence >= cost) {
                    this.towerSystem.upgradeTower(tower);
                    this.essence -= cost;
                    Audio.playTowerUpgrade();
                    this.game.particles.emit(tower.x, tower.y, 15, {
                        color: '#ffd700', speed: 80, life: 0.7, size: 4
                    });
                    this.towerMenu.openManage(tower, this.essence);
                }
                break;
            }
            case 'upgradeStat': {
                const tower = result.tower;
                const cost = tower.getStatUpgradeCost(result.stat);
                if (cost && this.essence >= cost) {
                    tower.upgradeStat(result.stat);
                    this.essence -= cost;
                    Audio.playTowerUpgrade();
                    this.game.particles.emit(tower.x, tower.y, 8, {
                        color: '#ffd700', speed: 60, life: 0.5, size: 3
                    });
                    // Re-open menu to allow continued upgrades
                    this.towerMenu.openManage(tower, this.essence);
                }
                break;
            }
            case 'sell': {
                const value = this.towerSystem.sellTower(result.tower);
                this.essence += value;
                this.selectedTower = null;
                this.bgDrawn = false; // redraw background to restore stone platform
                Audio.playButtonClick();
                break;
            }
        }
    }

    render(renderer) {
        const bg = renderer.bg;
        const ctx = renderer.entity;
        const ui = renderer.ui;

        // Apply screen shake
        let shakeX = 0, shakeY = 0;
        if (this.screenShake.timer > 0) {
            const progress = this.screenShake.timer / 0.3;
            const intensity = this.screenShake.intensity * Math.min(1, progress);
            shakeX = (Math.random() - 0.5) * 2 * intensity;
            shakeY = (Math.random() - 0.5) * 2 * intensity;
        }
        ctx.save();
        ui.save();
        ctx.translate(shakeX, shakeY);
        ui.translate(shakeX, shakeY);

        // Draw background once
        if (!this.bgDrawn) {
            this.drawBackground(bg);
            this.bgDrawn = true;
        }

        // Entity layer
        // Tower slots (drawn first, under everything)
        this.towerSystem.renderSlots(ctx);

        // Collect all renderable entities for Y-sort
        const renderables = [];

        // Towers (sortY offset -1 so hero draws in front when at same Y)
        for (const tower of this.towerSystem.towers) {
            renderables.push({
                sortY: tower.row * TILE_SIZE + TILE_SIZE - 1,
                render: () => tower.render(ctx, 0, 0, tower === this.selectedTower)
            });
        }

        // Enemies (including dying ones for death animation)
        for (const enemy of this.enemies) {
            if (!enemy.active && !enemy.dying) continue;
            renderables.push({
                sortY: enemy.sortY,
                render: () => enemy.render(ctx)
            });
        }

        // Castle at path end (drawn behind enemies/hero)
        renderables.push({
            sortY: this.castleY - 2,
            render: () => {
                this._drawCastleSprite(ctx);
            }
        });

        // Hero
        if (!this.hero.dead || this.hero.respawnTimer > 0) {
            renderables.push({
                sortY: this.hero.sortY,
                render: () => this.hero.render(ctx)
            });
        }

        // Pet
        if (this.pet) {
            renderables.push({
                sortY: this.pet.y,
                render: () => this.pet.render(ctx)
            });
        }

        // Sort by Y (lower Y drawn first = behind)
        renderables.sort((a, b) => a.sortY - b.sortY);
        for (const r of renderables) {
            r.render();
        }

        // Projectiles (always on top of entities)
        this.projectileSystem.render(ctx);

        // Lightning chain effects
        for (const le of this.lightningEffects) {
            const alpha = le.timer / 0.2;
            // Generate jagged bolt segments if not cached
            if (!le.segments) {
                le.segments = [];
                const dx = le.to.x - le.from.x;
                const dy = le.to.y - le.from.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const steps = Math.max(3, Math.floor(dist / 14));
                const perpX = -dy / dist;
                const perpY = dx / dist;
                le.segments.push({ x: le.from.x, y: le.from.y });
                for (let i = 1; i < steps; i++) {
                    const t = i / steps;
                    const off = (Math.random() - 0.5) * 12;
                    le.segments.push({
                        x: le.from.x + dx * t + perpX * off,
                        y: le.from.y + dy * t + perpY * off
                    });
                }
                le.segments.push({ x: le.to.x, y: le.to.y });
            }

            // Outer glow
            ctx.globalAlpha = alpha * 0.35;
            ctx.strokeStyle = '#ffee33';
            ctx.lineWidth = 4;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(le.segments[0].x, le.segments[0].y);
            for (let i = 1; i < le.segments.length; i++) {
                ctx.lineTo(le.segments[i].x, le.segments[i].y);
            }
            ctx.stroke();

            // Bright core
            ctx.globalAlpha = alpha * 0.8;
            ctx.strokeStyle = '#ffffcc';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(le.segments[0].x, le.segments[0].y);
            for (let i = 1; i < le.segments.length; i++) {
                ctx.lineTo(le.segments[i].x, le.segments[i].y);
            }
            ctx.stroke();

            ctx.globalAlpha = 1;
            ctx.lineCap = 'butt';
        }

        // Particles & skill effects
        this.game.particles.render(ctx);
        this.skillEffects.render(ctx, 0, 0);

        // Loot icons (float-up material icons)
        if (this._lootIcons) {
            for (const li of this._lootIcons) {
                const alpha = Math.min(1, li.life / (li.maxLife * 0.3));
                ctx.globalAlpha = alpha;
                SpriteRenderer.drawMaterialIcon(ctx, li.mat, li.x, li.y, 6);
                ctx.globalAlpha = 1;
            }
        }

        // Tower placement ghost preview
        const buildPreview = this.towerMenu.getHoveredBuildPreview();
        if (buildPreview) {
            const px = buildPreview.col * TILE_SIZE + TILE_SIZE / 2;
            const py = buildPreview.row * TILE_SIZE + TILE_SIZE / 2;
            const range = buildPreview.range;

            // Range circle
            ctx.beginPath();
            ctx.arc(px, py, range, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(100,160,255,0.08)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(100,160,255,0.25)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.stroke();
            ctx.setLineDash([]);

            // Tower position indicator
            ctx.fillStyle = 'rgba(255,255,255,0.15)';
            ctx.fillRect(buildPreview.col * TILE_SIZE, buildPreview.row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }

        // Floating texts
        this.combatSystem.renderFloatingTexts(ctx);

        // UI layer
        const infiniteInfo = this.mapData.infinite ? {
            checkpointEssence: this.checkpointEssence,
            essenceSinceCheckpoint: this.essenceSinceCheckpoint
        } : null;
        this.hud.render(ui, this.essence, this.lives, this.maxLives,
            this.waveSystem.currentWave, this.waveSystem.totalWaves,
            this.hero, this.waveSystem.getTimeUntilNextWave(), infiniteInfo, this.pet);

        // Castle HP bar (just above castle sprite, centered)
        const castleImgW = TILE_SIZE * 10.5;
        const castleImgH = castleImg.complete && castleImg.naturalWidth > 0
            ? castleImgW * (castleImg.naturalHeight / castleImg.naturalWidth)
            : TILE_SIZE * 7;
        const castleTopY = this.castleY - castleImgH / 2;
        const castleBarW = 120;
        const castleBarX = Math.min(Math.max(this.castleX - castleBarW / 2, 10), CANVAS_WIDTH - castleBarW - 10);
        const castleBarY = Math.max(castleTopY - 18, 52);
        UIRenderer.drawHealthBar(ui, castleBarX, castleBarY, castleBarW, 8, this.castleHp, this.castleMaxHp);
        SpriteRenderer.drawTextNoOutline(ui, `Lv.${this.castleLevel}`, castleBarX + castleBarW / 2, castleBarY - 12, '#ffd700', 10, 'center');

        // Castle upgrade menu
        if (this.showCastleMenu) {
            this.renderCastleMenu(ui);
        }

        // Minimap
        this.renderMinimap(ui);

        // Screen flash overlay
        if (this.screenFlash.alpha > 0) {
            ui.save();
            ui.globalAlpha = this.screenFlash.alpha;
            ui.fillStyle = this.screenFlash.color;
            ui.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            ui.restore();
        }

        // Boss HP bar
        const activeBoss = this.enemies.find(e => e.active && e.boss);
        if (activeBoss) {
            const bw = 300, bh = 14;
            const bx = (CANVAS_WIDTH - bw) / 2, by = 52;
            UIRenderer.drawPanel(ui, bx - 8, by - 6, bw + 16, bh + 28, 0.85);
            SpriteRenderer.drawText(ui, activeBoss.data.name, CANVAS_WIDTH / 2, by + 2, '#ffd700', 12, 'center');
            UIRenderer.drawHealthBar(ui, bx, by + 16, bw, bh, activeBoss.hp, activeBoss.maxHp);
        }

        // Combo counter
        if (this.comboCount >= 3) {
            this.renderComboCounter(ui);
        }

        // Kill streak announcement
        if (this.killStreakAnnouncement) {
            const ks = this.killStreakAnnouncement;
            const alpha = Math.min(1, ks.timer * 2);
            ui.save();
            ui.globalAlpha = alpha;
            SpriteRenderer.drawText(ui, ks.text, CANVAS_WIDTH / 2, 120, ks.color, 20, 'center');
            ui.restore();
        }

        // Wave preview
        this.renderWavePreview(ui);

        // Wave announcement banner
        this.renderWaveAnnouncement(ui);

        this.towerMenu.render(ui);

        // Enemy info panel (right-click inspect)
        this.renderEnemyInfoPanel(ui);

        ctx.restore();
        ui.restore();
    }

    renderCastleMenu(ctx) {
        let mx = this.castleX + TILE_SIZE * 5;
        let my = this.castleY - TILE_SIZE * 2;
        // Clamp menu to stay within canvas
        if (mx + 180 > CANVAS_WIDTH) mx = this.castleX - 180 - TILE_SIZE * 4;
        if (my < 50) my = 50;
        const mw = 180;
        const options = [];

        const upgCost = this.getCastleUpgradeCost();
        if (upgCost !== null) {
            options.push({ text: `Upgrade Lv.${this.castleLevel + 1}`, cost: upgCost, action: 'upgrade' });
        }
        const repCost = this.getCastleRepairCost();
        if (repCost > 0) {
            options.push({ text: `Repair Castle`, cost: repCost, action: 'repair' });
        }
        options.push({ text: `HP: ${Math.ceil(this.castleHp)}/${this.castleMaxHp}  Armor: ${this.castleArmor}`, cost: 0, action: null });

        const mh = options.length * 36 + 16;
        UIRenderer.drawPanel(ctx, mx, my, mw, mh, 0.92);

        // Store castle menu bounds for click handling
        this._castleMenuBounds = { x: mx, y: my, w: mw, options, optH: 36 };

        for (let i = 0; i < options.length; i++) {
            const opt = options[i];
            const oy = my + 8 + i * 36;
            const canAfford = opt.action ? this.essence >= opt.cost : false;

            ctx.fillStyle = opt.action ? (canAfford ? '#2a3a2a' : '#1a1a1a') : '#1a1a2a';
            SpriteRenderer._rr(ctx, mx + 6, oy, mw - 12, 30, 4);
            ctx.fill();

            const tc = opt.action ? (canAfford ? '#fff' : '#555') : '#aaa';
            SpriteRenderer.drawText(ctx, opt.text, mx + 12, oy + 6, tc, 12);
            if (opt.cost > 0) {
                SpriteRenderer.drawText(ctx, `${opt.cost}`, mx + mw - 50, oy + 6, canAfford ? '#66bbff' : '#335', 11);
            }
        }
    }

    renderMinimap(ctx) {
        const mmW = 120, mmH = 80;
        const mmX = CANVAS_WIDTH - mmW - 8;
        const mmY = CANVAS_HEIGHT - 56 - mmH - 8;
        const scaleX = mmW / CANVAS_WIDTH;
        const scaleY = mmH / CANVAS_HEIGHT;

        // Background
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        SpriteRenderer._rr(ctx, mmX - 2, mmY - 2, mmW + 4, mmH + 4, 4);
        ctx.fill();
        ctx.fillStyle = 'rgba(30,40,30,0.8)';
        SpriteRenderer._rr(ctx, mmX, mmY, mmW, mmH, 3);
        ctx.fill();

        // Path(s)
        const allPaths = this.mapData.paths || [this.mapData.path];
        for (const path of allPaths) {
        ctx.strokeStyle = '#8a7a5a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(mmX + path[0].x * scaleX, mmY + path[0].y * scaleY);
        for (let i = 1; i < path.length; i++) {
            ctx.lineTo(mmX + path[i].x * scaleX, mmY + path[i].y * scaleY);
        }
        ctx.stroke();
        } // end for allPaths

        // Tower slots
        for (const tower of this.towerSystem.towers) {
            ctx.fillStyle = '#4a8aff';
            ctx.fillRect(mmX + tower.col * TILE_SIZE * scaleX, mmY + tower.row * TILE_SIZE * scaleY, 3, 3);
        }

        // Enemies
        for (const enemy of this.enemies) {
            if (!enemy.active) continue;
            ctx.fillStyle = enemy.boss ? '#ff4444' : '#ff8844';
            const s = enemy.boss ? 3 : 2;
            ctx.fillRect(mmX + enemy.x * scaleX - s / 2, mmY + enemy.y * scaleY - s / 2, s, s);
        }

        // Castle
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(mmX + this.castleX * scaleX - 2, mmY + this.castleY * scaleY - 2, 5, 5);

        // Hero
        if (!this.hero.dead) {
            ctx.fillStyle = '#44ff44';
            ctx.beginPath();
            ctx.arc(mmX + this.hero.x * scaleX, mmY + this.hero.y * scaleY, 2.5, 0, Math.PI * 2);
            ctx.fill();
        }

        // Border
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 1;
        SpriteRenderer._rr(ctx, mmX, mmY, mmW, mmH, 3);
        ctx.stroke();

    }

    renderComboCounter(ctx) {
        const cx = CANVAS_WIDTH / 2;
        const y = 56;
        const alpha = Math.min(1, this.comboTimer / 0.5);
        ctx.globalAlpha = alpha;

        const comboText = `${this.comboCount}x COMBO!`;
        let color = '#ffaa44';
        let size = 18;
        if (this.comboCount >= 10) { color = '#ff4444'; size = 24; }
        else if (this.comboCount >= 7) { color = '#ff6644'; size = 22; }
        else if (this.comboCount >= 5) { color = '#ffcc44'; size = 20; }

        SpriteRenderer.drawText(ctx, comboText, cx, y, color, size, 'center');
        if (this.comboGoldBonus > 0) {
            SpriteRenderer.drawTextNoOutline(ctx, `+${this.comboGoldBonus}g bonus`, cx, y + size + 2, '#ffd700', 10, 'center');
        }
        ctx.globalAlpha = 1;
    }

    renderWaveAnnouncement(ctx) {
        if (!this.waveAnnouncement) return;
        const a = this.waveAnnouncement;
        const progress = 1 - a.timer / a.maxTimer;

        // Fade in (0-0.15), hold, fade out (0.7-1.0)
        let alpha;
        if (progress < 0.15) alpha = progress / 0.15;
        else if (progress > 0.7) alpha = (1 - progress) / 0.3;
        else alpha = 1;

        // Slide in from top
        const slideOffset = progress < 0.15 ? (1 - progress / 0.15) * -30 : 0;

        const cx = CANVAS_WIDTH / 2;
        const baseY = 75 + slideOffset;

        ctx.globalAlpha = alpha;

        // Banner background
        const bannerW = 340;
        const enemyCount = a.enemies ? a.enemies.length : 0;
        const bannerH = 56 + enemyCount * 14 + (a.boss ? 20 : 0);
        const bx = cx - bannerW / 2;
        const by = baseY - 10;

        const grad = ctx.createLinearGradient(bx, by, bx + bannerW, by);
        grad.addColorStop(0, 'rgba(8,8,20,0)');
        grad.addColorStop(0.12, 'rgba(8,8,20,0.88)');
        grad.addColorStop(0.88, 'rgba(8,8,20,0.88)');
        grad.addColorStop(1, 'rgba(8,8,20,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(bx, by, bannerW, bannerH);

        // Gold accent lines
        const lineGrad = ctx.createLinearGradient(bx, by, bx + bannerW, by);
        lineGrad.addColorStop(0, 'rgba(255,215,0,0)');
        lineGrad.addColorStop(0.25, a.boss ? 'rgba(255,60,40,0.5)' : 'rgba(255,215,0,0.4)');
        lineGrad.addColorStop(0.75, a.boss ? 'rgba(255,60,40,0.5)' : 'rgba(255,215,0,0.4)');
        lineGrad.addColorStop(1, 'rgba(255,215,0,0)');
        ctx.fillStyle = lineGrad;
        ctx.fillRect(bx, by, bannerW, 1.5);
        ctx.fillRect(bx, by + bannerH - 1, bannerW, 1.5);

        // "WAVE X" title
        SpriteRenderer.drawText(ctx, `WAVE ${a.wave}`, cx, baseY, a.boss ? '#ff6644' : '#ffd700', 26, 'center');

        // Enemy composition
        const enemyColors = { goblin: '#5a5', wolf: '#777', orc: '#585', bat: '#636', shaman: '#558' };
        if (a.enemies && a.enemies.length > 0) {
            let ly = baseY + 30;
            for (const g of a.enemies) {
                const name = g.type.charAt(0).toUpperCase() + g.type.slice(1);
                ctx.fillStyle = enemyColors[g.type] || '#aaa';
                ctx.beginPath();
                ctx.arc(cx - 60, ly + 5, 4, 0, Math.PI * 2);
                ctx.fill();
                SpriteRenderer.drawTextNoOutline(ctx, `${name} x${g.count}`, cx - 50, ly, '#bbb', 11);
                ly += 14;
            }
        }

        // Boss warning
        if (a.boss) {
            const bossName = a.boss.charAt(0).toUpperCase() + a.boss.slice(1).replace(/([A-Z])/g, ' $1');
            const pulse = Math.sin(Date.now() / 150) * 0.3 + 0.7;
            ctx.globalAlpha = alpha * pulse;
            const bossY = baseY + 30 + enemyCount * 14 + 4;
            SpriteRenderer.drawText(ctx, `BOSS: ${bossName}`, cx, bossY, '#ff4444', 14, 'center');
            ctx.globalAlpha = alpha;
        }

        ctx.globalAlpha = 1;
    }

    renderWavePreview(ctx) {
        if (this.waveSystem.waveInProgress || this.waveSystem.spawning) return;
        if (this.waveSystem.allWavesDone) return;

        const nextWaveNum = this.waveSystem.currentWave + 1;
        let waveData;
        if (this.waveSystem.infinite) {
            // Don't preview infinite waves (generated randomly)
            return;
        }
        const waves = this.waveSystem.waves;
        if (nextWaveNum > waves.length) return;
        waveData = waves[nextWaveNum - 1];

        const px = 8;
        const py = 56;
        const pw = 165;

        // Count total enemies
        let total = 0;
        for (const g of waveData.enemies) total += g.count;
        if (waveData.boss) total++;

        const lineH = 14;
        const ph = 22 + waveData.enemies.length * lineH + (waveData.boss ? lineH : 0) + 14;

        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        SpriteRenderer._rr(ctx, px, py, pw, ph, 4);
        ctx.fill();

        SpriteRenderer.drawTextNoOutline(ctx, `Wave ${nextWaveNum} Preview (${total})`, px + 4, py + 3, '#aaa', 10);

        let ly = py + 18;
        const enemyColors = { goblin: '#5a5', wolf: '#777', orc: '#585', bat: '#636', shaman: '#558' };
        for (const group of waveData.enemies) {
            ctx.fillStyle = enemyColors[group.type] || '#aaa';
            ctx.fillRect(px + 6, ly + 2, 8, 8);
            const name = group.type.charAt(0).toUpperCase() + group.type.slice(1);
            SpriteRenderer.drawTextNoOutline(ctx, `${name} x${group.count}`, px + 18, ly, '#ccc', 10);
            ly += lineH;
        }
        if (waveData.boss) {
            ctx.fillStyle = '#ff4444';
            ctx.fillRect(px + 6, ly + 2, 8, 8);
            const bossName = waveData.boss.charAt(0).toUpperCase() + waveData.boss.slice(1).replace(/([A-Z])/g, ' $1');
            SpriteRenderer.drawTextNoOutline(ctx, `BOSS: ${bossName}`, px + 18, ly, '#ff6666', 10);
            ly += lineH;
        }
        SpriteRenderer.drawTextNoOutline(ctx, 'Right-click for details', px + 6, ly + 2, '#666', 8);
    }

    renderWaveAnnouncement(ctx) {
        if (!this.waveAnnouncement) return;
        const a = this.waveAnnouncement;
        const progress = 1 - a.timer / a.maxTimer;

        // Fade in (0-0.15), hold (0.15-0.7), fade out (0.7-1.0)
        let alpha;
        if (progress < 0.15) alpha = progress / 0.15;
        else if (progress > 0.7) alpha = (1 - progress) / 0.3;
        else alpha = 1;

        // Slide in from top
        const slideOffset = progress < 0.15 ? (1 - progress / 0.15) * -30 : 0;

        const cx = CANVAS_WIDTH / 2;
        const baseY = 75 + slideOffset;

        ctx.globalAlpha = alpha;

        // Dark banner background with gradient
        const bannerW = 320;
        const bannerH = 80 + (a.boss ? 18 : 0);
        const bx = cx - bannerW / 2;
        const by = baseY - 10;

        const grad = ctx.createLinearGradient(bx, by, bx + bannerW, by);
        grad.addColorStop(0, 'rgba(8,8,20,0)');
        grad.addColorStop(0.15, 'rgba(8,8,20,0.85)');
        grad.addColorStop(0.85, 'rgba(8,8,20,0.85)');
        grad.addColorStop(1, 'rgba(8,8,20,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(bx, by, bannerW, bannerH);

        // Top and bottom gold lines
        const lineGrad = ctx.createLinearGradient(bx, by, bx + bannerW, by);
        lineGrad.addColorStop(0, 'rgba(255,215,0,0)');
        lineGrad.addColorStop(0.3, 'rgba(255,215,0,0.4)');
        lineGrad.addColorStop(0.7, 'rgba(255,215,0,0.4)');
        lineGrad.addColorStop(1, 'rgba(255,215,0,0)');
        ctx.fillStyle = lineGrad;
        ctx.fillRect(bx, by, bannerW, 1);
        ctx.fillRect(bx, by + bannerH, bannerW, 1);

        // "WAVE X" title
        SpriteRenderer.drawText(ctx, `WAVE ${a.wave}`, cx, baseY, a.boss ? '#ff6644' : '#ffd700', 24, 'center');

        // Enemy composition line
        let enemyLine = a.enemies.map(g => {
            const name = g.type.charAt(0).toUpperCase() + g.type.slice(1);
            return `${g.count}x ${name}`;
        }).join('  \u00B7  ');
        SpriteRenderer.drawTextNoOutline(ctx, enemyLine, cx, baseY + 28, '#aaa', 11, 'center');

        // Boss warning
        if (a.boss) {
            const bossName = a.boss.charAt(0).toUpperCase() + a.boss.slice(1).replace(/([A-Z])/g, ' $1');
            const pulse = Math.sin(Date.now() / 150) * 0.3 + 0.7;
            ctx.globalAlpha = alpha * pulse;
            SpriteRenderer.drawText(ctx, `BOSS: ${bossName}`, cx, baseY + 48, '#ff4444', 14, 'center');
            ctx.globalAlpha = alpha;
        }

        ctx.globalAlpha = 1;
    }

    getNextWaveData() {
        const nextWave = this.waveSystem.currentWave + 1;
        if (this.waveSystem.infinite) return null;
        if (nextWave > this.waveSystem.waves.length) return null;
        return this.waveSystem.waves[nextWave - 1];
    }

    _handleRightClick(x, y) {
        // 1. Check right-click on a live enemy
        const clickedEnemy = this.enemies.find(e =>
            e.active && e.containsPoint(x, y)
        );
        if (clickedEnemy) {
            this.enemyInfoPanel = {
                enemyType: clickedEnemy.type,
                x: Math.min(x, CANVAS_WIDTH - 200),
                y: Math.max(y - 40, 10),
                live: clickedEnemy
            };
            return;
        }

        // 2. Check right-click on wave preview enemy names
        if (!this.waveSystem.waveInProgress && !this.waveSystem.spawning && !this.waveSystem.allWavesDone && !this.waveSystem.infinite) {
            const nextWaveNum = this.waveSystem.currentWave + 1;
            const waves = this.waveSystem.waves;
            if (nextWaveNum <= waves.length) {
                const waveData = waves[nextWaveNum - 1];
                const px = 8, py = 56, pw = 165, lineH = 14;
                let ly = py + 18;
                for (const group of waveData.enemies) {
                    if (pointInRect(x, y, px, ly, pw, lineH)) {
                        this.enemyInfoPanel = {
                            enemyType: group.type,
                            x: px + pw + 6,
                            y: ly
                        };
                        return;
                    }
                    ly += lineH;
                }
                if (waveData.boss && pointInRect(x, y, px, ly, pw, lineH)) {
                    this.enemyInfoPanel = {
                        enemyType: waveData.boss,
                        x: px + pw + 6,
                        y: ly
                    };
                    return;
                }
            }
        }

        // Click elsewhere closes the panel
        this.enemyInfoPanel = null;
    }

    renderEnemyInfoPanel(ctx) {
        if (!this.enemyInfoPanel) return;

        const { enemyType, x, y, live } = this.enemyInfoPanel;
        const data = EnemyData[enemyType];
        if (!data) { this.enemyInfoPanel = null; return; }

        const res = data.resistances || {};
        const resEntries = Object.entries(res);
        const weaknesses = resEntries.filter(([, v]) => v > 1);
        const resistances = resEntries.filter(([, v]) => v < 1);
        const pw = 210;
        const lineH = 18;
        const elemsPerRow = 2;
        const weakRows = weaknesses.length > 0 ? 1 + Math.ceil(weaknesses.length / elemsPerRow) : 0;
        const resRows = resistances.length > 0 ? 1 + Math.ceil(resistances.length / elemsPerRow) : 0;
        let lines = 5; // name, hp, speed, damage, armor
        const ph = 14 + lines * lineH + (weakRows + resRows) * lineH + 6;

        // Clamp position to canvas
        const panelX = Math.min(x, CANVAS_WIDTH - pw - 5);
        const panelY = Math.min(Math.max(y, 5), CANVAS_HEIGHT - ph - 5);

        // Background
        ctx.fillStyle = 'rgba(10,10,20,0.92)';
        SpriteRenderer._rr(ctx, panelX, panelY, pw, ph, 5);
        ctx.fill();
        ctx.strokeStyle = data.boss ? '#ffd700' : '#555';
        ctx.lineWidth = 1.5;
        SpriteRenderer._rr(ctx, panelX, panelY, pw, ph, 5);
        ctx.stroke();

        let ty = panelY + 6;
        const tx = panelX + 8;

        // Name (colored)
        const displayName = data.name + (data.boss ? ' (BOSS)' : '');
        SpriteRenderer.drawText(ctx, displayName, tx, ty, data.boss ? '#ffd700' : '#fff', 15);
        ty += lineH + 2;

        // Stats - show live values if inspecting a live enemy
        const hp = live ? `${Math.round(live.hp)}/${live.maxHp}` : `${data.hp}`;
        const speed = live ? `${Math.round(live.speed)}` : `${data.speed}`;

        // HP
        SpriteRenderer.drawTextNoOutline(ctx, `HP: ${hp}`, tx, ty, '#ee5555', 13);
        ty += lineH;

        // Speed
        SpriteRenderer.drawTextNoOutline(ctx, `Speed: ${speed}`, tx, ty, '#55cc55', 13);
        ty += lineH;

        // Damage
        SpriteRenderer.drawTextNoOutline(ctx, `Damage: ${data.damage}`, tx, ty, '#ff8844', 13);
        ty += lineH;

        // Armor
        SpriteRenderer.drawTextNoOutline(ctx, `Armor: ${data.armor}`, tx, ty, '#6688cc', 13);
        ty += lineH;

        // Weaknesses
        if (weaknesses.length > 0) {
            SpriteRenderer.drawTextNoOutline(ctx, 'Weak:', tx, ty, '#ff4444', 13);
            ty += lineH;
            for (let i = 0; i < weaknesses.length; i++) {
                const [elem, mult] = weaknesses[i];
                const col = ElementColors[elem] || '#fff';
                const pct = Math.round((mult - 1) * 100);
                const colIdx = i % elemsPerRow;
                const ex = tx + 8 + colIdx * 92;
                ctx.fillStyle = col;
                ctx.beginPath();
                ctx.arc(ex + 4, ty + 6, 4, 0, Math.PI * 2);
                ctx.fill();
                SpriteRenderer.drawTextNoOutline(ctx, `${ElementNames[elem]} +${pct}%`, ex + 12, ty, col, 12);
                if (colIdx === elemsPerRow - 1 || i === weaknesses.length - 1) ty += lineH;
            }
        }

        // Resistances
        if (resistances.length > 0) {
            SpriteRenderer.drawTextNoOutline(ctx, 'Resist:', tx, ty, '#8888aa', 13);
            ty += lineH;
            for (let i = 0; i < resistances.length; i++) {
                const [elem, mult] = resistances[i];
                const col = ElementColors[elem] || '#fff';
                const pct = Math.round((1 - mult) * 100);
                const colIdx = i % elemsPerRow;
                const ex = tx + 8 + colIdx * 92;
                ctx.fillStyle = col;
                ctx.beginPath();
                ctx.arc(ex + 4, ty + 6, 4, 0, Math.PI * 2);
                ctx.fill();
                SpriteRenderer.drawTextNoOutline(ctx, `${ElementNames[elem]} -${pct}%`, ex + 12, ty, col, 12);
                if (colIdx === elemsPerRow - 1 || i === resistances.length - 1) ty += lineH;
            }
        }
    }

    _drawCastleSprite(ctx) {
        const cx = this.castleX;
        const cy = this.castleY;
        if (castleImg.complete && castleImg.naturalWidth > 0) {
            const imgW = TILE_SIZE * 10.5;
            const imgH = imgW * (castleImg.naturalHeight / castleImg.naturalWidth);
            // Center the castle image on the path endpoint
            const drawX = cx - imgW / 2;
            const drawY = cy - imgH / 2;

            ctx.drawImage(castleImg, drawX, drawY, imgW, imgH);

            // Level glow at higher levels
            if (this.castleLevel >= 3) {
                const glow = ctx.createRadialGradient(cx, cy, 10, cx, cy, imgW * 0.45);
                glow.addColorStop(0, `rgba(255,215,0,${0.05 * this.castleLevel})`);
                glow.addColorStop(1, 'rgba(255,215,0,0)');
                ctx.fillStyle = glow;
                ctx.beginPath();
                ctx.arc(cx, cy, imgW * 0.45, 0, Math.PI * 2);
                ctx.fill();
            }
        } else {
            SpriteRenderer.drawCastle(ctx, cx, cy, this.castleLevel, this.castleHp / this.castleMaxHp);
        }
    }

    // Diamond hitbox: returns 0 if on edge, <0 if inside, >0 if outside
    _castleDiamondDist(px, py) {
        const h = this.castleHitbox;
        return Math.abs(px - h.cx) / h.hw + Math.abs(py - h.cy) / h.hh - 1;
    }

    // Push a point out of the castle diamond, returns {x, y}
    _pushOutOfCastle(px, py) {
        const h = this.castleHitbox;
        const dx = px - h.cx;
        const dy = py - h.cy;
        const d = Math.abs(dx) / h.hw + Math.abs(dy) / h.hh;
        if (d >= 1) return { x: px, y: py }; // already outside
        // Push along the direction from castle center
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 1) return { x: h.cx + h.hw, y: h.cy }; // edge case
        // Find intersection with diamond edge along this direction
        const nx = dx / dist;
        const ny = dy / dist;
        const t = 1 / (Math.abs(nx) / h.hw + Math.abs(ny) / h.hh);
        return { x: h.cx + nx * (t + 2), y: h.cy + ny * (t + 2) };
    }

    drawBackground(ctx) {
        const bgColor = this.mapData.bgColor || COLORS.GRASS;
        const mapId = this.mapId;

        // Use background image if available for this map
        const bgImg = mapBgImages[mapId];
        const HUD_TOP = 50;
        const HUD_BOTTOM = 58;
        const playH = CANVAS_HEIGHT - HUD_TOP - HUD_BOTTOM;
        if (bgImg && bgImg.complete && bgImg.naturalWidth > 0) {
            // Fill HUD areas with black
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, CANVAS_WIDTH, HUD_TOP);
            ctx.fillRect(0, CANVAS_HEIGHT - HUD_BOTTOM, CANVAS_WIDTH, HUD_BOTTOM);
            // Draw map background between HUD bars
            ctx.drawImage(bgImg, 0, HUD_TOP, CANVAS_WIDTH, playH);
        } else {
            // Fallback: procedural background
            const bgGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
            bgGrad.addColorStop(0, bgColor);
            bgGrad.addColorStop(1, this._darkenColor(bgColor, 0.15));
            ctx.fillStyle = bgGrad;
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

            // Biome-specific large terrain features
            this._drawBiomeTerrain(ctx, mapId, bgColor);

            // Organic tile-level texture
            for (let row = 0; row < CANVAS_HEIGHT / TILE_SIZE; row++) {
                for (let col = 0; col < CANVAS_WIDTH / TILE_SIZE; col++) {
                    const tx = col * TILE_SIZE;
                    const ty = row * TILE_SIZE;
                    const r = Math.random();
                    if (r < 0.2) {
                        ctx.fillStyle = 'rgba(0,0,0,0.03)';
                        ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);
                    } else if (r < 0.35) {
                        ctx.fillStyle = 'rgba(255,255,255,0.02)';
                        ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);
                    }
                }
            }

            // Biome-specific small details (grass, rocks, flowers, etc.)
            this._drawBiomeDetails(ctx, mapId);
        }

        // Draw stone path (skip if map has a background image with path baked in)
        if (!bgImg || !bgImg.complete || !bgImg.naturalWidth) {
            this.drawPath(ctx);
        }

        // Stone tower slot platforms (only for empty slots)
        const slots = this.towerSystem.getSlotCoords();
        for (const slot of slots) {
            if (slot.occupied) continue;
            this._drawTowerPlatform(ctx, slot.col * TILE_SIZE, slot.row * TILE_SIZE);
        }
    }

    _drawTowerPlatform(ctx, x, y, occupied) {
        const s = TILE_SIZE;
        const pad = 2;
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        SpriteRenderer._rr(ctx, x + pad + 2, y + pad + 2, s - pad * 2, s - pad * 2, 3);
        ctx.fill();
        // Base stone - darker border
        ctx.fillStyle = '#6a6a6a';
        SpriteRenderer._rr(ctx, x + pad, y + pad, s - pad * 2, s - pad * 2, 3);
        ctx.fill();
        // Main stone face
        const g = ctx.createLinearGradient(x, y + pad, x, y + s - pad);
        g.addColorStop(0, '#9a9a9a');
        g.addColorStop(0.15, '#8a8a8a');
        g.addColorStop(1, '#6a6a6a');
        ctx.fillStyle = g;
        SpriteRenderer._rr(ctx, x + pad + 2, y + pad + 2, s - pad * 2 - 4, s - pad * 2 - 4, 2);
        ctx.fill();
        // Top bevel highlight
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(x + pad + 3, y + pad + 2, s - pad * 2 - 6, 2);
        // Stone cross lines
        ctx.strokeStyle = 'rgba(0,0,0,0.08)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + s / 2, y + pad + 4);
        ctx.lineTo(x + s / 2, y + s - pad - 4);
        ctx.moveTo(x + pad + 4, y + s / 2);
        ctx.lineTo(x + s - pad - 4, y + s / 2);
        ctx.stroke();
        // Corner stone marks
        ctx.fillStyle = 'rgba(0,0,0,0.05)';
        ctx.fillRect(x + pad + 3, y + pad + 3, 6, 6);
        ctx.fillRect(x + s - pad - 9, y + pad + 3, 6, 6);
        ctx.fillRect(x + pad + 3, y + s - pad - 9, 6, 6);
        ctx.fillRect(x + s - pad - 9, y + s - pad - 9, 6, 6);
    }

    _drawBiomeTerrain(ctx, mapId, bgColor) {
        // Large-scale terrain features per biome
        if (mapId === 'desert') {
            // Sand dunes
            const duneColor1 = '#c8a84e';
            const duneColor2 = '#b89838';
            for (let i = 0; i < 6; i++) {
                const dx = (i * 187 + 30) % CANVAS_WIDTH;
                const dy = 60 + (i * 131) % (CANVAS_HEIGHT - 120);
                const dw = 120 + (i * 47) % 180;
                const dh = 30 + (i * 23) % 40;
                ctx.fillStyle = i % 2 === 0 ? duneColor1 : duneColor2;
                ctx.globalAlpha = 0.3;
                ctx.beginPath();
                ctx.ellipse(dx, dy, dw, dh, (i * 0.3) % 1, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
            }
            // Cracked ground patches
            for (let i = 0; i < 4; i++) {
                const cx = 100 + (i * 257) % (CANVAS_WIDTH - 200);
                const cy = 100 + (i * 193) % (CANVAS_HEIGHT - 200);
                this._drawCrackedGround(ctx, cx, cy, 40 + i * 10);
            }
        } else if (mapId === 'mountain') {
            // Rocky outcrops
            for (let i = 0; i < 5; i++) {
                const rx = (i * 211 + 50) % CANVAS_WIDTH;
                const ry = (i * 149 + 40) % CANVAS_HEIGHT;
                this._drawRockOutcrop(ctx, rx, ry, 20 + (i * 7) % 25);
            }
            // Snow patches
            for (let i = 0; i < 8; i++) {
                const sx = (i * 137 + 80) % CANVAS_WIDTH;
                const sy = (i * 97 + 20) % (CANVAS_HEIGHT * 0.5);
                ctx.fillStyle = 'rgba(220,230,240,0.15)';
                ctx.beginPath();
                ctx.ellipse(sx, sy, 30 + i * 5, 15 + i * 3, i * 0.5, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (mapId === 'swamp') {
            // Murky water pools
            for (let i = 0; i < 6; i++) {
                const wx = (i * 179 + 60) % CANVAS_WIDTH;
                const wy = (i * 143 + 70) % CANVAS_HEIGHT;
                const wr = 25 + (i * 13) % 35;
                const wg = ctx.createRadialGradient(wx, wy, 0, wx, wy, wr);
                wg.addColorStop(0, 'rgba(30,60,30,0.25)');
                wg.addColorStop(0.7, 'rgba(20,50,20,0.15)');
                wg.addColorStop(1, 'rgba(20,50,20,0)');
                ctx.fillStyle = wg;
                ctx.beginPath();
                ctx.ellipse(wx, wy, wr * 1.3, wr, i * 0.4, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (mapId === 'castle') {
            // Dark cracks in ground
            for (let i = 0; i < 5; i++) {
                const cx = (i * 223 + 40) % CANVAS_WIDTH;
                const cy = (i * 167 + 60) % CANVAS_HEIGHT;
                ctx.strokeStyle = 'rgba(80,40,20,0.15)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                for (let j = 0; j < 5; j++) {
                    ctx.lineTo(cx + (j + 1) * 15 * (j % 2 === 0 ? 1 : -0.5), cy + j * 12);
                }
                ctx.stroke();
            }
        }
    }

    _drawBiomeDetails(ctx, mapId) {
        // Seeded random for consistent placement
        const seed = (x, y) => ((x * 374761 + y * 668265) % 1000) / 1000;

        for (let row = 0; row < CANVAS_HEIGHT / TILE_SIZE; row++) {
            for (let col = 0; col < CANVAS_WIDTH / TILE_SIZE; col++) {
                const tx = col * TILE_SIZE;
                const ty = row * TILE_SIZE;
                const r = seed(col, row);

                if (mapId === 'forest' || mapId === 'infinite') {
                    // Grass tufts
                    if (r < 0.12) {
                        const gx = tx + (r * 100) % 20;
                        const gy = ty + (r * 200) % 20;
                        ctx.fillStyle = 'rgba(40,90,20,0.25)';
                        ctx.beginPath();
                        ctx.moveTo(gx, gy + 6);
                        ctx.quadraticCurveTo(gx - 1, gy, gx + 2, gy - 2);
                        ctx.quadraticCurveTo(gx + 3, gy, gx + 4, gy + 6);
                        ctx.fill();
                        ctx.beginPath();
                        ctx.moveTo(gx + 4, gy + 6);
                        ctx.quadraticCurveTo(gx + 5, gy - 1, gx + 7, gy - 3);
                        ctx.quadraticCurveTo(gx + 8, gy, gx + 9, gy + 6);
                        ctx.fill();
                    }
                    // Small bushes
                    if (r > 0.95) {
                        this._drawBush(ctx, tx + 12, ty + 14, 8 + r * 6);
                    }
                    // Flowers
                    if (r > 0.88 && r < 0.92) {
                        const colors = ['#e8c840', '#d06060', '#8080d0'];
                        ctx.fillStyle = colors[Math.floor(r * 30) % 3];
                        ctx.globalAlpha = 0.5;
                        ctx.beginPath();
                        ctx.arc(tx + r * 20, ty + r * 15, 2, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.globalAlpha = 1;
                    }
                    // Trees (sparse, large)
                    if (r > 0.97 && col > 1 && col < 28 && row > 1 && row < 18) {
                        this._drawTree(ctx, tx + 16, ty + 24, 'forest');
                    }
                } else if (mapId === 'desert') {
                    // Desert grass tufts
                    if (r < 0.08) {
                        ctx.fillStyle = 'rgba(120,130,50,0.3)';
                        const gx = tx + (r * 100) % 20;
                        const gy = ty + (r * 200) % 20;
                        ctx.beginPath();
                        ctx.moveTo(gx, gy + 5);
                        ctx.lineTo(gx + 1, gy);
                        ctx.lineTo(gx + 3, gy + 5);
                        ctx.fill();
                        ctx.beginPath();
                        ctx.moveTo(gx + 4, gy + 5);
                        ctx.lineTo(gx + 5, gy - 1);
                        ctx.lineTo(gx + 7, gy + 5);
                        ctx.fill();
                    }
                    // Cacti
                    if (r > 0.96 && col > 1 && col < 28 && row > 1 && row < 18) {
                        this._drawCactus(ctx, tx + 16, ty + 24);
                    }
                    // Acacia trees
                    if (r > 0.985 && col > 2 && col < 27 && row > 2 && row < 17) {
                        this._drawTree(ctx, tx + 16, ty + 24, 'desert');
                    }
                    // Small rocks
                    if (r > 0.92 && r < 0.95) {
                        ctx.fillStyle = 'rgba(140,120,80,0.3)';
                        ctx.beginPath();
                        ctx.ellipse(tx + r * 20, ty + r * 18, 3, 2, r * 3, 0, Math.PI * 2);
                        ctx.fill();
                    }
                } else if (mapId === 'mountain') {
                    // Small rocks
                    if (r < 0.1) {
                        ctx.fillStyle = 'rgba(80,80,80,0.2)';
                        ctx.beginPath();
                        ctx.ellipse(tx + r * 22, ty + r * 18, 3 + r * 3, 2 + r * 2, r * 5, 0, Math.PI * 2);
                        ctx.fill();
                    }
                    // Sparse grass
                    if (r > 0.85 && r < 0.9) {
                        ctx.fillStyle = 'rgba(60,80,40,0.2)';
                        ctx.beginPath();
                        ctx.moveTo(tx + 10, ty + 14);
                        ctx.lineTo(tx + 11, ty + 8);
                        ctx.lineTo(tx + 13, ty + 14);
                        ctx.fill();
                    }
                    // Pine trees
                    if (r > 0.97 && col > 1 && col < 28 && row > 1 && row < 18) {
                        this._drawTree(ctx, tx + 16, ty + 24, 'mountain');
                    }
                } else if (mapId === 'swamp') {
                    // Murky grass
                    if (r < 0.15) {
                        ctx.fillStyle = 'rgba(40,70,30,0.25)';
                        const gx = tx + (r * 100) % 20;
                        const gy = ty + (r * 200) % 18;
                        ctx.beginPath();
                        ctx.moveTo(gx, gy + 7);
                        ctx.lineTo(gx + 1, gy);
                        ctx.lineTo(gx + 2, gy + 7);
                        ctx.fill();
                    }
                    // Dead trees
                    if (r > 0.97 && col > 1 && col < 28 && row > 1 && row < 18) {
                        this._drawTree(ctx, tx + 16, ty + 24, 'swamp');
                    }
                    // Mushrooms
                    if (r > 0.93 && r < 0.95) {
                        ctx.fillStyle = '#8a6a4a';
                        ctx.fillRect(tx + 12, ty + 12, 2, 5);
                        ctx.fillStyle = '#cc4444';
                        ctx.beginPath();
                        ctx.arc(tx + 13, ty + 12, 4, Math.PI, 0);
                        ctx.fill();
                        ctx.fillStyle = '#ffcc88';
                        ctx.beginPath();
                        ctx.arc(tx + 12, ty + 11, 1, 0, Math.PI * 2);
                        ctx.fill();
                    }
                } else if (mapId === 'castle') {
                    // Sparse dead grass
                    if (r < 0.06) {
                        ctx.fillStyle = 'rgba(60,50,40,0.2)';
                        ctx.beginPath();
                        ctx.moveTo(tx + 10, ty + 14);
                        ctx.lineTo(tx + 11, ty + 8);
                        ctx.lineTo(tx + 13, ty + 14);
                        ctx.fill();
                    }
                    // Bones / rubble
                    if (r > 0.96) {
                        ctx.fillStyle = 'rgba(180,170,150,0.15)';
                        ctx.fillRect(tx + 8, ty + 12, 8, 2);
                        ctx.fillRect(tx + 11, ty + 10, 2, 6);
                    }
                }
            }
        }
    }

    _drawTree(ctx, x, y, biome) {
        if (biome === 'forest') {
            // Leafy tree
            ctx.fillStyle = '#3a2a10';
            ctx.fillRect(x - 2, y - 18, 4, 20);
            // Canopy layers
            ctx.fillStyle = 'rgba(30,80,20,0.7)';
            ctx.beginPath(); ctx.arc(x, y - 22, 12, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'rgba(40,100,25,0.6)';
            ctx.beginPath(); ctx.arc(x - 5, y - 18, 8, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(x + 6, y - 19, 9, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'rgba(50,110,30,0.5)';
            ctx.beginPath(); ctx.arc(x + 2, y - 26, 7, 0, Math.PI * 2); ctx.fill();
        } else if (biome === 'desert') {
            // Acacia tree - flat canopy
            ctx.fillStyle = '#5a3a15';
            ctx.fillRect(x - 2, y - 22, 3, 24);
            // Branches
            ctx.strokeStyle = '#5a3a15';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x, y - 16); ctx.lineTo(x - 14, y - 22);
            ctx.moveTo(x, y - 18); ctx.lineTo(x + 12, y - 24);
            ctx.stroke();
            // Flat canopy
            ctx.fillStyle = 'rgba(70,100,30,0.5)';
            ctx.beginPath();
            ctx.ellipse(x, y - 26, 18, 6, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(80,110,35,0.4)';
            ctx.beginPath();
            ctx.ellipse(x - 3, y - 24, 14, 5, 0, 0, Math.PI * 2);
            ctx.fill();
        } else if (biome === 'mountain') {
            // Pine tree
            ctx.fillStyle = '#3a2a10';
            ctx.fillRect(x - 1, y - 10, 3, 12);
            ctx.fillStyle = 'rgba(25,60,25,0.7)';
            ctx.beginPath();
            ctx.moveTo(x, y - 28);
            ctx.lineTo(x - 8, y - 12);
            ctx.lineTo(x + 9, y - 12);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = 'rgba(30,70,30,0.6)';
            ctx.beginPath();
            ctx.moveTo(x, y - 22);
            ctx.lineTo(x - 10, y - 8);
            ctx.lineTo(x + 11, y - 8);
            ctx.closePath();
            ctx.fill();
        } else if (biome === 'swamp') {
            // Dead tree
            ctx.strokeStyle = '#4a3a2a';
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(x, y); ctx.lineTo(x - 1, y - 20);
            ctx.stroke();
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x - 1, y - 14); ctx.lineTo(x - 10, y - 20);
            ctx.moveTo(x, y - 18); ctx.lineTo(x + 8, y - 24);
            ctx.moveTo(x - 1, y - 10); ctx.lineTo(x + 7, y - 14);
            ctx.stroke();
        }
    }

    _drawBush(ctx, x, y, size) {
        ctx.fillStyle = 'rgba(35,75,20,0.4)';
        ctx.beginPath(); ctx.arc(x, y, size * 0.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(45,90,25,0.35)';
        ctx.beginPath(); ctx.arc(x - size * 0.3, y + 1, size * 0.35, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(x + size * 0.3, y - 1, size * 0.4, 0, Math.PI * 2); ctx.fill();
    }

    _drawCactus(ctx, x, y) {
        // Main body
        ctx.fillStyle = '#4a7a30';
        SpriteRenderer._rr(ctx, x - 3, y - 16, 6, 18, 3);
        ctx.fill();
        // Left arm
        ctx.fillRect(x - 8, y - 10, 5, 3);
        SpriteRenderer._rr(ctx, x - 8, y - 16, 4, 9, 2);
        ctx.fill();
        // Right arm
        ctx.fillRect(x + 3, y - 8, 5, 3);
        SpriteRenderer._rr(ctx, x + 5, y - 13, 4, 8, 2);
        ctx.fill();
        // Highlights
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(x - 2, y - 15, 2, 14);
    }

    _drawCrackedGround(ctx, x, y, size) {
        ctx.strokeStyle = 'rgba(80,60,30,0.15)';
        ctx.lineWidth = 1;
        ctx.lineCap = 'round';
        // Radial cracks
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2 + 0.3;
            const len = size * (0.5 + (i * 0.13) % 0.5);
            ctx.beginPath();
            ctx.moveTo(x, y);
            const mx = x + Math.cos(a) * len * 0.5 + Math.sin(i * 2) * 5;
            const my = y + Math.sin(a) * len * 0.5 + Math.cos(i * 2) * 5;
            ctx.lineTo(mx, my);
            ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
            ctx.stroke();
        }
    }

    _drawRockOutcrop(ctx, x, y, size) {
        ctx.fillStyle = 'rgba(70,70,75,0.25)';
        ctx.beginPath();
        ctx.moveTo(x - size, y + size * 0.3);
        ctx.quadraticCurveTo(x - size * 0.5, y - size * 0.8, x, y - size * 0.6);
        ctx.quadraticCurveTo(x + size * 0.6, y - size * 0.9, x + size, y + size * 0.3);
        ctx.closePath();
        ctx.fill();
        // Highlight
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.beginPath();
        ctx.moveTo(x - size * 0.6, y - size * 0.1);
        ctx.quadraticCurveTo(x - size * 0.2, y - size * 0.7, x + size * 0.3, y - size * 0.4);
        ctx.quadraticCurveTo(x, y - size * 0.2, x - size * 0.6, y - size * 0.1);
        ctx.fill();
    }

    _darkenColor(hex, amount) {
        const r = parseInt(hex.slice(1, 3), 16) || 0;
        const g = parseInt(hex.slice(3, 5), 16) || 0;
        const b = parseInt(hex.slice(5, 7), 16) || 0;
        return `rgb(${Math.floor(r * (1 - amount))},${Math.floor(g * (1 - amount))},${Math.floor(b * (1 - amount))})`;
    }

    drawPath(ctx) {
        // Draw all paths for multi-path maps
        const allPaths = this.mapData.paths || [this.mapData.path];
        for (const p of allPaths) {
            this._drawSinglePath(ctx, p);
        }
    }

    _drawSinglePath(ctx, path) {
        const pathW = TILE_SIZE + 8; // Total path width including border

        ctx.lineCap = 'square';
        ctx.lineJoin = 'miter';

        // Outer dark border (stone edge shadow)
        ctx.strokeStyle = '#3a3530';
        ctx.lineWidth = pathW + 6;
        ctx.beginPath();
        ctx.moveTo(path[0].x, path[0].y);
        for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y);
        ctx.stroke();

        // Stone border
        ctx.strokeStyle = '#6a6560';
        ctx.lineWidth = pathW + 2;
        ctx.beginPath();
        ctx.moveTo(path[0].x, path[0].y);
        for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y);
        ctx.stroke();

        // Main stone fill
        ctx.strokeStyle = '#8a8580';
        ctx.lineWidth = pathW - 4;
        ctx.beginPath();
        ctx.moveTo(path[0].x, path[0].y);
        for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y);
        ctx.stroke();

        // Inner lighter stone
        ctx.strokeStyle = '#9a9590';
        ctx.lineWidth = pathW - 10;
        ctx.beginPath();
        ctx.moveTo(path[0].x, path[0].y);
        for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y);
        ctx.stroke();

        // Stone brick pattern on path
        ctx.lineCap = 'round';
        for (let i = 0; i < path.length - 1; i++) {
            const p1 = path[i], p2 = path[i + 1];
            const dx = p2.x - p1.x, dy = p2.y - p1.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            const isHoriz = Math.abs(dx) > Math.abs(dy);
            const brickW = isHoriz ? 14 : (pathW - 8) * 0.45;
            const brickH = isHoriz ? (pathW - 8) * 0.45 : 14;
            const steps = Math.floor(len / (isHoriz ? brickW + 2 : brickH + 2));

            for (let j = 0; j < steps; j++) {
                const t = (j + 0.5) / steps;
                const bx = p1.x + dx * t;
                const by = p1.y + dy * t;
                const offset = (j % 2 === 0) ? -1.5 : 1.5;

                // Brick mortar lines (dark gaps between bricks)
                ctx.strokeStyle = 'rgba(50,45,40,0.2)';
                ctx.lineWidth = 1;
                if (isHoriz) {
                    // Vertical mortar line
                    ctx.beginPath();
                    ctx.moveTo(bx - brickW / 2, by - (pathW - 12) / 2);
                    ctx.lineTo(bx - brickW / 2, by + (pathW - 12) / 2);
                    ctx.stroke();
                    // Horizontal mortar (offset per row)
                    ctx.beginPath();
                    ctx.moveTo(bx - brickW / 2, by + offset);
                    ctx.lineTo(bx + brickW / 2, by + offset);
                    ctx.stroke();
                } else {
                    // Horizontal mortar line
                    ctx.beginPath();
                    ctx.moveTo(bx - (pathW - 12) / 2, by - brickH / 2);
                    ctx.lineTo(bx + (pathW - 12) / 2, by - brickH / 2);
                    ctx.stroke();
                    // Vertical mortar (offset per col)
                    ctx.beginPath();
                    ctx.moveTo(bx + offset, by - brickH / 2);
                    ctx.lineTo(bx + offset, by + brickH / 2);
                    ctx.stroke();
                }

                // Random stone color variation
                if (Math.random() < 0.15) {
                    ctx.fillStyle = 'rgba(0,0,0,0.04)';
                    ctx.fillRect(bx - brickW / 2 + 1, by - brickH / 2 + 1, brickW - 2, brickH - 2);
                } else if (Math.random() < 0.1) {
                    ctx.fillStyle = 'rgba(255,255,255,0.03)';
                    ctx.fillRect(bx - brickW / 2 + 1, by - brickH / 2 + 1, brickW - 2, brickH - 2);
                }
            }
        }

        // Top edge highlight (3D raised look)
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 1;
        ctx.lineCap = 'square';
        // We only highlight the top/left edges by drawing a slightly offset line
        ctx.beginPath();
        ctx.moveTo(path[0].x, path[0].y - (pathW - 4) / 2);
        for (let i = 1; i < path.length; i++) {
            ctx.lineTo(path[i].x, path[i].y - (pathW - 4) / 2);
        }
        ctx.stroke();

        // Entry indicator (green glow + arrow)
        const entry = path[0];
        ctx.fillStyle = 'rgba(80,200,80,0.2)';
        ctx.beginPath();
        ctx.arc(entry.x, entry.y, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#5c5';
        ctx.beginPath();
        ctx.moveTo(entry.x + 12, entry.y);
        ctx.lineTo(entry.x - 4, entry.y - 8);
        ctx.lineTo(entry.x - 4, entry.y + 8);
        ctx.closePath();
        ctx.fill();

    }
}

