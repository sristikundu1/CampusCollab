import { ConflictError } from "../../errors/application-error.js";

const transitions = Object.freeze({
  shortlist: { from: ["SUBMITTED"], to: "SHORTLISTED" },
  accept: { from: ["SUBMITTED", "SHORTLISTED"], to: "ACCEPTED" },
  reject: { from: ["SUBMITTED", "SHORTLISTED"], to: "REJECTED" },
  withdraw: { from: ["SUBMITTED", "SHORTLISTED"], to: "WITHDRAWN" },
});

export function targetProposalState(current, action) {
  const transition = transitions[action];
  if (!transition || !transition.from.includes(current))
    throw new ConflictError(
      "INVALID_STATE",
      "This proposal lifecycle transition is not allowed.",
    );
  return transition.to;
}

export const editableProposalStates = Object.freeze([
  "SUBMITTED",
  "SHORTLISTED",
]);
