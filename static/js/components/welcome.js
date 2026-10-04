import { escapeHtml } from "../core/dom.js";
import { icon } from "../lib/icons.js";

const STATS = [
  { icon: "⚡", num: "5 Sec", label: "Full Pack Verification" },
  { icon: "🧠", num: "100%", label: "Grounded Quote Proof" },
  { icon: "🛡️", num: "5,000+", label: "UN & HK Sanctions Entries" },
];

// Landing view. `onSample()` and `onUpload(files)` are supplied by main.js.
export function renderWelcome(container, { onSample, onUpload }) {
  container.innerHTML = `
    <section class="welcome-hero">
      <div class="hero-content">
        <div class="hero-badge">⚡ Autonomous Corporate Onboarding</div>
        <h1>Ownership & Control Intelligence</h1>
        <p>Visualise corporate structure, ultimate beneficial owners (UBOs), and key relationships with verified documentary proof and automated sanctions screening.</p>

        <div class="hero-cta">
          <button id="hero-sample-btn" class="btn btn-primary btn-lg shadow-glow">
            ${icon("play", 18)}
            Launch Demo Case (Silver Oak Holdings / Harbour Lantern)
          </button>
          <label class="btn btn-secondary btn-lg upload-btn shadow-hover">
            ${icon("upload", 18)}
            Upload PDF Pack
            <input id="hero-files" type="file" accept="application/pdf" multiple />
          </label>
        </div>

        <div class="hero-stats">
          ${STATS.map(
            (s) => `
          <div class="stat-card">
            <div class="stat-icon">${s.icon}</div>
            <div class="stat-num">${s.num}</div>
            <div class="stat-label">${s.label}</div>
          </div>`
          ).join("")}
        </div>
      </div>
    </section>`;

  container.querySelector("#hero-sample-btn").addEventListener("click", onSample);
  container.querySelector("#hero-files").addEventListener("change", (e) => onUpload(e.target.files));
}

export function renderError(container, message, { onBack }) {
  container.innerHTML = `
    <div class="welcome-hero">
      <div class="hero-content">
        <h1 style="color: var(--status-attention); font-size: 2rem;">Verification Encountered an Error</h1>
        <p style="color: var(--text-muted);">${escapeHtml(message)}</p>
        <button id="error-back-btn" class="btn btn-secondary" style="margin-top: 1rem;">Return to Dashboard</button>
      </div>
    </div>`;
  container.querySelector("#error-back-btn").addEventListener("click", onBack);
}
