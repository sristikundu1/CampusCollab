import { Skill } from './skill.model.js';

function escapeRegex(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

export function createSkillService({ SkillModel = Skill } = {}) {
  return {
    async list({ q = '', limit = 50 }) {
      const filter = { status: 'ACTIVE' };
      if (q) filter.name = { $regex: escapeRegex(q), $options: 'i' };
      const skills = await SkillModel.find(filter).sort({ category: 1, name: 1 }).limit(limit).lean();
      return skills.map((skill) => ({ id: String(skill._id), name: skill.name, category: skill.category }));
    },
  };
}
