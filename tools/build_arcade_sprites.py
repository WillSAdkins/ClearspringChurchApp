"""Pixel-art sprites for the Clearspring Arcade title screens, drawn from
the little character grids below (one character = one pixel).

    python tools/build_arcade_sprites.py

Writes static/games/arcade/<name>.png at 1x; the pages scale them up with
image-rendering: pixelated, so they stay crisp at any size.
"""
import os
from PIL import Image

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "static", "games", "arcade")

PAL = {
    ".": None, "k": (17, 17, 17), "w": (255, 255, 255), "c": (232, 226, 210), "g": (243, 198, 35), "G": (201, 155, 14),
    "y": (255, 226, 122), "r": (196, 40, 40), "R": (142, 27, 27), "b": (60, 120, 220), "B": (30, 64, 140),
    "t": (45, 212, 191), "T": (12, 120, 110), "n": (140, 90, 50), "N": (95, 58, 30), "s": (120, 120, 128),
    "S": (70, 70, 78), "p": (150, 90, 200), "P": (95, 50, 140), "o": (240, 140, 40), "l": (120, 200, 90),
    "L": (60, 130, 50), "f": (250, 205, 160), "e": (200, 200, 205),
}

SPRITES = {
    "memory": [
        "................",
        ".kkkkkk.........",
        ".kBBBBk.kkkkkk..",
        ".kBbbBk.kwwwwk..",
        ".kBbbBk.kwrwrk..",
        ".kBBBBk.krrrrk..",
        ".kBbbBk.krrrrk..",
        ".kBbbBk.kwrrwk..",
        ".kBBBBk.kwwrwk..",
        ".kkkkkk.kwwwwk..",
        "........kkkkkk..",
        "................",
    ],
    "sheep": [
        "................",
        "....kkkkkk......",
        "..kkwcwcwckk....",
        ".kwcwcwcwcwck...",
        "kkwcwcwcwcwckkk.",
        "kSkcwcwcwcwkSSSk",
        "kSSkcwcwcwkSSwSk",
        ".kkkcwcwcwkSSSSk",
        "..kkwcwcwckkSSk.",
        "...kkkkkkkk.kk..",
        "...kSk..kSk.....",
        "...kSk..kSk.....",
        "...kkk..kkk.....",
    ],
    "verse": [
        "..kkkkkkkkkkkk..",
        ".kcckcccccccckk.",
        ".kcckckkkkkkcck.",
        "..kkkcccccccckk.",
        "....kckkkkkcck..",
        "....kcccccccck..",
        "....kckkkkkkck..",
        "....kcccccccck..",
        "....kckkkkcckk..",
        "..kkkcccccccck..",
        ".kcckckkkkkkck..",
        ".kcckccccccckk..",
        "..kkkkkkkkkkk...",
    ],
    "manna": [
        "......w.........",
        "...w.......w....",
        ".........w......",
        "..w..w..........",
        "..kkkkkkkkkkk...",
        ".knnnnnnnnnnnk..",
        ".kNwcwcwcwcwNk..",
        "..knwcwcwcwnk...",
        "..kNnnnnnnnNk...",
        "...knNnNnNnk....",
        "...kNnNnNnNk....",
        "....kkkkkkk.....",
    ],
    "books": [
        "................",
        "...kkkkkkkkkk...",
        "..krrrrrrrrrRk..",
        "..kRRRRRRRRRRk..",
        ".kkkkkkkkkkkkk..",
        ".kbbbbbbbbbbbBk.",
        ".kBBBBBBBBBBBBk.",
        "..kkkkkkkkkkkkk.",
        "..klllllllllLk..",
        "..kLLLLLLLLLLk..",
        ".kkkkkkkkkkkkk..",
        ".kggggggggggGk..",
        ".kGGGGGGGGGGGk..",
        ".kkkkkkkkkkkkk..",
    ],
    "trophy": [
        "..kkkkkkkkkkk...",
        "kkkgyyyyyyygGkkk",
        "kgkgyyyyyyygGkGk",
        "kgkgyyyyyyygGkGk",
        ".kkkgyyyyyggGkk.",
        "...kGgyyyggGk...",
        "....kGgggGGk....",
        ".....kGggGk.....",
        "......kgGk......",
        "......kgGk......",
        "....kkgggGkk....",
        "...kGGGGGGGGk...",
        "...kkkkkkkkkk...",
    ],
    "football": [
        "................",
        ".....kkkkkk.....",
        "...kknnnnnnkk...",
        "..knwnnnnnnwNk..",
        ".knnwnwnwnnwnNk.",
        ".knnwwwwwwwwnNk.",
        ".knnwnwnwnnwnNk.",
        "..knwnnnnnnwNk..",
        "...kkNNNNNNkk...",
        ".....kkkkkk.....",
        "................",
    ],
    "shield": [
        ".kkkkkkkkkkkkk..",
        ".kTtttttttttTk..",
        ".kTtttgggtttTk..",
        ".kTtttgggtttTk..",
        ".kTtgggggggtTk..",
        ".kTtgggggggtTk..",
        ".kTtttgggtttTk..",
        "..kTttgggttTk...",
        "..kTttgggttTk...",
        "...kTttgttTk....",
        "....kTtttTk.....",
        ".....kTTTk......",
        "......kkk.......",
    ],
    "knight": [
        "......kk........",
        ".....kekk.......",
        "....keeeekk.....",
        "...keekeeeek....",
        "..keeeeeeeeek...",
        "..keeeekkeeek...",
        "...kkkk.keeek...",
        "........keeek...",
        ".......keeeek...",
        "......keeeeek...",
        ".....kkkkkkkkk..",
        "....keeeeeeeeek.",
        "....kkkkkkkkkkk.",
    ],
    "crown": [
        "k......k......k.",
        "kk....kgk....kk.",
        "kgk..kgggk..kgk.",
        "kgGkkggrggkkGgk.",
        "kgggggggggggggk.",
        "kgGgGgGgGgGgGgk.",
        "kgggggggggggggk.",
        "kGGGGGGGGGGGGGk.",
        "kkkkkkkkkkkkkkk.",
    ],
}


def main():
    os.makedirs(OUT, exist_ok=True)
    for name, rows in SPRITES.items():
        w = max(len(r) for r in rows)
        im = Image.new("RGBA", (w, len(rows)), (0, 0, 0, 0))
        for y, row in enumerate(rows):
            for x, ch in enumerate(row):
                col = PAL.get(ch)
                if col:
                    im.putpixel((x, y), col + (255,))
        im.save(os.path.join(OUT, f"{name}.png"))
    print("wrote", len(SPRITES), "sprites to", OUT)


if __name__ == "__main__":
    main()
