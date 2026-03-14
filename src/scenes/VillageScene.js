import { Scene } from '../engine/Scene.js';
import { NPC } from '../entities/NPC.js';
import { Hero } from '../entities/Hero.js';
import { Button } from '../ui/Button.js';
import { SpriteRenderer } from '../renderer/SpriteRenderer.js';
import { UIRenderer } from '../renderer/UIRenderer.js';
import { ShopData } from '../data/ShopData.js';
import { EquipmentData } from '../data/EquipmentData.js';
import { SkillData } from '../data/SkillData.js';
import { SkillSystem } from '../systems/SkillSystem.js';
import { PetData } from '../data/PetData.js';
import { Pet } from '../entities/Pet.js';
import { Materials } from '../data/MaterialData.js';
import { GearData, GearCaps, GearMaterialCosts } from '../data/GearData.js';
import { BuildingData, EquipmentTiers, PetTiers, getBuildingLevel, canUpgradeBuilding, upgradeBuilding } from '../data/BuildingData.js';
import { CANVAS_WIDTH, CANVAS_HEIGHT, TILE_SIZE, SCENES, COLORS } from '../utils/Constants.js';
import { distance, pointInRect } from '../utils/MathUtils.js';
import { Audio } from '../audio/AudioManager.js';
import { QuestData, QUEST_RESET_INTERVAL } from '../data/QuestData.js';
import { BalanceConfig } from '../data/BalanceConfig.js';
import { TowerResearchData, ResearchCaps, getResearchLevel } from '../data/TowerResearchData.js';
import { TowerData, ElementColors } from '../data/TowerData.js';

// Preload village background
const villageBgImg = new Image();
villageBgImg.src = 'assets/bghub.png';

// Preload building images
const buildingImages = {};
const buildingImageMap = {
    blacksmith: 'forgeron',
    elder: 'house',
    sage: 'wizzardhouse',
    merchant: 'shop',
    beastmaster: 'dragon'
};
for (const [id, file] of Object.entries(buildingImageMap)) {
    const img = new Image();
    img.src = `assets/${file}.png`;
    buildingImages[id] = img;
}

export class VillageScene extends Scene {
    constructor(game) {
        super(game);
        this.hero = null;
        this.npcs = [];
        this.activeShop = null;
        this.shopButtons = [];
        this.hoveredNPC = null;
        this.bgDrawn = false;
        this.scrollY = 0;
        this.maxScroll = 0;

        // NPC interaction menu
        this.interactMenu = null;    // { npc, x, y }
        this.interactHovered = -1;

        // Dialogue box
        this.dialogueBox = null;     // { npcName, text, type }

        // Material tooltip
        this._matZones = [];         // [{ x, y, w, h, id, name, color, amount, needed }]
        this._matTooltip = null;     // { x, y, id, name, color, amount, needed }
        this._mouseX = 0;
        this._mouseY = 0;

        // Level-up animation
        this._levelUpAnim = null; // { timer, maxTimer, level }
    }

    enter() {
        this.bgDrawn = false;
        this.activeShop = null;
        this.shopButtons = [];
        this.hoveredNPC = null;
        this.scrollY = 0;

        // Track which NPCs have been visited this session (indicators dismissed)
        this._visitedNpcs = new Set();

        // Ensure village music plays
        Audio.switchMusic('assets/hubmusic.mp3');
        Audio.ensureMusic();

        const pd = this.game.playerData;
        this.hero = new Hero(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 40, pd);

        // Building collision boxes { cx, cy, hw, hh } (center + half-widths)
        this.buildingColliders = [
            { cx: 180, cy: 400, hw: 50, hh: 35 },   // blacksmith
            { cx: 340, cy: 220, hw: 45, hh: 35 },   // elder house
            { cx: 700, cy: 250, hw: 55, hh: 35 },   // merchant shop
            { cx: 680, cy: 475, hw: 40, hh: 40 },   // sage tower
            { cx: 480, cy: 145, hw: 50, hh: 40 },   // portal arch
        ];

        // NPCs next to their buildings
        this.npcs = [
            new NPC(180, 470, 'blacksmith', 'Blacksmith'),   // below forge
            new NPC(420, 275, 'elder', 'Elder'),              // right of his house
            new NPC(620, 305, 'merchant', 'Merchant'),        // left of his shop
            new NPC(680, 540, 'sage', 'Sage'),                // below tower
            new NPC(CANVAS_WIDTH / 2, 145, 'portal', 'Battle Portal'),
            new NPC(480, 570, 'questboard', 'Quest Board'),
            new NPC(120, 300, 'beastmaster', 'Beast Tamer')
        ];

        // Village pet (follows hero around in village)
        this.villagePet = null;
        if (pd.pets && pd.pets.active) {
            this.villagePet = new Pet(this.hero, pd.pets.active, pd.pets.levels[pd.pets.active] || 1);
        }

        // Update NPC upgrade indicators
        this._updateNpcIndicators();

        // Check for pending level-up animation from a run
        if (this.game.pendingLevelUp) {
            const info = this.game.pendingLevelUp;
            this._levelUpAnim = { timer: 3.0, maxTimer: 3.0, level: info.newLevel, levels: info.levels };
            this.game.pendingLevelUp = null;
            Audio.playVictory();
        } else {
            this._levelUpAnim = null;
        }
    }

    update(dt) {
        // Update NPCs for animation
        for (const npc of this.npcs) {
            npc.update(dt);
        }
        if (!this.activeShop) {
            this.hero.update(dt);
            this._resolveCollisions();
        }
        // Update village pet
        if (this.villagePet) {
            this.villagePet.hero = this.hero;
            this.villagePet.update(dt, []);
        }
        // Level-up animation
        if (this._levelUpAnim) {
            this._levelUpAnim.timer -= dt;
            if (this._levelUpAnim.timer <= 0) {
                this._levelUpAnim = null;
            }
        }
    }

    _resolveCollisions() {
        const h = this.hero;
        const heroR = 12;

        // Building collisions (AABB push-out)
        for (const b of this.buildingColliders) {
            const dx = h.x - b.cx;
            const dy = h.y - b.cy;
            const overlapX = b.hw + heroR - Math.abs(dx);
            const overlapY = b.hh + heroR - Math.abs(dy);
            if (overlapX > 0 && overlapY > 0) {
                // Push out along smallest overlap axis
                if (overlapX < overlapY) {
                    h.x += dx > 0 ? overlapX : -overlapX;
                } else {
                    h.y += dy > 0 ? overlapY : -overlapY;
                }
            }
        }

        // NPC collisions (circle push-out)
        const npcR = 18;
        for (const npc of this.npcs) {
            if (npc.type === 'portal') continue;
            const dx = h.x - npc.x;
            const dy = h.y - npc.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const minDist = heroR + npcR;
            if (dist < minDist && dist > 0) {
                h.x = npc.x + (dx / dist) * minDist;
                h.y = npc.y + (dy / dist) * minDist;
            }
        }

        // Keep hero in bounds
        h.x = Math.max(heroR, Math.min(CANVAS_WIDTH - heroR, h.x));
        h.y = Math.max(50 + heroR, Math.min(CANVAS_HEIGHT - heroR, h.y));
    }

    _updateNpcIndicators() {
        const pd = this.game.playerData;
        for (const npc of this.npcs) {
            if (this._visitedNpcs.has(npc.type)) {
                npc.hasNewUpgrade = false;
            } else {
                npc.hasNewUpgrade = this._npcHasAvailable(npc.type, pd);
            }
        }
    }

    _npcHasAvailable(type, pd) {
        // Quest board: check for unclaimed fulfilled quests
        if (type === 'questboard') {
            if (!pd.quests) return false;
            const now = Date.now();
            if (now - pd.quests.lastReset >= QUEST_RESET_INTERVAL) return false;
            for (const quest of QuestData) {
                if (pd.quests.completed[quest.id] === 'fulfilled') return true;
            }
            return false;
        }

        // Portal has no indicator
        if (type === 'portal') return false;

        // Check building upgrade
        if (BuildingData[type]) {
            const check = canUpgradeBuilding(pd, type);
            if (check.can) return true;
        }

        if (type === 'blacksmith') {
            const bLvl = getBuildingLevel(pd, 'blacksmith');
            const gearCap = (BuildingData.blacksmith.gearCaps || GearCaps)[bLvl - 1] || 3;
            if (!pd.gear) return false;
            for (const [gearId, gear] of Object.entries(GearData)) {
                const level = pd.gear[gearId] || 0;
                if (level >= gearCap || level >= 10) continue;
                if (pd.gold >= (gear.cost[level] || 0)) return true;
            }
        } else if (type === 'elder') {
            const bLvl = getBuildingLevel(pd, 'elder');
            const resCap = BuildingData.elder.researchCaps[bLvl - 1] || 1;
            if (!pd.towerResearch) pd.towerResearch = {};
            for (const [towerId, towerRes] of Object.entries(TowerResearchData)) {
                if (!pd.towerResearch[towerId]) pd.towerResearch[towerId] = {};
                for (const [resId, res] of Object.entries(towerRes.researches)) {
                    const level = getResearchLevel(pd, towerId, resId);
                    if (level >= res.maxLevel || level >= resCap) continue;
                    if (pd.gold >= res.cost[level]) return true;
                }
            }
        } else if (type === 'sage') {
            const bLvl = getBuildingLevel(pd, 'sage');
            const skillCap = BuildingData.sage.skillCaps[bLvl - 1] || 1;
            const allSkills = { ...SkillData.active, ...SkillData.passive };
            for (const [id] of Object.entries(allSkills)) {
                const level = pd.skills[id] || 0;
                if (level >= skillCap) continue;
                if (SkillSystem.canLearn(id, pd)) return true;
            }
        } else if (type === 'merchant') {
            const bLvl = getBuildingLevel(pd, 'merchant');
            for (const [id, item] of Object.entries(EquipmentData.accessories)) {
                const tier = EquipmentTiers[id] || 1;
                if (tier > bLvl) continue;
                const owned = pd.equipment.accessory?.name === item.name || pd.inventory.includes(id);
                if (!owned && pd.gold >= item.cost) return true;
            }
        } else if (type === 'beastmaster') {
            if (!pd.pets) return false;
            const bLvl = getBuildingLevel(pd, 'beastmaster');
            for (const [petId, pet] of Object.entries(PetData)) {
                const petTier = PetTiers[petId] || 1;
                if (petTier > bLvl) continue;
                const unlocked = pd.pets.unlocked[petId] || false;
                if (!unlocked) {
                    if (pd.gold >= pet.unlockCost) return true;
                } else {
                    const level = pd.pets.levels[petId] || 1;
                    if (level < 5 && pd.gold >= (pet.upgradeCosts[level] || 0)) return true;
                }
            }
        }
        return false;
    }

    onMouseMove(x, y) {
        this._mouseX = x;
        this._mouseY = y;
        // Check hover zones (materials + top bar stats) for tooltip
        this._matTooltip = null;
        const allZones = [...(this._matZones || []), ...(this._topBarZones || [])];
        for (const z of allZones) {
            if (x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h) {
                this._matTooltip = z;
                break;
            }
        }
        this.hoveredNPC = null;
        if (!this.activeShop && !this.interactMenu && !this.dialogueBox) {
            for (const npc of this.npcs) {
                if (distance(x, y, npc.x, npc.y) < npc.interactRadius) {
                    this.hoveredNPC = npc;
                }
            }
        }
        // Interact menu hover
        if (this.interactMenu) {
            this.interactHovered = this._hitInteractMenu(x, y);
        }
        // Offset mouse Y by scroll for shop item buttons
        const sy = this.activeShop ? y + this.scrollY : y;
        for (const btn of this.shopButtons) {
            if (btn.text === 'X') {
                btn.handleMouseMove(x, y);
            } else {
                btn.handleMouseMove(x, sy);
            }
        }
    }

    onMouseDown(x, y, button) {
        if (button !== 0) return;

        // Dialogue box — click anywhere to close
        if (this.dialogueBox) {
            this.dialogueBox = null;
            return;
        }

        // Interact menu (Talk / Trade)
        if (this.interactMenu) {
            const hit = this._hitInteractMenu(x, y);
            if (hit === 0) {
                // Talk
                this._talkToNPC(this.interactMenu.npc);
                this.interactMenu = null;
                return;
            } else if (hit === 1) {
                // Trade/Shop
                const npc = this.interactMenu.npc;
                this.interactMenu = null;
                switch (npc.type) {
                    case 'blacksmith': this.openBlacksmith(); break;
                    case 'elder': this.openElder(); break;
                    case 'sage': this.openSage(); break;
                    case 'merchant': this.openMerchant(); break;
                    case 'beastmaster': this.openBeastmaster(); break;
                }
                return;
            }
            // Clicked outside menu
            this.interactMenu = null;
            return;
        }

        // Shop UI
        if (this.activeShop) {
            const sy = y + this.scrollY;
            for (const btn of this.shopButtons) {
                if (btn.text === 'X') {
                    if (btn.handleClick(x, y)) return;
                } else {
                    if (btn.handleClick(x, sy)) return;
                }
            }
            if (!pointInRect(x, y, 50, 55, CANVAS_WIDTH - 100, CANVAS_HEIGHT - 80)) {
                this.closeShop();
            }
            return;
        }

        // NPC interaction
        for (const npc of this.npcs) {
            if (distance(x, y, npc.x, npc.y) < npc.interactRadius) {
                this.interactNPC(npc);
                return;
            }
        }

        // Move hero
        this.hero.moveTo(x, y);
    }

    onWheel(deltaY) {
        if (this.activeShop && this.maxScroll > 0) {
            this.scrollY = Math.max(0, Math.min(this.maxScroll, this.scrollY + deltaY * 0.5));
        }
    }

    onKeyDown(key) {
        if (key === 'Escape') {
            if (this.dialogueBox) {
                this.dialogueBox = null;
            } else if (this.interactMenu) {
                this.interactMenu = null;
            } else if (this.activeShop) {
                this.closeShop();
            } else {
                this.game.sceneManager.push(SCENES.PAUSE);
            }
            return;
        }
        // Quick NPC access keys
        if (!this.activeShop) {
            if (key === 'b' || key === 'B') this.openBlacksmith();
            if (key === 'e' || key === 'E') this.openElder();
            if (key === 's' || key === 'S') this.openSage();
            if (key === 'm' || key === 'M') this.openMerchant();
            if (key === 'q' || key === 'Q') this.openQuestBoard();
            if (key === 'f' || key === 'F') this.openBeastmaster();
            if (key === 'i' || key === 'I') this.openInventory();
            if (key === 'p' || key === 'P' || key === 'Enter') {
                this.game.sceneManager.switch(SCENES.MAP_SELECT);
            }
        }
    }

    interactNPC(npc) {
        this._visitedNpcs.add(npc.type);
        npc.hasNewUpgrade = false;
        if (npc.type === 'portal') {
            this.game.sceneManager.switch(SCENES.MAP_SELECT);
            return;
        }
        if (npc.type === 'questboard') {
            this.openQuestBoard();
            return;
        }
        // Show interaction menu
        this.interactMenu = { npc, x: npc.x, y: npc.y - 50 };
        this.interactHovered = -1;
    }

    _openShop(type) {
        this.activeShop = type;
        this.scrollY = 0;
        const talk = ShopData[type]?.talk;
        this.activeDialogue = talk ? talk[Math.floor(Math.random() * talk.length)].text : '';
        this.refreshShopButtons();
    }
    openBlacksmith() { this._openShop('blacksmith'); }
    openElder() { this._openShop('elder'); }
    openSage() { this._openShop('sage'); }
    openMerchant() { this._openShop('merchant'); }
    openQuestBoard() { this._openShop('questboard'); }
    openBeastmaster() { this._openShop('beastmaster'); }
    openInventory() { this._openShop('inventory'); }

    closeShop() {
        this.activeShop = null;
        this.shopButtons = [];
        this.hero.recalcStats();
        this.hero.hp = Math.min(this.hero.hp, this.hero.maxHp);
        this._updateNpcIndicators();
    }

    _talkToNPC(npc) {
        const data = ShopData[npc.type];
        if (!data || !data.talk || data.talk.length === 0) return;
        const line = data.talk[Math.floor(Math.random() * data.talk.length)];
        this.dialogueBox = { npcName: npc.name, text: line.text, type: line.type };
    }

    _hitInteractMenu(x, y) {
        if (!this.interactMenu) return -1;
        const nx = this.interactMenu.x;
        const ny = this.interactMenu.y;
        const w = 120;
        const btnH = 32;
        const nameH = 24;
        const pad = 8;
        const gap = 6;
        const totalH = pad + nameH + gap + btnH * 2 + gap + pad;
        const mx = nx - w / 2 + pad;
        const my = ny - totalH - 5;
        const btnW = w - pad * 2;
        const sepY = my + pad + nameH;
        const btn0Y = sepY + gap;
        const btn1Y = btn0Y + btnH + gap;
        if (pointInRect(x, y, mx, btn0Y, btnW, btnH)) return 0;
        if (pointInRect(x, y, mx, btn1Y, btnW, btnH)) return 1;
        return -1;
    }

