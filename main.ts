// gta6-meme-x-01 — v2: "Lucia & Jason robbed a store for $500 / my AI agent
// made $500 on make.fun from home"
// Node 22, standard library only. No network, no wall clock, no files outside
// the repository, no downloaded images, no ML tools. Renders the meme picture
// (1200x1200 PNG) deterministically from code and copies POST.json to the
// output directory, where the gate reads it.
//
//   mkdir -p out && MAKEFUN_BOT_DIR=. MAKEFUN_OUTPUT_DIR=out node main.ts
//
// Visual direction (ATM — amati-tiru-modifikasi, references studied, never
// pasted): Rockstar's GTA VI key art (duo huge in frame, facing the viewer,
// Bonnie & Clyde co-equals; smooth neon gradient sky lavender -> pink ->
// orange -> gold at the horizon; low sun over water; palm silhouettes framing
// the edges; pale skyline across the bay) and Vice City synthwave art (Art
// Deco hotels with glowing vertical neon signs, wet reflections, saturated
// pink/purple/cyan). Heist posters: the cast posed together, masks, duffel
// bags overflowing with cash, money as the visual anchor, big bold title text.
//
// Grey's own "VI" badge (assets/grey-vi-badge.svg) is ported element by
// element into code below (sunset circle + sun slits + palms + dark gradient
// card + gold V / cyan I + X logo + calendar / hourglass / pill icons) and
// drawn SMALL as an emblem in the sky (Grey: "kecilin klw kegedean"). Its
// palette (viceSunset / tropicalGold / cyberCyan / dark card) is the meme's
// main palette. The SVG file itself is never read at runtime.
//
// The joke: Lucia & Jason wear robber masks and hold money bags in front of
// a Vice City store at sunset; the make.fun ghost floats big on the right
// with its star coin and money bag — the agent that earned the same $500
// from home. Ghost + badge + the words MAKE.FUN in the picture satisfy the
// judge's make.fun-presence rule; the text is huge so it still reads when
// the judge shrinks the picture to 480x480.

import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

const W = 1200;
const H = 1200;
const BOT_DIR = process.env.MAKEFUN_BOT_DIR ?? '/bot';
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// ---------------------------------------------------------------- palette
// Grey's VI badge palette (from assets/grey-vi-badge.svg).
type RGB = [number, number, number];
const PINK: RGB = [255, 60, 172]; // viceSunset #ff3cac
const PINK_SOFT: RGB = [255, 126, 179]; // card rim #ff7eb3
const PURPLE: RGB = [120, 75, 160]; // viceSunset #784ba0
const PURPLE_DEEP: RGB = [59, 31, 110];
const BLUE: RGB = [43, 134, 197]; // viceSunset #2b86c5
const GOLD: RGB = [255, 226, 89]; // tropicalGold #ffe259
const GOLD_MID: RGB = [240, 152, 25]; // tropicalGold #f09819
const GOLD_DEEP: RGB = [255, 81, 47]; // tropicalGold #ff512f
const CYAN: RGB = [0, 245, 212]; // cyberCyan #00f5d4
const CYAN_BLUE: RGB = [0, 187, 249]; // cyberCyan #00bbf9
const VIOLET: RGB = [106, 0, 244]; // cyberCyan #6a00f4
const ORANGE_NEON: RGB = [255, 154, 68]; // card rim #ff9a44
const INK: RGB = [18, 14, 36]; // dark card #120e24 — text bands
const INK_TOP: RGB = [30, 24, 54]; // dark card #1e1836
const INK_DEEP: RGB = [9, 7, 20]; // dark card #090714
const SLIT: RGB = [30, 20, 69]; // synthwave sun slits
const PALM_DARK: RGB = [19, 9, 38]; // palm gradient #130926
const PALM_MID: RGB = [59, 24, 95]; // palm gradient #3b185f
const PALM_TIP: RGB = [161, 37, 104]; // palm gradient #a12568
const PILL_A: RGB = [255, 42, 133]; // badge pill #ff2a85
const PILL_B: RGB = [255, 142, 83]; // badge pill #ff8e53
const WHITE: RGB = [255, 255, 255];
const GRAY_BAR: RGB = [142, 140, 168];
const BAR_GRAY2: RGB = [184, 181, 209];
const CLOUD_LILAC: RGB = [201, 138, 224];
const SKYLINE: RGB = [185, 163, 221];
const WATER_TOP: RGB = [59, 42, 122];
const WATER_BOT: RGB = [30, 20, 69];
const SAND_TOP: RGB = [242, 193, 132];
const SAND_BOT: RGB = [221, 154, 95];
const SAND_DARK: RGB = [185, 127, 82];
const SKIN: RGB = [232, 180, 138];
const HAIR_L: RGB = [42, 18, 48]; // Lucia, dark ponytail
const HAIR_J: RGB = [74, 44, 28]; // Jason, short brown
const TANK_L: RGB = [58, 43, 77]; // Lucia, dark tank top
const TANK_J: RGB = [242, 239, 232]; // Jason, white tank top
const TANK_J_SHADE: RGB = [216, 210, 196];
const JEANS: RGB = [47, 74, 110]; // Lucia shorts
const PANTS_J: RGB = [35, 35, 61]; // Jason dark jeans
const MASK: RGB = [30, 24, 54]; // robber masks
const SMILE: RGB = [122, 74, 58];
const BAG: RGB = [222, 184, 120];
const BAG_DARK: RGB = [146, 106, 52];
const COIN: RGB = [230, 59, 140];
const GHOST_EYE: RGB = [27, 20, 64];
const BILL: RGB = [63, 174, 106];
const BILL_LIGHT: RGB = [223, 245, 227];
const SHOP: RGB = [42, 28, 85];
const WINDOW_LIT: RGB = [255, 210, 138];
const HALO: RGB = [42, 22, 80];

