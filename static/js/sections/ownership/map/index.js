import { arcPoints } from "./arcs.js";
import { createNote } from "./note.js";

// Interactive world map of the countries involved. No tiles and no API key:
// country shapes are drawn from a bundled TopoJSON file. `L` (Leaflet) and
// `topojson` are globals loaded by index.html.
const WORLD_DATA_URL = "/static/vendor/countries-50m.json";

const COLOR = { country: "#2563eb", countryActive: "#1d4ed8", land: "#f1f4f8", link: "#94a3b8", linkActive: "#16a34a" };

// Links are round dots rather than a solid line, so they sit quietly behind the countries.
const LINK_DOTS = { dashArray: "0.5 6", lineCap: "round" };
const LINK_IDLE = { color: COLOR.link, weight: 1.6, opacity: 0.55 };
const LINK_ACTIVE = { color: COLOR.linkActive, weight: 2.4, opacity: 1 };

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

// `countries` and `links` come from data.js.
export function initPresenceMap({ countries, links }) {
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

  const note = createNote(container.parentElement);
  map.on("click", () => {
    clearSelection();
    note.hide();
  });

  // Only one thing is selected at a time; `selection` knows how to un-highlight itself.
  let selection = null;
  function clearSelection() {
    selection?.reset();
    selection = null;
  }
  function select(reset) {
    clearSelection();
    selection = { reset };
  }

  const landStyle = { fillColor: COLOR.land, fillOpacity: 1, color: "#ffffff", weight: 0.5 };
  const countryStyle = (active) => ({
    fillColor: active ? COLOR.countryActive : COLOR.country,
    fillOpacity: active ? 1 : 0.85,
    color: "#ffffff",
    weight: 1,
  });

  fetch(WORLD_DATA_URL)
    .then((r) => r.json())
    .then((topo) => {
      if (mapInstance !== map) return; // re-rendered while loading
      const geo = topojson.feature(topo, topo.objects.countries);
      geo.features = geo.features.filter((f) => f.properties.name !== "Antarctica").map(unwrapAntimeridian);
      const isShown = (f) => Boolean(countries[f.properties.name]);

      L.geoJSON(geo, { filter: (f) => !isShown(f), interactive: false, style: () => landStyle }).addTo(map);

      L.geoJSON(geo, {
        filter: isShown,
        bubblingMouseEvents: false,
        style: () => countryStyle(false),
        onEachFeature: (f, layer) => {
          const info = countries[f.properties.name];
          layer.on("click", (e) => {
            select(() => layer.setStyle(countryStyle(false)));
            layer.setStyle(countryStyle(true));
            note.showCountry(info, e.containerPoint);
          });
          layer.bindTooltip(info.label, { sticky: true, className: "custom-leaflet-tooltip" });
        },
      }).addTo(map);

      // Curved links. Each is drawn twice: a thin visible line, and a wide
      // invisible one on top so it is easy to click.
      links.forEach((link) => {
        const points = arcPoints(countries[link.from].latlng, countries[link.to].latlng);
        const line = L.polyline(points, { ...LINK_IDLE, ...LINK_DOTS, interactive: false }).addTo(map);
        const hit = L.polyline(points, { color: "#000", weight: 14, opacity: 0.001, bubblingMouseEvents: false }).addTo(map);
        const style = (active) => line.setStyle(active ? LINK_ACTIVE : LINK_IDLE);
        hit.on("mouseover", () => !selection && style(true));
        hit.on("mouseout", () => !selection && style(false));
        hit.on("click", (e) => {
          select(() => style(false));
          style(true);
          note.showLink(link, countries, e.containerPoint);
        });
      });

      // A dot on every country, which is also where its links end.
      Object.values(countries).forEach((info) => {
        L.circleMarker(info.latlng, { radius: 6, fillColor: COLOR.country, color: "#ffffff", weight: 2, fillOpacity: 1, bubblingMouseEvents: false })
          .on("click", (e) => {
            select(() => {});
            note.showCountry(info, e.containerPoint);
          })
          .bindTooltip(info.label, { className: "custom-leaflet-tooltip" })
          .addTo(map);
      });
    });
}
