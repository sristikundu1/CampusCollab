import { Schema, appendOnlySchemaOptions, model, objectId, textField } from '../../lib/mongo/schema-helpers.js';

const auditEventSchema = new Schema({
  eventName: textField({ required: true, max: 120, immutable: true }), category: { type: String, enum: ['AUTH', 'VERIFICATION', 'AUTHORIZATION', 'LIFECYCLE', 'ADMIN', 'MODERATION', 'PRIVACY', 'SECURITY'], required: true, immutable: true },
  actorType: { type: String, enum: ['USER', 'ADMIN', 'SYSTEM'], required: true, immutable: true }, actorId: { type: objectId, ref: 'User', immutable: true, select: false },
  targetType: textField({ required: true, max: 80, immutable: true }), targetId: { type: objectId, immutable: true, select: false }, action: textField({ required: true, max: 120, immutable: true }),
  result: { type: String, enum: ['SUCCESS', 'DENIED', 'FAILURE', 'PARTIAL'], required: true, immutable: true }, reasonCode: textField({ max: 80, immutable: true, select: false }),
  correlationId: textField({ required: true, max: 128, immutable: true, select: false }), requestContext: { type: Schema.Types.Mixed, immutable: true, select: false }, metadata: { type: Schema.Types.Mixed, immutable: true, select: false },
  occurredAt: { type: Date, required: true, immutable: true }, createdAt: { type: Date, required: true, default: Date.now, immutable: true },
}, appendOnlySchemaOptions);
auditEventSchema.index({ occurredAt: -1, _id: -1 }, { name: 'ix_audit_occurred_cursor' });
auditEventSchema.index({ actorId: 1, occurredAt: -1, _id: -1 }, { name: 'ix_audit_actor_cursor' });
auditEventSchema.index({ targetType: 1, targetId: 1, occurredAt: -1 }, { name: 'ix_audit_target_history' });
auditEventSchema.index({ correlationId: 1, occurredAt: 1 }, { name: 'ix_audit_correlation' });

export const AuditEvent = model('AuditEvent', auditEventSchema, 'auditEvents');