    refreshShopButtons() {
        this.shopButtons = [];
        this.shopItems = []; // visual item cards data
        const pd = this.game.playerData;
        const PX = 50, PY = 55;
        const PW = CANVAS_WIDTH - 100;

        // Close button
        this.shopButtons.push(new Button(PX + PW - 42, PY + 8, 32, 32, 'X', () => {
            this.closeShop();
        }, { color: '#633', hoverColor: '#844' }));

        const cardX = PX + 14;
        const cardW = PW - 28;
        const cardH = 48;
        const gap = 4;
        let cy = PY + 64;

        const makeEquipAction = (category, id, item) => () => {
            const equipped = pd.equipment[category]?.name === item.name;
            const owned = equipped || pd.inventory.includes(id);
            if (equipped) return;
            if (owned) {
                pd.equipment[category] = { ...item };
            } else if (pd.gold >= item.cost) {
                pd.gold -= item.cost;
                pd.equipment[category] = { ...item };
                pd.inventory.push(id);
                this.game.saveGame();
            }
            this.refreshShopButtons();
        };

        // Building upgrade button helper
        const addBuildingUpgradeCard = (buildingId) => {
            const bLvl = getBuildingLevel(pd, buildingId);
            if (bLvl >= 5) return;
            const check = canUpgradeBuilding(pd, buildingId);
            const nextData = BuildingData[buildingId].upgrades[bLvl];
            this.shopItems.push({ type: 'buildingUpgrade', buildingId, bLvl, nextData, check, y: cy });
            this.shopButtons.push(new Button(cardX, cy, cardW, 66, '', () => {
                if (upgradeBuilding(pd, buildingId)) {
                    this.game.saveGame();
                    this.refreshShopButtons();
                }
            }, { disabled: !check.can, color: 'transparent', hoverColor: 'transparent' }));
            cy += 70;
        };

        switch (this.activeShop) {
            case 'blacksmith': {
                const bLvl = getBuildingLevel(pd, 'blacksmith');
                addBuildingUpgradeCard('blacksmith');
                const gearCap = (BuildingData.blacksmith.gearCaps || GearCaps)[bLvl - 1] || 3;
                if (!pd.gear) pd.gear = { sword: 0, helmet: 0, chestplate: 0, leggings: 0, boots: 0 };

                for (const [gearId, gear] of Object.entries(GearData)) {
                    const level = pd.gear[gearId] || 0;
                    const maxed = level >= gearCap;
                    const atMax = level >= 10;
                    const cost = atMax ? 0 : gear.cost[level] || 0;
                    const matCost = (!atMax && !maxed) ? (GearMaterialCosts[level] || {}) : {};
                    const hasGold = pd.gold >= cost;
                    const hasMats = Object.entries(matCost).every(([m, q]) => (pd.materials[m] || 0) >= q);
                    const canUpg = !maxed && !atMax && hasGold && hasMats;
                    this.shopItems.push({ type: 'gear', gearId, gear, level, maxed, atMax, cost, matCost, cap: gearCap, y: cy });
                    this.shopButtons.push(new Button(cardX, cy, cardW, 62, '', () => {
                        if (canUpg) {
                            pd.gold -= cost;
                            for (const [m, q] of Object.entries(matCost)) {
                                pd.materials[m] = (pd.materials[m] || 0) - q;
                            }
                            pd.gear[gearId] = level + 1;
                            this.hero.recalcStats();
                            this.hero.hp = Math.min(this.hero.hp, this.hero.maxHp);
                            this.game.saveGame();
                            this.refreshShopButtons();
                        }
                    }, { disabled: !canUpg, color: 'transparent', hoverColor: 'transparent' }));
                    cy += 66;
                }

                // Accessories (basic/mid-tier, sold at blacksmith)
                cy += 4;
                this.shopItems.push({ type: 'header', text: 'ACCESSORIES', color: '#ccaaee', y: cy });
                cy += 20;
                const bsAccessories = ['speedBoots', 'healthAmulet', 'goldRing', 'vampRing', 'thornMail', 'warBanner', 'critGloves', 'regenCloak', 'phoenixFeather'];
                const bsIconTypes = { speedBoots: 'boot', healthAmulet: 'heart', goldRing: 'coin', vampRing: 'fang', warBanner: 'flag', thornMail: 'shield', critGloves: 'glove', regenCloak: 'heart', phoenixFeather: 'star' };
                for (const id of bsAccessories) {
                    const item = EquipmentData.accessories[id];
                    if (!item) continue;
                    const tier = EquipmentTiers[id] || 1;
                    const locked = tier > bLvl;
                    const owned = !locked && (pd.equipment.accessory?.name === item.name || pd.inventory.includes(id));
                    const equipped = !locked && pd.equipment.accessory?.name === item.name;
                    this.shopItems.push({ type: 'equip', id, item, category: 'accessory', owned, equipped, locked, unlockTier: tier, iconType: bsIconTypes[id] || 'star', y: cy });
                    if (!locked) {
                        this.shopButtons.push(new Button(cardX, cy, cardW, cardH, '', makeEquipAction('accessory', id, item),
                            { disabled: !owned && pd.gold < item.cost && !equipped, color: 'transparent', hoverColor: 'transparent' }));
                    }
                    cy += cardH + gap;
                }
                break;
            }
            case 'elder': {
                const bLvl = getBuildingLevel(pd, 'elder');
                const resCap = BuildingData.elder.researchCaps[bLvl - 1] || 1;
                addBuildingUpgradeCard('elder');
                if (!pd.towerResearch) pd.towerResearch = {};
                for (const [towerId, towerRes] of Object.entries(TowerResearchData)) {
                    // Tower type header
                    this.shopItems.push({ type: 'header', text: towerRes.name.toUpperCase(), color: TowerData[towerId]?.color || '#aaa', y: cy });
                    cy += 22;
                    if (!pd.towerResearch[towerId]) pd.towerResearch[towerId] = {};
                    for (const [resId, res] of Object.entries(towerRes.researches)) {
                        const level = getResearchLevel(pd, towerId, resId);
                        const maxed = level >= res.maxLevel || level >= resCap;
                        const atCap = level >= resCap && level < res.maxLevel;
                        const cost = maxed ? 0 : res.cost[level];
                        this.shopItems.push({
                            type: 'research', towerId, resId, res, level, maxed, atCap, cost,
                            towerColor: towerRes.color, y: cy, cap: resCap, maxLevel: res.maxLevel
                        });
                        this.shopButtons.push(new Button(cardX, cy, cardW, 52, '', () => {
                            if (!maxed && !atCap && pd.gold >= cost) {
                                pd.gold -= cost;
                                pd.towerResearch[towerId][resId] = level + 1;
                                this.game.saveGame();
                                this.refreshShopButtons();
                            }
                        }, { disabled: maxed || atCap || pd.gold < cost, color: 'transparent', hoverColor: 'transparent' }));
                        cy += 56;
                    }
                    cy += 6;
                }
                break;
            }
            case 'sage': {
                const bLvl = getBuildingLevel(pd, 'sage');
                const skillCap = BuildingData.sage.skillCaps[bLvl - 1] || 1;
                addBuildingUpgradeCard('sage');
                this.shopItems.push({ type: 'header', text: 'ACTIVE SKILLS', color: '#88aaff', y: cy });
                cy += 20;
                const skillIcons = { whirlwind: 'spin', warCry: 'horn', heal: 'cross', thunderStrike: 'bolt', shield: 'shield' };
                for (const [id, skill] of Object.entries(SkillData.active)) {
                    const level = pd.skills[id] || 0;
                    const maxed = level >= skillCap;
                    this.shopItems.push({ type: 'skill', id, skill, level, maxed, iconType: skillIcons[id] || 'star', y: cy, active: true, cap: skillCap });
                    this.shopButtons.push(new Button(cardX, cy, cardW, cardH, '', () => {
                        if (level < skillCap) {
                            SkillSystem.learnSkill(id, pd);
                            this.game.saveGame();
                            this.refreshShopButtons();
                        }
                    }, { disabled: level >= skillCap || !SkillSystem.canLearn(id, pd), color: 'transparent', hoverColor: 'transparent' }));
                    cy += cardH + gap;
                }
                cy += 8;
                this.shopItems.push({ type: 'header', text: 'PASSIVE SKILLS', color: '#88cc88', y: cy });
                cy += 20;
                const passiveIcons = { toughness: 'heart', critStrike: 'sword', swiftness: 'boot', goldFind: 'coin', commander: 'flag' };
                for (const [id, skill] of Object.entries(SkillData.passive)) {
                    const level = pd.skills[id] || 0;
                    const maxed = level >= skillCap;
                    this.shopItems.push({ type: 'skill', id, skill, level, maxed, iconType: passiveIcons[id] || 'star', y: cy, active: false, cap: skillCap });
                    this.shopButtons.push(new Button(cardX, cy, cardW, cardH, '', () => {
                        if (level < skillCap) {
                            SkillSystem.learnSkill(id, pd);
                            this.game.saveGame();
                            this.refreshShopButtons();
                        }
                    }, { disabled: level >= skillCap || !SkillSystem.canLearn(id, pd), color: 'transparent', hoverColor: 'transparent' }));
                    cy += cardH + gap;
                }
                break;
            }
            case 'merchant': {
                const bLvl = getBuildingLevel(pd, 'merchant');
                addBuildingUpgradeCard('merchant');

                // Only 5 exclusive powerful items
                const merchantStock = ['bloodstone', 'dragonHeart', 'warlordsMantle', 'celestialOrb', 'infinityBand'];
                const iconTypes = { bloodstone: 'fang', dragonHeart: 'heart', warlordsMantle: 'flag', celestialOrb: 'star', infinityBand: 'coin' };
                for (const id of merchantStock) {
                    const item = EquipmentData.accessories[id];
                    if (!item) continue;
                    const tier = EquipmentTiers[id] || 1;
                    const locked = tier > bLvl;
                    const owned = !locked && (pd.equipment.accessory?.name === item.name || pd.inventory.includes(id));
                    const equipped = !locked && pd.equipment.accessory?.name === item.name;
                    this.shopItems.push({ type: 'equip', id, item, category: 'accessory', owned, equipped, locked, unlockTier: tier, iconType: iconTypes[id] || 'star', y: cy });
                    if (!locked) {
                        this.shopButtons.push(new Button(cardX, cy, cardW, cardH, '', makeEquipAction('accessory', id, item),
                            { disabled: !owned && pd.gold < item.cost && !equipped, color: 'transparent', hoverColor: 'transparent' }));
                    }
                    cy += cardH + gap;
                }

                // --- MATERIAL TRADING ---
                cy += 8;
                this.shopItems.push({ type: 'header', text: 'TRADE MATERIALS', color: '#aabb88', y: cy });
                cy += 22;

                const matPrices = { wood: 5, stone: 8, iron: 15, crystal: 30, darkEssence: 60 };
                const sellRatio = 0.5;
                const packs = [1, 10, 100];

                if (!pd.materials) pd.materials = {};
                for (const [matId, matInfo] of Object.entries(Materials)) {
                    const owned = pd.materials[matId] || 0;
                    const unitBuy = matPrices[matId];
                    const unitSell = Math.floor(unitBuy * sellRatio);
                    this.shopItems.push({ type: 'matTrade', matId, matInfo, owned, unitBuy, unitSell, y: cy });

                    // Buy x1, x10, x100
                    for (let pi = 0; pi < 3; pi++) {
                        const qty = packs[pi];
                        const totalCost = unitBuy * qty;
                        const bx = cardX + cardW - 280 + pi * 46;
                        this.shopButtons.push(new Button(bx, cy + 4, 42, 24, '', () => {
                            if (pd.gold >= totalCost) {
                                pd.gold -= totalCost;
                                pd.materials[matId] = (pd.materials[matId] || 0) + qty;
                                this.game.saveGame();
                                this.refreshShopButtons();
                            }
                        }, { disabled: pd.gold < totalCost, color: 'transparent', hoverColor: 'transparent' }));
                    }

                    // Sell x1, x10, x100
                    for (let pi = 0; pi < 3; pi++) {
                        const qty = packs[pi];
                        const totalGain = unitSell * qty;
                        const sx = cardX + cardW - 280 + pi * 46;
                        this.shopButtons.push(new Button(sx, cy + 30, 42, 24, '', () => {
                            const cur = pd.materials[matId] || 0;
                            if (cur >= qty) {
                                pd.gold += totalGain;
                                pd.materials[matId] = cur - qty;
                                this.game.saveGame();
                                this.refreshShopButtons();
                            }
                        }, { disabled: owned < qty, color: 'transparent', hoverColor: 'transparent' }));
                    }

                    cy += 58;
                }
                break;
            }
            case 'beastmaster': {
                // Ensure pets data
                if (!pd.pets) pd.pets = { unlocked: {}, levels: {}, active: null };
                const bLvlBm = getBuildingLevel(pd, 'beastmaster');
                addBuildingUpgradeCard('beastmaster');

                for (const [petId, pet] of Object.entries(PetData)) {
                    const petTier = PetTiers[petId] || 1;
                    const petLocked = petTier > bLvlBm;
                    const unlocked = !petLocked && (pd.pets.unlocked[petId] || false);
                    const level = pd.pets.levels[petId] || 1;
                    const isActive = pd.pets.active === petId;
                    const maxLevel = 5;
                    const maxed = unlocked && level >= maxLevel;
                    const upgradeCost = unlocked && !maxed ? pet.upgradeCosts[level] : 0;

                    this.shopItems.push({
                        type: 'pet',
                        petId, pet, unlocked, level, isActive, maxed, upgradeCost,
                        locked: petLocked, unlockTier: petTier,
                        y: cy
                    });

                    if (petLocked) { cy += 76; continue; }

                    // Button for unlock/upgrade/select
                    this.shopButtons.push(new Button(cardX, cy, cardW, 72, '', () => {
                        if (!unlocked) {
                            // Unlock
                            if (pd.gold >= pet.unlockCost) {
                                pd.gold -= pet.unlockCost;
                                pd.pets.unlocked[petId] = true;
                                pd.pets.levels[petId] = 1;
                                pd.pets.active = petId;
                                this._refreshVillagePet();
                                this.game.saveGame();
                                this.refreshShopButtons();
                            }
                        } else if (isActive) {
                            // Upgrade if not maxed
                            if (!maxed && pd.gold >= upgradeCost) {
                                pd.gold -= upgradeCost;
                                pd.pets.levels[petId] = level + 1;
                                this._refreshVillagePet();
                                this.game.saveGame();
                                this.refreshShopButtons();
                            }
                        } else {
                            // Select this pet
                            pd.pets.active = petId;
                            this._refreshVillagePet();
                            this.game.saveGame();
                            this.refreshShopButtons();
                        }
                    }, { color: 'transparent', hoverColor: 'transparent' }));

                    cy += 76;
                }

                // Unequip button
                if (pd.pets.active) {
                    this.shopItems.push({ type: 'header', text: '', color: '#666', y: cy });
                    cy += 5;
                    this.shopButtons.push(new Button(cardX, cy, cardW, 30, '', () => {
                        pd.pets.active = null;
                        this._refreshVillagePet();
                        this.game.saveGame();
                        this.refreshShopButtons();
                    }, { color: 'transparent', hoverColor: 'transparent' }));
                    this.shopItems.push({ type: 'petUnequip', y: cy });
                    cy += 34;
                }
                break;
            }
            case 'inventory': {
                // --- GEAR LEVELS ---
                if (!pd.gear) pd.gear = { sword: 0, helmet: 0, chestplate: 0, leggings: 0, boots: 0 };
                this.shopItems.push({ type: 'header', text: 'GEAR', color: '#ffd700', y: cy });
                cy += 20;
                for (const [gearId, gear] of Object.entries(GearData)) {
                    const level = pd.gear[gearId] || 0;
                    if (level <= 0) continue;
                    this.shopItems.push({ type: 'invGear', gearId, gear, level, y: cy });
                    cy += 32;
                }

                // --- ACCESSORY ---
                cy += 4;
                this.shopItems.push({ type: 'header', text: 'ACCESSORY', color: '#aa88cc', y: cy });
                cy += 20;
                {
                    const equip = pd.equipment.accessory;
                    this.shopItems.push({
                        type: 'invSlot', slot: 'accessory', equip, label: 'Accessory',
                        iconType: 'star', slotColor: '#aa88cc', y: cy
                    });
                    if (equip) {
                        this.shopButtons.push(new Button(cardX, cy, cardW, cardH, '', () => {
                            pd.equipment.accessory = null;
                            this.hero.recalcStats();
                            this.hero.hp = Math.min(this.hero.hp, this.hero.maxHp);
                            this.game.saveGame();
                            this.refreshShopButtons();
                        }, { color: 'transparent', hoverColor: 'transparent' }));
                    }
                    cy += cardH + gap;
                }

                // --- HERO STATS ---
                cy += 4;
                this.shopItems.push({ type: 'header', text: 'HERO STATS', color: '#88ccff', y: cy });
                cy += 20;
                this.shopItems.push({ type: 'invStats', y: cy });
                cy += 140;

                // --- OWNED ITEMS (accessories only now) ---
                const ownedItems = (pd.inventory || []).filter(id => {
                    const eq = pd.equipment.accessory;
                    if (eq && EquipmentData.accessories[id] && EquipmentData.accessories[id].name === eq.name) return false;
                    return !!EquipmentData.accessories[id];
                });
                if (ownedItems.length > 0) {
                    this.shopItems.push({ type: 'header', text: 'OWNED ACCESSORIES', color: '#ccccee', y: cy });
                    cy += 20;
                    for (const id of ownedItems) {
                        const itemData = EquipmentData.accessories[id];
                        if (!itemData) continue;
                        this.shopItems.push({
                            type: 'invItem', id, item: itemData, category: 'accessory', iconType: 'star', y: cy
                        });
                        this.shopButtons.push(new Button(cardX, cy, cardW, cardH, '', () => {
                            pd.equipment.accessory = { ...itemData };
                            this.hero.recalcStats();
                            this.hero.hp = Math.min(this.hero.hp, this.hero.maxHp);
                            this.game.saveGame();
                            this.refreshShopButtons();
                        }, { color: 'transparent', hoverColor: 'transparent' }));
                        cy += cardH + gap;
                    }
                }

                // --- SKILLS ---
                const learnedSkills = Object.entries(pd.skills || {}).filter(([, lvl]) => lvl > 0);
                if (learnedSkills.length > 0) {
                    cy += 4;
                    this.shopItems.push({ type: 'header', text: 'SKILLS', color: '#88aaff', y: cy });
                    cy += 20;
                    for (const [id, level] of learnedSkills) {
                        const skill = SkillData.active[id] || SkillData.passive[id];
                        if (!skill) continue;
                        const isActive = !!SkillData.active[id];
                        this.shopItems.push({ type: 'invSkill', id, skill, level, isActive, y: cy });
                        cy += 32;
                    }
                }

                // --- MATERIALS ---
                const matEntries = Object.entries(pd.materials || {}).filter(([, v]) => v > 0);
                if (matEntries.length > 0) {
                    cy += 4;
                    this.shopItems.push({ type: 'header', text: 'MATERIALS', color: '#aabb88', y: cy });
                    cy += 20;
                    this.shopItems.push({ type: 'invMaterials', y: cy });
                    cy += 46;
                }

                // --- PET ---
                if (pd.pets && pd.pets.active) {
                    cy += 4;
                    this.shopItems.push({ type: 'header', text: 'COMPANION', color: '#88ff88', y: cy });
                    cy += 20;
                    const petId = pd.pets.active;
                    const petInfo = PetData[petId];
                    if (petInfo) {
                        const petLevel = pd.pets.levels[petId] || 1;
                        this.shopItems.push({ type: 'invPet', petId, pet: petInfo, level: petLevel, y: cy });
                        cy += 52;
                    }
                }
                break;
            }
            case 'questboard': {
                // Ensure quests data exists
                if (!pd.quests) pd.quests = { lastReset: 0, progress: {}, completed: {} };
                const now = Date.now();
                if (now - pd.quests.lastReset >= QUEST_RESET_INTERVAL) {
                    pd.quests.lastReset = now;
                    pd.quests.progress = {};
                    pd.quests.completed = {};
                    this.game.saveGame();
                }
                // Migrate old boolean completed to 'claimed'
                for (const key of Object.keys(pd.quests.completed)) {
                    if (pd.quests.completed[key] === true) pd.quests.completed[key] = 'claimed';
                }

                for (const quest of QuestData) {
                    const progress = pd.quests.progress[quest.id] || 0;
                    const status = pd.quests.completed[quest.id] || false;
                    // status: false = in progress, 'fulfilled' = ready to claim, 'claimed' = done
                    this.shopItems.push({
                        type: 'quest',
                        quest,
                        progress: Math.min(progress, quest.target),
                        fulfilled: status === 'fulfilled',
                        claimed: status === 'claimed',
                        y: cy
                    });
                    if (status === 'fulfilled') {
                        this.shopButtons.push(new Button(cardX, cy, cardW, 56, '', () => {
                            pd.gold += quest.rewards.gold;
                            pd.quests.completed[quest.id] = 'claimed';
                            // Apply XP and check level-up
                            const startLevel = pd.level;
                            pd.xp += quest.rewards.xp;
                            const maxLvl = BalanceConfig.MAX_LEVEL || 30;
                            let needed = Math.floor(BalanceConfig.XP_LEVEL_BASE * Math.pow(BalanceConfig.XP_LEVEL_MULT, pd.level - 1));
                            while (pd.xp >= needed && pd.level < maxLvl) {
                                pd.xp -= needed;
                                pd.level++;
                                pd.skillPoints += BalanceConfig.SKILL_POINTS_PER_LEVEL;
                                needed = Math.floor(BalanceConfig.XP_LEVEL_BASE * Math.pow(BalanceConfig.XP_LEVEL_MULT, pd.level - 1));
                            }
                            if (pd.level >= maxLvl) pd.xp = 0;
                            const levelsGained = pd.level - startLevel;
                            if (levelsGained > 0) {
                                this._levelUpAnim = { timer: 3.0, maxTimer: 3.0, level: pd.level, levels: levelsGained };
                                Audio.playVictory();
                            }
                            this.game.saveGame();
                            this.refreshShopButtons();
                            this._updateNpcIndicators();
                        }, { color: 'transparent', hoverColor: 'transparent' }));
                    }
                    cy += 56 + gap;
                }
                break;
            }
        }

        // Calculate max scroll based on content height
        const PH = CANVAS_HEIGHT - 80;
        const contentBottom = cy;
        const visibleBottom = PY + PH - 10;
        this.maxScroll = Math.max(0, contentBottom - visibleBottom);
    }

