import math

_EARTH_NM = 3440.065  # mean earth radius in nautical miles


def gc_distance_nm(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance between two points, in nautical miles."""
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dlat, dlon = math.radians(lat2 - lat1), math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlon / 2) ** 2
    return _EARTH_NM * 2 * math.asin(min(1.0, math.sqrt(a)))


def gc_interpolate(
    lat1: float, lon1: float, lat2: float, lon2: float, steps: int = 64
) -> list[tuple[float, float]]:
    """Points (lat, lon) along the great circle, inclusive of both endpoints."""
    p1, l1, p2, l2 = map(math.radians, (lat1, lon1, lat2, lon2))
    d = 2 * math.asin(
        math.sqrt(
            math.sin((p2 - p1) / 2) ** 2
            + math.cos(p1) * math.cos(p2) * math.sin((l2 - l1) / 2) ** 2
        )
    )
    if d == 0:
        return [(lat1, lon1), (lat2, lon2)]
    out: list[tuple[float, float]] = []
    for i in range(steps + 1):
        f = i / steps
        a = math.sin((1 - f) * d) / math.sin(d)
        b = math.sin(f * d) / math.sin(d)
        x = a * math.cos(p1) * math.cos(l1) + b * math.cos(p2) * math.cos(l2)
        y = a * math.cos(p1) * math.sin(l1) + b * math.cos(p2) * math.sin(l2)
        z = a * math.sin(p1) + b * math.sin(p2)
        out.append(
            (math.degrees(math.atan2(z, math.hypot(x, y))), math.degrees(math.atan2(y, x)))
        )
    return out
