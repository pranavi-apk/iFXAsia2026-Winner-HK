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

  getScreening: (id) => request(`/api/cases/${encodeURIComponent(id)}/sanctions`),

  liveLookup: (id, name) =>
    request(`/api/cases/${encodeURIComponent(id)}/sanctions/lookup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    }),

  saveMemo: (id, draft) =>
    request(`/api/cases/${encodeURIComponent(id)}/memo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    }),

  chat: (id, prompt) =>
    request(`/api/cases/${encodeURIComponent(id)}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    }),
};
