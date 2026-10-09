import { findCountry } from "../../../lib/countries.js";

// Works out what the world map shows from the ownership structure, so the map
// and the tree can never disagree.
//   countries  by map key: { label, latlng, count, names[], ubos[] }
//   links      one per owner-country -> owned-country pair: { from, to, items[] }
//   stats      the three counters above the map
// Anything whose country is not in lib/countries.js is left off the map.
export function buildMapData(structure) {
  const countries = {};
  const links = new Map();

  function place(node) {
    const country = findCountry(node.country);
    if (!country) return null;
    const entry = (countries[country.key] ||= { label: country.label, latlng: country.latlng, count: 0, names: [], ubos: [] });
    if (node.kind === "person") {
      entry.ubos.push({ name: node.name, pct: node.pct ?? null, role: node.role || "" });
    } else {
      entry.count += 1;
      entry.names.push({ name: node.name, role: node.role });
    }
    return country;
  }

  function link(owner, owned) {
    const from = findCountry(owner.country);
    const to = findCountry(owned.country);
    if (!from || !to || from.key === to.key) return;
    const key = `${from.key}>${to.key}`;
    if (!links.has(key)) links.set(key, { from: from.key, to: to.key, items: [] });
    links.get(key).items.push({ owner: owner.name, owned: owned.name, pct: owned.pct ?? owner.pct ?? null, role: owner.role || "" });
  }

  const applicant = { ...structure.applicant, kind: "company" };
  place(applicant);

  const walkOwners = (owned, owners) =>
    (owners || []).forEach((owner) => {
      place(owner);
      link(owner, owned);
      walkOwners(owner, owner.children);
    });
  walkOwners(applicant, structure.owners);

  const walkSubsidiaries = (owner, subsidiaries) =>
    (subsidiaries || []).forEach((sub) => {
      place(sub);
      link(owner, sub);
      walkSubsidiaries(sub, sub.children);
    });
  walkSubsidiaries(applicant, structure.subsidiaries);

  const all = Object.values(countries);
  return {
    countries,
    links: [...links.values()],
    stats: {
      entities: all.reduce((sum, c) => sum + c.count, 0),
      countries: all.length,
      ubos: all.reduce((sum, c) => sum + c.ubos.length, 0),
    },
  };
}
