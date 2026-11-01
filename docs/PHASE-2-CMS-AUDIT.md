# Phase 2 — Existing Admin Dashboard Code Audit

## Audit scope and result

This is a repository audit only. The shared `file_dashboard.html` snapshot
matches `admin/dashboard.html` byte-for-byte. The existing dashboard layout,
navigation, CSS, responsive behavior, login, and session handling are already
implemented and should be reused rather than recreated.

The admin area is currently an authenticated shell and static overview, not a
working CMS. No project, draft, media, staff-management, or settings CRUD
features are connected to Supabase. The only database lookup in admin code is
the current user's `studio_staff` row to determine dashboard access.

No Supabase CMS schema, Storage setup, SQL policies, or migrations are present
in tracked repository files. This audit cannot verify the live Supabase
project's schema or existing policies. It does not propose or make database,
authentication, public-site, or feature changes.

## Existing dashboard file structure

Tracked admin application files:

```text
admin/
├── dashboard.html
├── login.html
├── css/
│   └── admin.css
└── js/
    ├── auth.js
    ├── dashboard.js
    └── supabase-config.js
```

Related integration files:

| File | Purpose / tracking |
|---|---|
| `admin/js/supabase-runtime-config.js` | Generated runtime config loaded by both admin pages. It is ignored by Git and absent from a fresh checkout; the inspected local checkout currently has a generated copy. Only the Supabase URL and public publishable/legacy anon key belong here. |
| `scripts/generate-admin-supabase-config.js` | Generates the ignored admin runtime config from environment variables, accepting a publishable key or legacy anon key. |
| `.github/workflows/deploy.yml` | Generates public and admin runtime configs from Actions variables, then deploys the static site to GitHub Pages. |
| `README.md` | Documents admin setup, current staff-row requirement, placeholder functionality, public-key boundary, and client-side access-gate limitation. |
| `data/projects.js` | Ignored local-only placeholder project catalog; not loaded by admin or public pages. |
| `data/media.js` | Tracked empty catalog for standalone **public** images; not an admin media library or Storage integration. |
| `docs/PROJECT_MANAGEMENT.md` | Documents the local project-content contract, category mapping, and private artwork/public-source boundary. |

## Existing navigation and dashboard components

`admin/dashboard.html` has four sidebar links, all using in-page anchors:

| Existing link | Anchor target | What the target currently contains |
|---|---|---|
| Overview | `#overview` | Welcome copy; initial active item |
| Projects | `#projects` | Static summary card saying project management will come in a future phase |
| Media library | `#media` | Static “Coming later” card |
| Staff management | `#staff` | Static “Coming later” card |
| Drafts | None | No link, section, or view |
| Settings | None | No link, section, or view |

These are not separate pages or functional CMS views. There is no JavaScript
navigation controller or active-link update. The header remains “Overview”;
the anchor links point to summary cards rather than project/media/staff
interfaces.

Existing UI that can be reused:

- Admin sidebar, studio wordmark, public-site link, dashboard header, user
  identity and role labels, and Sign out button.
- Overview welcome section, summary-card markup, and three-column grid.
- Shared design tokens, buttons, form controls, status messages, and focus
  styles in `admin/css/admin.css`.
- Login panel, email/password fields, password visibility toggle, loading
  state, and accessible form feedback.
- Responsive dashboard layout: 248px desktop sidebar, 190px sidebar at
  widths below 860px, horizontal scrolling navigation below 620px, and
  single-column summary cards at narrower widths.
- Semantic landmarks, visible `:focus-visible` treatment, live status regions,
  and reduced-motion handling.

New CMS views should extend this shell and its responsive styles. No project
table/list/editor, media browser/uploader, drafts view, staff editor, or
settings form currently exists.

## Authentication, logout, and Supabase integration

