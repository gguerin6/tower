import { randomChoice, randomInt } from '../utils/MathUtils.js';
import { BalanceConfig } from './BalanceConfig.js';

// Wave format: { enemies: [{type, count}], boss?: 'bossType' }
// Element forcing strategy:
//   goblin: weak fire → cannon needed
//   wolf: weak ice → frost needed
//   bat: weak lightning → tesla needed
//   orc: weak lightning+magic → tesla+mage needed
//   shaman: weak fire+physical → cannon+archer needed, resists magic
//   demolisher: weak fire+magic → cannon+mage needed, resists ice
// Each map should introduce combos that force diverse towers

export const WaveData = {
    // ── FOREST (20 waves) ──
    // Player level ~1-3, learning basics
    // Teaches: archer → cannon (fire vs goblins) → mage (vs armor) → frost (vs wolves)
    forest: [
        { enemies: [{ type: 'goblin', count: 4 }] },                                          // W1: gentle intro
        { enemies: [{ type: 'goblin', count: 5 }, { type: 'wolf', count: 1 }] },              // W2: wolf intro — ice needed
        { enemies: [{ type: 'goblin', count: 4 }, { type: 'wolf', count: 3 }] },              // W3: more wolves
        { enemies: [{ type: 'wolf', count: 5 }, { type: 'goblin', count: 3 }] },              // W4: wolf pressure — frost crucial
        { enemies: [{ type: 'goblin', count: 6 }, { type: 'wolf', count: 4 }] },              // W5: need fire+ice mix
        { enemies: [{ type: 'bat', count: 4 }, { type: 'goblin', count: 4 }] },               // W6: bats — archers useless, need mage/tesla
        { enemies: [{ type: 'wolf', count: 5 }, { type: 'bat', count: 4 }] },                 // W7: ice+lightning needed
        { enemies: [{ type: 'orc', count: 1 }, { type: 'goblin', count: 5 }, { type: 'wolf', count: 3 }] }, // W8: first orc — armor! mage shines
        { enemies: [{ type: 'bat', count: 6 }, { type: 'orc', count: 1 }, { type: 'wolf', count: 4 }] },   // W9: need all elements
        { enemies: [{ type: 'orc', count: 2 }, { type: 'wolf', count: 5 }, { type: 'goblin', count: 4 }], boss: 'goblinKing' }, // W10: boss — magic weakness
        { enemies: [{ type: 'orc', count: 3 }, { type: 'bat', count: 5 }, { type: 'wolf', count: 4 }] },   // W11: bat+orc = need tesla+mage
        { enemies: [{ type: 'goblin', count: 8 }, { type: 'orc', count: 2 }, { type: 'bat', count: 3 }] }, // W12: swarm + tank
        { enemies: [{ type: 'shaman', count: 1 }, { type: 'orc', count: 3 }, { type: 'wolf', count: 4 }] }, // W13: shaman resists magic! need fire
        { enemies: [{ type: 'bat', count: 7 }, { type: 'wolf', count: 6 }, { type: 'orc', count: 2 }] },   // W14: speed+flying — tesla essential
        { enemies: [{ type: 'orc', count: 4 }, { type: 'shaman', count: 2 }, { type: 'bat', count: 4 }] }, // W15: heal+tank+fly — diverse towers required
        { enemies: [{ type: 'wolf', count: 8 }, { type: 'bat', count: 6 }] },                // W16: speed rush — frost+tesla
        { enemies: [{ type: 'orc', count: 5 }, { type: 'shaman', count: 2 }, { type: 'wolf', count: 4 }] }, // W17: tanky+heal
        { enemies: [{ type: 'bat', count: 10 }, { type: 'wolf', count: 6 }, { type: 'orc', count: 2 }] },  // W18: overwhelming speed
        { enemies: [{ type: 'orc', count: 5 }, { type: 'shaman', count: 3 }, { type: 'bat', count: 5 }] }, // W19: everything
        { enemies: [{ type: 'orc', count: 6 }, { type: 'shaman', count: 3 }, { type: 'wolf', count: 5 }, { type: 'bat', count: 4 }], boss: 'goblinKing' }  // W20: all types
    ],

    // ── DESERT (24 waves) ──
    // Player level ~4-8, harder compositions
    // Key: orc swarms need tesla, shaman walls need fire, bat clouds need lightning
    desert: [
        { enemies: [{ type: 'orc', count: 2 }, { type: 'goblin', count: 4 }] },
        { enemies: [{ type: 'wolf', count: 5 }, { type: 'bat', count: 3 }] },                 // speed wave
        { enemies: [{ type: 'orc', count: 3 }, { type: 'shaman', count: 1 }] },               // tank+heal early
        { enemies: [{ type: 'bat', count: 7 }, { type: 'wolf', count: 4 }] },                 // lightning essential
        { enemies: [{ type: 'shaman', count: 2 }, { type: 'orc', count: 3 }, { type: 'goblin', count: 3 }] }, // shaman resists magic
        { enemies: [{ type: 'wolf', count: 6 }, { type: 'bat', count: 5 }] },                 // frost+tesla combo
        { enemies: [{ type: 'orc', count: 4 }, { type: 'shaman', count: 2 }] },               // heavy tank
        { enemies: [{ type: 'bat', count: 8 }, { type: 'goblin', count: 5 }] },               // mass flyers
        { enemies: [{ type: 'orc', count: 4 }, { type: 'wolf', count: 5 }, { type: 'bat', count: 3 }] }, // diverse
        { enemies: [{ type: 'shaman', count: 3 }, { type: 'orc', count: 4 }] },               // heal wall
        { enemies: [{ type: 'wolf', count: 7 }, { type: 'bat', count: 6 }] },                 // pure speed
        { enemies: [{ type: 'orc', count: 5 }, { type: 'shaman', count: 2 }, { type: 'bat', count: 4 }], boss: 'goblinKing' }, // W12: boss
        { enemies: [{ type: 'bat', count: 9 }, { type: 'wolf', count: 5 }] },                 // post-boss speed
        { enemies: [{ type: 'shaman', count: 3 }, { type: 'orc', count: 5 }] },               // heal wall
        { enemies: [{ type: 'orc', count: 5 }, { type: 'bat', count: 6 }, { type: 'wolf', count: 4 }] }, // everything fast
        { enemies: [{ type: 'wolf', count: 8 }, { type: 'shaman', count: 3 }] },              // frost vs wolves, fire vs shaman
        { enemies: [{ type: 'orc', count: 6 }, { type: 'bat', count: 5 }, { type: 'shaman', count: 2 }] }, // tank+fly+heal
        { enemies: [{ type: 'bat', count: 10 }, { type: 'orc', count: 4 }] },                 // flyer swarm
        { enemies: [{ type: 'shaman', count: 4 }, { type: 'orc', count: 5 }, { type: 'wolf', count: 3 }] }, // heal heavy
        { enemies: [{ type: 'wolf', count: 8 }, { type: 'bat', count: 7 }] },                 // pure speed
        { enemies: [{ type: 'orc', count: 6 }, { type: 'shaman', count: 3 }, { type: 'bat', count: 5 }] }, // diverse tank
        { enemies: [{ type: 'bat', count: 10 }, { type: 'wolf', count: 6 }, { type: 'orc', count: 3 }] }, // overwhelming
        { enemies: [{ type: 'shaman', count: 4 }, { type: 'orc', count: 6 }, { type: 'wolf', count: 5 }] }, // pre-boss
        { enemies: [{ type: 'orc', count: 7 }, { type: 'shaman', count: 4 }, { type: 'bat', count: 5 }], boss: 'darkKnight' } // W24: DK resists physical+fire
    ],

    // ── MOUNTAIN (28 waves) ──
    // Player level ~8-14, frost tower essential, orc/bat combos
    mountain: [
        { enemies: [{ type: 'orc', count: 3 }, { type: 'wolf', count: 3 }] },
        { enemies: [{ type: 'bat', count: 6 }, { type: 'goblin', count: 4 }] },
        { enemies: [{ type: 'orc', count: 4 }, { type: 'shaman', count: 1 }] },
        { enemies: [{ type: 'bat', count: 7 }, { type: 'wolf', count: 5 }] },                 // speed wave
        { enemies: [{ type: 'shaman', count: 2 }, { type: 'orc', count: 4 }] },
        { enemies: [{ type: 'orc', count: 4 }, { type: 'bat', count: 5 }, { type: 'wolf', count: 3 }], boss: 'goblinKing' }, // W6
        { enemies: [{ type: 'wolf', count: 7 }, { type: 'shaman', count: 2 }] },
        { enemies: [{ type: 'orc', count: 5 }, { type: 'bat', count: 6 }] },                  // tank+fly
        { enemies: [{ type: 'shaman', count: 3 }, { type: 'orc', count: 5 }, { type: 'wolf', count: 3 }] }, // heal+tank+speed
        { enemies: [{ type: 'bat', count: 9 }, { type: 'orc', count: 4 }] },                  // flyer rush
        { enemies: [{ type: 'orc', count: 6 }, { type: 'wolf', count: 5 }] },
        { enemies: [{ type: 'shaman', count: 3 }, { type: 'bat', count: 7 }, { type: 'orc', count: 4 }] }, // everything
        { enemies: [{ type: 'wolf', count: 8 }, { type: 'bat', count: 6 }] },                 // double speed
        { enemies: [{ type: 'orc', count: 6 }, { type: 'shaman', count: 3 }, { type: 'bat', count: 4 }], boss: 'darkKnight' }, // W14: DK
        { enemies: [{ type: 'bat', count: 10 }, { type: 'wolf', count: 6 }] },                // post-boss speed
        { enemies: [{ type: 'shaman', count: 4 }, { type: 'orc', count: 6 }] },
        { enemies: [{ type: 'orc', count: 6 }, { type: 'bat', count: 6 }, { type: 'wolf', count: 4 }] },
        { enemies: [{ type: 'wolf', count: 9 }, { type: 'shaman', count: 3 }] },
        { enemies: [{ type: 'orc', count: 7 }, { type: 'bat', count: 7 }] },                  // heavy
        { enemies: [{ type: 'shaman', count: 4 }, { type: 'orc', count: 6 }, { type: 'wolf', count: 5 }] },
        { enemies: [{ type: 'bat', count: 10 }, { type: 'wolf', count: 8 }] },                // mass speed
        { enemies: [{ type: 'orc', count: 7 }, { type: 'shaman', count: 4 }, { type: 'bat', count: 5 }] },
        { enemies: [{ type: 'wolf', count: 9 }, { type: 'orc', count: 6 }] },
        { enemies: [{ type: 'shaman', count: 4 }, { type: 'bat', count: 8 }, { type: 'orc', count: 4 }] },
        { enemies: [{ type: 'orc', count: 8 }, { type: 'wolf', count: 6 }, { type: 'bat', count: 5 }] },
        { enemies: [{ type: 'shaman', count: 5 }, { type: 'orc', count: 7 }] },
        { enemies: [{ type: 'wolf', count: 10 }, { type: 'bat', count: 8 }] },                // massive speed
        { enemies: [{ type: 'orc', count: 8 }, { type: 'shaman', count: 5 }, { type: 'bat', count: 6 }], boss: 'darkKnight' } // W28
    ],

    // ── SWAMP (32 waves) ──
    // Player level ~14-20, shaman-heavy, requires fire+physical towers
    // Shamans resist magic heavily — mage towers weak here, need cannon+archer
    swamp: [
        { enemies: [{ type: 'bat', count: 5 }, { type: 'wolf', count: 4 }] },
        { enemies: [{ type: 'shaman', count: 2 }, { type: 'orc', count: 3 }] },
        { enemies: [{ type: 'wolf', count: 6 }, { type: 'bat', count: 5 }] },
        { enemies: [{ type: 'orc', count: 4 }, { type: 'shaman', count: 2 }, { type: 'bat', count: 3 }] },
        { enemies: [{ type: 'bat', count: 8 }, { type: 'wolf', count: 4 }] },
        { enemies: [{ type: 'shaman', count: 3 }, { type: 'orc', count: 4 }] },               // shaman wall — mage useless
        { enemies: [{ type: 'orc', count: 5 }, { type: 'bat', count: 5 }], boss: 'goblinKing' }, // W7
        { enemies: [{ type: 'bat', count: 8 }, { type: 'shaman', count: 3 }] },               // fly+heal
        { enemies: [{ type: 'wolf', count: 7 }, { type: 'orc', count: 5 }] },
        { enemies: [{ type: 'orc', count: 6 }, { type: 'shaman', count: 3 }, { type: 'bat', count: 4 }] },
        { enemies: [{ type: 'bat', count: 10 }, { type: 'shaman', count: 3 }] },              // fly+heal
        { enemies: [{ type: 'orc', count: 6 }, { type: 'wolf', count: 6 }] },
        { enemies: [{ type: 'shaman', count: 4 }, { type: 'orc', count: 5 }, { type: 'bat', count: 4 }] },
        { enemies: [{ type: 'wolf', count: 8 }, { type: 'bat', count: 7 }] },                 // speed rush
        { enemies: [{ type: 'orc', count: 7 }, { type: 'shaman', count: 4 }], boss: 'darkKnight' }, // W15
        { enemies: [{ type: 'bat', count: 10 }, { type: 'wolf', count: 7 }] },
        { enemies: [{ type: 'orc', count: 7 }, { type: 'shaman', count: 4 }, { type: 'bat', count: 3 }] },
        { enemies: [{ type: 'wolf', count: 9 }, { type: 'orc', count: 6 }] },
        { enemies: [{ type: 'shaman', count: 5 }, { type: 'bat', count: 8 }] },               // heal+fly
        { enemies: [{ type: 'orc', count: 8 }, { type: 'shaman', count: 4 }, { type: 'wolf', count: 4 }] },
        { enemies: [{ type: 'wolf', count: 10 }, { type: 'bat', count: 8 }] },
        { enemies: [{ type: 'orc', count: 8 }, { type: 'shaman', count: 5 }], boss: 'goblinKing' }, // W22
        { enemies: [{ type: 'bat', count: 12 }, { type: 'wolf', count: 7 }] },
        { enemies: [{ type: 'shaman', count: 5 }, { type: 'orc', count: 7 }, { type: 'bat', count: 4 }] },
        { enemies: [{ type: 'orc', count: 9 }, { type: 'wolf', count: 7 }] },
        { enemies: [{ type: 'bat', count: 12 }, { type: 'shaman', count: 5 }] },
        { enemies: [{ type: 'orc', count: 9 }, { type: 'wolf', count: 6 }, { type: 'bat', count: 5 }] },
        { enemies: [{ type: 'shaman', count: 6 }, { type: 'orc', count: 8 }] },               // heal fortress
        { enemies: [{ type: 'orc', count: 10 }, { type: 'bat', count: 8 }] },
        { enemies: [{ type: 'wolf', count: 10 }, { type: 'shaman', count: 5 }, { type: 'orc', count: 6 }] },
        { enemies: [{ type: 'shaman', count: 6 }, { type: 'orc', count: 10 }, { type: 'bat', count: 6 }] },
        { enemies: [{ type: 'orc', count: 10 }, { type: 'shaman', count: 6 }, { type: 'bat', count: 6 }, { type: 'wolf', count: 5 }], boss: 'dragon' } // W32: dragon weak to ice
    ],

    // ── CASTLE (36 waves) ──
    // Player level ~22-30, endgame, demolishers, triple boss, all tower types needed
    castle: [
        { enemies: [{ type: 'orc', count: 4 }, { type: 'shaman', count: 2 }, { type: 'bat', count: 3 }] },       // W1
        { enemies: [{ type: 'wolf', count: 7 }, { type: 'bat', count: 6 }] },                                      // W2: speed
        { enemies: [{ type: 'orc', count: 5 }, { type: 'shaman', count: 2 }, { type: 'wolf', count: 3 }] },       // W3
        { enemies: [{ type: 'bat', count: 9 }, { type: 'orc', count: 4 }] },                                       // W4: flyer rush
        { enemies: [{ type: 'demolisher', count: 1 }, { type: 'orc', count: 5 }, { type: 'shaman', count: 2 }] },  // W5: demolisher intro
        { enemies: [{ type: 'orc', count: 6 }, { type: 'bat', count: 5 }, { type: 'wolf', count: 4 }], boss: 'goblinKing' }, // W6
        { enemies: [{ type: 'bat', count: 10 }, { type: 'shaman', count: 3 }, { type: 'wolf', count: 4 }] },       // W7
        { enemies: [{ type: 'demolisher', count: 1 }, { type: 'orc', count: 6 }, { type: 'shaman', count: 3 }] },  // W8
        { enemies: [{ type: 'wolf', count: 8 }, { type: 'orc', count: 5 }, { type: 'bat', count: 4 }] },           // W9
        { enemies: [{ type: 'demolisher', count: 2 }, { type: 'orc', count: 6 }, { type: 'shaman', count: 3 }] },  // W10
        { enemies: [{ type: 'orc', count: 7 }, { type: 'bat', count: 6 }, { type: 'shaman', count: 3 }], boss: 'darkKnight' }, // W11
        { enemies: [{ type: 'bat', count: 10 }, { type: 'wolf', count: 8 }] },                                     // W12: speed
        { enemies: [{ type: 'demolisher', count: 2 }, { type: 'shaman', count: 4 }, { type: 'orc', count: 6 }] },  // W13
        { enemies: [{ type: 'orc', count: 8 }, { type: 'wolf', count: 6 }, { type: 'bat', count: 5 }] },           // W14
        { enemies: [{ type: 'demolisher', count: 2 }, { type: 'shaman', count: 4 }, { type: 'orc', count: 7 }] },  // W15
        { enemies: [{ type: 'wolf', count: 9 }, { type: 'bat', count: 8 }] },                                      // W16: mass speed
        { enemies: [{ type: 'demolisher', count: 3 }, { type: 'orc', count: 7 }, { type: 'shaman', count: 4 }], boss: 'darkKnight' }, // W17
        { enemies: [{ type: 'bat', count: 12 }, { type: 'orc', count: 6 }, { type: 'wolf', count: 4 }] },          // W18
        { enemies: [{ type: 'demolisher', count: 2 }, { type: 'shaman', count: 5 }, { type: 'wolf', count: 7 }] }, // W19
        { enemies: [{ type: 'demolisher', count: 3 }, { type: 'orc', count: 8 }, { type: 'bat', count: 6 }] },     // W20
        { enemies: [{ type: 'wolf', count: 10 }, { type: 'bat', count: 10 }] },                                    // W21: speed hell
        { enemies: [{ type: 'demolisher', count: 3 }, { type: 'orc', count: 8 }, { type: 'shaman', count: 5 }], boss: 'goblinKing' }, // W22
        { enemies: [{ type: 'bat', count: 12 }, { type: 'wolf', count: 8 }, { type: 'orc', count: 4 }] },          // W23
        { enemies: [{ type: 'demolisher', count: 3 }, { type: 'shaman', count: 5 }, { type: 'orc', count: 7 }] },  // W24
        { enemies: [{ type: 'demolisher', count: 4 }, { type: 'orc', count: 9 }, { type: 'bat', count: 8 }] },     // W25
        { enemies: [{ type: 'wolf', count: 10 }, { type: 'orc', count: 8 }, { type: 'shaman', count: 3 }] },       // W26
        { enemies: [{ type: 'demolisher', count: 4 }, { type: 'shaman', count: 6 }, { type: 'orc', count: 8 }] },  // W27
        { enemies: [{ type: 'orc', count: 10 }, { type: 'bat', count: 8 }, { type: 'wolf', count: 6 }] },          // W28
        { enemies: [{ type: 'demolisher', count: 4 }, { type: 'bat', count: 10 }, { type: 'shaman', count: 5 }] }, // W29
        { enemies: [{ type: 'demolisher', count: 3 }, { type: 'wolf', count: 10 }, { type: 'orc', count: 8 }] },   // W30
        { enemies: [{ type: 'demolisher', count: 5 }, { type: 'orc', count: 10 }, { type: 'shaman', count: 6 }] }, // W31
        { enemies: [{ type: 'shaman', count: 7 }, { type: 'wolf', count: 10 }, { type: 'bat', count: 6 }] },       // W32
        { enemies: [{ type: 'demolisher', count: 5 }, { type: 'orc', count: 11 }, { type: 'bat', count: 8 }] },    // W33
        { enemies: [{ type: 'demolisher', count: 4 }, { type: 'shaman', count: 7 }, { type: 'orc', count: 10 }] }, // W34
        { enemies: [{ type: 'demolisher', count: 5 }, { type: 'orc', count: 12 }, { type: 'bat', count: 8 }, { type: 'shaman', count: 5 }] }, // W35
        { enemies: [{ type: 'demolisher', count: 6 }, { type: 'orc', count: 12 }, { type: 'shaman', count: 8 }, { type: 'bat', count: 6 }], boss: 'dragon' }  // W36
    ]
};

