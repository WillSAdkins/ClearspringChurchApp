# The 3D Bible world: how it works and how to add a model

Over 250 models, at **Study → 3D Bible world** (`/bible/3d`). Each one is drawn in
code with three.js, so there are no model files to download: a page fetches the
engine (about 30 KB plus three.js) and the one *pack* its model lives in.

## Where things are

| What | Where |
|---|---|
| The list of models: title, line, passage, emoji, shelf, pack | `models3d.py` |
| The drawing code, one function per model | `tools/bible3d/pack-<name>.js` |
| Shared materials, people, animals, scenery and shortcuts | `tools/bible3d/kit.js` |
| The viewer: camera, labels, buttons, auto-framing, loading packs | `tools/bible3d/bible3d.src.js` |
| The built files the app serves (don't edit) | `static/vendor/bible3d/` |
| Card pictures for the hub | `static/3d/<slug>.jpg` |

Packs: `core` (the first 18), `worship`, `war`, `work`, `home`, `words` (music,
money, writing), `travel`, `places`, `visions`, `nature`, `passion`, `things`,
`stories`, `prophets`, `gospel`.

## Where models show up

- The hub, with search and shelves (Places, Tabernacle and temple, Weapons…).
- **See it in 3D** chips on every Bible chapter a model is built from. These come
  from each model's `ref`, so write references the usual way: `Exodus 25:10–22; 38:8`.
- The search box on the Bible tab ("ark", "sling", "Exodus 28").
- Links between models from inside labels.

## Adding a model

1. **Draw it.** In the right pack, add a function named after the slug:

   ```js
   "widows-oil"({ scene, labels }) {
     ground(scene, 14, C.sand, false);          // floor
     vessel(scene, [[0,0],[0.3,0],[0.4,0.5]], MAT.clay, 0, 0, 0);   // a turned jar
     L(labels, [0, 1, 0], "Title", "What the text says.", "2 Kings 4:2");
     scale(scene, labels, 1.5, -1, true);       // a hand (small things) or a person
     return { view: v3(0.6, 0.6, 1) };          // camera direction; it frames itself
   },
   ```

   1 unit = 1 cubit (45 cm). Build to the Bible's measurements where it gives
   them, and where it doesn't, say so in a label. `L(…, true)` makes a minor label
   that appears when you zoom in.
2. **List it** in `models3d.py`: `M("widows-oil", "signs", "The widow's oil", "Every jar filled from one", "2 Kings 4:1–7", "🫙", "stories", also="elisha jars")`.
3. **Build** (needs Node, once: `cd tools/bible3d && npm install`):
   `npm run build` in `tools/bible3d`.
4. **Picture:** with the app running locally, `python tools/build_3d_thumbs.py`
   makes card pictures for any model without one.
5. **Check:** `python tools/check_3d.py` confirms every listed model has a
   drawing, every pack is built, every picture exists and every page loads.

Then commit everything, including `static/vendor/bible3d/` and `static/3d/`.

## Good to know

- Things marked `skipFit` (ground, water, hills, background people) are ignored
  when the camera frames a model. Use `target` and `zoom` in the return value to
  adjust.
- For many repeated small things (grain, stones) use `scatter()`: one draw call
  instead of hundreds, which keeps phones smooth.
- Hebrew and Aramaic text is placed letter by letter (`textPlane(..., { rtl: true })`)
  so it reads correctly on every phone.
- People in visions are not pictured where the text doesn't (the one on the throne
  is shown only as light). The cross and the passion are shown through objects and
  places, never suffering bodies. Keep to that.
