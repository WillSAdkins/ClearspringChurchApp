/* Home and everyday life, and clothes and jewellery. 1 unit = 1 cubit (about 45 cm). */
import {
  THREE, MAT, C, GOLD, BRONZE, SILVER, IRON, mat, mesh, grp, sph, cone, tor, rod, path, vessel, slab, rbox, box, cyl,
  textPlane, textTex, scale, L, plinth, ground, figure, beast, flame, rock, hill, v3, ref, bush, olive, palm, house,
} from "./kit.js";

// A clay oil lamp: a pinched saucer with a nozzle, or a round Herodian lamp.
function lamp(p, x, y, z, s = 1, lit = true, ry = 0) {
  const g = grp(p, x, y, z, ry);
  const body = vessel(g, [[0, 0], [0.12 * s, 0.005], [0.16 * s, 0.04 * s], [0.15 * s, 0.07 * s], [0.08 * s, 0.09 * s], [0.04 * s, 0.085 * s]], MAT.clay);
  body.scale.z = 0.85;
  rbox(g, 0.12 * s, 0.05 * s, 0.07 * s, 0.17 * s, 0.025 * s, 0, MAT.clay, 0.02 * s);
  if (lit) flame(g, 0.22 * s, 0.06 * s, 0, 0.45 * s);
  return g;
}
// A round flatbread or loaf.
function loaf(p, x, y, z, r = 0.25, h = 0.08, m = MAT.bread) { const o = mesh(p, new THREE.CylinderGeometry(r, r * 1.02, h, 24), m, x, y + h / 2, z); return o; }
// A woven basket.
function basket(p, x, y, z, r = 0.4, h = 0.4) {
  const g = grp(p, x, y, z), m = mat(0xc8a46a, { rough: 1, tex: "linen", rep: 3 });
  vessel(g, [[0, 0], [r * 0.8, 0], [r, h * 0.5], [r * 1.05, h], [r * 1.1, h * 1.05]], m);
  tor(g, r * 1.08, r * 0.06, mat(0xa8844a, { rough: 1 }), 0, h * 1.03, 0);
  return g;
}
// A long tunic laid flat (T shape), from cloth outline.
function tunic(p, x, y, z, col, w = 2.2, h = 3, sleeve = 0.9) {
  const g = grp(p, x, y, z);
  const shape = [[-w / 2, 0], [w / 2, 0], [w / 2 * 0.9, h * 0.72], [w / 2 + sleeve, h * 0.78], [w / 2 + sleeve, h * 0.98], [0.25, h], [0, h * 0.95], [-0.25, h], [-w / 2 - sleeve, h * 0.98], [-w / 2 - sleeve, h * 0.78], [-w / 2 * 0.9, h * 0.72]];
  slab(g, shape, 0.05, col, 0, 0, 0, -Math.PI / 2, 0, 0, 0.02);
  return g;
}
function coinMat(lines, bg = "#c9ced4", ink = "#5a5e64") { return new THREE.MeshStandardMaterial({ map: textTex(lines, { w: 256, h: 256, bg, ink, size: 54, font: "Georgia, serif" }), roughness: 0.3, metalness: 0.8 }); }

