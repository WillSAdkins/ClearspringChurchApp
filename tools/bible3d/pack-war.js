/* Weapons and armour. 1 unit = 1 cubit (about 45 cm). */
import {
  THREE, MAT, C, GOLD, BRONZE, SILVER, IRON, mat, mesh, grp, sph, cone, tor, rod, path, vessel, slab, rbox, box, cyl,
  textPlane, scale, L, plinth, ground, figure, beast, flame, rock, hill, v3, ref, bush, olive,
} from "./kit.js";

// A sword blade with a midrib, lying along +x from the hilt.
function blade(p, len, w, m, x = 0, y = 0, z = 0) {
  const g = grp(p, x, y, z);
  slab(g, [[0, -w / 2], [len * 0.82, -w * 0.42], [len, 0], [len * 0.82, w * 0.42], [0, w / 2]], w * 0.12, m, 0, 0, 0, Math.PI / 2, 0, 0, w * 0.04);
  rod(g, [0, 0, 0], [len * 0.9, 0, 0], w * 0.07, m);
  return g;
}
// A round shield (magen) or a long shield (tsinnah), facing +x.
function shield(p, x, y, z, r, m, rim = BRONZE) {
  const g = grp(p, x, y, z);
  const s = mesh(g, new THREE.SphereGeometry(r * 2.2, 40, 12, 0, Math.PI * 2, 0, 0.47), m, 0, 0, 0, 0, 0, -Math.PI / 2); s.position.x = -r * 2.2 * Math.cos(0.47);
  tor(g, r, r * 0.05, rim, 0, 0, 0, 0, Math.PI / 2);
  sph(g, r * 0.16, rim, r * 0.24, 0, 0);
  return g;
}
// A spear: shaft and leaf-shaped head, from a to b.
function spear(p, a, b, r, headLen, m = IRON, shaft = MAT.darkWood) {
  const A = v3(...a), B = v3(...b), d = B.clone().sub(A).normalize();
  const tip = B.clone(), base = B.clone().sub(d.clone().multiplyScalar(headLen));
  rod(p, a, base.toArray(), r, shaft);
  const head = mesh(p, new THREE.ConeGeometry(r * 3, headLen, 4), m);
  head.position.copy(base).add(d.clone().multiplyScalar(headLen / 2)); head.quaternion.setFromUnitVectors(v3(0, 1, 0), d); head.scale.set(1, 1, 0.35);
  return head;
}
// A composite bow, strung, in the XY plane.
function bow(p, x, y, z, h = 2.4, ry = 0) {
  const g = grp(p, x, y, z, ry), m = mat(0x5a3a22, { rough: 0.6 });
  const pts = []; for (let i = 0; i <= 20; i++) { const t = i / 20 - 0.5; pts.push([-0.22 * Math.cos(t * Math.PI) + 0.1 * Math.cos(t * Math.PI * 3) * (Math.abs(t) > 0.35 ? 1 : 0), t * h, 0]); }
  path(g, pts, 0.035, m, 40);
  rod(g, pts[0], pts[20], 0.006, MAT.rope);
  return g;
}
function arrow(p, a, b, m = IRON) {
  rod(p, a, b, 0.012, MAT.reed);
  const A = v3(...a), B = v3(...b), d = B.clone().sub(A).normalize();
  const h = mesh(p, new THREE.ConeGeometry(0.03, 0.12, 4), m); h.position.copy(B); h.quaternion.setFromUnitVectors(v3(0, 1, 0), d);
  [0, 1, 2].forEach((k) => { const f = mesh(p, new THREE.PlaneGeometry(0.16, 0.05), mat(0xe8e0d0, { side: THREE.DoubleSide })); f.position.copy(A).add(d.clone().multiplyScalar(0.12)); f.quaternion.setFromUnitVectors(v3(1, 0, 0), d); f.rotateX(k * Math.PI / 3); });
}

