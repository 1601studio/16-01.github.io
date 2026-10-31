(() => {
  const render = () => {
    const categories = AdminStore.getCategories();
    const projects = AdminStore.getProjects();
    document.getElementById("category-total").textContent = `(${categories.length})`;
    const target = document.getElementById("category-list");
    if (!categories.length) {
      target.innerHTML = `<div class="panel">${AdminUI.escapeHTML("No categories yet. Add one to organize projects.")}</div>`;
      return;
    }
    target.innerHTML = categories.map((category) => {
      const count = projects.filter((project) => AdminUI.getProjectCategories(project).includes(category.name)).length;
      const canDelete = count === 0;
      const sample = projects.find((project) => AdminUI.getProjectCategories(project).includes(category.name));
      const image = sample?.thumbnail ? `<img src="${AdminUI.escapeHTML(AdminUI.imageSource(sample.thumbnail))}" alt="" loading="lazy" />` : `<span>No project preview</span>`;
      return `<article class="category-card"><div class="category-card__top"><div><h3>${AdminUI.escapeHTML(category.name)}</h3><span class="manual-tag">${AdminUI.escapeHTML(category.kind)}</span></div><div class="category-actions"><button class="small-button" type="button" data-category-edit="${AdminUI.escapeHTML(category.name)}">Edit</button><button class="small-button small-button--danger" type="button" data-category-delete="${AdminUI.escapeHTML(category.name)}" ${canDelete ? "" : `aria-label="Cannot delete ${AdminUI.escapeHTML(category.name)} because projects use it"`}>Delete</button></div></div><div class="category-preview">${image}</div><p>${AdminUI.escapeHTML(category.description || "No category description.")}</p><div class="category-card__bottom"><span>${count} ${count === 1 ? "project" : "projects"}</span><span>${canDelete ? "Unused" : "Assigned · deletion blocked"}</span></div></article>`;
    }).join("");
    target.querySelectorAll("[data-category-delete]").forEach((button) => {
      const inUse = projects.some((project) => AdminUI.getProjectCategories(project).includes(button.dataset.categoryDelete));
      if (inUse) {
        button.disabled = true;
        button.title = "Reassign or remove this category from all projects before deleting it.";
      }
    });
  };

  const open = (category = null) => {
    const form = document.getElementById("category-form");
    form.reset();
    form.elements.originalName.value = category?.name || "";
    form.elements.name.value = category?.name || "";
    form.elements.description.value = category?.description || "";
    form.elements.kind.value = category?.kind || "Secondary image";
    document.getElementById("category-dialog-title").textContent = category ? "Edit category" : "Add category";
    document.getElementById("category-dialog").showModal();
    form.elements.name.focus();
  };

  const onClick = (event) => {
    const edit = event.target.closest("[data-category-edit]");
    const remove = event.target.closest("[data-category-delete]");
    if (edit) open(AdminStore.getCategories().find((category) => category.name === edit.dataset.categoryEdit));
    if (remove) {
      const categoryName = remove.dataset.categoryDelete;
      const current = AdminStore.getCategories();
      const inUse = AdminStore.getProjects().some((project) => AdminUI.getProjectCategories(project).includes(categoryName));
      if (inUse) {
        AdminUI.showToast("Reassign this category from every project before deleting it.", true);
        return;
      }
      if (!window.confirm(`Delete the unused “${categoryName}” category from this browser?`)) return;
      try {
        AdminStore.saveCategories(current.filter((category) => category.name !== categoryName));
        AdminStore.recordActivity("category-deleted", categoryName);
        AdminUI.renderOverview();
        window.AdminProjects.render();
        render();
        AdminUI.showToast("Category deleted from this browser.");
      } catch (error) {
        AdminUI.showToast(error.message, true);
      }
    }
  };

  window.AdminCategories = {
    init() {
      document.getElementById("category-list").addEventListener("click", onClick);
      document.getElementById("category-form").addEventListener("submit", (event) => {
        event.preventDefault();
        if (!event.currentTarget.reportValidity()) return;
        const form = event.currentTarget;
        const originalName = form.elements.originalName.value;
        const name = form.elements.name.value.trim();
        const description = form.elements.description.value.trim();
        const kind = form.elements.kind.value;
        const categories = AdminStore.getCategories();
        if (categories.some((category) => category.name.toLowerCase() === name.toLowerCase() && category.name !== originalName)) {
          AdminUI.showToast("That category name already exists.", true);
          return;
        }
        const previous = categories.find((category) => category.name === originalName);
        const projectsUsingCategory = AdminStore.getProjects().filter((project) => AdminUI.getProjectCategories(project).includes(originalName));
        if (previous && previous.kind !== kind && projectsUsingCategory.length) {
          AdminUI.showToast("Reassign this category from all projects before changing its image mapping.", true);
          return;
        }
        const nextCategory = { name, description, kind };
        const updatedCategories = originalName
          ? categories.map((category) => category.name === originalName ? nextCategory : category)
          : [...categories, nextCategory];
        try {
          AdminStore.saveCategories(updatedCategories);
          if (!originalName) AdminStore.recordActivity("category-added", name);
          if (originalName && originalName !== name) {
            AdminStore.saveProjects(AdminStore.getProjects().map((project) => ({
              ...project,
              category: project.category === originalName ? name : project.category,
              categories: [...new Set((project.categories || []).map((item) => item === originalName ? name : item))],
              updatedAt: AdminUI.getProjectCategories(project).includes(originalName) ? new Date().toISOString() : project.updatedAt,
            })));
            AdminStore.recordActivity("category-renamed", `${originalName} → ${name}`);
          }
          document.getElementById("category-dialog").close();
          render();
          window.AdminProjects.refreshFilters();
          window.AdminProjects.render();
          AdminUI.renderOverview();
          AdminUI.showToast(originalName ? "Category updated in this browser." : "Category added in this browser.");
        } catch (error) {
          AdminUI.showToast(error.message, true);
        }
      });
    },
    render,
    open,
  };
})();
