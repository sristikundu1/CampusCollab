import { Schema, addVersion, model, mutableSchemaOptions, objectId, textField } from '../../lib/mongo/schema-helpers.js';

const externalLinkSchema = new Schema({ type: textField({ required: true, max: 40 }), url: textField({ required: true, max: 2048 }), label: textField({ max: 50 }) }, { _id: false, strict: 'throw' });
const portfolioItemSchema = addVersion(new Schema({
  userId: { type: objectId, ref: 'User', required: true, immutable: true }, profileId: { type: objectId, ref: 'Profile', required: true, immutable: true },
  title: textField({ required: true, min: 1, max: 160 }), description: textField({ required: true, min: 1, max: 3000 }), role: textField({ max: 120 }),
  skillIds: { type: [{ type: objectId, ref: 'Skill' }], default: [], validate: [(v) => v.length <= 20 && new Set(v.map(String)).size === v.length, 'Skills must be unique and at most 20'] },
  startedAt: Date, endedAt: Date, externalLinks: { type: [externalLinkSchema], default: [], validate: [(v) => v.length <= 10, 'Links exceed maximum'] },
  completionRecordId: { type: objectId, ref: 'CompletionRecord' }, status: { type: String, enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED', 'RESTRICTED'], default: 'DRAFT', required: true },
  publishedAt: Date, archivedAt: Date,
}, mutableSchemaOptions));
portfolioItemSchema.index({ userId: 1, status: 1, createdAt: -1, _id: -1 }, { name: 'ix_portfolio_user_status_cursor' });

export const PortfolioItem = model('PortfolioItem', portfolioItemSchema, 'portfolioItems');

