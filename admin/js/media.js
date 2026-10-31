(() => {
  const maxBytes = 250 * 1024;
  const formatBytes = (size) => {
    if (!Number.isFinite(size) || size <= 0) return "Repository file";
    return size < 1024 * 1024 ? `${(size / 1024).toFixed(0)} KB` : `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };
  const dimensions = (item) => item.width && item.height ? `${item.width} × ${item.height}` : "Dimensions unavailable";
  const usedBy = (path) => AdminStore.getProjects().filter((project) => [project.thumbnail, project.previewImage, project.heroImage].includes(path));

  const render = () => {
    const items = AdminStore.getMedia();
    const query = document.getElementById("media-search").value.trim().toLowerCase();
    const filtered = items.filter((item) => `${item.name} ${item.path}`.toLowerCase().includes(query));
    document.getElementById("media-total").textContent = `(${filtered.length}${filtered.length !== items.length ? ` of ${items.length}` : ""})`;
    const target = document.getElementById("media-grid");
    if (!filtered.length) {
      target.innerHTML = `<div class="panel">${items.length ? `<div class="empty-state"><strong>No matching files</strong><span>Try a different filename or path.</span></div>` : `<div class="empty-state"><strong>No images in the library</strong><span>Upload an image or add a project image path.</span></div>`}</div>`;
      return;
    }
    target.innerHTML = filtered.map((item) => {
      const count = usedBy(item.path).length;
      const isRepository = item.type === "repository";
      return `<article class="media-card" data-media-item="${AdminUI.escapeHTML(item.id)}"><div class="media-card__preview"><img src="${AdminUI.escapeHTML(AdminUI.imageSource(item.path))}" alt="${AdminUI.escapeHTML(item.name)}" loading="lazy" /><span class="media-card__kind">${isRepository ? "Repository asset" : "Local upload"}</span></div><div class="media-card__body"><div class="media-card__filename" title="${AdminUI.escapeHTML(item.name)}">${AdminUI.escapeHTML(item.name)}</div><div class="media-card__details"><span data-media-dimensions="${AdminUI.escapeHTML(item.id)}">${AdminUI.escapeHTML(dimensions(item))}</span><span>${formatBytes(item.size)}</span></div><div class="media-card__path" title="${AdminUI.escapeHTML(item.path)}">${AdminUI.escapeHTML(item.path)}</div><div class="media-card__actions"><button class="small-button" type="button" data-media-preview="${AdminUI.escapeHTML(item.id)}">Preview</button><button class="small-button" type="button" data-media-copy="${AdminUI.escapeHTML(item.id)}">Copy path</button><button class="small-button small-button--danger" type="button" data-media-delete="${AdminUI.escapeHTML(item.id)}" ${count ? "disabled" : ""} title="${count ? `Used by ${count} project(s); reassign the image before removing it.` : ""}">${isRepository ? "Remove" : "Delete"}</button></div></div></article>`;
    }).join("");
    target.querySelectorAll(".media-card__preview img").forEach((image) => {
      const card = image.closest(".media-card");
      const item = filtered.find((entry) => entry.id === card.dataset.mediaItem);
      image.addEventListener("load", () => {
        if (!item || (item.width && item.height)) return;
        const current = AdminStore.getMedia();
        const index = current.findIndex((entry) => entry.id === item.id);
        if (index < 0) return;
        current[index] = { ...current[index], width: image.naturalWidth, height: image.naturalHeight };
        try {
          AdminStore.saveMedia(current);
          const label = target.querySelector(`[data-media-dimensions="${CSS.escape(item.id)}"]`);
          if (label) label.textContent = `${image.naturalWidth} × ${image.naturalHeight}`;
        } catch (error) {
          AdminUI.showToast(error.message, true);
        }
      }, { once: true });
      image.addEventListener("error", () => {
        image.replaceWith(Object.assign(document.createElement("div"), { className: "no-image", innerHTML: "Image unavailable<span>Check asset path</span>" }));
      }, { once: true });
    });
  };

  const preview = (item) => {
    document.getElementById("preview-title").textContent = item.name;
    const target = document.getElementById("preview-content");
    target.replaceChildren();
    const image = document.createElement("img");
    image.className = "preview-image";
    AdminUI.setImage(image, item.path, item.name);
    const meta = document.createElement("div");
    meta.className = "preview-meta";
    meta.textContent = `${dimensions(item)} · ${formatBytes(item.size)} · ${item.type === "repository" ? "Read-only repository asset" : "Browser-local upload"}`;
    const path = document.createElement("p");
    path.className = "preview-description";
    path.textContent = item.path;
    target.append(image, meta, path);
    document.getElementById("preview-dialog").showModal();
  };

  const deleteImage = (item) => {
    const references = usedBy(item.path);
    if (references.length) {
      AdminUI.showToast(`This image is assigned to ${references.length} project(s). Reassign it first.`, true);
      return;
    }
    const action = item.type === "repository" ? "Remove this repository asset from the browser-local library? The file itself will remain in the repository." : "Delete this browser-local upload?";
    if (!window.confirm(action)) return;
    try {
      AdminStore.saveMedia(AdminStore.getMedia().filter((entry) => entry.id !== item.id));
      AdminStore.recordActivity("media-removed", item.name);
      render();
      AdminUI.showToast(item.type === "repository" ? "Removed from the local library. Repository file was not changed." : "Local upload deleted.");
    } catch (error) {
      AdminUI.showToast(error.message, true);
    }
  };

  const copyPath = async (item) => {
    try {
      await navigator.clipboard.writeText(item.path);
      AdminUI.showToast("Image path copied.");
    } catch (error) {
      AdminUI.showToast("Could not access the clipboard. Select and copy the path from the image preview.", true);
    }
  };

  const loadFile = (file) => new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error(`${file.name}: select an image file.`));
      return;
    }
    if (file.size > maxBytes) {
      reject(new Error(`${file.name}: file exceeds the 250 KB local upload limit. Browser storage is limited.`));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`${file.name}: the browser could not read this file.`));
    reader.onload = () => {
      const path = String(reader.result);
      const image = new Image();
      image.onload = () => resolve({
        id: `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        path,
        name: file.name,
        type: "upload",
        mimeType: file.type,
        size: file.size,
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
      image.onerror = () => reject(new Error(`${file.name}: this image could not be decoded.`));
      image.src = path;
    };
    reader.readAsDataURL(file);
  });

  window.AdminMedia = {
    init() {
      document.getElementById("media-search").addEventListener("input", render);
      document.getElementById("media-grid").addEventListener("click", async (event) => {
        const control = event.target.closest("[data-media-preview], [data-media-copy], [data-media-delete]");
        if (!control) return;
        const id = control.dataset.mediaPreview || control.dataset.mediaCopy || control.dataset.mediaDelete;
        const item = AdminStore.getMedia().find((entry) => entry.id === id);
        if (!item) {
          AdminUI.showToast("This media item is no longer available.", true);
          render();
          return;
        }
        if (control.hasAttribute("data-media-preview")) preview(item);
        if (control.hasAttribute("data-media-copy")) await copyPath(item);
        if (control.hasAttribute("data-media-delete")) deleteImage(item);
      });
      document.getElementById("media-upload").addEventListener("change", async (event) => {
        const files = [...event.currentTarget.files];
        event.currentTarget.value = "";
        if (!files.length) return;
        const newItems = [];
        for (const file of files) {
          try { newItems.push(await loadFile(file)); }
          catch (error) { AdminUI.showToast(error.message, true); }
        }
        if (!newItems.length) return;
        try {
          const existing = AdminStore.getMedia();
          AdminStore.saveMedia([...existing, ...newItems]);
          AdminStore.recordActivity("media-uploaded", `${newItems.length} image(s)`);
          render();
          AdminUI.showToast(`${newItems.length} image${newItems.length === 1 ? "" : "s"} saved in this browser.`);
        } catch (error) {
          AdminUI.showToast(error.message, true);
        }
      });
    },
    render,
  };
})();
