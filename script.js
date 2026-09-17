const API_BASE = "https://projects-api.apogeelab.org";

const state = {
  isAdmin: false,
  projects: [],
  project: null,
  updates: [],
  media: [],
  editingUpdateId: null,
  pendingUpdateImages: [],
  pendingGalleryImages: [],
  viewerItems: [],
  viewerIndex: 0
};

const page = document.body?.dataset?.page || "";


document.addEventListener("DOMContentLoaded", async () => {
  bindGlobalModalControls();
  bindAdminControls();

  await refreshAdminStatus();

  if (page === "home") {
    bindHomeControls();
    await loadHomeProjects();
  }

  if (page === "project") {
    bindProjectControls();
    await loadProjectPage();
    setupProjectScrollCue();
  }
});


// =========================================================
// API
// =========================================================

async function apiFetch(path, options = {}) {
  const headers = {
    ...(options.headers || {})
  };

  if (options.body && !(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    ...options,
    headers
  });

  let data = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const error = new Error(data?.error || `Request failed with status ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}


// =========================================================
// ADMIN AUTH
// =========================================================

function bindAdminControls() {
  document.querySelectorAll("[data-admin-toggle]").forEach(button => {
    button.addEventListener("click", async () => {
      if (state.isAdmin) {
        try {
          await apiFetch("/api/admin/logout", {
            method: "POST",
            body: JSON.stringify({})
          });

          setAdminMode(false);
          showToast("Admin mode signed out.");
        } catch (error) {
          showToast(error.message, true);
        }

        return;
      }

      openModal("adminModal");
      setTimeout(() => document.getElementById("adminPassword")?.focus(), 20);
    });
  });

  const form = document.getElementById("adminForm");

  if (form) {
    form.addEventListener("submit", async event => {
      event.preventDefault();

      const password = document.getElementById("adminPassword")?.value || "";
      const errorEl = document.getElementById("adminError");
      setFormError(errorEl, "");

      try {
        await apiFetch("/api/admin/login", {
          method: "POST",
          body: JSON.stringify({ password })
        });

        setAdminMode(true);
        closeModal("adminModal");
        form.reset();
        showToast("Admin mode enabled.");
      } catch (error) {
        setFormError(errorEl, error.message);
      }
    });
  }
}

async function refreshAdminStatus() {
  try {
    const result = await apiFetch("/api/admin/status", {
      method: "GET"
    });

    setAdminMode(Boolean(result?.authenticated));
  } catch {
    setAdminMode(false);
  }
}

function setAdminMode(enabled) {
  state.isAdmin = Boolean(enabled);
  document.body.classList.toggle("admin-mode", state.isAdmin);

  document.querySelectorAll(".admin-only").forEach(element => {
    element.setAttribute("aria-hidden", state.isAdmin ? "false" : "true");
  });

  document.querySelectorAll("[data-admin-toggle]").forEach(button => {
    button.textContent = state.isAdmin ? "Sign Out" : "Admin";
  });
}


// =========================================================
// HOME PAGE
// =========================================================

function bindHomeControls() {
  document.getElementById("addProjectButton")?.addEventListener("click", () => {
    prepareProjectEditor(null);
    openModal("projectEditorModal");
  });

  document.getElementById("projectEditorForm")?.addEventListener("submit", handleProjectFormSubmit);
}

async function loadHomeProjects() {
  const grid = document.getElementById("homeProjectGrid");

  try {
    const data = await apiFetch("/api/projects");
    state.projects = data.projects || [];
    renderHomeProjects();
  } catch (error) {
    if (grid) {
      grid.innerHTML = `<div class="project-empty-state"><strong>Projects unavailable</strong><span>${escapeHtml(error.message)}</span></div>`;
    }
  }
}

function renderHomeProjects() {
  const grid = document.getElementById("homeProjectGrid");
  if (!grid) return;

  if (!state.projects.length) {
    grid.innerHTML = `
      <div class="project-empty-state">
        <strong>No projects published yet.</strong>
        <span>Sign in as admin to create the first project.</span>
      </div>
    `;
    return;
  }

  grid.innerHTML = state.projects.map((project, index) => {
    const tags = (project.tags || [])
      .map(tag => `<span class="tag">${escapeHtml(tag)}</span>`)
      .join("");

    const statusClass = getStatusClass(project.status);
    const projectNumber = String(index + 1).padStart(2, "0");
    const featuredClass = index === 0 ? "featured-home" : "";
    const backgroundStyle = project.tileImageUrl
      ? `style="background-image:url('${escapeAttr(project.tileImageUrl)}');"`
      : "";
    const fallbackClass = project.tileImageUrl ? "dynamic-photo-bg" : "dynamic-fallback-bg";

    return `
      <a class="project-card home-card ${featuredClass}" href="project.html?slug=${encodeURIComponent(project.slug)}">
        <div class="card-bg ${fallbackClass}" ${backgroundStyle}></div>
        <div class="card-shade home-shade"></div>

        <div class="card-content home-card-content">
          <div class="card-top">
            <span class="project-number">PROJECT ${projectNumber}</span>
            <span class="status ${statusClass}">${escapeHtml(project.status || "Project")}</span>
          </div>

          <div class="card-main home-card-main">
            <h3>${escapeHtml(project.name)}</h3>
            <p>${escapeHtml(project.homeDescription || "")}</p>
            <div class="tags">${tags}</div>
          </div>

          <div class="card-link">
            <span>View Project</span><span>→</span>
          </div>
        </div>
      </a>
    `;
  }).join("");
}


// =========================================================
// PROJECT PAGE LOAD
// =========================================================

function bindProjectControls() {
  document.getElementById("editProjectButton")?.addEventListener("click", () => {
    prepareProjectEditor(state.project);
    openModal("projectEditorModal");
  });

  document.getElementById("newUpdateButton")?.addEventListener("click", () => {
    prepareUpdateEditor(null);
    openModal("updateEditorModal");
  });

  document.getElementById("galleryUploadButton")?.addEventListener("click", () => {
    populateGalleryUpdateSelect();
    resetPendingImageSelection("gallery");
    openModal("galleryUploadModal");
  });

  document.getElementById("projectEditorForm")?.addEventListener("submit", handleProjectFormSubmit);
  document.getElementById("updateEditorForm")?.addEventListener("submit", handleUpdateFormSubmit);
  document.getElementById("galleryUploadForm")?.addEventListener("submit", handleGalleryUploadSubmit);

  document.getElementById("updateImages")?.addEventListener("change", event => {
    addPendingImages("update", event.target.files);
    event.target.value = "";
  });

  document.getElementById("galleryImages")?.addEventListener("change", event => {
    addPendingImages("gallery", event.target.files);
    event.target.value = "";
  });

  document.getElementById("removeVideoButton")?.addEventListener("click", () => {
    const input = document.getElementById("updateYoutubeUrl");
    const title = document.getElementById("updateYoutubeTitle");
    if (input) input.value = "";
    if (title) title.value = "";
    showToast("Video will be removed when you save the update.");
  });

  document.getElementById("deleteUpdateButton")?.addEventListener("click", handleDeleteCurrentUpdate);

  document.getElementById("mediaViewerClose")?.addEventListener("click", closeMediaViewer);
  document.getElementById("mediaViewerPrev")?.addEventListener("click", () => shiftMediaViewer(-1));
  document.getElementById("mediaViewerNext")?.addEventListener("click", () => shiftMediaViewer(1));

  document.getElementById("mediaViewer")?.addEventListener("click", event => {
    if (event.target === event.currentTarget) {
      closeMediaViewer();
    }
  });
}

async function loadProjectPage() {
  const params = new URLSearchParams(window.location.search);
  const requestedSlug = params.get("slug");
  const requestedId = Number(params.get("id"));

  try {
    const allProjectsData = await apiFetch("/api/projects");
    state.projects = allProjectsData.projects || [];

    let summary = null;

    if (requestedSlug) {
      summary = state.projects.find(project => project.slug === requestedSlug) || null;
    }

    if (!summary && Number.isInteger(requestedId) && requestedId > 0) {
      summary = state.projects.find(project => project.id === requestedId) || null;
    }

    if (!summary) {
      renderProjectNotFound();
      return;
    }

    const [projectData, updatesData, mediaData] = await Promise.all([
      apiFetch(`/api/projects/${summary.id}`),
      apiFetch(`/api/projects/${summary.id}/updates`),
      apiFetch(`/api/projects/${summary.id}/media`)
    ]);

    state.project = projectData.project;
    state.updates = updatesData.updates || [];
    state.media = mediaData.media || [];

    renderProjectPage();
  } catch (error) {
    renderProjectLoadError(error);
  }
}

function renderProjectPage() {
  const project = state.project;
  if (!project) return;

  const projectIndex = Math.max(0, state.projects.findIndex(item => item.id === project.id));
  const projectNumber = String(projectIndex + 1).padStart(2, "0");

  document.title = `${project.name} — Apogee Lab Projects`;
  setText("projectTitle", project.name);
  setText("projectAbout", project.aboutDescription || "");
  setText("projectStatus", project.status || "—");
  setText("projectNumber", projectNumber);
  setText("projectStartDate", formatProjectDate(project.startDate));
  setText("projectEyebrow", `${project.tags?.[0] || "Engineering"} · Project ${projectNumber}`);
  setText("adminProjectName", `Editing ${project.name}`);

  const tagContainer = document.getElementById("projectTags");
  if (tagContainer) {
    tagContainer.innerHTML = (project.tags || [])
      .map(tag => `<span class="tag">${escapeHtml(tag)}</span>`)
      .join("");
  }

  renderProjectHero();
  renderUpdates();
  renderGallery();
  populateGalleryUpdateSelect();
  setupYouTubeVisibility();
}

function renderProjectHero() {
  const container = document.getElementById("projectHeroMedia");
  const project = state.project;
  if (!container || !project) return;

  const media = project.heroMedia;

  if (media?.type === "video") {
    container.innerHTML = `
      <iframe
        class="project-hero-video youtube-autoplay-frame"
        src="${escapeAttr(media.heroEmbedUrl)}"
        title="${escapeAttr(media.title || project.name)}"
        allow="autoplay; encrypted-media; picture-in-picture"
        allowfullscreen
        loading="eager"
        data-youtube-autoplay
      ></iframe>
    `;
    return;
  }

  if (media?.type === "image" && media.url) {
    container.innerHTML = `<img class="project-hero-image" src="${escapeAttr(media.url)}" alt="${escapeAttr(media.altText || project.name)}">`;
    return;
  }

  container.innerHTML = `
    <div class="project-hero-fallback">
      <div class="hero-fallback-mark">APOGEE LAB</div>
      <span>Project media will appear here.</span>
    </div>
  `;
}

function renderUpdates() {
  const container = document.getElementById("updatesContainer");
  if (!container) return;

  if (!state.updates.length) {
    container.innerHTML = `
      <div class="project-empty-state detail-empty-state">
        <strong>No Development Log updates yet.</strong>
        <span>${state.isAdmin ? "Use + New Update to publish the first entry." : "Development documentation will appear here."}</span>
      </div>
    `;
    return;
  }

  const [latest, ...older] = state.updates;

  container.innerHTML = `
    ${renderLatestUpdate(latest)}
    <div class="old-updates">
      ${older.map(update => renderOlderUpdate(update)).join("")}
    </div>
  `;

  container.querySelectorAll("[data-edit-update]").forEach(button => {
    button.addEventListener("click", () => {
      const updateId = Number(button.dataset.editUpdate);
      const update = state.updates.find(item => item.id === updateId);
      if (!update) return;
      prepareUpdateEditor(update);
      openModal("updateEditorModal");
    });
  });

  container.querySelectorAll("[data-delete-update]").forEach(button => {
    button.addEventListener("click", async () => {
      const updateId = Number(button.dataset.deleteUpdate);
      await deleteUpdateById(updateId);
    });
  });

  bindUpdateMediaStrips();
}

function renderLatestUpdate(update) {
  const heading = [update.versionLabel, update.title].filter(Boolean).join(" — ");
  const mediaMarkup = renderUpdateMedia(update);

  return `
    <article class="latest-update">
      <div class="update-copy">
        <div class="update-top-row">
          <div>
            <div class="update-label">★ Latest Version</div>
            <h3>${escapeHtml(heading)}</h3>
            <div class="update-date">${escapeHtml(formatDateTime(update.publishedAt))}</div>
          </div>
          <div class="update-admin-actions admin-only" aria-hidden="true">
            <button type="button" data-edit-update="${update.id}">Edit</button>
            <button class="danger-text-button" type="button" data-delete-update="${update.id}">Delete</button>
          </div>
        </div>
        <div class="update-body-copy">${formatMultilineText(update.body || "")}</div>
      </div>
      ${mediaMarkup}
    </article>
  `;
}

function renderOlderUpdate(update) {
  const heading = [update.versionLabel, update.title].filter(Boolean).join(" — ");
  const mediaMarkup = renderUpdateMedia(update);

  return `
    <article class="old-update">
      <div class="old-update-top">
        <div>
          <h4>${escapeHtml(heading)}</h4>
          <time>${escapeHtml(formatDateTime(update.publishedAt))}</time>
        </div>
        <div class="update-admin-actions admin-only" aria-hidden="true">
          <button type="button" data-edit-update="${update.id}">Edit</button>
          <button class="danger-text-button" type="button" data-delete-update="${update.id}">Delete</button>
        </div>
      </div>
      <div class="old-update-body">${formatMultilineText(update.body || "")}</div>
      ${mediaMarkup}
    </article>
  `;
}

function renderUpdateMedia(update) {
  const media = update.media || [];
  if (!media.length) return "";

  const items = media.map((item, index) => {
    const label = item.type === "video"
      ? (item.title || `Video ${index + 1}`)
      : (item.altText || `Image ${index + 1}`);

    if (item.type === "video") {
      const thumbnail = item.videoId
        ? `https://i.ytimg.com/vi/${encodeURIComponent(item.videoId)}/hqdefault.jpg`
        : "";

      return `
        <button
          class="update-media-tile update-media-video"
          type="button"
          data-update-media-index="${index}"
          aria-label="Open ${escapeAttr(label)}"
        >
          ${thumbnail
            ? `<img src="${escapeAttr(thumbnail)}" alt="" loading="lazy">`
            : `<span class="update-video-fallback"></span>`}
          <span class="update-media-play" aria-hidden="true">▶</span>
          <span class="update-media-type">VIDEO</span>
        </button>
      `;
    }

    return `
      <button
        class="update-media-tile"
        type="button"
        data-update-media-index="${index}"
        aria-label="Open ${escapeAttr(label)}"
      >
        <img src="${escapeAttr(item.url)}" alt="${escapeAttr(item.altText || update.title)}" loading="lazy">
      </button>
    `;
  }).join("");

  return `
    <div class="update-media-strip" data-update-media-strip data-update-id="${update.id}">
      ${items}
    </div>
  `;
}

