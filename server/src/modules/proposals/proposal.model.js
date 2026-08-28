import { Schema, addVersion, intField, model, mutableSchemaOptions, objectId, textField } from '../../lib/mongo/schema-helpers.js';

const applicantSnapshotSchema = new Schema({ displayName: textField({ required: true, max: 80 }), headline: textField({ max: 120 }), skillIds: [{ type: objectId, ref: 'Skill' }], universityId: { type: objectId, ref: 'University' } }, { _id: false, strict: 'throw' });
const revisionSchema = new Schema({ revisionNumber: intField({ min: 1 }), coverMessage: textField({ required: true, max: 5000, select: false }), proposedBudget: Schema.Types.Mixed, proposedDuration: textField({ max: 120 }), availability: textField({ max: 300 }), createdAt: { type: Date, required: true, immutable: true } }, { _id: true, strict: 'throw' });

const proposalSchema = addVersion(new Schema({
  gigId: { type: objectId, ref: 'Gig', required: true, immutable: true }, applicantId: { type: objectId, ref: 'User', required: true, immutable: true },
  applicantSnapshot: { type: applicantSnapshotSchema, required: true }, status: { type: String, enum: ['SUBMITTED', 'SHORTLISTED', 'ACCEPTED', 'REJECTED', 'WITHDRAWN', 'CLOSED'], default: 'SUBMITTED', required: true },
  revisions: { type: [revisionSchema], required: true, validate: [(v) => v.length >= 1 && v.length <= 10, 'Proposal must have 1 to 10 revisions'] }, currentRevisionNumber: intField({ defaultValue: 1, min: 1, max: 10 }),
  submittedGigRevision: intField({ min: 0 }), decisionReasonCode: textField({ max: 80, select: false }), decisionNoteInternal: textField({ max: 1000, select: false }),
  submittedAt: { type: Date, required: true, immutable: true }, shortlistedAt: Date, acceptedAt: Date, rejectedAt: Date, withdrawnAt: Date, closedAt: Date,
  decidedByUserId: { type: objectId, ref: 'User' }, idempotencyKey: textField({ required: true, min: 8, max: 128, immutable: true, select: false }),
}, mutableSchemaOptions));
proposalSchema.index({ gigId: 1, applicantId: 1 }, { unique: true, partialFilterExpression: { status: { $in: ['SUBMITTED', 'SHORTLISTED', 'ACCEPTED'] } }, name: 'uq_proposals_active_gig_applicant' });
proposalSchema.index({ applicantId: 1, gigId: 1, idempotencyKey: 1 }, { unique: true, name: 'uq_proposals_idempotency' });
proposalSchema.index({ gigId: 1, status: 1, submittedAt: -1, _id: -1 }, { name: 'ix_proposals_gig_status_cursor' });
proposalSchema.index({ applicantId: 1, status: 1, submittedAt: -1, _id: -1 }, { name: 'ix_proposals_applicant_status_cursor' });

export const Proposal = model('Proposal', proposalSchema, 'proposals');

