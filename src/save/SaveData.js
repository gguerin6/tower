export function createDefaultSaveData(slot) {
    return {
        slot,
        version: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        playTime: 0,

        // Hero stats
        level: 1,
        xp: 0,
        gold: 100,
        skillPoints: 0,

        // Stat upgrades (legacy)
        statUpgrades: {
            maxHp: 0,
            damage: 0,
            armor: 0,
            speed: 0,
            hpRegen: 0
        },

        // Tower research from Elder
        towerResearch: {
            archer: {},
            mage: {},
            cannon: {},
            frost: {},
            tesla: {}
        },

        // Equipment
        equipment: {
            weapon: null,
            armor: null,
            accessory: null
        },

        // Gear levels (Blacksmith upgrades)
        gear: {
            sword: 0,
            helmet: 0,
            chestplate: 0,
            leggings: 0,
            boots: 0
        },

        // Materials
        materials: {
            wood: 0,
            stone: 0,
            iron: 0,
            crystal: 0,
            darkEssence: 0
        },

        // Building levels
        buildings: {
            blacksmith: 1,
            elder: 1,
            sage: 1,
            merchant: 1,
            beastmaster: 1
        },

        // Owned items
        inventory: [],

        // Skill levels
        skills: {},

        // Pets
        pets: {
            unlocked: {},   // { petId: true }
            levels: {},     // { petId: level (1-5) }
            active: null    // petId or null
        },

        // Map completion
        mapsCompleted: {},
        bestWave: {},

        // Quests
        quests: {
            lastReset: 0,
            progress: {},   // { questId: currentProgress }
            completed: {}   // { questId: true }
        },

        // Settings
        currentMap: null
    };
}
