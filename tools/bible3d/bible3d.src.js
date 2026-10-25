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
  stage.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const sky = dark() ? 0x0c2226 : 0xdcebe7;
  scene.background = new THREE.Color(sky);
  scene.fog = new THREE.Fog(sky, 400, 1400);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 5000);
  scene.add(new THREE.HemisphereLight(0xffffff, dark() ? 0x203030 : 0x8a7a60, 1.35));
  const sun = new THREE.DirectionalLight(0xfff2dc, 1.6);
  sun.position.set(-120, 200, 140);
  scene.add(sun);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.autoRotate = !reduce;
  controls.autoRotateSpeed = 0.6;

  const labels = [];
  const build = MODELS[kind] || MODELS.tabernacle;
  const model = build({ scene, labels, root });
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
  linen: 0xf2ede0, gold: 0xd4ae45, bronze: 0xa86b3c, acacia: 0x8a5a33, hair: 0x4a423c, ram: 0x8d3b2b,
  blue: 0x2d4f8c, sand: 0xd9c9a3, stone: 0xd8cfbd, cedar: 0x9a6a3f, pitch: 0x3b2a1e, ground: 0xcdbb92,
};
const mat = (color, opts = {}) => new THREE.MeshStandardMaterial({ color, roughness: opts.rough ?? 0.75, metalness: opts.metal ?? 0, transparent: opts.opacity != null, opacity: opts.opacity ?? 1, side: opts.side ?? THREE.FrontSide });
const GOLD = mat(C.gold, { rough: 0.35, metal: 0.7 });
const BRONZE = mat(C.bronze, { rough: 0.45, metal: 0.6 });

function box(scene, w, h, d, x, y, z, m) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  mesh.position.set(x, y + h / 2, z);
  scene.add(mesh);
  return mesh;
}
function cyl(scene, r, h, x, y, z, m, seg = 24) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), m);
  mesh.position.set(x, y + h / 2, z);
  scene.add(mesh);
  return mesh;
}
function ground(scene, size, color = C.ground, grid = true) {
  const g = new THREE.Mesh(new THREE.CircleGeometry(size, 64), mat(color, { rough: 1 }));
  g.rotation.x = -Math.PI / 2;
  scene.add(g);
  if (grid) {
    const gh = new THREE.GridHelper(size * 1.6, Math.round(size * 1.6 / 10), 0x000000, 0x000000);
    gh.material.opacity = 0.08; gh.material.transparent = true; gh.position.y = 0.02;
    scene.add(gh);
  }
}
// A person, 4 cubits (about 1.8 m) tall, for scale.
function person(scene, labels, x, z) {
  const m = mat(0x2f6f68);
  cyl(scene, 0.45, 2.6, x, 0, z, m, 12);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 12), m);
  head.position.set(x, 3.4, z);
  scene.add(head);
  labels.push({ pos: new THREE.Vector3(x, 4.4, z), text: "A person, for scale", minor: true,
    detail: "About 4 cubits (1.8 m) tall. A cubit was the length from elbow to fingertip, roughly 45 cm." });
}

