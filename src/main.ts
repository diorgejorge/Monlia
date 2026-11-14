import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
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
  const host = document.getElementById('app') as HTMLElement;

  const manifest = await loadManifest();
  const biome = manifest.biomes[0];
  const creature = manifest.creatures.find((c) => c.id === biome.creatureIds[0]);
  if (!creature) throw new Error(`Bioma ${biome.slug} sem criaturas no manifesto.`);

  const renderer = new THREE.WebGLRenderer({ antialias: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(biome.palette.ground ?? '#1d2b24');
  scene.add(new THREE.AmbientLight(0xffffff, 0.75));
  const sun = new THREE.DirectionalLight(0xffffff, 1.1);
  sun.position.set(-6, 14, 8);
  scene.add(sun);

  // Câmera 2.5D: perspectiva inclinada, olhando para o centro do terreno.
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
  const target = new THREE.Vector3(GRID_W / 2, 0, GRID_H / 2);
  camera.position.set(GRID_W / 2, 10.5, GRID_H / 2 + 10);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(target);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minDistance = 8;
  controls.maxDistance = 36;
  controls.minPolarAngle = Math.PI / 6;
  controls.maxPolarAngle = Math.PI / 2.2;
  controls.update();

  const view = await buildTerrariumView(scene, manifest, biome, creature, 'down');

  const resize = () => {
    const w = host.clientWidth;
    const h = host.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  window.addEventListener('resize', resize);
  resize();

  const updateHud = () => {
    hud.textContent = `${biome.name} · ${creature.name} (${creature.slug}) · voltado para: ${view.facing}  —  setas: mudar direção · arrastar: girar câmera`;
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
    controls.update();
    view.update(camera);
    renderer.render(scene, camera);
  });
}

start().catch((error: unknown) => {
  const hud = document.getElementById('hud');
  if (hud) hud.textContent = `Erro: ${error instanceof Error ? error.message : String(error)}`;
  console.error(error);
});