function bindUpdateMediaStrips() {
  document.querySelectorAll("[data-update-media-strip]").forEach(strip => {
    const updateId = Number(strip.dataset.updateId);
    const update = state.updates.find(item => item.id === updateId);
    if (!update) return;

    strip.querySelectorAll("[data-update-media-index]").forEach(button => {
      button.addEventListener("click", () => {
        openMediaViewer(
          update.media || [],
          Number(button.dataset.updateMediaIndex)
        );
      });
    });
  });
}

function renderGallery() {
  const grid = document.getElementById("galleryGrid");
  if (!grid) return;

  if (!state.media.length) {
    grid.innerHTML = `
      <div class="project-empty-state detail-empty-state">
        <strong>No gallery media yet.</strong>
        <span>Images and videos attached to Development Log updates will collect here automatically.</span>
      </div>
    `;
    return;
  }

  grid.innerHTML = state.media.map((item, index) => {
    if (item.type === "video") {
      return `
        <button
          class="gallery-item gallery-video-item"
          type="button"
          data-gallery-media-index="${index}"
          aria-label="Open ${escapeAttr(item.title || "project video")}"
        >
          <iframe
            class="gallery-video-frame youtube-autoplay-frame"
            src="${escapeAttr(item.galleryEmbedUrl || item.embedUrl)}"
            title="${escapeAttr(item.title || "Project video")}" 
            allow="autoplay; encrypted-media; picture-in-picture"
            allowfullscreen
            loading="lazy"
            data-youtube-autoplay
            tabindex="-1"
          ></iframe>
          <span class="gallery-click-layer" aria-hidden="true"></span>
          <span class="gallery-media-badge">VIDEO</span>
        </button>
      `;
    }

    return `
      <button
        class="gallery-item gallery-photo-item"
        type="button"
        data-gallery-media-index="${index}"
        aria-label="Open project image ${index + 1}"
      >
        <img src="${escapeAttr(item.url)}" alt="${escapeAttr(item.altText || item.updateTitle || state.project?.name || "Project image")}" loading="lazy">
      </button>
    `;
  }).join("");

  grid.querySelectorAll("[data-gallery-media-index]").forEach(button => {
    button.addEventListener("click", () => {
      openMediaViewer(
        state.media,
        Number(button.dataset.galleryMediaIndex)
      );
    });
  });
}


