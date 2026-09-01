import {
  Schema,
  addVersion,
  model,
  mutableSchemaOptions,
  objectId,
  textField,
} from "../../lib/mongo/schema-helpers.js";

const universityAffiliationSchema = addVersion(
  new Schema(
    {
      userId: { type: objectId, ref: "User", required: true, immutable: true },
      universityId: { type: objectId, ref: "University", required: true },
      universityDomainId: {
        type: objectId,
        ref: "UniversityDomain",
        required: true,
        immutable: true,
      },
      email: {
        ...textField({ required: true, max: 320, select: false }),
        lowercase: true,
      },
      status: {
        type: String,
        enum: ["PENDING", "VERIFIED", "EXPIRED", "REVOKED", "REPLACED"],
        default: "PENDING",
        required: true,
      },
      isActive: { type: Boolean, required: true, default: true },
      verificationMethod: { type: String, enum: ["EMAIL_LINK"] },
      verifiedAt: Date,
      verificationExpiresAt: Date,
      revokedAt: Date,
      revokedByUserId: { type: objectId, ref: "User", select: false },
      revocationReasonCode: textField({ max: 80, select: false }),
      replacedByAffiliationId: { type: objectId, ref: "UniversityAffiliation" },
    },
    mutableSchemaOptions,
  ),
);
universityAffiliationSchema.index(
  { userId: 1 },
  {
    unique: true,
    partialFilterExpression: { isActive: true },
    name: "uq_affiliations_active_user",
  },
);
universityAffiliationSchema.index(
  { userId: 1, isActive: 1, status: 1 },
  { name: "ix_affiliations_current_trust" },
);
universityAffiliationSchema.index(
  { universityId: 1, status: 1, verificationExpiresAt: 1 },
  { name: "ix_affiliations_university_expiry" },
);

export const UniversityAffiliation = model(
  "UniversityAffiliation",
  universityAffiliationSchema,
  "universityAffiliations",
);