    render(renderer) {
        const bg = renderer.bg;
        const ctx = renderer.entity;
        const ui = renderer.ui;

        this._matZones = [];

        if (!this.bgDrawn) {
            this.drawVillageBackground(bg);
            this.bgDrawn = true;
        }

        // Y-sort NPCs and hero
        const renderables = [];
        for (const npc of this.npcs) {
            renderables.push({
                sortY: npc.type === 'portal' ? -100 : npc.y,
                render: () => npc.render(ctx, 0, 0, npc === this.hoveredNPC)
            });
        }
        renderables.push({
            sortY: this.hero.y,
            render: () => this.hero.render(ctx)
        });
        if (this.villagePet) {
            renderables.push({
                sortY: this.villagePet.y,
                render: () => this.villagePet.render(ctx)
            });
        }
        renderables.sort((a, b) => a.sortY - b.sortY);
        for (const r of renderables) r.render();

        // Top bar with gradient
        const pd = this.game.playerData;
        const barGrad = ui.createLinearGradient(0, 0, 0, 48);
        barGrad.addColorStop(0, 'rgba(0,0,0,0.85)');
        barGrad.addColorStop(1, 'rgba(0,0,0,0.65)');
        ui.fillStyle = barGrad;
        ui.fillRect(0, 0, CANVAS_WIDTH, 48);
        // Bottom line
        ui.fillStyle = 'rgba(255,215,0,0.2)';
        ui.fillRect(0, 47, CANVAS_WIDTH, 1);

        // Gold with icon
        UIRenderer.drawGoldIcon(ui, 14, 14, 16);
        SpriteRenderer.drawText(ui, `${pd.gold}`, 38, 12, COLORS.UI_GOLD, 20);

        // Separator
        ui.fillStyle = 'rgba(255,255,255,0.06)';
        ui.fillRect(118, 8, 1, 30);

        // Level
        SpriteRenderer.drawText(ui, `Lv.${pd.level}`, 130, 12, '#ddd', 20);

        // Separator
        ui.fillStyle = 'rgba(255,255,255,0.06)';
        ui.fillRect(216, 8, 1, 30);

        // Skill Points
        SpriteRenderer.drawText(ui, `SP: ${pd.skillPoints}`, 228, 12, COLORS.UI_BLUE, 18);

        // Separator
        ui.fillStyle = 'rgba(255,255,255,0.06)';
        ui.fillRect(316, 8, 1, 30);

        // XP bar
        const maxLvl = BalanceConfig.MAX_LEVEL || 30;
        const isMaxLevel = pd.level >= maxLvl;
        const xpW = 110;
        const xpX = 340, xpY = 12, xpH = 18;
        // Label
        SpriteRenderer.drawTextNoOutline(ui, 'XP', xpX - 16, xpY + 2, '#8877aa', 12);
        if (isMaxLevel) {
            const maxGrad = ui.createLinearGradient(xpX, xpY, xpX + xpW, xpY);
            maxGrad.addColorStop(0, '#cc8800');
            maxGrad.addColorStop(0.5, '#ffaa22');
            maxGrad.addColorStop(1, '#cc8800');
            ui.fillStyle = '#111';
            SpriteRenderer._rr(ui, xpX, xpY, xpW, xpH, 6);
            ui.fill();
            ui.save();
            SpriteRenderer._rr(ui, xpX, xpY, xpW, xpH, 6);
            ui.clip();
            ui.fillStyle = maxGrad;
            ui.fillRect(xpX, xpY, xpW, xpH);
            ui.fillStyle = 'rgba(255,255,255,0.15)';
            ui.fillRect(xpX, xpY, xpW, xpH / 2);
            ui.restore();
            ui.strokeStyle = 'rgba(255,215,0,0.4)';
            ui.lineWidth = 1;
            SpriteRenderer._rr(ui, xpX, xpY, xpW, xpH, 6);
            ui.stroke();
            SpriteRenderer.drawTextNoOutline(ui, 'MAX LEVEL', xpX + xpW / 2, xpY + 3, '#fff', 11, 'center');
        } else {
            const xpNeeded = Math.floor(BalanceConfig.XP_LEVEL_BASE * Math.pow(BalanceConfig.XP_LEVEL_MULT, pd.level - 1));
            const xpPct = Math.min(1, pd.xp / xpNeeded);
            ui.fillStyle = '#0a0a12';
            SpriteRenderer._rr(ui, xpX, xpY, xpW, xpH, 6);
            ui.fill();
            if (xpPct > 0) {
                ui.save();
                SpriteRenderer._rr(ui, xpX, xpY, xpW, xpH, 6);
                ui.clip();
                const xpGrad = ui.createLinearGradient(xpX, xpY, xpX + xpW * xpPct, xpY);
                xpGrad.addColorStop(0, '#5533aa');
                xpGrad.addColorStop(1, '#7755cc');
                ui.fillStyle = xpGrad;
                ui.fillRect(xpX, xpY, xpW * xpPct, xpH);
                ui.fillStyle = 'rgba(255,255,255,0.15)';
                ui.fillRect(xpX, xpY, xpW * xpPct, xpH / 2);
                ui.restore();
            }
            ui.strokeStyle = 'rgba(255,255,255,0.12)';
            ui.lineWidth = 1;
            SpriteRenderer._rr(ui, xpX, xpY, xpW, xpH, 6);
            ui.stroke();
            SpriteRenderer.drawTextNoOutline(ui, `${pd.xp} / ${xpNeeded}`, xpX + xpW / 2, xpY + 3, '#ccbbdd', 11, 'center');
        }

        // Materials display (compact with icons)
        const mats = pd.materials || {};
        const matList = [
            { id: 'wood', color: '#8B5A2B', name: 'Wood' },
            { id: 'stone', color: '#888', name: 'Stone' },
            { id: 'iron', color: '#aabbcc', name: 'Iron' },
            { id: 'crystal', color: '#aa66ff', name: 'Crystal' },
            { id: 'darkEssence', color: '#662288', name: 'Essence' }
        ];
        // Separator before materials
        ui.fillStyle = 'rgba(255,255,255,0.06)';
        ui.fillRect(466, 8, 1, 30);

        // Count visible mats to center them in the remaining space (470..850)
        const matZoneStart = 480;
        const matZoneEnd = CANVAS_WIDTH - 110; // leave room for VILLAGE title
        const visibleMats = matList.filter(m => (mats[m.id] || 0) > 0);
        const matSlotW = 54;
        const totalMatsW = visibleMats.length * matSlotW;
        let matX = Math.round(matZoneStart + (matZoneEnd - matZoneStart) / 2 - totalMatsW / 2);
        if (matX < matZoneStart) matX = matZoneStart;

        for (const m of matList) {
            const amount = mats[m.id] || 0;
            if (amount > 0) {
                SpriteRenderer.drawMaterialIcon(ui, m.id, matX, 22, 10);
                SpriteRenderer.drawTextNoOutline(ui, `${amount}`, matX + 16, 16, m.color, 14);
                this._matZones.push({ x: matX - 10, y: 10, w: 52, h: 26, id: m.id, name: m.name, color: m.color, amount });
                matX += matSlotW;
            }
        }

        // Title
        SpriteRenderer.drawText(ui, 'VILLAGE', CANVAS_WIDTH - 60, 12, '#ffd700', 18, 'center');

        // Top bar hover zones for stat tooltips
        const xpNeededTip = isMaxLevel ? 0 : Math.floor(BalanceConfig.XP_LEVEL_BASE * Math.pow(BalanceConfig.XP_LEVEL_MULT, pd.level - 1));
        this._topBarZones = [
            { x: 8, y: 6, w: 104, h: 30, name: 'Gold', color: COLORS.UI_GOLD },
            { x: 124, y: 6, w: 86, h: 30, name: 'Level', color: '#ddd', extra: `Level ${pd.level}` },
            { x: 222, y: 6, w: 88, h: 30, name: 'Skill Points', color: COLORS.UI_BLUE, extra: `${pd.skillPoints} points available` },
            { x: xpX - 20, y: xpY - 6, w: xpW + 28, h: xpH + 12, name: 'Experience', color: '#7755cc',
                extra: isMaxLevel ? 'Max level reached' : `${pd.xp} / ${xpNeededTip}` },
        ];

        // Keyboard hints (bottom bar)
        if (!this.activeShop) {
            SpriteRenderer.drawTextNoOutline(ui, '[B] Blacksmith  [E] Elder  [S] Sage  [M] Merchant  [F] Pets  [Q] Quests  [I] Inventory  [P] Portal', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 16, '#666', 10, 'center');
        }

        // Shop panel
        if (this.activeShop) {
            this.renderShopPanel(ui);
        }

        // NPC interact menu (Talk / Trade)
        if (this.interactMenu) {
            this._renderInteractMenu(ui);
        }

        // Dialogue box
        if (this.dialogueBox) {
            this._renderDialogueBox(ui);
        }

        // Tooltip (materials + top bar stats)
        if (this._matTooltip) {
            const t = this._matTooltip;
            const lines = [
                { text: t.name, color: t.color, size: 13 }
            ];
            if (t.needed != null) {
                const has = t.amount || 0;
                const enough = has >= t.needed;
                lines.push({ text: `Owned: ${has}`, color: enough ? '#aaa' : '#cc6644', size: 11 });
                lines.push({ text: `Needed: ${t.needed}`, color: '#999', size: 11 });
            } else if (t.amount != null) {
                lines.push({ text: `Owned: ${t.amount}`, color: '#aaa', size: 11 });
            }
            if (t.extra) {
                lines.push({ text: t.extra, color: '#aaa', size: 11 });
            }
            UIRenderer.drawTooltip(ui, this._mouseX + 12, this._mouseY + 20, lines);
        }

        // Level-up animation overlay
        if (this._levelUpAnim) {
            this._renderLevelUpAnim(ui);
        }
    }

