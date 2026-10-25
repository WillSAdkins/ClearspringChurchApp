/* Clearspring: 3D Bible models and a relief map of the Holy Land.

   Built with three.js (MIT licence). This is the source; the app serves the
   bundled, minified copy at static/vendor/bible3d.min.js. To rebuild:

     npm install three@0.186.1 esbuild
     npx esbuild tools/bible3d/bible3d.src.js --bundle --minify --format=esm \
       --outfile=static/vendor/bible3d.min.js

   Models are built to the measurements the Bible gives, 1 unit = 1 cubit
   (about 45 cm). Where the text doesn't give a size, the info panel says so. */
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";


function start(root) {
  const kind = root.dataset.model;
  const stage = root.querySelector(".b3d-stage");
  const labelsEl = root.querySelector(".b3d-labels");
  const info = root.querySelector(".b3d-info");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const dark = () => document.documentElement.getAttribute("data-theme") === "dark" ||
    (document.documentElement.getAttribute("data-theme") !== "light" && matchMedia("(prefers-color-scheme: dark)").matches);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  } catch (e) {
    root.classList.add("b3d-nogl");
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // Film-like tone mapping, soft shadows and reflections: metals look like metal.
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  stage.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const sky = dark() ? 0x0c2226 : 0xdcebe7;
  scene.background = new THREE.Color(sky);
  scene.fog = new THREE.Fog(sky, 400, 1400);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.05, 5000);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;
  scene.add(new THREE.HemisphereLight(0xfff8ee, dark() ? 0x1d2a2c : 0x8a7a60, 0.9));
  const sun = new THREE.DirectionalLight(0xfff0d6, 2.4);
  scene.add(sun); scene.add(sun.target);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.autoRotate = !reduce;
  controls.autoRotateSpeed = 0.6;

  const labels = [];
  const build = MODELS[kind] || MODELS.tabernacle;
  const model = build({ scene, labels, root });
  // Sun and shadows sized to the model.
  const size = model.size || Math.max(8, (model.maxDist || 100) * 0.45);
  sun.position.copy(model.target).add(new THREE.Vector3(-0.55, 1, 0.65).multiplyScalar(size * 1.4));
  sun.target.position.copy(model.target);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -size, right: size, top: size, bottom: -size, near: size * 0.1, far: size * 5 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = size * 0.0015;
  sun.shadow.camera.updateProjectionMatrix();
  scene.traverse((o) => { if (o.isMesh) { o.castShadow = !o.userData.noShadow; o.receiveShadow = true; } });
  camera.position.copy(model.camera);
  controls.target.copy(model.target);
  controls.minDistance = model.minDist || 5;
  controls.maxDistance = model.maxDist || 600;
  controls.update();

  // Labels: HTML so they stay sharp and can be tapped.
  labels.forEach((l, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "b3d-label" + (l.minor ? " b3d-minor" : "");
    b.textContent = l.text;
    b.addEventListener("click", () => showInfo(l));
    labelsEl.appendChild(b);
    l.el = b;
  });
  function showInfo(l) {
    controls.autoRotate = false;
    info.hidden = false;
    info.querySelector(".b3d-info-t").textContent = l.text;
    info.querySelector(".b3d-info-p").textContent = l.detail || "";
    const a = info.querySelector(".b3d-info-a");
    if (l.href) { a.hidden = false; a.href = l.href; a.textContent = l.hrefText || "Read it"; } else a.hidden = true;
  }
  info.querySelector(".b3d-info-x").addEventListener("click", () => { info.hidden = true; });

  const v = new THREE.Vector3();
  function placeLabels() {
    const w = stage.clientWidth, h = stage.clientHeight;
    const dist = camera.position.distanceTo(controls.target);
    labels.forEach((l) => {
      v.copy(l.pos).project(camera);
      const hidden = v.z > 1 || v.x < -1.1 || v.x > 1.1 || v.y < -1.1 || v.y > 1.1 ||
        (l.minor && dist > (model.minorDist || 1e9)) || root.classList.contains("b3d-nolabels");
      l.el.style.display = hidden ? "none" : "";
      if (!hidden) l.el.style.transform = `translate(${((v.x + 1) / 2 * w).toFixed(1)}px, ${((1 - v.y) / 2 * h).toFixed(1)}px) translate(-50%, -100%)`;
    });
  }

  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(stage);
  resize();

  // Only draw while something is moving: easy on phone batteries.
  let running = false, idle = 0;
  function frame() {
    const changed = controls.update();
    renderer.render(scene, camera);
    placeLabels();
    idle = changed || controls.autoRotate ? 0 : idle + 1;
    if (idle > 30 || document.hidden) { running = false; return; }
    requestAnimationFrame(frame);
  }
  function wake() { if (!running) { running = true; idle = 0; requestAnimationFrame(frame); } }
  controls.addEventListener("start", () => { controls.autoRotate = false; wake(); });
  controls.addEventListener("change", wake);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) wake(); });
  window.addEventListener("resize", wake);
  wake();

  // Buttons under the view.
  document.querySelectorAll("[data-b3d]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const act = btn.dataset.b3d;
      if (act === "reset") { camera.position.copy(model.camera); controls.target.copy(model.target); }
      if (act === "labels") { root.classList.toggle("b3d-nolabels"); btn.setAttribute("aria-pressed", root.classList.contains("b3d-nolabels") ? "false" : "true"); }
      if (act === "inside" && model.toggleInside) { const on = model.toggleInside(); btn.setAttribute("aria-pressed", on ? "true" : "false"); }
      if (act === "spin") { controls.autoRotate = !controls.autoRotate; }
      wake();
    });
  });
}

// ------------------------------------------------------------ helpers

const C = {
  linen: 0xf2ede0, gold: 0xe0b44c, bronze: 0xb07040, acacia: 0x8a5a33, hair: 0x4a423c, ram: 0x8d3b2b,
  blue: 0x2d4f8c, sand: 0xd9c9a3, stone: 0xd8cfbd, cedar: 0x9a6a3f, pitch: 0x3b2a1e, ground: 0xcdbb92,
};

// Textures drawn in code (no image files): sand, stone blocks, wood grain, linen, plaster.
const TEX = {};
function noiseCanvas(size, draw) {
  const c = document.createElement("canvas"); c.width = c.height = size;
  const g = c.getContext("2d"); draw(g, size);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
function rnd(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
function speckle(g, n, r, cols, R) { for (let i = 0; i < n; i++) { g.fillStyle = cols[i % cols.length]; g.globalAlpha = 0.08 + R() * 0.18; g.beginPath(); g.arc(R() * 512, R() * 512, r * (0.4 + R()), 0, 7); g.fill(); } g.globalAlpha = 1; }
function texture(kind) {
  if (TEX[kind]) return TEX[kind];
  const R = rnd(kind.length * 977 + 13);
  const t = noiseCanvas(512, (g, S) => {
    if (kind === "sand") { g.fillStyle = "#cdb98f"; g.fillRect(0, 0, S, S); speckle(g, 5000, 2.2, ["#e6d4ab", "#a8936a", "#bba57a", "#f0e2bf"], R); }
    else if (kind === "grass") { g.fillStyle = "#8d9a5c"; g.fillRect(0, 0, S, S); speckle(g, 6000, 2.5, ["#a7b06a", "#6f7d44", "#b9a96d", "#7d8a4c"], R); }
    else if (kind === "stone") {
      g.fillStyle = "#d3c8b2"; g.fillRect(0, 0, S, S); speckle(g, 2500, 3, ["#e4dac6", "#b9ad95", "#c9bea7"], R);
      g.strokeStyle = "rgba(90,78,60,.45)"; g.lineWidth = 3;
      for (let row = 0; row < 8; row++) { const y = row * 64; g.beginPath(); g.moveTo(0, y); g.lineTo(S, y); g.stroke(); for (let x = (row % 2) * 64; x < S; x += 128) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 64); g.stroke(); } }
    }
    else if (kind === "rock") { g.fillStyle = "#bdb19a"; g.fillRect(0, 0, S, S); speckle(g, 3500, 5, ["#d4c9b3", "#9d917a", "#aa9e86", "#cfc2a8"], R); }
    else if (kind === "wood") {
      g.fillStyle = "#8a5a33"; g.fillRect(0, 0, S, S);
      for (let i = 0; i < 140; i++) { g.strokeStyle = R() > 0.5 ? "rgba(60,35,18,.35)" : "rgba(170,120,75,.25)"; g.lineWidth = 1 + R() * 3; const y = R() * S; g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= S; x += 32) g.lineTo(x, y + Math.sin(x / 60 + i) * 4); g.stroke(); }
      g.strokeStyle = "rgba(40,22,10,.5)"; g.lineWidth = 2; for (let y = 0; y < S; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(S, y); g.stroke(); }
    }
    else if (kind === "linen") {
      g.fillStyle = "#efe8d8"; g.fillRect(0, 0, S, S);
      for (let i = 0; i < S; i += 4) { g.fillStyle = `rgba(150,135,105,${0.06 + R() * 0.08})`; g.fillRect(i, 0, 1, S); g.fillRect(0, i, S, 1); }
    }
    else if (kind === "plaster") { g.fillStyle = "#e4dac8"; g.fillRect(0, 0, S, S); speckle(g, 2000, 6, ["#efe6d6", "#d2c6b1"], R); }
    else if (kind === "clay") { g.fillStyle = "#3d3d40"; g.fillRect(0, 0, S, S); for (let i = 0; i < 90; i++) { g.fillStyle = R() > 0.45 ? "#a8643f" : "#57575c"; g.globalAlpha = 0.7; g.beginPath(); g.ellipse(R() * S, R() * S, 10 + R() * 40, 6 + R() * 22, R() * 3, 0, 7); g.fill(); } g.globalAlpha = 1; }
    else if (kind === "water") { g.fillStyle = "#3f7f96"; g.fillRect(0, 0, S, S); for (let i = 0; i < 400; i++) { g.strokeStyle = `rgba(200,235,240,${0.05 + R() * 0.15})`; g.lineWidth = 1.5; const x = R() * S, y = R() * S, w = 10 + R() * 30; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + w / 2, y - 3, x + w, y); g.stroke(); } }
  });
  TEX[kind] = t; return t;
}
const mat = (color, opts = {}) => {
  const m = new THREE.MeshStandardMaterial({ color, roughness: opts.rough ?? 0.75, metalness: opts.metal ?? 0, transparent: opts.opacity != null, opacity: opts.opacity ?? 1, side: opts.side ?? THREE.FrontSide });
  if (opts.tex) { const t = texture(opts.tex).clone(); t.needsUpdate = true; t.repeat.set(opts.rep || 1, opts.rep2 || opts.rep || 1); m.map = t; }
  return m;
};
const GOLD = mat(C.gold, { rough: 0.22, metal: 1 });
const BRONZE = mat(C.bronze, { rough: 0.35, metal: 0.9 });
const SILVER = mat(0xd8dde2, { rough: 0.2, metal: 1 });
const IRON = mat(0x55575c, { rough: 0.45, metal: 0.85 });
const WOOD = (rep = 1) => mat(0xffffff, { tex: "wood", rough: 0.8, rep });

// Boxes have softly rounded edges; nothing in the ancient world was perfectly sharp.
function box(scene, w, h, d, x, y, z, m) {
  const r = Math.min(w, h, d) * 0.12, geo = r > 0.004 ? new RoundedBoxGeometry(w, h, d, 3, Math.min(r, 0.6)) : new THREE.BoxGeometry(w, h, d);
  const mesh = new THREE.Mesh(geo, m);
  mesh.position.set(x, y + h / 2, z);
  scene.add(mesh);
  return mesh;
}
function cyl(scene, r, h, x, y, z, m, seg = 32) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, Math.max(seg, 16)), m);
  mesh.position.set(x, y + h / 2, z);
  scene.add(mesh);
  return mesh;
}
// A turned shape (pillar, vessel, lamp) from a list of [radius, height] points.
function lathe(scene, pts, x, y, z, m, seg = 40) {
  const mesh = new THREE.Mesh(new THREE.LatheGeometry(pts.map(([r, h]) => new THREE.Vector2(r, h)), seg), m);
  mesh.position.set(x, y, z); scene.add(mesh); return mesh;
}
function ground(scene, size, color = C.ground, grid = true, tex) {
  const KIND = { [C.stone]: "stone", 0x9fae74: "grass", 0xb8ad7c: "grass", 0xb8a888: "plaster", 0xe9e2d0: "linen" };
  const kind = tex || KIND[color] || "sand";
  const g = new THREE.Mesh(new THREE.CircleGeometry(size, 96), mat(0xffffff, { tex: kind, rough: 1, rep: Math.max(1, size / (kind === "stone" ? 6 : 12)) }));
  g.rotation.x = -Math.PI / 2; g.userData.noShadow = true;
  scene.add(g);
  if (grid) {
    const gh = new THREE.GridHelper(size * 1.6, Math.round(size * 1.6 / 10), 0x000000, 0x000000);
    gh.material.opacity = 0.05; gh.material.transparent = true; gh.position.y = 0.02;
    scene.add(gh);
  }
}

