# CampusCollab — Phase 1 Requirements Specification

**Document status:** Baseline for review  
**Phase:** Requirements Engineering  
**System:** CampusCollab  
**Implementation status:** No application implementation is authorized by this document  

## 0. Purpose and Boundaries

This document converts the CampusCollab product concept, presentation, and Figma prototype into a testable product requirements baseline. It defines expected system behavior without prescribing database structures, API endpoints, deployment vendors, or application code.

The words **must**, **should**, and **may** express requirement priority:

- **Must:** mandatory for the MVP unless explicitly marked otherwise.
- **Should:** important, but deferrable if required to protect the MVP schedule.
- **May:** optional or future behavior.

### 0.1 Working assumptions

1. CampusCollab initially serves verified higher-education students.
2. A user selects a primary onboarding role, but roles are not permanently exclusive. A verified student may both seek opportunities and own gigs or collaboration projects.
3. An administrator is a privileged operational role granted by the platform, never self-selected during registration.
4. CampusCollab coordinates discovery, proposals, teams, and communication in the MVP. It does not process payments or guarantee off-platform work.
5. The platform will launch with an administrator-maintained list of supported universities and accepted email domains.
6. The Figma prototype is the visual and interaction reference. Placeholder statistics, testimonials, budgets, users, and dates shown in the prototype are not production facts.

### 0.2 Decisions requiring product-owner approval

| ID | Open decision | Recommended MVP position |
|---|---|---|
| OD-01 | May a non-student organization or external client register as a Project Owner? | No. Require a verified student identity during the initial closed beta. |
| OD-02 | Can one user have more than one verified university affiliation? | Support one active affiliation in MVP; allow future expansion. |
| OD-03 | What happens when a student loses access to their university email? | Preserve the account but require periodic reverification for trust-sensitive actions. |
| OD-04 | Are ratings required for MVP completion? | Defer public ratings; preserve completion records for a later review system. |
| OD-05 | Does “delete account” mean immediate hard deletion? | Use a recoverable deactivation period, followed by privacy-compliant deletion or anonymization. |
| OD-06 | Who may mark work complete? | Require owner completion followed by participant acknowledgement; allow admin resolution when disputed. |

## 1. Product Scope

### 1.1 Problem

Students often have useful technical, creative, academic, and organizational skills but lack trusted access to practical work, collaborators, and portfolio-building opportunities. Opportunities are fragmented across informal groups, social networks, messaging channels, and general-purpose freelance platforms. Project owners likewise struggle to verify student identity, discover suitable skills, evaluate experience, organize proposals, and form reliable teams.

CampusCollab addresses this fragmentation with a verified student community that combines freelance gigs, collaboration projects, skill-based discovery, structured applications, team formation, and contextual communication.

### 1.2 Target users

- Students seeking freelance work, project experience, collaborators, or portfolio evidence.
- Students, student organizations, researchers, and project leaders seeking contributors.
- Platform administrators responsible for trust, safety, reference data, and operations.

### 1.3 Value proposition

CampusCollab gives verified students one trusted place to turn skills into experience, income opportunities, teams, and portfolio outcomes. It gives project owners structured tools to find relevant students, evaluate proposals, form teams, and communicate without relying on fragmented channels.

### 1.4 MVP scope

The MVP must include:

- Registration, login, logout, password recovery, and university-email verification.
- Capability-aware authorization and account suspension.
- Student profiles containing academic identity, skills, experience, availability, portfolio information, and external links.
- Gig draft, publication, discovery, filtering, bookmarking, proposal, review, acceptance, closure, and archival workflows.
- Collaboration-project creation, discovery, join requests, invitations, team management, and lifecycle management.
- Contextual one-to-one or opportunity-linked messaging, message history, unread indicators, read state, and basic attachments.
- In-app notifications for material marketplace and collaboration events.
- Role-aware dashboards showing profile completion, work activity, deadlines, proposals, messages, and notifications.
- Administrator management of users, supported universities, skills, gigs, projects, reports, suspension, moderation, and audit history.
- Deterministic recommendations based on declared skills, project requirements, and availability.
- Responsive, accessible experiences for supported desktop and mobile web layouts.

### 1.5 Explicitly out of scope for the MVP

- Payment processing, escrow, invoicing, refunds, taxes, and financial disputes.
- AI-generated matching, ranking, proposals, or moderation decisions.
- Native iOS or Android applications.
- Built-in video or audio interviews.
- Gamification, points, leaderboards, and achievement systems.
- Public ratings and reviews unless later promoted into the MVP by an approved change.
- Multi-university affiliation per account.
- Enterprise client accounts or public registration for unverified external clients.
- Formal contract generation or legal enforcement of project obligations.
- Full project-management functions such as kanban boards, time tracking, or source-control hosting.

### 1.6 Future features

- Secure payments and escrow after legal, identity, dispute, and compliance design.
- Public ratings, reviews, and reputation signals.
- GitHub or portfolio-provider imports.
- AI-assisted opportunity recommendations and semantic skill matching.
- Video interviews and scheduled meetings.
- Native mobile applications.
- Multiple verified affiliations and alumni verification.
- Organization and university-department accounts.
- Advanced project workspaces, milestones, deliverables, and time tracking.
- Gamification and contribution recognition.
- Advanced fraud detection and automated moderation assistance.

## 2. User Roles and Permissions

### 2.1 Authorization model

CampusCollab must separate identity, primary onboarding role, capabilities, resource ownership, and administrative privilege.

- A verified user may acquire both Student/Freelancer and Project Owner capabilities.
- Resource-level permissions must depend on ownership or membership, not only the account’s role label.
- All sensitive authorization decisions must be enforced by the system, not merely hidden in the interface.
- Administrative capability must be explicitly granted and auditable.

### 2.2 Student/Freelancer

**Can see**

- Published, visible gigs and collaboration projects they are eligible to access.
- Public profiles subject to the profile owner’s privacy settings.
- Their own dashboard, applications, memberships, invitations, messages, notifications, saved opportunities, and account status.
- Relevant owner identity and opportunity details required for an informed application.

**Can create**

