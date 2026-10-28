/* Tabernacle and temple: the furnishings, the priests' things, and other altars and
   holy objects. 1 unit = 1 cubit (about 45 cm). */
import {
  THREE, MAT, C, GOLD, BRONZE, SILVER, mat, mesh, grp, sph, cone, tor, rod, path, vessel, slab, rbox, box, cyl, lathe,
  textPlane, textTex, scroll, scale, L, plinth, ground, figure, beast, flame, rock, horn, v3, ref, bush, hill,
} from "./kit.js";

// A small heap of burning wood, used on several altars.
function fire(p, x, y, z, s = 1) {
  const wood = mat(0x5a3b22, { rough: 1 });
  for (let i = 0; i < 6; i++) { const l = mesh(p, new THREE.CylinderGeometry(0.12 * s, 0.12 * s, 2.4 * s, 8), wood, x, y + 0.12 * s + (i % 2) * 0.2 * s, z, 0, i * 0.55, Math.PI / 2); l.userData.noShadow = true; }
  [[0, 0], [0.4, 0.3], [-0.35, -0.3], [0.2, -0.45]].forEach(([a, b], i) => cone(p, 0.38 * s, (1.1 + i * 0.18) * s, MAT.fire, x + a * s, y + (0.75 + i * 0.09) * s, z + b * s));
}

