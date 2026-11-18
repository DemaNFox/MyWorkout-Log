"""Draw public README previews with fictional workout data.

Requires Pillow: python -m pip install Pillow
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "screenshots"
OUT.mkdir(parents=True, exist_ok=True)

W, H = 480, 960
BG = "#101b18"
SURFACE = "#1d2c27"
SURFACE_2 = "#23372f"
GREEN = "#6ed5aa"
TEXT = "#f2f7f3"
MUTED = "#a9bcb0"
LINE = "#34453c"
DARK = "#123127"

FONT_DIR = Path("C:/Windows/Fonts")
REGULAR = FONT_DIR / "segoeui.ttf"
BOLD = FONT_DIR / "segoeuib.ttf"


def font(size, bold=False):
    return ImageFont.truetype(str(BOLD if bold else REGULAR), size)


def txt(draw, xy, value, size=18, color=TEXT, bold=False):
    draw.text(xy, value, font=font(size, bold), fill=color)


def box(draw, xy, fill=SURFACE, radius=22, outline=None):
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=2)


def line(draw, xy, fill=LINE, width=2):
    draw.line(xy, fill=fill, width=width)


def base(title, active):
    image = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(image)
    txt(d, (28, 16), "9:41", 17, TEXT, True)
    d.ellipse((403, 22, 414, 33), fill=TEXT)
    d.rounded_rectangle((423, 22, 453, 34), radius=4, outline=TEXT, width=2)
    d.rectangle((427, 26, 444, 30), fill=TEXT)
    txt(d, (28, 83), title, 38, TEXT, True)
    d.rectangle((0, 875, W, H), fill=SURFACE)
    line(d, (0, 875, W, 875))
    tabs = [("Сегодня", 51), ("Программы", 153), ("История", 277), ("Прогресс", 382)]
    for name, x in tabs:
        color = GREEN if name == active else MUTED
        if name == "Сегодня":
            box(d, (x + 20, 893, x + 44, 916), color, 5)
            d.rectangle((x + 25, 890, x + 29, 900), fill=color)
            d.rectangle((x + 36, 890, x + 40, 900), fill=color)
        elif name == "Программы":
            box(d, (x + 27, 892, x + 50, 916), None, 4, color)
            line(d, (x + 32, 899, x + 44, 899), color)
            line(d, (x + 32, 906, x + 44, 906), color)
        elif name == "История":
            d.ellipse((x + 22, 892, x + 47, 917), outline=color, width=2)
            line(d, (x + 34, 896, x + 34, 904, x + 40, 908), color)
        else:
            line(d, (x + 18, 914, x + 28, 904, x + 36, 909, x + 48, 894), color, 3)
        txt(d, (x - 3, 928), name, 13, color, name == active)
    return image, d


def save(image, name):
    image.save(OUT / name, optimize=True)


# Today
im, d = base("Сегодня", "Сегодня")
txt(d, (28, 62), "ВАША ТРЕНИРОВКА", 15, MUTED, True)
txt(d, (28, 142), "Хорошая тренировка", 32, TEXT, True)
txt(d, (28, 180), "начинается здесь.", 32, TEXT, True)
txt(d, (28, 229), "Программа «Сила и форма»", 18, MUTED)
box(d, (28, 288, 452, 587), GREEN, 28)
txt(d, (54, 317), "АКТИВНАЯ ПРОГРАММА", 17, DARK, True)
txt(d, (54, 381), "День 1 — верх тела", 31, DARK, True)
txt(d, (54, 428), "5 упражнений  ·  примерно 50 минут", 17, DARK)
box(d, (54, 494, 426, 558), DARK, 16)
txt(d, (150, 511), "Начать тренировку", 20, GREEN, True)
txt(d, (28, 625), "Другие дни", 23, TEXT, True)
box(d, (28, 671, 452, 743), SURFACE, 18)
txt(d, (52, 691), "День 2 — низ тела", 20, TEXT, True)
box(d, (28, 755, 452, 827), SURFACE, 18)
txt(d, (52, 775), "День 3 — всё тело", 20, TEXT, True)
save(im, "today.png")


# Programs
im, d = base("Программы", "Программы")
txt(d, (28, 139), "Планируйте дни и упражнения.", 18, MUTED)
box(d, (28, 192, 452, 462), GREEN, 26)
txt(d, (52, 222), "АКТИВНАЯ ПРОГРАММА", 16, DARK, True)
txt(d, (52, 281), "Сила и форма", 30, DARK, True)
txt(d, (52, 326), "3 дня  ·  16 упражнений", 18, DARK)
box(d, (52, 376, 428, 434), DARK, 15)
txt(d, (162, 390), "Открыть план", 20, GREEN, True)
txt(d, (28, 506), "Дни программы", 23, TEXT, True)
for y, n, name, sub in [
    (553, "01", "Верх тела", "Грудь, спина, руки"),
    (652, "02", "Низ тела", "Ноги, ягодицы, корпус"),
    (751, "03", "Всё тело", "Сила и техника"),
]:
    box(d, (28, y, 452, y + 86), SURFACE, 19)
    box(d, (48, y + 19, 96, y + 67), SURFACE_2, 12)
    txt(d, (57, y + 28), n, 18, GREEN, True)
    txt(d, (115, y + 13), name, 21, TEXT, True)
    txt(d, (115, y + 46), sub, 15, MUTED)
save(im, "programs.png")


# Workout
im, d = base("Тренировка", "Сегодня")
txt(d, (28, 63), "ДЕНЬ 1  ·  ВЕРХ ТЕЛА", 15, MUTED, True)
txt(d, (28, 142), "Упражнение 2 из 5", 19, MUTED)
box(d, (28, 183, 452, 190), LINE, 3)
box(d, (28, 183, 192, 190), GREEN, 3)
box(d, (28, 224, 452, 768), SURFACE, 26)
txt(d, (52, 249), "СЕЙЧАС", 16, GREEN, True)
box(d, (305, 247, 427, 282), SURFACE_2, 13)
txt(d, (319, 254), "ПОДХОД 2 / 4", 13, GREEN, True)
txt(d, (52, 302), "Жим гантелей лёжа", 29, TEXT, True)
txt(d, (52, 349), "Грудь  ·  трицепс", 17, MUTED)
box(d, (52, 400, 428, 459), SURFACE_2, 14)
txt(d, (68, 417), "Прошлый раз", 17, MUTED)
txt(d, (269, 416), "20 кг × 10", 19, TEXT, True)
for x, label, value in [(52, "ВЕС", "22 кг"), (246, "ПОВТОРЕНИЯ", "10")]:
    box(d, (x, 486, x + 182, 592), BG, 15, LINE)
    txt(d, (x + 16, 501), label, 14, MUTED, True)
    txt(d, (x + 16, 537), value, 28, TEXT, True)
txt(d, (52, 625), "После подхода — отдых 1:30", 17, MUTED)
box(d, (52, 680, 428, 741), GREEN, 15)
txt(d, (133, 696), "Завершить подход", 20, DARK, True)
txt(d, (28, 804), "Далее: тяга гантели в наклоне", 18, MUTED)
save(im, "workout.png")


# Progress
im, d = base("Прогресс", "Прогресс")
txt(d, (28, 139), "Динамика по упражнениям", 18, MUTED)
box(d, (28, 191, 452, 252), SURFACE, 17)
txt(d, (49, 207), "Жим гантелей лёжа", 20, TEXT, True)
line(d, (412, 219, 421, 228, 430, 219), GREEN, 3)
box(d, (28, 278, 452, 354), SURFACE, 18)
txt(d, (49, 291), "ЛУЧШИЙ РЕЗУЛЬТАТ", 14, MUTED, True)
txt(d, (49, 315), "24 кг × 8", 23, TEXT, True)
txt(d, (332, 319), "+4 кг", 19, GREEN, True)
box(d, (28, 378, 452, 762), SURFACE, 22)
txt(d, (49, 399), "Рабочий вес", 22, TEXT, True)
txt(d, (49, 435), "Нажмите на точку, чтобы увидеть результат", 14, MUTED)
for y, label in [(509, "24"), (565, "22"), (621, "20"), (677, "18")]:
    txt(d, (50, y - 11), label, 14, MUTED)
    line(d, (87, y, 427, y), LINE)
points = [(103, 671), (169, 624), (237, 621), (303, 570), (373, 510)]
line(d, tuple(v for point in points for v in point), GREEN, 4)
for x, y in points:
    d.ellipse((x - 7, y - 7, x + 7, y + 7), fill=GREEN)
box(d, (320, 471, 426, 503), DARK, 10)
txt(d, (333, 476), "24 кг · 8", 14, GREEN, True)
for x, label in [(92, "01.11"), (212, "08.11"), (350, "15.11")]:
    txt(d, (x, 709), label, 14, MUTED)
txt(d, (28, 805), "История результатов по датам", 18, MUTED)
save(im, "progress.png")


# History
im, d = base("История", "История")
txt(d, (28, 139), "Завершённые тренировки программы", 18, MUTED)
box(d, (28, 190, 452, 253), SURFACE, 17)
txt(d, (49, 207), "Сила и форма", 20, TEXT, True)
line(d, (412, 219, 421, 228, 430, 219), GREEN, 3)
txt(d, (28, 288), "НОЯБРЬ", 15, MUTED, True)
for y, day, name, detail in [
    (329, "15", "Верх тела", "5 упражнений · 52 минуты"),
    (449, "12", "Низ тела", "6 упражнений · 48 минут"),
    (569, "08", "Всё тело", "5 упражнений · 55 минут"),
    (689, "04", "Верх тела", "5 упражнений · 50 минут"),
]:
    box(d, (28, y, 452, y + 104), SURFACE, 18)
    txt(d, (51, y + 13), day, 30, GREEN, True)
    txt(d, (105, y + 15), name, 21, TEXT, True)
    txt(d, (105, y + 48), detail, 16, MUTED)
    txt(d, (389, y + 29), "›", 27, GREEN, True)
save(im, "history.png")
