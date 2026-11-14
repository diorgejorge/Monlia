import * as THREE from 'three';
import type { BiomeAsset, CreatureAsset, Direction, Manifest } from '../shared/types/manifest';
import { frameTexture, loadPixelTexture } from './textures';

// Visualização da sprint 1 em 2.5D:
// - o mundo é 3D (tiles de solo em planos, paredões em degraus), com texturas pixel art;
// - os monstros são sprites 2.5D: billboards que olham para a câmera, com a direção
//   escolhida entre os quatro quadros da folha (down, up, left, right).
// A simulação ainda não existe; isto prova que assets reais aparecem corretamente.

export const GRID_W = 16;
export const GRID_H = 10;

// Degrau do platô em unidades de tile. Cada tile tem 1 unidade (32 px de textura).
const PLATEAU_X = 12;
const PLATEAU_HEIGHT = 1;

export interface TerrariumView {
  setFacing(dir: Direction): void;
  update(camera: THREE.Camera): void;
  readonly facing: Direction;
  readonly creaturePosition: THREE.Vector3;
}

// Hash determinístico para escolher a variação de solo sem aleatoriedade.
function tileHash(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function heightAt(x: number, y: number): number {
  return x >= PLATEAU_X && y >= 1 && y <= GRID_H - 2 ? PLATEAU_HEIGHT : 0;
}

function pixelMaterial(texture: THREE.Texture, alphaTest = 0): THREE.MeshLambertMaterial {
  return new THREE.MeshLambertMaterial({ map: texture, alphaTest, side: THREE.DoubleSide });
}

// Chão horizontal de um tile, no topo da altura indicada.
function floorTile(texture: THREE.Texture, x: number, y: number, h: number): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), pixelMaterial(texture));
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x + 0.5, h, y + 0.5);
  return mesh;
}

// Parede vertical entre um tile alto e um vizinho mais baixo.
// dx, dy indicam para qual vizinho a parede olha.
function cliffWall(texture: THREE.Texture, x: number, y: number, hHigh: number, hLow: number, dx: number, dy: number): THREE.Mesh {
  const height = hHigh - hLow;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, height), pixelMaterial(texture));
  mesh.position.set(x + 0.5 + dx * 0.5, (hHigh + hLow) / 2, y + 0.5 + dy * 0.5);
  if (dx === 1) mesh.rotation.y = Math.PI / 2;
  else if (dx === -1) mesh.rotation.y = -Math.PI / 2;
  else if (dy === -1) mesh.rotation.y = Math.PI;
  return mesh;
}

// Sprite 2.5D: quad com a base no ponto de origem, que gira só no eixo Y para olhar para a câmera.
function billboard(texture: THREE.Texture, width: number, height: number): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(width, height);
  geo.translate(0, height / 2, 0);
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshBasicMaterial({ map: texture, alphaTest: 0.5, transparent: false, side: THREE.DoubleSide }),
  );
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

  const pathRow = Math.floor(GRID_H / 2) - 1;
  const groundAt = (x: number, y: number) => {
    if (y === pathRow && x >= 2 && x <= 9) return pathTexture;
    return groundTextures[Math.floor(tileHash(x, y) * groundTextures.length)];
  };

  // Solo e paredões. Os paredões ficam nas bordas em que o vizinho é mais baixo.
  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      const h = heightAt(x, y);
      scene.add(floorTile(groundAt(x, y), x, y, h));

      const neighbours: Array<[number, number]> = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (const [dx, dy] of neighbours) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= GRID_W || ny >= GRID_H) continue;
        const hn = heightAt(nx, ny);
        if (hn < h) scene.add(cliffWall(cliffTexture, x, y, h, hn, dx, dy));
      }
    }
  }

  // Marco de 64x64 (2x2 tiles) e relíquia, de pé sobre o solo.
  const landmark = biome.props.find((p) => p.includes('landmark_flora'));
  if (landmark) {
    const tex = await loadPixelTexture(landmark);
    const m = billboard(tex, 2, 2);
    m.position.set(4, 0, 6);
    m.userData.billboard = true;
    scene.add(m);
  }
  const relic = biome.props.find((p) => p.includes('prop_relic'));
  if (relic) {
    const tex = await loadPixelTexture(relic);
    const m = billboard(tex, 1, 1);
    m.position.set(9.5, 0, 3.5);
    m.userData.billboard = true;
    scene.add(m);
  }

  // Criatura: folha 128x32 com quatro quadros de direção.
  const sheetTexture = await loadPixelTexture(creature.sheet);
  const order = manifest.frameDirections;
  const sprite = billboard(sheetTexture, 1.2, 1.2);
  const spawn = new THREE.Vector3(6.5, heightAt(6, 2), 4.5);
  sprite.position.copy(spawn);
  sprite.userData.billboard = true;
  scene.add(sprite);

  // Direção do mundo que cada tecla define (down = em direção à câmera).
  const worldFacing: Record<Direction, THREE.Vector3> = {
    down: new THREE.Vector3(0, 0, 1),
    up: new THREE.Vector3(0, 0, -1),
    left: new THREE.Vector3(-1, 0, 0),
    right: new THREE.Vector3(1, 0, 0),
  };

  let current: Direction = initialFacing;
  let facingVec = worldFacing[initialFacing].clone();
  let frame = -1;

  const setFrame = (idx: number) => {
    if (idx === frame) return;
    frame = idx;
    const mat = sprite.material as THREE.MeshBasicMaterial;
    mat.map = frameTexture(sheetTexture, idx, order.length);
    mat.needsUpdate = true;
  };

  const camRight = new THREE.Vector3();
  const toCamera = new THREE.Vector3();

  // Escolhe o quadro pela direção do monstro em relação à câmera.
  // Assim, "down" aparece quando ele anda em direção ao observador.
  const update = (camera: THREE.Camera) => {
    // Billboard: gira só em Y para olhar para a câmera.
    toCamera.set(camera.position.x - sprite.position.x, 0, camera.position.z - sprite.position.z).normalize();
    sprite.rotation.set(0, Math.atan2(toCamera.x, toCamera.z), 0);

    camRight.set(1, 0, 0).applyQuaternion(camera.quaternion);
    camRight.y = 0;
    camRight.normalize();

    const f = facingVec;
    const dirName = dirFromScreen(f, toCamera, camRight);
    setFrame(order.indexOf(dirName));
  };

  // Direção de tela da criatura: se está indo para a câmera, de costas, ou de lado.
  const dirFromScreen = (f: THREE.Vector3, toCam: THREE.Vector3, right: THREE.Vector3): Direction => {
    const towards = f.dot(toCam);
    if (towards > 0.7) return 'down';
    if (towards < -0.7) return 'up';
    return f.dot(right) > 0 ? 'right' : 'left';
  };

  return {
    setFacing(dir: Direction) {
      current = dir;
      facingVec = worldFacing[dir].clone();
    },
    update,
    get facing() {
      return current;
    },
    get creaturePosition() {
      return sprite.position;
    },
  };
}