- Their own profile, portfolio entries, proposals, join requests, reports, messages, and bookmarks.
- Collaboration projects or gigs when the corresponding owner capability is enabled.

**Can edit**

- Their own profile and portfolio.
- A proposal while the proposal remains editable under the proposal rules.
- Their own messages only if message editing is explicitly added later; MVP messages are immutable after sending.
- Their notification preferences and privacy settings.

**Can delete or withdraw**

- Their own draft portfolio entries and bookmarks.
- Their own proposal through the supported withdrawal action while withdrawal is allowed.
- Their own pending join requests.
- Their account through the account-deletion process.
- They cannot directly delete audit-relevant submitted proposals, accepted memberships, or sent messages.

**Can apply for**

- Published gigs for which applications remain open.
- Recruiting collaboration projects with open positions for which they are eligible.

**Can approve or reject**

- Invitations addressed to them.
- Completion acknowledgement for work in which they participated.
- They cannot approve or reject other users’ proposals or join requests unless they own the relevant resource.

**Can manage**

- Their availability, skills, portfolio visibility, active applications, memberships, conversations, and notification preferences.

### 2.3 Project Owner

Project Owner is a capability available to an eligible verified user, not necessarily a separate permanent identity.

**Can see**

- Their own draft and published gigs/projects.
- Proposals, join requests, and invited candidates attached to resources they own.
- Public candidate profiles and relevant private application information provided for evaluation.
- Team membership, opportunity-linked conversations, deadlines, reports they submitted, and owner dashboard information.

**Can create**

- Gig drafts, published gigs, collaboration projects, invitations, opportunity-linked conversations when permitted, reports, and team roles/openings.

**Can edit**

- Their own gigs and projects subject to lifecycle restrictions.
- Team roles, open positions, deadlines, and descriptions where changes do not unfairly invalidate accepted commitments.
- Draft resources without restriction except validation requirements.

**Can delete or archive**

- Their own drafts.
- Published or historically significant resources must be closed, cancelled, or archived instead of silently hard-deleted.
- They may remove a project member only under membership and moderation rules; removal must preserve history.

**Can apply for**

- The owner may also apply to other gigs or projects when the Student/Freelancer capability is available.
- A user must not apply to their own gig or request to join their own project.

**Can approve or reject**

- Proposals submitted to their gigs.
- Join requests for their projects.
- Completion or cancellation actions for resources they own.
- They cannot approve, reject, or modify applications belonging to other owners.

**Can manage**

- Proposal review, project invitations, team membership, opportunity lifecycle, associated conversations, and opportunity-specific notifications.

### 2.4 Administrator

**Can see**

- Operational user data required for support, safety, and moderation.
- All reported gigs, projects, profiles, attachments, and messages necessary to investigate a report.
- Account status, verification status, moderation history, and administrative audit history.
- Administrators must not browse private content without a documented operational reason.

**Can create**

- Supported university records, accepted domains, canonical skills/categories, moderation notes, and administrative audit entries generated by administrative actions.

**Can edit**

- Supported university and skill reference information.
- Moderation status, account restrictions, and content visibility when authorized.
- Administrators must not impersonate users or rewrite user-authored proposals/messages as if authored by the user.

**Can delete or remove**

- Remove or hide content that violates policy.
- Deactivate or suspend accounts.
- Permanent deletion must follow retention, audit, privacy, and escalation policies.

**Can apply for**

- No administrative application capability exists. If an administrator also uses the platform as a student, their ordinary user actions must be logically separated from administrative actions.

**Can approve or reject**

- University/domain additions, reports, moderation appeals, and exceptional disputed state resolutions.
- Administrators do not ordinarily select winning proposals or team members on behalf of an owner.

**Can manage**

- Users, universities, skills, gigs, projects, reports, suspensions, moderation queues, and audit history within granted administrative permissions.

## 3. User Journeys

### 3.1 Registration

1. Visitor chooses **Create account**.
2. System presents primary-role choices and explains that capabilities may expand later.
3. Visitor selects Student/Freelancer or Project Owner as the initial experience.
4. Visitor supplies name, university email, password, and required policy consent.
5. System validates required fields, password strength, email normalization, university-domain eligibility, duplicate account status, and rate limits.
6. System creates an unverified, active-pending-verification account.
7. System sends a single-use verification message without revealing sensitive account state to unrelated users.
8. User is directed to a verification-pending screen with resend controls and support guidance.

Alternate/error outcomes include unsupported university, duplicate email, weak password, excessive attempts, unavailable email delivery, expired registration, and suspended existing account.

### 3.2 University email verification

1. User opens the latest unexpired verification link.
2. System validates token authenticity, intended account, expiry, and prior use.
3. System marks the university email verified and records the verification event.
4. Earlier verification tokens become unusable.
5. User proceeds to onboarding/profile creation.

Expired or invalid links must provide a safe resend path. Verification responses must not expose secret token details or unnecessary account information.

### 3.3 Login

1. User submits email and password.
2. System applies rate limits and validates credentials using a generic failure response.
3. System checks account state.
4. If verification is required, the user is directed to verification rather than the authenticated application.
5. If active and verified, the system establishes a secure session and records the security event.
6. User is directed to onboarding or the appropriate dashboard.

Suspended, locked, deactivated, or deleted accounts must not receive normal access.

### 3.4 Profile creation

1. Newly verified user sees a profile-completion checklist.
2. User enters university, department, graduation year, bio, skills, experience, availability, education, portfolio items, and optional external links.
3. System validates field length, allowed values, safe URLs, dates, attachments, and ownership.
4. User may save incomplete progress.
5. System calculates profile completion using transparent required sections.
6. Required minimum profile fields must be completed before applying, posting, or inviting where policy requires.

### 3.5 Profile editing

1. User opens their profile settings.
2. Current values and visibility settings are displayed.
3. User changes allowed fields and submits.
4. System validates and persists the changes.
5. Trust-sensitive changes, such as university email, trigger reverification rather than silently changing verified identity.
6. User receives success or actionable validation feedback.

### 3.6 Finding a gig