| Area | Existing implementation |
|---|---|
| Supabase client | `admin/js/supabase-config.js` dynamically imports Supabase JS v2 from a pinned jsDelivr URL. It validates a plain HTTPS project URL and publishable or legacy anon key, then creates a browser client with session persistence, token refresh, and URL-session detection enabled. |
| Runtime configuration | Both HTML pages load the generated runtime config before their ES module. The generator and workflow inject public configuration only. A public key is not a secret and must not be replaced with a secret/service-role key. |
| Login | `admin/js/auth.js` checks an existing session, signs in with email/password, then verifies the current Auth user and queries `studio_staff` for `role` and `is_active`. Access is granted only for an active `admin` row with an ID matching the Auth user ID. |
| Unauthorized user | Existing sessions without an active admin row are signed out. A successful password sign-in without the expected staff row is also signed out. |
| Dashboard guard | `admin/js/dashboard.js` calls the same `verifyAdmin` function before showing the app and then displays the authenticated user's email and role. |
| Logout/session | The Sign out button calls `client.auth.signOut()`. A successful sign-out redirects to login; a `SIGNED_OUT` event also redirects. Sign-out failures are logged and surfaced in the dashboard status region. |
| CMS data | No admin queries or writes for project, draft, media, settings, or staff administration. No Supabase Storage calls are present. |
| Database definitions | No CMS table definitions, Storage bucket setup, policies, or migrations are included in tracked files. `README.md` states that the current staff lookup depends on existing RLS rules and that no schema/policies are created by the current foundation. |

The local project catalog has placeholder-only records, all unpublished; it
does not provide persistence or production content. The project-management
documentation says to keep project artwork private and to configure a
separately accessible, approved source before public display. Do not copy the
ignored catalog or private assets into the public site as a substitute CMS.

## Mapping to the six CMS areas

The six areas below are the approved functional scope supplied for this audit.
The repository does not specify their Supabase tables, columns, operations,
or RLS/Storage policies; the mapping identifies existing UI/data concepts
without inventing a database design.

| CMS area | Current state | Reusable parts and implementation boundary |
|---|---|---|
| **Overview** | Welcome text and static summary cards only. No Supabase metrics or recent activity. | Reuse the overview section, header, summary cards, grid, and status region. Connect read-only counts/status only after the approved data sources and existing policies are confirmed. |
| **Projects** | A placeholder summary card; no list, create/edit, validation, delete/archive, publish, or search/filter behavior. | Reuse dashboard shell, cards, buttons, forms, and project field/category conventions in `docs/PROJECT_MANAGEMENT.md` and the local catalog. Preserve the primary categories Branding, Illustration, Typography and secondary categories Poster Design, Merchandise, Editorial Design. The local catalog itself is not a CMS source. |
| **Media Library** | A placeholder card; no browsing, upload, preview, or asset management. | Reuse cards and responsive grid styles. `data/media.js` is only an empty public-image catalog. Confirm the approved media source, bucket, and current Storage policies before building data operations. |
| **Drafts** | No link, section, or workflow. | Reuse the future Projects list/editor patterns and project `published` concept. Keep drafts excluded from public output, as required by project-management documentation. |
| **Staff Management** | A placeholder card; no staff list or management actions. The existing staff lookup only authorizes the current admin. | Reuse the identity, form, button, and status components. Preserve the current access guard; staff-management actions must be enforced by existing database policies, not just hidden/shown in the UI. |
| **Settings** | No navigation, section, settings model, or persistence. | Reuse existing forms and feedback styles only after the approved scope and data source are specified. Do not assume settings are stored in Supabase or put credentials in the client. |

## Missing functionality

- Functional navigation/state for all six sections; Drafts and Settings are
  absent from the current navigation.
- Real Overview metrics and activity data.
- Project browsing, create/edit, validation, publish/draft lifecycle, and
  permitted removal/archive operations.
- Draft browsing and lifecycle controls.
- Media browsing, upload, preview, and lifecycle operations.
- Staff listing and approved account/role/active-state management.
- Defined Settings scope, form, validation, and persistence.
- Consistent per-view loading, empty, success, and error states.
- Admin tests covering authorization, data operations, failed requests, and
  responsive CMS views; no admin test files are tracked.
- A repository-visible definition of the approved Supabase CMS data contract
  and existing policy behavior. These must be confirmed from the authoritative
  Supabase project before connecting any feature; this audit does not request
  schema or policy changes.

