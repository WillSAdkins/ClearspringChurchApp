/* Boats, carts and chariots. 1 unit = 1 cubit (about 45 cm). */
import {
  THREE, MAT, C, GOLD, BRONZE, SILVER, IRON, mat, mesh, grp, sph, cone, tor, rod, path, vessel, slab, rbox, box, cyl,
  textPlane, scale, L, plinth, ground, figure, beast, flame, rock, hill, v3, ref, bush, olive, palm, water,
} from "./kit.js";

// A planked hull: a lathe-like shape stretched along x, open at the top. len, beam, depth in cubits.
function hull(p, len, beam, depth, m, x = 0, y = 0, z = 0) {
  const g = grp(p, x, y, z);
  const n = 28, segs = 16, pos = [], idx = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, xx = (t - 0.5) * len;
    const w = beam / 2 * Math.pow(Math.sin(Math.PI * t), 0.55), d = depth * (0.85 + 0.15 * Math.sin(Math.PI * t));
    const sheer = depth * 0.35 * Math.pow(Math.abs(t - 0.5) * 2, 3);
    for (let j = 0; j <= segs; j++) { const a = Math.PI * (j / segs); pos.push(xx, d - Math.sin(a) * d + sheer * (Math.abs(Math.cos(a))), Math.cos(a) * w); }
  }
  for (let i = 0; i < n; i++) for (let j = 0; j < segs; j++) { const a = i * (segs + 1) + j, b = a + segs + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
  const uv = []; for (let i = 0; i <= n; i++) for (let j = 0; j <= segs; j++) uv.push(i / n * len / 3, j / segs * 2); geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  mesh(g, geo, m.side === THREE.DoubleSide ? m : (() => { const c = m.clone(); c.side = THREE.DoubleSide; return c; })());
  return g;
}
function sail(p, x, y, z, w, h, col = 0xefe6d2, billow = 0.6) {
  const geo = new THREE.PlaneGeometry(w, h, 12, 8), pp = geo.attributes.position;
  for (let i = 0; i < pp.count; i++) { const a = pp.getX(i) / w, b = pp.getY(i) / h; pp.setZ(i, billow * (1 - 4 * a * a) * (1 - 4 * b * b) * 0.9 + billow * 0.2); }
  geo.computeVertexNormals();
  return mesh(p, geo, mat(col, { rough: 0.95, tex: "linen", side: THREE.DoubleSide }), x, y, z, 0, Math.PI / 2, 0);
}
function sea(scene, size = 200) { const s = mesh(scene, new THREE.PlaneGeometry(size, size), mat(0xffffff, { tex: "water", rough: 0.12, metal: 0.1, rep: size / 10 }), 0, 0, 0, -Math.PI / 2); s.userData.skipFit = true; s.userData.noShadow = true; return s; }
function wheel(p, x, y, z, r, m, spokes = 6, rx = 0) {
  const g = grp(p, x, y, z); g.rotation.x = rx;
  tor(g, r, r * 0.08, m, 0, 0, 0, 0, 0);
  for (let i = 0; i < spokes; i++) rod(g, [0, 0, 0], [Math.cos(i * Math.PI * 2 / spokes) * r, Math.sin(i * Math.PI * 2 / spokes) * r, 0], r * 0.045, m);
  mesh(g, new THREE.CylinderGeometry(r * 0.13, r * 0.13, r * 0.35, 16), m, 0, 0, 0, Math.PI / 2);
  return g;
}

