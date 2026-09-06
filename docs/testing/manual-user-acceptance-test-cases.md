# CampusCollab Manual User Acceptance Test Cases

## Purpose

This guide helps a non-technical person test CampusCollab by using the website normally. No coding tools, database access, or developer knowledge are required.

Manual testing can show that the tested features work in the tested situations. It cannot prove that software is completely free of defects.

## Website Under Test

- Live website: https://campuscollab-five.vercel.app/
- Recommended browsers: current Google Chrome and Microsoft Edge
- Also test one mobile phone, or use a browser window approximately as wide as a phone.

## Features Not Included in This Test Round

Do not report the following as failures unless the development team says they have been enabled:

- University verification email delivery is currently disabled. A valid `@bscse.uiu.ac.bd` account can sign in immediately after registration.
- Forgot-password and password-reset email delivery are not currently enabled.
- Profile photo upload is not currently available. User initials are shown as the profile image.
- Real-time messaging, notification center, and administrator screens are later-phase features.

## What the Tester Needs

Prepare two different UIU student accounts that you are authorized to use:

| Test identity | Purpose | Email |
|---|---|---|
| User A | Gig/project owner | A unique address ending in `@bscse.uiu.ac.bd` |
| User B | Applicant/collaborator | A different unique address ending in `@bscse.uiu.ac.bd` |

Also prepare:

- A third unused UIU email if you want to repeat registration.
- One non-UIU email, such as a personal test email, for a rejected-registration test. Do not use another person's email.
- A desktop/laptop and, if possible, a mobile phone.
- A place to save screenshots of failures.

Never enter a real banking password or another important password into the test website. Create a unique test password.

## Test Data to Use

Add the current date or your initials to names so they are easy to find:

- Gig title: `Test Logo Design - 02 Sep`
- Custom gig skill: `Test Brand Research`
- Project title: `Test Campus Event App - 02 Sep`
- Project opening: `Frontend Collaborator`
- Portfolio title: `Test Student Portfolio`
- Proposal message: `This is a CampusCollab acceptance-test proposal.`

## How to Record a Result

For every case, write one of these in the Result column:

- **PASS** — the actual result matches the expected result.
- **FAIL** — the result is wrong, incomplete, or confusing.
- **BLOCKED** — the test cannot continue because another problem prevents it.
- **N/A** — the action is intentionally unavailable for the selected data or state.

For every failure, record:

1. Test case ID.
2. What you did.
3. What you expected.
4. What actually happened.
5. Screenshot or short screen recording.
6. Browser/device and time.

## Quick Release Check

Run these cases first. If one fails, do not approve the release until it is investigated.

| ID | Check | Expected result | Result |
|---|---|---|---|
| QUICK-01 | Open the home page. | The page loads without a blank screen or visible technical error. | |
| QUICK-02 | Register a new valid UIU account. | Registration succeeds and no verification email is required. | |
| QUICK-03 | Sign in, refresh the page, then sign out. | The user remains signed in after refresh and is signed out after Logout. | |
| QUICK-04 | Edit the profile and refresh. | Saved information remains visible. | |
| QUICK-05 | Create and save a gig as a draft. | It appears in My Gigs as Draft and not on the public home page. | |
| QUICK-06 | Publish that gig. | It appears publicly with the correct Published/Active status. | |
| QUICK-07 | Sign in as User B and apply to User A's gig. | The proposal is submitted once and appears in User B's proposals. | |
| QUICK-08 | Sign in as User A and accept User B's proposal. | The proposal and gig status update correctly. | |
| QUICK-09 | Create and publish a project. | The project appears on the public Projects page. | |
| QUICK-10 | As User B, request to join User A's project. | User A can review the request and accept or reject it. | |
| QUICK-11 | As User B, try to edit User A's gig/project. | No owner controls are available and direct access is denied. | |
| QUICK-12 | Repeat the main pages on a phone-sized screen. | Content remains readable and actions remain usable without sideways scrolling. | |

---

# Detailed Test Cases

## A. Public Website and Navigation