// People: a robe turned on a lathe (hem, waist, shoulders), sleeves and hands,
// a belt, a head and a headcloth falling to the shoulders. h = height in cubits.
const SKIN = [0xc68a5e, 0xa8714a, 0x8d5a3b, 0xd29c74];
function figure(scene, x, z, o = {}) {
  const h = o.h || 4, k = h / 4, g = new THREE.Group();
  const robeM = mat(o.robe ?? 0x8b6f4e, { rough: 0.95, tex: "linen", rep: 2 });
  robeM.color.multiplyScalar(1);
  const skinM = mat(SKIN[o.skin ?? 0], { rough: 0.7 });
  const sit = o.sit ? 0.62 : 1;
  const prof = [[0, 0], [0.66, 0], [0.7, 0.08], [0.6, 0.6], [0.5, 1.3], [0.4, 1.85], [0.44, 2.2], [0.5, 2.55], [0.46, 2.75], [0.26, 2.88], [0.14, 2.95], [0, 2.95]];
  const body = new THREE.Mesh(new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r * k, y * k * sit)), 28), robeM); g.add(body);
  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.43 * k, 0.05 * k, 8, 28), mat(o.belt ?? 0x6b4a2b)); belt.rotation.x = Math.PI / 2; belt.position.y = 1.9 * k * sit; g.add(belt);
  const top = 2.95 * k * sit;
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.13 * k, 0.15 * k, 0.25 * k, 12), skinM); neck.position.y = top + 0.08 * k; g.add(neck);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.3 * k, 20, 16), skinM); head.scale.set(0.92, 1.1, 0.95); head.position.y = top + 0.45 * k; g.add(head);
  if (o.beard) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.22 * k, 14, 10, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.55), mat(0x3a2a20, { rough: 1 })); b.position.set(0.1 * k, top + 0.33 * k, 0); b.scale.set(0.9, 1.1, 1); g.add(b); }
  if (o.cloth !== false) {
    const cm = mat(o.cloth ?? 0xe8e0cc, { rough: 1, tex: "linen", rep: 1, side: THREE.DoubleSide });
    const cp = [[0.0, 0.42], [0.25, 0.38], [0.33, 0.2], [0.34, 0], [0.36, -0.25], [0.42, -0.5]].map(([r, y]) => new THREE.Vector2(r * k, y * k));
    const cloth = new THREE.Mesh(new THREE.LatheGeometry(cp, 24, -Math.PI * 0.8, Math.PI * 1.6), cm); cloth.position.y = top + 0.45 * k; cloth.rotation.y = Math.PI; g.add(cloth);
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.31 * k, 0.035 * k, 6, 24), mat(o.band ?? 0x3d2c22)); band.rotation.x = Math.PI / 2; band.position.y = top + 0.62 * k; g.add(band);
  }
  // Arms: sleeves hang by the sides (or reach forward, o.reach).
  [-1, 1].forEach((sd) => {
    const arm = new THREE.Group();
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * k, 0.2 * k, 1.25 * k, 14), robeM); sleeve.position.y = -0.62 * k; arm.add(sleeve);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.1 * k, 12, 10), skinM); hand.position.y = -1.32 * k; arm.add(hand);
    arm.position.set(0, top - 0.25 * k, sd * 0.48 * k);
    arm.rotation.x = sd * 0.12; if (o.reach) arm.rotation.z = 0.9; if (o.raise && sd === 1) arm.rotation.x = Math.PI * 0.85;
    g.add(arm);
  });
  g.position.set(x, o.y || 0, z); g.rotation.y = o.face || 0; scene.add(g);
  return g;
}
// A person, 4 cubits (about 1.8 m) tall, for scale.
function person(scene, labels, x, z) {
  figure(scene, x, z, { robe: 0x2f6f68, cloth: 0xe9e1cf, skin: 1, face: -Math.PI * 0.75 });
  labels.push({ pos: new THREE.Vector3(x, 4.6, z), text: "A person, for scale", minor: true,
    detail: "About 4 cubits (1.8 m) tall. A cubit was the length from elbow to fingertip, roughly 45 cm." });
}
// Lying on one elbow at a meal.
function recliner(scene, x, z, rot, robe, skin = 0) {
  const g = new THREE.Group(), rm = mat(robe, { rough: 0.95, tex: "linen", rep: 2 }), sm = mat(SKIN[skin], { rough: 0.7 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.45, 2.2, 8, 16), rm); body.rotation.z = Math.PI / 2 - 0.12; body.position.set(0.2, 0.62, 0); g.add(body);
  const chest = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.6, 8, 16), rm); chest.rotation.z = 0.9; chest.position.set(-1.25, 1.05, 0); g.add(chest);
  const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.7, 6, 10), rm); arm.position.set(-1.35, 0.55, -0.35); g.add(arm);
  const hd = new THREE.Mesh(new THREE.SphereGeometry(0.3, 18, 14), sm); hd.position.set(-1.7, 1.6, 0); g.add(hd);
  const cl = new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), mat(0xe8e0cc, { rough: 1 })); cl.position.set(-1.7, 1.66, 0); g.add(cl);
  g.position.set(x, 0, z); g.rotation.y = rot; scene.add(g); return g;
}
// Animals: rounded body, neck, tapering legs, tail.
function beast(scene, x, z, o = {}) {
  const s = o.s || 1, m = mat(o.color ?? 0x7a5c44, { rough: o.metal ? 0.3 : 0.9, metal: o.metal ? 1 : 0 }), g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.55 * s, 1.4 * s, 10, 18), m); body.rotation.z = Math.PI / 2; body.position.y = 1.4 * s; g.add(body);
  if (o.wool) body.scale.set(1.2, 1.15, 1.25);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.26 * s, 0.38 * s, 0.9 * s, 14), m); neck.position.set(1.05 * s, 1.85 * s, 0); neck.rotation.z = -0.8; g.add(neck);
  const head = new THREE.Mesh(new THREE.CapsuleGeometry(0.24 * s, 0.45 * s, 8, 14), m); head.rotation.z = Math.PI / 2 + 0.35; head.position.set(1.55 * s, 2.15 * s, 0); g.add(head);
  [[-0.65, -0.3], [-0.65, 0.3], [0.6, -0.3], [0.6, 0.3]].forEach(([a, b]) => { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.15 * s, 0.08 * s, 1.05 * s, 10), m); l.position.set(a * s, 0.53 * s, b * s); g.add(l); });
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.04 * s, 0.06 * s, 0.9 * s, 8), m); tail.position.set(-1.25 * s, 1.15 * s, 0); tail.rotation.z = -0.35; g.add(tail);
  if (o.ears) [-0.12, 0.12].forEach((b) => { const e = new THREE.Mesh(new THREE.ConeGeometry(0.07 * s, 0.6 * s, 8), m); e.position.set(1.45 * s, 2.65 * s, b * s); e.rotation.z = 0.25; g.add(e); });
  if (o.horns) [-0.28, 0.28].forEach((b) => { const e = new THREE.Mesh(new THREE.TorusGeometry(0.22 * s, 0.05 * s, 6, 12, Math.PI * 0.7), mat(0xe9dfc8)); e.position.set(1.45 * s, 2.45 * s, b * s); e.rotation.set(0, b > 0 ? 0 : Math.PI, 0.6); g.add(e); });
  if (o.mane) { const mn = new THREE.Mesh(new THREE.SphereGeometry(0.58 * s, 20, 14), o.metal ? m : mat(o.mane, { rough: 1 })); mn.scale.set(0.8, 1, 1.05); mn.position.set(1.2 * s, 1.95 * s, 0); g.add(mn);
    const tuft = new THREE.Mesh(new THREE.SphereGeometry(0.1 * s, 8, 6), m); tuft.position.set(-1.6 * s, 0.75 * s, 0); g.add(tuft); }
  g.position.set(x, o.y || 0, z); g.rotation.y = o.face || 0; scene.add(g); return g;
}
function flame(scene, x, y, z, s = 1) {
  const f = new THREE.Mesh(new THREE.SphereGeometry(0.09 * s, 12, 10), new THREE.MeshBasicMaterial({ color: 0xffc04a }));
  f.scale.y = 2.1; f.position.set(x, y + 0.17 * s, z); f.userData.noShadow = true; scene.add(f);
  const glow = new THREE.PointLight(0xffa040, 0.6 * s, 4 * s, 2); glow.position.set(x, y + 0.4 * s, z); scene.add(glow);
  return f;
}
function rock(scene, r, x, y, z, color = 0xb9ad96, sx = 1, sy = 1, sz = 1) {
  // Roughen the surface by position (not by vertex), so shared corners move together and it stays solid.
  const geo = new THREE.IcosahedronGeometry(r, 4), p = geo.attributes.position, ph = x * 1.7 + z * 2.3;
  for (let i = 0; i < p.count; i++) {
    const px = p.getX(i) / r, py = p.getY(i) / r, pz = p.getZ(i) / r;
    const f = 1 + 0.08 * Math.sin(px * 5.1 + ph) * Math.cos(py * 4.3 - ph) + 0.05 * Math.sin(pz * 9.7 + px * 3.1);
    p.setXYZ(i, p.getX(i) * f, p.getY(i) * f, p.getZ(i) * f);
  }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, mat(color, { rough: 1, tex: "rock", rep: 1 })); m.scale.set(sx, sy, sz); m.position.set(x, y, z); scene.add(m); return m;
}
function hill(scene, r, x, z, h, color = 0x9aa36b) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 48, 20, 0, Math.PI * 2, 0, Math.PI / 2), mat(color, { rough: 1, tex: "grass", rep: 4 })); m.scale.y = h / r; m.position.set(x, 0, z); scene.add(m); return m;
}
function tree(scene, x, z, h = 8) {
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.45, h * 0.55, 10), mat(0x6b5136, { rough: 1 })); trunk.position.set(x, h * 0.275, z); trunk.rotation.z = 0.08; scene.add(trunk);
  const leaf = mat(0x6f8a4f, { rough: 1 });
  [[0, 0.75, 0, 0.3], [0.25, 0.68, 0.15, 0.22], [-0.2, 0.7, -0.15, 0.24], [0.05, 0.86, -0.1, 0.2]].forEach(([dx, dy, dz, r]) => { const c = new THREE.Mesh(new THREE.IcosahedronGeometry(h * r, 2), leaf); c.scale.y = 0.7; c.position.set(x + dx * h, h * dy, z + dz * h); scene.add(c); });
}
function horn(scene, x, y, z, s, m) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.12 * s, 0.32 * s, 16), m); c.position.set(x, y + 0.16 * s, z); scene.add(c); }
/* A great statue of a man, built to height h with a material for each part:
   head, chest and arms, belly and thighs, legs, feet. */
