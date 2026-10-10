// Generates the fork's custom furniture (sprites + manifests) into assets-custom/assets/furniture/.
// Run from the repo root:  node assets-custom/generate.cjs
// Needs pngjs (installed by `npm ci`). Add the folder via Settings -> Add Asset Directory.
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const OUT_DIR = path.join(__dirname, 'assets', 'furniture');

// ── tiny canvas ──────────────────────────────────────────────
class C {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.d = new Uint8Array(w * h * 4);
  }
  px(x, y, col) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h || !col) return;
    const i = (y * this.w + x) * 4;
    this.d[i] = parseInt(col.slice(1, 3), 16);
    this.d[i + 1] = parseInt(col.slice(3, 5), 16);
    this.d[i + 2] = parseInt(col.slice(5, 7), 16);
    this.d[i + 3] = 255;
  }
  rect(x, y, w, h, col) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, col);
  }
  box(x, y, w, h, line) {
    this.rect(x, y, w, 1, line);
    this.rect(x, y + h - 1, w, 1, line);
    this.rect(x, y, 1, h, line);
    this.rect(x + w - 1, y, 1, h, line);
  }
  line(x0, y0, x1, y1, col) {
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0),
      dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1,
      sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.px(x0, y0, col);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
  }
  ellipse(cx, cy, rx, ry, col) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++)
        if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) this.px(x, y, col);
  }
  png() {
    const p = new PNG({ width: this.w, height: this.h });
    p.data = Buffer.from(this.d);
    return PNG.sync.write(p);
  }
}

// ── palette ──────────────────────────────────────────────────
const K = {
  ink: '#1c1a26',
  dark: '#2a2a34',
  gray: '#555566',
  mid: '#8a8a9c',
  light: '#c8c8d8',
  white: '#f0f0f8',
  purple: '#4a3a7a',
  purpleD: '#352a5c',
  purpleL: '#6a58a8',
  yellow: '#f2c744',
  red: '#e0455a',
  green: '#4ac86a',
  blue: '#4a90e0',
  cyan: '#6ad8f0',
  orange: '#f5792a',
  orangeD: '#b04a14',
  orangeL: '#ffb070',
  wood: '#8a5a3a',
  woodL: '#c89060',
  cork: '#b88a54',
  corkD: '#8a6234',
  space: '#0a0a2a',
  space2: '#1a1a4a',
};