| ID | Steps | Expected result | Result |
|---|---|---|---|
| PUBLIC-01 | Open the website while signed out. | Header, main content, and footer display correctly. No broken layout or technical error appears. | |
| PUBLIC-02 | Select the CampusCollab logo from another page. | The home page opens. | |
| PUBLIC-03 | Select **Find Gigs**. | The public gigs page opens and shows only publicly available gigs. | |
| PUBLIC-04 | Select **Projects**. | The public projects page opens. | |
| PUBLIC-05 | Select **Get Started** while signed out. | The registration page opens. | |
| PUBLIC-06 | Open an active gig's details while signed out. | A clear alert explains that sign-in is required, then the login page opens. | |
| PUBLIC-07 | Open a public project's details while signed out. | Public project information is readable, but protected participation actions require sign-in. | |
| PUBLIC-08 | Open an invalid address such as `/this-page-does-not-exist`. | A friendly Not Found page or safe redirect appears; no raw technical error is shown. | |
| PUBLIC-09 | Check all visible footer links. | Each valid link opens the correct destination and no link appears broken. | |

## B. Registration, Login, Session, and Logout

| ID | Steps | Expected result | Result |
|---|---|---|---|
| AUTH-01 | Open registration and submit it with all fields empty. | Clear messages identify the required fields. No account is created. | |
| AUTH-02 | Enter a name, a new valid `@bscse.uiu.ac.bd` address, matching valid passwords, and submit. | The account is created successfully. The user can proceed without email verification. | |
| AUTH-03 | Try registering with the same email again. | Registration is rejected with a clear message; a duplicate account is not created. | |
| AUTH-04 | Try registering with a personal email that does not end in `@bscse.uiu.ac.bd`. | Registration is rejected and the allowed university domain is explained. | |
| AUTH-05 | Enter an incorrectly written email such as `student@`. | A clear email-format error appears. | |
| AUTH-06 | Enter a password that does not meet the displayed rules. | Registration is blocked and the password requirement is explained. | |
| AUTH-07 | Enter two different passwords if a confirmation field is shown. | Registration is blocked and the mismatch is explained. | |
| AUTH-08 | Sign in with User A's correct email and password. | Login succeeds and the signed-in navigation/profile menu appears. | |
| AUTH-09 | Try User A's email with a wrong password. | Login fails with a safe, understandable message. The message must not reveal private account details. | |
| AUTH-10 | Try an unregistered email. | Login fails safely without exposing technical information. | |
| AUTH-11 | Sign in, refresh the browser, and open another page. | The session remains active. | |
| AUTH-12 | Select **Logout** from the profile menu. | The session ends and protected pages/actions are no longer available. | |
| AUTH-13 | After logout, use the browser Back button to return to the dashboard. | Protected data is not usable; the user is sent to login or shown a sign-in requirement. | |
| AUTH-14 | Open the profile/avatar menu, then click outside it. | The menu opens and closes normally. Its actions are understandable. | |

## C. Dashboard and General Navigation

| ID | Steps | Expected result | Result |
|---|---|---|---|
| NAV-01 | Sign in and select **Dashboard** from the profile menu. | The dashboard opens and shows only the signed-in user's information. | |
| NAV-02 | Visit Profile, My Gigs, Proposals, Bookmarks, Projects, Join Requests, and Invitations from available navigation. | Every destination loads and its active navigation label is clear. | |
| NAV-03 | Refresh each main dashboard page. | The correct page remains open; no blank screen or unexpected 404 appears. | |
| NAV-04 | Use the browser Back and Forward buttons between dashboard pages. | Navigation works without losing already saved data. | |
| NAV-05 | Select icon-only controls such as edit, bookmark, archive, or delete. | The icon is familiar or has text/tooltip that makes its purpose clear. | |
| NAV-06 | Start a destructive action such as delete or archive. | A styled confirmation dialog appears. The website does not use the browser's basic confirmation box. | |
| NAV-07 | Cancel a confirmation dialog. | Nothing is changed or deleted. | |
| NAV-08 | Complete a successful action. | A clear success message/toast appears and does not cover important controls for an unreasonable time. | |

## D. Profile, Skills, Availability, and Portfolio

