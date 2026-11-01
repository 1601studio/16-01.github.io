# 16:01 Studio — Phase 2 CMS Implementation Plan

## Audit scope and status

This document captures the read-only audit for the Phase 2 CMS implementation work in the 16:01 Studio repository.

Scope reviewed:
- `admin/dashboard.html`
- `admin/login.html`
- `admin/js/auth.js`
- `admin/js/dashboard.js`
- `admin/js/cms.js`
- `admin/js/cms-storage.js`
- `admin/js/supabase-config.js`
- `js/supabase-client.js`
- GitHub Pages deployment files and workflow
- Repository runtime-config generation scripts
- README and audit docs relevant to admin setup

This audit does not change application code, Supabase schema, RLS policies, Storage policies, or public website files.

## Existing files and current functionality

### Admin dashboard shell

`admin/dashboard.html` exists and provides the admin application shell:
- authenticated dashboard layout
- sidebar navigation
- overview page container
- project/media/settings/staff sections
- header and profile area
- sign-out control
- browser-local dashboard message region

The dashboard layout and styling are already implemented and should be reused.

### Login flow

`admin/login.html` and `admin/js/auth.js` already implement:
- email/password sign-in form
- password show/hide toggle
- session check on page load
- sign-out of unauthorized users
- dashboard redirect after successful verification
- status messaging for unauthorized/expired sessions

The login flow is built on Supabase Auth and validates the signed-in user before granting dashboard access.

### Current authorization logic

`admin/js/auth.js` currently performs:
- `client.auth.getUser()`
- `from("studio_staff").select("role, is_active").eq("id", userData.user.id).maybeSingle()`

Access is granted only when:
- a matching row exists
- `is_active === true`
- `role === "admin"`

If not, the session is signed out and access is denied.

### Dashboard bootstrap

`admin/js/dashboard.js` does the following:
- loads the Supabase client
- runs `verifyAdmin(client)`
- redirects unauthorized sessions to login
- mounts the dashboard once access is confirmed
- listens for auth sign-out events

### CMS and browser-local workspace

`admin/js/cms.js` and `admin/js/cms-storage.js` implement a browser-local CMS workspace:
- localStorage-driven project, category, media, services, font and settings preview data
- forms and dialogs for editing local workspace content
- dashboard navigation and view rendering
- local browser-only project data flow

This is a preview/admin workspace, not a live Supabase-backed CMS.

### Supabase client integration

`admin/js/supabase-config.js` implements the browser Supabase client setup:
- loads `@supabase/supabase-js` from jsDelivr
- validates a plain HTTPS project URL
- accepts publishable keys or legacy anon keys
- rejects secret/service-role keys
- creates a client with persisted authentication enabled

`js/supabase-client.js` is the public-site optional client and follows the same public-only configuration pattern.

### Runtime configuration files

The repo includes scripts that generate runtime config files from environment variables:
- `scripts/generate-supabase-config.js`
- `scripts/generate-admin-supabase-config.js`

These write files to:
- `js/supabase-runtime-config.js`
- `admin/js/supabase-runtime-config.js`

These runtime config files are intentionally ignored by Git via `.gitignore` and are generated at deployment time.

## Existing Supabase integration

### Current working pattern

The repo already uses a browser-only Supabase client with:
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- Auth login for admin access
- a staff record check against `studio_staff`

This is a valid public-browser integration pattern because it uses public credentials only.

### Current limitation

The repository does not include live service-layer modules that perform the CMS CRUD operations against Supabase. The admin dashboard currently relies on browser-local storage and not on Supabase database or Storage-backed content.

## Existing GitHub Pages deployment setup

The repository contains a GitHub Pages deployment workflow:
- `.github/workflows/deploy.yml`

The workflow:
- checks out the repo
- configures Pages
- generates runtime config for the public website and admin area
- uploads the repo root as the Pages artifact
- deploys to GitHub Pages

This supports the static hosting pattern required for GitHub Pages.

## Approved architecture summary

Approved architecture to implement against:
- GitHub Pages hosts the public website and private admin UI
- Supabase provides authentication, database and Storage
- Tables: `projects`, `project_media`, `studio_staff`
- Buckets: `project-drafts` (private), `project-public` (public read)