type Stop = [number, RGB];
const SKY_STOPS: Stop[] = [
  [0, [59, 31, 110]],
  [0.22, PURPLE],
  [0.42, PINK],
  [0.62, [255, 94, 58]],
  [0.82, GOLD_MID],
  [1, GOLD],
];
const SUN_STOPS: Stop[] = [
  [0, GOLD],
  [0.5, ORANGE_NEON],
  [1, PINK],
];
const SUNSET_STOPS: Stop[] = [
  [0, PINK],
  [0.52, PURPLE],
  [1, BLUE],
];
const GOLD_STOPS: Stop[] = [
  [0, GOLD_DEEP],
  [0.5, GOLD_MID],
  [1, GOLD],
];
const CYAN_STOPS: Stop[] = [
  [0, CYAN],
  [0.5, CYAN_BLUE],
  [1, VIOLET],
];
const RIM_STOPS: Stop[] = [
  [0, PINK_SOFT],
  [0.5, CYAN],
  [1, ORANGE_NEON],
];
const CARD_STOPS: Stop[] = [
  [0, INK_TOP],
  [0.55, INK],
  [1, INK_DEEP],
];
const PANEL_STOPS: Stop[] = [
  [0, [217, 47, 142]],
  [0.52, [95, 58, 133]],
  [1, [34, 104, 158]],
];
const PILL_STOPS: Stop[] = [
  [0, PILL_A],
  [1, PILL_B],
];

// ---------------------------------------------------------------- framebuffer
const fb = new Uint8Array(W * H * 3);

function setPx(x: number, y: number, c: RGB): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  fb[i] = c[0];
  fb[i + 1] = c[1];
  fb[i + 2] = c[2];
}

function fillRect(x: number, y: number, w: number, h: number, c: RGB): void {
  const x0 = Math.max(0, Math.floor(x));
  const y0 = Math.max(0, Math.floor(y));
  const x1 = Math.min(W, Math.ceil(x + w));
  const y1 = Math.min(H, Math.ceil(y + h));
  for (let yy = y0; yy < y1; yy++) {
    for (let xx = x0; xx < x1; xx++) setPx(xx, yy, c);
  }
}

function fillCircle(cx: number, cy: number, r: number, c: RGB): void {
  const r2 = r * r;
  for (let yy = Math.floor(cy - r); yy <= Math.ceil(cy + r); yy++) {
    const dy = yy - cy;
    const dx = Math.floor(Math.sqrt(Math.max(0, r2 - dy * dy)));
    for (let xx = Math.floor(cx - dx); xx <= Math.ceil(cx + dx); xx++) setPx(xx, yy, c);
  }
}

function fillEllipse(cx: number, cy: number, rx: number, ry: number, c: RGB): void {
  for (let yy = Math.floor(cy - ry); yy <= Math.ceil(cy + ry); yy++) {
    const dy = (yy - cy) / ry;
    const dx = Math.floor(rx * Math.sqrt(Math.max(0, 1 - dy * dy)));
    for (let xx = Math.floor(cx - dx); xx <= Math.ceil(cx + dx); xx++) setPx(xx, yy, c);
  }
}

type Pt = [number, number];

function fillPolyC(pts: Pt[], colorForRow: (y: number) => RGB): void {
  let minY = H;
  let maxY = 0;
  for (const p of pts) {
    minY = Math.min(minY, Math.floor(p[1]));
    maxY = Math.max(maxY, Math.ceil(p[1]));
  }
  minY = Math.max(0, minY);
  maxY = Math.min(H - 1, maxY);
  const n = pts.length;
  for (let y = minY; y <= maxY; y++) {
    const xs: number[] = [];
    for (let i = 0; i < n; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % n];
      if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) {
        const t = (y - a[1]) / (b[1] - a[1]);
        xs.push(a[0] + t * (b[0] - a[0]));
      }
    }
    xs.sort((p, q) => p - q);
    const c = colorForRow(y);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      for (let x = Math.floor(xs[k]); x <= Math.ceil(xs[k + 1]); x++) setPx(x, y, c);
    }
  }
}

function fillPoly(pts: Pt[], c: RGB): void {
  fillPolyC(pts, () => c);
}

function drawArc(cx: number, cy: number, r: number, a0: number, a1: number, c: RGB, th: number): void {
  for (let a = a0; a <= a1; a += 2) {
    const rad = (a * Math.PI) / 180;
    for (let t = -th; t <= th; t++) {
      setPx(Math.round(cx + (r + t) * Math.cos(rad)), Math.round(cy + (r + t) * Math.sin(rad)), c);
    }
  }
}

function starPoints(cx: number, cy: number, rOuter: number, rInner: number): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? rOuter : rInner;
    const a = (Math.PI / 2) + (i * Math.PI) / 5;
    pts.push([cx + r * Math.cos(a), cy - r * Math.sin(a)]);
  }
  return pts;
}

// Four-point sparkle star, like the ghost's eyes.
function star4(cx: number, cy: number, r: number, c: RGB): void {
  fillPoly(
    [
      [cx, cy - r],
      [cx + r * 0.35, cy - r * 0.35],
      [cx + r, cy],
      [cx + r * 0.35, cy + r * 0.35],
      [cx, cy + r],
      [cx - r * 0.35, cy + r * 0.35],
      [cx - r, cy],
      [cx - r * 0.35, cy - r * 0.35],
    ],
    c,
  );
}

