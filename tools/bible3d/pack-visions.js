/* Signs, wonders and visions. Where a vision is beyond picturing, the model shows only what the text
   describes plainly and the labels say so. 1 unit = 1 cubit (about 45 cm). */
import {
  THREE, MAT, C, GOLD, BRONZE, SILVER, IRON, mat, mesh, grp, sph, cone, tor, rod, path, vessel, slab, rbox, box, cyl,
  textPlane, textTex, scroll, scale, L, plinth, ground, figure, beast, flame, rock, hill, v3, ref, bush, olive, palm, house, people, ROBES,
} from "./kit.js";

const GLOW = (c = 0xfff1c0, o = 0.5) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, depthWrite: false });
function cloudPuff(p, x, y, z, r, m = MAT.cloud) { const g = grp(p, x, y, z); [[0, 0, 0, 1], [0.8, 0.1, 0.2, 0.7], [-0.7, 0.05, -0.2, 0.75], [0.2, 0.5, 0, 0.6], [-0.3, -0.2, 0.6, 0.6]].forEach(([a, b, c, s]) => { const o = sph(g, r * s, m, a * r, b * r, c * r); o.userData.noShadow = true; }); g.userData.skipFit = true; return g; }
// A small tent, for camps.
function tent(p, x, z, s = 1, ry = 0, col = 0x2a2522) { const g = grp(p, x, 0, z, ry); const t = mesh(g, new THREE.ConeGeometry(2.2 * s, 2.4 * s, 4), mat(col, { rough: 1, tex: "linen" }), 0, 1.2 * s, 0, 0, Math.PI / 4, 0); t.scale.z = 0.7; return g; }
// A winged figure seen in a vision: no form is described beyond what the labels say.
function wings(p, x, y, z, s, m, n = 2) {
  const g = grp(p, x, y, z);
  for (let k = 0; k < n; k++) [-1, 1].forEach((sd) => { const w = slab(g, [[0, 0], [1.2, 0.3], [2.2, 1.1], [2.6, 2.0], [1.6, 1.4], [0.6, 0.9]], 0.05, m, 0, (k - (n - 1) / 2) * 0.9 * s, 0, 0, sd > 0 ? 0 : Math.PI, (k - 1) * 0.5 * sd); w.scale.set(s, s, 1); });
  return g;
}

