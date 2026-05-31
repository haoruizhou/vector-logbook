import pytest

from app.coords.providers.validate import BundleError, assert_bundle_ok


def _faa_rows(n):
    return [
        {"ident": f"FIX{i}", "type": "fix", "lat": 1.0, "lon": 2.0, "name": None,
         "country": "US", "source": "faa-nasr"}
        for i in range(n)
    ]


def test_healthy_bundle_passes():
    assert_bundle_ok(_faa_rows(60000), min_total=50000, min_faa=50000)


def test_empty_bundle_raises():
    with pytest.raises(BundleError):
        assert_bundle_ok([], min_total=50000, min_faa=50000)


def test_missing_faa_baseline_raises():
    rows = [{"ident": "X", "type": "fix", "lat": 1.0, "lon": 2.0, "name": None,
             "country": "AT", "source": "openaip"}] * 60000
    with pytest.raises(BundleError):
        assert_bundle_ok(rows, min_total=50000, min_faa=50000)
