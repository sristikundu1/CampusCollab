import dns from 'node:dns';
import mongoose from 'mongoose';

export function createDatabaseManager(adapter = mongoose) {
  const state = { status: 'DISCONNECTED', lastErrorCode: null };
  let listenersInstalled = false;

  function installListeners(logger) {
    if (listenersInstalled) return;
    listenersInstalled = true;
    adapter.connection.on('connecting', () => {
      state.status = 'CONNECTING';
      logger.info({ event: 'mongodb.connecting' }, 'MongoDB connection starting');
    });
    adapter.connection.on('connected', () => {
      state.status = 'CONNECTED';
      state.lastErrorCode = null;
      logger.info({ event: 'mongodb.connected' }, 'MongoDB connected');
    });
    adapter.connection.on('disconnected', () => {
      state.status = 'DISCONNECTED';
      logger.warn({ event: 'mongodb.disconnected' }, 'MongoDB disconnected');
    });
    adapter.connection.on('error', (error) => {
      state.status = 'ERROR';
      state.lastErrorCode = error?.name ?? 'MONGODB_ERROR';
      logger.error({ event: 'mongodb.error', errorType: error?.name }, 'MongoDB connection error');
    });
  }

  async function connect(config, logger, overrides = {}) {
    if (adapter.connection.readyState === 1) return adapter.connection;
    installListeners(logger);
    if (config.mongodbDnsServers?.length) {
      dns.setServers(config.mongodbDnsServers);
      logger.warn(
        { event: 'mongodb.dns_override', serverCount: config.mongodbDnsServers.length },
        'Using configured DNS resolvers for MongoDB',
      );
    }
    state.status = 'CONNECTING';
    try {
      await adapter.connect(config.mongodbUri, {
      dbName: config.mongodbDbName,
      autoIndex: !config.isProduction,
      maxPoolSize: 20,
      minPoolSize: 0,
      maxIdleTimeMS: 60_000,
      waitQueueTimeoutMS: 10_000,
      serverSelectionTimeoutMS: 10_000,
      connectTimeoutMS: 10_000,
        ...overrides,
      });
      state.status = 'CONNECTED';
      return adapter.connection;
    } catch (error) {
      state.status = 'ERROR';
      state.lastErrorCode = error?.name ?? 'MONGODB_CONNECT_FAILED';
      throw error;
    }
  }

  async function disconnect(logger) {
    if (adapter.connection.readyState === 0) return;
    await adapter.disconnect();
    state.status = 'DISCONNECTED';
    logger.info({ event: 'mongodb.closed' }, 'MongoDB connection closed');
  }

  function readiness() {
    return { ready: adapter.connection.readyState === 1, status: state.status };
  }

  return { connect, disconnect, readiness };
}

const databaseManager = createDatabaseManager();
export const connectDatabase = databaseManager.connect;
export const disconnectDatabase = databaseManager.disconnect;
export const getDatabaseReadiness = databaseManager.readiness;
