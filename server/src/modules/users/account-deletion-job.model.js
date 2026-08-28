import { Schema, addVersion, intField, model, mutableSchemaOptions, objectId, textField } from '../../lib/mongo/schema-helpers.js';

const deletionStepSchema = new Schema({ category: textField({ required: true, max: 80 }), status: { type: String, enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'SKIPPED'], required: true }, attempts: intField({ defaultValue: 0 }), completedAt: Date, lastErrorCode: textField({ max: 80, select: false }) }, { _id: false, strict: 'throw' });
const accountDeletionJobSchema = addVersion(new Schema({
  userId: { type: objectId, ref: 'User', required: true, immutable: true, select: false },
  status: { type: String, enum: ['RECOVERY_WINDOW', 'BLOCKED_HOLD', 'READY', 'PROCESSING', 'PARTIAL_FAILURE', 'COMPLETED', 'CANCELLED'], default: 'RECOVERY_WINDOW', required: true },
  requestedAt: { type: Date, required: true, immutable: true, select: false }, scheduledFor: { type: Date, required: true, select: false }, cancelledAt: Date, startedAt: Date, completedAt: Date,
  holdReasonCode: textField({ max: 80, select: false }), steps: { type: [deletionStepSchema], required: true, validate: [(v) => v.length <= 32, 'Deletion steps exceed maximum'] },
  anonymizedSubjectId: textField({ max: 256, select: false }), lastErrorCode: textField({ max: 80, select: false }),
}, mutableSchemaOptions));
accountDeletionJobSchema.index({ userId: 1 }, { unique: true, partialFilterExpression: { status: { $in: ['RECOVERY_WINDOW', 'BLOCKED_HOLD', 'READY', 'PROCESSING', 'PARTIAL_FAILURE'] } }, name: 'uq_deletion_jobs_active_user' });
accountDeletionJobSchema.index({ status: 1, scheduledFor: 1 }, { name: 'ix_deletion_jobs_due' });

export const AccountDeletionJob = model('AccountDeletionJob', accountDeletionJobSchema, 'accountDeletionJobs');