1. User opens gig discovery.
2. System displays published gigs open to the user.
3. User searches and filters by keyword, skill, category, experience, university visibility, deadline, or budget where available.
4. User sorts and paginates results.
5. Empty results provide filter-reset and discovery guidance.
6. User opens a gig detail page showing scope, owner, skills, timing, application status, and eligibility.

### 3.7 Applying for a gig

1. Eligible verified user selects **Submit proposal**.
2. System displays required proposal fields and relevant gig details.
3. User supplies cover message, proposed terms where applicable, availability, and allowed attachments.
4. System checks gig status, deadline, profile eligibility, ownership conflict, duplicate proposal, suspension, and input safety.
5. User reviews and confirms submission.
6. Proposal becomes submitted and the owner is notified.
7. Applicant can view the proposal status and may withdraw while allowed.

### 3.8 Owner reviewing proposals

1. Owner opens a gig they own.
2. System displays submitted, non-withdrawn proposals with candidate information relevant to selection.
3. Owner filters or sorts proposals without changing their underlying state.
4. Owner opens a proposal and may view the candidate profile and attachments.
5. Owner may shortlist, reject, or begin acceptance, subject to gig capacity and status.
6. Every decision produces the appropriate applicant notification and audit-relevant history.

### 3.9 Accepting a proposal

1. Owner selects an eligible submitted or shortlisted proposal.
2. System shows a confirmation summarizing consequences.
3. System rechecks ownership, gig state, proposal state, capacity, and race conditions.
4. Selected proposal becomes accepted.
5. Gig becomes assigned/active or closes to further applications according to its capacity.
6. Other proposals remain pending, are rejected, or are closed according to the gig’s declared selection policy.
7. A contextual conversation becomes available to the accepted parties.
8. All affected applicants receive clear status notifications.

### 3.10 Creating a collaboration project

1. Eligible verified user chooses **Create project**.
2. User supplies title, description, project type, required skills, roles, openings, expected duration, visibility, and relevant dates.
3. System validates content, dates, roles, capacity, and owner eligibility.
4. User may save a draft.
5. User reviews and publishes the project.
6. Published project becomes recruiting and discoverable under its visibility rules.

### 3.11 Requesting to join

1. Eligible user opens a recruiting project.
2. User selects an open role and submits a request with a message and relevant experience.
3. System checks project status, open capacity, existing membership, duplicate request, invitation conflicts, and owner conflict.
4. Request becomes pending and the owner is notified.
5. Applicant may withdraw while pending.

### 3.12 Inviting a student

1. Project owner discovers or selects an eligible student.
2. Owner selects their project and an open role.
3. System checks project ownership, recruiting status, capacity, existing membership, duplicate invitation, blocks, and eligibility.
4. Owner adds an optional contextual message and sends the invitation.
5. Invitation becomes pending and the student is notified.
6. Student may accept, reject, or allow it to expire.

### 3.13 Accepting or rejecting requests

1. Owner opens the project’s pending requests.
2. Owner reviews the applicant, requested role, and message.
3. Owner chooses accept or reject.
4. System rechecks capacity and states immediately before applying the decision.
5. On acceptance, a membership is created and the open-position count is updated.
6. On rejection, no membership is created.
7. Applicant is notified of the result.

### 3.14 Messaging

1. User opens an authorized conversation linked to an accepted gig/project relationship or another permitted context.
2. System loads paginated message history.
3. User sends text or an allowed attachment.
4. System validates conversation membership, account status, content, attachment safety, and rate limits.
5. Message is durably recorded before or as it is delivered.
6. Other authorized members receive the message in real time when connected and a notification when appropriate.
7. Read state is updated when the recipient views the conversation.
8. Reconnect behavior retrieves messages missed while offline without creating duplicates.

### 3.15 Notifications

1. A material event occurs.
2. System determines intended recipients and avoids notifying the actor unnecessarily.
3. In-app notification is created with a safe link to the relevant resource.
4. Unread count updates.
5. User opens or marks the notification read.
6. If the target resource is no longer accessible, the system shows a safe explanation rather than leaking it.

### 3.16 Completing a project or gig engagement

1. Owner indicates that the engagement is complete.
2. System confirms there is an active accepted proposal or active project membership/work context.
3. Participants receive a completion request.
4. Participant acknowledges completion or raises a dispute/report.
5. On acknowledgement, the engagement becomes completed and is preserved in participant history/portfolio eligibility.
6. On dispute, normal completion is paused and the issue enters moderation.

### 3.17 Reporting a user or content

1. Authenticated user selects **Report** on an eligible user or content item.
2. System presents supported reasons, optional details, and safety guidance.
3. User submits one report without being shown moderator-only information.
4. System prevents abusive duplicates while allowing materially new evidence.
5. Report enters the moderation queue.
6. Reporter receives acknowledgement and later a limited outcome notice where appropriate.
7. The reported user must not learn the reporter’s identity unless legally required.

### 3.18 Admin moderation

1. Authorized administrator opens the moderation queue.
2. Administrator claims or opens a report and sees only information necessary for investigation.
3. Administrator reviews reported content, relevant context, history, and policy.
4. Administrator selects an outcome: no violation, warning, content restriction/removal, temporary suspension, permanent deactivation recommendation, or escalation.
5. High-impact actions require confirmation and, where policy requires, elevated approval.
6. System records actor, reason, evidence reference, action, and timestamp.
7. Affected users receive an appropriate notice and appeal path.

## 4. User Stories and Acceptance Criteria

### US-01 — Register with a university email

**Story:** As a prospective student user, I want to register with my university email, so that I can join a trusted student community.

**Acceptance criteria**

- Given a supported university email and valid password, when registration succeeds, then an unverified account is created and a verification message is sent.
- Given an unsupported domain, registration is not completed and the user receives an actionable explanation without exposing internal allowlist details.
- Given an existing email, the response does not expose more account information than necessary.
- Repeated attempts are rate-limited.
- The user cannot access verified-only features before verification.

### US-02 — Verify university identity

**Story:** As a registered user, I want to verify my university email, so that I can access trusted platform features.

**Acceptance criteria**

- A valid, latest, unused token verifies the intended account once.
- Expired, invalid, and previously used tokens cannot verify an account.
- Resending invalidates or supersedes previous active tokens according to policy.
- Verification is recorded as a security-relevant event.

