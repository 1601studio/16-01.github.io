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

Use the repository's existing GitHub Pages settings and deployment process.
No build step or deployment configuration change is required.

## Accessibility

- Semantic HTML and keyboard-accessible project cards and filters
- Visible focus indicators and meaningful image alternatives
- Reduced-motion preferences are respected

## License

All rights reserved — 16:01 Studio.
