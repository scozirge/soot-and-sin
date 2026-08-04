import argparse
from pathlib import Path

import cv2
import numpy as np


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "battle" / "assets" / "pain-priest.png"
HIT_OUTPUT = ROOT / "battle" / "assets" / "hit-overlays"
DAMAGE_OUTPUT = ROOT / "battle" / "assets" / "damage-overlays"
SCALE = 2


HIT_PARTS = {
    "head": {
        "areas": [[
            (438, 245), (476, 220), (535, 210), (592, 230), (632, 270),
            (650, 322), (645, 386), (622, 448), (587, 497), (540, 522),
            (493, 512), (452, 478), (423, 425), (410, 363), (414, 304),
        ]],
        "strokes": [
            ([(483, 271), (462, 318), (460, 382), (488, 444), (535, 486)], 28),
            ([(575, 268), (610, 315), (616, 374), (586, 444), (541, 486)], 28),
            ([(458, 341), (510, 323), (572, 329), (616, 350)], 18),
            ([(455, 327), (449, 352), (457, 378)], 10),
            ([(617, 326), (628, 352), (620, 379)], 10),
        ],
    },
    "right_hand": {
        "areas": [[
            (286, 151), (321, 137), (353, 146), (370, 168), (368, 198),
            (352, 221), (346, 242), (328, 262), (304, 259), (284, 253),
            (268, 268), (250, 286), (238, 282), (245, 260), (261, 236),
            (275, 211), (280, 181),
        ]],
        "strokes": [
            ([(306, 157), (337, 165), (351, 184), (339, 208)], 18),
            ([(338, 210), (317, 230), (292, 243), (270, 260), (252, 278)], 18),
            ([(293, 178), (316, 184), (342, 194)], 10),
        ],
        "background_strokes": [
            ([(338, 217), (338, 279), (336, 347)], 10),
            ([(231, 290), (267, 284), (286, 271)], 7),
        ],
    },
    "left_hand": {
        "areas": [[
            (644, 603), (671, 601), (694, 618), (707, 640), (711, 660),
            (729, 640), (744, 648), (744, 666), (731, 684), (756, 674),
            (774, 686), (770, 701), (747, 711), (759, 731), (749, 748),
            (732, 743), (711, 719), (708, 746), (697, 759), (683, 753),
            (675, 726), (665, 708), (643, 710), (620, 724), (600, 722),
            (589, 709), (598, 695), (620, 681), (641, 666), (633, 641),
        ]],
        "strokes": [
            ([(653, 622), (675, 643), (697, 672), (701, 699)], 22),
            ([(694, 696), (666, 700), (638, 703), (607, 711)], 14),
            ([(705, 685), (734, 708), (753, 733)], 7),
            ([(709, 676), (745, 691), (768, 693)], 7),
            ([(705, 666), (731, 653), (741, 651)], 7),
            ([(696, 665), (700, 633), (697, 619)], 7),
            ([(682, 665), (668, 635), (657, 615)], 7),
        ],
        "background_strokes": [
            ([(632, 598), (665, 585), (702, 601)], 8),
            ([(718, 620), (744, 612)], 6),
        ],
    },
    "legs": {
        "areas": [[
            (487, 1318), (528, 1313), (553, 1328), (565, 1357), (568, 1394),
            (563, 1428), (570, 1462), (570, 1498), (558, 1522), (535, 1532),
            (504, 1532), (480, 1523), (468, 1507), (465, 1481), (470, 1451),
            (470, 1417), (472, 1380), (475, 1345),
        ]],
        "strokes": [
            ([(514, 1331), (517, 1376), (519, 1421), (520, 1465), (522, 1512)], 28),
            ([(498, 1472), (486, 1503)], 7),
            ([(511, 1470), (505, 1514)], 7),
            ([(524, 1470), (524, 1517)], 7),
            ([(537, 1468), (543, 1511)], 7),
            ([(549, 1463), (560, 1497)], 7),
        ],
        "background_strokes": [
            ([(474, 1311), (518, 1302), (562, 1315)], 9),
            ([(455, 1538), (518, 1550), (582, 1538)], 8),
        ],
    },
}


DAMAGE_PARTS = {
    "right_hand": {
        "areas": [[
            (285, 130), (354, 131), (381, 164), (376, 215), (357, 251),
            (357, 353), (335, 374), (315, 309), (275, 292), (240, 279),
            (219, 248), (234, 205), (263, 170),
        ]],
        "strokes": [
            ([(326, 151), (318, 201), (302, 248), (272, 280)], 24),
            ([(270, 279), (246, 264), (236, 240)], 20),
            ([(343, 187), (341, 249), (339, 313), (338, 356)], 10),
        ],
    },
    "left_hand": {
        "areas": [[
            (635, 578), (684, 568), (724, 590), (753, 623), (772, 659),
            (772, 711), (754, 750), (727, 779), (690, 789), (651, 769),
            (621, 735), (590, 711), (573, 678), (581, 639), (607, 606),
        ]],
        "strokes": [
            ([(651, 604), (679, 630), (699, 667), (703, 701)], 26),
            ([(700, 700), (671, 721), (626, 717), (590, 694)], 16),
            ([(704, 684), (744, 708), (763, 728)], 7),
            ([(704, 674), (748, 660), (769, 658)], 7),
            ([(698, 667), (734, 628), (756, 603)], 7),
            ([(690, 664), (701, 612), (706, 582)], 7),
            ([(683, 666), (670, 615), (660, 586)], 7),
        ],
        "background_strokes": [
            ([(708, 692), (738, 683)], 5),
            ([(705, 674), (738, 646)], 5),
        ],
    },
    "legs": {
        "areas": [[
            (487, 1274), (552, 1272), (579, 1309), (578, 1382), (571, 1450),
            (565, 1502), (543, 1528), (503, 1529), (474, 1500), (468, 1448),
            (470, 1378), (473, 1314),
        ]],
        "strokes": [
            ([(524, 1291), (522, 1349), (520, 1404), (521, 1462), (524, 1508)], 34),
            ([(500, 1468), (487, 1494)], 8),
            ([(516, 1470), (509, 1505)], 8),
            ([(528, 1470), (529, 1507)], 8),
            ([(540, 1468), (546, 1501)], 8),
            ([(550, 1463), (560, 1490)], 8),
        ],
    },
}


