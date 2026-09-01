import { RedisStore } from "rate-limit-redis";
import { createClient } from "redis";

export async function initializeRateLimiting(config, logger) {
  if (!config.redisUrl) {
    logger.warn(
      { event: "rate_limit.memory_store" },
      "Using in-memory rate limits; configure REDIS_URL before running multiple instances",
    );
    return { storeFor: () => undefined, close: async () => {} };
  }

  const client = createClient({ url: config.redisUrl });
  client.on("error", (error) => {
    logger.error(
      { event: "redis.error", errorType: error?.name },
      "Redis rate-limit connection error",
    );
  });
  await client.connect();
  logger.info({ event: "redis.connected" }, "Redis rate-limit store connected");

  return {
    storeFor(prefix) {
      return new RedisStore({
        prefix: `campuscollab:rate-limit:${prefix}:`,
        sendCommand: (...args) => client.sendCommand(args),
      });
    },
    async close() {
      if (client.isOpen) await client.quit();
      logger.info({ event: "redis.closed" }, "Redis rate-limit store closed");
    },
  };
}
