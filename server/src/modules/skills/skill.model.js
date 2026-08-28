import { Schema, addVersion, model, mutableSchemaOptions, objectId, textField } from '../../lib/mongo/schema-helpers.js';

const skillSchema = addVersion(new Schema({
  name: textField({ required: true, min: 1, max: 80 }), normalizedName: { ...textField({ required: true, max: 80 }), lowercase: true },
  aliases: { type: [String], default: [], validate: [(v) => v.length <= 20 && new Set(v.map((x) => x.toLowerCase())).size === v.length, 'Aliases must be unique and at most 20'] },
  category: textField({ required: true, max: 80 }), status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE', required: true },
  createdByUserId: { type: objectId, ref: 'User', required: true, immutable: true }, updatedByUserId: { type: objectId, ref: 'User', required: true },
}, mutableSchemaOptions));
skillSchema.index({ normalizedName: 1 }, { unique: true, name: 'uq_skills_normalized_name' });
skillSchema.index({ status: 1, category: 1, name: 1 }, { name: 'ix_skills_status_category_name' });

export const Skill = model('Skill', skillSchema, 'skills');