export const MODELS = {
  laver({ scene, labels }) {
    ground(scene, 12, C.sand, false);
    // The laver and its stand, made from the bronze mirrors of the women who served at
    // the entrance (Exodus 38:8). No size is given; this one is about waist high.
    vessel(scene, [[0, 0], [0.9, 0], [0.95, 0.12], [0.55, 0.3], [0.32, 0.6], [0.3, 1.2], [0.45, 1.5], [0.6, 1.62]], BRONZE);
    vessel(scene, [[0, 1.62], [0.9, 1.66], [1.45, 1.86], [1.7, 2.2], [1.78, 2.42], [1.86, 2.46], [1.7, 2.44]], BRONZE);
    const w = mesh(scene, new THREE.CircleGeometry(1.62, 48), MAT.water, 0, 2.3, 0, -Math.PI / 2);
    w.userData.noShadow = true;
    // A polished band round the rim, a reminder of what it was made from.
    tor(scene, 1.79, 0.07, mat(0xe8c79a, { rough: 0.06, metal: 1 }), 0, 2.38, 0);
    L(labels, [0, 2.9, 0], "The laver", "A bronze basin on a bronze stand, between the tent and the altar. The priests washed their hands and feet here before they served, “so that they will not die.”", "Exodus 30:17–21");
    L(labels, [1.9, 2.2, 0.4], "Made from mirrors", "It was made from the bronze mirrors of the women who served at the entrance to the tent of meeting. The Bible gives no size.", "Exodus 38:8", true);
    figure(scene, -2.6, 1.2, { robe: 0xefe9dc, cloth: 0xffffff, band: 0xe8e0cc, face: -0.3, reach: true, skipFit: true });
    L(labels, [-2.6, 4.6, 1.2], "A priest", "The priests wore white linen tunics, sashes and caps.", "Exodus 28:40", true);
    return { view: v3(0.8, 0.7, 1) };
  },

  "bronze-sea"({ scene, labels }) {
    ground(scene, 30, C.stone);
    // The Sea: 10 cubits brim to brim, 5 high, 30 round, a handbreadth thick, its brim like
    // a lily, on twelve bronze oxen facing outwards, three to each quarter (1 Kings 7:23-26).
    for (let i = 0; i < 12; i++) { const a = (Math.floor(i / 3) * Math.PI / 2) + ((i % 3) - 1) * 0.36 + Math.PI / 4; beast(scene, Math.cos(a) * 3.3, Math.sin(a) * 3.3, { color: C.bronze, metal: true, horns: true, s: 1.35, face: -a }); }
    const lip = [[0, 0], [3.0, 0.15], [4.3, 1.4], [4.85, 3.3], [5.0, 4.6], [5.35, 4.95], [5.5, 5.0], [5.1, 4.95], [4.8, 3.5], [4.25, 1.6], [0, 0.4]];
    vessel(scene, lip, mat(C.bronze, { rough: 0.32, metal: 0.92 }), 0, 3.05, 0, 72);
    // Two rows of gourds cast with it, below the brim (1 Kings 7:24).
    for (let r = 0; r < 2; r++) for (let i = 0; i < 40; i++) { const a = i / 40 * Math.PI * 2 + r * 0.08; sph(scene, 0.13, BRONZE, Math.cos(a) * (4.92 + r * 0.04), 3.05 + 3.8 + r * 0.38, Math.sin(a) * (4.92 + r * 0.04), 1, 0.8, 1); }
    const w = mesh(scene, new THREE.CircleGeometry(4.95, 64), MAT.water, 0, 7.75, 0, -Math.PI / 2); w.userData.noShadow = true;
    L(labels, [0, 9.3, 0], "The Sea", "10 cubits across (about 4.5 m) and 5 high, cast in bronze, holding 2,000 baths of water (2 Chronicles says 3,000), about 44,000 litres. The priests washed in it.", "1 Kings 7:23–26");
    L(labels, [4.6, 2.6, 0], "Twelve oxen", "Three facing north, three west, three south and three east, with their hindquarters towards the centre.", "1 Kings 7:25");
    L(labels, [-5.2, 7.2, 0], "A brim like a lily", "A handbreadth thick, with a rim turned out like the cup of a lily, and two rows of gourds below it.", "1 Kings 7:24–26", true);
    scale(scene, labels, 7, 6);
    return { view: v3(0.9, 0.55, 1) };
  },

  "temple-stand"({ scene, labels }) {
    ground(scene, 14, C.stone);
    // One of ten bronze stands: 4 cubits long, 4 wide, 3 high, on four wheels 1.5 cubits high,
    // panels with lions, oxen and cherubim, holding a basin of 40 baths (1 Kings 7:27-39).
    const s = grp(scene, 0, 0, 0);
    const y0 = 1.2;
    rbox(s, 4, 3, 4, 0, y0, 0, mat(C.bronze, { rough: 0.38, metal: 0.9 }), 0.06);
    // Panels with figures in relief.
    const panelM = mat(0x9a5f35, { rough: 0.45, metal: 0.85 });
    [[0, 2.02, 0], [2.02, 0, Math.PI / 2], [0, -2.02, Math.PI], [-2.02, 0, -Math.PI / 2]].forEach(([x, z, ry]) => {
      const pg = grp(s, x, y0 + 1.5, z, ry);
      mesh(pg, new THREE.BoxGeometry(3.3, 2.3, 0.06), panelM);
      beast(pg, -0.9, 0.08, { color: C.bronze, metal: true, mane: 1, s: 0.32, y: -0.8 });
      beast(pg, 0.55, 0.08, { color: C.bronze, metal: true, horns: true, s: 0.32, y: -0.8 });
      // A cherub: wings raised.
      slab(pg, [[-0.25, -0.4], [0.25, -0.4], [0.5, 0.6], [0.1, 0.25], [0, 0.5], [-0.1, 0.25], [-0.5, 0.6]], 0.05, BRONZE, 1.25, 0.1, 0.06);
    });
    // Corners, axles and four wheels like chariot wheels (7:30-33).
    [[-2, -2], [-2, 2], [2, -2], [2, 2]].forEach(([x, z]) => mesh(s, new THREE.CylinderGeometry(0.18, 0.18, 3.6, 12), BRONZE, x, y0 + 1.3, z));
    [-1.55, 1.55].forEach((x) => {
      rod(s, [x, 0.75, -2.4], [x, 0.75, 2.4], 0.08, BRONZE);
      [-2.25, 2.25].forEach((z) => {
        const wh = grp(s, x, 0.75, z); wh.rotation.x = Math.PI / 2;
        mesh(wh, new THREE.TorusGeometry(0.68, 0.07, 10, 32), BRONZE, 0, 0, 0, Math.PI / 2);
        for (let i = 0; i < 6; i++) rod(wh, [0, 0, 0], [Math.cos(i * Math.PI / 3) * 0.68, 0, Math.sin(i * Math.PI / 3) * 0.68], 0.04, BRONZE);
        mesh(wh, new THREE.CylinderGeometry(0.12, 0.12, 0.2, 16), BRONZE);
      });
    });
    // The round mouth on top and the basin, 4 cubits across (7:35, 38).
    mesh(s, new THREE.CylinderGeometry(0.75, 0.9, 0.5, 32), BRONZE, 0, y0 + 3.25, 0);
    vessel(s, [[0, 0], [0.8, 0.05], [1.5, 0.45], [1.9, 1.0], [2.02, 1.12], [1.9, 1.1]], mat(C.bronze, { rough: 0.3, metal: 0.92 }), 0, y0 + 3.45, 0, 56);
    const w = mesh(s, new THREE.CircleGeometry(1.85, 48), MAT.water, 0, y0 + 4.48, 0, -Math.PI / 2); w.userData.noShadow = true;
    L(labels, [0, 5.4, 0], "A basin of 40 baths", "Each stand carried a bronze basin 4 cubits across holding 40 baths, about 880 litres, for rinsing the burnt offerings.", "1 Kings 7:38; 2 Chronicles 4:6");
    L(labels, [0, 2.8, 2.2], "Lions, oxen and cherubim", "Cast on the panels between the uprights, with wreaths of hammered work.", "1 Kings 7:29, 36");
    L(labels, [1.6, 1.6, 2.6], "Wheels like a chariot's", "Four bronze wheels 1.5 cubits high (about 70 cm), with axles, rims, spokes and hubs all cast.", "1 Kings 7:30–33", true);
    L(labels, [-2.1, 4.2, -2.1], "One of ten", "Hiram of Tyre made ten of these: five stood on the south side of the temple and five on the north.", "1 Kings 7:37–39", true);
    scale(scene, labels, 5, 4);
    return { view: v3(1, 0.6, 1.1) };
  },

  "silver-trumpets"({ scene, labels }) {
    plinth(scene, 2.2);
    // Two trumpets of hammered silver, for calling the people and setting out (Numbers 10:1-10).
    // Josephus says a little under a cubit long; the Arch of Titus shows long straight trumpets.
    [-0.28, 0.28].forEach((z, i) => {
      const t = grp(scene, 0, 0.09, z, i ? 0.08 : -0.06);
      mesh(t, new THREE.CylinderGeometry(0.022, 0.018, 1.8, 16), SILVER, 0, 0, 0, 0, 0, Math.PI / 2);
      vessel(t, [[0.03, 0], [0.05, 0.12], [0.1, 0.22], [0.2, 0.28]], SILVER, 0.9, 0, 0).rotation.z = -Math.PI / 2;
      vessel(t, [[0.0, 0], [0.05, 0.01], [0.04, 0.05], [0.025, 0.08]], SILVER, -0.9, 0, 0).rotation.z = Math.PI / 2;
      [-0.4, 0.2].forEach((x) => mesh(t, new THREE.TorusGeometry(0.03, 0.008, 8, 20), SILVER, x, 0, 0, 0, Math.PI / 2));
    });
    L(labels, [0, 0.45, 0], "Two silver trumpets", "Hammered out of silver. One blast called the leaders; two called the whole people; a short blast meant set out. They were blown over the offerings at the feasts too.", "Numbers 10:1–10");
    L(labels, [0.95, 0.4, 0.3], "A long straight horn", "The Bible gives no size. Josephus says just under a cubit; the Arch of Titus in Rome shows longer ones, carried away from the temple in AD 70.", "Numbers 10:2", true);
    scale(scene, labels, 0.6, 1.1, true);
    return { view: v3(0.6, 0.6, 1) };
  },

  shofar({ scene, labels }) {
    plinth(scene, 1.4);
    // A ram's horn: twisting, widening to the bell.
    const pts = []; for (let i = 0; i <= 30; i++) { const t = i / 30; pts.push([Math.sin(t * 2.2) * 0.55 - t * 0.4, 0.12 + t * 0.32 + Math.sin(t * 5) * 0.03, Math.cos(t * 2.2) * 0.2 - 0.2]); }
    const curve = new THREE.CatmullRomCurve3(pts.map((q) => new THREE.Vector3(...q)));
    const geo = new THREE.TubeGeometry(curve, 80, 1, 18, false);
    const pos = geo.attributes.position, n = 19;
    for (let i = 0; i <= 80; i++) { const t = i / 80, r = 0.025 + Math.pow(t, 1.8) * 0.14, c = curve.getPointAt(t);
      for (let j = 0; j < n; j++) { const k = i * n + j; const v = new THREE.Vector3(pos.getX(k), pos.getY(k), pos.getZ(k)).sub(c).normalize().multiplyScalar(r).add(c); pos.setXYZ(k, v.x, v.y, v.z); } }
    geo.computeVertexNormals();
    mesh(scene, geo, mat(0xc8a878, { rough: 0.55 }));
    const end = curve.getPointAt(1);
    const mouth = mesh(scene, new THREE.CircleGeometry(0.16, 20), MAT.black, end.x, end.y, end.z); mouth.lookAt(end.clone().add(curve.getTangentAt(1)));
    L(labels, [0, 0.75, 0], "A ram's horn", "The shofar: Israel's horn, sounded for war, for the new moon and the Day of Atonement, and when the walls of Jericho fell.", "Joshua 6:4–5");
    L(labels, [-0.5, 0.3, 0.2], "The trumpet sound", "It was blown on the Day of Atonement to begin the year of jubilee, when slaves went free and land went home.", "Leviticus 25:9–10", true);
    scale(scene, labels, 0.75, 0.6, true);
    return { view: v3(0.3, 0.6, 1) };
  },

  censer({ scene, labels }) {
    plinth(scene, 1.3);
    // A firepan full of coals from the altar, with two handfuls of incense (Leviticus 16:12).
    // Hebrews 9:4 and Revelation 8:3 speak of a golden censer.
    const pan = grp(scene, 0, 0.08, 0);
    vessel(pan, [[0, 0], [0.28, 0], [0.33, 0.09], [0.35, 0.12]], GOLD);
    rod(pan, [0.3, 0.08, 0], [1.05, 0.2, 0], 0.025, GOLD);
    sph(pan, 0.04, GOLD, 1.06, 0.2, 0);
    [[0, 0], [0.1, 0.08], [-0.1, -0.06], [0.08, -0.1], [-0.12, 0.1], [0.15, -0.02]].forEach(([x, z], i) => sph(pan, 0.07, i % 2 ? MAT.ember : mat(0x2a1d16, { rough: 1 }), x, 0.1, z, 1, 0.6, 1));
    const smoke = mat(0xffffff, { opacity: 0.22, rough: 1 });
    [[0, 0.32, 0, 0.1], [0.04, 0.52, 0.02, 0.13], [-0.03, 0.75, -0.02, 0.16], [0.03, 1.0, 0, 0.19]].forEach(([x, y, z, r]) => { const s = sph(scene, r, smoke, x, y, z); s.userData.noShadow = true; });
    L(labels, [0, 1.3, 0], "Coals and incense", "On the Day of Atonement Aaron took a censer full of burning coals from the altar and two handfuls of incense behind the veil, so the cloud covered the mercy seat.", "Leviticus 16:12–13");
    L(labels, [0.8, 0.35, 0], "A golden censer", "In heaven an angel stands at the altar with a golden censer, and the smoke of the incense goes up with the prayers of the saints.", "Revelation 8:3–4", true);
    scale(scene, labels, -0.3, 0.75, true);
    return { view: v3(0.6, 0.7, 1) };
  },

  "jar-of-manna"({ scene, labels }) {
    plinth(scene, 1.2, 0xd9c9a3);
    // A golden jar holding an omer of manna, kept before the testimony (Exodus 16:33-34; Hebrews 9:4).
    vessel(scene, [[0, 0], [0.16, 0], [0.2, 0.05], [0.26, 0.2], [0.27, 0.35], [0.2, 0.5], [0.13, 0.56], [0.13, 0.62], [0.17, 0.66], [0.15, 0.67]], GOLD);
    for (let i = 0; i < 26; i++) { const a = i * 2.39, r = 0.05 + (i % 5) * 0.012; sph(scene, 0.022, mat(0xf2ead2, { rough: 0.8 }), Math.cos(a) * r, 0.63 + (i % 3) * 0.012, Math.sin(a) * r, 1, 0.5, 1); }
    // Manna on the ground, like coriander seed, white (Exodus 16:14, 31).
    for (let i = 0; i < 160; i++) { const a = i * 2.39996, r = 0.45 + (i % 23) / 23 * 0.6; sph(scene, 0.018, mat(0xf5f0e2, { rough: 0.8 }), Math.cos(a) * r, 0.005, Math.sin(a) * r, 1, 0.45, 1); }
    L(labels, [0, 0.9, 0], "A jar of manna", "An omer of manna kept for the generations to come, so they would see the bread God fed them with in the wilderness. Hebrews says the jar was gold.", "Exodus 16:32–34; Hebrews 9:4");
    L(labels, [0.7, 0.12, 0.4], "Like coriander seed", "White, tasting like wafers made with honey. It lay on the ground each morning for forty years.", "Exodus 16:14, 31, 35", true);
    scale(scene, labels, -0.75, 0.55, true);
    return { view: v3(0.7, 0.75, 1) };
  },

  "aarons-rod"({ scene, labels }) {
    plinth(scene, 1.6, 0xd9c9a3);
    // Aaron's staff had budded, blossomed and produced almonds overnight (Numbers 17:8).
    const pts = [[0, 0.05, 0], [0.04, 0.8, 0.02], [-0.02, 1.6, -0.01], [0.02, 2.5, 0.02], [0, 3.1, 0]];
    const rodG = grp(scene, 0, 0, 0); rodG.rotation.z = -1.38; rodG.position.set(-1.55, 0.06, 0);
    path(rodG, pts, 0.04, mat(0x7a5a3a, { rough: 0.85 }), 40);
    const bloom = mat(0xfbeef0, { rough: 0.8 }), pink = mat(0xe9a8b8, { rough: 0.8 }), bud = mat(0x8faa5a, { rough: 0.8 }), nut = mat(0x9a7a4e, { rough: 0.7 });
    for (let i = 0; i < 18; i++) {
      const t = 0.15 + i / 18 * 0.85, y = t * 3.1, a = i * 2.2, x = Math.cos(a) * 0.06, z = Math.sin(a) * 0.06;
      const kind = i % 3;
      if (kind === 0) { for (let k = 0; k < 5; k++) { const pa = k / 5 * Math.PI * 2; sph(rodG, 0.05, bloom, x + Math.cos(pa) * 0.05, y, z + Math.sin(pa) * 0.05, 1, 0.4, 1); } sph(rodG, 0.025, pink, x, y + 0.01, z); }
      else if (kind === 1) sph(rodG, 0.04, bud, x, y, z, 0.8, 1.3, 0.8);
      else sph(rodG, 0.06, nut, x, y, z, 0.7, 1.15, 0.6);
      rod(rodG, [0, y - 0.03, 0], [x, y, z], 0.008, bud);
    }
    L(labels, [0, 0.55, 0], "The rod that budded", "Twelve staffs were left before the testimony, one for each tribe. By morning Aaron's had sprouted, budded, blossomed and borne ripe almonds.", "Numbers 17:1–10");
    L(labels, [0.9, 0.4, 0.2], "Buds, flowers and almonds", "All three at once on one dead stick: a sign of whom God had chosen. It was kept in the ark.", "Hebrews 9:4", true);
    scale(scene, labels, 0.6, 0.9, true);
    return { view: v3(0.35, 0.75, 1) };
  },

  tablets({ scene, labels }) {
    plinth(scene, 1.6, 0xd9c9a3);
    // Two tablets of stone, written on both sides by the finger of God (Exodus 31:18; 32:15-16).
    // Their size isn't given. Shown with the first letters of the Ten Words in Hebrew.
    const st = mat(0xa9a196, { tex: "rock", rough: 0.95 });
    const nums = [["א", "ב", "ג", "ד", "ה"], ["ו", "ז", "ח", "ט", "י"]];
    [-0.36, 0.36].forEach((x, i) => {
      const g = grp(scene, x, 0, 0, i ? -0.12 : 0.12);
      g.rotation.x = -0.12;
      const shape = [[-0.32, 0], [0.32, 0], [0.32, 0.72], ...Array.from({ length: 13 }, (_, k) => { const a = k / 12 * Math.PI; return [Math.cos(a) * 0.32, 0.72 + Math.sin(a) * 0.2]; }), [-0.32, 0.72]];
      slab(g, shape, 0.12, st, 0, 0.02, 0, 0, 0, 0, 0.015);
      textPlane(g, nums[i], 0.44, 0.74, 0, 0.5, 0.082, { bg: null, transparent: true, ink: "#3b352e", h: 1024, w: 512, size: 150, font: "'Times New Roman', serif" });
    });
    L(labels, [0, 1.25, 0], "Two tablets of stone", "Written on both sides by the finger of God. Moses broke the first pair at the golden calf, and God wrote the words again on two new ones.", "Exodus 32:15–19; 34:1");
    L(labels, [0.65, 0.5, 0.2], "The Ten Words", "Shown here by the Hebrew letters for one to ten. The commandments are listed in Exodus 20 and Deuteronomy 5.", "Exodus 20:1–17", true);
    L(labels, [-0.65, 0.3, 0.2], "Kept in the ark", "The tablets were laid in the ark of the covenant.", "Deuteronomy 10:1–5", true, "/bible/3d/ark-of-the-covenant");
    scale(scene, labels, 0.95, 0.75, true);
    return { view: v3(0.25, 0.45, 1) };
  },

  "high-priest"({ scene, labels }) {
    ground(scene, 10, C.sand, false);
    // Aaron in the garments for glory and beauty (Exodus 28; 39).
    const g = grp(scene, 0, 0, 0);
    const lin = mat(0xf6f2e8, { tex: "linen", rough: 1, rep: 3 });
    // Tunic of fine linen to the ankles.
    vessel(g, [[0, 0], [0.62, 0], [0.62, 0.15], [0.55, 0.8], [0.5, 1.6]], lin);
    // The robe of the ephod, all blue, to below the knee, with pomegranates and gold bells round the hem (28:31-35).
    vessel(g, [[0.67, 0.55], [0.66, 0.65], [0.56, 1.4], [0.46, 2.0], [0.48, 2.5], [0.5, 2.75], [0.3, 2.9], [0, 2.95]], mat(0x24448a, { rough: 0.9, tex: "linen", rep: 3 }));
    for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2; const r = 0.69;
      if (i % 2) sph(g, 0.045, GOLD, Math.cos(a) * r, 0.52, Math.sin(a) * r);
      else sph(g, 0.05, [MAT.blue, MAT.purple, MAT.scarlet][i / 2 % 3], Math.cos(a) * r, 0.5, Math.sin(a) * r, 1, 1.25, 1); }
    // The ephod: an apron of gold, blue, purple, scarlet and linen, with a woven band (28:6-8).
    const eph = mat(0xffffff, { rough: 0.6, metal: 0.25 });
    const c = document.createElement("canvas"); c.width = 64; c.height = 64; const cx = c.getContext("2d");
    ["#c9a240", "#2d4f8c", "#5b2c6f", "#b3202a", "#f2ede0"].forEach((col, i) => { cx.fillStyle = col; cx.fillRect(0, i * 13, 64, 13); });
    eph.map = new THREE.CanvasTexture(c); eph.map.colorSpace = THREE.SRGBColorSpace;
    vessel(g, [[0.515, 1.1], [0.47, 1.6], [0.45, 2.0], [0.48, 2.45], [0.505, 2.65]], eph);
    tor(g, 0.465, 0.05, GOLD, 0, 1.92, 0);
    // Onyx stones on the shoulders, engraved with the names of the tribes (28:9-12).
    [-1, 1].forEach((sd) => { sph(g, 0.08, mat(0x2a2a2a, { rough: 0.1 }), 0.05, 2.78, sd * 0.36, 1, 0.7, 1); tor(g, 0.085, 0.015, GOLD, 0.05, 2.78, sd * 0.36, 0, 0); });
    // The breastplate, a span square, twelve stones.
    const bp = grp(g, 0.45, 2.38, 0, Math.PI / 2);
    mesh(bp, new THREE.BoxGeometry(0.42, 0.42, 0.04), GOLD);
    const cols = [0xb3122e, 0xd9b44a, 0x1f8a4c, 0x3fb8b0, 0x1f4fb3, 0xe8f1f5, 0xd9721e, 0x9b6b4f, 0x8a4fb8, 0x9fd8c4, 0x2a2a2a, 0x8f2f2a];
    cols.forEach((col, i) => mesh(bp, new THREE.BoxGeometry(0.09, 0.075, 0.03), new THREE.MeshStandardMaterial({ color: col, roughness: 0.15 }), ((i % 3) - 1) * 0.125, (1.5 - Math.floor(i / 3)) * 0.095, 0.03));
    // Head, hands, beard and the turban with the gold plate (28:36-39).
    const skin = mat(0xa8714a, { rough: 0.7 });
    mesh(g, new THREE.CylinderGeometry(0.13, 0.15, 0.25, 12), skin, 0, 3.0, 0);
    sph(g, 0.3, skin, 0, 3.4, 0, 0.92, 1.1, 0.95);
    const bd = mesh(g, new THREE.SphereGeometry(0.24, 14, 10, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.55), mat(0x8c8a86, { rough: 1 }), 0.1, 3.28, 0); bd.scale.set(0.9, 1.3, 1);
    vessel(g, [[0.3, 3.5], [0.34, 3.62], [0.36, 3.8], [0.3, 3.92], [0.12, 3.97], [0, 3.97]], lin);
    for (let i = 0; i < 4; i++) tor(g, 0.33 - i * 0.015, 0.035, lin, 0, 3.6 + i * 0.08, 0);
    const plate = grp(g, 0.33, 3.68, 0, Math.PI / 2);
    mesh(plate, new THREE.BoxGeometry(0.34, 0.1, 0.012), GOLD);
    textPlane(plate, ["קֹדֶשׁ לַיהוָה"], 0.3, 0.08, 0, 0, 0.008, { bg: "#d8ac48", ink: "#3d2a08", w: 512, h: 128, size: 70, font: "'Times New Roman', serif" });
    rod(g, [0.3, 3.68, 0.17], [0.0, 3.75, 0.33], 0.012, MAT.blue);
    [-1, 1].forEach((sd) => { const a = grp(g, 0, 2.7, sd * 0.5); path(a, [[0, 0, 0], [0.15, -0.6, sd * 0.06], [0.45, -0.95, sd * 0.02]], 0.12, mat(0x24448a, { rough: 0.9 }), 12); sph(a, 0.1, skin, 0.5, -1.0, sd * 0.02); });
    g.rotation.y = -0.5;
    L(labels, [0.2, 4.35, 0], "Holy to the LORD", "A plate of pure gold on the front of the turban, engraved like a seal, tied on with a blue cord, so Aaron bore the guilt of the people's holy gifts.", "Exodus 28:36–38");
    L(labels, [0.4, 2.7, 0.3], "The breastplate", "Twelve stones for the twelve tribes, over Aaron's heart, with the Urim and Thummim inside.", "Exodus 28:15–30", false, "/bible/3d/breastplate");
    L(labels, [0.3, 1.95, -0.4], "The ephod", "Gold, blue, purple and scarlet yarn and fine twisted linen, with a skilfully woven band.", "Exodus 28:6–8", true);
    L(labels, [0.5, 0.75, 0.4], "Bells and pomegranates", "A gold bell and a pomegranate all round the hem of the blue robe, so his sound was heard when he went into the Holy Place.", "Exodus 28:33–35", true);
    L(labels, [-0.2, 2.95, -0.45], "Onyx shoulder stones", "Two onyx stones engraved with the names of the sons of Israel, six on each, a memorial before the LORD.", "Exodus 28:9–12", true);
    return { view: v3(1, 0.3, 0.6) };
  },

  "anointing-horn"({ scene, labels }) {
    plinth(scene, 1.0);
    // Samuel took the horn of oil and anointed David (1 Samuel 16:13).
    const curve = new THREE.CatmullRomCurve3([v3(-0.35, 0.09, 0), v3(-0.1, 0.12, 0.03), v3(0.15, 0.2, 0), v3(0.32, 0.33, -0.02)]);
    const geo = new THREE.TubeGeometry(curve, 40, 1, 16, false), pos = geo.attributes.position;
    for (let i = 0; i <= 40; i++) { const t = i / 40, r = 0.018 + t * 0.07, c = curve.getPointAt(t);
      for (let j = 0; j < 17; j++) { const k = i * 17 + j; const vv = v3(pos.getX(k), pos.getY(k), pos.getZ(k)).sub(c).normalize().multiplyScalar(r).add(c); pos.setXYZ(k, vv.x, vv.y, vv.z); } }
    geo.computeVertexNormals();
    mesh(scene, geo, mat(0xdcc49a, { rough: 0.4 }));
    const end = curve.getPointAt(1);
    const top = mesh(scene, new THREE.CircleGeometry(0.085, 20), MAT.oil, end.x, end.y, end.z); top.lookAt(end.clone().add(curve.getTangentAt(1)));
    mesh(scene, new THREE.CylinderGeometry(0.02, 0.025, 0.05, 12), MAT.leatherDark, -0.37, 0.09, 0, 0, 0, Math.PI / 2);
    L(labels, [0, 0.5, 0], "A horn of oil", "Samuel filled his horn with oil and anointed David among his brothers, “and the Spirit of the LORD rushed upon David from that day forward.”", "1 Samuel 16:13");
    L(labels, [0.35, 0.25, 0.15], "The anointing oil", "The holy anointing oil was myrrh, cinnamon, cane and cassia in olive oil.", "Exodus 30:22–33", true);
    scale(scene, labels, -0.3, -0.35, true);
    return { view: v3(0.3, 0.6, 1) };
  },

  "bronze-serpent"({ scene, labels }) {
    ground(scene, 30, C.sand, false);
    rock(scene, 1.2, 4, 0.4, -3); rock(scene, 0.8, -5, 0.3, 2);
    // Moses made a bronze snake and put it on a pole (Numbers 21:8-9; John 3:14).
    mesh(scene, new THREE.CylinderGeometry(0.1, 0.12, 9, 12), mat(0x7a5a3a, { rough: 0.9 }), 0, 4.5, 0);
    rod(scene, [-0.8, 8.4, 0], [0.8, 8.4, 0], 0.08, mat(0x7a5a3a, { rough: 0.9 }));
    const pts = []; for (let i = 0; i <= 40; i++) { const t = i / 40; pts.push([Math.sin(t * Math.PI * 5) * 0.32 * (1 - t * 0.25), 3.6 + t * 5.3, Math.cos(t * Math.PI * 5) * 0.32 * (1 - t * 0.25)]); }
    const curve = new THREE.CatmullRomCurve3(pts.map((q) => v3(...q)));
    const geo = new THREE.TubeGeometry(curve, 160, 1, 12, false), pos = geo.attributes.position;
    for (let i = 0; i <= 160; i++) { const t = i / 160, r = 0.04 + Math.sin(Math.min(t, 0.93) / 0.93 * Math.PI * 0.85) * 0.09, c = curve.getPointAt(t);
      for (let j = 0; j < 13; j++) { const k = i * 13 + j; const vv = v3(pos.getX(k), pos.getY(k), pos.getZ(k)).sub(c).normalize().multiplyScalar(r).add(c); pos.setXYZ(k, vv.x, vv.y, vv.z); } }
    geo.computeVertexNormals();
    mesh(scene, geo, mat(C.bronze, { rough: 0.35, metal: 0.9 }));
    sph(scene, 0.15, BRONZE, 0.3, 9.0, 0.1, 1.4, 0.8, 1);
    L(labels, [0, 9.8, 0], "The bronze serpent", "When venomous snakes bit the people, God told Moses to set a bronze serpent on a pole: anyone who was bitten and looked at it lived.", "Numbers 21:4–9");
    L(labels, [0.6, 6.2, 0], "Lifted up", "“As Moses lifted up the serpent in the wilderness, so must the Son of Man be lifted up, that whoever believes in him may have eternal life.”", "John 3:14–15");
    L(labels, [-0.5, 4.5, 0], "Nehushtan", "Centuries later Israel was burning incense to it, so Hezekiah broke it in pieces.", "2 Kings 18:4", true);
    people(scene, labels);
    return { view: v3(1, 0.4, 1) };
  },

  "golden-calf"({ scene, labels }) {
    ground(scene, 30, C.sand, false);
    hill(scene, 18, -20, -18, 16, 0xa3907a);
    // Aaron fashioned the gold with a tool and made a calf, and built an altar before it (Exodus 32:1-6).
    rbox(scene, 3.4, 2, 2.2, 0, 0, 0, MAT.stone, 0.15);
    beast(scene, -0.3, 0, { color: C.gold, metal: true, horns: true, s: 0.85, y: 2 });
    for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI; rock(scene, 0.35, 4.5 + Math.cos(a) * 0.7, 0.3, 2.5 + Math.sin(a) * 0.4, 0xb6aa92); }
    fire(scene, 4.5, 0.6, 2.5, 0.5);
    figure(scene, 6, -3, { robe: 0x6f5a3e, beard: true, face: 2.6, skipFit: true });
    figure(scene, 7.5, -1, { robe: 0x7a5a6a, face: 2.9, raise: true, skipFit: true });
    L(labels, [0, 4.8, 0], "The golden calf", "While Moses was on the mountain, the people gave Aaron their gold earrings and he made a calf. “These are your gods, O Israel, who brought you up out of Egypt.”", "Exodus 32:1–6");
    L(labels, [4.5, 2.3, 2.5], "An altar before it", "Aaron built an altar and proclaimed a feast. Moses came down, broke the tablets, burned the calf and ground it to powder.", "Exodus 32:5, 19–20", true);
    return { view: v3(0.9, 0.5, 1), target: v3(1.5, 2, 0) };
  },

  "altar-of-stones"({ scene, labels }) {
    ground(scene, 30, 0xb8ad7c, false);
    // An altar of earth, or of uncut stones, with no steps (Exodus 20:24-26; Joshua 8:30-31).
    const R = (s) => () => (s = (s * 16807) % 2147483647) / 2147483647; const rr = R(7);
    for (let lay = 0; lay < 5; lay++) {
      const n = 14 - lay * 2;
      for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + lay * 0.3, r = 2.2 - lay * 0.32; rock(scene, 0.55 - lay * 0.04, Math.cos(a) * r, 0.4 + lay * 0.7, Math.sin(a) * r, [0xbcae95, 0xa89a82, 0xc9bda4][i % 3], 1.15, 0.8, 1); }
      if (lay < 4) mesh(scene, new THREE.CylinderGeometry(2.2 - lay * 0.32, 2.3 - lay * 0.32, 0.7, 20), mat(0x9d8f78, { rough: 1, tex: "rock" }), 0, 0.35 + lay * 0.7, 0);
    }
    fire(scene, 0, 3.3, 0, 0.7);
    void rr;
    L(labels, [0, 5.4, 0], "Uncut stones", "“If you make me an altar of stone, do not build it of hewn stones, for if you wield your tool on it you profane it.” No steps either.", "Exodus 20:24–26");
    L(labels, [2.4, 2.2, 0.6], "Joshua's altar on Mount Ebal", "Built of uncut stones, just as Moses commanded, where Israel renewed the covenant.", "Joshua 8:30–35", true);
    scale(scene, labels, -3.5, -2.5);
    return { view: v3(1, 0.55, 1) };
  },

  "elijahs-altar"({ scene, labels }) {
    ground(scene, 40, 0xb8ad7c, false);
    hill(scene, 30, 0, -40, 14, 0x8f9a62);
    // Twelve stones, a trench, wood, the bull, and water poured three times (1 Kings 18:30-38).
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; rock(scene, 0.8, Math.cos(a) * 1.75, 0.6 + (i % 2) * 0.25, Math.sin(a) * 1.25, 0xb6aa92, 1, 0.85, 1); }
    mesh(scene, new THREE.CylinderGeometry(1.55, 1.75, 1.6, 24), mat(0xa89a82, { tex: "rock", rough: 1 }), 0, 0.8, 0).scale.z = 0.72;
    const tr = mesh(scene, new THREE.TorusGeometry(2.9, 0.38, 10, 48), MAT.water, 0, 0.02, 0, Math.PI / 2); tr.scale.y = 0.75; tr.userData.noShadow = true;
    const wood = mat(0x6b4a2b, { rough: 1 });
    for (let i = 0; i < 7; i++) mesh(scene, new THREE.CylinderGeometry(0.1, 0.1, 2.6, 8), wood, 0, 1.75 + (i % 2) * 0.18, -0.6 + i * 0.2, 0, (i % 2) * 0.3, Math.PI / 2);
    beast(scene, -0.9, 0, { color: 0x6a3f2a, horns: true, s: 0.6, y: 1.9 });
    // Fire from heaven.
    const col = mesh(scene, new THREE.CylinderGeometry(0.6, 1.6, 9, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0xffb340, transparent: true, opacity: 0.55, side: THREE.DoubleSide }), 0, 7, 0);
    col.userData.noShadow = true; col.userData.skipFit = true;
    [[0, 0], [0.5, 0.3], [-0.4, -0.3], [0.3, -0.4], [-0.3, 0.4]].forEach(([a, b], i) => cone(scene, 0.55, 1.8 + i * 0.3, MAT.fire, a, 3.2, b));
    figure(scene, 4.5, 2.5, { robe: 0x6b5236, cloth: 0x8a7656, beard: true, raise: true, face: Math.PI * 1.15, skipFit: true });
    L(labels, [0, 5.4, 0], "The fire of the LORD fell", "It consumed the offering, the wood, the stones and the dust, and licked up the water in the trench. “The LORD, he is God!”", "1 Kings 18:36–39");
    L(labels, [1.9, 1.6, 0.9], "Twelve stones", "One for each of the tribes of the sons of Jacob, rebuilding the altar of the LORD that had been torn down.", "1 Kings 18:30–32");
    L(labels, [3.2, 0.5, 0], "The trench", "Big enough to hold two seahs of seed. Elijah had four jars of water poured on the offering three times, until the trench overflowed.", "1 Kings 18:32–35", true);
    L(labels, [4.5, 4.8, 2.5], "Elijah", "On Mount Carmel, against 450 prophets of Baal.", "1 Kings 18:20–40", true);
    return { view: v3(1, 0.55, 1.1), target: v3(0.8, 2, 0.4) };
  },

  "memorial-stones"({ scene, labels }) {
    ground(scene, 40, 0xb8ad7c, false);
    // Twelve stones from the middle of the Jordan, set up at Gilgal (Joshua 4:1-9, 19-24).
    const w = mesh(scene, new THREE.PlaneGeometry(80, 7), MAT.water, 0, 0.05, -14, -Math.PI / 2); w.userData.skipFit = true; w.userData.noShadow = true;
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; rock(scene, 0.7, Math.cos(a) * 2.1, 0.55, Math.sin(a) * 2.1, [0xb6aa92, 0xa89a82, 0xc4b79e][i % 3], 1, 1.25, 0.9); }
    rock(scene, 0.95, 0, 2.1, 0, 0xc4b79e, 1, 1.4, 1);
    for (let i = 0; i < 4; i++) rock(scene, 0.7, -0.8 + (i % 2) * 1.6, 1.0, -0.7 + Math.floor(i / 2) * 1.4, 0xb0a48c);
    figure(scene, -3.5, -2, { robe: 0x8b6f4e, face: 0.3, skipFit: true });
    figure(scene, -3.2, -3.4, { robe: 0x5d7a5a, face: 0.5, h: 3, skipFit: true });
    L(labels, [0, 4.2, 0], "Twelve stones", "Each tribe carried one stone on their shoulders out of the riverbed where the priests stood with the ark.", "Joshua 4:1–8");
    L(labels, [-3.4, 4.6, -2.6], "What do these stones mean?", "“When your children ask… tell them, Israel crossed the Jordan on dry ground.” A memorial so all the earth would know the hand of the LORD.", "Joshua 4:21–24");
    L(labels, [0, 1, -12], "The Jordan", "In flood at harvest time, it stood up in a heap as soon as the priests' feet touched the water.", "Joshua 3:14–17", true);
    return { view: v3(1, 0.55, 1.1) };
  },

  "jacobs-pillar"({ scene, labels }) {
    ground(scene, 30, C.sand, false);
    rock(scene, 3, -10, 1, -8, 0xb9ad96, 1.6, 0.7, 1.2).userData.skipFit = true;
    // Jacob set up the stone he had slept on as a pillar and poured oil on it (Genesis 28:18-22).
    const p = rock(scene, 0.75, 0, 1.6, 0, 0xc0b39a, 0.9, 2.3, 0.8);
    void p;
    const oil = mat(0x8a7a2a, { rough: 0.05, metal: 0.2 });
    [[0.1, 3.25, 0.05], [0.4, 2.6, 0.45], [0.55, 1.7, 0.4]].forEach(([x, y, z], i) => sph(scene, 0.12 - i * 0.02, oil, x, y, z, 1, 2, 1));
    const flask = vessel(scene, [[0, 0], [0.09, 0.02], [0.12, 0.12], [0.08, 0.22], [0.04, 0.28], [0.05, 0.32]], MAT.clay, 1.2, 0, 0.9); flask.rotation.z = 0.4;
    // The ladder of his dream, faint, rising behind.
    const lad = grp(scene, 0, 0, -4); lad.userData.skipFit = true;
    const gm = new THREE.MeshBasicMaterial({ color: 0xfff1b8, transparent: true, opacity: 0.35 });
    [-1, 1].forEach((sd) => rod(lad, [sd * 1.1, 0, 0], [sd * 0.7, 30, -10], 0.08, gm));
    for (let i = 1; i < 26; i++) { const t = i / 26; rod(lad, [-1.1 + 0.4 * t, t * 30, -t * 10], [1.1 - 0.4 * t, t * 30, -t * 10], 0.05, gm); }
    figure(scene, -1.6, -2.4, { robe: 0x7a5a3e, beard: true, face: 0.9, reach: true, skipFit: true });
    L(labels, [0, 4.0, 0], "A stone pillar", "Jacob took the stone he had put under his head, set it up as a pillar and poured oil on top of it, and called the place Bethel, “house of God”.", "Genesis 28:18–19");
    L(labels, [0, 9, -6], "The ladder", "In his dream a stairway reached to heaven, with the angels of God going up and down on it.", "Genesis 28:12–17", true, "/bible/3d/jacobs-ladder");
    return { view: v3(1, 0.45, 1), target: v3(0.8, 1.8, 0) };
  },

  "tabernacle-frame"({ scene, labels }) {
    ground(scene, 16, C.sand);
    // The upright frames: 10 cubits high, 1.5 wide, each with two tenons in silver bases, held
    // by five bars, the middle one running from end to end (Exodus 26:15-30; 36:20-34).
    const frameM = mat(C.gold, { rough: 0.35, metal: 0.75 });
    for (let i = 0; i < 4; i++) {
      const x = i * 1.5 - 2.25;
      rbox(scene, 1.45, 10, 0.35, x, 1, 0, frameM, 0.04);
      [-0.38, 0.38].forEach((dx) => { rbox(scene, 0.6, 1, 0.9, x + dx, 0, 0, SILVER, 0.06); mesh(scene, new THREE.BoxGeometry(0.2, 0.4, 0.2), frameM, x + dx, 1.0, 0); });
    }
    // Bars through gold rings.
    [[2.5, 3, 0.4], [5.5, 6, 0], [8.5, 3, 0.4]].forEach(([y, len, off]) => [-1, 1].forEach((sd) => { if (len === 6 && sd > 0) return;
      const x0 = len === 6 ? 0 : sd * 1.3; rod(scene, [x0 - len / 2 - off * 0, y + 1, 0.32], [x0 + len / 2, y + 1, 0.32], 0.09, GOLD);
      for (let k = -1; k <= 1; k++) tor(scene, 0.13, 0.03, GOLD, x0 + k * len / 3, y + 1, 0.3, 0, Math.PI / 2); }));
    rod(scene, [-3, 6.5, 0.32], [3, 6.5, 0.32], 0.09, GOLD);
    L(labels, [0, 11.8, 0], "Frames of acacia", "Each frame 10 cubits high and 1.5 wide (4.5 × 0.7 m), overlaid with gold: twenty on each long side and eight at the back.", "Exodus 26:15–25");
    L(labels, [-1.9, 1.7, 0.6], "Silver bases", "Two tenons in two silver sockets under every frame: 100 sockets, each from a talent of silver given as the people's atonement money.", "Exodus 26:19; 38:25–27");
    L(labels, [2.8, 7.6, 0.4], "Five bars", "Bars of acacia overlaid with gold, through gold rings. The middle bar ran from end to end.", "Exodus 26:26–29", true);
    scale(scene, labels, 4.3, 2.5);
    return { view: v3(0.8, 0.45, 1) };
  },

  "altar-tools"({ scene, labels }) {
    plinth(scene, 2.4, 0xd9c9a3);
    // Pots for the ashes, shovels, basins, forks and firepans, all bronze (Exodus 27:3; 38:3).
    vessel(scene, [[0, 0], [0.22, 0], [0.3, 0.2], [0.3, 0.4], [0.24, 0.48], [0.26, 0.52]], BRONZE, -1.1, 0.02, -0.4);
    tor(scene, 0.27, 0.02, BRONZE, -1.1, 0.5, -0.4);
    const sh = grp(scene, -0.2, 0.06, -0.6, 0.4); vessel(sh, [[0, 0], [0.22, 0.01], [0.24, 0.06]], BRONZE).scale.z = 0.7; rod(sh, [0.2, 0.04, 0], [1.2, 0.12, 0], 0.025, BRONZE);
    vessel(scene, [[0, 0], [0.15, 0], [0.32, 0.12], [0.36, 0.18]], BRONZE, 0.8, 0.02, -0.5);
    const fk = grp(scene, 0.2, 0.06, 0.4, -0.3); rod(fk, [0, 0, 0], [1.1, 0, 0], 0.025, BRONZE);
    [-0.08, 0, 0.08].forEach((z) => path(fk, [[1.1, 0, 0], [1.3, 0, z], [1.42, 0.08, z * 1.2]], 0.015, BRONZE, 10));
    const fp = grp(scene, -1, 0.04, 0.6, 0.2); vessel(fp, [[0, 0], [0.22, 0], [0.25, 0.08]], BRONZE); rod(fp, [0.24, 0.06, 0], [0.9, 0.12, 0], 0.022, BRONZE);
    L(labels, [-1.1, 0.8, -0.4], "Ash pots", "For carrying away the fat-soaked ashes from the altar.", "Exodus 27:3");
    L(labels, [0.8, 0.45, -0.5], "Basins", "For catching the blood, which was splashed against the altar.", "Exodus 27:3; Leviticus 1:5", true);
    L(labels, [1.3, 0.35, 0.3], "Meat forks", "Three-pronged forks. At Shiloh, Eli's sons' servant used one to grab meat for themselves.", "1 Samuel 2:13–14", true);
    L(labels, [-0.2, 0.4, -0.7], "Shovels and firepans", "Made of bronze, like the altar, for handling the coals and ashes.", "Exodus 38:3", true);
    scale(scene, labels, 1.4, 1.0, true);
    return { view: v3(0.6, 0.8, 1) };
  },

  dagon({ scene, labels }) {
    ground(scene, 24, C.stone);
    // In Dagon's temple at Ashdod the statue fell before the ark, and the next morning its
    // head and hands lay broken on the threshold (1 Samuel 5:1-5).
    const stoneM = mat(0x9a9384, { tex: "rock", rough: 0.9 });
    rbox(scene, 3, 1.4, 3, 0, 0, -3, MAT.stone, 0.1);
    const body = grp(scene, 0, 0.55, -0.5); body.rotation.x = Math.PI / 2;
    // Torso and a fish-like lower body, as Dagon is often pictured (the Bible gives no form).
    vessel(body, [[0, 0], [0.7, 0.2], [0.85, 1.2], [0.7, 2.3], [0.4, 3.3], [0.12, 4.0], [0.5, 4.4], [0, 4.4]], stoneM);
    for (let i = 0; i < 6; i++) tor(body, 0.82 - i * 0.07, 0.04, stoneM, 0, 0.5 + i * 0.5, 0);
    sph(scene, 0.55, stoneM, 2.2, 0.5, 2.1, 1, 1.1, 1);
    [[1.2, 0, 2.6], [-1.4, 0, 2.4]].forEach(([x, y, z]) => sph(scene, 0.25, stoneM, x, 0.22, z, 1.4, 0.7, 1));
    rbox(scene, 6, 0.3, 1, 0, 0, 2.6, mat(0x7a6a50, { rough: 1 }), 0.05);
    // The ark stands where it had been placed beside him.
    const ark = grp(scene, -3.8, 0, -2.5);
    box(ark, 2.5, 1.5, 1.5, 0, 0, 0, GOLD); box(ark, 2.56, 0.12, 1.56, 0, 1.5, 0, GOLD);
    [-1, 1].forEach((sd) => { const c = grp(ark, sd * 0.9, 1.6, 0); vessel(c, [[0, 0], [0.2, 0], [0.12, 0.5], [0, 0.6]], GOLD); slab(c, [[0, 0.4], [0.9 * -sd, 0.9], [0.5 * -sd, 0.35]], 0.04, GOLD); });
    L(labels, [0, 2.5, -0.5], "Fallen on his face", "Twice the statue was found face down on the ground before the ark of the LORD.", "1 Samuel 5:3–4");
    L(labels, [2.2, 1.6, 2.2], "Head and hands broken off", "The second morning its head and both hands lay cut off on the threshold; only the trunk was left. That is why Dagon's priests never stepped on the threshold.", "1 Samuel 5:4–5");
    L(labels, [-3.8, 3.4, -2.5], "The ark of God", "The Philistines had captured it at Ebenezer and set it in Dagon's house.", "1 Samuel 5:1–2", true, "/bible/3d/ark-of-the-covenant");
    scale(scene, labels, 5, 4);
    return { view: v3(0.9, 0.7, 1.1) };
  },

  "incense-spices"({ scene, labels }) {
    plinth(scene, 1.6, 0xd9c9a3);
    // Stacte, onycha, galbanum and pure frankincense, in equal parts, salted (Exodus 30:34-38).
    const mk = (x, z, col, label, shape) => {
      vessel(scene, [[0, 0], [0.18, 0.01], [0.3, 0.08], [0.34, 0.14]], MAT.clayLight, x, 0, z);
      for (let i = 0; i < 22; i++) { const a = i * 2.4, r = (i % 6) * 0.045; sph(scene, shape === "tear" ? 0.04 : 0.035, mat(col, { rough: shape === "tear" ? 0.25 : 0.8 }), x + Math.cos(a) * r, 0.1 + (i % 3) * 0.02 + (0.27 - r) * 0.12, z + Math.sin(a) * r, 1, shape === "tear" ? 1.4 : 0.7, 1); }
    };
    mk(-0.45, -0.4, 0xc78a2e, "", "tear"); mk(0.45, -0.4, 0x6b4a2a, "", "flake"); mk(-0.45, 0.4, 0x9a9a3a, "", "tear"); mk(0.45, 0.4, 0xefe3b8, "", "tear");
    const mortar = vessel(scene, [[0, 0], [0.18, 0], [0.22, 0.14], [0.2, 0.2], [0.14, 0.1], [0, 0.08]], MAT.basalt, 0, 0, 0);
    void mortar; rod(scene, [0.05, 0.12, 0], [0.15, 0.4, 0.05], 0.03, MAT.basalt);
    L(labels, [0.45, 0.4, 0.4], "Frankincense", "Pure frankincense, a gum from trees in southern Arabia: also among the wise men's gifts.", "Exodus 30:34; Matthew 2:11");
    L(labels, [-0.45, 0.35, -0.4], "Stacte", "Probably drops of myrrh or storax resin.", "Exodus 30:34", true);
    L(labels, [0.45, 0.35, -0.4], "Onycha", "Probably the flap of a sea snail, burned for its scent.", "Exodus 30:34", true);
    L(labels, [-0.45, 0.35, 0.4], "Galbanum", "A bitter gum from a fennel-like plant.", "Exodus 30:34", true);
    L(labels, [0, 0.55, 0], "Beaten very fine", "Some was ground to powder and put before the testimony. No one was to make it for themselves.", "Exodus 30:36–38");
    scale(scene, labels, 1.0, 0.9, true);
    return { view: v3(0.4, 0.9, 1) };
  },

  "lampstand-tools"({ scene, labels }) {
    plinth(scene, 1.2, 0xd9c9a3);
    // Its tongs and trays of pure gold (Exodus 25:38), and a lamp being trimmed.
    const tg = grp(scene, -0.2, 0.03, 0.1, 0.3);
    [-1, 1].forEach((sd) => path(tg, [[0, 0, 0], [0.35, 0.015, sd * 0.03], [0.65, 0.02, sd * 0.02], [0.72, 0.02, sd * 0.004]], 0.012, GOLD, 16));
    tor(tg, 0.03, 0.01, GOLD, -0.02, 0, 0, Math.PI / 2);
    vessel(scene, [[0, 0], [0.18, 0], [0.24, 0.04], [0.25, 0.05]], GOLD, 0.35, 0.01, -0.3);
    const lamp = grp(scene, 0.35, 0.06, -0.3);
    vessel(lamp, [[0, -0.03], [0.07, -0.01], [0.09, 0.02], [0.06, 0.045], [0.02, 0.05]], GOLD);
    flame(lamp, 0.08, 0.03, 0, 0.35);
    L(labels, [0, 0.35, 0], "Tongs and trays", "Made of pure gold, with the lampstand, for trimming the wicks and carrying away the burnt ends.", "Exodus 25:38–39");
    L(labels, [0.35, 0.3, -0.3], "Tended every evening", "Aaron set the lamps in order from evening to morning, a statute for ever.", "Exodus 27:21; Leviticus 24:3–4", true);
    scale(scene, labels, -0.1, 0.65, true);
    return { view: v3(0.4, 0.85, 1) };
  },
};

// Some people looking up at the bronze serpent.
function people(scene) {
  [[3, 2, 2.3], [3.6, -1.2, 3.0], [-2.8, 2.6, 0.8], [-3.4, -1.6, -0.2], [1.2, 3.5, 1.7]].forEach(([x, z, f], i) =>
    figure(scene, x, z, { robe: [0x8b6f4e, 0x6b7f8c, 0xa8875a, 0x7a5a6a, 0x5d7a5a][i], skin: i % 4, beard: i % 2 === 0, face: f, skipFit: true, raise: i === 2 }));
}
