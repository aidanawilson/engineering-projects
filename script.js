
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
    // Backend authentication will be connected in the next implementation phase.
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


// =========================================================
// V7 project-page viewport scroll cue
// =========================================================

const projectScrollCue = document.querySelector(".project-scroll-cue");
const projectUpdatesSection = document.getElementById("updates");

if (projectScrollCue && projectUpdatesSection) {
  let projectScrollCueDismissed = false;

  const hideProjectScrollCue = () => {
    if (projectScrollCueDismissed) return;
    projectScrollCueDismissed = true;
    projectScrollCue.classList.add("is-hidden");
  };

  /*
    Keep the cue visible through the beginning of the Development Log.
    It hides only after the user's VIEWPORT CENTER has progressed at least
    halfway through the Updates section.

    Using the viewport center makes this behave consistently across:
    - phones
    - split-screen windows
    - laptops
    - large desktop monitors
  */
  const checkProjectScrollProgress = () => {
    if (projectScrollCueDismissed) return;

    const updatesTop =
      projectUpdatesSection.getBoundingClientRect().top + window.scrollY;

    const updatesHeight = projectUpdatesSection.offsetHeight;
    const updatesMidpoint = updatesTop + updatesHeight * 0.5;

    const viewportReadingPoint =
      window.scrollY + window.innerHeight * 0.5;

    if (viewportReadingPoint >= updatesMidpoint) {
      hideProjectScrollCue();
      window.removeEventListener("scroll", checkProjectScrollProgress);
      window.removeEventListener("resize", checkProjectScrollProgress);
    }
  };

  /*
    Clicking the cue scrolls to the Development Log, but DOES NOT hide it.
    It stays visible until the user actually progresses halfway through
    the Updates section.
  */
  projectScrollCue.addEventListener("click", () => {
    requestAnimationFrame(checkProjectScrollProgress);
  });

  window.addEventListener("scroll", checkProjectScrollProgress, { passive: true });
  window.addEventListener("resize", checkProjectScrollProgress);

  // Evaluate immediately for restored scroll positions or direct anchors.
  checkProjectScrollProgress();
}
