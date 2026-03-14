// Building upgrade data
// Each building has 5 levels (1 = default)
// Upgrading costs gold + materials and requires a minimum player level
// Higher building level unlocks more shop items (by tier)

export const BuildingData = {
    blacksmith: {
        name: 'Blacksmith',
        upgrades: [
            null, // level 1 = default, no cost
            { gold: 150,  materials: { wood: 8, stone: 4 },                   reqLevel: 4,  description: 'Gear upgrades up to Lv.5' },
            { gold: 600,  materials: { wood: 15, stone: 10, iron: 5 },        reqLevel: 8,  description: 'Gear upgrades up to Lv.7' },
            { gold: 1500, materials: { stone: 15, iron: 12, crystal: 5 },     reqLevel: 14, description: 'Gear upgrades up to Lv.9' },
            { gold: 4000, materials: { iron: 20, crystal: 10, darkEssence: 5 }, reqLevel: 22, description: 'Gear upgrades up to Lv.10' }
        ],
        gearCaps: [3, 5, 7, 9, 10]
    },
    elder: {
        name: 'Elder House',
        upgrades: [
            null,
            { gold: 120,  materials: { wood: 6, stone: 4 },                   reqLevel: 4,  description: 'Research up to Lv.2' },
            { gold: 500,  materials: { stone: 10, iron: 5 },                  reqLevel: 8,  description: 'Research up to Lv.3' },
            { gold: 1200, materials: { iron: 10, crystal: 5 },                reqLevel: 14, description: 'Research up to Lv.4' },
            { gold: 3500, materials: { iron: 15, crystal: 10, darkEssence: 3 }, reqLevel: 22, description: 'Research up to Lv.5' }
        ],
        researchCaps: [1, 2, 3, 4, 5]
    },
    sage: {
        name: 'Sage Tower',
        upgrades: [
            null,
            { gold: 160,  materials: { wood: 4, crystal: 2 },                 reqLevel: 5,  description: 'Skills up to Lv.2' },
            { gold: 700,  materials: { crystal: 6, iron: 5 },                 reqLevel: 10, description: 'Skills up to Lv.3' },
            { gold: 1800, materials: { crystal: 10, iron: 8 },                reqLevel: 16, description: 'Skills up to Lv.4' },
            { gold: 5000, materials: { crystal: 15, darkEssence: 5 },         reqLevel: 24, description: 'Skills up to Lv.5' }
        ],
        // Max skill level per building level
        skillCaps: [1, 2, 3, 4, 5]
    },
    merchant: {
        name: 'Merchant Shop',
        upgrades: [
            null,
            { gold: 140,  materials: { wood: 6, stone: 2 },                   reqLevel: 4,  description: 'Unlocks Vampire Ring, Thorn Mail' },
            { gold: 550,  materials: { wood: 10, iron: 5 },                   reqLevel: 8,  description: 'Unlocks War Banner, Fury Gloves, Regen Cloak' },
            { gold: 1400, materials: { iron: 10, crystal: 5 },                reqLevel: 14, description: 'Unlocks Phoenix Feather, Bloodstone' },
            { gold: 3800, materials: { iron: 15, crystal: 8, darkEssence: 4 }, reqLevel: 22, description: 'Unlocks all legendary accessories' }
        ]
    },
    beastmaster: {
        name: 'Beast Tamer',
        upgrades: [
            null,
            { gold: 200,  materials: { wood: 8, stone: 4 },                   reqLevel: 5,  description: 'Unlocks Fire Sprite, Frost Fairy' },
            { gold: 800,  materials: { stone: 10, iron: 8 },                  reqLevel: 10, description: 'Unlocks Thunder Hawk' },
            { gold: 2000, materials: { iron: 12, crystal: 6 },                reqLevel: 16, description: 'Unlocks Shadow Cat' },
            { gold: 5500, materials: { crystal: 12, darkEssence: 6 },         reqLevel: 24, description: 'Unlocks Phoenix' }
        ]
    }
};

// Equipment tier mapping (tier = minimum building level required to see the item)
export const EquipmentTiers = {
    // Weapons
    shortSword: 1, longSword: 1,
    battleAxe: 2, flameBlade: 3,
    legendSword: 4, voidReaper: 5, cosmicEdge: 5, godSlayer: 5,
    // Armors
    leatherArmor: 1, chainmail: 1,
    plateArmor: 2, dragonScale: 3,
    divineArmor: 4, titanPlate: 5, voidShell: 5, eternityGuard: 5,
    // Accessories
    speedBoots: 1, healthAmulet: 1, goldRing: 1,
    vampRing: 2, thornMail: 2,
    warBanner: 3, critGloves: 3, regenCloak: 3,
    phoenixFeather: 4, bloodstone: 4,
    dragonHeart: 5, warlordsMantle: 5, celestialOrb: 5, infinityBand: 5
};

// Pet tier mapping
export const PetTiers = {
    wolf: 1,
    fireSprite: 2,
    frostFairy: 2,
    thunderHawk: 3,
    shadowCat: 4,
    phoenix: 5
};

// Helper: get building level from player data
export function getBuildingLevel(pd, buildingId) {
    if (!pd.buildings) return 1;
    return pd.buildings[buildingId] || 1;
}

// Helper: can upgrade building?
export function canUpgradeBuilding(pd, buildingId) {
    const level = getBuildingLevel(pd, buildingId);
    if (level >= 5) return { can: false, reason: 'MAX' };
    const data = BuildingData[buildingId];
    if (!data) return { can: false, reason: 'Unknown' };
    const upgrade = data.upgrades[level]; // next level
    if (!upgrade) return { can: false, reason: 'MAX' };
    if (pd.level < upgrade.reqLevel) return { can: false, reason: `Requires Lv.${upgrade.reqLevel}` };
    if (pd.gold < upgrade.gold) return { can: false, reason: 'Not enough gold' };
    const mats = pd.materials || {};
    for (const [mat, amount] of Object.entries(upgrade.materials)) {
        if ((mats[mat] || 0) < amount) return { can: false, reason: `Need ${amount} ${mat}` };
    }
    return { can: true, cost: upgrade };
}

// Helper: perform upgrade
export function upgradeBuilding(pd, buildingId) {
    const { can, cost } = canUpgradeBuilding(pd, buildingId);
    if (!can) return false;
    pd.gold -= cost.gold;
    for (const [mat, amount] of Object.entries(cost.materials)) {
        pd.materials[mat] = (pd.materials[mat] || 0) - amount;
    }
    if (!pd.buildings) pd.buildings = {};
    pd.buildings[buildingId] = (pd.buildings[buildingId] || 1) + 1;
    return true;
}
