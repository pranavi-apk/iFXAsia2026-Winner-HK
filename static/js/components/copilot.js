import { $ } from "../core/dom.js";
import { api } from "../core/api.js";
import { state } from "../core/state.js";
import { icon } from "../lib/icons.js";

const SUGGESTIONS = [
  { label: "Why Medium risk?", ask: "Why is this case assigned a Medium risk rating?" },
  { label: "Summarize directors", ask: "List all directors and their nationalities." },
  { label: "Draft request letter", ask: "Draft a professional letter asking for the missing register of members." },
];

let widget;
let drawer;
let messages;
let input;

export function mountCopilot(host) {
  host.insertAdjacentHTML(
    "beforeend",
    `
    <div id="ai-copilot-widget" class="copilot-widget" style="display: none;">
      <button id="copilot-toggle-btn" class="copilot-fab">
        ${icon("chat", 18)}
        <span>Ask Tally AI Copilot</span>
      </button>

      <div id="copilot-drawer" class="copilot-drawer" style="display: none;">
        <div class="copilot-header">
          <div class="copilot-title">
            ${icon("info", 16)}
            Compliance Officer AI Assistant
          </div>
          <button id="copilot-close-btn" class="close-btn">&times;</button>
        </div>

        <div class="copilot-messages" id="copilot-msg-box">
          <div class="copilot-msg bot">
            Welcome Officer! Ask me to explain risk findings, summarize director backgrounds, or generate customer correspondence letters.
          </div>
        </div>

        <div class="copilot-suggestions">
          ${SUGGESTIONS.map((s) => `<button class="chip-btn" data-ask="${s.ask}">${s.label}</button>`).join("")}
        </div>

        <div class="copilot-input-area">
          <input type="text" id="copilot-input" placeholder="Type a message or regulatory query..." />
          <button id="copilot-send" class="btn btn-primary btn-sm">Send</button>
        </div>
      </div>
    </div>`
  );

  widget = $("#ai-copilot-widget");
  drawer = $("#copilot-drawer");
  messages = $("#copilot-msg-box");
  input = $("#copilot-input");

  $("#copilot-toggle-btn").addEventListener("click", () => {
    drawer.style.display = drawer.style.display === "none" ? "flex" : "none";
  });
  $("#copilot-close-btn").addEventListener("click", () => {
    drawer.style.display = "none";
  });
  $("#copilot-send").addEventListener("click", sendTyped);
  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendTyped();
  });
  widget.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip-btn");
    if (chip?.dataset.ask) ask(chip.dataset.ask);
  });
}

export function showCopilot() {
  if (widget) widget.style.display = "block";
}

function sendTyped() {
  const text = input.value.trim();
  if (!text) return;
  input.value = "";
  ask(text);
}

function addMessage(role, text) {
  const el = document.createElement("div");
  el.className = `copilot-msg ${role}`;
  el.textContent = text;
  messages.appendChild(el);
  messages.scrollTop = messages.scrollHeight;
  return el;
}

async function ask(prompt) {
  if (!state.case) return;
  addMessage("user", prompt);
  const reply = addMessage("bot", "Checking case records and regulatory rules...");
  try {
    const data = await api.chat(state.case.id, prompt);
    reply.textContent = data.reply || "No response received.";
  } catch (err) {
    reply.textContent = `Error: ${err.message}`;
  }
  messages.scrollTop = messages.scrollHeight;
}
