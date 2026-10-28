/* Parables and Gospel scenes, and the early church. 1 unit = 1 cubit (about 45 cm). */
import {
  scatter, THREE, MAT, C, GOLD, BRONZE, SILVER, IRON, mat, mesh, grp, sph, cone, tor, rod, path, vessel, slab, rbox, box, cyl,
  textPlane, textTex, scroll, scale, L, plinth, ground, figure, beast, flame, rock, hill, v3, ref, bush, olive, palm, house, ROBES,
} from "./kit.js";

const GLOW = (c = 0xfff1c0, o = 0.5) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, depthWrite: false });
function bird(p, x, y, z, s, col, spread = true, ry = 0) {
  const g = grp(p, x, y, z, ry), m = mat(col, { rough: 0.8, side: THREE.DoubleSide });
  sph(g, s * 0.22, m, 0, 0, 0, 1.6, 0.85, 0.85); sph(g, s * 0.13, m, s * 0.33, s * 0.12, 0);
  cone(g, s * 0.045, s * 0.14, mat(0xd8a0a0), s * 0.47, s * 0.1, 0, 0, -Math.PI / 2, 8);
  slab(g, [[0, -s * 0.06], [-s * 0.32, -s * 0.14], [-s * 0.34, s * 0.14], [0, s * 0.06]], s * 0.02, m, -s * 0.28, s * 0.02, 0, -Math.PI / 2, 0, 0);
  if (spread) [-1, 1].forEach((sd) => { const w = slab(g, [[0, -s * 0.1], [s * 0.08, -s * 0.25], [s * 0.02, -s * 0.6], [-s * 0.1, -s * 0.85], [-s * 0.16, -s * 0.6], [-s * 0.14, -s * 0.1]].map(([a, b]) => [a, b * sd]), s * 0.02, m, s * 0.04, s * 0.06, 0, -Math.PI / 2, 0, 0); w.rotation.x = -Math.PI / 2 - sd * 0.35; });
  return g;
}

