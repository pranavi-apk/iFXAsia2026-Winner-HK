import { pageHeader } from "../components/page-header.js";

// Scaffold for a section that has no screen yet. Replace a section's
// `createPlaceholder(...)` call with a real `{ id, step, label, mount }`.
export function createPlaceholder({ id, step, label, title, subtitle, done = false }) {
  return {
    id,
    step,
    label,
    done,
    mount(container) {
      container.innerHTML = `
        ${pageHeader({ title, subtitle })}
        <div class="card-panel section-placeholder">
          <h2>${label}</h2>
          <p>This section has not been built yet.</p>
        </div>`;
    },
  };
}
