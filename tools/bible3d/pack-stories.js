/* Scenes from the stories: miracles, parables and the early church. 1 unit = 1 cubit (about 45 cm). */
import {
  scatter, THREE, MAT, C, GOLD, BRONZE, SILVER, IRON, mat, mesh, grp, sph, cone, tor, rod, path, vessel, slab, rbox, box, cyl,
  textPlane, textTex, scroll, scale, L, plinth, ground, figure, beast, flame, rock, hill, v3, ref, bush, olive, palm, house, ROBES,
} from "./kit.js";

const GLOW = (c = 0xfff1c0, o = 0.5) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, depthWrite: false });
function jar(p, x, z, s = 1, m = MAT.clay) { return vessel(p, [[0, 0], [0.25 * s, 0.02], [0.4 * s, 0.4 * s], [0.36 * s, 0.85 * s], [0.18 * s, 1.05 * s], [0.14 * s, 1.2 * s], [0.18 * s, 1.26 * s]], m, x, 0, z); }

export const MODELS = {
  "prodigal-son"({ scene, labels }) {
    ground(scene, 50, 0xb8ad7c, false);
    // “While he was still a long way off, his father saw him and felt compassion, and ran and embraced him”;
    // the best robe, a ring, sandals and the fattened calf (Luke 15:11-32).
    house(scene, -10, -8, 12, 9, 7, 0.3);
    const road = mesh(scene, new THREE.PlaneGeometry(4, 40), mat(0xc8b48a, { rough: 1, tex: "sand", rep: 3 }), 2, 0.02, 4, -Math.PI / 2, 0, 0.4); road.userData.skipFit = true;
    figure(scene, 0, 0, { robe: 0xe9e1cf, cloth: 0x8b6f4e, beard: true, h: 4, face: -0.4, reach: true });
    figure(scene, 1.1, 0.4, { robe: 0x6a5a40, cloth: false, skin: 1, h: 3.9, face: Math.PI - 0.4, reach: true });
    const robe = mesh(scene, new THREE.PlaneGeometry(1.4, 2.2), mat(0xb3202a, { rough: 0.9, tex: "linen", side: THREE.DoubleSide }), -2.6, 2.4, -1.2, 0, 0.6, 0.1);
    figure(scene, -2.8, -1.6, { robe: 0x6b7f8c, skin: 2, h: 3.9, face: 0.4, reach: true }); void robe;
    tor(scene, 0.06, 0.015, GOLD, -2.3, 2.0, -1.0, Math.PI / 2);
    [[-3.6, -0.6], [-3.4, -0.5]].forEach(([x, z]) => rbox(scene, 0.22, 0.04, 0.55, x, 0, z, MAT.leather, 0.03));
    beast(scene, -7, 1, { color: 0x8a5a3a, horns: true, s: 1, face: 0.4 });
    figure(scene, -14, 4, { robe: 0x5d7a5a, beard: true, h: 4, face: 0.4, skipFit: true });
    L(labels, [0.5, 4.6, 0.2], "His father ran", "“While he was still a long way off, his father saw him and felt compassion, and ran and embraced him and kissed him.”", "Luke 15:20");
    L(labels, [-2.6, 4.2, -1.4], "The best robe, a ring and sandals", "“Bring quickly the best robe, and put it on him, and put a ring on his hand, and shoes on his feet.” A son, not a hired servant.", "Luke 15:22");
    L(labels, [-7, 3.4, 1], "The fattened calf", "“Let us eat and celebrate. For this my son was dead, and is alive again; he was lost, and is found.”", "Luke 15:23–24");
    L(labels, [-14, 4.6, 4], "The older brother", "Angry, he refused to go in. “Son, you are always with me, and all that is mine is yours.”", "Luke 15:25–32", true);
    return { view: v3(0.7, 0.4, 1.1), target: v3(-2, 2, 0), zoom: 0.55 };
  },

  naaman({ scene, labels }) {
    ground(scene, 60, 0xb8ad7c, false);
    // Naaman, commander of Syria's army, dipped himself seven times in the Jordan, and his flesh was restored like a
    // little child's (2 Kings 5:1-14).
    const riv = mesh(scene, new THREE.PlaneGeometry(80, 10), MAT.water, 0, 0.05, 0, -Math.PI / 2, 0, 0.2); riv.userData.skipFit = true;
    for (let i = 0; i < 30; i++) { const s = grp(scene, -20 + i * 1.4, 0, (i % 2 ? 6 : -6) + Math.sin(i) * 0.6); s.userData.skipFit = true; rod(s, [0, 0, 0], [0, 2.4, 0], 0.04, MAT.leaf); }
    figure(scene, 0, 0, { robe: 0xf2e8dc, cloth: false, skin: 3, h: 4, y: -1.3, raise: true, face: 0.6 });
    for (let i = 0; i < 7; i++) { const r = tor(scene, 0.6 + i * 0.45, 0.025, mat(0xd8eef2, { rough: 0.1, opacity: 0.7 - i * 0.08 }), 0, 0.06, 0); void r; }
    const ch = grp(scene, 9, 0, -7, -0.6); rbox(ch, 3, 1.2, 2.4, 0, 1.4, 0, mat(0xa3302a, { rough: 0.7 }), 0.1); [-1.3, 1.3].forEach((z) => tor(ch, 1.2, 0.08, MAT.darkWood, 0, 1.2, z, 0, 0)); ch.userData.skipFit = true;
    for (let i = 0; i < 4; i++) figure(scene, 6 + i * 1.3, -4 - (i % 2), { robe: [0xa3302a, 0x8b6f4e, 0x6b7f8c, 0x5d7a5a][i], h: 4, face: Math.PI + 0.6, skipFit: true });
    const armor = mesh(scene, new THREE.SphereGeometry(0.4, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xb07040, { rough: 0.4, metal: 0.9 }), 5, 0.1, -2); void armor;
    L(labels, [0, 4, 0], "Seven times in the Jordan", "“Go and wash in the Jordan seven times, and your flesh shall be restored.” Naaman was furious: aren't the rivers of Damascus better? His servants persuaded him, and he was made clean.", "2 Kings 5:10–14");
    L(labels, [7, 4.6, -4.5], "Commander of the army of Syria", "A great man and a valiant soldier, but a leper. A captured Israelite girl in his house told his wife about the prophet in Samaria.", "2 Kings 5:1–3", true);
    L(labels, [-12, 2, 0], "Jesus remembered him", "“There were many lepers in Israel in the time of the prophet Elisha, and none of them was cleansed, but only Naaman the Syrian.”", "Luke 4:27", true);
    return { view: v3(0.7, 0.45, 1.1), target: v3(1, 1.5, -1) };
  },

  "widows-oil"({ scene, labels }) {
    ground(scene, 14, 0xb8a888, false);
    // Borrow vessels from all your neighbours, not too few; shut the door; pour into all these vessels. When the last was
    // full, the oil stopped (2 Kings 4:1-7).
    const fl = mesh(scene, new THREE.CircleGeometry(6, 48), mat(0x8a7a62, { rough: 1, tex: "rock", rep: 3 }), 0, 0.01, 0, -Math.PI / 2); fl.userData.noShadow = true;
    const kinds = [MAT.clay, MAT.clayLight, MAT.clayDark, mat(0xd8cfbd, { rough: 0.6 })];
    for (let i = 0; i < 28; i++) { const a = i * 2.39996, r = 1.2 + Math.sqrt(i) * 0.6; const s = 0.6 + (i % 4) * 0.15; jar(scene, Math.cos(a) * r, Math.sin(a) * r, s, kinds[i % 4]); if (i < 22) { const top = mesh(scene, new THREE.CircleGeometry(0.13 * s, 16), MAT.oil, Math.cos(a) * r, 1.2 * s, Math.sin(a) * r, -Math.PI / 2); top.userData.noShadow = true; } }
    const small = vessel(scene, [[0, 0], [0.1, 0.01], [0.14, 0.12], [0.1, 0.22], [0.05, 0.28], [0.06, 0.32]], MAT.clay, 0, 0, 0); small.position.set(-0.3, 1.25, 0.6); small.rotation.z = 2.2;
    path(scene, [[-0.05, 1.28, 0.6], [0.05, 1.0, 0.6], [0.1, 0.7, 0.62]], 0.025, MAT.oil, 8);
    figure(scene, -1.0, 0.6, { robe: 0x3a3430, cloth: 0x2a2522, skin: 1, h: 4, reach: true, face: 0 });
    figure(scene, 1.6, -0.8, { robe: 0x8b6f4e, skin: 1, h: 3.2, face: Math.PI, reach: true }); figure(scene, 2.2, 1.0, { robe: 0x5d7a5a, skin: 1, h: 3.0, face: Math.PI });
    L(labels, [-1, 4.4, 0.6], "Only a jar of oil", "A prophet's widow, about to lose her two sons as slaves to a creditor, had nothing in the house but a jar of oil.", "2 Kings 4:1–2");
    L(labels, [2, 2, 2], "Not too few", "“Then go in and shut the door behind yourself and your sons and pour into all these vessels.” When there wasn't another vessel, the oil stopped.", "2 Kings 4:3–6");
    L(labels, [0, 3, -3], "Sell the oil and pay your debts", "“…and you and your sons can live on the rest.”", "2 Kings 4:7", true);
    return { view: v3(0.6, 0.7, 1.1) };
  },

  "flour-and-oil"({ scene, labels }) {
    ground(scene, 14, 0xb8a888, false);
    // At Zarephath: “The jar of flour shall not be spent, and the jug of oil shall not be empty, until the day that the LORD
    // sends rain” (1 Kings 17:8-16).
    vessel(scene, [[0, 0], [0.35, 0.02], [0.5, 0.5], [0.45, 1.2], [0.3, 1.45], [0.32, 1.5]], MAT.clayLight, -0.6, 0, 0);
    mesh(scene, new THREE.CircleGeometry(0.29, 20), mat(0xf2ead8, { rough: 1 }), -0.6, 1.45, 0, -Math.PI / 2);
    vessel(scene, [[0, 0], [0.15, 0.01], [0.2, 0.2], [0.14, 0.4], [0.06, 0.5], [0.07, 0.55]], MAT.clay, 0.4, 0, 0.3);
    for (let i = 0; i < 3; i++) mesh(scene, new THREE.CylinderGeometry(0.25, 0.25, 0.04, 20), MAT.bread, 0.3, 0.6 + i * 0.045, -0.9);
    rbox(scene, 1.4, 0.6, 0.9, 0.3, 0, -0.9, MAT.limestone, 0.05);
    for (let i = 0; i < 6; i++) rod(scene, [1.4 + (i % 3) * 0.1, 0.05, 0.8 + i * 0.05], [2.4, 0.06, 1.0 - i * 0.05], 0.03, MAT.bark);
    figure(scene, -1.6, -0.4, { robe: 0x3a3430, cloth: 0x2a2522, skin: 1, h: 4, reach: true, face: 0.3 });
    figure(scene, 1.8, -1.6, { robe: 0x6b5236, cloth: 0x8a7656, beard: true, h: 4, face: Math.PI * 0.85 });
    figure(scene, -2.4, 0.8, { robe: 0x8b6f4e, skin: 1, h: 2.8, face: 0.2 });
    L(labels, [-0.6, 2, 0], "The jar of flour", "She had only a handful of flour and a little oil, and was gathering sticks to bake a last meal for herself and her son.", "1 Kings 17:12");
    L(labels, [0.4, 0.9, 0.3], "The jug of oil", "“For thus says the LORD… The jar of flour shall not be spent, and the jug of oil shall not be empty.” And she and he and her household ate for many days.", "1 Kings 17:14–16");
    L(labels, [1.6, 0.4, 1], "Gathering sticks", "Elijah met her at the town gate gathering sticks, and asked for a little water and a morsel of bread.", "1 Kings 17:10–11", true);
    return { view: v3(0.5, 0.6, 1.1) };
  },

  "prophets-room"({ scene, labels }) {
    ground(scene, 16, C.sand, false);
    // “Let us make a small room on the roof with walls and put there for him a bed, a table, a chair, and a lamp” (2 Kings 4:8-10).
    const h = house(scene, 0, 0, 10, 8, 6); void h;
    const room = grp(scene, -1.5, 6, -1);
    [[0, -1.8, 5, 0.25], [2.5, 0, 0.25, 3.8], [-2.5, 0, 0.25, 3.8]].forEach(([x, z, w, d]) => rbox(room, w, 4, d, x, 0.5, z, mat(0xffffff, { tex: "plaster", rough: 1 }), 0.05));
    rbox(room, 2.6, 0.5, 1.2, -1, 0.5, -0.9, MAT.wood, 0.05); rbox(room, 2.4, 0.25, 1.1, -1, 1.0, -0.9, MAT.wool, 0.08);
    rbox(room, 1.2, 1.3, 0.8, 1.4, 0.5, -1.0, MAT.wood, 0.04); rbox(room, 0.6, 0.9, 0.6, 1.4, 0.5, 0.0, MAT.darkWood, 0.04);
    const lamp = vessel(room, [[0, 0], [0.12, 0.005], [0.16, 0.04], [0.12, 0.08]], MAT.clay, 1.4, 1.82, -1.0); void lamp; flame(room, 1.55, 1.85, -1.0, 0.5);
    figure(scene, 3, 6.5, { robe: 0x7a5a6a, cloth: 0x5a3a4a, skin: 1, h: 4, y: 0, face: Math.PI * 1.2 });
    L(labels, [-1.5, 11, -1], "A small room on the roof", "A wealthy woman of Shunem said to her husband: “I know that this is a holy man of God… let us make a small room on the roof with walls.”", "2 Kings 4:8–10");
    L(labels, [-2.5, 8.6, -1.9], "A bed, a table, a chair and a lamp", "Everything a guest needs. Elisha promised her a son; years later he raised the boy to life in this room.", "2 Kings 4:10–37");
    return { view: v3(0.6, 0.65, 1.1), target: v3(-1, 6, 0) };
  },

  "broom-tree"({ scene, labels }) {
    ground(scene, 40, 0xc8b48a, false);
    // Elijah, fleeing Jezebel, lay down under a broom tree in the wilderness; an angel touched him: a cake baked on hot
    // stones and a jar of water at his head (1 Kings 19:3-8).
    const t = grp(scene, 0, 0, -1);
    for (let i = 0; i < 14; i++) { const a = i * 0.45; path(t, [[0, 0, 0], [Math.cos(a) * 0.6, 1.4, Math.sin(a) * 0.6], [Math.cos(a) * 2.2, 3.4 + (i % 3) * 0.4, Math.sin(a) * 2.2]], 0.07, MAT.bark, 10);
      for (let k = 0; k < 6; k++) rod(t, [Math.cos(a) * 2.2, 3.4 + (i % 3) * 0.4, Math.sin(a) * 2.2], [Math.cos(a + k * 0.2) * 2.8, 2.6 + k * 0.2, Math.sin(a + k * 0.2) * 2.8], 0.02, mat(0x8a9a5a, { rough: 0.9 })); }
    for (let i = 0; i < 40; i++) sph(t, 0.05, mat(0xf2f0ea, { rough: 0.8 }), Math.cos(i * 2.4) * 2.4, 3 + (i % 5) * 0.2, Math.sin(i * 2.4) * 2.4);
    const lie = grp(scene, 0.5, 0, 0.6, 0.4); mesh(lie, new THREE.CapsuleGeometry(0.42, 2.2, 8, 16), mat(0x6b5236, { rough: 0.95, tex: "linen" }), 0.2, 0.45, 0, 0, 0, Math.PI / 2); sph(lie, 0.3, mat(0xa8714a, { rough: 0.7 }), -1.5, 0.5, 0);
    for (let i = 0; i < 5; i++) rock(scene, 0.18, -1.9 + (i % 3) * 0.3, 0.1, 1.6 + Math.floor(i / 3) * 0.3, 0x5a5652);
    mesh(scene, new THREE.CylinderGeometry(0.26, 0.27, 0.06, 20), MAT.bread, -1.6, 0.28, 1.7);
    jar(scene, -2.4, 0.9, 0.7);
    const ang = figure(scene, 1.8, 2.4, { robe: 0xffffff, cloth: 0xffffff, band: 0xf2e2b0, h: 4, face: Math.PI * 1.1, reach: true }); void ang;
    const glow = mesh(scene, new THREE.SphereGeometry(1.2, 20, 14), GLOW(0xfff6d8, 0.3), 1.8, 3.6, 2.4); glow.userData.skipFit = true;
    L(labels, [0, 5, -1], "Under a broom tree", "“It is enough; now, O LORD, take away my life.” He lay down and slept.", "1 Kings 19:4–5");
    L(labels, [1.8, 4.6, 2.4], "“Arise and eat”", "An angel touched him. At his head was a cake baked on hot stones and a jar of water. Twice; “for the journey is too great for you.”", "1 Kings 19:5–7");
    L(labels, [-1.6, 0.8, 1.7], "Forty days and forty nights", "In the strength of that food he went to Horeb, the mount of God, and heard the low whisper.", "1 Kings 19:8–12", true);
    return { view: v3(0.7, 0.5, 1.1), target: v3(0, 1.5, 0.8) };
  },

  gethsemane({ scene, labels }) {
    ground(scene, 50, 0x8a8a5a, false);
    // A garden of olive trees on the Mount of Olives; Jesus went a stone's throw beyond the disciples and prayed
    // (Matthew 26:36-46; Luke 22:39-46). The name means “oil press”.
    for (let i = 0; i < 9; i++) olive(scene, -14 + (i % 3) * 9 + Math.sin(i) * 2, -10 + Math.floor(i / 3) * 9, 6 + (i % 3), i < 3);
    rock(scene, 1.2, 0, 0.5, 0, 0xb0a48c, 1.4, 0.6, 1.1);
    figure(scene, -0.4, 0.9, { robe: 0xe9e1cf, cloth: 0xf2ede0, beard: true, h: 4, sit: true, raise: true, face: -Math.PI / 2 + 0.2 });
    [[6, 6, 0.6], [7.5, 7, 0.2], [6.5, 8.5, 1]].forEach(([x, z, f]) => { const g = grp(scene, x, 0, z, f); mesh(g, new THREE.CapsuleGeometry(0.42, 2.2, 8, 16), mat([0x6b7f8c, 0x8b6f4e, 0x5d7a5a][Math.round(f * 2) % 3], { rough: 0.95, tex: "linen" }), 0.2, 0.45, 0, 0, 0, Math.PI / 2); sph(g, 0.3, mat(0xa8714a), -1.5, 0.5, 0); });
    const moon = mesh(scene, new THREE.SphereGeometry(3, 24, 16), new THREE.MeshBasicMaterial({ color: 0xf6f0d8 }), -30, 40, -60); moon.userData.skipFit = true;
    for (let i = 0; i < 5; i++) { const tch = grp(scene, -18 + i * 1.2, 0, 14 - i * 0.6); tch.userData.skipFit = true; rod(tch, [0, 0, 0], [0, 4.5, 0], 0.05, MAT.darkWood); flame(tch, 0, 4.5, 0, 1.2); }
    L(labels, [-0.4, 4, 0.9], "“Not my will, but yours”", "“Father, if you are willing, remove this cup from me. Nevertheless, not my will, but yours, be done.” His sweat became like great drops of blood.", "Luke 22:42–44");
    L(labels, [7, 2, 7], "Asleep", "“Could you not watch with me one hour? Watch and pray that you may not enter into temptation. The spirit indeed is willing, but the flesh is weak.”", "Matthew 26:40–41");
    L(labels, [-16, 6, 13], "Torches and lanterns", "Judas came with a band of soldiers and officers, with lanterns and torches and weapons.", "John 18:3", true);
    L(labels, [-8, 9, -6], "The oil press", "Gethsemane means oil press: an olive grove on the slope across the Kidron from the temple.", "John 18:1", true, "/bible/3d/olive-press");
    return { view: v3(0.6, 0.45, 1.1), target: v3(1, 1.6, 2), zoom: 0.45 };
  },

  "lots-wife"({ scene, labels }) {
    ground(scene, 80, 0xd8d0c0, false);
    // The LORD rained sulphur and fire on Sodom and Gomorrah; Lot's wife looked back and became a pillar of salt
    // (Genesis 19:15-26; Luke 17:32). The Dead Sea shore has many salt formations.
    const sea = mesh(scene, new THREE.PlaneGeometry(120, 40), mat(0x5a8a96, { rough: 0.1, metal: 0.2 }), 0, 0.03, -36, -Math.PI / 2); sea.userData.skipFit = true;
    const pil = vessel(scene, [[0, 0], [0.7, 0], [0.62, 0.8], [0.5, 1.8], [0.44, 2.6], [0.5, 2.95], [0.3, 3.2], [0.32, 3.5], [0.18, 3.75], [0, 3.78]], mat(0xf2f0ea, { rough: 0.6, tex: "rock" }), 0, 0, 0); void pil;
    for (let i = 0; i < 10; i++) { const s = rock(scene, 0.7, -14 + i * 3, 0.4, -14 + Math.sin(i) * 2, 0xe8e4dc, 1, 1.8 + (i % 3), 1); s.userData.skipFit = true; }
    for (let i = 0; i < 12; i++) { const f = grp(scene, -10 + i * 2.2, 0, -26); f.userData.skipFit = true; cone(f, 1.2, 4 + (i % 3) * 2, GLOW(0xff7a2a, 0.75), 0, 2, 0); cone(f, 0.8, 3, GLOW(0xffc040, 0.8), 0.5, 1.5, 0.3); }
    const sky = mesh(scene, new THREE.SphereGeometry(6, 16, 10), GLOW(0x5a4a40, 0.6), 0, 18, -26); sky.scale.set(3, 0.8, 1); sky.userData.skipFit = true;
    for (let i = 0; i < 3; i++) figure(scene, 8 + i * 1.5, 8 + i * 0.6, { robe: [0x8b6f4e, 0x7a5a6a, 0x5d7a5a][i], beard: i === 0, h: 4 - i * 0.2, face: 0.8, skipFit: true });
    L(labels, [0, 4.4, 0], "A pillar of salt", "“But Lot's wife, behind him, looked back, and she became a pillar of salt.”", "Genesis 19:26");
    L(labels, [9.5, 4.6, 8.6], "“Remember Lot's wife”", "Jesus' warning about clinging to the life left behind: “Whoever seeks to preserve his life will lose it.”", "Luke 17:32–33");
    L(labels, [0, 10, -26], "Sulphur and fire", "On Sodom and Gomorrah, in the valley by the Dead Sea (the Salt Sea).", "Genesis 19:24–28", true);
    return { view: v3(0.7, 0.4, 1.1), target: v3(3, 2.4, 2), zoom: 1.2 };
  },

  sackcloth({ scene, labels }) {
    ground(scene, 30, C.stone);
    // The king of Nineveh rose from his throne, covered himself with sackcloth and sat in ashes (Jonah 3:5-9); Mordecai
    // put on sackcloth and ashes (Esther 4:1-3). Sackcloth was coarse goat or camel hair.
    const th = grp(scene, 3, 0, -3); rbox(th, 2.6, 1.2, 2.2, 0, 0, 0, GOLD, 0.1); rbox(th, 2.6, 3.4, 0.4, 0, 0, -1, GOLD, 0.1);
    const robe = mesh(scene, new THREE.PlaneGeometry(1.6, 2.4, 6, 6), mat(0x5b2c6f, { rough: 0.9, tex: "linen", side: THREE.DoubleSide }), 3, 1.25, -2.2, -Math.PI / 2 + 0.2, 0, 0.4); void robe;
    const ash = mesh(scene, new THREE.CircleGeometry(1.4, 24), mat(0x6a6662, { rough: 1 }), 0, 0.02, 0, -Math.PI / 2); ash.userData.noShadow = true;
    for (let i = 0; i < 20; i++) sph(scene, 0.12, mat(0x8a8682, { rough: 1 }), Math.cos(i * 2.4) * (i % 6) * 0.2, 0.04, Math.sin(i * 2.4) * (i % 6) * 0.2, 1, 0.3, 1);
    const k = figure(scene, 0, 0, { robe: 0x3a3430, cloth: false, beard: true, h: 4, sit: true, face: 0.6 });
    k.children[0].material = mat(0x4a423c, { rough: 1, tex: "linen", rep: 6 });
    const cr = vessel(scene, [[0.3, 0], [0.32, 0.22]], GOLD, 1.8, 0.02, 0.8); cr.rotation.z = 1.2;
    beast(scene, -3, 2, { color: 0x7a5038, horns: true, s: 1, face: 0.4 }); rbox(scene, 1.6, 0.1, 1.2, -2.6, 2.3, 2, mat(0x4a423c, { rough: 1, tex: "linen", rep: 3 }), 0.05);
    L(labels, [0, 3.6, 0], "Sackcloth and ashes", "“The word reached the king of Nineveh, and he arose from his throne, removed his robe, covered himself with sackcloth, and sat in ashes.” Even the animals were covered with sackcloth.", "Jonah 3:6–8");
    L(labels, [3, 4.4, -3], "The empty throne", "“Who knows? God may turn and relent.” And God saw how they turned from their evil way, and relented.", "Jonah 3:9–10");
    L(labels, [-1, 1.2, 1.5], "Mourning and repentance", "Mordecai tore his clothes and put on sackcloth and ashes; Job repented “in dust and ashes”.", "Esther 4:1; Job 42:6", true);
    return { view: v3(0.6, 0.5, 1.1), target: v3(0.6, 1.4, -0.6) };
  },

  "red-stew"({ scene, labels }) {
    ground(scene, 14, C.sand, false);
    // Esau came in from the field exhausted and sold his birthright to Jacob for bread and lentil stew (Genesis 25:29-34; Hebrews 12:16).
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; rock(scene, 0.2, Math.cos(a) * 0.55, 0.12, Math.sin(a) * 0.55, 0x7a7468); }
    sph(scene, 0.3, MAT.ember, 0, 0.1, 0, 1, 0.3, 1);
    const pot = vessel(scene, [[0, 0], [0.35, 0.05], [0.45, 0.3], [0.42, 0.5], [0.38, 0.55]], MAT.clayDark, 0, 0.25, 0); void pot;
    mesh(scene, new THREE.CircleGeometry(0.38, 24), mat(0x9a3a1a, { rough: 0.5 }), 0, 0.72, 0, -Math.PI / 2);
    const bowl = vessel(scene, [[0, 0], [0.12, 0.01], [0.2, 0.08], [0.22, 0.1]], MAT.clay, 1.1, 0, 0.5); void bowl; mesh(scene, new THREE.CircleGeometry(0.18, 16), mat(0x9a3a1a, { rough: 0.5 }), 1.1, 0.08, 0.5, -Math.PI / 2);
    mesh(scene, new THREE.CylinderGeometry(0.25, 0.25, 0.05, 20), MAT.bread, 1.6, 0.03, 0.1);
    figure(scene, -0.8, -1.2, { robe: 0xe9e1cf, cloth: 0x8b6f4e, skin: 0, h: 4, sit: true, face: Math.PI / 2 - 0.4, reach: true });
    const esau = figure(scene, 1.8, -1.8, { robe: 0x7a5038, cloth: false, beard: true, skin: 2, h: 4.1, face: Math.PI + 0.6, reach: true }); void esau;
    const bow = grp(scene, 2.8, 1.2, -1.2, 0.4); path(bow, [[0, -1.2, 0], [-0.25, 0, 0], [0, 1.2, 0]], 0.035, mat(0x5a3a22, { rough: 0.6 }), 20);
    L(labels, [0, 1.3, 0], "Red stew", "“Let me eat some of that red stew, for I am exhausted!” (That is why he was called Edom, “red”.) It was lentils.", "Genesis 25:30, 34");
    L(labels, [1.8, 4.6, -1.8], "Esau sold his birthright", "“I am about to die; of what use is a birthright to me?” “Thus Esau despised his birthright.”", "Genesis 25:31–34; Hebrews 12:16–17");
    L(labels, [-0.8, 3.4, -1.2], "Jacob", "A quiet man, dwelling in tents. “Sell me your birthright now.”", "Genesis 25:27–31", true);
    return { view: v3(0.7, 0.55, 1.1), target: v3(0.6, 1, 0.4) };
  },

  "basket-over-the-wall"({ scene, labels }) {
    ground(scene, 40, C.sand, false);
    // At Damascus the disciples let Saul down through an opening in the wall, lowering him in a basket (Acts 9:23-25; 2 Corinthians 11:32-33).
    const st = mat(0xffffff, { tex: "stone", rough: 1, rep: 3 });
    rbox(scene, 30, 16, 3, 0, 0, -1.5, st, 0.1);
    for (let i = 0; i < 10; i++) rbox(scene, 1.6, 1.4, 3.2, -13.5 + i * 3, 16, -1.5, st, 0.05);
    house(scene, 3, -6, 8, 6, 6).position.y = 16;
    const win = mesh(scene, new THREE.PlaneGeometry(1.6, 1.8), MAT.black, 0, 12, 0.02); void win;
    const b = grp(scene, 0, 5, 0.9); vessel(b, [[0, 0], [0.7, 0.05], [0.9, 0.6], [0.95, 1.0]], mat(0xb89a6a, { rough: 1, tex: "linen", rep: 3 })); figure(b, 0, 0, { robe: 0x6b7f8c, beard: true, h: 3.6, sit: true, y: 0.1, face: Math.PI / 2 });
    [[-0.7, 0], [0.7, 0], [0, 0.7], [0, -0.7]].forEach(([x, z]) => rod(scene, [x, 6, 0.9 + z], [0, 12.4, 0.2], 0.02, MAT.rope));
    [[-0.5], [0.5]].forEach(([x], i) => figure(scene, x, -0.2, { robe: [0x8b6f4e, 0x5d7a5a][i], h: 3.6, y: 10.2, reach: true, face: Math.PI / 2, skipFit: true }));
    const moon = mesh(scene, new THREE.SphereGeometry(1.6, 20, 14), new THREE.MeshBasicMaterial({ color: 0xf6f0d8 }), -14, 26, -10); moon.userData.skipFit = true;
    for (let i = 0; i < 3; i++) { figure(scene, -9 + i * 2, 6, { robe: 0x5a4a3a, h: 4, face: Math.PI, skipFit: true }); }
    L(labels, [0, 9, 1.2], "Let down in a basket", "“The disciples took him by night and let him down through an opening in the wall, lowering him in a basket.”", "Acts 9:25");
    L(labels, [-7, 4.6, 6], "Watching the gates", "They were watching the gates day and night to kill him. Paul later counted this escape among his weaknesses.", "Acts 9:24; 2 Corinthians 11:30–33", true);
    return { view: v3(0.8, 0.3, 1.1), target: v3(0, 8, 0.5) };
  },

  lazarus({ scene, labels }) {
    ground(scene, 40, 0xb8ad7c, false);
    // “Lazarus, come out.” The man who had died came out, his hands and feet bound with linen strips and his face
    // wrapped with a cloth. “Unbind him, and let him go” (John 11:38-44).
    const cliff = rock(scene, 7, 0, 3, -7, 0xc4b89f, 1.5, 0.9, 0.8); cliff.userData.skipFit = true;
    rbox(scene, 6, 5.5, 0.6, 0, 0, -1.6, mat(0xc4b89f, { tex: "rock", rough: 1 }), 0.3);
    mesh(scene, new THREE.PlaneGeometry(1.6, 2.6), MAT.black, 0, 1.3, -1.28);
    const stn = mesh(scene, new THREE.CylinderGeometry(1.4, 1.4, 0.5, 32), mat(0xb9ad96, { tex: "rock", rough: 1 }), 2.6, 1.4, -1.0, Math.PI / 2); void stn;
    const laz = grp(scene, 0, 0, 0); const wrap = mat(0xf2ede0, { rough: 1, tex: "linen", rep: 4 });
    vessel(laz, [[0, 0], [0.4, 0], [0.42, 0.6], [0.38, 1.8], [0.42, 2.6], [0.3, 2.9], [0, 2.95]], wrap);
    for (let i = 0; i < 12; i++) tor(laz, 0.4 - Math.abs(i - 6) * 0.004, 0.025, mat(0xe4dccb, { rough: 1 }), 0, 0.2 + i * 0.23, 0).rotation.z = 0.15 * (i % 2 ? 1 : -1);
    sph(laz, 0.3, wrap, 0, 3.4, 0, 0.92, 1.1, 0.95);
    figure(scene, 2.5, 4.5, { robe: 0xe9e1cf, cloth: 0xf2ede0, beard: true, h: 4, raise: true, face: Math.PI * 1.2 });
    [[4.5, 3.5, 0x7a5a6a], [5.5, 4.8, 0x5d7a5a]].forEach(([x, z, c]) => figure(scene, x, z, { robe: c, cloth: 0x5a3a4a, skin: 1, h: 3.9, face: Math.PI * 1.2 }));
    for (let i = 0; i < 6; i++) figure(scene, -4 + (i % 3) * 1.4, 4 + Math.floor(i / 3) * 1.4, { robe: ROBES[i], h: 4, face: -Math.PI * 0.4, skipFit: true });
    L(labels, [0, 4.2, 0], "“Lazarus, come out”", "“The man who had died came out, his hands and feet bound with linen strips, and his face wrapped with a cloth. Jesus said to them, ‘Unbind him, and let him go.’”", "John 11:43–44");
    L(labels, [2.5, 4.6, 4.5], "“I am the resurrection and the life”", "“Whoever believes in me, though he die, yet shall he live.” Then: “Jesus wept.”", "John 11:25, 35");
    L(labels, [2.6, 3.2, -1], "Take away the stone", "“Lord, by this time there will be an odour, for he has been dead four days.”", "John 11:39", true);
    L(labels, [5, 4.4, 4.2], "Martha and Mary", "Both said the same thing: “Lord, if you had been here, my brother would not have died.”", "John 11:21, 32", true);
    return { view: v3(0.6, 0.35, 1.1), target: v3(1.5, 2, 1.5) };
  },

  "peter-freed"({ scene, labels }) {
    ground(scene, 20, 0x6a6052, false);
    // Peter asleep between two soldiers, bound with two chains; an angel, a light in the cell, the chains fell off, and the
    // iron gate opened of its own accord (Acts 12:6-10).
    const rk = mat(0x5a5248, { tex: "stone", rough: 1, rep: 2 });
    rbox(scene, 12, 8, 0.8, 0, 0, -4, rk, 0.1); rbox(scene, 0.8, 8, 8, -6, 0, 0, rk, 0.1);
    figure(scene, 0, -1, { robe: 0x6b7f8c, beard: true, h: 4, face: Math.PI / 2, reach: true });
    [[-1.4, -1.6], [1.4, -1.6]].forEach(([x, z]) => { figure(scene, x, z, { robe: 0xa3302a, cloth: false, skin: 3, sit: true, h: 4, face: Math.PI / 2 }); });
    for (let i = 0; i < 10; i++) tor(scene, 0.12, 0.035, MAT.darkIron, -0.4 + i * 0.1 - (i > 4 ? 0.3 : 0), 0.05, 0.2 + (i % 2) * 0.05, Math.PI / 2, i * 0.8);
    const ang = figure(scene, 1.8, 1.2, { robe: 0xffffff, cloth: 0xffffff, band: 0xf2e2b0, h: 4.2, raise: true, face: Math.PI * 1.1 }); void ang;
    const glow = mesh(scene, new THREE.SphereGeometry(1.4, 20, 14), GLOW(0xfff6d8, 0.3), 1.8, 4.2, 1.2); glow.userData.skipFit = true;
    const lt = new THREE.PointLight(0xfff1c8, 6, 14, 2); lt.position.set(1.8, 3.5, 1.2); scene.add(lt);
    const gate = grp(scene, 5, 0, 3, -0.8); for (let i = 0; i < 7; i++) rod(gate, [i * 0.35, 0, 0], [i * 0.35, 5, 0], 0.05, MAT.darkIron); rod(gate, [0, 4.6, 0], [2.1, 4.6, 0], 0.05, MAT.darkIron); rod(gate, [0, 1, 0], [2.1, 1, 0], 0.05, MAT.darkIron);
    L(labels, [0, 4.4, -1], "Asleep between two soldiers", "The night before Herod planned to bring him out, Peter was sleeping, bound with two chains, with sentries guarding the door. And the church was praying earnestly for him.", "Acts 12:5–6");
    L(labels, [1.8, 5.2, 1.2], "“Get up quickly”", "An angel of the Lord appeared and a light shone in the cell. The chains fell off his hands. “Dress yourself… wrap your cloak around you and follow me.”", "Acts 12:7–9");
    L(labels, [6, 5.6, 2], "The iron gate opened by itself", "Peter went to Mary's house, where many were praying; Rhoda was so glad she forgot to open the door.", "Acts 12:10–16", true);
    return { view: v3(0.6, 0.5, 1.1), target: v3(0.8, 2, 0) };
  },

  "viper-on-malta"({ scene, labels }) {
    ground(scene, 30, C.sand, false);
    const sea = mesh(scene, new THREE.PlaneGeometry(80, 30), MAT.water, 0, 0.04, -24, -Math.PI / 2); sea.userData.skipFit = true;
    // Shipwrecked on Malta, in the rain and cold, Paul gathered a bundle of sticks for the fire, and a viper fastened on his
    // hand; he shook it into the fire and suffered no harm (Acts 28:1-6).
    for (let i = 0; i < 9; i++) rod(scene, [-0.9 + (i % 3) * 0.1, 0.1 + i * 0.04, -0.4 + i * 0.1], [0.9, 0.12 + i * 0.04, 0.4 - i * 0.08], 0.06, MAT.bark);
    [[0, 0], [0.4, 0.3], [-0.3, -0.3]].forEach(([a, b], i) => cone(scene, 0.5, 1.4 + i * 0.3, MAT.fire, a, 0.9, b));
    const lt = new THREE.PointLight(0xffa040, 3, 10, 2); lt.position.set(0, 1.5, 0); scene.add(lt);
    figure(scene, 1.6, 0.4, { robe: 0x6b7f8c, beard: true, h: 4, reach: true, face: Math.PI });
    const sn = path(scene, [[0.85, 1.3, 0.4], [0.6, 1.0, 0.5], [0.35, 0.9, 0.3], [0.15, 1.1, 0.2]], 0.05, mat(0x5a4a2a, { rough: 0.5 }), 20); void sn;
    for (let i = 0; i < 6; i++) figure(scene, -2.6 - Math.abs(Math.cos(i)) * 2, -0.6 - Math.abs(Math.sin(i)) * 2.4, { robe: ROBES[i], h: 4, face: Math.atan2(-(0.6 + Math.sin(i) * 2), 2.6 - Math.cos(i) * 2), skipFit: true });
    const wreck = grp(scene, -14, 0, -18, 0.6); wreck.userData.skipFit = true; mesh(wreck, new THREE.SphereGeometry(5, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), MAT.wood, 0, 4, 0).scale.set(3, 1, 1); wreck.rotation.z = 0.4;
    L(labels, [0.5, 1.8, 0.3], "A viper on his hand", "Driven out by the heat, it fastened on his hand. “No doubt this man is a murderer… Justice has not allowed him to live.” He shook it off into the fire and suffered no harm.", "Acts 28:3–5");
    L(labels, [-3, 4.6, 1], "Unusual kindness", "The islanders kindled a fire and welcomed everyone, because it had begun to rain and was cold. When nothing happened to Paul, they changed their minds and said he was a god.", "Acts 28:2, 6", true);
    L(labels, [-14, 8, -18], "The wreck", "Everyone, 276 of them, came safely to land.", "Acts 27:44", true, "/bible/3d/pauls-ship");
    return { view: v3(0.6, 0.45, 1.1), target: v3(0.5, 1.6, 0.3) };
  },

  transfiguration({ scene, labels }) {
    ground(scene, 60, 0x9aa36b, false);
    // On a high mountain Jesus was transfigured: his face shone like the sun, his clothes became white as light; Moses
    // and Elijah talked with him; Peter offered to make three tents (Matthew 17:1-8).
    const m = hill(scene, 20, 0, -6, 8, 0x8a9a5a); m.userData.skipFit = true;
    const top = 8;
    figure(scene, 0, -6, { robe: 0xffffff, cloth: 0xffffff, band: 0xfff6d8, beard: true, h: 4.2, y: top, face: Math.PI / 2 });
    const glow = mesh(scene, new THREE.SphereGeometry(3, 24, 16), GLOW(0xfff6d8, 0.6), 0, top + 2.4, -6); glow.userData.skipFit = true;
    const lt = new THREE.PointLight(0xfff6d8, 8, 20, 1.5); lt.position.set(0, top + 3, -5); scene.add(lt);
    figure(scene, -3, -6.5, { robe: 0x7a5a3e, cloth: 0x8b6f4e, beard: true, h: 4, y: top - 0.2, face: 0.3 });
    figure(scene, 3, -6.5, { robe: 0x6b5236, cloth: 0x8a7656, beard: true, h: 4, y: top - 0.2, face: Math.PI - 0.3 });
    [[-2, -1.6], [0, -1.2], [2, -1.6]].forEach(([x, z], i) => figure(scene, x, z, { robe: [0x6b7f8c, 0x8b6f4e, 0x5d7a5a][i], beard: i !== 2, h: 4, y: top - 1.1, sit: true, face: -Math.PI / 2 }));
    [[-4.5, -1], [-6, -2.4], [-5.2, 0.6]].forEach(([x, z]) => { const t = mesh(scene, new THREE.ConeGeometry(1.0, 1.6, 4), mat(0x8a7a5a, { rough: 1, tex: "linen" }), x, top - 0.6 + 0.4, z, 0, Math.PI / 4, 0); t.material.opacity = 0.6; t.material.transparent = true; });
    const cl = grp(scene, 0, top + 7, -6); for (let i = 0; i < 6; i++) sph(cl, 2.5, GLOW(0xffffff, 0.45), Math.cos(i) * 3, Math.sin(i * 2) * 0.6, Math.sin(i) * 2); cl.userData.skipFit = true;
    L(labels, [0, top + 5.6, -6], "Transfigured", "“His face shone like the sun, and his clothes became white as light.”", "Matthew 17:2");
    L(labels, [-3, top + 4.4, -6.5], "Moses and Elijah", "The Law and the Prophets, talking with him about his departure he was about to accomplish at Jerusalem.", "Matthew 17:3; Luke 9:30–31");
    L(labels, [-5.2, top + 1.6, -1], "Three tents", "“Lord, it is good that we are here. If you wish, I will make three tents here.” He didn't know what to say, for they were terrified.", "Matthew 17:4; Mark 9:5–6", true);
    L(labels, [0, top + 10, -6], "A bright cloud", "“This is my beloved Son, with whom I am well pleased; listen to him.”", "Matthew 17:5");
    return { view: v3(0.3, 0.3, 1.1), target: v3(0, top + 2.4, -3) };
  },

  "walking-on-water"({ scene, labels }) {
    const sea = mesh(scene, new THREE.PlaneGeometry(200, 200, 60, 60), mat(0x2f5f72, { rough: 0.15, metal: 0.1 }), 0, 0, 0, -Math.PI / 2); sea.userData.skipFit = true; sea.userData.noShadow = true;
    const p = sea.geometry.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 0.4) * 0.35 + Math.cos(p.getY(i) * 0.3 + p.getX(i) * 0.2) * 0.3); sea.geometry.computeVertexNormals();
    // In the fourth watch of the night Jesus came walking on the sea; Peter got out of the boat and walked on the water,
    // then, seeing the wind, began to sink (Matthew 14:22-33).
    const b = grp(scene, -6, -0.4, -2, 0.4); const hull = mesh(b, new THREE.SphereGeometry(1, 24, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), MAT.wood, 0, 1.2, 0); hull.scale.set(9, 1.2, 2.4);
    rod(b, [0, 1.2, 0], [0, 9, 0], 0.12, MAT.darkWood); b.rotation.z = 0.12;
    for (let i = 0; i < 5; i++) figure(b, -5 + i * 2, (i % 2) * 0.8 - 0.4, { robe: ROBES[i], beard: i % 2 === 0, h: 3.8, y: 1.2, face: -0.4, raise: i === 2 });
    figure(scene, 4, 1, { robe: 0xe9e1cf, cloth: 0xf2ede0, beard: true, h: 4, y: 0.1, reach: true, face: Math.PI - 0.3 });
    figure(scene, 1.6, 0.4, { robe: 0x6b7f8c, beard: true, h: 4, y: -1.1, raise: true, face: 0.2 });
    for (let i = 0; i < 4; i++) tor(scene, 0.6 + i * 0.5, 0.03, mat(0xeaf4f6, { rough: 0.3, opacity: 0.6 }), 1.6, 0.25, 0.4);
    const moon = mesh(scene, new THREE.SphereGeometry(2, 20, 14), new THREE.MeshBasicMaterial({ color: 0xf6f0d8 }), 20, 30, -50); moon.userData.skipFit = true;
    L(labels, [4, 4.6, 1], "“Take heart; it is I. Do not be afraid”", "In the fourth watch of the night (3–6 a.m.) he came to them, walking on the sea. They thought it was a ghost.", "Matthew 14:25–27");
    L(labels, [1.6, 3.6, 0.4], "Peter began to sink", "“Lord, save me.” Jesus immediately reached out his hand and took hold of him: “O you of little faith, why did you doubt?”", "Matthew 14:28–31");
    L(labels, [-6, 6, -2], "“Truly you are the Son of God”", "When they got into the boat, the wind ceased, and those in the boat worshipped him.", "Matthew 14:32–33", true);
    return { view: v3(0.6, 0.35, 1.1), target: v3(0, 2, 0), zoom: 0.55 };
  },
};