export const MODELS = {
  "oil-lamp"({ scene, labels }) {
    ground(scene, 6, 0xb8a888, false);
    // A lamp on a lampstand, not under a basket (Matthew 5:14-16; Mark 4:21).
    const st = grp(scene, 0, 0, 0);
    vessel(st, [[0, 0], [0.4, 0], [0.35, 0.08], [0.1, 0.2], [0.07, 2.4], [0.25, 2.5], [0.27, 2.55]], MAT.darkWood);
    lamp(scene, 0, 2.56, 0, 1.4);
    // The basket (modius) turned upside down beside it, and a second lamp being filled.
    const b = basket(scene, 1.2, 0.5, 0.4, 0.42, 0.5); b.rotation.x = Math.PI; b.position.y = 0.55;
    lamp(scene, -1.0, 0, 0.6, 1.2, false, 0.5);
    const jug = vessel(scene, [[0, 0], [0.14, 0.01], [0.2, 0.18], [0.16, 0.36], [0.08, 0.44], [0.06, 0.52], [0.09, 0.56]], MAT.clayLight, -1.6, 0, 0.1); void jug;
    L(labels, [0, 3.2, 0], "A lamp on a stand", "“Nor do people light a lamp and put it under a basket, but on a stand, and it gives light to all in the house. In the same way, let your light shine before others.”", "Matthew 5:15–16");
    L(labels, [1.2, 1.2, 0.4], "Under a basket", "The modius was a grain measure, about 9 litres: the bushel of older translations.", "Mark 4:21", true);
    L(labels, [-1.2, 0.5, 0.6], "Oil for the lamps", "Five wise bridesmaids took flasks of oil with their lamps; five foolish ones did not.", "Matthew 25:1–13");
    L(labels, [0.3, 2.9, 0.3], "A lamp to my feet", "A small clay lamp with a wick of flax, burning olive oil: “Your word is a lamp to my feet and a light to my path.”", "Psalm 119:105", true);
    return { view: v3(0.8, 0.5, 1) };
  },

  "lost-coin"({ scene, labels }) {
    ground(scene, 8, 0xb8a888, false);
    // A woman with ten silver coins loses one, lights a lamp and sweeps the house (Luke 15:8-10).
    const fl = mesh(scene, new THREE.CircleGeometry(4, 48), mat(0x8a7a62, { rough: 1, tex: "rock", rep: 3 }), 0, 0.01, 0, -Math.PI / 2); fl.userData.noShadow = true; fl.userData.skipFit = true;
    lamp(scene, 0.6, 0, 0.6, 1.3);
    const broom = grp(scene, -0.6, 0, -0.2, 0.4); rod(broom, [0, 0.3, 0], [0.3, 2.8, 0], 0.03, MAT.olive);
    for (let i = 0; i < 16; i++) rod(broom, [0, 0.35, 0], [(i - 8) * 0.03, 0.02, (i % 3 - 1) * 0.06], 0.012, mat(0xc8a850, { rough: 1 }));
    const c = mesh(scene, new THREE.CylinderGeometry(0.045, 0.045, 0.01, 24), coinMat(["ΔP"]), 1.1, 0.02, 1.0); c.rotation.z = 0.1;
    for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; mesh(scene, new THREE.CylinderGeometry(0.045, 0.045, 0.01, 24), SILVER, -1.6 + Math.cos(a) * 0.05 + (i % 3) * 0.1, 0.01 + i * 0.01, -1.4 + Math.sin(a) * 0.05); }
    figure(scene, -1.2, -0.6, { robe: 0x7a5a6a, cloth: 0x5a3a4a, skin: 1, face: 0.6, reach: true, skipFit: true });
    L(labels, [1.1, 0.4, 1.0], "The lost coin", "A silver drachma, about a day's wage. “Rejoice with me, for I have found the coin that I had lost.” So there is joy in heaven over one sinner who repents.", "Luke 15:8–10");
    L(labels, [-1.6, 0.4, -1.4], "Nine more", "Ten coins may have been her dowry, worn on a headdress.", "Luke 15:8", true);
    L(labels, [0.6, 0.8, 0.6], "Light a lamp and sweep", "Houses had small windows and packed-earth floors, so a dropped coin could vanish into the cracks.", "Luke 15:8", true);
    scale(scene, labels, 1.6, -0.6, true);
    return { view: v3(0.6, 0.8, 1), target: v3(0.4, 0.3, 0.4), zoom: 2.2 };
  },

  "bread-oven"({ scene, labels }) {
    ground(scene, 10, 0xb8a888, false);
    // A tannur: a clay oven open at the top; dough slapped onto the hot inside wall (Leviticus 26:26; Hosea 7:4-7).
    vessel(scene, [[0.9, 0], [1.0, 0.3], [0.9, 1.4], [0.6, 1.9], [0.45, 2.0], [0.42, 1.9]], MAT.clayDark);
    sph(scene, 0.35, MAT.ember, 0, 0.3, 0, 1, 0.4, 1);
    const lt = new THREE.PointLight(0xffa040, 1.5, 3, 2); lt.position.set(0, 1.4, 0); scene.add(lt);
    rbox(scene, 0.25, 0.4, 0.3, 0.95, 0, 0, MAT.clayDark, 0.05);
    for (let i = 0; i < 6; i++) loaf(scene, 1.6 + (i % 3) * 0.6, 0.3 + Math.floor(i / 3) * 0.05, -0.6 + Math.floor(i / 3) * 0.6, 0.3, 0.04);
    rbox(scene, 2, 0.3, 1.6, 2.2, 0, -0.3, MAT.limestone, 0.05);
    const kneed = vessel(scene, [[0, 0], [0.45, 0.02], [0.55, 0.2], [0.58, 0.25]], MAT.olive, -1.8, 0, 0.6); kneed.scale.z = 0.7;
    sph(scene, 0.3, mat(0xefe2c4, { rough: 0.9 }), -1.8, 0.15, 0.6, 1, 0.5, 0.8);
    figure(scene, -0.6, -1.5, { robe: 0x5d7a5a, cloth: 0x7a5a3a, skin: 2, sit: true, reach: true, face: 0.9, skipFit: true });
    L(labels, [0, 2.5, 0], "A clay oven", "Barley or wheat loaves were baked on the hot inside wall, or on the stones over the coals. Ten women baking in one oven meant famine.", "Leviticus 26:26");
    L(labels, [2.2, 0.8, -0.3], "Daily bread", "Bread was baked fresh every day: “Give us this day our daily bread.”", "Matthew 6:11");
    L(labels, [-1.8, 0.7, 0.6], "Kneading trough", "When Israel left Egypt they carried their dough before it was leavened, kneading bowls wrapped in their cloaks.", "Exodus 12:34", true);
    L(labels, [0.5, 1.6, 0.6], "Like a heated oven", "Hosea compares hearts burning with intrigue to an oven the baker stops stoking overnight.", "Hosea 7:4–7", true);
    return { view: v3(0.7, 0.65, 1) };
  },

  passover({ scene, labels }) {
    ground(scene, 10, 0xb8a888, false);
    // Eaten in haste, with belt fastened, sandals on and staff in hand (Exodus 12:1-14).
    rbox(scene, 3.4, 0.6, 2, 0, 0, 0, MAT.darkWood, 0.06);
    const pl = vessel(scene, [[0, 0], [0.6, 0.01], [0.75, 0.08], [0.8, 0.1]], MAT.clay, 0, 0.62, 0); void pl;
    // The roast lamb.
    const lamb = grp(scene, 0, 0.75, 0);
    sph(lamb, 0.3, mat(0x8a4a2a, { rough: 0.6 }), 0, 0, 0, 1.7, 0.8, 1); sph(lamb, 0.15, mat(0x8a4a2a, { rough: 0.6 }), 0.55, 0.1, 0, 1.3, 1, 0.9);
    [[-0.3, -0.12], [-0.3, 0.12], [0.3, -0.12], [0.3, 0.12]].forEach(([x, z]) => rod(lamb, [x, 0, z], [x * 1.3, -0.25, z * 1.6], 0.05, mat(0x8a4a2a, { rough: 0.6 })));
    // Unleavened bread, bitter herbs, salt water and a cup.
    for (let i = 0; i < 3; i++) loaf(scene, -1.1, 0.6 + i * 0.03, -0.4, 0.3, 0.025, mat(0xe8d4a0, { rough: 0.9 }));
    vessel(scene, [[0, 0], [0.18, 0.01], [0.25, 0.1]], MAT.clayLight, 1.1, 0.6, -0.5);
    for (let i = 0; i < 8; i++) { const lf = mesh(scene, new THREE.SphereGeometry(0.08, 8, 6), MAT.leaf, 1.1 + Math.cos(i) * 0.1, 0.72, -0.5 + Math.sin(i) * 0.1); lf.scale.set(1.5, 0.3, 0.6); }
    vessel(scene, [[0, 0], [0.06, 0.01], [0.04, 0.08], [0.03, 0.12], [0.09, 0.2], [0.1, 0.26]], MAT.clay, 1.0, 0.6, 0.5);
    const blood = grp(scene, -3.4, 0, -2.2); rbox(blood, 0.3, 4.8, 0.3, -1.2, 0, 0, MAT.wood, 0.04); rbox(blood, 0.3, 4.8, 0.3, 1.2, 0, 0, MAT.wood, 0.04); rbox(blood, 2.7, 0.35, 0.3, 0, 4.8, 0, MAT.wood, 0.04);
    [[-1.2, 2.6], [1.2, 2.8], [0, 4.95]].forEach(([x, y]) => mesh(blood, new THREE.PlaneGeometry(0.28, 0.6), mat(0x7a1a1a, { rough: 0.6 }), x, y, 0.16)); blood.userData.skipFit = true;
    // Staff and sandals.
    rod(scene, [1.9, 0, 1.2], [1.6, 3.6, 0.6], 0.04, MAT.olive);
    [[-0.5, 1.4], [-0.2, 1.45]].forEach(([x, z]) => rbox(scene, 0.22, 0.04, 0.55, x, 0, z, MAT.leatherDark, 0.03));
    L(labels, [0, 1.4, 0], "The Passover lamb", "A year-old male without blemish, roasted whole over the fire, eaten that night with nothing left till morning.", "Exodus 12:5–10");
    L(labels, [-1.1, 0.9, -0.4], "Unleavened bread", "No time for dough to rise. For seven days no yeast was found in their houses.", "Exodus 12:15, 39");
    L(labels, [1.1, 1.0, -0.5], "Bitter herbs", "A taste of the bitterness of slavery in Egypt.", "Exodus 12:8", true);
    L(labels, [-3.4, 5.6, -2.2], "Blood on the doorposts", "“When I see the blood, I will pass over you.”", "Exodus 12:7, 13");
    L(labels, [1.7, 3.4, 0.8], "Ready to go", "“With your belt fastened, your sandals on your feet and your staff in your hand. And you shall eat it in haste. It is the LORD's Passover.”", "Exodus 12:11", true);
    L(labels, [1.0, 1.2, 0.5], "Christ our Passover", "“Christ, our Passover lamb, has been sacrificed.”", "1 Corinthians 5:7", true);
    return { view: v3(0.7, 0.7, 1), target: v3(-0.3, 0.9, 0) };
  },

  "water-jars"({ scene, labels }) {
    ground(scene, 10, C.stone);
    // Six stone water jars for the Jewish rites of purification, each holding two or three measures,
    // 20 or 30 gallons (John 2:6-10). Stone vessels like these have been found in Jerusalem and Galilee.
    const stone = mat(0xe9e1cf, { rough: 0.7, tex: "plaster", rep: 1 });
    for (let i = 0; i < 6; i++) {
      const x = -3 + (i % 3) * 3, z = -1 + Math.floor(i / 3) * 2.4;
      vessel(scene, [[0, 0], [0.55, 0], [0.6, 0.1], [0.75, 0.7], [0.8, 1.6], [0.72, 2.2], [0.6, 2.4], [0.66, 2.55], [0.6, 2.6]], stone, x, 0, z, 48);
      for (let k = 0; k < 7; k++) tor(scene, 0.77 - Math.abs(k - 3) * 0.02, 0.015, mat(0xd8d0bc, { rough: 0.8 }), x, 0.8 + k * 0.2, z);
      const top = mesh(scene, new THREE.CircleGeometry(0.58, 32), i < 3 ? MAT.water : MAT.wine, x, 2.5, z, -Math.PI / 2); top.userData.noShadow = true;
    }
    const ladle = grp(scene, 3.6, 2.4, -0.3, -0.5); rod(ladle, [0, 0, 0], [0.9, 0.5, 0], 0.025, MAT.olive); vessel(ladle, [[0, -0.12], [0.1, -0.1], [0.12, 0]], MAT.clay, 0, 0, 0);
    L(labels, [0, 3.4, -1], "Six stone water jars", "For the purification rites, each holding 20 or 30 gallons (about 80–120 litres). “Fill the jars with water.” They filled them to the brim.", "John 2:6–7");
    L(labels, [0, 3.2, 1.4], "The best wine last", "“Everyone serves the good wine first… But you have kept the good wine until now.” The first of his signs, at a wedding in Cana.", "John 2:9–11");
    L(labels, [-3, 1.6, 1.4], "Why stone?", "Stone, unlike clay, could not become ritually unclean, so stone vessels were prized.", "Mark 7:3–4", true);
    scale(scene, labels, 4.6, 2.4);
    return { view: v3(0.8, 0.7, 1.1) };
  },

  "alabaster-jar"({ scene, labels }) {
    plinth(scene, 1.2, 0xd9c9a3);
    // An alabaster flask of pure nard, very costly; she broke the flask and poured it on his head (Mark 14:3-9).
    const al = mat(0xf2ead8, { rough: 0.35 });
    vessel(scene, [[0, 0], [0.12, 0.02], [0.17, 0.12], [0.17, 0.35], [0.12, 0.48], [0.05, 0.55], [0.04, 0.6]], al, 0, 0, 0);
    const neck = grp(scene, 0.32, 0.02, 0.18, 0.4); neck.rotation.z = Math.PI / 2;
    vessel(neck, [[0.045, 0], [0.04, 0.08], [0.06, 0.12], [0.065, 0.14]], al);
    [[-0.2, 0.25], [0.25, -0.3], [0.1, 0.35]].forEach(([x, z], i) => { const sh = mesh(scene, new THREE.SphereGeometry(0.06, 6, 4, 0, 1.5, 0, 1), al, x, 0.01, z); sh.rotation.set(Math.PI / 2, i, 0); });
    const pool = mesh(scene, new THREE.CircleGeometry(0.22, 24), mat(0xb88a3a, { rough: 0.05, opacity: 0.7 }), 0.15, 0.003, 0.05, -Math.PI / 2); pool.scale.set(1, 0.7, 1); pool.userData.noShadow = true;
    L(labels, [0, 0.8, 0], "An alabaster flask of nard", "Spikenard from the Himalayas, worth more than 300 denarii: a year's wages. “She has done a beautiful thing to me… she has anointed my body beforehand for burial.”", "Mark 14:3–9");
    L(labels, [0.35, 0.25, 0.2], "She broke the flask", "These flasks had long, sealed necks: to pour it all out, the neck was snapped.", "Mark 14:3", true);
    L(labels, [-0.3, 0.25, 0.3], "The house was filled", "In John's account Mary of Bethany anointed his feet and wiped them with her hair, and the house was filled with the fragrance.", "John 12:3", true);
    scale(scene, labels, -0.5, -0.4, true);
    return { view: v3(0.5, 0.55, 1) };
  },

  wineskins({ scene, labels }) {
    ground(scene, 8, 0xb8a888, false);
    // Goatskins for wine: new wine into fresh skins (Matthew 9:17; Joshua 9:4, 13; Psalm 119:83).
    const skin = (x, z, col, burst, ry) => {
      const g = grp(scene, x, 0, z, ry);
      const b = sph(g, 0.6, mat(col, { rough: 0.7 }), 0, 0.55, 0, 1.4, burst ? 0.55 : 0.9, 0.9); void b;
      [[-0.6, -0.3], [-0.6, 0.3], [0.5, -0.3]].forEach(([a, c]) => rod(g, [a, 0.6, c], [a * 1.35, 0.25, c * 1.3], 0.08, mat(col, { rough: 0.7 })));
      rod(g, [0.6, 0.7, 0], [1.05, 1.1, 0], 0.1, mat(col, { rough: 0.7 })); tor(g, 0.1, 0.025, MAT.rope, 1.0, 1.05, 0, 0, 0, Math.PI * 2);
      if (burst) { mesh(g, new THREE.CircleGeometry(0.5, 20), MAT.wine, 0.2, 0.01, 0.8, -Math.PI / 2).userData.noShadow = true; mesh(g, new THREE.BoxGeometry(0.4, 0.04, 0.12), MAT.black, -0.2, 0.86, 0.3).rotation.y = 0.6; }
      return g;
    };
    skin(-1.1, 0, 0x8a5a3a, false, 0.3); skin(1.3, 0.4, 0x4a3022, true, -0.4);
    L(labels, [-1.1, 1.6, 0], "New wine, fresh skins", "As new wine fermented it stretched the skin. A fresh skin gave; an old, dry one split. “Neither is new wine put into old wineskins.”", "Matthew 9:17");
    L(labels, [1.3, 1.4, 0.4], "Burst", "“If it is, the skins burst and the wine is spilled and the skins are destroyed.”", "Mark 2:22");
    L(labels, [0, 0.5, 1.2], "Worn and patched", "The Gibeonites tricked Joshua with old, cracked, mended wineskins.", "Joshua 9:4–13", true);
    scale(scene, labels, -0.2, -1.6, true);
    return { view: v3(0.4, 0.6, 1) };
  },

  "through-the-roof"({ scene, labels }) {
    ground(scene, 30, C.sand, false);
    // Four men open the roof above Jesus and let down the paralysed man on his mat (Mark 2:1-12).
    const h = house(scene, 0, 0, 12, 9, 7);
    // A hole in the roof: a darker patch, beams and broken roofing beside it.
    const hole = mesh(h, new THREE.BoxGeometry(2.6, 0.6, 1.6), MAT.black, 1.5, 7.25, 0); void hole;
    for (let i = 0; i < 4; i++) rod(h, [0.2, 7.55, -0.8 + i * 0.55], [2.8, 7.55, -0.8 + i * 0.55], 0.06, MAT.darkWood);
    for (let i = 0; i < 6; i++) rbox(h, 0.5, 0.18, 0.4, 3.5 + (i % 3) * 0.5, 7.5, -2 + Math.floor(i / 3) * 0.6, mat(0x9a8a6a, { rough: 1 }), 0.05);
    // The mat on ropes, half-way down.
    const mt = grp(h, 1.5, 5.9, 0);
    rbox(mt, 2.2, 0.08, 0.9, 0, 0, 0, MAT.wool, 0.03); sph(mt, 0.26, mat(0xa8714a), -0.8, 0.25, 0); mesh(mt, new THREE.CapsuleGeometry(0.28, 1.2, 6, 12), mat(0xc4b49a, { rough: 1 }), 0.1, 0.28, 0, 0, 0, Math.PI / 2);
    [[-1, -0.4], [-1, 0.4], [1, -0.4], [1, 0.4]].forEach(([x, z]) => rod(mt, [x, 0, z], [x * 0.7, 1.6, z * 0.6], 0.012, MAT.rope));
    // The four friends on the roof.
    [[0.2, -1.6], [2.8, -1.6], [0.2, 1.6], [2.8, 1.6]].forEach(([x, z], i) => figure(h, x, z, { robe: [0x8b6f4e, 0x6b7f8c, 0xa8875a, 0x5d7a5a][i], beard: i % 2 === 0, y: 7.5, reach: true, h: 3.6, face: z > 0 ? -Math.PI / 2 : Math.PI / 2 }));
    // The crowd at the door.
    for (let i = 0; i < 8; i++) figure(scene, -4 + (i % 4) * 1.4, 6 + Math.floor(i / 4) * 1.3, { robe: [0x7a5a6a, 0x8c5a3c, 0x4f6a7d, 0xb59a6e][i % 4], skin: i % 4, face: Math.PI, h: 3.6, skipFit: true });
    L(labels, [1.5, 10.5, 0], "Through the roof", "They could not get near because of the crowd, so they removed the roof above him, dug through it, and let down the mat. “Son, your sins are forgiven.”", "Mark 2:4–5");
    L(labels, [5, 9, 3], "Flat roofs", "Beams, branches and packed clay, reached by an outside stair. Roofs were used for drying flax, sleeping in summer and praying.", "Joshua 2:6; Acts 10:9", true);
    L(labels, [-2, 5, 7], "No room, not even at the door", "", "Mark 2:2", true);
    L(labels, [1.5, 4, 2], "“Rise, pick up your mat, and walk”", "He did, in front of them all, and they were amazed and glorified God.", "Mark 2:11–12", true);
    return { view: v3(0.9, 0.85, 1.2), target: v3(0, 5, 0) };
  },

  "key-and-door"({ scene, labels }) {
    ground(scene, 10, C.stone);
    // A wooden door with a sliding bolt, and the large wooden key with pegs that lifted the pins
    // (Judges 3:25; Isaiah 22:22; Revelation 3:7).
    const fr = mat(0xffffff, { tex: "stone", rough: 1, rep: 1 });
    rbox(scene, 1, 6, 1.2, -2, 0, 0, fr, 0.05); rbox(scene, 1, 6, 1.2, 2, 0, 0, fr, 0.05); rbox(scene, 5, 1, 1.2, 0, 6, 0, fr, 0.05);
    const door = rbox(scene, 3, 6, 0.25, 0, 0, 0, mat(0xffffff, { tex: "wood", rough: 0.85, rep: 1 }), 0.03); void door;
    rbox(scene, 1.4, 0.28, 0.25, 0.2, 3.2, 0.3, MAT.olive, 0.04);
    rbox(scene, 0.5, 0.6, 0.35, 1.2, 3.05, 0.3, MAT.darkWood, 0.04);
    for (let i = 0; i < 4; i++) cyl(scene, 0.03, 0.15, 0.95 + i * 0.12, 3.62, 0.3, MAT.darkWood);
    // The key: as long as a forearm, carried on the shoulder.
    const k = grp(scene, 0.4, 0.15, 1.4, 0.3);
    rod(k, [0, 0, 0], [2.0, 0, 0], 0.06, MAT.olive); rbox(k, 0.3, 0.14, 0.14, 2.0, -0.07, 0, MAT.olive, 0.03);
    for (let i = 0; i < 4; i++) cyl(k, 0.022, 0.18, 1.88 + (i % 2) * 0.1, 0.06, -0.04 + Math.floor(i / 2) * 0.08, mat(0x9a9a9a, { rough: 0.4, metal: 0.8 }));
    L(labels, [0, 7.4, 0], "The key of David", "“I will place on his shoulder the key of the house of David. He shall open, and none shall shut; he shall shut, and none shall open.” Keys were big enough to carry on the shoulder.", "Isaiah 22:22; Revelation 3:7");
    L(labels, [1.4, 0.6, 1.6], "A wooden key", "Pegs on the end lifted the pins that dropped into the bolt, so it could slide back.", "Judges 3:25", true);
    L(labels, [0, 4.2, 0.4], "Behold, I stand at the door and knock", "“If anyone hears my voice and opens the door, I will come in to him and eat with him, and he with me.”", "Revelation 3:20");
    L(labels, [-2, 2, 1], "The keys of the kingdom", "Jesus gave Peter the keys of the kingdom of heaven.", "Matthew 16:19", true);
    scale(scene, labels, -3.5, 1.5);
    return { view: v3(0.6, 0.35, 1) };
  },

  sandals({ scene, labels }) {
    plinth(scene, 1.2, 0xd9c9a3);
    // Leather soles with straps (Exodus 3:5; Ruth 4:7-8; Mark 1:7; Deuteronomy 29:5).
    [[-0.2, 0, 0.15], [0.2, 0.06, -0.15]].forEach(([x, z, ry], i) => {
      const g = grp(scene, x, 0.02, z, ry);
      slab(g, [[-0.1, -0.28], [0.08, -0.29], [0.11, 0], [0.1, 0.22], [0.04, 0.3], [-0.06, 0.3], [-0.11, 0.18], [-0.09, -0.05]], 0.03, MAT.leather, 0, 0, 0, -Math.PI / 2, 0, 0, 0.008);
      path(g, [[-0.1, 0.02, -0.05], [0, 0.1, -0.08], [0.1, 0.02, -0.05]], 0.012, MAT.leatherDark, 12);
      path(g, [[-0.1, 0.02, 0.12], [0, 0.08, 0.1], [0.1, 0.02, 0.12]], 0.012, MAT.leatherDark, 12);
      path(g, [[0, 0.03, 0.22], [0, 0.09, 0.05], [0, 0.1, -0.08]], 0.01, MAT.leatherDark, 12);
      if (i) path(g, [[0.08, 0.08, -0.1], [0.2, 0.1, -0.25], [0.3, 0.02, -0.35]], 0.01, MAT.leatherDark, 12);
    });
    L(labels, [0, 0.4, 0], "Sandals", "A leather sole tied with thongs. Taking them off was humble work, done by the lowest servant: John said he was not worthy to untie Jesus' sandal strap.", "Mark 1:7");
    L(labels, [0.3, 0.2, -0.3], "Holy ground", "“Take your sandals off your feet, for the place on which you are standing is holy ground.”", "Exodus 3:5", true);
    L(labels, [-0.3, 0.2, 0.3], "Sealing a deal", "In Israel, a man took off his sandal and gave it to the other to confirm a transaction: so Boaz redeemed Ruth.", "Ruth 4:7–8", true);
    scale(scene, labels, -0.5, -0.6, true);
    return { view: v3(0.4, 0.8, 1) };
  },

  "seamless-tunic"({ scene, labels }) {
    ground(scene, 10, C.sand, false);
    // The tunic woven in one piece from top to bottom, and the soldiers casting lots (John 19:23-24).
    tunic(scene, 0, 0.05, 0, mat(0xe9e1cf, { tex: "linen", rough: 1, rep: 2 }), 2.0, 3.2, 0.8);
    tunic(scene, -3.5, 0.05, 1.5, mat(0x8b6f4e, { tex: "linen", rough: 1, rep: 2 }), 2.6, 3.2, 0.2).rotation.y = 0.5;
    [[2.3, 0.4], [3.3, -0.3], [2.6, -1.2]].forEach(([x, z], i) => figure(scene, x, z, { robe: 0xa3302a, cloth: false, skin: 3, sit: true, face: Math.PI + i * 0.8, h: 3.8, skipFit: true }));
    [[2.9, -0.3], [3.0, -0.1]].forEach(([x, z]) => rbox(scene, 0.12, 0.12, 0.12, x, 0, z, MAT.ivory, 0.02));
    L(labels, [0, 0.8, 1.6], "Without seam", "Woven in one piece from top to bottom. “Let us not tear it, but cast lots for it to see whose it shall be.”", "John 19:23–24");
    L(labels, [2.9, 0.5, -0.3], "Casting lots", "“They divided my garments among them, and for my clothing they cast lots.”", "Psalm 22:18");
    L(labels, [-3.5, 0.6, 2.5], "The cloak", "An outer garment, also a blanket at night: a cloak taken in pledge had to be returned by sunset.", "Exodus 22:26–27", true);
    return { view: v3(0.6, 1.1, 1) };
  },

  "josephs-robe"({ scene, labels }) {
    ground(scene, 10, C.sand, false);
    // A long robe with sleeves (Genesis 37:3, 23, 31-33): Hebrew ketonet passim. "Many colours" follows the Greek.
    const c = document.createElement("canvas"); c.width = 128; c.height = 128; const g = c.getContext("2d");
    ["#b3202a", "#2d4f8c", "#d9a440", "#5b2c6f", "#2f6f68", "#e9e1cf"].forEach((col, i) => { g.fillStyle = col; g.fillRect(0, i * 22, 128, 22); });
    const tm = new THREE.CanvasTexture(c); tm.colorSpace = THREE.SRGBColorSpace;
    const robe = new THREE.MeshStandardMaterial({ map: tm, roughness: 0.95, side: THREE.DoubleSide });
    const fig = figure(scene, 0, 0, { robe: 0xffffff, skin: 2, face: Math.PI * 0.2 });
    fig.children[0].material = robe; fig.children.forEach((ch) => ch.children && ch.children.forEach((s) => { if (s.geometry && s.geometry.type === "CylinderGeometry" && s.position.y < 0) s.material = robe; }));
    figure(scene, 3, -1.5, { robe: 0x6b5236, beard: true, face: Math.PI * 0.8, skipFit: true });
    figure(scene, 4, 0.3, { robe: 0x5d7a5a, beard: true, face: Math.PI * 0.9, skipFit: true });
    L(labels, [0, 4.4, 0], "A robe with long sleeves", "Jacob loved Joseph more than all his sons and made him a special robe: probably long, with sleeves, not a working man's tunic. The Greek translation says “of many colours”.", "Genesis 37:3");
    L(labels, [3.4, 4.3, -0.6], "His brothers hated him", "They stripped him of it, threw him in a pit, sold him, dipped the robe in goat's blood and brought it to their father.", "Genesis 37:23–33");
    return { view: v3(0.8, 0.35, 1) };
  },

  tassels({ scene, labels }) {
    ground(scene, 8, C.sand, false);
    // Tassels on the four corners with a cord of blue (Numbers 15:38-41), phylacteries on the arm and
    // forehead and a mezuzah on the doorpost (Deuteronomy 6:8-9; Matthew 23:5).
    const sh = grp(scene, 0, 0.05, 0);
    slab(sh, [[-1.6, -1], [1.6, -1], [1.6, 1], [-1.6, 1]], 0.03, mat(0xf2ede0, { tex: "linen", rough: 1, rep: 2 }), 0, 0, 0, -Math.PI / 2, 0, 0, 0.01);
    [[-1.4, 0.3], [1.4, 0.3], [-1.4, -0.3], [1.4, -0.3]].forEach(([x, z]) => rbox(sh, 0.1, 0.035, 2.0, x, 0.01, 0, MAT.black, 0.01));
    [[-1.6, -1], [1.6, -1], [-1.6, 1], [1.6, 1]].forEach(([x, z]) => { for (let k = 0; k < 8; k++) path(sh, [[x, 0.04, z], [x + Math.sign(x) * (0.15 + k * 0.01), 0.03, z + Math.sign(z) * 0.1], [x + Math.sign(x) * 0.25, 0.02, z + Math.sign(z) * (0.45 + (k % 3) * 0.04)]], 0.008, k === 3 ? mat(0x2d4f8c) : MAT.white, 10); });
    // Phylacteries.
    const ph = grp(scene, 0.6, 0.05, 1.6, 0.3); rbox(ph, 0.2, 0.2, 0.2, 0, 0, 0, MAT.black, 0.02); path(ph, [[0.1, 0.02, 0], [0.6, 0.01, 0.2], [1.1, 0.01, -0.1], [1.4, 0.01, 0.3]], 0.015, MAT.black, 30);
    // A doorpost with a mezuzah.
    const dp = grp(scene, -2.6, 0, -1.6); rbox(dp, 0.6, 5, 0.6, 0, 0, 0, mat(0xffffff, { tex: "stone", rough: 1 }), 0.05); const mz = rbox(dp, 0.1, 0.45, 0.08, 0.15, 3.1, 0.33, MAT.olive, 0.02); mz.rotation.z = -0.3;
    L(labels, [1.7, 0.4, 1.0], "Tassels with a blue cord", "“Make tassels on the corners of your garments… with a cord of blue… to look at and remember all the commandments of the LORD.” A woman touched the fringe of Jesus' garment and was healed.", "Numbers 15:38–41; Mark 5:27–29");
    L(labels, [0.6, 0.6, 1.6], "Phylacteries", "Small boxes holding verses of the law, bound on the arm and forehead: “Bind them as a sign on your hand.” Jesus criticised those who made them broad to be seen.", "Deuteronomy 6:8; Matthew 23:5", true);
    L(labels, [-2.4, 3.8, -1.3], "On the doorposts", "“Write them on the doorposts of your house and on your gates.” A small case on the doorpost holds the words.", "Deuteronomy 6:9", true);
    scale(scene, labels, 2.6, -1.6);
    return { view: v3(0.4, 0.95, 1) };
  },

  "signet-ring"({ scene, labels }) {
    plinth(scene, 0.6, 0xd9c9a3);
    // A signet ring and a clay seal impression (Genesis 41:42; Esther 8:8; Haggai 2:23; Jeremiah 32:10).
    const r = grp(scene, -0.1, 0.03, 0, 0.3); r.rotation.x = Math.PI / 2 - 0.25;
    tor(r, 0.05, 0.012, GOLD, 0, 0, 0, 0, 0);
    const bezel = mesh(r, new THREE.CylinderGeometry(0.035, 0.035, 0.015, 24), mat(0x2a4a8a, { rough: 0.1 }), 0, 0.058, 0); void bezel;
    const seal = mesh(scene, new THREE.CylinderGeometry(0.08, 0.085, 0.02, 32), mat(0xa04a2a, { rough: 0.7 }), 0.15, 0.012, 0.08); void seal;
    textPlane(scene, ["לשמע"], 0.11, 0.11, 0.15, 0.023, 0.08, { bg: null, transparent: true, ink: "#6a2a12", w: 256, h: 256, size: 80, rx: -Math.PI / 2, font: "'Times New Roman', serif" });
    path(scene, [[0.05, 0.01, 0.05], [0.25, 0.01, 0.12], [0.4, 0.01, 0.02]], 0.004, MAT.rope, 12);
    L(labels, [-0.1, 0.18, 0], "A signet ring", "Pharaoh took his signet ring off his hand and put it on Joseph's: authority to act in the king's name.", "Genesis 41:42");
    L(labels, [0.15, 0.12, 0.1], "Sealed with the king's ring", "“An edict written in the name of the king and sealed with the king's ring cannot be revoked.” Hundreds of clay seal impressions survive from Judah.", "Esther 8:8", true);
    L(labels, [-0.2, 0.08, 0.15], "Like a signet ring", "“I will take you, O Zerubbabel… and make you like a signet ring, for I have chosen you.”", "Haggai 2:23", true);
    scale(scene, labels, -0.1, -0.5, true);
    return { view: v3(0.4, 0.75, 1) };
  },

  "crown-and-sceptre"({ scene, labels }) {
    plinth(scene, 1.4, 0x5b2c6f);
    // The crown of the king of Rabbah, a talent of gold with a precious stone (2 Samuel 12:30), and the
    // golden sceptre Ahasuerus held out to Esther (Esther 5:2).
    const cr = grp(scene, -0.35, 0.02, 0);
    vessel(cr, [[0.3, 0], [0.31, 0.16], [0.3, 0.2]], GOLD);
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; cone(cr, 0.05, 0.16, GOLD, Math.cos(a) * 0.3, 0.27, Math.sin(a) * 0.3); sph(cr, 0.025, GOLD, Math.cos(a) * 0.3, 0.37, Math.sin(a) * 0.3); }
    sph(cr, 0.05, mat(0xb3122e, { rough: 0.1 }), 0, 0.1, 0.3, 1, 1, 0.5);
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + 0.3; sph(cr, 0.025, mat([0x1f4fb3, 0x1f8a4c, 0xe8f1f5][i % 3], { rough: 0.1 }), Math.cos(a) * 0.31, 0.1, Math.sin(a) * 0.31, 1, 1, 0.6); }
    const sc = grp(scene, 0.4, 0.04, 0.1, -0.3); sc.rotation.z = Math.PI / 2;
    rod(sc, [0, -0.6, 0], [0, 0.6, 0], 0.025, GOLD); sph(sc, 0.08, GOLD, 0, 0.65, 0); sph(sc, 0.035, GOLD, 0, -0.62, 0);
    L(labels, [-0.35, 0.6, 0], "A crown of a talent of gold", "David took the crown of the king of the Ammonites from his head: a talent of gold, about 34 kg, with a precious stone. It was placed on David's head.", "2 Samuel 12:30");
    L(labels, [0.4, 0.3, 0.1], "The golden sceptre", "“When the king saw Queen Esther standing in the court, she won favour in his sight, and he held out to Esther the golden sceptre.”", "Esther 5:1–2");
    L(labels, [0.2, 0.2, 0.5], "Crowns cast down", "The elders lay their crowns before the throne.", "Revelation 4:10–11", true);
    scale(scene, labels, -0.9, 0.7, true);
    return { view: v3(0.4, 0.6, 1) };
  },

  "nose-ring-and-bracelets"({ scene, labels }) {
    plinth(scene, 0.6, 0xd9c9a3);
    // A gold ring weighing half a shekel and two bracelets of ten shekels (Genesis 24:22, 30, 47).
    tor(scene, 0.035, 0.007, GOLD, -0.1, 0.008, 0.05);
    [[0.08, -0.05, 0.5], [0.15, 0.06, -0.3]].forEach(([x, z, ry]) => { const b = tor(scene, 0.09, 0.016, GOLD, x, 0.02, z); b.rotation.set(Math.PI / 2 - 0.15, ry, 0); });
    const pouch = vessel(scene, [[0, 0], [0.06, 0.01], [0.08, 0.06], [0.05, 0.1], [0.03, 0.11]], MAT.leather, -0.25, 0, -0.12); void pouch;
    L(labels, [0, 0.18, 0], "A gold ring and two bracelets", "Abraham's servant gave Rebekah a gold ring of half a shekel (about 6 g) and two bracelets for her arms weighing ten shekels (115 g), when she watered his camels.", "Genesis 24:22, 47");
    L(labels, [-0.1, 0.08, 0.05], "In her nose", "“I put the ring on her nose and the bracelets on her arms.”", "Genesis 24:47", true);
    L(labels, [0.15, 0.1, -0.1], "Like a gold ring in a pig's snout", "“…is a beautiful woman without discretion.”", "Proverbs 11:22", true);
    scale(scene, labels, -0.2, -0.45, true);
    return { view: v3(0.4, 0.8, 1) };
  },

  "loaves-and-fishes"({ scene, labels }) {
    plinth(scene, 1.6, 0x9aa36b);
    // Five barley loaves and two fish, and the baskets of leftovers: twelve after the five
    // thousand, seven after the four thousand (John 6:9-13; Mark 8:8).
    const bk = basket(scene, 0, 0, 0, 0.45, 0.3);
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; loaf(bk, Math.cos(a) * 0.22, 0.25, Math.sin(a) * 0.22, 0.13, 0.08, mat(0xb98a4a, { rough: 0.95 })); }
    [[0.0, -0.05], [0.02, 0.08]].forEach(([x, z], i) => { const f = grp(bk, x, 0.38, z, i * 0.3); sph(f, 0.06, mat(0x8a7a5a, { rough: 0.5 }), 0, 0, 0, 2.6, 0.8, 0.5); slab(f, [[0, 0], [0.07, 0.05], [0.07, -0.05]], 0.01, mat(0x8a7a5a), 0.15, 0, 0); });
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; const b = basket(scene, Math.cos(a) * 1.2, 0, Math.sin(a) * 1.2, 0.18, 0.28); for (let k = 0; k < 3; k++) loaf(b, (k - 1) * 0.08, 0.2, 0, 0.07, 0.05, mat(0xb98a4a, { rough: 0.95 })).rotation.x = 0.8; }
    L(labels, [0, 0.8, 0], "Five barley loaves and two fish", "“There is a boy here who has five barley loaves and two fish, but what are they for so many?” Barley was the bread of the poor.", "John 6:9");
    L(labels, [1.2, 0.5, 0], "Twelve baskets left over", "About five thousand men ate and were satisfied, and they filled twelve baskets with the pieces left over.", "John 6:10–13");
    L(labels, [-1.2, 0.5, 0.3], "And seven", "At the feeding of the four thousand there were seven larger baskets of leftovers.", "Mark 8:1–9", true);
    scale(scene, labels, 0.6, -1.4, true);
    return { view: v3(0.4, 0.9, 1) };
  },

  manger({ scene, labels }) {
    ground(scene, 10, 0xb8a888, false);
    // A stone feeding trough, like those found at Megiddo, with straw and swaddling cloths (Luke 2:7, 12).
    const st = MAT.limestone;
    rbox(scene, 2.4, 1.1, 1.1, 0, 0, 0, st, 0.1);
    rbox(scene, 2.0, 0.2, 0.75, 0, 0.92, 0, mat(0xe0c070, { rough: 1 }), 0.05);
    for (let i = 0; i < 30; i++) { const s = mesh(scene, new THREE.CylinderGeometry(0.015, 0.015, 0.5, 4), mat(0xe0c070, { rough: 1 }), -0.9 + (i % 10) * 0.2, 1.15, -0.25 + Math.floor(i / 10) * 0.25, Math.PI / 2, 0, i * 0.7); s.userData.noShadow = true; }
    const baby = grp(scene, 0, 1.18, 0);
    mesh(baby, new THREE.CapsuleGeometry(0.16, 0.45, 8, 16), mat(0xf2ede0, { tex: "linen", rough: 1 }), 0.05, 0.08, 0, 0, 0, Math.PI / 2);
    for (let i = 0; i < 4; i++) tor(baby, 0.165, 0.012, mat(0xe0d8c4, { rough: 1 }), -0.12 + i * 0.12, 0.08, 0, 0, Math.PI / 2);
    sph(baby, 0.13, mat(0xc68a5e, { rough: 0.7 }), -0.38, 0.12, 0);
    beast(scene, -2.6, -1.4, { color: 0x8a7a6a, ears: true, s: 0.95, face: 0.6 });
    beast(scene, 2.3, -1.6, { color: 0x7a5038, horns: true, s: 1.0, face: Math.PI - 0.6 });
    L(labels, [0, 1.9, 0], "Laid in a manger", "“She gave birth to her firstborn son and wrapped him in swaddling cloths and laid him in a manger, because there was no place for them in the inn.”", "Luke 2:7");
    L(labels, [0.9, 1.2, 0.5], "A sign for the shepherds", "“You will find a baby wrapped in swaddling cloths and lying in a manger.”", "Luke 2:12", true);
    L(labels, [1.2, 0.6, 0.6], "Stone, not wood", "Feeding troughs of the time were usually cut from stone.", "Luke 2:7", true);
    return { view: v3(0.8, 0.6, 1), target: v3(0, 0.9, 0), zoom: 0.75 };
  },

  "abrahams-tent"({ scene, labels }) {
    ground(scene, 40, C.sand, false);
    olive(scene, -10, -8, 9, false);
    // A tent of black goats' hair on poles, by the oaks of Mamre, where Abraham welcomed three visitors (Genesis 18:1-8).
    const tent = grp(scene, 0, 0, 0);
    const cloth = mat(0x2a2522, { rough: 1, tex: "linen", rep: 4, side: THREE.DoubleSide });
    const geo = new THREE.PlaneGeometry(14, 8, 28, 16), p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); const pole = Math.max(0, 1 - Math.abs(Math.sin(x / 14 * Math.PI * 2.5)) * 0.6); p.setZ(i, 4.2 + pole * 0.8 - Math.pow(y / 4, 2) * 1.6); }
    geo.computeVertexNormals();
    const roof = mesh(tent, geo, cloth, 0, 0, 0, -Math.PI / 2); roof.position.y = 0;
    roof.rotation.x = -Math.PI / 2; roof.position.y = 0;
    const back = mesh(tent, new THREE.PlaneGeometry(14, 2.8), cloth, 0, 1.3, -4); void back;
    for (let i = 0; i < 6; i++) { rod(tent, [-6 + i * 2.4, 0, -1.5], [-6 + i * 2.4, 5, -1.5], 0.07, MAT.darkWood); rod(tent, [-6 + i * 2.4, 0, 1.5], [-6 + i * 2.4, 4.6, 1.5], 0.07, MAT.darkWood); }
    [-7, 7].forEach((x) => [-4, 4].forEach((z) => rod(tent, [x, 2.6, z], [x * 1.25, 0, z * 1.4], 0.012, MAT.rope)));
    rbox(scene, 4, 0.06, 3, 0, 0, 1.8, mat(0x9b2a2a, { rough: 1, tex: "linen" }), 0.02);
    figure(scene, 0, 2.8, { robe: 0xe9e1cf, cloth: 0x8b6f4e, beard: true, face: 0, skin: 2 });
    [[5, 5.5], [6.3, 4.2], [6.6, 6]].forEach(([x, z]) => figure(scene, x, z, { robe: 0xf6f2e8, cloth: 0xffffff, face: Math.PI * 1.15, skin: 1 }));
    figure(scene, -2.5, -0.8, { robe: 0x7a5a6a, cloth: 0x5a3a4a, skin: 1, face: 0.6, h: 3.8 });
    L(labels, [0, 6.4, 0], "A tent of goats' hair", "Black goats' hair cloth, woven in strips, kept off the sun and swelled in the rain. Abraham lived in tents as a stranger in the land of promise.", "Hebrews 11:9; Song of Solomon 1:5");
    L(labels, [6, 4.6, 5.3], "Three visitors", "Abraham ran to meet them, bowed, and set out bread, curds, milk and a tender calf.", "Genesis 18:1–8");
    L(labels, [-2.5, 4.2, -0.8], "Sarah laughed", "Inside the tent door she heard: “Sarah your wife shall have a son.”", "Genesis 18:9–15", true);
    L(labels, [-10, 9, -8], "The oaks of Mamre", "Near Hebron.", "Genesis 18:1", true);
    return { view: v3(0.8, 0.45, 1.1) };
  },
};
