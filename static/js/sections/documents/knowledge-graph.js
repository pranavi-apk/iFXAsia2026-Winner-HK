// Builds the Knowledge Base graph from the case's own data: documents, the
// people and companies named in them, ownership links, and the quotes that
// support them. Nothing here is invented; every edge carries its source.
import { buildOwnershipView } from "../ownership/view-model.js";

const CONFLICT_RE = /conflict|mismatch|discrepan|inconsisten|differs/i;

export const MODES = [
  ["all", "All"],
  ["ownership", "Ownership"],
  ["identity", "Identity"],
  ["evidence", "Document evidence"],
  ["conflicts", "Conflicts"],
];

function flatten(nodes, parentId, out, depth = 0) {
  for (const node of nodes || []) {
    out.push({ node, parentId, depth });
    flatten(node.children, node.id, out, depth + 1);
  }
  return out;
}

export function buildKnowledgeGraph(caseData) {
  const view = buildOwnershipView(caseData);
  const nodes = new Map();
  const edges = [];
  const add = (id, props) => { if (!nodes.has(id)) nodes.set(id, { id, ...props }); return nodes.get(id); };
  const link = (from, to, props) => edges.push({ id: `e${edges.length}`, from, to, ...props });

  const appId = "applicant";
  add(appId, { type: "company", label: view.legalName, sub: view.jurisdiction, role: "Applicant" });

  // Documents in the pack.
  const docNames = new Set();
  const intake = caseData.intake;
  const packDocs = intake
    ? [...intake.company.documents, ...intake.ownership.documents, ...(intake.management?.documents || [])]
        .filter((d) => d.file).map((d) => ({ file: d.file, title: d.title }))
    : (caseData.documents || []).map((d) => ({ file: d.filename, title: d.filename }));
  for (const d of packDocs) {
    if (docNames.has(d.file)) continue;
    docNames.add(d.file);
    add(`doc:${d.file}`, { type: "document", label: d.title || d.file, sub: d.file, file: d.file });
  }
  const ownershipFiles = intake
    ? intake.ownership.documents.filter((d) => d.file).map((d) => d.file)
    : [];

  // Ownership chain.
  const owners = flatten(view.structure.owners, appId, []);
  for (const { node, parentId } of owners) {
    add(node.id, { type: node.kind === "person" ? "person" : "company", label: node.name, sub: node.country || "", role: node.role || "" });
    link(node.id, parentId, {
      kind: "ownership",
      label: node.pct != null ? `OWNS ${node.pct}%` : "CONTROLS",
      pct: node.pct,
      sources: ownershipFiles.map((f) => ({ file: f, quote: node.pct != null ? `${node.name} — ${node.pct}%` : "" })),
    });
  }
  for (const { node, parentId } of flatten(view.structure.subsidiaries, appId, [])) {
    add(node.id, { type: "company", label: node.name, sub: node.country || "", role: node.role || "Subsidiary" });
    link(parentId, node.id, {
      kind: "ownership",
      label: node.pct != null ? `OWNS ${node.pct}%` : "SUBSIDIARY OF",
      pct: node.pct,
      sources: ownershipFiles.map((f) => ({ file: f, quote: "" })),
    });
  }

  // Evidence: each quote ties an entity to the document it came from.
  for (const entity of [...(caseData.people || []), ...(caseData.companies || [])]) {
    const match = [...nodes.values()].find((n) => n.label?.toLowerCase() === entity.name?.toLowerCase());
    const id = match ? match.id : `ent:${entity.name}`;
    if (!match) add(id, { type: entity.kind === "company" ? "company" : "person", label: entity.name, sub: "", role: (entity.roles || []).join(", ") });
    const node = nodes.get(id);
    node.aliases = entity.aliases || [];
    node.evidence = entity.evidence || [];
    for (const ev of entity.evidence || []) {
      if (!ev.document) continue;
      const docId = `doc:${ev.document}`;
      add(docId, { type: "document", label: ev.document, sub: ev.document, file: ev.document });
      link(id, docId, { kind: "evidence", label: "NAMED IN", sources: [{ file: ev.document, quote: ev.quote || "", verified: ev.verified }] });
    }
    for (const alias of entity.aliases || []) {
      const aid = `alias:${entity.name}:${alias}`;
      add(aid, { type: "alias", label: alias, sub: "Name variant" });
      link(id, aid, { kind: "identity", label: "ALSO KNOWN AS", sources: (entity.evidence || []).map((e) => ({ file: e.document, quote: e.quote })) });
    }
  }

  // A document that names nobody yet still belongs to the applicant's pack.
  for (const n of [...nodes.values()]) {
    if (n.type === "document" && !edges.some((e) => e.from === n.id || e.to === n.id)) {
      link(n.id, appId, { kind: "evidence", label: "IN PACK", sources: [{ file: n.file, quote: "" }] });
    }
  }

  // Conflicts: findings that report a mismatch. Never resolved silently.
  const conflicts = (caseData.findings || []).filter((f) => CONFLICT_RE.test(`${f.title} ${f.detail || ""}`));
  const conflictNodes = new Set();
  for (const c of conflicts) {
    const hit = [...nodes.values()].find((n) => n.type !== "document" && n.label && `${c.title} ${c.detail}`.toLowerCase().includes(n.label.toLowerCase()));
    const target = hit ? hit.id : appId;
    conflictNodes.add(target);
    const nid = `conflict:${c.id}`;
    add(nid, { type: "conflict", label: c.title, sub: c.detail || "", conflict: true });
    link(nid, target, { kind: "conflict", label: "CONFLICT", conflict: true, sources: [] });
  }

  for (const n of nodes.values()) {
    n.docs = edges.filter((e) => (e.from === n.id || e.to === n.id) && e.kind === "evidence").length;
  }

  const count = (type) => [...nodes.values()].filter((n) => n.type === type).length;
  const stats = {
    Documents: count("document"),
    Pages: (caseData.documents || []).reduce((s, d) => s + (d.pages || 0), 0),
    Entities: count("person") + count("company"),
    Relationships: edges.filter((e) => e.kind === "ownership").length,
    Evidence: edges.reduce((s, e) => s + (e.sources?.length || 0), 0),
    Conflicts: conflicts.length,
  };

  return { nodes: [...nodes.values()], edges, stats, conflictNodes };
}

// Which nodes and edges a view mode shows.
export function filterGraph(graph, mode) {
  const keepKind = {
    all: () => true,
    ownership: (e) => e.kind === "ownership",
    identity: (e) => e.kind === "identity" || e.kind === "evidence",
    evidence: (e) => e.kind === "evidence" || e.kind === "ownership",
    conflicts: (e) => e.kind === "conflict",
  }[mode];
  const edges = graph.edges.filter(keepKind);
  const ids = new Set(edges.flatMap((e) => [e.from, e.to]));
  const nodes = graph.nodes.filter((n) => {
    if (mode === "ownership") return ids.has(n.id) || n.id === "applicant";
    if (mode === "identity") return n.type !== "document" || ids.has(n.id);
    return ids.has(n.id);
  });
  return { nodes, edges };
}
