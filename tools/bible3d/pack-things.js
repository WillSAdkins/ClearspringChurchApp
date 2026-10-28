/* More objects: temple furnishings at full size, signs the prophets acted out, measures, and
   things from Acts. 1 unit = 1 cubit (about 45 cm). */
import {
  scatter, THREE, MAT, C, GOLD, BRONZE, SILVER, IRON, mat, mesh, grp, sph, cone, tor, rod, path, vessel, slab, rbox, box, cyl,
  textPlane, textTex, scroll, scale, L, plinth, ground, figure, beast, flame, rock, hill, v3, ref, bush, olive, palm, house, ROBES,
} from "./kit.js";

export const MODELS = {
  "solomons-cherubim"({ scene, labels }) {
    ground(scene, 40, C.stone);
    // In the inner sanctuary, two cherubim of olivewood overlaid with gold, each 10 cubits high, each
    // wing 5 cubits; together their wings reached wall to wall, 20 cubits (1 Kings 6:23-28).
    const room = grp(scene, 0, 0, 0);
    [[0, -10.2, 20.4, 0.4], [-10.2, 0, 0.4, 20.4], [10.2, 0, 0.4, 20.4]].forEach(([x, z, w, d]) => rbox(room, w, 20, d, x, 0, z, GOLD, 0.05));
    rbox(room, 20, 0.2, 20, 0, 0, 0, GOLD, 0.02);
    [-5, 5].forEach((cx) => {
      const c = grp(scene, cx, 0, -2);
      vessel(c, [[0, 0], [1.1, 0], [1.0, 1.0], [0.8, 3.5], [0.9, 5.5], [0.7, 6.8], [0.3, 7.2], [0, 7.3]], GOLD);
      sph(c, 1.0, GOLD, 0, 8.2, 0.3, 0.9, 1.1, 0.9);
      [-1, 1].forEach((sd) => { const w = slab(c, [[0, 0], [1.4, 0.8], [3.0, 1.6], [4.6, 2.0], [5.0, 1.6], [4.0, 0.9], [2.4, 0.2], [0.8, -0.4]], 0.15, GOLD, sd * 0.4, 6.2, -0.4, 0, sd > 0 ? 0 : Math.PI, 0, 0.04); w.scale.set(1, 1, 1); });
    });
    const ark = grp(scene, 0, 0, -2); box(ark, 2.5, 1.5, 1.5, 0, 0, 0, GOLD); box(ark, 2.56, 0.12, 1.56, 0, 1.5, 0, GOLD);
    scale(scene, labels, 7.5, 6);
    L(labels, [0, 11, -2], "Ten cubits high", "Two cherubim of olivewood overlaid with gold, each 10 cubits (4.5 m) tall, standing over the ark in the Most Holy Place.", "1 Kings 6:23, 28");
    L(labels, [-9, 8.6, -2], "Wing to wall", "Each wing was 5 cubits: the outer wings touched the side walls, and the inner wings touched each other in the middle of the room.", "1 Kings 6:24–27");
    L(labels, [0, 2.6, -2], "The ark beneath", "Tiny by comparison: 2.5 cubits long.", "1 Kings 8:6–7", true, "/bible/3d/ark-of-the-covenant");
    return { view: v3(0.3, 0.45, 1.1), target: v3(0, 6, -2) };
  },

  "jachin-and-boaz"({ scene, labels }) {
    ground(scene, 40, C.stone);
    // Two bronze pillars 18 cubits high and 12 round, capitals of 5 cubits with lily-work, latticework and
    // two rows of 200 pomegranates; named Jachin (“he establishes”) and Boaz (“in him is strength”) (1 Kings 7:15-22).
    [[-5, "Jachin"], [5, "Boaz"]].forEach(([x]) => {
      lathe(scene, [[0, 0], [2.4, 0], [2.4, 0.6], [1.95, 0.9], [1.9, 18], [2.1, 18.3], [2.6, 19.2], [2.7, 20.5], [2.3, 22], [1.4, 22.8], [0, 23]], x, 0, 0, BRONZE, 48);
      for (let row = 0; row < 2; row++) for (let i = 0; i < 40; i++) { const a = i / 40 * Math.PI * 2 + row * 0.08; sph(scene, 0.2, BRONZE, x + Math.cos(a) * 2.7, 19.6 + row * 0.55, Math.sin(a) * 2.7); }
      const net = mesh(scene, new THREE.CylinderGeometry(2.66, 2.66, 1.3, 40, 4, true), new THREE.MeshStandardMaterial({ color: C.bronze, metalness: 0.9, roughness: 0.4, wireframe: true }), x, 21.1, 0); void net;
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; const pt = sph(scene, 0.45, BRONZE, x + Math.cos(a) * 1.9, 22.3, Math.sin(a) * 1.9, 0.6, 1.2, 0.6); pt.rotation.z = Math.cos(a) * 0.5; }
    });
    scale(scene, labels, 0, 3);
    L(labels, [-5, 25, 0], "Jachin", "On the right, the south side: “He establishes.”", "1 Kings 7:21");
    L(labels, [5, 25, 0], "Boaz", "On the left, the north side: “In him is strength.”", "1 Kings 7:21");
    L(labels, [0, 10, 3], "Eighteen cubits high", "About 8 m, hollow bronze four fingers thick, cast by Hiram of Tyre in the clay of the Jordan plain. The Babylonians broke them up and carried the bronze away.", "1 Kings 7:15–16, 46; Jeremiah 52:17, 21");
    L(labels, [-8, 21, 0], "Lily-work and pomegranates", "Capitals of 5 cubits, with latticework and two rows of a hundred pomegranates.", "1 Kings 7:17–20", true);
    return { view: v3(0.2, 0.3, 1.1), target: v3(0, 11, 0) };
  },

  "solomons-altar"({ scene, labels }) {
    ground(scene, 50, C.stone);
    // A bronze altar 20 cubits long, 20 wide and 10 high (2 Chronicles 4:1): four times the length of
    // the tabernacle's and sixteen times its floor.
    rbox(scene, 20, 10, 20, 0, 0, 0, BRONZE, 0.3);
    [[-9.4, -9.4], [9.4, -9.4], [-9.4, 9.4], [9.4, 9.4]].forEach(([x, z]) => cone(scene, 0.8, 1.6, BRONZE, x, 10.8, z));
    for (let i = 0; i < 10; i++) rod(scene, [-6, 10.4 + (i % 2) * 0.4, -6 + i * 1.3], [6, 10.4 + (i % 2) * 0.4, -6 + i * 1.3], 0.35, mat(0x5a3b22, { rough: 1 }));
    [[0, 0], [2, 2], [-2, -1.5], [1.5, -2.5], [-2, 2]].forEach(([x, z], i) => cone(scene, 1.4, 4 + i * 0.4, MAT.fire, x, 12.6, z));
    // Steps on the east side, and the tabernacle's altar beside it for comparison.
    for (let i = 0; i < 10; i++) rbox(scene, 6, 10 - i, 1.2, 0, 0, 10.6 + i * 1.2, mat(0xd8cfbd, { rough: 1, tex: "stone" }), 0.05);
    const small = grp(scene, -15, 0, 8); rbox(small, 5, 3, 5, 0, 0, 0, BRONZE, 0.1); [[-2.2, -2.2], [2.2, -2.2], [-2.2, 2.2], [2.2, 2.2]].forEach(([x, z]) => cone(small, 0.3, 0.6, BRONZE, x, 3.3, z));
    scale(scene, labels, -10, 14);
    L(labels, [0, 18, 0], "20 × 20 × 10 cubits", "About 9 m square and 4.5 m high, of bronze: at the dedication Solomon offered 22,000 oxen and 120,000 sheep, more than even this altar could hold.", "2 Chronicles 4:1; 1 Kings 8:63–64");
    L(labels, [-15, 4.4, 8], "The tabernacle's altar", "5 cubits square and 3 high, for comparison.", "Exodus 27:1", false, "/bible/3d/bronze-altar");
    L(labels, [0, 6, 16], "Steps up", "The law forbade steps to an altar; this one probably had a ramp or ledges.", "Exodus 20:26", true);
    return { view: v3(0.9, 0.55, 1.1), target: v3(-3, 6, 4) };
  },

  teraphim({ scene, labels }) {
    ground(scene, 14, C.sand, false);
    // Rachel stole her father's household gods and sat on them, hidden in the camel's saddle (Genesis 31:19, 34-35).
    // Small clay or wooden figurines, like those found across the region. Michal's teraphim was larger (1 Samuel 19:13).
    const sad = grp(scene, 0, 0, 0);
    rbox(sad, 3, 0.8, 2, 0, 0, 0, mat(0x9b2a2a, { rough: 1, tex: "linen" }), 0.3);
    [-1.3, 1.3].forEach((x) => rod(sad, [x, 0.8, -0.9], [x, 1.8, 0], 0.08, MAT.darkWood) && rod(sad, [x, 0.8, 0.9], [x, 1.8, 0], 0.08, MAT.darkWood));
    rbox(sad, 2.4, 0.3, 1.6, 0, 0.8, 0, MAT.wool, 0.15);
    const idols = grp(scene, 2.6, 0, 1.4);
    [[0, 0, 0.42], [0.35, 0.15, 0.36], [-0.3, 0.2, 0.3]].forEach(([x, z, h], i) => { const g = grp(idols, x, 0, z, i); vessel(g, [[0, 0], [0.09, 0], [0.08, h * 0.6], [0.05, h * 0.75], [0.07, h * 0.85], [0.05, h], [0, h]], i === 1 ? MAT.clay : mat(0xa08060, { rough: 0.8 })); [-1, 1].forEach((sd) => rod(g, [0, h * 0.7, sd * 0.06], [0.04, h * 0.5, sd * 0.1], 0.02, MAT.clay)); });
    figure(scene, 0, 0, { robe: 0x7a5a6a, cloth: 0x5a3a4a, skin: 1, sit: true, y: 1.1, face: Math.PI / 2 });
    figure(scene, 3.4, -1.6, { robe: 0x6b5236, beard: true, h: 4, face: Math.PI * 0.85, reach: true, skipFit: true });
    L(labels, [2.6, 1.0, 1.4], "Household gods", "Small figurines thought to protect a house, and maybe tied to inheritance. Laban searched the whole tent for them.", "Genesis 31:19, 30–35");
    L(labels, [0, 4, 0], "Rachel sat on them", "“Let not my lord be angry that I cannot rise before you, for the way of women is upon me.” He searched but did not find them.", "Genesis 31:34–35");
    L(labels, [-1.5, 1.4, 1], "Put away the foreign gods", "Later Jacob told his household to give up their foreign gods, and he buried them under the oak at Shechem.", "Genesis 35:2–4", true);
    return { view: v3(0.8, 0.5, 1.1), target: v3(1, 1.2, 0.5) };
  },

  "high-place"({ scene, labels }) {
    ground(scene, 60, 0xb8ad7c, false);
    // High places on every high hill, with standing stones and Asherah poles under every green tree
    // (1 Kings 14:23; 2 Kings 23:13-15); Josiah tore them down.
    hill(scene, 14, 0, 0, 5, 0xa39f6b);
    rbox(scene, 3, 1.4, 3, 0, 4.8, 0, MAT.rock, 0.3);
    [[-2.6, -1.5, 3.2], [-3.4, 0.6, 2.6], [-2.2, 2.2, 2.9]].forEach(([x, z, hh]) => rbox(scene, 0.7, hh, 0.5, x, 4.7, z, mat(0x9d917a, { rough: 1, tex: "rock" }), 0.2));
    rod(scene, [3, 4.6, -1], [3.1, 10, -1], 0.18, MAT.bark);
    for (let i = 0; i < 4; i++) rod(scene, [3.05, 7 + i * 0.7, -1], [3.05 + Math.cos(i * 1.6) * 1.2, 7.6 + i * 0.7, -1 + Math.sin(i * 1.6) * 1.2], 0.06, MAT.bark);
    olive(scene, 5, 2.5, 6);
    flame(scene, 0, 6.2, 0, 2.5);
    L(labels, [0, 8, 0], "A high place", "A hilltop shrine with an altar. Israel and Judah built them “on every high hill and under every green tree”, even after the temple was built.", "1 Kings 14:23; 2 Kings 17:9–11");
    L(labels, [-2.8, 9, 0.4], "Standing stones", "Pillars set up as sacred stones. The law said to break them down.", "Deuteronomy 12:3; Exodus 34:13", true);
    L(labels, [3, 11, -1], "An Asherah pole", "A wooden pole or tree for the goddess Asherah. Gideon cut one down at night; Josiah burned them.", "Judges 6:25–28; 2 Kings 23:6, 14");
    return { view: v3(0.8, 0.45, 1.1), target: v3(0, 6, 0), zoom: 0.8 };
  },

  "bronze-mirror"({ scene, labels }) {
    plinth(scene, 0.8, 0xd9c9a3);
    // A polished bronze hand mirror: “For now we see in a mirror dimly, but then face to face” (1 Corinthians 13:12; James 1:23-24).
    const g = grp(scene, 0, 0.15, 0, -0.4); g.rotation.x = -0.9;
    const disk = mesh(g, new THREE.CylinderGeometry(0.28, 0.28, 0.02, 48), mat(0xc8905a, { rough: 0.28, metal: 1 }), 0, 0.2, 0, Math.PI / 2); void disk;
    tor(g, 0.28, 0.015, mat(0x8a5a33, { rough: 0.5, metal: 0.8 }), 0, 0.2, 0, 0, 0);
    vessel(g, [[0.03, -0.35], [0.04, -0.2], [0.03, -0.1], [0.06, -0.08], [0.02, -0.06]], mat(0x8a5a33, { rough: 0.5, metal: 0.8 }));
    L(labels, [0, 0.6, 0], "In a mirror dimly", "Mirrors were polished bronze, and showed only a blurred, coppery likeness. “Now I know in part; then I shall know fully, even as I have been fully known.”", "1 Corinthians 13:12");
    L(labels, [0.3, 0.3, 0.2], "Forgets what he looks like", "Hearing the word without doing it is like looking in a mirror and walking away.", "James 1:23–25", true);
    L(labels, [-0.3, 0.3, 0.2], "Mirrors for the laver", "The women who served at the tent of meeting gave their bronze mirrors to make the laver.", "Exodus 38:8", true, "/bible/3d/laver");
    scale(scene, labels, 0.4, -0.4, true);
    return { view: v3(0.3, 0.55, 1) };
  },

  "jeremiahs-belt"({ scene, labels }) {
    ground(scene, 30, 0xb8ad7c, false);
    // A linen belt hidden in a cleft of the rock by the Euphrates, dug up spoiled, good for nothing (Jeremiah 13:1-11).
    const riv = mesh(scene, new THREE.PlaneGeometry(60, 8), MAT.water, 0, 0.04, -9, -Math.PI / 2); riv.userData.skipFit = true;
    rock(scene, 2.2, -1.5, 1.2, -2.6, 0xb0a48c, 1.3, 1, 1); rock(scene, 1.8, 1.8, 1, -2.8, 0xa89a82);
    const crack = mesh(scene, new THREE.BoxGeometry(0.5, 1.6, 1.2), MAT.black, 0.2, 1.0, -2.2); void crack;
    const bt = grp(scene, 0.6, 0.06, 0.6, 0.4);
    const geo = new THREE.TorusGeometry(0.6, 0.06, 6, 48, Math.PI * 1.6); geo.scale(1, 1, 0.3);
    const b = mesh(bt, geo, mat(0x8a7a5a, { rough: 1, tex: "linen" }), 0, 0, 0, Math.PI / 2); void b;
    for (let i = 0; i < 8; i++) sph(bt, 0.06, mat(0x5a4a34, { rough: 1 }), Math.cos(i * 0.7) * 0.6, 0.03, Math.sin(i * 0.7) * 0.6, 1.4, 0.4, 1);
    const sp = grp(scene, -1.2, 0.3, 1.3, 0.4); sp.rotation.z = -0.4; rod(sp, [0, 0, 0], [0, 2.2, 0], 0.04, MAT.olive); slab(sp, [[-0.2, 0], [0.2, 0], [0.15, -0.4], [-0.15, -0.4]], 0.03, IRON, 0, 0, 0);
    figure(scene, 2.6, 1.6, { robe: 0x6b5236, beard: true, h: 4, reach: true, face: Math.PI * 1.1, skipFit: true });
    L(labels, [0.6, 0.6, 0.6], "Spoiled, good for nothing", "Jeremiah wore a linen belt, hid it in a cleft of the rock by the Euphrates, and long after dug it up ruined. “Even so will I spoil the pride of Judah and the great pride of Jerusalem.”", "Jeremiah 13:1–9");
    L(labels, [2.6, 4.4, 1.6], "Clinging close", "“As a belt clings to the waist, so I made the whole house of Israel cling to me… but they would not listen.”", "Jeremiah 13:11", true);
    return { view: v3(0.6, 0.6, 1.1), target: v3(0.4, 0.8, 0) };
  },

  "broken-flask"({ scene, labels }) {
    ground(scene, 30, 0xb8a888, false);
    // At the Potsherd Gate, by the Valley of Hinnom, Jeremiah smashed a potter's earthenware flask before
    // the elders: “So will I break this people and this city” (Jeremiah 19:1-11).
    for (let i = 0; i < 9; i++) { const a = i * 0.8; const sh = mesh(scene, new THREE.SphereGeometry(0.45, 10, 6, a, 0.9, 0.5, 1.0), mat(0xb8653a, { rough: 0.85, side: THREE.DoubleSide }), Math.cos(a) * (0.5 + (i % 3) * 0.3), 0.05, Math.sin(a) * (0.5 + (i % 3) * 0.3)); sh.rotation.set(Math.PI / 2 - 0.4, i, 0); }
    vessel(scene, [[0.06, 0.35], [0.12, 0.42], [0.1, 0.52], [0.13, 0.55]], MAT.clay, 0.2, 0, -0.4).rotation.z = 1.4;
    const gate = grp(scene, 0, 0, -8); [-3, 3].forEach((x) => rbox(gate, 2, 7, 2, x, 0, 0, mat(0xffffff, { tex: "stone", rough: 1 }), 0.1)); rbox(gate, 8, 1.5, 2, 0, 7, 0, mat(0xffffff, { tex: "stone", rough: 1 }), 0.1); gate.userData.skipFit = true;
    figure(scene, -1.4, -1.0, { robe: 0x6b5236, beard: true, h: 4, raise: true, face: 0.3 });
    for (let i = 0; i < 5; i++) figure(scene, 2.2 + (i % 3) * 1.2, -2.5 - Math.floor(i / 3) * 1.4, { robe: [0x5b2c6f, 0x8b6f4e, 0x6b7f8c][i % 3], cloth: 0xe9e1cf, beard: true, h: 4, face: Math.PI + 0.3, skipFit: true });
    L(labels, [0, 1, 0], "So will I break this people", "“…as one breaks a potter's vessel, so that it can never be mended.” Jeremiah broke the flask before the elders and senior priests.", "Jeremiah 19:10–11");
    L(labels, [0, 9.5, -8], "The Potsherd Gate", "Above the Valley of Hinnom, where children had been burned to Baal.", "Jeremiah 19:2–6", true);
    return { view: v3(0.6, 0.55, 1.1), target: v3(0.3, 1.2, 0) };
  },

  "deeds-in-a-jar"({ scene, labels }) {
    plinth(scene, 1.2, 0xd9c9a3);
    // With Babylon at the gates Jeremiah bought his cousin's field at Anathoth for seventeen shekels, and put
    // the sealed and open deeds in an earthenware jar to last (Jeremiah 32:6-15).
    vessel(scene, [[0, 0], [0.18, 0.01], [0.25, 0.2], [0.26, 0.5], [0.2, 0.62], [0.16, 0.66], [0.18, 0.7]], MAT.clayLight, 0, 0, 0);
    const lid = mesh(scene, new THREE.CylinderGeometry(0.19, 0.19, 0.04, 24), MAT.clay, 0.45, 0.02, 0.2); void lid;
    const d1 = grp(scene, -0.5, 0.05, 0.35, 0.6); mesh(d1, new THREE.CylinderGeometry(0.035, 0.035, 0.4, 16), MAT.parchment, 0, 0, 0, 0, 0, Math.PI / 2); tor(d1, 0.04, 0.008, MAT.rope, 0, 0, 0, 0, Math.PI / 2); mesh(d1, new THREE.CylinderGeometry(0.03, 0.03, 0.012, 16), mat(0xa04a2a, { rough: 0.7 }), 0, 0.04, 0);
    const d2 = mesh(scene, new THREE.PlaneGeometry(0.4, 0.3), new THREE.MeshStandardMaterial({ map: textTex(["שדה בענתות", "שבעה עשר", "שקל כסף"], { bg: "#e8d9b0", ink: "#2a1d12", w: 256, h: 192, size: 34, rtl: true, font: "'Times New Roman', serif" }), roughness: 0.95, side: THREE.DoubleSide }), 0.15, 0.02, 0.55, -Math.PI / 2, 0, 0.3); void d2;
    for (let i = 0; i < 17; i++) mesh(scene, new THREE.CylinderGeometry(0.03, 0.03, 0.006, 12), SILVER, -0.6 + (i % 6) * 0.07, 0.003 + Math.floor(i / 6) * 0.006, -0.4 + (i % 2) * 0.05);
    L(labels, [0, 0.95, 0], "In an earthenware jar", "“Take these deeds, both this sealed deed of purchase and this open deed, and put them in an earthenware vessel, that they may last for a long time.” Like the jars the Dead Sea Scrolls were found in.", "Jeremiah 32:14");
    L(labels, [0.15, 0.2, 0.55], "Houses and fields shall again be bought", "Buying land as the city fell was a sign of hope: “Houses and fields and vineyards shall again be bought in this land.”", "Jeremiah 32:15, 42–44");
    L(labels, [-0.5, 0.15, -0.35], "Seventeen shekels of silver", "Weighed out on scales before witnesses.", "Jeremiah 32:9–10", true);
    scale(scene, labels, 0.6, -0.55, true);
    return { view: v3(0.4, 0.6, 1) };
  },

  "lydias-purple"({ scene, labels }) {
    ground(scene, 20, C.stone);
    // Lydia, a seller of purple goods from Thyatira, at the place of prayer by the river at Philippi (Acts 16:13-15, 40).
    // Purple dye came from murex sea snails: thousands for a single garment.
    for (let i = 0; i < 3; i++) { const vat = vessel(scene, [[0.9, 0], [1.0, 0.9], [0.9, 1.0]], MAT.limestone, -3 + i * 3, 0, -2); void vat; mesh(scene, new THREE.CircleGeometry(0.88, 32), mat([0x5b2c6f, 0x7a2a5a, 0x3a2a6a][i], { rough: 0.2 }), -3 + i * 3, 0.85, -2, -Math.PI / 2); }
    rod(scene, [-4.5, 3.4, 0.5], [4.5, 3.4, 0.5], 0.06, MAT.darkWood); [-4.5, 4.5].forEach((x) => rod(scene, [x, 0, 0.5], [x, 3.5, 0.5], 0.08, MAT.darkWood));
    [-3, 0, 3].forEach((x, i) => { const cl = mesh(scene, new THREE.PlaneGeometry(2.2, 2.6, 6, 6), mat([0x5b2c6f, 0x7a2a5a, 0x4a2a7a][i], { rough: 0.9, tex: "linen", side: THREE.DoubleSide }), x, 2.1, 0.5); void cl; });
    for (let i = 0; i < 30; i++) { const sh = grp(scene, 2.6 + (i % 6) * 0.25, 0.08, 2 + Math.floor(i / 6) * 0.25, i); cone(sh, 0.09, 0.22, mat(0xd8c0a8, { rough: 0.7 }), 0, 0, 0, Math.PI / 2 - 0.3); }
    figure(scene, -1.5, 2.6, { robe: 0x5b2c6f, cloth: 0xe9e1cf, skin: 1, h: 4, face: -0.4 });
    L(labels, [0, 4.6, 0.5], "Purple goods", "Purple cloth was the luxury of kings, dyed with the glands of murex sea snails: some 10,000 for a gram of dye.", "Acts 16:14; Luke 16:19");
    L(labels, [-1.5, 4.6, 2.6], "Lydia of Thyatira", "“The Lord opened her heart to pay attention to what was said by Paul.” She and her household were baptised, the first believers in Europe, and her house became the church's meeting place.", "Acts 16:14–15, 40");
    L(labels, [3.2, 0.6, 2.5], "Murex shells", "Thyatira in Asia was famous for its dyers' guild.", "Acts 16:14", true);
    return { view: v3(0.5, 0.45, 1.1) };
  },

  "almond-branch"({ scene, labels }) {
    plinth(scene, 1.4, 0xd9c9a3);
    // “What do you see, Jeremiah?” “I see an almond branch.” “You have seen well, for I am watching over my word
    // to perform it” (Jeremiah 1:11-12): a pun on shaqed, almond, and shoqed, watching. The almond blossoms first, in late winter.
    const b = grp(scene, -0.8, 0.1, 0, 0.2); b.rotation.z = -0.15;
    path(b, [[0, 0, 0], [0.6, 0.15, 0.05], [1.2, 0.3, 0], [1.8, 0.35, 0.05]], 0.03, MAT.bark, 20);
    [[0.6, 0.15], [1.2, 0.3]].forEach(([x, y]) => path(b, [[x, y, 0], [x + 0.25, y + 0.3, 0.1], [x + 0.4, y + 0.5, 0.05]], 0.015, MAT.bark, 10));
    const pet = mat(0xfaeef2, { rough: 0.8 }), pink = mat(0xe8a0b8, { rough: 0.8 });
    for (let i = 0; i < 12; i++) { const t = i / 12; const x = 0.2 + t * 1.6, y = 0.08 + t * 0.32 + (i % 3) * 0.08; const f = grp(b, x, y, (i % 2 ? 0.05 : -0.05));
      for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; sph(f, 0.04, pet, Math.cos(a) * 0.04, 0, Math.sin(a) * 0.04, 1, 0.35, 1); } sph(f, 0.018, pink, 0, 0.01, 0); }
    L(labels, [0, 0.8, 0], "An almond branch", "The almond, shaqed in Hebrew, “the watcher”, is the first tree to wake and blossom at the end of winter. “I am watching (shoqed) over my word to perform it.”", "Jeremiah 1:11–12");
    L(labels, [0.8, 0.5, 0.2], "Almond blossoms on the lampstand", "The cups of the tabernacle lampstand were shaped like almond blossoms.", "Exodus 25:33", true, "/bible/3d/lampstand");
    scale(scene, labels, 0.4, -0.7, true);
    return { view: v3(0.3, 0.55, 1) };
  },

  "jonahs-plant"({ scene, labels }) {
    ground(scene, 30, 0xc8b48a, false);
    // East of Nineveh Jonah made a booth and sat to see what would happen; God appointed a plant to shade him, then a
    // worm to attack it, and a scorching east wind (Jonah 4:5-11).
    const wl = grp(scene, -14, 0, -12, 0.3); rbox(wl, 30, 8, 2, 0, 0, 0, mat(0xb08a5a, { rough: 1, tex: "stone", rep: 6 }), 0.1); wl.userData.skipFit = true;
    for (let i = 0; i < 4; i++) rod(scene, [-1.2 + (i % 2) * 2.4, 0, -1 + Math.floor(i / 2) * 2], [-1.2 + (i % 2) * 2.4, 3, -1 + Math.floor(i / 2) * 2], 0.06, MAT.darkWood);
    for (let i = 0; i < 6; i++) rod(scene, [-1.4, 3, -1.1 + i * 0.44], [1.4, 3, -1.1 + i * 0.44], 0.05, mat(0x8a7a5a, { rough: 1 }));
    const pl = grp(scene, 1.8, 0, 0.6);
    path(pl, [[0, 0, 0], [0.3, 1.5, 0.1], [0, 2.8, -0.4], [-1, 3.4, -0.6]], 0.08, mat(0x6a8a3a, { rough: 0.8 }), 20);
    for (let i = 0; i < 8; i++) { const lf = mesh(pl, new THREE.CircleGeometry(0.55, 7), mat(i < 5 ? 0x7aa04a : 0xb8a050, { rough: 0.8, side: THREE.DoubleSide }), -0.6 + Math.cos(i) * 0.8, 3.2 + (i % 3) * 0.2, -0.4 + Math.sin(i) * 0.8, -1.2, 0, i); lf.rotation.z = i < 5 ? 0 : 1.2; }
    const worm = path(pl, [[0.05, 0.4, 0.12], [0.12, 0.5, 0.12], [0.08, 0.6, 0.14]], 0.02, mat(0xd8b8a0, { rough: 0.6 }), 8); void worm;
    figure(scene, 0, 0, { robe: 0x6b5236, beard: true, h: 4, sit: true, face: 0.5 });
    L(labels, [1.2, 4.4, 0.6], "A plant to shade him", "Probably a castor-oil plant or a gourd: it grew overnight. “Jonah was exceedingly glad because of the plant.”", "Jonah 4:6");
    L(labels, [1.9, 1.0, 0.8], "A worm", "At dawn the next day God appointed a worm that attacked the plant, and it withered.", "Jonah 4:7", true);
    L(labels, [0, 3.4, 0], "Should I not pity Nineveh?", "“You pity the plant, for which you did not labour… And should not I pity Nineveh, that great city, in which there are more than 120,000 people… and also much cattle?”", "Jonah 4:10–11");
    L(labels, [-14, 9, -12], "Nineveh", "An exceedingly great city. It repented at Jonah's preaching.", "Jonah 3:3–10", true);
    return { view: v3(0.7, 0.4, 1.1), target: v3(0.6, 1.8, 0) };
  },

  pinnacle({ scene, labels }) {
    ground(scene, 160, C.sand, false);
    // The south-east corner of Herod's temple platform above the Kidron valley, perhaps the “pinnacle of the
    // temple” where the devil set Jesus (Matthew 4:5-7). Josephus says the drop made you dizzy.
    const st = mat(0xffffff, { tex: "stone", rough: 1, rep: 4 });
    const wall = grp(scene, 0, 0, 0);
    rbox(wall, 70, 70, 6, -35, 0, 0, st, 0.3); rbox(wall, 6, 70, 70, 0, 0, -35, st, 0.3);
    rbox(wall, 14, 20, 14, -5, 70, -5, mat(0xf2ead6, { rough: 0.8, tex: "stone", rep: 2 }), 0.3);
    for (let i = 0; i < 8; i++) mesh(wall, new THREE.CylinderGeometry(0.9, 0.9, 16, 12), mat(0xf0e8d6, { rough: 0.7 }), -14 - i * 7, 78, 1.2);
    rbox(wall, 70, 2, 8, -35, 86, 0, mat(0xc8a46a, { rough: 0.6 }), 0.2);
    const val = mesh(scene, new THREE.PlaneGeometry(200, 60), mat(0xa89a7a, { rough: 1, tex: "rock", rep: 8 }), 0, -0.5, 30, -Math.PI / 2 - 0.15); val.userData.skipFit = true;
    figure(scene, -3, -3, { robe: 0xe9e1cf, cloth: 0xf2ede0, beard: true, h: 4, y: 90, face: Math.PI * 0.75 });
    for (let i = 0; i < 4; i++) figure(scene, 6 + i * 2, 10 + i, { robe: ROBES[i], h: 4, face: Math.PI, skipFit: true });
    L(labels, [-3, 96, -3], "“Throw yourself down”", "“For it is written, He will command his angels concerning you.” Jesus answered, “Again it is written, You shall not put the Lord your God to the test.”", "Matthew 4:5–7");
    L(labels, [6, 70, 6], "The south-east corner", "The temple platform's corner rose some 45 m above the Kidron valley floor; Solomon's Portico ran along the east side.", "John 10:23; Acts 3:11", true);
    return { view: v3(1, 0.3, 1), target: v3(-6, 50, -6), zoom: 0.85 };
  },

  "unknown-god"({ scene, labels }) {
    ground(scene, 40, C.stone);
    // In Athens Paul saw an altar inscribed “To the unknown god” and began: “What you worship as unknown, this I
    // proclaim to you” (Acts 17:22-31). Altars with this kind of dedication are known from Greek writers.
    const al = grp(scene, 0, 0, 0);
    rbox(al, 2.4, 0.4, 2.4, 0, 0, 0, MAT.limestone, 0.05); rbox(al, 1.8, 3, 1.8, 0, 0.4, 0, mat(0xf2ead8, { rough: 0.6 }), 0.05); rbox(al, 2.2, 0.35, 2.2, 0, 3.4, 0, MAT.limestone, 0.05);
    textPlane(al, ["ΑΓΝΩΣΤΩ", "ΘΕΩ"], 1.6, 1.2, 0, 2.2, 0.91, { bg: null, transparent: true, ink: "#4a3a2a", w: 400, h: 300, size: 80 });
    const hill2 = rock(scene, 6, -8, 1, -10, 0x9d917a, 1.6, 0.6, 1.2); hill2.userData.skipFit = true;
    const par = grp(scene, 30, 12, -40); par.userData.skipFit = true; rbox(par, 30, 2, 14, 0, 0, 0, MAT.limestone, 0.1); for (let i = 0; i < 9; i++) mesh(par, new THREE.CylinderGeometry(0.6, 0.6, 8, 12), MAT.limestone, -13 + i * 3.2, 6, 6); rbox(par, 30, 2.4, 14, 0, 10, 0, MAT.limestone, 0.1);
    figure(scene, 3, 2, { robe: 0x6b7f8c, beard: true, h: 4, raise: true, face: Math.PI * 1.1 });
    for (let i = 0; i < 6; i++) figure(scene, -4 + i * 1.3, -4 - (i % 2) * 1.2, { robe: 0xf2ede0, cloth: false, skin: i % 4, h: 4, beard: i % 2 === 0, face: Math.PI / 2, skipFit: true });
    L(labels, [0, 4.6, 0.9], "To an unknown god", "“Men of Athens, I perceive that in every way you are very religious. For as I passed along… I found also an altar with this inscription: To the unknown god. What therefore you worship as unknown, this I proclaim to you.”", "Acts 17:22–23");
    L(labels, [3, 4.6, 2], "In him we live and move", "Paul quoted their own poets: “In him we live and move and have our being… For we are indeed his offspring.”", "Acts 17:28");
    L(labels, [30, 26, -40], "The Parthenon", "On the Acropolis above the Areopagus, the city full of idols.", "Acts 17:16", true);
    return { view: v3(0.6, 0.35, 1.1), target: v3(1, 2.4, 1) };
  },

  granaries({ scene, labels }) {
    ground(scene, 60, 0xc8b48a, false);
    // In the seven years of plenty Joseph stored up grain like the sand of the sea, in every city (Genesis 41:47-57).
    // Egyptian granaries were rows of domed silos filled through the top.
    const mud = mat(0xc8a878, { rough: 1, tex: "plaster" });
    for (let i = 0; i < 8; i++) { const x = -10.5 + i * 3; const s = grp(scene, x, 0, 0); vessel(s, [[0, 0], [1.4, 0], [1.45, 2.5], [1.2, 3.8], [0.6, 4.6], [0.3, 4.8]], mud); mesh(s, new THREE.CylinderGeometry(0.3, 0.3, 0.1, 16), MAT.black, 0, 4.82, 0); mesh(s, new THREE.PlaneGeometry(0.8, 0.8), MAT.black, 0, 0.6, 1.42); }
    rbox(scene, 26, 2.4, 0.6, 0, 0, -2, mud, 0.1);
    for (let i = 0; i < 4; i++) { const st = grp(scene, -9 + i * 6, 0, 1.6); for (let k = 0; k < 6; k++) rbox(st, 0.8, 0.3, 0.8, 0, k * 0.3, k * 0.4, mud, 0.05); }
    for (let i = 0; i < 5; i++) { figure(scene, -8 + i * 4, 4, { robe: 0xe9e1cf, cloth: false, skin: 2, h: 4, face: -Math.PI / 2 }); const sk = sph(scene, 0.4, mat(0xc8a46a, { rough: 1, tex: "linen" }), -8 + i * 4, 4.4, 4.2, 1, 0.8, 0.8); void sk; }
    figure(scene, 12, 6, { robe: 0xffffff, cloth: 0x2d4f8c, skin: 2, h: 4, face: Math.PI * 1.1 });
    tor(scene, 0.35, 0.05, GOLD, 12, 3.0, 6, Math.PI / 2);
    L(labels, [0, 6.4, 0], "Grain like the sand of the sea", "“Joseph stored up grain in great abundance, like the sand of the sea, until he ceased to measure it, for it could not be measured.”", "Genesis 41:47–49");
    L(labels, [12, 5, 6], "Joseph, over all the land of Egypt", "Pharaoh gave him his signet ring and a gold chain. When the famine came, all the earth came to Egypt to buy grain, his brothers among them.", "Genesis 41:41–57; 42:1–6");
    L(labels, [-10.5, 5.6, 0], "Domed silos", "Filled by ladder through the top, emptied through a hatch at the bottom, as Egyptian tomb models show.", "Genesis 41:35", true);
    return { view: v3(0.6, 0.45, 1.2), zoom: 0.85 };
  },

  "ivory-house"({ scene, labels }) {
    ground(scene, 30, C.stone);
    // Ahab's ivory house (1 Kings 22:39); “those who lie on beds of ivory” (Amos 6:4). Hundreds of carved ivory panels
    // were dug up at Samaria: sphinxes, lotus flowers, a woman at a window.
    const wall = rbox(scene, 10, 6, 0.6, 0, 0, -2, mat(0xffffff, { tex: "plaster", rough: 1 }), 0.05); void wall;
    const ivory = mat(0xf2e8d2, { rough: 0.4 });
    const pan = (x, y, kind) => { const c = document.createElement("canvas"); c.width = 128; c.height = 160; const g = c.getContext("2d"); g.fillStyle = "#f2e8d2"; g.fillRect(0, 0, 128, 160); g.strokeStyle = "#a08a60"; g.lineWidth = 4; g.strokeRect(6, 6, 116, 148);
      if (kind === 0) { g.beginPath(); g.ellipse(64, 100, 34, 20, 0, 0, 7); g.moveTo(40, 92); g.lineTo(30, 50); g.lineTo(54, 70); g.moveTo(80, 90); g.lineTo(100, 52); g.stroke(); g.beginPath(); g.arc(64, 70, 14, 0, 7); g.stroke(); }
      else if (kind === 1) { for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(64, 140); g.quadraticCurveTo(30 + i * 34, 80, 40 + i * 24, 30); g.stroke(); g.beginPath(); g.ellipse(40 + i * 24, 30, 10, 16, 0, 0, 7); g.stroke(); } }
      else { g.strokeRect(30, 30, 68, 90); for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(30, 100 + i * 5); g.lineTo(98, 100 + i * 5); g.stroke(); } g.beginPath(); g.arc(64, 62, 16, 0, 7); g.stroke(); }
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; mesh(scene, new THREE.BoxGeometry(1.4, 1.75, 0.08), [ivory, ivory, ivory, ivory, new THREE.MeshStandardMaterial({ map: t, roughness: 0.4 }), ivory], x, y, -1.66); };
    for (let i = 0; i < 6; i++) for (let r = 0; r < 2; r++) pan(-4 + i * 1.6, 2 + r * 2, (i + r) % 3);
    const bed = grp(scene, 0, 0, 1.6); rbox(bed, 5, 0.4, 2, 0, 1, 0, ivory, 0.08); [[-2.3, -0.8], [2.3, -0.8], [-2.3, 0.8], [2.3, 0.8]].forEach(([x, z]) => vessel(bed, [[0.12, 0], [0.08, 0.3], [0.14, 0.6], [0.1, 1.0]], ivory, x, 0, z)); rbox(bed, 4.6, 0.4, 1.8, 0, 1.4, 0, mat(0x5b2c6f, { rough: 1, tex: "linen" }), 0.15);
    L(labels, [0, 6.6, -2], "The ivory house", "“The rest of the acts of Ahab… and the ivory house that he built.” Over 500 pieces of carved ivory were found in the ruins of Samaria's palace.", "1 Kings 22:39");
    L(labels, [0, 2.6, 1.6], "Beds of ivory", "“Woe to those who lie on beds of ivory… but are not grieved over the ruin of Joseph!”", "Amos 6:4–6", true);
    L(labels, [3, 4.6, -1.5], "Houses of ivory shall perish", "“I will strike the winter house along with the summer house, and the houses of ivory shall perish.”", "Amos 3:15", true);
    scale(scene, labels, 4.5, 2.5);
    return { view: v3(0.4, 0.35, 1.1), target: v3(0, 2.4, 0) };
  },

  "peters-vision"({ scene, labels }) {
    ground(scene, 40, C.sand, false);
    const sea = mesh(scene, new THREE.PlaneGeometry(80, 30), MAT.water, 0, 0.04, -26, -Math.PI / 2); sea.userData.skipFit = true;
    // On the roof of Simon the tanner's house by the sea at Joppa, Peter saw a great sheet let down by its four corners,
    // full of all kinds of animals: “What God has made clean, do not call common” (Acts 10:9-16).
    const h = house(scene, 0, 0, 10, 8, 7); void h;
    figure(scene, 1.5, 0.5, { robe: 0x6b7f8c, beard: true, h: 4, y: 7.5, raise: true, face: Math.PI * 0.6 });
    const sh = mesh(scene, new THREE.PlaneGeometry(6, 6, 12, 12), mat(0xf2ede0, { rough: 1, tex: "linen", side: THREE.DoubleSide }), -1.5, 13, 0, -Math.PI / 2);
    const p = sh.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, -(1 - (x / 3) ** 2) * (1 - (y / 3) ** 2) * 1.6); } sh.geometry.computeVertexNormals();
    [[-3, -3], [3, -3], [-3, 3], [3, 3]].forEach(([x, z]) => rod(scene, [-1.5 + x, 13, z], [-1.5 + x * 0.3, 22, z * 0.3], 0.03, MAT.rope));
    beast(scene, -2.6, -0.6, { color: 0xd8a0a0, s: 0.5, y: 11.5, face: 0.4 }); beast(scene, -0.6, 0.8, { color: 0x6a6a6a, ears: true, s: 0.5, y: 11.5, face: 2 });
    const sn = path(scene, [[-1.0, 11.9, -1.4], [-0.6, 12, -1.0], [-1.2, 12, -0.6], [-0.8, 12.05, -0.2]], 0.06, mat(0x5a6a2a, { rough: 0.4 }), 20); void sn;
    const glow = mesh(scene, new THREE.SphereGeometry(4, 20, 14), new THREE.MeshBasicMaterial({ color: 0xfff6d8, transparent: true, opacity: 0.35, depthWrite: false }), -1.5, 23, 0); glow.userData.skipFit = true;
    for (let i = 0; i < 3; i++) figure(scene, 8 + i * 1.4, 4, { robe: [0xa3302a, 0x8b6f4e, 0x6b7f8c][i], cloth: i === 0 ? false : undefined, h: 4, face: Math.PI, skipFit: true });
    L(labels, [-1.5, 15.5, 0], "A great sheet let down", "Full of all kinds of four-footed animals, reptiles and birds. “Rise, Peter; kill and eat.” “By no means, Lord; for I have never eaten anything common or unclean.”", "Acts 10:11–14");
    L(labels, [1.5, 12.2, 0.5], "Praying on the roof at noon", "Three times the vision came. Just then, men from Cornelius the centurion arrived at the gate.", "Acts 10:9, 16–17");
    L(labels, [9.4, 8.4, 4], "Men from Cornelius", "“God has shown me that I should not call any person common or unclean.” The Spirit fell on Gentiles who heard.", "Acts 10:17–48", true);
    return { view: v3(0.7, 0.4, 1.1), target: v3(0, 10, 0) };
  },

  measures({ scene, labels }) {
    ground(scene, 12, C.stone);
    // Measures of grain and liquid, side by side. Ancient values varied; these are the usual estimates.
    const items = [
      ["Omer", 2.2, "About 2.2 litres: one person's manna for a day.", "Exodus 16:16, 36"],
      ["Seah", 7.3, "About 7.3 litres. Three seahs of flour: the yeast in the parable, and the cakes Sarah baked.", "Matthew 13:33; Genesis 18:6"],
      ["Ephah", 22, "About 22 litres, ten omers: an ephah of barley is what Ruth gleaned in a day.", "Ruth 2:17; Exodus 16:36"],
      ["Bath", 22, "The liquid equal of the ephah, about 22 litres. The Sea held 2,000 baths.", "Ezekiel 45:11; 1 Kings 7:26"],
      ["Homer (kor)", 220, "Ten ephahs, about 220 litres: a donkey-load, the meaning of the name.", "Ezekiel 45:11; Hosea 3:2"],
    ];
    const lpu = 91.125; // litres in a cubic cubit (45 cm cubed)
    items.forEach(([name, litres, text, verse], i) => {
      const x = -6 + i * 3, h = Math.cbrt(litres / lpu) * 1.4, r = Math.sqrt(litres / lpu / (Math.PI * h));
      const isJar = name === "Bath";
      if (isJar) vessel(scene, [[0, 0], [r * 0.8, 0.01], [r * 1.2, h * 0.4], [r * 1.1, h * 0.85], [r * 0.5, h * 1.0], [r * 0.45, h * 1.12], [r * 0.55, h * 1.15]], MAT.clay, x, 0, 0);
      else { vessel(scene, [[0, 0], [r, 0.01], [r * 1.05, h], [r * 1.1, h * 1.02]], mat(0xc8a46a, { rough: 1, tex: "linen", rep: 2 }), x, 0, 0); const top = mesh(scene, new THREE.CircleGeometry(r * 1.02, 24), mat(0xd8b860, { rough: 1 }), x, h * 0.97, 0, -Math.PI / 2); void top; }
      L(labels, [x, h * 1.2 + 0.4, 0], name, text, verse, false);
    });
    scale(scene, labels, -9, -1.5);
    L(labels, [0, 3.8, -1.2], "Measures for dry goods and liquids", "Shown to scale, assuming a cubit of 45 cm. Values varied by period and place; these are common estimates.", "Ezekiel 45:10–11", true);
    return { view: v3(0.15, 0.45, 1.1), target: v3(0, 0.8, 0), zoom: 1.25 };
  },

  cubit({ scene, labels }) {
    ground(scene, 6, C.stone);
    // The Bible's measures of length came from the body: finger, handbreadth (4 fingers), span (3 handbreadths),
    // cubit (2 spans, elbow to fingertip), and Ezekiel's long cubit (a cubit and a handbreadth) (Deuteronomy 3:11; Ezekiel 40:5).
    const sk = mat(0xa8714a, { rough: 0.7 }), slv = mat(0x8b6f4e, { rough: 0.95, tex: "linen" });
    const arm = grp(scene, -0.5, 0.45, 0);
    mesh(arm, new THREE.CapsuleGeometry(0.1, 0.55, 8, 14), slv, 0.28, 0, 0, 0, 0, Math.PI / 2);
    mesh(arm, new THREE.CapsuleGeometry(0.075, 0.25, 8, 12), sk, 0.72, 0, 0, 0, 0, Math.PI / 2);
    rbox(arm, 0.19, 0.06, 0.18, 0.92, -0.03, 0, sk, 0.025);
    [-0.06, -0.02, 0.02, 0.06].forEach((z, i) => mesh(arm, new THREE.CapsuleGeometry(0.018, [0.16, 0.19, 0.18, 0.14][i], 6, 10), sk, 1.1, 0, z, 0, 0, Math.PI / 2));
    sph(arm, 0.08, sk, -0.06, 0, 0);
    const rule = (y, len, col, label, text, verse) => { const r = rbox(scene, len, 0.04, 0.06, -0.56 + len / 2, y, 0.3, mat(col, { rough: 0.6 }), 0.01); void r; L(labels, [-0.56 + len / 2, y + 0.12, 0.3], label, text, verse, false); };
    rule(0.15, 1.0, 0x2d4f8c, "Cubit", "Elbow to fingertip: about 45 cm (17.5 in). The everyday unit for buildings, from Noah's ark to the temple.", "Genesis 6:15");
    rule(0.05, 1.0 * 7 / 6, 0x5b2c6f, "Long cubit", "A cubit and a handbreadth, about 52 cm: the “royal” cubit Ezekiel's temple was measured with.", "Ezekiel 40:5; 43:13");
    rule(0.25, 0.5, 0xb3202a, "Span", "Half a cubit, thumb to little finger with the hand spread: about 22 cm. The breastplate was a span square.", "Exodus 28:16");
    rule(0.35, 1 / 6, 0x2f6f68, "Handbreadth", "Four fingers across: about 7.5 cm. The thickness of the bronze Sea.", "1 Kings 7:26");
    rule(0.42, 1 / 24, 0xd9a440, "Finger", "About 1.9 cm. Jachin and Boaz were hollow bronze four fingers thick.", "Jeremiah 52:21");
    return { view: v3(0.25, 0.7, 1), target: v3(0, 0.3, 0.15) };
  },
};

function lathe(scene, pts, x, y, z, m, seg = 40) { const o = new THREE.Mesh(new THREE.LatheGeometry(pts.map(([r, h]) => new THREE.Vector2(r, h)), seg), m); o.position.set(x, y, z); scene.add(o); return o; }
