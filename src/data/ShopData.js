export const ShopData = {
    blacksmith: {
        name: 'Blacksmith',
        categories: ['weapons', 'armors'],
        talk: [
            { text: "I've been forging weapons since before the first goblin invasion. These canyons used to be peaceful, you know.", type: 'lore' },
            { text: "The Dark Knight's armor is nearly impenetrable. Physical attacks barely scratch him — you'll need Lightning towers.", type: 'tip' },
            { text: "Wolves are fast and shrug off arrows. Frost towers slow them down, and they're weak to Ice damage.", type: 'tip' },
            { text: "I once forged a blade for a hero who defeated the Dragon. He said the trick was Ice — dragons hate the cold.", type: 'lore' },
            { text: "Your sword does Physical damage. Against bats, that's almost useless — only half damage. Let your towers handle them.", type: 'tip' },
            { text: "Better gear won't help if you rush in recklessly. Position yourself near your towers and let them do the work.", type: 'tip' },
            { text: "The ore from the mountain pass makes the finest steel. If you can survive that map, you'll earn enough for the best gear.", type: 'lore' },
            { text: "Every weapon I sell is battle-tested. Well... most of them. Don't ask about the God Slayer.", type: 'lore' },
        ]
    },
    elder: {
        name: 'Elder',
        talk: [
            { text: "I've studied the ancient towers for decades. Let me share my knowledge to make them stronger.", type: 'lore' },
            { text: "Research upgrades are permanent. Every tower you build will benefit from your investments.", type: 'tip' },
            { text: "Sharp Arrows and Arcane Power increase base damage. Essential for later waves.", type: 'tip' },
            { text: "The Blast Radius research makes Cannon towers devastating against swarms.", type: 'tip' },
            { text: "Deep Freeze research makes Frost towers slow enemies even more. Nothing gets through.", type: 'tip' },
            { text: "Arc Conductor adds chain targets to Tesla towers. Each level is one more enemy hit.", type: 'tip' },
            { text: "Long ago, five towers were built to guard this land. Archer, Mage, Cannon, Frost, Tesla — each with its own element.", type: 'lore' },
            { text: "Focus your research on the towers you use most. A specialized defense is stronger than a spread one.", type: 'tip' },
        ]
    },
    sage: {
        name: 'Sage',
        talk: [
            { text: "I've spent a lifetime studying the arcane arts. Each skill I teach carries the wisdom of ancient masters.", type: 'lore' },
            { text: "War Cry doesn't just empower you — it boosts all nearby towers. Stand near your strongest towers before activating it.", type: 'tip' },
            { text: "Thunder Strike deals Lightning damage. Bats and the Dark Knight are especially vulnerable to it.", type: 'tip' },
            { text: "The Shield skill absorbs a percentage of damage. Against bosses, it can be the difference between life and death.", type: 'tip' },
            { text: "Passive skills are always active. Commander alone can turn a losing defense into a winning one — it boosts all tower ranges.", type: 'tip' },
            { text: "Gold Find increases the gold enemies drop. Invest in it early for long-term returns.", type: 'tip' },
            { text: "The ancient texts speak of a Dragon that dwells in the castle. It breathes fire and resists it too — only Ice can bring it down.", type: 'lore' },
            { text: "Whirlwind hits everything around you. Perfect for when you're surrounded, but don't use it on a single target.", type: 'tip' },
            { text: "I sense great potential in you. But potential means nothing without practice — fight, learn, and return stronger.", type: 'lore' },
        ]
    },
    merchant: {
        name: 'Merchant',
        categories: ['accessories'],
        talk: [
            { text: "I travel between villages, trading what I find. You'd be surprised what people leave behind on battlefields.", type: 'lore' },
            { text: "You can only wear one accessory at a time. Choose based on the map you're about to play.", type: 'tip' },
            { text: "The Gold Ring pays for itself after a few maps. If you're saving up, it's the smartest investment.", type: 'tip' },
            { text: "Lifesteal heals you based on damage dealt. Combine it with high damage for maximum sustain.", type: 'tip' },
            { text: "The War Banner boosts all your towers by 12%. On a map with many towers, that's massive.", type: 'tip' },
            { text: "Regen Cloak gives 3 HP per second. In a 5-minute battle, that's 900 free HP. Think about it.", type: 'tip' },
            { text: "I found the Infinity Band in the ruins of an ancient tower. Whoever built it must have been incredibly wealthy.", type: 'lore' },
            { text: "A friend of mine tried to fight the Dragon with just the Speed Boots. He ran fast... but not fast enough.", type: 'lore' },
        ]
    },
    beastmaster: {
        name: 'Beast Tamer',
        talk: [
            { text: "Every creature has a soul. I don't tame them — I befriend them. They fight because they choose to.", type: 'lore' },
            { text: "The Wolf Pup is a great starter. Fast and loyal. After a few upgrades, its Frenzy makes it a killing machine.", type: 'tip' },
            { text: "Fire Sprites burn enemies over time. At level 3, their Fireball hits everything nearby. Perfect against swarms.", type: 'tip' },
            { text: "The Frost Fairy slows enemies with every hit. Combined with Frost towers, nothing gets through.", type: 'tip' },
            { text: "Thunder Hawks are the fastest attackers. Their Chain Bolt at level 3 hits two enemies at once.", type: 'tip' },
            { text: "Shadow Cats deal massive damage. One in four attacks deals triple damage — that's their Shadow Strike.", type: 'tip' },
            { text: "The Phoenix is rare and expensive, but it heals you constantly. In long fights, that healing is invaluable.", type: 'tip' },
            { text: "You can only bring one companion to battle. Choose wisely based on the map and enemy types.", type: 'tip' },
            { text: "I found the Phoenix egg in the volcanic caves. It took three months to hatch. Worth every burn.", type: 'lore' },
            { text: "Upgrade your companion regularly. A level 5 pet can deal as much damage as a fully upgraded tower.", type: 'tip' },
        ]
    },
    questboard: {
        talk: [
            { text: "The quest board is maintained by the villagers. They reward those who protect them.", type: 'lore' },
            { text: "Quests reset every 2 hours. Complete them all before the reset for maximum rewards.", type: 'tip' },
            { text: "Kill quests track across all maps. You don't have to finish them in one run.", type: 'tip' },
            { text: "Boss kill quests reward the most. Push to later waves where bosses appear.", type: 'tip' },
            { text: "Gold and XP from quests can make the difference between affording an upgrade or not.", type: 'tip' },
        ]
    }
};
