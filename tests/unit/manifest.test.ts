import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readPngSize } from '../../scripts/asset-inspector/png.mjs';
import type { Manifest } from '../../src/shared/types/manifest';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const ASSETS = path.join(ROOT, 'public', 'assets');
const manifest = JSON.parse(fs.readFileSync(path.join(ASSETS, 'manifest.json'), 'utf8')) as Manifest;

const pngSize = (rel: string) => readPngSize(path.join(ASSETS, rel));

describe('manifesto de assets', () => {
  it('não tem erros de auditoria', () => {
    expect(manifest.issues.filter((i) => i.level === 'error')).toEqual([]);
  });

  it('cobre 60 monstros e 10 biomas', () => {
    expect(manifest.creatures).toHaveLength(60);
    expect(manifest.biomes).toHaveLength(10);
    expect(manifest.coverage.uncovered).toEqual([]);
  });

  it('usa a ordem de direções do pacote de monstros', () => {
    expect(manifest.frameDirections).toEqual(['down', 'up', 'left', 'right']);
  });

  it('cada criatura aponta para uma folha 128x32 existente', () => {
    for (const c of manifest.creatures) {
      expect(fs.existsSync(path.join(ASSETS, c.sheet)), c.sheet).toBe(true);
      expect(pngSize(c.sheet), c.sheet).toEqual({ width: 128, height: 32 });
      expect(c.frameSize).toEqual([32, 32]);
      expect(c.locomotion).toBe('unverified');
    }
  });

  it('cada arquivo de bioma existe e tem a dimensão esperada', () => {
    for (const b of manifest.biomes) {
      for (const t of [...b.tiles.ground, ...b.tiles.path, ...b.tiles.cliff, ...b.transitions]) {
        expect(pngSize(t), t).toEqual({ width: 32, height: 32 });
      }
      for (const p of b.props) {
        const expected = p.includes('landmark_') ? 64 : 32;
        expect(pngSize(p), p).toEqual({ width: expected, height: expected });
      }
      for (const a of b.animated) {
        expect(pngSize(a), a).toEqual({ width: 96, height: 32 });
      }
    }
  });
});
