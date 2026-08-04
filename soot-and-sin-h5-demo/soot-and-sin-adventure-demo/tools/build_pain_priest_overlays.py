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
        "manual": True,
        "areas": [
            [
                (498, 286), (515, 279), (535, 278), (558, 285),
                (576, 300), (588, 321), (596, 349), (598, 374),
                (592, 399), (583, 422), (571, 441), (553, 457),
                (535, 465), (517, 462), (500, 453), (484, 439),
                (471, 421), (461, 400), (454, 377), (453, 354),
                (459, 337), (470, 317), (485, 298),
            ],
            [(457, 328), (441, 310), (437, 307), (442, 323),
             (448, 340), (454, 352), (458, 356), (460, 343)],
            [(594, 329), (610, 319), (631, 305), (623, 329),
             (615, 349), (607, 365), (599, 370), (598, 349)],
        ],
        "strokes": [
            ([(535, 295), (535, 445)], 16),
            ([(475, 355), (590, 355)], 14),
            ([(490, 410), (575, 410)], 12),
            ([(443, 315), (453, 345)], 4),
            ([(625, 314), (605, 354)], 4),
        ],
        "background_strokes": [
            ([(448, 354), (448, 376), (450, 400)], 4),
        ],
    },
    "right_hand": {
        "manual": True,
        "areas": [[
            (292, 158), (313, 151), (337, 156), (352, 163),
            (356, 176), (366, 178), (370, 184), (366, 190),
            (358, 195), (357, 204), (352, 213), (343, 220),
            (333, 218), (321, 209), (312, 205), (306, 211),
            (301, 229), (293, 247), (283, 261), (273, 266),
            (263, 260), (258, 251), (262, 240), (271, 222),
            (278, 202), (283, 181),
        ]],
        "cutouts": [[
            (333, 207), (346, 207), (346, 274), (332, 274),
        ]],
        "strokes": [
            ([(300, 170), (330, 170), (349, 188)], 10),
            ([(305, 185), (300, 215), (282, 250)], 10),
        ],
        "background_strokes": [
            ([(339, 209), (339, 270)], 7),
        ],
    },
    "left_hand": {
        "manual": True,
        "areas": [
            [
                (641, 665), (649, 647), (667, 638), (687, 640),
                (702, 652), (710, 670), (709, 690), (700, 704),
                (684, 711), (665, 704), (650, 694),
            ],
            [
                (649, 613), (657, 614), (664, 623), (664, 637),
                (659, 651), (653, 664), (646, 662), (643, 651),
                (646, 637),
            ],
            [
                (675, 633), (683, 628), (692, 632), (699, 641),
                (700, 653), (695, 667), (688, 674), (681, 668),
                (682, 654),
            ],
            [
                (704, 644), (713, 638), (721, 644), (722, 655),
                (718, 670), (712, 683), (705, 689), (700, 683),
                (703, 669),
            ],
            [
                (650, 668), (636, 677), (619, 685), (605, 693),
                (594, 701), (590, 710), (594, 717), (603, 718),
                (615, 711), (629, 704), (645, 699), (659, 691),
            ],
            [
                (710, 674), (720, 675), (727, 685), (730, 700),
                (726, 715), (718, 732), (711, 743), (704, 742),
                (702, 734), (706, 719), (709, 702), (706, 689),
            ],
            [
                (720, 683), (731, 675), (740, 679), (746, 688),
                (745, 699), (739, 712), (731, 725), (724, 736),
                (717, 742), (712, 735), (718, 719), (725, 703),
            ],
        ],
        "strokes": [
            ([(651, 620), (654, 650)], 5),
            ([(682, 636), (690, 660)], 5),
            ([(713, 646), (710, 678)], 5),
            ([(600, 708), (635, 690), (665, 680)], 5),
            ([(716, 688), (710, 730)], 5),
            ([(738, 686), (725, 728)], 5),
        ],
        "background_strokes": [
            ([(650, 606), (690, 610), (710, 620)], 5),
        ],
    },
    "legs": {
        "manual": True,
        "areas": [[
            (486, 1318), (506, 1317), (526, 1322), (542, 1332),
            (548, 1350), (546, 1375), (548, 1400), (550, 1423),
            (555, 1445), (563, 1460), (566, 1475), (562, 1486),
            (554, 1493), (544, 1492), (538, 1487), (537, 1494),
            (530, 1500), (519, 1498), (514, 1491), (511, 1497),
            (505, 1501), (493, 1498), (487, 1490), (480, 1496),
            (465, 1495), (456, 1488), (453, 1478), (455, 1465),
            (462, 1454), (467, 1434), (470, 1412), (472, 1388),
            (475, 1361), (478, 1337),
        ]],
        "strokes": [
            ([(510, 1330), (518, 1400), (520, 1450)], 12),
            ([(474, 1480), (490, 1485)], 5),
            ([(500, 1480), (505, 1490)], 5),
            ([(520, 1480), (528, 1490)], 5),
            ([(542, 1475), (552, 1484)], 5),
        ],
        "background_strokes": [
            ([(460, 1505), (520, 1512), (565, 1505)], 6),
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


def draw_local_strokes(mask, strokes, value, offset):
    offset_x, offset_y = offset
    for points, thickness in strokes:
        local = np.array([(
            (x - offset_x) * SCALE,
            (y - offset_y) * SCALE,
        ) for x, y in points], np.int32)
        cv2.polylines(mask, [local], False, value, thickness * SCALE, cv2.LINE_8)


def build_guided_mask(image, spec):
    height, width = image.shape[:2]
    limit = np.zeros((height, width), np.uint8)
    for area in spec["areas"]:
        cv2.fillPoly(limit, [np.array(area, np.int32)], 255, lineType=cv2.LINE_AA)
    for cutout in spec.get("cutouts", []):
        cv2.fillPoly(limit, [np.array(cutout, np.int32)], 0, lineType=cv2.LINE_AA)

    x, y, crop_width, crop_height = cv2.boundingRect(np.where(limit > 0, 255, 0).astype(np.uint8))
    padding = 4
    x0 = max(0, x - padding)
    y0 = max(0, y - padding)
    x1 = min(width, x + crop_width + padding)
    y1 = min(height, y + crop_height + padding)
    source_crop = image[y0:y1, x0:x1]
    limit_crop = limit[y0:y1, x0:x1]
    work = cv2.resize(source_crop, None, fx=SCALE, fy=SCALE, interpolation=cv2.INTER_CUBIC)
    scaled_limit = cv2.resize(limit_crop, None, fx=SCALE, fy=SCALE, interpolation=cv2.INTER_NEAREST)
    mask = np.full(scaled_limit.shape, cv2.GC_BGD, np.uint8)
    mask[scaled_limit > 0] = cv2.GC_PR_FGD
    draw_local_strokes(mask, spec.get("strokes", []), cv2.GC_FGD, (x0, y0))
    draw_local_strokes(mask, spec.get("background_strokes", []), cv2.GC_BGD, (x0, y0))

    background_model = np.zeros((1, 65), np.float64)
    foreground_model = np.zeros((1, 65), np.float64)
    cv2.grabCut(work, mask, None, background_model, foreground_model, 10, cv2.GC_INIT_WITH_MASK)
    binary = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
    binary[scaled_limit == 0] = 0
    binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
    alpha_crop = cv2.resize(binary, (source_crop.shape[1], source_crop.shape[0]), interpolation=cv2.INTER_AREA)
    alpha_crop = np.minimum(alpha_crop, limit_crop)

    luminance = cv2.cvtColor(source_crop, cv2.COLOR_BGR2GRAY).astype(np.float32)
    confidence = np.clip((luminance - 14) / 18, 0, 1)
    alpha_crop = np.clip(alpha_crop.astype(np.float32) * confidence, 0, 255)
    # Keep uncertain edge pixels faint, but make every confirmed foreground pixel
    # unmistakably selected without expanding the mask into the black background.
    strong = alpha_crop >= 64
    alpha_crop[strong] = 160 + (alpha_crop[strong] - 64) * (95 / 191)
    alpha_crop = alpha_crop.astype(np.uint8)

    alpha = np.zeros((height, width), np.uint8)
    alpha[y0:y1, x0:x1] = alpha_crop
    return alpha


def build_mask(image, spec):
    if spec.get("manual"):
        return build_guided_mask(image, spec)

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
