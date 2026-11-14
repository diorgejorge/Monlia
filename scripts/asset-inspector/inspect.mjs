#!/usr/bin/env node
// Asset Inspector: audita os pacotes de assets pixel art, gera o manifesto
// e copia apenas os arquivos de runtime para public/assets.
//
// Uso:
//   node scripts/asset-inspector/inspect.mjs <pasta_monstros> <pasta_biomas>
//
// As pastas são as versões extraídas dos zips originais. Os zips não entram no repositório.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { readPngSize } from './png.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const PUBLIC_ASSETS = path.join(ROOT, 'public', 'assets');
const MANIFEST_PATH = path.join(PUBLIC_ASSETS, 'manifest.json');
const INVENTORY_PATH = path.join(ROOT, 'docs', 'ASSET_INVENTORY.md');
const DIRECTIONS = ['down', 'up', 'left', 'right'];

const [creaturesDirArg, biomesDirArg] = process.argv.slice(2);
if (!creaturesDirArg || !biomesDirArg) {
  console.error('Uso: node scripts/asset-inspector/inspect.mjs <pasta_monstros> <pasta_biomas>');
  process.exit(2);
}
const CREATURES_DIR = path.resolve(creaturesDirArg);
const BIOMES_DIR = path.resolve(biomesDirArg);

const issues = [];
const issue = (level, code, message) => issues.push({ level, code, message });

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const exists = (file) => fs.existsSync(file);
const rel = (base, file) => path.relative(base, file).split(path.sep).join('/');

// Lê o CSV simples (sem campos com vírgula entre aspas neste pacote).
function readCsv(file) {
  const [header, ...lines] = fs.readFileSync(file, 'utf8').trim().split(/\r?\n/);
  const keys = header.split(',');
  return lines.map((line) => {
    const cells = line.split(',');
    return Object.fromEntries(keys.map((k, i) => [k, cells[i]]));
  });
}

// ---- 1. Monstros -----------------------------------------------------------
const monstersMeta = readJson(path.join(CREATURES_DIR, 'monsters_metadata.json'));
const monstersCsv = readCsv(path.join(CREATURES_DIR, 'monsters_catalog.csv'));

const creatures = [];
for (const m of monstersMeta.monsters) {
  const sheetFile = path.join(CREATURES_DIR, m.files.sheet_32x32);
  const dirFile = path.join(CREATURES_DIR, m.files.directions_dir);
  if (!exists(sheetFile)) {
    issue('error', 'missing-sheet', `Folha ausente: ${m.files.sheet_32x32}`);
    continue;
  }
  const { width, height } = readPngSize(sheetFile);
  if (width !== 128 || height !== 32) {
    issue('error', 'bad-sheet-size', `${m.slug}: folha ${width}x${height}, esperado 128x32`);
  }
  if (!exists(dirFile)) {
    issue('warn', 'missing-directions', `${m.slug}: pasta de direções ausente`);
  } else {
    for (const dir of DIRECTIONS) {
      const f = path.join(dirFile, `${dir}.png`);
      if (!exists(f)) issue('warn', 'missing-direction-frame', `${m.slug}: ${dir}.png ausente`);
    }
  }
  creatures.push({
    id: m.id,
    slug: m.slug,
    name: m.name_pt,
    mythology: m.mythology,
    archetype: m.archetype,
    sheet: `creatures/sheets/${path.basename(sheetFile)}`,
    sourceSheet: sheetFile,
    frameSize: [32, 32],
    scale: 1,
    animations: {},
    locomotion: 'unverified',
  });
}

if (monstersMeta.monsters.length !== 60) {
  issue('error', 'monster-count', `Esperado 60 monstros, encontrado ${monstersMeta.monsters.length}`);
}
const csvIds = new Set(monstersCsv.map((r) => Number(r.id)));
if (csvIds.size !== monstersMeta.monsters.length) {
  issue('warn', 'csv-json-monster-mismatch', `CSV tem ${csvIds.size} ids, JSON tem ${monstersMeta.monsters.length}`);
}

// ---- 2. Biomas -------------------------------------------------------------
const biomesMeta = readJson(path.join(BIOMES_DIR, 'biomes_metadata.json'));
const biomesCsv = readCsv(path.join(BIOMES_DIR, 'biomes_creatures_mapping.csv'));

const biomes = [];
const coverage = new Map(); // creatureId -> [biomeIds]

