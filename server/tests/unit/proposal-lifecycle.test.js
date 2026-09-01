import assert from 'node:assert/strict';
import test from 'node:test';
import { targetProposalState } from '../../src/modules/proposals/proposal-lifecycle.js';

test('proposal lifecycle permits only documented applicant and owner transitions', () => {
  assert.equal(targetProposalState('SUBMITTED', 'shortlist'), 'SHORTLISTED');
  assert.equal(targetProposalState('SUBMITTED', 'accept'), 'ACCEPTED');
  assert.equal(targetProposalState('SHORTLISTED', 'accept'), 'ACCEPTED');
  assert.equal(targetProposalState('SUBMITTED', 'reject'), 'REJECTED');
  assert.equal(targetProposalState('SHORTLISTED', 'withdraw'), 'WITHDRAWN');
});

test('proposal lifecycle rejects terminal, reverse, and invented transitions', () => {
  for (const [state, action] of [
    ['ACCEPTED', 'withdraw'], ['REJECTED', 'shortlist'], ['WITHDRAWN', 'accept'],
    ['CLOSED', 'reject'], ['SHORTLISTED', 'shortlist'], ['SUBMITTED', 'approve'],
  ]) assert.throws(() => targetProposalState(state, action), (error) => error.code === 'INVALID_STATE');
});
