/* Clearspring 3D: the shared kit every model is built from.
   Materials, textures drawn in code, primitives, people, animals and scenery.
   1 unit = 1 cubit (about 45 cm). */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

export { THREE, RoundedBoxGeometry };

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
  g.rotation.x = -Math.PI / 2; g.userData.noShadow = true; g.userData.skipFit = true;
  scene.add(g);
  if (grid) {
    const gh = new THREE.GridHelper(size * 1.6, Math.round(size * 1.6 / 10), 0x000000, 0x000000);
    gh.material.opacity = 0.05; gh.material.transparent = true; gh.position.y = 0.02; gh.userData.skipFit = true;
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
  g.position.set(x, o.y || 0, z); g.rotation.y = o.face || 0; if (o.skipFit) g.userData.skipFit = true; scene.add(g);
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
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 48, 20, 0, Math.PI * 2, 0, Math.PI / 2), mat(color, { rough: 1, tex: "grass", rep: 4 })); m.scale.y = h / r; m.position.set(x, 0, z); m.userData.skipFit = true; scene.add(m); return m;
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
function water(scene, size, y = 0) { const w = new THREE.Mesh(new THREE.CircleGeometry(size, 96), mat(0xffffff, { tex: "water", rough: 0.12, metal: 0.1, rep: size / 10 })); w.rotation.x = -Math.PI / 2; w.position.y = y; w.userData.noShadow = true; w.userData.skipFit = true; scene.add(w); return w; }
const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
const ref = (r) => "/bible/search?q=" + encodeURIComponent(r);



// ------------------------------------------------------------ more of the kit
// (added for the larger catalogue: most models are built only from these)

const MAT = {
  clay: mat(0xb8653a, { rough: 0.85 }), clayLight: mat(0xd49a6a, { rough: 0.85 }), clayDark: mat(0x7d4a2e, { rough: 0.9 }),
  stone: mat(0xffffff, { tex: "stone", rough: 0.95, rep: 1 }), rock: mat(0xc9bda6, { tex: "rock", rough: 1 }),
  basalt: mat(0x4a4744, { tex: "rock", rough: 1 }), limestone: mat(0xe6dcc6, { tex: "rock", rough: 0.95 }),
  leather: mat(0x7a4b2a, { rough: 0.8 }), leatherDark: mat(0x4e3020, { rough: 0.85 }),
  rope: mat(0xb39a6a, { rough: 1 }), linen: mat(0xffffff, { tex: "linen", rough: 1, side: THREE.DoubleSide }),
  wool: mat(0xe9e2d2, { rough: 1, tex: "linen", rep: 2 }), wood: mat(0xffffff, { tex: "wood", rough: 0.8 }),
  darkWood: mat(0x8a6a50, { tex: "wood", rough: 0.85 }), olive: mat(0xc49a6c, { tex: "wood", rough: 0.75 }),
  reed: mat(0xc8b27a, { rough: 0.9 }), ivory: mat(0xf2e8d2, { rough: 0.45 }), pitch: mat(0x2a2018, { rough: 0.6 }),
  iron: mat(0x55575c, { rough: 0.45, metal: 0.85 }), darkIron: mat(0x3b3c40, { rough: 0.6, metal: 0.7 }),
  gold: mat(C.gold, { rough: 0.22, metal: 1 }), silver: mat(0xd8dde2, { rough: 0.2, metal: 1 }), bronze: mat(C.bronze, { rough: 0.35, metal: 0.9 }),
  copper: mat(0xc0703f, { rough: 0.4, metal: 0.9 }), lead: mat(0x7d8287, { rough: 0.5, metal: 0.8 }),
  bread: mat(0xcf9b5b, { rough: 0.9 }), oil: mat(0x9a8a2a, { rough: 0.1 }), wine: mat(0x5a1428, { rough: 0.1 }),
  water: mat(0x4f8fa6, { rough: 0.05, metal: 0.1 }), leaf: mat(0x5f7d43, { rough: 0.9 }), bark: mat(0x6b5136, { rough: 1 }),
  red: mat(0x9b2a2a, { rough: 0.9 }), blue: mat(C.blue, { rough: 0.9 }), purple: mat(0x5b2c6f, { rough: 0.9 }), scarlet: mat(0xb3202a, { rough: 0.9 }),
  white: mat(0xf4f1ea, { rough: 0.9 }), black: mat(0x1d1b1a, { rough: 0.7 }), glass: mat(0xcfe8e8, { rough: 0.05, opacity: 0.45 }),
  parchment: mat(0xe8d9b0, { rough: 0.95, side: THREE.DoubleSide }), wax: mat(0x6b5a2a, { rough: 0.6 }),
  fire: new THREE.MeshBasicMaterial({ color: 0xff8a2a }), ember: new THREE.MeshBasicMaterial({ color: 0xd9582b }),
  glow: new THREE.MeshBasicMaterial({ color: 0xfff1b8 }), cloud: mat(0xffffff, { opacity: 0.55, rough: 1 }),
};