// ---------------------------------------------------------------- gradients
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpColor(c1: RGB, c2: RGB, t: number): RGB {
  return [
    Math.round(lerp(c1[0], c2[0], t)),
    Math.round(lerp(c1[1], c2[1], t)),
    Math.round(lerp(c1[2], c2[2], t)),
  ];
}

function gradColor(stops: Stop[], t: number): RGB {
  if (t <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i][0]) {
      const [t0, c0] = stops[i - 1];
      const [t1, c1] = stops[i];
      return lerpColor(c0, c1, (t - t0) / (t1 - t0));
    }
  }
  return stops[stops.length - 1][1];
}

function fillVGradientRect(x: number, y: number, w: number, h: number, stops: Stop[]): void {
  for (let yy = Math.floor(y); yy < Math.ceil(y + h); yy++) {
    fillRect(x, yy, w, 1, gradColor(stops, (yy - y) / h));
  }
}

function fillHGradientRect(x: number, y: number, w: number, h: number, stops: Stop[]): void {
  for (let xx = Math.floor(x); xx < Math.ceil(x + w); xx++) {
    fillRect(xx, y, 1, h, gradColor(stops, (xx - x) / w));
  }
}

// Horizontal extent of one row of a rounded rect (inclusive x range).
function roundRectRow(x: number, w: number, r: number, y: number, y0: number, h: number): [number, number] {
  let xs = x;
  let xe = x + w - 1;
  if (y < y0 + r) {
    const dy = y0 + r - y;
    const dx = Math.floor(Math.sqrt(Math.max(0, r * r - dy * dy)));
    xs = x + r - dx;
    xe = x + w - r + dx;
  } else if (y > y0 + h - r) {
    const dy = y - (y0 + h - r);
    const dx = Math.floor(Math.sqrt(Math.max(0, r * r - dy * dy)));
    xs = x + r - dx;
    xe = x + w - r + dx;
  }
  return [xs, xe];
}

function fillRoundRectV(x: number, y: number, w: number, h: number, r: number, stops: Stop[]): void {
  for (let yy = Math.floor(y); yy < Math.ceil(y + h); yy++) {
    const [xs, xe] = roundRectRow(x, w, r, yy, y, h);
    fillRect(xs, yy, xe - xs + 1, 1, gradColor(stops, (yy - y) / h));
  }
}

function fillRoundRectH(x: number, y: number, w: number, h: number, r: number, stops: Stop[]): void {
  for (let yy = Math.floor(y); yy < Math.ceil(y + h); yy++) {
    const [xs, xe] = roundRectRow(x, w, r, yy, y, h);
    for (let xx = Math.floor(xs); xx <= Math.ceil(xe); xx++) {
      setPx(xx, yy, gradColor(stops, (xx - x) / w));
    }
  }
}

function fillCircleGradV(cx: number, cy: number, r: number, stops: Stop[]): void {
  for (let yy = Math.floor(cy - r); yy <= Math.ceil(cy + r); yy++) {
    const dy = (yy - cy) / r;
    const dx = Math.floor(r * Math.sqrt(Math.max(0, 1 - dy * dy)));
    fillRect(cx - dx, yy, dx * 2 + 1, 1, gradColor(stops, (yy - (cy - r)) / (2 * r)));
  }
}

function polyCenter(pts: Pt[]): Pt {
  let sx = 0;
  let sy = 0;
  for (const [x, y] of pts) {
    sx += x;
    sy += y;
  }
  return [sx / pts.length, sy / pts.length];
}

function scalePoly(pts: Pt[], f: number): Pt[] {
  const [cx, cy] = polyCenter(pts);
  return pts.map(([x, y]) => [cx + (x - cx) * f, cy + (y - cy) * f] as Pt);
}

// ---------------------------------------------------------------- 5x7 bitmap font
// Each glyph is 7 rows of 5 cells; '#' is on, '.' is off. Uppercase + digits +
// the punctuation the meme text uses. Anything else renders as a blank.
const FONT: Record<string, string[]> = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.####', '#....', '#....', '#....', '#....', '#....', '.####'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.###.'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['.###.', '..#..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  J: ['..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  N: ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
  X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
  '0': ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
  '1': ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  '2': ['.###.', '#...#', '....#', '..##.', '.#...', '#....', '#####'],
  '3': ['#####', '...#.', '..#..', '...#.', '....#', '#...#', '.###.'],
  '4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  '5': ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  '6': ['..##.', '.#...', '#....', '####.', '#...#', '#...#', '.###.'],
  '7': ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
  '8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  '9': ['.###.', '#...#', '#...#', '.####', '....#', '...#.', '.##..'],
  ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
  '.': ['.....', '.....', '.....', '.....', '.....', '.##..', '.##..'],
  ',': ['.....', '.....', '.....', '.....', '.##..', '..#..', '.#...'],
  '!': ['..#..', '..#..', '..#..', '..#..', '..#..', '.....', '..#..'],
  ':': ['.....', '.##..', '.##..', '.....', '.##..', '.##..', '.....'],
  "'": ['..#..', '..#..', '.#...', '.....', '.....', '.....', '.....'],
  '-': ['.....', '.....', '.....', '.####', '.....', '.....', '.....'],
  $: ['..#..', '.####', '#.#..', '.###.', '..#.#', '####.', '..#..'],
  '%': ['##..#', '##.#.', '....#', '...#.', '..#..', '.#.##', '#..##'],
  '&': ['.###.', '#...#', '#.#.#', '.#...', '#.#.#', '#..#.', '.##.#'],
};