function colossus(scene, x, z, h, M, face = 0) {
  const g = new THREE.Group(), u = h / 12;
  const add = (geo, m, px, py, pz, rx = 0, rz = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(px, py, pz); o.rotation.x = rx; o.rotation.z = rz; g.add(o); return o; };
  const tube = (r1, r2, len, m, px, py, pz, rz = 0) => add(new THREE.CylinderGeometry(r1, r2, len, 28), m, px, py, pz, 0, rz);
  // Feet and toes.
  [-1, 1].forEach((sd) => {
    add(new RoundedBoxGeometry(1.5 * u, 0.5 * u, 0.75 * u, 3, 0.2 * u), M.feet, 0.35 * u, 0.25 * u, sd * 0.6 * u);
    for (let t = -2; t <= 2; t++) add(new THREE.SphereGeometry(0.12 * u, 10, 8), M.feet, 1.1 * u, 0.12 * u, sd * 0.6 * u + t * 0.14 * u);
    // Shins (iron) and knees, thighs (bronze).
    tube(0.5 * u, 0.32 * u, 3.0 * u, M.legs, 0, 2.0 * u, sd * 0.62 * u);
    add(new THREE.SphereGeometry(0.52 * u, 20, 16), M.legs, 0, 3.55 * u, sd * 0.62 * u);
    tube(0.78 * u, 0.55 * u, 2.6 * u, M.thighs, 0, 4.9 * u, sd * 0.6 * u);
  });
  // Hips and belly (bronze), chest (silver): one turned shape each.
  const prof = (pts) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r * u, y * u)), 40);
  const hips = add(prof([[0, 0], [1.25, 0.05], [1.4, 0.6], [1.3, 1.3], [1.15, 1.9], [0, 1.95]]), M.thighs, 0, 6.0 * u, 0); hips.scale.z = 0.78;
  // A short kilt, flaring from the waist over the thighs.
  const kilt = add(new THREE.LatheGeometry([[1.75, 0], [1.7, 0.15], [1.45, 1.2], [1.2, 2.3], [1.16, 2.5]].map(([r, y]) => new THREE.Vector2(r * u, y * u)), 40), M.thighs, 0, 5.4 * u, 0); kilt.scale.z = 0.8; kilt.material = M.thighs;
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; const pl = add(new THREE.BoxGeometry(0.06 * u, 1.9 * u, 0.12 * u), M.thighs, Math.cos(a) * 1.55 * u, 6.4 * u, Math.sin(a) * 1.55 * u * 0.8); pl.rotation.y = -a; pl.rotation.z = Math.cos(a) * 0.12; }
  const chest = add(prof([[0, 0], [1.15, 0], [1.35, 0.6], [1.55, 1.4], [1.7, 2.0], [1.45, 2.35], [0.5, 2.55], [0, 2.6]]), M.chest, 0, 7.9 * u, 0); chest.scale.z = 0.7;
  const belt = add(new THREE.TorusGeometry(1.08 * u, 0.1 * u, 10, 40), M.thighs, 0, 7.9 * u, 0, Math.PI / 2); belt.scale.y = 0.75;
  // Arms (silver).
  [-1, 1].forEach((sd) => {
    add(new THREE.SphereGeometry(0.62 * u, 20, 16), M.chest, 0, 9.95 * u, sd * 1.6 * u);
    tube(0.48 * u, 0.38 * u, 2.0 * u, M.chest, 0.05 * u, 8.9 * u, sd * 1.72 * u);
    tube(0.38 * u, 0.28 * u, 1.9 * u, M.chest, 0.35 * u, 7.1 * u, sd * 1.76 * u, 0.25);
    add(new THREE.SphereGeometry(0.33 * u, 16, 12), M.chest, 0.6 * u, 6.0 * u, sd * 1.76 * u);
  });
  // Neck and head (gold), with a beard and a crown.
  tube(0.42 * u, 0.5 * u, 0.5 * u, M.head, 0, 10.65 * u, 0);
  const head = add(new THREE.SphereGeometry(0.8 * u, 32, 24), M.head, 0, 11.35 * u, 0); head.scale.set(0.95, 1.12, 0.88);
  const beard = add(prof([[0, -0.7], [0.45, -0.5], [0.6, -0.15], [0.62, 0.15], [0, 0.2]]), M.head, 0.25 * u, 11.0 * u, 0); beard.scale.z = 0.8;
  add(new THREE.SphereGeometry(0.16 * u, 12, 10), M.head, 0.66 * u, 11.35 * u, 0);
  const crown = add(new THREE.CylinderGeometry(0.62 * u, 0.7 * u, 0.45 * u, 32, 1, true), M.head, 0, 12.05 * u, 0); crown.material = M.head;
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; add(new THREE.ConeGeometry(0.1 * u, 0.35 * u, 8), M.head, Math.cos(a) * 0.62 * u, 12.42 * u, Math.sin(a) * 0.62 * u); }
  g.position.set(x, 0, z); g.rotation.y = face; scene.add(g); return g;
}
function water(scene, size, y = 0) { const w = new THREE.Mesh(new THREE.CircleGeometry(size, 96), mat(0xffffff, { tex: "water", rough: 0.12, metal: 0.1, rep: size / 10 })); w.rotation.x = -Math.PI / 2; w.position.y = y; w.userData.noShadow = true; scene.add(w); return w; }
const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
const ref = (r) => "/bible/search?q=" + encodeURIComponent(r);

// ------------------------------------------------------------ the models

