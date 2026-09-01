import mongoose from "mongoose";

export async function withTransaction(work, options = {}) {
  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(() => work(session), {
      readPreference: "primary",
      readConcern: { level: "snapshot" },
      writeConcern: { w: "majority" },
      maxCommitTimeMS: 5_000,
      ...options,
    });
  } finally {
    await session.endSession();
  }
}