| ID | Steps | Expected result | Result |
|---|---|---|---|
| PROFILE-01 | Open **Dashboard > Profile**. | User A's saved profile loads. A readable initials avatar appears. | |
| PROFILE-02 | Select **Edit Profile**, change display name, headline, department, graduation year, biography, and experience level, then save. | A success message appears and all saved values display correctly. | |
| PROFILE-03 | Refresh the profile after PROFILE-02. | The saved information remains. | |
| PROFILE-04 | Change a value, select Cancel, and reopen editing. | The cancelled change was not saved. | |
| PROFILE-05 | Enter text longer than the displayed limit in a limited field. | The form blocks the value or displays a clear limit message; the page does not break. | |
| PROFILE-06 | Add valid Website, GitHub, and LinkedIn links and save. | The links save and open the correct pages safely. | |
| PROFILE-07 | Enter an invalid link such as plain text and save. | A clear validation message appears and the invalid link is not saved. | |
| PROFILE-08 | Add a skill from the provided skill list and choose a level. | The skill appears with the selected level and remains after refresh. | |
| PROFILE-09 | Add a custom skill that is not in the provided list. | The custom skill is accepted and remains after refresh. | |
| PROFILE-10 | Try to add the same skill twice with different letter case. | The profile does not create confusing duplicates; a clear message is shown if needed. | |
| PROFILE-11 | Change a skill's level and save. | The new level remains after refresh. | |
| PROFILE-12 | Remove a skill and confirm the action. | The skill disappears and remains removed after refresh. | |
| PROFILE-13 | Change availability status, weekly hours, and available-from date, then save. | Availability is saved and displayed correctly after refresh. | |
| PROFILE-14 | Enter an impossible or disallowed availability value. | A clear message appears and invalid information is not saved. | |
| PROFILE-15 | Create a portfolio item with title, description, link, skills, and Published status. | The item appears on the profile and remains after refresh. | |
| PROFILE-16 | Edit the portfolio item and save. | The new information replaces the old information. | |
| PROFILE-17 | Create or change a portfolio item to Draft. | It remains manageable by its owner but is not presented as published public work. | |
| PROFILE-18 | Delete a portfolio item, first cancelling and then confirming. | Cancel keeps it; confirmation permanently removes it. | |
| PROFILE-19 | Change profile visibility, then view the public profile as User B or while signed out. | Public information follows the selected privacy setting. Private editing controls never appear publicly. | |
| PROFILE-20 | Open User A's public profile as User B. | Only intended public information is shown. User B cannot edit User A's profile. | |

## E. Public Gig Marketplace, Search, and Filters

| ID | Steps | Expected result | Result |
|---|---|---|---|
| GIG-PUBLIC-01 | Open the home page and inspect gig cards. | Active published gigs from different users can appear. Draft and archived gigs do not appear. | |
| GIG-PUBLIC-02 | Open **Find Gigs**. | Gig cards have readable titles, owner information, skills, budget/details, and a correct status badge without overlapping text. | |
| GIG-PUBLIC-03 | Search using part of a known gig title. | Matching gigs appear and unrelated gigs are removed. | |
| GIG-PUBLIC-04 | Search using different uppercase/lowercase letters. | Search remains useful and finds the expected gig. | |
| GIG-PUBLIC-05 | Apply each available filter one at a time. | Results match the selected filter. | |
| GIG-PUBLIC-06 | Combine two or more filters. | Results satisfy the combined filters. | |
| GIG-PUBLIC-07 | Change the sort order. | Cards reorder according to the selected sort option. | |
| GIG-PUBLIC-08 | Clear search and filters. | The normal active-gig list returns. | |
| GIG-PUBLIC-09 | Search for text that matches nothing. | A friendly empty state appears with a way to clear the search/filter. | |
| GIG-PUBLIC-10 | Compare card badges with the gig's real owner status in My Gigs. | Published, Draft, Assigned, Closed, and Archived labels are not mixed up. Only public statuses appear publicly. | |

## F. Creating and Managing Gigs

Use User A for the owner cases.

