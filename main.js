import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ---- Configuração -------------------------------------------------------
const R = 22;            // raio do globo em voxels
const SEA = 0;           // nível do mar (altura relativa ao raio)
const SHELL = 3;         // espessura da casca de voxels (3 evita fendas)
const WALK_SPEED = 2.5;  // unidades por segundo

const COLORS = {
  water: new THREE.Color('#2f6f9f'),
  sand:  new THREE.Color('#e3cb86'),
  grass: new THREE.Color('#6aa84f'),
  rock:  new THREE.Color('#8a7f72'),
  snow:  new THREE.Color('#f2f5f8'),
  dirt:  new THREE.Color('#6b4f3a'),
};

// ---- Cena, câmera e renderer -------------------------------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d1420);

const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 500);
camera.position.set(0, 18, 70);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;
controls.minDistance = 30;
controls.maxDistance = 160;

scene.add(new THREE.HemisphereLight(0xcfe8ff, 0x2a2a3a, 1.1));
const sun = new THREE.DirectionalLight(0xffffff, 1.4);
sun.position.set(40, 60, 30);
scene.add(sun);

// ---- Ruído determinístico ----------------------------------------------
function hash3(x, y, z, s) {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 1442695041) ^ Math.imul(s, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}

function vnoise(x, y, z, s) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  let u = x - xi, v = y - yi, w = z - zi;
  u = u * u * (3 - 2 * u); v = v * v * (3 - 2 * v); w = w * w * (3 - 2 * w);
  const lerp = (a, b, t) => a + (b - a) * t;
  const x0 = lerp(hash3(xi, yi, zi, s),         hash3(xi + 1, yi, zi, s),         u);
  const x1 = lerp(hash3(xi, yi + 1, zi, s),     hash3(xi + 1, yi + 1, zi, s),     u);
  const x2 = lerp(hash3(xi, yi, zi + 1, s),     hash3(xi + 1, yi, zi + 1, s),     u);
  const x3 = lerp(hash3(xi, yi + 1, zi + 1, s), hash3(xi + 1, yi + 1, zi + 1, s), u);
  return lerp(lerp(x0, x1, v), lerp(x2, x3, v), w);
}

function fbm(x, y, z, s) {
  let a = 0.5, f = 0, n = 0;
  for (let i = 0; i < 4; i++) {
    f += a * vnoise(x, y, z, s + i * 17);
    n += a;
    x *= 2.03; y *= 2.03; z *= 2.03;
    a *= 0.5;
  }
  return f / n;
}

// ---- Terreno -----------------------------------------------------------
let seed = 1;

// altura (em voxels, relativa a R) para uma direção unitária n
function height(n) {
  const o = seed * 7.31;
  return (fbm(n.x * 2.4 + o, n.y * 2.4 + o * 0.6, n.z * 2.4 + o * 1.3, seed) - 0.5) * 22;
}

// altura inteira da superfície visível nessa direção
function topOf(n) {
  return Math.round(Math.max(height(n), SEA));
}

function surfaceColor(h) {
  if (h < SEA) return COLORS.water;
  if (h < 1.0) return COLORS.sand;
  if (h < 3.8) return COLORS.grass;
  if (h < 5.2) return COLORS.rock;
  return COLORS.snow;
}

// ---- Globo (InstancedMesh de voxels) -----------------------------------
let globe = null;

