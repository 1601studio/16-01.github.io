(() => {
  let viewMode = "grid";

  const projectId = () => `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const sortByRecent = (items) => [...items].sort((a, b) => {
    const timeA = new Date(a.updatedAt || `${a.year || 0}-01-01`).getTime();
    const timeB = new Date(b.updatedAt || `${b.year || 0}-01-01`).getTime();
    return timeB - timeA;
  });

  const fillCategoryOptions = (form, project) => {
    const categories = AdminStore.getCategories();
    const primaryCategories = categories.filter((category) => category.kind === "Primary image");
    const secondaryCategories = categories.filter((category) => category.kind === "Secondary image");
    const primary = form.elements.category;
    const multiple = form.elements.categories;
    const previousPrimary = project?.category || "";
    primary.innerHTML = primaryCategories.map((category) => `<option value="${AdminUI.escapeHTML(category.name)}">${AdminUI.escapeHTML(category.name)}</option>`).join("");
    multiple.innerHTML = secondaryCategories.map((category) => `<option value="${AdminUI.escapeHTML(category.name)}">${AdminUI.escapeHTML(category.name)}</option>`).join("");
    if (previousPrimary) primary.value = previousPrimary;
    const selected = project?.categories || [];
    [...multiple.options].forEach((option) => { option.selected = selected.includes(option.value) && option.value !== previousPrimary; });
  };

  const fillMediaOptions = (form, project) => {
    ["primaryMedia", "secondaryMedia"].forEach((name) => {
      const select = form.elements[name];
      select.innerHTML = `<option value="">Choose from media library</option>${AdminStore.getMedia().map((item) => `<option value="${AdminUI.escapeHTML(item.path)}">${AdminUI.escapeHTML(item.name)}${item.type === "repository" ? " · repository" : " · local upload"}</option>`).join("")}`;
      const currentPath = name === "primaryMedia" ? project?.thumbnail : project?.previewImage;
      if (currentPath && [...select.options].some((option) => option.value === currentPath)) select.value = currentPath;
    });
  };

  const renderImage = (image, path, alt) => {
    AdminUI.setImage(image, path, alt);
  };

  const cardMarkup = (project) => `
    <article class="project-card">
      <div class="project-card__image-wrap"><img class="project-card__image" src="${AdminUI.escapeHTML(AdminUI.imageSource(project.thumbnail))}" alt="${AdminUI.escapeHTML(project.alt || project.title)}" loading="lazy" /><span class="project-card__status status-pill ${project.published ? "status-pill--published" : "status-pill--draft"}">${project.published ? "Published" : "Draft"}</span></div>
      <div class="project-card__body"><div class="project-card__meta"><span>${AdminUI.escapeHTML(AdminUI.getPrimaryCategory(project))}</span><span>${AdminUI.escapeHTML(project.year || "Year not set")}</span></div><h3 class="project-card__title" title="${AdminUI.escapeHTML(project.title)}">${AdminUI.escapeHTML(project.title)}</h3><div class="project-card__actions"><button class="small-button" type="button" data-project-preview="${AdminUI.escapeHTML(project.id)}">Preview</button><button class="small-button" type="button" data-project-edit="${AdminUI.escapeHTML(project.id)}">Edit</button><button class="small-button small-button--danger" type="button" data-project-delete="${AdminUI.escapeHTML(project.id)}">Delete</button><button class="small-button small-button--primary" type="button" data-project-toggle="${AdminUI.escapeHTML(project.id)}">${project.published ? "Unpublish" : "Publish"}</button></div></div>
    </article>`;

  const tableMarkup = (items) => `
    <div class="project-table-wrap"><table class="project-table"><thead><tr><th>Project</th><th>Category</th><th>Status</th><th>Updated</th><th>Actions</th></tr></thead><tbody>${items.map((project) => `
      <tr><td><span class="table-project"><img src="${AdminUI.escapeHTML(AdminUI.imageSource(project.thumbnail))}" alt="" loading="lazy" /><span>${AdminUI.escapeHTML(project.title)}</span></span></td><td>${AdminUI.escapeHTML(AdminUI.getPrimaryCategory(project))}</td><td><span class="status-pill ${project.published ? "status-pill--published" : "status-pill--draft"}">${project.published ? "Published" : "Draft"}</span></td><td>${AdminUI.escapeHTML(AdminUI.formatDate(project.updatedAt))}</td><td><div class="table-actions"><button class="small-button" type="button" data-project-preview="${AdminUI.escapeHTML(project.id)}">Preview</button><button class="small-button" type="button" data-project-edit="${AdminUI.escapeHTML(project.id)}">Edit</button><button class="small-button" type="button" data-project-toggle="${AdminUI.escapeHTML(project.id)}">${project.published ? "Unpublish" : "Publish"}</button><button class="small-button small-button--danger" type="button" data-project-delete="${AdminUI.escapeHTML(project.id)}">Delete</button></div></td></tr>`).join("")}</tbody></table></div>`;

  const populateFilters = () => {
    const select = document.getElementById("project-category-filter");
    const current = select.value;
    select.innerHTML = `<option value="">All categories</option>${AdminStore.getCategories().map((category) => `<option value="${AdminUI.escapeHTML(category.name)}">${AdminUI.escapeHTML(category.name)}</option>`).join("")}`;
    if ([...select.options].some((option) => option.value === current)) select.value = current;
  };

  const render = () => {
    const allProjects = sortByRecent(AdminStore.getProjects());
    populateFilters();
    const query = document.getElementById("project-search").value.trim().toLowerCase();
    const category = document.getElementById("project-category-filter").value;
    const status = document.getElementById("project-status-filter").value;
    const items = allProjects.filter((project) => {
      const matchesText = !query || [project.title, project.slug, project.summary, project.category, ...(project.categories || [])].some((value) => String(value || "").toLowerCase().includes(query));
      const matchesCategory = !category || AdminUI.getProjectCategories(project).includes(category);
      const matchesStatus = !status || (status === "published" ? project.published : !project.published);
      return matchesText && matchesCategory && matchesStatus;
    });
    document.getElementById("project-total").textContent = `(${items.length}${items.length !== allProjects.length ? ` of ${allProjects.length}` : ""})`;
    const target = document.getElementById("project-list");
    if (!items.length) {
      target.innerHTML = `<div class="panel">${items.length === allProjects.length ? "" : ""}<div class="empty-state"><strong>${allProjects.length ? "No matching projects" : "No projects yet"}</strong><span>${allProjects.length ? "Adjust your search or filters to see projects." : "Create your first project to start a local portfolio."}</span></div></div>`;
      return;
    }
    target.innerHTML = viewMode === "grid"
      ? `<div class="project-grid">${items.map(cardMarkup).join("")}</div>`
      : tableMarkup(items);
    target.querySelectorAll("img").forEach((image) => {
      image.addEventListener("error", () => {
        image.replaceWith(Object.assign(document.createElement("div"), { className: "no-image", innerHTML: "Image unavailable<span>Check asset path</span>" }));
      }, { once: true });
    });
  };

  const open = (project = null) => {
    const dialog = document.getElementById("project-dialog");
    const form = document.getElementById("project-form");
    form.reset();
    fillCategoryOptions(form, project);
    fillMediaOptions(form, project);
    document.getElementById("project-dialog-title").textContent = project ? "Edit project" : "New project";
    form.elements.id.value = project?.id || "";
    form.elements.title.value = project?.title || "";
    form.elements.slug.value = project?.slug || "";
    form.elements.year.value = project?.year || "";
    form.elements.thumbnail.value = project?.thumbnail || "";
    form.elements.previewImage.value = project?.previewImage || "";
    form.elements.heroImage.value = project?.heroImage || "";
    form.elements.alt.value = project?.alt || "";
    form.elements.summary.value = project?.summary || "";
    form.elements.role.value = project?.role || "";
    form.elements.featured.checked = Boolean(project?.featured);
    form.elements.published.checked = Boolean(project?.published);
    dialog.showModal();
    form.elements.title.focus();
  };

  const save = (form) => {
    const formData = new FormData(form);
    const id = String(formData.get("id") || "");
    const items = AdminStore.getProjects();
    const current = items.find((project) => String(project.id) === id);
    const title = String(formData.get("title") || "").trim();
    const slug = String(formData.get("slug") || "").trim();
    const primaryCategory = String(formData.get("category") || "").trim();
    const secondary = [...form.elements.categories.selectedOptions].map((option) => option.value);
    const primaryImage = String(formData.get("thumbnail") || "").trim();
    const imagePaths = [primaryImage, String(formData.get("previewImage") || "").trim(), String(formData.get("heroImage") || "").trim()].filter(Boolean);
    if (imagePaths.some((path) => /^(javascript:|vbscript:)/i.test(path))) throw new Error("Image paths must use local assets, image data, or HTTPS URLs.");
    if (!AdminStore.getCategories().some((category) => category.name === primaryCategory && category.kind === "Primary image")) throw new Error("Choose a category mapped to the primary project image.");
    if (secondary.some((name) => !AdminStore.getCategories().some((category) => category.name === name && category.kind === "Secondary image"))) throw new Error("Secondary project categories must use secondary image categories.");
    if (items.some((project) => project.slug.toLowerCase() === slug.toLowerCase() && String(project.id) !== id)) throw new Error("That project slug is already in use.");
    const yearValue = String(formData.get("year") || "");
    const year = yearValue ? Number(yearValue) : null;
    const next = {
      ...(current || {}),
      id: current?.id ?? projectId(),
      slug,
      title,
      category: primaryCategory,
      categories: [...new Set([primaryCategory, ...secondary])],
      thumbnail: primaryImage,
      previewImage: String(formData.get("previewImage") || "").trim(),
      heroImage: String(formData.get("heroImage") || "").trim() || primaryImage,
      alt: String(formData.get("alt") || "").trim(),
      summary: String(formData.get("summary") || "").trim(),
      role: String(formData.get("role") || "").trim(),
      year,
      featured: formData.get("featured") === "on",
      published: formData.get("published") === "on",
      updatedAt: new Date().toISOString(),
    };
    const updated = current ? items.map((project) => String(project.id) === id ? next : project) : [...items, next];
    AdminStore.saveProjects(updated);
    AdminStore.recordActivity(current ? "project-edited" : "project-created", title);
    document.getElementById("project-dialog").close();
    render();
    AdminUI.renderOverview();
    AdminUI.showToast(current ? "Project saved in this browser." : "Project added to this browser.");
  };

  const preview = (project) => {
    document.getElementById("preview-title").textContent = project.title;
    const target = document.getElementById("preview-content");
    target.replaceChildren();
    const image = document.createElement("img");
    image.className = "preview-image";
    renderImage(image, project.thumbnail, project.alt || project.title);
    const meta = document.createElement("div");
    meta.className = "preview-meta";
    meta.textContent = `${AdminUI.getPrimaryCategory(project)} · ${project.year || "Year not set"} · ${project.published ? "Published in source data" : "Draft"}`;
    const description = document.createElement("p");
    description.className = "preview-description";
    description.textContent = project.summary || "No project description.";
    const images = document.createElement("div");
    images.className = "preview-meta";
    images.textContent = `Primary: ${project.thumbnail || "Not set"} · Secondary: ${project.previewImage || "Not set"}`;
    target.append(image, meta, description, images);
    document.getElementById("preview-dialog").showModal();
  };

  const onAction = (event) => {
    const control = event.target.closest("[data-project-edit], [data-project-delete], [data-project-toggle], [data-project-preview]");
    if (!control) return;
    const id = control.dataset.projectEdit || control.dataset.projectDelete || control.dataset.projectToggle || control.dataset.projectPreview;
    const items = AdminStore.getProjects();
    const project = items.find((item) => String(item.id) === id);
    if (!project) {
      AdminUI.showToast("This project no longer exists.", true);
      render();
      return;
    }
    if (control.hasAttribute("data-project-edit")) open(project);
    if (control.hasAttribute("data-project-preview")) preview(project);
    if (control.hasAttribute("data-project-delete")) {
      if (!window.confirm(`Delete “${project.title}” from this browser’s admin data? The public website files will not change.`)) return;
      AdminStore.saveProjects(items.filter((item) => String(item.id) !== id));
      AdminStore.recordActivity("project-deleted", project.title);
      render();
      AdminUI.renderOverview();
      AdminUI.showToast("Project removed from this browser.");
    }
    if (control.hasAttribute("data-project-toggle")) {
      AdminStore.saveProjects(items.map((item) => String(item.id) === id ? { ...item, published: !item.published, updatedAt: new Date().toISOString() } : item));
      AdminStore.recordActivity(project.published ? "project-unpublished" : "project-published", project.title);
      render();
      AdminUI.renderOverview();
      AdminUI.showToast(`Project marked ${project.published ? "draft" : "published"} locally. The live site is unchanged.`);
    }
  };

  window.AdminProjects = {
    init() {
      document.getElementById("project-form").addEventListener("submit", (event) => {
        event.preventDefault();
        if (!event.currentTarget.reportValidity()) return;
        try { save(event.currentTarget); } catch (error) { AdminUI.showToast(error.message, true); }
      });
      document.getElementById("project-form").elements.primaryMedia.addEventListener("change", (event) => {
        if (event.currentTarget.value) document.getElementById("project-form").elements.thumbnail.value = event.currentTarget.value;
      });
      document.getElementById("project-form").elements.secondaryMedia.addEventListener("change", (event) => {
        if (event.currentTarget.value) document.getElementById("project-form").elements.previewImage.value = event.currentTarget.value;
      });
      document.getElementById("project-list").addEventListener("click", onAction);
      document.getElementById("project-category-filter").addEventListener("change", render);
      document.getElementById("project-status-filter").addEventListener("change", render);
      document.querySelectorAll("[data-project-view]").forEach((button) => button.addEventListener("click", () => {
        viewMode = button.dataset.projectView;
        document.querySelectorAll("[data-project-view]").forEach((option) => {
          const active = option === button;
          option.classList.toggle("is-selected", active);
          option.setAttribute("aria-pressed", String(active));
        });
        render();
      }));
    },
    render,
    open,
    refreshFilters: populateFilters,
  };
})();
