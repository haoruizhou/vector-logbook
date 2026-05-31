"""Guards the published bundle so a broken/degraded build never replaces the
last good release. FAA is the must-have baseline; other providers are additive."""


class BundleError(Exception):
    pass


def assert_bundle_ok(rows: list[dict], *, min_total: int = 50000, min_faa: int = 50000) -> None:
    total = len(rows)
    faa = sum(1 for r in rows if r.get("source") == "faa-nasr")
    if total < min_total:
        raise BundleError(f"bundle too small: {total} rows (min {min_total})")
    if faa < min_faa:
        raise BundleError(f"FAA baseline too small: {faa} rows (min {min_faa})")
