import { Schema, addVersion, intField, model, mutableSchemaOptions, objectId, textField } from '../../lib/mongo/schema-helpers.js';

const adminGrantSchema = new Schema(
  {
    capability: textField({ required: true, max: 80 }),
    scope: textField({ required: true, max: 160 }),
    grantedByUserId: { type: objectId, ref: 'User', required: true, immutable: true },
    grantedAt: { type: Date, required: true, immutable: true },
    expiresAt: Date,
  },
  { _id: false, strict: 'throw' },
);

const userSchema = addVersion(
  new Schema(
    {
      email: { ...textField({ required: true, max: 320 }), lowercase: true, immutable: false },
      passwordHash: textField({ required: true, max: 512, select: false }),
      status: {
        type: String,
        enum: ['PENDING_VERIFICATION', 'ACTIVE', 'TEMPORARILY_SUSPENDED', 'INDEFINITELY_SUSPENDED', 'DEACTIVATED', 'DELETION_PENDING', 'DELETED'],
        default: 'PENDING_VERIFICATION',
        required: true,
      },
      primaryExperience: { type: String, enum: ['SEEKING_WORK', 'OWNING_WORK'], required: true },
      capabilities: { type: [String], default: [], validate: [(v) => v.length <= 32, 'Capabilities exceed maximum'], set: (v) => [...new Set(v)] },
      adminGrants: { type: [adminGrantSchema], default: [], select: false, validate: [(v) => v.length <= 32, 'Admin grants exceed maximum'] },
      securityVersion: intField({ defaultValue: 0 }),
      lastLoginAt: Date,
      passwordChangedAt: Date,
      statusChangedAt: { type: Date, required: true, default: Date.now },
      statusReasonCode: textField({ max: 80, select: false }),
      suspendedUntil: Date,
      deletionRequestedAt: Date,
      deletionScheduledFor: Date,
      legalOrSafetyHold: { type: Boolean, required: true, default: false, select: false },
    },
    mutableSchemaOptions,
  ),
);
userSchema.index({ email: 1 }, { unique: true, name: 'uq_users_email' });
userSchema.index({ status: 1, createdAt: -1 }, { name: 'ix_users_status_created' });

export const User = model('User', userSchema, 'users');