function textWidth(text: string, scale: number): number {
  return text.length * 6 * scale - scale;
}

function drawGlyph(ch: string, x: number, y: number, scale: number, c: RGB): void {
  const g = FONT[ch] ?? FONT[' '];
  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 5; col++) {
      if (g[row][col] === '#') {
        fillRect(x + col * scale, y + row * scale, scale, scale, c);
      }
    }
  }
}

function drawString(text: string, x: number, y: number, scale: number, c: RGB): void {
  let xx = x;
  for (const ch of text) {
    drawGlyph(ch, xx, y, scale, c);
    xx += 6 * scale;
  }
}

// Centered text with a dark drop shadow so it reads on any band.
function drawText(text: string, cx: number, y: number, scale: number, fg: RGB, shadow: RGB): void {
  const w = textWidth(text, scale);
  const x0 = Math.round(cx - w / 2);
  const off = Math.max(2, Math.round(scale / 4));
  for (const [dx, dy] of [[-off, 0], [off, 0], [0, -off], [0, off], [-off, -off], [off, off], [-off, off], [off, -off]] as Pt[]) {
    drawString(text, x0 + dx, y + dy, scale, shadow);
  }
  drawString(text, x0, y, scale, fg);
}

// Centered text made of coloured segments (e.g. "$500" in gold inside a
// white line), with the same drop shadow. Segments butt-join seamlessly.
function drawTextSegs(cx: number, y: number, scale: number, segs: Array<[string, RGB]>, shadow: RGB): void {
  const w = segs.reduce((a, [t]) => a + textWidth(t, scale), 0);
  const x0 = Math.round(cx - w / 2);
  const off = Math.max(2, Math.round(scale / 4));
  const drawAll = (dx: number, dy: number, colorFor: (seg: [string, RGB]) => RGB): void => {
    let xx = x0 + dx;
    for (const seg of segs) {
      drawString(seg[0], xx, y + dy, scale, colorFor(seg));
      xx += textWidth(seg[0], scale);
    }
  };
  for (const [dx, dy] of [[-off, 0], [off, 0], [0, -off], [0, off], [-off, -off], [off, off], [-off, off], [off, -off]] as Pt[]) {
    drawAll(dx, dy, () => shadow);
  }
  drawAll(0, 0, (seg) => seg[1]);
}

// ---------------------------------------------------------------- scene pieces
function drawSun(cx: number, cy: number, r: number): void {
  fillCircleGradV(cx, cy, r, SUN_STOPS);
  // Synthwave slits across the lower half, dark like the badge's sun.
  fillRect(cx - r * 0.9, cy + 12, r * 1.8, 6, SLIT);
  fillRect(cx - r * 0.84, cy + 26, r * 1.68, 7, SLIT);
  fillRect(cx - r * 0.76, cy + 40, r * 1.52, 8, SLIT);
}

function drawSkyline(baseY: number): void {
  const towers: Array<[number, number, number]> = [
    [60, 40, 32], [120, 36, 50], [180, 48, 28],
    [760, 44, 40], [830, 38, 54], [900, 52, 30], [980, 40, 44], [1060, 46, 32],
  ];
  for (const [tx, tw, th] of towers) {
    fillRect(tx, baseY - th, tw, th, SKYLINE);
    for (let wy = baseY - th + 8; wy < baseY - 8; wy += 13) {
      for (let wx = tx + 7; wx < tx + tw - 7; wx += 12) {
        if ((wx + wy) % 26 < 13) fillRect(wx, wy, 3, 4, GOLD);
      }
    }
  }
}

function drawPalm(baseX: number, baseY: number, lean: number, scale: number, c: RGB): void {
  // Trunk: a chain of overlapping circles along a gentle curve leaning
  // toward the scene, so the trunk reads as one smooth line.
  const steps = 30;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = baseX + lean * t * t * 90 * scale;
    const y = baseY - t * 210 * scale;
    fillCircle(x, y, (11 - t * 5) * scale, c);
  }
  const cx = baseX + lean * 90 * scale;
  const cy = baseY - 210 * scale;
  // Fronds: long drooping triangles fanning out from the crown.
  const angles = [-165, -135, -105, -75, -45, -15];
  for (const deg of angles) {
    const a = (deg * Math.PI) / 180;
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    const len = 185 * scale;
    const mid: Pt = [cx + dx * len * 0.55, cy + dy * len * 0.55 + len * 0.22];
    const tip: Pt = [cx + dx * len, cy + dy * len + len * 0.55];
    const px = -dy;
    const py = dx;
    fillPoly(
      [
        [cx + px * 5 * scale, cy + py * 5 * scale],
        [mid[0] + px * 3 * scale, mid[1] + py * 3 * scale],
        tip,
        [mid[0] - px * 3 * scale, mid[1] - py * 3 * scale],
        [cx - px * 5 * scale, cy - py * 5 * scale],
      ],
      c,
    );
  }
  // Coconuts.
  fillCircle(cx - 12 * scale, cy + 8 * scale, 7 * scale, c);
  fillCircle(cx + 10 * scale, cy + 10 * scale, 7 * scale, c);
}

