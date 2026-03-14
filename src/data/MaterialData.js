// Materials dropped by enemies and earned from runs
export const Materials = {
    wood:        { name: 'Wood',         color: '#8B5A2B', icon: 'wood' },
    stone:       { name: 'Stone',        color: '#888888', icon: 'stone' },
    iron:        { name: 'Iron',         color: '#aabbcc', icon: 'iron' },
    crystal:     { name: 'Crystal',      color: '#aa66ff', icon: 'crystal' },
    darkEssence: { name: 'Dark Essence', color: '#662288', icon: 'essence' }
};

// Drop tables per enemy type
// Each entry: { material, chance (0-1), min, max }
export const EnemyDropTable = {
    goblin:     [{ mat: 'wood', chance: 0.45, min: 1, max: 3 }],
    wolf:       [{ mat: 'wood', chance: 0.35, min: 1, max: 1 }, { mat: 'stone', chance: 0.25, min: 1, max: 1 }],
    orc:        [{ mat: 'stone', chance: 0.50, min: 1, max: 3 }, { mat: 'iron', chance: 0.25, min: 1, max: 1 }],
    bat:        [{ mat: 'wood', chance: 0.30, min: 1, max: 1 }, { mat: 'crystal', chance: 0.12, min: 1, max: 1 }],
    shaman:     [{ mat: 'crystal', chance: 0.40, min: 1, max: 2 }, { mat: 'iron', chance: 0.30, min: 1, max: 1 }],
    goblinKing: [{ mat: 'iron', chance: 1.0, min: 2, max: 4 }, { mat: 'crystal', chance: 0.6, min: 1, max: 2 }, { mat: 'darkEssence', chance: 0.4, min: 1, max: 1 }],
    darkKnight: [{ mat: 'iron', chance: 1.0, min: 3, max: 5 }, { mat: 'darkEssence', chance: 0.7, min: 1, max: 2 }, { mat: 'crystal', chance: 0.5, min: 1, max: 2 }],
    dragon:     [{ mat: 'darkEssence', chance: 1.0, min: 2, max: 4 }, { mat: 'crystal', chance: 1.0, min: 2, max: 3 }, { mat: 'iron', chance: 1.0, min: 3, max: 5 }]
};

// Bonus materials for completing a run (based on waves cleared)
export function getRunBonusMaterials(wavesCleared, victory) {
    const mats = {};
    // Wood & stone scale with waves
    mats.wood = Math.floor(wavesCleared * 1.0) + 3;
    mats.stone = Math.floor(wavesCleared * 0.7) + 2;
    // Iron from wave 5+
    if (wavesCleared >= 5) {
        mats.iron = Math.floor((wavesCleared - 4) * 0.5) + 2;
    }
    // Crystal from wave 10+
    if (wavesCleared >= 10) {
        mats.crystal = Math.floor((wavesCleared - 9) * 0.4) + 1;
    }
    // Dark Essence from wave 15+ or victory
    if (wavesCleared >= 15 || victory) {
        mats.darkEssence = victory ? Math.floor(wavesCleared * 0.2) + 1 : 1;
    }
    return mats;
}

// Roll drops for an enemy kill
export function rollEnemyDrops(enemyType) {
    const table = EnemyDropTable[enemyType];
    if (!table) return {};
    const drops = {};
    for (const entry of table) {
        if (Math.random() < entry.chance) {
            drops[entry.mat] = (drops[entry.mat] || 0) + entry.min + Math.floor(Math.random() * (entry.max - entry.min + 1));
        }
    }
    return drops;
}
