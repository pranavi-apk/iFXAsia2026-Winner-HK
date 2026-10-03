const app = document.querySelector("#app");
const sampleButton = document.querySelector("#sample");
const fileInput = document.querySelector("#files");

sampleButton.addEventListener("click", () => run("/api/cases/sample", { method: "POST" }));
const savedCase = new URLSearchParams(location.search).get("case");
if (savedCase) {
  fetch(`/api/cases/${savedCase}`).then((response) => response.json()).then(render);
}
fileInput.addEventListener("change", () => {
  const body = new FormData();
  for (const file of fileInput.files) body.append("files", file);
  run("/api/cases", { method: "POST", body });
});

function run(url, options) {
  sampleButton.disabled = true;
  app.innerHTML = `<section class="empty"><h1>Reading the pack.</h1><p>Extraction is running. The checks after that are code.</p></section>`;
  fetch(url, options)
    .then(async (response) => {
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    })
    .then(render)
    .catch((error) => {
      app.innerHTML = `<section class="empty"><h1>The case did not finish.</h1><p class="error"></p></section>`;
      app.querySelector(".error").textContent = error.message;
    })
    .finally(() => {
      sampleButton.disabled = false;
    });
}

function render(caseData) {
  history.replaceState(null, "", `/?case=${caseData.id}`);
  const modules = Object.values(caseData.modules);
  app.innerHTML = `
    <p class="muted">${escapeHtml(caseData.title)} · model ${escapeHtml(caseData.labels.model)} extracts · code decides</p>
    <div class="decision"></div>
    <section class="modules">
      ${modules.map((item) => `
        <article class="card">
          <span class="status-${item.status}">${escapeHtml(item.status)}</span>
          <h2>${escapeHtml(item.title)}</h2>
          ${item.rating ? `<p>${escapeHtml(item.rating)} · ${item.score} points</p>` : ""}
        </article>`).join("")}
    </section>
    <section class="layout">
      <div>
        <article class="panel">
          <h2>Ownership</h2>
          <p class="legend">
            <span><i class="swatch" style="background:#1d1a16;border-color:#1d1a16"></i>Applicant</span>
            <span><i class="swatch" style="background:#eef6f1;border-color:#1e6a45"></i>Person</span>
            <span><i class="swatch" style="background:#fffdf8;border-color:#1d4e89"></i>Company</span>
            <span><i class="swatch" style="background:#f8efe2;border-color:#8a5a12"></i>Missing register</span>
          </p>
          <div class="views">${(caseData.ownership_views || []).map(viewMarkup).join("") || "<p>No ownership links were verified.</p>"}</div>
        </article>
        <article class="panel" style="margin-top:1rem">
          <h2>Findings</h2>
          <div id="findings"></div>
        </article>
        <article class="panel" style="margin-top:1rem">
          <h2>Approval memo</h2>
          <pre>${escapeHtml(caseData.memo || "")}</pre>
          <h2>Request to the customer</h2>
          <pre>${escapeHtml(caseData.customer_request || "")}</pre>
        </article>
      </div>
      <aside>
        <article class="panel evidence" id="evidence"><h2>Evidence</h2><p class="muted">Select a finding.</p></article>
        <article class="panel" style="margin-top:1rem">
          <h2>Risk rules</h2>
          <p class="muted">${escapeHtml(caseData.risk.rules_label)}</p>
          ${(caseData.risk.factors || []).map((factor) => `<div class="factor"><span>${escapeHtml(factor.finding)}</span><strong>+${factor.points}</strong></div>`).join("")}
          <p><strong>${caseData.risk.score} · ${escapeHtml(caseData.risk.rating)}</strong></p>
          <p class="muted">${escapeHtml(caseData.labels.sanctions)}</p>
          <p class="muted">${escapeHtml(caseData.labels.pep)}</p>
          <p class="muted">${escapeHtml(caseData.labels.jurisdictions)}</p>
        </article>
        <article class="panel" style="margin-top:1rem">
          <h2>Monitoring</h2>
          ${(caseData.monitoring?.triggers || []).map((trigger) => `<p class="${trigger.due ? "due" : "muted"}">${escapeHtml(trigger.detail)}</p>`).join("")}
          <button type="button" id="run-monitor">Re-screen names</button>
          ${(caseData.screening_notes || []).map((note) => `<p><strong>${escapeHtml(note.title)}.</strong> ${escapeHtml(note.detail)}</p>`).join("")}
        </article>
        <article class="panel" style="margin-top:1rem">
          <h2>Audit</h2>
          <ul class="audit">${(caseData.audit || []).map((event) => `<li><span class="muted">${escapeHtml(event.at)}</span> ${escapeHtml(event.action)}: ${escapeHtml(event.detail)}</li>`).join("") || "<li>No events yet.</li>"}</ul>
        </article>
        <article class="panel stack" style="margin-top:1rem" id="policy"><h2>Checklist and risk rules</h2></article>
      </aside>
    </section>`;

  const decision = app.querySelector(".decision");
  const current = caseData.decision;
  decision.innerHTML = `
    <span class="banner">${current ? `Officer set this case to ${escapeHtml(current.status)}.` : `Suggested rating ${escapeHtml(caseData.risk.rating)}. No officer decision yet.`}</span>
    <select id="rating">
      ${["Low", "Medium", "High"].map((rating) => `<option ${rating === (current?.rating || caseData.risk.rating) ? "selected" : ""}>${rating}</option>`).join("")}
    </select>
    <textarea id="note" placeholder="Officer note">${escapeHtml(current?.note || "")}</textarea>
    <button type="button" data-status="approved">Approve</button>
    <button type="button" data-status="returned">Return to customer</button>
    <button type="button" data-status="overridden">Save override</button>`;
  decision.addEventListener("click", (event) => {
    const status = event.target.dataset.status;
    if (!status) return;
    fetch(`/api/cases/${caseData.id}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        rating: document.querySelector("#rating").value,
        note: document.querySelector("#note").value,
      }),
    }).then((response) => response.json()).then(render);
  });

  document.querySelector("#run-monitor")?.addEventListener("click", () => {
    fetch(`/api/cases/${caseData.id}/monitor`, { method: "POST" }).then((response) => response.json()).then(render);
  });

  const findings = document.querySelector("#findings");
  for (const finding of caseData.findings) {
    const button = document.createElement("button");
    button.className = "finding";
    const mark = finding.officer ? ` · ${finding.officer.disposition}` : "";
    button.innerHTML = `<strong>${escapeHtml(finding.title)}</strong><span class="muted">${escapeHtml(mark)}</span><br><span class="muted">${escapeHtml(finding.detail)}</span>`;
    button.addEventListener("click", () => showEvidence(caseData.id, finding, button));
    findings.appendChild(button);
  }
  drawGraphs(caseData.ownership_views || []);
  mountPolicy(caseData.id);
}

function viewMarkup(view, index) {
  const people = (view.effective || []).map((person) => `${escapeHtml(person.name)} ${person.percent}%`).join(" · ");
  const gaps = (view.gaps || []).map((gap) => escapeHtml(gap.missing_document)).join(" · ");
  return `<div class="view"><h3 class="view-title">${escapeHtml(view.source)}</h3>
    <div class="graph" id="graph-${index}"></div>
    <p class="muted">Effective, from this document only: ${people || "not calculated"}${gaps ? `. Gap: ${gaps}` : ""}</p></div>`;
}

function drawGraphs(views) {
  if (!window.vis) return;
  views.forEach((view, index) => {
    const container = document.getElementById(`graph-${index}`);
    if (!container || !view.links?.length) return;
    const counts = {};
    for (const link of view.links) counts[link.owned] = (counts[link.owned] || 0) + 1;
    const subject = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
    const gapNames = new Set((view.gaps || []).map((gap) => gap.name));
    const kinds = {};
    const names = new Set();
    for (const link of view.links) {
      names.add(link.owner);
      names.add(link.owned);
      kinds[link.owner] = link.owner_kind || kinds[link.owner] || "person";
      if (!kinds[link.owned]) kinds[link.owned] = "company";
    }
    const nodes = [...names].map((name) => {
      const isSubject = name === subject;
      const isGap = gapNames.has(name);
      const isPerson = kinds[name] === "person" && !isSubject;
      let color = { background: "#fffdf8", border: "#1d4e89" };
      let fontColor = "#1d1a16";
      if (isSubject) {
        color = { background: "#1d1a16", border: "#1d1a16" };
        fontColor = "#f6f1e8";
      } else if (isGap) {
        color = { background: "#f8efe2", border: "#8a5a12" };
      } else if (isPerson) {
        color = { background: "#eef6f1", border: "#1e6a45" };
      }
      return {
        id: name,
        label: isSubject ? `${name}\napplicant` : isGap ? `${name}\nregister missing` : name,
        shape: "box",
        margin: 12,
        widthConstraint: { maximum: 210 },
        color,
        font: { color: fontColor, face: "Avenir Next, Segoe UI, sans-serif", size: 13 },
        borderWidth: 1.5,
      };
    });
    const edges = view.links.map((link, edgeIndex) => ({
      id: `${index}-${edgeIndex}`,
      from: link.owner,
      to: link.owned,
      label: `${link.percent}%`,
      arrows: { to: { enabled: true, scaleFactor: 0.55 } },
      font: { align: "middle", size: 13, color: "#1d1a16", strokeWidth: 6, strokeColor: "#f7f3eb", face: "Avenir Next, Segoe UI, sans-serif" },
      color: { color: "#8a8175", highlight: "#1d4e89" },
      smooth: { type: "cubicBezier", forceDirection: "vertical", roundness: 0.45 },
    }));
    const network = new vis.Network(container, { nodes, edges }, {
      layout: {
        hierarchical: {
          direction: "UD",
          sortMethod: "directed",
          levelSeparation: 125,
          nodeSpacing: 160,
          treeSpacing: 200,
          parentCentralization: true,
        },
      },
      physics: false,
      interaction: { hover: true, tooltipDelay: 80, navigationButtons: false },
    });
    network.once("afterDrawing", () => {
      network.fit({ animation: false });
      network.moveTo({ scale: network.getScale() * 0.82 });
    });
  });
}

function showEvidence(caseId, finding, button) {
  document.querySelectorAll(".finding").forEach((item) => item.classList.remove("active"));
  button.classList.add("active");
  const box = document.querySelector("#evidence");
  const blocks = (finding.evidence || []).map((item) => {
    const head = item.kind
      ? `<p class="muted">${escapeHtml(item.document)}</p>`
      : `<p><a href="/api/cases/${caseId}/files/${encodeURIComponent(item.document)}" target="_blank">${escapeHtml(item.document)}</a></p>`;
    return `${head}<blockquote>${escapeHtml(item.quote)}</blockquote>`;
  }).join("");
  const decided = finding.officer ? `<p>Officer ${escapeHtml(finding.officer.disposition)}. ${escapeHtml(finding.officer.note || "")}</p>` : "";
  box.innerHTML = `<h2>Evidence</h2><p>${escapeHtml(finding.title)}</p>${decided}${blocks}
    <textarea id="finding-note" placeholder="Note for this finding"></textarea>
    <button type="button" id="accept-finding">Accept finding</button>
    <button type="button" id="override-finding">Override finding</button>`;
  box.querySelector("#accept-finding").addEventListener("click", () => sendFinding(caseId, finding.id, "accepted"));
  box.querySelector("#override-finding").addEventListener("click", () => sendFinding(caseId, finding.id, "overridden"));
}

function sendFinding(caseId, findingId, disposition) {
  fetch(`/api/cases/${caseId}/findings/${findingId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ disposition, note: document.querySelector("#finding-note")?.value || "" }),
  }).then((response) => response.json()).then(render);
}

