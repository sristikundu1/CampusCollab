import {
  Schema,
  addVersion,
  intField,
  model,
  mutableSchemaOptions,
  objectId,
  textField,
} from "../../lib/mongo/schema-helpers.js";

const ownerSnapshotSchema = new Schema(
  {
    displayName: textField({ required: true, max: 80 }),
    avatarKey: textField({ max: 512, select: false }),
    universityId: { type: objectId, ref: "University" },
  },
  { _id: false, strict: "throw" },
);
const openingSchema = new Schema(
  {
    roleName: textField({ required: true, min: 2, max: 100 }),
    description: textField({ required: true, min: 1, max: 2000 }),
    requiredSkillIds: {
      type: [{ type: objectId, ref: "Skill" }],
      default: [],
      validate: [
        (v) => v.length <= 20 && new Set(v.map(String)).size === v.length,
        "Opening skills must be unique and at most 20",
      ],
    },
    capacity: intField({ min: 1, max: 100 }),
    filledCount: intField({ defaultValue: 0 }),
    status: {
      type: String,
      enum: ["OPEN", "FILLED", "CLOSED"],
      default: "OPEN",
      required: true,
    },
  },
  { timestamps: true, versionKey: false, strict: "throw" },
);

const projectSchema = addVersion(
  new Schema(
    {
      ownerId: { type: objectId, ref: "User", required: true, immutable: true },
      ownerSnapshot: ownerSnapshotSchema,
      title: textField({ required: true, min: 5, max: 180 }),
      description: textField({ required: true, min: 20, max: 12000 }),
      projectType: {
        type: String,
        enum: [
          "RESEARCH",
          "ACADEMIC",
          "STARTUP",
          "HACKATHON",
          "PERSONAL",
          "OTHER",
        ],
        required: true,
      },
      requiredSkillIds: {
        type: [{ type: objectId, ref: "Skill" }],
        default: [],
        validate: [
          (v) => v.length <= 30 && new Set(v.map(String)).size === v.length,
          "Project skills must be unique and at most 30",
        ],
      },
      visibility: {
        type: String,
        enum: ["PLATFORM", "UNIVERSITY", "PRIVATE"],
        default: "PLATFORM",
        required: true,
      },
      universityId: { type: objectId, ref: "University" },
      expectedStartAt: Date,
      expectedEndAt: Date,
      openings: {
        type: [openingSchema],
        default: [],
        validate: [(v) => v.length <= 20, "Openings exceed maximum"],
      },
      acceptingMembers: { type: Boolean, default: false, required: true },
      status: {
        type: String,
        enum: [
          "DRAFT",
          "RECRUITING",
          "ACTIVE",
          "COMPLETION_PENDING",
          "COMPLETED",
          "CANCELLED",
          "ARCHIVED",
        ],
        default: "DRAFT",
        required: true,
      },
      materialRevision: intField({ defaultValue: 0 }),
      moderationStatus: {
        type: String,
        enum: ["VISIBLE", "RESTRICTED", "HIDDEN"],
        default: "VISIBLE",
        required: true,
      },
      publishedAt: Date,
      startedAt: Date,
      completionRequestedAt: Date,
      completedAt: Date,
      cancelledAt: Date,
      archivedAt: Date,
      statusReasonCode: textField({ max: 80, select: false }),
    },
    mutableSchemaOptions,
  ),
);
projectSchema.index(
  {
    status: 1,
    acceptingMembers: 1,
    moderationStatus: 1,
    createdAt: -1,
    _id: -1,
  },
  { name: "ix_projects_recruiting_feed" },
);
projectSchema.index(
  { ownerId: 1, status: 1, createdAt: -1, _id: -1 },
  { name: "ix_projects_owner_status_cursor" },
);
projectSchema.index(
  { status: 1, projectType: 1, createdAt: -1, _id: -1 },
  { name: "ix_projects_type_feed" },
);
projectSchema.index(
  { status: 1, requiredSkillIds: 1, createdAt: -1, _id: -1 },
  { name: "ix_projects_skill_feed" },
);
projectSchema.index(
  { universityId: 1, status: 1, createdAt: -1, _id: -1 },
  { name: "ix_projects_university_feed" },
);

export const Project = model("Project", projectSchema, "projects");
