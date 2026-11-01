# Phase 2 — Project / Supabase Mapping

Status: documentation only. This file records repository-verified findings and explicitly separates them from previously supplied live Supabase findings that were not re-verified in the tracked codebase.

## Scope and evidence boundary

This document is based on the tracked repository source and previously completed read-only audit findings. It does not change application code, database schema, storage configuration, RLS policies, migration files, or public website files.

Important boundary:
- Repository-verified findings are based on files currently in `admin/js/*.js`, `docs/*.md`, and related tracked project docs.
- Previously supplied live Supabase findings are not re-validated in this repository and must be confirmed against the live Supabase project before implementation.
- This document intentionally does not invent database columns, storage buckets, or policy rules.

## 1) Current project form fields and project data model

### Verified repository findings

The current admin project editor (`admin/js/cms.js`) defines a local project record with the following fields:

- `id`
- `slug`
- `title`
- `category`
- `categories`
- `thumbnail`
- `previewImage`
- `heroImage`
- `alt`
- `summary`
- `description`
- `role`
- `year`
- `completedAt`
- `featured`
- `published`
- `createdAt`
- `updatedAt`

The repository’s project data contract is also referenced in the docs and admin workspace:

- `docs/PROJECT_MANAGEMENT.md` describes the working catalog model with `thumbnail`, `previewImage`, `heroImage`, `alt`, `summary`, `description`, `role`, `completedAt`, `publishedAt`, `featured`, `published`, and an older `year` compatibility field.
- `admin/js/cms-storage.js` defines the local browser workspace and default store (`projects: []` with project objects persisted in `localStorage`).
- `admin/js/cms.js` creates and edits project objects with `saveProject()` and stores them by `id` in the local workspace.

Relevant repository-verified model behavior:
- `category` is the primary mapping and is required.
- `categories` is an array of secondary image categories.
- `thumbnail` is required for the card image.
- `previewImage` is optional.
- `heroImage` falls back to `thumbnail` if blank.
- `alt` is required for accessibility.
- `summary` is required.
- `description` is optional, longer case-study copy.
- `published` is a local checkbox, not a public-site publication guarantee.
- `featured` is a local homepage flag.
- `year` is retained for compatibility and may be used for display.
- `completedAt` and `updatedAt` are used as timestamps in the browser-local implementation.

This is the project model currently implemented in the repo. It is a browser-only CMS model, not a verified Supabase table contract.

### Project data model status

- Supported by current repository code: yes
- Supported by live Supabase schema: not proven in repo; must be verified in the live database
- Risk: the local browser model has a richer set of fields than the repository’s public-facing static site data contract and may not match the live Supabase schema one-to-one

## 2) Existing Supabase `projects` table columns

### Repository-verified finding

The tracked repository does not define a SQL migration or schema file that lists the live `projects` table columns. No repo file was found that declares the Supabase `projects` table or the column list.

### Previously supplied live Supabase findings (not repo-verified)

The earlier live Supabase review provided a database schema context outside the repo, but those values are not re-verified in the tracked source and therefore must be treated as external confirmation only.

This file intentionally does not restate or invent those columns without the live schema confirmation. The implementation phase must confirm the actual `projects` table schema in the live Supabase project before any code is mapped or written.

Status:
- Repo-verified: no tracked definition found
- Live Supabase schema: externally supplied earlier, but not re-verified here
- Required action before implementation: confirm exact `projects` columns directly in Supabase Studio or migration history

## 3) Existing `project_media` table columns

### Repository-verified finding

No tracked repository file defines a `project_media` table schema, SQL migration, or storage contract.

### Previously supplied live Supabase findings (not repo-verified)

The earlier live Supabase review also supplied context for a `project_media` table, but the repository does not contain source-of-truth schema definitions for it. This file does not reproduce or infer those columns without live confirmation.

Status:
- Repo-verified: no tracked definition found
- Live Supabase schema: externally supplied earlier, but not re-verified here
- Required action before implementation: confirm exact `project_media` columns directly in Supabase Studio or migration history

## 4) Field-by-field mapping: supported, unsupported, or requiring a decision

This mapping compares the current repository project model to the likely Supabase data layer. Because the live schema is not re-verified in the repo, the outcome is intentionally conservative.