// =========================================================
// MEDIA VIEWER / LIGHTBOX
// =========================================================

function openMediaViewer(items, index = 0) {
  if (!Array.isArray(items) || !items.length) return;

  state.viewerItems = items;
  state.viewerIndex = Math.max(0, Math.min(Number(index) || 0, items.length - 1));

  renderMediaViewer();

  const viewer = document.getElementById("mediaViewer");
  if (!viewer) return;

  viewer.classList.add("open");
  viewer.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  document.getElementById("mediaViewerClose")?.focus();
}

function closeMediaViewer() {
  const viewer = document.getElementById("mediaViewer");
  const stage = document.getElementById("mediaViewerStage");

  if (!viewer) return;

  viewer.classList.remove("open");
  viewer.setAttribute("aria-hidden", "true");

  // Removing the iframe stops YouTube playback immediately.
  if (stage) stage.innerHTML = "";

  state.viewerItems = [];
  state.viewerIndex = 0;

  if (!document.querySelector(".modal.open, .editor-modal.open, .media-viewer.open")) {
    document.body.classList.remove("modal-open");
  }
}

function shiftMediaViewer(direction) {
  const items = state.viewerItems;
  if (!items.length || items.length === 1) return;

  state.viewerIndex = (
    state.viewerIndex + direction + items.length
  ) % items.length;

  renderMediaViewer();
}

