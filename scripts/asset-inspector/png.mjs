// Lê largura e altura de um PNG a partir do cabeçalho IHDR, sem dependências.
import fs from 'node:fs';

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export function readPngSize(file) {
  const fd = fs.openSync(file, 'r');
  try {
    const buf = Buffer.alloc(24);
    fs.readSync(fd, buf, 0, 24, 0);
    for (let i = 0; i < 8; i++) {
      if (buf[i] !== PNG_SIGNATURE[i]) throw new Error(`Não é PNG: ${file}`);
    }
    if (buf.toString('ascii', 12, 16) !== 'IHDR') throw new Error(`IHDR ausente: ${file}`);
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  } finally {
    fs.closeSync(fd);
  }
}
