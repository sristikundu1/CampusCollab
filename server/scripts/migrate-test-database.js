import dns from 'node:dns';
import mongoose from 'mongoose';
import { parseEnvironment } from '../src/config/env.js';
import * as models from '../src/models.js';

const SOURCE_DATABASE = 'test';
const config = parseEnvironment();

if (config.isProduction) {
  process.stderr.write('Development database migration is disabled in production.\n');
  process.exit(1);
}
if (config.mongodbDbName === SOURCE_DATABASE) {
  process.stderr.write('Target database must differ from the source database.\n');
  process.exit(1);
}
if (config.mongodbDnsServers.length) dns.setServers(config.mongodbDnsServers);

try {
  await mongoose.connect(config.mongodbUri, {
    dbName: config.mongodbDbName,
    serverSelectionTimeoutMS: 10_000,
    connectTimeoutMS: 10_000,
    autoIndex: false,
  });

  const source = mongoose.connection.client.db(SOURCE_DATABASE);
  const target = mongoose.connection.client.db(config.mongodbDbName);
  const sourceCollections = new Set((await source.listCollections({}, { nameOnly: true }).toArray()).map((entry) => entry.name));
  const modelByCollection = new Map(Object.values(models).map((entry) => [entry.collection.collectionName, entry]));
  let discovered = 0;
  let inserted = 0;

  for (const [collectionName, model] of modelByCollection) {
    const targetCollection = target.collection(collectionName);
    if (sourceCollections.has(collectionName)) {
      const documents = await source.collection(collectionName).find({}).toArray();
      discovered += documents.length;
      if (documents.length) {
        const result = await targetCollection.bulkWrite(
          documents.map((document) => ({
            updateOne: { filter: { _id: document._id }, update: { $setOnInsert: document }, upsert: true },
          })),
          { ordered: false },
        );
        inserted += result.upsertedCount;
      }
    }

    const indexes = model.schema.indexes().map(([key, options]) => ({ key, ...options }));
    if (indexes.length) await targetCollection.createIndexes(indexes);
  }

  process.stdout.write(`Migrated CampusCollab data from ${SOURCE_DATABASE} to ${config.mongodbDbName}: ${discovered} found, ${inserted} newly inserted. Source data was preserved.\n`);
} catch (error) {
  process.stderr.write(`Database migration failed (${error?.name ?? 'Error'}).\n`);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
