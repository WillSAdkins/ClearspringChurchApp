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
