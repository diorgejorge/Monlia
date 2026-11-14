import * as THREE from 'three';
import type { BiomeAsset, CreatureAsset, Direction, Manifest } from '../shared/types/manifest';
import { frameTexture, loadPixelTexture } from './textures';

// Visualização da sprint 1: um pedaço de bioma com um monstro real.
// A lógica de simulação não existe ainda; isto só prova que assets reais aparecem na cena.

export const GRID_W = 16;
export const GRID_H = 10;

const Z_GROUND = 0;
const Z_PROPS = 0.5;
const Z_CREATURE = 1;

export interface TerrariumView {
  setFacing(dir: Direction): void;
  readonly facing: Direction;
}

// Hash determinístico para escolher a variação de solo sem aleatoriedade.
function tileHash(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function quad(width: number, height: number, texture: THREE.Texture, x: number, y: number, z: number, alphaTest: boolean): THREE.Mesh {
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    alphaTest: alphaTest ? 0.5 : 0,
    transparent: false,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  mesh.position.set(x, y, z);
  return mesh;
}

export async function buildTerrariumView(
  scene: THREE.Scene,
  manifest: Manifest,
  biome: BiomeAsset,
  creature: CreatureAsset,
  initialFacing: Direction,
): Promise<TerrariumView> {
  const groundTextures = await Promise.all(biome.tiles.ground.map(loadPixelTexture));
  const pathTexture = await loadPixelTexture(biome.tiles.path[0]);
  const cliffTexture = await loadPixelTexture(biome.tiles.cliff[0]);

  // Solo: variação determinística por célula, com um caminho horizontal e um paredão.
  const pathRow = Math.floor(GRID_H / 2) - 1;
  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      let tex: THREE.Texture;
      if (y === pathRow && x >= 2 && x <= 13) {
        tex = pathTexture;
      } else if (x === GRID_W - 1 && y >= GRID_H - 3) {
        tex = cliffTexture;
      } else {
        tex = groundTextures[Math.floor(tileHash(x, y) * groundTextures.length)];
      }
      scene.add(quad(1, 1, tex, x + 0.5, y + 0.5, Z_GROUND, false));
    }
  }

  // Props sobre o solo. Marcos de 64x64 ocupam 2x2 tiles, com base no tile indicado.
  const landmark = biome.props.find((p) => p.includes('landmark_flora'));
  if (landmark) {
    const tex = await loadPixelTexture(landmark);
    scene.add(quad(2, 2, tex, 4, 7, Z_PROPS, true));
  }
  const relic = biome.props.find((p) => p.includes('prop_relic'));
  if (relic) {
    const tex = await loadPixelTexture(relic);
    scene.add(quad(1, 1, tex, 9.5, 2.5, Z_PROPS, true));
  }

  // Criatura real: uma folha 128x32 com quatro direções.
  const sheetTexture = await loadPixelTexture(creature.sheet);
  const order = manifest.frameDirections;
  const creatureMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ alphaTest: 0.5, transparent: false }),
  );
  creatureMesh.position.set(6.5, 2.5, Z_CREATURE);
  scene.add(creatureMesh);

  const applyFacing = (dir: Direction) => {
    const idx = order.indexOf(dir);
    const tex = frameTexture(sheetTexture, idx, order.length);
    (creatureMesh.material as THREE.MeshBasicMaterial).map = tex;
    (creatureMesh.material as THREE.MeshBasicMaterial).needsUpdate = true;
    current = dir;
  };

  let current: Direction = initialFacing;
  applyFacing(initialFacing);

  return {
    setFacing: applyFacing,
    get facing() {
      return current;
    },
  };
}
