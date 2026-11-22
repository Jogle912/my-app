"""Generates StudyPilot's app, splash and tab icons. Run: python3 scripts/make-icons.py (needs Pillow)."""
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / "assets" / "images"
INDIGO = (79, 70, 229, 255)
WHITE = (255, 255, 255, 255)
BLACK = (0, 0, 0, 255)


def plane(d: ImageDraw.ImageDraw, size: int, cx: float, cy: float, scale: float, color) -> None:
    """A paper plane: the 'pilot' in StudyPilot."""
    s = size * scale
    tip = (cx + 0.42 * s, cy - 0.30 * s)
    left = (cx - 0.44 * s, cy - 0.02 * s)
    fold = (cx - 0.06 * s, cy + 0.08 * s)
    tail = (cx + 0.02 * s, cy + 0.38 * s)
    d.polygon([left, tip, fold], fill=color)
    d.polygon([fold, tip, tail], fill=color)


def app_icon(size=1024):
    img = Image.new("RGBA", (size, size), INDIGO)
    plane(ImageDraw.Draw(img), size, size / 2, size / 2, 0.62, WHITE)
    img.save(OUT / "icon.png")


def adaptive():
    Image.new("RGBA", (512, 512), INDIGO).save(OUT / "android-icon-background.png")
    fg = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
    plane(ImageDraw.Draw(fg), 512, 256, 256, 0.42, WHITE)  # inside the adaptive-icon safe zone
    fg.save(OUT / "android-icon-foreground.png")
    mono = Image.new("RGBA", (432, 432), (0, 0, 0, 0))
    plane(ImageDraw.Draw(mono), 432, 216, 216, 0.5, BLACK)
    mono.save(OUT / "android-icon-monochrome.png")


def splash():
    img = Image.new("RGBA", (228, 228), (0, 0, 0, 0))
    plane(ImageDraw.Draw(img), 228, 114, 114, 0.8, WHITE)
    img.save(OUT / "splash-icon.png")
    fav = Image.new("RGBA", (48, 48), INDIGO)
    plane(ImageDraw.Draw(fav), 48, 24, 24, 0.7, WHITE)
    fav.save(OUT / "favicon.png")


def tab_icons():
    """Monochrome (template) tab icons at 1x/2x/3x, drawn on a 24-unit grid."""

    def calendar(d, u):
        d.rounded_rectangle([3 * u, 5 * u, 21 * u, 21 * u], radius=2 * u, outline=BLACK, width=int(2 * u))
        d.line([3 * u, 10 * u, 21 * u, 10 * u], fill=BLACK, width=int(2 * u))
        for x in (8, 16):
            d.line([x * u, 3 * u, x * u, 7 * u], fill=BLACK, width=int(2 * u))

    def book(d, u):
        d.rounded_rectangle([4 * u, 3 * u, 20 * u, 21 * u], radius=1.5 * u, outline=BLACK, width=int(2 * u))
        d.line([8 * u, 3 * u, 8 * u, 21 * u], fill=BLACK, width=int(2 * u))
        d.line([11 * u, 8 * u, 17 * u, 8 * u], fill=BLACK, width=int(1.6 * u))

    def clock(d, u):
        d.ellipse([3 * u, 3 * u, 21 * u, 21 * u], outline=BLACK, width=int(2 * u))
        d.line([12 * u, 7 * u, 12 * u, 12 * u, 16 * u, 14 * u], fill=BLACK, width=int(2 * u), joint="curve")

    def person(d, u):
        d.ellipse([8 * u, 3 * u, 16 * u, 11 * u], outline=BLACK, width=int(2 * u))
        d.arc([4 * u, 13 * u, 20 * u, 29 * u], 180, 360, fill=BLACK, width=int(2 * u))

    (OUT / "tabIcons").mkdir(exist_ok=True)
    for old in (OUT / "tabIcons").glob("*.png"):
        old.unlink()
    for name, draw in {"plan": calendar, "courses": book, "week": clock, "account": person}.items():
        for scale, suffix in ((1, ""), (2, "@2x"), (3, "@3x")):
            px = 24 * scale
            big = Image.new("RGBA", (px * 4, px * 4), (0, 0, 0, 0))  # supersample for smooth edges
            draw(ImageDraw.Draw(big), scale * 4)
            big.resize((px, px), Image.LANCZOS).save(OUT / "tabIcons" / f"{name}{suffix}.png")


if __name__ == "__main__":
    app_icon()
    adaptive()
    splash()
    tab_icons()
    print("icons written to", OUT)