function drawShop(): void {
  // Small Art Deco storefront on the beach promenade, left of the duo:
  // cyan neon roof edge, pink STORE sign, striped awning, lit window, door.
  fillRect(205, 596, 170, 6, CYAN);
  fillRect(205, 602, 170, 38, INK_TOP);
  drawText('STORE', 290, 608, 4, PINK, INK_DEEP);
  fillRect(205, 640, 170, 145, SHOP);
  // Awning stripes.
  for (let i = 0; i < 5; i++) {
    fillRect(205 + i * 34, 640, 34, 20, i % 2 === 0 ? PINK : WHITE);
  }
  fillRect(205, 660, 170, 4, INK_DEEP);
  // Lit window with shelves.
  fillRect(220, 695, 64, 55, WINDOW_LIT);
  fillRect(220, 712, 64, 3, SAND_DARK);
  fillRect(220, 730, 64, 3, SAND_DARK);
  // Door.
  fillRect(300, 705, 52, 80, INK_DEEP);
  fillCircle(344, 745, 3, GOLD);
}

function drawMoneyBag(bagX: number, bagY: number, r: number): void {
  // Tan money bag with a tied knot and a $ on it.
  fillPoly(
    [[bagX - 10, bagY - r * 0.85], [bagX + 10, bagY - r * 0.85], [bagX, bagY - r * 1.45]],
    BAG_DARK,
  );
  fillCircle(bagX, bagY, r, BAG);
  fillEllipse(bagX, bagY + r * 0.15, r, r * 0.8, BAG);
  drawGlyph('$', Math.round(bagX - 10), Math.round(bagY - 12), 4, BAG_DARK);
}

function drawLucia(x: number, feetY: number): void {
  // Front view, key-art pose: dark ponytail, dark tank top, denim shorts,
  // robber mask, gold hoop earring, money bag in her right hand.
  // Ponytail lock down her left side.
  fillPoly(
    [[x - 32, feetY - 352], [x - 52, feetY - 300], [x - 38, feetY - 222], [x - 18, feetY - 222], [x - 24, feetY - 300]],
    HAIR_L,
  );
  fillCircle(x - 18, feetY - 332, 30, HAIR_L); // hair mass
  fillCircle(x, feetY - 334, 27, HAIR_L); // hair cap
  fillCircle(x, feetY - 324, 24, SKIN); // face
  // Robber mask + eyes.
  fillRect(x - 24, feetY - 332, 48, 14, MASK);
  fillCircle(x - 11, feetY - 325, 3.5, WHITE);
  fillCircle(x + 11, feetY - 325, 3.5, WHITE);
  // Smile below the mask, gold hoop earring.
  drawArc(x, feetY - 306, 10, 15, 165, SMILE, 2);
  fillCircle(x - 25, feetY - 310, 5, GOLD);
  fillCircle(x - 25, feetY - 310, 2.5, SKIN);
  // Neck, tank top, arms.
  fillRect(x - 7, feetY - 302, 14, 10, SKIN);
  fillRect(x - 27, feetY - 292, 54, 95, TANK_L);
  fillRect(x - 41, feetY - 288, 13, 68, SKIN); // left arm
  fillRect(x + 28, feetY - 288, 13, 68, SKIN); // right arm
  fillCircle(x - 35, feetY - 216, 8, SKIN); // left hand
  fillCircle(x + 34, feetY - 216, 8, SKIN); // right hand
  // Denim shorts, legs, shoes.
  fillRect(x - 25, feetY - 197, 50, 38, JEANS);
  fillRect(x - 19, feetY - 159, 14, 143, SKIN);
  fillRect(x + 5, feetY - 159, 14, 143, SKIN);
  fillRect(x - 23, feetY - 16, 20, 16, INK_DEEP);
  fillRect(x + 3, feetY - 16, 20, 16, INK_DEEP);
  // Money bag in her right hand.
  drawMoneyBag(x + 67, feetY - 214, 26);
}

function drawJason(x: number, feetY: number): void {
  // Front view, key-art pose: short brown hair, white tank top, gold chain,
  // bicep tattoo, robber mask, money bag in his left hand, star coin right.
  fillCircle(x, feetY - 357, 27, HAIR_J); // hair cap
  fillCircle(x, feetY - 348, 25, SKIN); // face
  // Robber mask + eyes.
  fillRect(x - 26, feetY - 356, 52, 15, MASK);
  fillCircle(x - 12, feetY - 349, 4, WHITE);
  fillCircle(x + 12, feetY - 349, 4, WHITE);
  // Smile below the mask.
  drawArc(x, feetY - 328, 11, 15, 165, SMILE, 2);
  // Neck, gold chain, white tank top.
  fillRect(x - 8, feetY - 324, 16, 12, SKIN);
  drawArc(x, feetY - 310, 20, 20, 160, GOLD, 3);
  fillRect(x - 33, feetY - 310, 66, 100, TANK_J);
  fillRect(x + 17, feetY - 310, 16, 100, TANK_J_SHADE);
  // Arms, hands, bicep tattoo.
  fillRect(x - 49, feetY - 306, 15, 78, SKIN);
  fillRect(x + 34, feetY - 306, 15, 78, SKIN);
  fillCircle(x - 42, feetY - 224, 9, SKIN);
  fillCircle(x + 41, feetY - 224, 9, SKIN);
  fillPoly([[x + 38, feetY - 290], [x + 48, feetY - 290], [x + 43, feetY - 276]], INK_DEEP);
  // Dark jeans, shoes.
  fillRect(x - 29, feetY - 210, 58, 194, PANTS_J);
  fillRect(x - 3, feetY - 210, 4, 194, INK_DEEP);
  fillRect(x - 33, feetY - 16, 26, 16, INK_DEEP);
  fillRect(x + 1, feetY - 16, 26, 16, INK_DEEP);
  // Money bag in his left hand, star coin in his right.
  drawMoneyBag(x - 63, feetY - 222, 27);
  fillCircle(x + 50, feetY - 222, 12, GOLD_MID);
  fillPoly(starPoints(x + 50, feetY - 222, 8, 3.5), WHITE);
}

