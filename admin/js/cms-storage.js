const STORAGE_KEY = "1601-admin-dashboard-v1";

export const CATEGORY_SEEDS = [
  { id: "branding", name: "Branding", type: "primary", description: "Primary project image category." },
  { id: "illustration", name: "Illustration", type: "primary", description: "Primary project image category." },
  { id: "typography", name: "Typography", type: "primary", description: "Primary project image category." },
  { id: "poster-design", name: "Poster Design", type: "secondary", description: "Secondary project image category." },
  { id: "merchandise", name: "Merchandise", type: "secondary", description: "Secondary project image category." },
  { id: "editorial-design", name: "Editorial Design", type: "secondary", description: "Secondary project image category." },
];

export const FONT_SEEDS = [
  { id: "georgia", name: "Georgia", stack: 'Georgia, "Times New Roman", Times, serif', style: "serif", note: "Editorial serif" },
  { id: "times", name: "Times New Roman", stack: '"Times New Roman", Times, serif', style: "serif", note: "Classic serif" },
  { id: "palatino", name: "Palatino", stack: '"Palatino Linotype", "Book Antiqua", Palatino, serif', style: "serif", note: "Warm book serif" },
  { id: "system", name: "System UI", stack: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', style: "sans-serif", note: "Native system sans" },
  { id: "arial", name: "Arial", stack: 'Arial, Helvetica, sans-serif', style: "sans-serif", note: "Neutral sans serif" },
  { id: "verdana", name: "Verdana", stack: 'Verdana, Geneva, sans-serif', style: "sans-serif", note: "Wide, readable sans" },
  { id: "courier", name: "Courier New", stack: '"Courier New", Courier, monospace', style: "monospace", note: "Typewriter mono" },
];

export const DEFAULT_PALETTE = {
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

const createDefaultStore = () => ({
  version: 1,
  projects: [],
  categories: CATEGORY_SEEDS.map((category) => ({ ...category })),
  media: [],
  services: [
    { id: "brand-identity", name: "Brand identity", description: "Logos, visual systems, and brand guidelines built around strong typography." },
    { id: "illustration", name: "Illustration", description: "Editorial and custom illustration for print and digital contexts." },
    { id: "typography-layout", name: "Typography & layout", description: "Editorial design, poster design, and typographic compositions." },
    { id: "print-editorial", name: "Print & editorial", description: "Posters, brochures, books, and editorial layouts." },
  ],
  settings: {
    websiteName: "16:01 Studio",
    logo: "",
    heroHeadline: "16:01 Studio",
    heroDescription: "Graphic design & illustration — premium editorial work, strong typography, and carefully composed images.",
    contactEmail: "",
    instagram: "",
    social: "",
    footerDescription: "",
    seoTitle: "16:01 Studio — Graphic Design & Illustration",
    seoDescription: "16:01 Studio is a graphic design and illustration portfolio.",
    pageContent: {},
  },
  palette: { ...DEFAULT_PALETTE },
  fonts: {
    entries: FONT_SEEDS.map((font) => ({ ...font, builtIn: true })),
    heading: "georgia",
    body: "system",
    headingScale: 100,
    bodyScale: 100,
  },
  activity: [],
});

export const createId = (prefix = "item") =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export function readStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultStore();
    const stored = JSON.parse(raw);
    const defaults = createDefaultStore();
    if (!stored || typeof stored !== "object" || stored.version !== 1) {
      throw new Error("The saved admin workspace has an unsupported format. Export or clear its browser data before continuing.");
    }
    return {
      ...defaults,
      ...stored,
      categories: Array.isArray(stored.categories) ? stored.categories : defaults.categories,
      projects: Array.isArray(stored.projects) ? stored.projects : [],
      media: Array.isArray(stored.media) ? stored.media : [],
      services: Array.isArray(stored.services) ? stored.services : defaults.services,
      settings: { ...defaults.settings, ...(stored.settings || {}) },
      palette: { ...DEFAULT_PALETTE, ...(stored.palette || {}) },
      fonts: { ...defaults.fonts, ...(stored.fonts || {}), entries: Array.isArray(stored.fonts?.entries) ? stored.fonts.entries : defaults.fonts.entries },
      activity: Array.isArray(stored.activity) ? stored.activity : [],
    };
  } catch (error) {
    throw new Error(`Could not load the browser-local admin workspace: ${error.message}`);
  }
}

export function writeStore(next, activityLabel = "") {
  const updated = { ...next };
  if (activityLabel) {
    updated.activity = [
      { id: createId("activity"), label: activityLabel, at: new Date().toISOString() },
      ...(Array.isArray(updated.activity) ? updated.activity : []),
    ].slice(0, 40);
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("1601-admin-workspace-updated", { detail: { key: STORAGE_KEY } }));
    return updated;
  } catch (error) {
    const reason = error?.name === "QuotaExceededError"
      ? "Browser storage is full. Remove large local uploads and try again."
      : `Could not save browser-local changes: ${error.message}`;
    throw new Error(reason);
  }
}

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

export function slugify(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function isValidColor(value) {
  return typeof value === "string" && /^#[\da-f]{6}$/i.test(value);
}

export function formatDate(value) {
  if (!value) return "Not set";
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? "Not set"
    : new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" }).format(date);
}

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return "Unknown size";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
