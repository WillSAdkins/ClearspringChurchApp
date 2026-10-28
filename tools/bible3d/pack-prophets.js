/* Kings and prophets: more scenes and objects from the Old Testament. 1 unit = 1 cubit (about 45 cm). */
import {
  scatter, THREE, MAT, C, GOLD, BRONZE, SILVER, IRON, mat, mesh, grp, sph, cone, tor, rod, path, vessel, slab, rbox, box, cyl,
  textPlane, textTex, scroll, scale, L, plinth, ground, figure, beast, flame, rock, hill, v3, ref, bush, olive, palm, house, ROBES,
} from "./kit.js";

const GLOW = (c = 0xfff1c0, o = 0.5) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, depthWrite: false });

export const MODELS = {
  "queen-of-sheba"({ scene, labels }) {
    ground(scene, 50, C.stone);
    // She came to Jerusalem with a very great retinue, camels bearing spices, very much gold and precious stones,
    // to test Solomon with hard questions (1 Kings 10:1-13; Matthew 12:42).
    const camel = (x, z, ry) => { const g = grp(scene, x, 0, z, ry), cm = mat(0xc8a070, { rough: 0.9 });
      sph(g, 1.3, cm, 0, 3.6, 0, 1.6, 0.9, 0.85); sph(g, 0.8, cm, 0, 4.6, 0, 1.0, 0.9, 0.9);
      [[-1.2, -0.5], [-1.2, 0.5], [1.3, -0.5], [1.3, 0.5]].forEach(([a, b]) => rod(g, [a, 3.3, b], [a * 1.1, 0, b], 0.18, cm, 0.12));
      path(g, [[1.8, 4, 0], [2.8, 4.6, 0], [3.2, 5.9, 0]], 0.32, cm, 12); sph(g, 0.42, cm, 3.6, 6.2, 0, 1.6, 0.8, 0.8);
      [-1, 1].forEach((sd) => { const pk = rbox(g, 1.6, 1.1, 0.6, -0.2, 3.0, sd * 1.25, mat([0x9b2a2a, 0x2d4f8c][sd > 0 ? 1 : 0], { rough: 1, tex: "linen" }), 0.25); void pk; });
      return g; };
    for (let i = 0; i < 4; i++) camel(-14 + i * 5, 6 + (i % 2) * 2, 0);
    for (let i = 0; i < 6; i++) { const ch = grp(scene, -3 + (i % 3) * 1.6, 0, -1 + Math.floor(i / 3) * 1.4); rbox(ch, 1.1, 0.7, 0.8, 0, 0, 0, i % 2 ? MAT.darkWood : GOLD, 0.08); }
    for (let i = 0; i < 20; i++) sph(scene, 0.12, mat([0xb3122e, 0x1f4fb3, 0x1f8a4c, 0xe8f1f5][i % 4], { rough: 0.1 }), 1.6 + Math.cos(i) * 0.4, 0.75 + (i % 3) * 0.05, -0.3 + Math.sin(i) * 0.4);
    rbox(scene, 1.4, 0.7, 1.0, 1.6, 0, -0.3, MAT.darkWood, 0.05);
    for (let i = 0; i < 6; i++) { const b = vessel(scene, [[0, 0], [0.3, 0.05], [0.4, 0.5], [0.3, 0.75]], mat(0xc8a46a, { rough: 1, tex: "linen" }), 4 + (i % 3) * 1, 0, 1 + Math.floor(i / 3)); void b; sph(scene, 0.25, mat([0xc78a2e, 0x8a4a2a, 0xa0a03a][i % 3], { rough: 0.9 }), 4 + (i % 3), 0.75, 1 + Math.floor(i / 3), 1, 0.5, 1); }
    const th = grp(scene, 0, 0, -6); for (let i = 0; i < 6; i++) rbox(th, 6 - i * 0.6, 0.5, 4 - i * 0.4, 0, i * 0.5, 0.2 * i, i % 2 ? MAT.ivory : GOLD, 0.05); rbox(th, 2.4, 3.6, 0.4, 0, 3, -0.5, GOLD, 0.1);
    figure(scene, 0, -5.6, { robe: 0x5b2c6f, cloth: false, beard: true, h: 4, sit: true, y: 3, face: Math.PI / 2 });
    figure(scene, 0, 2.2, { robe: 0xd9a440, cloth: 0xb3202a, skin: 3, h: 4, face: -Math.PI / 2 });
    L(labels, [0, 5.2, 2.2], "The queen of Sheba", "She heard of Solomon's fame and came to test him with hard questions. Sheba was probably in south Arabia, today's Yemen, rich from the incense trade.", "1 Kings 10:1–3");
    L(labels, [4.6, 2, 1.4], "Spices, gold and precious stones", "“She gave the king 120 talents of gold, and a very great quantity of spices and precious stones. Never again came such an abundance of spices.”", "1 Kings 10:10");
    L(labels, [0, 8, -5.6], "“The half was not told me”", "“Your wisdom and prosperity surpass the report that I heard.”", "1 Kings 10:6–9");
    L(labels, [-10, 8, 7], "The queen of the South", "Jesus: she came from the ends of the earth to hear Solomon's wisdom, “and behold, something greater than Solomon is here.”", "Matthew 12:42", true);
    return { view: v3(0.7, 0.5, 1.2), target: v3(-1, 2.5, 0) };
  },

  "book-of-the-law"({ scene, labels }) {
    ground(scene, 30, C.stone);
    // While the temple was being repaired, Hilkiah the high priest found the Book of the Law; when Josiah heard it read,
    // he tore his clothes (2 Kings 22:3-13; 2 Chronicles 34:14-21).
    const st = mat(0xffffff, { tex: "stone", rough: 1, rep: 2 });
    rbox(scene, 12, 6, 0.6, 0, 0, -3, st, 0.05);
    for (let i = 0; i < 5; i++) rbox(scene, 1.4, 0.7, 0.9, -4 + i * 1.6, 0, -1.8, mat(0xe6dcc6, { rough: 1, tex: "stone" }), 0.05);
    rod(scene, [-5, 0, -2.6], [-5, 5, -2.6], 0.12, MAT.darkWood); rod(scene, [5, 0, -2.6], [5, 5, -2.6], 0.12, MAT.darkWood); rod(scene, [-5, 4, -2.6], [5, 4, -2.6], 0.1, MAT.darkWood);
    const chest = grp(scene, 0.5, 0, 0.6); rbox(chest, 1.6, 1.0, 1.0, 0, 0, 0, MAT.darkWood, 0.06); const lid = rbox(chest, 1.6, 0.12, 1.0, 0, 1.0, -0.45, MAT.darkWood, 0.03); lid.rotation.x = -1.1;
    for (let i = 0; i < 12; i++) mesh(chest, new THREE.CylinderGeometry(0.06, 0.06, 0.012, 12), SILVER, -0.5 + (i % 6) * 0.2, 1.0, -0.2 + Math.floor(i / 6) * 0.2);
    const sc = grp(scene, -1.2, 2.2, 1.0); sc.rotation.x = -0.3; scroll(sc, 0, 0, 0, 0.8, 0.9, { text: ["אנכי יהוה אלהיך", "שמע ישראל", "יהוה אלהינו", "יהוה אחד"], rtl: true, size: 40 });
    figure(scene, -1.4, 1.6, { robe: 0xf6f2e8, cloth: 0xffffff, beard: true, h: 4, reach: true, face: 0.2 });
    figure(scene, 1.6, 2.8, { robe: 0x6b5236, beard: true, h: 4, face: Math.PI * 1.1 });
    L(labels, [-1.2, 4.6, 1.2], "“I have found the Book of the Law”", "Hilkiah found it in the house of the LORD while the money for the repairs was being counted out. Shaphan the secretary read it to the king.", "2 Kings 22:8–10");
    L(labels, [1.6, 4.6, 2.8], "Josiah tore his clothes", "“Great is the wrath of the LORD… because our fathers have not obeyed the words of this book.” Then he read it to all the people and renewed the covenant.", "2 Kings 22:11–13; 23:1–3");
    L(labels, [0.5, 1.6, 0.6], "Money for the workmen", "Collected at the door, weighed out to carpenters, builders and masons.", "2 Kings 22:4–7", true);
    return { view: v3(0.6, 0.45, 1.1), target: v3(0, 2, 0.5) };
  },

  "ezras-pulpit"({ scene, labels }) {
    ground(scene, 60, C.stone);
    // Ezra stood on a wooden platform made for the purpose and read the Law from early morning until midday; the people
    // stood, said “Amen, Amen” and wept; the Levites explained it (Nehemiah 8:1-12).
    const gate = grp(scene, 0, 0, -10); [-5, 5].forEach((x) => rbox(gate, 4, 12, 4, x, 0, 0, mat(0xffffff, { tex: "stone", rough: 1 }), 0.1)); rbox(gate, 14, 2, 4, 0, 12, 0, mat(0xffffff, { tex: "stone", rough: 1 }), 0.1); gate.userData.skipFit = true;
    const pl = grp(scene, 0, 0, -4); rbox(pl, 8, 3, 3, 0, 0, 0, MAT.wood, 0.1); for (let i = 0; i < 4; i++) rbox(pl, 1.6, 3 - i * 0.75, 0.6, 0, 0, 1.8 + i * 0.6, MAT.wood, 0.04);
    figure(scene, 0, -4, { robe: 0xf6f2e8, cloth: 0xffffff, beard: true, h: 4, y: 3, reach: true, face: Math.PI / 2 });
    const sc = grp(scene, 0.9, 6.1, -3.6); sc.rotation.x = 0.4; scroll(sc, 0, 0, 0, 0.7, 0.8, { text: ["בראשית", "ברא אלהים"], rtl: true, size: 50 });
    for (let i = 0; i < 6; i++) figure(scene, (i < 3 ? -3.4 + i * 0.8 : 1.8 + (i - 3) * 0.8), -4.6, { robe: [0x8b6f4e, 0x6b7f8c, 0x5d7a5a][i % 3], cloth: 0xe9e1cf, beard: true, h: 4, y: 3, face: Math.PI / 2, skipFit: true });
    const crowd = []; for (let i = 0; i < 30; i++) crowd.push(i);
    crowd.forEach((i) => figure(scene, -9 + (i % 10) * 2, 4 + Math.floor(i / 10) * 2.4, { robe: ROBES[i % 8], skin: i % 4, beard: i % 3 === 0, raise: i % 7 === 0, h: 3.6 + (i % 3) * 0.2, face: -Math.PI / 2, skipFit: true }));
    L(labels, [0, 9, -4], "A wooden platform", "“Ezra the scribe stood on a wooden platform that they had made for the purpose.” He opened the book in the sight of all the people, and they stood up.", "Nehemiah 8:4–5");
    L(labels, [-3.4, 8, -4.6], "They gave the sense", "Levites helped the people understand the Law, reading clearly and explaining it.", "Nehemiah 8:7–8", true);
    L(labels, [0, 5.4, 8], "“The joy of the LORD is your strength”", "All the people wept as they heard. “Do not be grieved, for the joy of the LORD is your strength.”", "Nehemiah 8:9–10");
    L(labels, [6, 13, -10], "The Water Gate", "They gathered in the square before the Water Gate, in the seventh month.", "Nehemiah 8:1–2", true);
    return { view: v3(1, 0.5, 0.25), target: v3(0, 3.5, 0) };
  },

  "job-among-the-ashes"({ scene, labels }) {
    ground(scene, 30, 0xb8a888, false);
    // Job took a piece of broken pottery to scrape himself while he sat among the ashes; three friends came and sat with
    // him on the ground seven days and seven nights, and no one spoke a word (Job 2:7-13).
    const ash = mesh(scene, new THREE.CircleGeometry(2.6, 32), mat(0x6a6662, { rough: 1 }), 0, 0.02, 0, -Math.PI / 2); ash.userData.noShadow = true;
    figure(scene, 0, 0, { robe: 0x4a423c, cloth: false, beard: true, h: 4, sit: true, face: Math.PI / 2, reach: true });
    const sh = mesh(scene, new THREE.SphereGeometry(0.4, 8, 6, 0, 1, 0.8, 0.8), mat(0xb8653a, { rough: 0.8, side: THREE.DoubleSide }), 0.7, 1.2, 0.5); void sh;
    [[-1.6, 3.2], [0.6, 3.6], [2.6, 2.8]].forEach(([x, z], i) => figure(scene, x, z, { robe: [0x5b2c6f, 0x2d4f8c, 0x8c5a3c][i], cloth: 0xe9e1cf, beard: true, h: 4, sit: true, face: -Math.PI / 2 - x * 0.15 }));
    for (let i = 0; i < 4; i++) { const t = mesh(scene, new THREE.PlaneGeometry(1.2, 1.6), mat(0x8a6a5a, { rough: 1, tex: "linen", side: THREE.DoubleSide }), -3 + i * 2, 0.04, 5.5, -Math.PI / 2, 0, i); void t; }
    L(labels, [0, 3.6, 0], "Among the ashes", "Struck with sores from head to foot, Job scraped himself with a potsherd. “Shall we receive good from God, and shall we not receive evil?” In all this Job did not sin with his lips.", "Job 2:7–10");
    L(labels, [0.6, 3.8, 3.6], "Seven days in silence", "Eliphaz, Bildad and Zophar came to comfort him, wept, tore their robes, and sat with him seven days and seven nights. No one spoke a word, for they saw his suffering was very great.", "Job 2:11–13");
    L(labels, [-1.6, 1, 5.4], "Dust and ashes", "At the end, after God spoke from the whirlwind: “I had heard of you by the hearing of the ear, but now my eye sees you.”", "Job 42:5–6", true);
    return { view: v3(0.6, 0.55, 1.1), target: v3(0.4, 1.2, 1.6) };
  },

  cornerstone({ scene, labels }) {
    ground(scene, 30, C.stone);
    // “The stone that the builders rejected has become the cornerstone” (Psalm 118:22; Isaiah 28:16; Matthew 21:42; 1 Peter 2:4-7).
    // The first stone laid, true and square, that every other stone is lined up from.
    const st = mat(0xffffff, { tex: "stone", rough: 1, rep: 1 });
    rbox(scene, 3, 1.8, 3, 0, 0, 0, mat(0xe9dfc8, { rough: 0.6, tex: "stone", rep: 1 }), 0.05);
    for (let i = 1; i < 6; i++) { rbox(scene, 2.6, 1.6, 2.4, 3 + (i - 1) * 2.7, 0, 0, st, 0.05); rbox(scene, 2.4, 1.6, 2.6, 0, 0, -3 + -(i - 1) * 2.7, st, 0.05); }
    for (let i = 1; i < 4; i++) { rbox(scene, 2.6, 1.6, 2.4, 1.6 + (i - 1) * 2.7, 1.8, -0.2, st, 0.05); rbox(scene, 2.4, 1.6, 2.6, -0.2, 1.8, -1.6 - (i - 1) * 2.7, st, 0.05); }
    const sq = grp(scene, 1.4, 1.84, 1.4); rod(sq, [0, 0, 0], [-1.2, 0, 0], 0.03, BRONZE); rod(sq, [0, 0, 0], [0, 0, -1.2], 0.03, BRONZE);
    const rej = rbox(scene, 2.4, 1.6, 2.4, 6, 0, 5, mat(0xd8cfbd, { rough: 1, tex: "rock" }), 0.4); rej.rotation.y = 0.5;
    figure(scene, 4, 3.4, { robe: 0x6b5236, cloth: false, beard: true, h: 4, face: Math.PI * 1.2, reach: true, skipFit: true });
    L(labels, [0, 2.6, 0], "The cornerstone", "The first stone, set true at the corner: every wall is lined up from it. “Behold, I am the one who has laid as a foundation in Zion, a stone, a tested stone, a precious cornerstone.”", "Isaiah 28:16");
    L(labels, [6, 2.2, 5], "Rejected by the builders", "“The stone that the builders rejected has become the cornerstone; this is the LORD's doing.” Jesus applied it to himself.", "Psalm 118:22–23; Matthew 21:42");
    L(labels, [6, 2.6, 0], "Living stones", "“You yourselves like living stones are being built up as a spiritual house.”", "1 Peter 2:4–7; Ephesians 2:20–22", true);
    return { view: v3(0.8, 0.6, 1), target: v3(1.5, 1.2, -0.5), zoom: 0.6 };
  },

  "burned-scroll"({ scene, labels }) {
    ground(scene, 20, C.stone);
    // In the winter house, with a fire burning in the brazier, as Jehudi read three or four columns, King Jehoiakim cut
    // them off with a knife and threw them into the fire, until the whole scroll was burned (Jeremiah 36:20-32).
    const br = grp(scene, 0, 0, 0); vessel(br, [[0, 0], [0.5, 0.02], [0.8, 0.5], [0.85, 0.6]], BRONZE, 0, 0.8, 0); [0, 1, 2].forEach((k) => { const a = k / 3 * Math.PI * 2; rod(br, [Math.cos(a) * 0.5, 0.85, Math.sin(a) * 0.5], [Math.cos(a) * 0.7, 0, Math.sin(a) * 0.7], 0.04, BRONZE); });
    [[0, 0], [0.3, 0.2], [-0.2, -0.2]].forEach(([a, b], i) => cone(br, 0.25, 0.8 + i * 0.1, MAT.fire, a, 1.7, b));
    const lt = new THREE.PointLight(0xffa040, 3, 8, 2); lt.position.set(0, 2.2, 0); scene.add(lt);
    const sc = grp(scene, 0.3, 1.9, 0.2, 0.5); sc.rotation.z = 0.6; mesh(sc, new THREE.PlaneGeometry(0.5, 0.7), mat(0x2a2018, { rough: 1, side: THREE.DoubleSide }), 0, 0, 0);
    const k = grp(scene, -1.6, 0, 0.8); rbox(k, 2.4, 1.2, 1.4, 0, 0, 0, MAT.darkWood, 0.1); rbox(k, 2.4, 2.6, 0.3, 0, 1.2, -0.55, MAT.darkWood, 0.1);
    figure(scene, -1.6, 0.8, { robe: 0x5b2c6f, cloth: false, beard: true, h: 4, sit: true, y: 1.1, reach: true, face: -0.6 });
    const knife = grp(scene, -0.4, 2.4, 0.8, 0.5); slab(knife, [[0, -0.02], [0.3, -0.015], [0.4, 0], [0, 0.02]], 0.006, IRON, 0, 0, 0, Math.PI / 2); rod(knife, [-0.15, 0, 0], [0, 0, 0], 0.015, MAT.olive);
    const s2 = scroll(scene, 1.4, 1.4, 1.6, 0.8, 0.5, { text: ["כה אמר יהוה", "…"], rtl: true, size: 40 }); s2.rotation.y = 0.8;
    figure(scene, 1.6, 1.8, { robe: 0x6b7f8c, beard: true, h: 4, reach: true, face: Math.PI * 1.25 });
    L(labels, [0, 3, 0], "Cut off and thrown in the fire", "“As Jehudi read three or four columns, the king would cut them off with a knife and throw them into the fire in the brazier, until the entire scroll was consumed.”", "Jeremiah 36:23");
    L(labels, [1.6, 4.6, 1.8], "Another scroll", "Jeremiah dictated it all again to Baruch, “and many similar words were added to them.” The word of the Lord stands for ever.", "Jeremiah 36:27–32; Isaiah 40:8");
    L(labels, [-1.6, 4.6, 0.8], "In the winter house", "It was the ninth month, December. Neither the king nor his servants were afraid, nor did they tear their garments.", "Jeremiah 36:22–24", true);
    return { view: v3(0.6, 0.5, 1.1), target: v3(0, 1.8, 0.6) };
  },

  "river-from-the-temple"({ scene, labels }) {
    ground(scene, 120, 0xc8b48a, false);
    // Water flowing from below the threshold of the temple, ankle-deep at a thousand cubits, then knee-deep, waist-deep,
    // then a river to swim in; trees on both banks; the Dead Sea made fresh (Ezekiel 47:1-12).
    const t = grp(scene, 0, 0, -40); rbox(t, 20, 18, 14, 0, 0, 0, mat(0xf2ead6, { rough: 0.8, tex: "stone", rep: 2 }), 0.3); t.userData.skipFit = true;
    const pts = []; for (let i = 0; i <= 40; i++) { const tt = i / 40; pts.push([Math.sin(tt * 3) * 6, 0, -33 + tt * 90]); }
    const curve = new THREE.CatmullRomCurve3(pts.map((q) => v3(...q)));
    for (let i = 0; i < 40; i++) { const tt = i / 40, p1 = curve.getPointAt(tt), w = 0.6 + Math.pow(tt, 1.5) * 14; const seg = mesh(scene, new THREE.PlaneGeometry(w, 2.4), MAT.water, p1.x, 0.04, p1.z, -Math.PI / 2); seg.rotation.z = Math.atan2(curve.getTangentAt(tt).x, curve.getTangentAt(tt).z); seg.userData.skipFit = tt > 0.6; seg.userData.noShadow = true; }
    for (let i = 0; i < 12; i++) { const tt = 0.45 + i * 0.045, p1 = curve.getPointAt(tt), w = 0.6 + Math.pow(tt, 1.5) * 14; [-1, 1].forEach((sd) => { const tr = grp(scene, p1.x + sd * (w / 2 + 2), 0, p1.z); tr.userData.skipFit = true; path(tr, [[0, 0, 0], [0, 4, 0]], 0.3, MAT.bark, 6); sph(tr, 2, mat(0x5f8a43, { rough: 0.85 }), 0, 5, 0, 1, 0.8, 1); }); }
    [[0.11, "Ankle-deep", 0.4], [0.22, "Knee-deep", 1.1], [0.33, "Waist-deep", 1.8], [0.44, "Deep enough to swim", 3.6]].forEach(([tt, name, d], i) => {
      const p1 = curve.getPointAt(tt); figure(scene, p1.x, p1.z, { robe: 0x6b5236, beard: true, h: 4, y: -d, face: Math.PI / 2, skipFit: i > 0 });
      L(labels, [p1.x, 5 - d, p1.z], name, ["“…a thousand cubits, and led me through the water, and it was ankle-deep.”", "“Again he measured a thousand, and led me through the water, and it was knee-deep.”", "“Again he measured a thousand… and it was waist-deep.”", "“…a river that I could not pass through, for the water had risen. It was deep enough to swim in.”"][i], "Ezekiel 47:3–5", i > 1); });
    L(labels, [0, 20, -40], "From below the threshold", "Water flowing out from under the threshold of the temple towards the east, a trickle at first.", "Ezekiel 47:1–2");
    L(labels, [6, 8, 30], "Everything will live where the river goes", "“On both banks there will grow all kinds of trees for food. Their leaves will not wither, nor their fruit fail… and their leaves for healing.”", "Ezekiel 47:9, 12", false, "/bible/3d/river-of-life");
    return { view: v3(0.9, 0.6, 0.6), target: v3(0, 2, -12), zoom: 0.8 };
  },

  "daniels-window"({ scene, labels }) {
    ground(scene, 30, C.stone);
    // Daniel went to his house where he had windows in his upper chamber open towards Jerusalem; three times a day he got
    // down on his knees and prayed, as he had done before (Daniel 6:10).
    const h = grp(scene, 0, 0, 0); const pl = mat(0xffffff, { tex: "plaster", rough: 1 });
    rbox(h, 10, 5, 7, 0, 0, 0, pl, 0.1); rbox(h, 7, 4, 6, -1, 5, 0, pl, 0.1);
    mesh(h, new THREE.PlaneGeometry(1.6, 1.8), MAT.black, -1, 7, 3.02);
    for (let i = 0; i < 4; i++) rod(h, [-1.8 + i * 0.53, 6.1, 3.06], [-1.8 + i * 0.53, 7.9, 3.06], 0.03, MAT.darkWood);
    const room = grp(scene, -1, 5, 1.2); rbox(room, 2, 0.04, 1.2, 0, 0.02, 0, mat(0x9b2a2a, { rough: 1, tex: "linen" }), 0.01);
    figure(room, 0, 0.4, { robe: 0xe9e1cf, cloth: 0x8b6f4e, beard: true, h: 3.6, sit: true, raise: true, face: Math.PI / 2 });
    const ray = mesh(scene, new THREE.CylinderGeometry(0.5, 2.2, 14, 16, 1, true), GLOW(0xfff6d8, 0.14), -1, 7, 10, Math.PI / 2, 0, 0); ray.userData.skipFit = true;
    const far = grp(scene, 0, 0, 40); rbox(far, 6, 4, 4, 0, 0, 0, mat(0xe8dcc0, { rough: 1 }), 0.2); far.userData.skipFit = true;
    for (let i = 0; i < 3; i++) figure(scene, 6.5 + i * 1.3, -2, { robe: [0x5b2c6f, 0xa3302a, 0x2d4f8c][i], beard: true, h: 4, face: Math.PI, skipFit: true });
    L(labels, [-1, 9.4, 3], "Windows open towards Jerusalem", "Even after the decree, “he got down on his knees three times a day and prayed and gave thanks before his God, as he had done previously.” As Solomon had prayed, towards the city and the temple.", "Daniel 6:10; 1 Kings 8:48–49");
    L(labels, [7.8, 4.6, -2], "They came by agreement", "His enemies found him making petition before his God, and went to the king.", "Daniel 6:11–13", true, "/bible/3d/lions-den");
    return { view: v3(0.7, 0.35, 1.1), target: v3(0, 5, 1.5) };
  },

  "summer-fruit"({ scene, labels }) {
    plinth(scene, 1.4, 0xd9c9a3);
    // “What do you see, Amos?” “A basket of summer fruit.” “The end has come upon my people Israel” (Amos 8:1-2): a pun on
    // qayits, summer fruit, and qets, end.
    const b = vessel(scene, [[0, 0], [0.4, 0.02], [0.55, 0.25], [0.6, 0.38]], mat(0xc8a46a, { rough: 1, tex: "linen", rep: 3 }), 0, 0, 0); void b;
    tor(scene, 0.6, 0.04, mat(0xa8844a, { rough: 1 }), 0, 0.38, 0);
    const cols = [0x5a3a5a, 0x7a3a5a, 0xa3302a, 0xd8a040, 0x6a8a3a];
    for (let i = 0; i < 26; i++) { const a = i * 2.39996, r = Math.sqrt(i / 26) * 0.48; sph(scene, 0.07 + (i % 3) * 0.015, mat(cols[i % 5], { rough: 0.5 }), Math.cos(a) * r, 0.38 + (0.5 - r) * 0.2 + (i % 2) * 0.04, Math.sin(a) * r, 1, i % 5 === 3 ? 1.3 : 1, 1); }
    L(labels, [0, 0.8, 0], "A basket of summer fruit", "Late figs and pomegranates, the last harvest of the year. “What do you see, Amos?” “A basket of summer fruit (qayits).” “The end (qets) has come upon my people Israel.”", "Amos 8:1–2");
    L(labels, [0.5, 0.4, 0.3], "A famine of hearing", "“Not a famine of bread, nor a thirst for water, but of hearing the words of the LORD.”", "Amos 8:11", true);
    scale(scene, labels, 0.7, -0.6, true);
    return { view: v3(0.3, 0.75, 1) };
  },
};
