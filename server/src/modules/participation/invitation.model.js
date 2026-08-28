import { Schema, addVersion, model, mutableSchemaOptions, objectId, textField } from '../../lib/mongo/schema-helpers.js';

const invitationSchema = addVersion(new Schema({
  projectId: { type: objectId, ref: 'Project', required: true, immutable: true }, openingId: { type: objectId, required: true, immutable: true },
  inviterId: { type: objectId, ref: 'User', required: true, immutable: true }, inviteeId: { type: objectId, ref: 'User', required: true, immutable: true },
  message: textField({ max: 3000, select: false }), status: { type: String, enum: ['PENDING', 'ACCEPTED', 'REJECTED', 'REVOKED', 'EXPIRED'], default: 'PENDING', required: true },
  expiresAt: { type: Date, required: true, immutable: true }, idempotencyKey: textField({ required: true, min: 8, max: 128, immutable: true, select: false }),
  respondedAt: Date, revokedAt: Date, expiredAt: Date, responseReasonCode: textField({ max: 80, select: false }),
}, mutableSchemaOptions));
invitationSchema.index({ projectId: 1, openingId: 1, inviteeId: 1 }, { unique: true, partialFilterExpression: { status: 'PENDING' }, name: 'uq_invitations_pending' });
invitationSchema.index({ inviterId: 1, projectId: 1, idempotencyKey: 1 }, { unique: true, name: 'uq_invitations_idempotency' });
invitationSchema.index({ inviteeId: 1, status: 1, createdAt: -1, _id: -1 }, { name: 'ix_invitations_invitee_status_cursor' });
invitationSchema.index({ projectId: 1, status: 1, createdAt: -1, _id: -1 }, { name: 'ix_invitations_project_status_cursor' });
invitationSchema.index({ status: 1, expiresAt: 1 }, { name: 'ix_invitations_status_expiry' });

export const Invitation = model('Invitation', invitationSchema, 'invitations');

