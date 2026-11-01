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

## Accessibility

- Semantic HTML and keyboard-accessible project cards and filters
- Visible focus indicators and meaningful image alternatives
- Reduced-motion preferences are respected

## License

All rights reserved — 16:01 Studio.