function drawGhost(cx: number, topY: number, s: number): void {
  // The make.fun ghost, drawn from scratch: white body, sparkle eyes, a smile,
  // a magenta star coin in one hand and a money bag in the other.
  const bodyW = 150 * s;
  const bodyH = 185 * s;
  const r = bodyW / 2;
  const cy = topY + r;
  fillCircle(cx, cy, r, WHITE); // dome
  fillRect(cx - r, cy, bodyW, bodyH - r, WHITE); // body
  // Wavy hem: three bumps along the bottom edge.
  for (let i = -1; i <= 1; i++) {
    fillCircle(cx + i * (bodyW / 3), topY + bodyH - r * 0.28, (bodyW / 6) * 1.05, WHITE);
  }
  // Arms.
  fillEllipse(cx - r - 12 * s, cy + 62 * s, 20 * s, 12 * s, WHITE);
  fillEllipse(cx + r + 12 * s, cy + 62 * s, 20 * s, 12 * s, WHITE);
  // Sparkle eyes: dark four-point stars with a white glint.
  for (const ex of [-30, 30]) {
    const exx = cx + ex * s;
    const eyy = cy + 8 * s;
    fillPoly(
      [
        [exx, eyy - 16 * s],
        [exx + 6 * s, eyy - 6 * s],
        [exx + 16 * s, eyy],
        [exx + 6 * s, eyy + 6 * s],
        [exx, eyy + 16 * s],
        [exx - 6 * s, eyy + 6 * s],
        [exx - 16 * s, eyy],
        [exx - 6 * s, eyy - 6 * s],
      ],
      GHOST_EYE,
    );
    fillCircle(exx - 4 * s, eyy - 6 * s, 3 * s, WHITE);
  }
  // Smile.
  drawArc(cx, cy + 42 * s, 20 * s, 15, 165, GHOST_EYE, 2);
  // Magenta star coin, held up on the right.
  const coinX = cx + r + 42 * s;
  const coinY = cy + 20 * s;
  fillCircle(coinX, coinY, 34 * s, COIN);
  fillPoly(starPoints(coinX, coinY, 24 * s, 10 * s), WHITE);
  // Money bag, held low on the left, with a $ on it.
  const bagX = cx - r - 34 * s;
  const bagY = cy + 108 * s;
  fillPoly([[bagX - 10 * s, bagY - 26 * s], [bagX + 10 * s, bagY - 26 * s], [bagX, bagY - 44 * s]], BAG_DARK);
  fillCircle(bagX, bagY, 30 * s, BAG);
  fillEllipse(bagX, bagY + 4 * s, 30 * s, 24 * s, BAG);
  drawGlyph('$', Math.round(bagX - 10 * s), Math.round(bagY - 12 * s), 4, BAG_DARK);
}

// ---------------------------------------------------------------- Grey's VI badge
// Port of assets/grey-vi-badge.svg (512x512 viewBox) into code. The badge is
// drawn SMALL as an emblem: (cx, cy) is the badge centre, s scales the 512
// units (s = 0.46 -> ~235px wide). Local helpers map SVG coordinates to the
// canvas. Nothing is read from the SVG at runtime.
function heartPoly(cx: number, cy: number, k: number): Pt[] {
  const base: Pt[] = [
    [0, -6], [-4, -11], [-10, -9], [-12, -3], [-9, 3],
    [0, 10], [9, 3], [12, -3], [10, -9], [4, -11],
  ];
  return base.map(([x, y]) => [cx + x * k, cy + y * k] as Pt);
}

