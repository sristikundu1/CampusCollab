import { ConflictError } from '../../errors/application-error.js';

const transitions = Object.freeze({
  publish: { from: ['DRAFT'], to: 'PUBLISHED' },
  close: { from: ['PUBLISHED'], to: 'CLOSED' },
  cancel: { from: ['PUBLISHED', 'ASSIGNED', 'ACTIVE'], to: 'CANCELLED' },
  archive: { from: ['DRAFT', 'COMPLETED', 'CLOSED', 'CANCELLED'], to: 'ARCHIVED' },
  start: { from: ['ASSIGNED'], to: 'ACTIVE' },
});

export function targetGigState(current, action) {
  const transition = transitions[action];
  if (!transition || !transition.from.includes(current)) throw new ConflictError('INVALID_STATE', 'This gig lifecycle transition is not allowed.');
  return transition.to;
}
