// Procedural cover art for the mock backend, encoded as PNG with node:zlib.
import zlib from "node:zlib";

export const SIZE = 384;

// --- PNG encoding ------------------------------------------------------------

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return c >>> 0;
});

const crc32 = (buffer) => {
  let c = 0xffffffff;
  for (const byte of buffer) {
    c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
};

const chunk = (type, data) => {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
};

const encodePng = (pixels, size) => {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // RGB
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0; // no filter
    pixels.copy(raw, y * (size * 3 + 1) + 1, y * size * 3, (y + 1) * size * 3);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", zlib.deflateSync(raw, { level: 6 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
};

// --- Helpers -------------------------------------------------------------------

export const rng = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const clamp = (x) => Math.max(0, Math.min(1, x));
const smooth = (e0, e1, x) => {
  const t = clamp((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};

export const PALETTES = [
  ["#1e4151", "#f2ede0", "#cb9e1e", "#e07a5f", "#3d405b"],
  ["#0b132b", "#1c2541", "#3a506b", "#5bc0be", "#f2f5ea"],
  ["#2b2d42", "#8d99ae", "#edf2f4", "#ef233c", "#d90429"],
  ["#264653", "#2a9d8f", "#e9c46a", "#f4a261", "#e76f51"],
  ["#22223b", "#4a4e69", "#9a8c98", "#c9ada7", "#f2e9e4"],
  ["#03071e", "#6a040f", "#d00000", "#f48c06", "#ffba08"],
  ["#012a4a", "#2c7da0", "#61a5c2", "#a9d6e5", "#fefae0"],
  ["#283618", "#606c38", "#fefae0", "#dda15e", "#bc6c25"],
  ["#10002b", "#3c096c", "#7b2cbf", "#c77dff", "#e0aaff"],
  ["#001219", "#005f73", "#0a9396", "#94d2bd", "#ee9b00"],
  ["#3d0c11", "#7a1c2c", "#d4a373", "#faedcd", "#ccd5ae"],
  ["#14213d", "#fca311", "#e5e5e5", "#ffffff", "#000000"],
];

// --- Styles: (rand, palette) -> (x, y) in [0,1) -> [r,g,b] -------------------

const STYLES = {
  // Soft blurred orbs over a two-colour gradient.
  orbs(rand, p) {
    const bgA = p[0];
    const bgB = p[1];
    const orbs = Array.from({ length: 3 + Math.floor(rand() * 3) }, () => ({
      x: rand(),
      y: rand(),
      r: 0.12 + rand() * 0.28,
      c: p[2 + Math.floor(rand() * 3)],
    }));
    const angle = rand() * Math.PI;
    return (x, y) => {
      let c = mix(bgA, bgB, clamp(0.5 + (x - 0.5) * Math.cos(angle) + (y - 0.5) * Math.sin(angle)));
      for (const o of orbs) {
        const d = Math.hypot(x - o.x, y - o.y) / o.r;
        c = mix(c, o.c, (1 - smooth(0.55, 1.05, d)) * 0.9);
      }
      return c;
    };
  },

  // A mirrored 12x12 pixel critter with eyes, like a sprite.
  critter(rand, p) {
    const n = 12;
    const grid = [];
    for (let y = 0; y < n; y++) {
      grid.push([]);
      for (let x = 0; x < n / 2; x++) {
        const centre = 1 - Math.hypot((x - n / 2) / (n / 2), (y - n / 2) / (n / 2));
        grid[y][x] = rand() < centre * 1.5 ? 1 + Math.floor(rand() * 2) : 0;
      }
    }
    const eyeY = 3 + Math.floor(rand() * 3);
    const eyeX = 2 + Math.floor(rand() * 2);
    const bg = p[Math.floor(rand() * 2)];
    const body = [p[2], p[3]];
    const pad = 0.14;
    return (x, y) => {
      const gx = Math.floor(((x - pad) / (1 - 2 * pad)) * n);
      const gy = Math.floor(((y - pad) / (1 - 2 * pad)) * n);
      if (gx < 0 || gy < 0 || gx >= n || gy >= n) {
        return bg;
      }
      const hx = gx < n / 2 ? gx : n - 1 - gx;
      if (gy === eyeY && hx === eyeX) {
        return [250, 250, 245];
      }
      if (gy === eyeY + 1 && hx === eyeX) {
        return [20, 20, 25];
      }
      const v = grid[gy][hx];
      return v === 0 ? bg : body[v - 1];
    };
  },

  // Layered sine bands, like tide lines.
  waves(rand, p) {
    const layers = Array.from({ length: 6 }, (_, i) => ({
      base: 0.15 + i * 0.14,
      amp: 0.02 + rand() * 0.06,
      freq: 2 + rand() * 6,
      phase: rand() * Math.PI * 2,
      c: p[i % p.length],
    }));
    return (x, y) => {
      let c = layers[0].c;
      for (const l of layers) {
        if (y > l.base + Math.sin(x * l.freq * Math.PI + l.phase) * l.amp) {
          c = l.c;
        }
      }
      return c;
    };
  },

  // Ridges under a sky with a sun.
  peaks(rand, p) {
    const sun = { x: 0.2 + rand() * 0.6, y: 0.18 + rand() * 0.2, r: 0.08 + rand() * 0.08 };
    const ridges = Array.from({ length: 4 }, (_, i) => ({
      base: 0.45 + i * 0.13,
      seeds: Array.from({ length: 4 }, () => [rand() * 10, rand() * Math.PI * 2]),
      c: mix(p[1], p[0], (i + 1) / 4),
    }));
    return (x, y) => {
      let c = mix(p[3], p[4], y);
      if (Math.hypot(x - sun.x, y - sun.y) < sun.r) {
        c = p[2];
      }
      for (const r of ridges) {
        let h = r.base;
        for (const [f, ph] of r.seeds) {
          h += Math.abs(Math.sin(x * f + ph)) * 0.04 - 0.02;
        }
        if (y > h) {
          c = r.c;
        }
      }
      return c;
    };
  },

  // Quarter-circle tiles in a 4x4 grid.
  tiles(rand, p) {
    const n = 4;
    const cells = Array.from({ length: n * n }, () => ({
      corner: Math.floor(rand() * 4),
      fg: p[Math.floor(rand() * p.length)],
      bg: p[Math.floor(rand() * p.length)],
      kind: rand() < 0.75 ? "quarter" : "dot",
    }));
    return (x, y) => {
      const cx = Math.min(n - 1, Math.floor(x * n));
      const cy = Math.min(n - 1, Math.floor(y * n));
      const cell = cells[cy * n + cx];
      const lx = x * n - cx;
      const ly = y * n - cy;
      if (cell.kind === "dot") {
        return Math.hypot(lx - 0.5, ly - 0.5) < 0.32 ? cell.fg : cell.bg;
      }
      const ox = cell.corner & 1 ? 1 : 0;
      const oy = cell.corner & 2 ? 1 : 0;
      return Math.hypot(lx - ox, ly - oy) < 1 ? cell.fg : cell.bg;
    };
  },

  // Interfering concentric rings.
  rings(rand, p) {
    const centres = Array.from({ length: 2 }, () => [0.3 + rand() * 0.4, 0.3 + rand() * 0.4]);
    const freq = 18 + rand() * 20;
    return (x, y) => {
      let v = 0;
      for (const [cx, cy] of centres) {
        v += Math.sin(Math.hypot(x - cx, y - cy) * freq);
      }
      const t = (v + 2) / 4;
      const i = Math.min(p.length - 2, Math.floor(t * (p.length - 1)));
      return mix(p[i], p[i + 1], t * (p.length - 1) - i);
    };
  },

  // Plasma: summed sines through the palette.
  plasma(rand, p) {
    const k = Array.from({ length: 4 }, () => 3 + rand() * 9);
    const ph = Array.from({ length: 4 }, () => rand() * 6.28);
    return (x, y) => {
      const v =
        Math.sin(x * k[0] + ph[0]) +
        Math.sin(y * k[1] + ph[1]) +
        Math.sin((x + y) * k[2] + ph[2]) +
        Math.sin(Math.hypot(x - 0.5, y - 0.5) * k[3] * 2 + ph[3]);
      const t = (v + 4) / 8;
      const i = Math.min(p.length - 2, Math.floor(t * (p.length - 1)));
      return mix(p[i], p[i + 1], t * (p.length - 1) - i);
    };
  },
};

export const STYLE_NAMES = Object.keys(STYLES);

export const renderArt = ({ style, palette, seed }) => {
  const rand = rng(seed);
  const p = PALETTES[palette % PALETTES.length].map(hex);
  const shade = STYLES[style](rand, p);
  const pixels = Buffer.alloc(SIZE * SIZE * 3);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const c = shade(x / SIZE, y / SIZE);
      // A touch of grain keeps flat fills from looking synthetic.
      const g = ((Math.imul(x * 73856093 ^ y * 19349663, seed | 1) >>> 24) / 255 - 0.5) * 8;
      const i = (y * SIZE + x) * 3;
      pixels[i] = Math.max(0, Math.min(255, c[0] + g));
      pixels[i + 1] = Math.max(0, Math.min(255, c[1] + g));
      pixels[i + 2] = Math.max(0, Math.min(255, c[2] + g));
    }
  }
  return encodePng(pixels, SIZE);
};
