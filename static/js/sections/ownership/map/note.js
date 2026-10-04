import { escapeHtml } from "../../../core/dom.js";

// The sticky note that opens when a country, dot or link is clicked. It is
// placed next to the click, inside the map, and never leaves it.
const OFFSET = 14;
const EDGE = 8;

function countryBody(info) {
  const entities = info.names
    .map((e) => `<li><strong>${escapeHtml(e.name)}</strong><span>${escapeHtml(e.role)}</span></li>`)
    .join("");
  const ubos = info.ubos
    .map((u) => `<li><strong>${escapeHtml(u.name)}</strong><span>${u.pct == null ? "Named in the pack" : `UBO · ${u.pct}%`}</span></li>`)
    .join("");
  const entityLine = info.count ? `<div class="map-note-count">${info.count} ${info.count === 1 ? "entity" : "entities"}</div>` : "";
  return `
    <h3>${escapeHtml(info.label)}</h3>
    ${entityLine}
    ${entities ? `<ul>${entities}</ul>` : ""}
    ${ubos ? `<div class="map-note-sub">Beneficial owners</div><ul>${ubos}</ul>` : ""}`;
}

function linkBody(link, countries) {
  const items = link.items
    .map((i) => `<li><strong>${escapeHtml(i.owner)} → ${escapeHtml(i.owned)}</strong><span>${i.pct == null ? "Named in the pack" : `${i.pct}% ownership`}</span></li>`)
    .join("");
  return `
    <h3>${escapeHtml(countries[link.from].label)} → ${escapeHtml(countries[link.to].label)}</h3>
    <div class="map-note-count">${link.items.length} ownership ${link.items.length === 1 ? "link" : "links"}</div>
    <ul>${items}</ul>`;
}

export function createNote(wrap) {
  const note = document.createElement("aside");
  note.className = "map-note";
  wrap.appendChild(note);

  const hide = () => note.classList.remove("open");

  // `point` is where the user clicked, in pixels from the map's top-left.
  function show(bodyHtml, point) {
    note.innerHTML = `<button class="map-note-close" aria-label="Close">&times;</button>${bodyHtml}`;
    note.querySelector(".map-note-close").addEventListener("click", hide);
    note.classList.add("open");

    const maxLeft = wrap.clientWidth - note.offsetWidth - EDGE;
    const maxTop = wrap.clientHeight - note.offsetHeight - EDGE;
    // Prefer the right of the click; flip to the left when there is no room.
    let left = point.x + OFFSET;
    if (left > maxLeft) left = point.x - note.offsetWidth - OFFSET;
    const top = point.y - OFFSET;
    note.style.left = `${Math.max(EDGE, Math.min(left, maxLeft))}px`;
    note.style.top = `${Math.max(EDGE, Math.min(top, maxTop))}px`;
  }

  return {
    hide,
    showCountry: (info, point) => show(countryBody(info), point),
    showLink: (link, countries, point) => show(linkBody(link, countries), point),
  };
}
