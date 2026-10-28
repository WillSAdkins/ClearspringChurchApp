/* Places and buildings, and some of the Bible's biggest things to scale. 1 unit = 1 cubit (about 45 cm). */
import {
  THREE, MAT, C, GOLD, BRONZE, SILVER, IRON, mat, mesh, grp, sph, cone, tor, rod, path, vessel, slab, rbox, box, cyl,
  textPlane, textTex, scale, L, plinth, ground, figure, beast, flame, rock, hill, v3, ref, bush, olive, palm, house, people, ROBES,
} from "./kit.js";

const STONE = () => mat(0xffffff, { tex: "stone", rough: 1, rep: 2 });
// A colonnade of round columns from a to b.
function columns(p, a, b, n, h, r, m) {
  for (let i = 0; i < n; i++) { const t = n === 1 ? 0 : i / (n - 1); const x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t;
    mesh(p, new THREE.CylinderGeometry(r, r * 1.08, h, 16), m, x, h / 2, z); rbox(p, r * 2.8, r * 0.6, r * 2.8, x, h, z, m, r * 0.1); rbox(p, r * 2.6, r * 0.5, r * 2.6, x, 0, z, m, r * 0.1); }
}

export const MODELS = {
  "tower-of-babel"({ scene, labels }) {
    ground(scene, 400, 0xc8b48a, false);
    // A ziggurat of baked brick and bitumen (Genesis 11:3-9). The Bible gives no size. This follows
    // Etemenanki in Babylon, about 91 m square and as tall, in seven stages.
    const br = mat(0xb08a5a, { rough: 1, tex: "stone", rep: 8 });
    const tiers = [[200, 74], [172, 40], [134, 13], [112, 13], [90, 13], [68, 13], [48, 34]];
    let y = 0; tiers.forEach(([w, h], i) => { const t = rbox(scene, w, h, w, 0, y, 0, i === 6 ? mat(0x3a5aa0, { rough: 0.5 }) : br, 1); void t; y += h; });
    // The great central stair and two side stairs.
    const st = slab(scene, [[0, 0], [0, 74], [20, 74], [120, 0]], 22, br, 0, 0, 0, 0, Math.PI / 2, 0); st.position.set(0, 0, 100);
    [-1, 1].forEach((sd) => { const s2 = slab(scene, [[0, 0], [60, 74], [60, 70], [4, 0]], 12, br, 0, 0, 0, 0, 0, 0); s2.position.set(sd * 40, 0, 106); s2.rotation.y = sd > 0 ? 0 : Math.PI; s2.position.x = sd * 30; });
    for (let i = 0; i < 12; i++) figure(scene, -30 + i * 5, 150 + (i % 3) * 4, { robe: ROBES[i % 8], skin: i % 4, face: Math.PI, h: 4, skipFit: true });
    L(labels, [0, 210, 0], "A tower with its top in the heavens", "“Come, let us build ourselves a city and a tower with its top in the heavens, and let us make a name for ourselves.” The LORD confused their language and scattered them.", "Genesis 11:4–9");
    L(labels, [60, 60, 100], "Brick for stone, bitumen for mortar", "Mesopotamia had no building stone, so they fired bricks and used tar. Exactly what the Bible describes.", "Genesis 11:3");
    L(labels, [-110, 40, 0], "How big?", "The Bible gives no size. Babylon's great ziggurat, Etemenanki, was about 91 m square and 91 m high: some 200 cubits. People at its foot are shown for scale.", "Genesis 11:1–9", true);
    return { view: v3(0.9, 0.55, 1.3), target: v3(0, 80, 0) };
  },

  jericho({ scene, labels }) {
    ground(scene, 200, C.sand, false);
    palm(scene, 70, 40, 14); palm(scene, 85, 25, 12); palm(scene, -90, 60, 13);
    // A walled city on a mound: a stone revetment, a mud-brick wall on top, and houses built into
    // the wall, Rahab's among them (Joshua 2:15; 6:20).
    const tell = mesh(scene, new THREE.CylinderGeometry(55, 70, 14, 64), mat(0xc8b48a, { rough: 1, tex: "rock", rep: 6 }), 0, 7, 0); void tell;
    const brick = mat(0xa0784a, { rough: 1, tex: "stone", rep: 10 });
    const wall = mesh(scene, new THREE.CylinderGeometry(52, 53, 12, 64, 1, true, 0.5, Math.PI * 2 - 0.9), mat(0xa0784a, { rough: 1, tex: "stone", rep: 10, side: THREE.DoubleSide }), 0, 20, 0); void wall;
    // The fallen section.
    for (let i = 0; i < 30; i++) { const a = -0.4 + (i % 10) * 0.09; const r = 54 + Math.floor(i / 10) * 4; rbox(scene, 4, 1.6, 3, Math.cos(a) * r, 13 + (i % 3) * 0.8, Math.sin(a) * r, brick, 0.2).rotation.y = i; }
    // Rahab's house on the wall, the scarlet cord in the window.
    const rh = grp(scene, Math.cos(1.7) * 52.5, 14, Math.sin(1.7) * 52.5, -1.7 + Math.PI / 2);
    rbox(rh, 9, 14, 6, 0, 0, 0, mat(0xffffff, { tex: "plaster", rough: 1 }), 0.2);
    mesh(rh, new THREE.PlaneGeometry(1.6, 1.8), MAT.black, 0, 10, 3.02);
    path(rh, [[0, 10, 3.05], [0.2, 6, 3.2], [-0.1, 1, 3.3], [0.2, -5, 3.4]], 0.15, MAT.scarlet, 30);
    for (let i = 0; i < 14; i++) { const a = i * 0.45 + 0.9; house(scene, Math.cos(a) * 28, Math.sin(a) * 28, 10, 8, 7, -a).position.y = 14; }
    for (let i = 0; i < 7; i++) figure(scene, Math.cos(-0.2 + i * 0.09) * 85, Math.sin(-0.2 + i * 0.09) * 85, { robe: i === 3 ? 0xefe9dc : ROBES[i], cloth: i === 3 ? 0xffffff : undefined, skin: i % 4, face: Math.PI - (-0.2 + i * 0.09), h: 4, skipFit: true });
    L(labels, [0, 40, 0], "The walls fell down flat", "For six days Israel marched round the city once, on the seventh day seven times; the priests blew the trumpets, the people shouted, and the wall fell down flat.", "Joshua 6:15–20");
    L(labels, [Math.cos(1.7) * 52, 34, Math.sin(1.7) * 52], "Rahab's house and the scarlet cord", "Her house was built into the city wall. She let the spies down by a rope through the window, and tied a scarlet cord there so her family would be spared.", "Joshua 2:15–21; 6:22–25");
    L(labels, [85, 8, -10], "Seven priests with trumpets", "Rams' horns, before the ark of the LORD.", "Joshua 6:4–13", true, "/bible/3d/shofar");
    L(labels, [80, 20, 40], "The city of palms", "Jericho is an oasis in the Jordan valley, one of the oldest towns on earth.", "Deuteronomy 34:3", true);
    return { view: v3(1, 0.65, 1.1), target: v3(0, 14, 0) };
  },

  "herods-temple"({ scene, labels }) {
    ground(scene, 260, C.stone);
    // The sanctuary Herod rebuilt, as the Mishnah describes it: 100 cubits high, the porch 100 wide,
    // the house behind it 70 wide, faced with white stone and gold (Mark 13:1-2; John 2:20).
    const white = mat(0xf6f1e4, { rough: 0.6, tex: "stone", rep: 4 });
    const yard = mat(0xe4dac6, { rough: 1, tex: "stone", rep: 8 });
    rbox(scene, 135, 6, 187, 0, 0, 0, yard, 0.5);
    const s = grp(scene, 0, 6, -40);
    rbox(s, 70, 100, 90, 0, 0, -10, white, 1);
    rbox(s, 100, 100, 11, 0, 0, 40, white, 1);
    mesh(s, new THREE.PlaneGeometry(20, 40), mat(0x3a2a1a, { rough: 1 }), 0, 20, 45.6);
    mesh(s, new THREE.PlaneGeometry(10, 20), GOLD, 0, 52, 45.65);
    for (let i = 0; i < 18; i++) cone(s, 0.6, 3, GOLD, -48 + (i % 9) * 12, 101.5, i < 9 ? 45 : 36);
    // The altar, 32 cubits square at the base, with its ramp (Middot 3:1).
    const al = grp(scene, 0, 6, 30); rbox(al, 32, 10, 32, 0, 0, 0, mat(0xd8cfbd, { rough: 1, tex: "rock" }), 0.4);
    slab(al, [[0, 0], [32, 0], [0, 10]], 16, mat(0xd8cfbd, { rough: 1, tex: "rock" }), 0, 0, 0, 0, Math.PI / 2, 0).position.set(0, 0, 48);
    [[-14, -14], [14, -14], [-14, 14], [14, 14]].forEach(([x, z]) => cone(al, 1, 2, mat(0xd8cfbd, { rough: 1 }), x, 11, z));
    flame(al, 0, 10.4, 0, 6);
    // Court walls, the Nicanor gate and the Court of the Women.
    const cw = (w, d, x, z) => rbox(scene, w, 25, d, x, 6, z, white, 0.5);
    cw(135, 4, 0, -93); cw(4, 187, -66, 0); cw(4, 187, 66, 0); cw(55, 4, -40, 75); cw(55, 4, 40, 75);
    rbox(scene, 25, 30, 6, 0, 6, 75, mat(0xc8a46a, { rough: 0.4, metal: 0.6 }), 0.5);
    const cwomen = grp(scene, 0, 0, 140); rbox(cwomen, 135, 3, 135, 0, 0, 0, yard, 0.5); [[-66, 0, 4, 135], [66, 0, 4, 135], [0, 66, 135, 4]].forEach(([x, z, w, d]) => rbox(cwomen, w, 22, d, x, 3, z, white, 0.5));
    for (let i = 0; i < 4; i++) rbox(cwomen, 20, 22, 20, (i % 2 ? 1 : -1) * 54, 3, (i < 2 ? -1 : 1) * 54, white, 0.5);
    for (let i = 0; i < 20; i++) figure(scene, -30 + (i % 10) * 6, 120 + Math.floor(i / 10) * 8, { robe: ROBES[i % 8], skin: i % 4, h: 4, face: Math.PI, skipFit: true });
    L(labels, [0, 115, -30], "The sanctuary", "About 100 cubits (45 m) high, faced with white stone and gold: from a distance, people said, it looked like a mountain of snow.", "Mark 13:1");
    L(labels, [0, 22, 30], "The great altar", "Thirty-two cubits square at its base, of unhewn stones, approached by a ramp.", "Matthew 5:23–24", true);
    L(labels, [0, 40, 75], "The Nicanor gate", "Bronze doors between the Court of the Women and the inner courts: perhaps the Beautiful Gate of Acts 3.", "Acts 3:2", true);
    L(labels, [0, 28, 140], "The Court of the Women", "Where the treasury chests stood, and where the widow gave her two coins.", "Mark 12:41–44", true, "/bible/3d/widows-mites");
    L(labels, [-66, 34, -60], "Forty-six years", "“It has taken forty-six years to build this temple, and will you raise it up in three days?” But he was speaking about the temple of his body.", "John 2:20–21");
    return { view: v3(0.9, 0.55, 1.2), target: v3(0, 30, 20), zoom: 0.8 };
  },

  bethesda({ scene, labels }) {
    ground(scene, 160, C.stone);
    // A pool with five porticoes near the Sheep Gate (John 5:2): two pools divided by a colonnade,
    // with covered walks on four sides and one across the middle, as excavated.
    const w = mesh(scene, new THREE.PlaneGeometry(100, 120), MAT.water, 0, 0.6, 0, -Math.PI / 2); w.userData.noShadow = true;
    const rim = STONE();
    [[0, -62, 110, 6], [0, 62, 110, 6], [-53, 0, 6, 130], [53, 0, 6, 130]].forEach(([x, z, ww, d]) => rbox(scene, ww, 1.6, d, x, 0, z, rim, 0.2));
    rbox(scene, 110, 1.6, 8, 0, 0, 0, rim, 0.2);
    const col = mat(0xf0e8d6, { rough: 0.7 });
    columns(scene, [-50, -60], [50, -60], 11, 14, 0.9, col); columns(scene, [-50, 60], [50, 60], 11, 14, 0.9, col);
    columns(scene, [-52, -48], [-52, 48], 9, 14, 0.9, col); columns(scene, [52, -48], [52, 48], 9, 14, 0.9, col);
    columns(scene, [-50, 0], [50, 0], 11, 14, 0.9, col);
    [[0, -60, 110, 9], [0, 60, 110, 9], [-52, 0, 9, 128], [52, 0, 9, 128], [0, 0, 110, 9]].forEach(([x, z, ww, d]) => rbox(scene, ww, 1.2, d, x, 14.6, z, mat(0x9a6a3f, { rough: 0.9, tex: "wood", rep: 6 }), 0.2));
    for (let i = 0; i < 16; i++) figure(scene, -45 + (i % 8) * 12, (i < 8 ? -57 : 57), { robe: ROBES[i % 8], skin: i % 4, sit: i % 2 === 0, h: 4, face: i < 8 ? 0 : Math.PI, skipFit: true });
    figure(scene, -10, 3, { robe: 0xe9e1cf, cloth: 0xf2ede0, beard: true, h: 4, face: Math.PI / 2 });
    const mat2 = rbox(scene, 4, 0.3, 2, -4, 0, 4, MAT.wool, 0.05); void mat2;
    L(labels, [0, 20, -60], "Five porticoes", "“Now there is in Jerusalem by the Sheep Gate a pool, in Aramaic called Bethesda, which has five roofed colonnades.” Excavations found two pools with a dividing wall: four sides and one across the middle.", "John 5:2");
    L(labels, [-6, 8, 3], "“Get up, take up your bed, and walk”", "A man who had been ill for 38 years had no one to put him in the pool. Jesus healed him, on the Sabbath.", "John 5:5–9");
    L(labels, [40, 6, 40], "A multitude of invalids", "Blind, lame and paralysed people lay in the colonnades.", "John 5:3", true);
    return { view: v3(0.9, 0.7, 1.1), target: v3(0, 4, 0), zoom: 0.85 };
  },

  siloam({ scene, labels }) {
    ground(scene, 90, C.stone);
    // A stepped pool at the end of Hezekiah's tunnel, found in 2004: three flights of five steps
    // with landings (John 9:7; Nehemiah 3:15).
    const st = mat(0xe6dcc6, { rough: 0.9, tex: "stone", rep: 3 });
    for (let i = 0; i < 15; i++) { const k = Math.floor(i / 5), d = i * 1.2 + k * 2.2; rbox(scene, 110, 0.8 * (15 - i) + (2 - k) * 0.6, 4, 0, 0, 30 - d, st, 0.05); }
    const w = mesh(scene, new THREE.PlaneGeometry(110, 40), MAT.water, 0, 0.4, -14, -Math.PI / 2); w.userData.noShadow = true;
    figure(scene, -6, 13.6, { robe: 0x8b6f4e, h: 4, y: 6.4, face: Math.PI, reach: true });
    figure(scene, 6, 6.4, { robe: 0x6b7f8c, h: 4, y: 1.4, face: Math.PI, beard: true });
    L(labels, [0, 13, 10], "The pool of Siloam", "Jesus spat on the ground, made mud, put it on the blind man's eyes and said, “Go, wash in the pool of Siloam” (which means Sent). He went and washed and came back seeing.", "John 9:6–7");
    L(labels, [-30, 9, 18], "Steps on every side", "Built in three flights of five with landings, for pilgrims to bathe before going up to the temple.", "John 9:7", true);
    L(labels, [30, 2, -10], "Fed by Hezekiah's tunnel", "The water came from the Gihon spring, through the tunnel Hezekiah cut.", "2 Kings 20:20", true, "/bible/3d/hezekiahs-tunnel");
    return { view: v3(0.6, 0.6, 1.1), target: v3(0, 4, 8), zoom: 0.7 };
  },

  synagogue({ scene, labels }) {
    ground(scene, 60, C.stone);
    // A first-century synagogue like those at Magdala and Gamla: benches round the walls, columns,
    // a reading table; Jesus taught in them (Mark 1:21; Luke 4:16-20).
    const st = STONE(), bas = mat(0x5a5652, { rough: 1, tex: "rock" });
    [[0, -14, 36, 1], [0, 14, 36, 1], [-18, 0, 1, 29], [18, 0, 1, 29]].forEach(([x, z, w, d]) => rbox(scene, w, 7, d, x, 0, z, bas, 0.2));
    for (let k = 0; k < 3; k++) [[0, -13 + k * 1.2, 34 - k * 2.4, 1.2], [0, 13 - k * 1.2, 34 - k * 2.4, 1.2], [-17 + k * 1.2, 0, 1.2, 24 - k * 2.4], [17 - k * 1.2, 0, 1.2, 24 - k * 2.4]].forEach(([x, z, w, d]) => rbox(scene, w, 2.4 - k * 0.8, d, x, 0, z, st, 0.1));
    columns(scene, [-12, -8], [12, -8], 5, 9, 0.6, st); columns(scene, [-12, 8], [12, 8], 5, 9, 0.6, st);
    const tb = grp(scene, 0, 0, 0); rbox(tb, 3, 2.4, 2, 0, 0, 0, MAT.limestone, 0.1);
    // A carving of a lampstand on the reading table, as on the Magdala stone.
    const can = document.createElement("canvas"); can.width = 128; can.height = 128; const g = can.getContext("2d"); g.fillStyle = "#e6dcc6"; g.fillRect(0, 0, 128, 128); g.strokeStyle = "#7a6a50"; g.lineWidth = 5; g.beginPath(); g.moveTo(64, 110); g.lineTo(64, 30); [16, 30, 44].forEach((r) => { g.moveTo(64 - r, 30); g.quadraticCurveTo(64 - r, 80, 64, 80); g.quadraticCurveTo(64 + r, 80, 64 + r, 30); }); g.stroke(); g.strokeRect(46, 108, 36, 10);
    const ct = new THREE.CanvasTexture(can); ct.colorSpace = THREE.SRGBColorSpace;
    mesh(tb, new THREE.PlaneGeometry(1.8, 1.8), new THREE.MeshStandardMaterial({ map: ct, roughness: 1 }), 0, 1.2, 1.01);
    figure(scene, 0.4, -1.6, { robe: 0xe9e1cf, cloth: 0xf2ede0, beard: true, h: 4, face: Math.PI / 2, reach: true });
    for (let i = 0; i < 14; i++) figure(scene, -14 + (i % 7) * 4.6, i < 7 ? -12.6 : 12.6, { robe: ROBES[i % 8], skin: i % 4, sit: true, y: 1.6, h: 4, face: i < 7 ? Math.PI / 2 : -Math.PI / 2, beard: i % 2 === 0, skipFit: true });
    L(labels, [0, 6.5, -1.6], "He taught in their synagogues", "Every Sabbath, Scripture was read and explained. Visitors could be invited to speak: so Jesus, so Paul.", "Mark 1:21–22; Acts 13:14–15");
    L(labels, [0, 3, 1.3], "A reading table", "At Magdala a stone table carved with the temple lampstand was found in a synagogue from Jesus' time.", "Luke 4:16–20", true);
    L(labels, [16, 3, 0], "Benches round the walls", "Steps of seats on every side, facing the middle: everyone could see and be seen.", "Matthew 23:6", true);
    return { view: v3(0.8, 0.85, 1.1), zoom: 0.85 };
  },

  "hezekiahs-tunnel"({ scene, labels }) {
    // Cut through solid rock from both ends, 533 m long, to bring the Gihon spring inside the city
    // (2 Kings 20:20; 2 Chronicles 32:30). Shown cut open where the two crews met.
    const rk = mat(0xc9bda6, { tex: "rock", rough: 1, side: THREE.DoubleSide });
    const top = mesh(scene, new THREE.BoxGeometry(40, 1, 14), mat(0xb8ad7c, { rough: 1, tex: "grass" }), 0, 13, -2); top.userData.skipFit = true;
    const back = mesh(scene, new THREE.BoxGeometry(40, 14, 1), mat(0xb9ad96, { tex: "rock", rough: 1 }), 0, 6, -9); back.userData.skipFit = true;
    const curve = new THREE.CatmullRomCurve3([v3(-20, 1.8, 0), v3(-8, 2.2, -1.5), v3(-1, 2.5, 0.6), v3(1, 2.5, -0.6), v3(8, 2.2, 1.5), v3(20, 1.8, 0)]);
    const tube = new THREE.TubeGeometry(curve, 80, 2.0, 16, false);
    const pos = tube.attributes.position; for (let i = 0; i < pos.count; i++) if (pos.getZ(i) > 0.8 + curve.getPoint(Math.min(1, Math.max(0, (pos.getX(i) + 20) / 40))).z) pos.setZ(i, 0.8 + curve.getPoint(Math.min(1, Math.max(0, (pos.getX(i) + 20) / 40))).z);
    tube.computeVertexNormals(); mesh(scene, tube, rk);
    const w = mesh(scene, new THREE.PlaneGeometry(40, 2.6), MAT.water, 0, 0.35, 0, -Math.PI / 2); w.userData.noShadow = true;
    [[-2.2, 0.5], [2.2, -0.5]].forEach(([x, f], i) => { figure(scene, x, 0, { robe: 0x6b5236, cloth: false, skin: i + 1, h: 3.4, y: 0.3, reach: true, face: i ? Math.PI : 0, beard: true }); const pk = grp(scene, x + (i ? -1.2 : 1.2), 2.6, 0); rod(pk, [0, -1.2, 0], [0, 0.3, 0], 0.05, MAT.olive); slab(pk, [[-0.5, 0], [0.5, 0], [0, 0.15]], 0.08, IRON, 0, 0.3, 0); });
    flame(scene, -4, 1.2, -1, 0.8); flame(scene, 4, 1.2, 1, 0.8);
    textPlane(scene, ["…והכו החצבם איש לקרת רעו", "גרזן על גרזן וילכו המים"], 6, 1.4, 0, 8, -8.45, { bg: "#d8ccb4", ink: "#3a2a1a", w: 900, h: 220, size: 60, rtl: true, font: "'Times New Roman', serif" });
    L(labels, [0, 5.2, 0], "Where the crews met", "Two teams dug from each end and met in the middle. An inscription carved near the outlet tells how they heard each other's voices and struck “axe against axe”.", "2 Kings 20:20");
    L(labels, [0, 10, -8.4], "The Siloam inscription", "Now in Istanbul. “…and the water flowed from the spring to the pool, 1,200 cubits.”", "2 Chronicles 32:30", true);
    L(labels, [16, 4, 0], "Water inside the walls", "Hezekiah stopped the upper outlet of the Gihon and directed the water down to the west side of the city of David, before the Assyrians came.", "2 Chronicles 32:2–4, 30", true);
    return { view: v3(0.3, 0.25, 1), target: v3(0, 3.5, 0), zoom: 0.7 };
  },

  "house-of-the-forest"({ scene, labels }) {
    ground(scene, 160, C.stone);
    // The House of the Forest of Lebanon: 100 cubits long, 50 wide, 30 high, on four rows of cedar
    // pillars, with cedar beams; 45 pillars, fifteen in each row (1 Kings 7:2-5).
    const st = STONE(), cedar = mat(0xa0784a, { tex: "wood", rough: 0.7, rep: 1 });
    [[0, -25, 100, 1.4], [0, 25, 100, 1.4], [-50, 0, 1.4, 50], [50, 0, 1.4, 50]].forEach(([x, z, w, d], i) => { const r = rbox(scene, w, 30, d, x, 0, z, st, 0.2); if (i === 1) r.visible = false; });
    for (let row = 0; row < 4; row++) for (let i = 0; i < 15; i++) { const x = -45 + i * (90 / 14), z = -18 + row * 12; mesh(scene, new THREE.CylinderGeometry(1, 1.15, 28, 12), cedar, x, 14, z); }
    for (let row = 0; row < 4; row++) rbox(scene, 96, 1.4, 1.6, 0, 28, -18 + row * 12, cedar, 0.1);
    const roof = rbox(scene, 102, 1.4, 52, 0, 29.4, 0, cedar, 0.2); roof.visible = false;
    for (let i = 0; i < 6; i++) { const sh = grp(scene, -40 + i * 16, 18, -24.2); slab(sh, [[-2, -4], [2, -4], [2.2, 0], [2, 3.6], [0, 4.4], [-2, 3.6], [-2.2, 0]], 0.2, GOLD, 0, 0, 0); }
    for (let i = 0; i < 6; i++) figure(scene, -30 + i * 9, 6 + (i % 2) * 4, { robe: ROBES[i], skin: i % 4, h: 4, face: Math.PI * 0.5, skipFit: true });
    L(labels, [0, 34, 0], "100 × 50 × 30 cubits", "About 45 m long, 23 m wide and 14 m high: bigger than the temple itself. So many cedar pillars it was named after a forest.", "1 Kings 7:2");
    L(labels, [-30, 22, -23], "Shields of gold", "Solomon hung 500 gold shields here.", "1 Kings 10:17", true, "/bible/3d/gold-shields");
    L(labels, [30, 14, 10], "Rows of cedar pillars", "Pillars of cedar with cedar beams on them: forty-five, fifteen in each row (the Hebrew says four rows of pillars).", "1 Kings 7:2–3", true);
    L(labels, [50, 31, 25], "Thirteen years", "Solomon spent thirteen years building his own house, the palace complex this hall belonged to.", "1 Kings 7:1", true);
    return { view: v3(0.8, 0.6, 1.2), zoom: 0.9 };
  },

  "ishtar-gate"({ scene, labels }) {
    ground(scene, 120, C.sand);
    // The Ishtar Gate of Nebuchadnezzar's Babylon, glazed blue brick with lions, bulls and dragons:
    // the city Daniel lived in (Daniel 1:1-4; 4:30). Reconstructed in Berlin's Pergamon Museum.
    const c = document.createElement("canvas"); c.width = 256; c.height = 512; const g = c.getContext("2d");
    g.fillStyle = "#1f4f9a"; g.fillRect(0, 0, 256, 512); g.strokeStyle = "rgba(10,30,70,.5)"; g.lineWidth = 2; for (let y = 0; y < 512; y += 16) { g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke(); }
    const beastShape = (y, col) => { g.fillStyle = col; g.beginPath(); g.ellipse(128, y, 60, 20, 0, 0, 7); g.fill(); g.fillRect(80, y + 10, 10, 34); g.fillRect(166, y + 10, 10, 34); g.beginPath(); g.ellipse(196, y - 22, 16, 14, 0, 0, 7); g.fill(); g.beginPath(); g.moveTo(186, y - 30); g.lineTo(200, y - 60); g.lineTo(206, y - 30); g.fill(); };
    beastShape(100, "#e8d4a0"); beastShape(250, "#d89a4a"); beastShape(400, "#e8d4a0");
    g.fillStyle = "#e8d4a0"; for (let x = 8; x < 256; x += 28) { g.beginPath(); g.arc(x, 12, 6, 0, 7); g.fill(); g.beginPath(); g.arc(x, 500, 6, 0, 7); g.fill(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping;
    const blue = new THREE.MeshStandardMaterial({ map: t, roughness: 0.35 });
    const tower = (x, w, h, d) => { const m = rbox(scene, w, h, d, x, 0, 0, blue, 0.2); for (let i = 0; i < Math.floor(w / 3); i++) rbox(scene, 2, 3, d + 0.4, x - w / 2 + 1.5 + i * 3, h, 0, mat(0x1f4f9a, { rough: 0.4 }), 0.1); return m; };
    tower(-17, 12, 50, 22); tower(17, 12, 50, 22); rbox(scene, 22, 22, 18, 0, 34, 0, blue, 0.2);
    const arch = mesh(scene, new THREE.CylinderGeometry(8, 8, 18.4, 32, 1, false, -Math.PI / 2, Math.PI), mat(0x0e1e3a, { rough: 1 }), 0, 26, 0, Math.PI / 2, 0, 0); arch.rotation.set(Math.PI / 2, 0, 0);
    mesh(scene, new THREE.PlaneGeometry(16, 26), mat(0x0e1e3a, { rough: 1 }), 0, 13, 9.1);
    [-1, 1].forEach((sd) => rbox(scene, 30, 30, 10, sd * 38, 0, -4, blue, 0.2));
    for (let i = 0; i < 10; i++) figure(scene, -6 + (i % 5) * 3, 24 + Math.floor(i / 5) * 4, { robe: ROBES[i % 8], skin: i % 4, h: 4, face: Math.PI, skipFit: true });
    L(labels, [0, 58, 0], "The Ishtar Gate", "One of the gates of Nebuchadnezzar's Babylon, faced with glazed blue bricks and rows of bulls and dragons. Daniel and his friends walked through gates like this one.", "Daniel 1:1–6");
    L(labels, [38, 34, 2], "“Is not this great Babylon, which I have built?”", "Nebuchadnezzar boasted from his palace roof, and that hour he was driven out to live like an animal until he acknowledged the Most High.", "Daniel 4:29–37");
    L(labels, [-17, 30, 12], "Lions, bulls and dragons", "Some 120 lions lined the Processional Way leading up to it.", "Isaiah 13:19; Jeremiah 51:37", true);
    return { view: v3(0.6, 0.35, 1.2), target: v3(0, 26, 0), zoom: 0.9 };
  },

  "lions-den"({ scene, labels }) {
    const gr = mesh(scene, new THREE.RingGeometry(9, 40, 64), mat(0xffffff, { tex: "sand", rough: 1, rep: 4 }), 0, 0, 0, -Math.PI / 2); gr.userData.skipFit = true; gr.userData.noShadow = true;
    // A pit with an opening above, sealed with a stone and the king's signet (Daniel 6:16-23).
    const rk = mat(0xb9ad96, { tex: "rock", rough: 1, side: THREE.DoubleSide });
    const pit = mesh(scene, new THREE.CylinderGeometry(8, 9, 10, 40, 1, true, Math.PI * 0.15, Math.PI * 1.4), rk, 0, -5, 0); void pit;
    const floor = mesh(scene, new THREE.CircleGeometry(9, 40), mat(0x9a8a6a, { rough: 1, tex: "sand" }), 0, -10, 0, -Math.PI / 2); floor.userData.noShadow = true;
    const lid = mesh(scene, new THREE.CylinderGeometry(3, 3, 1, 32), MAT.rock, 6, 0.5, -6); void lid;
    mesh(scene, new THREE.CylinderGeometry(0.4, 0.4, 0.15, 20), mat(0xa04a2a, { rough: 0.7 }), 6, 1.05, -6);
    // Lions lying quiet, and Daniel standing among them.
    [[-4, -3, 0.6], [3, -4, 2.5], [-5, 2.5, -0.4], [2, 4, -2.2], [5.5, 1, 3.1]].forEach(([x, z, f]) => beast(scene, x, z, { color: 0xb8904a, mane: 0x7a5a2a, s: 1.1, y: -10, face: f }));
    figure(scene, 0, 0, { robe: 0xe9e1cf, cloth: 0x8b6f4e, beard: true, h: 4, y: -10, raise: true, face: Math.PI * 0.25 });
    const glow = mesh(scene, new THREE.SphereGeometry(1.4, 16, 12), new THREE.MeshBasicMaterial({ color: 0xfff1c8, transparent: true, opacity: 0.35 }), 0.6, -5, 1); glow.userData.skipFit = true;
    figure(scene, 10, 8, { robe: 0x5b2c6f, cloth: false, beard: true, face: Math.PI * 1.2, skipFit: true });
    L(labels, [0, -4.8, 0], "Daniel among the lions", "“My God sent his angel and shut the lions' mouths, and they have not harmed me, because I was found blameless before him.”", "Daniel 6:22");
    L(labels, [6, 2.5, -6], "Sealed with the king's signet", "A stone was laid on the mouth of the den, and the king sealed it with his own signet, so nothing might be changed concerning Daniel.", "Daniel 6:17");
    L(labels, [10, 5, 8], "King Darius", "He spent the night fasting, and at daybreak hurried to the den. “O Daniel, servant of the living God…”", "Daniel 6:18–20", true);
    return { view: v3(0.9, 0.8, 1.2), target: v3(0, -6, 0) };
  },

  "ephesus-theatre"({ scene, labels }) {
    ground(scene, 300, C.sand, false);
    hill(scene, 140, 0, -120, 60, 0xa39f6b);
    // The great theatre at Ephesus, seating about 25,000, where the crowd rushed shouting
    // “Great is Artemis of the Ephesians!” for two hours (Acts 19:23-41).
    const st = mat(0xe6dcc6, { rough: 0.9, tex: "stone", rep: 6, side: THREE.DoubleSide });
    for (let i = 0; i < 40; i++) { const r = 30 + i * 2.7; mesh(scene, new THREE.CylinderGeometry(r + 2.7, r + 2.7, 1.6, 48, 1, false, Math.PI * 0.5 - 0.15, Math.PI + 0.3), st, 0, i * 1.6 + 0.8, 0).userData.noShadow = true; }
    mesh(scene, new THREE.CircleGeometry(30, 48), mat(0xd8cfbd, { rough: 1, tex: "stone", rep: 4 }), 0, 0.05, 0, -Math.PI / 2);
    rbox(scene, 90, 22, 12, 0, 0, 34, st, 0.5);
    for (let i = 0; i < 12; i++) mesh(scene, new THREE.CylinderGeometry(0.9, 0.9, 16, 12), mat(0xf0e8d6, { rough: 0.7 }), -33 + i * 6, 8, 27);
    for (let i = 0; i < 32; i++) { const a = Math.PI * 0.55 + (i % 8) / 8 * Math.PI * 0.9, r = 34 + Math.floor(i / 8) * 14; figure(scene, Math.cos(a) * r, Math.sin(a) * -r, { robe: ROBES[i % 8], skin: i % 4, h: 4, y: (r - 30) / 2.7 * 1.6 + 1.6, raise: i % 3 === 0, face: -a + Math.PI / 2, skipFit: true }); }
    for (let i = 0; i < 2; i++) figure(scene, -2 + i * 4, 8, { robe: [0x6b7f8c, 0x8b6f4e][i], beard: true, h: 4, face: -Math.PI / 2 });
    L(labels, [0, 75, -60], "About 25,000 seats", "The whole city was filled with confusion and rushed together into the theatre, dragging Gaius and Aristarchus, Paul's travelling companions.", "Acts 19:29");
    L(labels, [0, 7, 8], "Gaius and Aristarchus", "Paul wanted to go in to the crowd, but the disciples and some of the officials would not let him.", "Acts 19:29–31", true);
    L(labels, [40, 40, -40], "“Great is Artemis of the Ephesians!”", "For about two hours they shouted it, until the town clerk quietened them. The silversmiths feared for their trade in shrines.", "Acts 19:24–34");
    return { view: v3(0.5, 0.7, 1.2), target: v3(0, 15, -30), zoom: 0.9 };
  },

  stocks({ scene, labels }) {
    ground(scene, 20, 0x8a7a62, false);
    // The inner prison at Philippi: Paul and Silas, their feet fastened in the stocks, praying and
    // singing hymns at midnight; then the earthquake (Acts 16:23-34).
    const rk = mat(0x6a6052, { tex: "stone", rough: 1, rep: 2 });
    rbox(scene, 14, 9, 1, 0, 0, -4, rk, 0.1); rbox(scene, 1, 9, 9, -7, 0, 0, rk, 0.1);
    const wood = mat(0x5a3b22, { tex: "wood", rough: 0.9 });
    rbox(scene, 6, 0.8, 0.5, 0, 0, 0, wood, 0.05); rbox(scene, 6, 0.6, 0.5, 0, 0.85, 0, wood, 0.05);
    [-2, -1.2, 1.2, 2].forEach((x) => mesh(scene, new THREE.CylinderGeometry(0.18, 0.18, 0.6, 16), MAT.black, x, 0.82, 0, Math.PI / 2));
    [[-1.6, 1], [1.6, -0.5]].forEach(([x, f], i) => { figure(scene, x, -1.4, { robe: [0x6b7f8c, 0x8b6f4e][i], beard: true, sit: true, h: 4, face: Math.PI / 2, raise: i === 0 }); });
    const lt = new THREE.PointLight(0xffa040, 1.2, 8, 2); lt.position.set(3, 3, 1); scene.add(lt);
    flame(scene, 4, 3, -3.4, 1);
    // A crack from the earthquake, and a chain fallen open.
    path(scene, [[-6.4, 9, -3.45], [-5, 6, -3.45], [-5.6, 3, -3.45], [-4.4, 0, -3.45]], 0.08, MAT.black, 20);
    for (let i = 0; i < 6; i++) tor(scene, 0.15, 0.04, MAT.darkIron, 3.5 + i * 0.25, 0.05, 1.2, Math.PI / 2, i % 2 * Math.PI / 2);
    L(labels, [0, 5.2, -1.4], "Hymns at midnight", "“About midnight Paul and Silas were praying and singing hymns to God, and the prisoners were listening to them.”", "Acts 16:25");
    L(labels, [0, 1.6, 0.4], "The stocks", "The jailer put them in the inner prison and fastened their feet in the stocks, after they had been beaten with rods.", "Acts 16:23–24");
    L(labels, [-5, 7, -3], "A great earthquake", "The foundations shook, all the doors opened, and everyone's chains came loose. “What must I do to be saved?” “Believe in the Lord Jesus.”", "Acts 16:26–31", true);
    return { view: v3(0.7, 0.5, 1.1), target: v3(0, 2.2, 0) };
  },

  "ogs-bed"({ scene, labels }) {
    ground(scene, 30, C.stone);
    // King Og's bed (or sarcophagus) of iron, nine cubits long and four wide, “according to the
    // common cubit” (Deuteronomy 3:11): about 4 m by 1.8 m.
    const b = grp(scene, 0, 0, 0);
    rbox(b, 9, 0.4, 4, 0, 1.6, 0, MAT.darkIron, 0.05);
    [[-4.3, -1.8], [4.3, -1.8], [-4.3, 1.8], [4.3, 1.8]].forEach(([x, z]) => rbox(b, 0.4, 1.6, 0.4, x, 0, z, MAT.darkIron, 0.05));
    rbox(b, 0.4, 2.4, 4, -4.3, 2, 0, MAT.darkIron, 0.05);
    rbox(b, 8.4, 0.5, 3.6, 0.1, 2.0, 0, MAT.wool, 0.2);
    // An ordinary bed beside it.
    const ob = grp(scene, 0, 0, 5); rbox(ob, 4.4, 0.3, 2, 0, 0.6, 0, MAT.wood, 0.05); [[-2, -0.8], [2, -0.8], [-2, 0.8], [2, 0.8]].forEach(([x, z]) => rbox(ob, 0.25, 0.6, 0.25, x, 0, z, MAT.wood, 0.03)); rbox(ob, 4, 0.3, 1.8, 0, 0.9, 0, MAT.wool, 0.1);
    scale(scene, labels, 5.6, 3);
    L(labels, [0, 4.2, 0], "Nine cubits by four", "“His bed was a bed of iron… Nine cubits was its length, and four cubits its breadth, according to the common cubit.” Og was the last of the Rephaim.", "Deuteronomy 3:11");
    L(labels, [0, 1.6, 5], "An ordinary bed", "About 4.4 cubits (2 m), for comparison.", "", true);
    L(labels, [-4.3, 4.6, 0], "Bed or coffin?", "The word can mean a couch or a sarcophagus; “iron” may be black basalt, common in Og's land of Bashan.", "Deuteronomy 3:11", true);
    return { view: v3(0.8, 0.8, 1.1) };
  },

  "grapes-of-eshcol"({ scene, labels }) {
    ground(scene, 40, 0xb8ad7c, false);
    // The spies cut a single cluster of grapes and carried it on a pole between two of them (Numbers 13:23-24).
    rod(scene, [-4, 4.0, 0], [4, 4.0, 0], 0.1, MAT.olive);
    const gr = mat(0x4a1a4a, { rough: 0.35 });
    for (let i = 0; i < 220; i++) { const t = i / 220, layer = Math.floor(i / 20); const r = 0.9 * (1 - t * 0.85) + 0.1; const a = i * 2.39996; sph(scene, 0.14, gr, Math.cos(a) * r, 3.4 - t * 3.0, Math.sin(a) * r * 0.85); void layer; }
    path(scene, [[0, 4.0, 0], [0, 3.6, 0.1]], 0.05, MAT.bark, 6);
    for (let i = 0; i < 4; i++) { const lf = mesh(scene, new THREE.CircleGeometry(0.6, 5), mat(0x5f7d43, { rough: 0.8, side: THREE.DoubleSide }), Math.cos(i * 1.6) * 0.7, 3.8, Math.sin(i * 1.6) * 0.7, -1.2, 0, i); void lf; }
    figure(scene, -4, 0, { robe: 0x6b7f8c, beard: true, h: 4, face: 0, raise: true });
    figure(scene, 4, 0, { robe: 0x8b6f4e, beard: true, h: 4, face: 0, raise: true });
    // A pomegranate and figs, also brought back.
    const pg = sph(scene, 0.3, mat(0xa3302a, { rough: 0.5 }), 1.6, 0.3, 2); void pg;
    for (let i = 0; i < 5; i++) sph(scene, 0.18, mat(0x5a3a5a, { rough: 0.6 }), 2.4 + (i % 3) * 0.3, 0.18, 1.6 + Math.floor(i / 3) * 0.3, 1, 1.2, 1);
    L(labels, [0, 5, 0], "One cluster, two men", "At the Valley of Eshcol (“cluster”) the spies cut a branch with a single cluster of grapes and carried it on a pole between two of them.", "Numbers 13:23–24");
    L(labels, [2, 1, 2], "Pomegranates and figs", "“It flows with milk and honey, and this is its fruit.”", "Numbers 13:27", true);
    L(labels, [-4, 4.8, 0], "But the people are strong", "Ten spies said they seemed like grasshoppers beside the giants. Only Joshua and Caleb said, “Let us go up at once.”", "Numbers 13:30–33", true);
    return { view: v3(0.5, 0.35, 1.1) };
  },

  "nehemiahs-wall"({ scene, labels }) {
    ground(scene, 40, C.sand, false);
    // Rebuilding Jerusalem's walls: each builder with his sword strapped on, the burden-bearers
    // working with one hand and holding a weapon in the other, a trumpeter beside Nehemiah (Nehemiah 4:16-20).
    const st = STONE();
    rbox(scene, 30, 10, 4, 0, 0, -2, st, 0.1);
    for (let i = 0; i < 12; i++) rbox(scene, 2.2, 1.4 + (i % 3) * 0.6, 4, -13 + i * 2.4, 10, -2, st, 0.05);
    for (let i = 0; i < 8; i++) rock(scene, 0.7, -10 + i * 3, 0.5, 4 + (i % 2), 0xb0a48c, 1.3, 0.8, 1);
    for (let i = 0; i < 4; i++) { const sc = grp(scene, -10 + i * 6, 0, 1.6); rod(sc, [-1, 0, 0], [-1, 10, -0.3], 0.07, MAT.darkWood); rod(sc, [1, 0, 0], [1, 10, -0.3], 0.07, MAT.darkWood); for (let k = 1; k < 10; k++) rod(sc, [-1, k, -k * 0.03], [1, k, -k * 0.03], 0.04, MAT.darkWood); }
    [[-8, 11.4, 0], [-2, 11.4, 0], [4, 11.4, 0], [9, 11.4, 0]].forEach(([x, y], i) => { figure(scene, x, -1.5, { robe: ROBES[i], beard: i % 2 === 0, h: 4, y: 10, face: Math.PI / 2, reach: true }); rod(scene, [x + 0.6, 11.0, -1.0], [x + 0.6, 10.2, -2.0], 0.04, IRON); });
    figure(scene, -5, 5, { robe: 0x6b5236, beard: true, h: 4, face: Math.PI, raise: true });
    spear2(scene, [-4.5, 0, 5.4], [-4.3, 5.5, 5.6]);
    figure(scene, 6, 6, { robe: 0x5b2c6f, cloth: 0xe9e1cf, beard: true, h: 4, face: Math.PI * 1.1 });
    figure(scene, 8, 7, { robe: 0x8b6f4e, h: 4, face: Math.PI * 1.1, raise: true });
    path(scene, [[8.3, 6.6, 7.3], [8.8, 7.0, 7.6], [9.2, 7.6, 7.5]], 0.12, mat(0xc8a878, { rough: 0.5 }), 12);
    L(labels, [0, 14, -2], "The wall rebuilt in 52 days", "“So the wall was finished… in fifty-two days. And when all our enemies heard of it… they perceived that this work had been accomplished with the help of our God.”", "Nehemiah 6:15–16");
    L(labels, [-5, 8, 5], "A tool in one hand, a weapon in the other", "“Each laboured on the work with one hand and held his weapon with the other.”", "Nehemiah 4:17–18");
    L(labels, [6, 4.6, 6], "Nehemiah and the trumpeter", "“In the place where you hear the sound of the trumpet, rally to us there. Our God will fight for us.”", "Nehemiah 4:19–20", true);
    return { view: v3(0.7, 0.45, 1.2), target: v3(0, 5, 1) };
  },

  "roman-road"({ scene, labels }) {
    ground(scene, 80, 0xb8ad7c, false);
    // A paved Roman road with kerbs and a milestone, like the roads Paul walked from Antioch to Rome
    // (Acts 16-28). The Bible names the Appian Way's Forum of Appius (Acts 28:15).
    const road = grp(scene, 0, 0, 0, 0.25);
    for (let i = 0; i < 160; i++) { const x = -40 + (i % 40) * 2, z = -2.4 + Math.floor(i / 40) * 1.6; rbox(road, 1.9 + (i % 3) * 0.1, 0.5, 1.5, x + (i % 2) * 0.3, 0, z, mat([0x6a6660, 0x7a756e, 0x5e5a54][i % 3], { rough: 0.8 }), 0.25); }
    [-3.4, 3.4].forEach((z) => rbox(road, 80, 0.8, 0.6, 0, 0, z, mat(0x8a857c, { rough: 1 }), 0.1));
    const ms = grp(scene, 6, 0, 6); mesh(ms, new THREE.CylinderGeometry(0.8, 0.9, 5, 24), MAT.limestone, 0, 2.5, 0); rbox(ms, 2, 0.8, 2, 0, 0, 0, MAT.limestone, 0.1);
    textPlane(ms, ["IMP CAESAR", "AVGVSTVS", "M P", "XLIII"], 1.4, 2.2, 0, 3.0, 0.82, { bg: null, transparent: true, ink: "#4a3a2a", w: 256, h: 400, size: 42 });
    figure(scene, -3, 1, { robe: 0x6b7f8c, beard: true, h: 4, face: 0.25 + Math.PI / 2 * 0, reach: true });
    figure(scene, -6, 0.5, { robe: 0x8b6f4e, h: 4, face: 0.25 });
    beast(scene, -10, -0.2, { color: 0x8a7a6a, ears: true, s: 1, face: 0.25 });
    L(labels, [6, 6.4, 6], "A milestone", "Every thousand paces a stone gave the distance and the emperor who built the road. Rome's roads made Paul's journeys possible: some 10,000 miles of them.", "Acts 16:1–12");
    L(labels, [-3, 4.6, 1], "Paul on the road", "Brothers from Rome came out as far as the Forum of Appius and Three Taverns to meet him on the Appian Way. “On seeing them, Paul thanked God and took courage.”", "Acts 28:15");
    L(labels, [-20, 1.5, -5], "Go the extra mile", "A soldier could make a civilian carry his pack one mile: “Go with him two.”", "Matthew 5:41", true);
    return { view: v3(0.7, 0.45, 1.1), target: v3(0, 1.5, 1), zoom: 0.45 };
  },
};

function spear2(p, a, b) { rod(p, a, b, 0.05, MAT.darkWood); const B = v3(...b), A = v3(...a), d = B.clone().sub(A).normalize(); const h = mesh(p, new THREE.ConeGeometry(0.12, 0.5, 4), IRON); h.position.copy(B).add(d.clone().multiplyScalar(0.25)); h.quaternion.setFromUnitVectors(v3(0, 1, 0), d); }