### US-03 — Sign in securely

**Story:** As a registered user, I want to sign in securely, so that I can access my account and activity.

**Acceptance criteria**

- Valid credentials for an active, verified account establish a secure session.
- Invalid credentials receive a generic failure response.
- Suspended or deactivated accounts do not receive normal access.
- Repeated failed attempts trigger throttling or protective controls.
- Logout invalidates the active session as defined by session policy.

### US-04 — Build a professional profile

**Story:** As a student, I want to present my skills, education, availability, and portfolio, so that owners can evaluate my suitability.

**Acceptance criteria**

- The user can save valid profile information and incomplete drafts.
- Profile completion reflects defined required sections.
- Invalid dates, unsafe links, excessive text, or unsupported attachments are rejected with field-specific feedback.
- Private fields are not exposed on the public profile.
- Only the profile owner or an authorized administrator can modify the profile.

### US-05 — Discover suitable gigs

**Story:** As a freelancer, I want to search and filter open gigs, so that I can find relevant opportunities efficiently.

**Acceptance criteria**

- Only published and visible gigs are shown in public discovery.
- Search and filters can be combined and reset.
- Results use deterministic ordering and pagination.
- Closed, archived, or inaccessible gigs are excluded unless shown in the user’s own history.
- Empty, loading, and failure states are understandable and accessible.

### US-06 — Submit a proposal

**Story:** As a freelancer, I want to submit a structured proposal, so that an owner can evaluate my offer.

**Acceptance criteria**

- Only a verified, active, eligible user may submit.
- A user cannot apply to their own gig.
- A user cannot maintain multiple active proposals for the same gig.
- The gig must still accept proposals at the moment of submission.
- Successful submission records the proposal as submitted and notifies the owner once.
- Retrying the same submission must not create unintended duplicates.

### US-07 — Review and decide proposals

**Story:** As a gig owner, I want to review, shortlist, accept, or reject proposals, so that I can select a suitable contributor.

**Acceptance criteria**

- Only the gig owner or an authorized administrator acting under policy may access private proposal details.
- Only valid state transitions are available.
- Accepting a proposal rechecks gig capacity and proposal state.
- Concurrent acceptance attempts cannot overfill the gig.
- Every affected applicant receives the correct status and notification.

### US-08 — Withdraw a proposal

**Story:** As an applicant, I want to withdraw a pending proposal, so that I am not considered when I am no longer available.

**Acceptance criteria**

- Only the proposal owner may withdraw it.
- Submitted or shortlisted proposals may be withdrawn before acceptance.
- Accepted, rejected, or already withdrawn proposals cannot be withdrawn again.
- Withdrawal preserves proposal history and notifies the gig owner.

### US-09 — Create a collaboration project

**Story:** As a project owner, I want to publish a structured collaboration project, so that I can recruit students with the right skills and roles.

**Acceptance criteria**

- An eligible user can save a draft and later publish it.
- Publication requires title, description, project type, required roles/skills, valid capacity, and duration or timing information.
- Only the owner can edit, publish, cancel, or archive the project under normal operation.
- A published recruiting project is discoverable according to visibility rules.

### US-10 — Request to join a project

**Story:** As a student, I want to request an open project role, so that I can contribute to a relevant collaboration.

**Acceptance criteria**

- The project must be recruiting and the role must have capacity.
- Owners cannot request to join their own project.
- Existing members cannot submit join requests.
- A user cannot hold duplicate pending requests for the same project and role.
- Successful submission notifies the owner.

### US-11 — Invite a collaborator

**Story:** As a project owner, I want to invite a qualified student to an open role, so that I can assemble a strong team.

**Acceptance criteria**

- The owner may invite only to a project they own and a role with available capacity.
- Existing members, blocked users, and users with an equivalent pending invitation cannot be invited.
- The invited user can accept, reject, or let the invitation expire.
- Acceptance rechecks role capacity and eligibility.

### US-12 — Manage join requests

**Story:** As a project owner, I want to accept or reject join requests, so that I can control team membership.

**Acceptance criteria**

- Only the project owner can decide ordinary join requests.
- Accepting creates at most one active membership.
- Capacity cannot be exceeded under concurrent decisions.
- Rejected requests do not create memberships.
- The applicant is notified exactly once per final decision.

### US-13 — Communicate in context

**Story:** As an accepted participant, I want to message the relevant owner or team, so that project communication stays organized.

**Acceptance criteria**

- Only current authorized conversation members can read or send messages.
- Messages are retained in chronological history and missed messages are available after reconnect.
- Duplicate client retries do not create unintended duplicate messages.
- Unsupported, oversized, or unsafe attachments are rejected.
- Suspended users cannot send new messages.

### US-14 — Receive actionable notifications

**Story:** As a user, I want notifications about important activity, so that I can respond on time.

**Acceptance criteria**

- Supported events create notifications for the intended recipients.
- A user can view unread and read notifications and mark them read.
- Notifications do not reveal inaccessible resource details.
- Duplicate event processing does not create excessive duplicate notifications.

### US-15 — Complete an engagement

**Story:** As an owner and participant, I want to record completed work, so that the platform reflects the engagement outcome.

**Acceptance criteria**

- Only an active engagement can enter completion.
- The owner can request completion and the participant can acknowledge or dispute it.
- A completed engagement becomes read-only except for permitted moderation or later review actions.
- Completion history remains visible to authorized participants.

### US-16 — Report harmful behavior or content

**Story:** As a user, I want to report suspicious or harmful activity, so that the community can remain safe.

**Acceptance criteria**

- A signed-in user can report eligible users or content using a supported reason.
- The report captures sufficient context without exposing moderator-only data.
- The reported party cannot see the reporter’s identity through normal product behavior.
- Duplicate abuse is limited while legitimate additional evidence remains possible.

### US-17 — Moderate reports

**Story:** As an administrator, I want to investigate reports and apply proportionate actions, so that policy is consistently enforced.

**Acceptance criteria**

- Only appropriately privileged administrators can access the moderation queue.
- Every decision requires a reason and produces an audit record.
- High-impact actions require explicit confirmation.
- Affected users receive an appropriate outcome notice and appeal information.
- Administrators cannot silently alter user-authored history.

