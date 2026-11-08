# 16:01 Studio

Premium graphic design and illustration portfolio website.

## Tech stack

- HTML5
- CSS3
- Vanilla JavaScript
- GitHub Pages

The public website is static and has no database, authentication, build step,
or JavaScript framework. It works without a project catalog and displays a
clean empty portfolio until a separately hosted public project source is
configured. Local project data and project artwork are excluded from Git.
Standalone public image records, when needed, live in `data/media.js`.

## Project structure

```text
├── index.html             # Homepage
├── work.html              # Portfolio and category filters
├── about.html             # Studio information
├── services.html          # Services
├── contact.html           # Contact form (not connected to a sender)
├── 404.html               # Not found page
├── css/style.css          # Website styles and design tokens
├── js/main.js             # Project cards, filters and case studies
├── data/media.js          # Standalone public image catalog
├── projects/case-study.html
├── assets/images/         # Public interface assets only
├── scripts/check-image-assets.js
└── docs/GOOGLE_DRIVE_ASSET_WORKFLOW.md
```

## Asset and content workflow

Google Drive remains the private master library for originals. Never commit
the local project catalog or project artwork. To show public projects, first
configure a separately accessible project-data and image source; the static
site does not assume Google Drive files are public. Run the image checker for
public website assets:

```bash
node scripts/check-image-assets.js
```

See [the Google Drive asset workflow](docs/GOOGLE_DRIVE_ASSET_WORKFLOW.md)
for the folder structure, image recommendations, and publishing checklist.

See [project management](docs/PROJECT_MANAGEMENT.md) for the future source
contract and local preview workflow. Preserve the project's primary/secondary
category mapping and relative paths.

## Preview locally

From the repository root, run:

```bash
python3 -m http.server 8000
```

Then open `http://127.0.0.1:8000/`. All website links and asset paths are
relative, so the static site remains compatible with GitHub Pages project
sites.

## Publish on GitHub Pages

The workflow in `.github/workflows/deploy.yml` publishes the repository root
on pushes to `main` and on manual runs. In repository Settings > Pages, set
Build and deployment > Source to **GitHub Actions**. Add the public repository
variables `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` in Settings > Secrets
and variables > Actions > Variables. If either is missing or invalid, the
deployment succeeds with Supabase inactive. No build step or framework is
required.

## Optional Supabase client

During deployment, `scripts/generate-supabase-config.js` writes
`js/supabase-runtime-config.js` from those repository variables. The file is
ignored by Git, is loaded before the Supabase client, and contains only a valid
HTTPS URL and `sb_publishable_` key. Never use a Supabase secret key,
service-role key, or database password in public website code. The optional
client does not connect the contact form.

The client alone requires no database tables, Storage buckets, or Row Level
Security policies, and none are created here. Before adding a feature that
reads or writes Supabase data or Storage, define its schema and access needs,
then implement and verify least-privilege Row Level Security policies before
enabling browser access.

### Shared website colors

The admin color editor publishes the palette to all devices in the existing
`public.studio_site_settings` table's `setting_key = 'colors'` row. Before using
it, run
[`supabase/migrations/20261108000000_shared_site_palette.sql`](supabase/migrations/20261108000000_shared_site_palette.sql)
in the Supabase SQL Editor. The migration permits public read access to the
existing settings and replaces the staff insert/update policies with policies
that restrict writes to active admins in `public.studio_staff`. It preserves
the current colors row. Do not add a secret or service-role key to the website.

Once the migration is applied and the site is deployed with its Supabase
repository variables, admins can save colors in Website colors. The public
site reads the published palette on page load; refresh already-open pages to
see a newly saved palette. If the table or its policies are unavailable, the
site keeps its default CSS colors and the dashboard reports the error.

## Admin dashboard

The separate `admin/` area contains an email/password login and a
browser-local CMS workspace for projects and drafts, categories, media,
services, fonts, and website settings; custom website colors are shared through
Supabase as described above. Both pages use
`admin/js/supabase-runtime-config.js`, generated from the project's Supabase
URL and public key. This admin runtime file is intentionally ignored by Git
and is not included in a fresh local checkout.
For local testing, set the existing public repository variables in your
shell and generate the ignored runtime file before starting the local server:

```bash
SUPABASE_URL="https://your-project.supabase.co" \
SUPABASE_PUBLISHABLE_KEY="your-public-publishable-key" \
node scripts/generate-supabase-config.js
SUPABASE_URL="https://your-project.supabase.co" \
SUPABASE_PUBLISHABLE_KEY="your-public-publishable-key" \
node scripts/generate-admin-supabase-config.js
python3 -m http.server 8000
```

Then visit `http://127.0.0.1:8000/admin/login.html`. Use an existing Supabase
Auth account whose matching `public.studio_staff` row has `id` equal to the
Auth user ID, `is_active = true`, and `role = 'admin'`. The browser verifies
that row after sign-in; the dashboard does not create accounts or change
database policies. Its staff lookup must be permitted by the existing RLS
policies. No service-role key belongs in this site or in repository variables.

Most CMS edits are stored in the browser's `localStorage` under
`1601-admin-dashboard-v1`. They are local previews only: they do not update
`data/`, Supabase, GitHub, or the live website, and clearing browser data
removes them. Website colors are the exception and are published to the
shared palette table. Repository image assets are read-only; uploaded images are
browser-local and limited to 250 KB each. The dashboard cannot receive contact
form submissions because the public form has no backend; its inbox is shown as
unavailable rather than a real message feed. Staff access is read-only and
continues to rely on the existing Supabase admin check.

GitHub Pages serves static files, so the login screen is a client-side access
gate, not protection for the page source itself. The deployment workflow
generates a separate ignored admin runtime config from the same repository
variables. The admin generator accepts either a publishable key or a legacy
anon key; the existing public-site generator continues to require a
publishable key.

## Accessibility

- Semantic HTML and keyboard-accessible project cards and filters
- Visible focus indicators and meaningful image alternatives
- Reduced-motion preferences are respected

## License

All rights reserved — 16:01 Studio.
