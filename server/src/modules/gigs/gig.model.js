import { Schema, addVersion, intField, model, mutableSchemaOptions, objectId, textField } from '../../lib/mongo/schema-helpers.js';

const ownerSnapshotSchema = new Schema({ displayName: textField({ required: true, max: 80 }), avatarKey: textField({ max: 512, select: false }), universityId: { type: objectId, ref: 'University' } }, { _id: false, strict: 'throw' });
const skillRequirementSchema = new Schema({ skillId: { type: objectId, ref: 'Skill', required: true }, level: { type: String, enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'], required: true }, required: { type: Boolean, required: true, default: true } }, { _id: false, strict: 'throw' });
const budgetSchema = new Schema({ type: { type: String, enum: ['FIXED', 'RANGE', 'UNPAID'], required: true }, minMinor: intField({ required: false, min: 0 }), maxMinor: intField({ required: false, min: 0 }), currency: { type: String, uppercase: true, minlength: 3, maxlength: 3 } }, { _id: false, strict: 'throw' });

const gigSchema = addVersion(new Schema({
  ownerId: { type: objectId, ref: 'User', required: true, immutable: true }, ownerSnapshot: { type: ownerSnapshotSchema },
  title: textField({ required: true, min: 5, max: 180 }), description: textField({ required: true, min: 20, max: 10000 }), category: textField({ required: true, max: 80 }),
  skillRequirements: { type: [skillRequirementSchema], default: [], validate: [(v) => v.length <= 20 && new Set(v.map((x) => String(x.skillId))).size === v.length, 'Skill requirements must be unique and at most 20'] },
  workMode: { type: String, enum: ['REMOTE', 'HYBRID', 'ONSITE'], default: 'REMOTE', required: true }, locationText: textField({ max: 160 }),
  visibility: { type: String, enum: ['PLATFORM', 'UNIVERSITY'], default: 'PLATFORM', required: true }, universityId: { type: objectId, ref: 'University' }, budget: budgetSchema,
  deadlineAt: Date, capacity: intField({ defaultValue: 1, min: 1, max: 100 }), acceptedCount: intField({ defaultValue: 0 }), proposalCount: intField({ defaultValue: 0 }),
  acceptingProposals: { type: Boolean, default: false, required: true },
  status: { type: String, enum: ['DRAFT', 'PUBLISHED', 'ASSIGNED', 'ACTIVE', 'COMPLETION_PENDING', 'COMPLETED', 'CLOSED', 'CANCELLED', 'ARCHIVED'], default: 'DRAFT', required: true },
  materialRevision: intField({ defaultValue: 0 }), moderationStatus: { type: String, enum: ['VISIBLE', 'RESTRICTED', 'HIDDEN'], default: 'VISIBLE', required: true },
  publishedAt: Date, assignedAt: Date, startedAt: Date, completionRequestedAt: Date, completedAt: Date, closedAt: Date, cancelledAt: Date, archivedAt: Date,
  statusReasonCode: textField({ max: 80, select: false }),
}, mutableSchemaOptions));
gigSchema.index({ status: 1, moderationStatus: 1, visibility: 1, createdAt: -1, _id: -1 }, { partialFilterExpression: { status: 'PUBLISHED', moderationStatus: 'VISIBLE' }, name: 'ix_gigs_published_visible_feed' });
gigSchema.index({ ownerId: 1, status: 1, createdAt: -1, _id: -1 }, { name: 'ix_gigs_owner_status_cursor' });
gigSchema.index({ status: 1, category: 1, createdAt: -1, _id: -1 }, { name: 'ix_gigs_category_feed' });
gigSchema.index({ status: 1, 'skillRequirements.skillId': 1, createdAt: -1, _id: -1 }, { name: 'ix_gigs_skill_feed' });
gigSchema.index({ status: 1, workMode: 1, createdAt: -1, _id: -1 }, { name: 'ix_gigs_work_mode_feed' });
gigSchema.index({ status: 1, deadlineAt: 1 }, { name: 'ix_gigs_status_deadline' });
gigSchema.index({ universityId: 1, status: 1, createdAt: -1, _id: -1 }, { name: 'ix_gigs_university_feed' });

export const Gig = model('Gig', gigSchema, 'gigs');