    _renderLevelUpAnim(ctx) {
        const a = this._levelUpAnim;
        const progress = 1 - a.timer / a.maxTimer;
        const cx = CANVAS_WIDTH / 2;
        const cy = CANVAS_HEIGHT / 2;

        // Fade in/out
        let alpha;
        if (progress < 0.15) {
            alpha = progress / 0.15;
        } else if (progress > 0.75) {
            alpha = (1 - progress) / 0.25;
        } else {
            alpha = 1;
        }

        // Dim background
        ctx.fillStyle = `rgba(0,0,0,${0.5 * alpha})`;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Golden glow
        const glowRadius = 100 + progress * 60;
        const glow = ctx.createRadialGradient(cx, cy, 10, cx, cy, glowRadius);
        glow.addColorStop(0, `rgba(255,215,0,${0.25 * alpha})`);
        glow.addColorStop(0.5, `rgba(255,180,0,${0.1 * alpha})`);
        glow.addColorStop(1, 'rgba(255,215,0,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(cx - glowRadius, cy - glowRadius, glowRadius * 2, glowRadius * 2);

        // Rising particles
        const numParticles = 12;
        for (let i = 0; i < numParticles; i++) {
            const angle = (i / numParticles) * Math.PI * 2 + progress * 3;
            const dist = 30 + Math.sin(progress * 6 + i) * 20 + progress * 50;
            const px = cx + Math.cos(angle) * dist;
            const py = cy + Math.sin(angle) * dist - progress * 40;
            const pAlpha = alpha * (0.5 + Math.sin(i + progress * 8) * 0.3);
            ctx.fillStyle = `rgba(255,215,0,${pAlpha})`;
            ctx.beginPath();
            ctx.arc(px, py, 3 + Math.sin(i * 2 + progress * 4) * 1.5, 0, Math.PI * 2);
            ctx.fill();
        }

        // Scale bounce for text
        const textScale = progress < 0.2 ? 0.5 + (progress / 0.2) * 0.7 : 1 + Math.sin(progress * 8) * 0.03;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(textScale, textScale);
        ctx.translate(-cx, -cy);

        // "LEVEL UP!" text
        ctx.globalAlpha = alpha;
        SpriteRenderer.drawText(ctx, 'LEVEL UP!', cx, cy - 20, '#ffd700', 36, 'center');

        const lvlText = a.levels > 1
            ? `Lv.${a.level - a.levels + 1} → Lv.${a.level}`
            : `Now Lv.${a.level}`;
        SpriteRenderer.drawText(ctx, lvlText, cx, cy + 20, '#fff', 20, 'center');

        ctx.globalAlpha = 1;
        ctx.restore();
    }

    _renderInteractMenu(ctx) {
        const { npc, x, y } = this.interactMenu;
        const w = 120;
        const btnH = 32;
        const nameH = 24;
        const pad = 8;
        const gap = 6;
        const totalH = pad + nameH + gap + btnH * 2 + gap + pad;
        const mx = x - w / 2;
        const my = y - totalH - 5;
        const r = 10;

        // Background panel
        const bgGrad = ctx.createLinearGradient(mx, my, mx, my + totalH);
        bgGrad.addColorStop(0, 'rgba(18,18,34,0.95)');
        bgGrad.addColorStop(1, 'rgba(10,10,22,0.95)');
        ctx.fillStyle = bgGrad;
        SpriteRenderer._rr(ctx, mx, my, w, totalH, r);
        ctx.fill();

        // Inner highlight
        ctx.save();
        SpriteRenderer._rr(ctx, mx, my, w, totalH, r);
        ctx.clip();
        ctx.fillStyle = 'rgba(255,255,255,0.04)';
        ctx.fillRect(mx, my, w, totalH * 0.35);
        ctx.restore();

        // Border
        ctx.strokeStyle = 'rgba(255,215,0,0.35)';
        ctx.lineWidth = 1;
        SpriteRenderer._rr(ctx, mx, my, w, totalH, r);
        ctx.stroke();

        // Small arrow pointing down to NPC
        ctx.fillStyle = 'rgba(18,18,34,0.95)';
        ctx.beginPath();
        ctx.moveTo(x - 6, my + totalH - 1);
        ctx.lineTo(x, my + totalH + 6);
        ctx.lineTo(x + 6, my + totalH - 1);
        ctx.closePath();
        ctx.fill();

        // NPC name (centered in header area)
        const nameY = my + pad + 2;
        SpriteRenderer.drawText(ctx, npc.name, x, nameY, '#ffd700', 13, 'center');

        // Separator line
        const sepY = my + pad + nameH;
        const sepGrad = ctx.createLinearGradient(mx + 10, sepY, mx + w - 10, sepY);
        sepGrad.addColorStop(0, 'rgba(255,215,0,0)');
        sepGrad.addColorStop(0.3, 'rgba(255,215,0,0.2)');
        sepGrad.addColorStop(0.7, 'rgba(255,215,0,0.2)');
        sepGrad.addColorStop(1, 'rgba(255,215,0,0)');
        ctx.fillStyle = sepGrad;
        ctx.fillRect(mx + 10, sepY, w - 20, 1);

        // Buttons
        const labels = ['Talk', this._getTradeLabel(npc.type)];
        const icons = ['💬', '🛒'];
        const btnX = mx + pad;
        const btnW = w - pad * 2;

        for (let i = 0; i < 2; i++) {
            const by = sepY + gap + i * (btnH + gap);
            const hovered = this.interactHovered === i;

            const btnGrad = ctx.createLinearGradient(btnX, by, btnX, by + btnH);
            if (hovered) {
                btnGrad.addColorStop(0, '#3e3e5c');
                btnGrad.addColorStop(1, '#30304a');
            } else {
                btnGrad.addColorStop(0, '#282840');
                btnGrad.addColorStop(1, '#222238');
            }
            ctx.fillStyle = btnGrad;
            SpriteRenderer._rr(ctx, btnX, by, btnW, btnH, 6);
            ctx.fill();

            if (hovered) {
                ctx.strokeStyle = 'rgba(255,215,0,0.3)';
                ctx.lineWidth = 1;
                SpriteRenderer._rr(ctx, btnX, by, btnW, btnH, 6);
                ctx.stroke();
            }

            SpriteRenderer.drawText(ctx, labels[i], x, by + 8, hovered ? '#fff' : '#bbb', 14, 'center');
        }
    }

    _renderResearchCard(ctx, x, y, w, h, data, pd) {
        const { res, level, maxed, atCap, cost, towerColor, cap, maxLevel } = data;
        const canAfford = pd.gold >= cost;
        const hovered = this.shopButtons.some(b => b.hovered && b.y === data.y);
        const r = 8;

        // Card background
        const bgGrad = ctx.createLinearGradient(x, y, x, y + h);
        if (maxed && !atCap) {
            bgGrad.addColorStop(0, '#1e3520');
            bgGrad.addColorStop(1, '#162818');
        } else if (hovered && !atCap) {
            bgGrad.addColorStop(0, '#2e2e42');
            bgGrad.addColorStop(1, '#222238');
        } else {
            bgGrad.addColorStop(0, '#1e1e2c');
            bgGrad.addColorStop(1, '#16161f');
        }
        ctx.fillStyle = bgGrad;
        SpriteRenderer._rr(ctx, x, y, w, h, r);
        ctx.fill();

        ctx.strokeStyle = maxed && !atCap ? 'rgba(80,160,80,0.5)' : 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 1;
        SpriteRenderer._rr(ctx, x, y, w, h, r);
        ctx.stroke();

        // Color accent bar
        ctx.fillStyle = towerColor;
        ctx.globalAlpha = 0.3;
        SpriteRenderer._rr(ctx, x, y, 4, h, r);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Name + description
        SpriteRenderer.drawText(ctx, res.name, x + 14, y + 5, maxed && !atCap ? '#88dd88' : '#ddd', 16);
        SpriteRenderer.drawTextNoOutline(ctx, res.description, x + 14, y + 24, '#777', 12);

        // Level pips
        const pipX = x + 14;
        const pipY = y + 38;
        for (let i = 0; i < maxLevel; i++) {
            const filled = i < level;
            const capped = i >= cap; // beyond current building cap
            ctx.fillStyle = filled ? towerColor : (capped ? '#0c0c12' : '#1e1e2a');
            ctx.beginPath();
            ctx.arc(pipX + i * 14, pipY, 4.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = filled ? 'rgba(255,255,255,0.2)' : (capped ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.06)');
            ctx.lineWidth = 1;
            ctx.stroke();
        }
        // Cap indicator
        if (cap < maxLevel) {
            SpriteRenderer.drawTextNoOutline(ctx, `cap: ${cap}`, pipX + maxLevel * 14 + 6, pipY - 4, '#555', 8);
        }

        // Right side: price, MAX, or cap message
        if (maxed && !atCap) {
            const bx = x + w - 56, by = y + (h - 22) / 2;
            ctx.fillStyle = 'rgba(80,160,80,0.15)';
            SpriteRenderer._rr(ctx, bx, by, 48, 22, 6);
            ctx.fill();
            SpriteRenderer.drawTextNoOutline(ctx, 'MAX', bx + 24, by + 5, '#6c6', 10, 'center');
        } else if (atCap) {
            SpriteRenderer.drawTextNoOutline(ctx, 'Upgrade', x + w - 70, y + h / 2 - 10, '#886', 9);
            SpriteRenderer.drawTextNoOutline(ctx, 'building', x + w - 68, y + h / 2 + 2, '#886', 9);
        } else {
            UIRenderer.drawGoldIcon(ctx, x + w - 75, y + (h - 14) / 2, 9);
            SpriteRenderer.drawText(ctx, `${cost}`, x + w - 60, y + (h - 16) / 2, canAfford ? COLORS.UI_GOLD : '#553', 13);
        }
    }

    _renderGearCard(ctx, x, y, w, h, data, pd) {
        const { gear, gearId, level, maxed, atMax, cost, matCost, cap } = data;
        const canAfford = pd.gold >= cost && Object.entries(matCost || {}).every(([m, q]) => (pd.materials[m] || 0) >= q);
        const hovered = this.shopButtons.some(b => b.hovered && b.y === data.y);
        const r = 8;
        const maxLevel = 10;

        // Card bg
        const bgGrad = ctx.createLinearGradient(x, y, x, y + h);
        if (atMax) {
            bgGrad.addColorStop(0, '#1e3520');
            bgGrad.addColorStop(1, '#162818');
        } else if (hovered && !maxed) {
            bgGrad.addColorStop(0, '#2e2e42');
            bgGrad.addColorStop(1, '#222238');
        } else {
            bgGrad.addColorStop(0, '#1e1e2c');
            bgGrad.addColorStop(1, '#16161f');
        }
        ctx.fillStyle = bgGrad;
        SpriteRenderer._rr(ctx, x, y, w, h, r);
        ctx.fill();

        // Inner top highlight
        ctx.save();
        SpriteRenderer._rr(ctx, x, y, w, h, r);
        ctx.clip();
        ctx.fillStyle = 'rgba(255,255,255,0.04)';
        ctx.fillRect(x, y, w, h / 2);
        ctx.restore();

        // Color accent bar
        ctx.fillStyle = gear.color;
        ctx.globalAlpha = 0.25;
        SpriteRenderer._rr(ctx, x, y, 4, h, r);
        ctx.fill();
        ctx.globalAlpha = 1;

        ctx.strokeStyle = atMax ? 'rgba(80,160,80,0.5)' : maxed ? 'rgba(80,80,40,0.3)' : 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 1;
        SpriteRenderer._rr(ctx, x, y, w, h, r);
        ctx.stroke();

        // Icon box
        const iconS = 42;
        const ix = x + 10;
        const iy = y + (h - iconS) / 2;
        ctx.fillStyle = '#0c0c16';
        SpriteRenderer._rr(ctx, ix, iy, iconS, iconS, 6);
        ctx.fill();
        this._drawItemIcon(ctx, ix + iconS / 2, iy + iconS / 2, gear.icon, iconS * 0.35, level > 0);

        // Name + level
        SpriteRenderer.drawText(ctx, gear.name, ix + iconS + 14, y + 3, atMax ? '#88dd88' : gear.color, 17);
        ctx.font = `800 17px 'Nunito', 'Segoe UI', sans-serif`;
        const nameW = ctx.measureText(gear.name).width + 16;
        SpriteRenderer.drawText(ctx, `Lv.${level}`, ix + iconS + 14 + nameW, y + 4, '#ffd700', 14);

        // Current bonus
        const currentDesc = level > 0 ? gear.description(level) : 'Not upgraded';
        SpriteRenderer.drawTextNoOutline(ctx, currentDesc, ix + iconS + 14, y + 25, level > 0 ? '#999' : '#555', 12);

        // Next level preview
        if (!atMax) {
            const nextDesc = gear.description(level + 1);
            const locked = maxed && !atMax;
            SpriteRenderer.drawTextNoOutline(ctx, `Next: ${nextDesc}`, ix + iconS + 14, y + 42, locked ? '#554' : '#777', 11);
        }

        // Progress bar (level pips)
        const barX = ix + iconS + 12;
        const barY = y + 52;
        const pipW = (w - iconS - 140) / maxLevel;
        for (let i = 0; i < maxLevel; i++) {
            const px = barX + i * pipW;
            const pw = pipW - 2;
            const filled = i < level;
            const capped = i >= cap;
            ctx.fillStyle = filled ? gear.color : capped ? '#0a0a0e' : '#1a1a22';
            SpriteRenderer._rr(ctx, px, barY, pw, 6, 2);
            ctx.fill();
            if (filled) {
                ctx.fillStyle = 'rgba(255,255,255,0.15)';
                SpriteRenderer._rr(ctx, px, barY, pw, 3, 2);
                ctx.fill();
            }
        }

        // Right side: price, MAX, or locked
        if (atMax) {
            const bx = x + w - 66, by = y + (h - 24) / 2;
            ctx.fillStyle = 'rgba(80,160,80,0.15)';
            SpriteRenderer._rr(ctx, bx, by, 56, 24, 6);
            ctx.fill();
            ctx.strokeStyle = 'rgba(80,160,80,0.3)';
            ctx.lineWidth = 1;
            SpriteRenderer._rr(ctx, bx, by, 56, 24, 6);
            ctx.stroke();
            SpriteRenderer.drawTextNoOutline(ctx, 'MAX', x + w - 38, by + 6, '#6c6', 10, 'center');
        } else if (maxed) {
            const bx = x + w - 110, by = y + (h - 20) / 2;
            ctx.fillStyle = 'rgba(255,255,255,0.03)';
            SpriteRenderer._rr(ctx, bx, by, 100, 20, 6);
            ctx.fill();
            SpriteRenderer.drawTextNoOutline(ctx, `Upgrade building`, bx + 50, by + 4, '#665', 10, 'center');
        } else {
            // Gold cost
            UIRenderer.drawGoldIcon(ctx, x + w - 80, y + 6, 10);
            SpriteRenderer.drawText(ctx, `${cost}`, x + w - 65, y + 4, canAfford ? COLORS.UI_GOLD : '#553', 14);

            // Material costs
            const matEntries = Object.entries(matCost);
            let mx = x + w - 80;
            const my = y + 24;
            for (const [matId, qty] of matEntries) {
                const has = (pd.materials[matId] || 0) >= qty;
                SpriteRenderer.drawMaterialIcon(ctx, matId, mx + 5, my + 5, 5);
                SpriteRenderer.drawTextNoOutline(ctx, `${qty}`, mx + 13, my + 2, has ? '#aaa' : '#833', 9);
                mx += 28;
            }
        }
    }

    _renderBuildingUpgradeCard(ctx, x, y, w, h, data, pd) {
        const { buildingId, bLvl, nextData, check } = data;
        const hovered = this.shopButtons.some(b => b.hovered && b.y === data.y);
        const r = 8;

        // Card background with gradient
        const bgGrad = ctx.createLinearGradient(x, y, x, y + h);
        if (check.can && hovered) {
            bgGrad.addColorStop(0, '#2e2e22');
            bgGrad.addColorStop(1, '#222218');
        } else {
            bgGrad.addColorStop(0, '#1e1e28');
            bgGrad.addColorStop(1, '#16161e');
        }
        ctx.fillStyle = bgGrad;
        SpriteRenderer._rr(ctx, x, y, w, h, r);
        ctx.fill();

        // Inner top highlight
        ctx.save();
        SpriteRenderer._rr(ctx, x, y, w, h, r);
        ctx.clip();
        ctx.fillStyle = 'rgba(255,255,255,0.04)';
        ctx.fillRect(x, y, w, h / 2);
        ctx.restore();

        // Gold accent bar
        ctx.fillStyle = '#ffd700';
        ctx.globalAlpha = 0.2;
        SpriteRenderer._rr(ctx, x, y, 4, h, r);
        ctx.fill();
        ctx.globalAlpha = 1;

        ctx.strokeStyle = check.can ? 'rgba(160,160,80,0.4)' : 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 1;
        SpriteRenderer._rr(ctx, x, y, w, h, r);
        ctx.stroke();

        // Building level
        SpriteRenderer.drawText(ctx, `Upgrade to Lv.${bLvl + 1}`, x + 14, y + 3, check.can ? '#ffd700' : '#777', 16);

        // Description
        SpriteRenderer.drawTextNoOutline(ctx, nextData.description, x + 14, y + 24, '#999', 12);

        // Costs — single row at bottom of card
        const costY = y + h - 18;
        let cx = x + w;

        // Level requirement (left side)
        if (pd.level < nextData.reqLevel) {
            SpriteRenderer.drawTextNoOutline(ctx, `Requires Lv.${nextData.reqLevel}`, x + 14, costY, '#ff6644', 9);
        }

        // Gold + materials (right-aligned, measure text to avoid overlap)
        const matEntries = Object.entries(nextData.materials);
        ctx.font = `600 11px 'Nunito', sans-serif`;

        // Measure each element's width: icon(14) + gap(4) + textWidth + gap(12)
        const goldText = `${nextData.gold}`;
        const goldSlotW = 14 + 4 + ctx.measureText(goldText).width + 14;
        let totalCostW = goldSlotW;
        const matSlots = [];
        for (const [mat, amount] of matEntries) {
            const txt = `${amount}`;
            const slotW = 14 + 4 + ctx.measureText(txt).width + 14;
            matSlots.push({ mat, amount, txt, slotW });
            totalCostW += slotW;
        }

        let mx = cx - totalCostW - 8;

        UIRenderer.drawGoldIcon(ctx, mx, costY + 1, 12);
        SpriteRenderer.drawTextNoOutline(ctx, goldText, mx + 18, costY, pd.gold >= nextData.gold ? COLORS.UI_GOLD : '#884444', 11);
        mx += goldSlotW;

        for (const slot of matSlots) {
            const matInfo = Materials[slot.mat];
            const has = (pd.materials || {})[slot.mat] || 0;
            const enough = has >= slot.amount;
            SpriteRenderer.drawMaterialIcon(ctx, slot.mat, mx + 2, costY + 4, 7);
            SpriteRenderer.drawTextNoOutline(ctx, slot.txt, mx + 18, costY, enough ? matInfo.color : '#884444', 11);
            this._matZones.push({ x: mx - 4, y: costY - 4, w: slot.slotW + 4, h: 20, id: slot.mat, name: matInfo.name, color: matInfo.color, amount: has, needed: slot.amount });
            mx += slot.slotW;
        }
    }

    _refreshVillagePet() {
        const pd = this.game.playerData;
        if (pd.pets && pd.pets.active) {
            this.villagePet = new Pet(this.hero, pd.pets.active, pd.pets.levels[pd.pets.active] || 1);
        } else {
            this.villagePet = null;
        }
    }

    _getTradeLabel(type) {
        switch (type) {
            case 'blacksmith': return 'Shop';
            case 'elder': return 'Upgrade';
            case 'sage': return 'Skills';
            case 'merchant': return 'Shop';
            case 'beastmaster': return 'Pets';
            default: return 'Trade';
        }
    }

    _renderDialogueBox(ctx) {
        const { npcName, text, type } = this.dialogueBox;
        const r = 12;

        // Dim background
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        const bw = 500;
        const bx = (CANVAS_WIDTH - bw) / 2;
        const by = CANVAS_HEIGHT - 180;

        // Wrap text
        ctx.font = '13px monospace';
        const words = text.split(' ');
        const lines = [];
        let line = '';
        for (const word of words) {
            const test = line ? line + ' ' + word : word;
            if (ctx.measureText(test).width > bw - 40) {
                lines.push(line);
                line = word;
            } else {
                line = test;
            }
        }
        if (line) lines.push(line);

        const lineH = 20;
        const bh = 50 + lines.length * lineH + 20;

        // Box with gradient
        const boxGrad = ctx.createLinearGradient(bx, by, bx, by + bh);
        boxGrad.addColorStop(0, 'rgba(16,16,30,0.97)');
        boxGrad.addColorStop(1, 'rgba(10,10,20,0.97)');
        ctx.fillStyle = boxGrad;
        SpriteRenderer._rr(ctx, bx, by, bw, bh, r);
        ctx.fill();

        // Inner top highlight
        ctx.save();
        SpriteRenderer._rr(ctx, bx, by, bw, bh, r);
        ctx.clip();
        ctx.fillStyle = 'rgba(255,255,255,0.04)';
        ctx.fillRect(bx, by, bw, bh / 3);
        ctx.restore();

        // Border
        const borderColor = type === 'tip' ? 'rgba(68,136,204,0.5)' : 'rgba(255,215,0,0.4)';
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 1.5;
        SpriteRenderer._rr(ctx, bx, by, bw, bh, r);
        ctx.stroke();

        // Type badge
        const badgeColor = type === 'tip' ? '#4488cc' : '#cc9944';
        const badgeText = type === 'tip' ? 'TIP' : 'LORE';
        ctx.fillStyle = badgeColor;
        ctx.globalAlpha = 0.12;
        SpriteRenderer._rr(ctx, bx + bw - 56, by + 8, 46, 18, 5);
        ctx.fill();
        ctx.globalAlpha = 1;
        SpriteRenderer.drawTextNoOutline(ctx, badgeText, bx + bw - 33, by + 10, badgeColor, 10, 'center');

        // NPC name
        SpriteRenderer.drawText(ctx, npcName, bx + 18, by + 10, '#ffd700', 16);

        // Text lines
        for (let i = 0; i < lines.length; i++) {
            SpriteRenderer.drawTextNoOutline(ctx, lines[i], bx + 20, by + 42 + i * lineH, '#ddd', 13);
        }

        // Continue hint
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        SpriteRenderer._rr(ctx, bx + bw / 2 - 50, by + bh - 18, 100, 16, 4);
        ctx.fill();
        SpriteRenderer.drawTextNoOutline(ctx, 'Click to close', bx + bw / 2, by + bh - 12, '#555', 9, 'center');
    }

    renderShopPanel(ctx) {
        const pd = this.game.playerData;
        const PX = 50, PY = 55;
        const PW = CANVAS_WIDTH - 100;
        const PH = CANVAS_HEIGHT - 80;

        // Full dim
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        UIRenderer.drawPanel(ctx, PX, PY, PW, PH, 0.95);

        const titles = { blacksmith: 'Blacksmith', elder: 'Elder', sage: 'Sage', merchant: 'Merchant', questboard: 'Quest Board', beastmaster: 'Beast Tamer', inventory: 'Inventory' };

        // Header
        SpriteRenderer.drawText(ctx, titles[this.activeShop], PX + 18, PY + 10, '#ffd700', 22);
        // Building level indicator with pips (inline, right of title)
        const shopBuildingMap = { blacksmith: 'blacksmith', elder: 'elder', sage: 'sage', merchant: 'merchant', beastmaster: 'beastmaster' };
        if (shopBuildingMap[this.activeShop]) {
            const bLevel = getBuildingLevel(pd, shopBuildingMap[this.activeShop]);
            ctx.font = '22px monospace';
            const titleW = ctx.measureText(titles[this.activeShop]).width;
            const pipStartX = PX + 18 + titleW + 16;
            const pipY = PY + 14;
            SpriteRenderer.drawTextNoOutline(ctx, 'Lv.', pipStartX, pipY, '#888', 9);
            for (let i = 0; i < 5; i++) {
                const px = pipStartX + 20 + i * 14;
                const filled = i < bLevel;
                ctx.fillStyle = filled ? '#ffd700' : '#1a1a22';
                SpriteRenderer._rr(ctx, px, pipY + 1, 10, 8, 3);
                ctx.fill();
                ctx.strokeStyle = filled ? 'rgba(255,215,0,0.4)' : 'rgba(255,255,255,0.06)';
                ctx.lineWidth = 0.5;
                SpriteRenderer._rr(ctx, px, pipY + 1, 10, 8, 3);
                ctx.stroke();
            }
        }
        if (this.activeDialogue) {
            SpriteRenderer.drawTextNoOutline(ctx, `"${this.activeDialogue}"`, PX + 18, PY + 36, '#bba', 12);
        }

        // Gold
        UIRenderer.drawGoldIcon(ctx, PX + PW - 120, PY + 14, 14);
        SpriteRenderer.drawText(ctx, `${pd.gold}`, PX + PW - 100, PY + 12, COLORS.UI_GOLD, 18);
        if (this.activeShop === 'sage') {
            SpriteRenderer.drawText(ctx, `SP: ${pd.skillPoints}`, PX + PW - 200, PY + 12, '#88aaff', 16);
        }
        if (this.activeShop === 'questboard' && pd.quests) {
            const elapsed = Date.now() - pd.quests.lastReset;
            const remaining = Math.max(0, QUEST_RESET_INTERVAL - elapsed);
            const mins = Math.floor(remaining / 60000);
            const secs = Math.floor((remaining % 60000) / 1000);
            const h = Math.floor(mins / 60);
            const m = mins % 60;
            const timeStr = h > 0 ? `${h}h ${m}m` : `${m}m ${secs}s`;
            SpriteRenderer.drawTextNoOutline(ctx, `Reset: ${timeStr}`, PX + PW - 200, PY + 38, '#aaa', 10);
        }

        UIRenderer.drawSeparator(ctx, PX + 12, PY + 54, PW - 24);

        // Render item cards with scroll clipping
        const cardX = PX + 14;
        const cardW = PW - 28;
        const clipTop = PY + 58;
        const clipBottom = PY + PH - 4;

        ctx.save();
        ctx.beginPath();
        ctx.rect(PX, clipTop, PW, clipBottom - clipTop);
        ctx.clip();

        const scrollOff = this.scrollY;

        for (const item of (this.shopItems || [])) {
            const y = item.y - scrollOff;
            if (y + 60 < clipTop || y > clipBottom) continue; // skip off-screen

            if (item.type === 'header') {
                if (item.text) {
                    // Subtle separator line before header
                    UIRenderer.drawSeparator(ctx, cardX, y - 2, cardW);
                    SpriteRenderer.drawTextNoOutline(ctx, item.text, cardX + 6, y + 5, item.color, 13);
                }
                continue;
            }

            if (item.type === 'equip') {
                this._renderItemCard(ctx, cardX, y, cardW, 48, item, pd);
            } else if (item.type === 'upgrade') {
                this._renderUpgradeCard(ctx, cardX, y, cardW, 58, item, pd);
            } else if (item.type === 'skill') {
                this._renderSkillCard(ctx, cardX, y, cardW, 48, item, pd);
            } else if (item.type === 'quest') {
                this._renderQuestCard(ctx, cardX, y, cardW, 56, item);
            } else if (item.type === 'pet') {
                this._renderPetCard(ctx, cardX, y, cardW, 72, item, pd);
            } else if (item.type === 'petUnequip') {
                this._renderPetUnequipBtn(ctx, cardX, y, cardW);
            } else if (item.type === 'research') {
                this._renderResearchCard(ctx, cardX, y, cardW, 52, item, pd);
            } else if (item.type === 'gear') {
                this._renderGearCard(ctx, cardX, y, cardW, 62, item, pd);
            } else if (item.type === 'buildingUpgrade') {
                this._renderBuildingUpgradeCard(ctx, cardX, y, cardW, 66, item, pd);
            } else if (item.type === 'invSlot') {
                this._renderInvSlot(ctx, cardX, y, cardW, 48, item);
            } else if (item.type === 'invStats') {
                this._renderInvStats(ctx, cardX, y, cardW);
            } else if (item.type === 'invItem') {
                this._renderInvItem(ctx, cardX, y, cardW, 48, item);
            } else if (item.type === 'invSkill') {
                this._renderInvSkill(ctx, cardX, y, cardW, item);
            } else if (item.type === 'invMaterials') {
                this._renderInvMaterials(ctx, cardX, y, cardW);
            } else if (item.type === 'invPet') {
                this._renderInvPetSummary(ctx, cardX, y, cardW, item);
            } else if (item.type === 'invGear') {
                this._renderInvGear(ctx, cardX, y, cardW, item);
            } else if (item.type === 'matTrade') {
                this._renderMatTradeCard(ctx, cardX, y, cardW, item);
            }
        }

        ctx.restore();

        // Scroll indicator
        if (this.maxScroll > 0) {
            // Scrollbar track
            const trackX = PX + PW - 10;
            const trackH = clipBottom - clipTop;
            ctx.fillStyle = 'rgba(255,255,255,0.04)';
            SpriteRenderer._rr(ctx, trackX, clipTop, 6, trackH, 3);
            ctx.fill();

            // Scrollbar thumb
            const scrollBarH = Math.max(24, trackH * trackH / (trackH + this.maxScroll));
            const scrollBarY = clipTop + (scrollOff / this.maxScroll) * (trackH - scrollBarH);
            const thumbGrad = ctx.createLinearGradient(trackX, scrollBarY, trackX + 6, scrollBarY);
            thumbGrad.addColorStop(0, 'rgba(255,215,0,0.25)');
            thumbGrad.addColorStop(1, 'rgba(255,215,0,0.15)');
            ctx.fillStyle = thumbGrad;
            SpriteRenderer._rr(ctx, trackX, scrollBarY, 6, scrollBarH, 3);
            ctx.fill();

            // Top fade if scrolled down
            if (scrollOff > 0) {
                const fadeGrad = ctx.createLinearGradient(PX, clipTop, PX, clipTop + 25);
                fadeGrad.addColorStop(0, 'rgba(8,8,16,0.8)');
                fadeGrad.addColorStop(1, 'rgba(8,8,16,0)');
                ctx.fillStyle = fadeGrad;
                ctx.fillRect(PX + 1, clipTop, PW - 2, 25);
                // Up arrow
                ctx.fillStyle = 'rgba(255,215,0,0.4)';
                ctx.beginPath();
                ctx.moveTo(PX + PW / 2, clipTop + 4);
                ctx.lineTo(PX + PW / 2 - 6, clipTop + 12);
                ctx.lineTo(PX + PW / 2 + 6, clipTop + 12);
                ctx.closePath();
                ctx.fill();
            }

            // Bottom fade if more to scroll
            if (scrollOff < this.maxScroll) {
                const fadeGrad = ctx.createLinearGradient(PX, clipBottom - 25, PX, clipBottom);
                fadeGrad.addColorStop(0, 'rgba(8,8,16,0)');
                fadeGrad.addColorStop(1, 'rgba(8,8,16,0.8)');
                ctx.fillStyle = fadeGrad;
                ctx.fillRect(PX + 1, clipBottom - 25, PW - 2, 25);
                // Down arrow
                ctx.fillStyle = 'rgba(255,215,0,0.4)';
                ctx.beginPath();
                ctx.moveTo(PX + PW / 2, clipBottom - 4);
                ctx.lineTo(PX + PW / 2 - 6, clipBottom - 12);
                ctx.lineTo(PX + PW / 2 + 6, clipBottom - 12);
                ctx.closePath();
                ctx.fill();
            }
        }

        // Close button on top
        for (const btn of this.shopButtons) {
            if (btn.text === 'X') btn.render(ctx);
        }
    }

    _renderItemCard(ctx, x, y, w, h, data, pd) {
        const { item, owned, equipped, iconType, locked, unlockTier } = data;
        const canAfford = pd.gold >= item.cost;
        const hovered = !locked && this.shopButtons.some(b => b.hovered && b.y === data.y);
        const r = 8;

        // Card background with gradient
        const bgGrad = ctx.createLinearGradient(x, y, x, y + h);
        if (locked) {
            bgGrad.addColorStop(0, '#141418');
            bgGrad.addColorStop(1, '#0e0e12');
        } else if (equipped) {
            bgGrad.addColorStop(0, '#1e3520');
            bgGrad.addColorStop(1, '#162818');
        } else if (hovered) {
            bgGrad.addColorStop(0, '#2e2e42');
            bgGrad.addColorStop(1, '#222238');
        } else {
            bgGrad.addColorStop(0, '#1e1e2c');
            bgGrad.addColorStop(1, '#16161f');
        }
        ctx.fillStyle = bgGrad;
        SpriteRenderer._rr(ctx, x, y, w, h, r);
        ctx.fill();

        // Inner top highlight
        ctx.save();
        SpriteRenderer._rr(ctx, x, y, w, h, r);
        ctx.clip();
        ctx.fillStyle = locked ? 'rgba(255,255,255,0.015)' : 'rgba(255,255,255,0.04)';
        ctx.fillRect(x, y, w, h / 2);
        ctx.restore();

        // Border
        ctx.strokeStyle = locked ? 'rgba(255,255,255,0.03)' : equipped ? 'rgba(80,160,80,0.6)' : owned ? 'rgba(80,80,130,0.5)' : hovered ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)';
        ctx.lineWidth = equipped ? 1.5 : 1;
        SpriteRenderer._rr(ctx, x, y, w, h, r);
        ctx.stroke();

        // Icon box
        const iconS = 36;
        const ix = x + 8;
        const iy = y + (h - iconS) / 2;
        ctx.fillStyle = '#0c0c16';
        SpriteRenderer._rr(ctx, ix, iy, iconS, iconS, 6);
        ctx.fill();
        ctx.strokeStyle = equipped ? 'rgba(100,180,100,0.4)' : 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 1;
        SpriteRenderer._rr(ctx, ix, iy, iconS, iconS, 6);
        ctx.stroke();

        if (locked) {
            // Lock icon
            ctx.fillStyle = '#333';
            ctx.beginPath();
            ctx.arc(ix + iconS / 2, iy + iconS / 2 + 2, 6, 0, Math.PI * 2);
            ctx.fill();
            SpriteRenderer._rr(ctx, ix + iconS / 2 - 8, iy + iconS / 2, 16, 10, 2);
            ctx.fill();
            ctx.strokeStyle = '#555';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(ix + iconS / 2, iy + iconS / 2 - 4, 5, Math.PI, 0);
            ctx.stroke();
        } else {
            this._drawItemIcon(ctx, ix + iconS / 2, iy + iconS / 2, iconType, iconS * 0.35, equipped || owned);
        }

        // Name
        const nameColor = locked ? '#444' : equipped ? '#88dd88' : owned ? '#ccccee' : canAfford ? '#ddd' : '#666';
        SpriteRenderer.drawText(ctx, item.name, ix + iconS + 14, y + 5, nameColor, 16);

        // Description
        SpriteRenderer.drawTextNoOutline(ctx, item.description, ix + iconS + 14, y + 26, locked ? '#333' : '#777', 12);

        // Right side: status or price
        if (locked) {
            const bx = x + w - 110, by = y + (h - 20) / 2;
            ctx.fillStyle = 'rgba(255,255,255,0.03)';
            SpriteRenderer._rr(ctx, bx, by, 100, 20, 6);
            ctx.fill();
            SpriteRenderer.drawTextNoOutline(ctx, `Building Lv.${unlockTier}`, bx + 50, by + 4, '#555', 10, 'center');
        } else if (equipped) {
            const bx = x + w - 90, by = y + (h - 24) / 2;
            ctx.fillStyle = 'rgba(80,160,80,0.15)';
            SpriteRenderer._rr(ctx, bx, by, 80, 24, 6);
            ctx.fill();
            ctx.strokeStyle = 'rgba(80,160,80,0.3)';
            ctx.lineWidth = 1;
            SpriteRenderer._rr(ctx, bx, by, 80, 24, 6);
            ctx.stroke();
            SpriteRenderer.drawTextNoOutline(ctx, 'EQUIPPED', x + w - 50, by + 6, '#6c6', 10, 'center');
        } else if (owned) {
            const bx = x + w - 76, by = y + (h - 24) / 2;
            ctx.fillStyle = hovered ? 'rgba(80,80,180,0.2)' : 'rgba(60,60,120,0.15)';
            SpriteRenderer._rr(ctx, bx, by, 66, 24, 6);
            ctx.fill();
            ctx.strokeStyle = 'rgba(100,100,200,0.3)';
            ctx.lineWidth = 1;
            SpriteRenderer._rr(ctx, bx, by, 66, 24, 6);
            ctx.stroke();
            SpriteRenderer.drawTextNoOutline(ctx, 'EQUIP', x + w - 43, by + 6, hovered ? '#bbccff' : '#8899cc', 10, 'center');
        } else {
            UIRenderer.drawGoldIcon(ctx, x + w - 80, y + (h - 14) / 2, 10);
            const priceColor = canAfford ? COLORS.UI_GOLD : '#553';
            SpriteRenderer.drawText(ctx, `${item.cost}`, x + w - 65, y + (h - 16) / 2, priceColor, 14);
        }
    }

    _renderUpgradeCard(ctx, x, y, w, h, data, pd) {
        const { stat, level, maxed, cost, statColor, iconType } = data;
        const maxLv = data.cap || ShopData.elder.maxLevel;
        const canAfford = pd.gold >= cost;
        const hovered = this.shopButtons.some(b => b.hovered && b.y === data.y);
        const r = 8;

        // Card bg with gradient
        const bgGrad = ctx.createLinearGradient(x, y, x, y + h);
        if (maxed) {
            bgGrad.addColorStop(0, '#1e3520');
            bgGrad.addColorStop(1, '#162818');
        } else if (hovered) {
            bgGrad.addColorStop(0, '#2e2e42');
            bgGrad.addColorStop(1, '#222238');
        } else {
            bgGrad.addColorStop(0, '#1e1e2c');
            bgGrad.addColorStop(1, '#16161f');
        }
        ctx.fillStyle = bgGrad;
        SpriteRenderer._rr(ctx, x, y, w, h, r);
        ctx.fill();

        // Inner top highlight
        ctx.save();
        SpriteRenderer._rr(ctx, x, y, w, h, r);
        ctx.clip();
        ctx.fillStyle = 'rgba(255,255,255,0.04)';
        ctx.fillRect(x, y, w, h / 2);
        ctx.restore();

        ctx.strokeStyle = maxed ? 'rgba(80,160,80,0.5)' : 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 1;
        SpriteRenderer._rr(ctx, x, y, w, h, r);
        ctx.stroke();

        // Color accent bar
        ctx.fillStyle = statColor;
        ctx.globalAlpha = 0.25;
        SpriteRenderer._rr(ctx, x, y, 4, h, r);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Icon box
        const iconS = 40;
        const ix = x + 10;
        const iy = y + (h - iconS) / 2;
        ctx.fillStyle = '#0c0c16';
        SpriteRenderer._rr(ctx, ix, iy, iconS, iconS, 6);
        ctx.fill();
        this._drawItemIcon(ctx, ix + iconS / 2, iy + iconS / 2, iconType, iconS * 0.35, maxed || level > 0);

        // Name + description
        SpriteRenderer.drawText(ctx, stat.name, ix + iconS + 14, y + 5, maxed ? '#88dd88' : '#ddd', 17);
        SpriteRenderer.drawTextNoOutline(ctx, stat.description, ix + iconS + 14, y + 26, '#777', 12);

        // Progress bar
        const barX = ix + iconS + 12;
        const barY = y + 40;
        const barW = w - iconS - 140;
        const barH = 10;
        ctx.fillStyle = '#0a0a12';
        SpriteRenderer._rr(ctx, barX, barY, barW, barH, 5);
        ctx.fill();
        if (level > 0) {
            ctx.save();
            SpriteRenderer._rr(ctx, barX, barY, barW, barH, 5);
            ctx.clip();
            const grad = ctx.createLinearGradient(barX, barY, barX + barW * (level / maxLv), barY);
            grad.addColorStop(0, statColor);
            grad.addColorStop(1, statColor + 'cc');
            ctx.fillStyle = grad;
            ctx.fillRect(barX, barY, barW * (level / maxLv), barH);
            // Glossy highlight
            ctx.fillStyle = 'rgba(255,255,255,0.12)';
            ctx.fillRect(barX, barY, barW * (level / maxLv), barH / 2);
            ctx.restore();
        }
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 1;
        SpriteRenderer._rr(ctx, barX, barY, barW, barH, 5);
        ctx.stroke();
        SpriteRenderer.drawTextNoOutline(ctx, `Lv. ${level}/${maxLv}`, barX + barW + 10, barY - 2, '#aaa', 11);

        // Right: price or MAX
        if (maxed) {
            const bx = x + w - 66, by = y + (h - 24) / 2;
            ctx.fillStyle = 'rgba(80,160,80,0.15)';
            SpriteRenderer._rr(ctx, bx, by, 56, 24, 6);
            ctx.fill();
            ctx.strokeStyle = 'rgba(80,160,80,0.3)';
            ctx.lineWidth = 1;
            SpriteRenderer._rr(ctx, bx, by, 56, 24, 6);
            ctx.stroke();
            SpriteRenderer.drawTextNoOutline(ctx, 'MAX', x + w - 38, by + 6, '#6c6', 10, 'center');
        } else {
            UIRenderer.drawGoldIcon(ctx, x + w - 80, y + (h - 14) / 2, 10);
            SpriteRenderer.drawText(ctx, `${cost}`, x + w - 65, y + (h - 16) / 2, canAfford ? COLORS.UI_GOLD : '#553', 14);
        }
    }

    _renderSkillCard(ctx, x, y, w, h, data, pd) {
        const { skill, level, maxed, iconType, active } = data;
        const canLearn = SkillSystem.canLearn(data.id, pd);
        const hovered = this.shopButtons.some(b => b.hovered && b.y === data.y);
        const r = 8;

        // Card bg with gradient
        const bgGrad = ctx.createLinearGradient(x, y, x, y + h);
        if (maxed) {
            bgGrad.addColorStop(0, '#1e3520');
            bgGrad.addColorStop(1, '#162818');
        } else if (hovered) {
            bgGrad.addColorStop(0, '#2e2e42');
            bgGrad.addColorStop(1, '#222238');
        } else {
            bgGrad.addColorStop(0, '#1e1e2c');
            bgGrad.addColorStop(1, '#16161f');
        }
        ctx.fillStyle = bgGrad;
        SpriteRenderer._rr(ctx, x, y, w, h, r);
        ctx.fill();

        // Inner top highlight
        ctx.save();
        SpriteRenderer._rr(ctx, x, y, w, h, r);
        ctx.clip();
        ctx.fillStyle = 'rgba(255,255,255,0.04)';
        ctx.fillRect(x, y, w, h / 2);
        ctx.restore();

        // Accent bar
        const accentColor = active ? '#88aaff' : '#88cc88';
        ctx.fillStyle = accentColor;
        ctx.globalAlpha = 0.2;
        SpriteRenderer._rr(ctx, x, y, 4, h, r);
        ctx.fill();
        ctx.globalAlpha = 1;

        ctx.strokeStyle = maxed ? 'rgba(80,160,80,0.5)' : level > 0 ? 'rgba(80,80,140,0.4)' : 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 1;
        SpriteRenderer._rr(ctx, x, y, w, h, r);
        ctx.stroke();

        // Icon
        const iconS = 36;
        const ix = x + 10;
        const iy = y + (h - iconS) / 2;
        ctx.fillStyle = level > 0 ? (active ? '#101028' : '#102010') : '#0c0c16';
        SpriteRenderer._rr(ctx, ix, iy, iconS, iconS, 6);
        ctx.fill();
        this._drawItemIcon(ctx, ix + iconS / 2, iy + iconS / 2, iconType, iconS * 0.35, level > 0);

        // Key hint + Name
        if (active && skill.key) {
            ctx.fillStyle = 'rgba(255,255,255,0.06)';
            SpriteRenderer._rr(ctx, ix + iconS + 14, y + 3, 24, 18, 4);
            ctx.fill();
            SpriteRenderer.drawTextNoOutline(ctx, `${skill.key}`, ix + iconS + 26, y + 5, '#888', 11, 'center');
            SpriteRenderer.drawText(ctx, skill.name, ix + iconS + 44, y + 3, maxed ? '#88dd88' : '#ddd', 16);
        } else {
            SpriteRenderer.drawText(ctx, skill.name, ix + iconS + 14, y + 3, maxed ? '#88dd88' : '#ddd', 16);
        }
        SpriteRenderer.drawTextNoOutline(ctx, skill.description, ix + iconS + 14, y + 24, '#777', 12);

        // Level pips (below name/description, left side)
        const cap = data.cap || skill.maxLevel;
        const pipX = ix + iconS + 12;
        const pipY = y + 36;
        for (let i = 0; i < skill.maxLevel; i++) {
            const px = pipX + i * 14;
            const locked = i >= cap;
            const filled = i < level;
            ctx.fillStyle = filled ? accentColor : locked ? '#0a0a0e' : '#1a1a22';
            SpriteRenderer._rr(ctx, px, pipY, 10, 8, 3);
            ctx.fill();
            if (filled) {
                ctx.strokeStyle = 'rgba(255,255,255,0.2)';
            } else {
                ctx.strokeStyle = locked ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.08)';
            }
            ctx.lineWidth = 1;
            SpriteRenderer._rr(ctx, px, pipY, 10, 8, 3);
            ctx.stroke();
        }

        // Cost or MAX (right side, vertically centered)
        if (maxed) {
            const bx = x + w - 56, by = y + (h - 22) / 2;
            ctx.fillStyle = 'rgba(80,160,80,0.15)';
            SpriteRenderer._rr(ctx, bx, by, 48, 22, 6);
            ctx.fill();
            SpriteRenderer.drawTextNoOutline(ctx, 'MAX', bx + 24, by + 5, '#6c6', 10, 'center');
        } else if (level < skill.maxLevel) {
            const spCost = skill.cost[level];
            const bx = x + w - 56, by = y + (h - 22) / 2;
            ctx.fillStyle = canLearn ? 'rgba(80,80,160,0.12)' : 'rgba(40,40,60,0.1)';
            SpriteRenderer._rr(ctx, bx, by, 48, 22, 6);
            ctx.fill();
            SpriteRenderer.drawTextNoOutline(ctx, `${spCost} SP`, bx + 24, by + 5, canLearn ? '#88aaff' : '#555', 10, 'center');
        }
    }

