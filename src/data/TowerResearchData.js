// Tower research upgrades purchasable at the Elder
// Each tower type has research tracks that provide permanent bonuses
// Research level is capped by Elder building level

export const TowerResearchData = {
    archer: {
        name: 'Archer Tower',
        icon: 'archer',
        color: '#8B4513',
        researches: {
            damage: {
                name: 'Sharp Arrows',
                description: '+10% damage per level',
                bonusPerLevel: 0.10,
                maxLevel: 5,
                cost: [100, 220, 480, 1000, 2200]
            },
            range: {
                name: 'Eagle Eye',
                description: '+8% range per level',
                bonusPerLevel: 0.08,
                maxLevel: 5,
                cost: [80, 180, 400, 850, 1900]
            },
            speed: {
                name: 'Rapid Fire',
                description: '+8% attack speed per level',
                bonusPerLevel: 0.08,
                maxLevel: 5,
                cost: [120, 260, 560, 1200, 2600]
            }
        }
    },
    mage: {
        name: 'Mage Tower',
        icon: 'mage',
        color: '#446',
        researches: {
            damage: {
                name: 'Arcane Power',
                description: '+10% damage per level',
                bonusPerLevel: 0.10,
                maxLevel: 5,
                cost: [140, 300, 650, 1400, 3000]
            },
            range: {
                name: 'Far Sight',
                description: '+8% range per level',
                bonusPerLevel: 0.08,
                maxLevel: 5,
                cost: [100, 220, 480, 1000, 2200]
            },
            speed: {
                name: 'Quick Cast',
                description: '+8% attack speed per level',
                bonusPerLevel: 0.08,
                maxLevel: 5,
                cost: [160, 350, 750, 1600, 3400]
            }
        }
    },
    cannon: {
        name: 'Cannon Tower',
        icon: 'cannon',
        color: '#555',
        researches: {
            damage: {
                name: 'Heavy Shells',
                description: '+10% damage per level',
                bonusPerLevel: 0.10,
                maxLevel: 5,
                cost: [160, 350, 750, 1600, 3400]
            },
            range: {
                name: 'Long Barrel',
                description: '+8% range per level',
                bonusPerLevel: 0.08,
                maxLevel: 5,
                cost: [120, 260, 560, 1200, 2600]
            },
            splash: {
                name: 'Blast Radius',
                description: '+12% splash radius per level',
                bonusPerLevel: 0.12,
                maxLevel: 5,
                cost: [180, 400, 850, 1800, 3800]
            }
        }
    },
    frost: {
        name: 'Frost Tower',
        icon: 'frost',
        color: '#8bf',
        researches: {
            damage: {
                name: 'Frozen Shards',
                description: '+10% damage per level',
                bonusPerLevel: 0.10,
                maxLevel: 5,
                cost: [120, 260, 560, 1200, 2600]
            },
            slow: {
                name: 'Deep Freeze',
                description: '+10% slow effect per level',
                bonusPerLevel: 0.10,
                maxLevel: 5,
                cost: [140, 300, 650, 1400, 3000]
            },
            speed: {
                name: 'Frost Barrage',
                description: '+8% attack speed per level',
                bonusPerLevel: 0.08,
                maxLevel: 5,
                cost: [160, 350, 750, 1600, 3400]
            }
        }
    },
    tesla: {
        name: 'Tesla Tower',
        icon: 'tesla',
        color: '#888',
        researches: {
            damage: {
                name: 'Overcharge',
                description: '+10% damage per level',
                bonusPerLevel: 0.10,
                maxLevel: 5,
                cost: [200, 440, 950, 2000, 4200]
            },
            chain: {
                name: 'Arc Conductor',
                description: '+1 chain target per level',
                bonusPerLevel: 1,
                maxLevel: 5,
                cost: [250, 550, 1200, 2500, 5200]
            },
            speed: {
                name: 'Surge',
                description: '+8% attack speed per level',
                bonusPerLevel: 0.08,
                maxLevel: 5,
                cost: [220, 480, 1050, 2200, 4600]
            }
        }
    }
};

// Research level cap per Elder building level
export const ResearchCaps = [1, 2, 3, 4, 5];

// Helper: get research level
export function getResearchLevel(pd, towerType, researchId) {
    if (!pd.towerResearch) return 0;
    if (!pd.towerResearch[towerType]) return 0;
    return pd.towerResearch[towerType][researchId] || 0;
}

// Helper: get total bonus from research
export function getResearchBonus(pd, towerType, researchId) {
    const level = getResearchLevel(pd, towerType, researchId);
    if (level <= 0) return 0;
    const data = TowerResearchData[towerType]?.researches[researchId];
    if (!data) return 0;
    return data.bonusPerLevel * level;
}
