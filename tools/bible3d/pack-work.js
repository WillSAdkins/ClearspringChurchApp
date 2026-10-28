/* Farming, fishing and trades. 1 unit = 1 cubit (about 45 cm). */
import {
  scatter, THREE, MAT, C, GOLD, BRONZE, SILVER, IRON, mat, mesh, grp, sph, cone, tor, rod, path, vessel, slab, rbox, box, cyl,
  textPlane, scale, L, plinth, ground, figure, beast, flame, rock, hill, v3, ref, bush, olive, palm, water,
} from "./kit.js";

// A wooden yoke for two oxen, lying across their necks (x = along the pair).
function yoke(p, x, y, z, w = 4.4, ry = 0) {
  const g = grp(p, x, y, z, ry);
  path(g, [[0, 0.1, -w / 2], [0, -0.05, -w / 4], [0, 0.12, 0], [0, -0.05, w / 4], [0, 0.1, w / 2]], 0.13, MAT.olive, 30);
  [-w / 4, w / 4].forEach((zz) => [-0.45, 0.45].forEach((xx) => rod(g, [xx, 0.15, zz], [xx * 0.8, -0.9, zz], 0.04, MAT.olive)));
  return g;
}
// A simple scratch plough (ard): beam, handle and share.
function plough(p, x, y, z, ry = 0) {
  const g = grp(p, x, y, z, ry);
  rod(g, [0, 0.1, 0], [-1.6, 0.05, 0], 0.08, MAT.olive);               // sole
  cone(g, 0.12, 0.45, IRON, 0.2, 0.08, 0, 0, -Math.PI / 2);           // share
  rod(g, [-0.3, 0.1, 0], [3.8, 1.9, 0], 0.07, MAT.olive);             // beam to the yoke
  rod(g, [-1.5, 0.05, 0], [-2.2, 1.9, 0], 0.06, MAT.olive);           // handle
  rod(g, [-2.35, 1.9, 0], [-2.0, 1.95, 0], 0.05, MAT.olive);
  return g;
}
// A net: a sagging mesh of rope between floats.
function net(p, w, d, x, y, z, sag = 0.3) {
  const g = grp(p, x, y, z), n = 14, m = MAT.rope;
  const pt = (i, j) => [(i / n - 0.5) * w, -Math.sin(i / n * Math.PI) * Math.sin(j / n * Math.PI) * sag, (j / n - 0.5) * d];
  for (let i = 0; i <= n; i++) { const a = [], b = []; for (let j = 0; j <= n; j++) { a.push(pt(i, j)); b.push(pt(j, i)); } path(g, a, 0.01, m, 30); path(g, b, 0.01, m, 30); }
  return g;
}
function fish(p, x, y, z, s = 1, ry = 0, col = 0x8a9aa0) {
  const g = grp(p, x, y, z, ry), m = mat(col, { rough: 0.35, metal: 0.3 });
  sph(g, 0.25 * s, m, 0, 0, 0, 1.6, 0.6, 0.35);
  slab(g, [[0, 0], [0.22 * s, 0.14 * s], [0.22 * s, -0.14 * s]], 0.02 * s, m, 0.36 * s, 0, 0);
  sph(g, 0.03 * s, MAT.black, -0.3 * s, 0.05 * s, 0.07 * s);
  return g;
}

