(() => {
  const keys = {
    projects: "1601-admin-projects-v1",
    categories: "1601-admin-categories-v1",
    media: "1601-admin-media-v1",
    settings: "1601-admin-settings-v1",
    services: "1601-admin-services-v1",
    messages: "1601-admin-messages-v1",
    activity: "1601-admin-activity-v1",
    fonts: "1601-admin-font-library-v1",
    session: "1601-admin-session-v1",
  };

  const defaultSettings = {
    websiteName: "16:01 Studio",
    logo: "",
    fontStyle: "editorial",
    colorStyle: "studio",
    fontLibrary: { heading: "georgia", body: "system", headingScale: 100, bodyScale: 100 },
    heroHeadline: "16:01 Studio",
    heroDescription: "Graphic design & illustration — premium editorial work, strong typography, and carefully composed images.",
    contactEmail: "",
    instagram: "",
    social: "",
    footerDescription: "",
    seoTitle: "16:01 Studio — Graphic Design & Illustration",
    seoDescription: "16:01 Studio is a graphic design and illustration portfolio.",
    pageContent: {
      homeTitle: "16:01 Studio",
      homeDescription: "Graphic design & illustration — premium editorial work, strong typography, and carefully composed images.",
      homeFeaturedTitle: "Featured",
      homeServicesTitle: "Services",
      homeServicesIntro: "Graphic design, illustration, and art direction for brands that value editorial rigour.",
      homeServicesLink: "View all services",
      homeAboutTitle: "About",
      homeAboutIntro: "16:01 Studio is an independent graphic design and illustration practice.",
      homeAboutBody: "We produce premium editorial work, carefully composed images, and type-led identities for cultural and commercial clients.",
      homeAboutLink: "Learn more",
      homeContactTitle: "Let’s work together.",
      homeContactDescription: "Available for selected commissions and collaborations.",
      homeContactLink: "Get in touch",
      workTitle: "Work",
      workDescription: "Selected projects across branding, illustration, typography, poster design, merchandise, and editorial design.",
      aboutTitle: "About",
      aboutDescription: "An independent graphic design and illustration practice.",
      aboutSectionTitle: "About the studio",
      aboutBodyOne: "16:01 Studio is an independent graphic design and illustration practice focused on premium editorial work, strong typography, and carefully composed images.",
      aboutBodyTwo: "We collaborate with cultural and commercial clients on brand identity, illustration, typography, and print design. Every project is approached as a distinct editorial composition.",
      servicesTitle: "Services",
      servicesDescription: "Graphic design, illustration, and art direction.",
      contactTitle: "Contact",
      contactDescription: "Available for selected commissions and collaborations.",
      notFoundDescription: "This page couldn’t be found. Return to the homepage or browse the work.",
    },
  };

  const defaultServices = [
    { id: "service-1", name: "Brand identity", description: "Logos, visual systems, and brand guidelines built around strong typography." },
    { id: "service-2", name: "Illustration", description: "Editorial and custom illustration for print and digital contexts." },
    { id: "service-3", name: "Typography & layout", description: "Editorial design, poster design, and typographic compositions." },
    { id: "service-4", name: "Print & editorial", description: "Posters, brochures, books, and editorial layouts." },
  ];

  const read = (key, fallback) => {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    try {
      return JSON.parse(raw);
    } catch (error) {
      throw new Error(`Saved admin data for “${key}” could not be read. Clear the damaged browser-local data to continue.`);
    }
  };

  const write = (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      if (error instanceof DOMException && error.name === "QuotaExceededError") {
        throw new Error("Browser storage is full. Remove large uploads or clear old local admin data, then try again.");
      }
      throw new Error(`Could not save browser-local admin data: ${error.message}`);
    }
  };

  const getSourceProjects = () =>
    (typeof projects !== "undefined" && Array.isArray(projects) ? projects : []).map((project) => ({ ...project, categories: [...(project.categories || [])] }));

  const getProjects = () => read(keys.projects, getSourceProjects());
  const saveProjects = (items) => write(keys.projects, items);
  const getCategories = () => {
    const stored = read(keys.categories, null);
    if (stored) return stored;
    const names = new Set();
    getProjects().forEach((project) => {
      if (project.category) names.add(project.category);
      (project.categories || []).forEach((category) => names.add(category));
    });
    return [...names].map((name) => ({
      name,
      description: name === "Branding" || name === "Illustration" || name === "Typography"
        ? "Primary project image category."
        : "Secondary project image category.",
      kind: ["Branding", "Illustration", "Typography"].includes(name) ? "Primary image" : "Secondary image",
    }));
  };
  const saveCategories = (items) => write(keys.categories, items);
  const getMedia = () => {
    const stored = read(keys.media, null);
    if (stored) return stored;
    const paths = new Set();
    getProjects().forEach((project) => [project.thumbnail, project.previewImage, project.heroImage].filter(Boolean).forEach((path) => paths.add(path)));
    return [...paths].map((path) => ({ id: `repo-${path}`, path, name: path.split("/").pop(), type: "repository", size: null, width: null, height: null }));
  };
  const saveMedia = (items) => write(keys.media, items);
  const getSettings = () => ({ ...defaultSettings, ...read(keys.settings, {}) });
  const saveSettings = (settings) => write(keys.settings, settings);
  const getFontEntries = (defaults) => {
    const stored = read(keys.fonts, null);
    if (!stored) return defaults;
    const overrides = new Map((stored.overrides || []).map((font) => [font.id, font]));
    const removed = new Set(stored.removed || []);
    const builtIns = defaults
      .filter((font) => !removed.has(font.id))
      .map((font) => ({ ...font, ...(overrides.get(font.id) || {}) }));
    return [...builtIns, ...(stored.custom || [])];
  };
  const saveFontEntries = (entries, builtInIds) => {
    const builtInSet = new Set(builtInIds);
    const activeBuiltIns = new Set(entries.filter((font) => builtInSet.has(font.id)).map((font) => font.id));
    write(keys.fonts, {
      overrides: entries.filter((font) => builtInSet.has(font.id)),
      custom: entries.filter((font) => !builtInSet.has(font.id)),
      removed: builtInIds.filter((id) => !activeBuiltIns.has(id)),
    });
  };
  const getServices = () => read(keys.services, defaultServices);
  const saveServices = (services) => write(keys.services, services);
  const getMessages = () => read(keys.messages, []).filter((message) => !message.demo && message.id !== "demo-message-01");
  const saveMessages = (messages) => write(keys.messages, messages);
  const getActivity = () => read(keys.activity, []);
  const recordActivity = (type, detail) => {
    const events = getActivity();
    events.unshift({ id: `activity-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, type, detail, timestamp: new Date().toISOString() });
    write(keys.activity, events.slice(0, 250));
  };
  const setSession = (email) => sessionStorage.setItem(keys.session, JSON.stringify({ email, startedAt: new Date().toISOString() }));
  const getSession = () => readSession();
  const readSession = () => {
    const raw = sessionStorage.getItem(keys.session);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (error) {
      sessionStorage.removeItem(keys.session);
      return null;
    }
  };
  const clearSession = () => sessionStorage.removeItem(keys.session);

  window.AdminStore = {
    getProjects, saveProjects, getCategories, saveCategories, getMedia, saveMedia,
    getSettings, saveSettings, getServices, saveServices, getMessages, saveMessages,
    getActivity, recordActivity, getFontEntries, saveFontEntries, setSession, getSession, clearSession,
  };
})();