const MODELS = {
  tabernacle({ scene, labels }) {
    ground(scene, 160, C.sand);
    // Courtyard: 100 x 50 cubits, linen hangings 5 cubits high on posts (Exodus 27:9-18).
    const L = 50, W = 25, H = 5;
    const linen = mat(0xffffff, { side: THREE.DoubleSide, tex: "linen", rep: 6, rep2: 1 });
    const wall = (len, x, z, rot) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(len, H), linen); p.position.set(x, H / 2, z); p.rotation.y = rot; scene.add(p); };
    wall(100, 0, -W, 0); wall(100, 0, W, 0); wall(50, -L, 0, Math.PI / 2);
    wall(15, L, -17.5, Math.PI / 2); wall(15, L, 17.5, Math.PI / 2);
    const gate = new THREE.Mesh(new THREE.PlaneGeometry(20, H), mat(C.blue, { side: THREE.DoubleSide }));
    gate.position.set(L, H / 2, 0); gate.rotation.y = Math.PI / 2; scene.add(gate);
    for (let x = -L; x <= L; x += 5) { cyl(scene, 0.25, H, x, 0, -W, BRONZE, 8); cyl(scene, 0.25, H, x, 0, W, BRONZE, 8); }
    for (let z = -W; z <= W; z += 5) { cyl(scene, 0.25, H, -L, 0, z, BRONZE, 8); cyl(scene, 0.25, H, L, 0, z, BRONZE, 8); }
    // Silver hooks and bands on every post (Exodus 27:10).
    for (let x = -L; x <= L; x += 5) [-W, W].forEach((z) => cyl(scene, 0.3, 0.25, x, H - 0.3, z, SILVER, 12));
    for (let z = -W; z <= W; z += 5) [-L, L].forEach((x) => cyl(scene, 0.3, 0.25, x, H - 0.3, z, SILVER, 12));
    // Bronze altar 5 x 5 x 3 (Exodus 27:1) and the laver (Exodus 30:18; no size given).
    box(scene, 5, 3, 5, 25, 0, 0, BRONZE);
    cyl(scene, 1.6, 1.4, 8, 0, 0, BRONZE);
    // The tent: 30 long, 10 wide, 10 high (Exodus 26: 20 boards of 1.5 cubits each side, 10 high).
    const tent = new THREE.Group(); scene.add(tent);
    const boards = mat(C.gold, { rough: 0.4, metal: 0.55 });
    const tx0 = -40, tx1 = -10;
    [[-5], [5]].forEach(([z]) => { const b = new THREE.Mesh(new THREE.BoxGeometry(30, 10, 0.4), boards); b.position.set(-25, 5, z); tent.add(b); });
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.4, 10, 10), boards); back.position.set(tx0, 5, 0); tent.add(back);
    // Coverings: linen, goat hair, rams' skins dyed red, and a durable outer layer (Exodus 26:1-14).
    const cover = new THREE.Mesh(new RoundedBoxGeometry(31, 0.6, 12, 2, 0.25), mat(C.hair, { tex: "linen", rep: 4, rough: 1 })); cover.position.set(-25.5, 10.3, 0); tent.add(cover);
    const sideL = new THREE.Mesh(new THREE.BoxGeometry(31, 10, 0.3), mat(C.ram, { tex: "linen", rep: 4, rough: 1 })); sideL.position.set(-25.5, 5.2, -6.05);
    const sideR = sideL.clone(); sideR.position.z = 6.05;
    const backC = new THREE.Mesh(new THREE.BoxGeometry(0.3, 10, 12), mat(C.ram, { tex: "linen", rep: 2, rough: 1 })); backC.position.set(tx0 - 1, 5.2, 0);
    const roof = new THREE.Group(); roof.add(cover, sideL, sideR, backC); scene.add(roof);
    // Entrance screen and the veil before the Most Holy Place.
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), mat(C.blue, { side: THREE.DoubleSide, opacity: 0.9 }));
    screen.position.set(tx1, 5, 0); screen.rotation.y = Math.PI / 2; scene.add(screen);
    const veil = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), mat(0x5b2c6f, { side: THREE.DoubleSide }));
    veil.position.set(-30, 5, 0); veil.rotation.y = Math.PI / 2; scene.add(veil);
    // Furniture.
    box(scene, 2.5, 1.5, 1.5, -35, 0, 0, GOLD);                    // ark
    box(scene, 2, 1.5, 1, -20, 0, -3, GOLD);                        // table
    cyl(scene, 0.08, 2.4, -20, 0, 3, GOLD, 12);                      // lampstand
    lathe(scene, [[0, 0], [0.45, 0], [0.4, 0.1], [0.15, 0.3], [0.08, 0.4]], -20, 0, 3, GOLD);
    for (let i = -3; i <= 3; i++) { cyl(scene, 0.04, 0.3, -20, 2.3 - Math.abs(i) * 0.06, 3 + i * 0.28, GOLD, 8); flame(scene, -20, 2.62, 3 + i * 0.28, 0.6); }
    box(scene, 1, 2, 1, -28, 0, 0, GOLD);                            // incense altar
    labels.push(
      { pos: v3(50, 7, 0), text: "Gate", detail: "The one way in: a 20-cubit screen of blue, purple and scarlet yarn and fine linen, facing east.", href: ref("Exodus 27:16"), hrefText: "Exodus 27:16" },
      { pos: v3(25, 5, 0), text: "Bronze altar", detail: "5 cubits square and 3 high, for burnt offerings. Everyone passed it first.", href: ref("Exodus 27:1"), hrefText: "Exodus 27:1–8" },
      { pos: v3(8, 3.5, 0), text: "Laver", detail: "A bronze basin where the priests washed. The Bible gives no size; this one is a guess.", href: ref("Exodus 30:18"), hrefText: "Exodus 30:17–21" },
      { pos: v3(-20, 12.5, 0), text: "Holy Place", detail: "20 cubits long. The lampstand, the table for the bread of the Presence and the altar of incense stood here.", href: ref("Exodus 26:33"), hrefText: "Exodus 26:33–35" },
      { pos: v3(-35, 12.5, 0), text: "Most Holy Place", detail: "A 10-cubit cube behind the veil, holding the ark of the covenant. The high priest went in once a year.", href: ref("Leviticus 16:2"), hrefText: "Leviticus 16" },
      { pos: v3(-35, 2.5, 0), text: "Ark of the covenant", minor: true, detail: "2.5 × 1.5 × 1.5 cubits, overlaid with gold.", href: "/bible/3d/ark-of-the-covenant", hrefText: "See it in 3D" },
      { pos: v3(-20, 3.4, 3), text: "Lampstand", minor: true, detail: "Hammered from one piece of pure gold, with seven lamps.", href: ref("Exodus 25:31"), hrefText: "Exodus 25:31–40" },
      { pos: v3(-20, 2.2, -3), text: "Table", minor: true, detail: "2 × 1 × 1.5 cubits, for the twelve loaves of the bread of the Presence.", href: ref("Exodus 25:23"), hrefText: "Exodus 25:23–30" },
      { pos: v3(-28, 2.7, 0), text: "Altar of incense", minor: true, detail: "1 cubit square and 2 high, just in front of the veil.", href: ref("Exodus 30:1"), hrefText: "Exodus 30:1–10" },
    );
    person(scene, labels, 40, 10);
    let inside = false;
    return { camera: v3(95, 70, 95), target: v3(-5, 2, 0), maxDist: 320, minorDist: 90,
      toggleInside: () => { inside = !inside; roof.visible = !inside; screen.material.opacity = inside ? 0.25 : 0.9; return inside; } };
  },

  temple({ scene, labels }) {
    ground(scene, 180, C.stone);
    const stone = mat(0xf0e6d2, { rough: 0.9, tex: "stone", rep: 14 });
    const cedar = WOOD(6);
    // The house: 60 long, 20 wide, 30 high (1 Kings 6:2). Most Holy Place a 20-cubit cube (6:20).
    const house = new THREE.Group(); scene.add(house);
    const add = (g, w, h, d, x, y, z, m) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y + h / 2, z); g.add(b); return b; };
    add(house, 60, 30, 0.8, -10, 0, -10.4, stone); add(house, 60, 30, 0.8, -10, 0, 10.4, stone);
    add(house, 0.8, 30, 21.6, -40.4, 0, 0, stone);
    const roof = add(house, 61.6, 1, 21.6, -10, 30, 0, cedar);
    // Side rooms in three storeys, 5, 6 and 7 cubits wide (6:5-10).
    const side = new THREE.Group(); scene.add(side);
    [[0, 5], [5, 6], [10, 7]].forEach(([y, w]) => {
      add(side, 60, 5, w, -10, y, -(10.8 + w / 2), stone); add(side, 60, 5, w, -10, y, 10.8 + w / 2, stone); add(side, w, 5, 21.6 + 2 * w, -40.8 - w / 2, y, 0, stone);
    });
    // Porch: 20 wide, 10 deep (6:3). Its height isn't clear in the text.
    add(house, 10, 30, 0.8, 25, 0, -10.4, stone); add(house, 10, 30, 0.8, 25, 0, 10.4, stone); add(house, 10.8, 1, 21.6, 25, 30, 0, cedar);
    // Inside: the inner sanctuary's gold and the cherubim (6:23-28).
    const inner = new THREE.Group(); scene.add(inner);
    add(inner, 0.4, 20, 20, -20, 0, 0, GOLD);
    add(inner, 3, 8, 3, -32, 0, -4, GOLD); add(inner, 3, 8, 3, -32, 0, 4, GOLD);
    add(inner, 1, 0.4, 20, -32, 8, 0, GOLD);
    add(inner, 2.5, 1.5, 1.5, -30, 0, 0, GOLD);
    // Jachin and Boaz: 18 cubits high, 12 round, with 5-cubit capitals (7:15-22).
    [[-6, "Boaz"], [6, "Jachin"]].forEach(([z]) => {
      lathe(scene, [[0, 0], [2.4, 0], [2.4, 0.6], [1.95, 0.9], [1.9, 18], [2.1, 18.3], [2.6, 19.2], [2.7, 20.5], [2.3, 22], [1.4, 22.8], [0, 23]], 32, 0, z, BRONZE, 48);
      // Network and two rows of pomegranates round each capital (1 Kings 7:17-20).
      for (let row = 0; row < 2; row++) for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2 + row * 0.13; const pm = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), BRONZE); pm.position.set(32 + Math.cos(a) * 2.68, 19.6 + row * 0.6, z + Math.sin(a) * 2.68); scene.add(pm); }
      const net = new THREE.Mesh(new THREE.CylinderGeometry(2.66, 2.66, 1.3, 40, 4, true), new THREE.MeshStandardMaterial({ color: C.bronze, metalness: 0.9, roughness: 0.4, wireframe: true })); net.position.set(32, 21.1, z); scene.add(net);
    });
    // The Sea: 10 across, 5 high, on twelve oxen (7:23-26). Bronze altar 20 x 20 x 10 (2 Chronicles 4:1).
    const seaZ = 28, seaX = 40;
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; beast(scene, seaX + Math.cos(a) * 3.2, seaZ + Math.sin(a) * 3.2, { color: C.bronze, metal: true, horns: true, s: 1.3, face: -a }); }
    const sea = lathe(scene, [[0, 0], [3.2, 0.2], [4.4, 1.6], [4.9, 3.6], [5.15, 4.9], [5.4, 5.05], [5.0, 5.0], [4.7, 3.6], [0, 0.4]], seaX, 3.0, seaZ, mat(C.bronze, { rough: 0.35, metal: 0.9, side: THREE.DoubleSide }), 56);
    const water = new THREE.Mesh(new THREE.CircleGeometry(4.75, 48), mat(0xffffff, { tex: "water", rough: 0.1 })); water.rotation.x = -Math.PI / 2; water.position.set(seaX, 7.6, seaZ); scene.add(water);
    box(scene, 20, 10, 20, 62, 0, 0, BRONZE);
    for (let i = 0; i < 5; i++) { box(scene, 4, 3, 4, 0 - i * 10, 0, -30, BRONZE); box(scene, 4, 3, 4, 0 - i * 10, 0, 30, BRONZE); }
    labels.push(
      { pos: v3(-10, 33, 0), text: "The house", detail: "60 cubits long, 20 wide and 30 high, built of stone cut at the quarry and lined with cedar and gold. It took seven years.", href: ref("1 Kings 6:2"), hrefText: "1 Kings 6" },
      { pos: v3(-30, 22, 0), text: "Most Holy Place", detail: "A 20-cubit cube, overlaid with pure gold, where the ark stood beneath two olive-wood cherubim whose wings spanned the room.", href: ref("1 Kings 6:20"), hrefText: "1 Kings 6:19–28" },
      { pos: v3(32, 25, -6), text: "Boaz", detail: "One of two bronze pillars at the porch, 18 cubits high. Boaz probably means “in him is strength”.", href: ref("1 Kings 7:21"), hrefText: "1 Kings 7:15–22" },
      { pos: v3(32, 25, 6), text: "Jachin", detail: "The other pillar. Jachin probably means “he establishes”.", href: ref("1 Kings 7:21"), hrefText: "1 Kings 7:21" },
      { pos: v3(25, 33, 0), text: "Porch", minor: true, detail: "20 cubits wide and 10 deep. The text doesn't make its height clear, so it's shown level with the house.", href: ref("1 Kings 6:3"), hrefText: "1 Kings 6:3" },
      { pos: v3(seaX, 10, seaZ), text: "The Sea", detail: "A cast bronze basin 10 cubits across, standing on twelve bronze oxen facing outwards. The priests washed here.", href: ref("1 Kings 7:23"), hrefText: "1 Kings 7:23–26" },
      { pos: v3(62, 12, 0), text: "Bronze altar", detail: "20 cubits square and 10 high, for the sacrifices.", href: ref("2 Chronicles 4:1"), hrefText: "2 Chronicles 4:1" },
      { pos: v3(-10, 5, -30), text: "Ten basins on stands", minor: true, detail: "Five on each side of the house, on bronze carts.", href: ref("1 Kings 7:38"), hrefText: "1 Kings 7:27–39" },
      { pos: v3(-10, 17, 19), text: "Side rooms", minor: true, detail: "Three storeys around the house, 5, 6 and 7 cubits wide, the beams resting on ledges in the wall.", href: ref("1 Kings 6:5"), hrefText: "1 Kings 6:5–10" },
    );
    person(scene, labels, 50, 15);
    let inside = false;
    return { camera: v3(120, 80, 120), target: v3(0, 10, 0), maxDist: 380, minorDist: 110,
      toggleInside: () => { inside = !inside; roof.visible = !inside; side.visible = !inside; house.children.forEach((c, i) => { if (i === 1) c.visible = !inside; }); return inside; } };
  },

  ark({ scene, labels }) {
    water(scene, 600, 0.5); ground(scene, 320, C.sand, false, "grass");
    const wood = mat(0x8f6a4a, { rough: 0.9, tex: "wood", rep: 30, rep2: 3 });
    // 300 long, 50 wide, 30 high, three decks, a window a cubit below the roof, a door in the side (Genesis 6:15-16).
    const hull = new THREE.Mesh(new THREE.BoxGeometry(300, 30, 50), wood); hull.position.set(0, 15, 0); scene.add(hull);
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 300, 3, 1), wood); // ridge
    roof.scale.set(25, 1, 4); roof.rotation.z = Math.PI / 2; roof.position.set(0, 32, 0); scene.add(roof);
    const gap = new THREE.Mesh(new THREE.BoxGeometry(296, 1, 50.6), mat(0x1a1410)); gap.position.set(0, 29.3, 0); scene.add(gap);
    const door = new THREE.Mesh(new THREE.BoxGeometry(8, 12, 0.6), mat(0x6b4a2b)); door.position.set(60, 13, 25.2); scene.add(door);
    [10, 20].forEach((y) => { const deck = new THREE.Mesh(new THREE.BoxGeometry(300.4, 0.4, 50.4), mat(0x5a4330)); deck.position.set(0, y, 0); scene.add(deck); });
    labels.push(
      { pos: v3(0, 40, 0), text: "300 cubits long", detail: "About 135 m: longer than a football pitch, and 50 cubits (22 m) wide and 30 (13.5 m) high. Its shape is a box, made to float rather than sail.", href: ref("Genesis 6:15"), hrefText: "Genesis 6:15" },
      { pos: v3(-120, 31, 26), text: "Window", detail: "“Finish it to a cubit above”: most read this as an opening for light and air running just below the roof.", href: ref("Genesis 6:16"), hrefText: "Genesis 6:16" },
      { pos: v3(60, 21, 26), text: "Door", detail: "A door in the side. The Bible doesn't give its size.", href: ref("Genesis 7:16"), hrefText: "Genesis 7:16" },
      { pos: v3(-140, 15, 26), text: "Three decks", minor: true, detail: "“Lower, second and third decks.” Shown here as lines along the hull.", href: ref("Genesis 6:16"), hrefText: "Genesis 6:16" },
    );
    person(scene, labels, 40, 40);
    return { camera: v3(330, 170, 380), target: v3(0, 12, 0), maxDist: 800, minorDist: 330 };
  },

  "ark-of-the-covenant"({ scene, labels }) {
    ground(scene, 14, C.sand);
    // 2.5 x 1.5 x 1.5 cubits, overlaid with gold, carried on poles through four rings (Exodus 25:10-22).
    box(scene, 2.5, 1.5, 1.5, 0, 0.1, 0, GOLD);
    box(scene, 2.56, 0.12, 1.56, 0, 1.6, 0, GOLD);                   // mercy seat
    // The gold moulding round the top (Exodus 25:11).
    [[0, 0.78], [0, -0.78]].forEach(([x, z]) => { const r = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 2.5, 4, 8), GOLD); r.rotation.z = Math.PI / 2; r.position.set(x, 1.5, z); scene.add(r); });
    [[1.28, 0], [-1.28, 0]].forEach(([x, z]) => { const r = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 1.5, 4, 8), GOLD); r.rotation.x = Math.PI / 2; r.position.set(x, 1.5, z); scene.add(r); });
    const pole = mat(C.acacia);
    [-0.55, 0.55].forEach((z) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 6.5, 10), pole); p.rotation.z = Math.PI / 2; p.position.set(0, 0.55, z * 1.45); scene.add(p); });
    [-1.05, 1.05].forEach((x) => [-0.8, 0.8].forEach((z) => { const r = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.03, 8, 16), GOLD); r.position.set(x, 0.55, z); scene.add(r); }));
    // Two cherubim of hammered gold facing each other, faces down towards the cover, wings
    // spread over it (Exodus 25:18-20). Their form isn't described; these are kneeling winged figures.
    const wingShape = new THREE.Shape(); wingShape.moveTo(0, 0);
    wingShape.bezierCurveTo(0.5, 0.05, 1.0, 0.3, 1.38, 0.78);
    [[1.1, 0.6], [1.12, 0.48], [0.86, 0.42], [0.88, 0.3], [0.62, 0.27], [0.62, 0.16], [0.35, 0.16]].forEach(([x, y], i) => i % 2 ? wingShape.lineTo(x, y) : wingShape.quadraticCurveTo(x + 0.08, y + 0.06, x, y));
    wingShape.quadraticCurveTo(0.15, 0.12, 0, 0);
    const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 2, curveSegments: 16 });
    [-1, 1].forEach((sd) => {
      const c = new THREE.Group();
      c.add(Object.assign(new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.22, 0], [0.2, 0.2], [0.14, 0.45], [0.16, 0.6], [0.1, 0.7], [0, 0.72]].map(([r, y]) => new THREE.Vector2(r, y)), 24), GOLD)));
      const hd = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), GOLD); hd.position.set(-0.08, 0.8, 0); c.add(hd);
      [-1, 1].forEach((w) => { const wing = new THREE.Mesh(wingGeo, GOLD); wing.position.set(0.02, 0.55, w * 0.1); wing.rotation.set(0, w > 0 ? 0.25 : -0.25 + Math.PI, 0); wing.scale.set(-0.8, 0.8, 1); if (w < 0) wing.scale.z = -1; c.add(wing); });
      c.position.set(sd * 0.95, 1.72, 0); c.rotation.y = sd > 0 ? 0 : Math.PI; c.rotation.z = 0; scene.add(c);
    });
    labels.push(
      { pos: v3(0, 1.4, 0.9), text: "The ark", detail: "A chest of acacia wood 2.5 cubits long, 1.5 wide and 1.5 high (about 1.1 × 0.7 × 0.7 m), covered inside and out with gold. It held the tablets of the covenant.", href: ref("Exodus 25:10"), hrefText: "Exodus 25:10–16" },
      { pos: v3(0, 3.1, 0), text: "Mercy seat and cherubim", detail: "A cover of pure gold with two cherubim of hammered gold, their wings spread over it. “There I will meet with you.”", href: ref("Exodus 25:17"), hrefText: "Exodus 25:17–22" },
      { pos: v3(3.2, 0.9, 0.8), text: "Carrying poles", minor: true, detail: "Acacia overlaid with gold, left in the rings. The Bible gives no length for them.", href: ref("Exodus 25:13"), hrefText: "Exodus 25:13–15" },
    );
    person(scene, labels, -3.6, -1.8);
    return { camera: v3(5.5, 4.2, 7), target: v3(0, 1.2, 0), maxDist: 30, minDist: 2.5, minorDist: 14 };
  },

  lampstand({ scene, labels }) {
    ground(scene, 8, C.sand, false);
    // Hammered from one talent of pure gold, with six branches and seven lamps (Exodus 25:31-40).
    // No size is given; this is about 3 cubits high, as later tradition describes.
    const top = 3.1, cy = 3.1;
    lathe(scene, [[0, 0], [0.62, 0], [0.62, 0.06], [0.45, 0.14], [0.3, 0.3], [0.16, 0.38], [0.1, 0.5], [0, 0.5]], 0, 0, 0, GOLD, 48);
    cyl(scene, 0.07, top - 0.3, 0, 0.3, 0, GOLD, 12);
    [0.9, 1.6, 2.3, 2.9].forEach((y) => { const k = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 8), GOLD); k.position.set(0, y, 0); scene.add(k); });
    [0.45, 0.9, 1.35].forEach((r) => {
      const pts = []; for (let i = 0; i <= 24; i++) { const a = Math.PI + (i / 24) * Math.PI; pts.push(v3(r * Math.cos(a), cy + r * Math.sin(a), 0)); }
      scene.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.045, 8), GOLD));
      // Three cups shaped like almond flowers on each branch (Exodus 25:33).
      [Math.PI * 1.2, Math.PI * 1.5, Math.PI * 1.8].forEach((a) => [-1, 1].forEach((sd) => { if (a === Math.PI * 1.5 && sd > 0) return;
        const cx = (a === Math.PI * 1.5 ? 0 : sd * r * Math.abs(Math.cos(a))), cyy = cy + r * Math.sin(a);
        if (a !== Math.PI * 1.5) lathe(scene, [[0, -0.05], [0.07, 0], [0.09, 0.07], [0.06, 0.1]], cx, cyy, 0, GOLD, 20); }));
    });
    [-1.35, -0.9, -0.45, 0, 0.45, 0.9, 1.35].forEach((x) => {
      lathe(scene, [[0, -0.06], [0.12, -0.03], [0.15, 0.04], [0.11, 0.08], [0.05, 0.06]], x, top + 0.02, 0, GOLD, 24);
      flame(scene, x, top + 0.06, 0, 0.55);
    });
    labels.push(
      { pos: v3(0, 3.7, 0), text: "Seven lamps", detail: "Filled with pure olive oil and kept burning from evening till morning, the only light in the Holy Place.", href: ref("Exodus 27:20"), hrefText: "Exodus 27:20–21" },
      { pos: v3(1.35, 2.5, 0), text: "Six branches", detail: "Three branches on each side, each with cups shaped like almond blossoms, buds and flowers.", href: ref("Exodus 25:32"), hrefText: "Exodus 25:31–36" },
      { pos: v3(0, 0.6, 0.3), text: "One piece of gold", minor: true, detail: "The whole lampstand and its tools were hammered from a single talent of gold, about 34 kg. The Bible doesn't give its height.", href: ref("Exodus 25:39"), hrefText: "Exodus 25:39" },
    );
    return { camera: v3(3.2, 3.2, 5.2), target: v3(0, 1.9, 0), maxDist: 20, minDist: 1.5, minorDist: 8 };
  },

  "table-of-showbread"({ scene, labels }) {
    ground(scene, 8, C.sand, false);
    const wood = GOLD;
    // 2 cubits long, 1 wide, 1.5 high, overlaid with gold, with a rim and moulding (Exodus 25:23-30).
    box(scene, 2.1, 0.08, 1.1, 0, 1.42, 0, wood);
    [[-0.95, -0.45], [-0.95, 0.45], [0.95, -0.45], [0.95, 0.45]].forEach(([x, z]) => cyl(scene, 0.05, 1.42, x, 0, z, wood, 10));
    box(scene, 2.1, 0.12, 0.04, 0, 1.5, -0.53, wood); box(scene, 2.1, 0.12, 0.04, 0, 1.5, 0.53, wood);
    box(scene, 0.04, 0.12, 1.1, -1.03, 1.5, 0, wood); box(scene, 0.04, 0.12, 1.1, 1.03, 1.5, 0, wood);
    box(scene, 1.9, 0.07, 0.9, 0, 0.5, 0, wood);
    // Twelve loaves in two piles of six (Leviticus 24:5-6), frankincense on each pile.
    const bread = mat(0xcf9b5b, { rough: 0.9 });
    [-0.5, 0.5].forEach((x) => { for (let i = 0; i < 6; i++) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.36, 0.09, 20), bread); l.position.set(x, 1.55 + i * 0.1, 0); scene.add(l); }
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.05, 0.08, 12), GOLD); cup.position.set(x, 2.2, 0); scene.add(cup); });
    const pole = mat(C.acacia);
    [-0.62, 0.62].forEach((z) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 3.4, 10), pole); p.rotation.z = Math.PI / 2; p.position.set(0, 1.15, z); scene.add(p); });
    labels.push(
      { pos: v3(0, 2.5, 0), text: "Twelve loaves", detail: "The bread of the Presence: twelve loaves, one for each tribe, set out fresh every Sabbath and then eaten by the priests.", href: ref("Leviticus 24:5"), hrefText: "Leviticus 24:5–9" },
      { pos: v3(0.9, 1.7, 0.6), text: "The table", detail: "Acacia wood, 2 cubits long, 1 wide and 1.5 high (about 90 × 45 × 70 cm), covered with gold, with a gold rim around the top.", href: ref("Exodus 25:23"), hrefText: "Exodus 25:23–30" },
      { pos: v3(1.6, 1.25, 0.62), text: "Carrying poles", minor: true, detail: "Through gold rings near the legs, so it could be carried on the journey.", href: ref("Exodus 25:26"), hrefText: "Exodus 25:26–28" },
    );
    return { camera: v3(3.2, 3.2, 4.4), target: v3(0, 1.4, 0), maxDist: 20, minDist: 1.5, minorDist: 8 };
  },

  "altar-of-incense"({ scene, labels }) {
    ground(scene, 8, C.sand, false);
    // 1 cubit square and 2 high, with horns, a gold moulding and rings for poles (Exodus 30:1-10).
    box(scene, 1, 2, 1, 0, 0, 0, GOLD);
    box(scene, 1.12, 0.1, 1.12, 0, 1.85, 0, GOLD);
    [[-0.42, -0.42], [-0.42, 0.42], [0.42, -0.42], [0.42, 0.42]].forEach(([x, z]) => horn(scene, x, 2, z, 1, GOLD));
    const coal = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.05, 0.7), new THREE.MeshBasicMaterial({ color: 0xd9582b })); coal.position.set(0, 2.02, 0); scene.add(coal);
    const smoke = mat(0xffffff, { opacity: 0.35, rough: 1 });
    [[0, 2.5, 0, 0.18], [0.08, 2.95, 0.04, 0.24], [-0.05, 3.45, -0.03, 0.3], [0.06, 3.95, 0, 0.36]].forEach(([x, y, z, r]) => { const p = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), smoke); p.position.set(x, y, z); scene.add(p); });
    const pole = mat(C.acacia);
    [-0.6, 0.6].forEach((z) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.6, 10), pole); p.rotation.z = Math.PI / 2; p.position.set(0, 1.6, z); scene.add(p); });
    labels.push(
      { pos: v3(0, 4.4, 0), text: "Incense", detail: "Burned every morning and evening, a picture of prayer rising to God.", href: ref("Psalm 141:2"), hrefText: "Psalm 141:2" },
      { pos: v3(0.42, 2.45, 0.42), text: "Horns", detail: "Once a year the high priest put blood on its horns to make atonement.", href: ref("Exodus 30:10"), hrefText: "Exodus 30:10" },
      { pos: v3(0, 1.0, 0.55), text: "The altar", detail: "1 cubit square and 2 high (about 45 × 45 × 90 cm), acacia overlaid with gold, standing just in front of the veil.", href: ref("Exodus 30:1"), hrefText: "Exodus 30:1–10" },
    );
    return { camera: v3(2.8, 3.0, 3.8), target: v3(0, 1.6, 0), maxDist: 20, minDist: 1.5, minorDist: 8 };
  },

  "bronze-altar"({ scene, labels }) {
    ground(scene, 30, C.sand);
    // 5 cubits square and 3 high, acacia overlaid with bronze, horns at the corners,
    // a bronze grating halfway up, and rings and poles (Exodus 27:1-8).
    box(scene, 5, 3, 5, 0, 0, 0, BRONZE);
    box(scene, 5.3, 0.3, 5.3, 0, 1.2, 0, mat(0x6d4529, { rough: 0.6, metal: 0.5 }));
    [[-2.2, -2.2], [-2.2, 2.2], [2.2, -2.2], [2.2, 2.2]].forEach(([x, z]) => horn(scene, x, 3, z, 3, BRONZE));
    const wood = mat(0x5a3b22);
    for (let i = 0; i < 6; i++) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 3.2, 8), wood); l.rotation.z = Math.PI / 2; l.rotation.y = i * 0.5; l.position.set(0, 3.15 + (i % 2) * 0.25, 0); scene.add(l); }
    const fire = new THREE.MeshBasicMaterial({ color: 0xff8a2a });
    [[0, 0], [0.6, 0.4], [-0.5, -0.4], [0.3, -0.6]].forEach(([x, z], i) => { const f = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.3 + i * 0.2, 10), fire); f.position.set(x, 3.9, z); scene.add(f); });
    const pole = mat(C.bronze, { rough: 0.45, metal: 0.6 });
    [-2.9, 2.9].forEach((z) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 9, 10), pole); p.rotation.z = Math.PI / 2; p.position.set(0, 1.35, z); scene.add(p); });
    labels.push(
      { pos: v3(0, 5.6, 0), text: "Fire that never went out", detail: "“The fire on the altar must be kept burning; it must not go out.”", href: ref("Leviticus 6:13"), hrefText: "Leviticus 6:12–13" },
      { pos: v3(2.2, 4.4, 2.2), text: "Horns", detail: "One at each corner, made in one piece with the altar. Someone in danger could take hold of them.", href: ref("Exodus 27:2"), hrefText: "Exodus 27:2" },
      { pos: v3(2.7, 1.5, 2.7), text: "Grating", detail: "A bronze network under the ledge, halfway up the altar.", href: ref("Exodus 27:4"), hrefText: "Exodus 27:4–5" },
      { pos: v3(-1, 2.0, 2.6), text: "The bronze altar", detail: "5 cubits square and 3 high (about 2.3 × 2.3 × 1.4 m): the first thing anyone met inside the gate, where the sacrifices were offered.", href: ref("Exodus 27:1"), hrefText: "Exodus 27:1–8" },
    );
    person(scene, labels, 5, 4);
    return { camera: v3(13, 10, 15), target: v3(0, 2, 0), maxDist: 70, minDist: 4, minorDist: 30 };
  },

  breastplate({ scene, labels }) {
    ground(scene, 2.5, 0xe9e2d0, false);
    // A span square (half a cubit, about 22 cm), of gold, blue, purple and scarlet yarn and linen,
    // with twelve stones in four rows of three, each engraved with a tribe's name (Exodus 28:15-21).
    const g = new THREE.Group(); scene.add(g);
    const cloth = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.03), mat(0x5b3a7a, { rough: 0.9 })); g.add(cloth);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.53, 0.53, 0.02), GOLD); frame.position.z = -0.006; g.add(frame);
    const rows = [
      [["ruby", 0xb3122e], ["topaz", 0xd9b44a], ["emerald", 0x1f8a4c]],
      [["turquoise", 0x3fb8b0], ["sapphire", 0x1f4fb3], ["diamond", 0xe8f1f5]],
      [["jacinth", 0xd9721e], ["agate", 0x9b6b4f], ["amethyst", 0x8a4fb8]],
      [["beryl", 0x9fd8c4], ["onyx", 0x2a2a2a], ["jasper", 0x8f2f2a]],
    ];
    rows.forEach((row, r) => row.forEach(([name, color], c) => {
      const set = new THREE.Mesh(new THREE.BoxGeometry(0.115, 0.095, 0.02), GOLD); set.position.set((c - 1) * 0.15, (1.5 - r) * 0.115, 0.022); g.add(set);
      const st = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.072, 0.03), new THREE.MeshStandardMaterial({ color, roughness: 0.15, metalness: 0.1 })); st.position.set((c - 1) * 0.15, (1.5 - r) * 0.115, 0.035); g.add(st);
    }));
    [[-0.25, 0.25], [0.25, 0.25], [-0.25, -0.25], [0.25, -0.25]].forEach(([x, y]) => { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.007, 8, 16), GOLD); ring.position.set(x, y, 0.01); g.add(ring); });
    [-0.25, 0.25].forEach((x) => { const pts = [v3(x, 0.25, 0.01), v3(x * 1.1, 0.45, 0.02), v3(x * 1.3, 0.7, 0)]; g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, 0.008, 6), GOLD)); });
    g.position.y = 0.45; g.rotation.x = -0.15;
    const names = rows.map((row) => row.map((x) => x[0]).join(", "));
    labels.push(
      { pos: v3(0, 0.82, 0.05), text: "Twelve stones", detail: "One for each tribe of Israel, each engraved like a seal with a son of Israel’s name, so Aaron carried the people over his heart before the LORD.", href: ref("Exodus 28:29"), hrefText: "Exodus 28:21, 29" },
      ...names.map((n, r) => ({ pos: v3(0.33, 0.45 + (1.5 - r) * 0.115 * 0.99, 0.08), text: `Row ${r + 1}`, minor: true, detail: `${n[0].toUpperCase() + n.slice(1)}. Stone names follow the Berean Standard Bible; the Hebrew words are uncertain and translations differ.`, href: ref("Exodus 28:17"), hrefText: "Exodus 28:17–20" })),
      { pos: v3(-0.36, 0.2, 0.04), text: "A span square", detail: "About 22 cm each way, folded double, woven of gold, blue, purple and scarlet yarn and fine linen, and tied to the ephod with gold chains.", href: ref("Exodus 28:15"), hrefText: "Exodus 28:15–28" },
    );
    return { camera: v3(0.4, 0.75, 1.25), target: v3(0, 0.45, 0), maxDist: 5, minDist: 0.4, minorDist: 1.6 };
  },

  throne({ scene, labels }) {
    ground(scene, 22, C.stone);
    // A great throne of ivory overlaid with gold, six steps, a rounded top, armrests with a lion
    // beside each, and twelve lions on the steps (1 Kings 10:18-20). No sizes are given.
    const ivory = mat(0xf2e8d2, { rough: 0.5 });
    for (let i = 0; i < 6; i++) box(scene, 7 - i * 0.6, 0.5, 6 - i * 0.6, 0, i * 0.5, 0.3 * i, i % 2 ? ivory : GOLD);
    const y0 = 3;
    box(scene, 2.6, 1.2, 2.2, 0, y0, 1.2, ivory);
    box(scene, 2.6, 3.4, 0.4, 0, y0, 0.15, GOLD);
    const arch = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 0.4, 32, 1, false, -Math.PI / 2, Math.PI), GOLD); arch.rotation.x = Math.PI / 2; arch.rotation.z = Math.PI / 2; arch.position.set(0, y0 + 3.4, 0.15); scene.add(arch);
    [-1.45, 1.45].forEach((x) => { box(scene, 0.3, 1.0, 2.2, x, y0 + 1.2, 1.2, GOLD); beast(scene, x * 1.45, 2.4, { color: C.gold, metal: true, mane: 1, s: 0.55, y: y0, face: -Math.PI / 2 }); });
    for (let i = 0; i < 6; i++) [-1, 1].forEach((sd) => beast(scene, sd * (3.2 - i * 0.3), 3.3 - i * 0.3 + 0.3, { color: C.gold, metal: true, mane: 1, s: 0.38, y: i * 0.5 + 0.5, face: -Math.PI / 2 }));
    labels.push(
      { pos: v3(0, 8.1, 0.2), text: "Ivory and gold", detail: "“Nothing like it had ever been made for any kingdom.” Built of ivory and overlaid with fine gold.", href: ref("1 Kings 10:18"), hrefText: "1 Kings 10:18–20" },
      { pos: v3(3.3, 1.6, 3.4), text: "Six steps, twelve lions", detail: "A lion stood at each end of every step: twelve in all, perhaps one for each tribe.", href: ref("1 Kings 10:20"), hrefText: "1 Kings 10:19–20" },
      { pos: v3(-2.1, 5.2, 2.4), text: "Lions by the armrests", minor: true, detail: "Two lions stood beside the armrests. The Bible gives no sizes, so the proportions here are a guess.", href: ref("1 Kings 10:19"), hrefText: "1 Kings 10:19" },
    );
    person(scene, labels, 5.5, 6);
    return { camera: v3(10, 9, 15), target: v3(0, 3.2, 0), maxDist: 60, minDist: 4, minorDist: 26 };
  },

  "david-and-goliath"({ scene, labels }) {
    ground(scene, 140, 0xb8ad7c, false);
    // The Valley of Elah: two armies on the hillsides, a brook between (1 Samuel 17:1-3).
    hill(scene, 60, -15, -85, 18, 0x9aa36b); hill(scene, 60, 15, 85, 18, 0xa39f6b);
    const brook = new THREE.Mesh(new THREE.PlaneGeometry(200, 3.5), mat(0xffffff, { tex: "water", rough: 0.15, rep: 20, rep2: 1 })); brook.userData.noShadow = true; brook.rotation.x = -Math.PI / 2; brook.rotation.z = 0.08; brook.position.set(0, 0.04, 6); scene.add(brook);
    for (let i = 0; i < 5; i++) rock(scene, 0.22, -3 + i * 0.5, 0.12, 4.2 + (i % 2) * 0.4, 0x9c9488);
    for (let i = 0; i < 40; i++) { figure(scene, -45 + (i % 20) * 4.5, -52 - Math.floor(i / 20) * 4, { robe: 0x6b7a4f, h: 3.8, skin: i % 4, face: Math.PI / 2 }); figure(scene, -45 + (i % 20) * 4.5, 52 + Math.floor(i / 20) * 4, { robe: 0x8a5a3c, h: 3.8, skin: (i + 2) % 4, face: -Math.PI / 2, cloth: 0xa88a52 }); }
    // Goliath: six cubits and a span (about 2.9 m) in the Hebrew text.
    const G = figure(scene, 0, 14, { h: 6.5, robe: 0x8f6a3c, skin: 2, cloth: false, beard: true, face: -Math.PI / 2 });
    // Scale armour of bronze over his body (1 Samuel 17:5).
    const mail = lathe(scene, [[0.95, 0], [1.0, 0.3], [0.9, 1.0], [0.82, 1.5], [0.9, 1.9], [0.62, 2.1], [0, 2.15]].map(([r, y]) => [r * 1.0, y * 1.35]), 0, 2.4, 14, BRONZE, 32); mail.scale.set(0.95, 1, 0.95);
    [-1, 1].forEach((sd) => cyl(scene, 0.22, 2.0, 0, 0, 14 + sd * 0.45, BRONZE, 16));
    const helm = new THREE.Mesh(new THREE.SphereGeometry(0.66, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), BRONZE); helm.position.set(0, 5.6, 14); scene.add(helm);
    const spear = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 9, 8), mat(0x6b4a2b)); spear.position.set(1.3, 4.2, 14); spear.rotation.x = 0.15; scene.add(spear);
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.2, 1, 8), mat(0x6f6f6f, { metal: 0.6, rough: 0.4 })); head.position.set(1.3, 8.9, 14.7); head.rotation.x = 0.15; scene.add(head);
    figure(scene, -0.5, 10.5, { h: 3.8, robe: 0x7c5a38, skin: 1, face: -Math.PI / 2 });
    box(scene, 2.4, 3.6, 0.2, -0.5, 0.3, 9.6, mat(0x8a6a40));
    // David: a youth with a staff, a sling and five smooth stones.
    figure(scene, 0, -2, { h: 3.7, robe: 0xb58a55, skin: 3, cloth: false, face: Math.PI / 2, raise: true });
    const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 4.5, 8), mat(0x6b5136)); staff.position.set(-0.8, 2.2, -2); scene.add(staff);
    labels.push(
      { pos: v3(0, 7.6, 14), text: "Goliath", detail: "“Six cubits and a span” (about 2.9 m) in the Hebrew text; the Greek Septuagint and the Dead Sea Scrolls say four cubits and a span (about 2 m). His bronze armour weighed 5,000 shekels (about 57 kg).", href: ref("1 Samuel 17:4"), hrefText: "1 Samuel 17:4–7" },
      { pos: v3(1.3, 10, 14.7), text: "His spear", minor: true, detail: "A shaft like a weaver’s beam, its iron point weighing 600 shekels (about 7 kg).", href: ref("1 Samuel 17:7"), hrefText: "1 Samuel 17:7" },
      { pos: v3(-0.5, 4.6, 9.6), text: "Shield-bearer", minor: true, detail: "Goliath’s shield-bearer went ahead of him.", href: ref("1 Samuel 17:41"), hrefText: "1 Samuel 17:41" },
      { pos: v3(0, 4.6, -2), text: "David", detail: "“You come against me with sword and spear and javelin, but I come against you in the name of the LORD of Hosts.”", href: ref("1 Samuel 17:45"), hrefText: "1 Samuel 17:45–47" },
      { pos: v3(-2, 1.4, 4.4), text: "Five smooth stones", detail: "Chosen from the brook and put in his shepherd’s bag.", href: ref("1 Samuel 17:40"), hrefText: "1 Samuel 17:40" },
      { pos: v3(0, 8, -54), text: "Israel’s army", minor: true, detail: "Saul and the men of Israel, drawn up on one hill.", href: ref("1 Samuel 17:2"), hrefText: "1 Samuel 17:1–3" },
      { pos: v3(0, 8, 54), text: "The Philistines", minor: true, detail: "On the opposite hill, with the valley between them.", href: ref("1 Samuel 17:3"), hrefText: "1 Samuel 17:3" },
    );
    return { camera: v3(26, 9, 6), target: v3(0, 3, 6), maxDist: 220, minDist: 6, minorDist: 90 };
  },

  "galilee-boat"({ scene, labels }) {
    water(scene, 160);
    hill(scene, 70, -90, -110, 22, 0x8fa36e); hill(scene, 80, 70, -130, 28, 0x9da874);
    // A first-century fishing boat like the one found by the Sea of Galilee in 1986:
    // about 8.3 m long, 2.3 m wide and 1.3 m deep (about 18 × 5 × 3 cubits).
    const wood = mat(0xb08a68, { side: THREE.DoubleSide, tex: "wood", rep: 3, rep2: 1, rough: 0.85 });
    const hull = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 20, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), wood);
    hull.scale.set(9.2, 3, 2.6); hull.position.y = 1.8; scene.add(hull);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(1, 0.03, 8, 48), mat(0x5a3b22)); rim.rotation.x = Math.PI / 2; rim.scale.set(9.2, 2.6, 1); rim.position.y = 1.8; scene.add(rim);
    for (let i = -2; i <= 2; i++) box(scene, 0.4, 0.12, 4.2 * Math.sqrt(1 - (i * 2.6 / 9.2) ** 2), i * 2.6, 1.15, 0, mat(0x8a6040));
    cyl(scene, 0.13, 13, 2.5, 0.4, 0, mat(0x6b4a2b), 10);
    const sail = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), mat(0xe9dfc6, { side: THREE.DoubleSide })); sail.position.set(2.5, 9, 0.3); scene.add(sail);
    const yard = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 7, 8), mat(0x6b4a2b)); yard.rotation.x = Math.PI / 2; yard.rotation.z = Math.PI / 2; yard.position.set(2.5, 12, 0.3); scene.add(yard);
    [[-5, 1.2, 0], [-3.4, -1.1, 0.4], [-1.6, 1.3, 0.2], [0.2, -1.2, 1], [1.6, 1.2, 2], [3.6, -1, 3], [4.8, 0.9, 1], [-2.4, 0, 2], [0.8, 0.1, 0], [5.8, -0.2, 3], [-4.2, -0.4, 1], [3, 0.1, 2]].forEach(([x, z, sk], i) =>
      figure(scene, x, z, { h: 3.6, robe: [0x6f5a45, 0x5a6d7a, 0x8a6a44, 0x7a4e3a][i % 4], skin: sk, sit: true, y: 0.9, face: Math.PI / 2 + (z > 0 ? 0.6 : -0.6) }));
    const cushion = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.3, 0.9), mat(0x9c3b2b)); cushion.position.set(-7.4, 1.2, 0); scene.add(cushion);
    recliner(scene, -7.2, 0, Math.PI, 0xe7dccb, 0);
    const net = new THREE.Mesh(new THREE.SphereGeometry(1.3, 12, 8), new THREE.MeshStandardMaterial({ color: 0xcfc6a8, wireframe: true })); net.scale.y = 0.35; net.position.set(6.5, 1.3, 0); scene.add(net);
    labels.push(
      { pos: v3(0, 4.5, 0), text: "A fishing boat", detail: "Built like the 2,000-year-old boat found in the mud of the Sea of Galilee in 1986: about 8.3 m long and 2.3 m wide, big enough for Jesus and the Twelve.", href: ref("Mark 4:35"), hrefText: "Mark 4:35–41" },
      { pos: v3(-7.4, 3.0, 0), text: "Asleep on a cushion", detail: "“Jesus was in the stern, sleeping on a cushion.” Then he rebuked the wind: “Silence! Be still!”", href: ref("Mark 4:38"), hrefText: "Mark 4:38–39" },
      { pos: v3(6.5, 2.6, 0), text: "Nets", minor: true, detail: "Peter, Andrew, James and John were fishermen when Jesus called them.", href: ref("Luke 5:4"), hrefText: "Luke 5:1–11" },
      { pos: v3(2.5, 13.5, 0), text: "Mast and sail", minor: true, detail: "Boats like this had a single square sail and four oars.", href: ref("Mark 6:48"), hrefText: "Mark 6:45–52" },
    );
    return { camera: v3(18, 12, 22), target: v3(0, 2.5, 0), maxDist: 140, minDist: 5, minorDist: 50 };
  },

  nativity({ scene, labels }) {
    ground(scene, 60, 0xc9b98f);
    const stone = mat(0xffffff, { rough: 0.95, tex: "plaster", rep: 3 });
    // A village house: a lower room where the animals came in at night and a raised family
    // room. Luke says there was no room in the kataluma (guest room), so the baby was laid in a manger.
    box(scene, 14, 6, 0.6, 0, 0, -5, stone); box(scene, 0.6, 6, 10, -7, 0, 0, stone); box(scene, 0.6, 6, 10, 7, 0, 0, stone);
    box(scene, 5, 6, 0.6, -4.5, 0, 5, stone); box(scene, 5, 6, 0.6, 4.5, 0, 5, stone);
    const roof = box(scene, 14.6, 0.5, 10.6, 0, 6, 0, mat(0x9c8a6a)); roof.visible = false;
    box(scene, 13.4, 1.4, 4.4, 0, 0, -2.6, mat(0xcbb894));
    const manger = box(scene, 2, 1, 1, -1.5, 1.4, -0.7, stone);
    const hay = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.2, 0.7), mat(0xd9b95c)); hay.position.set(-1.5, 2.45, -0.7); scene.add(hay);
    const baby = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.6, 6, 10), mat(0xf3eee2)); baby.rotation.z = Math.PI / 2; baby.position.set(-1.5, 2.7, -0.7); scene.add(baby);
    figure(scene, 0.4, -1.8, { robe: 0x3e5f8a, cloth: 0x5a7fb0, skin: 0, sit: true, y: 1.4, face: -2.3 });
    figure(scene, -3.8, -1.6, { robe: 0x7a5a3c, cloth: 0xc9b48a, skin: 1, y: 1.4, face: -0.6 });
    beast(scene, 3.5, 2, { color: 0x6b4f3a, horns: true, face: Math.PI });
    beast(scene, -4.6, 2.2, { color: 0x8f877d, ears: true, s: 0.8, face: 0 });
    [[9, 7], [11, 9], [12.5, 6.5]].forEach(([x, z], i) => figure(scene, x, z, { robe: 0x8a7a5a, skin: i + 1, cloth: 0xd8cfb8, face: Math.PI * 0.8 }));
    for (let i = 0; i < 6; i++) beast(scene, 15 + (i % 3) * 2.2, 10 + Math.floor(i / 3) * 2, { color: 0xeeeae0, wool: true, s: 0.45, face: Math.PI });
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(1.2), new THREE.MeshBasicMaterial({ color: 0xfff1b0 })); star.position.set(0, 24, 0); scene.add(star);
    labels.push(
      { pos: v3(-1.5, 3.6, -0.7), text: "Laid in a manger", detail: "“She wrapped him in swaddling cloths and laid him in a manger, because there was no room for them in the inn” (or “guest room”).", href: ref("Luke 2:7"), hrefText: "Luke 2:1–7" },
      { pos: v3(0, 7.2, 0), text: "A family house?", detail: "Many village houses had a lower level where animals were brought in at night, with mangers cut into the floor, and a raised room for the family. The Bible doesn’t describe the building or mention a stable.", href: ref("Luke 2:7"), hrefText: "Luke 2:7" },
      { pos: v3(3.5, 3.2, 2), text: "Ox and donkey", minor: true, detail: "Not in the Gospels: they come from later tradition, drawing on Isaiah 1:3.", href: ref("Isaiah 1:3"), hrefText: "Isaiah 1:3" },
      { pos: v3(11, 5, 8), text: "Shepherds", detail: "Told by angels, they hurried to Bethlehem and found Mary and Joseph, and the baby lying in the manger.", href: ref("Luke 2:16"), hrefText: "Luke 2:8–20" },
      { pos: v3(0, 26, 0), text: "The star", minor: true, detail: "Matthew’s wise men followed a star to the house where the child was, probably some months later.", href: ref("Matthew 2:9"), hrefText: "Matthew 2:1–12" },
    );
    let inside = true;
    return { camera: v3(5, 15, 19), target: v3(-0.5, 1.5, -1), maxDist: 90, minDist: 5, minorDist: 40,
      toggleInside: () => { inside = !inside; roof.visible = !inside; return inside; } };
  },

  "last-supper"({ scene, labels }) {
    ground(scene, 30, 0xb8a888);
    const plaster = mat(0xffffff, { rough: 0.95, tex: "plaster", rep: 3 });
    box(scene, 22, 9, 0.5, 0, 0, -10, plaster); box(scene, 0.5, 9, 20, -11, 0, 0, plaster); box(scene, 0.5, 9, 20, 11, 0, 0, plaster);
    // A triclinium: three low tables in a U, the guests reclining on their left side.
    const table = WOOD(2);
    box(scene, 12, 1, 2.4, 0, 0, -3, table); box(scene, 2.4, 1, 8, -6, 0, 2.2, table); box(scene, 2.4, 1, 8, 6, 0, 2.2, table);
    const cushions = mat(0x8c3b2e);
    box(scene, 13, 0.4, 2, 0, 0, -5.6, cushions); box(scene, 2, 0.4, 9, -8.6, 0, 2.4, cushions); box(scene, 2, 0.4, 9, 8.6, 0, 2.4, cushions);
    const robes = [0xe9e1d0, 0x6f5a45, 0x5a6d7a, 0x8a6a44, 0x7a4e3a, 0x6b7a4f];
    for (let i = 0; i < 5; i++) recliner(scene, -4.8 + i * 2.4, -5.6, -Math.PI / 2 + 0.2, robes[i % 6], i % 4);
    for (let i = 0; i < 4; i++) recliner(scene, -8.6, -1 + i * 2.2, 0.2, robes[(i + 2) % 6], (i + 1) % 4);
    for (let i = 0; i < 4; i++) recliner(scene, 8.6, -1 + i * 2.2, Math.PI + 0.2, robes[(i + 4) % 6], (i + 2) % 4);
    const bread = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.42, 0.15, 18), mat(0xcf9b5b)); bread.position.set(-0.6, 1.1, -3); scene.add(bread);
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.12, 0.45, 16), mat(0xb08d57, { metal: 0.3, rough: 0.5 })); cup.position.set(0.6, 1.25, -3); scene.add(cup);
    [[-4, -3], [4, -3], [-6, 3], [6, 3]].forEach(([x, z]) => { const l = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), mat(0xb7865a)); l.scale.y = 0.5; l.position.set(x, 1.1, z); scene.add(l); flame(scene, x + 0.2, 1.1, z, 0.9); });
    labels.push(
      { pos: v3(0, 2.6, -3), text: "Bread and cup", detail: "“This is my body, given for you; do this in remembrance of me… This cup is the new covenant in my blood.”", href: ref("Luke 22:19"), hrefText: "Luke 22:14–20" },
      { pos: v3(-2.4, 2.6, -5.6), text: "Reclining at the table", detail: "Guests lay on cushions on their left side round low tables, which is how the beloved disciple could lean back against Jesus. Famous paintings show them sitting on one side of a long table.", href: ref("John 13:23"), hrefText: "John 13:23–25" },
      { pos: v3(0, 9.6, -10), text: "A large upper room", minor: true, detail: "“He will show you a large upper room, furnished and ready.”", href: ref("Mark 14:15"), hrefText: "Mark 14:12–16" },
    );
    return { camera: v3(10, 15, 20), target: v3(0, 1, -1), maxDist: 70, minDist: 4, minorDist: 32 };
  },

  "empty-tomb"({ scene, labels }) {
    ground(scene, 60, 0x9fae74);
    const stone = 0xc4b89f;
    // A rock-cut tomb in a garden, sealed with a large rolling stone (John 19:41, Mark 16:3-4).
    box(scene, 26, 11, 9, 0, 0, -6, mat(0xffffff, { rough: 1, tex: "rock", rep: 3 }));
    rock(scene, 6, -11, 6, -5, stone, 1.2, 1.1, 1); rock(scene, 5, 12, 5, -4, stone, 1.3, 1.1, 1); rock(scene, 4, 2, 11, -6, stone, 2.5, 0.6, 1.2);
    const door = new THREE.Mesh(new THREE.BoxGeometry(2.4, 3.2, 0.3), mat(0x1c1915)); door.position.set(0, 1.6, -1.4); scene.add(door);
    box(scene, 9, 0.4, 1.2, 3.5, 0, -0.9, mat(0xab9f86, { rough: 1 }));
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 0.8, 48), mat(0xffffff, { rough: 1, tex: "rock" })); disc.rotation.x = Math.PI / 2; disc.position.set(4.6, 2.6, -0.9); scene.add(disc);
    const cloth = mat(0xf2ede0);
    box(scene, 1.6, 0.25, 0.7, 0.8, 0, -3.6, cloth); box(scene, 0.6, 0.18, 0.5, -0.8, 0, -3.6, cloth);
    figure(scene, 1.6, 0.8, { robe: 0xffffff, cloth: 0xffffff, skin: 0, sit: true, y: 0.3, face: -Math.PI / 2 });
    tree(scene, -9, 9, 9); tree(scene, 13, 10, 7); tree(scene, -16, 3, 8);
    for (let i = 0; i < 10; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.9 + (i % 3) * 0.3, 10, 8), mat(0x6c8a4c, { rough: 1 })); b.position.set(-14 + i * 3, 0.5, 4 + (i % 2) * 2); scene.add(b); }
    const sun = new THREE.Mesh(new THREE.SphereGeometry(3, 20, 14), new THREE.MeshBasicMaterial({ color: 0xffd98a })); sun.position.set(-60, 14, -70); scene.add(sun);
    labels.push(
      { pos: v3(4.6, 5.6, -0.9), text: "The stone rolled away", detail: "“Who will roll away the stone from the entrance of the tomb?” But when they looked up, they saw that it had been rolled away, even though it was extremely large.", href: ref("Mark 16:3"), hrefText: "Mark 16:1–4" },
      { pos: v3(0, 4.2, -1.4), text: "He is not here", detail: "“Why do you look for the living among the dead? He is not here; he has risen!”", href: ref("Luke 24:5"), hrefText: "Luke 24:1–8" },
      { pos: v3(0.8, 1.2, -3.2), text: "The linen cloths", minor: true, detail: "Peter saw the linen cloths lying there, and the cloth that had been around Jesus’ head folded up by itself.", href: ref("John 20:6"), hrefText: "John 20:3–9" },
      { pos: v3(1.6, 3.4, 0.8), text: "A young man in white", minor: true, detail: "Sitting on the right side, dressed in a white robe: “Do not be alarmed.”", href: ref("Mark 16:5"), hrefText: "Mark 16:5–7" },
      { pos: v3(-9, 10, 9), text: "A garden", minor: true, detail: "“In the place where he was crucified there was a garden, and in the garden a new tomb.”", href: ref("John 19:41"), hrefText: "John 19:41–42" },
    );
    return { camera: v3(16, 8, 20), target: v3(0, 2.5, -2), maxDist: 90, minDist: 4, minorDist: 36 };
  },

  "daniel-statue"({ scene, labels }) {
    ground(scene, 140, C.sand);
    // The statue in Nebuchadnezzar's dream (Daniel 2:31-45): head of gold, chest and arms of
    // silver, belly and thighs of bronze, legs of iron, feet partly iron and partly clay.
    // Daniel gives no height; "huge and dazzling", so here it stands 24 cubits (about 11 m).
    const FEET = mat(0xffffff, { tex: "clay", rough: 0.6, metal: 0.4, rep: 1 });
    colossus(scene, 0, 0, 24, { head: GOLD, chest: SILVER, thighs: BRONZE, legs: IRON, feet: FEET }, 0);
    // The stone cut out without hands, flying at its feet, and the mountain it became.
    rock(scene, 1.6, 9, 1.8, 0, 0x8f877a, 1.1, 1, 1);
    const trail = mat(0xffffff, { opacity: 0.25, rough: 1 });
    [[12, 2.6, 0, 0.9], [15, 3.4, 0, 0.7], [18, 4.3, 0, 0.5]].forEach(([x, y, z, r]) => { const p = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), trail); p.position.set(x, y, z); p.userData.noShadow = true; scene.add(p); });
    const mountain = new THREE.Mesh(new THREE.ConeGeometry(60, 42, 64, 8), mat(0xffffff, { tex: "grass", rough: 1, rep: 6 })); mountain.position.set(-40, 21, -120); scene.add(mountain);
    for (let i = 0; i < 8; i++) rock(scene, 0.4 + (i % 3) * 0.25, 2 + (i % 4) * 0.9, 0.25, -2.4 + i * 0.6, 0x5e5e62);
    labels.push(
      { pos: v3(0, 25.6, 0), text: "Head of gold", detail: "“You, O king, are the head of gold”: Nebuchadnezzar and his kingdom of Babylon.", href: ref("Daniel 2:37"), hrefText: "Daniel 2:36–38" },
      { pos: v3(0, 19.5, 3.4), text: "Chest and arms of silver", detail: "“After you, another kingdom will rise, inferior to yours.” Many readers see Media-Persia here.", href: ref("Daniel 2:39"), hrefText: "Daniel 2:39" },
      { pos: v3(0, 14, 2.6), text: "Belly and thighs of bronze", detail: "“A third kingdom, one of bronze, will rule the whole earth”, often taken to be Greece under Alexander.", href: ref("Daniel 2:39"), hrefText: "Daniel 2:39" },
      { pos: v3(0, 7, 2.2), text: "Legs of iron", detail: "“A fourth kingdom, strong as iron”, crushing and breaking everything; many see Rome.", href: ref("Daniel 2:40"), hrefText: "Daniel 2:40" },
      { pos: v3(1.5, 1.8, 2.4), text: "Feet of iron and clay", detail: "A divided kingdom, partly strong and partly brittle, whose parts would not hold together, “just as iron does not mix with clay”.", href: ref("Daniel 2:41"), hrefText: "Daniel 2:41–43" },
      { pos: v3(9, 4.6, 0), text: "The stone cut without hands", detail: "It struck the statue on its feet and smashed them, and the whole statue was blown away like chaff. “The God of heaven will set up a kingdom that will never be destroyed.”", href: ref("Daniel 2:44"), hrefText: "Daniel 2:34–35, 44–45" },
      { pos: v3(-40, 45, -120), text: "A great mountain", minor: true, detail: "“The stone that struck the statue became a great mountain and filled the whole earth.”", href: ref("Daniel 2:35"), hrefText: "Daniel 2:35" },
    );
    person(scene, labels, 6, 6);
    return { camera: v3(30, 17, 36), target: v3(0, 12.5, 0), maxDist: 260, minDist: 4, minorDist: 90, size: 30 };
  },

  "nebuchadnezzar-statue"({ scene, labels }) {
    ground(scene, 220, 0xd8c79c);
    // On the plain of Dura: an image of gold 60 cubits high and 6 wide (Daniel 3:1). Its form isn't described.
    box(scene, 12, 3, 12, 0, 0, 0, mat(0xffffff, { tex: "stone", rep: 2 }));
    lathe(scene, [[0, 0], [3.4, 0], [3.4, 1.2], [3.0, 1.6], [2.8, 40], [3.2, 40.6], [3.4, 41.4], [0, 41.4]], 0, 3, 0, GOLD, 48);
    colossus(scene, 0, 0, 16, { head: GOLD, chest: GOLD, thighs: GOLD, legs: GOLD, feet: GOLD }, Math.PI / 2).position.y = 44.4;
    // The furnace, heated seven times hotter (Daniel 3:19).
    box(scene, 12, 10, 10, 40, 0, 20, mat(0x9b6a4a, { rough: 1 }));
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.2, 4, 4), new THREE.MeshBasicMaterial({ color: 0xff7a1a })); mouth.position.set(33.95, 2.5, 20); scene.add(mouth);
    for (let i = 0; i < 80; i++) figure(scene, -30 + (i % 16) * 4, 22 + Math.floor(i / 16) * 4, { h: 3.8, robe: [0x7a5a3c, 0x5a6d7a, 0x8a6a44, 0x6b7a4f][i % 4], skin: i % 4, face: Math.PI, cloth: i % 3 ? 0xd8cfb8 : false });
    labels.push(
      { pos: v3(0, 62, 0), text: "60 cubits high", detail: "About 27 m, roughly the height of a nine-storey building, and 6 cubits (2.7 m) wide. The Bible doesn’t describe its shape; this one is a simple figure.", href: ref("Daniel 3:1"), hrefText: "Daniel 3:1–7" },
      { pos: v3(34, 11, 20), text: "The fiery furnace", detail: "Shadrach, Meshach and Abednego would not bow, and were thrown in. The king saw four men walking unharmed in the fire.", href: ref("Daniel 3:24"), hrefText: "Daniel 3:19–27" },
      { pos: v3(0, 8, 30), text: "Everyone bowed", minor: true, detail: "When the music sounded, the officials of every province were to fall down and worship.", href: ref("Daniel 3:5"), hrefText: "Daniel 3:4–7" },
    );
    return { camera: v3(70, 40, 95), target: v3(0, 22, 0), maxDist: 400, minDist: 10, minorDist: 140 };
  },

  map({ scene, labels, root }) {
    // A raised-relief map of the land, about 1 unit to 1 km, heights exaggerated 3 times.
    // The relief is built from the main landforms (coastal plain, central hills, Jordan rift,
    // Transjordan plateau, Hermon), so heights are approximate.
    const LON0 = 35.3, LAT0 = 32.25, KX = 94.3, KZ = 111, EX = 3;
    const toX = (lon) => (lon - LON0) * KX, toZ = (lat) => -(lat - LAT0) * KZ;
    const coast = [[30.85, 34.05], [31.3, 34.23], [31.52, 34.43], [31.67, 34.55], [31.9, 34.68], [32.05, 34.75], [32.3, 34.84], [32.5, 34.89], [32.73, 34.95], [32.83, 34.98], [32.92, 35.07], [33.1, 35.1], [33.27, 35.19], [33.56, 35.37], [33.75, 35.48]];
    const coastLon = (lat) => { for (let i = 1; i < coast.length; i++) if (lat <= coast[i][0]) { const [a0, b0] = coast[i - 1], [a1, b1] = coast[i]; return b0 + (b1 - b0) * (lat - a0) / (a1 - a0); } return coast[coast.length - 1][1]; };
    const segDist = (px, pz, line) => { let best = 1e9, t = 0, hit = null; for (let i = 1; i < line.length; i++) { const ax = toX(line[i - 1][1]), az = toZ(line[i - 1][0]), bx = toX(line[i][1]), bz = toZ(line[i][0]); const dx = bx - ax, dz = bz - az, L = dx * dx + dz * dz; let u = L ? ((px - ax) * dx + (pz - az) * dz) / L : 0; u = Math.max(0, Math.min(1, u)); const d = Math.hypot(px - ax - u * dx, pz - az - u * dz); if (d < best) { best = d; hit = [i, u]; } } const h = hit ? line[hit[0] - 1][2] + (line[hit[0]][2] - line[hit[0] - 1][2]) * hit[1] : 0; return [best, h]; };
    const ridges = [
      { w: 14, line: [[31.0, 34.95, 500], [31.35, 35.05, 900], [31.53, 35.1, 1000], [31.78, 35.22, 800], [31.93, 35.23, 880], [32.21, 35.28, 880], [32.46, 35.3, 600], [32.55, 35.3, 200]] },
      { w: 6, line: [[32.73, 35.03, 450], [32.57, 35.2, 400]] },
      { w: 12, line: [[32.63, 35.35, 150], [32.7, 35.3, 450], [32.95, 35.4, 900], [33.05, 35.42, 1100], [33.3, 35.5, 1300], [33.6, 35.65, 1900]] },
      { w: 9, line: [[33.25, 35.75, 1200], [33.42, 35.86, 2800], [33.6, 36.0, 2200]] },
      { w: 22, line: [[30.95, 35.6, 1300], [31.2, 35.72, 1100], [31.5, 35.8, 900], [31.75, 35.8, 800], [32.05, 35.85, 950], [32.4, 35.9, 650], [32.65, 35.95, 450], [32.9, 35.9, 500], [33.1, 35.85, 900]] },
      { w: 25, line: [[30.85, 34.6, 450], [31.1, 34.85, 500]] },
    ];
    const rift = [[30.85, 35.25, 150], [31.05, 35.38, -300], [31.25, 35.45, -430], [31.5, 35.49, -430], [31.77, 35.55, -400], [32.1, 35.55, -300], [32.45, 35.57, -230], [32.7, 35.59, -210], [32.88, 35.6, -210], [33.08, 35.61, 70], [33.3, 35.63, 300]];
    const noise = (x, z) => Math.sin(x * 0.37 + Math.sin(z * 0.21) * 2) * Math.cos(z * 0.33 + Math.sin(x * 0.17) * 2);
    const heightAt = (lat, lon) => {
      if (lon < coastLon(lat)) return -60;
      const x = toX(lon), z = toZ(lat);
      const fromCoast = (lon - coastLon(lat)) * KX;
      let h = Math.min(fromCoast * 12, 160);
      ridges.forEach((r) => { const [d, rh] = segDist(x, z, r.line); h = Math.max(h, rh * Math.exp(-((d / r.w) ** 2)) + Math.min(fromCoast * 6, 100)); });
      const [dr, rh] = segDist(x, z, rift);
      const k = Math.exp(-((dr / 6) ** 2));
      h = h * (1 - k) + rh * k;
      return h + noise(x, z) * 40 * (h > 50 ? 1 : 0.2);
    };
    const minLat = 30.85, maxLat = 33.75, minLon = 34.15, maxLon = 36.4;
    const w = toX(maxLon) - toX(minLon), d = toZ(minLat) - toZ(maxLat);
    const nx = 180, nz = 230;
    const geo = new THREE.PlaneGeometry(w, d, nx, nz);
    geo.rotateX(-Math.PI / 2);
    geo.translate((toX(maxLon) + toX(minLon)) / 2, 0, (toZ(minLat) + toZ(maxLat)) / 2);
    const pos = geo.attributes.position, cols = [];
    const col = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const lon = x / KX + LON0, lat = -z / KZ + LAT0;
      const ocean = lon < coastLon(lat);
      const h = ocean ? -60 : heightAt(lat, lon);
      pos.setY(i, ocean ? -0.08 : (h / 1000) * EX);
      const desert = Math.max(0, Math.min(1, (31.6 - lat) * 1.4)) + Math.max(0, Math.min(1, (lon - 35.75) * 2.5)) * 0.6;
      if (ocean) col.setHex(0x5d9cb0);
      else if (h > 2000) col.setHex(0xf2f2ee);
      else if (h > 1100) col.setHex(0x9b8a70);
      else if (h < 0) col.setHex(0xc9b98f);
      else { col.setHex(0x8fae6e).lerp(new THREE.Color(0xc2a875), Math.min(1, h / 1100)); col.lerp(new THREE.Color(0xdcc79a), Math.min(1, desert)); }
      cols.push(col.r, col.g, col.b);
    }
    geo.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3));
    geo.computeVertexNormals();
    const land = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: false }));
    scene.add(land);
    // Open sea beyond the map's western edge.
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(400, d * 1.4), mat(0x5d9cb0, { rough: 0.3 }));
    sea.rotation.x = -Math.PI / 2; sea.position.set(toX(minLon) - 200, -0.08, toZ(32.3)); scene.add(sea);
    // The two lakes, at their own levels below the sea.
    const lake = (lat0, lat1, lon0, lon1, h, color) => { const m = new THREE.Mesh(new THREE.CircleGeometry(1, 48), mat(color, { rough: 0.25 })); m.rotation.x = -Math.PI / 2; m.scale.set((lon1 - lon0) * KX / 2, (lat1 - lat0) * KZ / 2, 1); m.position.set(toX((lon0 + lon1) / 2), (h / 1000) * EX + 0.03, toZ((lat0 + lat1) / 2)); scene.add(m); };
    lake(32.70, 32.89, 35.52, 35.65, -210, 0x4f97ad);
    lake(31.05, 31.77, 35.40, 35.58, -430, 0x5fa3a6);
    // The Jordan, along the valley floor.
    const jordan = [[32.70, 35.57], [32.55, 35.56], [32.4, 35.55], [32.2, 35.53], [32.0, 35.52], [31.85, 35.54], [31.77, 35.56]];
    const pts = jordan.map(([la, lo]) => new THREE.Vector3(toX(lo), (heightAt(la, lo) / 1000) * EX + 0.08, toZ(la)));
    scene.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.35, 6), mat(0x3f8fb0, { rough: 0.3 })));
    // Places from the Library.
    const places = JSON.parse(root.querySelector("#b3dPlaces").textContent || "[]");
    const pin = mat(0xb4442c, { rough: 0.5 });
    places.forEach((p, i) => {
      if (p.lat < minLat || p.lat > maxLat || p.lon < minLon || p.lon > maxLon) return;
      const y = Math.max(0, (heightAt(p.lat, p.lon) / 1000) * EX);
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.05, 2.2, 8), pin); m.position.set(toX(p.lon), y + 1.1, toZ(p.lat)); scene.add(m);
      labels.push({ pos: v3(toX(p.lon), y + 2.6, toZ(p.lat)), text: p.name, minor: i >= 10, detail: p.summary || "", href: "/bible/places/" + p.slug, hrefText: "About " + p.name });
    });
    labels.push({ pos: v3(toX(35.86), 9.5, toZ(33.42)), text: "Mount Hermon", minor: true, detail: "The highest point, about 2,800 m. Snow-capped much of the year; the Jordan's springs rise at its foot.", href: "/bible/places/hermon", hrefText: "About Hermon" });
    const focus = root.dataset.focus ? places.find((p) => p.slug === root.dataset.focus) : null;
    const target = focus ? v3(toX(focus.lon), 1, toZ(focus.lat)) : v3(toX(35.3), 0, toZ(32.0));
    return { camera: v3(target.x + 80, 110, target.z + 135), target, maxDist: 520, minDist: 12, minorDist: 120 };
  },
};

// Start once everything above is defined.
const root = document.getElementById("b3d");
if (root) start(root);
