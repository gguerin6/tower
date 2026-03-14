// Element colors for UI display
export const ElementColors = {
    physical: '#c8a060',
    magic:    '#aa66ff',
    fire:     '#ff6622',
    ice:      '#44ccff',
    lightning:'#ffee33'
};

export const ElementNames = {
    physical: 'Physical',
    magic:    'Magic',
    fire:     'Fire',
    ice:      'Ice',
    lightning:'Lightning'
};

export const TowerData = {
    archer: {
        name: 'Archer Tower',
        description: 'Fast attacks, single target',
        element: 'physical',
        cost: 50,
        damage: [12, 17, 23, 30],
        range: [135, 148, 160, 175],
        cooldown: [0.8, 0.72, 0.64, 0.55],
        projectileSpeed: 300,
        projectileColor: '#a67c52',
        color: '#8B4513',
        targetMode: 'first'
    },
    mage: {
        name: 'Mage Tower',
        description: 'Magic damage, ignores armor, poisons',
        element: 'magic',
        cost: 80,
        damage: [18, 25, 34, 44],
        range: [120, 130, 142, 155],
        cooldown: [1.2, 1.05, 0.92, 0.8],
        projectileSpeed: 200,
        projectileColor: '#88f',
        color: '#446',
        targetMode: 'strongest',
        ignoreArmor: true,
        poisonDps: [2, 4, 6, 9],
        poisonDuration: [3, 3, 3.5, 4]
    },
    cannon: {
        name: 'Cannon Tower',
        description: 'Fire AoE, burns enemies',
        element: 'fire',
        cost: 100,
        damage: [28, 38, 50, 65],
        range: [110, 120, 132, 145],
        cooldown: [2.0, 1.8, 1.6, 1.4],
        projectileSpeed: 180,
        projectileColor: '#333',
        color: '#555',
        targetMode: 'closest',
        splash: [40, 46, 53, 60],
        splashDamagePct: 0.45,
        burnDps: [3, 5, 8, 12],
        burnDuration: [2, 2.5, 3, 3.5]
    },
    frost: {
        name: 'Frost Tower',
        description: 'Ice damage, slows enemies',
        element: 'ice',
        cost: 70,
        damage: [8, 12, 16, 22],
        range: [120, 130, 142, 155],
        cooldown: [1.0, 0.9, 0.8, 0.7],
        projectileSpeed: 250,
        projectileColor: '#adf',
        color: '#8bf',
        targetMode: 'first',
        slowAmount: [0.25, 0.30, 0.37, 0.45],
        slowDuration: [1.5, 1.8, 2.1, 2.5]
    },
    tesla: {
        name: 'Tesla Tower',
        description: 'Lightning chains, multi-hit',
        element: 'lightning',
        cost: 130,
        damage: [14, 19, 26, 34],
        range: [110, 120, 132, 145],
        cooldown: [1.5, 1.3, 1.15, 1.0],
        projectileSpeed: 0, // instant
        projectileColor: '#ff0',
        color: '#888',
        targetMode: 'closest',
        chainTargets: [2, 3, 3, 4],
        chainRange: [60, 66, 73, 80]
    }
};