for (const b of biomesMeta.biomes) {
  const folder = `${String(b.id).padStart(2, '0')}_${b.slug}`;
  const base = path.join(BIOMES_DIR, 'biomes', folder);
  if (!exists(base)) {
    issue('error', 'missing-biome-folder', `Pasta de bioma ausente: biomes/${folder}`);
    continue;
  }

  const entry = {
    id: b.id,
    slug: b.slug,
    name: b.name_pt,
    folder,
    palette: b.palette,
    creatureIds: b.creature_ids,
    tileSize: 32,
    landmarkSize: 64,
    tiles: { ground: [], path: [], cliff: [] },
    transitions: [],
    props: [],
    animated: [],
  };

  for (const sub of ['tiles_32x32', 'transitions_32x32', 'props', 'animated']) {
    const dir = path.join(base, sub);
    if (!exists(dir)) {
      issue('error', 'missing-biome-subdir', `${folder}: pasta ${sub} ausente`);
      continue;
    }
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.png')).sort()) {
      const full = path.join(dir, file);
      const { width, height } = readPngSize(full);
      const rpath = `biomes/${folder}/${sub}/${file}`;
      const name = file.replace(/\.png$/, '');

      if (sub === 'tiles_32x32') {
        if (width !== 32 || height !== 32) issue('error', 'bad-tile-size', `${rpath}: ${width}x${height}`);
        if (name.startsWith('ground_')) entry.tiles.ground.push(rpath);
        else if (name === 'path_cobble') entry.tiles.path.push(rpath);
        else if (name === 'cliff_wall') entry.tiles.cliff.push(rpath);
        else issue('warn', 'unknown-tile', `${rpath} não classificado`);
      } else if (sub === 'transitions_32x32') {
        if (width !== 32 || height !== 32) issue('error', 'bad-transition-size', `${rpath}: ${width}x${height}`);
        entry.transitions.push(rpath);
      } else if (sub === 'props') {
        const isLandmark = name.startsWith('landmark_');
        const expected = isLandmark ? [64, 64] : [32, 32];
        if (width !== expected[0] || height !== expected[1]) {
          issue('error', 'bad-prop-size', `${rpath}: ${width}x${height}, esperado ${expected.join('x')}`);
        }
        entry.props.push(rpath);
      } else if (sub === 'animated') {
        const isSheet = name.endsWith('3frames_96x32');
        if (isSheet && (width !== 96 || height !== 32)) {
          issue('error', 'bad-animated-size', `${rpath}: ${width}x${height}, esperado 96x32`);
        }
        // Os arquivos *_frame_0N.png são quadros soltos, não entram no manifesto.
        if (isSheet) entry.animated.push(rpath);
      }
    }
  }

  if (entry.tiles.ground.length < 4) issue('warn', 'few-ground-tiles', `${folder}: ${entry.tiles.ground.length} solos`);
  if (entry.transitions.length !== 8) issue('warn', 'transition-count', `${folder}: ${entry.transitions.length} transições (esperado 8)`);

  for (const id of b.creature_ids) {
    if (!coverage.has(id)) coverage.set(id, []);
    coverage.get(id).push(b.id);
  }
  biomes.push(entry);
}

// Cobertura: cada monstro deve estar em ao menos um bioma e não deve repetir dentro do mesmo bioma.
const duplicatesWithin = [];
for (const b of biomesMeta.biomes) {
  const seen = new Set();
  for (const id of b.creature_ids) {
    if (seen.has(id)) duplicatesWithin.push(`bioma ${b.id} repete ${id}`);
    seen.add(id);
  }
}
for (const d of duplicatesWithin) issue('warn', 'duplicate-in-biome', d);

const missingCreatures = creatures.map((c) => c.id).filter((id) => !coverage.has(id));
if (missingCreatures.length) {
  issue('error', 'creature-not-in-biome', `Monstros sem bioma: ${missingCreatures.join(', ')}`);
}
const multiBiome = [...coverage.entries()].filter(([, v]) => v.length > 1).map(([k]) => k);

// CSV x JSON de biomas: comparar listas de criaturas.
for (const row of biomesCsv) {
  const csvList = row.monstros_ids.split(';').map(Number).sort((a, b) => a - b).join(',');
  const jsonBiome = biomesMeta.biomes.find((b) => b.id === Number(row.bioma_id));
  const jsonList = jsonBiome ? [...jsonBiome.creature_ids].sort((a, b) => a - b).join(',') : '';
  if (csvList !== jsonList) issue('warn', 'csv-json-biome-mismatch', `bioma ${row.bioma_id}: CSV e JSON divergem`);
}

