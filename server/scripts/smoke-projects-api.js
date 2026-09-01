import dns from "node:dns";
import mongoose from "mongoose";
import { parseEnvironment } from "../src/config/env.js";
import { AuditEvent } from "../src/modules/audit/audit-event.model.js";
import { OutboxEvent } from "../src/modules/audit/outbox-event.model.js";
import { Session } from "../src/modules/auth/session.model.js";
import { User } from "../src/modules/auth/user.model.js";
import { VerificationChallenge } from "../src/modules/auth/verification-challenge.model.js";
import { Invitation } from "../src/modules/participation/invitation.model.js";
import { JoinRequest } from "../src/modules/participation/join-request.model.js";
import { ProjectMembership } from "../src/modules/participation/project-membership.model.js";
import { PortfolioItem } from "../src/modules/profiles/portfolio-item.model.js";
import { Profile } from "../src/modules/profiles/profile.model.js";
import { Project } from "../src/modules/projects/project.model.js";
import { UniversityAffiliation } from "../src/modules/university/university-affiliation.model.js";
const config = parseEnvironment(),
  base = (process.env.SMOKE_API_URL || config.apiUrl) + "/api/v1",
  marker = Date.now(),
  emails = ["a", "b", "c"].map(
    (x) => `codex.project.${x}.${marker}@bscse.uiu.ac.bd`,
  ),
  password = "LocalSmoke12345";
