import {
  Schema,
  addVersion,
  model,
  mutableSchemaOptions,
  objectId,
  textField,
} from "../../lib/mongo/schema-helpers.js";

const universitySchema = addVersion(
  new Schema(
    {
      name: textField({ required: true, min: 2, max: 160 }),
      normalizedName: {
        ...textField({ required: true, min: 2, max: 160 }),
        lowercase: true,
      },
      shortName: textField({ min: 2, max: 32 }),
      countryCode: {
        type: String,
        required: true,
        uppercase: true,
        minlength: 2,
        maxlength: 2,
      },
      region: textField({ max: 100 }),
      websiteUrl: textField({ max: 2048 }),
      status: {
        type: String,
        enum: ["PROPOSED", "ACTIVE", "INACTIVE"],
        default: "PROPOSED",
        required: true,
      },
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
universitySchema.index(
  { normalizedName: 1, countryCode: 1 },
  { unique: true, name: "uq_universities_name_country" },
);

export const University = model("University", universitySchema, "universities");
