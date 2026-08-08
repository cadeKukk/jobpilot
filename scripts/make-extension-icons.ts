// Generates the extension icons (emerald rounded square with a compass
// ring + needle) as PNGs with no image dependencies — pixels are computed
// directly and encoded with node's built-in zlib.
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf: Buffer) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(size: number, rgba: Uint8Array) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  // Each scanline is prefixed with filter byte 0.
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    rgba
      .subarray(y * size * 4, (y + 1) * size * 4)
      .forEach((v, i) => (raw[y * (size * 4 + 1) + 1 + i] = v));
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const BG = [5, 150, 105]; // emerald-600
const WHITE = [255, 255, 255];

// Coverage (0..1) of the icon artwork at point (x, y) in [0,1] space.
function sample(x: number, y: number): { color: number[]; a: number } {
  const dx = x - 0.5;
  const dy = y - 0.5;

  // Rounded-square background.
  const radius = 0.22;
  const qx = Math.max(Math.abs(dx) - (0.5 - radius), 0);
  const qy = Math.max(Math.abs(dy) - (0.5 - radius), 0);
  const inBg = Math.hypot(qx, qy) <= radius;
  if (!inBg) return { color: BG, a: 0 };

  const dist = Math.hypot(dx, dy);
  // Compass ring.
  if (dist >= 0.23 && dist <= 0.31) return { color: WHITE, a: 1 };
  // Needle: elongated diamond along the NE–SW diagonal.
  const u = (dx + dy) / Math.SQRT2;
  const v = (dx - dy) / Math.SQRT2;
  if (Math.abs(u) / 0.26 + Math.abs(v) / 0.075 <= 1)
    return { color: WHITE, a: 1 };

  return { color: BG, a: 1 };
}

function renderIcon(size: number) {
  const rgba = new Uint8Array(size * size * 4);
  const SS = 4; // supersampling grid per axis
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0,
        g = 0,
        b = 0,
        a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const s = sample(
            (px + (sx + 0.5) / SS) / size,
            (py + (sy + 0.5) / SS) / size
          );
          r += s.color[0]! * s.a;
          g += s.color[1]! * s.a;
          b += s.color[2]! * s.a;
          a += s.a;
        }
      }
      const n = SS * SS;
      const i = (py * size + px) * 4;
      rgba[i] = a ? Math.round(r / a) : 0;
      rgba[i + 1] = a ? Math.round(g / a) : 0;
      rgba[i + 2] = a ? Math.round(b / a) : 0;
      rgba[i + 3] = Math.round((a / n) * 255);
    }
  }
  return encodePng(size, rgba);
}

const outDir = join(process.cwd(), "extension", "icons");
mkdirSync(outDir, { recursive: true });
for (const size of [16, 32, 48, 128]) {
  writeFileSync(join(outDir, `icon${size}.png`), renderIcon(size));
  console.log(`icon${size}.png`);
}
