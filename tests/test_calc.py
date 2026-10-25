import importlib.util
from pathlib import Path

p = Path(__file__).parents[1] / "custom_components" / "geraetestrom" / "calc.py"
spec = importlib.util.spec_from_file_location("calc", p)
calc = importlib.util.module_from_spec(spec)
spec.loader.exec_module(calc)


def test_split_proportional():
    w = calc.split_power(2000, 3000, 1000, 1000)
    assert round(w["solar"]) == 1200 and round(w["battery"]) == 400 and round(w["grid"]) == 400
    assert abs(sum(w.values()) - 2000) < 1e-9


def test_split_all_grid_when_no_sources():
    assert calc.split_power(1500, 0, 0, 0) == {"solar": 0.0, "battery": 0.0, "grid": 1500}


def test_negative_values_ignored():
    w = calc.split_power(1000, 500, -300, 500)
    assert w["battery"] == 0 and abs(sum(w.values()) - 1000) < 1e-9


def test_money():
    assert calc.money(1.0, "grid", 0.32, 0.08, 0.05) == (0.32, 0.0)
    assert calc.money(1.0, "solar", 0.32, 0.08, 0.05) == (0.0, 0.32 - 0.08)
    assert calc.money(1.0, "battery", 0.32, 0.08, 0.05) == (0.0, 0.32 - 0.05)


def test_cover_and_advice():
    assert calc.cover_pct(3000, 1500) == 100
    assert calc.cover_pct(-5, 1500) == 0
    assert calc.advice(80) == "Jetzt starten"
    assert calc.advice(50) == "Teilweise Solar"
    assert calc.advice(10) == "Besser warten"


def test_free_solar():
    assert calc.free_solar(3000, 1200) == 1800
    assert calc.free_solar(1000, 1500) == 0
    assert calc.free_solar(1000, -50) == 1000


def test_normalize_services():
    assert calc.normalize_services(None) == []
    assert calc.normalize_services("notify.mobile_app_pixel") == [("notify", "mobile_app_pixel")]
    assert calc.normalize_services("mobile_app_pixel") == [("notify", "mobile_app_pixel")]
    assert calc.normalize_services(["notify.a", " notify.b ", "notify.a", ""]) == [("notify", "a"), ("notify", "b")]
