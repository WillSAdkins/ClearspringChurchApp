/* Music, money and writing. 1 unit = 1 cubit (about 45 cm). */
import {
  THREE, MAT, C, GOLD, BRONZE, SILVER, IRON, mat, mesh, grp, sph, cone, tor, rod, path, vessel, slab, rbox, box, cyl,
  textPlane, textTex, scroll, scale, L, plinth, ground, figure, beast, flame, rock, v3, ref,
} from "./kit.js";

// A coin with a design drawn in code on each face.
function coin(p, x, y, z, r, metal, face, back, ry = 0, tilt = 0) {
  const draw = (spec) => {
    const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d");
    g.fillStyle = spec.bg; g.fillRect(0, 0, 256, 256);
    g.strokeStyle = spec.ink; g.fillStyle = spec.ink; g.lineWidth = 6;
    g.beginPath(); g.arc(128, 128, 118, 0, 7); g.stroke();
    spec.draw(g);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return new THREE.MeshStandardMaterial({ map: t, roughness: 0.35, metalness: 0.8 });
  };
  const edge = metal;
  const mats = [edge, draw(face), draw(back || face)];
  const o = mesh(p, new THREE.CylinderGeometry(r, r, r * 0.12, 40), mats, x, y, z, 0, ry, 0);
  o.rotation.x = tilt; return o;
}
// Ring of letters round a coin.
function ringText(g, text, r = 96, size = 22) {
  g.font = `600 ${size}px Georgia, serif`; g.textAlign = "center"; g.textBaseline = "middle";
  const n = text.length; for (let i = 0; i < n; i++) { const a = -Math.PI / 2 - (n / 2 - i - 0.5) * (2 * Math.PI / Math.max(n * 1.15, 28)); g.save(); g.translate(128 + Math.cos(a) * r, 128 + Math.sin(a) * r); g.rotate(a + Math.PI / 2); g.fillText(text[i], 0, 0); g.restore(); }
}
// A head in profile, drawn simply.
function profile(g, x = 128, y = 128, s = 1) {
  g.save(); g.translate(x, y); g.scale(s, s); g.beginPath();
  g.moveTo(-20, -60); g.quadraticCurveTo(25, -70, 30, -30); g.lineTo(42, -8); g.lineTo(30, -2); g.lineTo(34, 12); g.lineTo(26, 22);
  g.quadraticCurveTo(28, 40, 10, 44); g.lineTo(6, 70); g.lineTo(-40, 70); g.quadraticCurveTo(-55, 20, -45, -20); g.quadraticCurveTo(-40, -55, -20, -60); g.fill();
  g.strokeStyle = "rgba(255,255,255,.35)"; g.lineWidth = 4; for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(-15 - i * 6, -40 + i * 6, 20 + i * 4, Math.PI * 1.1, Math.PI * 1.7); g.stroke(); }
  g.restore();
}