### US-18 — Manage platform reference data

**Story:** As an administrator, I want to manage supported universities and canonical skills, so that verification and discovery remain accurate.

**Acceptance criteria**

- Changes are restricted to authorized administrators.
- Conflicting or duplicate active university domains are rejected.
- Removing reference data already in use does not corrupt historical content.
- Changes are auditable.

### US-19 — Suspend an account

**Story:** As an administrator, I want to suspend an account with a documented reason, so that immediate risk can be contained.

**Acceptance criteria**

- Suspension requires an authorized administrator, reason, and duration or permanence decision.
- Suspended users cannot authenticate normally or perform mutating platform actions.
- Existing public content is handled according to moderation policy rather than automatically and unpredictably deleted.
- Suspension and restoration are auditable and communicated to the affected user where safe.

## 5. Business Rules

### BR-01 — University verification

1. Verified-only actions require a currently verified university affiliation.
2. Email matching must use normalized domains and an administrator-maintained allowlist.
3. A domain may belong to only one active university record unless an explicitly documented shared-domain exception exists.
4. Verification tokens must be single-use, time-limited, bound to one account and purpose, and safely replaceable.
5. Changing the verified email or university invalidates the prior verification until the new address is verified.
6. Resend and verification attempts must be rate-limited.
7. Administrators may revoke verification with an auditable reason.

### BR-02 — Gig ownership

1. Every gig has exactly one accountable owner in the MVP.
2. Only that owner may edit or manage the gig under normal operation.
3. Ownership cannot be silently transferred.
4. The owner cannot apply to their own gig.
5. A published gig with applications must be closed or archived rather than hard-deleted.
6. Material changes after proposals exist must be disclosed to affected applicants; changes that invalidate terms may require closing and republishing.

### BR-03 — Proposal submission

1. Applicant must be active, verified, eligible, and sufficiently onboarded.
2. Gig must be published and accepting proposals before its deadline.
3. One user may have at most one active proposal per gig.
4. Submission must be idempotent from the user’s perspective.
5. Proposal attachments must satisfy file policy.
6. Submitted proposal content must be preserved for evaluation history; editing may create a visible revision or be limited before review.

### BR-04 — Proposal acceptance

1. Only the gig owner may accept a proposal.
2. Proposal must be submitted or shortlisted and not withdrawn/rejected.
3. Gig must have available capacity and be in a state that permits acceptance.
4. Acceptance must be atomic from the product perspective and safe under concurrency.
5. Acceptance creates access to the relevant work conversation.
6. Other proposals must receive a deterministic outcome based on whether the gig supports one or multiple hires.

### BR-05 — Multiple proposals

1. A gig may receive proposals from multiple users.
2. A user may not create multiple simultaneously active proposals for the same gig.
3. A gig must declare maximum accepted participants; default is one for MVP unless explicitly configured.
4. Shortlisting does not reserve capacity.
5. When capacity is filled, remaining active proposals must be closed or rejected with notification.

### BR-06 — Project membership

1. A project has one owner and zero or more member records.
2. A user may have at most one active membership in a project.
3. Membership must reference a defined project role.
4. Active membership consumes role/project capacity.
5. Owners are project participants but are not counted as recruited members unless product copy states otherwise.
6. Removal, departure, and completion preserve membership history.

### BR-07 — Join requests

1. Only active, verified, non-owner, non-member users may request to join.
2. Project must be recruiting and the selected role must be open.
3. Only one pending request per user, project, and role may exist.
4. Applicant may withdraw a pending request.
5. Owner acceptance rechecks capacity and eligibility.
6. Closing or cancelling the project expires all pending requests.

### BR-08 — Invitations

1. Only the project owner may issue invitations for that project.
2. Invitations must identify an open role and expiry.
3. Existing members and blocked or ineligible users cannot receive actionable invitations.
4. Acceptance rechecks project state and capacity.
5. Closing, cancelling, filling the role, or suspending either party may expire the invitation.

### BR-09 — Messaging permissions

1. Users may message only within conversations they are authorized to access.
2. Opportunity-linked conversation access begins only after an accepted relationship or another explicitly permitted event.
3. Former members retain access to historical messages only according to retention and safety policy and cannot necessarily send new messages.
4. Blocking, suspension, or moderation restrictions may prevent new messages without deleting evidence.
5. Administrators may access messages only for an authorized support, safety, or legal purpose, with auditability.

### BR-10 — Account suspension

1. Suspension may be temporary or indefinite and requires a reason.
2. Suspended accounts cannot start authenticated sessions or perform new mutating actions.
3. Existing sessions must be invalidated promptly.
4. Suspension must not erase history needed for other users, moderation, or legal obligations.
5. Reinstatement requires authorization and audit history.

### BR-11 — Content reporting

1. Reports must identify a target, reason, reporter, timestamp, and relevant context.
2. Reporter identity is confidential from the reported user in ordinary operation.
3. Duplicate reporting must be controlled without preventing new evidence.
4. A report does not automatically prove a violation.
5. Moderation outcomes and reasons must be auditable.
6. Urgent safety categories must support escalation.

### BR-12 — Project status transitions

1. Draft projects are visible only to the owner and authorized administrators.
2. Publishing moves a valid project into recruiting.
3. Recruiting may move to active when the owner starts work; required staffing rules must be defined before implementation.
4. Active projects may move to completion-pending, completed, or cancelled.
5. Completed and cancelled projects are terminal for normal users.
6. Invalid backward transitions require an explicit administrative recovery process rather than ordinary editing.

## 6. State Machines

Any transition not listed below is invalid under normal operation. Administrative correction must be explicit, authorized, reasoned, and audited.

### 6.1 Gig

**States:** `draft`, `published`, `assigned`, `active`, `completion_pending`, `completed`, `closed`, `cancelled`, `archived`

