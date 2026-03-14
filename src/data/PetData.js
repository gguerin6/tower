export const PetData = {
    wolf: {
        name: 'Wolf Pup',
        description: 'Fast melee attacker with physical damage.',
        element: 'physical',
        color: '#aa8855',
        unlockCost: 200,
        type: 'melee',
        baseStats: {
            damage: 8,
            attackSpeed: 1.0,
            attackRange: 45,
            speed: 140,
            hp: 60
        },
        // Per-level multipliers (level 1-5)
        upgradeCosts: [0, 200, 460, 980, 2280],
        levelBonuses: {
            damage:      [0, 5, 12, 22, 35],
            attackSpeed: [0, 0.15, 0.3, 0.5, 0.7],
            hp:          [0, 20, 50, 90, 150]
        },
        ability: {
            name: 'Frenzy',
            description: 'Attacks 50% faster for 4s after killing an enemy.',
            unlockLevel: 3
        }
    },
    fireSprite: {
        name: 'Fire Sprite',
        description: 'Ranged fire attacker. Burns enemies.',
        element: 'fire',
        color: '#ff6622',
        unlockCost: 400,
        type: 'ranged',
        baseStats: {
            damage: 6,
            attackSpeed: 0.8,
            attackRange: 120,
            speed: 110,
            hp: 40
        },
        upgradeCosts: [0, 260, 590, 1300, 2930],
        levelBonuses: {
            damage:      [0, 4, 10, 18, 30],
            attackSpeed: [0, 0.1, 0.2, 0.35, 0.5],
            hp:          [0, 15, 35, 65, 110]
        },
        ability: {
            name: 'Fireball',
            description: 'Every 5th attack deals AoE fire damage.',
            unlockLevel: 3
        }
    },
    frostFairy: {
        name: 'Frost Fairy',
        description: 'Ranged ice attacker. Slows enemies on hit.',
        element: 'ice',
        color: '#44ccff',
        unlockCost: 500,
        type: 'ranged',
        baseStats: {
            damage: 5,
            attackSpeed: 0.7,
            attackRange: 110,
            speed: 100,
            hp: 35
        },
        upgradeCosts: [0, 290, 650, 1430, 3250],
        levelBonuses: {
            damage:      [0, 3, 8, 15, 25],
            attackSpeed: [0, 0.1, 0.2, 0.3, 0.45],
            hp:          [0, 15, 30, 55, 95]
        },
        ability: {
            name: 'Frost Nova',
            description: 'Every 6th attack freezes the target for 1s.',
            unlockLevel: 3
        }
    },
    thunderHawk: {
        name: 'Thunder Hawk',
        description: 'Fast lightning attacker. Chains to nearby enemies.',
        element: 'lightning',
        color: '#ffee33',
        unlockCost: 800,
        type: 'ranged',
        baseStats: {
            damage: 7,
            attackSpeed: 1.2,
            attackRange: 100,
            speed: 160,
            hp: 30
        },
        upgradeCosts: [0, 390, 850, 1820, 3900],
        levelBonuses: {
            damage:      [0, 5, 12, 20, 32],
            attackSpeed: [0, 0.2, 0.4, 0.6, 0.9],
            hp:          [0, 10, 25, 50, 85]
        },
        ability: {
            name: 'Chain Bolt',
            description: 'Attacks chain to 1 nearby enemy for 50% damage.',
            unlockLevel: 3
        }
    },
    shadowCat: {
        name: 'Shadow Cat',
        description: 'Stealthy melee attacker with critical strikes.',
        element: 'magic',
        color: '#9955cc',
        unlockCost: 1200,
        type: 'melee',
        baseStats: {
            damage: 12,
            attackSpeed: 0.9,
            attackRange: 40,
            speed: 150,
            hp: 45
        },
        upgradeCosts: [0, 520, 1170, 2470, 5200],
        levelBonuses: {
            damage:      [0, 8, 18, 32, 50],
            attackSpeed: [0, 0.15, 0.3, 0.5, 0.7],
            hp:          [0, 15, 35, 70, 120]
        },
        ability: {
            name: 'Shadow Strike',
            description: '25% chance to deal triple damage.',
            unlockLevel: 3
        }
    },
    phoenix: {
        name: 'Phoenix',
        description: 'Heals the hero and damages nearby enemies.',
        element: 'fire',
        color: '#ffaa22',
        unlockCost: 2500,
        type: 'support',
        baseStats: {
            damage: 4,
            attackSpeed: 0.6,
            attackRange: 90,
            speed: 120,
            hp: 50
        },
        upgradeCosts: [0, 780, 1630, 3250, 6500],
        levelBonuses: {
            damage:      [0, 3, 7, 14, 24],
            attackSpeed: [0, 0.1, 0.2, 0.3, 0.45],
            hp:          [0, 20, 45, 80, 140]
        },
        ability: {
            name: 'Healing Aura',
            description: 'Heals the hero for 3 HP/s passively.',
            unlockLevel: 2
        },
        healPerSec: [0, 3, 5, 7, 10]
    }
};
