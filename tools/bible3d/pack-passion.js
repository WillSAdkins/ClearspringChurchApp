/* The cross and the resurrection, and the last week in Jerusalem.
   Shown with reverence: the objects and places, never suffering bodies. 1 unit = 1 cubit. */
import {
  THREE, MAT, C, GOLD, BRONZE, SILVER, IRON, mat, mesh, grp, sph, cone, tor, rod, path, vessel, slab, rbox, box, cyl,
  textPlane, textTex, scale, L, plinth, ground, figure, beast, flame, rock, hill, v3, ref, bush, olive, palm, house,
} from "./kit.js";

const timber = () => mat(0x7a5a3a, { tex: "wood", rough: 0.95 });

function cross(p, x, z, h = 9, ry = 0, title = false) {
  const g = grp(p, x, 0, z, ry), w = timber();
  rbox(g, 0.5, h, 0.45, 0, -0.4, 0, w, 0.05);
  rbox(g, 4.4, 0.45, 0.4, 0, h * 0.72, 0.02, w, 0.05);
  if (title) {
    const t = grp(g, 0, h - 0.2, 0.26);
    mesh(t, new THREE.BoxGeometry(2.2, 1.0, 0.06), mat(0xe8dcc0, { rough: 0.9 }));
    mesh(t, new THREE.PlaneGeometry(2.1, 0.92), new THREE.MeshStandardMaterial({ map: textTex(["ישוע הנצרי מלך היהודים"], { bg: null, ink: "#2a1a10", w: 640, h: 90, size: 46, rtl: true, font: "'Times New Roman', serif" }), transparent: true, roughness: 0.9 }), 0, 0.28, 0.035);
    mesh(t, new THREE.PlaneGeometry(2.1, 0.92), new THREE.MeshStandardMaterial({ map: textTex(["IESVS NAZARENVS REX IVDAEORVM"], { bg: null, ink: "#2a1a10", w: 800, h: 90, size: 40 }), transparent: true, roughness: 0.9 }), 0, 0.0, 0.036);
    mesh(t, new THREE.PlaneGeometry(2.1, 0.92), new THREE.MeshStandardMaterial({ map: textTex(["ΙΗΣΟΥΣ Ο ΝΑΖΩΡΑΙΟΣ Ο ΒΑΣΙΛΕΥΣ ΤΩΝ ΙΟΥΔΑΙΩΝ"], { bg: null, ink: "#2a1a10", w: 1024, h: 90, size: 34 }), transparent: true, roughness: 0.9 }), 0, -0.28, 0.037);
  }
  return g;
}

