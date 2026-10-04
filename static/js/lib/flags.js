import { escapeHtml } from "../core/dom.js";

// Flags live in assets/svg_flags, named by lowercase ISO 3166-1 alpha-2 code.
// Add a name here when the app uses one that isn't an ISO code.
const COUNTRY_CODES = {
  "hong kong": "hk",
  "singapore": "sg",
  "united kingdom": "gb",
  "uk": "gb",
  "china": "cn",
  "united states": "us",
  "united states of america": "us",
  "usa": "us",
  "british virgin islands": "vg",
  "bvi": "vg",
};

export function flagImg(country, className = "node-flag") {
  const key = String(country || "").trim().toLowerCase();
  const code = COUNTRY_CODES[key] || (/^[a-z]{2}$/.test(key) ? key : "");
  if (!code) return "";
  return `<img class="${className}" src="/assets/svg_flags/${code}.svg" alt="${escapeHtml(country)} flag" title="${escapeHtml(country)}" />`;
}