def scaled(points):
    return np.array([(x * SCALE, y * SCALE) for x, y in points], np.int32)


def remove_small_components(binary, minimum_area=90):
    count, labels, stats, _ = cv2.connectedComponentsWithStats(binary, 8)
    cleaned = np.zeros_like(binary)
    for index in range(1, count):
        if stats[index, cv2.CC_STAT_AREA] >= minimum_area * SCALE * SCALE:
            cleaned[labels == index] = 255
    return cleaned


def build_mask(image, spec):
    height, width = image.shape[:2]
    work = cv2.resize(image, (width * SCALE, height * SCALE), interpolation=cv2.INTER_CUBIC)
    mask = np.full(work.shape[:2], cv2.GC_BGD, np.uint8)

    for area in spec["areas"]:
        cv2.fillPoly(mask, [scaled(area)], cv2.GC_PR_FGD)
    for points, thickness in spec.get("strokes", []):
        cv2.polylines(mask, [scaled(points)], False, cv2.GC_FGD, thickness * SCALE, cv2.LINE_AA)
    for points, thickness in spec.get("background_strokes", []):
        cv2.polylines(mask, [scaled(points)], False, cv2.GC_BGD, thickness * SCALE, cv2.LINE_AA)

    background_model = np.zeros((1, 65), np.float64)
    foreground_model = np.zeros((1, 65), np.float64)
    cv2.grabCut(work, mask, None, background_model, foreground_model, 8, cv2.GC_INIT_WITH_MASK)
    binary = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
    binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
    binary = remove_small_components(binary)
    binary = cv2.GaussianBlur(binary, (0, 0), .65)
    return cv2.resize(binary, (width, height), interpolation=cv2.INTER_AREA)


def build_damage_mask(part_mask, radius=25, feather=4.5):
    binary = np.where(part_mask > 24, 255, 0).astype(np.uint8)
    size = radius * 2 + 1
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (size, size))
    expanded = cv2.dilate(binary, kernel)
    feathered = cv2.GaussianBlur(expanded, (0, 0), feather)
    return np.maximum(expanded, feathered)


def overlay_blend(image, color=(217, 141, 83), strength=.94):
    base = image.astype(np.float32) / 255
    tint = np.array(color[::-1], np.float32) / 255
    blended = np.where(base <= .5, 2 * base * tint, 1 - 2 * (1 - base) * (1 - tint))
    overlay = base * (1 - strength) + blended * strength
    screened = 1 - (1 - overlay) * (1 - tint * .35)
    emphasized = overlay * .35 + screened * .65
    return np.clip(emphasized * 255, 0, 255).astype(np.uint8)


def write_image(path, image):
    path.parent.mkdir(parents=True, exist_ok=True)
    success, encoded = cv2.imencode(path.suffix, image)
    if not success:
        raise OSError(path)
    encoded.tofile(path)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--stage", choices=("all", "hit", "damage"), default="all")
    parser.add_argument("--part", default=None)
    args = parser.parse_args()

    image = cv2.imdecode(np.fromfile(SOURCE, np.uint8), cv2.IMREAD_COLOR)
    if image is None:
        raise FileNotFoundError(SOURCE)

    if args.stage in ("all", "hit"):
        tinted = overlay_blend(image)
        for part_id, spec in HIT_PARTS.items():
            if args.part and part_id != args.part:
                continue
            alpha = build_mask(image, spec)
            rgba = cv2.cvtColor(tinted, cv2.COLOR_BGR2BGRA)
            rgba[:, :, 3] = alpha
            rgba[alpha == 0, :3] = 0
            write_image(HIT_OUTPUT / f"pain-priest-{part_id}.png", rgba)
            write_image(HIT_OUTPUT / f"pain-priest-{part_id}-mask.png", alpha)

    if args.stage in ("all", "damage"):
        for part_id, spec in DAMAGE_PARTS.items():
            if args.part and part_id != args.part:
                continue
            part_mask = build_mask(image, spec)
            allowed = build_damage_mask(part_mask)
            write_image(DAMAGE_OUTPUT / f"pain-priest-{part_id}-damage-mask.png", allowed)


if __name__ == "__main__":
    main()
