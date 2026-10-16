"""
Build static/maps/basemap.svg — a plain, period-neutral map of the Bible world
(land, lakes, the main rivers; no modern borders or labels), from Natural
Earth (public domain): github.com/nvkelso/natural-earth-vector (geojson/).

The projection is shared with static/bible-map.js:
  x = (lon - LON0) * KX * S,  y = (LAT1 - lat) * S
"""
import json
import sys

from shapely.geometry import box, shape, mapping
from shapely.ops import unary_union

LON0, LON1, LAT0, LAT1 = -8.0, 62.0, 6.0, 48.0
KX = 0.848          # cos(32°): keeps shapes right around Israel
S = 100.0           # px per degree of latitude

def proj(lon, lat):
    return ((lon - LON0) * KX * S, (LAT1 - lat) * S)

def path_of(geom, close=True):
    parts = []
    def ring(coords):
        pts = [proj(x, y) for x, y in coords]
        if len(pts) < 2:
            return
        d = [f"M{pts[0][0]:.0f} {pts[0][1]:.0f}"]
        px, py = round(pts[0][0]), round(pts[0][1])
        for x, y in pts[1:]:
            x, y = round(x), round(y)
            if (x, y) == (px, py):
                continue
            d.append(f"l{x - px} {y - py}")
            px, py = x, y
        parts.append("".join(d) + ("z" if close else ""))
    def walk(g):
        t = g.geom_type
        if t == "Polygon":
            ring(g.exterior.coords)
            for i in g.interiors:
                ring(i.coords)
        elif t == "LineString":
            ring(g.coords)
        elif t.startswith("Multi") or t == "GeometryCollection":
            for x in g.geoms:
                walk(x)
    walk(geom)
    return "".join(parts)

def load(path, clip, tol, keep=None):
    gj = json.load(open(path))
    geoms = []
    for f in gj["features"]:
        if keep and not keep(f["properties"]):
            continue
        g = shape(f["geometry"])
        if not g.intersects(clip):
            continue
        g = g.intersection(clip).simplify(tol, preserve_topology=True)
        if not g.is_empty:
            geoms.append(g)
    return geoms

def main(ne, out):
    clip = box(LON0, LAT0, LON1, LAT1)
    land = unary_union(load(f"{ne}/ne_10m_land.geojson", clip, 0.004))
    lakes = load(f"{ne}/ne_10m_lakes.geojson", clip, 0.003, lambda p: (p.get("scalerank") or 9) <= 9)
    rivers = load(f"{ne}/ne_10m_rivers_lake_centerlines.geojson", clip, 0.004,
                  lambda p: (p.get("scalerank") or 9) <= 6 or (p.get("name") or "") in ("Jordan", "Nile", "Euphrates", "Tigris", "Orontes", "Kishon", "Litani", "Halys", "Kizil"))
    W, H = proj(LON1, LAT0)
    svg = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W:.0f} {H:.0f}" width="{W:.0f}" height="{H:.0f}">',
           f'<path class="land" d="{path_of(land)}"/>',
           f'<path class="lake" d="{path_of(unary_union(lakes))}"/>' if lakes else "",
           f'<path class="river" d="{path_of(unary_union(rivers), close=False)}"/>' if rivers else "",
           "</svg>"]
    open(out, "w").write("\n".join(s for s in svg if s))
    print(out, round(sum(len(s) for s in svg) / 1024), "KB", W, H)

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