export const MODELS = {
  lyre({ scene, labels }) {
    plinth(scene, 1.6, 0xd9c9a3);
    // The kinnor: a wooden lyre with two arms, a crossbar and about ten strings (1 Samuel 16:23; Psalm 33:2).
    const g = grp(scene, 0, 0, 0, -0.3);
    const w = mat(0x9a6a3f, { tex: "wood", rough: 0.6 });
    rbox(g, 0.9, 0.5, 0.18, 0, 0.02, 0, w, 0.08);
    path(g, [[-0.38, 0.5, 0], [-0.5, 1.1, 0], [-0.42, 1.7, 0]], 0.05, w, 20);
    path(g, [[0.38, 0.5, 0], [0.52, 1.0, 0], [0.5, 1.55, 0]], 0.05, w, 20);
    rod(g, [-0.5, 1.68, 0], [0.56, 1.52, 0], 0.045, w);
    for (let i = 0; i < 10; i++) { const x = -0.3 + i * 0.065; const top = 1.66 - (x + 0.5) * 0.15; rod(g, [x, 0.42, 0.09], [x, top, 0.04], 0.004, mat(0xe8dcc0, { rough: 0.6 })); }
    rbox(g, 0.75, 0.04, 0.06, 0, 0.38, 0.06, MAT.darkWood, 0.01);
    L(labels, [0, 2.0, 0], "David's lyre", "“Whenever the spirit from God came upon Saul, David took the lyre and played it with his hand. Then Saul was refreshed and was well.”", "1 Samuel 16:23");
    L(labels, [0.5, 1.2, 0.2], "Ten strings", "“Make melody to him with the harp of ten strings.” The kinnor was light enough to carry and play walking.", "Psalm 33:2; 1 Samuel 10:5", true);
    L(labels, [-0.6, 0.9, 0], "Hung on the willows", "In Babylon the exiles hung up their lyres: “How shall we sing the LORD's song in a foreign land?”", "Psalm 137:1–4", true);
    scale(scene, labels, 0.7, -0.6, true);
    return { view: v3(0.3, 0.35, 1) };
  },

  harp({ scene, labels }) {
    ground(scene, 8, C.stone);
    // The nevel: a larger, deeper-toned instrument, perhaps an angled harp (Psalm 150:3; 1 Chronicles 15:16).
    const g = grp(scene, 0, 0, 0, -0.4), w = mat(0x8a5a33, { tex: "wood", rough: 0.6 });
    const sb = vessel(g, [[0, 0], [0.22, 0.05], [0.25, 1.6], [0.2, 2.6], [0, 2.8]], w); sb.rotation.z = -0.35;
    rod(g, [0.1, 0.3, 0], [1.6, 0.6, 0], 0.07, w);
    for (let i = 0; i < 12; i++) { const t = 0.12 + i * 0.07; const a = [-0.35 * Math.sin(1) * 0 + 0.0, 0, 0]; void a; rod(g, [0.05 + t * 2.6 * Math.sin(0.35), 0.4 + t * 2.4, 0], [0.25 + i * 0.11, 0.38 + i * 0.022, 0], 0.005, mat(0xe8dcc0, { rough: 0.6 })); }
    figure(scene, -1.2, 0.4, { robe: 0xe9e1cf, cloth: 0x8b6f4e, beard: true, reach: true, face: -0.4, skipFit: true });
    L(labels, [0.3, 3.1, 0], "Praise him with harp and lyre", "The psalms name many instruments; the nevel was probably larger and lower than the lyre. David appointed Levites to play them before the ark.", "Psalm 150:3; 1 Chronicles 15:16");
    L(labels, [0.9, 1.2, 0.2], "Strings", "The Bible gives no exact shape; this follows harps shown in Near Eastern art of the time.", "1 Chronicles 15:16", true);
    return { view: v3(0.6, 0.4, 1) };
  },

  cymbals({ scene, labels }) {
    plinth(scene, 1.0, 0xd9c9a3);
    // Bronze cymbals, loud and clashing (Psalm 150:5; 1 Chronicles 15:19; 1 Corinthians 13:1).
    [[-0.25, 0.4], [0.25, -0.5]].forEach(([x, rx], i) => { const g = grp(scene, x, 0.1, i * 0.1, i * 0.6); g.rotation.x = rx;
      vessel(g, [[0, 0.06], [0.06, 0.06], [0.08, 0.03], [0.24, 0.0], [0.26, -0.01]], mat(0xc89a52, { rough: 0.25, metal: 1 }));
      tor(g, 0.03, 0.01, MAT.leatherDark, 0, 0.08, 0, 0, 0); });
    L(labels, [0, 0.45, 0], "Loud clashing cymbals", "“Praise him with sounding cymbals; praise him with loud clashing cymbals!” Heman, Asaph and Ethan played bronze cymbals before the ark.", "Psalm 150:5; 1 Chronicles 15:19");
    L(labels, [0.35, 0.25, -0.1], "Without love", "“If I speak in the tongues of men and of angels, but have not love, I am a noisy gong or a clanging cymbal.”", "1 Corinthians 13:1", true);
    scale(scene, labels, 0.1, -0.5, true);
    return { view: v3(0.4, 0.6, 1) };
  },

  timbrel({ scene, labels }) {
    plinth(scene, 1.0, 0xd9c9a3);
    // A hand drum (toph): a wooden hoop with skin stretched over it (Exodus 15:20; Psalm 150:4).
    const g = grp(scene, 0, 0.05, 0); g.rotation.x = -0.25;
    mesh(g, new THREE.CylinderGeometry(0.4, 0.4, 0.12, 40, 1, true), mat(0x9a6a3f, { tex: "wood", rough: 0.6, side: THREE.DoubleSide }), 0, 0.06, 0);
    mesh(g, new THREE.CircleGeometry(0.39, 40), mat(0xe8d8b0, { rough: 0.8 }), 0, 0.12, 0, -Math.PI / 2);
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; sph(g, 0.012, MAT.leatherDark, Math.cos(a) * 0.4, 0.1, Math.sin(a) * 0.4); }
    figure(scene, -1.6, -1, { robe: 0x7a5a6a, cloth: 0x5a3a4a, skin: 1, raise: true, face: 0.3, skipFit: true });
    L(labels, [0, 0.4, 0], "Miriam's timbrel", "“Miriam the prophetess, the sister of Aaron, took a tambourine in her hand, and all the women went out after her with tambourines and dancing.”", "Exodus 15:20–21");
    L(labels, [0.4, 0.2, 0.3], "A frame drum", "Played mostly by women, at victories and celebrations. Jephthah's daughter came out to meet him with timbrels.", "Judges 11:34; Psalm 150:4", true);
    return { view: v3(0.4, 0.7, 1), target: v3(0, 0.15, 0) };
  },

  "double-pipe"({ scene, labels }) {
    plinth(scene, 1.4, 0xd9c9a3);
    // The pipe (halil), often a double reed pipe like the Greek aulos (1 Samuel 10:5; Matthew 9:23; 11:17).
    const g = grp(scene, 0, 0.06, 0, 0.2);
    [-1, 1].forEach((sd) => { const t = grp(g, 0, 0, sd * 0.05, sd * 0.18);
      mesh(t, new THREE.CylinderGeometry(0.022, 0.03, 1.1, 16), MAT.reed, 0.55, 0, 0, 0, 0, Math.PI / 2);
      for (let i = 0; i < 5; i++) mesh(t, new THREE.CircleGeometry(0.009, 10), MAT.black, 0.5 + i * 0.1, 0.028, 0, -Math.PI / 2);
      vessel(t, [[0.03, 0], [0.045, 0.06], [0.05, 0.08]], MAT.reed, 1.12, 0, 0).rotation.z = -Math.PI / 2; });
    L(labels, [0.4, 0.4, 0], "The pipe", "Played at feasts and at funerals. “We played the flute for you, and you did not dance; we sang a dirge, and you did not mourn.”", "Matthew 11:17");
    L(labels, [0.9, 0.25, 0.2], "Flute players for the dead", "At Jairus' house the flute players and the crowd were already making a commotion.", "Matthew 9:23", true);
    L(labels, [0.1, 0.25, -0.2], "With the prophets", "Saul met a band of prophets coming down with harp, tambourine, flute and lyre.", "1 Samuel 10:5", true);
    scale(scene, labels, 0.6, -0.6, true);
    return { view: v3(0.3, 0.75, 1) };
  },

  "widows-mites"({ scene, labels }) {
    ground(scene, 12, C.stone);
    // The treasury: thirteen trumpet-shaped chests for offerings stood in the Court of the Women
    // (Mark 12:41-44). Two lepta, the smallest coins.
    const ch = grp(scene, 0, 0, 0);
    rbox(ch, 1.6, 1.6, 1.2, 0, 0, 0, MAT.darkWood, 0.08);
    for (let i = 0; i < 3; i++) rbox(ch, 1.65, 0.1, 1.25, 0, 0.3 + i * 0.5, 0, BRONZE, 0.02);
    vessel(ch, [[0.06, 0], [0.1, 0.4], [0.3, 0.9], [0.45, 1.0]], BRONZE, 0, 1.55, 0);
    [-1, 1].forEach((sd) => { const c2 = grp(scene, sd * 2.3, 0, -1); rbox(c2, 1.6, 1.6, 1.2, 0, 0, 0, MAT.darkWood, 0.08); vessel(c2, [[0.06, 0], [0.1, 0.4], [0.3, 0.9], [0.45, 1.0]], BRONZE, 0, 1.55, 0); c2.userData.skipFit = true; });
    // Two lepta in her hand's reach, and some rich gifts.
    const lep = { bg: "#8a6a4a", ink: "#3a2a1a", draw: (g) => { g.lineWidth = 8; g.beginPath(); g.moveTo(128, 60); g.lineTo(128, 180); g.moveTo(90, 85); g.lineTo(166, 85); g.stroke(); g.beginPath(); g.arc(128, 160, 40, 0.2, Math.PI - 0.2); g.stroke(); } };
    const star = { bg: "#8a6a4a", ink: "#3a2a1a", draw: (g) => { g.lineWidth = 8; for (let i = 0; i < 4; i++) { const a = i * Math.PI / 4; g.beginPath(); g.moveTo(128 + Math.cos(a) * 60, 128 + Math.sin(a) * 60); g.lineTo(128 - Math.cos(a) * 60, 128 - Math.sin(a) * 60); g.stroke(); } } };
    coin(scene, 0.3, 2.62, 0.25, 0.03, mat(0x7a5a3a, { rough: 0.5, metal: 0.7 }), lep, star, 0, 0.3);
    coin(scene, 0.38, 2.6, 0.2, 0.03, mat(0x7a5a3a, { rough: 0.5, metal: 0.7 }), star, lep, 1, 0.5);
    figure(scene, 1.4, 1.4, { robe: 0x3a3430, cloth: 0x2a2522, skin: 1, reach: true, face: Math.PI * 1.2, h: 3.8 });
    figure(scene, -2.6, 2.4, { robe: 0x5b2c6f, cloth: 0xe9e1cf, beard: true, skin: 0, face: -0.6, skipFit: true });
    L(labels, [0.3, 3.0, 0.25], "Two small copper coins", "Two lepta, which make a quadrans: the smallest coins in use, about a sixty-fourth of a day's wage.", "Mark 12:42");
    L(labels, [1.4, 4.4, 1.4], "All she had to live on", "“This poor widow has put in more than all those who are contributing to the offering box. For they all contributed out of their abundance, but she out of her poverty has put in everything she had.”", "Mark 12:43–44");
    L(labels, [-2.3, 2.9, -1], "The treasury", "Thirteen collecting chests with trumpet-shaped mouths stood in the temple court.", "Mark 12:41", true);
    return { view: v3(0.7, 0.55, 1), target: v3(0.3, 1.8, 0.4) };
  },

  denarius({ scene, labels }) {
    plinth(scene, 0.5, 0xd9c9a3);
    // A silver denarius of Tiberius: his head, and the inscription TI CAESAR DIVI AVG F AVGVSTVS
    // (Matthew 22:15-22). A denarius was a day's wage (Matthew 20:2).
    const face = { bg: "#c9ced4", ink: "#4a4e54", draw: (g) => { profile(g, 128, 128, 1.1); ringText(g, "TI CAESAR DIVI AVG F AVGVSTVS", 100, 20); } };
    const back = { bg: "#c9ced4", ink: "#4a4e54", draw: (g) => { g.beginPath(); g.ellipse(128, 120, 26, 40, 0, 0, 7); g.fill(); g.fillRect(100, 150, 56, 12); g.fillRect(108, 80, 4, 80); ringText(g, "PONTIF MAXIM", 100, 22); } };
    coin(scene, -0.05, 0.03, 0, 0.042, SILVER, face, back, 0, 0.2);
    coin(scene, 0.09, 0.006, 0.07, 0.042, SILVER, back, face, 1.2, 0);
    L(labels, [-0.05, 0.13, 0], "Whose likeness is this?", "“Caesar's.” “Therefore render to Caesar the things that are Caesar's, and to God the things that are God's.”", "Matthew 22:19–21");
    L(labels, [0.09, 0.08, 0.07], "A day's wage", "The vineyard owner agreed to pay the labourers a denarius a day.", "Matthew 20:2", true);
    L(labels, [-0.1, 0.06, 0.08], "Son of the divine Augustus", "The inscription called Tiberius son of a god: a claim Jesus' hearers would have felt.", "Matthew 22:20", true);
    return { view: v3(0.3, 0.85, 1) };
  },

  "thirty-pieces"({ scene, labels }) {
    ground(scene, 8, C.stone);
    // Thirty pieces of silver, probably shekels of Tyre, weighed out to Judas, thrown into the temple
    // and used to buy the potter's field (Matthew 26:14-16; 27:3-10; Zechariah 11:12-13).
    const tyre = { bg: "#c9ced4", ink: "#4a4e54", draw: (g) => { g.lineWidth = 6; g.beginPath(); g.arc(128, 115, 50, 0, 7); g.fill(); g.beginPath(); for (let i = 0; i < 9; i++) { const a = -Math.PI * 0.9 + i * 0.22; g.moveTo(128 + Math.cos(a) * 50, 115 + Math.sin(a) * 50); g.lineTo(128 + Math.cos(a) * 72, 115 + Math.sin(a) * 72); } g.stroke(); } };
    const eagle = { bg: "#c9ced4", ink: "#4a4e54", draw: (g) => { g.beginPath(); g.ellipse(128, 130, 24, 46, 0, 0, 7); g.fill(); g.beginPath(); g.arc(128, 80, 16, 0, 7); g.fill(); g.fillRect(100, 175, 56, 8); ringText(g, "ΤΥΡΟΥ ΙΕΡΑΣ ΚΑΙ ΑΣΥΛΟΥ", 102, 18); } };
    for (let i = 0; i < 30; i++) { const a = i * 2.39996, r = Math.sqrt(i) * 0.06; coin(scene, Math.cos(a) * r, 0.62 + (i % 4) * 0.004, Math.sin(a) * r, 0.05, SILVER, i % 2 ? tyre : eagle, eagle, i, (i % 3) * 0.1); }
    rbox(scene, 1.8, 0.6, 1.1, 0, 0, 0, MAT.limestone, 0.05);
    const bag = vessel(scene, [[0, 0], [0.2, 0.02], [0.24, 0.2], [0.15, 0.35], [0.07, 0.38], [0.1, 0.42]], MAT.leather, 0.6, 0.6, -0.2); bag.rotation.z = 0.9; bag.position.y = 0.72;
    tor(scene, 0.08, 0.015, MAT.rope, 0.5, 0.8, -0.2);
    L(labels, [0, 1.1, 0], "Thirty pieces of silver", "The price of a slave gored by an ox. “And they weighed out for him thirty pieces of silver.”", "Matthew 26:15; Exodus 21:32");
    L(labels, [0.3, 0.9, 0.3], "Shekels of Tyre", "The best silver of the day, also used for the temple tax; struck with the god Melqart and an eagle.", "Matthew 17:27", true);
    L(labels, [0.6, 1.1, -0.2], "The money bag", "Judas kept the disciples' money bag, and used to help himself.", "John 12:6", true);
    L(labels, [-0.6, 0.9, 0.3], "The potter's field", "He threw the silver into the temple. The priests could not put blood money in the treasury, so they bought the potter's field to bury strangers in.", "Matthew 27:3–10; Zechariah 11:12–13", true);
    scale(scene, labels, -0.4, -0.9, true);
    return { view: v3(0.4, 0.85, 1), target: v3(0, 0.62, 0) };
  },

  talents({ scene, labels }) {
    ground(scene, 14, 0xb8ad7c, false);
    // A talent: about 34 kg of silver, 6,000 denarii, around twenty years' wages (Matthew 25:14-30).
    const ingot = (x, z, k) => { for (let i = 0; i < k; i++) rbox(scene, 0.85, 0.32, 0.4, x + (i % 2) * 0.5, Math.floor(i / 2) * 0.32, z + (i % 2) * 0.1, mat(0xd8dde2, { rough: 0.25, metal: 1 }), 0.05); };
    ingot(-3, 0, 10); ingot(0, 0, 4);
    // The buried talent.
    const hole = mesh(scene, new THREE.CircleGeometry(0.8, 24), mat(0x5a4a34, { rough: 1 }), 3, 0.01, 0.5, -Math.PI / 2); hole.userData.noShadow = true;
    rbox(scene, 0.85, 0.32, 0.4, 3, -0.15, 0.5, mat(0xd8dde2, { rough: 0.25, metal: 1 }), 0.05);
    mesh(scene, new THREE.SphereGeometry(0.6, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x7a6040, { rough: 1 }), 4.0, 0, -0.3).scale.y = 0.5;
    const sp = grp(scene, 4.0, 0.4, 0.9, -0.5); sp.rotation.z = -0.3; rod(sp, [0, 0, 0], [0, 2.2, 0], 0.04, MAT.olive); slab(sp, [[-0.2, 0], [0.2, 0], [0.15, -0.4], [-0.15, -0.4]], 0.03, IRON, 0, 0, 0);
    [[-2.7, -2], [0.3, -2], [3.4, -1.8]].forEach(([x, z], i) => figure(scene, x, z, { robe: [0x5d7a5a, 0x6b7f8c, 0x8b6f4e][i], beard: i !== 1, face: Math.PI / 2, skipFit: true }));
    L(labels, [-2.8, 2.2, 0], "Five talents", "“Well done, good and faithful servant. You have been faithful over a little; I will set you over much.”", "Matthew 25:20–21");
    L(labels, [0.2, 1.3, 0], "Two talents", "He too doubled what he was given.", "Matthew 25:22–23", true);
    L(labels, [3, 0.8, 0.5], "Hid in the ground", "“I was afraid, and I went and hid your talent in the ground.” A talent was about 34 kg of silver: some twenty years' wages.", "Matthew 25:24–30");
    return { view: v3(0.5, 0.7, 1), target: v3(0, 0.8, 0) };
  },

  "money-changers"({ scene, labels }) {
    ground(scene, 20, C.stone);
    // In the temple courts: tables of money changers and the seats of those selling pigeons (John 2:13-16; Mark 11:15-17).
    const t1 = grp(scene, 0, 0, 0, 0.1); rbox(t1, 3, 1.4, 1.4, 0, 0, 0, MAT.wood, 0.05);
    for (let i = 0; i < 24; i++) mesh(t1, new THREE.CylinderGeometry(0.06, 0.06, 0.012, 16), i % 3 ? SILVER : BRONZE, -1.2 + (i % 8) * 0.3, 1.41 + Math.floor(i / 8) * 0.012, -0.3 + (i % 3) * 0.25);
    // A table overturned, coins on the ground.
    const t2 = grp(scene, 3.4, 0, 1.4, -0.4); const tt = rbox(t2, 3, 1.4, 1.4, 0, 0, 0, MAT.wood, 0.05); tt.rotation.x = Math.PI / 2; tt.position.set(0, 0.7, 0.5);
    for (let i = 0; i < 30; i++) { const a = i * 2.4, r = 0.3 + (i % 7) * 0.22; mesh(scene, new THREE.CylinderGeometry(0.06, 0.06, 0.012, 16), i % 3 ? SILVER : BRONZE, 2.6 + Math.cos(a) * r, 0.01, 2.6 + Math.sin(a) * r); }
    // Pigeon cages.
    for (let i = 0; i < 3; i++) { const cg = grp(scene, -3.5 + i * 0.9, 0, 2.2 + (i % 2) * 0.4); for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; rod(cg, [Math.cos(a) * 0.35, 0, Math.sin(a) * 0.35], [Math.cos(a) * 0.3, 0.7, Math.sin(a) * 0.3], 0.012, MAT.reed); } tor(cg, 0.3, 0.02, MAT.reed, 0, 0.7, 0); sph(cg, 0.13, mat(0xd8d4ce, { rough: 0.9 }), 0, 0.2, 0, 1.3, 1, 1); }
    // A whip of cords.
    const wh = grp(scene, 1.4, 0.03, 2.8, 0.5); rod(wh, [0, 0, 0], [0.5, 0, 0], 0.03, MAT.rope); for (let k = 0; k < 4; k++) path(wh, [[0.5, 0, 0], [0.9, 0, (k - 1.5) * 0.08], [1.3, 0, (k - 1.5) * 0.15]], 0.01, MAT.rope, 10);
    beast(scene, -5, -1.5, { color: 0xf0ead8, wool: true, s: 0.55, face: 0.6 }); beast(scene, -6, -0.2, { color: 0x7a5038, horns: true, s: 1, face: 0.3 });
    figure(scene, 1.6, -1.8, { robe: 0x5b2c6f, cloth: 0xe9e1cf, beard: true, skin: 0, face: Math.PI / 2 + 0.4, sit: true, skipFit: true });
    L(labels, [0, 2.2, 0], "The money changers' tables", "Pilgrims had to change their money into Tyrian shekels for the temple tax, at a profit for the changers.", "Exodus 30:13; Matthew 17:24");
    L(labels, [3.2, 1.4, 2.2], "He overturned the tables", "Making a whip of cords, he drove them all out of the temple, poured out the coins and overturned their tables.", "John 2:15");
    L(labels, [-2.6, 1.3, 2.5], "Pigeons", "The offering of the poor. “Take these things away; do not make my Father's house a house of trade.”", "John 2:16; Leviticus 5:7", true);
    L(labels, [1, 3.4, -1], "A house of prayer", "“My house shall be called a house of prayer for all the nations. But you have made it a den of robbers.”", "Mark 11:17", true);
    return { view: v3(0.8, 0.7, 1.1), target: v3(0, 0.8, 1) };
  },

  "isaiah-scroll"({ scene, labels }) {
    ground(scene, 8, C.stone);
    // Jesus in the synagogue at Nazareth unrolls the scroll of Isaiah and reads Isaiah 61:1-2 (Luke 4:16-21).
    rbox(scene, 2.4, 1.6, 1.2, 0, 0, 0, MAT.darkWood, 0.05);
    const s = scroll(scene, 0, 1.62, 0, 1.0, 1.1, { text: ["רוח אדני יהוה עלי", "יען משח יהוה אתי", "לבשר ענוים שלחני", "לחבש לנשברי לב", "לקרא לשבוים דרור", "ולאסורים פקח קוח", "לקרא שנת רצון ליהוה"], rtl: true, size: 40 });
    s.rotation.y = Math.PI / 2;
    figure(scene, -1.6, 0, { robe: 0xe9e1cf, cloth: 0xf2ede0, band: 0x8b6f4e, beard: true, reach: true, face: 0, skin: 2, skipFit: true });
    L(labels, [0, 2.4, 0], "The Spirit of the Lord is upon me", "“…because he has anointed me to proclaim good news to the poor… to proclaim the year of the Lord's favour.” “Today this Scripture has been fulfilled in your hearing.”", "Luke 4:17–21; Isaiah 61:1–2");
    L(labels, [0.6, 1.9, 0.5], "A scroll, not a book", "Long sheets of leather or papyrus sewn together and rolled. The Great Isaiah Scroll from Qumran, about 7 m long, is a thousand years older than any other complete copy.", "Luke 4:17, 20", true);
    L(labels, [-1.6, 4.3, 0], "He stood up to read", "Then he rolled it up, gave it back to the attendant and sat down to teach.", "Luke 4:16, 20", true);
    return { view: v3(0.6, 1.0, 1), target: v3(0, 1.6, 0) };
  },

  "wax-tablet"({ scene, labels }) {
    plinth(scene, 0.8, 0xd9c9a3);
    // A hinged writing tablet of wax; Zechariah asked for one and wrote, “His name is John” (Luke 1:63).
    const g = grp(scene, 0, 0.02, 0);
    [-1, 1].forEach((sd, i) => { const leaf = grp(g, sd * 0.2, 0, 0, 0); leaf.rotation.z = sd * 0.05;
      rbox(leaf, 0.38, 0.03, 0.5, 0, 0, 0, MAT.olive, 0.01);
      mesh(leaf, new THREE.PlaneGeometry(0.31, 0.42), i ? new THREE.MeshStandardMaterial({ map: textTex(["ΙΩΑΝΝΗΣ", "ΕΣΤΙΝ", "ΟΝΟΜΑ", "ΑΥΤΟΥ"], { bg: "#5a4a22", ink: "#d8c890", w: 256, h: 340, size: 40 }), roughness: 0.6 }) : MAT.wax, 0, 0.032, 0, -Math.PI / 2); });
    [-0.15, 0.15].forEach((z) => tor(g, 0.02, 0.006, MAT.rope, 0, 0.02, z, 0, Math.PI / 2));
    const st = grp(scene, 0.55, 0.02, 0.2, 0.6); rod(st, [0, 0, 0], [0.35, 0, 0], 0.008, BRONZE); slab(st, [[0, -0.02], [0.05, -0.025], [0.05, 0.025], [0, 0.02]], 0.004, BRONZE, -0.04, 0, 0, Math.PI / 2);
    L(labels, [0.2, 0.2, 0], "His name is John", "Zechariah could not speak, so he asked for a writing tablet. Immediately his mouth was opened and he praised God.", "Luke 1:62–64");
    L(labels, [0.55, 0.1, 0.2], "Stylus", "A pointed end to write in the wax; a flat end to smooth it out again.", "Luke 1:63", true);
    scale(scene, labels, -0.2, -0.45, true);
    return { view: v3(0.2, 1.0, 0.8) };
  },

  "pen-and-ink"({ scene, labels }) {
    plinth(scene, 1.0, 0xd9c9a3);
    // A scribe's palette with ink wells, reed pens and a knife; a letter on papyrus
    // (Jeremiah 36:4, 18, 23; Ezekiel 9:2; 3 John 13; Galatians 6:11).
    const pal = grp(scene, -0.25, 0.02, -0.1, 0.3);
    rbox(pal, 0.12, 0.04, 0.5, 0, 0, 0, MAT.olive, 0.01);
    [-0.18, -0.1].forEach((z, i) => mesh(pal, new THREE.CircleGeometry(0.025, 16), i ? MAT.red : MAT.black, 0, 0.042, z, -Math.PI / 2));
    for (let i = 0; i < 3; i++) rod(scene, [0.05 + i * 0.04, 0.012, -0.35], [0.18 + i * 0.04, 0.012, 0.15], 0.006, MAT.reed);
    const kn = grp(scene, 0.35, 0.012, -0.2, 0.9); rod(kn, [0, 0, 0], [0.12, 0, 0], 0.01, MAT.olive); slab(kn, [[0, -0.01], [0.1, -0.015], [0.14, 0], [0, 0.01]], 0.003, IRON, 0.12, 0, 0, Math.PI / 2);
    const pap = mesh(scene, new THREE.PlaneGeometry(0.5, 0.36), new THREE.MeshStandardMaterial({ map: textTex(["ΙΔΕΤΕ ΠΗΛΙΚΟΙΣ", "ΥΜΙΝ ΓΡΑΜΜΑΣΙΝ", "ΕΓΡΑΨΑ ΤΗ ΕΜΗ", "ΧΕΙΡΙ"], { bg: "#d8c49a", ink: "#2a1d12", w: 512, h: 368, size: 46 }), roughness: 0.95 }), 0.4, 0.008, 0.25, -Math.PI / 2, 0, 0.2); void pap;
    L(labels, [-0.25, 0.15, -0.1], "Ink and reed pens", "“I had much to write to you, but I would rather not write with pen and ink.” Ink was soot and gum; pens were cut reeds.", "3 John 13");
    L(labels, [0.4, 0.15, 0.25], "In large letters", "“See with what large letters I am writing to you with my own hand.” Paul usually dictated, then signed off himself.", "Galatians 6:11; Romans 16:22");
    L(labels, [0.35, 0.1, -0.2], "The scribe's knife", "King Jehoiakim cut Jeremiah's scroll piece by piece with a scribe's knife and threw it in the fire.", "Jeremiah 36:23", true);
    L(labels, [-0.3, 0.1, 0.2], "A writing case at his side", "Ezekiel saw a man clothed in linen with a writing case at his waist.", "Ezekiel 9:2", true);
    scale(scene, labels, -0.5, 0.35, true);
    return { view: v3(0.3, 1.0, 0.8) };
  },

  ostracon({ scene, labels }) {
    plinth(scene, 0.8, 0xd9c9a3);
    // A letter in ink on a broken piece of pot, like the Lachish letters written as Babylon
    // closed in, when only Lachish and Azekah were left (Jeremiah 34:7).
    const outline = [[-0.28, -0.2], [0.05, -0.26], [0.3, -0.16], [0.34, 0.08], [0.18, 0.24], [-0.1, 0.27], [-0.3, 0.12]];
    const shape = new THREE.Shape(); outline.forEach(([x, y], i) => (i ? shape.lineTo(x, y) : shape.moveTo(x, y)));
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 2 });
    const uv = geo.attributes.uv, pos = geo.attributes.position;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) + 0.34) / 0.68, (pos.getY(i) + 0.27) / 0.54);
    const tex = textTex(["כי אל משאת לכש", "נחנו שמרם", "כי לא נראה", "את עזקה"], { bg: "#b87a4e", ink: "#1a120c", w: 512, h: 420, size: 52, rtl: true, font: "'Times New Roman', serif" });
    const sh = mesh(scene, geo, [new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }), MAT.clay], 0, 0.04, 0, -Math.PI / 2 + 0.08, 0, 0.15);
    void sh;
    L(labels, [0, 0.4, 0], "A letter on a potsherd", "Broken pottery was free paper. One of the Lachish letters ends: “we are watching for the signal fires of Lachish… for we cannot see Azekah.”", "Jeremiah 34:7");
    L(labels, [0.2, 0.2, 0.1], "Lachish and Azekah", "Jeremiah wrote that these were the last fortified cities of Judah left standing.", "Jeremiah 34:6–7", true);
    scale(scene, labels, -0.4, -0.3, true);
    return { view: v3(0.2, 0.9, 1) };
  },

  "ezekiels-brick"({ scene, labels }) {
    ground(scene, 10, 0xb8ad7c, false);
    // “Take a brick and lay it before you, and engrave on it a city, Jerusalem, and put siegeworks
    // against it” (Ezekiel 4:1-3). He lay on his side 390 days, with an iron griddle as a wall.
    const br = grp(scene, 0, 0, 0);
    rbox(br, 1.4, 0.3, 1.0, 0, 0, 0, mat(0xb08a5a, { rough: 1 }), 0.04);
    const tex = (() => { const c = document.createElement("canvas"); c.width = 256; c.height = 180; const g = c.getContext("2d"); g.fillStyle = "#b08a5a"; g.fillRect(0, 0, 256, 180); g.strokeStyle = "#5a3a1a"; g.lineWidth = 5;
      g.beginPath(); g.ellipse(128, 90, 70, 50, 0, 0, 7); g.stroke(); for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.strokeRect(128 + Math.cos(a) * 70 - 5, 90 + Math.sin(a) * 50 - 5, 10, 10); }
      g.beginPath(); g.moveTo(100, 70); g.lineTo(150, 70); g.lineTo(150, 100); g.lineTo(100, 100); g.closePath(); g.stroke(); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
    mesh(br, new THREE.PlaneGeometry(1.3, 0.9), new THREE.MeshStandardMaterial({ map: tex, roughness: 1 }), 0, 0.305, 0, -Math.PI / 2);
    // Tiny siege works: ramps and rams.
    [[0.75, 0], [-0.75, 0], [0, 0.55], [0, -0.55]].forEach(([x, z], i) => { const r = rbox(scene, 0.2, 0.12, 0.12, x, 0, z, mat(0x8a7a5a, { rough: 1 }), 0.03); r.rotation.y = i * Math.PI / 2; });
    const gr = rbox(scene, 0.06, 0.5, 1.1, -1.1, 0, 0, MAT.darkIron, 0.01); void gr;
    figure(scene, -2.2, 0.2, { robe: 0x6b5236, beard: true, sit: true, face: 0, skin: 2, skipFit: true });
    L(labels, [0, 0.8, 0], "Jerusalem on a brick", "Ezekiel drew the city on a clay brick, then built siege works, camps and battering rams round it: a sign for the house of Israel.", "Ezekiel 4:1–3");
    L(labels, [-1.1, 0.8, 0], "An iron griddle", "Set up as an iron wall between him and the city.", "Ezekiel 4:3", true);
    L(labels, [-2.2, 3.4, 0.2], "390 days and 40", "He lay on his left side 390 days for Israel, then on his right 40 days for Judah.", "Ezekiel 4:4–6", true);
    return { view: v3(0.4, 0.9, 1), target: v3(0, 0.3, 0), zoom: 1.4 };
  },

  "writing-on-the-wall"({ scene, labels }) {
    ground(scene, 20, C.stone);
    // At Belshazzar's feast the fingers of a man's hand wrote on the plaster of the wall opposite
    // the lampstand: MENE, MENE, TEKEL, PARSIN (Daniel 5:5, 25-28).
    const wall = rbox(scene, 12, 9, 0.6, 0, 0, -3, mat(0xffffff, { tex: "plaster", rough: 1, rep: 2 }), 0.05); void wall;
    textPlane(scene, ["מנא מנא תקל ופרסין"], 7, 1.4, 0, 6.2, -2.68, { bg: null, transparent: true, ink: "#2a1a10", w: 1280, h: 240, size: 120, rtl: true, font: "'Times New Roman', serif" });
    const hand = grp(scene, 3.6, 5.9, -2.5); const sk = mat(0xd8c0a8, { rough: 0.7, opacity: 0.85 });
    rbox(hand, 0.5, 0.6, 0.16, 0, 0, 0, sk, 0.05); for (let i = 0; i < 4; i++) mesh(hand, new THREE.CapsuleGeometry(0.06, 0.45, 6, 10), sk, -0.18 + i * 0.12, 0.85 - Math.abs(i - 1.5) * 0.08, 0, 0, 0, 0.1);
    const glow = new THREE.PointLight(0xfff1c0, 2.5, 8, 2); glow.position.set(0, 6, -1.5); scene.add(glow);
    // The lampstand and a table with gold and silver cups from the temple (Daniel 5:2-4).
    const ls = grp(scene, -4, 0, -1.5); vessel(ls, [[0, 0], [0.5, 0], [0.12, 0.3], [0.09, 4.5], [0.3, 4.6]], GOLD); flame(ls, 0, 4.62, 0, 1.6);
    rbox(scene, 7, 1.4, 1.8, 0, 0, 1.5, MAT.darkWood, 0.05);
    [[-2, 1.2], [-0.8, 1.6], [0.6, 1.3], [2, 1.7], [2.8, 1.2]].forEach(([x, z], i) => vessel(scene, [[0, 0], [0.12, 0.01], [0.06, 0.15], [0.05, 0.3], [0.18, 0.5], [0.2, 0.55]], i % 2 ? SILVER : GOLD, x, 1.42, z));
    figure(scene, 0, 3.4, { robe: 0x5b2c6f, cloth: false, beard: true, face: Math.PI, skin: 0 });
    const crown = vessel(scene, [[0.3, 0], [0.33, 0.25]], GOLD, 0, 3.3, 3.4); void crown;
    figure(scene, 4.5, 3, { robe: 0xe9e1cf, cloth: 0x8b6f4e, beard: true, face: Math.PI * 1.2, skin: 2 });
    L(labels, [0, 7.4, -2.6], "MENE, MENE, TEKEL, PARSIN", "“God has numbered the days of your kingdom and brought it to an end; you have been weighed in the balances and found wanting; your kingdom is divided and given to the Medes and Persians.”", "Daniel 5:25–28");
    L(labels, [3.6, 7.0, -2.4], "The fingers of a man's hand", "The king saw the hand as it wrote, and his knees knocked together.", "Daniel 5:5–6");
    L(labels, [0, 4.4, 3.4], "Belshazzar", "Drinking from the gold and silver vessels taken from the temple in Jerusalem. That very night he was killed.", "Daniel 5:1–4, 30");
    L(labels, [4.5, 4.4, 3], "Daniel", "Brought in to read it, he refused the king's gifts.", "Daniel 5:13–17", true);
    return { view: v3(0.25, 0.35, 1), target: v3(0, 4, 0) };
  },
};
