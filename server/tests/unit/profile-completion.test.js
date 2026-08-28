import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateProfileCompletion } from '../../src/modules/profiles/profile-completion.js';

test('profile completion is deterministic from stored profile data', () => {
  const empty = calculateProfileCompletion({ displayName: 'Sristi Kundu', availability: { status: 'UNAVAILABLE' }, skillEntries: [], externalLinks: [] }, 0);
  assert.deepEqual(empty, { completionScore: 10, isCompleteForApplications: false });
  const complete = calculateProfileCompletion({
    displayName: 'Sristi Kundu', headline: 'MERN developer', bio: 'I build accessible collaborative products.', department: 'CSE',
    experienceLevel: 'INTERMEDIATE', availability: { status: 'AVAILABLE' }, skillEntries: [{ skillId: 'a' }], externalLinks: [{ url: 'https://github.com/example' }],
  }, 1);
  assert.deepEqual(complete, { completionScore: 100, isCompleteForApplications: true });
});
