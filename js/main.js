// 16:01 Studio — Main JavaScript
//
// Vanilla JavaScript, no dependencies.
//
// Responsibilities:
//   - Reusable project-card component (primary image by default, optional
//     secondary preview image cross-fades on hover / focus, ~350ms).
//   - Homepage: inject featured project cards.
//   - Work page: inject all project cards + category filtering.
//   - Case-study page: render a reusable case-study layout from a slug.

/* Resolve a project-root-relative asset path (e.g. "assets/images/x.svg")
   relative to the current document. Works from root pages and from the
   projects/ subdirectory (case studies), and on GitHub Pages project sites
   served under a repository subpath, without using root-relative "/..." paths
   (which break on project subpaths). */
const resolveAsset = (src) => {
  if (!src) return src;
  if (/^(https?:|data:|\/\/)/i.test(src)) return src;
  const projectPath = src.replace(/^\/+/, "");
  return location.pathname.endsWith("/projects/case-study.html")
    ? `../${projectPath}`
    : projectPath;
};

const getSiteProjects = () =>
  typeof projects !== "undefined" && Array.isArray(projects) ? projects : [];

const formatProjectDate = (dateValue) => {
  if (typeof dateValue !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return "";
  const date = new Date(`${dateValue}T00:00:00Z`);
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== dateValue) return "";
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC"
  }).format(date);
};

const getProjectYear = (project) => {
  if (formatProjectDate(project.completedAt)) return project.completedAt.slice(0, 4);
  return project.year || "";
};

const populateProjectFilters = (projectList) => {
  const container = document.querySelector("[data-project-filters]");
  if (!container) return;
  const assignedCategories = new Set(
    projectList.flatMap((project) => [project.category, ...(project.categories || [])]).filter(Boolean)
  );
  const categoryNames = [...assignedCategories];
  const allButton = document.createElement("button");
  allButton.type = "button";
  allButton.className = "filter__btn filter__btn--active";
  allButton.dataset.category = "all";
  allButton.setAttribute("aria-pressed", "true");
  allButton.textContent = "All";
  container.replaceChildren(allButton);
  categoryNames.forEach((name) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "filter__btn";
    button.dataset.category = name;
    button.setAttribute("aria-pressed", "false");
    button.textContent = name;
    container.append(button);
  });
};

/* ── Project card component ──────────────────────────────────────
   Builds a reusable project card as an <a> element so the whole card
   links to its case-study destination. Supports:
     - primary image (visible by default)
     - optional secondary preview image (cross-fades on hover / focus)
     - title, category, optional year
     - keyboard navigation with a visible focus state
     - graceful handling when a secondary image is missing ──────── */

function createCard(project) {
  const link = document.createElement("a");
  link.className = "card";
  link.href = `./projects/case-study.html?slug=${encodeURIComponent(project.slug)}`;
  link.ariaLabel = `View project: ${project.title}`;

  const media = document.createElement("div");
  media.className = "card__media";

  /* ── Primary image ── */
  const primary = document.createElement("img");
  primary.className = "card__image card__image--primary";
  const primaryImage = resolveAsset(project.thumbnail);
  if (primaryImage) primary.src = primaryImage;
  else primary.hidden = true;
  primary.alt = project.alt || project.title;
  primary.loading = "lazy";
  primary.decoding = "async";

  primary.onerror = () => {
    primary.hidden = true;
  };

  media.appendChild(primary);

  /* ── Secondary (optional) preview image ── */
  let hasSecondary = Boolean(project.previewImage);

  if (hasSecondary) {
    const secondary = document.createElement("img");
    secondary.className = "card__image card__image--secondary";
    secondary.src = resolveAsset(project.previewImage);
    secondary.alt = project.alt || project.title;
    secondary.loading = "lazy";
    secondary.decoding = "async";

    /* Do not break the card if the secondary image is unavailable. */
    secondary.onerror = () => {
      secondary.style.display = "none";
      hasSecondary = false;
      link.classList.add("card--no-secondary");
    };

    media.appendChild(secondary);
  } else {
    link.classList.add("card--no-secondary");
  }

  /* ── Content (always visible, not hover-reliant) ── */
  const body = document.createElement("div");
  body.className = "card__body";

  const category = document.createElement("span");
  category.className = "card__category";
  category.textContent = project.category;

  const title = document.createElement("h2");
  title.className = "card__title";
  title.textContent = project.title;

  body.appendChild(category);
  body.appendChild(title);

  const cardYear = getProjectYear(project);
  if (cardYear) {
    const year = document.createElement("span");
    year.className = "card__year";
    year.textContent = cardYear;
    body.appendChild(year);
  }

  link.appendChild(media);
  link.appendChild(body);

  return link;
}