// Add any geometry: mesh(parent, geometry, material, x, y, z, rx, ry, rz).
function mesh(parent, geo, m, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); parent.add(o); return o;
}
function grp(parent, x = 0, y = 0, z = 0, ry = 0) { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; parent.add(g); return g; }
const sph = (p, r, m, x, y, z, sx = 1, sy = 1, sz = 1) => { const o = mesh(p, new THREE.SphereGeometry(r, 24, 16), m, x, y, z); o.scale.set(sx, sy, sz); return o; };
const cone = (p, r, h, m, x, y, z, rx = 0, rz = 0, seg = 24) => mesh(p, new THREE.ConeGeometry(r, h, seg), m, x, y, z, rx, 0, rz);
const tor = (p, r, t, m, x, y, z, rx = Math.PI / 2, ry = 0, arc = Math.PI * 2) => mesh(p, new THREE.TorusGeometry(r, t, 10, 36, arc), m, x, y, z, rx, ry);
// A rod between two points.
function rod(p, a, b, r, m, r2 = r, seg = 12) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A), len = d.length();
  const o = new THREE.Mesh(new THREE.CylinderGeometry(r2, r, len, seg), m);
  o.position.copy(A).add(d.multiplyScalar(0.5)); o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize()); p.add(o); return o;
}
// A tube along a smooth path through points [[x,y,z], ...].
function path(p, pts, r, m, seg = 48, closed = false) {
  return mesh(p, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((q) => new THREE.Vector3(...q)), closed), seg, r, 10, closed), m);
}
// A turned vessel (jar, bowl, lamp) from [radius, height] points, open so the inside shows.
function vessel(p, pts, m, x = 0, y = 0, z = 0, seg = 40) {
  const geo = new THREE.LatheGeometry(pts.map(([r, h]) => new THREE.Vector2(Math.max(0, r), h)), seg);
  const o = new THREE.Mesh(geo, m.side === THREE.DoubleSide ? m : dbl(m)); o.position.set(x, y, z); p.add(o); return o;
}
const DBL = new Map();
function dbl(m) { if (!DBL.has(m)) { const c = m.clone(); c.side = THREE.DoubleSide; DBL.set(m, c); } return DBL.get(m); }
// A flat outline [[x,y], ...] pushed out to a thickness, lying in the XY plane, centred on depth.
function slab(p, pts, depth, m, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, bevel = 0) {
  const s = new THREE.Shape(); pts.forEach(([a, b], i) => (i ? s.lineTo(a, b) : s.moveTo(a, b)));
  const geo = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 12 });
  geo.translate(0, 0, -depth / 2); return mesh(p, geo, m, x, y, z, rx, ry, rz);
}
// A rounded box: rbox(parent, w, h, d, x, y, z, material) sits on y like box().
function rbox(p, w, h, d, x, y, z, m, r) {
  const rr = r ?? Math.min(w, h, d) * 0.12;
  const geo = rr > 0.002 ? new RoundedBoxGeometry(w, h, d, 3, Math.min(rr, Math.min(w, h, d) / 2 - 1e-4)) : new THREE.BoxGeometry(w, h, d);
  return mesh(p, geo, m, x, y + h / 2, z);
}
// Words on a surface, drawn in code (inscriptions, coins, labels on scrolls).
function textTex(lines, o = {}) {
  const W = o.w || 512, H = o.h || 256;
  const c = document.createElement("canvas"); c.width = W; c.height = H; const g = c.getContext("2d");
  if (o.bg !== null) { g.fillStyle = o.bg || "#e8d9b0"; g.fillRect(0, 0, W, H); }
  g.fillStyle = o.ink || "#2a1d12"; g.textAlign = "center"; g.textBaseline = "middle";
  const size = o.size || Math.floor(H / (lines.length + 1)); g.font = `${o.weight || 600} ${size}px ${o.font || "Georgia, serif"}`;
  // Right-to-left text (Hebrew, Aramaic) is placed letter by letter from the right, so it reads
  // correctly whatever the browser's text engine does with direction.
  lines.forEach((l, i) => {
    const y = H * (i + 1) / (lines.length + 1);
    if (!o.rtl) { g.fillText(l, W / 2, y); return; }
    const chars = Array.from(l), widths = chars.map((ch) => g.measureText(ch).width), total = widths.reduce((a, b) => a + b, 0);
    let x = W / 2 + total / 2; g.textAlign = "right";
    chars.forEach((ch, k) => { g.fillText(ch, x, y); x -= widths[k]; });
    g.textAlign = "center";
  });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function textPlane(p, lines, w, h, x, y, z, o = {}) {
  const m = new THREE.MeshStandardMaterial({ map: textTex(lines, o), roughness: 0.9, transparent: !!o.transparent, side: THREE.DoubleSide });
  return mesh(p, new THREE.PlaneGeometry(w, h), m, x, y, z, o.rx || 0, o.ry || 0, o.rz || 0);
}
// A rolled scroll: two rollers and the sheet between, `open` cubits wide.
function scroll(p, x, y, z, len = 0.6, open = 0.5, o = {}) {
  const g = grp(p, x, y, z, o.ry || 0);
  [-1, 1].forEach((sd) => { const rx = sd * open / 2;
    mesh(g, new THREE.CylinderGeometry(0.05, 0.05, len, 24), MAT.parchment, rx, 0.05, 0, Math.PI / 2);
    if (o.handles !== false) [-1, 1].forEach((e) => mesh(g, new THREE.CylinderGeometry(0.012, 0.012, 0.14, 8), MAT.darkWood, rx, 0.05, e * (len / 2 + 0.07), Math.PI / 2)); });
  if (open > 0.1) { const sheet = mesh(g, new THREE.PlaneGeometry(open - 0.08, len * 0.98), o.text ? new THREE.MeshStandardMaterial({ map: textTex(o.text, { w: 512, h: 512, rtl: o.rtl, size: o.size || 34, ink: "#2a1d12" }), roughness: 0.95, side: THREE.DoubleSide }) : MAT.parchment, 0, 0.003, 0, -Math.PI / 2, 0, -Math.PI / 2); if (o.text) sheet.rotation.z = 0; }
  return g;
}
// A hand (for scale beside small things): palm, four fingers and a thumb, about 0.42 cubit long.
function hand(scene, labels, x, z, ry = -0.4) {
  const g = grp(scene, x, 0, z, ry), sk = mat(SKIN[1], { rough: 0.7 }); g.userData.skipFit = true;
  rbox(g, 0.19, 0.06, 0.2, 0, 0, 0, sk, 0.025);
  [-0.07, -0.024, 0.024, 0.07].forEach((zz, i) => { const L = [0.17, 0.2, 0.19, 0.15][i]; const f = mesh(g, new THREE.CapsuleGeometry(0.019, L, 6, 10), sk, 0.095 + L / 2, 0.03, zz, 0, 0, Math.PI / 2); f.rotation.y = (zz) * 0.6; });
  mesh(g, new THREE.CapsuleGeometry(0.022, 0.11, 6, 10), sk, 0.03, 0.03, 0.13, 0, -0.9, Math.PI / 2);
  labels.push({ pos: new THREE.Vector3(x, 0.12, z), text: "A hand, for scale", minor: true, detail: "An adult hand, about 19 cm long. A handbreadth (four fingers) was about 7.5 cm; a span (thumb to little finger) about 22 cm." });
  return g;
}
// The usual way to give scale: a person beside anything bigger than a hand, a hand beside small things.
function scale(scene, labels, x, z, small) {
  if (small) return hand(scene, labels, x, z);
  const g = figure(scene, x, z, { robe: 0x2f6f68, cloth: 0xe9e1cf, skin: 1, face: -Math.PI * 0.75, skipFit: true });
  labels.push({ pos: new THREE.Vector3(x, 4.6, z), text: "A person, for scale", minor: true,
    detail: "About 4 cubits (1.8 m) tall. A cubit was the length from elbow to fingertip, roughly 45 cm." });
  return g;
}
// A label, briefly: L(labels, [x,y,z], "Title", "What it is.", "Exodus 25:10", minor)
function L(labels, pos, text, detail, verse, minor = false, href) {
  labels.push({ pos: new THREE.Vector3(...pos), text, detail, href: href || (verse ? ref(verse) : undefined), hrefText: verse, minor });
}
// A low plinth or cloth for small objects to sit on.
function plinth(scene, r = 1, color = 0xe9e2d0) {
  const m = mesh(scene, new THREE.CylinderGeometry(r, r * 1.04, r * 0.08, 64), mat(color, { tex: "linen", rough: 1 }), 0, -r * 0.04, 0);
  m.userData.skipFit = true; m.userData.noShadow = true; return m;
}
// A palm tree, an olive tree, a vine stake and a bush, for scenery.
function palm(scene, x, z, h = 12) {
  const g = grp(scene, x, 0, z); g.userData.skipFit = true;
  path(g, [[0, 0, 0], [0.4, h * 0.4, 0.2], [0.9, h, 0.3]], 0.28, MAT.bark, 20);
  for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; path(g, [[0.9, h, 0.3], [0.9 + Math.cos(a) * 2, h + 0.8, 0.3 + Math.sin(a) * 2], [0.9 + Math.cos(a) * 3.6, h - 1.2, 0.3 + Math.sin(a) * 3.6]], 0.14, MAT.leaf, 12); }
  return g;
}
function olive(scene, x, z, h = 6, fit = false) {
  const g = grp(scene, x, 0, z); if (!fit) g.userData.skipFit = true;
  path(g, [[0, 0, 0], [0.4, h * 0.25, 0.2], [-0.2, h * 0.5, -0.1]], 0.45, MAT.bark, 16);
  path(g, [[0.1, h * 0.3, 0], [1.1, h * 0.55, 0.6]], 0.2, MAT.bark, 8);
  const lf = mat(0x7d8f63, { rough: 0.9 });
  [[0, 0.7, 0, 0.36], [0.9, 0.62, 0.6, 0.26], [-0.8, 0.66, -0.4, 0.28], [0.2, 0.84, -0.5, 0.24], [-0.3, 0.6, 0.8, 0.22]].forEach(([dx, dy, dz, r]) => { const c = mesh(g, new THREE.IcosahedronGeometry(h * r, 2), lf, dx * h * 0.4, h * dy, dz * h * 0.4); c.scale.y = 0.6; });
  return g;
}
function bush(scene, x, z, r = 1, color = 0x6f8a4f) { const g = grp(scene, x, 0, z); g.userData.skipFit = true; [[0, 0.6, 0, 1], [0.6, 0.45, 0.3, 0.7], [-0.5, 0.5, -0.3, 0.75]].forEach(([a, b, c, s]) => { const o = mesh(g, new THREE.IcosahedronGeometry(r * s, 1), mat(color, { rough: 1 }), a * r, b * r, c * r); o.scale.y = 0.75; }); return g; }
// A simple house of the time: flat roof, parapet, outside stair, door.
function house(scene, x, z, w = 10, d = 8, h = 7, ry = 0) {
  const g = grp(scene, x, 0, z, ry), pl = mat(0xffffff, { tex: "plaster", rough: 1 });
  rbox(g, w, h, d, 0, 0, 0, pl, 0.2); rbox(g, w + 0.3, 0.5, d + 0.3, 0, h, 0, mat(0x9a8a6a, { rough: 1 }), 0.1);
  [[0, d / 2], [0, -d / 2]].forEach(([a, b]) => rbox(g, w, 0.9, 0.3, a, h + 0.4, b, pl, 0.1)); [[w / 2], [-w / 2]].forEach(([a]) => rbox(g, 0.3, 0.9, d, a, h + 0.4, 0, pl, 0.1));
  mesh(g, new THREE.BoxGeometry(1.8, 3.4, 0.2), mat(0x5a3b22), w * 0.2, 1.7, d / 2 + 0.06);
  for (let i = 0; i < 8; i++) rbox(g, 1.6, (i + 1) * h / 8, 1.1, -w / 2 + 1 + i * 1.05, 0, d / 2 + 0.6, pl, 0.05);
  return g;
}
// A crowd of simple figures in a ring or a line, varied robes.
const ROBES = [0x8b6f4e, 0x6b7f8c, 0xa8875a, 0x7a5a6a, 0x5d7a5a, 0xb59a6e, 0x8c5a3c, 0x4f6a7d];
function people(scene, list) { list.forEach(([x, z, face, o = {}], i) => figure(scene, x, z, { robe: ROBES[i % ROBES.length], skin: i % 4, beard: i % 3 === 0, face, ...o })); }

