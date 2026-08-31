import assert from 'node:assert/strict';
import test from 'node:test';
import { ConflictError } from '../../src/errors/application-error.js';
import { createGigService } from '../../src/modules/gigs/gig.service.js';

const USER = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const GIG = 'cccccccccccccccccccccccc';
const config = { csrfSecret: 'test-csrf-secret-with-more-than-thirty-two-characters' };

function serviceFor(gig) {
  const calls = [];
  const GigModel = {
    findOne: async () => gig,
    deleteOne: async (filter) => { calls.push(['gig', filter]); return { deletedCount: 1 }; },
  };
  const BookmarkModel = { deleteMany: async (filter) => { calls.push(['bookmarks', filter]); } };
  return { service: createGigService({ config, GigModel, BookmarkModel }), calls };
}

test('owner can permanently delete an empty draft and related bookmarks', async () => {
  const document = { _id: GIG, status: 'DRAFT', proposalCount: 0, acceptedCount: 0, version: 1 };
  const { service, calls } = serviceFor(document);
  await service.remove(USER, GIG);
  assert.equal(calls[0][0], 'gig');
  assert.deepEqual(calls[1], ['bookmarks', { gigId: GIG }]);
});

test('permanent deletion rejects active lifecycle states and collaboration history', async () => {
  const active = serviceFor({ _id: GIG, status: 'PUBLISHED', proposalCount: 0, acceptedCount: 0, version: 1 }).service;
  await assert.rejects(() => active.remove(USER, GIG), (error) => error instanceof ConflictError && error.code === 'PERMANENT_DELETE_NOT_ALLOWED');
  const history = serviceFor({ _id: GIG, status: 'ARCHIVED', proposalCount: 1, acceptedCount: 0, version: 2 }).service;
  await assert.rejects(() => history.remove(USER, GIG), (error) => error instanceof ConflictError && error.code === 'GIG_HAS_COLLABORATION_HISTORY');
});
