// A curved line between two [lat, lng] points, as a list of points to draw.
// It is a quadratic curve bowed towards the north pole, so lines arch over the
// map like flight paths rather than cutting straight across it.
const STEPS = 48;
const MAX_LIFT = 40; // degrees of latitude
const MAX_LAT = 80;

export function arcPoints(a, b) {
  const distance = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const lift = Math.min(MAX_LIFT, distance * 0.3);
  const control = [Math.min(MAX_LAT, (a[0] + b[0]) / 2 + lift), (a[1] + b[1]) / 2];

  const points = [];
  for (let i = 0; i <= STEPS; i++) {
    const t = i / STEPS;
    const u = 1 - t;
    points.push([
      u * u * a[0] + 2 * u * t * control[0] + t * t * b[0],
      u * u * a[1] + 2 * u * t * control[1] + t * t * b[1],
    ]);
  }
  return points;
}
