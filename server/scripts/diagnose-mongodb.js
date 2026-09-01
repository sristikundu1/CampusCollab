import "dotenv/config";
import mongoose from "mongoose";

const uri = process.env.MONGODB_URI ?? "";

function sanitize(value) {
  let output = String(value ?? "");
  if (uri) output = output.replaceAll(uri, "[REDACTED_MONGODB_URI]");
  return output
    .replace(/mongodb(?:\+srv)?:\/\/[^\s]+/gi, "[REDACTED_MONGODB_URI]")
    .replace(/\/\/[^/@\s]+:[^/@\s]+@/g, "//[REDACTED_CREDENTIALS]@");
}

const shape = {
  present: Boolean(uri),
  scheme: uri.startsWith("mongodb+srv://")
    ? "mongodb+srv"
    : uri.startsWith("mongodb://")
      ? "mongodb"
      : "invalid",
  containsWhitespace: /\s/.test(uri),
  containsMarkdown: /[\[\]<>]/.test(uri),
  hasCredentials: /^mongodb(?:\+srv)?:\/\/[^/@]+@/i.test(uri),
};

try {
  await mongoose.connect(uri, {
    dbName: process.env.MONGODB_DB_NAME || undefined,
    serverSelectionTimeoutMS: 5_000,
    connectTimeoutMS: 5_000,
  });
  process.stdout.write(
    `${JSON.stringify({ connected: true, database: mongoose.connection.name, shape })}\n`,
  );
  await mongoose.disconnect();
} catch (error) {
  process.stderr.write(
    `${JSON.stringify({
      connected: false,
      shape,
      errorName: error?.name ?? "Error",
      errorCode: error?.code ?? null,
      message: sanitize(error?.message),
      causeName: error?.cause?.name ?? null,
      causeCode: error?.cause?.code ?? null,
    })}\n`,
  );
  process.exitCode = 1;
}