This implementation plan assumes those tables and buckets are already present in the live Supabase project. The repository does not include their SQL migrations or policy files.

## What already works

The following elements are already in place and should be reused without redesign:
- dashboard shell and navigation
- layout and CSS tokens
- login page and auth flow
- session validation and redirect logic
- role check against `studio_staff`
- admin dashboard shell and view structure
- local browser CMS preview workflow for project-related editing preview states

## Missing functionality for the approved CMS

The current implementation does not yet provide the required live CMS features:

### Projects
Missing live functionality for:
- listing projects from Supabase
- creating projects
- editing projects
- publishing/unpublishing projects
- deleting projects
- draft lifecycle management
- project validation and error handling
- project-specific audit trail

### Media / artwork management
Missing live functionality for:
- uploading project images/artwork
- linking media records to projects
- generating and validating public/private asset paths
- managing Storage bucket uploads
- retrieving image metadata
- removing/deactivating media records
- allowing different rules for draft vs public assets

### Staff management
Missing live functionality for:
- view list of staff
- add staff
- change staff roles
- activate/deactivate staff
- delete staff
- enforce the approved role matrix

### Database-side enforcement
Missing or not auditable from repo files:
- staff table CRUD enforcement in policies
- project permissions enforcement by role
- project media permissions enforcement by role
- draft/private artwork restrictions
- admin-only restrictions on project deletion or access to admin-only operations

## Missing database CRUD operations

The repository does not include any tracked browser code that performs the required live CRUD operations against Supabase. Specifically missing are:
- `projects` create/read/update/delete
- `project_media` create/read/update/delete
- `studio_staff` create/read/update/delete
- role-based locking or checks for staff actions
- live data fetches for project and media lists

## Missing artwork upload and management functionality

There are no tracked Supabase Storage calls or bucket workflows. Missing functionality includes:
- upload to `project-drafts` for member/admin draft work
- upload to `project-public` for published project artwork
- validation of allowed image types and size limits
- file naming conventions
- public/private path handling
- metadata linking between `project_media` and `projects`
- secure access restrictions for private draft assets

## Client-side authorization requirements

The approved architecture requires database-side enforcement, not UI-only guarding.

The current client-side auth check in `admin/js/auth.js` is a necessary gate, but it is not sufficient for production authorization.

The implementation must ensure that the database and Storage policies enforce:
- Admin full access
- Co-admin project creation/edit/publish management without project deletion
- Member draft-only project creation/edit permissions
- no Admin or Co-admin creation via client-side UI alone
- no client-side bypass of restrictions
- no direct browser access to private draft Storage items

## Role matrix alignment with approved permissions

### Admin
Allowed:
- Full CMS access
- Create, edit, publish, unpublish and delete projects
- Manage all staff roles

### Co-admin
Allowed:
- Create and edit projects
- Publish and unpublish projects
- Manage Member accounts only
- Cannot create or promote Admin or Co-admin accounts
- Cannot delete projects or artwork

### Member
Allowed:
- Create and edit own draft projects
- Upload permitted draft artwork
- Cannot publish or delete projects

The repository currently only enforces a basic admin-only dashboard gate. It does not yet implement the approved three-role model.

## Files to modify

The likely implementation work will center around these files, while reusing existing shell and design patterns:

### Core admin shell and navigation
- `admin/dashboard.html`
- `admin/js/dashboard.js`
- `admin/css/admin.css`

### Authorization and session gating
- `admin/js/auth.js`
- `admin/js/supabase-config.js`

### CMS rendering and action logic
- `admin/js/cms.js`
- `admin/js/cms-storage.js`

### New service modules
The repo does not currently contain a dedicated live Supabase service layer for CMS features, so new files are expected to be added under `admin/js/` for:
- project service
- media service
- staff service
- auth/role enforcement helpers

### Potential future deployment/config updates
- GitHub Actions variables and deployment configuration if the runtime config needs additional env validation or deployment expectations
- no tracked public site pages should be modified for this phase

## Implementation order

### Phase 1 — confirm live Supabase contract
1. Confirm the actual database schema and column names for:
   - `projects`
   - `project_media`
   - `studio_staff`