function buildGlobe() {
  if (globe) {
    scene.remove(globe);
    globe.geometry.dispose();
    globe.material.dispose();
    globe = null;
  }

  const xs = [], ys = [], zs = [], cols = [];
  const lim = R + 12;
  const dir = new THREE.Vector3();
  const color = new THREE.Color();

  for (let x = -lim; x <= lim; x++) {
    for (let y = -lim; y <= lim; y++) {
      for (let z = -lim; z <= lim; z++) {
        const d = Math.sqrt(x * x + y * y + z * z);
        if (d < R - 4 || d > R + 12) continue;

        dir.set(x, y, z).divideScalar(d);
        const h = height(dir);
        const top = Math.round(Math.max(h, SEA));
        if (!(d <= R + top + 0.5 && d > R + top - SHELL + 0.5)) continue;

        // Camada de cima tem cor de superfície; a de baixo é terra (ou água no mar).
        const isLower = d < R + top - 0.5;
        const base = h < SEA ? COLORS.water : (isLower ? COLORS.dirt : surfaceColor(h));
        const jitter = 0.92 + hash3(x, y, z, seed + 99) * 0.16;
        color.copy(base).multiplyScalar(jitter);

        xs.push(x); ys.push(y); zs.push(z);
        cols.push(color.r, color.g, color.b);
      }
    }
  }

  const count = xs.length;
  const mesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshLambertMaterial(),
    count
  );
  const m = new THREE.Matrix4();
  for (let i = 0; i < count; i++) {
    m.makeTranslation(xs[i], ys[i], zs[i]);
    mesh.setMatrixAt(i, m);
    mesh.setColorAt(i, color.setRGB(cols[i * 3], cols[i * 3 + 1], cols[i * 3 + 2]));
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

  scene.add(mesh);
  globe = mesh;
}

// ---- Personagem --------------------------------------------------------
// peça do personagem, posicionada em (x, y, z) relativo ao pai
function part(w, h, d, color, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ color })
  );
  mesh.position.set(x, y, z);
  return mesh;
}

function buildCharacter() {
  const group = new THREE.Group();
  const shirt = 0xe4572e, pants = 0x2d3e50, skin = 0xf2c6a0, hair = 0x3b2a20;

  // pivôs (grupos) nas articulações; as peças ficam deslocadas dentro deles
  const legL = new THREE.Group(); legL.position.set(-0.2, 1.0, 0);
  legL.add(part(0.36, 1.0, 0.36, pants, 0, -0.5, 0));
  const legR = new THREE.Group(); legR.position.set(0.2, 1.0, 0);
  legR.add(part(0.36, 1.0, 0.36, pants, 0, -0.5, 0));

  const body = new THREE.Group(); body.position.y = 1.0;
  body.add(part(0.8, 0.9, 0.5, shirt, 0, 0.45, 0));

  const armL = new THREE.Group(); armL.position.set(-0.52, 0.85, 0);
  armL.add(part(0.28, 0.85, 0.28, shirt, 0, -0.42, 0));
  const armR = new THREE.Group(); armR.position.set(0.52, 0.85, 0);
  armR.add(part(0.28, 0.85, 0.28, shirt, 0, -0.42, 0));
  body.add(armL, armR);

  const head = new THREE.Group(); head.position.set(0, 0.9, 0);
  head.add(part(0.7, 0.7, 0.7, skin, 0, 0.35, 0));
  head.add(part(0.74, 0.25, 0.74, hair, 0, 0.66, 0));
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });
  for (const ex of [-0.16, 0.16]) {
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.03), eyeMat);
    eye.position.set(ex, 0.38, 0.36);
    head.add(eye);
  }
  body.add(head);

  group.add(legL, legR, body);
  group.scale.setScalar(0.85);
  scene.add(group);

  return { group, body, legL, legR, armL, armR };
}

let character = null;
const cs = {
  p: new THREE.Vector3(0, 1, 0), // posição na esfera (unitária)
  f: new THREE.Vector3(1, 0, 0), // direção de caminhada (tangente)
  phase: 0,
  turnT: 3,
};

function randomUnit() {
  const v = new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1);
  return v.lengthSq() < 1e-6 ? new THREE.Vector3(0, 1, 0) : v.normalize();
}

function tangentAt(n) {
  const r = randomUnit();
  return r.addScaledVector(n, -r.dot(n)).normalize();
}