// Many copies of one shape in a single draw call (grain fields, crowds of stones, seeds).
// items: [[x, y, z, rx, ry, rz, sx, sy, sz], ...] (rotations and scales optional).
function scatter(p, geo, m, items) {
  const im = new THREE.InstancedMesh(geo, m, items.length), o = new THREE.Object3D();
  items.forEach((it, i) => { o.position.set(it[0], it[1], it[2]); o.rotation.set(it[3] || 0, it[4] || 0, it[5] || 0); o.scale.set(it[6] ?? 1, it[7] ?? it[6] ?? 1, it[8] ?? it[6] ?? 1); o.updateMatrix(); im.setMatrixAt(i, o.matrix); });
  im.instanceMatrix.needsUpdate = true; im.computeBoundingBox?.(); im.computeBoundingSphere?.(); p.add(im); return im;
}

export { scatter, MAT, mesh, grp, sph, cone, tor, rod, path, vessel, dbl, slab, rbox, textTex, textPlane, scroll, hand, scale, L, plinth, palm, olive, bush, house, people, ROBES, BRONZE, C, GOLD, IRON, SILVER, SKIN, TEX, WOOD, beast, box, colossus, cyl, figure, flame, ground, hill, horn, lathe, mat, noiseCanvas, person, recliner, ref, rnd, rock, speckle, texture, tree, v3, water };