function renderMediaViewer() {
  const stage = document.getElementById("mediaViewerStage");
  const counter = document.getElementById("mediaViewerCounter");
  const caption = document.getElementById("mediaViewerCaption");
  const prev = document.getElementById("mediaViewerPrev");
  const next = document.getElementById("mediaViewerNext");

  if (!stage || !state.viewerItems.length) return;

  const item = state.viewerItems[state.viewerIndex];
  const multiple = state.viewerItems.length > 1;

  if (item.type === "video") {
    stage.innerHTML = `
      <iframe
        class="media-viewer-video"
        src="${escapeAttr(item.heroEmbedUrl || item.galleryEmbedUrl || item.embedUrl)}"
        title="${escapeAttr(item.title || "Project video")}"
        allow="autoplay; encrypted-media; picture-in-picture"
        allowfullscreen
      ></iframe>
    `;
  } else {
    stage.innerHTML = `
      <img
        class="media-viewer-image"
        src="${escapeAttr(item.url)}"
        alt="${escapeAttr(item.altText || item.updateTitle || state.project?.name || "Project image")}"
      >
    `;
  }

  if (counter) {
    counter.textContent = `${state.viewerIndex + 1} / ${state.viewerItems.length}`;
  }

  if (caption) {
    const parts = [
      item.versionLabel,
      item.updateTitle || item.title
    ].filter(Boolean);

    caption.textContent = parts.join(" — ");
    caption.hidden = !parts.length;
  }

  if (prev) prev.hidden = !multiple;
  if (next) next.hidden = !multiple;
}

