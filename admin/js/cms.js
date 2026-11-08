import {
  DEFAULT_PALETTE,
  FONT_SEEDS,
  createId,
  escapeHtml,
  formatBytes,
  formatDate,
  isValidColor,
  readStore,
  slugify,
  writeStore,
} from "./cms-storage.js";
import { getSupabaseClient } from "./supabase-config.js";

const TITLES = {
  overview: "Overview",
  projects: "Projects",
  drafts: "Drafts",
  categories: "Categories",
  media: "Media library",
  messages: "Messages",
  services: "Services",
  fonts: "Font library",
  colors: "Website colors",
  settings: "Website settings",
  staff: "Staff access",
};

const app = document.querySelector("#dashboard-app");
const main = document.querySelector(".dashboard-main");
const dialog = document.querySelector("#cms-dialog");
const form = document.querySelector("#cms-form");
const toast = document.querySelector("#dashboard-message");
let activeSection = "overview";
let query = "";
let projectMode = "grid";
let toastTimeout;
let adminAccess;
let sharedPalette = { ...DEFAULT_PALETTE };
let sharedPaletteError = "";

const safeImage = (source) => {
  if (typeof source !== "string" || !source.trim()) return "";
  const value = source.trim();
  if (/^data:image\/(?:png|jpeg|webp|gif);base64,/i.test(value)) return value;
  if (/^https:\/\//i.test(value)) return value;
  if (/^(?:\/|\.\/|\.\.\/)?assets\//i.test(value)) return `../${value.replace(/^(?:\/|\.\/|\.\.\/)+/, "")}`;
  return "";
};

const getStore = () => readStore();

function notify(message, error = false) {
  toast.textContent = message;
  toast.dataset.error = String(error);
  clearTimeout(toastTimeout);
  if (message) toastTimeout = setTimeout(() => { toast.textContent = ""; }, 5200);
}

function renderDrafts() {
  const store = getStore();
  const drafts = store.projects.filter((project) => !project.published && (!query || `${project.title} ${project.slug} ${project.category}`.toLowerCase().includes(query.toLowerCase())));
  const content = drafts.length ? `<div class="project-grid">${drafts.map((project) => `<article class="project-card"><div class="project-card__image-wrap">${projectImage(project)}<span class="status-pill">Draft</span></div><div class="project-card__body"><div class="project-card__meta"><span>${escapeHtml(project.category)}</span><span>${escapeHtml(project.year || "")}</span></div><h3 class="project-card__title">${escapeHtml(project.title)}</h3><p class="project-card__summary">${escapeHtml(project.summary || "No project description yet.")}</p><div class="project-card__actions"><button type="button" class="small-button" data-action="edit-project" data-id="${escapeHtml(project.id)}">Edit</button><button type="button" class="small-button" data-action="preview-project" data-id="${escapeHtml(project.id)}">Preview</button><button type="button" class="small-button" data-action="toggle-project" data-id="${escapeHtml(project.id)}">Mark published locally</button></div></div></article>`).join("")}</div>` : `<div class="empty-state empty-state--wide"><span class="empty-mark">◷</span><strong>${query ? "No drafts match your search." : "No draft projects."}</strong><p>${query ? "Try another search." : "Unpublished projects you create will be collected here."}</p>${query ? "" : actionButton("new-project", "Create a draft", "button--primary")}</div>`;
  document.querySelector("#view-drafts").innerHTML = `${pageHeader("Drafts", `${drafts.length} unpublished local project${drafts.length === 1 ? "" : "s"}.`)}<p class="local-data-note">Drafts are private to this browser workspace. “Mark published locally” does not change the live website.</p>${content}`;
}

function commit(next, activity) {
  try {
    writeStore(next, activity);
    renderAll();
    return true;
  } catch (error) {
    notify(error.message, true);
    return false;
  }
}

function pageHeader(title, description, action = "") {
  return `<div class="section-toolbar"><div><p class="eyebrow">STUDIO WORKSPACE</p><h2 class="section-title">${escapeHtml(title)}</h2><p class="section-description">${description}</p></div>${action}</div>`;
}

function actionButton(action, label, kind = "") {
  return `<button class="button ${kind}" type="button" data-action="${action}">${label}</button>`;
}

function statusPill(project) {
  return project.published
    ? '<span class="status-pill status-pill--published">Local published</span>'
    : '<span class="status-pill">Draft</span>';
}

function projectImage(project) {
  const source = safeImage(project.thumbnail || project.heroImage);
  return source
    ? `<img class="project-thumb" src="${escapeHtml(source)}" alt="${escapeHtml(project.alt || project.title)}" loading="lazy" />`
    : '<div class="project-thumb project-thumb--empty" aria-label="No project image">16:01</div>';
}

function renderOverview() {
  const store = getStore();
  const published = store.projects.filter((project) => project.published).length;
  const drafts = store.projects.length - published;
  const unread = (store.messages || []).filter((message) => !message.read).length;
  const stats = [
    ["Total projects", store.projects.length, "Across this browser workspace"],
    ["Published locally", published, "Not published to the live website"],
    ["Draft projects", drafts, "Saved for this browser only"],
    ["Categories", store.categories.length, "Primary and secondary mappings"],
    ["New messages", "—", "Unavailable · no contact backend"],
  ];
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
    return {
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      label: new Intl.DateTimeFormat(undefined, { month: "short" }).format(date),
    };
  });
  const countByMonth = (items) => months.map((month) => items.filter((item) => {
    const date = new Date(item.at);
    return !Number.isNaN(date.valueOf()) && `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}` === month.key;
  }).length);
  const chart = (values, label) => {
    const max = Math.max(1, ...values);
    return `<div class="activity-chart" role="img" aria-label="${escapeHtml(label)}">${values.map((count, index) => {
      const height = count ? Math.max(8, Math.round(count / max * 100)) : 2;
      return `<span class="activity-bar" style="--bar-height:${height}%" title="${count} in ${months[index].label}" aria-hidden="true"></span>`;
    }).join("")}</div><div class="chart-month-labels">${months.map((month) => `<span>${escapeHtml(month.label)}</span>`).join("")}</div>`;
  };
  const publishEvents = store.activity.filter((item) => item.label.startsWith("Published locally project:"));
  const publishingCounts = countByMonth(publishEvents);
  const monthlyCounts = countByMonth(store.activity);
  const categoryCounts = store.categories.map((category) => ({
    ...category,
    count: store.projects.filter((project) => project.category === category.name || (project.categories || []).includes(category.name)).length,
  }));
  const maxCategoryCount = Math.max(1, ...categoryCounts.map((category) => category.count));
  const categoryRows = categoryCounts.map((category) => `<div class="category-chart__row"><div><span>${escapeHtml(category.name)}</span><strong>${category.count}</strong></div><span class="category-chart__track"><i style="--category-width:${Math.round(category.count / maxCategoryCount * 100)}%"></i></span></div>`).join("");
  const recent = [...store.projects].sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || "")).slice(0, 4);
  const recentRows = recent.length
    ? recent.map((project) => `<div class="recent-row">${projectImage(project)}<div class="recent-row__copy"><strong>${escapeHtml(project.title)}</strong><span>${escapeHtml(project.category)} · ${statusPill(project)}</span></div><button class="icon-button" type="button" data-action="edit-project" data-id="${escapeHtml(project.id)}" aria-label="Edit ${escapeHtml(project.title)}">↗</button></div>`).join("")
    : '<div class="empty-state"><span class="empty-mark">＋</span><strong>Your portfolio starts here.</strong><p>Add a project to this browser-local workspace.</p><button class="button button--primary" type="button" data-action="new-project">Create project</button></div>';

  document.querySelector("#view-overview").innerHTML = `
    <div class="welcome-row"><div><p class="eyebrow">YOUR STUDIO, AT A GLANCE</p><h2 class="display-heading">Make room for <em>good work.</em></h2><p class="section-description">A quiet view of the content you’re shaping in this browser.</p></div>${actionButton("new-project", "＋ New project", "button--primary")}</div>
    <div class="stats-grid">${stats.map(([label, value, note]) => `<article class="stat-card"><span class="stat-card__label">${escapeHtml(label)}</span><strong>${value}</strong><span class="stat-card__note">${escapeHtml(note)}</span></article>`).join("")}</div>
    <div class="dashboard-grid dashboard-grid--analytics">
      <article class="panel activity-panel"><div class="panel-heading"><div><p class="eyebrow">LOCAL PUBLISH ACTIONS</p><h3>Publishing activity</h3></div><span class="panel-note">Last six months</span></div>${chart(publishingCounts, "Locally published projects by month")}<p class="chart-note">Local status changes only · never a live-site publish.</p></article>
      <article class="panel"><div class="panel-heading"><div><p class="eyebrow">PROJECT CATEGORIES</p><h3>Portfolio distribution</h3></div><span class="panel-note">${store.projects.length} local projects</span></div><div class="category-chart">${categoryRows || '<p class="chart-note">Add categories to see a distribution.</p>'}</div><p class="chart-note">Primary and secondary image mappings are counted separately.</p></article>
      <article class="panel activity-panel"><div class="panel-heading"><div><p class="eyebrow">LOCAL CHANGE LOG</p><h3>Monthly portfolio activity</h3></div><span class="panel-note">Recent browser edits</span></div>${chart(monthlyCounts, "Portfolio edits by month")}<p class="chart-note">Includes changes saved in this browser workspace.</p></article>
      <article class="panel"><div class="panel-heading"><div><p class="eyebrow">INBOX</p><h3>Messages</h3></div><button class="text-button" type="button" data-go="messages">Open inbox ↗</button></div><div class="message-empty"><span class="message-icon">✉</span><strong>${unread ? `${unread} unread demo messages` : "No connected inbox"}</strong><p>The public contact form has no message backend. Messages cannot be received here.</p></div></article>
    </div>
    <article class="panel recent-panel"><div class="panel-heading"><div><p class="eyebrow">RECENTLY EDITED</p><h3>Projects</h3></div><button class="text-button" type="button" data-go="projects">View projects ↗</button></div><div class="recent-list">${recentRows}</div></article>`;
}