| From | To | Trigger/condition |
|---|---|---|
| draft | published | Owner publishes a valid gig. |
| draft | archived | Owner abandons the draft. |
| published | assigned | Acceptance fills required capacity. |
| published | closed | Owner closes without selecting, deadline policy closes it, or capacity rules require closure. |
| published | cancelled | Owner cancels with reason. |
| assigned | active | Owner starts the engagement. |
| assigned | cancelled | Engagement is cancelled under allowed policy. |
| active | completion_pending | Owner requests completion. |
| active | cancelled | Authorized cancellation or moderation outcome. |
| completion_pending | completed | Required participant acknowledgement is received. |
| completion_pending | active | Completion is disputed or withdrawn for continued work. |
| completion_pending | cancelled | Administrative resolution or valid cancellation. |
| completed | archived | Retention/display lifecycle action. |
| closed | archived | Retention/display lifecycle action. |
| cancelled | archived | Retention/display lifecycle action. |

### 6.2 Proposal

**States:** `submitted`, `shortlisted`, `accepted`, `rejected`, `withdrawn`, `closed`

| From | To | Trigger/condition |
|---|---|---|
| submitted | shortlisted | Owner shortlists the proposal. |
| submitted | accepted | Owner accepts and capacity remains. |
| submitted | rejected | Owner rejects. |
| submitted | withdrawn | Applicant withdraws. |
| submitted | closed | Gig closes/cancels or capacity fills under policy. |
| shortlisted | accepted | Owner accepts and capacity remains. |
| shortlisted | rejected | Owner rejects. |
| shortlisted | withdrawn | Applicant withdraws. |
| shortlisted | closed | Gig closes/cancels or capacity fills. |

`accepted`, `rejected`, `withdrawn`, and `closed` are terminal for normal users.

### 6.3 Collaboration project

**States:** `draft`, `recruiting`, `active`, `completion_pending`, `completed`, `cancelled`, `archived`

| From | To | Trigger/condition |
|---|---|---|
| draft | recruiting | Owner publishes a valid project. |
| draft | archived | Owner abandons draft. |
| recruiting | active | Owner begins project and minimum start conditions are met. |
| recruiting | cancelled | Owner cancels with reason. |
| active | recruiting | Owner reopens recruitment without reversing project work. |
| active | completion_pending | Owner requests completion. |
| active | cancelled | Authorized cancellation. |
| completion_pending | completed | Required acknowledgements are satisfied. |
| completion_pending | active | Completion is disputed or work continues. |
| completion_pending | cancelled | Administrative resolution or allowed cancellation. |
| completed | archived | Retention/display lifecycle action. |
| cancelled | archived | Retention/display lifecycle action. |

### 6.4 Join request

**States:** `pending`, `accepted`, `rejected`, `withdrawn`, `expired`

| From | To | Trigger/condition |
|---|---|---|
| pending | accepted | Owner accepts; project/role has capacity. |
| pending | rejected | Owner rejects. |
| pending | withdrawn | Applicant withdraws. |
| pending | expired | Project closes/cancels, role fills, deadline passes, or eligibility is lost. |

All non-pending states are terminal for that request.

### 6.5 Project membership

**States:** `invited`, `active`, `left`, `removed`, `completed`

| From | To | Trigger/condition |
|---|---|---|
| invited | active | User accepts a valid invitation and capacity remains. |
| invited | removed | Invitation is rejected, revoked, or expires. |
| active | left | Member voluntarily leaves under allowed policy. |
| active | removed | Owner/admin removes member with reason. |
| active | completed | Project and member participation complete. |

`left`, `removed`, and `completed` preserve history and are terminal for that membership.

### 6.6 User account

**States:** `pending_verification`, `active`, `temporarily_suspended`, `indefinitely_suspended`, `deactivated`, `deletion_pending`, `deleted`

| From | To | Trigger/condition |
|---|---|---|
| pending_verification | active | University email verification succeeds. |
| pending_verification | deletion_pending | User requests deletion or registration expires under policy. |
| active | temporarily_suspended | Authorized moderation action with end/review condition. |
| active | indefinitely_suspended | Authorized high-impact moderation action. |
| active | deactivated | User voluntarily deactivates. |
| active | deletion_pending | User requests account deletion. |
| temporarily_suspended | active | Suspension expires or appeal succeeds. |
| temporarily_suspended | indefinitely_suspended | Escalated moderation outcome. |
| indefinitely_suspended | active | Authorized appeal/reinstatement. |
| deactivated | active | User reactivates within policy. |
| deactivated | deletion_pending | User requests deletion. |
| deletion_pending | active | User cancels deletion within recovery window, if eligible. |
| deletion_pending | deleted | Retention window ends and required deletion/anonymization completes. |

`deleted` is terminal. Historical records may be anonymized or retained only when required by legitimate platform, safety, or legal obligations.

## 7. Non-functional Requirements

### 7.1 Security

- NFR-SEC-01: All network traffic in non-local environments must use encrypted transport.
- NFR-SEC-02: Passwords must never be stored or logged in plaintext and must be protected using a current password-hashing method with appropriate cost.
- NFR-SEC-03: Authentication/session secrets, verification tokens, and reset tokens must be unpredictable, scoped, expiring, and protected from disclosure.
- NFR-SEC-04: Every protected action must enforce server-side authentication, capability checks, and object-level authorization.
- NFR-SEC-05: Inputs must be validated and normalized at trust boundaries; untrusted output must be safely rendered to prevent injection and XSS.
- NFR-SEC-06: Authentication, verification, reset, messaging, uploads, search, reports, and high-volume actions must be rate-limited according to abuse risk.
- NFR-SEC-07: File uploads must enforce allowlisted types, size limits, safe filenames, isolated storage, access authorization, and malware scanning where operationally available.
- NFR-SEC-08: Sensitive values and credentials must not appear in client-visible errors, logs, source control, analytics, or URLs.
- NFR-SEC-09: Session invalidation must occur after logout, password reset, suspension, and relevant security changes.
- NFR-SEC-10: Security-relevant events must be auditable without logging passwords, raw tokens, or private message bodies by default.
- NFR-SEC-11: The MVP must complete a documented security review covering authentication, authorization, CSRF as applicable, XSS, NoSQL injection, enumeration, privilege escalation, account takeover, and upload abuse.

### 7.2 Performance

