import { createApp } from "../src/app.js";
import {
  connectDatabase,
  getDatabaseReadiness,
} from "../src/config/database.js";
import {
  parseEnvironment,
  safeConfigurationSummary,
} from "../src/config/env.js";
import { createLogger } from "../src/config/logger.js";
import { initializeRateLimiting } from "../src/lib/rate-limit/redis-store.js";
import "../src/models.js";

let applicationPromise;

async function initializeApplication() {
  const config = parseEnvironment();
  const logger = createLogger({
    level: config.logLevel,
    environment: config.nodeEnv,
  });
  logger.info(
    { config: safeConfigurationSummary(config) },
    "Configuration loaded",
  );
  await connectDatabase(config, logger);
  const rateLimiting = await initializeRateLimiting(config, logger);
  return createApp({
    config,
    logger,
    databaseReadiness: getDatabaseReadiness,
    rateLimitStoreFor: rateLimiting.storeFor,
  });
}

export default async function handler(request, response) {
  applicationPromise ??= initializeApplication();

  try {
    const app = await applicationPromise;
    return app(request, response);
  } catch (error) {
    applicationPromise = undefined;
    process.stderr.write(
      `Application initialization failed: ${error?.name ?? "Error"}\n`,
    );
    return response.status(503).json({
      error: {
        code: "SERVICE_UNAVAILABLE",
        message: "CampusCollab is temporarily unavailable.",
      },
    });
  }
}
