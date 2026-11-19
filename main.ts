// gta6-meme-x-01 — "Waited 13 years for GTA 6, my AI agent got paid on make.fun first"
// Node 22, standard library only. No network, no wall clock, no files outside the
// repository. Renders the meme picture (1200x1200 PNG) deterministically from code
// and copies POST.json to the output directory, where the gate reads it.
//
//   mkdir -p out && MAKEFUN_BOT_DIR=. MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The picture is the joke: a Leonida / Vice City sunset, two original flat-vector
// characters watching it from the beach, and the make.fun ghost floating in the
// scene holding a magenta star coin and a money bag. Big text top and bottom so
// the joke still reads when the judge shrinks the picture to 480x480.

import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

const W = 1200;
const H = 1200;
const BOT_DIR = process.env.MAKEFUN_BOT_DIR ?? '/bot';
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// ---------------------------------------------------------------- palette
type RGB = [number, number, number];
const INK: RGB = [27, 20, 64]; // deep indigo, text bands + outlines
const WHITE: RGB = [255, 255, 255];
const PEACH: RGB = [255, 217, 160];
const ORANGE: RGB = [255, 158, 109];
const MAGENTA: RGB = [232, 93, 158];
const PURPLE: RGB = [123, 75, 168];
const SUN: RGB = [255, 233, 168];
const OCEAN: RGB = [59, 42, 107];
const REFLECT: RGB = [255, 201, 138];
const SAND: RGB = [232, 200, 138];
const SAND_DARK: RGB = [206, 168, 104];
const PALM: RGB = [36, 17, 80];
const BUILDING: RGB = [58, 32, 96];
const WINDOW_LIT: RGB = [255, 217, 160];
const SKIN: RGB = [232, 180, 138];
const TEAL: RGB = [46, 158, 143];
const CORAL: RGB = [255, 107, 107];
const PINK_HAIR: RGB = [255, 122, 184];
const NAVY: RGB = [31, 42, 92];
const PANTS: RGB = [43, 43, 74];
const BAG: RGB = [222, 184, 120];
const BAG_DARK: RGB = [146, 106, 52];
const COIN: RGB = [230, 59, 140];
const GHOST_EYE: RGB = [27, 20, 64];

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

function fillPoly(pts: Pt[], c: RGB): void {
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
    for (let k = 0; k + 1 < xs.length; k += 2) {
      for (let x = Math.floor(xs[k]); x <= Math.ceil(xs[k + 1]); x++) setPx(x, y, c);
    }
  }
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

// Centered text with a dark drop shadow so it reads on any band.
function drawText(text: string, cx: number, y: number, scale: number, fg: RGB, shadow: RGB): void {
  const w = textWidth(text, scale);
  const x0 = Math.round(cx - w / 2);
  const off = Math.max(2, Math.round(scale / 4));
  for (const [dx, dy] of [[-off, 0], [off, 0], [0, -off], [0, off], [-off, -off], [off, off], [-off, off], [off, -off]] as Pt[]) {
    let x = x0 + dx;
    for (const ch of text) {
      drawGlyph(ch, x, y + dy, scale, shadow);
      x += 6 * scale;
    }
  }
  let x = x0;
  for (const ch of text) {
    drawGlyph(ch, x, y, scale, fg);
    x += 6 * scale;
  }
}

// ---------------------------------------------------------------- scene pieces
function drawSun(cx: number, cy: number, r: number): void {
  fillCircle(cx, cy, r, SUN);
  // Synthwave slits across the lower half, in the sky-band colour behind them.
  fillRect(cx - r, 500, r * 2, 10, ORANGE);
  fillRect(cx - r, 540, r * 2, 12, ORANGE);
  fillRect(cx - r, 582, r * 2, 14, MAGENTA);
}

function drawSkyline(x0: number, x1: number, baseY: number): void {
  const buildings: Array<[number, number, number]> = [
    [0, 52, 44], [58, 78, 60], [124, 40, 36], [170, 66, 58],
  ];
  for (const [dx, w, h] of buildings) {
    fillRect(x0 + dx, baseY - h, w, h, BUILDING);
    for (let wy = baseY - h + 8; wy < baseY - 8; wy += 14) {
      for (let wx = x0 + dx + 8; wx < x0 + dx + w - 8; wx += 14) {
        if ((wx + wy) % 28 < 14) fillRect(wx, wy, 3, 4, WINDOW_LIT);
      }
    }
  }
  void x1;
}

function drawPalm(baseX: number, baseY: number, lean: number, scale: number): void {
  // Trunk: a chain of overlapping circles along a gentle curve leaning
  // toward the scene, so the trunk reads as one smooth line.
  const steps = 30;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = baseX + lean * t * t * 90 * scale;
    const y = baseY - t * 210 * scale;
    fillCircle(x, y, (11 - t * 5) * scale, PALM);
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
      PALM,
    );
  }
  // Coconuts.
  fillCircle(cx - 12 * scale, cy + 8 * scale, 7 * scale, PALM);
  fillCircle(cx + 10 * scale, cy + 10 * scale, 7 * scale, PALM);
}