| ID | Steps | Expected result | Result |
|---|---|---|---|
| GIG-OWNER-01 | Open **My Gigs > Create Gig**. | The creation form opens with understandable labels and no unrelated owner/user ID field. | |
| GIG-OWNER-02 | Submit an empty gig form. | Required fields are identified clearly; no gig is created. | |
| GIG-OWNER-03 | Enter some information, leave without intentionally saving, return to My Gigs, and refresh. | A Pending/Continue card for that unfinished form is available on the same browser and user. It is not a real database draft or public gig. | |
| GIG-OWNER-04 | Continue the unfinished form from GIG-OWNER-03. | Previously entered information is restored. | |
| GIG-OWNER-05 | Discard the unfinished form and confirm. | The pending form disappears without deleting real saved gigs. | |
| GIG-OWNER-06 | Complete the form, choose fixed skills, add a custom skill, and select **Save Draft**. | One real Draft gig is saved. It appears in the Draft filter and does not appear publicly. | |
| GIG-OWNER-07 | Refresh after saving the draft. | The draft and custom skill remain. | |
| GIG-OWNER-08 | Edit the draft title, description, budget/type, deadline/duration, and skills, then save. | All changes remain after refresh. | |
| GIG-OWNER-09 | Publish the valid draft. | Its status changes to Published/Active and it appears on the public marketplace/home page. | |
| GIG-OWNER-10 | Try to publish a draft missing required publish information. | Publication is blocked and the missing information is explained. | |
| GIG-OWNER-11 | View User A's published gig details while signed in. | A professional details page shows the correct title, owner, description, skills, terms, and owner actions. | |
| GIG-OWNER-12 | Edit a published gig where editing is allowed. | Permitted changes save; protected ownership/status fields cannot be manipulated. | |
| GIG-OWNER-13 | Archive a gig and confirm. | It moves to Archived and disappears from public results. | |
| GIG-OWNER-14 | Restore the archived gig. | It returns to the appropriate active/published state and reappears publicly when eligible. | |
| GIG-OWNER-15 | Close a published gig and confirm. | It is labelled Closed and no longer accepts new proposals. | |
| GIG-OWNER-16 | Check each My Gigs filter: All, Draft, Published, Assigned, Closed, and Archived. | Each gig appears only in the correct groups; Pending is used only for an unfinished local form. | |
| GIG-OWNER-17 | Permanently delete a disposable Draft gig; cancel the first confirmation. | The first attempt keeps the gig. | |
| GIG-OWNER-18 | Permanently delete the disposable Draft gig and confirm. | The gig is permanently removed and does not return after refresh. | |
| GIG-OWNER-19 | Try permanently deleting a gig with proposal/project history if the delete action is offered. | Unsafe deletion is blocked with a clear explanation. Archive remains available when permitted. | |
| GIG-OWNER-20 | Create several gigs, then move between pages or load more results if pagination is shown. | No gig is unexpectedly duplicated or skipped. | |

## G. Bookmarks/Favourites

Use User B and one active gig owned by User A.

| ID | Steps | Expected result | Result |
|---|---|---|---|
| BOOKMARK-01 | Select the bookmark/favourite control on User A's active gig card. | It changes to the saved state and a success message appears. | |
| BOOKMARK-02 | Open **Dashboard > Bookmarks**. | The saved gig appears once. | |
| BOOKMARK-03 | Refresh and sign out/in again. | The bookmark remains saved. | |
| BOOKMARK-04 | Remove the bookmark from the card or Bookmarks page. | It disappears from Bookmarks and the card control returns to its unsaved state. | |
| BOOKMARK-05 | Try rapidly selecting bookmark more than once. | The final state remains understandable and duplicate bookmark entries are not created. | |
| BOOKMARK-06 | Archive/close the bookmarked gig as User A, then inspect User B's bookmarks. | The website handles the unavailable gig clearly and does not misleadingly present it as open. | |

## H. Proposals

Create a fresh published gig as User A, then sign in as User B.

| ID | Steps | Expected result | Result |
|---|---|---|---|
| PROPOSAL-01 | As User B, open User A's active gig and choose Apply/Submit Proposal. | A proposal form opens for the correct gig. | |
| PROPOSAL-02 | Submit the proposal form empty. | Required fields are identified and no proposal is created. | |
| PROPOSAL-03 | Enter a valid message, price/terms, and other required information, then submit. | The proposal is submitted once and a success message appears. | |
| PROPOSAL-04 | Open **My Proposals** as User B. | The new proposal appears with the correct gig and Submitted/Pending status. | |
| PROPOSAL-05 | Refresh and open proposal details. | Submitted information remains correct. | |
| PROPOSAL-06 | Try submitting a second active proposal to the same gig. | A duplicate is prevented or handled according to the displayed rule; two unintended active proposals are not created. | |
| PROPOSAL-07 | Sign in as User A and try applying to User A's own gig. | The owner cannot apply to their own gig. | |
| PROPOSAL-08 | As User A, open the gig's proposal list. | User B's proposal appears with enough information to review it. | |
| PROPOSAL-09 | Shortlist User B's proposal if Shortlist is available. | Its status changes once and remains correct after refresh. | |
| PROPOSAL-10 | Accept User B's valid proposal and confirm. | The proposal becomes Accepted and the gig becomes Assigned/otherwise updates according to its capacity. | |
| PROPOSAL-11 | Inspect other proposals after one is accepted. | Their statuses and available actions remain consistent with the gig's capacity and rules. | |
| PROPOSAL-12 | On a separate test gig, reject User B's proposal. | Its status becomes Rejected and User B can see that result. | |
| PROPOSAL-13 | On a separate submitted proposal, withdraw it as User B if Withdraw is available. | It becomes Withdrawn and can no longer be accepted. | |
| PROPOSAL-14 | Try applying to a Draft, Closed, Archived, or already unavailable gig by using any available old link. | Application is denied with a clear message. | |
| PROPOSAL-15 | Sign in as an unrelated user and try to open a proposal URL belonging to User A or B. | Private proposal information is denied or not found. | |

