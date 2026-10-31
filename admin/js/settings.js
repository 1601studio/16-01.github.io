(() => {
  const settingsForm = () => document.getElementById("settings-form");
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

  const defaultColorPalette = colorStyles.studio;
  const validHex = (value) => typeof value === "string" && /^#[\da-f]{6}$/i.test(value);
  const getColorPalette = (settings = AdminStore.getSettings()) => {
    const defaults = settings.colorStyles?.palette || colorStyles[settings.colorStyle] || defaultColorPalette;
    const saved = settings.colorPalette || settings.colorPalettes?.[settings.colorStyle] || {};
    return Object.fromEntries(Object.entries(defaults).map(([key, value]) => {
      const savedColor = key === "boxText" ? saved.boxText || saved.secondaryText : saved[key];
      return [key, validHex(savedColor) ? savedColor : value];
    }));
  };

  const setWebsitePreviewEnabled = (enabled) => {
    const preview = document.getElementById("preview-saved-colors");
    preview.setAttribute("aria-disabled", String(!enabled));
    preview.tabIndex = enabled ? 0 : -1;
  };

  const sendLivePreviewPalette = (palette) => {
    const frame = document.getElementById("website-color-live-preview");
    if (!frame?.contentWindow) return;
    frame.contentWindow.postMessage({ type: "1601-admin-color-preview", palette }, window.location.origin);
  };

  const previewColorStyle = () => {
    const selected = getColorPalette();
    const preview = document.getElementById("color-style-preview");
    if (!preview) return;
    Object.entries(selected).forEach(([key, color]) => {
      preview.querySelector(`[data-color-swatch="${key}"]`).style.setProperty("--swatch", color);
    });
    sendLivePreviewPalette(selected);
    document.querySelectorAll("[data-palette-color]").forEach((input) => {
      input.value = selected[input.dataset.paletteColor];
    });
  };

  const populateColorStyle = () => {
    const saved = getColorPalette();
    document.querySelectorAll("[data-palette-color]").forEach((input) => {
      input.value = saved[input.dataset.paletteColor];
    });
    previewColorStyle();
    const current = AdminStore.getSettings().colorPalette || {};
    setWebsitePreviewEnabled(Object.keys(defaultColorPalette).every((key) => validHex(current[key])));
  };

  const saveColorStyle = () => {
    const palette = {};
    for (const input of document.querySelectorAll("[data-palette-color]")) {
      const key = input.dataset.paletteColor;
      if (!Object.hasOwn(defaultColorPalette, key) || !validHex(input.value)) {
        AdminUI.showToast("Choose valid colors for every palette field.", true);
        return;
      }
      palette[key] = input.value.toUpperCase();
    }
    if (Object.keys(palette).length !== Object.keys(defaultColorPalette).length) {
      AdminUI.showToast("Choose a color for every palette field.", true);
      return;
    }
    try {
      const current = AdminStore.getSettings();
      AdminStore.saveSettings({ ...current, colorPalette: palette });
      AdminStore.recordActivity("color-style-saved", "Custom website colors");
      previewColorStyle();
      setWebsitePreviewEnabled(true);
      AdminUI.showToast("Custom website colors saved. Preview the updated website in a new tab.");
    } catch (error) {
      AdminUI.showToast(error.message, true);
    }
  };

  const populate = () => {
    const form = settingsForm();
    if (!form) return;
    const settings = AdminStore.getSettings();
    Object.entries(settings).forEach(([name, value]) => {
      const field = form.elements.namedItem(name);
      if (field) field.value = value || "";
    });
    Object.entries(settings.pageContent || {}).forEach(([name, value]) => {
      const field = form.elements.namedItem(`content_${name}`);
      if (field) field.value = value || "";
    });
  };

  const submitSettings = (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const current = AdminStore.getSettings();
    const data = new FormData(form);
    const entries = [...data.entries()].map(([key, value]) => [key, String(value).trim()]);
    const next = Object.fromEntries(entries.filter(([key]) => !key.startsWith("content_")));
    next.pageContent = Object.fromEntries(entries.filter(([key]) => key.startsWith("content_")).map(([key, value]) => [key.slice("content_".length), value]));
    next.pageContent.homeTitle = next.heroHeadline;
    next.pageContent.homeDescription = next.heroDescription;
    const invalidUrl = ["instagram", "social"].find((key) => next[key] && !/^https:\/\//i.test(next[key]));
    if (invalidUrl) {
      AdminUI.showToast("Social links must use an https:// URL.", true);
      return;
    }
    if (next.logo && !/^(?:https:\/\/|\/|assets\/|data:image\/)/i.test(next.logo)) {
      AdminUI.showToast("Logo path must be a local image path, an image data URL, or an HTTPS URL.", true);
      return;
    }
    try {
      AdminStore.saveSettings({ ...current, ...next });
      AdminStore.recordActivity("settings-saved", "Website settings");
      AdminUI.renderOverview();
      AdminUI.showToast("Page copy and settings updated in this browser’s public-site preview. Live website files are unchanged.");
    } catch (error) {
      AdminUI.showToast(error.message, true);
    }
  };

  const openService = (service = null) => {
    const form = document.getElementById("service-form");
    form.reset();
    form.elements.id.value = service?.id || "";
    form.elements.name.value = service?.name || "";
    form.elements.description.value = service?.description || "";
    document.getElementById("service-dialog-title").textContent = service ? "Edit service" : "Add service";
    document.getElementById("service-dialog").showModal();
    form.elements.name.focus();
  };

  window.AdminServices = {
    init() {
      document.getElementById("service-list").addEventListener("click", (event) => {
        const edit = event.target.closest("[data-edit-service]");
        const remove = event.target.closest("[data-delete-service]");
        const services = AdminStore.getServices();
        if (edit) openService(services.find((service) => service.id === edit.dataset.editService));
        if (remove) {
          const service = services.find((item) => item.id === remove.dataset.deleteService);
          if (!service || !window.confirm(`Remove “${service.name}” from this browser’s admin list?`)) return;
          try {
            AdminStore.saveServices(services.filter((item) => item.id !== service.id));
            AdminStore.recordActivity("service-removed", service.name);
            AdminUI.renderServices();
            AdminUI.showToast("Service removed from this browser.");
          } catch (error) {
            AdminUI.showToast(error.message, true);
          }
        }
      });
      document.getElementById("service-form").addEventListener("submit", (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        if (!form.reportValidity()) return;
        const data = new FormData(form);
        const id = String(data.get("id") || "");
        const name = String(data.get("name") || "").trim();
        const description = String(data.get("description") || "").trim();
        const services = AdminStore.getServices();
        const next = { id: id || `service-${Date.now()}`, name, description };
        try {
          AdminStore.saveServices(id ? services.map((service) => service.id === id ? next : service) : [...services, next]);
          AdminStore.recordActivity(id ? "service-edited" : "service-added", name);
          document.getElementById("service-dialog").close();
          AdminUI.renderServices();
          AdminUI.showToast("Service saved in this browser.");
        } catch (error) {
          AdminUI.showToast(error.message, true);
        }
      });
    },
    open: () => openService(),
  };

  window.AdminSettings = {
    init() {
      settingsForm().addEventListener("submit", submitSettings);
      document.getElementById("save-color-style").addEventListener("click", saveColorStyle);
      document.querySelectorAll("[data-palette-color]").forEach((input) => {
        input.addEventListener("input", (event) => {
          const swatch = document.querySelector(`[data-color-swatch="${event.currentTarget.dataset.paletteColor}"]`);
          swatch.style.setProperty("--swatch", event.currentTarget.value);
          const draftPalette = Object.fromEntries([...document.querySelectorAll("[data-palette-color]")].map((field) => [field.dataset.paletteColor, field.value]));
          sendLivePreviewPalette(draftPalette);
          setWebsitePreviewEnabled(false);
        });
      });
      document.getElementById("website-color-live-preview").addEventListener("load", () => {
        const draftPalette = Object.fromEntries([...document.querySelectorAll("[data-palette-color]")].map((input) => [input.dataset.paletteColor, input.value]));
        sendLivePreviewPalette(draftPalette);
      });
      document.getElementById("preview-saved-colors").addEventListener("click", (event) => {
        if (event.currentTarget.getAttribute("aria-disabled") === "true") event.preventDefault();
      });
    },
    populate,
    populateColorStyle,
  };
})();
