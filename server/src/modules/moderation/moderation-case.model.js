import { Schema, addVersion, model, mutableSchemaOptions, objectId, textField } from '../../lib/mongo/schema-helpers.js';

const moderationCaseSchema = addVersion(new Schema({
  primaryTargetType: textField({ required: true, max: 80, immutable: true, select: false }), primaryTargetId: { type: objectId, required: true, immutable: true, select: false },
  reportIds: { type: [{ type: objectId, ref: 'Report' }], required: true, validate: [(v) => v.length > 0 && v.length <= 100, 'Case report IDs must be between 1 and 100'] },
  status: { type: String, enum: ['OPEN', 'INVESTIGATING', 'ACTIONED', 'NO_VIOLATION', 'ESCALATED', 'APPEALED', 'CLOSED'], default: 'OPEN', required: true },
  priority: { type: String, enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'], required: true }, assignedToUserId: { type: objectId, ref: 'User', select: false }, summary: textField({ max: 4000, select: false }),
  openedAt: { type: Date, required: true, immutable: true }, closedAt: Date,
}, mutableSchemaOptions));
moderationCaseSchema.index({ status: 1, priority: -1, updatedAt: 1, _id: 1 }, { name: 'ix_moderation_cases_queue' });
moderationCaseSchema.index({ assignedToUserId: 1, status: 1, priority: -1, updatedAt: 1 }, { name: 'ix_moderation_cases_assignee_queue' });

export const ModerationCase = model('ModerationCase', moderationCaseSchema, 'moderationCases');

