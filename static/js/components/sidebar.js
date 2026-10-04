import { $$ } from "../core/dom.js";
import { icon } from "../lib/icons.js";

// Builds the sidebar from the section registry, so adding a section to
// sections/index.js adds its nav entry. Callbacks come from main.js.
export function mountSidebar(host, { sections, activeId, onSelect, onSample, onUpload }) {
  host.innerHTML = `
    <div class="sidebar-top">
      <a href="/" class="back-link">
        ${icon("back", 14, { strokeWidth: 2.5 })}
        Back to Case
      </a>
    </div>

    <nav class="sidebar-nav">
      ${sections
        .map(
          (s) => `
      <button class="nav-item${s.id === activeId ? " active" : ""}" data-section="${s.id}">
        <span class="nav-num${s.done ? " check-icon" : ""}">${s.done ? icon("check", 12, { strokeWidth: 3 }) : s.step}</span>
        <span class="nav-label">${s.label}</span>
      </button>`
        )
        .join("")}
    </nav>

    <div class="sidebar-footer">
      <button id="sample" type="button" class="btn-sidebar">
        ${icon("play", 14)}
        Demo Case
      </button>
      <label class="btn-sidebar upload-btn">
        ${icon("upload", 14)}
        Upload Pack
        <input id="files" type="file" accept="application/pdf" multiple />
      </label>
    </div>`;

  host.querySelector(".sidebar-nav").addEventListener("click", (e) => {
    const button = e.target.closest(".nav-item");
    if (!button) return;
    setActiveNav(button.dataset.section);
    onSelect(button.dataset.section);
  });
  host.querySelector("#sample").addEventListener("click", onSample);
  host.querySelector("#files").addEventListener("change", (e) => onUpload(e.target.files));
}

export function setActiveNav(sectionId) {
  $$(".sidebar-nav .nav-item").forEach((button) => {
    button.classList.toggle("active", button.dataset.section === sectionId);
  });
}

export function setSampleDisabled(disabled) {
  const button = document.querySelector("#sample");
  if (button) button.disabled = disabled;
}