export const MODELS = {
  plough({ scene, labels }) {
    ground(scene, 40, 0xb8ad7c, false);
    // Furrows behind.
    for (let i = 0; i < 9; i++) { const f = mesh(scene, new THREE.CylinderGeometry(0.25, 0.25, 30, 8, 1, false, 0, Math.PI), mat(0x7a5a3a, { rough: 1 }), -14, 0, -6 + i * 1.3, 0, 0, Math.PI / 2); f.userData.skipFit = true; f.userData.noShadow = true; }
    beast(scene, 3.5, -1.1, { color: 0x7a5038, horns: true, s: 1.25 }); beast(scene, 3.5, 1.1, { color: 0x5a3a28, horns: true, s: 1.25 });
    yoke(scene, 4.6, 2.45, 0, 2.2 * 2);
    plough(scene, 0, 0, 0);
    figure(scene, -2.6, 0, { robe: 0x8b6f4e, cloth: 0xe8e0cc, beard: true, reach: true, skin: 2 });
    L(labels, [0, 2.6, 0], "Putting a hand to the plough", "“No one who puts his hand to the plough and looks back is fit for the kingdom of God.” A ploughman had to look ahead to keep the furrow straight.", "Luke 9:62");
    L(labels, [4.6, 3.6, 0], "A yoke of oxen", "Elisha was ploughing with twelve yoke of oxen when Elijah threw his cloak over him. He burned the plough and boiled the oxen, and followed.", "1 Kings 19:19–21");
    L(labels, [0.3, 0.6, 0.5], "The share", "An iron point on a wooden plough that broke the soil rather than turning it over.", "1 Samuel 13:20", true);
    L(labels, [-6, 0.8, 0], "Do not yoke an ox and a donkey", "They pull unevenly.", "Deuteronomy 22:10; 2 Corinthians 6:14", true);
    return { view: v3(0.6, 0.55, 1.1) };
  },

  yoke({ scene, labels }) {
    plinth(scene, 3.2, 0xd9c9a3);
    // An easy yoke: a beam shaped to the neck, with pegs and a band (Matthew 11:29-30; Jeremiah 27-28).
    yoke(scene, 0, 1.2, 0, 4.4, Math.PI / 2);
    [-1.1, 1.1].forEach((x) => { const t = mesh(scene, new THREE.TorusGeometry(0.5, 0.04, 8, 24, Math.PI), MAT.rope, x, 0.75, 0, 0, Math.PI / 2, Math.PI); void t; });
    rbox(scene, 0.3, 0.6, 0.3, -2.0, 0, 0.6, MAT.olive, 0.05); rbox(scene, 0.3, 0.6, 0.3, 2.0, 0, 0.6, MAT.olive, 0.05);
    const bar = grp(scene, 0, 0.12, 1.5, 0.15); rod(bar, [-1.8, 0, 0], [1.8, 0, 0], 0.08, MAT.darkIron); [-1.3, 1.3].forEach((x) => tor(bar, 0.2, 0.03, MAT.darkIron, x, 0, 0));
    L(labels, [0, 2.0, 0], "My yoke is easy", "“Take my yoke upon you, and learn from me, for I am gentle and lowly in heart… For my yoke is easy, and my burden is light.” A good yoke was carved to fit the neck so it didn't rub.", "Matthew 11:29–30");
    L(labels, [0, 0.6, 1.5], "Bars of iron", "Jeremiah wore a wooden yoke as a sign; Hananiah broke it, and God said: “You have broken wooden bars, but you have made in their place bars of iron.”", "Jeremiah 28:10–14", true);
    scale(scene, labels, -3.4, -2.6);
    return { view: v3(0.8, 0.6, 1) };
  },

  "threshing-floor"({ scene, labels }) {
    ground(scene, 40, 0xb8ad7c, false);
    // A flat floor of beaten earth or rock on a hill, open to the wind (Ruth 3:2; 2 Samuel 24:18-24).
    mesh(scene, new THREE.CylinderGeometry(9, 9.3, 0.4, 48), mat(0xc9b38a, { rough: 1, tex: "sand", rep: 2 }), 0, 0.2, 0);
    for (let i = 0; i < 36; i++) { const a = i / 36 * Math.PI * 2; rock(scene, 0.45, Math.cos(a) * 9.4, 0.3, Math.sin(a) * 9.4, 0xb0a48c, 1.2, 0.7, 1); }
    // Grain spread out, with a heap of winnowed grain and a heap of straw.
    const straw = mat(0xe0c070, { rough: 1 });
    for (let i = 0; i < 70; i++) { const a = i * 2.39, r = 2.5 + (i % 9) * 0.6; const s = mesh(scene, new THREE.CylinderGeometry(0.03, 0.03, 1.2, 5), straw, Math.cos(a) * r, 0.45, Math.sin(a) * r, Math.PI / 2, 0, a); s.userData.noShadow = true; }
    const heap = mesh(scene, new THREE.SphereGeometry(1.6, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xd2a65a, { rough: 1 }), -5, 0.4, -4.5); heap.scale.y = 0.6;
    const chaff = mesh(scene, new THREE.SphereGeometry(2.2, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), straw, 5.5, 0.4, -4); chaff.scale.y = 0.5;
    // A threshing sledge with stone teeth, pulled by an ox (Isaiah 41:15).
    const sl = grp(scene, 1.8, 0.45, 2.4, -0.6);
    rbox(sl, 3.2, 0.2, 1.6, 0, 0, 0, MAT.wood, 0.05);
    for (let i = 0; i < 18; i++) cone(sl, 0.06, 0.14, mat(0x4a4744, { rough: 0.8 }), -1.4 + (i % 6) * 0.55, -0.05, -0.6 + Math.floor(i / 6) * 0.6, Math.PI);
    figure(sl, -0.6, 0, { robe: 0x8c5a3c, h: 3.6, y: 0.2, face: Math.PI, skin: 1 });
    beast(scene, 4.6, 0.6, { color: 0x7a5038, horns: true, s: 1.1, face: -0.6 + Math.PI * 0 });
    rod(scene, [3.0, 0.75, 1.5], [4.1, 1.7, 0.95], 0.05, MAT.rope);
    // Someone winnowing, tossing grain into the wind.
    const wf = figure(scene, -4, 1.5, { robe: 0x5d7a5a, face: 0.4, raise: true, skin: 2 }); void wf;
    const fork = grp(scene, -4.3, 4.1, 1.2); fork.rotation.z = -0.3;
    rod(fork, [0, -2.5, 0], [0, 0.6, 0], 0.035, MAT.olive);
    for (let i = -2; i <= 2; i++) path(fork, [[0, 0.6, 0], [i * 0.08, 0.9, 0], [i * 0.1, 1.2, 0.05]], 0.015, MAT.olive, 8);
    for (let i = 0; i < 30; i++) { const s = sph(scene, 0.05, straw, -4.2 + (i % 7) * 0.5, 4.5 + (i % 5) * 0.3, 1.0 + (i % 3) * 0.3); s.userData.skipFit = true; s.userData.noShadow = true; }
    L(labels, [0, 1.6, 0], "The threshing floor", "A hard flat place on high ground where sheaves were trampled or crushed by a sledge. Boaz slept at his threshing floor to guard the harvest, and Ruth came to him there.", "Ruth 3:2–14");
    L(labels, [1.8, 2.0, 2.4], "A threshing sledge", "Boards studded underneath with sharp stones: “I will make you a threshing sledge, new, sharp, with teeth.”", "Isaiah 41:15", true);
    L(labels, [-4, 5.8, 1.5], "Winnowing", "Tossed into the evening breeze, the heavy grain falls back and the chaff blows away.", "Psalm 1:4; Matthew 3:12");
    L(labels, [-5, 1.6, -4.5], "The temple's site", "David bought Araunah's threshing floor to build an altar. Solomon's temple was built there.", "2 Samuel 24:18–25; 2 Chronicles 3:1", true);
    return { view: v3(0.8, 0.7, 1.1), zoom: 0.7 };
  },

  "winnowing-fork"({ scene, labels }) {
    plinth(scene, 3, 0xd9c9a3);
    // A winnowing fork and a winnowing shovel (Isaiah 30:24; Matthew 3:12).
    const f = grp(scene, -0.2, 0.08, -0.5, 0.2);
    rod(f, [-2.6, 0, 0], [1.2, 0, 0], 0.05, MAT.olive);
    for (let i = -3; i <= 3; i++) path(f, [[1.2, 0, 0], [1.5, 0, i * 0.08], [2.0, 0.08, i * 0.11]], 0.02, MAT.olive, 10);
    rod(f, [1.45, 0, -0.26], [1.45, 0, 0.26], 0.02, MAT.rope);
    const sh = grp(scene, -0.4, 0.06, 0.7, -0.15);
    rod(sh, [-2.2, 0, 0], [0.9, 0, 0], 0.05, MAT.olive);
    vessel(sh, [[0, 0], [0.32, 0.01], [0.36, 0.06]], MAT.wood, 1.25, 0, 0).scale.set(1.2, 1, 0.9);
    const heap = mesh(scene, new THREE.SphereGeometry(0.6, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xd2a65a, { rough: 1 }), 1.9, 0, 0.2); heap.scale.y = 0.5;
    L(labels, [0, 0.6, -0.5], "His winnowing fork is in his hand", "“He will clear his threshing floor and gather his wheat into the barn, but the chaff he will burn with unquenchable fire.”", "Matthew 3:12");
    L(labels, [-0.4, 0.4, 0.7], "The shovel", "For gathering and tossing grain once the straw was mostly gone.", "Isaiah 30:24", true);
    scale(scene, labels, -3.6, -2.6);
    return { view: v3(0.3, 0.75, 1) };
  },

  "sickle-and-sheaves"({ scene, labels }) {
    ground(scene, 30, 0xb8ad7c, false);
    // Barley harvest: a sickle, sheaves bound and stood up, and someone gleaning (Ruth 2; Deuteronomy 24:19).
    const grain = mat(0xd8b860, { rough: 1 }), stalk = mat(0xc8a850, { rough: 1 });
    // Standing grain.
    const st = [], hd = [];
    for (let i = 0; i < 260; i++) { const x = -8 + (i % 26) * 0.6 + Math.sin(i) * 0.2, z = -7 + Math.floor(i / 26) * 0.55, lean = Math.sin(i * 3) * 0.04; st.push([x, 1.2, z, 0, 0, lean]); hd.push([x - lean * 2.4, 2.5, z, 0, 0, 0, 1, 2.2, 1]); }
    scatter(scene, new THREE.CylinderGeometry(0.012, 0.012, 2.4, 5), stalk, st).userData.skipFit = true;
    scatter(scene, new THREE.SphereGeometry(0.06, 8, 6), grain, hd).userData.skipFit = true;
    // Sheaves.
    [[1.5, 1], [3, 0.2], [2.4, 2.4], [4.2, 1.6]].forEach(([x, z]) => { const s = grp(scene, x, 0, z);
      for (let k = 0; k < 22; k++) { const a = k / 22 * Math.PI * 2, r = 0.25; rod(s, [Math.cos(a) * r * 0.6, 0, Math.sin(a) * r * 0.6], [Math.cos(a) * r * 1.4, 2.3, Math.sin(a) * r * 1.4], 0.015, stalk); sph(s, 0.07, grain, Math.cos(a) * r * 1.45, 2.4, Math.sin(a) * r * 1.45, 1, 2, 1); }
      tor(s, 0.2, 0.04, stalk, 0, 1.3, 0); });
    // The sickle.
    const sk = grp(scene, 0, 0.05, 3.2, 0.5);
    path(sk, [[0, 0, 0], [0.5, 0, 0.1], [0.85, 0, 0.45], [0.8, 0, 0.85], [0.55, 0, 1.0]], 0.025, mat(0x8a8c90, { rough: 0.3, metal: 0.9 }), 30).scale.y = 0.4;
    rod(sk, [-0.6, 0, 0], [0, 0, 0], 0.04, MAT.olive);
    figure(scene, -1.5, 2.2, { robe: 0x7a5a6a, cloth: 0x5a3a4a, skin: 3, face: 0.4, reach: true, h: 3.8 });
    L(labels, [2.6, 3.2, 1.3], "Sheaves", "Joseph dreamed his brothers' sheaves bowed down to his. In the Psalms, those who sow in tears come home with songs of joy, carrying their sheaves.", "Genesis 37:7; Psalm 126:5–6");
    L(labels, [0.4, 0.5, 3.6], "The sickle", "A curved iron blade. In Revelation the Son of Man has a sharp sickle in his hand: “the harvest of the earth is fully ripe.”", "Revelation 14:14–16");
    L(labels, [-1.5, 4.4, 2.2], "Gleaning", "Ruth gleaned behind the reapers in Boaz's field. The law said to leave the edges and the forgotten sheaf for the poor and the foreigner.", "Ruth 2:2–17; Leviticus 19:9–10");
    L(labels, [-4, 3.2, -4], "Fields white for harvest", "“The harvest is plentiful, but the labourers are few.”", "Matthew 9:37–38; John 4:35", true);
    return { view: v3(0.8, 0.5, 1.2), target: v3(1, 1.4, 1.5) };
  },

  "hand-mill"({ scene, labels }) {
    ground(scene, 10, 0xb8a888, false);
    // Two women grinding at the mill (Matthew 24:41; Exodus 11:5). A round hand mill: a fixed lower
    // stone and a turning upper stone with a hole for the grain and a handle.
    const st = MAT.basalt;
    mesh(scene, new THREE.CylinderGeometry(0.75, 0.8, 0.35, 32), st, 0, 0.18, 0);
    mesh(scene, new THREE.CylinderGeometry(0.72, 0.72, 0.3, 32), st, 0, 0.5, 0);
    mesh(scene, new THREE.CylinderGeometry(0.12, 0.12, 0.32, 16), MAT.black, 0, 0.51, 0);
    rod(scene, [0.55, 0.62, 0], [0.55, 1.05, 0], 0.04, MAT.olive);
    const flour = mesh(scene, new THREE.TorusGeometry(0.9, 0.12, 8, 40), mat(0xf2ead8, { rough: 1 }), 0, 0.03, 0, Math.PI / 2); flour.scale.z = 0.4;
    vessel(scene, [[0, 0], [0.25, 0.02], [0.32, 0.2], [0.33, 0.26]], MAT.clayLight, -1.3, 0, 0.7);
    for (let i = 0; i < 20; i++) sph(scene, 0.03, mat(0xd8b860, { rough: 1 }), -1.3 + Math.cos(i) * 0.15, 0.22, 0.7 + Math.sin(i) * 0.15, 1, 0.6, 1);
    figure(scene, 0, 1.25, { robe: 0x7a5a6a, sit: true, skin: 1, face: -Math.PI / 2, reach: true, h: 3.4 });
    figure(scene, 0, -1.25, { robe: 0x5d7a5a, sit: true, skin: 3, face: Math.PI / 2, reach: true, h: 3.4 });
    L(labels, [0, 1.3, 0], "Two women grinding", "Grinding flour was the first job of every day. “Two women will be grinding at the mill; one will be taken and one left.”", "Matthew 24:41");
    L(labels, [0.6, 0.9, 0.3], "The upper millstone", "So essential that the law said: no one shall take a mill or an upper millstone in pledge, for that would be taking a life.", "Deuteronomy 24:6", true);
    L(labels, [-0.6, 0.35, -0.6], "Thebez", "A woman dropped an upper millstone from the tower on Abimelech's head.", "Judges 9:53", true);
    return { view: v3(1, 0.7, 0.05) };
  },

  "great-millstone"({ scene, labels }) {
    ground(scene, 20, 0xb8a888, false);
    // A large mill turned by a donkey: an hourglass-shaped upper stone over a cone, the
    // "millstone of a donkey" Jesus speaks of (Matthew 18:6; Mark 9:42).
    const st = MAT.basalt;
    rbox(scene, 3.4, 0.6, 3.4, 0, 0, 0, MAT.stone, 0.1);
    mesh(scene, new THREE.ConeGeometry(0.9, 1.4, 32), st, 0, 1.3, 0);
    vessel(scene, [[0.4, 0], [0.95, 0.05], [1.0, 0.4], [0.5, 1.0], [0.4, 1.1], [0.5, 1.2], [1.0, 1.8], [0.95, 2.2], [0.4, 2.25]], st, 0, 0.75, 0);
    rod(scene, [-2.6, 1.7, 0], [2.6, 1.7, 0], 0.09, MAT.darkWood);
    beast(scene, 3.6, -0.9, { color: 0x8a7a6a, ears: true, s: 0.95, face: -Math.PI / 2 });
    rod(scene, [2.6, 1.7, 0], [3.6, 1.9, -0.5], 0.04, MAT.rope);
    L(labels, [0, 3.6, 0], "A donkey's millstone", "The heavy upper stone, turned by a donkey walking round. “Whoever causes one of these little ones who believe in me to sin, it would be better for him to have a great millstone fastened round his neck and be drowned.”", "Matthew 18:6");
    L(labels, [-2.6, 2.1, 0], "Samson at the mill", "The Philistines blinded Samson and set him to grind at the mill in the prison at Gaza.", "Judges 16:21", true);
    L(labels, [1.1, 1.5, 0.6], "Thrown into the sea", "In Revelation an angel throws a stone like a great millstone into the sea: so Babylon will fall.", "Revelation 18:21", true);
    scale(scene, labels, -3, 3);
    return { view: v3(0.9, 0.55, 1) };
  },

  "olive-press"({ scene, labels }) {
    ground(scene, 24, C.sand, false);
    olive(scene, -8, -6, 7); olive(scene, 7, -8, 6);
    // Crushing: a stone wheel rolled in a round basin. Pressing: baskets of pulp under a weighted beam.
    const st = MAT.limestone;
    vessel(scene, [[0, 0], [1.8, 0], [1.9, 0.8], [1.6, 0.85], [1.55, 0.5], [0, 0.5]], st, -3, 0, 0);
    mesh(scene, new THREE.CylinderGeometry(0.15, 0.15, 1.6, 12), MAT.darkWood, -3, 1.2, 0);
    const wheel = mesh(scene, new THREE.CylinderGeometry(0.75, 0.75, 0.45, 32), st, -2.4, 1.25, 0, Math.PI / 2, 0, 0); void wheel;
    rod(scene, [-3, 1.25, 0], [-0.5, 1.25, 0], 0.07, MAT.darkWood);
    for (let i = 0; i < 30; i++) sph(scene, 0.06, mat(0x3a3a20, { rough: 0.3 }), -3 + Math.cos(i * 2.4) * (0.6 + (i % 4) * 0.25), 0.55, Math.sin(i * 2.4) * (0.6 + (i % 4) * 0.25), 1, 0.8, 1);
    // The beam press.
    const bx = 3;
    rbox(scene, 2.2, 0.4, 2.2, bx, 0, 0, st, 0.08);
    for (let i = 0; i < 4; i++) { const b = mesh(scene, new THREE.CylinderGeometry(0.6, 0.6, 0.22, 24), mat(0x9a7a4a, { rough: 1, tex: "linen", rep: 1 }), bx, 0.55 + i * 0.25, 0); void b; }
    rbox(scene, 0.6, 5, 0.6, bx - 3.5, 0, 0, st, 0.05);
    rod(scene, [bx - 3.5, 1.9, 0], [bx + 3.2, 1.6, 0], 0.18, MAT.darkWood);
    [0, 1].forEach((k) => { rod(scene, [bx + 3.0, 1.6, 0], [bx + 3.0, 0.9 - k * 0.1, 0.3 * k], 0.02, MAT.rope); });
    rock(scene, 0.45, bx + 3.0, 0.5, 0, 0x9d917a); rock(scene, 0.4, bx + 3.0, 0.5, 0.6, 0xa89a82);
    const pit = vessel(scene, [[0.5, 0.2], [0.55, 0], [0, 0.0]], st, bx, -0.01, 1.6); void pit;
    const oil = mesh(scene, new THREE.CircleGeometry(0.45, 24), mat(0x9a8a2a, { rough: 0.05 }), bx, 0.08, 1.6, -Math.PI / 2); oil.userData.noShadow = true;
    L(labels, [-3, 2.6, 0], "Crushing", "A stone wheel rolled round a basin crushed the olives to a pulp.", "Micah 6:15");
    L(labels, [3, 3.1, 0], "Pressing", "The pulp went in flat baskets, stacked under a beam weighted with stones, and the oil ran out below.", "Deuteronomy 8:8");
    L(labels, [0.5, 4.2, 0], "Gethsemane", "The name means “oil press”. Here, at the foot of the Mount of Olives, Jesus prayed in agony the night he was betrayed.", "Matthew 26:36–39");
    L(labels, [-8, 6, -6], "Olive trees", "Olive oil fed lamps, cooked food, healed wounds and anointed kings.", "Luke 10:34; Exodus 27:20", true);
    return { view: v3(0.6, 0.6, 1.1), target: v3(0, 1.4, 0) };
  },

  winepress({ scene, labels }) {
    ground(scene, 30, 0xb8ad7c, false);
    // A treading floor cut in the rock, draining into a vat below (Isaiah 5:2; 63:2-3; Matthew 21:33).
    const st = MAT.limestone;
    rbox(scene, 7, 1.2, 6, 0, 0, 0, st, 0.15);
    const floor = mesh(scene, new THREE.BoxGeometry(5.8, 0.1, 4.8), mat(0x6a2a3a, { rough: 0.4 }), 0, 1.0, 0); void floor;
    [[0, 2.45], [0, -2.45]].forEach(([x, z]) => rbox(scene, 6.2, 0.5, 0.4, x, 1.0, z, st, 0.1));
    [[3.0, 0], [-3.0, 0]].forEach(([x, z]) => rbox(scene, 0.4, 0.5, 5.3, x, 1.0, z, st, 0.1));
    for (let i = 0; i < 80; i++) sph(scene, 0.09, mat(0x4a1a3a, { rough: 0.3 }), -2.4 + (i % 10) * 0.52, 1.1, -1.9 + Math.floor(i / 10) * 0.52, 1, 0.6, 1);
    // The channel and the vat.
    rbox(scene, 0.5, 0.2, 2.2, 0, 0.6, 4, st, 0.05);
    vessel(scene, [[1.5, 1.2], [1.5, 0.2], [0, 0.2]], st, 0, -0.1, 6.2);
    const wine = mesh(scene, new THREE.CircleGeometry(1.45, 32), MAT.wine, 0, 0.75, 6.2, -Math.PI / 2); wine.userData.noShadow = true;
    figure(scene, -0.8, 0, { robe: 0xe8dcc0, skin: 2, y: 1.1, raise: true, face: 0.6 });
    figure(scene, 1.2, -0.8, { robe: 0x8c5a3c, skin: 0, y: 1.1, face: 2.6 });
    // A watchtower in the vineyard.
    const tw = grp(scene, -8, 0, -6); rbox(tw, 3, 7, 3, 0, 0, 0, mat(0xffffff, { tex: "stone", rough: 1 }), 0.1); tw.userData.skipFit = true;
    for (let i = 0; i < 6; i++) { const v = grp(scene, 5 + (i % 3) * 2, 0, -6 + Math.floor(i / 3) * 2.5); v.userData.skipFit = true; path(v, [[0, 0, 0], [0.2, 1, 0.1], [-0.1, 1.8, 0]], 0.08, MAT.bark, 10); sph(v, 0.7, MAT.leaf, 0, 2.1, 0, 1.3, 0.7, 1); }
    L(labels, [0, 3.6, 0], "Treading the grapes", "Barefoot, singing as they trod. “I have trodden the winepress alone… their juice spattered on my garments.”", "Isaiah 63:2–3");
    L(labels, [0, 1.6, 6.2], "The vat", "The juice ran down a channel into a vat cut lower in the rock.", "Isaiah 5:2", true);
    L(labels, [-8, 8, -6], "A tower in the vineyard", "The owner planted a vineyard, put a wall round it, dug a winepress and built a tower, then let it out to tenants.", "Matthew 21:33; Isaiah 5:1–2");
    return { view: v3(0.9, 0.7, 1.2), target: v3(0, 1, 1.5) };
  },

  "potters-wheel"({ scene, labels }) {
    ground(scene, 12, 0xb8a888, false);
    // The potter at the wheel: a heavy kick wheel below, a small turning head above (Jeremiah 18:1-6).
    mesh(scene, new THREE.CylinderGeometry(0.9, 0.95, 0.25, 32), MAT.basalt, 0, 0.12, 0);
    mesh(scene, new THREE.CylinderGeometry(0.07, 0.07, 1.3, 12), MAT.darkWood, 0, 0.8, 0);
    mesh(scene, new THREE.CylinderGeometry(0.45, 0.45, 0.1, 32), MAT.darkWood, 0, 1.45, 0);
    vessel(scene, [[0, 0], [0.22, 0], [0.32, 0.18], [0.3, 0.38], [0.18, 0.55], [0.12, 0.62], [0.15, 0.66]], mat(0x9a6a4a, { rough: 0.5 }), 0, 1.5, 0);
    figure(scene, -1.4, 0, { robe: 0x7a5a3e, cloth: 0xc8b89a, sit: true, beard: true, reach: true, face: 0, skin: 2 });
    // Finished and spoiled pots.
    [[1.6, -0.6, 0.9], [2.1, 0.2, 1.1], [1.7, 0.9, 0.8]].forEach(([x, z, s]) => vessel(scene, [[0, 0], [0.25 * s, 0.03], [0.4 * s, 0.4 * s], [0.32 * s, 0.8 * s], [0.18 * s, 1.0 * s], [0.2 * s, 1.06 * s]], MAT.clay, x, 0, z));
    rbox(scene, 0.8, 0.5, 0.8, 1.2, 0, -1.8, mat(0x8a5a3a, { rough: 1 }), 0.3);
    L(labels, [0, 2.6, 0], "Like clay in the potter's hand", "The vessel was spoiled in the potter's hand, so he reworked it into another. “Can I not do with you as this potter has done? declares the LORD.”", "Jeremiah 18:1–6");
    L(labels, [0, 0.5, 0.95], "The kick wheel", "The potter spun a heavy stone wheel with his feet; it turned the small head above.", "Jeremiah 18:3", true);
    L(labels, [2, 1.3, 0.6], "Jars of clay", "“We have this treasure in jars of clay, to show that the surpassing power belongs to God.”", "2 Corinthians 4:7");
    L(labels, [1.2, 0.8, -1.8], "Clay", "“We are the clay, and you are our potter.”", "Isaiah 64:8", true);
    return { view: v3(0.8, 0.55, 1) };
  },

  "fishing-net"({ scene, labels }) {
    ground(scene, 30, C.sand, false);
    const sea = mesh(scene, new THREE.PlaneGeometry(60, 26), MAT.water, 0, 0.03, -16, -Math.PI / 2); sea.userData.skipFit = true; sea.userData.noShadow = true;
    // A dragnet hauled to the shore, full of fish (Matthew 13:47-48; John 21:6-11).
    const n = net(scene, 7, 4, 0, 0.6, 0.5, 0.45);
    for (let i = 0; i < 14; i++) sph(n, 0.12, mat(0xc8a878, { rough: 0.6 }), -3.5 + i * 0.54, 0, -2, 1.3, 0.8, 0.8);
    for (let i = 0; i < 40; i++) fish(scene, -2.8 + (i % 10) * 0.6, 0.25 + (i % 3) * 0.1, -1 + Math.floor(i / 10) * 0.65, 0.8 + (i % 4) * 0.1, i * 0.7, [0x8a9aa0, 0x9aa48a, 0x7a8a96][i % 3]);
    // A cast net folded on a rock.
    rock(scene, 0.7, 5, 0.4, 1.5);
    const cn = mesh(scene, new THREE.ConeGeometry(0.8, 0.7, 24, 1, true), mat(0xb39a6a, { rough: 1, side: THREE.DoubleSide, opacity: 0.85 }), 5, 1.3, 1.5); void cn;
    figure(scene, -4.5, 2.2, { robe: 0x6b7f8c, cloth: false, beard: true, reach: true, face: -0.4, skin: 1 });
    figure(scene, 4.2, 3.4, { robe: 0x8b6f4e, cloth: false, reach: true, face: Math.PI + 0.4, skin: 2 });
    L(labels, [0, 2.2, 0.5], "153 large fish", "“Cast the net on the right side of the boat.” They could not haul it in for the number of fish; when counted there were 153, and the net was not torn.", "John 21:6–11");
    L(labels, [-4.5, 4.6, 2.2], "Fishers of men", "Simon and Andrew were casting a net into the sea. “Follow me, and I will make you fishers of men.”", "Mark 1:16–18");
    L(labels, [5, 2.2, 1.5], "A cast net", "A round net with weights on the edge, thrown by hand from the shore or a boat.", "Matthew 4:18", true);
    L(labels, [3, 1.2, -0.5], "Good and bad", "The kingdom is like a dragnet that catches every kind; the good are sorted into containers and the bad thrown away.", "Matthew 13:47–50", true);
    return { view: v3(0.5, 0.75, 1), target: v3(0, 0.8, 0.5) };
  },

  "fish-hook"({ scene, labels }) {
    plinth(scene, 1.0, 0xd9c9a3);
    // A bronze hook and line (Amos 4:2; Isaiah 19:8), and the fish with a coin (Matthew 17:27).
    path(scene, [[0, 0.5, 0], [0, 0.12, 0], [0.03, 0.06, 0], [0.08, 0.07, 0], [0.09, 0.12, 0]], 0.008, BRONZE, 30);
    cone(scene, 0.012, 0.03, BRONZE, 0.09, 0.13, 0);
    path(scene, [[0, 0.5, 0], [-0.2, 0.6, 0.1], [-0.5, 0.4, 0.2], [-0.7, 0.02, 0.3]], 0.003, MAT.rope, 30);
    const f = fish(scene, 0.4, 0.06, 0.3, 1.3, 0.6);
    const coin = mesh(f, new THREE.CylinderGeometry(0.06, 0.06, 0.012, 24), SILVER, -0.36, -0.01, 0, 0, 0, Math.PI / 2.4); void coin;
    L(labels, [0, 0.6, 0], "A fish hook", "Bronze hooks have been found all round the Sea of Galilee.", "Isaiah 19:8; Habakkuk 1:15");
    L(labels, [0.4, 0.35, 0.3], "A coin in its mouth", "“Go to the sea and cast a hook. Take the first fish that comes up, and when you open its mouth you will find a shekel. Give it for me and for yourself.”", "Matthew 17:24–27");
    scale(scene, labels, -0.4, -0.4, true);
    return { view: v3(0.5, 0.7, 1) };
  },

  "carpenters-tools"({ scene, labels }) {
    ground(scene, 8, 0xb8a888, false);
    // Jesus was a tekton: a builder in wood and stone (Mark 6:3; Matthew 13:55).
    rbox(scene, 3.4, 1.6, 1.4, 0, 0, 0, MAT.wood, 0.05);
    const wd = MAT.olive, fe = mat(0x6a6c70, { rough: 0.4, metal: 0.85 });
    // Adze, saw, hammer, chisel, bow drill, plumb line and square.
    const adze = grp(scene, -1.1, 1.68, -0.2, 0.3); rod(adze, [0, 0, 0], [0.9, 0, 0], 0.03, wd); slab(adze, [[0, 0], [0.05, -0.2], [0.13, -0.24], [0.12, 0.04]], 0.07, fe, 0.9, 0.04, 0, 0, 0, 0);
    const saw = grp(scene, 0.3, 1.62, -0.35, -0.1); slab(saw, [[0, -0.06], [1.0, -0.04], [1.0, 0.04], [0, 0.07]], 0.01, fe, 0, 0, 0, Math.PI / 2, 0, 0); rbox(saw, 0.2, 0.05, 0.12, -0.1, -0.02, 0, wd, 0.02);
    const hm = grp(scene, 0.8, 1.66, 0.3, 0.6); rod(hm, [0, 0, 0], [0.7, 0, 0], 0.025, wd); rbox(hm, 0.1, 0.1, 0.32, 0.72, -0.05, 0, fe, 0.03);
    const ch = grp(scene, -0.3, 1.64, 0.35, -0.4); rod(ch, [0, 0, 0], [0.35, 0, 0], 0.03, wd); rod(ch, [0.35, 0, 0], [0.6, 0, 0], 0.015, fe);
    const bd = grp(scene, -0.9, 1.62, 0.4, 0.2); path(bd, [[0, 0, 0], [0.3, 0, -0.15], [0.7, 0, 0]], 0.02, wd, 20); rod(bd, [0, 0, 0], [0.7, 0, 0], 0.005, MAT.rope);
    const pl = grp(scene, 1.9, 0, -0.9); rod(pl, [0, 3.2, 0], [0, 0.9, 0], 0.006, MAT.rope); cone(pl, 0.07, 0.2, MAT.lead, 0, 0.8, 0, Math.PI); rod(pl, [-0.4, 3.2, 0], [0.4, 3.2, 0], 0.04, wd); rod(pl, [-0.4, 0, -0.3], [-0.4, 3.2, 0], 0.04, wd); pl.userData.skipFit = true;
    // A beam being worked, and shavings.
    rbox(scene, 3.2, 0.3, 0.3, 0, 1.6, -0.55, MAT.wood, 0.03);
    for (let i = 0; i < 14; i++) tor(scene, 0.06, 0.012, mat(0xe0b884, { rough: 1 }), -1.4 + i * 0.2, 0.03, 0.9 + (i % 3) * 0.1, Math.PI / 2 - 0.3, i);
    L(labels, [0, 2.5, 0], "The carpenter's tools", "“Is not this the carpenter, the son of Mary?” The word tekton covers a craftsman in wood or stone: doors, yokes, ploughs, roofs, furniture.", "Mark 6:3");
    L(labels, [-1.0, 2.0, -0.2], "Adze", "The main shaping tool for timber, held like a hoe.", "Isaiah 44:13", true);
    L(labels, [0.8, 2.0, -0.35], "Saw", "“Shall the saw boast against him who uses it?”", "Isaiah 10:15", true);
    L(labels, [-0.7, 1.95, 0.45], "Bow drill", "For boring holes for pegs and joints.", "Exodus 21:6", true);
    L(labels, [1.9, 3.5, -0.9], "Plumb line", "A weight on a cord to check that a wall stands true.", "Amos 7:7–8", true, "/bible/3d/plumb-line");
    return { view: v3(0.5, 0.85, 1) };
  },

  "floating-axe-head"({ scene, labels }) {
    ground(scene, 30, 0xb8ad7c, false);
    const w = mesh(scene, new THREE.PlaneGeometry(60, 10), MAT.water, 0, 0.04, 0, -Math.PI / 2); w.userData.skipFit = true; w.userData.noShadow = true;
    // The prophets cutting beams by the Jordan; the borrowed axe head floats (2 Kings 6:1-7).
    const ax = grp(scene, 0.5, 0.16, 0.5, 0.6);
    slab(ax, [[0, -0.12], [0.35, -0.22], [0.42, 0], [0.35, 0.22], [0, 0.12], [-0.12, 0.08], [-0.12, -0.08]], 0.12, IRON, 0, 0, 0, Math.PI / 2, 0, 0, 0.02);
    tor(scene, 0.4, 0.015, mat(0xd8eef2, { rough: 0.1, opacity: 0.7 }), 0.55, 0.06, 0.5); tor(scene, 0.7, 0.012, mat(0xd8eef2, { rough: 0.1, opacity: 0.5 }), 0.55, 0.06, 0.5);
    rod(scene, [-1.6, 0.06, 1.2], [-0.6, 0.06, 0.9], 0.05, MAT.olive);
    rod(scene, [3, 0.1, 6], [1.5, 0.12, 2.2], 0.04, MAT.darkWood);
    figure(scene, -2.5, 6, { robe: 0x6b5236, beard: true, reach: true, face: -Math.PI / 2 + 0.2 });
    figure(scene, 0.5, 7, { robe: 0x5d7a5a, raise: true, face: -Math.PI / 2 - 0.3 });
    for (let i = 0; i < 3; i++) rbox(scene, 6, 0.6, 0.6, 6, 0, 8 + i * 0.7, MAT.wood, 0.1);
    L(labels, [0.5, 1.0, 0.5], "The iron did float", "“Alas, my master! It was borrowed.” Elisha cut a stick, threw it in, and made the iron float.", "2 Kings 6:5–6");
    L(labels, [-1.2, 0.6, 1], "The handle", "The axe head flew off as one of them was felling a beam.", "2 Kings 6:5", true);
    L(labels, [6, 1.5, 8.7], "Beams for a new hall", "The sons of the prophets needed a bigger place to meet, by the Jordan.", "2 Kings 6:1–2", true);
    return { view: v3(0.5, 0.8, 1), target: v3(0, 0.8, 3), zoom: 0.8 };
  },

  "plumb-line"({ scene, labels }) {
    ground(scene, 20, C.sand, false);
    // The Lord standing by a wall built with a plumb line, a plumb line in his hand (Amos 7:7-9).
    const st = mat(0xffffff, { tex: "stone", rough: 1, rep: 1 });
    const wall = grp(scene, 0, 0, 0); wall.rotation.z = 0.07;
    rbox(wall, 6, 7, 1.4, 0, 0, 0, st, 0.08);
    const pl = grp(scene, 3.6, 0, 1.2);
    rod(pl, [0, 7.5, 0], [0, 1.0, 0], 0.012, MAT.rope); cone(pl, 0.13, 0.35, MAT.lead, 0, 0.82, 0, Math.PI);
    rod(pl, [-0.5, 7.5, 0], [0.4, 7.5, 0], 0.05, MAT.olive);
    figure(scene, 4.6, 2.2, { robe: 0xefe9dc, cloth: 0xffffff, raise: true, face: Math.PI * 1.2, skipFit: true });
    L(labels, [0, 8, 0], "A wall out of true", "The plumb line hangs straight; the wall leans. “Behold, I am setting a plumb line in the midst of my people Israel.”", "Amos 7:7–9");
    L(labels, [3.6, 1.5, 1.2], "The plumb bob", "A lead or stone weight on a cord. In Zechariah, people rejoice to see the plumb line in Zerubbabel's hand as the temple rises.", "Zechariah 4:10", true);
    return { view: v3(1, 0.4, 1.1), target: v3(1.2, 3.5, 0.5) };
  },

  "measuring-reed"({ scene, labels }) {
    ground(scene, 14, C.stone);
    // A measuring reed six long cubits, each a cubit and a handbreadth (Ezekiel 40:3, 5), and a line
    // of flax; John is given a reed like a staff (Revelation 11:1; 21:15-17).
    const g = grp(scene, 0, 0.12, 0, 0.1);
    const L6 = 6 * 7 / 6; // six long cubits = 7 ordinary cubits
    rod(g, [-L6 / 2, 0, 0], [L6 / 2, 0, 0], 0.07, MAT.reed);
    for (let i = 0; i <= 6; i++) { const x = -L6 / 2 + i * L6 / 6; tor(g, 0.075, 0.015, MAT.darkWood, x, 0, 0, 0, Math.PI / 2); textPlane(g, [i + ""], 0.4, 0.4, x, 0.45, 0, { bg: null, transparent: true, size: 180, ink: "#2a2a2a", rx: -0.3 }); }
    const coil = grp(scene, 1, 0.1, 1.6); for (let i = 0; i < 6; i++) tor(coil, 0.5 - i * 0.02, 0.025, mat(0xd8c89a, { rough: 1 }), 0, i * 0.05, 0);
    L(labels, [0, 1.2, 0], "Six long cubits", "Ezekiel's guide measured the new temple with a reed of six long cubits, each a cubit and a handbreadth: about 3.1 m in all.", "Ezekiel 40:3–5");
    L(labels, [1, 0.8, 1.6], "A line of flax", "For longer distances, like the river that deepened every thousand cubits.", "Ezekiel 47:3–5", true);
    L(labels, [-2.8, 0.9, 0], "A golden measuring rod", "In Revelation the angel measures the city with a golden reed: 12,000 stadia on every side.", "Revelation 21:15–17", true, "/bible/3d/new-jerusalem");
    scale(scene, labels, -2.5, 2.2);
    return { view: v3(0.4, 0.8, 1) };
  },

  "scales-and-weights"({ scene, labels }) {
    plinth(scene, 1.4, 0xd9c9a3);
    // A balance with two pans, and stone weights marked in shekels (Leviticus 19:36; Proverbs 11:1).
    const b = grp(scene, 0, 0, 0);
    rod(b, [0, 0, 0], [0, 1.2, 0], 0.025, BRONZE); mesh(b, new THREE.CylinderGeometry(0.2, 0.25, 0.06, 24), BRONZE, 0, 0.03, 0);
    rod(b, [-0.65, 1.15, 0], [0.65, 1.2, 0], 0.018, BRONZE);
    [[-0.65, 1.15, 0.45], [0.65, 1.2, 0.5]].forEach(([x, y, py]) => { [0, 1, 2].forEach((k) => { const a = k / 3 * Math.PI * 2; rod(b, [x, y, 0], [x + Math.cos(a) * 0.17, py, Math.sin(a) * 0.17], 0.004, MAT.rope); });
      vessel(b, [[0, 0], [0.18, 0.005], [0.2, 0.04]], BRONZE, x, py, 0); });
    // Domed weights, as found across Judah.
    [[0.12, -0.45, 0.6], [0.09, -0.15, 0.7], [0.07, 0.1, 0.75], [0.05, 0.3, 0.75], [0.035, 0.45, 0.7]].forEach(([r, x, z]) => { const w = sph(scene, r, mat(0xcfc3a8, { rough: 0.6 }), x, 0, z, 1, 0.8, 1); w.scale.y = 0.9; });
    sph(b, 0.08, mat(0xcfc3a8, { rough: 0.6 }), -0.65, 0.5, 0, 1, 0.75, 1);
    for (let i = 0; i < 6; i++) mesh(b, new THREE.CylinderGeometry(0.035, 0.035, 0.01, 16), SILVER, 0.65 + (i % 2) * 0.02, 0.52 + i * 0.011, 0);
    L(labels, [0, 1.5, 0], "Just balances", "“A false balance is an abomination to the LORD, but a just weight is his delight.”", "Proverbs 11:1");
    L(labels, [0, 0.35, 0.75], "Stone weights", "Domed limestone weights marked in shekels have been found all over Judah. Merchants cheated with two sets, a heavy one for buying and a light one for selling.", "Deuteronomy 25:13–16");
    L(labels, [0.65, 0.8, 0], "Weighed silver", "Before coins, silver was weighed out: Abraham weighed 400 shekels for the cave at Machpelah.", "Genesis 23:16", true);
    L(labels, [-0.8, 1.4, 0], "Weighed and found wanting", "Tekel: “you have been weighed in the balances and found wanting.”", "Daniel 5:27", true, "/bible/3d/writing-on-the-wall");
    scale(scene, labels, -0.9, -0.6, true);
    return { view: v3(0.3, 0.55, 1) };
  },

  loom({ scene, labels }) {
    ground(scene, 10, 0xb8a888, false);
    // An upright loom with the warp held taut by clay weights, and a spindle and distaff
    // (Judges 16:13-14; Proverbs 31:19).
    const f = grp(scene, 0, 0, 0);
    rod(f, [-1.6, 0, -0.4], [-1.5, 5, 0], 0.09, MAT.darkWood); rod(f, [1.6, 0, -0.4], [1.5, 5, 0], 0.09, MAT.darkWood);
    rod(f, [-1.7, 4.8, 0.05], [1.7, 4.8, 0.05], 0.1, MAT.darkWood);
    const cloth = grp(f, 0, 0, 0.05);
    const wv = mesh(cloth, new THREE.PlaneGeometry(2.8, 1.6), mat(0xffffff, { tex: "linen", rep: 3, side: THREE.DoubleSide }), 0, 3.9, 0.05); void wv;
    for (let i = 0; i < 6; i++) rbox(cloth, 2.8, 0.12, 0.02, 0, 3.4 + i * 0.27, 0.07, i % 2 ? MAT.blue : MAT.scarlet, 0.005);
    for (let i = 0; i < 28; i++) { const x = -1.35 + i * 0.1; rod(cloth, [x, 3.1, 0.05], [x + (i % 2) * 0.02, 0.7, 0.05 - (i % 2) * 0.12], 0.006, mat(0xefe8d8, { rough: 1 })); }
    rod(f, [-1.55, 2.5, 0.0], [1.55, 2.5, -0.1], 0.04, MAT.olive);
    for (let i = 0; i < 14; i++) { const w = mesh(f, new THREE.TorusGeometry(0.1, 0.06, 8, 16), MAT.clay, -1.3 + i * 0.2, 0.6, 0.05 - (i % 2) * 0.12); void w; }
    // Spindle and distaff.
    const sp = grp(scene, 2.4, 0.04, 1.0, 0.4); sp.rotation.z = Math.PI / 2;
    rod(sp, [0, -0.3, 0], [0, 0.6, 0], 0.015, MAT.olive); mesh(sp, new THREE.CylinderGeometry(0.1, 0.1, 0.04, 20), MAT.olive, 0, -0.2, 0); sph(sp, 0.09, MAT.wool, 0, 0.2, 0, 1, 1.6, 1);
    const ds = grp(scene, 2.3, 0.04, 1.6, -0.5); ds.rotation.z = Math.PI / 2; rod(ds, [0, 0, 0], [0, 1.0, 0], 0.02, MAT.olive); sph(ds, 0.2, MAT.wool, 0, 0.95, 0, 1, 1.5, 1);
    L(labels, [0, 5.4, 0], "Woven on a loom", "Delilah wove seven locks of Samson's hair into the web of her loom and pinned it; he woke and pulled away pin, loom and web.", "Judges 16:13–14");
    L(labels, [0, 0.9, 0.3], "Loom weights", "Rings of clay that kept the warp threads taut. Rows of them turn up in houses all over Israel.", "Judges 16:14", true);
    L(labels, [2.4, 0.6, 1.2], "Distaff and spindle", "“She puts her hands to the distaff, and her hands hold the spindle.”", "Proverbs 31:19");
    L(labels, [0.6, 4.2, 0.2], "Blue, purple and scarlet", "Skilled women spun yarn for the tabernacle with their own hands.", "Exodus 35:25–26", true);
    return { view: v3(0.7, 0.45, 1) };
  },

  "rod-and-staff"({ scene, labels }) {
    plinth(scene, 3, 0xd9c9a3);
    // “Your rod and your staff, they comfort me” (Psalm 23:4): a club for defence and a long staff.
    const club = grp(scene, 0, 0.12, -0.6, 0.1); club.rotation.z = Math.PI / 2;
    vessel(club, [[0.025, 0], [0.03, 1.2], [0.06, 1.35], [0.12, 1.5], [0.11, 1.62], [0, 1.65]], MAT.olive);
    const staff = grp(scene, -1.5, 0.06, 0.6, 0);
    path(staff, [[0, 0, 0], [3.4, 0, 0], [3.8, 0, 0.1], [3.95, 0, 0.4], [3.8, 0, 0.62], [3.55, 0, 0.55]], 0.045, MAT.olive, 40);
    const bag = vessel(scene, [[0, 0], [0.25, 0.02], [0.3, 0.2], [0.22, 0.35]], MAT.leatherDark, 1.4, 0, -1.2); bag.scale.z = 0.6;
    beast(scene, -2.0, -1.4, { color: 0xf0ead8, wool: true, s: 0.55, face: 0.4 });
    L(labels, [0.8, 0.6, -0.6], "The rod", "A short club, often weighted at the end with knots or nails, to drive off wild animals. David killed a lion and a bear.", "Psalm 23:4; 1 Samuel 17:34–36");
    L(labels, [2.3, 0.5, 0.9], "The staff", "Long, with a crook at the end, for leaning on, guiding the flock and lifting a lamb out of trouble.", "Psalm 23:4");
    L(labels, [1.4, 0.7, -1.2], "The shepherd's bag", "For food, and stones for the sling.", "1 Samuel 17:40", true);
    L(labels, [-2, 1.6, -1.4], "Passing under the rod", "Sheep were counted one by one as they passed under the shepherd's rod.", "Leviticus 27:32; Ezekiel 20:37", true);
    return { view: v3(0.3, 0.8, 1) };
  },

  sheepfold({ scene, labels }) {
    ground(scene, 40, 0xb8ad7c, false);
    // A stone pen topped with thorns, with one opening where the shepherd lies across the gap (John 10:1-16).
    for (let i = 0; i < 64; i++) { const a = i / 64 * Math.PI * 2; if (Math.abs(a - Math.PI / 4) < 0.12) continue;
      const r = 7; rock(scene, 0.75, Math.cos(a) * r, 0.6, Math.sin(a) * r, [0xb6aa92, 0xa89a82, 0xc4b79e][i % 3], 1.2, 1.0, 1);
      rock(scene, 0.6, Math.cos(a + 0.05) * r, 1.6, Math.sin(a + 0.05) * r, [0xa89a82, 0xc4b79e][i % 2], 1.1, 0.9, 1);
      const th = bush(scene, Math.cos(a) * r, Math.sin(a) * r, 0.6, 0x5a6a3a); th.position.y = 2.1; }
    for (let i = 0; i < 14; i++) { const a = i * 2.4, r = 1 + (i % 5); beast(scene, Math.cos(a) * r, Math.sin(a) * r, { color: [0xf0ead8, 0xe5ddc8, 0x3a3430][i % 3 === 2 ? 2 : i % 2], wool: true, s: 0.55, face: a }); }
    const shep = figure(scene, Math.cos(Math.PI / 4) * 7.4, Math.sin(Math.PI / 4) * 7.4, { robe: 0x8b6f4e, cloth: 0xe0d6c0, beard: true, face: Math.PI / 4 + Math.PI, skin: 2 }); void shep;
    L(labels, [Math.cos(Math.PI / 4) * 7.6, 4.8, Math.sin(Math.PI / 4) * 7.6], "I am the door", "Often the shepherd lay across the opening himself. “I am the door. If anyone enters by me, he will be saved and will go in and out and find pasture.”", "John 10:7–9");
    L(labels, [0, 2.4, 0], "He calls his own sheep by name", "Several flocks might share one fold at night; in the morning each shepherd called and his own sheep followed him.", "John 10:3–5");
    L(labels, [-7, 3.2, 0], "Walls and thorns", "A wall of stones topped with thorn branches kept out wolves and thieves.", "John 10:1, 10", true);
    return { view: v3(1, 0.8, 1.1) };
  },

  well({ scene, labels }) {
    ground(scene, 30, C.sand, false);
    palm(scene, -8, -6, 12);
    // A well with a stone mouth, a bucket and troughs for the flocks (Genesis 24:11-20; 29:2-10; John 4:6-11).
    vessel(scene, [[1.4, 0], [1.5, 0.2], [1.55, 1.6], [1.4, 1.75], [1.0, 1.75], [1.0, 1.0]], MAT.limestone);
    const wt = mesh(scene, new THREE.CircleGeometry(1.0, 32), mat(0x1a2a30, { rough: 0.1 }), 0, 1.0, 0, -Math.PI / 2); wt.userData.noShadow = true;
    const stone = mesh(scene, new THREE.CylinderGeometry(1.1, 1.1, 0.35, 32), MAT.limestone, 2.6, 0.18, -0.6, 0, 0, 0.12); void stone;
    rbox(scene, 3.5, 0.8, 0.9, -1.5, 0, 2.4, MAT.limestone, 0.1);
    mesh(scene, new THREE.BoxGeometry(3.1, 0.1, 0.55), MAT.water, -1.5, 0.75, 2.4);
    const jar = vessel(scene, [[0, 0], [0.25, 0.03], [0.4, 0.4], [0.36, 0.85], [0.18, 1.05], [0.14, 1.2], [0.18, 1.26]], MAT.clay, 1.8, 0, 1.4); void jar;
    const bucket = vessel(scene, [[0, 0], [0.25, 0.02], [0.3, 0.4]], MAT.leather, 0.9, 1.75, 0.9); void bucket;
    path(scene, [[0.9, 2.15, 0.9], [0.6, 2.0, 0.6], [0.2, 1.8, 0.2], [-0.1, 1.76, -0.4]], 0.015, MAT.rope, 20);
    beast(scene, -5, 3, { color: 0xc8a878, s: 1.2, face: 0.3 });
    figure(scene, 3, 2.4, { robe: 0x7a5a6a, cloth: 0x5a3a4a, skin: 1, face: Math.PI * 1.15 });
    figure(scene, -2.2, -1.8, { robe: 0xe9e1cf, cloth: 0xe8e0cc, beard: true, sit: true, face: 0.6, skin: 2 });
    L(labels, [0, 2.6, 0], "Jacob's well", "Jesus, tired from the journey, sat by the well at noon. “Everyone who drinks of this water will be thirsty again, but whoever drinks of the water that I will give him will never be thirsty again.”", "John 4:5–14");
    L(labels, [2.6, 0.9, -0.6], "The stone on the well's mouth", "Jacob rolled the great stone from the mouth of the well to water Rachel's flock.", "Genesis 29:2–10", true);
    L(labels, [-1.5, 1.4, 2.4], "The trough", "Rebekah let down her jar and then drew water for all ten of Abraham's servant's camels.", "Genesis 24:15–20");
    L(labels, [0.4, 0.4, 1.9], "Deep", "“Sir, you have nothing to draw water with, and the well is deep.” Jacob's well is still about 40 m deep.", "John 4:11", true);
    return { view: v3(0.9, 0.6, 1.1) };
  },

  cistern({ scene, labels }) {
    // A bell-shaped cistern cut into rock, plastered inside, with a narrow mouth: shown as if the
    // hillside were sliced open (Jeremiah 38:6; Genesis 37:22-24; Jeremiah 2:13).
    const prof = [[0.9, 0], [1.4, -1], [3.4, -4.5], [3.6, -7], [0, -7.2]];
    const bell = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 40, Math.PI / 2, Math.PI);
    mesh(scene, bell, mat(0xe4dac8, { tex: "plaster", rough: 1, side: THREE.DoubleSide }), 0, 0, 0);
    // The cut face of the rock, with the cistern's outline as a hole.
    const face = new THREE.Shape(); face.moveTo(-6, 0.01); face.lineTo(6, 0.01); face.lineTo(6, -8.5); face.lineTo(-6, -8.5); face.lineTo(-6, 0.01);
    const hole = new THREE.Path(); const pts = [...prof.map(([r, y]) => [r, y]), ...prof.slice().reverse().map(([r, y]) => [-r, y])];
    pts.forEach(([x, y], i) => (i ? hole.lineTo(x, y) : hole.moveTo(x, y))); face.holes.push(hole);
    const fg = new THREE.ExtrudeGeometry(face, { depth: 0.3, bevelEnabled: false }); fg.translate(0, 0, -0.3);
    mesh(scene, fg, mat(0xb9ad96, { tex: "rock", rough: 1 }));
    // The hillside on top and the rock behind.
    const top = mesh(scene, new THREE.PlaneGeometry(12, 7), mat(0xffffff, { tex: "sand", rough: 1, rep: 2 }), 0, 0.01, -3.5, -Math.PI / 2); top.userData.noShadow = true;
    const back = mesh(scene, new THREE.PlaneGeometry(12, 8.5), mat(0x8a7f6a, { tex: "rock", rough: 1 }), 0, -4.25, -6.9); void back;
    [-6, 6].forEach((x) => mesh(scene, new THREE.PlaneGeometry(7, 8.5), mat(0x9a8f7a, { tex: "rock", rough: 1, side: THREE.DoubleSide }), x, -4.25, -3.5, 0, Math.PI / 2, 0));
    const mud = mesh(scene, new THREE.CircleGeometry(3.5, 40, Math.PI, Math.PI), mat(0x4a3a2a, { rough: 0.6 }), 0, -6.9, 0, -Math.PI / 2); mud.userData.noShadow = true;
    vessel(scene, [[1.1, 0], [1.2, 0.5], [0.9, 0.55]], MAT.limestone, 0, 0, 0);
    figure(scene, 0.4, -1.6, { robe: 0x6b5236, beard: true, y: -7.0, raise: true, face: 0.3 });
    path(scene, [[0, 1.5, -0.3], [0.2, -2, -0.9], [0.5, -3.4, -1.4]], 0.03, MAT.rope, 20);
    figure(scene, -2.5, -2.5, { robe: 0x2d2a26, cloth: 0xe8e0cc, skin: 2, face: 0.5, reach: true });
    L(labels, [0, 2.2, 0], "A cistern", "Rainwater ran into tanks cut in the rock and plastered. Israel had “broken cisterns that can hold no water” when they forsook the fountain of living water.", "Jeremiah 2:13");
    L(labels, [0.4, -2.8, -1.6], "Jeremiah in the mud", "They let Jeremiah down by ropes into the cistern of Malchiah. There was no water, only mud, and he sank in it.", "Jeremiah 38:6");
    L(labels, [-2.5, 4.6, -2.5], "Ebed-melech", "An Ethiopian official who pulled him out with old rags and ropes.", "Jeremiah 38:7–13", true);
    L(labels, [2.8, -4, 0], "Joseph's pit", "His brothers threw Joseph into an empty cistern before selling him.", "Genesis 37:22–28", true);
    return { view: v3(0.2, 0.15, 1), target: v3(0, -3, 0), zoom: 1.05 };
  },

  "mud-bricks"({ scene, labels }) {
    ground(scene, 30, 0xc0a878, false);
    // Making bricks in Egypt: clay, straw, a wooden mould, rows drying in the sun (Exodus 1:14; 5:6-19).
    const brick = mat(0x9a7450, { rough: 1 });
    for (let r = 0; r < 4; r++) for (let i = 0; i < 9; i++) rbox(scene, 0.75, 0.25, 0.4, -4 + i * 0.95, 0, -2.5 + r * 0.7, brick, 0.03);
    for (let l = 0; l < 6; l++) for (let i = 0; i < 4 - (l % 2); i++) rbox(scene, 0.75, 0.25, 0.4, 3.2 + i * 0.78 + (l % 2) * 0.39, l * 0.26, 1.5, brick, 0.03);
    const mould = grp(scene, -1.2, 0, 1.4); [[0, -0.22], [0, 0.22]].forEach(([x, z]) => rbox(mould, 0.95, 0.27, 0.06, x, 0, z, MAT.wood, 0.01)); [[-0.45, 0], [0.45, 0]].forEach(([x]) => rbox(mould, 0.06, 0.27, 0.5, x, 0, 0, MAT.wood, 0.01)); rod(mould, [0.5, 0.2, 0], [0.9, 0.2, 0], 0.03, MAT.wood);
    const pit = mesh(scene, new THREE.CylinderGeometry(1.6, 1.6, 0.15, 32), mat(0x6a5038, { rough: 0.5 }), -4, 0.07, 2.4); void pit;
    for (let i = 0; i < 40; i++) { const s = mesh(scene, new THREE.CylinderGeometry(0.02, 0.02, 0.8, 4), mat(0xe0c070, { rough: 1 }), -1.5 + (i % 8) * 0.25, 0.05, 3.5 + Math.floor(i / 8) * 0.18, Math.PI / 2, 0, i); s.userData.noShadow = true; }
    figure(scene, -2.4, 1.6, { robe: 0xe9e1cf, cloth: false, skin: 2, sit: true, reach: true, face: 0 });
    figure(scene, 5, -2, { robe: 0xffffff, cloth: 0x2d4f8c, skin: 2, face: Math.PI * 0.8 });
    rod(scene, [5.5, 0, -1.7], [5.6, 3.4, -1.6], 0.03, MAT.darkWood);
    L(labels, [0, 1.4, -1.5], "Bricks dried in the sun", "Clay mixed with chopped straw, pressed into a wooden mould and left to bake in the sun.", "Exodus 1:14");
    L(labels, [-0.5, 1.1, 3.8], "No more straw", "Pharaoh made it harder: “You shall no longer give the people straw to make bricks… let them go and gather straw for themselves. But the number of bricks shall be the same.”", "Exodus 5:6–19");
    L(labels, [5, 4.5, -2], "Taskmasters", "Egyptian overseers beat the Israelite foremen when the quota fell short.", "Exodus 5:14", true);
    L(labels, [4.3, 2, 1.5], "Babel's bricks", "“Come, let us make bricks, and burn them thoroughly.” Fired bricks and tar, for a tower to reach the heavens.", "Genesis 11:3–4", true, "/bible/3d/tower-of-babel");
    return { view: v3(0.8, 0.7, 1.1) };
  },

  "refiners-fire"({ scene, labels }) {
    ground(scene, 10, 0xb8a888, false);
    // A clay furnace, a crucible of molten silver, bellows and tongs (Malachi 3:2-3; Proverbs 17:3; Isaiah 48:10).
    vessel(scene, [[1.0, 0], [1.1, 0.2], [1.0, 1.2], [0.7, 1.6], [0.6, 1.62], [0.6, 1.2]], MAT.clayDark);
    [[0, 1.0], [0.3, 1.1], [-0.3, 1.05]].forEach(([x, y]) => sph(scene, 0.25, MAT.ember, x, y, 0.1, 1, 0.5, 1));
    const cr = vessel(scene, [[0, 0], [0.22, 0.02], [0.28, 0.25], [0.3, 0.32]], mat(0x8a8078, { rough: 0.8 }), 0, 1.35, 0); void cr;
    const mol = mesh(scene, new THREE.CircleGeometry(0.26, 24), new THREE.MeshBasicMaterial({ color: 0xfff3d0 }), 0, 1.64, 0, -Math.PI / 2); void mol;
    const lt = new THREE.PointLight(0xffa040, 4, 6, 2); lt.position.set(0, 2.2, 0); scene.add(lt);
    const dross = mesh(scene, new THREE.TorusGeometry(0.18, 0.04, 6, 16), mat(0x3a3330, { rough: 1 }), 0.05, 1.66, 0.04, Math.PI / 2); void dross;
    // Foot bellows of skin, with clay pipes into the fire.
    [-1, 1].forEach((sd) => { const b = sph(scene, 0.45, MAT.leather, -2.0, 0.25, sd * 0.7, 1.2, 0.5, 1); void b; rod(scene, [-1.5, 0.3, sd * 0.6], [-0.9, 0.5, sd * 0.15], 0.07, MAT.clay); });
    const tg = grp(scene, 1.3, 0.05, 0.8, -0.6); [-1, 1].forEach((sd) => path(tg, [[0, 0, 0], [0.5, 0, sd * 0.03], [0.9, 0, sd * 0.02]], 0.02, MAT.darkIron, 12));
    figure(scene, 0, -2.2, { robe: 0x7a5a3e, cloth: false, beard: true, sit: true, reach: true, face: Math.PI / 2, skin: 2, skipFit: true });
    L(labels, [0, 2.4, 0], "Like a refiner's fire", "“He will sit as a refiner and purifier of silver, and he will purify the sons of Levi and refine them like gold and silver.” The refiner watched until he could see his own face in the molten metal.", "Malachi 3:2–3");
    L(labels, [0.3, 1.9, 0.2], "Dross", "The impurities rose to the top and were skimmed off. “Your silver has become dross.”", "Isaiah 1:22, 25", true);
    L(labels, [-2.0, 0.8, 0.7], "Bellows", "Skin bags worked by the feet blew air through clay pipes to make the fire hot enough. “The bellows blow fiercely… in vain the refining goes on.”", "Jeremiah 6:29", true);
    L(labels, [1.2, 0.5, 0.9], "The furnace of affliction", "“Behold, I have refined you, but not as silver; I have tried you in the furnace of affliction.”", "Isaiah 48:10; 1 Peter 1:7", true);
    return { view: v3(0.9, 0.75, 1) };
  },

  forge({ scene, labels }) {
    ground(scene, 12, 0xb8a888, false);
    // The smith at his forge: hearth, anvil, hammer and tongs (Isaiah 44:12; 54:16; 1 Samuel 13:19-21).
    rbox(scene, 2.2, 1.2, 1.6, -1.4, 0, 0, MAT.limestone, 0.15);
    [[-1.4, 1.25, 0], [-1.1, 1.3, 0.2], [-1.7, 1.28, -0.2]].forEach(([x, y, z]) => sph(scene, 0.3, MAT.ember, x, y, z, 1, 0.4, 1));
    const bar = rod(scene, [-1.4, 1.35, 0], [0.4, 1.4, 0.2], 0.04, new THREE.MeshBasicMaterial({ color: 0xff7a2a })); void bar;
    const lt = new THREE.PointLight(0xff8a3a, 3, 6, 2); lt.position.set(-1.4, 2, 0); scene.add(lt);
    mesh(scene, new THREE.CylinderGeometry(0.35, 0.45, 1.2, 16), MAT.wood, 1.2, 0.6, 0);
    rbox(scene, 0.9, 0.35, 0.45, 1.2, 1.2, 0, MAT.darkIron, 0.04);
    cone(scene, 0.18, 0.5, MAT.darkIron, 1.8, 1.38, 0, 0, -Math.PI / 2);
    const hm = grp(scene, 1.6, 1.6, 0.6, 0.4); rod(hm, [0, 0, 0], [0.9, 0, 0], 0.03, MAT.olive); rbox(hm, 0.14, 0.14, 0.32, 0.92, -0.07, 0, MAT.darkIron, 0.03);
    [-1, 1].forEach((sd) => { const b = sph(scene, 0.4, MAT.leather, -2.4, 0.3, sd * 0.8, 1.2, 0.5, 1); void b; });
    figure(scene, 2.6, -0.6, { robe: 0x6b5236, cloth: false, beard: true, reach: true, face: Math.PI * 0.95, skin: 1, skipFit: true });
    L(labels, [-1.4, 2.2, 0], "The smith's hearth", "“I have created the smith who blows the fire of coals and produces a weapon for its purpose.”", "Isaiah 54:16");
    L(labels, [1.2, 2.1, 0], "Anvil and hammer", "“The ironsmith takes a cutting tool and works it over the coals; he fashions it with hammers.”", "Isaiah 44:12");
    L(labels, [0, 0.8, 1.2], "No smith in Israel", "The Philistines kept iron-working to themselves, so that the Hebrews could not make swords or spears.", "1 Samuel 13:19–22", true);
    L(labels, [-2.4, 0.9, 0.8], "Tubal-cain", "The first “forger of all instruments of bronze and iron”.", "Genesis 4:22", true);
    return { view: v3(0.6, 0.65, 1) };
  },
};
