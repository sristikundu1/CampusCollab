import http from "node:http";
import { createApp } from "./app.js";
import {
  connectDatabase,
  disconnectDatabase,
  getDatabaseReadiness,
} from "./config/database.js";
import { parseEnvironment, safeConfigurationSummary } from "./config/env.js";
import { createLogger } from "./config/logger.js";
import "./models.js";

let shuttingDown = false;

async function start() {
  let config;
  try {
    config = parseEnvironment();
  } catch (error) {
    process.stderr.write(`Configuration error: ${error.message}\n`);
    for (const issue of error.issues ?? [])
      process.stderr.write(`- ${issue.path}: ${issue.message}\n`);
    process.exitCode = 1;
    return;
  }

  const logger = createLogger({
    level: config.logLevel,
    environment: config.nodeEnv,
  });
  logger.info(
    { config: safeConfigurationSummary(config) },
    "Configuration loaded",
  );

  try {
    await connectDatabase(config, logger);
  } catch (error) {
    logger.fatal(
      { errorType: error?.name },
      "MongoDB initial connection failed",
    );
    process.exitCode = 1;
    return;
  }

  const app = createApp({
    config,
    logger,
    databaseReadiness: getDatabaseReadiness,
  });
  const server = http.createServer(app);
  server.requestTimeout = 30_000;
  server.headersTimeout = 35_000;
  server.keepAliveTimeout = 5_000;

  const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, "Graceful shutdown started");
    const forceTimer = setTimeout(() => {
      logger.fatal("Graceful shutdown timed out");
      process.exit(1);
    }, 15_000).unref();
    server.close(async (serverError) => {
      try {
        await disconnectDatabase(logger);
        clearTimeout(forceTimer);
        process.exit(serverError ? 1 : 0);
      } catch (error) {
        logger.error(
          { errorType: error?.name },
          "Shutdown resource cleanup failed",
        );
        process.exit(1);
      }
    });
  };

  process.once("SIGTERM", () => void shutdown("SIGTERM"));
  process.once("SIGINT", () => void shutdown("SIGINT"));
  server.listen(config.port, () =>
    logger.info({ port: config.port }, "CampusCollab API listening"),
  );
}

void start();