    _renderQuestCard(ctx, x, y, w, h, data) {
        const { quest, progress, fulfilled, claimed } = data;
        const done = fulfilled || claimed;
        const pct = Math.min(1, progress / quest.target);
        const r = 8;

        // Card background with gradient
        const bgGrad = ctx.createLinearGradient(x, y, x, y + h);
        if (claimed) {
            bgGrad.addColorStop(0, '#1e3520');
            bgGrad.addColorStop(1, '#162818');
        } else if (fulfilled) {
            bgGrad.addColorStop(0, '#2e2a18');
            bgGrad.addColorStop(1, '#1e1a10');
        } else {
            bgGrad.addColorStop(0, '#1e1e2c');
            bgGrad.addColorStop(1, '#16161f');
        }
        ctx.fillStyle = bgGrad;
        SpriteRenderer._rr(ctx, x, y, w, h, r);
        ctx.fill();

        // Inner top highlight
        ctx.save();
        SpriteRenderer._rr(ctx, x, y, w, h, r);
        ctx.clip();
        ctx.fillStyle = 'rgba(255,255,255,0.04)';
        ctx.fillRect(x, y, w, h / 2);
        ctx.restore();

        ctx.strokeStyle = claimed ? 'rgba(80,160,80,0.5)' : fulfilled ? 'rgba(200,180,60,0.5)' : 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 1;
        SpriteRenderer._rr(ctx, x, y, w, h, r);
        ctx.stroke();

        // Icon
        const iconS = 36;
        const ix = x + 8;
        const iy = y + (h - iconS) / 2;
        ctx.fillStyle = done ? '#102010' : '#0c0c16';
        SpriteRenderer._rr(ctx, ix, iy, iconS, iconS, 6);
        ctx.fill();
        this._drawItemIcon(ctx, ix + iconS / 2, iy + iconS / 2, quest.icon, iconS * 0.35, done || pct > 0);

        // Quest name
        SpriteRenderer.drawText(ctx, quest.name, ix + iconS + 14, y + 3, claimed ? '#88dd88' : fulfilled ? '#ffd700' : '#ddd', 16);

        // Description
        SpriteRenderer.drawTextNoOutline(ctx, quest.description, ix + iconS + 14, y + 24, '#777', 12);

        // Progress bar
        const barX = ix + iconS + 12;
        const barY = y + 38;
        const barW = w - iconS - 180;
        const barH = 10;
        ctx.fillStyle = '#0a0a12';
        SpriteRenderer._rr(ctx, barX, barY, barW, barH, 5);
        ctx.fill();
        if (pct > 0) {
            ctx.save();
            SpriteRenderer._rr(ctx, barX, barY, barW, barH, 5);
            ctx.clip();
            const grad = ctx.createLinearGradient(barX, barY, barX + barW * pct, barY);
            grad.addColorStop(0, done ? '#4a8a4a' : '#4488cc');
            grad.addColorStop(1, done ? '#88dd88' : '#88ccff');
            ctx.fillStyle = grad;
            ctx.fillRect(barX, barY, barW * pct, barH);
            ctx.fillStyle = 'rgba(255,255,255,0.12)';
            ctx.fillRect(barX, barY, barW * pct, barH / 2);
            ctx.restore();
        }
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 1;
        SpriteRenderer._rr(ctx, barX, barY, barW, barH, 5);
        ctx.stroke();
        SpriteRenderer.drawTextNoOutline(ctx, `${progress}/${quest.target}`, barX + barW + 10, barY - 2, done ? '#6c6' : '#aaa', 11);

        // Right side: claim button, done badge, or rewards preview
        if (fulfilled) {
            const bx = x + w - 82, by = y + (h - 28) / 2;
            const hovered = this.shopButtons.some(b => b.hovered && b.y === data.y);
            ctx.fillStyle = hovered ? 'rgba(200,180,60,0.3)' : 'rgba(200,180,60,0.15)';
            SpriteRenderer._rr(ctx, bx, by, 72, 28, 6);
            ctx.fill();
            ctx.strokeStyle = 'rgba(200,180,60,0.5)';
            ctx.lineWidth = 1;
            SpriteRenderer._rr(ctx, bx, by, 72, 28, 6);
            ctx.stroke();
            SpriteRenderer.drawText(ctx, 'CLAIM', bx + 36, by + 5, '#ffd700', 14, 'center');
        } else if (claimed) {
            const bx = x + w - 80, by = y + (h - 26) / 2;
            ctx.fillStyle = 'rgba(80,160,80,0.15)';
            SpriteRenderer._rr(ctx, bx, by, 70, 26, 6);
            ctx.fill();
            ctx.strokeStyle = 'rgba(80,160,80,0.3)';
            ctx.lineWidth = 1;
            SpriteRenderer._rr(ctx, bx, by, 70, 26, 6);
            ctx.stroke();
            SpriteRenderer.drawTextNoOutline(ctx, 'DONE', x + w - 45, by + 6, '#6c6', 12, 'center');
        } else {
            UIRenderer.drawGoldIcon(ctx, x + w - 95, y + 10, 10);
            SpriteRenderer.drawTextNoOutline(ctx, `${quest.rewards.gold}`, x + w - 80, y + 8, COLORS.UI_GOLD, 13);
            SpriteRenderer.drawTextNoOutline(ctx, `${quest.rewards.xp} XP`, x + w - 80, y + 26, '#aa88ff', 12);
        }
    }

