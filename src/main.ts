import * as THREE from 'three';
import { loadManifest } from './assets/manifest';
import { buildTerrariumView, GRID_H, GRID_W } from './rendering/terrariumView';
import type { Direction } from './shared/types/manifest';

const DIRECTION_KEYS: Record<string, Direction> = {
  ArrowDown: 'down',
  ArrowUp: 'up',
  ArrowLeft: 'left',
  ArrowRight: 'right',
};

async function start(): Promise<void> {
  const hud = document.getElementById('hud') as HTMLElement;
  const canvasHost = document.getElementById('app') as HTMLElement;

  const manifest = await loadManifest();
  const biome = manifest.biomes[0];
  const creature = manifest.creatures.find((c) => c.id === biome.creatureIds[0]);
  if (!creature) throw new Error(`Bioma ${biome.slug} sem criaturas no manifesto.`);

  const renderer = new THREE.WebGLRenderer({ antialias: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  canvasHost.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(biome.palette.ground ?? '#1d2b24');

  // Câmera ortográfica top-down: 1 unidade = 1 tile (32 px).
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  camera.position.set(GRID_W / 2, GRID_H / 2, 10);
  camera.lookAt(GRID_W / 2, GRID_H / 2, 0);

  const view = await buildTerrariumView(scene, manifest, biome, creature, 'down');

  const resize = () => {
    const w = canvasHost.clientWidth;
    const h = canvasHost.clientHeight;
    renderer.setSize(w, h, false);
    // Enquadra o mundo inteiro com uma pequena margem, sem distorcer.
    const worldW = GRID_W + 1;
    const worldH = GRID_H + 1;
    const aspect = w / h;
    const viewW = aspect >= worldW / worldH ? worldH * aspect : worldW;
    const viewH = aspect >= worldW / worldH ? worldH : worldW / aspect;
    camera.left = -viewW / 2;
    camera.right = viewW / 2;
    camera.top = viewH / 2;
    camera.bottom = -viewH / 2;
    camera.updateProjectionMatrix();
  };
  window.addEventListener('resize', resize);
  resize();

  const updateHud = () => {
    hud.textContent = `${biome.name} · ${creature.name} (${creature.slug}) · voltado para: ${view.facing}  —  setas: mudar direção`;
  };
  updateHud();

  window.addEventListener('keydown', (event) => {
    const dir = DIRECTION_KEYS[event.key];
    if (!dir) return;
    event.preventDefault();
    view.setFacing(dir);
    updateHud();
  });

  renderer.setAnimationLoop(() => {
    renderer.render(scene, camera);
  });
}

start().catch((error: unknown) => {
  const hud = document.getElementById('hud');
  if (hud) hud.textContent = `Erro: ${error instanceof Error ? error.message : String(error)}`;
  console.error(error);
});
