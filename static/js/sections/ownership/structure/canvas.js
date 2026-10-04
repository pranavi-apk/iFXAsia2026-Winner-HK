// Pan and zoom for a viewport that holds one "world" element.
// Drag to pan. Ctrl/Cmd + wheel (or a trackpad pinch) to zoom, so a plain
// scroll still scrolls the page.
const MIN_SCALE = 0.3;
const MAX_SCALE = 2;
// How far (px on screen) the drawing may be dragged past the edge of the viewport.
const PAN_SLACK = 80;
// What the + and - buttons step through. Fit can land between these.
const ZOOM_STEPS = [0.5, 0.8, 1, 1.25, 1.5, 2];

export function createCanvas(viewport, world, onZoom = () => {}) {
  const view = { x: 0, y: 0, k: 1 };
  const clamp = (k) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, k));

  // Keep the drawing from being dragged out of sight: it can overshoot the
  // viewport edges by PAN_SLACK and no more. A drawing smaller than the
  // viewport can be moved around inside it, with the same slack.
  function constrain() {
    const w = world.offsetWidth * view.k;
    const h = world.offsetHeight * view.k;
    const range = (size, room) => [Math.min(0, room - size) - PAN_SLACK, Math.max(0, room - size) + PAN_SLACK];
    const [minX, maxX] = range(w, viewport.clientWidth);
    const [minY, maxY] = range(h, viewport.clientHeight);
    view.x = Math.min(maxX, Math.max(minX, view.x));
    view.y = Math.min(maxY, Math.max(minY, view.y));
  }

  function apply() {
    constrain();
    world.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.k})`;
    onZoom(view.k);
  }

  let drag = null;
  viewport.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || e.target.closest("button")) return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, vx: view.x, vy: view.y };
    viewport.setPointerCapture(e.pointerId);
    viewport.classList.add("panning");
  });
  viewport.addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    view.x = drag.vx + e.clientX - drag.x;
    view.y = drag.vy + e.clientY - drag.y;
    apply();
  });
  const endDrag = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    drag = null;
    viewport.classList.remove("panning");
  };
  viewport.addEventListener("pointerup", endDrag);
  viewport.addEventListener("pointercancel", endDrag);

  viewport.addEventListener(
    "wheel",
    (e) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const rect = viewport.getBoundingClientRect();
      zoomAt(e.clientX - rect.left, e.clientY - rect.top, Math.exp(-e.deltaY * 0.0025));
    },
    { passive: false }
  );

  // Zoom around a point given in viewport pixels, keeping that point still.
  function zoomAt(px, py, factor) {
    const next = clamp(view.k * factor);
    view.x = px - (px - view.x) * (next / view.k);
    view.y = py - (py - view.y) * (next / view.k);
    view.k = next;
    apply();
  }

  return {
    // Jump to the next standard zoom level above (direction 1) or below (-1).
    zoomStep(direction) {
      const EPS = 0.005;
      const target =
        direction > 0
          ? ZOOM_STEPS.find((step) => step > view.k + EPS)
          : [...ZOOM_STEPS].reverse().find((step) => step < view.k - EPS);
      if (target) zoomAt(viewport.clientWidth / 2, viewport.clientHeight / 2, target / view.k);
    },

    // Scale down (never up past maxScale) so a w x h world fits, and centre it.
    fit(w, h, { maxScale = 1, padding = 12 } = {}) {
      const k = clamp(Math.min((viewport.clientWidth - 2 * padding) / w, (viewport.clientHeight - 2 * padding) / h, maxScale));
      view.k = k;
      view.x = (viewport.clientWidth - w * k) / 2;
      view.y = (viewport.clientHeight - h * k) / 2;
      apply();
    },

    // Where a world point currently is on screen, and the reverse: pin a world
    // point to a screen position. Used to keep a node still when the layout shifts.
    screenOf: (wx, wy) => ({ x: view.x + wx * view.k, y: view.y + wy * view.k }),
    pin(wx, wy, sx, sy) {
      view.x = sx - wx * view.k;
      view.y = sy - wy * view.k;
      apply();
    },
  };
}