    _renderPetCard(ctx, x, y, w, h, data, pd) {
        const { petId, pet, unlocked, level, isActive, maxed, upgradeCost, locked, unlockTier } = data;
        const hovered = !locked && this.shopButtons.some(b => b.hovered && b.y === data.y);
        const r = 8;

        // Card background with gradient
        const bgGrad = ctx.createLinearGradient(x, y, x, y + h);
        if (locked) {
            bgGrad.addColorStop(0, '#141418');
            bgGrad.addColorStop(1, '#0e0e12');
        } else if (isActive) {
            bgGrad.addColorStop(0, '#1e3520');
            bgGrad.addColorStop(1, '#162818');
        } else if (hovered) {
            bgGrad.addColorStop(0, '#2e2e42');
            bgGrad.addColorStop(1, '#222238');
        } else {
            bgGrad.addColorStop(0, '#1e1e2c');
            bgGrad.addColorStop(1, '#16161f');
        }
        ctx.fillStyle = bgGrad;
        SpriteRenderer._rr(ctx, x, y, w, h, r);
        ctx.fill();

        // Inner top highlight
        ctx.save();
        SpriteRenderer._rr(ctx, x, y, w, h, r);
        ctx.clip();
        ctx.fillStyle = locked ? 'rgba(255,255,255,0.015)' : 'rgba(255,255,255,0.04)';
        ctx.fillRect(x, y, w, h / 2);
        ctx.restore();

        ctx.strokeStyle = locked ? 'rgba(255,255,255,0.03)' : isActive ? 'rgba(80,160,80,0.5)' : unlocked ? 'rgba(80,80,130,0.4)' : 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 1;
        SpriteRenderer._rr(ctx, x, y, w, h, r);
        ctx.stroke();

        // Pet icon area
        const iconS = 48;
        const ix = x + 10;
        const iy = y + (h - iconS) / 2;
        ctx.fillStyle = unlocked ? '#0e1e0e' : '#0c0c16';
        SpriteRenderer._rr(ctx, ix, iy, iconS, iconS, 6);
        ctx.fill();

        if (locked) {
            // Lock icon
            ctx.fillStyle = '#333';
            ctx.beginPath();
            ctx.arc(ix + iconS / 2, iy + iconS / 2 + 2, 6, 0, Math.PI * 2);
            ctx.fill();
            SpriteRenderer._rr(ctx, ix + iconS / 2 - 8, iy + iconS / 2, 16, 10, 2);
            ctx.fill();
            ctx.strokeStyle = '#555';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(ix + iconS / 2, iy + iconS / 2 - 4, 5, Math.PI, 0);
            ctx.stroke();
            // Name dimmed
            SpriteRenderer.drawText(ctx, pet.name, ix + iconS + 14, y + 5, '#444', 17);
            SpriteRenderer.drawTextNoOutline(ctx, pet.description, ix + iconS + 14, y + 26, '#333', 11);
            // Unlock requirement
            const bx = x + w - 110, by = y + (h - 20) / 2;
            ctx.fillStyle = 'rgba(255,255,255,0.03)';
            SpriteRenderer._rr(ctx, bx, by, 100, 20, 6);
            ctx.fill();
            SpriteRenderer.drawTextNoOutline(ctx, `Building Lv.${unlockTier}`, bx + 50, by + 4, '#555', 10, 'center');
            return;
        }

        if (unlocked) {
            const tempPet = new Pet({ x: ix + iconS / 2, y: iy + iconS / 2 + 6, dead: false }, petId, level);
            tempPet.x = ix + iconS / 2;
            tempPet.y = iy + iconS / 2 + 6;
            tempPet.state = 'idle';
            tempPet.facing = 1;
            tempPet._drawPetSprite(ctx, tempPet.x, tempPet.y);
        } else {
            ctx.fillStyle = '#444';
            ctx.beginPath();
            ctx.arc(ix + iconS / 2, iy + iconS / 2, 8, 0, Math.PI * 2);
            ctx.fill();
            SpriteRenderer.drawTextNoOutline(ctx, '?', ix + iconS / 2, iy + iconS / 2 - 5, '#777', 14, 'center');
        }

        // Pet name
        SpriteRenderer.drawText(ctx, pet.name, ix + iconS + 14, y + 5, unlocked ? pet.color : '#777', 17);

        // Element badge
        const elemColors = { physical: '#c8a060', magic: '#aa66ff', fire: '#ff6622', ice: '#44ccff', lightning: '#ffee33' };
        const ec = elemColors[pet.element] || '#aaa';
        ctx.fillStyle = ec;
        ctx.globalAlpha = 0.15;
        SpriteRenderer._rr(ctx, ix + iconS + 14, y + 27, 48, 16, 5);
        ctx.fill();
        ctx.globalAlpha = 1;
        SpriteRenderer.drawTextNoOutline(ctx, pet.element.toUpperCase(), ix + iconS + 38, y + 29, ec, 10, 'center');

        // Type badge
        ctx.fillStyle = '#666';
        ctx.globalAlpha = 0.15;
        SpriteRenderer._rr(ctx, ix + iconS + 66, y + 27, 44, 16, 5);
        ctx.fill();
        ctx.globalAlpha = 1;
        SpriteRenderer.drawTextNoOutline(ctx, pet.type.toUpperCase(), ix + iconS + 88, y + 29, '#999', 10, 'center');

        // Description
        SpriteRenderer.drawTextNoOutline(ctx, pet.description, ix + iconS + 14, y + 48, '#666', 11);

        const rx = x + w;

        if (unlocked) {
            // Active badge (top-right corner)
            if (isActive) {
                ctx.fillStyle = 'rgba(80,200,80,0.12)';
                SpriteRenderer._rr(ctx, rx - 62, y + 4, 52, 16, 5);
                ctx.fill();
                SpriteRenderer.drawTextNoOutline(ctx, 'ACTIVE', rx - 36, y + 6, '#88ff88', 9, 'center');
            }

            // Level (below name, left of element badge)
            SpriteRenderer.drawText(ctx, `Lv.${level}/5`, ix + iconS + 120, y + 5, '#ffd700', 14);

            const stats = pet.baseStats;
            const bonuses = pet.levelBonuses;
            const li = Math.min(level - 1, 4);
            const dmg = stats.damage + (bonuses.damage[li] || 0);
            const spd = stats.attackSpeed + (bonuses.attackSpeed[li] || 0);
            SpriteRenderer.drawTextNoOutline(ctx, `DMG: ${dmg}   SPD: ${spd.toFixed(1)}`, ix + iconS + 14, y + 58, '#999', 11);

            if (level >= pet.ability.unlockLevel) {
                SpriteRenderer.drawTextNoOutline(ctx, pet.ability.name, rx - 85, y + 28, '#88ff88', 9);
            } else {
                SpriteRenderer.drawTextNoOutline(ctx, `Ability at Lv.${pet.ability.unlockLevel}`, rx - 105, y + 28, '#555', 9);
            }

            // Action button
            if (isActive && !maxed) {
                const canUp = pd.gold >= upgradeCost;
                ctx.fillStyle = canUp ? 'rgba(60,120,60,0.2)' : 'rgba(60,30,30,0.2)';
                SpriteRenderer._rr(ctx, rx - 70, y + 44, 62, 22, 6);
                ctx.fill();
                ctx.strokeStyle = canUp ? 'rgba(80,160,80,0.4)' : 'rgba(80,40,40,0.3)';
                ctx.lineWidth = 1;
                SpriteRenderer._rr(ctx, rx - 70, y + 44, 62, 22, 6);
                ctx.stroke();
                UIRenderer.drawGoldIcon(ctx, rx - 64, y + 49, 7);
                SpriteRenderer.drawTextNoOutline(ctx, `${upgradeCost}`, rx - 52, y + 48, canUp ? COLORS.UI_GOLD : '#884444', 10);
            } else if (isActive && maxed) {
                SpriteRenderer.drawTextNoOutline(ctx, 'MAX', rx - 40, y + 50, '#ffd700', 11, 'center');
            } else {
                ctx.fillStyle = hovered ? 'rgba(80,80,160,0.2)' : 'rgba(50,50,100,0.15)';
                SpriteRenderer._rr(ctx, rx - 70, y + 44, 62, 22, 6);
                ctx.fill();
                ctx.strokeStyle = 'rgba(100,100,200,0.3)';
                ctx.lineWidth = 1;
                SpriteRenderer._rr(ctx, rx - 70, y + 44, 62, 22, 6);
                ctx.stroke();
                SpriteRenderer.drawTextNoOutline(ctx, 'SELECT', rx - 39, y + 48, hovered ? '#aaccff' : '#7799cc', 10, 'center');
            }
        } else {
            const canBuy = pd.gold >= pet.unlockCost;
            ctx.fillStyle = canBuy ? 'rgba(80,80,40,0.2)' : 'rgba(60,30,30,0.15)';
            SpriteRenderer._rr(ctx, rx - 100, y + 40, 90, 24, 6);
            ctx.fill();
            ctx.strokeStyle = canBuy ? 'rgba(140,140,80,0.4)' : 'rgba(80,40,40,0.3)';
            ctx.lineWidth = 1;
            SpriteRenderer._rr(ctx, rx - 100, y + 40, 90, 24, 6);
            ctx.stroke();
            SpriteRenderer.drawTextNoOutline(ctx, 'UNLOCK', rx - 92, y + 44, '#ccc', 10);
            UIRenderer.drawGoldIcon(ctx, rx - 46, y + 46, 8);
            SpriteRenderer.drawTextNoOutline(ctx, `${pet.unlockCost}`, rx - 32, y + 44, canBuy ? COLORS.UI_GOLD : '#884444', 11);
        }
    }

    _renderPetUnequipBtn(ctx, x, y, w) {
        const hovered = this.shopButtons.some(b => b.hovered && b.y === y);
        ctx.fillStyle = hovered ? 'rgba(80,30,30,0.3)' : 'rgba(50,20,20,0.2)';
        SpriteRenderer._rr(ctx, x, y, w, 28, 6);
        ctx.fill();
        ctx.strokeStyle = hovered ? 'rgba(140,60,60,0.5)' : 'rgba(80,40,40,0.3)';
        ctx.lineWidth = 1;
        SpriteRenderer._rr(ctx, x, y, w, 28, 6);
        ctx.stroke();
        SpriteRenderer.drawTextNoOutline(ctx, 'Unequip Companion', x + w / 2, y + 8, hovered ? '#ff8888' : '#886666', 11, 'center');
    }

    // --- Inventory rendering methods ---

