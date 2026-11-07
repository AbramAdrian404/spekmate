"""Catalog summaries: what the catalog cards quote."""
from laptop_advisor.catalog import get_catalog


def test_model_summary_highlights_come_from_the_variants():
    """Catalog cards quote processor, graphics, RAM and storage straight from the configurations, never from thin air."""
    catalog = get_catalog()
    listing = catalog.list_models()
    assert listing.items
    for item in listing.items:
        variants = catalog.ds.variants_of(item.id)
        specs = [catalog.specs(v) for v in variants]
        assert {p.name for p in item.highlights.cpus} == {s.cpu.name for s in specs if s.cpu}
        assert {p.name for p in item.highlights.gpus} == {s.gpu.name for s in specs if s.gpu}
        assert item.highlights.ram_gb == sorted({s.ram.gb for s in specs if s.ram.gb})
        assert item.highlights.storage_gb == sorted({s.storage.gb for s in specs if s.storage.gb})
        tiers = [p.tier or 0 for p in item.highlights.cpus]
        assert tiers == sorted(tiers, reverse=True)


def test_shipped_photos_fill_in_only_where_nothing_was_uploaded():
    from laptop_advisor.store import with_shipped_photos

    uploaded = [{"model_id": "a", "url": "/api/media/a.png"}]
    shipped = [{"model_id": "A", "url": "/laptops/a.webp"}, {"model_id": "b", "url": "/laptops/b.webp"}]
    assert [img["url"] for img in with_shipped_photos(uploaded, shipped)] == ["/api/media/a.png", "/laptops/b.webp"]


def test_shipped_photos_carry_their_source(tmp_path):
    import json

    import pytest

    from laptop_advisor.store import DatasetError, load_shipped_photos

    assert load_shipped_photos(tmp_path) == []
    (tmp_path / "photos.json").write_text(json.dumps([{"model_id": "a", "url": "/laptops/a.webp",
                                                       "source_name": "Situs resmi", "source_url": "https://x.id"}]))
    [row] = load_shipped_photos(tmp_path)
    assert row["is_primary"] and row["source_name"] == "Situs resmi"
    (tmp_path / "photos.json").write_text(json.dumps([{"model_id": "a"}]))
    with pytest.raises(DatasetError):
        load_shipped_photos(tmp_path)