// =========================================================
// PROJECT EDITOR
// =========================================================

function prepareProjectEditor(project) {
  const isEdit = Boolean(project);

  setText("projectEditorTitle", isEdit ? "Edit Project" : "Add New Project");
  setFormError(document.getElementById("projectEditorError"), "");

  setInputValue("projectName", project?.name || "");
  setInputValue("projectHomeDescription", project?.homeDescription || "");
  setInputValue("projectAboutDescription", project?.aboutDescription || "");
  setInputValue(page === "home" ? "projectTags" : "projectTagsField", (project?.tags || []).join(", "));
  setInputValue(page === "home" ? "projectStartDate" : "projectStartDateField", project?.startDate || "");
  setInputValue(page === "home" ? "projectSortOrder" : "projectSortOrderField", Number.isInteger(project?.sortOrder) ? project.sortOrder : 0);
  setInputValue(page === "home" ? "projectSlug" : "projectSlugField", project?.slug || "");

  const statusSelect = document.getElementById(page === "home" ? "projectStatus" : "projectStatusField");
  if (statusSelect) statusSelect.value = project?.status || "In Development";

  const submit = document.querySelector("#projectEditorForm button[type='submit']");
  if (submit) submit.textContent = isEdit ? "Save Changes" : "Create Project";
}

