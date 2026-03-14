export const SkillData = {
    active: {
        whirlwind: {
            name: 'Whirlwind',
            description: 'Spin attack hitting all nearby enemies',
            cost: [1, 1, 2, 2, 3],
            maxLevel: 5,
            cooldown: [8, 7, 6, 5, 4],
            damage: [30, 50, 80, 120, 175],
            radius: [60, 70, 80, 90, 100],
            type: 'active',
            key: '&'
        },
        warCry: {
            name: 'War Cry',
            description: 'Boost nearby tower damage',
            cost: [1, 2, 2, 3, 3],
            maxLevel: 5,
            cooldown: [15, 13, 11, 9, 7],
            duration: [5, 6, 7, 8, 10],
            damageBuff: [0.2, 0.35, 0.5, 0.65, 0.8],
            radius: [120, 140, 160, 180, 200],
            type: 'active',
            key: 'é'
        },
        heal: {
            name: 'Heal',
            description: 'Restore health',
            cost: [1, 1, 1, 2, 2],
            maxLevel: 5,
            cooldown: [12, 10, 8, 7, 5],
            healAmount: [30, 50, 80, 120, 180],
            type: 'active',
            key: '"'
        },
        thunderStrike: {
            name: 'Thunder Strike',
            description: 'Lightning bolt at target location',
            cost: [2, 2, 3, 3, 4],
            maxLevel: 5,
            cooldown: [10, 8, 7, 6, 5],
            damage: [50, 80, 120, 180, 260],
            radius: [50, 60, 70, 80, 90],
            type: 'active',
            key: "'"
        },
        shield: {
            name: 'Shield Wall',
            description: 'Block incoming damage',
            cost: [1, 2, 2, 3, 3],
            maxLevel: 5,
            cooldown: [20, 18, 15, 13, 10],
            duration: [3, 4, 5, 6, 8],
            damageReduction: [0.5, 0.65, 0.8, 0.88, 0.95],
            type: 'active',
            key: '('
        }
    },
    passive: {
        toughness: {
            name: 'Toughness',
            description: '+15% HP per level',
            cost: [1, 1, 2, 2, 3],
            maxLevel: 5,
            hpBonus: [0.15, 0.30, 0.50, 0.75, 1.0],
            type: 'passive'
        },
        swiftBlade: {
            name: 'Swift Blade',
            description: '+10% attack speed per level',
            cost: [1, 1, 2, 2, 3],
            maxLevel: 5,
            attackSpeedBonus: [0.10, 0.22, 0.35, 0.48, 0.60],
            type: 'passive'
        },
        goldFind: {
            name: 'Gold Find',
            description: '+10% gold from kills per level',
            cost: [1, 1, 1, 2, 2],
            maxLevel: 5,
            goldBonus: [0.10, 0.22, 0.35, 0.50, 0.70],
            type: 'passive'
        },
        ironSkin: {
            name: 'Iron Skin',
            description: '+5 armor per level',
            cost: [1, 2, 2, 3, 3],
            maxLevel: 5,
            armorBonus: [5, 12, 20, 30, 42],
            type: 'passive'
        },
        commander: {
            name: 'Commander',
            description: '+5% tower range per level',
            cost: [2, 2, 3, 3, 4],
            maxLevel: 5,
            towerRangeBonus: [0.05, 0.12, 0.20, 0.28, 0.38],
            type: 'passive'
        }
    }
};