// ---- 3. Cópia dos arquivos de runtime ------------------------------------
fs.rmSync(PUBLIC_ASSETS, { recursive: true, force: true });
fs.mkdirSync(path.join(PUBLIC_ASSETS, 'creatures', 'sheets'), { recursive: true });

for (const c of creatures) {
  fs.copyFileSync(c.sourceSheet, path.join(PUBLIC_ASSETS, c.sheet));
  delete c.sourceSheet;
}

for (const b of biomes) {
  const srcBase = path.join(BIOMES_DIR, 'biomes', b.folder);
  for (const sub of ['tiles_32x32', 'transitions_32x32', 'props', 'animated']) {
    const src = path.join(srcBase, sub);
    if (!exists(src)) continue;
    const dest = path.join(PUBLIC_ASSETS, 'biomes', b.folder, sub);
    fs.mkdirSync(dest, { recursive: true });
    for (const file of fs.readdirSync(src).filter((f) => f.endsWith('.png'))) {
      const isFrame = sub === 'animated' && !file.endsWith('3frames_96x32.png');
      if (isFrame) continue;
      fs.copyFileSync(path.join(src, file), path.join(dest, file));
    }
  }
}

// ---- 4. Manifesto ---------------------------------------------------------
const manifest = {
  schemaVersion: 1,
  frameDirections: DIRECTIONS,
  creatures,
  biomes: biomes.map((b) => ({ ...b, creatureIds: b.creatureIds })),
  coverage: {
    creatureCount: creatures.length,
    biomeCount: biomes.length,
    uncovered: missingCreatures,
    inMultipleBiomes: multiBiome,
  },
  issues,
};
fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');

// ---- 5. Inventário em markdown -------------------------------------------
const errors = issues.filter((i) => i.level === 'error');
const warns = issues.filter((i) => i.level === 'warn');
const lines = [];
lines.push('# Inventário dos assets', '');
lines.push('Gerado por `npm run assets:inspect`. Não editar à mão.', '');
lines.push('## Resumo', '');
lines.push(`- Monstros: ${creatures.length} (4 direções, folha 128x32 por monstro)`);
lines.push(`- Biomas: ${biomes.length}`);
lines.push(`- Monstros sem bioma: ${missingCreatures.length ? missingCreatures.join(', ') : 'nenhum'}`);
lines.push(`- Monstros em mais de um bioma: ${multiBiome.length ? multiBiome.join(', ') : 'nenhum'}`);
lines.push(`- Erros: ${errors.length} · Avisos: ${warns.length}`, '');
lines.push('## Biomas', '');
lines.push('| id | bioma | solos | transições | props | animados | criaturas |');
lines.push('|---|---|---|---|---|---|---|');
for (const b of biomes) {
  lines.push(`| ${b.id} | ${b.name} | ${b.tiles.ground.length} | ${b.transitions.length} | ${b.props.length} | ${b.animated.length} | ${b.creatureIds.length} |`);
}
lines.push('', '## Monstros', '');
lines.push('| id | nome | mitologia | arquétipo | folha |');
lines.push('|---|---|---|---|---|');
for (const c of creatures) {
  lines.push(`| ${c.id} | ${c.name} | ${c.mythology} | ${c.archetype} | \`${c.sheet}\` |`);
}
lines.push('', '## Problemas', '');
if (issues.length === 0) lines.push('Nenhum problema encontrado.');
for (const i of issues) lines.push(`- **${i.level}** \`${i.code}\`: ${i.message}`);
lines.push('');
fs.writeFileSync(INVENTORY_PATH, lines.join('\n'));

// ---- Saída ---------------------------------------------------------------
console.log(`Monstros: ${creatures.length} · Biomas: ${biomes.length}`);
console.log(`Erros: ${errors.length} · Avisos: ${warns.length}`);
console.log(`Manifesto: ${rel(ROOT, MANIFEST_PATH)} · Inventário: ${rel(ROOT, INVENTORY_PATH)}`);
for (const i of issues) console.log(`  [${i.level}] ${i.code}: ${i.message}`);
if (errors.length) process.exit(1);