    _renderInvSlot(ctx, x, y, w, h, data) {
        const { equip, label, iconType, slotColor } = data;
        const hovered = equip && this.shopButtons.some(b => b.hovered && b.y === data.y);
        const r = 8;

        // Card bg with gradient
        const bgGrad = ctx.createLinearGradient(x, y, x, y + h);
        if (equip) {
            bgGrad.addColorStop(0, hovered ? '#2a2a40' : '#1e3520');
            bgGrad.addColorStop(1, hovered ? '#222236' : '#162818');
        } else {
            bgGrad.addColorStop(0, '#18181e');
            bgGrad.addColorStop(1, '#121216');
        }
        ctx.fillStyle = bgGrad;
        SpriteRenderer._rr(ctx, x, y, w, h, r);
        ctx.fill();

        // Inner top highlight
        ctx.save();
        SpriteRenderer._rr(ctx, x, y, w, h, r);
        ctx.clip();
        ctx.fillStyle = 'rgba(255,255,255,0.03)';
        ctx.fillRect(x, y, w, h / 2);
        ctx.restore();

        ctx.strokeStyle = equip ? 'rgba(80,160,80,0.4)' : 'rgba(255,255,255,0.04)';
        ctx.lineWidth = 1;
        SpriteRenderer._rr(ctx, x, y, w, h, r);
        ctx.stroke();

        // Icon box
        const iconS = 36;
        const ix = x + 8;
        const iy = y + (h - iconS) / 2;
        ctx.fillStyle = '#0c0c16';
        SpriteRenderer._rr(ctx, ix, iy, iconS, iconS, 6);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 1;
        SpriteRenderer._rr(ctx, ix, iy, iconS, iconS, 6);
        ctx.stroke();
        this._drawItemIcon(ctx, ix + iconS / 2, iy + iconS / 2, iconType, iconS * 0.35, !!equip);

        // Slot label
        SpriteRenderer.drawTextNoOutline(ctx, label.toUpperCase(), ix + iconS + 14, y + 3, '#555', 11);

        if (equip) {
            SpriteRenderer.drawText(ctx, equip.name, ix + iconS + 14, y + 16, slotColor, 16);
            SpriteRenderer.drawTextNoOutline(ctx, equip.description || '', ix + iconS + 14, y + 34, '#777', 12);
            const bx = x + w - 76, by = y + (h - 24) / 2;
            ctx.fillStyle = hovered ? 'rgba(80,30,30,0.3)' : 'rgba(50,20,20,0.2)';
            SpriteRenderer._rr(ctx, bx, by, 66, 24, 6);
            ctx.fill();
            ctx.strokeStyle = hovered ? 'rgba(140,60,60,0.5)' : 'rgba(80,40,40,0.25)';
            ctx.lineWidth = 1;
            SpriteRenderer._rr(ctx, bx, by, 66, 24, 6);
            ctx.stroke();
            SpriteRenderer.drawTextNoOutline(ctx, 'REMOVE', x + w - 43, by + 6, hovered ? '#ff8888' : '#886666', 11, 'center');
        } else {
            SpriteRenderer.drawText(ctx, '- Empty -', ix + iconS + 14, y + 18, '#3a3a44', 15);
        }
    }

    _renderInvStats(ctx, x, y, w) {
        const pd = this.game.playerData;
        const hero = this.hero;
        const base = BalanceConfig;
        const panelH = 130;
        const r = 8;

        // Panel bg with gradient
        const bgGrad = ctx.createLinearGradient(x, y, x, y + panelH);
        bgGrad.addColorStop(0, '#141420');
        bgGrad.addColorStop(1, '#0e0e16');
        ctx.fillStyle = bgGrad;
        SpriteRenderer._rr(ctx, x, y, w, panelH, r);
        ctx.fill();

        // Inner top highlight
        ctx.save();
        SpriteRenderer._rr(ctx, x, y, w, panelH, r);
        ctx.clip();
        ctx.fillStyle = 'rgba(255,255,255,0.03)';
        ctx.fillRect(x, y, w, panelH / 2);
        ctx.restore();

        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 1;
        SpriteRenderer._rr(ctx, x, y, w, panelH, r);
        ctx.stroke();

        const col1 = x + 14;
        const col2 = x + w / 2 + 10;
        let ly = y + 8;
        const lineH = 20;

        // Compute base values and bonuses
        const baseHp = base.HERO_BASE_HP + (pd.statUpgrades.maxHp || 0) * 20;
        const baseDmg = base.HERO_BASE_DAMAGE + (pd.statUpgrades.damage || 0) * 5;
        const baseArmor = base.HERO_BASE_ARMOR + (pd.statUpgrades.armor || 0) * 3;
        const baseSpd = base.HERO_BASE_SPEED + (pd.statUpgrades.speed || 0) * 10;
        const baseRegen = base.HERO_BASE_REGEN + (pd.statUpgrades.hpRegen || 0) * 0.5;

        const statLine = (cx, sy, icon, label, value, baseVal, color) => {
            this._drawItemIcon(ctx, cx + 6, sy + 7, icon, 6, true);
            SpriteRenderer.drawTextNoOutline(ctx, label, cx + 20, sy, '#aaa', 13);
            SpriteRenderer.drawText(ctx, `${typeof value === 'number' && value % 1 !== 0 ? value.toFixed(1) : value}`, cx + 90, sy - 1, color, 15);
            if (value !== baseVal) {
                const diff = typeof value === 'number' && typeof baseVal === 'number' ? value - baseVal : 0;
                if (diff > 0) {
                    SpriteRenderer.drawTextNoOutline(ctx, `(+${diff % 1 !== 0 ? diff.toFixed(1) : diff})`, cx + 135, sy + 1, '#44aa44', 11);
                }
            }
        };

        // Left column
        statLine(col1, ly, 'heart', 'Max HP', hero.maxHp, baseHp, '#44dd44');
        ly += lineH;
        statLine(col1, ly, 'sword', 'Damage', hero.baseDamage, baseDmg, '#ffaa66');
        ly += lineH;
        statLine(col1, ly, 'shield', 'Armor', hero.armor, baseArmor, '#88aaee');
        ly += lineH;
        statLine(col1, ly, 'boot', 'Speed', hero.speed, baseSpd, '#88ee88');
        ly += lineH;
        statLine(col1, ly, 'cross', 'HP Regen', hero.hpRegen, baseRegen, '#66ee66');

        // Right column - special stats
        ly = y + 8;
        const acc = pd.equipment.accessory;

        // Attack speed
        let atkSpd = base.HERO_ATTACK_COOLDOWN;
        if (pd.gear?.boots > 0) {
            atkSpd *= (1 - GearData.boots.totalBonus(pd.gear.boots));
        }
        if (pd.skills?.swiftBlade > 0) {
            const bonus = [0.10, 0.22, 0.35, 0.48, 0.60][pd.skills.swiftBlade - 1];
            atkSpd *= (1 - bonus);
        }
        SpriteRenderer.drawTextNoOutline(ctx, 'Atk/s', col2, ly, '#aaa', 13);
        SpriteRenderer.drawText(ctx, `${(1 / atkSpd).toFixed(2)}`, col2 + 65, ly - 1, '#ffdd88', 15);
        ly += lineH;

        // Effective damage reduction
        const dmgRed = (hero.armor / (100 + hero.armor) * 100).toFixed(1);
        SpriteRenderer.drawTextNoOutline(ctx, 'Dmg Red.', col2, ly, '#aaa', 13);
        SpriteRenderer.drawText(ctx, `${dmgRed}%`, col2 + 65, ly - 1, '#88aaee', 15);
        ly += lineH;

        // Lifesteal
        if (acc?.lifesteal) {
            SpriteRenderer.drawTextNoOutline(ctx, 'Lifesteal', col2, ly, '#aaa', 13);
            SpriteRenderer.drawText(ctx, `${(acc.lifesteal * 100).toFixed(0)}%`, col2 + 65, ly - 1, '#ee6666', 15);
            ly += lineH;
        }
        // Gold bonus
        let goldBonus = 0;
        if (acc?.goldBonus) goldBonus += acc.goldBonus;
        if (pd.skills?.goldFind > 0) goldBonus += [0.10, 0.22, 0.35, 0.50, 0.70][pd.skills.goldFind - 1];
        if (goldBonus > 0) {
            SpriteRenderer.drawTextNoOutline(ctx, 'Gold Bonus', col2, ly, '#aaa', 13);
            SpriteRenderer.drawText(ctx, `+${(goldBonus * 100).toFixed(0)}%`, col2 + 65, ly - 1, COLORS.UI_GOLD, 15);
            ly += lineH;
        }
        // Tower damage bonus
        if (acc?.towerDamage) {
            SpriteRenderer.drawTextNoOutline(ctx, 'Tower Dmg', col2, ly, '#aaa', 13);
            SpriteRenderer.drawText(ctx, `+${(acc.towerDamage * 100).toFixed(0)}%`, col2 + 65, ly - 1, '#cc8844', 15);
        }
    }

    _renderInvItem(ctx, x, y, w, h, data) {
        const { item, iconType, category } = data;
        const hovered = this.shopButtons.some(b => b.hovered && b.y === data.y);
        const catColors = { weapon: '#cc9966', armor: '#6688cc', accessory: '#aa88cc' };
        const r = 8;

        const bgGrad = ctx.createLinearGradient(x, y, x, y + h);
        bgGrad.addColorStop(0, hovered ? '#2e2e42' : '#1e1e2c');
        bgGrad.addColorStop(1, hovered ? '#222238' : '#16161f');
        ctx.fillStyle = bgGrad;
        SpriteRenderer._rr(ctx, x, y, w, h, r);
        ctx.fill();

        ctx.save();
        SpriteRenderer._rr(ctx, x, y, w, h, r);
        ctx.clip();
        ctx.fillStyle = 'rgba(255,255,255,0.04)';
        ctx.fillRect(x, y, w, h / 2);
        ctx.restore();

        ctx.strokeStyle = hovered ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 1;
        SpriteRenderer._rr(ctx, x, y, w, h, r);
        ctx.stroke();

        // Icon
        const iconS = 36;
        const ix = x + 8;
        const iy = y + (h - iconS) / 2;
        ctx.fillStyle = '#0c0c16';
        SpriteRenderer._rr(ctx, ix, iy, iconS, iconS, 6);
        ctx.fill();
        this._drawItemIcon(ctx, ix + iconS / 2, iy + iconS / 2, iconType, iconS * 0.35, true);

        SpriteRenderer.drawText(ctx, item.name, ix + iconS + 14, y + 5, catColors[category] || '#ddd', 16);
        SpriteRenderer.drawTextNoOutline(ctx, item.description, ix + iconS + 14, y + 26, '#777', 12);

        // Equip button
        const bx = x + w - 80, by = y + (h - 26) / 2;
        ctx.fillStyle = hovered ? 'rgba(80,80,160,0.2)' : 'rgba(50,50,100,0.15)';
        SpriteRenderer._rr(ctx, bx, by, 70, 26, 6);
        ctx.fill();
        ctx.strokeStyle = 'rgba(100,100,200,0.3)';
        ctx.lineWidth = 1;
        SpriteRenderer._rr(ctx, bx, by, 70, 26, 6);
        ctx.stroke();
        SpriteRenderer.drawTextNoOutline(ctx, 'EQUIP', x + w - 45, by + 6, hovered ? '#bbccff' : '#7799cc', 12, 'center');
    }

    _renderInvSkill(ctx, x, y, w, data) {
        const { skill, level, isActive } = data;
        const color = isActive ? '#88aaff' : '#88cc88';
        const h = 28;
        const r = 6;

        const bgGrad = ctx.createLinearGradient(x, y, x, y + h);
        bgGrad.addColorStop(0, '#1a1a26');
        bgGrad.addColorStop(1, '#14141e');
        ctx.fillStyle = bgGrad;
        SpriteRenderer._rr(ctx, x, y, w, h, r);
        ctx.fill();

        // Accent bar
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.15;
        SpriteRenderer._rr(ctx, x, y, 3, h, r);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Skill icon
        const iconType = isActive ? 'bolt' : 'star';
        this._drawItemIcon(ctx, x + 18, y + h / 2, iconType, 5, true);

        SpriteRenderer.drawText(ctx, skill.name, x + 34, y + 3, color, 14);

        // Level pips
        const pipX = x + 180;
        for (let i = 0; i < skill.maxLevel; i++) {
            const filled = i < level;
            ctx.fillStyle = filled ? color : '#1a1a22';
            SpriteRenderer._rr(ctx, pipX + i * 12, y + 8, 8, 8, 3);
            ctx.fill();
            ctx.strokeStyle = filled ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)';
            ctx.lineWidth = 1;
            SpriteRenderer._rr(ctx, pipX + i * 12, y + 8, 8, 8, 3);
            ctx.stroke();
        }

        // Type badge
        const badge = isActive ? 'ACTIVE' : 'PASSIVE';
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.12;
        SpriteRenderer._rr(ctx, x + w - 64, y + 5, 52, 16, 5);
        ctx.fill();
        ctx.globalAlpha = 1;
        SpriteRenderer.drawTextNoOutline(ctx, badge, x + w - 38, y + 7, color, 8, 'center');