/* Render an array of project cards into a grid container. */
function renderGrid(gridElement, projectList, emptyMessage = "No projects are available yet.") {
  gridElement.innerHTML = "";

  if (projectList.length === 0) {
    const message = document.createElement("p");
    message.className = "no-results";
    message.textContent = emptyMessage;
    gridElement.appendChild(message);
    return;
  }

  projectList.forEach((project) => {
    gridElement.appendChild(createCard(project));
  });
}

/* ── Case-study page rendering ───────────────────────────────────
   Reusable case-study layout: title, category, year, description,
   role, and an image gallery. Driven by the ?slug= query parameter. ── */

function renderCaseStudy() {
  const titleEl = document.getElementById("cs-title");
  if (!titleEl) return; /* not a case-study page */

  const categoryEl = document.getElementById("cs-category");
  const yearEl = document.getElementById("cs-year");
  const summaryEl = document.getElementById("cs-summary");
  const descriptionEl = document.getElementById("cs-description");
  const completedEl = document.getElementById("cs-completed");
  const publishedEl = document.getElementById("cs-published");
  const roleEl = document.getElementById("cs-role");
  const heroEl = document.getElementById("cs-hero");
  const galleryEl = document.getElementById("cs-gallery");
  const pageTitleEl = document.getElementById("case-study-title");

  const params = new URLSearchParams(location.search);
  const slug = params.get("slug");
  const project = getSiteProjects().find((p) => p.slug === slug && p.published);

  const setPageTitle = (text) => {
    titleEl.textContent = text;
    if (pageTitleEl) pageTitleEl.textContent = `${text} — 16:01 Studio`;
  };

  if (!project) {
    setPageTitle("Project not found");
    if (categoryEl) categoryEl.textContent = "—";
    if (yearEl) yearEl.textContent = "—";
    if (completedEl) completedEl.hidden = true;
    if (publishedEl) publishedEl.hidden = true;
    if (summaryEl)
      summaryEl.textContent =
        "This project could not be found. It may be unpublished or its slug may have changed.";
    if (descriptionEl) descriptionEl.hidden = true;
    if (roleEl) roleEl.style.display = "none";
    if (heroEl) heroEl.style.display = "none";
    if (galleryEl) galleryEl.style.display = "none";
    return;
  }

  setPageTitle(project.title);
  if (categoryEl) categoryEl.textContent = project.category || "—";
  if (yearEl) {
    yearEl.textContent = getProjectYear(project) || "—";
  }
  if (summaryEl)
    summaryEl.textContent = project.summary || "";
  if (descriptionEl) {
    descriptionEl.textContent = project.description || "";
    descriptionEl.hidden = !project.description;
  }
  const setDate = (element, label, dateValue) => {
    if (!element) return;
    const formattedDate = formatProjectDate(dateValue);
    element.hidden = !formattedDate;
    if (formattedDate) {
      element.dateTime = dateValue;
      element.textContent = `${label}: ${formattedDate}`;
    }
  };
  setDate(completedEl, "Completed", project.completedAt);
  setDate(publishedEl, "Published", project.publishedAt);
  if (roleEl) {
    roleEl.textContent = project.role || "";
    roleEl.hidden = !project.role;
  }
  const heroImage = project.heroImage || project.thumbnail;
  if (heroEl) {
    if (heroImage) {
      heroEl.src = resolveAsset(heroImage);
      heroEl.alt = project.alt || project.title;
      heroEl.hidden = false;
      heroEl.onerror = () => {
        heroEl.hidden = true;
      };
    } else {
      heroEl.hidden = true;
    }
  }

  /* ── Image gallery ── */
  if (galleryEl) {
    galleryEl.innerHTML = "";

    const images = [];
    const addImage = (src, label) => {
      if (!src) return;
      if (images.some((i) => i.src === src)) return;
      images.push({ src, label });
    };

    if (project.thumbnail && project.thumbnail !== heroImage) addImage(project.thumbnail, "Primary image");
    if (project.previewImage && project.previewImage !== heroImage) addImage(project.previewImage, "Preview image");
    galleryEl.hidden = images.length === 0;

    images.forEach((image, index) => {
      const figure = document.createElement("figure");
      figure.className = "gallery__figure";
      figure.style.paddingTop = index === 0 ? "66%" : "75%"; /* aspect wrappers */
      figure.style.position = "relative";
      figure.style.overflow = "hidden";

      const img = document.createElement("img");
      img.className = "gallery__image";
      img.src = resolveAsset(image.src);
      img.alt = image.label + " — " + (project.alt || project.title);
      img.loading = "lazy";
      img.decoding = "async";
      img.style.position = "absolute";
      img.style.inset = "0";
      img.style.width = "100%";
      img.style.height = "100%";
      img.style.objectFit = "cover";

      img.onerror = () => {
        figure.hidden = true;
      };

      const caption = document.createElement("figcaption");
      caption.textContent = image.label;

      figure.appendChild(img);
      figure.appendChild(caption);
      galleryEl.appendChild(figure);
    });
  }
}

