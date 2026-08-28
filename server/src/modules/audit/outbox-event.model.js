import { Schema, addVersion, intField, model, mutableSchemaOptions, objectId, textField } from '../../lib/mongo/schema-helpers.js';

const outboxEventSchema = addVersion(new Schema({
  eventName: textField({ required: true, max: 120, immutable: true }), aggregateType: textField({ required: true, max: 80, immutable: true }), aggregateId: { type: objectId, required: true, immutable: true },
  aggregateVersion: intField({ min: 0, immutable: true }), payload: { type: Schema.Types.Mixed, required: true, immutable: true, select: false },
  status: { type: String, enum: ['PENDING', 'PROCESSING', 'PROCESSED', 'FAILED'], default: 'PENDING', required: true }, attemptCount: intField({ defaultValue: 0 }),
  availableAt: { type: Date, required: true }, claimedAt: Date, processedAt: Date, lastErrorCode: textField({ max: 80, select: false }),
}, mutableSchemaOptions));
outboxEventSchema.index({ aggregateType: 1, aggregateId: 1, aggregateVersion: 1, eventName: 1 }, { unique: true, name: 'uq_outbox_aggregate_event' });
outboxEventSchema.index({ status: 1, availableAt: 1, createdAt: 1 }, { name: 'ix_outbox_claim_queue' });

export const OutboxEvent = model('OutboxEvent', outboxEventSchema, 'outboxEvents');

