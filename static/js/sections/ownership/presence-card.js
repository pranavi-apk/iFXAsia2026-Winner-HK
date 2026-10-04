export function renderPresenceCard({ presence }) {
  const counters = [
    { value: presence.entities, label: "Entities" },
    { value: presence.countries, label: "Countries / Regions" },
    { value: presence.ubos, label: "Ultimate Beneficial Owners" },
  ];
  return `
    <div class="card-panel">
      <div class="card-title-row">
        <h2>Global Presence</h2>
        <div class="stat-counters">
          ${counters
            .map(
              (c) => `
          <div class="stat-counter-item">
            <div class="stat-counter-val">${c.value}</div>
            <div class="stat-counter-lbl">${c.label}</div>
          </div>`
            )
            .join("")}
        </div>
      </div>

      <div class="world-map-wrap">
        <div id="leaflet-global-map" class="world-map-visual"></div>
        <aside id="map-side-note" class="map-side-note"></aside>
      </div>
    </div>`;
}