export const MODELS = {
  sling({ scene, labels }) {
    plinth(scene, 1.6, 0xd9c9a3);
    // A shepherd's sling: a leather pouch and two cords (1 Samuel 17:40, 49; Judges 20:16).
    const pouch = vessel(scene, [[0, 0], [0.09, 0.005], [0.12, 0.03], [0.11, 0.05]], MAT.leather, 0, 0.01, 0); pouch.scale.set(1, 0.5, 0.7);
    path(scene, [[-0.11, 0.03, 0], [-0.6, 0.012, 0.18], [-1.1, 0.012, 0.05], [-1.35, 0.012, -0.25]], 0.01, MAT.rope, 40);
    path(scene, [[0.11, 0.03, 0], [0.6, 0.012, 0.22], [1.0, 0.012, 0.42], [1.3, 0.012, 0.3]], 0.01, MAT.rope, 40);
    tor(scene, 0.04, 0.01, MAT.rope, 1.33, 0.012, 0.3);
    // Five smooth stones from the brook, and the shepherd's bag.
    [[0.4, -0.45], [0.55, -0.35], [0.47, -0.62], [0.65, -0.55], [0.3, -0.6]].forEach(([x, z], i) => rock(scene, 0.07 + (i % 2) * 0.01, x, 0.06, z, [0xd2c7b2, 0xb8ab94, 0xc4b8a2][i % 3], 1.2, 0.8, 1));
    const bag = vessel(scene, [[0, 0], [0.22, 0.02], [0.26, 0.15], [0.2, 0.3], [0.12, 0.34]], MAT.leatherDark, -0.5, 0, -0.55); bag.scale.z = 0.6;
    path(scene, [[-0.62, 0.32, -0.55], [-0.4, 0.6, -0.5], [-0.38, 0.33, -0.55]], 0.012, MAT.leatherDark, 20);
    L(labels, [0, 0.25, 0], "The sling", "A leather pouch between two cords. Whirled round and let go, it could throw a stone well over 100 m, as fast as a modern pistol bullet.", "1 Samuel 17:40, 49");
    L(labels, [0.5, 0.25, -0.5], "Five smooth stones", "David chose five smooth stones from the brook and put them in his shepherd's bag. He needed one.", "1 Samuel 17:40, 49–50");
    L(labels, [1.3, 0.2, 0.3], "Not miss by a hair", "Benjamin had 700 left-handed slingers who could each sling a stone at a hair and not miss.", "Judges 20:16", true);
    scale(scene, labels, -0.2, 0.75, true);
    return { view: v3(0.4, 0.9, 1) };
  },

  "goliaths-armour"({ scene, labels }) {
    ground(scene, 16, 0xb8ad7c, false);
    // Helmet and coat of scales of bronze (5,000 shekels), bronze greaves, a bronze javelin, and a
    // spear with a shaft like a weaver's beam and an iron head of 600 shekels (1 Samuel 17:5-7).
    const st = grp(scene, 0, 0, 0);
    rod(st, [0, 0, 0], [0, 5.6, 0], 0.12, MAT.darkWood); rod(st, [0, 5.0, -1.3], [0, 5.0, 1.3], 0.1, MAT.darkWood);
    [[-0.8, -0.8], [0.8, -0.8], [0, 1]].forEach(([x, z]) => rod(st, [0, 0.9, 0], [x, 0, z], 0.08, MAT.darkWood));
    // The coat of scales.
    const scaleM = mat(C.bronze, { rough: 0.4, metal: 0.85 });
    const coat = grp(st, 0, 2.2, 0);
    for (let row = 0; row < 14; row++) { const y = row * 0.2, r = 0.95 - Math.abs(row - 9) * 0.02;
      for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2 + (row % 2) * 0.11; const sc = mesh(coat, new THREE.BoxGeometry(0.2, 0.26, 0.025), scaleM, Math.cos(a) * r, y, Math.sin(a) * r * 0.7, -0.15, -a + Math.PI / 2, 0); sc.rotation.order = "YXZ"; sc.rotation.set(-0.12, -a + Math.PI / 2, 0); } }
    // Sleeves of scales over the arms.
    [-1, 1].forEach((sd) => { const sl = grp(st, 0, 4.6, sd * 1.15); for (let i = 0; i < 4; i++) tor(sl, 0.35, 0.09, scaleM, 0, -i * 0.25, 0); });
    // The helmet.
    const hm = grp(st, 0, 5.8, 0);
    vessel(hm, [[0.42, 0], [0.45, 0.2], [0.42, 0.45], [0.3, 0.68], [0.06, 0.8], [0, 0.82]], BRONZE);
    cone(hm, 0.07, 0.4, BRONZE, 0, 1.0, 0);
    // Greaves on the ground.
    [-0.5, 0.5].forEach((z) => { const gv = vessel(scene, [[0.2, 0], [0.24, 0.4], [0.22, 0.9], [0.18, 1.2]], BRONZE, 1.6, 0.25, z); gv.rotation.z = -Math.PI / 2; gv.scale.z = 0.7; });
    // The spear and the javelin.
    spear(scene, [-2.4, 0.25, -2.2], [5.5, 0.4, -2.2], 0.16, 1.2, IRON);
    spear(scene, [-1.8, 0.1, 2.0], [3.4, 0.2, 2.0], 0.05, 0.5, BRONZE, BRONZE);
    // The shield-bearer's great shield.
    const sh = grp(scene, -2.3, 0, 0.5, 0.6); rbox(sh, 0.15, 5, 2.6, 0, 0, 0, MAT.leather, 0.1);
    for (let i = 0; i < 5; i++) rbox(sh, 0.17, 0.1, 2.6, 0, 0.6 + i, 0, BRONZE, 0.02);
    L(labels, [0, 7.0, 0], "Helmet and scale armour", "A bronze helmet and a coat of scale armour weighing 5,000 shekels of bronze, about 57 kg: heavier than many grown men.", "1 Samuel 17:5");
    L(labels, [5.0, 1.1, -2.2], "A spear like a weaver's beam", "The shaft was as thick as the beam of a loom; the iron head alone weighed 600 shekels, about 7 kg.", "1 Samuel 17:7");
    L(labels, [3.0, 0.8, 2.0], "A bronze javelin", "Slung between his shoulders.", "1 Samuel 17:6", true);
    L(labels, [1.8, 0.8, 0], "Bronze greaves", "Shin guards, on his legs.", "1 Samuel 17:6", true);
    L(labels, [-2.3, 5.4, 0.5], "His shield-bearer", "A man went ahead of him carrying the shield.", "1 Samuel 17:7, 41", true);
    scale(scene, labels, -3.5, -3.2);
    return { view: v3(0.85, 0.5, 1) };
  },

  goliath({ scene, labels }) {
    ground(scene, 30, 0xb8ad7c);
    // Six cubits and a span (about 2.9 m) in the Hebrew text; four cubits and a span (about 2 m)
    // in the Greek Old Testament and a Dead Sea Scroll (1 Samuel 17:4).
    // A figure's height is about 0.94 of its h, so this stands 6.5 cubits.
    const H = 6.9, k = H / 4;
    const gol = figure(scene, 0, 0, { h: H, robe: 0x7a6040, cloth: false, beard: true, face: Math.PI * 0.85 });
    const sc = mat(C.bronze, { rough: 0.4, metal: 0.85 });
    vessel(gol, [[0.6, 1.1], [0.55, 1.6], [0.47, 2.0], [0.5, 2.5], [0.52, 2.75], [0.3, 2.9]].map(([r, y]) => [r * k * 1.04, y * k]), sc);
    vessel(gol, [[0.33, 3.32], [0.34, 3.5], [0.28, 3.72], [0.08, 3.82], [0, 3.83]].map(([r, y]) => [r * k, y * k]), BRONZE);
    spear(scene, [1.2, 0, 1.3], [1.2, 6.4, 1.3], 0.13, 0.9);
    figure(scene, 3.5, 2.0, { h: 3.7, robe: 0xa8875a, cloth: 0xe8e0cc, skin: 3, face: -Math.PI * 0.15, reach: true });
    figure(scene, -3.2, 2.5, { h: 4, robe: 0x2f6f68, cloth: 0xe9e1cf, skin: 1, face: -Math.PI * 0.5, skipFit: true });
    // A height mark beside them.
    const mk = grp(scene, -1.6, 0, -1.4);
    for (let i = 0; i <= 6; i++) { rbox(mk, 0.5, 0.04, 0.05, 0, i, 0, i % 2 ? MAT.white : MAT.black, 0.01); textPlane(mk, [i + ""], 0.3, 0.3, -0.45, i, 0, { bg: null, transparent: true, size: 180, ink: "#2a2a2a" }); }
    rod(mk, [0.25, 0, 0], [0.25, 6.5, 0], 0.03, MAT.black);
    textPlane(mk, ["cubits"], 1.0, 0.3, -0.4, 6.8, 0, { bg: null, transparent: true, size: 80, ink: "#2a2a2a" });
    L(labels, [0, 7.2, 0], "Six cubits and a span", "About 2.9 m (9 ft 6 in) in the Hebrew text. The oldest Greek copies and a Dead Sea Scroll say four cubits and a span, about 2 m: still a head taller than anyone in Israel.", "1 Samuel 17:4");
    L(labels, [3.5, 4.4, 2.0], "David", "A youth, ruddy and handsome, with a staff, a sling and five stones.", "1 Samuel 17:40–42");
    L(labels, [-3.2, 4.6, 2.5], "A grown man, for scale", "About 4 cubits (1.8 m). Saul was a head taller than everyone else.", "1 Samuel 9:2", true);
    return { view: v3(1, 0.35, 1) };
  },

  "armour-of-god"({ scene, labels }) {
    ground(scene, 10, C.stone);
    // A Roman soldier's kit, as Paul uses it (Ephesians 6:13-17).
    const g = figure(scene, 0, 0, { robe: 0xa3302a, cloth: false, skin: 3, face: Math.PI * 0.2 });
    // Belt (cingulum) with hanging studded straps.
    tor(g, 0.48, 0.07, MAT.leatherDark, 0, 1.92, 0);
    for (let i = -2; i <= 2; i++) { const a = Math.PI + i * 0.12; rbox(g, 0.04, 0.6, 0.06, Math.cos(a) * -0.5, 1.3, Math.sin(a) * 0.5, MAT.leatherDark, 0.01); }
    // Breastplate: banded iron plates.
    for (let i = 0; i < 6; i++) tor(g, 0.47 - Math.abs(i - 2.5) * 0.01, 0.06, mat(0x8c9096, { rough: 0.3, metal: 0.9 }), 0, 2.05 + i * 0.13, 0).scale.set(1, 0.8, 1);
    [-1, 1].forEach((sd) => { const sp = mesh(g, new THREE.SphereGeometry(0.3, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x8c9096, { rough: 0.3, metal: 0.9 }), 0, 2.7, sd * 0.42); sp.scale.set(1, 0.6, 1); });
    // Helmet with neck guard, cheek pieces and crest.
    const hm = grp(g, 0, 3.3, 0);
    mesh(hm, new THREE.SphereGeometry(0.34, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x9aa0a6, { rough: 0.25, metal: 0.95 }), 0, 0.08, 0);
    const ng = mesh(hm, new THREE.CylinderGeometry(0.36, 0.42, 0.08, 24, 1, false, Math.PI * 0.5, Math.PI), mat(0x9aa0a6, { rough: 0.25, metal: 0.95 }), 0, 0.05, 0); void ng;
    rbox(hm, 0.1, 0.12, 0.6, 0, 0.4, 0, MAT.red, 0.03);
    // Sandals (caligae).
    [-0.25, 0.25].forEach((z) => rbox(g, 0.55, 0.08, 0.22, 0.15, 0, z, MAT.leatherDark, 0.03));
    // The big curved shield (scutum) and the short sword (gladius).
    const sh = grp(scene, 0.9, 0, 0.9, 1.07);
    mesh(sh, new THREE.CylinderGeometry(1.3, 1.3, 2.4, 32, 1, true, -0.45, 0.9), mat(0xa3302a, { rough: 0.6, side: THREE.DoubleSide }), 0, 1.6, -1.3);
    sph(sh, 0.16, mat(0xd8b44a, { rough: 0.3, metal: 0.9 }), 0, 1.6, 0.02);
    rbox(sh, 0.06, 2.4, 0.05, 0, 0.4, 0.0, mat(0xd8b44a, { rough: 0.3, metal: 0.9 }), 0.01);
    const sw = grp(scene, -0.15, 1.75, -0.55); sw.rotation.z = -1.3;
    blade(sw, 1.1, 0.12, mat(0xc9ced4, { rough: 0.2, metal: 1 }));
    rod(sw, [-0.3, 0, 0], [0, 0, 0], 0.035, MAT.darkWood); sph(sw, 0.07, MAT.darkWood, -0.33, 0, 0); rbox(sw, 0.06, 0.06, 0.2, 0, -0.03, 0, MAT.darkWood, 0.02);
    L(labels, [0.2, 4.2, 0], "Helmet of salvation", "“Take the helmet of salvation.”", "Ephesians 6:17");
    L(labels, [0.5, 2.5, 0.3], "Breastplate of righteousness", "Strips of iron on leather, covering the heart.", "Ephesians 6:14");
    L(labels, [0.5, 1.7, -0.5], "Belt of truth", "Everything else hung from it, and it tucked up the tunic to fight.", "Ephesians 6:14", true);
    L(labels, [1.4, 2.7, 0.9], "Shield of faith", "The tall curved scutum, of wood and leather. Soaked in water, it could put out flaming arrows.", "Ephesians 6:16");
    L(labels, [-0.4, 2.0, -0.9], "Sword of the Spirit", "The short gladius, for close fighting: “the sword of the Spirit, which is the word of God.”", "Ephesians 6:17", true);
    L(labels, [0.4, 0.3, 0.3], "Feet ready", "Hobnailed sandals: “shoes for your feet, the readiness given by the gospel of peace.”", "Ephesians 6:15", true);
    return { view: v3(1, 0.3, 0.55) };
  },

  "ehuds-sword"({ scene, labels }) {
    plinth(scene, 1.0, 0xd9c9a3);
    // A double-edged sword a cubit (gomed) long, strapped to his right thigh (Judges 3:16).
    const sw = grp(scene, -0.45, 0.05, 0, 0.3);
    blade(sw, 0.85, 0.11, mat(0xb8b2a8, { rough: 0.3, metal: 0.9 }), 0.18, 0, 0);
    rod(sw, [-0.02, 0, 0], [0.18, 0, 0], 0.03, MAT.olive);
    rbox(sw, 0.04, 0.03, 0.18, 0.18, -0.015, 0, BRONZE, 0.01); sph(sw, 0.05, BRONZE, -0.04, 0, 0, 1, 0.7, 1);
    const sh = grp(scene, 0.1, 0.03, 0.4, 0.25); rbox(sh, 0.95, 0.04, 0.14, 0.45, 0, 0, MAT.leatherDark, 0.02); path(sh, [[0, 0.02, 0], [-0.2, 0.02, 0.15], [-0.5, 0.02, 0.1]], 0.012, MAT.leatherDark, 12);
    L(labels, [0, 0.3, 0], "Double-edged, a cubit long", "Ehud the left-handed made himself a two-edged sword about 45 cm long and strapped it under his clothes on his right thigh, where no guard would expect it.", "Judges 3:15–16");
    L(labels, [0.6, 0.15, 0.4], "The sheath", "Worn on the right because he drew with his left hand.", "Judges 3:21", true);
    scale(scene, labels, 0.3, -0.5, true);
    return { view: v3(0.3, 0.85, 1) };
  },

  "bow-and-quiver"({ scene, labels }) {
    plinth(scene, 2.2, 0xd9c9a3);
    // A composite bow and a quiver of arrows (Genesis 27:3; 1 Samuel 20:20; Psalm 127:4-5).
    const b = bow(scene, -0.5, 0.25, 0, 2.6); b.rotation.x = -Math.PI / 2;
    const q = grp(scene, 0.8, 0.12, 0.3, 0.4); q.rotation.z = Math.PI / 2 - 0.2;
    vessel(q, [[0.11, 0], [0.13, 0.4], [0.14, 1.1], [0.16, 1.4]], MAT.leather);
    for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; arrow(q, [Math.cos(a) * 0.07, 0.4, Math.sin(a) * 0.07], [Math.cos(a) * 0.08, 1.9, Math.sin(a) * 0.08]); }
    arrow(scene, [0.2, 0.03, -0.9], [1.6, 0.03, -0.6]);
    L(labels, [-0.5, 0.4, 0], "A composite bow", "Wood, horn and sinew glued in layers: the strongest bow of the ancient world. “Bronze bow” in the psalms may mean one bound with bronze.", "Psalm 18:34");
    L(labels, [1.0, 0.5, 0.4], "Like arrows in the hand of a warrior", "“Are the children of one's youth. Blessed is the man who fills his quiver with them.”", "Psalm 127:4–5");
    L(labels, [1.4, 0.2, -0.6], "Jonathan's arrows", "Jonathan shot three arrows beside the stone Ezel as a secret signal to David.", "1 Samuel 20:20–22, 35–42", true);
    scale(scene, labels, 0.3, 1.3, true);
    return { view: v3(0.4, 0.9, 1) };
  },

  "gold-shields"({ scene, labels }) {
    ground(scene, 14, C.stone);
    // 200 large shields of beaten gold (600 shekels each) and 300 small shields (3 minas each),
    // hung in the House of the Forest of Lebanon (1 Kings 10:16-17); replaced with bronze (14:25-27).
    rbox(scene, 10, 6, 0.6, 0, 0, -1, mat(0xffffff, { tex: "wood", rough: 0.8, rep: 3 }), 0.05);
    for (let i = 0; i < 4; i++) {
      const g = grp(scene, -3.6 + i * 2.4, 2.8, -0.55, 0); g.rotation.y = -Math.PI / 2;
      const tall = slab(g, [[-0.85, -2], [0.85, -2], [0.95, 0], [0.85, 1.8], [0, 2.2], [-0.85, 1.8], [-0.95, 0]], 0.12, GOLD, 0, 0, 0, 0, Math.PI / 2, 0, 0.03); void tall;
    }
    for (let i = 0; i < 5; i++) shield(scene, -4 + i * 2, 5.2, -0.6, 0.55, GOLD, GOLD).rotation.y = -Math.PI / 2;
    shield(scene, 3.5, 0.6, 1.4, 0.6, BRONZE, BRONZE).rotation.set(0, -1.2, -1.2);
    L(labels, [0, 6.5, -0.5], "Shields of gold", "Solomon made 200 large shields, each of 600 shekels of beaten gold (about 7 kg), and 300 small ones of 3 minas, and hung them in the House of the Forest of Lebanon.", "1 Kings 10:16–17");
    L(labels, [3.5, 1.5, 1.4], "Replaced with bronze", "Shishak king of Egypt carried them all away; Rehoboam made bronze ones instead, kept by the guards.", "1 Kings 14:25–28");
    scale(scene, labels, -4, 2.5);
    return { view: v3(0.6, 0.35, 1) };
  },

  chariot({ scene, labels }) {
    ground(scene, 40, C.sand);
    // A two-wheeled war chariot with a team of two horses, the kind Pharaoh pursued Israel with
    // (Exodus 14:6-9; Judges 4:3; 1 Kings 10:29).
    const c = grp(scene, 0, 0, 0);
    const wood = mat(0x9a6a3f, { rough: 0.7 }), lea = MAT.leather;
    [-1.6, 1.6].forEach((z) => {
      const wh = grp(c, -0.6, 1.5, z);
      tor(wh, 1.45, 0.09, wood, 0, 0, 0, 0, 0);
      for (let i = 0; i < 6; i++) rod(wh, [0, 0, 0], [Math.cos(i * Math.PI / 3) * 1.45, Math.sin(i * Math.PI / 3) * 1.45, 0], 0.05, wood);
      mesh(wh, new THREE.CylinderGeometry(0.16, 0.16, 0.5, 16), wood, 0, 0, 0, Math.PI / 2);
    });
    rod(c, [-0.6, 1.5, -1.9], [-0.6, 1.5, 1.9], 0.07, wood);
    // The cab: a light floor and a waist-high front, open behind.
    rbox(c, 1.6, 0.12, 2.6, 0, 1.55, 0, wood, 0.03);
    const cab = mesh(c, new THREE.CylinderGeometry(1.3, 1.3, 1.9, 24, 1, true, Math.PI * 0.15, Math.PI * 0.7), mat(0xc69a5a, { rough: 0.6, side: THREE.DoubleSide }), -0.2, 2.6, 0);
    cab.scale.z = 1.05;
    path(c, [[0.75, 1.6, 0], [2.5, 2.2, 0], [4.8, 2.9, 0]], 0.08, wood, 20);
    rod(c, [4.6, 2.9, -1.3], [4.6, 2.9, 1.3], 0.07, wood);
    // Bow case on the side.
    const bc = grp(c, 0.3, 2.2, 1.2, 0.1); vessel(bc, [[0.1, 0], [0.2, 0.6], [0.24, 1.3]], lea).rotation.z = 0.9;
    beast(scene, 6, -1.15, { color: 0x6a4a32, ears: true, s: 1.45 }); beast(scene, 6, 1.15, { color: 0x3a2a20, ears: true, s: 1.45 });
    figure(scene, 0, 0.3, { robe: 0xe8dcc0, cloth: 0x3a5a8a, skin: 2, y: 1.6, face: 0, h: 3.6 });
    L(labels, [0, 5.6, 0], "A chariot of war", "Two horses, a light frame and two spoked wheels: fast on flat ground. Pharaoh took 600 of his best chariots after Israel.", "Exodus 14:6–9");
    L(labels, [-0.6, 3.2, 1.8], "Spoked wheels", "In the sea the LORD clogged their wheels so they drove heavily.", "Exodus 14:25", true);
    L(labels, [6.5, 4.2, 0], "Horses from Egypt", "Solomon imported chariots from Egypt for 600 shekels of silver each, and horses for 150.", "1 Kings 10:28–29", true);
    L(labels, [0.5, 3.2, 1.6], "Iron chariots", "Sisera had 900 chariots fitted with iron, and still lost to Deborah and Barak.", "Judges 4:3, 13–16", true);
    return { view: v3(0.7, 0.45, 1.1) };
  },

  "battering-ram"({ scene, labels }) {
    ground(scene, 40, C.sand);
    // Assyrian siege engines like those carved at Lachish (2 Kings 18:13-17; 2 Chronicles 32:9; Ezekiel 4:2).
    const wall = mat(0xffffff, { tex: "stone", rough: 1, rep: 3 });
    rbox(scene, 30, 12, 4, 0, 0, -10, wall, 0.1);
    for (let i = -14; i <= 14; i += 2) rbox(scene, 1.2, 1.2, 4.2, i, 12, -10, wall, 0.05);
    // The ramp: earth and stones heaped against the wall.
    const ramp = slab(scene, [[-9, 0], [12, 0], [12, 0.1], [4, 0.1], [-9, 0.1]], 1, mat(0xb9a57e, { rough: 1, tex: "rock", rep: 3 }));
    ramp.geometry.dispose();
    const rs = new THREE.Shape(); rs.moveTo(0, 0); rs.lineTo(16, 0); rs.lineTo(16, 0.1); rs.lineTo(0, 10); rs.lineTo(0, 0);
    ramp.geometry = new THREE.ExtrudeGeometry(rs, { depth: 12, bevelEnabled: false }); ramp.geometry.translate(0, 0, -6);
    ramp.rotation.set(0, -Math.PI / 2, 0); ramp.position.set(0, 0, -8);
    // The engine on the slope: a wheeled tower with a hide-covered hood and the ram.
    const e = grp(scene, 0, 7.9, -4.6); e.rotation.x = Math.atan2(10, 16);
    rbox(e, 3.4, 3, 5.6, 0, 0.6, 0, mat(0x8a7056, { rough: 1, tex: "linen", rep: 2 }), 0.3);
    rbox(e, 2.6, 2.2, 2.2, 0, 3.4, 1.4, mat(0x8a7056, { rough: 1, tex: "linen", rep: 2 }), 0.25);
    [-1.8, 1.8].forEach((x) => [-1.8, 0, 1.8].forEach((z) => mesh(e, new THREE.CylinderGeometry(0.7, 0.7, 0.3, 20), MAT.darkWood, x, 0.7, z, 0, 0, Math.PI / 2)));
    rod(e, [0, 2.4, -1.5], [0, 2.4, -4.6], 0.32, MAT.darkWood);
    cone(e, 0.42, 0.9, IRON, 0, 2.4, -4.9, -Math.PI / 2);
    for (let i = 0; i < 6; i++) { const a = i / 6; arrow(scene, [-4 + a * 9, 13.5 + (i % 3), -8.5], [-3.6 + a * 9, 6.5 + i * 0.4, -2 - a]); }
    L(labels, [0, 9, -4], "The battering ram", "A wheeled engine, roofed with wet hides against fire, pushed up a ramp to the wall. Inside, soldiers swung an iron-tipped beam.", "Ezekiel 4:2; 26:9");
    L(labels, [-8, 6, -4], "The siege ramp", "At Lachish the Assyrians piled up a ramp of tens of thousands of tons of stone; it can still be seen today.", "2 Chronicles 32:9", true);
    L(labels, [10, 13.5, -9], "The city wall", "Sennacherib took all the fortified cities of Judah except Jerusalem.", "2 Kings 18:13; 19:32–36", true);
    return { view: v3(1.1, 0.5, 1.2), target: v3(0, 6, -4), zoom: 0.8 };
  },

  "gideons-jars"({ scene, labels }) {
    ground(scene, 30, 0x8f8a6c, false);
    // Trumpets, empty jars and torches inside the jars (Judges 7:16-22).
    for (let i = 0; i < 3; i++) {
      const x = -2.6 + i * 2.6;
      const j = grp(scene, x, 0, 0);
      if (i === 2) {
        // A smashed jar, the torch blazing.
        for (let k = 0; k < 7; k++) { const a = k * 0.9; const sh = mesh(j, new THREE.SphereGeometry(0.4, 10, 6, a, 0.8, 0.6, 1.0), MAT.clay, Math.cos(a) * 0.5, 0.06, Math.sin(a) * 0.5); sh.rotation.x = Math.PI / 2 - 0.3; }
        rod(j, [0, 0.05, 0.1], [0.2, 1.4, -0.1], 0.05, MAT.darkWood); cone(j, 0.18, 0.7, MAT.fire, 0.22, 1.7, -0.1);
        const lt = new THREE.PointLight(0xffa040, 3, 8, 2); lt.position.set(0.2, 2.2, 0); j.add(lt);
      } else {
        vessel(j, [[0, 0], [0.3, 0.02], [0.45, 0.4], [0.42, 0.9], [0.25, 1.15], [0.2, 1.3], [0.24, 1.36]], MAT.clay);
        rod(j, [0, 0.8, 0], [0.05, 1.7, 0], 0.05, MAT.darkWood); flame(j, 0.05, 1.7, 0, 1.4);
      }
      // A ram's horn beside each.
      path(j, [[0.6, 0.12, 0.4], [0.9, 0.18, 0.55], [1.15, 0.35, 0.5]], 0.07, mat(0xc8a878, { rough: 0.5 }), 20);
    }
    figure(scene, 4.5, -1.5, { robe: 0x5d4a36, cloth: 0x7a6656, beard: true, face: Math.PI * 1.1, raise: true, skipFit: true });
    L(labels, [0, 2.6, 0], "Trumpets, jars and torches", "Gideon's 300 each had a trumpet and an empty jar with a torch inside. At his signal they blew the trumpets and smashed the jars.", "Judges 7:16–20");
    L(labels, [2.6, 2.4, 0], "“A sword for the LORD and for Gideon!”", "With the torches in their left hands and trumpets in their right, they shouted. The whole Midianite camp ran.", "Judges 7:20–22");
    return { view: v3(0.7, 0.55, 1), target: v3(0, 0.9, 0) };
  },

  jawbone({ scene, labels }) {
    plinth(scene, 1.6, 0xd9c9a3);
    // A fresh jawbone of a donkey (Judges 15:15-17).
    const bone = mat(0xe8dcc0, { rough: 0.6 });
    const g = grp(scene, -0.6, 0.02, 0, 0.5);
    slab(g, [[0, 0], [0.9, 0.05], [1.2, 0.12], [1.25, 0.2], [1.05, 0.22], [0.9, 0.15], [0.3, 0.18], [0.12, 0.5], [0.2, 0.75], [0.05, 0.78], [-0.08, 0.4], [-0.1, 0.1]], 0.12, bone, 0, 0, 0, 0, 0, 0, 0.03);
    for (let i = 0; i < 7; i++) rbox(g, 0.09, 0.09, 0.1, 0.3 + i * 0.1, 0.14 + i * 0.003, 0, mat(0xefe6cf, { rough: 0.4 }), 0.02);
    L(labels, [0, 0.45, 0], "The jawbone of a donkey", "Samson found a fresh jawbone, took it up and struck down a thousand men. He called the place Ramath-lehi, “Jawbone Hill”.", "Judges 15:15–17");
    L(labels, [0.6, 0.25, 0.3], "Water from the hollow", "Afterwards, very thirsty, he called on the LORD, who split open a hollow place at Lehi and water came out.", "Judges 15:18–19", true);
    scale(scene, labels, -0.3, -0.6, true);
    return { view: v3(0.4, 0.9, 1) };
  },

  "ox-goad"({ scene, labels }) {
    ground(scene, 16, 0xb8ad7c, false);
    // A long stick with an iron point for driving oxen and a flat blade at the other end for
    // cleaning the plough (Judges 3:31; 1 Samuel 13:21; Acts 26:14).
    const g = grp(scene, 0, 0.1, 0, 0.2);
    rod(g, [-3.5, 0, 0], [3.5, 0, 0], 0.06, MAT.olive);
    cone(g, 0.05, 0.3, IRON, 3.65, 0, 0, 0, -Math.PI / 2);
    slab(g, [[0, -0.12], [0.3, -0.18], [0.3, 0.18], [0, 0.12]], 0.02, IRON, -3.8, 0, 0, Math.PI / 2, 0, 0);
    beast(scene, 1.5, -3.2, { color: 0x7a5038, horns: true, s: 1.2, face: Math.PI * 0.1 });
    L(labels, [0, 0.8, 0], "An ox goad", "About 8 feet (2.5 m) long: a point to prod the oxen and a blade to scrape the plough. Shamgar struck down 600 Philistines with one.", "Judges 3:31");
    L(labels, [3.6, 0.6, 0.5], "Kicking against the goads", "“It is hard for you to kick against the goads,” said the risen Jesus to Saul: fighting the one driving you.", "Acts 26:14");
    L(labels, [-3.7, 0.5, 0.2], "Sharpened by the Philistines", "Israel had to go down to the Philistines to sharpen their goads, for a third of a shekel.", "1 Samuel 13:19–21", true);
    return { view: v3(0.5, 0.75, 1) };
  },

  "tent-peg"({ scene, labels }) {
    plinth(scene, 1.6, 0xd9c9a3);
    // A tent peg and a workman's mallet (Judges 4:21; 5:26).
    const peg = grp(scene, 0, 0.08, 0, 0.4); peg.rotation.z = Math.PI / 2;
    vessel(peg, [[0, 0], [0.035, 0.1], [0.05, 0.5], [0.06, 0.9], [0.08, 0.95], [0.08, 1.0], [0, 1.0]], MAT.olive);
    const m = grp(scene, 0.3, 0.12, 0.5, -0.5);
    rbox(m, 0.32, 0.22, 0.22, 0, -0.11, 0, MAT.darkWood, 0.05); rod(m, [0, 0, 0], [0.9, 0, 0.05], 0.03, MAT.olive);
    path(scene, [[-0.8, 0.02, -0.3], [-0.2, 0.02, -0.5], [0.6, 0.02, -0.5], [1.2, 0.02, -0.2]], 0.015, MAT.rope, 30);
    L(labels, [0, 0.4, 0], "A tent peg and a mallet", "Pitching tents was women's work among the nomads, so Jael knew these tools well. Deborah's song celebrates what she did with them.", "Judges 4:17–22; 5:24–27");
    L(labels, [0.7, 0.3, 0.5], "The workman's mallet", "“She sent her hand to the tent peg and her right hand to the workmen's mallet.”", "Judges 5:26", true);
    scale(scene, labels, -0.7, 0.5, true);
    return { view: v3(0.4, 0.8, 1) };
  },

  "uzziahs-engines"({ scene, labels }) {
    ground(scene, 30, C.stone);
    // Devices designed by skilful men, on the towers and corners, to shoot arrows and great stones
    // (2 Chronicles 26:15).
    const wall = mat(0xffffff, { tex: "stone", rough: 1, rep: 2 });
    rbox(scene, 12, 8, 8, 0, 0, 0, wall, 0.1);
    for (let i = 0; i < 6; i++) rbox(scene, 1.2, 1.3, 1.2, -5.4 + i * 2.16, 8, -3.4, wall, 0.05);
    for (let i = 0; i < 4; i++) rbox(scene, 1.2, 1.3, 1.2, 5.4, 8, -3.4 + i * 2.27, wall, 0.05);
    // A stone thrower: a frame and a throwing arm.
    const st = grp(scene, -1.5, 8, 0.8, 0.4);
    [-0.7, 0.7].forEach((z) => { rod(st, [-1.1, 0, z], [0, 2.0, z], 0.12, MAT.darkWood); rod(st, [1.1, 0, z], [0, 2.0, z], 0.12, MAT.darkWood); });
    rbox(st, 2.6, 0.2, 1.8, 0, 0, 0, MAT.darkWood, 0.04);
    rod(st, [0, 2.0, -0.8], [0, 2.0, 0.8], 0.1, MAT.darkWood);
    rod(st, [-1.6, 0.6, 0], [1.6, 3.4, 0], 0.11, MAT.darkWood);
    vessel(st, [[0, 0], [0.3, 0.05], [0.35, 0.15]], MAT.leather, 1.65, 3.35, 0);
    rock(scene, 0.25, -1.5 + 1.6, 11.6, 0.8 + 0.8, 0xb0a48c);
    // An arrow thrower: a giant crossbow on a stand.
    const ab = grp(scene, 3.4, 8, 2.0, -0.6);
    rod(ab, [0, 0, 0], [0, 1.4, 0], 0.12, MAT.darkWood);
    rbox(ab, 2.8, 0.2, 0.3, 0.6, 1.4, 0, MAT.darkWood, 0.04);
    path(ab, [[1.5, 1.6, -1.4], [1.9, 1.6, 0], [1.5, 1.6, 1.4]], 0.08, MAT.darkWood, 20);
    rod(ab, [1.5, 1.6, -1.4], [-0.5, 1.6, 0], 0.015, MAT.rope); rod(ab, [1.5, 1.6, 1.4], [-0.5, 1.6, 0], 0.015, MAT.rope);
    arrow(ab, [-0.5, 1.68, 0], [2.4, 1.68, 0]);
    L(labels, [0, 13, 0], "Machines on the towers", "In Jerusalem Uzziah made engines, invented by skilful men, to shoot arrows and great stones from the towers and corners. “His fame spread far.”", "2 Chronicles 26:15");
    L(labels, [-1.5, 11.2, 0.8], "For great stones", "No details are given. Shown here as a simple swinging-arm thrower; true catapults appear in Greek records two centuries later.", "2 Chronicles 26:15", true);
    L(labels, [3.6, 10.5, 2], "For arrows", "Perhaps a large crossbow on a stand, or a shelter for archers: the Hebrew word just means “devices”.", "2 Chronicles 26:15", true);
    scale(scene, labels, 7.5, 6);
    return { view: v3(1, 0.6, 1.1), target: v3(1, 9, 1) };
  },

  ploughshares({ scene, labels }) {
    plinth(scene, 2.4, 0xd9c9a3);
    // “They shall beat their swords into ploughshares, and their spears into pruning hooks” (Isaiah 2:4; Micah 4:3).
    const sw = grp(scene, -0.8, 0.06, -0.5, 0.25); blade(sw, 1.8, 0.16, mat(0xa8aab0, { rough: 0.3, metal: 0.9 }), 0.25);
    rod(sw, [0, 0, 0], [0.25, 0, 0], 0.035, MAT.darkWood); rbox(sw, 0.05, 0.05, 0.32, 0.25, -0.025, 0, BRONZE, 0.015);
    // A ploughshare: an iron tip that slips over the wooden point.
    const ps = grp(scene, 0.4, 0.06, 0.4, -0.4); ps.rotation.x = -Math.PI / 2;
    slab(ps, [[0, 0.5], [0.22, 0.05], [0.12, 0], [-0.12, 0], [-0.22, 0.05]], 0.07, mat(0x6a6a6e, { rough: 0.5, metal: 0.8 }), 0, 0, 0, 0, 0, 0, 0.02);
    const ph = grp(scene, 1.4, 0.06, -0.2, 0.6);
    path(ph, [[0, 0, 0], [0.6, 0, 0], [0.85, 0, 0.12], [0.9, 0, 0.3]], 0.025, mat(0x6a6a6e, { rough: 0.5, metal: 0.8 }), 20);
    rod(ph, [-1.1, 0, 0], [0, 0, 0], 0.03, MAT.olive);
    // The anvil and hammer.
    rbox(scene, 0.4, 0.35, 0.3, 1.5, 0, 0.9, MAT.basalt, 0.05);
    L(labels, [-0.2, 0.5, -0.4], "Swords into ploughshares", "“He shall judge between the nations… and they shall beat their swords into ploughshares, and their spears into pruning hooks; nation shall not lift up sword against nation.”", "Isaiah 2:4");
    L(labels, [0.4, 0.4, 0.4], "A ploughshare", "The iron point fitted over the tip of a wooden plough.", "1 Samuel 13:20", true);
    L(labels, [1.6, 0.4, -0.2], "A pruning hook", "A small curved knife for trimming vines.", "Micah 4:3", true);
    L(labels, [-0.6, 0.35, 0.6], "And back again", "Joel turns it round in a call to war: “Beat your ploughshares into swords.”", "Joel 3:10", true);
    scale(scene, labels, -1.3, 0.8, true);
    return { view: v3(0.4, 0.85, 1) };
  },

  "sauls-spear"({ scene, labels }) {
    ground(scene, 30, C.sand, false);
    // Saul asleep in the camp, his spear stuck in the ground at his head and a jar of water
    // beside him (1 Samuel 26:7-12).
    const lie = grp(scene, 0, 0, 0, 0.3);
    rbox(lie, 3.6, 0.15, 1.4, 0, 0, 0, MAT.wool, 0.05);
    const body = mesh(lie, new THREE.CapsuleGeometry(0.42, 2.2, 8, 16), mat(0x5b3a6a, { rough: 0.95, tex: "linen" }), 0.2, 0.5, 0, 0, 0, Math.PI / 2);
    void body; sph(lie, 0.3, mat(0xa8714a, { rough: 0.7 }), -1.55, 0.5, 0);
    sph(lie, 0.34, mat(0xd8a440, { rough: 0.3, metal: 0.8 }), -1.6, 0.6, 0, 1, 0.5, 1);
    spear(scene, [-2.6, -0.4, -0.8], [-2.4, 4.2, -0.7], 0.06, 0.5);
    vessel(scene, [[0, 0], [0.22, 0.04], [0.3, 0.3], [0.25, 0.55], [0.12, 0.7], [0.14, 0.78]], MAT.clay, -2.4, 0, 0.5);
    figure(scene, -3.5, -3, { robe: 0x5d4a36, beard: true, face: 0.6, h: 3.9, skipFit: true });
    figure(scene, -2.2, -3.8, { robe: 0x6b7f8c, face: 0.8, skipFit: true });
    L(labels, [-2.4, 4.8, -0.7], "Saul's spear", "Stuck in the ground at his head. David took it and the water jar, and later called out to Abner: “Where is the king's spear?”", "1 Samuel 26:7–16");
    L(labels, [-2.4, 1.3, 0.5], "The jar of water", "No one woke: “a deep sleep from the LORD had fallen on them.”", "1 Samuel 26:12", true);
    L(labels, [-2.9, 4.3, -3.4], "David and Abishai", "Abishai wanted to pin Saul to the ground. David would not lift his hand against the LORD's anointed.", "1 Samuel 26:8–11");
    return { view: v3(1, 0.7, 1), target: v3(0, 1, 0.5) };
  },

  "wall-and-gate"({ scene, labels }) {
    ground(scene, 60, C.sand);
    // A fortified city gate of the Israelite kingdom: two towers, and six chambers inside (like
    // the gates found at Gezer, Hazor and Megiddo; 1 Kings 9:15). Elders sat here to judge.
    const st = mat(0xffffff, { tex: "stone", rough: 1, rep: 2 });
    [-1, 1].forEach((sd) => {
      rbox(scene, 20, 10, 3, sd * 16, 0, 0, st, 0.1);
      for (let i = 0; i < 6; i++) rbox(scene, 1.2, 1.3, 3.2, sd * (8 + i * 3.4), 10, 0, st, 0.05);
      rbox(scene, 5, 13, 6, sd * 5, 0, 2, st, 0.1);
      for (let i = 0; i < 3; i++) rbox(scene, 1.2, 1.3, 1.2, sd * (3 + i * 2), 13, 4.5, st, 0.05);
      // Chambers: piers either side of the passage.
      for (let i = 0; i < 4; i++) rbox(scene, 2.2, 9, 2.2, sd * 3.6, 0, -1 - i * 4.5, st, 0.08);
      for (let i = 0; i < 3; i++) rbox(scene, 3, 0.8, 2, sd * 4.6, 0, -3.2 - i * 4.5, mat(0xc9b896, { rough: 1 }), 0.05);
    });
    rbox(scene, 9.4, 1.2, 15, 0, 9, -7, st, 0.05);
    const door = mat(0x5a3b22, { rough: 0.9, tex: "wood", rep: 2 });
    [-1, 1].forEach((sd) => { const d = rbox(scene, 2.4, 8, 0.3, sd * 1.25, 0, 4.4, door, 0.05); d.rotation.y = sd * 0.9; d.position.x = sd * 2.2; d.position.z = 3.6; });
    for (let i = 0; i < 4; i++) figure(scene, -4.2 + (i % 2) * 0.6, -3.5 - i * 1.6, { robe: [0x8b6f4e, 0x6b7f8c, 0xa8875a, 0x7a5a6a][i], beard: true, sit: true, face: -Math.PI / 2, skipFit: true });
    L(labels, [0, 11.5, 2], "The city gate", "The busiest place in town. Boaz sat in the gate at Bethlehem to settle the matter of Ruth with ten elders as witnesses.", "Ruth 4:1–11");
    L(labels, [-4.5, 4.5, -5], "Elders sitting in the gate", "Courts were held here, deals done and news heard. “Her husband is known in the gates.”", "Proverbs 31:23; Deuteronomy 21:19", true);
    L(labels, [-16, 11.5, 0], "The wall", "Many cities had walls several metres thick. Solomon rebuilt Hazor, Megiddo and Gezer with gates like this one.", "1 Kings 9:15", true);
    L(labels, [2, 5, 6], "Bronze bars and bolts", "Gates were shut at night and barred.", "Nehemiah 7:3; Psalm 107:16", true);
    return { view: v3(0.9, 0.55, 1.3), target: v3(0, 4, 0), zoom: 0.5 };
  },
};
