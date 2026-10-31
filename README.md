# 16:01 Studio

Premium graphic design and illustration portfolio website.

## Tech stack

- HTML5
- CSS3
- Vanilla JavaScript (no dependencies)
- GitHub Pages for deployment

No React, Node.js, backend, or database.

## Project structure

```
saelvo-studio/
├── AGENTS.md              # Project instructions
├── README.md              # This file
├── index.html             # Homepage
├── work.html              # Portfolio with category filters
├── about.html             # About
├── services.html          # Services
├── contact.html           # Contact
├── 404.html               # Not found
├── css/
│   └── style.css          # All website styling (design tokens, reset, components, layouts)
├── js/
│   └── main.js            # Interactions, project cards, filters, case studies
├── data/
│   └── projects.js        # Project data (placeholders during development)
├── projects/
│   └── case-study.html    # Reusable case-study layout (?slug=...)
├── admin/
│   ├── index.html         # Browser-local admin dashboard
│   ├── login.html         # Demo-only session screen
│   ├── css/               # Admin design system and responsive layouts
│   └── js/                # Admin UI, local storage, and management features
└── assets/images/         # Placeholder images
```

## How to preview locally

Open any HTML file directly in a browser, or serve the folder with a simple
static server. For example, with Python 3:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000/index.html`.

All paths are relative, so the site works on GitHub Pages without a build step.

## Admin dashboard (local demo)

While the static server is running, visit `http://localhost:8000/admin/`.
The demo sign-in accepts any valid email address and a password of at least
six characters. The browser does not verify credentials; this is not secure
authentication and must not be used to protect private content.

In the admin panel, use **Website settings → Edit page content** to change the
homepage, Work, About, Services, Contact, and 404 copy. Project and service
edits also feed the portfolio pages in this browser. Keep the public pages and
dashboard open in the same browser profile; public pages refresh when local
admin data changes.

The **Font library** offers curated system-font choices for separate headings
and body text, with searchable previews. The public pages preview the saved
selection in the same browser; changing the live site's typography still
requires editing the website CSS and deploying.
Use **New font** to add a local font-family stack or **Edit** to adjust an
entry. Custom library entries are stored in this browser; font files are not
uploaded, so the selected family must already exist on the device or be added
to the site's CSS for other visitors.
The Font Library also has separate heading and body size-scale controls. These
save browser-local responsive typography token overrides for the public-page
preview; they do not edit `css/style.css` or publish changes.
Build a fully custom website palette in the dedicated **Website color style**
workspace. The preset picker is removed; directly edit the background,
secondary background, card, accent, heading, box, primary and secondary text,
and border colors, then save to preview the palette on public pages in this browser.
The embedded live website preview updates as colors are edited. After saving
custom colors, use **Preview website** to open the saved public site in a new
tab. Editing any color disables this button until the new colors are saved.
Font entries can be removed from this browser’s library, but the Remove button
is disabled when only one font remains so a typeface is always available.
The dashboard appearance is separate from the public-site color style.
Publishing still requires updating the website CSS and deploying.

Project, category, service, settings, page-copy, and demo inbox changes are
stored in the current browser's `localStorage`. The public pages read those
values in that same browser, so the dashboard provides a local site preview.
The login session uses `sessionStorage`. These changes do not modify repository
files or publish to GitHub Pages. To update the live portfolio for other
visitors, manually edit `data/projects.js` or the relevant HTML and deploy
those repository changes.

The Messages page contains a clearly labeled sample only. The public contact
form has no backend, so this dashboard cannot receive or send messages. The
Media Library can preview repository assets and store uploads locally (up to
250 KB per image); uploaded images can be selected in the project editor.
Removing a repository asset from the library does not delete its file. Clear
browser storage to reset the local demo data.

## How to publish on GitHub Pages

1. Push this repository to GitHub.
2. In the repository settings, go to **Pages**.
3. Set the build source to the `main` (or `master`) branch, root `/`.
4. Save. The site publishes to `https://<user>.github.io/<repo>/`.

Because all links use relative paths, no base-path changes are required.

## Placeholders

The project data in `data/projects.js` uses clearly identified development
placeholders (titles, descriptions, and SVG placeholder images). Replace these
with real project information and artwork as it is supplied. Do not invent
artwork or treat unrelated projects as the same case study.

## Accessibility

- Semantic HTML throughout
- Skip-to-content link
- Visible focus indicators
- Keyboard-accessible project cards and filters
- Meaningful image alternative text
- Respects `prefers-reduced-motion` (transitions disabled)

## License

All rights reserved — 16:01 Studio.
