export const BalanceConfig = {
    START_GOLD: 150,
    START_LIVES: 20,
    HERO_BASE_HP: 120,
    HERO_BASE_DAMAGE: 12,
    HERO_BASE_ARMOR: 3,
    HERO_BASE_SPEED: 110,
    HERO_BASE_REGEN: 1.0,   // HP per second
    HERO_ATTACK_RANGE: 55,
    HERO_ATTACK_COOLDOWN: 0.85,
    HERO_RESPAWN_TIME: 5,
    HERO_RESPAWN_COST: 0,

    ARMOR_FORMULA: (rawDmg, armor) => rawDmg * (100 / (100 + armor)),

    TOWER_SELL_RATIO: 0.6,
    TOWER_UPGRADE_COST_MULT: 2.0,
    TOWER_MAX_LEVEL: 4,

    WAVE_DELAY: 15,        // seconds between waves
    WAVE_SPAWN_INTERVAL: 0.5,

    ENEMY_GOLD_BASE: 5,
    BOSS_GOLD_MULT: 10,

    // Per-wave stat scaling within a map run (compound per wave)
    // Makes later waves progressively harder even with same enemy types
    MAP_WAVE_SCALING: {
        forest:   { hpPerWave: 0.04, armorPerWave: 0.03, speedPerWave: 0.01, dmgPerWave: 0.02 },
        desert:   { hpPerWave: 0.05, armorPerWave: 0.035, speedPerWave: 0.01, dmgPerWave: 0.025 },
        mountain: { hpPerWave: 0.055, armorPerWave: 0.04, speedPerWave: 0.012, dmgPerWave: 0.03 },
        swamp:    { hpPerWave: 0.06, armorPerWave: 0.045, speedPerWave: 0.012, dmgPerWave: 0.03 },
        castle:   { hpPerWave: 0.065, armorPerWave: 0.05, speedPerWave: 0.015, dmgPerWave: 0.035 }
    },

    INFINITE_SCALING: {
        hpMult: 1.14,
        speedMult: 1.015,
        goldMult: 1.05,
        armorMult: 1.06,
        dmgMult: 1.04
    },

    CRIT_CHANCE: 0.08,
    CRIT_MULT: 1.5,

    SYNERGY_BONUS: 0.05,  // +5% damage per unique adjacent tower type

    XP_PER_KILL: 8,
    XP_LEVEL_BASE: 100,
    XP_LEVEL_MULT: 1.45,
    XP_PER_WAVE: 14,
    MAX_LEVEL: 30,
    SKILL_POINTS_PER_LEVEL: 1
};