## I. Public Projects and Project Creation

Use User A as the project owner.

| ID | Steps | Expected result | Result |
|---|---|---|---|
| PROJECT-01 | Open the public Projects page. | Public projects display as readable cards with accurate status/recruitment information. | |
| PROJECT-02 | Search for a known project and apply available filters/sorting. | Results match the entered search and selected filters/sort. | |
| PROJECT-03 | Clear project search and filters. | The normal project list returns. | |
| PROJECT-04 | Open **Dashboard > Projects > Create Project** as User A. | The project form opens with clear fields and no owner-ID field. | |
| PROJECT-05 | Submit the empty form. | Required fields are explained and no project is created. | |
| PROJECT-06 | Create a valid draft project. | It appears in User A's project workspace as Draft and not publicly. | |
| PROJECT-07 | Refresh and edit the draft. | Saved information remains and permitted changes can be updated. | |
| PROJECT-08 | Publish the valid project. | It appears publicly and has the correct Published/Recruiting status. | |
| PROJECT-09 | Open the public project details. | Title, owner, description, skills, status, openings, and membership information are accurate and professionally displayed. | |
| PROJECT-10 | Change recruitment status where the owner control is available. | Join/invite availability and public labels update consistently. | |
| PROJECT-11 | Archive or cancel a disposable project if the action is available. | The project leaves active public results and has the correct lifecycle label. | |

## J. Project Openings, Join Requests, Invitations, and Membership

Use a published/recruiting project owned by User A. Use User B as the prospective member.

| ID | Steps | Expected result | Result |
|---|---|---|---|
| COLLAB-01 | As User A, add a project opening with role, description, required skills, and capacity. | The opening appears on the project and remains after refresh. | |
| COLLAB-02 | Edit the opening. | The updated information is shown publicly after refresh. | |
| COLLAB-03 | As User B, open the project and request to join an available opening. | One join request is created and its Pending status is visible to User B. | |
| COLLAB-04 | As User B, try requesting the same opening again. | A duplicate active request is prevented with a clear message. | |
| COLLAB-05 | As User B, cancel a pending request if Cancel is available. | The status changes correctly and User A can no longer accept it. | |
| COLLAB-06 | Submit a new valid request, then sign in as User A and open project management/join requests. | User B's request appears for the correct project and opening. | |
| COLLAB-07 | Reject a disposable request as User A. | User B sees Rejected and does not become a member. | |
| COLLAB-08 | Submit another eligible request and accept it as User A. | User B becomes an active member once; the opening capacity updates correctly. | |
| COLLAB-09 | Try accepting the same request again using any still-visible action. | A duplicate membership is not created. | |
| COLLAB-10 | Fill an opening to capacity, then attempt another acceptance/request. | Capacity is enforced and the user receives a clear explanation. | |
| COLLAB-11 | As User A, invite eligible User B to a project/opening. | One pending invitation appears in User B's Invitations page. | |
| COLLAB-12 | Try sending the same pending invitation again. | A duplicate invitation is prevented or clearly handled. | |
| COLLAB-13 | As User B, reject a disposable invitation. | It becomes Rejected and User B does not become a member. | |
| COLLAB-14 | Send another eligible invitation and accept it as User B. | User B becomes a member once and capacity updates correctly. | |
| COLLAB-15 | As User A, view the member list. | The correct members, roles, and statuses appear. | |
| COLLAB-16 | As User A, remove a removable member and confirm. | The member is removed and capacity/member count updates. | |
| COLLAB-17 | As a non-owner member, leave a project if Leave is available. | The membership ends without changing ownership or deleting the project. | |
| COLLAB-18 | Close an opening as User A. | New requests/invitations for that opening are no longer accepted. | |
| COLLAB-19 | Stop recruitment as User A and try joining as User B. | New participation is blocked while existing project data remains readable. | |

