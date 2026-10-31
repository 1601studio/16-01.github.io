# 16:01 Studio — Project Instructions

## 1. Project Overview

Build a professional portfolio website for 16:01 Studio,
a graphic design and illustration portfolio.

The website should present creative work using a premium
editorial design, strong typography, carefully composed
images, and subtle interactions.

## 2. Technology

- HTML5
- CSS3
- Vanilla JavaScript
- Git for version control
- GitHub Pages for deployment

Do not introduce React, Vue, Angular, a backend, or a
database unless explicitly requested.

Avoid unnecessary dependencies.

## 3. Design System

Background: #111310
Primary text: #F5F2EB
Accent: #C64B35
Secondary text: #B0ADA5
Borders: #34352F

Design direction:
- Premium editorial
- Minimalist
- Artistic
- Typography-led
- Asymmetrical layouts
- Generous whitespace
- Artwork-focused compositions

Do not use a generic dashboard aesthetic.

## 4. Website Pages

- Home
- Work
- Project case studies
- About
- Services
- Contact
- 404 page

Category filters belong inside the Work page.

## 5. Project Cards

Every project card must support:

- Primary image
- Secondary preview image
- Project title
- Project category
- Optional project year
- Link to the correct project destination

The primary image is visible by default.

On pointer hover, transition smoothly to the secondary image.

Use a restrained transition, approximately 300–400 ms.

Keep project titles and categories visible without hover.

The complete card should link to its project destination.

Support keyboard navigation and visible focus states.

On touchscreens, the project must remain discoverable and
clickable without hover.

Respect prefers-reduced-motion.

Do not break the card if an optional secondary image
is unavailable.

## 6. Project Category Mapping

Primary image categories:
- Branding
- Illustration
- Typography

Secondary image categories:
- Poster Design
- Merchandise
- Editorial Design

Preserve this category mapping.

Do not invent project artwork or treat unrelated projects
as the same case study.

Ask for clarification if the mapping conflicts with
individual project destinations.

## 7. Project Data

Keep project data separate from presentation code.

Each project should support:

- id
- slug
- title
- category
- categories
- thumbnail
- previewImage
- heroImage
- alt
- summary
- role
- year
- featured
- published

Use real project information when supplied.

Use clearly identified placeholders during development.

## 8. Accessibility

- Use semantic HTML.
- Provide meaningful image alternative text.
- Ensure keyboard accessibility.
- Maintain readable contrast.
- Include visible focus indicators.
- Do not rely on hover to reveal essential information.
- Respect reduced-motion preferences.

## 9. Responsive Design

Support:
- Mobile
- Tablet
- Desktop

Prevent horizontal overflow.

Use responsive image dimensions and appropriate aspect ratios.

Do not force portrait artwork into landscape crops.

## 10. Code Quality

- Keep HTML, CSS, JavaScript, and data organized.
- Use reusable components and functions.
- Use consistent naming.
- Avoid unnecessary duplication.
- Use relative paths suitable for GitHub Pages.
- Handle missing optional images gracefully.
- Do not add dependencies without justification.

## 11. Development Workflow

Work in small, verifiable stages.

Before editing:
1. Inspect the existing project files.
2. Understand the current structure.
3. Identify the files that need changes.

After editing:
1. Explain what changed.
2. Identify files created or modified.
3. Report any unresolved problems.
4. Provide clear testing instructions.

Do not overwrite unrelated work.

Do not generate the entire website in one step.

Do not invent missing assets, credentials, or contact details.

Ask before making major architectural changes.

## 12. Initial Milestone

The first milestone is to establish:

- Project structure
- CSS design tokens
- Global typography and styles
- A basic homepage
- One reusable project card with two images

Test the initial implementation before building the
remaining pages.

Do not begin the next development stage until the
current stage has been reviewed.