function drawViBadge(cx: number, cy: number, s: number): void {
  const X = (u: number): number => cx + (u - 256) * s;
  const Y = (v: number): number => cy + (v - 256) * s;
  const bRect = (u: number, v: number, w: number, h: number, c: RGB): void => {
    fillRect(X(u), Y(v), w * s, h * s, c);
  };
  const bCircle = (u: number, v: number, r: number, c: RGB): void => {
    fillCircle(X(u), Y(v), r * s, c);
  };
  const bPoly = (pts: Pt[], c: RGB): void => {
    fillPoly(pts.map(([u, v]) => [X(u), Y(v)] as Pt), c);
  };
  const bRoundRectV = (u: number, v: number, w: number, h: number, r: number, stops: Stop[]): void => {
    fillRoundRectV(X(u), Y(v), w * s, h * s, r * s, stops);
  };
  const bRoundRectH = (u: number, v: number, w: number, h: number, r: number, stops: Stop[]): void => {
    fillRoundRectH(X(u), Y(v), w * s, h * s, r * s, stops);
  };

  // Sunset circle with vertical viceSunset gradient + synthwave slits.
  fillCircleGradV(X(256), Y(240), 168 * s, SUNSET_STOPS);
  bRect(94, 256, 324, 7, INK);
  bRect(104, 274, 304, 9, INK);
  bRect(118, 294, 276, 11, INK);
  bRect(138, 316, 236, 13, INK);

  // Palms flanking the circle (trunks + 4 fronds each, SVG paths as polys).
  bPoly([[88, 356], [124, 162], [134, 164], [105, 356]], PALM_DARK);
  bPoly([[128, 164], [88, 150], [48, 176], [90, 172], [126, 160]], PALM_MID);
  bPoly([[128, 162], [90, 120], [54, 126], [92, 150], [126, 168]], PALM_MID);
  bPoly([[130, 162], [160, 108], [176, 112], [150, 140], [132, 166]], PALM_MID);
  bPoly([[131, 165], [170, 140], [194, 170], [160, 172], [128, 166]], PALM_MID);
  bPoly([[424, 356], [388, 170], [378, 172], [407, 356]], PALM_DARK);
  bPoly([[384, 172], [424, 150], [464, 176], [422, 172], [386, 160]], PALM_MID);
  bPoly([[384, 170], [422, 120], [458, 126], [420, 150], [386, 168]], PALM_MID);
  bPoly([[382, 170], [352, 108], [336, 112], [362, 140], [380, 166]], PALM_MID);
  bPoly([[381, 173], [342, 140], [318, 170], [352, 172], [384, 166]], PALM_MID);

  // Dark card with gradient rim.
  bRoundRectH(74, 138, 364, 278, 28, RIM_STOPS);
  bRoundRectV(78, 142, 356, 270, 24, CARD_STOPS);

  // Card top row: mini sunset icon, white bar, cyan check, grey bar, X logo.
  fillCircleGradV(X(116), Y(182), 20 * s, SUNSET_STOPS);
  bCircle(116, 177, 7, GOLD);
  fillEllipse(X(116), Y(196), 13 * s, 4 * s, CYAN);
  bRect(146, 168, 96, 10, WHITE);
  bCircle(253, 173, 7, CYAN);
  bPoly(
    [[249.5, 172], [252, 175], [257.5, 168], [257.5, 170.5], [252, 177.5], [249.5, 175]],
    INK_DEEP,
  );
  bRect(146, 185, 64, 7, GRAY_BAR);
  bCircle(394, 182, 22, CYAN);
  bPoly([[383, 169], [388, 169], [406, 194], [401, 194]], WHITE);
  bPoly([[402, 169], [407, 169], [384, 194], [379, 194]], WHITE);

  // Text bars.
  bRect(98, 216, 168, 10, WHITE);
  bRect(274, 216, 94, 10, GOLD_MID);
  bRect(98, 234, 212, 10, BAR_GRAY2);

  // VI panel with the big letters: V gold, I cyan, white rim, dark shadow.
  bRoundRectV(98, 254, 316, 114, 18, PANEL_STOPS);
  const vPts: Pt[] = [[176, 268], [204, 268], [222, 322], [240, 268], [268, 268], [235, 354], [209, 354]];
  const vCanvas: Pt[] = vPts.map(([u, v]) => [X(u), Y(v)] as Pt);
  const vShadow: Pt[] = vCanvas.map(([x, y]) => [x + 4 * s, y + 5 * s] as Pt);
  fillPoly(vShadow, INK_DEEP);
  fillPoly(scalePoly(vCanvas, 1.07), WHITE);
  const vTop = Y(268);
  const vBot = Y(354);
  fillPolyC(vCanvas, (y) => gradColor(GOLD_STOPS, (y - vTop) / (vBot - vTop)));
  fillRect(X(286), Y(273), 30 * s, 86 * s, INK_DEEP); // I shadow
  fillRect(X(280), Y(266), 34 * s, 90 * s, WHITE); // I rim
  fillVGradientRect(X(282), Y(268), 30 * s, 86 * s, CYAN_STOPS); // I cyan
  fillPoly(starPoints(X(244), Y(259), 10 * s, 4 * s), GOLD);

  // Corner icons: calendar top-left, hourglass top-right, pill bottom.
  bRoundRectV(28, 55, 76, 74, 16, [[0, WHITE], [1, [220, 228, 245]]]);
  bRoundRectH(28, 55, 76, 24, 12, PILL_STOPS);
  bRect(46, 49, 7, 14, GOLD);
  bRect(79, 49, 7, 14, GOLD);
  bPoly(
    [[54, 102], [62, 94], [70, 102], [78, 94], [86, 102], [86, 106], [78, 98], [70, 106], [62, 98], [54, 106]],
    PINK,
  );
  bCircle(411, 127, 36, INK);
  drawArc(X(411), Y(127), 36 * s, 0, 360, CYAN, 2);
  bRect(395, 105, 32, 5, GOLD_MID);
  bRect(395, 144, 32, 5, GOLD_MID);
  bPoly([[399, 110], [423, 110], [411, 124]], GOLD);
  bPoly([[411, 132], [423, 148], [399, 148]], GOLD);
  bRoundRectH(311, 389, 144, 50, 25, [[0, WHITE], [1, WHITE]]);
  bRoundRectH(314, 392, 138, 44, 22, PILL_STOPS);
  fillPoly(heartPoly(X(342), Y(414), 1), WHITE);
  bRect(368, 408, 12, 4, GOLD);
  bPoly([[380, 405], [388, 410], [380, 415]], GOLD);
  bRect(370, 420, 12, 4, GOLD);
  bPoly([[370, 417], [362, 422], [370, 427]], GOLD);
  bCircle(428, 414, 4.5, CYAN);

  // Mini icons on the card's bottom row: pink heart + cyan bookmark.
  fillPoly(heartPoly(X(232), Y(388), 0.8), PILL_A);
  bPoly([[284, 377], [296, 377], [296, 393], [290, 388.5], [284, 393]], CYAN);
}