async function handleProjectFormSubmit(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const errorEl = document.getElementById("projectEditorError");
  setFormError(errorEl, "");

  const data = new FormData(form);
  const payload = {
    name: String(data.get("name") || "").trim(),
    status: String(data.get("status") || "In Development").trim(),
    homeDescription: String(data.get("homeDescription") || "").trim(),
    aboutDescription: String(data.get("aboutDescription") || "").trim(),
    tags: String(data.get("tags") || "")
      .split(",")
      .map(tag => tag.trim())
      .filter(Boolean),
    startDate: String(data.get("startDate") || "").trim() || null,
    sortOrder: Number.parseInt(String(data.get("sortOrder") || "0"), 10) || 0
  };

  const slug = String(data.get("slug") || "").trim();
  if (slug) payload.slug = slug;

  try {
    if (page === "project" && state.project) {
      const result = await apiFetch(`/api/projects/${state.project.id}`, {
        method: "PUT",
        body: JSON.stringify(payload)
      });

      state.project = result.project;
      closeModal("projectEditorModal");
      showToast("Project updated.");

      const projectsData = await apiFetch("/api/projects");
      state.projects = projectsData.projects || [];
      renderProjectPage();

      const currentSlug = new URLSearchParams(window.location.search).get("slug");
      if (currentSlug !== state.project.slug) {
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete("id");
        newUrl.searchParams.set("slug", state.project.slug);
        history.replaceState({}, "", newUrl);
      }
    } else {
      const result = await apiFetch("/api/projects", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      closeModal("projectEditorModal");
      showToast("Project created.");
      form.reset();
      await loadHomeProjects();

      if (result.project?.slug) {
        setTimeout(() => {
          window.location.href = `project.html?slug=${encodeURIComponent(result.project.slug)}`;
        }, 450);
      }
    }
  } catch (error) {
    setFormError(errorEl, error.message);
  }
}


// =========================================================
// UPDATE EDITOR
// =========================================================

function prepareUpdateEditor(update) {
  state.editingUpdateId = update?.id || null;
  const isEdit = Boolean(update);

  setText("updateEditorTitle", isEdit ? "Edit Development Update" : "New Development Update");
  setText("updateEditorSubtitle", isEdit
    ? "Edit the text, video, and image set for this Development Log entry."
    : "Add documentation, an optional YouTube video, and project images."
  );

  setInputValue("updateVersion", update?.versionLabel || "");
  setInputValue("updateTitle", update?.title || "");
  setInputValue("updateBody", update?.body || "");
  setInputValue("updateYoutubeUrl", update?.video?.watchUrl || "");
  setInputValue("updateYoutubeTitle", update?.video?.title || "");

  resetPendingImageSelection("update");

  setFormError(document.getElementById("updateEditorError"), "");

  const deleteButton = document.getElementById("deleteUpdateButton");
  const saveButton = document.getElementById("saveUpdateButton");

  if (deleteButton) deleteButton.hidden = !isEdit;
  if (saveButton) saveButton.textContent = isEdit ? "Save Update" : "Publish Update";

  renderExistingImages(update?.images || []);
}

function resetPendingImageSelection(kind) {
  if (kind === "update") {
    state.pendingUpdateImages = [];
    const input = document.getElementById("updateImages");
    if (input) input.value = "";
    renderPendingImages("update");
    return;
  }

  state.pendingGalleryImages = [];
  const input = document.getElementById("galleryImages");
  if (input) input.value = "";
  renderPendingImages("gallery");
}

function addPendingImages(kind, fileList) {
  const incoming = [...(fileList || [])];
  if (!incoming.length) return;

  const pending = kind === "update"
    ? state.pendingUpdateImages
    : state.pendingGalleryImages;

  const errorEl = document.getElementById(
    kind === "update" ? "updateEditorError" : "galleryUploadError"
  );

  setFormError(errorEl, "");

  const existingKeys = new Set(
    pending.map(file => `${file.name}|${file.size}|${file.lastModified}`)
  );

  let duplicateCount = 0;
  let limitCount = 0;

  for (const file of incoming) {
    const key = `${file.name}|${file.size}|${file.lastModified}`;

    if (existingKeys.has(key)) {
      duplicateCount++;
      continue;
    }

    if (pending.length >= 6) {
      limitCount++;
      continue;
    }

    pending.push(file);
    existingKeys.add(key);
  }

  renderPendingImages(kind);

  if (limitCount > 0) {
    setFormError(
      errorEl,
      "You can queue up to 6 new images at once. Publish or upload these first, then add more afterward."
    );
  } else if (duplicateCount > 0) {
    showToast(duplicateCount === 1
      ? "That image was already selected."
      : `${duplicateCount} already-selected images were skipped.`
    );
  }
}

function renderPendingImages(kind) {
  const pending = kind === "update"
    ? state.pendingUpdateImages
    : state.pendingGalleryImages;

  const container = document.getElementById(
    kind === "update" ? "updatePendingImages" : "galleryPendingImages"
  );

  const field = document.getElementById(
    kind === "update" ? "updatePendingImagesField" : "galleryPendingImagesField"
  );

  const count = document.getElementById(
    kind === "update" ? "updatePendingImagesCount" : "galleryPendingImagesCount"
  );

  if (!container || !field) return;

  if (!pending.length) {
    field.hidden = true;
    container.innerHTML = "";
    if (count) count.textContent = "";
    return;
  }

  field.hidden = false;
  if (count) count.textContent = `${pending.length} / 6 selected`;

  container.innerHTML = pending.map((file, index) => `
    <div class="pending-image-item" data-pending-image-index="${index}">
      <img alt="" class="pending-image-preview">
      <span class="pending-image-name">${escapeHtml(file.name)}</span>
      <button
        type="button"
        class="remove-image-button pending-remove-button"
        data-remove-pending-image="${index}"
      >Remove</button>
    </div>
  `).join("");

  container.querySelectorAll("[data-pending-image-index]").forEach(item => {
    const index = Number(item.dataset.pendingImageIndex);
    const image = item.querySelector(".pending-image-preview");
    const file = pending[index];
    if (!image || !file) return;

    const objectUrl = URL.createObjectURL(file);
    image.src = objectUrl;
    image.addEventListener("load", () => URL.revokeObjectURL(objectUrl), { once: true });
    image.addEventListener("error", () => URL.revokeObjectURL(objectUrl), { once: true });
  });

  container.querySelectorAll("[data-remove-pending-image]").forEach(button => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.removePendingImage);
      pending.splice(index, 1);
      renderPendingImages(kind);
    });
  });
}

function renderExistingImages(images) {
  const field = document.getElementById("existingImagesField");
  const grid = document.getElementById("existingImages");

  if (!field || !grid) return;

  if (!images.length) {
    field.hidden = true;
    grid.innerHTML = "";
    return;
  }

  field.hidden = false;
  grid.innerHTML = images.map(image => `
    <div class="existing-image-item">
      <img src="${escapeAttr(image.url)}" alt="">
      <button type="button" class="remove-image-button" data-remove-image="${image.id}">Remove</button>
    </div>
  `).join("");

  grid.querySelectorAll("[data-remove-image]").forEach(button => {
    button.addEventListener("click", async () => {
      const imageId = Number(button.dataset.removeImage);
      if (!window.confirm("Remove this image from the update and gallery?")) return;

      try {
        await apiFetch(`/api/images/${imageId}`, {
          method: "DELETE",
          body: JSON.stringify({})
        });

        await refreshProjectData();

        const update = state.updates.find(item => item.id === state.editingUpdateId);
        renderExistingImages(update?.images || []);
        showToast("Image removed.");
      } catch (error) {
        showToast(error.message, true);
      }
    });
  });
}

