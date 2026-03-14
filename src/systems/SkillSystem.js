import { SkillData } from '../data/SkillData.js';

export class SkillSystem {
    static canLearn(skillId, playerData) {
        const allSkills = { ...SkillData.active, ...SkillData.passive };
        const skill = allSkills[skillId];
        if (!skill) return false;

        const currentLevel = playerData.skills[skillId] || 0;
        if (currentLevel >= skill.maxLevel) return false;

        const cost = skill.cost[currentLevel];
        return playerData.skillPoints >= cost;
    }

    static learnSkill(skillId, playerData) {
        if (!this.canLearn(skillId, playerData)) return false;

        const allSkills = { ...SkillData.active, ...SkillData.passive };
        const skill = allSkills[skillId];
        const currentLevel = playerData.skills[skillId] || 0;
        const cost = skill.cost[currentLevel];

        playerData.skillPoints -= cost;
        playerData.skills[skillId] = currentLevel + 1;
        return true;
    }

    static getSkillInfo(skillId) {
        return SkillData.active[skillId] || SkillData.passive[skillId] || null;
    }

    static getLearnedActiveSkills(playerData) {
        const result = [];
        for (const [id, data] of Object.entries(SkillData.active)) {
            if (playerData.skills[id] > 0) {
                result.push({ id, ...data, level: playerData.skills[id] });
            }
        }
        return result;
    }
}
