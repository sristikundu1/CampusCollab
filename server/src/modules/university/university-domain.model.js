import {
  Schema,
  addVersion,
  model,
  mutableSchemaOptions,
  objectId,
  textField,
} from "../../lib/mongo/schema-helpers.js";

const universityDomainSchema = addVersion(
  new Schema(
    {
      universityId: { type: objectId, ref: "University", required: true },
      domain: { ...textField({ required: true, max: 253 }), lowercase: true },
      matchMode: {
        type: String,
        enum: ["EXACT", "SUBDOMAIN_ALLOWED"],
        default: "EXACT",
        required: true,
      },
      status: {
        type: String,
        enum: ["PENDING_REVIEW", "ACTIVE", "INACTIVE", "REJECTED"],
        default: "PENDING_REVIEW",
        required: true,
      },
      evidenceSummary: textField({ max: 1000, select: false }),
      effectiveAt: Date,
      deactivatedAt: Date,
      createdByUserId: {
        type: objectId,
        ref: "User",
        required: true,
        immutable: true,
      },
      updatedByUserId: { type: objectId, ref: "User", required: true },
    },
    mutableSchemaOptions,
  ),
);
universityDomainSchema.index(
  { domain: 1 },
  { unique: true, name: "uq_university_domains_domain" },
);
universityDomainSchema.index(
  { universityId: 1, status: 1 },
  { name: "ix_university_domains_university_status" },
);

export const UniversityDomain = model(
  "UniversityDomain",
  universityDomainSchema,
  "universityDomains",
);