// ---------------------------------------------------------------- the picture
function render(): void {
  // Text bands.
  fillRect(0, 0, W, 240, INK);
  fillRect(0, 880, W, 320, INK);
  fillRect(0, 236, W, 4, PINK);
  fillRect(0, 880, W, 4, CYAN);

  // Neon gradient sky (indigo -> magenta -> pink -> orange -> gold).
  fillVGradientRect(0, 240, W, 400, SKY_STOPS);

  // Clouds as small puffy clusters, not flat saucers.
  fillEllipse(280, 332, 45, 8, PINK_SOFT);
  fillEllipse(315, 326, 55, 10, PINK_SOFT);
  fillEllipse(350, 332, 40, 7, PINK_SOFT);
  fillEllipse(875, 302, 50, 9, PINK_SOFT);
  fillEllipse(915, 295, 60, 11, PINK_SOFT);
  fillEllipse(955, 302, 45, 8, PINK_SOFT);
  fillEllipse(680, 427, 35, 6, CLOUD_LILAC);
  fillEllipse(710, 422, 45, 8, CLOUD_LILAC);
  for (const [bx, by] of [[330, 310], [420, 285], [880, 290]] as Pt[]) {
    fillPoly([[bx - 14, by], [bx, by - 8], [bx + 14, by], [bx, by + 2]], PALM_DARK);
  }

  // Low sun + skyline across the bay + water + beach.
  drawSun(600, 565, 105);
  drawSkyline(650);
  fillVGradientRect(0, 650, W, 110, [[0, WATER_TOP], [1, WATER_BOT]]);
  fillRect(565, 665, 70, 5, GOLD);
  fillRect(575, 690, 50, 5, GOLD);
  fillRect(560, 715, 80, 5, GOLD);
  fillRect(570, 740, 60, 5, GOLD);
  fillRect(200, 680, 120, 4, PINK_SOFT);
  fillRect(850, 700, 140, 4, PINK_SOFT);
  fillRect(100, 720, 80, 4, CLOUD_LILAC);
  fillVGradientRect(0, 760, W, 120, [[0, SAND_TOP], [1, SAND_BOT]]);
  for (const [sx, sy] of [[180, 800], [420, 840], [980, 800], [1080, 845], [300, 865]] as Pt[]) {
    fillEllipse(sx, sy, 14, 4, SAND_DARK);
  }

  // The ghost's spotlight halo, then the palms (fronds go behind the shop),
  // then the storefront.
  fillCircle(950, 590, 140, HALO);
  drawArc(950, 590, 140, 0, 360, CYAN, 3);
  drawPalm(60, 880, 1, 1.15, PALM_DARK);
  drawPalm(1140, 880, -1, 1.15, PALM_DARK);
  drawShop();

  // Grey's VI badge, small as an emblem in the sky.
  drawViBadge(600, 360, 0.5);

  // The make.fun ghost, big on the right, holding star coin + money bag.
  drawGhost(935, 500, 1.25);

  // The duo, front view, masks on, money bags in hand (Jason behind, Lucia
  // in front, like the key art).
  fillEllipse(455, 862, 60, 10, SAND_DARK);
  fillEllipse(655, 862, 60, 10, SAND_DARK);
  drawJason(655, 862);
  drawLucia(455, 862);

  // Scattered bills + star coins at their feet.
  fillRect(505, 852, 30, 13, BILL);
  fillRect(510, 857, 20, 2, BILL_LIGHT);
  fillRect(700, 855, 30, 13, BILL);
  fillRect(705, 860, 20, 2, BILL_LIGHT);
  fillPoly([[560, 770], [580, 780], [560, 790], [540, 780]], BILL);
  fillCircle(860, 700, 10, GOLD_MID);
  fillPoly(starPoints(860, 700, 6, 2.5), WHITE);
  fillCircle(1050, 720, 8, GOLD_MID);
  fillPoly(starPoints(1050, 720, 5, 2), WHITE);

  // Stars in the top band.
  star4(50, 40, 8, WHITE);
  star4(1150, 50, 8, WHITE);
  star4(600, 18, 6, WHITE);
  star4(90, 200, 6, WHITE);
  star4(1110, 210, 6, WHITE);
  fillCircle(90, 90, 3, WHITE);
  fillCircle(1110, 120, 3, WHITE);

  // The joke, huge, top and bottom, with $500 in gold and MAKE.FUN in pink.
  drawText('LUCIA & JASON ROBBED', 600, 28, 9, WHITE, INK_DEEP);
  drawTextSegs(600, 130, 9, [['A STORE FOR ', WHITE], ['$500', GOLD]], INK_DEEP);
  drawTextSegs(600, 930, 8, [['MY AI AGENT MADE ', WHITE], ['$500', GOLD]], INK_DEEP);
  drawTextSegs(600, 1038, 8, [['ON ', WHITE], ['MAKE.FUN', PINK], [' FROM HOME', WHITE]], INK_DEEP);
  star4(500, 1155, 6, GOLD);
  star4(600, 1155, 8, GOLD);
  star4(700, 1155, 6, GOLD);
}

// ---------------------------------------------------------------- PNG encoding
const CRC_TABLE: number[] = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c >>> 0;
}

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(8 + data.length + 4);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, 'ascii'), data])), 8 + data.length);
  return out;
}

function pngEncode(): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0; // filter: none
    raw.set(fb.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------- main
function main(): void {
  render();
  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(join(OUTPUT_DIR, 'meme.png'), pngEncode());
  const postPath = join(BOT_DIR, 'POST.json');
  let post: unknown;
  try {
    post = JSON.parse(readFileSync(postPath, 'utf8'));
  } catch (err) {
    console.error(`POST.json could not be read from ${postPath}: ${(err as Error).message}`);
    process.exit(1);
  }
  if (typeof post !== 'object' || post === null || typeof (post as { url?: unknown }).url !== 'string') {
    console.error('POST.json must be a JSON object with a string "url" field');
    process.exit(1);
  }
  copyFileSync(postPath, join(OUTPUT_DIR, 'POST.json'));
}

main();
