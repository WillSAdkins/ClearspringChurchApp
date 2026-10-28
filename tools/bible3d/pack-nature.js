/* Plants and animals. 1 unit = 1 cubit (about 45 cm). */
import {
  scatter, THREE, MAT, C, GOLD, BRONZE, SILVER, IRON, mat, mesh, grp, sph, cone, tor, rod, path, vessel, slab, rbox, box, cyl,
  textPlane, scale, L, plinth, ground, figure, beast, flame, rock, hill, v3, ref, bush, olive, palm, house, ROBES,
} from "./kit.js";

// A bird facing +x: body, head, beak, tail and two wings (spread out flat, or folded along its sides).
// s = length in cubits.
function bird(p, x, y, z, s = 0.6, col = 0x8a7a6a, o = {}) {
  const g = grp(p, x, y, z, o.ry || 0), m = mat(col, { rough: 0.8, side: THREE.DoubleSide });
  sph(g, s * 0.22, m, 0, 0, 0, 1.6, 0.85, 0.85);
  sph(g, s * 0.13, m, s * 0.33, s * 0.12, 0);
  cone(g, s * 0.045, s * 0.14, mat(o.beak ?? 0xd8a040, { rough: 0.5 }), s * 0.47, s * 0.1, 0, 0, -Math.PI / 2, 8);
  [-1, 1].forEach((sd) => sph(g, s * 0.022, MAT.black, s * 0.4, s * 0.15, sd * s * 0.07));
  // Tail: a fan lying flat behind.
  slab(g, [[0, -s * 0.06], [-s * 0.32, -s * 0.14], [-s * 0.34, s * 0.14], [0, s * 0.06]], s * 0.02, m, -s * 0.28, s * 0.02, 0, -Math.PI / 2 + 0.15, 0, 0);
  const wing = o.spread
    ? [[0, -s * 0.1], [s * 0.08, -s * 0.25], [s * 0.02, -s * 0.6], [-s * 0.1, -s * 0.85], [-s * 0.16, -s * 0.6], [-s * 0.14, -s * 0.1]]
    : [[s * 0.12, 0], [-s * 0.05, s * 0.05], [-s * 0.4, s * 0.02], [-s * 0.1, -s * 0.04]];
  [-1, 1].forEach((sd) => {
    if (o.spread) { const w = slab(g, wing.map(([a, b]) => [a, b * sd]), s * 0.02, m, s * 0.04, s * 0.06, 0, -Math.PI / 2, 0, 0); w.rotation.x = -Math.PI / 2 + sd * 0.18; }
    else slab(g, wing, s * 0.02, m, 0, s * 0.04, sd * s * 0.17, 0, 0, sd * -0.1);
  });
  if (!o.spread) [-0.06, 0.06].forEach((zz) => rod(g, [0, -s * 0.15, zz * s], [0.02 * s, -s * 0.32, zz * s], s * 0.012, mat(0xc89a52, { rough: 0.6 })));
  return g;
}
// A broadleaf tree with optional fruit.
function leafy(p, x, z, h, leafC = 0x5f7d43, fruitC = null, n = 18, fit = true) {
  const g = grp(p, x, 0, z); if (!fit) g.userData.skipFit = true;
  path(g, [[0, 0, 0], [h * 0.04, h * 0.3, 0], [-h * 0.03, h * 0.55, 0.02]], h * 0.05, MAT.bark, 12);
  [[0.25, 0.55, 0.1], [-0.25, 0.6, -0.1], [0.05, 0.62, 0.3]].forEach(([a, b, c]) => path(g, [[0, h * 0.45, 0], [a * h, b * h, c * h]], h * 0.025, MAT.bark, 8));
  const lm = mat(leafC, { rough: 0.85 });
  [[0, 0.72, 0, 0.3], [0.25, 0.66, 0.12, 0.22], [-0.24, 0.68, -0.12, 0.23], [0.06, 0.86, -0.1, 0.2], [-0.08, 0.66, 0.26, 0.2]].forEach(([a, b, c, r]) => { const o = mesh(g, new THREE.IcosahedronGeometry(h * r, 2), lm, a * h, b * h, c * h); o.scale.y = 0.72; });
  if (fruitC != null) for (let i = 0; i < n; i++) { const a = i * 2.39996, r = h * (0.28 + (i % 3) * 0.06); sph(g, h * 0.025, mat(fruitC, { rough: 0.5 }), Math.cos(a) * r, h * (0.6 + (i % 5) * 0.05), Math.sin(a) * r); }
  return g;
}

