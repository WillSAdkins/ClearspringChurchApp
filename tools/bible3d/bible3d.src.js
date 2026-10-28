/* Clearspring: 3D Bible models and a relief map of the Holy Land.

   Built with three.js (MIT licence). This is the source; the app serves the
   bundled, minified copy in static/vendor/bible3d/. To rebuild:

     npm install three@0.186.1 esbuild
     npx esbuild tools/bible3d/bible3d.src.js --bundle --minify --format=esm \
       --splitting --chunk-names=[name]-[hash] --outdir=static/vendor/bible3d

   Models live in packs (pack-*.js), each built from the shared kit (kit.js).
   A page loads only the engine and its own pack, so adding models doesn't slow
   any page down. The list of models, with titles and references, is models3d.py.

   Models are built to the measurements the Bible gives, 1 unit = 1 cubit
   (about 45 cm). Where the text doesn't give a size, the info panel says so. */
import { THREE } from "./kit.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";


// Each pack is its own file, fetched only when one of its models is opened.
const PACKS = {
  core: () => import("./pack-core.js"),
  worship: () => import("./pack-worship.js"),
  war: () => import("./pack-war.js"),
  work: () => import("./pack-work.js"),
  home: () => import("./pack-home.js"),
  travel: () => import("./pack-travel.js"),
  places: () => import("./pack-places.js"),
  visions: () => import("./pack-visions.js"),
  nature: () => import("./pack-nature.js"),
  words: () => import("./pack-words.js"),
  passion: () => import("./pack-passion.js"),
  things: () => import("./pack-things.js"),
  stories: () => import("./pack-stories.js"),
  prophets: () => import("./pack-prophets.js"),
  gospel: () => import("./pack-gospel.js"),
};

async function start(root) {
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
  let MODELS;
  try { MODELS = (await (PACKS[root.dataset.pack] || PACKS.core)()).MODELS; }
  catch (e) { root.classList.add("b3d-failed"); return; }
  const build = MODELS[kind] || Object.values(MODELS)[0];
  const model = build({ scene, labels, root }) || {};
  if (!model.camera) autoFrame(scene, model, stage.clientWidth / Math.max(1, stage.clientHeight));
  camera.near = model.near || (model.size && model.size < 3 ? Math.max(0.004, model.size * 0.01) : 0.05);
  camera.updateProjectionMatrix();
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
  root.classList.add("b3d-ready");

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

/* Most models don't say where to put the camera: look at everything that isn't
   ground or water, from a three-quarter view a little above. */
function autoFrame(scene, model, aspect = 1) {
  const box = new THREE.Box3(), b = new THREE.Box3();
  scene.updateMatrixWorld(true);
  scene.traverse((o) => {
    if (!o.isMesh || o.userData.skipFit) return;
    let p = o, skip = false; while (p) { if (p.userData && p.userData.skipFit) { skip = true; break; } p = p.parent; }
    if (skip) return;
    if (o.isInstancedMesh) { o.computeBoundingBox(); b.copy(o.boundingBox).applyMatrix4(o.matrixWorld); } else { o.geometry.computeBoundingBox(); b.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld); }
    box.union(b);
  });
  if (box.isEmpty()) box.set(new THREE.Vector3(-1, 0, -1), new THREE.Vector3(1, 2, 1));
  const c = box.getCenter(new THREE.Vector3()), r = Math.max(0.05, box.getSize(new THREE.Vector3()).length() / 2);
  const dir = (model.view || new THREE.Vector3(0.75, 0.55, 1)).clone().normalize();
  model.target = model.target || c;
  // Far enough back that the whole model fits the narrower side of the view.
  const half = Math.atan(Math.tan((40 / 2) * Math.PI / 180) * Math.min(1, aspect));
  model.camera = model.target.clone().add(dir.multiplyScalar(r / Math.sin(half) * (model.zoom || 0.95)));
  model.size = model.size || r * 1.6;
  model.minDist = model.minDist || r * 0.5;
  model.maxDist = model.maxDist || r * 7;
  model.minorDist = model.minorDist || r * 3.2;
}

const root = document.getElementById("b3d");
if (root) start(root);