export function generateInfiniteWave(waveNum) {
    const types = ['goblin', 'wolf', 'orc', 'bat', 'shaman', 'demolisher'];
    const scaling = BalanceConfig.INFINITE_SCALING;
    const hpMult = Math.pow(scaling.hpMult, waveNum - 1);
    const speedMult = Math.pow(scaling.speedMult, waveNum - 1);
    const goldMult = Math.pow(scaling.goldMult, waveNum - 1);
    const armorMult = Math.pow(scaling.armorMult || 1, waveNum - 1);
    const dmgMult = Math.pow(scaling.dmgMult || 1, waveNum - 1);

    const numTypes = Math.min(1 + Math.floor(waveNum / 3), 3);
    const enemies = [];
    for (let i = 0; i < numTypes; i++) {
        enemies.push({
            type: randomChoice(types),
            count: 4 + Math.floor(waveNum * 1.2)
        });
    }

    const wave = { enemies, scaling: { hpMult, speedMult, goldMult, armorMult, dmgMult } };

    // Boss every 5 waves
    if (waveNum % 5 === 0) {
        const bosses = ['goblinKing', 'darkKnight', 'dragon'];
        wave.boss = bosses[Math.min(Math.floor(waveNum / 10), bosses.length - 1)];
    }

    return wave;
}
