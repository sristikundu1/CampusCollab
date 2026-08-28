import assert from 'node:assert/strict';
import test from 'node:test';
import * as models from '../../src/models.js';
import { User } from '../../src/modules/auth/user.model.js';
import { Session } from '../../src/modules/auth/session.model.js';
import { VerificationChallenge } from '../../src/modules/auth/verification-challenge.model.js';
import { Proposal } from '../../src/modules/proposals/proposal.model.js';

test('all Phase 3 MVP collections have a registered model', () => {
  assert.equal(Object.keys(models).length, 27);
  const collections = Object.values(models).map((entry) => entry.collection.collectionName).sort();
  assert.deepEqual(collections, ['accountDeletionJobs','attachments','auditEvents','bookmarks','completionRecords','conversations','gigs','invitations','joinRequests','messages','moderationActions','moderationCases','notifications','outboxEvents','portfolioItems','profiles','projectMemberships','projects','proposals','reports','sessions','skills','universities','universityAffiliations','universityDomains','users','verificationChallenges'].sort());
});

test('required fields and enums reject invalid User documents', async () => {
  const missing = new User({});
  const error = await missing.validate().catch((validationError) => validationError);
  assert.ok(error.errors.email);
  assert.ok(error.errors.passwordHash);
  const invalid = new User({ email: 'a@b.edu', passwordHash: 'hash', primaryExperience: 'INVALID' });
  const invalidError = await invalid.validate().catch((validationError) => validationError);
  assert.ok(invalidError.errors.primaryExperience);
});

test('sensitive credential fields are excluded by default', () => {
  assert.equal(User.schema.path('passwordHash').options.select, false);
  assert.equal(Session.schema.path('tokenHash').options.select, false);
  assert.equal(VerificationChallenge.schema.path('tokenHash').options.select, false);
});

test('TTL and critical unique indexes match Phase 3', () => {
  const sessionTtl = Session.schema.indexes().find(([keys]) => keys.expiresAt === 1);
  const challengeTtl = VerificationChallenge.schema.indexes().find(([keys]) => keys.expiresAt === 1);
  assert.equal(sessionTtl[1].expireAfterSeconds, 0);
  assert.equal(challengeTtl[1].expireAfterSeconds, 0);
  const proposalUnique = Proposal.schema.indexes().find(([, options]) => options.name === 'uq_proposals_active_gig_applicant');
  assert.equal(proposalUnique[1].unique, true);
  assert.deepEqual(proposalUnique[1].partialFilterExpression.status.$in, ['SUBMITTED', 'SHORTLISTED', 'ACCEPTED']);
});

test('every explicit index name is globally unique', () => {
  const names = Object.values(models).flatMap((entry) => entry.schema.indexes().map(([, options]) => options.name).filter(Boolean));
  assert.equal(new Set(names).size, names.length);
  assert.ok(names.length >= 60);
});
