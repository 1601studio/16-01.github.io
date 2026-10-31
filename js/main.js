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
  const path = location.pathname;
  const parts = path.split("/").filter(Boolean);
  const last = parts[parts.length - 1];
  const dirDepth = last.includes(".") ? parts.length - 1 : parts.length;
  const subDepth = Math.max(0, dirDepth - 1);
  return "../".repeat(subDepth) + projectPath;
};

/* Admin edits are a browser-local preview only; GitHub Pages files stay unchanged. */
const readSiteAdminValue = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? null : JSON.parse(raw);
  } catch (error) {
    console.warn(`Could not read browser-local admin preview data for "${key}".`, error);
    return null;
  }
};

const getSiteProjects = () => {
  const savedProjects = readSiteAdminValue("1601-admin-projects-v1");
  return Array.isArray(savedProjects) ? savedProjects : projects;
};

const applySiteAdminSettings = () => {
  const settings = readSiteAdminValue("1601-admin-settings-v1");
  if (!settings || typeof settings !== "object") return;

  const colorStyles = {
    studio: {
      background: "#111310",
      secondaryBackground: "#171914",
      card: "#191b17",
      headingText: "#F5F2EB",
      boxText: "#B0ADA5",
      text: "#F5F2EB",
      secondaryText: "#B0ADA5",
      accent: "#C64B35",
      border: "#34352F",
    },
    navy: {
      background: "#080B19",
      secondaryBackground: "#0C1129",
      card: "#141C33",
      headingText: "#F4F6FC",
      boxText: "#929DB5",
      text: "#F4F6FC",
      secondaryText: "#929DB5",
      accent: "#2563EB",
      border: "#252E48",
    },
  };
  const baseColorStyle = settings.colorPalette ? colorStyles.studio : colorStyles[settings.colorStyle];
  const savedPalette = settings.colorPalette || settings.colorPalettes?.[settings.colorStyle] || {};
  const selectedColorStyle = baseColorStyle && Object.fromEntries(
    Object.entries(baseColorStyle).map(([key, value]) => {
      const savedColor = key === "boxText" ? savedPalette.boxText || savedPalette.secondaryText : savedPalette[key];
      return [key, typeof savedColor === "string" && /^#[\da-f]{6}$/i.test(savedColor) ? savedColor : value];
    }),
  );
  if (selectedColorStyle) {
    const rootStyle = document.documentElement.style;
    rootStyle.setProperty("--color-background", selectedColorStyle.background);
    rootStyle.setProperty("--color-background-secondary", selectedColorStyle.secondaryBackground);
    rootStyle.setProperty("--color-card", selectedColorStyle.card);
    rootStyle.setProperty("--color-surface", selectedColorStyle.card);
    rootStyle.setProperty("--color-heading", selectedColorStyle.headingText);
    rootStyle.setProperty("--color-box-text", selectedColorStyle.boxText);
    rootStyle.setProperty("--color-text-primary", selectedColorStyle.text);
    rootStyle.setProperty("--color-text-secondary", selectedColorStyle.secondaryText);
    rootStyle.setProperty("--color-accent", selectedColorStyle.accent);
    rootStyle.setProperty("--color-accent-hover", selectedColorStyle.accent);
    rootStyle.setProperty("--color-border", selectedColorStyle.border);
    rootStyle.setProperty("--color-focus", selectedColorStyle.accent);
  }

  const fontStyles = {
    editorial: {
      display: 'Georgia, "Times New Roman", Times, serif',
      sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    },
    classic: {
      display: 'Georgia, "Times New Roman", Times, serif',
      sans: 'Arial, Helvetica, sans-serif',
    },
    modern: {
      display: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    },
    literary: {
      display: '"Times New Roman", Times, serif',
      sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    },
  };
  const selectedFonts = fontStyles[settings.fontStyle];
  if (selectedFonts) {
    document.documentElement.style.setProperty("--font-serif", selectedFonts.display);
    document.documentElement.style.setProperty("--font-sans", selectedFonts.sans);
  }
  const fontLibrary = {
    georgia: 'Georgia, "Times New Roman", Times, serif',
    times: '"Times New Roman", Times, serif',
    palatino: '"Palatino Linotype", "Book Antiqua", Palatino, serif',
    system: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    arial: 'Arial, Helvetica, sans-serif',
    trebuchet: '"Trebuchet MS", sans-serif',
    verdana: 'Verdana, Geneva, sans-serif',
    courier: '"Courier New", Courier, monospace',
  };
  const savedFontData = readSiteAdminValue("1601-admin-font-library-v1") || {};
  const savedFonts = [
    ...(Array.isArray(savedFontData.overrides) ? savedFontData.overrides : []),
    ...(Array.isArray(savedFontData.custom) ? savedFontData.custom : []),
  ];
  const availableFonts = new Map([
    ...Object.entries(fontLibrary).map(([id, stack]) => [id, stack]),
    ...savedFonts
      .filter((font) => font && typeof font.id === "string" && typeof font.stack === "string" && font.stack.length <= 180 && /^[a-zA-Z0-9\s,"'()._-]+$/.test(font.stack) && /[a-zA-Z]/.test(font.stack))
      .map((font) => [font.id, font.stack]),
  ]);
  const selectedHeading = availableFonts.get(settings.fontLibrary?.heading);
  const selectedBody = availableFonts.get(settings.fontLibrary?.body);
  if (selectedHeading) document.documentElement.style.setProperty("--font-serif", selectedHeading);
  if (selectedBody) document.documentElement.style.setProperty("--font-sans", selectedBody);
  const fontSizeTokens = {
    body: {
      xs: [0.5, 0.5, 2],
      sm: [0.875, 1, 1],
      base: [1, 1.5, 1.25],
      lg: [1.25, 2, 1.5],
    },
    heading: {
      xl: [1.5, 2.5, 1.75],
      "2xl": [1.75, 3, 2],
      "3xl": [2.5, 4, 4.5],
      "4xl": [6, 5, 7],
    },
  };
  Object.entries(fontSizeTokens).forEach(([role, tokens]) => {
    const scale = settings.fontLibrary?.[`${role}Scale`];
    const factor = Number.isInteger(scale) && scale >= 75 && scale <= 150 ? scale / 100 : 1;
    const formatSize = (value) => Number((value * factor).toFixed(3));
    Object.entries(tokens).forEach(([token, [minimum, fluid, maximum]]) => {
      document.documentElement.style.setProperty(`--fs-${token}-min`, `${formatSize(minimum)}rem`);
      document.documentElement.style.setProperty(`--fs-${token}-fluid`, `${formatSize(fluid)}vw`);
      document.documentElement.style.setProperty(`--fs-${token}-max`, `${formatSize(maximum)}rem`);
    });
  });

  document.querySelectorAll("[data-brand]").forEach((brand) => {
    if (settings.logo && /^(https:\/\/|\/|assets\/|data:image\/)/i.test(settings.logo)) {
      const image = document.createElement("img");
      image.className = "brand__logo-local";
      image.src = resolveAsset(settings.logo);
      image.alt = settings.websiteName || "16:01 Studio";
      brand.replaceChildren(image);
    } else {
      brand.textContent = settings.websiteName || "16:01 Studio";
    }
  });

  const pageContent = settings.pageContent || {};
  document.querySelectorAll("[data-content]").forEach((element) => {
    const value = pageContent[element.dataset.content];
    if (typeof value === "string") element.textContent = value;
  });

  const email = document.querySelector("[data-contact-email]");
  const emailRow = document.querySelector("[data-contact-email-row]");
  if (settings.contactEmail && email) {
    email.textContent = settings.contactEmail;
    email.href = `mailto:${settings.contactEmail}`;
    if (emailRow) emailRow.hidden = false;
  }

  const description = settings.seoDescription;
  const metaDescription = document.querySelector('meta[name="description"]');
  if (description && metaDescription) metaDescription.content = description;
  if (settings.seoTitle && document.getElementById("featured-grid")) document.title = settings.seoTitle;

  document.querySelectorAll("[data-site-social-links]").forEach((container) => {
    container.replaceChildren();
    [
      ["Instagram", settings.instagram],
      ["Social", settings.social],
    ].filter(([, url]) => typeof url === "string" && /^https:\/\//i.test(url))
      .forEach(([label, url]) => {
        const link = document.createElement("a");
        link.href = url;
        link.textContent = label;
        link.rel = "noopener noreferrer";
        container.append(link);
      });
  });
};

const renderSiteServices = () => {
  const storedServices = readSiteAdminValue("1601-admin-services-v1");
  if (!Array.isArray(storedServices)) return;
  document.querySelectorAll("[data-site-services]").forEach((container) => {
    container.replaceChildren();
    storedServices.forEach((service) => {
      const item = document.createElement(container.dataset.siteServices === "home" ? "div" : "article");
      item.className = container.dataset.siteServices === "home" ? "service" : "service-item";
      if (container.dataset.siteServices === "home") {
        const title = document.createElement("h3");
        title.className = "service__title";
        title.textContent = service.name;
        const description = document.createElement("p");
        description.className = "service__desc";
        description.textContent = service.description;
        item.append(title, description);
      } else {
        const meta = document.createElement("span");
        meta.className = "service-item__meta";
        meta.textContent = service.name;
        const title = document.createElement("h2");
        title.className = "service-item__title";
        title.textContent = service.name;
        const description = document.createElement("p");
        description.className = "service-item__desc";
        description.textContent = service.description;
        item.append(meta, title, description);
      }
      container.append(item);
    });
  });
};

const populateProjectFilters = (projectList) => {
  const container = document.querySelector("[data-project-filters]");
  if (!container) return;
  const assignedCategories = new Set(
    projectList.flatMap((project) => [project.category, ...(project.categories || [])]).filter(Boolean)
  );
  const storedCategories = readSiteAdminValue("1601-admin-categories-v1");
  const categoryNames = Array.isArray(storedCategories)
    ? storedCategories.map((category) => category.name).filter((name) => assignedCategories.has(name))
    : [...assignedCategories];
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

  if (project.year) {
    const year = document.createElement("span");
    year.className = "card__year";
    year.textContent = project.year;
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
    if (summaryEl)
      summaryEl.textContent =
        "This project could not be found. It may be unpublished or its slug may have changed.";
    if (roleEl) roleEl.style.display = "none";
    if (heroEl) heroEl.style.display = "none";
    if (galleryEl) galleryEl.style.display = "none";
    return;
  }

  setPageTitle(project.title);
  if (categoryEl) categoryEl.textContent = project.category || "—";
  if (yearEl) yearEl.textContent = project.year ? project.year : "—";
  if (summaryEl)
    summaryEl.textContent = project.summary || "";
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

window.addEventListener("message", (event) => {
  if (event.origin !== window.location.origin || event.data?.type !== "1601-admin-color-preview") return;
  const palette = event.data.palette;
  const keys = {
    background: "--color-background",
    secondaryBackground: "--color-background-secondary",
    card: "--color-card",
    headingText: "--color-heading",
    boxText: "--color-box-text",
    text: "--color-text-primary",
    secondaryText: "--color-text-secondary",
    accent: "--color-accent",
    border: "--color-border",
  };
  if (!palette || typeof palette !== "object" || Object.keys(keys).some((key) => !/^#[\da-f]{6}$/i.test(palette[key] || ""))) return;
  const rootStyle = document.documentElement.style;
  Object.entries(keys).forEach(([key, variable]) => rootStyle.setProperty(variable, palette[key]));
  rootStyle.setProperty("--color-surface", palette.card);
  rootStyle.setProperty("--color-accent-hover", palette.accent);
  rootStyle.setProperty("--color-focus", palette.accent);
});

/* ── Initialisation ────────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
  applySiteAdminSettings();
  renderSiteServices();

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

window.addEventListener("storage", (event) => {
  if (event.key && event.key.startsWith("1601-admin-") && event.key !== "1601-admin-session-v1") {
    location.reload();
  }
});