## K. Ownership and Authorization — Two-User Security Test

These tests are mandatory. They confirm that one user cannot control another user's data.

| ID | Steps | Expected result | Result |
|---|---|---|---|
| SECURITY-01 | User A creates Gig A. Sign out, sign in as User B, and open Gig A. | User B can view allowed details but sees no edit, archive, close, or delete owner controls. | |
| SECURITY-02 | As User B, paste User A's gig edit address into the browser if it is known. | Access is denied or redirected. The edit form does not reveal or save owner-only data. | |
| SECURITY-03 | As User B, try all visible ways to delete/archive/close Gig A. | No operation changes Gig A. | |
| SECURITY-04 | User A creates Project A. As User B, try opening its edit/manage address directly. | Owner-only access is denied. | |
| SECURITY-05 | As User B, try removing members, accepting requests, or sending owner invitations on Project A. | All owner-only operations are denied. | |
| SECURITY-06 | Compare User A and User B dashboards. | Each user sees only their own private profile editor, drafts, proposals, bookmarks, invitations, and requests. | |
| SECURITY-07 | Sign out in one tab, then try a protected action in another tab. | The protected action is rejected and the user is asked to sign in again. | |
| SECURITY-08 | Change a visible ID in a gig, project, profile, or proposal web address to another known ID. | Only information allowed for the signed-in user is returned. Private/owner-only data remains protected. | |
| SECURITY-09 | Check creation/edit forms for an owner/user-ID field. | The website never asks the user to choose who owns the resource. Ownership comes from the signed-in account. | |
| SECURITY-10 | Use User B to attempt an action after User A has archived/closed the resource. | The server follows the real current status and refuses an invalid old action. | |

## L. Data Accuracy, Refresh, and Multiple Tabs

| ID | Steps | Expected result | Result |
|---|---|---|---|
| DATA-01 | Save a profile, gig, proposal, or project change and refresh immediately. | The saved result remains; no old information reappears. | |
| DATA-02 | Open the same item in two tabs. Change it in the first tab, then refresh the second. | The second tab shows the newest saved version. | |
| DATA-03 | Select a save/submit action once and wait. | One item is created, not two. The button communicates that work is in progress. | |
| DATA-04 | Double-click a submit button quickly. | Accidental duplicate gigs, proposals, requests, invitations, or portfolio items are not created. | |
| DATA-05 | Use leading/trailing spaces in a title or skill. | The saved value is clean and does not create misleading duplicates. | |
| DATA-06 | Enter ordinary punctuation in descriptions and names. | Valid text displays correctly and does not damage the page layout. | |

## M. Error Messages and Recovery

| ID | Steps | Expected result | Result |
|---|---|---|---|
| ERROR-01 | Cause a normal form error. | The message explains what needs correction in plain language and remains near the relevant field/action. | |
| ERROR-02 | While a page is loading, observe the screen. | A loading indicator/skeleton appears; the page does not look frozen. | |
| ERROR-03 | Open a list that has no results. | A friendly empty state explains what to do next. | |
| ERROR-04 | Briefly disconnect the internet, then try a non-destructive load/save and reconnect. | A safe error appears. The app does not falsely claim success, and retrying works after reconnection. | |
| ERROR-05 | Trigger any forbidden action during the security tests. | The message is understandable and does not show stack traces, database text, secret values, or file paths. | |
| ERROR-06 | Select an action and wait during a slow connection. | The action shows progress and does not encourage repeated accidental submissions. | |

## N. Mobile, Visual Quality, and Accessibility

Repeat these checks on the home page, gig list/details, profile, My Gigs, proposal form, project list/details, and project management.

