// Pure layout for the ownership canvas: no DOM in here.
//
// The applicant sits in the middle. Its owners are drawn above it ("up") and
// its subsidiaries below ("down"). Each direction is a tree; a node's children
// are only laid out while that node is expanded.
export const CARD_W = 250;
export const CARD_H = 88;
export const GAP_X = 28;
export const GAP_Y = 72; // vertical space between rows, for the arrow and percentage
export const ARROW_RUN = GAP_Y / 2; // the last vertical stretch into a card
export const PAD = 24;

// `expanded` holds keys like "down:eastbridge" or "up:applicant".
export const expKey = (dir, id) => `${dir}:${id}`;

const visibleKids = (node, dir, expanded) => (expanded.has(expKey(dir, node.id)) ? node.children || [] : []);

function measure(node, dir, expanded, widths) {
  let block = 0;
  visibleKids(node, dir, expanded).forEach((kid, i) => {
    block += measure(kid, dir, expanded, widths) + (i ? GAP_X : 0);
  });
  const width = Math.max(CARD_W, block);
  widths.set(node, width);
  return width;
}

function place(node, dir, expanded, widths, left, level, parent, out) {
  const slot = widths.get(node);
  const entry = { node, dir, level, cx: left + slot / 2, parent };
  out.push(entry);

  const kids = visibleKids(node, dir, expanded);
  const block = kids.reduce((sum, kid, i) => sum + widths.get(kid) + (i ? GAP_X : 0), 0);
  let cursor = left + (slot - block) / 2;
  kids.forEach((kid) => {
    place(kid, dir, expanded, widths, cursor, level + 1, entry, out);
    cursor += widths.get(kid) + GAP_X;
  });
}

function layoutDirection(root, dir, expanded) {
  const widths = new Map();
  const width = measure(root, dir, expanded, widths);
  const entries = [];
  place(root, dir, expanded, widths, 0, 0, null, entries);
  return { entries, width };
}

export function layoutStructure(structure, expanded) {
  const down = layoutDirection({ ...structure.applicant, children: structure.subsidiaries }, "down", expanded);
  const up = layoutDirection({ ...structure.applicant, children: structure.owners }, "up", expanded);
  const total = Math.max(down.width, up.width);

  const deepestUp = Math.max(...up.entries.map((e) => e.level));
  const deepestDown = Math.max(...down.entries.map((e) => e.level));
  const rowTop = (row) => PAD + row * (CARD_H + GAP_Y);

  // `parent` points at the unshifted entry, so keep a map to its placed copy.
  const placedOf = new Map();
  const placed = (result, shift) =>
    result.entries.map((e) => {
      const row = e.dir === "up" ? deepestUp - e.level : deepestUp + e.level;
      const copy = { ...e, cx: e.cx + shift + PAD, y: rowTop(row), isRoot: e.level === 0 };
      placedOf.set(e, copy);
      return copy;
    });
  const downNodes = placed(down, (total - down.width) / 2);
  const upNodes = placed(up, (total - up.width) / 2);

  // The applicant is in both lists; keep one copy for drawing.
  const nodes = [...downNodes, ...upNodes.filter((e) => !e.isRoot)];

  const edges = [];
  const toggles = [];
  const anchors = {}; // where each card is, so the view can stay put when the layout shifts
  for (const e of [...downNodes, ...upNodes]) {
    const key = expKey(e.dir, e.node.id);
    anchors[key] = { x: e.cx, y: e.y };
    // A button only shows while a node's children are hidden; Collapse All closes everything.
    if ((e.node.children || []).length > 0 && !expanded.has(key)) {
      toggles.push({
        key,
        dir: e.dir,
        // Owner-side buttons sit off-centre so they do not cover the arrow arriving at the card.
        cx: e.dir === "down" ? e.cx : e.cx + 30,
        y: e.dir === "down" ? e.y + CARD_H : e.y,
        count: e.node.children.length,
      });
    }
    if (!e.parent) continue;
    const parent = placedOf.get(e.parent);
    // Arrows always point from the owner to the thing it owns.
    const owner = e.dir === "down" ? parent : e;
    const owned = e.dir === "down" ? e : parent;
    edges.push({
      from: { x: owner.cx, y: owner.y + CARD_H },
      to: { x: owned.cx, y: owned.y },
      pct: e.dir === "down" ? e.node.pct : null,
    });
  }

  return {
    nodes,
    edges,
    toggles,
    anchors,
    width: total + 2 * PAD,
    height: (deepestUp + deepestDown + 1) * CARD_H + (deepestUp + deepestDown) * GAP_Y + 2 * PAD,
  };
}
