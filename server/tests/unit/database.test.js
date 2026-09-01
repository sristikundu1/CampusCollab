import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";
import { createDatabaseManager } from "../../src/config/database.js";

const logger = { info() {}, warn() {}, error() {} };

function fakeAdapter(connectImplementation) {
  const connection = new EventEmitter();
  connection.readyState = 0;
  return {
    connection,
    async connect(uri, options) {
      await connectImplementation(uri, options, connection);
    },
    async disconnect() {
      connection.readyState = 0;
    },
  };
}

test("database manager connects once and becomes ready", async () => {
  let calls = 0;
  const adapter = fakeAdapter(async (_uri, options, connection) => {
    calls += 1;
    assert.equal(options.maxPoolSize, 20);
    assert.equal(options.dbName, "CampusCollab");
    connection.readyState = 1;
  });
  const manager = createDatabaseManager(adapter);
  const config = {
    mongodbUri: "mongodb://placeholder/test",
    mongodbDbName: "CampusCollab",
    isProduction: false,
  };
  await manager.connect(config, logger);
  await manager.connect(config, logger);
  assert.equal(calls, 1);
  assert.equal(manager.readiness().ready, true);
  await manager.disconnect(logger);
  assert.equal(manager.readiness().ready, false);
});

test("database manager exposes failure without leaking URI", async () => {
  const adapter = fakeAdapter(async () => {
    throw new Error("connection refused");
  });
  const manager = createDatabaseManager(adapter);
  await assert.rejects(
    manager.connect(
      { mongodbUri: "mongodb://secret/test", isProduction: false },
      logger,
    ),
  );
  assert.deepEqual(manager.readiness(), { ready: false, status: "ERROR" });
});
