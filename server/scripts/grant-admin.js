import dns from "node:dns";
import mongoose from "mongoose";
import { parseEnvironment } from "../src/config/env.js";
import { User } from "../src/modules/auth/user.model.js";

const argumentsByName = Object.fromEntries(
  process.argv.slice(2).map((argument) => {
    const [name, ...parts] = argument.replace(/^--/, "").split("=");
    return [name, parts.join("=")];
  }),
);
const email = argumentsByName.email?.trim().toLowerCase();
const confirmed = argumentsByName.confirm === "GRANT_ADMIN";
const grants = [
  "users:read",
  "users:suspend",
  "skills:read",
  "skills:write",
  "universities:read",
  "universities:write",
  "reports:read",
  "reports:resolve",
];

if (!email || !confirmed) {
  process.stderr.write(
    "Usage: npm run admin:grant -- --email=you@example.edu --confirm=GRANT_ADMIN\n",
  );
  process.exit(1);
}

const config = parseEnvironment();
if (config.mongodbDnsServers.length) dns.setServers(config.mongodbDnsServers);

try {
  await mongoose.connect(config.mongodbUri, {
    dbName: config.mongodbDbName,
    serverSelectionTimeoutMS: 10_000,
  });
  const user = await User.findOne({ email }).select("+adminGrants");
  if (!user) throw new Error("No user exists with that email address.");
  if (user.status !== "ACTIVE")
    throw new Error("Only an active, verified account can become an admin.");

  const now = new Date();
  user.capabilities = [...new Set([...user.capabilities, "ADMIN"])];
  const existing = new Set(user.adminGrants.map((grant) => grant.capability));
  user.adminGrants.push(
    ...grants
      .filter((capability) => !existing.has(capability))
      .map((capability) => ({
        capability,
        scope: "PLATFORM",
        grantedByUserId: user._id,
        grantedAt: now,
      })),
  );
  await user.save();
  process.stdout.write(
    `Granted the CampusCollab admin role and ${grants.length} scoped permissions to ${email}. Sign out and sign in again to refresh the session.\n`,
  );
} catch (error) {
  const safeMessage = String(error?.message ?? "Unknown error").replaceAll(
    config.mongodbUri,
    "[REDACTED_MONGODB_URI]",
  );
  process.stderr.write(`Admin grant failed: ${safeMessage}\n`);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
