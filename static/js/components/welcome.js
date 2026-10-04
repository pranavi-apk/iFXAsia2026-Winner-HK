import { escapeHtml } from "../core/dom.js";
import { icon } from "../lib/icons.js";

const STATS = [
  { icon: "⚡", num: "5 Sec", label: "Full Pack Verification" },
  { icon: "🧠", num: "100%", label: "Grounded Quote Proof" },
  { icon: "🛡️", num: "5,000+", label: "UN & HK Sanctions Entries" },
];

export function renderWelcome(container, { onSample, onUpload }) {
  container.innerHTML = `
    <div class="welcome-hero">
      <div class="hero-content">
        <div class="hero-badge">⚡ Autonomous KYC Workspace</div>
        <h1>Ownership & Control Intelligence</h1>
        <p>Select a compliance case to disentangle UBO structures and screen live Sanctions & PEP lists.</p>

        <div class="hero-cta">
          <button id="hero-sample-btn" class="btn btn-primary btn-lg shadow-glow">
            ${icon("play", 18)}
            Launch Demo Case (Silver Oak Holdings / Harbour Lantern)
          </button>
          <label class="btn btn-secondary btn-lg upload-btn shadow-hover">
            ${icon("upload", 18)}
            Upload Corporate PDF Pack
            <input id="hero-files" type="file" accept="application/pdf" multiple />
          </label>
        </div>

        <div class="hero-stats">
          <div class="stat-card">
            <div class="stat-icon">⚡</div>
            <div class="stat-num">5 Sec</div>
            <div class="stat-label">Full Pack Verification</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">🧠</div>
            <div class="stat-num">100%</div>
            <div class="stat-label">Grounded Quote Proof</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">🛡️</div>
            <div class="stat-num">5,000+</div>
            <div class="stat-label">UN & HK Sanctions Entries</div>
          </div>
        </div>
      </div>
    </div>`;

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