// ── output helpers ───────────────────────────────────────────
const manifests = {};
function write(id, file, canvas) {
  const dir = path.join(OUT_DIR, id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${file}.png`), canvas.png());
}
function manifest(id, m) {
  const dir = path.join(OUT_DIR, id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify({ id, ...m }, null, 2) + '\n');
}
const asset = (id, file, w, h, extra = {}) => ({
  type: 'asset',
  id,
  file: `${file}.png`,
  width: w,
  height: h,
  footprintW: w / 16,
  footprintH: h / 16,
  ...extra,
});
function simple(id, name, category, canvas, opts = {}) {
  write(id, id, canvas);
  manifest(id, {
    name,
    category,
    ...asset(id, id, canvas.w, canvas.h),
    canPlaceOnWalls: !!opts.walls,
    canPlaceOnSurfaces: !!opts.surface,
    backgroundTiles: opts.bg || 0,
  });
}
// State group: N animated "on" frames + one "off" sprite (same shape as the built-in PC).
function stateful(id, name, category, w, h, off, onFrames, opts = {}) {
  write(id, `${id}_OFF`, off);
  onFrames.forEach((f, i) => write(id, `${id}_ON_${i + 1}`, f));
  const onMembers = onFrames.map((_, i) =>
    asset(`${id}_ON_${i + 1}`, `${id}_ON_${i + 1}`, w, h, { frame: i }),
  );
  manifest(id, {
    name,
    category,
    type: 'group',
    groupType: 'state',
    orientation: 'front',
    canPlaceOnWalls: false,
    canPlaceOnSurfaces: !!opts.surface,
    backgroundTiles: opts.bg || 0,
    members: [
      onFrames.length > 1
        ? { type: 'group', groupType: 'animation', state: 'on', members: onMembers }
        : { ...onMembers[0], state: 'on' },
      asset(`${id}_OFF`, `${id}_OFF`, w, h, { state: 'off' }),
    ],
  });
}

// ── ARCADE CABINET (16x32) ───────────────────────────────────
function arcade(frame) {
  const c = new C(16, 32);
  c.rect(1, 0, 14, 32, K.purple);
  c.rect(1, 0, 1, 32, K.purpleD);
  c.rect(14, 0, 1, 32, K.purpleD);
  c.rect(1, 0, 14, 1, K.ink);
  // marquee
  c.rect(2, 1, 12, 4, K.yellow);
  for (const x of [3, 5, 6, 8, 10, 11]) c.px(x, 3, K.red);
  c.rect(2, 5, 12, 1, K.purpleD);
  // screen bezel + screen
  c.rect(2, 6, 12, 14, K.ink);
  const sx = 3,
    sy = 7,
    sw = 10,
    sh = 12;
  if (frame === null) {
    c.rect(sx, sy, sw, sh, '#14131f');
    c.line(sx + 1, sy + 1, sx + 3, sy + 1, '#2a2840');
    c.line(sx + 1, sy + 2, sx + 1, sy + 3, '#2a2840');
  } else {
    c.rect(sx, sy, sw, sh, K.space);
    for (const [x, y] of [[4, 8], [11, 9], [6, 13], [9, 16]]) c.px(x, y, K.space2 === K.space ? K.white : '#5a5a8a');
    // enemy row drifts sideways, ship tracks the other way, bullet climbs
    const ex = 4 + frame;
    for (let i = 0; i < 3; i++) {
      c.px(ex + i * 2, 9, K.red);
      c.px(ex + i * 2, 10, '#a02a3a');
    }
    const shipX = 9 - frame * 2;
    c.px(shipX, 16, K.cyan);
    c.px(shipX - 1, 17, K.cyan);
    c.px(shipX, 17, K.white);
    c.px(shipX + 1, 17, K.cyan);
    c.px(shipX, 14 - frame * 2, K.yellow);
  }
  // control panel
  c.rect(1, 20, 14, 5, K.purpleL);
  c.rect(1, 20, 14, 1, K.ink);
  c.px(4, 21, K.red);
  c.px(4, 22, K.ink);
  c.px(4, 23, K.dark);
  c.px(8, 22, K.yellow);
  c.px(10, 22, K.green);
  c.px(12, 22, K.blue);
  // lower cabinet + coin door
  c.rect(6, 27, 4, 3, K.ink);
  c.px(7, 28, K.yellow);
  c.px(8, 28, K.yellow);
  c.rect(1, 31, 14, 1, K.ink);
  return c;
}
stateful('ARCADE_CABINET', 'Arcade Cabinet', 'electronics', 16, 32, arcade(null), [0, 1, 2].map(arcade), {
  bg: 1,
});

// ── TV + CONSOLE (32x32, top row is the screen, bottom row blocks) ──
function tv(frame) {
  const c = new C(32, 32);
  // TV body
  c.rect(1, 3, 30, 20, K.ink);
  c.rect(2, 4, 28, 18, K.dark);
  const sx = 3,
    sy = 5,
    sw = 26,
    sh = 15;
  if (frame === null) {
    c.rect(sx, sy, sw, sh, '#14131f');
    c.line(sx + 1, sy + 1, sx + 5, sy + 1, '#2a2840');
    c.line(sx + 1, sy + 2, sx + 1, sy + 5, '#2a2840');
  } else {
    // little platformer: sky, hills, ground, a hopping hero and a coin
    c.rect(sx, sy, sw, sh, '#5ab0f0');
    c.rect(sx, sy + 12, sw, 3, K.green);
    c.rect(sx, sy + 14, sw, 1, '#2a8a4a');
    c.ellipse(sx + 18, sy + 12, 6, 4, '#3aa85a');
    c.rect(sx + 3 + frame * 2, sy + 3, 5, 2, K.white);
    const hx = sx + 6 + frame * 5;
    const hy = sy + 8 - (frame === 1 ? 3 : 0);
    c.rect(hx, hy, 3, 3, K.red);
    c.px(hx + 1, hy - 1, K.yellow);
    c.rect(hx, hy + 3, 1, 1, K.ink);
    c.rect(hx + 2, hy + 3, 1, 1, K.ink);
    c.rect(sx + 20, sy + 5 + (frame % 2), 2, 2, K.yellow);
  }
  c.px(29, 21, frame === null ? K.red : K.green);
  // stand unit
  c.rect(4, 23, 24, 1, K.dark);
  c.rect(2, 24, 28, 7, K.wood);
  c.rect(2, 24, 28, 1, K.woodL);
  c.rect(2, 31, 28, 1, K.ink);
  c.rect(4, 26, 24, 4, K.ink); // open shelf
  c.rect(6, 27, 10, 3, K.light); // console
  c.rect(6, 27, 10, 1, K.white);
  c.px(14, 28, frame === null ? K.red : K.green);
  c.rect(8, 28, 4, 1, K.mid);
  c.rect(19, 28, 5, 2, K.gray); // spare controller on the shelf
  c.px(20, 28, K.light);
  c.px(23, 28, K.red);
  return c;
}
stateful('TV_CONSOLE', 'TV & Console', 'electronics', 32, 32, tv(null), [0, 1, 2].map(tv), { bg: 1 });

// ── BEAN BAG (16x16 chair, 3-way mirror) ─────────────────────
function beanBag(kind) {
  const c = new C(16, 16);
  c.ellipse(7.5, 9, 7, 5.5, K.orangeD);
  c.ellipse(7.5, 8.5, 6.2, 4.8, K.orange);
  if (kind === 'front') {
    c.ellipse(7.5, 9.5, 3.6, 2.4, K.orangeD); // seat dent
    c.ellipse(7.5, 9.3, 3, 1.8, '#d86a22');
    c.rect(4, 5, 2, 1, K.orangeL);
  } else if (kind === 'back') {
    c.ellipse(7.5, 6.8, 5, 2.8, K.orangeD); // slouched back rest
    c.rect(4, 4, 6, 1, K.orangeL);
  } else {
    c.ellipse(5.5, 8, 3.5, 3.4, K.orangeD);
    c.rect(3, 5, 3, 1, K.orangeL);
  }
  c.rect(3, 14, 10, 1, '#00000055'.slice(0, 7) === '#000000' ? K.ink : K.ink);
  return c;
}
['FRONT', 'BACK', 'SIDE'].forEach((o) => write('BEAN_BAG', `BEAN_BAG_${o}`, beanBag(o.toLowerCase())));
manifest('BEAN_BAG', {
  name: 'Bean Bag',
  category: 'chairs',
  type: 'group',
  groupType: 'rotation',
  rotationScheme: '3-way-mirror',
  canPlaceOnWalls: false,
  canPlaceOnSurfaces: false,
  backgroundTiles: 0,
  members: [
    asset('BEAN_BAG_FRONT', 'BEAN_BAG_FRONT', 16, 16, { orientation: 'front' }),
    asset('BEAN_BAG_BACK', 'BEAN_BAG_BACK', 16, 16, { orientation: 'back' }),
    asset('BEAN_BAG_SIDE', 'BEAN_BAG_SIDE', 16, 16, { orientation: 'side', mirrorSide: true }),
  ],
});

// ── GAMEPAD (16x16, desk item) ───────────────────────────────
{
  const c = new C(16, 16);
  c.rect(3, 8, 10, 5, K.ink);
  c.rect(2, 9, 12, 4, K.ink);
  c.rect(3, 9, 10, 3, K.light);
  c.rect(2, 11, 2, 3, K.ink);
  c.rect(12, 11, 2, 3, K.ink);
  c.rect(2, 12, 2, 1, K.mid);
  c.rect(12, 12, 2, 1, K.mid);
  c.rect(4, 10, 3, 1, K.dark); // d-pad
  c.px(5, 9, K.dark);
  c.px(5, 11, K.dark);
  c.px(10, 10, K.red);
  c.px(12, 10, K.blue);
  c.px(11, 9, K.green);
  c.px(11, 11, K.yellow);
  c.rect(3, 7, 10, 1, '#00000000'.length ? K.dark : K.dark);
  c.rect(4, 7, 3, 1, K.gray);
  c.rect(9, 7, 3, 1, K.gray);
  simple('GAMEPAD', 'Gamepad', 'electronics', c, { surface: true });
}

// ── PHONE ON STAND (16x16, desk item) ────────────────────────
{
  const c = new C(16, 16);
  c.rect(5, 4, 7, 10, K.ink);
  c.rect(6, 5, 5, 7, K.cyan);
  c.rect(6, 5, 5, 2, K.blue);
  c.px(7, 8, K.white);
  c.px(9, 9, K.white);
  c.px(8, 13, K.mid); // home button
  c.rect(4, 14, 9, 1, K.gray);
  c.rect(5, 15, 7, 1, K.dark);
  simple('PHONE_STAND', 'Phone on Stand', 'electronics', c, { surface: true });
}

// ── monitor shell shared by the Unity + Blender monitors (16x32) ──
function monitor(drawScreen, frame) {
  const c = new C(16, 32);
  c.rect(1, 1, 14, 16, K.ink);
  c.rect(2, 2, 12, 13, K.dark);
  drawScreen(c, 3, 3, 10, 11, frame); // 10x11 screen area
  c.rect(6, 17, 4, 2, K.gray);
  c.rect(4, 19, 8, 1, K.gray);
  c.rect(4, 20, 8, 1, K.dark);
  return c;
}
function unityScreen(c, x, y, w, h, frame) {
  if (frame === null) {
    c.rect(x, y, w, h, '#14131f');
    return;
  }
  c.rect(x, y, w, h, '#3a3a3a');
  c.rect(x, y, w, 1, '#222222'); // toolbar
  c.px(x + 4, y, K.white);
  c.px(x + 5, y, K.white);
  c.rect(x, y + 1, 2, h - 1, '#2e2e2e'); // hierarchy
  for (let i = 0; i < 3; i++) c.rect(x, y + 2 + i * 2, 2, 1, '#8a8a8a');
  c.rect(x + w - 2, y + 1, 2, h - 1, '#2e2e2e'); // inspector
  for (let i = 0; i < 3; i++) c.rect(x + w - 2, y + 2 + i * 2, 2, 1, '#6a8ac0');
  c.rect(x + 2, y + 1, w - 4, h - 1, '#4a6a8a'); // scene view
  c.rect(x + 2, y + 6, w - 4, h - 6, '#3a5a3a'); // ground
  c.rect(x + 4, y + 3, 3, 3, K.white); // cube
  c.rect(x + 4, y + 3, 3, 1, '#d8d8d8');
  c.rect(x + 6, y + 4, 1, 2, '#a0a0a0');
  if (frame === 1) c.px(x + 7, y + 2, K.yellow); // selection gizmo blink
}
{
  const frames = [monitor(unityScreen, 0)];
  stateful('UNITY_MONITOR', 'Unity Monitor', 'electronics', 16, 32, monitor(unityScreen, null), frames, {
    surface: true,
    bg: 1,
  });
}
function blenderScreen(c, x, y, w, h, frame) {
  if (frame === null) {
    c.rect(x, y, w, h, '#14131f');
    return;
  }
  c.rect(x, y, w, h, '#303030');
  c.rect(x, y, w, 1, K.orange); // header strip
  c.rect(x + 1, y + 2, w - 2, h - 3, '#3c3c3c');
  c.rect(x + 1, y + h - 3, w - 2, 1, '#4a4a4a'); // grid floor line
  // rotating wireframe cube
  const th = (frame * Math.PI) / 6 + 0.3;
  const ph = 0.55;
  const pts = [];
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
    const x1 = sx * Math.cos(th) - sz * Math.sin(th);
    const z1 = sx * Math.sin(th) + sz * Math.cos(th);
    const y1 = sy * Math.cos(ph) - z1 * Math.sin(ph);
    pts.push([x + w / 2 - 0.5 + x1 * 1.7, y + 6 + y1 * 1.7, sx, sy, sz]);
  }
  for (let i = 0; i < 8; i++)
    for (let j = i + 1; j < 8; j++) {
      const diff = (pts[i][2] !== pts[j][2]) + (pts[i][3] !== pts[j][3]) + (pts[i][4] !== pts[j][4]);
      if (diff === 1) c.line(pts[i][0], pts[i][1], pts[j][0], pts[j][1], K.orange);
    }
}
{
  const frames = [0, 1, 2].map((f) => monitor(blenderScreen, f));
  stateful('BLENDER_MONITOR', 'Blender Monitor', 'electronics', 16, 32, monitor(blenderScreen, null), frames, {
    surface: true,
    bg: 1,
  });
}

// ── DRAWING TABLET (16x16, desk item) ────────────────────────
{
  const c = new C(16, 16);
  c.rect(2, 6, 12, 8, K.ink);
  c.rect(3, 7, 9, 6, '#3c3c48');
  c.px(13, 8, K.orange);
  c.px(13, 10, K.orange);
  c.px(13, 12, K.orange);
  c.line(5, 11, 8, 8, K.white); // stylus
  c.px(5, 12, K.orange);
  c.line(8, 9, 11, 9, K.cyan); // a stroke
  simple('DRAWING_TABLET', 'Drawing Tablet', 'electronics', c, { surface: true });
}

// ── 3D PRINTER (16x16, desk item) ────────────────────────────
function printer(frame) {
  const c = new C(16, 16);
  c.rect(1, 13, 14, 2, K.dark); // base
  c.rect(1, 13, 14, 1, K.gray);
  c.rect(2, 3, 2, 10, K.light); // posts
  c.rect(12, 3, 2, 10, K.light);
  c.rect(2, 2, 12, 2, K.mid); // top rail
  c.rect(4, 12, 8, 1, K.gray); // bed
  if (frame === null) {
    c.rect(6, 9, 3, 3, K.orangeL); // finished little print
  } else {
    const h = 1 + frame; // print grows
    c.rect(6, 12 - h, 4, h, K.orange);
    const nx = 5 + frame * 2;
    c.rect(nx, 5, 3, 3, K.gray); // print head
    c.px(nx + 1, 8, K.red);
    c.px(nx + 1, 9, K.red);
  }
  c.rect(3, 4, 1, 8, K.white);
  return c;
}
stateful('PRINTER_3D', '3D Printer', 'electronics', 16, 16, printer(null), [0, 1, 2].map(printer), {
  surface: true,
});

// ── ENERGY DRINKS (16x16, desk item) ─────────────────────────
{
  const c = new C(16, 16);
  const can = (x, body, stripe) => {
    c.rect(x, 5, 4, 8, K.ink);
    c.rect(x + 1, 6, 2, 6, body);
    c.rect(x + 1, 8, 2, 2, stripe);
    c.px(x + 1, 5, K.light);
    c.px(x + 2, 5, K.light);
  };
  can(3, K.cyan, K.blue);
  can(8, K.green, '#1a5a2a');
  c.rect(12, 9, 3, 4, K.red); // snack bag
  c.rect(12, 9, 3, 1, K.yellow);
  c.rect(3, 13, 12, 1, K.ink);
  simple('ENERGY_DRINKS', 'Energy Drinks & Snacks', 'decor', c, { surface: true });
}

// ── WALL ART ─────────────────────────────────────────────────
// Art pinboard (32x32): cork with pinned sprite sheets and a palette strip.
{
  const c = new C(32, 32);
  c.rect(0, 2, 32, 28, K.wood);
  c.rect(1, 3, 30, 26, K.cork);
  c.box(0, 2, 32, 28, K.ink);
  const pin = (x, y, col) => c.px(x, y, col);
  // sprite sheet pinned note
  c.rect(3, 6, 11, 9, K.white);
  c.rect(4, 7, 3, 3, K.green);
  c.rect(8, 7, 3, 3, K.red);
  c.rect(4, 11, 3, 3, K.blue);
  c.rect(8, 11, 3, 3, K.yellow);
  pin(8, 5, K.red);
  // pixel ship sketch
  c.rect(17, 5, 11, 10, K.space);
  c.px(22, 8, K.cyan);
  c.rect(21, 9, 3, 1, K.cyan);
  c.rect(20, 10, 5, 1, K.white);
  c.px(20, 11, K.red);
  c.px(24, 11, K.red);
  c.px(22, 6, K.yellow);
  pin(22, 4, K.blue);
  // palette strip
  const pal = [K.red, K.orange, K.yellow, K.green, K.cyan, K.blue, K.purpleL, K.white];
  pal.forEach((col, i) => c.rect(4 + i * 3, 18, 3, 3, col));
  c.box(3, 17, 26, 5, K.ink);
  // sticky note
  c.rect(5, 23, 6, 5, K.yellow);
  c.rect(6, 25, 4, 1, K.orangeD);
  c.rect(6, 27, 3, 1, K.orangeD);
  c.rect(15, 24, 12, 4, K.light);
  c.line(16, 26, 25, 26, K.gray);
  simple('ART_PINBOARD', 'Art Pinboard', 'wall', c, { walls: true });
}
// Kanban board (32x32): three columns of sticky notes.
{
  const c = new C(32, 32);
  c.rect(0, 2, 32, 28, K.light);
  c.box(0, 2, 32, 28, K.dark);
  c.rect(1, 3, 30, 26, K.white);
  [[2, K.red], [12, K.yellow], [22, K.green]].forEach(([x, col], i) => {
    c.rect(x, 4, 8, 3, col);
    c.rect(x, 8, 8, 1, K.light);
    const notes = [3, 2, 1][i];
    for (let n = 0; n < notes; n++) {
      c.rect(x + 1, 10 + n * 6, 6, 5, [K.yellow, K.cyan, K.orangeL][(n + i) % 3]);
      c.rect(x + 2, 12 + n * 6, 4, 1, K.gray);
    }
  });
  c.rect(10, 4, 1, 24, K.light);
  c.rect(20, 4, 1, 24, K.light);
  simple('KANBAN_BOARD', 'Kanban Board', 'wall', c, { walls: true });
}
// Planet 8 poster (16x32).
{
  const c = new C(16, 32);
  c.rect(0, 2, 16, 30, K.ink);
  c.rect(1, 3, 14, 28, K.space);
  for (const [x, y] of [[3, 5], [12, 7], [5, 12], [13, 22], [3, 20], [10, 4]]) c.px(x, y, K.white);
  c.ellipse(8, 14, 4.5, 4.5, '#c8553a'); // planet
  c.ellipse(7, 13, 3, 3, '#e07a52');
  c.ellipse(8, 14, 7, 1.6, K.purpleL); // ring
  c.ellipse(8, 14, 5, 0.8, K.space);
  c.ellipse(8, 13, 4.2, 3.4, '#e07a52'); // planet over back of ring
  c.line(2, 15, 6, 16, K.purpleL);
  c.line(10, 16, 14, 15, K.purpleL);
  // tiny ship
  c.px(8, 19, K.cyan);
  c.rect(7, 20, 3, 1, K.cyan);
  c.px(8, 21, K.yellow);
  // chunky "8"
  const g = [
    '.XXX.',
    'X...X',
    'X...X',
    '.XXX.',
    'X...X',
    'X...X',
    '.XXX.',
  ];
  g.forEach((row, j) => [...row].forEach((ch, i) => ch === 'X' && c.px(5 + i, 23 + j, K.yellow)));
  c.rect(1, 31, 14, 1, K.ink);
  simple('POSTER_PLANET8', 'Planet 8 Poster', 'wall', c, { walls: true });
}
// Blender poster (16x32): isometric cube on a dark ground.
{
  const c = new C(16, 32);
  c.rect(0, 2, 16, 30, K.ink);
  c.rect(1, 3, 14, 28, '#2e3440');
  c.rect(1, 3, 14, 4, K.orange);
  c.rect(3, 4, 4, 2, K.white);
  // iso cube
  const top = [[8, 11], [14, 14], [8, 17], [2, 14]];
  c.line(8, 10, 13, 13, K.orange);
  c.line(13, 13, 8, 16, K.orange);
  c.line(8, 16, 3, 13, K.orange);
  c.line(3, 13, 8, 10, K.orange);
  c.line(3, 13, 3, 20, K.orange);
  c.line(13, 13, 13, 20, K.orange);
  c.line(8, 16, 8, 23, K.orange);
  c.line(3, 20, 8, 23, K.orange);
  c.line(13, 20, 8, 23, K.orange);
  for (let y = 11; y <= 15; y++) for (let x = 5; x <= 11; x++) if (Math.abs(x - 8) + (y - 13) * 1.2 < 4 && Math.abs(x - 8) + Math.abs(y - 13) * 1.6 < 5) c.px(x, y, '#3a5a8a');
  void top;
  // grid floor
  for (let i = 0; i < 4; i++) c.rect(2, 25 + i, 12, 1, i % 2 ? '#3a4150' : '#444c5c');
  c.rect(1, 31, 14, 1, K.ink);
  simple('POSTER_BLENDER', 'Blender Poster', 'wall', c, { walls: true });
}

// ── xTOOL LASER (32x16, desk item): enclosed desktop laser with an orange lid ──
function xtool(frame) {
  const c = new C(32, 16);
  const lit = frame !== null;
  c.rect(1, 2, 30, 13, K.ink); // shell
  c.rect(2, 3, 28, 7, lit ? K.orangeL : '#8a5a3a'); // lid (acrylic)
  c.rect(2, 3, 28, 1, lit ? K.white : K.woodL);
  c.rect(3, 4, 26, 5, lit ? K.orange : '#6a3a1a'); // window
  c.rect(3, 8, 26, 1, K.orangeD); // work bed
  if (lit) {
    const hx = 7 + frame * 7; // laser head slides along the gantry
    c.rect(3, 5, 26, 1, K.gray);
    c.rect(hx, 5, 3, 2, K.light);
    c.px(hx + 1, 7, K.white); // beam
    c.px(hx + 1, 8, K.yellow);
    c.px(hx - 1, 8, K.orangeL);
    c.px(hx + 3, 8, K.orangeL);
  } else {
    c.rect(3, 5, 26, 1, K.gray);
    c.rect(8, 5, 3, 2, K.mid);
  }
  c.rect(2, 10, 28, 4, K.dark); // front panel
  c.rect(2, 10, 28, 1, K.gray);
  c.px(25, 12, lit ? K.green : K.red);
  c.px(27, 12, K.mid);
  c.rect(5, 12, 7, 1, K.mid); // "xTool"-ish label bar
  c.rect(1, 15, 30, 1, K.ink);
  return c;
}
stateful('XTOOL_LASER', 'xTool Laser', 'electronics', 32, 16, xtool(null), [0, 1, 2].map(xtool), {
  surface: true,
});

// ── TOOL PEGBOARD (32x32 wall): a wall of maker tools ──
{
  const c = new C(32, 32);
  c.rect(0, 2, 32, 28, K.wood);
  c.rect(1, 3, 30, 26, '#c8a070');
  for (let y = 5; y < 28; y += 3) for (let x = 3; x < 30; x += 3) c.px(x, y, '#8a6a40');
  c.box(0, 2, 32, 28, K.ink);
  // hammer
  c.rect(4, 7, 2, 9, K.wood);
  c.rect(2, 5, 6, 3, K.gray);
  c.rect(2, 5, 6, 1, K.light);
  // wrench
  c.rect(11, 6, 2, 11, K.mid);
  c.rect(10, 5, 4, 3, K.light);
  c.rect(11, 5, 2, 1, '#c8a070');
  // screwdrivers
  c.rect(17, 11, 2, 5, K.red);
  c.rect(17, 7, 2, 4, K.mid);
  c.rect(21, 11, 2, 5, K.blue);
  c.rect(21, 7, 2, 4, K.mid);
  // pliers
  c.rect(26, 6, 1, 6, K.red);
  c.rect(28, 6, 1, 6, K.red);
  c.rect(26, 12, 3, 1, K.mid);
  c.rect(27, 4, 1, 3, K.light);
  // saw
  c.rect(3, 20, 12, 3, K.light);
  for (let x = 3; x < 15; x += 2) c.px(x, 23, K.mid);
  c.rect(15, 19, 4, 5, K.orange);
  // safety glasses + hex keys + tape
  c.rect(21, 19, 3, 3, K.cyan);
  c.rect(25, 19, 3, 3, K.cyan);
  c.rect(24, 20, 1, 1, K.ink);
  c.ellipse(24, 26, 3, 2, K.yellow);
  c.px(24, 26, '#c8a070');
  c.line(4, 26, 4, 28, K.blue);
  c.line(7, 26, 7, 28, K.green);
  simple('TOOL_PEGBOARD', 'Tool Pegboard', 'wall', c, { walls: true });
}

// ── FILAMENT RACK (16x32): shelves of 3D-printer spools ──
{
  const c = new C(16, 32);
  c.rect(1, 1, 14, 30, K.wood);
  c.rect(2, 2, 12, 28, K.ink);
  const cols = [K.red, K.orange, K.yellow, K.green, K.cyan, K.blue, K.purpleL, K.white, K.mid];
  for (let shelf = 0; shelf < 3; shelf++) {
    const y = 3 + shelf * 9;
    c.rect(2, y + 8, 12, 1, K.woodL);
    for (let i = 0; i < 3; i++) {
      const col = cols[(shelf * 3 + i) % cols.length];
      const x = 3 + i * 4;
      c.rect(x, y + 1, 3, 7, col);
      c.rect(x, y + 1, 3, 1, K.white);
      c.px(x + 1, y + 4, K.ink); // spool hole
    }
  }
  c.rect(1, 31, 14, 1, K.ink);
  simple('FILAMENT_RACK', 'Filament Rack', 'storage', c, { bg: 1 });
}

console.log('Generated custom furniture into', OUT_DIR);
