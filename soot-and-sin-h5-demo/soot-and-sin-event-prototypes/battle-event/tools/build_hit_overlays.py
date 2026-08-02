from pathlib import Path

import cv2
import numpy as np


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "soot-hound.webp"
OUTPUT = ROOT / "assets" / "hit-overlays"
SCALE = 2

PARTS = {
    "head": {
        "area": [
            (342, 276), (365, 279), (389, 286), (415, 282), (440, 298),
            (454, 326), (450, 354), (438, 385), (419, 421), (394, 462),
            (373, 438), (354, 409), (338, 377), (327, 338), (330, 305),
        ],
        "strokes": [
            ([(363, 305), (350, 340), (363, 382), (392, 435)], 24),
            ([(414, 305), (432, 337), (422, 378), (394, 435)], 24),
            ([(365, 322), (391, 309), (420, 323)], 18),
        ],
    },
    "left_limb": {
        "area": [
            (265, 294), (294, 300), (310, 319), (298, 350), (286, 392),
            (274, 434), (258, 479), (245, 528), (231, 578), (219, 628),
            (207, 680), (198, 720), (192, 750), (213, 770), (206, 790),
            (181, 783), (196, 816), (189, 831), (170, 810), (174, 840),
            (162, 851), (146, 817), (139, 844), (124, 847), (122, 815),
            (94, 838), (80, 832), (107, 798), (57, 820), (43, 812),
            (91, 779), (125, 755), (135, 731), (139, 699), (146, 658),
            (156, 612), (166, 570), (178, 526), (192, 479), (207, 430),
            (218, 382), (226, 338), (242, 310),
        ],
        "strokes": [
            ([(272, 316), (260, 352), (250, 401), (237, 452), (222, 505)], 25),
            ([(222, 505), (207, 560), (194, 617), (181, 674), (170, 725)], 22),
            ([(169, 725), (158, 765)], 18),
            ([(153, 767), (99, 799), (58, 811)], 6),
            ([(158, 773), (118, 819), (88, 832)], 6),
            ([(163, 772), (145, 832)], 6),
            ([(168, 770), (178, 826)], 6),
            ([(171, 766), (201, 808)], 6),
        ],
    },
    "right_limb": {
        "area": [
            (461, 286), (486, 289), (510, 305), (534, 330), (555, 360),
            (578, 391), (603, 417), (627, 443), (643, 467), (648, 492),
            (641, 524), (637, 558), (630, 599), (622, 642), (613, 684),
            (605, 719), (599, 744), (617, 764), (641, 786), (651, 800),
            (644, 813), (614, 792), (636, 830), (628, 842), (592, 802),
            (605, 850), (595, 858), (577, 810), (579, 861), (567, 866),
            (551, 810), (538, 852), (526, 849), (536, 802), (499, 837),
            (485, 832), (521, 785), (542, 762), (551, 737), (559, 700),
            (566, 660), (573, 617), (579, 574), (586, 533), (592, 500),
            (591, 478), (570, 459), (548, 441), (525, 421), (500, 398),
            (479, 374), (460, 344), (450, 315),
        ],
        "strokes": [
            ([(472, 310), (494, 337), (521, 369), (550, 401), (583, 431), (615, 468)], 26),
            ([(616, 484), (610, 528), (604, 574), (598, 620), (591, 668), (581, 717)], 25),
            ([(580, 717), (570, 765)], 19),
            ([(560, 768), (520, 808), (493, 827)], 6),
            ([(565, 771), (536, 821), (529, 842)], 6),
            ([(572, 772), (560, 823), (558, 856)], 6),
            ([(580, 772), (583, 824), (587, 852)], 6),
            ([(588, 769), (612, 810), (629, 833)], 6),
            ([(592, 765), (624, 789), (644, 806)], 6),
        ],
    },
}


def scaled(points):
    return np.array([(x * SCALE, y * SCALE) for x, y in points], np.int32)


def build_mask(image, spec):
    h, w = image.shape[:2]
    work = cv2.resize(image, (w * SCALE, h * SCALE), interpolation=cv2.INTER_CUBIC)
    mask = np.full(work.shape[:2], cv2.GC_BGD, np.uint8)
    cv2.fillPoly(mask, [scaled(spec["area"])], cv2.GC_PR_FGD)

    for points, thickness in spec["strokes"]:
        cv2.polylines(mask, [scaled(points)], False, cv2.GC_FGD, thickness * SCALE, cv2.LINE_AA)

    bg_model = np.zeros((1, 65), np.float64)
    fg_model = np.zeros((1, 65), np.float64)
    cv2.grabCut(work, mask, None, bg_model, fg_model, 7, cv2.GC_INIT_WITH_MASK)
    binary = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
    binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
    binary = cv2.GaussianBlur(binary, (0, 0), .65)
    return cv2.resize(binary, (w, h), interpolation=cv2.INTER_AREA)


def overlay_blend(image, color=(255, 145, 48), strength=.94):
    base = image.astype(np.float32) / 255
    tint = np.array(color[::-1], np.float32) / 255
    blended = np.where(base <= .5, 2 * base * tint, 1 - 2 * (1 - base) * (1 - tint))
    return np.clip((base * (1 - strength) + blended * strength) * 255, 0, 255).astype(np.uint8)


def write_image(path, image):
    extension = path.suffix
    success, encoded = cv2.imencode(extension, image)
    if not success:
        raise OSError(path)
    encoded.tofile(path)


def main():
    image = cv2.imdecode(np.fromfile(SOURCE, np.uint8), cv2.IMREAD_COLOR)
    if image is None:
        raise FileNotFoundError(SOURCE)

    OUTPUT.mkdir(parents=True, exist_ok=True)
    tinted = overlay_blend(image)

    for name, spec in PARTS.items():
        alpha = build_mask(image, spec)
        rgba = cv2.cvtColor(tinted, cv2.COLOR_BGR2BGRA)
        rgba[:, :, 3] = alpha
        write_image(OUTPUT / f"soot-hound-{name}.png", rgba)
        write_image(OUTPUT / f"soot-hound-{name}-mask.png", alpha)


if __name__ == "__main__":
    main()
