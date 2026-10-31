(() => {
  const pageTitles = {
    overview: "Overview",
    projects: "Projects",
    categories: "Categories",
    media: "Media library",
    messages: "Messages",
    fonts: "Font library",
    services: "Services",
    "color-style": "Website color style",
    settings: "Website settings",
  };

  const escapeHTML = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);

  const imageSource = (path) => {
    if (!path) return "";
    if (/^(https?:|data:image\/)/i.test(path)) return path;
    if (path.startsWith("/")) return `..${path}`;
    return `../${path.replace(/^(?:\.\.\/)+/, "")}`;
  };

  const showToast = (message, isError = false) => {
    const region = document.getElementById("toast-region");
    if (!region) return;
    const toast = document.createElement("div");
    toast.className = `toast${isError ? " toast--error" : ""}`;
    toast.textContent = message;
    region.append(toast);
    window.setTimeout(() => toast.remove(), 4200);
  };

  const getPrimaryCategory = (project) => project.category || (project.categories || [])[0] || "Uncategorized";
  const getProjectCategories = (project) => [...new Set([project.category, ...(project.categories || [])].filter(Boolean))];
  const formatDate = (date) => {
    if (!date) return "Imported from source";
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return "Imported from source";
    return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(parsed);
  };
  const setImage = (image, path, alt) => {
    if (!path) {
      image.replaceWith(Object.assign(document.createElement("div"), { className: "no-image", innerHTML: "No image<span>Choose an image path</span>" }));
      return;
    }
    image.src = imageSource(path);
    image.alt = alt || "";
    image.addEventListener("error", () => {
      image.replaceWith(Object.assign(document.createElement("div"), { className: "no-image", innerHTML: "Image unavailable<span>Check the local asset path</span>" }));
    }, { once: true });
  };

  const chartEmpty = (title, detail) => `<div class="chart-empty"><strong>${escapeHTML(title)}</strong><span>${escapeHTML(detail)}</span></div>`;

  const renderLineChart = (container, labels, values, emptyTitle, emptyDetail) => {
    const max = Math.max(...values, 0);
    if (!values.length || max === 0) {
      container.innerHTML = chartEmpty(emptyTitle, emptyDetail);
      return;
    }
    const width = 620;
    const height = 190;
    const left = 28;
    const right = 12;
    const top = 14;
    const bottom = 28;
    const chartWidth = width - left - right;
    const chartHeight = height - top - bottom;
    const points = values.map((value, index) => {
      const x = left + (values.length === 1 ? chartWidth / 2 : (index * chartWidth) / (values.length - 1));
      const y = top + chartHeight - (value / max) * chartHeight;
      return [x, y];
    });
    const line = points.map(([x, y], index) => `${index ? "L" : "M"}${x},${y}`).join(" ");
    const area = `${line} L${points[points.length - 1][0]},${top + chartHeight} L${points[0][0]},${top + chartHeight} Z`;
    const grid = [0, 0.5, 1].map((ratio) => {
      const y = top + chartHeight * ratio;
      return `<line class="chart-gridline" x1="${left}" x2="${width - right}" y1="${y}" y2="${y}"/>`;
    }).join("");
    const marks = points.map(([x, y], index) => `<circle class="chart-point" cx="${x}" cy="${y}" r="3.5"><title>${escapeHTML(labels[index])}: ${values[index]}</title></circle>`).join("");
    const axis = labels.map((label, index) => {
      const x = left + (labels.length === 1 ? chartWidth / 2 : (index * chartWidth) / (labels.length - 1));
      return `<text class="chart-label" x="${x}" y="${height - 7}" text-anchor="middle">${escapeHTML(label)}</text>`;
    }).join("");
    const latest = values[values.length - 1];
    container.innerHTML = `<svg class="chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHTML(labels.map((label, index) => `${label}: ${values[index]}`).join(", "))}">${grid}<path class="chart-area" d="${area}"/><path class="chart-line" d="${line}"/>${marks}${axis}<text class="chart-value" x="${left}" y="${top + 8}">${latest}</text></svg>`;
  };

  const renderCategoryChart = () => {
    const target = document.getElementById("category-chart");
    if (!target) return;
    const projectsList = AdminStore.getProjects();
    const categories = AdminStore.getCategories().map((category) => ({
      name: category.name,
      count: projectsList.filter((project) => getProjectCategories(project).includes(category.name)).length,
    })).filter((category) => category.count > 0);
    const total = categories.reduce((sum, category) => sum + category.count, 0);
    if (!total) {
      target.innerHTML = chartEmpty("No category data yet", "Add categories to organize projects.");
      return;
    }
    const radius = 48;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;
    const segments = categories.map((category) => {
      const length = (category.count / total) * circumference;
      const markup = `<circle class="donut-segment" cx="60" cy="60" r="${radius}" stroke-dasharray="${length} ${circumference - length}" stroke-dashoffset="${-offset}"><title>${escapeHTML(category.name)}: ${category.count}</title></circle>`;
      offset += length;
      return markup;
    }).join("");
    const legend = categories.map((category) => `<div class="legend-item"><span class="legend-dot"></span><span>${escapeHTML(category.name)}</span><strong>${category.count}</strong></div>`).join("");
    target.innerHTML = `<div class="donut-wrap"><svg class="donut-chart" viewBox="0 0 120 120" role="img" aria-label="Project category distribution">${categories.map((category) => `<circle class="donut-track" cx="60" cy="60" r="${radius}"/>`).slice(0, 1).join("")}${segments}</svg><div class="donut-center"><strong>${total}</strong><span>ASSIGNMENTS</span></div></div><div class="chart-legend">${legend}</div>`;
  };

  const renderOverview = () => {
    const allProjects = AdminStore.getProjects();
    const categories = AdminStore.getCategories();
    const messages = AdminStore.getMessages();
    const unread = messages.filter((message) => !message.read).length;
    const published = allProjects.filter((project) => project.published).length;
    const drafts = allProjects.length - published;
    document.getElementById("stats-grid").innerHTML = [
      ["Total projects", allProjects.length, "Across all statuses", "▧"],
      ["Published", published, "In local project data", "↗"],
      ["Drafts", drafts, "Not marked published", "◷"],
      ["Categories", categories.length, "Available labels", "◈"],
      ["New messages", unread, "In this browser", "✉"],
    ].map(([label, count, foot, icon]) => `<article class="stat-card"><div class="stat-card__top"><span>${label}</span><span class="stat-icon">${icon}</span></div><strong>${count}</strong><span class="stat-card__foot">${foot}</span></article>`).join("");

    const byYear = new Map();
    allProjects.filter((project) => project.published).forEach((project) => {
      if (project.year && Number.isFinite(Number(project.year))) byYear.set(Number(project.year), (byYear.get(Number(project.year)) || 0) + 1);
    });
    const years = [...byYear.keys()].sort((a, b) => a - b).slice(-6);
    renderLineChart(
      document.getElementById("publishing-chart"),
      years.map(String),
      years.map((year) => byYear.get(year)),
      "No published project years recorded",
      "Add a project year to include a published project. The source data does not contain exact publication dates.",
    );

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setMonth(monthStart.getMonth() - 5);
    const months = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(monthStart.getFullYear(), monthStart.getMonth() + index, 1);
      return { key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`, label: new Intl.DateTimeFormat(undefined, { month: "short" }).format(date) };
    });
    const activity = AdminStore.getActivity();
    const activityCounts = months.map(({ key }) => activity.filter((event) => String(event.timestamp).slice(0, 7) === key).length);
    renderLineChart(
      document.getElementById("activity-chart"),
      months.map((month) => month.label),
      activityCounts,
      "No local activity recorded yet",
      "Edits made in this browser will appear here. Imported source projects have no change-history timestamps.",
    );
    renderCategoryChart();
    renderRecentProjects(allProjects);
    renderRecentMessages(messages);
    document.getElementById("message-count").textContent = String(unread);
    document.getElementById("message-count").hidden = unread === 0;
    document.getElementById("notification-dot").hidden = unread === 0;
  };

  const renderRecentProjects = (items) => {
    const target = document.getElementById("recent-projects");
    if (!target) return;
    const recent = [...items].sort((a, b) => {
      const timeA = new Date(a.updatedAt || `${a.year || 0}-01-01`).getTime();
      const timeB = new Date(b.updatedAt || `${b.year || 0}-01-01`).getTime();
      return timeB - timeA;
    }).slice(0, 4);
    if (!recent.length) {
      target.innerHTML = chartEmpty("No projects yet", "Add a project to start your portfolio.");
      return;
    }
    const list = document.createElement("div");
    list.className = "recent-list";
    recent.forEach((project) => {
      const row = document.createElement("div");
      row.className = "recent-row";
      const image = document.createElement("img");
      image.className = "recent-thumb";
      setImage(image, project.thumbnail, project.alt || project.title);
      const body = document.createElement("div");
      body.innerHTML = `<div class="recent-name">${escapeHTML(project.title)}</div><div class="recent-meta">${escapeHTML(getPrimaryCategory(project))} · ${escapeHTML(project.year || "Year not set")}</div><div class="recent-updated">Updated ${escapeHTML(formatDate(project.updatedAt))}</div>`;
      const badge = document.createElement("span");
      badge.className = `status-pill ${project.published ? "status-pill--published" : "status-pill--draft"}`;
      badge.textContent = project.published ? "Published" : "Draft";
      const actions = document.createElement("div");
      actions.className = "recent-row__actions";
      const edit = document.createElement("button");
      edit.type = "button";
      edit.className = "small-button";
      edit.dataset.recentEdit = String(project.id);
      edit.textContent = "Edit";
      actions.append(badge, edit);
      row.append(image, body, actions);
      list.append(row);
    });
    target.replaceChildren(list);
  };

  const renderRecentMessages = (items) => {
    const target = document.getElementById("recent-messages");
    if (!target) return;
    const recent = items.slice(0, 3);
    if (!recent.length) {
      target.innerHTML = chartEmpty("Inbox is empty", "No messages are connected or stored.");
      return;
    }
    target.innerHTML = recent.map((message) => `<div class="message-preview"><span class="message-unread-dot" ${message.read ? "hidden" : ""}></span><div><div class="message-preview__title">${escapeHTML(message.subject)}</div><div class="message-preview__meta">${escapeHTML(message.sender)} · ${escapeHTML(message.date)}</div></div><span class="status-pill ${message.read ? "" : "status-pill--unread"}">${message.read ? "Read" : "Unread"}</span></div>`).join("");
  };

  const renderServices = () => {
    const target = document.getElementById("service-list");
    if (!target) return;
    const services = AdminStore.getServices();
    if (!services.length) {
      target.innerHTML = `<div class="panel">${chartEmpty("No services yet", "Add the studio’s services to this local list.")}</div>`;
      return;
    }
    target.innerHTML = services.map((service, index) => `<article class="service-row"><span class="service-index">${String(index + 1).padStart(2, "0")}</span><div><h3>${escapeHTML(service.name)}</h3><p>${escapeHTML(service.description)}</p></div><div class="service-actions"><button class="small-button" type="button" data-edit-service="${escapeHTML(service.id)}">Edit</button><button class="small-button small-button--danger" type="button" data-delete-service="${escapeHTML(service.id)}">Delete</button></div></article>`).join("");
  };

  const setProfile = () => {
    const email = AdminStore.getSession()?.email || "Admin profile";
    const initials = email === "Admin profile" ? "16" : email.slice(0, 2).toUpperCase();
    ["profile-email", "top-email"].forEach((id) => {
      const node = document.getElementById(id);
      if (node) node.textContent = email;
    });
    ["profile-avatar", "top-avatar"].forEach((id) => {
      const node = document.getElementById(id);
      if (node) node.textContent = initials;
    });
  };

  const navigate = (page, updateHash = true) => {
    if (!pageTitles[page]) page = "overview";
    document.querySelectorAll("[data-view]").forEach((view) => { view.hidden = view.dataset.view !== page; });
    document.querySelectorAll("[data-page]").forEach((button) => {
      const active = button.dataset.page === page;
      button.classList.toggle("is-active", active);
      if (active) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
    document.getElementById("page-title").textContent = pageTitles[page];
    document.getElementById("breadcrumb-current").textContent = pageTitles[page];
    document.title = `${pageTitles[page]} — 16:01 Studio Admin`;
    if (updateHash && location.hash !== `#${page}`) history.replaceState(null, "", `#${page}`);
    if (page === "overview") renderOverview();
    if (page === "projects") window.AdminProjects?.render();
    if (page === "categories") window.AdminCategories?.render();
    if (page === "media") window.AdminMedia?.render();
    if (page === "fonts") window.AdminFonts?.render();
    if (page === "messages") window.AdminMessages?.render();
    if (page === "services") renderServices();
    if (page === "color-style") window.AdminSettings?.populateColorStyle();
    if (page === "settings") window.AdminSettings?.populate();
    const menuWasOpen = document.getElementById("sidebar").classList.contains("is-open");
    setMenuOpen(false);
    if (menuWasOpen) document.getElementById("main-content").focus();
  };

  const setMenuOpen = (open) => {
    const sidebar = document.getElementById("sidebar");
    const button = document.getElementById("menu-button");
    const shell = document.querySelector(".app-shell");
    const isMobile = window.matchMedia("(max-width: 780px)").matches;
    sidebar.classList.toggle("is-open", open && isMobile);
    shell.classList.toggle("menu-open", open && isMobile);
    sidebar.inert = isMobile && !open;
    button.setAttribute("aria-expanded", String(Boolean(open && isMobile)));
    button.setAttribute("aria-label", open && isMobile ? "Close navigation" : "Open navigation");
  };

  window.AdminUI = {
    escapeHTML, imageSource, showToast, getPrimaryCategory, getProjectCategories,
    formatDate, setImage, navigate, renderOverview, renderServices,
  };

  const initializeLogin = () => {
    const form = document.getElementById("login-form");
    if (!form) return false;
    if (AdminStore.getSession()) location.replace("index.html");
    const password = document.getElementById("login-password");
    document.getElementById("toggle-password").addEventListener("click", (event) => {
      const button = event.currentTarget;
      const show = password.type === "password";
      password.type = show ? "text" : "password";
      button.textContent = show ? "Hide" : "Show";
      button.setAttribute("aria-label", show ? "Hide password" : "Show password");
      button.setAttribute("aria-pressed", String(show));
    });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const email = String(data.get("email") || "").trim();
      const secret = String(data.get("password") || "");
      const error = document.getElementById("login-error");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || secret.length < 6) {
        error.textContent = "Enter a valid email address and a password of at least 6 characters.";
        error.hidden = false;
        return;
      }
      try {
        AdminStore.setSession(email);
        location.replace("index.html");
      } catch (saveError) {
        error.textContent = `Could not start the local session: ${saveError.message}`;
        error.hidden = false;
      }
    });
    return true;
  };

  const initializeDashboard = () => {
    if (!document.getElementById("view-overview")) return;
    if (!AdminStore.getSession()) {
      location.replace("login.html");
      return;
    }
    setProfile();
    const dateNode = document.getElementById("overview-date");
    dateNode.textContent = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(new Date()).toUpperCase();

    document.querySelectorAll("[data-page]").forEach((button) => button.addEventListener("click", () => navigate(button.dataset.page)));
    document.querySelectorAll("[data-go]").forEach((button) => button.addEventListener("click", () => navigate(button.dataset.go)));
    document.querySelectorAll("[data-action='add-project']").forEach((button) => button.addEventListener("click", () => window.AdminProjects.open()));
    document.querySelector("[data-action='add-category']").addEventListener("click", () => window.AdminCategories.open());
    document.querySelector("[data-action='add-service']").addEventListener("click", () => window.AdminServices.open());
    document.getElementById("notification-button").addEventListener("click", () => navigate("messages"));
    document.getElementById("recent-projects").addEventListener("click", (event) => {
      const edit = event.target.closest("[data-recent-edit]");
      if (!edit) return;
      const project = AdminStore.getProjects().find((item) => String(item.id) === edit.dataset.recentEdit);
      if (project) window.AdminProjects.open(project);
      else showToast("This project no longer exists.", true);
    });
    document.getElementById("profile-button").addEventListener("click", () => showToast(`Local session: ${AdminStore.getSession()?.email || "Admin"}. Authentication is not secure.`));
    document.getElementById("top-profile-button").addEventListener("click", () => navigate("settings"));
    document.getElementById("logout-button").addEventListener("click", () => {
      if (!window.confirm("Log out of this local session?")) return;
      AdminStore.clearSession();
      location.replace("login.html");
    });
    const menuButton = document.getElementById("menu-button");
    setMenuOpen(false);
    menuButton.addEventListener("click", () => {
      const isOpen = document.getElementById("sidebar").classList.contains("is-open");
      setMenuOpen(!isOpen);
      if (!isOpen) document.querySelector(".sidebar__nav [data-page]")?.focus();
    });
    document.getElementById("sidebar-close-button").addEventListener("click", () => {
      setMenuOpen(false);
      menuButton.focus();
    });
    const sidebar = document.getElementById("sidebar");
    document.addEventListener("click", (event) => {
      if (
        !sidebar.classList.contains("is-open") ||
        !(event.target instanceof Node) ||
        sidebar.contains(event.target) ||
        menuButton.contains(event.target)
      ) return;
      setMenuOpen(false);
      menuButton.focus();
    });
    document.querySelector(".notice-close")?.addEventListener("click", (event) => event.currentTarget.closest(".local-notice").remove());

    const search = document.getElementById("global-search");
    const projectSearch = document.getElementById("project-search");
    search.addEventListener("input", () => {
      projectSearch.value = search.value;
      navigate("projects");
      window.AdminProjects.render();
    });
    projectSearch.addEventListener("input", () => {
      search.value = projectSearch.value;
      window.AdminProjects.render();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)) {
        event.preventDefault();
        search.focus();
      }
      if (event.key === "Escape" && document.getElementById("sidebar").classList.contains("is-open")) {
        setMenuOpen(false);
        menuButton.focus();
      }
    });
    window.matchMedia("(max-width: 780px)").addEventListener("change", (event) => {
      if (!event.matches) setMenuOpen(false);
      else setMenuOpen(false);
    });
    document.querySelectorAll("[data-close-dialog]").forEach((button) => button.addEventListener("click", () => button.closest("dialog").close()));
    document.querySelectorAll("dialog").forEach((dialog) => dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    }));
    window.addEventListener("hashchange", () => navigate(location.hash.slice(1), false));

    window.AdminProjects.init();
    window.AdminCategories.init();
    window.AdminMedia.init();
    window.AdminMessages.init();
    window.AdminFonts.init();
    window.AdminServices.init();
    window.AdminSettings.init();
    navigate(location.hash.slice(1), false);
  };

  document.addEventListener("DOMContentLoaded", () => {
    if (!initializeLogin()) initializeDashboard();
  });
})();
