import { ConflictError, NotFoundError, RequestValidationError } from '../../errors/application-error.js';
import { createCursorCodec } from '../../lib/pagination/cursor.js';
import { Profile } from '../profiles/profile.model.js';
import { Skill } from '../skills/skill.model.js';
import { UniversityAffiliation } from '../university/university-affiliation.model.js';
import { University } from '../university/university.model.js';
import { Bookmark } from './bookmark.model.js';
import { Gig } from './gig.model.js';
import { targetGigState } from './gig-lifecycle.js';

const editFields = ['title', 'description', 'category', 'skillRequirements', 'workMode', 'locationText', 'visibility', 'budget', 'deadlineAt', 'capacity'];
const dateValue = (value) => value ? new Date(value) : undefined;

export function createGigService({ config, GigModel = Gig, BookmarkModel = Bookmark, ProfileModel = Profile, SkillModel = Skill, AffiliationModel = UniversityAffiliation, UniversityModel = University } = {}) {
  const cursorCodec = createCursorCodec(config.csrfSecret);
  async function affiliation(userId) { return AffiliationModel.findOne({ userId, isActive: true }).lean(); }
  async function activeSkills(ids) {
    if (!ids.length) return [];
    const skills = await SkillModel.find({ _id: { $in: ids }, status: 'ACTIVE' }).lean();
    if (skills.length !== new Set(ids.map(String)).size) throw new RequestValidationError([{ location: 'body', path: 'skillRequirements', code: 'inactive_or_unknown_skill', message: 'Every skill must reference an active catalogue entry.' }]);
    return skills;
  }
  async function ownerContext(userId) {
    const [profile, ownerAffiliation] = await Promise.all([ProfileModel.findOne({ userId, moderationStatus: 'VISIBLE' }).lean(), affiliation(userId)]);
    if (!profile) throw new ConflictError('PROFILE_REQUIRED', 'Create your profile before posting a gig.');
    return { profile, affiliation: ownerAffiliation };
  }
  function visibleFilter(viewerAffiliation) {
    const visibility = viewerAffiliation ? { $or: [{ visibility: 'PLATFORM' }, { visibility: 'UNIVERSITY', universityId: viewerAffiliation.universityId }] } : { visibility: 'PLATFORM' };
    return { status: 'PUBLISHED', moderationStatus: 'VISIBLE', ...visibility };
  }
  async function enrich(gigs, viewerId, ownerView = false) {
    if (!gigs.length) return [];
    const skillIds = [...new Set(gigs.flatMap((gig) => gig.skillRequirements.map((entry) => String(entry.skillId))))];
    const universityIds = [...new Set(gigs.map((gig) => gig.universityId && String(gig.universityId)).filter(Boolean))];
    const [skills, universities, bookmarks] = await Promise.all([
      SkillModel.find({ _id: { $in: skillIds } }).lean(), UniversityModel.find({ _id: { $in: universityIds } }).lean(),
      viewerId ? BookmarkModel.find({ userId: viewerId, gigId: { $in: gigs.map((gig) => gig._id) } }).lean() : [],
    ]);
    const skillMap = new Map(skills.map((skill) => [String(skill._id), skill]));
    const universityMap = new Map(universities.map((university) => [String(university._id), university]));
    const bookmarked = new Set(bookmarks.map((entry) => String(entry.gigId)));
    return gigs.map((gig) => ({
      id: String(gig._id), title: gig.title, description: gig.description, category: gig.category,
      skills: gig.skillRequirements.map((entry) => ({ id: String(entry.skillId), name: skillMap.get(String(entry.skillId))?.name ?? 'Unavailable skill', level: entry.level, required: entry.required })),
      workMode: gig.workMode, locationText: gig.locationText ?? '', visibility: gig.visibility,
      university: gig.universityId && universityMap.get(String(gig.universityId)) ? { id: String(gig.universityId), name: universityMap.get(String(gig.universityId)).name } : null,
      budget: gig.budget ?? null, deadlineAt: gig.deadlineAt ?? null, capacity: gig.capacity, acceptedCount: gig.acceptedCount, proposalCount: gig.proposalCount,
      acceptingProposals: gig.acceptingProposals, status: gig.status, owner: { id: String(gig.ownerId), displayName: gig.ownerSnapshot?.displayName ?? 'CampusCollab member' },
      isOwner: Boolean(viewerId && String(viewerId) === String(gig.ownerId)), isBookmarked: bookmarked.has(String(gig._id)),
      publishedAt: gig.publishedAt ?? null, createdAt: gig.createdAt, updatedAt: gig.updatedAt,
      ...(ownerView ? { version: gig.version, materialRevision: gig.materialRevision } : {}),
    }));
  }
  function cursorFilter(cursor, scope, field = 'createdAt', direction = 'desc') {
    const decoded = cursorCodec.decode(cursor, scope);
    if (!decoded) return {};
    const op = direction === 'asc' ? '$gt' : '$lt';
    return { $or: [{ [field]: { [op]: new Date(decoded.at) } }, { [field]: new Date(decoded.at), _id: { [op]: decoded.id } }] };
  }
  function page(items, limit, scope, field = 'createdAt') {
    const hasMore = items.length > limit; const values = hasMore ? items.slice(0, limit) : items; const last = values.at(-1);
    return { values, nextCursor: hasMore ? cursorCodec.encode({ scope, at: new Date(last[field]).toISOString(), id: String(last._id) }) : null, hasMore };
  }
  async function create(userId, input) {
    const context = await ownerContext(userId); await activeSkills(input.skillRequirements.map((entry) => entry.skillId));
    if (input.visibility === 'UNIVERSITY' && !context.affiliation) throw new ConflictError('UNIVERSITY_AFFILIATION_REQUIRED', 'A university affiliation is required for university-only gigs.');
    const gig = await GigModel.create({ ownerId: userId, ownerSnapshot: { displayName: context.profile.displayName, universityId: context.affiliation?.universityId }, universityId: input.visibility === 'UNIVERSITY' ? context.affiliation.universityId : undefined, ...input, deadlineAt: dateValue(input.deadlineAt) });
    return (await enrich([gig.toObject()], userId, true))[0];
  }
  async function list(input, viewerId) {
    const viewerAffiliation = viewerId ? await affiliation(viewerId) : null;
    const scope = `gigs:${input.sort}:${input.q ?? ''}:${input.skillId ?? ''}:${input.category ?? ''}:${input.workMode ?? ''}`;
    const field = input.sort === 'DEADLINE' ? 'deadlineAt' : 'createdAt'; const direction = input.sort === 'DEADLINE' ? 'asc' : 'desc';
    const filter = { $and: [visibleFilter(viewerAffiliation), cursorFilter(input.cursor, scope, field, direction)] };
    if (input.q) filter.$text = { $search: input.q }; if (input.skillId) filter['skillRequirements.skillId'] = input.skillId; if (input.category) filter.category = input.category; if (input.workMode) filter.workMode = input.workMode;
    if (input.sort === 'DEADLINE') filter.deadlineAt = { $gt: new Date() };
    const found = await GigModel.find(filter).sort({ [field]: direction === 'asc' ? 1 : -1, _id: direction === 'asc' ? 1 : -1 }).limit(input.limit + 1).lean();
    const result = page(found, input.limit, scope, field); return { gigs: await enrich(result.values, viewerId), nextCursor: result.nextCursor, hasMore: result.hasMore };
  }
  async function mine(userId, input) {
    const scope = `mine:${userId}:${input.status ?? ''}`; const filter = { ownerId: userId, ...cursorFilter(input.cursor, scope) }; if (input.status) filter.status = input.status;
    const found = await GigModel.find(filter).sort({ createdAt: -1, _id: -1 }).limit(input.limit + 1).lean(); const result = page(found, input.limit, scope);
    return { gigs: await enrich(result.values, userId, true), nextCursor: result.nextCursor, hasMore: result.hasMore };
  }
  async function get(gigId, viewerId) {
    const gig = await GigModel.findById(gigId).lean(); if (!gig) throw new NotFoundError();
    const isOwner = viewerId && String(viewerId) === String(gig.ownerId);
    if (!isOwner) { const viewerAffiliation = viewerId ? await affiliation(viewerId) : null; const visible = gig.status === 'PUBLISHED' && gig.moderationStatus === 'VISIBLE' && (gig.visibility === 'PLATFORM' || (viewerAffiliation && String(viewerAffiliation.universityId) === String(gig.universityId))); if (!visible) throw new NotFoundError(); }
    return (await enrich([gig], viewerId, Boolean(isOwner)))[0];
  }
  async function update(userId, gigId, input) {
    const gig = await GigModel.findOne({ _id: gigId, ownerId: userId }); if (!gig) throw new NotFoundError();
    if (!['DRAFT', 'PUBLISHED'].includes(gig.status)) throw new ConflictError('INVALID_STATE', 'This gig can no longer be edited.');
    if (input.skillRequirements) await activeSkills(input.skillRequirements.map((entry) => entry.skillId));
    const context = await ownerContext(userId); if (input.visibility === 'UNIVERSITY' && !context.affiliation) throw new ConflictError('UNIVERSITY_AFFILIATION_REQUIRED', 'A university affiliation is required.');
    if (input.capacity !== undefined && input.capacity < gig.acceptedCount) throw new ConflictError('CAPACITY_CONFLICT', 'Capacity cannot be lower than accepted participants.');
    for (const field of editFields) if (field in input) gig[field] = field === 'deadlineAt' ? dateValue(input[field]) : input[field];
    if ('visibility' in input) gig.universityId = input.visibility === 'UNIVERSITY' ? context.affiliation.universityId : undefined;
    if (gig.status === 'PUBLISHED') gig.materialRevision += 1; gig.version += 1; await gig.save(); return (await enrich([gig.toObject()], userId, true))[0];
  }
  async function transition(userId, gigId, action, input = {}) {
    const gig = await GigModel.findOne({ _id: gigId, ownerId: userId }); if (!gig) throw new NotFoundError(); const now = new Date();
    const target = targetGigState(gig.status, action);
    if (action === 'publish') { if (gig.deadlineAt && gig.deadlineAt <= now) throw new ConflictError('INCOMPLETE_RESOURCE', 'The deadline must be in the future.'); gig.acceptingProposals = true; gig.publishedAt = now; }
    else if (action === 'close') { gig.acceptingProposals = false; gig.closedAt = now; gig.statusReasonCode = input.reasonCode ?? 'OWNER_CLOSED'; }
    else if (action === 'cancel') { if (!input.reasonCode) throw new RequestValidationError([{ location: 'body', path: 'reasonCode', code: 'required', message: 'A cancellation reason is required.' }]); gig.acceptingProposals = false; gig.cancelledAt = now; gig.statusReasonCode = input.reasonCode; }
    else if (action === 'archive') { gig.acceptingProposals = false; gig.archivedAt = now; }
    else if (action === 'start') gig.startedAt = now;
    gig.status = target;
    gig.version += 1; await gig.save(); return (await enrich([gig.toObject()], userId, true))[0];
  }
  async function addBookmark(userId, gigId) {
    const gig = await get(gigId, userId); if (gig.status !== 'PUBLISHED') throw new NotFoundError();
    try { const bookmark = await BookmarkModel.create({ userId, gigId }); return { created: true, bookmark: { gigId: String(bookmark.gigId), createdAt: bookmark.createdAt } }; } catch (error) { if (error?.code !== 11000) throw error; const bookmark = await BookmarkModel.findOne({ userId, gigId }).lean(); return { created: false, bookmark: { gigId: String(bookmark.gigId), createdAt: bookmark.createdAt } }; }
  }
  async function removeBookmark(userId, gigId) { await BookmarkModel.deleteOne({ userId, gigId }); }
  async function bookmarks(userId, input) {
    const scope = `bookmarks:${userId}`; const filter = { userId, ...cursorFilter(input.cursor, scope) };
    const found = await BookmarkModel.find(filter).sort({ createdAt: -1, _id: -1 }).limit(input.limit + 1).lean(); const result = page(found, input.limit, scope);
    const viewerAffiliation = await affiliation(userId);
    const gigs = await GigModel.find({ _id: { $in: result.values.map((entry) => entry.gigId) }, ...visibleFilter(viewerAffiliation) }).lean(); const order = new Map(result.values.map((entry, index) => [String(entry.gigId), index])); gigs.sort((a, b) => order.get(String(a._id)) - order.get(String(b._id)));
    return { gigs: await enrich(gigs, userId), nextCursor: result.nextCursor, hasMore: result.hasMore };
  }
  return { create, list, mine, get, update, transition, addBookmark, removeBookmark, bookmarks };
}
