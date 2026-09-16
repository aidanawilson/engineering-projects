
const adminModal = document.getElementById("adminModal");
const adminButtons = document.querySelectorAll("[data-open-admin]");
const closeAdmin = document.getElementById("closeAdmin");
const adminForm = document.getElementById("adminForm");

adminButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (!adminModal) return;
    adminModal.classList.add("open");
    adminModal.setAttribute("aria-hidden", "false");
    const input = adminModal.querySelector("input");
    if (input) setTimeout(() => input.focus(), 20);
  });
});

if (closeAdmin) {
  closeAdmin.addEventListener("click", () => {
    adminModal.classList.remove("open");
    adminModal.setAttribute("aria-hidden", "true");
  });
}

if (adminModal) {
  adminModal.addEventListener("click", (event) => {
    if (event.target === adminModal) {
      adminModal.classList.remove("open");
      adminModal.setAttribute("aria-hidden", "true");
    }
  });
}

if (adminForm) {
  adminForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const message = document.getElementById("adminPrototypeMessage");
    if (message) {
      message.textContent = "Frontend prototype only — login will be connected to the Projects Worker in the backend phase.";
    }
  });
}


// =========================================================
// Frontend-only admin UI preview
// =========================================================
// Until the Worker is connected, append ?admin=preview to any
// Projects URL to preview the inline admin editing controls.
// This does NOT authenticate or persist data.

const params = new URLSearchParams(window.location.search);
if (params.get("admin") === "preview") {
  document.body.classList.add("admin-mode");
  document.querySelectorAll(".admin-only").forEach((el) => {
    el.setAttribute("aria-hidden", "false");
  });
}

document.querySelectorAll("[data-open-editor]").forEach((button) => {
  button.addEventListener("click", () => {
    const id = button.getAttribute("data-open-editor");
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
  });
});

document.querySelectorAll("[data-close-editor]").forEach((button) => {
  button.addEventListener("click", () => {
    const id = button.getAttribute("data-close-editor");
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
  });
});

document.querySelectorAll(".editor-modal").forEach((modal) => {
  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      modal.classList.remove("open");
      modal.setAttribute("aria-hidden", "true");
    }
  });
});

document.querySelectorAll("[data-prototype-save]").forEach((button) => {
  button.addEventListener("click", () => {
    button.textContent = "Backend not connected yet";
    setTimeout(() => {
      button.textContent = button.closest("#newProjectModal") ? "Create Project" : "Save Changes";
    }, 1600);
  });
});