function mountPolicy(caseId) {
  fetch("/api/policy").then((response) => response.json()).then((policy) => {
    const box = document.querySelector("#policy");
    if (!box) return;
    const pointFields = Object.entries(policy.points).map(([key, value]) =>
      `<label class="factor">${escapeHtml(key)} <input data-point="${escapeHtml(key)}" type="number" value="${value}"></label>`
    ).join("");
    const docs = (policy.required_documents || []).map((item) => item.label).join("\n");
    const countries = (policy.high_risk_jurisdictions?.names || []).join(", ");
    box.innerHTML = `<h2>Checklist and risk rules</h2>
      <p class="muted">${escapeHtml(policy.label)}</p>
      ${pointFields}
      <label class="factor">Match threshold <input id="policy-threshold" type="number" step="0.01" value="${policy.match_threshold}"></label>
      <label class="factor">Review months <input id="policy-months" type="number" value="${policy.review_months}"></label>
      <label>Required documents<textarea id="policy-docs">${escapeHtml(docs)}</textarea></label>
      <label>High-risk jurisdictions<textarea id="policy-countries">${escapeHtml(countries)}</textarea></label>
      <button type="button" id="save-policy">Save rules and re-score</button>`;
    box.querySelector("#save-policy").addEventListener("click", () => {
      const next = structuredClone(policy);
      box.querySelectorAll("[data-point]").forEach((input) => {
        next.points[input.dataset.point] = Number(input.value);
      });
      next.match_threshold = Number(box.querySelector("#policy-threshold").value);
      next.review_months = Number(box.querySelector("#policy-months").value);
      const labels = box.querySelector("#policy-docs").value.split("\n").map((line) => line.trim()).filter(Boolean);
      next.required_documents = labels.map((label) => {
        const existing = (policy.required_documents || []).find((item) => item.label === label);
        return existing || { type: label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""), label };
      });
      next.high_risk_jurisdictions.names = box.querySelector("#policy-countries").value.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
      fetch("/api/policy", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      }).then(() => fetch(`/api/cases/${caseId}/rescore`, { method: "POST" }))
        .then((response) => response.json())
        .then(render);
    });
  });
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]);
}
