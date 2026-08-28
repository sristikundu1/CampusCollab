import { Schema, addVersion, model, mutableSchemaOptions, objectId, textField } from '../../lib/mongo/schema-helpers.js';

const roleSnapshotSchema = new Schema({ roleName: textField({ required: true, max: 100 }), skillIds: [{ type: objectId, ref: 'Skill' }] }, { _id: false, strict: 'throw' });
const projectMembershipSchema = addVersion(new Schema({
  projectId: { type: objectId, ref: 'Project', required: true, immutable: true }, openingId: { type: objectId, required: true, immutable: true }, userId: { type: objectId, ref: 'User', required: true, immutable: true },
  roleSnapshot: { type: roleSnapshotSchema, required: true }, sourceType: { type: String, enum: ['JOIN_REQUEST', 'INVITATION'], required: true, immutable: true }, sourceId: { type: objectId, required: true, immutable: true },
  status: { type: String, enum: ['ACTIVE', 'LEFT', 'REMOVED', 'COMPLETED'], default: 'ACTIVE', required: true }, joinedAt: { type: Date, required: true, immutable: true }, leftAt: Date, removedAt: Date, completedAt: Date,
  changedByUserId: { type: objectId, ref: 'User' }, statusReasonCode: textField({ max: 80, select: false }),
}, mutableSchemaOptions));
projectMembershipSchema.index({ projectId: 1, userId: 1 }, { unique: true, partialFilterExpression: { status: 'ACTIVE' }, name: 'uq_memberships_active_project_user' });
projectMembershipSchema.index({ sourceType: 1, sourceId: 1 }, { unique: true, name: 'uq_memberships_source' });
projectMembershipSchema.index({ projectId: 1, status: 1, joinedAt: 1 }, { name: 'ix_memberships_project_status_joined' });
projectMembershipSchema.index({ userId: 1, status: 1, joinedAt: -1, _id: -1 }, { name: 'ix_memberships_user_status_cursor' });

export const ProjectMembership = model('ProjectMembership', projectMembershipSchema, 'projectMemberships');

