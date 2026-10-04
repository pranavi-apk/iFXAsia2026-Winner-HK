import { escapeHtml } from "../core/dom.js";
import { findCountry } from "./countries.js";

// Flags live in assets/svg_flags, named by lowercase ISO 3166-1 alpha-2 code.
// A country that is not in lib/countries.js still works if it is given as a 2-letter code.
export function flagImg(country, className = "node-flag") {
  const code = findCountry(country)?.code || (/^[a-z]{2}$/i.test(String(country).trim()) ? String(country).trim().toLowerCase() : "");
  if (!code) return "";
  return `<img class="${className}" src="/assets/svg_flags/${code}.svg" alt="${escapeHtml(country)} flag" title="${escapeHtml(country)}" />`;
}
