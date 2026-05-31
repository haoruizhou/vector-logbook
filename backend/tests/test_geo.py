from app.coords.geo import gc_distance_nm, gc_interpolate


def test_distance_known():
    # KSBA (34.4262,-119.8404) -> KLAX (33.9425,-118.4081) ~ 76 nm
    d = gc_distance_nm(34.4262, -119.8404, 33.9425, -118.4081)
    assert 70 < d < 82


def test_interpolate_midpoint():
    pts = gc_interpolate(0, 0, 0, 10, steps=2)
    assert len(pts) == 3
    assert abs(pts[1][1] - 5) < 0.01  # midpoint lon ~5
