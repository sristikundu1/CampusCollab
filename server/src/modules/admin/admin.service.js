import {
  AuthorizationError,
  ConflictError,
  NotFoundError,
} from "../../errors/application-error.js";
import { AuditEvent } from "../audit/audit-event.model.js";
import { Session } from "../auth/session.model.js";
import { User } from "../auth/user.model.js";
import { Skill } from "../skills/skill.model.js";
import { UniversityDomain } from "../university/university-domain.model.js";
import { University } from "../university/university.model.js";

const q = async (query, { lean = false, select } = {}) => {
  let value = query;
  if (select && value?.select) value = value.select(select);
  if (lean && value?.lean) value = value.lean();
  return value;
};
const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const normalize = (value) =>
  value.normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase();

export function createAdminService({
  UserModel = User,
  SessionModel = Session,
  SkillModel = Skill,
  UniversityModel = University,
  DomainModel = UniversityDomain,
  AuditModel = AuditEvent,
} = {}) {
  async function requireGrant(userId, capability) {
    const user = await q(UserModel.findById(userId), {
      select: "+adminGrants",
    });
    const now = new Date();
    if (
      user?.status !== "ACTIVE" ||
      !user.capabilities?.includes("ADMIN") ||
      !user.adminGrants?.some(
        (grant) =>
          [capability, "admin:*", "*"].includes(grant.capability) &&
          (!grant.expiresAt || grant.expiresAt > now),
      )
    )
      throw new AuthorizationError(
        "ADMIN_SCOPE_REQUIRED",
        "This administrative permission is required.",
      );
  }
  async function audit(
    actorId,
    eventName,
    targetType,
    targetId,
    reasonCode,
    requestId,
  ) {
    if (!AuditModel) return;
    await AuditModel.create({
      eventName,
      category: "ADMIN",
      actorType: "ADMIN",
      actorId,
      targetType,
      targetId,
      action: eventName,
      result: "SUCCESS",
      reasonCode,
      correlationId: requestId,
      occurredAt: new Date(),
    });
  }
  const safeUser = (user) => ({
    id: String(user._id),
    email: user.email,
    status: user.status,
    capabilities: user.capabilities,
    createdAt: user.createdAt,
    suspendedUntil: user.suspendedUntil ?? null,
  });
  const safeSkill = (skill) => ({
    id: String(skill._id),
    name: skill.name,
    category: skill.category,
    aliases: skill.aliases ?? [],
    status: skill.status,
  });
  const safeDomain = (domain) => ({
    id: String(domain._id),
    universityId: String(domain.universityId),
    domain: domain.domain,
    matchMode: domain.matchMode,
    status: domain.status,
  });
  const safeUniversity = (university, domains = []) => ({
    id: String(university._id),
    name: university.name,
    shortName: university.shortName ?? "",
    countryCode: university.countryCode,
    region: university.region ?? "",
    websiteUrl: university.websiteUrl ?? "",
    status: university.status,
    domains: domains
      .filter((item) => String(item.universityId) === String(university._id))
      .map(safeDomain),
  });

  async function users(adminId, input) {
    await requireGrant(adminId, "users:read");
    const filter = { ...(input.status ? { status: input.status } : {}) };
    if (input.q) filter.email = { $regex: escape(input.q), $options: "i" };
    const rows = await q(
      UserModel.find(filter).sort({ createdAt: -1 }).limit(input.limit),
      { lean: true },
    );
    return rows.map(safeUser);
  }

  async function suspendUser(adminId, userId, input, context) {
    await requireGrant(adminId, "users:suspend");
    if (String(adminId) === String(userId))
      throw new ConflictError(
        "SELF_ADMIN_ACTION",
        "You cannot suspend your own account.",
      );
    const status = input.until
      ? "TEMPORARILY_SUSPENDED"
      : "INDEFINITELY_SUSPENDED";
    const user = await UserModel.findOneAndUpdate(
      { _id: userId, status: "ACTIVE" },
      {
        $set: {
          status,
          suspendedUntil: input.until,
          statusChangedAt: new Date(),
          statusReasonCode: input.reasonCode,
        },
        $inc: { securityVersion: 1, version: 1 },
      },
      { returnDocument: "after", runValidators: true },
    );
    if (!user) throw new NotFoundError();
    await SessionModel.updateMany(
      { userId, status: "ACTIVE" },
      {
        $set: {
          status: "REVOKED",
          revokedAt: new Date(),
          revokeReason: "ADMIN_SUSPENSION",
        },
        $inc: { version: 1 },
      },
    );
    await audit(
      adminId,
      "ADMIN_USER_SUSPENDED",
      "USER",
      userId,
      input.reasonCode,
      context.requestId,
    );
    return safeUser(user);
  }

  async function reinstateUser(adminId, userId, input, context) {
    await requireGrant(adminId, "users:suspend");
    const user = await UserModel.findOneAndUpdate(
      {
        _id: userId,
        status: { $in: ["TEMPORARILY_SUSPENDED", "INDEFINITELY_SUSPENDED"] },
      },
      {
        $set: {
          status: "ACTIVE",
          statusChangedAt: new Date(),
          statusReasonCode: input.reasonCode,
        },
        $unset: { suspendedUntil: 1 },
        $inc: { securityVersion: 1, version: 1 },
      },
      { returnDocument: "after", runValidators: true },
    );
    if (!user) throw new NotFoundError();
    await audit(
      adminId,
      "ADMIN_USER_REINSTATED",
      "USER",
      userId,
      input.reasonCode,
      context.requestId,
    );
    return safeUser(user);
  }

  async function skills(adminId, input) {
    await requireGrant(adminId, "skills:read");
    const filter = { ...(input.status ? { status: input.status } : {}) };
    if (input.q) filter.name = { $regex: escape(input.q), $options: "i" };
    const rows = await q(
      SkillModel.find(filter).sort({ category: 1, name: 1 }).limit(input.limit),
      { lean: true },
    );
    return rows.map(safeSkill);
  }
  async function createSkill(adminId, input, context) {
    await requireGrant(adminId, "skills:write");
    try {
      const skill = await SkillModel.create({
        ...input,
        normalizedName: normalize(input.name),
        createdByUserId: adminId,
        updatedByUserId: adminId,
      });
      await audit(
        adminId,
        "ADMIN_SKILL_CREATED",
        "SKILL",
        skill._id,
        "REFERENCE_DATA",
        context.requestId,
      );
      return safeSkill(skill);
    } catch (error) {
      if (error?.code === 11000)
        throw new ConflictError(
          "DUPLICATE_SKILL",
          "This skill already exists.",
        );
      throw error;
    }
  }
  async function updateSkill(adminId, skillId, input, context) {
    await requireGrant(adminId, "skills:write");
    const { reasonCode, ...changes } = input;
    if (changes.name) changes.normalizedName = normalize(changes.name);
    changes.updatedByUserId = adminId;
    const skill = await SkillModel.findByIdAndUpdate(
      skillId,
      { $set: changes, $inc: { version: 1 } },
      { returnDocument: "after", runValidators: true },
    );
    if (!skill) throw new NotFoundError();
    await audit(
      adminId,
      "ADMIN_SKILL_UPDATED",
      "SKILL",
      skillId,
      reasonCode,
      context.requestId,
    );
    return safeSkill(skill);
  }

  async function universities(adminId, input) {
    await requireGrant(adminId, "universities:read");
    const filter = { ...(input.status ? { status: input.status } : {}) };
    if (input.q) filter.name = { $regex: escape(input.q), $options: "i" };
    const rows = await q(
      UniversityModel.find(filter).sort({ name: 1 }).limit(input.limit),
      { lean: true },
    );
    const domains = rows.length
      ? await q(
          DomainModel.find({
            universityId: { $in: rows.map((item) => item._id) },
          }),
          { lean: true },
        )
      : [];
    return rows.map((item) => safeUniversity(item, domains));
  }
  async function createUniversity(adminId, input, context) {
    await requireGrant(adminId, "universities:write");
    try {
      const university = await UniversityModel.create({
        ...input,
        normalizedName: normalize(input.name),
        createdByUserId: adminId,
        updatedByUserId: adminId,
      });
      await audit(
        adminId,
        "ADMIN_UNIVERSITY_CREATED",
        "UNIVERSITY",
        university._id,
        "REFERENCE_DATA",
        context.requestId,
      );
      return safeUniversity(university);
    } catch (error) {
      if (error?.code === 11000)
        throw new ConflictError(
          "DUPLICATE_UNIVERSITY",
          "This university already exists.",
        );
      throw error;
    }
  }
  async function updateUniversity(adminId, universityId, input, context) {
    await requireGrant(adminId, "universities:write");
    const { reasonCode, ...changes } = input;
    if (changes.name) changes.normalizedName = normalize(changes.name);
    changes.updatedByUserId = adminId;
    const university = await UniversityModel.findByIdAndUpdate(
      universityId,
      { $set: changes, $inc: { version: 1 } },
      { returnDocument: "after", runValidators: true },
    );
    if (!university) throw new NotFoundError();
    await audit(
      adminId,
      "ADMIN_UNIVERSITY_UPDATED",
      "UNIVERSITY",
      universityId,
      reasonCode,
      context.requestId,
    );
    return safeUniversity(university);
  }
  async function createDomain(adminId, universityId, input, context) {
    await requireGrant(adminId, "universities:write");
    if (!(await UniversityModel.exists({ _id: universityId })))
      throw new NotFoundError();
    try {
      const domain = await DomainModel.create({
        ...input,
        universityId,
        effectiveAt: input.status === "ACTIVE" ? new Date() : undefined,
        createdByUserId: adminId,
        updatedByUserId: adminId,
      });
      await audit(
        adminId,
        "ADMIN_UNIVERSITY_DOMAIN_CREATED",
        "UNIVERSITY_DOMAIN",
        domain._id,
        "REFERENCE_DATA",
        context.requestId,
      );
      return safeDomain(domain);
    } catch (error) {
      if (error?.code === 11000)
        throw new ConflictError(
          "DOMAIN_CONFLICT",
          "This domain already belongs to a university.",
        );
      throw error;
    }
  }
  async function updateDomain(adminId, domainId, input, context) {
    await requireGrant(adminId, "universities:write");
    const domain = await DomainModel.findByIdAndUpdate(
      domainId,
      {
        $set: {
          status: input.status,
          updatedByUserId: adminId,
          effectiveAt: input.status === "ACTIVE" ? new Date() : undefined,
          deactivatedAt: input.status === "INACTIVE" ? new Date() : undefined,
        },
        $inc: { version: 1 },
      },
      { returnDocument: "after", runValidators: true },
    );
    if (!domain) throw new NotFoundError();
    await audit(
      adminId,
      "ADMIN_UNIVERSITY_DOMAIN_UPDATED",
      "UNIVERSITY_DOMAIN",
      domainId,
      input.reasonCode,
      context.requestId,
    );
    return safeDomain(domain);
  }
  return {
    users,
    suspendUser,
    reinstateUser,
    skills,
    createSkill,
    updateSkill,
    universities,
    createUniversity,
    updateUniversity,
    createDomain,
    updateDomain,
  };
}
