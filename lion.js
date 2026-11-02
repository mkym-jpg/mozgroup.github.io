// ============================================================
// トップページ専用:最初のLP演出 と 触って回せる立体ライオン
// - lion.glb(Tripoで書き出したモデル)があればそれを表示する。
//   無い場合はロゴ画像から丸みのある立体(仮)を自動生成して表示する。
// - 常時回転はしない。触ったとき(ドラッグ/スワイプ)だけ回り、指を離すと惰性で止まる。
// ============================================================
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const MODEL_URL = 'lion.glb';
const LOGO_URL = 'lion-mark-white.png';
const INTRO_KEY = 'mozIntroSeen';

const intro = document.getElementById('intro');
const introStage = document.getElementById('introStage');
const heroStage = document.getElementById('heroStage');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- LP(イントロ)を出すかどうか ----------
function seenIntro() {
  try { return sessionStorage.getItem(INTRO_KEY) === '1'; } catch (e) { return false; }
}
function markIntroSeen() {
  try { sessionStorage.setItem(INTRO_KEY, '1'); } catch (e) { /* 保存できない環境では毎回表示 */ }
}
const showIntro = intro && !location.hash && !seenIntro() && !reduceMotion;

// ---------- 3D ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.domElement.className = 'lion-canvas';
renderer.domElement.setAttribute('aria-label', 'mozのライオン。ドラッグで回転できます');
renderer.domElement.setAttribute('role', 'img');

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 1.4;

const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
camera.position.set(0, 0, 6.2);

const key = new THREE.DirectionalLight(0xffffff, 2.2);
key.position.set(2.5, 3, 4);
scene.add(key);
const rim = new THREE.DirectionalLight(0xb9b4ff, 1.4);
rim.position.set(-3, 1, -3);
scene.add(rim);

const pivot = new THREE.Group();
scene.add(pivot);

let host = null;        // 現在キャンバスを置いている要素
let allowTilt = true;   // 縦方向の傾きを許可するか(ヒーローではスクロール優先のため無効)

function mount(el, tilt) {
  if (!el) return;
  host = el;
  allowTilt = tilt;
  el.appendChild(renderer.domElement);
  renderer.domElement.style.touchAction = tilt ? 'none' : 'pan-y';
  resize();
}

function resize() {
  if (!host) return;
  const w = host.clientWidth, h = host.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  // 縦長の画面でもライオン全体が収まるよう、カメラの距離を調整する
  camera.position.z = 3.3 / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * Math.min(1, camera.aspect));
  camera.updateProjectionMatrix();
  requestRender();
}
window.addEventListener('resize', resize);

// ---------- 操作(触ったときだけ回る) ----------
let rotY = -1.0, rotX = 0;  // 最初はロゴと同じく左向きの斜め横顔
let velY = 0, velX = 0;
let dragging = false, lastX = 0, lastY = 0;
const canvas = renderer.domElement;

canvas.addEventListener('pointerdown', (e) => {
  dragging = true;
  lastX = e.clientX; lastY = e.clientY;
  velX = velY = 0;
  canvas.setPointerCapture(e.pointerId);
  canvas.classList.add('is-grabbing');
  requestRender();
});
canvas.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const dx = e.clientX - lastX, dy = e.clientY - lastY;
  lastX = e.clientX; lastY = e.clientY;
  velY = dx * 0.012;
  velX = allowTilt ? dy * 0.008 : 0;
  rotY += velY;
  rotX = THREE.MathUtils.clamp(rotX + velX, -0.7, 0.7);
  requestRender();
});
function endDrag() {
  dragging = false;
  canvas.classList.remove('is-grabbing');
  requestRender();
}
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);

// 描画は「動いているときだけ」行う(待機中はCPUを使わない)
let rafId = 0;
function requestRender() {
  if (!rafId) rafId = requestAnimationFrame(tick);
}
function tick() {
  rafId = 0;
  if (!dragging) {
    rotY += velY;
    rotX = THREE.MathUtils.clamp(rotX + velX, -0.7, 0.7);
    velY *= 0.93;
    velX *= 0.9;
  }
  pivot.rotation.set(rotX, rotY, 0);
  renderer.render(scene, camera);
  if (dragging || Math.abs(velY) > 0.0005 || Math.abs(velX) > 0.0005) requestRender();
}

