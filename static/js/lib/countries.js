// The countries the app knows about. To support a new one, add a row.
//   code   ISO 3166-1 alpha-2, lowercase: the flag is assets/svg_flags/<code>.svg
//   key    the "name" property in static/vendor/countries-50m.json (what the map matches on)
//   latlng where the map puts its dot and anchors its links
//   names  spellings that may appear in the data, lowercase
const COUNTRIES = [
  { code: "vg", key: "British Virgin Is.", label: "British Virgin Islands", latlng: [18.42, -64.64], names: ["british virgin islands", "bvi"] },
  { code: "hk", key: "Hong Kong", label: "Hong Kong", latlng: [22.32, 114.17], names: ["hong kong", "hk"] },
  { code: "sg", key: "Singapore", label: "Singapore", latlng: [1.35, 103.82], names: ["singapore", "sg"] },
  { code: "gb", key: "United Kingdom", label: "United Kingdom", latlng: [54, -2], names: ["united kingdom", "uk", "great britain", "england", "england and wales", "wales", "scotland", "britain"] },
  { code: "cn", key: "China", label: "China", latlng: [35, 103], names: ["china", "prc"] },
  { code: "us", key: "United States of America", label: "United States", latlng: [39, -98], names: ["united states", "united states of america", "usa", "us"] },
];

const BY_NAME = new Map(COUNTRIES.flatMap((country) => country.names.map((name) => [name, country])));

export function findCountry(name) {
  return BY_NAME.get(String(name || "").trim().toLowerCase()) || null;
}