- NFR-PERF-01: Under the agreed MVP reference load, 95% of ordinary interactive read operations should complete within 500 ms of server processing, excluding client network latency and large file transfer.
- NFR-PERF-02: 95% of ordinary write operations should complete within 800 ms of server processing under reference load.
- NFR-PERF-03: A real-time message should normally become visible to an online recipient within 1 second after server acceptance.
- NFR-PERF-04: Primary web pages should meet agreed “good” user-experience targets for loading and interaction on supported mid-range mobile devices and typical campus networks.
- NFR-PERF-05: Search and list screens must paginate and must not require downloading unbounded result sets.
- NFR-PERF-06: Performance targets must be measured in staging with documented datasets and concurrency, not assumed from local development.

### 7.3 Availability and resilience

- NFR-AVL-01: Initial production target is 99.5% monthly availability, excluding announced maintenance, until operational data supports a higher commitment.
- NFR-AVL-02: Failure of email or notification delivery must not corrupt the underlying user action.
- NFR-AVL-03: Real-time disconnection must degrade to stored message history and recover without data loss or duplicate display.
- NFR-AVL-04: User-visible failures must provide safe retry guidance and correlation information suitable for support.
- NFR-AVL-05: Critical writes must be protected against accidental duplicate submission.

### 7.4 Accessibility

- NFR-A11Y-01: Target WCAG 2.2 Level AA for MVP user journeys.
- NFR-A11Y-02: All interactive functions must be keyboard operable with visible focus.
- NFR-A11Y-03: Controls must have programmatically determinable names, roles, states, instructions, and errors.
- NFR-A11Y-04: Color must not be the only means of communicating state.
- NFR-A11Y-05: Text and meaningful UI elements must meet required contrast.
- NFR-A11Y-06: Loading, empty, validation, success, and failure states must be conveyed accessibly.
- NFR-A11Y-07: Responsive reflow must support small screens and zoom without loss of critical functionality.

### 7.5 Scalability

- NFR-SCL-01: Application services must be capable of horizontal replication without relying on process-local persistent user state.
- NFR-SCL-02: Search, lists, messages, notifications, and audit views must use bounded pagination.
- NFR-SCL-03: High-growth data such as messages, notifications, and audit history must have retention and archival strategies before public scale.
- NFR-SCL-04: Capacity tests must define expected beta users, concurrent sessions, messages per second, and storage growth before production approval.
- NFR-SCL-05: The modular monolith must preserve domain boundaries so high-load modules can be optimized later without prematurely creating microservices.

### 7.6 Logging and auditability

- NFR-LOG-01: Server logs must be structured and include timestamp, severity, environment, service/module, request correlation ID, and safe error classification.
- NFR-LOG-02: Logs must exclude passwords, raw tokens, session secrets, unnecessary personal data, and message bodies by default.
- NFR-LOG-03: Administrative, verification, authentication-security, suspension, and high-impact lifecycle events must produce audit records.
- NFR-LOG-04: Audit history must be tamper-resistant for ordinary administrators and record actor, action, target, reason, time, and outcome.
- NFR-LOG-05: Log access must be restricted and retention periods documented.

### 7.7 Monitoring and alerting

- NFR-MON-01: Monitor availability, error rate, latency, resource utilization, database health, email failures, storage failures, and real-time connection health.
- NFR-MON-02: Track security signals such as authentication spikes, verification abuse, repeated authorization failures, report spikes, and upload rejection spikes.
- NFR-MON-03: Alerts must have severity, ownership, response guidance, and noise controls.
- NFR-MON-04: Frontend and backend failures must be traceable using safe correlation identifiers.
- NFR-MON-05: Health checks must distinguish process availability from dependency readiness.

### 7.8 Backup and recovery

- NFR-BCK-01: Production data and critical configuration must be backed up automatically.
- NFR-BCK-02: The initial target recovery point objective is 24 hours; the initial target recovery time objective is 8 hours, subject to product-owner approval before production.
- NFR-BCK-03: Backups must be encrypted, access-controlled, retained according to policy, and separated from the primary failure domain.
- NFR-BCK-04: Restoration must be tested before launch and at a scheduled interval afterward.
- NFR-BCK-05: File storage and database recovery procedures must be consistent so restored records do not reference irrecoverably missing files without detection.

### 7.9 Privacy

- NFR-PRV-01: Collect only data necessary for product, security, support, or legal purposes.
- NFR-PRV-02: Public profiles must clearly distinguish public and private fields.
- NFR-PRV-03: University emails, security events, private proposals, and messages are not public profile data.
- NFR-PRV-04: Users must be able to review and correct their profile information.
- NFR-PRV-05: Account deletion, deactivation, retention, anonymization, and legal-hold behavior must be documented before production.
- NFR-PRV-06: Administrative access to private data must follow least privilege and be auditable.
- NFR-PRV-07: Analytics must avoid unnecessary personal content and must honor documented consent/legal requirements.
- NFR-PRV-08: Privacy notices and terms must accurately describe actual data use; placeholder legal text is not acceptable for production.

## 8. MVP Acceptance Criteria

The MVP is complete only when all mandatory criteria below are satisfied.

### 8.1 Functional completion

- A user can register, verify a supported university email, log in, log out, recover access, and maintain a secure session.
- An active verified user can create and edit a sufficiently complete profile.
- An eligible owner can create, publish, edit under policy, close/cancel, and archive a gig.
- A student can discover an open gig and submit one valid proposal.
- The owner can review and accept or reject proposals without exceeding capacity or violating authorization.
- Accepted participants can access a contextual conversation and exchange persistent real-time messages.
- An eligible owner can create and publish a collaboration project with roles and capacity.
- A student can request to join; an owner can accept/reject; an owner can invite; and a student can accept/reject an invitation.
- Team membership and project/gig states follow the documented state machines.
- Users receive correct in-app notifications for mandatory events.
- Users can report eligible users/content and administrators can resolve reports with an audit trail.
- Administrators can manage supported universities, skills, users, content, suspensions, and reports within permission boundaries.
- The dashboard accurately summarizes the signed-in user’s activity without exposing another user’s private data.

### 8.2 Quality completion

