# Managing portfolio projects

`data/projects.js` is a local-only working catalog and is excluded from Git.
The public website does not load it. The six `Placeholder Project` records and
`shared-placeholder-artwork.webp` are temporary development content, not
finished client work. They must not be published or copied into a public
source.

## Add or edit a project

For local project planning, add a record to the private `projects` array or
edit the existing record. Use a unique
`id` and URL-safe `slug`, a real `title`, one primary `category` (`Branding`,
`Illustration`, or `Typography`), and any applicable secondary `categories`
(`Poster Design`, `Merchandise`, or `Editorial Design`).

```js
{
  id: "sample-identity",
  slug: "sample-identity",
  title: "Sample Identity",
  category: "Branding",
  categories: [],
  thumbnail: "assets/images/projects/sample-identity-primary.webp",
  previewImage: "assets/images/projects/sample-identity-detail.webp",
  heroImage: "assets/images/projects/sample-identity-primary.webp",
  alt: "Approved description of the project image",
  summary: "Short introduction used on the project card and case study.",
  description: "Optional full case-study description.",
  role: "Art direction, identity",
  completedAt: "2026-03-15",
  publishedAt: "2026-04-02",
  featured: false,
  published: false
}
```

Keep the existing fields compatible: `thumbnail` is the primary card image,
`previewImage` is optional, and `heroImage` is shown on the case-study page.
`summary` is short copy; `description` is optional longer copy. Use meaningful
image alt text. Omit `previewImage` if no approved secondary image exists.

## Images and dates

Keep Google Drive originals and project artwork private. Project assets under
`assets/images/projects/` are excluded from Git. Never assume a Drive link is
public. Before displaying projects, configure a separate accessible project
data source and public image host, then adapt the existing card and case-study
renderer to load that source. Use approved local optimizations only for local
preview; do not commit project artwork or use a Drive URL in public records.

Set `completedAt` to the project completion date and `publishedAt` to the
date the project is published, both as valid `YYYY-MM-DD` dates. These are
optional. The card shows the completion year; a case study shows the year and
the full completion/publication dates when supplied. The older `year` field
remains supported for existing records without `completedAt`.

## Publish and preview

In the local working catalog, use `published: true` only when real copy and
approved artwork are ready for review. In the future public source, include
only approved projects; draft records must not be served publicly. Set
`featured: true` to include a published project on the homepage.

From the repository root, preview the static site:

```bash
python3 -m http.server 8000 --bind 127.0.0.1
```

Open `http://127.0.0.1:8000/`. Without a configured public project source,
Home and Work show an empty state and case-study links resolve to “Project not
found.” Before publishing website-source changes, run:

```bash
node scripts/check-image-assets.js
```

Review the changed pages at desktop and mobile widths. Publish only source and
public interface assets through the repository's configured GitHub Pages
workflow. This static site has no build step or CMS; preserve the Pages
configuration and verify the live pages after publishing.
