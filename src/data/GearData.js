// Gear pieces upgradeable at the Blacksmith
// Each piece has a primary stat it boosts, scaling per level
// Max level is capped by blacksmith building level

// Material costs per upgrade level (shared across all gear)
// Levels 1-3: wood+stone, 4-6: +iron, 7-8: +crystal, 9-10: +darkEssence
export const GearMaterialCosts = [
    { wood: 3, stone: 2 },                          // Lv 1
    { wood: 5, stone: 3 },                          // Lv 2
    { wood: 8, stone: 5 },                          // Lv 3
    { wood: 6, stone: 4, iron: 3 },                 // Lv 4
    { wood: 8, stone: 6, iron: 5 },                 // Lv 5
    { stone: 8, iron: 8, crystal: 2 },              // Lv 6
    { stone: 10, iron: 10, crystal: 4 },            // Lv 7
    { iron: 12, crystal: 8, darkEssence: 2 },       // Lv 8
    { iron: 15, crystal: 12, darkEssence: 4 },      // Lv 9
    { crystal: 15, darkEssence: 8 }                  // Lv 10
];

export const GearData = {
    sword: {
        name: 'Sword',
        stat: 'damage',
        icon: 'sword',
        color: '#cc9966',
        bonusPerLevel: [5, 6, 7, 8, 10, 12, 14, 17, 20, 24],
        cost:           [50, 90, 160, 280, 480, 800, 940, 1540, 2520, 4200],
        description: lvl => `+${GearData.sword.totalBonus(lvl)} damage`
    },
    helmet: {
        name: 'Helmet',
        stat: 'hp',
        icon: 'helmet',
        color: '#44aa44',
        bonusPerLevel: [15, 18, 22, 28, 35, 44, 55, 70, 90, 115],
        cost:           [40, 75, 135, 240, 420, 720, 840, 1400, 2310, 3850],
        description: lvl => `+${GearData.helmet.totalBonus(lvl)} HP`
    },
    chestplate: {
        name: 'Chestplate',
        stat: 'armor',
        icon: 'shield',
        color: '#6688cc',
        bonusPerLevel: [4, 5, 6, 8, 10, 13, 16, 20, 26, 33],
        cost:           [45, 80, 145, 260, 450, 770, 900, 1470, 2450, 4060],
        description: lvl => `+${GearData.chestplate.totalBonus(lvl)} armor`
    },
    leggings: {
        name: 'Leggings',
        stat: 'speed',
        icon: 'boot',
        color: '#88ee88',
        bonusPerLevel: [8, 10, 12, 14, 16, 19, 22, 26, 30, 35],
        cost:           [35, 65, 120, 210, 370, 640, 760, 1260, 2100, 3500],
        description: lvl => `+${GearData.leggings.totalBonus(lvl)} speed`
    },
    boots: {
        name: 'Boots',
        stat: 'attackSpeed',
        icon: 'boot',
        color: '#ffdd88',
        bonusPerLevel: [0.04, 0.04, 0.05, 0.05, 0.06, 0.06, 0.07, 0.07, 0.08, 0.08],
        cost:           [45, 85, 150, 270, 470, 800, 940, 1580, 2590, 4340],
        description: lvl => {
            const total = GearData.boots.bonusPerLevel.slice(0, lvl).reduce((a, b) => a + b, 0);
            return `+${(total * 100).toFixed(0)}% attack speed`;
        }
    }
};

// Helper: total stat bonus for a given level
for (const gear of Object.values(GearData)) {
    gear.totalBonus = (lvl) => {
        if (gear.stat === 'attackSpeed') {
            return gear.bonusPerLevel.slice(0, lvl).reduce((a, b) => a + b, 0);
        }
        let total = 0;
        for (let i = 0; i < lvl; i++) total += gear.bonusPerLevel[i] || 0;
        return total;
    };
}

// Gear level cap per blacksmith building level
export const GearCaps = [3, 5, 7, 9, 10];
