import assert from 'node:assert/strict';
import test from 'node:test';
import { targetGigState } from '../../src/modules/gigs/gig-lifecycle.js';

test('gig lifecycle accepts only documented owner transitions', () => {
  assert.equal(targetGigState('DRAFT', 'publish'), 'PUBLISHED');
  assert.equal(targetGigState('DRAFT', 'archive'), 'ARCHIVED');
  assert.equal(targetGigState('PUBLISHED', 'close'), 'CLOSED');
  assert.equal(targetGigState('PUBLISHED', 'cancel'), 'CANCELLED');
  assert.equal(targetGigState('ASSIGNED', 'start'), 'ACTIVE');
  assert.equal(targetGigState('COMPLETED', 'archive'), 'ARCHIVED');
  assert.equal(targetGigState('ARCHIVED', 'restore', 'PUBLISHED'), 'PUBLISHED');
  assert.equal(targetGigState('ARCHIVED', 'restore'), 'DRAFT');
});

test('gig lifecycle rejects reverse and invented transitions', () => {
  for (const [state, action] of [['PUBLISHED','publish'],['PUBLISHED','restore'],['CLOSED','start'],['ACTIVE','publish'],['DRAFT','cancel'],['PUBLISHED','unpublish']]) {
    assert.throws(() => targetGigState(state, action), (error) => error.code === 'INVALID_STATE' && error.status === 409);
  }
});
