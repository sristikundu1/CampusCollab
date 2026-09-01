import { Skill } from "./skill.model.js";

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function createSkillService({ SkillModel = Skill } = {}) {
  const serialize = (skill) => ({
    id: String(skill._id),
    name: skill.name,
    category: skill.category,
  });
  return {
    async list({ q = "", limit = 50 }) {
      const filter = { status: "ACTIVE" };
      if (q) filter.name = { $regex: escapeRegex(q), $options: "i" };
      const skills = await SkillModel.find(filter)
        .sort({ category: 1, name: 1 })
        .limit(limit)
        .lean();
      return skills.map(serialize);
    },
    async create(userId, input) {
      const name = input.name.normalize("NFKC").replace(/\s+/g, " ").trim();
      const normalizedName = name.toLocaleLowerCase("en");
      const existing = await SkillModel.findOne({
        normalizedName,
        status: "ACTIVE",
      }).lean();
      if (existing) return { skill: serialize(existing), created: false };
      try {
        const skill = await SkillModel.create({
          name,
          normalizedName,
          category: input.category,
          createdByUserId: userId,
          updatedByUserId: userId,
        });
        return { skill: serialize(skill), created: true };
      } catch (error) {
        if (error?.code !== 11000) throw error;
        const duplicate = await SkillModel.findOne({
          normalizedName,
          status: "ACTIVE",
        }).lean();
        if (!duplicate) throw error;
        return { skill: serialize(duplicate), created: false };
      }
    },
  };
}