export const MODELS = {
  "mustard-seed"({ scene, labels }) {
    ground(scene, 20, 0xb8ad7c, false);
    // The smallest of all seeds becomes larger than all the garden plants and puts out large branches,
    // so the birds of the air can nest in its shade (Mark 4:30-32; Matthew 13:31-32).
    const tr = grp(scene, 0, 0, 0);
    for (let i = 0; i < 9; i++) { const a = i * 0.7; path(tr, [[0, 0, 0], [Math.cos(a) * 0.4, 2.5, Math.sin(a) * 0.4], [Math.cos(a) * 2.2, 5 + (i % 3) * 0.8, Math.sin(a) * 2.2]], 0.14 - i * 0.008, MAT.bark, 12); }
    [[0, 6.2, 0, 2.6], [1.8, 5.4, 1, 1.8], [-1.8, 5.6, -0.8, 1.9], [0.6, 5.2, -1.8, 1.6], [-0.8, 5.0, 1.8, 1.6]].forEach(([a, b, c, r]) => { const o = mesh(tr, new THREE.IcosahedronGeometry(r, 2), mat(0x7a9a4a, { rough: 0.85 }), a, b, c); o.scale.y = 0.7; });
    for (let i = 0; i < 40; i++) sph(tr, 0.08, mat(0xe8d040, { rough: 0.8 }), Math.cos(i * 2.4) * (1 + (i % 4) * 0.5), 6.4 + (i % 3) * 0.4, Math.sin(i * 2.4) * (1 + (i % 4) * 0.5));
    bird(scene, 1.6, 6.9, 0.8, 0.5, 0x8a7a6a); bird(scene, -1.2, 6.6, -1.4, 0.45, 0x6a5a4a, { ry: 2 }); bird(scene, 2.8, 8.2, -1, 0.5, 0x7a6a5a, { spread: true, ry: -1 });
    // The seed itself, enlarged in a hand.
    const hd = grp(scene, 4.5, 2.2, 2.5, -0.4); hd.userData.skipFit = true; rbox(hd, 0.6, 0.15, 0.7, 0, 0, 0, mat(0xa8714a), 0.08);
    for (let i = 0; i < 8; i++) sph(hd, 0.025, mat(0x6a4a2a, { rough: 0.6 }), -0.1 + (i % 4) * 0.07, 0.17, -0.05 + Math.floor(i / 4) * 0.08);
    figure(scene, 4.8, 3, { robe: 0x8b6f4e, beard: true, h: 4, reach: true, face: Math.PI * 1.1, skipFit: true });
    L(labels, [0, 8.2, 0], "Larger than all the garden plants", "Black mustard can grow 3 m tall in a season. “It becomes larger than all the garden plants and puts out large branches, so that the birds of the air can make nests in its shade.”", "Mark 4:32");
    L(labels, [4.5, 2.8, 2.5], "The smallest of seeds", "About 1–2 mm across. The kingdom of God starts small and grows beyond all expectation.", "Mark 4:31");
    L(labels, [-2, 3, 2], "Faith like a grain of mustard seed", "“You will say to this mountain, ‘Move from here to there,’ and it will move.”", "Matthew 17:20", true);
    return { view: v3(0.7, 0.35, 1.1) };
  },

  "fig-tree"({ scene, labels }) {
    ground(scene, 20, 0xb8ad7c, false);
    // Big lobed leaves and figs (Mark 11:12-14; 13:28; Genesis 3:7; Micah 4:4).
    const g = leafy(scene, 0, 0, 9, 0x4f7a33, 0x5a3a5a, 30);
    for (let i = 0; i < 24; i++) { const a = i * 2.4, r = 2.6 + (i % 3) * 0.4; const lf = slab(g, [[0, 0], [0.4, 0.3], [0.7, 0.1], [0.5, 0.6], [0.6, 0.9], [0.2, 0.75], [0, 1.1], [-0.2, 0.75], [-0.6, 0.9], [-0.5, 0.6], [-0.7, 0.1], [-0.4, 0.3]], 0.02, mat(0x5f8a3a, { rough: 0.8, side: THREE.DoubleSide }), Math.cos(a) * r, 6 + (i % 4) * 0.6, Math.sin(a) * r, -0.6, a, 0); lf.scale.setScalar(0.9); }
    figure(scene, 3.4, 2.4, { robe: 0x8b6f4e, beard: true, h: 4, sit: true, face: Math.PI * 1.15 });
    L(labels, [0, 10, 0], "Learn from the fig tree", "“As soon as its branch becomes tender and puts out its leaves, you know that summer is near.” Leaves without fruit meant a barren tree: the one Jesus cursed.", "Mark 13:28; 11:12–14, 20–21");
    L(labels, [3.4, 4, 2.4], "Under his own fig tree", "A picture of peace: “They shall sit every man under his vine and under his fig tree, and no one shall make them afraid.” Nathanael was under a fig tree when Jesus saw him.", "Micah 4:4; John 1:48");
    L(labels, [-2.6, 6, 1], "Fig leaves", "Large leaves, about a span across: Adam and Eve sewed them together.", "Genesis 3:7", true);
    return { view: v3(0.8, 0.4, 1.1) };
  },

  zacchaeus({ scene, labels }) {
    ground(scene, 40, C.sand, false);
    // A sycamore-fig by the road in Jericho, short Zacchaeus up in it (Luke 19:1-10).
    const t = grp(scene, 0, 0, 0);
    path(t, [[0, 0, 0], [0.2, 2, 0], [0, 3.4, 0]], 0.7, MAT.bark, 12);
    [[3, 5.2, 1], [-3, 5.4, -0.6], [0.8, 6, -2.8], [-1, 5.6, 2.8]].forEach(([a, b, c]) => path(t, [[0, 3.2, 0], [a * 0.5, 4.2, c * 0.5], [a, b, c]], 0.32, MAT.bark, 10));
    [[0, 7.4, 0, 3.6], [3, 6.8, 1.2, 2.6], [-3, 6.9, -0.8, 2.7], [0.6, 7.2, -2.8, 2.4], [-1, 6.8, 2.8, 2.4]].forEach(([a, b, c, r]) => { const o = mesh(t, new THREE.IcosahedronGeometry(r, 2), mat(0x6a8a43, { rough: 0.85 }), a, b, c); o.scale.y = 0.6; });
    path(t, [[0.4, 3.0, 0.2], [2.4, 3.6, 1.2], [3.6, 3.9, 1.6]], 0.25, MAT.bark, 10);
    figure(scene, 2.8, 1.3, { robe: 0x5b2c6f, cloth: 0xe9e1cf, beard: true, h: 3.2, sit: true, y: 3.75, face: Math.PI * 0.6 });
    const road = mesh(scene, new THREE.PlaneGeometry(5, 60), mat(0xc8b48a, { rough: 1, tex: "sand", rep: 3 }), 6, 0.02, 0, -Math.PI / 2); road.userData.skipFit = true;
    figure(scene, 6, 1.5, { robe: 0xe9e1cf, cloth: 0xf2ede0, beard: true, h: 4, face: Math.PI * 0.95 });
    for (let i = 0; i < 8; i++) figure(scene, 5 + (i % 2) * 2, -2 - i * 1.2, { robe: ROBES[i], skin: i % 4, h: 3.9, face: Math.PI / 2, skipFit: true });
    L(labels, [2.8, 6.6, 1.3], "Small of stature", "Zacchaeus, a chief tax collector and rich, could not see Jesus for the crowd, “so he ran on ahead and climbed up into a sycamore tree to see him.”", "Luke 19:2–4");
    L(labels, [6, 4.4, 1.5], "“Zacchaeus, hurry and come down”", "“For I must stay at your house today.” “Today salvation has come to this house… For the Son of Man came to seek and to save the lost.”", "Luke 19:5–10");
    L(labels, [-3, 6, -1], "A sycamore-fig", "Not the English sycamore: a wide, low-branched fig tree, easy to climb.", "Amos 7:14; Luke 19:4", true);
    return { view: v3(0.8, 0.35, 1.1), target: v3(2.5, 4, 1) };
  },

  "olive-grafting"({ scene, labels }) {
    ground(scene, 24, 0xb8ad7c, false);
    // Some branches broken off, a wild olive shoot grafted in among the others to share the root (Romans 11:17-24).
    const t = olive(scene, 0, 0, 8, true);
    const wild = grp(scene, 1.8, 4.3, 1.0, -0.4); path(wild, [[0, 0, 0], [0.8, 0.6, 0.4], [1.6, 1.4, 0.6]], 0.09, mat(0x8a7a5a, { rough: 1 }), 10);
    tor(wild, 0.13, 0.04, MAT.rope, 0, 0, 0, 0, 0.6); tor(wild, 0.13, 0.04, MAT.rope, 0.1, 0.06, 0.05, 0, 0.8);
    for (let i = 0; i < 6; i++) { const lf = sph(wild, 0.14, mat(0x9aaa7a, { rough: 0.8 }), 0.6 + i * 0.2, 0.6 + i * 0.16, 0.3 + (i % 2) * 0.2, 1.8, 0.35, 0.7); void lf; }
    [[-3, 2.0], [3.6, 2.6]].forEach(([x, z], i) => { const b = grp(scene, x, 0.15, z, i * 2); path(b, [[0, 0, 0], [1.4, 0.1, 0.2], [2.4, 0.1, 0.6]], 0.1, mat(0x7a6a52, { rough: 1 }), 10); });
    for (let i = 0; i < 20; i++) sph(t, 0.09, mat(0x3a3a20, { rough: 0.3 }), Math.cos(i * 2.4) * 2, 4.6 + (i % 4) * 0.4, Math.sin(i * 2.4) * 2, 1, 1.3, 1);
    L(labels, [0, 9, 0], "The olive tree", "Israel, rooted in God's promises to the patriarchs.", "Romans 11:16–18; Jeremiah 11:16");
    L(labels, [2.8, 6.4, 1.6], "A wild branch grafted in", "“You, although a wild olive shoot, were grafted in among the others and now share in the nourishing root of the olive tree.” The Gentiles, by faith.", "Romans 11:17–20");
    L(labels, [-3, 1.0, 2], "Branches broken off", "“Do not be arrogant… if God did not spare the natural branches, neither will he spare you.” And God is able to graft them in again.", "Romans 11:20–24", true);
    return { view: v3(0.7, 0.45, 1.1) };
  },

  "true-vine"({ scene, labels }) {
    ground(scene, 24, 0xb8ad7c, false);
    // “I am the vine; you are the branches” (John 15:1-8): a trellised vine with grapes, a vinedresser
    // pruning, and withered branches gathered for the fire.
    const v = grp(scene, 0, 0, 0);
    path(v, [[0, 0, 0], [0.2, 1.4, 0.1], [-0.1, 2.6, 0]], 0.22, MAT.bark, 14);
    [-1, 1].forEach((sd) => path(v, [[0, 2.6, 0], [sd * 1.5, 3.0, 0.1], [sd * 3.2, 3.1, 0], [sd * 5, 3.3, 0.1]], 0.1, MAT.bark, 20));
    [-5.4, 0, 5.4].forEach((x) => rod(v, [x, 0, -0.2], [x, 3.6, -0.2], 0.08, MAT.darkWood)); rod(v, [-5.6, 3.4, -0.2], [5.6, 3.4, -0.2], 0.04, MAT.rope);
    for (let i = 0; i < 26; i++) { const x = -4.6 + i * 0.37; const lf = slab(v, [[0, 0], [0.3, 0.2], [0.35, 0.5], [0, 0.6], [-0.35, 0.5], [-0.3, 0.2]], 0.02, mat(0x5f8a3a, { rough: 0.8, side: THREE.DoubleSide }), x, 3.3 + Math.sin(i) * 0.2, 0.25, -0.5, 0, i); void lf; }
    for (let k = 0; k < 6; k++) { const x = -4 + k * 1.6; for (let i = 0; i < 26; i++) { const t = i / 26, r = 0.35 * (1 - t * 0.8); sph(v, 0.07, mat(0x4a1a4a, { rough: 0.3 }), x + Math.cos(i * 2.4) * r, 3.0 - t * 1.0, 0.3 + Math.sin(i * 2.4) * r * 0.8); } }
    const pile = grp(scene, 3, 0, 3); for (let i = 0; i < 9; i++) rod(pile, [-0.8 + (i % 3) * 0.1, 0.1 + i * 0.05, -0.4 + i * 0.1], [0.9, 0.12 + i * 0.05, 0.3 - i * 0.08], 0.05, mat(0x6a5a40, { rough: 1 })); flame(pile, 0, 0.3, 0, 2.5);
    figure(scene, -3, 2.4, { robe: 0x8b6f4e, beard: true, h: 4, reach: true, face: -0.4 });
    const knife = grp(scene, -2.3, 2.5, 1.6); path(knife, [[0, 0, 0], [0.3, 0, 0], [0.42, 0.06, 0], [0.45, 0.16, 0]], 0.015, IRON, 10);
    L(labels, [0, 4.4, 0], "I am the vine, you are the branches", "“Whoever abides in me and I in him, he it is that bears much fruit, for apart from me you can do nothing.”", "John 15:5");
    L(labels, [-3, 4.6, 2.4], "My Father is the vinedresser", "“Every branch that does bear fruit he prunes, that it may bear more fruit.”", "John 15:1–2");
    L(labels, [3, 1.4, 3], "Thrown away and burned", "“If anyone does not abide in me he is thrown away like a branch and withers; and the branches are gathered, thrown into the fire, and burned.”", "John 15:6", true);
    return { view: v3(0.4, 0.4, 1.1) };
  },

  cedar({ scene, labels }) {
    ground(scene, 60, 0x9aa36b, false);
    // The cedar of Lebanon: tall, spreading in flat tiers, fragrant, long-lasting (Psalm 92:12; Ezekiel 31:3-9; 1 Kings 5:6).
    const g = grp(scene, 0, 0, 0);
    path(g, [[0, 0, 0], [0.4, 12, 0.2], [0, 28, 0]], 1.4, MAT.bark, 16);
    const lm = mat(0x3f5f3a, { rough: 0.9 });
    [[8, 14], [10, 12], [9, 17], [7, 20], [5.5, 23], [3.6, 26], [2, 28.5]].forEach(([r, y], i) => { const t = mesh(g, new THREE.CylinderGeometry(r * 0.75, r, 1.6, 20), lm, Math.sin(i) * 0.6, y, Math.cos(i) * 0.6); t.scale.z = 0.9; });
    for (let i = 0; i < 5; i++) path(g, [[0, 10 + i * 3, 0], [Math.cos(i * 1.3) * 7, 11.5 + i * 3, Math.sin(i * 1.3) * 7]], 0.35, MAT.bark, 8);
    for (let i = 0; i < 8; i++) cone(g, 0.3, 0.8, mat(0x8a7a5a, { rough: 0.8 }), Math.cos(i) * 4, 21.5, Math.sin(i) * 4);
    scale(scene, labels, 8, 7);
    L(labels, [0, 31, 0], "The cedar of Lebanon", "Growing 30–40 m tall, with flat spreading tiers of branches. “The righteous flourish like the palm tree and grow like a cedar in Lebanon.”", "Psalm 92:12");
    L(labels, [7, 13, 3], "Wood for the temple", "Fragrant and rot-proof: Solomon panelled the temple and his palace with it.", "1 Kings 5:6; 6:15–18", true, "/bible/3d/cedar-rafts");
    L(labels, [-6, 16, -4], "The proud cedar", "Ezekiel compares Assyria, and Pharaoh, to a towering cedar cut down.", "Ezekiel 31:3–14", true);
    return { view: v3(0.8, 0.3, 1.1) };
  },

  lilies({ scene, labels }) {
    ground(scene, 12, 0x9aa36b, false);
    // “Consider the lilies of the field, how they grow: they neither toil nor spin” (Matthew 6:26-30).
    // Probably anemones and other wild flowers that cover Galilee's hills in spring.
    const cols = [0xc8202a, 0xe84a6a, 0xf2f0ea, 0x8a4ab8, 0xe8c040];
    for (let i = 0; i < 70; i++) { const a = i * 2.39996, r = Math.sqrt(i) * 0.4; const f = grp(scene, Math.cos(a) * r, 0, Math.sin(a) * r); const h = 0.5 + (i % 5) * 0.12;
      rod(f, [0, 0, 0], [0, h, 0], 0.012, MAT.leaf); const col = mat(cols[i % 5], { rough: 0.6, side: THREE.DoubleSide });
      for (let k = 0; k < 6; k++) { const pa = k / 6 * Math.PI * 2; const pt = sph(f, 0.07, col, Math.cos(pa) * 0.07, h + 0.02, Math.sin(pa) * 0.07, 1, 0.3, 0.6); pt.rotation.y = -pa; }
      sph(f, 0.035, MAT.black, 0, h + 0.04, 0); }
    for (let i = 0; i < 30; i++) { const s = mesh(scene, new THREE.ConeGeometry(0.03, 0.35, 4), MAT.leaf, Math.cos(i * 1.7) * 3.5, 0.17, Math.sin(i * 1.7) * 3.5); s.userData.noShadow = true; }
    bird(scene, 1.5, 2.4, -1, 0.4, 0x6a5a4a, { spread: true, ry: 0.5 }); bird(scene, -1.6, 2.8, 0.5, 0.35, 0x8a7a6a, { spread: true, ry: 2.4 });
    L(labels, [0, 1.5, 0], "Consider the lilies", "“Even Solomon in all his glory was not arrayed like one of these. But if God so clothes the grass of the field… will he not much more clothe you, O you of little faith?”", "Matthew 6:28–30");
    L(labels, [1.5, 3, -1], "Look at the birds", "“They neither sow nor reap nor gather into barns, and yet your heavenly Father feeds them. Are you not of more value than they?”", "Matthew 6:26");
    L(labels, [-2, 1, 2], "Which flower?", "The word covers wild flowers in general. In spring, red anemones carpet the hills of Galilee where Jesus taught.", "Matthew 6:28", true);
    scale(scene, labels, 1.2, -1.6, true);
    return { view: v3(0.5, 0.55, 1.1) };
  },

  "wheat-and-tares"({ scene, labels }) {
    ground(scene, 30, 0xb8ad7c, false);
    // An enemy sowed weeds among the wheat; let both grow together until the harvest (Matthew 13:24-30, 36-43).
    // The weed is probably darnel, which looks like wheat until it heads.
    const wh = mat(0xd8b860, { rough: 1 }), dn = mat(0x5a5a3a, { rough: 1 }), stalk = mat(0xc8a850, { rough: 1 }), dstalk = mat(0x7a8a4a, { rough: 1 });
    const stalks = [], heads = [], tstalks = [], theads = [];
    for (let i = 0; i < 300; i++) { const x = -7 + (i % 25) * 0.56 + Math.sin(i * 7) * 0.15, z = -4 + Math.floor(i / 25) * 0.6 + Math.cos(i * 3) * 0.15; const tare = (i * 37) % 7 === 0, lean = Math.sin(i) * 0.04;
      (tare ? tstalks : stalks).push([x, tare ? 1.3 : 1.2, z, 0, 0, lean, 1, tare ? 1.08 : 1, 1]);
      if (tare) for (let k = 0; k < 5; k++) theads.push([x + (k % 2 ? 0.05 : -0.05) + lean * -2.4, 2.4 + k * 0.08, z]);
      else heads.push([x + lean * -2.4, 2.5, z, 0, 0, 0, 1, 2.2, 1]); }
    scatter(scene, new THREE.CylinderGeometry(0.012, 0.012, 2.4, 5), stalk, stalks);
    scatter(scene, new THREE.CylinderGeometry(0.012, 0.012, 2.4, 5), dstalk, tstalks);
    scatter(scene, new THREE.SphereGeometry(0.06, 8, 6), wh, heads);
    scatter(scene, new THREE.SphereGeometry(0.035, 6, 5), dn, theads);
    // Bundles of weeds tied for burning, and a barn.
    [[5, 5], [6, 4.2]].forEach(([x, z]) => { const b = grp(scene, x, 0, z, 1.2); for (let k = 0; k < 14; k++) rod(b, [Math.cos(k) * 0.1, 0, Math.sin(k) * 0.1], [Math.cos(k) * 0.35, 1.0, Math.sin(k) * 0.35], 0.015, dstalk); tor(b, 0.17, 0.03, MAT.rope, 0, 0.5, 0); b.rotation.z = Math.PI / 2; b.position.y = 0.2; });
    const barn = grp(scene, -9, 0, -7); rbox(barn, 6, 5, 4, 0, 0, 0, mat(0xffffff, { tex: "stone", rough: 1 }), 0.2); barn.userData.skipFit = true;
    figure(scene, 3, 5.5, { robe: 0x8b6f4e, beard: true, h: 4, reach: true, face: Math.PI * 1.2 });
    L(labels, [0, 3.6, 0], "Let both grow together", "“Lest in gathering the weeds you root up the wheat along with them. Let both grow together until the harvest.”", "Matthew 13:29–30");
    L(labels, [5.4, 1.4, 4.6], "Gathered and burned", "“At harvest time I will tell the reapers, Gather the weeds first and bind them in bundles to be burned, but gather the wheat into my barn.”", "Matthew 13:30, 40–43");
    L(labels, [-3, 3.4, -2], "Darnel", "A poisonous grass that looks just like wheat until the ears appear. Its dark seeds are the giveaway.", "Matthew 13:24–26", true);
    return { view: v3(0.6, 0.55, 1.1) };
  },

  "wolf-and-lamb"({ scene, labels }) {
    ground(scene, 24, 0x9aa36b, false);
    olive(scene, -6, -5, 6);
    // “The wolf shall dwell with the lamb, the leopard lie down with the young goat… and a little child shall lead them” (Isaiah 11:6-9; 65:25).
    beast(scene, -1.2, 0, { color: 0x7a7a7a, ears: true, s: 0.8, face: 0.3 });
    beast(scene, 0.4, 0.6, { color: 0xf0ead8, wool: true, s: 0.55, face: Math.PI + 0.3 });
    beast(scene, 2.2, -1.4, { color: 0xd8a040, mane: 0x8a5a2a, s: 1.1, face: Math.PI * 1.2 });
    beast(scene, 3.4, 0.6, { color: 0xc8a070, horns: true, s: 0.9, face: Math.PI });
    beast(scene, -2.4, 2.2, { color: 0xc89a4a, ears: true, s: 0.8, face: 0.6 });
    beast(scene, -0.4, 2.8, { color: 0x8a6a4a, horns: true, s: 0.5, face: -0.2 });
    figure(scene, 1, 2.6, { robe: 0xe9e1cf, cloth: false, skin: 1, h: 2.6, face: -Math.PI / 2, reach: true });
    L(labels, [0, 3, 0.5], "The wolf with the lamb", "“The wolf shall dwell with the lamb, and the leopard shall lie down with the young goat, and the calf and the lion and the fattened calf together; and a little child shall lead them.”", "Isaiah 11:6");
    L(labels, [2.2, 3.2, -1.4], "The lion shall eat straw like the ox", "“They shall not hurt or destroy in all my holy mountain; for the earth shall be full of the knowledge of the LORD as the waters cover the sea.”", "Isaiah 11:7–9");
    L(labels, [1, 3.2, 2.6], "A little child", "Isaiah's picture of the peace of the coming king's reign.", "Isaiah 11:1–6", true);
    return { view: v3(0.6, 0.5, 1.1) };
  },

  "ram-in-the-thicket"({ scene, labels }) {
    ground(scene, 30, 0xb8a888, false);
    hill(scene, 20, 0, -34, 8, 0xa89a7a);
    // On Mount Moriah: the altar, the wood, and a ram caught in a thicket by its horns (Genesis 22:1-14).
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; rock(scene, 0.4, Math.cos(a) * 1.0, 0.3, Math.sin(a) * 0.7, 0xb6aa92); }
    for (let i = 0; i < 6; i++) rod(scene, [-1, 0.8 + (i % 2) * 0.15, -0.5 + i * 0.2], [1, 0.8 + (i % 2) * 0.15, -0.5 + i * 0.2], 0.08, mat(0x6b4a2b, { rough: 1 }));
    const th = bush(scene, 3.6, -1.2, 1.4, 0x5a6a3a); th.userData.skipFit = false;
    for (let i = 0; i < 20; i++) rod(scene, [3.6, 0.5, -1.2], [3.6 + Math.cos(i) * 1.6, 0.6 + (i % 4) * 0.4, -1.2 + Math.sin(i) * 1.6], 0.03, MAT.bark);
    beast(scene, 2.6, 0.4, { color: 0xe5ddc8, wool: true, horns: true, s: 0.8, face: 0.6 });
    figure(scene, -2.2, 1.6, { robe: 0xe9e1cf, cloth: 0x8b6f4e, beard: true, h: 4, face: -0.6 });
    figure(scene, -2.4, -1.6, { robe: 0x8c5a3c, h: 3.6, face: 0.6 });
    const knife = grp(scene, -1.6, 2.6, 2.0, 0.6); slab(knife, [[0, -0.04], [0.4, -0.03], [0.5, 0], [0, 0.04]], 0.01, IRON, 0, 0, 0, Math.PI / 2);
    L(labels, [0, 2.2, 0], "God will provide", "“Where is the lamb for a burnt offering?” “God will provide for himself the lamb, my son.” Abraham called the place “The LORD will provide”.", "Genesis 22:7–8, 14");
    L(labels, [3.4, 3.2, -0.8], "A ram caught by its horns", "Abraham lifted up his eyes and looked, and behold, behind him was a ram, caught in a thicket by his horns. He offered it instead of his son.", "Genesis 22:13");
    L(labels, [-2.4, 4.2, -1.6], "Isaac", "He carried the wood up the mountain himself.", "Genesis 22:6; Hebrews 11:17–19", true);
    L(labels, [0, 7, -30], "The land of Moriah", "Later the site of Solomon's temple.", "2 Chronicles 3:1", true);
    return { view: v3(0.7, 0.5, 1.1) };
  },

  "dove-and-raven"({ scene, labels }) {
    const w = mesh(scene, new THREE.PlaneGeometry(200, 200), mat(0xffffff, { tex: "water", rough: 0.12, metal: 0.1, rep: 20 }), 0, 0, 0, -Math.PI / 2); w.userData.skipFit = true; w.userData.noShadow = true;
    // Noah sent out a raven, then a dove; the dove came back with a freshly plucked olive leaf (Genesis 8:6-12).
    const ark = grp(scene, -6, -1, -10, 0.4); rbox(ark, 30, 9, 5, 0, 0, 0, mat(0x8f6a4a, { rough: 0.9, tex: "wood", rep: 4 }), 0.3); ark.userData.skipFit = true;
    const win = mesh(ark, new THREE.PlaneGeometry(3, 1.2), MAT.black, 2, 8, 2.6); void win;
    figure(ark, 2, 0.8, { robe: 0x7a5a3e, beard: true, h: 4, y: 4.4, reach: true, face: Math.PI / 2, skipFit: true });
    bird(scene, 0, 4, 0, 1.2, 0xf4f2ee, { spread: true, ry: 0.5, beak: 0xe8a0a0 });
    const leaf = slab(scene, [[0, 0], [0.12, 0.25], [0, 0.55], [-0.12, 0.25]], 0.01, mat(0x7d8f63, { rough: 0.8, side: THREE.DoubleSide }), 0.75, 4.1, 0.3, 0, 0, -1.2); void leaf;
    bird(scene, -4, 7, 3, 1.1, 0x1d1b1a, { spread: true, ry: 2.6, beak: 0x2a2a2a });
    hill(scene, 6, 30, -30, 3, 0x8a8a6a);
    L(labels, [0, 5.2, 0], "A freshly plucked olive leaf", "“The dove came back to him in the evening, and behold, in her mouth was a freshly plucked olive leaf. So Noah knew that the waters had subsided.”", "Genesis 8:11");
    L(labels, [-4, 8.2, 3], "The raven", "It went to and fro until the waters dried up, and did not come back.", "Genesis 8:7", true);
    L(labels, [-4, 9, -9], "The window", "Noah opened the window of the ark and sent out the birds.", "Genesis 8:6", true);
    return { view: v3(0.6, 0.25, 1.1), target: v3(-1, 5, 0), zoom: 1.4 };
  },

  eagle({ scene, labels }) {
    ground(scene, 80, 0xa89a7a, false);
    rock(scene, 6, -6, 3, -6, 0x9d917a, 1.2, 1.4, 1).userData.skipFit = true;
    // “They shall mount up with wings like eagles” (Isaiah 40:31); “like an eagle that stirs up its nest,
    // that flutters over its young, spreading out its wings” (Deuteronomy 32:11; Exodus 19:4).
    bird(scene, 0, 6, 0, 3.2, 0x5a3a22, { spread: true, ry: 0.4, beak: 0xd8a040 });
    const nest = grp(scene, -5.4, 9.6, -5.4); for (let i = 0; i < 16; i++) tor(nest, 1.2 - (i % 4) * 0.1, 0.12, MAT.bark, 0, i * 0.04, 0, Math.PI / 2, i); nest.userData.skipFit = true;
    bird(nest, 0.3, 0.6, 0.2, 0.9, 0xd8cfc0, { ry: 1 }); bird(nest, -0.4, 0.6, -0.3, 0.8, 0xd8cfc0, { ry: -1 });
    L(labels, [0, 9, 0], "Wings like eagles", "“They who wait for the LORD shall renew their strength; they shall mount up with wings like eagles; they shall run and not be weary; they shall walk and not faint.”", "Isaiah 40:31");
    L(labels, [-5.4, 12, -5.4], "On eagles' wings", "“You yourselves have seen what I did to the Egyptians, and how I bore you on eagles' wings and brought you to myself.”", "Exodus 19:4; Deuteronomy 32:11", true);
    L(labels, [3, 5, 2], "Which bird?", "The Hebrew nesher covers eagles and great vultures: wings up to 2.7 m across.", "Isaiah 40:31", true);
    return { view: v3(0.7, 0.2, 1.1), target: v3(-1, 7, -1), zoom: 1.2 };
  },

  sparrows({ scene, labels }) {
    plinth(scene, 1.2, 0xd9c9a3);
    // Two sparrows sold for a penny (an assarion), five for two pennies (Matthew 10:29-31; Luke 12:6-7).
    bird(scene, -0.2, 0.15, 0, 0.32, 0x8a6a4a, { ry: 0.4 }); bird(scene, 0.25, 0.15, 0.15, 0.32, 0x7a5a3a, { ry: 2.6 });
    rod(scene, [-0.25, 0.05, 0.02], [0.3, 0.05, 0.18], 0.006, MAT.rope);
    const c = mesh(scene, new THREE.CylinderGeometry(0.04, 0.04, 0.006, 20), BRONZE, 0.5, 0.005, -0.3); void c;
    L(labels, [0, 0.4, 0], "Two sparrows for a penny", "“Are not two sparrows sold for a penny? And not one of them will fall to the ground apart from your Father. Even the hairs of your head are all numbered. Fear not, therefore; you are of more value than many sparrows.”", "Matthew 10:29–31");
    L(labels, [0.5, 0.15, -0.3], "An assarion", "A small bronze coin, a sixteenth of a day's wage. Luke has five sparrows for two: the fifth thrown in free, “and not one of them is forgotten before God.”", "Luke 12:6–7", true);
    scale(scene, labels, -0.6, -0.5, true);
    return { view: v3(0.5, 0.45, 1) };
  },

  rooster({ scene, labels }) {
    ground(scene, 14, C.stone);
    // “Before the rooster crows twice, you will deny me three times” (Mark 14:30, 66-72), in the courtyard of the high priest by a charcoal fire.
    const r = bird(scene, 0, 1.0, 0, 1.4, 0x8a3a1a, { ry: 0.4, beak: 0xd8a040 });
    const comb = slab(r, [[0, 0], [0.1, 0.18], [0.18, 0.06], [0.26, 0.2], [0.34, 0.04], [0.36, 0]], 0.03, MAT.red, 0.5, 0.42, 0, 0, 0, 0); void comb;
    sph(r, 0.06, MAT.red, 0.66, 0.06, 0, 1, 1.5, 0.6);
    for (let i = 0; i < 5; i++) path(r, [[-0.4, 0.05, 0], [-0.7, 0.4 + i * 0.05, (i - 2) * 0.05], [-0.85, 0.1 - i * 0.05, (i - 2) * 0.07]], 0.03, mat([0x1a3a2a, 0x2a2a4a][i % 2], { rough: 0.4 }), 10);
    for (let i = 0; i < 8; i++) rock(scene, 0.25, 3 + Math.cos(i) * 0.8, 0.15, -2 + Math.sin(i) * 0.8, 0x7a7468);
    for (let i = 0; i < 10; i++) sph(scene, 0.1, i % 3 ? mat(0x2a2522) : MAT.ember, 3 + Math.cos(i * 2.4) * (i % 4) * 0.15, 0.12, -2 + Math.sin(i * 2.4) * (i % 4) * 0.15);
    figure(scene, 1.6, -3.2, { robe: 0x6b7f8c, beard: true, h: 4, face: Math.PI * 0.2, sit: true });
    L(labels, [0, 2.6, 0], "The rooster crowed", "“And immediately the rooster crowed a second time. And Peter remembered how Jesus had said to him… And he broke down and wept.”", "Mark 14:72");
    L(labels, [2.2, 3, -3], "Warming himself at the fire", "Peter sat with the guards in the high priest's courtyard. Three times he said, “I do not know this man.”", "Mark 14:54, 66–71");
    return { view: v3(0.8, 0.5, 1.1), target: v3(0.8, 1.2, -1) };
  },

  scapegoat({ scene, labels }) {
    ground(scene, 80, 0xc8b48a, false);
    hill(scene, 20, -25, -20, 10, 0xb8a888); hill(scene, 26, 20, -40, 14, 0xb0a080);
    // On the Day of Atonement Aaron laid both hands on the live goat, confessed all the sins of Israel
    // over it, and sent it away into the wilderness (Leviticus 16:20-22).
    beast(scene, 2, 0, { color: 0x3a3430, horns: true, ears: true, s: 0.75, face: -0.6 });
    tor(scene, 0.3, 0.05, MAT.scarlet, 3.1, 1.9, 0.4, 0, 0.6);
    figure(scene, 0.4, 1.2, { robe: 0xf6f2e8, cloth: 0xffffff, band: 0xe8e0cc, beard: true, h: 4, reach: true, face: -0.4 });
    figure(scene, 5, 2.5, { robe: 0x8b6f4e, beard: true, h: 4, face: -0.8 });
    for (let i = 0; i < 8; i++) rock(scene, 0.6 + (i % 3) * 0.3, -12 + i * 6, 0.3, -12 - (i % 2) * 6, 0xb0a48c).userData.skipFit = true;
    L(labels, [2, 2.6, 0], "The goat for Azazel", "“Aaron shall lay both his hands on the head of the live goat, and confess over it all the iniquities of the people of Israel… The goat shall bear all their iniquities on itself to a remote area.”", "Leviticus 16:21–22");
    L(labels, [5, 4.6, 2.5], "Led away by a man", "Someone appointed led it out into the wilderness and let it go.", "Leviticus 16:21", true);
    L(labels, [-10, 4, -15], "As far as the east is from the west", "“So far does he remove our transgressions from us.”", "Psalm 103:12; Isaiah 53:6", true);
    return { view: v3(0.7, 0.4, 1.1), target: v3(2, 1.6, 0.8) };
  },

  "locusts-and-honey"({ scene, labels }) {
    ground(scene, 14, 0xc8b48a, false);
    // John the Baptist wore a garment of camel's hair and a leather belt, and ate locusts and wild honey (Mark 1:6; Leviticus 11:22).
    const comb = grp(scene, 0.6, 0.02, 0.4, 0.3);
    for (let i = 0; i < 24; i++) { const x = (i % 6) * 0.14, z = Math.floor(i / 6) * 0.12 + (i % 2) * 0.06; mesh(comb, new THREE.CylinderGeometry(0.075, 0.075, 0.1, 6), mat(0xe8a830, { rough: 0.2, metal: 0.1 }), x, 0.05, z); }
    const dr = mesh(scene, new THREE.CircleGeometry(0.4, 20), mat(0xd89a20, { rough: 0.05, opacity: 0.85 }), 0.4, 0.004, -0.2, -Math.PI / 2); dr.userData.noShadow = true;
    const loc = (x, z, ry) => { const g = grp(scene, x, 0.05, z, ry); const m = mat(0x8a7a3a, { rough: 0.6 }); sph(g, 0.05, m, 0, 0, 0, 3.2, 0.9, 0.9); sph(g, 0.04, m, 0.17, 0.01, 0); [-1, 1].forEach((sd) => { rod(g, [0.05, 0, sd * 0.03], [-0.08, 0.1, sd * 0.07], 0.008, m); rod(g, [-0.08, 0.1, sd * 0.07], [-0.2, -0.04, sd * 0.08], 0.006, m); }); slab(g, [[0, 0], [-0.3, 0.02], [-0.32, -0.02]], 0.004, mat(0xa8984a, { rough: 0.7, opacity: 0.8 }), 0.05, 0.04, 0, Math.PI / 2); };
    for (let i = 0; i < 6; i++) loc(-0.8 + (i % 3) * 0.3, -0.4 + Math.floor(i / 3) * 0.3, i);
    const cloak = mesh(scene, new THREE.PlaneGeometry(1.8, 1.2, 10, 6), mat(0x9a7a50, { rough: 1, tex: "linen", rep: 3, side: THREE.DoubleSide }), -0.4, 0.04, 1.2, -Math.PI / 2, 0, 0.3); void cloak;
    tor(scene, 0.35, 0.03, MAT.leatherDark, 0.8, 0.03, 1.4, Math.PI / 2);
    L(labels, [0.6, 0.4, 0.4], "Wild honey", "From wild bees in the rocks of the wilderness.", "Mark 1:6; Deuteronomy 32:13");
    L(labels, [-0.5, 0.35, -0.3], "Locusts", "Clean food under the law: “of them you may eat… the locust of any kind.” Still eaten roasted or dried in the Middle East.", "Leviticus 11:22", true);
    L(labels, [-0.4, 0.3, 1.2], "Camel's hair and a leather belt", "Like Elijah, “a hairy man with a belt of leather about his waist.” John came in the spirit and power of Elijah.", "Mark 1:6; 2 Kings 1:8; Luke 1:17");
    scale(scene, labels, 1.2, -0.6, true);
    return { view: v3(0.4, 0.75, 1) };
  },

  "garden-tree"({ scene, labels }) {
    ground(scene, 40, 0x8faa5a, false);
    palm(scene, -9, -6, 11); palm(scene, 10, -9, 12);
    // In the middle of the garden the tree of life and the tree of the knowledge of good and evil; the serpent
    // (Genesis 2:9, 16-17; 3:1-7). The fruit is not named: an apple is a later tradition.
    const t = leafy(scene, 0, 0, 9, 0x4f8a43, 0xd85a3a, 34);
    const sn = []; for (let i = 0; i <= 30; i++) { const tt = i / 30, a = tt * Math.PI * 4; sn.push([Math.cos(a) * 0.55, 0.6 + tt * 4.6, Math.sin(a) * 0.55]); }
    path(t, sn, 0.08, mat(0x5a6a2a, { rough: 0.4 }), 80); sph(t, 0.15, mat(0x5a6a2a, { rough: 0.4 }), sn[30][0] + 0.15, sn[30][1] + 0.05, sn[30][2], 1.5, 0.7, 1);
    const life = leafy(scene, -6, 2, 7, 0x3f7a4a, 0xe8c040, 24, false); void life;
    const river = path(scene, [[-20, 0.03, 8], [-6, 0.03, 6], [4, 0.03, 9], [20, 0.03, 6]], 1.0, MAT.water, 40); river.scale.y = 0.05; river.userData.skipFit = true;
    L(labels, [0, 10, 0], "The tree of the knowledge of good and evil", "“Of the tree of the knowledge of good and evil you shall not eat.” The fruit is never named: the apple comes from later art and a Latin pun (malum, evil and apple).", "Genesis 2:16–17; 3:6");
    L(labels, [0.6, 5.6, 0.4], "The serpent", "“Did God actually say…?” Crafty, and later named “that ancient serpent, who is called the devil and Satan.”", "Genesis 3:1–5; Revelation 12:9");
    L(labels, [-6, 8, 2], "The tree of life", "In the middle of the garden too. After the fall, cherubim and a flaming sword guarded the way to it; in Revelation it stands by the river of life.", "Genesis 2:9; 3:22–24", false, "/bible/3d/river-of-life");
    L(labels, [10, 2, 7], "A river out of Eden", "Watering the garden, then dividing into four rivers, among them the Tigris and Euphrates.", "Genesis 2:10–14", true);
    return { view: v3(0.7, 0.35, 1.1), target: v3(-1.5, 4, 0.5) };
  },

  "hen-and-chicks"({ scene, labels }) {
    ground(scene, 8, C.sand, false);
    // “How often would I have gathered your children together as a hen gathers her brood under her wings,
    // and you were not willing!” (Matthew 23:37; Luke 13:34).
    const h = bird(scene, 0, 0.42, 0, 1.0, 0xb8864a, { ry: 0.5, beak: 0xd8a040 });
    sph(h, 0.4, mat(0xb8864a, { rough: 0.8 }), -0.05, -0.05, 0, 1.3, 0.8, 1.35);
    slab(h, [[0, 0], [0.06, 0.1], [0.12, 0.03], [0.18, 0.1], [0.2, 0]], 0.02, MAT.red, 0.38, 0.32, 0);
    [[0.5, 0.35], [0.55, -0.3], [-0.1, 0.55], [0.75, 0.05]].forEach(([x, z], i) => bird(scene, x, 0.1, z, 0.25, 0xf0d870, { ry: i * 1.4 }));
    L(labels, [0, 1.3, 0], "As a hen gathers her brood", "“O Jerusalem, Jerusalem, the city that kills the prophets… How often would I have gathered your children together as a hen gathers her brood under her wings, and you were not willing!”", "Matthew 23:37");
    L(labels, [0.6, 0.6, 0.3], "Under his wings", "“He will cover you with his pinions, and under his wings you will find refuge.”", "Psalm 91:4", true);
    scale(scene, labels, -0.8, -0.7, true);
    return { view: v3(0.6, 0.5, 1.1) };
  },

  "lost-sheep"({ scene, labels }) {
    ground(scene, 40, 0xb8ad7c, false);
    hill(scene, 14, -12, -14, 7, 0x9a9a6a); rock(scene, 2, 6, 1, -6, 0xb0a48c);
    // He lays it on his shoulders, rejoicing (Luke 15:3-7; Matthew 18:12-14; John 10:11).
    const sh = figure(scene, 0, 0, { robe: 0x8b6f4e, cloth: 0xe0d6c0, beard: true, h: 4, face: Math.PI * 0.2, raise: true });
    const lamb = beast(sh, 0, 0, { color: 0xf0ead8, wool: true, s: 0.5, y: 2.75 }); lamb.rotation.y = Math.PI / 2; lamb.position.x = -0.2;
    rod(scene, [0.9, 0, 0.6], [1.2, 4.2, 0.4], 0.05, MAT.olive);
    for (let i = 0; i < 12; i++) { const a = i * 2.4, r = 3 + (i % 4); beast(scene, -10 + Math.cos(a) * r, 8 + Math.sin(a) * r * 0.6, { color: i % 5 === 2 ? 0x3a3430 : 0xf0ead8, wool: true, s: 0.5, face: a }); }
    L(labels, [0, 5.4, 0], "On his shoulders, rejoicing", "“What man of you, having a hundred sheep, if he has lost one of them, does not leave the ninety-nine in the open country, and go after the one that is lost, until he finds it?”", "Luke 15:4–5");
    L(labels, [-10, 2.4, 8], "The ninety-nine", "“There will be more joy in heaven over one sinner who repents than over ninety-nine righteous persons who need no repentance.”", "Luke 15:7", true);
    L(labels, [1.2, 4.6, 0.4], "The good shepherd", "“I am the good shepherd. The good shepherd lays down his life for the sheep.”", "John 10:11", true, "/bible/3d/sheepfold");
    return { view: v3(0.7, 0.35, 1.1), target: v3(0, 3, 0), zoom: 0.35 };
  },

  "ravens-feed-elijah"({ scene, labels }) {
    ground(scene, 30, 0xa89a7a, false);
    rock(scene, 6, -4, 2, -7, 0x9d917a, 1.3, 1, 0.8).userData.skipFit = true;
    // By the brook Cherith ravens brought Elijah bread and meat morning and evening, and he drank from the brook (1 Kings 17:2-7).
    const brook = path(scene, [[-14, 0.03, 4], [-4, 0.03, 2], [4, 0.03, 3.5], [14, 0.03, 2]], 0.8, MAT.water, 40); brook.scale.y = 0.06; brook.userData.skipFit = true;
    figure(scene, 0, -1, { robe: 0x6b5236, cloth: 0x8a7656, beard: true, h: 4, sit: true, reach: true, face: 0.3 });
    bird(scene, 1.6, 3.4, 0.4, 0.9, 0x1d1b1a, { spread: true, ry: Math.PI * 0.8, beak: 0x2a2a2a });
    sph(scene, 0.12, MAT.bread, 1.1, 3.2, 0.4, 1, 0.6, 1);
    bird(scene, 2.8, 5.0, -1.4, 0.9, 0x1d1b1a, { spread: true, ry: Math.PI * 0.9, beak: 0x2a2a2a });
    bird(scene, 1.0, 0.2, 1.2, 0.8, 0x1d1b1a, { ry: 2.4, beak: 0x2a2a2a });
    L(labels, [1.6, 4.6, 0.4], "Ravens brought him bread and meat", "“The ravens brought him bread and meat in the morning, and bread and meat in the evening, and he drank from the brook.” Ravens: unclean birds, and famously greedy.", "1 Kings 17:6; Leviticus 11:15");
    L(labels, [0, 4, -1], "Elijah hidden by the brook", "During the drought he had announced to Ahab. When the brook dried up, God sent him to a widow in Zarephath.", "1 Kings 17:1–9");
    L(labels, [-8, 1, 3.6], "The brook Cherith", "East of the Jordan.", "1 Kings 17:3", true);
    return { view: v3(0.7, 0.4, 1.1), target: v3(0.8, 2, 0) };
  },

  "go-to-the-ant"({ scene, labels }) {
    plinth(scene, 1.4, 0xc8b48a);
    // “Go to the ant, O sluggard; consider her ways, and be wise… she prepares her bread in summer and
    // gathers her food in harvest” (Proverbs 6:6-8; 30:25). Harvester ants carry seeds to their nests.
    const mound = mesh(scene, new THREE.SphereGeometry(0.5, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xa8906a, { rough: 1, tex: "sand" }), 0, 0, 0); mound.scale.y = 0.4;
    mesh(scene, new THREE.CircleGeometry(0.06, 16), MAT.black, 0, 0.205, 0, -Math.PI / 2);
    const ant = (x, z, ry, seed) => { const g = grp(scene, x, 0.012, z, ry); const m = mat(0x2a1a12, { rough: 0.4 });
      sph(g, 0.012, m, -0.02, 0.012, 0, 1.4, 1, 1); sph(g, 0.007, m, 0.005, 0.012, 0); sph(g, 0.008, m, 0.02, 0.013, 0);
      [-1, 1].forEach((sd) => [-1, 0, 1].forEach((k) => rod(g, [0.004 + k * 0.006, 0.01, 0], [0.004 + k * 0.012, 0, sd * 0.018], 0.0015, m)));
      if (seed) sph(g, 0.007, mat(0xd8b860, { rough: 0.8 }), 0.032, 0.016, 0, 1.4, 1, 1); };
    for (let i = 0; i < 40; i++) { const t = i / 40; const a = t * Math.PI * 2.2; ant(Math.cos(a) * (0.6 + t * 0.5), Math.sin(a) * (0.6 + t * 0.5) * 0.7, -a - Math.PI / 2, i % 2 === 0); }
    for (let i = 0; i < 30; i++) sph(scene, 0.008, mat(0xd8b860, { rough: 0.8 }), 0.9 + Math.cos(i) * 0.2, 0.006, 0.6 + Math.sin(i) * 0.2, 1.4, 1, 1);
    L(labels, [0, 0.4, 0], "Go to the ant", "“Without having any chief, officer, or ruler, she prepares her bread in summer and gathers her food in harvest. How long will you lie there, O sluggard?”", "Proverbs 6:6–9");
    L(labels, [0.9, 0.15, 0.6], "Small but wise", "“Four things on earth are small, but they are exceedingly wise: the ants are a people not strong, yet they provide their food in the summer.”", "Proverbs 30:24–25", true);
    scale(scene, labels, -0.9, -0.6, true);
    return { view: v3(0.5, 0.8, 1) };
  },
};