        if (isActive && skill.key) {
            ctx.fillStyle = 'rgba(255,255,255,0.05)';
            SpriteRenderer._rr(ctx, x + w - 114, y + 5, 22, 16, 4);
            ctx.fill();
            SpriteRenderer.drawTextNoOutline(ctx, `${skill.key}`, x + w - 103, y + 7, '#666', 9, 'center');
        }
    }

    _renderInvMaterials(ctx, x, y, w) {
        const pd = this.game.playerData;
        const mats = pd.materials || {};
        const r = 8;

        const panelH = 40;
        const bgGrad = ctx.createLinearGradient(x, y, x, y + panelH);
        bgGrad.addColorStop(0, '#141420');
        bgGrad.addColorStop(1, '#0e0e16');
        ctx.fillStyle = bgGrad;
        SpriteRenderer._rr(ctx, x, y, w, panelH, r);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.04)';
        ctx.lineWidth = 1;
        SpriteRenderer._rr(ctx, x, y, w, panelH, r);
        ctx.stroke();

        const matList = [
            { id: 'wood', color: '#8B5A2B' }, { id: 'stone', color: '#888' },
            { id: 'iron', color: '#aabbcc' }, { id: 'crystal', color: '#aa66ff' },
            { id: 'darkEssence', color: '#662288' }
        ];
        const matNames = { wood: 'Wood', stone: 'Stone', iron: 'Iron', crystal: 'Crystal', darkEssence: 'Essence' };
        let mx = x + 18;
        for (const m of matList) {
            const amount = mats[m.id] || 0;
            if (amount <= 0) continue;
            // Glow behind icon
            ctx.fillStyle = m.color;
            ctx.globalAlpha = 0.15;
            ctx.beginPath();
            ctx.arc(mx, y + panelH / 2, 11, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
            // Material icon
            SpriteRenderer.drawMaterialIcon(ctx, m.id, mx, y + panelH / 2, 10);
            SpriteRenderer.drawTextNoOutline(ctx, `${matNames[m.id]}: ${amount}`, mx + 16, y + panelH / 2 - 6, m.color, 13);
            this._matZones.push({ x: mx - 12, y: y + 4, w: 110, h: panelH - 8, id: m.id, name: matNames[m.id], color: m.color, amount });
            mx += 110;
        }
    }

    _renderInvGear(ctx, x, y, w, data) {
        const { gear, gearId, level } = data;
        const r = 6;
        ctx.fillStyle = '#12121a';
        SpriteRenderer._rr(ctx, x, y, w, 26, r);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.04)';
        ctx.lineWidth = 1;
        SpriteRenderer._rr(ctx, x, y, w, 26, r);
        ctx.stroke();

        // Color accent
        ctx.fillStyle = gear.color;
        ctx.globalAlpha = 0.2;
        SpriteRenderer._rr(ctx, x, y, 3, 26, r);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Icon
        this._drawItemIcon(ctx, x + 18, y + 13, gear.icon, 6, true);

        // Name + level
        SpriteRenderer.drawTextNoOutline(ctx, `${gear.name} Lv.${level}`, x + 32, y + 7, gear.color, 11);

        // Stat bonus
        const desc = gear.description(level);
        SpriteRenderer.drawTextNoOutline(ctx, desc, x + w - 140, y + 7, '#999', 10);
    }

    _renderMatTradeCard(ctx, x, y, w, data) {
        const { matId, matInfo, unitBuy, unitSell } = data;
        const h = 56;
        const r = 6;
        const pd = this.game.playerData;
        const currentOwned = pd.materials[matId] || 0;
        const packs = [1, 10, 100];

        // Card bg
        ctx.fillStyle = '#12121a';
        SpriteRenderer._rr(ctx, x, y, w, h, r);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.04)';
        ctx.lineWidth = 1;
        SpriteRenderer._rr(ctx, x, y, w, h, r);
        ctx.stroke();

        // Color accent
        ctx.fillStyle = matInfo.color;
        ctx.globalAlpha = 0.25;
        SpriteRenderer._rr(ctx, x, y, 3, h, r);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Material icon
        SpriteRenderer.drawMaterialIcon(ctx, matId, x + 20, y + h / 2, 9);

        // Name + owned count
        SpriteRenderer.drawTextNoOutline(ctx, matInfo.name, x + 38, y + 5, matInfo.color, 14);
        SpriteRenderer.drawTextNoOutline(ctx, `Owned: ${currentOwned}`, x + 38, y + 22, '#777', 12);
        SpriteRenderer.drawTextNoOutline(ctx, `Buy ${unitBuy}g / Sell ${unitSell}g`, x + 38, y + 38, '#555', 11);

        // Row labels
        const btnAreaX = x + w - 290;
        SpriteRenderer.drawTextNoOutline(ctx, 'Buy', btnAreaX - 30, y + 8, '#88cc88', 11);
        SpriteRenderer.drawTextNoOutline(ctx, 'Sell', btnAreaX - 30, y + 34, '#ccaa66', 11);

        // Buy x1, x10, x100 buttons
        for (let pi = 0; pi < 3; pi++) {
            const qty = packs[pi];
            const totalCost = unitBuy * qty;
            const bx = btnAreaX + pi * 46;
            const canBuy = pd.gold >= totalCost;

            ctx.fillStyle = canBuy ? '#1a2a1a' : '#1a1a1a';
            SpriteRenderer._rr(ctx, bx, y + 4, 42, 24, 4);
            ctx.fill();
            ctx.strokeStyle = canBuy ? 'rgba(100,200,100,0.25)' : 'rgba(255,255,255,0.06)';
            ctx.lineWidth = 1;
            SpriteRenderer._rr(ctx, bx, y + 4, 42, 24, 4);
            ctx.stroke();
            SpriteRenderer.drawTextNoOutline(ctx, `x${qty}`, bx + 21, y + 9, canBuy ? '#88cc88' : '#444', 11, 'center');
        }

        // Sell x1, x10, x100 buttons
        for (let pi = 0; pi < 3; pi++) {
            const qty = packs[pi];
            const sx = btnAreaX + pi * 46;
            const canSell = currentOwned >= qty;

            ctx.fillStyle = canSell ? '#2a1a0a' : '#1a1a1a';
            SpriteRenderer._rr(ctx, sx, y + 30, 42, 24, 4);
            ctx.fill();
            ctx.strokeStyle = canSell ? 'rgba(200,150,80,0.25)' : 'rgba(255,255,255,0.06)';
            ctx.lineWidth = 1;
            SpriteRenderer._rr(ctx, sx, y + 30, 42, 24, 4);
            ctx.stroke();
            SpriteRenderer.drawTextNoOutline(ctx, `x${qty}`, sx + 21, y + 35, canSell ? '#ccaa66' : '#444', 11, 'center');
        }
    }

    _renderInvPetSummary(ctx, x, y, w, data) {
        const { petId, pet, level } = data;
        const h = 48;
        const r = 8;

        const bgGrad = ctx.createLinearGradient(x, y, x, y + h);
        bgGrad.addColorStop(0, '#162818');
        bgGrad.addColorStop(1, '#101e10');
        ctx.fillStyle = bgGrad;
        SpriteRenderer._rr(ctx, x, y, w, h, r);
        ctx.fill();

        ctx.save();
        SpriteRenderer._rr(ctx, x, y, w, h, r);
        ctx.clip();
        ctx.fillStyle = 'rgba(255,255,255,0.03)';
        ctx.fillRect(x, y, w, h / 2);
        ctx.restore();

        ctx.strokeStyle = 'rgba(80,160,80,0.3)';
        ctx.lineWidth = 1;
        SpriteRenderer._rr(ctx, x, y, w, h, r);
        ctx.stroke();

        // Pet preview
        const tempPet = new Pet({ x: x + 28, y: y + h / 2 + 4, dead: false }, petId, level);
        tempPet.x = x + 28;
        tempPet.y = y + h / 2 + 4;
        tempPet.facing = 1;
        tempPet._drawPetSprite(ctx, tempPet.x, tempPet.y);

        // Info
        SpriteRenderer.drawText(ctx, pet.name, x + 56, y + 6, pet.color, 14);
        SpriteRenderer.drawText(ctx, `Lv.${level}`, x + 56 + pet.name.length * 9, y + 6, '#ffd700', 12);

        // Stats
        const stats = pet.baseStats;
        const li = Math.min(level - 1, 4);
        const dmg = stats.damage + (pet.levelBonuses.damage[li] || 0);
        const spd = stats.attackSpeed + (pet.levelBonuses.attackSpeed[li] || 0);
        const hp = stats.hp + (pet.levelBonuses.hp[li] || 0);
        SpriteRenderer.drawTextNoOutline(ctx, `DMG: ${dmg}  ATK/s: ${spd.toFixed(1)}  HP: ${hp}`, x + 56, y + 26, '#aaa', 10);

        // Ability
        if (level >= pet.ability.unlockLevel) {
            SpriteRenderer.drawTextNoOutline(ctx, pet.ability.name, x + w - 100, y + 8, '#88ff88', 10);
        }
    }

    _drawItemIcon(ctx, cx, cy, type, size, active) {
        const s = size;
        const col = active ? '#ffd700' : '#888';
        const col2 = active ? '#ffaa33' : '#666';

        switch (type) {
            case 'sword':
                // Blade
                ctx.fillStyle = active ? '#ccc' : '#777';
                ctx.beginPath();
                ctx.moveTo(cx, cy - s);
                ctx.lineTo(cx + s * 0.2, cy + s * 0.3);
                ctx.lineTo(cx - s * 0.2, cy + s * 0.3);
                ctx.closePath();
                ctx.fill();
                // Guard
                ctx.fillStyle = col;
                ctx.fillRect(cx - s * 0.4, cy + s * 0.2, s * 0.8, s * 0.15);
                // Handle
                ctx.fillStyle = '#5a3a1a';
                ctx.fillRect(cx - s * 0.1, cy + s * 0.35, s * 0.2, s * 0.5);
                break;
            case 'shield':
                ctx.fillStyle = active ? '#5577bb' : '#556';
                ctx.beginPath();
                ctx.moveTo(cx - s * 0.5, cy - s * 0.6);
                ctx.lineTo(cx + s * 0.5, cy - s * 0.6);
                ctx.lineTo(cx + s * 0.5, cy + s * 0.1);
                ctx.lineTo(cx, cy + s * 0.7);
                ctx.lineTo(cx - s * 0.5, cy + s * 0.1);
                ctx.closePath();
                ctx.fill();
                // Emblem
                ctx.fillStyle = col;
                ctx.beginPath();
                ctx.arc(cx, cy - s * 0.1, s * 0.2, 0, Math.PI * 2);
                ctx.fill();
                break;
            case 'heart':
                ctx.fillStyle = active ? '#ee4444' : '#844';
                ctx.beginPath();
                ctx.arc(cx - s * 0.25, cy - s * 0.15, s * 0.32, 0, Math.PI * 2);
                ctx.arc(cx + s * 0.25, cy - s * 0.15, s * 0.32, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.moveTo(cx - s * 0.55, cy - s * 0.05);
                ctx.lineTo(cx, cy + s * 0.6);
                ctx.lineTo(cx + s * 0.55, cy - s * 0.05);
                ctx.fill();
                break;
            case 'boot':
                ctx.fillStyle = active ? '#8B5528' : '#554';
                ctx.beginPath();
                ctx.moveTo(cx - s * 0.2, cy - s * 0.6);
                ctx.lineTo(cx + s * 0.15, cy - s * 0.6);
                ctx.lineTo(cx + s * 0.15, cy + s * 0.2);
                ctx.lineTo(cx + s * 0.5, cy + s * 0.2);
                ctx.lineTo(cx + s * 0.5, cy + s * 0.5);
                ctx.lineTo(cx - s * 0.3, cy + s * 0.5);
                ctx.lineTo(cx - s * 0.3, cy + s * 0.2);
                ctx.lineTo(cx - s * 0.2, cy + s * 0.2);
                ctx.closePath();
                ctx.fill();
                break;
            case 'coin':
                ctx.fillStyle = col;
                ctx.beginPath();
                ctx.arc(cx, cy, s * 0.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = col2;
                ctx.beginPath();
                ctx.arc(cx, cy, s * 0.35, 0, Math.PI * 2);
                ctx.fill();
                SpriteRenderer.drawTextNoOutline(ctx, '$', cx, cy - s * 0.2, '#fff', s * 0.6, 'center');
                break;
            case 'bolt':
                ctx.fillStyle = col;
                ctx.beginPath();
                ctx.moveTo(cx + s * 0.1, cy - s * 0.7);
                ctx.lineTo(cx - s * 0.3, cy + s * 0.05);
                ctx.lineTo(cx + s * 0.05, cy + s * 0.05);
                ctx.lineTo(cx - s * 0.1, cy + s * 0.7);
                ctx.lineTo(cx + s * 0.3, cy - s * 0.05);
                ctx.lineTo(cx - s * 0.05, cy - s * 0.05);
                ctx.closePath();
                ctx.fill();
                break;
            case 'spin':
                ctx.strokeStyle = col;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(cx, cy, s * 0.45, 0, Math.PI * 1.6);
                ctx.stroke();
                // Arrow tip
                ctx.fillStyle = col;
                ctx.beginPath();
                ctx.moveTo(cx + s * 0.45, cy - s * 0.2);
                ctx.lineTo(cx + s * 0.2, cy);
                ctx.lineTo(cx + s * 0.55, cy + s * 0.1);
                ctx.closePath();
                ctx.fill();
                break;
            case 'horn':
                ctx.fillStyle = col;
                ctx.beginPath();
                ctx.moveTo(cx - s * 0.4, cy);
                ctx.lineTo(cx + s * 0.5, cy - s * 0.4);
                ctx.lineTo(cx + s * 0.5, cy + s * 0.4);
                ctx.closePath();
                ctx.fill();
                ctx.fillStyle = col2;
                ctx.beginPath();
                ctx.arc(cx - s * 0.4, cy, s * 0.2, 0, Math.PI * 2);
                ctx.fill();
                break;
            case 'cross':
                ctx.fillStyle = active ? '#44ee44' : '#484';
                ctx.fillRect(cx - s * 0.12, cy - s * 0.5, s * 0.24, s);
                ctx.fillRect(cx - s * 0.5, cy - s * 0.12, s, s * 0.24);
                break;
            case 'flag':
                ctx.fillStyle = '#5a3a1a';
                ctx.fillRect(cx - s * 0.35, cy - s * 0.6, s * 0.1, s * 1.2);
                ctx.fillStyle = col;
                ctx.beginPath();
                ctx.moveTo(cx - s * 0.25, cy - s * 0.6);
                ctx.lineTo(cx + s * 0.5, cy - s * 0.35);
                ctx.lineTo(cx - s * 0.25, cy - s * 0.1);
                ctx.closePath();
                ctx.fill();
                break;
            case 'fang':
                ctx.fillStyle = active ? '#cc3333' : '#633';
                ctx.beginPath();
                ctx.moveTo(cx - s * 0.25, cy - s * 0.3);
                ctx.lineTo(cx - s * 0.1, cy + s * 0.6);
                ctx.lineTo(cx + s * 0.05, cy - s * 0.2);
                ctx.fill();
                ctx.beginPath();
                ctx.moveTo(cx + s * 0.25, cy - s * 0.3);
                ctx.lineTo(cx + s * 0.1, cy + s * 0.6);
                ctx.lineTo(cx - s * 0.05, cy - s * 0.2);
                ctx.fill();
                break;
            case 'glove':
                ctx.fillStyle = active ? '#aa6633' : '#554';
                SpriteRenderer._rr(ctx, cx - s * 0.35, cy - s * 0.2, s * 0.7, s * 0.6, 3);
                ctx.fill();
                for (let i = 0; i < 4; i++) {
                    ctx.fillRect(cx - s * 0.3 + i * s * 0.18, cy - s * 0.6, s * 0.12, s * 0.45);
                }
                break;
            default: // star
                ctx.fillStyle = col;
                ctx.beginPath();
                for (let i = 0; i < 5; i++) {
                    const a = (i * 72 - 90) * Math.PI / 180;
                    const a2 = ((i * 72) + 36 - 90) * Math.PI / 180;
                    const r1 = s * 0.5, r2 = s * 0.2;
                    if (i === 0) ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
                    else ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
                    ctx.lineTo(cx + Math.cos(a2) * r2, cy + Math.sin(a2) * r2);
                }
                ctx.closePath();
                ctx.fill();
                break;
        }
    }

    drawVillageBackground(ctx) {
        // Background image
        if (villageBgImg.complete && villageBgImg.naturalWidth > 0) {
            ctx.drawImage(villageBgImg, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        } else {
            ctx.fillStyle = '#3a6a2a';
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        }

        // Buildings (PNG sprites) spread across the map
        this._drawBuildingSprite(ctx, 'blacksmith', 180, 430);  // left, near well area
        this._drawBuildingSprite(ctx, 'elder', 340, 250);       // upper center-left, near gardens
        this._drawBuildingSprite(ctx, 'merchant', 700, 280);    // upper right, near carts
        this._drawBuildingSprite(ctx, 'sage', 680, 500);        // lower right, near pond
        const bmTopY = this._drawBuildingSprite(ctx, 'beastmaster', 120, 300);  // upper left, beast tamer
        // Store building top for beastmaster NPC label positioning
        const bmNpc = this.npcs.find(n => n.type === 'beastmaster');
        if (bmNpc) bmNpc._buildingTopY = bmTopY;
    }

    _drawStonePath(ctx, x, y, w, h, horizontal) {
        // Path base with gradient
        const g = horizontal
            ? ctx.createLinearGradient(x, y, x, y + h)
            : ctx.createLinearGradient(x, y, x + w, y);
        g.addColorStop(0, '#8a8a8a');
        g.addColorStop(0.5, '#9a9a9a');
        g.addColorStop(1, '#7a7a7a');
        ctx.fillStyle = g;
        SpriteRenderer._rr(ctx, x, y, w, h, 3);
        ctx.fill();
        // Stone tiles
        const step = 16;
        if (horizontal) {
            for (let tx = x + 2; tx < x + w - 2; tx += step) {
                ctx.fillStyle = '#9a9a9a';
                SpriteRenderer._rr(ctx, tx, y + 2, 12, h - 4, 2);
                ctx.fill();
                ctx.fillStyle = '#7a7a7a';
                ctx.fillRect(tx + 12, y, 1, h);
            }
        } else {
            for (let ty = y + 2; ty < y + h - 2; ty += step) {
                ctx.fillStyle = '#9a9a9a';
                SpriteRenderer._rr(ctx, x + 2, ty, w / 2 - 3, 12, 2);
                ctx.fill();
                SpriteRenderer._rr(ctx, x + w / 2 + 1, ty + 6, w / 2 - 3, 12, 2);
                ctx.fill();
                ctx.fillStyle = '#7a7a7a';
                ctx.fillRect(x, ty + 12, w, 1);
            }
        }
    }

    _drawBuildingSprite(ctx, id, cx, baseY) {
        const img = buildingImages[id];
        if (img && img.complete && img.naturalWidth > 0) {
            const scale = id === 'beastmaster' ? 1.8 : 1;
            const imgW = TILE_SIZE * 3.5 * scale;
            const imgH = imgW * (img.naturalHeight / img.naturalWidth);
            const drawX = cx - imgW / 2;
            const drawY = baseY - imgH + TILE_SIZE * 0.5;
            ctx.drawImage(img, drawX, drawY, imgW, imgH);
            return drawY;
        }
        return baseY;
    }

    _drawBuilding(ctx, x, y, w, h, wallColor, roofColor, wallDark) {
        // Wall shadow
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        SpriteRenderer._rr(ctx, x + 3, y + h * 0.3 + 3, w, h * 0.7, 3);
        ctx.fill();
        // Wall with gradient
        const wG = ctx.createLinearGradient(x, y + h * 0.3, x + w, y + h * 0.3);
        wG.addColorStop(0, wallColor);
        wG.addColorStop(0.3, wallColor);
        wG.addColorStop(1, wallDark || 'rgba(0,0,0,0.2)');
        ctx.fillStyle = wG;
        SpriteRenderer._rr(ctx, x, y + h * 0.3, w, h * 0.7, 3);
        ctx.fill();
        // Wall detail (subtle lines)
        ctx.fillStyle = 'rgba(0,0,0,0.05)';
        for (let py = y + h * 0.35; py < y + h; py += 12) {
            ctx.fillRect(x + 2, py, w - 4, 1);
        }
        // Roof
        ctx.fillStyle = roofColor;
        ctx.beginPath();
        ctx.moveTo(x + w / 2, y);
        ctx.quadraticCurveTo(x - 5, y + h * 0.2, x - 10, y + h * 0.35);
        ctx.lineTo(x + w + 10, y + h * 0.35);
        ctx.quadraticCurveTo(x + w + 5, y + h * 0.2, x + w / 2, y);
        ctx.closePath();
        ctx.fill();
        // Roof highlight
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.beginPath();
        ctx.moveTo(x + w / 2, y + 3);
        ctx.lineTo(x + 5, y + h * 0.33);
        ctx.lineTo(x + w / 2, y + h * 0.33);
        ctx.closePath();
        ctx.fill();
        // Roof ridge
        ctx.fillStyle = 'rgba(0,0,0,0.12)';
        SpriteRenderer._rr(ctx, x - 8, y + h * 0.32, w + 16, 3, 1);
        ctx.fill();
    }

    _drawTree(ctx, x, y) {
        // Trunk with gradient
        const tG = ctx.createLinearGradient(x - 3, y, x + 3, y);
        tG.addColorStop(0, '#4a2a0a');
        tG.addColorStop(0.5, '#6a4a1a');
        tG.addColorStop(1, '#3a1a00');
        ctx.fillStyle = tG;
        SpriteRenderer._rr(ctx, x - 3, y, 6, 18, 1);
        ctx.fill();
        // Canopy layers (smooth circles)
        const cG = ctx.createRadialGradient(x - 2, y - 6, 2, x, y, 16);
        cG.addColorStop(0, '#3a8a2a');
        cG.addColorStop(1, '#1a4a0a');
        ctx.fillStyle = cG;
        ctx.beginPath();
        ctx.arc(x, y - 2, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#2a6a1a';
        ctx.beginPath();
        ctx.arc(x - 3, y - 6, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#3a8a2a';
        ctx.beginPath();
        ctx.arc(x + 2, y - 8, 8, 0, Math.PI * 2);
        ctx.fill();
        // Light highlight
        ctx.fillStyle = 'rgba(180,255,100,0.08)';
        ctx.beginPath();
        ctx.arc(x - 3, y - 9, 5, 0, Math.PI * 2);
        ctx.fill();
    }

    _drawBarrel(ctx, x, y) {
        // Barrel body
        const bG = ctx.createLinearGradient(x - 7, y, x + 7, y);
        bG.addColorStop(0, '#5a3a1a');
        bG.addColorStop(0.4, '#7a5a3a');
        bG.addColorStop(1, '#4a2a0a');
        ctx.fillStyle = bG;
        SpriteRenderer._rr(ctx, x - 7, y - 5, 14, 14, 3);
        ctx.fill();
        // Metal bands
        ctx.fillStyle = '#5a5a5a';
        ctx.fillRect(x - 8, y - 1, 16, 1.5);
        ctx.fillRect(x - 8, y + 5, 16, 1.5);
        // Highlight
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fillRect(x - 5, y - 4, 3, 12);
    }

    _drawLampPost(ctx, x, y) {
        // Post with gradient
        const pG = ctx.createLinearGradient(x - 2, y - 20, x + 2, y - 20);
        pG.addColorStop(0, '#3a3a3a');
        pG.addColorStop(0.5, '#5a5a5a');
        pG.addColorStop(1, '#3a3a3a');
        ctx.fillStyle = pG;
        SpriteRenderer._rr(ctx, x - 2, y - 20, 4, 24, 1);
        ctx.fill();
        // Top bracket
        ctx.fillStyle = '#5a5a5a';
        SpriteRenderer._rr(ctx, x - 6, y - 22, 12, 4, 2);
        ctx.fill();
        // Lantern
        ctx.fillStyle = '#ffcc44';
        SpriteRenderer._rr(ctx, x - 4, y - 30, 8, 10, 3);
        ctx.fill();
        ctx.fillStyle = '#ffee88';
        SpriteRenderer._rr(ctx, x - 2, y - 27, 4, 5, 2);
        ctx.fill();
        // Warm glow
        SpriteRenderer._glow(ctx, x, y - 25, 22, '#ffcc44', 0.08);
    }
}
