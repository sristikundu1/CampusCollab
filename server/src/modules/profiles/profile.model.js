import {
  Schema,
  addVersion,
  intField,
  model,
  mutableSchemaOptions,
  objectId,
  textField,
} from "../../lib/mongo/schema-helpers.js";

const skillEntrySchema = new Schema(
  {
    skillId: { type: objectId, ref: "Skill", required: true },
    level: {
      type: String,
      enum: ["BEGINNER", "INTERMEDIATE", "ADVANCED"],
      required: true,
    },
    evidence: textField({ max: 300 }),
  },
  { _id: false, strict: "throw" },
);
const educationSchema = new Schema(
  {
    institutionName: textField({ required: true, max: 160 }),
    universityId: { type: objectId, ref: "University" },
    qualification: textField({ max: 120 }),
    field: textField({ max: 120 }),
    startYear: intField({ required: false, min: 1900, max: 2200 }),
    endYear: intField({ required: false, min: 1900, max: 2200 }),
    verified: { type: Boolean, default: false },
  },
  { _id: true, strict: "throw" },
);
const linkSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["WEBSITE", "GITHUB", "LINKEDIN", "BEHANCE", "OTHER"],
      required: true,
    },
    url: textField({ required: true, max: 2048 }),
    label: textField({ max: 50 }),
  },
  { _id: false, strict: "throw" },
);

const profileSchema = addVersion(
  new Schema(
    {
      userId: { type: objectId, ref: "User", required: true, immutable: true },
      displayName: textField({ required: true, min: 2, max: 80 }),
      headline: textField({ max: 120 }),
      department: textField({ max: 120 }),
      graduationYear: intField({ required: false, min: 1900, max: 2200 }),
      bio: textField({ max: 2000 }),
      experienceLevel: {
        type: String,
        enum: ["BEGINNER", "INTERMEDIATE", "ADVANCED"],
      },
      availability: {
        status: {
          type: String,
          enum: ["AVAILABLE", "LIMITED", "UNAVAILABLE"],
          default: "UNAVAILABLE",
          required: true,
        },
        hoursPerWeek: intField({ required: false, min: 0, max: 80 }),
        availableFrom: Date,
      },
      skillEntries: {
        type: [skillEntrySchema],
        default: [],
        validate: [
          (v) =>
            v.length <= 30 &&
            new Set(v.map((x) => String(x.skillId))).size === v.length,
          "Profile skills must be unique and at most 30",
        ],
      },
      educationEntries: {
        type: [educationSchema],
        default: [],
        validate: [(v) => v.length <= 10, "Education exceeds maximum"],
      },
      externalLinks: {
        type: [linkSchema],
        default: [],
        validate: [(v) => v.length <= 10, "External links exceed maximum"],
      },
      visibility: {
        type: String,
        enum: ["PLATFORM", "UNIVERSITY", "PRIVATE"],
        default: "PLATFORM",
        required: true,
      },
      completionScore: intField({ defaultValue: 0, max: 100 }),
      isCompleteForApplications: {
        type: Boolean,
        default: false,
        required: true,
      },
      moderationStatus: {
        type: String,
        enum: ["VISIBLE", "RESTRICTED", "HIDDEN"],
        default: "VISIBLE",
        required: true,
      },
      preferences: { type: Schema.Types.Mixed, default: {}, select: false },
      searchUpdatedAt: Date,
    },
    mutableSchemaOptions,
  ),
);
profileSchema.index({ userId: 1 }, { unique: true, name: "uq_profiles_user" });
profileSchema.index(
  {
    "skillEntries.skillId": 1,
    "availability.status": 1,
    visibility: 1,
    updatedAt: -1,
  },
  { name: "ix_profiles_skill_availability_visibility" },
);
profileSchema.index(
  { visibility: 1, moderationStatus: 1, updatedAt: -1 },
  { name: "ix_profiles_visible_updated" },
);

export const Profile = model("Profile", profileSchema, "profiles");
