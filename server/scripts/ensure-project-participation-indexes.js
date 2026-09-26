import "dotenv/config";
import mongoose from "mongoose";
import { ProjectMembership } from "../src/modules/participation/project-membership.model.js";

if (!process.env.MONGODB_URI)
  throw new Error("MONGODB_URI is required to ensure project indexes.");

await mongoose.connect(process.env.MONGODB_URI, {
  dbName: process.env.MONGODB_DB_NAME,
  autoIndex: false,
  serverSelectionTimeoutMS: 10_000,
  connectTimeoutMS: 10_000,
});
try {
  const name = await ProjectMembership.collection.createIndex(
    { projectId: 1, openingId: 1, status: 1 },
    { name: "ix_memberships_project_opening_status" },
  );
  console.log(`PROJECT_PARTICIPATION_INDEX_READY=${name}`);
} finally {
  await mongoose.disconnect();
}
