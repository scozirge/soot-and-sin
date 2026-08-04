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
            (300, 129), (351, 132), (379, 161), (374, 210), (356, 252),
            (357, 349), (336, 373), (317, 306), (285, 283), (250, 278),
            (226, 312), (202, 345), (168, 369), (149, 401), (159, 438),
            (204, 466), (266, 481), (327, 481), (383, 499), (413, 469),
            (389, 429), (339, 407), (302, 385), (271, 352), (248, 325),
            (271, 291), (298, 251), (285, 216), (279, 175),
        ]],
        "strokes": [
            ([(326, 157), (318, 205), (300, 249), (270, 297)], 22),
            ([(269, 300), (232, 344), (190, 391), (181, 420), (221, 441)], 30),
            ([(220, 441), (280, 455), (340, 461), (390, 474)], 28),
            ([(343, 190), (341, 250), (339, 315), (338, 356)], 9),
        ],
        "background_strokes": [
            ([(365, 264), (386, 330), (381, 396)], 9),
        ],
    },
    "left_hand": {
        "areas": [[
            (583, 451), (620, 434), (668, 451), (706, 486), (735, 531),
            (760, 579), (777, 629), (779, 683), (764, 731), (742, 769),
            (711, 788), (678, 782), (648, 758), (625, 726), (599, 697),
            (571, 667), (550, 632), (545, 586), (551, 531), (565, 484),
        ]],
        "strokes": [
            ([(599, 470), (628, 508), (654, 551), (676, 596)], 30),
            ([(676, 596), (696, 637), (704, 675)], 26),
            ([(700, 681), (671, 711), (624, 714), (587, 686)], 18),
            ([(704, 681), (737, 701), (758, 725)], 7),
            ([(702, 674), (748, 661), (771, 661)], 7),
            ([(698, 669), (735, 628), (756, 604)], 7),
            ([(690, 665), (700, 612), (705, 581)], 7),
            ([(684, 666), (670, 615), (660, 586)], 7),
        ],
        "background_strokes": [
            ([(706, 688), (737, 682)], 5),
            ([(704, 673), (735, 646)], 5),
        ],
    },
    "legs": {
        "areas": [[
            (348, 670), (402, 646), (471, 649), (537, 659), (592, 683),
            (627, 736), (645, 820), (660, 930), (675, 1065), (686, 1180),
            (679, 1288), (650, 1372), (615, 1422), (579, 1413), (574, 1494),
            (551, 1522), (506, 1521), (478, 1495), (472, 1426), (441, 1477),
            (407, 1504), (365, 1493), (336, 1454), (312, 1375), (296, 1261),
            (290, 1142), (296, 1007), (300, 888), (311, 776), (326, 707),
        ]],
        "strokes": [
            ([(388, 699), (373, 812), (361, 945), (348, 1089), (348, 1240), (365, 1393), (390, 1462)], 42),
            ([(455, 687), (438, 824), (428, 977), (427, 1125), (439, 1267), (459, 1385)], 44),
            ([(525, 689), (542, 824), (557, 974), (565, 1118), (550, 1250), (526, 1371)], 44),
            ([(586, 708), (609, 829), (624, 970), (632, 1111), (621, 1254), (597, 1360)], 42),
            ([(526, 1324), (521, 1382), (520, 1440), (523, 1496)], 30),
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
    return np.clip((base * (1 - strength) + blended * strength) * 255, 0, 255).astype(np.uint8)


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
