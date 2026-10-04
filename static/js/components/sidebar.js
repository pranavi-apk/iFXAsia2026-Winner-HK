import { $$ } from "../core/dom.js";

// Builds the sidebar from the section registry, so adding a section to
// sections/index.js adds its nav entry. Callbacks come from main.js.
export function mountSidebar(host, { sections, activeId, onSelect }) {
  host.innerHTML = `
    <nav class="sidebar-nav">
      ${sections
        .map(
          (s) => `
      <button class="nav-item${s.id === activeId ? " active" : ""}" data-section="${s.id}">
        <span class="nav-label">${s.label}</span>
      </button>`
        )
        .join("")}
    </nav>`;

  host.querySelector(".sidebar-nav").addEventListener("click", (e) => {
    const button = e.target.closest(".nav-item");
    if (!button) return;
    setActiveNav(button.dataset.section);
    onSelect(button.dataset.section);
  });
}

export function setActiveNav(sectionId) {
  $$(".sidebar-nav .nav-item").forEach((button) => {
    button.classList.toggle("active", button.dataset.section === sectionId);
  });
}
