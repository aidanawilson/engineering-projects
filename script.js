
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