// A simple figure for scenes: robe, head and headcloth. h = height in cubits.
const SKIN = [0xc68a5e, 0xa8714a, 0x8d5a3b, 0xd29c74];
function figure(scene, x, z, o = {}) {
  const h = o.h || 4, k = h / 4, g = new THREE.Group();
  const robe = mat(o.robe ?? 0x8b6f4e);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.32 * k, 0.62 * k, 2.85 * k, 14), robe); body.position.y = 1.43 * k; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.36 * k, 16, 12), mat(SKIN[o.skin ?? 0])); head.position.y = 3.25 * k; g.add(head);
  if (o.cloth !== false) { const c = new THREE.Mesh(new THREE.SphereGeometry(0.4 * k, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), mat(o.cloth ?? 0xe8e0cc)); c.position.y = 3.3 * k; g.add(c); }
  if (o.sit) { body.scale.y = 0.62; body.position.y = 0.9 * k; head.position.y -= 1.05 * k; g.children[2] && (g.children[2].position.y -= 1.05 * k); }
  g.position.set(x, o.y || 0, z); g.rotation.y = o.face || 0; scene.add(g);
  return g;
}
// Lying or reclining on one elbow (for a meal).
function recliner(scene, x, z, rot, robe, skin = 0) {
  const g = new THREE.Group();
  const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 2.4, 6, 12), mat(robe)); b.rotation.z = Math.PI / 2 - 0.25; b.position.set(0, 0.75, 0); g.add(b);
  const hd = new THREE.Mesh(new THREE.SphereGeometry(0.34, 14, 10), mat(SKIN[skin])); hd.position.set(-1.45, 1.35, 0); g.add(hd);
  g.position.set(x, 0, z); g.rotation.y = rot; scene.add(g); return g;
}
// A four-legged animal from simple shapes (ox, donkey, sheep, lion).
function beast(scene, x, z, o = {}) {
  const s = o.s || 1, m = mat(o.color ?? 0x7a5c44), g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.55 * s, 1.5 * s, 6, 12), m); body.rotation.z = Math.PI / 2; body.position.y = 1.35 * s; g.add(body);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.8 * s, 0.6 * s, 0.55 * s), m); head.position.set(1.45 * s, 1.75 * s, 0); g.add(head);
  [[-0.7, -0.3], [-0.7, 0.3], [0.7, -0.3], [0.7, 0.3]].forEach(([a, b]) => { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * s, 0.1 * s, 1.0 * s, 8), m); l.position.set(a * s, 0.5 * s, b * s); g.add(l); });
  if (o.ears) [-0.15, 0.15].forEach((b) => { const e = new THREE.Mesh(new THREE.ConeGeometry(0.08 * s, 0.55 * s, 6), m); e.position.set(1.4 * s, 2.25 * s, b * s); g.add(e); });
  if (o.horns) [-0.32, 0.32].forEach((b) => { const e = new THREE.Mesh(new THREE.ConeGeometry(0.07 * s, 0.5 * s, 6), mat(0xe9dfc8)); e.position.set(1.4 * s, 2.15 * s, b * s); e.rotation.x = b > 0 ? -0.9 : 0.9; g.add(e); });
  if (o.mane) { const mn = new THREE.Mesh(new THREE.SphereGeometry(0.62 * s, 14, 10), mat(o.mane)); mn.position.set(1.25 * s, 1.85 * s, 0); g.add(mn); head.position.x = 1.7 * s; }
  if (o.wool) { body.scale.set(1.25, 1.1, 1.25); }
  g.position.set(x, o.y || 0, z); g.rotation.y = o.face || 0; scene.add(g); return g;
}
function flame(scene, x, y, z, s = 1) {
  const f = new THREE.Mesh(new THREE.ConeGeometry(0.09 * s, 0.32 * s, 10), new THREE.MeshBasicMaterial({ color: 0xffb33b }));
  f.position.set(x, y + 0.16 * s, z); scene.add(f); return f;
}
function rock(scene, r, x, y, z, color = 0xb9ad96, sx = 1, sy = 1, sz = 1) {
  const m = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 1), mat(color, { rough: 1 })); m.scale.set(sx, sy, sz); m.position.set(x, y, z); scene.add(m); return m;
}
function hill(scene, r, x, z, h, color = 0x9aa36b) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), mat(color, { rough: 1 })); m.scale.y = h / r; m.position.set(x, 0, z); scene.add(m); return m;
}
function tree(scene, x, z, h = 8) {
  cyl(scene, 0.35, h * 0.55, x, 0, z, mat(0x6b5136), 8);
  const c = new THREE.Mesh(new THREE.SphereGeometry(h * 0.32, 14, 10), mat(0x6f8a4f, { rough: 1 })); c.scale.y = 0.75; c.position.set(x, h * 0.72, z); scene.add(c);
}
function horn(scene, x, y, z, s, m) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.12 * s, 0.32 * s, 10), m); c.position.set(x, y + 0.16 * s, z); scene.add(c); }
const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
const ref = (r) => "/bible/search?q=" + encodeURIComponent(r);

// ------------------------------------------------------------ the models