const ids = [];
async function req(path, options = {}) {
  const response = await fetch(`${base}${path}`, options),
    body = response.status === 204 ? null : await response.json();
  return { response, body };
}
async function register(email, name) {
  const r = await req("/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name,
      email,
      password,
      confirmPassword: password,
      primaryExperience: "OWNING_WORK",
    }),
  });
  if (r.response.status !== 201)
    throw new Error(
      `Registration failed (${r.response.status}): ${r.body?.error?.code}`,
    );
}
async function login(email) {
  const r = await req("/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password, remember: false }),
  });
  if (r.response.status !== 200)
    throw new Error(`Login failed (${r.response.status})`);
  return {
    cookie: r.response.headers.get("set-cookie"),
    csrf: r.body.data.csrfToken,
    userId: r.body.data.user.id,
  };
}
const mutate = (auth, method, body, key = crypto.randomUUID()) => ({
  method,
  headers: {
    cookie: auth.cookie,
    "x-csrf-token": auth.csrf,
    "idempotency-key": key,
    ...(body !== undefined ? { "content-type": "application/json" } : {}),
  },
  ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
});
async function profile(auth, name, skillId) {
  let r = await req(
    "/profiles/me",
    mutate(auth, "PATCH", {
      displayName: name,
      headline: "Campus collaboration QA student",
      bio: "I build accessible and reliable campus software with collaborative teams.",
      department: "CSE",
      experienceLevel: "INTERMEDIATE",
      visibility: "PLATFORM",
    }),
  );
  if (r.response.status !== 200)
    throw new Error(`Profile update failed ${r.response.status}`);
  r = await req(
    "/profiles/me/skills",
    mutate(auth, "PUT", { skills: [{ skillId, level: "INTERMEDIATE" }] }),
  );
  if (r.response.status !== 200)
    throw new Error(`Profile skills failed ${r.response.status}`);
  r = await req(
    "/profiles/me/availability",
    mutate(auth, "PATCH", { status: "AVAILABLE", hoursPerWeek: 12 }),
  );
  if (r.response.status !== 200)
    throw new Error(`Availability failed ${r.response.status}`);
}
let connected = false;
try {
  for (let i = 0; i < 3; i++)
    await register(emails[i], `Project QA ${String.fromCharCode(65 + i)}`);
  const [a, b, c] = await Promise.all(emails.map(login));
  ids.push(a.userId, b.userId, c.userId);
  const skills = (await req("/skills?limit=2")).body.data.skills;
  if (!skills.length) throw new Error("No skills are seeded");
  await profile(a, "Project Owner QA", skills[0].id);
  await profile(b, "Project Applicant QA", skills[0].id);
  await profile(c, "Project Invitee QA", skills[0].id);
  const create = {
    title: `QA ${marker} accessible campus research portal`,
    description:
      "Build and evaluate an accessible student research portal with clear team roles and safe collaboration workflows.",
    projectType: "RESEARCH",
    requiredSkillIds: [skills[0].id],
    visibility: "PLATFORM",
    openings: [
      {
        roleName: "Frontend researcher",
        description: "Build and test accessible interfaces.",
        requiredSkillIds: [skills[0].id],
        capacity: 1,
      },
      {
        roleName: "QA analyst",
        description: "Create and execute collaboration test scenarios.",
        requiredSkillIds: [skills[0].id],
        capacity: 1,
      },
    ],
  };
  let r = await req("/projects", mutate(a, "POST", create));
  if (r.response.status !== 201 || r.body.data.project.status !== "DRAFT")
    throw new Error(
      `Project create failed ${r.response.status}: ${r.body?.error?.code}`,
    );
  const project = r.body.data.project,
    first = project.openings[0],
    second = project.openings[1];
  r = await req(
    `/projects/${project.id}`,
    mutate(b, "PATCH", { title: "Unauthorized ownership attempt" }),
  );
  if (r.response.status !== 404)
    throw new Error(`BOLA project edit returned ${r.response.status}`);
  r = await req(
    `/projects/${project.id}`,
    mutate(a, "PATCH", { ownerId: b.userId }),
  );
  if (r.response.status !== 422)
    throw new Error(`Owner spoof returned ${r.response.status}`);
  r = await req(`/projects/${project.id}:publish`, mutate(a, "POST", {}));
  if (r.response.status !== 200 || r.body.data.project.status !== "RECRUITING")
    throw new Error(
      `Publish failed ${r.response.status}: ${r.body?.error?.code}`,
    );
  const joinKey = crypto.randomUUID();
  r = await req(
    `/projects/${project.id}/openings/${first.id}/join-requests`,
    mutate(
      b,
      "POST",
      {
        message:
          "I can deliver accessible React interfaces and collaborate through reviews.",
      },
      joinKey,
    ),
  );
  if (r.response.status !== 201)
    throw new Error(`Join failed ${r.response.status}: ${r.body?.error?.code}`);
  const requestId = r.body.data.joinRequest.id;
  r = await req(
    `/projects/${project.id}/openings/${first.id}/join-requests`,
    mutate(
      b,
      "POST",
      {
        message:
          "I can deliver accessible React interfaces and collaborate through reviews.",
      },
      joinKey,
    ),
  );
  if (r.response.status !== 201 || r.body.data.joinRequest.id !== requestId)
    throw new Error("Join idempotency failed");
  r = await req(`/join-requests/${requestId}:accept`, mutate(c, "POST", {}));
  if (r.response.status !== 404)
    throw new Error(`Non-owner accepted request (${r.response.status})`);
  r = await req(`/join-requests/${requestId}:accept`, mutate(a, "POST", {}));
  if (r.response.status !== 200)
    throw new Error(
      `Join acceptance failed ${r.response.status}: ${r.body?.error?.code}`,
    );
  const membershipB = r.body.data.result.id;
  r = await req(
    `/projects/${project.id}/openings/${first.id}/join-requests`,
    mutate(c, "POST", {
      message: "I am attempting the already filled role after acceptance.",
    }),
  );
  if (r.response.status !== 409)
    throw new Error(
      `Filled opening accepted another request (${r.response.status})`,
    );
  r = await req(
    `/projects/${project.id}/openings/${second.id}/invitations`,
    mutate(a, "POST", {
      inviteeId: c.userId,
      message: "Please join this project as our QA analyst.",
      expiresInDays: 14,
    }),
  );
  if (r.response.status !== 201)
    throw new Error(
      `Invite failed ${r.response.status}: ${r.body?.error?.code}`,
    );
  const invitationId = r.body.data.invitation.id;
  r = await req(`/invitations/${invitationId}:accept`, mutate(b, "POST", {}));
  if (r.response.status !== 404)
    throw new Error(`Wrong invitee accepted invitation (${r.response.status})`);
  r = await req(`/invitations/${invitationId}:accept`, mutate(c, "POST", {}));
  if (r.response.status !== 200)
    throw new Error(
      `Invitation acceptance failed ${r.response.status}: ${r.body?.error?.code}`,
    );
  const membershipC = r.body.data.result.id;
  r = await req(
    `/projects/${project.id}/members/${membershipB}:remove`,
    mutate(c, "POST", {}),
  );
  if (r.response.status !== 404)
    throw new Error(`Non-owner removed member (${r.response.status})`);
  r = await req(
    `/projects/${project.id}/members/${membershipB}:remove`,
    mutate(a, "POST", {}),
  );
  if (r.response.status !== 200)
    throw new Error(`Owner removal failed ${r.response.status}`);
  r = await req(
    `/projects/${project.id}/members/${membershipC}:remove`,
    mutate(a, "POST", {}),
  );
  if (r.response.status !== 200)
    throw new Error(`Invitee removal failed ${r.response.status}`);
  const inviteB = await req(
      `/projects/${project.id}/openings/${first.id}/invitations`,
      mutate(a, "POST", {
        inviteeId: b.userId,
        message: "Concurrent capacity test invitation B.",
        expiresInDays: 14,
      }),
    ),
    inviteC = await req(
      `/projects/${project.id}/openings/${first.id}/invitations`,
      mutate(a, "POST", {
        inviteeId: c.userId,
        message: "Concurrent capacity test invitation C.",
        expiresInDays: 14,
      }),
    );
  if (inviteB.response.status !== 201 || inviteC.response.status !== 201)
    throw new Error("Concurrent invitations could not be prepared");
  const concurrent = await Promise.all([
    req(
      `/invitations/${inviteB.body.data.invitation.id}:accept`,
      mutate(b, "POST", {}),
    ),
    req(
      `/invitations/${inviteC.body.data.invitation.id}:accept`,
      mutate(c, "POST", {}),
    ),
  ]);
  const statuses = concurrent.map((x) => x.response.status).sort();
  if (statuses[0] !== 200 || statuses[1] !== 409)
    throw new Error(
      `Concurrent final-slot guard failed: ${statuses.join(",")}`,
    );
  const activeMembership = concurrent.find((x) => x.response.status === 200)
    .body.data.result.id;
  r = await req(
    `/projects/${project.id}:transition`,
    mutate(b, "POST", { toStatus: "ACTIVE" }),
  );
  if (r.response.status !== 404)
    throw new Error(`Non-owner started project (${r.response.status})`);
  r = await req(
    `/projects/${project.id}:transition`,
    mutate(a, "POST", { toStatus: "ACTIVE" }),
  );
  if (r.response.status !== 200 || r.body.data.project.status !== "ACTIVE")
    throw new Error(`Owner start failed ${r.response.status}`);
  const memberList = await req(`/projects/${project.id}/members`, {
    headers: { cookie: a.cookie },
  });
  if (
    memberList.response.status !== 200 ||
    !memberList.body.data.members.some(
      (m) => m.id === activeMembership && m.status === "ACTIVE",
    )
  )
    throw new Error("Member roster did not preserve the concurrency winner");
  process.stdout.write(
    "Projects smoke passed: A ownership, B join, C invitation, isolation, idempotency, concurrent final-slot capacity, lifecycle, removal, and membership.\n",
  );
} finally {
  if (config.mongodbDnsServers.length) dns.setServers(config.mongodbDnsServers);
  await mongoose.connect(config.mongodbUri, { dbName: config.mongodbDbName });
  connected = true;
  const users = await User.find({ email: { $in: emails } })
      .select("_id")
      .lean(),
    userIds = users.map((u) => u._id),
    projects = await Project.find({ ownerId: { $in: userIds } })
      .select("_id")
      .lean(),
    projectIds = projects.map((p) => p._id),
    sources = [
      ...(await JoinRequest.find({ projectId: { $in: projectIds } })
        .select("_id")
        .lean()),
      ...(await Invitation.find({ projectId: { $in: projectIds } })
        .select("_id")
        .lean()),
    ].map((x) => x._id);
  if (projectIds.length)
    await ProjectMembership.deleteMany({ projectId: { $in: projectIds } });
  await Promise.all([
    JoinRequest.deleteMany({ projectId: { $in: projectIds } }),
    Invitation.deleteMany({ projectId: { $in: projectIds } }),
    Project.deleteMany({ _id: { $in: projectIds } }),
    AuditEvent.deleteMany({
      $or: [
        { actorId: { $in: userIds } },
        { targetId: { $in: [...projectIds, ...sources] } },
      ],
    }),
    OutboxEvent.deleteMany({
      $or: [
        { aggregateId: { $in: [...projectIds, ...sources] } },
        { "payload.userId": { $in: userIds.map(String) } },
      ],
    }),
    Session.deleteMany({ userId: { $in: userIds } }),
    VerificationChallenge.deleteMany({ userId: { $in: userIds } }),
    PortfolioItem.deleteMany({ userId: { $in: userIds } }),
    Profile.deleteMany({ userId: { $in: userIds } }),
    UniversityAffiliation.deleteMany({ userId: { $in: userIds } }),
  ]);
  if (userIds.length) await User.deleteMany({ _id: { $in: userIds } });
  if (connected) await mongoose.disconnect();
}