function spawnCharacter() {
  let n = randomUnit();
  for (let i = 0; i < 500; i++) {
    const c = randomUnit();
    if (height(c) > 1.2) { n = c; break; }
  }
  cs.p.copy(n);
  cs.f.copy(tangentAt(n));
  cs.phase = 0;
  cs.turnT = 2 + Math.random() * 3;
}

function stepCharacter(dt) {
  cs.turnT -= dt;
  if (cs.turnT <= 0) {
    cs.f.applyAxisAngle(cs.p, (Math.random() * 2 - 1) * 1.0);
    cs.turnT = 2 + Math.random() * 4;
  }

  const ang = (WALK_SPEED * dt) / (R + 1);
  const c = Math.cos(ang), s = Math.sin(ang);
  const next = cs.p.clone().multiplyScalar(c).addScaledVector(cs.f, s).normalize();
  const nf = cs.f.clone().multiplyScalar(c).addScaledVector(cs.p, -s);

  const curTop = topOf(cs.p);
  const nextTop = topOf(next);
  const blocked = height(next) < SEA + 0.3 || Math.abs(nextTop - curTop) > 1;

  if (blocked) {
    // não anda: gira para um lado e tenta de novo depois
    cs.f.applyAxisAngle(cs.p, (Math.random() < 0.5 ? 1 : -1) * (0.9 + Math.random() * 1.2));
    cs.turnT = Math.min(cs.turnT, 0.6);
    return false;
  }

  cs.p.copy(next);
  cs.f.copy(nf);
  cs.f.addScaledVector(cs.p, -cs.f.dot(cs.p)).normalize();
  cs.phase += dt * 9;
  return true;
}

function updateCharacterPose(moving) {
  const { group, body, legL, legR, armL, armR } = character;
  const swing = moving ? Math.sin(cs.phase) * 0.7 : 0;

  legL.rotation.x = swing;
  legR.rotation.x = -swing;
  armL.rotation.x = -swing * 0.8;
  armR.rotation.x = swing * 0.8;
  body.position.y = 1.0 + (moving ? Math.abs(Math.sin(cs.phase)) * 0.05 : 0);

  const top = topOf(cs.p);
  group.position.copy(cs.p).multiplyScalar(R + top + 0.5);

  // base do personagem: x = direita, y = normal (up), z = direção de caminhada
  const up = cs.p;
  const fwd = cs.f;
  const right = new THREE.Vector3().crossVectors(up, fwd).normalize();
  const m = new THREE.Matrix4().makeBasis(right, up, fwd);
  group.quaternion.setFromRotationMatrix(m);
}

// ---- Controles de UI ---------------------------------------------------
let follow = false;
const followBtn = document.getElementById('follow');
const newWorldBtn = document.getElementById('newWorld');

followBtn.addEventListener('click', () => {
  follow = !follow;
  followBtn.setAttribute('aria-pressed', String(follow));
});

newWorldBtn.addEventListener('click', () => {
  seed += 1;
  buildGlobe();
  spawnCharacter();
});

// ---- Loop --------------------------------------------------------------
const clock = new THREE.Clock();
const origin = new THREE.Vector3();
const charWorld = new THREE.Vector3();

function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);

  const moving = stepCharacter(dt);
  updateCharacterPose(moving);

  charWorld.copy(character.group.position);
  if (follow) {
    // alvo no personagem; câmera sobe e se posiciona acima dele, no lado de fora do globo
    const up = charWorld.clone().normalize();
    const camGoal = charWorld.clone().addScaledVector(up, 40).addScaledVector(cs.f, -30);
    controls.target.lerp(charWorld, 0.08);
    camera.position.lerp(camGoal, 0.06);
  } else {
    // alvo volta para a origem; a câmera mantém a distância atual
    const prevTarget = controls.target.clone();
    controls.target.lerp(origin, 0.08);
    camera.position.add(controls.target.clone().sub(prevTarget));
  }

  controls.update();
  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

buildGlobe();
character = buildCharacter();
spawnCharacter();
renderer.setAnimationLoop(frame);