async function handleUpdateFormSubmit(event) {
  event.preventDefault();

  if (!state.project) return;

  const errorEl = document.getElementById("updateEditorError");
  setFormError(errorEl, "");

  const payload = {
    versionLabel: document.getElementById("updateVersion")?.value.trim() || "",
    title: document.getElementById("updateTitle")?.value.trim() || "",
    body: document.getElementById("updateBody")?.value.trim() || "",
    youtubeUrl: document.getElementById("updateYoutubeUrl")?.value.trim() || "",
    youtubeTitle: document.getElementById("updateYoutubeTitle")?.value.trim() || ""
  };

  const files = [...state.pendingUpdateImages];

  try {
    let updateId = state.editingUpdateId;

    if (updateId) {
      await apiFetch(`/api/updates/${updateId}`, {
        method: "PUT",
        body: JSON.stringify(payload)
      });
    } else {
      const created = await apiFetch(`/api/projects/${state.project.id}/updates`, {
        method: "POST",
        body: JSON.stringify(payload)
      });

      updateId = created.update.id;
    }

    if (files.length) {
      await uploadImagesToUpdate(updateId, files);
    }

    resetPendingImageSelection("update");
    closeModal("updateEditorModal");
    await refreshProjectData();
    showToast(state.editingUpdateId ? "Update saved." : "Update published.");
    state.editingUpdateId = null;
  } catch (error) {
    setFormError(errorEl, error.message);
  }
}

async function handleDeleteCurrentUpdate() {
  if (!state.editingUpdateId) return;
  await deleteUpdateById(state.editingUpdateId, true);
}

async function deleteUpdateById(updateId, closeEditor = false) {
  if (!window.confirm("Delete this Development Log update? Its uploaded images will also be removed.")) {
    return;
  }

  try {
    await apiFetch(`/api/updates/${updateId}`, {
      method: "DELETE",
      body: JSON.stringify({})
    });

    if (closeEditor) closeModal("updateEditorModal");
    state.editingUpdateId = null;
    await refreshProjectData();
    showToast("Development update deleted.");
  } catch (error) {
    showToast(error.message, true);
  }
}


// =========================================================
// GALLERY UPLOAD
// =========================================================

function populateGalleryUpdateSelect() {
  const select = document.getElementById("galleryUpdateSelect");
  if (!select) return;

  if (!state.updates.length) {
    select.innerHTML = `<option value="">Create a Development Log update first</option>`;
    select.disabled = true;
    return;
  }

  select.disabled = false;
  select.innerHTML = state.updates.map(update => {
    const label = [update.versionLabel, update.title].filter(Boolean).join(" — ");
    return `<option value="${update.id}">${escapeHtml(label)}</option>`;
  }).join("");
}

async function handleGalleryUploadSubmit(event) {
  event.preventDefault();

  const errorEl = document.getElementById("galleryUploadError");
  setFormError(errorEl, "");

  const updateId = Number(document.getElementById("galleryUpdateSelect")?.value);
  const files = [...state.pendingGalleryImages];

  if (!updateId || !files.length) {
    setFormError(errorEl, "Choose a Development Log update and at least one image.");
    return;
  }

  try {
    await uploadImagesToUpdate(updateId, files);
    resetPendingImageSelection("gallery");
    closeModal("galleryUploadModal");
    event.currentTarget.reset();
    await refreshProjectData();
    showToast("Images uploaded.");
  } catch (error) {
    setFormError(errorEl, error.message);
  }
}

async function uploadImagesToUpdate(updateId, files) {
  const form = new FormData();

  [...files].forEach(file => {
    form.append("images", file);
  });

  return apiFetch(`/api/updates/${updateId}/images`, {
    method: "POST",
    body: form
  });
}


// =========================================================
// PROJECT DATA REFRESH
// =========================================================

async function refreshProjectData() {
  if (!state.project) return;

  const projectId = state.project.id;

  const [projectData, updatesData, mediaData, projectsData] = await Promise.all([
    apiFetch(`/api/projects/${projectId}`),
    apiFetch(`/api/projects/${projectId}/updates`),
    apiFetch(`/api/projects/${projectId}/media`),
    apiFetch("/api/projects")
  ]);

  state.project = projectData.project;
  state.updates = updatesData.updates || [];
  state.media = mediaData.media || [];
  state.projects = projectsData.projects || [];

  renderProjectPage();
}


// =========================================================
// YOUTUBE VISIBILITY PLAY/PAUSE
// =========================================================

let youtubeObserver = null;

function setupYouTubeVisibility() {
  if (!("IntersectionObserver" in window)) return;

  if (youtubeObserver) {
    youtubeObserver.disconnect();
  }

  youtubeObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const iframe = entry.target;

      if (!iframe.contentWindow) return;

      const command = entry.isIntersecting && entry.intersectionRatio >= 0.35
        ? "playVideo"
        : "pauseVideo";

      iframe.contentWindow.postMessage(
        JSON.stringify({
          event: "command",
          func: command,
          args: []
        }),
        "https://www.youtube.com"
      );
    });
  }, {
    threshold: [0, 0.35, 0.75]
  });

  document.querySelectorAll("iframe[data-youtube-autoplay]").forEach(iframe => {
    youtubeObserver.observe(iframe);
  });
}


