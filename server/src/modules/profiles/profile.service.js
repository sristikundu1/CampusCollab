import { ConflictError, NotFoundError, RequestValidationError } from '../../errors/application-error.js';
import { UniversityAffiliation } from '../university/university-affiliation.model.js';
import { University } from '../university/university.model.js';
import { Skill } from '../skills/skill.model.js';
import { PortfolioItem } from './portfolio-item.model.js';
import { Profile } from './profile.model.js';
import { calculateProfileCompletion } from './profile-completion.js';

const clean = (value) => value === undefined ? undefined : value;
const toDate = (value) => value ? new Date(value) : value === null ? undefined : undefined;

export function createProfileService({
  ProfileModel = Profile, PortfolioModel = PortfolioItem, SkillModel = Skill,
  AffiliationModel = UniversityAffiliation, UniversityModel = University,
} = {}) {
  async function requireProfile(userId) {
    const profile = await ProfileModel.findOne({ userId });
    if (!profile) throw new NotFoundError();
    return profile;
  }

  async function validateSkills(skillIds) {
    if (!skillIds.length) return [];
    const skills = await SkillModel.find({ _id: { $in: skillIds }, status: 'ACTIVE' }).lean();
    if (skills.length !== new Set(skillIds.map(String)).size) {
      throw new RequestValidationError([{ location: 'body', path: 'skills', code: 'inactive_or_unknown_skill', message: 'Every skill must reference an active catalogue entry.' }]);
    }
    return skills;
  }

  async function refreshCompletion(profile) {
    const publishedPortfolioCount = await PortfolioModel.countDocuments({ userId: profile.userId, status: 'PUBLISHED' });
    Object.assign(profile, calculateProfileCompletion(profile, publishedPortfolioCount));
    profile.searchUpdatedAt = new Date();
    await profile.save();
    return profile;
  }

  async function contextFor(profile) {
    const [skills, affiliation, publishedPortfolioCount] = await Promise.all([
      SkillModel.find({ _id: { $in: profile.skillEntries.map((entry) => entry.skillId) }, status: 'ACTIVE' }).lean(),
      AffiliationModel.findOne({ userId: profile.userId, isActive: true }).lean(),
      PortfolioModel.countDocuments({ userId: profile.userId, status: 'PUBLISHED' }),
    ]);
    const university = affiliation ? await UniversityModel.findById(affiliation.universityId).lean() : null;
    return { skills, affiliation, university, publishedPortfolioCount };
  }

  function profileProjection(profile, context, isOwner) {
    const skillById = new Map(context.skills.map((skill) => [String(skill._id), skill]));
    const result = {
      userId: String(profile.userId), displayName: profile.displayName, headline: profile.headline ?? '', department: profile.department ?? '',
      graduationYear: profile.graduationYear ?? null, bio: profile.bio ?? '', experienceLevel: profile.experienceLevel ?? null,
      availability: { status: profile.availability?.status ?? 'UNAVAILABLE', hoursPerWeek: profile.availability?.hoursPerWeek ?? null, availableFrom: profile.availability?.availableFrom ?? null },
      skills: profile.skillEntries.map((entry) => ({ id: String(entry.skillId), name: skillById.get(String(entry.skillId))?.name ?? 'Unavailable skill', category: skillById.get(String(entry.skillId))?.category ?? '', level: entry.level, evidence: entry.evidence ?? '' })),
      externalLinks: profile.externalLinks ?? [], visibility: profile.visibility,
      completionScore: profile.completionScore, isCompleteForApplications: profile.isCompleteForApplications,
      publishedPortfolioCount: context.publishedPortfolioCount,
      university: context.university ? { id: String(context.university._id), name: context.university.name, shortName: context.university.shortName } : null,
      universityVerification: context.affiliation ? { status: context.affiliation.status } : null,
      updatedAt: profile.updatedAt,
    };
    if (isOwner) {
      result.educationEntries = profile.educationEntries ?? [];
      result.version = profile.version;
    }
    return result;
  }

  async function own(userId) {
    const profile = await requireProfile(userId);
    return profileProjection(profile, await contextFor(profile), true);
  }

  async function publicProfile(userId, viewerId) {
    const profile = await ProfileModel.findOne({ userId, moderationStatus: 'VISIBLE' });
    if (!profile) throw new NotFoundError();
    const isOwner = viewerId && String(viewerId) === String(userId);
    if (profile.visibility === 'PRIVATE' && !isOwner) throw new NotFoundError();
    if (profile.visibility === 'UNIVERSITY' && !isOwner) {
      if (!viewerId) throw new NotFoundError();
      const [ownerAffiliation, viewerAffiliation] = await Promise.all([
        AffiliationModel.findOne({ userId, isActive: true }).lean(),
        AffiliationModel.findOne({ userId: viewerId, isActive: true }).lean(),
      ]);
      if (!ownerAffiliation || !viewerAffiliation || String(ownerAffiliation.universityId) !== String(viewerAffiliation.universityId)) throw new NotFoundError();
    }
    return profileProjection(profile, await contextFor(profile), Boolean(isOwner));
  }

  async function create(userId, input) {
    if (await ProfileModel.exists({ userId })) throw new ConflictError('PROFILE_ALREADY_EXISTS', 'A profile already exists for this account.');
    const profile = await ProfileModel.create({ userId, ...input, graduationYear: input.graduationYear ?? undefined, experienceLevel: input.experienceLevel ?? undefined });
    await refreshCompletion(profile);
    return own(userId);
  }

  async function update(userId, input) {
    const profile = await requireProfile(userId);
    for (const field of ['displayName', 'headline', 'department', 'bio', 'visibility', 'educationEntries', 'externalLinks']) {
      if (field in input) profile[field] = clean(input[field]);
    }
    if ('graduationYear' in input) profile.graduationYear = input.graduationYear ?? undefined;
    if ('experienceLevel' in input) profile.experienceLevel = input.experienceLevel ?? undefined;
    profile.version += 1;
    await refreshCompletion(profile);
    return own(userId);
  }

  async function replaceSkills(userId, entries) {
    const profile = await requireProfile(userId);
    await validateSkills(entries.map((entry) => entry.skillId));
    profile.skillEntries = entries;
    profile.version += 1;
    await refreshCompletion(profile);
    return own(userId);
  }

  async function updateAvailability(userId, input) {
    const profile = await requireProfile(userId);
    profile.availability = { status: input.status, hoursPerWeek: input.hoursPerWeek ?? undefined, availableFrom: toDate(input.availableFrom) };
    profile.version += 1;
    await refreshCompletion(profile);
    return own(userId);
  }

  async function listOwnPortfolio(userId, status) {
    const filter = { userId };
    if (status) filter.status = status; else filter.status = { $ne: 'ARCHIVED' };
    const items = await PortfolioModel.find(filter).sort({ createdAt: -1 }).lean();
    return items.map((item) => portfolioProjection(item, true));
  }

  function portfolioProjection(item, isOwner) {
    return {
      id: String(item._id), title: item.title, description: item.description, role: item.role ?? '', skillIds: item.skillIds.map(String),
      startedAt: item.startedAt ?? null, endedAt: item.endedAt ?? null, externalLinks: item.externalLinks ?? [], status: item.status,
      publishedAt: item.publishedAt ?? null, createdAt: item.createdAt, updatedAt: item.updatedAt, ...(isOwner ? { version: item.version } : {}),
    };
  }

  async function createPortfolio(userId, input) {
    const profile = await requireProfile(userId);
    await validateSkills(input.skillIds);
    const item = await PortfolioModel.create({
      userId, profileId: profile._id, ...input, startedAt: toDate(input.startedAt), endedAt: toDate(input.endedAt),
      publishedAt: input.status === 'PUBLISHED' ? new Date() : undefined,
    });
    await refreshCompletion(profile);
    return portfolioProjection(item, true);
  }

  async function updatePortfolio(userId, itemId, input) {
    const item = await PortfolioModel.findOne({ _id: itemId, userId });
    if (!item) throw new NotFoundError();
    if (input.skillIds) await validateSkills(input.skillIds);
    for (const field of ['title', 'description', 'role', 'skillIds', 'externalLinks']) if (field in input) item[field] = input[field];
    if ('startedAt' in input) item.startedAt = toDate(input.startedAt);
    if ('endedAt' in input) item.endedAt = toDate(input.endedAt);
    if ('status' in input) {
      item.status = input.status;
      item.publishedAt = input.status === 'PUBLISHED' ? item.publishedAt ?? new Date() : undefined;
    }
    item.version += 1;
    await item.save();
    await refreshCompletion(await requireProfile(userId));
    return portfolioProjection(item, true);
  }

  async function deletePortfolio(userId, itemId) {
    const item = await PortfolioModel.findOne({ _id: itemId, userId });
    if (!item) throw new NotFoundError();
    item.status = 'ARCHIVED'; item.archivedAt = new Date(); item.version += 1;
    await item.save();
    await refreshCompletion(await requireProfile(userId));
  }

  async function publicPortfolio(userId, viewerId) {
    await publicProfile(userId, viewerId);
    const items = await PortfolioModel.find({ userId, status: 'PUBLISHED' }).sort({ publishedAt: -1, createdAt: -1 }).lean();
    return items.map((item) => portfolioProjection(item, false));
  }

  async function getPortfolio(itemId, viewerId) {
    const item = await PortfolioModel.findById(itemId).lean();
    if (!item) throw new NotFoundError();
    const isOwner = viewerId && String(viewerId) === String(item.userId);
    if (!isOwner && item.status !== 'PUBLISHED') throw new NotFoundError();
    if (!isOwner) await publicProfile(item.userId, viewerId);
    return portfolioProjection(item, Boolean(isOwner));
  }

  return { own, publicProfile, create, update, replaceSkills, updateAvailability, listOwnPortfolio, createPortfolio, updatePortfolio, deletePortfolio, publicPortfolio, getPortfolio };
}