| Current field / concept | Repository evidence | Supabase status | Outcome |
|---|---|---|---|
| `id` | Verified in admin form and local storage model | Must be confirmed against live schema | Supported if live table contains a stable record ID |
| `slug` | Verified in admin form and docs | Must be confirmed in live schema | Supported if unique slug column exists |
| `title` | Verified in admin form | Must be confirmed | Supported |
| `category` | Verified in admin form and category seed mapping | Must be confirmed | Supported |
| `categories` | Verified in admin form and category seed mapping | Must be confirmed | Supported if stored as array or normalized join table |
| `thumbnail` | Verified in admin form and project docs | Must be confirmed | Supported |
| `previewImage` | Verified in admin form and project docs | Must be confirmed | Supported if live media references are explicitly allowed |
| `heroImage` | Verified in admin form and project docs | Must be confirmed | Supported |
| `alt` | Verified in admin form | Must be confirmed | Supported |
| `summary` | Verified in admin form | Must be confirmed | Supported |
| `description` | Verified in admin form and docs | Must be confirmed | Supported if long-text column exists |
| `role` | Verified in admin form | Must be confirmed | Supported |
| `year` | Verified in admin form and docs | Must be confirmed | Supported for compatibility; may be replaced by `completedAt` |
| `completedAt` | Verified in docs and admin save logic | Must be confirmed | Supported if date column exists |
| `publishedAt` | Documented in `docs/PROJECT_MANAGEMENT.md` as optional | Must be confirmed | Requires decision; not currently part of the browser-local project form |
| `featured` | Verified in admin form | Must be confirmed | Supported |
| `published` | Verified in admin form and local toggle logic | Must be confirmed | Supported, but not equal to public publication |
| `createdAt` | Verified in `saveProject()` | Must be confirmed | Supported if server-generated or app-managed |
| `updatedAt` | Verified in `saveProject()` | Must be confirmed | Supported if server-generated or app-managed |
| `media` upload references | Verified in admin media library and project assets | Must be confirmed with Storage setup | Requires decision between direct path references and storage object references |
| project image category mapping | Verified in `CATEGORY_SEEDS` and category assignments | Must be confirmed | Supported only if live schema preserves category names and mapping semantics |
| project file/asset references | Verified in local workspace and media table usage | Must be confirmed with Storage path policy | Requires decision; repository does not enforce a live storage contract |

### Summary of mapping outcomes

- Supported by current repo logic: `id`, `title`, `category`, `categories`, `thumbnail`, `previewImage`, `heroImage`, `alt`, `summary`, `description`, `role`, `year`, `featured`, `published`, and timestamp fields.
- Unsupported in current repo as a source-of-truth schema definition: any claim that the live Supabase `projects` and `project_media` tables already match the local form without live confirmation.
- Requires decision before implementation:
  - whether `categories` is stored as a Postgres array, JSON array, or joined/normalized table
  - whether `previewImage` and `heroImage` are storage paths, public URLs, or object references
  - whether `year` remains a legacy display field or is replaced by `completedAt`
  - whether `publishedAt` is part of the live database contract or only a local planning field
  - whether `Member` drafts are allowed to reference other users’ data in the same table or bucket

## 5) Current localStorage project CRUD implementation

### Verified repository findings

`admin/js/cms-storage.js` defines the local browser workspace storage key:
- `STORAGE_KEY = "1601-admin-dashboard-v1"`

The workspace is persisted in browser `localStorage` with:
- `readStore()`
- `writeStore(next, activityLabel)`

`admin/js/cms.js` implements the CRUD flow for projects:
- create: `saveProject()` creates a new object and inserts it into `store.projects`
- read: `renderProjects()` reads from `getStore().projects`
- update: `saveProject()` updates an existing project by `id`
- delete: `deleteById("projects", id, "project")`

Project validation includes:
- unique slug check
- title required
- category required
- thumbnail required
- alt required
- summary required
- optional preview and hero image paths
- published state toggled locally
- featured flag managed in local state

Important repository finding:
- This is a single-browser workspace; it does not synchronize across administrators.
- The admin dashboard itself is a static browser app and does not perform Supabase project CRUD.
- The local `published` status is a local dashboard flag, not a public website publication state.

### CRUD risk summary

- Local storage is browser-specific and cannot be treated as the authoritative shared project record.
- Existing code warns that project changes remain in the browser only.
- This implementation is not a live multi-user CMS backend and should not be treated as a Supabase CRUD contract.

## 6) Current artwork upload and media-library implementation

### Verified repository findings

`admin/js/cms.js` implements the current media flow:
- `handleUpload(event)` reads selected image files
- allowed MIME types: PNG, JPEG, WebP, GIF
- file size limit: `250 * 1024` bytes (`250 KB`)
- files are converted to a base64 `data:` URL via `FileReader`
- upload metadata is stored locally with:
  - `id`
  - `name`
  - `path`
  - `url`
  - `size`
  - `type`
  - `uploadedAt`

The browser-local media library is built by:
- `getMediaEntries(store)`
- `renderMedia()`

Media entries aggregate:
- browser-local uploaded images in `store.media`
- project asset references from `thumbnail`, `previewImage`, and `heroImage`

Media actions include:
- upload
- preview
- copy image path
- delete

Important repository finding:
- The current media implementation saves uploaded image data as inline `data:` URLs in `localStorage`.
- This is not durable shared cloud media storage and is not a substitute for Supabase Storage.
- Repository image references are treated as read-only references; they are not uploaded or managed in the live CMS flow.

## 7) Admin, Co-admin, and Member access limitations in the current code

### Verified repository findings

