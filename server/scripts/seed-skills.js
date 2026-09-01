import dns from "node:dns";
import mongoose from "mongoose";
import { parseEnvironment } from "../src/config/env.js";
import { User } from "../src/modules/auth/user.model.js";
import { Skill } from "../src/modules/skills/skill.model.js";

const catalogue = [
  ["HTML", "Frontend"],
  ["CSS", "Frontend"],
  ["JavaScript", "Programming"],
  ["React", "Frontend"],
  ["Tailwind CSS", "Frontend"],
  ["Node.js", "Backend"],
  ["Express.js", "Backend"],
  ["MongoDB", "Database"],
  ["Mongoose", "Database"],
  ["REST API", "Backend"],
  ["Git", "Tools"],
  ["Figma", "Design"],
  ["UI/UX Design", "Design"],
  ["Quality Assurance", "Quality"],
  ["DevOps", "Infrastructure"],
];
const config = parseEnvironment();
if (config.mongodbDnsServers.length) dns.setServers(config.mongodbDnsServers);

try {
  await mongoose.connect(config.mongodbUri, {
    dbName: config.mongodbDbName,
    serverSelectionTimeoutMS: 10_000,
  });
  const actor = await User.findOne({
    email: "system.bootstrap@campuscollab.invalid",
  });
  if (!actor)
    throw new Error(
      "Bootstrap system actor is missing; run npm run db:seed:uiu first",
    );
  for (const [name, category] of catalogue) {
    await Skill.findOneAndUpdate(
      { normalizedName: name.toLowerCase() },
      {
        $set: {
          name,
          normalizedName: name.toLowerCase(),
          category,
          status: "ACTIVE",
          updatedByUserId: actor._id,
        },
        $setOnInsert: { createdByUserId: actor._id, aliases: [] },
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    );
  }
  process.stdout.write(
    `Seeded ${catalogue.length} canonical skills into ${config.mongodbDbName}.\n`,
  );
} catch (error) {
  const safeMessage = String(error?.message ?? "").replaceAll(
    config.mongodbUri,
    "[REDACTED_MONGODB_URI]",
  );
  process.stderr.write(
    `Skill seed failed (${error?.name ?? "Error"}): ${safeMessage}\n`,
  );
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