function projectFilters(store) {
  const categoryOptions = store.categories.map((category) => `<option value="${escapeHtml(category.name)}">${escapeHtml(category.name)}</option>`).join("");
  return `<div class="filter-toolbar">
    <label class="select-wrap"><span class="visually-hidden">Filter by category</span><select id="project-category-filter"><option value="">All categories</option>${categoryOptions}</select></label>
    <label class="select-wrap"><span class="visually-hidden">Filter by status</span><select id="project-status-filter"><option value="">All statuses</option><option value="published">Published locally</option><option value="draft">Draft</option></select></label>
    <div class="view-switch" role="group" aria-label="Project view"><button type="button" data-project-mode="grid" aria-pressed="${projectMode === "grid"}" class="${projectMode === "grid" ? "is-selected" : ""}" aria-label="Grid view">▦</button><button type="button" data-project-mode="table" aria-pressed="${projectMode === "table"}" class="${projectMode === "table" ? "is-selected" : ""}" aria-label="Table view">☷</button></div>
  </div>`;
}

function renderProjects() {
  const store = getStore();
  const filterCategory = document.querySelector("#project-category-filter")?.value || "";
  const filterStatus = document.querySelector("#project-status-filter")?.value || "";
  const projects = store.projects.filter((project) => {
    const text = `${project.title} ${project.slug} ${project.category} ${(project.categories || []).join(" ")}`.toLowerCase();
    return (!query || text.includes(query.toLowerCase()))
      && (!filterCategory || project.category === filterCategory || (project.categories || []).includes(filterCategory))
      && (!filterStatus || Boolean(project.published) === (filterStatus === "published"));
  });
  const cards = projects.length ? projects.map((project) => `<article class="project-card">
    <div class="project-card__image-wrap">${projectImage(project)}${statusPill(project)}</div>
    <div class="project-card__body"><div class="project-card__meta"><span>${escapeHtml(project.category)}</span><span>${escapeHtml(project.year || (project.completedAt || "").slice(0, 4))}</span></div><h3 class="project-card__title">${escapeHtml(project.title)}</h3><p class="project-card__summary">${escapeHtml(project.summary || "No project description yet.")}</p><div class="project-card__actions"><button type="button" class="small-button" data-action="preview-project" data-id="${escapeHtml(project.id)}">Preview</button><button type="button" class="small-button" data-action="edit-project" data-id="${escapeHtml(project.id)}">Edit</button><button type="button" class="small-button" data-action="toggle-project" data-id="${escapeHtml(project.id)}">${project.published ? "Unpublish" : "Publish"}</button><button type="button" class="small-button small-button--danger" data-action="delete-project" data-id="${escapeHtml(project.id)}">Delete</button></div></div>
  </article>`).join("") : `<div class="empty-state empty-state--wide"><span class="empty-mark">${query ? "⌕" : "＋"}</span><strong>${query ? "No projects match that search." : "No projects yet."}</strong><p>${query ? "Try another title or category." : "Create a project to start organizing your portfolio."}</p>${query ? "" : actionButton("new-project", "Create first project", "button--primary")}</div>`;
  const table = projects.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>Project</th><th>Category</th><th>Status</th><th>Updated</th><th><span class="visually-hidden">Actions</span></th></tr></thead><tbody>${projects.map((project) => `<tr><td><span class="table-project">${projectImage(project)}<strong>${escapeHtml(project.title)}</strong></span></td><td>${escapeHtml(project.category)}</td><td>${statusPill(project)}</td><td>${formatDate(project.updatedAt)}</td><td><button class="small-button" type="button" data-action="edit-project" data-id="${escapeHtml(project.id)}">Edit</button></td></tr>`).join("")}</tbody></table></div>` : `<div class="empty-state empty-state--wide"><strong>No projects to show.</strong><p>Change your search or filters, or add a project.</p></div>`;
  document.querySelector("#view-projects").innerHTML = `${pageHeader("Projects", `${store.projects.length} project${store.projects.length === 1 ? "" : "s"} · local browser data`, actionButton("new-project", "＋ New project", "button--primary"))}<p class="local-data-note">“Publish” changes local preview status only; it does not publish to the live website.</p>${projectFilters(store)}<div class="${projectMode === "grid" ? "project-grid" : ""}">${projectMode === "grid" ? cards : table}</div>`;
  bindProjectFilters();
}

function bindProjectFilters() {
  ["project-category-filter", "project-status-filter"].forEach((id) => {
    document.getElementById(id)?.addEventListener("change", renderProjects);
  });
}

function renderCategories() {
  const store = getStore();
  const cards = store.categories.map((category) => {
    const count = store.projects.filter((project) => project.category === category.name || (project.categories || []).includes(category.name)).length;
    return `<article class="category-card"><div class="category-card__top"><span class="category-mark">${category.type === "primary" ? "P" : "S"}</span><span class="status-pill">${category.type === "primary" ? "Primary image" : "Secondary image"}</span></div><h3>${escapeHtml(category.name)}</h3><p>${escapeHtml(category.description || "No description added.")}</p><span class="category-count">${count} assigned project${count === 1 ? "" : "s"}</span><div class="inline-actions"><button class="small-button" type="button" data-action="edit-category" data-id="${escapeHtml(category.id)}">Edit</button><button class="small-button small-button--danger" type="button" data-action="delete-category" data-id="${escapeHtml(category.id)}" ${count ? "disabled title=\"Reassign projects before deleting this category\"" : ""}>Delete</button></div></article>`;
  }).join("");
  document.querySelector("#view-categories").innerHTML = `${pageHeader("Categories", "Keep primary and secondary image categories distinct.", actionButton("new-category", "＋ Add category", "button--primary"))}<div class="mapping-note"><span><strong>Primary images</strong>Branding · Illustration · Typography</span><span><strong>Secondary images</strong>Poster Design · Merchandise · Editorial Design</span></div><div class="category-grid">${cards}</div>`;
}

function getMediaEntries(store) {
  const entries = store.media.map((item) => ({ ...item, localUpload: true }));
  const known = new Set(entries.map((item) => item.path));
  store.projects.forEach((project) => [project.thumbnail, project.previewImage, project.heroImage].filter(Boolean).forEach((path) => {
    if (!known.has(path)) {
      known.add(path);
      entries.push({ id: `project-${project.id}-${path}`, path, name: path.split("/").pop(), url: safeImage(path), size: null, width: null, height: null, localUpload: false });
    }
  }));
  return entries;
}

function renderMedia() {
  const store = getStore();
  const entries = getMediaEntries(store).filter((item) => !query || `${item.name} ${item.path}`.toLowerCase().includes(query.toLowerCase()));
  const cards = entries.map((item) => `<article class="media-card"><div class="media-card__preview">${item.url ? `<img src="${escapeHtml(item.url)}" alt="${escapeHtml(item.name)}" loading="lazy" />` : '<span>No preview</span>'}</div><div class="media-card__body"><strong title="${escapeHtml(item.name)}">${escapeHtml(item.name || "Untitled image")}</strong><span>${item.width && item.height ? `${item.width} × ${item.height} · ` : ""}${item.size ? formatBytes(item.size) : item.localUpload ? "Size unavailable" : "Repository asset"}</span><code title="${escapeHtml(item.path)}">${escapeHtml(item.path)}</code><div class="inline-actions"><button class="small-button" type="button" data-action="copy-media" data-id="${escapeHtml(item.id)}">Copy path</button>${item.localUpload ? `<button class="small-button small-button--danger" type="button" data-action="delete-media" data-id="${escapeHtml(item.id)}">Remove</button>` : '<span class="asset-readonly">Source asset · read only</span>'}</div></div></article>`).join("");
  document.querySelector("#view-media").innerHTML = `${pageHeader("Media library", "Local uploads stay in this browser. Repository assets are read-only.", '<label class="button button--primary upload-button">＋ Upload images<input id="media-upload" type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple /></label>')}<div class="upload-guidance">Images up to 250 KB each · supported formats: PNG, JPEG, WebP, GIF</div><div class="media-grid">${cards || `<div class="empty-state empty-state--wide"><span class="empty-mark">▤</span><strong>${query ? "No images match your search." : "No images in the library yet."}</strong><p>Upload an image or add a project image path.</p>${query ? "" : '<label class="button button--primary upload-button">Upload first image<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple /></label>'}</div>`}</div>`;
  document.querySelector("#media-upload")?.addEventListener("change", handleUpload);
  document.querySelector('#view-media input[type="file"]')?.addEventListener("change", handleUpload);
}

function renderMessages() {
  const store = getStore();
  const messages = store.messages || [];
  const shown = messages.filter((message) => !query || `${message.sender} ${message.subject} ${message.body}`.toLowerCase().includes(query.toLowerCase()));
  const content = shown.length ? shown.map((message) => `<article class="inbox-row ${message.read ? "" : "is-unread"}"><span class="inbox-dot" aria-hidden="true"></span><div><div class="inbox-row__heading"><strong>${escapeHtml(message.sender)}</strong><time>${formatDate(message.date)}</time></div><h3>${escapeHtml(message.subject)}</h3><p>${escapeHtml(message.body)}</p><span class="demo-label">DEMO SAMPLE · NOT A CONTACT SUBMISSION</span><div class="inline-actions"><button class="small-button" type="button" data-action="toggle-message" data-id="${escapeHtml(message.id)}">Mark ${message.read ? "unread" : "read"}</button><button class="small-button small-button--danger" type="button" data-action="delete-message" data-id="${escapeHtml(message.id)}">Delete sample</button></div></div></article>`).join("") : `<div class="empty-state"><span class="empty-mark">✉</span><strong>${query ? "No messages match your search." : "Your inbox is not connected."}</strong><p>The website contact form has no backend, so this dashboard cannot receive submissions. No real messages are shown.</p></div>`;
  document.querySelector("#view-messages").innerHTML = `${pageHeader("Messages", "Inbox preview · no contact backend is connected.")}<div class="message-connection-note"><strong>Contact form status</strong><span>Not connected — website submissions are not delivered to this dashboard.</span></div><div class="inbox-list">${content}</div>`;
}

function renderServices() {
  const store = getStore();
  const services = store.services.filter((service) => !query || `${service.name} ${service.description}`.toLowerCase().includes(query.toLowerCase()));
  document.querySelector("#view-services").innerHTML = `${pageHeader("Services", "Manage the offerings shown in this browser workspace.", actionButton("new-service", "＋ Add service", "button--primary"))}<p class="local-data-note">Service edits are local only and are not published to the public HTML.</p><div class="service-grid">${services.map((service) => `<article class="service-admin-card"><span class="service-index">${String(store.services.indexOf(service) + 1).padStart(2, "0")}</span><h3>${escapeHtml(service.name)}</h3><p>${escapeHtml(service.description)}</p><div class="inline-actions"><button class="small-button" type="button" data-action="edit-service" data-id="${escapeHtml(service.id)}">Edit</button><button class="small-button small-button--danger" type="button" data-action="delete-service" data-id="${escapeHtml(service.id)}">Delete</button></div></article>`).join("") || '<div class="empty-state empty-state--wide"><strong>No services yet.</strong><p>Add a service to begin.</p></div>'}</div>`;
}

function renderFonts() {
  const store = getStore();
  const fonts = store.fonts.entries.filter((font) => !query || `${font.name} ${font.style} ${font.note}`.toLowerCase().includes(query.toLowerCase()));
  const options = store.fonts.entries.map((font) => `<option value="${escapeHtml(font.id)}">${escapeHtml(font.name)}</option>`).join("");
  const scale = (type) => `<label class="scale-control"><span>${type === "heading" ? "Heading" : "Body"} size <output>${store.fonts[`${type}Scale`]}%</output></span><input type="range" min="75" max="150" step="5" value="${store.fonts[`${type}Scale`]}" data-font-scale="${type}" /></label>`;
  document.querySelector("#view-fonts").innerHTML = `${pageHeader("Font library", "Assign device fonts to headings and body copy.", actionButton("new-font", "＋ New font", "button--primary"))}<div class="font-pair panel"><div><p class="eyebrow">CURRENT TYPE PAIRING</p><h3>Choose where fonts are used</h3><p class="panel-note">Fonts must be installed on the visitor’s device or configured in the website CSS.</p></div><label class="field"><span>Headings</span><select data-font-role="heading">${options}</select></label><label class="field"><span>Body text</span><select data-font-role="body">${options}</select></label><div class="type-specimen"><strong style="font-family:${escapeHtml(store.fonts.entries.find((font) => font.id === store.fonts.heading)?.stack || "Georgia")};font-size:${store.fonts.headingScale}%">Form follows feeling.</strong><p style="font-family:${escapeHtml(store.fonts.entries.find((font) => font.id === store.fonts.body)?.stack || "system-ui")};font-size:${store.fonts.bodyScale}%">Careful words. Considered work. 16:01 Studio.</p></div>${scale("heading")}${scale("body")}</div><p class="local-data-note">Font files are not uploaded. Font settings are saved in this browser only.</p><div class="font-grid">${fonts.map((font) => `<article class="font-card"><div class="font-card__specimen" style="font-family:${escapeHtml(font.stack)}">Ag</div><div class="font-card__details"><div class="font-card__heading"><h3>${escapeHtml(font.name)}</h3><span>${escapeHtml(font.style)}</span></div><p>${escapeHtml(font.note || "No notes")}</p><code>${escapeHtml(font.stack)}</code><div class="font-card__roles">${store.fonts.heading === font.id ? '<span>Heading</span>' : ""}${store.fonts.body === font.id ? '<span>Body</span>' : ""}</div><div class="inline-actions"><button class="small-button" type="button" data-action="edit-font" data-id="${escapeHtml(font.id)}">Edit</button>${font.builtIn ? '<span class="asset-readonly">Built in</span>' : `<button class="small-button small-button--danger" type="button" data-action="delete-font" data-id="${escapeHtml(font.id)}" ${store.fonts.entries.length <= 1 ? "disabled" : ""}>Remove</button>`}</div></div></article>`).join("")}</div>`;
  document.querySelectorAll("[data-font-role]").forEach((select) => {
    select.value = store.fonts[select.dataset.fontRole];
    select.addEventListener("change", () => updateFonts({ [select.dataset.fontRole]: select.value }, `Updated ${select.dataset.fontRole} typeface`));
  });
  document.querySelectorAll("[data-font-scale]").forEach((input) => input.addEventListener("change", () => updateFonts({ [`${input.dataset.fontScale}Scale`]: Number(input.value) }, `Updated ${input.dataset.fontScale} text size`)));
}

function renderColors() {
  const labels = {
    background: "Primary background",
    secondaryBackground: "Secondary background",
    card: "Card background",
    accent: "Accent",
    headingText: "Heading text",
    boxText: "Box text",
    text: "Primary text",
    secondaryText: "Secondary text",
    border: "Borders & dividers",
  };
  const status = sharedPaletteError
    ? `<p class="local-data-note" role="alert">${escapeHtml(sharedPaletteError)}</p>`
    : '<p class="local-data-note">Unsaved edits preview here. Saving publishes these colors for all devices.</p>';
  document.querySelector("#view-colors").innerHTML = `${pageHeader("Website colors", "Preview and publish a shared site palette.")}<div class="color-workspace panel"><div class="panel-heading"><div><p class="eyebrow">LIVE WEBSITE PREVIEW</p><h3>See the palette in context</h3></div><a class="text-button" href="../index.html" target="_blank" rel="noopener noreferrer">Open website ↗</a></div><iframe id="website-color-live-preview" title="Live preview of the public website colors" src="../index.html"></iframe><div class="palette-fields">${Object.entries(labels).map(([key, label]) => `<label class="color-field"><span><i data-swatch="${key}" style="--swatch:${escapeHtml(sharedPalette[key])}"></i>${escapeHtml(label)}</span><input type="color" value="${escapeHtml(sharedPalette[key])}" data-palette-color="${key}" /></label>`).join("")}</div>${status}<div class="form-actions"><button class="button button--primary" type="button" data-action="save-palette">Save colors for all devices</button></div></div>`;
  const frame = document.querySelector("#website-color-live-preview");
  frame.addEventListener("load", () => {
    const palette = Object.fromEntries([...document.querySelectorAll("[data-palette-color]")].map((field) => [field.dataset.paletteColor, field.value]));
    sendPalette(palette);
  });
  document.querySelectorAll("[data-palette-color]").forEach((input) => input.addEventListener("input", (event) => {
    const swatch = document.querySelector(`[data-swatch="${event.currentTarget.dataset.paletteColor}"]`);
    swatch.style.setProperty("--swatch", event.currentTarget.value);
    const palette = Object.fromEntries([...document.querySelectorAll("[data-palette-color]")].map((field) => [field.dataset.paletteColor, field.value]));
    sendPalette(palette);
  }));
}

function renderSettings() {
  const settings = getStore().settings;
  const fields = [
    ["websiteName", "Website name", "text"],
    ["logo", "Logo path or HTTPS URL", "text"],
    ["heroHeadline", "Homepage headline", "text"],
    ["heroDescription", "Homepage description", "textarea"],
    ["contactEmail", "Contact email", "email"],
    ["instagram", "Instagram URL", "url"],
    ["social", "Other social URL", "url"],
    ["footerDescription", "Footer description", "textarea"],
    ["seoTitle", "SEO title", "text"],
    ["seoDescription", "SEO description", "textarea"],
  ];
  document.querySelector("#view-settings").innerHTML = `${pageHeader("Website settings", "Edit the values you may want to apply to the static site.")}<div class="settings-grid"><form id="website-settings-form" class="settings-form panel"><div class="panel-heading"><div><p class="eyebrow">SITE PROFILE</p><h3>Brand and page details</h3></div></div>${fields.map(([name, label, type]) => `<label class="field"><span>${escapeHtml(label)}</span>${type === "textarea" ? `<textarea name="${name}" rows="3">${escapeHtml(settings[name] || "")}</textarea>` : `<input name="${name}" type="${type}" value="${escapeHtml(settings[name] || "")}" maxlength="${name === "seoTitle" ? 70 : 300}" />`}</label>`).join("")}<div class="form-actions"><span class="local-data-note">Browser-local only</span><button class="button button--primary" type="submit">Save settings</button></div></form><aside class="panel settings-guidance"><p class="eyebrow">STATIC HOSTING</p><h3>Local changes stay local.</h3><p>GitHub Pages cannot write browser edits back to the repository. To publish, update the matching HTML or data source and deploy it.</p><div class="settings-detail"><span>Project/media backend</span><strong>Not connected</strong></div><div class="settings-detail"><span>Contact messages</span><strong>Not connected</strong></div><div class="settings-detail"><span>Persistence</span><strong>This browser</strong></div><div class="settings-detail"><span>Authentication</span><strong>Supabase admin gate</strong></div></aside></div>`;
}

function renderStaff() {
  const email = adminAccess?.user?.email || "Signed-in administrator";
  const role = adminAccess?.role || "admin";
  document.querySelector("#view-staff").innerHTML = `${pageHeader("Staff access", "Administrator identity and access status.")}<div class="staff-layout"><article class="panel staff-profile"><div class="profile-avatar profile-avatar--large">16</div><div><p class="eyebrow">VERIFIED SESSION</p><h3>${escapeHtml(email)}</h3><span class="status-pill status-pill--published">${escapeHtml(role)} · active</span></div></article><aside class="panel settings-guidance"><p class="eyebrow">ACCESS MANAGEMENT</p><h3>Staff administration stays protected.</h3><p>This dashboard preserves the existing Supabase admin gate. Staff accounts and roles cannot be safely edited here: the CMS schema and row-level policies have not been approved or connected.</p><div class="settings-detail"><span>Signed-in account</span><strong>${escapeHtml(email)}</strong></div><div class="settings-detail"><span>Verified role</span><strong>${escapeHtml(role)}</strong></div><div class="settings-detail"><span>Account changes</span><strong>Supabase admin setup</strong></div></aside></div>`;
}

function renderAll() {
  renderOverview();
  renderProjects();
  renderDrafts();
  renderCategories();
  renderMedia();
  renderMessages();
  renderServices();
  renderFonts();
  renderColors();
  renderSettings();
  renderStaff();
  const unread = (getStore().messages || []).filter((message) => !message.read).length;
  const count = document.querySelector("#unread-count");
  count.hidden = unread === 0;
  count.textContent = unread ? String(unread) : "";
  document.querySelector("#header-notification-dot").hidden = unread === 0;
  document.querySelectorAll(".sidebar-link").forEach((link) => {
    const selected = link.dataset.section === activeSection;
    link.classList.toggle("is-active", selected);
    if (selected) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
}

function navigate(section) {
  if (!TITLES[section]) return;
  activeSection = section;
  document.querySelectorAll("[data-view]").forEach((view) => { view.hidden = view.dataset.view !== section; });
  document.querySelector("#page-title").textContent = TITLES[section];
  document.querySelector("#breadcrumb-current").textContent = TITLES[section];
  const search = document.querySelector("#section-search");
  search.value = "";
  query = "";
  document.querySelector(".dashboard-main").classList.toggle("searchable", ["projects", "drafts", "media", "messages", "services", "fonts"].includes(section));
  renderAll();
}

function showDialog(title, body, submitLabel = "Save changes") {
  delete form.dataset.previewOnly;
  form.innerHTML = `<div class="dialog-heading"><div><p class="eyebrow">LOCAL WORKSPACE</p><h2 id="dialog-title">${escapeHtml(title)}</h2></div><button class="icon-button" type="button" data-close-dialog aria-label="Close dialog">×</button></div>${body}<div class="form-actions"><button class="button button--quiet" type="button" data-close-dialog>Cancel</button><button class="button button--primary" type="submit">${escapeHtml(submitLabel)}</button></div>`;
  dialog.showModal();
  form.querySelector("input:not([type=hidden]), textarea, select")?.focus();
}

function openProject(project = null) {
  const store = getStore();
  const primary = store.categories.filter((category) => category.type === "primary");
  const secondary = store.categories.filter((category) => category.type === "secondary");
  const categories = (items, selected = []) => items.map((category) => `<label class="choice-field"><input type="checkbox" name="categories" value="${escapeHtml(category.name)}" ${selected.includes(category.name) ? "checked" : ""} /><span>${escapeHtml(category.name)}</span></label>`).join("");
  showDialog(project ? "Edit project" : "New project", `
    <input type="hidden" name="id" value="${escapeHtml(project?.id || "")}" />
    <div class="field-grid"><label class="field"><span>Project title</span><input name="title" required maxlength="120" value="${escapeHtml(project?.title || "")}" /></label><label class="field"><span>Slug</span><input name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" maxlength="80" value="${escapeHtml(project?.slug || "")}" /><small>Lowercase letters, numbers, and hyphens.</small></label></div>
    <div class="field-grid"><label class="field"><span>Primary image category</span><select name="category" required>${primary.map((item) => `<option value="${escapeHtml(item.name)}" ${project?.category === item.name ? "selected" : ""}>${escapeHtml(item.name)}</option>`).join("")}</select></label><label class="field"><span>Year</span><input name="year" type="number" min="1900" max="2100" value="${escapeHtml(project?.year || "")}" /></label></div>
    <fieldset class="field"><legend>Secondary image categories</legend><div class="choice-grid">${categories(secondary, project?.categories || [])}</div><small>These categories describe the optional secondary project image.</small></fieldset>
    <div class="field-grid"><label class="field"><span>Primary image path</span><input name="thumbnail" required maxlength="500" placeholder="assets/images/..." value="${escapeHtml(project?.thumbnail || "")}" /></label><label class="field"><span>Secondary preview image path</span><input name="previewImage" maxlength="500" placeholder="Optional" value="${escapeHtml(project?.previewImage || "")}" /></label></div>
    <label class="field"><span>Case-study hero image path</span><input name="heroImage" maxlength="500" placeholder="Uses primary image if blank" value="${escapeHtml(project?.heroImage || "")}" /></label>
    <label class="field"><span>Image alternative text</span><input name="alt" required maxlength="250" value="${escapeHtml(project?.alt || "")}" /></label>
    <label class="field"><span>Short description</span><textarea name="summary" rows="3" maxlength="1000" required>${escapeHtml(project?.summary || "")}</textarea></label>
    <label class="field"><span>Full case-study description</span><textarea name="description" rows="4" maxlength="4000">${escapeHtml(project?.description || "")}</textarea></label>
    <div class="field-grid"><label class="field"><span>Role</span><input name="role" maxlength="120" value="${escapeHtml(project?.role || "")}" /></label><label class="field"><span>Completed date</span><input name="completedAt" type="date" value="${escapeHtml(project?.completedAt || "")}" /></label></div>
    <label class="field checkbox-field"><input name="featured" type="checkbox" ${project?.featured ? "checked" : ""} /><span>Feature on homepage preview</span></label>
    <label class="field checkbox-field"><input name="published" type="checkbox" ${project?.published ? "checked" : ""} /><span>Mark published locally <small>This does not publish the project to the website.</small></span></label>
    <p class="local-data-note">Project changes are saved in this browser. No project backend is connected.</p>`, project ? "Save project" : "Create project");
  form.dataset.formKind = "project";
  form.elements.title.addEventListener("input", () => {
    if (!project) form.elements.slug.value = slugify(form.elements.title.value);
  });
}

function openCategory(category = null) {
  showDialog(category ? "Edit category" : "Add category", `
    <input type="hidden" name="id" value="${escapeHtml(category?.id || "")}" />
    <label class="field"><span>Category name</span><input name="name" required maxlength="60" value="${escapeHtml(category?.name || "")}" /></label>
    <label class="field"><span>Image mapping</span><select name="type" required><option value="primary" ${category?.type !== "secondary" ? "selected" : ""}>Primary image category</option><option value="secondary" ${category?.type === "secondary" ? "selected" : ""}>Secondary image category</option></select><small>Primary mapping: Branding, Illustration, Typography. Secondary mapping: Poster Design, Merchandise, Editorial Design.</small></label>
    <label class="field"><span>Description</span><textarea name="description" rows="3" maxlength="240">${escapeHtml(category?.description || "")}</textarea></label>
    <p class="local-data-note">Existing assigned categories cannot be deleted until projects are reassigned.</p>`);
  form.dataset.formKind = "category";
}

function openService(service = null) {
  showDialog(service ? "Edit service" : "Add service", `
    <input type="hidden" name="id" value="${escapeHtml(service?.id || "")}" />
    <label class="field"><span>Service name</span><input name="name" required maxlength="80" value="${escapeHtml(service?.name || "")}" /></label>
    <label class="field"><span>Description</span><textarea name="description" rows="4" required maxlength="400">${escapeHtml(service?.description || "")}</textarea></label>
    <p class="local-data-note">Service changes stay in this browser.</p>`);
  form.dataset.formKind = "service";
}

function openFont(font = null) {
  showDialog(font ? `Edit ${font.name}` : "New font", `
    <input type="hidden" name="id" value="${escapeHtml(font?.id || "")}" />
    <label class="field"><span>Font name</span><input name="name" required maxlength="80" value="${escapeHtml(font?.name || "")}" /></label>
    <label class="field"><span>CSS font-family stack</span><input name="stack" required maxlength="180" value="${escapeHtml(font?.stack || "")}" placeholder='e.g. "Avenir Next", Arial, sans-serif' /><small>Installed device fonts or families already configured in CSS only. Font files are not uploaded.</small></label>
    <div class="field-grid"><label class="field"><span>Style</span><select name="style"><option ${font?.style === "serif" ? "selected" : ""}>serif</option><option ${font?.style === "sans-serif" ? "selected" : ""}>sans-serif</option><option ${font?.style === "monospace" ? "selected" : ""}>monospace</option></select></label><label class="field"><span>Note</span><input name="note" maxlength="100" value="${escapeHtml(font?.note || "")}" /></label></div>
    <p class="font-form-preview" style="font-family:${escapeHtml(font?.stack || "Georgia, serif")}">Form follows feeling.</p>`);
  form.dataset.formKind = "font";
  form.elements.stack.addEventListener("input", () => {
    form.querySelector(".font-form-preview").style.fontFamily = form.elements.stack.value;
  });
}

function closeDialog() {
  if (dialog.open) dialog.close();
}

function saveProject(event) {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const store = getStore();
  const data = new FormData(form);
  const id = String(data.get("id") || createId("project"));
  const slug = String(data.get("slug") || "").trim();
  if (store.projects.some((item) => item.slug === slug && item.id !== id)) {
    notify("That project slug is already in use.", true);
    return;
  }
  const existing = store.projects.find((item) => item.id === id);
  const project = {
    id,
    slug,
    title: String(data.get("title") || "").trim(),
    category: String(data.get("category") || ""),
    categories: data.getAll("categories").map(String),
    thumbnail: String(data.get("thumbnail") || "").trim(),
    previewImage: String(data.get("previewImage") || "").trim(),
    heroImage: String(data.get("heroImage") || "").trim() || String(data.get("thumbnail") || "").trim(),
    alt: String(data.get("alt") || "").trim(),
    summary: String(data.get("summary") || "").trim(),
    description: String(data.get("description") || "").trim(),
    role: String(data.get("role") || "").trim(),
    year: String(data.get("year") || "").trim(),
    completedAt: String(data.get("completedAt") || ""),
    featured: form.elements.featured.checked,
    published: form.elements.published.checked,
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  if (commit({ ...store, projects: existing ? store.projects.map((item) => item.id === id ? project : item) : [project, ...store.projects] }, existing ? `Edited project: ${project.title}` : `Added project: ${project.title}`)) closeDialog();
}

function saveCategory(event) {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const store = getStore();
  const data = new FormData(form);
  const id = String(data.get("id") || createId("category"));
  const name = String(data.get("name") || "").trim();
  if (store.categories.some((item) => item.name.toLowerCase() === name.toLowerCase() && item.id !== id)) {
    notify("A category with that name already exists.", true);
    return;
  }
  const category = { id, name, type: String(data.get("type")), description: String(data.get("description") || "").trim() };
  const exists = store.categories.some((item) => item.id === id);
  const previous = store.categories.find((item) => item.id === id);
  const isAssigned = previous && store.projects.some((project) => project.category === previous.name || (project.categories || []).includes(previous.name));
  if (isAssigned && previous.type !== category.type) {
    notify("Reassign projects before changing this category’s image mapping.", true);
    return;
  }
  if (previous && previous.type !== category.type && store.categories.filter((item) => item.type === previous.type).length <= 1) {
    notify(`Keep at least one ${previous.type} image category.`, true);
    return;
  }
  const projects = previous && previous.name !== name ? store.projects.map((project) => ({
    ...project,
    category: project.category === previous.name ? name : project.category,
    categories: (project.categories || []).map((value) => value === previous.name ? name : value),
  })) : store.projects;
  if (commit({ ...store, projects, categories: exists ? store.categories.map((item) => item.id === id ? category : item) : [...store.categories, category] }, exists ? `Edited category: ${name}` : `Added category: ${name}`)) closeDialog();
}

function saveService(event) {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const store = getStore();
  const data = new FormData(form);
  const id = String(data.get("id") || createId("service"));
  const service = { id, name: String(data.get("name") || "").trim(), description: String(data.get("description") || "").trim() };
  const exists = store.services.some((item) => item.id === id);
  if (commit({ ...store, services: exists ? store.services.map((item) => item.id === id ? service : item) : [...store.services, service] }, exists ? `Edited service: ${service.name}` : `Added service: ${service.name}`)) closeDialog();
}

function saveFont(event) {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const store = getStore();
  const data = new FormData(form);
  const id = String(data.get("id") || createId("font"));
  const name = String(data.get("name") || "").trim();
  const stack = String(data.get("stack") || "").trim();
  if (!/^[A-Za-z0-9 ,.'&"()_-]+$/.test(stack)) {
    notify("Use a valid CSS font-family stack.", true);
    return;
  }
  if (store.fonts.entries.some((item) => item.name.toLowerCase() === name.toLowerCase() && item.id !== id)) {
    notify("A font with that name already exists.", true);
    return;
  }
  const current = store.fonts.entries.find((item) => item.id === id);
  const font = { id, name, stack, style: String(data.get("style")), note: String(data.get("note") || "").trim(), builtIn: current?.builtIn || false };
  const exists = Boolean(current);
  const fonts = { ...store.fonts, entries: exists ? store.fonts.entries.map((item) => item.id === id ? font : item) : [...store.fonts.entries, font] };
  if (commit({ ...store, fonts }, exists ? `Edited font: ${name}` : `Added font: ${name}`)) closeDialog();
}

function saveSettings(event) {
  event.preventDefault();
  const settingsForm = event.target;
  if (!(settingsForm instanceof HTMLFormElement) || !settingsForm.reportValidity()) return;
  const current = getStore();
  const data = new FormData(settingsForm);
  const settings = Object.fromEntries([...data.entries()].map(([key, value]) => [key, String(value).trim()]));
  const badUrl = ["instagram", "social"].find((key) => settings[key] && !/^https:\/\//i.test(settings[key]));
  if (badUrl) {
    notify("Social profile links must use https:// URLs.", true);
    return;
  }
  if (settings.logo && !/^(?:https:\/\/|\/|assets\/|data:image\/)/i.test(settings.logo)) {
    notify("Enter a local image path, image data URL, or HTTPS logo URL.", true);
    return;
  }
  commit({ ...current, settings: { ...current.settings, ...settings } }, "Saved website settings");
}

function updateFonts(changes, activity) {
  const store = getStore();
  commit({ ...store, fonts: { ...store.fonts, ...changes } }, activity);
}

function sendPalette(palette) {
  const frame = document.querySelector("#website-color-live-preview");
  if (!frame?.contentWindow || Object.values(palette).some((color) => !isValidColor(color))) return;
  frame.contentWindow.postMessage({ type: "1601-admin-color-preview", palette }, window.location.origin);
}

async function savePalette(button) {
  const palette = {};
  for (const [key, value] of Object.entries(DEFAULT_PALETTE)) {
    const input = document.querySelector(`[data-palette-color="${key}"]`);
    if (!input || !isValidColor(input.value)) {
      notify("Choose a valid color for every field.", true);
      return;
    }
    palette[key] = input.value.toUpperCase();
  }
  button.disabled = true;
  try {
    const client = await getSupabaseClient();
    if (!client) throw new Error("Supabase is not configured for shared website colors.");
    const { error } = await client
      .from("studio_site_settings")
      .upsert({
        setting_key: "colors",
        setting_value: palette,
        updated_at: new Date().toISOString(),
        updated_by: adminAccess.user.id,
      }, { onConflict: "setting_key" });
    if (error) throw new Error("Unable to publish website colors.", { cause: error });
    sharedPalette = palette;
    sharedPaletteError = "";
    renderColors();
    notify("Website colors published for all devices.");
  } catch (error) {
    console.error("Publishing website colors failed.", error);
    notify(error.message || "Unable to publish website colors.", true);
  } finally {
    button.disabled = false;
  }
}

function deleteById(collection, id, label) {
  const store = getStore();
  const items = collection === "fonts" ? store.fonts.entries : store[collection];
  const item = items.find((entry) => entry.id === id);
  if (!item || !window.confirm(`Delete ${label} “${item.title || item.name || item.sender}”? This only changes this browser’s workspace.`)) return;
  if (collection === "categories") {
    const assigned = store.projects.some((project) => project.category === item.name || (project.categories || []).includes(item.name));
    if (assigned) {
      notify("Reassign projects before deleting this category.", true);
      return;
    }
    if (store.categories.filter((category) => category.type === item.type).length <= 1) {
      notify(`Keep at least one ${item.type} image category.`, true);
      return;
    }
  }
  if (collection === "media") {
    const used = store.projects.some((project) => [project.thumbnail, project.previewImage, project.heroImage].includes(item.path));
    if (used) {
      notify("This image is assigned to a project. Reassign the image before removing it.", true);
      return;
    }
  }
  if (collection === "fonts" && store.fonts.entries.length <= 1) {
    notify("Keep at least one font in the library.", true);
    return;
  }
  let next = collection === "fonts"
    ? { ...store }
    : { ...store, [collection]: store[collection].filter((entry) => entry.id !== id) };
  if (collection === "fonts") {
    next.fonts = { ...store.fonts, entries: store.fonts.entries.filter((entry) => entry.id !== id) };
    const fallback = next.fonts.entries[0]?.id || FONT_SEEDS[0].id;
    if (next.fonts.heading === id) next.fonts.heading = fallback;
    if (next.fonts.body === id) next.fonts.body = fallback;
  }
  commit(next, `Removed ${label}: ${item.title || item.name || item.sender}`);
}

function toggleProject(id) {
  const store = getStore();
  const project = store.projects.find((item) => item.id === id);
  if (!project) return;
  commit({ ...store, projects: store.projects.map((item) => item.id === id ? { ...item, published: !item.published, updatedAt: new Date().toISOString() } : item) }, `${project.published ? "Unpublished" : "Published locally"} project: ${project.title}`);
}

function previewProject(id) {
  const project = getStore().projects.find((item) => item.id === id);
  if (!project) return;
  const primary = safeImage(project.heroImage || project.thumbnail);
  const secondary = safeImage(project.previewImage);
  showDialog(project.title, `<div class="project-preview">${primary ? `<img src="${escapeHtml(primary)}" alt="${escapeHtml(project.alt || project.title)}" />` : '<div class="project-thumb project-thumb--empty">No primary image</div>'}${secondary ? `<img src="${escapeHtml(secondary)}" alt="Secondary preview for ${escapeHtml(project.title)}" />` : ""}<p class="eyebrow">${escapeHtml(project.category)}${project.year ? ` · ${escapeHtml(project.year)}` : ""}</p><p>${escapeHtml(project.summary)}</p>${project.description ? `<p>${escapeHtml(project.description)}</p>` : ""}<span class="local-data-note">Local preview · not a published website page</span></div>`, "Close preview");
  form.dataset.previewOnly = "true";
}

function closePreviewOnSubmit(event) {
  if (form.dataset.previewOnly === "true") {
    event.preventDefault();
    delete form.dataset.previewOnly;
    closeDialog();
  }
}

async function handleUpload(event) {
  const files = [...event.currentTarget.files];
  event.currentTarget.value = "";
  const allowedTypes = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
  const store = getStore();
  const uploads = [];
  for (const file of files) {
    if (!allowedTypes.has(file.type)) {
      notify(`${file.name}: choose a PNG, JPEG, WebP, or GIF image.`, true);
      continue;
    }
    if (file.size > 250 * 1024) {
      notify(`${file.name} exceeds the 250 KB local upload limit.`, true);
      continue;
    }
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
      reader.readAsDataURL(file);
    }).catch((error) => {
      notify(error.message, true);
      return null;
    });
    if (!dataUrl) continue;
    const dimensions = await new Promise((resolve) => {
      const image = new Image();
      image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
      image.onerror = () => resolve({ width: null, height: null });
      image.src = dataUrl;
    });
    uploads.push({ id: createId("media"), name: file.name, path: dataUrl, url: dataUrl, size: file.size, type: file.type, ...dimensions, uploadedAt: new Date().toISOString() });
  }
  if (uploads.length) commit({ ...store, media: [...uploads, ...store.media] }, `Uploaded ${uploads.length} local image${uploads.length === 1 ? "" : "s"}`);
}

async function copyMediaPath(id) {
  const item = getMediaEntries(getStore()).find((entry) => entry.id === id);
  if (!item) return;
  try {
    await navigator.clipboard.writeText(item.path);
    notify("Image path copied.");
  } catch (error) {
    notify(`Could not copy the path: ${error.message}`, true);
  }
}

function handleAction(button) {
  const { action, id } = button.dataset;
  const store = getStore();
  if (action === "new-project") openProject();
  if (action === "edit-project") openProject(store.projects.find((item) => item.id === id));
  if (action === "preview-project") previewProject(id);
  if (action === "toggle-project") toggleProject(id);
  if (action === "delete-project") deleteById("projects", id, "project");
  if (action === "new-category") openCategory();
  if (action === "edit-category") openCategory(store.categories.find((item) => item.id === id));
  if (action === "delete-category") deleteById("categories", id, "category");
  if (action === "new-service") openService();
  if (action === "edit-service") openService(store.services.find((item) => item.id === id));
  if (action === "delete-service") deleteById("services", id, "service");
  if (action === "new-font") openFont();
  if (action === "edit-font") openFont(store.fonts.entries.find((item) => item.id === id));
  if (action === "delete-font") deleteById("fonts", id, "font");
  if (action === "delete-media") deleteById("media", id, "image");
  if (action === "copy-media") copyMediaPath(id);
  if (action === "save-palette") void savePalette(button);
  if (action === "toggle-message") {
    const messages = store.messages || [];
    commit({ ...store, messages: messages.map((message) => message.id === id ? { ...message, read: !message.read } : message) }, "Updated demo message read state");
  }
  if (action === "delete-message") deleteById("messages", id, "demo message");
}

function setPrimaryAction() {
  const button = document.querySelector("[data-primary-action]");
  const actions = {
    overview: ["＋ New project", "new-project"],
    projects: ["＋ New project", "new-project"],
    categories: ["＋ Add category", "new-category"],
    services: ["＋ Add service", "new-service"],
    fonts: ["＋ New font", "new-font"],
  };
  const entry = actions[activeSection];
  button.hidden = !entry;
  if (entry) {
    button.textContent = entry[0];
    button.dataset.action = entry[1];
  }
}

export async function mountDashboard(access) {
  adminAccess = access;
  document.querySelector("#admin-email").textContent = access.user.email || "Studio admin";
  document.querySelector("#admin-role").textContent = access.role;
  const today = new Date();
  const currentDate = document.querySelector("#dashboard-date");
  currentDate.dateTime = today.toISOString().slice(0, 10);
  currentDate.textContent = new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" }).format(today);
  try {
    readStore();
  } catch (error) {
    document.querySelector("#dashboard-loading").hidden = true;
    app.hidden = false;
    notify(error.message, true);
    return;
  }

  try {
    const client = await getSupabaseClient();
    if (!client) throw new Error("Supabase is not configured for shared website colors.");
    const { data, error } = await client
      .from("studio_site_settings")
      .select("setting_value")
      .eq("setting_key", "colors")
      .maybeSingle();
    if (error) throw new Error("Unable to load the shared website colors.", { cause: error });
    if (!data || Object.keys(DEFAULT_PALETTE).some((key) => !isValidColor(data.setting_value?.[key]))) {
      throw new Error("The shared website colors are missing or invalid. Apply the Supabase colors migration from README.md.");
    }
    sharedPalette = Object.fromEntries(
      Object.keys(DEFAULT_PALETTE).map((key) => [key, data.setting_value[key].toUpperCase()])
    );
    sharedPaletteError = "";
  } catch (error) {
    sharedPaletteError = error.message || "Unable to load the shared website colors.";
    console.error("Loading shared website colors failed.", error);
    notify(sharedPaletteError, true);
  }

  document.querySelector("#dashboard-loading").hidden = true;
  app.hidden = false;
  renderAll();
  setPrimaryAction();

  document.querySelector(".sidebar-nav").addEventListener("click", (event) => {
    const button = event.target.closest("[data-section]");
    if (!button) return;
    navigate(button.dataset.section);
    setPrimaryAction();
  });
  document.querySelector("#section-search").addEventListener("input", (event) => {
    query = event.currentTarget.value.trim();
    if (activeSection === "projects") renderProjects();
    if (activeSection === "drafts") renderDrafts();
    if (activeSection === "media") renderMedia();
    if (activeSection === "messages") renderMessages();
    if (activeSection === "services") renderServices();
    if (activeSection === "fonts") renderFonts();
  });
  main.addEventListener("click", (event) => {
    const go = event.target.closest("[data-go]");
    if (go) {
      navigate(go.dataset.go);
      setPrimaryAction();
      return;
    }
    const mode = event.target.closest("[data-project-mode]");
    if (mode) {
      projectMode = mode.dataset.projectMode;
      renderProjects();
      return;
    }
    const action = event.target.closest("[data-action]");
    if (action) handleAction(action);
  });
  form.addEventListener("submit", (event) => {
    if (form.dataset.previewOnly === "true") {
      closePreviewOnSubmit(event);
      return;
    }
    if (form.dataset.formKind === "project") saveProject(event);
    if (form.dataset.formKind === "category") saveCategory(event);
    if (form.dataset.formKind === "service") saveService(event);
    if (form.dataset.formKind === "font") saveFont(event);
  });
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog || event.target.closest("[data-close-dialog]")) closeDialog();
  });
  document.querySelector("#view-settings").addEventListener("submit", saveSettings);
}