`admin/js/auth.js` is the access gate. It checks the current session and then verifies the identity against `studio_staff` with:
- `auth.getUser()`
- `from("studio_staff").select("role, is_active").eq("id", userData.user.id).maybeSingle()`

The effective access policy in the code is:
- authorized if `staff.is_active === true`
- authorized if `staff.role` is `admin` or `co_admin`
- unauthorized otherwise

This means:
- `admin` and `co_admin` are the only roles currently permitted to reach the dashboard in code
- `member` is not allowed by this access check
- a signed-in user with a non-active staff record is redirected or signed out

`admin/js/cms.js` enforces capability levels further:
- `hasAdminPermission()` only returns true when `adminAccess.role === "admin"`
- `hasSettingsPermission()` returns true for `admin` and `co_admin`
- `canAccessSection(section)` restricts section access according to the role
- `requireAdminAccess()` is used for project and local workspace changes
- `requireSettingsAccess()` is used for shared settings operations

Therefore the current code explicitly treats:
- Admin: full project/admin workspace access
- Co-admin: shared settings and some limited dashboard access, but not unrestricted project maintenance compared to `admin`
- Member: not authorized for the admin dashboard in this code path

This is a repository-verified access model, but the actual database/Storage authorization boundary is still enforced by live Supabase RLS and storage policies outside the repo.

## 8) Required Supabase Storage integration

### Verified repository findings

The repository does not currently implement a Supabase Storage-backed media library for the admin dashboard. There are no tracked code paths in the repo that upload product images to a Supabase bucket, read a storage bucket, or map project records to object storage paths.

### Required integration requirements

Any Supabase integration must include:
- a clear approved Storage bucket or bucket contract
- IP-safe/public or private object access rules that align with the public website
- project image URLs or object references that can be consumed by the static site without exposing private assets
- constraints for upload file type and size
- consistent handling of `thumbnail`, `previewImage`, and `heroImage` references
- a supported publication workflow that distinguishes draft project data from live published website content

This is specifically required because the current browser-local model uses `data:` URLs and local images, which are not shared, durable, or governed by storage policies.

## 9) Public website publication requirements

### Verified repository findings

The repository docs explicitly say the public site does not load the admin local CMS data source, and the public website should not publish private or temporary placeholder work.

The current project documentation states:
- `data/projects.js` is local-only and excluded from Git
- public website source does not load it
- local `published: true` only means a project is ready for local review, not a live website publication claim
- only approved, final project records should be included in public source
- project artwork and private Google Drive originals must not be committed or treated as public assets

This means the publication workflow must be separated from the admin dashboard’s local project record. A published project must be approved and served through a valid public source before being reachable on the live site.

## 10) RLS and Storage policy risks

### Risk summary

The repository audit calls out that the current admin dashboard is static and publicly served, while policy enforcement must live in Supabase Auth/RLS and Storage rules. The tracked repo does not include those rules, so the risk here is unverified but important.

The highest-risk area is Member access to other Members’ drafts.

The risk pattern is:
- a `Member` account can be granted access to the table or storage bucket without a row-scoped rule
- the app may accidentally query by `user_id`/owner or by a global project list without a strict filter
- a member may see or alter other members’ drafts if the policy scope is too broad
- a public or shared bucket may expose images that were intended to be private or draft-only

This file intentionally does not state a policy rule that was not verified. It only records the risk that must be addressed in the live Supabase configuration before implementation.

Required pre-implementation review:
- confirm `projects` table row visibility for `admin`, `co_admin`, and `member`
- confirm whether draft rows are isolated by owner or role
- confirm whether image storage paths are private or public
- confirm whether `project_media` rows are attached to owner or project ownership
- confirm that no member can read or edit another member’s in-progress draft

## 11) Prerequisites before implementation

Before any Supabase-backed implementation is built, the following items are required:

1. Confirm the live Supabase schema for `projects` and `project_media` directly in the live project.
2. Confirm the actual Storage bucket and whether assets are private or public.
3. Confirm the live RLS rules for project visibility and edit permissions.
4. Confirm the live Storage policies for upload/download/delete permissions.
5. Confirm the exact role model for `admin`, `co_admin`, and `member` in the live database.
6. Confirm how draft visibility is scoped so a Member cannot access other Members’ drafts.
7. Confirm that the public website will only consume approved published records and public-safe media.
8. Confirm whether `categories` is an array, JSON field, or related table model.
9. Confirm whether `project_media` stores object references, URLs, or raw metadata and whether file storage is the system of record.
10. Confirm the publication pipeline: draft records, published records, and public page rendering must be distinct states.

## Conclusion

The tracked repository clearly demonstrates the current browser-local project model, project editor, and media upload workflow. It does not provide the live Supabase schema or policy contract. The implementation phase must therefore treat the live database as the source of truth and verify each field, row rule, and storage permission before mapping the repository model to Supabase.

This document intentionally separates:
- repository-verified facts
- previously supplied live Supabase findings that were not validated in the repo

No secrets, credentials, or unverified database details are included.