export const MODELS = {
  "pauls-ship"({ scene, labels }) {
    sea(scene);
    // An Alexandrian grain ship, carrying 276 people, wrecked off Malta (Acts 27). Big grain ships
    // were about 55 m long; the Bible gives no size.
    const s = grp(scene, 0, -2.2, 0);
    hull(s, 110, 24, 13, mat(0xffffff, { tex: "wood", rough: 0.85, rep: 2 }));
    rbox(s, 100, 0.6, 20, 0, 11.4, 0, MAT.wood, 0.1);
    // Stern post curving up like a goose neck, and the steering oars.
    path(s, [[-55, 11, 0], [-60, 18, 0], [-56, 22, 0], [-53, 20, 0]], 1.0, MAT.darkWood, 20);
    [-1, 1].forEach((sd) => rod(s, [-48, 16, sd * 10], [-56, -2, sd * 12], 0.6, MAT.darkWood));
    rbox(s, 14, 6, 14, -40, 12, 0, mat(0xffffff, { tex: "wood", rough: 0.85 }), 0.3);
    // Main mast and square sail, small foresail (the artemon) raised at the end (27:40).
    rod(s, [0, 12, 0], [0, 70, 0], 1.0, MAT.darkWood); rod(s, [0, 64, -28], [0, 64, 28], 0.6, MAT.darkWood);
    sail(s, 1.2, 46, 0, 54, 34, 0xe8dcc0, 3);
    rod(s, [45, 12, 0], [62, 32, 0], 0.5, MAT.darkWood); sail(s, 55, 26, 0, 12, 10, 0xe8dcc0, 1);
    // Undergirding cables passed round the hull (27:17).
    [-15, 5, 25].forEach((x) => { const t = mesh(s, new THREE.TorusGeometry(12.5, 0.25, 6, 40, Math.PI), MAT.rope, x, 12, 0, 0, Math.PI / 2, 0); t.rotation.set(Math.PI, Math.PI / 2, 0); });
    // Four anchors from the stern (27:29), the ship's boat on its rope (27:16, 30-32).
    for (let i = 0; i < 4; i++) path(s, [[-54, 13, -3 + i * 2], [-64, 6, -4 + i * 2.6], [-70, -4, -6 + i * 4]], 0.2, MAT.rope, 20);
    const boat = hull(scene, 14, 5, 2.4, MAT.wood, -78, -0.8, 6); void boat;
    rod(scene, [-56, 11, 3], [-72, 0.6, 6], 0.15, MAT.rope);
    for (let i = 0; i < 14; i++) figure(s, -30 + i * 4.5, -6 + (i % 3) * 5, { robe: [0x8b6f4e, 0x6b7f8c, 0xa3302a, 0x5d7a5a][i % 4], skin: i % 4, y: 12, h: 4, cloth: i % 4 === 2 ? false : undefined, face: Math.PI / 2 });
    L(labels, [0, 74, 0], "An Alexandrian grain ship", "Carrying wheat from Egypt to Rome, with 276 people on board. A storm called the north-easter drove it for fourteen days.", "Acts 27:6, 14, 37–38");
    L(labels, [-20, 16, 13], "Ropes round the hull", "“They used supports to undergird the ship” to hold the planks together in the storm.", "Acts 27:17", true);
    L(labels, [-68, 2, 0], "Four anchors from the stern", "“Fearing that we might run on the rocks, they let down four anchors from the stern and prayed for day to come.”", "Acts 27:29");
    L(labels, [-78, 4, 6], "The ship's boat", "The sailors tried to escape in it; Paul warned the centurion, and the soldiers cut it loose.", "Acts 27:30–32", true);
    L(labels, [55, 34, 0], "The foresail", "At the end they hoisted the foresail to the wind and made for the beach. Everyone reached land safely.", "Acts 27:40–44", true);
    return { view: v3(1, 0.45, 1.1), target: v3(-10, 20, 0), zoom: 0.8 };
  },

  "jonahs-ship"({ scene, labels }) {
    sea(scene);
    // A merchant ship from Joppa bound for Tarshish; the sailors throw the cargo overboard, then Jonah
    // (Jonah 1:3-16). The great fish below (1:17).
    const s = grp(scene, 0, -1.4, 0); s.rotation.z = 0.12; s.rotation.x = -0.08;
    hull(s, 50, 13, 7, mat(0xffffff, { tex: "wood", rough: 0.85, rep: 2 }));
    rbox(s, 44, 0.4, 10, 0, 6.2, 0, MAT.wood, 0.05);
    rod(s, [0, 6, 0], [0, 34, 0], 0.5, MAT.darkWood); rod(s, [0, 31, -14], [0, 31, 14], 0.35, MAT.darkWood); sail(s, 0.8, 21, 0, 26, 18, 0xd8c8a0, 2);
    path(s, [[25, 6.5, 0], [29, 11, 0], [27.5, 14, 0]], 0.6, MAT.darkWood, 12);
    for (let i = 0; i < 6; i++) vessel(scene, [[0, 0], [0.5, 0.05], [0.8, 0.8], [0.7, 1.7], [0.3, 2.1]], MAT.clay, 18 + i * 3, -0.5, 9 + (i % 2) * 3).rotation.z = 1.2 + i;
    for (let i = 0; i < 5; i++) figure(s, -12 + i * 6, -2 + (i % 2) * 3, { robe: [0x6b7f8c, 0x8b6f4e, 0xa3302a, 0x5d7a5a, 0x4f6a7d][i], cloth: false, skin: i % 4, y: 6.4, raise: i % 2 === 0, face: Math.PI / 2 });
    // The fish.
    const f = grp(scene, -22, -1.6, 18, 0.5); f.userData.skipFit = true;
    sph(f, 5, mat(0x4a5a66, { rough: 0.4 }), 0, 0, 0, 2.6, 0.6, 0.9);
    slab(f, [[0, 0], [5, 4], [5, -4]], 0.6, mat(0x4a5a66, { rough: 0.4 }), 12, 0, 0);
    L(labels, [0, 38, 0], "A ship for Tarshish", "Jonah paid the fare at Joppa to sail as far as he could from the presence of the LORD: Tarshish was probably in Spain, the far west.", "Jonah 1:3");
    L(labels, [21, 4, 10], "Cargo overboard", "The sailors were afraid; each cried out to his god, and they threw the cargo into the sea to lighten the ship.", "Jonah 1:5");
    L(labels, [-22, 5, 18], "A great fish", "“The LORD appointed a great fish to swallow up Jonah. And Jonah was in the belly of the fish three days and three nights.”", "Jonah 1:17; Matthew 12:40");
    return { view: v3(0.9, 0.4, 1.1), target: v3(0, 12, 0), zoom: 0.85 };
  },

  "moses-basket"({ scene, labels }) {
    const w = mesh(scene, new THREE.CircleGeometry(40, 48), mat(0xffffff, { tex: "water", rough: 0.12, metal: 0.1, rep: 6 }), 0, 0, 0, -Math.PI / 2); w.userData.skipFit = true; w.userData.noShadow = true;
    // A basket of papyrus reeds daubed with bitumen and pitch, among the reeds by the Nile (Exodus 2:3-6).
    const b = grp(scene, 0, 0.05, 0, 0.3);
    const bk = vessel(b, [[0, 0], [0.55, 0], [0.75, 0.25], [0.8, 0.55]], mat(0x6a5a2a, { rough: 0.7, tex: "linen", rep: 4 })); bk.scale.set(1.8, 1, 1);
    tor(b, 0.8, 0.06, mat(0x3a2a1a, { rough: 0.5 }), 0, 0.55, 0).scale.set(1.8, 1, 1);
    const lid = mesh(b, new THREE.SphereGeometry(0.8, 24, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x7a6a3a, { rough: 0.8, tex: "linen", rep: 4 }), -0.4, 0.55, 0); lid.scale.set(1.0, 0.35, 0.9);
    mesh(b, new THREE.CapsuleGeometry(0.16, 0.4, 8, 12), mat(0xf2ede0, { tex: "linen", rough: 1 }), 0.4, 0.4, 0, 0, 0, Math.PI / 2); sph(b, 0.14, mat(0xa8714a, { rough: 0.7 }), 0.75, 0.45, 0);
    // Papyrus reeds.
    for (let i = 0; i < 60; i++) { const a = i * 2.4, r = 2.2 + (i % 7) * 0.4; if (Math.cos(a) > 0.5 && Math.sin(a) > -0.2) continue; const g = grp(scene, Math.cos(a) * r, 0, Math.sin(a) * r); g.userData.skipFit = true; rod(g, [0, 0, 0], [Math.sin(i) * 0.3, 4 + (i % 5) * 0.5, 0], 0.05, MAT.leaf); for (let k = 0; k < 10; k++) rod(g, [Math.sin(i) * 0.3, 4 + (i % 5) * 0.5, 0], [Math.sin(i) * 0.3 + Math.cos(k) * 0.5, 4.5 + (i % 5) * 0.5, Math.sin(k) * 0.5], 0.015, MAT.leaf); }
    figure(scene, -4, -2, { robe: 0x7a5a6a, cloth: 0x5a3a4a, skin: 2, h: 3.4, face: 0.4, skipFit: true });
    L(labels, [0, 1.4, 0], "A basket among the reeds", "When she could hide him no longer, his mother took a basket made of papyrus, coated it with bitumen and pitch, put the child in it and placed it among the reeds by the river bank.", "Exodus 2:3");
    L(labels, [-4, 4, -2], "His sister watched", "Miriam stood at a distance to see what would happen, then offered Pharaoh's daughter a nurse: his own mother.", "Exodus 2:4–9", true);
    L(labels, [0.5, 0.8, 0.6], "The same word as the ark", "The Hebrew word for basket, tevah, is used only here and for Noah's ark.", "Genesis 6:14", true, "/bible/3d/ark");
    return { view: v3(0.7, 0.6, 1) };
  },

  "new-cart"({ scene, labels }) {
    ground(scene, 40, 0xb8ad7c, false);
    // The Philistines sent the ark home on a new cart drawn by two milk cows (1 Samuel 6:7-14);
    // later David moved it on a new cart and Uzzah died (2 Samuel 6:3-7).
    const c = grp(scene, 0, 0, 0);
    rbox(c, 6, 0.3, 3.2, 0, 1.6, 0, MAT.wood, 0.05);
    [[-1.6], [1.6]].forEach(([z]) => rbox(c, 6, 0.8, 0.2, 0, 1.9, z, MAT.wood, 0.03));
    [-1.8, 1.8].forEach((x) => [-1.9, 1.9].forEach((z) => wheel(c, x, 1.0, z, 1.0, mat(0x7a5a3a, { rough: 0.8 }), 0)));
    [-1.8, 1.8].forEach((x) => rod(c, [x, 1.0, -2.1], [x, 1.0, 2.1], 0.08, MAT.darkWood));
    rod(c, [3, 1.7, 0], [7, 2.2, 0], 0.1, MAT.darkWood);
    const ark = grp(c, -0.3, 1.75, 0); box(ark, 2.5, 1.5, 1.5, 0, 0, 0, GOLD); box(ark, 2.56, 0.12, 1.56, 0, 1.5, 0, GOLD);
    [-1, 1].forEach((sd) => { const ch = grp(ark, sd * 0.85, 1.62, 0, sd > 0 ? Math.PI : 0); vessel(ch, [[0, 0], [0.2, 0], [0.12, 0.45], [0, 0.55]], GOLD); slab(ch, [[0, 0.35], [-0.8, 0.9], [-0.45, 0.3]], 0.04, GOLD); });
    const box2 = rbox(c, 1.2, 0.8, 1, 2, 1.75, 0.6, MAT.olive, 0.05); void box2;
    beast(scene, 8.6, -1.1, { color: 0xc8a878, horns: true, s: 1.2 }); beast(scene, 8.6, 1.1, { color: 0x8a5a3a, horns: true, s: 1.2 });
    L(labels, [-0.3, 5.0, 0], "The ark on a cart", "The Philistines put the ark and a box of gold offerings on a new cart and sent it off with two cows. Lowing as they went, the cows went straight to Beth-shemesh.", "1 Samuel 6:7–14");
    L(labels, [7, 4.2, 0], "Not the way God gave", "The ark was meant to be carried on poles by the Levites. When David moved it on a cart, the oxen stumbled and Uzzah took hold of it.", "2 Samuel 6:3–7; 1 Chronicles 15:13–15");
    L(labels, [2, 3, 0.6], "Gold offerings", "Five gold tumours and five gold mice, one for each Philistine city.", "1 Samuel 6:4–5, 17–18", true);
    return { view: v3(0.8, 0.5, 1.1) };
  },

  "camel-and-needle"({ scene, labels }) {
    ground(scene, 30, C.sand, false);
    // “It is easier for a camel to go through the eye of a needle than for a rich person to enter the
    // kingdom of God” (Mark 10:25). A dromedary with saddle bags beside a large needle.
    const cm = mat(0xc8a070, { rough: 0.9 }), g = grp(scene, 0, 0, 0);
    sph(g, 1.6, cm, 0, 4.4, 0, 1.6, 0.9, 0.85); sph(g, 1.0, cm, 0, 5.6, 0, 1.0, 0.9, 0.9);
    [[-1.4, -0.6], [-1.4, 0.6], [1.6, -0.6], [1.6, 0.6]].forEach(([x, z]) => { rod(g, [x, 4, z], [x * 1.05, 2, z], 0.25, cm, 0.2); rod(g, [x * 1.05, 2, z], [x * 1.1, 0.1, z], 0.16, cm, 0.13); sph(g, 0.25, cm, x * 1.1, 0.1, z, 1.2, 0.5, 1); });
    path(g, [[2.2, 4.8, 0], [3.4, 5.6, 0], [3.9, 7.2, 0], [4.4, 7.8, 0]], 0.4, cm, 20);
    sph(g, 0.5, cm, 4.9, 7.8, 0, 1.6, 0.8, 0.8); [-0.25, 0.25].forEach((z) => cone(g, 0.1, 0.35, cm, 4.5, 8.4, z));
    path(g, [[-2.4, 4.6, 0], [-2.7, 3.4, 0.1], [-2.6, 2.6, 0]], 0.08, cm, 10);
    const sad = mesh(g, new THREE.SphereGeometry(1.5, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xa3302a, { rough: 1, tex: "linen" }), 0, 6.2, 0); sad.scale.set(0.8, 0.4, 0.75);
    [-1, 1].forEach((sd) => { const b = sph(g, 0.8, mat(0x8a5a3a, { rough: 0.9, tex: "linen" }), -0.3, 4.6, sd * 1.5, 1.1, 1.0, 0.5); void b; });
    // The needle: a bronze sewing needle, enlarged a hundred times beside the camel.
    const nd = grp(scene, -5, 0, 2.5, 0.3);
    const ndl = mesh(nd, new THREE.CylinderGeometry(0.12, 0.004, 6.5, 16), BRONZE, 0, 3.4, 0); void ndl;
    const eye = mesh(nd, new THREE.TorusGeometry(0.2, 0.08, 10, 24), BRONZE, 0, 6.4, 0, 0, Math.PI / 2, 0); eye.scale.y = 1.8;
    L(labels, [0, 9.4, 0], "Through the eye of a needle", "The largest animal they knew and the smallest opening: a deliberately impossible picture. “With man it is impossible, but not with God. For all things are possible with God.”", "Mark 10:25–27");
    L(labels, [-5, 7.6, 2.5], "A needle, enlarged", "This bronze needle is shown about a hundred times its real size. (The story of a small “Needle Gate” in Jerusalem is a later invention.)", "Matthew 19:24", true);
    L(labels, [-0.3, 5.2, 1.6], "Camels in the Bible", "Abraham's servant took ten camels to find a wife for Isaac; the Queen of Sheba brought spices on camels.", "Genesis 24:10; 1 Kings 10:2", true);
    return { view: v3(0.8, 0.35, 1.1) };
  },

  "ethiopians-chariot"({ scene, labels }) {
    ground(scene, 60, 0xc8b48a, false);
    // On the desert road from Jerusalem to Gaza, the Ethiopian official reads Isaiah aloud in his
    // chariot; Philip runs up (Acts 8:26-39). A travelling carriage, roofed against the sun.
    const road = mesh(scene, new THREE.PlaneGeometry(5, 80), mat(0xb8a478, { rough: 1, tex: "sand", rep: 4 }), 0, 0.02, 0, -Math.PI / 2, 0, Math.PI / 2); road.userData.skipFit = true;
    const c = grp(scene, 0, 0, 0);
    [-1.7, 1.7].forEach((z) => wheel(c, -0.8, 1.6, z, 1.5, mat(0x7a5a3a, { rough: 0.7 }), 8));
    rod(c, [-0.8, 1.6, -2], [-0.8, 1.6, 2], 0.08, MAT.darkWood);
    rbox(c, 3.4, 1.2, 2.8, -0.6, 1.7, 0, mat(0x2d4f8c, { rough: 0.8 }), 0.1);
    for (let i = 0; i < 4; i++) rod(c, [-2.1 + (i % 2) * 3, 2.9, i < 2 ? -1.3 : 1.3], [-2.1 + (i % 2) * 3, 5, i < 2 ? -1.3 : 1.3], 0.05, GOLD);
    rbox(c, 3.4, 0.2, 2.9, -0.6, 5, 0, mat(0xe9e1cf, { rough: 1, tex: "linen" }), 0.05);
    path(c, [[1.1, 1.9, 0], [3.2, 2.3, 0], [5.5, 3.0, 0]], 0.08, MAT.darkWood, 10);
    beast(scene, 6.4, -1.1, { color: 0xe8e0d0, ears: true, s: 1.4 }); beast(scene, 6.4, 1.1, { color: 0xe0d6c4, ears: true, s: 1.4 });
    const off = figure(c, -0.8, 0, { robe: 0xd9a440, cloth: 0xffffff, skin: 2, sit: true, reach: true, y: 2.9, face: Math.PI / 2, h: 3.8 }); void off;
    const sc = grp(c, 0.2, 4.5, 0); rod(sc, [0, 0, -0.35], [0, 0, 0.35], 0.04, MAT.parchment); rod(sc, [0.35, 0, -0.35], [0.35, 0, 0.35], 0.04, MAT.parchment); mesh(sc, new THREE.PlaneGeometry(0.35, 0.65), MAT.parchment, 0.17, 0, 0, -Math.PI / 2);
    figure(scene, 1.5, 3.4, { robe: 0x6b5236, beard: true, reach: true, face: -0.2 });
    L(labels, [-0.8, 7.2, 0], "Reading Isaiah", "“Like a sheep he was led to the slaughter…” “Do you understand what you are reading?” “How can I, unless someone guides me?”", "Acts 8:30–35; Isaiah 53:7–8");
    L(labels, [1.5, 4.6, 3.4], "Philip", "The Spirit said, “Go over and join this chariot.” Philip ran to it and heard him reading.", "Acts 8:29–30");
    L(labels, [-3, 3, 0], "A court official of Candace", "Treasurer to the queen of the Ethiopians (the kingdom of Kush, on the upper Nile). He was baptised and went on his way rejoicing.", "Acts 8:27, 36–39", true);
    return { view: v3(0.8, 0.45, 1.1), target: v3(1, 2.5, 0.5) };
  },

  "cedar-rafts"({ scene, labels }) {
    sea(scene);
    // Hiram's servants brought cedar and cypress down from Lebanon to the sea and floated them in
    // rafts to the place Solomon chose (1 Kings 5:6-9; 2 Chronicles 2:16).
    for (let r = 0; r < 3; r++) { const raft = grp(scene, r * 14 - 14, 0.1, r * 4 - 4, 0.15 * r);
      for (let i = 0; i < 9; i++) rod(raft, [-6, 0, -2.4 + i * 0.6], [6, 0, -2.4 + i * 0.6], 0.32, mat(0xa0784a, { tex: "wood", rough: 0.85 }));
      [-4, 0, 4].forEach((x) => rod(raft, [x, 0.3, -2.8], [x, 0.3, 2.8], 0.08, MAT.rope));
      figure(raft, 3, 0, { robe: 0x4f6a7d, cloth: false, skin: 1, y: 0.3, reach: true, face: 0, h: 3.8 }); rod(raft, [3.6, -2, 0.3], [3.4, 5, 0.6], 0.06, MAT.darkWood); }
    const shore = mesh(scene, new THREE.PlaneGeometry(80, 30), mat(0xffffff, { tex: "sand", rough: 1, rep: 6 }), 0, 0.05, -38, -Math.PI / 2); shore.userData.skipFit = true;
    for (let i = 0; i < 6; i++) { const t = grp(scene, -30 + i * 11, 0, -40); t.userData.skipFit = true; rod(t, [0, 0, 0], [0, 14, 0], 0.5, MAT.bark); for (let k = 0; k < 4; k++) { const d = mesh(t, new THREE.CylinderGeometry(4.5 - k, 4.8 - k, 0.6, 12), MAT.leaf, 0, 6 + k * 2.5, 0); void d; } }
    L(labels, [0, 4, 0], "Rafts of cedar", "“My servants shall bring it down to the sea from Lebanon, and I will make it into rafts to go by sea to the place you direct.”", "1 Kings 5:9");
    L(labels, [0, 18, -40], "The cedars of Lebanon", "Huge, fragrant and long-lasting: Solomon's temple was panelled inside with cedar, “no stone was seen”.", "1 Kings 6:15–18", true, "/bible/3d/cedar");
    L(labels, [14, 4, 4], "To Joppa", "Then on to Jerusalem by land. Solomon paid Hiram in wheat and olive oil each year.", "2 Chronicles 2:16; 1 Kings 5:11", true);
    return { view: v3(0.8, 0.6, 1.1), zoom: 0.7 };
  },

  "ship-of-tyre"({ scene, labels }) {
    sea(scene);
    // Ezekiel's lament pictures proud Tyre as a splendid ship: planks of fir from Senir, a mast of
    // cedar from Lebanon, oars of oak from Bashan, a deck of pine inlaid with ivory, a sail of
    // embroidered linen from Egypt, an awning of blue and purple (Ezekiel 27:3-9, 26-36).
    const s = grp(scene, 0, -1.4, 0);
    hull(s, 60, 14, 8, mat(0xffffff, { tex: "wood", rough: 0.6, rep: 2 }));
    rbox(s, 54, 0.4, 11, 0, 7.2, 0, MAT.ivory, 0.05);
    for (let i = 0; i < 12; i++) [-1, 1].forEach((sd) => rod(s, [-22 + i * 4, 6.5, sd * 6.5], [-22 + i * 4 - 3, -1, sd * 14], 0.18, MAT.darkWood));
    rod(s, [0, 7, 0], [0, 40, 0], 0.6, mat(0xa0784a, { tex: "wood", rough: 0.7 }));
    rod(s, [0, 37, -16], [0, 37, 16], 0.4, mat(0xa0784a, { tex: "wood", rough: 0.7 }));
    const c = document.createElement("canvas"); c.width = 256; c.height = 256; const g = c.getContext("2d"); g.fillStyle = "#f2ede0"; g.fillRect(0, 0, 256, 256); g.strokeStyle = "#5b2c6f"; g.lineWidth = 10; for (let i = 0; i < 6; i++) { g.strokeRect(16 + i * 12, 16 + i * 12, 224 - i * 24, 224 - i * 24); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const sl = sail(s, 0.8, 25, 0, 30, 22, 0xffffff, 2.4); sl.material = new THREE.MeshStandardMaterial({ map: t, roughness: 0.95, side: THREE.DoubleSide });
    rbox(s, 12, 0.3, 11, -20, 12, 0, mat(0x5b2c6f, { rough: 0.9, tex: "linen" }), 0.05);
    for (let i = 0; i < 4; i++) rod(s, [-25 + i * 3.5, 7.4, -5], [-25 + i * 3.5, 12, -5], 0.12, GOLD), rod(s, [-25 + i * 3.5, 7.4, 5], [-25 + i * 3.5, 12, 5], 0.12, GOLD);
    path(s, [[30, 7, 0], [34, 13, 0], [31, 16, 0]], 0.7, MAT.darkWood, 12);
    L(labels, [0, 44, 0], "Tyre, a splendid ship", "“O Tyre, you have said, ‘I am perfect in beauty.’” Ezekiel pictures the trading city as a ship built of the best of everything.", "Ezekiel 27:3–4");
    L(labels, [16, 26, 1], "A sail of embroidered linen", "From Egypt, to serve as her banner; her awning blue and purple from the coasts of Elishah.", "Ezekiel 27:7");
    L(labels, [-10, 8, 9], "Oars of oak from Bashan", "Planks of fir, a mast of cedar, a deck of pines inlaid with ivory.", "Ezekiel 27:5–6", true);
    L(labels, [26, 9, 0], "Wrecked in the heart of the seas", "“The east wind has wrecked you.” Sailors on every coast lament her.", "Ezekiel 27:26–36", true);
    return { view: v3(0.9, 0.4, 1.1), target: v3(0, 16, 0), zoom: 0.85 };
  },

  palanquin({ scene, labels }) {
    ground(scene, 30, C.sand, false);
    // King Solomon made himself a carriage of wood from Lebanon: posts of silver, back of gold,
    // seat of purple, inside inlaid with love (Song of Songs 3:6-10).
    const c = grp(scene, 0, 2.6, 0);
    rbox(c, 4, 0.4, 2.4, 0, 0, 0, mat(0xa0784a, { tex: "wood", rough: 0.7 }), 0.05);
    [[-1.8, -1], [1.8, -1], [-1.8, 1], [1.8, 1]].forEach(([x, z]) => rod(c, [x, 0.4, z], [x, 3.6, z], 0.08, SILVER));
    rbox(c, 4.2, 0.3, 2.6, 0, 3.6, 0, mat(0xa0784a, { tex: "wood", rough: 0.7 }), 0.05);
    rbox(c, 0.25, 2.2, 2.4, -1.85, 0.4, 0, GOLD, 0.05);
    rbox(c, 3, 0.5, 2, 0.1, 0.4, 0, mat(0x5b2c6f, { rough: 0.9, tex: "linen" }), 0.15);
    [-1, 1].forEach((sd) => { const cur = mesh(c, new THREE.PlaneGeometry(3.6, 3), mat(0xf2ede0, { rough: 1, tex: "linen", side: THREE.DoubleSide, opacity: 0.8 }), 0, 2.1, sd * 1.25); void cur; });
    [-1.6, 1.6].forEach((z) => rod(c, [-5, 0.2, z * 0.85], [5, 0.2, z * 0.85], 0.1, MAT.darkWood));
    for (let i = 0; i < 4; i++) figure(scene, i < 2 ? -4.2 : 4.2, (i % 2 ? 1 : -1) * 1.36, { robe: 0xe9e1cf, cloth: false, skin: 2, raise: true, face: 0, h: 3.6 });
    for (let i = 0; i < 6; i++) { const s = figure(scene, -7 + i * 2.8, i % 2 ? 4 : -4, { robe: 0x8a8070, cloth: false, skin: i % 4, face: 0, skipFit: true }); void s; rod(scene, [-6.6 + i * 2.8, 0, i % 2 ? 4.3 : -4.3], [-6.6 + i * 2.8, 5.4, i % 2 ? 4.3 : -4.3], 0.04, MAT.darkWood); }
    L(labels, [0, 7.2, 0], "Solomon's carriage", "“King Solomon made himself a carriage from the wood of Lebanon. He made its posts of silver, its back of gold, its seat of purple.”", "Song of Solomon 3:9–10");
    L(labels, [6, 5, 4], "Sixty mighty men", "Around it, sixty warriors of Israel, all wearing swords, against terror by night.", "Song of Solomon 3:7–8", true);
    return { view: v3(0.8, 0.5, 1.1) };
  },
};
