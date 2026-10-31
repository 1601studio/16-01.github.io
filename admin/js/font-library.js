(() => {
  const fontFamilies = [
    { id: "georgia", name: "Georgia", type: "serif", stack: 'Georgia, "Times New Roman", Times, serif', note: "Warm editorial serif" },
    { id: "times", name: "Times New Roman", type: "serif", stack: '"Times New Roman", Times, serif', note: "Classic text serif" },
    { id: "palatino", name: "Palatino", type: "serif", stack: '"Palatino Linotype", "Book Antiqua", Palatino, serif', note: "Refined book serif" },
    { id: "system", name: "System UI", type: "sans-serif", stack: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', note: "Native device interface" },
    { id: "arial", name: "Arial", type: "sans-serif", stack: "Arial, Helvetica, sans-serif", note: "Familiar neutral sans" },
    { id: "trebuchet", name: "Trebuchet MS", type: "sans-serif", stack: '"Trebuchet MS", sans-serif', note: "Soft humanist sans" },
    { id: "verdana", name: "Verdana", type: "sans-serif", stack: "Verdana, Geneva, sans-serif", note: "Open, readable sans" },
    { id: "courier", name: "Courier New", type: "monospace", stack: '"Courier New", Courier, monospace', note: "Monospaced accent" },
  ];

  const builtInIds = fontFamilies.map((font) => font.id);
  const getFonts = () => AdminStore.getFontEntries(fontFamilies);
  const getSizeScale = (role) => {
    const stored = AdminStore.getSettings().fontLibrary?.[`${role}Scale`];
    return Number.isInteger(stored) && stored >= 75 && stored <= 150 ? stored : 100;
  };

  const currentPair = () => {
    const stored = AdminStore.getSettings().fontLibrary || {};
    const fonts = getFonts();
    return {
      heading: fonts.some((font) => font.id === stored.heading) ? stored.heading : "georgia",
      body: fonts.some((font) => font.id === stored.body) ? stored.body : "system",
    };
  };

  const previewPair = (pair) => {
    const fonts = getFonts();
    const heading = fonts.find((font) => font.id === pair.heading) || fonts[0];
    const body = fonts.find((font) => font.id === pair.body) || fonts[3];
    const headingPreview = document.getElementById("font-preview-heading");
    const bodyPreview = document.getElementById("font-preview-body");
    const libraryPreview = document.getElementById("font-live-preview");
    headingPreview.style.fontFamily = heading.stack;
    bodyPreview.style.fontFamily = body.stack;
    libraryPreview.style.setProperty("--library-heading-font", heading.stack);
    libraryPreview.style.setProperty("--library-body-font", body.stack);
    const headingScale = getSizeScale("heading");
    const bodyScale = getSizeScale("body");
    headingPreview.style.fontSize = `${28 * headingScale / 100}px`;
    bodyPreview.style.fontSize = `${11 * bodyScale / 100}px`;
    document.getElementById("heading-size-scale").value = headingScale;
    document.getElementById("body-size-scale").value = bodyScale;
    document.getElementById("heading-size-value").value = `${headingScale}%`;
    document.getElementById("body-size-value").value = `${bodyScale}%`;
    document.getElementById("heading-size-value").textContent = `${headingScale}%`;
    document.getElementById("body-size-value").textContent = `${bodyScale}%`;
    document.getElementById("selected-heading-font").textContent = heading.name;
    document.getElementById("selected-body-font").textContent = body.name;
    document.getElementById("font-pair-title").textContent = `${heading.name} + ${body.name}`;
    document.querySelectorAll(".font-card[data-font-id]").forEach((card) => {
      const activeHeading = card.dataset.fontId === pair.heading;
      const activeBody = card.dataset.fontId === pair.body;
      card.classList.toggle("is-heading-font", activeHeading);
      card.classList.toggle("is-body-font", activeBody);
      const font = fonts.find((item) => item.id === card.dataset.fontId);
      card.querySelector("[data-font-state]").textContent = [
        activeHeading && "Heading",
        activeBody && "Body",
      ].filter(Boolean).join(" · ") || font?.note || "Custom font";
    });
  };

  const render = () => {
    const query = document.getElementById("font-search").value.trim().toLowerCase();
    const category = document.getElementById("font-category-filter").value;
    const fonts = getFonts();
    const matching = fonts.filter((font) =>
      (!query || `${font.name} ${font.type} ${font.note}`.toLowerCase().includes(query)) &&
      (!category || font.type === category)
    );
    const target = document.getElementById("font-list");
    if (!matching.length) {
      target.innerHTML = `<div class="panel"><div class="empty-state"><strong>${fonts.length ? "No fonts match" : "Your font library is empty"}</strong><span>${fonts.length ? "Try another name or font style." : "Create your first font entry."}</span></div></div>`;
      return;
    }
    target.innerHTML = matching.map((font) => `
      <article class="font-card" data-font-id="${font.id}">
        <div class="font-card__top"><div><h3>${AdminUI.escapeHTML(font.name)}</h3><span>${AdminUI.escapeHTML(font.type)} · ${builtInIds.includes(font.id) ? "device font" : "custom entry"}</span></div><span class="font-card__state" data-font-state>${AdminUI.escapeHTML(font.note)}</span></div>
        <p class="font-card__specimen">Ag&nbsp; 16:01</p>
        <p class="font-card__sentence">The quick brown fox jumps over the lazy dog.</p>
        <div class="font-card__actions">
          <label class="font-card__role"><span class="visually-hidden">Use ${AdminUI.escapeHTML(font.name)} for</span><select class="font-card__role-select" data-font-role data-font-id="${font.id}" aria-label="Use ${AdminUI.escapeHTML(font.name)} for"><option value="">Use for…</option><option value="heading">Headings</option><option value="body">Body text</option></select></label>
          <button class="small-button" type="button" data-edit-font="${font.id}">Edit</button>
          <button class="small-button small-button--danger" type="button" data-delete-font="${font.id}" aria-label="Remove ${AdminUI.escapeHTML(font.name)}" title="${fonts.length === 1 ? "At least one font style must remain in the library." : "Remove this font style from the library."}"${fonts.length === 1 ? " disabled" : ""}>Remove</button>
        </div>
      </article>`).join("");
    target.querySelectorAll(".font-card").forEach((card) => {
      const font = fonts.find((item) => item.id === card.dataset.fontId);
      card.querySelectorAll(".font-card__specimen, .font-card__sentence").forEach((sample) => {
        sample.style.fontFamily = font.stack;
      });
    });
    previewPair(currentPair());
  };

  const apply = (fontId, role) => {
    const font = getFonts().find((item) => item.id === fontId);
    if (!font || !["heading", "body"].includes(role)) {
      AdminUI.showToast("Choose a font and text role from the library.", true);
      return;
    }
    try {
      const settings = AdminStore.getSettings();
      const pair = { ...currentPair(), [role]: fontId };
      AdminStore.saveSettings({ ...settings, fontLibrary: pair });
      AdminStore.recordActivity("font-selected", `${font.name} for ${role}`);
      previewPair(pair);
      AdminUI.showToast(`${font.name} selected for ${role}. Public pages preview this pairing in this browser.`);
    } catch (error) {
      AdminUI.showToast(error.message, true);
    }
  };

  const previewSizeScale = (role, value) => {
    const scale = Number(value);
    if (!Number.isInteger(scale) || scale < 75 || scale > 150) return;
    const output = document.getElementById(`${role}-size-value`);
    output.value = `${scale}%`;
    output.textContent = `${scale}%`;
    const preview = document.getElementById(role === "heading" ? "font-preview-heading" : "font-preview-body");
    preview.style.fontSize = `${(role === "heading" ? 28 : 11) * scale / 100}px`;
  };

  const saveSizeScale = (role, value) => {
    const scale = Number(value);
    if (!Number.isInteger(scale) || scale < 75 || scale > 150) {
      AdminUI.showToast("Choose a text size between 75% and 150%.", true);
      return;
    }
    try {
      const settings = AdminStore.getSettings();
      const fontLibrary = { ...(settings.fontLibrary || {}), [`${role}Scale`]: scale };
      AdminStore.saveSettings({ ...settings, fontLibrary });
      AdminStore.recordActivity("font-size-changed", `${role} text ${scale}%`);
      AdminUI.showToast(`${role === "heading" ? "Heading" : "Body"} text size saved for this browser’s preview.`);
    } catch (error) {
      AdminUI.showToast(error.message, true);
    }
  };

  const openFontForm = (font = null) => {
    const form = document.getElementById("font-form");
    form.reset();
    form.elements.id.value = font?.id || "";
    form.elements.name.value = font?.name || "";
    form.elements.stack.value = font?.stack || "";
    form.elements.type.value = font?.type || "sans-serif";
    form.elements.note.value = font?.note || "";
    document.getElementById("font-dialog-title").textContent = font ? "Edit font" : "New font";
    updateFormSample();
    document.getElementById("font-dialog").showModal();
    form.elements.name.focus();
  };

  const updateFormSample = () => {
    const form = document.getElementById("font-form");
    const sample = document.getElementById("font-form-sample");
    const stack = form.elements.stack.value.trim();
    sample.style.fontFamily = isValidStack(stack) ? stack : "Georgia, serif";
  };

  const isValidStack = (stack) =>
    stack.length > 0 &&
    stack.length <= 180 &&
    /^[a-zA-Z0-9\s,"'()._-]+$/.test(stack) &&
    /[a-zA-Z]/.test(stack);

  const saveFont = (form) => {
    const id = form.elements.id.value || `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const next = {
      id,
      name: form.elements.name.value.trim(),
      stack: form.elements.stack.value.trim(),
      type: form.elements.type.value,
      note: form.elements.note.value.trim() || "Custom font family",
    };
    if (!isValidStack(next.stack)) throw new Error("Enter a valid CSS font-family stack using letters, numbers, spaces, quotes, commas, periods, parentheses, underscores, or hyphens.");
    const fonts = getFonts();
    if (fonts.some((font) => font.id !== id && font.name.toLowerCase() === next.name.toLowerCase())) {
      throw new Error("A font with that name already exists.");
    }
    const exists = fonts.some((font) => font.id === id);
    const updated = exists
      ? fonts.map((font) => font.id === id ? next : font)
      : [...fonts, next];
    AdminStore.saveFontEntries(updated, builtInIds);
    AdminStore.recordActivity(exists ? "font-edited" : "font-added", next.name);
    document.getElementById("font-dialog").close();
    render();
    AdminUI.showToast(exists ? "Font updated in this browser." : "Font added to this browser’s library.");
  };

  const deleteFont = (id) => {
    const fonts = getFonts();
    const font = fonts.find((item) => item.id === id);
    if (!font) return;
    if (fonts.length <= 1) {
      AdminUI.showToast("At least one font style must remain in the library.", true);
      return;
    }
    if (!window.confirm(`Remove “${font.name}” from this browser’s font library?`)) return;
    const remaining = fonts.filter((item) => item.id !== id);
    const fallbackHeading = remaining[0].id;
    const fallbackBody = (remaining.find((item) => item.id !== fallbackHeading) || remaining[0]).id;
    const settings = AdminStore.getSettings();
    const pair = { ...(settings.fontLibrary || {}) };
    if (pair.heading === id || !remaining.some((item) => item.id === pair.heading)) pair.heading = fallbackHeading;
    if (pair.body === id || !remaining.some((item) => item.id === pair.body)) pair.body = fallbackBody;
    try {
      AdminStore.saveFontEntries(remaining, builtInIds);
      AdminStore.saveSettings({ ...settings, fontLibrary: pair });
      AdminStore.recordActivity("font-removed", font.name);
      render();
      AdminUI.showToast(`${font.name} removed from this browser’s font library.`);
    } catch (error) {
      AdminUI.showToast(error.message, true);
    }
  };

  window.AdminFonts = {
    init() {
      document.getElementById("font-search").addEventListener("input", render);
      document.getElementById("font-category-filter").addEventListener("change", render);
      document.getElementById("new-font-button").addEventListener("click", () => openFontForm());
      ["heading", "body"].forEach((role) => {
        const control = document.getElementById(`${role}-size-scale`);
        control.addEventListener("input", () => previewSizeScale(role, control.value));
        control.addEventListener("change", () => saveSizeScale(role, control.value));
      });
      const fontForm = document.getElementById("font-form");
      fontForm.elements.stack.addEventListener("input", updateFormSample);
      document.getElementById("font-form").addEventListener("submit", (event) => {
        event.preventDefault();
        if (!event.currentTarget.reportValidity()) return;
        try {
          saveFont(event.currentTarget);
        } catch (error) {
          AdminUI.showToast(error.message, true);
        }
      });
      document.getElementById("font-list").addEventListener("change", (event) => {
        const menu = event.target.closest("[data-font-role]");
        if (!menu || !menu.value) return;
        const role = menu.value;
        apply(menu.dataset.fontId, role);
        menu.value = "";
      });
      document.getElementById("font-list").addEventListener("click", (event) => {
        const edit = event.target.closest("[data-edit-font]");
        if (edit) openFontForm(getFonts().find((font) => font.id === edit.dataset.editFont));
        const remove = event.target.closest("[data-delete-font]");
        if (remove) deleteFont(remove.dataset.deleteFont);
      });
    },
    render,
  };
})();