export const MODELS = {
  "good-samaritan"({ scene, labels }) {
    ground(scene, 60, 0xc8b48a, false);
    hill(scene, 20, -20, -14, 10, 0xb8a888); hill(scene, 24, 22, -18, 12, 0xb0a080);
    // On the road down from Jerusalem to Jericho: a Samaritan bound up his wounds, pouring on oil and wine, set him on
    // his own animal, brought him to an inn and paid two denarii (Luke 10:25-37).
    const road = mesh(scene, new THREE.PlaneGeometry(4, 80), mat(0xb8a478, { rough: 1, tex: "sand", rep: 4 }), 0, 0.02, 0, -Math.PI / 2, 0, 0.5); road.userData.skipFit = true;
    const inn = house(scene, 9, -6, 12, 9, 6, -0.3); void inn;
    beast(scene, 1.4, 1.0, { color: 0x8a7a6a, ears: true, s: 1, face: -0.5 });
    const lie = grp(scene, 1.4, 1.95, 1.0, -0.5); mesh(lie, new THREE.CapsuleGeometry(0.38, 1.8, 8, 14), mat(0xe9e1cf, { rough: 0.95, tex: "linen" }), 0, 0.2, 0, 0, 0, Math.PI / 2); sph(lie, 0.28, mat(0xa8714a), -1.25, 0.25, 0);
    for (let i = 0; i < 4; i++) tor(lie, 0.4, 0.04, MAT.white, -0.6 + i * 0.4, 0.2, 0, 0, Math.PI / 2);
    figure(scene, -0.4, 2.2, { robe: 0x2d4f8c, cloth: 0xe9e1cf, beard: true, skin: 1, h: 4, reach: true, face: -0.3 });
    vessel(scene, [[0, 0], [0.1, 0.01], [0.13, 0.12], [0.08, 0.22], [0.04, 0.28], [0.05, 0.31]], MAT.clay, 0.2, 0, 3.2);
    vessel(scene, [[0, 0], [0.12, 0.01], [0.15, 0.14], [0.1, 0.26], [0.05, 0.32], [0.06, 0.35]], MAT.clayDark, 0.5, 0, 3.4);
    [[2.2, 0.5], [2.35, 0.55]].forEach(([x, z]) => mesh(scene, new THREE.CylinderGeometry(0.06, 0.06, 0.012, 16), SILVER, 9 + x * 0.5, 3.4, -1 + z));
    figure(scene, 7, -0.6, { robe: 0x8b6f4e, beard: true, h: 4, face: Math.PI + 0.6 });
    figure(scene, -10, -14, { robe: 0xf6f2e8, cloth: 0xffffff, beard: true, h: 4, face: -0.2, skipFit: true });
    figure(scene, -6, 14, { robe: 0xe9e1cf, cloth: 0xd8cfbd, beard: true, h: 4, face: 0.2, skipFit: true });
    L(labels, [1.4, 3.6, 1], "He had compassion", "A priest and a Levite passed by on the other side. A Samaritan, an outsider, “went to him and bound up his wounds, pouring on oil and wine. Then he set him on his own animal.”", "Luke 10:31–34");
    L(labels, [0.35, 0.8, 3.3], "Oil and wine", "Wine to clean the wounds, oil to soothe them.", "Luke 10:34", true);
    L(labels, [7, 4.4, -0.6], "Two denarii to the innkeeper", "Two days' wages. “Take care of him, and whatever more you spend, I will repay you when I come back.”", "Luke 10:35");
    L(labels, [-8, 4.4, -10], "Who was a neighbour?", "“The one who showed him mercy.” “You go, and do likewise.”", "Luke 10:36–37", true);
    return { view: v3(0.7, 0.5, 1.1), target: v3(2, 2, 0), zoom: 0.45 };
  },

  sower({ scene, labels }) {
    ground(scene, 40, 0xb8ad7c, false);
    // A sower went out to sow: some seed fell along the path, some on rocky ground, some among thorns, and some on good
    // soil (Mark 4:1-20; Matthew 13:1-23).
    const path0 = mesh(scene, new THREE.PlaneGeometry(2.4, 26), mat(0xd8c8a0, { rough: 1, tex: "sand" }), -6, 0.02, 0, -Math.PI / 2); path0.userData.skipFit = true;
    const plot = (x, label) => { const p = mesh(scene, new THREE.PlaneGeometry(4.2, 10), mat(0x6a5038, { rough: 1, tex: "sand", rep: 1 }), x, 0.02, 0, -Math.PI / 2); p.userData.noShadow = true; return p; };
    plot(-2.6); plot(2); plot(6.6);
    for (let i = 0; i < 10; i++) rock(scene, 0.3 + (i % 3) * 0.1, -2.6 + Math.cos(i * 2) * 1.5, 0.1, -4 + i * 0.9, 0x9d917a, 1.4, 0.5, 1.2);
    const wilt = [], green = [], tall = [], heads = [];
    for (let i = 0; i < 30; i++) wilt.push([-2.6 + Math.sin(i * 3) * 1.6, 0.25, -4 + (i % 15) * 0.6, 0, 0, 0.5 + (i % 3) * 0.3]);
    scatter(scene, new THREE.CylinderGeometry(0.02, 0.02, 0.5, 4), mat(0xb8a050, { rough: 1 }), wilt);
    for (let i = 0; i < 16; i++) bush(scene, 2 + Math.sin(i * 2) * 1.5, -4 + i * 0.55, 0.45, 0x4a5a2a).userData.skipFit = false;
    for (let i = 0; i < 30; i++) green.push([2 + Math.cos(i * 1.7) * 1.4, 0.4, -4 + (i % 15) * 0.6]);
    scatter(scene, new THREE.CylinderGeometry(0.015, 0.015, 0.8, 4), MAT.leaf, green);
    for (let i = 0; i < 120; i++) { const x = 6.6 - 1.8 + (i % 8) * 0.5, z = -4.6 + Math.floor(i / 8) * 0.62; tall.push([x, 1.2, z, 0, 0, Math.sin(i) * 0.04]); heads.push([x, 2.5, z, 0, 0, 0, 1, 2.2, 1]); }
    scatter(scene, new THREE.CylinderGeometry(0.012, 0.012, 2.4, 5), mat(0xc8a850, { rough: 1 }), tall);
    scatter(scene, new THREE.SphereGeometry(0.06, 8, 6), mat(0xd8b860, { rough: 1 }), heads);
    for (let i = 0; i < 20; i++) sph(scene, 0.03, mat(0xd8b860, { rough: 1 }), -6 + Math.sin(i * 7) * 0.8, 0.03, -4 + i * 0.4);
    [[-6.4, 0.4, 1], [-5.6, 0.4, -2]].forEach(([x, y, z], i) => bird(scene, x, y + 0.2, z, 0.5, 0x3a3430, false, i * 2));
    bird(scene, -5, 3, 3, 0.6, 0x3a3430, true, 2.6);
    figure(scene, -6, 6, { robe: 0x8b6f4e, cloth: 0xe0d6c0, beard: true, h: 4, reach: true, face: -Math.PI / 2 });
    const bag = sph(scene, 0.35, mat(0xc8a46a, { rough: 1, tex: "linen" }), -5.6, 1.8, 6.3, 1, 0.8, 0.7); void bag;
    L(labels, [-6, 2, 0], "Along the path", "The birds came and devoured it: the word is snatched away before it takes root.", "Mark 4:4, 15");
    L(labels, [-2.6, 1.6, 0], "Rocky ground", "It sprang up quickly, but had no root and withered in the sun: those who fall away when trouble comes.", "Mark 4:5–6, 16–17");
    L(labels, [2, 2, 0], "Among thorns", "The thorns grew up and choked it: the cares of the world, the deceitfulness of riches.", "Mark 4:7, 18–19");
    L(labels, [6.6, 3.6, 0], "Good soil", "It grew and yielded thirtyfold, sixtyfold and a hundredfold: those who hear the word, accept it and bear fruit.", "Mark 4:8, 20");
    L(labels, [-6, 4.6, 6], "A sower went out to sow", "Scattering seed by hand from a bag, before ploughing it in.", "Mark 4:3", true);
    return { view: v3(0.3, 0.8, 1.1), target: v3(0, 0.6, 1) };
  },

  "wise-builder"({ scene, labels }) {
    ground(scene, 60, C.sand, false);
    // A wise man built his house on the rock, a foolish man on the sand; the rain fell, the floods came, the winds blew
    // (Matthew 7:24-27).
    rock(scene, 5, -8, 0, 0, 0xa89a82, 1.3, 0.55, 1.1);
    house(scene, -8, 0, 7, 6, 5).position.y = 2.6;
    const fallen = grp(scene, 8, 0, 1); for (let i = 0; i < 26; i++) rbox(fallen, 0.9 + (i % 3) * 0.3, 0.5, 0.6, -2.6 + (i % 7) * 0.8, Math.floor(i / 7) * 0.3, -1.6 + (i % 4) * 0.9, mat(0xffffff, { tex: "plaster", rough: 1 }), 0.15).rotation.y = i;
    for (let i = 0; i < 4; i++) rod(fallen, [-1 + i * 0.8, 0.4, -1], [-0.2 + i * 0.6, 0.1, 1.4], 0.1, MAT.darkWood);
    const flood = mesh(scene, new THREE.PlaneGeometry(40, 12), mat(0x7a6a4a, { rough: 0.2, opacity: 0.85 }), 6, 0.3, 6, -Math.PI / 2); flood.userData.skipFit = true;
    const rain = []; for (let i = 0; i < 300; i++) rain.push([-16 + (i % 30) * 1.1, 4 + (i % 7) * 2, -8 + Math.floor(i / 30) * 1.8, 0.2, 0, 0.15]);
    scatter(scene, new THREE.CylinderGeometry(0.02, 0.02, 0.8, 3), mat(0xbfd8e0, { opacity: 0.6 }), rain).userData.skipFit = true;
    const cloud = grp(scene, 0, 20, -6); for (let i = 0; i < 8; i++) sph(cloud, 4, mat(0x6a6e74, { rough: 1, opacity: 0.85 }), -12 + i * 3.6, Math.sin(i) * 0.8, Math.cos(i) * 2, 1, 0.5, 1); cloud.userData.skipFit = true;
    L(labels, [-8, 9.6, 0], "Built on the rock", "“Everyone then who hears these words of mine and does them will be like a wise man who built his house on the rock. And the rain fell, and the floods came… but it did not fall.”", "Matthew 7:24–25");
    L(labels, [8, 3, 1], "Built on the sand", "“…and it fell, and great was the fall of it.” In a wadi the dry sand is easy to build on, until the winter rains turn it into a torrent.", "Matthew 7:26–27");
    return { view: v3(0.3, 0.45, 1.1), target: v3(0, 3, 1), zoom: 0.85 };
  },

  "hidden-treasure"({ scene, labels }) {
    ground(scene, 30, 0xb8ad7c, false);
    // The kingdom of heaven is like treasure hidden in a field, and like a merchant who found one pearl of great value
    // (Matthew 13:44-46). People buried valuables in jars; hoards are still found.
    const hole = mesh(scene, new THREE.CircleGeometry(1.2, 24), mat(0x5a4a34, { rough: 1 }), 0, 0.02, 0, -Math.PI / 2); hole.userData.noShadow = true;
    const dirt = mesh(scene, new THREE.SphereGeometry(1.0, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x6a5038, { rough: 1 }), 1.8, 0, -0.6); dirt.scale.y = 0.45;
    const jar = vessel(scene, [[0, 0], [0.25, 0.02], [0.4, 0.4], [0.36, 0.85], [0.18, 1.05], [0.18, 1.12]], MAT.clay, -0.1, -0.5, 0); jar.rotation.z = 0.5;
    for (let i = 0; i < 40; i++) mesh(scene, new THREE.CylinderGeometry(0.06, 0.06, 0.012, 16), i % 4 ? SILVER : GOLD, 0.6 + Math.cos(i * 2.4) * (i % 6) * 0.1, 0.03 + (i % 3) * 0.012, 0.4 + Math.sin(i * 2.4) * (i % 6) * 0.1);
    const sp = grp(scene, -1.6, 0.4, 0.8, 0.6); sp.rotation.z = -0.4; rod(sp, [0, 0, 0], [0, 2.2, 0], 0.04, MAT.olive); slab(sp, [[-0.2, 0], [0.2, 0], [0.15, -0.4], [-0.15, -0.4]], 0.03, IRON, 0, 0, 0);
    figure(scene, -1.2, -1.6, { robe: 0x8b6f4e, cloth: 0xe0d6c0, beard: true, h: 4, raise: true, face: 0.6 });
    const pearl = grp(scene, 3.6, 1.2, 1.6); rbox(pearl, 0.6, 0.1, 0.5, 0, -0.1, 0, mat(0x5b2c6f, { rough: 1, tex: "linen" }), 0.03); sph(pearl, 0.12, mat(0xf6f2ec, { rough: 0.1, metal: 0.2 }), 0, 0.05, 0);
    rbox(scene, 1.6, 1.1, 1.2, 3.6, 0, 1.6, MAT.darkWood, 0.05);
    L(labels, [0.4, 1.2, 0.3], "Treasure hidden in a field", "“…which a man found and covered up. Then in his joy he goes and sells all that he has and buys that field.”", "Matthew 13:44");
    L(labels, [3.6, 1.8, 1.6], "The pearl of great value", "A merchant in search of fine pearls, “who, on finding one pearl of great value, went and sold all that he had and bought it.”", "Matthew 13:45–46");
    return { view: v3(0.6, 0.6, 1.1), target: v3(1, 0.8, 0.4) };
  },

  "baptism-of-jesus"({ scene, labels }) {
    ground(scene, 60, 0xb8ad7c, false);
    // When Jesus was baptised by John in the Jordan, the heavens were opened, the Spirit descended like a dove, and a
    // voice: “This is my beloved Son” (Matthew 3:13-17; Mark 1:9-11).
    const riv = mesh(scene, new THREE.PlaneGeometry(80, 12), MAT.water, 0, 0.05, 0, -Math.PI / 2, 0, 0.15); riv.userData.skipFit = true;
    for (let i = 0; i < 24; i++) { const s = grp(scene, -24 + i * 2, 0, (i % 2 ? 7.5 : -7.5)); s.userData.skipFit = true; rod(s, [0, 0, 0], [0, 2.6, 0], 0.04, MAT.leaf); }
    figure(scene, 0, 0, { robe: 0xe9e1cf, cloth: false, beard: true, h: 4, y: -1.2, face: Math.PI / 2 });
    figure(scene, 1.4, 0.6, { robe: 0x9a7a50, cloth: false, beard: true, h: 4, y: -1.0, reach: true, face: Math.PI + 0.3 });
    tor(scene, 0.45, 0.04, MAT.leatherDark, 1.4, 1.0, 0.6);
    const beam = mesh(scene, new THREE.CylinderGeometry(0.6, 3, 24, 20, 1, true), GLOW(0xfff6d8, 0.16), 0, 14, 0); beam.userData.skipFit = true;
    bird(scene, 0, 6.2, 0, 1.1, 0xf4f2ee, true, 0.6);
    for (let i = 0; i < 8; i++) figure(scene, -6 + (i % 4) * 1.6, -8 - Math.floor(i / 4) * 1.6, { robe: ROBES[i], h: 4, face: Math.PI / 2, skipFit: true });
    L(labels, [0, 7.4, 0], "The Spirit like a dove", "“When Jesus was baptised, immediately he went up from the water, and behold, the heavens were opened to him, and he saw the Spirit of God descending like a dove and coming to rest on him.”", "Matthew 3:16");
    L(labels, [0, 12, 0], "“This is my beloved Son”", "“…with whom I am well pleased.” Father, Son and Spirit together.", "Matthew 3:17");
    L(labels, [1.4, 3.6, 0.6], "John the Baptist", "“I need to be baptised by you, and do you come to me?” “Let it be so now, for thus it is fitting for us to fulfil all righteousness.”", "Matthew 3:14–15", true);
    return { view: v3(0.6, 0.35, 1.1), target: v3(0, 3, 0) };
  },

  "stone-pavement"({ scene, labels }) {
    ground(scene, 40, C.stone);
    // Pilate sat down on the judgment seat at a place called The Stone Pavement, in Aramaic Gabbatha (John 19:13). Roman
    // soldiers scratched game boards into paving stones like these.
    const pave = []; for (let i = 0; i < 120; i++) pave.push([-11 + (i % 12) * 2 + (Math.floor(i / 12) % 2) * 0.4, 0.15, -9 + Math.floor(i / 12) * 2]);
    scatter(scene, new THREE.BoxGeometry(1.9, 0.3, 1.9), mat(0xd8cfbd, { rough: 0.85, tex: "rock" }), pave);
    const c = document.createElement("canvas"); c.width = 256; c.height = 256; const g = c.getContext("2d"); g.fillStyle = "rgba(0,0,0,0)"; g.clearRect(0, 0, 256, 256); g.strokeStyle = "#6a5a40"; g.lineWidth = 5;
    g.beginPath(); g.arc(128, 128, 90, 0, 7); g.stroke(); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + Math.cos(a) * 90, 128 + Math.sin(a) * 90); g.stroke(); } g.font = "bold 40px serif"; g.fillStyle = "#6a5a40"; g.fillText("B", 40, 60);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    mesh(scene, new THREE.PlaneGeometry(1.8, 1.8), new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: 0.9 }), 1 + 0.4, 0.31, 1, -Math.PI / 2);
    const bema = grp(scene, -4, 0, -6); for (let i = 0; i < 3; i++) rbox(bema, 6 - i, 0.6, 4 - i * 0.6, 0, i * 0.6, 0, MAT.limestone, 0.05); const seat = rbox(bema, 1.6, 1.0, 1.0, 0, 1.8, -0.4, mat(0xf2ead8, { rough: 0.6 }), 0.1); void seat;
    figure(scene, -4, -6.4, { robe: 0xf6f2e8, cloth: false, skin: 0, h: 4, sit: true, y: 2.6, face: Math.PI / 2 });
    rbox(scene, 0.6, 0.06, 1.2, -4.8, 2.6, -5.6, mat(0xa3302a, { rough: 1, tex: "linen" }), 0.02);
    figure(scene, -1, -2, { robe: 0x5b2c6f, cloth: false, beard: true, h: 4, face: Math.PI * 0.8 });
    [[2, 1.8], [2.8, 0.4]].forEach(([x, z], i) => figure(scene, x, z, { robe: 0xa3302a, cloth: false, skin: 3, h: 4, sit: true, face: Math.PI + i, skipFit: true }));
    for (let i = 0; i < 3; i++) rbox(scene, 0.1, 0.1, 0.1, 1.2 + i * 0.2, 0.3, 1.2, MAT.ivory, 0.02);
    L(labels, [-4, 6, -6.4], "The judgment seat", "“He brought Jesus out and sat down on the judgment seat at a place called The Stone Pavement, and in Aramaic Gabbatha.” “Behold your King!”", "John 19:13–14");
    L(labels, [1.4, 0.9, 1], "A soldiers' game", "Games like this, scratched into paving stones, are found where Roman soldiers waited on duty.", "Mark 15:16–20", true);
    L(labels, [-1, 4.4, -2], "Jesus before Pilate", "“What is truth?” Pilate found no guilt in him, yet handed him over.", "John 18:38; 19:16", true);
    return { view: v3(0.6, 0.6, 1.1), target: v3(-1.5, 1.5, -2), zoom: 0.5 };
  },

  emmaus({ scene, labels }) {
    ground(scene, 40, C.sand, false);
    // At the table in Emmaus he took the bread, blessed and broke it and gave it to them; their eyes were opened and they
    // recognised him (Luke 24:13-35).
    const h = house(scene, -6, -8, 10, 8, 6, 0.3); void h;
    rbox(scene, 3, 0.6, 1.6, 0, 0, 0, MAT.darkWood, 0.05);
    const br = mesh(scene, new THREE.CylinderGeometry(0.3, 0.31, 0.06, 20, 1, false, 0, Math.PI * 1.6), MAT.bread, 0.1, 0.65, 0); void br;
    vessel(scene, [[0, 0], [0.1, 0.01], [0.08, 0.1], [0.12, 0.25], [0.13, 0.28]], MAT.clay, 0.8, 0.6, 0.2);
    lampOn(scene, -1.0, 0.6, -0.4);
    [[0, -1.3, 0], [-1.1, 1.2, Math.PI], [1.2, 1.2, Math.PI]].forEach(([x, z, f], i) => figure(scene, x, z, { robe: i === 0 ? 0xe9e1cf : [0x8b6f4e, 0x6b7f8c][i - 1], cloth: i === 0 ? 0xf2ede0 : undefined, beard: i !== 2, h: 4, sit: true, face: f - Math.PI / 2 + Math.PI / 2 * 0, reach: i === 0 }));
    const glow = mesh(scene, new THREE.SphereGeometry(1.4, 20, 14), GLOW(0xfff6d8, 0.3), 0, 2.6, -1.3); glow.userData.skipFit = true;
    L(labels, [0, 4, -1.3], "Known in the breaking of the bread", "“When he was at table with them, he took the bread and blessed and broke it and gave it to them. And their eyes were opened, and they recognised him. And he vanished from their sight.”", "Luke 24:30–31");
    L(labels, [-1.1, 3.6, 1.2], "“Did not our hearts burn within us?”", "On the road he had explained to them what was said about himself in all the Scriptures, beginning with Moses.", "Luke 24:27, 32");
    L(labels, [-6, 8, -8], "Emmaus, about seven miles from Jerusalem", "That same hour they went back to Jerusalem to tell the others.", "Luke 24:13, 33–35", true);
    return { view: v3(0.6, 0.65, 1.1), target: v3(0, 1.5, 0), zoom: 0.45 };
  },

  ascension({ scene, labels }) {
    ground(scene, 80, 0x8a9a5a, false);
    hill(scene, 30, 0, -10, 8, 0x8a9a5a).userData.skipFit = true;
    // On the Mount of Olives he was lifted up, and a cloud took him out of their sight; two men in white robes:
    // “This Jesus… will come in the same way as you saw him go” (Acts 1:6-12; Luke 24:50-53).
    const fig = figure(scene, 0, 0, { robe: 0xffffff, cloth: 0xffffff, band: 0xfff6d8, beard: true, h: 4, y: 12, raise: true, face: Math.PI / 2 }); void fig;
    const cl = grp(scene, 0, 19, 0); for (let i = 0; i < 9; i++) sph(cl, 2.2 + (i % 3) * 0.5, mat(0xffffff, { rough: 1, opacity: 0.85 }), Math.cos(i * 0.7) * 3, Math.sin(i * 1.3) * 0.8, Math.sin(i * 0.7) * 2.4); cl.userData.skipFit = true;
    const beam = mesh(scene, new THREE.CylinderGeometry(4, 1, 30, 20, 1, true), GLOW(0xfff6d8, 0.12), 0, 20, 0); beam.userData.skipFit = true;
    for (let i = 0; i < 11; i++) { const a = Math.PI * 0.2 + i / 10 * Math.PI * 0.6; figure(scene, Math.cos(a) * 6, Math.sin(a) * 6 + 2, { robe: ROBES[i % 8], beard: i % 2 === 0, h: 4, y: 7.8, raise: i % 3 === 0, face: -a + Math.PI, skipFit: i > 3 }); }
    [[-2.4, 4.6], [2.4, 4.6]].forEach(([x, z]) => figure(scene, x, z, { robe: 0xffffff, cloth: 0xffffff, h: 4.2, y: 7.8, face: -Math.PI / 2 }));
    L(labels, [0, 22, 0], "A cloud took him out of their sight", "“As they were looking on, he was lifted up, and a cloud took him out of their sight.”", "Acts 1:9");
    L(labels, [2.4, 12.6, 4.6], "Two men in white robes", "“Men of Galilee, why do you stand looking into heaven? This Jesus, who was taken up from you into heaven, will come in the same way as you saw him go.”", "Acts 1:10–11");
    L(labels, [-5, 12, 4], "Witnesses to the end of the earth", "“You will receive power when the Holy Spirit has come upon you, and you will be my witnesses in Jerusalem and in all Judea and Samaria, and to the end of the earth.”", "Acts 1:8", true);
    return { view: v3(0.2, 0.25, 1.1), target: v3(0, 12, 2), zoom: 1.2 };
  },

  "damascus-road"({ scene, labels }) {
    ground(scene, 80, 0xc8b48a, false);
    // Near Damascus a light from heaven flashed around Saul; he fell to the ground and heard a voice: “Saul, Saul, why are
    // you persecuting me?” He got up blind and was led by the hand into the city (Acts 9:1-9; 22:6-11; 26:12-18).
    const road = mesh(scene, new THREE.PlaneGeometry(5, 120), mat(0xb8a478, { rough: 1, tex: "sand", rep: 5 }), 0, 0.02, 0, -Math.PI / 2, 0, 0.2); road.userData.skipFit = true;
    const beam = mesh(scene, new THREE.CylinderGeometry(1, 6, 40, 24, 1, true), GLOW(0xfffaf0, 0.35), 0, 20, 0); beam.userData.skipFit = true;
    const pool = mesh(scene, new THREE.CircleGeometry(6, 32), GLOW(0xfffaf0, 0.4), 0, 0.05, 0, -Math.PI / 2); pool.userData.skipFit = true;
    const lie = grp(scene, 0, 0, 0, 0.6); mesh(lie, new THREE.CapsuleGeometry(0.42, 2.2, 8, 16), mat(0x7a5a3e, { rough: 0.95, tex: "linen" }), 0.2, 0.45, 0, 0, 0, Math.PI / 2); sph(lie, 0.3, mat(0xa8714a), -1.5, 0.5, 0); [-1, 1].forEach((sd) => rod(lie, [-1.0, 0.5, sd * 0.4], [-1.8, 0.3, sd * 0.7], 0.12, mat(0x7a5a3e, { rough: 0.95 })));
    for (let i = 0; i < 4; i++) figure(scene, 3 + (i % 2) * 1.6, -2 + i * 1.4, { robe: ROBES[i], h: 4, face: Math.PI + 0.4, raise: i % 2 === 0, skipFit: i > 1 });
    beast(scene, -4, 3, { color: 0x5a3a28, ears: true, s: 1.2, face: -2.4 });
    const walls = grp(scene, -10, 0, -50); rbox(walls, 40, 10, 3, 0, 0, 0, mat(0xffffff, { tex: "stone", rough: 1, rep: 6 }), 0.1); walls.userData.skipFit = true;
    L(labels, [0, 5, 0], "A light from heaven", "“Suddenly a light from heaven shone around him. And falling to the ground, he heard a voice saying to him, ‘Saul, Saul, why are you persecuting me?’ ‘Who are you, Lord?’ ‘I am Jesus, whom you are persecuting.’”", "Acts 9:3–5");
    L(labels, [4, 4.6, -1], "They heard but saw no one", "The men travelling with him stood speechless. Saul rose blind, and they led him by the hand into Damascus.", "Acts 9:7–8", true);
    L(labels, [-10, 12, -50], "Damascus", "Three days without sight, until Ananias laid his hands on him: “Brother Saul…”", "Acts 9:9–18", true);
    return { view: v3(0.6, 0.45, 1.1), target: v3(0.5, 1.5, 0) };
  },

  "tabithas-garments"({ scene, labels }) {
    ground(scene, 20, 0xb8a888, false);
    // At Joppa all the widows stood beside Peter weeping and showing the tunics and other garments Dorcas made while she
    // was with them; Peter knelt, prayed, and said, “Tabitha, arise” (Acts 9:36-42).
    const fl = mesh(scene, new THREE.CircleGeometry(5, 40), mat(0x8a7a62, { rough: 1, tex: "rock", rep: 3 }), 0, 0.01, 0, -Math.PI / 2); fl.userData.noShadow = true;
    const bed = grp(scene, 0, 0, -2); rbox(bed, 3.6, 0.6, 1.4, 0, 0, 0, MAT.wood, 0.05); rbox(bed, 3.4, 0.2, 1.3, 0, 0.6, 0, MAT.wool, 0.05);
    figure(scene, 0.8, -2, { robe: 0xf2ede0, cloth: 0xe8e0cc, skin: 1, h: 3.8, sit: true, y: 0.8, face: Math.PI / 2, reach: true });
    figure(scene, -1.6, -0.4, { robe: 0x6b7f8c, beard: true, h: 4, sit: true, raise: true, face: -0.4 });
    const cols = [0x8b6f4e, 0x6b7f8c, 0x7a5a6a, 0x5d7a5a, 0xa8875a, 0xb3202a];
    for (let i = 0; i < 5; i++) { const a = Math.PI * 0.1 + i / 4 * Math.PI * 0.8; const x = Math.cos(a) * 3.2, z = Math.sin(a) * 3.2; figure(scene, x, z, { robe: 0x3a3430, cloth: 0x2a2522, skin: i % 4, h: 3.9, reach: true, face: -a - Math.PI / 2 + Math.PI }); const tu = mesh(scene, new THREE.PlaneGeometry(1.1, 1.6), mat(cols[i], { rough: 1, tex: "linen", side: THREE.DoubleSide }), x * 0.8, 1.8, z * 0.8, 0, -a + Math.PI / 2, 0); void tu; }
    L(labels, [0.8, 3.4, -2], "“Tabitha, arise”", "“She opened her eyes, and when she saw Peter she sat up.” It became known throughout Joppa, and many believed in the Lord.", "Acts 9:40–42");
    L(labels, [2.6, 3.6, 2], "The tunics she made", "“She was full of good works and acts of charity.” The widows showed Peter the tunics and other garments Dorcas made while she was with them.", "Acts 9:36, 39");
    return { view: v3(0.6, 0.7, 1.1), target: v3(0, 1.2, 0) };
  },

  "pauls-cloak"({ scene, labels }) {
    plinth(scene, 1.6, 0xd9c9a3);
    // From prison in Rome: “When you come, bring the cloak that I left with Carpus at Troas, also the books, and above all
    // the parchments” (2 Timothy 4:13). Books here are scrolls; parchments, sheets of prepared skin.
    const cl = mesh(scene, new THREE.PlaneGeometry(1.6, 1.2, 10, 8), mat(0x6a5a40, { rough: 1, tex: "linen", rep: 3, side: THREE.DoubleSide }), -0.5, 0.05, 0.1, -Math.PI / 2, 0, 0.3);
    const p = cl.geometry.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.abs(Math.sin(p.getX(i) * 4)) * 0.06); cl.geometry.computeVertexNormals();
    [[0.5, -0.3, 0.4], [0.75, -0.1, 0.9], [0.6, 0.15, 1.6]].forEach(([x, z, r]) => { const s = grp(scene, x, 0.06, z * 0.1, r); mesh(s, new THREE.CylinderGeometry(0.05, 0.05, 0.5, 16), MAT.parchment, 0, 0, 0, 0, 0, Math.PI / 2); tor(s, 0.052, 0.006, MAT.scarlet, 0, 0, 0, 0, Math.PI / 2); });
    for (let i = 0; i < 4; i++) { const s = mesh(scene, new THREE.PlaneGeometry(0.42, 0.32), new THREE.MeshStandardMaterial({ map: textTex(["ΕΝ ΑΡΧΗ ΗΝ", "Ο ΛΟΓΟΣ"], { bg: "#efe3c4", ink: "#3a2a1a", w: 256, h: 192, size: 34 }), roughness: 0.95, side: THREE.DoubleSide }), 0.6 + i * 0.02, 0.012 + i * 0.004, 0.5 + i * 0.02, -Math.PI / 2, 0, 0.2 + i * 0.1); void s; }
    tor(scene, 0.12, 0.03, MAT.darkIron, -1.1, 0.03, -0.5, Math.PI / 2); tor(scene, 0.12, 0.03, MAT.darkIron, -0.95, 0.03, -0.55, Math.PI / 2, Math.PI / 2);
    L(labels, [-0.5, 0.45, 0.1], "The cloak", "A heavy outer cloak for winter in a Roman prison: “Do your best to come before winter.”", "2 Timothy 4:13, 21");
    L(labels, [0.6, 0.35, -0.1], "The books, and above all the parchments", "Scrolls, and parchment notebooks: perhaps copies of the Scriptures. Paul still wanted to read and write at the very end.", "2 Timothy 4:13");
    L(labels, [-1.0, 0.25, -0.5], "In chains", "“I have fought the good fight, I have finished the race, I have kept the faith.”", "2 Timothy 4:6–8", true);
    scale(scene, labels, -0.2, -1.0, true);
    return { view: v3(0.3, 0.8, 1) };
  },

  "victors-wreath"({ scene, labels }) {
    ground(scene, 80, C.sand, false);
    // “Do you not know that in a race all the runners run, but only one receives the prize?… They do it to receive a
    // perishable wreath, but we an imperishable” (1 Corinthians 9:24-27; Hebrews 12:1-2; 2 Timothy 4:7-8). The Isthmian
    // Games near Corinth gave a wreath of pine or celery.
    const track = mesh(scene, new THREE.PlaneGeometry(10, 120), mat(0xd8c8a0, { rough: 1, tex: "sand", rep: 4 }), 0, 0.02, 0, -Math.PI / 2); track.userData.skipFit = true;
    [-5.5, 5.5].forEach((x) => { for (let k = 0; k < 6; k++) rbox(scene, 1.6, 0.6 + k * 0.6, 120, x + Math.sign(x) * (1 + k * 1.6), 0, 0, mat(0xe6dcc6, { rough: 1, tex: "stone", rep: 8 }), 0.05).userData.skipFit = true; });
    rbox(scene, 10, 0.12, 0.6, 0, 0, -14, MAT.limestone, 0.02);
    for (let i = 0; i < 4; i++) figure(scene, -3.5 + i * 2.2, -6 - i * 2.5, { robe: 0xe9e1cf, cloth: false, skin: i % 4, h: 4, reach: i === 0, face: -Math.PI / 2 });
    const wr = grp(scene, 0, 1.2, 4); wr.rotation.x = -0.6; rbox(scene, 1.6, 1.1, 1.0, 0, 0, 4, MAT.limestone, 0.05);
    for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 2; const lf = sph(wr, 0.09, mat(0x5f7d43, { rough: 0.8 }), Math.cos(a) * 0.4, 0.02, Math.sin(a) * 0.4, 1.6, 0.3, 0.6); lf.rotation.y = -a + 0.5; }
    tor(wr, 0.4, 0.02, MAT.bark, 0, 0, 0, Math.PI / 2);
    L(labels, [0, 2.2, 4], "A perishable wreath", "At the games near Corinth the winner got a wreath of pine or wild celery, withered within days. “We an imperishable.”", "1 Corinthians 9:25");
    L(labels, [0, 5, -8], "Run so as to win", "“Let us run with endurance the race that is set before us, looking to Jesus, the founder and perfecter of our faith.”", "Hebrews 12:1–2; 1 Corinthians 9:24");
    L(labels, [0, 1.4, -14], "The finish line", "“I have finished the race, I have kept the faith. Henceforth there is laid up for me the crown of righteousness.”", "2 Timothy 4:7–8", true);
    L(labels, [-9, 4, 0], "A great cloud of witnesses", "The heroes of faith of Hebrews 11, pictured as a crowd in the stands.", "Hebrews 12:1", true);
    return { view: v3(0.5, 0.45, 1.1), target: v3(0, 2, -2) };
  },
};

function lampOn(p, x, y, z) { const g = grp(p, x, y, z); vessel(g, [[0, 0], [0.12, 0.005], [0.16, 0.04], [0.15, 0.07], [0.08, 0.09]], MAT.clay).scale.z = 0.85; rbox(g, 0.12, 0.05, 0.07, 0.17, 0.025, 0, MAT.clay, 0.02); flame(g, 0.22, 0.06, 0, 0.45); }