## Security and operational risks

1. **Static hosting does not protect the dashboard source.** GitHub Pages
   serves the HTML, CSS, and JavaScript regardless of login. The login and
   dashboard checks are a client-side UI gate, not a private-content boundary.
   Every future database and Storage operation must be restricted by existing
   Supabase Auth/RLS and Storage policies.
2. **The browser role check is not authorization for future CMS operations.**
   `verifyAdmin` checks `studio_staff` on login and dashboard initialization,
   but only the database policies can enforce who may read or mutate data.
   The policies are not available in this repository for review.
3. **Staff-row visibility is a prerequisite.** The current browser lookup
   must be allowed by the existing policy for the signed-in user. A policy
   failure must not be worked around with a service-role key in the browser.
4. **Role changes are not continuously rechecked by the UI.** The dashboard
   listens for `SIGNED_OUT`, but does not periodically re-query staff status.
   This is not a replacement for policies: existing policies must deny
   operations immediately when access is revoked.
5. **Dashboard initialization errors can look like session expiry.** An error
   thrown while initializing the dashboard (including a staff lookup or
   configuration failure) is logged and redirected with the `expired` status.
   The login page then reports a session-expired message, which can misstate
   the underlying problem.
6. **Runtime config is publicly shipped.** The URL and publishable/legacy anon
   key are intended for browser use. Never place a service-role/secret key,
   database password, or other privileged credential in the generated config
   or public deployment variables.
7. **Third-party SDK availability.** The current client imports the pinned
   Supabase SDK at runtime from jsDelivr, so admin startup depends on that
   external host being reachable.

## Recommended implementation order

1. Confirm with the approved project owner the existing Supabase data contract,
   Storage configuration, and current RLS/Storage policy behavior for each
   approved staff role. Document the permitted operations. Do not modify
   schema, policies, or migrations as part of this phase.
2. Extend the existing dashboard shell with destinations/sections for
   Overview, Projects, Media Library, Drafts, Staff Management, and Settings.
   Retain the current layout, navigation styling, responsive behavior, and
   auth/logout flow.
3. Connect Overview as read-only data, with explicit loading, empty, and error
   states; verify queries using the current authorized browser session.
4. Implement Projects and Drafts using the existing project content contract
   and preserved category mapping. Ensure only approved published projects
   reach the public data source and drafts do not.
5. Implement Media Library only after the existing approved Storage path and
   policies have been verified; keep private originals/private artwork private.
6. Implement Staff Management only for approved administrative operations,
   and verify policy enforcement for each action. Do not rely on client-side
   role checks as the authorization boundary.
7. Implement Settings after its scope and persistence source are confirmed;
   never store privileged credentials in static browser code.
8. Test all views at desktop and mobile sizes, including denied access, empty
   data, failed requests, successful operations, and role revocation. Verify
   public pages remain unchanged.

## Files likely to need modification

| File | Likely future change |
|---|---|
| `admin/dashboard.html` | Add missing section containers and links using the existing shell; do not recreate the dashboard. |
| `admin/css/admin.css` | Add only required view/list/form/media styles using existing tokens and breakpoints. |
| `admin/js/dashboard.js` | Add section activation/data initialization while preserving `verifyAdmin`, logout, and session behavior. |
| New focused modules under `admin/js/` | Add only the feature-specific UI/data modules needed for the approved CMS sections. |
| `docs/PROJECT_MANAGEMENT.md` | Update the documented content-source and editing workflow after the approved Projects/Drafts integration is established. |
| `README.md` | Update setup/security instructions only if the existing deployment/local setup changes. |

Keep `admin/login.html`, `admin/js/auth.js`, `admin/js/supabase-config.js`,
the runtime-config generators, `.github/workflows/deploy.yml`, public-site
pages, and `data/media.js` unchanged unless a concrete requirement requires
modification. Any changes to authentication/session handling should be
separately justified and must preserve the current working login/logout
behavior. This audit identifies no reason to change database schema, SQL
policies, migrations, or public website files.
