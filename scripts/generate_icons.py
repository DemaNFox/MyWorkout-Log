"""Generate Android launcher and splash assets from one scalable mark.

Requires Pillow: ``python -m pip install pillow``.
"""

from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
RES = ROOT / "android" / "app" / "src" / "main" / "res"
SCALE = 3
SIZE = 1024
BACKGROUND = "#10271D"
DISC = "#1E6048"
OUTER_PLATE = "#A4E9BF"
INNER_PLATE = "#F0FFF5"


def scaled(box: tuple[int, int, int, int]) -> tuple[int, int, int, int]:
    return tuple(value * SCALE for value in box)


def mark(transparent: bool) -> Image.Image:
    image = Image.new("RGBA", (SIZE * SCALE, SIZE * SCALE), (0, 0, 0, 0) if transparent else BACKGROUND)
    draw = ImageDraw.Draw(image)
    draw.ellipse(scaled((190, 190, 834, 834)), fill=DISC)
    draw.rounded_rectangle(scaled((274, 489, 750, 535)), radius=22 * SCALE, fill=INNER_PLATE)
    draw.rounded_rectangle(scaled((259, 399, 327, 625)), radius=23 * SCALE, fill=OUTER_PLATE)
    draw.rounded_rectangle(scaled((348, 351, 420, 673)), radius=24 * SCALE, fill=INNER_PLATE)
    draw.rounded_rectangle(scaled((604, 351, 676, 673)), radius=24 * SCALE, fill=INNER_PLATE)
    draw.rounded_rectangle(scaled((697, 399, 765, 625)), radius=23 * SCALE, fill=OUTER_PLATE)
    return image.resize((SIZE, SIZE), Image.Resampling.LANCZOS)


def main() -> None:
    standard = mark(transparent=False)
    foreground = mark(transparent=True)
    standard.save(ROOT / "assets" / "icon.png")
    foreground.save(ROOT / "assets" / "adaptive-icon.png")

    densities = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
    for density, size in densities.items():
        directory = RES / f"mipmap-{density}"
        standard.resize((size, size), Image.Resampling.LANCZOS).save(directory / "ic_launcher.webp", lossless=True)
        foreground.resize((size * 9 // 4, size * 9 // 4), Image.Resampling.LANCZOS).save(directory / "ic_launcher_foreground.webp", lossless=True)
        rounded = standard.resize((size, size), Image.Resampling.LANCZOS)
        mask = Image.new("L", (size, size), 0)
        ImageDraw.Draw(mask).ellipse((0, 0, size - 1, size - 1), fill=255)
        rounded.putalpha(mask)
        rounded.save(directory / "ic_launcher_round.webp", lossless=True)

    splash_sizes = {"mdpi": 288, "hdpi": 432, "xhdpi": 576, "xxhdpi": 864, "xxxhdpi": 1152}
    for density, size in splash_sizes.items():
        foreground.resize((size, size), Image.Resampling.LANCZOS).save(RES / f"drawable-{density}" / "splashscreen_logo.png")


if __name__ == "__main__":
    main()