// ---------- モデル読み込み ----------
// Meshy の書き出しは形だけ(色なし)なので、黒曜石のような艶のある黒に仕上げる
const lionMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x26262d, metalness: 0.3, roughness: 0.26,
  clearcoat: 1, clearcoatRoughness: 0.1,
});

function fitToView(obj) {
  obj.traverse((o) => { if (o.isMesh) o.material = lionMaterial; });
  const box = new THREE.Box3().setFromObject(obj);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  obj.position.sub(center);
  const s = 3.0 / Math.max(size.x, size.y, size.z);
  const wrap = new THREE.Group();
  wrap.add(obj);
  wrap.scale.setScalar(s);
  return wrap;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// lion.glb が無いときの仮モデル:ロゴのシルエットを、ふくらみのある彫刻状の立体にする
async function buildRelief() {
  const img = await loadImage(LOGO_URL);
  const N = 220;
  const aspect = img.height / img.width;
  const cw = N, ch = Math.round(N * aspect);

  const c = document.createElement('canvas');
  c.width = cw; c.height = ch;
  const ctx = c.getContext('2d', { willReadFrequently: true });

  function alphaWithBlur(blur) {
    ctx.clearRect(0, 0, cw, ch);
    ctx.filter = blur ? 'blur(' + blur + 'px)' : 'none';
    ctx.drawImage(img, 0, 0, cw, ch);
    ctx.filter = 'none';
    const d = ctx.getImageData(0, 0, cw, ch).data;
    const out = new Float32Array(cw * ch);
    for (let i = 0; i < out.length; i++) out[i] = d[i * 4 + 3] / 255;
    return out;
  }
  const soft = alphaWithBlur(7);
  const mid = alphaWithBlur(3);

  // 切り抜き用マスク(白=表示)
  const m = document.createElement('canvas');
  m.width = cw * 2; m.height = ch * 2;
  const mctx = m.getContext('2d');
  mctx.fillStyle = '#000';
  mctx.fillRect(0, 0, m.width, m.height);
  mctx.drawImage(img, 0, 0, m.width, m.height);
  const mask = new THREE.CanvasTexture(m);

  const W = 2.4, H = W * aspect, depth = 0.32;
  const geo = new THREE.PlaneGeometry(W, H, cw - 1, ch - 1);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const h = Math.pow(soft[i] * 0.65 + mid[i] * 0.35, 0.75);
    pos.setZ(i, h * depth);
  }
  geo.computeVertexNormals();

  const mat = new THREE.MeshPhysicalMaterial({
    color: 0x1a1a1f, metalness: 0.35, roughness: 0.22,
    clearcoat: 1, clearcoatRoughness: 0.12,
    alphaMap: mask, alphaTest: 0.5, side: THREE.DoubleSide,
  });
  const front = new THREE.Mesh(geo, mat);
  const back = new THREE.Mesh(geo, mat);
  back.scale.z = -1;
  const g = new THREE.Group();
  g.add(front, back);
  return g;
}

async function loadLion() {
  let model = null;
  try {
    const res = await fetch(MODEL_URL, { method: 'HEAD' });
    if (res.ok) {
      const loader = new GLTFLoader();
      loader.setMeshoptDecoder(MeshoptDecoder);
      const gltf = await loader.loadAsync(MODEL_URL);
      model = fitToView(gltf.scene);
    }
  } catch (e) { model = null; }
  if (!model) model = await buildRelief();
  pivot.add(model);
  document.documentElement.classList.add('lion-ready');
  requestRender();
}

// ---------- LP の進行 ----------
function finishIntro() {
  if (!intro || intro.classList.contains('is-leaving')) return;
  markIntroSeen();
  intro.classList.add('is-leaving');
  document.documentElement.classList.remove('intro-lock');
  setTimeout(() => {
    mount(heroStage, false);
    intro.remove();
  }, 800);
}

if (showIntro) {
  document.documentElement.classList.add('intro-lock');
  intro.hidden = false;
  mount(introStage, true);
  // 1) 英文がフェードイン → 2) 自然に消える → 3) ライオンと VIEW ALL が現れる
  requestAnimationFrame(() => intro.classList.add('phase-copy'));
  setTimeout(() => intro.classList.add('phase-copy-out'), 3600);
  setTimeout(() => intro.classList.add('phase-view'), 4800);
  document.getElementById('introView').addEventListener('click', finishIntro);
  document.getElementById('introSkip').addEventListener('click', finishIntro);
} else {
  if (intro) intro.remove();
  mount(heroStage, false);
}

loadLion().catch(() => {});
