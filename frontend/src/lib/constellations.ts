// Real constellations rendered as a faint dark-mode background motif.
//
// Star/line geometry comes from the bundled d3-celestial dataset
// (constellation-lines.ts): each constellation is a set of polylines whose
// vertices are real bright stars in [RA(deg), Dec(deg)]. We project those to a
// local tangent plane per constellation so the stick figures keep their true
// shape (RA is compressed by cos(dec)). Placement onto the canvas (position /
// scale / rotation) is supplied at render time so the layout can be randomized
// per refresh.

import { CONSTELLATION_DATA, type ConstellationData } from "./constellation-lines";

export interface Placement {
  x: number; // canvas position of the shape's center
  y: number;
  scale: number; // canvas units spanned by the larger dimension
  rotation: number; // radians (keeps real geometry; the sky rotates too)
}

export interface PlacedStar {
  x: number;
  y: number;
  r: number;
}

export interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface ProjectedConstellation {
  name: string;
  stars: PlacedStar[];
  segments: Segment[];
}

const DEG = Math.PI / 180;

// Project a constellation's real star coordinates onto the canvas at the given
// placement, preserving the true shape's aspect ratio. The shape is normalized
// around its center (so it can be rotated about that center), then rotated,
// scaled and translated to `place`.
export function projectConstellation(
  data: ConstellationData,
  place: Placement,
): ProjectedConstellation {
  const flat = data.lines.flat();
  const decCenter =
    (flat.reduce((s, p) => s + p[1], 0) / flat.length) * DEG;
  const k = Math.cos(decCenter);
  // Unwrap RA relative to the first vertex so constellations straddling
  // 0h/360h (e.g. Pegasus, Cassiopeia) don't tear across the seam.
  const refRa = flat[0][0];
  const toPlane = ([ra, dec]: number[]) => {
    let r = ra;
    while (r - refRa > 180) r -= 360;
    while (r - refRa < -180) r += 360;
    return { x: -r * k, y: -dec };
  };

  const projected = data.lines.map((ln) => ln.map(toPlane));
  const all = projected.flat();
  const xs = all.map((p) => p.x);
  const ys = all.map((p) => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const w = Math.max(...xs) - minX;
  const h = Math.max(...ys) - minY;
  const span = Math.max(w, h) || 1;

  const cos = Math.cos(place.rotation);
  const sin = Math.sin(place.rotation);
  const place1 = (p: { x: number; y: number }) => {
    // normalized, centered coordinates in roughly [-0.5, 0.5]
    const nx = (p.x - minX) / span - w / span / 2;
    const ny = (p.y - minY) / span - h / span / 2;
    const rx = nx * cos - ny * sin;
    const ry = nx * sin + ny * cos;
    return { x: place.x + rx * place.scale, y: place.y + ry * place.scale };
  };

  const placedLines = projected.map((ln) => ln.map(place1));

  const segments: Segment[] = [];
  for (const ln of placedLines) {
    for (let i = 0; i < ln.length - 1; i++) {
      segments.push({ x1: ln[i].x, y1: ln[i].y, x2: ln[i + 1].x, y2: ln[i + 1].y });
    }
  }

  // Star dots are the unique line endpoints (real bright stars).
  const seen = new Set<string>();
  const stars: PlacedStar[] = [];
  for (const ln of placedLines) {
    for (const p of ln) {
      const key = `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      stars.push({ x: p.x, y: p.y, r: 0.15 + Math.random() * 0.08 });
    }
  }

  return { name: data.name, stars, segments };
}

// Candidate region centers on the 160×90 canvas (kept clear of the edges that
// get cropped on non-widescreen viewports). Each chosen constellation lands in
// a distinct region, then gets jittered, so no two overlap on a given refresh.
const REGIONS = [
  { x: 32, y: 24 },
  { x: 80, y: 20 },
  { x: 128, y: 26 },
  { x: 34, y: 66 },
  { x: 84, y: 68 },
  { x: 130, y: 64 },
];

function shuffled<T>(arr: readonly T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Build a randomized sky: a random subset drawn from the full pool of
// constellations, each dropped into a distinct region with a little positional
// jitter, size variation and slight rotation. Call once per mount (per page
// refresh) for a fresh arrangement.
export function randomSky(): ProjectedConstellation[] {
  const regions = shuffled(REGIONS);
  const picks = shuffled(CONSTELLATION_DATA).slice(
    0,
    Math.min(3 + Math.floor(Math.random() * 2), regions.length), // 3 or 4
  );
  return picks.map((c, i) => {
    const r = regions[i];
    return projectConstellation(c, {
      x: r.x + (Math.random() - 0.5) * 10,
      y: r.y + (Math.random() - 0.5) * 8,
      scale: 20 + Math.random() * 6,
      rotation: (Math.random() - 0.5) * 0.5, // ±~14°
    });
  });
}
