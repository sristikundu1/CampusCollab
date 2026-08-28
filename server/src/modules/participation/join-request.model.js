import { Schema, addVersion, intField, model, mutableSchemaOptions, objectId, textField } from '../../lib/mongo/schema-helpers.js';

const snapshotSchema = new Schema({ displayName: textField({ required: true, max: 80 }), headline: textField({ max: 120 }), skillIds: [{ type: objectId, ref: 'Skill' }], universityId: { type: objectId, ref: 'University' } }, { _id: false, strict: 'throw' });
const joinRequestSchema = addVersion(new Schema({
  projectId: { type: objectId, ref: 'Project', required: true, immutable: true }, openingId: { type: objectId, required: true, immutable: true }, applicantId: { type: objectId, ref: 'User', required: true, immutable: true },
  applicantSnapshot: { type: snapshotSchema, required: true }, message: textField({ required: true, min: 1, max: 3000, select: false }), status: { type: String, enum: ['PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN', 'EXPIRED'], default: 'PENDING', required: true },
  submittedProjectRevision: intField({ min: 0 }), idempotencyKey: textField({ required: true, min: 8, max: 128, immutable: true, select: false }), decidedByUserId: { type: objectId, ref: 'User' },
  decisionReasonCode: textField({ max: 80, select: false }), submittedAt: { type: Date, required: true, immutable: true }, acceptedAt: Date, rejectedAt: Date, withdrawnAt: Date, expiredAt: Date,
}, mutableSchemaOptions));
joinRequestSchema.index({ projectId: 1, openingId: 1, applicantId: 1 }, { unique: true, partialFilterExpression: { status: 'PENDING' }, name: 'uq_join_requests_pending' });
joinRequestSchema.index({ applicantId: 1, projectId: 1, idempotencyKey: 1 }, { unique: true, name: 'uq_join_requests_idempotency' });
joinRequestSchema.index({ projectId: 1, status: 1, submittedAt: -1, _id: -1 }, { name: 'ix_join_requests_project_status_cursor' });
joinRequestSchema.index({ applicantId: 1, status: 1, submittedAt: -1, _id: -1 }, { name: 'ix_join_requests_applicant_status_cursor' });

export const JoinRequest = model('JoinRequest', joinRequestSchema, 'joinRequests');

