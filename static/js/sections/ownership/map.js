import { escapeHtml } from "../../core/dom.js";

// Interactive world map of the countries involved. No tiles and no API key:
// country shapes are drawn from a bundled TopoJSON file. `L` (Leaflet) and
// `topojson` are globals loaded by index.html.
const WORLD_DATA_URL = "/static/vendor/countries-50m.json";

let mapInstance = null;

// Rings that cross the 180° line jump from +180 to -180, which draws a line
// across the whole map. Make each ring continuous and keep it near the centre.
function unwrapAntimeridian(feature) {
  const fixRing = (ring) => {
    let offset = 0;
    let prev = ring[0][0];
    const out = ring.map(([lng, lat]) => {
      if (lng - prev > 180) offset -= 360;
      else if (lng - prev < -180) offset += 360;
      prev = lng;
      return [lng + offset, lat];
    });
    const mean = out.reduce((sum, c) => sum + c[0], 0) / out.length;
    const shift = mean > 180 ? -360 : mean < -180 ? 360 : 0;
    return shift ? out.map(([lng, lat]) => [lng + shift, lat]) : out;
  };
  const g = feature.geometry;
  if (g.type === "Polygon") g.coordinates = g.coordinates.map(fixRing);
  else if (g.type === "MultiPolygon") g.coordinates = g.coordinates.map((poly) => poly.map(fixRing));
  return feature;
}

function renderSideNote(countries, key) {
  const note = document.getElementById("map-side-note");
  const info = countries[key];
  if (!note || !info) return;
  const entities = info.names
    .map((e) => `<li><strong>${escapeHtml(e.name)}</strong><span>${escapeHtml(e.role)}</span></li>`)
    .join("");
  const ubos = (info.ubos || [])
    .map((u) => `<li><strong>${escapeHtml(u.name)}</strong><span>UBO · ${u.pct}%</span></li>`)
    .join("");
  note.innerHTML = `
    <button class="map-note-close" aria-label="Close">&times;</button>
    <h3>${escapeHtml(info.label)}</h3>
    <div class="map-note-count">${info.count} ${info.count === 1 ? "entity" : "entities"}</div>
    ${entities ? `<ul>${entities}</ul>` : ""}
    ${ubos ? `<div class="map-note-sub">Beneficial owners</div><ul>${ubos}</ul>` : ""}
  `;
  note.classList.add("open");
  note.querySelector(".map-note-close").addEventListener("click", () => note.classList.remove("open"));
}

// `countries` and `dots` come from the view model; see view-model.js.
export function initPresenceMap({ countries, dots }) {
  const container = document.getElementById("leaflet-global-map");
  if (!container || typeof L === "undefined" || typeof topojson === "undefined") return;

  if (mapInstance) {
    mapInstance.remove();
    mapInstance = null;
  }

  const map = L.map("leaflet-global-map", {
    crs: L.CRS.EPSG4326,
    zoomControl: false,
    attributionControl: false,
    dragging: false,
    scrollWheelZoom: false,
    doubleClickZoom: false,
    boxZoom: false,
    keyboard: false,
    touchZoom: false,
    zoomSnap: 0,
  });
  mapInstance = map;
  map.fitBounds([[-52, -170], [82, 180]]);

  const styleFor = (name, active) => {
    if (!countries[name]) return { fillColor: "#e2e8f0", fillOpacity: 1, color: "#ffffff", weight: 0.5 };
    return { fillColor: active ? "#1d4ed8" : "#2563eb", fillOpacity: active ? 1 : 0.85, color: "#ffffff", weight: 1 };
  };

  fetch(WORLD_DATA_URL)
    .then((r) => r.json())
    .then((topo) => {
      if (mapInstance !== map) return; // re-rendered while loading
      const geo = topojson.feature(topo, topo.objects.countries);
      geo.features = geo.features.filter((f) => f.properties.name !== "Antarctica").map(unwrapAntimeridian);
      const isShown = (f) => Boolean(countries[f.properties.name]);
      let selected = null;

      L.geoJSON(geo, {
        filter: (f) => !isShown(f),
        interactive: false,
        style: (f) => styleFor(f.properties.name, false),
      }).addTo(map);

      L.geoJSON(geo, {
        filter: isShown,
        style: (f) => styleFor(f.properties.name, false),
        onEachFeature: (f, layer) => {
          const name = f.properties.name;
          layer.on("click", () => {
            if (selected) selected.setStyle(styleFor(selected.feature.properties.name, false));
            selected = layer;
            layer.setStyle(styleFor(name, true));
            renderSideNote(countries, name);
          });
          layer.bindTooltip(countries[name].label, { sticky: true, className: "custom-leaflet-tooltip" });
        },
      }).addTo(map);

      Object.entries(dots).forEach(([name, latlng]) => {
        L.circleMarker(latlng, { radius: 6, fillColor: "#2563eb", color: "#ffffff", weight: 2, fillOpacity: 1 })
          .on("click", () => renderSideNote(countries, name))
          .bindTooltip(countries[name].label, { className: "custom-leaflet-tooltip" })
          .addTo(map);
      });
    });
}
