import { ConflictError } from '../../errors/application-error.js';

const transitions = {
  DRAFT: new Set(['RECRUITING', 'ARCHIVED']),
  RECRUITING: new Set(['ACTIVE', 'CANCELLED']),
  ACTIVE: new Set(['CANCELLED']),
  CANCELLED: new Set(['ARCHIVED']),
};

export function targetProjectState(current, target) {
  if (!transitions[current]?.has(target)) throw new ConflictError('INVALID_STATE', `A project cannot move from ${current} to ${target}.`);
  return target;
}

export const recruitmentStates = ['RECRUITING', 'ACTIVE'];
export const editableProjectStates = ['DRAFT', 'RECRUITING'];