const MODELS = {
  tabernacle({ scene, labels }) {
    ground(scene, 160, C.sand);
    // Courtyard: 100 x 50 cubits, linen hangings 5 cubits high on posts (Exodus 27:9-18).
    const L = 50, W = 25, H = 5;
    const linen = mat(C.linen, { side: THREE.DoubleSide });
    const wall = (len, x, z, rot) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(len, H), linen); p.position.set(x, H / 2, z); p.rotation.y = rot; scene.add(p); };
    wall(100, 0, -W, 0); wall(100, 0, W, 0); wall(50, -L, 0, Math.PI / 2);
    wall(15, L, -17.5, Math.PI / 2); wall(15, L, 17.5, Math.PI / 2);
    const gate = new THREE.Mesh(new THREE.PlaneGeometry(20, H), mat(C.blue, { side: THREE.DoubleSide }));
    gate.position.set(L, H / 2, 0); gate.rotation.y = Math.PI / 2; scene.add(gate);
    for (let x = -L; x <= L; x += 5) { cyl(scene, 0.25, H, x, 0, -W, BRONZE, 8); cyl(scene, 0.25, H, x, 0, W, BRONZE, 8); }
    for (let z = -W; z <= W; z += 5) { cyl(scene, 0.25, H, -L, 0, z, BRONZE, 8); cyl(scene, 0.25, H, L, 0, z, BRONZE, 8); }
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
    const cover = new THREE.Mesh(new THREE.BoxGeometry(31, 0.6, 12), mat(C.hair)); cover.position.set(-25.5, 10.3, 0); tent.add(cover);
    const sideL = new THREE.Mesh(new THREE.BoxGeometry(31, 10, 0.3), mat(C.ram)); sideL.position.set(-25.5, 5.2, -6.05);
    const sideR = sideL.clone(); sideR.position.z = 6.05;
    const backC = new THREE.Mesh(new THREE.BoxGeometry(0.3, 10, 12), mat(C.ram)); backC.position.set(tx0 - 1, 5.2, 0);
    const roof = new THREE.Group(); roof.add(cover, sideL, sideR, backC); scene.add(roof);
    // Entrance screen and the veil before the Most Holy Place.
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), mat(C.blue, { side: THREE.DoubleSide, opacity: 0.9 }));
    screen.position.set(tx1, 5, 0); screen.rotation.y = Math.PI / 2; scene.add(screen);
    const veil = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), mat(0x5b2c6f, { side: THREE.DoubleSide }));
    veil.position.set(-30, 5, 0); veil.rotation.y = Math.PI / 2; scene.add(veil);
    // Furniture.
    box(scene, 2.5, 1.5, 1.5, -35, 0, 0, GOLD);                    // ark
    box(scene, 2, 1.5, 1, -20, 0, -3, GOLD);                        // table
    cyl(scene, 0.12, 2.6, -20, 0, 3, GOLD, 8);                       // lampstand
    for (let i = -3; i <= 3; i++) cyl(scene, 0.08, 0.6, -20, 2.3, 3 + i * 0.28, GOLD, 6);
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
    const stone = mat(C.stone, { rough: 0.85 });
    const cedar = mat(C.cedar);
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
    [[-6, "Boaz"], [6, "Jachin"]].forEach(([z]) => { cyl(scene, 12 / (2 * Math.PI), 18, 32, 0, z, BRONZE); cyl(scene, 2.4, 5, 32, 18, z, BRONZE, 20); });
    // The Sea: 10 across, 5 high, on twelve oxen (7:23-26). Bronze altar 20 x 20 x 10 (2 Chronicles 4:1).
    const seaZ = 28, seaX = 40;
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; box(scene, 1.6, 3, 1.2, seaX + Math.cos(a) * 3.5, 0, seaZ + Math.sin(a) * 3.5, BRONZE); }
    const sea = new THREE.Mesh(new THREE.CylinderGeometry(5, 4.2, 5, 32, 1, true), mat(C.bronze, { rough: 0.45, metal: 0.6, side: THREE.DoubleSide })); sea.position.set(seaX, 5.5, seaZ); scene.add(sea);
    const water = new THREE.Mesh(new THREE.CircleGeometry(4.8, 32), mat(0x5aa7b5, { rough: 0.2 })); water.rotation.x = -Math.PI / 2; water.position.set(seaX, 7.6, seaZ); scene.add(water);
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
    ground(scene, 320, 0x9fb7ad, false);
    const wood = mat(C.pitch, { rough: 0.9 });
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
    const pole = mat(C.acacia);
    [-0.55, 0.55].forEach((z) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 6.5, 10), pole); p.rotation.z = Math.PI / 2; p.position.set(0, 0.55, z * 1.45); scene.add(p); });
    [-1.05, 1.05].forEach((x) => [-0.8, 0.8].forEach((z) => { const r = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.03, 8, 16), GOLD); r.position.set(x, 0.55, z); scene.add(r); }));
    // Two cherubim facing each other, wings spread over the cover. Their form is not described; these are simple shapes.
    [-1, 1].forEach((s) => {
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 0.8, 12), GOLD); body.position.set(s * 0.95, 2.1, 0); scene.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 10), GOLD); head.position.set(s * 0.88, 2.6, 0); scene.add(head);
      [-1, 1].forEach((w) => {
        const wing = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.05, 0.42), GOLD);
        wing.position.set(s * 0.55, 2.55, w * 0.32); wing.rotation.z = s * -0.55; wing.rotation.x = w * 0.25; scene.add(wing);
      });
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
    cyl(scene, 0.55, 0.12, 0, 0, 0, GOLD, 32); cyl(scene, 0.3, 0.25, 0, 0.12, 0, GOLD, 24);
    cyl(scene, 0.07, top - 0.3, 0, 0.3, 0, GOLD, 12);
    [0.9, 1.6, 2.3, 2.9].forEach((y) => { const k = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 8), GOLD); k.position.set(0, y, 0); scene.add(k); });
    [0.45, 0.9, 1.35].forEach((r) => {
      const pts = []; for (let i = 0; i <= 24; i++) { const a = Math.PI + (i / 24) * Math.PI; pts.push(v3(r * Math.cos(a), cy + r * Math.sin(a), 0)); }
      scene.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.045, 8), GOLD));
      [Math.PI * 1.25, Math.PI * 1.75].forEach((a) => { const k = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), GOLD); k.position.set(r * Math.cos(a), cy + r * Math.sin(a), 0); scene.add(k); });
    });
    [-1.35, -0.9, -0.45, 0, 0.45, 0.9, 1.35].forEach((x) => {
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 8), GOLD); lamp.scale.y = 0.55; lamp.position.set(x, top + 0.04, 0); scene.add(lamp);
      flame(scene, x, top + 0.1, 0, 1);
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
    [-1.45, 1.45].forEach((x) => { box(scene, 0.3, 1.0, 2.2, x, y0 + 1.2, 1.2, GOLD); beast(scene, x * 1.45, 2.4, { color: 0xc9a13b, mane: 0xb8862b, s: 0.55, y: y0, face: -Math.PI / 2 }); });
    for (let i = 0; i < 6; i++) [-1, 1].forEach((sd) => beast(scene, sd * (3.2 - i * 0.3), 3.3 - i * 0.3 + 0.3, { color: 0xc9a13b, mane: 0xb8862b, s: 0.38, y: i * 0.5 + 0.5, face: -Math.PI / 2 }));
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
    const brook = new THREE.Mesh(new THREE.PlaneGeometry(200, 3.5), mat(0x5d9cb0, { rough: 0.2 })); brook.rotation.x = -Math.PI / 2; brook.rotation.z = 0.08; brook.position.set(0, 0.04, 6); scene.add(brook);
    for (let i = 0; i < 5; i++) rock(scene, 0.22, -3 + i * 0.5, 0.12, 4.2 + (i % 2) * 0.4, 0x9c9488);
    for (let i = 0; i < 40; i++) { figure(scene, -45 + (i % 20) * 4.5, -52 - Math.floor(i / 20) * 4, { robe: 0x6b7a4f, h: 3.8, skin: i % 4, face: Math.PI / 2 }); figure(scene, -45 + (i % 20) * 4.5, 52 + Math.floor(i / 20) * 4, { robe: 0x8a5a3c, h: 3.8, skin: (i + 2) % 4, face: -Math.PI / 2, cloth: 0xa88a52 }); }
    // Goliath: six cubits and a span (about 2.9 m) in the Hebrew text.
    const G = figure(scene, 0, 14, { h: 6.5, robe: 0x8f6a3c, skin: 2, cloth: 0xa86b3c, face: -Math.PI / 2 });
    const helm = new THREE.Mesh(new THREE.SphereGeometry(0.66, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), BRONZE); helm.position.set(0, 5.6, 14); scene.add(helm);
    const spear = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 9, 8), mat(0x6b4a2b)); spear.position.set(1.3, 4.2, 14); spear.rotation.x = 0.15; scene.add(spear);
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.2, 1, 8), mat(0x6f6f6f, { metal: 0.6, rough: 0.4 })); head.position.set(1.3, 8.9, 14.7); head.rotation.x = 0.15; scene.add(head);
    figure(scene, -0.5, 10.5, { h: 3.8, robe: 0x7c5a38, skin: 1, face: -Math.PI / 2 });
    box(scene, 2.4, 3.6, 0.2, -0.5, 0.3, 9.6, mat(0x8a6a40));
    // David: a youth with a staff, a sling and five smooth stones.
    figure(scene, 0, -2, { h: 3.7, robe: 0xb58a55, skin: 3, cloth: false, face: Math.PI / 2 });
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
    const water = new THREE.Mesh(new THREE.CircleGeometry(160, 64), mat(0x4f8fa6, { rough: 0.25 })); water.rotation.x = -Math.PI / 2; scene.add(water);
    hill(scene, 70, -90, -110, 22, 0x8fa36e); hill(scene, 80, 70, -130, 28, 0x9da874);
    // A first-century fishing boat like the one found by the Sea of Galilee in 1986:
    // about 8.3 m long, 2.3 m wide and 1.3 m deep (about 18 × 5 × 3 cubits).
    const wood = mat(0x7a5232, { side: THREE.DoubleSide });
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
    const stone = mat(0xd8cbb0, { rough: 0.95 });
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
    const plaster = mat(0xe6dccb, { rough: 0.95 });
    box(scene, 22, 9, 0.5, 0, 0, -10, plaster); box(scene, 0.5, 9, 20, -11, 0, 0, plaster); box(scene, 0.5, 9, 20, 11, 0, 0, plaster);
    // A triclinium: three low tables in a U, the guests reclining on their left side.
    const table = mat(0x7a5a3a);
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
    box(scene, 26, 11, 9, 0, 0, -6, mat(stone, { rough: 1 }));
    rock(scene, 6, -11, 6, -5, stone, 1.2, 1.1, 1); rock(scene, 5, 12, 5, -4, stone, 1.3, 1.1, 1); rock(scene, 4, 2, 11, -6, stone, 2.5, 0.6, 1.2);
    const door = new THREE.Mesh(new THREE.BoxGeometry(2.4, 3.2, 0.3), mat(0x1c1915)); door.position.set(0, 1.6, -1.4); scene.add(door);
    box(scene, 9, 0.4, 1.2, 3.5, 0, -0.9, mat(0xab9f86, { rough: 1 }));
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 0.8, 32), mat(0xb5a88d, { rough: 0.95 })); disc.rotation.x = Math.PI / 2; disc.position.set(4.6, 2.6, -0.9); scene.add(disc);
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

  "nebuchadnezzar-statue"({ scene, labels }) {
    ground(scene, 220, 0xd8c79c);
    // On the plain of Dura: an image of gold 60 cubits high and 6 wide (Daniel 3:1). Its form isn't described.
    box(scene, 12, 3, 12, 0, 0, 0, mat(0xb9a57e));
    box(scene, 6, 42, 4, 0, 3, 0, GOLD);
    box(scene, 9, 3, 4.4, 0, 45, 0, GOLD);
    const head = new THREE.Mesh(new THREE.SphereGeometry(3, 20, 14), GOLD); head.scale.y = 1.3; head.position.set(0, 52, 0); scene.add(head);
    box(scene, 4, 5, 3, 0, 56, 0, GOLD);
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
