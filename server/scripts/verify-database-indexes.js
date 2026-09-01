import { connectDatabase, disconnectDatabase } from "../src/config/database.js";
import { parseEnvironment } from "../src/config/env.js";
import { createLogger } from "../src/config/logger.js";
import * as models from "../src/models.js";

const config = parseEnvironment();
const logger = createLogger({
  level: config.logLevel,
  environment: config.nodeEnv,
});

if (config.isProduction) {
  process.stderr.write(
    "Index verification is read-only, but production execution must use a separately approved deployment process.\n",
  );
  process.exit(1);
}

let failed = false;
try {
  await connectDatabase(config, logger);
  for (const [name, entry] of Object.entries(models)) {
    const expected = new Set(
      entry.schema
        .indexes()
        .map(([, options]) => options.name)
        .filter(Boolean),
    );
    const actual = new Set(
      (await entry.collection.indexes()).map((index) => index.name),
    );
    const missing = [...expected].filter((indexName) => !actual.has(indexName));
    if (missing.length) {
      failed = true;
      process.stderr.write(`${name}: missing indexes: ${missing.join(", ")}\n`);
    }
  }
  if (!failed)
    process.stdout.write("All declared model indexes exist in MongoDB.\n");
} finally {
  await disconnectDatabase(logger);
}

if (failed) process.exitCode = 1;