function drawGuy(x: number, feetY: number): void {
  // Back view: cap, head, teal shirt, dark trousers.
  fillRect(x - 22, feetY - 100, 44, 56, TEAL); // torso
  fillRect(x - 26, feetY - 100, 8, 44, TEAL); // left arm
  fillRect(x + 18, feetY - 100, 8, 44, TEAL); // right arm
  fillRect(x - 20, feetY - 44, 17, 44, PANTS); // left leg
  fillRect(x + 3, feetY - 44, 17, 44, PANTS); // right leg
  fillCircle(x, feetY - 116, 17, SKIN); // head
  fillCircle(x, feetY - 122, 17, NAVY); // cap dome
  fillRect(x - 17, feetY - 124, 34, 6, NAVY); // cap brim
}

function drawGirl(x: number, feetY: number): void {
  // Back view: pink hair down her back, coral top, skirt, bare legs.
  fillRect(x - 17, feetY - 118, 34, 52, PINK_HAIR); // hair down the back
  fillCircle(x, feetY - 112, 19, PINK_HAIR); // hair
  fillCircle(x, feetY - 108, 14, SKIN); // head
  fillRect(x - 20, feetY - 96, 40, 50, CORAL); // top
  fillRect(x - 24, feetY - 96, 7, 40, CORAL); // left arm
  fillRect(x + 17, feetY - 96, 7, 40, CORAL); // right arm
  fillPoly(
    [[x - 20, feetY - 46], [x + 20, feetY - 46], [x + 28, feetY - 12], [x - 28, feetY - 12]],
    CORAL,
  ); // skirt
  fillRect(x - 16, feetY - 12, 12, 12, SKIN); // left leg
  fillRect(x + 4, feetY - 12, 12, 12, SKIN); // right leg
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

// ---------------------------------------------------------------- the picture
function render(): void {
  // Text bands.
  fillRect(0, 0, W, 260, INK);
  fillRect(0, 880, W, 320, INK);
  fillRect(0, 256, W, 4, MAGENTA);
  fillRect(0, 880, W, 4, MAGENTA);

  // Sunset sky in flat bands.
  fillRect(0, 260, W, 130, PEACH);
  fillRect(0, 390, W, 130, ORANGE);
  fillRect(0, 520, W, 130, MAGENTA);
  fillRect(0, 650, W, 30, PURPLE);

  // Sun + skyline + ocean + beach.
  drawSun(600, 500, 125);
  drawSkyline(10, 260, 620);
  drawSkyline(940, 1190, 620);
  fillRect(0, 620, W, 140, OCEAN);
  fillRect(545, 620, 110, 140, REFLECT);
  // A few short darker dashes inside the reflection, so it reads as water.
  fillRect(560, 648, 80, 4, OCEAN);
  fillRect(568, 688, 64, 4, OCEAN);
  fillRect(556, 728, 88, 4, OCEAN);
  fillRect(0, 760, W, 120, SAND);
  for (const [sx, sy] of [[180, 800], [420, 840], [980, 800], [1080, 845], [300, 865]] as Pt[]) {
    fillEllipse(sx, sy, 14, 4, SAND_DARK);
  }

  // Birds.
  for (const [bx, by] of [[330, 330], [420, 300], [880, 300]] as Pt[]) {
    fillPoly([[bx - 14, by], [bx, by - 8], [bx + 14, by], [bx, by + 2]], PALM);
  }

  // Palms frame the scene.
  drawPalm(60, 880, 1, 1);
  drawPalm(1140, 880, -1, 1);

  // Two friends watching the sunset, backs to us.
  drawGuy(505, 876);
  drawGirl(665, 876);

  // The make.fun ghost, part of the scene, holding its star coin and money bag.
  drawGhost(885, 350, 1);

  // Stars in the top band.
  for (const [sx, sy] of [[40, 30], [90, 200], [1140, 40], [1100, 210], [600, 18], [90, 90], [1110, 120]] as Pt[]) {
    fillCircle(sx, sy, 3, WHITE);
  }

  // The joke, huge, top and bottom. Bottom lines at scale 9 so they keep a
  // comfortable margin from the picture's left and right edges.
  drawText('WAITED 13 YEARS', 600, 36, 12, WHITE, PURPLE);
  drawText('FOR GTA 6', 600, 148, 12, WHITE, PURPLE);
  drawText('MY AI AGENT GOT PAID', 600, 930, 9, WHITE, PURPLE);
  drawText('ON MAKE.FUN FIRST', 600, 1040, 9, WHITE, PURPLE);
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
