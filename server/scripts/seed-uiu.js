import 'dotenv/config';
import dns from 'node:dns';
import mongoose from 'mongoose';
import { parseEnvironment } from '../src/config/env.js';
import { User } from '../src/modules/auth/user.model.js';
import { University } from '../src/modules/university/university.model.js';
import { UniversityDomain } from '../src/modules/university/university-domain.model.js';

const SYSTEM_EMAIL = 'system.bootstrap@campuscollab.invalid';
const UNIVERSITY = Object.freeze({
  name: 'United International University',
  normalizedName: 'united international university',
  shortName: 'UIU',
  countryCode: 'BD',
  region: 'Dhaka',
  websiteUrl: 'https://www.uiu.ac.bd',
});
const DOMAIN = 'bscse.uiu.ac.bd';

const config = parseEnvironment();
if (config.mongodbDnsServers.length) dns.setServers(config.mongodbDnsServers);

let session;
try {
  await mongoose.connect(config.mongodbUri, {
    dbName: config.mongodbDbName,
    serverSelectionTimeoutMS: 10_000,
    connectTimeoutMS: 10_000,
  });
  session = await mongoose.startSession();

  await session.withTransaction(async () => {
    const actor = await User.findOneAndUpdate(
      { email: SYSTEM_EMAIL },
      {
        $setOnInsert: {
          email: SYSTEM_EMAIL,
          passwordHash: 'disabled-system-account',
          status: 'DEACTIVATED',
          primaryExperience: 'OWNING_WORK',
          capabilities: [],
          statusChangedAt: new Date(),
          statusReasonCode: 'SYSTEM_BOOTSTRAP_ACTOR',
        },
      },
      { upsert: true, returnDocument: 'after', session, setDefaultsOnInsert: true },
    );

    const university = await University.findOneAndUpdate(
      { normalizedName: UNIVERSITY.normalizedName, countryCode: UNIVERSITY.countryCode },
      {
        $set: { ...UNIVERSITY, status: 'ACTIVE', updatedByUserId: actor._id },
        $setOnInsert: { createdByUserId: actor._id },
      },
      { upsert: true, returnDocument: 'after', session, setDefaultsOnInsert: true },
    );

    await UniversityDomain.findOneAndUpdate(
      { domain: DOMAIN },
      {
        $set: {
          universityId: university._id,
          matchMode: 'EXACT',
          status: 'ACTIVE',
          effectiveAt: new Date(),
          updatedByUserId: actor._id,
        },
        $setOnInsert: {
          createdByUserId: actor._id,
          evidenceSummary: 'Official UIU BSCSE student email domain.',
        },
      },
      { upsert: true, returnDocument: 'after', session, setDefaultsOnInsert: true },
    );
  });

  process.stdout.write(`Seeded ${UNIVERSITY.name} with active domain ${DOMAIN}.\n`);
} catch (error) {
  process.stderr.write(`UIU seed failed (${error?.name ?? 'Error'}).\n`);
  process.exitCode = 1;
} finally {
  await session?.endSession();
  await mongoose.disconnect();
}