export const MODELS = {
  "jacobs-ladder"({ scene, labels }) {
    ground(scene, 30, C.sand, false);
    rock(scene, 0.6, 0, 0.3, 0, 0xc0b39a, 1.2, 0.6, 1);
    // A stairway set up on the earth with its top reaching to heaven, the angels of God ascending
    // and descending on it (Genesis 28:10-17; John 1:51).
    const lad = grp(scene, 0, 0, -2); const gm = mat(0xf2e2b0, { rough: 0.4, metal: 0.4, opacity: 0.85 });
    for (let i = 0; i < 60; i++) { const t = i / 60; rbox(lad, 3 - t * 1.4, 0.15, 0.9, 0, t * 60, -t * 30, gm, 0.05); }
    [-1, 1].forEach((sd) => rod(lad, [sd * 1.6, 0, 0], [sd * 0.8, 60, -30], 0.12, gm));
    for (let i = 0; i < 6; i++) { const t = 0.12 + i * 0.14; const a = grp(lad, (i % 2 ? 0.6 : -0.6) * (1 - t * 0.5), t * 60 + 0.2, -t * 30); figure(a, 0, 0, { robe: 0xffffff, cloth: 0xffffff, band: 0xf2e2b0, h: 3.6, face: i % 2 ? Math.PI / 2 : -Math.PI / 2 }); }
    const glow = mesh(scene, new THREE.SphereGeometry(14, 24, 16), GLOW(0xfff6d8, 0.55), 0, 64, -32); glow.userData.skipFit = true;
    figure(scene, 0.4, 2.2, { robe: 0x7a5a3e, beard: true, h: 4, face: Math.PI, sit: true });
    L(labels, [0, 4, 2], "Jacob asleep", "Fleeing from Esau, he slept at Luz with a stone for a pillow.", "Genesis 28:10–11", true);
    L(labels, [0, 20, -10], "A stairway to heaven", "“And behold, there was a ladder set up on the earth, and the top of it reached to heaven. And behold, the angels of God were ascending and descending on it!”", "Genesis 28:12");
    L(labels, [0, 50, -26], "“I am with you”", "The LORD stood above it: “I am with you and will keep you wherever you go.” “Surely the LORD is in this place, and I did not know it.”", "Genesis 28:13–16");
    L(labels, [1.6, 12, -6], "The Son of Man", "Jesus told Nathanael: “You will see heaven opened, and the angels of God ascending and descending on the Son of Man.”", "John 1:51", true);
    return { view: v3(1, 0.3, 1.2), target: v3(0, 12, -5), zoom: 0.45 };
  },

  "burning-bush"({ scene, labels }) {
    ground(scene, 40, 0xb8a888, false);
    hill(scene, 30, -10, -30, 22, 0xa89a7a);
    // A bush burning but not burnt up, at Horeb, the mountain of God (Exodus 3:1-6).
    const b = grp(scene, 0, 0, 0);
    for (let i = 0; i < 12; i++) { const a = i * 2.4; path(b, [[0, 0, 0], [Math.cos(a) * 0.5, 1 + (i % 3) * 0.3, Math.sin(a) * 0.5], [Math.cos(a) * 1.1, 2 + (i % 4) * 0.4, Math.sin(a) * 1.1]], 0.06, MAT.bark, 10); }
    [[0, 1.8, 0, 1.2], [0.7, 2.2, 0.3, 0.8], [-0.6, 2.0, -0.3, 0.9]].forEach(([x, y, z, r]) => { const o = mesh(b, new THREE.IcosahedronGeometry(r, 1), mat(0x6f8a4f, { rough: 1 }), x, y, z); o.scale.y = 0.75; });
    for (let i = 0; i < 14; i++) { const a = i * 1.3, r = 0.3 + (i % 4) * 0.25; const f = cone(b, 0.32, 1.4 + (i % 3) * 0.4, GLOW(i % 2 ? 0xffb340 : 0xff7a2a, 0.75), Math.cos(a) * r, 2.6 + (i % 3) * 0.3, Math.sin(a) * r); f.userData.noShadow = true; }
    const lt = new THREE.PointLight(0xffa040, 4, 14, 2); lt.position.set(0, 3, 0); scene.add(lt);
    for (let i = 0; i < 6; i++) beast(scene, -6 + (i % 3) * 1.6, 5 + Math.floor(i / 3) * 1.6, { color: 0xf0ead8, wool: true, s: 0.55, face: i, });
    figure(scene, 3.4, 2.4, { robe: 0x7a5a3e, cloth: 0x8b6f4e, beard: true, h: 4, face: Math.PI * 1.15 });
    [[2.6, 3.6], [2.9, 3.7]].forEach(([x, z]) => rbox(scene, 0.22, 0.04, 0.55, x, 0, z, MAT.leatherDark, 0.03));
    rod(scene, [4.1, 0, 2.8], [3.9, 4.4, 2.4], 0.05, MAT.olive);
    L(labels, [0, 5, 0], "Burning, yet not consumed", "“The angel of the LORD appeared to him in a flame of fire out of the midst of a bush. He looked, and behold, the bush was burning, yet it was not consumed.”", "Exodus 3:2");
    L(labels, [2.8, 0.6, 3.6], "Take off your sandals", "“Do not come near; take your sandals off your feet, for the place on which you are standing is holy ground.”", "Exodus 3:5", true, "/bible/3d/sandals");
    L(labels, [3.4, 5, 2.4], "I AM WHO I AM", "“Say this to the people of Israel: I AM has sent me to you.”", "Exodus 3:13–15");
    L(labels, [-5, 2, 5.6], "Jethro's flock", "Moses was keeping the flock of his father-in-law at the far side of the wilderness.", "Exodus 3:1", true);
    return { view: v3(0.7, 0.4, 1.1), target: v3(0.8, 2.4, 1.4) };
  },

  "pillar-of-fire"({ scene, labels }) {
    ground(scene, 160, C.sand, false);
    // The LORD went before them by day in a pillar of cloud and by night in a pillar of fire (Exodus 13:21-22; 14:19-20; Numbers 9:15-23).
    for (let i = 0; i < 60; i++) { const a = i * 2.4, r = 16 + (i % 12) * 5; tent(scene, Math.cos(a) * r, Math.sin(a) * r, 1.2, a); }
    const col = grp(scene, 0, 0, 0);
    for (let i = 0; i < 18; i++) { const f = mesh(col, new THREE.CylinderGeometry(4 - i * 0.05, 4.6 - i * 0.05, 6, 24, 1, true), GLOW(i % 2 ? 0xffb340 : 0xff8a2a, 0.45), Math.sin(i * 0.8) * 0.6, 3 + i * 5.6, Math.cos(i) * 0.5); f.userData.noShadow = true; }
    for (let i = 0; i < 10; i++) cloudPuff(scene, Math.sin(i) * 3, 100 + i * 5, Math.cos(i * 1.3) * 3, 6, mat(0xd8d4cc, { rough: 1, opacity: 0.85 }));
    const lt = new THREE.PointLight(0xffa040, 30, 120, 1.5); lt.position.set(0, 40, 0); scene.add(lt);
    rbox(scene, 10, 0.1, 5, 0, 0, 0, MAT.white, 0.02).userData.skipFit = true;
    L(labels, [0, 105, 0], "A pillar of cloud by day", "“The LORD went before them by day in a pillar of cloud to lead them along the way, and by night in a pillar of fire to give them light, that they might travel by day and by night.”", "Exodus 13:21");
    L(labels, [0, 40, 0], "A pillar of fire by night", "“The pillar of cloud by day and the pillar of fire by night did not depart from before the people.”", "Exodus 13:22");
    L(labels, [30, 6, 30], "When the cloud lifted, they set out", "Whether two days or a month or a year, they camped while it rested over the tabernacle and moved when it moved.", "Numbers 9:15–23", true);
    return { view: v3(0.8, 0.45, 1.1), target: v3(0, 40, 0), zoom: 0.65 };
  },

  "red-sea"({ scene, labels }) {
    ground(scene, 140, C.sand, false);
    // The waters a wall on their right and on their left, Israel on dry ground (Exodus 14:21-29).
    const wtr = new THREE.MeshStandardMaterial({ color: 0x2f6f8a, roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.86 });
    [-1, 1].forEach((sd) => {
      const geo = new THREE.BoxGeometry(200, 34, 70, 60, 12, 1), p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); if (z * sd < 0) p.setZ(i, z + Math.sin(x * 0.15) * 2 + Math.sin(y * 0.3 + x * 0.05) * 1.2); if (y > 15) p.setY(i, y + Math.sin(x * 0.2) * 1.5); }
      geo.computeVertexNormals();
      mesh(scene, geo, wtr, 0, 17, sd * 45);
      for (let i = 0; i < 20; i++) { const f = sph(scene, 2 + (i % 3), mat(0xeaf4f6, { rough: 0.6 }), -95 + i * 10, 34, sd * (12 + (i % 2) * 2), 1.4, 0.6, 1); f.userData.skipFit = true; }
    });
    const bed = mesh(scene, new THREE.PlaneGeometry(200, 24), mat(0xb8a478, { rough: 1, tex: "sand", rep: 10 }), 0, 0.03, 0, -Math.PI / 2); bed.userData.skipFit = true;
    for (let i = 0; i < 36; i++) figure(scene, -40 + (i % 12) * 6 + Math.floor(i / 12) * 2, -6 + Math.floor(i / 12) * 5, { robe: ROBES[i % 8], skin: i % 4, h: 4, beard: i % 3 === 0, face: 0, skipFit: i > 4 });
    for (let i = 0; i < 6; i++) beast(scene, -45 + i * 5, 6, { color: i % 2 ? 0xf0ead8 : 0x7a5038, wool: i % 2 === 1, horns: i % 2 === 0, s: i % 2 ? 0.55 : 1, face: 0 });
    figure(scene, 40, 0, { robe: 0x7a5a3e, cloth: 0x8b6f4e, beard: true, h: 4, raise: true, face: Math.PI });
    L(labels, [0, 42, 0], "A wall on their right and on their left", "“The LORD drove the sea back by a strong east wind all night and made the sea dry land, and the waters were divided. And the people of Israel went into the midst of the sea on dry ground.”", "Exodus 14:21–22");
    L(labels, [40, 6, 0], "Moses' outstretched hand", "“Lift up your staff, and stretch out your hand over the sea and divide it.”", "Exodus 14:16", true);
    L(labels, [-60, 8, 0], "Sea of Reeds", "The Hebrew is Yam Suph, the Sea of Reeds. Where exactly they crossed is still debated.", "Exodus 13:18; 15:4", true);
    return { view: v3(1, 0.5, 0.25), target: v3(0, 8, 0), zoom: 0.7 };
  },

  "water-from-the-rock"({ scene, labels }) {
    ground(scene, 40, 0xb8a888, false);
    // At Horeb Moses struck the rock and water came out for the people to drink (Exodus 17:1-7; Numbers 20:7-13; 1 Corinthians 10:4).
    rock(scene, 5, 0, 3, -4, 0xb0a48c, 1.4, 1.2, 1); rock(scene, 3, 6, 2, -3, 0xa89a82);
    const wf = mesh(scene, new THREE.CylinderGeometry(0.4, 1.2, 4.6, 16, 1, true), mat(0x9fd0e0, { rough: 0.05, opacity: 0.7, side: THREE.DoubleSide }), 0.3, 2.3, 0.6); void wf;
    const pool = mesh(scene, new THREE.CircleGeometry(4, 32), MAT.water, 1, 0.05, 3.6, -Math.PI / 2); pool.userData.noShadow = true; pool.scale.y = 0.6;
    path(scene, [[1, 0.06, 5.5], [3, 0.06, 9], [2, 0.06, 14]], 0.6, MAT.water, 20).scale.y = 0.08;
    figure(scene, -2.6, 2, { robe: 0x7a5a3e, cloth: 0x8b6f4e, beard: true, h: 4, reach: true, face: 0.2 });
    rod(scene, [-1.8, 2.8, 2], [0.2, 4.2, 0.9], 0.05, MAT.olive);
    for (let i = 0; i < 10; i++) figure(scene, -4 + (i % 5) * 2.2, 7 + Math.floor(i / 5) * 2, { robe: ROBES[i % 8], skin: i % 4, h: 3.8 - (i % 3) * 0.3, face: Math.PI, reach: i % 2 === 0, skipFit: true });
    beast(scene, 5, 5, { color: 0xf0ead8, wool: true, s: 0.6, face: Math.PI * 0.8 });
    L(labels, [0.3, 6, 0.6], "Water from the rock", "“Strike the rock, and water shall come out of it, and the people will drink.” Moses called the place Massah and Meribah, testing and quarrelling.", "Exodus 17:5–7");
    L(labels, [-2.6, 5, 2], "Struck twice", "Years later, told to speak to the rock, Moses struck it twice in anger, and so he did not enter the land.", "Numbers 20:7–12", true);
    L(labels, [6, 6, -3], "The rock was Christ", "“They drank from the spiritual Rock that followed them, and the Rock was Christ.”", "1 Corinthians 10:4", true);
    return { view: v3(0.7, 0.45, 1.1), target: v3(0, 2.5, 1.5) };
  },

  "chariot-of-fire"({ scene, labels }) {
    ground(scene, 60, 0xc8b48a, false);
    const jor = mesh(scene, new THREE.PlaneGeometry(120, 6), MAT.water, 0, 0.04, -14, -Math.PI / 2); jor.userData.skipFit = true;
    // A chariot of fire and horses of fire separated the two, and Elijah went up by a whirlwind into heaven;
    // his cloak fell, and Elisha picked it up (2 Kings 2:9-14).
    const fire = GLOW(0xffa030, 0.75), fire2 = GLOW(0xffd060, 0.6);
    const c = grp(scene, 0, 14, -2, -0.3);
    [-1.6, 1.6].forEach((z) => { const w = grp(c, -0.6, 0, z); tor(w, 1.5, 0.12, fire, 0, 0, 0, 0, 0); for (let i = 0; i < 6; i++) rod(w, [0, 0, 0], [Math.cos(i) * 1.5, Math.sin(i) * 1.5, 0], 0.06, fire2); });
    mesh(c, new THREE.CylinderGeometry(1.3, 1.3, 1.9, 24, 1, true, Math.PI * 0.15, Math.PI * 0.7), fire, -0.2, 1, 0);
    beast(c, 4.5, -1.1, { color: 0xff9a30, ears: true, s: 1.4, y: -1.5 }); beast(c, 4.5, 1.1, { color: 0xffb040, ears: true, s: 1.4, y: -1.5 });
    c.traverse((o) => { if (o.isMesh) { o.material = o.material.isMeshBasicMaterial ? o.material : GLOW(0xff9a30, 0.8); o.userData.noShadow = true; } });
    figure(scene, -0.5, -2.2, { robe: 0x6b5236, cloth: 0x8a7656, beard: true, h: 4, raise: true, y: 15.5, face: 0.3 });
    // The whirlwind.
    for (let i = 0; i < 26; i++) { const t = i / 26, a = t * Math.PI * 8; const o = sph(scene, 1.0 + t * 2, mat(0xd8d0c0, { rough: 1, opacity: 0.35 }), Math.cos(a) * (1 + t * 4), t * 30, Math.sin(a) * (1 + t * 4) - 2); o.userData.skipFit = true; o.userData.noShadow = true; }
    const mantle = mesh(scene, new THREE.PlaneGeometry(2.4, 1.6, 8, 6), mat(0x8a7656, { rough: 1, tex: "linen", side: THREE.DoubleSide }), 1.2, 6, 1, -0.6, 0.3, 0.5); void mantle;
    figure(scene, 2.6, 4, { robe: 0x5d7a5a, beard: true, h: 4, raise: true, face: Math.PI * 1.1 });
    const lt = new THREE.PointLight(0xffa040, 12, 60, 1.6); lt.position.set(0, 16, 0); scene.add(lt);
    L(labels, [0, 22, -2], "A chariot of fire", "“As they still went on and talked, behold, chariots of fire and horses of fire separated the two of them. And Elijah went up by a whirlwind into heaven.”", "2 Kings 2:11");
    L(labels, [2.6, 8.4, 4], "“My father, my father!”", "Elisha cried out and saw him no more. He tore his own clothes in two, then picked up Elijah's cloak.", "2 Kings 2:12–13");
    L(labels, [1.2, 7.4, 1], "The cloak", "Elisha struck the Jordan with it and the water parted, as it had for Elijah: he had asked for a double portion of his spirit.", "2 Kings 2:8–14", true);
    return { view: v3(1, 0.3, 1.2), target: v3(0, 9, 0), zoom: 0.85 };
  },

  "ezekiels-wheels"({ scene, labels }) {
    ground(scene, 40, 0xb8ad7c, false);
    const river = mesh(scene, new THREE.PlaneGeometry(80, 6), MAT.water, 0, 0.04, 14, -Math.PI / 2); river.userData.skipFit = true;
    // By the Chebar canal Ezekiel saw a storm cloud, fire flashing, and four living creatures, each with a
    // wheel beside it: wheels gleaming like beryl, a wheel within a wheel, their rims full of eyes; above,
    // an expanse like crystal, a throne like sapphire, and brightness like a rainbow (Ezekiel 1).
    const beryl = mat(0x9fd8c4, { rough: 0.15, metal: 0.4 });
    [[-6, -6], [6, -6], [-6, 6], [6, 6]].forEach(([x, z], k) => {
      const g = grp(scene, x, 6, z, k * 0.7);
      tor(g, 5, 0.35, beryl, 0, 0, 0, 0, 0); tor(g, 5, 0.35, beryl, 0, 0, 0, 0, Math.PI / 2);
      for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; const e = sph(g, 0.22, MAT.white, Math.cos(a) * 5, Math.sin(a) * 5, 0.35); sph(g, 0.11, MAT.black, Math.cos(a) * 5, Math.sin(a) * 5, 0.52); void e; }
      for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; sph(g, 0.22, MAT.white, 0.35, Math.sin(a) * 5, Math.cos(a) * 5); sph(g, 0.11, MAT.black, 0.52, Math.sin(a) * 5, Math.cos(a) * 5); }
      const lc = wings(scene, x, 11, z, 1.6, GLOW(0xfff1c8, 0.55), 2); lc.rotation.y = Math.atan2(x, z);
    });
    const exp = mesh(scene, new THREE.CylinderGeometry(13, 13, 0.4, 48), mat(0xd8f0f4, { rough: 0.02, metal: 0.2, opacity: 0.5 }), 0, 16, 0); exp.userData.noShadow = true;
    const throne = grp(scene, 0, 16.2, 0); rbox(throne, 4, 3, 3, 0, 0, 0, mat(0x1f4fb3, { rough: 0.1, metal: 0.3 }), 0.3); rbox(throne, 4, 5, 0.6, 0, 0, -1.4, mat(0x1f4fb3, { rough: 0.1, metal: 0.3 }), 0.3);
    const bow = mesh(scene, new THREE.TorusGeometry(8, 0.6, 12, 64, Math.PI), GLOW(0xb8f0c8, 0.5), 0, 16, -3); void bow;
    const glow = mesh(scene, new THREE.SphereGeometry(3, 24, 16), GLOW(0xfff6d8, 0.6), 0, 20.5, 0); glow.userData.skipFit = true;
    figure(scene, 0, 18, { robe: 0x6b5236, beard: true, h: 4, face: Math.PI, sit: true, skipFit: true });
    L(labels, [6, 12.5, 6], "A wheel within a wheel", "“Their appearance and construction: their appearance was like the gleaming of beryl… as it were a wheel within a wheel. Their rims were tall and awesome, full of eyes all around.”", "Ezekiel 1:15–18");
    L(labels, [0, 17, 10], "An expanse like crystal", "Over the heads of the living creatures, shining like awe-inspiring crystal.", "Ezekiel 1:22", true);
    L(labels, [0, 24, 0], "The likeness of the glory of the LORD", "“Above the expanse was the likeness of a throne, in appearance like sapphire… like the appearance of the bow that is in the cloud on the day of rain.” Shown here only in outline: the living creatures and the one on the throne are beyond picturing.", "Ezekiel 1:26–28");
    L(labels, [0, 4, 18], "By the Chebar canal", "Ezekiel was among the exiles in Babylonia when the heavens were opened.", "Ezekiel 1:1–3", true);
    return { view: v3(0.8, 0.45, 1.2), target: v3(0, 10, 0), zoom: 0.85 };
  },

  "zechariahs-lampstand"({ scene, labels }) {
    ground(scene, 20, C.sand, false);
    // A lampstand all of gold with a bowl on top and seven lamps, seven lips on each, and two olive
    // trees beside it pouring golden oil (Zechariah 4:1-14).
    const g = grp(scene, 0, 0, 0);
    vessel(g, [[0, 0], [0.9, 0], [0.8, 0.1], [0.2, 0.4], [0.14, 5.4], [0.3, 5.5]], GOLD);
    vessel(g, [[0, 5.5], [0.6, 5.55], [1.1, 5.9], [1.2, 6.1]], GOLD);
    for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; const lx = Math.cos(a) * 0.95, lz = Math.sin(a) * 0.95; rod(g, [lx * 0.4, 5.9, lz * 0.4], [lx, 6.25, lz], 0.03, GOLD); vessel(g, [[0, 0], [0.18, 0.02], [0.2, 0.08]], GOLD, lx, 6.25, lz); for (let k = 0; k < 7; k++) { const b = k / 7 * Math.PI * 2; flame(g, lx + Math.cos(b) * 0.17, 6.28, lz + Math.sin(b) * 0.17, 0.35); } }
    [-1, 1].forEach((sd) => { olive(scene, sd * 5.5, -0.5, 6, true); path(scene, [[sd * 4.2, 4.5, -0.3], [sd * 2.6, 6.8, -0.2], [sd * 1.2, 6.2, 0]], 0.08, GOLD, 20); });
    L(labels, [0, 7.6, 0], "Seven lamps, seven lips each", "“I see a lampstand all of gold, with a bowl on the top of it, and seven lamps on it, with seven lips on each of the lamps.”", "Zechariah 4:2");
    L(labels, [-5.5, 7.4, -0.5], "Two olive trees", "Pouring out golden oil: “These are the two anointed ones who stand by the Lord of the whole earth.”", "Zechariah 4:3, 11–14");
    L(labels, [0, 3, 0.6], "Not by might", "“Not by might, nor by power, but by my Spirit, says the LORD of hosts.” Zerubbabel would finish the temple.", "Zechariah 4:6–9");
    return { view: v3(0.5, 0.35, 1.1) };
  },

  "flying-scroll"({ scene, labels }) {
    ground(scene, 60, 0xb8ad7c, false);
    // A flying scroll twenty cubits long and ten wide (Zechariah 5:1-4): the same size as the porch
    // of Solomon's temple (1 Kings 6:3).
    const s = grp(scene, 0, 14, 0); s.rotation.set(-0.25, 0.3, 0.08);
    mesh(s, new THREE.PlaneGeometry(20, 10, 20, 4), mat(0xe8d9b0, { rough: 0.95, side: THREE.DoubleSide }), 0, 0, 0);
    textPlane(s, ["…כל הגנב… וכל הנשבע…"], 16, 6, 0, 0, 0.05, { bg: null, transparent: true, ink: "#2a1d12", w: 1024, h: 384, size: 90, rtl: true, font: "'Times New Roman', serif" });
    [-10, 10].forEach((x) => mesh(s, new THREE.CylinderGeometry(0.5, 0.5, 10.6, 20), mat(0xe8d9b0, { rough: 0.95 }), x, 0, 0));
    house(scene, 14, -8, 10, 8, 7, 0.4); house(scene, -14, -10, 10, 8, 7, -0.3);
    scale(scene, labels, 4, 6);
    L(labels, [0, 22, 0], "Twenty cubits by ten", "About 9 × 4.5 m: “I see a flying scroll. Its length is twenty cubits, and its width ten cubits.”", "Zechariah 5:1–2");
    L(labels, [4, 12, 4], "The curse that goes out", "Against everyone who steals and everyone who swears falsely: it enters their house and stays there.", "Zechariah 5:3–4", true);
    return { view: v3(0.6, 0.3, 1.1), target: v3(0, 10, 0) };
  },

  "sundial-of-ahaz"({ scene, labels }) {
    ground(scene, 40, C.stone);
    // The shadow went back ten steps on the stairway of Ahaz, a sign to Hezekiah (2 Kings 20:8-11; Isaiah 38:7-8).
    const st = mat(0xe6dcc6, { rough: 0.9, tex: "stone", rep: 2 });
    for (let i = 0; i < 20; i++) rbox(scene, 14, (i + 1) * 0.5, 1.2, 0, 0, 12 - i * 1.2, st, 0.05);
    rbox(scene, 14, 10, 2, 0, 0, -12.6, st, 0.1);
    rbox(scene, 0.8, 18, 0.8, 0, 10, -12.6, MAT.limestone, 0.05);
    // The shadow.
    const sh = mesh(scene, new THREE.PlaneGeometry(1.2, 14), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false }), 0, 6.1, 1.2, -Math.PI / 2 + 0.42); sh.userData.skipFit = true;
    [[0, 3.5, 7.2], [0, 8.6, -4.8]].forEach(([x, y, z], i) => { const ar = cone(scene, 0.5, 1.2, i ? MAT.red : MAT.blue, 5.6, y + 1, z, i ? -Math.PI / 2 : Math.PI / 2); void ar; });
    figure(scene, -9, 8, { robe: 0x5b2c6f, cloth: false, beard: true, h: 4, face: Math.PI * 0.6 });
    figure(scene, -10.5, 9.5, { robe: 0x6b5236, beard: true, h: 4, face: Math.PI * 0.4 });
    L(labels, [0, 13, 0], "Ten steps back", "“Shall the shadow go forward ten steps, or go back ten steps?” Isaiah cried to the LORD, and he brought the shadow back ten steps on the stairway of Ahaz.", "2 Kings 20:9–11");
    L(labels, [-9.5, 5, 8.8], "Hezekiah and Isaiah", "The sign that God would heal the king and add fifteen years to his life.", "2 Kings 20:1–8", true);
    L(labels, [0, 19, -12.6], "A stairway clock", "The Hebrew says “steps” (or “degrees”): probably a staircase on which a shadow marked the hours.", "Isaiah 38:8", true);
    return { view: v3(1, 0.6, 0.6), target: v3(0, 5, 0) };
  },

  "gideons-fleece"({ scene, labels }) {
    ground(scene, 30, 0xb8a888, false);
    // A fleece of wool on the threshing floor: first wet with dew and the ground dry; then dry with the
    // ground all wet (Judges 6:36-40).
    const fl = mesh(scene, new THREE.CylinderGeometry(7, 7.3, 0.3, 48), mat(0xb8a478, { rough: 1, tex: "sand" }), 0, 0.15, 0); void fl;
    const fleece = mesh(scene, new THREE.PlaneGeometry(2.4, 1.8, 16, 12), mat(0xf0e8d6, { rough: 1, tex: "linen", rep: 3, side: THREE.DoubleSide }), -2.2, 0.35, 0, -Math.PI / 2);
    const p = fleece.geometry.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 6) * Math.cos(p.getY(i) * 5) * 0.06 + 0.05); fleece.geometry.computeVertexNormals();
    const bowl = vessel(scene, [[0, 0], [0.4, 0.02], [0.55, 0.3], [0.58, 0.36]], MAT.clay, -0.3, 0.3, 1.0); void bowl;
    mesh(scene, new THREE.CircleGeometry(0.5, 24), MAT.water, -0.3, 0.6, 1.0, -Math.PI / 2);
    for (let i = 0; i < 40; i++) { const d = sph(scene, 0.05, mat(0xcfe8f0, { rough: 0.05, opacity: 0.8 }), 1.8 + (i % 8) * 0.5, 0.32, -2 + Math.floor(i / 8) * 0.9, 1, 0.5, 1); d.userData.noShadow = true; }
    const f2 = mesh(scene, new THREE.PlaneGeometry(2.4, 1.8), mat(0xf6f0e2, { rough: 1, tex: "linen", rep: 3, side: THREE.DoubleSide }), 3, 0.33, 0, -Math.PI / 2); void f2;
    figure(scene, -3.6, -2.6, { robe: 0x5d4a36, cloth: 0x7a6656, beard: true, h: 4, sit: true, reach: true, face: 0.6 });
    L(labels, [-2.2, 1.4, 0], "The first night", "Dew on the fleece only, and dry on all the ground. He wrung out enough to fill a bowl with water.", "Judges 6:37–38");
    L(labels, [3, 1.4, 0], "The second night", "“Please let it be dry only on the fleece, and on all the ground let there be dew.” And God did so.", "Judges 6:39–40");
    L(labels, [-3.6, 4, -2.6], "Gideon", "The LORD had already said, “I will be with you.” Gideon asked for a sign twice; God was patient with him.", "Judges 6:12–16, 36", true);
    return { view: v3(0.6, 0.8, 1), target: v3(0, 0.4, 0) };
  },

  rainbow({ scene, labels }) {
    ground(scene, 120, 0x9aa36b, false);
    hill(scene, 50, -10, -40, 28, 0x8a8a6a);
    // “I have set my bow in the cloud, and it shall be a sign of the covenant between me and the earth”
    // (Genesis 9:12-17). The ark resting on the mountains of Ararat (8:4).
    const cols = [0xd84a4a, 0xe8904a, 0xe8d04a, 0x6ab86a, 0x4a8ad8, 0x5a4ab8, 0x8a4ab8];
    cols.forEach((c, i) => { const b = mesh(scene, new THREE.TorusGeometry(60 - i * 1.6, 0.8, 8, 96, Math.PI), GLOW(c, 0.42), 0, 0, -30); b.userData.skipFit = true; });
    const ark = grp(scene, -10, 27, -40, 0.5); rbox(ark, 30, 3, 5, 0, 0, 0, mat(0x8f6a4a, { rough: 0.9, tex: "wood", rep: 4 }), 0.3); rbox(ark, 30, 0.8, 5.2, 0, 3, 0, mat(0x6a4a2a, { rough: 0.9 }), 0.2);
    rbox(scene, 2.4, 1.6, 2.4, 8, 0, 6, MAT.rock, 0.3); flame(scene, 8, 1.6, 6, 3);
    figure(scene, 11, 8, { robe: 0x7a5a3e, cloth: 0xe8e0cc, beard: true, h: 4, raise: true, face: Math.PI * 1.2 });
    for (let i = 0; i < 6; i++) figure(scene, 12 + (i % 3) * 1.6, 10 + Math.floor(i / 3) * 1.6, { robe: ROBES[i], skin: i % 4, h: 3.8, face: Math.PI * 1.2, skipFit: true });
    for (let i = 0; i < 6; i++) beast(scene, -2 + i * 3, 14 + (i % 2) * 3, { color: [0xf0ead8, 0x7a5038, 0x8a7a6a][i % 3], wool: i % 3 === 0, horns: i % 3 === 1, ears: i % 3 === 2, s: 0.8, face: i });
    L(labels, [0, 62, -30], "My bow in the cloud", "“Never again shall all flesh be cut off by the waters of the flood… When the bow is in the clouds, I will see it and remember the everlasting covenant.”", "Genesis 9:11–16");
    L(labels, [-10, 32, -40], "The mountains of Ararat", "The ark came to rest there in the seventh month.", "Genesis 8:4", true, "/bible/3d/ark");
    L(labels, [8, 4, 6], "Noah's altar", "Noah built an altar to the LORD and offered burnt offerings.", "Genesis 8:20", true);
    return { view: v3(0.6, 0.35, 1.2), target: v3(0, 20, -15), zoom: 0.75 };
  },

  "isaiahs-coal"({ scene, labels }) {
    ground(scene, 30, C.stone);
    // A seraph flew to Isaiah with a burning coal taken with tongs from the altar and touched his lips:
    // “your guilt is taken away” (Isaiah 6:1-7). Seraphim had six wings; no more is said of their form.
    const al = grp(scene, 4, 0, -3); rbox(al, 2, 4, 2, 0, 0, 0, GOLD, 0.1); [[-0.85, -0.85], [0.85, -0.85], [-0.85, 0.85], [0.85, 0.85]].forEach(([x, z]) => cone(al, 0.2, 0.5, GOLD, x, 4.25, z));
    for (let i = 0; i < 5; i++) sph(al, 0.25, MAT.ember, -0.5 + i * 0.25, 4.1, (i % 2) * 0.3 - 0.15, 1, 0.5, 1);
    const ser = grp(scene, 1.2, 6.5, -0.5);
    const gl = GLOW(0xf2c860, 0.75);
    sph(ser, 0.8, GLOW(0xffd880, 0.9), 0, 0, 0, 0.7, 1.4, 0.7);
    [[2.5, 0.4], [1.8, -1.0], [1.4, 1.6]].forEach(([s, y], k) => [-1, 1].forEach((sd) => { const w = slab(ser, [[0, 0], [1.4, 0.3], [2.4, 1.0], [1.8, 0.4], [0.6, 0.2]], 0.04, gl, 0, y * 0.6, 0, 0, sd > 0 ? 0 : Math.PI, (k - 1) * 0.6 * sd); w.scale.set(s / 2.4, s / 2.4, 1); }));
    const tg = grp(ser, -0.6, -0.6, 0.6, -0.5); [-1, 1].forEach((sd) => path(tg, [[0, 0, 0], [-0.8, -0.2, sd * 0.05], [-1.4, -0.3, sd * 0.02]], 0.03, GOLD, 10)); sph(tg, 0.12, MAT.ember, -1.45, -0.3, 0);
    figure(scene, -1.5, 1.2, { robe: 0x6b5236, beard: true, h: 4, face: 0, reach: true });
    const smoke = cloudPuff(scene, 0, 14, -10, 3, mat(0xeae6dc, { rough: 1, opacity: 0.35 })); void smoke;
    L(labels, [1.2, 9.4, -0.5], "Holy, holy, holy", "Seraphim stood above the throne, each with six wings: two covering the face, two the feet, and two to fly. “Holy, holy, holy is the LORD of hosts; the whole earth is full of his glory!”", "Isaiah 6:1–3");
    L(labels, [-0.4, 5.6, 0.4], "A burning coal", "“Behold, this has touched your lips; your guilt is taken away, and your sin atoned for.” “Here I am! Send me.”", "Isaiah 6:6–8");
    L(labels, [4, 5, -3], "The altar", "The coal was taken with tongs from the altar.", "Isaiah 6:6", true);
    return { view: v3(0.8, 0.3, 1.1), target: v3(1, 5, -0.5) };
  },

  "seven-lampstands"({ scene, labels }) {
    ground(scene, 30, C.stone);
    // Seven golden lampstands, and among them one like a son of man; seven stars in his right hand
    // (Revelation 1:12-20). The lampstands are the seven churches.
    const names = ["Ephesus", "Smyrna", "Pergamum", "Thyatira", "Sardis", "Philadelphia", "Laodicea"];
    names.forEach((n, i) => { const a = i / 7 * Math.PI * 2; const x = Math.cos(a) * 6, z = Math.sin(a) * 6;
      vessel(scene, [[0, 0], [0.5, 0], [0.12, 0.3], [0.08, 3.4], [0.3, 3.5], [0.32, 3.6]], GOLD, x, 0, z); flame(scene, x, 3.6, z, 1.2);
      L(labels, [x, 4.6, z], n, ["Left its first love.", "Faithful under suffering.", "Holding fast, but tolerating false teaching.", "Love and faith, but tolerating Jezebel.", "A name for being alive, but dead.", "Kept my word with little power.", "Lukewarm."][i], "Revelation " + (2 + Math.floor(i / 4)) + ":" + [1, 8, 12, 18, 1, 7, 14][i], true); });
    figure(scene, 0, 0, { robe: 0xf6f2e8, cloth: 0xffffff, band: 0xd8b44a, h: 4.4, face: Math.PI / 2, raise: true });
    tor(scene, 0.5, 0.06, GOLD, 0, 2.6, 0);
    for (let i = 0; i < 7; i++) { const s = sph(scene, 0.12, GLOW(0xfff6c8, 1), 0.5 + Math.cos(i) * 0.25, 5.2 + Math.sin(i * 2) * 0.2, 0.5 + Math.sin(i) * 0.25); s.userData.skipFit = true; }
    const glow = mesh(scene, new THREE.SphereGeometry(3, 20, 14), GLOW(0xfff6d8, 0.25), 0, 3, 0); glow.userData.skipFit = true;
    L(labels, [0, 6, 0], "One like a son of man", "“Clothed with a long robe and with a golden sash round his chest… in his right hand he held seven stars.” “Fear not, I am the first and the last, and the living one.”", "Revelation 1:13–18");
    L(labels, [0, 1.2, 6.5], "The seven churches", "“The seven lampstands are the seven churches”, in the Roman province of Asia, now western Turkey.", "Revelation 1:20");
    return { view: v3(0.6, 0.55, 1.1) };
  },

  "throne-in-heaven"({ scene, labels }) {
    const sea = mesh(scene, new THREE.CircleGeometry(40, 64), mat(0xd8f0f4, { rough: 0.02, metal: 0.3, opacity: 0.85 }), 0, 0, 0, -Math.PI / 2); sea.userData.skipFit = true; sea.userData.noShadow = true;
    // A throne in heaven, a rainbow like an emerald round it, twenty-four thrones with elders, seven
    // torches of fire, and before the throne a sea of glass like crystal (Revelation 4).
    const th = grp(scene, 0, 0, -6); rbox(th, 5, 4, 4, 0, 0, 0, mat(0xffffff, { rough: 0.1, metal: 0.3 }), 0.4); rbox(th, 5, 8, 1, 0, 0, -1.8, mat(0xffffff, { rough: 0.1, metal: 0.3 }), 0.4);
    const glow = mesh(scene, new THREE.SphereGeometry(4, 24, 16), GLOW(0xfff6d8, 0.75), 0, 7, -6); glow.userData.skipFit = true;
    const bow = mesh(scene, new THREE.TorusGeometry(9, 0.8, 12, 64), GLOW(0x3fb87a, 0.45), 0, 6, -7); void bow;
    for (let i = 0; i < 24; i++) { const a = Math.PI * 0.15 + i / 23 * Math.PI * 1.7 + Math.PI / 2; const x = Math.cos(a) * 18, z = Math.sin(a) * 18 - 6;
      const t = grp(scene, x, 0, z, -a + Math.PI / 2 * 0); rbox(t, 1.6, 1.2, 1.4, 0, 0, 0, MAT.white, 0.2); rbox(t, 1.6, 2.6, 0.3, 0, 0, -0.6, MAT.white, 0.2);
      figure(t, 0, 0.1, { robe: 0xf6f2e8, cloth: 0xffffff, h: 3.8, sit: true, y: 1.2, face: Math.PI / 2, skipFit: true }); vessel(t, [[0.32, 0], [0.34, 0.25]], GOLD, 0, 4.0, 0.1); }
    for (let i = 0; i < 7; i++) { const x = -6 + i * 2; rod(scene, [x, 0, 1], [x, 3, 1], 0.08, GOLD); cone(scene, 0.4, 1.4, GLOW(0xffa040, 0.8), x, 3.7, 1); }
    L(labels, [0, 13, -6], "A throne stood in heaven", "“And he who sat there had the appearance of jasper and carnelian, and around the throne was a rainbow that had the appearance of an emerald.” Shown only as light: the one on the throne is not pictured.", "Revelation 4:2–3");
    L(labels, [18, 5, -6], "Twenty-four elders", "Clothed in white with golden crowns. They cast their crowns before the throne: “Worthy are you, our Lord and God, to receive glory and honour and power.”", "Revelation 4:4, 10–11");
    L(labels, [0, 5.2, 1], "Seven torches of fire", "Before the throne: the seven spirits of God.", "Revelation 4:5", true);
    L(labels, [0, 1, 12], "A sea of glass, like crystal", "“And before the throne there was as it were a sea of glass, like crystal.” Later, the victors stand beside it with harps of God.", "Revelation 4:6; 15:2", true);
    return { view: v3(0.3, 0.55, 1.2), target: v3(0, 4, -4), zoom: 0.9 };
  },

  "sealed-scroll"({ scene, labels }) {
    plinth(scene, 1.6, 0x5b2c6f);
    // A scroll written within and on the back, sealed with seven seals; only the Lamb is worthy to open it (Revelation 5:1-9).
    const s = grp(scene, 0, 0.18, 0);
    mesh(s, new THREE.CylinderGeometry(0.16, 0.16, 1.4, 24), mat(0xe8d9b0, { rough: 0.95 }), 0, 0, 0, 0, 0, Math.PI / 2);
    for (let i = 0; i < 7; i++) { const x = -0.6 + i * 0.2; tor(s, 0.165, 0.008, MAT.scarlet, x, 0, 0, 0, Math.PI / 2); mesh(s, new THREE.CylinderGeometry(0.05, 0.05, 0.02, 16), mat(0xa04a2a, { rough: 0.6 }), x, 0.17, 0); }
    const one = mesh(s, new THREE.CylinderGeometry(0.05, 0.05, 0.02, 16, 1, false, 0, Math.PI), mat(0xa04a2a, { rough: 0.6 }), -0.6, 0.2, 0.05); one.rotation.z = 0.5;
    L(labels, [0, 0.55, 0], "Sealed with seven seals", "“Who is worthy to open the scroll and break its seals?” No one in heaven or on earth could open it, and John wept.", "Revelation 5:1–4");
    L(labels, [-0.6, 0.4, 0], "The Lamb who was slain", "“Weep no more; behold, the Lion of the tribe of Judah… has conquered.” “Worthy are you to take the scroll and to open its seals, for you were slain, and by your blood you ransomed people for God.”", "Revelation 5:5–9");
    L(labels, [0.6, 0.3, 0.2], "Written within and on the back", "A full document, like a will or a title deed, sealed until its time.", "Revelation 5:1", true);
    scale(scene, labels, 0.8, -0.8, true);
    return { view: v3(0.3, 0.6, 1) };
  },

  "new-jerusalem"({ scene, labels }) {
    // The holy city, measured: 12,000 stadia long, wide and high (about 2,200 km), a wall of 144 cubits,
    // twelve gates each a single pearl, twelve foundations of precious stones (Revelation 21:9-27).
    // Shown as a cube, with Britain drawn under it for scale.
    const S = 100; // the cube's side in model units (2,220 km)
    const gold = mat(0xf2d27a, { rough: 0.1, metal: 0.6, opacity: 0.55 });
    const base = mesh(scene, new THREE.PlaneGeometry(300, 300), mat(0x6a8aa0, { rough: 1 }), 0, 0, 0, -Math.PI / 2); base.userData.skipFit = true; base.userData.noShadow = true;
    // Britain, about 1,000 km tall, for scale (very roughly).
    const uk = new THREE.Shape(); [[0, 0], [10, 2], [16, 8], [14, 16], [18, 24], [12, 30], [14, 38], [8, 45], [4, 40], [6, 32], [0, 26], [3, 18], [-2, 10]].forEach(([x, y], i) => (i ? uk.lineTo(x * 0.98, y * 0.98) : uk.moveTo(x, y)));
    const ukm = mesh(scene, new THREE.ShapeGeometry(uk), mat(0x8aa06a, { rough: 1 }), 70, 0.1, 60, -Math.PI / 2); ukm.userData.skipFit = true;
    const foundCols = [0x6a8a5a, 0x1f4fb3, 0x7a7a8a, 0x1f8a4c, 0x8a5a4a, 0xb3122e, 0xd9b44a, 0x9fd8c4, 0xd9a440, 0x8faa5a, 0xd9721e, 0x8a4fb8];
    foundCols.forEach((c, i) => rbox(scene, S + 2, 1.4, S + 2, 0, i * 1.4, 0, mat(c, { rough: 0.2, metal: 0.2 }), 0.2));
    rbox(scene, S, S, S, 0, 16.8, 0, gold, 0.5);
    [[0, S / 2 + 1], [0, -S / 2 - 1], [S / 2 + 1, 0], [-S / 2 - 1, 0]].forEach(([x, z]) => [-1, 0, 1].forEach((k) => { const gx = x === 0 ? k * 28 : x, gz = z === 0 ? k * 28 : z; const pr = sph(scene, 4, mat(0xf4f0ea, { rough: 0.15, metal: 0.1 }), gx, 20, gz, 1, 1.3, 1); void pr; }));
    const lt = new THREE.PointLight(0xfff1c8, 40, 400, 1.2); lt.position.set(0, 70, 0); scene.add(lt);
    L(labels, [0, 125, 0], "12,000 stadia each way", "“Its length and width and height are equal.” About 2,200 km (1,400 miles): further than London to Athens, and as high as it is long. The Most Holy Place was a cube too.", "Revelation 21:16; 1 Kings 6:20");
    L(labels, [0, 26, 56], "Twelve gates, twelve pearls", "Three on each side, each a single pearl, with the names of the twelve tribes; never shut by day, and there is no night there.", "Revelation 21:12–13, 21, 25");
    L(labels, [55, 10, 0], "Twelve foundations", "Jasper, sapphire, agate, emerald, onyx, carnelian, chrysolite, beryl, topaz, chrysoprase, jacinth, amethyst, with the names of the twelve apostles.", "Revelation 21:14, 19–20");
    L(labels, [78, 4, 40], "Great Britain, for scale", "Roughly drawn, at the same scale as the city.", "", true);
    L(labels, [0, 70, 0], "No temple", "“I saw no temple in the city, for its temple is the Lord God the Almighty and the Lamb.”", "Revelation 21:22–23", true);
    return { view: v3(0.9, 0.6, 1.2), target: v3(0, 50, 0), zoom: 0.95 };
  },

  "river-of-life"({ scene, labels }) {
    ground(scene, 60, 0x9aa36b, false);
    // The river of the water of life, bright as crystal, flowing from the throne down the middle of the
    // street; on either side the tree of life with twelve kinds of fruit, leaves for the healing of the
    // nations (Revelation 22:1-2; Ezekiel 47:12).
    const rv = mesh(scene, new THREE.PlaneGeometry(6, 120), mat(0xbfeaf2, { rough: 0.02, metal: 0.3 }), 0, 0.05, 0, -Math.PI / 2); rv.userData.skipFit = true; rv.userData.noShadow = true;
    [-1, 1].forEach((sd) => { const st = mesh(scene, new THREE.PlaneGeometry(6, 120), mat(0xe8c870, { rough: 0.2, metal: 0.7 }), sd * 6, 0.04, 0, -Math.PI / 2); st.userData.skipFit = true; });
    const fruitC = [0xb3202a, 0xe8904a, 0xd8c040, 0x6a3a6a, 0x9ac040, 0xe86a8a];
    for (let i = 0; i < 8; i++) { const x = (i % 2 ? 1 : -1) * 10, z = -24 + Math.floor(i / 2) * 14; const t = grp(scene, x, 0, z); if (i > 3) t.userData.skipFit = true;
      path(t, [[0, 0, 0], [0.3, 4, 0.2], [0, 7, 0]], 0.6, MAT.bark, 12);
      [[0, 9, 0, 3.6], [2.4, 8, 1, 2.6], [-2.2, 8.3, -1, 2.8], [0.6, 10.6, -1.2, 2.4]].forEach(([a, b, c, r]) => { const o = mesh(t, new THREE.IcosahedronGeometry(r, 2), mat(0x4f8a43, { rough: 0.8 }), a, b, c); o.scale.y = 0.75; });
      for (let k = 0; k < 12; k++) sph(t, 0.35, mat(fruitC[k % 6], { rough: 0.4 }), Math.cos(k) * 3, 7.5 + (k % 4) * 0.9, Math.sin(k) * 3); }
    const glow = mesh(scene, new THREE.SphereGeometry(10, 24, 16), GLOW(0xfff6d8, 0.7), 0, 6, -62); glow.userData.skipFit = true;
    L(labels, [0, 3, 0], "The river of the water of life", "“Bright as crystal, flowing from the throne of God and of the Lamb through the middle of the street of the city.”", "Revelation 22:1–2");
    L(labels, [10, 14, -24], "The tree of life", "On either side of the river, with twelve kinds of fruit, yielding its fruit each month. Last seen in Eden, guarded by cherubim.", "Revelation 22:2; Genesis 3:22–24");
    L(labels, [-10, 13, -10], "For the healing of the nations", "“The leaves of the tree were for the healing of the nations. No longer will there be anything accursed.”", "Revelation 22:2–3", true);
    L(labels, [6, 1, 10], "Streets of gold", "“The street of the city was pure gold, like transparent glass.”", "Revelation 21:21", true);
    return { view: v3(0.7, 0.45, 1.2), target: v3(0, 5, -10), zoom: 0.8 };
  },

  "valley-of-dry-bones"({ scene, labels }) {
    ground(scene, 60, 0xc8b48a, false);
    hill(scene, 30, -30, -20, 18, 0xa89a7a); hill(scene, 30, 30, -24, 16, 0xa89a7a);
    // A valley full of very dry bones; the breath came into them and they stood up, an exceedingly great
    // army (Ezekiel 37:1-14). Shown at the moment of breath: some still bones, some standing.
    const bone = mat(0xe8dcc0, { rough: 0.7 });
    for (let i = 0; i < 60; i++) { const a = i * 2.4, r = 3 + (i % 9) * 2; const o = grp(scene, Math.cos(a) * r, 0.1, Math.sin(a) * r, i); rod(o, [-0.4, 0, 0], [0.4, 0, 0], 0.05, bone); sph(o, 0.08, bone, -0.42, 0, 0); sph(o, 0.08, bone, 0.42, 0, 0); }
    for (let i = 0; i < 18; i++) { const a = i * 0.8, r = 6 + (i % 4) * 3; figure(scene, Math.cos(a) * r, Math.sin(a) * r - 6, { robe: 0xd8d0c0, cloth: false, skin: i % 4, h: 4, face: Math.PI / 2, skipFit: i > 4 }); }
    for (let i = 0; i < 12; i++) { const o = sph(scene, 1.2, mat(0xffffff, { opacity: 0.25, rough: 1 }), -20 + i * 4, 6 + Math.sin(i) * 2, -10 + Math.cos(i) * 4, 2, 0.6, 1); o.userData.skipFit = true; o.userData.noShadow = true; }
    figure(scene, 0, 10, { robe: 0x6b5236, beard: true, h: 4, raise: true, face: -Math.PI / 2 });
    L(labels, [0, 4.4, 10], "“Can these bones live?”", "“O Lord GOD, you know.” “Prophesy over these bones, and say to them, O dry bones, hear the word of the LORD.”", "Ezekiel 37:3–4");
    L(labels, [0, 6, -6], "Breath came into them", "There was a rattling, bone came to bone, sinews and flesh came upon them; then the breath came in and they lived and stood on their feet.", "Ezekiel 37:7–10");
    L(labels, [-14, 10, -10], "From the four winds", "The same word, ruach, means breath, wind and spirit. “I will put my Spirit within you, and you shall live.”", "Ezekiel 37:9, 14", true);
    return { view: v3(0.6, 0.45, 1.2), target: v3(0, 2, 0), zoom: 0.5 };
  },

  "balaams-donkey"({ scene, labels }) {
    ground(scene, 40, 0xb8ad7c, false);
    // In a narrow path between vineyards, a wall on either side, the donkey saw the angel of the LORD
    // standing with a drawn sword, and lay down under Balaam (Numbers 22:22-35).
    const st = mat(0xffffff, { tex: "stone", rough: 1, rep: 2 });
    [-1, 1].forEach((sd) => { rbox(scene, 30, 2.4, 0.8, 0, 0, sd * 2.4, st, 0.1); for (let i = 0; i < 8; i++) { const v = grp(scene, -12 + i * 3.4, 0, sd * 5.5); v.userData.skipFit = true; path(v, [[0, 0, 0], [0.2, 1.2, 0.1], [-0.1, 2, 0]], 0.08, MAT.bark, 8); sph(v, 0.8, MAT.leaf, 0, 2.3, 0, 1.3, 0.7, 1); } });
    const d = beast(scene, -1, 0, { color: 0x8a7a6a, ears: true, s: 1.0, face: 0 }); d.position.y = -0.55; d.rotation.z = 0.05;
    figure(scene, -1.2, 0, { robe: 0x5b2c6f, cloth: 0xe9e1cf, beard: true, h: 4, sit: true, y: 1.0, raise: true, face: 0 });
    rod(scene, [-0.6, 1.8, -0.5], [-0.4, 4.6, -0.6], 0.04, MAT.olive);
    const ang = figure(scene, 5, 0, { robe: 0xffffff, cloth: 0xffffff, band: 0xf2e2b0, h: 4.4, face: Math.PI }); void ang;
    const sw = grp(scene, 4.6, 2.8, 0.6); sw.rotation.z = 0.9; slab(sw, [[0, -0.07], [1.6, -0.05], [1.9, 0], [1.6, 0.05], [0, 0.07]], 0.02, mat(0xe8eef2, { rough: 0.1, metal: 1 }), 0, 0, 0, Math.PI / 2);
    const glow = mesh(scene, new THREE.SphereGeometry(2.6, 20, 14), GLOW(0xfff6d8, 0.4), 5, 2.4, 0); glow.userData.skipFit = true;
    L(labels, [-1, 3, 0.6], "The donkey lay down", "Three times she turned aside to save him, and three times he struck her. “Then the LORD opened the mouth of the donkey: ‘What have I done to you?’”", "Numbers 22:23–28");
    L(labels, [5, 5.4, 0], "The angel with a drawn sword", "Balaam couldn't see him until the LORD opened his eyes. “Only speak the word that I tell you.”", "Numbers 22:31–35");
    L(labels, [0, 2.8, 2.4], "A narrow path between walls", "The donkey pressed against the wall and crushed Balaam's foot.", "Numbers 22:24–25", true);
    return { view: v3(0.6, 0.55, 1.1), target: v3(1.5, 2, 0), zoom: 0.4 };
  },

  "wise-mens-gifts"({ scene, labels }) {
    ground(scene, 30, C.sand, false);
    // The star went before them and stood over the place where the child was; they entered the house,
    // worshipped him, and opened their treasures: gold, frankincense and myrrh (Matthew 2:9-11).
    const h = house(scene, 0, -8, 10, 8, 7);  void h;
    const st = grp(scene, 0, 22, -8); st.userData.skipFit = true;
    for (let i = 0; i < 4; i++) { const r = mesh(st, new THREE.ConeGeometry(0.4, 4, 8), GLOW(0xfff6c8, 0.9), 0, 0, 0, 0, 0, i * Math.PI / 4); r.position.set(0, 0, 0); r.rotation.z = i * Math.PI / 2; r.translateY(2); }
    sph(st, 0.9, GLOW(0xffffff, 1), 0, 0, 0);
    const beam = mesh(scene, new THREE.CylinderGeometry(0.3, 2, 14, 16, 1, true), GLOW(0xfff6c8, 0.15), 0, 14, -8); beam.userData.skipFit = true;
    // Three caskets.
    const c1 = grp(scene, -1.6, 0, 1.6); rbox(c1, 1.0, 0.7, 0.7, 0, 0, 0, GOLD, 0.08); for (let i = 0; i < 4; i++) mesh(c1, new THREE.CylinderGeometry(0.1, 0.1, 0.03, 16), GOLD, -0.3 + i * 0.2, 0.72, 0);
    const c2 = grp(scene, 0, 0, 2.2); vessel(c2, [[0, 0], [0.35, 0], [0.4, 0.3], [0.3, 0.6], [0.32, 0.65]], SILVER); for (let i = 0; i < 9; i++) sph(c2, 0.07, mat(0xefe3b8, { rough: 0.3 }), Math.cos(i) * 0.15, 0.66, Math.sin(i) * 0.15, 1, 1.4, 1);
    const c3 = grp(scene, 1.6, 0, 1.6); vessel(c3, [[0, 0], [0.2, 0], [0.25, 0.35], [0.12, 0.6], [0.08, 0.75], [0.12, 0.8]], mat(0xf2ead8, { rough: 0.3 }));
    for (let i = 0; i < 3; i++) figure(scene, -3 + i * 3, 4.6, { robe: [0x5b2c6f, 0x1f4f9a, 0xa3302a][i], cloth: [0xd9a440, 0xe9e1cf, 0x2a2522][i], beard: i !== 1, skin: [0, 2, 3][i], h: 4, face: -Math.PI / 2, skipFit: true });
    beast(scene, 8, 6, { color: 0xc8a070, s: 1.2, face: Math.PI });
    L(labels, [-1.6, 1.4, 1.6], "Gold", "A gift for a king.", "Matthew 2:11");
    L(labels, [0, 1.4, 2.2], "Frankincense", "Burned in worship: incense for God.", "Matthew 2:11; Exodus 30:34");
    L(labels, [1.6, 1.4, 1.6], "Myrrh", "A costly perfume used in anointing and in burial. Nicodemus brought myrrh to Jesus' burial too.", "Matthew 2:11; John 19:39");
    L(labels, [0, 24, -8], "The star stood over the place", "“When they saw the star, they rejoiced exceedingly with great joy. And going into the house, they saw the child with Mary his mother, and they fell down and worshipped him.”", "Matthew 2:9–11");
    return { view: v3(0.5, 0.35, 1.2), target: v3(0, 9, -3), zoom: 1.1 };
  },

  "great-fish"({ scene, labels }) {
    const sea = mesh(scene, new THREE.PlaneGeometry(200, 200), mat(0x1f4a5a, { rough: 0.2, opacity: 0.55 }), 0, 12, 0, -Math.PI / 2); sea.userData.skipFit = true; sea.userData.noShadow = true;
    const floor = mesh(scene, new THREE.PlaneGeometry(200, 200), mat(0x8a7a5a, { rough: 1, tex: "sand", rep: 10 }), 0, -14, 0, -Math.PI / 2); floor.userData.skipFit = true;
    // Jonah in the belly of the fish three days and three nights; weeds wrapped about his head (Jonah 1:17-2:10).
    const f = grp(scene, 0, 0, 0);
    const body = mat(0x4a5a66, { rough: 0.4 });
    const geo = new THREE.SphereGeometry(5, 40, 24); geo.scale(3.2, 1, 1.1);
    const cut = mesh(f, geo, (() => { const m = body.clone(); m.side = THREE.DoubleSide; m.transparent = true; m.opacity = 0.5; m.depthWrite = false; return m; })()); cut.userData.noShadow = true;
    slab(f, [[0, 0], [7, 6], [5, 0], [7, -6]], 1, body, 15, 0, 0);
    slab(f, [[0, 0], [3, 3], [5, 0]], 0.6, body, 0, 4.5, 0, 0, 0, 0);
    sph(f, 0.6, MAT.black, -13, 1.5, 3.4);
    // A window cut in the side to see inside.
    figure(f, 0, 2, { robe: 0x6b5236, beard: true, h: 3.6, y: -3.4, sit: true, raise: true, face: Math.PI / 2 });
    path(f, [[-1, 0.4, 3], [0, 0.8, 3.2], [1, 0.3, 3]], 0.08, MAT.leaf, 10);
    const lt = new THREE.PointLight(0xffe0b0, 3, 10, 2); lt.position.set(0, 0, 6); f.add(lt);
    L(labels, [0, 6, 0], "Three days and three nights", "“Jonah prayed to the LORD his God from the belly of the fish: ‘I called out to the LORD, out of my distress, and he answered me.’”", "Jonah 1:17–2:2");
    L(labels, [0, -2, 6], "Weeds wrapped about my head", "“The waters closed in over me… yet you brought up my life from the pit.” “Salvation belongs to the LORD!”", "Jonah 2:5–9", true);
    L(labels, [-13, 4, 3], "The sign of Jonah", "“As Jonah was three days and three nights in the belly of the great fish, so will the Son of Man be three days and three nights in the heart of the earth.”", "Matthew 12:40");
    return { view: v3(0.3, 0.25, 1.1), target: v3(0, 0, 0), zoom: 0.8 };
  },

  pentecost({ scene, labels }) {
    ground(scene, 30, 0xb8a888);
    // They were all together in one place; a sound like a mighty rushing wind; divided tongues as of
    // fire rested on each one of them (Acts 2:1-4).
    const pl = mat(0xffffff, { rough: 0.95, tex: "plaster", rep: 3 });
    rbox(scene, 22, 9, 0.5, 0, 0, -10, pl, 0.05); rbox(scene, 0.5, 9, 20, -11, 0, 0, pl, 0.05); rbox(scene, 0.5, 9, 20, 11, 0, 0, pl, 0.05);
    for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2, r = 5 + (i % 2) * 2.2; const x = Math.cos(a) * r, z = Math.sin(a) * r - 1;
      figure(scene, x, z, { robe: ROBES[i % 8], skin: i % 4, beard: i % 3 === 0, h: 4, raise: i % 4 === 0, face: -a + Math.PI / 2 * 0 + Math.PI - a + Math.PI / 2, skipFit: i > 6 });
      const fl = cone(scene, 0.22, 0.8, GLOW(0xff9a30, 0.9), x, 4.6, z); fl.userData.skipFit = true; }
    for (let i = 0; i < 10; i++) { const t = i / 10; const w = path(scene, [[-10 + t * 2, 7 - t, -9 + t * 18], [0, 7.5, 0], [10 - t * 2, 7 + t * 0.5, 9 - t * 18]], 0.05, GLOW(0xffffff, 0.35), 30); w.userData.skipFit = true; }
    L(labels, [0, 6.4, -1], "Tongues as of fire", "“Divided tongues as of fire appeared to them and rested on each one of them. And they were all filled with the Holy Spirit and began to speak in other tongues as the Spirit gave them utterance.”", "Acts 2:3–4");
    L(labels, [-8, 8, -6], "A mighty rushing wind", "“Suddenly there came from heaven a sound like a mighty rushing wind, and it filled the entire house where they were sitting.”", "Acts 2:2", true);
    L(labels, [8, 8, 6], "Each in his own language", "Pilgrims from Parthia to Rome, Crete and Arabia heard them telling the mighty works of God in their own tongues. About 3,000 were baptised that day.", "Acts 2:5–11, 41", true);
    return { view: v3(0.7, 0.75, 1.1), target: v3(0, 3, -1) };
  },

  "aaron-and-hur"({ scene, labels }) {
    ground(scene, 60, 0xb8a888, false);
    hill(scene, 14, 0, -6, 9, 0xa89a7a);
    // On the hilltop Moses held up his hands with the staff of God; when his hands grew weary, Aaron
    // and Hur set a stone under him and held up his hands until sunset (Exodus 17:8-13).
    rock(scene, 1, 0, 9.4, -6, 0xb0a48c, 1.2, 0.7, 1);
    figure(scene, 0, -6, { robe: 0x7a5a3e, cloth: 0x8b6f4e, beard: true, h: 4, sit: true, y: 9.6, raise: true, face: Math.PI / 2 });
    figure(scene, 0, -7.4, { robe: 0xefe9dc, cloth: 0xffffff, beard: true, h: 4, y: 8.8, raise: true, face: Math.PI / 2 });
    figure(scene, 0, -4.6, { robe: 0x5d7a5a, beard: true, h: 4, y: 8.8, raise: true, face: Math.PI / 2 });
    rod(scene, [0.3, 13.6, -5.6], [0.3, 15.8, -5.2], 0.05, MAT.olive);
    for (let i = 0; i < 16; i++) figure(scene, -10 + (i % 8) * 3, 14 + Math.floor(i / 8) * 4, { robe: i < 8 ? ROBES[i] : 0x3a3430, skin: i % 4, h: 4, raise: i % 3 === 0, face: i < 8 ? Math.PI / 2 : -Math.PI / 2, skipFit: true });
    L(labels, [0, 15, -6], "Hands held up until sunset", "“Whenever Moses held up his hand, Israel prevailed, and whenever he lowered his hand, Amalek prevailed.” Aaron and Hur held up his hands, one on one side and one on the other.", "Exodus 17:11–12");
    L(labels, [0, 6, 16], "Joshua fought below", "Joshua overwhelmed Amalek. Moses built an altar and called it “The LORD is my banner”.", "Exodus 17:13–15", true);
    return { view: v3(0.25, 0.3, 1), target: v3(0, 10, 0), zoom: 1.4 };
  },

  "mount-sinai"({ scene, labels }) {
    ground(scene, 200, 0xb8a888, false);
    // The mountain wrapped in smoke because the LORD descended on it in fire; thunder, lightning, a thick
    // cloud and a very loud trumpet blast; the people at the foot, limits set round it (Exodus 19:16-25).
    const m = mesh(scene, new THREE.ConeGeometry(60, 70, 24, 6), mat(0x8a6a5a, { rough: 1, tex: "rock", rep: 6 }), 0, 35, -40);
    const p = m.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setX(i, p.getX(i) * (1 + Math.sin(i * 1.7) * 0.08)); p.setZ(i, p.getZ(i) * (1 + Math.cos(i * 2.3) * 0.08)); if (y > 30) p.setY(i, y - 4); } m.geometry.computeVertexNormals();
    for (let i = 0; i < 18; i++) cloudPuff(scene, Math.cos(i) * 18, 60 + (i % 5) * 4, -40 + Math.sin(i) * 14, 9, mat(0x5a5652, { rough: 1, opacity: 0.8 }));
    for (let i = 0; i < 6; i++) { const f = cone(scene, 3, 10, GLOW(0xff8a2a, 0.7), -8 + i * 3, 64, -40 + (i % 2) * 4); f.userData.skipFit = true; }
    [[-10, 80, -30], [12, 76, -44]].forEach(([x, y, z]) => { const l = path(scene, [[x, y, z], [x + 3, y - 6, z], [x - 1, y - 12, z], [x + 2, y - 20, z]], 0.5, GLOW(0xf4f8ff, 1), 10); l.userData.skipFit = true; });
    for (let i = 0; i < 40; i++) tent(scene, -60 + (i % 20) * 6, 40 + Math.floor(i / 20) * 8, 1.2, i);
    for (let i = 0; i < 12; i++) figure(scene, -30 + i * 5, 26, { robe: ROBES[i % 8], skin: i % 4, h: 4, face: -Math.PI / 2, skipFit: true });
    for (let i = 0; i < 20; i++) rbox(scene, 1, 1, 1, -50 + i * 5.2, 0, 18, MAT.rock, 0.3);
    L(labels, [0, 82, -40], "Smoke, fire and trumpet", "“Mount Sinai was wrapped in smoke because the LORD had descended on it in fire. The smoke of it went up like the smoke of a kiln, and the whole mountain trembled greatly. And as the sound of the trumpet grew louder and louder, Moses spoke, and God answered him in thunder.”", "Exodus 19:18–19");
    L(labels, [0, 6, 18], "Limits round the mountain", "“Take care not to go up into the mountain or touch the edge of it.”", "Exodus 19:12, 23", true);
    L(labels, [-40, 8, 44], "Israel camped before the mountain", "In the third month after leaving Egypt. There they received the Ten Words and the law.", "Exodus 19:1–2; 20:1–17", true, "/bible/3d/tablets");
    return { view: v3(0.6, 0.35, 1.2), target: v3(0, 40, -20), zoom: 0.8 };
  },
};