2. Confirm the live Storage bucket configuration:
   - `project-drafts` (private)
   - `project-public` (public read)
3. Confirm the existing RLS and Storage policies for the approved permission model.
4. Verify the policy behavior for admin/co-admin/member access before building UI.

### Phase 2 — reuse the dashboard shell
1. Reuse the existing navigation, layout, and styling.
2. Keep the existing dashboard shell and login experience intact.
3. Add the required CMS sections without redesigning the interface.

### Phase 3 — implement project CRUD
1. Add Supabase read/list operations for projects.
2. Add create/edit flows for draft and published project records.
3. Enforce project publish/unpublish rules by role.
4. Enforce deletion restrictions by role.
5. Validate all operations against the live RLS policy contract.

### Phase 4 — implement artwork and media management
1. Add media upload support for drafts vs published assets.
2. Link `project_media` records to project IDs.
3. Validate allowed media types and Storage bucket rules.
4. Enforce public/private file visibility rules.
5. Ensure the public bucket remains public-read only and private assets stay private.

### Phase 5 — implement staff management
1. Build a staff list view.
2. Add staff record creation and editing.
3. Add role change flows.
4. Add activation/deactivation toggles.
5. Implement deletion only for admin-authorized actions.
6. Enforce all staff operations via Supabase policies.

### Phase 6 — enforce security checks and testing
1. Confirm the UI hides actions not allowed for the current account.
2. Confirm the database rejects unauthorized actions even when the UI is bypassed.
3. Confirm the member user cannot publish or delete projects.
4. Confirm co-admin cannot manage admin records or delete projects or artwork.
5. Confirm draft/private media remains private.
6. Validate login/logout, session expiry and unauthorized redirects.

## Security considerations

### Do not expose secrets
- Never use service-role or secret keys in GitHub Pages front-end code.
- Keep runtime config public-only and use Supabase publishable/anon keys only.

### Database-side enforcement required
- UI checks must never be the only enforcement.
- Every project/media/staff operation should be authorized by policies.
- The browser should not be trusted to enforce role boundaries.

### Protection against privilege escalation
- Prevent self-promotion to admin or co-admin unless intentionally allowed by policy.
- Prevent changing or deleting the last admin.
- Restrict admin-only staff actions to admin-level policies.
- Restrict project deletion to allowed roles only.

### Draft and private artwork protection
- Ensure `project-drafts` remains private.
- Ensure `project-public` remains public-read only.
- Do not expose draft/private asset URLs to the public site.

### Session and role integrity
- Keep the existing auth check and session redirect logic.
- Recheck role status when the dashboard is loaded and when sensitive actions are attempted.

## Testing requirements

### Functional tests
- Admin can view dashboard and all CMS sections
- Co-admin can create/edit/publish projects
- Co-admin cannot delete projects or artwork
- Member can create/edit draft projects only
- Member cannot publish or delete projects
- Staff can be added, activated, deactivated, and role-updated per policy
- Admin-only deletions work only for approved staff

### Security tests
- Attempt browser tampering with role values
- Attempt unauthorized project deletion
- Attempt unauthorized artwork upload to public bucket
- Attempt direct access to private draft asset URLs
- Attempt member promotion to co-admin or admin
- Attempt deactivation of final admin

### UI and layout tests
- Ensure the existing shell is not redesigned
- Ensure navigation still works after CMS section implementation
- Check dashboard behavior on desktop and mobile widths
- Confirm error states and empty states

## Delivery note

This document is the implementation plan for the Phase 2 CMS work. It does not perform any application code changes.

No application code, SQL migrations, RLS rules, Storage policies, or public website files were modified as part of this audit.

## Final audit result

The repository is prepared for Phase 2 CMS implementation in the approved architecture, but the live CMS functionality is not yet implemented. The existing codebase provides a working admin shell, auth gate, and GitHub Pages deployment structure; the remaining work is to implement the live Supabase-backed project, media, and staff management layers under the approved permissions model and the existing database/Supabase policy enforcement requirements.

This audit is complete and no further application changes were made.

## File created

`docs/PHASE-2-CMS-IMPLEMENTATION-PLAN.md`

This file was added as a documentation-only artifact for the audit and does not modify the application code.

---

End of audit.
