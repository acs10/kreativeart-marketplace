// Gera arquivos de teste: PNG (prévia), PSD com imagem composta e CDR (ZIP com miniatura), como os reais.
import { writeFileSync } from "node:fs";
import { writePsdBuffer } from "ag-psd";
import { zipSync } from "fflate";
import zlib from "node:zlib";

function png(w, h, rgb) {
  const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const o = y * (w * 3 + 1) + 1 + x * 3; raw[o] = (rgb[0] + x) % 256; raw[o + 1] = (rgb[1] + y) % 256; raw[o + 2] = rgb[2]; }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

writeFileSync("tests/e2e/fixtures/arte-v1.png", png(240, 300, [139, 92, 246]));
writeFileSync("tests/e2e/fixtures/arte-v2.png", png(240, 300, [236, 72, 153]));
const w = 120, h = 150, data = new Uint8ClampedArray(w * h * 4);
for (let i = 0; i < w * h; i++) data.set([59, 130, 246, 255], i * 4);
writeFileSync("tests/e2e/fixtures/arte.psd", Buffer.from(writePsdBuffer({ width: w, height: h, imageData: { width: w, height: h, data }, children: [] }, { generateThumbnail: false, noBackground: false })));
writeFileSync("tests/e2e/fixtures/logo.cdr", Buffer.from(zipSync({ "content/riffData.cdr": new Uint8Array([1, 2, 3]), "previews/thumbnail.png": new Uint8Array(png(100, 100, [16, 185, 129])) })));
console.log("ok");
