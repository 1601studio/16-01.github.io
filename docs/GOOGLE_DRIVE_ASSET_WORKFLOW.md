# Google Drive and Website Asset Workflow

Google Drive remains the private master library for originals and working
files. This website does not connect to Drive and has no Drive API, backend,
or credentials. Do not assume a Drive link is publicly accessible.

## Keep private content out of Git

Keep original artwork, editable design files, project deliverables, and the
local project catalog in private storage. `.gitignore` excludes
`data/projects.js`, `assets/images/projects/`, common private asset
directories, and editable design formats. The local project catalog and
placeholder artwork are not deployed.

## Prepare approved artwork

1. Keep originals and editable files in the private Google Drive library.
2. Export approved, optimized website copies. Use WebP for photographs and
   mockups, SVG for suitable vector marks, and PNG when transparency or
   lossless detail is needed. Preserve original aspect ratios and do not
   upscale low-resolution artwork.
3. Keep project exports local for development, or place them on a separate
   public asset host configured for website use. Only use the external source
   after confirming that the approved content is intended to be public.

## Future public portfolio integration

The current GitHub Pages site intentionally works without project data or
project images and displays an empty portfolio. To publish projects later,
provide a separately accessible project-data source and public image source,
then connect them to the existing card and case-study renderer. Do not upload
private client artwork to this repository, put private Drive URLs in frontend
code, or expose drafts. Publish only projects with approved copy and artwork.

Standalone public interface images, such as icons, may live in the public
`assets/images/branding/`, `assets/images/icons/`, or `assets/images/og/`
directories. Register standalone images in `data/media.js` only when needed;
never use it as a place for private project artwork.

## Validate website assets

From the repository root, run:

```bash
node scripts/check-image-assets.js
```

The dependency-free checker validates standalone public image records,
references in local HTML, and public JavaScript syntax. It intentionally
ignores the local project catalog and private project artwork. To opt in to
validating the local-only project records while developing, run
`node scripts/check-image-assets.js --include-local-projects`.

Preview the site locally at desktop and mobile widths, and verify any future
public data/image source independently. Preserve relative paths for the site
shell and the existing GitHub Pages configuration. Never commit private Drive
files, access links, API keys, credentials, or confidential project files.