// =========================================================
// PROJECT SCROLL CUE
// =========================================================

function setupProjectScrollCue() {
  const cue = document.querySelector(".project-scroll-cue");
  const updatesSection = document.getElementById("updates");

  if (!cue || !updatesSection) return;

  let dismissed = false;

  const hideCue = () => {
    if (dismissed) return;
    dismissed = true;
    cue.classList.add("is-hidden");
  };

  const checkProgress = () => {
    if (dismissed) return;

    const updatesTop =
      updatesSection.getBoundingClientRect().top + window.scrollY;

    const updatesMidpoint =
      updatesTop + updatesSection.offsetHeight * 0.5;

    const viewportReadingPoint =
      window.scrollY + window.innerHeight * 0.5;

    if (viewportReadingPoint >= updatesMidpoint) {
      hideCue();
      window.removeEventListener("scroll", checkProgress);
      window.removeEventListener("resize", checkProgress);
    }
  };

  cue.addEventListener("click", () => {
    requestAnimationFrame(checkProgress);
  });

  window.addEventListener("scroll", checkProgress, { passive: true });
  window.addEventListener("resize", checkProgress);
  checkProgress();
}


// =========================================================
// MODALS + UI HELPERS
// =========================================================

function bindGlobalModalControls() {
  document.querySelectorAll("[data-close-modal]").forEach(button => {
    button.addEventListener("click", () => {
      closeModal(button.dataset.closeModal);
    });
  });

  document.querySelectorAll(".modal, .editor-modal").forEach(modal => {
    modal.addEventListener("click", event => {
      if (event.target === modal) {
        closeModal(modal.id);
      }
    });
  });

  document.addEventListener("keydown", event => {
    const viewer = document.getElementById("mediaViewer");
    const viewerOpen = viewer?.classList.contains("open");

    if (viewerOpen && event.key === "ArrowLeft") {
      event.preventDefault();
      shiftMediaViewer(-1);
      return;
    }

    if (viewerOpen && event.key === "ArrowRight") {
      event.preventDefault();
      shiftMediaViewer(1);
      return;
    }

    if (event.key !== "Escape") return;

    if (viewerOpen) {
      closeMediaViewer();
      return;
    }

    document.querySelectorAll(".modal.open, .editor-modal.open").forEach(modal => {
      closeModal(modal.id);
    });
  });
}

function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");

  if (!document.querySelector(".modal.open, .editor-modal.open")) {
    document.body.classList.remove("modal-open");
  }
}

function showToast(message, isError = false) {
  const toast = document.getElementById("toast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.toggle("error", isError);
  toast.classList.add("show");

  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    toast.classList.remove("show");
  }, 3200);
}

function setFormError(element, message) {
  if (!element) return;
  element.textContent = message || "";
  element.hidden = !message;
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value ?? "";
}

function setInputValue(id, value) {
  const element = document.getElementById(id);
  if (element) element.value = value ?? "";
}

function renderProjectNotFound() {
  document.title = "Project Not Found — Apogee Lab Projects";
  setText("projectTitle", "Project Not Found");
  setText("projectAbout", "This project does not exist in the current portfolio database.");

  const hero = document.getElementById("projectHeroMedia");
  if (hero) hero.innerHTML = `<div class="project-hero-fallback"><span>Return to All Projects</span></div>`;

  const updates = document.getElementById("updatesContainer");
  if (updates) updates.innerHTML = `<div class="project-empty-state"><a href="index.html">← Back to Projects</a></div>`;

  const gallery = document.getElementById("galleryGrid");
  if (gallery) gallery.innerHTML = "";
}

function renderProjectLoadError(error) {
  setText("projectTitle", "Unable to Load Project");
  setText("projectAbout", error.message || "The project API could not be reached.");

  const updates = document.getElementById("updatesContainer");
  if (updates) updates.innerHTML = `<div class="project-empty-state"><strong>Development Log unavailable.</strong></div>`;

  const gallery = document.getElementById("galleryGrid");
  if (gallery) gallery.innerHTML = "";
}

function getStatusClass(status = "") {
  const value = status.toLowerCase();
  if (value.includes("complete") || value.includes("functional")) return "done";
  if (value.includes("team")) return "team";
  return "dev";
}

function formatProjectDate(value) {
  if (!value) return "—";

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    year: "numeric"
  }).format(date);
}

function formatDateTime(value) {
  if (!value) return "";

  const normalized = value.includes("T")
    ? value
    : `${value.replace(" ", "T")}Z`;

  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(date);
}

function formatMultilineText(value) {
  return escapeHtml(value).replace(/\n/g, "<br>");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}
