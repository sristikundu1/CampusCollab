import { Schema, appendOnlySchemaOptions, model, objectId, textField } from '../../lib/mongo/schema-helpers.js';

const messageSchema = new Schema({
  conversationId: { type: objectId, ref: 'Conversation', required: true, immutable: true }, senderId: { type: objectId, ref: 'User', required: true, immutable: true },
  clientMessageId: textField({ required: true, max: 128, immutable: true }), messageType: { type: String, enum: ['TEXT', 'ATTACHMENT', 'SYSTEM'], default: 'TEXT', required: true, immutable: true },
  body: textField({ min: 1, max: 5000, immutable: true, select: false }), attachmentIds: { type: [{ type: objectId, ref: 'Attachment' }], default: [], immutable: true, validate: [(v) => v.length <= 10, 'Attachments exceed maximum'] },
  moderationStatus: { type: String, enum: ['VISIBLE', 'RESTRICTED', 'REMOVED'], default: 'VISIBLE', required: true }, sentAt: { type: Date, required: true, immutable: true },
  restrictedAt: Date, restrictionReasonCode: textField({ max: 80, select: false }), createdAt: { type: Date, required: true, default: Date.now, immutable: true },
}, appendOnlySchemaOptions);
messageSchema.index({ conversationId: 1, sentAt: -1, _id: -1 }, { name: 'ix_messages_conversation_cursor' });
messageSchema.index({ conversationId: 1, senderId: 1, clientMessageId: 1 }, { unique: true, name: 'uq_messages_client_identity' });

export const Message = model('Message', messageSchema, 'messages');