const ADMIN_PALETTE_DEFAULTS = {
  background: "#111310",
  secondaryBackground: "#171914",
  card: "#191B17",
  accent: "#C64B35",
  headingText: "#F5F2EB",
  boxText: "#B0ADA5",
  text: "#F5F2EB",
  secondaryText: "#B0ADA5",
  border: "#34352F",
};

const applyDashboardPreview = (palette) => {
  if (!palette || typeof palette !== "object") return;
  const keys = {
    background: "--color-background",
    secondaryBackground: "--color-background-secondary",
    card: "--color-card",
    accent: "--color-accent",
    headingText: "--color-heading",
    boxText: "--color-box-text",
    text: "--color-text-primary",
    secondaryText: "--color-text-secondary",
    border: "--color-border",
  };
  if (Object.keys(keys).some((key) => !/^#[\da-f]{6}$/i.test(palette[key] || ""))) return;
  const rootStyle = document.documentElement.style;
  Object.entries(keys).forEach(([key, variable]) => rootStyle.setProperty(variable, palette[key]));
  rootStyle.setProperty("--color-surface", palette.card);
  rootStyle.setProperty("--color-accent-hover", palette.accent);
  rootStyle.setProperty("--color-focus", palette.accent);
};

const applyDashboardTypography = (fonts) => {
  if (!fonts || !Array.isArray(fonts.entries)) return;
  const rootStyle = document.documentElement.style;
  const heading = fonts.entries.find((font) => font.id === fonts.heading);
  const body = fonts.entries.find((font) => font.id === fonts.body);
  const validStack = (font) => typeof font?.stack === "string" && /^[A-Za-z0-9 ,.'&"()_-]+$/.test(font.stack);
  if (validStack(heading)) rootStyle.setProperty("--font-serif", heading.stack);
  if (validStack(body)) rootStyle.setProperty("--font-sans", body.stack);
};

const readDashboardPreview = () => {
  try {
    const stored = JSON.parse(localStorage.getItem("1601-admin-dashboard-v1") || "null");
    if (!stored || stored.version !== 1) return;
    const palette = { ...ADMIN_PALETTE_DEFAULTS, ...(stored.palette || {}) };
    applyDashboardPreview(palette);
    applyDashboardTypography(stored.fonts);
  } catch (error) {
    console.warn("Could not read the local dashboard website preview.", error);
  }
};

window.addEventListener("message", (event) => {
  if (event.origin !== window.location.origin || event.data?.type !== "1601-admin-color-preview") return;
  applyDashboardPreview(event.data.palette);
});

window.addEventListener("storage", (event) => {
  if (event.key === "1601-admin-dashboard-v1") readDashboardPreview();
});

/* ── Initialisation ────────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
  readDashboardPreview();

  /* Current year in every footer. */
  const yearEl = document.getElementById("year");
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  /* Homepage: featured project cards. */
  const featuredGrid = document.getElementById("featured-grid");
  if (featuredGrid) {
    const featured = getSiteProjects().filter(
      (project) => project.featured && project.published
    );
    renderGrid(featuredGrid, featured);
  }

  /* Work page: all published projects + category filters. */
  const workGrid = document.getElementById("work-grid");
  if (workGrid) {
    const availableProjects = getSiteProjects();
    populateProjectFilters(availableProjects.filter((project) => project.published));
    const buttons = document.querySelectorAll(".filter__btn");
    const published = availableProjects.filter((project) => project.published);
    let activeCategory = "all";

    renderGrid(workGrid, published);

    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        buttons.forEach((btn) => {
          btn.classList.remove("filter__btn--active");
          btn.setAttribute("aria-pressed", "false");
        });
        button.classList.add("filter__btn--active");
        button.setAttribute("aria-pressed", "true");

        activeCategory = button.dataset.category;

        const filtered = activeCategory === "all"
          ? published
          : published.filter((project) => [project.category, ...(project.categories || [])].includes(activeCategory));

        renderGrid(
          workGrid,
          filtered,
          activeCategory === "all" ? "No projects are available yet." : "No projects match this category."
        );
      });
    });
  }

  /* Case-study page. */
  renderCaseStudy();

  /* The contact form is not connected to a message service. */
  const contactForm = document.querySelector(".contact-form");
  const contactMessage = document.getElementById("contact-form-message");
  if (contactForm && contactMessage) {
    contactForm.addEventListener("submit", (event) => {
      event.preventDefault();
      contactMessage.textContent =
        "Your message has not been sent because this form is not connected.";
      contactMessage.style.color = "var(--color-text-secondary)";
    });
  }
});
