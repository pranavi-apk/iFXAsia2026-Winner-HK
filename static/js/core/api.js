async function request(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export const api = {
  sampleCase: () => request("/api/cases/sample", { method: "POST" }),

  uploadCase(files) {
    const body = new FormData();
    for (const file of files) body.append("files", file);
    return request("/api/cases", { method: "POST", body });
  },

  getCase: (id) => request(`/api/cases/${encodeURIComponent(id)}`),

  riskRating: (id) => request(`/api/cases/${encodeURIComponent(id)}/risk-rating`),

  async riskReport(id) {
    const response = await fetch(`/api/cases/${encodeURIComponent(id)}/risk-rating/report`);
    if (!response.ok) throw new Error(await response.text());
    return response.blob();
  },

  getScreening: (id) => request(`/api/cases/${encodeURIComponent(id)}/sanctions`),

  liveLookup: (id, name) =>
    request(`/api/cases/${encodeURIComponent(id)}/sanctions/lookup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    }),

  adverseMedia: (id) => request(`/api/cases/${encodeURIComponent(id)}/adverse-media`, { method: "POST" }),

  background: (id) => request(`/api/cases/${encodeURIComponent(id)}/background`, { method: "POST" }),

  decideLead: (id, leadId, disposition, note) =>
    request(`/api/cases/${encodeURIComponent(id)}/leads/${encodeURIComponent(leadId)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ disposition, note: note || "" }),
    }),

  updatePurpose: (id, body) =>
    request(`/api/cases/${encodeURIComponent(id)}/business-purpose`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),

  decide: (id, body) =>
    request(`/api/cases/${encodeURIComponent(id)}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),

  saveMemo: (id, draft) =>
    request(`/api/cases/${encodeURIComponent(id)}/memo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    }),

  redraftMemo: (id) => request(`/api/cases/${encodeURIComponent(id)}/memo/redraft`, { method: "POST" }),

  chat: (id, prompt) =>
    request(`/api/cases/${encodeURIComponent(id)}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    }),
};
