import dns from "node:dns";
import mongoose from "mongoose";
import { parseEnvironment } from "../src/config/env.js";
import { User } from "../src/modules/auth/user.model.js";
import { Session } from "../src/modules/auth/session.model.js";
import { VerificationChallenge } from "../src/modules/auth/verification-challenge.model.js";
import { Profile } from "../src/modules/profiles/profile.model.js";
import { PortfolioItem } from "../src/modules/profiles/portfolio-item.model.js";
import { UniversityAffiliation } from "../src/modules/university/university-affiliation.model.js";

const config = parseEnvironment();
if (config.isProduction)
  throw new Error("Profile smoke test is disabled in production");
const base = `${config.apiUrl}/api/v1`;
const marker = Date.now();
const emails = [
  `codex.profile.a.${marker}@bscse.uiu.ac.bd`,
  `codex.profile.b.${marker}@bscse.uiu.ac.bd`,
];
const password = "LocalSmoke12345";

async function jsonRequest(path, options = {}) {
  const response = await fetch(`${base}${path}`, options);
  const body = response.status === 204 ? null : await response.json();
  return { response, body };
}
async function register(email, name) {
  const { response, body } = await jsonRequest("/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name,
      email,
      password,
      confirmPassword: password,
      primaryExperience: "SEEKING_WORK",
    }),
  });
  if (response.status !== 201 || body.data.requiresEmailVerification !== false)
    throw new Error(`Registration failed with ${response.status}`);
}
async function login(email) {
  const { response, body } = await jsonRequest("/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password, remember: false }),
  });
  if (response.status !== 200)
    throw new Error(`Login failed with ${response.status}`);
  return {
    cookie: response.headers.get("set-cookie"),
    csrf: body.data.csrfToken,
  };
}
const mutate = (auth, method, body) => ({
  method,
  headers: {
    cookie: auth.cookie,
    "x-csrf-token": auth.csrf,
    ...(body ? { "content-type": "application/json" } : {}),
  },
  ...(body ? { body: JSON.stringify(body) } : {}),
});

let connected = false;
try {
  await register(emails[0], "Profile Smoke A");
  await register(emails[1], "Profile Smoke B");
  const [authA, authB] = await Promise.all([
    login(emails[0]),
    login(emails[1]),
  ]);
  const skillsResponse = await jsonRequest("/skills?limit=5");
  const skills = skillsResponse.body.data.skills;
  if (skills.length < 2) throw new Error("Canonical skills are missing");
  let result = await jsonRequest(
    "/profiles/me",
    mutate(authA, "PATCH", {
      headline: "MERN product engineer",
      department: "CSE",
      graduationYear: 2027,
      bio: "Synthetic profile used by the local CampusCollab smoke test.",
      experienceLevel: "INTERMEDIATE",
      visibility: "PLATFORM",
      externalLinks: [{ type: "GITHUB", url: "https://github.com/example" }],
    }),
  );
  if (result.response.status !== 200)
    throw new Error(`Profile update failed with ${result.response.status}`);
  result = await jsonRequest(
    "/profiles/me/skills",
    mutate(authA, "PUT", {
      skills: skills
        .slice(0, 2)
        .map((skill) => ({ skillId: skill.id, level: "INTERMEDIATE" })),
    }),
  );
  if (result.response.status !== 200)
    throw new Error(`Skill update failed with ${result.response.status}`);
  result = await jsonRequest(
    "/profiles/me/availability",
    mutate(authA, "PATCH", {
      status: "AVAILABLE",
      hoursPerWeek: 12,
      availableFrom: null,
    }),
  );
  if (result.response.status !== 200)
    throw new Error(
      `Availability update failed with ${result.response.status}`,
    );
  result = await jsonRequest(
    "/profiles/me/portfolio-items",
    mutate(authA, "POST", {
      title: "CampusCollab Smoke Project",
      description: "Synthetic portfolio evidence for API smoke testing.",
      role: "Full-stack developer",
      skillIds: skills.slice(0, 2).map((skill) => skill.id),
      externalLinks: [
        { type: "REPOSITORY", url: "https://github.com/example/project" },
      ],
      status: "PUBLISHED",
    }),
  );
  if (result.response.status !== 201)
    throw new Error(`Portfolio create failed with ${result.response.status}`);
  const itemId = result.body.data.item.id;
  const own = await jsonRequest("/profiles/me", {
    headers: { cookie: authA.cookie },
  });
  if (
    own.response.status !== 200 ||
    own.body.data.profile.completionScore !== 100
  )
    throw new Error(
      "Profile completion did not reach the expected stored-data result",
    );
  const publicProfile = await jsonRequest(
    `/profiles/${own.body.data.profile.userId}`,
  );
  if (
    publicProfile.response.status !== 200 ||
    "preferences" in publicProfile.body.data.profile
  )
    throw new Error("Public profile projection failed");
  const crossDelete = await jsonRequest(
    `/portfolio-items/${itemId}`,
    mutate(authB, "DELETE"),
  );
  if (crossDelete.response.status !== 404)
    throw new Error(
      `Cross-user delete returned ${crossDelete.response.status}`,
    );
  const ownerDelete = await jsonRequest(
    `/portfolio-items/${itemId}`,
    mutate(authA, "DELETE"),
  );
  if (ownerDelete.response.status !== 204)
    throw new Error(`Owner delete failed with ${ownerDelete.response.status}`);
  process.stdout.write(
    "Live profile smoke test passed: registration, login, profile, skills, availability, portfolio, public privacy, ownership, cleanup.\n",
  );
} finally {
  if (config.mongodbDnsServers.length) dns.setServers(config.mongodbDnsServers);
  await mongoose.connect(config.mongodbUri, { dbName: config.mongodbDbName });
  connected = true;
  const users = await User.find({ email: { $in: emails } })
    .select("_id")
    .lean();
  const userIds = users.map((user) => user._id);
  if (userIds.length) {
    await Promise.all([
      Session.deleteMany({ userId: { $in: userIds } }),
      VerificationChallenge.deleteMany({ userId: { $in: userIds } }),
      PortfolioItem.deleteMany({ userId: { $in: userIds } }),
      Profile.deleteMany({ userId: { $in: userIds } }),
      UniversityAffiliation.deleteMany({ userId: { $in: userIds } }),
    ]);
    await User.deleteMany({ _id: { $in: userIds }, email: { $in: emails } });
  }
  if (connected) await mongoose.disconnect();
}