export const MODELS = {
  "crown-of-thorns"({ scene, labels }) {
    plinth(scene, 1.0, 0x5b2c6f);
    // Twisted from thorny branches, with a purple robe and a reed (Mark 15:17-19; John 19:2-5).
    const g = grp(scene, 0, 0.12, 0);
    const br = mat(0x5a4a34, { rough: 0.9 });
    for (let k = 0; k < 4; k++) { const pts = []; for (let i = 0; i <= 40; i++) { const a = i / 40 * Math.PI * 2 * 1.1 + k * 1.3; pts.push([Math.cos(a) * (0.27 + Math.sin(a * 3 + k) * 0.02), Math.sin(a * 5 + k) * 0.03 + k * 0.012, Math.sin(a) * (0.27 + Math.sin(a * 3 + k) * 0.02)]); } path(g, pts, 0.014, br, 120); }
    for (let i = 0; i < 70; i++) { const a = i * 0.71, r = 0.27 + (i % 3) * 0.015; const d = v3(Math.cos(a), (i % 5 - 2) * 0.25, Math.sin(a)).normalize(); const o = cone(g, 0.008, 0.07, br, Math.cos(a) * r + d.x * 0.03, (i % 4) * 0.012 + d.y * 0.03, Math.sin(a) * r + d.z * 0.03); o.quaternion.setFromUnitVectors(v3(0, 1, 0), d); }
    const robe = mesh(scene, new THREE.PlaneGeometry(1.6, 1.0, 12, 8), mat(0x5b2c6f, { rough: 0.95, tex: "linen", side: THREE.DoubleSide }), 0.1, 0.03, -0.35, -Math.PI / 2, 0, 0.3); void robe;
    rod(scene, [-0.9, 0.04, 0.5], [0.8, 0.04, 0.75], 0.018, MAT.reed);
    L(labels, [0, 0.45, 0], "A crown of thorns", "“And twisting together a crown of thorns, they put it on his head and put a reed in his right hand. And kneeling before him, they mocked him, saying, ‘Hail, King of the Jews!’”", "Matthew 27:29");
    L(labels, [0.5, 0.2, -0.4], "A purple robe", "Purple was the colour of kings: the soldiers dressed him in it to mock him.", "Mark 15:17; John 19:2", true);
    L(labels, [-0.5, 0.2, 0.6], "A reed", "Put in his hand as a mock sceptre, then used to strike his head.", "Matthew 27:29–30", true);
    L(labels, [0.3, 0.3, 0.3], "He wore it", "Pilate brought him out wearing the crown of thorns and the purple robe: “Behold the man!”", "John 19:5", true);
    return { view: v3(0.3, 0.9, 1) };
  },

  "the-cross"({ scene, labels }) {
    ground(scene, 30, 0xa89a7a, false);
    rock(scene, 3, -6, 0.5, -6, 0xb0a48c, 1.5, 0.6, 1.2).userData.skipFit = true;
    // The cross, empty, with the title Pilate wrote in Hebrew, Latin and Greek (John 19:19-20).
    cross(scene, 0, 0, 10, 0, true);
    for (let i = 0; i < 6; i++) rock(scene, 0.35, Math.cos(i) * 0.7, 0.2, Math.sin(i) * 0.7, 0x9d917a);
    L(labels, [0, 10.8, 0.3], "The King of the Jews", "Pilate wrote a title and put it on the cross: “Jesus of Nazareth, the King of the Jews,” in Aramaic (Hebrew), Latin and Greek. The chief priests asked him to change it. “What I have written I have written.”", "John 19:19–22");
    L(labels, [0, 4, 0.4], "It is finished", "“Christ died for our sins in accordance with the Scriptures.” “He himself bore our sins in his body on the tree.”", "John 19:30; 1 Peter 2:24");
    L(labels, [1.6, 6.8, 0.4], "Taken down", "Joseph of Arimathea took the body down, wrapped it in a linen shroud and laid it in his own new tomb.", "Mark 15:46", true, "/bible/3d/empty-tomb");
    scale(scene, labels, 3.6, 2.6);
    return { view: v3(0.5, 0.3, 1) };
  },

  golgotha({ scene, labels }) {
    ground(scene, 80, 0xb8ad7c, false);
    // Outside the city wall, near a road, at a place called the Skull (John 19:17-20; Hebrews 13:12).
    const hl = hill(scene, 18, 0, 0, 7, 0xa89a7a); hl.userData.skipFit = false;
    [[-5, 1], [0, 0], [5, 1]].forEach(([x, z], i) => { const c = cross(scene, x, z, i === 1 ? 10 : 9, 0, i === 1); c.position.y = 6.4 - Math.abs(x) * 0.12; });
    const wall = grp(scene, -18, 0, -24, 0.4); rbox(wall, 50, 12, 3, 0, 0, 0, mat(0xffffff, { tex: "stone", rough: 1, rep: 6 }), 0.1); wall.userData.skipFit = true;
    for (let i = 0; i < 14; i++) rbox(wall, 1.6, 1.4, 3.2, -24 + i * 3.6, 12, 0, mat(0xffffff, { tex: "stone", rough: 1 }), 0.05);
    for (let i = 0; i < 6; i++) figure(scene, 10 + (i % 3) * 1.4, 10 + Math.floor(i / 3) * 1.3, { robe: [0x7a5a6a, 0x3a3430, 0x5d7a5a][i % 3], cloth: [0x5a3a4a, 0x2a2522, 0xe8e0cc][i % 3], skin: i % 4, face: Math.PI * 1.25, skipFit: true });
    L(labels, [0, 18, 0], "The place of a skull", "Golgotha in Aramaic, Calvary in Latin. “There they crucified him, and with him two others, one on either side, and Jesus between them.”", "John 19:17–18");
    L(labels, [-18, 14, -24], "Outside the city gate", "“So Jesus also suffered outside the gate in order to sanctify the people through his own blood.”", "Hebrews 13:12", true);
    L(labels, [11, 4.4, 11], "Standing at a distance", "Women who had followed him from Galilee watched: Mary Magdalene, Mary the mother of James and Joses, Salome. Near the cross stood his mother and the disciple he loved.", "Mark 15:40–41; John 19:25–27", true);
    L(labels, [-5, 15, 1], "Two others", "One mocked him. The other said, “Jesus, remember me when you come into your kingdom.” “Today you will be with me in paradise.”", "Luke 23:39–43", true);
    return { view: v3(0.8, 0.45, 1.2), target: v3(0, 8, 0), zoom: 0.6 };
  },

  "torn-veil"({ scene, labels }) {
    ground(scene, 20, C.stone);
    // The curtain of the temple was torn in two, from top to bottom (Matthew 27:51; Hebrews 10:19-20).
    const st = mat(0xffffff, { tex: "stone", rough: 1, rep: 2 });
    rbox(scene, 2.2, 22, 2.2, -10, 0, 0, st, 0.1); rbox(scene, 2.2, 22, 2.2, 10, 0, 0, st, 0.1); rbox(scene, 22.4, 2, 2.4, 0, 22, 0, st, 0.1);
    // Woven with cherubim in blue, purple and scarlet (Exodus 26:31): a canvas texture.
    const c = document.createElement("canvas"); c.width = 256; c.height = 512; const g = c.getContext("2d");
    const grd = g.createLinearGradient(0, 0, 256, 0); grd.addColorStop(0, "#2d4f8c"); grd.addColorStop(0.5, "#5b2c6f"); grd.addColorStop(1, "#b3202a"); g.fillStyle = grd; g.fillRect(0, 0, 256, 512);
    g.strokeStyle = "rgba(240,220,160,.55)"; g.lineWidth = 3; for (let y = 40; y < 512; y += 110) for (let x = 40; x < 256; x += 110) { g.beginPath(); g.moveTo(x, y + 40); g.lineTo(x - 30, y); g.lineTo(x, y + 15); g.lineTo(x + 30, y); g.closePath(); g.stroke(); g.beginPath(); g.arc(x, y + 50, 10, 0, 7); g.stroke(); }
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    [-1, 1].forEach((sd) => {
      const geo = new THREE.PlaneGeometry(9, 22, 10, 22), p = geo.attributes.position, uv = geo.attributes.uv;
      for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); const t = (11 - y) / 22; const inner = (x * sd < 0) ? (-x * sd) / 4.5 : 0; const ragged = (x * sd < -3.5) ? Math.sin(y * 7.3) * 0.18 + Math.sin(y * 3.1) * 0.12 : 0; p.setX(i, x + sd * (0.35 + t * 1.6) * inner + sd * ragged); p.setZ(i, Math.sin(x * 0.9 + y * 0.3) * 0.25 * t * inner); uv.setX(i, uv.getX(i) * 0.5 + (sd > 0 ? 0.5 : 0)); }
      geo.computeVertexNormals();
      mesh(scene, geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, side: THREE.DoubleSide }), sd * 4.55, 11, 0);
    });
    // The light of the Most Holy Place behind.
    const glow = mesh(scene, new THREE.PlaneGeometry(6, 20), new THREE.MeshBasicMaterial({ color: 0xfff1c8 }), 0, 10, -3); glow.userData.skipFit = true;
    L(labels, [0, 23.5, 1], "Torn from top to bottom", "When Jesus cried out and yielded up his spirit, “the curtain of the temple was torn in two, from top to bottom.” Torn from above, not by any man.", "Matthew 27:50–51");
    L(labels, [0, 9, 1], "A new and living way", "“We have confidence to enter the holy places by the blood of Jesus, by the new and living way that he opened for us through the curtain, that is, through his flesh.”", "Hebrews 10:19–20");
    L(labels, [-6, 15, 0.6], "Woven with cherubim", "Blue, purple and scarlet yarn and fine linen, with cherubim worked into it. The rabbis said the temple curtain was a handbreadth thick.", "Exodus 26:31–33", true);
    scale(scene, labels, 7, 4);
    return { view: v3(0.35, 0.2, 1) };
  },

  "sealed-tomb"({ scene, labels }) {
    ground(scene, 40, 0x9fae74, false);
    // The stone sealed and a guard set (Matthew 27:62-66).
    const cliff = rock(scene, 9, 0, 3, -8, 0xc4b89f, 1.6, 0.9, 0.8); cliff.userData.skipFit = true;
    rbox(scene, 7, 7, 0.6, 0, 0, -1.6, mat(0xc4b89f, { tex: "rock", rough: 1 }), 0.3);
    const st = mesh(scene, new THREE.CylinderGeometry(2.3, 2.3, 0.8, 40), mat(0xb9ad96, { tex: "rock", rough: 1 }), 0, 2.3, -0.9, Math.PI / 2, 0, 0); void st;
    // The seal: cords across, fixed with clay.
    [[-2.3, 2.6], [2.3, 2.0]].forEach(([x, y]) => { rod(scene, [x * 1.3, y, -1.1], [0, 2.3, -0.45], 0.025, MAT.rope); mesh(scene, new THREE.CylinderGeometry(0.22, 0.24, 0.1, 20), mat(0xa04a2a, { rough: 0.7 }), x * 1.3, y, -1.15, Math.PI / 2, 0, 0); });
    mesh(scene, new THREE.CylinderGeometry(0.3, 0.32, 0.12, 20), mat(0xa04a2a, { rough: 0.7 }), 0, 2.3, -0.42, Math.PI / 2, 0, 0);
    [[-3.6, 2.4], [3.6, 2.6]].forEach(([x, z], i) => { const s = figure(scene, x, z, { robe: 0xa3302a, cloth: false, skin: 3, face: Math.PI / 2 + (i ? 0.3 : -0.3) }); const hm = mesh(s, new THREE.SphereGeometry(0.33, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x9aa0a6, { rough: 0.25, metal: 0.95 }), 0, 3.42, 0); void hm; rod(scene, [x + 0.5, 0, z + 0.3], [x + 0.6, 5.2, z + 0.3], 0.04, MAT.darkWood); cone(scene, 0.09, 0.4, IRON, x + 0.6, 5.4, z + 0.3); });
    L(labels, [0, 5.2, -0.9], "Make it as secure as you can", "The chief priests remembered that he had said, “After three days I will rise.” Pilate said, “You have a guard of soldiers.”", "Matthew 27:62–65");
    L(labels, [2.9, 2.3, -1.0], "Sealing the stone", "Cords across the stone, fixed with clay and stamped: broken seals would show tampering.", "Matthew 27:66", true);
    L(labels, [3.6, 4.6, 2.6], "The guard", "When the angel rolled back the stone, the guards trembled and became like dead men.", "Matthew 28:2–4", true);
    return { view: v3(0.6, 0.4, 1.1), target: v3(0, 2.5, 0) };
  },

  "grave-clothes"({ scene, labels }) {
    ground(scene, 12, 0xc4b89f, false);
    // Inside the empty tomb: the linen cloths lying there, and the face cloth folded up in a place by itself (John 20:5-8).
    const rockM = mat(0xc4b89f, { tex: "rock", rough: 1, side: THREE.BackSide });
    const cave = mesh(scene, new THREE.SphereGeometry(7, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), rockM, 0, 0, 0); cave.scale.set(1, 0.6, 0.8); cave.userData.skipFit = true;
    rbox(scene, 5, 1.4, 2, 0, 0, -2.5, mat(0xd2c6ad, { tex: "rock", rough: 1 }), 0.1);
    const lin = mat(0xf6f2e8, { tex: "linen", rough: 1, rep: 2, side: THREE.DoubleSide });
    const geo = new THREE.PlaneGeometry(3.6, 1.2, 24, 8), p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, Math.max(0, 0.25 - Math.abs(y) * 0.2) * (0.6 + Math.sin(x * 4) * 0.2) + Math.abs(Math.sin(x * 9)) * 0.03); }
    geo.computeVertexNormals();
    mesh(scene, geo, lin, -0.3, 1.42, -2.5, -Math.PI / 2);
    const fc = grp(scene, 1.9, 1.42, -2.5, 0.3); for (let i = 0; i < 4; i++) rbox(fc, 0.55 - i * 0.02, 0.04, 0.4, 0, i * 0.04, 0, lin, 0.01);
    const light = new THREE.PointLight(0xfff1d8, 3, 14, 2); light.position.set(2, 3, 4); scene.add(light);
    L(labels, [-0.3, 2.2, -2.5], "The linen cloths lying there", "Peter went in and saw the linen cloths lying there. Not unwrapped and thrown aside: lying where the body had been.", "John 20:5–7");
    L(labels, [1.9, 2.0, -2.5], "Folded up by itself", "“…and the face cloth, which had been on Jesus' head, not lying with the linen cloths but folded up in a place by itself.” Then the other disciple went in, “and he saw and believed.”", "John 20:7–8");
    L(labels, [-2, 1.8, -2.5], "Myrrh and aloes", "Nicodemus had brought about 75 pounds of spices, bound in with the linen, as was the Jewish burial custom.", "John 19:39–40", true);
    return { view: v3(0.3, 0.5, 1), target: v3(0.4, 1.4, -2.3), zoom: 1.4 };
  },

  "bread-and-cup"({ scene, labels }) {
    ground(scene, 8, 0xb8a888, false);
    // “This is my body… This cup is the new covenant in my blood” (Luke 22:19-20; 1 Corinthians 11:23-26).
    rbox(scene, 2.6, 0.5, 1.6, 0, 0, 0, MAT.darkWood, 0.05);
    const bread = mesh(scene, new THREE.CylinderGeometry(0.42, 0.44, 0.08, 32, 1, false, 0, Math.PI * 1.7), mat(0xe2c890, { rough: 0.9 }), -0.4, 0.55, 0); void bread;
    const piece = mesh(scene, new THREE.CylinderGeometry(0.42, 0.44, 0.08, 16, 1, false, Math.PI * 1.72, Math.PI * 0.28), mat(0xe2c890, { rough: 0.9 }), -0.25, 0.55, 0.18); void piece;
    vessel(scene, [[0, 0], [0.16, 0.01], [0.12, 0.05], [0.05, 0.1], [0.05, 0.2], [0.16, 0.3], [0.2, 0.45], [0.21, 0.5]], MAT.clay, 0.55, 0.5, -0.1);
    mesh(scene, new THREE.CircleGeometry(0.19, 24), MAT.wine, 0.55, 0.93, -0.1, -Math.PI / 2).userData.noShadow = true;
    vessel(scene, [[0, 0], [0.2, 0.02], [0.3, 0.3], [0.25, 0.6], [0.12, 0.75], [0.1, 0.85], [0.14, 0.9]], MAT.clayLight, 1.05, 0.5, 0.4);
    lamp2(scene, -1.0, 0.5, -0.5);
    L(labels, [-0.4, 0.9, 0], "This is my body", "“And he took bread, and when he had given thanks, he broke it and gave it to them, saying, ‘This is my body, which is given for you. Do this in remembrance of me.’”", "Luke 22:19");
    L(labels, [0.55, 1.3, -0.1], "The new covenant in my blood", "“This cup that is poured out for you is the new covenant in my blood.” “As often as you eat this bread and drink the cup, you proclaim the Lord's death until he comes.”", "Luke 22:20; 1 Corinthians 11:26");
    L(labels, [1.05, 1.5, 0.4], "Fruit of the vine", "“I will not drink again of the fruit of the vine until the kingdom of God comes.”", "Luke 22:18", true, "/bible/3d/last-supper");
    return { view: v3(0.5, 0.8, 1), target: v3(0, 0.7, 0) };
  },

  "basin-and-towel"({ scene, labels }) {
    ground(scene, 10, 0xb8a888, false);
    // He laid aside his outer garments, tied a towel round his waist, poured water into a basin and
    // began to wash the disciples' feet (John 13:3-15).
    vessel(scene, [[0, 0], [0.4, 0.02], [0.65, 0.25], [0.7, 0.32]], MAT.clay, 0, 0, 0);
    mesh(scene, new THREE.CircleGeometry(0.62, 32), MAT.water, 0, 0.2, 0, -Math.PI / 2).userData.noShadow = true;
    vessel(scene, [[0, 0], [0.18, 0.02], [0.26, 0.3], [0.2, 0.55], [0.1, 0.7], [0.08, 0.8], [0.12, 0.84]], MAT.clayLight, -1.0, 0, -0.4);
    const tw = mesh(scene, new THREE.PlaneGeometry(1.4, 0.5, 10, 4), mat(0xf2ede0, { tex: "linen", rough: 1, side: THREE.DoubleSide }), 0.9, 0.03, 0.5, -Math.PI / 2, 0, 0.4); void tw;
    figure(scene, -1.4, 0.8, { robe: 0xe9e1cf, cloth: false, beard: true, sit: true, reach: true, face: -0.2, skin: 2 });
    figure(scene, 1.4, -0.6, { robe: 0x6b7f8c, beard: true, sit: true, face: Math.PI * 1.1, skin: 1 });
    L(labels, [0, 0.8, 0], "Washing feet", "A servant's job. “If I then, your Lord and Teacher, have washed your feet, you also ought to wash one another's feet. For I have given you an example.”", "John 13:12–15");
    L(labels, [1.4, 4.1, -0.6], "“You shall never wash my feet”", "“If I do not wash you, you have no share with me.” “Lord, not my feet only but also my hands and my head!”", "John 13:6–9", true);
    L(labels, [0.9, 0.3, 0.5], "The towel", "He tied it round his waist and dried their feet with it.", "John 13:4–5", true);
    return { view: v3(0.8, 0.6, 1) };
  },

  "charcoal-fire"({ scene, labels }) {
    ground(scene, 30, C.sand, false);
    const sea = mesh(scene, new THREE.PlaneGeometry(60, 26), MAT.water, 0, 0.03, -16, -Math.PI / 2); sea.userData.skipFit = true;
    // On the shore at dawn: a charcoal fire with fish laid on it, and bread (John 21:9-14).
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; rock(scene, 0.22, Math.cos(a) * 0.65, 0.12, Math.sin(a) * 0.65, 0x8a8478); }
    for (let i = 0; i < 18; i++) sph(scene, 0.09, i % 3 ? mat(0x2a2522, { rough: 1 }) : MAT.ember, Math.cos(i * 2.4) * (i % 5) * 0.1, 0.08, Math.sin(i * 2.4) * (i % 5) * 0.1, 1, 0.6, 1);
    const lt = new THREE.PointLight(0xffa040, 2, 5, 2); lt.position.set(0, 0.8, 0); scene.add(lt);
    [[-0.15, 0.6], [0.2, -0.2]].forEach(([x, r]) => { const f = grp(scene, x, 0.22, 0, r); sph(f, 0.08, mat(0x9a8a6a, { rough: 0.5 }), 0, 0, 0, 2.6, 0.7, 0.6); });
    for (let i = 0; i < 3; i++) mesh(scene, new THREE.CylinderGeometry(0.2, 0.21, 0.06, 20), mat(0xb98a4a, { rough: 0.95 }), 1.1 + i * 0.05, 0.03 + i * 0.06, 0.6);
    // The boat pulled up and the net of fish.
    const boat = grp(scene, -4, 0, -3.4, 0.4); const hull = mesh(boat, new THREE.SphereGeometry(1, 24, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), MAT.wood, 0, 0.9, 0); hull.scale.set(4, 0.9, 1.2);
    figure(scene, 1.5, -1, { robe: 0xe9e1cf, cloth: 0xf2ede0, beard: true, face: Math.PI * 1.05, skin: 2 });
    figure(scene, -1.6, 1.4, { robe: 0x6b7f8c, cloth: false, beard: true, sit: true, face: -0.6, skin: 1 });
    L(labels, [0, 1.0, 0], "A charcoal fire", "“They saw a charcoal fire in place, with fish laid out on it, and bread. ‘Come and have breakfast.’” The only other charcoal fire in the Gospels is the one where Peter denied him three times.", "John 21:9–12; 18:18");
    L(labels, [-1.6, 3.2, 1.4], "“Do you love me?”", "Three times Jesus asked Peter, and three times sent him: “Feed my sheep.”", "John 21:15–17");
    L(labels, [1.1, 0.5, 0.6], "Bread and fish", "“Jesus came and took the bread and gave it to them, and so with the fish.”", "John 21:13", true);
    return { view: v3(0.7, 0.6, 1), target: v3(0, 0.8, 0) };
  },

  "palm-sunday"({ scene, labels }) {
    ground(scene, 50, C.sand, false);
    olive(scene, -9, -7, 7); olive(scene, 9, -10, 6); palm(scene, -6, 6, 11);
    // A colt, cloaks on the road and palm branches, coming down the Mount of Olives (Mark 11:1-10; John 12:12-15; Zechariah 9:9).
    const road = mesh(scene, new THREE.PlaneGeometry(4, 40), mat(0xc8b48a, { rough: 1, tex: "sand", rep: 3 }), 0, 0.02, 0, -Math.PI / 2, 0, 0.3); road.userData.skipFit = true;
    [[-0.4, 3], [0.3, 5], [-0.2, 7], [0.5, 1]].forEach(([x, z], i) => { const c = mesh(scene, new THREE.PlaneGeometry(1.6, 1.0), mat([0x8b6f4e, 0x6b7f8c, 0xa3302a, 0x5d7a5a][i], { rough: 1, tex: "linen", side: THREE.DoubleSide }), x - z * 0.3, 0.04, z, -Math.PI / 2, 0, i); c.userData.noShadow = true; });
    for (let i = 0; i < 8; i++) { const b = grp(scene, -1.5 + (i % 4) * 1.0 - (i * 0.4), 0.06, 2 + i * 0.9, i * 0.8); path(b, [[0, 0, 0], [1.6, 0.05, 0]], 0.02, MAT.leaf, 6); for (let k = 0; k < 9; k++) rod(b, [0.2 + k * 0.15, 0.02, 0], [0.35 + k * 0.15, 0.02, (k % 2 ? 1 : -1) * 0.35], 0.012, MAT.leaf); }
    const donkey = beast(scene, 0, 0, { color: 0x8a7a6a, ears: true, s: 1.0, face: Math.PI / 2 + 0.3 }); void donkey;
    figure(scene, 0.05, -0.1, { robe: 0xe9e1cf, cloth: 0xf2ede0, beard: true, sit: true, y: 1.6, face: Math.PI / 2 + 0.3, skin: 2, h: 3.6 });
    for (let i = 0; i < 10; i++) figure(scene, (i % 2 ? 2.6 : -2.8) - (i * 0.25), 2 + i * 1.1, { robe: [0x8b6f4e, 0x6b7f8c, 0xa8875a, 0x7a5a6a, 0x5d7a5a][i % 5], skin: i % 4, beard: i % 3 === 0, raise: i % 2 === 0, face: (i % 2 ? Math.PI : 0) + Math.PI / 2, h: 3.7, skipFit: true });
    L(labels, [0, 5, 0], "Your king is coming, humble, mounted on a donkey", "“Rejoice greatly, O daughter of Zion!… on a colt, the foal of a donkey.” Kings rode horses to war; this one came in peace.", "Zechariah 9:9; Matthew 21:4–5");
    L(labels, [-1.5, 1.2, 4.5], "Cloaks on the road", "“Many spread their cloaks on the road, and others spread leafy branches that they had cut from the fields.”", "Mark 11:8", true);
    L(labels, [2.5, 4.6, 6], "Hosanna!", "“Blessed is he who comes in the name of the Lord, even the King of Israel!” Hosanna means “save us, please”.", "John 12:13; Psalm 118:25–26");
    return { view: v3(1, 0.6, 1.2), target: v3(0, 1.8, 2) };
  },
};

function lamp2(p, x, y, z) {
  const g = grp(p, x, y, z);
  vessel(g, [[0, 0], [0.12, 0.005], [0.16, 0.04], [0.15, 0.07], [0.08, 0.09], [0.04, 0.085]], MAT.clay).scale.z = 0.85;
  rbox(g, 0.12, 0.05, 0.07, 0.17, 0.025, 0, MAT.clay, 0.02);
  flame(g, 0.22, 0.06, 0, 0.45);
}
