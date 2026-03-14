// Repeatable quests - reset every 2 hours
export const QUEST_RESET_INTERVAL = 2 * 60 * 60 * 1000; // 2 hours in ms

export const QuestData = [
    {
        id: 'kill_30',
        name: 'Monster Slayer',
        description: 'Kill 30 enemies',
        objective: 'kills',
        target: 30,
        rewards: { gold: 70, xp: 30 },
        icon: 'sword'
    },
    {
        id: 'kill_80',
        name: 'Mass Extinction',
        description: 'Kill 80 enemies',
        objective: 'kills',
        target: 80,
        rewards: { gold: 120, xp: 55 },
        icon: 'sword'
    },
    {
        id: 'kill_200',
        name: 'Genocide',
        description: 'Kill 200 enemies',
        objective: 'kills',
        target: 200,
        rewards: { gold: 225, xp: 100 },
        icon: 'sword'
    },
    {
        id: 'waves_10',
        name: 'Defender',
        description: 'Survive 10 waves',
        objective: 'waves',
        target: 10,
        rewards: { gold: 60, xp: 25 },
        icon: 'shield'
    },
    {
        id: 'waves_25',
        name: 'Stronghold',
        description: 'Survive 25 waves',
        objective: 'waves',
        target: 25,
        rewards: { gold: 90, xp: 40 },
        icon: 'shield'
    },
    {
        id: 'waves_50',
        name: 'Unbreakable',
        description: 'Survive 50 waves',
        objective: 'waves',
        target: 50,
        rewards: { gold: 225, xp: 80 },
        icon: 'shield'
    },
    {
        id: 'boss_1',
        name: 'Boss Hunter',
        description: 'Kill 1 boss',
        objective: 'bosses',
        target: 1,
        rewards: { gold: 90, xp: 35 },
        icon: 'star'
    },
    {
        id: 'boss_3',
        name: 'Boss Slayer',
        description: 'Kill 3 bosses',
        objective: 'bosses',
        target: 3,
        rewards: { gold: 150, xp: 60 },
        icon: 'star'
    },
    {
        id: 'hero_kills_20',
        name: 'Warrior',
        description: 'Kill 20 enemies with the hero',
        objective: 'heroKills',
        target: 20,
        rewards: { gold: 85, xp: 40 },
        icon: 'heart'
    },
    {
        id: 'hero_kills_50',
        name: 'Champion',
        description: 'Kill 50 enemies with the hero',
        objective: 'heroKills',
        target: 50,
        rewards: { gold: 180, xp: 70 },
        icon: 'heart'
    },
    {
        id: 'gold_500',
        name: 'Gold Farmer',
        description: 'Earn 500 gold in missions',
        objective: 'goldEarned',
        target: 500,
        rewards: { gold: 85, xp: 35 },
        icon: 'coin'
    },
    {
        id: 'gold_2000',
        name: 'Treasure Hunter',
        description: 'Earn 2000 gold in missions',
        objective: 'goldEarned',
        target: 2000,
        rewards: { gold: 180, xp: 70 },
        icon: 'coin'
    },
    {
        id: 'win_1',
        name: 'Victorious',
        description: 'Win 1 map',
        objective: 'wins',
        target: 1,
        rewards: { gold: 115, xp: 45 },
        icon: 'flag'
    },
    {
        id: 'win_3',
        name: 'Conqueror',
        description: 'Win 3 maps',
        objective: 'wins',
        target: 3,
        rewards: { gold: 225, xp: 100 },
        icon: 'flag'
    }
];