| ID | Steps | Expected result | Result |
|---|---|---|---|
| UI-01 | Use a phone-sized screen. | Text, cards, dialogs, and forms fit without unwanted sideways scrolling. | |
| UI-02 | Open the mobile navigation and profile menu. | Menus are readable, do not leave the screen, and close normally. | |
| UI-03 | Open a confirmation dialog on mobile. | The complete message and all buttons are visible and tappable. | |
| UI-04 | Inspect long titles, descriptions, skills, and email addresses. | Text wraps or truncates neatly without overlapping icons/buttons. | |
| UI-05 | Inspect gig and project badges. | Every badge is readable, correctly aligned, and matches the actual state. | |
| UI-06 | Use only the keyboard: press Tab, Shift+Tab, Enter, Space, and Escape through one main form and menu. | A visible focus indicator appears, controls work in a logical order, and dialogs can be closed safely. | |
| UI-07 | Zoom the browser to 200%. | Main content remains readable and usable without important content disappearing. | |
| UI-08 | Check buttons and icons against their backgrounds. | Labels and icons have enough contrast and are easy to understand. | |
| UI-09 | Check all forms. | Every input has a visible, understandable label; required information and errors are clear. | |
| UI-10 | Open every major page and watch for visual inconsistency. | Colors, spacing, typography, cards, buttons, alerts, and dialogs look consistent and professional. | |

## O. Basic Cross-Browser Test

| ID | Steps | Expected result | Result |
|---|---|---|---|
| BROWSER-01 | Run QUICK-01 through QUICK-12 in current Chrome. | All quick checks pass. | |
| BROWSER-02 | Run QUICK-01 through QUICK-12 in current Edge. | All quick checks pass. | |
| BROWSER-03 | Run the main public, login, profile, gig, proposal, and project journeys on a mobile browser. | Core actions remain usable and saved data remains accurate. | |

---

# Complete End-to-End User Scenario

Use this after the individual tests pass.

1. Register User A with an unused UIU student email.
2. Sign in as User A and complete the profile, skills, availability, and one published portfolio item.
3. Create a gig, save it as Draft, edit it, then publish it.
4. Create a project, add one opening, and publish/start recruitment.
5. Sign out.
6. Confirm User A's gig and project are visible publicly but the draft/private information is not.
7. Register or sign in as User B.
8. Complete User B's profile.
9. Bookmark User A's gig and submit one proposal.
10. Request to join User A's project.
11. Sign out and sign in as User A.
12. Review and accept User B's proposal.
13. Review and accept or reject User B's project join request.
14. Confirm the resulting gig, proposal, project, opening, and membership states are accurate.
15. Sign in as User B and confirm the same results are visible from User B's side.
16. Confirm User B cannot edit/delete User A's gig or manage User A's project.
17. Sign out and confirm protected pages require login.

Expected overall result: the complete journey works without duplicate records, lost data, incorrect status labels, unauthorized controls, browser confirmation boxes, blank screens, or exposed technical errors.

# Release Blocking Rules

Do **not** approve the release if any of these occur:

- Registration, login, logout, or session persistence fails.
- Saved data disappears after refresh.
- Draft/archived content appears as an active public item.
- A non-owner can edit, delete, archive, close, publish, or manage another user's resource.
- A user can see another user's private proposal or dashboard data.
- Duplicate proposals, memberships, join requests, or invitations are created accidentally.
- Project opening capacity can be exceeded.
- A destructive action occurs after the user selected Cancel.
- A page exposes a stack trace, database error, secret, token, or internal file path.
- A core workflow is unusable on a phone-sized screen.

# Test Summary and Sign-Off

| Result | Count |
|---|---:|
| Passed | |
| Failed | |
| Blocked | |
| Not applicable | |
| Total executed | |

## Defects Found

| Defect ID | Test case ID | Short description | Severity | Screenshot/video | Retest result |
|---|---|---|---|---|---|
| BUG-001 | | | Critical / High / Medium / Low | | |

Severity guide:

- **Critical:** security/privacy breach, data loss, or the application cannot be used.
- **High:** a main journey such as registration, profile save, gig, proposal, or project participation does not work.
- **Medium:** a secondary action fails but a reasonable workaround exists.
- **Low:** visual, wording, or minor usability issue with no data/functionality loss.

## Approval

- Tester name: ______________________________
- Test date: ______________________________
- Website/version tested: ______________________________
- Desktop browser: ______________________________
- Mobile device/browser: ______________________________
- Decision: [ ] Approved  [ ] Not approved  [ ] Approved with known minor issues
- Notes: ________________________________________________________________