- All P0 and P1 defects are resolved; no known defect permits unauthorized access, data corruption, or loss of critical workflow history.
- Critical journeys have automated end-to-end coverage and repeatable manual acceptance tests.
- Authorization tests cover owner/non-owner, member/non-member, suspended, unverified, and administrator boundaries.
- Validation, empty, loading, failure, retry, and network-disconnection states are implemented for critical journeys.
- Supported responsive layouts are visually reviewed against the Figma reference.
- Critical journeys pass the agreed WCAG 2.2 AA accessibility review.
- Security review findings rated critical or high are resolved or explicitly accepted by authorized stakeholders with mitigation.
- Performance targets are demonstrated in staging using documented reference load and dataset.

### 8.3 Operational completion

- Development, testing, staging, and production configuration are separated.
- Production secrets are not stored in source control.
- Monitoring, alerting, structured logging, and error correlation are operational.
- Backup restoration has been successfully demonstrated.
- Deployment and rollback procedures are documented and tested.
- Support, moderation, incident-response, privacy, content, and account-deletion procedures have named owners.
- Placeholder statistics, testimonials, deadlines, and identities from the design are removed or clearly labeled as demo data.
- Product owner and QA formally approve the MVP acceptance report.

## 9. Risks

### 9.1 Technical risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Complex lifecycle rules create invalid or inconsistent states. | Medium | High | Use explicit state machines, transition tests, idempotency, and concurrency tests. |
| Real-time messages are duplicated, reordered, or lost during reconnect. | Medium | High | Persist before delivery, use stable message identity, reconcile history, and test reconnect behavior. |
| Search quality is poor with inconsistent skill names. | High | Medium | Maintain canonical skills, aliases, normalized filters, and measurable search scenarios. |
| File storage and database records diverge. | Medium | Medium | Define upload finalization, cleanup, access, backup, and reconciliation procedures. |
| Premature architecture expansion delays MVP. | Medium | High | Keep a modular monolith and require evidence before adding infrastructure. |
| Prototype does not define all error/empty/mobile states. | High | Medium | Specify and review those states before implementation of each feature. |

### 9.2 Security risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Broken object-level authorization exposes proposals, messages, or projects. | Medium | Critical | Deny by default, centralize policy, test cross-user access for every protected resource. |
| Fake or compromised university accounts undermine trust. | Medium | High | Domain allowlist, verification controls, reverification policy, alerts, and moderation. |
| Account takeover through password/reset/session weakness. | Medium | Critical | Strong password storage, scoped expiring tokens, rate limits, session invalidation, and security monitoring. |
| NoSQL injection or XSS through user-generated content. | Medium | High | Strict validation, safe query construction, output encoding, and security testing. |
| Malicious attachments distribute malware or expose private files. | Medium | High | Type/size limits, isolated storage, authorization, safe delivery, and scanning. |
| Spam, scams, harassment, or academic misconduct harms users. | High | High | Reporting, blocking/restriction rules, moderation operations, clear policy, and abuse monitoring. |
| Administrator privilege misuse exposes private data. | Low/Medium | Critical | Least privilege, separation of duties, audit trails, access review, and high-impact confirmation. |

### 9.3 Product risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Too few gigs or projects create an empty marketplace. | High | High | Start with selected universities/communities and seed genuine partnerships before broad launch. |
| Role language confuses users who both seek and create work. | High | Medium | Use a primary onboarding role plus flexible capabilities and clear mode/navigation design. |
| Unverified owners post misleading opportunities. | Medium | High | Require owner identity, reporting, moderation, and transparent owner context. |
| Users expect payment protection the MVP does not provide. | High | High | Clearly communicate marketplace boundaries and avoid payment/escrow language. |
| Public metrics or testimonials appear deceptive. | Medium | High | Remove design placeholders until supported by real, consented data. |
| Skill matching favors keyword stuffing. | Medium | Medium | Use canonical skills, experience evidence, transparent deterministic ranking, and user controls. |

### 9.4 Operational risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Moderation queue outgrows available staff. | Medium | High | Define priority categories, service targets, escalation, tooling, and limited beta scale. |
| University domain changes block legitimate users. | Medium | Medium | Administrative domain workflow, support escalation, and periodic domain review. |
| Email delivery failures block onboarding. | Medium | High | Monitor delivery, support resend, handle bounces, and provide support recovery. |
| Missing restoration practice causes prolonged data loss. | Medium | Critical | Automated backups, documented recovery, and scheduled restore drills. |
| Alert fatigue hides real incidents. | Medium | High | Severity levels, actionable thresholds, ownership, and routine alert review. |
| Privacy or retention obligations are unclear across launch regions. | Medium | High | Confirm launch jurisdiction, obtain appropriate policy/legal review, and document retention before production. |

## 10. Requirements Traceability Summary

| Product capability | Primary journeys | Primary stories | Primary rules/state |
|---|---|---|---|
| Identity and verification | 3.1–3.3 | US-01–US-03 | BR-01, User account state |
| Profile and portfolio | 3.4–3.5 | US-04 | Authorization model |
| Gigs and proposals | 3.6–3.9 | US-05–US-08 | BR-02–BR-05, Gig/Proposal states |
| Collaboration projects | 3.10–3.13 | US-09–US-12 | BR-06–BR-08, Project/Request/Membership states |
| Messaging and notifications | 3.14–3.15 | US-13–US-14 | BR-09 |
| Completion | 3.16 | US-15 | Gig/Project state machines |
| Trust and administration | 3.17–3.18 | US-16–US-19 | BR-10–BR-11, User account state |

## 11. Phase Exit Conditions

Phase 1 may be approved when:

1. Product stakeholders accept the MVP boundaries and resolve or explicitly defer the open decisions.
2. Product, engineering, QA, security, and operations agree that the user journeys are complete enough for the next design phase.
3. Role and object-level permissions have no known contradictions.
4. Business rules and state transitions cover normal, failure, duplicate, concurrent, and moderation outcomes at the requirements level.
5. Non-functional targets are accepted or revised with documented rationale.
6. No database schema, API contract, or application implementation has been introduced prematurely.

The recommended next phase after approval is **Phase 2: Domain Modeling and Authorization Design**, followed by API-contract design. It must not begin automatically.
